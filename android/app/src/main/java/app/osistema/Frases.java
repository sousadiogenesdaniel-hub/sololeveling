package app.osistema;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Meu porquê (app 2.0): as mensagens curtas que o jogador escreveu no app (até 90 caracteres) aparecem numa linha
 * nas telas de bloqueio. "pen" = Zona de Penalidade, "toque" = toque de recolher. Ficam só no aparelho.
 */
final class Frases {
    private Frases() {}
    static final int MAX = 90;

    /** Regra pura (testada em FrasesTest): uma frase válida da lista, sorteada; null se não houver nenhuma. */
    static String escolher(List<String> lista, Random rnd) {
        if (lista == null) return null;
        List<String> ok = new ArrayList<>();
        for (String x : lista) {
            String s = x == null ? "" : x.trim();
            if (!s.isEmpty() && s.length() <= MAX) ok.add(s);
        }
        return ok.isEmpty() ? null : ok.get(rnd.nextInt(ok.size()));
    }

    /** Frase para a tela de bloqueio: tipo "pen" ou "toque". */
    static String para(Context c, String tipo) {
        try {
            JSONArray a = new JSONObject(Prefs.sp(c).getString("frases", "{}")).optJSONArray(tipo);
            List<String> l = new ArrayList<>();
            if (a != null) for (int i = 0; i < a.length(); i++) l.add(a.optString(i, ""));
            return escolher(l, new Random());
        } catch (Exception e) { return null; }
    }
}
