import {
    INDUSTRY_INTELLIGENCE_SCHEMA_VERSION,
    type IndustryCompanyKind,
    type IndustryContentFingerprint,
    type IndustryContentFormat,
    type IndustryContentIntelligenceState,
    type IndustryContentLifecycle,
    type IndustryContentRelationship,
    type IndustryContentReleasePath,
    type IndustryContentSourceIntent,
    type IndustryDecisionLane,
    type IndustryIntelligenceLearningSample,
    type IndustryIntelligenceLearningState,
    type IndustryIntelligenceProposal,
    type IndustryIntelligenceReasonCode,
    type IndustryIntelligenceScore,
    type IndustryIntelligenceShadowComparison,
    type IndustryIntelligenceShadowDivergence,
    type IndustryIntelligenceState,
    type IndustryUniverseBlueprint,
    type IndustryUniverseBlueprintLifecycle,
} from '../../types';
import { hashDeterministicSeed } from '../deterministicRandom';

export const INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT = 36;
export const INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT = 36;
export const INDUSTRY_INTELLIGENCE_LEARNING_LIMIT = 48;
export const INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT = 104;
export const INDUSTRY_CONTENT_FINGERPRINT_LIMIT = 24;
export const INDUSTRY_CONTENT_BLUEPRINT_LIMIT = 6;
export const INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT = 48;
export const INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT = 64;

export const INDUSTRY_DECISION_LANES: IndustryDecisionLane[] = [
    'CONTENT_STRATEGY',
    'PRODUCTION_REVIEW',
    'RELEASE_REVIEW',
    'FINANCE_REVIEW',
    'MARKET_EXPANSION',
    'CAPABILITY_GROWTH',
];

const BASE_CADENCE: Record<IndustryDecisionLane, number> = {
    CONTENT_STRATEGY: 6,
    PRODUCTION_REVIEW: 5,
    RELEASE_REVIEW: 6,
    FINANCE_REVIEW: 4,
    MARKET_EXPANSION: 13,
    CAPABILITY_GROWTH: 12,
};

const finite = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};
const whole = (value: unknown, fallback = 0): number => Math.max(0, Math.round(finite(value, fallback)));
const bounded = (value: unknown, fallback = 50): number => Math.max(0, Math.min(100, finite(value, fallback)));
const text = (value: unknown, fallback: string): string => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const uniqueStrings = (value: unknown, limit: number): string[] => Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim()))].slice(-limit)
    : [];

const emptyLaneRecord = <T>(factory: (lane: IndustryDecisionLane) => T): Record<IndustryDecisionLane, T> => Object.fromEntries(
    INDUSTRY_DECISION_LANES.map(lane => [lane, factory(lane)]),
) as Record<IndustryDecisionLane, T>;

const isCompanyKind = (value: unknown): value is IndustryCompanyKind => value === 'PRODUCTION_STUDIO' || value === 'STREAMING_PLATFORM';
const isLane = (value: unknown): value is IndustryDecisionLane => INDUSTRY_DECISION_LANES.includes(value as IndustryDecisionLane);
const FORMATS = new Set<IndustryContentFormat>(['MOVIE', 'SERIES', 'LIMITED_SERIES']);
const SOURCE_INTENTS = new Set<IndustryContentSourceIntent>([
    'ORIGINAL', 'INTERNAL_DEVELOPMENT', 'PLATFORM_ORIGINAL', 'INDIVIDUAL_COMMISSION', 'LICENSED_WORK',
    'ACQUIRED_IP', 'SEQUEL', 'PREQUEL', 'REBOOT', 'SPIN_OFF', 'UNIVERSE_ENTRY', 'UNIVERSE_CROSSOVER',
    'UNIVERSE_EVENT', 'INHERITED',
]);
const RELATIONSHIPS = new Set<IndustryContentRelationship>([
    'STANDALONE', 'SEQUEL', 'PREQUEL', 'REBOOT', 'SPIN_OFF', 'UNIVERSE_ENTRY',
    'UNIVERSE_CROSSOVER', 'UNIVERSE_EVENT', 'FOUND_UNIVERSE',
]);
const RELEASE_PATHS = new Set<IndustryContentReleasePath>(['THEATRICAL_FIRST', 'STREAMING_FIRST', 'HYBRID', 'LIMITED_EVENT']);
const CONTENT_LIFECYCLES = new Set<IndustryContentLifecycle>(['SELECTED', 'COMMITTED', 'PUBLIC', 'MATERIALIZED', 'ABANDONED', 'CANCELLED']);
const EXECUTION_BOUND_CONTENT_LIFECYCLES = new Set<IndustryContentLifecycle>(['COMMITTED', 'PUBLIC']);
const BLUEPRINT_LIFECYCLES = new Set<IndustryUniverseBlueprintLifecycle>(['PLANNED', 'EMERGING', 'ACTIVE', 'PAUSED', 'RETIRED', 'FAILED', 'MATERIALIZED']);

