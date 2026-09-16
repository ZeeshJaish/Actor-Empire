import assert from 'node:assert/strict';
import { validateWorldEconomyCandidate } from '../services/worldEconomy/worldEconomyIntegrity';
import {
    buildWorldEconomyWe8Scenario,
    WORLD_ECONOMY_WE8_SCENARIOS,
} from './fixtures/worldEconomyWe8Scenarios';

const absoluteWeek = 2_400;
const outcomes = Object.fromEntries(WORLD_ECONOMY_WE8_SCENARIOS.map(scenario => {
    const player = buildWorldEconomyWe8Scenario(scenario, absoluteWeek);
    const validation = validateWorldEconomyCandidate(player, absoluteWeek);
    assert.deepEqual(validation, { status: 'VALID', violations: [] }, `${scenario} remains finite and reconciled`);
    return [scenario, {
        budget: player.world.worldAudienceEconomy!.global.totalMonthlyEntertainmentBudget,
        reachable: player.world.worldAudienceParticipation!.global.streamingReachableHouseholds,
        subscriptions: player.world.worldStreamingCompetition!.global.totalSubscriptions,
        piracyReach: player.world.worldStreamingCustomers!.global.piracyReach,
        playerAccounts: player.world.worldStreamingCustomers!.global.playerEndingPaidAccounts,
        playerRevenue: player.world.worldStreamingCustomers!.global.playerMonthlySubscriptionRevenue,
    }];
}));

assert.equal(Object.keys(outcomes).length, 24, 'the release matrix covers all 24 approved lifecycle and economy scenarios');
assert.ok(outcomes.RECESSION.budget < outcomes.BASELINE.budget, 'recession lowers discretionary entertainment budgets');
assert.ok(outcomes.BOOM.budget > outcomes.BASELINE.budget, 'boom expands discretionary entertainment budgets');
assert.ok(outcomes.CONNECTIVITY_GROWTH.reachable > outcomes.BASELINE.reachable, 'connectivity investment expands reachable households');
assert.ok(outcomes.PRICE_WAR.playerAccounts >= outcomes.PREMIUM_FIT.playerAccounts, 'a fitted premium offer may trade reach for price');
assert.ok(outcomes.PREMIUM_FIT.playerRevenue > 0 && outcomes.PRICE_WAR.playerRevenue > 0, 'both price strategies settle real subscription revenue');
assert.ok(outcomes.PIRACY.piracyReach > 0, 'piracy creates unlicensed reach without becoming a subscription plan');

console.log(`World economy WE8 shock matrix passed: ${Object.keys(outcomes).length} deterministic scenarios.`);
