import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WORLD_VIEW, regionView } from '../views/lifestyle/business/components/regionMapView';
import { TheatricalDeskStep, type TheatricalRegionModel } from '../views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep';
import { createTheatricalRegionMapModel } from '../views/lifestyle/business/release-strategy-transplant/theatricalRegionMap';

const regions: TheatricalRegionModel[] = [
    {
        id: 'NORTH_AMERICA',
        label: 'North America',
        shortLabel: 'NA',
        selected: true,
        marketWeight: 0.4,
        chains: [],
    },
    {
        id: 'EUROPE',
        label: 'Europe',
        shortLabel: 'EU',
        selected: false,
        marketWeight: 0.25,
        chains: [],
    },
];

const worldModel = createTheatricalRegionMapModel(regions, WORLD_VIEW);
assert.deepEqual(worldModel.selectedRegionIds, ['NORTH_AMERICA']);
assert.equal(worldModel.interaction, 'drilldown');
assert.equal(worldModel.maximumViewLevel, 'region');
assert.equal(worldModel.drilldownRegionSelection, 'toggle');
assert.deepEqual(worldModel.view, WORLD_VIEW);
assert.equal(
    worldModel.showCountryLabels,
    false,
    'Theatrical Release should keep the map at region-level presentation and omit country names.',
);

const focusedModel = createTheatricalRegionMapModel(regions, regionView('EUROPE'));
assert.deepEqual(focusedModel.view, regionView('EUROPE'));
assert.deepEqual(focusedModel.selectedRegionIds, ['NORTH_AMERICA']);

const emptyMarkup = renderToStaticMarkup(
    <TheatricalDeskStep
        regions={regions.map(region => ({ ...region, selected: false }))}
        selectedRegionCount={0}
        totalScreens={0}
        bookingCost={0}
        studioShare={0.5}
        expectedFootfall={0}
        openingRange={[0, 0]}
        onToggleRegion={() => undefined}
        onToggleChain={() => undefined}
        onAutoBuild={() => undefined}
        onContinue={() => undefined}
        onBack={() => undefined}
    />,
);
assert.match(emptyMarkup, />AUTO-BUILD FOOTPRINT</);
assert.match(emptyMarkup, />CINEMA PARTNERS</);
assert.match(emptyMarkup, />BACK</);
assert.match(emptyMarkup, />CONTINUE</);
assert.match(emptyMarkup, /disabled=""/);
assert.match(emptyMarkup, /data-map-navigation-toolbar="theatrical"/);
assert.match(emptyMarkup, />THEATRICAL WORLD</);
assert.match(emptyMarkup, />0 SELECTED</);
assert.match(emptyMarkup, />50%<\/i>/);
assert.doesNotMatch(emptyMarkup, /50¢/);

console.log('MAP3 theatrical release region-focus audit passed.');
