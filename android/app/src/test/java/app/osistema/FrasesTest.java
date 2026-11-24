package app.osistema;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.Arrays;
import java.util.Collections;
import java.util.Random;
import org.junit.Test;

/** Meu porquê: só frases de até 90 caracteres vão para a tela de bloqueio. */
public class FrasesTest {
    @Test public void vazioOuNulo() {
        assertNull(Frases.escolher(null, new Random(1)));
        assertNull(Frases.escolher(Collections.emptyList(), new Random(1)));
    }
    @Test public void ignoraLongasEVazias() {
        StringBuilder longa = new StringBuilder();
        for (int i = 0; i < 95; i++) longa.append('x');
        assertEquals("Fecha o app.", Frases.escolher(Arrays.asList("", longa.toString(), "  Fecha o app.  "), new Random(7)));
    }
}
