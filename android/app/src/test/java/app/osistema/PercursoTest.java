package app.osistema;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Regras da soma de distância do rastreamento (as mesmas do app web). */
public class PercursoTest {
    // ~0,0001° de latitude = ~11,1 m
    static final double LAT = -3.73, LON = -38.52, PASSO = 0.0001;
    static final double A_PE = Percurso.maxKmh("corrida");

    @Test public void corridaNormal_somaTudo() {
        Percurso p = new Percurso();
        for (int i = 0; i <= 10; i++) p.add(LAT + i * PASSO, LON, Double.NaN, 5, i * 4000L, A_PE); // ~11 m a cada 4 s ≈ 10 km/h
        assertEquals(111, p.dist, 2);
    }

    @Test public void leituraImprecisa_ehIgnorada() {
        Percurso p = new Percurso();
        p.add(LAT, LON, Double.NaN, 5, 0, A_PE);
        assertFalse(p.add(LAT + 10 * PASSO, LON, Double.NaN, 50, 60_000, A_PE));
        assertEquals(0, p.dist, 0.01);
    }

    @Test public void paradoNoLugar_naoSoma() {
        Percurso p = new Percurso();
        p.add(LAT, LON, Double.NaN, 10, 0, A_PE);
        for (int i = 1; i < 30; i++) p.add(LAT + (i % 2) * 0.00005, LON, Double.NaN, 10, i * 2000L, A_PE); // vai e volta 5,5 m
        assertEquals(0, p.dist, 0.01);
    }

    @Test public void trechoDeCarro_naoConta() {
        Percurso p = new Percurso();
        p.add(LAT, LON, Double.NaN, 5, 0, A_PE);
        assertTrue(p.add(LAT + 30 * PASSO, LON, Double.NaN, 5, 4000, A_PE)); // 333 m em 4 s = 300 km/h
        assertEquals(0, p.dist, 0.01);
        p.add(LAT + 31 * PASSO, LON, Double.NaN, 5, 8000, A_PE); // depois volta a correr: conta a partir daí
        assertEquals(11.1, p.dist, 0.5);
    }

    @Test public void bike_aceitaMaisVelocidade() {
        Percurso p = new Percurso();
        double bike = Percurso.maxKmh("bike");
        p.add(LAT, LON, Double.NaN, 5, 0, bike);
        p.add(LAT + 4 * PASSO, LON, Double.NaN, 5, 2000, bike); // 44 m em 2 s = 80 km/h: não
        p.add(LAT + 7 * PASSO, LON, Double.NaN, 5, 4000, bike); // 33 m em 2 s = 60 km/h: sim
        assertEquals(33.3, p.dist, 0.5);
    }

    @Test public void subida_somaSoQuandoSobeMaisDe2m() {
        Percurso p = new Percurso();
        p.add(LAT, LON, 10, 5, 0, A_PE);
        p.add(LAT + PASSO, LON, 11, 5, 4000, A_PE);   // +1: não
        p.add(LAT + 2 * PASSO, LON, 15, 5, 8000, A_PE); // +4: sim
        p.add(LAT + 3 * PASSO, LON, 12, 5, 12000, A_PE); // desceu: não
        assertEquals(4, p.elev, 0.01);
    }

    @Test public void retomarSemPontoAnterior_naoSomaOCaminhoDaPausa() {
        Percurso p = new Percurso();
        p.add(LAT, LON, Double.NaN, 5, 0, A_PE);
        p.add(LAT + PASSO, LON, Double.NaN, 5, 4000, A_PE);
        // pausa: o ponto anterior é apagado (Rastreio.pausar); retoma 500 m adiante
        p.lastLat = Double.NaN; p.lastLon = Double.NaN;
        p.add(LAT + 46 * PASSO, LON, Double.NaN, 5, 600_000, A_PE);
        p.add(LAT + 47 * PASSO, LON, Double.NaN, 5, 604_000, A_PE);
        assertEquals(22.2, p.dist, 0.5);
    }
}
