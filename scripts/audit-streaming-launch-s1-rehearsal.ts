import assert from 'node:assert/strict';
import test from 'node:test';
import { createStreamingLaunchRehearsal, type StreamingLaunchRehearsalInput } from '../services/streamingLaunchRehearsal';
import { diagnoseStreamingRehearsalMarket, summarizeStreamingRehearsalMarkets, streamingRehearsalPlayback } from '../services/streamingRehearsalPresentation';

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

test('partial route failure is degraded playback, not a total country outage', () => {
  const result = createStreamingLaunchRehearsal({
    ...input,
    countries: [{ ...input.countries[0], demand: 1030 }],
    facilities: [{ ...input.facilities[0], steadyCapacity: 1000, burstCapacity: 1000 }],
  });
  assert.equal(result.countries[0].failedPercent, 3);
  assert.equal(streamingRehearsalPlayback(result.countries[0]), 'BUFFERING');
  assert.equal(streamingRehearsalPlayback(result.countries[0], result, .1), 'PLAYING');
  assert.equal(streamingRehearsalPlayback(result.countries[0], result, 1), 'BUFFERING');
});

test('missing delivery routes get a coverage repair, never an invented server purchase', () => {
  const result = createStreamingLaunchRehearsal(input);
  const action = result.repairActions.find(action => action.type === 'REVIEW_COVERAGE' && action.marketId === 'BE');
  assert.ok(action, 'Unserved Belgium needs an actionable coverage review');
  assert.equal(action.type === 'REVIEW_COVERAGE' && action.regionId, 'EUROPE');
  assert.equal(streamingRehearsalPlayback(result.countries.find(x => x.marketId === 'BE')!, result, .1), 'DOWN');
});

test('partial geographic reach cannot turn into complete playback just because one route exists', () => {
  const result = createStreamingLaunchRehearsal({ ...input,
    countries: [{ ...input.countries[0], demand:100, reachableShare:.5 }],
    facilities:[input.facilities[0]],
  });
  assert.equal(result.countries[0].failedPercent,50);
  assert.equal(result.facilities[0].demand,50,'Only the reachable audience arrives at the facility');
  assert.equal(streamingRehearsalPlayback(result.countries[0],result,.1),'BUFFERING');
  assert.ok(result.repairActions.some(action=>action.type==='REVIEW_COVERAGE'));
});

test('successful burst delivery is playing, not an invented buffering incident', () => {
 const result=createStreamingLaunchRehearsal({...input,countries:[{...input.countries[0],demand:1050}],facilities:[input.facilities[0]]});
 assert.equal(result.countries[0].verdict,'BURST');
 assert.equal(result.countries[0].failedPercent,0);
 assert.ok(result.countries[0].bufferingRiskPercent<15);
 assert.equal(streamingRehearsalPlayback(result.countries[0]),'PLAYING');
 assert.equal(streamingRehearsalPlayback(result.countries[0],result,.99),'PLAYING');
});

test('physical repair targets the actual constraint rather than the first available upgrade', () => {
 const result=createStreamingLaunchRehearsal({...input,countries:[input.countries[0]],facilities:[{...input.facilities[0],limitingFactor:'COOLING',physicalRepairActions:[{id:'UPGRADE_POWER',label:'Power',cost:1200000},{id:'IMPROVE_COOLING',label:'Cooling',cost:1050000}]}]});
 const repair=result.repairActions.find(action=>action.type==='REPAIR_PHYSICAL');
 assert.ok(repair?.type==='REPAIR_PHYSICAL');
 assert.equal(repair.physicalAction,'IMPROVE_COOLING');
});
