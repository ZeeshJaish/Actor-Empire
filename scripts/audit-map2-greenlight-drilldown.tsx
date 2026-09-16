import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    PRODUCTION_LOCATION_CATALOG,
    PRODUCTION_LOCATIONS_BY_CONTINENT,
} from '../services/productionLocations';
import { GreenlightLocationStep } from '../views/lifestyle/business/components/GreenlightLocationStep';
import { InteractiveRegionMapV2 } from '../views/lifestyle/business/components/InteractiveRegionMapV2';
import { createGreenlightLocationMapModel } from '../views/lifestyle/business/components/greenlightLocationMap';
import { regionView, WORLD_VIEW } from '../views/lifestyle/business/components/regionMapView';

const worldModel = createGreenlightLocationMapModel(PRODUCTION_LOCATION_CATALOG, ['TOR', 'BOM'], WORLD_VIEW);
assert.equal(worldModel.interaction, 'drilldown');
assert.equal(worldModel.maximumViewLevel, 'region');
assert.equal(worldModel.minimumPinViewLevel, 'region');
assert.deepEqual(worldModel.selectedRegionIds, ['NORTH_AMERICA', 'ASIA']);
assert.equal(worldModel.locationPins.find(pin => pin.id === 'TOR')?.selected, true);
assert.equal(worldModel.locationPins.find(pin => pin.id === 'TOR')?.badge, undefined);
assert.deepEqual(worldModel.visibleLocationIds, []);

const regionModel = createGreenlightLocationMapModel(PRODUCTION_LOCATION_CATALOG, ['TOR', 'BOM'], regionView('NORTH_AMERICA'));
assert.deepEqual(regionModel.visibleLocationIds, ['LA', 'ATL', 'NYC', 'VAN', 'MEX', 'TOR']);

const emptyMarkup = renderToStaticMarkup(
    <GreenlightLocationStep
        selectedIds={[]}
        onChange={() => undefined}
        locations={PRODUCTION_LOCATIONS_BY_CONTINENT}
        onBack={() => undefined}
        onNext={() => undefined}
        formatMoney={value => `$${value}`}
    />,
);
assert.match(emptyMarkup, />Back<\/button>/);
assert.match(emptyMarkup, />Next: Movie Setup<\/button>/);
assert.match(emptyMarkup, /disabled=""/);
assert.match(emptyMarkup, /0 selected/);
assert.match(emptyMarkup, /Select a region on the map/);
assert.doesNotMatch(emptyMarkup, /Show Asia on map/);
assert.doesNotMatch(emptyMarkup, /All production cities/);

const selectedMarkup = renderToStaticMarkup(
    <GreenlightLocationStep
        selectedIds={['TOR']}
        onChange={() => undefined}
        locations={PRODUCTION_LOCATIONS_BY_CONTINENT}
        onBack={() => undefined}
        onNext={() => undefined}
        formatMoney={value => `$${value}`}
    />,
);
assert.doesNotMatch(selectedMarkup, />Selected locations</);
assert.match(selectedMarkup, /data-greenlight-map-toolbar="true" data-greenlight-selected-locations="true"/);
assert.match(selectedMarkup, /1 selected/);
assert.doesNotMatch(selectedMarkup, /Focus map on Toronto/);
assert.doesNotMatch(selectedMarkup, /Remove Toronto/);
assert.doesNotMatch(selectedMarkup, /aria-label="Toronto"/);
assert.match(selectedMarkup, /Clear all locations/);

const focusedCityMarkup = renderToStaticMarkup(
    <InteractiveRegionMapV2
        selectedRegionIds={['NORTH_AMERICA']}
        locationPins={[
            {
                id: 'VAN',
                name: 'Vancouver',
                x: 12,
                y: 28,
                longitude: -123.1207,
                latitude: 49.2827,
                selected: true,
                regionId: 'NORTH_AMERICA',
                countryId: '124',
            },
            {
                id: 'TOR',
                name: 'Toronto',
                x: 20,
                y: 30,
                longitude: -79.3832,
                latitude: 43.6532,
                selected: false,
                regionId: 'NORTH_AMERICA',
                countryId: '124',
            },
            {
                id: 'LA',
                name: 'Los Angeles',
                x: 14,
                y: 34,
                longitude: -118.2437,
                latitude: 34.0522,
                selected: true,
                regionId: 'NORTH_AMERICA',
                countryId: '840',
            },
            {
                id: 'MEX',
                name: 'Mexico City',
                x: 18,
                y: 44,
                longitude: -99.1332,
                latitude: 19.4326,
                selected: false,
                regionId: 'NORTH_AMERICA',
                countryId: '484',
            },
        ]}
        interaction="drilldown"
        maximumViewLevel="region"
        minimumPinViewLevel="region"
        focusedLocationId="VAN"
        showCountryLabels={false}
        highlightMappedCountries={false}
        showCountryFocus={false}
        view={regionView('NORTH_AMERICA')}
    />,
);
assert.doesNotMatch(focusedCityMarkup, /class="irm-country-lbl"/);
assert.doesNotMatch(focusedCityMarkup, />Canada</);
assert.match(focusedCityMarkup, /World.*North America.*Vancouver/);
assert.match(focusedCityMarkup, /class="irm-pin-lbl"[^>]*>Vancouver</);
assert.match(focusedCityMarkup, /aria-label="Toronto"/);
assert.match(focusedCityMarkup, /aria-label="Los Angeles"/);
assert.match(focusedCityMarkup, /aria-label="Mexico City"/);
assert.doesNotMatch(focusedCityMarkup, /irm-pin-context/);

const selectedWorldPinMarkup = renderToStaticMarkup(
    <InteractiveRegionMapV2
        selectedRegionIds={['NORTH_AMERICA']}
        locationPins={[
            {
                id: 'TOR',
                name: 'Toronto',
                x: 20,
                y: 30,
                longitude: -79.3832,
                latitude: 43.6532,
                selected: true,
                regionId: 'NORTH_AMERICA',
                countryId: '124',
            },
            {
                id: 'BOM',
                name: 'Mumbai',
                x: 72,
                y: 48,
                longitude: 72.8777,
                latitude: 19.076,
                selected: false,
                regionId: 'ASIA',
                countryId: '356',
            },
        ]}
        interaction="drilldown"
        minimumPinViewLevel="country"
        showSelectedPinsAcrossViews
        view={WORLD_VIEW}
    />,
);
assert.match(selectedWorldPinMarkup, /aria-label="Toronto"/);
assert.doesNotMatch(selectedWorldPinMarkup, /aria-label="Mumbai"/);

console.log('MAP2 Greenlight drill-down integration audit passed.');
