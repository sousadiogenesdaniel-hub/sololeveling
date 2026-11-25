package app.osistema;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** Soma dos passos do rastreamento a partir das leituras do contador do celular. */
public class PassosTest {
    @Test public void primeiraLeituraSoMarcaOPontoDePartida() {
        assertEquals(0, Rastreio.somaPassos(0, -1, 52_310, true));
    }
    @Test public void somaADiferencaEntreLeituras() {
        assertEquals(120, Rastreio.somaPassos(100, 52_310, 52_330, true));
    }
    @Test public void naPausaNaoSoma() {
        assertEquals(100, Rastreio.somaPassos(100, 52_310, 52_900, false));
    }
    @Test public void celularReiniciadoNaoTiraNemSoma() {
        assertEquals(100, Rastreio.somaPassos(100, 52_310, 40, true));
    }
}
