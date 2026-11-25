package app.osistema;

import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.Process;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * A ÚNICA ponte entre a página do app e o Android. Expõe só estes comandos; a página não consegue ler
 * mensagens, senhas, a lista de apps usados nem nada além do que está aqui.
 */
final class NativeBridge {
    private final MainActivity a;
    NativeBridge(MainActivity a) { this.a = a; }

    private boolean usageAccess() {
        return Prefs.hasUsageAccess(a);
    }

    private boolean installed(String pkg) {
        try { a.getPackageManager().getPackageInfo(pkg, 0); return true; } catch (PackageManager.NameNotFoundException e) { return false; }
    }

    /** Situação das permissões e do bloqueio (para a tela "Bloqueio" do app). */
    @JavascriptInterface
    public String status() {
        try {
            SharedPreferences p = Prefs.sp(a);
            JSONObject o = new JSONObject();
            o.put("version", a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName);
            o.put("usageAccess", usageAccess());
            o.put("overlay", Settings.canDrawOverlays(a));
            o.put("notifications", a.getSystemService(NotificationManager.class).areNotificationsEnabled());
            o.put("battery", a.getSystemService(PowerManager.class).isIgnoringBatteryOptimizations(a.getPackageName()));
            o.put("blockingEnabled", p.getBoolean("blockingEnabled", true));
            o.put("disableAt", p.getLong("disableAt", 0));
            o.put("unlockFrom", p.getLong("unlockFrom", 0));
            o.put("unlockUntil", p.getLong("unlockUntil", 0));
            o.put("emergencyWaitMin", Prefs.EMERGENCIA_ESPERA_MIN);
            o.put("emergencyMin", Prefs.EMERGENCIA_MIN);
            o.put("emergencyLeft", Prefs.emergencyLeft(a));
            o.put("blockingNow", Prefs.shouldBlock(a));
            o.put("evalAt", p.getLong("evalAt", 0));
            o.put("evalResult", p.getString("evalResult", ""));
            o.put("errAt", p.getLong("errAt", 0));
            o.put("errMsg", p.getString("errMsg", ""));
            o.put("reminderHour", p.getInt("reminderHour", 20));
            o.put("vigiaVivo", BlockerService.vivoDesde > 0);
            o.put("vigiaDesde", BlockerService.vivoDesde);
            o.put("vigiaInicio", p.getLong("vigiaInicio", 0));
            o.put("vigiaFim", p.getLong("vigiaFim", 0));
            o.put("vigiaParou", p.getString("vigiaParou", ""));
            JSONArray apps = new JSONArray();
            Set<String> bl = Prefs.blocked(a);
            for (Map.Entry<String, String> e : Prefs.BLOQUEAVEIS.entrySet()) {
                apps.put(new JSONObject().put("pkg", e.getKey()).put("nome", e.getValue())
                    .put("instalado", installed(e.getKey())).put("bloqueado", bl.contains(e.getKey())));
            }
            o.put("apps", apps);
            o.put("toque", Toque.status(a));
            o.put("chrome", installed("com.android.chrome"));
            return o.toString();
        } catch (Exception e) { return "{}"; }
    }

