import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorldMap } from '../components/studio-finance/components/build/WorldMap';
import {
  createStudioFinanceMapModel,
  financeCountryMapId,
} from '../components/studio-finance/components/build/studioFinanceMap';
import type { BuildData, BuildDraft } from '../components/studio-finance/finance/build';
import { regionView } from '../views/lifestyle/business/components/regionMapView';

const data = {
  company: { name: 'Actor Empire', week: 8, brandHex: '#8b5cf6' },
  regions: [
    { id: 'NORTH_AMERICA', name: 'North America', line: '' },
    { id: 'EUROPE', name: 'Europe', line: '' },
  ],
  countries: [
    { id: 'country:US', regionId: 'NORTH_AMERICA', name: 'United States', code: 'US', shape: 'US', opening: true, note: '' },
    { id: 'country:CA', regionId: 'NORTH_AMERICA', name: 'Canada', code: 'CA', shape: 'CA', opening: false, note: '' },
    { id: 'country:GB', regionId: 'EUROPE', name: 'United Kingdom', code: 'GB', shape: 'GB', opening: true, note: '' },
  ],
  cities: [
    { id: 'LA', name: 'Los Angeles', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 34.0522, lng: -118.2437 }, plot: { x: 15, y: 35 }, note: '' },
    { id: 'TOR', name: 'Toronto', countryId: 'country:CA', country: 'Canada', code: 'CA', coord: { lat: 43.6532, lng: -79.3832 }, plot: { x: 20, y: 30 }, note: '' },
    { id: 'LDN', name: 'London', countryId: 'country:GB', country: 'United Kingdom', code: 'GB', coord: { lat: 51.5072, lng: -0.1276 }, plot: { x: 48, y: 28 }, recommended: true, note: '' },
  ],
} as BuildData;

const draft = {
  facilities: [
    { id: 'fac-la', cityId: 'LA', built: true },
    { id: 'fac-tor', cityId: 'TOR', built: false },
  ],
} as BuildDraft;

const model = createStudioFinanceMapModel(
  data,
  draft,
  'TOR',
  regionView('NORTH_AMERICA'),
  true,
);

assert.deepEqual(model.locationPins.map(pin => pin.id), ['LA', 'TOR', 'LDN']);
assert.equal(model.locationPins.find(pin => pin.id === 'LA')?.countryId, '840');
assert.equal(model.locationPins.find(pin => pin.id === 'TOR')?.state, 'active');
assert.equal(model.locationPins.find(pin => pin.id === 'LA')?.state, 'built');
assert.equal(model.locationPins.find(pin => pin.id === 'LDN')?.state, 'recommended');
assert.equal(model.locationPins.find(pin => pin.id === 'TOR')?.built, false);
assert.deepEqual(model.locationRoutes, [{ fromId: 'LA', toId: 'TOR', planned: true, animated: false }]);
assert.deepEqual(model.selectedRegionIds, ['NORTH_AMERICA']);
assert.deepEqual(model.marketRegionIds, ['NORTH_AMERICA', 'EUROPE']);
assert.equal(model.activeRegionId, 'NORTH_AMERICA');
assert.equal(model.interaction, 'drilldown');
assert.equal(model.maximumViewLevel, 'country');
assert.equal(model.minimumPinViewLevel, 'region');
assert.equal(financeCountryMapId(data, '124'), 'country:CA');

const markup = renderToStaticMarkup(
  <WorldMap data={data} draft={draft} services={[]} selectedCityId="TOR" showNetworkRoutes />,
);
assert.match(markup, /aria-label="Infrastructure scout map: 2 sites placed"/);

console.log('MAP4 Studio Finance map adapter audit passed.');
