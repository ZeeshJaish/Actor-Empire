import assert from 'node:assert/strict';
import test from 'node:test';
import { createStreamingLaunchRehearsal, type StreamingLaunchRehearsalInput } from '../services/streamingLaunchRehearsal';
import { diagnoseStreamingRehearsalMarket, summarizeStreamingRehearsalMarkets } from '../services/streamingRehearsalPresentation';

const input: StreamingLaunchRehearsalInput = {
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

test('all-market tally and local route diagnosis explain failure despite global spare capacity', () => {
  const result = createStreamingLaunchRehearsal(input);
  assert.ok(result.spareCapacityPercent > 0);
  assert.deepEqual(summarizeStreamingRehearsalMarkets(result), { playing: 1, buffering: 1, down: 1, total: 3 });
  const belgium = result.countries.find(country => country.marketId === 'BE');
  assert.ok(belgium);
  const diagnosis = diagnoseStreamingRehearsalMarket(result, belgium);
  assert.match(diagnosis.reason, /no regional delivery route/i);
  assert.match(diagnosis.reason, /global.*capacity/i);
  assert.match(diagnosis.repair, /Europe/);
  assert.match(diagnosis.route, /none/i);
});

test('routed market diagnosis names its city and local load', () => {
  const result = createStreamingLaunchRehearsal(input);
  const unitedKingdom = result.countries.find(country => country.marketId === 'GB');
  assert.ok(unitedKingdom);
  const diagnosis = diagnoseStreamingRehearsalMarket(result, unitedKingdom);
  assert.match(diagnosis.route, /London/);
  assert.match(diagnosis.load, /100%/);
  assert.doesNotMatch(diagnosis.reason, /no regional delivery route/i);
});
