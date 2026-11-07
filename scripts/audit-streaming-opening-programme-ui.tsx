import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import StreamingOpeningProgramme from '../components/streaming-transplant/StreamingOpeningProgramme';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import type { StreamingOpeningProgrammeView } from '../services/streamingOpeningProgramme';

const baseView: StreamingOpeningProgrammeView = {
    state: 'EXECUTING',
    commissioned: true,
    commission: null,
    absoluteWeek: 2101,
    earliestOpeningAbsoluteWeek: 2115,
    dateCertainty: 'ESTIMATE',
    controllingWorkstreamId: 'INFRASTRUCTURE',
    remainingWeeks: 14,
    cityCount: 6,
    rackCount: 118,
    releasedCapital: 465_000_000,
    progress: 0.07, totalWeeks: 15, citiesOnline: 0,
    workstreams: [
        {
            id: 'INFRASTRUCTURE', label: 'Infrastructure', status: 'IN_PROGRESS',
            detail: 'Crews are building 118 racks across 6 cities.', readyAtAbsoluteWeek: 2115,
            elapsedWeeks: 1, remainingWeeks: 14, controlsDate: true, actionLabel: null, operationIds: [],
        },
        {
            id: 'CLEARANCES', label: 'Government clearance', status: 'IN_PROGRESS',
            detail: '3 government reviews in progress.', readyAtAbsoluteWeek: 2105,
            elapsedWeeks: 1, remainingWeeks: 4, controlsDate: false, actionLabel: null, operationIds: [],
        },
        {
            id: 'REHEARSAL', label: 'Load rehearsal', status: 'PASSED',
            detail: 'The commissioned configuration passed its final rehearsal.', readyAtAbsoluteWeek: 2100,
            elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [],
        },
    ],
};

const auditBrand: Brand = {
    name: 'EMPIRE+', markId: 'FRAME_PLAY', customMark: null, hue: 250, sat: 90,
    identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
    layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 168, identMode: 'badge',
    identLen: 2, ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
};

const network = { built: true, sites: [
  { id: 'NYC', name: 'New York', countryCode: 'US', lat: 40.7, lng: -74, racks: 40, role: 'CORE ORIGIN' as const, reachKm: 400, tier: 1 as const },
  { id: 'LON', name: 'London', countryCode: 'GB', lat: 51.5, lng: -0.1, racks: 30, role: 'REGIONAL HUB' as const, reachKm: 300, tier: 1 as const },
  { id: 'BOM', name: 'Mumbai', countryCode: 'IN', lat: 19, lng: 72.8, racks: 20, role: 'EDGE CACHE' as const, reachKm: 200, tier: 2 as const },
], markets: [], reached: 1, served: 1, revision: 1, pending: null, peakStreams: 0, capacityStreams: 0, weeklyOperatingCost: 0 };
const props = {
    brand: auditBrand,
    network,
    plan: <p>THE APPROVED PLAN</p>,
    focus: 'OVERVIEW' as const,
    onBack: () => undefined,
    onResolveClearance: () => undefined,
    onOpeningNight: () => undefined,
};

const executingMarkup = renderToStaticMarkup(<StreamingOpeningProgramme {...props} view={baseView} />);
assert.match(executingMarkup, /BEING BUILT/);
assert.match(executingMarkup, /Opens around Week 36/);
assert.match(executingMarkup, /SETS THE DATE/);
assert.match(executingMarkup, /The network/);
assert.match(executingMarkup, /OPENING NIGHT · 14 WEEKS/);
assert.match(executingMarkup, /WHAT YOU APPROVED/);
assert.match(executingMarkup, /\$465M/, 'money in words, not $14021 M');
assert.match(executingMarkup, /Locked until opening night/);
assert.match(executingMarkup, /disabled=""/);
assert.doesNotMatch(executingMarkup, /Skip/);
assert.doesNotMatch(executingMarkup, /[0-9]+\/[0-9]+/);

const actionMarkup = renderToStaticMarkup(<StreamingOpeningProgramme
    {...props}
    focus="CLEARANCES"
    view={{
        ...baseView,
        state: 'ACTION_REQUIRED',
        workstreams: baseView.workstreams.map(item => item.id === 'CLEARANCES' ? {
            ...item,
            status: 'ACTION_REQUIRED' as const,
            actionLabel: 'Resolve government request',
            operationIds: ['market-us'],
        } : item),
    }}
/>);
assert.match(actionMarkup, /NEEDS YOU/);
assert.match(actionMarkup, /Resolve government request/);

const readyMarkup = renderToStaticMarkup(<StreamingOpeningProgramme
    {...props}
    launchReadiness={{ canLaunch: true, blockerCount: 0, items: [] }}
    view={{ ...baseView, state: 'READY_TO_OPEN', remainingWeeks: 0, controllingWorkstreamId: null,
        workstreams: baseView.workstreams.map(item => ({ ...item, controlsDate: false, status: item.id === 'REHEARSAL' ? 'PASSED' : 'READY' })) }}
/>);
assert.match(readyMarkup, /OPENING NIGHT/);
assert.match(readyMarkup, /IS READY/);
assert.match(readyMarkup, /BEGIN OPENING NIGHT/);
assert.doesNotMatch(readyMarkup, /disabled=""/);

console.log('Streaming Opening Programme UI audit passed.');
