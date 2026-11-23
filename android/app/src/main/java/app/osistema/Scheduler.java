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

    static final String CH_BLOQUEIO = "bloqueio", CH_LEMBRETE = "lembrete", CH_RASTREIO = "rastreio";
    /** Hora da conferência diária da falta do dia anterior: logo depois do fim do modo dormir do jogador. */
    static final int CONFERE_HORA = 7, CONFERE_MIN = 5;

    /** Próxima conferência: hoje às 07:05 se ainda não passou; senão amanhã. (Testado em SchedulerTest.) */
    static LocalDateTime nextCheck(LocalDateTime agora) {
        LocalDateTime hoje = agora.toLocalDate().atTime(CONFERE_HORA, CONFERE_MIN);
        return agora.isBefore(hoje) ? hoje : hoje.plusDays(1);
    }
    static final String ACT_EVAL = "app.osistema.EVAL", ACT_LEMBRETE = "app.osistema.LEMBRETE";

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CH_BLOQUEIO, "Zona de Penalidade", NotificationManager.IMPORTANCE_LOW));
        nm.createNotificationChannel(new NotificationChannel(CH_LEMBRETE, "Lembretes de missão", NotificationManager.IMPORTANCE_DEFAULT));
        nm.createNotificationChannel(new NotificationChannel(CH_RASTREIO, "Rastreamento por GPS", NotificationManager.IMPORTANCE_LOW));
        nm.deleteNotificationChannel("vigia"); // canal da versão 1.3, que tinha o vigia sempre ligado
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

    /** Liga o bloqueio se houver penalidade (informada pelo app ou deduzida) e agenda as próximas conferências. */
    static void evaluate(Context c) {
        boolean bloq = Prefs.shouldBlock(c), toque = !bloq && Toque.ativo(c) && !Toque.manhaLiberada(c);
        Prefs.logEval(c, bloq ? "bloqueando" : toque ? "toque de recolher" : "armado");
        if ((bloq && Prefs.canRun(c)) || (toque && Prefs.permissoes(c))) startBlocker(c);
        scheduleNext(c);
    }

    static void startBlocker(Context c) {
        try {
            c.startForegroundService(new Intent(c, BlockerService.class));
        } catch (Exception e) {
            // O Android pode impedir de iniciar em segundo plano: registra e, se houver penalidade, avisa.
            Prefs.logError(c, e.getClass().getSimpleName() + ": " + e.getMessage());
            if (Prefs.shouldBlock(c)) notify(c, 3, CH_BLOQUEIO, "Zona de Penalidade", "Toque para abrir O Sistema e ativar a Zona de Penalidade.");
            else if (Toque.ativo(c)) notify(c, 3, CH_BLOQUEIO, "Toque de recolher", "Toque para abrir O Sistema e ativar o toque de recolher.");
        }
    }

    static void scheduleNext(Context c) {
        long now = System.currentTimeMillis();
        set(c, 1, ACT_EVAL, toMillis(nextCheck(LocalDateTime.now())));
        long unlockFrom = Prefs.sp(c).getLong("unlockFrom", 0), unlock = Prefs.sp(c).getLong("unlockUntil", 0);
        if (unlockFrom > now) set(c, 5, ACT_EVAL, unlockFrom + 1000);
        if (unlock > now) set(c, 2, ACT_EVAL, unlock + 1000);
        long disable = Prefs.sp(c).getLong("disableAt", 0);
        if (disable > now) set(c, 3, ACT_EVAL, disable + 1000);
        // toque de recolher: liga às 20h e desliga às 8h (o vigia também se desliga sozinho ao passar das 8h)
        set(c, 6, ACT_EVAL, Toque.ms(Toque.proximoInicio(LocalDateTime.now())) + 1000);
        set(c, 7, ACT_EVAL, Toque.ms(Toque.fim(LocalDateTime.now())) + 1000);
        long toqueDes = Prefs.sp(c).getLong("toqueDesligarEm", 0);
        if (toqueDes > now) set(c, 8, ACT_EVAL, toqueDes + 1000);
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
