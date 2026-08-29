import type {
    OwnedStreamingCapabilityPortfolio,
    OwnedStreamingCostCommitment,
    OwnedStreamingInstalledCapability,
    OwnedStreamingLaunchProgramState,
    OwnedStreamingLegacyLocalizationGrant,
    OwnedStreamingLocalizationFacility,
    OwnedStreamingLocalizationJob,
    OwnedStreamingLocalizationOperationsState,
    OwnedStreamingLocalizationProvider,
    OwnedStreamingMarketCostBreakdown,
    OwnedStreamingCountryMarketProfile,
    OwnedStreamingMarketClearanceState,
    OwnedStreamingMarketOperation,
    OwnedStreamingMarketPolicySnapshot,
    OwnedStreamingServiceConfiguration,
    OwnedStreamingPricingConfiguration,
    OwnedStreamingTitleLanguageAsset,
    StreamingCostCommitmentCategory,
    StreamingCostCommitmentStatus,
    StreamingDefineLaunchStepId,
    StreamingBuildLaunchStepId,
    StreamingIdentPackageId,
    StreamingLaunchProgramStatus,
    StreamingMarketEntryKind,
    StreamingMarketOperationScope,
    StreamingMarketOperationSource,
    StreamingMarketOperationStatus,
    StreamingMarketClearanceOutcome,
    StreamingMarketClearanceStage,
    StreamingMarketLocalizationPreference,
    StreamingMarketPolicyClimate,
    StreamingMarketPrivacyComplianceLevel,
    StreamingMarketRightsAvailability,
    StreamingOriginalLocalizationPackage,
    StreamingServiceConfigurationSource,
    StreamingRevenueStreamId,
    StreamingSoundIdentKey,
    StreamingTechnologyBranch,
} from '../types';
import {
    getStreamingDayOneMarket,
    getStreamingCountryMarketProfile,
    getStreamingMarketEntryProfile,
    normalizeStreamingDayOneMarketIds,
} from './streamingDayOneMarkets';
import { normalizeStreamingStorefrontLayoutId } from './streamingStorefront';
import { normalizeStreamingLanguageId } from './streamingLocalizationCapabilities';

type UnknownRecord = Record<string, unknown>;

const TECHNOLOGY_BRANCHES: StreamingTechnologyBranch[] = [
    'DELIVERY_CAPACITY',
    'PLAYBACK_QUALITY',
    'RELIABILITY',
    'DATA_RECOMMENDATIONS',
    'SECURITY',
    'CONTENT_OPERATIONS',
    'ADVERTISING_COMMERCE',
    'PRODUCT_EXPERIENCE',
];
const SOUND_IDENT_KEYS: StreamingSoundIdentKey[] = [
    'PULSE', 'ASCENT', 'PREMIERE', 'SILENT', 'CHOIR', 'MACHINE',
    'SPARK', 'IMPACT', 'ORBIT', 'BLOOM', 'PRISM', 'EMBER', 'SIGNAL', 'HORIZON', 'ANALOG',
];
const LAUNCH_PROGRAM_STATUSES: StreamingLaunchProgramStatus[] = ['NOT_STARTED', 'PLANNING', 'READY', 'LAUNCHED'];
const MARKET_SCOPES: StreamingMarketOperationScope[] = ['COUNTRY', 'LEGACY_REGION'];
const MARKET_ENTRY_KINDS: StreamingMarketEntryKind[] = ['OPENING', 'EXPANSION', 'LEGACY_REGION_ACCESS'];
const MARKET_STATUSES: StreamingMarketOperationStatus[] = [
    'NOT_ENTERED', 'EVALUATING', 'PLANNED', 'AWAITING_FUNDING', 'CLEARANCE', 'INFRASTRUCTURE_PREPARATION',
    'READY', 'ACTIVE', 'SUSPENDED', 'EXITED',
];
const MARKET_SOURCES: StreamingMarketOperationSource[] = ['PLAYER_ACTION', 'LEGACY_DAY_ONE', 'LEGACY_REGIONAL'];
const MARKET_CLEARANCE_STAGES: StreamingMarketClearanceStage[] = [
    'APPLICATION_FILED', 'RIGHTS_VERIFICATION', 'REGULATORY_REVIEW', 'CONSUMER_DATA_COMPLIANCE', 'FINAL_APPROVAL',
];
const MARKET_CLEARANCE_OUTCOMES: StreamingMarketClearanceOutcome[] = [
    'PENDING', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'DELAYED', 'ADDITIONAL_REQUIREMENT', 'TEMPORARILY_REJECTED',
];
const MARKET_LOCALIZATION_PREFERENCES: StreamingMarketLocalizationPreference[] = ['ORIGINAL_AUDIO', 'SUBTITLE_FIRST', 'DUB_FIRST', 'MIXED'];
const MARKET_RIGHTS_AVAILABILITY: StreamingMarketRightsAvailability[] = ['OPEN', 'LIMITED', 'TIGHT'];
const MARKET_POLICY_CLIMATES: StreamingMarketPolicyClimate[] = ['OPEN', 'BALANCED', 'PROTECTIVE'];
const MARKET_PRIVACY_LEVELS: StreamingMarketPrivacyComplianceLevel[] = ['STANDARD', 'ENHANCED', 'STRICT'];
const SERVICE_SOURCES: StreamingServiceConfigurationSource[] = ['UNCONFIGURED', 'PLAYER_ACTION', 'LEGACY_FOUNDING'];
const IDENT_PACKAGES: StreamingIdentPackageId[] = ['STANDARD', 'FULL', 'CINEMATIC', 'GENRE', 'ADAPTIVE', 'LIVING'];
const LOCALIZATION_PACKAGES: StreamingOriginalLocalizationPackage[] = ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'];
const COMMITMENT_CATEGORIES: StreamingCostCommitmentCategory[] = [
    'MARKET', 'SERVICE', 'TECHNOLOGY', 'LOCALIZATION', 'NETWORK', 'CONTENT', 'OTHER',
];
const COMMITMENT_STATUSES: StreamingCostCommitmentStatus[] = [
    'PLANNED', 'COMMITTED', 'PAID', 'CANCELLED', 'REFUNDED', 'MIGRATED',
];
const REVENUE_STREAMS: StreamingRevenueStreamId[] = ['subs', 'ads', 'rentals', 'premium', 'daypass', 'sponsor', 'metered', 'patron'];
const DEFINE_STEPS: StreamingDefineLaunchStepId[] = [
    'FUND', 'MARKETS', 'CLEARANCE', 'IDENTITY', 'STOREFRONT', 'CATALOGUE', 'PRICING', 'BLUEPRINT',
];
const BUILD_STEPS: StreamingBuildLaunchStepId[] = [
    'BLUEPRINT', 'FACILITIES', 'RACKS', 'CAPACITY', 'COMMISSIONING', 'REHEARSAL',
];

