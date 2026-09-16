import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreamingBuildNetworkMap } from '../components/streaming-transplant/StreamingBuildNetworkMap';
import { cityById } from '../components/streaming-transplant/StreamingBrandVisuals';
import {
  createStreamingNetworkMapModel,
  radiusForStreamingRacks,
  type NetworkMapNode,
} from '../components/streaming-transplant/streamingNetworkMap';
import { WORLD_VIEW } from '../views/lifestyle/business/components/regionMapView';

const nodes: NetworkMapNode[] = [
  { facilityId: 'facility-la', city: cityById('LA')!, racks: 16, role: 'CORE_ORIGIN', load: 0.82, built: true },
  { facilityId: 'facility-ldn', city: cityById('LDN')!, racks: 8, role: 'REGIONAL_HUB', load: 0.64, built: true },
  { facilityId: 'facility-bom', city: cityById('BOM')!, racks: 3, role: 'EDGE_CACHE', load: 0.95, built: false },
];

const model = createStreamingNetworkMapModel(
  nodes,
  ['NORTH_AMERICA', 'EUROPE', 'ASIA'],
  ['AFRICA'],
  'facility-ldn',
  true,
  WORLD_VIEW,
);

assert.deepEqual(model.locationPins.map(pin => pin.id), ['facility-la', 'facility-ldn', 'facility-bom']);
assert.equal(model.locationPins[0]?.countryId, '840');
assert.equal(model.locationPins[0]?.size, radiusForStreamingRacks(16));
assert.equal(model.locationPins[0]?.load, 0.82);
assert.equal(model.locationPins[0]?.variant, 'origin');
assert.equal(model.locationPins[1]?.variant, 'relay');
assert.equal(model.locationPins[1]?.state, 'active');
assert.equal(model.locationPins[2]?.variant, 'cache');
assert.equal(model.locationPins[2]?.state, 'planned');
assert.equal(model.locationPins[2]?.built, false);
assert.equal(model.locationPins[0]?.ariaLabel, 'Los Angeles, 16 racks, 82% of capacity');
assert.deepEqual(model.locationRoutes, [
  { fromId: 'facility-la', toId: 'facility-ldn', planned: false, animated: true },
  { fromId: 'facility-la', toId: 'facility-bom', planned: true, animated: false },
]);
assert.deepEqual(model.selectedRegionIds, ['NORTH_AMERICA', 'EUROPE', 'ASIA']);
assert.deepEqual(model.warningRegionIds, ['AFRICA']);
assert.equal(model.interaction, 'drilldown');
assert.equal(model.maximumViewLevel, 'country');

const markup = renderToStaticMarkup(
  <StreamingBuildNetworkMap
    nodes={nodes}
    coverage={model.selectedRegionIds}
    unserved={model.warningRegionIds}
    selectedFacilityId="facility-ldn"
    live
  />,
);
assert.match(markup, /aria-label="Network map: 3 sites placed"/);
assert.match(markup, /Los Angeles/);
assert.match(markup, /viewBox="0 -20 1000 560"/);
assert.doesNotMatch(markup, />NORTH AMERICA<\/text>/);
assert.doesNotMatch(markup, />EUROPE<\/text>/);
assert.match(markup, /aria-label="Network map legend"/);

const emptyMarkup = renderToStaticMarkup(
  <StreamingBuildNetworkMap nodes={[]} coverage={[]} unserved={[]} />,
);
assert.match(emptyMarkup, /No machines anywhere yet/);

console.log('MAP5 Streaming network map adapter audit passed.');
