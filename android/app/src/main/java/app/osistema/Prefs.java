package app.osistema;

import android.content.Context;
import android.content.SharedPreferences;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Estado do bloqueio guardado no aparelho e as regras de quando bloquear.
 *
 * O app web informa (sync) se há Zona de Penalidade, o dia de descanso, desde quando há cobrança e o
 * último dia com missão concluída. Se o app ficar dias sem ser aberto, o nativo deduz sozinho que houve
 * falta (dia cobrado sem missão) e bloqueia, para não dar para escapar simplesmente não abrindo o app.
 */
final class Prefs {
    private Prefs() {}

    /** Apps que PODEM ser bloqueados. O app web só escolhe dentro desta lista: nunca banco, telefone ou Ajustes. */
    static final Map<String, String> BLOQUEAVEIS = new LinkedHashMap<>();
    static {
        BLOQUEAVEIS.put("com.whatsapp", "WhatsApp");
        BLOQUEAVEIS.put("com.whatsapp.w4b", "WhatsApp Business");
        BLOQUEAVEIS.put("com.google.android.gm", "Gmail");
        BLOQUEAVEIS.put("com.instagram.android", "Instagram");
        BLOQUEAVEIS.put("com.google.android.youtube", "YouTube");
        BLOQUEAVEIS.put("com.zhiliaoapp.musically", "TikTok");
    }
    static final Set<String> PADRAO = new HashSet<>(Arrays.asList("com.whatsapp", "com.whatsapp.w4b", "com.google.android.gm"));

    static final int EMERGENCIA_MIN = 15, EMERGENCIA_POR_DIA = 2;
    static final long ESPERA_DESLIGAR_MS = 24L * 60 * 60 * 1000;

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("sistema", Context.MODE_PRIVATE); }

    static Set<String> blocked(Context c) {
        Set<String> s = sp(c).getStringSet("blocked", null);
        return s == null ? PADRAO : Collections.unmodifiableSet(new HashSet<>(s));
    }

    /** Dia da semana no formato do JavaScript (0 = domingo). */
    static int jsWeekday(LocalDate d) { return d.getDayOfWeek().getValue() % 7; }

    static LocalDate parse(String s) {
        try { return s == null || s.isEmpty() ? null : LocalDate.parse(s); } catch (Exception e) { return null; }
    }

    /** Houve algum dia cobrado, depois da última vez que o app web conferiu, sem missão concluída? */
    static boolean inferredMiss(Context c) {
        SharedPreferences p = sp(c);
        return missed(parse(p.getString("obligatedFrom", null)), parse(p.getString("lastSync", null)),
            parse(p.getString("lastDone", null)), p.getInt("restDay", -1), LocalDate.now());
    }

    /**
     * Regra pura (testada em PrefsTest): entre a última conferência do app web (sync) e ontem, houve algum
     * dia cobrado (a partir de `from`, fora do dia de descanso) depois do último treino concluído (`done`)?
     */
    static boolean missed(LocalDate from, LocalDate sync, LocalDate done, int rest, LocalDate today) {
        if (from == null || sync == null) return false;
        LocalDate start = sync;
        if (from.isAfter(start)) start = from;
        if (done != null && !done.isBefore(start)) start = done.plusDays(1);
        for (LocalDate d = start; d.isBefore(today); d = d.plusDays(1)) {
            if (jsWeekday(d) != rest) return true;
        }
        return false;
    }

    static boolean penaltyActive(Context c) { return sp(c).getBoolean("penalty", false) || inferredMiss(c); }

    /** O bloqueio deve estar valendo agora? */
    static boolean shouldBlock(Context c) {
        SharedPreferences p = sp(c);
        long now = System.currentTimeMillis();
        long disableAt = p.getLong("disableAt", 0);
        if (disableAt > 0 && now >= disableAt) {
            p.edit().putBoolean("blockingEnabled", false).putLong("disableAt", 0).apply();
        }
        if (!p.getBoolean("blockingEnabled", true)) return false;
        if (now < p.getLong("unlockUntil", 0)) return false;
        return penaltyActive(c);
    }

    static boolean missionPendingToday(Context c) {
        SharedPreferences p = sp(c);
        LocalDate from = parse(p.getString("obligatedFrom", null)), today = LocalDate.now();
        if (from == null || today.isBefore(from)) return false;
        if (jsWeekday(today) == p.getInt("restDay", -1)) return false;
        return !today.toString().equals(p.getString("lastDone", ""));
    }

    /** Desbloqueio de emergência: 15 minutos, no máximo 2 por dia. Devolve o horário de fim, ou 0 se acabou o limite. */
    static long emergency(Context c) {
        SharedPreferences p = sp(c);
        String hoje = LocalDate.now().toString();
        int usadas = hoje.equals(p.getString("emergDay", "")) ? p.getInt("emergCount", 0) : 0;
        if (usadas >= EMERGENCIA_POR_DIA) return 0;
        long ate = System.currentTimeMillis() + EMERGENCIA_MIN * 60_000L;
        p.edit().putString("emergDay", hoje).putInt("emergCount", usadas + 1).putLong("unlockUntil", ate).apply();
        return ate;
    }

    static int emergencyLeft(Context c) {
        SharedPreferences p = sp(c);
        int usadas = LocalDate.now().toString().equals(p.getString("emergDay", "")) ? p.getInt("emergCount", 0) : 0;
        return Math.max(0, EMERGENCIA_POR_DIA - usadas);
    }
}
