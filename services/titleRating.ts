/**
 * #238 (plan §25.4 Q7): one rating per title. Zeesh (2026-11-04): "Imbd rating ek streaming project ka universal connection karna hoga".
 *
 * One formula from quality to rating (the player's own, `calculateIMDbRating`'s base), for AI platforms and studios as well. One function
 * every screen reads. A title keeps the number stored when it came out; satisfaction is its own measure, with its own name, and never
 * stands in for a rating.
 */
import type { Player } from '../types';
import { resolveHistoricalCatalogueTitle } from './historicalCatalogue';

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

/** quality 0–100 → rating: 30 is 4.5, 50 is 5.9, 70 is 7.2, 90 is 8.4 */
export const ratingFromQuality = (qualityValue: number): number => {
    const quality = clamp(Number(qualityValue) || 0, 0, 100);
    const rating = quality < 30 ? 2 + (quality / 30) * 2.5
        : quality < 70 ? 4.5 + ((quality - 30) / 40) * 2.7
            : quality < 90 ? 7.2 + ((quality - 70) / 20) * 1.2
                : 8.4 + ((quality - 90) / 10) * 0.8;
    return round1(clamp(rating, 1, 10));
};

const positive = (value: unknown): number | null => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? round1(clamp(number, 1, 10)) : null;
};

/** the one number for a title, wherever it is shown; null until it has one */
export const getTitleRating = (player: Player, projectId: string): number | null => {
    const id = String(projectId);
    const own = (player.activeReleases || []).find(row => String(row.id) === id) || (player.pastProjects || []).find(row => String(row.id) === id);
    const ownRating = own ? positive((own as { imdbRating?: number }).imdbRating) ?? positive((own as { rating?: number }).rating) : null;
    if (ownRating !== null) return ownRating;
    const offers = Object.values(player.world?.platformAiPlayerCommissionOffers || {});
    const delivered = offers.find(offer => offer.canonicalProductionId === id);
    if (delivered && positive(delivered.deliveredImdbRating) !== null) return positive(delivered.deliveredImdbRating);
    const world = (player.world?.projects || []).find(row => String(row.id) === id);
    if (world && positive(world.rating) !== null) return positive(world.rating);
    if (world && positive(world.quality) !== null) return ratingFromQuality(world.quality);
    const historical = resolveHistoricalCatalogueTitle(player, id);
    if (historical && positive(historical.rating) !== null) return positive(historical.rating);
    return null;
};