const asRecord = (value: unknown): UnknownRecord => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
);
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = '', max = 160): string => {
    const next = typeof value === 'string' ? value.trim() : '';
    return (next || fallback).slice(0, max);
};
const number = (value: unknown, fallback = 0, max = Number.MAX_SAFE_INTEGER): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.round(parsed))) : fallback;
};
const decimal = (value: unknown, fallback = 0, max = Number.MAX_SAFE_INTEGER): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : fallback;
};
const nullableWeek = (value: unknown): number | null => (
    value === null || value === undefined || value === '' ? null : number(value)
);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (
    allowed.includes(value as T) ? value as T : fallback
);
const stringList = (value: unknown, limit = 80): string[] => Array.from(new Set(
    asArray(value).map(item => text(item, '', 100)).filter(Boolean),
)).slice(0, limit);

const emptyCosts = (): OwnedStreamingMarketCostBreakdown => ({
    rights: 0,
    compliance: 0,
    localization: 0,
    infrastructure: 0,
    other: 0,
    total: 0,
});

const normalizeCosts = (value: unknown): OwnedStreamingMarketCostBreakdown => {
    const source = asRecord(value);
    const costs = {
        rights: number(source.rights),
        compliance: number(source.compliance),
        localization: number(source.localization),
        infrastructure: number(source.infrastructure),
        other: number(source.other),
    };
    return { ...costs, total: Object.values(costs).reduce((sum, amount) => sum + amount, 0) };
};

const normalizePolicy = (value: unknown): OwnedStreamingMarketPolicySnapshot | null => {
    const source = asRecord(value);
    if (!Object.keys(source).length) return null;
    return {
        effectiveTaxPercent: decimal(source.effectiveTaxPercent, 0, 100),
        streamingLevyPercent: decimal(source.streamingLevyPercent, 0, 100),
        localContentObligationPercent: decimal(source.localContentObligationPercent, 0, 100),
        privacyComplianceLevel: oneOf(source.privacyComplianceLevel, MARKET_PRIVACY_LEVELS, 'STANDARD'),
        policyClimate: oneOf(source.policyClimate, MARKET_POLICY_CLIMATES, 'BALANCED'),
        revision: number(source.revision, 0, 10_000),
        nextElectionAtAbsoluteWeek: number(source.nextElectionAtAbsoluteWeek),
        capturedAtAbsoluteWeek: number(source.capturedAtAbsoluteWeek),
    };
};

