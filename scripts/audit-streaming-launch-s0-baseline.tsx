/**
 * S0 career-path regression baseline. These assertions describe the intended
 * player-facing contract and are deliberately RED while S1/S2 are outstanding.
 * No saved game or live browser storage is read or modified.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { beginStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';
import { createDefaultStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { createCanonicalBuildData } from '../services/streamingCanonicalBuildData';
import { reconstructStreamingRegionPlans } from '../services/streamingRegionalNetworkPlan';
import { createStreamingLaunchRehearsal } from '../services/streamingLaunchRehearsal';
import { StreamingBuildWizardExperience } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import type { BuildInputs, BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const placements = [
  { cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' as const },
  { cityId: 'RIO', racks: 1, role: 'REGIONAL_HUB' as const },
];
const facilities = migratePlacementsToStreamingFacilities(placements);
const selection: BuildSel = {
  placements,
  facilities,
  arch: 'HYBRID',
  doctrine: 'STANDARD',
  campaign: 'NONE',
};
const markets: NonNullable<BuildInputs['markets']> = [
  { id: 'US', country: 'United States', region: 'NORTH_AMERICA', audience: 100_000_000, annualGrowthPercent: 3, recommendedCityId: 'LA', localizationNote: 'English ready.' },
  { id: 'BR', country: 'Brazil', region: 'SOUTH_AMERICA', audience: 60_000_000, annualGrowthPercent: 8, recommendedCityId: 'RIO', localizationNote: 'Portuguese ready.' },
  { id: 'BE', country: 'Belgium', region: 'EUROPE', audience: 8_000_000, annualGrowthPercent: 2, recommendedCityId: 'BRU', localizationNote: 'French and Dutch ready.' },
];
const inputs: BuildInputs = {
  absoluteWeek: 22,
  treasury: 500_000_000_000,
  catalogueSpend: 0,
  catalogueTitles: 1,
  originalsSpend: 0,
  originalsCount: 1,
  premiereTitle: 'First Original',
  regions: ['NORTH_AMERICA', 'SOUTH_AMERICA', 'EUROPE'],
  markets,
  hasExplicitOpeningMarkets: true,
  homeCityId: 'LA',
  audienceMul: 1,
  openingDemandForecast: {
    low: 900_000,
    likely: 1_000_000,
    high: 1_200_000,
    byMarket: { US: 600_000, BR: 300_000, BE: 100_000 },
  },
};
const brand: Brand = {
  name: 'Baseline+', markId: 'FRAME_PLAY', customMark: null,
  hue: 0, sat: 80, identId: 'pulse', customIdent: null,
  promiseId: 'BALANCED', publicManifesto: '', layoutId: 'wall',
  typeId: 'default', accentHue: 25, identMode: 'none', identLen: 2,
  ratingId: 'GENERAL', lockupId: 'default', serverCity: null,
};

const incorporatedFixture = (): Player => {
  const eligible: Player = {
    ...clone(INITIAL_PLAYER),
    id: 's0-fresh-streaming-founder',
    money: 900_000_000,
    ownedStreamingPlatform: {
      ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
      lifecycle: 'ELIGIBLE',
      simulationSeed: 'owned-streaming:s0-fresh-streaming-founder',
      milestoneKeys: ['streaming-launch-clearance'],
    },
  };
  const drafted = saveStreamingFoundingDraft(eligible, {
    ...createDefaultStreamingFoundingDraft(22),
    currentStep: 2,
    name: 'Baseline+',
  });
  const incorporated = incorporateOwnedStreamingPlatform(drafted);
  assert.equal(incorporated.changed, true, 'Fixture must complete real incorporation.');
  return incorporated.player;
};

test('canonical country coverage remains finite before the career Build adapter', () => {
  const canonical = createCanonicalBuildData({
    source: 'CAREER',
    regionPlans: reconstructStreamingRegionPlans(facilities),
    facilities,
    openingCountryIds: markets.map(market => market.id),
    forecastConcurrentStreams: 1_000_000,
    absoluteWeek: 22,
    demandState: inputs.openingDemandForecast,
  });
  assert.equal(canonical.coverage.countries.length, 3);
  for (const country of canonical.coverage.countries) {
    assert.ok(Number.isFinite(country.reachedShare), `${country.countryId} canonical reach must be finite`);
    assert.ok(Number.isFinite(country.reachedPopulation), `${country.countryId} canonical reached population must be finite`);
  }
  console.log('S0 canonical boundary:', JSON.stringify(canonical.coverage.countries.map(country => ({
    id: country.countryId, reachedShare: country.reachedShare, reachedPopulation: country.reachedPopulation, grade: country.grade,
  }))));
});

test('the real career Build adapter never renders non-finite coverage', () => {
  type ProjectionSnapshot = Parameters<NonNullable<React.ComponentProps<typeof StreamingBuildWizardExperience>['onProjectionDiagnostic']>>[0];
  const projections: ProjectionSnapshot[] = [];
  const markup = renderToStaticMarkup(<StreamingBuildWizardExperience
    brand={brand}
    inputs={inputs}
    sel={selection}
    onProjectionDiagnostic={snapshot => projections.push(snapshot)}
    onChange={() => undefined}
    onBack={() => undefined}
  />);
  assert.ok(projections.length > 0, 'The career adapter must report its country-service projection.');
  const projected = projections[0];
  console.log('S0 adapter boundary:', JSON.stringify({
    canonical: projected.coverage.map(country => ({ id: country.countryId, reachedShare: country.reachedShare, grade: country.grade })),
    services: projected.services.map(service => ({
      id: service.marketId, peak: service.peak, reachedShare: service.reachedShare,
      coveredShare: service.coveredShare, coveredPeak: service.coveredPeak,
      hasReachedShare: Object.hasOwn(service, 'reachedShare'),
      hasCoveredShare: Object.hasOwn(service, 'coveredShare'),
      hasCoveredPeak: Object.hasOwn(service, 'coveredPeak'),
      coveredPeakFinite: Number.isFinite(service.coveredPeak), state: service.state,
    })),
  }));
  console.log('S0 presentation boundary:', JSON.stringify({
    hasNaN: markup.includes('NaN'),
    mentionsStrong: /Strong/.test(markup),
    regionCount: (markup.match(/countries ·/g) || []).length,
    labels: [...markup.matchAll(/(?:NaN|\d+)% served/g)].slice(0, 8).map(match => match[0]),
  }));
  assert.equal(/NaN|Infinity/.test(markup), false, 'The career Build must not show a non-finite coverage figure.');
});

test('a fresh incorporated platform has no network chosen before the player builds it', () => {
  const planned = saveStreamingMarketPlan(incorporatedFixture(), ['US', 'BR']);
  assert.equal(planned.changed, true);
  const draft = createDefaultStreamingInfrastructureDraft(planned.player);
  console.log('S0 new-career draft boundary:', JSON.stringify({
    markets: planned.player.ownedStreamingPlatform.marketOperations.map(operation => ({ country: operation.countryId, status: operation.status })),
    facilities: draft.facilities?.length ?? 0,
    placements: draft.networkPlacements.length,
    placementCities: draft.networkPlacements.map(item => item.cityId),
  }));
  assert.equal(draft.networkPlacements.length, 0, 'A first Build must not silently create server placements.');
});

test('selection and filing retain distinct canonical statuses and account for energy', () => {
  const planned = saveStreamingMarketPlan(incorporatedFixture(), ['US', 'BR']);
  assert.equal(planned.changed, true);
  const selected = planned.player.ownedStreamingPlatform.marketOperations;
  const funded = contributeStreamingFounderCapital(planned.player, 500_000_000, 's0-filing');
  assert.equal(funded.changed, true);
  const filed = beginStreamingMarketClearance(funded.player, ['US', 'BR']);
  console.log('S0 market-status boundary:', JSON.stringify({
    selected: selected.map(operation => ({ country: operation.countryId, status: operation.status })),
    filed: filed.player.ownedStreamingPlatform.marketOperations.map(operation => ({ country: operation.countryId, status: operation.status })),
    filingReason: filed.reason,
    energyBefore: funded.player.energy.current,
    energyAfter: filed.player.energy.current,
    energyCost: filed.energyCost,
    filingCash: filed.amount,
  }));
  assert.equal(filed.reason, 'STARTED');
  assert.deepEqual(selected.map(operation => operation.status), ['PLANNED', 'PLANNED']);
  assert.equal(filed.player.energy.current, funded.player.energy.current - (filed.energyCost || 0));
});

test('spare global capacity does not repair a market with no regional route', () => {
  const result = createStreamingLaunchRehearsal({
    scenario: 'LIKELY', rolloutRiskPercent: 0,
    facilities: [{
      facilityId: 'LA-01', cityId: 'LA', cityLabel: 'Los Angeles', regionId: 'NORTH_AMERICA',
      steadyCapacity: 1_000_000, burstCapacity: 1_100_000, reliabilityPercent: 99.9,
      limitingFactor: 'NONE', physicalRepairActions: [],
    }],
    countries: [
      {
        marketId: 'US', country: 'United States', regionId: 'NORTH_AMERICA', regionLabel: 'North America',
        demand: 100_000, latencyMs: 20, cacheHitPercent: 95, baseBufferingRiskPercent: 2,
        routeFacilityIds: ['LA-01'], servingCityLabels: ['Los Angeles'], recommendedCityId: 'LA',
        localizationNote: 'Ready', catalogueAvailableTitles: 1, catalogueTotalTitles: 1,
      },
      {
        marketId: 'BE', country: 'Belgium', regionId: 'EUROPE', regionLabel: 'Europe',
        demand: 50_000, latencyMs: null, cacheHitPercent: 0, baseBufferingRiskPercent: 0,
        routeFacilityIds: [], servingCityLabels: [], recommendedCityId: 'BRU',
        localizationNote: 'Ready', catalogueAvailableTitles: 1, catalogueTotalTitles: 1,
      },
    ],
  });
  console.log('S0 rehearsal boundary:', JSON.stringify({
    peak: result.peakConcurrentStreams, steadyCapacity: result.steadyCapacity,
    verdict: result.verdict,
    countries: result.countries.map(country => ({ id: country.marketId, verdict: country.verdict, route: country.outageResistance })),
  }));
  assert.ok(result.peakConcurrentStreams < result.steadyCapacity);
  assert.equal(result.countries.find(country => country.marketId === 'US')?.verdict, 'HELD');
  assert.equal(result.countries.find(country => country.marketId === 'BE')?.verdict, 'BROKE');
});

test('records the 31-to-32 Titan projection and initial-render timings without a pass threshold', () => {
  const titanSelection = (racks: number): BuildSel => {
    const nextPlacements = [{ cityId: 'LA', racks, role: 'CORE_ORIGIN' as const }];
    const nextFacilities = migratePlacementsToStreamingFacilities(nextPlacements).map(facility => ({
      ...facility,
      rackGroups: (facility.rackGroups || []).map(group => ({ ...group, serverTier: 'TITAN' as const })),
    }));
    return { ...selection, placements: nextPlacements, facilities: nextFacilities };
  };
  const measure = (fn: () => void, repeat = 8): number[] => {
    fn();
    return Array.from({ length: repeat }, () => {
      const start = performance.now();
      fn();
      return Math.round((performance.now() - start) * 100) / 100;
    });
  };
  const project = (sel: BuildSel) => createCanonicalBuildData({
    source: 'CAREER', facilities: sel.facilities,
    openingCountryIds: markets.map(market => market.id),
    forecastConcurrentStreams: 1_000_000, absoluteWeek: 22,
    demandState: inputs.openingDemandForecast,
  });
  const render = (sel: BuildSel) => renderToStaticMarkup(<StreamingBuildWizardExperience
    brand={brand} inputs={inputs} sel={sel} onChange={() => undefined} onBack={() => undefined}
  />);
  const p31 = titanSelection(31);
  const p32 = titanSelection(32);
  const project31 = measure(() => { project(p31); });
  const project32 = measure(() => { project(p32); });
  const render31 = measure(() => { render(p31); }, 4);
  const render32 = measure(() => { render(p32); }, 4);
  console.log('S0 Titan timing (ms, Node SSR, not click latency):', JSON.stringify({
    project31, project32, render31, render32,
  }));
  assert.equal(project31.length, 8);
  assert.equal(render32.length, 4);
});
