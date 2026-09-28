export type RewardedAdFailureReason =
    | 'USER_DISMISSED'
    | 'LOAD_FAILED'
    | 'SHOW_FAILED'
    | 'LOAD_TIMEOUT'
    | 'SHOW_TIMEOUT'
    | 'INIT_FAILED'
    | 'OFFLINE'
    | 'NO_FILL'
    | 'UNAVAILABLE'
    | 'BUSY'
    | 'ERROR';

export type RewardedAdStage = 'INIT' | 'LOAD' | 'SHOW' | 'REWARD' | 'COORDINATOR';

export interface RewardedAdResult {
    success: boolean;
    reason?: RewardedAdFailureReason;
    stage: RewardedAdStage;
    diagnosticsEmitted?: boolean;
}

export type RewardedAdLifecycleEvent =
    | 'REWARDED'
    | 'DISMISSED'
    | 'FAILED_TO_LOAD'
    | 'FAILED_TO_SHOW'
    | 'SHOWED';

export type RewardedAdLifecycleState =
    | 'LOADING'
    | 'READY'
    | 'SHOWING'
    | 'SHOWN'
    | 'REWARDED'
    | 'DISMISSED'
    | 'FAILED'
    | 'TIMED_OUT';

export interface RewardedAdLifecycleTransition {
    state: RewardedAdLifecycleState;
    stage: RewardedAdStage;
    reason?: RewardedAdFailureReason;
    payload?: unknown;
}

export interface RewardedAdListenerHandle {
    remove: () => void | Promise<void>;
}

export interface RewardedAdGateway {
    prepare: () => Promise<unknown>;
    show: () => Promise<unknown>;
    addListener: (
        event: RewardedAdLifecycleEvent,
        callback: (payload?: unknown) => void,
    ) => Promise<RewardedAdListenerHandle>;
}

export interface RewardedAdTimer {
    schedule: (callback: () => void, delayMs: number) => unknown;
    cancel: (timerId: unknown) => void;
}

export interface RewardedAdLifecycleOptions {
    loadTimeoutMs?: number;
    showTimeoutMs?: number;
    timer?: RewardedAdTimer;
    onTransition?: (transition: RewardedAdLifecycleTransition) => void;
}

export interface RewardedAdInitializationOptions {
    timeoutMs?: number;
    timer?: RewardedAdTimer;
}

const DEFAULT_LOAD_TIMEOUT_MS = 15_000;
const DEFAULT_SHOW_TIMEOUT_MS = 120_000;
const DEFAULT_INITIALIZATION_TIMEOUT_MS = 20_000;

const defaultTimer: RewardedAdTimer = {
    schedule: (callback, delayMs) => setTimeout(callback, delayMs),
    cancel: timerId => clearTimeout(timerId as ReturnType<typeof setTimeout>),
};

const failure = (
    reason: RewardedAdFailureReason,
    stage: RewardedAdStage,
): RewardedAdResult => ({ success: false, reason, stage });

const readLoadFailureReason = (payload: unknown): RewardedAdFailureReason => {
    if (!payload || typeof payload !== 'object') return 'LOAD_FAILED';
    const error = payload as { code?: unknown; message?: unknown; reason?: unknown };
    if (error.reason === 'NO_FILL' || error.reason === 'OFFLINE') return error.reason;
    const code = Number(error.code);
    const message = String(error.message || '').toLowerCase();
    if (code === 3 || /no[\s_-]*fill|inventory unavailable|no ad available/.test(message)) return 'NO_FILL';
    if (code === 2 || /network|offline|internet|connection/.test(message)) return 'OFFLINE';
    return 'LOAD_FAILED';
};

export const runRewardedAdInitialization = async (
    initialize: () => Promise<boolean>,
    options: RewardedAdInitializationOptions = {},
): Promise<boolean> => {
    const timer = options.timer || defaultTimer;
    let timerId: unknown;
    try {
        return await Promise.race([
            Promise.resolve()
                .then(initialize)
                .then(result => result === true)
                .catch(() => false),
            new Promise<boolean>(resolve => {
                timerId = timer.schedule(
                    () => resolve(false),
                    options.timeoutMs ?? DEFAULT_INITIALIZATION_TIMEOUT_MS,
                );
            }),
        ]);
    } finally {
        if (timerId !== undefined) timer.cancel(timerId);
    }
};

