import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  INITIAL_PLAYER,
  createInitialOwnedStreamingPlatformState,
  type OwnedStreamingPricingConfiguration,
  type Player,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
  checkpointStreamingLaunchBlueprint,
  saveStreamingDefineLaunchDraft,
} from '../services/streamingLaunchProgram';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import { gates, type BuildData, type BuildDraft } from '../components/studio-finance/finance/build';

const base = structuredClone(INITIAL_PLAYER) as Player;
base.id = 'autosave-gate-audit';
base.ownedStreamingPlatform = createInitialOwnedStreamingPlatformState(base.id);
const treasuryBefore = base.ownedStreamingPlatform.treasuryCash;

const pricing: OwnedStreamingPricingConfiguration = {
  streams: ['subs'],
  plans: [{ id: 'BASIC', name: 'Essential', monthly: 9, featureIds: ['hd'], ads: false }],
  annualDiscount: 12,
  introOffer: 0,
  ads: { minutesPerHour: 4, cpm: 22 },
  rentals: { rent: 6, buy: 20, windowWeeks: 6 },
  premium: { price: 30 },
  daypass: { price: 8 },
  sponsor: { perTitle: 4_000_000, titles: 0 },
  metered: { perHour: 1 },
  patron: { monthly: 10 },
};

const saved = saveStreamingDefineLaunchDraft(base, {
  selectedCountryIds: ['US', 'US', 'INVALID'],
  soundId: 'pulse',
  packageId: 'sting',
  customAudio: null,
  storefrontId: 'cinema',
  pricing,
  updatedAtAbsoluteWeek: 4,
});
assert.equal(saved.changed, true);
assert.equal(saved.player.ownedStreamingPlatform.treasuryCash, treasuryBefore, 'Autosave must never spend company money.');
assert.deepEqual(saved.player.ownedStreamingPlatform.launchProgram.defineDraft?.selectedCountryIds, ['US']);
assert.equal(saved.player.ownedStreamingPlatform.launchProgram.defineDraft?.pricing.plans[0]?.monthly, 9);

const repeated = saveStreamingDefineLaunchDraft(saved.player, saved.player.ownedStreamingPlatform.launchProgram.defineDraft!);
assert.equal(repeated.changed, false, 'Autosaving an identical normalized draft must be idempotent.');

const legacy = normalizeOwnedStreamingPlatformState({
  ...saved.player.ownedStreamingPlatform,
  launchProgram: {
    ...saved.player.ownedStreamingPlatform.launchProgram,
    defineDraft: undefined,
  },
}, base.id);
assert.equal(legacy.launchProgram.defineDraft, null, 'Legacy saves without a launch draft must normalize safely.');

const incompleteCheckpoint = checkpointStreamingLaunchBlueprint(saved.player);
assert.equal(incompleteCheckpoint.changed, false);
assert.equal(incompleteCheckpoint.reason, 'INCOMPLETE');

const data = {
  company: { name: 'Empire+', week: 9, brandHex: '#5b36ff' },
  treasury: { available: 1_000_000_000, committedLaunch: 0 },
  hasExplicitOpeningMarkets: true,
  markets: [{ id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 100_000, catalogue: 1 }],
  regions: [], countries: [], cities: [], listings: [], presets: [], campaigns: [], spend: [], repairs: [],
  pricing: { model: 'Subscriptions', plans: 1, arpu: 9, reach: 100_000, problems: [] },
  team: { priority: 'BALANCED', risk: 'CAREFUL', maxBudget: 500_000_000, askAbove: 0 },
  existing: [], commissioned: false,
  canonical: {
    facilities: (draft: BuildDraft) => draft.facilities,
    totals: () => ({ racks: 2, cities: 1, capacity: 200_000, burst: 50_000, buildCost: 10_000_000, weeklyCost: 50_000, weeks: 4, energy: 1, water: 1, sustainability: 80, reputation: 80, redundancy: 'SINGLE' as const }),
    money: () => ({ lines: [{ id: 'infra', label: 'Infrastructure', amount: 10_000_000 }], total: 10_000_000, commissionNow: 10_000_000, deferred: 0, available: 1_000_000_000, headroom: 990_000_000, shortfall: 0 }),
    services: () => [{ marketId: 'US', name: 'United States', code: 'US', servedBy: ['Los Angeles'], role: 'Origin', state: 'READY' as const, startupMs: 30, buffering: .01, peak: 100_000, catalogue: 1, localization: 'Ready' }],
    signature: () => 'current-signature',
  },
} as unknown as BuildData;
const draft = {
  facilities: [{ id: 'LA-1', listingId: 'LA', cityId: 'LA', built: false, groups: [{ id: 'origin', name: 'Origin', duty: 'ORIGIN', racks: 2, capacity: 200_000 }], power: { used: 1, contracted: 2 }, cooling: { used: 1, available: 2 }, bandwidth: { used: 1, available: 2 }, condition: 1, uptime: 1, backup: 'UPS', backupCoverage: 1, energyPerWeek: 1, waterPerWeek: 1, opCost: 1, sustainability: 80, reputation: 80 }],
  architecture: 'HYBRID', ownedShare: .6, doctrine: 'STANDARD', campaignId: '', mode: 'ASSISTED',
  instructions: data.team, repairIds: [], rehearsal: null, override: false, teamPlanApproved: true, teamPlanClass: 'ESSENTIAL',
} as BuildDraft;