export const createInitialIndustryContentState = (): IndustryContentIntelligenceState => ({
    selectedFingerprints: [],
    universeBlueprints: [],
    recentNoveltySignatures: [],
    materializationKeys: [],
});

const normalizeBudget = (value: unknown): IndustryContentFingerprint['budgetSuitability'] => {
    const source = record(value);
    const minimumMillions = Math.max(0.1, finite(source.minimumMillions, 1));
    const idealLowMillions = Math.max(minimumMillions + 0.1, finite(source.idealLowMillions, minimumMillions + 0.1));
    const idealHighMillions = Math.max(idealLowMillions, finite(source.idealHighMillions, idealLowMillions));
    const ambitiousMaximumMillions = Math.max(idealHighMillions + 0.1, finite(source.ambitiousMaximumMillions, idealHighMillions + 0.1));
    return { minimumMillions, idealLowMillions, idealHighMillions, ambitiousMaximumMillions };
};

export const normalizeIndustryContentFingerprint = (raw: unknown): IndustryContentFingerprint | null => {
    const item = record(raw);
    if (typeof item.id !== 'string' || !item.id.trim() || typeof item.ownerCompanyId !== 'string' || !isCompanyKind(item.ownerCompanyKind)) return null;
    if (!FORMATS.has(item.format as IndustryContentFormat) || !SOURCE_INTENTS.has(item.sourceIntent as IndustryContentSourceIntent)) return null;
    if (!RELATIONSHIPS.has(item.relationship as IndustryContentRelationship) || !RELEASE_PATHS.has(item.releasePath as IndustryContentReleasePath)) return null;
    return {
        id: item.id.trim(), seed: text(item.seed, item.id.trim()), ownerCompanyId: item.ownerCompanyId.trim(), ownerCompanyKind: item.ownerCompanyKind,
        format: item.format as IndustryContentFormat, primaryGenre: text(item.primaryGenre, 'DRAMA') as IndustryContentFingerprint['primaryGenre'],
        secondaryGenre: typeof item.secondaryGenre === 'string' ? item.secondaryGenre as IndustryContentFingerprint['secondaryGenre'] : undefined,
        subgenre: text(item.subgenre, 'CHARACTER_STUDY'), tone: text(item.tone, 'GROUNDED'), theme: text(item.theme, 'IDENTITY'),
        setting: text(item.setting, 'METROPOLIS'), period: text(item.period, 'CONTEMPORARY'), targetAudience: text(item.targetAudience, 'ADULT_MAINSTREAM'),
        originalLanguage: text(item.originalLanguage, 'ENGLISH'), priorityMarket: text(item.priorityMarket, 'GLOBAL'),
        commercialIntent: bounded(item.commercialIntent), prestigeIntent: bounded(item.prestigeIntent), creativeRisk: bounded(item.creativeRisk),
        starPowerTarget: bounded(item.starPowerTarget), releasePath: item.releasePath as IndustryContentReleasePath,
        sourceIntent: item.sourceIntent as IndustryContentSourceIntent, relationship: item.relationship as IndustryContentRelationship,
        budgetSuitability: normalizeBudget(item.budgetSuitability), noveltySignature: text(item.noveltySignature, item.id.trim()),
        noveltyScore: bounded(item.noveltyScore), createdAtAbsoluteWeek: whole(item.createdAtAbsoluteWeek), decisionCycle: whole(item.decisionCycle),
        lifecycle: CONTENT_LIFECYCLES.has(item.lifecycle as IndustryContentLifecycle) ? item.lifecycle as IndustryContentLifecycle : 'SELECTED',
        sourceRightId: typeof item.sourceRightId === 'string' ? item.sourceRightId : undefined,
        relatedFingerprintId: typeof item.relatedFingerprintId === 'string' ? item.relatedFingerprintId : undefined,
        universeBlueprintId: typeof item.universeBlueprintId === 'string' ? item.universeBlueprintId : undefined,
        canonicalProjectId: typeof item.canonicalProjectId === 'string' ? item.canonicalProjectId : undefined,
        canonicalUniverseId: typeof item.canonicalUniverseId === 'string' ? item.canonicalUniverseId : undefined,
    };
};

