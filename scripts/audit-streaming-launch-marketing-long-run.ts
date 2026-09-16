import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  INITIAL_PLAYER,
  createInitialOwnedStreamingPlatformState,
  type OwnedStreamingLaunchMarketingDraft,
  type Player,
} from '../types';
import {
  forecastStreamingLaunchMarketing,
  getStreamingLaunchMarketingRecommendations,
  type StreamingLaunchMarketingCountryInput,
  type StreamingLaunchMarketingInput,
} from '../services/streamingLaunchMarketing';
import {
  processOwnedStreamingLaunchMarketingWeek,
  reserveOwnedStreamingLaunchMarketing,
  saveOwnedStreamingLaunchMarketingDraft,
  settleOwnedStreamingLaunchMarketingAtOpening,
} from '../services/streamingLaunchMarketingLifecycle';
import { normalizePlatformAiState } from '../services/platformAi/platformAiState';
import { preparePlatformAiLaunchMarketingWeek } from '../services/platformAi/platformAiLaunchMarketing';
import { settlePlatformAiEconomy } from '../services/platformAi/platformAiEconomy';

const finiteTree = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  if (value && typeof value === 'object') return Object.values(value).every(finiteTree);
  return true;
};

const countries = (count: number, weak = false): StreamingLaunchMarketingCountryInput[] => Array.from(
  { length: count },
  (_, index) => ({
    countryId: `C${String(index).padStart(2, '0')}`,
    countryName: `Country ${index + 1}`,
    reachableHouseholds: 2_000_000 + index * 725_000,
    baseConcurrentStreams: 25_000 + index * 4_000,
    conversionHeadroom: Math.max(.08, .62 - index * .008),
    mediaCostIndex: .65 + index % 6 * .2,
    purchasingPowerIndex: .45 + index % 5 * .22,
    consumerConfidence: .42 + index % 4 * .12,
    internetAccess: .5 + index % 5 * .1,
    localizationCoverage: weak ? .12 : .58 + index % 3 * .14,
    catalogueCoverage: weak ? .08 : .62 + index % 3 * .12,
    competitionPressure: .35 + index % 5 * .12,
    priorAwareness: .02 + index % 4 * .03,
  }),
);

const baseInput = (count: number, weak = false): StreamingLaunchMarketingInput => ({
  platformKey: `long-run-${count}-${weak}`,
  absoluteWeek: 900,
  buildWeeks: 15,
  availableTreasury: 5_000_000_000,
  protectedOperatingCash: 600_000_000,
  hasSellablePlan: true,
  hasFlagshipOriginal: true,
  pricingRevision: weak ? 99 : 3,
  catalogueRevision: weak ? 0 : 16,
  localizationRevision: weak ? 0 : 12,
  competitionRevision: 22,
  countries: countries(count, weak),
});

const draft = (budgetCeiling: number): OwnedStreamingLaunchMarketingDraft => ({
  schemaVersion: 1,
  objective: 'VALUE_PROPOSITION',
  timeline: 'BALANCED',
  budgetCeiling,
  allocationMode: 'AUTO',
  countryWeights: {},
  channelAllocations: { SOCIAL_DIGITAL: .45, CREATORS: .25, TV_OUTDOOR: .15, PRESS_EVENTS: .15 },
  updatedAtAbsoluteWeek: 900,
  revision: 1,
});

const evidence: unknown[] = [];
for (const count of [2, 12, 40]) {
  for (const weak of [false, true]) {
    const input = baseInput(count, weak);
    const recommendations = getStreamingLaunchMarketingRecommendations(input);
    const budgets = [0, recommendations.lean, recommendations.balanced, recommendations.heavy, recommendations.event, 9_000_000_000];
    for (const budget of budgets) {
      const forecast = forecastStreamingLaunchMarketing(input, draft(budget));
      const replay = forecastStreamingLaunchMarketing(input, draft(budget));
      assert.deepEqual(replay, forecast, 'Forecasts must be deterministic.');
      assert.equal(finiteTree(forecast), true, 'Every numeric forecast value must remain finite.');
      assert.ok(forecast.organicAwareness >= 0 && forecast.organicAwareness <= 1);
      assert.ok(forecast.likelyAwarenessLift >= 0 && forecast.likelyAwarenessLift <= 1);
      assert.ok(forecast.acquiredAccounts.low <= forecast.acquiredAccounts.likely);
      assert.ok(forecast.acquiredAccounts.likely <= forecast.acquiredAccounts.high);
      assert.equal(
        forecast.countryForecasts.reduce((sum, country) => sum + country.allocatedAmount, 0),
        forecast.effectiveBudget,
        'Country allocation must conserve the effective budget exactly.',
      );
      if (budget === 0) assert.equal(forecast.likelyAwarenessLift, 0, 'Organic must create no paid lift.');
      if (budget > input.availableTreasury - input.protectedOperatingCash) {
        assert.ok(forecast.warnings.includes('BUDGET_SHORTFALL'));
      }
      evidence.push({ count, weak, budget, forecast });
    }
  }
}

