import type {
    Genre,
    IndustryContentFingerprint,
    IndustryIntelligenceProposal,
    PlatformIntelligenceIntentRoute,
    ProjectType,
    TargetAudience,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';

export interface PlatformIntelligenceIntent {
    id: string;
    proposalId: string;
    proposalKey: string;
    companyId: string;
    lane: IndustryIntelligenceProposal['lane'];
    decisionCycle: number;
    route: PlatformIntelligenceIntentRoute;
    absoluteWeek: number;
    expectedExposureMillions: number;
    affordabilityCeilingMillions: number;
    contentFingerprintId: string | null;
    projectType: ProjectType | null;
    primaryGenre: Genre | null;
    targetAudience: TargetAudience | null;
    targetBudgetMillions: number;
    priorityMarket: string | null;
    originalLanguage: string | null;
    preferPlayerStudio: boolean;
    blockReason: string | null;
}

export interface DerivePlatformIntelligenceIntentInput {
    proposal: IndustryIntelligenceProposal;
    fingerprint?: IndustryContentFingerprint;
    spendingRestricted: boolean;
}

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;

const contentRoute = (fingerprint: IndustryContentFingerprint): PlatformIntelligenceIntentRoute => {
    if (fingerprint.sourceIntent === 'LICENSED_WORK') return 'LICENSE_TITLE';
    if (fingerprint.sourceIntent === 'ACQUIRED_IP') return 'ACQUIRE_CATALOGUE';
    return 'COMMISSION_ORIGINAL';
};

const audienceFromFingerprint = (fingerprint: IndustryContentFingerprint): TargetAudience => {
    const combined = `${fingerprint.targetAudience}:${fingerprint.primaryGenre}:${fingerprint.tone}`.toUpperCase();
    if (combined.includes('FAMILY') || combined.includes('CHILD')) return 'PG';
    if (combined.includes('HORROR') || combined.includes('ADULT') || combined.includes('DARK')) return 'R';
    return 'PG-13';
};

const routeForProposal = (
    proposal: IndustryIntelligenceProposal,
    fingerprint?: IndustryContentFingerprint,
): PlatformIntelligenceIntentRoute => {
    if (proposal.actionFamily === 'HOLD' || proposal.actionFamily === 'REDUCE_SPEND') return 'HOLD';
    if (proposal.lane === 'CONTENT_STRATEGY' && proposal.actionFamily === 'DEVELOP_CONTENT') {
        return fingerprint ? contentRoute(fingerprint) : 'HOLD';
    }
    if (proposal.lane === 'CAPABILITY_GROWTH') {
        if (proposal.actionFamily === 'RESEARCH_LOCALIZATION') return 'RESEARCH_LOCALIZATION';
        if (proposal.actionFamily === 'RESEARCH_TECHNOLOGY') return 'RESEARCH_TECHNOLOGY';
    }
    if (proposal.lane === 'MARKET_EXPANSION') {
        if (proposal.actionFamily === 'ENTER_MARKET') return 'ENTER_MARKET';
        if (proposal.actionFamily === 'LOCALIZE_CATALOGUE') return 'LOCALIZE_COMMITTED_CONTENT';
    }
    return 'HOLD';
};

export const derivePlatformIntelligenceIntent = (
    input: DerivePlatformIntelligenceIntentInput,
): PlatformIntelligenceIntent => {
    const missingFingerprint = input.proposal.lane === 'CONTENT_STRATEGY'
        && input.proposal.actionFamily === 'DEVELOP_CONTENT'
        && (!input.fingerprint || input.fingerprint.id !== input.proposal.contentFingerprintId);
    const blocked = input.spendingRestricted && input.proposal.actionFamily !== 'HOLD';
    const route = missingFingerprint || blocked
        ? 'HOLD'
        : routeForProposal(input.proposal, input.fingerprint);
    const fingerprint = missingFingerprint ? undefined : input.fingerprint;
    const affordability = roundMillions(input.proposal.affordabilityCeilingMillions);
    const idealHigh = fingerprint?.budgetSuitability.idealHighMillions || 0;
    return {
        id: createDeterministicId('platform_intelligence_intent', input.proposal.idempotencyKey),
        proposalId: input.proposal.id,
        proposalKey: input.proposal.idempotencyKey,
        companyId: input.proposal.companyId,
        lane: input.proposal.lane,
        decisionCycle: input.proposal.decisionCycle,
        route,
        absoluteWeek: input.proposal.absoluteWeek,
        expectedExposureMillions: roundMillions(input.proposal.expectedExposureMillions),
        affordabilityCeilingMillions: affordability,
        contentFingerprintId: fingerprint?.id || null,
        projectType: fingerprint ? (fingerprint.format === 'MOVIE' ? 'MOVIE' : 'SERIES') : null,
        primaryGenre: fingerprint?.primaryGenre || null,
        targetAudience: fingerprint ? audienceFromFingerprint(fingerprint) : null,
        targetBudgetMillions: fingerprint ? roundMillions(Math.min(idealHigh, affordability)) : 0,
        priorityMarket: fingerprint?.priorityMarket || null,
        originalLanguage: fingerprint?.originalLanguage || null,
        preferPlayerStudio: fingerprint?.sourceIntent === 'INDIVIDUAL_COMMISSION',
        blockReason: missingFingerprint ? 'MISSING_FINGERPRINT' : blocked ? 'SPENDING_RESTRICTED' : null,
    };
};
