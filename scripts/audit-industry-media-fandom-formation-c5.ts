// @ts-nocheck - executable C5 fandom qualification and identity fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import {
    createIndustryMediaFandomIdentity,
    normalizeIndustryMediaWorld,
    qualifyIndustryMediaFandoms,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.projects = [{ id: 'night_signal', title: 'Night Signal' } as any];
const week = 2_400;

const story = (overrides: Partial<IndustryMediaStory>): IndustryMediaStory => ({
    schemaVersion: 1,
    id: overrides.id || 'story_night_signal',
    subjectKey: overrides.subjectKey || 'project:night_signal',
    category: overrides.category || 'FRANCHISE',
    stage: overrides.stage || 'CONFIRMED',
    importance: overrides.importance || 'HIGH',
    primaryIndustryEventId: overrides.primaryIndustryEventId || 'event_night_signal',
    industryEventIds: overrides.industryEventIds || ['event_night_signal', 'event_night_signal_2'],
    firstAbsoluteWeek: overrides.firstAbsoluteWeek || week - 2,
    lastAdvancedAbsoluteWeek: overrides.lastAdvancedAbsoluteWeek || week,
    headline: overrides.headline || 'Empire Studios confirms the Night Signal universe',
    detail: overrides.detail || 'Night Signal is confirmed as part of a connected screen universe.',
    channelEligibility: overrides.channelEligibility || ['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE'],
    publishedChannels: overrides.publishedChannels || ['NEWS'],
    companyId: overrides.companyId ?? player.id,
    companyName: overrides.companyName ?? player.name,
    projectId: overrides.projectId ?? 'night_signal',
    ...overrides,
});

const strongStory = story({});
const lowRoutine = story({
    id: 'story_routine', subjectKey: 'company:routine', category: 'COMPANY', importance: 'LOW',
    primaryIndustryEventId: 'event_routine', industryEventIds: ['event_routine'],
    headline: 'Routine company accounting closes', detail: 'The company completed ordinary accounting.',
    projectId: undefined,
});
const media = normalizeIndustryMediaWorld({ stories: [strongStory, lowRoutine] });
const before = structuredClone(player);
const first = qualifyIndustryMediaFandoms(player, week, media);
const replay = qualifyIndustryMediaFandoms(player, week, media);

assert.deepEqual(player, before, 'qualification must not mutate its player input');
assert.deepEqual(first, replay, 'same inputs must produce identical fandom identities');
assert.equal(first.length, 1, 'at most one newly qualified fandom may form in a week');
assert.equal(first[0].subjectKey, strongStory.subjectKey);
assert.match(first[0].handle, /^@[A-Za-z0-9_]+$/);
assert.match(first[0].avatar, /^data:image\/svg\+xml/);
assert.ok(first[0].size > 0);
assert.ok(!first.some(item => item.subjectKey === lowRoutine.subjectKey));

const existing = normalizeIndustryMediaWorld({ stories: [strongStory], fandoms: first });
assert.equal(qualifyIndustryMediaFandoms(player, week + 1, existing).length, 0, 'one subject cannot form duplicate fandoms');

const archetypes = new Set(Array.from({ length: 80 }, (_, index) => createIndustryMediaFandomIdentity(
    player,
    story({
        id: `story_identity_${index}`,
        subjectKey: `project:identity_${index}`,
        projectId: `identity_${index}`,
        primaryIndustryEventId: `event_identity_${index}`,
        industryEventIds: [`event_identity_${index}`],
        headline: `Identity Project ${index} draws an audience`,
    }),
    week,
).archetype));
assert.deepEqual([...archetypes].sort(), ['ANALYTICAL', 'CREATIVE', 'DEVOTED', 'EVENT', 'PROTECTIVE', 'VOLATILE']);

const nicheStory = story({
    id: 'story_niche', subjectKey: 'project:niche', projectId: 'niche', importance: 'MEDIUM',
    primaryIndustryEventId: 'event_niche', industryEventIds: ['event_niche'],
});
const nicheMedia = normalizeIndustryMediaWorld({
    stories: [nicheStory],
    youtubeVideos: [{
        schemaVersion: 1, id: 'video_niche', publicationKey: 'youtube:niche', industryEventId: 'event_niche',
        mediaStoryId: nicheStory.id, evidenceEventIds: ['event_niche'],
        personalityId: normalizeIndustryMediaWorld({ stories: [nicheStory] }).personalities.find(item => item.channels.includes('YOUTUBE'))?.id,
        format: 'THEORY', claimMode: 'SPECULATION', title: 'Niche theory', summary: 'A theory.',
        confirmedFacts: nicheStory.detail, interpretation: 'Fans think it could continue.',
        thumbnail: { primaryColor: '#7C3AED', secondaryColor: '#111827', label: 'THEORY', motif: 'FRAME' },
        subjectKey: nicheStory.subjectKey, projectId: 'niche', importance: 'MEDIUM', publishedAbsoluteWeek: week,
        lastPerformanceAbsoluteWeek: week, views: 500_000, likes: 50_000, comments: ['Cult audience found this.'],
        outcome: 'BREAKOUT', subscriberDelta: 20_000, estimatedRevenue: 2_000,
    }],
});
const niche = qualifyIndustryMediaFandoms(player, week, nicheMedia);
assert.equal(niche.length, 1, 'a C4 breakout can qualify a smaller cult fandom');
assert.equal(niche[0].subjectKey, nicheStory.subjectKey);

console.log('Industry media C5 fandom formation audit passed.');
