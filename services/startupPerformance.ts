export const STARTUP_PERFORMANCE_SCHEMA_VERSION = 1;
export const SLOW_FRAME_THRESHOLD_MS = 34;
export const PLAY_SLOW_FRAME_THRESHOLD_MS = 50;
export const SEVERE_FRAME_THRESHOLD_MS = 100;

export type StartupRuntimeHints = {
  logicalProcessors?: number;
  deviceMemoryGb?: number;
  jsHeapUsedBytes?: number;
  jsHeapTotalBytes?: number;
  jsHeapLimitBytes?: number;
};

export type StartupPerformanceSummaryInput = {
  startupStartedAtMs: number;
  samplingStartedAtMs: number;
  completedAtMs: number;
  frameTimestampsMs: number[];
  longTaskDurationsMs: number[];
  visibilityInterrupted?: boolean;
  runtimeHints?: StartupRuntimeHints;
};

export type StartupPerformanceSummary = {
  schemaVersion: number;
  startupDurationMs: number;
  sampledDurationMs: number;
  frameSampleCount: number;
  frameP50Ms: number;
  frameP95Ms: number;
  longestFrameMs: number;
  slowFrameCount: number;
  playSlowFrameCount: number;
  severeFrameCount: number;
  slowFrameRatio: number;
  playSlowFrameRatio: number;
  longTaskCount: number;
  longTaskTotalMs: number;
  longestLongTaskMs: number;
  visibilityInterrupted: boolean;
  logicalProcessors?: number;
  deviceMemoryGb?: number;
  jsHeapUsedMb?: number;
  jsHeapTotalMb?: number;
  jsHeapLimitMb?: number;
};

type LongTaskObserverHandle = {
  disconnect: () => void;
};

export type StartupPerformanceEnvironment = {
  startupStartedAtMs: number;
  now: () => number;
  requestFrame: (callback: (timestampMs: number) => void) => number;
  cancelFrame: (frameId: number) => void;
  observeLongTasks?: (callback: (durationMs: number) => void) => LongTaskObserverHandle | undefined;
  observeVisibilityInterruption?: (callback: () => void) => LongTaskObserverHandle | undefined;
  readRuntimeHints?: () => StartupRuntimeHints;
};

export type StartupPerformanceMeasurement = {
  complete: () => StartupPerformanceSummary;
  cancel: () => void;
};

const toFiniteNonNegative = (value: number): number | undefined =>
  Number.isFinite(value) && value >= 0 ? value : undefined;

const roundMetric = (value: number) => Math.round(value);

const roundRatio = (value: number) => Math.round(value * 10_000) / 10_000;

const bytesToMb = (value?: number) => {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  return roundMetric(value / (1024 * 1024));
};

const percentileNearestRank = (values: number[], percentile: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(percentile * sorted.length) - 1);
  return sorted[Math.min(index, sorted.length - 1)];
};

const getFrameDurations = (timestamps: number[]) => {
  const validTimestamps = timestamps.filter((timestamp) => Number.isFinite(timestamp));
  return validTimestamps
    .slice(1)
    .map((timestamp, index) => timestamp - validTimestamps[index])
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
};

export const createStartupPerformanceSummary = (
  input: StartupPerformanceSummaryInput
): StartupPerformanceSummary => {
  const frameDurations = getFrameDurations(input.frameTimestampsMs);
  const longTaskDurations = input.longTaskDurationsMs
    .map(toFiniteNonNegative)
    .filter((duration): duration is number => duration !== undefined);
  const slowFrameCount = frameDurations.filter((duration) => duration > SLOW_FRAME_THRESHOLD_MS).length;
  const playSlowFrameCount = frameDurations.filter(
    (duration) => duration > PLAY_SLOW_FRAME_THRESHOLD_MS
  ).length;
  const severeFrameCount = frameDurations.filter((duration) => duration > SEVERE_FRAME_THRESHOLD_MS).length;
  const hints = input.runtimeHints || {};

  return {
    schemaVersion: STARTUP_PERFORMANCE_SCHEMA_VERSION,
    startupDurationMs: roundMetric(Math.max(0, input.completedAtMs - input.startupStartedAtMs)),
    sampledDurationMs: roundMetric(Math.max(0, input.completedAtMs - input.samplingStartedAtMs)),
    frameSampleCount: frameDurations.length,
    frameP50Ms: roundMetric(percentileNearestRank(frameDurations, 0.5)),
    frameP95Ms: roundMetric(percentileNearestRank(frameDurations, 0.95)),
    longestFrameMs: roundMetric(frameDurations.length ? Math.max(...frameDurations) : 0),
    slowFrameCount,
    playSlowFrameCount,
    severeFrameCount,
    slowFrameRatio: frameDurations.length ? roundRatio(slowFrameCount / frameDurations.length) : 0,
    playSlowFrameRatio: frameDurations.length ? roundRatio(playSlowFrameCount / frameDurations.length) : 0,
    longTaskCount: longTaskDurations.length,
    longTaskTotalMs: roundMetric(longTaskDurations.reduce((total, duration) => total + duration, 0)),
    longestLongTaskMs: roundMetric(longTaskDurations.length ? Math.max(...longTaskDurations) : 0),
    visibilityInterrupted: input.visibilityInterrupted === true,
    ...(Number.isFinite(hints.logicalProcessors) && (hints.logicalProcessors || 0) > 0
      ? { logicalProcessors: Math.floor(hints.logicalProcessors as number) }
      : {}),
    ...(Number.isFinite(hints.deviceMemoryGb) && (hints.deviceMemoryGb || 0) > 0
      ? { deviceMemoryGb: hints.deviceMemoryGb }
      : {}),
    ...(bytesToMb(hints.jsHeapUsedBytes) !== undefined ? { jsHeapUsedMb: bytesToMb(hints.jsHeapUsedBytes) } : {}),
    ...(bytesToMb(hints.jsHeapTotalBytes) !== undefined ? { jsHeapTotalMb: bytesToMb(hints.jsHeapTotalBytes) } : {}),
    ...(bytesToMb(hints.jsHeapLimitBytes) !== undefined ? { jsHeapLimitMb: bytesToMb(hints.jsHeapLimitBytes) } : {}),
  };
};

