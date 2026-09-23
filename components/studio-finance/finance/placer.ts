/* ============================================================================
   THE PLACER — a region's setup, turned into rooms in cities, and back.

   The player decides by region: how many Scouts, Workhorses and Titans, and
   how much cloud from which provider. The game runs on rooms in cities — the
   save, the weekly loop, incidents, the reliability bonus for spreading out,
   the status page all read them — so somebody has to put the servers
   somewhere. That used to be the player, one city and one building at a time
   (#76–#100). It is this file now, and it places them the way engineering
   would: where the audience is, inside the countries that insist on it, in
   the smallest building that can run them.

   Two directions. `placeRegion` writes rooms from a setup; `setupOf` reads a
   setup off the rooms, so a saved network reopens as the settings it was.
   Rooms that are already built are never touched; the placer places the
   difference around them.
   ========================================================================== */

import type {
  BuildData, BuildDraft, BuildMarket, City, CloudProviderId, Country, CountryService, Facility,
  FacilityListing, ServerTier, TierPlan,
} from './build';
import {
  CLOUD_PROVIDERS, OPEN_TIERS, cloudCap, cloudProviderServes, computeRacks, facilityCapitalCost,
  planComputePerRack, planReachFactor,
  countryServiceCoverageValid, facilityWeeklyRent, fillRoom, fitsPlan, groupsFor, listingFor, planRacks, rackSpend, serviceForecast, takeListing,
  tiersOf,
} from './build';
import { audiencePlaces } from '../../../services/worldPopulationClusters';
import { baseReachKm, distanceKm, servedBand, siteFactor } from '../../../services/streamingNetworkReach';
import { hasDataResidencyRule } from '../../../services/streamingServerSites';
import { getPlaceByListingId } from '../../../services/streamingSitePlaces';
import { expectedStandard, fibreMultiplier } from '../../../services/streamingFibreLadder';

/* --- what a region is, to this file ------------------------------------------ */

export interface RegionSetup {
  servers: Record<ServerTier, number>;
  cloud: { provider: CloudProviderId; compute: number };
}

export const emptySetup = (): RegionSetup => ({
  servers: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 },
  cloud: { provider: 'ATLAS', compute: 0 },
});

export interface RegionView {
  id: string;
  name: string;
  line: string;
  countries: Country[];
  /** The countries in it being opened in — the ones this region answers for. */
  opening: Country[];
  markets: BuildMarket[];
  /** Every server city in the region. */
  cities: City[];
}

const code = (value: string): string => String(value || '').trim().toUpperCase();

export function regionsOf(data: BuildData): RegionView[] {
  /* Audit fixtures hand this partial worlds; a missing list is an empty one. */
  return (data.regions ?? []).map(region => {
    const countries = (data.countries ?? []).filter(country => country.regionId === region.id);
    const opening = countries.filter(country => country.opening);
    const openingCodes = new Set(opening.map(country => code(country.code)));
    const countryIds = new Set(countries.map(country => country.id));
    return {
      ...region,
      countries,
      opening,
      markets: (data.markets ?? []).filter(market => openingCodes.has(code(market.code))),
      cities: (data.cities ?? []).filter(city => countryIds.has(city.countryId)),
    };
  });
}

/** The regions the network has to answer for. */
export const openingRegions = (data: BuildData): RegionView[] => regionsOf(data).filter(region => region.opening.length > 0);

export function regionOfCity(data: BuildData, cityId: string): string | undefined {
  const city = data.cities.find(candidate => candidate.id === cityId);
  const country = city ? data.countries.find(candidate => candidate.id === city.countryId) : undefined;
  return country?.regionId;
}

export const facilitiesIn = (data: BuildData, draft: BuildDraft, regionId: string): Facility[] => (
  draft.facilities.filter(facility => regionOfCity(data, facility.cityId) === regionId)
);

/* --- reading a setup off the rooms ------------------------------------------ */

const setupOfRooms = (rooms: readonly Facility[]): RegionSetup => {
  const setup = emptySetup();
  let provider: CloudProviderId | undefined;
  for (const room of rooms) {
    if (room.tenure === 'CLOUD') {
      setup.cloud.compute += computeRacks(room);
      provider ??= room.provider ?? 'ATLAS';
    } else {
      const held = tiersOf(room);
      OPEN_TIERS.forEach(tier => { setup.servers[tier] += held[tier]; });
    }
  }
  setup.cloud.provider = provider ?? 'ATLAS';
  return setup;
};

export const setupOf = (data: BuildData, draft: BuildDraft, regionId: string): RegionSetup => (
  setupOfRooms(facilitiesIn(data, draft, regionId))
);

/* --- where the audience is --------------------------------------------------- */

const isCloudListing = (listing: FacilityListing): boolean => (
  listing.facilityType === 'CLOUD_ALLOCATION' || (listing.tenures?.includes('CLOUD') ?? false)
);
const isRentable = (listing: FacilityListing): boolean => (
  !isCloudListing(listing) && listing.availability !== 'RESEARCH' && (listing.tenures ?? ['RENTED']).includes('RENTED')
);
const buildingsIn = (data: BuildData, cityId: string): FacilityListing[] => (
  data.listings
    .filter(listing => listing.cityId === cityId && isRentable(listing))
    .sort((a, b) => a.rackPositions - b.rackPositions || a.moveIn - b.moveIn)
);
const cloudIn = (data: BuildData, cityId: string): FacilityListing | undefined => (
  data.listings.find(listing => listing.cityId === cityId && isCloudListing(listing) && listing.availability !== 'RESEARCH')
);

