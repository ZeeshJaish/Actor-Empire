package com.zeeshapps.actorempire;

final class DeviceCapabilityValues {
    private static final long BYTES_PER_MEGABYTE = 1024L * 1024L;
    private static final float MAX_REASONABLE_THERMAL_HEADROOM = 10.0f;

    private DeviceCapabilityValues() {
    }

    static long bytesToMegabytes(long bytes) {
        if (bytes <= 0L) return 0L;
        return bytes / BYTES_PER_MEGABYTE;
    }

    static Double sanitizeThermalHeadroom(float headroom) {
        if (!Float.isFinite(headroom) || headroom < 0.0f || headroom > MAX_REASONABLE_THERMAL_HEADROOM) {
            return null;
        }
        return (double) headroom;
    }
}
