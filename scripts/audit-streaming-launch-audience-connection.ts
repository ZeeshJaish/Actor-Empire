import assert from 'node:assert/strict';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';
import { commitOwnedStreamingLaunch } from '../services/streamingLaunch';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { createWorldStreamingCustomerState, normalizeWorldStreamingCustomerState } from '../services/worldEconomy/worldStreamingCustomers';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { getStreamingStudioFinanceData } from '../services/streamingStudioFinance';
import { titleTotals } from '../components/studio-finance/finance/derive';
import type { Player } from '../types';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';

const fixture = (price = 7.99, titleCount = 2, core: 'SUBSCRIPTION' | 'ADVERTISING' | 'STORE' = 'SUBSCRIPTION') => {
    const player = createC6QaCareer();
    for (let i = 2; i < titleCount; i++) {
        const id = `launch-extra-${i}`;
        player.world.projects.push({ ...player.world.projects[0], id, title: `Launch Extra ${i}` });
        player.ownedStreamingPlatform.catalogProjectIds.push(id);
        player.ownedStreamingPlatform.catalogLicenses.push({ ...structuredClone(player.ownedStreamingPlatform.catalogLicenses[0]),
            id: `extra-license-${i}`, sourceProjectId: id, titleAtSigning: `Launch Extra ${i}` });
    }
    player.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        player.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: core });
    player.ownedStreamingPlatform.serviceConfiguration.pricing.plans.forEach(plan => { plan.monthly = price; });
    player.ownedStreamingPlatform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(player);
    return player;
};
const launch = (player: Player, plan: 'STANDARD' | 'STAGGERED_PREMIERE' = 'STANDARD') => {
    const result = commitOwnedStreamingLaunch(player, plan);
    assert.ok(result.changed && result.launchCommit, `Fixture must launch: ${result.reason}`);
    return result;
};
const cheap = launch(fixture());
const expensive = launch(fixture(79));
const rich = launch(fixture(7.99, 32));
for (const [price, titles, result] of [[7.99, 2, cheap], [79, 2, expensive], [7.99, 32, rich]] as const) {
    const player = fixture(price, titles);
    assert.equal(result.launchCommit!.initialSubscribers,
        forecastWorldStreamingLaunchPricing(player, player.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']).subscribers,
        'Pricing preview and actual opening must use the same opening-week commercial inputs.');
}
console.table([cheap, expensive, rich].map((result, index) => ({ variant: ['cheap', 'expensive', 'rich'][index],
    paid: result.launchCommit!.initialSubscribers })));
assert.ok(expensive.launchCommit!.initialSubscribers < cheap.launchCommit!.initialSubscribers,
    'Launch paid subscribers must fall when the same catalog becomes much more expensive.');
assert.ok(rich.launchCommit!.initialSubscribers > cheap.launchCommit!.initialSubscribers,
    'Adding eligible catalog titles must increase launch paid demand with price and opening slate unchanged.');
const hybridFixture = (titles: number) => {
    const player = fixture(7.99, titles);
    player.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        player.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'TOGGLE', offer: 'STORE', enabled: true });
    player.ownedStreamingPlatform.catalogLicenses.slice(2).forEach(license => {
        license.accessGrant = { schemaVersion: 1, modes: ['RENTAL', 'PURCHASE'], earlyWindowWeeks: 0,
            purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT' };
    });
    player.ownedStreamingPlatform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(player);
    return player;
};
const smallHybrid=launch(hybridFixture(2)),largeHybrid=launch(hybridFixture(32));
const paidCatalogValue=(result:typeof smallHybrid)=>getWorldStreamingOffers(result.player,
    getAbsoluteWeek(result.player.age,result.player.currentWeek)).offers.find(row=>row.platformId==='PLAYER')!.subscriptionCatalogueStrengthByCountry;
assert.deepEqual(paidCatalogValue(largeHybrid),paidCatalogValue(smallHybrid),
    'Rental-only additions cannot inflate the included subscription catalog; transactional competition can change paid choice.');
