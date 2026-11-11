/**
 * 2026-11-11 (player report: the Greenlight Location map lags and crashes on iPhone). The detailed map
 * draws Natural Earth 1:50m: one land path of about 848K characters (54,600 points), the shelf (812K) three
 * times with a non-scaling stroke, the land three times more for relief and gloss, the borders (306K), and a
 * blur filter on a selected region, all redrawn on every zoom step.
 *
 * Maps that stop at the region level (Greenlight's location picker) do not need that detail. These are the
 * same layers from Natural Earth 1:110m (about a tenth of the points), projected with the detailed map's own
 * projection, so pins, labels and the view fit stay exactly where they were.
 */
import { geoArea } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import lightTopology from 'world-atlas/countries-110m.json';
import {
    MAP_BASE_HEIGHT,
    MAP_WIDTH,
    WORLD_PATH,
    formatWorldCountryId,
    getCountryPath,
    type RegionGeometry,
} from './worldMapDetailedGeometry';

const TOPOLOGY = lightTopology as any;
const ANTARCTICA_ID = '010';
const drawable = (TOPOLOGY.objects.countries.geometries as Array<{ id?: string | number }>)
    .filter(geometry => geometry.id !== undefined && formatWorldCountryId(geometry.id) !== ANTARCTICA_ID);
const byId = new Map(drawable.map(geometry => [formatWorldCountryId(geometry.id), geometry]));
const collectionOf = (geometries: unknown[]) => ({ type: 'GeometryCollection', geometries } as any);

let land: string | null = null;
let shelf: string | null = null;
let borders: string | null = null;

/* built on first use, so a screen without the light map never pays for it */
export const getLightLandPath = (): string => (land ??= WORLD_PATH(merge(TOPOLOGY, drawable as any) as any) || '');
export const getLightShelfPath = (): string => (shelf ??= WORLD_PATH(merge(
    TOPOLOGY,
    drawable.filter(geometry => geoArea(feature(TOPOLOGY, geometry as any) as any) > 0.0015) as any,
) as any) || '');
export const getLightBordersPath = (): string => (borders ??= WORLD_PATH(mesh(TOPOLOGY, collectionOf(drawable), (a: any, b: any) => a !== b) as any) || '');

const countryCache = new Map<string, string>();
/** A country at 1:110m; a small island 1:110m leaves out keeps its detailed outline. */
export const getLightCountryPath = (countryId: string): string => {
    const cached = countryCache.get(countryId);
    if (cached !== undefined) return cached;
    const geometry = byId.get(countryId);
    const path = geometry ? (WORLD_PATH(feature(TOPOLOGY, geometry as any) as any) || '') : getCountryPath(countryId);
    countryCache.set(countryId, path);
    return path;
};

const regionCache = new Map<string, RegionGeometry>();
export const getLightRegionGeometry = (countryIds: string[]): RegionGeometry => {
    const key = countryIds.join(',');
    const cached = regionCache.get(key);
    if (cached) return cached;
    const geometries = countryIds.flatMap(id => (byId.has(id) ? [byId.get(id)!] : []));
    let result: RegionGeometry = { path: '', countryCount: countryIds.length, centroid: [MAP_WIDTH / 2, MAP_BASE_HEIGHT / 2] };
    if (geometries.length) {
        const merged = merge(TOPOLOGY, geometries as any) as any;
        const centroid = WORLD_PATH.centroid(merged);
        result = {
            path: WORLD_PATH(merged) || '',
            countryCount: countryIds.length,
            centroid: [
                Number.isFinite(centroid[0]) ? centroid[0] : MAP_WIDTH / 2,
                Number.isFinite(centroid[1]) ? centroid[1] : MAP_BASE_HEIGHT / 2,
            ],
        };
    }
    regionCache.set(key, result);
    return result;
};

const unassignedCache = new Map<string, string>();
export const getLightUnassignedLandPath = (assignedCountryIds: ReadonlySet<string>): string => {
    const key = [...assignedCountryIds].sort().join(',');
    const cached = unassignedCache.get(key);
    if (cached !== undefined) return cached;
    const rest = drawable.filter(geometry => !assignedCountryIds.has(formatWorldCountryId(geometry.id)));
    const path = rest.length ? (WORLD_PATH(merge(TOPOLOGY, rest as any) as any) || '') : '';
    unassignedCache.set(key, path);
    return path;
};
