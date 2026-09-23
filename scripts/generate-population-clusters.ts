/* ============================================================================
   GENERATOR — services/worldEconomy/worldPopulationClusters.generated.ts

   Run with:  npm run generate:population-clusters

   Every country was one point. So a single room within reach of that point
   served the whole country — one site covered all 310 million people in India,
   and covering "a region" was a switch rather than a job. Nothing about the map
   could show a network that reached half of somewhere.

   A country is a handful of weighted clusters now, placed inside its real
   outline, and a market's audience is split between them. A room reaches the
   clusters it reaches; the rest of the country stays dark until you build
   closer. That is the whole point: to cover a big country you need more rooms
   in it, and the map can finally show it.

   Two things the obvious version got wrong, both fixed here and both worth
   knowing because they are easy to reintroduce:

     THE DATE LINE   sampling inside `geoBounds` of the whole multipolygon put
                     the United States and Russia at ZERO usable points — their
                     bounds wrap past 180 (Alaska, Chukotka), so the sampler
                     spent every attempt in the Pacific. Sample the largest
                     landmass, as the centroids do.

     UNIFORM IS NOT  people are not spread evenly over land. Sampled uniformly,
     POPULATION      Russia's clusters land in Siberia and Canada's in Nunavut.
                     Clusters are drawn toward the country's population anchor
                     and thin outward, which is what population actually does.
   ========================================================================== */