export const compactIndustryContentFingerprints = (
    fingerprints: IndustryContentFingerprint[],
    limit = INDUSTRY_CONTENT_FINGERPRINT_LIMIT,
): IndustryContentFingerprint[] => {
    const unique = [...new Map(fingerprints.map(item => [item.id, item])).values()];
    const executionBound = unique
        .filter(item => EXECUTION_BOUND_CONTENT_LIFECYCLES.has(item.lifecycle))
        .slice(-limit);
    const selectionSlots = Math.max(0, limit - executionBound.length);
    const selections = unique
        .filter(item => item.lifecycle === 'SELECTED')
        .slice(-selectionSlots);
    const terminalSlots = Math.max(0, limit - executionBound.length - selections.length);
    const terminalCandidates = unique.filter(item => (
        item.lifecycle !== 'SELECTED' && !EXECUTION_BOUND_CONTENT_LIFECYCLES.has(item.lifecycle)
    ));
    const terminal = terminalSlots > 0 ? terminalCandidates.slice(-terminalSlots) : [];
    return [...terminal, ...selections, ...executionBound]
        .sort((left, right) => left.createdAtAbsoluteWeek - right.createdAtAbsoluteWeek || left.id.localeCompare(right.id));
};

const normalizeBlueprint = (raw: unknown): IndustryUniverseBlueprint | null => {
    const item = record(raw);
    if (typeof item.id !== 'string' || !item.id.trim() || typeof item.ownerCompanyId !== 'string' || !isCompanyKind(item.ownerCompanyKind)) return null;
    return {
        id: item.id.trim(), seed: text(item.seed, item.id.trim()), ownerCompanyId: item.ownerCompanyId.trim(), ownerCompanyKind: item.ownerCompanyKind,
        anchorFingerprintId: text(item.anchorFingerprintId, ''), coreWorldSignature: text(item.coreWorldSignature, item.id.trim()),
        creativePillars: uniqueStrings(item.creativePillars, 6), supportedFormats: uniqueStrings(item.supportedFormats, 3).filter(value => FORMATS.has(value as IndustryContentFormat)) as IndustryContentFormat[],
        branchFamilies: uniqueStrings(item.branchFamilies, 8), currentSagaLabel: text(item.currentSagaLabel, 'Origins'), currentPhaseLabel: text(item.currentPhaseLabel, 'Foundation'),
        plannedCadenceWeeks: Math.max(4, whole(item.plannedCadenceWeeks, 52)), financialScale: bounded(item.financialScale), crossoverPotential: bounded(item.crossoverPotential),
        confidence: bounded(item.confidence), momentum: bounded(item.momentum), fatigue: bounded(item.fatigue, 0),
        lifecycle: BLUEPRINT_LIFECYCLES.has(item.lifecycle as IndustryUniverseBlueprintLifecycle) ? item.lifecycle as IndustryUniverseBlueprintLifecycle : 'PLANNED',
        createdAtAbsoluteWeek: whole(item.createdAtAbsoluteWeek), updatedAtAbsoluteWeek: whole(item.updatedAtAbsoluteWeek),
        canonicalUniverseId: typeof item.canonicalUniverseId === 'string' ? item.canonicalUniverseId : undefined,
    };
};

