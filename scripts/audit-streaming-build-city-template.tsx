import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { StagePlans } from '../components/studio-finance/components/build/StagePlans';
import {
  copyCityTemplateToNetwork,
  type BuildData,
  type BuildDraft,
  type Facility,
  type FacilityListing,
} from '../components/studio-finance/finance/build';

const listing = (
  id: string,
  cityId: string,
  rackPositions: number,
  facilityType: FacilityListing['facilityType'],
): FacilityListing => ({
  id,
  cityId,
  provider: 'Empire Facilities',
  name: id,
  facilityType,
  type: facilityType ?? 'Facility',
  description: 'Fixture room.',
  rackPositions,
  moveIn: 1_000_000,
  weeklyRent: 40_000,
  powerPrice: '6¢/kWh',
  localTax: '4%',
  uptime: .999,
  fibre: 'Excellent',
  security: 'High',
  provisioningWeeks: 3,
  contractMonths: 12,
  expansion: 0,
  note: 'Ready.',
  availability: 'AVAILABLE',
});

const facility = (
  id: string,
  listingId: string,
  cityId: string,
  groups: Facility['groups'],
): Facility => ({
  id,
  listingId,
  cityId,
  built: false,
  groups,
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
});

const origin = { id: 'source-origin', name: 'Main library', duty: 'ORIGIN' as const, racks: 3, capacity: 420_000 };
const edge = { id: 'source-edge', name: 'Fast cache', duty: 'EDGE' as const, racks: 3, capacity: 360_000 };
const services = { id: 'source-services', name: 'Accounts & payments', duty: 'SERVICES' as const, racks: 2, capacity: 240_000 };
const live = { id: 'source-live', name: 'Premiere surge', duty: 'LIVE' as const, racks: 1, capacity: 120_000 };

const listings = [
  listing('SRC_CAGE', 'SRC', 6, 'PRIVATE_CAGE'),
  listing('SRC_CLOUD', 'SRC', 3, 'CLOUD_ALLOCATION'),
  listing('DST_A_CAGE', 'DST_A', 4, 'PRIVATE_CAGE'),
  listing('DST_A_CLOUD', 'DST_A', 8, 'CLOUD_ALLOCATION'),
  listing('DST_A_CABINET', 'DST_A', 2, 'RENTED_CABINET'),
  listing('DST_B_CAGE', 'DST_B', 10, 'PRIVATE_CAGE'),
];

const facilities = [
  facility('src-cage', 'SRC_CAGE', 'SRC', [origin, edge]),
  facility('src-cloud', 'SRC_CLOUD', 'SRC', [services, live]),
  facility('dst-a-cage', 'DST_A_CAGE', 'DST_A', [{ ...origin, id: 'old-a', racks: 1 }]),
  facility('dst-a-cloud', 'DST_A_CLOUD', 'DST_A', [{ ...services, id: 'old-b', racks: 1 }]),
  facility('dst-a-cabinet', 'DST_A_CABINET', 'DST_A', [{ ...services, id: 'old-c', racks: 1 }]),
  facility('dst-b-cage', 'DST_B_CAGE', 'DST_B', [{ ...origin, id: 'old-d', racks: 1 }]),
];

const data = {
  cities: [
    { id: 'SRC', name: 'Los Angeles' },
    { id: 'DST_A', name: 'Toronto' },
    { id: 'DST_B', name: 'Mexico City' },
  ],
  listings,
  repairs: [{
    id: 'repair-power',
    facilityId: 'SRC_CAGE',
    label: 'Upgrade Power',
    what: '+24kW contracted grid capacity and stronger backup reserve.',
    cost: 1_200_000,
    fixes: 'POWER',
    weeks: 3,
  }],
} as unknown as BuildData;

const draft = {
  facilities,
  architecture: 'HYBRID',
  ownedShare: .6,
  doctrine: 'STANDARD',
  repairIds: [],
} as unknown as BuildDraft;

const result = copyCityTemplateToNetwork(data, draft, 'SRC');

assert.equal(result.destinationCities, 2);
assert.equal(result.affectedRooms, 4);
assert.equal(result.reducedRooms, 2);
assert.equal(result.requestedRacks, 18);
assert.equal(result.copiedRacks, 15);
assert.deepEqual(result.facilities.find(item => item.id === 'src-cage')?.groups, [origin, edge], 'source rooms stay unchanged');
assert.deepEqual(
  result.facilities.find(item => item.id === 'dst-a-cage')?.groups.map(group => [group.duty, group.racks]),
  [['ORIGIN', 2], ['EDGE', 2]],
  'matching facility types should preserve the source duty ratio within a smaller room',
);
assert.deepEqual(
  result.facilities.find(item => item.id === 'dst-a-cloud')?.groups.map(group => [group.duty, group.racks]),
  [['SERVICES', 2], ['LIVE', 1]],
  'larger rooms should copy the requested setup without inventing extra racks',
);
assert.deepEqual(
  result.facilities.find(item => item.id === 'dst-a-cabinet')?.groups.map(group => [group.duty, group.racks]),
  [['SERVICES', 1], ['LIVE', 1]],
  'unmatched room types should use the closest-capacity source room deterministically',
);
assert.equal(new Set(
  result.facilities.flatMap(item => item.groups.map(group => group.id)),
).size, result.facilities.flatMap(item => item.groups).length, 'copied rack groups should have network-unique IDs');
assert.equal(result.facilities.find(item => item.id === 'dst-a-cage')?.opCost, 45_000, 'copying must not overwrite destination economics');

const markup = renderToStaticMarkup(
  <StagePlans
    data={data}
    draft={draft}
    patch={() => undefined}
    totals={{
      racks: 11,
      cities: 3,
      capacity: 1_000_000,
      burst: 200_000,
      buildCost: 40_000_000,
      weeklyCost: 270_000,
      weeks: 8,
      energy: 100,
      water: 120,
      sustainability: 75,
      reputation: 78,
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

assert.match(markup, /Copy setup to all cities/, 'the active city should expose the copy action');
assert.doesNotMatch(markup, /<s>\+24kW/, 'room-upgrade descriptions must not use strike-through semantics');

console.log('Streaming Build city-template audit passed.');