/** Where each site's audience is: the places it is the nearest site to,
    with how far each one is and how much of the region's night it holds. A
    country that must be served from inside its borders only counts toward
    its own sites; if it has none, its audience counts toward nobody here,
    and `regionReport` says so. */
interface Assigned { weight: number; places: Array<{ km: number; weight: number }> }

function assignAudience(region: RegionView, sites: readonly City[]): Map<string, Assigned> {
  const assigned = new Map<string, Assigned>(sites.map(site => [site.id, { weight: 0, places: [] }]));
  for (const market of region.markets) {
    const country = code(market.code);
    const eligible = hasDataResidencyRule(country) ? sites.filter(site => code(site.code) === country) : sites;
    if (eligible.length === 0) continue;
    for (const place of audiencePlaces(country, market.coord)) {
      let best = eligible[0];
      let bestKm = Number.POSITIVE_INFINITY;
      for (const site of eligible) {
        const km = distanceKm(site.coord.lat, site.coord.lng, place.lat, place.lng);
        if (km < bestKm) { bestKm = km; best = site; }
      }
      const entry = assigned.get(best.id)!;
      entry.weight += market.demand * place.share;
      entry.places.push({ km: bestKm, weight: market.demand * place.share });
    }
  }
  return assigned;
}

/** How much of the region's night each site is the nearest to. */
const weightsOf = (assigned: Map<string, Assigned>): Map<string, number> => (
  new Map([...assigned.entries()].map(([id, entry]) => [id, entry.weight]))
);

/** The opening markets that insist on rooms inside their borders and have
    nowhere in the region to rent one — audience nothing here can serve. */
export function unservableIn(data: BuildData, region: RegionView): BuildMarket[] {
  return region.markets.filter(market => (
    hasDataResidencyRule(market.code)
    && !region.cities.some(city => code(city.code) === code(market.code)
      && (buildingsIn(data, city.id).length > 0 || cloudIn(data, city.id)))
  ));
}

/** The sites servers may land in: cities with a building to rent, in the
    countries being opened in — or anywhere in the region if none of those
    has one. Heaviest first. */
/** The sites servers may land in: every city in the region with a building
    to rent. The audience being opened decides where the first rooms go — a
    site nobody opened near gets no cluster and so no room while there is
    audience left to cover — and past that, more compute spreads across the
    whole region (#110), so the map fills the region rather than piling up
    in one country. Heaviest first. */
function serverSites(data: BuildData, region: RegionView): City[] {
  return region.cities.filter(city => buildingsIn(data, city.id).length > 0);
}

function cloudSites(data: BuildData, region: RegionView): City[] {
  return region.cities.filter(city => cloudIn(data, city.id));
}

/* --- dividing a count by weight ---------------------------------------------- */

/** Largest remainder over the positive weights, `minimum` each to start
    with while it lasts. Used to split a city's racks by tier and to share
    what `allot` has no more use for. */
function divide(total: number, weights: Map<string, number>, minimum: number): Map<string, number> {
  const entries = [...weights.entries()].filter(([, weight]) => weight > 0).sort((a, b) => b[1] - a[1]);
  if (total <= 0 || entries.length === 0) return new Map();
  const counts = entries.map(([id, weight]) => ({ id, weight, n: 0, frac: 0 }));
  let left = total;
  for (const count of counts) {
    if (left < minimum) break;
    count.n = minimum;
    left -= minimum;
  }
  if (counts[0].n === 0) { counts[0].n = left; left = 0; }
  const seeded = counts.filter(count => count.n > 0);
  const sum = seeded.reduce((acc, count) => acc + count.weight, 0);
  if (left > 0 && sum > 0) {
    let given = 0;
    for (const count of seeded) {
      const exact = left * count.weight / sum;
      count.frac = exact - Math.floor(exact);
      count.n += Math.floor(exact);
      given += Math.floor(exact);
    }
    for (const count of [...seeded].sort((a, b) => b.frac - a.frac || b.weight - a.weight)) {
      if (given >= left) break;
      count.n += 1;
      given += 1;
    }
  }
  return new Map(counts.filter(count => count.n > 0).map(count => [count.id, count.n]));
}

const MINIMUM_ROOM = 2;

/** Inside this the place is the site's own city. */
const LOCAL_KM = 120;

/** What a room at a site covers at each size: the audience among the places
    it is nearest to that sit inside the served radius the room would throw
    with that much compute in it — the reach model's own curve, run without
    a forecast. */
/** How far a room in this city serves a stream to the standard, at each
    size: the reach model's own curve, run without a forecast. The green a
    field paints is drawn at exactly this radius, so "lit" on the map and
    "lit" in the placer are one number (#111). */
function greenKmOf(
  data: BuildData,
  city: City,
  listing: FacilityListing | undefined,
  reachFactor: number,
  /** Compute a rack of what is being bought carries: 1.8 for Titans, 0.6 for
      Scouts, so the placer's circles are the size the tiers will actually
      throw (#114). */
  computePerRack = 1,
): (racks: number) => number {
  const source = { cityId: city.id, lat: 0, lng: 0, racks: 1, capacity: 1, spread: 1, transit: listing ? getPlaceByListingId(listing.id)?.transit : undefined };
  const ground = siteFactor(source) * fibreMultiplier(data.fibre) * reachFactor * servedBand(expectedStandard(data.platformWeeks ?? 0));
  return (racks: number) => (racks <= 0 || ground <= 0 ? 0 : baseReachKm({ ...source, racks: racks * computePerRack }) * ground);
}

