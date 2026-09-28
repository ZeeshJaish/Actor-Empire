import assert from 'node:assert/strict';
import type { AdType } from '../types';
import {
    runRewardedAdInitialization,
    runRewardedAdLifecycle,
    type RewardedAdGateway,
    type RewardedAdLifecycleEvent,
    type RewardedAdTimer,
} from '../services/rewardedAdLifecycle';
import { createRewardedAdCoordinator } from '../services/rewardedAdCoordinator';

const deferred = <T,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

class ManualTimer implements RewardedAdTimer {
    private nextId = 1;
    private callbacks = new Map<number, () => void>();

    schedule(callback: () => void): number {
        const id = this.nextId++;
        this.callbacks.set(id, callback);
        return id;
    }

    cancel(id: unknown): void {
        this.callbacks.delete(Number(id));
    }

    fireNext(): void {
        const next = this.callbacks.entries().next().value as [number, () => void] | undefined;
        assert(next, 'Expected an active lifecycle timeout.');
        this.callbacks.delete(next[0]);
        next[1]();
    }

    get activeCount(): number {
        return this.callbacks.size;
    }
}

class FakeRewardedGateway implements RewardedAdGateway {
    readonly listeners = new Map<RewardedAdLifecycleEvent, Set<(payload?: unknown) => void>>();
    readonly showDeferred = deferred<unknown>();
    prepareImpl: () => Promise<unknown> = async () => ({ adUnitId: 'test-rewarded' });
    showImpl: () => Promise<unknown> = () => this.showDeferred.promise;
    prepareCalls = 0;
    showCalls = 0;
    removedListeners = 0;
    failListenerEvent?: RewardedAdLifecycleEvent;

    async prepare(): Promise<unknown> {
        this.prepareCalls += 1;
        return this.prepareImpl();
    }

    async show(): Promise<unknown> {
        this.showCalls += 1;
        return this.showImpl();
    }

    async addListener(event: RewardedAdLifecycleEvent, callback: (payload?: unknown) => void) {
        if (event === this.failListenerEvent) throw new Error(`listener failed: ${event}`);
        const listeners = this.listeners.get(event) || new Set();
        listeners.add(callback);
        this.listeners.set(event, listeners);
        return {
            remove: async () => {
                if (listeners.delete(callback)) this.removedListeners += 1;
            },
        };
    }

    emit(event: RewardedAdLifecycleEvent, payload?: unknown): void {
        this.listeners.get(event)?.forEach(listener => listener(payload));
    }
}

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const flushUntil = async (condition: () => boolean) => {
    for (let attempt = 0; attempt < 20 && !condition(); attempt += 1) {
        await flush();
    }
    assert.equal(condition(), true, 'Expected the lifecycle to reach the requested test state.');
};

// Break caught: partial listener setup must not leak callbacks into later ad sessions.
{
    const gateway = new FakeRewardedGateway();
    gateway.failListenerEvent = 'DISMISSED';
    const result = await runRewardedAdLifecycle(gateway, { timer: new ManualTimer() });
    assert.deepEqual(result, { success: false, reason: 'ERROR', stage: 'INIT' });
    assert.equal(gateway.removedListeners, 1);
    assert.equal(gateway.listeners.get('REWARDED')?.size, 0);
}

// Break caught: native dismissal used to leave showRewardVideoAd pending forever.
{
    const gateway = new FakeRewardedGateway();
    const timer = new ManualTimer();
    const pending = runRewardedAdLifecycle(gateway, { timer, loadTimeoutMs: 10, showTimeoutMs: 20 });
    await flushUntil(() => gateway.showCalls === 1);
    assert.equal(gateway.showCalls, 1);
    gateway.emit('DISMISSED');
    const result = await pending;
    assert.deepEqual(result, { success: false, reason: 'USER_DISMISSED', stage: 'SHOW' });
    assert.equal(timer.activeCount, 0);
    assert.equal(gateway.removedListeners, 5);
}

// Break caught: reward followed by dismissal must resolve once as success, never as cancellation.
{
    const gateway = new FakeRewardedGateway();
    const timer = new ManualTimer();
    const pending = runRewardedAdLifecycle(gateway, { timer });
    await flushUntil(() => gateway.showCalls === 1);
    gateway.emit('REWARDED', { type: 'coin', amount: 1 });
    gateway.emit('DISMISSED');
    const result = await pending;
    assert.equal(result.success, true);
    assert.equal(result.stage, 'REWARD');
    assert.equal(timer.activeCount, 0);
}

