import { INITIAL_PLAYER, Player, AuditionOpportunity } from '../types';
import {
    evaluateCastingApplication,
    generateBreakthroughAuditionInvite,
    getBreakthroughInviteProfile,
    getCastingOpportunityAccess
} from '../services/roleLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';

const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
};

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
    ...structuredClone(INITIAL_PLAYER),
    ...overrides
});

const makeOpportunity = (overrides: Partial<AuditionOpportunity> = {}): AuditionOpportunity => ({
    id: 'audit_opportunity',
    roleType: 'LEAD',
    projectName: 'Audit Project',
    genre: 'ACTION',
    config: { label: 'Lead Role', difficulty: 70, energyCost: 40, baseIncome: 10000, expGain: 10 },
    project: {
        title: 'Audit Project',
        type: 'MOVIE',
        description: 'A test project.',
        studioId: 'PARAMOUNT',
        subtype: 'STANDALONE',
        genre: 'ACTION',
        budgetTier: 'HIGH',
        estimatedBudget: 150000000,
        visibleHype: 'HIGH',
        hiddenStats: {
            scriptQuality: 75,
            directorQuality: 75,
            castingStrength: 80,
            distributionPower: 75,
            rawHype: 75,
            qualityScore: 75,
            prestigeBonus: 0
        },
        directorName: 'Audit Director',
        visibleDirectorTier: 'Established',
        visibleScriptBuzz: 'Good',
        visibleCastStrength: 'Solid'
    },
    estimatedIncome: 1000000,
    source: 'CASTING_APP',
    ...overrides
});

const weakPlayer = makePlayer();
const strongPlayer = makePlayer({
    stats: {
        ...structuredClone(INITIAL_PLAYER.stats),
        fame: 75,
        reputation: 70,
        experience: 70,
        skills: {
            ...structuredClone(INITIAL_PLAYER.stats.skills),
            delivery: 80,
            memorization: 80,
            expression: 80,
            improvisation: 80,
            discipline: 80,
            presence: 80,
            charisma: 80
        },
        genreXP: {
            ...structuredClone(INITIAL_PLAYER.stats.genreXP),
            ACTION: 85
        }
    }
});

const opportunity = makeOpportunity();
const weakEvaluation = evaluateCastingApplication(weakPlayer, opportunity, 3);
const strongEvaluation = evaluateCastingApplication(strongPlayer, opportunity, 0);

assert(weakEvaluation.baseChance > 0, 'Very weak applicants should retain a tiny breakthrough chance.');
assert(weakEvaluation.baseChance < 0.12, 'Very weak applicants should not be treated as plausible fits.');
assert(!weakEvaluation.plausible, 'Very weak applicants must not qualify for dry-streak protection.');
assert(weakEvaluation.momentumBonus === 0, 'Impossible-role spam must not receive momentum.');
assert(strongEvaluation.baseChance > weakEvaluation.baseChance, 'A strong fit should have a better shortlist chance.');
assert(strongEvaluation.baseChance < 1, 'Even excellent fits should not be guaranteed.');

const plausiblePlayer = makePlayer({
    stats: {
        ...structuredClone(INITIAL_PLAYER.stats),
        fame: 30,
        reputation: 35,
        experience: 30,
        skills: {
            ...structuredClone(INITIAL_PLAYER.stats.skills),
            delivery: 45,
            memorization: 45,
            expression: 45,
            improvisation: 45,
            discipline: 45,
            presence: 45,
            charisma: 45
        },
        genreXP: {
            ...structuredClone(INITIAL_PLAYER.stats.genreXP),
            ACTION: 50
        }
    }
});
const plausibleEvaluation = evaluateCastingApplication(plausiblePlayer, opportunity, 99);
assert(plausibleEvaluation.plausible, 'A competitive underdog should qualify for dry-streak protection.');
assert(plausibleEvaluation.momentumBonus <= 0.12, 'Casting momentum must have a hard cap.');
assert(plausibleEvaluation.finalChance < 1, 'Casting momentum must never guarantee a shortlist.');

const earlyAccess = getCastingOpportunityAccess(weakPlayer);
const lateAccess = getCastingOpportunityAccess(strongPlayer);
assert(earlyAccess.highBudgetChance > 0, 'Early careers should retain a rare high-budget opportunity chance.');
assert(earlyAccess.leadRoleChance > 0, 'Early careers should retain a rare lead opportunity chance.');
assert(lateAccess.highBudgetChance > earlyAccess.highBudgetChance, 'High-budget access should grow with career strength.');
assert(lateAccess.leadRoleChance > earlyAccess.leadRoleChance, 'Lead access should grow with career strength.');

const underdogPlayer = makePlayer({
    currentWeek: 20,
    stats: {
        ...structuredClone(INITIAL_PLAYER.stats),
        fame: 8,
        reputation: 24,
        experience: 30,
        skills: {
            ...structuredClone(INITIAL_PLAYER.stats.skills),
            delivery: 62,
            memorization: 62,
            expression: 62,
            improvisation: 62,
            discipline: 62,
            presence: 62,
            charisma: 62
        },
        genreXP: {
            ...structuredClone(INITIAL_PLAYER.stats.genreXP),
            ACTION: 58
        }
    }
});
const underdogProfile = getBreakthroughInviteProfile(underdogPlayer);
assert(underdogProfile.eligible, 'A skilled low-fame actor should be eligible for rare breakthrough invites.');
assert(underdogProfile.weeklyChance > 0 && underdogProfile.weeklyChance <= 0.08, 'Breakthrough invites must stay rare.');
assert(!getBreakthroughInviteProfile(weakPlayer).eligible, 'An untrained beginner should not receive breakthrough invites.');
assert(!getBreakthroughInviteProfile(strongPlayer).eligible, 'Established stars should use the normal direct-offer path.');

const blockbusterInvite = generateBreakthroughAuditionInvite(underdogPlayer, [], () => 0);
assert(blockbusterInvite?.kind === 'BLOCKBUSTER_EXTRA', 'A rare blockbuster extra-role invite should be possible.');
assert(blockbusterInvite?.opportunity.project.isFamous === true, 'Blockbuster extra-role invites must use famous projects.');
assert(blockbusterInvite?.opportunity.roleType !== 'LEAD', 'Underdog blockbuster invites must never hand out lead roles.');

const pendingInvitePlayer = makePlayer({
    ...underdogPlayer,
    inbox: [{
        id: 'breakthrough_invite_existing',
        sender: 'Studio Casting',
        subject: 'Fresh Face Audition',
        text: 'Existing invite.',
        type: 'OFFER_AUDITION',
        isRead: false,
        weekSent: underdogPlayer.currentWeek
    }]
});
assert(
    generateBreakthroughAuditionInvite(pendingInvitePlayer, [], () => 0) === null,
    'A pending breakthrough invite must block duplicate invite farming.'
);

const cooldownPlayer = makePlayer({
    ...underdogPlayer,
    flags: {
        ...underdogPlayer.flags,
        lastBreakthroughInviteAbsoluteWeek: getAbsoluteWeek(underdogPlayer.age, underdogPlayer.currentWeek)
    }
});
assert(
    generateBreakthroughAuditionInvite(cooldownPlayer, [], () => 0) === null,
    'Breakthrough invite cooldown must block repeated weekly invites.'
);

console.log('Casting curve audit passed.');
