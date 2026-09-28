import type { RuntimeHealth } from './adaptivePerformanceController';

export const RUNTIME_MONITOR_INITIAL_DELAY_MS = 30_000;
export const RUNTIME_MONITOR_INTERVAL_MS = 60_000;
export const RUNTIME_MONITOR_SAMPLE_MS = 8_000;
export const RUNTIME_MIN_FRAME_SAMPLES = 90;

export type RuntimePerformanceWindowInput = {
  eligible: boolean;
  frameDurationsMs: number[];
  longTaskDurationsMs: number[];
  sampledDurationMs: number;
};

export type RuntimePerformanceWindow = {
  health: RuntimeHealth;
  reason: 'INELIGIBLE' | 'INSUFFICIENT_FRAMES' | 'STABLE' | 'FRAME_PRESSURE' | 'MAIN_THREAD_PRESSURE';
  frameSampleCount: number;
  frameP95Ms: number;
  slowFrameRatio: number;
  longTaskBlockedRatio: number;
};

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
};

const round = (value: number) => Math.round(value * 10_000) / 10_000;

export const classifyRuntimePerformanceWindow = (
  input: RuntimePerformanceWindowInput,
): RuntimePerformanceWindow => {
  const frames = input.frameDurationsMs.filter(value => Number.isFinite(value) && value >= 0);
  const longTasks = input.longTaskDurationsMs.filter(value => Number.isFinite(value) && value >= 0);
  const frameP95Ms = Math.round(percentile(frames, 0.95) * 10) / 10;
  const slowFrameRatio = frames.length > 0
    ? round(frames.filter(value => value >= 50).length / frames.length)
    : 0;
  const sampledDurationMs = Math.max(1, input.sampledDurationMs);
  const longTaskBlockedRatio = round(Math.min(1, longTasks.reduce((sum, value) => sum + value, 0) / sampledDurationMs));
  const base = { frameSampleCount: frames.length, frameP95Ms, slowFrameRatio, longTaskBlockedRatio };

  if (!input.eligible) return { health: 'IGNORED', reason: 'INELIGIBLE', ...base };
  if (frames.length < RUNTIME_MIN_FRAME_SAMPLES) {
    return { health: 'IGNORED', reason: 'INSUFFICIENT_FRAMES', ...base };
  }
  if (longTaskBlockedRatio > 0.15 || longTasks.some(duration => duration >= 250)) {
    return { health: 'UNHEALTHY', reason: 'MAIN_THREAD_PRESSURE', ...base };
  }
  if (frameP95Ms >= 50 || slowFrameRatio > 0.2) {
    return { health: 'UNHEALTHY', reason: 'FRAME_PRESSURE', ...base };
  }
  return { health: 'HEALTHY', reason: 'STABLE', ...base };
};

export type RuntimePerformanceMonitor = { stop: () => void };

type LongTaskObserverHandle = { disconnect: () => void };

export type RuntimePerformanceMonitorDependencies = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
  setTimer: (callback: () => void, delayMs: number) => number;
  clearTimer: (id: number) => void;
  now: () => number;
  createLongTaskObserver: (onDuration: (durationMs: number) => void) => LongTaskObserverHandle | null;
};

const createDefaultDependencies = (): RuntimePerformanceMonitorDependencies | null => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return null;
  return {
    requestFrame: callback => window.requestAnimationFrame(callback),
    cancelFrame: id => window.cancelAnimationFrame(id),
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: id => window.clearTimeout(id),
    now: () => performance.now(),
    createLongTaskObserver: onDuration => {
      if (typeof PerformanceObserver === 'undefined') return null;
      try {
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => onDuration(entry.duration));
        });
        observer.observe({ entryTypes: ['longtask'] });
        return observer;
      } catch {
        return null;
      }
    },
  };
};

export const startRuntimePerformanceMonitor = (options: {
  isEligible: () => boolean;
  onWindow: (window: RuntimePerformanceWindow) => void;
  initialDelayMs?: number;
  intervalMs?: number;
  sampleDurationMs?: number;
  dependencies?: RuntimePerformanceMonitorDependencies;
}): RuntimePerformanceMonitor => {
  const dependencies = options.dependencies ?? createDefaultDependencies();
  if (!dependencies) return { stop: () => undefined };

  const initialDelayMs = options.initialDelayMs ?? RUNTIME_MONITOR_INITIAL_DELAY_MS;
  const intervalMs = options.intervalMs ?? RUNTIME_MONITOR_INTERVAL_MS;
  const sampleDurationMs = options.sampleDurationMs ?? RUNTIME_MONITOR_SAMPLE_MS;
  let stopped = false;
  let scheduleTimer: number | null = null;
  let sampleTimer: number | null = null;
  let frameId: number | null = null;
  let observer: LongTaskObserverHandle | null = null;

  const scheduleNext = (delayMs: number) => {
    if (stopped) return;
    scheduleTimer = dependencies.setTimer(runSample, delayMs);
  };

  const runSample = () => {
    if (stopped) return;
    const eligibleAtStart = options.isEligible();
    const frameDurationsMs: number[] = [];
    const longTaskDurationsMs: number[] = [];
    const startedAt = dependencies.now();
    let previousFrameAt: number | null = null;

    const onFrame = (timestamp: number) => {
      if (previousFrameAt !== null) frameDurationsMs.push(timestamp - previousFrameAt);
      previousFrameAt = timestamp;
      frameId = dependencies.requestFrame(onFrame);
    };
    frameId = dependencies.requestFrame(onFrame);

    observer = dependencies.createLongTaskObserver(duration => longTaskDurationsMs.push(duration));

    sampleTimer = dependencies.setTimer(() => {
      if (frameId !== null) dependencies.cancelFrame(frameId);
      frameId = null;
      observer?.disconnect();
      observer = null;
      sampleTimer = null;
      if (stopped) return;
      options.onWindow(classifyRuntimePerformanceWindow({
        eligible: eligibleAtStart && options.isEligible(),
        frameDurationsMs,
        longTaskDurationsMs,
        sampledDurationMs: Math.max(1, dependencies.now() - startedAt),
      }));
      scheduleNext(intervalMs);
    }, sampleDurationMs);
  };

  scheduleNext(initialDelayMs);

  return {
    stop: () => {
      stopped = true;
      if (scheduleTimer !== null) dependencies.clearTimer(scheduleTimer);
      if (sampleTimer !== null) dependencies.clearTimer(sampleTimer);
      if (frameId !== null) dependencies.cancelFrame(frameId);
      observer?.disconnect();
      scheduleTimer = null;
      sampleTimer = null;
      frameId = null;
      observer = null;
    },
  };
};
