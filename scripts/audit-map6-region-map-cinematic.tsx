import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
    RegionMapLocationPin,
    RegionMapLocationRoute,
} from '../services/regionMap';
import { InteractiveRegionMapLegacy } from '../views/lifestyle/business/components/InteractiveRegionMapLegacy';
import { InteractiveRegionMapV2 } from '../views/lifestyle/business/components/InteractiveRegionMapV2';
import {
    createRegionMapCinematicTimeline,
    resolveRegionMapCinematicFrame,
} from '../views/lifestyle/business/components/regionMapCinematic';

const pins: RegionMapLocationPin[] = [
    {
        id: 'la',
        name: 'Los Angeles',
        x: 16,
        y: 42,
        longitude: -118.2437,
        latitude: 34.0522,
        regionId: 'NORTH_AMERICA',
        countryId: '840',
        state: 'built',
    },
    {
        id: 'tor',
        name: 'Toronto',
        x: 23,
        y: 31,
        longitude: -79.3832,
        latitude: 43.6532,
        regionId: 'NORTH_AMERICA',
        countryId: '124',
        state: 'built',
    },
    {
        id: 'ldn',
        name: 'London',
        x: 49,
        y: 28,
        longitude: -0.1276,
        latitude: 51.5072,
        regionId: 'EUROPE',
        countryId: '826',
        state: 'built',
    },
];

const routes: RegionMapLocationRoute[] = [
    { fromId: 'la', toId: 'tor', animated: true },
    { fromId: 'la', toId: 'ldn', animated: true },
];

const timeline = createRegionMapCinematicTimeline(pins, routes, 4_000);

assert.deepEqual(timeline.frames.map(frame => frame.atMs), [0, 1_000, 2_000, 3_000, 4_000]);
assert.deepEqual(timeline.frames[0], {
    atMs: 0,
    view: { level: 'world', regionId: null, countryId: null },
    visiblePinIds: [],
    visibleRouteIds: [],
    complete: false,
});
assert.deepEqual(timeline.frames[1], {
    atMs: 1_000,
    view: { level: 'country', regionId: 'NORTH_AMERICA', countryId: '840' },
    visiblePinIds: ['la'],
    visibleRouteIds: [],
    complete: false,
});
assert.deepEqual(timeline.frames[2], {
    atMs: 2_000,
    view: { level: 'country', regionId: 'NORTH_AMERICA', countryId: '124' },
    visiblePinIds: ['la', 'tor'],
    visibleRouteIds: ['la->tor'],
    complete: false,
});
assert.deepEqual(timeline.frames[3], {
    atMs: 3_000,
    view: { level: 'country', regionId: 'EUROPE', countryId: '826' },
    visiblePinIds: ['la', 'tor', 'ldn'],
    visibleRouteIds: ['la->tor', 'la->ldn'],
    complete: false,
});
assert.deepEqual(timeline.frames[4], {
    atMs: 4_000,
    view: { level: 'world', regionId: null, countryId: null },
    visiblePinIds: ['la', 'tor', 'ldn'],
    visibleRouteIds: ['la->tor', 'la->ldn'],
    complete: true,
});

assert.deepEqual(resolveRegionMapCinematicFrame(timeline, 2_650), timeline.frames[2]);
assert.deepEqual(resolveRegionMapCinematicFrame(timeline, 1, true), timeline.frames[4]);
assert.deepEqual(resolveRegionMapCinematicFrame(timeline, 50_000), timeline.frames[4]);

let selectionCalls = 0;
const sharedProps = {
    selectedRegionIds: ['NORTH_AMERICA', 'EUROPE'] as const,
    onSelectRegion: () => { selectionCalls += 1; },
    onSelectLocation: () => { selectionCalls += 1; },
    locationPins: pins,
    locationRoutes: routes,
    interaction: 'cinematic' as const,
    cinematic: { durationMs: 4_000, reducedMotion: true },
    showPreview: false,
};

const detailedMarkup = renderToStaticMarkup(<InteractiveRegionMapV2 {...sharedProps} />);
assert.match(detailedMarkup, /data-cinematic-complete="true"/);
assert.match(detailedMarkup, /data-visible-pin-count="3"/);
assert.match(detailedMarkup, /aria-label="Los Angeles"/);
assert.match(detailedMarkup, /class="irm-route-core"/);
assert.doesNotMatch(detailedMarkup, /role="button"/);
assert.doesNotMatch(detailedMarkup, /tabindex=/);
assert.doesNotMatch(detailedMarkup, /<animateMotion/);

const openingMarkup = renderToStaticMarkup(
    <InteractiveRegionMapV2 {...sharedProps} cinematic={{ durationMs: 4_000 }} />,
);
assert.match(openingMarkup, /data-cinematic-frame="0"/);
assert.match(openingMarkup, /data-visible-pin-count="0"/);
assert.doesNotMatch(openingMarkup, /aria-label="Los Angeles"/);

const fallbackMarkup = renderToStaticMarkup(<InteractiveRegionMapLegacy {...sharedProps} />);
assert.doesNotMatch(fallbackMarkup, /role="button"/);
assert.doesNotMatch(fallbackMarkup, /tabindex=/);
assert.equal(selectionCalls, 0);

console.log('MAP6 shared cinematic contract audit passed.');
