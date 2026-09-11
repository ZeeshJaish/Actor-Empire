import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingCompetitionState } from '../services/worldEconomy/worldStreamingCompetition';
import {
    advanceWorldStreamingCustomersToWeek,
    createWorldStreamingCustomerState,
    getWorldStreamingPlayerCustomerOutcome,
} from '../services/worldEconomy/worldStreamingCustomers';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';
import { getStreamingPlatformAnalytics } from '../services/streamingAnalytics';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { createCanonicalAudienceState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { AudienceDesk } from '../components/streaming-transplant/StreamingAudienceExperience';
import StreamingWeeklyCeoLoop from '../components/StreamingWeeklyCeoLoop';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we5-ui-audit';
player.age = 33;
player.currentWeek = 12;
player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};
player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
player.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs'], annualDiscount: 10, introOffer: 5,
    plans: [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 7, featureIds: ['hd'], ads: true, colorId: 'emerald' },
        { id: 'PREMIERE', name: 'Premiere', monthly: 19, featureIds: ['uhd', 'streams4', 'noads'], ads: false, colorId: 'magenta' },
    ],
};
player.ownedStreamingPlatform.metrics.subscribers = 900_000;
const initialWeek = getAbsoluteWeek(player.age, player.currentWeek);
player.ownedStreamingPlatform.launchCommit = {
    id: 'we5-ui-launch', idempotencyKey: 'we5-ui-launch:empire-plus', committedAtAbsoluteWeek: initialWeek - 8,
    capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 80,
    forecastLikelyConcurrentStreams: 180_000, forecastHighConcurrentStreams: 260_000,
    protectedPeakConcurrentStreams: 600_000, launchHeadroomPercent: 50,
    initialSubscribers: 900_000, openingDemandIndex: 70, playbackSuccessRate: 99.5,
    outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 0, openingOriginalTitle: 'Opening Night',
};
player.world.worldStreamingCompetition = createWorldStreamingCompetitionState(player, initialWeek);
const seeded = createWorldStreamingCustomerState(player, initialWeek);

const next = structuredClone(player) as Player;
next.currentWeek += 1;
next.ownedStreamingPlatform.serviceConfiguration.pricing.plans = next.ownedStreamingPlatform.serviceConfiguration.pricing.plans.map(plan => ({ ...plan, monthly: plan.monthly * 3 }));
const nextWeek = getAbsoluteWeek(next.age, next.currentWeek);
next.world.worldStreamingCompetition = createWorldStreamingCompetitionState(next, nextWeek);
next.world.worldStreamingCustomers = advanceWorldStreamingCustomersToWeek(seeded, next, nextWeek);
const customer = getWorldStreamingPlayerCustomerOutcome(next.world.worldStreamingCustomers)!;
next.ownedStreamingPlatform.metrics.subscribers = customer.startingPaidAccounts;
const processed = processOwnedStreamingPlatformWeek(next).player;

const market = getStreamingAudienceMarket(processed);
assert.equal(market.customerAccess.paidAccounts, customer.endingPaidAccounts, 'Audience Market uses canonical WE5 paid accounts');
assert.equal(market.customerAccess.externalSharedHouseholds, customer.externalSharedHouseholds, 'Audience Market exposes sharing separately');
assert.equal(market.customerAccess.piracyReach, customer.piracyReach, 'Audience Market exposes piracy separately');
assert.equal(market.switching.switchedPlatformThisWeek, customer.switchIns, 'Audience Market uses real linked WE5 switches');
assert.equal(market.switching.upgradedThisWeek, customer.upgrades, 'Audience Market exposes plan upgrades');
assert.equal(market.switching.downgradedThisWeek, customer.downgrades, 'Audience Market exposes plan downgrades');

const analytics = getStreamingPlatformAnalytics(processed, 12);
assert.equal(analytics.customerAccess?.paidAccounts, customer.endingPaidAccounts, 'Analytics projects the latest WE5 paid-account fact');
assert.equal(analytics.customerAccess?.accessLoadAccounts, customer.accessLoadAccounts, 'Analytics distinguishes access load from paid accounts');
assert.equal(analytics.planMovement.upgrades, customer.upgrades, 'Analytics sums real upgrades');
assert.equal(analytics.planMovement.switchIns, customer.switchIns, 'Analytics sums real switch-ins');

const brand = {
    name: 'Empire+', markId: 'FRAME_PLAY', customMark: null, hue: 258, sat: 86,
    identId: 'ASCENT', customIdent: null, promiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
    layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 188, identMode: 'badge' as const,
    identLen: 2 as const, ratingId: 'MATURE', lockupId: 'HORIZONTAL', serverCity: null,
};
const audienceMarkup = renderToStaticMarkup(<AudienceDesk
    brand={brand}
    state={createCanonicalAudienceState(processed)}
    initialTab="ANALYTICS"
    initialAnalyticsScope="MARKET"
    initialMarketView="OVERVIEW"
    onBack={() => undefined}
    accessPolicy={processed.ownedStreamingPlatform.audienceAccessPolicy}
    onAccessPolicyChange={() => undefined}
/>);
['PAID ACCOUNTS', 'SHARED ACCESS', 'PIRACY REACH', 'SHARING POSTURE', 'ENFORCEMENT'].forEach(text => (
    assert.ok(audienceMarkup.includes(text), `Audience Market renders ${text}`)
));
assert.ok(!audienceMarkup.includes('UTILITY SCORE'), 'player UI never exposes raw utility scores');

const weeklyMarkup = renderToStaticMarkup(<StreamingWeeklyCeoLoop player={processed} onUpdatePlayer={() => undefined} onReturnToGame={() => undefined} />);
['PLAN MOVEMENT', 'UPGRADES', 'DOWNGRADES', 'SHARED ACCESS', 'PIRACY REACH'].forEach(text => (
    assert.ok(weeklyMarkup.includes(text), `weekly CEO report renders ${text}`)
));

console.log('WE5 Audience Market, analytics, weekly report, and policy UI audit passed.');
