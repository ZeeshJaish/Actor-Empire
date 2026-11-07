/** Pay yearly follows the discount, #71 (codex-handoff/plans/platform-tech-plan.md §2: ""Pay yearly" never moves
 *  households to annual billing (a fixed 33%)"; §13, Phase 5: "#71 Pay yearly follows each plan's discount").
 *  Checks:
 *  - the rule: the odds that a subscriber pays yearly grow in step with the discount; 15% keeps the market's one
 *    in three, nothing off means nobody pays yearly;
 *  - the market: on every cohort of the test company's markets, its subscribers move between monthly and yearly
 *    billing as the rule says, with their homes and what they spend; its total is kept, no rival moves, the
 *    billing paths still add up; at 15% nothing moves;
 *  - Define the Launch: the forecast's monthly and yearly buyers follow the discount;
 *  - real weeks: the week the discount changes, subscribers switch billing with their tenure and none cancel for
 *    it; back at 15% they switch back. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type WorldStreamingPlatformOffer } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { STREAMING_ANNUAL_BILLING_SHARE, streamingAnnualBillingShare } from '../services/streamingPricingEconomy';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateWorldStreamingCohort } from '../services/worldEconomy/worldStreamingCompetition';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Pay Yearly Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withDiscount = (player: Player, annualDiscount: number): Player => {
    const platform = player.ownedStreamingPlatform;
    return { ...player, ownedStreamingPlatform: { ...platform, serviceConfiguration: { ...platform.serviceConfiguration,
        pricing: { ...platform.serviceConfiguration.pricing, annualDiscount } } } };
};
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const paidOnly = (offers: WorldStreamingPlatformOffer[]) => offers.map(offer => ({
    ...offer,
    plans: offer.commercialConfiguration.streams.includes('subs')
        ? offer.plans.filter(plan => plan.monthlyPrice > 0 && plan.monthlyBillingPrice > 0 && plan.annualBillingMonthlyPrice > 0)
        : [],
})).filter(offer => offer.plans.length > 0);

async function main() {
    const started = performance.now();

    /* ── the rule ── */
    const steps = [0, 5, 10, 15, 20, 30, 40, 50];
    const shares = steps.map(discount => streamingAnnualBillingShare(discount));
    assert.equal(streamingAnnualBillingShare(0), 0, 'Nothing off: nobody pays yearly');
    assert.equal(streamingAnnualBillingShare(15), STREAMING_ANNUAL_BILLING_SHARE, '15% off: the market\'s one in three');
    assert.ok(Math.abs(streamingAnnualBillingShare(30) - .4962) < .0001, '30% off: twice the odds, about one in two');
    assert.ok(Math.abs(streamingAnnualBillingShare(50) - .6215) < .0001, '50% off: about three in five');
    assert.ok(shares.every((share, index) => !index || share > shares[index - 1]), 'More off, more pay yearly');
    assert.equal(streamingAnnualBillingShare(15, .41), .41, 'At 15% a cohort keeps its own split');
    assert.ok(Math.abs(streamingAnnualBillingShare(30, .41) - (2 * .41 / .59) / (1 + 2 * .41 / .59)) < 1e-12, 'and its odds double at 30%');
    console.log(`PASS rule: ${steps.map((discount, index) => `${discount}% off → ${pct(shares[index])}`).join(', ')} pay yearly`);

    /* ── the market, cohort by cohort ── */
    const qa = await buildStreamingFullPlatformQa(fresh('pay-yearly'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    assert.equal(qa.ownedStreamingPlatform.serviceConfiguration.pricing.annualDiscount, 15, 'The test company sells Pay yearly at 15%');
    const market = (discount: number) => {
        const player = withDiscount(qa, discount);
        const registry = getWorldStreamingOffers(player, week);
        const mine = registry.offers.find(offer => offer.isPlayer)!;
        assert.equal(mine.annualDiscountPercent, discount);
        const byId = new Map(registry.offers.map(offer => [offer.platformId, offer]));
        let monthly = 0, annual = 0, cohorts = 0, held = 0;
        mine.activeCountryIds.slice().sort().forEach(countryId => {
            const offers = paidOnly((registry.byCountry[countryId] || []).map(id => byId.get(id)).filter((offer): offer is WorldStreamingPlatformOffer => Boolean(offer)));
            /* the same prices with the discount the pools already assume: the split before Pay yearly moves anyone */
            const before = offers.map(offer => offer.isPlayer ? { ...offer, annualDiscountPercent: 15 } : offer);
            const participation = player.world.worldAudienceParticipation!.countries[countryId];
            player.world.worldAudienceEconomy!.countries[countryId].cohorts.forEach(cohort => {
                const overlay = participation?.cohorts.find(row => row.cohortId === cohort.id);
                if (!overlay) return;
                const after = allocateWorldStreamingCohort(countryId, cohort, overlay, offers);
                const pools = allocateWorldStreamingCohort(countryId, cohort, overlay, before);
                const rows = (allocation: typeof after, player: boolean) => allocation.paths.flatMap(path => path.allocations
                    .filter(row => row.offer.isPlayer === player)
                    .map(row => `${row.offer.platformId}:${row.plan.id}:${path.billingPath}:${row.households}:${row.primaryHouseholds}:${row.billingPrice}`));
                assert.deepEqual(rows(after, false), rows(pools, false), `${countryId} ${cohort.id}: no rival moves`);
                const count = (allocation: typeof after, path: 'MONTHLY' | 'ANNUAL') => allocation.paths.find(row => row.billingPath === path)!
                    .allocations.filter(row => row.offer.isPlayer).reduce((sum, row) => sum + row.households, 0);
                const total = count(pools, 'MONTHLY') + count(pools, 'ANNUAL');
                assert.equal(count(after, 'MONTHLY') + count(after, 'ANNUAL') <= total, true, `${countryId} ${cohort.id}: none gained`);
                assert.equal(after.paths.reduce((sum, path) => sum + path.reachableHouseholds, 0), after.reachableHouseholds, 'Homes add up');
                assert.ok(Math.abs(after.paths.reduce((sum, path) => sum + path.totalBudget, 0) - after.totalBudget) < .02, 'Budgets add up');
                assert.equal(after.paths.reduce((sum, path) => sum + path.totalSubscriptions, 0), after.totalSubscriptions, 'Subscriptions add up');
                after.paths.forEach(path => assert.ok(path.subscribingHouseholds <= path.reachableHouseholds, 'No path holds more paying homes than it has'));
                if (!total) return;
                cohorts += 1;
                const wanted = Math.round(total * streamingAnnualBillingShare(discount, count(pools, 'ANNUAL') / total));
                if (count(after, 'MONTHLY') + count(after, 'ANNUAL') === total && count(after, 'ANNUAL') === wanted) {
                    monthly += count(after, 'MONTHLY');
                    annual += count(after, 'ANNUAL');
                    return;
                }
                /* a switch to a dearer price stops where that path's budget runs out */
                held += 1;
                assert.ok(discount < 15 || after.paths.some(path => path.totalSpend > path.totalBudget - 1), `${countryId} ${cohort.id}: held only by a budget`);
                monthly += count(after, 'MONTHLY');
                annual += count(after, 'ANNUAL');
            });
        });
        return { monthly, annual, cohorts, held };
    };
    const at = Object.fromEntries([15, 0, 30, 50].map(discount => [discount, market(discount)]));
    const share = (row: { monthly: number; annual: number }) => row.annual / (row.monthly + row.annual);
    assert.equal(at[15].held, 0, 'At 15% nothing moves');
    assert.equal(share(at[0]), 0, 'Nothing off: every subscriber pays monthly');
    assert.ok(share(at[30]) > share(at[15]) + .1 && share(at[50]) > share(at[30]), 'More off, more of them pay yearly');
    console.log(`PASS market: ${at[15].cohorts} cohorts; the test company's subscribers paying yearly: ${[0, 15, 30, 50].map(discount => `${discount}% off ${pct(share(at[discount]))} of ${(at[discount].monthly + at[discount].annual).toLocaleString('en-US')}`).join(', ')}; no rival moved; held by a budget: ${[0, 30, 50].map(discount => `${at[discount].held} at ${discount}%`).join(', ')}`);

    /* ── Define the Launch ── */
    const countries = getWorldStreamingOffers(qa, week).offers.find(offer => offer.isPlayer)!.activeCountryIds.slice(0, 6);
    const forecast = (discount: number) => {
        const result = forecastWorldStreamingLaunchPricing(qa, { ...qa.ownedStreamingPlatform.serviceConfiguration.pricing, annualDiscount: discount }, countries);
        const annual = result.planAllocations.reduce((sum, row) => sum + row.annualHouseholds, 0);
        const households = result.planAllocations.reduce((sum, row) => sum + row.households, 0);
        assert.ok(result.planAllocations.every(row => row.monthlyHouseholds + row.annualHouseholds === row.households), 'Plan rows add up');
        return { annual, households, revenue: result.firstYearSubscriptionRevenue };
    };
    const forecasts = [0, 15, 30, 50].map(forecast);
    assert.equal(forecasts[0].annual, 0, 'The forecast: nothing off, no yearly buyers');
    assert.ok(forecasts[1].annual > 0 && forecasts[2].annual / forecasts[2].households > forecasts[1].annual / forecasts[1].households
        && forecasts[3].annual / forecasts[3].households > forecasts[2].annual / forecasts[2].households, 'and more yearly buyers the more off');
    console.log(`PASS forecast (${countries.join(', ')}): ${[0, 15, 30, 50].map((discount, index) => `${discount}% off ${forecasts[index].annual.toLocaleString('en-US')} of ${forecasts[index].households.toLocaleString('en-US')} yearly, year one $${Math.round(forecasts[index].revenue).toLocaleString('en-US')}`).join(' · ')}`);

    /* ── real weeks ── */
    const accounts = (player: Player) => {
        const state = player.world.worldStreamingCustomers!;
        const cells = Object.values(state.countries).flatMap(country => country.cohorts.flatMap(cohort => cohort.planCells
            .filter(cell => cell.platformId === 'PLAYER').map(cell => ({ ...cell, billingPath: cohort.billingPath }))));
        const annual = cells.filter(cell => cell.billingPath === 'ANNUAL').reduce((sum, cell) => sum + cell.paidAccounts, 0);
        const total = cells.reduce((sum, cell) => sum + cell.paidAccounts, 0);
        return { annual, total, share: annual / Math.max(1, total), loyal: cells.reduce((sum, cell) => sum + cell.tenureLoyalAccounts, 0),
            cancelled: state.global.playerCancellations, joined: state.global.playerJoins, billedAt: state.playerAnnualDiscount,
            revenue: state.global.playerMonthlySubscriptionRevenue };
    };
    const steady = (await processGameWeek(qa)).player;
    const raised = (await processGameWeek(withDiscount(qa, 30))).player;
    const [a, b] = [accounts(steady), accounts(raised)];
    assert.equal(a.billedAt, 15);
    assert.equal(b.billedAt, 30, 'The state remembers the discount its subscribers are billed at');
    assert.ok(b.share > a.share + .1, 'Raising the discount moves subscribers to yearly billing that week');
    assert.ok(Math.abs(b.total / a.total - 1) < .01, 'and keeps them');
    assert.ok(b.cancelled <= a.cancelled * 1.02 + 100, 'None cancel for it');
    assert.ok(Math.abs(b.loyal / a.loyal - 1) < .02, 'Their tenure goes with them');
    assert.ok(b.revenue < a.revenue, 'Paying yearly costs the service what it takes off');
    console.log(`PASS raise: one week at 15% → ${pct(a.share)} of ${a.total.toLocaleString('en-US')} pay yearly, ${a.cancelled.toLocaleString('en-US')} cancel; at 30% → ${pct(b.share)} of ${b.total.toLocaleString('en-US')}, ${b.cancelled.toLocaleString('en-US')} cancel; monthly revenue $${Math.round(a.revenue).toLocaleString('en-US')} → $${Math.round(b.revenue).toLocaleString('en-US')}`);
    const kept = accounts((await processGameWeek(raised)).player);
    const back = accounts((await processGameWeek(withDiscount(raised, 15))).player);
    assert.equal(kept.billedAt, 30);
    assert.ok(Math.abs(kept.share - b.share) < .03, 'The next week at 30% they stay where they are');
    assert.equal(back.billedAt, 15);
    assert.ok(Math.abs(back.share - a.share) < .03, 'Back at 15%, they switch back');
    assert.ok(back.cancelled <= kept.cancelled * 1.05 + 100, 'and none cancel for that either');
    console.log(`PASS back: the next week at 30% ${pct(kept.share)} (${kept.cancelled.toLocaleString('en-US')} cancel); back at 15% ${pct(back.share)} (${back.cancelled.toLocaleString('en-US')} cancel)`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
