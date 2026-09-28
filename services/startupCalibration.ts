import type {
  AndroidDeviceCapabilityReadResult,
  AndroidDeviceCapabilitySnapshot,
} from './nativeDeviceCapabilities';
import type { StartupPerformanceSummary } from './startupPerformance';

export const STARTUP_CALIBRATION_SCHEMA_VERSION = 1;
export const MIN_STARTUP_FRAME_SAMPLES = 120;
export const PLAY_SLOW_FRAME_RATIO_THRESHOLD = 0.25;
export const MAIN_THREAD_BLOCKED_RATIO_THRESHOLD = 0.2;
export const SEVERE_LONG_TASK_THRESHOLD_MS = 250;
export const THERMAL_PRESSURE_STATUS = 3;
export const THERMAL_PRESSURE_HEADROOM = 1;

export type StartupQualityRecommendation =
  | 'KEEP_FULL_QUALITY'
  | 'CONSIDER_OPTIMIZED'
  | 'OBSERVE_MORE';

export type StartupCalibrationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type StartupCalibrationReason =
  | 'STABLE_STARTUP'
  | 'STABLE_DESPITE_DEVICE_CONSTRAINT'
  | 'VISIBILITY_INTERRUPTED'
  | 'INSUFFICIENT_FRAME_SAMPLES'
  | 'NATIVE_CAPABILITY_UNAVAILABLE'
  | 'RUNTIME_PRESSURE_WITHOUT_NATIVE_CONSTRAINT'
  | 'LOW_RAM_WITH_RUNTIME_PRESSURE'
  | 'MEMORY_WITH_RUNTIME_PRESSURE'
  | 'THERMAL_WITH_RUNTIME_PRESSURE';

export type StartupCalibrationEvidence =
  | 'FRAME_PRESSURE'
  | 'MAIN_THREAD_PRESSURE'
  | 'LOW_RAM'
  | 'MEMORY_PRESSURE'
  | 'THERMAL_PRESSURE';

export type AndroidStartupCalibration = {
  schemaVersion: number;
  recommendation: StartupQualityRecommendation;
  confidence: StartupCalibrationConfidence;
  primaryReason: StartupCalibrationReason;
  evidence: StartupCalibrationEvidence[];
  nativeAvailable: boolean;
  frameSampleCount: number;
  frameP95Ms: number;
  playSlowFrameRatio: number;
  longTaskBlockedRatio: number;
  visibilityInterrupted: boolean;
};

export type StartupCalibrationCoordinator = {
  submitDeviceCapabilities: (result: AndroidDeviceCapabilityReadResult) => void;
  submitPerformance: (summary: StartupPerformanceSummary) => void;
  cancel: () => void;
};

const roundRatio = (value: number) => Math.round(value * 10_000) / 10_000;

const getLongTaskBlockedRatio = (summary: StartupPerformanceSummary) => (
  summary.sampledDurationMs > 0
    ? roundRatio(Math.min(1, summary.longTaskTotalMs / summary.sampledDurationMs))
    : 0
);

const getRuntimeEvidence = (summary: StartupPerformanceSummary): StartupCalibrationEvidence[] => {
  const evidence: StartupCalibrationEvidence[] = [];
  if (summary.playSlowFrameRatio > PLAY_SLOW_FRAME_RATIO_THRESHOLD) {
    evidence.push('FRAME_PRESSURE');
  }
  if (
    getLongTaskBlockedRatio(summary) > MAIN_THREAD_BLOCKED_RATIO_THRESHOLD
    || summary.longestLongTaskMs >= SEVERE_LONG_TASK_THRESHOLD_MS
  ) {
    evidence.push('MAIN_THREAD_PRESSURE');
  }
  return evidence;
};

const getNativeEvidence = (snapshot: AndroidDeviceCapabilitySnapshot): StartupCalibrationEvidence[] => {
  const evidence: StartupCalibrationEvidence[] = [];
  if (snapshot.isLowRamDevice) evidence.push('LOW_RAM');
  if (snapshot.lowMemory) evidence.push('MEMORY_PRESSURE');
  if (
    (snapshot.thermalStatus !== undefined && snapshot.thermalStatus >= THERMAL_PRESSURE_STATUS)
    || (snapshot.thermalHeadroom !== undefined && snapshot.thermalHeadroom >= THERMAL_PRESSURE_HEADROOM)
  ) {
    evidence.push('THERMAL_PRESSURE');
  }
  return evidence;
};

const buildResult = (
  summary: StartupPerformanceSummary,
  values: Pick<
    AndroidStartupCalibration,
    'recommendation' | 'confidence' | 'primaryReason' | 'evidence' | 'nativeAvailable'
  >
): AndroidStartupCalibration => ({
  schemaVersion: STARTUP_CALIBRATION_SCHEMA_VERSION,
  ...values,
  frameSampleCount: summary.frameSampleCount,
  frameP95Ms: summary.frameP95Ms,
  playSlowFrameRatio: summary.playSlowFrameRatio,
  longTaskBlockedRatio: getLongTaskBlockedRatio(summary),
  visibilityInterrupted: summary.visibilityInterrupted,
});