// Break caught: failed-to-show events previously left the caller waiting on the unresolved native promise.
{
    const gateway = new FakeRewardedGateway();
    const timer = new ManualTimer();
    const pending = runRewardedAdLifecycle(gateway, { timer });
    await flushUntil(() => gateway.showCalls === 1);
    gateway.emit('FAILED_TO_SHOW', { code: 3, message: 'activity unavailable' });
    const result = await pending;
    assert.deepEqual(result, { success: false, reason: 'SHOW_FAILED', stage: 'SHOW' });
}

// Break caught: neither loading nor showing may wait forever when the SDK emits nothing.
{
    const loadGateway = new FakeRewardedGateway();
    const loadTimer = new ManualTimer();
    loadGateway.prepareImpl = () => new Promise(() => undefined);
    const loading = runRewardedAdLifecycle(loadGateway, { timer: loadTimer });
    await flushUntil(() => loadTimer.activeCount === 1);
    loadTimer.fireNext();
    assert.deepEqual(await loading, { success: false, reason: 'LOAD_TIMEOUT', stage: 'LOAD' });

    const showGateway = new FakeRewardedGateway();
    const showTimer = new ManualTimer();
    const showing = runRewardedAdLifecycle(showGateway, { timer: showTimer });
    await flushUntil(() => showGateway.showCalls === 1);
    showTimer.fireNext();
    assert.deepEqual(await showing, { success: false, reason: 'SHOW_TIMEOUT', stage: 'SHOW' });
}

// Break caught: consent or SDK initialization must not hold the global coordinator lock forever.
{
    const timer = new ManualTimer();
    const pending = runRewardedAdInitialization(
        () => new Promise(() => undefined),
        { timer, timeoutMs: 10 },
    );
    await flushUntil(() => timer.activeCount === 1);
    timer.fireNext();
    assert.equal(await pending, false);
    assert.equal(timer.activeCount, 0);
}

// Break caught: an SDK rejection must become a terminal result rather than escaping into every caller.
{
    const gateway = new FakeRewardedGateway();
    gateway.showImpl = async () => { throw new Error('native show rejected'); };
    const result = await runRewardedAdLifecycle(gateway, { timer: new ManualTimer() });
    assert.deepEqual(result, { success: false, reason: 'SHOW_FAILED', stage: 'SHOW' });
}

// Break caught: double taps must not launch two global rewarded-ad sessions.
{
    const firstRun = deferred<{ success: boolean; stage: 'REWARD' }>();
    let runnerCalls = 0;
    const coordinator = createRewardedAdCoordinator(async (_type: AdType) => {
        runnerCalls += 1;
        return firstRun.promise;
    });
    const first = coordinator.request({ type: 'REWARDED_CASH', placement: 'STORE_REWARD' });
    const overlapping = await coordinator.request({ type: 'REWARDED_ENERGY', placement: 'STORE_REWARD' });
    assert.equal(runnerCalls, 1);
    assert.equal(overlapping.success, false);
    assert.equal(overlapping.reason, 'BUSY');

    firstRun.resolve({ success: true, stage: 'REWARD' });
    assert.equal((await first).success, true);
    assert.equal(coordinator.getActiveRequest(), null);
}

// Break caught: a rejected runner must release the coordinator lock for the next request.
{
    let runnerCalls = 0;
    const coordinator = createRewardedAdCoordinator(async () => {
        runnerCalls += 1;
        if (runnerCalls === 1) throw new Error('unexpected bridge failure');
        return { success: true, stage: 'REWARD' };
    });
    const failed = await coordinator.request({ type: 'REWARDED_CASH', placement: 'DEBT_BAILOUT' });
    assert.equal(failed.success, false);
    assert.equal(failed.reason, 'ERROR');
    const recovered = await coordinator.request({ type: 'REWARDED_CASH', placement: 'DEBT_BAILOUT' });
    assert.equal(recovered.success, true);
    assert.equal(runnerCalls, 2);
}

console.log('Rewarded-ad Phase 1 lifecycle and Phase 2 coordinator audit passed.');
