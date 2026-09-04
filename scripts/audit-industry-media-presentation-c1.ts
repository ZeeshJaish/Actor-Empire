// @ts-nocheck - executable deterministic presentation fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    projectIndustryEvents,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.age = 34;
player.currentWeek = 25;
player.news = [];
player.x.feed = [];
player.instagram.feed = [];

const release = createIndustryEventFact({
    idempotencyKey: 'c1:presentation:release:midnight-signal',
    absoluteWeek: 1_792,
    type: 'PROJECT_RELEASED',
    importance: 'HIGH',
    companyId: 'WARNER_BROS',
    companyName: 'Warner Bros.',
    projectId: 'project_midnight_signal',
    productionId: 'production_midnight_signal',
    headline: 'Midnight Signal reaches theatres',
    detail: 'Warner Bros. opened the saved theatrical release this week.',
    evidence: [
        { kind: 'PROJECT', id: 'project_midnight_signal' },
        { kind: 'PRODUCTION', id: 'production_midnight_signal' },
    ],
});
const ledger = appendIndustryEventFacts(undefined, [release]);

const weekOne = projectIndustryEvents(player, ledger, 1_792, undefined);
const storyId = weekOne.news[0]?.mediaStoryId;
assert.ok(storyId, 'immediate factual coverage must carry a media story identity');
assert.equal(weekOne.xPosts[0]?.mediaStoryId, storyId);
assert.equal(weekOne.news[0]?.industryEventId, release.id);
assert.equal(weekOne.xPosts[0]?.industryEventId, release.id);
assert.equal(weekOne.mediaWorld.eventStoryIndex[release.id], storyId);

const weekTwo = projectIndustryEvents(
    weekOne.player,
    weekOne.ledger,
    1_793,
    weekOne.mediaWorld,
);
assert.equal(weekTwo.news.length, 0, 'a reaction beat must not pretend another factual event occurred');
assert.equal(weekTwo.instaPosts.length, 0);
assert.equal(weekTwo.xPosts.length, 1, 'the scheduled conversation must advance on a later week');
assert.equal(weekTwo.xPosts[0].mediaStoryId, storyId);
assert.equal(weekTwo.xPosts[0].industryEventId, release.id);
assert.match(weekTwo.xPosts[0].content, /Midnight Signal reaches theatres/);
assert.equal(
    weekTwo.mediaWorld.stories.find(story => story.id === storyId)?.nextEligiblePublicationWeek,
    undefined,
    'the one-shot discussion beat must clear its due week',
);

const replay = projectIndustryEvents(
    weekTwo.player,
    weekTwo.ledger,
    1_793,
    weekTwo.mediaWorld,
);
assert.equal(replay.news.length + replay.xPosts.length + replay.instaPosts.length, 0);
assert.deepEqual(replay.player, weekTwo.player, 'same-week story projection replay must be an exact no-op');

const delayed = createIndustryEventFact({
    idempotencyKey: 'c1:presentation:delay:midnight-signal',
    absoluteWeek: 1_793,
    type: 'PROJECT_DELAYED',
    importance: 'HIGH',
    companyId: 'WARNER_BROS',
    companyName: 'Warner Bros.',
    projectId: 'project_midnight_signal',
    productionId: 'production_midnight_signal',
    headline: 'Midnight Signal encounters a delivery delay',
    detail: 'The saved production record moved behind schedule.',
    evidence: [{ kind: 'PRODUCTION', id: 'production_midnight_signal' }],
});
const advancedLedger = appendIndustryEventFacts(weekOne.ledger, [delayed]);
const developmentWeek = projectIndustryEvents(
    weekOne.player,
    advancedLedger,
    1_793,
    weekOne.mediaWorld,
);
assert.equal(developmentWeek.news.length, 1);
assert.equal(developmentWeek.xPosts.length, 1,
    'a new factual development must replace, not stack with, the scheduled generic discussion');
assert.equal(developmentWeek.news[0].mediaStoryId, storyId);
assert.equal(developmentWeek.xPosts[0].mediaStoryId, storyId);
assert.equal(developmentWeek.news[0].industryEventId, delayed.id);
assert.equal(developmentWeek.mediaWorld.stories.length, 1);

const priorityPlayer = structuredClone(player) as Player;
priorityPlayer.news = [];
priorityPlayer.x.feed = [];
priorityPlayer.instagram.feed = [];
const priorityHigh = createIndustryEventFact({
    idempotencyKey: 'c1:priority:high', absoluteWeek: 2_000,
    type: 'PROJECT_RELEASED', importance: 'HIGH', projectId: 'priority_high',
    headline: 'Priority High opens', detail: 'A major canonical release opened.',
    evidence: [{ kind: 'PROJECT', id: 'priority_high' }],
});
const priorityMedium = createIndustryEventFact({
    idempotencyKey: 'c1:priority:medium', absoluteWeek: 2_000,
    type: 'PROJECT_GREENLIT', importance: 'MEDIUM', projectId: 'priority_medium',
    headline: 'Priority Medium advances', detail: 'A medium canonical project advanced.',
    evidence: [{ kind: 'PROJECT', id: 'priority_medium' }],
});
const priorityWeekOne = projectIndustryEvents(
    priorityPlayer,
    appendIndustryEventFacts(undefined, [priorityHigh, priorityMedium]),
    2_000,
    undefined,
);
const priorityCurrent = createIndustryEventFact({
    idempotencyKey: 'c1:priority:current', absoluteWeek: 2_002,
    type: 'COMPANY_CLOSED', importance: 'HIGH', companyId: 'priority_company',
    companyName: 'Priority Company', headline: 'Priority Company closes',
    detail: 'The canonical company record closed this week.',
    evidence: [{ kind: 'COMPANY', id: 'priority_company' }],
});
const priorityWeekTwo = projectIndustryEvents(
    priorityWeekOne.player,
    appendIndustryEventFacts(priorityWeekOne.ledger, [priorityCurrent]),
    2_002,
    priorityWeekOne.mediaWorld,
);
const delayedPriorityBeat = priorityWeekTwo.xPosts.find(post => post.id.startsWith('x_story_'));
assert.equal(delayedPriorityBeat?.mediaStoryId, priorityWeekOne.mediaWorld.eventStoryIndex[priorityHigh.id],
    'the highest-importance due story must win the remaining editorial slot');

console.log('Industry media C1 presentation audit passed.');
