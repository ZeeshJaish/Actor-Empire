import type { Player } from '../types';
import { inferSeasonNumber } from './episodeRatings';
import { getContinuationDecisionWeek, getContinuationProgressWeek } from './releaseContinuationLogic';

/** What the service's page says about a studio series' next season. scriptId: the season waiting in the
    studio's Vault, ready to be made (the page's "Order season N" opens it there). */
export interface OwnStudioNextSeason {
    seasonNumber: number;
    studioId?: string;
    scriptId?: string;
    note: string;
}

/* B14b (2026-11-15): a series the player's own studio made and brought to its service had no way on from the
   service's page, only Start a campaign. The studio prepares the next season in its Vault when the season's
   decision week comes (AE-022), so the page now opens it there, or says when it will be ready. A series the
   player's studio did not make returns null (its page is unchanged). */
export const getOwnStudioNextSeason = (player: Player, projectId: string): OwnStudioNextSeason | null => {
    const release = (player.activeReleases || []).find(row => String(row.id) === projectId) || null;
    const row: any = release || (player.pastProjects || []).find(project => String(project.id) === projectId);
    if (!row) return null;
    const details = row.projectDetails || row;
    /* a release's type is the project's; an archive entry's type is the career entry's (ACTING_GIG …), its projectType the project's */
    if ((release ? release.type : (row.projectType || details.type)) !== 'SERIES') return null;
    const studio = (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.studioState
        && business.id === String(details.studioId || row.studioId || ''));
    if (!studio) return null;
    const name = String(row.name || details.title || 'This series');
    const season = Number(row.installmentNumber || details.installmentNumber) || inferSeasonNumber({ ...details, title: name });
    const seasonNumber = season + 1;
    const franchise = String(row.franchiseId || details.franchiseId || row.id);
    /* "Vanta Pictures' Studio Vault", "Northgate Film's Studio Vault" */
    const vault = `${studio.name}${/s$/i.test(studio.name) ? '\'' : '\'s'} Studio Vault`;
    /* the next season the studio holds for this show (the gameLoop prepares it with the show's franchise id) */
    const next = (studio.studioState!.scripts || [])
        .filter(script => String(script.franchiseId || '') === franchise && Number(script.installmentNumber) > season)
        .sort((left, right) => Number(left.installmentNumber) - Number(right.installmentNumber))[0];
    if (next?.status === 'PRODUCED') return { seasonNumber: Number(next.installmentNumber), note: `Season ${next.installmentNumber} is being made at ${studio.name}.` };
    if (next) return { seasonNumber: Number(next.installmentNumber), studioId: studio.id, scriptId: next.id, note: `Season ${next.installmentNumber} is waiting in ${vault}.` };
    if (release && !release.sequelDecisionMade) {
        const weeks = Math.max(1, getContinuationDecisionWeek(release) - getContinuationProgressWeek(release));
        return { seasonNumber, note: `Season ${seasonNumber} reaches ${vault} after ${weeks === 1 ? 'one more week' : `${weeks} more weeks`} on air.` };
    }
    return { seasonNumber, note: release?.futurePotential?.seriesStatus === 'ENDED' || row.futurePotential?.seriesStatus === 'ENDED'
        ? `${name} has ended.` : `No Season ${seasonNumber} is waiting in ${vault}.` };
};
