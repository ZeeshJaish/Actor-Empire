// @ts-nocheck - executable C5 Instagram campaign surface fixture.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IndustryMediaCampaign, IndustryMediaFandom } from '../types';
import { buildIndustryFandomProfilePosts, IndustryCampaignContextPanel, IndustryFandomTrendStrip } from '../views/mobile/InstagramApp';

const fandom: IndustryMediaFandom = {
    schemaVersion: 1, id: 'fandom_ui', name: 'Night Signal Guard', handle: '@NightSignalGuard', bio: 'Fan-run.',
    primaryColor: '#7C3AED', secondaryColor: '#111827', avatar: 'data:image/svg+xml,local', motif: 'PROTECTIVE',
    subjectKey: 'project:night_signal', subjectName: 'Night Signal', companyId: 'empire_studios', projectId: 'night_signal',
    archetype: 'PROTECTIVE', homeRegionId: 'GLOBAL', languageId: 'en', size: 82_500, loyalty: 74, activity: 76,
    coordination: 68, optimism: 62, volatility: 42, formedAbsoluteWeek: 2_000, lastActiveAbsoluteWeek: 2_100,
    friendlySubjectKeys: [], rivalSubjectKeys: [], recentCampaignIds: ['campaign_ui'],
};
const campaign: IndustryMediaCampaign = {
    schemaVersion: 1, id: 'campaign_ui', campaignKey: 'c5:ui', fandomId: fandom.id, industryEventId: 'event_ui',
    mediaStoryId: 'story_ui', evidenceEventIds: ['event_ui'], subjectKey: fandom.subjectKey, type: 'DEFEND_SUBJECT',
    hashtag: '#StandWithNightSignal', headline: 'Fans rally around Night Signal', purpose: 'Support the film.',
    context: 'The fan conversation is gathering momentum.', stage: 'RALLY', startedAbsoluteWeek: 2_100,
    lastAdvancedAbsoluteWeek: 2_101, nextEligibleAbsoluteWeek: 2_102, reach: 250_000, participation: 44_000,
    coordination: 68, sentiment: 22, heat: 79, performanceRoll: 0.7, playerRelated: true, moments: [],
};

const trends = renderToStaticMarkup(<IndustryFandomTrendStrip fandoms={[fandom]} campaigns={[campaign]} onOpen={() => undefined} />);
assert.match(trends, /Trending in entertainment/);
assert.match(trends, /Night Signal Guard/);
assert.match(trends, /#StandWithNightSignal/);
const profileTiles = buildIndustryFandomProfilePosts(fandom, [campaign], []);
assert.equal(profileTiles.length, 9);
assert.ok(profileTiles.every(post => post.fandomId === fandom.id));
assert.ok(profileTiles.every(post => !post.contentImage || post.contentImage.startsWith('data:image/')));

const context = renderToStaticMarkup(
    <IndustryCampaignContextPanel campaign={campaign} fandom={fandom} onParticipate={() => undefined} onLetFansLead={() => undefined} />,
);
assert.match(context, /Fan-led campaign/);
assert.match(context, /Join the moment/);
assert.match(context, /Thank the fans/);
assert.match(context, /Let fans lead/);
assert.match(context, /#StandWithNightSignal/);
assert.doesNotMatch(context, /undefined|null/);

const closed = renderToStaticMarkup(
    <IndustryCampaignContextPanel campaign={{ ...campaign, stage: 'CLOSED', outcome: 'STRONG' }} fandom={fandom} onParticipate={() => undefined} onLetFansLead={() => undefined} />,
);
assert.doesNotMatch(closed, /Join the moment|Thank the fans/);
assert.match(closed, /Strong/);

console.log('Industry media C5 Instagram fandom UI audit passed.');