function coverageOf(data: BuildData, city: City, listing: FacilityListing | undefined, reachFactor: number, assigned: Assigned | undefined, computePerRack = 1): (compute: number) => number {
  const places = assigned?.places ?? [];
  const green = greenKmOf(data, city, listing, reachFactor, computePerRack);
  return (compute: number) => {
    const radius = green(compute);
    if (radius <= 0) return 0;
    return places.reduce((sum, place) => (place.km <= Math.max(LOCAL_KM, radius) ? sum + place.weight : sum), 0);
  };
}

/** Racks (or compute) across a region's sites, in the order a network is
    actually built (#111).

      1 THE AUDIENCE   greedy by people per rack: the first rooms go where the
                       people you are opening to are, and nowhere else.
      2 THE HOME       every city of the countries you opened, lit — a city is
                       lit when it sits inside some room's green. America is
                       finished before anything crosses into Canada, which is
                       what "my entry market is America" has to mean.
      3 THE REST       then the rest of the region, the same way, so serving
                       from outside your markets is allowed once your markets
                       are done.
      4 EVERY CITY     then a room in each city still without one, farthest
                       from the network first.
      5 THICKER        then more in every room, weighted toward the audience
                       but never starving a city that has none — which is why
                       Canada kept fourteen compute while the United States
                       climbed to a hundred and forty-four before this.

    At the extreme every city in the region is a room and every field has
    grown into its neighbours, which is the picture the player is promised
    when they buy everything. */
function allot(
  total: number,
  sites: readonly City[],
  weights: Map<string, number>,
  minimum: number,
  capOf: (cityId: string) => number,
  coverage: (cityId: string) => (compute: number) => number,
  greenKm: (cityId: string) => (compute: number) => number,
  /** 0 for a city in a country being opened, 1 for the rest of the region. */
  priorityOf: (cityId: string) => number,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (total <= 0 || sites.length === 0) return counts;
  let left = total;
  const km = (a: City, b: City) => distanceKm(a.coord.lat, a.coord.lng, b.coord.lat, b.coord.lng);

  /* --- 1 · the audience ---------------------------------------------------- */
  for (let guard = 0; left > 0 && guard < 400; guard += 1) {
    let best: { cityId: string; to: number; gain: number; ratio: number } | null = null;
    for (const site of sites) {
      const have = counts.get(site.id) ?? 0;
      const cap = capOf(site.id);
      const cover = coverage(site.id);
      const base = cover(have);
      const from = have === 0 ? minimum : have + 1;
      for (let to = from; to <= Math.min(cap, have + left); to += 1) {
        const gain = cover(to) - base;
        if (gain <= 0) continue;
        const ratio = gain / (to - have);
        if (!best || ratio > best.ratio + 1e-9 || (Math.abs(ratio - best.ratio) <= 1e-9 && gain > best.gain)) {
          best = { cityId: site.id, to, gain, ratio };
        }
      }
    }
    if (!best) break;
    left -= best.to - (counts.get(best.cityId) ?? 0);
    counts.set(best.cityId, best.to);
  }

  /* --- 2 and 3 · light the home, then the rest ------------------------------ */
  const lit = (cityId: string): boolean => {
    const here = sites.find(site => site.id === cityId)!;
    for (const [id, compute] of counts) {
      const room = sites.find(site => site.id === id)!;
      if (km(room, here) <= Math.max(LOCAL_KM, greenKm(id)(compute))) return true;
    }
    return false;
  };
  for (const tier of [0, 1]) {
    const mine = sites.filter(site => priorityOf(site.id) === tier);
    for (let guard = 0; left >= minimum && guard < 200; guard += 1) {
      const dark = mine.filter(site => !lit(site.id));
      if (dark.length === 0) break;
      /* Either open a city of this tier, or grow a room until its green
         reaches one — whichever lights more of this tier per rack. */
      let best: { cityId: string; to: number; ratio: number } | null = null;
      const consider = (cityId: string, to: number) => {
        const have = counts.get(cityId) ?? 0;
        const spend = to - have;
        if (spend <= 0 || spend > left || to > capOf(cityId)) return;
        const here = sites.find(site => site.id === cityId)!;
        const radius = Math.max(LOCAL_KM, greenKm(cityId)(to));
        const gain = dark.filter(site => km(here, site) <= radius).length + (have === 0 && priorityOf(cityId) === tier ? 1 : 0);
        if (gain <= 0) return;
        const ratio = gain / spend;
        if (!best || ratio > best.ratio + 1e-9) best = { cityId, to, ratio };
      };
      for (const site of dark) consider(site.id, minimum);
      for (const [id, have] of counts) {
        for (const step of [1, 2, 4, 8]) consider(id, have + step);
      }
      if (!best) break;
      const chosen = best as { cityId: string; to: number; ratio: number };
      left -= chosen.to - (counts.get(chosen.cityId) ?? 0);
      counts.set(chosen.cityId, chosen.to);
    }
  }

  /* --- 4 · a room in every city, farthest from the network first ------------ */
  if (counts.size === 0) {
    const heaviest = [...sites].sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0))[0];
    counts.set(heaviest.id, left);
    return counts;
  }
  while (left >= minimum) {
    const standing = [...counts.keys()].map(id => sites.find(site => site.id === id)!);
    const open = sites.filter(site => !counts.has(site.id) && capOf(site.id) >= minimum);
    if (open.length === 0) break;
    const farthest = open
      .map(site => ({ site, far: Math.min(...standing.map(room => km(site, room))) }))
      .sort((a, b) => b.far - a.far || (weights.get(b.site.id) ?? 0) - (weights.get(a.site.id) ?? 0))[0];
    counts.set(farthest.site.id, minimum);
    left -= minimum;
    /* One rack into the thinnest room standing for each new city opened, so
       breadth and strength grow together (#112). Spending every rack on new
       cities left a network of forty rooms all at the minimum: wide, and
       drawn faint everywhere, so the map never got stronger as it got
       bigger — which is the first thing a player expects from buying more. */
    if (left > 0) {
      const thinnest = [...counts.entries()]
        .filter(([id]) => (counts.get(id) ?? 0) < capOf(id))
        .sort((a, b) => a[1] - b[1] || (weights.get(b[0]) ?? 0) - (weights.get(a[0]) ?? 0))[0];
      if (thinnest) { counts.set(thinnest[0], thinnest[1] + 1); left -= 1; }
    }
  }

  /* --- 5 · thicker everywhere ---------------------------------------------- */
  if (left > 0) {
    const seeded = [...counts.keys()];
    const positive = seeded.map(id => weights.get(id) ?? 0).filter(weight => weight > 0);
    /* A city with no audience of its own still grows, at a fifth of the mean
       — the network thickens everywhere once the markets are served. */
    const floor = positive.length > 0 ? (positive.reduce((sum, weight) => sum + weight, 0) / positive.length) * 0.2 : 1;
    const more = divide(left, new Map(seeded.map(id => [id, Math.max(floor, weights.get(id) ?? 0)])), 1);
    for (const [id, n] of more) counts.set(id, (counts.get(id) ?? 0) + n);
  }
  return counts;
}

