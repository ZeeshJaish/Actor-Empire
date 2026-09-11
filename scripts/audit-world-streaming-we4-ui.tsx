import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudienceDesk, type AudienceState } from '../components/streaming-transplant/StreamingAudienceExperience';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';
import { migratePlayerSave } from '../services/saveMigration';
import { INITIAL_PLAYER, type Player } from '../types';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we4-ui';
player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Stories travel.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 0,
};
player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
player.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs'], annualDiscount: 10, introOffer: 0,
    plans: [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 7, featureIds: ['hd'], ads: true, colorId: 'emerald' },
        { id: 'PREMIERE', name: 'Premiere', monthly: 18, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false, colorId: 'magenta' },
    ],
};
const migrated = migratePlayerSave(player);
const market = getStreamingAudienceMarket(migrated);
const state: AudienceState = {
    live: false, metrics: [], trend: [], trendLabel: 'Audience', chart: [], attribution: [], campaigns: [],
    objective: 'BALANCED', regions: [], market,
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

assert.ok(market.streamingCompetition, 'Audience Market projects canonical WE4 competition');
assert.equal(market.payingHouseholds, market.streamingCompetition.subscribingHouseholds, 'headline paying homes use WE4, not a parallel estimate');
assert.equal(market.paidSubscriptions, market.streamingCompetition.totalSubscriptions, 'headline subscriptions use WE4');
assert.match(markup, /HOMES WON/, 'WE4 UI shows player captured households');
assert.match(markup, /UNCLAIMED HOMES/, 'WE4 UI shows demand that chose no service');
assert.match(markup, /EFFECTIVE PRICE/, 'WE4 UI shows exact plan-weighted effective price');
assert.match(markup, /Essential/, 'WE4 UI exposes exact player plan mix');
assert.match(markup, /Premiere/, 'WE4 UI keeps expensive-plan demand visible');
assert.match(markup, /Every active service competes/, 'Audience Market explains the finite all-operator model');
assert.doesNotMatch(markup, /utility score/i, 'internal utility scores remain hidden');

console.log('WE4 Audience Market UI audit passed.');
