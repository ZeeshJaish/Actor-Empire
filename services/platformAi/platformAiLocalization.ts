import type {
    PlatformAiLocalizationJob,
    PlatformAiLocalizationLevel,
    PlatformAiLocalizationMode,
    PlatformState,
    Player,
    WorldState,
} from '../../types';
import { normalizeStreamingDayOneMarketIds } from '../streamingDayOneMarkets';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import {
    normalizePlatformAiPendingOneTimeObligations,
    normalizePlatformAiState,
    resolvePlatformController,
} from './platformAiState';
import {
    getPlatformAiLocalizationJobId,
    getPlatformAiLocalizationObligationId,
    getPlatformAiLocalizationRequirements,
    getResearchBackedContentOperationsLevel,
    quotePlatformAiLocalization,
    resolvePlatformAiLocalizationCapability,
} from './platformAiLocalizationCore';
import { resolvePlatformAiLocalizationModeSupport } from './platformAiLanguageCapabilities';
import { getPlatformAiOperatingProfile } from './platformAiOperatingProfiles';

export { resolvePlatformAiLocalizationCapability } from './platformAiLocalizationCore';

export interface PlanPlatformAiLocalizationInput {
    player: Player;
    world: WorldState;
    platform: PlatformState;
    absoluteWeek: number;
    contentPlanId: string;
    projectId: string;
    countryIds: string[];
    level?: PlatformAiLocalizationLevel;
    languageId?: string;
    mode?: PlatformAiLocalizationMode;
}

export interface PlatformAiLocalizationMutationResult {
    platform: PlatformState;
    changed: boolean;
    job: PlatformAiLocalizationJob | null;
    reason: 'PLANNED' | 'DUPLICATE' | 'CAPABILITY_INSUFFICIENT' | 'INVALID_SCOPE' | 'PLAYER_CONTROLLED' | 'PROGRESSED' | 'UNCHANGED';
}

const resolveProjectLanguage = (
    input: PlanPlatformAiLocalizationInput,
): { originalLanguageId?: string | null } => {
    const industryProject = input.world.projects.find(item => item.id === input.projectId);
    return industryProject || { originalLanguageId: 'english' };
};

