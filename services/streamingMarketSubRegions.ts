/* ============================================================================
   SUB-REGIONS — the step between a continent and a country.

   Six regions is the right shape for a map and the wrong shape for a list:
   Europe holds forty-six countries and Africa fifty-four, and no one picks an
   opening footprint by scrolling fifty-four cards. So the world gets one level
   in between — twenty-four blocs of five to sixteen countries, each of them a
   thing a person would actually say out loud. "We're opening across the
   Nordics" is a decision; ticking Sweden, Norway, Denmark, Finland and Iceland
   one at a time is data entry.

   This is an index over `WORLD_COUNTRY_DEFINITIONS`, not a second registry.
   Every country in it comes from there, the region it sits under is the one
   that registry already assigned, and the integrity check below fails the
   build rather than letting a country quietly belong to nothing.
   ========================================================================== */

import type { WorldPopulationRegionId } from '../types';
import { WORLD_COUNTRY_DEFINITIONS } from './worldEconomy/worldCountryRegistry';

export interface StreamingMarketSubRegion {
  id: string;
  /** What a player would call this group of countries. */
  name: string;
  regionId: WorldPopulationRegionId;
  countryIds: string[];
  /** The city in the production catalogue a market here would most plausibly
      be served from. Used as the default network footprint suggestion for a
      country that has no authored one. */
  servedFromCityId: string;
}

const group = (
  id: string,
  name: string,
  regionId: WorldPopulationRegionId,
  servedFromCityId: string,
  codes: string,
): StreamingMarketSubRegion => ({
  id,
  name,
  regionId,
  servedFromCityId,
  countryIds: codes.trim().split(/\s+/),
});

export const STREAMING_MARKET_SUB_REGIONS: StreamingMarketSubRegion[] = [
  /* --- the Americas ------------------------------------------------------ */
  group('NORTHERN_AMERICA', 'Northern America', 'NORTH_AMERICA', 'LA', 'US CA'),
  group('CENTRAL_AMERICA', 'Central America', 'NORTH_AMERICA', 'MEX', 'MX GT HN SV NI CR PA BZ'),
  group('CARIBBEAN', 'Caribbean', 'NORTH_AMERICA', 'MEX', 'CU DO HT JM TT BS BB AG DM GD KN LC VC'),

  group('SOUTHERN_CONE', 'Brazil & the Southern Cone', 'SOUTH_AMERICA', 'RIO', 'BR AR CL UY PY'),
  group('ANDEAN', 'Andean states', 'SOUTH_AMERICA', 'BOG', 'CO PE EC BO VE'),
  group('GUIANAS', 'The Guianas', 'SOUTH_AMERICA', 'RIO', 'GY SR'),

  /* --- Europe ------------------------------------------------------------- */
  group('WESTERN_EUROPE', 'Western Europe', 'EUROPE', 'PAR', 'GB IE FR BE NL LU MC'),
  group('NORDICS', 'Nordics', 'EUROPE', 'LDN', 'SE NO DK FI IS'),
  group('SOUTHERN_EUROPE', 'Southern Europe', 'EUROPE', 'MAD', 'ES PT IT GR MT CY AD SM VA'),
  group('CENTRAL_EUROPE', 'Central Europe', 'EUROPE', 'BER', 'DE PL CZ AT CH SK HU SI LI'),
  group('EASTERN_EUROPE', 'Eastern Europe', 'EUROPE', 'PRG', 'RU UA BY RO BG MD LT LV EE'),
  group('BALKANS', 'The Balkans', 'EUROPE', 'ROM', 'HR RS BA AL MK ME XK'),

  /* --- Africa -------------------------------------------------------------- */
  group('NORTH_AFRICA', 'North Africa', 'AFRICA', 'CAI', 'EG MA DZ TN LY SD'),
  group('WEST_AFRICA', 'West Africa', 'AFRICA', 'LAG', 'NG GH CI SN ML BF NE GN BJ TG SL LR MR GM GW CV'),
  group('EAST_AFRICA', 'East Africa', 'AFRICA', 'CPT', 'KE ET TZ UG RW BI SS SO DJ ER MG MU SC KM'),
  group('CENTRAL_AFRICA', 'Central Africa', 'AFRICA', 'LAG', 'CD CM AO TD CG CF GA GQ ST'),
  group('SOUTHERN_AFRICA', 'Southern Africa', 'AFRICA', 'CPT', 'ZA ZW ZM MZ BW NA MW LS SZ'),

  /* --- Asia ---------------------------------------------------------------- */
  group('EAST_ASIA', 'East Asia', 'ASIA', 'TOK', 'CN JP KR TW MN KP'),
  group('SOUTHEAST_ASIA', 'Southeast Asia', 'ASIA', 'BKK', 'ID TH VN PH MY SG MM KH LA BN TL'),
  group('SOUTH_ASIA', 'South Asia', 'ASIA', 'BOM', 'IN PK BD LK NP AF BT MV'),
  group('MIDDLE_EAST', 'Middle East', 'ASIA', 'BOM', 'SA AE IL TR IR IQ JO LB KW QA BH OM YE SY PS'),
  group('CENTRAL_ASIA', 'Central Asia & the Caucasus', 'ASIA', 'BOM', 'KZ UZ TM KG TJ GE AM AZ'),

  /* --- Oceania -------------------------------------------------------------- */
  group('AUSTRALASIA', 'Australasia', 'OCEANIA', 'SYD', 'AU NZ PG'),
  group('PACIFIC_ISLANDS', 'Pacific Islands', 'OCEANIA', 'SYD', 'FJ SB VU WS TO KI FM MH PW NR TV'),
];

