import type {
    OwnedStreamingLaunchMarketingDraft,
    StreamingLaunchMarketingChannelId,
    StreamingLaunchMarketingForecastSnapshot,
    StreamingLaunchMarketingObjective,
    StreamingLaunchMarketingTimeline,
    StreamingLaunchMarketingWarningCode,
} from '../types';

export interface StreamingLaunchMarketingCountryInput {
    countryId: string;
    countryName: string;
    reachableHouseholds: number;
    baseConcurrentStreams: number;
    conversionHeadroom: number;
    mediaCostIndex: number;
    purchasingPowerIndex: number;
    consumerConfidence: number;
    internetAccess: number;
    localizationCoverage: number;
    catalogueCoverage: number;
    competitionPressure: number;
    priorAwareness: number;
}

export interface StreamingLaunchMarketingInput {
    platformKey: string;
    absoluteWeek: number;
    buildWeeks: number;
    availableTreasury: number;
    protectedOperatingCash: number;
    hasSellablePlan: boolean;
    hasFlagshipOriginal: boolean;
    pricingRevision: number;
    catalogueRevision: number;
    localizationRevision: number;
    competitionRevision: number;
    countries: StreamingLaunchMarketingCountryInput[];
    channelAvailability?: Partial<Record<StreamingLaunchMarketingChannelId, {
        available: boolean;
        efficiency: number;
        reason?: string;
    }>>;
}

export interface StreamingLaunchMarketingRecommendations {
    lean: number;
    balanced: number;
    heavy: number;
    event: number;
}

export interface StreamingLaunchMarketingChannelDefinition {
    id: StreamingLaunchMarketingChannelId;
    label: string;
    line: string;
    objectiveFit: Record<StreamingLaunchMarketingObjective, number>;
}

export const STREAMING_LAUNCH_MARKETING_CHANNELS: StreamingLaunchMarketingChannelDefinition[] = [
    { id: 'SOCIAL_DIGITAL', label: 'Social & digital', line: 'Targetable reach and rapid creative testing.', objectiveFit: { PLATFORM_INTRODUCTION: 1.08, CATALOGUE_SHOWCASE: 1.05, FLAGSHIP_ORIGINAL: 1.08, VALUE_PROPOSITION: 1.04 } },
    { id: 'CREATORS', label: 'Creators', line: 'Trusted voices turn awareness into trial.', objectiveFit: { PLATFORM_INTRODUCTION: 1.02, CATALOGUE_SHOWCASE: 1.08, FLAGSHIP_ORIGINAL: 1.12, VALUE_PROPOSITION: .96 } },
    { id: 'TV_OUTDOOR', label: 'TV & outdoor', line: 'Broad reach with high local media costs.', objectiveFit: { PLATFORM_INTRODUCTION: 1.12, CATALOGUE_SHOWCASE: 1.02, FLAGSHIP_ORIGINAL: 1.1, VALUE_PROPOSITION: .92 } },
    { id: 'DEVICE_STORES', label: 'Device & app stores', line: 'Meets viewers where they install and watch.', objectiveFit: { PLATFORM_INTRODUCTION: 1.02, CATALOGUE_SHOWCASE: .98, FLAGSHIP_ORIGINAL: .94, VALUE_PROPOSITION: 1.08 } },
    { id: 'TELCO_BUNDLES', label: 'Telco & bundles', line: 'Distribution and value in one agreement.', objectiveFit: { PLATFORM_INTRODUCTION: .98, CATALOGUE_SHOWCASE: .96, FLAGSHIP_ORIGINAL: .9, VALUE_PROPOSITION: 1.16 } },
    { id: 'PRESS_EVENTS', label: 'Press & events', line: 'Earned attention around the opening moment.', objectiveFit: { PLATFORM_INTRODUCTION: 1.04, CATALOGUE_SHOWCASE: 1, FLAGSHIP_ORIGINAL: 1.14, VALUE_PROPOSITION: .9 } },
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;
const safeMoney = (value: number): number => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(value) ? value : 0)));
const confidenceBand = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' => score >= 78 ? 'HIGH' : score >= 56 ? 'MEDIUM' : 'LOW';

