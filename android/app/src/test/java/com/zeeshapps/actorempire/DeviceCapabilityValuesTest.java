package com.zeeshapps.actorempire;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class DeviceCapabilityValuesTest {
    @Test
    public void bytesToMegabytesUsesBinaryUnitsAndNeverReturnsNegativeValues() {
        assertEquals(8L, DeviceCapabilityValues.bytesToMegabytes(8L * 1024L * 1024L));
        assertEquals(0L, DeviceCapabilityValues.bytesToMegabytes(-1L));
    }

    @Test
    public void sanitizeThermalHeadroomRejectsUnavailableOrUnreasonableReadings() {
        assertNull(DeviceCapabilityValues.sanitizeThermalHeadroom(Float.NaN));
        assertNull(DeviceCapabilityValues.sanitizeThermalHeadroom(-0.1f));
        assertNull(DeviceCapabilityValues.sanitizeThermalHeadroom(10.1f));
        assertEquals(0.42d, DeviceCapabilityValues.sanitizeThermalHeadroom(0.42f), 0.001d);
    }
}
