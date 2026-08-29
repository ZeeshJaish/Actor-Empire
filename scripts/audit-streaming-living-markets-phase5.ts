import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { getStreamingCountryMarketProfile, STREAMING_DAY_ONE_MARKETS } from '../services/streamingDayOneMarkets';
import {
    advanceStreamingMarketClearances,
    beginStreamingMarketClearance,
    calculateStreamingMarketOperatingCosts,
    getStreamingMarketClearanceView,
    resolveStreamingMarketRequirement,
    saveStreamingMarketPlan,
} from '../services/streamingMarkets';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { forecastPricing, type PricingSettings } from '../components/studio-finance/finance/launch';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const atAbsoluteWeek = (player: Player, absoluteWeek: number): Player => ({
    ...player,
    age: Math.floor(absoluteWeek / 52) + 1,
    currentWeek: absoluteWeek % 52 + 1,
});

const eligible: Player = {
    ...clone(INITIAL_PLAYER),
    id: 'living-market-phase5',
    name: 'Market Founder',
    money: 700_000_000,
    news: [],
    ownedStreamingPlatform: {
        ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
        lifecycle: 'ELIGIBLE',
        simulationSeed: 'owned-streaming:living-market-phase5',
        milestoneKeys: ['streaming-launch-clearance'],
    },
};
const drafted = saveStreamingFoundingDraft(eligible, {
    ...createDefaultStreamingFoundingDraft(100),
    currentStep: 2,
    name: 'Atlas+',
});
const incorporatedResult = incorporateOwnedStreamingPlatform(drafted);
assert(incorporatedResult.changed, 'The living-market fixture should incorporate successfully.');
const incorporated = incorporatedResult.player;

const basePricing = incorporated.ownedStreamingPlatform.serviceConfiguration.pricing as PricingSettings;
const householdForecast = forecastPricing(basePricing, 10_000_000, { rivalAveragePrice: 12, reachRate: 0.06 });
assert(householdForecast.households <= householdForecast.addressable, 'Paid and free reach must never exceed the addressable household base.');
assert(householdForecast.monthlyRevenue > 0, 'A configured subscription offer should produce a household-based revenue forecast.');
const expensiveForecast = forecastPricing({
    ...basePricing,
    plans: basePricing.plans.map(plan => ({ ...plan, monthly: plan.monthly * 2 })),
}, 10_000_000, { rivalAveragePrice: 12, reachRate: 0.06 });
assert(expensiveForecast.subscribers < householdForecast.subscribers, 'Raising every plan above the rival benchmark should reduce expected subscribers.');

assert(STREAMING_DAY_ONE_MARKETS.length >= 24, 'The permanent market catalogue should retain the full country roster.');
for (const market of STREAMING_DAY_ONE_MARKETS) {
    const profile = getStreamingCountryMarketProfile(market.id);
    assert(profile?.countryId === market.id, `${market.id} should resolve one canonical country dossier.`);
    assert(Boolean(profile?.languageDistribution.length), `${market.id} should persist language distribution.`);
    assert(Boolean(profile?.competitors.length), `${market.id} should persist competitors.`);
    assert((profile?.approvalPeriodWeeks.minimum || 0) >= 4 && (profile?.approvalPeriodWeeks.maximum || 0) <= 6, `${market.id} approval should remain inside the 4-6 week game window.`);
    assert((profile?.entryCosts.total || 0) > 0, `${market.id} should expose a real entry-cost breakdown.`);
    assert((profile?.recommendedNetworkFootprint.edgeSites || 0) > 0, `${market.id} should expose a network recommendation.`);
}

const treasuryBeforePlan = incorporated.ownedStreamingPlatform.treasuryCash;
const openingPlan = saveStreamingMarketPlan(incorporated, ['US'], 'OPENING');
assert(openingPlan.changed && openingPlan.reason === 'SAVED', 'Opening market planning should create the country record.');
assert(openingPlan.player.ownedStreamingPlatform.treasuryCash === treasuryBeforePlan, 'Evaluating and planning a country must remain free.');
const openingOperation = openingPlan.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US');
assert(openingOperation?.countryProfile?.country === 'United States', 'The operation should persist the country dossier, not only an ID.');

