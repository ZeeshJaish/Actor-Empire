import { ActiveRelease, Player, PlayerReturnStatus, RoleType } from '../types';

const HIGH_FATALITY_GENRES = new Set(['ACTION', 'THRILLER', 'SCI_FI', 'SUPERHERO', 'ADVENTURE']);

export const calculateContinuationReturnChance = (
    release: ActiveRelease,
    player: Player
): number => {
    const baseReturnChanceByRole: Record<RoleType, number> = {
        LEAD: 88,
        SUPPORTING: 66,
        ENSEMBLE: 54,
        CAMEO: 34,
        MINOR: 22
    };
    const role = release.roleType || 'SUPPORTING';
    const performanceBonus = release.productionPerformance >= 85
        ? 10
        : release.productionPerformance >= 70
            ? 5
            : release.productionPerformance <= 40
                ? -10
                : 0;
    const rating = release.imdbRating || 5;
    const ratingBonus = rating >= 8 ? 8 : rating >= 7 ? 4 : rating < 5.8 ? -10 : 0;
    const fameBonus = player.stats.fame >= 80 ? 6 : player.stats.fame >= 60 ? 3 : 0;

    return Math.max(8, Math.min(
        96,
        baseReturnChanceByRole[role] + performanceBonus + ratingBonus + fameBonus
    ));
};

export const getReturnStatusForContinuation = (
    release: ActiveRelease,
    player: Player,
    isPlayerProduction: boolean,
    isUniverseContracted: boolean,
    random: () => number = Math.random
): { getsOffer: boolean; status: PlayerReturnStatus; note: string } => {
    if (isPlayerProduction || isUniverseContracted) {
        return {
            getsOffer: true,
            status: 'RETURNING',
            note: release.type === 'SERIES'
                ? 'The continuation keeps your character in the center of the story.'
                : 'The sequel keeps you on the call sheet.'
        };
    }

    const returnChance = calculateContinuationReturnChance(release, player);
    const getsOffer = random() * 100 < returnChance;

    if (getsOffer) {
        return {
            getsOffer: true,
            status: 'RETURNING',
            note: release.type === 'SERIES'
                ? 'The network wants your character back for the next season.'
                : 'The studio wants your character back for the follow-up film.'
        };
    }

    const lethalChance = HIGH_FATALITY_GENRES.has(release.projectDetails.genre) ? 0.55 : 0.18;
    const status: PlayerReturnStatus = random() < lethalChance ? 'KILLED_OFF' : 'WRITTEN_OFF';
    const note = status === 'KILLED_OFF'
        ? (release.type === 'SERIES'
            ? 'The renewed season continues without your character after an off-screen death.'
            : 'The sequel moves forward after your character is killed off.')
        : (release.type === 'SERIES'
            ? 'The renewed season continues without your character.'
            : 'The sequel moves forward after your character is written out.');

    return { getsOffer: false, status, note };
};
