package app.osistema;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.LocationManager;

import org.json.JSONObject;

/**
 * Estado do rastreamento de atividade por GPS, guardado no aparelho. Fica salvo a cada ponto, então
 * sobrevive se o Android fechar o app no meio da corrida: ao abrir de novo, continua de onde parou.
 */
final class Rastreio {
    private Rastreio() {}

    /** O serviço está rodando agora (neste processo)? */
    static volatile boolean rodando;

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("rastreio", Context.MODE_PRIVATE); }

    private static double d(SharedPreferences p, String k) {
        return Double.longBitsToDouble(p.getLong(k, Double.doubleToRawLongBits(Double.NaN)));
    }

    static synchronized boolean ativo(Context c) { return sp(c).getBoolean("ativo", false); }
    static String tipo(Context c) { return sp(c).getString("tipo", "caminhada"); }
    static long inicio(Context c) { return sp(c).getLong("start", System.currentTimeMillis()); }

    /** Começa um percurso novo (novo = true) ou só marca como ativo para continuar o que estava salvo. */
    static synchronized void iniciar(Context c, String tipo, long start, boolean novo) {
        SharedPreferences.Editor e = sp(c).edit();
        if (novo) e.clear();
        e.putBoolean("ativo", true).putString("tipo", tipo).putLong("start", start).commit();
    }

    static boolean pausado(Context c) { return sp(c).getBoolean("pausado", false); }

    /** Tempo de atividade em ms (sem as pausas). */
    static long ativoMs(Context c, long agora) {
        SharedPreferences p = sp(c);
        long pausas = p.getLong("pausadoMs", 0) + (p.getBoolean("pausado", false) ? agora - p.getLong("pausaInicio", agora) : 0);
        return Math.max(0, agora - p.getLong("start", agora) - pausas);
    }

    /**
     * Pausa ou retoma. Na pausa nada é somado; ao retomar, o percurso recomeça do ponto onde você estiver
     * (o caminho feito durante a pausa não conta) e o tempo parado sai do tempo da atividade.
     */
    static synchronized void pausar(Context c, boolean pausar) {
        SharedPreferences p = sp(c);
        if (!p.getBoolean("ativo", false) || p.getBoolean("pausado", false) == pausar) return;
        long agora = System.currentTimeMillis();
        SharedPreferences.Editor e = p.edit().putBoolean("pausado", pausar);
        if (pausar) e.putLong("pausaInicio", agora);
        else e.putLong("pausadoMs", p.getLong("pausadoMs", 0) + Math.max(0, agora - p.getLong("pausaInicio", agora)))
            .remove("lat").remove("lon").remove("alt").remove("t");
        e.commit();
    }

    static synchronized Percurso carregar(Context c) {
        SharedPreferences p = sp(c);
        Percurso r = new Percurso();
        r.dist = Math.max(0, p.getFloat("dist", 0));
        r.elev = Math.max(0, p.getFloat("elev", 0));
        r.lastLat = d(p, "lat"); r.lastLon = d(p, "lon"); r.lastAlt = d(p, "alt");
        r.lastT = p.getLong("t", 0);
        r.pontos = p.getInt("pontos", 0);
        return r;
    }

    /** Uma leitura do GPS chegou: soma no percurso (se o rastreamento ainda estiver ativo) e salva. */
    static synchronized void ponto(Context c, Percurso r, double lat, double lon, double alt, double acc, long t) {
        SharedPreferences p = sp(c);
        if (!p.getBoolean("ativo", false) || p.getBoolean("pausado", false)) return;
        SharedPreferences.Editor e = p.edit().putFloat("acc", (float) acc).putLong("fixAt", System.currentTimeMillis());
        if (r.add(lat, lon, alt, acc, t, Percurso.maxKmh(p.getString("tipo", "")))) {
            e.putFloat("dist", (float) r.dist).putFloat("elev", (float) r.elev)
                .putLong("lat", Double.doubleToRawLongBits(r.lastLat)).putLong("lon", Double.doubleToRawLongBits(r.lastLon))
                .putLong("alt", Double.doubleToRawLongBits(r.lastAlt)).putLong("t", r.lastT).putInt("pontos", r.pontos);
        }
        e.apply();
    }

    static synchronized JSONObject status(Context c) {
        SharedPreferences p = sp(c);
        JSONObject o = new JSONObject();
        try {
            o.put("ativo", p.getBoolean("ativo", false));
            o.put("rodando", rodando);
            o.put("tipo", p.getString("tipo", ""));
            o.put("start", p.getLong("start", 0));
            o.put("pausado", p.getBoolean("pausado", false));
            o.put("pausadoMs", p.getLong("pausadoMs", 0));
            o.put("pausaInicio", p.getLong("pausaInicio", 0));
            o.put("ativoMs", ativoMs(c, System.currentTimeMillis()));
            o.put("dist", p.getFloat("dist", 0));
            o.put("elev", p.getFloat("elev", 0));
            o.put("pontos", p.getInt("pontos", 0));
            o.put("acc", p.getFloat("acc", -1));
            o.put("fixAt", p.getLong("fixAt", 0));
            o.put("gps", c.getSystemService(LocationManager.class).isProviderEnabled(LocationManager.GPS_PROVIDER));
        } catch (Exception ignored) {}
        return o;
    }

    /** Encerra (finalizar ou descartar): para o GPS e apaga o estado. */
    static synchronized void parar(Context c) {
        sp(c).edit().clear().commit();
        c.stopService(new Intent(c, TrackerService.class));
    }
}
