import assert from 'node:assert/strict';
import { INITIAL_PLAYER, AuditionOpportunity, CharacterStoryRole, PastProject, Player } from '../types';
import {
    getRoleMarketProfile,
    getRoleOfferMarketDecision,
    getRoleOfferMessageLine,
} from '../services/roleMarketDemand';
import { enrichAuditionOpportunity } from '../services/characterIdentityLogic';
import { calculateActorAwardNominationScore } from '../services/awardLogic';

const clonePlayer = (): Player => structuredClone(INITIAL_PLAYER);
const identity = (storyRole: CharacterStoryRole) => ({
    storyFunction: storyRole === 'VILLAIN' ? 'ANTAGONIST' as const : 'PROTAGONIST' as const,
    storyRole,
    abilityType: 'NONE' as const,
    nature: 'HUMAN' as const,
    identitySource: 'AUTO' as const,
});
const credit = (index: number, storyRole: CharacterStoryRole, performance: number): PastProject => ({
    id: `${storyRole.toLowerCase()}_${index}`,
    name: `${storyRole} Credit ${index}`,
    type: 'ACTING_GIG',
    roleType: index % 2 === 0 ? 'LEAD' : 'SUPPORTING',
    role: index % 2 === 0 ? 'LEAD' : 'SUPPORTING',
    year: 24,
    releaseYear: 24,
    releaseWeek: 40 + index,
    releasedAtAbsoluteWeek: 24 * 52 + 40 + index,
    earnings: 1_000_000,
    rating: performance / 10,
    imdbRating: performance / 10,
    reception: 'Strong performance',
    projectQuality: Math.max(65, performance - 3),
    playerRolePerformance: performance,
    boxOfficeResult: 'SUCCESS',
    outcomeTier: 'SUCCESS',
    subtype: 'STANDALONE',
    futurePotential: {
        sequelChance: 0,
        franchiseChance: 0,
        rebootChance: 0,
        renewalChance: 0,
        isFranchiseStarter: false,
        isSequelGreenlit: false,
        isRenewed: false,
        seriesStatus: 'N/A',
    },
    studioId: 'NETFLIX',
    genre: 'CRIME',
    projectType: 'MOVIE',
    budget: 35_000_000,
    gross: 120_000_000,
    playerCharacterProfile: identity(storyRole),
} as unknown as PastProject);

const player = clonePlayer();
player.age = 25;
player.currentWeek = 52;
player.pastProjects = [92, 89, 94, 87, 91, 90].map((performance, index) => (
    credit(index, 'VILLAIN', performance)
));

const profile = getRoleMarketProfile(player);
assert.equal(profile.primaryLane?.role, 'VILLAIN');
assert.ok((profile.primaryLane?.demand || 0) >= 66, 'strong recent villain work should create demand');
assert.ok(profile.typecastingPressure > 0 && profile.typecastingPressure <= 100);
assert.ok(profile.rangeScore >= 0 && profile.rangeScore <= 100);

const decisions = Array.from({ length: 1_000 }, (_, index) => (
    getRoleOfferMarketDecision(player, 'HERO', `offer_${index}`)
));
const typecastCount = decisions.filter(decision => decision.context.kind === 'TYPECAST').length;
const rangeCount = decisions.filter(decision => decision.context.kind === 'RANGE').length;
assert.ok(typecastCount > 0, 'hot screen identity should influence some future offers');
assert.ok(typecastCount <= 580, 'market bias must never exceed the 58% hard cap');
assert.ok(rangeCount > 0, 'the player must retain routes to work against type');
assert.deepEqual(
    getRoleOfferMarketDecision(player, 'HERO', 'deterministic_seed'),
    getRoleOfferMarketDecision(player, 'HERO', 'deterministic_seed'),
    'the same save and offer seed should produce the same market decision'
);

const protectedDecision = getRoleOfferMarketDecision(
    player,
    'HERO',
    'protected_offer',
    { protectedIdentity: true }
);
assert.equal(protectedDecision.role, 'HERO');
assert.equal(protectedDecision.context.kind, 'OPEN');