import { writeFileSync } from 'fs';
import { geoArea, geoBounds, geoContains, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-50m.json';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';
import { COUNTRY_GEOGRAPHY } from '../services/worldEconomy/worldCountryGeography.generated';

const topology = countriesTopology as any;

const byId = new Map<string, any>();
for (const geometry of topology.objects.countries.geometries) {
  if (geometry.id === undefined) continue;
  const key = String(geometry.id).padStart(3, '0');
  const held = byId.get(key);
  if (!held || geoArea(feature(topology, geometry) as any) > geoArea(feature(topology, held) as any)) {
    byId.set(key, geometry);
  }
}

/* Real population centres, for the countries big enough that guessing shows.

   Sampling inside a country's outline and weighting toward its anchor is a fair
   approximation for a mid-sized country. For the giants it is not: the first
   run put United States clusters in Nebraska, Montana, the Salton Sea and — the
   outline encloses the Great Lakes — the middle of Lake Superior. Nobody lives
   in Lake Superior.

   So the twenty countries where a wrong guess is visible get their actual
   metropolitan centres, in descending order of size. Everyone else is sampled,
   which is honest at that scale. Coordinates are the cities themselves. */
const AUTHORED_CLUSTERS: Record<string, Array<[number, number]>> = {
  IN: [[28.61, 77.21], [19.08, 72.88], [12.97, 77.59], [22.57, 88.36], [13.08, 80.27], [17.39, 78.49], [23.02, 72.57], [26.85, 80.95]],
  CN: [[31.23, 121.47], [39.90, 116.41], [23.13, 113.26], [22.54, 114.06], [30.57, 104.07], [29.56, 106.55], [34.34, 108.94], [45.80, 126.53]],
  US: [[40.71, -74.01], [34.05, -118.24], [41.88, -87.63], [29.76, -95.37], [33.75, -84.39], [25.76, -80.19], [47.61, -122.33], [39.74, -104.99]],
  ID: [[-6.21, 106.85], [-7.25, 112.75], [-6.92, 107.61], [-7.00, 110.42], [3.59, 98.67], [-5.15, 119.44]],
  PK: [[24.86, 67.01], [31.55, 74.34], [33.69, 73.06], [31.42, 73.08], [30.18, 66.98], [34.02, 71.58]],
  NG: [[6.52, 3.38], [9.06, 7.49], [12.00, 8.52], [7.38, 3.90], [4.82, 7.05], [11.83, 13.15]],
  BR: [[-23.55, -46.63], [-22.91, -43.17], [-19.92, -43.94], [-15.79, -47.88], [-12.97, -38.50], [-8.05, -34.88]],
  BD: [[23.81, 90.41], [22.36, 91.78], [24.90, 91.87], [24.37, 88.60]],
  RU: [[55.75, 37.62], [59.93, 30.34], [56.84, 60.65], [55.03, 82.92], [56.33, 44.00], [43.12, 131.89]],
  MX: [[19.43, -99.13], [20.66, -103.35], [25.69, -100.32], [21.16, -86.85], [32.51, -117.04]],
  JP: [[35.68, 139.69], [34.69, 135.50], [35.18, 136.91], [43.06, 141.35], [33.59, 130.40]],
  ET: [[9.01, 38.76], [7.68, 36.83], [11.59, 37.39], [13.50, 39.47]],
  PH: [[14.60, 120.98], [10.32, 123.89], [7.19, 125.46], [16.41, 120.60]],
  EG: [[30.04, 31.24], [31.20, 29.92], [25.69, 32.64], [30.79, 31.00]],
  VN: [[21.03, 105.85], [10.82, 106.63], [16.05, 108.22], [10.05, 105.77]],
  CD: [[-4.32, 15.31], [-11.66, 27.48], [-6.14, 23.60], [0.52, 25.20]],
  TR: [[41.01, 28.98], [39.93, 32.86], [38.42, 27.14], [36.89, 30.71]],
  IR: [[35.69, 51.39], [38.08, 46.29], [32.65, 51.68], [29.59, 52.58]],
  DE: [[52.52, 13.40], [48.14, 11.58], [50.94, 6.96], [53.55, 9.99]],
  TH: [[13.76, 100.50], [18.79, 98.99], [7.89, 98.40], [16.44, 102.83]],

  /* Second tier: not the biggest, but large and EMPTY, which is the case the
     sampler handles worst. Australia came out with clusters in the Great Sandy
     Desert and Canada with one in the northern Quebec bush — both technically
     inside the outline and both places nobody lives. Anywhere the population
     hugs a coast or a border gets written down. */
  AU: [[-33.87, 151.21], [-37.81, 144.96], [-27.47, 153.03], [-31.95, 115.86]],
  CA: [[43.65, -79.38], [45.50, -73.57], [49.28, -123.12], [51.05, -114.07]],
  AR: [[-34.60, -58.38], [-31.42, -64.18], [-32.95, -60.64], [-24.79, -65.41]],
  KZ: [[43.24, 76.89], [51.16, 71.47], [42.34, 69.60], [49.80, 73.10]],
  DZ: [[36.75, 3.06], [35.70, -0.63], [36.37, 6.61], [31.62, 2.22]],
  SA: [[24.71, 46.68], [21.49, 39.19], [26.42, 50.09], [21.39, 39.86]],
  ZA: [[-26.20, 28.04], [-33.92, 18.42], [-29.86, 31.02], [-25.75, 28.19]],
  UA: [[50.45, 30.52], [49.84, 24.03], [46.48, 30.73], [49.99, 36.23]],
  PL: [[52.23, 21.01], [50.06, 19.94], [51.11, 17.04], [54.35, 18.65]],
  GB: [[51.51, -0.13], [53.48, -2.24], [52.49, -1.89], [55.86, -4.25]],
  FR: [[48.86, 2.35], [45.76, 4.84], [43.30, 5.37], [43.60, 1.44]],
  IT: [[45.46, 9.19], [41.90, 12.50], [40.85, 14.27], [45.07, 7.69]],
  ES: [[40.42, -3.70], [41.39, 2.17], [39.47, -0.38], [37.39, -5.98]],
  KR: [[37.57, 126.98], [35.18, 129.08], [35.87, 128.60], [37.46, 126.71]],
  CO: [[4.71, -74.07], [6.24, -75.58], [3.45, -76.53], [10.96, -74.80]],
  MY: [[3.14, 101.69], [5.41, 100.34], [1.49, 103.74], [5.98, 116.07]],
  PE: [[-12.05, -77.04], [-16.41, -71.54], [-8.11, -79.03], [-13.53, -71.97]],
  MA: [[33.57, -7.59], [34.02, -6.84], [31.63, -8.01], [35.76, -5.83]],
  MM: [[16.87, 96.20], [21.95, 96.09], [22.00, 96.11], [16.81, 96.15]],
  SD: [[15.50, 32.56], [19.62, 37.22], [13.18, 30.22], [12.05, 24.88]],
};

/** How many clusters a country's population is worth.

    Not a smooth curve: these are the steps at which "I need another room in
    this country" should become true, so they are chosen to be felt rather than
    to be exact. A country under twenty million is one place as far as a network
    is concerned. */
function clusterCount(population: number): number {
  if (population >= 500_000_000) return 8;
  if (population >= 200_000_000) return 6;
  if (population >= 80_000_000) return 4;
  if (population >= 20_000_000) return 3;
  if (population >= 5_000_000) return 2;
  return 1;
}

/** The largest landmass, so the sampler never wanders into the Pacific looking
    for the middle of a bounding box that wraps the date line. */
function largestPolygon(geometry: any): any {
  const shape: any = feature(topology, geometry);
  if (shape.geometry.type !== 'MultiPolygon') return shape;
  let best = shape.geometry.coordinates[0];
  let bestArea = -1;
  for (const polygon of shape.geometry.coordinates) {
    const area = geoArea({ type: 'Polygon', coordinates: polygon } as any);
    if (area > bestArea) { bestArea = area; best = polygon; }
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: best } };
}

