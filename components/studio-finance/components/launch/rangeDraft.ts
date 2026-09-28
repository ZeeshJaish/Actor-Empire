/** Keeps a slider's visible value local until its current gesture ends. */
export function createRangeDraft(initial: number, onCommit: (value: number) => void, onPreview?: (value: number) => void) {
  let value = initial;
  let external = initial;
  let lastSent = initial;
  let dirty = false;
  let awaitingAck = false;
  let disposed = false;

  const change = (next: number) => {
    if (disposed || !Number.isFinite(next)) return;
    value = next;
    dirty = value !== lastSent;
    onPreview?.(value);
  };
  const finish = (finalValue?: number) => {
    if (disposed) return;
    if (finalValue !== undefined) change(finalValue);
    if (dirty && value !== lastSent) {
      lastSent = value;
      dirty = false;
      awaitingAck = true;
      onCommit(value);
    } else {
      dirty = false;
    }
  };
  return {
    get value() { return value; },
    change,
    finish,
    sync(next: number) {
      if (disposed || !Number.isFinite(next) || dirty) return;
      if (awaitingAck && next !== lastSent && next === external) return;
      external = next;
      lastSent = next;
      value = next;
      awaitingAck = false;
    },
    dispose() {
      finish();
      disposed = true;
    },
  };
}
