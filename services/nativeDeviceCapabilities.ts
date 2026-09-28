import { Capacitor, registerPlugin } from '@capacitor/core';

export const DEVICE_CAPABILITY_SCHEMA_VERSION = 1;

export type AndroidThermalStatusLabel =
  | 'NONE'
  | 'LIGHT'
  | 'MODERATE'
  | 'SEVERE'
  | 'CRITICAL'
  | 'EMERGENCY'
  | 'SHUTDOWN';

export type AndroidDeviceCapabilitySnapshot = {
  schemaVersion: number;
  capturedAtEpochMs: number;
  apiLevel: number;
  androidRelease: string;
  isLowRamDevice: boolean;
  memoryClassMb: number;
  largeMemoryClassMb: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  availableMemoryRatio: number;
  lowMemory: boolean;
  memoryThresholdMb: number;
  thermalStatus?: number;
  thermalStatusLabel?: AndroidThermalStatusLabel;
  thermalHeadroom?: number;
  webViewVersion?: string;
  webViewMajor?: number;
};

export type AndroidDeviceCapabilityReadResult =
  | { status: 'AVAILABLE'; snapshot: AndroidDeviceCapabilitySnapshot }
  | { status: 'UNAVAILABLE'; reason: 'NOT_ANDROID' | 'INVALID_PAYLOAD' | 'PLUGIN_ERROR' };

interface DeviceCapabilitiesPlugin {
  getSnapshot(): Promise<Record<string, unknown>>;
}

export interface AndroidDeviceCapabilityDependencies {
  isAndroid: () => boolean;
  nowEpochMs: () => number;
  getSnapshot: () => Promise<unknown>;
}

const DeviceCapabilities = registerPlugin<DeviceCapabilitiesPlugin>('DeviceCapabilities');

const THERMAL_STATUS_LABELS: Record<number, AndroidThermalStatusLabel> = {
  0: 'NONE',
  1: 'LIGHT',
  2: 'MODERATE',
  3: 'SEVERE',
  4: 'CRITICAL',
  5: 'EMERGENCY',
  6: 'SHUTDOWN',
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const asNonNegativeNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
);

const asPositiveInteger = (value: unknown): number | undefined => {
  const number = asNonNegativeNumber(value);
  if (number === undefined || number < 1) return undefined;
  return Math.floor(number);
};

const asBoolean = (value: unknown): boolean | undefined => (
  typeof value === 'boolean' ? value : undefined
);

const asShortString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const roundRatio = (value: number) => Math.round(value * 10_000) / 10_000;

const getWebViewMajor = (version?: string) => {
  if (!version) return undefined;
  const firstSegment = version.split('.')[0];
  if (!/^\d+$/.test(firstSegment)) return undefined;
  const major = Number(firstSegment);
  return Number.isSafeInteger(major) && major > 0 ? major : undefined;
};

