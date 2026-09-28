import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Player } from '../types';

export type IOSLongSessionCheckpointName =
  | 'runtime_ready'
  | 'startup_ready'
  | 'backgrounded'
  | 'foregrounded'
  | 'page_hidden'
  | 'page_shown'
  | 'week_started'
  | 'week_persistence_prepared'
  | 'week_verified'
  | 'week_failed'
  | 'memory_warning';

export type IOSPreviousTerminationKind =
  | 'NONE'
  | 'CLEAN'
  | 'BACKGROUND_TERMINATED'
  | 'UNEXPECTED_ACTIVE_EXIT'
  | 'WEB_CONTENT_TERMINATED'
  | 'MEMORY_PRESSURE_EXIT'
  | 'UNKNOWN';

export interface IOSLongSessionCheckpoint {
  checkpoint: IOSLongSessionCheckpointName;
  occurredAtMs: number;
  age?: number;
  week?: number;
  saveSlot?: number;
  screen?: string;
  runtimeBytes?: number;
  persistedBytes?: number;
  worldProjects?: number;
  rightsContracts?: number;
  platformPlans?: number;
  industryEvents?: number;
  elapsedMs?: number;
}

export interface IOSLongSessionNativeState {
  available: boolean;
  sessionId?: string;
  reportId?: string;
  reportPending: boolean;
  previousTerminationKind?: IOSPreviousTerminationKind;
  launchCount: number;
  memoryWarningCount: number;
  rendererTerminationCount: number;
  previousSessionAge?: number;
  previousSessionWeek?: number;
  previousSessionSaveSlot?: number;
  previousSessionScreen?: string;
  previousRuntimeBytes?: number;
  previousPersistedBytes?: number;
  previousAppVersion?: string;
  previousBuildNumber?: string;
  previousDeviceModel?: string;
  previousOSVersion?: string;
}

interface IOSLongSessionDiagnosticsPlugin {
  getState(): Promise<Record<string, unknown>>;
  checkpoint(event: IOSLongSessionCheckpoint): Promise<void>;
  acknowledgeReport(options: { reportId: string }): Promise<void>;
}

const NativeIOSLongSessionDiagnostics = registerPlugin<IOSLongSessionDiagnosticsPlugin>('IOSLongSessionDiagnostics');

const CHECKPOINTS = new Set<IOSLongSessionCheckpointName>([
  'runtime_ready',
  'startup_ready',
  'backgrounded',
  'foregrounded',
  'page_hidden',
  'page_shown',
  'week_started',
  'week_persistence_prepared',
  'week_verified',
  'week_failed',
  'memory_warning',
]);

const TERMINATION_KINDS = new Set<IOSPreviousTerminationKind>([
  'NONE',
  'CLEAN',
  'BACKGROUND_TERMINATED',
  'UNEXPECTED_ACTIVE_EXIT',
  'WEB_CONTENT_TERMINATED',
  'MEMORY_PRESSURE_EXIT',
  'UNKNOWN',
]);

const MAX_SHORT_TEXT = 80;
const MAX_DIAGNOSTIC_NUMBER = 2_000_000_000;

const boundedText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_SHORT_TEXT) : undefined;
};

const boundedInteger = (
  value: unknown,
  options: { min?: number; max?: number } = {},
): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const min = options.min ?? 0;
  const max = options.max ?? MAX_DIAGNOSTIC_NUMBER;
  return Math.min(max, Math.max(min, Math.floor(value)));
};

const optionalNumber = (
  key: keyof IOSLongSessionCheckpoint,
  source: Record<string, unknown>,
  output: Record<string, unknown>,
  options?: { min?: number; max?: number },
) => {
  const value = boundedInteger(source[key as string], options);
  if (value !== undefined) output[key] = value;
};

export const createIOSLongSessionCheckpoint = (
  value: Record<string, unknown>,
): IOSLongSessionCheckpoint => {
  const checkpoint = typeof value.checkpoint === 'string' && CHECKPOINTS.has(value.checkpoint as IOSLongSessionCheckpointName)
    ? value.checkpoint as IOSLongSessionCheckpointName
    : 'runtime_ready';
  const output: Record<string, unknown> = {
    checkpoint,
    occurredAtMs: boundedInteger(value.occurredAtMs, { max: Number.MAX_SAFE_INTEGER }) ?? Date.now(),
  };
  optionalNumber('age', value, output, { max: 150 });
  optionalNumber('week', value, output, { min: 1, max: 52 });
  optionalNumber('saveSlot', value, output, { max: 20 });
  optionalNumber('runtimeBytes', value, output);
  optionalNumber('persistedBytes', value, output);
  optionalNumber('worldProjects', value, output);
  optionalNumber('rightsContracts', value, output);
  optionalNumber('platformPlans', value, output);
  optionalNumber('industryEvents', value, output);
  optionalNumber('elapsedMs', value, output, { max: 86_400_000 });
  const screen = boundedText(value.screen);
  if (screen) output.screen = screen;
  return output as unknown as IOSLongSessionCheckpoint;
};