const timelineProfile = (timeline: StreamingLaunchMarketingTimeline): { response: number; certainty: number } => {
    if (timeline === 'FRONT_LOADED') return { response: .92, certainty: .84 };
    if (timeline === 'LAST_WEEK_PUSH') return { response: 1.06, certainty: .7 };
    return { response: 1, certainty: 1 };
};

const hash = (value: string): string => {
    let current = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        current ^= value.charCodeAt(index);
        current = Math.imul(current, 16777619);
    }
    return (current >>> 0).toString(36);
};

const minimumPresence = (country: StreamingLaunchMarketingCountryInput): number => safeMoney(
    180_000 * clamp(country.mediaCostIndex, .35, 4) * (.65 + Math.log10(Math.max(10, country.reachableHouseholds)) / 10),
);

const countryOpportunity = (country: StreamingLaunchMarketingCountryInput): number => {
    const scale = Math.log10(Math.max(10, country.reachableHouseholds));
    return Math.max(.0001,
        scale
        * clamp(country.conversionHeadroom, 0, 1)
        * clamp(country.purchasingPowerIndex, .25, 2)
        * clamp(country.consumerConfidence, .2, 1)
        * clamp(country.internetAccess, .2, 1)
        * clamp(country.localizationCoverage, 0, 1)
        * clamp(country.catalogueCoverage, 0, 1)
        * (1.2 - clamp(country.competitionPressure, 0, 1) * .55)
        / clamp(country.mediaCostIndex, .25, 5),
    );
};

export const getStreamingLaunchMarketingRecommendations = (
    input: StreamingLaunchMarketingInput,
): StreamingLaunchMarketingRecommendations => {
    const countries = [...input.countries].sort((left, right) => left.countryId.localeCompare(right.countryId));
    if (!countries.length) return { lean: 0, balanced: 0, heavy: 0, event: 0 };
    const lean = countries.reduce((sum, country) => sum + minimumPresence(country), 0);
    const opportunity = countries.reduce((sum, country) => (
        sum + Math.sqrt(Math.max(0, country.reachableHouseholds)) * clamp(country.mediaCostIndex, .35, 4) * 125
    ), 0);
    const balanced = Math.max(lean + countries.length * 100_000, safeMoney(lean + opportunity * .62));
    const heavy = Math.max(balanced + 1, safeMoney(balanced * 1.75));
    const event = Math.max(heavy + 1, safeMoney(balanced * 2.8));
    return { lean: safeMoney(lean), balanced, heavy, event };
};

