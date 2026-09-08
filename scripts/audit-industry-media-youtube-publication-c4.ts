// @ts-nocheck - executable C4 editorial, lineage, and idempotency fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryMediaYoutube,
    advanceIndustryMediaStories,
} from '../services/industryWorld';

const makePlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'player_c4';
    player.name = 'Empire Studios';
    player.age = 40;
    player.currentWeek = 12;
    return player;
};

const event = createIndustryEventFact({
    idempotencyKey: 'c4:publication:franchise',
    absoluteWeek: 2_092,
    type: 'FRANCHISE_DECISION',
    importance: 'HIGH',
    companyId: 'player_c4',
    companyName: 'Empire Studios',
    projectId: 'night_signal',
    headline: 'Empire Studios confirms the Night Signal universe',
    detail: 'The studio confirmed that Night Signal belongs to a connected science-fiction universe.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1,
    id: 'story_c4_franchise',
    subjectKey: 'project:night_signal',
    category: 'FRANCHISE',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: event.id,
    industryEventIds: [event.id],
    firstAbsoluteWeek: 2_092,
    lastAdvancedAbsoluteWeek: 2_092,
    headline: event.headline,
    detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'],
    publishedChannels: ['NEWS', 'X'],
    companyId: 'player_c4',
    companyName: 'Empire Studios',
    projectId: 'night_signal',
};

const player = makePlayer();
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });
const youtubeRoles = new Set(player.world.industryMedia.personalities
    .filter(item => item.channels.includes('YOUTUBE'))
    .map(item => item.role));
assert.ok(youtubeRoles.has('THEORY_CREATOR'));
assert.ok(youtubeRoles.has('BUSINESS_ANALYST'));
assert.ok(youtubeRoles.has('CRITIC'));
assert.ok(youtubeRoles.has('COMMENTATOR'));
const originalYoutube = structuredClone(player.youtube);

const first = processIndustryMediaYoutube(player, 2_092);
assert.equal(first.createdVideos.length, 1);
assert.equal(first.player.world.industryMedia?.youtubeVideos.length, 1);
const published = first.createdVideos[0];
assert.equal(published.format, 'THEORY');
assert.equal(published.claimMode, 'SPECULATION');
assert.match(published.interpretation || '', /\b(theory|could|may|possibly)\b/i);
assert.equal(published.industryEventId, event.id);
assert.equal(published.mediaStoryId, story.id);
assert.ok(published.evidenceEventIds.includes(event.id));
assert.deepEqual(first.player.youtube, originalYoutube, 'NPC videos must never mutate the player channel');

const replay = processIndustryMediaYoutube(first.player, 2_092);
assert.equal(replay.createdVideos.length, 0);
assert.deepEqual(replay.player.world.industryMedia, first.player.world.industryMedia,
    'same-week replay must not reroll publication or performance');

const deterministicPlayer = makePlayer();
deterministicPlayer.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
deterministicPlayer.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });
assert.deepEqual(
    processIndustryMediaYoutube(deterministicPlayer, 2_092).createdVideos,
    first.createdVideos,
    'identical saved inputs must publish byte-for-byte identical videos',
);

const rightsEvent = createIndustryEventFact({
    idempotencyKey: 'c4:publication:rights', absoluteWeek: 2_094, type: 'RIGHTS_TRANSFER', importance: 'HIGH',
    companyId: 'hulu', companyName: 'Hulu', projectId: 'night_signal', rightsContractId: 'rights_night_signal',
    headline: 'Hulu transfers Night Signal Japan rights',
    detail: 'The canonical Japan rights contract transferred from Hulu to another eligible platform.',
    evidence: [{ kind: 'RIGHTS_CONTRACT', id: 'rights_night_signal' }],
});
const rightsAdvance = advanceIndustryMediaStories(undefined, [rightsEvent], 2_094);
assert.ok(rightsAdvance.state.stories[0].channelEligibility.includes('YOUTUBE'),
    'major rights moves must be eligible for C4 business breakdowns');
const rightsPlayer = makePlayer();
rightsPlayer.world.industryEvents = appendIndustryEventFacts(undefined, [rightsEvent]);
rightsPlayer.world.industryMedia = rightsAdvance.state;
const rightsResult = processIndustryMediaYoutube(rightsPlayer, 2_094);
assert.equal(rightsResult.createdVideos[0].format, 'BUSINESS_BREAKDOWN');
const rightsCreator = rightsResult.player.world.industryMedia!.personalities
    .find(item => item.id === rightsResult.createdVideos[0].personalityId);
assert.equal(rightsCreator?.role, 'BUSINESS_ANALYST');

const greenlightEvent = createIndustryEventFact({
    idempotencyKey: 'c4:publication:greenlight', absoluteWeek: 2_094, type: 'PROJECT_GREENLIT', importance: 'HIGH',
    companyId: 'studio_orbit', companyName: 'Orbit Pictures', projectId: 'signal_city',
    headline: 'Orbit Pictures greenlights Signal City',
    detail: 'Orbit Pictures confirmed that Signal City has entered development.',
    evidence: [{ kind: 'PROJECT', id: 'signal_city' }],
});
const greenlightAdvance = advanceIndustryMediaStories(undefined, [greenlightEvent], 2_094);
assert.ok(greenlightAdvance.state.stories[0].channelEligibility.includes('YOUTUBE'),
    'a major greenlight should support creator speculation before release coverage dominates');
