export type IndexedDbOperationErrorCode = 'TIMEOUT' | 'BLOCKED' | 'ABORTED' | 'FAILED';

export class IndexedDbOperationError extends Error {
    readonly code: IndexedDbOperationErrorCode;
    readonly operation: string;
    readonly cause?: unknown;
    /** Phase 1 (2026-11-17): a timeout after which the device reported neither the abort nor the commit, so the
     *  write may still land. Callers re-read what they wrote before retrying. */
    outcomeUnknown?: boolean;

    constructor(code: IndexedDbOperationErrorCode, operation: string, cause?: unknown) {
        const detail = code === 'BLOCKED'
            ? 'Another tab or an older game session is blocking save storage.'
            : code === 'TIMEOUT'
                ? 'The device storage operation took too long.'
                : code === 'ABORTED'
                    ? 'The device stopped the storage operation before it completed.'
                    : 'The device storage operation failed.';
        super(`${detail} (${operation})`);
        this.name = 'IndexedDbOperationError';
        this.code = code;
        this.operation = operation;
        this.cause = cause;
    }
}

interface ClosableDatabase {
    close(): void;
}

export interface IndexedDbOpenRequestLike<TDatabase extends ClosableDatabase> {
    error: unknown;
    result: TDatabase;
    onblocked: ((event?: unknown) => void) | null;
    onerror: ((event?: unknown) => void) | null;
    onsuccess: ((event?: unknown) => void) | null;
}

export interface IndexedDbTransactionLike {
    error: unknown;
    abort(): void;
    oncomplete: ((event?: unknown) => void) | null;
    onerror: ((event?: unknown) => void) | null;
    onabort: ((event?: unknown) => void) | null;
}

export interface IndexedDbWaitOptions {
    operation: string;
    timeoutMs?: number;
    abortedError?: Error;
}

export const DEFAULT_INDEXED_DB_TIMEOUT_MS = 12_000;

const safeTimeoutMs = (value?: number) => Math.max(1, value ?? DEFAULT_INDEXED_DB_TIMEOUT_MS);

export const waitForIndexedDbOpen = <TDatabase extends ClosableDatabase>(
    request: IndexedDbOpenRequestLike<TDatabase>,
    options: IndexedDbWaitOptions,
): Promise<TDatabase> => new Promise((resolve, reject) => {
    let settled = false;
    let blocked = false;
    const timer = globalThis.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new IndexedDbOperationError(blocked ? 'BLOCKED' : 'TIMEOUT', options.operation));
    }, safeTimeoutMs(options.timeoutMs));
    const rejectOnce = (error: IndexedDbOperationError) => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timer);
        reject(error);
    };

    request.onblocked = () => {
        blocked = true;
    };
    request.onerror = () => rejectOnce(new IndexedDbOperationError('FAILED', options.operation, request.error));
    request.onsuccess = () => {
        if (settled) {
            request.result.close();
            return;
        }
        settled = true;
        globalThis.clearTimeout(timer);
        resolve(request.result);
    };
});

/** Phase 1 (2026-11-17): how long a timed-out transaction gets to report its abort (or its commit) before the
 *  outcome counts as unknown. */
export const INDEXED_DB_ABORT_GRACE_MS = 5_000;
/** Phase 1 (2026-11-17): the longest a write may wait for IndexedDB to start it (behind another write) when its
 *  time limit counts from the start (watchIndexedDbTransaction with handOver). It then counts as a timeout too. */
export const INDEXED_DB_HAND_OVER_LIMIT_MS = 120_000;

/**
 * Watches a transaction. The time limit starts at once, or, with `handOver: true`, only when the caller says
 * IndexedDB has started the transaction (handedOver(), called from its first request's answer), so time spent
 * queued behind another write no longer counts (week-speed plan Phase 1, item 3).
 *
 * Phase 1 (2026-11-17), plan item 3: a timeout no longer rejects first and aborts after. The transaction is aborted
 * first, and the promise settles on what the device then reports: the abort (TIMEOUT, nothing was written) or the
 * commit (it finished after all: resolved). If neither comes within INDEXED_DB_ABORT_GRACE_MS, the TIMEOUT carries
 * outcomeUnknown. Before, a commit could land after the caller had been told the write failed.
 */
export const watchIndexedDbTransaction = (
    transaction: IndexedDbTransactionLike,
    options: IndexedDbWaitOptions & { handOver?: boolean },
): { completion: Promise<void>; handedOver: () => void } => {
    let handedOver: () => void = () => undefined;
    const completion = new Promise<void>((resolve, reject) => {
        let settled = false;
        let timedOut = false;
        let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
        let graceTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
        const clearTimers = () => {
            if (timer !== undefined) globalThis.clearTimeout(timer);
            if (graceTimer !== undefined) globalThis.clearTimeout(graceTimer);
        };
        const resolveOnce = () => {
            if (settled) return;
            settled = true;
            clearTimers();
            resolve();
        };
        const rejectOnce = (error: IndexedDbOperationError) => {
            if (settled) return;
            settled = true;
            clearTimers();
            reject(error);
        };
        const onTimeout = () => {
            if (settled || timedOut) return;
            timedOut = true;
            try {
                transaction.abort();
            } catch {
                // It may have finished between the timer and abort(): its complete event settles it below.
            }
            graceTimer = globalThis.setTimeout(() => {
                const error = new IndexedDbOperationError('TIMEOUT', options.operation);
                error.outcomeUnknown = true;
                rejectOnce(error);
            }, INDEXED_DB_ABORT_GRACE_MS);
        };
        const startLimit = () => {
            if (settled || timedOut) return;
            if (timer !== undefined) globalThis.clearTimeout(timer);
            timer = globalThis.setTimeout(onTimeout, safeTimeoutMs(options.timeoutMs));
        };
        handedOver = startLimit;
        if (options.handOver) timer = globalThis.setTimeout(onTimeout, INDEXED_DB_HAND_OVER_LIMIT_MS);
        else startLimit();

        transaction.oncomplete = resolveOnce;
        transaction.onerror = () => rejectOnce(timedOut
            ? new IndexedDbOperationError('TIMEOUT', options.operation, transaction.error)
            : new IndexedDbOperationError('FAILED', options.operation, transaction.error));
        transaction.onabort = () => rejectOnce(timedOut
            ? new IndexedDbOperationError('TIMEOUT', options.operation, transaction.error)
            : options.abortedError
                ? new IndexedDbOperationError('ABORTED', options.operation, options.abortedError)
                : new IndexedDbOperationError('ABORTED', options.operation, transaction.error));
    });
    return { completion, handedOver: () => handedOver() };
};

export const waitForIndexedDbTransaction = (
    transaction: IndexedDbTransactionLike,
    options: IndexedDbWaitOptions,
): Promise<void> => watchIndexedDbTransaction(transaction, options).completion;
