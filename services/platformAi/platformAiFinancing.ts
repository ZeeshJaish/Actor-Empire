import type {
    PlatformAiDistressEpisode,
    PlatformAiExternalRecapitalization,
    PlatformAiSpendingRestrictions,
    PlatformState,
    Player,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { resolvePlatformController } from './platformAiState';

const FUNDING_COOLDOWN_WEEKS = 104;
const FUNDING_RESTRICTION_WEEKS = 13;

const clamp = (value: unknown, min: number, max: number): number => {
    const numeric = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : min));
};
const roundMillions = (value: unknown): number => Math.round(clamp(value, 0, Number.MAX_SAFE_INTEGER) * 1_000_000) / 1_000_000;
const average = (values: number[]): number => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

export interface PlatformAiExternalFundingQuoteInput {
    player: Player;
    platform: PlatformState;
    episode: PlatformAiDistressEpisode;
    absoluteWeek: number;
    competitivePressure: number;
}

export interface PlatformAiExternalFundingQuote {
    eligible: boolean;
    amountMillions: number;
    confidence: number;
    investorArchetype: PlatformAiExternalRecapitalization['investorArchetype'];
    dilutionPercent: number;
    autonomyPenalty: number;
    valuationConfidenceMultiplier: number;
    reason: string;
}

export interface PlatformAiAdministrationOutcomeInput {
    player: Player;
    platform: PlatformState;
    episode: PlatformAiDistressEpisode;
    absoluteWeek: number;
}

export interface PlatformAiAdministrationOutcome {
    outcome: 'ACQUISITION_AVAILABLE' | 'REGIONAL_DOWNSIZE' | 'DORMANT';
    referenceId: string | null;
    reason: string;
}

const investorArchetypeFor = (
    input: PlatformAiExternalFundingQuoteInput,
): PlatformAiExternalRecapitalization['investorArchetype'] => {
    const options: PlatformAiExternalRecapitalization['investorArchetype'][] = [
        'PRIVATE_EQUITY', 'MEDIA_GROUP', 'TECH_GROUP', 'TELECOM_GROUP', 'SOVEREIGN_FUND',
    ];
    const rng = createDeterministicRng(
        `${input.player.id}:platform-ai-funding:${input.platform.id}:${input.episode.id}:${input.absoluteWeek}`,
    );
    return options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
};

