import type {
    OwnedStreamingLaunchMarketingDraft,
    PlatformAiLaunchMarketingCampaign,
    PlatformState,
    Player,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    forecastStreamingLaunchMarketing,
    getStreamingLaunchMarketingRecommendations,
    getStreamingLaunchMarketingWeeklySchedule,
    type StreamingLaunchMarketingInput,
} from '../streamingLaunchMarketing';
import { STREAMING_DAY_ONE_MARKETS } from '../streamingDayOneMarkets';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { normalizePlatformAiAudienceSettlements } from './platformAiState';

export interface PlatformAiLaunchMarketingPlanningInput {
    input: StreamingLaunchMarketingInput;
    riskTolerance: number;
    creativeCompetence: number;
    commercialCompetence: number;
    prestigeCompetence: number;
}

export const planPlatformAiLaunchMarketing = ({
    input,
    riskTolerance,
    creativeCompetence,
    commercialCompetence,
    prestigeCompetence,
}: PlatformAiLaunchMarketingPlanningInput) => {
    const recommendations = getStreamingLaunchMarketingRecommendations(input);
    const safeRisk = Math.max(0, Math.min(1, Number.isFinite(riskTolerance) ? riskTolerance : .5));
    const recommendedCeiling = safeRisk >= .78 ? recommendations.heavy
        : safeRisk >= .45 ? recommendations.balanced : recommendations.lean;
    const runwayCeiling = Math.max(0, input.availableTreasury - input.protectedOperatingCash);
    const objective = creativeCompetence >= commercialCompetence && creativeCompetence >= prestigeCompetence
        ? 'FLAGSHIP_ORIGINAL' as const
        : prestigeCompetence > commercialCompetence
            ? 'CATALOGUE_SHOWCASE' as const
            : 'VALUE_PROPOSITION' as const;
    const draft: OwnedStreamingLaunchMarketingDraft = {
        schemaVersion: 1,
        objective: objective === 'FLAGSHIP_ORIGINAL' && !input.hasFlagshipOriginal ? 'PLATFORM_INTRODUCTION' : objective,
        timeline: safeRisk >= .72 ? 'LAST_WEEK_PUSH' : safeRisk <= .32 ? 'FRONT_LOADED' : 'BALANCED',
        budgetCeiling: Math.min(recommendedCeiling, runwayCeiling),
        allocationMode: 'AUTO',
        countryWeights: {},
        channelAllocations: commercialCompetence >= creativeCompetence
            ? { SOCIAL_DIGITAL: .35, DEVICE_STORES: .2, TELCO_BUNDLES: .3, PRESS_EVENTS: .15 }
            : { SOCIAL_DIGITAL: .35, CREATORS: .3, TV_OUTDOOR: .2, PRESS_EVENTS: .15 },
        updatedAtAbsoluteWeek: input.absoluteWeek,
        revision: 1,
    };
    return {
        draft,
        recommendations,
        forecast: forecastStreamingLaunchMarketing(input, draft),
    };
};

export interface PreparePlatformAiLaunchMarketingWeekInput {
    player: Player;
    platform: PlatformState;
    absoluteWeek: number;
}

export interface PreparePlatformAiLaunchMarketingWeekResult {
    platform: PlatformState;
    changed: boolean;
    discretionaryCostMillions: number;
    coveredCountryIds: string[];
}

const toUnitIndex = (value: unknown, fallback: number): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(.01, Math.min(3, numeric > 3 ? numeric / 100 : numeric));
};

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;

