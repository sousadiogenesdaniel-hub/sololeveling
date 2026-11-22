package app.osistema;

/**
 * Soma da distância de uma atividade rastreada, com as mesmas regras do app web: ignora leituras com
 * precisão pior que 35 m, passos menores que o ruído do GPS e trechos rápidos demais para a atividade
 * (carro, ônibus). Não usa nada do Android, para ser testada em PercursoTest.
 */
final class Percurso {
    static final double PRECISAO_MAX = 35;

    double dist, elev;
    double lastLat = Double.NaN, lastLon = Double.NaN, lastAlt = Double.NaN;
    long lastT;
    int pontos;

    /** Velocidade acima da qual o trecho não conta (km/h): a pé 30, de bicicleta 70. */
    static double maxKmh(String tipo) { return "bike".equals(tipo) ? 70 : 30; }

    /** Recebe uma leitura do GPS. Devolve true se ela entrou no percurso. alt = NaN quando não há altitude. */
    boolean add(double lat, double lon, double alt, double acc, long t, double maxKmh) {
        if (!(acc <= PRECISAO_MAX)) return false; // imprecisa demais
        if (Double.isNaN(lastLat)) { marca(lat, lon, alt, t); return true; }
        double d = distM(lastLat, lastLon, lat, lon);
        if (d < Math.max(8, acc * 0.6)) return false; // parado / ruído do GPS
        double seg = Math.max(1, (t - lastT) / 1000.0);
        if (d / seg * 3.6 <= maxKmh) {
            dist += d;
            if (!Double.isNaN(alt) && !Double.isNaN(lastAlt) && alt - lastAlt > 2) elev += alt - lastAlt;
        }
        marca(lat, lon, alt, t);
        return true;
    }

    private void marca(double lat, double lon, double alt, long t) {
        lastLat = lat; lastLon = lon; lastAlt = alt; lastT = t; pontos++;
    }

    /** Distância em metros entre duas coordenadas (haversine), igual à do app web. */
    static double distM(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000, dLat = Math.toRadians(lat2 - lat1), dLon = Math.toRadians(lon2 - lon1);
        double h = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }
}
