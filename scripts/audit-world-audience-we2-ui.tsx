import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudienceDesk, type AudienceState } from '../components/streaming-transplant/StreamingAudienceExperience';
import { createEmptyAudienceRoom } from '../components/streaming-transplant/audienceRoomModel';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';
import { migratePlayerSave } from '../services/saveMigration';
import { INITIAL_PLAYER } from '../types';

const player = migratePlayerSave(structuredClone(INITIAL_PLAYER));
const market = getStreamingAudienceMarket(player);
const state: AudienceState = { live: false, market, room: createEmptyAudienceRoom(false) };

const markup = renderToStaticMarkup(<AudienceDesk
    brand={{
        name: 'Empire+', markId: 'BOLT', customMark: null, hue: 252, sat: 84,
        identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: 'Stories travel.',
        layoutId: 'cinema', typeId: 'GROTESK', accentHue: 38, identMode: 'badge', identLen: 2,
        ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
    }}
    state={state}
    initialTab="WORLD"
    onBack={() => undefined}
/>);

/* #133: WORLD keeps the WE2 facts in the funnel card: what a home can spend, and the homes outside the market */
assert.match(markup, /HOUSEHOLD BUDGET \/ MO/, 'WORLD names the WE2 household budget');
assert.match(markup, /HOMES OUTSIDE THE MARKET/, 'WORLD keeps non-participating households visible');
const budget = market.householdEconomy.averageMonthlyEntertainmentBudget;
assert.ok(markup.includes(`$${budget >= 100 ? Math.round(budget) : budget.toFixed(1)}`), 'The budget shown is the WE2 economy\'s own');

console.log('WE2 Audience Market UI audit passed.');
