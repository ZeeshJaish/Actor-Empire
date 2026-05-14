import { Business, Genre, Player } from '../types';
import { formatGenreLabel } from './genreCatalog';

export const getStudioGenreReputation = (studio: Business | undefined, genre: Genre): number => {
    return Math.max(0, Math.min(100, studio?.studioState?.genreReputation?.[genre] || 0));
};

export const getStudioSpecializationLabel = (studio: Business | undefined): string => {
    const reputation = studio?.studioState?.genreReputation || {};
    const top = Object.entries(reputation).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
    if (!top || top[1] < 20) return 'Generalist Studio';
    return `${formatGenreLabel(top[0])} Specialist`;
};

export const improveStudioGenreReputation = (player: Player, studioId: string | undefined, genre: Genre, rating: number): Player => {
    if (!studioId) return player;
    const businesses = (player.businesses || []).map(business => {
        if (business.id !== studioId || business.type !== 'PRODUCTION_HOUSE' || !business.studioState) return business;
        const current = business.studioState.genreReputation?.[genre] || 0;
        const gain = rating >= 8.2 ? 8 : rating >= 7.2 ? 5 : rating >= 6.2 ? 3 : 1;
        return {
            ...business,
            studioState: {
                ...business.studioState,
                genreReputation: {
                    ...(business.studioState.genreReputation || {}),
                    [genre]: Math.min(100, current + gain),
                },
            },
        };
    });
    return { ...player, businesses };
};
