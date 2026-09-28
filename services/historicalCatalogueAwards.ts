import type { IndustryProject, Player } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getHistoricalCatalogueTitles } from './historicalCatalogue';
import { getAbsoluteWeek } from './legacyLogic';

const FIRST_NAMES = ['Ari', 'Leila', 'Niko', 'Mira', 'Tariq', 'Sana', 'Ivo', 'Lina', 'Rafi', 'Noor', 'Cleo', 'Amara'];
const LAST_NAMES = ['Vale', 'Kaur', 'Okafor', 'Sato', 'Costa', 'Farah', 'Reyes', 'Bello', 'Navarro', 'Das', 'Moreau', 'Tan'];

const seededCreditName = (titleId: string, role: string): string => {
    const rng = createDeterministicRng(`historical-credit-v1:${titleId}:${role}`);
    return `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`;
};

const toAwardProject = (title: ReturnType<typeof getHistoricalCatalogueTitles>[number]): IndustryProject => {
    const rng = createDeterministicRng(`historical-craft-v1:${title.id}`);
    const craft = (bias = 0): number => Math.max(0, Math.min(100,
        Math.round(title.quality * 0.76 + title.prestige * 0.24 + bias + (rng() - 0.5) * 22),
    ));
    return {
        id: title.id,
        title: title.title,
        genre: title.genre,
        originalLanguageId: title.originalLanguageId,
        mediaType: title.projectType,
        studioId: title.studioId,
        budgetTier: title.budgetTier,
        quality: title.quality,
        rating: title.rating,
        boxOffice: title.boxOffice,
        year: title.year,
        weekReleased: title.weekReleased,
        leadActorId: createDeterministicId('historical_lead', title.id),
        leadActorName: seededCreditName(title.id, 'lead'),
        directorId: createDeterministicId('historical_director', title.id),
        directorName: seededCreditName(title.id, 'director'),
        reviews: 'Historical in-game release',
        awardProfile: {
            leadPerformance: craft(),
            directing: craft(),
            screenplay: craft(),
            cinematography: craft(),
            picture: craft(2),
            originalScore: craft(-3),
            originalSong: craft(-8),
            campaign: craft(-2),
        },
    };
};

/** Seeded history may compete only in still-upcoming seasons near the save's initialization. */
export const getHistoricalCatalogueAwardProjects = (
    player: Player, awardYear: number,
): IndustryProject[] => {
    const state = player.world.historicalCatalogue;
    if (!state) return [];
    const initialYear = Math.floor(state.initializedAtAbsoluteWeek / 52) + 1;
    if (awardYear < initialYear) return [];
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return getHistoricalCatalogueTitles(player)
        .filter(title => title.provenance === 'SEEDED_HISTORY'
            && title.year >= initialYear - 1 && title.year <= initialYear
            && (title.year === awardYear || title.year + 1 === awardYear)
            && getAbsoluteWeek(title.year, title.weekReleased) <= now)
        .map(toAwardProject);
};
