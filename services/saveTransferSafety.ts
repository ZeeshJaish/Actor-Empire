export const SAVE_TRANSFER_MIB_BYTES = 1024 * 1024;

const LEGACY_BRIDGE_ARCHIVE_OVERHEAD_BYTES = 64 * 1024;
const LEGACY_BRIDGE_RECORD_OVERHEAD_BYTES = 256;
const LEGACY_BRIDGE_PEAK_MULTIPLIER = 8;
const LEGACY_BRIDGE_ABSOLUTE_PAYLOAD_LIMIT_BYTES = 8 * SAVE_TRANSFER_MIB_BYTES;
const LEGACY_BRIDGE_UNKNOWN_DEVICE_LIMIT_BYTES = 4 * SAVE_TRANSFER_MIB_BYTES;
const LEGACY_BRIDGE_MEMORY_CLASS_PAYLOAD_RATIO = 0.025;
const LEGACY_BRIDGE_AVAILABLE_MEMORY_PAYLOAD_RATIO = 0.08;

export type SaveTransferFootprint = {
  saveBytes: number;
  saveCount: number;
  localStorageBytes: number;
  localStorageCount: number;
  mediaBytes: number;
  mediaBase64Bytes: number;
  mediaCount: number;
  largestRecordBytes: number;
  projectedArchiveBytes: number;
};

export type LegacyAndroidBridgeSafetyReason =
  | 'WITHIN_BUDGET'
  | 'PAYLOAD_TOO_LARGE'
  | 'MEMORY_PRESSURE';

export type LegacyAndroidBridgeSafetyDecision = {
  allowed: boolean;
  reason: LegacyAndroidBridgeSafetyReason;
  maxPayloadBytes: number;
  projectedPeakBytes: number;
  projectedPeakBudgetBytes: number;
};

export type SaveTransferOperation = 'EXPORT' | 'IMPORT';

export type SaveTransferOperationLease = {
  operation: SaveTransferOperation;
  token: string;
};

export class SaveTransferSafetyError extends Error {
  readonly code = 'LEGACY_BRIDGE_BLOCKED';

  readonly reason: LegacyAndroidBridgeSafetyReason;

  constructor(reason: LegacyAndroidBridgeSafetyReason) {
    super(
      reason === 'MEMORY_PRESSURE'
        ? 'Transfer paused because Android reports low memory. Your careers are unchanged; close other apps and try again.'
        : 'This older V1 transfer is too large to import safely. Your careers are unchanged. Update Actor Empire on the source device, export again, then import the new V2 file.',
    );
    this.name = 'SaveTransferSafetyError';
    this.reason = reason;
  }
}

const normalizeBytes = (value: number): number => (
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
);

const sumBytes = (values: number[]): number => (
  values.reduce((sum, value) => sum + normalizeBytes(value), 0)
);

const base64EncodedBytes = (value: number): number => {
  const bytes = normalizeBytes(value);
  return bytes === 0 ? 0 : 4 * Math.ceil(bytes / 3);
};

export const measureSaveTransferFootprint = (input: {
  saveRecordBytes: number[];
  localStorageRecordBytes: number[];
  mediaRecordBytes: number[];
}): SaveTransferFootprint => {
  const saveRecordBytes = input.saveRecordBytes.map(normalizeBytes);
  const localStorageRecordBytes = input.localStorageRecordBytes.map(normalizeBytes);
  const mediaRecordBytes = input.mediaRecordBytes.map(normalizeBytes);
  const saveBytes = sumBytes(saveRecordBytes);
  const localStorageBytes = sumBytes(localStorageRecordBytes);
  const mediaBytes = sumBytes(mediaRecordBytes);
  const mediaBase64Bytes = mediaRecordBytes.reduce(
    (sum, value) => sum + base64EncodedBytes(value),
    0,
  );
  const recordCount = saveRecordBytes.length + localStorageRecordBytes.length + mediaRecordBytes.length;
  return {
    saveBytes,
    saveCount: saveRecordBytes.length,
    localStorageBytes,
    localStorageCount: localStorageRecordBytes.length,
    mediaBytes,
    mediaBase64Bytes,
    mediaCount: mediaRecordBytes.length,
    largestRecordBytes: Math.max(0, ...saveRecordBytes, ...localStorageRecordBytes, ...mediaRecordBytes),
    projectedArchiveBytes: saveBytes
      + localStorageBytes
      + mediaBase64Bytes
      + LEGACY_BRIDGE_ARCHIVE_OVERHEAD_BYTES
      + recordCount * LEGACY_BRIDGE_RECORD_OVERHEAD_BYTES,
  };
};

const positiveMegabytesToBytes = (value?: number): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value * SAVE_TRANSFER_MIB_BYTES)
    : null
);

