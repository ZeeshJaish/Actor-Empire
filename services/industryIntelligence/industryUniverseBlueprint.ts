import type { IndustryContentFingerprint, IndustryUniverseBlueprint } from '../../types';
import { createDeterministicId, hashDeterministicSeed } from '../deterministicRandom';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';

export type IndustryUniverseFoundingMode = 'PLANNED' | 'EMERGENT';
export type IndustryUniverseEvaluationReason = 'INSUFFICIENT_RUNWAY' | 'INSUFFICIENT_CAPABILITY' | 'INSUFFICIENT_CAPACITY' | 'SPENDING_RESTRICTED' | 'WEAK_OWNERSHIP_BASIS' | 'FREQUENCY_GATE' | 'BLUEPRINT_LIMIT';

export interface EvaluateIndustryUniverseBlueprintInput {
    context: IndustryIntelligenceContext;
    fingerprint: IndustryContentFingerprint;
    compatibleSuccessfulFingerprints: IndustryContentFingerprint[];
    existingBlueprints: IndustryUniverseBlueprint[];
}

export interface IndustryUniverseBlueprintEvaluation {
    eligible: boolean;
    mode: IndustryUniverseFoundingMode | null;
    confidence: number;
    foundingRoll: number;
    reasonCodes: IndustryUniverseEvaluationReason[];
}

const bounded = (value: number): number => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

export const evaluateIndustryUniverseBlueprint = (
    input: EvaluateIndustryUniverseBlueprintInput,
): IndustryUniverseBlueprintEvaluation => {
    const { context, fingerprint } = input;
    const reasons: IndustryUniverseEvaluationReason[] = [];
    const creative = context.capabilities.CREATIVE || 0;
    const production = context.capabilities.PRODUCTION || 0;
    if (context.condition.runwayWeeks < 65) reasons.push('INSUFFICIENT_RUNWAY');
    if (creative < 62 || production < 60) reasons.push('INSUFFICIENT_CAPABILITY');
    if (context.condition.capacityPressure > 78 || context.condition.overextension > 82) reasons.push('INSUFFICIENT_CAPACITY');
    if (context.condition.spendingRestricted) reasons.push('SPENDING_RESTRICTED');
    if (!['ORIGINAL', 'INTERNAL_DEVELOPMENT', 'PLATFORM_ORIGINAL', 'ACQUIRED_IP', 'INHERITED'].includes(fingerprint.sourceIntent)) reasons.push('WEAK_OWNERSHIP_BASIS');
    if (input.existingBlueprints.filter(item => !['FAILED', 'RETIRED'].includes(item.lifecycle)).length >= 6) reasons.push('BLUEPRINT_LIMIT');
    const compatibleCount = input.compatibleSuccessfulFingerprints.filter(item => (
        item.primaryGenre === fingerprint.primaryGenre || item.theme === fingerprint.theme || item.setting === fingerprint.setting
    )).length;
    const mode: IndustryUniverseFoundingMode = compatibleCount >= 3 ? 'EMERGENT' : 'PLANNED';
    const confidence = bounded(
        context.identity.franchiseAppetite * 0.24 + creative * 0.2 + production * 0.16
        + context.condition.recentResultStrength * 0.16 + fingerprint.noveltyScore * 0.14
        + context.condition.audienceTrust * 0.1 - context.condition.franchiseFatigue * 0.22,
    );
    const foundingRoll = hashDeterministicSeed(`${context.seed}:${context.companyId}:${fingerprint.id}:${mode.toLowerCase()}`) % 100;
    const threshold = mode === 'EMERGENT'
        ? Math.max(12, Math.min(42, Math.round((confidence - 55) * 0.9 + compatibleCount * 4)))
        : Math.max(4, Math.min(24, Math.round((confidence - 55) * 0.55 + context.identity.franchiseAppetite * 0.08)));
    if (foundingRoll >= threshold) reasons.push('FREQUENCY_GATE');
    return { eligible: reasons.length === 0, mode: reasons.length === 0 ? mode : null, confidence, foundingRoll, reasonCodes: reasons };
};

