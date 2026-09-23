/* ============================================================================
   WHERE COUNTRIES ARE.

   The registry says a country exists, how many people live in it and what it
   speaks. It does not say where it is, and it never has. Two things needed that
   and both got it from the wrong place:

     THE MAP    asked `PRODUCTION_LOCATION_CATALOG` — the *film location*
                catalogue — for the atlas shape to paint. That catalogue knows
                25 countries, so 173 of the 197 markets a player can open were
                selectable and invisible. You could enter Indonesia, Russia or
                Pakistan and watch nothing happen to the map.

     THE REACH  placed a market at whichever city served it. 31 countries sat on
                Mumbai and 26 on Lagos, so a single room lit a continent at zero
                distance and the reach model had almost nothing to measure.

   Both now read one generated table, built from the atlas the game already
   ships. Nothing new is downloaded and nothing is drawn twice.
   ========================================================================== */

import { COUNTRY_GEOGRAPHY } from './worldCountryGeography.generated';
import { WORLD_COUNTRY_DEFINITIONS } from './worldCountryRegistry';

export interface CountryPosition {
  latitude: number;
  longitude: number;
}

const key = (countryId: string): string => String(countryId || '').trim().toUpperCase();

/** The shared atlas's id for this country's shape, or null when it has none —
    a handful of island states are too small to appear at this resolution. */
export const getCountryShapeId = (countryId: string): string | null => (
  COUNTRY_GEOGRAPHY[key(countryId)]?.[0] ?? null
);

/** Where the country is, for measuring a distance to it. The centroid of its
    largest landmass: geometric, not population-weighted, so Russia reads as
    Siberia rather than Moscow. Good enough against reach measured in thousands
    of kilometres, and far better than the city that happened to serve it. */
export const getCountryPosition = (countryId: string): CountryPosition | null => {
  const row = COUNTRY_GEOGRAPHY[key(countryId)];
  return row ? { latitude: row[1], longitude: row[2] } : null;
};

/** Reverse: the country an atlas shape belongs to. The map hands back the id it
    was clicked with, and this turns it into something the game knows. */
export const getCountryIdByShapeId = (() => {
  const index = new Map<string, string>();
  Object.entries(COUNTRY_GEOGRAPHY).forEach(([countryId, [shapeId]]) => {
    if (shapeId && !index.has(shapeId)) index.set(shapeId, countryId);
  });
  return (shapeId: string): string | null => index.get(String(shapeId).padStart(3, '0')) ?? null;
})();

/* --- integrity --------------------------------------------------------------
   A country with no position cannot be reached and silently never turns green,
   which is the kind of fault that hides behind a screen that looks fine. The
   generator refuses to write a table with a hole in it; this refuses to load
   one, in case the two files ever drift apart. */
(() => {
  const missing = WORLD_COUNTRY_DEFINITIONS
    .filter(country => !COUNTRY_GEOGRAPHY[country.id])
    .map(country => country.id);
  if (missing.length > 0) {
    throw new Error(
      `Countries with no geography: ${missing.join(', ')}. `
      + 'Run `npm run generate:country-geography`.',
    );
  }
})();

