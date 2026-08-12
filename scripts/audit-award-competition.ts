import { INITIAL_PLAYER, type IndustryProject, type Player } from '../types';
import {
    AWARD_SHOW_DB,
    checkAwardEligibility,
    determineWinners,
    generateFullBallot,
    isWorldProjectEligibleForAwardSeason,
    sanitizeAwardHistoryEntries,
    sanitizeAwardRecords,
} from '../services/awardLogic';
import { processWorldTurn } from '../services/worldLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const withFixedRandom = <T>(value: number, run: () => T): T => {
    const originalRandom = Math.random;
    Math.random = () => value;
    try {
        return run();
    } finally {
        Math.random = originalRandom;
    }
};

const invalidMusicCategory = /soundtrack|trailer|music video/i;
Object.values(AWARD_SHOW_DB).forEach(show => {
    assert(
        !show.categories.some(category => invalidMusicCategory.test(category)),
        `${show.id} still contains a campaign-only music category.`
    );
});
assert(
    !AWARD_SHOW_DB.BAFTA.categories.includes('Best Original Song'),
    'BAFTA Film Awards should only expose its score category in this game.'
);

const baseProject = {
    id: 'music_award_project',
    name: 'A Difficult Song',
    type: 'ACTING_GIG',
    roleType: 'MINOR',
    year: 30,
    releaseYear: 30,
    releaseWeek: 20,
    rating: 9.8,
    projectQuality: 100,
    genre: 'MUSICAL',
    projectType: 'MOVIE',
    gross: 900_000_000,
    hiddenStats: { qualityScore: 100, musicAwardChanceLift: 16 },
    awards: [],
};

const trailerOnlyPlayer: Player = {
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 6,
    activeReleases: [],
    awards: [],
    pastProjects: [{
        ...baseProject,
        musicPlan: {
            strategy: 'MUSIC_VIDEO_TIE_IN',
            credits: [
                {
                    artistId: 'audit_artist',
                    artistName: 'Audit Artist',
                    genre: 'Pop',
                    role: 'TRAILER_ANTHEM',
                    songTitle: 'Only in the Trailer',
                    dealType: 'Flat fee',
                    estimatedCost: 1_000_000,
                    buzz: 15,
                    risk: 0,
                },
                {
                    artistId: 'audit_artist_2',
                    artistName: 'Audit Artist Two',
                    genre: 'Pop',
                    role: 'MUSIC_VIDEO_TIE_IN',
                    songTitle: 'Promo Clip',
                    dealType: 'Flat fee',
                    estimatedCost: 1_000_000,
                    buzz: 15,
                    risk: 0,
                },
            ],
            musicBudget: 2_000_000,
            musicBuzz: 120,
            musicRisk: 0,
        },
    } as any],
    world: { ...INITIAL_PLAYER.world, projects: [], awardHistory: [] },
};

const trailerOnlyNominations = withFixedRandom(0, () => (
    checkAwardEligibility(trailerOnlyPlayer, 6, 31)
));
assert(
    trailerOnlyNominations.every(nomination => !/song|score|soundtrack|trailer|music video/i.test(nomination.category)),
    'Trailer or music-video campaign credits created a major-ceremony music nomination.'
);

const originalMusicPlayer: Player = {
    ...trailerOnlyPlayer,
    pastProjects: [{
        ...baseProject,
        crewList: [{ id: 'composer', name: 'Audit Composer', role: 'COMPOSER' }],
        musicPlan: {
            strategy: 'LEAD_SINGLE',
            credits: [{
                artistId: 'audit_artist',
                artistName: 'Audit Artist',
                genre: 'Film score orchestra',
                role: 'END_CREDIT_SONG',
                songTitle: 'A Difficult Song',
                dealType: 'Flat fee',
                estimatedCost: 2_000_000,
                buzz: 15,
                risk: 0,
            }],
            musicBudget: 3_000_000,
            musicBuzz: 120,
            musicRisk: 0,
        },
    } as any],
};

const originalMusicNominations = withFixedRandom(0.5, () => (
    checkAwardEligibility(originalMusicPlayer, 6, 31)
)).filter(nomination => /song|score/i.test(nomination.category));
assert(originalMusicNominations.length <= 2, 'One film received more than two legitimate music nominations.');
assert(
    originalMusicNominations.every(nomination => ['Best Original Song', 'Best Score'].includes(nomination.category)),
    'A non-existent major-ceremony music category was generated.'
);

const makeWorldProject = (
    id: string,
    year: number,
    picture: number,
    quality: number,
): IndustryProject => ({
    id,
    title: id,
    genre: 'DRAMA',
    mediaType: 'MOVIE',
    studioId: 'WB',
    budgetTier: 'HIGH',
    quality,
    rating: 9,
    boxOffice: 400_000_000,
    year,
    weekReleased: 20,
    leadActorId: 'unknown',
    leadActorName: `${id} Lead`,
    directorName: `${id} Director`,
    reviews: 'HIT',
    awardProfile: {
        leadPerformance: quality,
        directing: quality,
        screenplay: quality,
        cinematography: quality,
        picture,
        originalScore: quality,
        originalSong: quality,
        campaign: 90,
    },
});

