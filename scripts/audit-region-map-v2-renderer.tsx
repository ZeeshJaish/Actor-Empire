import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    InteractiveRegionMapV2,
    regionView,
} from '../views/lifestyle/business/components/InteractiveRegionMapV2';

const props = {
    selectedRegionIds: ['NORTH_AMERICA' as const],
    marketRegionIds: ['NORTH_AMERICA' as const],
    activeRegionId: 'NORTH_AMERICA' as const,
    onSelectRegion: () => undefined,
    locationPins: [
        { id: 'us-la', name: 'Los Angeles', x: 16, y: 42, longitude: -118.2437, latitude: 34.0522, regionId: 'NORTH_AMERICA' as const, countryId: '840', selected: true },
        { id: 'ca-tor', name: 'Toronto', x: 23, y: 31, longitude: -79.3832, latitude: 43.6532, regionId: 'NORTH_AMERICA' as const, countryId: '124' },
    ],
    locationRoutes: [{ fromId: 'us-la', toId: 'ca-tor' }],
};

const releaseMarkup = renderToStaticMarkup(
    <div>
        <InteractiveRegionMapV2 {...props} visualTone="release" />
        <InteractiveRegionMapV2 {...props} visualTone="production" />
    </div>,
);

assert.match(releaseMarkup, /class="[^"]*irm-svg/);
assert.match(releaseMarkup, /aria-label="North America release region"/);
assert.match(releaseMarkup, /class="irm-region-base irm-hit"/);
assert.match(releaseMarkup, /class="irm-route-core"/);
assert.match(releaseMarkup, /Los Angeles/);
assert.match(releaseMarkup, /aria-pressed="true"/);
assert.doesNotMatch(releaseMarkup, /players here|SAMPLE_PLAYER_CITIES|ProductionLocationPicker/i);

const oceanIds = [...releaseMarkup.matchAll(/id="(irm-ocean-[^"]+)"/g)].map(match => match[1]);
assert.equal(oceanIds.length, 2);
assert.notEqual(oceanIds[0], oceanIds[1]);

const regionOnlyMarkup = renderToStaticMarkup(
    <InteractiveRegionMapV2
        selectedRegionIds={['EUROPE']}
        interaction="drilldown"
        view={regionView('EUROPE')}
        maximumViewLevel="region"
        showPreview={false}
    />,
);
const regionOnlyCountryPaths = [...regionOnlyMarkup.matchAll(/<path[^>]*class="irm-country"[^>]*>/g)].map(match => match[0]);
assert.ok(regionOnlyCountryPaths.length > 20);
assert.equal(regionOnlyCountryPaths.every(path => !path.includes('role="button"')), true);
assert.equal(regionOnlyCountryPaths.every(path => path.includes('aria-hidden="true"')), true);
assert.match(regionOnlyMarkup, /aria-label="Return to world map"/);
assert.match(regionOnlyMarkup, />Europe</);

const countryOnlyPinsAtRegion = renderToStaticMarkup(
    <InteractiveRegionMapV2
        {...props}
        interaction="drilldown"
        view={regionView('NORTH_AMERICA')}
        minimumPinViewLevel="country"
        showPreview={false}
    />,
);
assert.doesNotMatch(countryOnlyPinsAtRegion, /aria-label="Los Angeles"/);

const countryOnlyPinsAtCountry = renderToStaticMarkup(
    <InteractiveRegionMapV2
        {...props}
        interaction="drilldown"
        view={{ level: 'country', regionId: 'NORTH_AMERICA', countryId: '840' }}
        minimumPinViewLevel="country"
        showPreview={false}
    />,
);
assert.match(countryOnlyPinsAtCountry, /aria-label="Los Angeles"/);
assert.match(countryOnlyPinsAtCountry, /aria-label="Return to North America map"/);
assert.match(countryOnlyPinsAtCountry, />United States of America</);

const facilityAndNetworkMarkup = renderToStaticMarkup(
    <InteractiveRegionMapV2
        selectedRegionIds={['NORTH_AMERICA']}
        warningRegionIds={['AFRICA']}
        locationPins={[
            { ...props.locationPins[0], id: 'recommended', name: 'Recommended', state: 'recommended' },
            { ...props.locationPins[0], id: 'planned', name: 'Planned', state: 'planned', built: false },
            { ...props.locationPins[0], id: 'built', name: 'Built', state: 'built', built: true },
            { ...props.locationPins[0], id: 'active', name: 'Active', state: 'active' },
            { ...props.locationPins[0], id: 'origin', name: 'Origin', ariaLabel: 'Origin, 12 racks, 82% of capacity', variant: 'origin', size: 6.4, load: 0.82, built: true },
        ]}
        locationRoutes={[{ fromId: 'origin', toId: 'planned', planned: true, animated: false }]}
        showPreview={false}
    />,
);
assert.match(facilityAndNetworkMarkup, /irm-region-warning/);
assert.match(facilityAndNetworkMarkup, /irm-pin-recommended/);
assert.match(facilityAndNetworkMarkup, /irm-pin-planned/);
assert.match(facilityAndNetworkMarkup, /irm-pin-built/);
assert.match(facilityAndNetworkMarkup, /irm-pin-active/);
assert.match(facilityAndNetworkMarkup, /irm-pin-origin/);
assert.match(facilityAndNetworkMarkup, /class="irm-pin-load"/);
assert.match(facilityAndNetworkMarkup, /aria-label="Origin, 12 racks, 82% of capacity"/);
assert.match(facilityAndNetworkMarkup, /irm-route-planned/);
assert.doesNotMatch(facilityAndNetworkMarkup, /<animateMotion/);

const mapCss = fs.readFileSync('views/lifestyle/business/components/interactiveRegionMap.css', 'utf8');
assert.match(mapCss, /\.irm-svg\.irm-drilldown\s*\{\s*touch-action:\s*pan-y;/);
assert.match(mapCss, /\.irm-svg\.irm-drilldown\.irm-zoomed\s*\{\s*touch-action:\s*none;/);

console.log('Region map v2 renderer audit passed.');
