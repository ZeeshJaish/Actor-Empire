import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Country, LaunchData, LaunchDraft } from '../components/studio-finance/finance/launch';
import type { StepProps } from '../components/studio-finance/components/launch/LaunchWizard';
import { StepMarkets } from '../components/studio-finance/components/launch/StepMarkets';
import { StepClearance } from '../components/studio-finance/components/launch/StepClearance';
import { FlagField } from '../components/studio-finance/components/FlagField';
import { CountryReport } from '../components/studio-finance/components/launch/CountryReport';
import { STREAMING_MARKET_SUB_REGIONS } from '../services/streamingMarketSubRegions';
import StreamingDefineLaunchExperience, * as launchExperience from '../components/StreamingDefineLaunchExperience';
import { STREAMING_WORLD_MARKETS } from '../services/streamingDayOneMarkets';
import StreamingMarketExpansionWizard from '../components/StreamingMarketExpansionWizard';
import { saveStreamingMarketPlan } from '../services/streamingMarkets';
import { contentMarketFixture } from './helpers/contentMarketFixture';

const caribbean = STREAMING_MARKET_SUB_REGIONS.find(group => group.id === 'CARIBBEAN')!;
const countries: Country[] = caribbean.countryIds.map((id, index) => ({
  id, code: id, name: id, region: 'North America', subRegionId: 'CARIBBEAN',
  subRegion: 'Caribbean', authored: false, competition: 'OPEN', difficulty: 'LOW',
  audience: 100_000 + index, growth: 10, addressableHouseholds: 50_000,
  opportunity: '', languages: [{ name: 'English', share: 100 }],
  rightsEstimate: 100_000, complianceCost: 20_000, rivals: [],
  localizationNote: '', dossier: { approvalWeeks: '4–6 weeks', consumerRequirements: [] },
} as Country));
const data = {
  countries, regions: ['North America'],
  clearance: [], energy: { current: 100, max: 100 },
} as unknown as LaunchData;
const draft = { selectedCountryIds: caribbean.countryIds } as LaunchDraft;
const props = {
  data, draft, patch: () => {}, chosen: countries,
  treasury: { available: 10_000_000, founderContributed: 10_000_000, committed: 0, planned: 0, paid: 0 },
  free: 10_000_000, gap: 0, handlers: {},
} as StepProps;

test('market card and clearance step agree on 26E for the 13-country filing action', () => {
  const markets = renderToStaticMarkup(<StepMarkets {...props} />);
  const clearance = renderToStaticMarkup(<StepClearance {...props} />);
  assert.match(markets, /26 energy to file 13 together/);
  assert.match(clearance, /26E founder attention/);
  assert.match(clearance, /File all 13[^<]*26E/);
  assert.doesNotMatch(markets, /65 energy to file/);
  assert.doesNotMatch(clearance, /65E founder attention/);
});

test('group card previews its actual countries on an accessible map instead of flag strips', () => {
  const markets = renderToStaticMarkup(<StepMarkets {...props} />);
  assert.match(markets, /aria-label="Caribbean market map preview"/);
  assert.doesNotMatch(markets, /class="lw-group-flag"/);
});

test('the UI excludes already filed markets from the next batch quote', () => {
  const alreadyFiled = new Set(caribbean.countryIds.slice(0, 2));
  const partialData = {
    ...data,
    clearance: countries.filter(country => alreadyFiled.has(country.id)).map(country => ({
      countryId: country.id, outcome: 'IN_REVIEW' as const, stage: 'FILED' as const,
    })),
  };
  const partialProps = { ...props, data: partialData };
  const markets = renderToStaticMarkup(<StepMarkets {...partialProps} />);
  const clearance = renderToStaticMarkup(<StepClearance {...partialProps} />);
  assert.match(markets, /22 energy to file 11 together/);
  assert.match(clearance, /22E founder attention/);
  assert.match(clearance, /File all 11[^<]*22E/);
});

test('a zero-cash filing still discloses its founder-attention cost', () => {
  const freeMarkets = countries.map(country => ({ ...country, rightsEstimate: 0, complianceCost: 0 }));
  const freeData = { ...data, countries: freeMarkets };
  const freeProps = { ...props, data: freeData, chosen: freeMarkets };
  const clearance = renderToStaticMarkup(<StepClearance {...freeProps} />);
  assert.match(clearance, /26E founder attention/);
  assert.match(clearance, /File all 13[^<]*26E/);
});

test('a zero-cash country report does not render non-finite cost bars', () => {
  const country = {
    ...countries[0], rightsEstimate: 0, complianceCost: 0,
    dossier: {
      ...countries[0].dossier,
      levels: { tax: 0, review: 0, privacy: 0, localContent: 0 },
      taxBaseline: '0%', privacyLevel: 'standard', localContentObligation: 'none',
      regulatoryOverhead: 0, risks: [], clearances: [], regulatoryExpectation: '',
      edgeSites: 1, peakConcurrent: 0, bandwidthGbps: 0, infraCity: 'none',
    },
  } as Country;
  const report = renderToStaticMarkup(<CountryReport country={country} />);
  assert.doesNotMatch(report, /NaN|Infinity/);
});

