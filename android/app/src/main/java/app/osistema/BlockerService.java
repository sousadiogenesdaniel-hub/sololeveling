package app.osistema;

import android.app.Service;
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
 * Enquanto houver Zona de Penalidade, confere a cada ~0,7 s QUAL app está na frente (só o nome do pacote,
 * via "Acesso ao uso"). Se for um dos bloqueados, cobre a tela com o aviso da Zona de Penalidade.
 * Não lê conteúdo de nenhum app e não envia nada para lugar nenhum. Para sozinho quando a penalidade acaba.
 */
public class BlockerService extends Service {
    private final Handler h = new Handler(Looper.getMainLooper());
    private WindowManager wm;
    private View overlay;
    private String lastPkg, shownFor;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        wm = getSystemService(WindowManager.class);
        String apps = String.join(", ", nomes());
        android.app.Notification n = Scheduler.notification(this, Scheduler.CH_BLOQUEIO, "Zona de Penalidade ativa",
            (apps.isEmpty() ? "Bloqueio" : apps) + " bloqueado(s) até você pagar a multa e cumprir a missão.", true);
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
        h.removeCallbacks(loop);
        h.post(loop);
        return START_STICKY;
    }

    private java.util.List<String> nomes() {
        java.util.List<String> l = new java.util.ArrayList<>();
        for (String p : Prefs.blocked(this)) if (Prefs.BLOQUEAVEIS.containsKey(p)) l.add(Prefs.BLOQUEAVEIS.get(p));
        return l;
    }

    private final Runnable loop = new Runnable() {
        @Override public void run() {
            if (!Prefs.shouldBlock(BlockerService.this)) { hide(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); return; }
            String fg = foreground();
            if (fg != null) lastPkg = fg;
            boolean bloquear = lastPkg != null && Prefs.blocked(BlockerService.this).contains(lastPkg)
                && Settings.canDrawOverlays(BlockerService.this);
            if (bloquear) show(lastPkg); else hide();
            h.postDelayed(this, 700);
        }
    };

    /** Último app que veio para a frente nos últimos segundos (null se nada mudou). */
    private String foreground() {
        UsageStatsManager usm = getSystemService(UsageStatsManager.class);
        long now = System.currentTimeMillis();
        UsageEvents ev = usm.queryEvents(now - 5000, now);
        UsageEvents.Event e = new UsageEvents.Event();
        String pkg = null;
        while (ev != null && ev.hasNextEvent()) {
            ev.getNextEvent(e);
            if (e.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) pkg = e.getPackageName();
        }
        return pkg;
    }

    private void show(String pkg) {
        if (overlay != null && pkg.equals(shownFor)) return;
        hide();
        shownFor = pkg;
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

    private void goHome() {
        hide();
        startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        lastPkg = null;
    }

    private void hide() {
        if (overlay != null) { try { wm.removeView(overlay); } catch (Exception ignored) {} }
        overlay = null; shownFor = null;
    }

    @Override public void onDestroy() { h.removeCallbacks(loop); hide(); super.onDestroy(); }
}
