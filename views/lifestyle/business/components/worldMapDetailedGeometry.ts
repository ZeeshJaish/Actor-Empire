import { geoArea, geoGraticule, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-50m.json';
import type { LonLatBox } from '../../../../services/regionMap';

/** The map's drawing space. Every path below is in these units. */
export const MAP_WIDTH = 1000;
/** Height of the legacy 1000×520 letterbox the projection was fitted to. */
export const MAP_BASE_HEIGHT = 520;

export type MapBounds = [[number, number], [number, number]];

export const WORLD_TOPOLOGY = countriesTopology as any;
export const WORLD_COUNTRIES = WORLD_TOPOLOGY.objects.countries.geometries as Array<{
    id?: string | number;
    properties?: { name?: string };
}>;

export const formatWorldCountryId = (countryId: string | number | undefined): string => String(countryId).padStart(3, '0');

const ANTARCTICA_ID = '010';
const isDrawable = (geometry: { id?: string | number }): boolean => formatWorldCountryId(geometry.id) !== ANTARCTICA_ID;

const drawableGeometries = WORLD_COUNTRIES.filter(isDrawable);

export const WORLD_FEATURES = feature(WORLD_TOPOLOGY, WORLD_TOPOLOGY.objects.countries) as any;
export const WORLD_VISIBLE_FEATURES = {
    ...WORLD_FEATURES,
    features: WORLD_FEATURES.features.filter(
        (country: { id: string | number }) => formatWorldCountryId(country.id) !== ANTARCTICA_ID,
    ),
};

export const WORLD_COUNTRY_BY_ID: ReadonlyMap<string, any> = new Map(
    (WORLD_VISIBLE_FEATURES.features as Array<{ id?: string | number }>)
        .filter(country => country.id !== undefined)
        .map(country => [formatWorldCountryId(country.id), country])
);

export const hasCountry = (countryId: string): boolean => WORLD_COUNTRY_BY_ID.has(countryId);

export const countryDisplayName = (countryId: string, fallback = countryId): string => {
    const country = WORLD_COUNTRY_BY_ID.get(countryId);
    return String(country?.properties?.name || fallback);
};

/**
 * The projection every map instance shares. Same fit as the old per-instance `useMemo`, so
 * nothing you already have moves.
 */
export const WORLD_PROJECTION: GeoProjection = (() => {
    const projection = geoNaturalEarth1().fitExtent([[38, 34], [962, 482]], WORLD_VISIBLE_FEATURES);
    const [translateX, translateY] = projection.translate();
    projection.translate([translateX + 18, translateY]);
    return projection;
})();

export const WORLD_PATH = geoPath(WORLD_PROJECTION);

export const projectLonLat = (longitude: number, latitude: number): [number, number] | null => {
    const projected = WORLD_PROJECTION([longitude, latitude]);
    if (!projected || !Number.isFinite(projected[0]) || !Number.isFinite(projected[1])) return null;
    return [projected[0], projected[1]];
};

const collectionOf = (geometries: unknown[]) => ({ type: 'GeometryCollection', geometries } as any);

/** All land merged into one path. Used for the shelf halo, inner coast rim, grain clip and offset shadow. */
export const WORLD_LAND_PATH: string = WORLD_PATH(merge(WORLD_TOPOLOGY, drawableGeometries as any) as any) || '';

/** Only sizeable landmasses, so the coastal shelf does not put a glow blob around every islet. */
export const WORLD_SHELF_PATH: string = WORLD_PATH(merge(
    WORLD_TOPOLOGY,
    drawableGeometries.filter(geometry => geoArea(feature(WORLD_TOPOLOGY, geometry as any) as any) > 0.0015) as any
) as any) || '';

/** Interior borders only (shared arcs), one path. */
export const WORLD_BORDERS_PATH: string = WORLD_PATH(mesh(
    WORLD_TOPOLOGY,
    collectionOf(drawableGeometries),
    (a: any, b: any) => a !== b
) as any) || '';

export const WORLD_GRATICULE_PATH: string = WORLD_PATH(geoGraticule().step([20, 20])()) || '';

const countryPathCache = new Map<string, string>();
export const getCountryPath = (countryId: string): string => {
    const cached = countryPathCache.get(countryId);
    if (cached !== undefined) return cached;
    const country = WORLD_COUNTRY_BY_ID.get(countryId);
    const path = country ? (WORLD_PATH(country) || '') : '';
    countryPathCache.set(countryId, path);
    return path;
};

export interface RegionGeometry {
    path: string;
    countryCount: number;
    centroid: [number, number];
}

const regionGeometryCache = new Map<string, RegionGeometry>();
/** Merges a region's countries into one silhouette. Cached by the id list. */
export const getRegionGeometry = (countryIds: string[]): RegionGeometry => {
    const key = countryIds.join(',');
    const cached = regionGeometryCache.get(key);
    if (cached) return cached;
    const wanted = new Set(countryIds);
    const geometries = drawableGeometries.filter(geometry => wanted.has(formatWorldCountryId(geometry.id)));
    let result: RegionGeometry = { path: '', countryCount: geometries.length, centroid: [MAP_WIDTH / 2, MAP_BASE_HEIGHT / 2] };
    if (geometries.length > 0) {
        const merged = merge(WORLD_TOPOLOGY, geometries as any) as any;
        const centroid = WORLD_PATH.centroid(merged);
        result = {
            path: WORLD_PATH(merged) || '',
            countryCount: geometries.length,
            centroid: [
                Number.isFinite(centroid[0]) ? centroid[0] : MAP_WIDTH / 2,
                Number.isFinite(centroid[1]) ? centroid[1] : MAP_BASE_HEIGHT / 2,
            ],
        };
    }
    regionGeometryCache.set(key, result);
    return result;
};

const unassignedCache = new Map<string, string>();
/** Land that belongs to no region (drawn neutral underneath, so nothing can go missing). */
export const getUnassignedLandPath = (assignedCountryIds: ReadonlySet<string>): string => {
    const key = [...assignedCountryIds].sort().join(',');
    const cached = unassignedCache.get(key);
    if (cached !== undefined) return cached;
    const rest = drawableGeometries.filter(geometry => !assignedCountryIds.has(formatWorldCountryId(geometry.id)));
    const path = rest.length ? (WORLD_PATH(merge(WORLD_TOPOLOGY, rest as any) as any) || '') : '';
    unassignedCache.set(key, path);
    return path;
};

/** Projects the edges of a lon/lat box and returns its pixel bounds. */
export const boundsForLonLatBox = (box: LonLatBox): MapBounds => {
    const [[west, south], [east, north]] = box;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let step = 0; step <= 12; step += 1) {
        const t = step / 12;
        const samples: Array<[number, number]> = [
            [west + (east - west) * t, south],
            [west + (east - west) * t, north],
            [west, south + (north - south) * t],
            [east, south + (north - south) * t],
        ];
        samples.forEach(([lon, lat]) => {
            const point = projectLonLat(lon, lat);
            if (!point) return;
            x0 = Math.min(x0, point[0]); y0 = Math.min(y0, point[1]);
            x1 = Math.max(x1, point[0]); y1 = Math.max(y1, point[1]);
        });
    }
    if (!Number.isFinite(x0)) return [[0, 0], [MAP_WIDTH, MAP_BASE_HEIGHT]];
    return [[x0, y0], [x1, y1]];
};

