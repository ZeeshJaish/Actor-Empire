import type { Player, ProjectType, Script } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeProjectTitle } from './projectNaming';
import { inferStoryCompass } from './characterIdentityLogic';

export const CONTINUATION_COOLDOWN_WEEKS = 4;

export type ContinuationMode = 'SEQUEL' | 'SPINOFF' | 'FINALE' | 'REBOOT';
export type ContinuationEligibilityReason =
    | 'AVAILABLE'
    | 'WAITING_PERIOD'
    | 'ALREADY_IN_DEVELOPMENT'
    | 'INVALID_PROJECT';

export interface ContinuationEligibility {
    eligible: boolean;
    reason: ContinuationEligibilityReason;
    weeksElapsed: number;
    weeksRemaining: number;
    message: string;
}

interface ContinuationRequest {
    player: Player;
    studioScripts: Script[];
    project: any;
    mode: ContinuationMode;
}

interface CreateContinuationRequest extends ContinuationRequest {
    title: string;
    overrides?: Partial<Script>;
}

const getProjectDetails = (project: any) => project?.projectDetails || project || {};

const getFranchiseId = (project: any) => {
    const details = getProjectDetails(project);
    return project?.franchiseId || details.franchiseId || project?.id || details.id || null;
};

const getInstallmentNumber = (project: any) => {
    const details = getProjectDetails(project);
    return Number(project?.installmentNumber || details.installmentNumber || 1);
};

const getProjectType = (project: any): ProjectType => {
    const details = getProjectDetails(project);
    const candidates = [
        project?.projectType,
        details?.projectType,
        details?.type,
        project?.type,
    ];
    return candidates.find(type => type === 'MOVIE' || type === 'SERIES') || 'MOVIE';
};

const getGenre = (project: any) => {
    const details = getProjectDetails(project);
    return project?.genre || details.genre || 'DRAMA';
};

const clampQuality = (value: number, fallback = 50) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(10, Math.min(100, Math.round(numericValue)));
};

// A continuation should carry forward some of the creative confidence earned by
// the source project. This is deliberately a baseline, not a guaranteed hit.
export const getContinuationScriptBaseline = (project: any, writerSkill: number): number => {
    const details = getProjectDetails(project);
    const hidden = details?.hiddenStats || project?.hiddenStats || {};
    const sourceQuality = clampQuality(
        hidden.scriptQuality
        ?? hidden.qualityScore
        ?? project?.projectQuality
        ?? details?.projectQuality
        ?? project?.productionPerformance
        ?? details?.productionPerformance
        ?? (Number(project?.imdbRating ?? details?.imdbRating) * 10),
        55,
    );
    const stableWriterSkill = clampQuality(writerSkill);
    return clampQuality((sourceQuality * 0.55) + (stableWriterSkill * 0.45));
};

const getReleaseAbsoluteWeek = (player: Player, project: any): number | null => {
    const details = getProjectDetails(project);
    const exactAbsoluteWeek = Number(
        project?.releasedAtAbsoluteWeek
        ?? details.releasedAtAbsoluteWeek
    );
    if (Number.isFinite(exactAbsoluteWeek) && exactAbsoluteWeek >= 0) {
        return exactAbsoluteWeek;
    }

    const releaseYear = Number(project?.releaseYear ?? details.releaseYear);
    const releaseWeek = Number(
        project?.releaseWeek
        ?? details.releaseWeek
        ?? details.hiddenStats?.releaseWeek
    );
    if (Number.isFinite(releaseYear) && Number.isFinite(releaseWeek) && releaseWeek >= 1 && releaseWeek <= 52) {
        return getAbsoluteWeek(releaseYear, releaseWeek);
    }

    const phase = String(project?.phase || project?.distributionPhase || '').toUpperCase();
    const weekNum = Number(project?.weekNum);
    if (
        Number.isFinite(weekNum)
        && weekNum >= 1
        && ['IN THEATERS', 'THEATRICAL', 'STREAMING', 'STREAMING_BIDDING'].includes(phase)
    ) {
        return Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - Math.max(0, weekNum - 1));
    }

    const archivedYear = Number(project?.year ?? details.year);
    if (Number.isFinite(archivedYear)) {
        if (archivedYear < player.age) {
            return getAbsoluteWeek(archivedYear, 1);
        }
        if (phase === 'RELEASED' || project?.type === 'ACTING_GIG') {
            // Old saves did not persist release week. Treat same-year archives as
            // mature rather than leaving an established franchise locked forever.
            return Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - CONTINUATION_COOLDOWN_WEEKS);
        }
    }

    return null;
};