export const planPlatformAiLocalization = (
    input: PlanPlatformAiLocalizationInput,
): PlatformAiLocalizationMutationResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return { platform: input.platform, changed: false, job: null, reason: 'PLAYER_CONTROLLED' };
    }
    const platform = normalizePlatformAiState(input.platform, 'platform-ai-localization', input.absoluteWeek);
    const ai = platform.ai!;
    const contentPlanId = String(input.contentPlanId || '').trim();
    const projectId = String(input.projectId || '').trim();
    const plan = ai.slate.find(item => item.id === contentPlanId);
    const production = plan?.industryProductionId ? input.world.industryProductions?.[plan.industryProductionId] : null;
    const canonicalProjectIds = plan?.source === 'COMMISSIONED_ORIGINAL'
        ? production ? [production.canonicalProjectId] : []
        : plan?.sourceProjectIds || [];
    const requestedCountryIds = normalizeStreamingDayOneMarketIds(input.countryIds).sort();
    const planCountryIds = normalizeStreamingDayOneMarketIds(plan?.releaseCountryIds).sort();
    if (
        !contentPlanId || !projectId || !plan || !canonicalProjectIds.includes(projectId)
        || !requestedCountryIds.length
        || requestedCountryIds.some(countryId => !planCountryIds.includes(countryId))
        || requestedCountryIds.some(countryId => !ai.capabilities.activeCountryIds.includes(countryId))
        || input.level !== undefined && input.level !== plan.localizationLevel
    ) return { platform, changed: false, job: null, reason: 'INVALID_SCOPE' };

    const project = resolveProjectLanguage(input);
    const requirements = getPlatformAiLocalizationRequirements(platform, plan, project);
    const languageId = normalizeStreamingLanguageId(input.languageId || requirements[0]?.languageId);
    const mode = input.mode || requirements.find(item => item.languageId === languageId)?.mode;
    if (!languageId || !mode) return { platform, changed: false, job: null, reason: 'INVALID_SCOPE' };
    const requirement = requirements.find(item => item.languageId === languageId && item.mode === mode);
    if (!requirement) return { platform, changed: false, job: null, reason: 'INVALID_SCOPE' };
    const hasExactRequest = input.languageId !== undefined || input.mode !== undefined;
    if (hasExactRequest && (
        requirement.countryIds.length !== requestedCountryIds.length
        || !requirement.countryIds.every((countryId, index) => countryId === requestedCountryIds[index])
    )) return { platform, changed: false, job: null, reason: 'INVALID_SCOPE' };
    const localizationCountryIds = requirement.countryIds;
    const support = resolvePlatformAiLocalizationModeSupport(ai, languageId, mode);
    if (!support.supported || support.tier === 0) {
        return { platform, changed: false, job: null, reason: 'CAPABILITY_INSUFFICIENT' };
    }
    const capabilityTier = support.tier as 1 | 2 | 3;
    const id = getPlatformAiLocalizationJobId({
        platformId: platform.id,
        contentPlanId,
        projectId,
        languageId,
        mode,
        countryIds: localizationCountryIds,
        capabilityTier,
    });
    const existing = ai.localizationJobs.find(job => (
        job.contentPlanId === contentPlanId
        && job.projectId === projectId
        && job.languageId === languageId
        && job.mode === mode
    ));
    if (existing) return { platform, changed: false, job: existing, reason: 'DUPLICATE' };
    const contentOperationsLevel = getResearchBackedContentOperationsLevel(ai.researchQueue);
    const quote = quotePlatformAiLocalization({
        projectType: plan.projectType,
        mode,
        capabilityTier,
        countryIds: localizationCountryIds,
        controller: 'AI',
        efficiencyPolicy: getPlatformAiOperatingProfile(platform.id).efficiency,
    });
    const obligationId = getPlatformAiLocalizationObligationId(id);
    const job: PlatformAiLocalizationJob = {
        id,
        platformId: platform.id,
        contentPlanId,
        projectId,
        countryIds: localizationCountryIds,
        level: plan.localizationLevel,
        languageId,
        mode,
        capabilityTierAtPlanning: capabilityTier,
        qualityForecast: quote.qualityForecast,
        efficiencySnapshot: quote.efficiencySnapshot,
        quoteVersion: 1,
        legacyObligationId: null,
        contentOperationsLevelAtPlanning: contentOperationsLevel,
        costMillions: quote.costMillions,
        leadWeeks: quote.leadWeeks,
        obligationId,
        status: 'WAITING_FOR_FUNDS',
        createdAtAbsoluteWeek: input.absoluteWeek,
        startedAtAbsoluteWeek: null,
        readyAtAbsoluteWeek: null,
        cancelledAtAbsoluteWeek: null,
    };
    const pendingOneTimeObligations = normalizePlatformAiPendingOneTimeObligations([
        ...ai.pendingOneTimeObligations,
        {
            id: obligationId,
            category: 'LOCALIZATION' as const,
            amountMillions: quote.costMillions,
            createdWeek: input.absoluteWeek,
            status: 'HELD' as const,
            settledWeek: null,
        },
    ], new Set([
        ...ai.localizationJobs.filter(item => item.status !== 'CANCELLED').map(item => item.obligationId),
        obligationId,
    ]));
    const nextPlatform: PlatformState = {
        ...platform,
        ai: {
            ...ai,
            localizationJobs: [...ai.localizationJobs, job],
            pendingOneTimeObligations,
        },
    };
    return { platform: nextPlatform, changed: true, job, reason: 'PLANNED' };
};

export const progressPlatformAiLocalization = (input: {
    player: Player;
    platform: PlatformState;
    absoluteWeek: number;
}): PlatformAiLocalizationMutationResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return { platform: input.platform, changed: false, job: null, reason: 'PLAYER_CONTROLLED' };
    }
    const platform = normalizePlatformAiState(input.platform, 'platform-ai-localization', input.absoluteWeek);
    const ai = platform.ai!;
    let changed = false;
    const localizationJobs = ai.localizationJobs.map(job => {
        if (job.status !== 'IN_PROGRESS' || job.startedAtAbsoluteWeek === null || input.absoluteWeek < job.startedAtAbsoluteWeek + job.leadWeeks) return job;
        changed = true;
        return { ...job, status: 'READY' as const, readyAtAbsoluteWeek: job.startedAtAbsoluteWeek + job.leadWeeks };
    });
    if (!changed) return { platform, changed: false, job: null, reason: 'UNCHANGED' };
    const nextPlatform = { ...platform, ai: { ...ai, localizationJobs } };
    return {
        platform: nextPlatform,
        changed: true,
        job: localizationJobs.find(job => job.status === 'READY' && job.readyAtAbsoluteWeek === input.absoluteWeek) || null,
        reason: 'PROGRESSED',
    };
};
