/* ============================================================================
   REACH — how far a site actually carries, and to where.

   There were two answers to this and they did not agree.

   The map drew a field whose radius was `(520 + 340·√racks) × dutySpread`,
   clipped to land. The engine graded a market READY or POOR from a different
   rule entirely: straight-line distance against hard thresholds — under 1500km
   with an edge rack, under 4000km with a regional one — and a capacity share
   pooled across the whole network. So a player could watch green territory
   close over a country and then be told the country was unserved, and both
   surfaces were telling the truth about their own arithmetic.

   This is the one answer. Three things decide it:

     RACKS      how much there is to serve with. Reach grows with the square
                root of them, so the tenth rack in a city buys less ground than
                the first — which is why a network spreads out instead of
                stacking everything in one room.

     CAPACITY   what those racks can actually carry. A field is not allowed to
                claim more audience than the site can serve: put two racks in
                Frankfurt and the field stops well short of two hundred million
                Europeans instead of drawing over all of them. This is the piece
                that was missing, and it is the difference between "add racks"
                and "add a site closer" being the same answer and being
                different ones.

     ROUTE      what is between. A thousand kilometres over land is not a
                thousand kilometres across an ocean, and a carrier hotel on a
                dozen subsea cables is not an emerging edge site. Reach is
                scaled by the site's own transit and by what the route crosses.

   Nothing here invents a figure. Racks and capacity come off the draft, transit
   and continent come off the site catalogue, and demand comes off the markets
   the player chose.
   ========================================================================== */

import type { ProductionLocationContinentId } from './productionLocations';
import { getStreamingServerSite } from './streamingServerSites';
import { WORLD_COUNTRY_DEFINITIONS } from './worldEconomy/worldCountryRegistry';
import { audiencePlaces } from './worldPopulationClusters';

/** A point the network is trying to reach. */
export interface ReachTarget {
  lat: number;
  lng: number;
  /** The market's demand figure, in the same unit the forecast holds it. Not
      concurrency — `capacityFactor` converts before it compares. */
  demand: number;
  /** ISO alpha-2, for the residency rule. */
  countryCode?: string;
}

/** One site, as the reach model needs it. */
export interface ReachSource {
  cityId: string;
  lat: number;
  lng: number;
  racks: number;
  /** Streams the racks in this site can start. */
  capacity: number;
  /** How wide this room's duty mix throws its field: a region relay spreads,
      a fast cache concentrates. 1 is neutral. */
  spread: number;
  /** The BUILDING's own transit, 0–1, when it is known.

      Reach used to read this off the city, so every room in Frankfurt threw
      exactly as far as every other one and the choice of address meant nothing.
      A carrier hotel and a shed on the ring road are not the same place. Falls
      back to the city when a caller has no building — the map hands over bare
      points. */
  transit?: number;
  /** The platform's fibre multiplier, from `streamingFibreLadder`. 1 when the
      caller has no ladder position — which keeps every existing save reading
      exactly as it did before the ladder existed. */
  fibre?: number;
  /** True while the room is a drawing rather than a built thing. */
  planned?: boolean;
}

/** The share of a market's demand figure that is actually watching at once on
    the night. The forecast has always used it to turn demand into concurrent
    streams; it is named here because this is the module where the two units
    finally have to be compared, and a capacity gate that gets this wrong is
    wrong by a factor of eleven. */
export const PEAK_CONCURRENCY_SHARE = 0.09;

const EARTH_KM = 6371;
const toRad = (value: number) => (value * Math.PI) / 180;

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* --- what the route costs --------------------------------------------------
   Sampling the great circle against the world's coastlines would be the exact
   answer and it would run on every frame of a map that is always on screen.
   Continents are the cheap approximation that gets the shape right: overland
   inside one, a sea crossing to a neighbour, and most of a planet to anything
   else. It is coarse, and it is the difference between Frankfurt reaching
   Poland well and Frankfurt reaching Nigeria badly, which is the distinction
   that matters. */