/* --- packing servers into a city's buildings --------------------------------- */

const subtract = (plan: TierPlan, part: TierPlan): TierPlan => ({
  SCOUT: Math.max(0, (plan.SCOUT ?? 0) - (part.SCOUT ?? 0)),
  WORKHORSE: Math.max(0, (plan.WORKHORSE ?? 0) - (part.WORKHORSE ?? 0)),
  TITAN: Math.max(0, (plan.TITAN ?? 0) - (part.TITAN ?? 0)),
});

/** The most of this plan one building can run: Titans first, because they
    are the ones that need the big room, then trimmed until the building can
    power and cool what is left. */
function largestPart(listing: FacilityListing, plan: TierPlan): TierPlan {
  const part: Record<ServerTier, number> = { SCOUT: 0, WORKHORSE: 0, TITAN: 0 };
  let room = listing.rackPositions;
  for (const tier of ['TITAN', 'WORKHORSE', 'SCOUT'] as ServerTier[]) {
    const take = Math.min(room, plan[tier] ?? 0);
    part[tier] = take;
    room -= take;
  }
  while (planRacks(part) > 0 && !fitsPlan(listing, part)) {
    if (part.TITAN > 0) part.TITAN -= 1;
    else if (part.WORKHORSE > 0) part.WORKHORSE -= 1;
    else part.SCOUT -= 1;
  }
  return part;
}

/** Rooms for this plan in this city: the smallest single building that runs
    it, or the largest filled as far as it goes and the rest carried on. Repeat
    leases of the same building are allowed, as the marketplace allows them. */
function packCity(data: BuildData, city: City, plan: TierPlan, idFor: (listing: FacilityListing) => string): { rooms: Facility[]; left: TierPlan } {
  const buildings = buildingsIn(data, city.id);
  const rooms: Facility[] = [];
  let left: TierPlan = { ...plan };
  for (let guard = 0; planRacks(left) > 0 && guard < 8; guard += 1) {
    const whole = buildings.find(listing => fitsPlan(listing, left));
    if (whole) {
      rooms.push(fillRoom(whole, takeListing(whole, 'RENTED', idFor(whole)), left));
      left = {};
      break;
    }
    const largest = buildings[buildings.length - 1];
    if (!largest) break;
    const part = largestPart(largest, left);
    if (planRacks(part) === 0) break;
    rooms.push(fillRoom(largest, takeListing(largest, 'RENTED', idFor(largest)), part));
    left = subtract(left, part);
  }
  return { rooms, left };
}

/* --- placing ------------------------------------------------------------------ */

export interface Placement {
  draft: BuildDraft;
  /** Servers the region's buildings could not take, by tier. */
  unplaced: Record<ServerTier, number>;
  /** Cloud compute nobody here would sell. */
  unplacedCompute: number;
  /** Why, in one line, when something was not placed. */
  note?: string;
}

/** The region redrawn to this setup. Built rooms stay as they are and count
    toward the setup; everything unbuilt in the region is replaced. */
