import type {
  AdaptivePerformanceDecision,
  AdaptivePerformancePlatform,
  RuntimePerformanceLevel,
} from './adaptivePerformanceController';
import type { AndroidDeviceCapabilitySnapshot } from './nativeDeviceCapabilities';
import type { PerformancePreference } from './performancePreferences';
import type { RuntimePerformanceWindow } from './runtimePerformanceMonitor';

export const DEVICE_VALIDATION_SCHEMA_VERSION = 1;
export const DEVICE_VALIDATION_CHECKPOINT_MINUTES = [30, 60] as const;

export type DeviceValidationStatus = 'HEALTHY' | 'PRESSURE_OBSERVED';

export type DeviceValidationSession = {
  schemaVersion: number;
  platform: AdaptivePerformancePlatform;
  preference: PerformancePreference;
  initialAppliedLevel: RuntimePerformanceLevel;
  currentAppliedLevel: RuntimePerformanceLevel;
  startedAtMs: number;
  lastClockAtMs: number;
  activeDurationMs: number;
  active: boolean;
  healthyWindowCount: number;
  unhealthyWindowCount: number;
  ignoredWindowCount: number;
  maximumFrameP95Ms: number;
  maximumSlowFrameRatio: number;
  maximumLongTaskBlockedRatio: number;
  nativeSampleCount: number;
  minimumAvailableMemoryRatio: number | null;
  maximumThermalStatus: number | null;
  lowMemoryObservationCount: number;
  profileChangeCount: number;
  emittedCheckpointMinutes: number[];
};

export type DeviceValidationSummary = {
  schemaVersion: number;
  platform: AdaptivePerformancePlatform;
  preference: PerformancePreference;
  checkpointMinutes: number;
  activeDurationMinutes: number;
  status: DeviceValidationStatus;
  initialAppliedLevel: RuntimePerformanceLevel;
  currentAppliedLevel: RuntimePerformanceLevel;
  fullQualityMaintained: boolean;
  profileChangeCount: number;
  healthyWindowCount: number;
  unhealthyWindowCount: number;
  ignoredWindowCount: number;
  maximumFrameP95Ms: number;
  maximumSlowFrameRatio: number;
  maximumLongTaskBlockedRatio: number;
  minimumAvailableMemoryPercent: number | null;
  maximumThermalStatus: number | null;
  lowMemoryObservationCount: number;
};

const safeNow = (value: number, fallback = 0): number => (
  Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback
);

const advanceClock = (state: DeviceValidationSession, nowMs: number): DeviceValidationSession => {
  const now = Math.max(state.lastClockAtMs, safeNow(nowMs, state.lastClockAtMs));
  const elapsed = state.active ? now - state.lastClockAtMs : 0;
  return {
    ...state,
    lastClockAtMs: now,
    activeDurationMs: state.activeDurationMs + elapsed,
  };
};

export const createDeviceValidationSession = (input: {
  platform: AdaptivePerformancePlatform;
  preference: PerformancePreference;
  initialAppliedLevel: RuntimePerformanceLevel;
  nowMs: number;
}): DeviceValidationSession => {
  const now = safeNow(input.nowMs);
  return {
    schemaVersion: DEVICE_VALIDATION_SCHEMA_VERSION,
    platform: input.platform,
    preference: input.preference,
    initialAppliedLevel: input.initialAppliedLevel,
    currentAppliedLevel: input.initialAppliedLevel,
    startedAtMs: now,
    lastClockAtMs: now,
    activeDurationMs: 0,
    active: true,
    healthyWindowCount: 0,
    unhealthyWindowCount: 0,
    ignoredWindowCount: 0,
    maximumFrameP95Ms: 0,
    maximumSlowFrameRatio: 0,
    maximumLongTaskBlockedRatio: 0,
    nativeSampleCount: 0,
    minimumAvailableMemoryRatio: null,
    maximumThermalStatus: null,
    lowMemoryObservationCount: 0,
    profileChangeCount: 0,
    emittedCheckpointMinutes: [],
  };
};

export const setDeviceValidationSessionActive = (
  state: DeviceValidationSession,
  active: boolean,
  nowMs: number,
): DeviceValidationSession => ({
  ...advanceClock(state, nowMs),
  active,
});

export const recordDeviceValidationHealthWindow = (
  state: DeviceValidationSession,
  window: RuntimePerformanceWindow,
  nowMs: number,
): DeviceValidationSession => {
  const advanced = advanceClock(state, nowMs);
  return {
    ...advanced,
    healthyWindowCount: advanced.healthyWindowCount + Number(window.health === 'HEALTHY'),
    unhealthyWindowCount: advanced.unhealthyWindowCount + Number(window.health === 'UNHEALTHY'),
    ignoredWindowCount: advanced.ignoredWindowCount + Number(window.health === 'IGNORED'),
    maximumFrameP95Ms: Math.max(advanced.maximumFrameP95Ms, window.frameP95Ms),
    maximumSlowFrameRatio: Math.max(advanced.maximumSlowFrameRatio, window.slowFrameRatio),
    maximumLongTaskBlockedRatio: Math.max(
      advanced.maximumLongTaskBlockedRatio,
      window.longTaskBlockedRatio,
    ),
  };
};

