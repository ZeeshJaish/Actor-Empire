// @ts-nocheck - executable C3 bounded-state and retention fixtures.
import assert from 'node:assert/strict';
import { type IndustryMediaStory } from '../types';
import { createIndustryEventFact, normalizeIndustryMediaWorld } from '../services/industryWorld';

const event = createIndustryEventFact({
    idempotencyKey: 'c3:bounds', absoluteWeek: 2_000, type: 'PROJECT_RELEASED', importance: 'HIGH',
    companyId: 'player', companyName: 'Empire Studios', projectId: 'bounds_project',
    headline: 'Empire Studios releases Boundless', detail: 'The completed production has been released.',
    evidence: [{ kind: 'PROJECT', id: 'bounds_project' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_bounds', subjectKey: 'project:bounds_project', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: 2_000, lastAdvancedAbsoluteWeek: 2_000, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X'], publishedChannels: ['X'], companyId: 'player', companyName: 'Empire Studios',
    projectId: 'bounds_project',
};
const seeded = normalizeIndustryMediaWorld({ stories: [story], eventStoryIndex: { [event.id]: story.id } });
const personality = seeded.personalities[0];
const discussions = Array.from({ length: 140 }, (_, index) => ({
    schemaVersion: 1,
    id: `discussion_${index.toString().padStart(3, '0')}`,
    industryEventId: event.id,
    mediaStoryId: story.id,
    sourcePostId: `source_${index}`,
    openedAbsoluteWeek: 2_000 + index,
    lastActivityAbsoluteWeek: 2_000 + index,
    responseClosesAbsoluteWeek: 2_002 + index,
    status: index === 0 ? 'RESPONDED' : 'OPEN',
    isPlayerRelated: true,
    heat: 50,
    turns: Array.from({ length: 12 }, (_, turnIndex) => ({
        schemaVersion: 1,
        id: `turn_${index}_${turnIndex}`,
        discussionId: `discussion_${index.toString().padStart(3, '0')}`,
        kind: turnIndex === 0 ? 'SOURCE' : 'MEDIA',
        industryEventId: event.id,
        mediaStoryId: story.id,
        absoluteWeek: 2_000 + index,
        content: turnIndex === 0 ? event.headline : 'The confirmed move remains open to public debate.',
        claimMode: turnIndex === 0 ? 'FACT' : 'OPINION',
        mediaPersonalityId: personality.id,
    })),
    ...(index === 0 ? { playerResponseId: 'pending_old_response' } : {}),
}));
const pendingResponse = {
    schemaVersion: 1,
    id: 'pending_old_response',
    discussionId: 'discussion_000',
    industryEventId: event.id,
    mediaStoryId: story.id,
    sourcePostId: 'source_0',
    publishedPostId: 'x_pending_old_response',
    tone: 'CLARIFY',
    format: 'REPLY',
    speaker: 'STUDIO',
    content: `${event.headline}. We will let the work speak for itself.`,
    submittedAbsoluteWeek: 2_001,
    resolvesAbsoluteWeek: 2_002,
    status: 'PENDING',
};
const normalized = normalizeIndustryMediaWorld({
    ...seeded,
    discussions,
    playerResponses: [
        pendingResponse,
        { ...pendingResponse, id: 'duplicate_response', publishedPostId: 'x_duplicate_response' },
    ],
    processedDiscussionKeys: Array.from({ length: 400 }, (_, index) => `discussion_key_${index}`),
    processedResponseKeys: Array.from({ length: 400 }, (_, index) => `response_key_${index}`),
});

assert.equal(normalized.discussions.length, 120);
assert.ok(normalized.discussions.every(item => item.turns.length <= 8));
assert.ok(normalized.discussions.some(item => item.id === 'discussion_000'),
    'an old discussion with a pending player response must survive before inactive history');
assert.equal(normalized.playerResponses.length, 1, 'one canonical response per discussion/event must survive normalization');
assert.equal(normalized.playerResponses[0].id, 'pending_old_response');
assert.equal(normalized.processedDiscussionKeys.length, 240);
assert.equal(normalized.processedResponseKeys.length, 240);

console.log('Industry media C3 bounds audit passed.');
