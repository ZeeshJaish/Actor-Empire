import type { RewardedAdFailureReason } from './rewardedAdLifecycle';

export type RewardedAdAvailabilityStatus =
    | 'IDLE'
    | 'LOADING'
    | 'READY'
    | 'SHOWING'
    | 'OFFLINE'
    | 'UNAVAILABLE';

export interface RewardedAdAvailabilitySnapshot {
    status: RewardedAdAvailabilityStatus;
    attempts: number;
    lastFailureReason?: RewardedAdFailureReason;
    updatedAt: number;
}

export interface RewardedAdAvailabilityResult {
    ready: boolean;
    attempts: number;
    reason?: RewardedAdFailureReason;
}

interface RewardedAdAvailabilityControllerOptions {
    load: () => Promise<unknown>;
    isOnline: () => boolean;
    wait?: (delayMs: number) => Promise<void>;
    retryDelaysMs?: readonly number[];
    now?: () => number;
    onStateChange?: (snapshot: RewardedAdAvailabilitySnapshot) => void;
}

const DEFAULT_RETRY_DELAYS_MS = [500, 1_000] as const;

const defaultWait = (delayMs: number) => new Promise<void>(resolve => setTimeout(resolve, delayMs));

const readError = (error: unknown): { code?: number; message: string } => {
    if (typeof error === 'string') return { message: error };
    if (!error || typeof error !== 'object') return { message: String(error || '') };
    const value = error as { code?: unknown; message?: unknown; cause?: unknown };
    const nested = value.cause && typeof value.cause === 'object'
        ? value.cause as { code?: unknown; message?: unknown }
        : undefined;
    const codeValue = value.code ?? nested?.code;
    return {
        code: Number.isFinite(Number(codeValue)) ? Number(codeValue) : undefined,
        message: String(value.message ?? nested?.message ?? ''),
    };
};

export const classifyRewardedAdLoadFailure = (
    error: unknown,
    online: boolean,
): RewardedAdFailureReason => {
    if (!online) return 'OFFLINE';
    const { code, message } = readError(error);
    const normalizedMessage = message.toLowerCase();
    if (code === 3 || /no[\s_-]*fill|inventory unavailable|no ad available/.test(normalizedMessage)) {
        return 'NO_FILL';
    }
    if (code === 2 || /network|offline|internet|connection/.test(normalizedMessage)) {
        return 'OFFLINE';
    }
    return 'LOAD_FAILED';
};

export const createRewardedAdAvailabilityController = (
    options: RewardedAdAvailabilityControllerOptions,
) => {
    const now = options.now || Date.now;
    const wait = options.wait || defaultWait;
    const retryDelaysMs = options.retryDelaysMs || DEFAULT_RETRY_DELAYS_MS;
    let snapshot: RewardedAdAvailabilitySnapshot = {
        status: 'IDLE',
        attempts: 0,
        updatedAt: now(),
    };
    let loadingPromise: Promise<RewardedAdAvailabilityResult> | null = null;

    const update = (
        status: RewardedAdAvailabilityStatus,
        attempts: number,
        lastFailureReason?: RewardedAdFailureReason,
    ) => {
        snapshot = { status, attempts, lastFailureReason, updatedAt: now() };
        options.onStateChange?.({ ...snapshot });
    };

    const preload = (): Promise<RewardedAdAvailabilityResult> => {
        if (snapshot.status === 'READY') {
            return Promise.resolve({ ready: true, attempts: snapshot.attempts });
        }
        if (snapshot.status === 'SHOWING') {
            return Promise.resolve({ ready: false, attempts: 0, reason: 'BUSY' });
        }
        if (loadingPromise) return loadingPromise;
        if (!options.isOnline()) {
            update('OFFLINE', 0, 'OFFLINE');
            return Promise.resolve({ ready: false, attempts: 0, reason: 'OFFLINE' });
        }

        loadingPromise = (async (): Promise<RewardedAdAvailabilityResult> => {
            const maxAttempts = retryDelaysMs.length + 1;
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                update('LOADING', attempt);
                try {
                    await options.load();
                    update('READY', attempt);
                    return { ready: true, attempts: attempt };
                } catch (error) {
                    const reason = classifyRewardedAdLoadFailure(error, options.isOnline());
                    const canRetry = reason === 'LOAD_FAILED' && attempt < maxAttempts;
                    if (!canRetry) {
                        update(reason === 'OFFLINE' ? 'OFFLINE' : 'UNAVAILABLE', attempt, reason);
                        return { ready: false, attempts: attempt, reason };
                    }
                    await wait(retryDelaysMs[attempt - 1]);
                }
            }
            update('UNAVAILABLE', maxAttempts, 'LOAD_FAILED');
            return { ready: false, attempts: maxAttempts, reason: 'LOAD_FAILED' };
        })().finally(() => {
            loadingPromise = null;
        });
        return loadingPromise;
    };

    const consumeReady = (): { consumed: boolean; reason?: RewardedAdFailureReason } => {
        if (snapshot.status !== 'READY') {
            return {
                consumed: false,
                reason: snapshot.lastFailureReason || (snapshot.status === 'SHOWING' ? 'BUSY' : 'UNAVAILABLE'),
            };
        }
        update('SHOWING', snapshot.attempts);
        return { consumed: true };
    };

    const refreshAfterDismissal = (): Promise<RewardedAdAvailabilityResult> => {
        if (loadingPromise) return loadingPromise;
        update('IDLE', 0);
        return preload();
    };

    const invalidate = (reason: RewardedAdFailureReason = 'UNAVAILABLE') => {
        update(reason === 'OFFLINE' ? 'OFFLINE' : 'UNAVAILABLE', snapshot.attempts, reason);
    };

    return {
        preload,
        consumeReady,
        refreshAfterDismissal,
        invalidate,
        getSnapshot: (): RewardedAdAvailabilitySnapshot => ({ ...snapshot }),
    };
};
