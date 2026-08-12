import { INITIAL_PLAYER } from '../types';
import { getAwardEligibilityDiagnostics } from '../services/awardLogic';

const player = {
    ...INITIAL_PLAYER,
    age: 32,
    currentWeek: 20,
    pastProjects: [
        { id: 'series_good', name: 'Signal Room', projectType: 'SERIES', releaseYear: 32, releaseWeek: 10, rating: 8.4 },
        { id: 'series_low', name: 'Quiet Signal', projectType: 'SERIES', releaseYear: 32, releaseWeek: 12, rating: 6.2 },
        { id: 'movie_good', name: 'Signal Film', projectType: 'MOVIE', releaseYear: 32, releaseWeek: 8, rating: 9.1 },
    ] as any,
    activeReleases: [],
};

const diagnostics = getAwardEligibilityDiagnostics(player);

if (diagnostics.award_debug_next_type !== 'EMMY') {
    throw new Error(`Expected the Emmy invite to be next, received ${diagnostics.award_debug_next_type}.`);
}
if (diagnostics.award_debug_seasonal_projects !== 3) {
    throw new Error(`Expected three projects in the award season, received ${diagnostics.award_debug_seasonal_projects}.`);
}
if (diagnostics.award_debug_media_matches !== 2) {
    throw new Error(`Expected two series media matches, received ${diagnostics.award_debug_media_matches}.`);
}
if (diagnostics.award_debug_rating_matches !== 1) {
    throw new Error(`Expected one final rating match, received ${diagnostics.award_debug_rating_matches}.`);
}

console.log('Award diagnostics audit passed.');
