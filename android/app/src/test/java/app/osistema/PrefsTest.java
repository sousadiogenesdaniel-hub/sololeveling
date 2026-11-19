package app.osistema;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.time.LocalDate;
import org.junit.Test;

/** Regra que bloqueia mesmo se o app não for aberto. Descanso = sexta (5). 19/11/2026 é quinta. */
public class PrefsTest {
    static LocalDate d(String s) { return LocalDate.parse(s); }
    static final int SEXTA = 5;

    @Test public void abriuHoje_naoDeduzNada() {
        assertFalse(Prefs.missed(d("2026-11-01"), d("2026-11-19"), d("2026-11-18"), SEXTA, d("2026-11-19")));
    }
    @Test public void treinouOntem_eAbriuOntem_semFalta() {
        assertFalse(Prefs.missed(d("2026-11-01"), d("2026-11-18"), d("2026-11-18"), SEXTA, d("2026-11-19")));
    }
    @Test public void abriuOntemSemTreinar_eNaoAbriuMais_falta() {
        assertTrue(Prefs.missed(d("2026-11-01"), d("2026-11-18"), d("2026-11-17"), SEXTA, d("2026-11-19")));
    }
    @Test public void ontemFoiDescanso_semFalta() {
        // sábado 21: ontem (sexta 20) foi descanso; treinou quinta 19
        assertFalse(Prefs.missed(d("2026-11-01"), d("2026-11-19"), d("2026-11-19"), SEXTA, d("2026-11-21")));
    }
    @Test public void sumiuVariosDias_falta() {
        assertTrue(Prefs.missed(d("2026-11-01"), d("2026-11-15"), d("2026-11-15"), SEXTA, d("2026-11-19")));
    }
    @Test public void cobrancaAindaNaoComecou_semFalta() {
        assertFalse(Prefs.missed(d("2026-11-25"), d("2026-11-15"), null, SEXTA, d("2026-11-19")));
    }
    @Test public void semTrilhaOuSemSync_semFalta() {
        assertFalse(Prefs.missed(null, d("2026-11-15"), null, SEXTA, d("2026-11-19")));
        assertFalse(Prefs.missed(d("2026-11-01"), null, null, SEXTA, d("2026-11-19")));
    }
    @Test public void diaDaSemanaNoFormatoJavaScript() {
        assertTrue(Prefs.jsWeekday(d("2026-11-22")) == 0); // domingo
        assertTrue(Prefs.jsWeekday(d("2026-11-20")) == 5); // sexta
    }
}
