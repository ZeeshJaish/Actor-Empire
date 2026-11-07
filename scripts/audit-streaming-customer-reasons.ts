/** #128 (plan §20.8, L1 + L3): the Audience room's real reasons and real watch-time race.
 *  Checks, on the full test company over a real week:
 *  - the week's customer snapshot keeps `playerFlows`: the households that came to the player's service and left
 *    it, by reason; they add up to the ledger's own joins + returns and cancellations for the player;
 *  - a move between the player's own plans is in neither side; a week settles the same way twice;
 *  - the market view reads them (`flows`, `switching.reasons`) and never shows the old fixed list;
 *  - an old save's snapshots (no `playerFlows`) read as "not available", not as made-up reasons;
 *  - `watchRace` is every platform's settled viewing hours, the player's included, shares adding to 100;
 *  - `history` is the ledger's 52 weekly snapshots. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type WorldStreamingCustomerReasonId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Customer Reasons Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const sum = (record: Partial<Record<WorldStreamingCustomerReasonId, number>> = {}) => Object.values(record).reduce((total, value) => total + (value || 0), 0);

async function main() {
    const started = performance.now();
    const qa = await buildStreamingFullPlatformQa(fresh('customer-reasons'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);

    /* ── a real week keeps the player's flows ── */
    const next = (await processGameWeek(qa)).player;
    const week = getAbsoluteWeek(next.age, next.currentWeek);
    const customers = next.world.worldStreamingCustomers!;
    assert.equal(customers.lastProcessedAbsoluteWeek, week, 'The customer ledger settled this week');
    const snapshot = customers.snapshots.at(-1)!;
    assert.equal(snapshot.absoluteWeek, week);
    assert.ok(snapshot.playerFlows, 'The week\'s snapshot keeps the player\'s flows');
    const player = Object.values(customers.countries)
        .map(country => country.platformSummaries.find(row => row.platformId === 'PLAYER'))
        .filter(Boolean);
    const joinsAndReturns = player.reduce((total, row) => total + row!.joins + row!.reactivations, 0);
    const cancellations = player.reduce((total, row) => total + row!.cancellations, 0);
    assert.equal(sum(snapshot.playerFlows!.in), joinsAndReturns, 'Homes that came = the ledger\'s joins (switches in included) and returns');
    assert.equal(sum(snapshot.playerFlows!.out), cancellations, 'Homes that left = the ledger\'s cancellations (switches out included)');
    assert.ok(sum(snapshot.playerFlows!.in) > 0 && sum(snapshot.playerFlows!.out) > 0, 'A live company gains and loses homes in a week');
    const upgrades = player.reduce((total, row) => total + row!.upgrades + row!.downgrades, 0);
    console.log(`PASS flows: week ${week}, ${sum(snapshot.playerFlows!.in).toLocaleString()} homes in (${Object.keys(snapshot.playerFlows!.in).join(', ')}), ${sum(snapshot.playerFlows!.out).toLocaleString()} out (${Object.keys(snapshot.playerFlows!.out).join(', ')}); ${upgrades.toLocaleString()} plan changes in neither`);

    const again = (await processGameWeek(qa)).player;
    assert.deepEqual(again.world.worldStreamingCustomers!.snapshots.at(-1)!.playerFlows, snapshot.playerFlows, 'The same week settles the same flows');
    console.log('PASS determinism: the same week gives the same flows');

    /* ── the market view reads them ── */
    const market = getStreamingAudienceMarket(next);
    assert.equal(market.flows.available, true);
    assert.equal(market.flows.absoluteWeek, week);
    assert.equal(market.flows.came.reduce((total, row) => total + row.households, 0), sum(snapshot.playerFlows!.in));
    assert.equal(market.flows.left.reduce((total, row) => total + row.households, 0), sum(snapshot.playerFlows!.out));
    for (const side of [market.flows.came, market.flows.left]) {
        assert.ok(side.every((row, index) => !index || side[index - 1].households >= row.households), 'Largest reason first');
        assert.ok(Math.abs(side.reduce((total, row) => total + row.sharePercent, 0) - 100) <= .5, 'Shares add up to 100');
        assert.ok(side.every(row => row.label && row.detail));
    }
    assert.deepEqual(market.switching.reasons.map(row => row.id), market.flows.left.slice(0, 5).map(row => row.id), 'Switching reasons are the real reasons homes left');
    assert.ok(!market.switching.reasons.some(row => /Price & bundles|Nothing next|Rival premiere/.test(row.label)), 'The old fixed list is gone');
    console.log(`PASS market view: came ${market.flows.came.map(row => `${row.label} ${row.sharePercent}%`).join(' · ')} | left ${market.flows.left.map(row => `${row.label} ${row.sharePercent}%`).join(' · ')}`);

    /* ── an old save: snapshots without flows ── */
    /* a shallow copy: the test company's pending life events hold functions, so it cannot be structuredClone'd */
    const old: Player = { ...next, world: { ...next.world, worldStreamingCustomers: { ...customers,
        snapshots: customers.snapshots.map(({ playerFlows: _drop, ...rest }) => rest) } } };
    const oldMarket = getStreamingAudienceMarket(old);
    assert.equal(oldMarket.flows.available, false);
    assert.equal(oldMarket.flows.came.length + oldMarket.flows.left.length + oldMarket.switching.reasons.length, 0, 'No reasons until a week settles, none made up');
    console.log('PASS old save: no flows read as not available, with no fixed reasons');

    /* ── the watch-time race ── */
    const viewing = next.world.worldStreamingViewing!;
    const race = market.watchRace;
    assert.equal(race.available, true);
    const allHours = Object.values(viewing.platforms).reduce((total, row) => total + Math.max(0, row.totalHoursViewed), 0);
    assert.equal(race.totalHours, allHours, 'The race is every platform\'s settled hours');
    assert.equal(race.entries.reduce((total, row) => total + row.hours, 0), allHours, 'Every hour is in one row');
    const you = race.entries.find(row => row.player);
    assert.ok(you && you.id === 'PLAYER' && you.hours === viewing.platforms.PLAYER.totalHoursViewed && you.sharePercent > 0, 'Your watch time is real and shown');
    assert.ok(Math.abs(race.entries.reduce((total, row) => total + row.sharePercent, 0) - 100) <= .6, 'Shares add up to 100');
    assert.ok(race.entries.filter(row => !row.player && row.id !== 'OTHER').length <= 6, 'Six rivals by name at most, the rest as Other services');
    console.log(`PASS watch race: ${race.entries.map(row => `${row.name} ${row.sharePercent}%`).join(' · ')}`);

    /* ── the ledger's history ── */
    assert.equal(market.history.length, customers.snapshots.length);
    assert.ok(market.history.length <= 52);
    assert.equal(market.history.at(-1)!.absoluteWeek, week);
    assert.equal(market.history.at(-1)!.playerAccounts, customers.global.playerEndingPaidAccounts);
    console.log(`PASS history: ${market.history.length} settled weeks, paying homes ${market.history[0].payingHouseholds.toLocaleString()} → ${market.history.at(-1)!.payingHouseholds.toLocaleString()}`);

    console.log(`EMPIRE+ customer reasons audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
