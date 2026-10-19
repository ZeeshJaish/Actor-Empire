import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { beginStreamingMarketClearance, saveStreamingMarketPlan, resolveStreamingMarketRequirement } from '../services/streamingMarkets';
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

import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';

const allIds = WORLD_COUNTRY_DEFINITIONS.map(country => country.id);

test('country quotes total 533E, deduplicate targets, and do not depend on batch boundaries', () => {
  assert.equal(quoteStreamingMarketFilingEnergy(allIds), 533);
  assert.equal(quoteStreamingMarketFilingEnergy(['US', 'IN', 'CN', 'RU', 'PK', 'BD']), 60);
  assert.equal(quoteStreamingMarketFilingEnergy(['CA', 'GB', 'FR']), 15);
  assert.equal(quoteStreamingMarketFilingEnergy(['JM', 'NP']), 4);
  assert.equal(quoteStreamingMarketFilingEnergy(['US', 'US', ' us ', '??']), 10);
  assert.equal(quoteStreamingMarketFilingEnergy([]), 0);
  assert.equal(allIds.reduce((sum, id) => sum + quoteStreamingMarketFilingEnergy([id]), 0), 533);
  assert.equal(STREAMING_MARKET_SUB_REGIONS.reduce((sum, group) => sum + quoteStreamingMarketFilingEnergy(group.countryIds), 0), 533);
});

test('individual, group and mixed filing settle identical energy and money', () => {
  const ids = ['US', 'CA', 'JM']; // 10 + 5 + 2 = 17
  const planned = saveStreamingMarketPlan(founder(), ids).player;
  const batch = beginStreamingMarketClearance(clone(planned), ids);
  assert.equal(batch.energyCost, 17);
  let individual = clone(planned);
  for (const id of ids) {
    const result = beginStreamingMarketClearance(individual, [id]);
    assert.equal(result.reason, 'STARTED'); individual = result.player;
  }
  assert.equal(individual.energy.current, planned.energy.current - 17);
  assert.equal(individual.energy.current, batch.player.energy.current);
  assert.equal(individual.ownedStreamingPlatform.treasuryCash, batch.player.ownedStreamingPlatform.treasuryCash);
  const again = beginStreamingMarketClearance(individual, ids);
  assert.equal(again.reason, 'ALREADY_STARTED');
  assert.equal(again.player.energy.current, individual.energy.current);
  assert.equal(again.player.ownedStreamingPlatform.treasuryCash, individual.ownedStreamingPlatform.treasuryCash);
});

test('insufficient batch energy leaves countries unfiled while affordable individual filings remain possible', () => {
  const planned = saveStreamingMarketPlan(founder(), allIds).player;
  planned.energy.current = 70;
  const before = JSON.stringify(planned);
  const blocked = beginStreamingMarketClearance(planned, allIds);
  assert.equal(blocked.reason, 'INSUFFICIENT_ENERGY');
  assert.equal(blocked.energyCost, 533); assert.equal(blocked.shortfall, 463);
  assert.equal(JSON.stringify(planned), before);
  const first = beginStreamingMarketClearance(planned, ['CN']);
  assert.equal(first.reason, 'STARTED'); assert.equal(first.player.energy.current, 60);
  const rest = beginStreamingMarketClearance(first.player, allIds);
  assert.equal(rest.energyCost, 523); assert.equal(rest.reason, 'INSUFFICIENT_ENERGY');
});

test('remaining countries can be added later without charging already filed countries again', () => {
  let p = saveStreamingMarketPlan(founder(), ['US']).player;
  p = beginStreamingMarketClearance(p, ['US']).player;
  const prior = p.ownedStreamingPlatform.marketOperations.find(x => x.countryId === 'US')!;
  p = saveStreamingMarketPlan(p, ['US', 'NP', 'BD']).player;
  const result = beginStreamingMarketClearance(p, ['US', 'NP', 'BD']);
  assert.equal(result.reason, 'STARTED'); assert.equal(result.energyCost, 12);
  assert.deepEqual(result.player.ownedStreamingPlatform.marketOperations.find(x => x.countryId === 'US'), prior);
});