export const normalizeIndustryContentState = (raw: unknown): IndustryContentIntelligenceState => {
    const source = record(raw);
    return {
        selectedFingerprints: compactIndustryContentFingerprints(
            (Array.isArray(source.selectedFingerprints) ? source.selectedFingerprints : []).map(normalizeIndustryContentFingerprint)
                .filter((item): item is IndustryContentFingerprint => item !== null),
        ),
        universeBlueprints: (Array.isArray(source.universeBlueprints) ? source.universeBlueprints : []).map(normalizeBlueprint)
            .filter((item): item is IndustryUniverseBlueprint => item !== null).slice(-INDUSTRY_CONTENT_BLUEPRINT_LIMIT),
        recentNoveltySignatures: uniqueStrings(source.recentNoveltySignatures, INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT),
        materializationKeys: uniqueStrings(source.materializationKeys, INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT),
    };
};

const createInitialLaneSchedule = (
    companyId: string,
    companyKind: IndustryCompanyKind,
    seed: string,
    absoluteWeek: number,
): Record<IndustryDecisionLane, number | null> => emptyLaneRecord(lane => {
    if (companyKind === 'PRODUCTION_STUDIO' && lane === 'MARKET_EXPANSION') return null;
    const cadence = BASE_CADENCE[lane];
    const offset = hashDeterministicSeed(`${seed}:${companyId}:${lane}`) % cadence;
    return whole(absoluteWeek) + 1 + offset;
});

const emptyLearningState = (): IndustryIntelligenceLearningState => ({
    averageOutcomeByLane: {},
    capabilityProgress: {},
    repetitionFatigue: 0,
    franchiseFatigue: 0,
    samples: [],
    processedEvidenceIds: [],
});

const normalizeScore = (value: unknown): IndustryIntelligenceScore => {
    const source = record(value);
    const component = (key: keyof IndustryIntelligenceScore) => finite(source[key]);
    return {
        total: component('total'),
        need: component('need'),
        strategyFit: component('strategyFit'),
        expectedUpside: component('expectedUpside'),
        relationshipValue: component('relationshipValue'),
        competitiveValue: component('competitiveValue'),
        financialRisk: component('financialRisk'),
        capacityPressure: component('capacityPressure'),
        fatigue: component('fatigue'),
        executionRisk: component('executionRisk'),
    };
};

const normalizeLearning = (value: unknown): IndustryIntelligenceLearningState => {
    const source = record(value);
    const averageOutcomeByLane = Object.fromEntries(Object.entries(record(source.averageOutcomeByLane))
        .filter(([key]) => isLane(key))
        .map(([key, item]) => [key, bounded(item)])) as IndustryIntelligenceLearningState['averageOutcomeByLane'];
    const capabilityProgress = Object.fromEntries(Object.entries(record(source.capabilityProgress))
        .map(([key, item]) => [key, bounded(item, 0)])) as IndustryIntelligenceLearningState['capabilityProgress'];
    const samples = (Array.isArray(source.samples) ? source.samples : []).flatMap(raw => {
        const item = record(raw);
        if (!isLane(item.lane) || typeof item.evidenceId !== 'string' || !item.evidenceId.trim()) return [];
        const sample: IndustryIntelligenceLearningSample = {
            id: text(item.id, item.evidenceId),
            evidenceId: item.evidenceId.trim(),
            absoluteWeek: whole(item.absoluteWeek),
            lane: item.lane,
            outcomeScore: bounded(item.outcomeScore),
            capabilityDelta: finite(item.capabilityDelta),
            momentumDelta: finite(item.momentumDelta),
        };
        return [sample];
    }).slice(-INDUSTRY_INTELLIGENCE_LEARNING_LIMIT);
    return {
        averageOutcomeByLane,
        capabilityProgress,
        repetitionFatigue: bounded(source.repetitionFatigue, 0),
        franchiseFatigue: bounded(source.franchiseFatigue, 0),
        samples,
        processedEvidenceIds: uniqueStrings(source.processedEvidenceIds, INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT),
    };
};

