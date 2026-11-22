package app.osistema;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** Alarmes (virada do dia, fim do desbloqueio, lembrete) e notificações. */
final class Scheduler {
    private Scheduler() {}

    static final String CH_BLOQUEIO = "bloqueio", CH_LEMBRETE = "lembrete", CH_VIGIA = "vigia";
    static final String ACT_EVAL = "app.osistema.EVAL", ACT_LEMBRETE = "app.osistema.LEMBRETE";

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CH_BLOQUEIO, "Zona de Penalidade", NotificationManager.IMPORTANCE_LOW));
        nm.createNotificationChannel(new NotificationChannel(CH_LEMBRETE, "Lembretes de missão", NotificationManager.IMPORTANCE_DEFAULT));
        nm.createNotificationChannel(new NotificationChannel(CH_VIGIA, "Vigia do bloqueio (sem penalidade)", NotificationManager.IMPORTANCE_MIN));
    }

    static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static Notification notification(Context c, String canal, String titulo, String texto, boolean fixa) {
        channels(c);
        return new Notification.Builder(c, canal)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle(titulo).setContentText(texto)
            .setStyle(new Notification.BigTextStyle().bigText(texto))
            .setContentIntent(openApp(c)).setOngoing(fixa).setAutoCancel(!fixa)
            .build();
    }

    static void notify(Context c, int id, String canal, String titulo, String texto) {
        try { c.getSystemService(NotificationManager.class).notify(id, notification(c, canal, titulo, texto, false)); }
        catch (SecurityException ignored) { /* sem permissão de notificação */ }
    }

    /** Mantém o vigia ligado (se puder) e agenda as conferências de reserva. */
    static void evaluate(Context c) {
        boolean bloq = Prefs.shouldBlock(c);
        Prefs.logEval(c, bloq ? "bloqueando" : "armado");
        if (Prefs.canRun(c)) startBlocker(c);
        scheduleNext(c);
    }

    static void startBlocker(Context c) {
        try {
            c.startForegroundService(new Intent(c, BlockerService.class));
        } catch (Exception e) {
            // O Android pode impedir de iniciar em segundo plano: registra e, se houver penalidade, avisa.
            Prefs.logError(c, e.getClass().getSimpleName() + ": " + e.getMessage());
            if (Prefs.shouldBlock(c)) notify(c, 3, CH_BLOQUEIO, "Zona de Penalidade", "Toque para abrir O Sistema e ativar a Zona de Penalidade.");
        }
    }

    static void scheduleNext(Context c) {
        long now = System.currentTimeMillis();
        LocalDateTime meiaNoite = LocalDate.now().plusDays(1).atTime(0, 1);
        set(c, 1, ACT_EVAL, toMillis(meiaNoite));
        long unlockFrom = Prefs.sp(c).getLong("unlockFrom", 0), unlock = Prefs.sp(c).getLong("unlockUntil", 0);
        if (unlockFrom > now) set(c, 5, ACT_EVAL, unlockFrom + 1000);
        if (unlock > now) set(c, 2, ACT_EVAL, unlock + 1000);
        long disable = Prefs.sp(c).getLong("disableAt", 0);
        if (disable > now) set(c, 3, ACT_EVAL, disable + 1000);
        int hora = Prefs.sp(c).getInt("reminderHour", 20);
        if (hora >= 0) {
            LocalDateTime r = LocalDate.now().atTime(hora, 0);
            if (toMillis(r) <= now) r = r.plusDays(1);
            set(c, 4, ACT_LEMBRETE, toMillis(r));
        }
    }

    static void reminder(Context c) {
        if (Prefs.missionPendingToday(c)) {
            notify(c, 2, CH_LEMBRETE, "Missão do dia pendente",
                "Se o dia virar sem o treino, você entra na Zona de Penalidade e os apps escolhidos ficam bloqueados.");
        }
    }

    private static long toMillis(LocalDateTime t) { return t.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(); }

    private static void set(Context c, int code, String action, long at) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        Intent i = new Intent(c, AlarmReceiver.class).setAction(action);
        PendingIntent pi = PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        boolean exato = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        if (exato) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }
}
