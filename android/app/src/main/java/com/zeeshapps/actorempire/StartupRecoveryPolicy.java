package com.zeeshapps.actorempire;

public final class StartupRecoveryPolicy {
    private static final int SAFE_MODE_FAILURE_THRESHOLD = 2;

    private StartupRecoveryPolicy() {}

    public static int beginLaunchFailureCount(boolean previousLaunchInProgress, int previousCount) {
        int safePreviousCount = Math.max(0, previousCount);
        return previousLaunchInProgress ? incrementWithoutOverflow(safePreviousCount) : safePreviousCount;
    }

    public static int recordFailureCount(boolean failureAlreadyRecorded, int previousCount) {
        int safePreviousCount = Math.max(0, previousCount);
        return failureAlreadyRecorded ? safePreviousCount : incrementWithoutOverflow(safePreviousCount);
    }

    public static boolean shouldUseSafeMode(int failureCount) {
        return failureCount >= SAFE_MODE_FAILURE_THRESHOLD;
    }

    public static int successfulStartupFailureCount() {
        return 0;
    }

    private static int incrementWithoutOverflow(int value) {
        return value == Integer.MAX_VALUE ? Integer.MAX_VALUE : value + 1;
    }
}