export function placeRegion(data: BuildData, draft: BuildDraft, regionId: string, setup: RegionSetup): Placement {
  const region = regionsOf(data).find(candidate => candidate.id === regionId);
  const unplaced: Record<ServerTier, number> = { SCOUT: 0, WORKHORSE: 0, TITAN: 0 };
  if (!region) return { draft, unplaced, unplacedCompute: 0, note: 'No such region.' };

  const inRegion = facilitiesIn(data, draft, regionId);
  const built = inRegion.filter(facility => facility.built);
  const standing = setupOfRooms(built);
  const others = draft.facilities.filter(facility => regionOfCity(data, facility.cityId) !== regionId || facility.built);
  const notes: string[] = [];
  const placed: Facility[] = [];
  let sequence = 0;
  const idFor = (listing: FacilityListing) => `pl-${regionId}-${listing.id}-${(sequence += 1)}`;

  /* --- servers --------------------------------------------------------------- */
  const want: Record<ServerTier, number> = {
    SCOUT: Math.max(0, setup.servers.SCOUT - standing.servers.SCOUT),
    WORKHORSE: Math.max(0, setup.servers.WORKHORSE - standing.servers.WORKHORSE),
    TITAN: Math.max(0, setup.servers.TITAN - standing.servers.TITAN),
  };
  const total = planRacks(want);
  if (total > 0) {
    const sites = serverSites(data, region);
    const assigned = assignAudience(region, sites);
    const weights = weightsOf(assigned);
    /* No opening market reaches any site with weight — a region with rooms but
       whose markets all insist on a country that has none — so spread by
       nothing but the sites' order. */
    const anyWeight = [...weights.values()].some(weight => weight > 0);
    /* The circles the placer reasons with are the size the servers being
       bought will throw: a region of Titans spreads over a few far-apart
       rooms, a region of Scouts needs one in every city (#114). */
    const mixReach = planReachFactor(want);
    const mixCompute = planComputePerRack(want);
    const coverage = new Map(sites.map(site => [site.id, coverageOf(data, site, buildingsIn(data, site.id)[0], mixReach, assigned.get(site.id), mixCompute)]));
    const green = new Map(sites.map(site => [site.id, greenKmOf(data, site, buildingsIn(data, site.id)[0], mixReach, mixCompute)]));
    const positions = (cityId: string) => Math.min(64, buildingsIn(data, cityId).reduce((sum, listing) => sum + listing.rackPositions, 0));
    const openingIds = new Set(region.opening.map(country => country.id));
    const homeOf = (cityId: string) => (openingIds.has(sites.find(site => site.id === cityId)!.countryId) ? 0 : 1);
    const counts = allot(total, sites, anyWeight ? weights : new Map(sites.map(site => [site.id, 1])), MINIMUM_ROOM, positions, cityId => coverage.get(cityId)!, cityId => green.get(cityId)!, homeOf);
    /* Each city's racks by tier, in the region's proportions: the tiers are
       laid out as one interleaved run — a Workhorse, a Workhorse, a Titan, a
       Scout … in the region's mix — and dealt to the cities in order, so a
       city with two racks gets two and a region that is mostly Workhorses
       stays mostly Workhorses everywhere. Splitting tier by tier (#103–#108)
       gave the Scouts and the Titans to the heaviest cities on top of their
       Workhorses and left the lightest cities with one rack (#109). */
    const run: ServerTier[] = [];
    const dealt: Record<ServerTier, number> = { SCOUT: 0, WORKHORSE: 0, TITAN: 0 };
    for (let i = 1; i <= total; i += 1) {
      let next: ServerTier = 'WORKHORSE';
      let most = Number.NEGATIVE_INFINITY;
      for (const tier of ['TITAN', 'WORKHORSE', 'SCOUT'] as ServerTier[]) {
        const due = (want[tier] / total) * i - dealt[tier];
        if (due > most + 1e-9) { most = due; next = tier; }
      }
      run.push(next);
      dealt[next] += 1;
    }
    const order = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || (weights.get(b[0]) ?? 0) - (weights.get(a[0]) ?? 0))
      .map(([cityId]) => cityId);
    const perSite = new Map<string, Record<ServerTier, number>>();
    let cursor = 0;
    for (const cityId of order) {
      const n = counts.get(cityId) ?? 0;
      const plan: Record<ServerTier, number> = { SCOUT: 0, WORKHORSE: 0, TITAN: 0 };
      for (let k = 0; k < n; k += 1) plan[run[cursor + k]] += 1;
      cursor += n;
      perSite.set(cityId, plan);
    }
    let spill: TierPlan = {};
    for (const cityId of order) {
      const city = sites.find(candidate => candidate.id === cityId)!;
      const plan = perSite.get(cityId) ?? { SCOUT: 0, WORKHORSE: 0, TITAN: 0 };
      const packed = packCity(data, city, { ...plan, SCOUT: (plan.SCOUT ?? 0) + (spill.SCOUT ?? 0), WORKHORSE: (plan.WORKHORSE ?? 0) + (spill.WORKHORSE ?? 0), TITAN: (plan.TITAN ?? 0) + (spill.TITAN ?? 0) }, idFor);
      placed.push(...packed.rooms);
      spill = packed.left;
    }
    /* What no city could take, tried once more across every site in weight
       order, then given up on and said. */
    if (planRacks(spill) > 0) {
      for (const city of sites) {
        if (planRacks(spill) === 0) break;
        const packed = packCity(data, city, spill, idFor);
        placed.push(...packed.rooms);
        spill = packed.left;
      }
    }
    unplaced.SCOUT = spill.SCOUT ?? 0;
    unplaced.WORKHORSE = spill.WORKHORSE ?? 0;
    unplaced.TITAN = spill.TITAN ?? 0;
    if (planRacks(spill) > 0) {
      notes.push(unplaced.TITAN > 0 && unplaced.SCOUT + unplaced.WORKHORSE === 0
        ? `No building in ${region.name} can cool ${unplaced.TITAN} more Titan${unplaced.TITAN === 1 ? '' : 's'}.`
        : `${region.name}'s buildings are full: ${planRacks(spill)} server${planRacks(spill) === 1 ? '' : 's'} have nowhere to stand.`);
    }
    if (sites.length === 0) notes.push(`No building to rent in ${region.name}.`);
  }

  /* --- cloud ------------------------------------------------------------------ */
  const provider = CLOUD_PROVIDERS[setup.cloud.provider];
  const wantCompute = Math.max(0, setup.cloud.compute - standing.cloud.compute);
  let unplacedCompute = 0;
  if (wantCompute > 0) {
    if (!cloudProviderServes(provider, regionId)) {
      unplacedCompute = wantCompute;
      notes.push(`${provider.name} does not sell in ${region.name}.`);
    } else {
      const sites = cloudSites(data, region);
      const audience = assignAudience(region, sites);
      const weights = weightsOf(audience);
      const anyWeight = [...weights.values()].some(weight => weight > 0);
      const caps = new Map(sites.map(site => [site.id, Math.max(1, Math.round(cloudCap(cloudIn(data, site.id)!) * provider.ceiling))]));
      /* A plan sized to do its job in each city, like a room: Sydney's plan
         is three compute because Brisbane is 730 km away, Melbourne's is one. */
      const coverage = new Map(sites.map(site => [site.id, coverageOf(data, site, cloudIn(data, site.id), provider.reach, audience.get(site.id))]));
      const green = new Map(sites.map(site => [site.id, greenKmOf(data, site, cloudIn(data, site.id), provider.reach)]));
      const openingIds = new Set(region.opening.map(country => country.id));
      const homeOf = (cityId: string) => (openingIds.has(sites.find(site => site.id === cityId)!.countryId) ? 0 : 1);
      const assigned = new Map<string, number>(sites.map(site => [site.id, 0]));
      let left = wantCompute;
      /* Water-fill: by weight, capped per city, the overflow passed on to the
         cities with room, until none has — then the rest goes to the heaviest
         city above its ceiling, at the step-up rate. */
      for (let pass = 0; left > 0 && pass < 6; pass += 1) {
        const open = sites.filter(site => (assigned.get(site.id) ?? 0) < (caps.get(site.id) ?? 0));
        if (open.length === 0) break;
        const openWeights = anyWeight
          ? new Map(open.map(site => [site.id, Math.max(1e-6, weights.get(site.id) ?? 0)]))
          : new Map(open.map(site => [site.id, 1]));
        const share = pass === 0
          ? allot(left, open, openWeights, 1, cityId => (caps.get(cityId) ?? 0) - (assigned.get(cityId) ?? 0), cityId => coverage.get(cityId)!, cityId => green.get(cityId)!, homeOf)
          : divide(left, openWeights, 1);
        let moved = 0;
        for (const [cityId, n] of share) {
          const room = (caps.get(cityId) ?? 0) - (assigned.get(cityId) ?? 0);
          const take = Math.min(n, room);
          assigned.set(cityId, (assigned.get(cityId) ?? 0) + take);
          left -= take;
          moved += take;
        }
        if (moved === 0) break;
      }
      let extended = 0;
      if (left > 0 && sites.length > 0) {
        const heaviest = [...sites].sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0))[0];
        assigned.set(heaviest.id, (assigned.get(heaviest.id) ?? 0) + left);
        extended = left;
        left = 0;
        notes.push(`${extended} compute above ${provider.name}'s ceiling in ${region.name}, at the step-up rate.`);
      }
      unplacedCompute = left;
      if (sites.length === 0) notes.push(`No cloud region in ${region.name}.`);
      const heaviestId = [...sites].sort((a, b) => (weights.get(b.id) ?? 0) - (weights.get(a.id) ?? 0))[0]?.id;
      for (const site of sites) {
        const compute = assigned.get(site.id) ?? 0;
        if (compute <= 0) continue;
        const listing = cloudIn(data, site.id)!;
        const room: Facility = {
          ...fillRoom(listing, takeListing(listing, 'CLOUD', idFor(listing)), { WORKHORSE: compute }),
          provider: provider.id,
          cloudExtended: site.id === heaviestId ? extended : 0,
        };
        placed.push(room);
      }
    }
  }

  return {
    draft: { ...draft, facilities: [...others, ...placed], rehearsal: null },
    unplaced,
    unplacedCompute,
    note: notes[0],
  };
}

