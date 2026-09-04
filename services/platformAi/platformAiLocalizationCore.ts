import type {
    PlatformAiContentPlan,
    PlatformAiEfficiencySnapshot,
    PlatformAiLocalizationLevel,
    PlatformAiLocalizationMode,
    PlatformAiOperatingEfficiencyPolicy,
    PlatformAiResearchItem,
    PlatformAiRuntimeState,
    PlatformId,
    PlatformState,
    ProjectType,
    StreamingLocalizationPromise,
    StreamingRightsLocalizationTerms,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { getStreamingCountryMarketProfile, normalizeStreamingDayOneMarketIds } from '../streamingDayOneMarkets';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import { createPlatformAiEfficiencySnapshot } from './platformAiEfficiency';
import { resolvePlatformAiLocalizationModeSupport } from './platformAiLanguageCapabilities';

export const resolvePlatformAiLocalizationCapability = (contentOperationsLevel: number): PlatformAiLocalizationLevel => {
    const level = Number.isFinite(contentOperationsLevel) ? Math.max(0, contentOperationsLevel) : 0;
    if (level < 22) return 'NONE';
    if (level < 40) return 'SUBTITLES';
    return 'DUBS_AND_SUBTITLES';
};

export interface PlatformAiLocalizationQuoteInput {
    projectType: ProjectType;
    mode: PlatformAiLocalizationMode;
    capabilityTier: 1 | 2 | 3;
    countryIds: string[];
    controller: 'AI' | 'PLAYER';
    efficiencyPolicy?: Partial<PlatformAiOperatingEfficiencyPolicy> | null;
}

export interface PlatformAiLocalizationQuote {
    costMillions: number;
    leadWeeks: number;
    qualityForecast: number;
    standardCostMillions: number;
    standardLeadWeeks: number;
    efficiencySnapshot: PlatformAiEfficiencySnapshot | null;
}

export function quotePlatformAiLocalization(input: PlatformAiLocalizationQuoteInput): PlatformAiLocalizationQuote;
/** @deprecated Aggregate compatibility quote retained for old-save migration. */
export function quotePlatformAiLocalization(level: PlatformAiLocalizationLevel, countryCount: number, contentOperationsLevel: number): { costMillions: number; leadWeeks: number };
export function quotePlatformAiLocalization(
    inputOrLevel: PlatformAiLocalizationQuoteInput | PlatformAiLocalizationLevel,
    legacyCountryCount?: number,
    legacyContentOperationsLevel?: number,
): PlatformAiLocalizationQuote | { costMillions: number; leadWeeks: number } {
    if (typeof inputOrLevel === 'string') {
        if (inputOrLevel === 'NONE') return { costMillions: 0, leadWeeks: 0 };
        const contentOperationsLevel = Number(legacyContentOperationsLevel) || 0;
        const discount = Math.min(0.3, Math.max(0, contentOperationsLevel - 22) / 145);
        const unitCost = inputOrLevel === 'SUBTITLES' ? 0.06 : 0.38;
        const baseLead = inputOrLevel === 'SUBTITLES' ? 3 : 7;
        return {
            costMillions: Math.round(Math.max(0, Number(legacyCountryCount) || 0) * unitCost * (1 - discount) * 1_000_000) / 1_000_000,
            leadWeeks: Math.max(1, baseLead - Math.floor(Math.max(0, contentOperationsLevel - 22) / 18)),
        };
    }
    const input = inputOrLevel;
    const countryIds = normalizeStreamingDayOneMarketIds(input.countryIds);
    const standardCostMillions = Math.round(
        (input.mode === 'DUB' ? 0.55 : 0.08)
        * (input.projectType === 'SERIES' ? 1.8 : 1)
        * (1 + Math.max(0, countryIds.length - 1) * 0.12)
        * (1 - (input.capabilityTier - 1) * 0.07)
        * 1_000_000,
    ) / 1_000_000;
    const standardLeadWeeks = input.mode === 'DUB'
        ? Math.max(2, 8 - input.capabilityTier)
        : Math.max(1, 5 - input.capabilityTier);
    const qualityForecast = Math.min(96, (input.mode === 'DUB' ? 50 : 56) + input.capabilityTier * 13);
    if (input.controller === 'PLAYER') return {
        costMillions: standardCostMillions,
        leadWeeks: standardLeadWeeks,
        qualityForecast,
        standardCostMillions,
        standardLeadWeeks,
        efficiencySnapshot: null,
    };
    const snapshot = createPlatformAiEfficiencySnapshot(
        standardCostMillions,
        standardLeadWeeks,
        input.efficiencyPolicy,
        'LOCALIZATION',
    );
    const throughput = Math.max(1, Math.min(1.2, Number(input.efficiencyPolicy?.localizationThroughputMultiplier) || 1));
    const appliedLeadWeeks = Math.max(1, Math.ceil(snapshot.appliedLeadWeeks / throughput));
    const efficiencySnapshot: PlatformAiEfficiencySnapshot = { ...snapshot, appliedLeadWeeks };
    return {
        costMillions: efficiencySnapshot.appliedCostMillions,
        leadWeeks: appliedLeadWeeks,
        qualityForecast,
        standardCostMillions,
        standardLeadWeeks,
        efficiencySnapshot,
    };
}

export interface PlatformAiLocalizationJobIdentity {
    platformId: PlatformId;
    contentPlanId: string;
    projectId: string;
    languageId: string;
    mode: PlatformAiLocalizationMode;
    countryIds: string[];
    capabilityTier: 1 | 2 | 3;
    controllerQuoteVersion?: number;
}

export function getPlatformAiLocalizationJobId(input: PlatformAiLocalizationJobIdentity): string;
/** @deprecated Aggregate identity retained for old-save migration. */
export function getPlatformAiLocalizationJobId(platformId: PlatformId, contentPlanId: string, projectId: string, level: PlatformAiLocalizationLevel, countryIds: string[], contentOperationsLevelAtPlanning: number): string;
export function getPlatformAiLocalizationJobId(
    inputOrPlatformId: PlatformAiLocalizationJobIdentity | PlatformId,
    legacyContentPlanId?: string,
    legacyProjectId?: string,
    legacyLevel?: PlatformAiLocalizationLevel,
    legacyCountryIds?: string[],
    legacyContentOperationsLevel?: number,
): string {
    if (typeof inputOrPlatformId === 'string') return createDeterministicId(
        'platform_ai_localization_job', inputOrPlatformId, legacyContentPlanId, legacyProjectId,
        legacyLevel, [...(legacyCountryIds || [])].sort().join(','), legacyContentOperationsLevel,
    );
    const input = inputOrPlatformId;
    return createDeterministicId(
        'platform_ai_localization_job', input.platformId, input.contentPlanId, input.projectId,
        normalizeStreamingLanguageId(input.languageId), input.mode,
        normalizeStreamingDayOneMarketIds(input.countryIds).sort().join(','),
        input.capabilityTier, input.controllerQuoteVersion ?? 1,
    );
}

export const getPlatformAiLocalizationObligationId = (jobId: string): string => (
    createDeterministicId('platform_ai_localization_obligation', jobId)
);

export interface PlatformAiLocalizationRequirement {
    languageId: string;
    mode: PlatformAiLocalizationMode;
    countryIds: string[];
    capabilityTier: 0 | 1 | 2 | 3;
    supported: boolean;
    mandatory: boolean;
}

const buildRequirementsForLevel = (
    platform: PlatformState,
    countryIds: string[],
    originalLanguageId: string,
    level: PlatformAiLocalizationLevel,
): PlatformAiLocalizationRequirement[] => {
    const plan = {
        localizationLevel: level,
        releaseCountryIds: countryIds,
    } as PlatformAiContentPlan;
    return getPlatformAiLocalizationRequirements(platform, plan, { originalLanguageId });
};

export const resolveCapabilityBackedLocalizationPromise = (input: {
    platform: PlatformState;
    countryIds: string[];
    originalLanguageId?: string | null;
    requestedLevel: StreamingRightsLocalizationTerms | PlatformAiLocalizationLevel;
}): { localizationLevel: PlatformAiLocalizationLevel; requirements: StreamingLocalizationPromise[] } => {
    const requestedRank = input.requestedLevel === 'DUBS_AND_SUBTITLES' ? 2 : input.requestedLevel === 'SUBTITLES' ? 1 : 0;
    const originalLanguageId = normalizeStreamingLanguageId(input.originalLanguageId || 'english') || 'english';
    for (const level of (['DUBS_AND_SUBTITLES', 'SUBTITLES'] as const).filter(candidate => (
        (candidate === 'DUBS_AND_SUBTITLES' ? 2 : 1) <= requestedRank
    ))) {
        const requirements = buildRequirementsForLevel(input.platform, input.countryIds, originalLanguageId, level);
        const supportedRequirements = requirements.filter(requirement => (
            requirement.supported && requirement.capabilityTier > 0
        ));
        if (supportedRequirements.length) {
            return {
                localizationLevel: level,
                requirements: supportedRequirements.map(requirement => ({
                    languageId: requirement.languageId,
                    mode: requirement.mode,
                    countryIds: requirement.countryIds,
                    capabilityTierAtPromise: requirement.capabilityTier as 1 | 2 | 3,
                    mandatory: true,
                })),
            };
        }
    }
    return { localizationLevel: 'NONE', requirements: [] };
};

export const getPlatformAiLocalizationRequirements = (
    platform: PlatformState,
    plan: PlatformAiContentPlan,
    project: { id?: string; originalLanguageId?: string | null } | null | undefined,
): PlatformAiLocalizationRequirement[] => {
    const ai = platform.ai as Pick<PlatformAiRuntimeState, 'languageCapabilities'> | undefined;
    if (!ai || plan.localizationLevel === 'NONE') return [];
    if (plan.localizationRequirements?.length) return plan.localizationRequirements
        .filter(requirement => !requirement.sourceProjectId || requirement.sourceProjectId === project?.id)
        .map(requirement => {
        const support = resolvePlatformAiLocalizationModeSupport(ai, requirement.languageId, requirement.mode);
        return {
            languageId: requirement.languageId,
            mode: requirement.mode,
            countryIds: normalizeStreamingDayOneMarketIds(requirement.countryIds).sort(),
            capabilityTier: requirement.capabilityTierAtPromise,
            supported: support.supported && support.tier >= requirement.capabilityTierAtPromise,
            mandatory: requirement.mandatory,
        };
        });
    const originalLanguageId = normalizeStreamingLanguageId(project?.originalLanguageId || 'english');
    const byIdentity = new Map<string, PlatformAiLocalizationRequirement>();
    for (const countryId of normalizeStreamingDayOneMarketIds(plan.releaseCountryIds).sort()) {
        const country = getStreamingCountryMarketProfile(countryId);
        if (!country) continue;
        const languageIds = country.languageDistribution
            .filter(item => item.audiencePercent >= 20)
            .map(item => normalizeStreamingLanguageId(item.language))
            .filter(languageId => languageId && languageId !== originalLanguageId);
        for (const languageId of languageIds) {
            const mode: PlatformAiLocalizationMode = plan.localizationLevel === 'SUBTITLES'
                ? 'SUBTITLE'
                : country.localizationPreference === 'SUBTITLE_FIRST' ? 'SUBTITLE' : 'DUB';
            const support = resolvePlatformAiLocalizationModeSupport(ai, languageId, mode);
            const key = `${languageId}:${mode}`;
            const existing = byIdentity.get(key);
            byIdentity.set(key, {
                languageId,
                mode,
                countryIds: [...new Set([...(existing?.countryIds || []), countryId])].sort(),
                capabilityTier: support.tier,
                supported: support.supported,
                mandatory: true,
            });
        }
    }
    return Array.from(byIdentity.values()).sort((left, right) => (
        left.languageId.localeCompare(right.languageId) || left.mode.localeCompare(right.mode)
    ));
};

/** Generic Content Operations is infrastructure capacity only, not a subtitle/dub tier. */
export const getResearchBackedContentOperationsLevel = (researchQueue: PlatformAiResearchItem[]): number => Math.max(
    10,
    ...researchQueue.filter(item => item.branch === 'CONTENT_OPERATIONS' && item.stage === 'OPERATING').map(item => item.targetLevel),
);
