import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { roomCapacityFeedback, StagePlans } from '../components/studio-finance/components/build/StagePlans';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import * as buildFinance from '../components/studio-finance/finance/build';
import { limitingFactor, type Facility } from '../components/studio-finance/finance/build';
import * as buildWizardAdapter from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { facilitiesOf, type BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';
import type { OwnedStreamingFacility } from '../types';

const cityCount = 12;
const roomsPerCity = 8;

const cities = Array.from({ length: cityCount }, (_, cityIndex) => ({
  id: `CITY_${cityIndex + 1}`,
  name: `City ${String(cityIndex + 1).padStart(2, '0')}`,
}));

const facilities: Facility[] = cities.flatMap((city, cityIndex) => (
  Array.from({ length: roomsPerCity }, (_, roomIndex) => ({
    id: `${city.id}_ROOM_${roomIndex + 1}`,
    listingId: `${city.id}_LISTING`,
    cityId: city.id,
    built: false,
    groups: [{
      id: `${city.id}_GROUP_${roomIndex + 1}`,
      name: 'Main library',
      duty: 'ORIGIN' as const,
      racks: 1,
      capacity: 65_000,
    }],
    power: { used: 12, contracted: 48 },
    cooling: { used: 11, available: 44 },
    bandwidth: { used: 2_000, available: 8_000 },
    condition: .96,
    uptime: .999,
    backup: 'Generator',
    backupCoverage: .8,
    energyPerWeek: 11,
    waterPerWeek: 12,
    opCost: 45_000,
    sustainability: 75,
    reputation: 78,
  }))
));

const canonicalFacilities = facilities.map(facility => (
  facility.id === 'CITY_7_ROOM_1'
    ? {
      ...facility,
      power: { used: 72, contracted: 48 },
      energyPerWeek: 999,
      opCost: 888_000,
    }
    : facility
));

const data = {
  cities,
  listings: cities.map(city => ({
    id: `${city.id}_LISTING`,
    cityId: city.id,
    name: `${city.name} Exchange`,
    provider: 'Empire Facilities',
    rackPositions: 8,
  })),
  repairs: [],
  canonical: {
    facilities: () => canonicalFacilities,
  },
};

const draft = {
  facilities,
  architecture: 'HYBRID',
  ownedShare: .6,
  doctrine: 'STANDARD',
  repairIds: [],
};

const markup = renderToStaticMarkup(
  <StagePlans
    data={data as never}
    draft={draft as never}
    patch={() => undefined}
    totals={{
      racks: 96,
      cities: 12,
      capacity: 6_240_000,
      burst: 1_000_000,
      buildCost: 480_000_000,
      weeklyCost: 6_000_000,
      weeks: 18,
      energy: 2_000,
      water: 2_500,
      sustainability: 74,
      reputation: 77,
      redundancy: 'REDUNDANT',
    }}
    plan={undefined as never}
    services={undefined as never}
    handlers={{}}
    managed={false}
    teamProposal={null}
    setTeamProposal={() => undefined}
  />,
);

assert.equal(
  (markup.match(/data-city-plan=/g) || []).length,
  12,
  'large networks should render one compact navigator item per city',
);
assert.equal(
  (markup.match(/data-room-picker=/g) || []).length,
  8,
  'only the active city should render its room selectors',
);
assert.equal(
  (markup.match(/data-room-workbench=/g) || []).length,
  1,
  'only one room should expand into the complete controls',
);
assert.match(markup, /City 07/);
assert.match(markup, /1 needs attention/);
assert.match(markup, /<b>999<small class="sf-resource-unit">MWh/);
assert.doesNotMatch(markup, /<b>11<small class="sf-resource-unit">MWh/);

const fitRackGroupsToLimit = (buildFinance as unknown as {
  fitRackGroupsToLimit?: (groups: Facility['groups'], rackLimit: number) => Facility['groups'];
}).fitRackGroupsToLimit;
assert.equal(
  typeof fitRackGroupsToLimit,
  'function',
  'one shared rack-limit normalizer must protect every draft and canonical projection',
);
assert.deepEqual(
  fitRackGroupsToLimit?.([
    { id: 'over-origin', name: 'Main library', duty: 'ORIGIN', racks: 2, capacity: 280_000 },
    { id: 'over-edge', name: 'Fast cache', duty: 'EDGE', racks: 1, capacity: 120_000 },
  ], 2).map(group => [group.id, group.racks]),
  [['over-origin', 1], ['over-edge', 1]],
  'an old 3/2 draft must be repaired deterministically without losing either active duty',
);
assert.deepEqual(
  fitRackGroupsToLimit?.([
    { id: 'large-edge', name: 'Fast cache', duty: 'EDGE', racks: 3, capacity: 360_000 },
    { id: 'critical-origin', name: 'Main library', duty: 'ORIGIN', racks: 1, capacity: 140_000 },
    { id: 'live-peak', name: 'Premiere surge', duty: 'LIVE', racks: 2, capacity: 240_000 },
  ], 2).map(group => [group.id, group.racks]),
  [['large-edge', 1], ['critical-origin', 1]],
  'repairing an overfilled room must preserve its critical content origin before optional duties',
);

const fullFacility: Facility = {
  ...facilities[0],
  groups: [{ id: 'full-origin', name: 'Main library', duty: 'ORIGIN', racks: 2, capacity: 280_000 }],
};
const fullData = {
  cities: [cities[0]],
  listings: [{
    id: fullFacility.listingId,
    cityId: fullFacility.cityId,
    name: 'Two-slot room',
    provider: 'Empire Facilities',
    rackPositions: 2,
  }],
  repairs: [],
};
const fullDraft = {
  facilities: [fullFacility],
  architecture: 'HYBRID',
  ownedShare: .6,
  doctrine: 'STANDARD',
  campaignId: 'none',
  mode: 'HANDS',
  instructions: {
    priority: 'BALANCED',
    maxBudget: 45_000_000,
    risk: 'NORMAL',
    preferredCityIds: [],
    askAbove: 5_000_000,
  },
  repairIds: [],
  rehearsal: null,
  override: false,
};

assert.equal(
  limitingFactor(fullData as never, fullFacility),
  'NONE',
  'a valid 2/2 room is full but not physically broken',
);

const overfilledFacility: Facility = {
  ...fullFacility,
  groups: [{ ...fullFacility.groups[0], racks: 3, capacity: 420_000 }],
};
assert.equal(
  limitingFactor(fullData as never, overfilledFacility),
  'RACK',
  'an impossible 3/2 room remains an explicit rack-space error',
);

assert.deepEqual(
  roomCapacityFeedback(2, 2),
  {
    canAdd: false,
    message: 'Room full — 2 of 2 rack positions used. Remove a rack or lease another room in Sites.',
  },
  'a full room must explain why another rack was not added and how to recover',
);
assert.deepEqual(
  roomCapacityFeedback(1, 2),
  { canAdd: true, message: null },
  'a room with free rack positions must remain addable without warning',
);

const fullMarkup = renderToStaticMarkup(
  <StagePlans
    data={fullData as never}
    draft={fullDraft as never}
    patch={() => undefined}
    totals={{
      racks: 2,
      cities: 1,
      capacity: 280_000,
      burst: 0,
      buildCost: 2_000_000,
      weeklyCost: 90_000,
      weeks: 3,
      energy: 22,
      water: 24,
      sustainability: 75,
      reputation: 78,
      redundancy: 'SINGLE',
    }}
    plan={undefined as never}
    services={undefined as never}
    handlers={{}}
    managed={false}
    teamProposal={null}
    setTeamProposal={() => undefined}
  />,
);

assert.match(
  fullMarkup,
  /aria-disabled="true" aria-label="Add a rack"/,
  'the full-room add control must stay tappable so it can explain the physical limit',
);
assert.doesNotMatch(fullMarkup, /disabled="" aria-label="Add a rack"/);
assert.match(fullMarkup, /Room full · 2 of 2 rack positions assigned/);
assert.match(fullMarkup, /Stores masters for the network\./);
assert.doesNotMatch(
  fullMarkup,
  /Holds every title and makes the master stream the rest of the network copies\.<\/em><s>/,
  'the compact room card must not use the long duty explanation',
);
assert.doesNotMatch(fullMarkup, /Build pace/, 'the retired manual pace control must not remain in the Build Plans UI');
assert.match(fullMarkup, /Traffic buffer/, 'temporary capacity must use a player-readable label');

const constructionProgress = (buildFinance as unknown as {
  constructionProgress?: (currentWeek: number, committedAtWeek: number, readyAtWeek: number) => {
    status: 'BUILDING' | 'OPERATIONAL';
    totalWeeks: number;
    elapsedWeeks: number;
    remainingWeeks: number;
    progressPercent: number;
  };
}).constructionProgress;
assert.equal(typeof constructionProgress, 'function', 'construction progress must derive from the canonical game-week dates');
assert.deepEqual(
  constructionProgress?.(103, 100, 110),
  { status: 'BUILDING', totalWeeks: 10, elapsedWeeks: 3, remainingWeeks: 7, progressPercent: 30 },
  'a commissioned network must expose deterministic progress and remaining game weeks',
);
assert.deepEqual(
  constructionProgress?.(110, 100, 110),
  { status: 'OPERATIONAL', totalWeeks: 10, elapsedWeeks: 10, remainingWeeks: 0, progressPercent: 100 },
  'construction must become operational exactly at its canonical ready week',
);

const constructionData = {
  ...fullData,
  company: { name: 'Empire+', week: 103, brandHex: '#6d4aff' },
  treasury: { available: 100_000_000, committedLaunch: 0 },
  markets: [],
  regions: [],
  countries: [],
  presets: [],
  campaigns: [{ id: 'none', name: 'None', cost: 0, line: 'No campaign', multiplier: 1 }],
  spend: [],
  pricing: { model: 'Subscription', plans: 3, arpu: 13, reach: 1, problems: [] },
  team: fullDraft.instructions,
  existing: [fullFacility],
  commissioned: true,
  construction: { committedAtWeek: 100, readyAtWeek: 110 },
};
const constructionMarkup = renderToStaticMarkup(
  <BuildWizard data={constructionData as never} initialStage="launch" initialDraft={fullDraft as never} />,
);
assert.match(constructionMarkup, /Construction underway/);
assert.match(constructionMarkup, /Week 3 of 10/);
assert.match(constructionMarkup, /Opening night · 7 weeks remaining/);
assert.match(constructionMarkup, /disabled=""[^>]*>Opening night · 7 weeks remaining</);

const lockedPlansMarkup = renderToStaticMarkup(
  <BuildWizard data={constructionData as never} initialStage="plans" initialDraft={fullDraft as never} />,
);
assert.match(lockedPlansMarkup, /fieldset class="bw-construction-locked" disabled=""/);
assert.match(lockedPlansMarkup, /Commissioned configuration locked while crews build/);

const buildSelectionFromDraft = (buildWizardAdapter as unknown as {
  buildSelectionFromDraft?: (
    draft: typeof fullDraft,
    base: BuildSel,
    absoluteWeek: number,
  ) => BuildSel;
}).buildSelectionFromDraft;
assert.equal(
  typeof buildSelectionFromDraft,
  'function',
  'the canonical draft adapter must be directly auditable at its persistence boundary',
);

const canonicalRoom: OwnedStreamingFacility = {
  id: fullFacility.id,
  cityId: fullFacility.cityId,
  type: 'RENTED_CABINET',
  installedRacks: 2,
  role: 'CORE_ORIGIN',
  rackGroups: [{ id: 'full-origin', name: 'Main library', rackCount: 2, duty: 'CONTENT_ORIGIN' }],
  lease: {
    listingId: fullFacility.listingId,
    providerName: 'Empire Facilities',
    rackPositions: 2,
    depositCost: 500_000,
    setupCost: 250_000,
    weeklyRent: 45_000,
    electricityRatePerKwh: .14,
    taxRatePercent: 4,
    reliabilityPercent: 99.9,
    securityGrade: 'STANDARD',
    fibreGrade: 'CARRIER',
    contractWeeks: 52,
    provisioningWeeks: 3,
    expansionRackPositions: 0,
  },
};
const canonicalBase: BuildSel = {
  placements: [],
  facilities: [canonicalRoom],
  arch: 'HYBRID',
  doctrine: 'STANDARD',
  campaign: 'NONE',
};
const repairedSelection = buildSelectionFromDraft?.({
  ...fullDraft,
  facilities: [overfilledFacility],
}, canonicalBase, 0);
const repairedRoom = repairedSelection ? facilitiesOf(repairedSelection)[0] : undefined;
assert.equal(
  repairedRoom?.installedRacks,
  2,
  'commissioning must never persist more installed racks than the signed room contains',
);
assert.equal(
  repairedRoom?.rackGroups?.reduce((sum, group) => sum + group.rackCount, 0),
  2,
  'canonical rack duties must reconcile with the repaired installed-rack total',
);

console.log('Streaming Build Plans scale and canonical projection audit passed.');