const assistedTestMarkup = renderToStaticMarkup(
  <BuildWizard data={data} initialStage="test" initialDraft={draft} onOpenRehearsal={() => undefined} />,
);
assert.match(assistedTestMarkup, />Test the load</);
assert.doesNotMatch(assistedTestMarkup, /bw-managed-content[^>]*disabled/, 'Engineering ownership must not disable Test.');

const launchDraft = {
  ...draft,
  rehearsal: {
    signature: 'current-signature', scenario: 'LIKELY', verdict: 'HELD',
    peak: 100_000, capacity: 200_000, spare: 100_000, failedPct: 0,
    catalogue: 1, spof: 0, held: ['United States'], failed: [], countries: [], rooms: [],
  },
} as BuildDraft;
const launchMarkup = renderToStaticMarkup(
  <BuildWizard
    data={{
      ...data,
      defineLaunchChecks: [{
        id: 'markets', label: 'Clear the markets', complete: false,
        detail: 'Resolve opening-country approval.', step: 'MARKETS',
      }],
    } as BuildData}
    initialStage="launch"
    initialDraft={launchDraft}
  />,
);
const gateCopy = Object.fromEntries(gates(data, launchDraft).map(gate => [gate.id, gate.value]));
assert.deepEqual(
  {
    team: gateCopy['team-plan'],
    network: gateCopy.network,
    origin: gateCopy.origin,
    money: gateCopy.money,
    rooms: gateCopy.physical,
  },
  {
    team: 'ESSENTIAL · approved',
    network: '2 racks · 1 city',
    origin: 'Master catalogue ready',
    money: '$990M headroom',
    rooms: 'All rooms within limits',
  },
  'Launch gate copy must stay compact enough to remain readable on a two-column phone layout.',
);
assert.match(launchMarkup, /7 of 8 ready/, 'Launch must summarize Build and Define readiness together.');
assert.match(launchMarkup, /Final proof/, 'Rehearsal must read as the final full-width proof gate.');
assert.match(launchMarkup, /Fix before commissioning/, 'An unresolved Define item must be promoted beside the readiness summary.');
assert.match(launchMarkup, /Due now/, 'The contract must foreground the amount charged at commissioning.');

const buildWizardSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/build/BuildWizard.tsx'), 'utf8');
const platformSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const launchSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/build/StageLaunch.tsx'), 'utf8');
const buildoutSource = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/StreamingBuildoutExperience.tsx'), 'utf8');
const buildoutCss = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css'), 'utf8');
assert.doesNotMatch(platformSource, /const rehearsed = runStreamingInfrastructureLoadTest\(withDraft, draft\)/, 'Commissioning must not manufacture load-test evidence.');
assert.doesNotMatch(launchSource, /Build it anyway/, 'A missing rehearsal must not have an override.');
assert.match(buildWizardSource, /stageId === 'test' \? <StageTest/, 'Test must render directly in Assisted mode.');
assert.match(buildoutSource, /cx\(css\.bld, css\.rehearsalLayer\)/, 'The standalone rehearsal must opt into its foreground layer.');
const rehearsalLayer = buildoutCss.match(/\.bld\.rehearsalLayer\{z-index:(\d+)\}/);
assert(rehearsalLayer, 'The standalone rehearsal layer must be defined.');
assert(Number(rehearsalLayer[1]) > 9000, 'The rehearsal must stack above the Studio Finance Build route.');

const blueprintSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/launch/StepBlueprint.tsx'), 'utf8');
const pricingSource = readFileSync(resolve(process.cwd(), 'components/studio-finance/components/launch/StepPricing.tsx'), 'utf8');
assert.match(blueprintSource, /Autosaved/);
assert.doesNotMatch(blueprintSource, /Save blueprint/);
assert.doesNotMatch(pricingSource, /Save pricing/);

console.log('Streaming Build Test, autosave, and launch-gate audit passed.');
