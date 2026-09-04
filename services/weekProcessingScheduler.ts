export type FrameScheduler = (callback: FrameRequestCallback) => number | void;

const scheduleBrowserFrame: FrameScheduler = callback => {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
    globalThis.setTimeout(() => callback(performance.now()), 0);
};

/** Lets React commit the processing state before the synchronous weekly simulation starts. */
export const yieldForWeekProcessingPaint = (
    schedule: FrameScheduler = scheduleBrowserFrame,
): Promise<void> => new Promise(resolve => {
    schedule(() => resolve());
});
