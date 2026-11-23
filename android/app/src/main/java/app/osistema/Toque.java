package app.osistema;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Toque de recolher: todo dia das 20h às 8h, os apps de vício (os mesmos da Zona de Penalidade + o Chrome)
 * custam Ouro e XP para usar: 15 minutos por vez, preço dobrando a cada liberação na mesma noite
 * (20, 40, 80…). Sem saldo, não libera. Ao abrir O Sistema depois das 5h dá para liberar a manhã inteira.
 * Desligar só vale 24 h depois do pedido. Na Zona de Penalidade, o bloqueio total vence (não dá para pagar).
 *
 * As cobranças ficam guardadas aqui e entram no jogo (XP e Ouro) da próxima vez que O Sistema abrir.
 */
final class Toque {
    private Toque() {}

    static final int INICIO_H = 20, FIM_H = 8, MANHA_H = 5, MINUTOS = 15, PRECO_BASE = 20, PRECO_MAX = 640;
    static final long ESPERA_DESLIGAR_MS = 24L * 60 * 60 * 1000;
    /** Apps do toque de recolher: os da Zona de Penalidade + o navegador Chrome. */
    static final Set<String> APPS;
    static {
        Set<String> s = new HashSet<>(Prefs.PADRAO);
        s.add("com.android.chrome");
        APPS = Collections.unmodifiableSet(s);
    }
    static String nome(String pkg) { return "com.android.chrome".equals(pkg) ? "Chrome" : Prefs.BLOQUEAVEIS.getOrDefault(pkg, "Este app"); }

    // ---- regras puras (testadas em ToqueTest) ----
    /** Está dentro do horário do toque de recolher (20h às 8h)? */
    static boolean janela(LocalDateTime t) { int h = t.getHour(); return h >= INICIO_H || h < FIM_H; }
    /** A "noite" a que o horário pertence (a data em que começou às 20h). Serve para zerar o preço a cada noite. */
    static String noite(LocalDateTime t) { return (t.getHour() < FIM_H ? t.toLocalDate().minusDays(1) : t.toLocalDate()).toString(); }
    /** Preço da liberação de número n da noite (0 = a primeira): 20, 40, 80… até 640. */
    static int preco(int n) { long p = (long) PRECO_BASE << Math.min(n, 10); return (int) Math.min(PRECO_MAX, p); }
    /** Já dá para liberar a manhã? (entre 5h e 8h) */
    static boolean manha(LocalDateTime t) { int h = t.getHour(); return h >= MANHA_H && h < FIM_H; }
    /** Fim da noite atual: as 8h de hoje (se ainda não passou) ou de amanhã. */
    static LocalDateTime fim(LocalDateTime t) { LocalDateTime f = t.toLocalDate().atTime(FIM_H, 0); return t.isBefore(f) ? f : f.plusDays(1); }
    /** Próximo início (20h). */
    static LocalDateTime proximoInicio(LocalDateTime t) { LocalDateTime i = t.toLocalDate().atTime(INICIO_H, 0); return t.isBefore(i) ? i : i.plusDays(1); }

    static long ms(LocalDateTime t) { return t.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(); }

    // ---- estado no aparelho ----
    private static SharedPreferences sp(Context c) { return Prefs.sp(c); }

    /** Ligado? (aplica um "desligar em 24 h" vencido) */
    static boolean ligado(Context c) {
        SharedPreferences p = sp(c);
        long des = p.getLong("toqueDesligarEm", 0);
        if (des > 0 && System.currentTimeMillis() >= des) p.edit().putBoolean("toqueLigado", false).putLong("toqueDesligarEm", 0).apply();
        return p.getBoolean("toqueLigado", true);
    }
    /** Dentro do horário e ligado (mesmo que liberado por pagamento ou pela manhã) */
    static boolean ativo(Context c) { return ligado(c) && janela(LocalDateTime.now()); }
    static long liberadoAte(Context c) { return sp(c).getLong("toqueLiberadoAte", 0); }
    /** Deve cobrir os apps agora? */
    static boolean cobrindo(Context c) { return ativo(c) && System.currentTimeMillis() >= liberadoAte(c); }
    /** A manhã já foi liberada (até as 8h)? Então o vigia pode parar até as 20h. */
    static boolean manhaLiberada(Context c) { return liberadoAte(c) >= ms(fim(LocalDateTime.now())); }

