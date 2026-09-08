export type IndexedDbOperationErrorCode = 'TIMEOUT' | 'BLOCKED' | 'ABORTED' | 'FAILED';

export class IndexedDbOperationError extends Error {
    readonly code: IndexedDbOperationErrorCode;
    readonly operation: string;
    readonly cause?: unknown;

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

export const waitForIndexedDbTransaction = (
    transaction: IndexedDbTransactionLike,
    options: IndexedDbWaitOptions,
): Promise<void> => new Promise((resolve, reject) => {
    let settled = false;
    const timer = globalThis.setTimeout(() => {
        if (settled) return;
        settled = true;
        const timeoutError = new IndexedDbOperationError('TIMEOUT', options.operation);
        reject(timeoutError);
        try {
            transaction.abort();
        } catch {
            // A transaction may finish between the timeout firing and abort().
        }
    }, safeTimeoutMs(options.timeoutMs));
    const resolveOnce = () => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timer);
        resolve();
    };
    const rejectOnce = (error: IndexedDbOperationError) => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timer);
        reject(error);
    };

    transaction.oncomplete = resolveOnce;
    transaction.onerror = () => rejectOnce(new IndexedDbOperationError('FAILED', options.operation, transaction.error));
    transaction.onabort = () => rejectOnce(
        options.abortedError
            ? new IndexedDbOperationError('ABORTED', options.operation, options.abortedError)
            : new IndexedDbOperationError('ABORTED', options.operation, transaction.error),
    );
});
