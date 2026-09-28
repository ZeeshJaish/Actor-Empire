package com.zeeshapps.actorempire;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class StartupRecoveryPolicyTest {
    @Test
    public void cleanLaunchDoesNotIncreaseFailureCount() {
        assertEquals(0, StartupRecoveryPolicy.beginLaunchFailureCount(false, 0));
        assertFalse(StartupRecoveryPolicy.shouldUseSafeMode(0));
    }

    @Test
    public void interruptedLaunchBecomesOneFailureAndSecondFailureEnablesSafeMode() {
        int afterInterruptedLaunch = StartupRecoveryPolicy.beginLaunchFailureCount(true, 0);
        assertEquals(1, afterInterruptedLaunch);
        assertFalse(StartupRecoveryPolicy.shouldUseSafeMode(afterInterruptedLaunch));

        int afterRepeatedFailure = StartupRecoveryPolicy.recordFailureCount(false, afterInterruptedLaunch);
        assertEquals(2, afterRepeatedFailure);
        assertTrue(StartupRecoveryPolicy.shouldUseSafeMode(afterRepeatedFailure));
    }

    @Test
    public void duplicateCallbacksDoNotCountTheSameAttemptTwice() {
        assertEquals(4, StartupRecoveryPolicy.recordFailureCount(true, 4));
    }

    @Test
    public void successfulFirstScreenClearsTheLoop() {
        assertEquals(0, StartupRecoveryPolicy.successfulStartupFailureCount());
        assertFalse(StartupRecoveryPolicy.shouldUseSafeMode(StartupRecoveryPolicy.successfulStartupFailureCount()));
    }

    @Test
    public void persistedFailureCounterCannotOverflowIntoAHealthyState() {
        assertEquals(
            Integer.MAX_VALUE,
            StartupRecoveryPolicy.beginLaunchFailureCount(true, Integer.MAX_VALUE)
        );
        assertEquals(
            Integer.MAX_VALUE,
            StartupRecoveryPolicy.recordFailureCount(false, Integer.MAX_VALUE)
        );
        assertTrue(StartupRecoveryPolicy.shouldUseSafeMode(Integer.MAX_VALUE));
    }
}
