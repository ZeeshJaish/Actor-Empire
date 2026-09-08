export type NativeMemoryCheckpointResult =
  | { status: 'SAVED'; slot: number }
  | { status: 'SKIPPED'; reason: 'NOT_PLAYING' | 'NO_SLOT' | 'WEEK_PROCESSING' };

export interface NativeMemoryCheckpointOptions<T> {
  isPlaying: boolean;
  currentSlot: number | null;
  isWeekProcessing: boolean;
  getCommittedPlayer: () => T;
  cancelPendingAutosave: () => void;
  persistCommittedPlayer: (slot: number, player: T) => Promise<void>;
}

/**
 * Persists only the latest player state that App has already committed.
 * In-progress week work is deliberately excluded so a memory warning can
 * never turn a half-simulated week into the authoritative save.
 */
export const checkpointNativeMemoryPressure = async <T>(
  options: NativeMemoryCheckpointOptions<T>,
): Promise<NativeMemoryCheckpointResult> => {
  if (!options.isPlaying) {
    return { status: 'SKIPPED', reason: 'NOT_PLAYING' };
  }
  if (options.currentSlot === null) {
    return { status: 'SKIPPED', reason: 'NO_SLOT' };
  }
  if (options.isWeekProcessing) {
    return { status: 'SKIPPED', reason: 'WEEK_PROCESSING' };
  }

  const committedPlayer = options.getCommittedPlayer();
  options.cancelPendingAutosave();
  await options.persistCommittedPlayer(options.currentSlot, committedPlayer);
  return { status: 'SAVED', slot: options.currentSlot };
};
