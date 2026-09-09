import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudienceDesk, type AudienceState } from '../components/streaming-transplant/StreamingAudienceExperience';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';
import { migratePlayerSave } from '../services/saveMigration';
import { INITIAL_PLAYER } from '../types';

const player = migratePlayerSave(structuredClone(INITIAL_PLAYER));
const market = getStreamingAudienceMarket(player);
const state: AudienceState = {
    live: false,
    metrics: [],
    trend: [],
    trendLabel: 'Audience',
    chart: [],
    attribution: [],
    campaigns: [],
    objective: 'BALANCED',
    regions: [],
    market,
};

const markup = renderToStaticMarkup(<AudienceDesk
    brand={{
        name: 'Empire+', markId: 'BOLT', customMark: null, hue: 252, sat: 84,
        identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: 'Stories travel.',
        layoutId: 'cinema', typeId: 'GROTESK', accentHue: 38, identMode: 'badge', identLen: 2,
        ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
    }}
    state={state}
    initialTab="ANALYTICS"
    onBack={() => undefined}
/>);

assert.match(markup, /STREAMING REACH/, 'Audience Market names canonical streaming reach');
assert.match(markup, /CINEMA REACH/, 'Audience Market names canonical cinema reach');
assert.match(markup, /BOTH/, 'Audience Market shows dual-industry households');
assert.match(markup, /NEITHER/, 'Audience Market shows households participating in neither industry');
assert.match(markup, /market potential, not automatic customers or revenue/, 'WE3 is explained as neutral potential rather than live allocation');

console.log('WE3 Audience Market UI audit passed.');