export const quotePlatformAiExternalRecapitalization = (
    input: PlatformAiExternalFundingQuoteInput,
): PlatformAiExternalFundingQuote => {
    const investorArchetype = investorArchetypeFor(input);
    const ineligible = (reason: string): PlatformAiExternalFundingQuote => ({
        eligible: false,
        amountMillions: 0,
        confidence: 0,
        investorArchetype,
        dilutionPercent: 0,
        autonomyPenalty: 0,
        valuationConfidenceMultiplier: 1,
        reason,
    });
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return ineligible('Player-controlled platforms must use player-facing financing.');
    }
    const ai = input.platform.ai;
    if (!ai || ai.restructuringFailedAtAbsoluteWeek === null) {
        return ineligible('External investors wait for a persisted restructuring failure.');
    }
    if (ai.externalRecapitalizations.some(record => record.episodeId === input.episode.id)) {
        return ineligible('This distress episode already received its single recapitalization decision.');
    }
    const lastSettled = ai.externalRecapitalizations
        .filter(record => record.status === 'SETTLED' && record.settledAtAbsoluteWeek !== null)
        .sort((left, right) => right.settledAtAbsoluteWeek! - left.settledAtAbsoluteWeek!)[0];
    if (lastSettled?.cooldownUntilAbsoluteWeek !== null
        && lastSettled?.cooldownUntilAbsoluteWeek !== undefined
        && input.absoluteWeek < lastSettled.cooldownUntilAbsoluteWeek) {
        return ineligible('External funding remains inside its 104-week cooldown.');
    }
    const history = ai.financeHistory.slice(-13);
    const averageRevenue = average(history.map(snapshot => clamp(snapshot.revenueMillions, 0, Number.MAX_SAFE_INTEGER)));
    const averageMandatoryCost = average(history.map(snapshot => clamp(
        snapshot.mandatoryCostAccruedMillions || snapshot.operatingCostMillions,
        0,
        Number.MAX_SAFE_INTEGER,
    )));
    const latest = history.at(-1);
    const arrearsMillions = latest
        ? roundMillions(
            latest.unfundedMandatoryCostMillions
            + latest.unfundedSettledObligationCostMillions
            + latest.unfundedFinancingCostMillions,
        )
        : 0;
    const targetReserveMillions = roundMillions(
        latest?.reserveTargetMillions
        || averageMandatoryCost * PLATFORM_AI_PROFILES[input.platform.id].targetRunwayWeeks,
    );
    const reserveNeedMillions = roundMillions(Math.max(0, targetReserveMillions * 0.5 - input.platform.cashReserve));
    const actualNeedMillions = roundMillions(ai.debtMillions + arrearsMillions + reserveNeedMillions);
    if (actualNeedMillions <= 0) return ineligible('The platform has no debt, arrears, or reserve shortfall to finance.');

    const technologyValues = Object.values(ai.capabilities.technologyLevels);
    const technologyScore = average(technologyValues.map(value => clamp(value, 0, 100)));
    const catalogueScore = clamp(ai.releaseMemory.length * 6 + ai.rightsContracts.length * 2, 0, 100);
    const margin = averageRevenue > 0 ? (averageRevenue - averageMandatoryCost) / averageRevenue : -1;
    const assetStrength = clamp(
        input.platform.reputation * 0.24
        + clamp(input.platform.subscribers / 2, 0, 100) * 0.22
        + catalogueScore * 0.18
        + technologyScore * 0.18
        + clamp(input.platform.valuation / 10, 0, 100) * 0.18,
        0,
        100,
    );
    const debtBurden = ai.debtMillions / Math.max(1, averageRevenue * 52);
    const confidence = clamp(
        assetStrength / 100 * 0.62
        + clamp((margin + 1) / 2, 0, 1) * 0.18
        + clamp(input.competitivePressure, 0, 1) * 0.12
        + clamp(ai.competence.finance / 10, 0, 1) * 0.08
        - clamp(debtBurden / 2, 0, 0.35),
        0,
        1,
    );
    if (confidence < 0.35) return ineligible('Investors found no credible recovery value after restructuring.');

    const scaleCapMillions = Math.min(averageRevenue * 13, averageMandatoryCost * 13);
    const valuationCapMillions = Math.max(0, input.platform.valuation * 1_000 * 0.15);
    const amountMillions = roundMillions(Math.min(
        actualNeedMillions,
        scaleCapMillions * (0.55 + confidence * 0.45),
        targetReserveMillions * 0.5 + ai.debtMillions + arrearsMillions,
        valuationCapMillions,
    ));
    if (amountMillions <= 0) return ineligible('The scale and valuation caps produced no investable amount.');
    return {
        eligible: true,
        amountMillions,
        confidence: Math.round(confidence * 10_000) / 10_000,
        investorArchetype,
        dilutionPercent: Math.round(clamp(35 - confidence * 25, 5, 35) * 100) / 100,
        autonomyPenalty: Math.round(clamp(40 - confidence * 25, 5, 40) * 100) / 100,
        valuationConfidenceMultiplier: Math.round(clamp(0.65 + confidence * 0.3, 0.65, 0.95) * 10_000) / 10_000,
        reason: 'Outside investors offered bounded recovery capital against the platform assets and operating scale.',
    };
};

export const getPlatformAiPostFundingRestrictions = (
    absoluteWeek: number,
): PlatformAiSpendingRestrictions => ({
    source: 'EXTERNAL_RECAPITALIZATION',
    blocksNewBids: true,
    blocksNewGreenlights: true,
    blocksNewResearch: true,
    blocksExpansion: true,
    expiresAtAbsoluteWeek: absoluteWeek + FUNDING_RESTRICTION_WEEKS,
});

