// @ts-nocheck - executable C6 typed truth-resolution fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    resolveIndustryMediaClaims,
} from '../services/industryWorld';

const createdWeek = 2_700;
const resolvedWeek = 2_710;
const cases = [
    { id: 'cast', category: 'CASTING', anchorType: 'PROJECT_GREENLIT', expected: ['PROJECT_CAST'], resultType: 'PROJECT_CAST', expectedTalent: 'talent_priya', resultEvidence: [{ kind: 'TALENT', id: 'talent_priya', metric: 'LEAD' }], status: 'CONFIRMED' },
    { id: 'outcome', category: 'PROJECT_OUTCOME', anchorType: 'PROJECT_RELEASE_PLANNED', expected: ['PROJECT_HIT'], resultType: 'PROJECT_FLOP', status: 'REFUTED' },
    { id: 'window', category: 'RELEASE_WINDOW', anchorType: 'PROJECT_GREENLIT', expected: ['PROJECT_RELEASED'], resultType: 'PROJECT_RELEASED', expectedWeek: resolvedWeek - 5, tolerance: 3, status: 'PARTLY_CONFIRMED' },
    { id: 'rights', category: 'PLATFORM_DESTINATION', anchorType: 'PROJECT_RELEASE_PLANNED', expected: ['RIGHTS_DEAL'], resultType: 'RIGHTS_DEAL', expectedPlatform: 'netflix', resultPlatform: 'netflix', expectedCountries: ['india', 'japan'], resultEvidence: [{ kind: 'COUNTRY', id: 'india' }], status: 'PARTLY_CONFIRMED' },
    { id: 'status', category: 'PROJECT_STATUS', anchorType: 'PROJECT_DELAYED', expected: ['PROJECT_RELEASED'], resultType: 'PROJECT_CANCELLED', status: 'REFUTED' },
    { id: 'franchise', category: 'FRANCHISE_DIRECTION', anchorType: 'PROJECT_HIT', expected: ['FRANCHISE_DECISION'], resultType: 'PROJECT_CANCELLED', expectedUniverse: 'universe_signal', status: 'SUPERSEDED' },
    { id: 'company', category: 'COMPANY_MOVE', anchorType: 'COMPANY_DISTRESS', expected: ['COMPANY_FUNDED'], resultType: 'COMPANY_RESTRUCTURED', companyOnly: true, status: 'REFUTED' },
];

const events = [];
const stories = [];
const claims = [];
for (const item of cases) {
    const projectId = item.companyOnly ? undefined : `project_${item.id}`;
    const companyId = item.companyOnly ? `company_${item.id}` : 'empire_studios';
    const anchor = createIndustryEventFact({
        idempotencyKey: `c6:resolution:${item.id}:anchor`, absoluteWeek: createdWeek,
        type: item.anchorType, importance: 'HIGH', companyId, companyName: item.companyOnly ? 'Rival Company' : 'Empire Studios',
        projectId, headline: `${item.id} anchor`, detail: `${item.id} public context`,
        evidence: [{ kind: item.companyOnly ? 'COMPANY' : 'PROJECT', id: companyId || projectId }],
    });
    const resolution = createIndustryEventFact({
        idempotencyKey: `c6:resolution:${item.id}:result`, absoluteWeek: resolvedWeek,
        type: item.resultType, importance: 'HIGH', companyId, companyName: item.companyOnly ? 'Rival Company' : 'Empire Studios',
        projectId, platformId: item.resultPlatform, headline: `${item.id} result`, detail: `${item.id} canonical result`,
        evidence: item.resultEvidence || [{ kind: item.companyOnly ? 'COMPANY' : 'PROJECT', id: companyId || projectId }],
    });
    events.push(anchor, resolution);
    const story = {
        schemaVersion: 1, id: `story_${item.id}`, subjectKey: item.companyOnly ? `company:${companyId}` : `project:${projectId}`,
        category: item.category === 'COMPANY_MOVE' ? 'COMPANY' : item.category === 'AWARDS' ? 'AWARDS'
            : item.category === 'PLATFORM_DESTINATION' ? 'RIGHTS' : item.category === 'FRANCHISE_DIRECTION' ? 'FRANCHISE'
                : item.category === 'PROJECT_OUTCOME' ? 'PROJECT_OUTCOME' : item.category === 'RELEASE_WINDOW' ? 'PROJECT_RELEASE'
                    : item.category === 'CASTING' ? 'PROJECT_DEVELOPMENT' : 'PROJECT_PRODUCTION',
        stage: 'DEVELOPING', importance: 'HIGH', primaryIndustryEventId: anchor.id,
        industryEventIds: [anchor.id, resolution.id], firstAbsoluteWeek: createdWeek, lastAdvancedAbsoluteWeek: resolvedWeek,
        headline: resolution.headline, detail: resolution.detail, channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: ['NEWS'],
        companyId, companyName: item.companyOnly ? 'Rival Company' : 'Empire Studios', projectId,
    };
    stories.push(story);
    claims.push({
        schemaVersion: 1, id: `claim_${item.id}`, claimKey: `claim-key-${item.id}`, kind: item.category === 'CASTING' ? 'RUMOUR' : 'PREDICTION',
        status: 'OPEN', category: item.category, confidence: 'CREDIBLE_CHATTER', subjectKey: story.subjectKey,
        subjectName: item.companyOnly ? 'Rival Company' : `Project ${item.id}`, anchorIndustryEventId: anchor.id,
        anchorStoryId: story.id, evidenceEventIds: [anchor.id], institutionId: 'screenline_trade', personalityId: 'mara_voss',
        publicationChannel: 'X', importance: 'HIGH', headline: `${item.id} claim`,
        summary: `${item.id} may happen. The report remains unconfirmed.`, knownEvidence: `Confirmed context: ${anchor.detail}`,
        target: {
            expectedEventTypes: item.expected, companyId, projectId,
            ...(item.expectedTalent ? { talentId: item.expectedTalent } : {}),
            ...(item.expectedPlatform ? { platformId: item.expectedPlatform } : {}),
            ...(item.expectedCountries ? { expectedCountryIds: item.expectedCountries } : {}),
            ...(item.expectedUniverse ? { universeId: item.expectedUniverse } : {}),
            ...(item.expectedWeek !== undefined ? { expectedAbsoluteWeek: item.expectedWeek, toleranceWeeks: item.tolerance } : {}),
        },
        createdAbsoluteWeek: createdWeek, earliestResolutionAbsoluteWeek: createdWeek + 1,
        expiryAbsoluteWeek: resolvedWeek + 10, lastEvaluatedAbsoluteWeek: createdWeek, playerRelated: !item.companyOnly,
    });
}

