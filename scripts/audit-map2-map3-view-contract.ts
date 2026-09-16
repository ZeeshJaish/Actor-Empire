import assert from 'node:assert/strict';
import {
    countryView,
    regionView,
    resolveRegionMapCountryTap,
    resolveRegionMapRegionTap,
} from '../views/lifestyle/business/components/regionMapView';

assert.deepEqual(
    resolveRegionMapRegionTap('EUROPE', 'navigate'),
    { nextView: regionView('EUROPE'), shouldSelectRegion: false },
);
assert.deepEqual(
    resolveRegionMapRegionTap('EUROPE', 'toggle'),
    { nextView: regionView('EUROPE'), shouldSelectRegion: true },
);
assert.deepEqual(
    resolveRegionMapCountryTap(regionView('NORTH_AMERICA'), '124', 'country'),
    countryView('124', 'NORTH_AMERICA'),
);
assert.deepEqual(
    resolveRegionMapCountryTap(regionView('NORTH_AMERICA'), '124', 'region'),
    regionView('NORTH_AMERICA'),
);

console.log('MAP2 + MAP3 shared view contract audit passed.');
