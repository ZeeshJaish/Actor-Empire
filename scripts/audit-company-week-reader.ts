/**
 * #227: a company's weekly close asked the whole platform again for every store sale, in the weekly loop and in the sales
 * settlement. Both now use the one reader of #6. Same answers, same settlement, far fewer normalisations.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createPlayerStreamingTitleRouteEvaluator, evaluatePlayerStreamingTitleRoute } from '../services/streamingContentAvailability';
import { recordPlayerStreamingAudienceEntitlement, settleWorldStreamingAudienceEntitlements } from '../services/worldEconomy/worldStreamingAudienceChoice';

const pass = (label: string) => console.log(`✓ ${label}`);

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'reader', name: 'Reader Founder', age: 40, currentWeek: 1 });
    const fresh = { ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    let player: Player = await buildStreamingFullPlatformQa(fresh, { processWeek: processGameWeek, persistWeek: async next => next });
    for (let week = 0; week < 2; week += 1) {
        player = (await processGameWeek({ ...player, energy: { current: 100, max: 100 }, pendingEvents: [], stats: { ...player.stats, health: 100, happiness: 100 }, activeHealthConditions: [] })).player;
    }
    const viewing = player.world.worldStreamingViewing!;
    const choice = player.world.worldStreamingAudienceChoice!;
    const week = viewing.lastProcessedAbsoluteWeek;
    const sales = viewing.commercialTransactions || [];
    assert.ok(sales.length > 0, 'the test company sold something in the store');
    assert.equal(choice.lastProcessedAbsoluteWeek, week);

    const routeFor = createPlayerStreamingTitleRouteEvaluator(player, week);
    const asked = [...new Map(sales.map(sale => [JSON.stringify([sale.titleId, sale.countryId, sale.kind]), sale])).values()].slice(0, 120);
    let readerMs = 0;
    let unpreparedMs = 0;
    for (const sale of asked) {
        const a = performance.now();
        const fast = routeFor(sale.titleId, sale.countryId, { kind: sale.kind });
        const b = performance.now();
        const slow = evaluatePlayerStreamingTitleRoute(player, sale.titleId, sale.countryId, week, { kind: sale.kind });
        const c = performance.now();
        readerMs += b - a;
        unpreparedMs += c - b;
        assert.deepEqual(fast, slow);
    }
    pass(`the reader answers ${asked.length} store questions the same as asking each alone`);
    assert.ok(readerMs * 3 < unpreparedMs, `reader ${readerMs.toFixed(0)} ms, asked alone ${unpreparedMs.toFixed(0)} ms`);
    pass(`and much faster: ${readerMs.toFixed(0)} ms against ${unpreparedMs.toFixed(0)} ms`);

    const unsettled = {
        ...choice,
        recordedTransactions: undefined,
        settledViewingFingerprint: undefined,
        entitlements: choice.entitlements.filter(row => row.purchasedAtAbsoluteWeek !== week),
    } as typeof choice;
    let oneByOne = unsettled;
    for (const sale of sales) oneByOne = recordPlayerStreamingAudienceEntitlement(oneByOne, player, sale);
    const settled = settleWorldStreamingAudienceEntitlements(
        { ...player, world: { ...player.world, worldStreamingAudienceChoice: unsettled } }, week,
    ).world.worldStreamingAudienceChoice!;
    assert.deepEqual(settled.entitlements, oneByOne.entitlements);
    assert.deepEqual(settled.recordedTransactions, oneByOne.recordedTransactions);
    pass(`settling ${sales.length} sales gives the same entitlements as recording them one by one`);
};

main().then(() => console.log('company-week-reader audit passed')).catch(error => { console.error(error); process.exit(1); });
