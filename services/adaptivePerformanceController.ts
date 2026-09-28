import type { AndroidStartupCalibration } from './startupCalibration';
import type { PerformancePreference } from './performancePreferences';

export const ADAPTIVE_PERFORMANCE_SCHEMA_VERSION = 1;
export const UNHEALTHY_WINDOWS_TO_STEP_DOWN = 3;
export const HEALTHY_WINDOWS_TO_STEP_UP = 6;
export const ORDINARY_CHANGE_COOLDOWN_MS = 120_000;

export type AdaptivePerformancePlatform = 'ANDROID' | 'IOS' | 'WEB';
export type RuntimePerformanceLevel = 'FULL' | 'BALANCED' | 'OPTIMIZED';
export type RuntimeHealth = 'HEALTHY' | 'UNHEALTHY' | 'IGNORED';
export type AdaptiveTransitionReason = 'STARTUP' | 'RUNTIME_PRESSURE' | 'RUNTIME_RECOVERY' | 'MEMORY_PRESSURE' | 'PLAYER_OVERRIDE';

export type AdaptivePerformanceState = {
  schemaVersion: number;
  platform: AdaptivePerformancePlatform;
  preference: PerformancePreference;
  automaticApplicationEnabled: boolean;
  shadowMode: boolean;
  recommendedLevel: RuntimePerformanceLevel;
  appliedLevel: RuntimePerformanceLevel;
  consecutiveHealthyWindows: number;
  consecutiveUnhealthyWindows: number;
  lastAppliedChangeAtMs: number | null;
  pendingLevel: RuntimePerformanceLevel | null;
  pendingReason: AdaptiveTransitionReason | null;
};

export type AdaptivePerformanceDecision = {
  type: 'RECOMMENDED' | 'APPLIED' | 'DEFERRED' | 'IGNORED';
  from: RuntimePerformanceLevel;
  to: RuntimePerformanceLevel;
  reason: AdaptiveTransitionReason;
  shadowMode: boolean;
};

export type AdaptivePerformanceAdvanceResult = {
  state: AdaptivePerformanceState;
  decisions: AdaptivePerformanceDecision[];
};

export type AdaptivePerformanceInput =
  | { kind: 'HEALTH_WINDOW'; health: RuntimeHealth; nowMs: number; safeBoundary: boolean }
  | { kind: 'MEMORY_PRESSURE'; nowMs: number; safeBoundary: boolean }
  | { kind: 'SAFE_BOUNDARY'; nowMs: number }
  | { kind: 'PREFERENCE_CHANGED'; preference: PerformancePreference; nowMs: number };

const stepDown = (level: RuntimePerformanceLevel): RuntimePerformanceLevel => (
  level === 'FULL' ? 'BALANCED' : 'OPTIMIZED'
);

const stepUp = (level: RuntimePerformanceLevel): RuntimePerformanceLevel => (
  level === 'OPTIMIZED' ? 'BALANCED' : 'FULL'
);

const levelForPreference = (preference: PerformancePreference): RuntimePerformanceLevel => (
  preference === 'PERFORMANCE' ? 'OPTIMIZED' : 'FULL'
);

const startupLevel = (
  platform: AdaptivePerformancePlatform,
  preference: PerformancePreference,
  calibration: Pick<AndroidStartupCalibration, 'recommendation' | 'confidence'> | null,
): RuntimePerformanceLevel => {
  if (preference !== 'AUTOMATIC') return levelForPreference(preference);
  if (platform !== 'ANDROID') return 'FULL';
  return calibration?.recommendation === 'CONSIDER_OPTIMIZED' && calibration.confidence === 'HIGH'
    ? 'BALANCED'
    : 'FULL';
};

export const createAdaptivePerformanceState = (input: {
  preference: PerformancePreference;
  platform: AdaptivePerformancePlatform;
  startupCalibration: Pick<AndroidStartupCalibration, 'recommendation' | 'confidence'> | null;
  automaticApplicationEnabled: boolean;
  nowMs: number;
}): AdaptivePerformanceState => {
  const recommendedLevel = startupLevel(input.platform, input.preference, input.startupCalibration);
  const shadowMode = input.preference === 'AUTOMATIC'
    && input.platform === 'ANDROID'
    && !input.automaticApplicationEnabled;
  const appliedLevel = shadowMode ? 'FULL' : recommendedLevel;

  return {
    schemaVersion: ADAPTIVE_PERFORMANCE_SCHEMA_VERSION,
    platform: input.platform,
    preference: input.preference,
    automaticApplicationEnabled: input.automaticApplicationEnabled,
    shadowMode,
    recommendedLevel,
    appliedLevel,
    consecutiveHealthyWindows: 0,
    consecutiveUnhealthyWindows: 0,
    lastAppliedChangeAtMs: appliedLevel === 'FULL' ? null : input.nowMs,
    pendingLevel: null,
    pendingReason: null,
  };
};

const cooldownComplete = (state: AdaptivePerformanceState, nowMs: number) => (
  state.lastAppliedChangeAtMs === null
  || nowMs - state.lastAppliedChangeAtMs >= ORDINARY_CHANGE_COOLDOWN_MS
);

