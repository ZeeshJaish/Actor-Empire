import assert from 'node:assert/strict';
import { balanceFixture } from './helpers/streamingBalanceFixture';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingStudioFinanceData } from '../services/streamingStudioFinance';
import { titleTotals, summarize, health } from '../components/studio-finance/finance/derive';
import { recognizeStreamingContentCost } from '../services/streamingContentAccounting';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingPlatformAnalytics } from '../services/streamingAnalytics';
import { createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import { settleStreamingRightsTransfer } from '../services/streamingRightsTransactions';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { normalizeStreamingFacilityPhysical } from '../services/streamingFacilities';
import { performStreamingPreventiveMaintenance } from '../services/streamingInfrastructureOperations';
import type { Player } from '../types';

let checks = 0;
const failures: string[] = [];
function check(name: string, run: () => void) {
    checks++;
    try { run(); console.log('PASS', name); }
    catch (error) { failures.push(name); console.error('FAIL', name, error); }
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(): Player {
    const { p } = balanceFixture({ id: 'content-accounting', core: 'SUBSCRIPTION', catalog: 8, price: 7.99 });
    const week = getAbsoluteWeek(p.age, p.currentWeek);
    p.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek = week - 210;
    p.ownedStreamingPlatform.lastProcessedAbsoluteWeek = week - 1;
    p.ownedStreamingPlatform.originalCommissions = [];
    p.ownedStreamingPlatform.processedWeekKeys = [];
    p.ownedStreamingPlatform.weeklyHistory = [];
    p.ownedStreamingPlatform.infrastructureSetup!.facilities!.forEach(facility => {
        facility.physical = { ...normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease),
            lastMaintenanceAbsoluteWeek: week, maintenanceConditionPercent: 80 };
    });
    p.ownedStreamingPlatform.catalogLicenses = p.ownedStreamingPlatform.catalogLicenses.slice(0, 1);
    const license = p.ownedStreamingPlatform.catalogLicenses[0];
    Object.assign(license, { minimumGuarantee: 10_400, durationWeeks: 104, signedAtAbsoluteWeek: week - 104, startsAtAbsoluteWeek: week - 104,
        expiresAtAbsoluteWeek: week, windowType: 'FIRST_WINDOW', permanentPurchase: false });
    return p;
}
function runWeek(p: Player) {
    const result = processOwnedStreamingPlatformWeek(p);
    assert.ok(result.snapshot?.operations, 'actual weekly processor should record operations');
    return result;
}

check('a fully consumed 104-week license cannot restart its expense', () => {
    assert.equal(runWeek(fixture()).snapshot!.operations!.contentAmortization, 0);
});
check('a paid future license is prepaid content rather than a current expense', () => {
    const p = fixture(); const week = getAbsoluteWeek(p.age, p.currentWeek);
    Object.assign(p.ownedStreamingPlatform.catalogLicenses[0], { startsAtAbsoluteWeek: week + 10, expiresAtAbsoluteWeek: week + 114 });
    assert.equal(runWeek(p).snapshot!.operations!.contentAmortization, 0);
});
check('funded Originals are not amortized before their scheduled premiere', () => {
    const p = fixture(); const week = getAbsoluteWeek(p.age, p.currentWeek);
    const original = clone(balanceFixture({ id: 'original-source', core: 'SUBSCRIPTION', catalog: 8 }).p.ownedStreamingPlatform.originalCommissions[0]);
    p.ownedStreamingPlatform.catalogLicenses = [];
    p.ownedStreamingPlatform.launchSlate!.entries = [];
    Object.assign(original, { productionFundingApplied: 10_400, releasePlan: { scope: 'PLATFORM', releasePattern: 'FULL_SEASON',
        marketingPlan: 'LEAN', premiereAtAbsoluteWeek: week + 10, authorizedAtAbsoluteWeek: week - 1 } });
    p.ownedStreamingPlatform.originalCommissions = [original];
    assert.equal(runWeek(p).snapshot!.operations!.contentAmortization, 0);
});
check('zero treasury cannot hide incurred operating losses in accounting profit', () => {
    const p = fixture(); p.ownedStreamingPlatform.treasuryCash = 0;
    const op = runWeek(p).snapshot!.operations!;
    const revenue = op.subscriptionRevenue + (op.productRevenue || 0) + (op.worldViewingIncrementalRevenue || 0);
    assert.ok(op.totalCashCost > revenue, 'fixture incurs an unfunded cost');
    assert.equal(op.accountingContribution, revenue - op.totalCashCost - op.contentAmortization);
});
check('Finance title contribution includes content expense once without another cash debit', () => {
    const source = fixture(); const week = getAbsoluteWeek(source.age, source.currentWeek);
    Object.assign(source.ownedStreamingPlatform.catalogLicenses[0], { startsAtAbsoluteWeek: week - 1, expiresAtAbsoluteWeek: week + 103 });
    const result = runWeek(source);
    const p = result.player;
    const op = p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    const title = op.titlePerformance![0];
    title.attributedSubscriptionRevenue = 1_000;
    title.incrementalRevenue = 0;
    title.allocatedCashCost = 200;
    title.allocatedContentAmortization = 100;
    title.cashContribution = 800;
    title.accountingContribution = 700;
    const data = getStreamingStudioFinanceData(p);
    assert.equal(titleTotals(data.titles.find(row => row.id === title.projectId)!).net, 700);
});

function freshAsset(cost = 10_400, life = 104) {
    const p = fixture(); const at = getAbsoluteWeek(p.age, p.currentWeek);
    Object.assign(p.ownedStreamingPlatform.catalogLicenses[0], { minimumGuarantee: cost, durationWeeks: life,
        signedAtAbsoluteWeek: at, startsAtAbsoluteWeek: at, expiresAtAbsoluteWeek: at + life });
    return { p, at };
}
function recognize(p: Player, at: number) {
    const result = recognizeStreamingContentCost(p.ownedStreamingPlatform, at, p.world.streamingRightsContracts, p.world);
    p.ownedStreamingPlatform.contentAccounting = clone(result.state);
    p.ownedStreamingPlatform.lastProcessedAbsoluteWeek = at;
    return result;
}
check('integer rounding recognizes exactly 10401 dollars over 104 weeks, then stops', () => {
    const { p, at } = freshAsset(10_401);
    const amounts = Array.from({ length: 212 }, (_, i) => recognize(p, at + i).expense);
    assert.equal(amounts[0], 100); assert.equal(amounts[103], 101);
    assert.equal(amounts.reduce((a, b) => a + b, 0), 10_401);
    assert.ok(amounts.slice(104).every(amount => amount === 0));
});
check('52-week and 156-week licenses use their signed lives rather than a repeating 104-week divisor', () => {
    for (const [life, cost] of [[52, 10_400], [156, 15_600]]) {
        const { p, at } = freshAsset(cost, life);
        const amounts = Array.from({ length: life + 10 }, (_, i) => recognize(p, at + i).expense);
        assert.equal(amounts[0], life === 52 ? 200 : 100);
        assert.equal(amounts.reduce((a, b) => a + b, 0), cost);
        assert.equal(amounts[life], 0);
    }
});
check('permanent purchased content has a finite 104-week accounting life', () => {
    const { p, at } = freshAsset(); p.ownedStreamingPlatform.catalogLicenses[0].windowType = 'PERMANENT';
    let total = 0;
    for (let i = 0; i < 212; i++) total += recognize(p, at + i).expense;
    assert.equal(total, 10_400);
});
check('a paid renewal recognizes only its new cost and cannot restart the original asset', () => {
    const { p, at } = freshAsset();
    for (let i = 0; i < 104; i++) recognize(p, at + i);
    const old = p.ownedStreamingPlatform.catalogLicenses[0]; old.status = 'EXPIRED';
    p.ownedStreamingPlatform.catalogLicenses.push({ ...old, id: 'paid-renewal', status: 'ACTIVE', renewedFromLicenseId: old.id,
        minimumGuarantee: 5_200, durationWeeks: 52, signedAtAbsoluteWeek: at + 104,
        startsAtAbsoluteWeek: at + 104, expiresAtAbsoluteWeek: at + 156 });
    let total = 0;
    for (let i = 104; i < 170; i++) total += recognize(p, at + i).expense;
    assert.equal(total, 5_200);
    assert.equal(p.ownedStreamingPlatform.contentAccounting!.assets.find(asset => asset.id === `license:${old.id}`)!.recognizedCost, 10_400);
});
check('duplicate projections and JSON reload do not duplicate cost recognition', () => {
    const { p, at } = freshAsset();
    p.ownedStreamingPlatform.catalogLicenses.push(clone(p.ownedStreamingPlatform.catalogLicenses[0]));
    assert.equal(recognize(p, at).expense, 100);
    p.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(clone(p.ownedStreamingPlatform), p.id);
    assert.equal(recognize(p, at).expense, 0);
    assert.equal(recognize(p, at + 1).expense, 100);
});
check('pruning snapshots and a source projection cannot restart or erase an unconsumed asset', () => {
    const { p, at } = freshAsset();
    recognize(p, at);
    p.ownedStreamingPlatform.weeklyHistory = [];
    p.ownedStreamingPlatform.catalogLicenses = [];
    let remainder = 0;
    for (let i = 1; i < 212; i++) remainder += recognize(p, at + i).expense;
    assert.equal(remainder, 10_300);
    assert.equal(p.ownedStreamingPlatform.contentAccounting!.assets.length, 0);
});
check('early termination writes off the remaining cost once without another cash charge', () => {
    const { p, at } = freshAsset(); const cash = p.ownedStreamingPlatform.treasuryCash;
    assert.equal(recognize(p, at).expense, 100);
    p.ownedStreamingPlatform.catalogLicenses[0].status = 'TERMINATED';
    assert.equal(recognize(p, at + 1).expense, 10_300);
    assert.equal(recognize(p, at + 2).expense, 0);
    assert.equal(p.ownedStreamingPlatform.treasuryCash, cash);
});
check('a scheduled Original recognizes actual applied funding rather than its larger reserved budget', () => {
    const { p, at } = freshAsset();
    const original = clone(balanceFixture({ id: 'original-lifetime', core: 'SUBSCRIPTION', catalog: 8 }).p.ownedStreamingPlatform.originalCommissions[0]);
    p.ownedStreamingPlatform.catalogLicenses = [];
    p.ownedStreamingPlatform.launchSlate!.entries = [];
    Object.assign(original, { productionFundingApplied: 10_401, commissionedAtAbsoluteWeek: at, greenlitAtAbsoluteWeek: at,
        releasePlan: { scope: 'PLATFORM', releasePattern: 'FULL_SEASON',
        marketingPlan: 'LEAN', premiereAtAbsoluteWeek: at + 2, authorizedAtAbsoluteWeek: at } });
    p.ownedStreamingPlatform.originalCommissions = [original];
    const amounts = Array.from({ length: 212 }, (_, i) => recognize(p, at + i).expense);
    assert.deepEqual(amounts.slice(0, 3), [0, 0, 100]);
    assert.equal(amounts.reduce((a, b) => a + b, 0), 10_401);
});
check('internal rights allocations cannot fabricate a second content acquisition cost', () => {
    const { p, at } = freshAsset(); p.ownedStreamingPlatform.catalogLicenses[0].origin = 'OWNED_STUDIO_TRANSFER';
    assert.equal(recognize(p, at).expense, 0);
});
check('weekly replay after checkpoint-history pruning cannot create another accounting snapshot', () => {
    const p = runWeek(fixture()).player;
    p.ownedStreamingPlatform.processedWeekKeys = [];
    p.ownedStreamingPlatform.weeklyHistory = [];
    const before = clone(p.ownedStreamingPlatform.contentAccounting);
    const replay = processOwnedStreamingPlatformWeek(p);
    assert.equal(replay.snapshot, null);
    assert.deepEqual(replay.player.ownedStreamingPlatform.contentAccounting, before);
});
check('Finance totals retain company costs when no titles are delivering views', () => {
    const p = runWeek(fixture()).player;
    const data = getStreamingStudioFinanceData(p);
    const op = p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    assert.equal(data.titles.reduce((total, title) => total + titleTotals(title).net, 0), op.accountingContribution);
});
check('unfunded costs remain visible in Finance burn and runway', () => {
    const p = fixture(); p.ownedStreamingPlatform.treasuryCash = 0;
    const result = runWeek(p); const data = getStreamingStudioFinanceData(result.player);
    const summary = summarize(data.weeks, data.cash); const condition = health(data, summary);
    assert.equal(summary.accountingProfit, result.snapshot!.operations!.accountingContribution);
    assert.equal(condition.burn, result.snapshot!.operations!.totalCashCost);
    assert.equal(condition.runway, 0);
});
check('analytics reconciles incurred accounting loss even when treasury cash is floored', () => {
    const p = fixture(); p.ownedStreamingPlatform.treasuryCash = 0;
    const analytics = getStreamingPlatformAnalytics(runWeek(p).player, 4);
    assert.equal(analytics.reconciliation.accountingContribution, true);
});
check('upfront paid production funding is recognized with its guarantee, without counting future reserves', () => {
    const { p, at } = freshAsset(); const license = p.ownedStreamingPlatform.catalogLicenses[0];
    const contract = createStreamingRightsContractFromLicense({ license,
        buyer: { type: 'PLAYER_PLATFORM', id: 'PLAYER', name: 'Player', platformId: null },
        productionFunding: 10_400, futureSeasonFunding: 99_000_000,
        guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: at });
    p.world.streamingRightsContracts = { [contract.id]: contract };
    let total = 0;
    for (let i = 0; i < 110; i++) total += recognize(p, at + i).expense;
    assert.equal(total, 20_800);
});
check('a delayed launch recognizes the remaining license cost before exclusive expiry', () => {
    const { p, at } = freshAsset(5_400);
    Object.assign(p.ownedStreamingPlatform.catalogLicenses[0], { signedAtAbsoluteWeek: at - 50,
        startsAtAbsoluteWeek: at - 50, expiresAtAbsoluteWeek: at + 54 });
    p.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek = at - 1;
    p.ownedStreamingPlatform.lastProcessedAbsoluteWeek = at - 1;
    let total = 0;
    for (let i = 0; i < 54; i++) total += recognize(p, at + i).expense;
    assert.equal(total, 5_400);
    assert.equal(recognize(p, at + 54).expense, 0);
});
check('a real secondary transfer uses this buyer payment while preserving inherited backend terms', () => {
    const { p, at } = freshAsset();
    const source = createStreamingRightsContractFromLicense({
        license: { ...p.ownedStreamingPlatform.catalogLicenses[0], minimumGuarantee: 10_400_000,
            startsAtAbsoluteWeek: at - 50, signedAtAbsoluteWeek: at - 50, expiresAtAbsoluteWeek: at + 54 },
        buyer: { type: 'AI_PLATFORM', id: 'HULU', name: 'Hulu', platformId: 'HULU' },
        productionFunding: 10_400_000, guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: at - 50 });
    p.ownedStreamingPlatform.catalogLicenses = [];
    p.world.streamingRightsContracts = { [source.id]: source };
    const buyer = { type: 'PLAYER_PLATFORM' as const, id: p.ownedStreamingPlatform.identity!.slug, name: 'Player', platformId: null };
    const transfer = settleStreamingRightsTransfer(p, { sourceContractId: source.id, seller: source.buyer, buyer,
        askingPrice: 5_400, price: 5_400, absoluteWeek: at, idempotencyKey: 'accounting-buyer-transfer',
        controllerAtCommitment: { seller: 'AI', buyer: 'PLAYER' } });
    assert.ok(transfer.changed && 'successorContract' in transfer, JSON.stringify(transfer));
    if (!('successorContract' in transfer)) throw new Error('transfer required');
    assert.equal(transfer.successorContract.minimumGuarantee, 10_400_000, 'backend chain must keep original signed guarantee');
    const acquired = transfer.player;
    assert.equal(recognize(acquired, at).expense, 100);
    const room = getStreamingFinanceRoom(acquired);
    assert.equal(room.ledger.find(entry => entry.id === acquired.ownedStreamingPlatform.eventLedger.at(-1)!.id)!.cashDelta, -5_400);
    let total = 100;
    for (let i = 1; i < 55; i++) total += recognize(acquired, at + i).expense;
    assert.equal(total, 5_400);
});
check('legacy opening recognition retains already-expensed funding without a cash refund or a second full writeoff', () => {
    const { p, at } = freshAsset();
    Object.assign(p.ownedStreamingPlatform.catalogLicenses[0], { signedAtAbsoluteWeek: at - 7,
        startsAtAbsoluteWeek: at + 10, expiresAtAbsoluteWeek: at + 114 });
    const cash = p.ownedStreamingPlatform.treasuryCash;
    assert.equal(recognize(p, at).expense, 0);
    assert.equal(p.ownedStreamingPlatform.contentAccounting!.assets[0].recognizedCost, 700);
    let newExpense = 0;
    for (let i = 1; i < 220; i++) newExpense += recognize(p, at + i).expense;
    assert.equal(newExpense, 9_700);
    assert.equal(p.ownedStreamingPlatform.treasuryCash, cash);
});
check('a retained pending Original starts on delivered-license availability after commission compaction', () => {
    const { p, at } = freshAsset();
    const original = clone(balanceFixture({ id: 'pruned-pending', core: 'SUBSCRIPTION', catalog: 8 }).p.ownedStreamingPlatform.originalCommissions[0]);
    Object.assign(original, { productionFundingApplied: 10_400, commissionedAtAbsoluteWeek: at, greenlitAtAbsoluteWeek: at });
    p.ownedStreamingPlatform.originalCommissions = [original];
    p.ownedStreamingPlatform.catalogLicenses = [];
    p.ownedStreamingPlatform.launchSlate!.entries = [];
    assert.equal(recognize(p, at).expense, 0);
    p.ownedStreamingPlatform.originalCommissions = [];
    const license = { ...fixture().ownedStreamingPlatform.catalogLicenses[0], id: 'delivered-after-pruning',
        sourceProjectId: original.canonicalProjectId!, minimumGuarantee: 0, signedAtAbsoluteWeek: at,
        startsAtAbsoluteWeek: at + 10, expiresAtAbsoluteWeek: at + 114 };
    const contract = createStreamingRightsContractFromLicense({ license, productionFunding: 10_400,
        buyer: { type: 'PLAYER_PLATFORM', id: 'PLAYER', name: 'Player', platformId: null },
        guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: at });
    p.ownedStreamingPlatform.catalogLicenses = [contract];
    p.world.streamingRightsContracts = { [contract.id]: contract };
    let total = 0;
    for (let i = 1; i < 220; i++) total += recognize(p, at + i).expense;
    assert.equal(total, 10_400);
    assert.equal(p.ownedStreamingPlatform.contentAccounting!.assets.find(asset => asset.id === 'license:delivered-after-pruning')!.costBasis, 0);
});
check('periodic paid maintenance reduces Finance profit once while remaining a separate cash entry', () => {
    const p = runWeek(fixture()).player;
    const at = getAbsoluteWeek(p.age, p.currentWeek);
    const op = p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    const facility = p.ownedStreamingPlatform.infrastructureSetup!.facilities![0];
    facility.physical = { ...facility.physical!, lastMaintenanceAbsoluteWeek: at - 10, maintenanceConditionPercent: 45 };
    const cash = p.ownedStreamingPlatform.treasuryCash;
    const maintained = performStreamingPreventiveMaintenance(p, facility.id);
    assert.equal(maintained.changed, true);
    assert.equal(maintained.player.ownedStreamingPlatform.treasuryCash, cash - 1_060_000);
    const data = getStreamingStudioFinanceData(maintained.player);
    assert.equal(summarize(data.weeks, data.cash).accountingProfit, op.accountingContribution - 1_060_000);
    assert.equal(data.titles.reduce((total, title) => total + titleTotals(title).net, 0), op.accountingContribution - 1_060_000);
    assert.equal(getStreamingPlatformAnalytics(maintained.player, 4).totals.accountingContribution, op.accountingContribution - 1_060_000,
        'Finance and analytics must report the same after-maintenance profit');
    assert.equal(data.transactions.filter(entry => entry.reason?.includes('preventive maintenance')).length, 1);
    const replay = performStreamingPreventiveMaintenance(maintained.player, facility.id);
    assert.equal(replay.changed, false);
    assert.equal(replay.player.ownedStreamingPlatform.treasuryCash, cash - 1_060_000);
    const reloaded = JSON.parse(JSON.stringify(maintained.player)) as Player;
    reloaded.ownedStreamingPlatform.eventLedger = [];
    assert.equal(summarize(getStreamingStudioFinanceData(reloaded).weeks, reloaded.ownedStreamingPlatform.treasuryCash).accountingProfit,
        op.accountingContribution - 1_060_000, 'ledger compaction must not erase paid maintenance from profit');
    assert.equal(performStreamingPreventiveMaintenance(reloaded, facility.id).changed, false,
        'physical maintenance week prevents a duplicate cash debit even after ledger pruning');
});
check('maintenance paid before core weekly processing enters the Finance adjustment only once', () => {
    const p = fixture(); const at = getAbsoluteWeek(p.age, p.currentWeek);
    const facility = p.ownedStreamingPlatform.infrastructureSetup!.facilities![0];
    facility.physical = { ...facility.physical!, lastMaintenanceAbsoluteWeek: at - 10, maintenanceConditionPercent: 45 };
    const maintained = performStreamingPreventiveMaintenance(p, facility.id);
    assert.equal(maintained.changed, true);
    const next = runWeek(maintained.player).player;
    const op = next.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    assert.equal(op.additionalOperatingExpense, 1_060_000);
    assert.equal(summarize(getStreamingStudioFinanceData(next).weeks, next.ownedStreamingPlatform.treasuryCash).accountingProfit,
        op.accountingContribution - 1_060_000);
});
check('automatic three-facility maintenance is returned, persisted and expensed exactly once', () => {
    const p = fixture(); const at = getAbsoluteWeek(p.age, p.currentWeek);
    for (const facility of p.ownedStreamingPlatform.infrastructureSetup!.facilities!) {
        facility.physical = { ...facility.physical!, lastMaintenanceAbsoluteWeek: at - 10, maintenanceConditionPercent: 90 };
    }
    const cash = p.ownedStreamingPlatform.treasuryCash;
    const result = runWeek(p); const op = result.snapshot!.operations!;
    assert.equal(op.additionalOperatingExpense, 3_180_000);
    assert.equal(result.player.ownedStreamingPlatform.treasuryCash, cash + op.netCashContribution - 3_180_000);
    const point = getStreamingFinanceRoom(result.player, 'ALL').cashflow.at(-1)!;
    assert.equal(point.net, op.netCashContribution - 3_180_000);
    assert.equal(point.accountingContribution, op.accountingContribution - 3_180_000);
});

console.log(JSON.stringify({ checks, failures }));
if (failures.length) process.exitCode = 1;
