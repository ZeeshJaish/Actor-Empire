// @ts-nocheck - executable C6 entered-week publication and exactly-once fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaClaim, type IndustryMediaStory, type Player } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryWorldWeek,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryProductions = {};

const createdWeek = 2_798;
const absoluteWeek = 2_800;
const anchor = createIndustryEventFact({
    idempotencyKey: 'c6:week:anchor', absoluteWeek: createdWeek,
    type: 'PROJECT_RELEASE_PLANNED', importance: 'HIGH', companyId: player.id,
    companyName: player.name, projectId: 'night_signal', headline: 'Night Signal receives a release plan',
    detail: 'Empire Studios has publicly dated its new mystery film.', evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const result = createIndustryEventFact({
    idempotencyKey: 'c6:week:result', absoluteWeek,
    type: 'PROJECT_HIT', importance: 'HIGH', companyId: player.id,
    companyName: player.name, projectId: 'night_signal', headline: 'Night Signal breaks out',
    detail: 'The mystery film became a confirmed commercial hit.', evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const newAnchor = createIndustryEventFact({
    idempotencyKey: 'c6:week:new-anchor', absoluteWeek,
    type: 'COMPANY_DISTRESS', importance: 'HIGH', companyId: 'northstar_media',
    companyName: 'Northstar Media', headline: 'Northstar Media faces pressure',
    detail: 'The company confirmed a difficult quarter and a tighter runway.', evidence: [{ kind: 'COMPANY', id: 'northstar_media' }],
});
const outcomeStory: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_night_signal', subjectKey: 'project:night_signal', category: 'PROJECT_OUTCOME',
    stage: 'RESOLVED', importance: 'HIGH', primaryIndustryEventId: anchor.id,
    industryEventIds: [anchor.id, result.id], firstAbsoluteWeek: createdWeek,
    lastAdvancedAbsoluteWeek: absoluteWeek, headline: result.headline, detail: result.detail,
    channelEligibility: ['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE'], publishedChannels: ['NEWS'],
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
};
const companyStory: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_northstar', subjectKey: 'company:northstar_media', category: 'COMPANY',
    stage: 'DEVELOPING', importance: 'HIGH', primaryIndustryEventId: newAnchor.id,
    industryEventIds: [newAnchor.id], firstAbsoluteWeek: absoluteWeek,
    lastAdvancedAbsoluteWeek: absoluteWeek, headline: newAnchor.headline, detail: newAnchor.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: [], companyId: 'northstar_media',
    companyName: 'Northstar Media',
};
const openClaim: IndustryMediaClaim = {
    schemaVersion: 1, id: 'claim_night_signal_hit', claimKey: 'c6:night-signal-hit', kind: 'PREDICTION',
    status: 'OPEN', category: 'PROJECT_OUTCOME', confidence: 'CREDIBLE_CHATTER',
    subjectKey: outcomeStory.subjectKey, subjectName: 'Night Signal', anchorIndustryEventId: anchor.id,
    anchorStoryId: outcomeStory.id, evidenceEventIds: [anchor.id], institutionId: 'screenline_trade',
    personalityId: 'mara_voss', publicationChannel: 'X', importance: 'HIGH',
    headline: 'Screenline prediction: Night Signal',
    summary: 'Night Signal could become a hit. The prediction remains unconfirmed.',
    knownEvidence: 'Confirmed context: the film has a release plan.',
    target: { expectedEventTypes: ['PROJECT_HIT'], projectId: 'night_signal', expectedOutcome: 'HIT' },
    createdAbsoluteWeek: createdWeek, earliestResolutionAbsoluteWeek: createdWeek + 1,
    expiryAbsoluteWeek: createdWeek + 18, lastEvaluatedAbsoluteWeek: createdWeek, playerRelated: true,
};

player.world.industryEvents = appendIndustryEventFacts(undefined, [anchor, result, newAnchor]);
player.world.industryMedia = normalizeIndustryMediaWorld({
    stories: [outcomeStory, companyStory], claims: [openClaim],
    eventStoryIndex: { [anchor.id]: outcomeStory.id, [result.id]: outcomeStory.id, [newAnchor.id]: companyStory.id },
});

const once = processIndustryWorldWeek(player, player.world, absoluteWeek);
assert.equal(once.processed, true);
const resolved = once.player.world.industryMedia.claims.find(item => item.id === openClaim.id);
assert.equal(resolved?.status, 'CONFIRMED');
const newClaims = once.player.world.industryMedia.claims.filter(item => item.createdAbsoluteWeek === absoluteWeek);
assert.ok(newClaims.length <= 1, 'C6 may create at most one new claim in an entered week');
const claimPosts = once.player.x.feed.filter(post => post.id.startsWith('x_claim_'));
assert.ok(claimPosts.some(post => post.mediaClaimId === openClaim.id), 'resolved claim must receive a saved X follow-up');
assert.ok(claimPosts.length <= 2, 'C6 may publish at most two claim beats in one entered week');
const origin = newClaims[0] && claimPosts.find(post => post.mediaClaimId === newClaims[0].id);
if (newClaims[0]) {
    assert.ok(origin, 'new claim must be published into the saved X feed');
    assert.equal(origin?.industryEventId, newClaims[0].anchorIndustryEventId);
    assert.equal(origin?.mediaStoryId, newClaims[0].anchorStoryId);
}

const replay = processIndustryWorldWeek(once.player, once.world, absoluteWeek);
assert.equal(replay.processed, false);
assert.deepEqual(replay.player, once.player);
assert.equal(replay.socialPosts.length, 0);

console.log('Industry media C6 claim entered-week audit passed.');