export const getPlatformAiSpendingRestrictions = (
    platform: PlatformState,
    absoluteWeek: number,
): PlatformAiSpendingRestrictions => {
    const restrictions = platform.ai?.spendingRestrictions;
    if (!restrictions) {
        return {
            source: 'NONE',
            blocksNewBids: false,
            blocksNewGreenlights: false,
            blocksNewResearch: false,
            blocksExpansion: false,
            expiresAtAbsoluteWeek: null,
        };
    }
    if (restrictions.expiresAtAbsoluteWeek !== null
        && absoluteWeek >= restrictions.expiresAtAbsoluteWeek
        && platform.ai?.status === 'ACTIVE') {
        return {
            source: 'NONE',
            blocksNewBids: false,
            blocksNewGreenlights: false,
            blocksNewResearch: false,
            blocksExpansion: false,
            expiresAtAbsoluteWeek: null,
        };
    }
    return restrictions;
};

export const createPlatformAiFundingRecord = (
    input: PlatformAiExternalFundingQuoteInput,
    quote: PlatformAiExternalFundingQuote,
): PlatformAiExternalRecapitalization => ({
    id: createDeterministicId('platform_ai_external_recapitalization', input.platform.id, input.episode.id),
    idempotencyKey: `platform-ai-external-recapitalization:${input.platform.id}:${input.episode.id}`,
    episodeId: input.episode.id,
    platformId: input.platform.id,
    status: quote.eligible ? 'OFFERED' : 'FAILED',
    investorArchetype: quote.investorArchetype,
    offeredMillions: quote.amountMillions,
    settledMillions: 0,
    arrearsReductionMillions: 0,
    debtReductionMillions: 0,
    cashRemainderMillions: 0,
    dilutionPercent: quote.dilutionPercent,
    autonomyPenalty: quote.autonomyPenalty,
    valuationConfidenceMultiplier: quote.valuationConfidenceMultiplier,
    offeredAtAbsoluteWeek: input.absoluteWeek,
    settledAtAbsoluteWeek: null,
    cooldownUntilAbsoluteWeek: null,
    reason: quote.reason,
});

export const choosePlatformAiAdministrationOutcome = (
    input: PlatformAiAdministrationOutcomeInput,
): PlatformAiAdministrationOutcome => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return {
            outcome: 'DORMANT',
            referenceId: null,
            reason: 'Player-controlled companies must resolve insolvency through player-facing systems.',
        };
    }
    const ai = input.platform.ai!;
    const assetValueMillions = input.platform.valuation * 1_000
        + input.platform.subscribers * 25
        + ai.releaseMemory.length * 20
        + ai.rightsContracts.length * 5;
    if (assetValueMillions > ai.debtMillions * 1.25 && input.platform.reputation >= 45) {
        return {
            outcome: 'ACQUISITION_AVAILABLE',
            referenceId: createDeterministicId('platform_ai_administration_acquisition', input.platform.id, input.episode.id),
            reason: 'The remaining platform assets justify a distressed acquisition process.',
        };
    }
    const activeMarkets = ai.marketOperations.filter(operation => operation.status === 'ACTIVE').length;
    if (activeMarkets > 0 && (ai.releaseMemory.length > 0 || ai.rightsContracts.length > 0)) {
        return {
            outcome: 'REGIONAL_DOWNSIZE',
            referenceId: createDeterministicId('platform_ai_administration_downsize', input.platform.id, input.episode.id),
            reason: 'The platform can survive only as a smaller regional operator.',
        };
    }
    return {
        outcome: 'DORMANT',
        referenceId: null,
        reason: 'No investable or regionally viable operating core remained.',
    };
};

export const PLATFORM_AI_EXTERNAL_FUNDING_COOLDOWN_WEEKS = FUNDING_COOLDOWN_WEEKS;