const normalizeCountryProfile = (value: unknown, countryId: string): OwnedStreamingCountryMarketProfile | null => {
    const fallback = getStreamingCountryMarketProfile(countryId);
    if (!fallback) return null;
    const source = asRecord(value);
    const entryCosts = Object.keys(asRecord(source.entryCosts)).length ? normalizeCosts(source.entryCosts) : fallback.entryCosts;
    const approval = asRecord(source.approvalPeriodWeeks);
    const network = asRecord(source.recommendedNetworkFootprint);
    const savedLanguages = asArray(source.languageDistribution).flatMap(item => {
        const row = asRecord(item);
        const language = text(row.language, '', 60);
        return language ? [{ language, audiencePercent: decimal(row.audiencePercent, 0, 100) }] : [];
    });
    const savedCompetitors = asArray(source.competitors).flatMap(item => {
        const row = asRecord(item);
        const id = text(row.id, '', 60);
        const name = text(row.name, '', 80);
        return id && name ? [{ id, name, watchSharePercent: decimal(row.watchSharePercent, 0, 100) }] : [];
    });
    return {
        countryId: text(source.countryId, fallback.countryId, 12).toUpperCase(),
        country: text(source.country, fallback.country, 80),
        regionId: text(source.regionId, fallback.regionId, 60).toUpperCase(),
        audienceSize: number(source.audienceSize, fallback.audienceSize),
        annualGrowthPercent: decimal(source.annualGrowthPercent, fallback.annualGrowthPercent, 100),
        languageDistribution: savedLanguages.length ? savedLanguages : fallback.languageDistribution,
        localizationPreference: oneOf(source.localizationPreference, MARKET_LOCALIZATION_PREFERENCES, fallback.localizationPreference),
        competitors: savedCompetitors.length ? savedCompetitors : fallback.competitors,
        rightsAvailability: oneOf(source.rightsAvailability, MARKET_RIGHTS_AVAILABILITY, fallback.rightsAvailability),
        entryCosts,
        approvalPeriodWeeks: {
            minimum: number(approval.minimum, fallback.approvalPeriodWeeks.minimum, 12),
            maximum: number(approval.maximum, fallback.approvalPeriodWeeks.maximum, 12),
        },
        taxBaselinePercent: decimal(source.taxBaselinePercent, fallback.taxBaselinePercent, 100),
        streamingLevyBaselinePercent: decimal(source.streamingLevyBaselinePercent, fallback.streamingLevyBaselinePercent, 100),
        localContentObligationPercent: decimal(source.localContentObligationPercent, fallback.localContentObligationPercent, 100),
        privacyComplianceLevel: oneOf(source.privacyComplianceLevel, MARKET_PRIVACY_LEVELS, fallback.privacyComplianceLevel),
        complianceRequirements: stringList(source.complianceRequirements).length
            ? stringList(source.complianceRequirements)
            : fallback.complianceRequirements,
        recommendedNetworkFootprint: {
            recommendedCityId: text(network.recommendedCityId, fallback.recommendedNetworkFootprint.recommendedCityId, 20).toUpperCase(),
            edgeSites: number(network.edgeSites, fallback.recommendedNetworkFootprint.edgeSites, 30),
            originCapacitySharePercent: decimal(network.originCapacitySharePercent, fallback.recommendedNetworkFootprint.originCapacitySharePercent, 100),
            peakConcurrentStreams: number(network.peakConcurrentStreams, fallback.recommendedNetworkFootprint.peakConcurrentStreams),
            bandwidthGbps: number(network.bandwidthGbps, fallback.recommendedNetworkFootprint.bandwidthGbps),
        },
    };
};

const normalizeClearance = (value: unknown): OwnedStreamingMarketClearanceState | null => {
    const source = asRecord(value);
    if (!Object.keys(source).length) return null;
    return {
        stage: oneOf(source.stage, MARKET_CLEARANCE_STAGES, 'APPLICATION_FILED'),
        progressPercent: decimal(source.progressPercent, 0, 100),
        outcome: oneOf(source.outcome, MARKET_CLEARANCE_OUTCOMES, 'PENDING'),
        condition: text(source.condition, '', 220) || null,
        additionalPayment: number(source.additionalPayment),
        submittedAtAbsoluteWeek: number(source.submittedAtAbsoluteWeek),
        stageStartedAtAbsoluteWeek: number(source.stageStartedAtAbsoluteWeek),
        nextReviewAtAbsoluteWeek: number(source.nextReviewAtAbsoluteWeek),
        resumeAllowedAtAbsoluteWeek: nullableWeek(source.resumeAllowedAtAbsoluteWeek),
        reviewAttempt: number(source.reviewAttempt, 1, 20),
        history: asArray(source.history).slice(-20).flatMap(item => {
            const row = asRecord(item);
            const summary = text(row.summary, '', 220);
            return summary ? [{
                absoluteWeek: number(row.absoluteWeek),
                stage: oneOf(row.stage, MARKET_CLEARANCE_STAGES, 'APPLICATION_FILED'),
                outcome: oneOf(row.outcome, MARKET_CLEARANCE_OUTCOMES, 'PENDING'),
                summary,
            }] : [];
        }),
    };
};

