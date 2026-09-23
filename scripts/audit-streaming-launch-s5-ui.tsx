import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import { createLabBuildData, createLabDraft } from '../lab/buildLabData';
import { placeRegion } from '../components/studio-finance/finance/placer';

const data = createLabBuildData(['US', 'CA', 'MX', 'BR', 'GB', 'DE']);
const emptyDraft = createLabDraft();
const network = renderToStaticMarkup(<BuildWizard data={data} initialStage="network" initialDraft={emptyDraft} />);
assert.match(network, /class="kit-strip-measure"[^>]*>Capacity</, 'Network strip labels its own capacity measure.');

// A long country list used to push the only actionable controls far below the map.
assert.ok(network.indexOf('Your servers') >= 0 && network.indexOf('Your servers') < network.indexOf('Who you are serving'),
  'Server controls come before the country-level breakdown.');
assert.match(network, /<details[^>]*class="bw-rg-countries-detail"[^>]*>/,
  'The country-level breakdown is an accessible native disclosure.');
assert.match(network, /data-build-mark="server-scout"/,
  'Scout has a fictional hardware mark instead of a generic shape.');
assert.match(network, /data-build-mark="server-workhorse"/,
  'Workhorse has a fictional hardware mark instead of a generic shape.');
assert.match(network, /data-build-mark="server-titan"/,
  'Titan has a fictional hardware mark instead of a generic shape.');
for (const provider of ['atlas', 'northwind', 'meridian']) {
  assert.match(network, new RegExp(`data-build-mark="cloud-${provider}"`), `${provider} has its own fictional mark.`);
}
assert.match(network, /Provider comparison/, 'The provider trade-offs are named as a comparison.');
assert.match(network, /plan ceiling/, 'Provider ceilings are explicit before buying cloud.');

const once = placeRegion(data, emptyDraft, 'NORTH_AMERICA', {
  servers: { SCOUT: 1, WORKHORSE: 3, TITAN: 1 },
  cloud: { provider: 'ATLAS', compute: 5 },
}).draft;
const launch = renderToStaticMarkup(<BuildWizard data={data} initialStage="launch" initialDraft={once} />);
const moneyStage = renderToStaticMarkup(<BuildWizard data={data} initialStage="money" initialDraft={once} />);
const testStage = renderToStaticMarkup(<BuildWizard data={data} initialStage="test" initialDraft={once} />);
assert.match(moneyStage, /class="kit-strip-measure"[^>]*>Budget</, 'Money strip labels the budget measure.');
assert.match(testStage, /class="kit-strip-measure"[^>]*>Rehearsal load</, 'Test strip labels rehearsal load.');
assert.match(launch, /class="kit-strip-measure"[^>]*>Gates clear</, 'Launch strip labels readiness gates.');
assert.match(launch, /<details[^>]*class="bw-agreement-provider"[^>]*>/,
  'Agreement groups reveal their rooms on demand, not as an always-open wall.');
assert.match(launch, /Due on execution/, 'The full canonical amount remains available.');
assert.match(launch, /room[s]?[^<]*·[^<]*rack[s]?/, 'Agreement summary keeps provider room and rack totals visible.');

console.log('S5 Build UI: controls, provider comparison, hardware marks, and agreement disclosures passed.');