const buildPlatformAiMarketingInput = (
    player: Player,
    platform: PlatformState,
    countryIds: string[],
    absoluteWeek: number,
): StreamingLaunchMarketingInput => {
    const ai = platform.ai!;
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const marketById = new Map(STREAMING_DAY_ONE_MARKETS.map(market => [market.id, market]));
    const marketAudienceTotal = countryIds.reduce((sum, countryId) => (
        sum + (marketById.get(countryId)?.streamingAudience || 1)
    ), 0) || countryIds.length;
    const releasedCatalogue = ai.slate.filter(plan => plan.status === 'RELEASED').length + ai.rightsContracts.length;
    const localizationDepth = ai.languageCapabilities.reduce((sum, capability) => (
        sum + capability.subtitleLevel + capability.dubbingLevel * 1.5
    ), 0);
    const recentOperatingCosts = ai.financeHistory.slice(-13).map(snapshot => snapshot.operatingCostMillions);
    const protectedOperatingMillions = (recentOperatingCosts.length
        ? recentOperatingCosts.reduce((sum, value) => sum + Math.max(0, value), 0) / recentOperatingCosts.length
        : profile.baseWeeklyOperationsMillions + countryIds.length * profile.regionWeeklyCostMillions) * 12;
    return {
        platformKey: platform.id,
        absoluteWeek,
        buildWeeks: Math.max(1, Math.min(15, profile.planningCadenceWeeks)),
        availableTreasury: Math.round(Math.max(0, platform.cashReserve) * 1_000_000),
        protectedOperatingCash: Math.round(Math.max(0, protectedOperatingMillions) * 1_000_000),
        hasSellablePlan: true,
        hasFlagshipOriginal: ai.slate.some(plan => plan.source === 'COMMISSIONED_ORIGINAL' && plan.status === 'RELEASED'),
        pricingRevision: ai.strategyCycle,
        catalogueRevision: releasedCatalogue,
        localizationRevision: localizationDepth,
        competitionRevision: ai.releaseMemory.length + ai.decisionHistory.length,
        countries: countryIds.flatMap(countryId => {
            const market = marketById.get(countryId);
            if (!market) return [];
            const population = player.world.worldPopulation?.countries?.[countryId];
            const audience = player.world.worldAudienceEconomy?.countries?.[countryId];
            const audienceShare = market.streamingAudience / marketAudienceTotal;
            const rivalPressure = market.rivals.reduce((sum, rival) => sum + rival.watchSharePercent, 0);
            const priorCampaign = ai.launchMarketingHistory
                .filter(campaign => campaign.countryIds.includes(countryId))
                .at(-1);
            return [{
                countryId,
                countryName: market.country,
                reachableHouseholds: Math.max(1, audience?.commercialHouseholds || population?.households || Math.round(market.streamingAudience / 2.4)),
                baseConcurrentStreams: Math.max(1, Math.round(platform.subscribers * 1_000_000 * .08 * audienceShare)),
                conversionHeadroom: Math.max(.08, Math.min(.9, 1 - rivalPressure / 140)),
                mediaCostIndex: market.launchDifficulty === 'HARD' ? 1.35 : market.launchDifficulty === 'EASY' ? .72 : 1,
                purchasingPowerIndex: toUnitIndex(population?.macro.purchasingPowerIndex, 1),
                consumerConfidence: toUnitIndex(population?.macro.consumerConfidence, .65),
                internetAccess: Math.max(.05, Math.min(1, (population?.reliableInternetPercent || 72) / 100)),
                localizationCoverage: Math.max(.08, Math.min(1, .25 + localizationDepth / Math.max(4, market.languages.length * 8))),
                catalogueCoverage: Math.max(.08, Math.min(1, releasedCatalogue / 24)),
                competitionPressure: market.competition === 'FIERCE' ? .88 : market.competition === 'BUSY' ? .68 : .45,
                priorAwareness: priorCampaign ? Math.min(.95, .03 + priorCampaign.awarenessLift) : .03,
            }];
        }),
        channelAvailability: {
            DEVICE_STORES: {
                available: (ai.capabilities.technologyLevels.PRODUCT_EXPERIENCE || 0) >= 1,
                efficiency: 1,
                reason: 'Requires Product Experience research.',
            },
            TELCO_BUNDLES: {
                available: (ai.capabilities.technologyLevels.ADVERTISING_COMMERCE || 0) >= 1,
                efficiency: 1,
                reason: 'Requires Advertising Commerce research.',
            },
        },
    };
};

