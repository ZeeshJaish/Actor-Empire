import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { beginStreamingMarketClearance, resumeStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';
import { createDefaultStreamingInfrastructureDraft, saveStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { createCanonicalBuildData } from '../services/streamingCanonicalBuildData';
import { getStreamingBuildMarketAccess } from '../services/streamingBuildMarketAccess';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import { getStreamingPostIncorporationDestination } from '../components/StreamingFoundingJourney';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const founder = (): Player => {
  const player: Player = {
    ...clone(INITIAL_PLAYER), id: 's2-founder', money: 900_000_000,
    ownedStreamingPlatform: {
      ...clone(INITIAL_PLAYER.ownedStreamingPlatform), lifecycle: 'ELIGIBLE',
      simulationSeed: 'owned-streaming:s2-founder', milestoneKeys: ['streaming-launch-clearance'],
    },
  };
  const drafted = saveStreamingFoundingDraft(player, {
    ...createDefaultStreamingFoundingDraft(22), currentStep: 2, name: 'S2+',
  });
  const result = incorporateOwnedStreamingPlatform(drafted);
  assert.equal(result.changed, true);
  return result.player;
};

test('incorporation opens the dashboard, while founder capital remains optional', () => {
  assert.equal(getStreamingPostIncorporationDestination(), 'HOME');
  const player = founder();
  assert.deepEqual(player.ownedStreamingPlatform.finance.capitalActions.map(action => action.type), ['INCORPORATION']);
});

test('fresh and planned-only Build contain no chosen server or fabricated filed market', () => {
  const fresh = founder();
  assert.equal(createDefaultStreamingInfrastructureDraft(fresh).networkPlacements.length, 0);
  assert.deepEqual(getStreamingBuildMarketAccess(fresh).countryIds, []);
  assert.equal(getStreamingBuildMarketAccess(fresh).editable, false);
  const planned = saveStreamingMarketPlan(fresh, ['US', 'BR']).player;
  assert.equal(createDefaultStreamingInfrastructureDraft(planned).networkPlacements.length, 0);
  assert.deepEqual(getStreamingBuildMarketAccess(planned).countryIds, []);
  assert.equal(getStreamingBuildMarketAccess(planned).editable, false);
  assert.equal(planned.money, fresh.money);
  assert.equal(planned.energy.current, fresh.energy.current);
});

test('canonical career projection accepts an explicit empty Build without inventing placement', () => {
  const projection = createCanonicalBuildData({
    source: 'CAREER', regionPlans: [], facilities: [], openingCountryIds: [],
    forecastConcurrentStreams: 0, absoluteWeek: 22,
  });
  assert.deepEqual(projection.facilities, []);
  assert.deepEqual(projection.placements, []);
  assert.deepEqual(projection.coverage.countries, []);
  assert.equal(projection.quote.totals.dueNow, 0);
  assert.throws(() => createCanonicalBuildData({
    source: 'CAREER', openingCountryIds: [], forecastConcurrentStreams: 0, absoluteWeek: 22,
  }), /requires a canonical region plan or facilities/);
});

test('only a filed opening country unlocks planning; exited and unfiled remain outside it', () => {
  const planned = saveStreamingMarketPlan(founder(), ['US', 'BR']).player;
  const funded = contributeStreamingFounderCapital(planned, 500_000_000, 's2-filing').player;
  const filed = beginStreamingMarketClearance(funded, ['US']);
  assert.equal(filed.reason, 'STARTED');
  assert.deepEqual(getStreamingBuildMarketAccess(filed.player).countryIds, ['US']);
  assert.equal(getStreamingBuildMarketAccess(filed.player).editable, true);
  const actionRequired = clone(filed.player);
  const us = actionRequired.ownedStreamingPlatform.marketOperations.find(op => op.countryId === 'US')!;
  us.clearance!.outcome = 'TEMPORARILY_REJECTED';
  us.clearance!.resumeAllowedAtAbsoluteWeek = 0;
  assert.equal(getStreamingBuildMarketAccess(actionRequired).editable, true, 'A filed market remains plan-able while its clearance needs action.');
  const reapplied = resumeStreamingMarketClearance(actionRequired, us.id);
  assert.equal(reapplied.reason, 'REAPPLIED');
  assert.equal(getStreamingBuildMarketAccess(clone(reapplied.player)).editable, true);
  us.status = 'EXITED';
  assert.equal(getStreamingBuildMarketAccess(actionRequired).editable, false);
  assert.deepEqual(getStreamingBuildMarketAccess(actionRequired).countryIds, []);
});

test('approved and reloaded filing remains editable, while a saved network drawing survives', () => {
  const planned = saveStreamingMarketPlan(founder(), ['US']).player;
  const funded = contributeStreamingFounderCapital(planned, 500_000_000, 's2-draft').player;
  const filed = beginStreamingMarketClearance(funded, ['US']).player;
  const approved = clone(filed);
  const operation = approved.ownedStreamingPlatform.marketOperations.find(item => item.countryId === 'US')!;
  operation.status = 'READY';
  operation.clearance!.outcome = 'APPROVED';
  const drawing = {
    ...createDefaultStreamingInfrastructureDraft(approved),
    networkPlacements: [{ cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' as const }],
  };
  const saved = saveStreamingInfrastructureDraft(approved, drawing);
  const reloaded = clone(saved);
  assert.deepEqual(getStreamingBuildMarketAccess(reloaded).countryIds, ['US']);
  assert.equal(getStreamingBuildMarketAccess(reloaded).editable, true);
  assert.deepEqual(reloaded.ownedStreamingPlatform.infrastructureSetupDraft?.networkPlacements, drawing.networkPlacements);
  assert.deepEqual(createDefaultStreamingInfrastructureDraft(reloaded).networkPlacements, [], 'The fallback may be blank; the saved draft must be used directly.');
});

test('old day-one-only selection stays read-only, but a legacy saved Build drawing remains editable', () => {
  const legacy = founder();
  legacy.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US'];
  const before = { cash: legacy.ownedStreamingPlatform.treasuryCash, energy: legacy.energy.current };
  assert.equal(getStreamingBuildMarketAccess(legacy).editable, false);
  const draft = createDefaultStreamingInfrastructureDraft(legacy);
  const saved = saveStreamingInfrastructureDraft(legacy, { ...draft, networkPlacements: [{ cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' }] });
  assert.deepEqual(getStreamingBuildMarketAccess(clone(saved)).countryIds, ['US']);
  assert.equal(getStreamingBuildMarketAccess(clone(saved)).source, 'LEGACY_OPENING_IDS');
  assert.equal(legacy.ownedStreamingPlatform.treasuryCash, before.cash);
  assert.equal(legacy.energy.current, before.energy);
  assert.equal(saved.ownedStreamingPlatform.treasuryCash, before.cash);
  assert.equal(saved.energy.current, before.energy);
});

test('unfiled Build stays inspectable but marks editable controls and commission read-only', () => {
  const data = {
    company: { name: 'S2+', week: 22 }, treasury: { available: 100_000_000, committedLaunch: 0 },
    markets: [], regions: [], countries: [], cities: [], listings: [], presets: [], campaigns: [],
    spend: [], pricing: { model: 'Subscription', plans: 0, arpu: 0, reach: 0, problems: [] },
    repairs: [], team: { priority: 'BALANCED' as const, maxBudget: 45_000_000, risk: 'NORMAL' as const, preferredCityIds: [], askAbove: 5_000_000 },
    existing: [], commissioned: false, canonicalMode: 'FIXTURE' as const,
    marketPlanning: { editable: false, reason: 'File an opening market in Market Clearance first.' },
  };
  const markup = renderToStaticMarkup(<BuildWizard data={data} onOpenDefine={() => undefined} />);
  assert.match(markup, /File an opening market in Market Clearance first/);
  assert.match(markup, /Build stages/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /Market Clearance/);
  const moneyMarkup = renderToStaticMarkup(<BuildWizard data={data} initialStage="money" onOpenDefine={() => undefined} />);
  assert.match(moneyMarkup, /No market quote yet/);
  assert.doesNotMatch(moneyMarkup, /Complete launch bill/);
  const launchMarkup = renderToStaticMarkup(<BuildWizard data={data} initialStage="launch" onOpenDefine={() => undefined} />);
  assert.match(launchMarkup, /No commissioning agreement yet/);
  assert.doesNotMatch(launchMarkup, /Due on execution/);
  assert.doesNotMatch(launchMarkup, /stage, complete; Not started/);
  assert.doesNotMatch(launchMarkup, /1 cleared/);
  assert.match(launchMarkup, /Launch stage, current; Not started/);
});