/* --- reading a region for the board ------------------------------------------ */

export type RegionWord = 'Dark' | 'Thin' | 'Fair' | 'Strong' | 'Unavailable';

export interface RegionReport {
  region: RegionView;
  setup: RegionSetup;
  /** People on the night across the region's opening markets. */
  peak: number;
  served: number;
  reached: number;
  /** The part of `served` whose nearest good room is rented. */
  cloudServed: number;
  once: number;
  weekly: number;
  /** The latest a room here is ready; 0 with nothing here. */
  readyWeeks: number;
  word: RegionWord | '—';
  coverageAvailable: boolean;
  tone: 'flat' | 'good' | 'warn' | 'bad';
  /** The rooms, by the city they landed in, heaviest city first. */
  landed: Array<{ city: City; rooms: Facility[] }>;
  /** Every country this region answers for, graded on its own (#119). A
      region at 86% never said which of its three countries was the short
      one; now it does. */
  countries: Array<{ id: string; name: string; code: string; peak: number; served: number; share: number; state: CountryService['state']; coverageAvailable: boolean }>;
  /** Opening markets nothing here can serve: they insist on rooms inside
      their borders and have nowhere in the region to rent one. Their part of
      the night is in `peak` and can never be in `served`. */
  unservable: { markets: BuildMarket[]; peak: number };
}