const awardAnchor = createIndustryEventFact({
    idempotencyKey: 'c6:resolution:award:anchor', absoluteWeek: createdWeek, type: 'AWARD_NOMINATED', importance: 'HIGH',
    companyId: 'empire_studios', companyName: 'Empire Studios', projectId: 'project_award', awardEventId: 'award_nomination',
    headline: 'Award nomination', detail: 'The project received a nomination.', evidence: [{ kind: 'AWARD', id: 'award_nomination' }],
});
events.push(awardAnchor);
stories.push({
    schemaVersion: 1, id: 'story_award', subjectKey: 'project:project_award', category: 'AWARDS', stage: 'CONFIRMED', importance: 'HIGH',
    primaryIndustryEventId: awardAnchor.id, industryEventIds: [awardAnchor.id], firstAbsoluteWeek: createdWeek,
    lastAdvancedAbsoluteWeek: createdWeek, headline: awardAnchor.headline, detail: awardAnchor.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: ['NEWS'], companyId: 'empire_studios',
    companyName: 'Empire Studios', projectId: 'project_award', awardEventId: 'award_nomination',
});
claims.push({
    schemaVersion: 1, id: 'claim_award', claimKey: 'claim-key-award', kind: 'PREDICTION', status: 'OPEN', category: 'AWARDS',
    confidence: 'TENTATIVE', subjectKey: 'project:project_award', subjectName: 'Project Award', anchorIndustryEventId: awardAnchor.id,
    anchorStoryId: 'story_award', evidenceEventIds: [awardAnchor.id], institutionId: 'screenline_trade', personalityId: 'mara_voss',
    publicationChannel: 'X', importance: 'HIGH', headline: 'Award prediction', summary: 'The project may win. The prediction remains unconfirmed.',
    knownEvidence: 'Confirmed context: the nomination exists.', target: { expectedEventTypes: ['AWARD_WON'], projectId: 'project_award' },
    createdAbsoluteWeek: createdWeek, earliestResolutionAbsoluteWeek: createdWeek + 1, expiryAbsoluteWeek: resolvedWeek - 1,
    lastEvaluatedAbsoluteWeek: createdWeek, playerRelated: true,
});

const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryEvents = appendIndustryEventFacts(undefined, events);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories, claims });

const result = resolveIndustryMediaClaims(player, resolvedWeek);
assert.equal(result.resolvedClaims.length, cases.length + 1);
for (const item of [...cases, { id: 'award', status: 'EXPIRED_UNVERIFIED' }]) {
    const claim = result.player.world.industryMedia.claims.find(candidate => candidate.id === `claim_${item.id}`);
    assert.ok(claim, `missing ${item.id}`);
    assert.equal(claim.status, item.status, `${item.id} resolved incorrectly`);
    assert.equal(claim.resolution.status, item.status);
    assert.ok(claim.resolution.absoluteWeek >= claim.earliestResolutionAbsoluteWeek);
}
const replay = resolveIndustryMediaClaims(result.player, resolvedWeek);
assert.equal(replay.resolvedClaims.length, 0);
assert.deepEqual(replay.player, result.player);

console.log('Industry media C6 typed claim resolution audit passed.');
