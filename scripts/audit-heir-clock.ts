/**
 * #206: the heir's company survives. Through the app's own handoff, the same company carries on with no death and with
 * an heir, side by side: the heir's first 13 weeks must stay within 5%. Nothing dated is left in the old clock; "for ever"
 * stays for ever; the population's long curves never go back.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { rebaseLegacyWeeks } from '../services/legacyWorldClock';
import { continueThroughAppHandler } from './fixtures/legacySuccessionHandler';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const millions = (value: number) => `${(value / 1e6).toFixed(2)}M`;
const step = async (player: Player) => (await processGameWeek(player)).player;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const main = async () => {
    /* the rule itself */
    /* #212: a part whose clock the caller moves itself is left alone, or its dates would move twice */
    const left = rebaseLegacyWeeks({ absoluteWeek: 100, own: { absoluteWeek: 100, inner: { lastAbsoluteWeek: 100 } } }, 40, '', new Set(['own']));
    assert.equal(left.absoluteWeek, 60);
    assert.deepEqual(left.own, { absoluteWeek: 100, inner: { lastAbsoluteWeek: 100 } }, 'left alone, all the way down');
    const moved = rebaseLegacyWeeks({ absoluteWeek: 100, startAbsoluteWeek: 120, endsAtAbsoluteWeek: 9007199254740991, epochAbsoluteWeek: 728, installmentAbsoluteWeeks: [130, 140], weeklyHours: 100 }, 50);
    assert.deepEqual(moved, { absoluteWeek: 50, startAbsoluteWeek: 70, endsAtAbsoluteWeek: 9007199254740991, epochAbsoluteWeek: 728, installmentAbsoluteWeeks: [80, 90], weeklyHours: 100 });
    pass('every date moves; "for ever", the epoch and plain numbers do not');

    /* the same company, with no death and with an heir */
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'heir-clock', name: 'Old Founder', age: 58, currentWeek: 1 });
    let base = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    base = { ...base, energy: { current: 100, max: 100 }, pendingEvents: [], money: 1e9 };
    const child = { id: 'child_clock', name: 'Aarav Founder', relation: 'Child', closeness: 80, age: 30, gender: 'MALE', image: '', lastInteractionWeek: 0 } as Player['relationships'][number];
    const family = { ...copy(base), relationships: [...(base.relationships || []), child] } as Player;
    let heir = continueThroughAppHandler({ ...copy(family), flags: { ...family.flags, isDead: true } } as Player, child);
    let alive = copy(family);
    const offset = getAbsoluteWeek(family.age, family.currentWeek) - getAbsoluteWeek(heir.age, heir.currentWeek);
    assert.ok(offset > 0, 'the heir is younger');

    /* nothing in the world is left on the old clock */
    const heirWeek = getAbsoluteWeek(heir.age, heir.currentWeek);
    const world = heir.world as unknown as Record<string, { lastProcessedAbsoluteWeek?: number }>;
    ['worldPopulation', 'worldStreamingCustomers', 'worldStreamingViewing', 'worldStreamingAudienceChoice', 'worldStreamingCompetition'].forEach(key => {
        const last = world[key]?.lastProcessedAbsoluteWeek;
        if (last !== undefined) assert.ok(last <= heirWeek + 1, `${key}: last run ${last}, the heir is at ${heirWeek}`);
    });
    assert.equal((heir.world?.worldPopulation as unknown as { clockOffsetWeeks?: number })?.clockOffsetWeeks, offset, 'the world keeps its own clock');
    assert.equal((heir.world?.worldPopulation as unknown as { epochAbsoluteWeek: number }).epochAbsoluteWeek, 728);
    assert.ok((heir.world?.industryPeople?.lastWeek ?? 0) <= heirWeek, 'the people too');
    pass(`the handoff moves the world back ${offset} weeks with the heir (${Math.round(offset / 52)} years); the population keeps count`);

    const populationBefore = (alive.world?.worldPopulation as unknown as { global: { population: number } }).global.population;
    const say = (label: string, player: Player) => `${label} ${millions(platformOf(player).metrics.subscribers)}`;
    const checks = [1, 3, 6, 13];
    let worst = 0;
    for (let week = 1; week <= 13; week += 1) {
        alive = await step(alive);
        heir = await step(heir);
        if (checks.includes(week)) {
            const a = platformOf(alive).metrics.subscribers;
            const h = platformOf(heir).metrics.subscribers;
            const gap = Math.abs(h / a - 1);
            worst = Math.max(worst, gap);
            console.log(`  week ${week}: ${say('alive', alive)}, ${say('heir', heir)} (${(gap * 100).toFixed(1)}% apart)`);
            assert.ok(gap <= 0.05, `week ${week}: the heir is ${(gap * 100).toFixed(1)}% from the same company with no death`);
        }
    }
    const populationAfter = (heir.world?.worldPopulation as unknown as { global: { population: number } }).global.population;
    assert.ok(populationAfter >= populationBefore * 0.99, `the world does not shrink: ${populationBefore} → ${populationAfter}`);
    pass(`13 weeks on: the heir stays within ${(worst * 100).toFixed(1)}% of the same company with no death; the population did not go back`);

    console.log(`Heir clock audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