export const normalizeAndroidDeviceCapabilitySnapshot = (
  value: unknown,
  capturedAtEpochMs: number
): AndroidDeviceCapabilitySnapshot | null => {
  const raw = asRecord(value);
  if (!raw) return null;

  const schemaVersion = asPositiveInteger(raw.schemaVersion);
  const apiLevel = asPositiveInteger(raw.apiLevel);
  const androidRelease = asShortString(raw.androidRelease, 32);
  const isLowRamDevice = asBoolean(raw.isLowRamDevice);
  const memoryClassMb = asPositiveInteger(raw.memoryClassMb);
  const largeMemoryClassMb = asPositiveInteger(raw.largeMemoryClassMb);
  const totalMemoryMb = asPositiveInteger(raw.totalMemoryMb);
  const availableMemoryMb = asNonNegativeNumber(raw.availableMemoryMb);
  const lowMemory = asBoolean(raw.lowMemory);
  const memoryThresholdMb = asNonNegativeNumber(raw.memoryThresholdMb);

  if (
    schemaVersion !== DEVICE_CAPABILITY_SCHEMA_VERSION
    || apiLevel === undefined
    || androidRelease === undefined
    || isLowRamDevice === undefined
    || memoryClassMb === undefined
    || largeMemoryClassMb === undefined
    || totalMemoryMb === undefined
    || availableMemoryMb === undefined
    || lowMemory === undefined
    || memoryThresholdMb === undefined
  ) {
    return null;
  }

  const thermalStatus = asNonNegativeNumber(raw.thermalStatus);
  const normalizedThermalStatus = thermalStatus !== undefined && THERMAL_STATUS_LABELS[thermalStatus]
    ? Math.floor(thermalStatus)
    : undefined;
  const thermalHeadroom = asNonNegativeNumber(raw.thermalHeadroom);
  const normalizedThermalHeadroom = thermalHeadroom !== undefined && thermalHeadroom <= 10
    ? Math.round(thermalHeadroom * 1_000) / 1_000
    : undefined;
  const webViewVersion = asShortString(raw.webViewVersion, 64);
  const webViewMajor = getWebViewMajor(webViewVersion);
  const safeCapturedAt = Number.isFinite(capturedAtEpochMs) && capturedAtEpochMs >= 0
    ? Math.floor(capturedAtEpochMs)
    : 0;

  return {
    schemaVersion,
    capturedAtEpochMs: safeCapturedAt,
    apiLevel,
    androidRelease,
    isLowRamDevice,
    memoryClassMb,
    largeMemoryClassMb,
    totalMemoryMb,
    availableMemoryMb: Math.round(availableMemoryMb),
    availableMemoryRatio: roundRatio(Math.min(1, availableMemoryMb / totalMemoryMb)),
    lowMemory,
    memoryThresholdMb: Math.round(memoryThresholdMb),
    ...(normalizedThermalStatus !== undefined ? {
      thermalStatus: normalizedThermalStatus,
      thermalStatusLabel: THERMAL_STATUS_LABELS[normalizedThermalStatus],
    } : {}),
    ...(normalizedThermalHeadroom !== undefined ? { thermalHeadroom: normalizedThermalHeadroom } : {}),
    ...(webViewVersion ? { webViewVersion } : {}),
    ...(webViewMajor !== undefined ? { webViewMajor } : {}),
  };
};

const defaultDependencies: AndroidDeviceCapabilityDependencies = {
  isAndroid: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
  nowEpochMs: () => Date.now(),
  getSnapshot: () => DeviceCapabilities.getSnapshot(),
};

export const readAndroidDeviceCapabilities = async (
  dependencies: AndroidDeviceCapabilityDependencies = defaultDependencies
): Promise<AndroidDeviceCapabilityReadResult> => {
  if (!dependencies.isAndroid()) {
    return { status: 'UNAVAILABLE', reason: 'NOT_ANDROID' };
  }

  try {
    const rawSnapshot = await dependencies.getSnapshot();
    const snapshot = normalizeAndroidDeviceCapabilitySnapshot(rawSnapshot, dependencies.nowEpochMs());
    return snapshot
      ? { status: 'AVAILABLE', snapshot }
      : { status: 'UNAVAILABLE', reason: 'INVALID_PAYLOAD' };
  } catch {
    return { status: 'UNAVAILABLE', reason: 'PLUGIN_ERROR' };
  }
};

export const toDeviceCapabilityTelemetry = (
  snapshot: AndroidDeviceCapabilitySnapshot
): Record<string, number | boolean> => ({
  schema_version: snapshot.schemaVersion,
  api_level: snapshot.apiLevel,
  low_ram: snapshot.isLowRamDevice,
  memory_class_mb: snapshot.memoryClassMb,
  large_memory_class_mb: snapshot.largeMemoryClassMb,
  total_memory_mb: snapshot.totalMemoryMb,
  available_memory_pct: Math.round(snapshot.availableMemoryRatio * 100),
  low_memory: snapshot.lowMemory,
  memory_threshold_mb: snapshot.memoryThresholdMb,
  ...(snapshot.thermalStatus !== undefined ? { thermal_status: snapshot.thermalStatus } : {}),
  ...(snapshot.thermalHeadroom !== undefined ? {
    thermal_headroom_pct: Math.round(snapshot.thermalHeadroom * 100),
  } : {}),
  ...(snapshot.webViewMajor !== undefined ? { webview_major: snapshot.webViewMajor } : {}),
});
