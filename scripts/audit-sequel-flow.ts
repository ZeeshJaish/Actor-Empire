import {
    createContinuationScript,
    getContinuationEligibility,
} from '../services/sequelFlow';
import { readFileSync } from 'node:fs';
import {
    getContinuationPerformanceGross,
    getContinuationProgressWeek,
    shouldResolveContinuationDecision,
} from '../services/releaseContinuationLogic';
import { calculateDynamicBoxOfficeTotalCap, generateRenewalOffer } from '../services/roleLogic';
import { resolveRareHollywoodChaos } from '../services/rareHollywoodChaos';
import type { ActiveRelease, Player, ProjectDetails, Script, Stats } from '../types';

type ProjectDetailsOverrides = Partial<Omit<ProjectDetails, 'hiddenStats'>> & {
    hiddenStats?: Partial<ProjectDetails['hiddenStats']>;
};

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makePlayer = (age: number, currentWeek: number): Player => ({
    age,
    currentWeek,
    activeReleases: [],
    pastProjects: [],
    businesses: [],
} as unknown as Player);

const makeStats = (overrides: Partial<Stats> = {}): Stats => ({
    health: 82,
    happiness: 76,
    looks: 68,
    body: 62,
    fame: 55,
    reputation: 58,
    experience: 28,
    talent: 64,
    followers: 0,
    genreXP: {},
    ...overrides,
    skills: {
        delivery: 65,
        memorization: 62,
        expression: 66,
        improvisation: 58,
        discipline: 70,
        presence: 64,
        charisma: 60,
        writing: 45,
        ...(overrides.skills || {}),
    },
});

const baseProject = {
    id: 'film-1',
    name: 'First Film',
    type: 'MOVIE',
    genre: 'DRAMA',
    franchiseId: 'franchise-1',
    installmentNumber: 1,
    releasedAtAbsoluteWeek: (30 - 1) * 52 + (10 - 1),
};

const waiting = getContinuationEligibility({
    player: makePlayer(30, 13),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
});
assert(!waiting.eligible, 'A continuation should remain locked after only three elapsed weeks.');
assert(waiting.weeksRemaining === 1, 'The cooldown should report one remaining week.');
assert(waiting.reason === 'WAITING_PERIOD', 'The cooldown should expose a clear waiting reason.');

const available = getContinuationEligibility({
    player: makePlayer(30, 14),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
});
assert(available.eligible, 'A continuation should unlock after four elapsed weeks.');

const rolloverProject = {
    ...baseProject,
    releasedAtAbsoluteWeek: (30 - 1) * 52 + (51 - 1),
};
const rollover = getContinuationEligibility({
    player: makePlayer(31, 3),
    studioScripts: [],
    project: rolloverProject,
    mode: 'SEQUEL',
});
assert(rollover.eligible, 'The four-week cooldown should work across a year rollover.');

const activeLegacy = getContinuationEligibility({
    player: makePlayer(30, 20),
    studioScripts: [],
    project: {
        ...baseProject,
        releasedAtAbsoluteWeek: undefined,
        weekNum: 3,
        phase: 'IN THEATERS',
    },
    mode: 'SEQUEL',
});
assert(!activeLegacy.eligible, 'Legacy active releases should infer elapsed weeks from weekNum.');
assert(activeLegacy.weeksRemaining === 2, 'A legacy release in theatrical week three should need two more weeks.');

const archivedLegacy = getContinuationEligibility({
    player: makePlayer(30, 20),
    studioScripts: [],
    project: {
        ...baseProject,
        releasedAtAbsoluteWeek: undefined,
        phase: 'RELEASED',
        year: 30,
    },
    mode: 'SEQUEL',
});
assert(archivedLegacy.eligible, 'Legacy archived projects without a release week must not stay locked forever.');

const existingScript: Script = {
    id: 'script-2',
    title: 'First Film 2',
    genres: ['DRAMA'],
    status: 'CONCEPT',
    quality: 0,
    options: [],
    writerId: null,
    weeksInDevelopment: 0,
    totalDevelopmentWeeks: 0,
    isOriginal: false,
    projectType: 'MOVIE',
    sourceMaterial: 'SEQUEL',
    franchiseId: 'franchise-1',
    installmentNumber: 2,
};
const duplicate = getContinuationEligibility({
    player: makePlayer(30, 20),
    studioScripts: [existingScript],
    project: baseProject,
    mode: 'SEQUEL',
});
assert(!duplicate.eligible, 'A duplicate sequel should be blocked.');
assert(duplicate.reason === 'ALREADY_IN_DEVELOPMENT', 'Duplicate projects should expose the correct reason.');