const duplicateExpansion = saveStreamingMarketPlan(openingPlan.player, ['US'], 'EXPANSION');
assert(!duplicateExpansion.changed && duplicateExpansion.reason === 'NO_MARKETS', 'A country already in the opening footprint should not be sold again as expansion.');
assert(duplicateExpansion.player.ownedStreamingPlatform.marketOperations.filter(operation => operation.countryId === 'US').length === 1, 'Opening and expansion must never duplicate the same country record.');
assert(duplicateExpansion.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US')?.id === openingOperation?.id, 'Opening and expansion must resolve the same permanent market identity.');

const funded: Player = {
    ...openingPlan.player,
    ownedStreamingPlatform: { ...openingPlan.player.ownedStreamingPlatform, treasuryCash: 200_000_000 },
};
const clearanceStart = beginStreamingMarketClearance(funded, ['US'], 'OPENING');
assert(clearanceStart.changed && clearanceStart.reason === 'STARTED', 'Confirming market entry should start clearance.');
assert(clearanceStart.energyCost === 5 && clearanceStart.player.energy.current === funded.energy.current - 5, 'A country filing should consume the disclosed one-time 5 energy and never create weekly busywork.');
const startedOperation = clearanceStart.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US');
assert(startedOperation?.status === 'CLEARANCE' && startedOperation.clearance?.stage === 'APPLICATION_FILED', 'Clearance should begin as a staged government file.');
assert(startedOperation?.policySnapshot?.nextElectionAtAbsoluteWeek, 'The live country record should schedule a future policy cycle.');
const chargedTreasury = clearanceStart.player.ownedStreamingPlatform.treasuryCash;
const repeatedStart = beginStreamingMarketClearance(clearanceStart.player, ['US'], 'OPENING');
assert(!repeatedStart.changed && repeatedStart.player.ownedStreamingPlatform.treasuryCash === chargedTreasury, 'Reopening clearance must never double-charge entry costs.');
assert(repeatedStart.player.energy.current === clearanceStart.player.energy.current, 'Reopening clearance must never double-charge filing energy.');

const startWeek = getAbsoluteWeek(clearanceStart.player.age, clearanceStart.player.currentWeek);
const oneWeekLater = advanceStreamingMarketClearances(atAbsoluteWeek(clearanceStart.player, startWeek + 1));
const progressing = oneWeekLater.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US');
assert((progressing?.clearance?.progressPercent || 0) > 8, 'Government review should visibly advance with game weeks.');
assert(getStreamingMarketClearanceView(progressing!, startWeek + 1).stage !== null, 'The presentation adapter should expose the live review stage.');

const requirementFixture: Player = {
    ...oneWeekLater.player,
    ownedStreamingPlatform: {
        ...oneWeekLater.player.ownedStreamingPlatform,
        treasuryCash: 10_000_000,
        marketOperations: oneWeekLater.player.ownedStreamingPlatform.marketOperations.map(operation => operation.countryId === 'US' ? {
            ...operation,
            status: 'AWAITING_FUNDING' as const,
            clearance: operation.clearance ? { ...operation.clearance, outcome: 'ADDITIONAL_REQUIREMENT' as const, additionalPayment: 500_000, condition: 'Enhanced filing required.' } : null,
        } : operation),
    },
};
const resolved = resolveStreamingMarketRequirement(requirementFixture, openingOperation!.id);
assert(resolved.changed && resolved.reason === 'RESOLVED', 'The player should be able to fund and submit an additional government requirement.');
assert(resolved.player.ownedStreamingPlatform.treasuryCash === 9_500_000, 'Additional requirements should debit the exact disclosed amount once.');
assert(resolved.player.energy.current === requirementFixture.energy.current - 3, 'Submitting an additional government requirement should cost the disclosed 3 energy once.');
assert(resolved.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'MARKET_REQUIREMENT_RESOLVED'), 'Requirement resolution should be auditable in Studio Finance and the event ledger.');
assert(resolved.player.ownedStreamingPlatform.costCommitments.some(entry => entry.label.includes('additional compliance filing') && entry.paidAmount === 500_000), 'Additional government payments should appear in the unified paid launch-cost record.');

const activeOperation = {
    ...resolved.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US')!,
    status: 'ACTIVE' as const,
    policySnapshot: {
        ...resolved.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US')!.policySnapshot!,
        nextElectionAtAbsoluteWeek: startWeek + 2,
    },
};
const activePlayer: Player = {
    ...atAbsoluteWeek(resolved.player, startWeek + 2),
    ownedStreamingPlatform: {
        ...resolved.player.ownedStreamingPlatform,
        marketOperations: resolved.player.ownedStreamingPlatform.marketOperations.map(operation => operation.countryId === 'US' ? activeOperation : operation),
    },
};
const costs = calculateStreamingMarketOperatingCosts(activePlayer.ownedStreamingPlatform, 10_000_000);
assert(costs.marketOperatingCost > 0 && costs.marketPolicyCost > 0, 'Active-country operating cost, tax and levy must enter the real weekly P&L.');
const election = advanceStreamingMarketClearances(activePlayer);
const postElection = election.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === 'US');
assert((postElection?.policySnapshot?.revision || 0) === 1, 'An election cycle should create a new persistent policy revision.');
assert(election.player.news.some(item => item.id.startsWith('news_market_')), 'Policy and clearance outcomes should create player-visible news.');
assert(election.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'MARKET_POLICY_CHANGED'), 'Policy changes should be preserved in the canonical ledger.');

const wizardSource = readFileSync('components/StreamingDefineLaunchWizard.tsx', 'utf8');
const launchExperienceSource = readFileSync('components/StreamingDefineLaunchExperience.tsx', 'utf8');
const audienceSource = readFileSync('components/streaming-transplant/StreamingAudienceExperience.tsx', 'utf8');
const flagSource = readFileSync('components/studio-finance/components/FlagField.tsx', 'utf8');
const flagAsset = readFileSync('public/assets/streaming/country-flags.svg', 'utf8');
assert(wizardSource.includes('Government review') && wizardSource.includes('Country terms') && wizardSource.includes('SUBMIT REQUIREMENT'), 'The clearance wizard should show the living government-review experience and recovery action.');
assert(launchExperienceSource.includes('saveStreamingMarketPlan(props.player, plannedCountryIds || countryIds') && launchExperienceSource.includes('beginStreamingMarketClearance(filingBase'), 'Filing from the transplanted wizard must save the visible footprint before starting government review.');
assert(audienceSource.includes('Country portfolio') && audienceSource.includes('one living record per market') && audienceSource.includes('NEXT POLICY CYCLE'), 'Audience Markets should be the permanent country expansion headquarters.');
assert(flagSource.includes("/assets/streaming/country-flags.svg") && flagSource.includes('FLAG_CELLS'), 'Every supported market should use the supplied country-flag kit through one shared renderer.');
assert(flagAsset.startsWith('<svg') || flagAsset.includes('<svg'), 'The transplanted country-flag asset should remain a valid SVG document.');

console.log('EMPIRE+ Phase 5 Living Markets audit passed.');