export const evaluateLegacyAndroidBridgeSafety = (
  footprint: SaveTransferFootprint,
  device: {
    memoryClassMb?: number;
    availableMemoryMb?: number;
    lowMemory?: boolean;
  },
): LegacyAndroidBridgeSafetyDecision => {
  const memoryClassBytes = positiveMegabytesToBytes(device.memoryClassMb);
  const availableMemoryBytes = positiveMegabytesToBytes(device.availableMemoryMb);
  const candidateLimits = [LEGACY_BRIDGE_ABSOLUTE_PAYLOAD_LIMIT_BYTES];
  if (memoryClassBytes !== null) {
    candidateLimits.push(Math.floor(memoryClassBytes * LEGACY_BRIDGE_MEMORY_CLASS_PAYLOAD_RATIO));
  }
  if (availableMemoryBytes !== null) {
    candidateLimits.push(Math.floor(availableMemoryBytes * LEGACY_BRIDGE_AVAILABLE_MEMORY_PAYLOAD_RATIO));
  }
  if (memoryClassBytes === null && availableMemoryBytes === null) {
    candidateLimits.push(LEGACY_BRIDGE_UNKNOWN_DEVICE_LIMIT_BYTES);
  }
  const maxPayloadBytes = Math.max(1, Math.min(...candidateLimits));
  const projectedPeakBytes = footprint.projectedArchiveBytes * LEGACY_BRIDGE_PEAK_MULTIPLIER;
  const projectedPeakBudgetBytes = maxPayloadBytes * LEGACY_BRIDGE_PEAK_MULTIPLIER;
  const reason: LegacyAndroidBridgeSafetyReason = device.lowMemory
    ? 'MEMORY_PRESSURE'
    : footprint.projectedArchiveBytes > maxPayloadBytes
      ? 'PAYLOAD_TOO_LARGE'
      : 'WITHIN_BUDGET';
  return {
    allowed: reason === 'WITHIN_BUDGET',
    reason,
    maxPayloadBytes,
    projectedPeakBytes,
    projectedPeakBudgetBytes,
  };
};

export const assertLegacyAndroidBridgeSafety = (
  decision: LegacyAndroidBridgeSafetyDecision,
): void => {
  if (!decision.allowed) throw new SaveTransferSafetyError(decision.reason);
};

const byteBucket = (bytes: number): string => {
  const mib = normalizeBytes(bytes) / SAVE_TRANSFER_MIB_BYTES;
  if (mib === 0) return 'zero';
  if (mib < 1) return 'under_1_mib';
  if (mib < 4) return '1_to_4_mib';
  if (mib < 8) return '4_to_8_mib';
  if (mib < 16) return '8_to_16_mib';
  if (mib < 32) return '16_to_32_mib';
  if (mib < 64) return '32_to_64_mib';
  if (mib < 128) return '64_to_128_mib';
  return '128_mib_or_more';
};

const memoryClassBucket = (memoryClassMb?: number): string => {
  if (!Number.isFinite(memoryClassMb) || (memoryClassMb ?? 0) <= 0) return 'unknown';
  if ((memoryClassMb as number) <= 192) return 'up_to_192_mb';
  if ((memoryClassMb as number) <= 256) return '193_to_256_mb';
  if ((memoryClassMb as number) <= 384) return '257_to_384_mb';
  if ((memoryClassMb as number) <= 512) return '385_to_512_mb';
  return 'over_512_mb';
};

export const toSaveTransferSafetyTelemetry = (input: {
  direction: SaveTransferOperation;
  stage: 'MEASURED' | 'BLOCKED' | 'BRIDGE_STARTED' | 'COMPLETED' | 'FAILED';
  footprint: SaveTransferFootprint;
  decision: LegacyAndroidBridgeSafetyDecision;
  memoryClassMb?: number;
}): Record<string, string | number | boolean> => ({
  direction: input.direction.toLowerCase(),
  stage: input.stage.toLowerCase(),
  allowed: input.decision.allowed,
  failure_reason: input.decision.allowed ? 'none' : input.decision.reason.toLowerCase(),
  save_count: input.footprint.saveCount,
  local_storage_count: input.footprint.localStorageCount,
  media_count: input.footprint.mediaCount,
  save_size_bucket: byteBucket(input.footprint.saveBytes),
  media_size_bucket: byteBucket(input.footprint.mediaBytes),
  largest_record_bucket: byteBucket(input.footprint.largestRecordBytes),
  archive_size_bucket: byteBucket(input.footprint.projectedArchiveBytes),
  projected_peak_bucket: byteBucket(input.decision.projectedPeakBytes),
  memory_class_bucket: memoryClassBucket(input.memoryClassMb),
});

export const createSaveTransferOperationLock = () => {
  let activeLease: SaveTransferOperationLease | null = null;
  let counter = 0;
  return {
    tryAcquire(operation: SaveTransferOperation): SaveTransferOperationLease | null {
      if (activeLease) return null;
      counter += 1;
      activeLease = { operation, token: `save-transfer-${counter}` };
      return activeLease;
    },
    release(lease: SaveTransferOperationLease): boolean {
      if (!activeLease || activeLease.token !== lease.token || activeLease.operation !== lease.operation) {
        return false;
      }
      activeLease = null;
      return true;
    },
    isActive(): boolean {
      return activeLease !== null;
    },
    activeOperation(): SaveTransferOperation | null {
      return activeLease?.operation ?? null;
    },
  };
};

export type SaveTransferOperationLock = ReturnType<typeof createSaveTransferOperationLock>;
