/* ============================================================================
   AUDIENCE ATLAS GEOMETRY — the same world, drawn light.

   The Build wizard's map draws the 1:50m Natural Earth atlas: 80,600 points.
   That is right for a screen you spend minutes on, but the Audience room shows
   the map as a 347-pixel hero you pass through, and on a phone the 50m paths
   cost a quarter of a second to paint every time a tab opens.

   This module serves the 1:110m edition of the same atlas (8,200 points) through
   the SAME projection object, so every coordinate lands where it does on the
   Build map: same framing, same continent boxes, same label points. Only the
   coastline's fine wiggle is gone, which at this size nobody can see.

   Shapes are looked up by "key": the numeric shape id the rest of the game uses
   (getCountryShapeId), except for Kosovo, whose market (XK) has no numeric code
   and is keyed by that alpha-2 code instead. See UNNUMBERED_OWNER.

   Everything is computed on first use and cached; nothing runs at import.
   ========================================================================== */

import { geoArea } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import countriesTopology110 from 'world-atlas/countries-110m.json';
import { WORLD_PATH, formatWorldCountryId } from '../../views/lifestyle/business/components/worldMapDetailedGeometry';

const TOPOLOGY = countriesTopology110 as any;
const ANTARCTICA_ID = '010';

/* Three shapes in the atlas carry no numeric id. They are land all the same
   (the Build map draws them), and each belongs to one of the game's markets:
   Somaliland is reached through Somalia, Northern Cyprus through Cyprus, and
   Kosovo is a market of its own. Dropping them would leave three holes of sea
   in the land; filing them under their market keeps the land whole and lights
   them with the market they belong to. */
const UNNUMBERED_OWNER: Record<string, string> = { Somaliland: '706', 'N. Cyprus': '196', Kosovo: 'XK' };

const keyOf = (geometry: any): string => (
  geometry.id !== undefined ? formatWorldCountryId(geometry.id) : UNNUMBERED_OWNER[geometry.properties?.name] ?? ''
);

let geometries: any[] | null = null;
let byKey: Map<string, any[]> | null = null;
const drawable = (): any[] => {
  if (!geometries) {
    geometries = (TOPOLOGY.objects.countries.geometries as any[])
      .filter(geometry => geometry.id === undefined || formatWorldCountryId(geometry.id) !== ANTARCTICA_ID);
    const index = new Map<string, any[]>();
    geometries.forEach(geometry => {
      const key = keyOf(geometry);
      if (key) index.set(key, [...(index.get(key) ?? []), geometry]);
    });
    byKey = index;
  }
  return geometries;
};
const index = (): Map<string, any[]> => { drawable(); return byKey!; };

const pathOfGeometries = (list: any[]): string => {
  if (list.length === 0) return '';
  return WORLD_PATH((list.length === 1 ? feature(TOPOLOGY, list[0]) : merge(TOPOLOGY, list as any)) as any) || '';
};

let world: { land: string; shelf: string; borders: string } | null = null;
/** Land, the shelf outline (sizeable landmasses only) and interior borders. */
export const lightWorld = (): { land: string; shelf: string; borders: string } => {
  if (!world) {
    const all = drawable();
    world = {
      land: WORLD_PATH(merge(TOPOLOGY, all as any) as any) || '',
      shelf: WORLD_PATH(merge(TOPOLOGY, all.filter(geometry => geoArea(feature(TOPOLOGY, geometry) as any) > 0.0015) as any) as any) || '',
      borders: WORLD_PATH(mesh(TOPOLOGY, { type: 'GeometryCollection', geometries: all } as any, (a: any, b: any) => a !== b) as any) || '',
    };
  }
  return world;
};

/** True when this edition draws the country (some island states are too small). */
export const lightHasCountry = (key: string): boolean => index().has(key);

const countryCache = new Map<string, string>();
export const lightCountryPath = (key: string): string => {
  const cached = countryCache.get(key);
  if (cached !== undefined) return cached;
  const path = pathOfGeometries(index().get(key) ?? []);
  countryCache.set(key, path);
  return path;
};

const mergedCache = new Map<string, string>();
/** Several countries as one merged territory. Cached by the sorted key list. */
export const lightMergedPath = (keys: string[]): string => {
  const unique = [...new Set(keys)].sort();
  const cacheKey = unique.join(',');
  const cached = mergedCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const lookup = index();
  const path = pathOfGeometries(unique.flatMap(key => lookup.get(key) ?? []));
  mergedCache.set(cacheKey, path);
  return path;
};

const outsideCache = new Map<string, string>();
/** All the land NOT filed under any of these keys, as one path. Cached by the
    sorted key list. The atlas uses it for land that is no market at all. */
export const lightLandOutside = (keys: Iterable<string>): string => {
  const keep = new Set(keys);
  const cacheKey = [...keep].sort().join(',');
  const cached = outsideCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const path = pathOfGeometries(drawable().filter(geometry => !keep.has(keyOf(geometry))));
  outsideCache.set(cacheKey, path);
  return path;
};
