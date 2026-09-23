import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  StreamingLoadRehearsalExperience, derive,
  type BuildInputs, type BuildSel,
} from '../../components/streaming-transplant/StreamingBuildoutExperience';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';
import { createStreamingLaunchRehearsal, type StreamingLaunchRehearsalInput } from '../../services/streamingLaunchRehearsal';

const brand: Brand = {
  name: 'Empire+', markId: 'FRAME_PLAY', customMark: null, hue: 0, sat: 80,
  identId: 'pulse', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
  layoutId: 'wall', typeId: 'default', accentHue: 25, identMode: 'none', identLen: 2,
  ratingId: 'GENERAL', lockupId: 'default', serverCity: null,
};
const inputs: BuildInputs = {
  absoluteWeek: 22, treasury: 500_000_000_000,
  catalogueSpend: 0, catalogueTitles: 1, originalsSpend: 0, originalsCount: 1,
  premiereTitle: 'First Original', regions: ['NORTH_AMERICA', 'EUROPE'],
  markets: [
    { id: 'US', country: 'United States', region: 'NORTH_AMERICA', audience: 100_000_000, annualGrowthPercent: 3, recommendedCityId: 'NYC', localizationNote: '' },
    { id: 'GB', country: 'United Kingdom', region: 'EUROPE', audience: 60_000_000, annualGrowthPercent: 3, recommendedCityId: 'LON', localizationNote: '' },
    { id: 'BE', country: 'Belgium', region: 'EUROPE', audience: 8_000_000, annualGrowthPercent: 2, recommendedCityId: 'BRU', localizationNote: '' },
  ],
  hasExplicitOpeningMarkets: true, homeCityId: 'NYC', audienceMul: 1,
  openingDemandForecast: { low: 500, likely: 700, high: 900, byMarket: { US: 100, GB: 500, BE: 100 } },
};
const sel: BuildSel = { placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE' };
const rehearsalInput: StreamingLaunchRehearsalInput = {
  scenario: 'LIKELY', rolloutRiskPercent: 0,
  facilities: [
    { facilityId: 'us', cityId: 'NYC', cityLabel: 'New York', regionId: 'NORTH_AMERICA', steadyCapacity: 1000, burstCapacity: 1200, reliabilityPercent: 99.99, limitingFactor: 'NONE', physicalRepairActions: [] },
    { facilityId: 'eu', cityId: 'LON', cityLabel: 'London', regionId: 'EUROPE', steadyCapacity: 500, burstCapacity: 600, reliabilityPercent: 99.99, limitingFactor: 'NONE', physicalRepairActions: [] },
  ],
  countries: [
    { marketId: 'US', country: 'United States', regionId: 'NORTH_AMERICA', regionLabel: 'North America', demand: 100, latencyMs: 10, cacheHitPercent: 100, baseBufferingRiskPercent: 1, routeFacilityIds: ['us'], servingCityLabels: ['New York'], recommendedCityId: 'NYC', localizationNote: '', catalogueAvailableTitles: 1, catalogueTotalTitles: 1 },
    { marketId: 'GB', country: 'United Kingdom', regionId: 'EUROPE', regionLabel: 'Europe', demand: 500, latencyMs: 30, cacheHitPercent: 100, baseBufferingRiskPercent: 35, routeFacilityIds: ['eu'], servingCityLabels: ['London'], recommendedCityId: 'LON', localizationNote: '', catalogueAvailableTitles: 1, catalogueTotalTitles: 1 },
    { marketId: 'BE', country: 'Belgium', regionId: 'EUROPE', regionLabel: 'Europe', demand: 100, latencyMs: null, cacheHitPercent: 0, baseBufferingRiskPercent: 100, routeFacilityIds: [], servingCityLabels: [], recommendedCityId: 'BRU', localizationNote: '', catalogueAvailableTitles: 1, catalogueTotalTitles: 1 },
  ],
};

createRoot(document.getElementById('root')!).render(
  <StreamingLoadRehearsalExperience
    brand={brand} d={derive(sel, inputs)} inp={inputs} sel={sel}
    forecastFor={scenario => createStreamingLaunchRehearsal({ ...rehearsalInput, scenario })}
    onClose={() => undefined} onResult={() => undefined} onRepair={() => undefined}
  />,
);