/** Countries whose raw bounds span the antimeridian or a far-flung territory get a hand box. */
const COUNTRY_FIT_BOX: Record<string, LonLatBox> = {
    '840': [[-125, 24], [-66, 50]],
    '643': [[27, 41], [100, 72]],
    '242': [[176.5, -19.5], [180, -16]],
    '554': [[165, -48], [179, -34]],
    '250': [[-5, 42], [9, 51.5]],
    '578': [[4, 57.5], [31, 71.5]],
};

export const boundsForCountry = (countryId: string): MapBounds => {
    const handBox = COUNTRY_FIT_BOX[countryId];
    if (handBox) return boundsForLonLatBox(handBox);
    const country = WORLD_COUNTRY_BY_ID.get(countryId);
    if (!country) return [[MAP_WIDTH / 2 - 60, MAP_BASE_HEIGHT / 2 - 40], [MAP_WIDTH / 2 + 60, MAP_BASE_HEIGHT / 2 + 40]];
    const bounds = WORLD_PATH.bounds(country);
    if (bounds[1][0] - bounds[0][0] > MAP_WIDTH * 0.45) {
        const centroid = WORLD_PATH.centroid(country);
        return [[centroid[0] - 60, centroid[1] - 40], [centroid[0] + 60, centroid[1] + 40]];
    }
    return [[bounds[0][0], bounds[0][1]], [bounds[1][0], bounds[1][1]]];
};

/** Label anchors for countries whose centroid lands somewhere silly (Alaska drags the USA's north). */
const COUNTRY_LABEL_LONLAT: Record<string, [number, number]> = {
    '840': [-98, 39], '124': [-101, 57], '250': [2.5, 46.6], '643': [60, 60], '036': [134, -25],
    '360': [113, -2], '152': [-71, -35], '554': [172, -42], '826': [-1.5, 53.5], '578': [9, 61.5],
};

export const getCountryLabelPoint = (countryId: string): [number, number] | null => {
    const override = COUNTRY_LABEL_LONLAT[countryId];
    if (override) return projectLonLat(override[0], override[1]);
    const country = WORLD_COUNTRY_BY_ID.get(countryId);
    if (!country) return null;
    const centroid = WORLD_PATH.centroid(country);
    if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null;
    return [centroid[0], centroid[1]];
};

// The launch-market model uses ISO alpha-2 codes while world-atlas stores ISO
// numeric ids. Exact-name matching below keeps future countries working; these
// ids make the current opening markets unambiguous (US vs US territories, etc.).
export const WORLD_COUNTRY_NUMERIC_BY_ALPHA2: Record<string, string> = {
    AR: '032', AU: '036', BR: '076', CA: '124', CL: '152', CO: '170',
    DE: '276', EG: '818', ES: '724', FR: '250', GB: '826', ID: '360',
    IN: '356', IT: '380', JP: '392', KE: '404', KR: '410', MX: '484',
    NG: '566', NZ: '554', PH: '608', TH: '764', US: '840', ZA: '710',
};

const normalizeCountryName = (value: string): string => value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();

export interface WorldCountryCutout {
    id: string;
    name: string;
    path: string;
    projection: GeoProjection;
}

export function createWorldCountryCutout(
    countryCode: string,
    countryName: string,
    width = 100,
    height = 100,
): WorldCountryCutout | null {
    const wantedId = WORLD_COUNTRY_NUMERIC_BY_ALPHA2[countryCode.trim().toUpperCase()];
    const normalizedName = normalizeCountryName(countryName);
    const country = WORLD_FEATURES.features.find((candidate: any) => {
        if (wantedId && formatWorldCountryId(candidate.id) === wantedId) return true;
        return normalizeCountryName(String(candidate.properties?.name || '')) === normalizedName;
    });
    if (!country) return null;

    const projection = geoNaturalEarth1().fitExtent(
        [[7, 7], [width - 7, height - 7]],
        country,
    );
    const path = geoPath(projection)(country);
    if (!path) return null;

    return {
        id: formatWorldCountryId(country.id),
        name: String(country.properties?.name || countryName),
        path,
        projection,
    };
}
