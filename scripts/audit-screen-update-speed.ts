/**
 * #256: Zeesh (2026-11-05), asked "Studio screens aur wizards me yahi 200 ms ka lag abhi bhi hai. Wahan bhi theek kar dun?": "haaa".
 * An update from a screen passes what it did not touch through the migration instead of copying and re-reading it. This holds what must not change: the same
 * save comes out, what a screen did touch is still repaired, nothing it passes through is written to, and the speed stays.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareExternalPlayerUpdateForUi, prepareProcessedWeekForUi } from '../services/playerUiState';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';

const pass = (label: string) => console.log(`PASS ${label}`);
const LEGACY = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Old';
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'screen-update-audit', name: 'Screen Update', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const deepFreeze = (value: unknown, seen = new WeakSet<object>()): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    Object.freeze(value);
    Object.values(value).forEach(item => deepFreeze(item, seen));
};
const median = (values: number[]) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];
const differences = (left: Record<string, unknown>, right: Record<string, unknown>) => [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));

async function main() {
    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    const live = prepareProcessedWeekForUi(migratePlayerSave({ ...built, pendingEvents: [] }));
    const settledUpdate = prepareExternalPlayerUpdateForUi({ ...live, money: live.money + 1 });

    /* ---- the same save comes out */
    const full = prepareProcessedWeekForUi(migratePlayerSave(structuredClone(settledUpdate)));
    const fromScreen = prepareExternalPlayerUpdateForUi({ ...settledUpdate });
    const topLevel = differences(full as never, fromScreen as never);
    assert.deepEqual(topLevel.filter(key => key !== 'world'), [], `a screen's update and a full migration differ in: ${topLevel.join(', ')}`);
    const world = differences(full.world as never, fromScreen.world as never);
    assert.deepEqual(world, [], `and in the world: ${world.join(', ')}`);
    pass('a screen\'s update gives the same save as a full migration');

    /* ---- what it passes through keeps its identity, and what is written to it would throw */
    const shared = fromScreen.world;
    const again = prepareExternalPlayerUpdateForUi({ ...fromScreen, money: fromScreen.money + 1 });
    ['worldStreamingViewing', 'worldStreamingCustomers', 'worldAudienceEconomy', 'worldAudienceParticipation', 'streamingPlatformEcosystem'].forEach(key => {
        assert.equal((again.world as never)[key], (shared as never)[key], `${key} is passed through`);
    });
    deepFreeze(again.world.worldStreamingViewing);
    deepFreeze(again.world.platforms);
    deepFreeze(again.ownedStreamingPlatform);
    const frozen = prepareExternalPlayerUpdateForUi({ ...again, money: again.money + 1 });
    assert.equal(frozen.money, again.money + 1);
    pass('what a screen did not touch keeps its identity, and is not written to');

    /* ---- what a screen did touch is still read and repaired */
    const touchedService = prepareExternalPlayerUpdateForUi({ ...again, ownedStreamingPlatform: { ...structuredClone(again.ownedStreamingPlatform), metrics: undefined as never } });
    assert.equal(typeof touchedService.ownedStreamingPlatform.metrics?.subscribers, 'number', 'a service a screen replaced is normalised');
    const touchedWorld = prepareExternalPlayerUpdateForUi({ ...again, world: { ...again.world, platforms: { ...again.world.platforms, NETFLIX: { ...again.world.platforms.NETFLIX, name: 'Netflix' } } } });
    assert.notEqual(touchedWorld.world.platforms, again.world.platforms, 'a slice a screen replaced goes through the normaliser');
    const legacy = prepareExternalPlayerUpdateForUi({ ...again, avatar: LEGACY, x: { ...again.x, feed: [{ ...(again.x.feed[0] || {}), authorAvatar: LEGACY } as never, ...again.x.feed] } });
    assert.ok(!JSON.stringify(legacy.x.feed[0]).includes('pixel-art'), 'a retired picture in what a screen wrote is replaced');
    assert.ok(!legacy.avatar.includes('pixel-art'));
    pass('what a screen did touch is still read and repaired');

    /* ---- a fresh or imported save takes the whole road */
    const legacySave = { ...structuredClone(INITIAL_PLAYER), id: 'old-save', name: 'Old Save', avatar: LEGACY, world: { ...structuredClone(INITIAL_PLAYER.world), studios: undefined as never } };
    const repaired = prepareExternalPlayerUpdateForUi(legacySave);
    assert.ok(repaired.world.studios && Object.keys(repaired.world.studios).length > 0, 'an old save still gets its defaults');
    assert.ok(!repaired.avatar.includes('pixel-art'));
    pass('a save from outside still takes the whole road');

    /* ---- a new line stays when the log is full */
    const fullLog: Player = { ...again, logs: Array.from({ length: 50 }, (_, index) => ({ week: 1, year: again.age, message: `old ${index}`, type: 'neutral' as const })) };
    const withLine = prepareExternalPlayerUpdateForUi({ ...fullLog, logs: [...fullLog.logs, { week: 2, year: again.age, message: 'new line', type: 'positive' as const }] });
    assert.equal(withLine.logs.length, 50);
    assert.equal(withLine.logs.at(-1)?.message, 'new line', 'a screen\'s new line is the one kept, not the one dropped');
    pass('a new line stays when the log is full');

    /* ---- the speed: against the whole road on the same machine, so a busy machine cannot fail it */
    const timed = (run: () => unknown) => { const at = performance.now(); run(); return performance.now() - at; };
    const wholeRoad = Array.from({ length: 5 }, () => timed(() => migratePlayerSave({ ...again, money: again.money + 1 })));
    let state = again;
    const screenRoad = Array.from({ length: 5 }, () => timed(() => { state = prepareExternalPlayerUpdateForUi({ ...state, money: state.money + 1 }); }));
    console.log(`whole road ${Math.round(median(wholeRoad))} ms, a screen's update ${Math.round(median(screenRoad))} ms`);
    assert.ok(median(screenRoad) < median(wholeRoad) * 0.6, 'a screen\'s update stays well under the whole road');
    pass('a screen\'s update stays well under the whole road');
    console.log('screen-update-speed audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
