/* ============================================================================
   PLACES — the buildings in a city, and how you hold one.

   One enum used to decide three unrelated things:

       StreamingFacilityType  ->  rackPositionsFor(type)   how big it is
                              ->  fibreFor(type, quality)  how good it is
                              ->  (itself)                 rented or owned

   So there was no such thing as a small building you own or a big cheap one you
   rent, and all 46 cities offered the same six rungs of the same ladder. It read
   as "pick your tier", not "pick a property".

   Here the three come apart:

     PLACE    a building. It has a rack ceiling, a fibre grade, a power price,
              an uptime and room to grow — or not. That is what it IS, and it
              does not change with how you came by it.

     TENURE   how you hold it. Today: a cloud slice, or rented. Owning is a
              later stage, and the field exists now so that adding it is one
              more value rather than a migration across every saved facility.

     RACKS    still the player's job, and still the range-against-smoothness
              trade in `DUTY_CHARACTER`.

   Every city gets places — all 46, not a favoured handful. They are drawn from
   six archetypes, sized and priced from the city's own tier, quality, cost index
   and power price, which the site catalogue already carries. A named few get
   authored building names on top; the rest get plausible ones. The archetype is
   what gives a place its reason to exist, and that works everywhere.
   ========================================================================== */

import type {
  StreamingFacilityFibreGrade,
  StreamingFacilitySecurityGrade,
  StreamingFacilityType,
} from '../types';
import { STREAMING_SERVER_SITES, type StreamingServerSite, type StreamingSiteTier } from './streamingServerSites';

/** How you hold a place. `OWNED` is defined but not yet offered — see the
    header. Saves carry it from the start so it costs nothing to switch on. */
export type StreamingTenure = 'CLOUD' | 'RENTED' | 'OWNED';

export type StreamingPlaceArchetype =
  | 'CLOUD'
  | 'SHARED_CAGE'
  | 'BUSINESS_PARK'
  | 'INDUSTRIAL_SHED'
  | 'CARRIER_HOTEL'
  | 'CAMPUS';

export interface StreamingSitePlace {
  id: string;
  cityId: string;
  archetype: StreamingPlaceArchetype;
  name: string;
  /** Why this building exists and why you would pick it over the one beside it. */
  note: string;
  rackPositions: number;
  expansionRackPositions: number;
  fibre: StreamingFacilityFibreGrade;
  security: StreamingFacilitySecurityGrade;
  /** 0–1. How well this BUILDING carries, not the city. A carrier hotel and a
      shed on the ring road are not the same address, and until now every
      building in a city reached exactly as far as every other one. */
  transit: number;
  uptime: number;
  /** Cents per kWh, following `StreamingServerSite`. The marketplace quotes
      `electricityRatePerKwh` in DOLLARS, so it divides by 100 — two fields with
      nearly the same name in different units, which is worth saying out loud. */
  powerPricePerKwh: number;
  /** Which tenures this place can be held under. */
  tenures: StreamingTenure[];
  /** The contract type this place quotes under, so pricing, provisioning and
      every saved `facility.type` keep working unchanged. */
  legacyType: StreamingFacilityType;
}

/* --- the six archetypes -----------------------------------------------------
   Each is a different answer to "what is this building for". The numbers are
   multipliers against the city, not absolutes, so Chennai's shed is a Chennai
   shed and Frankfurt's is a Frankfurt one. */