export function regionReport(data: BuildData, draft: BuildDraft, services: readonly CountryService[], region: RegionView): RegionReport {
  const rooms = facilitiesIn(data, draft, region.id);
  const marketIds = new Set(region.markets.map(market => market.id));
  const here = services.filter(service => marketIds.has(service.marketId));
  const coverageAvailable = here.length === region.markets.length && here.every(countryServiceCoverageValid);
  const peak = here.reduce((sum, service) => sum + (Number.isFinite(service.peak) ? Math.max(0, service.peak) : 0), 0);
  const served = here.reduce((sum, service) => sum + (countryServiceCoverageValid(service) ? service.coveredPeak : 0), 0);
  const reached = here.reduce((sum, service) => sum + (countryServiceCoverageValid(service) ? service.peak * service.reachedShare : 0), 0);
  const cloudServed = here.reduce((sum, service) => sum + (countryServiceCoverageValid(service) ? service.peak * (service.cloudServedShare ?? 0) : 0), 0);
  const once = rooms.reduce((sum, room) => sum + facilityCapitalCost(data, room), 0) + rackSpend({ facilities: rooms } as BuildDraft);
  const weekly = rooms.reduce((sum, room) => sum + facilityWeeklyRent(data, room) + room.opCost, 0);
  const readyWeeks = rooms.reduce((longest, room) => Math.max(longest, listingFor(data, room)?.provisioningWeeks ?? 0), 0);
  const unservableMarkets = unservableIn(data, region);
  const unservableIds = new Set(unservableMarkets.map(market => market.id));
  const unservable = {
    markets: unservableMarkets,
    peak: here.filter(service => unservableIds.has(service.marketId)).reduce((sum, service) => sum + (Number.isFinite(service.peak) ? Math.max(0, service.peak) : 0), 0),
  };
  const share = peak > 0 ? served / peak : 0;
  const word: RegionReport['word'] = !coverageAvailable ? 'Unavailable'
    : peak === 0 ? '—' : share <= 0 ? 'Dark' : share < 0.6 ? 'Thin' : share < 0.9 ? 'Fair' : 'Strong';
  const tone: RegionReport['tone'] = word === '—' ? 'flat' : word === 'Dark' || word === 'Unavailable' ? 'bad' : word === 'Strong' ? 'good' : 'warn';
  const byCity = new Map<string, Facility[]>();
  rooms.forEach(room => byCity.set(room.cityId, [...(byCity.get(room.cityId) ?? []), room]));
  const landed = [...byCity.entries()]
    .flatMap(([cityId, list]) => {
      const city = data.cities.find(candidate => candidate.id === cityId);
      return city ? [{ city, rooms: list }] : [];
    })
    .sort((a, b) => b.rooms.reduce((s, r) => s + computeRacks(r), 0) - a.rooms.reduce((s, r) => s + computeRacks(r), 0));
  const countries = here
    .map(service => ({
      id: service.marketId,
      name: service.name,
      code: service.code,
      peak: Number.isFinite(service.peak) ? Math.max(0, service.peak) : 0,
      served: countryServiceCoverageValid(service) ? service.coveredPeak : 0,
      share: countryServiceCoverageValid(service) && service.peak > 0 ? service.coveredPeak / service.peak : 0,
      state: service.state,
      coverageAvailable: countryServiceCoverageValid(service),
    }))
    .sort((a, b) => b.peak - a.peak);
  return { region, setup: setupOfRooms(rooms), peak, served, reached, cloudServed, once, weekly, readyWeeks, word, tone,
    coverageAvailable, landed, countries, unservable };
}

/** The most compute a provider's plan can hold in a region before the
    step-up — the sum of its cities' caps at the provider's ceiling. */
export function cloudCeilingOf(data: BuildData, region: RegionView, providerId: CloudProviderId): number {
  const provider = CLOUD_PROVIDERS[providerId];
  if (!cloudProviderServes(provider, region.id)) return 0;
  return cloudSites(data, region).reduce((sum, site) => sum + Math.max(1, Math.round(cloudCap(cloudIn(data, site.id)!) * provider.ceiling)), 0);
}

/** The most servers the region's buildings can hold, if every one were taken
    and filled with Workhorses — the ladder a region's counters climb toward. */
export function serverCeilingOf(data: BuildData, region: RegionView): number {
  return serverSites(data, region).reduce((sum, city) => (
    sum + buildingsIn(data, city.id).reduce((inCity, listing) => inCity + listing.rackPositions, 0)
  ), 0);
}

/** Which tiers the placer could still find a building for — what a "+" on the
    board is allowed to do. */
export function canAddServer(data: BuildData, draft: BuildDraft, regionId: string, tier: ServerTier): boolean {
  const setup = setupOf(data, draft, regionId);
  const next = { ...setup, servers: { ...setup.servers, [tier]: setup.servers[tier] + 1 } };
  const placed = placeRegion(data, draft, regionId, next);
  return planRacks(placed.unplaced) === 0;
}

export { groupsFor };

/* --- the what-ifs ---------------------------------------------------------------
   Three questions a player asks while configuring a region, answered with a
   price before they ask: what would it cost to cover the rest with cloud;
   what if all of this were cloud instead; what if all of it were my own
   servers. Each runs the placer and the forecast forward and comes back as a
   setup you can apply with one tap. The mix is never a mode you choose — it
   is which of these you tap. */


export type WhatIfId = 'COVER' | 'ALL_CLOUD' | 'ALL_SERVERS';

export interface WhatIf {
  id: WhatIfId;
  /** The setup to apply. */
  setup: RegionSetup;
  /** The region as it would read afterwards. */
  served: number;
  peak: number;
  once: number;
  weekly: number;
  readyWeeks: number;
  /** COVER: the compute added. */
  addedCompute?: number;
  /** COVER_SERVERS once; kept for the chips' arithmetic. */
  addedServers?: number;
  /** What the change adds once and a week — negative when it saves. */
  addedOnce?: number;
  addedWeekly?: number;
  /** Whether the target was reached, or this is as far as it goes here. */
  reached?: boolean;
}

