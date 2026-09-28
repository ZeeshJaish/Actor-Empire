import assert from 'node:assert/strict';
import {
    classifyRewardedAdLoadFailure,
    createRewardedAdAvailabilityController,
} from '../services/rewardedAdAvailability';
import {
    emitRewardedAdDiagnostic,
    subscribeRewardedAdDiagnostics,
    type RewardedAdDiagnostic,
} from '../services/rewardedAdDiagnostics';
import {
    runRewardedAdLifecycle,
    type RewardedAdGateway,
    type RewardedAdLifecycleEvent,
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

// Break caught: concurrent startup and player requests must share one native load.
{
    const nativeLoad = deferred<void>();
    let loadCalls = 0;
    const controller = createRewardedAdAvailabilityController({
        load: async () => {
            loadCalls += 1;
            await nativeLoad.promise;
        },
        isOnline: () => true,
        wait: async () => undefined,
    });
    const startup = controller.preload();
    const playerRequest = controller.preload();
    assert.equal(loadCalls, 1);
    nativeLoad.resolve();
    assert.equal((await startup).ready, true);
    assert.equal((await playerRequest).ready, true);
    assert.equal(controller.getSnapshot().status, 'READY');
}

// Break caught: transient loading failures use bounded exponential backoff.
{
    let loadCalls = 0;
    const waits: number[] = [];
    const controller = createRewardedAdAvailabilityController({
        load: async () => {
            loadCalls += 1;
            if (loadCalls < 3) throw new Error('temporary SDK load failure');
        },
        isOnline: () => true,
        wait: async delayMs => { waits.push(delayMs); },
        retryDelaysMs: [500, 1_000],
    });
    const result = await controller.preload();
    assert.deepEqual(result, { ready: true, attempts: 3 });
    assert.deepEqual(waits, [500, 1_000]);
    assert.equal(loadCalls, 3);
}

// Break caught: no-fill and offline are distinct and are never hammered with retries.
{
    assert.equal(classifyRewardedAdLoadFailure({ code: 3, message: 'No fill' }, true), 'NO_FILL');
    assert.equal(classifyRewardedAdLoadFailure({ code: 2, message: 'Network Error' }, true), 'OFFLINE');
    assert.equal(classifyRewardedAdLoadFailure(new Error('anything'), false), 'OFFLINE');

    let loadCalls = 0;
    const noFill = createRewardedAdAvailabilityController({
        load: async () => {
            loadCalls += 1;
            throw { code: 3, message: 'No fill' };
        },
        isOnline: () => true,
        wait: async () => undefined,
    });
    assert.deepEqual(await noFill.preload(), { ready: false, attempts: 1, reason: 'NO_FILL' });
    assert.equal(loadCalls, 1);

    const offline = createRewardedAdAvailabilityController({
        load: async () => { throw new Error('must not load while offline'); },
        isOnline: () => false,
        wait: async () => undefined,
    });
    assert.deepEqual(await offline.preload(), { ready: false, attempts: 0, reason: 'OFFLINE' });
}

// Break caught: a consumed ad cannot be reused, and dismissal starts exactly one reload.
{
    let loadCalls = 0;
    const controller = createRewardedAdAvailabilityController({
        load: async () => { loadCalls += 1; },
        isOnline: () => true,
        wait: async () => undefined,
    });
    await controller.preload();
    assert.deepEqual(controller.consumeReady(), { consumed: true });
    assert.equal(controller.getSnapshot().status, 'SHOWING');
    assert.deepEqual(await controller.preload(), { ready: false, attempts: 0, reason: 'BUSY' });
    assert.equal((await controller.refreshAfterDismissal()).ready, true);
    assert.equal(loadCalls, 2);
}

// Break caught: lifecycle telemetry must distinguish loaded, shown, rewarded and dismissal.
{
    const listeners = new Map<RewardedAdLifecycleEvent, (payload?: unknown) => void>();
    const gateway: RewardedAdGateway = {
        prepare: async () => ({ adUnitId: 'test' }),
        show: async () => new Promise(() => undefined),
        addListener: async (event, callback) => {
            listeners.set(event, callback);
            return { remove: () => { listeners.delete(event); } };
        },
    };
    const transitions: string[] = [];
    const pending = runRewardedAdLifecycle(gateway, {
        onTransition: transition => transitions.push(transition.state),
    });
    while (!transitions.includes('SHOWING')) await Promise.resolve();
    listeners.get('SHOWED')?.();
    listeners.get('REWARDED')?.({ type: 'coin', amount: 1 });
    assert.equal((await pending).success, true);
    assert.deepEqual(transitions, ['LOADING', 'READY', 'SHOWING', 'SHOWN', 'REWARDED']);
}

// Break caught: a rejected native prepare call must retain its no-fill classification.
{
    const gateway: RewardedAdGateway = {
        prepare: async () => { throw { code: 3, message: 'No fill' }; },
        show: async () => undefined,
        addListener: async () => ({ remove: () => undefined }),
    };
    assert.deepEqual(await runRewardedAdLifecycle(gateway), {
        success: false,
        reason: 'NO_FILL',
        stage: 'LOAD',
    });
}

// Break caught: every placement must emit request and terminal telemetry centrally.
{
    const received: RewardedAdDiagnostic[] = [];
    const unsubscribe = subscribeRewardedAdDiagnostics(event => received.push(event));
    const coordinator = createRewardedAdCoordinator(async () => ({ success: true, stage: 'REWARD' }));
    const result = await coordinator.request({
        type: 'REWARDED_ENERGY',
        placement: 'LIFE_EVENT_OPTION',
        contextId: 'event:choice',
    });
    unsubscribe();
    assert.equal(result.success, true);
    assert.deepEqual(received.map(event => event.name), ['reward_ad_requested', 'reward_ad_rewarded']);
    assert.equal(received[0].placement, 'LIFE_EVENT_OPTION');
    assert.equal(received[0].contextId, 'event:choice');
}

// Break caught: analytics subscribers receive structured events once and can detach.
{
    const received: RewardedAdDiagnostic[] = [];
    const unsubscribe = subscribeRewardedAdDiagnostics(event => received.push(event));
    emitRewardedAdDiagnostic({
        name: 'reward_ad_requested',
        requestId: 'request-1',
        type: 'REWARDED_CASH',
        placement: 'STORE_REWARD',
    });
    unsubscribe();
    emitRewardedAdDiagnostic({ name: 'reward_ad_loaded', requestId: 'request-2' });
    assert.equal(received.length, 1);
    assert.equal(received[0].requestId, 'request-1');
}

console.log('Rewarded-ad Phase 7 availability and Phase 8 diagnostics audit passed.');