    /** O app web informa o estado do jogo; o nativo guarda e decide se bloqueia. */
    @JavascriptInterface
    public void sync(String json) {
        try {
            JSONObject o = new JSONObject(json);
            SharedPreferences.Editor ed = Prefs.sp(a).edit()
                .putBoolean("penalty", o.optBoolean("penalty", false))
                .putInt("restDay", o.optInt("restDay", -1))
                .putString("obligatedFrom", o.optString("obligatedFrom", ""))
                .putString("lastDone", o.optString("lastDone", ""))
                .putString("lastSync", LocalDate.now().toString());
            if (o.has("reminderHour")) ed.putInt("reminderHour", Math.max(-1, Math.min(23, o.optInt("reminderHour", 20))));
            // saldo do jogador: o toque de recolher só libera se der para pagar
            if (o.has("gold")) ed.putInt("saldoOuro", o.optInt("gold", 0));
            if (o.has("xp")) ed.putInt("saldoXp", o.optInt("xp", 0));
            // Meu porquê (2.0): frases curtas para as telas de bloqueio
            if (o.has("frases")) ed.putString("frases", o.optJSONObject("frases") != null ? o.optJSONObject("frases").toString() : "{}");
            // "blocked" é ignorado de propósito: a lista é fixa e a página não consegue tirar apps dela
            ed.remove("blocked").apply();
            Scheduler.evaluate(a);
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void openSettings(String which) {
        String pkg = "package:" + a.getPackageName();
        Intent i;
        switch (which) {
            case "usage": i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS); break;
            case "overlay": i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse(pkg)); break;
            case "battery": i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse(pkg)); break;
            case "notifications": i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, a.getPackageName()); break;
            default: i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse(pkg));
        }
        try { a.startActivity(i); } catch (Exception e) { a.startActivity(new Intent(Settings.ACTION_SETTINGS)); }
    }

    /** Pede o desbloqueio de emergência: espera de 10 min, libera 15 min, 1 por dia (regras conferidas aqui, no Android). */
    @JavascriptInterface
    public String emergencyRequest() {
        long de = Prefs.emergency(a);
        Scheduler.scheduleNext(a);
        long ate = Prefs.sp(a).getLong("unlockUntil", 0);
        return "{\"ok\":" + (de > 0) + ",\"de\":" + de + ",\"ate\":" + ate + ",\"restantes\":" + Prefs.emergencyLeft(a) + "}";
    }

    @JavascriptInterface
    public boolean emergencyCancel() {
        boolean ok = Prefs.cancelEmergency(a);
        Scheduler.evaluate(a);
        return ok;
    }

    /** Pede para desligar o bloqueio: só vale 24 h depois. */
    @JavascriptInterface
    public long requestDisable() {
        SharedPreferences p = Prefs.sp(a);
        long at = p.getLong("disableAt", 0);
        if (at == 0) { at = System.currentTimeMillis() + Prefs.ESPERA_DESLIGAR_MS; p.edit().putLong("disableAt", at).apply(); }
        Scheduler.scheduleNext(a);
        return at;
    }

    @JavascriptInterface
    public void cancelDisable() { Prefs.sp(a).edit().putLong("disableAt", 0).apply(); }

    @JavascriptInterface
    public void enableBlocking() {
        Prefs.sp(a).edit().putBoolean("blockingEnabled", true).putLong("disableAt", 0).apply();
        Scheduler.evaluate(a);
    }

    // ---- rastreamento de atividade por GPS, com a tela bloqueada (TrackerService) ----

    /**
     * Liga o rastreamento. novo = false continua o percurso salvo (ex.: o Android fechou o app no meio).
     * Devolve "ok", "permissao" (pede a localização; toque de novo depois), "gpsoff" ou "erro".
     */
    @JavascriptInterface
    public String trackStart(String tipo, long start, boolean novo) {
        if (a.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            a.runOnUiThread(() -> a.requestPermissions(new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION}, MainActivity.REQ_LOC));
            return "permissao";
        }
        if (!a.getSystemService(LocationManager.class).isProviderEnabled(LocationManager.GPS_PROVIDER)) return "gpsoff";
        Rastreio.iniciar(a, tipo, start, novo);
        try { a.startForegroundService(new Intent(a, TrackerService.class)); }
        catch (Exception e) { Prefs.logError(a, "GPS: " + e.getClass().getSimpleName() + ": " + e.getMessage()); return "erro"; }
        return "ok";
    }

    @JavascriptInterface
    public String trackStatus() { return Rastreio.status(a).toString(); }

    /** Pausa (true) ou retoma (false). O serviço desliga o GPS na pausa e o religa ao retomar. */
    @JavascriptInterface
    public String trackPause(boolean pausar) {
        if (!Rastreio.ativo(a)) return "inativo";
        Rastreio.pausar(a, pausar); // já vale agora (a tela lê na hora); o serviço só liga/desliga o GPS
        try {
            a.startService(new Intent(a, TrackerService.class).setAction(pausar ? TrackerService.ACT_PAUSAR : TrackerService.ACT_RETOMAR));
        } catch (Exception e) {
            return "erro"; // a pausa ficou gravada; o serviço aplica ao religar
        }
        return "ok";
    }

    /** Finaliza: devolve a distância e a subida somadas e desliga o GPS. */
    @JavascriptInterface
    public String trackStop() {
        String s = Rastreio.status(a).toString();
        Rastreio.parar(a);
        return s;
    }

    @JavascriptInterface
    public void trackCancel() { Rastreio.parar(a); }

    // ---- toque de recolher (20h às 8h) ----

    /** Cobranças feitas no vigia e ainda não lançadas no jogo (JSON: [{id, t, app, ouro, xp, min}]) */
    @JavascriptInterface
    public String toqueCobrancas() { return Toque.cobrancas(a).toString(); }

    /** O app lançou estas cobranças no XP e no Ouro: tira da lista. */
    @JavascriptInterface
    public void toqueConfirmar(String idsJson) {
        try {
            JSONArray arr = new JSONArray(idsJson);
            Set<String> ids = new HashSet<>();
            for (int i = 0; i < arr.length(); i++) ids.add(arr.optString(i));
            Toque.confirmar(a, ids);
        } catch (Exception ignored) {}
    }

    /** Depois das 5h: libera os apps até as 8h. */
    @JavascriptInterface
    public boolean toqueLiberarManha() {
        boolean ok = Toque.liberarManha(a);
        Scheduler.evaluate(a);
        return ok;
    }

    /** Pede para desligar o toque de recolher: só vale 24 h depois. */
    @JavascriptInterface
    public long toqueDesligar() { long at = Toque.pedirDesligar(a); Scheduler.scheduleNext(a); return at; }

    @JavascriptInterface
    public void toqueCancelarDesligar() { Toque.cancelarDesligar(a); }

    @JavascriptInterface
    public void toqueLigar() { Toque.ligar(a); Scheduler.evaluate(a); }

    /** Mantém a tela ligada (rastreamento por GPS no app web, sem o Android). */
    @JavascriptInterface
    public void keepScreenOn(boolean on) {
        a.runOnUiThread(() -> {
            if (on) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    /** Salva o backup na pasta Downloads (o WebView não baixa arquivos gerados pela página). */
    @JavascriptInterface
    public boolean saveFile(String name, String text) {
        if (Build.VERSION.SDK_INT < 29) return false;
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name.replaceAll("[^\\w.\\-]", "_"));
            v.put(MediaStore.Downloads.MIME_TYPE, "application/json");
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = a.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            try (OutputStream os = a.getContentResolver().openOutputStream(uri)) { os.write(text.getBytes(StandardCharsets.UTF_8)); }
            return true;
        } catch (Exception e) { return false; }
    }

    /** Compartilha o card de conquista (PNG em base64): salva em Imagens/O Sistema e abre o "Compartilhar" do Android. */
    @JavascriptInterface
    public boolean shareImage(String base64, String texto) {
        if (Build.VERSION.SDK_INT < 29) return false;
        try {
            byte[] png = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, "o-sistema-" + System.currentTimeMillis() + ".png");
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/O Sistema");
            Uri uri = a.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) return false;
            try (OutputStream os = a.getContentResolver().openOutputStream(uri)) { os.write(png); }
            Intent send = new Intent(Intent.ACTION_SEND).setType("image/png")
                .putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_TEXT, texto)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            a.runOnUiThread(() -> a.startActivity(Intent.createChooser(send, "Compartilhar conquista")));
            return true;
        } catch (Exception e) { return false; }
    }

    @JavascriptInterface
    public void copy(String text) {
        a.runOnUiThread(() -> a.getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("O Sistema", text)));
    }
}
