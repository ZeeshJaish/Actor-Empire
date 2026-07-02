import type { BoxOfficeRegionId, ScreeningStrategy } from '../types';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-110m.json';
import { BOX_OFFICE_REGIONS } from '../services/cinemaChains';
import {
    REGION_MAP_OVERLAYS,
    getDefaultReleaseRegionIds,
    getRegionMapOverlay,
    getRegionMapSummary,
    normalizeReleaseRegionIds
} from '../services/regionMap';

const assert = (condition: unknown, message: string): void => {
    if (!condition) {
        throw new Error(message);
    }
};

const regionIds = BOX_OFFICE_REGIONS.map(region => region.id);
const overlayIds = REGION_MAP_OVERLAYS.map(region => region.id);
const expectedRegionIds: BoxOfficeRegionId[] = [
    'NORTH_AMERICA',
    'SOUTH_AMERICA',
    'EUROPE',
    'ASIA',
    'AFRICA',
    'OCEANIA'
];
const topology = countriesTopology as any;
const topologyCountries = topology.objects.countries.geometries as Array<{ id: string | number }>;
const topologyFeatures = feature(topology, topology.objects.countries) as any;
const normalizeCountryId = (countryId: string | number): string => String(countryId).padStart(3, '0');
const visibleTopologyFeatures = {
    ...topologyFeatures,
    features: topologyFeatures.features.filter((country: { id: string | number }) => normalizeCountryId(country.id) !== '010')
};
const projection = geoNaturalEarth1().fitExtent([[38, 34], [962, 482]], visibleTopologyFeatures);
const [translateX, translateY] = projection.translate();
projection.translate([translateX + 18, translateY]);
const pathGenerator = geoPath(projection);

assert(regionIds.length === 6, 'The distribution map should use exactly six playable continent-scale regions.');
assert(expectedRegionIds.every(regionId => regionIds.includes(regionId)), 'The six playable continent-scale regions must be present.');
assert(REGION_MAP_OVERLAYS.length === BOX_OFFICE_REGIONS.length, 'Every box office region needs one map overlay.');
assert(new Set(overlayIds).size === overlayIds.length, 'Region map overlays must be unique.');
assert(!overlayIds.includes('CHINA' as BoxOfficeRegionId), 'Country-level overlays should be folded into continent-scale regions.');
assert(!overlayIds.includes('UK_IRELAND' as BoxOfficeRegionId), 'Small market overlays should be folded into continent-scale regions.');
assert(!overlayIds.includes('POLAR' as unknown as BoxOfficeRegionId), 'Antarctica / polar overlays should not be part of the box office release map.');
assert(!REGION_MAP_OVERLAYS.some(overlay => overlay.countryIds.includes('010')), 'Antarctica country id should not render as a release region.');

for (const regionId of regionIds) {
    const overlay = getRegionMapOverlay(regionId);
    assert(overlay, `Missing map overlay for ${regionId}.`);
    assert(overlay!.path.trim().startsWith('M'), `${regionId} overlay path must be a valid SVG path.`);
    assert(overlay!.labelX >= 0 && overlay!.labelX <= 1000, `${regionId} labelX must sit inside the world map viewBox.`);
    assert(overlay!.labelY >= 0 && overlay!.labelY <= 520, `${regionId} labelY must sit inside the world map viewBox.`);
    assert(/^#[0-9a-f]{6}$/i.test(overlay!.accent), `${regionId} needs a hex accent color.`);
    assert(overlay!.countryIds.length > 0, `${regionId} needs real-world country ids for the Natural Earth renderer.`);
    assert(overlay!.countryIds.every(countryId => /^\d{3}$/.test(countryId)), `${regionId} country ids must use three-digit ISO numeric strings.`);
    const mappedCountries = topologyCountries.filter(country => new Set(overlay!.countryIds).has(normalizeCountryId(country.id)));
    assert(mappedCountries.length > 0, `${regionId} country ids must match bundled Natural Earth countries.`);
    const projectedRegionPath = pathGenerator(merge(topology, mappedCountries as any) as any);
    assert(projectedRegionPath && projectedRegionPath.startsWith('M'), `${regionId} must generate a projected Natural Earth SVG path.`);
}

for (const overlayId of overlayIds) {
    assert(regionIds.includes(overlayId), `Unknown overlay region ${overlayId}.`);
}

const regionalDefaults = getDefaultReleaseRegionIds('REGIONAL');
const nationalDefaults = getDefaultReleaseRegionIds('NATIONAL');
const internationalDefaults = getDefaultReleaseRegionIds('INTERNATIONAL');

assert(regionalDefaults.includes('NORTH_AMERICA'), 'Regional release defaults should include North America.');
assert(regionalDefaults.length < nationalDefaults.length, 'National release should cover more regions than regional.');
assert(nationalDefaults.length < internationalDefaults.length, 'International release should cover more regions than national.');
assert(internationalDefaults.length === BOX_OFFICE_REGIONS.length, 'International release should light up every release region.');

const allStrategies: ScreeningStrategy[] = ['REGIONAL', 'NATIONAL', 'INTERNATIONAL'];
for (const strategy of allStrategies) {
    const defaults = getDefaultReleaseRegionIds(strategy);
    assert(defaults.every(regionId => regionIds.includes(regionId)), `${strategy} defaults must only use known regions.`);
}

const summary = getRegionMapSummary(['NORTH_AMERICA', 'ASIA'] as BoxOfficeRegionId[]);
assert(summary.regionCount === 2, 'Region summary should count selected regions.');
assert(summary.marketWeight > 2, 'Region summary should add market weights.');
assert(summary.shortLabels.includes('NA') && summary.shortLabels.includes('AS'), 'Region summary should expose short labels for UI chips.');

const migratedRegions = normalizeReleaseRegionIds(['CHINA', 'UK_IRELAND', 'LATIN_AMERICA', 'NORTH_AMERICA']);
assert(migratedRegions.includes('ASIA'), 'Legacy China selections should fold into Asia.');
assert(migratedRegions.includes('EUROPE'), 'Legacy UK / Ireland selections should fold into Europe.');
assert(migratedRegions.includes('SOUTH_AMERICA'), 'Legacy Latin America selections should fold into South America.');
assert(migratedRegions.includes('NORTH_AMERICA'), 'Existing North America selections should remain stable.');
assert(new Set(migratedRegions).size === migratedRegions.length, 'Normalized release regions should be unique.');

console.log('Region map audit passed.');
