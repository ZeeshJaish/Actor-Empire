import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Country, LaunchData, LaunchDraft } from '../components/studio-finance/finance/launch';
import type { StepProps } from '../components/studio-finance/components/launch/LaunchWizard';
import { StepMarkets } from '../components/studio-finance/components/launch/StepMarkets';
import { StepClearance } from '../components/studio-finance/components/launch/StepClearance';
import { CountryReport } from '../components/studio-finance/components/launch/CountryReport';
import { STREAMING_MARKET_SUB_REGIONS } from '../services/streamingMarketSubRegions';

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

test('market card and clearance step agree on the 13-country filing action', () => {
  const markets = renderToStaticMarkup(<StepMarkets {...props} />);
  const clearance = renderToStaticMarkup(<StepClearance {...props} />);
  assert.match(markets, /25 energy to file 13 together/);
  assert.match(clearance, /25E founder attention/);
  assert.match(clearance, /File all 13[^<]*25E/);
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
  assert.match(markets, /23 energy to file 11 together/);
  assert.match(clearance, /23E founder attention/);
  assert.match(clearance, /File all 11[^<]*23E/);
});

test('a zero-cash filing still discloses its founder-attention cost', () => {
  const freeMarkets = countries.map(country => ({ ...country, rightsEstimate: 0, complianceCost: 0 }));
  const freeData = { ...data, countries: freeMarkets };
  const freeProps = { ...props, data: freeData, chosen: freeMarkets };
  const clearance = renderToStaticMarkup(<StepClearance {...freeProps} />);
  assert.match(clearance, /25E founder attention/);
  assert.match(clearance, /File all 13[^<]*25E/);
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