/* Deterministic, so a country's clusters are the same in every session and in
   every save. A wandering population would be worse than one point. */
function seeded(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface Cluster { lat: number; lng: number; share: number }

function clustersFor(countryId: string, population: number, anchor: [number, number]): Cluster[] {
  const want = clusterCount(population);
  const authored = AUTHORED_CLUSTERS[countryId];
  if (authored) {
    const picked = authored.slice(0, Math.max(want, 1));
    const weights = picked.map((_, index) => 1 / (index + 1.6));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return picked.map(([lat, lng], index) => ({
      lat, lng, share: Math.round((weights[index] / total) * 1000) / 1000,
    }));
  }
  const row = COUNTRY_GEOGRAPHY[countryId];
  const geometry = row?.[0] ? byId.get(row[0]) : undefined;
  /* No shape to place them in — the handful of island states too small to
     appear at this resolution. One cluster, where the country is. */
  if (!geometry || want === 1) return [{ lat: anchor[0], lng: anchor[1], share: 1 }];

  const shape = largestPolygon(geometry);
  const [[west, south], [east, north]] = geoBounds(shape);
  const random = seeded(`${countryId}.clusters-v1`);
  const picked: Array<[number, number]> = [];

  /* The anchor is always the first and largest cluster: whatever else a country
     has, it has its main population centre. */
  picked.push(anchor);

  /* The rest are sampled inside the outline and accepted with a probability
     that falls off with distance from the anchor, so they crowd the populated
     part and thin toward the empty edges. */
  const span = Math.max(geoDistance([west, south], [east, north]), 1e-6);
  for (let tries = 0; tries < 20_000 && picked.length < want; tries += 1) {
    const lng = west + random() * (east - west);
    const lat = south + random() * (north - south);
    if (!geoContains(shape, [lng, lat])) continue;
    const reach = geoDistance([lng, lat], [anchor[1], anchor[0]]) / span;
    /* Accept near the anchor almost always, far from it rarely. */
    if (random() > Math.max(0.08, 1 - reach * 1.35)) continue;
    /* Never stack two clusters on the same spot. */
    /* Kept apart in real kilometres, not as a fraction of the bounding box.
       Measured against the box, Russia's clusters had to be two thousand
       kilometres apart to count as distinct, so every candidate near Moscow was
       rejected for being near Moscow and the country ended up with one. */
    if (picked.some(([pLat, pLng]) => geoDistance([lng, lat], [pLng, pLat]) * 6371 < 280)) continue;
    picked.push([Math.round(lat * 100) / 100, Math.round(lng * 100) / 100]);
  }

  /* The anchor carries the largest share and the rest fall away, so a country's
     first room is worth more than its fourth. Normalised to exactly 1. */
  const weights = picked.map((_, index) => 1 / (index + 1.6));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return picked.map(([lat, lng], index) => ({
    lat,
    lng,
    share: Math.round((weights[index] / total) * 1000) / 1000,
  }));
}

const rows: string[] = [];
let totalClusters = 0;
for (const country of WORLD_COUNTRY_DEFINITIONS) {
  const row = COUNTRY_GEOGRAPHY[country.id];
  if (!row) continue;
  const clusters = clustersFor(country.id, country.baselinePopulation, [row[1], row[2]]);
  totalClusters += clusters.length;
  const body = clusters.map(c => `[${c.lat}, ${c.lng}, ${c.share}]`).join(', ');
  rows.push(`  ${country.id}: [${body}],`);
}

const file = `/* ============================================================================
   POPULATION CLUSTERS — where a country's people actually are.

   GENERATED. Do not edit by hand.
   Run \`npm run generate:population-clusters\` to rebuild.

   Each entry is [latitude, longitude, share of the country's audience]. Shares
   within a country sum to 1.

   A country used to be a single point, so one room in reach of that point served
   all of it — one site covered all of India. A country is a handful of weighted
   places now, so reaching half of a big one is a thing that can happen, and
   covering the rest is a reason to build another room.

   Placed inside each country's real outline, crowded toward its population
   centre and thinning outward. Deterministic: the same clusters every session.
   ========================================================================== */

/** [latitude, longitude, share of this country's audience] */
export type PopulationCluster = readonly [number, number, number];

export const POPULATION_CLUSTERS: Record<string, PopulationCluster[]> = {
${rows.join('\n')}
};
`;

writeFileSync('services/worldEconomy/worldPopulationClusters.generated.ts', file);
console.log(`Wrote ${rows.length} countries, ${totalClusters} clusters.`);