/** The served share a region is asked to reach: the Strong line. */
export const WHAT_IF_TARGET = 0.9;

const servedShare = (report: RegionReport): number => (report.peak > 0 ? report.served / report.peak : 0);

/** The region as it would read under a setup: placed, forecast, reported. */
function tryOut(data: BuildData, draft: BuildDraft, region: RegionView, setup: RegionSetup): RegionReport {
  const placed = placeRegion(data, draft, region.id, setup);
  return regionReport(data, placed.draft, serviceForecast(data, placed.draft), region);
}

/** The least of something that clears a served share, by halving — served
    share only ever grows with more compute, so the search is sound. Returns
    the top of the range with `reached: false` when even that falls short. */
function least(
  evaluate: (amount: number) => RegionReport,
  low: number,
  high: number,
  target: number,
): { amount: number; report: RegionReport; reached: boolean } {
  const top = evaluate(high);
  if (servedShare(top) < target) return { amount: high, report: top, reached: false };
  let lo = low;
  let hi = high;
  let best = top;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const report = evaluate(mid);
    if (servedShare(report) >= target) { hi = mid; best = report; } else { lo = mid + 1; }
  }
  return { amount: hi, report: best, reached: true };
}

const asWhatIf = (id: WhatIfId, setup: RegionSetup, report: RegionReport, now: RegionReport, reached: boolean): WhatIf => ({
  id,
  setup,
  served: report.served, peak: report.peak,
  once: report.once, weekly: report.weekly, readyWeeks: report.readyWeeks,
  addedOnce: report.once - now.once,
  addedWeekly: report.weekly - now.weekly,
  reached,
});

/** Cover the rest with this provider's cloud: more of the plan, until the
    region clears the Strong line — or as far as cloud sells here. Null when
    the region is Strong already, the provider does not sell here, or more
    compute would change nothing. Read by the provider chips too, so each
    chip says what that provider would take (#108). */
export function coverWithCloud(
  data: BuildData,
  draft: BuildDraft,
  region: RegionView,
  providerId: CloudProviderId,
  now: RegionReport = regionReport(data, draft, serviceForecast(data, draft), region),
): WhatIf | null {
  const provider = CLOUD_PROVIDERS[providerId];
  if (now.peak <= 0 || !cloudProviderServes(provider, region.id)) return null;
  const setup = now.setup;
  const share = servedShare(now);
  const ceiling = cloudCeilingOf(data, region, providerId);
  const cloudTop = ceiling + Math.ceil(ceiling * 0.5);
  if (share >= WHAT_IF_TARGET || cloudTop <= setup.cloud.compute) return null;
  const withCloud = (compute: number): RegionSetup => ({ servers: setup.servers, cloud: { provider: providerId, compute } });
  const found = least(compute => tryOut(data, draft, region, withCloud(compute)), setup.cloud.compute + 1, cloudTop, WHAT_IF_TARGET);
  if (servedShare(found.report) <= share + 0.005) return null;
  return { ...asWhatIf('COVER', withCloud(found.amount), found.report, now, found.reached), addedCompute: found.amount - setup.cloud.compute };
}

export function whatIfsFor(
  data: BuildData,
  draft: BuildDraft,
  region: RegionView,
  providerId: CloudProviderId,
): WhatIf[] {
  const now = regionReport(data, draft, serviceForecast(data, draft), region);
  const setup = now.setup;
  const share = servedShare(now);
  const provider = CLOUD_PROVIDERS[providerId];
  const cloudTop = cloudProviderServes(provider, region.id)
    ? (() => { const ceiling = cloudCeilingOf(data, region, providerId); return ceiling + Math.ceil(ceiling * 0.5); })()
    : 0;
  const serverTop = Math.min(serverCeilingOf(data, region), 96);
  const servers = OPEN_TIERS.reduce((sum, tier) => sum + setup.servers[tier], 0);
  const out: WhatIf[] = [];
  if (now.peak <= 0) return out;

  /* No "cover it" buttons (#109): the slider covers a region with cloud and
     the counters with servers, and the chips say what each provider would
     take. `coverWithCloud` stays for the chips. */

  /* All cloud instead: the same served share, from rented compute alone. */
  if (servers > 0 && cloudTop > 0) {
    const allCloud = (compute: number): RegionSetup => ({ servers: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloud: { provider: providerId, compute } });
    const found = least(compute => tryOut(data, draft, region, allCloud(compute)), 1, cloudTop, Math.max(0.01, share - 0.005));
    out.push(asWhatIf('ALL_CLOUD', allCloud(found.amount), found.report, now, found.reached));
  }

  /* All your own servers instead: the same served share, from Workhorses in
     the region's buildings. */
  if (setup.cloud.compute > 0 && serverTop > 0) {
    const allServers = (count: number): RegionSetup => ({
      servers: { SCOUT: setup.servers.SCOUT, WORKHORSE: setup.servers.WORKHORSE + count, TITAN: setup.servers.TITAN },
      cloud: { provider: providerId, compute: 0 },
    });
    const found = least(count => tryOut(data, draft, region, allServers(count)), 1, Math.max(1, serverTop - servers), Math.max(0.01, share - 0.005));
    out.push(asWhatIf('ALL_SERVERS', allServers(found.amount), found.report, now, found.reached));
  }

  return out;
}
