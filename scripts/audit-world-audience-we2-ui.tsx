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

assert.match(markup, /HOUSEHOLD BUDGET/, 'Audience Market overview names the WE2 household budget');
assert.match(markup, /OUTSIDE MARKET/, 'Audience Market overview keeps non-participating households visible');
assert.match(markup, /This is spending capacity, not automatic streaming revenue/, 'WE2 budget is presented as capacity rather than guaranteed revenue');

console.log('WE2 Audience Market UI audit passed.');
