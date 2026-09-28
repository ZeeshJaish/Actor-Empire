/** Serializes preparation and promotion, not just IndexedDB writes. */
export const autosaveDelayAfterPressure = (
  debounceMs: number,
  nowMs: number,
  cooldownUntilMs: number,
): number => Math.max(0, Math.max(debounceMs, cooldownUntilMs - nowMs));

export const createSaveOperationQueue = () => {
  let tail: Promise<void> = Promise.resolve();
  const pendingOptional = new Map<string, { cancel: () => void }>();
  const run = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = tail.then(operation);
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
  return {
    run,
    cancelPendingOptional(key: string): void {
      pendingOptional.get(key)?.cancel();
    },
    /** Keep only the newest waiting autosave for a slot; active saves finish. */
    runLatest<T>(key: string, operation: () => Promise<T>, onSuperseded: () => T): Promise<T> {
      pendingOptional.get(key)?.cancel();
      let work: (() => Promise<T>) | null = operation;
      let fallback: (() => T) | null = onSuperseded;
      let resolveResult!: (value: T) => void;
      let rejectResult!: (error: unknown) => void;
      const result = new Promise<T>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      });
      const token = {
        cancel: () => {
          if (!work) return;
          work = null;
          const superseded = fallback;
          fallback = null;
          if (pendingOptional.get(key) === token) pendingOptional.delete(key);
          try { resolveResult(superseded!()); } catch (error) { rejectResult(error); }
        },
      };
      pendingOptional.set(key, token);
      void run(async () => {
        if (pendingOptional.get(key) === token) pendingOptional.delete(key);
        const current = work;
        work = null;
        fallback = null;
        if (!current) return;
        try { resolveResult(await current()); } catch (error) { rejectResult(error); }
      });
      return result;
    },
  };
};
