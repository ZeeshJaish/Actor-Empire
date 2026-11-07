/**
 * #208: the tricks that made a value jump, tried one by one. Zeesh (2026-11-04): "log kya karte the production house me ki
 * studio banaya loan liya inject kiya , valuttion jump kar diya ... to yeh sab dhyaan rakhna hai".
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingOriginalCommission, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getOutstandingLoanBalance } from '../services/loanLogic';
import { valueOwnedStreamingPlatform, streamingPlatformFundamentals } from '../services/valuation/streamingValuation';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { decideStreamingOriginalFuture } from '../services/streamingOriginalsBusiness';
import { makeStreamingSaleBids } from '../services/streamingCompanySale';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const worth = (player: Player) => valueOwnedStreamingPlatform(platformOf(player)).equityValue;
const billions = (value: number) => `${value < 0 ? '−' : ''}$${(Math.abs(value) / 1e9).toFixed(2)}B`;
const withPlatform = (player: Player, change: (platform: ReturnType<typeof platformOf>) => ReturnType<typeof platformOf>): Player => ({ ...player, ownedStreamingPlatform: change(copy(platformOf(player))) });
/* a released Original with a budget, and weeks of its own audience behind it */
const withBudget = (player: Player, budget: number): Player => withPlatform(player, platform => ({
    ...platform,
    originalCommissions: platform.originalCommissions.map(item => (item.status === 'RELEASED' ? { ...item, productionFundingApplied: budget, productionBudgetCap: budget, lifecycleDecision: null } : item)),
}));

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'holes', name: 'Hole Finder', age: 30, currentWeek: 1 });
    let base = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    base = { ...base, energy: { current: 100, max: 100 }, pendingEvents: [], money: 3e9 };
    const start = worth(base);

    /* ── a loan put into the company ── */
    const injected = contributeStreamingFounderCapital(base, 1e9, 'audit');
    assert.ok(injected.changed);
    assert.equal(worth(injected.player) - start, 1e9, '$1B in is $1B of value, at face');
    assert.equal(platformOf(injected.player).founderOwnershipPercent, platformOf(base).founderOwnershipPercent, 'the stake does not change');
    /* the loan brought in the $1B that went in */
    const owes = { ...injected.player, money: injected.player.money + 1e9, finance: { ...injected.player.finance, loans: [{ id: 'audit', principal: 1e9, status: 'ACTIVE' }] } } as unknown as Player;
    assert.equal(getOutstandingLoanBalance(owes), 1e9, 'the loan is on the books');
    /* Forbes: money + stake − loans */
    const netWorth = (player: Player) => player.money + worth(player) * platformOf(player).founderOwnershipPercent / 100 - getOutstandingLoanBalance(player);
    const gained = netWorth(owes) - netWorth(base);
    assert.ok(gained <= 0, `borrowing and putting it in makes nobody richer: ${billions(gained)}`);
    pass(`a $1B loan put in: the company is worth exactly $1.00B more; your net worth moves ${billions(gained)}`);

    /* ── the free buttons ── */
    const budgeted = withBudget(base, 200_000_000);
    const before = worth(budgeted);
    for (const type of ['RENEW', 'FRANCHISE'] as const) {
        let pressed = budgeted;
        let done = 0;
        platformOf(pressed).originalCommissions.filter(item => item.status === 'RELEASED').forEach(item => {
            const result = decideStreamingOriginalFuture(pressed, item.id, type);
            if (result.changed) { pressed = result.player; done += 1; }
        });
        assert.equal(streamingPlatformFundamentals(platformOf(pressed)).franchiseValue, 0, `${type}: no franchise value by itself`);
        const fundamentals = streamingPlatformFundamentals(platformOf(pressed));
        const untouched = streamingPlatformFundamentals(platformOf(budgeted));
        assert.equal(fundamentals.recentHits, untouched.recentHits, `${type}: no hits by pressing it`);
        assert.equal(worth(pressed) - before, platformOf(pressed).treasuryCash - platformOf(budgeted).treasuryCash, `${type}, ${done} titles: no value but what it cost`);
    }
    pass('RENEW and FRANCHISE on every title: the value moves only by what they cost');

    /* ── a franchise with a real follow-up ── */
    const released = platformOf(budgeted).originalCommissions.find(item => item.status === 'RELEASED')!;
    const madeFranchise = withPlatform(budgeted, platform => ({
        ...platform,
        originalCommissions: platform.originalCommissions.map(item => (item.id === released.id ? { ...item, lifecycleDecision: { id: 'x', type: 'FRANCHISE', decidedAtAbsoluteWeek: 1, evidenceWeeks: 4, evidenceSummary: '', exclusiveWindowWeeks: null } } : item)) as OwnedStreamingOriginalCommission[],
    }));
    assert.equal(streamingPlatformFundamentals(platformOf(madeFranchise)).franchiseValue, 0, 'a decision alone is worth nothing');
    const followUp = withPlatform(madeFranchise, platform => ({
        ...platform,
        originalCommissions: [...platform.originalCommissions, { ...released, id: 'follow-up', canonicalProjectId: 'follow-up-project', parentCommissionId: released.id, status: 'IN_PRODUCTION', productionFundingApplied: 100_000_000, lifecycleDecision: null }] as OwnedStreamingOriginalCommission[],
    }));
    assert.equal(streamingPlatformFundamentals(platformOf(followUp)).franchiseValue, 300_000_000, 'with a follow-up in the works it counts');
    pass('a franchise is worth $0 until a follow-up is really in the works, then 1.5 × its budget');

    /* ── hits come from the audience ── */
    const projectIds = platformOf(budgeted).originalCommissions.filter(item => item.status === 'RELEASED').map(item => item.canonicalProjectId).filter(Boolean) as string[];
    const records = platformOf(budgeted).weeklyHistory.flatMap(week => week.operations?.titlePerformance || []);
    const earned = (id: string) => records.filter(row => row.projectId === id).reduce((sum, row) => sum + (row.attributedSubscriptionRevenue || 0) + (row.incrementalRevenue || 0), 0);
    const small = withBudget(base, 1_000);
    const big = withBudget(base, 1e12);
    const hitsSmall = streamingPlatformFundamentals(platformOf(small));
    const flopsBig = streamingPlatformFundamentals(platformOf(big));
    assert.ok(hitsSmall.recentHits > 0, `a title that earned its budget is a hit: ${hitsSmall.recentHits}`);
    assert.ok(flopsBig.recentFlops > 0 && flopsBig.recentHits === 0, `a title far short of it is a flop: ${flopsBig.recentFlops}`);
    assert.ok(projectIds.some(id => earned(id) > 0), 'the records are there');
    pass(`hits and flops come from each title's own audience: ${hitsSmall.recentHits} earned their budget; against an impossible budget ${flopsBig.recentFlops} are flops`);

    /* ── the pipeline ── */
    const paid = 500_000_000;
    const pipelined = withPlatform(base, platform => ({
        ...platform,
        treasuryCash: platform.treasuryCash - paid,
        originalCommissions: [...platform.originalCommissions, { ...platform.originalCommissions[0], id: 'pipeline', canonicalProjectId: 'pipeline-project', status: 'IN_PRODUCTION', productionFundingApplied: paid, productionBudgetCap: paid, lifecycleDecision: null }] as OwnedStreamingOriginalCommission[],
    }));
    assert.ok(worth(pipelined) <= start, `paying $500M for a show in production never adds value: ${billions(worth(pipelined) - start)}`);
    const onRecord = withPlatform(small, platform => ({
        ...platform,
        treasuryCash: platform.treasuryCash - paid,
        originalCommissions: [...platform.originalCommissions, { ...platform.originalCommissions[0], id: 'pipeline', canonicalProjectId: 'pipeline-project', status: 'IN_PRODUCTION', productionFundingApplied: paid, productionBudgetCap: paid, lifecycleDecision: null }] as OwnedStreamingOriginalCommission[],
    }));
    assert.ok(streamingPlatformFundamentals(platformOf(onRecord)).pipelineValue <= paid, 'never more than it cost, whatever the record');
    pass(`the pipeline is at cost at most: $500M into production moves the value ${billions(worth(pipelined) - start)}`);

    /* ── the sale's premium ── */
    const saleOf = (player: Player) => {
        const platform = platformOf(player);
        const sale = { id: 'audit-sale', status: 'BANKERS', startedAtAbsoluteWeek: 0, bidsAtAbsoluteWeek: 0, bidsCloseAtAbsoluteWeek: null, bids: [], acceptedBidId: null, closesAtAbsoluteWeek: null, soldAtAbsoluteWeek: null, rejectedAtAbsoluteWeek: null, founderCash: null, founderPercentAtSale: null } as const;
        return makeStreamingSaleBids(player, platform, { ...sale, bids: [] }, 0)[0].price;
    };
    const cleanBid = saleOf(base);
    const parked = withPlatform(base, platform => ({ ...platform, treasuryCash: platform.treasuryCash + 1e9 }));
    assert.ok(Math.abs(saleOf(parked) - cleanBid - 1e9) <= 20_000_000, 'cash parked before a sale earns no premium');
    const library = withPlatform(base, platform => ({
        ...platform,
        treasuryCash: platform.treasuryCash - 1e9,
        catalogLicenses: [...platform.catalogLicenses, { ...platform.catalogLicenses[0], id: 'audit-licence', status: 'ACTIVE', minimumGuarantee: 1e9, durationWeeks: 104, startsAtAbsoluteWeek: 0, expiresAtAbsoluteWeek: 9999 }],
    }));
    assert.ok(platformOf(library).catalogLicenses.length > 0, 'a catalogue was bought');
    assert.ok(saleOf(library) <= cleanBid + 30_000_000, `a $1B catalogue bought before a sale earns no premium: ${billions(saleOf(library) - cleanBid)}`);
    pass(`the sale: cash and a catalogue bought before it earn no premium (${billions(saleOf(parked) - cleanBid)} for $1B of cash, ${billions(saleOf(library) - cleanBid)} for $1B turned into a catalogue)`);

    /* ── profit, not unspent cash ── */
    const fundamentals = streamingPlatformFundamentals(platformOf(base));
    assert.ok(fundamentals.bookProfitTtm! <= Math.max(fundamentals.earningsTtm, 0) || fundamentals.bookProfitTtm! >= 0, 'both are measured');
    const quiet = withPlatform(base, platform => ({
        ...platform,
        weeklyHistory: platform.weeklyHistory.map(week => (week.operations ? { ...week, operations: { ...week.operations, contentAccountingVersion: 1, netCashContribution: 50_000_000, accountingContribution: -10_000_000 } } : week)),
    }));
    const quietF = streamingPlatformFundamentals(platformOf(quiet));
    assert.ok(quietF.earningsTtm > 0 && quietF.bookProfitTtm! < 0, 'cash coming in, a loss on the books');
    assert.equal(valueOwnedStreamingPlatform(platformOf(quiet)).multiples.earnings, 0, 'so no profit multiple');
    pass('the profit multiple needs real profit: cash not yet spent on a catalogue earns none');

    /* ── raising prices is no trick ── */
    let normal = copy(base);
    let hiked = withPlatform(base, platform => {
        const pricing = platform.serviceConfiguration?.pricing as unknown as { plans?: Array<{ monthly: number }> } | undefined;
        if (pricing?.plans) pricing.plans = pricing.plans.map(plan => ({ ...plan, monthly: Math.round(plan.monthly * 200) / 100 }));
        return platform;
    });
    for (let week = 0; week < 6; week += 1) {
        normal = (await processGameWeek(normal)).player;
        hiked = (await processGameWeek(hiked)).player;
    }
    assert.ok(worth(hiked) <= worth(normal) * 1.1, `doubling prices is no way to a higher value: ${billions(worth(hiked))} against ${billions(worth(normal))}`);
    pass(`doubling prices for 6 weeks: ${billions(worth(hiked))} against ${billions(worth(normal))}`);

    console.log(`Valuation holes audit passed in ${Math.round((Date.now() - started) / 1000)} s. The test company at the start: ${billions(start)}.`);
};

main().catch(error => { console.error(error); process.exit(1); });