const saturated = clonePlayer();
saturated.pastProjects = player.pastProjects;
saturated.weeklyOpportunities.auditions = [0, 1].map(index => ({
    id: `open_villain_${index}`,
    roleType: 'LEAD',
    projectName: `Open Villain ${index}`,
    genre: 'CRIME',
    config: { label: 'Lead', difficulty: 70, energyCost: 35, baseIncome: 1, expGain: 1 },
    project: { title: `Open Villain ${index}` } as any,
    estimatedIncome: 1_000_000,
    source: 'CASTING_APP',
    characterProfile: identity('VILLAIN'),
} as AuditionOpportunity));
for (let index = 0; index < 200; index += 1) {
    const decision = getRoleOfferMarketDecision(saturated, 'HERO', `saturated_${index}`);
    assert.notEqual(decision.context.kind, 'TYPECAST', 'two open same-lane roles must stop further forced typecasting');
}

const openPlayer = clonePlayer();
const openDecision = getRoleOfferMarketDecision(openPlayer, 'ALLY', 'first_offer');
assert.equal(openDecision.role, 'ALLY');
assert.equal(openDecision.context.kind, 'OPEN');

const cooledPlayer = structuredClone(player);
cooledPlayer.age = 30;
cooledPlayer.currentWeek = 52;
const cooledProfile = getRoleMarketProfile(cooledPlayer);
assert.ok((cooledProfile.primaryLane?.demand || 0) < 35, 'old role heat should cool after a long break');
assert.equal(getRoleOfferMarketDecision(cooledPlayer, 'HERO', 'comeback_offer').context.kind, 'OPEN');

const opportunity: AuditionOpportunity = {
    id: 'market_offer',
    roleType: 'LEAD',
    projectName: 'The Last Witness',
    genre: 'DRAMA',
    config: { label: 'Lead', difficulty: 70, energyCost: 35, baseIncome: 1, expGain: 1 },
    project: {
        title: 'The Last Witness',
        type: 'MOVIE',
        genre: 'DRAMA',
        description: 'A reluctant hero exposes a conspiracy.',
        studioId: 'NETFLIX',
        subtype: 'STANDALONE',
        budgetTier: 'MID',
        estimatedBudget: 30_000_000,
        visibleHype: 'MID',
        hiddenStats: {
            scriptQuality: 75,
            directorQuality: 72,
            castingStrength: 70,
            distributionPower: 65,
            rawHype: 60,
            qualityScore: 74,
            prestigeBonus: 0,
        },
        directorName: 'A Director',
        visibleDirectorTier: 'Established',
        visibleScriptBuzz: 'Good',
        visibleCastStrength: 'Solid',
    },
    estimatedIncome: 2_000_000,
    source: 'AGENT',
};
const enriched = enrichAuditionOpportunity(opportunity, player);
assert.ok(enriched.industryContext);
assert.ok(enriched.roleFit?.reasons.some(reason => reason === enriched.industryContext?.reason));
assert.match(getRoleOfferMessageLine(enriched), /demand|momentum|range|casting lane/i);

const rangeOffer = enrichAuditionOpportunity(opportunity, player, { forceRange: true });
assert.equal(rangeOffer.industryContext?.kind, 'RANGE');
assert.equal(rangeOffer.characterProfile?.storyRole, rangeOffer.industryContext?.originalRole);

const greatPerformance = calculateActorAwardNominationScore({
    quality: 90,
    rating: 8.5,
    playerRolePerformance: 94,
    roleType: 'LEAD',
    genre: 'DRAMA',
}, 10, 0);
const weakPerformance = calculateActorAwardNominationScore({
    quality: 90,
    rating: 8.5,
    playerRolePerformance: 52,
    roleType: 'LEAD',
    genre: 'DRAMA',
}, 10, 0);
assert.ok(greatPerformance > weakPerformance + 20, 'individual acting should matter more than riding a great film');

const supportingBreakout = calculateActorAwardNominationScore({
    quality: 82,
    rating: 8,
    playerRolePerformance: 90,
    roleType: 'SUPPORTING',
    genre: 'COMEDY',
}, 4, 0);
const sameLeadPerformance = calculateActorAwardNominationScore({
    quality: 82,
    rating: 8,
    playerRolePerformance: 90,
    roleType: 'LEAD',
    genre: 'COMEDY',
}, 4, 0);
assert.equal(supportingBreakout, sameLeadPerformance + 3, 'scene-stealing supporting work gets a small category-appropriate lift');

console.log(
    `Role-market consequence audit passed: ${typecastCount}/1000 typecast routes, `
    + `${rangeCount}/1000 range routes, protected canon, saturation escape, and performance-first awards.`
);