for (const result of [cheap, expensive, rich,smallHybrid,largeHybrid, launch(fixture(7.99, 2, 'ADVERTISING')), launch(fixture(7.99, 2, 'STORE'))]) {
    const { player, launchCommit } = result;
    const customers = player.world.worldStreamingCustomers;
    assert.ok(customers?.global.playerOfferPresent, 'The launch must persist an opening customer baseline even when a prelaunch cache exists.');
    assert.equal(customers.global.playerEndingPaidAccounts, launchCommit!.initialSubscribers);
    assert.equal(player.ownedStreamingPlatform.metrics.subscribers, launchCommit!.initialSubscribers);
    assert.equal(customers.global.playerPlanAllocations.reduce((sum, plan) => sum + plan.paidAccounts, 0), launchCommit!.initialSubscribers);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    assert.equal(normalizeWorldStreamingCustomerState(customers, player, week), customers, 'A committed opening week stays immutable.');
    const replay = commitOwnedStreamingLaunch(player, 'STANDARD');
    assert.equal(replay.changed, false);
    assert.deepEqual(replay.player, player, 'Replay must not duplicate subscribers or charge treasury.');
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(player))));
    assert.equal(reloaded.ownedStreamingPlatform.launchCommit!.initialSubscribers, launchCommit!.initialSubscribers);
    assert.equal(reloaded.world.worldStreamingCustomers!.global.playerEndingPaidAccounts, launchCommit!.initialSubscribers);
    if (!player.ownedStreamingPlatform.serviceConfiguration.pricing.streams.includes('subs')) {
        assert.equal(launchCommit!.initialSubscribers, 0, 'Free/store launches cannot invent paid membership.');
        assert.equal(customers.global.playerMonthlySubscriptionRevenue, 0);
    }
}
const staggered = launch(fixture(), 'STAGGERED_PREMIERE');
assert.ok(staggered.launchCommit!.initialSubscribers < cheap.launchCommit!.initialSubscribers, 'Staggering retains its opening conversion penalty.');

const warm = fixture();
const week = getAbsoluteWeek(warm.age, warm.currentWeek);
warm.world.worldStreamingCustomers = createWorldStreamingCustomerState(warm, week);
const before = structuredClone(warm.world.worldStreamingCustomers);
const warmLaunch = launch(warm);
const after = warmLaunch.player.world.worldStreamingCustomers!;
for (const [id, country] of Object.entries(before.countries)) {
    assert.deepEqual(after.countries[id].platformSummaries.filter(row => row.platformId !== 'PLAYER'), country.platformSummaries);
    for (const cohort of country.cohorts) {
        const row = after.countries[id].cohorts.find(item => item.cohortId === cohort.cohortId && item.billingPath === cohort.billingPath)!;
        assert.deepEqual(row.planCells.filter(cell => cell.platformId !== 'PLAYER'), cohort.planCells, 'Opening cannot reroll existing AI customer cells.');
        assert.deepEqual(row.lapsedCells, cohort.lapsedCells);
        assert.ok(row.payingHouseholds <= row.reachableHouseholds);
    }
}
assert.deepEqual(after.recentMovements, before.recentMovements);
assert.equal(after.snapshots.filter(row => row.absoluteWeek === week).length, 1, 'Opening must replace, not duplicate the current snapshot.');
assert.equal(after.global.playerEndingPaidAccounts, warmLaunch.launchCommit!.initialSubscribers);

const partial = fixture();
partial.ownedStreamingPlatform.infrastructureSetup!.facilities = migratePlacementsToStreamingFacilities([{ cityId: 'NYC', racks: 1, role: 'CORE_ORIGIN' }]);
partial.ownedStreamingPlatform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(partial);
const partialLaunch = launch(partial);
assert.equal(partialLaunch.launchCommit!.initialSubscribers,
    forecastWorldStreamingLaunchPricing(partial, partial.ownedStreamingPlatform.serviceConfiguration.pricing, ['US']).subscribers,
    'Coverage must affect paid opening demand exactly once.');
assert.ok(partialLaunch.launchCommit!.initialSubscribers > 0 && partialLaunch.launchCommit!.initialSubscribers < cheap.launchCommit!.initialSubscribers,
    'Only geographically reachable households can join.');