test('Define the Launch header shows the player week instead of lifetime absolute week', () => {
  const player = contentMarketFixture();
  player.currentWeek = 12;
  const markup = renderToStaticMarkup(<StreamingDefineLaunchExperience
    player={player}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onOpenCatalogue={() => undefined}
    onOpenBuild={() => undefined}
    onOpenPricing={() => undefined}
    onOpenTechnology={() => undefined}
  />);
  assert.match(markup, /Week (?:<!-- -->)?12/);
  assert.doesNotMatch(markup, /Week (?:<!-- -->)?1312/);
});


test('promoted countries render as detailed cards without a duplicate grouped card', () => {
  for (const [id, name] of [['CN', 'China'], ['RU', 'Russia'], ['PK', 'Pakistan'], ['BD', 'Bangladesh']]) {
    const country = { ...countries[0], id, code: id, name, authored: false, featured: true } as Country;
    const viewProps = { ...props, chosen: [country], draft: { selectedCountryIds: [id] }, data: { ...data, countries: [country] } } as StepProps;
    const markup = renderToStaticMarkup(<StepMarkets {...viewProps} />);
    assert.match(markup, /class="lw-country /);
    assert.match(markup, /Full report/);
    assert.match(markup, /10E to file/);
    assert.doesNotMatch(markup, /class="lw-group /);
    const clearance = renderToStaticMarkup(<StepClearance {...viewProps} />);
    assert.match(clearance, /File [^<]*10E/);
  }
});

test('a group country can be filed for 2E even when the selected batch is unaffordable', () => {
  const viewProps = { ...props, data: { ...data, energy: { current: 2, max: 100 } } };
  const markup = renderToStaticMarkup(<StepClearance {...viewProps} />);
  assert.match(markup, /File CU[^<]*2E/);
  assert.match(markup, /24E short to file all 13/);
});


test('the real launch-country adapter provides full dossiers and promoted presentation for all four markets', () => {
  const build = (launchExperience as any).buildStreamingLaunchCountry;
  assert.equal(typeof build, 'function', 'Launch country adapter must expose real presentation data');
  for (const id of ['CN', 'RU', 'PK', 'BD']) {
    const country = build(STREAMING_WORLD_MARKETS.find(m => m.id === id));
    assert.equal(country.featured, true);
    assert.equal(country.authored, false, 'Promotion must not rewrite authored economy membership');
    assert.ok(country.audience > 0 && country.growth > 0);
    assert.ok(country.languages.length && country.rivals.length);
    assert.ok(country.complianceCost > 0 && country.rightsEstimate > 0);
    const dossier = renderToStaticMarkup(<CountryReport country={country} />);
    assert.doesNotMatch(dossier, /NaN|Infinity|undefined/);
    assert.match(dossier, /Consumer|consumer|privacy/i);
  }
});

test('post-launch expansion exposes individual filing even if a batch cannot be afforded', () => {
  const player = contentMarketFixture();
  player.ownedStreamingPlatform.launchCommit = { committedAtAbsoluteWeek: 1201 } as any;
  const planned = saveStreamingMarketPlan(player, ['CN', 'BD'], 'EXPANSION').player;
  planned.energy.current = 10;
  const markup = renderToStaticMarkup(<StreamingMarketExpansionWizard player={planned}
    mode="EXPANSION" initialStep="CLEARANCE" onUpdatePlayer={() => {}} onClose={() => {}}
    onOpenFinance={() => {}} onOpenBuild={() => {}} onOpenCatalogue={() => {}} onOpenPricing={() => {}} />);
  assert.match(markup, /File Bangladesh[^<]*10E/);
  assert.match(markup, /File China[^<]*10E/);
  assert.match(markup, /10E short to file all 2/);
});


test('Pakistan and Bangladesh detailed cards use their supplied flag artwork', () => {
  for (const code of ['PK', 'BD']) {
    const flag = renderToStaticMarkup(<FlagField code={code} variant="band" />);
    assert.match(flag, /country-flags\.svg/);
  }
});


test('all 197 real country presentations contain 28 detailed cards and 169 grouped countries', () => {
  const countries = STREAMING_WORLD_MARKETS.map(launchExperience.buildStreamingLaunchCountry);
  assert.equal(countries.length, 197);
  assert.equal(new Set(countries.map(c => c.id)).size, 197);
  assert.equal(countries.filter(c => c.featured).length, 28);
  assert.equal(countries.filter(c => !c.featured).length, 169);
});


test('global clearance visibly quotes 533E and leaves affordable individual filings enabled at 70E', () => {
  const countries = STREAMING_WORLD_MARKETS.map(launchExperience.buildStreamingLaunchCountry);
  const viewProps = { ...props, chosen: countries,
    draft: { selectedCountryIds: countries.map(c => c.id) },
    data: { ...data, countries, energy: { current: 70, max: 100 } }, free: 100_000_000_000 } as StepProps;
  const markup = renderToStaticMarkup(<StepClearance {...viewProps} />);
  assert.match(markup, /533E founder attention/);
  assert.match(markup, /463E short to file all 197/);
  assert.match(markup, /<button type="button" class="sf-btn sf-btn--primary">File Antigua and Barbuda[^<]*2E/);
});