const ADJACENT: Record<string, string[]> = {
  NA: ['SA'],
  SA: ['NA'],
  EU: ['AF', 'AS'],
  AF: ['EU', 'AS'],
  AS: ['EU', 'AF', 'OC'],
  OC: ['AS'],
};

export function routeFactor(
  from: ProductionLocationContinentId | undefined,
  to: ProductionLocationContinentId | undefined,
): number {
  if (!from || !to) return 0.6;
  if (from === to) return 1;
  return ADJACENT[from]?.includes(to) ? 0.62 : 0.34;
}

/* --- how far a site carries ------------------------------------------------- */

/** Before capacity or the route are considered: what the racks alone are worth.
    The curve is the one the map has always drawn, kept so a network that looked
    a certain size still does. */
export function baseReachKm(source: ReachSource): number {
  if (source.racks <= 0) return 0;
  return (520 + 340 * Math.sqrt(source.racks)) * source.spread;
}

/** `baseReachKm` run backwards: the racks a base reach needs.

    A cloud region is sized by range — the player drags a ring and pays for
    the compute that ring costs — so the curve above has to be solvable the
    other way. It is a square root going out, so it is a square coming back:
    twice the distance costs more than four times the compute, and the 520 km
    the first rack buys for free is the reason it is MORE. Kept beside the
    forward form so the two constants can never drift apart. Fractional and
    unclamped; the caller decides whole racks and the region's cap. */
export function racksForBaseReachKm(km: number, spread = 1): number {
  const base = km / Math.max(0.001, spread);
  if (base <= 520) return 0;
  return ((base - 520) / 340) ** 2;
}

/** How much of its own reach a site can actually serve. A field that covers
    more audience than the racks can carry is a claim, not a coverage — so it is
    pulled in until the two agree. Square-rooted because audience grows with the
    area of the field, not its radius. */
export function capacityFactor(source: ReachSource, insideBase: number): number {
  if (source.capacity <= 0) return 0;
  /* `capacity` is concurrent streams and `insideBase` is demand, which is an
     order of magnitude larger. Comparing them raw made every room look eleven
     times oversubscribed and pulled its field in by a third. */
  const carried = insideBase * PEAK_CONCURRENCY_SHARE;
  if (carried <= source.capacity) return 1;
  return Math.max(0.3, Math.sqrt(source.capacity / carried));
}

/** What the site's own ground is worth: a carrier hotel on a dozen cables
    reaches further than an emerging edge with the same racks in it. */
export function siteFactor(source: ReachSource): number {
  const transit = source.transit ?? getStreamingServerSite(source.cityId)?.transit;
  if (transit === undefined) return 0.75;
  return 0.55 + 0.45 * transit;
}

/** The radius the map should draw, in kilometres: racks, gated by capacity,
    scaled by the site's own transit. The route is not in here because a radius
    has no direction — it is applied per target below. */
export function effectiveReachKm(source: ReachSource, insideBase: number): number {
  /* Fibre is a fourth factor rather than a tweak inside `siteFactor`, because
     `siteFactor` answers "what is this ground worth" and the ladder answers
     "what is our own kit worth on it". Applied once, here, so the map's field
     and the engine's verdict cannot be computed from different ladders. */
  return baseReachKm(source)
    * capacityFactor(source, insideBase)
    * siteFactor(source)
    * (source.fibre ?? 1);
}

/** Demand sitting inside a site's unconstrained field. The figure `capacityFactor`
    needs, and the reason a small room in Frankfurt no longer claims Europe. */
export function demandInsideBase(source: ReachSource, targets: ReachTarget[]): number {
  const radius = baseReachKm(source);
  if (radius <= 0) return 0;
  return targets.reduce((sum, target) => {
    /* A market is its population clusters, not its one coordinate. A target
       that names its country is counted where its people live, so to a room
       in Toronto the United States is Buffalo, New York and Chicago, not a
       point in Kansas 1,500 km away that put the whole country outside every
       ring and switched the capacity gate off. A bare point stays a point. */
    const places = target.countryCode
      ? audiencePlaces(target.countryCode, { lat: target.lat, lng: target.lng })
      : [{ lat: target.lat, lng: target.lng, share: 1 }];
    return sum + places.reduce((inside, place) => (
      distanceKm(source.lat, source.lng, place.lat, place.lng) <= radius ? inside + target.demand * place.share : inside
    ), 0);
  }, 0);
}