const normalizeMarketOperation = (value: unknown): OwnedStreamingMarketOperation | null => {
    const source = asRecord(value);
    const scope = oneOf(source.scope, MARKET_SCOPES, 'COUNTRY');
    const scopeId = text(source.scopeId, '', 60).toUpperCase();
    if (!scopeId) return null;
    const idempotencyKey = text(source.idempotencyKey, `market:${scope.toLowerCase()}:${scopeId}`, 120);
    const countryId = scope === 'COUNTRY' ? text(source.countryId, scopeId, 12).toUpperCase() : null;
    const status = oneOf(source.status, MARKET_STATUSES, 'EVALUATING');
    const profile = countryId ? normalizeCountryProfile(source.countryProfile, countryId) : null;
    const committedAtAbsoluteWeek = nullableWeek(source.committedAtAbsoluteWeek);
    const approvalReadyAtAbsoluteWeek = nullableWeek(source.approvalReadyAtAbsoluteWeek);
    const policySnapshot = normalizePolicy(source.policySnapshot) || (profile && ['CLEARANCE', 'INFRASTRUCTURE_PREPARATION', 'READY', 'ACTIVE', 'SUSPENDED'].includes(status) ? {
        effectiveTaxPercent: profile.taxBaselinePercent,
        streamingLevyPercent: profile.streamingLevyBaselinePercent,
        localContentObligationPercent: profile.localContentObligationPercent,
        privacyComplianceLevel: profile.privacyComplianceLevel,
        policyClimate: profile.taxBaselinePercent >= 24 ? 'PROTECTIVE' as const : profile.taxBaselinePercent <= 12 ? 'OPEN' as const : 'BALANCED' as const,
        revision: 0,
        nextElectionAtAbsoluteWeek: (committedAtAbsoluteWeek || number(source.plannedAtAbsoluteWeek)) + 78,
        capturedAtAbsoluteWeek: committedAtAbsoluteWeek || number(source.plannedAtAbsoluteWeek),
    } : null);
    const savedClearance = normalizeClearance(source.clearance);
    const clearance = savedClearance || (countryId && status === 'CLEARANCE' ? {
        stage: 'APPLICATION_FILED' as const,
        progressPercent: 8,
        outcome: 'PENDING' as const,
        condition: null,
        additionalPayment: 0,
        submittedAtAbsoluteWeek: committedAtAbsoluteWeek || number(source.plannedAtAbsoluteWeek),
        stageStartedAtAbsoluteWeek: committedAtAbsoluteWeek || number(source.plannedAtAbsoluteWeek),
        nextReviewAtAbsoluteWeek: Math.min(approvalReadyAtAbsoluteWeek || Number.MAX_SAFE_INTEGER, (committedAtAbsoluteWeek || number(source.plannedAtAbsoluteWeek)) + 1),
        resumeAllowedAtAbsoluteWeek: null,
        reviewAttempt: 1,
        history: [],
    } : null);
    return {
        id: text(source.id, idempotencyKey, 120),
        idempotencyKey,
        scope,
        scopeId,
        countryId,
        regionId: text(source.regionId, '', 60).toUpperCase(),
        entryKind: oneOf(source.entryKind, MARKET_ENTRY_KINDS, scope === 'COUNTRY' ? 'EXPANSION' : 'LEGACY_REGION_ACCESS'),
        status,
        plannedCosts: normalizeCosts(source.plannedCosts),
        committedCosts: normalizeCosts(source.committedCosts),
        weeklyOperatingCost: number(source.weeklyOperatingCost),
        countryProfile: profile,
        policySnapshot,
        policyHistory: asArray(source.policyHistory).map(normalizePolicy).filter((item): item is OwnedStreamingMarketPolicySnapshot => Boolean(item)).slice(-12),
        clearance,
        plannedAtAbsoluteWeek: number(source.plannedAtAbsoluteWeek),
        committedAtAbsoluteWeek,
        approvalReadyAtAbsoluteWeek,
        activatedAtAbsoluteWeek: nullableWeek(source.activatedAtAbsoluteWeek),
        suspendedAtAbsoluteWeek: nullableWeek(source.suspendedAtAbsoluteWeek),
        exitedAtAbsoluteWeek: nullableWeek(source.exitedAtAbsoluteWeek),
        source: oneOf(source.source, MARKET_SOURCES, 'PLAYER_ACTION'),
    };
};

const migrateCountryMarkets = (root: UnknownRecord): OwnedStreamingMarketOperation[] => {
    const identity = asRecord(root.identity);
    const draft = asRecord(root.foundingDraft);
    const ids = normalizeStreamingDayOneMarketIds(
        asArray(identity.dayOneMarketIds).length ? identity.dayOneMarketIds : draft.dayOneMarketIds,
    );
    const launched = Object.keys(asRecord(root.launchCommit)).length > 0 || root.lifecycle === 'ACTIVE';
    const foundedAt = number(identity.foundedAtAbsoluteWeek, number(draft.updatedAtAbsoluteWeek));
    const launchCommit = asRecord(root.launchCommit);
    const activatedAt = launched ? number(launchCommit.committedAtAbsoluteWeek, foundedAt) : null;
    return ids.flatMap(countryId => {
        const market = getStreamingDayOneMarket(countryId);
        if (!market) return [];
        const entry = getStreamingMarketEntryProfile(countryId);
        const countryProfile = getStreamingCountryMarketProfile(countryId);
        const plannedCosts = normalizeCosts({
            rights: market.openingRightsEstimate,
            compliance: entry.plannedOverheadEstimate,
        });
        return [{
            id: `market:country:${countryId}`,
            idempotencyKey: `market:country:${countryId}`,
            scope: 'COUNTRY' as const,
            scopeId: countryId,
            countryId,
            regionId: market.regionId,
            entryKind: 'OPENING' as const,
            status: launched ? 'ACTIVE' as const : 'PLANNED' as const,
            plannedCosts,
            committedCosts: emptyCosts(),
            weeklyOperatingCost: countryProfile ? Math.max(55_000, Math.round(countryProfile.audienceSize * (countryProfile.privacyComplianceLevel === 'STRICT' ? 0.0048 : 0.0034))) : 0,
            countryProfile,
            policySnapshot: launched && countryProfile ? {
                effectiveTaxPercent: countryProfile.taxBaselinePercent,
                streamingLevyPercent: countryProfile.streamingLevyBaselinePercent,
                localContentObligationPercent: countryProfile.localContentObligationPercent,
                privacyComplianceLevel: countryProfile.privacyComplianceLevel,
                policyClimate: countryProfile.taxBaselinePercent >= 24 ? 'PROTECTIVE' as const : countryProfile.taxBaselinePercent <= 12 ? 'OPEN' as const : 'BALANCED' as const,
                revision: 0,
                nextElectionAtAbsoluteWeek: (activatedAt || foundedAt) + 78,
                capturedAtAbsoluteWeek: activatedAt || foundedAt,
            } : null,
            policyHistory: [],
            clearance: null,
            plannedAtAbsoluteWeek: foundedAt,
            committedAtAbsoluteWeek: null,
            approvalReadyAtAbsoluteWeek: null,
            activatedAtAbsoluteWeek: activatedAt,
            suspendedAtAbsoluteWeek: null,
            exitedAtAbsoluteWeek: null,
            source: 'LEGACY_DAY_ONE' as const,
        }];
    });
};

