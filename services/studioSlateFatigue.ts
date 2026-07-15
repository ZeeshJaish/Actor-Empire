import type { ActiveRelease, PastProject, Player, ProjectDetails } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

export type StudioSlateFatigueLabel = 'FRESH' | 'CROWDED' | 'FATIGUED';

export interface StudioSlateFatigueProfile {
    score: number;
    reviewPenalty: number;
    label: StudioSlateFatigueLabel;
    notes: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getReleaseWeek = (project: Partial<ActiveRelease> | Partial<PastProject>): number | undefined => {
    const explicitWeek = Number(project.releasedAtAbsoluteWeek);
    if (Number.isFinite(explicitWeek) && explicitWeek > 0) return explicitWeek;

    const year = Number(project.releaseYear || (project as Partial<PastProject>).year);
    const week = Number(project.releaseWeek || 1);
    return Number.isFinite(year) && year > 0 ? getAbsoluteWeek(year, week) : undefined;
};

const sameStudio = (project: ActiveRelease | PastProject, studioId: string) => {
    const projectStudioId = 'projectDetails' in project
        ? project.projectDetails?.studioId
        : project.studioId;
    return String(projectStudioId || '') === studioId;
};

const projectGenre = (project: ActiveRelease | PastProject) => (
    'projectDetails' in project ? project.projectDetails?.genre : project.genre
);

const projectFranchiseId = (project: ActiveRelease | PastProject) => (
    'projectDetails' in project ? project.projectDetails?.franchiseId : project.franchiseId
);

/**
 * Measures audience fatigue from a studio's real release cadence. It never blocks
 * a lean production; it only makes repeated, similar releases carry a downside.
 */
export const calculateStudioSlateFatigue = (
    player: Pick<Player, 'age' | 'currentWeek' | 'activeReleases' | 'pastProjects' | 'commitments'>,
    project: ProjectDetails,
    releaseId?: string,
): StudioSlateFatigueProfile => {
    const studioId = String(project.studioId || '');
    if (!studioId) return { score: 0, reviewPenalty: 0, label: 'FRESH', notes: [] };

    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const releases = [
        ...(player.activeReleases || []),
        ...(player.pastProjects || []),
    ].filter((candidate): candidate is ActiveRelease | PastProject => (
        candidate.id !== releaseId && sameStudio(candidate, studioId)
    ));

    const recent = releases.map(candidate => ({
        candidate,
        ageInWeeks: now - (getReleaseWeek(candidate) ?? -1000),
    })).filter(entry => entry.ageInWeeks >= 0 && entry.ageInWeeks <= 26);

    const recentTwelveWeeks = recent.filter(entry => entry.ageInWeeks <= 12);
    const recentGenre = recent.filter(entry => entry.ageInWeeks <= 18 && projectGenre(entry.candidate) === project.genre);
    const recentFranchise = project.franchiseId
        ? recent.filter(entry => entry.ageInWeeks <= 22 && projectFranchiseId(entry.candidate) === project.franchiseId)
        : [];
    const activeSelfRunProjects = (player.commitments || []).filter(commitment => (
        commitment.projectDetails?.hiddenStats?.selfRunProduction
        && commitment.projectPhase !== 'AWAITING_RELEASE'
    )).length;

    const selfRunRepeat = project.hiddenStats?.selfRunProduction && recentTwelveWeeks.length > 0 ? 10 : 0;
    const selfRunStretch = project.hiddenStats?.selfRunProduction ? Math.max(0, activeSelfRunProjects - 1) * 10 : 0;
    const score = Math.round(clamp(
        (recentTwelveWeeks.length * 15)
        + (recentGenre.length * 9)
        + (recentFranchise.length * 12)
        + selfRunRepeat
        + selfRunStretch,
        0,
        68,
    ));

    const notes: string[] = [];
    if (recentTwelveWeeks.length >= 2) notes.push('back-to-back releases');
    if (recentGenre.length >= 2) notes.push('same-genre repetition');
    if (recentFranchise.length >= 1) notes.push('franchise repetition');
    if (selfRunStretch >= 10) notes.push('one-person production stretch');

    return {
        score,
        reviewPenalty: Math.round((score / 34) * 10) / 10,
        label: score >= 45 ? 'FATIGUED' : score >= 18 ? 'CROWDED' : 'FRESH',
        notes,
    };
};