interface Archetype {
  id: StreamingPlaceArchetype;
  label: string;
  note: string;
  /** Racks, before the city's own size is applied. */
  racks: number;
  /** Share of `racks` again as room to grow. 0 means this building is full. */
  expansion: number;
  fibre: StreamingFacilityFibreGrade | 'CITY';
  security: StreamingFacilitySecurityGrade;
  /** Multiplier on the city's transit.

      The carrier hotel is 1: the city's own transit figure describes the
      exchange, so the building that IS the exchange gets it in full and
      everything else is a fibre run away from it. Scaled the other way — with
      the hotel above 1 — the bonus clamped off in exactly the cities that have
      a carrier hotel, and Frankfurt's exchange read identically to its business
      park. */
  transit: number;
  /** Multiplier on the city's power price. Sheds are on industrial tariffs. */
  power: number;
  tenures: StreamingTenure[];
  legacyType: StreamingFacilityType;
  /** The worst ground that can still offer this building. Tier 1 is the best
      ground, 3 the thinnest, so a carrier hotel (1) exists only in the best
      cities and a shed (3) exists everywhere. */
  worstTier: 1 | 2 | 3;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'CLOUD',
    label: 'Cloud allocation',
    note: 'No building at all. Running this week, and expensive for as long as you keep it.',
    /* Not read for a cloud region — `CLOUD_CAP_BY_TIER` below is. */
    racks: 10, expansion: 0, fibre: 'CITY', security: 'STANDARD',
    transit: 0.78, power: 1, tenures: ['CLOUD'], legacyType: 'CLOUD_ALLOCATION', worstTier: 3,
  },
  {
    id: 'SHARED_CAGE',
    label: 'Shared floor',
    note: 'A few racks on somebody else’s floor. Small, short term, quick to start.',
    racks: 3, expansion: 0.6, fibre: 'CARRIER', security: 'STANDARD',
    transit: 0.74, power: 1.05, tenures: ['RENTED'], legacyType: 'RENTED_CABINET', worstTier: 3,
  },
  {
    id: 'BUSINESS_PARK',
    label: 'Business park hall',
    note: 'The sensible middle. Decent fibre, fair power, room to grow a little.',
    racks: 12, expansion: 0.75, fibre: 'CARRIER', security: 'REINFORCED',
    transit: 0.87, power: 0.95, tenures: ['RENTED', 'OWNED'], legacyType: 'PRIVATE_SUITE', worstTier: 3,
  },
  {
    id: 'INDUSTRIAL_SHED',
    label: 'Industrial park',
    note: 'Cheap, big, and room to double — a long way from the exchange.',
    racks: 26, expansion: 1.2, fibre: 'METRO', security: 'REINFORCED',
    transit: 0.59, power: 0.72, tenures: ['RENTED', 'OWNED'], legacyType: 'DEDICATED_DATA_HALL', worstTier: 3,
  },
  {
    id: 'CARRIER_HOTEL',
    label: 'Carrier hotel',
    note: 'Everything in the country crosses this floor. Dear, and there is no room to grow.',
    racks: 8, expansion: 0, fibre: 'GLOBAL_BACKBONE', security: 'FORTIFIED',
    transit: 1, power: 1.35, tenures: ['RENTED'], legacyType: 'PRIVATE_CAGE', worstTier: 1,
  },
  {
    id: 'CAMPUS',
    label: 'Campus',
    note: 'Your own ground, your own power, and as much of it as you can pay for.',
    racks: 72, expansion: 1.5, fibre: 'GLOBAL_BACKBONE', security: 'FORTIFIED',
    transit: 0.83, power: 0.6, tenures: ['OWNED'], legacyType: 'OWNED_DATA_CENTRE', worstTier: 2,
  },
];

/* --- naming ----------------------------------------------------------------
   A building needs a name or the list reads as a spreadsheet. Fifteen cities
   have authored ones; everywhere else gets a district and the archetype, which
   is how these places are actually named in the world anyway. */

const QUARTERS = ['North', 'South', 'East', 'West', 'Central', 'Harbour', 'Airport', 'Riverside'];