const greenlightPlayer = makePlayer();
greenlightPlayer.world.industryEvents = appendIndustryEventFacts(undefined, [greenlightEvent]);
greenlightPlayer.world.industryMedia = greenlightAdvance.state;
assert.equal(processIndustryMediaYoutube(greenlightPlayer, 2_094).createdVideos[0].format, 'THEORY');

const cappedPlayer = makePlayer();
const cappedEvents = Array.from({ length: 3 }, (_, index) => createIndustryEventFact({
    idempotencyKey: `c4:publication:cap:${index}`, absoluteWeek: 2_095, type: 'PROJECT_RELEASED',
    importance: 'HIGH', companyId: `company_${index}`, companyName: `Studio ${index}`, projectId: `cap_${index}`,
    headline: `Studio ${index} releases Cap Project ${index}`,
    detail: `Cap Project ${index} reached audiences this week.`,
    evidence: [{ kind: 'PROJECT', id: `cap_${index}` }],
}));
const cappedAdvance = advanceIndustryMediaStories(undefined, cappedEvents, 2_095);
cappedPlayer.world.industryEvents = appendIndustryEventFacts(undefined, cappedEvents);
cappedPlayer.world.industryMedia = cappedAdvance.state;
assert.equal(processIndustryMediaYoutube(cappedPlayer, 2_095).createdVideos.length, 2,
    'the weekly C4 editorial budget must remain bounded at two videos');

const responsePlayer = makePlayer();
const responseEvent = createIndustryEventFact({
    idempotencyKey: 'c4:publication:response', absoluteWeek: 2_093, type: 'PROJECT_RELEASED', importance: 'HIGH',
    companyId: 'player_c4', companyName: 'Empire Studios', projectId: 'night_signal',
    headline: 'Night Signal reaches audiences', detail: 'Empire Studios released the completed Night Signal project.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const responseStory: IndustryMediaStory = {
    ...story,
    id: 'story_c4_response',
    category: 'PROJECT_RELEASE',
    primaryIndustryEventId: responseEvent.id,
    industryEventIds: [responseEvent.id],
    firstAbsoluteWeek: 2_093,
    lastAdvancedAbsoluteWeek: 2_093,
    headline: responseEvent.headline,
    detail: responseEvent.detail,
};
const identityState = normalizeIndustryMediaWorld({ stories: [responseStory] });
const sourcePersonality = identityState.personalities[0];
responsePlayer.world.industryEvents = appendIndustryEventFacts(undefined, [responseEvent]);
responsePlayer.world.industryMedia = normalizeIndustryMediaWorld({
    ...identityState,
    discussions: [{
        schemaVersion: 1, id: 'discussion_c4_response', industryEventId: responseEvent.id,
        mediaStoryId: responseStory.id, sourcePostId: `x_${responseEvent.id}`, openedAbsoluteWeek: 2_092,
        lastActivityAbsoluteWeek: 2_093, responseClosesAbsoluteWeek: 2_094, status: 'RESOLVED',
        isPlayerRelated: true, heat: 78, playerResponseId: 'response_c4', turns: [{
            schemaVersion: 1, id: 'turn_c4_source', discussionId: 'discussion_c4_response', kind: 'SOURCE',
            industryEventId: responseEvent.id, mediaStoryId: responseStory.id, absoluteWeek: 2_092,
            content: responseEvent.headline, claimMode: 'FACT', mediaPersonalityId: sourcePersonality.id,
        }],
    }],
    playerResponses: [{
        schemaVersion: 1, id: 'response_c4', discussionId: 'discussion_c4_response',
        industryEventId: responseEvent.id, mediaStoryId: responseStory.id,
        sourcePostId: `x_${responseEvent.id}`, publishedPostId: 'x_response_c4', tone: 'CLARIFY',
        format: 'STATEMENT', speaker: 'STUDIO', content: 'The release plan remains unchanged.',
        submittedAbsoluteWeek: 2_092, resolvesAbsoluteWeek: 2_093, resolvedAbsoluteWeek: 2_093,
        status: 'RESOLVED', outcome: 'LANDED',
        effects: { reputation: 2, controversy: -3, followers: 10_000, mediaStance: 2, discussionHeat: -8 },
    }],
});
const responseResult = processIndustryMediaYoutube(responsePlayer, 2_093);
assert.equal(responseResult.createdVideos.length, 1);
assert.equal(responseResult.createdVideos[0].format, 'RESPONSE_ANALYSIS');
assert.equal(responseResult.createdVideos[0].responseId, 'response_c4');
assert.equal(responseResult.createdVideos[0].responseOutcome, 'LANDED');
assert.deepEqual(responseResult.player.youtube, responsePlayer.youtube);

console.log('Industry media C4 YouTube publication audit passed.');