const migrateRegionalMarkets = (root: UnknownRecord): OwnedStreamingMarketOperation[] => {
    const world = asRecord(root.competitiveWorld);
    return asArray(world.regionalLaunches).flatMap(value => {
        const source = asRecord(value);
        const regionId = text(source.regionId, '', 60).toUpperCase();
        if (!regionId) return [];
        const active = source.status === 'ACTIVE';
        const capitalCost = number(source.capitalCost);
        const startedAt = number(source.startedAtAbsoluteWeek);
        const plannedCosts = normalizeCosts({ other: capitalCost });
        return [{
            id: `market:legacy-region:${regionId}`,
            idempotencyKey: `market:legacy-region:${regionId}`,
            scope: 'LEGACY_REGION' as const,
            scopeId: regionId,
            countryId: null,
            regionId,
            entryKind: 'LEGACY_REGION_ACCESS' as const,
            status: active ? 'ACTIVE' as const : 'CLEARANCE' as const,
            plannedCosts,
            committedCosts: plannedCosts,
            weeklyOperatingCost: number(source.weeklyOperatingCost),
            countryProfile: null,
            policySnapshot: null,
            policyHistory: [],
            clearance: null,
            plannedAtAbsoluteWeek: startedAt,
            committedAtAbsoluteWeek: startedAt,
            approvalReadyAtAbsoluteWeek: nullableWeek(source.readyAtAbsoluteWeek),
            activatedAtAbsoluteWeek: nullableWeek(source.launchedAtAbsoluteWeek),
            suspendedAtAbsoluteWeek: null,
            exitedAtAbsoluteWeek: null,
            source: 'LEGACY_REGIONAL' as const,
        }];
    });
};

const normalizeLaunchProgram = (root: UnknownRecord): OwnedStreamingLaunchProgramState => {
    const source = asRecord(root.launchProgram);
    const identity = asRecord(root.identity);
    const profile = asRecord(root.foundingProfile);
    const launchCommit = asRecord(root.launchCommit);
    const hasLaunch = Object.keys(launchCommit).length > 0;
    const hasCompany = Boolean(text(identity.name)) || Object.keys(profile).length > 0;
    const derivedStatus: StreamingLaunchProgramStatus = hasLaunch ? 'LAUNCHED' : hasCompany ? 'PLANNING' : 'NOT_STARTED';
    const savedStatus = oneOf(source.status, LAUNCH_PROGRAM_STATUSES, derivedStatus);
    const statusOrder: StreamingLaunchProgramStatus[] = ['NOT_STARTED', 'PLANNING', 'READY', 'LAUNCHED'];
    return {
        status: statusOrder[Math.max(statusOrder.indexOf(savedStatus), statusOrder.indexOf(derivedStatus))],
        startedAtAbsoluteWeek: nullableWeek(source.startedAtAbsoluteWeek)
            ?? (hasCompany ? number(identity.foundedAtAbsoluteWeek, number(profile.incorporatedAtAbsoluteWeek)) : null),
        configurationRevision: number(source.configurationRevision),
        serviceConfigurationCommittedAtAbsoluteWeek: nullableWeek(source.serviceConfigurationCommittedAtAbsoluteWeek),
        lastRehearsalSignature: text(source.lastRehearsalSignature, '', 160) || null,
        completedAtAbsoluteWeek: nullableWeek(source.completedAtAbsoluteWeek)
            ?? (hasLaunch ? number(launchCommit.committedAtAbsoluteWeek) : null),
        defineCurrentStep: source.defineCurrentStep === 'RIGHTS_LOCALIZATION'
            ? 'BLUEPRINT'
            : oneOf(source.defineCurrentStep, DEFINE_STEPS, 'FUND'),
        buildCurrentStep: oneOf(source.buildCurrentStep, BUILD_STEPS, 'BLUEPRINT'),
        lastBlueprintSignature: text(source.lastBlueprintSignature, '', 160) || null,
        blueprintSavedAtAbsoluteWeek: nullableWeek(source.blueprintSavedAtAbsoluteWeek),
    };
};

