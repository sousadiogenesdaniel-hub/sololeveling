package app.osistema;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recebe os alarmes agendados pelo Scheduler. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (Scheduler.ACT_LEMBRETE.equals(intent.getAction())) Scheduler.reminder(c);
        Scheduler.evaluate(c);
    }
}
