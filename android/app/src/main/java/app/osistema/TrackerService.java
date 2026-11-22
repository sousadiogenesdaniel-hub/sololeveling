package app.osistema;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
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
 * Enquanto isso, fica uma notificação "Rastreando" (o Android exige, e é o aviso de que o GPS está ligado),
 * com o botão Pausar/Retomar. Na pausa o GPS fica desligado.
 * Usa só o GPS do aparelho; não guarda o trajeto, só a distância e a subida somadas, e não envia nada.
 */
public class TrackerService extends Service implements LocationListener {
    static final int ID = 7;
    static final String ACT_PAUSAR = "app.osistema.PAUSAR", ACT_RETOMAR = "app.osistema.RETOMAR";
    private static final long INTERVALO_MS = 2000, MAX_DURACAO_MS = 6L * 60 * 60 * 1000;

    private LocationManager lm;
    private boolean gpsLigado, gpsDesligado;
    private PowerManager.WakeLock wl;
    private Percurso p;
    private long ultimaNotif;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!Rastreio.ativo(this)) { stopSelf(); return START_NOT_STICKY; }
        String act = intent != null ? intent.getAction() : null;
        if (ACT_PAUSAR.equals(act)) Rastreio.pausar(this, true);
        else if (ACT_RETOMAR.equals(act)) Rastreio.pausar(this, false);
        try {
            Notification n = notificacao();
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(ID, n);
        } catch (Exception e) {
            // ex.: o Android não deixa ligar o GPS em segundo plano. O percurso fica salvo e continua ao abrir o app.
            erro(e.getClass().getSimpleName() + ": " + e.getMessage());
            return START_NOT_STICKY;
        }
        if (lm == null) lm = getSystemService(LocationManager.class);
        p = Rastreio.carregar(this); // relê: ao retomar, o percurso recomeça do ponto atual
        if (!aplicarGps()) return START_NOT_STICKY;
        Rastreio.rodando = true;
        return START_STICKY;
    }

    /** Liga o GPS (e mantém o processador acordado) se estiver rastreando; desliga na pausa. */
    private boolean aplicarGps() {
        boolean pausado = Rastreio.pausado(this);
        if (pausado && gpsLigado) {
            lm.removeUpdates(this);
            gpsLigado = false;
            if (wl != null && wl.isHeld()) wl.release();
        } else if (!pausado && !gpsLigado) {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                erro("sem permissão de localização precisa");
                return false;
            }
            try {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, INTERVALO_MS, 0, this, Looper.getMainLooper());
            } catch (SecurityException | IllegalArgumentException e) {
                erro(e.getClass().getSimpleName() + ": " + e.getMessage());
                return false;
            }
            gpsLigado = true;
            // mantém o processador acordado para não perder leituras com a tela apagada (o GPS é que gasta)
            if (wl == null) wl = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "osistema:rastreio");
            if (!wl.isHeld()) wl.acquire(MAX_DURACAO_MS);
        }
        return true;
    }

    private void erro(String msg) {
        Prefs.logError(this, "GPS: " + msg);
        stopSelf();
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

    private static String duracao(long ms) {
        long s = ms / 1000, h = s / 3600, m = s / 60 % 60;
        return h > 0 ? String.format(Locale.ROOT, "%d:%02d:%02d", h, m, s % 60) : String.format(Locale.ROOT, "%02d:%02d", m, s % 60);
    }

    private Notification notificacao() {
        Scheduler.channels(this);
        boolean pausado = Rastreio.pausado(this);
        long agora = System.currentTimeMillis();
        String km = String.format(new Locale("pt", "BR"), "%.2f km", Rastreio.sp(this).getFloat("dist", 0) / 1000f);
        String texto = pausado
            ? km + " em " + duracao(Rastreio.ativoMs(this, agora)) + "\nPausado: o GPS está desligado e o tempo parado não conta."
            : km + (gpsDesligado ? " · localização do celular desligada" : "")
                + "\nPode bloquear a tela. Para encerrar, abra o app e toque em Finalizar.";
        Intent acao = new Intent(this, TrackerService.class).setAction(pausado ? ACT_RETOMAR : ACT_PAUSAR);
        PendingIntent pi = PendingIntent.getService(this, 1, acao, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = new Notification.Builder(this, Scheduler.CH_RASTREIO)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle((pausado ? "Pausado: " : "Rastreando: ") + nome(Rastreio.tipo(this)))
            .setContentText(texto)
            .setStyle(new Notification.BigTextStyle().bigText(texto))
            .setContentIntent(Scheduler.openApp(this))
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_stat),
                pausado ? "Retomar" : "Pausar", pi).build())
            .setOngoing(true).setOnlyAlertOnce(true);
        // cronômetro do Android: conta a partir do início menos as pausas
        if (pausado) b.setShowWhen(false).setUsesChronometer(false);
        else b.setWhen(agora - Rastreio.ativoMs(this, agora)).setShowWhen(true).setUsesChronometer(true);
        return b.build();
    }

    @Override
    public void onDestroy() {
        if (lm != null && gpsLigado) lm.removeUpdates(this);
        gpsLigado = false;
        if (wl != null && wl.isHeld()) wl.release();
        Rastreio.rodando = false;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
