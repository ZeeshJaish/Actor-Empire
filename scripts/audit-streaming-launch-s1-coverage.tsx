import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { deriveStreamingNetworkCoverage } from '../services/streamingNetworkCoverage';
import { streamingEligibleMarketFacilities } from '../services/streamingMarketRoute';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { StreamingBuildWizardExperience } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import { countryServiceCoverageValid, gates, type BuildData, type BuildDraft, type CountryService } from '../components/studio-finance/finance/build';
import { regionReport, regionsOf } from '../components/studio-finance/finance/placer';
import type { BuildInputs, BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const placement = (cityId: string, racks: number) => ({ cityId, racks, role: 'REGIONAL_HUB' as const });
const owned = (cityId: string, racks: number) => migratePlacementsToStreamingFacilities([placement(cityId, racks)])[0];
const cloud = () => ({
  ...owned('RIO', 4),
  id: 'S1-RIO-CLOUD',
  type: 'CLOUD_ALLOCATION' as const,
  lease: {
    listingId: 'S1-RIO-CLOUD-LISTING', providerName: 'Atlas Compute', rackPositions: 4,
    depositCost: 100_000, setupCost: 100_000, weeklyRent: 20_000,
    electricityRatePerKwh: .12, taxRatePercent: 8, reliabilityPercent: 99.95,
    securityGrade: 'REINFORCED' as const, fibreGrade: 'GLOBAL_BACKBONE' as const,
    contractWeeks: 52, provisioningWeeks: 1, expansionRackPositions: 8,
    tenure: 'CLOUD' as const, cloudProvider: 'ATLAS' as const,
  },
});

test('North America room cannot claim South America across the regional delivery boundary', () => {
  const coverage = deriveStreamingNetworkCoverage({
    facilities: [owned('PTY', 40)], openingCountryIds: ['PA', 'CO'],
  });
  assert.ok((coverage.countries.find(country => country.countryId === 'PA')?.reachedShare || 0) > 0);
  assert.equal(coverage.countries.find(country => country.countryId === 'CO')?.reachedShare, 0);
});

test('career forecast and rehearsal share regional reach and residency route eligibility', () => {
  const facilities = [owned('PTY', 4), owned('SIN', 4), owned('DEL', 4)];
  assert.deepEqual(streamingEligibleMarketFacilities(facilities, 'CO', 'SOUTH_AMERICA', 1), []);
  assert.deepEqual(streamingEligibleMarketFacilities(facilities, 'IN', 'ASIA', 0), []);
  assert.deepEqual(streamingEligibleMarketFacilities(facilities, 'IN', 'ASIA', .5).map(item => item.cityId), ['DEL']);
  assert.deepEqual(streamingEligibleMarketFacilities(facilities, 'SG', 'ASIA', .5).map(item => item.cityId), ['SIN', 'DEL']);
});

test('empty, low-compute, fibre-upgraded and fully covered projections stay finite and ordered', () => {
  const empty = deriveStreamingNetworkCoverage({ facilities: [], openingCountryIds: ['US'] }).countries[0];
  const low = deriveStreamingNetworkCoverage({ facilities: [owned('LA', 1)], openingCountryIds: ['US'] }).countries[0];
  const upgraded = deriveStreamingNetworkCoverage({ facilities: [owned('LA', 1)], openingCountryIds: ['US'], fibreState: { generation: 4, level: 100 } }).countries[0];
  const full = deriveStreamingNetworkCoverage({ facilities: ['LA', 'NYC', 'CHI', 'DAL', 'MIA', 'ATL', 'SEA', 'SFO'].map(city => owned(city, 1_000)), openingCountryIds: ['US'] }).countries[0];
  assert.equal(empty.grade, 'DARK');
  assert.equal(empty.coveredShare, 0);
  assert.ok(low.coveredShare >= 0 && low.coveredShare <= low.reachedShare);
  assert.ok(upgraded.coveredShare >= low.coveredShare);
  assert.ok(full.coveredShare > .9, `Large US network should cover its opening audience; got ${full.coveredShare}`);
  for (const country of [empty, low, upgraded, full]) {
    assert.ok(Number.isFinite(country.coveredShare));
    assert.ok(Number.isFinite(country.reachedShare));
  }
});

test('country coverage reports bounded well-served and cloud portions without bypassing residency', () => {
  const coverage = deriveStreamingNetworkCoverage({
    facilities: [owned('BOG', 40), cloud()], openingCountryIds: ['BR', 'CO'],
  });
  const brazil = coverage.countries.find(country => country.countryId === 'BR');
  const colombia = coverage.countries.find(country => country.countryId === 'CO');
  assert.ok(brazil && colombia);
  assert.ok(brazil.reachedShare > 0 && colombia.reachedShare > 0);
  for (const country of [brazil, colombia]) {
    assert.ok(Number.isFinite(country.coveredShare));
    assert.ok(Number.isFinite(country.cloudServedShare));
    assert.ok(country.coveredShare >= 0 && country.coveredShare <= country.reachedShare);
    assert.ok(country.cloudServedShare >= 0 && country.cloudServedShare <= country.coveredShare);
  }
  assert.ok(brazil.cloudServedShare > 0, 'In-country cloud should serve some of Brazil.');
  assert.equal(colombia.cloudServedShare, 0, 'Brazilian cloud must not evade Colombian locality attribution.');
});

const brand: Brand = {
  name: 'Baseline+', markId: 'FRAME_PLAY', customMark: null,
  hue: 0, sat: 80, identId: 'pulse', customIdent: null,
  promiseId: 'BALANCED', publicManifesto: '', layoutId: 'wall',
  typeId: 'default', accentHue: 25, identMode: 'none', identLen: 2,
  ratingId: 'GENERAL', lockupId: 'default', serverCity: null,
};
const markets: NonNullable<BuildInputs['markets']> = [
  { id: 'US', country: 'United States', region: 'NORTH_AMERICA', audience: 100_000_000, annualGrowthPercent: 3, recommendedCityId: 'LA', localizationNote: 'English ready.' },
  { id: 'BR', country: 'Brazil', region: 'SOUTH_AMERICA', audience: 60_000_000, annualGrowthPercent: 8, recommendedCityId: 'RIO', localizationNote: 'Portuguese ready.' },
  { id: 'BE', country: 'Belgium', region: 'EUROPE', audience: 8_000_000, annualGrowthPercent: 2, recommendedCityId: 'BRU', localizationNote: 'French and Dutch ready.' },
];
const inputs: BuildInputs = {
  absoluteWeek: 22, treasury: 500_000_000_000,
  catalogueSpend: 0, catalogueTitles: 1, originalsSpend: 0, originalsCount: 1,
  premiereTitle: 'First Original', regions: ['NORTH_AMERICA', 'SOUTH_AMERICA', 'EUROPE'],
  markets, hasExplicitOpeningMarkets: true, homeCityId: 'LA', audienceMul: 1,
  openingDemandForecast: { low: 900_000, likely: 1_000_000, high: 1_200_000, byMarket: { US: 600_000, BR: 300_000, BE: 100_000 } },
};
const placements = [placement('LA', 2), placement('RIO', 1)];
const sel: BuildSel = {
  placements, facilities: migratePlacementsToStreamingFacilities(placements),
  arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE',
};

test('career Build passes finite country-service coverage into every visible consumer', () => {
  type Projection = Parameters<NonNullable<React.ComponentProps<typeof StreamingBuildWizardExperience>['onProjectionDiagnostic']>>[0];
  const projections: Projection[] = [];
  const markup = renderToStaticMarkup(<StreamingBuildWizardExperience
    brand={brand} inputs={inputs} sel={sel}
    onProjectionDiagnostic={snapshot => projections.push(snapshot)}
    onChange={() => undefined} onBack={() => undefined}
  />);
  assert.ok(projections.length > 0);
  const services = projections[0].services;
  assert.equal(services.length, 3);
  for (const service of services) {
    assert.ok(Number.isFinite(service.reachedShare), `${service.marketId}: reached`);
    assert.ok(Number.isFinite(service.coveredShare), `${service.marketId}: covered`);
    assert.ok(Number.isFinite(service.coveredPeak), `${service.marketId}: covered peak`);
    assert.ok(Number.isFinite(service.cloudServedShare), `${service.marketId}: cloud portion`);
    assert.ok((service.coveredShare || 0) <= (service.reachedShare || 0));
    assert.ok((service.coveredPeak || 0) <= (service.peak || 0));
    const canonicalCountry = projections[0].coverage.find(country => country.countryId === service.marketId);
    assert.equal(service.geographicCoveredShare, canonicalCountry?.coveredShare,
      `${service.marketId}: commission coverage must be the canonical geographic reading, not capacity-scaled service`);
  }
  assert.equal(services.find(service => service.marketId === 'BE')?.state, 'NONE');
  assert.equal(/NaN|Infinity/.test(markup), false);
});

test('malformed service coverage is unavailable and cannot pass the rehearsal gate', () => {
  const invalid: CountryService = {
    marketId: 'US', name: 'United States', code: 'US', servedBy: ['Los Angeles'], role: 'Origin',
    state: 'READY', startupMs: 420, buffering: 2, peak: 100_000,
    reachedShare: .8, coveredShare: .7, coveredPeak: Number.NaN,
    cloudServedShare: 0, catalogue: 1, localization: 'Ready',
  };
  const draft: BuildDraft = {
    facilities: [], architecture: 'HYBRID', ownedShare: .5, doctrine: 'STANDARD',
    campaignId: '', mode: 'HANDS',
    instructions: { priority: 'BALANCED', maxBudget: 1_000_000_000, risk: 'CAREFUL', preferredCityIds: [], askAbove: 0 },
    repairIds: [], override: false,
    rehearsal: {
      signature: 's1-current', scenario: 'LIKELY', verdict: 'HELD',
      peak: 100_000, capacity: 200_000, spare: 100_000, failedPct: 0,
      catalogue: 1, spof: 0, held: ['United States'], failed: [], countries: [], rooms: [],
    },
  };
  const data: BuildData = {
    company: { name: 'Baseline+', week: 22 }, treasury: { available: 1_000_000_000, committedLaunch: 0 },
    hasExplicitOpeningMarkets: true,
    markets: [{ id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 1_000_000, catalogue: 1 }],
    regions: [{ id: 'NORTH_AMERICA', name: 'North America', line: '' }],
    countries: [{ id: 'US', regionId: 'NORTH_AMERICA', name: 'United States', code: 'US', shape: 'US', opening: true, note: '' }],
    cities: [], listings: [], presets: [], campaigns: [], spend: [], repairs: [],
    pricing: { model: 'Subscription', plans: 1, arpu: 9, reach: 1_000_000, problems: [] },
    team: draft.instructions, existing: [], commissioned: false, canonicalMode: 'CAREER',
    canonical: {
      totals: () => ({ racks: 1, compute: 1, cities: 1, buildingCities: 1, capacity: 200_000, burst: 0,
        buildCost: 10_000_000, weeklyCost: 10_000, weeks: 4, energy: 1, water: 1,
        sustainability: 80, reputation: 80, redundancy: 'SINGLE' }),
      money: () => ({ lines: [], total: 10_000_000, commissionNow: 10_000_000, deferred: 0,
        available: 1_000_000_000, headroom: 990_000_000, shortfall: 0 }),
      services: () => [invalid], signature: () => 's1-current', rehearse: () => draft.rehearsal!,
    },
  };
  const report = regionReport(data, draft, [invalid], regionsOf(data)[0]);
  assert.equal(report.word, 'Unavailable');
  assert.ok(Number.isFinite(report.served));
  assert.equal(gates(data, draft).find(gate => gate.id === 'rehearsal')?.ok, false);
  const markup = renderToStaticMarkup(<BuildWizard data={data} initialStage="test" initialDraft={draft} onOpenRehearsal={() => undefined} />);
  assert.match(markup, /Coverage unavailable/);
  assert.equal(/NaN|Infinity/.test(markup), false);
  const boardBanner = markup.match(/<p class="bw-board-banner[^"]*"[^>]*>(.*?)<\/p>/)?.[1] || '';
  assert.match(boardBanner, /Coverage unavailable/);
  assert.match(markup, /class="sf-btn sf-btn--primary bw-run-go" disabled=""/);
  const networkMarkup = renderToStaticMarkup(<BuildWizard data={data} initialStage="network" initialDraft={draft} />);
  assert.equal(networkMarkup.includes('Coverage unavailable'), true, 'Network view must explain unavailable coverage.');
  assert.equal(/0% served/.test(networkMarkup), false, 'Unknown country coverage must not be painted as a measured zero.');
  const inconsistent = { ...invalid, coveredShare: .2, coveredPeak: 90_000 };
  assert.equal(countryServiceCoverageValid(inconsistent), false, 'Peak and share must describe the same audience.');
  const nonFinitePeak = { ...invalid, peak: Number.NaN };
  const nonFiniteData = { ...data, canonical: { ...data.canonical!, services: () => [nonFinitePeak] } } as BuildData;
  const nonFiniteMarkup = renderToStaticMarkup(<BuildWizard data={nonFiniteData} initialStage="network" initialDraft={draft} />);
  assert.equal(/NaN|Infinity/.test(nonFiniteMarkup), false, 'An invalid peak must not escape into visible Build copy.');
});

test('a network edit invalidates rehearsal evidence without inventing a coverage failure', () => {
  const source = {
    marketId: 'US', name: 'United States', code: 'US', servedBy: ['Los Angeles'], role: 'Origin',
    state: 'READY' as const, startupMs: 420, buffering: 2, peak: 100_000,
    reachedShare: 1, coveredShare: 1, coveredPeak: 100_000, cloudServedShare: 0,
    geographicCoveredShare: 1,
    catalogue: 1, localization: 'Ready',
  };
  const draft = {
    facilities: [], architecture: 'HYBRID', ownedShare: .5, doctrine: 'STANDARD', campaignId: '', mode: 'HANDS',
    instructions: { priority: 'BALANCED', maxBudget: 1_000_000, risk: 'CAREFUL', preferredCityIds: [], askAbove: 0 },
    repairIds: [], override: false,
    rehearsal: { signature: '0', scenario: 'LIKELY', verdict: 'HELD', peak: 100_000, capacity: 200_000,
      spare: 100_000, failedPct: 0, catalogue: 1, spof: 0, held: ['United States'], failed: [], countries: [], rooms: [] },
  } as BuildDraft;
  const data = {
    company: { name: 'Baseline+', week: 22 }, treasury: { available: 1_000_000_000, committedLaunch: 0 },
    markets: [{ id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 1_000_000, catalogue: 1 }],
    regions: [], countries: [], cities: [], listings: [], presets: [], campaigns: [], spend: [], repairs: [],
    pricing: { model: 'Subscription', plans: 1, arpu: 9, reach: 1_000_000, problems: [] }, team: draft.instructions,
    existing: [], commissioned: false,
    canonical: {
      services: () => [source], signature: (current: BuildDraft) => String(current.facilities.length),
      rehearse: () => draft.rehearsal!,
      totals: () => ({ racks: 1, compute: 1, cities: 1, buildingCities: 1, capacity: 200_000, burst: 0,
        buildCost: 10_000_000, weeklyCost: 10_000, weeks: 4, energy: 1, water: 1,
        sustainability: 80, reputation: 80, redundancy: 'SINGLE' as const }),
      money: () => ({ lines: [], total: 10_000_000, commissionNow: 10_000_000, deferred: 0,
        available: 1_000_000_000, headroom: 990_000_000, shortfall: 0 }),
    },
  } as BuildData;
  assert.equal(gates(data, draft).find(gate => gate.id === 'rehearsal')?.ok, true);
  const edited = { ...draft, facilities: [{ id: 'edit', listingId: 'LA', cityId: 'LA', built: false,
    groups: [{ id: 'origin', name: 'Origin', duty: 'ORIGIN', racks: 2, capacity: 200_000 }],
    power: { used: 1, contracted: 2 }, cooling: { used: 1, available: 2 }, bandwidth: { used: 1, available: 2 },
    condition: 1, uptime: 1, backup: 'UPS', backupCoverage: 1, energyPerWeek: 1, waterPerWeek: 1,
    opCost: 1, sustainability: 80, reputation: 80 }] } as BuildDraft;
  const gate = gates(data, edited).find(item => item.id === 'rehearsal');
  assert.equal(gate?.ok, false);
  assert.match(gate?.value || '', /Out of date/);
});

test('commissioning needs each market geographically served even when routed load rehearsal held', () => {
  const source: CountryService = {
    marketId: 'US', name: 'United States', code: 'US', servedBy: ['Los Angeles'], role: 'Origin',
    state: 'READY', startupMs: 300, buffering: 1, peak: 100_000,
    reachedShare: 1, coveredShare: .95, coveredPeak: 95_000, cloudServedShare: 0,
    geographicCoveredShare: .79, catalogue: 1, localization: 'Ready',
  };
  const draft: BuildDraft = {
    facilities: [], architecture: 'HYBRID', ownedShare: .5, doctrine: 'STANDARD', campaignId: '', mode: 'HANDS',
    instructions: { priority: 'BALANCED', maxBudget: 1_000_000, risk: 'CAREFUL', preferredCityIds: [], askAbove: 0 },
    repairIds: [], override: true,
    rehearsal: { signature: 'unchanged', scenario: 'LIKELY', verdict: 'HELD', peak: 100_000,
      capacity: 200_000, spare: 100_000, failedPct: 0, catalogue: 1, spof: 0,
      held: ['United States'], failed: [], countries: [], rooms: [] },
  };
  const data: BuildData = {
    company: { name: 'Baseline+', week: 22 }, treasury: { available: 1_000_000_000, committedLaunch: 0 },
    markets: [{ id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 100_000, catalogue: 1 }],
    regions: [], countries: [], cities: [], listings: [], presets: [], campaigns: [], spend: [], repairs: [],
    pricing: { model: 'Subscription', plans: 1, arpu: 9, reach: 100_000, problems: [] }, team: draft.instructions,
    existing: [], commissioned: false, canonicalMode: 'CAREER',
    canonical: {
      services: () => [source], signature: () => 'unchanged', rehearse: () => draft.rehearsal!,
      totals: () => ({ racks: 1, compute: 1, cities: 1, buildingCities: 1, capacity: 200_000, burst: 0,
        buildCost: 10_000_000, weeklyCost: 10_000, weeks: 4, energy: 1, water: 1,
        sustainability: 80, reputation: 80, redundancy: 'SINGLE' }),
      money: () => ({ lines: [], total: 10_000_000, commissionNow: 10_000_000, deferred: 0,
        available: 1_000_000_000, headroom: 990_000_000, shortfall: 0 }),
    },
  };
  const thin = gates(data, draft);
  assert.equal(thin.find(gate => gate.id === 'rehearsal')?.ok, true,
    'Routed load test stays an honest independent result.');
  assert.equal(thin.find(gate => gate.id === 'coverage')?.ok, false,
    '79% is below the existing served-grade threshold, even with override enabled.');
  assert.match(thin.find(gate => gate.id === 'coverage')?.value || '', /United States.*79%/);
  const launchScreen = renderToStaticMarkup(<BuildWizard data={data} initialStage="launch" initialDraft={draft} />);
  assert.match(launchScreen, /Opening-market coverage/);
  assert.match(launchScreen, /United States 79%/);
  assert.doesNotMatch(launchScreen, />Commission ·/,
    'A passed rehearsal or draft override must not expose commission for a thin market.');
  const testScreen = renderToStaticMarkup(<BuildWizard data={data} initialStage="test" initialDraft={draft} onOpenRehearsal={() => undefined} />);
  assert.match(testScreen, /routed traffic.*geographic coverage/i,
    'The Test stage must not imply a passed rehearsal proves the whole market is covered.');
  const sufficient = { ...source, geographicCoveredShare: .8, coveredShare: .2, coveredPeak: 20_000 };
  const sufficientGates = gates({ ...data, canonical: { ...data.canonical!, services: () => [sufficient] } }, draft);
  assert.equal(sufficientGates.find(gate => gate.id === 'coverage')?.ok, true,
    'A capacity-limited service forecast must not fail the separate geographic condition.');
  const absent = gates({ ...data, canonical: { ...data.canonical!, services: () => [{ ...source, geographicCoveredShare: undefined }] } }, draft);
  assert.equal(absent.find(gate => gate.id === 'coverage')?.ok, false,
    'Missing career geography cannot silently inherit the loaded-service score.');
  const big = { ...source, geographicCoveredShare: 1 };
  const small = { ...source, marketId: 'BE', name: 'Belgium', code: 'BE', peak: 100,
    coveredPeak: 95, geographicCoveredShare: .799 };
  const mixedMarkets = gates({
    ...data,
    markets: [...data.markets, { id: 'BE', name: 'Belgium', code: 'BE', coord: { lat: 50.85, lng: 4.35 }, demand: 100, catalogue: 1 }],
    canonical: { ...data.canonical!, services: () => [big, small] },
  }, draft);
  assert.equal(mixedMarkets.find(gate => gate.id === 'coverage')?.ok, false,
    'A large fully served market cannot hide a small country below the threshold.');
  assert.match(mixedMarkets.find(gate => gate.id === 'coverage')?.value || '', /Belgium 79\.9%/,
    'A 79.9% market must not be rounded up to a misleading 80% on the failure gate.');
});