const allocateIntegerMoney = (total: number, weightedIds: Array<{ id: string; weight: number }>): Map<string, number> => {
    const budget = safeMoney(total);
    const positive = weightedIds.filter(item => item.weight > 0).sort((left, right) => left.id.localeCompare(right.id));
    const weightTotal = positive.reduce((sum, item) => sum + item.weight, 0);
    if (!budget || !weightTotal) return new Map(positive.map(item => [item.id, 0]));
    const rows = positive.map(item => {
        const exact = budget * item.weight / weightTotal;
        return { ...item, amount: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let unallocated = budget - rows.reduce((sum, row) => sum + row.amount, 0);
    rows.sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id));
    for (const row of rows) {
        if (unallocated <= 0) break;
        row.amount += 1;
        unallocated -= 1;
    }
    return new Map(rows.map(row => [row.id, row.amount]));
};

const channelEfficiency = (
    input: StreamingLaunchMarketingInput,
    draft: OwnedStreamingLaunchMarketingDraft,
    warnings: Set<StreamingLaunchMarketingWarningCode>,
): number => {
    const configured = STREAMING_LAUNCH_MARKETING_CHANNELS.map(channel => {
        const requested = Math.max(0, draft.channelAllocations[channel.id] ?? 0);
        const availability = input.channelAvailability?.[channel.id];
        if (requested > 0 && availability?.available === false) warnings.add('LOCKED_CHANNEL');
        return {
            requested,
            available: availability?.available !== false,
            efficiency: clamp(availability?.efficiency ?? 1, 0, 2) * channel.objectiveFit[draft.objective],
        };
    }).filter(channel => channel.requested > 0 && channel.available);
    const usable = configured.length ? configured : STREAMING_LAUNCH_MARKETING_CHANNELS.slice(0, 2).map(channel => ({
        requested: 1,
        available: true,
        efficiency: channel.objectiveFit[draft.objective],
    }));
    const total = usable.reduce((sum, channel) => sum + channel.requested, 0) || 1;
    return usable.reduce((sum, channel) => sum + channel.requested / total * channel.efficiency, 0);
};

export const getStreamingLaunchMarketingSignature = (
    input: StreamingLaunchMarketingInput,
    draft: OwnedStreamingLaunchMarketingDraft,
): string => {
    const stable = {
        platformKey: input.platformKey,
        buildWeeks: input.buildWeeks,
        pricingRevision: input.pricingRevision,
        catalogueRevision: input.catalogueRevision,
        localizationRevision: input.localizationRevision,
        competitionRevision: input.competitionRevision,
        countries: [...input.countries].sort((a, b) => a.countryId.localeCompare(b.countryId)),
        draft: {
            objective: draft.objective,
            timeline: draft.timeline,
            budgetCeiling: safeMoney(draft.budgetCeiling),
            allocationMode: draft.allocationMode,
            countryWeights: Object.fromEntries(Object.entries(draft.countryWeights).sort()),
            channelAllocations: Object.fromEntries(Object.entries(draft.channelAllocations).sort()),
            revision: draft.revision,
        },
    };
    return `launch-marketing-v1:${hash(JSON.stringify(stable))}`;
};

export const forecastStreamingLaunchMarketing = (
    input: StreamingLaunchMarketingInput,
    draft: OwnedStreamingLaunchMarketingDraft,
): StreamingLaunchMarketingForecastSnapshot => {
    const warnings = new Set<StreamingLaunchMarketingWarningCode>();
    const countries = [...input.countries].sort((left, right) => left.countryId.localeCompare(right.countryId));
    if (!countries.length) warnings.add('NO_OPENING_COUNTRIES');
    if (!input.hasSellablePlan) warnings.add('NO_SELLABLE_PLAN');
    if (draft.objective === 'FLAGSHIP_ORIGINAL' && !input.hasFlagshipOriginal) warnings.add('MISSING_FLAGSHIP_ORIGINAL');
    if (draft.budgetCeiling > Math.max(0, input.availableTreasury - input.protectedOperatingCash)) warnings.add('BUDGET_SHORTFALL');
    const activeIds = new Set(countries.map(country => country.countryId));
    if (draft.allocationMode === 'MANUAL' && Object.keys(draft.countryWeights).some(id => !activeIds.has(id))) {
        warnings.add('MANUAL_ALLOCATION_REVIEW');
    }

    const budget = countries.length && input.hasSellablePlan ? safeMoney(draft.budgetCeiling) : 0;
    const minimumTotal = countries.reduce((sum, country) => sum + minimumPresence(country), 0);
    if (budget > 0 && budget < minimumTotal) warnings.add('INSUFFICIENT_MARKET_COVERAGE');
    const weighted = countries.map(country => ({
        id: country.countryId,
        weight: draft.allocationMode === 'MANUAL'
            ? Math.max(0, draft.countryWeights[country.countryId] ?? 0)
            : countryOpportunity(country),
    }));
    if (draft.allocationMode === 'MANUAL' && !weighted.some(row => row.weight > 0)) {
        weighted.forEach(row => { row.weight = 1; });
        warnings.add('MANUAL_ALLOCATION_REVIEW');
    }
    const allocations = allocateIntegerMoney(budget, weighted);
    const channels = channelEfficiency(input, draft, warnings);
    const objectivePenalty = draft.objective === 'FLAGSHIP_ORIGINAL' && !input.hasFlagshipOriginal ? .35 : 1;
    const timeline = timelineProfile(draft.timeline);

    const countryForecastDetails = countries.map(country => {
        const allocatedAmount = allocations.get(country.countryId) || 0;
        const organicAwareness = clamp(country.priorAwareness + .012 * country.catalogueCoverage * country.localizationCoverage, 0, .72);
        const marketFit = clamp(
            country.conversionHeadroom
            * country.internetAccess
            * country.localizationCoverage
            * country.catalogueCoverage
            * (1.1 - country.competitionPressure * .5),
            .03,
            1.1,
        );
        const halfSaturationCost = Math.max(1, minimumPresence(country) * 8);
        const maximumPaidLift = clamp(.34 * marketFit * objectivePenalty, 0, .42);
        const likelyAwarenessLift = allocatedAmount > 0
            ? maximumPaidLift * (1 - Math.exp(-(allocatedAmount * channels * timeline.response) / halfSaturationCost))
            : 0;
        const paidAccountHeadroom = Math.max(0, country.reachableHouseholds * country.conversionHeadroom);
        const likelyAcquiredAccounts = Math.floor(paidAccountHeadroom * likelyAwarenessLift * (.12 + .08 * country.purchasingPowerIndex));
        const likelyConcurrentStreams = Math.floor(country.baseConcurrentStreams + likelyAcquiredAccounts * .085);
        const readiness = (
            clamp(country.internetAccess, 0, 1) * .28
            + clamp(country.localizationCoverage, 0, 1) * .27
            + clamp(country.catalogueCoverage, 0, 1) * .27
            + clamp(country.consumerConfidence, 0, 1) * .18
        );
        const presenceCost = Math.max(1, minimumPresence(country));
        const coverageSignal = allocatedAmount > 0
            ? clamp(
                clamp(allocatedAmount / presenceCost, 0, 1) * .45
                + (1 - Math.exp(-allocatedAmount / (presenceCost * 4))) * .55,
                0,
                1,
            )
            : 0;
        const executionSignal = clamp(clamp(channels / 1.12, .2, 1) * .65 + timeline.certainty * .35, 0, 1);
        let confidenceRatio = readiness * .6 + coverageSignal * .25 + executionSignal * .15;
        if (!input.hasSellablePlan) confidenceRatio *= .45;
        if (draft.objective === 'FLAGSHIP_ORIGINAL' && !input.hasFlagshipOriginal) confidenceRatio *= .65;
        if (draft.budgetCeiling > Math.max(0, input.availableTreasury - input.protectedOperatingCash)) confidenceRatio *= .72;
        const confidenceScore = Math.round(clamp(confidenceRatio, 0, 1) * 100);
        return {
            forecast: {
                countryId: country.countryId,
                countryName: country.countryName,
                allocatedAmount,
                organicAwareness: round4(organicAwareness),
                likelyAwarenessLift: round4(likelyAwarenessLift),
                likelyAcquiredAccounts,
                likelyConcurrentStreams,
                customerAcquisitionCost: likelyAcquiredAccounts > 0 ? Math.round(allocatedAmount / likelyAcquiredAccounts * 100) / 100 : null,
                confidenceScore,
                confidence: confidenceBand(confidenceScore),
            },
            maximumPaidLift,
            reachableHouseholds: Math.max(0, country.reachableHouseholds),
        };
    });
    const countryForecasts = countryForecastDetails.map(detail => detail.forecast);
    const acquiredLikely = countryForecasts.reduce((sum, country) => sum + country.likelyAcquiredAccounts, 0);
    const concurrentLikely = countryForecasts.reduce((sum, country) => sum + country.likelyConcurrentStreams, 0);
    const baselineConcurrentStreams = countries.reduce((sum, country) => sum + Math.max(0, Math.floor(country.baseConcurrentStreams)), 0);
    const organicAwareness = countries.length
        ? countryForecasts.reduce((sum, country, index) => sum + country.organicAwareness * countries[index].reachableHouseholds, 0)
            / countries.reduce((sum, country) => sum + country.reachableHouseholds, 0)
        : 0;
    const likelyAwarenessLift = countries.length
        ? countryForecasts.reduce((sum, country, index) => sum + country.likelyAwarenessLift * countries[index].reachableHouseholds, 0)
            / countries.reduce((sum, country) => sum + country.reachableHouseholds, 0)
        : 0;
    const confidenceWeight = countries.reduce((sum, country) => sum + Math.max(0, country.reachableHouseholds), 0);
    const confidenceScore = confidenceWeight > 0
        ? Math.round(countryForecasts.reduce((sum, country, index) => (
            sum + country.confidenceScore * Math.max(0, countries[index].reachableHouseholds)
        ), 0) / confidenceWeight)
        : 0;
    const confidence = confidenceBand(confidenceScore);
    const usefulReachCeiling = countryForecastDetails.reduce((sum, detail) => (
        sum + detail.maximumPaidLift * detail.reachableHouseholds
    ), 0);
    const usefulReachCaptured = countryForecastDetails.reduce((sum, detail) => (
        sum + detail.forecast.likelyAwarenessLift * detail.reachableHouseholds
    ), 0);
    const saturationPercent = usefulReachCeiling > 0
        ? Math.round(clamp(usefulReachCaptured / usefulReachCeiling, 0, 1) * 100)
        : 0;
    const efficiencyStatus = budget <= 0 ? 'ORGANIC'
        : saturationPercent >= 95 ? 'SATURATED'
            : saturationPercent >= 75 ? 'DIMINISHING'
                : 'EFFICIENT';
    const signature = getStreamingLaunchMarketingSignature(input, draft);
    return {
        id: `marketing-forecast:${input.platformKey}:${hash(signature)}`,
        version: 1,
        signature,
        effectiveBudget: budget,
        organicAwareness: round4(organicAwareness),
        likelyAwarenessLift: round4(likelyAwarenessLift),
        baselineConcurrentStreams,
        saturationPercent,
        efficiencyStatus,
        acquiredAccounts: {
            low: Math.floor(acquiredLikely * .72),
            likely: acquiredLikely,
            high: Math.ceil(acquiredLikely * 1.28),
        },
        concurrentStreams: {
            low: Math.floor(concurrentLikely * .78),
            likely: concurrentLikely,
            high: Math.ceil(concurrentLikely * 1.32),
        },
        customerAcquisitionCost: acquiredLikely > 0 ? Math.round(budget / acquiredLikely * 100) / 100 : null,
        confidenceScore,
        confidence,
        countryForecasts,
        warnings: Array.from(warnings).sort(),
    };
};

export const getStreamingLaunchMarketingWeeklySchedule = (
    budgetCeiling: number,
    timeline: StreamingLaunchMarketingTimeline,
    buildWeeks: number,
): number[] => {
    const weeks = Math.max(1, Math.min(15, Math.round(buildWeeks) || 1));
    const weights = Array.from({ length: weeks }, (_, index) => {
        const progress = weeks === 1 ? 1 : index / (weeks - 1);
        if (timeline === 'FRONT_LOADED') return 1.8 - progress * 1.2;
        if (timeline === 'LAST_WEEK_PUSH') return .45 + progress * 1.55;
        return 1;
    });
    const allocated = allocateIntegerMoney(budgetCeiling, weights.map((weight, index) => ({ id: String(index).padStart(2, '0'), weight })));
    return weights.map((_, index) => allocated.get(String(index).padStart(2, '0')) || 0);
};