const normalizePricingConfiguration = (root: UnknownRecord, source: UnknownRecord): OwnedStreamingPricingConfiguration => {
    const pricing = asRecord(source.pricing);
    const legacyPrices = asRecord(root.subscriptionPrices);
    const fallbackPlans = [
        { id: 'BASIC', name: 'Essential', monthly: decimal(legacyPrices.BASIC, 7.99, 100), featureIds: [] as string[], ads: false },
        { id: 'PREMIUM', name: 'Standard', monthly: decimal(legacyPrices.PREMIUM, 12.99, 100), featureIds: [] as string[], ads: false },
        { id: 'FAMILY', name: 'Premiere', monthly: decimal(legacyPrices.FAMILY, 17.99, 100), featureIds: [] as string[], ads: false },
    ];
    const plans = asArray(pricing.plans).map((value, index) => {
        const plan = asRecord(value);
        return {
            id: text(plan.id, fallbackPlans[index]?.id || `PLAN_${index + 1}`, 50),
            name: text(plan.name, fallbackPlans[index]?.name || `Plan ${index + 1}`, 40),
            monthly: decimal(plan.monthly, fallbackPlans[index]?.monthly || 12, 100),
            featureIds: stringList(plan.featureIds, 20),
            ads: plan.ads === true,
        };
    }).slice(0, 6);
    const ads = asRecord(pricing.ads);
    const rentals = asRecord(pricing.rentals);
    const premium = asRecord(pricing.premium);
    const daypass = asRecord(pricing.daypass);
    const sponsor = asRecord(pricing.sponsor);
    const metered = asRecord(pricing.metered);
    const patron = asRecord(pricing.patron);
    return {
        streams: asArray(pricing.streams).length
            ? Array.from(new Set(asArray(pricing.streams).map(value => oneOf(value, REVENUE_STREAMS, 'subs'))))
            : ['subs'],
        plans: plans.length ? plans : fallbackPlans,
        annualDiscount: number(pricing.annualDiscount, 15, 40),
        introOffer: number(pricing.introOffer, 0, 60),
        ads: { minutesPerHour: number(ads.minutesPerHour, 4, 12), cpm: decimal(ads.cpm, 22, 100) },
        rentals: { rent: decimal(rentals.rent, 5.99, 50), buy: decimal(rentals.buy, 19.99, 100), windowWeeks: number(rentals.windowWeeks, 6, 52) },
        premium: { price: decimal(premium.price, 29.99, 100) },
        daypass: { price: decimal(daypass.price, 7.99, 100) },
        sponsor: { perTitle: number(sponsor.perTitle, 4_000_000, 100_000_000), titles: number(sponsor.titles, 0, 100) },
        metered: { perHour: decimal(metered.perHour, 1, 20) },
        patron: { monthly: decimal(patron.monthly, 10, 100) },
    };
};

const normalizeServiceConfiguration = (root: UnknownRecord): OwnedStreamingServiceConfiguration => {
    const source = asRecord(root.serviceConfiguration);
    const identity = asRecord(root.identity);
    const legacyIdent = oneOf(identity.soundIdentKey, SOUND_IDENT_KEYS, 'PULSE');
    const hasCanonical = Object.keys(source).length > 0;
    const hasLegacy = Object.keys(identity).length > 0 && SOUND_IDENT_KEYS.includes(identity.soundIdentKey as StreamingSoundIdentKey);
    const savedSource = hasCanonical
        ? oneOf(source.source, SERVICE_SOURCES, 'PLAYER_ACTION')
        : 'UNCONFIGURED';
    const configSource = savedSource === 'UNCONFIGURED' && hasLegacy ? 'LEGACY_FOUNDING' : savedSource;
    const customAudioSource = asRecord(source.customIdentAudio);
    const customAudioDataUrl = text(customAudioSource.dataUrl, '', 900_000);
    const customIdentAudio = customAudioDataUrl.startsWith('data:audio/wav;base64,') ? {
        dataUrl: customAudioDataUrl,
        originalName: text(customAudioSource.originalName, 'Custom ident.wav', 120),
        durationSeconds: number(customAudioSource.durationSeconds, 0, 8),
        sampleRate: number(customAudioSource.sampleRate, 8_000, 48_000),
        byteLength: number(customAudioSource.byteLength, 0, 700_000),
        fingerprint: text(customAudioSource.fingerprint, '', 80),
    } : null;
    return {
        source: configSource,
        soundIdentKey: configSource === 'UNCONFIGURED'
            ? null
            : oneOf(source.soundIdentKey, SOUND_IDENT_KEYS, legacyIdent),
        identPackageId: configSource === 'UNCONFIGURED'
            ? null
            : oneOf(source.identPackageId, IDENT_PACKAGES, 'STANDARD'),
        identDurationSeconds: number(source.identDurationSeconds),
        customIdentAudio,
        storefrontLayoutId: normalizeStreamingStorefrontLayoutId(text(source.storefrontLayoutId, '', 80)),
        pricingApproach: text(source.pricingApproach, '', 80) || null,
        pricing: normalizePricingConfiguration(root, source),
        committedCost: number(source.committedCost),
        committedAtAbsoluteWeek: nullableWeek(source.committedAtAbsoluteWeek),
        revision: number(source.revision),
    };
};

