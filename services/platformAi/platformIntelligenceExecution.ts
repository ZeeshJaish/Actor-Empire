import type {
    IndustryIntelligenceProposal,
    PlatformId,
    PlatformIntelligenceOutcome,
    Player,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { STREAMING_TECHNOLOGY_DEFINITIONS } from '../streamingTechnologyCampus';
import { buildPlatformContentCandidatesForIntent, commitPlatformContentCandidate } from './platformAiContentSourcing';
import { commissionPlatformAiOriginal } from './platformAiCommissioning';
import { getPlatformAiSpendingRestrictions } from './platformAiFinancing';
import { choosePlatformMarketExpansion, commitPlatformMarketExpansion } from './platformAiMarkets';
import { choosePlatformContentCandidate } from './platformAiPlanning';
import { hasEligiblePlayerProductionStudio } from './platformAiPlayerCommissions';
import { commitPlatformResearch } from './platformAiResearch';
import { choosePlatformResearchPortfolio } from './platformAiResearchPortfolio';
import { normalizePlatformAiState, resolvePlatformController } from './platformAiState';
import {
    appendPlatformIntelligenceOutcome,
    normalizePlatformIntelligenceMigrationState,
} from './platformIntelligenceMigration';
import { derivePlatformIntelligenceIntent, type PlatformIntelligenceIntent } from './platformIntelligenceIntent';
import {
    compareIndustryShadowDecision,
    observePlatformAuthoritativeDecision,
} from '../industryIntelligence/industryIntelligenceShadow';

export interface ExecutePlatformIntelligenceProposalsInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}

export interface ExecutePlatformIntelligenceProposalsResult {
    world: WorldState;
    changed: boolean;
    outcomes: PlatformIntelligenceOutcome[];
}

interface IntentExecution {
    world: WorldState;
    status: PlatformIntelligenceOutcome['status'];
    reason: string;
    canonicalReferenceIds: string[];
}

const updatePlatform = (
    world: WorldState,
    platformId: PlatformId,
    updater: (platform: NonNullable<WorldState['platforms']>[PlatformId]) => NonNullable<WorldState['platforms']>[PlatformId],
): WorldState => {
    const platform = world.platforms?.[platformId];
    if (!platform) return world;
    return { ...world, platforms: { ...world.platforms!, [platformId]: updater(platform) } };
};

const executeContentIntent = (
    input: ExecutePlatformIntelligenceProposalsInput,
    world: WorldState,
    intent: PlatformIntelligenceIntent,
): IntentExecution => {
    const platform = world.platforms?.[input.platformId];
    if (!platform?.ai) return { world, status: 'REJECTED', reason: 'PLATFORM_NOT_FOUND', canonicalReferenceIds: [] };
    const candidates = buildPlatformContentCandidatesForIntent({ ...input, player: { ...input.player, world }, world }, intent);
    const candidate = choosePlatformContentCandidate({
        player: input.player,
        platformId: input.platformId,
        absoluteWeek: input.absoluteWeek,
        strategyCycle: intent.decisionCycle,
        strategySkill: platform.ai.competence.strategy,
        candidates,
        platform,
    });
    if (!candidate) return { world, status: 'REJECTED', reason: 'NO_CANONICAL_CANDIDATE', canonicalReferenceIds: [] };
    const committed = commitPlatformContentCandidate({
        ...input,
        player: { ...input.player, world },
        world,
        candidate,
    });
    if (!committed.changed || !committed.plan) {
        return { world: committed.world, status: 'REJECTED', reason: committed.reason || 'CANONICAL_COMMIT_REJECTED', canonicalReferenceIds: [] };
    }
    let nextWorld = committed.world;
    if (committed.plan.source === 'COMMISSIONED_ORIGINAL'
        && !hasEligiblePlayerProductionStudio({ ...input.player, world: nextWorld }, input.platformId)) {
        nextWorld = commissionPlatformAiOriginal({
            ...input,
            player: { ...input.player, world: nextWorld },
            world: nextWorld,
            planId: committed.plan.id,
        }).world;
    }
    return { world: nextWorld, status: 'EXECUTED', reason: 'CANONICAL_CONTENT_COMMITTED', canonicalReferenceIds: [committed.plan.id] };
};

