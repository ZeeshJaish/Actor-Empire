import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const read = (path) => fs.readFileSync(path, 'utf8');

const mapPath = 'views/lifestyle/business/components/InteractiveRegionMap.tsx';
const legacyMapPath = 'views/lifestyle/business/components/InteractiveRegionMapLegacy.tsx';
const detailedMapPath = 'views/lifestyle/business/components/InteractiveRegionMapV2.tsx';
const compactGeometryPath = 'views/lifestyle/business/components/worldMapGeometry.ts';
const detailedGeometryPath = 'views/lifestyle/business/components/worldMapDetailedGeometry.ts';
const releasePath = 'views/lifestyle/business/ReleaseWizard.tsx';
const theatricalDeskPath = 'views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx';
const greenlightPath = 'views/lifestyle/business/GreenlightWizard.tsx';
const greenlightLocationPath = 'views/lifestyle/business/components/GreenlightLocationStep.tsx';
const greenlightLocationMapPath = 'views/lifestyle/business/components/greenlightLocationMap.ts';

assert(fs.existsSync(mapPath), 'InteractiveRegionMap component is missing.');

const mapSource = read(mapPath);
const legacyMapSource = read(legacyMapPath);
const detailedMapSource = read(detailedMapPath);
const compactGeometrySource = read(compactGeometryPath);
const detailedGeometrySource = read(detailedGeometryPath);
const rendererSource = `${legacyMapSource}\n${detailedMapSource}`;
const geometrySource = `${compactGeometrySource}\n${detailedGeometrySource}`;
const releaseSource = `${read(releasePath)}\n${read(theatricalDeskPath)}`;
const greenlightSource = read(greenlightPath);
const greenlightLocationSource = `${read(greenlightLocationPath)}\n${read(greenlightLocationMapPath)}`;

[
  "role={cinematicMode ? undefined : 'button'}",
  'aria-pressed',
  'onSelectRegion',
  'selectedRegionIds',
  'locationPins',
  'onSelectLocation',
  'visualTone',
  'BoxOfficeRegionId',
  'REGION_MAP_OVERLAYS'
].forEach(token => {
  assert(rendererSource.includes(token), `InteractiveRegionMap renderers should include ${token}.`);
});

[
  'interactive-region-map',
  'viewBox={`0 ${(520 - frameHeight) / 2} 1000 ${frameHeight}`}',
  "role={cinematicMode ? undefined : 'button'}",
  'aria-pressed',
  'onSelectRegion',
  'selectedRegionIds',
  'region-map-hit-area',
  'region-map-label',
  'region-map-landmass',
  'region-map-country-topology',
  'region-map-route-arc',
  'region-map-location-dot',
  'region-map-continent-name',
  'geoNaturalEarth1',
  '<clipPath',
  'WORLD_VISIBLE_FEATURES',
  'mapProjection',
  'locationPins',
  'longitude',
  'latitude',
  'onSelectLocation',
  'visualTone'
].forEach(token => {
  assert(legacyMapSource.includes(token), `Legacy map fallback should include ${token}.`);
});

assert(compactGeometrySource.includes('world-atlas/countries-110m.json'), 'Legacy geometry should retain the compact 110m atlas.');
assert(detailedGeometrySource.includes('world-atlas/countries-50m.json'), 'Detailed geometry should use the local 50m atlas.');
assert(geometrySource.includes('topojson-client'), 'Map geometry should be generated from bundled topology.');

[
  "lazy(async () =>",
  "import('./InteractiveRegionMapV2')",
  'Suspense',
  'InteractiveRegionMapLegacy'
].forEach(token => {
  assert(mapSource.includes(token), `InteractiveRegionMap boundary should include ${token}.`);
});

[
  'useId',
  'mapInstanceId',
  'svgIds',
  'regionMapOcean-${mapInstanceId}',
  'regionMapClip-${mapInstanceId}-${regionId}'
].forEach(token => {
  assert(legacyMapSource.includes(token), `Legacy map fallback should namespace SVG resource ${token}.`);
});

assert(!rendererSource.includes('id="regionMapOcean"'), 'Map gradients must not use a document-global static id.');
assert(!rendererSource.includes('id="regionMapSoftShadow"'), 'Map filters must not use a document-global static id.');

assert(!rendererSource.includes('<img'), 'The region map should be native SVG, not a static image.');
assert(!rendererSource.includes('region-map-radar-sweep'), 'The region map should not feel like a war-room radar dashboard.');
assert(!rendererSource.includes('region-map-sun-glow'), 'The region map should not keep the top-right sun glare overlay.');
assert(!rendererSource.includes("'POLAR'"), 'The interactive map should not render Antarctica as a playable release region.');
assert(!rendererSource.includes('https://'), 'The region map should not depend on CDN or runtime network fetches.');
assert(!rendererSource.includes('fetch('), 'The region map should use bundled local topology, not runtime fetches.');
assert(!rendererSource.includes('market weight'), 'The map should not expose internal market-weight jargon to players.');
assert(!detailedMapSource.includes('players here'), 'The shared map must not expose demo player counts.');
assert(!detailedMapSource.includes('mapPlaces'), 'The shared map must not depend on demo place data.');

[
  'InteractiveRegionMap',
  'selectedRegionIds',
  'getDefaultReleaseRegionIds',
  'getRegionMapSummary',
  'Distribution map',
  'Tap the markets'
].forEach(token => {
  assert(releaseSource.includes(token), `ReleaseWizard should include ${token}.`);
});

[
  'InteractiveRegionMap',
  'locationPins',
  'longitude: location.longitude',
  'latitude: location.latitude',
  'onSelectLocation',
  'visualTone="release"',
  'focusedLocationId',
  'showCountryLabels={false}',
  'highlightMappedCountries={false}',
  'showCountryFocus={false}',
  'data-greenlight-map-toolbar',
  'data-greenlight-selected-locations',
  'data-greenlight-selected-more',
  'Production world',
  'Select a region on the map',
  'Change production region',
  'Production cities in'
].forEach(token => {
  assert(greenlightLocationSource.includes(token), `Greenlight location step should include ${token}.`);
});

assert(!greenlightSource.includes('Simplified World Map Paths'), 'Greenlight should not keep the old low-quality local map.');
assert(!greenlightLocationSource.includes('Simplified World Map Paths'), 'Greenlight location step should not keep the old low-quality local map.');

console.log('Region map UI audit passed.');
