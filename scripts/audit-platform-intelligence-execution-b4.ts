import assert from 'node:assert/strict';
import type { IndustryContentFingerprint, IndustryIntelligenceProposal } from '../types';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { executePlatformIntelligenceProposals } from '../services/platformAi/platformIntelligenceExecution';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const WEEK = 2_120;
const fixture = createPlatformAiFixture();
const makeFingerprint = (): IndustryContentFingerprint => ({
    id: 'b4_exec_fp', seed: 'exec', ownerCompanyId: 'NETFLIX', ownerCompanyKind: 'STREAMING_PLATFORM', format: 'SERIES',
    primaryGenre: 'CRIME', subgenre: 'INVESTIGATION', tone: 'TENSE', theme: 'JUSTICE', setting: 'METROPOLIS', period: 'CONTEMPORARY',
    targetAudience: 'ADULT_MAINSTREAM', originalLanguage: 'ENGLISH', priorityMarket: 'USA', commercialIntent: 88, prestigeIntent: 66,
    creativeRisk: 55, starPowerTarget: 72, releasePath: 'STREAMING_FIRST', sourceIntent: 'PLATFORM_ORIGINAL', relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 55, idealLowMillions: 90, idealHighMillions: 125, ambitiousMaximumMillions: 180 },
    noveltySignature: 'b4_exec_sig', noveltyScore: 82, createdAtAbsoluteWeek: WEEK, decisionCycle: 1, lifecycle: 'SELECTED',
});
const proposal: IndustryIntelligenceProposal = {
    id: 'b4_exec_proposal', idempotencyKey: 'b4_exec_key', companyId: 'NETFLIX', companyKind: 'STREAMING_PLATFORM', lane: 'CONTENT_STRATEGY',
    decisionCycle: 1, absoluteWeek: WEEK, actionFamily: 'DEVELOP_CONTENT', optionId: 'develop_content', urgency: 90, confidence: 82,
    expectedExposureMillions: 120, affordabilityCeilingMillions: 140,
    score: { total: 80, need: 90, strategyFit: 80, expectedUpside: 80, relationshipValue: 20, competitiveValue: 60, financialRisk: 5, capacityPressure: 5, fatigue: 0, executionRisk: 8 },
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'stable', status: 'SHADOW', nextReviewAbsoluteWeek: WEEK + 6, contentFingerprintId: 'b4_exec_fp',
};

const normalized = normalizeWorldPlatformAi(fixture, structuredClone(fixture.world), WEEK);
const netflix = normalized.platforms!.NETFLIX;
const world = {
    ...normalized,
    platforms: {
        ...normalized.platforms!,
        NETFLIX: {
            ...netflix,
            ai: {
                ...netflix.ai!,
                intelligence: {
                    ...netflix.ai!.intelligence!,
                    proposals: [proposal],
                    content: { ...netflix.ai!.intelligence!.content, selectedFingerprints: [makeFingerprint()] },
                },
            },
        },
    },
};
const first = executePlatformIntelligenceProposals({ player: { ...fixture, world }, world, platformId: 'NETFLIX', absoluteWeek: WEEK });
const firstPlatform = first.world.platforms!.NETFLIX;
assert.equal(first.changed, true);
assert.equal(firstPlatform.ai!.slate.length, 1, 'one content proposal should create one canonical brief');
assert.equal(firstPlatform.ai!.slate[0].genre, 'CRIME');
assert.equal(firstPlatform.ai!.slate[0].productionFundingMillions, 125);
assert.ok(firstPlatform.ai!.intelligence!.platformMigration!.processedProposalKeys.includes(proposal.idempotencyKey));
assert.equal(firstPlatform.ai!.intelligence!.platformMigration!.outcomes.at(-1)?.status, 'EXECUTED');
assert.equal(firstPlatform.ai!.intelligence!.proposals[0].status, 'EXECUTED');
assert.equal(firstPlatform.ai!.intelligence!.content.selectedFingerprints[0].lifecycle, 'COMMITTED');

const replay = executePlatformIntelligenceProposals({ player: { ...fixture, world: first.world }, world: first.world, platformId: 'NETFLIX', absoluteWeek: WEEK });
assert.equal(replay.changed, false);
assert.deepEqual(replay.world, first.world, 'same proposal key must not create a second plan');

const legacyProposal = { ...proposal, id: 'old', idempotencyKey: 'old_key', absoluteWeek: WEEK - 1 };
const oldWorld = structuredClone(world);
oldWorld.platforms!.NETFLIX.ai!.intelligence!.proposals = [legacyProposal];
const oldResult = executePlatformIntelligenceProposals({ player: { ...fixture, world: oldWorld }, world: oldWorld, platformId: 'NETFLIX', absoluteWeek: WEEK });
assert.equal(oldResult.changed, false, 'pre-activation shadow history must not execute after loading an old save');

const worldWithProposal = (lane: IndustryIntelligenceProposal['lane'], actionFamily: string) => {
    const fresh = normalizeWorldPlatformAi(fixture, structuredClone(fixture.world), WEEK);
    const ai = fresh.platforms!.NETFLIX.ai!;
    ai.intelligence!.proposals = [{
        ...proposal,
        id: `proposal_${lane}_${actionFamily}`,
        idempotencyKey: `key_${lane}_${actionFamily}`,
        lane,
        actionFamily,
        optionId: actionFamily.toLowerCase(),
        contentFingerprintId: undefined,
    }];
    ai.intelligence!.content.selectedFingerprints = [];
    return fresh;
};
const researchWorld = worldWithProposal('CAPABILITY_GROWTH', 'RESEARCH_TECHNOLOGY');
const research = executePlatformIntelligenceProposals({ player: { ...fixture, world: researchWorld }, world: researchWorld, platformId: 'NETFLIX', absoluteWeek: WEEK });
assert.equal(research.outcomes[0].intentRoute, 'RESEARCH_TECHNOLOGY');
assert.ok(['EXECUTED', 'REJECTED'].includes(research.outcomes[0].status), 'canonical research gates decide the final result');

const marketWorld = worldWithProposal('MARKET_EXPANSION', 'ENTER_MARKET');
const market = executePlatformIntelligenceProposals({ player: { ...fixture, world: marketWorld }, world: marketWorld, platformId: 'NETFLIX', absoluteWeek: WEEK });
assert.equal(market.outcomes[0].intentRoute, 'ENTER_MARKET');
assert.ok(['EXECUTED', 'REJECTED'].includes(market.outcomes[0].status), 'canonical market gates decide the final result');

console.log('Platform Intelligence B4 execution audit passed.');