/* --- integrity ------------------------------------------------------------
   A country that belongs to no bloc is invisible in the picker, and a country
   in two is selectable twice. Both are the kind of fault that hides for months
   behind a screen that looks fine, so the module refuses to load instead. */

export const SUB_REGION_BY_COUNTRY_ID: Record<string, StreamingMarketSubRegion> = (() => {
  const index: Record<string, StreamingMarketSubRegion> = {};
  const duplicates: string[] = [];
  STREAMING_MARKET_SUB_REGIONS.forEach(subRegion => subRegion.countryIds.forEach(id => {
    if (index[id]) duplicates.push(id);
    index[id] = subRegion;
  }));
  if (duplicates.length > 0) {
    throw new Error(`Countries in more than one sub-region: ${duplicates.join(', ')}`);
  }
  const missing = WORLD_COUNTRY_DEFINITIONS.filter(country => !index[country.id]).map(country => country.id);
  if (missing.length > 0) {
    throw new Error(`Countries in no sub-region: ${missing.join(', ')}`);
  }
  const unknown = Object.keys(index).filter(id => !WORLD_COUNTRY_DEFINITIONS.some(country => country.id === id));
  if (unknown.length > 0) {
    throw new Error(`Sub-regions name countries the world registry does not hold: ${unknown.join(', ')}`);
  }
  /* And a bloc must sit under the region its countries already belong to. */
  const misfiled = STREAMING_MARKET_SUB_REGIONS.flatMap(subRegion => subRegion.countryIds
    .filter(id => {
      const country = WORLD_COUNTRY_DEFINITIONS.find(candidate => candidate.id === id);
      return country && country.regionId !== subRegion.regionId;
    })
    .map(id => `${id} in ${subRegion.id}`));
  if (misfiled.length > 0) {
    throw new Error(`Countries filed under the wrong region: ${misfiled.join(', ')}`);
  }
  return index;
})();

export const getStreamingMarketSubRegion = (countryId: string): StreamingMarketSubRegion | null => (
  SUB_REGION_BY_COUNTRY_ID[String(countryId || '').trim().toUpperCase()] || null
);

export const getStreamingMarketSubRegionsInRegion = (
  regionId: WorldPopulationRegionId,
): StreamingMarketSubRegion[] => STREAMING_MARKET_SUB_REGIONS.filter(subRegion => subRegion.regionId === regionId);