const AUTHORED_NAMES: Record<string, Partial<Record<StreamingPlaceArchetype, string>>> = {
  ASH: { CARRIER_HOTEL: 'Beaumeade Exchange', INDUSTRIAL_SHED: 'Loudoun Data Campus', BUSINESS_PARK: 'Waxpool Hall' },
  NYC: { CARRIER_HOTEL: 'Hudson Exchange', INDUSTRIAL_SHED: 'Secaucus Industrial Park', BUSINESS_PARK: 'Harlem River Hall' },
  LA:  { CARRIER_HOTEL: 'Wilshire Exchange', INDUSTRIAL_SHED: 'Vernon Industrial Park', BUSINESS_PARK: 'El Segundo Hall' },
  TOR: { CARRIER_HOTEL: 'Front Street Exchange', INDUSTRIAL_SHED: 'Vaughan Industrial Park', BUSINESS_PARK: 'Markham Tech Campus' },
  LDN: { CARRIER_HOTEL: 'Docklands Exchange', INDUSTRIAL_SHED: 'Slough Trading Estate', BUSINESS_PARK: 'Park Royal Hall' },
  FRA: { CARRIER_HOTEL: 'Kleyerstrasse Exchange', INDUSTRIAL_SHED: 'Offenbach Industrial Park', BUSINESS_PARK: 'Niederrad Hall' },
  AMS: { CARRIER_HOTEL: 'Science Park Exchange', INDUSTRIAL_SHED: 'Schiphol-Rijk Industrial Park', BUSINESS_PARK: 'Zuidoost Hall' },
  PAR: { CARRIER_HOTEL: 'Aubervilliers Exchange', INDUSTRIAL_SHED: 'Saint-Denis Industrial Park', BUSINESS_PARK: 'Courbevoie Hall' },
  SIN: { CARRIER_HOTEL: 'Tanjong Pagar Exchange', INDUSTRIAL_SHED: 'Jurong Industrial Park', BUSINESS_PARK: 'Paya Lebar Hall' },
  TOK: { CARRIER_HOTEL: 'Otemachi Exchange', INDUSTRIAL_SHED: 'Inzai Industrial Park', BUSINESS_PARK: 'Shinagawa Hall' },
  BOM: { CARRIER_HOTEL: 'Nariman Point Exchange', INDUSTRIAL_SHED: 'Navi Mumbai Industrial Park', BUSINESS_PARK: 'Powai Hall' },
  CHN: { INDUSTRIAL_SHED: 'Ambattur Industrial Park', BUSINESS_PARK: 'Siruseri Tech Hall', SHARED_CAGE: 'Guindy Shared Floor' },
  SAO: { CARRIER_HOTEL: 'Avenida Paulista Exchange', INDUSTRIAL_SHED: 'Barueri Industrial Park', BUSINESS_PARK: 'Santana Hall' },
  SYD: { CARRIER_HOTEL: 'Harbour Exchange', INDUSTRIAL_SHED: 'Erskine Park Industrial Park', BUSINESS_PARK: 'Macquarie Hall' },
  JNB: { INDUSTRIAL_SHED: 'Isando Industrial Park', BUSINESS_PARK: 'Bryanston Hall', SHARED_CAGE: 'Rosebank Shared Floor' },
};

const hash = (value: string): number => {
  let out = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    out ^= value.charCodeAt(index);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
};

/* No city prefix. These names sit under a heading that already reads "What
   stands in Bangkok", so "Bangkok Riverside Industrial Park" said the city
   twice and then ran out of card to say the rest — it rendered as "Bangkok
   Riverside Indus…". The authored names never carried one either. */
const nameFor = (site: StreamingServerSite, archetype: Archetype, seed: number): string => {
  const authored = AUTHORED_NAMES[site.id]?.[archetype.id];
  if (authored) return authored;
  const quarter = QUARTERS[seed % QUARTERS.length];
  if (archetype.id === 'CLOUD') return 'Cloud region';
  if (archetype.id === 'CARRIER_HOTEL') return `${site.name} Exchange`;
  if (archetype.id === 'SHARED_CAGE') return 'Shared Floor';
  if (archetype.id === 'INDUSTRIAL_SHED') return `${quarter} Industrial Park`;
  if (archetype.id === 'CAMPUS') return `${quarter} Campus`;
  return `${quarter} Hall`;
};

/* --- building the places ---------------------------------------------------- */

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const even = (value: number): number => Math.max(2, Math.round(value / 2) * 2);

/** The most compute a cloud region will sell, by the ground it stands on.

    Every region sold the same four. Reach grows with the square root of
    compute, so four stops on a slider all look alike — the ring at four is
    barely a third wider than the ring at one. A tier-1 region sells enough to
    double it, and the ceiling is the third reason cloud cannot be the whole
    answer: it is expensive, it is weekly forever, and there is only so much. */
export const CLOUD_CAP_BY_TIER: Record<StreamingSiteTier, number> = { 1: 16, 2: 10, 3: 6 };

function placesForSite(site: StreamingServerSite): StreamingSitePlace[] {
  /* The city's own size: good ground carries bigger buildings. Tier 1 cities
     get halls half again as large as an emerging edge. */
  const scale = site.tier === 1 ? 1.35 : site.tier === 2 ? 1 : 0.7;
  return ARCHETYPES
    .filter(archetype => site.tier <= archetype.worstTier)
    .map(archetype => {
      const seed = hash(`${site.id}.${archetype.id}.places-v1`);
      /* A little spread so two cities of the same tier are not identical, and
         deterministic so a place does not change size between sessions. */
      const wobble = 0.88 + ((seed % 1_000) / 1_000) * 0.24;
      const racks = archetype.id === 'CLOUD' ? CLOUD_CAP_BY_TIER[site.tier] : even(archetype.racks * scale * wobble);
      const fibre: StreamingFacilityFibreGrade = archetype.fibre === 'CITY'
        ? (site.quality >= 8 ? 'CARRIER' : 'METRO')
        : archetype.fibre;
      /* A GLOBAL_BACKBONE building on poor ground is still limited by the
         country it stands in — the archetype lifts the city, it does not
         replace it. */
      const transit = clamp(site.transit * archetype.transit, 0.12, 1);
      return {
        id: `PLACE-${site.id}-${archetype.id}`,
        cityId: site.id,
        archetype: archetype.id,
        name: nameFor(site, archetype, seed),
        note: archetype.note,
        rackPositions: racks,
        /* `even` floors at two, so a building with no room to grow — a cloud
           region, a carrier hotel — was quoting two spare positions it does
           not have. None is none. */
        expansionRackPositions: archetype.expansion > 0 ? even(racks * archetype.expansion) : 0,
        fibre,
        security: archetype.security,
        transit,
        uptime: clamp(99.7 + site.quality * 0.022 + (fibre === 'GLOBAL_BACKBONE' ? 0.05 : fibre === 'CARRIER' ? 0.02 : 0), 99.5, 99.999),
        powerPricePerKwh: Math.round(site.powerPricePerKwh * archetype.power * 100) / 100,
        tenures: archetype.tenures,
        legacyType: archetype.legacyType,
      };
    });
}