export const normalizeIOSLongSessionNativeState = (value: unknown): IOSLongSessionNativeState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      available: false,
      reportPending: false,
      launchCount: 0,
      memoryWarningCount: 0,
      rendererTerminationCount: 0,
    };
  }
  const source = value as Record<string, unknown>;
  const terminationKind = typeof source.previousTerminationKind === 'string'
    && TERMINATION_KINDS.has(source.previousTerminationKind as IOSPreviousTerminationKind)
    ? source.previousTerminationKind as IOSPreviousTerminationKind
    : undefined;
  const sessionId = boundedText(source.sessionId);
  const reportId = boundedText(source.reportId);
  const previousSessionScreen = boundedText(source.previousSessionScreen);
  const previousSessionAge = boundedInteger(source.previousSessionAge, { max: 150 });
  const previousSessionWeek = boundedInteger(source.previousSessionWeek, { min: 1, max: 52 });
  const previousSessionSaveSlot = typeof source.previousSessionSaveSlot === 'number'
    && Number.isInteger(source.previousSessionSaveSlot)
    && source.previousSessionSaveSlot >= 1 && source.previousSessionSaveSlot <= 3
    ? source.previousSessionSaveSlot : undefined;
  const previousRuntimeBytes = boundedInteger(source.previousRuntimeBytes);
  const previousPersistedBytes = boundedInteger(source.previousPersistedBytes);
  const previousAppVersion = boundedText(source.previousAppVersion);
  const previousBuildNumber = boundedText(source.previousBuildNumber);
  const previousDeviceModel = boundedText(source.previousDeviceModel);
  const previousOSVersion = boundedText(source.previousOSVersion);
  return {
    available: source.available === true,
    ...(sessionId ? { sessionId } : {}),
    ...(reportId ? { reportId } : {}),
    reportPending: source.reportPending === true && Boolean(reportId),
    ...(terminationKind ? { previousTerminationKind: terminationKind } : {}),
    launchCount: boundedInteger(source.launchCount) ?? 0,
    memoryWarningCount: boundedInteger(source.memoryWarningCount) ?? 0,
    rendererTerminationCount: boundedInteger(source.rendererTerminationCount) ?? 0,
    ...(previousSessionAge !== undefined ? { previousSessionAge } : {}),
    ...(previousSessionWeek !== undefined ? { previousSessionWeek } : {}),
    ...(previousSessionSaveSlot !== undefined ? { previousSessionSaveSlot } : {}),
    ...(previousSessionScreen ? { previousSessionScreen } : {}),
    ...(previousRuntimeBytes !== undefined ? { previousRuntimeBytes } : {}),
    ...(previousPersistedBytes !== undefined ? { previousPersistedBytes } : {}),
    ...(previousAppVersion ? { previousAppVersion } : {}),
    ...(previousBuildNumber ? { previousBuildNumber } : {}),
    ...(previousDeviceModel ? { previousDeviceModel } : {}),
    ...(previousOSVersion ? { previousOSVersion } : {}),
  };
};

const megabytes = (bytes: number | undefined): number | undefined => (
  bytes === undefined ? undefined : Math.round((bytes / 1_000_000) * 10) / 10
);

export const toIOSLongSessionTelemetry = (state: IOSLongSessionNativeState): Record<string, unknown> => Object.fromEntries(
  Object.entries({
    report_id: state.reportId,
    termination_kind: state.previousTerminationKind?.toLowerCase(),
    launch_count: state.launchCount,
    memory_warning_count: state.memoryWarningCount,
    renderer_termination_count: state.rendererTerminationCount,
    previous_age: state.previousSessionAge,
    previous_week: state.previousSessionWeek,
    previous_save_slot: state.previousSessionSaveSlot,
    previous_screen: state.previousSessionScreen,
    runtime_size_mb: megabytes(state.previousRuntimeBytes),
    persisted_size_mb: megabytes(state.previousPersistedBytes),
    previous_app_version: state.previousAppVersion,
    previous_build_number: state.previousBuildNumber,
    device_model: state.previousDeviceModel,
    os_version: state.previousOSVersion,
  }).filter(([, item]) => item !== undefined),
);

/** A renderer crash may reopen only its own discovered slot; load verification remains mandatory. */
export const chooseIOSRendererRecoverySlot = (
  state: IOSLongSessionNativeState,
  availableSlots: Record<number, boolean>,
): number | null => {
  const slot = state.previousSessionSaveSlot;
  return state.available && state.reportPending
    && state.previousTerminationKind === 'WEB_CONTENT_TERMINATED'
    && Number.isInteger(slot) && slot! >= 1 && slot! <= 3
    && availableSlots[slot!] === true
    ? slot! : null;
};

export const isIOSRendererRecoveryLoadVerified = (status: string): boolean => status === 'CURRENT';

export const tryIOSRendererRecoveryOpen = async (
  slot: number,
  open: (slot: number) => Promise<void>,
): Promise<{ ok: true } | { ok: false; error: unknown }> => {
  try {
    await open(slot);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

const isIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const readIOSLongSessionDiagnostics = async (): Promise<IOSLongSessionNativeState> => {
  if (!isIOS()) return normalizeIOSLongSessionNativeState(null);
  try {
    return normalizeIOSLongSessionNativeState(await NativeIOSLongSessionDiagnostics.getState());
  } catch {
    return normalizeIOSLongSessionNativeState(null);
  }
};

export const notifyIOSLongSessionCheckpoint = async (
  value: Record<string, unknown>,
): Promise<void> => {
  if (!isIOS()) return;
  await NativeIOSLongSessionDiagnostics.checkpoint(createIOSLongSessionCheckpoint(value));
};

export const acknowledgeIOSLongSessionReport = async (reportId: string): Promise<void> => {
  const safeReportId = boundedText(reportId);
  if (!isIOS() || !safeReportId) return;
  await NativeIOSLongSessionDiagnostics.acknowledgeReport({ reportId: safeReportId });
};

export const getIOSLongSessionPlayerCounts = (player?: Player | null) => ({
  worldProjects: player?.world?.projects?.length || 0,
  rightsContracts: Object.keys(player?.world?.streamingRightsContracts || {}).length,
  platformPlans: Object.values(player?.world?.platforms || {})
    .reduce((sum, platform) => sum + (platform.ai?.slate?.length || 0), 0),
  industryEvents: player?.world?.industryEvents?.events?.length || 0,
});
