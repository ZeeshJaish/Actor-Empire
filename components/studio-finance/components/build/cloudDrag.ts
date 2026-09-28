/** Coalesce expensive placement previews without delaying the slider thumb.
    Each window applies its newest value; release always applies the exact end. */
export function createCloudDragScheduler(
  onApply: (value: number) => void,
  delay = 90,
  clock: {
    set: (callback: () => void, delay: number) => number;
    clear: (id: number) => void;
  } = { set: (callback, ms) => window.setTimeout(callback, ms), clear: id => window.clearTimeout(id) },
) {
  let pending: number | null = null;
  let applied: number | null = null;
  let timer: number | null = null;
  const apply = () => {
    timer = null;
    if (pending !== null && pending !== applied) {
      applied = pending;
      onApply(pending);
    }
  };
  const cancelTimer = () => {
    if (timer !== null) clock.clear(timer);
    timer = null;
  };
  return {
    change(value: number) {
      if (!Number.isFinite(value)) return;
      pending = value;
      if (timer === null) timer = clock.set(apply, delay);
    },
    finish(value: number) {
      if (!Number.isFinite(value)) return;
      pending = value;
      cancelTimer();
      apply();
    },
    cancel() {
      cancelTimer();
      pending = null;
    },
  };
}
