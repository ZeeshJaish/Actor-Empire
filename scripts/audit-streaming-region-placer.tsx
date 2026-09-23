/* ============================================================================
   THE REGION BOARD AND THE PLACER — regions in, rooms out, and back.

   Since #103 the player decides by region: servers by tier and a cloud plan
   by provider. The placer turns that into rooms in cities the way engineering
   would, and reads it back off the rooms so a saved network reopens as the
   settings it was.

   What must stay true:

     · every region a chosen country sits in is a row, and no other
     · a setup placed and read back is the same setup, with nothing lost
     · a country that insists on being served from inside gets its rooms
       inside, and every room lands in a country being opened in
     · every room can power and cool what was put in it
     · cloud spreads across the region's cities inside their caps, and past
       the ceiling it is billed at the step-up, never refused
     · a provider that does not sell here places nothing and says so
     · a built room is never moved; the placer places the difference
     · the board sets a region with counters and one slider, and nobody
       drafts it for you — four stages, no team gate
     · a provider survives commissioning into the lease the live loop bills
     · the three what-ifs are priced by the forecast: cover the rest reaches
       the Strong line or says how far cloud goes, and the two "instead"
       answers keep the served share they replace (#104)
   ========================================================================== */

import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { createLabBuildData, createLabDraft } from '../lab/buildLabData';
import {
  BUILD_STAGES, CLOUD_EXTENSION_PREMIUM, CLOUD_PROVIDERS, CLOUD_PROVIDER_IDS, CLOUD_WEEKLY_PER_RACK, buildTotals, cloudProviderServes, cloudWeeklyCost, computeRacks,
  SERVER_TIERS, facilityReachFactor, fitsPlan, gates, groupsFor, headerLine, listingFor, moneyPlan, redundancy, serviceForecast, tiersOf,
} from '../components/studio-finance/finance/build';
import type { BuildDraft, Facility } from '../components/studio-finance/finance/build';
import {
  WHAT_IF_TARGET, cloudCeilingOf, emptySetup, openingRegions, placeRegion, regionReport, setupOf, serverCeilingOf,
  coverWithCloud, unservableIn, whatIfsFor, type RegionSetup, type RegionView,
} from '../components/studio-finance/finance/placer';
import { baseReachKm, effectiveReachKm, reachStrength, servedBand } from '../services/streamingNetworkReach';
import { STREAMING_SERVER_SITES } from '../services/streamingServerSites';
import { StageNetwork } from '../components/studio-finance/components/build/StageNetwork';
import { tierMarkPath } from '../components/studio-finance/components/build/NetworkAtlas';
import { hasDataResidencyRule } from '../services/streamingServerSites';
import * as buildWizardAdapter from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { facilitiesOf, type BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';

const data = createLabBuildData();
const blank = (): BuildDraft => createLabDraft();
const regions = openingRegions(data);
const regionNamed = (name: string) => {
  const region = regions.find(candidate => candidate.name === name);
  assert.ok(region, `${name} is a region you open in.`);
  return region!;
};
const countryOf = (room: Facility) => {
  const city = data.cities.find(candidate => candidate.id === room.cityId)!;
  return data.countries.find(candidate => candidate.id === city.countryId)!;
};

/* --- 1. the regions ------------------------------------------------------------ */
/* The lab opens in the US, Britain, Germany, India, Brazil, Australia,
   Indonesia and Russia: five regions, and not Africa. */
assert.deepEqual(regions.map(region => region.name).sort(), ['Asia', 'Europe', 'North America', 'Oceania', 'South America'],
  'Every region a chosen country sits in, and no other.');
const asia = regionNamed('Asia');
assert.ok(asia.opening.some(country => country.code === 'IN') && asia.opening.some(country => country.code === 'ID'),
  'Asia here is India and Indonesia.');

/* --- 2. placed and read back ---------------------------------------------------- */
const roundTrip = (region: typeof asia, setup: RegionSetup) => {
  const placed = placeRegion(data, blank(), region.id, setup);
  assert.equal(placed.unplaced.SCOUT + placed.unplaced.WORKHORSE + placed.unplaced.TITAN, 0, `${region.name}: every server found a room (${placed.note ?? ''}).`);
  assert.equal(placed.unplacedCompute, 0, `${region.name}: every unit of cloud was sold.`);
  assert.deepEqual(setupOf(data, placed.draft, region.id), setup, `${region.name}: what went in comes back out.`);
  return placed;
};
const asiaSetup: RegionSetup = { servers: { SCOUT: 2, WORKHORSE: 12, TITAN: 2 }, cloud: { provider: 'ATLAS', compute: 8 } };
const asiaPlaced = roundTrip(asia, asiaSetup);
roundTrip(regionNamed('North America'), { servers: { SCOUT: 0, WORKHORSE: 30, TITAN: 0 }, cloud: { provider: 'NORTHWIND', compute: 6 } });
roundTrip(regionNamed('Europe'), { servers: { SCOUT: 4, WORKHORSE: 6, TITAN: 4 }, cloud: { provider: 'MERIDIAN', compute: 3 } });
roundTrip(regionNamed('Oceania'), { servers: { SCOUT: 0, WORKHORSE: 3, TITAN: 0 }, cloud: { provider: 'ATLAS', compute: 0 } });
assert.deepEqual(setupOf(data, blank(), asia.id), emptySetup(), 'Nothing placed reads as nothing.');

/* --- 3. where they landed ------------------------------------------------------- */
const asiaRooms = asiaPlaced.draft.facilities;
assert.ok(asiaRooms.length >= 3, `Sixteen servers and eight compute across Asia is more than one room (${asiaRooms.length}).`);
for (const room of asiaRooms) {
  const country = countryOf(room);
  assert.ok(country.opening, `${room.id} landed in ${country.name}, which is not being opened in.`);
}
assert.ok(asiaRooms.some(room => countryOf(room).code === 'IN'), 'India insists on rooms inside India, and got them.');
assert.ok(hasDataResidencyRule('IN') && hasDataResidencyRule('ID'), 'Both of Asia\'s markets here carry the residency rule.');
for (const room of asiaRooms.filter(candidate => candidate.tenure !== 'CLOUD')) {
  const listing = listingFor(data, room)!;
  assert.ok(fitsPlan(listing, tiersOf(room)), `${listing.name} cannot power or cool what the placer put in it.`);
  /* Racks, not compute: two Scouts are a room of two racks and 1.2 compute. */
  const racksIn = Object.values(tiersOf(room)).reduce((sum, n) => sum + n, 0);
  assert.ok(racksIn >= 2 || asiaRooms.length === 1, `No one-rack rooms: two racks in a city is a room, one is a rounding error (${listing.name}: ${racksIn}).`);
}
const titanRooms = asiaRooms.filter(room => tiersOf(room).TITAN > 0);
assert.ok(titanRooms.length > 0 && titanRooms.every(room => (listingFor(data, room)?.rackPositions ?? 0) >= 8),
  'Titans went to rooms big enough to cool them.');

/* --- 4. cloud: spread, capped, and dear past the ceiling ------------------------- */
const na = regionNamed('North America');
const ceiling = cloudCeilingOf(data, na, 'ATLAS');
assert.ok(ceiling >= 10, `North America sells a real amount of cloud (${ceiling}).`);
const spread = placeRegion(data, blank(), na.id, { servers: emptySetup().servers, cloud: { provider: 'ATLAS', compute: ceiling } });
const clouds = spread.draft.facilities.filter(room => room.tenure === 'CLOUD');
assert.ok(clouds.length >= 2, 'A full plan spreads across more than one city.');
assert.equal(clouds.reduce((sum, room) => sum + computeRacks(room), 0), ceiling, 'And sells exactly what was asked.');
assert.ok(clouds.every(room => (room.cloudExtended ?? 0) === 0), 'Nothing above the ceiling at the ceiling.');
const beyond = placeRegion(data, blank(), na.id, { servers: emptySetup().servers, cloud: { provider: 'ATLAS', compute: ceiling + 5 } });
const beyondRooms = beyond.draft.facilities.filter(room => room.tenure === 'CLOUD');
assert.equal(beyondRooms.reduce((sum, room) => sum + computeRacks(room), 0), ceiling + 5, 'Past the ceiling is still sold.');
assert.equal(beyondRooms.reduce((sum, room) => sum + (room.cloudExtended ?? 0), 0), 5, 'Five units are marked as extended.');
const extendedRoom = beyondRooms.find(room => (room.cloudExtended ?? 0) > 0)!;
assert.equal(
  cloudWeeklyCost(extendedRoom),
  Math.round((computeRacks(extendedRoom) - 5) * CLOUD_WEEKLY_PER_RACK + 5 * CLOUD_WEEKLY_PER_RACK * CLOUD_EXTENSION_PREMIUM),
  'And billed at the step-up.',
);
assert.match(beyond.note ?? '', /above Atlas Compute/, 'The board is told.');
assert.ok(cloudCeilingOf(data, na, 'MERIDIAN') < ceiling, 'Meridian sells smaller plans.');

/* --- 5. a provider that is not here ----------------------------------------------- */
const sa = regionNamed('South America');
const refused = placeRegion(data, blank(), sa.id, { servers: emptySetup().servers, cloud: { provider: 'NORTHWIND', compute: 4 } });
assert.equal(refused.unplacedCompute, 4, 'Northwind places nothing in South America.');
assert.match(refused.note ?? '', /Northwind does not sell in South America/, 'And says why.');
assert.equal(cloudCeilingOf(data, sa, 'NORTHWIND'), 0);

/* --- 6. a built room stays where it is ------------------------------------------- */
const builtDraft: BuildDraft = { ...asiaPlaced.draft, facilities: asiaPlaced.draft.facilities.map((room, index) => (index === 0 ? { ...room, built: true } : room)) };
const keptId = builtDraft.facilities[0].id;
const grown = placeRegion(data, builtDraft, asia.id, { ...asiaSetup, servers: { ...asiaSetup.servers, WORKHORSE: asiaSetup.servers.WORKHORSE + 4 } });
assert.ok(grown.draft.facilities.some(room => room.id === keptId && room.built), 'The built room is still there, untouched.');
assert.equal(setupOf(data, grown.draft, asia.id).servers.WORKHORSE, asiaSetup.servers.WORKHORSE + 4, 'And the extra four were placed around it.');

/* --- 7. the report the row reads ------------------------------------------------- */
const mixed = asiaPlaced.draft;
const report = regionReport(data, mixed, serviceForecast(data, mixed), asia);
assert.ok(report.peak > 0 && report.served > 0, 'Asia is served by what was placed.');
assert.ok(report.served <= report.peak && report.cloudServed <= report.served, 'Served never exceeds the night, and the cloud part never exceeds served.');
assert.ok(report.once > 0 && report.weekly > 0, 'It costs something once and every week.');
assert.ok(report.landed.length >= 2, 'And it landed in more than one city.');
assert.ok(['Thin', 'Fair', 'Strong'].includes(report.word), `Asia with rooms is not dark (${report.word}).`);

/* --- 8. the board ------------------------------------------------------------------ */
const boardFor = (draft: BuildDraft) => renderToStaticMarkup(
  <StageNetwork
    data={data}
    draft={draft}
    patch={() => undefined}
    totals={buildTotals(data, draft)}
    plan={moneyPlan(data, draft)}
    services={serviceForecast(data, draft)}
    handlers={{}}
    managed={false}
    teamProposal={null}
    setTeamProposal={() => undefined}
  />,
);
const empty = boardFor(blank());
assert.equal((empty.match(/class="bw-rg-row/g) ?? []).length, 5, 'Five rows for five regions.');
assert.match(empty, /Nothing of yours here yet/, 'The page opens empty: nothing is drafted for you.');
assert.doesNotMatch(empty, /bw-gate2|Let the team build it|Send the brief|Hand it to the team/, 'There is no team path.');
assert.doesNotMatch(empty, /class="bw-rc |bw-composer|bw-net-rail/, 'No cards, no composer, no city rail.');
const opened = regions[0];
assert.match(empty, new RegExp(`aria-label="One more Workhorse in ${opened.name}"`), 'The open region is set with counters,');
assert.match(empty, new RegExp(`aria-label="Cloud compute in ${opened.name}"`), 'and one cloud slider.');
assert.match(empty, /Atlas Compute[\s\S]*Northwind[\s\S]*Meridian Edge/, 'Three providers to pick from.');
const filled = boardFor(mixed);
assert.match(filled, /class="bw-rg-served"/, 'A region carries its served bar.');
assert.match(filled, /Landed in /, 'And says where the servers landed.');
assert.match(filled, /Where they landed · \d+ rooms/, 'With the rooms behind one tap.');
assert.doesNotMatch(filled, /bw-atlas-potential|Cloud reach/, 'No rings on the map.');

/* --- 9. four stages, no team gate ----------------------------------------------- */
assert.deepEqual(BUILD_STAGES.map(stage => stage.id), ['network', 'money', 'test', 'launch'], 'Four stages: Servers folded into Network.');
assert.ok(!gates(data, mixed).some(gate => gate.id === 'team-plan'), 'Nothing to approve, so no gate for it.');
assert.ok(gates(data, mixed).every(gate => gate.stage !== ('servers' as string)), 'No gate points at a stage that is gone.');

/* --- 10. the provider survives commissioning -------------------------------------- */
const buildSelectionFromDraft = (buildWizardAdapter as unknown as {
  buildSelectionFromDraft?: (draft: BuildDraft, base: BuildSel, absoluteWeek: number) => BuildSel;
}).buildSelectionFromDraft;
assert.equal(typeof buildSelectionFromDraft, 'function');
const eu = regionNamed('Europe');
const meridian = placeRegion(data, blank(), eu.id, { servers: emptySetup().servers, cloud: { provider: 'MERIDIAN', compute: 3 } });
const base: BuildSel = { placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE' };
const live = facilitiesOf(buildSelectionFromDraft!(meridian.draft, base, 0));
const drawnClouds = meridian.draft.facilities.filter(room => room.tenure === 'CLOUD');
assert.ok(drawnClouds.length > 0, 'Meridian placed compute in Europe.');
for (const drawn of drawnClouds) {
  const liveCloud = live.find(facility => facility.id === drawn.id);
  assert.ok(liveCloud, `${drawn.id} commissions.`);
  assert.equal(liveCloud!.lease?.cloudProvider, 'MERIDIAN', 'And the lease remembers the provider,');
  assert.equal(liveCloud!.lease?.weeklyRent, cloudWeeklyCost(drawn), 'and bills at its rate.');
}
/* Three compute spread across Europe's cities, summed, is dearer than three at
   the going rate — Meridian costs more per unit wherever it lands. */
assert.ok(drawnClouds.reduce((sum, room) => sum + cloudWeeklyCost(room), 0) > 3 * CLOUD_WEEKLY_PER_RACK,
  'Which is dearer than the going rate.');

/* --- 11. the what-ifs -------------------------------------------------------------- */
const servedOf = (draft: BuildDraft) => {
  const report = regionReport(data, draft, serviceForecast(data, draft), na);
  return report.peak > 0 ? report.served / report.peak : 0;
};
const twoRacks = placeRegion(data, blank(), na.id, { servers: { SCOUT: 0, WORKHORSE: 2, TITAN: 0 }, cloud: { provider: 'ATLAS', compute: 0 } }).draft;
const before = servedOf(twoRacks);
assert.ok(before > 0 && before < WHAT_IF_TARGET, `Two Workhorses serve some of North America and not enough (${before.toFixed(2)}).`);
const options = whatIfsFor(data, twoRacks, na, 'ATLAS');
/* Since #109 the strip has no cover button — the slider covers a region — but
   the chips still ask each provider what covering the rest would take. */
assert.ok(!options.some(option => option.id === 'COVER'), 'The strip offers no cover button.');
const cover = coverWithCloud(data, twoRacks, na, 'ATLAS');
assert.ok(cover, 'Short of the line, Atlas says what covering the rest would take.');
assert.ok((cover!.addedCompute ?? 0) > 0 && (cover!.addedWeekly ?? 0) > 0, 'For a price.');
const covered = servedOf(placeRegion(data, twoRacks, na.id, cover!.setup).draft);
assert.ok(cover!.reached ? covered >= WHAT_IF_TARGET : covered > before, `Applied, it does what it said (${covered.toFixed(2)}).`);
assert.deepEqual(cover!.setup.servers, { SCOUT: 0, WORKHORSE: 2, TITAN: 0 }, 'And leaves your servers alone.');
const allCloud = options.find(option => option.id === 'ALL_CLOUD');
assert.ok(allCloud, 'With servers in the region, it offers all cloud instead.');
assert.deepEqual(allCloud!.setup.servers, { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, 'Which has no servers,');
assert.equal(allCloud!.once, 0, 'nothing to move in,');
assert.ok(servedOf(placeRegion(data, twoRacks, na.id, allCloud!.setup).draft) >= before - 0.005, 'and keeps the served share it replaces.');
assert.ok(!options.some(option => option.id === 'ALL_SERVERS'), 'No cloud here, so nothing to replace with servers.');
const hybrid = placeRegion(data, twoRacks, na.id, { servers: { SCOUT: 0, WORKHORSE: 2, TITAN: 0 }, cloud: { provider: 'ATLAS', compute: 6 } }).draft;
const hybridBefore = servedOf(hybrid);
const allServers = whatIfsFor(data, hybrid, na, 'ATLAS').find(option => option.id === 'ALL_SERVERS');
assert.ok(allServers, 'With cloud in the region, it offers all your own servers instead.');
assert.equal(allServers!.setup.cloud.compute, 0, 'Which rents nothing,');
assert.ok(allServers!.once > 0 && allServers!.readyWeeks >= 1, 'costs something once and takes time,');
assert.ok(servedOf(placeRegion(data, hybrid, na.id, allServers!.setup).draft) >= hybridBefore - 0.005, 'and keeps the served share it replaces.');
const strip = boardFor(twoRacks);
assert.match(strip, /class="bw-rg-alternatives"/, 'The priced alternatives remain reachable on demand.');
assert.doesNotMatch(strip, /class="bw-rg-whatif is-cloud"/, 'Expensive alternate placements are deferred until the disclosure opens.');
assert.match(strip, /plan ceiling/, 'Each provider still states its plan ceiling before purchase.');

/* --- 12. the tuning pass (#106): every region can be Strong, and says what it costs --- */
/* Squared fall-off: a stream is smooth for two-thirds of a room's reach, not
   45% of it, and the map's green core is drawn at the same fraction. */
assert.ok(Math.abs(servedBand(0.55) - Math.sqrt(0.45)) < 1e-9, 'The served band is the fall-off solved for the standard.');
{
  const source = { cityId: 'NYC', lat: 40.71, lng: -74.01, racks: 4, capacity: 1e9, spread: 1, transit: 0.9, fibre: 1 };
  const usable = effectiveReachKm(source, 0);
  const at = (fraction: number) => reachStrength(source, { lat: 40.71 + fraction * usable / 111, lng: -74.01, demand: 1, countryCode: 'US' }, 0);
  assert.ok(at(0) > 0.99 && at(0.5) > 0.7 && at(0.66) >= 0.55 && at(0.9) < 0.55 && at(1.05) === 0,
    `A stream stays smooth for two-thirds of the way out and is gone at the edge (${at(0.5).toFixed(2)}, ${at(0.66).toFixed(2)}, ${at(0.9).toFixed(2)}).`);
}

/* Six regions, the lab's five and Africa. In every one, Workhorses alone
   reach the Strong line inside 96 racks, and some provider's cloud alone
   reaches it inside its plan — no region is a dead end at any price. */
const six = createLabBuildData(['US', 'GB', 'DE', 'IN', 'BR', 'AU', 'ID', 'RU', 'NG', 'ZA']);
const sixRegions = openingRegions(six);
assert.equal(sixRegions.length, 6, 'Six regions when Africa is opened too.');
const servedShareOf = (region: RegionView, setup: RegionSetup): number => {
  const placed = placeRegion(six, createLabDraft(), region.id, setup);
  const report = regionReport(six, placed.draft, serviceForecast(six, placed.draft), region);
  return report.peak > 0 ? report.served / report.peak : 0;
};
const workhorses = (n: number): RegionSetup => ({ servers: { SCOUT: 0, WORKHORSE: n, TITAN: 0 }, cloud: { provider: 'ATLAS', compute: 0 } });
for (const region of sixRegions) {
  const top = Math.min(96, serverCeilingOf(six, region));
  assert.ok(servedShareOf(region, workhorses(top)) >= WHAT_IF_TARGET, `${region.name}: Workhorses alone reach Strong inside ${top} racks.`);
  const byCloud = CLOUD_PROVIDER_IDS.filter(id => cloudProviderServes(CLOUD_PROVIDERS[id], region.id)).some(id => {
    const ceiling = cloudCeilingOf(six, region, id);
    return servedShareOf(region, { servers: workhorses(0).servers, cloud: { provider: id, compute: ceiling } }) >= WHAT_IF_TARGET;
  });
  assert.ok(byCloud, `${region.name}: some provider's plan reaches Strong without the step-up.`);
  /* And the ladder climbs: another Workhorse never serves fewer people. The
     placer puts racks where they reach someone, breadth first, so a region
     no longer reads the same share from two racks to sixteen. */
  let last = 0;
  for (let n = 1; n <= 14; n += 1) {
    const share = servedShareOf(region, workhorses(n));
    assert.ok(share >= last - 1e-9, `${region.name}: ${n} Workhorses serve ${(share * 100).toFixed(0)}%, fewer than ${n - 1} did (${(last * 100).toFixed(0)}%).`);
    last = share;
  }
  assert.ok(servedShareOf(region, workhorses(6)) > servedShareOf(region, workhorses(1)), `${region.name}: six Workhorses reach more than one.`);
}
/* The providers trade. Northwind is the cheap answer where it sells and the
   audience is close; Meridian's reach makes it the cheapest Strong somewhere
   Atlas is not; Atlas is never the dearest everywhere. */
{
  const strongCost = (region: RegionView, id: 'ATLAS' | 'NORTHWIND' | 'MERIDIAN'): number | null => {
    if (!cloudProviderServes(CLOUD_PROVIDERS[id], region.id)) return null;
    const ceiling = cloudCeilingOf(six, region, id);
    for (let n = 1; n <= ceiling; n += 1) {
      if (servedShareOf(region, { servers: workhorses(0).servers, cloud: { provider: id, compute: n } }) >= WHAT_IF_TARGET) return n * CLOUD_WEEKLY_PER_RACK * CLOUD_PROVIDERS[id].rate;
    }
    return null;
  };
  const wins = { ATLAS: 0, NORTHWIND: 0, MERIDIAN: 0 };
  for (const region of sixRegions) {
    const costs = CLOUD_PROVIDER_IDS.map(id => [id, strongCost(region, id)] as const).filter((entry): entry is readonly [typeof entry[0], number] => entry[1] !== null);
    const cheapest = costs.slice().sort((a, b) => a[1] - b[1])[0];
    wins[cheapest[0]] += 1;
  }
  /* With a site near every cluster (#109) reach stops deciding anything at
     launch, so the cheapest Strong is the cheapest rate that sells here:
     Northwind where it sells, Atlas where it does not. Meridian's reach
     means it never needs MORE compute than Atlas; at 1.45× the rate it never
     costs less. That collapse is recorded in #109 as the next question. */
  assert.ok(wins.NORTHWIND >= 3 && wins.ATLAS >= 1 && wins.MERIDIAN === 0, `Cheapest Strong: Northwind where it sells, Atlas elsewhere (Atlas ${wins.ATLAS}, Northwind ${wins.NORTHWIND}, Meridian ${wins.MERIDIAN}).`);
  for (const region of sixRegions) {
    const atlas = strongCost(region, 'ATLAS');
    const meridian = strongCost(region, 'MERIDIAN');
    assert.ok(atlas !== null && meridian !== null && meridian / (CLOUD_WEEKLY_PER_RACK * 1.45) <= atlas / CLOUD_WEEKLY_PER_RACK,
      `${region.name}: Meridian's reach never asks for more compute than Atlas.`);
  }
}

/* The site catalogue covers the residency countries the launch offers. A
   country that insists on rooms inside its borders and has nowhere to rent
   one is said on the row, not left as a share that will not climb. */
for (const code of ['IN', 'BR', 'RU', 'NG', 'ID']) {
  assert.ok(STREAMING_SERVER_SITES.some(site => site.countryCode === code), `${code} insists on rooms inside and has somewhere to rent one.`);
}
{
  /* Every residency country has a site since #109, so the case is made by
     taking Vietnam's away: the behaviour — say it, count it, hatch it — is
     what must stay true, whatever the catalogue holds. */
  const withSites = createLabBuildData(['US', 'VN']);
  const gone = new Set(withSites.cities.filter(city => city.code === 'VN').map(city => city.id));
  const withVietnam = {
    ...withSites,
    cities: withSites.cities.filter(city => !gone.has(city.id)),
    listings: withSites.listings.filter(listing => !gone.has(listing.cityId)),
  };
  const asiaVn = openingRegions(withVietnam).find(region => region.name === 'Asia')!;
  const dead = unservableIn(withVietnam, asiaVn);
  assert.deepEqual(dead.map(market => market.code), ['VN'], 'Vietnam insists on rooms inside its borders and nobody rents there.');
  const report = regionReport(withVietnam, createLabDraft(), serviceForecast(withVietnam, createLabDraft()), asiaVn);
  assert.ok(report.unservable.peak > 0 && report.unservable.peak <= report.peak, 'Its part of the night is counted, and can never be served.');
  /* The board opens on the first region with rooms, so give Asia two: with
     no Vietnamese site they land elsewhere in the region, and serve nobody. */
  const vnDraft = placeRegion(withVietnam, createLabDraft(), asiaVn.id, workhorses(2)).draft;
  const vnReport = regionReport(withVietnam, vnDraft, serviceForecast(withVietnam, vnDraft), asiaVn);
  assert.equal(vnReport.served, 0, 'Two Workhorses outside Vietnam serve none of it.');
  const vnMarkup = renderToStaticMarkup(
    <StageNetwork
      data={withVietnam}
      draft={vnDraft}
      patch={() => undefined}
      totals={buildTotals(withVietnam, vnDraft)}
      plan={moneyPlan(withVietnam, vnDraft)}
      services={serviceForecast(withVietnam, vnDraft)}
      handlers={{}}
      managed={false}
      teamProposal={null}
      setTeamProposal={() => undefined}
    />,
  );
  assert.match(vnMarkup, /Vietnam<\/b> insists on rooms inside its borders, and nobody rents there/, 'The row says so.');
  assert.match(vnMarkup, /cannot be served from anywhere/, 'And says it is nobody\'s fault but geography.');
}

/* Racks are what gets built; compute is rented. The header, the deposits
   and the construction clock count them apart (#106). */
{
  const naSix = sixRegions.find(region => region.name === 'North America')!;
  const mixed = placeRegion(six, createLabDraft(), naSix.id, { servers: { SCOUT: 0, WORKHORSE: 3, TITAN: 0 }, cloud: { provider: 'ATLAS', compute: 4 } }).draft;
  const totals = buildTotals(six, mixed);
  assert.equal(totals.racks, 3, 'Three racks stand in buildings.');
  assert.equal(totals.compute, 4, 'Four compute are rented.');
  assert.ok(totals.buildingCities < totals.cities, 'Cloud cities are cities, but not building cities.');
  assert.match(headerLine(six, mixed), /^3 racks · 4 compute · \d+ weeks to build$/, `The header counts them apart (${headerLine(six, mixed)}).`);
  const deposits = moneyPlan(six, mixed).lines.find(line => line.id === 'deposits')!;
  assert.equal(deposits.note, `${totals.buildingCities} ${totals.buildingCities === 1 ? 'city' : 'cities'}`, 'Deposits are paid where there is a building.');
  const allCloud = placeRegion(six, createLabDraft(), naSix.id, { servers: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloud: { provider: 'ATLAS', compute: 4 } }).draft;
  const cloudTotals = buildTotals(six, allCloud);
  assert.equal(cloudTotals.racks, 0);
  assert.ok(cloudTotals.weeks <= 2, `Nothing to build is ready when the provider says, not in four weeks (${cloudTotals.weeks}).`);
  assert.match(headerLine(six, allCloud), /^4 compute · (ready on the night|1 week to build)$/, `An all-cloud header (${headerLine(six, allCloud)}).`);
}


/* --- 13. the map paints people, the row offers its ways in (#108) ------------ */
/* The forecast keeps each cluster's grade, so the map can paint what the row
   counted: with six Workhorses in North America three clusters are served and
   the rest dark; with forty Titans all six are served. */
{
  const naSix = sixRegions.find(region => region.name === 'North America')!;
  const six6 = placeRegion(six, createLabDraft(), naSix.id, workhorses(6)).draft;
  const us6 = serviceForecast(six, six6).find(service => service.code === 'US')!;
  assert.ok(us6.places && us6.places.length >= 6, 'The United States is graded cluster by cluster.');
  assert.equal(us6.places!.filter(place => place.state === 'SERVED').length, 3, 'Six Workhorses serve three of its clusters.');
  assert.ok(us6.places!.every(place => place.state === 'SERVED' || place.state === 'DARK'), 'Reached-but-not-served would be yellow; none here.');
  assert.ok(Math.abs(us6.places!.reduce((sum, place) => sum + place.share, 0) - 1) < 0.01, 'The clusters are the whole country.');
  const titans = placeRegion(six, createLabDraft(), naSix.id, { servers: { SCOUT: 0, WORKHORSE: 0, TITAN: 40 }, cloud: { provider: 'ATLAS', compute: 0 } }).draft;
  const usTitans = serviceForecast(six, titans).find(service => service.code === 'US')!;
  assert.ok(usTitans.places!.every(place => place.state === 'SERVED'), 'Forty Titans serve every cluster, and the map can say so.');
  /* And the atlas draws it: a place per cluster, in its state, and the
     country tinted inline. */
  const painted = renderToStaticMarkup(
    <StageNetwork
      data={six}
      draft={six6}
      patch={() => undefined}
      totals={buildTotals(six, six6)}
      plan={moneyPlan(six, six6)}
      services={serviceForecast(six, six6)}
      handlers={{}}
      managed={false}
      teamProposal={null}
      setTeamProposal={() => undefined}
    />,
  );
  /* #109: the map paints reach — one shaded field per city, crossing every
     border, stronger with more in the room — over the country's tint. The
     cluster blobs of #108 are gone; the forecast still carries the grades. */
  /* #111: two layers — every field's yellow halo, then every green core on
     top of all of them, so a neighbour's rim can never cover a core. */
  assert.equal((painted.match(/fill="url\(#bw-field-tail\)"/g) ?? []).length, 6, 'Three cities: three halos on the map and three in the emission.');
  assert.equal((painted.match(/fill="url\(#bw-field-core\)"/g) ?? []).length, 3, 'And three green cores.');
  const lastTail = painted.lastIndexOf('fill="url(#bw-field-tail)"');
  const firstCore = painted.indexOf('fill="url(#bw-field-core)"');
  assert.ok(firstCore > lastTail, 'Every core is drawn after every halo, so no rim covers a core.');
  assert.doesNotMatch(painted, /bw-atlas-place|bw-atlas-reach-edge|is-thin/, 'No blobs, no outlines, no yellow band.');
  /* And the rooms are wired to each other, with traffic on the links. */
  assert.match(painted, /class="bw-atlas-traffic"/, 'The links carry traffic.');
  /* #110: the market's base is red and stays red; how it is going is the
     field brushed over it. And a dot is a room: three cities held, three dots. */
  assert.match(painted, /class="bw-atlas-market" data-code="US" stroke-width/, 'The market is drawn plain,');
  assert.doesNotMatch(painted, /class="bw-atlas-market" data-code="US" style=/, 'not tinted by its share.');
  assert.equal((painted.match(/class="bw-atlas-pin is-held/g) ?? []).length, 3, 'Three rooms, three dots,');
  assert.equal((painted.match(/class="bw-atlas-pin /g) ?? []).length, 3, 'and no dots where nothing stands.');
  assert.doesNotMatch(painted, /filter="url\(#bw-field-merge\)"/, 'And no crush flattening the shading.');
  /* Past the audience, compute spreads across the region: North America's
     whole cloud plan lands in Canada and Mexico too, not only in the United
     States being opened. */
  const spread = placeRegion(six, createLabDraft(), naSix.id, { servers: workhorses(0).servers, cloud: { provider: 'ATLAS', compute: cloudCeilingOf(six, naSix, 'ATLAS') } }).draft;
  const spreadCountries = new Set(spread.facilities.map(room => six.countries.find(country => country.id === six.cities.find(city => city.id === room.cityId)!.countryId)!.code));
  assert.ok(spreadCountries.has('CA') && spreadCountries.has('MX'), `A full plan spreads across the region (${[...spreadCountries].join(', ')}).`);
  const twoCloud = placeRegion(six, createLabDraft(), naSix.id, { servers: workhorses(0).servers, cloud: { provider: 'ATLAS', compute: 2 } }).draft;
  assert.ok(twoCloud.facilities.every(room => six.cities.find(city => city.id === room.cityId)!.code === 'US'), 'But the first compute goes where the audience is.');

  /* An empty region offers no computed alternatives eagerly. The underlying
     quote service remains available and is checked provider by provider. */
  const empty = createLabDraft();
  assert.deepEqual(whatIfsFor(six, empty, naSix, 'ATLAS'), [], 'Nothing to trim or replace on an empty region, and no cover button.');
  for (const id of ['ATLAS', 'NORTHWIND', 'MERIDIAN'] as const) {
    const cover = coverWithCloud(six, empty, naSix, id);
    assert.ok(cover && cover.reached && cover.addedCompute! > 0, `${id} says what it would take here.`);
  }
  const emptyMarkup = renderToStaticMarkup(
    <StageNetwork data={six} draft={empty} patch={() => undefined} totals={buildTotals(six, empty)} plan={moneyPlan(six, empty)} services={serviceForecast(six, empty)} handlers={{}} managed={false} teamProposal={null} setTeamProposal={() => undefined} />,
  );
  assert.doesNotMatch(emptyMarkup, /Two ways in|Cover it with|bw-rg-whatif/, 'No buttons on an empty region,');
  assert.match(emptyMarkup, /Compare paths to Strong/, 'The detailed comparisons remain available on request.');
  assert.doesNotMatch(emptyMarkup, /bw-rg-done/, 'Nothing to be done with yet.');

  /* Strong already: nothing to cover. The "fewer would do the same" answer
     went with #114 — the three servers are different machines now, so
     swapping Titans for Workhorses is a trade the player makes, not an
     efficiency the board should nag about. */
  assert.equal(coverWithCloud(six, titans, naSix, 'ATLAS'), null, 'Nothing to cover when it is Strong already.');
  assert.ok(!whatIfsFor(six, titans, naSix, 'ATLAS').some(option => (option.id as string) === 'TRIM'), 'No trim answer.');
  const trimmedMarkup = renderToStaticMarkup(
    <StageNetwork data={six} draft={titans} patch={() => undefined} totals={buildTotals(six, titans)} plan={moneyPlan(six, titans)} services={serviceForecast(six, titans)} handlers={{}} managed={false} teamProposal={null} setTeamProposal={() => undefined} />,
  );
  assert.doesNotMatch(trimmedMarkup, /Fewer would do the same/, 'And the row does not nag about it.');
  assert.match(trimmedMarkup, /Done · next: /, 'A set region offers Done, and where Done goes.');
  assert.match(trimmedMarkup, /Clear North America/, 'And a way to clear it.');
}


/* --- 14. the three servers are three machines (#114) ------------------------- */
/* Reach is what separates them: a Titan throws across a region from one room,
   a Scout barely leaves its city, so the same ground costs a handful of the
   one or one in every city of the other. */
{
  assert.ok(SERVER_TIERS.TITAN.reach > SERVER_TIERS.WORKHORSE.reach && SERVER_TIERS.WORKHORSE.reach > SERVER_TIERS.SCOUT.reach,
    'A Titan throws further than a Workhorse, which throws further than a Scout.');
  const ground = (tier: 'SCOUT' | 'WORKHORSE' | 'TITAN', racks: number) => {
    const spec = SERVER_TIERS[tier];
    return baseReachKm({ cityId: 'x', lat: 0, lng: 0, racks: racks * spec.compute, capacity: 1e9, spread: 1 }) * spec.reach;
  };
  const ratio = (ground('TITAN', 1) / ground('SCOUT', 1)) ** 2;
  assert.ok(ratio > 6 && ratio < 18, `One Titan covers roughly ten Scouts' worth of ground (${ratio.toFixed(1)}).`);
  /* A room reads its own mix: all Titans throws like a Titan, all Scouts like
     a Scout, and a mixture lands between. */
  const roomOf = (plan: Record<string, number>) => ({ tenure: 'RENTED' as const, groups: groupsFor('x', plan) });
  const titanRoom = facilityReachFactor(roomOf({ TITAN: 4 }));
  const scoutRoom = facilityReachFactor(roomOf({ SCOUT: 4 }));
  const mixedRoom = facilityReachFactor(roomOf({ TITAN: 2, SCOUT: 2 }));
  assert.ok(Math.abs(titanRoom - SERVER_TIERS.TITAN.reach) < 1e-9 && Math.abs(scoutRoom - SERVER_TIERS.SCOUT.reach) < 1e-9, 'A room of one tier throws as that tier.');
  assert.ok(mixedRoom > scoutRoom && mixedRoom < titanRoom, `A mixed room lands between (${mixedRoom.toFixed(2)}).`);

  /* And it shows in the placement. Across a region wide enough for reach to
     matter, the least racks that reach Strong take far more cities in Scouts
     than in Titans; where a region is small enough, Titans reach Strong from
     a single address — which is the trade, because a single address is a
     single point of failure. */
  const strongBy = (regionName: string, tier: 'SCOUT' | 'WORKHORSE' | 'TITAN') => {
    const region = sixRegions.find(candidate => candidate.name === regionName)!;
    for (const racks of [2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 52, 64, 80, 96]) {
      const placed = placeRegion(six, createLabDraft(), region.id, { servers: { SCOUT: 0, WORKHORSE: 0, TITAN: 0, [tier]: racks }, cloud: { provider: 'ATLAS', compute: 0 } });
      const report = regionReport(six, placed.draft, serviceForecast(six, placed.draft), region);
      if (report.peak > 0 && report.served / report.peak >= WHAT_IF_TARGET) {
        return { racks, cities: new Set(placed.draft.facilities.map(room => room.cityId)).size, once: report.once, resilience: redundancy(placed.draft.facilities) };
      }
    }
    return null;
  };
  const asiaScout = strongBy('Asia', 'SCOUT');
  const asiaTitan = strongBy('Asia', 'TITAN');
  assert.ok(asiaScout && asiaTitan, 'Both reach Strong in Asia.');
  assert.ok(asiaScout!.cities > asiaTitan!.cities,
    `Scouts take more of Asia's cities to reach Strong than Titans (${asiaScout!.cities} against ${asiaTitan!.cities}).`);
  assert.ok(asiaScout!.once < asiaTitan!.once, 'And cost less to buy, for the trouble.');
  const africaScout = strongBy('Africa', 'SCOUT');
  const africaTitan = strongBy('Africa', 'TITAN');
  assert.ok(africaScout!.racks > africaTitan!.racks * 3,
    `Africa is wide, so Scouts need several times the racks (${africaScout!.racks} against ${africaTitan!.racks}).`);
  const oceaniaTitan = strongBy('Oceania', 'TITAN');
  assert.equal(oceaniaTitan!.resilience, 'SINGLE',
    'A small region Strong on Titans alone rests on one address — reach bought at the price of resilience.');
  assert.notEqual(strongBy('Oceania', 'SCOUT')!.resilience, 'SINGLE', 'The same region on Scouts is spread across several.');

  /* Each tier wears its own mark, on the map and on the counter. */
  assert.notEqual(tierMarkPath('SCOUT', 5), tierMarkPath('WORKHORSE', 5));
  assert.notEqual(tierMarkPath('WORKHORSE', 5), tierMarkPath('TITAN', 5));
  const naSix3 = sixRegions.find(region => region.name === 'North America')!;
  const titansFew = placeRegion(six, createLabDraft(), naSix3.id, { servers: { SCOUT: 0, WORKHORSE: 0, TITAN: 6 }, cloud: { provider: 'ATLAS', compute: 0 } }).draft;
  const marked = renderToStaticMarkup(
    <StageNetwork data={six} draft={titansFew} patch={() => undefined} totals={buildTotals(six, titansFew)} plan={moneyPlan(six, titansFew)} services={serviceForecast(six, titansFew)} handlers={{}} managed={false} teamProposal={null} setTeamProposal={() => undefined} />,
  );
  assert.match(marked, /class="bw-atlas-pin-dot is-titan"/, 'A place holding Titans wears the Titan mark.');
  assert.match(marked, /class="bw-net-duty is-scout"|class="bw-net-duty is-on is-scout"/, 'And the counters carry the tier they are.');
}


/* --- 15. the ground, and the taps that reach it (#117) ----------------------- */
{
  const naSix4 = sixRegions.find(region => region.name === 'North America')!;
  const partly = placeRegion(six, createLabDraft(), naSix4.id, workhorses(8)).draft;
  const whole = placeRegion(six, createLabDraft(), naSix4.id, workhorses(16)).draft;
  const shareOf = (draft: BuildDraft) => serviceForecast(six, draft).find(service => service.code === 'US')!.coveredShare;
  assert.ok(shareOf(partly) < 0.995 && shareOf(whole) >= 0.995, `Eight Workhorses fall short of every American, sixteen do not (${shareOf(partly)}, ${shareOf(whole)}).`);
  const draw = (draft: BuildDraft) => renderToStaticMarkup(
    <StageNetwork data={six} draft={draft} patch={() => undefined} totals={buildTotals(six, draft)} plan={moneyPlan(six, draft)} services={serviceForecast(six, draft)} handlers={{}} managed={false} teamProposal={null} setTeamProposal={() => undefined} />,
  );
  /* The ground goes green only at the end. Short of that the market keeps its
     red and the fields over it say how far along you are — the gradual tint
     of #108 stays rejected. */
  assert.match(draw(partly), /class="bw-atlas-market" data-code="US"/, 'Short of everyone, the market is still red.');
  assert.match(draw(whole), /class="bw-atlas-market is-served" data-code="US"/, 'Every person served, and the country itself is green.');
  assert.doesNotMatch(draw(whole), /is-served" data-code="BR"/, 'A market with nothing in it stays red.');
  /* And a pin nobody can act on does not swallow the tap meant for the region
     under it: the board passes no city handler, so the pins are inert. */
  assert.match(draw(whole), /class="bw-atlas-pin [^"]*"[^>]*pointer-events="none"/, 'Pins are inert when there is nothing to select.');
}


console.log(`Region placer audit passed — ${regions.length} regions; Asia: ${asiaRooms.length} rooms from 16 servers and 8 compute, India served from inside; North America sells ${ceiling} cloud before the step-up; ${serverCeilingOf(data, na)} positions to rent there.`);
