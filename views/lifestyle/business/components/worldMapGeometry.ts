import { geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-110m.json';

export const WORLD_TOPOLOGY = countriesTopology as any;
export const WORLD_COUNTRIES = WORLD_TOPOLOGY.objects.countries.geometries as Array<{
    id: string | number;
    properties?: { name?: string };
}>;

export const formatWorldCountryId = (countryId: string | number): string => String(countryId).padStart(3, '0');

export const WORLD_FEATURES = feature(WORLD_TOPOLOGY, WORLD_TOPOLOGY.objects.countries) as any;
export const WORLD_VISIBLE_FEATURES = {
    ...WORLD_FEATURES,
    features: WORLD_FEATURES.features.filter(
        (country: { id: string | number }) => formatWorldCountryId(country.id) !== '010',
    ),
};

// The launch-market model uses ISO alpha-2 codes while world-atlas stores ISO
// numeric ids. Exact-name matching below keeps future countries working; these
// ids make the current opening markets unambiguous (US vs US territories, etc.).
const WORLD_COUNTRY_NUMERIC_BY_ALPHA2: Record<string, string> = {
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
