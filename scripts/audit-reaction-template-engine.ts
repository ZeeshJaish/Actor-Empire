import { strict as assert } from 'node:assert';
import { ActiveRelease, Player } from '../types';
import {
    buildReleaseReactionContext,
    composeReleaseReaction,
    generateRoleAwareCriticReview,
    getReactionCombinationEstimate,
} from '../services/reactionTemplateEngine';
import {
    generateReleaseInstagramReactions,
    generateReleaseSocialReactions,
} from '../services/releaseMediaNarrative';

const makeRelease = (overrides: Partial<ActiveRelease> = {}): ActiveRelease => ({
    id: 'reaction_engine_test',
    name: 'The Last Signal',
    type: 'MOVIE',
    roleType: 'LEAD',
    distributionPhase: 'THEATRICAL',
    weekNum: 1,
    weeklyGross: [92_000_000],
    totalGross: 92_000_000,
    budget: 110_000_000,
    status: 'RUNNING',
    imdbRating: 8.8,
    productionPerformance: 93,
    projectDetails: {
        title: 'The Last Signal',
        type: 'MOVIE',
        description: 'Reaction engine audit project.',
        studioId: 'reaction_studio',
        subtype: 'ORIGINAL',
        genre: 'SCI_FI',
        budgetTier: 'HIGH',
        estimatedBudget: 110_000_000,
        visibleHype: 'HIGH',
        hiddenStats: {
            qualityScore: 88,
            scriptQuality: 86,
            directorQuality: 87,
            castingStrength: 92,
            distributionPower: 81,
            rawHype: 77,
            prestigeBonus: 0,
        },
        directorName: 'Audit Director',
        visibleDirectorTier: 'A_LIST',
        visibleScriptBuzz: 'Exceptional',
        visibleCastStrength: 'Excellent',
        universeId: 'REACTION_UNIVERSE',
        castList: [{
            id: 'player_cast',
            name: 'Zeesh',
            role: 'The adversary',
            isPlayer: true,
            image: '',
            type: 'ACTOR',
            actorId: 'PLAYER_SELF',
            roleType: 'LEAD',
            storyRole: 'VILLAIN',
            storyFunction: 'ANTAGONIST',
            abilityType: 'TECH',
            nature: 'HUMAN',
            identitySource: 'PLAYER',
        }],
    },
    ...overrides,
} as ActiveRelease);

const makePlayer = (release: ActiveRelease): Player => ({
    id: 'reaction_player',
    name: 'Zeesh',
    age: 31,
    currentWeek: 18,
    stats: { fame: 42 },
    businesses: [{
        id: 'reaction_studio',
        name: 'Northlight House',
    }],
    activeReleases: [release],
    pastProjects: [],
    x: { handle: '@zeesh', followers: 2_000_000, posts: [], feed: [], lastPostWeek: 0 },
    instagram: {
        handle: '@zeesh',
        followers: 3_000_000,
        posts: [],
        feed: [],
        npcStates: {},
        weeklyPostCount: 0,
        lastPostWeek: 0,
        aesthetic: 70,
        authenticity: 68,
        controversy: 15,
        fashionInfluence: 40,
        fanLoyalty: 72,
    },
} as unknown as Player);

const release = makeRelease();
const player = makePlayer(release);
const context = buildReleaseReactionContext(player, release);

assert.equal(context.role, 'VILLAIN', 'The selected story role must drive reactions.');
assert.equal(context.performanceRead, 'REVELATION', 'A strong against-type performance should read as a revelation.');
assert.equal(context.againstType, true, 'A first villain credit should be recognized as against-type.');
assert.equal(context.isUniverse, true, 'Universe context should remain attached to the reaction.');

const first = composeReleaseReaction(context, 'PERFORMANCE', 3);
const repeated = composeReleaseReaction(context, 'PERFORMANCE', 3);
assert.deepEqual(first, repeated, 'The same release and variant must compose deterministically.');
assert(!/[{](title|player|studio|role|budget|opening|commercial)[}]/.test(`${first.headline} ${first.subtext} ${first.socialText}`), 'Player-visible copy cannot leak template tokens.');
assert(/universe|canon|shared world|chapter/i.test(`${first.subtext} ${first.socialText}`), 'Universe projects should receive universe-aware language.');

const variants = new Set(
    Array.from({ length: 80 }, (_, index) => {
        const reaction = composeReleaseReaction(context, 'PERFORMANCE', index);
        return `${reaction.headline}|${reaction.subtext}|${reaction.socialText}|${reaction.authorHandle}`;
    })
);
assert(variants.size >= 45, `Template lanes should create broad variety; received ${variants.size} unique reactions.`);
assert(getReactionCombinationEstimate() > 1_000_000_000, 'The composable banks should expose more than one billion theoretical combinations.');

const xWeekOne = generateReleaseSocialReactions(player);
const xWeekTwo = generateReleaseSocialReactions({
    ...player,
    activeReleases: [{ ...release, weekNum: 2 }],
});
assert(xWeekOne.length === 2, 'A role-bearing release should create one project and one acting conversation.');
assert.deepEqual(
    xWeekOne.map(post => post.id),
    xWeekTwo.map(post => post.id),
    'Week-two processing must reuse stable IDs instead of reposting the conversation.',
);
assert.equal(new Set(xWeekOne.map(post => post.id)).size, xWeekOne.length, 'A release cannot create duplicate X IDs.');

const instagram = generateReleaseInstagramReactions(player);
assert.equal(instagram.length, 1, 'A release should create one restrained Instagram editorial card.');
assert.equal(instagram[0].id, `reaction_instagram_${release.id}`, 'Instagram release IDs must be stable.');
assert(instagram[0].commentList?.length === 3, 'Instagram should carry matched discussion rather than generic comments.');
assert.equal(
    generateReleaseInstagramReactions({ ...player, activeReleases: [{ ...release, weekNum: 2 }] }).length,
    0,
    'Instagram must not repost the release card in week two.',
);

const review = generateRoleAwareCriticReview(player, release);
assert(review, 'A cast release should receive a role-aware critic review.');
assert.equal(review?.id, `role_review_${release.id}`, 'IMDb review IDs must remain stable for deduplication.');
assert(/Zeesh|villain|role|performance|casting/i.test(review?.text || ''), 'The role-aware review should discuss the performance rather than generic film quality.');

const genreRelease = makeRelease({
    id: 'comedy_reaction',
    name: 'Second Take',
    projectDetails: {
        ...release.projectDetails,
        title: 'Second Take',
        genre: 'COMEDY',
        universeId: undefined,
        franchiseId: undefined,
    },
});
const genreContext = buildReleaseReactionContext(makePlayer(genreRelease), genreRelease);
const genreReaction = composeReleaseReaction(genreContext, 'OPENING', 2);
assert(/comedy|jokes|timing|lines/i.test(`${genreReaction.subtext} ${genreReaction.socialText}`), 'Standalone comedy should receive comedy-aware language.');

console.log(`Reaction template engine audit passed with ${getReactionCombinationEstimate().toLocaleString()} theoretical combinations.`);
