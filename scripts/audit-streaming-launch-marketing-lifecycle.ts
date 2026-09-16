import assert from 'node:assert/strict';
import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player, type StreamingLaunchMarketingForecastSnapshot } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
  processOwnedStreamingLaunchMarketingWeek,
  reserveOwnedStreamingLaunchMarketing,
  saveOwnedStreamingLaunchMarketingDraft,
  settleOwnedStreamingLaunchMarketingAtOpening,
} from '../services/streamingLaunchMarketingLifecycle';

const basePlatform = createInitialOwnedStreamingPlatformState('marketing-life');
const player: Player = {
  ...INITIAL_PLAYER,
  id: 'marketing-life',
  age: 20,
  currentWeek: 10,
  ownedStreamingPlatform: {
    ...basePlatform,
    lifecycle: 'FOUNDING',
    treasuryCash: 20_000_000,
    simulationSeed: 'marketing-life-seed',
  },
};
const saved = saveOwnedStreamingLaunchMarketingDraft(player, { budgetCeiling: 6_000_000 });
assert.equal(saved.changed, true);
assert.equal(saved.player.ownedStreamingPlatform.treasuryCash, 20_000_000, 'Editing a draft must not move cash.');

const absoluteWeek = getAbsoluteWeek(saved.player.age, saved.player.currentWeek);
const forecast: StreamingLaunchMarketingForecastSnapshot = {
  id: 'forecast-life', version: 1, signature: 'signature-life', effectiveBudget: 6_000_000,
  organicAwareness: .05, likelyAwarenessLift: .2,
  baselineConcurrentStreams: 1_000, saturationPercent: 70, efficiencyStatus: 'EFFICIENT',
  acquiredAccounts: { low: 100, likely: 200, high: 260 },
  concurrentStreams: { low: 1_000, likely: 2_000, high: 3_000 },
  customerAcquisitionCost: 30_000, confidenceScore: 86, confidence: 'HIGH', warnings: [],
  countryForecasts: [
    { countryId: 'US', countryName: 'United States', allocatedAmount: 6_000_000, organicAwareness: .05, likelyAwarenessLift: .2, likelyAcquiredAccounts: 200, likelyConcurrentStreams: 2_000, customerAcquisitionCost: 30_000, confidenceScore: 86, confidence: 'HIGH' },
  ],
};

const reserved = reserveOwnedStreamingLaunchMarketing(saved.player, forecast, absoluteWeek + 3, ['US']);
assert.equal(reserved.changed, true);
assert.equal(reserved.player.ownedStreamingPlatform.treasuryCash, 20_000_000, 'Reservation must not prepay cash.');
assert.equal(reserved.player.ownedStreamingPlatform.launchMarketingPlan?.status, 'RESERVED');
assert.equal(reserved.player.ownedStreamingPlatform.costCommitments.filter(item => item.category === 'MARKETING').length, 1);
assert.equal(reserveOwnedStreamingLaunchMarketing(reserved.player, forecast, absoluteWeek + 3, ['US']).changed, false);

const weekOnePlayer: Player = { ...reserved.player, currentWeek: reserved.player.currentWeek + 1 };
const weekOne = processOwnedStreamingLaunchMarketingWeek(weekOnePlayer);
assert.equal(weekOne.processed, true);
assert.ok(weekOne.player.ownedStreamingPlatform.treasuryCash < 20_000_000);
const cashAfterWeekOne = weekOne.player.ownedStreamingPlatform.treasuryCash;
assert.equal(processOwnedStreamingLaunchMarketingWeek(weekOne.player).player.ownedStreamingPlatform.treasuryCash, cashAfterWeekOne, 'A week cannot spend twice.');

const beforeSettleCash = weekOne.player.ownedStreamingPlatform.treasuryCash;
const settled = settleOwnedStreamingLaunchMarketingAtOpening(weekOne.player);
assert.equal(settled.player.ownedStreamingPlatform.treasuryCash, beforeSettleCash, 'Returning authorization must not create cash.');
assert.equal(settled.player.ownedStreamingPlatform.launchMarketingPlan?.status, 'SETTLED');
assert.ok((settled.player.ownedStreamingPlatform.launchMarketingPlan?.returnedAmount || 0) > 0);

const organicPlayer = saveOwnedStreamingLaunchMarketingDraft(player, { budgetCeiling: 0 }).player;
const organicForecast = { ...forecast, id: 'organic', signature: 'organic', effectiveBudget: 0 };
const organic = reserveOwnedStreamingLaunchMarketing(organicPlayer, organicForecast, absoluteWeek + 3, ['US']);
assert.equal(organic.player.ownedStreamingPlatform.costCommitments.some(item => item.category === 'MARKETING'), false);

const unaffordablePlayer = saveOwnedStreamingLaunchMarketingDraft(player, { budgetCeiling: 30_000_000 }).player;
assert.equal(reserveOwnedStreamingLaunchMarketing(unaffordablePlayer, { ...forecast, effectiveBudget: 30_000_000 }, absoluteWeek + 3, ['US']).reason, 'INSUFFICIENT_TREASURY');

console.log('Streaming launch marketing lifecycle audit passed.');