const requestAutomaticLevel = (
  state: AdaptivePerformanceState,
  target: RuntimePerformanceLevel,
  reason: AdaptiveTransitionReason,
  nowMs: number,
  safeBoundary: boolean,
): AdaptivePerformanceAdvanceResult => {
  if (target === state.recommendedLevel && target === state.appliedLevel) {
    return { state, decisions: [] };
  }

  const recommendedState: AdaptivePerformanceState = {
    ...state,
    recommendedLevel: target,
  };
  const recommendedDecision: AdaptivePerformanceDecision = {
    type: 'RECOMMENDED',
    from: state.recommendedLevel,
    to: target,
    reason,
    shadowMode: state.shadowMode,
  };

  if (state.shadowMode) {
    return {
      state: { ...recommendedState, pendingLevel: null, pendingReason: null },
      decisions: [recommendedDecision],
    };
  }

  const emergency = reason === 'MEMORY_PRESSURE';
  if (safeBoundary && (emergency || cooldownComplete(state, nowMs))) {
    return {
      state: {
        ...recommendedState,
        appliedLevel: target,
        lastAppliedChangeAtMs: nowMs,
        pendingLevel: null,
        pendingReason: null,
      },
      decisions: [recommendedDecision, {
        type: 'APPLIED',
        from: state.appliedLevel,
        to: target,
        reason,
        shadowMode: false,
      }],
    };
  }

  return {
    state: {
      ...recommendedState,
      pendingLevel: target,
      pendingReason: reason,
    },
    decisions: [recommendedDecision, {
      type: 'DEFERRED',
      from: state.appliedLevel,
      to: target,
      reason,
      shadowMode: false,
    }],
  };
};

export const advanceAdaptivePerformance = (
  state: AdaptivePerformanceState,
  input: AdaptivePerformanceInput,
): AdaptivePerformanceAdvanceResult => {
  if (input.kind === 'PREFERENCE_CHANGED') {
    if (input.preference === state.preference) return { state, decisions: [] };
    const target = levelForPreference(input.preference);
    const shadowMode = input.preference === 'AUTOMATIC'
      && state.platform === 'ANDROID'
      && !state.automaticApplicationEnabled;
    const nextState: AdaptivePerformanceState = {
      ...state,
      preference: input.preference,
      shadowMode,
      recommendedLevel: target,
      appliedLevel: target,
      consecutiveHealthyWindows: 0,
      consecutiveUnhealthyWindows: 0,
      lastAppliedChangeAtMs: input.nowMs,
      pendingLevel: null,
      pendingReason: null,
    };
    return {
      state: nextState,
      decisions: [{
        type: 'APPLIED',
        from: state.appliedLevel,
        to: target,
        reason: 'PLAYER_OVERRIDE',
        shadowMode,
      }],
    };
  }

  if (input.kind === 'SAFE_BOUNDARY') {
    if (!state.pendingLevel || !state.pendingReason || state.shadowMode) {
      return { state, decisions: [] };
    }
    const emergency = state.pendingReason === 'MEMORY_PRESSURE';
    if (!emergency && !cooldownComplete(state, input.nowMs)) {
      return { state, decisions: [] };
    }
    return {
      state: {
        ...state,
        appliedLevel: state.pendingLevel,
        lastAppliedChangeAtMs: input.nowMs,
        pendingLevel: null,
        pendingReason: null,
      },
      decisions: [{
        type: 'APPLIED',
        from: state.appliedLevel,
        to: state.pendingLevel,
        reason: state.pendingReason,
        shadowMode: false,
      }],
    };
  }

  if (state.preference !== 'AUTOMATIC' || state.platform === 'WEB') {
    return { state, decisions: [] };
  }

  if (input.kind === 'MEMORY_PRESSURE') {
    return requestAutomaticLevel(
      { ...state, consecutiveHealthyWindows: 0, consecutiveUnhealthyWindows: 0 },
      'OPTIMIZED',
      'MEMORY_PRESSURE',
      input.nowMs,
      input.safeBoundary,
    );
  }

  if (input.health === 'IGNORED') return { state, decisions: [] };
  // Never stack ordinary level changes while a previous visible transition is
  // waiting for its safe boundary/cooldown. This guarantees one-step changes.
  if (state.pendingLevel) return { state, decisions: [] };

  if (input.health === 'UNHEALTHY') {
    const consecutiveUnhealthyWindows = state.consecutiveUnhealthyWindows + 1;
    const counted = {
      ...state,
      consecutiveHealthyWindows: 0,
      consecutiveUnhealthyWindows,
    };
    if (consecutiveUnhealthyWindows < UNHEALTHY_WINDOWS_TO_STEP_DOWN) {
      return { state: counted, decisions: [] };
    }
    return requestAutomaticLevel(
      { ...counted, consecutiveUnhealthyWindows: 0 },
      stepDown(state.recommendedLevel),
      'RUNTIME_PRESSURE',
      input.nowMs,
      input.safeBoundary,
    );
  }

  const consecutiveHealthyWindows = state.consecutiveHealthyWindows + 1;
  const counted = {
    ...state,
    consecutiveHealthyWindows,
    consecutiveUnhealthyWindows: 0,
  };
  if (consecutiveHealthyWindows < HEALTHY_WINDOWS_TO_STEP_UP || state.recommendedLevel === 'FULL') {
    return { state: counted, decisions: [] };
  }
  return requestAutomaticLevel(
    { ...counted, consecutiveHealthyWindows: 0 },
    stepUp(state.recommendedLevel),
    'RUNTIME_RECOVERY',
    input.nowMs,
    input.safeBoundary,
  );
};
