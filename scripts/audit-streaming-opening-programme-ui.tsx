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

const props = {
    brand: auditBrand,
    focus: 'OVERVIEW' as const,
    onBack: () => undefined,
    onOpenCommissionedPlan: () => undefined,
    onResolveClearance: () => undefined,
    onOpeningNight: () => undefined,
};

const executingMarkup = renderToStaticMarkup(<StreamingOpeningProgramme {...props} view={baseView} />);
assert.match(executingMarkup, /THE OPENING PROGRAMME/);
assert.match(executingMarkup, /Earliest opening/);
assert.match(executingMarkup, /Week 2115/);
assert.match(executingMarkup, /Controls the date/);
assert.match(executingMarkup, /Infrastructure/);
assert.match(executingMarkup, /Opening Night · 14 weeks remaining/);
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
assert.match(actionMarkup, /ACTION REQUIRED/);
assert.match(actionMarkup, /Resolve government request/);

const readyMarkup = renderToStaticMarkup(<StreamingOpeningProgramme
    {...props}
    view={{ ...baseView, state: 'READY_TO_OPEN', remainingWeeks: 0, controllingWorkstreamId: null,
        workstreams: baseView.workstreams.map(item => ({ ...item, controlsDate: false, status: item.id === 'REHEARSAL' ? 'PASSED' : 'READY' })) }}
/>);
assert.match(readyMarkup, /READY FOR OPENING NIGHT/);
assert.match(readyMarkup, /Begin Opening Night/);
assert.doesNotMatch(readyMarkup, /disabled=""/);

console.log('Streaming Opening Programme UI audit passed.');
