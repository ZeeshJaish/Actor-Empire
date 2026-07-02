import fs from 'node:fs';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const read = (path) => fs.readFileSync(path, 'utf8');

const mapPath = 'views/lifestyle/business/components/InteractiveRegionMap.tsx';
const releasePath = 'views/lifestyle/business/ReleaseWizard.tsx';
const greenlightPath = 'views/lifestyle/business/GreenlightWizard.tsx';

assert(fs.existsSync(mapPath), 'InteractiveRegionMap component is missing.');

const mapSource = read(mapPath);
const releaseSource = read(releasePath);
const greenlightSource = read(greenlightPath);

[
  'interactive-region-map',
  'viewBox="0 0 1000 520"',
  'role="button"',
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
  'world-atlas/countries-110m.json',
  'topojson-client',
  '<clipPath',
  'WORLD_VISIBLE_FEATURES',
  'mapProjection',
  'locationPins',
  'longitude',
  'latitude',
  'onSelectLocation',
  'visualTone',
  'BoxOfficeRegionId',
  'REGION_MAP_OVERLAYS'
].forEach(token => {
  assert(mapSource.includes(token), `InteractiveRegionMap should include ${token}.`);
});

assert(!mapSource.includes('<img'), 'The region map should be native SVG, not a static image.');
assert(!mapSource.includes('region-map-radar-sweep'), 'The region map should not feel like a war-room radar dashboard.');
assert(!mapSource.includes('region-map-sun-glow'), 'The region map should not keep the top-right sun glare overlay.');
assert(!mapSource.includes("'POLAR'"), 'The interactive map should not render Antarctica as a playable release region.');
assert(!mapSource.includes('https://'), 'The region map should not depend on CDN or runtime network fetches.');
assert(!mapSource.includes('fetch('), 'The region map should use bundled local topology, not runtime fetches.');
assert(!mapSource.includes('market weight'), 'The map should not expose internal market-weight jargon to players.');

[
  'InteractiveRegionMap',
  'selectedRegionIds',
  'getDefaultReleaseRegionIds',
  'getRegionMapSummary',
  'Distribution map',
  'Region preview',
  'Tap regions'
].forEach(token => {
  assert(releaseSource.includes(token), `ReleaseWizard should include ${token}.`);
});

[
  'InteractiveRegionMap',
  'locationPins',
  'longitude: loc.longitude',
  'latitude: loc.latitude',
  'onSelectLocation',
  'visualTone="production"',
  'GLOBAL PRODUCTION NETWORK'
].forEach(token => {
  assert(greenlightSource.includes(token), `GreenlightWizard should include ${token}.`);
});

assert(!greenlightSource.includes('Simplified World Map Paths'), 'Greenlight should not keep the old low-quality local map.');

console.log('Region map UI audit passed.');
