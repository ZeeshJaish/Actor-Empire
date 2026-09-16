import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RegionMapLocationPin } from '../services/regionMap';
import { InteractiveRegionMapV2 } from '../views/lifestyle/business/components/InteractiveRegionMapV2';
import { regionView } from '../views/lifestyle/business/components/regionMapView';
import {
    regionMapPinPriority,
    selectRegionMapPinLabelIds,
} from '../views/lifestyle/business/components/regionMapLabels';
import { getRegionGeometry } from '../views/lifestyle/business/components/worldMapDetailedGeometry';

const pin = (id: string, state: RegionMapLocationPin['state'], extra: Partial<RegionMapLocationPin> = {}): RegionMapLocationPin => ({
    id,
    name: id,
    x: 20,
    y: 30,
    longitude: -118.2437,
    latitude: 34.0522,
    regionId: 'NORTH_AMERICA',
    countryId: '840',
    state,
    ...extra,
});

assert.ok(regionMapPinPriority(pin('active', 'active')) > regionMapPinPriority(pin('origin', 'built', { variant: 'origin' })));
assert.ok(regionMapPinPriority(pin('origin', 'built', { variant: 'origin' })) > regionMapPinPriority(pin('built', 'built')));
assert.ok(regionMapPinPriority(pin('built', 'built')) > regionMapPinPriority(pin('planned', 'planned')));
assert.ok(regionMapPinPriority(pin('planned', 'planned')) > regionMapPinPriority(pin('recommended', 'recommended')));
assert.ok(regionMapPinPriority(pin('recommended', 'recommended')) > regionMapPinPriority(pin('idle', 'idle')));
assert.ok(regionMapPinPriority(pin('selected', 'idle', { selected: true })) > regionMapPinPriority(pin('active', 'active')));

const collisionCandidates = [
    { id: 'idle', point: [100, 100] as [number, number], pin: pin('idle', 'idle') },
    { id: 'built', point: [102, 101] as [number, number], pin: pin('built', 'built') },
    { id: 'origin', point: [101, 99] as [number, number], pin: pin('origin', 'built', { variant: 'origin' }) },
    { id: 'active', point: [100, 102] as [number, number], pin: pin('active', 'active') },
    { id: 'separated', point: [240, 190] as [number, number], pin: pin('separated', 'recommended') },
];
assert.deepEqual(selectRegionMapPinLabelIds(collisionCandidates, 'world'), ['active', 'separated']);

const compactWorldLabels = [
    { id: 'west', point: [100, 100] as [number, number], pin: pin('west', 'built') },
    { id: 'east', point: [182, 100] as [number, number], pin: pin('east', 'built') },
];
assert.deepEqual(
    selectRegionMapPinLabelIds(compactWorldLabels, 'world'),
    ['west', 'east'],
    'Smaller labels should allow useful locations 82px apart to coexist.',
);

const selectedCollision = [
    { id: 'selected-a', point: [100, 100] as [number, number], pin: pin('selected-a', 'idle', { selected: true }) },
    { id: 'selected-b', point: [101, 101] as [number, number], pin: pin('selected-b', 'idle', { selected: true }) },
    { id: 'active', point: [102, 102] as [number, number], pin: pin('active', 'active') },
];
assert.deepEqual(selectRegionMapPinLabelIds(selectedCollision, 'world'), ['selected-a', 'selected-b']);

