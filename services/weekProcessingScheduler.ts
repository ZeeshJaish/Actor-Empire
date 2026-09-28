export type FrameScheduler = (callback: FrameRequestCallback) => number | void;

export interface WeekProcessingPaintOptions {
    fallbackMs?: number;
}

export interface CooperativeTaskController {
    checkpoint: () => Promise<boolean>;
    reset: () => void;
}

export interface CooperativeTaskOptions {
    budgetMs?: number;
    now?: () => number;
    yieldTask?: () => Promise<void>;
}

const DEFAULT_PAINT_FALLBACK_MS = 250;
const DEFAULT_COOPERATIVE_BUDGET_MS = 32;

const scheduleBrowserFrame: FrameScheduler = callback => {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
    globalThis.setTimeout(() => callback(performance.now()), 0);
};

type SchedulerWithYield = {
    yield?: () => Promise<void>;
};

/**
 * Starts a new browser task without waiting for an animation frame. Modern
 * Chromium gets its priority-aware scheduler primitive; every other runtime
 * receives the same event-loop break through a zero-delay timer.
 */
export const yieldToMainThread = async (): Promise<void> => {
    const browserScheduler = (globalThis as typeof globalThis & {
        scheduler?: SchedulerWithYield;
    }).scheduler;
    if (typeof browserScheduler?.yield === 'function') {
        await browserScheduler.yield();
        return;
    }
    await new Promise<void>(resolve => globalThis.setTimeout(resolve, 0));
};

/**
 * Keeps short work contiguous while breaking up genuinely long tasks. Callers
 * place checkpoints only between complete simulation stages, never midway
 * through an atomic state update.
 */
export const createCooperativeTaskController = (
    options: CooperativeTaskOptions = {},
): CooperativeTaskController => {
    const budgetMs = Math.max(8, options.budgetMs ?? DEFAULT_COOPERATIVE_BUDGET_MS);
    const now = options.now ?? (() => performance.now());
    const yieldTask = options.yieldTask ?? yieldToMainThread;
    let taskStartedAt = now();

    return {
        checkpoint: async () => {
            if (now() - taskStartedAt < budgetMs) return false;
            await yieldTask();
            taskStartedAt = now();
            return true;
        },
        reset: () => {
            taskStartedAt = now();
        },
    };
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
