// @ts-nocheck - deterministic 400-year bounded-history fixture.
import assert from 'node:assert/strict';
import { createIndustryEventFact } from '../services/industryWorld/industryEventLedger';
import {
    INDUSTRY_MEDIA_STORY_EVENT_LIMIT,
    INDUSTRY_MEDIA_STORY_LIMIT,
} from '../services/industryWorld/industryMediaLedger';
import { advanceIndustryMediaStories } from '../services/industryWorld/industryMediaStories';

const horizonWeeks = 20_800;
let mediaWorld;
const canonicalEventIds = new Set<string>();

for (let absoluteWeek = 1; absoluteWeek <= horizonWeeks; absoluteWeek += 1) {
    const projectSequence = Math.floor((absoluteWeek - 1) / 3);
    const phase = (absoluteWeek - 1) % 3;
    const projectId = `long_project_${projectSequence}`;
    const type = phase === 0 ? 'PROJECT_GREENLIT' : phase === 1 ? 'PROJECT_RELEASED' : (
        projectSequence % 5 === 0 ? 'PROJECT_HIT' : 'PROJECT_FLOP'
    );
    const event = createIndustryEventFact({
        idempotencyKey: `c1:long:${projectId}:${type}`,
        absoluteWeek,
        type,
        importance: phase === 2 ? 'HIGH' : 'MEDIUM',
        companyId: `studio_${projectSequence % 18}`,
        companyName: `Studio ${projectSequence % 18}`,
        projectId,
        productionId: `production_${projectSequence}`,
        headline: `${projectId} ${type.toLowerCase()}`,
        detail: `Canonical phase ${phase} for ${projectId}.`,
        evidence: [{ kind: 'PROJECT', id: projectId }],
    });
    canonicalEventIds.add(event.id);
    mediaWorld = advanceIndustryMediaStories(mediaWorld, [event], absoluteWeek).state;
}

assert.ok(mediaWorld.stories.length <= INDUSTRY_MEDIA_STORY_LIMIT);
assert.equal(new Set(mediaWorld.stories.map(story => story.id)).size, mediaWorld.stories.length);
assert.ok(mediaWorld.stories.every(story => story.industryEventIds.length <= INDUSTRY_MEDIA_STORY_EVENT_LIMIT));
assert.ok(mediaWorld.stories.every(story => (
    story.industryEventIds.every(eventId => canonicalEventIds.has(eventId))
)), 'every retained media reference must trace to a generated canonical event');
assert.equal(Object.keys(mediaWorld.eventStoryIndex).length,
    mediaWorld.stories.reduce((total, story) => total + story.industryEventIds.length, 0));

const replay = advanceIndustryMediaStories(mediaWorld, [], horizonWeeks).state;
assert.deepEqual(replay, mediaWorld, 'same-week long-run replay must be identical');

const retainedBytes = Buffer.byteLength(JSON.stringify(mediaWorld));
assert.ok(retainedBytes < 600_000, `bounded media state exceeded 600 KB: ${retainedBytes}`);

console.log(JSON.stringify({
    horizonWeeks,
    retainedStories: mediaWorld.stories.length,
    retainedEventReferences: Object.keys(mediaWorld.eventStoryIndex).length,
    retainedBytes,
}));
console.log('Industry media C1 400-year audit passed.');
