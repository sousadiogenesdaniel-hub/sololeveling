package app.osistema;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import java.util.Locale;

/**
 * Rastreamento de atividade (caminhada, corrida, trilha, bike) com a tela bloqueada. Só existe enquanto
 * você está rastreando: começa quando você toca em "Rastrear agora com GPS" e acaba em Finalizar ou Descartar.
 * Enquanto isso, fica uma notificação "Rastreando" (o Android exige, e é o aviso de que o GPS está ligado).
 * Usa só o GPS do aparelho; não guarda o trajeto, só a distância e a subida somadas, e não envia nada.
 */
public class TrackerService extends Service implements LocationListener {
    static final int ID = 7;
    private static final long INTERVALO_MS = 2000, MAX_DURACAO_MS = 6L * 60 * 60 * 1000;

    private LocationManager lm;
    private PowerManager.WakeLock wl;
    private Percurso p;
    private long ultimaNotif;
    private boolean gpsDesligado;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!Rastreio.ativo(this)) { stopSelf(); return START_NOT_STICKY; }
        try {
            Notification n = notificacao();
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(ID, n);
        } catch (Exception e) {
            // ex.: o Android não deixa ligar o GPS em segundo plano. O percurso fica salvo e continua ao abrir o app.
            Prefs.logError(this, "GPS: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            stopSelf();
            return START_NOT_STICKY;
        }
        if (lm == null) {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Prefs.logError(this, "GPS: sem permissão de localização precisa");
                stopSelf();
                return START_NOT_STICKY;
            }
            p = Rastreio.carregar(this);
            lm = getSystemService(LocationManager.class);
            try {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, INTERVALO_MS, 0, this, Looper.getMainLooper());
            } catch (SecurityException | IllegalArgumentException e) {
                Prefs.logError(this, "GPS: " + e.getClass().getSimpleName() + ": " + e.getMessage());
                lm = null;
                stopSelf();
                return START_NOT_STICKY;
            }
            // mantém o processador acordado para não perder leituras com a tela apagada (o GPS é que gasta)
            wl = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "osistema:rastreio");
            wl.acquire(MAX_DURACAO_MS);
        }
        Rastreio.rodando = true;
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location l) {
        if (!Rastreio.ativo(this)) { stopSelf(); return; }
        Rastreio.ponto(this, p, l.getLatitude(), l.getLongitude(), l.hasAltitude() ? l.getAltitude() : Double.NaN,
            l.hasAccuracy() ? l.getAccuracy() : 999, l.getTime());
        gpsDesligado = false;
        long agora = System.currentTimeMillis();
        if (agora - ultimaNotif > 10_000) { ultimaNotif = agora; atualizar(); }
    }

    @Override public void onProviderDisabled(String provider) { gpsDesligado = true; atualizar(); }
    @Override public void onProviderEnabled(String provider) { gpsDesligado = false; atualizar(); }
    @SuppressWarnings("deprecation")
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}

    private void atualizar() {
        try { getSystemService(NotificationManager.class).notify(ID, notificacao()); } catch (Exception ignored) {}
    }

    private static String nome(String tipo) {
        switch (tipo) {
            case "corrida": return "Corrida";
            case "trilha": return "Trilha";
            case "bike": return "Bicicleta";
            default: return "Caminhada";
        }
    }

    private Notification notificacao() {
        Scheduler.channels(this);
        float km = Rastreio.sp(this).getFloat("dist", 0) / 1000f;
        String texto = String.format(new Locale("pt", "BR"), "%.2f km", km)
            + (gpsDesligado ? " · localização do celular desligada" : "")
            + "\nPode bloquear a tela. Para encerrar, abra o app e toque em Finalizar.";
        return new Notification.Builder(this, Scheduler.CH_RASTREIO)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("Rastreando: " + nome(Rastreio.tipo(this)))
            .setContentText(texto)
            .setStyle(new Notification.BigTextStyle().bigText(texto))
            .setWhen(Rastreio.inicio(this)).setShowWhen(true).setUsesChronometer(true)
            .setContentIntent(Scheduler.openApp(this))
            .setOngoing(true).setOnlyAlertOnce(true)
            .build();
    }

    @Override
    public void onDestroy() {
        if (lm != null) lm.removeUpdates(this);
        lm = null;
        if (wl != null && wl.isHeld()) wl.release();
        Rastreio.rodando = false;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