const normalizeInstalledCapability = (value: unknown): OwnedStreamingInstalledCapability | null => {
    const source = asRecord(value);
    const capabilityId = text(source.capabilityId, '', 100);
    const branch = oneOf(source.branch, TECHNOLOGY_BRANCHES, 'PRODUCT_EXPERIENCE');
    if (!capabilityId) return null;
    return {
        capabilityId,
        branch,
        status: source.status === 'LEGACY_GRANT' ? 'LEGACY_GRANT' : 'OPERATING',
        installedAtAbsoluteWeek: number(source.installedAtAbsoluteWeek),
        sourceProjectId: text(source.sourceProjectId, '', 100) || null,
        legacyLevelFloor: number(source.legacyLevelFloor, 0, 100),
    };
};

const normalizeCapabilities = (root: UnknownRecord): OwnedStreamingCapabilityPortfolio => {
    const source = asRecord(root.capabilities);
    const legacy = asRecord(source.legacyLevelFloors);
    const technology = asRecord(root.technologyLevels);
    return {
        installed: Array.from(new Map(
            asArray(source.installed)
                .map(normalizeInstalledCapability)
                .filter((item): item is OwnedStreamingInstalledCapability => Boolean(item))
                .map(item => [item.capabilityId, item]),
        ).values()).slice(-120),
        legacyLevelFloors: Object.fromEntries(TECHNOLOGY_BRANCHES.map(branch => [
            branch,
            Math.max(number(legacy[branch], 0, 100), number(technology[branch], 0, 100)),
        ])) as Record<StreamingTechnologyBranch, number>,
    };
};

const normalizeProvider = (value: unknown): OwnedStreamingLocalizationProvider | null => {
    const source = asRecord(value);
    const id = text(source.id, '', 100);
    if (!id) return null;
    return {
        id,
        name: text(source.name, 'Localization partner', 100),
        status: oneOf(source.status, ['AVAILABLE', 'CONTRACTED', 'SUSPENDED'] as const, 'AVAILABLE'),
        languageIds: Array.from(new Set(stringList(source.languageIds, 40)
            .map(normalizeStreamingLanguageId)
            .filter(Boolean))),
        contractedAtAbsoluteWeek: nullableWeek(source.contractedAtAbsoluteWeek),
    };
};

const normalizeFacility = (value: unknown): OwnedStreamingLocalizationFacility | null => {
    const source = asRecord(value);
    const id = text(source.id, '', 100);
    if (!id) return null;
    return {
        id,
        name: text(source.name, 'Localization facility', 100),
        status: oneOf(source.status, ['PLANNED', 'BUILDING', 'ACTIVE'] as const, 'PLANNED'),
        languageIds: Array.from(new Set(stringList(source.languageIds, 40)
            .map(normalizeStreamingLanguageId)
            .filter(Boolean))),
        readyAtAbsoluteWeek: nullableWeek(source.readyAtAbsoluteWeek),
    };
};

const normalizeJob = (value: unknown): OwnedStreamingLocalizationJob | null => {
    const source = asRecord(value);
    const id = text(source.id, '', 120);
    const titleId = text(source.titleId, '', 100);
    const languageId = normalizeStreamingLanguageId(text(source.languageId, '', 60));
    if (!id || !titleId || !languageId) return null;
    return {
        id,
        titleId,
        languageId,
        mode: source.mode === 'DUB' ? 'DUB' : 'SUBTITLE',
        status: oneOf(source.status, ['PLANNED', 'IN_PROGRESS', 'READY'] as const, 'PLANNED'),
        providerId: text(source.providerId, '', 100) || null,
        facilityId: text(source.facilityId, '', 100) || null,
        cashCost: number(source.cashCost),
        readyAtAbsoluteWeek: nullableWeek(source.readyAtAbsoluteWeek),
    };
};

const normalizeAsset = (value: unknown): OwnedStreamingTitleLanguageAsset | null => {
    const source = asRecord(value);
    const id = text(source.id, '', 120);
    const titleId = text(source.titleId, '', 100);
    const languageId = normalizeStreamingLanguageId(text(source.languageId, '', 60));
    if (!id || !titleId || !languageId) return null;
    return {
        id,
        titleId,
        languageId,
        subtitleReady: source.subtitleReady === true,
        dubReady: source.dubReady === true,
        readyAtAbsoluteWeek: number(source.readyAtAbsoluteWeek),
    };
};

const normalizeLegacyGrant = (value: unknown): OwnedStreamingLegacyLocalizationGrant | null => {
    const source = asRecord(value);
    const originalCommissionId = text(source.originalCommissionId, '', 100);
    if (!originalCommissionId) return null;
    const id = text(source.id, `localization:legacy:${originalCommissionId}`, 120);
    return {
        id,
        originalCommissionId,
        packageId: oneOf(source.packageId, LOCALIZATION_PACKAGES, 'DOMESTIC'),
        subtitleLanguageCount: number(source.subtitleLanguageCount, 0, 100),
        dubbedLanguageCount: number(source.dubbedLanguageCount, 0, 100),
        readyAtAbsoluteWeek: number(source.readyAtAbsoluteWeek),
    };
};

