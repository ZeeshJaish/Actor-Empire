/** #184 (plan §22.4): one valuation engine for every company.
 *  - the engine: the same numbers give the same value; cash counts once (no premium) and debt comes off; growth,
 *    margin and a run of hits raise the value; losses, churn, flops, weak reliability, weak leadership and heavy debt
 *    lower it; a company buried in debt keeps a small option value; per share = equity ÷ shares;
 *  - our service: its year and quarter from the weekly books (half cash, half the books' view of content), the
 *    library's remaining rights and owned Originals, the network, the team; every screen reads the same number
 *    (OWNERSHIP, MARKETS, the listing's fair value, options, investors);
 *  - the AI platforms: the same engine on their own economy (85/15 smoothing as before);
 *  - the world's studios: their standing moved by their books, record, slate, cash and debt. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCatalogLicense, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingEquityValuation, getStreamingPublicMarkets } from '../services/streamingPublicMarkets';
import { getStreamingOwnershipView } from '../services/streamingInvestorOffers';
import { calculatePlatformAiValuationBillions, platformAiValuationInput } from '../services/platformAi/platformAiEconomy';
import { valueCompany, type CompanyFundamentals } from '../services/valuation/valuationEngine';
import { streamingPlatformFundamentals, valueAiStreamingPlatform, valueOwnedStreamingPlatform } from '../services/valuation/streamingValuation';
import { valueWorldStudio } from '../services/valuation/studioValuation';
import { fundamentalsOf } from '../components/streaming-transplant/StreamingListingExperience';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Valuation Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const pass = (label: string) => console.log(`✓ ${label}`);
const billions = (value: number) => `$${(value / 1e9).toFixed(2)}B`;

async function main() {
    const started = performance.now();

    /* ── the engine ── */
    const base: CompanyFundamentals = {
        kind: 'STREAMING', revenueTtm: 4e9, revenueRunRate: 4.4e9, earningsTtm: 0.6e9, cash: 1e9, debt: 0.2e9, churnPercent: 2,
        libraryValue: 1.5e9, technologyValue: 0.3e9, pipelineValue: 0.4e9, recentHits: 3, recentFlops: 1, prestige: 40, franchiseValue: 0,
        reliability: 80, leadership: 70, shares: 500_000_000,
    };
    const value = valueCompany(base);
    assert.deepEqual(valueCompany(base), value, 'the same numbers give the same value');
    assert.equal(valueCompany({ ...base, cash: base.cash + 1e9 }).equityValue - value.equityValue, 1e9, 'a billion more cash is a billion more value, no premium');
    assert.equal(value.equityValue - valueCompany({ ...base, debt: base.debt + 0.1e9 }).equityValue, 0.1e9, 'debt comes off');
    assert.ok(valueCompany({ ...base, debt: 9e9 }).risks.includes('Debt'), 'heavy debt is a risk');
    assert.ok(valueCompany({ ...base, revenueRunRate: 5.2e9 }).equityValue > value.equityValue, 'growth raises it');
    assert.ok(valueCompany({ ...base, earningsTtm: 1.2e9 }).equityValue > value.equityValue, 'margin raises it');
    const losing = valueCompany({ ...base, earningsTtm: -1e9 });
    assert.ok(losing.equityValue < value.equityValue && losing.risks.includes('Losing money'), 'losses lower it');
    assert.ok(valueCompany({ ...base, recentHits: 7, recentFlops: 0 }).equityValue > valueCompany({ ...base, recentHits: 0, recentFlops: 7 }).equityValue, 'hits over flops');
    assert.ok(valueCompany({ ...base, churnPercent: 6 }).risks.includes('Members leaving'), 'churn above 2.5% is a risk');
    assert.ok(valueCompany({ ...base, reliability: 30 }).equityValue < value.equityValue, 'weak reliability lowers it');
    assert.ok(valueCompany({ ...base, leadership: 20 }).equityValue < value.equityValue, 'weak leadership lowers it');
    const buried = valueCompany({ ...base, debt: 40e9 });
    assert.equal(buried.equityValue, Math.round(buried.enterpriseValue * 0.05), 'buried in debt: a small option value');
    assert.ok(Math.abs(value.perShare! - value.equityValue / base.shares!) < 1e-6, 'per share');
    pass(`engine: ${billions(value.equityValue)} (EV ${billions(value.enterpriseValue)}, revenue ×${value.multiples.revenue.toFixed(2)}, earnings ×${value.multiples.earnings.toFixed(1)}, risk ${(value.riskDiscount * 100).toFixed(1)}%); +$1B cash = +$1B; growth, margin, hits up; losses, churn, flops, reliability, leadership, debt down`);

    /* ── our service, on the test company ── */
    const player = await buildStreamingFullPlatformQa(fresh('valuation-engine'), { processWeek: processGameWeek, persistWeek: async next => next });
    const platform = platformOf(player);
    const fundamentals = streamingPlatformFundamentals(platform);
    const ours = valueOwnedStreamingPlatform(platform);
    const weeks = platform.weeklyHistory.filter(item => item.operations).slice(-52);
    const manualRevenue = weeks.reduce((sum, item) => sum + item.operations!.subscriptionRevenue + (item.operations!.productRevenue || 0) + (item.operations!.worldViewingIncrementalRevenue || 0), 0) * 52 / weeks.length;
    assert.ok(Math.abs(fundamentals.revenueTtm - manualRevenue) < 1, 'a year of revenue from the weekly books');
    assert.equal(fundamentals.cash, platform.treasuryCash);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const remaining = platform.catalogLicenses.filter(item => item.status === 'ACTIVE')
        .reduce((sum, item) => sum + item.minimumGuarantee * Math.min(1, Math.max(0, item.expiresAtAbsoluteWeek - Math.max(weeks.at(-1)!.absoluteWeek, item.startsAtAbsoluteWeek)) / Math.max(1, item.durationWeeks)), 0);
    assert.ok(fundamentals.libraryValue >= remaining - 1, 'the library holds what is left of every licence');
    assert.equal(getStreamingEquityValuation(platform), ours.equityValue, 'the worth is the engine\'s');
    const richer = { ...platform, treasuryCash: platform.treasuryCash + 1e9 };
    assert.equal(getStreamingEquityValuation(richer) - ours.equityValue, 1e9, 'a billion in the treasury is a billion of worth');
    const licence: OwnedStreamingCatalogLicense = { ...platform.catalogLicenses.find(item => item.status === 'ACTIVE')!, id: 'audit-licence',
        minimumGuarantee: 500_000_000, startsAtAbsoluteWeek: week, expiresAtAbsoluteWeek: week + 104, durationWeeks: 104 };
    const withLicence = streamingPlatformFundamentals({ ...platform, catalogLicenses: [...platform.catalogLicenses, licence] });
    assert.ok(Math.abs(withLicence.libraryValue - fundamentals.libraryValue - 500_000_000) < 1, 'a new licence adds its whole guarantee to the library');
    pass(`our service (the test company): ${billions(ours.equityValue)}: revenue ${billions(fundamentals.revenueTtm)} a year (now ${billions(fundamentals.revenueRunRate)}), earnings ${billions(fundamentals.earningsTtm)}, library ${billions(fundamentals.libraryValue)}, technology ${billions(fundamentals.technologyValue)}, treasury ${billions(fundamentals.cash)}; risks: ${ours.risks.join(', ') || 'none'}`);

    /* ── every screen reads it ── */
    assert.equal(getStreamingPublicMarkets(player).valuation, ours.equityValue, 'MARKETS');
    const ownership = getStreamingOwnershipView(player);
    assert.equal(ownership.worth, ours.equityValue, 'OWNERSHIP');
    const inputs = { founderName: 'A', founderPct: 60, subscribers: platform.metrics.subscribers, arpu: 8, churnPct: 3, peakLoad: 60, techDebt: 10,
        weeklyNet: 0, treasury: 0, checks: [], risks: [], rivals: [], preIpoShares: 100_000_000, initialNewShares: 20_000_000, simulationSeed: 's', absoluteWeek: week };
    assert.equal(fundamentalsOf({ ...inputs, fairValue: ours.equityValue }).fair, ours.equityValue, 'the listing measures its gates against the engine');
    assert.ok(fundamentalsOf(inputs).fair > 0, 'without it (the prototype), its own estimate');
    pass('MARKETS, OWNERSHIP and the listing\'s fair value read the same number');

    /* ── the AI platforms ── */
    const rows = Object.values(player.world.platforms || {}).map(rival => {
        const input = platformAiValuationInput(rival, week);
        const engine = valueAiStreamingPlatform(input).equityValue / 1e9;
        const prior = rival.ai?.standaloneValuationBillions || rival.valuation;
        const next = calculatePlatformAiValuationBillions({ player, platform: rival, absoluteWeek: week });
        assert.ok(Math.abs(next - (prior * 0.85 + engine * 0.15)) < 0.01, `${rival.id}: 85/15 towards the engine`);
        return `${rival.id} ${prior.toFixed(1)}B → engine ${engine.toFixed(1)}B`;
    });
    pass(`the AI platforms move 15% a week towards the engine: ${rows.join('; ')}`);

    /* ── the world's studios ── */
    const studios = Object.values(player.world.studios || {}).filter(studio => !studio.isNpcVenture).slice(0, 6);
    assert.ok(studios.length >= 3, 'the world has studios');
    const lines = studios.map(studio => {
        const valued = valueWorldStudio(studio, week);
        const standing = studio.valuation * 1e9 + studio.cashReserve * 1e6;
        assert.ok(valued.equityValue > standing * 0.6 && valued.equityValue < standing * 1.6, `${studio.id}: near its standing (${billions(valued.equityValue)} vs ${billions(standing)})`);
        return `${studio.name} ${billions(valued.equityValue)}`;
    });
    const studio = studios[0];
    const hot = valueWorldStudio({ ...studio, projectsReleased: 8, hits: 7, flops: 0 }, week).equityValue;
    const cold = valueWorldStudio({ ...studio, projectsReleased: 8, hits: 0, flops: 7 }, week).equityValue;
    assert.ok(hot > cold * 1.15, `a run of hits is worth more than a run of flops (${billions(hot)} vs ${billions(cold)})`);
    const indebted = valueWorldStudio({ ...studio, ai: studio.ai ? { ...studio.ai, finance: { ...studio.ai.finance, debtPrincipalMillions: 5_000 } } : studio.ai }, week).equityValue;
    if (studio.ai) assert.ok(indebted < valueWorldStudio(studio, week).equityValue - 4.9e9, '$5B of debt comes off');
    const restructuring = studio.ai ? valueWorldStudio({ ...studio, ai: { ...studio.ai, status: 'RESTRUCTURING' } }, week).equityValue : 0;
    if (studio.ai) assert.ok(restructuring < valueWorldStudio(studio, week).equityValue, 'restructuring lowers it');
    pass(`the world's studios: ${lines.join('; ')}; ${studio.name} on 7 hits ${billions(hot)}, on 7 flops ${billions(cold)}`);

    console.log(`\nvaluation engine audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
