// @ts-nocheck - executable C4 creator-performance fixtures.
import assert from 'node:assert/strict';
import type { IndustryMediaCreatorChannel, IndustryMediaPersonality, IndustryMediaStory } from '../types';
import { calculateIndustryMediaYoutubePerformance } from '../services/industryWorld';

const personality = (id: string, reach: number): IndustryMediaPersonality => ({
    schemaVersion: 1, id, name: id, handle: `@${id}`, avatar: `media-personality:${id}`, gender: 'NON_BINARY',
    role: 'THEORY_CREATOR', voiceArchetype: 'FAN_SCHOLAR', channels: ['YOUTUBE'], homeRegionId: 'GLOBAL',
    languageIds: ['en'], focusCategories: ['FRANCHISE'], preferredGenreIds: ['SCI_FI'], credibility: 70,
    reach, aggression: 20, optimism: 70, humour: 50, sensationalism: 45, independence: 80,
    baselinePlayerAffinity: 0, stanceFloor: -100, stanceCeiling: 100, isAnchor: false, isActive: true,
    verified: reach >= 65, lastAppearanceAbsoluteWeek: -1, recentStoryIds: [],
});
const channel = (personalityId: string, subscribers: number): IndustryMediaCreatorChannel => ({
    schemaVersion: 1, id: `youtube_channel_${personalityId}`, personalityId, subscribers, totalViews: subscribers * 10,
    credibility: 70, momentum: 50, sponsorAppeal: 50, estimatedLifetimeRevenue: 0, uploadCount: 10,
    hitCount: 2, flopCount: 1, lastUploadAbsoluteWeek: 990, recentVideoIds: [],
});
const story = (id: string): IndustryMediaStory => ({
    schemaVersion: 1, id, subjectKey: `project:${id}`, category: 'FRANCHISE', stage: 'CONFIRMED',
    importance: 'HIGH', primaryIndustryEventId: `event_${id}`, industryEventIds: [`event_${id}`],
    firstAbsoluteWeek: 1_000, lastAdvancedAbsoluteWeek: 1_000, headline: `${id} universe confirmed`,
    detail: 'A connected universe was confirmed.', channelEligibility: ['YOUTUBE'], publishedChannels: [],
    projectId: id,
});

const stableInput = {
    personality: personality('stable_creator', 60),
    channel: channel('stable_creator', 180_000),
    story: story('stable_story'),
    format: 'THEORY' as const,
    discussionHeat: 60,
    absoluteWeek: 1_000,
    seedKey: 'stable-performance',
};
const first = calculateIndustryMediaYoutubePerformance(stableInput);
const replay = calculateIndustryMediaYoutubePerformance(structuredClone(stableInput));
assert.deepEqual(replay, first, 'performance must be deterministic');
assert.ok(Number.isFinite(first.views) && first.views >= 0);
assert.ok(first.likes >= 0 && first.likes <= first.views);
assert.ok(first.estimatedRevenue >= 0);

const outcomes = new Set<string>();
for (let index = 0; index < 300; index += 1) {
    outcomes.add(calculateIndustryMediaYoutubePerformance({
        personality: personality(`small_${index}`, 28),
        channel: channel(`small_${index}`, 12_000),
        story: story(`small_story_${index}`),
        format: 'THEORY', discussionHeat: 85, absoluteWeek: 1_000, seedKey: `small:${index}`,
    }).outcome);
}
assert.ok(outcomes.has('BREAKOUT'), 'a small well-matched creator must have a real breakout path');

let foundLargeFlop = false;
for (let index = 0; index < 400; index += 1) {
    const result = calculateIndustryMediaYoutubePerformance({
        personality: personality(`large_${index}`, 90),
        channel: { ...channel(`large_${index}`, 4_000_000), momentum: 8, lastUploadAbsoluteWeek: 1_000 },
        story: { ...story(`large_story_${index}`), importance: 'MEDIUM', lastAdvancedAbsoluteWeek: 992 },
        format: 'CREATOR_REACTION', discussionHeat: 5, absoluteWeek: 1_000, seedKey: `large:${index}`,
    });
    if (result.outcome === 'FLOP') foundLargeFlop = true;
}
assert.ok(foundLargeFlop, 'a large fatigued creator must still be able to flop');

console.log('Industry media C4 YouTube performance audit passed.');
