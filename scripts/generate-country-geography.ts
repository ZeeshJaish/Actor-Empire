/* ============================================================================
   GENERATOR — services/worldEconomy/worldCountryGeography.ts

   Run with:  npm run generate:country-geography

   Every country in `WORLD_COUNTRY_DEFINITIONS` needs two things the registry
   does not carry: the id of its shape in the shared atlas, so the map can paint
   it, and a position, so the reach model can measure a distance to it.

   Before this, both came from `PRODUCTION_LOCATION_CATALOG` — the *film
   location* catalogue, which knows 25 countries. So 173 of the 197 markets a
   player can open were invisible on the map, and every one of them was placed
   at whichever city served it, which put 31 countries on Mumbai and 26 on
   Lagos. Distance could not do any work.

   The atlas already holds all of this. This script reads it once and writes a
   static table, rather than making every boot project 241 countries to recover
   197 pairs of numbers that never change.
   ========================================================================== */

import { writeFileSync } from 'fs';
import { geoArea, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-50m.json';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';

const topology = countriesTopology as any;
const geometries: any[] = topology.objects.countries.geometries;

const pad = (value: unknown): string => String(value).padStart(3, '0');
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

const byName = new Map<string, string>(
  geometries.filter(g => g.id !== undefined).map(g => [normalize(g.properties.name), pad(g.id)]),
);
/* countries-50m gives Australia and Ashmore and Cartier Islands the same id,
   036. Keyed naively, the last one wins and Australia becomes an uninhabited
   islet in the Timor Sea. Where an id is shared, the larger landmass is the
   country the player means. */
const byId = new Map<string, any>();
for (const geometry of geometries) {
  if (geometry.id === undefined) continue;
  const key = pad(geometry.id);
  const held = byId.get(key);
  if (!held || geoArea(feature(topology, geometry) as any) > geoArea(feature(topology, held) as any)) {
    byId.set(key, geometry);
  }
}

/* Where the registry's name and the atlas's name disagree. Checked against the
   25 pairs the film catalogue already asserted — all 25 agree, which is why the
   name match is trusted for the other 154. */
const OVERRIDE: Record<string, string> = {
  AG: '028', // Antigua and Barb.
  DO: '214', // Dominican Rep.
  KN: '659', // St. Kitts and Nevis
  US: '840', // United States of America
  BA: '070', // Bosnia and Herz.
  MK: '807', // Macedonia
  VA: '336', // Vatican
  CF: '140', // Central African Rep.
  CD: '180', // Dem. Rep. Congo
  CG: '178', // Congo
  GQ: '226', // Eq. Guinea
  ST: '678', // São Tomé and Principe
  SS: '728', // S. Sudan
  TR: '792', // Turkey
  MH: '584', // Marshall Is.
  SB: '090', // Solomon Is.
};

/* Not in countries-50m at all, or — for Kosovo — present but carrying no id, so
   there is nothing to key a shape on. They get a position by hand: too small to
   draw at world scale, but they are still markets and reach must find them. */
const HAND_PLACED: Record<string, [number, number]> = {
  VC: [13.25, -61.20],
  TV: [-7.11, 179.19],
  XK: [42.60, 20.90],
};

/* Where the people are, for countries whose geometric middle is empty.

   A centroid is the middle of the *land*, and for a large country with its
   population pressed against one edge that is nowhere near anybody. Russia's
   centroid is central Siberia, 3,000km from Moscow. Canada's is northern
   Manitoba. Australia's is the desert. Measured from those points, Russia and
   Canada came out beyond the reach of every server in the game — which is a
   bug about geography, not a balance problem.

   These are the populated centres of the countries where the two disagree
   enough to matter. Everything not listed keeps its centroid, which for a
   compact or evenly-settled country is the better answer. */
const POPULATION_ANCHOR: Record<string, [number, number]> = {
  RU: [55.75, 37.62],   // Moscow
  CA: [44.50, -78.00],  // the southern Ontario corridor
  AU: [-33.00, 148.50], // the south-east belt
  BR: [-20.50, -44.50], // the south-east
  CN: [34.50, 113.50],  // the eastern plain
  US: [38.50, -92.00],  // the population centroid, in Missouri
  ID: [-7.00, 110.00],  // Java
  IN: [24.50, 79.50],   // the Gangetic plain
  PK: [30.50, 72.50],   // Punjab
  KZ: [43.80, 73.00],   // the south
  MN: [47.90, 106.90],  // Ulaanbaatar
  IR: [35.70, 51.40],   // Tehran
  TR: [39.90, 32.90],   // Ankara
  SA: [24.70, 46.70],   // Riyadh
  OM: [23.60, 58.40],   // Muscat
  DZ: [36.40, 3.30],    // the northern coast
  LY: [32.50, 14.50],   // the northern coast
  EG: [30.00, 31.20],   // the Nile
  SD: [15.50, 32.50],   // Khartoum
  ML: [13.50, -7.50],   // the southern belt
  NE: [13.60, 5.00],    // the southern belt
  TD: [12.50, 15.00],   // the southern belt
  MR: [18.10, -15.90],  // the coast
  CD: [-4.60, 17.00],   // Kinshasa and the west
  ZA: [-26.20, 28.00],  // Johannesburg
  AR: [-34.00, -59.50], // the Pampas
  CL: [-33.50, -70.70], // Santiago
  PE: [-12.00, -77.00], // the Lima coast
  CO: [4.70, -74.10],   // Bogota
  VE: [10.20, -67.50],  // the northern coast
  MX: [19.80, -99.50],  // the central plateau
  MM: [17.50, 96.50],   // Yangon
  VN: [18.00, 105.80],  // the populated spine
  IL: [31.90, 35.00],   // the coastal plain
  NZ: [-37.00, 175.00], // the North Island
  FI: [60.50, 24.50],   // the south
  SE: [59.00, 17.00],   // the south
  NO: [60.00, 10.80],   // the south
};

/** The largest polygon's centroid, not the whole shape's.

    `geoCentroid` over a MultiPolygon averages every piece, which drags the
    United States towards Alaska and France into the Atlantic after its overseas
    territories are counted. The biggest landmass is where the country actually
    is. Geometric, not population-weighted — so Russia lands in Siberia rather
    than near Moscow, which is honest but worth knowing. */
function centroidOf(geometry: any): [number, number] {
  const shape: any = feature(topology, geometry);
  if (shape.geometry.type !== 'MultiPolygon') {
    const [lng, lat] = geoCentroid(shape);
    return [lat, lng];
  }
  let largest = shape.geometry.coordinates[0];
  let largestArea = -1;
  for (const polygon of shape.geometry.coordinates) {
    const area = geoArea({ type: 'Polygon', coordinates: polygon } as any);
    if (area > largestArea) { largestArea = area; largest = polygon; }
  }
  const [lng, lat] = geoCentroid({ type: 'Polygon', coordinates: largest } as any);
  return [lat, lng];
}

const rows: string[] = [];
const unresolved: string[] = [];

for (const country of WORLD_COUNTRY_DEFINITIONS) {
  const shapeId = OVERRIDE[country.id] ?? byName.get(normalize(country.name));
  if (shapeId && byId.has(shapeId)) {
    const [lat, lng] = POPULATION_ANCHOR[country.id] ?? centroidOf(byId.get(shapeId));
    rows.push(`  ${country.id}: ['${shapeId}', ${lat.toFixed(2)}, ${lng.toFixed(2)}], // ${country.name}`);
  } else if (HAND_PLACED[country.id]) {
    const [lat, lng] = HAND_PLACED[country.id];
    rows.push(`  ${country.id}: [null, ${lat.toFixed(2)}, ${lng.toFixed(2)}], // ${country.name} — no shape in the atlas`);
  } else {
    unresolved.push(`${country.id} (${country.name})`);
  }
}

if (unresolved.length > 0) {
  console.error(`Cannot place: ${unresolved.join(', ')}`);
  process.exit(1);
}

const file = `/* ============================================================================
   COUNTRY GEOGRAPHY — where each country is, and which shape on the map is it.

   GENERATED. Do not edit by hand.
   Run \`npm run generate:country-geography\` to rebuild from the shared atlas.

   Each entry is [atlas shape id, latitude, longitude]. A null shape id means
   the country is too small to appear in countries-50m; it still has a position,
   so the reach model can serve it, but the map has nothing to paint.

   The position is the centroid of the country's largest landmass — geometric,
   not population-weighted. Close enough to measure a server's reach against,
   and a great deal closer than the previous answer, which placed 31 countries
   on Mumbai and 26 on Lagos because it had no better one.
   ========================================================================== */

/** [atlas shape id | null, latitude, longitude] */
export type CountryGeography = readonly [string | null, number, number];

export const COUNTRY_GEOGRAPHY: Record<string, CountryGeography> = {
${rows.join('\n')}
};
`;

writeFileSync('services/worldEconomy/worldCountryGeography.generated.ts', file);
console.log(`Wrote ${rows.length} countries.`);