const strongestEligible = makeWorldProject('eligible_craft_winner', 30, 100, 82);
const qualityOnly = makeWorldProject('eligible_quality_only', 30, 68, 96);
const staleMasterpiece = makeWorldProject('stale_masterpiece', 29, 100, 100);
const worldPlayer: Player = {
    ...INITIAL_PLAYER,
    age: 31,
    world: {
        ...INITIAL_PLAYER.world,
        projects: [staleMasterpiece, qualityOnly, strongestEligible],
        awardHistory: [],
    },
};

assert(isWorldProjectEligibleForAwardSeason(strongestEligible, 'OSCAR', 31), 'Current world film was excluded from its Oscar season.');
assert(!isWorldProjectEligibleForAwardSeason(staleMasterpiece, 'OSCAR', 31), 'Old world film leaked into a later Oscar season.');

const ballot = withFixedRandom(0.5, () => generateFullBallot(worldPlayer, 'OSCAR', [], 31));
const bestPicture = ballot['Best Picture'];
assert(bestPicture.some(nomination => nomination.project.id === strongestEligible.id), 'Eligible world film was missing from the ballot.');
assert(bestPicture.every(nomination => nomination.project.id !== staleMasterpiece.id), 'Stale world film appeared on the ballot.');
assert(bestPicture[0].project.id === strongestEligible.id, 'World ballot ignored category-specific craft strength.');

const merelyGoodPlayerNomination = {
    project: { id: 'player_merely_good', name: 'Merely Good' },
    score: 85,
    category: 'Best Picture',
    isPlayer: true,
    nomineeName: 'Producers',
};
const competitiveBallot = withFixedRandom(0.5, () => (
    generateFullBallot(worldPlayer, 'OSCAR', [merelyGoodPlayerNomination], 31)
));
const competitiveResult = determineWinners([merelyGoodPlayerNomination], competitiveBallot);
assert(!competitiveResult[0].won, 'A merely good player project beat an elite world release.');

const brokenYearEndProject = {
    ...makeWorldProject('legacy_week_53', 30, 80, 80),
    weekReleased: 53,
};
const yearEndPlayer: Player = {
    ...worldPlayer,
    age: 30,
    currentWeek: 52,
    world: {
        ...worldPlayer.world,
        projects: [],
        upcomingRivals: [brokenYearEndProject],
    },
};
const repairedYearEndWorld = withFixedRandom(0.5, () => processWorldTurn(yearEndPlayer).world);
assert(
    repairedYearEndWorld.upcomingRivals.every(project => project.weekReleased >= 1 && project.weekReleased <= 52),
    'World rival schedule retained an impossible week 53+ release.'
);
const nextYearWeekOneIds = repairedYearEndWorld.upcomingRivals
    .filter(project => project.year === 31 && project.weekReleased === 1)
    .map(project => project.id);
assert(nextYearWeekOneIds.length === 2, 'World schedule did not queue two releases across the year boundary.');

const birthdayWeekWorld = withFixedRandom(0.5, () => processWorldTurn({
    ...yearEndPlayer,
    age: 31,
    currentWeek: 1,
    world: repairedYearEndWorld,
} as Player).world);
assert(
    nextYearWeekOneIds.every(id => birthdayWeekWorld.projects.some(project => project.id === id)),
    'Scheduled world releases disappeared instead of releasing after the year rollover.'
);

const inflatedAwards = Array.from({ length: 40 }, (_, index) => ([
    {
        id: `acting_${index}`,
        name: 'The Oscars',
        type: 'OSCAR',
        year: 20 + index,
        category: 'Best Actor',
        projectId: `acting_project_${index}`,
        projectName: `Acting Project ${index}`,
        outcome: 'WON',
    },
    {
        id: `trailer_${index}`,
        name: 'The Oscars',
        type: 'OSCAR',
        year: 20 + index,
        category: 'Best Trailer',
        projectId: `music_project_${index}`,
        projectName: `Music Project ${index}`,
        outcome: 'WON',
    },
    {
        id: `video_${index}`,
        name: 'The Oscars',
        type: 'OSCAR',
        year: 20 + index,
        category: 'Best Music Video Tie-In',
        projectId: `music_project_${index}`,
        projectName: `Music Project ${index}`,
        outcome: 'WON',
    },
])).flat() as any[];
inflatedAwards.push({
    ...inflatedAwards[0],
    id: 'repeat_year_bug',
    year: 99,
});

const cleanedAwards = sanitizeAwardRecords(inflatedAwards);
assert(cleanedAwards.length === 40, 'Legacy cleanup removed legitimate acting awards or retained inflated music awards.');
assert(cleanedAwards.every(award => award.category === 'Best Actor'), 'Legacy campaign awards survived cleanup.');

const cleanedHistory = sanitizeAwardHistoryEntries([{
    year: 31,
    type: 'OSCAR',
    winners: [
        { category: 'Best Actor', winnerName: 'Player', projectName: 'Real Film', isPlayer: true },
        { category: 'Best Trailer', winnerName: 'Player', projectName: 'Real Film', isPlayer: true },
    ],
}] as any);
assert(cleanedHistory[0].winners.length === 1, 'Legacy inflated winner history was not cleaned.');
assert(cleanedHistory[0].winners[0].category === 'Best Actor', 'Legitimate winner history was removed.');

console.log('award competition + music realism audit passed');