const normalizeProposal = (raw: unknown, fallback: IndustryIntelligenceState): IndustryIntelligenceProposal | null => {
    const item = record(raw);
    if (!isLane(item.lane) || typeof item.id !== 'string' || !item.id.trim()) return null;
    const allowedStatuses = new Set(['SHADOW', 'PROPOSED', 'ACCEPTED', 'REJECTED', 'EXECUTED', 'EXPIRED', 'SUPERSEDED']);
    return {
        id: item.id.trim(),
        idempotencyKey: text(item.idempotencyKey, item.id.trim()),
        companyId: fallback.companyId,
        companyKind: fallback.companyKind,
        lane: item.lane,
        decisionCycle: whole(item.decisionCycle),
        absoluteWeek: whole(item.absoluteWeek),
        actionFamily: text(item.actionFamily, 'HOLD'),
        optionId: text(item.optionId, 'HOLD'),
        urgency: bounded(item.urgency, 0),
        confidence: bounded(item.confidence, 0),
        expectedExposureMillions: Math.max(0, finite(item.expectedExposureMillions)),
        affordabilityCeilingMillions: Math.max(0, finite(item.affordabilityCeilingMillions)),
        score: normalizeScore(item.score),
        reasonCodes: uniqueStrings(item.reasonCodes, 8) as IndustryIntelligenceReasonCode[],
        uncertaintyKey: text(item.uncertaintyKey, `${item.id}:uncertainty`),
        contentFingerprintId: typeof item.contentFingerprintId === 'string' && item.contentFingerprintId.trim()
            ? item.contentFingerprintId.trim()
            : undefined,
        status: allowedStatuses.has(String(item.status)) ? item.status as IndustryIntelligenceProposal['status'] : 'SHADOW',
        nextReviewAbsoluteWeek: whole(item.nextReviewAbsoluteWeek, whole(item.absoluteWeek) + 1),
    };
};

const normalizeComparison = (raw: unknown, fallback: IndustryIntelligenceState): IndustryIntelligenceShadowComparison | null => {
    const item = record(raw);
    if (!isLane(item.lane) || typeof item.id !== 'string' || !item.id.trim() || typeof item.proposalId !== 'string') return null;
    const divergences = new Set<IndustryIntelligenceShadowDivergence>([
        'MATCH', 'ACT_VS_HOLD', 'ACTION_FAMILY_DIFFERENCE', 'EXPOSURE_BAND_DIFFERENCE',
        'TIMING_DIFFERENCE', 'ELIGIBILITY_DIFFERENCE', 'NO_AUTHORITATIVE_OBSERVATION',
    ]);
    return {
        id: item.id.trim(),
        idempotencyKey: text(item.idempotencyKey, item.id.trim()),
        companyId: fallback.companyId,
        lane: item.lane,
        absoluteWeek: whole(item.absoluteWeek),
        proposalId: item.proposalId,
        shadowActionFamily: text(item.shadowActionFamily, 'HOLD'),
        authoritativeActionFamily: typeof item.authoritativeActionFamily === 'string' ? item.authoritativeActionFamily : null,
        divergence: divergences.has(item.divergence as IndustryIntelligenceShadowDivergence)
            ? item.divergence as IndustryIntelligenceShadowDivergence
            : 'NO_AUTHORITATIVE_OBSERVATION',
    };
};

export const createInitialIndustryIntelligenceState = (
    companyId: string,
    companyKind: IndustryCompanyKind,
    seed: string,
    absoluteWeek: number,
): IndustryIntelligenceState => ({
    schemaVersion: INDUSTRY_INTELLIGENCE_SCHEMA_VERSION,
    companyId,
    companyKind,
    seed,
    lastProcessedAbsoluteWeek: Math.max(0, whole(absoluteWeek) - 1),
    nextDueAbsoluteWeek: createInitialLaneSchedule(companyId, companyKind, seed, absoluteWeek),
    decisionCycleByLane: emptyLaneRecord(() => 0),
    momentum: 50,
    learning: emptyLearningState(),
    proposals: [],
    shadowComparisons: [],
    processedKeys: [],
    content: createInitialIndustryContentState(),
});

