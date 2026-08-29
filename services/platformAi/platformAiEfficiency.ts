import type {
    PlatformAiEfficiencySnapshot,
    PlatformAiOperatingEfficiencyPolicy,
    PlatformAiRecurringEfficiencySnapshot,
} from '../../types';
import { clampPlatformAiEfficiencyPolicy } from './platformAiOperatingProfiles';

export type PlatformAiEfficiencyKind = PlatformAiEfficiencySnapshot['kind'];

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;

export const createPlatformAiRecurringEfficiencySnapshot = (
    standardEligibleCostMillions: number,
    configuredMultiplier: number,
    controller: 'AI' | 'PLAYER' = 'AI',
): PlatformAiRecurringEfficiencySnapshot => {
    const standardCost = roundMillions(standardEligibleCostMillions);
    const costMultiplier = controller === 'PLAYER'
        ? 1
        : Math.max(0.88, Math.min(0.95, Number(configuredMultiplier) || 0.9));
    const appliedCostMillions = roundMillions(standardCost * costMultiplier);
    return {
        controller,
        policyVersion: 1,
        costMultiplier,
        standardEligibleCostMillions: standardCost,
        appliedEligibleCostMillions: appliedCostMillions,
        savingMillions: roundMillions(standardCost - appliedCostMillions),
    };
};

const costMultiplierFor = (
    policy: PlatformAiOperatingEfficiencyPolicy,
    kind: PlatformAiEfficiencyKind,
): number => (
    kind === 'RESEARCH'
        ? policy.researchCostMultiplier
        : kind === 'INSTALLATION'
            ? policy.installationCostMultiplier
            : kind === 'MARKET_ENTRY'
                ? policy.marketEntryCostMultiplier
                : policy.localizationCostMultiplier
);

export const createPlatformAiEfficiencySnapshot = (
    standardCostMillions: number,
    standardLeadWeeks: number,
    policyValue: Partial<PlatformAiOperatingEfficiencyPolicy> | null | undefined,
    kind: PlatformAiEfficiencyKind,
    controller: 'AI' | 'PLAYER' = 'AI',
): PlatformAiEfficiencySnapshot => {
    const policy = controller === 'PLAYER'
        ? {
            recurringOperationsCostMultiplier: 1,
            researchCostMultiplier: 1, installationCostMultiplier: 1,
            marketEntryCostMultiplier: 1, localizationCostMultiplier: 1,
            leadTimeMultiplier: 1, localizationThroughputMultiplier: 1,
            localPartnershipEligible: false,
        }
        : clampPlatformAiEfficiencyPolicy(policyValue);
    const standardCost = roundMillions(standardCostMillions);
    const standardWeeks = Math.max(0, Math.round(Number(standardLeadWeeks) || 0));
    const costMultiplier = costMultiplierFor(policy, kind);
    const appliedCostMillions = roundMillions(standardCost * costMultiplier);
    const appliedLeadWeeks = standardWeeks === 0
        ? 0
        : Math.max(1, Math.ceil(standardWeeks * policy.leadTimeMultiplier));
    return {
        controller,
        policyVersion: 1,
        kind,
        costMultiplier,
        leadTimeMultiplier: policy.leadTimeMultiplier,
        standardCostMillions: standardCost,
        appliedCostMillions,
        savingMillions: roundMillions(standardCost - appliedCostMillions),
        standardLeadWeeks: standardWeeks,
        appliedLeadWeeks,
    };
};

export const normalizePlatformAiEfficiencySnapshot = (
    value: unknown,
    standardCostMillions: number,
    standardLeadWeeks: number,
    kind: PlatformAiEfficiencyKind,
): PlatformAiEfficiencySnapshot | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<PlatformAiEfficiencySnapshot>;
    const rawCostMultiplier = Number(raw.costMultiplier);
    const rawLeadTimeMultiplier = Number(raw.leadTimeMultiplier);
    if (!Number.isFinite(rawCostMultiplier) || !Number.isFinite(rawLeadTimeMultiplier)) return null;
    const basePolicy: Partial<PlatformAiOperatingEfficiencyPolicy> = {
        researchCostMultiplier: kind === 'RESEARCH' ? rawCostMultiplier : undefined,
        installationCostMultiplier: kind === 'INSTALLATION' ? rawCostMultiplier : undefined,
        marketEntryCostMultiplier: kind === 'MARKET_ENTRY' ? rawCostMultiplier : undefined,
        localizationCostMultiplier: kind === 'LOCALIZATION' ? rawCostMultiplier : undefined,
        leadTimeMultiplier: rawLeadTimeMultiplier,
    };
    return createPlatformAiEfficiencySnapshot(
        standardCostMillions,
        standardLeadWeeks,
        basePolicy,
        kind,
        raw.controller === 'PLAYER' ? 'PLAYER' : 'AI',
    );
};
