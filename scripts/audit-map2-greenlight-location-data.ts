import assert from 'node:assert/strict';
import { getRegionIdForCountry } from '../services/regionMap';
import {
    PRODUCTION_LOCATION_CATALOG,
    getProductionLocation,
} from '../services/productionLocations';
import { countryView, regionView, WORLD_VIEW } from '../views/lifestyle/business/components/regionMapView';
import {
    createGreenlightLocationMapModel,
    createGreenlightLocationPins,
    getGreenlightVisibleLocations,
    toggleProductionLocationSelection,
} from '../views/lifestyle/business/components/greenlightLocationMap';

const toronto = getProductionLocation('TOR');
assert.ok(toronto);
assert.deepEqual(
    { countryId: toronto.countryId, countryCode: toronto.countryCode, countryName: toronto.countryName },
    { countryId: '124', countryCode: 'CA', countryName: 'Canada' },
);

assert.equal(PRODUCTION_LOCATION_CATALOG.every(location => /^\d{3}$/.test(location.countryId)), true);
assert.equal(PRODUCTION_LOCATION_CATALOG.every(location => /^[A-Z]{2}$/.test(location.countryCode)), true);
assert.equal(PRODUCTION_LOCATION_CATALOG.every(location => getRegionIdForCountry(location.countryId) === location.regionId), true);
assert.equal(new Set(PRODUCTION_LOCATION_CATALOG.map(location => location.id)).size, PRODUCTION_LOCATION_CATALOG.length);

const originalSelection = ['TOR'];
assert.deepEqual(toggleProductionLocationSelection(originalSelection, 'BOM'), ['TOR', 'BOM']);
assert.deepEqual(originalSelection, ['TOR'], 'Selection helper must not mutate Greenlight state input.');
assert.deepEqual(toggleProductionLocationSelection(['TOR', 'BOM'], 'TOR'), ['BOM']);

const pins = createGreenlightLocationPins(PRODUCTION_LOCATION_CATALOG, ['TOR']);
assert.deepEqual(
    pins.find(pin => pin.id === 'TOR'),
    {
        id: 'TOR', name: 'Toronto', x: 20, y: 30,
        longitude: -79.3832, latitude: 43.6532,
        selected: true, regionId: 'NORTH_AMERICA', countryId: '124', countryCode: 'CA',
    },
);

assert.deepEqual(
    getGreenlightVisibleLocations(PRODUCTION_LOCATION_CATALOG, 'NA', countryView('124')).map(item => item.id),
    ['LA', 'ATL', 'NYC', 'VAN', 'MEX', 'TOR'],
);
assert.deepEqual(
    getGreenlightVisibleLocations(PRODUCTION_LOCATION_CATALOG, 'NA', regionView('NORTH_AMERICA')).map(item => item.id),
    ['LA', 'ATL', 'NYC', 'VAN', 'MEX', 'TOR'],
);
assert.deepEqual(getGreenlightVisibleLocations(PRODUCTION_LOCATION_CATALOG, null, WORLD_VIEW), []);

const countryModel = createGreenlightLocationMapModel(PRODUCTION_LOCATION_CATALOG, ['TOR'], countryView('124'));
assert.deepEqual(countryModel.selectedRegionIds, ['NORTH_AMERICA']);
assert.deepEqual(countryModel.visibleLocationIds, ['LA', 'ATL', 'NYC', 'VAN', 'MEX', 'TOR']);
assert.equal(countryModel.locationPins.find(pin => pin.id === 'TOR')?.selected, true);
assert.equal(countryModel.locationPins.find(pin => pin.id === 'BOM')?.countryId, '356');

console.log('MAP2 Greenlight location data audit passed.');
