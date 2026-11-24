package app.osistema;

import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * VIGIA: fica ligado enquanto o bloqueio estiver armado (com as permissões dadas), mesmo sem penalidade.
 * - Sem penalidade: só confere a cada 30 s (e quando a tela liga) se a situação mudou. Gasto mínimo.
 * - Com penalidade: confere a cada ~0,7 s QUAL app está na frente (só o nome do pacote, via "Acesso ao uso")
 *   e, se for um dos bloqueados, cobre a tela com o aviso da Zona de Penalidade.
 * Não depende de alarme para perceber a virada do dia (o "modo dormir" do celular pode segurar alarmes).
 * Não lê conteúdo de nenhum app e não envia nada para lugar nenhum.
 */
public class BlockerService extends Service {
    private final Handler h = new Handler(Looper.getMainLooper());
    private WindowManager wm;
    private View overlay;
    private String lastPkg, shownFor, shownModo, modoNotif;
    private boolean primeira = true; // primeira conferência: olha mais para trás para achar o app já aberto
    private boolean telaRegistrada;

    // Tela apagada: o vigia dorme (não gasta bateria). Tela acesa: volta a conferir.
    private final BroadcastReceiver tela = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            h.removeCallbacks(loop);
            if (!Intent.ACTION_SCREEN_OFF.equals(i.getAction())) h.post(loop);
        }
    };

    @Override public IBinder onBind(Intent i) { return null; }

    /** "pen" = Zona de Penalidade (bloqueio total) · "toque" = toque de recolher (paga ou vence o impulso) · null = nada */
    private String modo() {
        if (Prefs.shouldBlock(this)) return "pen";
        if (Toque.ativo(this) && !Toque.manhaLiberada(this)) return "toque";
        return null;
    }

    private void notificar(String modo) {
        if (modo == null || modo.equals(modoNotif)) return;
        modoNotif = modo;
        android.app.Notification n = "pen".equals(modo)
            ? Scheduler.notification(this, Scheduler.CH_BLOQUEIO, "Zona de Penalidade ativa",
                String.join(", ", nomes()) + " bloqueados até você pagar a multa e cumprir a missão.", true)
            : Scheduler.notification(this, Scheduler.CH_BLOQUEIO, "Toque de recolher até as 8h",
                "Apps de vício custam Ouro e XP até as 8h. Depois das 5h, abra O Sistema para liberar a manhã.", true);
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        wm = getSystemService(WindowManager.class);
        modoNotif = null;
        notificar(modo() == null ? "pen" : modo()); // o Android exige a notificação logo no início
        if (!telaRegistrada) {
            IntentFilter f = new IntentFilter(Intent.ACTION_SCREEN_OFF);
            f.addAction(Intent.ACTION_SCREEN_ON); f.addAction(Intent.ACTION_USER_PRESENT);
            if (Build.VERSION.SDK_INT >= 33) registerReceiver(tela, f, Context.RECEIVER_NOT_EXPORTED); else registerReceiver(tela, f);
            telaRegistrada = true;
        }
        primeira = true;
        h.removeCallbacks(loop);
        h.post(loop);
        return START_STICKY;
    }

    private java.util.List<String> nomes() {
        java.util.LinkedHashSet<String> l = new java.util.LinkedHashSet<>();
        for (String p : Prefs.blocked(this)) if (Prefs.BLOQUEAVEIS.containsKey(p)) l.add(Prefs.BLOQUEAVEIS.get(p));
        return new java.util.ArrayList<>(l);
    }

    private final Runnable loop = new Runnable() {
        @Override public void run() {
            String modo = modo();
            if (modo == null) { hide(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); Scheduler.scheduleNext(BlockerService.this); return; }
            notificar(modo);
            // começou a bloquear agora: olha as últimas horas para saber qual app JÁ está na frente
            String fg = foreground(primeira ? 6 * 60 * 60 * 1000L : 5000);
            primeira = false;
            if (fg != null) lastPkg = fg;
            boolean pen = "pen".equals(modo);
            boolean cobrir = lastPkg != null && Settings.canDrawOverlays(BlockerService.this)
                && (pen ? Prefs.blocked(BlockerService.this).contains(lastPkg) : Toque.APPS.contains(lastPkg) && Toque.cobrindo(BlockerService.this));
            if (cobrir) show(lastPkg, modo); else hide();
            h.postDelayed(this, 700);
        }
    };

    /** Último app que veio para a frente na janela de tempo (null se nada mudou). */
    private String foreground(long janelaMs) {
        UsageStatsManager usm = getSystemService(UsageStatsManager.class);
        long now = System.currentTimeMillis();
        UsageEvents ev = usm.queryEvents(now - janelaMs, now);
        UsageEvents.Event e = new UsageEvents.Event();
        String pkg = null;
        while (ev != null && ev.hasNextEvent()) {
            ev.getNextEvent(e);
            if (e.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) pkg = e.getPackageName();
        }
        return pkg;
    }

    private void show(String pkg, String modo) {
        if (overlay != null && pkg.equals(shownFor) && modo.equals(shownModo)) return;
        hide();
        shownFor = pkg; shownModo = modo;
        if ("toque".equals(modo)) { showToque(pkg); return; }
        String nome = Prefs.BLOQUEAVEIS.getOrDefault(pkg, "Este app");

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(64, 64, 64, 64);
        box.setBackgroundColor(Color.rgb(18, 3, 7));

        TextView t = new TextView(this);
        t.setText("ZONA DE PENALIDADE");
        t.setTextColor(Color.rgb(255, 59, 80));
        t.setTextSize(26);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setLetterSpacing(0.12f);
        t.setGravity(Gravity.CENTER);
        box.addView(t);
        frase(box, "pen", Color.rgb(255, 190, 198));

        TextView m = new TextView(this);
        m.setText(nome + " está bloqueado até você pagar a multa e cumprir a missão do dia.\n\nBancos, telefone e os outros apps continuam liberados.");
        m.setTextColor(Color.rgb(255, 230, 232));
        m.setTextSize(17);
        m.setGravity(Gravity.CENTER);
        m.setPadding(0, 40, 0, 56);
        box.addView(m);

        Button abrir = new Button(this);
        abrir.setText("Abrir O Sistema");
        abrir.setOnClickListener(v -> {
            hide();
            startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
        });
        box.addView(abrir);

        Button sair = new Button(this);
        sair.setText("Sair");
        sair.setOnClickListener(v -> goHome());
        box.addView(sair);

        FrameLayout root = new FrameLayout(this) {
            @Override public boolean dispatchKeyEvent(KeyEvent event) {
                if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) { if (event.getAction() == KeyEvent.ACTION_UP) goHome(); return true; }
                return super.dispatchKeyEvent(event);
            }
        };
        root.addView(box, new FrameLayout.LayoutParams(-1, -1));

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.OPAQUE);
        try { wm.addView(root, lp); overlay = root; } catch (Exception ignored) { overlay = null; shownFor = null; }
    }

    private Button botao(String txt, Runnable acao) {
        Button b = new Button(this);
        b.setText(txt);
        b.setOnClickListener(v -> acao.run());
        return b;
    }

    /** Toque de recolher: pagar (Ouro + XP, 15 min), vencer o impulso ou sair. */
    /** Uma linha do "Meu porquê" (frase curta escrita pelo jogador), em itálico, logo abaixo do título. */
    private void frase(LinearLayout box, String tipo, int cor) {
        String f = Frases.para(this, tipo);
        if (f == null) return;
        TextView v = new TextView(this);
        v.setText("“" + f + "”");
        v.setTextColor(cor);
        v.setTextSize(16);
        v.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.ITALIC));
        v.setGravity(Gravity.CENTER);
        v.setPadding(0, 28, 0, 0);
        box.addView(v);
    }

    private void showToque(String pkg) {
        String nome = Toque.nome(pkg);
        int preco = Toque.precoAgora(this), vez = Toque.usos(this) + 1;
        int[] saldo = Toque.saldo(this);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(64, 64, 64, 64);
        box.setBackgroundColor(Color.rgb(8, 5, 18));

        TextView t = new TextView(this);
        t.setText("TOQUE DE RECOLHER");
        t.setTextColor(Color.rgb(185, 140, 255));
        t.setTextSize(26);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setLetterSpacing(0.12f);
        t.setGravity(Gravity.CENTER);
        box.addView(t);
        frase(box, "toque", Color.rgb(214, 200, 255));

        TextView m = new TextView(this);
        m.setText(nome + " custa Ouro e XP das 20h às 8h.\n\nAgora: " + preco + " Ouro + " + preco + " XP por " + Toque.MINUTOS + " min (a " + vez + "ª desta noite; a próxima dobra).\n"
            + "Você tem " + Math.max(0, saldo[0]) + " Ouro e " + Math.max(0, saldo[1]) + " XP.");
        m.setTextColor(Color.rgb(236, 228, 255));
        m.setTextSize(17);
        m.setGravity(Gravity.CENTER);
        m.setPadding(0, 40, 0, 48);
        box.addView(m);

        TextView aviso = new TextView(this);
        aviso.setTextColor(Color.rgb(255, 200, 87));
        aviso.setGravity(Gravity.CENTER);
        aviso.setPadding(0, 0, 0, 24);

        box.addView(botao("Vencer o impulso (+XP)", () -> {
            hide();
            startActivity(new Intent(this, MainActivity.class).putExtra("rota", "impulso").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
        }));
        box.addView(botao("Pagar e usar " + Toque.MINUTOS + " min", () -> {
            String erro = Toque.pagar(this, pkg);
            if (erro == null) hide(); else aviso.setText(erro);
        }));
        box.addView(botao("Sair", this::goHome));
        box.addView(aviso);

        FrameLayout root = new FrameLayout(this) {
            @Override public boolean dispatchKeyEvent(KeyEvent event) {
                if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) { if (event.getAction() == KeyEvent.ACTION_UP) goHome(); return true; }
                return super.dispatchKeyEvent(event);
            }
        };
        root.addView(box, new FrameLayout.LayoutParams(-1, -1));
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.OPAQUE);
        try { wm.addView(root, lp); overlay = root; } catch (Exception ignored) { overlay = null; shownFor = null; }
    }

    private void goHome() {
        hide();
        startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        lastPkg = null;
    }

    private void hide() {
        if (overlay != null) { try { wm.removeView(overlay); } catch (Exception ignored) {} }
        overlay = null; shownFor = null; shownModo = null;
    }

    @Override public void onDestroy() {
        h.removeCallbacks(loop); hide();
        if (telaRegistrada) { try { unregisterReceiver(tela); } catch (Exception ignored) {} telaRegistrada = false; }
        super.onDestroy();
    }
}
