import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { getAbsoluteWeek, buildLegacyStudioInheritance } from '../services/legacyLogic';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { createStreamingCataloguePackage, acceptStreamingCataloguePackageOffer } from '../services/streamingCataloguePackages';
import { createStreamingCatalogueBiddingSession, advanceStreamingBiddingSession, getStreamingBiddingClosingOffers, acceptStreamingBiddingOffer } from '../services/streamingBidding';
import { getStudioSaleHoldingPeriod, getStudioSaleEarnings, recordStudioSaleEarnings } from '../services/studioSaleHistory';

let checks = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
    try { run(); checks++; console.log('PASS', name); }
    catch (error) { failures.push(name); console.error('FAIL', name, String(error)); }
};
const fixture = (): Player => {
    const p = structuredClone(INITIAL_PLAYER);
    p.age = 30; p.currentWeek = 50;
    const studio = createBusiness('History Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 50, 30);
    studio.id = 'sale_history_studio'; p.businesses = [studio];
    return p;
};
check('new studio lock tracks 4, 12 and 13 completed weeks across year rollover', () => {
    const p = fixture(); const b = p.businesses[0];
    p.age = 31; p.currentWeek = 2;
    assert.deepEqual(getStudioSaleHoldingPeriod(p, b), { eligible: false, elapsedWeeks: 4, remainingWeeks: 9 });
    p.currentWeek = 10;
    assert.deepEqual(getStudioSaleHoldingPeriod(p, b), { eligible: false, elapsedWeeks: 12, remainingWeeks: 1 });
    p.currentWeek = 11;
    assert.deepEqual(getStudioSaleHoldingPeriod(p, b), { eligible: true, elapsedWeeks: 13, remainingWeeks: 0 });
});
check('renaming and renovating cannot reset founding date', () => {
    const p = fixture(); const b = p.businesses[0];
    p.age = 31; p.currentWeek = 11; b.name = 'New Name'; b.stats.locations = 5;
    b.studioState!.lastRenamedWeek = 11; b.studioState!.lastRenamedYear = 31;
    assert.equal(getStudioSaleHoldingPeriod(p, b).elapsedWeeks, 13);
});
check('acquired studio clock starts at acquisition, even if company is old', () => {
    const p = fixture(); const b = p.businesses[0];
    b.foundedAbsoluteWeek = 0;
    b.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION';
    b.studioState!.acquiredYear = 30; b.studioState!.acquiredWeek = 48;
    assert.deepEqual(getStudioSaleHoldingPeriod(p, b), { eligible: false, elapsedWeeks: 2, remainingWeeks: 11 });
});
check('ambiguous old founding week and short history do not impose a new lock', () => {
    const p = fixture(); const b = p.businesses[0];
    delete b.foundedAbsoluteWeek; delete b.foundedYear; b.foundedWeek = 49;
    b.history = Array.from({ length: 12 }, () => ({ week: 0, profit: 10 }));
    assert.equal(getStudioSaleHoldingPeriod(p, b).eligible, true);
});
check('legacy acquired marker still enforces known acquisition date', () => {
    const p = fixture(); const b = p.businesses[0]; b.config.productionType = 'Acquired Studio';
    b.studioState!.acquiredYear = 30; b.studioState!.acquiredWeek = 49;
    assert.deepEqual(getStudioSaleHoldingPeriod(p, b), { eligible: false, elapsedWeeks: 1, remainingWeeks: 12 });
});
check('invalid legacy founding or acquisition dates do not create an arbitrary lock', () => {
    const p = fixture(); const b = p.businesses[0];
    delete b.foundedAbsoluteWeek; b.foundedYear = 0;
    assert.equal(getStudioSaleHoldingPeriod(p, b).eligible, true);
    b.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION';
    b.studioState!.acquiredWeek = 53; b.studioState!.acquiredYear = 30;
    assert.equal(getStudioSaleHoldingPeriod(p, b).eligible, true);
});
check('inheritance to a younger heir preserves studio tenure and trailing earnings', () => {
    const parent = fixture(); parent.age = 80; parent.currentWeek = 10;
    const now = getAbsoluteWeek(80, 10); const b = parent.businesses[0];
    b.foundedYear = 70; b.foundedWeek = 10; b.foundedAbsoluteWeek = getAbsoluteWeek(70, 10);
    b.studioState!.saleEarningsHistory = [{ absoluteWeek: now, revenue: 1_000_000, profit: 200_000 }];
    const inherited = buildLegacyStudioInheritance(parent, { heirAge: 18, heirWeek: 10 });
    const heir = { ...parent, age: 18, currentWeek: 10, businesses: inherited.businesses };
    const studio = heir.businesses[0];
    assert.equal(getStudioSaleHoldingPeriod(heir, studio).eligible, true);
    assert.deepEqual(getStudioSaleEarnings(heir, studio), { revenue: 1_000_000, profit: 200_000, trackedWeeks: 1 });
    assert.equal(b.studioState!.saleEarningsHistory[0].absoluteWeek, now, 'parent save must remain unchanged');
});
check('inheritance does not bypass the remaining lock of a recently acquired studio', () => {
    const parent = fixture(); parent.age = 80; parent.currentWeek = 10;
    const b = parent.businesses[0]; b.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION';
    b.studioState!.acquiredYear = 80; b.studioState!.acquiredWeek = 6;
    const inherited = buildLegacyStudioInheritance(parent, { heirAge: 18, heirWeek: 10 });
    const heir = { ...parent, age: 18, currentWeek: 10, businesses: inherited.businesses };
    assert.deepEqual(getStudioSaleHoldingPeriod(heir, heir.businesses[0]), { eligible: false, elapsedWeeks: 4, remainingWeeks: 9 });
});
check('pre-patch heir save with future parent acquisition date remains eligible', () => {
    const p = fixture(); p.age = 18; p.currentWeek = 10; const b = p.businesses[0];
    b.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION';
    b.studioState!.acquiredYear = 70; b.studioState!.acquiredWeek = 20;
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(p)));
    assert.equal(getStudioSaleHoldingPeriod(reloaded, reloaded.businesses[0]).eligible, true);
});
check('between-turn receipts merge immediately into an existing canonical week, net of investor payouts', () => {
    const p = fixture(); const b = p.businesses[0];
    b.studioState!.saleEarningsHistory = [{ absoluteWeek: getAbsoluteWeek(30, 50), revenue: 100, profit: 20 }];
    b.studioState!.financeLedger = [
        { id: 'new-ui-deal', year: 30, week: 50, amount: 500, type: 'STREAMING_DEAL', label: 'New signed deal' },
        { id: 'new-ui-investor', year: 30, week: 50, amount: -100, type: 'INVESTOR_PAYOUT', label: 'Investor share' },
    ];
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 600, profit: 420, trackedWeeks: 1 });
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 600, profit: 420, trackedWeeks: 1 }, 'read-only lookup must be stable');
});
check('legacy ReleaseWizard net receipts do not deduct their informational investor payout twice', () => {
    const p = fixture(); const b = p.businesses[0]; b.studioState!.saleEarningsHistory = [];
    b.studioState!.financeLedger = [
        { id: 'studio_ledger_bid_offer', year: 30, week: 50, amount: 800, type: 'STREAMING_DEAL', label: 'Film Netflix deal after investor split', projectId: 'film' },
        { id: 'studio_ledger_investor_payout_deal_film_30_50', year: 30, week: 50, amount: -200, type: 'INVESTOR_PAYOUT', label: 'Film investor streaming deal payout', projectId: 'film' },
    ];
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 800, profit: 800, trackedWeeks: 1 });
});
check('multiple same-week UI receipts survive the following statement and reload without duplication', () => {
    const p = fixture(); const b = p.businesses[0];
    b.studioState!.saleEarningsHistory = [{ absoluteWeek: getAbsoluteWeek(30, 50), revenue: 100, profit: 20 }];
    b.studioState!.financeLedger = [
        { id: 'ui-deal-2', year: 30, week: 50, amount: 300, type: 'STREAMING_DEAL', label: 'Second deal' },
        { id: 'ui-deal-1', year: 30, week: 50, amount: 500, type: 'STREAMING_DEAL', label: 'First deal' },
        { id: 'ui-investor', year: 30, week: 50, amount: -100, type: 'INVESTOR_PAYOUT', label: 'Investor share' },
    ];
    const next = structuredClone(p); next.currentWeek = 51;
    next.businesses[0].stats.weeklyRevenue = 40; next.businesses[0].stats.weeklyProfit = -10;
    next.businesses[0].studioState!.financeLedger!.unshift({ id: 'engine-receipt', year: 30, week: 50, amount: 40, type: 'STREAMING_ROYALTY', label: 'Engine royalty' });
    const recorded = recordStudioSaleEarnings(next, getAbsoluteWeek(30, 51), p);
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(recorded)));
    assert.deepEqual(getStudioSaleEarnings(reloaded, reloaded.businesses[0]), { revenue: 940, profit: 710, trackedWeeks: 2 });
    const again = recordStudioSaleEarnings(reloaded, getAbsoluteWeek(30, 51), p);
    assert.deepEqual(getStudioSaleEarnings(again, again.businesses[0]), { revenue: 940, profit: 710, trackedWeeks: 2 });
});
check('one-off receipt counts once, never latest-week times 52', () => {
    const p = fixture(); const b = p.businesses[0];
    b.stats.weeklyRevenue = 600_000_000; b.stats.weeklyProfit = 540_000_000;
    b.studioState!.saleEarningsHistory = [{ absoluteWeek: getAbsoluteWeek(30, 50), revenue: 600_000_000, profit: 540_000_000 }];
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 600_000_000, profit: 540_000_000, trackedWeeks: 1 });
});
check('young studio uses all actual observed weeks without annual extrapolation', () => {
    const p = fixture(); const b = p.businesses[0]; const now = getAbsoluteWeek(30, 50);
    b.studioState!.saleEarningsHistory = Array.from({ length: 13 }, (_, i) => ({ absoluteWeek: now - i, revenue: 10_000_000, profit: 2_000_000 }));
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 130_000_000, profit: 26_000_000, trackedWeeks: 13 });
});
check('52-week window excludes stale future and duplicate entries', () => {
    const p = fixture(); const b = p.businesses[0]; const now = getAbsoluteWeek(30, 50);
    b.studioState!.saleEarningsHistory = Array.from({ length: 60 }, (_, i) => ({ absoluteWeek: now - i, revenue: 100, profit: 20 }));
    b.studioState!.saleEarningsHistory.push({ absoluteWeek: now, revenue: 100, profit: 20 }, { absoluteWeek: now + 1, revenue: 999_000, profit: 999_000 });
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 5_200, profit: 1_040, trackedWeeks: 52 });
});
check('missing history never manufactures income from current weekly scalar', () => {
    const p = fixture(); const b = p.businesses[0];
    b.stats.weeklyRevenue = 1_000_000_000; b.stats.weeklyProfit = 900_000_000;
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 0, profit: 0, trackedWeeks: 0 });
});
check('legacy actual profit history is retained without annualization', () => {
    const p = fixture(); const b = p.businesses[0];
    b.history = [{ week: 0, profit: 500 }, { week: 0, profit: -200 }];
    assert.deepEqual(getStudioSaleEarnings(p, b), { revenue: 0, profit: 300, trackedWeeks: 2 });
});
check('legacy finance ledger recovers receipts, excluding capital and production funding', () => {
    const p = fixture(); const b = p.businesses[0];
    b.studioState!.financeLedger = [
        { id: 'deal', week: 49, year: 30, amount: 500_000, type: 'STREAMING_DEAL', label: 'Paid license' },
        { id: 'capital', week: 49, year: 30, amount: 1_000_000_000, type: 'CAPITAL_INJECTION', label: 'Capital' },
        { id: 'fund', week: 49, year: 30, amount: 1_000_000_000, type: 'INVESTOR_FUNDING', label: 'Funding' },
    ];
    assert.equal(getStudioSaleEarnings(p, b).revenue, 500_000);
});
check('final receipt capture is immutable, survives reload, and is idempotent per completed week', () => {
    const opening = fixture(); const next = structuredClone(opening); next.currentWeek = 51;
    next.businesses[0].stats.weeklyRevenue = 620_000_000;
    next.businesses[0].stats.weeklyProfit = 540_000_000;
    const recorded = recordStudioSaleEarnings(next, getAbsoluteWeek(30, 51), opening);
    const again = recordStudioSaleEarnings(recorded, getAbsoluteWeek(30, 51), opening);
    assert.equal(opening.businesses[0].studioState!.saleEarningsHistory, undefined);
    assert.deepEqual(getStudioSaleEarnings(JSON.parse(JSON.stringify(again)), again.businesses[0]), { revenue: 620_000_000, profit: 540_000_000, trackedWeeks: 1 });
});
check('first capture does not duplicate legacy baseline/current operating profit', () => {
    const opening = fixture(); opening.businesses[0].history = [{ week: 0, profit: 100 }];
    const next = structuredClone(opening); next.currentWeek = 51;
    next.businesses[0].history.unshift({ week: 0, profit: 200 });
    next.businesses[0].stats.weeklyRevenue = 500; next.businesses[0].stats.weeklyProfit = 400;
    const recorded = recordStudioSaleEarnings(next, getAbsoluteWeek(30, 51), opening);
    assert.deepEqual(getStudioSaleEarnings(recorded, recorded.businesses[0]), { revenue: 500, profit: 500, trackedWeeks: 2 });
});
check('new acquisition forecast is not treated as a completed earnings week', () => {
    const opening = fixture(); const next = structuredClone(opening); next.currentWeek = 51;
    const added = structuredClone(next.businesses[0]); added.id = 'just_acquired';
    added.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION'; added.studioState!.acquiredYear = 30; added.studioState!.acquiredWeek = 51;
    added.stats.weeklyRevenue = 50_000_000; added.stats.weeklyProfit = 10_000_000;
    next.businesses.push(added);
    const recorded = recordStudioSaleEarnings(next, getAbsoluteWeek(30, 51), opening);
    assert.deepEqual(getStudioSaleEarnings(recorded, recorded.businesses[1]), { revenue: 0, profit: 0, trackedWeeks: 0 });
});
try {
    let p = fixture(); p.money = 10_000_000_000; p.pendingEvents = []; p.scheduledEvents = []; p.commitments = []; p.activeReleases = [];
    p = (await processGameWeek(p)).player;
    const studioId = p.businesses[0].id; const now = getAbsoluteWeek(p.age, p.currentWeek);
    const before = getStudioSaleEarnings(p, p.businesses[0]);
    p.pastProjects = ['catalogue-a', 'catalogue-b'].map(id => ({
        id, name: id, studioId, projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 80, rating: 8,
        budget: 50_000_000, gross: 200_000_000, streamingRevenue: 0, originalLanguageId: 'english',
        investorPlan: { targetRaise: 10_000_000, totalRaised: 10_000_000, investorEquityPercent: 20, studioEquityPercent: 80, commitments: [] },
        investorPayouts: { lifetimeInvestorPayout: 0, weeklyInvestorPayouts: [] },
    })) as any;
    const created = createStreamingCataloguePackage(p, { studioId, name: 'Real Signed Collection', projectIds: ['catalogue-a', 'catalogue-b'],
        source: 'PLAYER_CURATED', absoluteWeek: now, startsAtAbsoluteWeek: now, desiredCountryIds: ['US'], maximumDurationWeeks: 104,
        windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE' });
    assert.ok(created.package, 'real eligible owned titles must produce a package');
    p = created.player;
    let room = createStreamingCatalogueBiddingSession({ cataloguePackage: created.package!, platforms: [{
        id: 'NETFLIX', name: 'Netflix', color: '#e50914', cashAvailable: 2_000_000_000, baseBid: 100_000_000,
        acquisitionCeiling: 900_000_000, qualityPreference: 75, relationshipMultiplier: 1,
    }] });
    while (room.status === 'LIVE') room = advanceStreamingBiddingSession(room, 1);
    const offer = getStreamingBiddingClosingOffers(room)[0]; assert.ok(offer);
    room = acceptStreamingBiddingOffer(room, offer.id);
    p.world.streamingCataloguePackages![created.package!.id] = { ...created.package!, lifecycle: 'LIVE', biddingSessionId: room.id };
    p.world.streamingBiddingSessions = { [room.id]: room }; p.world.platforms!.NETFLIX.cashReserve = 2_000;
    const signing = acceptStreamingCataloguePackageOffer(p, { packageId: created.package!.id, session: room, offerId: offer.id, absoluteWeek: now });
    assert.equal(signing.changed, true, signing.reason);
    const signed = signing.player; const seller = signed.businesses.find(b => b.id === studioId)!;
    const cashDelta = seller.balance - p.businesses[0].balance;
    const immediate = getStudioSaleEarnings(signed, seller);
    assert.equal(immediate.revenue, before.revenue + offer.minimumGuarantee);
    assert.equal(immediate.profit, before.profit + cashDelta);
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(signed)));
    assert.deepEqual(getStudioSaleEarnings(reloaded, reloaded.businesses[0]), immediate);
    const advanced = (await processGameWeek(reloaded)).player; const finalStudio = advanced.businesses.find(b => b.id === studioId)!;
    const after = getStudioSaleEarnings(advanced, finalStudio);
    assert.equal(after.revenue, immediate.revenue + finalStudio.stats.weeklyRevenue);
    assert.equal(after.profit, immediate.profit + finalStudio.stats.weeklyProfit);
    checks++; console.log('PASS real between-turn catalogue signing with investor payout, save, and next engine tick counts once');
} catch (error) {
    failures.push('real between-turn catalogue signing'); console.error('FAIL real between-turn catalogue signing', error);
}
try {
    let p = fixture(); p.age = 30; p.currentWeek = 52; p.money = 10_000_000_000;
    p.pendingEvents = []; p.scheduledEvents = []; p.commitments = []; p.activeReleases = [];
    p.inbox = []; p.news = []; p.logs = [];
    const b = p.businesses[0]; b.foundedWeek = 52; b.foundedYear = 30;
    b.foundedAbsoluteWeek = getAbsoluteWeek(30, 52); b.balance = 10_000_000_000;
    p.activeReleases = [{
        id: 'history_theatrical', name: 'History Blockbuster', type: 'MOVIE', roleType: 'LEAD',
        distributionPhase: 'THEATRICAL', weekNum: 1, weeklyGross: [], totalGross: 0,
        budget: 100_000_000, status: 'RUNNING', imdbRating: 8.3, productionPerformance: 85,
        projectDetails: {
            title: 'History Blockbuster', type: 'MOVIE', studioId: b.id, subtype: 'STANDALONE',
            genre: 'ADVENTURE', budgetTier: 'BLOCKBUSTER', estimatedBudget: 100_000_000,
            visibleHype: 'HIGH', directorName: 'History Director', hiddenStats: {
                scriptQuality: 85, directorQuality: 85, castingStrength: 85, distributionPower: 85,
                rawHype: 85, qualityScore: 83, prestigeBonus: 0, rareChaosResolved: true,
            },
        },
    } as any];
    for (let elapsed = 1; elapsed <= 13; elapsed++) {
        p = (await processGameWeek(p)).player;
        const studio = p.businesses.find(row => row.id === b.id)!;
        const rows = studio.studioState!.saleEarningsHistory || [];
        assert.equal(rows.length, elapsed, 'each actual engine week must persist exactly one statement');
        const latest = rows[0];
        assert.equal(latest.absoluteWeek, getAbsoluteWeek(p.age, p.currentWeek));
        assert.equal(latest.revenue, studio.stats.weeklyRevenue, 'capture after all release and platform receipts');
        assert.equal(latest.profit, studio.stats.weeklyProfit);
        assert.equal(getStudioSaleHoldingPeriod(p, studio).eligible, elapsed >= 13);
        if (elapsed === 1) {
            assert.equal(p.age, 31); assert.equal(p.currentWeek, 1);
            const theatrical = studio.studioState!.financeLedger!.filter(row => row.type === 'THEATRICAL').reduce((sum, row) => sum + row.amount, 0);
            assert.ok(theatrical > 0, 'real theatrical release must generate receipts');
            assert.ok(latest.revenue >= theatrical, 'late theatrical receipt must be included');
        }
        const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(p)));
        const restored = reloaded.businesses.find(row => row.id === b.id)!;
        assert.deepEqual(restored.studioState!.saleEarningsHistory, rows);
        assert.equal(restored.foundedAbsoluteWeek, b.foundedAbsoluteWeek);
        p = reloaded;
    }
    checks++; console.log('PASS actual 13-week engine flow captures release receipts across rollover and migration');
} catch (error) {
    failures.push('actual 13-week engine capture and migration');
    console.error('FAIL actual 13-week engine capture and migration', error);
}
if (failures.length) throw new Error(`${failures.length} studio-sale history checks failed: ${failures.join(', ')}`);
console.log(`Studio-sale history audit passed (${checks} checks).`);