export const recordDeviceValidationNativeSnapshot = (
  state: DeviceValidationSession,
  snapshot: AndroidDeviceCapabilitySnapshot,
  nowMs: number,
): DeviceValidationSession => {
  const advanced = advanceClock(state, nowMs);
  return {
    ...advanced,
    nativeSampleCount: advanced.nativeSampleCount + 1,
    minimumAvailableMemoryRatio: advanced.minimumAvailableMemoryRatio === null
      ? snapshot.availableMemoryRatio
      : Math.min(advanced.minimumAvailableMemoryRatio, snapshot.availableMemoryRatio),
    maximumThermalStatus: snapshot.thermalStatus === undefined
      ? advanced.maximumThermalStatus
      : Math.max(advanced.maximumThermalStatus ?? 0, snapshot.thermalStatus),
    lowMemoryObservationCount: advanced.lowMemoryObservationCount + Number(snapshot.lowMemory),
  };
};

export const recordDeviceValidationDecision = (
  state: DeviceValidationSession,
  decision: AdaptivePerformanceDecision,
  nowMs: number,
): DeviceValidationSession => {
  const advanced = advanceClock(state, nowMs);
  if (decision.type !== 'APPLIED' || decision.from === decision.to) return advanced;
  return {
    ...advanced,
    currentAppliedLevel: decision.to,
    profileChangeCount: advanced.profileChangeCount + 1,
  };
};

const summarize = (
  state: DeviceValidationSession,
  checkpointMinutes: number,
): DeviceValidationSummary => {
  const pressureObserved = state.unhealthyWindowCount > state.healthyWindowCount
    || state.maximumLongTaskBlockedRatio > 0.15
    || state.lowMemoryObservationCount > 0
    || (state.maximumThermalStatus ?? 0) >= 4;
  return {
    schemaVersion: state.schemaVersion,
    platform: state.platform,
    preference: state.preference,
    checkpointMinutes,
    activeDurationMinutes: Math.floor(state.activeDurationMs / 60_000),
    status: pressureObserved ? 'PRESSURE_OBSERVED' : 'HEALTHY',
    initialAppliedLevel: state.initialAppliedLevel,
    currentAppliedLevel: state.currentAppliedLevel,
    fullQualityMaintained: state.initialAppliedLevel === 'FULL'
      && state.currentAppliedLevel === 'FULL'
      && state.profileChangeCount === 0,
    profileChangeCount: state.profileChangeCount,
    healthyWindowCount: state.healthyWindowCount,
    unhealthyWindowCount: state.unhealthyWindowCount,
    ignoredWindowCount: state.ignoredWindowCount,
    maximumFrameP95Ms: Math.round(state.maximumFrameP95Ms * 10) / 10,
    maximumSlowFrameRatio: state.maximumSlowFrameRatio,
    maximumLongTaskBlockedRatio: state.maximumLongTaskBlockedRatio,
    minimumAvailableMemoryPercent: state.minimumAvailableMemoryRatio === null
      ? null
      : Math.round(state.minimumAvailableMemoryRatio * 100),
    maximumThermalStatus: state.maximumThermalStatus,
    lowMemoryObservationCount: state.lowMemoryObservationCount,
  };
};

export const collectDueDeviceValidationCheckpoints = (
  state: DeviceValidationSession,
  nowMs: number,
): { state: DeviceValidationSession; summaries: DeviceValidationSummary[] } => {
  const advanced = advanceClock(state, nowMs);
  const emitted = new Set(advanced.emittedCheckpointMinutes);
  const due = DEVICE_VALIDATION_CHECKPOINT_MINUTES.filter(minutes => (
    advanced.activeDurationMs >= minutes * 60_000 && !emitted.has(minutes)
  ));
  due.forEach(minutes => emitted.add(minutes));
  return {
    state: { ...advanced, emittedCheckpointMinutes: [...emitted].sort((left, right) => left - right) },
    summaries: due.map(minutes => summarize(advanced, minutes)),
  };
};

export const toDeviceValidationTelemetry = (
  summary: DeviceValidationSummary,
): Record<string, string | number | boolean> => ({
  platform: summary.platform.toLowerCase(),
  preference: summary.preference.toLowerCase(),
  checkpoint_minutes: summary.checkpointMinutes,
  active_minutes: summary.activeDurationMinutes,
  status: summary.status.toLowerCase(),
  initial_level: summary.initialAppliedLevel.toLowerCase(),
  current_level: summary.currentAppliedLevel.toLowerCase(),
  full_quality_maintained: summary.fullQualityMaintained,
  profile_changes: summary.profileChangeCount,
  healthy_windows: summary.healthyWindowCount,
  unhealthy_windows: summary.unhealthyWindowCount,
  ignored_windows: summary.ignoredWindowCount,
  frame_p95_max_ms: summary.maximumFrameP95Ms,
  slow_frame_ratio_max_pct: Math.round(summary.maximumSlowFrameRatio * 10_000) / 100,
  long_task_ratio_max_pct: Math.round(summary.maximumLongTaskBlockedRatio * 10_000) / 100,
  min_available_memory_pct: summary.minimumAvailableMemoryPercent ?? -1,
  max_thermal_status: summary.maximumThermalStatus ?? -1,
  low_memory_observations: summary.lowMemoryObservationCount,
});