const executeResearchIntent = (
    input: ExecutePlatformIntelligenceProposalsInput,
    world: WorldState,
    intent: PlatformIntelligenceIntent,
): IntentExecution => {
    const portfolio = choosePlatformResearchPortfolio({ ...input, player: { ...input.player, world }, world });
    const choices = portfolio.choices.filter(choice => {
        const branch = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === choice.technologyDefinitionId)?.branch;
        return intent.route === 'RESEARCH_LOCALIZATION' ? branch === 'CONTENT_OPERATIONS' : branch !== 'CONTENT_OPERATIONS';
    });
    const choice = choices[0];
    if (!choice) return { world, status: 'REJECTED', reason: portfolio.blockedReason || 'NO_MATCHING_RESEARCH', canonicalReferenceIds: [] };
    const committed = commitPlatformResearch({ ...input, player: { ...input.player, world }, world, choice });
    return committed.changed && committed.item
        ? { world: committed.world, status: 'EXECUTED', reason: 'CANONICAL_RESEARCH_COMMITTED', canonicalReferenceIds: [committed.item.id] }
        : { world: committed.world, status: 'REJECTED', reason: committed.reason, canonicalReferenceIds: [] };
};

const executeMarketIntent = (
    input: ExecutePlatformIntelligenceProposalsInput,
    world: WorldState,
): IntentExecution => {
    const choice = choosePlatformMarketExpansion({ ...input, player: { ...input.player, world }, world });
    if (!choice) return { world, status: 'REJECTED', reason: 'NO_ELIGIBLE_MARKET', canonicalReferenceIds: [] };
    const committed = commitPlatformMarketExpansion({ ...input, player: { ...input.player, world }, world, countryId: choice.countryId });
    return committed.changed && committed.operation
        ? { world: committed.world, status: 'EXECUTED', reason: 'CANONICAL_MARKET_COMMITTED', canonicalReferenceIds: [committed.operation.id] }
        : { world: committed.world, status: 'REJECTED', reason: committed.reason, canonicalReferenceIds: [] };
};

const executeLocalizationIntent = (
    input: ExecutePlatformIntelligenceProposalsInput,
    world: WorldState,
): IntentExecution => {
    const platform = world.platforms?.[input.platformId];
    const jobs = platform?.ai?.localizationJobs.filter(job => !['COMPLETED', 'CANCELLED'].includes(job.status)) || [];
    return jobs.length
        ? { world, status: 'EXECUTED', reason: 'CANONICAL_LOCALIZATION_ACTIVE', canonicalReferenceIds: jobs.map(job => job.id).slice(0, 12) }
        : { world, status: 'HELD', reason: 'NO_COMMITTED_LOCALIZATION_NEED', canonicalReferenceIds: [] };
};

const executeIntent = (
    input: ExecutePlatformIntelligenceProposalsInput,
    world: WorldState,
    intent: PlatformIntelligenceIntent,
): IntentExecution => {
    if (intent.route === 'HOLD') return { world, status: 'HELD', reason: intent.blockReason || 'INTELLIGENCE_HOLD', canonicalReferenceIds: [] };
    if (['COMMISSION_ORIGINAL', 'LICENSE_TITLE', 'ACQUIRE_CATALOGUE', 'TRANSFER_OWNED_TITLE'].includes(intent.route)) {
        return executeContentIntent(input, world, intent);
    }
    if (intent.route === 'RESEARCH_TECHNOLOGY' || intent.route === 'RESEARCH_LOCALIZATION') {
        return executeResearchIntent(input, world, intent);
    }
    if (intent.route === 'ENTER_MARKET') return executeMarketIntent(input, world);
    return executeLocalizationIntent(input, world);
};