const migrateLegacyGrants = (root: UnknownRecord): OwnedStreamingLegacyLocalizationGrant[] => (
    asArray(root.originalCommissions).flatMap(value => {
        const commission = asRecord(value);
        const localization = asRecord(commission.localization);
        const originalCommissionId = text(commission.id, '', 100);
        if (!originalCommissionId || !Object.keys(localization).length) return [];
        return [{
            id: `localization:legacy:${originalCommissionId}`,
            originalCommissionId,
            packageId: oneOf(localization.packageId, LOCALIZATION_PACKAGES, 'DOMESTIC'),
            subtitleLanguageCount: number(localization.subtitleLanguageCount, 0, 100),
            dubbedLanguageCount: number(localization.dubbedLanguageCount, 0, 100),
            readyAtAbsoluteWeek: number(localization.readyAtAbsoluteWeek),
        }];
    })
);

const dedupe = <T,>(values: T[], key: (value: T) => string): T[] => Array.from(
    values.reduce((map, value) => map.set(key(value), value), new Map<string, T>()).values(),
);

const normalizeLocalization = (root: UnknownRecord): OwnedStreamingLocalizationOperationsState => {
    const source = asRecord(root.localizationOperations);
    return {
        providers: dedupe(asArray(source.providers).map(normalizeProvider).filter((item): item is OwnedStreamingLocalizationProvider => Boolean(item)), item => item.id).slice(-80),
        facilities: dedupe(asArray(source.facilities).map(normalizeFacility).filter((item): item is OwnedStreamingLocalizationFacility => Boolean(item)), item => item.id).slice(-40),
        jobs: dedupe(asArray(source.jobs).map(normalizeJob).filter((item): item is OwnedStreamingLocalizationJob => Boolean(item)), item => item.id).slice(-240),
        titleLanguageAssets: dedupe(asArray(source.titleLanguageAssets).map(normalizeAsset).filter((item): item is OwnedStreamingTitleLanguageAsset => Boolean(item)), item => item.id).slice(-320),
        legacyPackageGrants: dedupe([
            ...migrateLegacyGrants(root),
            ...asArray(source.legacyPackageGrants).map(normalizeLegacyGrant).filter((item): item is OwnedStreamingLegacyLocalizationGrant => Boolean(item)),
        ], item => item.id).slice(-120),
    };
};

const normalizeCommitment = (value: unknown): OwnedStreamingCostCommitment | null => {
    const source = asRecord(value);
    const idempotencyKey = text(source.idempotencyKey, '', 120);
    if (!idempotencyKey) return null;
    return {
        id: text(source.id, idempotencyKey, 120),
        idempotencyKey,
        category: oneOf(source.category, COMMITMENT_CATEGORIES, 'OTHER'),
        label: text(source.label, 'Planned commitment', 120),
        status: oneOf(source.status, COMMITMENT_STATUSES, 'PLANNED'),
        plannedAmount: number(source.plannedAmount),
        committedAmount: number(source.committedAmount),
        paidAmount: number(source.paidAmount),
        weeklyAmount: number(source.weeklyAmount),
        createdAtAbsoluteWeek: number(source.createdAtAbsoluteWeek),
        committedAtAbsoluteWeek: nullableWeek(source.committedAtAbsoluteWeek),
        paidAtAbsoluteWeek: nullableWeek(source.paidAtAbsoluteWeek),
        sourceReferenceId: text(source.sourceReferenceId, '', 120) || null,
    };
};

export interface StreamingCanonicalFoundationState {
    launchProgram: OwnedStreamingLaunchProgramState;
    marketOperations: OwnedStreamingMarketOperation[];
    serviceConfiguration: OwnedStreamingServiceConfiguration;
    capabilities: OwnedStreamingCapabilityPortfolio;
    localizationOperations: OwnedStreamingLocalizationOperationsState;
    costCommitments: OwnedStreamingCostCommitment[];
}

/**
 * Upgrades old saves into the canonical model without charging cash, creating
 * research unlocks, or fabricating title-level language assets.
 */
export const normalizeStreamingCanonicalFoundation = (value: unknown): StreamingCanonicalFoundationState => {
    const root = asRecord(value);
    const canonicalMarkets = asArray(root.marketOperations)
        .map(normalizeMarketOperation)
        .filter((item): item is OwnedStreamingMarketOperation => Boolean(item));
    const marketOperations = dedupe([
        ...migrateCountryMarkets(root),
        ...migrateRegionalMarkets(root),
        ...canonicalMarkets,
    ], item => `${item.scope}:${item.scopeId}`).slice(-120);

    return {
        launchProgram: normalizeLaunchProgram(root),
        marketOperations,
        serviceConfiguration: normalizeServiceConfiguration(root),
        capabilities: normalizeCapabilities(root),
        localizationOperations: normalizeLocalization(root),
        costCommitments: dedupe(
            asArray(root.costCommitments)
                .map(normalizeCommitment)
                .filter((item): item is OwnedStreamingCostCommitment => Boolean(item)),
            item => item.idempotencyKey,
        ).slice(-240),
    };
};
