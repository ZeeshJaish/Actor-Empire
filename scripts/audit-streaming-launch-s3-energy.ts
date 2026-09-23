import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { beginStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';
import { STREAMING_MARKET_SUB_REGIONS } from '../services/streamingMarketSubRegions';
import { quoteStreamingMarketFilingEnergy } from '../services/streamingMarketFilingQuote';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const founder = (): Player => {
  const player: Player = {
    ...clone(INITIAL_PLAYER), id: 's3-energy-founder', money: 20_000_000_000,
    ownedStreamingPlatform: {
      ...clone(INITIAL_PLAYER.ownedStreamingPlatform), lifecycle: 'ELIGIBLE',
      simulationSeed: 'owned-streaming:s3-energy-founder', milestoneKeys: ['streaming-launch-clearance'],
    },
  };
  const drafted = saveStreamingFoundingDraft(player, {
    ...createDefaultStreamingFoundingDraft(22), currentStep: 2, name: 'S3+',
  });
  const incorporated = incorporateOwnedStreamingPlatform(drafted);
  assert.equal(incorporated.changed, true);
  const funded = contributeStreamingFounderCapital(incorporated.player, 10_000_000_000, 's3-energy');
  assert.equal(funded.changed, true);
  return funded.player;
};

test('filing the 13 Caribbean countries together charges the approved 25E rather than 65E', () => {
  const caribbean = STREAMING_MARKET_SUB_REGIONS.find(group => group.id === 'CARIBBEAN');
  assert.equal(caribbean?.countryIds.length, 13);
  const planned = saveStreamingMarketPlan(founder(), caribbean!.countryIds);
  assert.equal(planned.reason, 'SAVED');
  const beforeEnergy = planned.player.energy.current;
  const beforeTreasury = planned.player.ownedStreamingPlatform.treasuryCash;
  const filing = beginStreamingMarketClearance(planned.player, caribbean!.countryIds);
  assert.equal(filing.reason, 'STARTED');
  assert.equal(filing.energyCost, 25);
  assert.equal(filing.player.energy.current, beforeEnergy - 25);
  assert.equal(filing.player.ownedStreamingPlatform.treasuryCash, beforeTreasury - filing.amount);
  assert.equal(filing.player.ownedStreamingPlatform.marketOperations.filter(operation => operation.status === 'CLEARANCE').length, 13);
});

test('the approved action curve is finite, monotone and capped for large batches', () => {
  const samples: Array<[number, number]> = [[0, 0], [1, 5], [2, 7], [7, 17], [9, 21], [13, 25], [18, 30], [23, 30], [40, 30]];
  samples.forEach(([count, energy]) => assert.equal(quoteStreamingMarketFilingEnergy(count), energy, `${count} countries`));
  assert.equal(quoteStreamingMarketFilingEnergy(Number.NaN), 0);
  assert.equal(quoteStreamingMarketFilingEnergy(-2), 0);
  assert.equal(quoteStreamingMarketFilingEnergy(13.9), 25);
});

test('partial filing charges only current unfiled targets and repeating a request charges nothing', () => {
  const ids = STREAMING_MARKET_SUB_REGIONS.find(group => group.id === 'CARIBBEAN')!.countryIds;
  const planned = saveStreamingMarketPlan(founder(), ids).player;
  const first = beginStreamingMarketClearance(planned, ids.slice(0, 4));
  assert.equal(first.reason, 'STARTED');
  assert.equal(first.energyCost, 11);
  const second = beginStreamingMarketClearance(clone(first.player), ids);
  assert.equal(second.reason, 'STARTED');
  assert.equal(second.energyCost, 21, 'Only the nine remaining files receive a batch quote.');
  assert.equal(second.player.energy.current, planned.energy.current - 32);
  const again = beginStreamingMarketClearance(second.player, ids);
  assert.equal(again.reason, 'ALREADY_STARTED');
  assert.equal(again.changed, false);
  assert.equal(again.player.energy.current, second.player.energy.current);
  assert.equal(again.player.ownedStreamingPlatform.treasuryCash, second.player.ownedStreamingPlatform.treasuryCash);
  const expectedCash = planned.ownedStreamingPlatform.marketOperations
    .filter(operation => ids.includes(operation.countryId || ''))
    .reduce((sum, operation) => sum + operation.plannedCosts.total, 0);
  assert.equal(planned.ownedStreamingPlatform.treasuryCash - second.player.ownedStreamingPlatform.treasuryCash, expectedCash);
});

test('the 23-market North America action fits the 30E cap and energy shortfall is non-mutating', () => {
  const ids = STREAMING_MARKET_SUB_REGIONS.filter(group => group.regionId === 'NORTH_AMERICA').flatMap(group => group.countryIds);
  assert.equal(ids.length, 23);
  const planned = saveStreamingMarketPlan(founder(), ids).player;
  const shortPlayer = clone(planned);
  shortPlayer.energy.current = 29;
  const blocked = beginStreamingMarketClearance(shortPlayer, ids);
  assert.equal(blocked.reason, 'INSUFFICIENT_ENERGY');
  assert.equal(blocked.energyCost, 30);
  assert.equal(blocked.shortfall, 1);
  assert.equal(blocked.changed, false);
  assert.equal(blocked.player.energy.current, 29);
  assert.equal(blocked.player.ownedStreamingPlatform.treasuryCash, planned.ownedStreamingPlatform.treasuryCash);
  const justEnough = clone(planned);
  justEnough.energy.current = 30;
  const filed = beginStreamingMarketClearance(justEnough, ids);
  assert.equal(filed.reason, 'STARTED');
  assert.equal(filed.energyCost, 30);
  assert.equal(filed.player.energy.current, 0);
});

test('zero energy or missing treasury cannot partially file a country batch', () => {
  const ids = STREAMING_MARKET_SUB_REGIONS.find(group => group.id === 'CARIBBEAN')!.countryIds;
  const planned = saveStreamingMarketPlan(founder(), ids).player;
  const noEnergy = clone(planned);
  noEnergy.energy.current = 0;
  const attentionBlocked = beginStreamingMarketClearance(noEnergy, ids);
  assert.equal(attentionBlocked.reason, 'INSUFFICIENT_ENERGY');
  assert.equal(attentionBlocked.changed, false);
  assert.equal(attentionBlocked.shortfall, 25);
  assert.equal(attentionBlocked.player.ownedStreamingPlatform.marketOperations.filter(operation => operation.status === 'CLEARANCE').length, 0);

  const noTreasury = clone(planned);
  noTreasury.ownedStreamingPlatform.treasuryCash = 0;
  const cashBlocked = beginStreamingMarketClearance(noTreasury, ids);
  assert.equal(cashBlocked.reason, 'INSUFFICIENT_TREASURY');
  assert.equal(cashBlocked.player.energy.current, planned.energy.current);
  assert.equal(cashBlocked.player.ownedStreamingPlatform.marketOperations.filter(operation => operation.status === 'CLEARANCE').length, 0);
});

test('the same action discount applies across regions without a group-specific operation', () => {
  const ids = ['US', 'BR', 'DE'];
  const planned = saveStreamingMarketPlan(founder(), ids).player;
  const filed = beginStreamingMarketClearance(planned, ids);
  assert.equal(filed.reason, 'STARTED');
  assert.equal(filed.energyCost, 9);
  assert.equal(filed.player.energy.current, planned.energy.current - 9);
  assert.deepEqual(
    filed.player.ownedStreamingPlatform.marketOperations
      .filter(operation => ids.includes(operation.countryId || '') && operation.status === 'CLEARANCE')
      .map(operation => operation.countryId).sort(),
    [...ids].sort(),
  );
});
