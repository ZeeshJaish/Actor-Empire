import assert from 'node:assert/strict';
import {
    REGION_MAP_OVERLAYS,
    getRegionIdForCountry,
} from '../services/regionMap';
import {
    boundsForCountry,
    boundsForLonLatBox,
    countryDisplayName,
    formatWorldCountryId,
    getCountryPath,
} from '../views/lifestyle/business/components/worldMapDetailedGeometry';

assert.equal(getRegionIdForCountry('356'), 'ASIA');
assert.equal(getRegionIdForCountry('840'), 'NORTH_AMERICA');
assert.equal(countryDisplayName('356'), 'India');
assert.equal(formatWorldCountryId(36), '036');
assert.ok(getCountryPath('840').length > 1000);

const countryBounds = boundsForCountry('840');
assert.ok(countryBounds[1][0] > countryBounds[0][0]);
assert.ok(countryBounds[1][1] > countryBounds[0][1]);

const boxBounds = boundsForLonLatBox([[-125, 24], [-66, 50]]);
assert.ok(boxBounds[1][0] > boxBounds[0][0]);
assert.ok(boxBounds[1][1] > boxBounds[0][1]);

assert.equal(REGION_MAP_OVERLAYS.every(region => region.fitBox.length === 2), true);

console.log('Region map v2 geometry audit passed.');