test('missing cash does not spend energy or start review', () => {
  const p = saveStreamingMarketPlan(founder(), ['CN']).player;
  p.ownedStreamingPlatform.treasuryCash = 0;
  const result = beginStreamingMarketClearance(p, ['CN']);
  assert.equal(result.reason, 'INSUFFICIENT_TREASURY');
  assert.equal(result.player.energy.current, p.energy.current);
  assert.equal(result.player.ownedStreamingPlatform.marketOperations.filter(x => x.status === 'CLEARANCE').length, 0);
});

test('additional compliance costs 5E plus the requested money exactly once, including after reload', () => {
  let p = saveStreamingMarketPlan(founder(), ['BD']).player;
  p = beginStreamingMarketClearance(p, ['BD']).player;
  const op = p.ownedStreamingPlatform.marketOperations.find(x => x.countryId === 'BD')!;
  op.status = 'AWAITING_FUNDING'; op.clearance!.outcome = 'ADDITIONAL_REQUIREMENT';
  op.clearance!.additionalPayment = 250_000;
  const cash = p.ownedStreamingPlatform.treasuryCash;
  const energy = p.energy.current;
  const shortEnergy = clone(p); shortEnergy.energy.current = 4;
  const blocked = resolveStreamingMarketRequirement(shortEnergy, op.id);
  assert.equal(blocked.reason, 'INSUFFICIENT_ENERGY');
  assert.equal(blocked.player.ownedStreamingPlatform.treasuryCash, cash);
  const noCash = clone(p); noCash.ownedStreamingPlatform.treasuryCash = 249_999;
  assert.equal(resolveStreamingMarketRequirement(noCash, op.id).reason, 'INSUFFICIENT_TREASURY');
  const result = resolveStreamingMarketRequirement(p, op.id);
  assert.equal(result.reason, 'RESOLVED'); assert.equal(result.energyCost, 5);
  assert.equal(result.player.energy.current, energy - 5);
  assert.equal(result.player.ownedStreamingPlatform.treasuryCash, cash - 250_000);
  const repeat = resolveStreamingMarketRequirement(clone(result.player), op.id);
  assert.equal(repeat.changed, false);
  assert.equal(repeat.player.energy.current, energy - 5);
  assert.equal(repeat.player.ownedStreamingPlatform.treasuryCash, cash - 250_000);
});


test('an inconsistent follow-up state cannot deduct payment without resuming a real request', () => {
  let p = saveStreamingMarketPlan(founder(), ['BD']).player;
  p = beginStreamingMarketClearance(p, ['BD']).player;
  const op = p.ownedStreamingPlatform.marketOperations.find(x => x.countryId === 'BD')!;
  op.clearance!.outcome = 'ADDITIONAL_REQUIREMENT';
  op.clearance!.additionalPayment = 250_000;
  const result = resolveStreamingMarketRequirement(p, op.id);
  assert.equal(result.changed, false);
  assert.equal(result.player.energy.current, p.energy.current);
  assert.equal(result.player.ownedStreamingPlatform.treasuryCash, p.ownedStreamingPlatform.treasuryCash);
});


test('funded global filing and all geographic group filings settle the same 533E and country fees', () => {
  const planned = saveStreamingMarketPlan(founder(), allIds).player;
  planned.energy.current = 533;
  planned.flags.weeklyBaseEnergyRemaining = 100;
  planned.flags.bonusEnergyBank = 433;
  const fee = planned.ownedStreamingPlatform.marketOperations.reduce((sum, x) => sum + x.plannedCosts.total, 0);
  planned.ownedStreamingPlatform.treasuryCash = fee + 1_000_000;
  const batch = beginStreamingMarketClearance(clone(planned), allIds);
  assert.equal(batch.reason, 'STARTED'); assert.equal(batch.energyCost, 533);
  assert.equal(batch.player.energy.current, 0);
  assert.equal(batch.player.ownedStreamingPlatform.marketOperations.filter(x => x.status === 'CLEARANCE').length, 197);
  assert.equal(batch.player.ownedStreamingPlatform.treasuryCash, 1_000_000);
  let grouped = clone(planned);
  for (const group of STREAMING_MARKET_SUB_REGIONS) {
    const result = beginStreamingMarketClearance(grouped, group.countryIds);
    assert.equal(result.reason, 'STARTED', group.id); grouped = clone(result.player);
  }
  assert.equal(grouped.energy.current, 0);
  assert.equal(grouped.ownedStreamingPlatform.treasuryCash, 1_000_000);
  assert.equal(grouped.ownedStreamingPlatform.marketOperations.filter(x => x.status === 'CLEARANCE').length, 197);
});
