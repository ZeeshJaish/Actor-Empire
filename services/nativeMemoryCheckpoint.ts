export type NativeMemoryCheckpointResult =
  | { status: 'READY'; slot: number }
  | { status: 'SKIPPED'; reason: 'NOT_PLAYING' | 'NO_SLOT' | 'WEEK_PROCESSING' | 'SAVE_TRANSFER_ACTIVE' | 'NO_VERIFIED_CHECKPOINT' };

export interface NativeMemoryCheckpointOptions {
  isPlaying: boolean;
  currentSlot: number | null;
  isWeekProcessing: boolean;
  isSaveTransferActive?: boolean;
  hasVerifiedCheckpoint: (slot: number) => boolean;
  cancelPendingAutosave: () => void;
}

/**
 * A memory warning is too late to prepare another full save. Stop pending
 * autosave work and rely only on an already verified, durable generation.
 */
export const checkpointNativeMemoryPressure = (
  options: NativeMemoryCheckpointOptions,
): NativeMemoryCheckpointResult => {
  options.cancelPendingAutosave();
  if (!options.isPlaying) {
    return { status: 'SKIPPED', reason: 'NOT_PLAYING' };
  }
  if (options.currentSlot === null) {
    return { status: 'SKIPPED', reason: 'NO_SLOT' };
  }
  if (options.isWeekProcessing) {
    return { status: 'SKIPPED', reason: 'WEEK_PROCESSING' };
  }
  if (options.isSaveTransferActive) {
    return { status: 'SKIPPED', reason: 'SAVE_TRANSFER_ACTIVE' };
  }

  return options.hasVerifiedCheckpoint(options.currentSlot)
    ? { status: 'READY', slot: options.currentSlot }
    : { status: 'SKIPPED', reason: 'NO_VERIFIED_CHECKPOINT' };
};