const isRestrictedForProposal = (
    platform: NonNullable<WorldState['platforms']>[PlatformId],
    proposal: IndustryIntelligenceProposal,
    absoluteWeek: number,
): boolean => {
    const restrictions = getPlatformAiSpendingRestrictions(platform, absoluteWeek);
    if (proposal.lane === 'CONTENT_STRATEGY') return restrictions.blocksNewGreenlights || restrictions.blocksNewBids;
    if (proposal.lane === 'CAPABILITY_GROWTH') return restrictions.blocksNewResearch;
    if (proposal.lane === 'MARKET_EXPANSION') return restrictions.blocksExpansion;
    return false;
};

export const executePlatformIntelligenceProposals = (
    input: ExecutePlatformIntelligenceProposalsInput,
): ExecutePlatformIntelligenceProposalsResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, outcomes: [] };
    }
    const source = input.world.platforms?.[input.platformId];
    if (!source) return { world: input.world, changed: false, outcomes: [] };
    let normalized = normalizePlatformAiState(source, input.player.id, input.absoluteWeek);
    const migration = normalizePlatformIntelligenceMigrationState(
        normalized.ai!.intelligence!.platformMigration,
        input.absoluteWeek,
    );
    if (!normalized.ai!.intelligence!.platformMigration) {
        normalized = {
            ...normalized,
            ai: {
                ...normalized.ai!,
                intelligence: {
                    ...normalized.ai!.intelligence!,
                    platformMigration: migration,
                },
            },
        };
    }
    const proposals = normalized.ai!.intelligence!.proposals
        .filter(proposal => proposal.absoluteWeek >= migration.activatedAtAbsoluteWeek)
        .filter(proposal => proposal.absoluteWeek <= input.absoluteWeek)
        .filter(proposal => !migration.processedProposalKeys.includes(proposal.idempotencyKey))
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id));
    if (!proposals.length) return { world: input.world, changed: false, outcomes: [] };
    let world = updatePlatform(input.world, input.platformId, () => normalized);
    const outcomes: PlatformIntelligenceOutcome[] = [];
    for (const proposal of proposals) {
        const platform = world.platforms![input.platformId];
        const fingerprint = platform.ai!.intelligence!.content.selectedFingerprints.find(item => item.id === proposal.contentFingerprintId);
        const intent = derivePlatformIntelligenceIntent({
            proposal,
            fingerprint,
            spendingRestricted: isRestrictedForProposal(platform, proposal, input.absoluteWeek),
        });
        const platformBeforeExecution = platform;
        const execution = executeIntent(input, world, intent);
        world = execution.world;
        const outcome: PlatformIntelligenceOutcome = {
            id: createDeterministicId('platform_intelligence_outcome', proposal.idempotencyKey),
            proposalId: proposal.id,
            proposalKey: proposal.idempotencyKey,
            intentRoute: intent.route,
            status: execution.status,
            absoluteWeek: input.absoluteWeek,
            reason: execution.reason,
            canonicalReferenceIds: execution.canonicalReferenceIds,
        };
        outcomes.push(outcome);
        world = updatePlatform(world, input.platformId, current => {
            const compared = compareIndustryShadowDecision({
                state: current.ai!.intelligence!,
                proposal,
                observation: observePlatformAuthoritativeDecision(platformBeforeExecution, current, proposal),
            }).state;
            return {
            ...current,
            ai: {
                ...current.ai!,
                intelligence: {
                    ...compared,
                    platformMigration: appendPlatformIntelligenceOutcome(compared.platformMigration!, outcome),
                    proposals: compared.proposals.map(item => item.id === proposal.id
                        ? { ...item, status: execution.status === 'REJECTED' ? 'REJECTED' : 'EXECUTED' }
                        : item),
                    content: {
                        ...compared.content,
                        selectedFingerprints: compared.content.selectedFingerprints.map(item => (
                            item.id === proposal.contentFingerprintId && execution.status === 'EXECUTED'
                                ? { ...item, lifecycle: 'COMMITTED' as const }
                                : item
                        )),
                    },
                },
            },
        }; });
    }
    return { world, changed: outcomes.length > 0, outcomes };
};