const lifecycleInput = baseInput(12);
const lifecycleForecast = forecastStreamingLaunchMarketing(
  lifecycleInput,
  draft(getStreamingLaunchMarketingRecommendations(lifecycleInput).balanced),
);
const initialPlatform = createInitialOwnedStreamingPlatformState('marketing-long-run');
let player: Player = {
  ...structuredClone(INITIAL_PLAYER),
  id: 'marketing-long-run',
  age: 20,
  currentWeek: 1,
  ownedStreamingPlatform: {
    ...initialPlatform,
    lifecycle: 'FOUNDING',
    treasuryCash: 5_000_000_000,
    simulationSeed: 'marketing-long-run',
  },
};
player = saveOwnedStreamingLaunchMarketingDraft(player, draft(lifecycleForecast.effectiveBudget)).player;
const reserved = reserveOwnedStreamingLaunchMarketing(player, lifecycleForecast, 20 * 52 + 16, lifecycleInput.countries.map(country => country.countryId));
assert.equal(reserved.changed, true);
player = reserved.player;
const openingCash = player.ownedStreamingPlatform.treasuryCash;
let processedSpend = 0;
for (let week = 2; week <= 157; week += 1) {
  player = { ...player, currentWeek: week };
  const processed = processOwnedStreamingLaunchMarketingWeek(player);
  player = processed.player;
  processedSpend += processed.spentAmount;
  assert.equal(processOwnedStreamingLaunchMarketingWeek(player).spentAmount, 0, 'A player week cannot spend twice.');
  assert.equal(finiteTree(player.ownedStreamingPlatform.launchMarketingPlan), true);
}
assert.equal(openingCash - player.ownedStreamingPlatform.treasuryCash, processedSpend, 'Player treasury movement must equal paid marketing spend.');
const beforeSettlementCash = player.ownedStreamingPlatform.treasuryCash;
player = settleOwnedStreamingLaunchMarketingAtOpening(player).player;
assert.equal(player.ownedStreamingPlatform.treasuryCash, beforeSettlementCash, 'Returning unused authorization cannot mint cash.');

const aiPlayer = structuredClone(INITIAL_PLAYER);
let aiPlatform = normalizePlatformAiState(aiPlayer.world.platforms!.NETFLIX, aiPlayer.id, 900);
const openingAiSubscribers = aiPlatform.subscribers;
let aiAccrued = 0;
for (let offset = 0; offset < 156; offset += 1) {
  const week = 900 + offset;
  const processed = preparePlatformAiLaunchMarketingWeek({ player: aiPlayer, platform: aiPlatform, absoluteWeek: week });
  aiAccrued += processed.discretionaryCostMillions;
  assert.equal(
    preparePlatformAiLaunchMarketingWeek({ player: aiPlayer, platform: processed.platform, absoluteWeek: week }).discretionaryCostMillions,
    0,
    'An AI week cannot accrue the same instalment twice.',
  );
  const settled = settlePlatformAiEconomy({
    player: aiPlayer,
    platform: processed.platform,
    absoluteWeek: week,
    discretionaryCostMillions: processed.discretionaryCostMillions,
  });
  assert.equal(
    settled.snapshot?.discretionaryCostAccruedMillions || 0,
    processed.discretionaryCostMillions,
    'Each AI marketing instalment must enter the canonical economy once.',
  );
  aiPlatform = settled.platform;
  assert.equal(finiteTree(aiPlatform.ai?.launchMarketingHistory), true);
}
const aiCommitted = aiPlatform.ai!.launchMarketingHistory.reduce((sum, campaign) => sum + campaign.budgetCeilingMillions, 0);
assert.equal(Math.round(aiAccrued * 1_000_000), Math.round(aiCommitted * 1_000_000), 'AI weekly instalments must conserve the campaign budget.');
assert.ok(aiPlatform.subscribers > openingAiSubscribers, 'AI marketing must settle bounded audience acquisition over the long run.');

evidence.push({ processedSpend, aiAccrued, aiHistory: aiPlatform.ai!.launchMarketingHistory });
const checksum = createHash('sha256').update(JSON.stringify(evidence)).digest('hex').slice(0, 20);
console.log(`Streaming launch marketing long-run audit passed. checksum=${checksum}`);
