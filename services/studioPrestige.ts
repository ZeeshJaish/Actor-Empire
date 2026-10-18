import type { Player } from '../types';
import { getInheritedStudioProjects } from './legacyLogic';

type PrestigeProject = {
    rating?: number;
    gross?: number;
    streamingRevenue?: number;
    awards?: Array<{ outcome?: string }>;
};

/** Keep studio reputation in negotiations identical to the dashboard score. */
export const calculateStudioPrestigeScore = (library: PrestigeProject[]): number => {
    const averageRating = library.length ? library.reduce((sum, p) => sum + (p.rating || 0), 0) / library.length : 0;
    const awards = library.reduce((sum, p) => sum + (p.awards?.filter(a => a.outcome === 'WON').length || 0), 0);
    const breakouts = library.filter(p => (p.gross || 0) + (p.streamingRevenue || 0) > 200_000_000).length;
    const consistency = library.filter(p => (p.rating || 0) >= 7.5).length * 0.8;
    return Math.min(100, Math.floor(averageRating * 6 + awards * 2.5 + library.length * 0.8 + breakouts * 1.2 + consistency));
};

export const getStudioPrestigeScore = (player: Player, studioId: string): number => {
    const owned = player.pastProjects.filter(p => p.studioId === studioId);
    const known = new Set([...player.pastProjects.map(p => p.id), ...player.activeReleases.map(p => p.id)]);
    const inherited = getInheritedStudioProjects(player, studioId).filter(p => !known.has(p.id));
    return calculateStudioPrestigeScore([...owned, ...inherited]);
};