    /** Liberações já pagas nesta noite */
    static int usos(Context c) {
        SharedPreferences p = sp(c);
        String n = noite(LocalDateTime.now());
        if (!n.equals(p.getString("toqueNoite", ""))) { p.edit().putString("toqueNoite", n).putInt("toqueUsos", 0).apply(); return 0; }
        return p.getInt("toqueUsos", 0);
    }
    static int precoAgora(Context c) { return preco(usos(c)); }

    static JSONArray cobrancas(Context c) {
        try { return new JSONArray(sp(c).getString("toqueCobrancas", "[]")); } catch (Exception e) { return new JSONArray(); }
    }
    /** Saldo disponível: o último informado pelo app menos o que ainda não foi cobrado lá */
    static int[] saldo(Context c) {
        SharedPreferences p = sp(c);
        int ouro = p.getInt("saldoOuro", 0), xp = p.getInt("saldoXp", 0);
        JSONArray a = cobrancas(c);
        for (int i = 0; i < a.length(); i++) { JSONObject o = a.optJSONObject(i); if (o != null) { ouro -= o.optInt("ouro"); xp -= o.optInt("xp"); } }
        return new int[]{ ouro, xp };
    }

    /** Paga e libera 15 min. Devolve null se deu certo, ou o motivo. */
    static synchronized String pagar(Context c, String pkg) {
        if (!ativo(c)) return "fora do horário";
        int preco = precoAgora(c);
        int[] s = saldo(c);
        if (s[0] < preco) return "Ouro insuficiente (você tem " + Math.max(0, s[0]) + ")";
        if (s[1] < preco) return "XP insuficiente (você tem " + Math.max(0, s[1]) + ")";
        try {
            JSONArray a = cobrancas(c);
            long agora = System.currentTimeMillis();
            a.put(new JSONObject().put("id", "t" + agora).put("t", agora).put("app", nome(pkg)).put("ouro", preco).put("xp", preco).put("min", MINUTOS));
            sp(c).edit().putString("toqueCobrancas", a.toString()).putInt("toqueUsos", usos(c) + 1)
                .putLong("toqueLiberadoAte", agora + MINUTOS * 60_000L).apply();
            return null;
        } catch (Exception e) { return "erro"; }
    }

    /** O app confirmou que aplicou estas cobranças no jogo: saem da lista e do saldo guardado. */
    static synchronized void confirmar(Context c, Set<String> ids) {
        JSONArray a = cobrancas(c), resto = new JSONArray();
        SharedPreferences p = sp(c);
        int ouro = p.getInt("saldoOuro", 0), xp = p.getInt("saldoXp", 0);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i); if (o == null) continue;
            if (ids.contains(o.optString("id"))) { ouro -= o.optInt("ouro"); xp -= o.optInt("xp"); } else resto.put(o);
        }
        p.edit().putString("toqueCobrancas", resto.toString()).putInt("saldoOuro", ouro).putInt("saldoXp", xp).apply();
    }

    /** Ao abrir O Sistema depois das 5h: libera até as 8h. */
    static boolean liberarManha(Context c) {
        LocalDateTime t = LocalDateTime.now();
        if (!ativo(c) || !manha(t)) return false;
        sp(c).edit().putLong("toqueLiberadoAte", ms(fim(t))).apply();
        return true;
    }

    static long pedirDesligar(Context c) {
        SharedPreferences p = sp(c);
        long at = p.getLong("toqueDesligarEm", 0);
        if (at == 0) { at = System.currentTimeMillis() + ESPERA_DESLIGAR_MS; p.edit().putLong("toqueDesligarEm", at).apply(); }
        return at;
    }
    static void cancelarDesligar(Context c) { sp(c).edit().putLong("toqueDesligarEm", 0).apply(); }
    static void ligar(Context c) { sp(c).edit().putBoolean("toqueLigado", true).putLong("toqueDesligarEm", 0).apply(); }

    static JSONObject status(Context c) throws Exception {
        SharedPreferences p = sp(c);
        LocalDateTime t = LocalDateTime.now();
        int[] s = saldo(c);
        return new JSONObject().put("ligado", ligado(c)).put("janela", janela(t)).put("ativo", ativo(c)).put("cobrindo", cobrindo(c))
            .put("liberadoAte", liberadoAte(c)).put("manha", manha(t)).put("manhaLiberada", ativo(c) && manhaLiberada(c))
            .put("desligarEm", p.getLong("toqueDesligarEm", 0)).put("usos", usos(c)).put("preco", precoAgora(c))
            .put("saldoOuro", s[0]).put("saldoXp", s[1]).put("pendentes", cobrancas(c).length());
    }
}
