import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { commissionBeats } from '../components/studio-finance/components/cine/CommissionCut';
import type {
    BuildTotals,
    City,
    MoneyPlan,
} from '../components/studio-finance/finance/build';

const cities: City[] = [
    {
        id: 'LA',
        name: 'Los Angeles',
        countryId: 'country:US',
        country: 'United States',
        code: 'US',
        coord: { lat: 34.0522, lng: -118.2437 },
        plot: { x: 16, y: 42 },
        note: '',
    },
    {
        id: 'TOR',
        name: 'Toronto',
        countryId: 'country:CA',
        country: 'Canada',
        code: 'CA',
        coord: { lat: 43.6532, lng: -79.3832 },
        plot: { x: 23, y: 31 },
        note: '',
    },
    {
        id: 'LDN',
        name: 'London',
        countryId: 'country:GB',
        country: 'United Kingdom',
        code: 'GB',
        coord: { lat: 51.5072, lng: -0.1276 },
        plot: { x: 49, y: 28 },
        note: '',
    },
];
const before = JSON.stringify(cities);
const totals = { cities: 3, racks: 8, weeks: 4 } as BuildTotals;
const plan = { total: 24_000_000, commissionNow: 24_000_000, lines: [] } as unknown as MoneyPlan;

const liveBeat = commissionBeats(totals, plan, cities, 'Actor Empire').find(beat => beat.id === 'live');
assert.ok(liveBeat);
const markup = renderToStaticMarkup(<>{liveBeat.scene}</>);

assert.match(markup, /Commissioned infrastructure map: 3 sites online/);
assert.match(markup, /irm-cinematic/);
assert.match(markup, /data-route-count="2"/);
assert.match(markup, /Los Angeles/);
assert.match(markup, /Toronto/);
assert.match(markup, /London/);
assert.doesNotMatch(markup, /role="button"/);
assert.doesNotMatch(markup, /tabindex=/);
assert.equal(JSON.stringify(cities), before);

console.log('MAP6 real read-only cinematic callers audit passed.');