export interface CreateIndustryUniverseBlueprintInput {
    evaluation: IndustryUniverseBlueprintEvaluation;
    context: IndustryIntelligenceContext;
    fingerprint: IndustryContentFingerprint;
}

export const createIndustryUniverseBlueprint = (
    input: CreateIndustryUniverseBlueprintInput,
): IndustryUniverseBlueprint => {
    if (!input.evaluation.eligible || !input.evaluation.mode) throw new Error('Universe blueprint is not eligible.');
    const { context, fingerprint } = input;
    const seed = `${context.seed}:${fingerprint.id}:universe_blueprint`;
    return {
        id: createDeterministicId('industry_universe_blueprint', seed), seed,
        ownerCompanyId: context.companyId, ownerCompanyKind: context.companyKind, anchorFingerprintId: fingerprint.id,
        coreWorldSignature: [fingerprint.setting, fingerprint.period, fingerprint.theme, fingerprint.primaryGenre].join('|'),
        creativePillars: [...new Set([fingerprint.theme, fingerprint.tone, fingerprint.subgenre])],
        supportedFormats: [...new Set([fingerprint.format, 'MOVIE' as const])],
        branchFamilies: ['CORE'], currentSagaLabel: input.evaluation.mode === 'EMERGENT' ? 'Emergence' : 'Origins', currentPhaseLabel: 'Foundation',
        plannedCadenceWeeks: Math.max(26, Math.round(104 - context.identity.franchiseAppetite * 0.55)),
        financialScale: bounded((context.identity.scale + fingerprint.commercialIntent + fingerprint.starPowerTarget) / 3),
        crossoverPotential: bounded((context.identity.franchiseAppetite + fingerprint.commercialIntent) / 2),
        confidence: input.evaluation.confidence, momentum: bounded(context.condition.momentum), fatigue: bounded(context.condition.franchiseFatigue),
        lifecycle: input.evaluation.mode === 'EMERGENT' ? 'EMERGING' : 'PLANNED',
        createdAtAbsoluteWeek: context.absoluteWeek, updatedAtAbsoluteWeek: context.absoluteWeek,
    };
};

export interface AdvanceIndustryUniverseBlueprintInput {
    blueprint: IndustryUniverseBlueprint;
    absoluteWeek: number;
    anchorOutcome: number;
    establishedBranchCount: number;
    audienceFamiliarity: number;
    capacityPressure: number;
    requestedEvent: boolean;
}

export const advanceIndustryUniverseBlueprint = (
    input: AdvanceIndustryUniverseBlueprintInput,
): { blueprint: IndustryUniverseBlueprint; eventEligible: boolean } => {
    const eventEligible = input.requestedEvent
        && input.establishedBranchCount >= 3
        && input.audienceFamiliarity >= 65
        && input.capacityPressure <= 72
        && input.blueprint.fatigue < 72
        && ['ACTIVE', 'EMERGING', 'MATERIALIZED'].includes(input.blueprint.lifecycle);
    let lifecycle = input.blueprint.lifecycle;
    if (input.anchorOutcome < 35 && ['PLANNED', 'EMERGING'].includes(lifecycle)) lifecycle = 'FAILED';
    else if (input.blueprint.fatigue >= 80 || input.capacityPressure > 90) lifecycle = 'PAUSED';
    else if (input.anchorOutcome >= 65 && ['PLANNED', 'EMERGING'].includes(lifecycle)) lifecycle = 'ACTIVE';
    const blueprint: IndustryUniverseBlueprint = {
        ...input.blueprint,
        momentum: bounded(input.blueprint.momentum * 0.68 + input.anchorOutcome * 0.32),
        fatigue: bounded(input.blueprint.fatigue + (input.requestedEvent ? 8 : -2)),
        lifecycle,
        branchFamilies: input.establishedBranchCount > 1
            ? [...new Set([...input.blueprint.branchFamilies, ...Array.from({ length: Math.min(6, input.establishedBranchCount - 1) }, (_, index) => `BRANCH_${index + 1}`)])]
            : input.blueprint.branchFamilies,
        updatedAtAbsoluteWeek: Math.max(input.blueprint.updatedAtAbsoluteWeek, Math.round(input.absoluteWeek)),
    };
    return { blueprint, eventEligible };
};
