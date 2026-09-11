import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingCompetitionState } from '../services/worldEconomy/worldStreamingCompetition';
import { createWorldStreamingCustomerState } from '../services/worldEconomy/worldStreamingCustomers';
import { createWorldStreamingViewingState } from '../services/worldEconomy/worldStreamingViewing';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { getStreamingTitleAnalytics } from '../services/streamingTitleAnalytics';
import StreamingAnalyticsCenter from '../components/StreamingAnalyticsCenter';
import StreamingTitleDossier from '../components/StreamingTitleDossier';
import StreamingWeeklyCeoLoop from '../components/StreamingWeeklyCeoLoop';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we6-ui-audit';
player.age = 31;
player.currentWeek = 14;
player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Every screen deserves a great story.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};
player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
player.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs', 'ads', 'rentals', 'premium', 'sponsor'],
    plans: [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 7, featureIds: ['hd'], ads: true, colorId: 'emerald' },
        { id: 'PREMIERE', name: 'Premiere', monthly: 18, featureIds: ['uhd', 'noads'], ads: false, colorId: 'magenta' },
    ],
    sponsor: { perTitle: 3_000_000, titles: 1 },
};
player.ownedStreamingPlatform.metrics.subscribers = 250_000;
const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
player.ownedStreamingPlatform.launchCommit = {
    id: 'we6-ui-launch', idempotencyKey: 'we6-ui-launch:empire-plus', committedAtAbsoluteWeek: absoluteWeek - 3,
    capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 88,
    forecastLikelyConcurrentStreams: 150_000, forecastHighConcurrentStreams: 300_000,
    protectedPeakConcurrentStreams: 600_000, launchHeadroomPercent: 50, initialSubscribers: 250_000,
    openingDemandIndex: 78, playbackSuccessRate: 99.5, outcomeTier: 'SMOOTH_OPENING',
    openingTitleCount: 1, openingOriginalTitle: 'City of Monsoon',
};
player.world.projects = [{
    id: 'we6-ui-title', title: 'City of Monsoon', genre: 'DRAMA', originalLanguageId: 'Hindi', mediaType: 'MOVIE',
    targetAudience: 'MASS', studioId: 'empire-studios', budgetTier: 'HIGH', quality: 91, rating: 8.4,
    boxOffice: 180_000_000, year: player.age, weekReleased: player.currentWeek - 1,
    leadActorId: 'star-local', leadActorName: 'Aarav Shah', directorId: 'director-local', directorName: 'Mira Rao',
    reviews: 'A culturally precise audience favorite.', isFamous: true,
}] as any;
player.ownedStreamingPlatform.originalCommissions = [{
    id: 'we6-ui-commission', scriptId: 'we6-ui-script', canonicalProjectId: 'we6-ui-title',
    title: 'City of Monsoon', gapId: 'LOCAL_BREAKOUT', projectType: 'MOVIE', genre: 'DRAMA', episodes: 1,
    producerStudioId: 'empire-studios', producerStudioName: 'Empire Studios', commissionedByPlatformName: 'Empire+',
    productionBudgetCap: 80_000_000, productionFundingApplied: 80_000_000, status: 'RELEASED',
    commissionedAtAbsoluteWeek: absoluteWeek - 20, greenlitAtAbsoluteWeek: absoluteWeek - 18,
}] as any;
player.ownedStreamingPlatform.catalogProjectIds = ['we6-ui-title'];
player.ownedStreamingPlatform.launchSlate = {
    entries: [{
        id: 'we6-ui-slate', projectId: 'we6-ui-title', title: 'City of Monsoon', source: 'ORIGINAL',
        projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 3, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'EVENT',
    }],
    programmedAtAbsoluteWeek: absoluteWeek - 2,
    revision: 1,
};
player.world.worldStreamingCompetition = createWorldStreamingCompetitionState(player, absoluteWeek);
player.world.worldStreamingCustomers = createWorldStreamingCustomerState(player, absoluteWeek);
player.world.worldStreamingViewing = createWorldStreamingViewingState(player, absoluteWeek);

const processed = processOwnedStreamingPlatformWeek(player).player;
const title = getStreamingTitleAnalytics(processed, 'we6-ui-title').selected!;
assert.ok(title.totalEstimatedViewers! > 0, 'title analytics expose estimated viewers');
assert.ok(title.paidViewingAccounts! > 0, 'title analytics expose paid viewing');
assert.ok(title.sharedViewingAccounts! >= 0 && title.piracyViewingAccounts! >= 0, 'title analytics preserve shared and piracy paths');
assert.ok(title.topCountryId, 'title analytics expose the strongest country');
assert.ok(title.incrementalRevenue! > 0, 'title analytics expose incremental commercial revenue');

const audienceMarkup = renderToStaticMarkup(<StreamingAnalyticsCenter
    player={processed}
    onClose={() => undefined}
    initialMode="ANALYST"
    initialAnalystTab="AUDIENCE"
/>);
['WATCHING ACCOUNTS', 'WATCH HOURS', 'UNMET DEMAND', 'SHARED VIEWING', 'PIRATED VIEWING'].forEach(text => (
    assert.ok(audienceMarkup.toUpperCase().includes(text), `Analytics Center renders ${text}`)
));

const financeMarkup = renderToStaticMarkup(<StreamingAnalyticsCenter
    player={processed}
    onClose={() => undefined}
    initialMode="ANALYST"
    initialAnalystTab="FINANCE"
/>);
['ADVERTISING', 'TRANSACTIONS', 'SPONSORSHIP', 'INCREMENTAL REVENUE'].forEach(text => (
    assert.ok(financeMarkup.toUpperCase().includes(text), `Analytics Center renders ${text}`)
));
assert.equal((financeMarkup.toUpperCase().match(/SUBSCRIPTION CASH/g) || []).length, 1, 'Finance renders one unambiguous subscription-cash label');

const titleMarkup = renderToStaticMarkup(<StreamingTitleDossier player={processed} onClose={() => undefined} initialProjectId="we6-ui-title" />);
['ESTIMATED VIEWERS', 'TOP COUNTRY', 'PAID VIEWING', 'SHARED VIEWING', 'PIRATED VIEWING'].forEach(text => (
    assert.ok(titleMarkup.toUpperCase().includes(text), `Title Dossier renders ${text}`)
));

const weeklyMarkup = renderToStaticMarkup(<StreamingWeeklyCeoLoop player={processed} onUpdatePlayer={() => undefined} onReturnToGame={() => undefined} />);
['WATCH HOURS', 'UNMET DEMAND', 'ADVERTISING', 'TRANSACTIONS', 'SPONSORSHIP'].forEach(text => (
    assert.ok(weeklyMarkup.toUpperCase().includes(text), `weekly CEO report renders ${text}`)
));

console.log('WE6 title dossier, Analytics Center, and weekly CEO report UI audit passed.');
