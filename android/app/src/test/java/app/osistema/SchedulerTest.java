package app.osistema;

import static org.junit.Assert.assertEquals;

import java.time.LocalDateTime;
import org.junit.Test;

/** A conferência da falta do dia anterior acontece às 07:05 (fim do modo dormir). */
public class SchedulerTest {
    static LocalDateTime t(String s) { return LocalDateTime.parse(s); }

    @Test public void deMadrugada_confereHojeAs0705() {
        assertEquals(t("2026-11-23T07:05"), Scheduler.nextCheck(t("2026-11-23T00:30")));
    }
    @Test public void logoAntes_confereHojeAs0705() {
        assertEquals(t("2026-11-23T07:05"), Scheduler.nextCheck(t("2026-11-23T07:04:59")));
    }
    @Test public void depoisDas0705_confereAmanha() {
        assertEquals(t("2026-11-24T07:05"), Scheduler.nextCheck(t("2026-11-23T07:05")));
        assertEquals(t("2026-11-24T07:05"), Scheduler.nextCheck(t("2026-11-23T22:00")));
    }
}
