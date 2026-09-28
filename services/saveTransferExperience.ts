export type SaveTransferDirection = 'EXPORT' | 'IMPORT';

export type SaveTransferProgressStage =
  | 'WAITING_FOR_FILE'
  | 'PREPARING'
  | 'READING'
  | 'VERIFYING'
  | 'COMPACTING'
  | 'WRITING'
  | 'MEDIA'
  | 'FINALIZING'
  | 'CANCELLING'
  | 'DONE';

export interface SaveTransferProgress {
  direction: SaveTransferDirection;
  stage: SaveTransferProgressStage;
  message: string;
  processedBytes?: number;
  totalBytes?: number;
  processedRecords?: number;
  totalRecords?: number;
  cancelable: boolean;
}

type TimerPort<TimerId> = {
  setTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearTimeout: (id: TimerId) => void;
};

export type SaveTransferProgressPresenter = {
  update: (progress: SaveTransferProgress) => void;
  finish: () => void;
};

export const SAVE_TRANSFER_PROGRESS_DELAY_MS = 1_000;

export const createDelayedSaveTransferProgressPresenter = <TimerId = ReturnType<typeof globalThis.setTimeout>>(options: {
  onChange: (progress: SaveTransferProgress | null) => void;
  delayMs?: number;
  timers?: TimerPort<TimerId>;
}): SaveTransferProgressPresenter => {
  const timers = options.timers ?? ({
    setTimeout: (callback: () => void, delayMs: number) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: (id: ReturnType<typeof globalThis.setTimeout>) => globalThis.clearTimeout(id),
  } as TimerPort<TimerId>);
  let latest: SaveTransferProgress | null = null;
  let visible = false;
  let finished = false;
  const timerId = timers.setTimeout(() => {
    if (finished || !latest) return;
    visible = true;
    options.onChange(latest);
  }, options.delayMs ?? SAVE_TRANSFER_PROGRESS_DELAY_MS);

  return {
    update(progress) {
      if (finished) return;
      latest = progress;
      if (visible) options.onChange(progress);
    },
    finish() {
      if (finished) return;
      finished = true;
      timers.clearTimeout(timerId);
      if (visible) options.onChange(null);
      latest = null;
      visible = false;
    },
  };
};

export class SaveTransferCancelledError extends Error {
  readonly code = 'SAVE_TRANSFER_CANCELLED';

  constructor() {
    super('Save transfer cancelled. Your careers are unchanged.');
    this.name = 'SaveTransferCancelledError';
  }
}

export const throwIfSaveTransferCancelled = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new SaveTransferCancelledError();
};

export const isSaveTransferCancelledError = (error: unknown): error is SaveTransferCancelledError => (
  error instanceof SaveTransferCancelledError
  || (error instanceof Error && (error as Error & { code?: string }).code === 'SAVE_TRANSFER_CANCELLED')
);
