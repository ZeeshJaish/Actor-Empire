import type {
    Genre,
    PlatformAiLocalizationMode,
    PlatformAiRuntimeState,
    TargetAudience,
} from '../../types';
import { getStreamingCountryMarketProfile } from '../streamingDayOneMarkets';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';

export const normalizePlatformAiLanguageId = normalizeStreamingLanguageId;

export const getPlatformAiLanguageCapability = (
    ai: Pick<PlatformAiRuntimeState, 'languageCapabilities'>,
    languageId: unknown,
) => {
    const normalizedLanguageId = normalizePlatformAiLanguageId(languageId);
    return ai.languageCapabilities.find(item => item.languageId === normalizedLanguageId) ?? null;
};

export const resolvePlatformAiLocalizationModeSupport = (
    ai: Pick<PlatformAiRuntimeState, 'languageCapabilities'>,
    languageId: unknown,
    mode: PlatformAiLocalizationMode,
): { supported: boolean; languageId: string; tier: 0 | 1 | 2 | 3; reason: string } => {
    const normalizedLanguageId = normalizePlatformAiLanguageId(languageId);
    const capability = getPlatformAiLanguageCapability(ai, normalizedLanguageId);
    const tier = (mode === 'SUBTITLE' ? capability?.subtitleLevel : capability?.dubbingLevel) ?? 0;
    return {
        supported: tier > 0,
        languageId: normalizedLanguageId,
        tier,
        reason: tier > 0
            ? `${normalizedLanguageId} ${mode.toLowerCase()} operations are available at tier ${tier}.`
            : `${normalizedLanguageId} ${mode.toLowerCase()} operations have not been established.`,
    };
};

export interface PlatformAiTitleCountryComprehensionInput {
    ai: Pick<PlatformAiRuntimeState, 'languageCapabilities'>;
    originalLanguageId: string;
    countryId: string;
    targetAudience: TargetAudience;
    genre: Genre;
    assetLanguageId?: string | null;
    assetMode: PlatformAiLocalizationMode | null;
    localizationQuality?: number;
}

export interface PlatformAiTitleCountryComprehension {
    state: 'NATIVE_OR_COMPATIBLE' | 'DUBBED' | 'SUBTITLED' | 'UNLOCALIZED';
    languageId: string;
    reachMultiplier: number;
    appreciationMultiplier: number;
    completionMultiplier: number;
    localizationQuality: number;
    reason: string;
}

const bounded = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, value))
);
const rounded = (value: number): number => Math.round(value * 1_000) / 1_000;

export const resolvePlatformAiTitleCountryComprehension = (
    input: PlatformAiTitleCountryComprehensionInput,
): PlatformAiTitleCountryComprehension => {
    const country = getStreamingCountryMarketProfile(input.countryId);
    const countryLanguages = (country?.languageDistribution || []).map(item => ({
        languageId: normalizePlatformAiLanguageId(item.language),
        audiencePercent: item.audiencePercent,
    }));
    const primaryLanguageId = [...countryLanguages]
        .sort((left, right) => right.audiencePercent - left.audiencePercent || left.languageId.localeCompare(right.languageId))[0]
        ?.languageId || normalizePlatformAiLanguageId(input.assetLanguageId || input.originalLanguageId);
    const originalLanguageId = normalizePlatformAiLanguageId(input.originalLanguageId);
    if (countryLanguages.some(item => item.languageId === originalLanguageId)) {
        return {
            state: 'NATIVE_OR_COMPATIBLE',
            languageId: originalLanguageId,
            reachMultiplier: 1,
            appreciationMultiplier: 1,
            completionMultiplier: 1,
            localizationQuality: 100,
            reason: `${originalLanguageId} is understood directly in ${country?.country || input.countryId}.`,
        };
    }

    const languageId = normalizePlatformAiLanguageId(input.assetLanguageId || primaryLanguageId);
    const qualityInput = bounded(Number(input.localizationQuality) || 0, 0, 100);
    const familyAudience = input.targetAudience === 'G' || input.targetAudience === 'PG';
    const prestigeSubtitleAffinity = ['DRAMA', 'DOCUMENTARY', 'BIOPIC', 'HISTORICAL'].includes(input.genre);
    if (input.assetMode) {
        const support = resolvePlatformAiLocalizationModeSupport(input.ai, languageId, input.assetMode);
        if (support.supported) {
            const localizationQuality = qualityInput || Math.min(100, 58 + support.tier * 12);
            if (input.assetMode === 'DUB') {
                return {
                    state: 'DUBBED',
                    languageId,
                    reachMultiplier: rounded(bounded(0.82 + support.tier * 0.04, 0, 0.96)),
                    appreciationMultiplier: rounded(bounded(0.68 + localizationQuality * 0.0026 + support.tier * 0.02, 0, 1)),
                    completionMultiplier: rounded(bounded(0.78 + support.tier * 0.045 + localizationQuality * 0.001, 0, 1)),
                    localizationQuality,
                    reason: `${languageId} dubbing tier ${support.tier} carries the title into the market.`,
                };
            }
            return {
                state: 'SUBTITLED',
                languageId,
                reachMultiplier: rounded(bounded(0.60 + support.tier * 0.055 + (prestigeSubtitleAffinity ? 0.04 : 0) - (familyAudience ? 0.08 : 0), 0, 0.84)),
                appreciationMultiplier: rounded(bounded(0.76 + localizationQuality * 0.0015 + (prestigeSubtitleAffinity ? 0.035 : 0), 0, 0.98)),
                completionMultiplier: rounded(bounded(0.62 + support.tier * 0.045 + (prestigeSubtitleAffinity ? 0.06 : 0) - (familyAudience ? 0.12 : 0), 0, 0.9)),
                localizationQuality,
                reason: `${languageId} subtitles tier ${support.tier} preserve access with audience-specific friction.`,
            };
        }
    }
    return {
        state: 'UNLOCALIZED',
        languageId: primaryLanguageId,
        reachMultiplier: 0.18,
        appreciationMultiplier: 0.64,
        completionMultiplier: 0.42,
        localizationQuality: 0,
        reason: `No supported ${primaryLanguageId} localization asset exists for this title.`,
    };
};