export const runRewardedAdLifecycle = async (
    gateway: RewardedAdGateway,
    options: RewardedAdLifecycleOptions = {},
): Promise<RewardedAdResult> => {
    const timer = options.timer || defaultTimer;
    const listenerHandles: RewardedAdListenerHandle[] = [];
    let loadTimerId: unknown;
    let showTimerId: unknown;
    let settled = false;
    let resolveOutcome!: (result: RewardedAdResult) => void;
    const outcome = new Promise<RewardedAdResult>(resolve => {
        resolveOutcome = resolve;
    });
    const settle = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        if (result.success) {
            options.onTransition?.({ state: 'REWARDED', stage: 'REWARD' });
        } else if (result.reason === 'USER_DISMISSED') {
            options.onTransition?.({ state: 'DISMISSED', stage: result.stage, reason: result.reason });
        } else if (result.reason === 'LOAD_TIMEOUT' || result.reason === 'SHOW_TIMEOUT') {
            options.onTransition?.({ state: 'TIMED_OUT', stage: result.stage, reason: result.reason });
        } else {
            options.onTransition?.({ state: 'FAILED', stage: result.stage, reason: result.reason });
        }
        resolveOutcome(result);
    };

    const eventResults: Record<Exclude<RewardedAdLifecycleEvent, 'SHOWED'>, RewardedAdResult> = {
        REWARDED: { success: true, stage: 'REWARD' },
        DISMISSED: failure('USER_DISMISSED', 'SHOW'),
        FAILED_TO_LOAD: failure('LOAD_FAILED', 'LOAD'),
        FAILED_TO_SHOW: failure('SHOW_FAILED', 'SHOW'),
    };

    try {
        try {
            for (const event of [...Object.keys(eventResults), 'SHOWED'] as RewardedAdLifecycleEvent[]) {
                const handle = await gateway.addListener(event, payload => {
                    if (event === 'SHOWED') {
                        if (!settled) options.onTransition?.({ state: 'SHOWN', stage: 'SHOW', payload });
                        return;
                    }
                    const result = event === 'FAILED_TO_LOAD'
                        ? failure(readLoadFailureReason(payload), 'LOAD')
                        : eventResults[event];
                    settle(result);
                });
                listenerHandles.push(handle);
            }
        } catch {
            return failure('ERROR', 'INIT');
        }

        options.onTransition?.({ state: 'LOADING', stage: 'LOAD' });
        loadTimerId = timer.schedule(
            () => settle(failure('LOAD_TIMEOUT', 'LOAD')),
            options.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS,
        );
        const loadRace = await Promise.race([
            Promise.resolve()
                .then(() => gateway.prepare())
                .then(() => ({ kind: 'PREPARED' as const }))
                .catch(error => ({
                    kind: 'RESULT' as const,
                    result: failure(readLoadFailureReason(error), 'LOAD'),
                })),
            outcome.then(result => ({ kind: 'RESULT' as const, result })),
        ]);
        timer.cancel(loadTimerId);
        loadTimerId = undefined;
        if (loadRace.kind === 'RESULT') return loadRace.result;
        options.onTransition?.({ state: 'READY', stage: 'LOAD' });

        options.onTransition?.({ state: 'SHOWING', stage: 'SHOW' });
        showTimerId = timer.schedule(
            () => settle(failure('SHOW_TIMEOUT', 'SHOW')),
            options.showTimeoutMs ?? DEFAULT_SHOW_TIMEOUT_MS,
        );
        try {
            void gateway.show()
                .then(reward => {
                    settle(reward
                        ? { success: true, stage: 'REWARD' }
                        : failure('USER_DISMISSED', 'SHOW'));
                })
                .catch(() => settle(failure('SHOW_FAILED', 'SHOW')));
        } catch {
            settle(failure('SHOW_FAILED', 'SHOW'));
        }

        return await outcome;
    } finally {
        if (loadTimerId !== undefined) timer.cancel(loadTimerId);
        if (showTimerId !== undefined) timer.cancel(showTimerId);
        await Promise.allSettled(listenerHandles.map(handle => handle.remove()));
    }
};