const created = createContinuationScript({
    player: makePlayer(30, 20),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
    title: '  First Film: Afterlight  ',
});
assert(created.ok, 'An eligible sequel should be commissioned.');
assert(created.script?.title === 'First Film: Afterlight', 'The shared flow should normalize the working title.');
assert(created.script?.installmentNumber === 2, 'The shared flow should create the next installment.');
assert(created.script?.createdAtWeek === 20, 'The shared flow should stamp the creation week.');

const blockedCreation = createContinuationScript({
    player: makePlayer(30, 13),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
    title: 'Too Soon',
});
assert(!blockedCreation.ok, 'The mutation layer must reject cooldown bypasses.');
assert(blockedCreation.eligibility.reason === 'WAITING_PERIOD', 'Blocked creation should preserve its eligibility reason.');

const makeProjectDetails = (overrides: ProjectDetailsOverrides = {}): ProjectDetails => ({
    title: 'Audit Event',
    type: 'MOVIE',
    description: 'Audit project',
    studioId: 'ARTISAN_PICTURES',
    subtype: 'STANDALONE',
    genre: 'SUPERHERO',
    budgetTier: 'HIGH',
    estimatedBudget: 180_000_000,
    visibleHype: 'HIGH',
    directorName: 'Audit Director',
    visibleDirectorTier: 'A-List',
    visibleScriptBuzz: 'Hot',
    visibleCastStrength: 'Strong',
    ...overrides,
    hiddenStats: {
        scriptQuality: 88,
        directorQuality: 86,
        castingStrength: 90,
        distributionPower: 92,
        rawHype: 94,
        qualityScore: 89,
        prestigeBonus: 10,
        castDepthScore: 84,
        ...(overrides.hiddenStats || {}),
    },
});

const makeRelease = (overrides: Partial<Omit<ActiveRelease, 'projectDetails'>> & { projectDetails?: ProjectDetailsOverrides } = {}): ActiveRelease => {
    const { projectDetails, ...releaseOverrides } = overrides;
    return {
        id: 'continuation-audit-release',
        name: 'Audit Event',
        type: projectDetails?.type || 'MOVIE',
        roleType: 'LEAD',
        projectDetails: makeProjectDetails(projectDetails),
        distributionPhase: 'THEATRICAL',
        weekNum: 6,
        weeklyGross: [180_000_000, 110_000_000, 70_000_000],
        totalGross: 360_000_000,
        budget: 180_000_000,
        status: 'RUNNING',
        imdbRating: 8.4,
        productionPerformance: 82,
        sequelDecisionWeek: 6,
        ...releaseOverrides,
    };
};

const streamingSeries = makeRelease({
    type: 'SERIES',
    distributionPhase: 'STREAMING',
    weekNum: 1,
    totalGross: 0,
    streamingRevenue: 140_000_000,
    soundtrackRevenue: 8_000_000,
    projectDetails: {
        type: 'SERIES',
        genre: 'DRAMA',
        episodes: 8,
        hiddenStats: {
            rawHype: 80,
            qualityScore: 88,
        },
    },
    streaming: {
        platformId: 'NETFLIX',
        weekOnPlatform: 7,
        totalViews: 78_000_000,
        weeklyViews: [15_000_000, 14_000_000, 13_000_000, 12_000_000, 12_000_000, 12_000_000],
        isLeaving: false,
    },
});
assert(getContinuationProgressWeek(streamingSeries) === 6, 'Series continuation clock should use completed streaming weeks.');
assert(shouldResolveContinuationDecision(streamingSeries), 'Season renewal should resolve after enough streaming proof.');
assert(getContinuationPerformanceGross(streamingSeries) === 148_000_000, 'Continuation proof should include streaming and soundtrack revenue.');

