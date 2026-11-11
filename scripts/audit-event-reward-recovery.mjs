import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, transformSync } from 'esbuild';
import ts from 'typescript';

const storage = new Map();
globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
};

let onEarned;
let dismiss;
let adsShown = 0;
let recoveryEffect;
let recoveryRef;
globalThis.eventAdTest = {
    showAd: (type, options) => {
        assert.equal(type, 'REWARDED_BAILOUT');
        adsShown++;
        onEarned = options.onEarned;
        return new Promise(resolve => { dismiss = resolve; });
    },
    useRef: initial => recoveryRef ??= { current: initial },
    useEffect: effect => { recoveryEffect = effect; },
};

const bundle = await build({
    entryPoints: ['services/eventRewardAd.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    plugins: [{
        name: 'event-recovery-doubles',
        setup(plugin) {
            plugin.onResolve({ filter: /^(react|\.\/adLogic)$/ }, ({ path }) => ({ path, namespace: 'double' }));
            plugin.onLoad({ filter: /.*/, namespace: 'double' }, ({ path }) => ({
                contents: path === 'react'
                    ? 'export const { useEffect, useRef } = globalThis.eventAdTest;'
                    : 'export const { showAd } = globalThis.eventAdTest;',
            }));
        },
    }],
});
const { clearEventReward, eventRewardKey, readEventReward, useEventRewardRecovery, watchEventRewardAd } =
    await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const bind = (file, name, scope, hookCallback = false) => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    const visit = node => {
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) {
            handler = hookCallback ? node.initializer?.arguments?.[1] : node.initializer;
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    assert.ok(handler, `${file} must define ${name}`);
    const { code } = transformSync(`const callback = ${handler.getText(source)};`, { loader: 'ts' });
    return new Function(...Object.keys(scope), code + '\nreturn callback;')(...Object.values(scope));
};

const noop = () => {};
const golden = { isGolden: true, id: 'golden', index: 0 };
const cases = [
    ['components/StreamingIncidentEventModal.tsx', 'watchAd', [], 'AD'],
    ['components/originals/OriginalIssueModal.tsx', 'watchAd', [], 'AD'],
    ['components/ProductionCrisisModal.tsx', 'handleChoice', [golden], '0'],
    ['components/LifeEventModal.tsx', 'handleOptionClick', [golden, 0], 'id:golden'],
];
for (const [file, handler, args, choice] of cases) {
    const key = eventRewardKey(1, 'career', file);
    const otherKeys = [eventRewardKey(2, 'career', file), eventRewardKey(1, 'other-career', file), eventRewardKey(1, 'career', 'other-event')];
    let grants = 0;
    const grant = () => { grants++; };
    const rewardChoice = option => `id:${option.id}`;
    const recover = bind(file, 'watchReward', {
        project: {}, options: [golden], view: { open: true }, lifeEvent: { options: [golden] },
        answer: grant, applyChoice: grant, applyOption: grant, rewardChoice,
    }, true);
    recoveryRef = null;
    const watchReward = useEventRewardRecovery(key, recover);
    recoveryEffect();
    const play = bind(file, handler, {
        watchReward, applyChoice: grant, answer: grant, applyOption: grant, rewardChoice,
        busy: false, setBusy: noop, setNotice: noop, setResolveError: noop, setAdNotice: noop,
        setIsProcessingAd: noop, tr: value => value, noteAdClosed: noop,
        player: {}, event: {}, setCrashContext: noop, addBreadcrumb: noop, trackGameEvent: noop,
        getLifeEventTitle: () => '', getOptionLabel: () => '',
    });

    let pending = play(...args);
    dismiss({ success: false, reason: 'NOT_COMPLETED' });
    await pending;
    assert.equal(readEventReward(key), null);
    assert.equal(grants, 0);
    pending = play(...args);
    onEarned();
    assert.equal(readEventReward(key), choice, 'must record before native dismissal');
    for (const otherKey of otherKeys) assert.equal(readEventReward(otherKey), null);
    assert.equal(grants, 0);
    const shows = adsShown;
    assert.equal((await watchEventRewardAd(key, choice)).success, false, 'cannot start a second ad while one is active');
    dismiss({ success: true });
    await pending;
    recoveryEffect();
    assert.equal(grants, 1, 'normal completion applies once, even if the popup renders again');

    // Simulate a new mount from the same saved pending event and the durable earned receipt.
    grants = 0;
    recoveryRef = null;
    useEventRewardRecovery(key, recover);
    recoveryEffect();
    recoveryEffect();
    assert.equal(grants, 1, 'reopen applies the earned option once');
    assert.equal(adsShown, shows, 'recovery shows no additional ad');

    const queued = { id: 'career', pendingEvents: [{ id: file }, { id: 'next' }] };
    let saved;
    let completeSave;
    const resolveEvent = bind('App.tsx', 'resolveQueuedEventSafely', {
        currentSlot: 1, eventRewardKey, readEventReward, clearEventReward,
        prepareExternalPlayerUpdateForUi: player => player, setPlayer: noop,
        persistSlotSave: (slot, player, options) => {
            assert.equal(slot, 1);
            assert.equal(options.rethrow, true);
            saved = player;
            return new Promise(resolve => { completeSave = resolve; });
        },
    });
    resolveEvent(queued, queued, file, 'Reward applied');
    assert.deepEqual(saved.pendingEvents, [{ id: 'next' }]);
    assert.equal(readEventReward(key), choice, 'receipt remains until verified save completes');
    completeSave();
    await Promise.resolve();
    assert.equal(readEventReward(key), null);
    console.log(`PASS ${file} — earned receipt, recovery and save ordering`);
}
