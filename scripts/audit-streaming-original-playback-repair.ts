import assert from 'node:assert/strict';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { commitOwnedStreamingLaunch } from '../services/streamingLaunch';
import { getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import { getStreamingContentAvailability, evaluatePlayerStreamingTitleRoute } from '../services/streamingContentAvailability';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { commitStreamingOriginalLocalization } from '../services/streamingOriginalsBusiness';
import { getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';

// Prepared launch-ready network, not a normal founder integration. The Original
// retains the exact old-save defect: GREENLIT mirror, AWAITING_RELEASE commitment.
let p = createC6QaCareer();
const commissionId = p.ownedStreamingPlatform.originalCommissions[0].id;
const projectId = p.ownedStreamingPlatform.originalCommissions[0].canonicalProjectId!;
assert.equal(p.ownedStreamingPlatform.originalCommissions[0].status, 'GREENLIT');
assert.equal(p.commitments.find(row => row.id === projectId)?.projectPhase, 'AWAITING_RELEASE');
assert.equal(getStreamingOriginalLiveStatus(p, p.ownedStreamingPlatform.originalCommissions[0]), 'DELIVERED');
const funding = p.ownedStreamingPlatform.originalCommissions[0].productionFundingApplied;
const beforeLocalization = p.ownedStreamingPlatform.treasuryCash;
const localization = commitStreamingOriginalLocalization(p, commissionId, 'DOMESTIC');
assert.ok(localization.changed, localization.reason);
p = localization.player;
const local = p.ownedStreamingPlatform.originalCommissions[0].localization!;
assert.equal(beforeLocalization - p.ownedStreamingPlatform.treasuryCash, local.cashCost);
assert.equal(commitStreamingOriginalLocalization(p, commissionId, 'DOMESTIC').changed, false);
p.ownedStreamingPlatform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(p);
const launch = commitOwnedStreamingLaunch(p, 'STANDARD');
assert.ok(launch.changed, launch.reason); p = launch.player;
const openingWeek = getAbsoluteWeek(p.age, p.currentWeek);
const route = (player: typeof p, id = projectId) => evaluatePlayerStreamingTitleRoute(player, id, 'US', getAbsoluteWeek(player.age, player.currentWeek), { kind: 'SUBSCRIPTION', planId: 'BASIC' });
assert.equal(route(p).allowed, false, 'Localization not yet delivered must block opening-week playback.');
assert.equal(commitOwnedStreamingLaunch(p, 'STANDARD').changed, false);
// Explicit delayed/ineligible positions must not turn this readiness repair
// into early playback or a competing-rights bypass in the actual weekly engine.
const gatedRows: Record<string, unknown>[] = [];
for (const gate of ['LOCALIZATION', 'PREMIERE', 'RIGHTS'] as const) {
    let branch = structuredClone(p);
    const c = branch.ownedStreamingPlatform.originalCommissions[0];
    if (gate === 'LOCALIZATION') c.localization!.readyAtAbsoluteWeek = openingWeek + 5;
    if (gate === 'PREMIERE') c.releasePlan = { scope: 'DOMESTIC', releasePattern: 'FULL_SEASON', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: openingWeek + 5, authorizedAtAbsoluteWeek: openingWeek - 1 };
    if (gate === 'RIGHTS') {
        const external = createStreamingRightsContractFromLicense({
            license: { ...structuredClone(branch.ownedStreamingPlatform.catalogLicenses[0]), id: 'external-original-exclusive', sourceProjectId: projectId, titleAtSigning: c.title,
                territory: 'GLOBAL', exclusivity: 'EXCLUSIVE', countryIds: [], startsAtAbsoluteWeek: openingWeek - 1, expiresAtAbsoluteWeek: openingWeek + 52,
                windowType: 'FIRST_WINDOW', permanentPurchase: false, buyerPlatformId: 'NETFLIX' },
            buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
            guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: openingWeek - 1,
        });
        branch.world.streamingRightsContracts = { ...branch.world.streamingRightsContracts, [external.id]: external };
    }
    branch = (await processGameWeek(branch)).player;
    const outcome = branch.ownedStreamingPlatform.weeklyHistory.at(-1)?.operations?.titlePerformance?.find(row => row.projectId === projectId);
    const titleReceipts = branch.world.worldStreamingViewing?.royaltyReceipts?.filter(row => row.platformId === 'PLAYER' && row.projectId === projectId).reduce((sum, row) => sum + row.grossReceipts, 0) || 0;
    gatedRows.push({ gate, viewers: outcome?.viewingAccounts || 0, receipts: titleReceipts });
    assert.equal(route(branch).allowed, false, `${gate} must remain denied after an actual week.`);
    assert.equal(outcome?.viewingAccounts || 0, 0, `${gate} cannot create Original viewers.`);
    assert.equal(titleReceipts, 0, `${gate} cannot allocate paid Original receipts.`);
}
const rows: Record<string, unknown>[] = [];
for (let i = 0; i < 4; i++) {
    p = (await processGameWeek(p)).player;
    const week = getAbsoluteWeek(p.age, p.currentWeek);
    const snapshot = p.ownedStreamingPlatform.weeklyHistory.find(row => row.absoluteWeek === week)!;
    const title = snapshot.operations?.titlePerformance?.find(row => row.projectId === projectId);
    const fundedNonStoreReceipts = p.world.worldStreamingViewing?.royaltyReceipts?.filter(row => row.platformId === 'PLAYER' && row.projectId === projectId).reduce((sum, row) => sum + row.grossReceipts, 0) || 0;
    assert.ok(fundedNonStoreReceipts > 0, 'Original revenue must have canonical household-funded receipt evidence.');
    if ((title?.rentalRevenue || 0) + (title?.purchaseRevenue || 0) > 0) {
        assert.ok(p.world.worldStreamingViewing?.commercialTransactions?.some(row => row.titleId === projectId && row.households > 0), 'Original store receipts require real household purchase transactions.');
    }
    assert.ok(route(p).allowed, 'Completed, localized Original must remain playable on its allowed subscription route.');
    rows.push({ week, originalStatus: p.ownedStreamingPlatform.originalCommissions[0].status, availability: getStreamingContentAvailability(p, projectId, ['US']).status,
        viewers: title?.viewingAccounts || 0, fundedNonStoreReceipts, revenue: (title?.attributedSubscriptionRevenue || 0) + (title?.incrementalRevenue || 0),
        advertising: title?.advertisingRevenue || 0, rentals: title?.rentalRevenue || 0, purchases: title?.purchaseRevenue || 0, platformSubscriptionRevenue: snapshot.operations?.subscriptionRevenue, amortization: title?.allocatedContentAmortization || 0 });
}
console.log(JSON.stringify({openingWeek, funding, gatedRows, rows}, null, 2));
assert.ok(rows.some(row => Number(row.viewers) > 0), 'Completed old-save Original must obtain real engine viewing records.');
assert.ok(rows.some(row => Number(row.revenue) > 0), 'Completed old-save Original must receive actual billed title attribution/receipts.');
assert.equal(p.ownedStreamingPlatform.originalCommissions[0].productionFundingApplied, funding, 'Production funding cannot be applied again.');
const assets = p.ownedStreamingPlatform.contentAccounting?.assets.filter(asset => asset.projectId === projectId) || [];
assert.equal(assets.reduce((sum, asset) => sum + asset.costBasis, 0), funding, 'The Original must retain one actual funding basis, not duplicate its production cap or debit.');
assert.ok(assets.every(asset => asset.recognizedCost <= asset.costBasis), 'Content recognition cannot exceed actual paid funding.');
const finance = getStreamingFinanceRoom(p, 'ALL');
assert.ok(finance.titlePerformance.some(row => row.projectId === projectId && row.revenue > 0), 'Finance must contain the same actual Original title revenue.');
const settledMoney = (player: typeof p) => ({
    treasury: player.ownedStreamingPlatform.treasuryCash,
    contentAccounting: player.ownedStreamingPlatform.contentAccounting,
    weeklyHistory: player.ownedStreamingPlatform.weeklyHistory,
    royaltyReceipts: player.world.worldStreamingViewing?.royaltyReceipts,
    royalties: Object.values(player.world.streamingRightsContracts || {}).map(row => ({ id: row.id, accrued: row.cumulativeRoyaltyAccrued, paid: row.cumulativeRoyaltyPaid })),
});
const beforeReplay = JSON.stringify(settledMoney(p));
const replay = processOwnedStreamingPlatformWeek(p);
assert.equal(JSON.stringify(settledMoney(replay.player)), beforeReplay, 'Same settled week must not issue another cash/content/royalty entry.');
const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(p))));
assert.equal(reloaded.ownedStreamingPlatform.treasuryCash, p.ownedStreamingPlatform.treasuryCash, 'Reload must retain money.');
assert.equal(reloaded.ownedStreamingPlatform.originalCommissions[0].productionFundingApplied, funding);
const replayReloaded = processOwnedStreamingPlatformWeek(reloaded);
assert.equal(JSON.stringify(settledMoney(replayReloaded.player)), JSON.stringify(settledMoney(reloaded)), 'Reload cannot duplicate settled cash, content recognition, views or royalty receipts.');
console.log('Prepared-network Original launch → actual weekly viewing/receipts → Finance/replay/reload passed.');