const densePins = [
    pin('Idle', 'idle'),
    pin('Built', 'built'),
    pin('Origin', 'built', { variant: 'origin' }),
    pin('Active', 'active'),
    pin('Planned', 'planned'),
    pin('Separated', 'recommended', { longitude: -0.1276, latitude: 51.5072, regionId: 'EUROPE', countryId: '826' }),
];
const markup = renderToStaticMarkup(
    <InteractiveRegionMapV2
        selectedRegionIds={['NORTH_AMERICA', 'EUROPE']}
        locationPins={densePins}
        onSelectLocation={() => undefined}
        showPreview={false}
    />,
);
assert.match(markup, /data-pin-label-count="2"/);
assert.equal((markup.match(/class="irm-pin /g) ?? []).length, 6);
assert.match(markup, /<text class="irm-pin-lbl"[^>]*>Active<\/text>/);
assert.match(markup, /<text class="irm-pin-lbl"[^>]*>Separated<\/text>/);
assert.doesNotMatch(markup, /<text class="irm-pin-lbl"[^>]*>Origin<\/text>/);
assert.doesNotMatch(markup, /players here|SAMPLE_PLAYER_CITIES/i);

const readableWorldMarkup = renderToStaticMarkup(
  <InteractiveRegionMapV2
    selectedRegionIds={['NORTH_AMERICA']}
    interaction="drilldown"
    showPreview={false}
  />,
);
assert.match(readableWorldMarkup, /class="irm-screen-overlay"/);
assert.match(readableWorldMarkup, /font-size="10\.5"[^>]*>NORTH AMERICA<\/text>/);

const northAmericaMarkup = renderToStaticMarkup(
  <InteractiveRegionMapV2
    selectedRegionIds={['NORTH_AMERICA']}
    interaction="drilldown"
    view={regionView('NORTH_AMERICA')}
    locationPins={[
      pin('Toronto', 'idle', { name: 'Toronto', countryId: '124', longitude: -79.3832, latitude: 43.6532, badge: 'PRODUCTION CITY · Q6' }),
      pin('Mexico City', 'idle', { name: 'Mexico City', countryId: '484', longitude: -99.1332, latitude: 19.4326, badge: 'PRODUCTION CITY · Q7' }),
    ]}
    minimumPinViewLevel="region"
    showPreview={false}
  />,
);
assert.match(northAmericaMarkup, /class="irm-country-lbl"[^>]*>USA<\/text>/);
assert.match(northAmericaMarkup, /class="irm-country-lbl"[^>]*>Canada<\/text>/);
assert.match(northAmericaMarkup, /class="irm-country-lbl"[^>]*>Mexico<\/text>/);
assert.match(northAmericaMarkup, /class="irm-country-content-dot"/);
assert.match(northAmericaMarkup, /class="irm-pin-lbl"[^>]*font-size="9\.5"[^>]*>Toronto<\/text>/);

const regionBreadcrumbStart = northAmericaMarkup.indexOf('class="irm-breadcrumb"');
const regionMapCanvasStart = northAmericaMarkup.indexOf('class="irm-svg');
assert.ok(regionBreadcrumbStart >= 0, 'Region breadcrumb should use the compact out-of-canvas treatment.');
assert.ok(regionBreadcrumbStart < regionMapCanvasStart, 'Region breadcrumb should render before the map canvas.');
assert.doesNotMatch(northAmericaMarkup, /class="[^"]*irm-breadcrumb[^"]*absolute/);

const canadaMarkup = renderToStaticMarkup(
  <InteractiveRegionMapV2
    selectedRegionIds={['NORTH_AMERICA']}
    interaction="drilldown"
    view={{ level: 'country', regionId: 'NORTH_AMERICA', countryId: '124' }}
    locationPins={[
      pin('Toronto', 'idle', { name: 'Toronto', countryId: '124', longitude: -79.3832, latitude: 43.6532, badge: 'PRODUCTION CITY · Q6' }),
    ]}
    minimumPinViewLevel="country"
    showPreview={false}
  />,
);
assert.match(canadaMarkup, /class="irm-pin-lbl"[^>]*>Toronto<\/text>/);
assert.match(canadaMarkup, /class="irm-pin-lbl"[^>]*font-size="10\.5"[^>]*>Toronto<\/text>/);
assert.doesNotMatch(canadaMarkup, /class="irm-pin-badge"[^>]*>PRODUCTION CITY · Q6<\/text>/);
assert.match(canadaMarkup, /class="irm-country-marker irm-country-marker-visible irm-country-has-content"/);
assert.match(canadaMarkup, /class="irm-country-marker irm-country-marker-hidden"/);
assert.doesNotMatch(canadaMarkup, /players/i);

const selectedCanadaMarkup = renderToStaticMarkup(
  <InteractiveRegionMapV2
    selectedRegionIds={['NORTH_AMERICA']}
    interaction="drilldown"
    view={{ level: 'country', regionId: 'NORTH_AMERICA', countryId: '124' }}
    locationPins={[
      pin('Toronto', 'idle', { name: 'Toronto', countryId: '124', longitude: -79.3832, latitude: 43.6532, selected: true, badge: 'PRODUCTION CITY · Q6' }),
    ]}
    minimumPinViewLevel="country"
    showPreview={false}
  />,
);
assert.match(selectedCanadaMarkup, /class="irm-pin-badge"[^>]*>PRODUCTION CITY · Q6<\/text>/);
assert.match(selectedCanadaMarkup, /class="irm-pin-badge"[^>]*font-size="8\.5"[^>]*>PRODUCTION CITY · Q6<\/text>/);

const hiddenBadgeAnchorMarkup = renderToStaticMarkup(
  <InteractiveRegionMapV2
    selectedRegionIds={['NORTH_AMERICA']}
    interaction="drilldown"
    view={{ level: 'country', regionId: 'NORTH_AMERICA', countryId: '840' }}
    locationPins={[
      { id: 'anchor', name: 'Atlanta', x: 75, y: 50, countryId: '840', regionId: 'NORTH_AMERICA', state: 'idle', badge: 'PRODUCTION CITY · Q5' },
    ]}
    minimumPinViewLevel="country"
    showPreview={false}
  />,
);
assert.match(
  hiddenBadgeAnchorMarkup,
  /class="irm-pin-lbl"[^>]*text-anchor="start"[^>]*>Atlanta<\/text>/,
  'A hidden badge must not flip the visible city label into neighbouring text.',
);

const rightEdgePinMarkup = renderToStaticMarkup(
  <InteractiveRegionMapV2
    selectedRegionIds={['OCEANIA']}
    locationPins={[
      { id: 'edge', name: 'Auckland', x: 94, y: 88, selected: true, badge: 'PRODUCTION CITY · Q10' },
    ]}
    onSelectLocation={() => undefined}
    showPreview={false}
  />,
);
assert.match(rightEdgePinMarkup, /class="irm-pin-lbl"[^>]*text-anchor="end"[^>]*>Auckland<\/text>/);

const cachedGeometry = getRegionGeometry(['840', '124']);
assert.equal(getRegionGeometry(['840', '124']), cachedGeometry);

console.log('MAP7 label priority, collision, and cache closure audit passed.');
