export type FrameScheduler = (callback: FrameRequestCallback) => number | void;

export interface WeekProcessingPaintOptions {
    fallbackMs?: number;
}

const DEFAULT_PAINT_FALLBACK_MS = 250;

const scheduleBrowserFrame: FrameScheduler = callback => {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
    globalThis.setTimeout(() => callback(performance.now()), 0);
};

/** Lets React commit the processing state before the synchronous weekly simulation starts. */
export const yieldForWeekProcessingPaint = (
    schedule: FrameScheduler = scheduleBrowserFrame,
    options: WeekProcessingPaintOptions = {},
): Promise<void> => new Promise(resolve => {
    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(fallbackTimer);
        resolve();
    };
    const fallbackTimer = globalThis.setTimeout(
        finish,
        Math.max(0, options.fallbackMs ?? DEFAULT_PAINT_FALLBACK_MS),
    );
    try {
        schedule(() => finish());
    } catch {
        finish();
    }
});