const createBrowserPerformanceEnvironment = (): StartupPerformanceEnvironment => {
  const browserPerformance = performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  };
  const browserNavigator = navigator as Navigator & { deviceMemory?: number };

  return {
    startupStartedAtMs: 0,
    now: () => browserPerformance.now(),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
    observeLongTasks: (callback) => {
      if (typeof PerformanceObserver === 'undefined') return undefined;
      if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) return undefined;
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => callback(entry.duration));
      });
      observer.observe({ entryTypes: ['longtask'] });
      return observer;
    },
    observeVisibilityInterruption: (callback) => {
      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible') callback();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return {
        disconnect: () => document.removeEventListener('visibilitychange', handleVisibilityChange),
      };
    },
    readRuntimeHints: () => ({
      logicalProcessors: browserNavigator.hardwareConcurrency,
      deviceMemoryGb: browserNavigator.deviceMemory,
      jsHeapUsedBytes: browserPerformance.memory?.usedJSHeapSize,
      jsHeapTotalBytes: browserPerformance.memory?.totalJSHeapSize,
      jsHeapLimitBytes: browserPerformance.memory?.jsHeapSizeLimit,
    }),
  };
};

export const startStartupPerformanceMeasurement = (
  environment?: StartupPerformanceEnvironment
): StartupPerformanceMeasurement => {
  const activeEnvironment = environment || createBrowserPerformanceEnvironment();
  const samplingStartedAtMs = activeEnvironment.now();
  const frameTimestampsMs: number[] = [];
  const longTaskDurationsMs: number[] = [];
  let isActive = true;
  let frameId: number | null = null;
  let completedSummary: StartupPerformanceSummary | null = null;
  let visibilityInterrupted = false;

  const sampleFrame = (timestampMs: number) => {
    if (!isActive) return;
    frameTimestampsMs.push(timestampMs);
    frameId = activeEnvironment.requestFrame(sampleFrame);
  };

  frameId = activeEnvironment.requestFrame(sampleFrame);
  const longTaskObserver = activeEnvironment.observeLongTasks?.((durationMs) => {
    if (isActive) longTaskDurationsMs.push(durationMs);
  });
  const visibilityObserver = activeEnvironment.observeVisibilityInterruption?.(() => {
    if (isActive) visibilityInterrupted = true;
  });

  const stopSampling = () => {
    if (!isActive) return;
    isActive = false;
    if (frameId !== null) activeEnvironment.cancelFrame(frameId);
    longTaskObserver?.disconnect();
    visibilityObserver?.disconnect();
  };

  return {
    complete: () => {
      if (completedSummary) return completedSummary;
      const completedAtMs = activeEnvironment.now();
      stopSampling();
      completedSummary = createStartupPerformanceSummary({
        startupStartedAtMs: activeEnvironment.startupStartedAtMs,
        samplingStartedAtMs,
        completedAtMs,
        frameTimestampsMs,
        longTaskDurationsMs,
        visibilityInterrupted,
        runtimeHints: activeEnvironment.readRuntimeHints?.(),
      });
      return completedSummary;
    },
    cancel: stopSampling,
  };
};

export const toStartupPerformanceTelemetry = (
  summary: StartupPerformanceSummary
): Record<string, number> => ({
  schema_version: summary.schemaVersion,
  startup_ms: summary.startupDurationMs,
  sampled_ms: summary.sampledDurationMs,
  frame_samples: summary.frameSampleCount,
  frame_p95_ms: summary.frameP95Ms,
  severe_frames: summary.severeFrameCount,
  slow_frame_ratio_pct: Math.round(summary.slowFrameRatio * 10_000) / 100,
  long_tasks: summary.longTaskCount,
  long_task_total_ms: summary.longTaskTotalMs,
  visibility_interrupted: summary.visibilityInterrupted ? 1 : 0,
  ...(summary.jsHeapUsedMb !== undefined ? { heap_used_mb: summary.jsHeapUsedMb } : {}),
});