export const createAndroidStartupCalibration = (
  capabilityResult: AndroidDeviceCapabilityReadResult,
  summary: StartupPerformanceSummary
): AndroidStartupCalibration => {
  const runtimeEvidence = getRuntimeEvidence(summary);

  if (summary.visibilityInterrupted) {
    return buildResult(summary, {
      recommendation: 'OBSERVE_MORE',
      confidence: 'LOW',
      primaryReason: 'VISIBILITY_INTERRUPTED',
      evidence: runtimeEvidence,
      nativeAvailable: capabilityResult.status === 'AVAILABLE',
    });
  }

  if (summary.frameSampleCount < MIN_STARTUP_FRAME_SAMPLES) {
    return buildResult(summary, {
      recommendation: 'OBSERVE_MORE',
      confidence: 'LOW',
      primaryReason: 'INSUFFICIENT_FRAME_SAMPLES',
      evidence: runtimeEvidence,
      nativeAvailable: capabilityResult.status === 'AVAILABLE',
    });
  }

  if (capabilityResult.status !== 'AVAILABLE') {
    return buildResult(summary, {
      recommendation: 'OBSERVE_MORE',
      confidence: 'LOW',
      primaryReason: 'NATIVE_CAPABILITY_UNAVAILABLE',
      evidence: runtimeEvidence,
      nativeAvailable: false,
    });
  }

  const nativeEvidence = getNativeEvidence(capabilityResult.snapshot);
  const evidence = [...runtimeEvidence, ...nativeEvidence];
  const hasRuntimePressure = runtimeEvidence.length > 0;
  const hasNativePressure = nativeEvidence.length > 0;

  if (hasRuntimePressure && hasNativePressure) {
    const primaryReason: StartupCalibrationReason = nativeEvidence.includes('THERMAL_PRESSURE')
      ? 'THERMAL_WITH_RUNTIME_PRESSURE'
      : nativeEvidence.includes('MEMORY_PRESSURE')
        ? 'MEMORY_WITH_RUNTIME_PRESSURE'
        : 'LOW_RAM_WITH_RUNTIME_PRESSURE';
    return buildResult(summary, {
      recommendation: 'CONSIDER_OPTIMIZED',
      confidence: 'HIGH',
      primaryReason,
      evidence,
      nativeAvailable: true,
    });
  }

  if (hasRuntimePressure) {
    return buildResult(summary, {
      recommendation: 'OBSERVE_MORE',
      confidence: 'MEDIUM',
      primaryReason: 'RUNTIME_PRESSURE_WITHOUT_NATIVE_CONSTRAINT',
      evidence,
      nativeAvailable: true,
    });
  }

  if (hasNativePressure) {
    return buildResult(summary, {
      recommendation: 'KEEP_FULL_QUALITY',
      confidence: 'MEDIUM',
      primaryReason: 'STABLE_DESPITE_DEVICE_CONSTRAINT',
      evidence,
      nativeAvailable: true,
    });
  }

  return buildResult(summary, {
    recommendation: 'KEEP_FULL_QUALITY',
    confidence: 'HIGH',
    primaryReason: 'STABLE_STARTUP',
    evidence,
    nativeAvailable: true,
  });
};

export const toStartupCalibrationTelemetry = (
  result: AndroidStartupCalibration
): Record<string, string | number | boolean> => ({
  schema_version: result.schemaVersion,
  recommendation: result.recommendation,
  confidence: result.confidence,
  primary_reason: result.primaryReason,
  evidence: result.evidence.join('|'),
  native_available: result.nativeAvailable,
  frame_samples: result.frameSampleCount,
  frame_p95_ms: result.frameP95Ms,
  slow_50_ratio_pct: Math.round(result.playSlowFrameRatio * 10_000) / 100,
  long_task_ratio_pct: Math.round(result.longTaskBlockedRatio * 10_000) / 100,
  visibility_interrupted: result.visibilityInterrupted,
});

export const createStartupCalibrationCoordinator = (
  onComplete: (result: AndroidStartupCalibration) => void
): StartupCalibrationCoordinator => {
  let capabilityResult: AndroidDeviceCapabilityReadResult | null = null;
  let performanceSummary: StartupPerformanceSummary | null = null;
  let completed = false;
  let cancelled = false;
  let excludedNonAndroid = false;

  const completeIfReady = () => {
    if (
      completed
      || cancelled
      || excludedNonAndroid
      || !capabilityResult
      || !performanceSummary
    ) return;
    completed = true;
    onComplete(createAndroidStartupCalibration(capabilityResult, performanceSummary));
  };

  return {
    submitDeviceCapabilities: (result) => {
      if (completed || cancelled) return;
      if (result.status === 'UNAVAILABLE' && result.reason === 'NOT_ANDROID') {
        excludedNonAndroid = true;
        return;
      }
      capabilityResult = result;
      completeIfReady();
    },
    submitPerformance: (summary) => {
      if (completed || cancelled || excludedNonAndroid) return;
      performanceSummary = summary;
      completeIfReady();
    },
    cancel: () => {
      cancelled = true;
    },
  };
};
