import { APP_DISPLAY_VERSION } from './appVersion';
import { notifyNativeStartupCheckpoint } from './nativeStartupRecovery';

export type StartupCheckpoint =
  | 'native_created'
  | 'html_visible'
  | 'bundle_started'
  | 'react_started'
  | 'zedbury_visible'
  | 'storage_started'
  | 'storage_ready'
  | 'save_summaries_ready'
  | 'first_screen_ready'
  | 'startup_failed'
  | 'recovery_opened';

export interface StartupDiagnosticContext {
  appVersion?: string;
  androidVersion?: string;
  webViewVersion?: string;
  memoryClassMb?: number;
  failedTask?: string;
  failureCode?: string;
  rendererRestartCount?: number;
}

export interface StartupDiagnosticEvent extends StartupDiagnosticContext {
  checkpoint: StartupCheckpoint;
  occurredAtMs: number;
  durationMs: number;
  online: boolean;
}

type StartupDiagnosticSink = (event: StartupDiagnosticEvent) => void;

export interface StartupDiagnosticsDependencies {
  startedAtMs?: number;
  nowMs?: () => number;
  isOnline?: () => boolean;
  notifyNative?: (event: StartupDiagnosticEvent) => Promise<void> | void;
  initialEvents?: unknown[];
  maxBufferedEvents?: number;
}

const DEFAULT_MAX_BUFFERED_EVENTS = 32;
const MAX_SHORT_TEXT_LENGTH = 80;

const finiteNonNegativeInteger = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined
);

const boundedText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_SHORT_TEXT_LENGTH) : undefined;
};

const sanitizeContext = (context: unknown): StartupDiagnosticContext => {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};
  const source = context as Record<string, unknown>;
  const appVersion = boundedText(source.appVersion);
  const androidVersion = boundedText(source.androidVersion);
  const webViewVersion = boundedText(source.webViewVersion);
  const failedTask = boundedText(source.failedTask);
  const failureCode = boundedText(source.failureCode);
  const memoryClassMb = finiteNonNegativeInteger(source.memoryClassMb);
  const rendererRestartCount = finiteNonNegativeInteger(source.rendererRestartCount);
  return {
    ...(appVersion ? { appVersion } : {}),
    ...(androidVersion ? { androidVersion } : {}),
    ...(webViewVersion ? { webViewVersion } : {}),
    ...(memoryClassMb !== undefined ? { memoryClassMb } : {}),
    ...(failedTask ? { failedTask } : {}),
    ...(failureCode ? { failureCode } : {}),
    ...(rendererRestartCount !== undefined ? { rendererRestartCount } : {}),
  };
};

const STARTUP_CHECKPOINTS = new Set<StartupCheckpoint>([
  'native_created',
  'html_visible',
  'bundle_started',
  'react_started',
  'zedbury_visible',
  'storage_started',
  'storage_ready',
  'save_summaries_ready',
  'first_screen_ready',
  'startup_failed',
  'recovery_opened',
]);

const normalizeInitialEvent = (value: unknown): StartupDiagnosticEvent | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (typeof source.checkpoint !== 'string' || !STARTUP_CHECKPOINTS.has(source.checkpoint as StartupCheckpoint)) {
    return null;
  }
  const occurredAtMs = finiteNonNegativeInteger(source.occurredAtMs);
  const durationMs = finiteNonNegativeInteger(source.durationMs);
  if (occurredAtMs === undefined || durationMs === undefined || typeof source.online !== 'boolean') return null;
  return {
    checkpoint: source.checkpoint as StartupCheckpoint,
    occurredAtMs,
    durationMs,
    online: source.online,
    ...sanitizeContext(source),
  };
};

export const createStartupDiagnosticsRecorder = (
  dependencies: StartupDiagnosticsDependencies = {},
) => {
  const nowMs = dependencies.nowMs || (() => Date.now());
  const startedAtMs = finiteNonNegativeInteger(dependencies.startedAtMs) ?? nowMs();
  const isOnline = dependencies.isOnline || (() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const notifyNative = dependencies.notifyNative || notifyNativeStartupCheckpoint;
  const maxBufferedEvents = Math.max(1, finiteNonNegativeInteger(dependencies.maxBufferedEvents) || DEFAULT_MAX_BUFFERED_EVENTS);
  const sinks = new Set<StartupDiagnosticSink>();
  let context: StartupDiagnosticContext = { appVersion: APP_DISPLAY_VERSION };
  let bufferedEvents = (dependencies.initialEvents || [])
    .map(normalizeInitialEvent)
    .filter((event): event is StartupDiagnosticEvent => event !== null)
    .slice(-maxBufferedEvents);

  const record = (
    checkpoint: StartupCheckpoint,
    eventContext: StartupDiagnosticContext = {},
  ): StartupDiagnosticEvent => {
    const occurredAtMs = Math.max(0, Math.floor(nowMs()));
    const event: StartupDiagnosticEvent = {
      checkpoint,
      occurredAtMs,
      durationMs: Math.max(0, occurredAtMs - startedAtMs),
      online: Boolean(isOnline()),
      ...sanitizeContext(context),
      ...sanitizeContext(eventContext),
    };
    bufferedEvents = [...bufferedEvents, event].slice(-maxBufferedEvents);
    sinks.forEach(sink => sink(event));
    void Promise.resolve(notifyNative(event)).catch(() => {
      // Native recovery is diagnostic-only and must never block startup.
    });
    return event;
  };

  return {
    record,
    setContext(nextContext: StartupDiagnosticContext) {
      context = { ...context, ...sanitizeContext(nextContext) };
    },
    installSink(sink: StartupDiagnosticSink) {
      sinks.add(sink);
      bufferedEvents.forEach(sink);
      return () => { sinks.delete(sink); };
    },
    getBufferedEvents() {
      return bufferedEvents.map(event => ({ ...event }));
    },
  };
};

declare global {
  interface Window {
    __actorEmpireStartupStartedAt?: number;
    __actorEmpireStartupDiagnostics?: unknown[];
  }
}

const initialBrowserEvents = typeof window === 'undefined'
  ? []
  : window.__actorEmpireStartupDiagnostics || [];
const browserStartedAt = typeof window === 'undefined'
  ? Date.now()
  : window.__actorEmpireStartupStartedAt || Date.now();

const startupDiagnostics = createStartupDiagnosticsRecorder({
  startedAtMs: browserStartedAt,
  initialEvents: initialBrowserEvents,
});

export const recordStartupCheckpoint = startupDiagnostics.record;
export const setStartupDiagnosticContext = startupDiagnostics.setContext;
export const installStartupDiagnosticSink = startupDiagnostics.installSink;
export const getBufferedStartupDiagnostics = startupDiagnostics.getBufferedEvents;
