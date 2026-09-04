// @ts-nocheck - executable deterministic story fixtures.
import assert from 'node:assert/strict';
import { createIndustryEventFact } from '../services/industryWorld/industryEventLedger';
import {
    INDUSTRY_MEDIA_RELEVANCE_WEEKS,
    advanceIndustryMediaStories,
} from '../services/industryWorld/industryMediaStories';

const releasePlanned = createIndustryEventFact({
    idempotencyKey: 'media:release-plan:crimson-horizon',
    absoluteWeek: 500,
    type: 'PROJECT_RELEASE_PLANNED',
    importance: 'MEDIUM',
    companyId: 'EMPIRE_STUDIOS',
    companyName: 'Empire Studios',
    projectId: 'project_crimson_horizon',
    productionId: 'production_crimson_horizon',
    headline: 'Crimson Horizon receives a release plan',
    detail: 'Empire Studios placed the project on its saved release calendar.',
    evidence: [{ kind: 'PROJECT', id: 'project_crimson_horizon' }],
});
const delayed = createIndustryEventFact({
    idempotencyKey: 'media:delay:crimson-horizon',
    absoluteWeek: 501,
    type: 'PROJECT_DELAYED',
    importance: 'HIGH',
    companyId: 'EMPIRE_STUDIOS',
    companyName: 'Empire Studios',
    projectId: 'project_crimson_horizon',
    productionId: 'production_crimson_horizon',
    headline: 'Crimson Horizon moves behind schedule',
    detail: 'The saved production calendar records a material delay.',
    evidence: [{ kind: 'PRODUCTION', id: 'production_crimson_horizon' }],
});
const hit = createIndustryEventFact({
    idempotencyKey: 'media:hit:crimson-horizon',
    absoluteWeek: 505,
    type: 'PROJECT_HIT',
    importance: 'HIGH',
    companyId: 'EMPIRE_STUDIOS',
    companyName: 'Empire Studios',
    projectId: 'project_crimson_horizon',
    productionId: 'production_crimson_horizon',
    headline: 'Crimson Horizon breaks out',
    detail: 'The canonical commercial settlement records a hit.',
    evidence: [{ kind: 'PROJECT', id: 'project_crimson_horizon' }],
});

const first = advanceIndustryMediaStories(undefined, [releasePlanned], 500);
assert.equal(first.state.stories.length, 1);
assert.equal(first.state.stories[0].subjectKey, 'project:project_crimson_horizon');
assert.equal(first.state.stories[0].stage, 'CONFIRMED');
assert.equal(first.state.stories[0].category, 'PROJECT_RELEASE');
assert.equal(first.eventStoryIds[releasePlanned.id], first.state.stories[0].id);

const second = advanceIndustryMediaStories(first.state, [releasePlanned, delayed], 501);
assert.equal(second.state.stories.length, 1, 'compatible project developments must share one active story');
assert.deepEqual(second.state.stories[0].industryEventIds, [releasePlanned.id, delayed.id]);
assert.equal(second.state.stories[0].stage, 'DEVELOPING');
assert.equal(second.state.stories[0].category, 'PROJECT_PRODUCTION');
assert.equal(second.state.stories[0].importance, 'HIGH');
assert.equal(second.state.stories[0].headline, delayed.headline);
assert.equal(second.changedStoryIds.length, 1);

const otherProject = createIndustryEventFact({
    idempotencyKey: 'media:greenlight:quiet-room',
    absoluteWeek: 501,
    type: 'PROJECT_GREENLIT',
    importance: 'MEDIUM',
    companyId: 'PARAMOUNT',
    companyName: 'Paramount',
    projectId: 'project_quiet_room',
    headline: 'Quiet Room is greenlit',
    detail: 'Paramount advanced a separate project.',
    evidence: [{ kind: 'PROJECT', id: 'project_quiet_room' }],
});
const separated = advanceIndustryMediaStories(second.state, [otherProject], 501);
assert.equal(separated.state.stories.length, 2, 'unrelated canonical subjects must remain separate stories');

const resolved = advanceIndustryMediaStories(separated.state, [hit], 505);
const resolvedCrimson = resolved.state.stories.find(story => story.projectId === 'project_crimson_horizon');
assert.equal(resolvedCrimson?.stage, 'RESOLVED');
assert.equal(resolvedCrimson?.category, 'PROJECT_OUTCOME');
assert.equal(resolvedCrimson?.resolutionIndustryEventId, hit.id);
assert.equal(resolvedCrimson?.resolutionAbsoluteWeek, 505);
assert.deepEqual(
    advanceIndustryMediaStories(resolved.state, [hit], 505).state,
    resolved.state,
    'same-event replay must be an exact no-op',
);

const laterAward = createIndustryEventFact({
    idempotencyKey: 'media:award:crimson-horizon',
    absoluteWeek: 520,
    type: 'AWARD_WON',
    importance: 'HIGH',
    companyId: 'EMPIRE_STUDIOS',
    companyName: 'Empire Studios',
    projectId: 'project_crimson_horizon',
    awardEventId: 'award_crimson_picture',
    headline: 'Crimson Horizon wins Best Picture',
    detail: 'The canonical awards record names the project as winner.',
    evidence: [{ kind: 'AWARD', id: 'award_crimson_picture' }],
});
const awardState = advanceIndustryMediaStories(resolved.state, [laterAward], 520);
assert.equal(
    awardState.state.stories.filter(story => story.projectId === 'project_crimson_horizon').length,
    2,
    'a terminal story must not reopen when a later independent chapter begins',
);
assert.equal(awardState.state.stories.at(-1)?.category, 'AWARDS');

const faded = advanceIndustryMediaStories(
    second.state,
    [],
    delayed.absoluteWeek + INDUSTRY_MEDIA_RELEVANCE_WEEKS + 1,
);
assert.equal(faded.state.stories[0].stage, 'FADED');
assert.equal(faded.state.lastProcessedAbsoluteWeek,
    delayed.absoluteWeek + INDUSTRY_MEDIA_RELEVANCE_WEEKS + 1);

console.log('Industry media C1 story-arc audit passed.');