const seasonThreeOffer = generateRenewalOffer(makeRelease({
    name: 'Audit Show: Season 2',
    type: 'SERIES',
    projectDetails: {
        title: 'Audit Show: Season 2',
        type: 'SERIES',
        installmentNumber: 2,
    },
}), {
    ...makePlayer(31, 18),
    stats: makeStats({
        fame: 64,
        reputation: 72,
        experience: 34,
    }),
} as Player);
assert(seasonThreeOffer.opportunity.projectName === 'Audit Show: Season 3', 'Renewal offers should advance beyond Season 2.');
assert(seasonThreeOffer.opportunity.project.installmentNumber === 3, 'Renewal offers should carry the next installment number.');

const earlyTheatricalMovie = makeRelease({
    distributionPhase: 'THEATRICAL',
    weekNum: 8,
    sequelDecisionWeek: 5,
});
assert(!shouldResolveContinuationDecision(earlyTheatricalMovie), 'Movie sequel decisions should wait until theatrical proof is final.');

const finishedTheatricalMovie = makeRelease({
    distributionPhase: 'STREAMING_BIDDING',
    status: 'FINISHED',
    totalGross: 1_520_000_000,
    soundtrackRevenue: 30_000_000,
});
assert(shouldResolveContinuationDecision(finishedTheatricalMovie), 'Finished theatrical movies should resolve continuation decisions.');
assert(getContinuationPerformanceGross(finishedTheatricalMovie) === 1_550_000_000, 'Movie continuation proof should use final theatrical plus ancillary revenue.');

const standardHighCap = calculateDynamicBoxOfficeTotalCap({
    budgetTier: 'HIGH',
    genre: 'DRAMA',
    hiddenStats: makeProjectDetails({
        genre: 'DRAMA',
        hiddenStats: {
            scriptQuality: 62,
            directorQuality: 58,
            castingStrength: 55,
            distributionPower: 56,
            rawHype: 52,
            qualityScore: 60,
            castDepthScore: 70,
        },
    }).hiddenStats,
    marketDemand: 0.95,
    studioGenreReputation: 0,
    capRoll: 0.15,
});
assert(standardHighCap.totalCap !== 1_600_000_000, 'High-budget cap should no longer be an exact fixed 1.6B wall.');
assert(standardHighCap.totalCap < 1_700_000_000, 'Standard high-budget movies should stay grounded.');

const breakoutCap = calculateDynamicBoxOfficeTotalCap({
    budgetTier: 'HIGH',
    genre: 'SUPERHERO',
    format: 'LIVE_ACTION',
    hiddenStats: makeProjectDetails().hiddenStats,
    marketDemand: 1.18,
    studioGenreReputation: 65,
    capRoll: 0.82,
});
assert(breakoutCap.totalCap > 2_000_000_000, 'True event movies should be able to stretch past the old 1.6B wall.');
assert(['EVENT', 'BREAKOUT'].includes(breakoutCap.label), 'Event caps should expose a useful cap label.');

const wildFlopSequel = resolveRareHollywoodChaos({
    release: makeRelease({
        distributionPhase: 'STREAMING_BIDDING',
        status: 'FINISHED',
        budget: 150_000_000,
        totalGross: 180_000_000,
        imdbRating: 7.3,
        productionPerformance: 72,
        projectDetails: {
            franchiseId: 'audit-wild-ip',
            installmentNumber: 1,
            hiddenStats: {
                rawHype: 88,
                qualityScore: 72,
            },
        },
    }),
    player: {
        ...makePlayer(32, 24),
        businesses: [],
        stats: makeStats({
            fame: 55,
            reputation: 58,
            experience: 28,
        }),
    } as Player,
    isPlayerProduction: false,
    random: () => 0.02,
});
assert(wildFlopSequel?.kind === 'FLOP_SEQUEL_GAMBLE', 'A flawed recognizable IP should have a rare wild-card sequel lane.');

const gameLoopSource = readFileSync('services/gameLoop.ts', 'utf8');
[
    'No Sequel Despite Hit',
    'No Sequel Planned',
    'Risky Sequel Bet',
    'No Season ${nextSeasonNum}',
    'Season ${nextSeasonNum} Without You',
    'createSequelPassNews',
].forEach(needle => {
    assert(gameLoopSource.includes(needle), `Continuation decisions should keep visible news/message copy for: ${needle}`);
});

console.log('Sequel flow audit passed.');