const matchesContinuation = (
    item: any,
    franchiseId: string,
    mode: ContinuationMode,
    nextInstallment: number
) => {
    const details = getProjectDetails(item);
    const itemFranchiseId = item?.franchiseId || details.franchiseId;
    if (itemFranchiseId !== franchiseId) return false;

    const sourceMaterial = item?.sourceMaterial || details.sourceMaterial;
    const tags = Array.isArray(item?.tags) ? item.tags : [];

    if (mode === 'SPINOFF') return sourceMaterial === 'SPINOFF';
    if (mode === 'FINALE') return tags.includes('FINALE');
    if (mode === 'REBOOT') return tags.includes('REBOOT');

    const installment = Number(item?.installmentNumber || details.installmentNumber || 1);
    return sourceMaterial === 'SEQUEL' && installment === nextInstallment;
};

const hasExistingContinuation = ({
    player,
    studioScripts,
    project,
    mode,
}: ContinuationRequest) => {
    const franchiseId = getFranchiseId(project);
    if (!franchiseId) return false;
    const nextInstallment = getInstallmentNumber(project) + 1;

    const candidates = [
        ...studioScripts,
        ...(player.activeReleases || []),
        ...(player.pastProjects || []),
        ...(player.commitments || []),
    ];
    return candidates.some(item => matchesContinuation(item, franchiseId, mode, nextInstallment));
};

export const getContinuationEligibility = ({
    player,
    studioScripts,
    project,
    mode,
}: ContinuationRequest): ContinuationEligibility => {
    const franchiseId = getFranchiseId(project);
    if (!project?.id || !franchiseId) {
        return {
            eligible: false,
            reason: 'INVALID_PROJECT',
            weeksElapsed: 0,
            weeksRemaining: CONTINUATION_COOLDOWN_WEEKS,
            message: 'This project cannot start a continuation yet.',
        };
    }

    if (hasExistingContinuation({ player, studioScripts, project, mode })) {
        return {
            eligible: false,
            reason: 'ALREADY_IN_DEVELOPMENT',
            weeksElapsed: CONTINUATION_COOLDOWN_WEEKS,
            weeksRemaining: 0,
            message: `${mode === 'SPINOFF' ? 'A spin-off' : 'This continuation'} is already in development.`,
        };
    }

    const releaseAbsoluteWeek = getReleaseAbsoluteWeek(player, project);
    if (releaseAbsoluteWeek === null) {
        return {
            eligible: false,
            reason: 'WAITING_PERIOD',
            weeksElapsed: 0,
            weeksRemaining: CONTINUATION_COOLDOWN_WEEKS,
            message: 'Audience response is still being measured.',
        };
    }

    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const weeksElapsed = Math.max(0, currentAbsoluteWeek - releaseAbsoluteWeek);
    const weeksRemaining = Math.max(0, CONTINUATION_COOLDOWN_WEEKS - weeksElapsed);

    if (weeksRemaining > 0) {
        return {
            eligible: false,
            reason: 'WAITING_PERIOD',
            weeksElapsed,
            weeksRemaining,
            message: `Audience response window: ${weeksRemaining} week${weeksRemaining === 1 ? '' : 's'} remaining.`,
        };
    }

    return {
        eligible: true,
        reason: 'AVAILABLE',
        weeksElapsed,
        weeksRemaining: 0,
        message: 'Audience response is in. Development can begin.',
    };
};

export const createContinuationScript = (request: CreateContinuationRequest): {
    ok: boolean;
    eligibility: ContinuationEligibility;
    script?: Script;
} => {
    const eligibility = getContinuationEligibility(request);
    const title = normalizeProjectTitle(request.title);
    if (!eligibility.eligible || !title) {
        return { ok: false, eligibility };
    }

    const { player, project, mode, overrides } = request;
    const sourceType = getProjectType(project);
    const sourceDetails = getProjectDetails(project);
    const franchiseId = getFranchiseId(project)!;
    const installmentNumber = mode === 'SPINOFF' ? 1 : getInstallmentNumber(project) + 1;
    const projectType: ProjectType = sourceType;

    const script: Script = {
        id: `script_${mode.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        genres: [getGenre(project)],
        status: 'CONCEPT',
        quality: 0,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: false,
        projectType,
        sourceMaterial: mode === 'SPINOFF' ? 'SPINOFF' : 'SEQUEL',
        connectedProjectIntent: mode === 'REBOOT'
            ? 'REBOOT'
            : mode === 'FINALE'
                ? 'EVENT'
                : mode === 'SPINOFF'
                    ? 'CROSSOVER'
                    : 'SOLO',
        tags: [mode, 'FRANCHISE'],
        createdAtWeek: player.currentWeek,
        storyCompass: overrides?.storyCompass
            || sourceDetails.storyCompass
            || inferStoryCompass(sourceDetails, sourceDetails.universeId ? 'CANON' : undefined),
        universeId: overrides?.universeId ?? sourceDetails.universeId ?? project?.universeId,
        universeSagaName: overrides?.universeSagaName ?? sourceDetails.universeSagaName ?? project?.universeSagaName,
        universePhaseName: overrides?.universePhaseName ?? sourceDetails.universePhaseName ?? project?.universePhaseName,
        ...overrides,
        title,
        franchiseId,
        installmentNumber,
    };

    return { ok: true, eligibility, script };
};