export const normalizeIndustryIntelligenceState = (
    raw: unknown,
    fallback: IndustryIntelligenceState,
): IndustryIntelligenceState => {
    const source = record(raw);
    const nextDueSource = record(source.nextDueAbsoluteWeek);
    const cycleSource = record(source.decisionCycleByLane);
    const nextDueAbsoluteWeek = emptyLaneRecord(lane => {
        const fallbackWeek = fallback.nextDueAbsoluteWeek[lane];
        if (fallbackWeek === null) return null;
        const value = Number(nextDueSource[lane]);
        return Number.isFinite(value) ? whole(value) : fallbackWeek;
    });
    const normalized: IndustryIntelligenceState = {
        schemaVersion: INDUSTRY_INTELLIGENCE_SCHEMA_VERSION,
        companyId: fallback.companyId,
        companyKind: isCompanyKind(fallback.companyKind) ? fallback.companyKind : 'PRODUCTION_STUDIO',
        seed: fallback.seed,
        lastProcessedAbsoluteWeek: whole(source.lastProcessedAbsoluteWeek, fallback.lastProcessedAbsoluteWeek),
        nextDueAbsoluteWeek,
        decisionCycleByLane: emptyLaneRecord(lane => whole(cycleSource[lane], fallback.decisionCycleByLane[lane])),
        momentum: bounded(source.momentum, fallback.momentum),
        learning: normalizeLearning(source.learning),
        proposals: [],
        shadowComparisons: [],
        processedKeys: uniqueStrings(source.processedKeys, INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT),
        content: normalizeIndustryContentState(source.content),
    };
    normalized.proposals = (Array.isArray(source.proposals) ? source.proposals : [])
        .map(item => normalizeProposal(item, normalized))
        .filter((item): item is IndustryIntelligenceProposal => item !== null)
        .slice(-INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT);
    normalized.shadowComparisons = (Array.isArray(source.shadowComparisons) ? source.shadowComparisons : [])
        .map(item => normalizeComparison(item, normalized))
        .filter((item): item is IndustryIntelligenceShadowComparison => item !== null)
        .slice(-INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT);
    return normalized;
};

export const compactIndustryIntelligenceState = (
    state: IndustryIntelligenceState,
): IndustryIntelligenceState => {
    const compacted = normalizeIndustryIntelligenceState(
        state,
        createInitialIndustryIntelligenceState(
        state.companyId,
        state.companyKind,
        state.seed,
        Math.max(0, state.lastProcessedAbsoluteWeek + 1),
        ),
    );
    return state.platformMigration
        ? { ...compacted, platformMigration: state.platformMigration }
        : compacted;
};

export interface IndustryIntelligenceFootprint {
    proposalCount: number;
    comparisonCount: number;
    learningSampleCount: number;
    processedEvidenceCount: number;
    processedKeyCount: number;
    contentFingerprintCount: number;
    universeBlueprintCount: number;
    noveltySignatureCount: number;
    materializationKeyCount: number;
    approximateBytes: number;
}

export const getIndustryIntelligenceFootprint = (
    state: IndustryIntelligenceState,
): IndustryIntelligenceFootprint => ({
    proposalCount: state.proposals.length,
    comparisonCount: state.shadowComparisons.length,
    learningSampleCount: state.learning.samples.length,
    processedEvidenceCount: state.learning.processedEvidenceIds.length,
    processedKeyCount: state.processedKeys.length,
    contentFingerprintCount: state.content.selectedFingerprints.length,
    universeBlueprintCount: state.content.universeBlueprints.length,
    noveltySignatureCount: state.content.recentNoveltySignatures.length,
    materializationKeyCount: state.content.materializationKeys.length,
    approximateBytes: new TextEncoder().encode(JSON.stringify(state)).byteLength,
});
