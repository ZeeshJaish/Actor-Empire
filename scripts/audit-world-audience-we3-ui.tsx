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

/* #133 (plan §20.8, approved by Zeesh): WORLD's funnel starts at the homes that can stream (WE3's streaming reach);
   the cinema-reach bar and its notes left the streaming room */
assert.match(markup, /CAN STREAM/, 'WORLD starts the funnel at canonical streaming reach');
assert.ok(markup.includes(market.industryParticipation.streamingReachableHouseholds >= 1e9
    ? `${(market.industryParticipation.streamingReachableHouseholds / 1e9).toFixed(2)}B`.replace(/\.?0+B$/, 'B')
    : 'homes'), 'The reach shown is WE3\'s own');
assert.doesNotMatch(markup, /CINEMA REACH/, 'The cinema bar left the streaming room');

console.log('WE3 Audience Market UI audit passed.');
