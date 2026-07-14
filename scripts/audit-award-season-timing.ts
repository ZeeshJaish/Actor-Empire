import { INITIAL_PLAYER, type Player } from '../types';
import {
    checkAwardEligibility,
    isProjectEligibleForAwardSeason,
    sanitizeAwardHistoryEntries,
    sanitizeAwardRecords
} from '../services/awardLogic';
import { getProjectReleaseTiming } from '../services/releaseTiming';

const assert = (condition: unknown, message: string) => {
    if (!condition) {
        throw new Error(message);
    }
};

const absoluteWeek = (age: number, week: number) => ((age - 1) * 52) + (week - 1);

const originalFilm = {
    id: 'film_age_30',
    name: 'Age Thirty Film',
    type: 'ACTING_GIG',
    roleType: 'LEAD',
    year: 30,
    releaseYear: 30,
    releaseWeek: 20,
    releasedAtAbsoluteWeek: absoluteWeek(30, 20),
    rating: 9.7,
    imdbRating: 9.7,
    reception: 'HIT',
    projectQuality: 98,
    genre: 'DRAMA',
    projectType: 'MOVIE',
    gross: 1_350_000_000,
    budget: 80_000_000,
    hiddenStats: { qualityScore: 98, scriptQuality: 96, directorQuality: 94 },
    awards: []
};

const sequelFilm = {
    ...originalFilm,
    id: 'film_age_33',
    name: 'Age Thirty Three Sequel',
    year: 33,
    releaseYear: 33,
    releaseWeek: 8,
    releasedAtAbsoluteWeek: absoluteWeek(33, 8)
};

const player: Player = {
    ...INITIAL_PLAYER,
    name: 'Audit Star',
    age: 31,
    currentWeek: 6,
    gender: 'MALE',
    activeReleases: [],
    pastProjects: [originalFilm as any],
    awards: [],
    businesses: [],
    world: {
        ...INITIAL_PLAYER.world,
        projects: [],
        awardHistory: []
    }
};

assert(isProjectEligibleForAwardSeason(originalFilm, 'OSCAR', 31), 'Age-30 film should enter the next Oscar season.');
assert(!isProjectEligibleForAwardSeason(originalFilm, 'OSCAR', 32), 'Age-30 film must not re-enter Oscars one year later.');

const oscarSeasonNoms = checkAwardEligibility(player, 6, 31);
assert(
    oscarSeasonNoms.some(nom => nom.project.id === originalFilm.id && nom.category === 'Best Actor'),
    'High-quality age-30 film should receive its proper Oscar-season nomination.'
);

const repeatedSeasonNoms = checkAwardEligibility({ ...player, age: 32 } as Player, 6, 32);
assert(
    repeatedSeasonNoms.every(nom => nom.project.id !== originalFilm.id),
    'Same film should not keep generating nominations in later Oscar seasons.'
);

const blockedByExistingRecord = checkAwardEligibility({
    ...player,
    awards: [{
        id: 'award_existing',
        name: 'The Oscars',
        category: 'Best Actor',
        year: 31,
        outcome: 'NOMINATED',
        projectId: originalFilm.id,
        projectName: originalFilm.name,
        type: 'OSCAR'
    }]
} as Player, 6, 31);
assert(
    blockedByExistingRecord.every(nom => !(nom.project.id === originalFilm.id && nom.category === 'Best Actor')),
    'Existing award record should block duplicate nominations for the same show/category/project.'
);

const cleanedAwards = sanitizeAwardRecords([
    {
        id: 'award_31_nom',
        name: 'The Oscars',
        category: 'Best Actor',
        year: 31,
        outcome: 'NOMINATED' as const,
        projectId: originalFilm.id,
        projectName: originalFilm.name,
        type: 'OSCAR' as const
    },
    {
        id: 'award_32_bug_win',
        name: 'The Oscars',
        category: 'Best Actor',
        year: 32,
        outcome: 'WON' as const,
        projectId: originalFilm.id,
        projectName: originalFilm.name,
        type: 'OSCAR' as const
    },
    {
        id: 'award_33_bug_win',
        name: 'The Oscars',
        category: 'Best Actor',
        year: 33,
        outcome: 'WON' as const,
        projectId: originalFilm.id,
        projectName: originalFilm.name,
        type: 'OSCAR' as const
    }
]);
assert(cleanedAwards.length === 1, 'Duplicate cross-year awards should collapse to one record.');
assert(cleanedAwards[0].year === 31, 'Award cleanup should preserve the earliest true season.');
assert(cleanedAwards[0].outcome === 'NOMINATED', 'Later bugged wins should not overwrite the real earliest season outcome.');

const sameSeasonUpgrade = sanitizeAwardRecords([
    { ...cleanedAwards[0], id: 'same_year_nom', outcome: 'NOMINATED' as const },
    { ...cleanedAwards[0], id: 'same_year_win', outcome: 'WON' as const }
]);
assert(sameSeasonUpgrade.length === 1 && sameSeasonUpgrade[0].outcome === 'WON', 'Same-season nomination should upgrade to a win.');

const cleanedHistory = sanitizeAwardHistoryEntries([
    {
        year: 31,
        type: 'OSCAR' as const,
        winners: [{ category: 'Best Actor', winnerName: 'Audit Star', projectName: originalFilm.name, isPlayer: true }]
    },
    {
        year: 32,
        type: 'OSCAR' as const,
        winners: [{ category: 'Best Actor', winnerName: 'Audit Star', projectName: originalFilm.name, isPlayer: true }]
    },
    {
        year: 33,
        type: 'OSCAR' as const,
        winners: [{ category: 'Best Picture', winnerName: 'Producers', projectName: originalFilm.name, isPlayer: true }]
    }
]);
assert(cleanedHistory[0].winners.length === 1, 'Earliest player award-history winner should be preserved.');
assert(cleanedHistory[1].winners.length === 0, 'Later duplicate player award-history winner should be removed.');
assert(cleanedHistory[2].winners.length === 1, 'Different categories for the same project should remain in history.');

const originalTiming = getProjectReleaseTiming(originalFilm, { currentAge: 35 });
const sequelTiming = getProjectReleaseTiming(sequelFilm, { currentAge: 35 });
assert(originalTiming.releaseYear === 30, 'Original release age should stay age 30.');
assert(sequelTiming.releaseYear === 33, 'Sequel release age should stay age 33.');

const missingArchiveTiming = getProjectReleaseTiming({ id: 'old_missing', name: 'Old Missing Timing' }, { currentAge: 35 });
assert(missingArchiveTiming.releaseYear === undefined, 'Archived projects with no release timing must not borrow current age.');

const activeFallbackTiming = getProjectReleaseTiming({ id: 'active_missing', name: 'Active Missing Timing', weekNum: 2 }, { currentAge: 35 });
assert(activeFallbackTiming.releaseYear === 35, 'Active releases may still use current age as a rescue fallback.');

console.log('award season + release timing audit passed');
