package app.osistema;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.time.LocalDateTime;
import org.junit.Test;

/** Regras do toque de recolher (20h às 8h, preço dobrando por noite, liberação da manhã depois das 5h). */
public class ToqueTest {
    static LocalDateTime t(String s) { return LocalDateTime.parse(s); }

    @Test public void janela_das20as8() {
        assertFalse(Toque.janela(t("2026-11-23T19:59")));
        assertTrue(Toque.janela(t("2026-11-23T20:00")));
        assertTrue(Toque.janela(t("2026-11-24T02:30")));
        assertTrue(Toque.janela(t("2026-11-24T07:59")));
        assertFalse(Toque.janela(t("2026-11-24T08:00")));
    }
    @Test public void madrugadaPertenceANoiteAnterior() {
        assertEquals("2026-11-23", Toque.noite(t("2026-11-23T22:00")));
        assertEquals("2026-11-23", Toque.noite(t("2026-11-24T03:00")));
        assertEquals("2026-11-24", Toque.noite(t("2026-11-24T20:30")));
    }
    @Test public void precoDobraAte640() {
        assertEquals(20, Toque.preco(0));
        assertEquals(40, Toque.preco(1));
        assertEquals(80, Toque.preco(2));
        assertEquals(640, Toque.preco(5));
        assertEquals(640, Toque.preco(30));
    }
    @Test public void manhaSoDepoisDas5() {
        assertFalse(Toque.manha(t("2026-11-24T04:59")));
        assertTrue(Toque.manha(t("2026-11-24T05:00")));
        assertTrue(Toque.manha(t("2026-11-24T07:30")));
        assertFalse(Toque.manha(t("2026-11-24T22:00")));
    }
    @Test public void fimEInicio() {
        assertEquals(t("2026-11-24T08:00"), Toque.fim(t("2026-11-23T21:00")));
        assertEquals(t("2026-11-24T08:00"), Toque.fim(t("2026-11-24T06:00")));
        assertEquals(t("2026-11-23T20:00"), Toque.proximoInicio(t("2026-11-23T09:00")));
        assertEquals(t("2026-11-24T20:00"), Toque.proximoInicio(t("2026-11-23T20:00")));
    }
}