export const preparePlatformAiLaunchMarketingWeek = ({
    player,
    platform,
    absoluteWeek,
}: PreparePlatformAiLaunchMarketingWeekInput): PreparePlatformAiLaunchMarketingWeekResult => {
    const ai = platform.ai;
    if (!ai || ai.status !== 'ACTIVE') {
        return { platform, changed: false, discretionaryCostMillions: 0, coveredCountryIds: [] };
    }
    const activeCountryIds = [...new Set([
        ...ai.capabilities.activeCountryIds,
        ...ai.marketOperations
            .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
            .map(operation => operation.countryId!),
    ])].sort();
    const previouslyCovered = new Set(ai.launchMarketingHistory.flatMap(campaign => campaign.countryIds));
    const uncoveredCountryIds = activeCountryIds.filter(countryId => !previouslyCovered.has(countryId));
    let history = ai.launchMarketingHistory.map(campaign => ({ ...campaign }));

    if (uncoveredCountryIds.length) {
        const marketingInput = buildPlatformAiMarketingInput(player, platform, uncoveredCountryIds, absoluteWeek);
        if (marketingInput.countries.length) {
            const profile = PLATFORM_AI_PROFILES[platform.id];
            const planned = planPlatformAiLaunchMarketing({
                input: marketingInput,
                riskTolerance: profile.riskTolerance,
                creativeCompetence: ai.competence.creative,
                commercialCompetence: ai.competence.commercial,
                prestigeCompetence: ai.competence.prestige,
            });
            if (planned.draft.budgetCeiling > 0) {
                const weeklyScheduleMillions = getStreamingLaunchMarketingWeeklySchedule(
                    planned.draft.budgetCeiling,
                    planned.draft.timeline,
                    marketingInput.buildWeeks,
                ).map(value => roundMillions(value / 1_000_000));
                history = [...history, {
                    id: createDeterministicId('platform_ai_launch_marketing', platform.id, absoluteWeek, uncoveredCountryIds.join(',')),
                    absoluteWeek,
                    countryIds: [...uncoveredCountryIds],
                    objective: planned.draft.objective,
                    timeline: planned.draft.timeline,
                    budgetCeilingMillions: roundMillions(planned.draft.budgetCeiling / 1_000_000),
                    weeklyScheduleMillions,
                    accruedSpendMillions: 0,
                    lastProcessedAbsoluteWeek: null,
                    status: 'ACTIVE',
                    likelyPaidAccounts: planned.forecast.acquiredAccounts.likely,
                    likelyConcurrentStreams: planned.forecast.concurrentStreams.likely,
                    awarenessLift: planned.forecast.likelyAwarenessLift,
                    forecastSignature: planned.forecast.signature,
                } satisfies PlatformAiLaunchMarketingCampaign];
            }
        }
    }

    let discretionaryCostMillions = 0;
    let progressed = false;
    const pendingAudienceSettlements = [...ai.pendingAudienceSettlements];
    history = history.map(campaign => {
        if (campaign.status === 'COMPLETE' || campaign.lastProcessedAbsoluteWeek === absoluteWeek) return campaign;
        const scheduleIndex = absoluteWeek - campaign.absoluteWeek;
        if (scheduleIndex < 0) return campaign;
        if (scheduleIndex >= campaign.weeklyScheduleMillions.length) {
            progressed = true;
            return { ...campaign, status: 'COMPLETE' as const, lastProcessedAbsoluteWeek: absoluteWeek };
        }
        const currentSpend = roundMillions(campaign.weeklyScheduleMillions[scheduleIndex] || 0);
        discretionaryCostMillions = roundMillions(discretionaryCostMillions + currentSpend);
        progressed = true;
        const budgetShare = campaign.budgetCeilingMillions > 0
            ? Math.max(0, Math.min(1, currentSpend / campaign.budgetCeilingMillions)) : 0;
        const acquiredSubscribersMillions = roundMillions(campaign.likelyPaidAccounts * budgetShare / 1_000_000);
        const audienceSettlementId = createDeterministicId(
            'platform_ai_marketing_audience',
            platform.id,
            campaign.id,
            absoluteWeek,
        );
        if (acquiredSubscribersMillions > 0 && !pendingAudienceSettlements.some(item => item.id === audienceSettlementId)) {
            pendingAudienceSettlements.push({
                id: audienceSettlementId,
                streamingWindowId: campaign.id,
                projectId: campaign.id,
                planId: campaign.id,
                subscriberImpactMillions: acquiredSubscribersMillions,
                acquiredSubscribersMillions,
                retainedSubscribersMillions: 0,
                churnedSubscribersMillions: 0,
                engagementIndexDelta: Math.round(campaign.awarenessLift * budgetShare * 1_000) / 100,
                catalogueStrengthDelta: 0,
                status: 'PENDING',
                createdAtAbsoluteWeek: absoluteWeek,
                settledAtAbsoluteWeek: null,
            });
        }
        const accruedSpendMillions = roundMillions(campaign.accruedSpendMillions + currentSpend);
        return {
            ...campaign,
            accruedSpendMillions,
            lastProcessedAbsoluteWeek: absoluteWeek,
            status: scheduleIndex >= campaign.weeklyScheduleMillions.length - 1 ? 'COMPLETE' as const : 'ACTIVE' as const,
        };
    });
    const coveredCountryIds = [...new Set(history.flatMap(campaign => campaign.countryIds))].sort();
    if (!progressed) return { platform, changed: false, discretionaryCostMillions: 0, coveredCountryIds };
    return {
        platform: {
            ...platform,
            ai: {
                ...ai,
                launchMarketingHistory: history,
                pendingAudienceSettlements: normalizePlatformAiAudienceSettlements(pendingAudienceSettlements),
            },
        },
        changed: true,
        discretionaryCostMillions,
        coveredCountryIds,
    };
};