export const STREAMING_SITE_PLACES: StreamingSitePlace[] = STREAMING_SERVER_SITES.flatMap(placesForSite);

const BY_CITY = new Map<string, StreamingSitePlace[]>();
STREAMING_SITE_PLACES.forEach(place => {
  const held = BY_CITY.get(place.cityId);
  if (held) held.push(place); else BY_CITY.set(place.cityId, [place]);
});
const BY_ID = new Map(STREAMING_SITE_PLACES.map(place => [place.id, place]));

/** Every building in a city, largest ceiling last so the list reads as a ladder
    of commitment rather than an unsorted pile. */
export const getStreamingSitePlaces = (cityId: string): StreamingSitePlace[] => (
  [...(BY_CITY.get(String(cityId || '').trim().toUpperCase()) || [])]
    .sort((a, b) => a.rackPositions - b.rackPositions)
);

export const getStreamingSitePlace = (placeId: string): StreamingSitePlace | undefined => BY_ID.get(placeId);

/** The marketplace's listing id for a place.

    The format predates places and is kept exactly: a city holds at most one
    building of each archetype, and each archetype quotes under a distinct
    contract type, so this stays unique and every facility in every existing
    save still resolves. It lives here rather than in the marketplace so that
    the reverse lookup below cannot drift from the thing it parses. */
export const listingIdForPlace = (place: StreamingSitePlace): string => (
  `LEASE-${place.cityId}-${place.legacyType}-V1`
);

const BY_LISTING_ID = new Map(STREAMING_SITE_PLACES.map(place => [listingIdForPlace(place), place]));

/** Which building a commissioned facility is standing in. */
export const getPlaceByListingId = (listingId: string): StreamingSitePlace | undefined => (
  BY_LISTING_ID.get(String(listingId || '').trim())
);

/** What a saved facility was standing in. Saves hold `cityId` and a facility
    `type`, not a place id, so an old commissioned room still has to resolve to
    a building. The archetype that quotes under that contract type is it. */
export const getPlaceForLegacyFacility = (
  cityId: string,
  type: StreamingFacilityType,
): StreamingSitePlace | undefined => (
  (BY_CITY.get(String(cityId || '').trim().toUpperCase()) || []).find(place => place.legacyType === type)
);

/** Which tenures a place can currently be taken under.

    Owning was defined from the start and filtered out here, in exactly one
    place, so that switching it on would be one entry in an array rather than a
    migration across every saved facility. This is that entry. It makes 92
    buildings holdable two ways and reveals 36 campuses that could never be
    rented. */
export const OFFERED_TENURES: readonly StreamingTenure[] = ['CLOUD', 'RENTED', 'OWNED'];

export const getOfferedTenures = (place: StreamingSitePlace): StreamingTenure[] => (
  place.tenures.filter(tenure => OFFERED_TENURES.includes(tenure))
);

/* --- integrity --------------------------------------------------------------
   A city with no building is a city you cannot build in, and it would show as
   an empty screen rather than an error. */
(() => {
  const empty = STREAMING_SERVER_SITES
    .filter(site => getStreamingSitePlaces(site.id).filter(place => getOfferedTenures(place).length > 0).length === 0)
    .map(site => site.id);
  if (empty.length > 0) {
    throw new Error(`Cities with no place you can take: ${empty.join(', ')}`);
  }
  const duplicates = STREAMING_SITE_PLACES
    .map(place => place.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate place ids: ${duplicates.join(', ')}`);
  }
})();
