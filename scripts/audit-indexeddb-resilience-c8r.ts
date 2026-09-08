import assert from 'node:assert/strict';
import {
    IndexedDbOperationError,
    waitForIndexedDbOpen,
    waitForIndexedDbTransaction,
} from '../services/indexedDbResilience';

type FakeOpenRequest = {
    error: Error | null;
    result: { close: () => void };
    onblocked: (() => void) | null;
    onerror: (() => void) | null;
    onsuccess: (() => void) | null;
};

const completedTransaction = {
    error: null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    abort: () => undefined,
};
const completed = waitForIndexedDbTransaction(completedTransaction, {
    operation: 'test completion',
    timeoutMs: 50,
});
completedTransaction.oncomplete?.();
await completed;

let abortCount = 0;
const stalledTransaction = {
    error: null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    abort: () => {
        abortCount += 1;
        stalledTransaction.onabort?.();
    },
};
await assert.rejects(
    waitForIndexedDbTransaction(stalledTransaction, {
        operation: 'stalled verified save',
        timeoutMs: 8,
    }),
    (error: unknown) => error instanceof IndexedDbOperationError
        && error.code === 'TIMEOUT'
        && error.operation === 'stalled verified save',
);
assert.equal(abortCount, 1, 'A timed-out writable transaction must be aborted exactly once.');

let closedLateDatabase = false;
const blockedOpen: FakeOpenRequest = {
    error: null,
    result: { close: () => { closedLateDatabase = true; } },
    onblocked: null,
    onerror: null,
    onsuccess: null,
};
const blockedPromise = waitForIndexedDbOpen(blockedOpen, {
    operation: 'open saves database',
    timeoutMs: 8,
});
blockedOpen.onblocked?.();
await assert.rejects(
    blockedPromise,
    (error: unknown) => error instanceof IndexedDbOperationError && error.code === 'BLOCKED',
);
blockedOpen.onsuccess?.();
assert.equal(closedLateDatabase, true, 'A database opened after the caller timed out must be closed.');

console.log('IndexedDB resilience C8R audit passed.');