for (const result of [cheap, expensive]) {
    const next = (await processGameWeek(result.player)).player;
    const customers = next.world.worldStreamingCustomers!.global;
    assert.equal(customers.playerStartingPaidAccounts, result.launchCommit!.initialSubscribers, 'First live week must begin at the saved opening baseline.');
    assert.equal(next.ownedStreamingPlatform.metrics.subscribers, customers.playerEndingPaidAccounts);
    assert.ok(Math.abs(next.world.worldStreamingPlatformEconomy!.platforms.PLAYER.weeklySubscriptionRevenue
        - customers.playerMonthlySubscriptionRevenue / 4.33) < .02, 'Actual receipts must come from canonical paid billing cells.');
}
console.log('Launch audience connection, commercial models, AI preservation, first week and reload audit passed.');

for (const core of ['SUBSCRIPTION', 'ADVERTISING', 'STORE', 'HYBRID'] as const) {
    const draft = fixture(7.99, 2, core === 'HYBRID' ? 'SUBSCRIPTION' : core);
    if (core === 'HYBRID') {
        draft.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
            draft.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'TOGGLE', offer: 'STORE', enabled: true });
        draft.ownedStreamingPlatform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(draft);
    }
    const opened = launch(draft);
    const next = (await processGameWeek(opened.player)).player;
    const operations = next.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    const receipts = operations.subscriptionRevenue + (operations.productRevenue || 0)
        + (operations.worldViewingIncrementalRevenue || 0);
    if (core !== 'SUBSCRIPTION') assert.ok((operations.worldViewingIncrementalRevenue || 0) > 0, `${core} viewers must produce actual receipts.`);
    const room = getStreamingFinanceRoom(next, 'ALL');
    console.log(core, { receipts, financeRevenue: room.periodRevenue, incremental: operations.worldViewingIncrementalRevenue });
    assert.equal(room.periodRevenue, receipts, 'Finance must include actual ad/store receipts without inventing subscriptions.');
    assert.equal(room.cashflow.at(-1)!.revenue, receipts);
    const paidMaintenance = [...new Map(next.ownedStreamingPlatform.eventLedger
        .filter(entry => entry.absoluteWeek === getAbsoluteWeek(next.age, next.currentWeek)
            && entry.type === 'INFRASTRUCTURE_MAINTENANCE_COMPLETED')
        .map(entry => [entry.idempotencyKey, entry])).values()]
        .reduce((sum, entry) => sum + Number(entry.metadata?.cost || 0), 0);
    assert.equal(operations.additionalOperatingExpense, paidMaintenance,
        'Finance must retain the actual maintenance paid outside core operations.');
    assert.equal(room.periodOutflow, receipts - operations.netCashContribution + paidMaintenance);
    assert.equal(room.revenueSlices.reduce((sum, slice) => sum + slice.amount, 0), receipts);
    assert.equal(room.ledger.filter(entry => entry.category === 'REVENUE').reduce((sum, entry) => sum + entry.cashDelta, 0), receipts);
    assert.equal(room.ledger.filter(entry => entry.affectsTreasury).reduce((sum, entry) => sum + entry.cashDelta, 0), room.treasuryCash);
    for (const title of operations.titlePerformance || []) {
        assert.equal(room.titlePerformance.find(row => row.projectId === title.projectId)!.revenue,
            title.attributedSubscriptionRevenue + (title.incrementalRevenue || 0), 'Finance title revenue must include its actual commercial receipts.');
        const displayed = getStreamingStudioFinanceData(next).titles.find(row => row.id === title.projectId)!;
        assert.equal(displayed.subscriptionValue, title.attributedSubscriptionRevenue, 'Ad/store receipts must not be labeled subscription value.');
        assert.equal(displayed.advertising, title.advertisingRevenue || 0);
        assert.equal(titleTotals(displayed).gross, title.attributedSubscriptionRevenue + (title.incrementalRevenue || 0));
    }
    const legacy = JSON.parse(JSON.stringify(next)) as Player;
    delete legacy.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.worldViewingIncrementalRevenue;
    assert.equal(getStreamingFinanceRoom(legacy, 'ALL').periodRevenue,
        operations.subscriptionRevenue + (operations.productRevenue || 0), 'Legacy snapshots without viewing receipts remain valid.');
}
console.log('Live advertising/store receipts reconcile across Finance totals, chart, breakdown and treasury ledger.');