/** 0–1: how well this site serves that place. 1 is next door on good ground,
    0 is out of reach. Everything the map draws and everything the engine grades
    comes through here, so the picture and the verdict cannot part company.

    The fall-off is a plateau and a cliff, not a straight line (#106). Linear
    fall-off meant a stream was only smooth inside 45% of a room's reach: a
    room serving 640 km threw a ring 1,400 km wide with a green core a third of
    it, and Delhi, Brasília and Kano — a thousand kilometres from the nearest
    site — could not be served at any price. That is not how a stream degrades:
    it plays well until the buffer cannot keep up, then it falls apart. Squared,
    the served core is 67% of the reach at launch and 55% at the standard's
    ceiling, with the same ring drawn round it. */
export function reachStrength(source: ReachSource, target: ReachTarget, insideBase: number): number {
  const radius = effectiveReachKm(source, insideBase);
  if (radius <= 0) return 0;
  const site = getStreamingServerSite(source.cityId);
  const targetContinent = continentOf(target);
  const usable = radius * routeFactor(site?.continentId, targetContinent);
  if (usable <= 0) return 0;
  const km = distanceKm(source.lat, source.lng, target.lat, target.lng);
  return Math.max(0, Math.min(1, 1 - (km / usable) ** 2));
}

/** The part of a room's usable reach inside which a stream meets the standard
    — `reachStrength` solved for the radius at which it equals `standard`. The
    map draws its green core at this fraction of the ring, and it is here so
    the core and the verdict cannot be computed from different curves. */
export function servedBand(standard: number): number {
  return Math.sqrt(Math.max(0, Math.min(1, 1 - standard)));
}

/* Which continent a target sits on.

   This guessed from latitude and longitude alone, with coarse rectangular
   bounds — and the rectangles have holes. Anything past the date line or out in
   the mid-Atlantic fell through every case and returned undefined, which meant
   the 0.6 "I don't know" route penalty. Kiribati, Cabo Verde and Samoa were all
   being charged an unknown-route fee for existing in the wrong rectangle.

   The registry knows perfectly well which region a country is in, and markets
   carry their country code, so ask. The bounds remain for the bare points the
   map hands over, which have no country attached. */
const REGION_TO_CONTINENT: Record<string, ProductionLocationContinentId> = {
  NORTH_AMERICA: 'NA', SOUTH_AMERICA: 'SA', EUROPE: 'EU', AFRICA: 'AF', ASIA: 'AS', OCEANIA: 'OC',
};

/* Indexed once: `continentOf` runs per market per room, on a map that redraws
   while you drag it. A linear scan of 197 countries in there is a frame cost. */
const CONTINENT_BY_COUNTRY = new Map<string, ProductionLocationContinentId>(
  WORLD_COUNTRY_DEFINITIONS
    .map(country => [country.id, REGION_TO_CONTINENT[country.regionId]] as const)
    .filter((entry): entry is readonly [string, ProductionLocationContinentId] => Boolean(entry[1])),
);

export function continentOf(target: ReachTarget): ProductionLocationContinentId | undefined {
  if (target.countryCode) {
    const known = CONTINENT_BY_COUNTRY.get(target.countryCode);
    if (known) return known;
  }
  const { lat, lng } = target;
  if (lng >= -170 && lng <= -30 && lat >= 7) return 'NA';
  if (lng >= -85 && lng <= -30 && lat < 7) return 'SA';
  if (lng >= -25 && lng <= 45 && lat >= 34) return 'EU';
  if (lng >= -20 && lng <= 52 && lat < 34) return 'AF';
  if (lng >= 110 && lat < 0) return 'OC';
  if (lng > 45 || lng < -170) return 'AS';
  return undefined;
}

