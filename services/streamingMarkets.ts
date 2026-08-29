import type {
    NewsItem,
    OwnedStreamingCostCommitment,
    OwnedStreamingLedgerEntry,
    OwnedStreamingMarketOperation,
    OwnedStreamingMarketPolicySnapshot,
    OwnedStreamingPlatformState,
    Player,
    StreamingMarketClearanceOutcome,
    StreamingMarketClearanceStage,
    StreamingMarketEntryKind,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getStreamingCountryMarketProfile, normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import {
    activateStreamingMarketOperation,
    advanceStreamingMarketOperation,
    createStreamingCountryMarketOperation,
    getStreamingMarketWeeklyOperatingCost,
    resolveStreamingMarketRequirementCore,
    resumeStreamingMarketOperationCore,
    startStreamingMarketOperation,
} from './streamingMarketsCore';

/** Filing is a founder action, not a weekly chore. Government review then
    advances automatically with the game clock. Follow-up paperwork costs less
    attention than opening or reopening a complete country file. */
export const STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY = 5;
export const STREAMING_MARKET_REQUIREMENT_ENERGY = 3;
export const STREAMING_MARKET_REAPPLICATION_ENERGY = 5;

const countryName = (operation: OwnedStreamingMarketOperation): string => operation.countryProfile?.country || operation.countryId || operation.scopeId;
const weeklyOperatingCostFor = getStreamingMarketWeeklyOperatingCost;

const ledgerEntry = (
    platform: OwnedStreamingPlatformState,
    operation: OwnedStreamingMarketOperation,
    absoluteWeek: number,
    suffix: string,
    type: OwnedStreamingLedgerEntry['type'],
    summary: string,
    metadata?: OwnedStreamingLedgerEntry['metadata'],
): OwnedStreamingLedgerEntry => {
    const key = `market:${operation.id}:${suffix}`;
    return { id: createDeterministicId('streaming_event', platform.simulationSeed, key), idempotencyKey: key, absoluteWeek, type, summary, source: 'WEEK_PROCESSOR', metadata };
};
const marketNews = (operation: OwnedStreamingMarketOperation, absoluteWeek: number, headline: string, subtext: string, impactLevel: NewsItem['impactLevel']): NewsItem => ({
    id: createDeterministicId('news_market', operation.id, absoluteWeek, headline), headline, subtext, category: 'INDUSTRY',
    week: ((absoluteWeek - 1) % 52) + 1, year: Math.floor((absoluteWeek - 1) / 52), impactLevel,
});
const addUniqueNews = (player: Player, additions: NewsItem[]): NewsItem[] => {
    const ids = new Set((player.news || []).map(item => item.id));
    return [...additions.filter(item => !ids.has(item.id)), ...(player.news || [])].slice(0, 100);
};

export interface StreamingMarketMutationResult {
    player: Player;
    changed: boolean;
    reason: 'SAVED' | 'STARTED' | 'ADVANCED' | 'RESOLVED' | 'REAPPLIED' | 'INVALID_STATE' | 'NO_MARKETS' | 'INSUFFICIENT_TREASURY' | 'INSUFFICIENT_ENERGY' | 'ALREADY_STARTED' | 'TOO_EARLY';
    shortfall: number;
    amount: number;
    energyCost?: number;
}
export interface StreamingMarketClearanceView {
    stage: StreamingMarketClearanceStage | null;
    stageLabel: string;
    progressPercent: number;
    outcome: StreamingMarketClearanceOutcome | null;
    remainingWeeks: number | null;
    nextReviewInWeeks: number | null;
    actionRequired: 'NONE' | 'PAY_REQUIREMENT' | 'REAPPLY';
    condition: string | null;
    additionalPayment: number;
}
export const getStreamingMarketClearanceView = (operation: OwnedStreamingMarketOperation, absoluteWeek: number): StreamingMarketClearanceView => {
    const clearance = operation.clearance;
    return {
        stage: clearance?.stage || null,
        stageLabel: clearance?.stage.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, value => value.toUpperCase()) || 'Not filed',
        progressPercent: clearance?.progressPercent || 0,
        outcome: clearance?.outcome || null,
        remainingWeeks: operation.approvalReadyAtAbsoluteWeek === null ? null : Math.max(0, operation.approvalReadyAtAbsoluteWeek - absoluteWeek),
        nextReviewInWeeks: clearance ? Math.max(0, clearance.nextReviewAtAbsoluteWeek - absoluteWeek) : null,
        actionRequired: clearance?.outcome === 'ADDITIONAL_REQUIREMENT' ? 'PAY_REQUIREMENT' : clearance?.outcome === 'TEMPORARILY_REJECTED' ? 'REAPPLY' : 'NONE',
        condition: clearance?.condition || null,
        additionalPayment: clearance?.additionalPayment || 0,
    };
};

/** Selecting markets is free planning. A country can have only one live record, regardless of entry kind. */
export const saveStreamingMarketPlan = (player: Player, countryIds: string[], entryKind: StreamingMarketEntryKind = 'OPENING'): StreamingMarketMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || !platform.foundingProfile || platform.launchCommit && entryKind === 'OPENING') return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0, amount: 0 };
    const unavailableCountries = new Set(platform.marketOperations
        .filter(operation => operation.entryKind !== entryKind && operation.countryId && operation.status !== 'EXITED')
        .map(operation => operation.countryId!));
    const selected = normalizeStreamingDayOneMarketIds(countryIds).filter(countryId => !unavailableCountries.has(countryId));
    if (!selected.length) return { player, changed: false, reason: 'NO_MARKETS', shortfall: 0, amount: 0 };
    const selectedSet = new Set(selected);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const existingByCountry = new Map(platform.marketOperations.filter(operation => operation.scope === 'COUNTRY' && operation.countryId && operation.status !== 'EXITED').map(operation => [operation.countryId!, operation]));
    const mutableStatuses = new Set(['NOT_ENTERED', 'EVALUATING', 'PLANNED', 'AWAITING_FUNDING']);
    const retained = platform.marketOperations.filter(operation => {
        if (operation.scope !== 'COUNTRY' || operation.entryKind !== entryKind || !operation.countryId) return true;
        return !mutableStatuses.has(operation.status) || selectedSet.has(operation.countryId);
    });
    const planned = selected.flatMap((countryId): OwnedStreamingMarketOperation[] => {
        const existing = existingByCountry.get(countryId);
        if (existing && !mutableStatuses.has(existing.status)) return [existing];
        if (existing && existing.entryKind !== entryKind) return [existing];
        const profile = existing?.countryProfile || getStreamingCountryMarketProfile(countryId);
        if (!profile) return [];
        if (!existing) {
            const created = createStreamingCountryMarketOperation({ seed: platform.simulationSeed, countryId, entryKind, absoluteWeek, source: 'PLAYER_ACTION' });
            return created ? [created] : [];
        }
        return [{
            ...existing,
            entryKind,
            status: 'PLANNED',
            plannedCosts: profile.entryCosts,
            weeklyOperatingCost: weeklyOperatingCostFor(profile),
            countryProfile: profile,
        }];
    });
    const plannedIds = new Set(planned.map(operation => operation.id));
    const operations = [...retained.filter(operation => !plannedIds.has(operation.id)), ...planned];
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform, launchProgram: {
        ...platform.launchProgram, status: 'PLANNING', startedAtAbsoluteWeek: platform.launchProgram.startedAtAbsoluteWeek ?? absoluteWeek,
        defineCurrentStep: 'MARKETS', configurationRevision: platform.launchProgram.configurationRevision + 1,
    }, marketOperations: operations }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0, amount: planned.reduce((sum, item) => sum + item.plannedCosts.total, 0) };
};

/** Confirming entry settles rights/compliance once and starts the visible 4-6 week review. */
export const beginStreamingMarketClearance = (player: Player, countryIds: string[], entryKind: StreamingMarketEntryKind = 'OPENING'): StreamingMarketMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const selected = new Set(normalizeStreamingDayOneMarketIds(countryIds));
    const targets = platform.marketOperations.filter(operation => operation.entryKind === entryKind && Boolean(operation.countryId && selected.has(operation.countryId)) && ['PLANNED', 'AWAITING_FUNDING'].includes(operation.status) && operation.clearance?.outcome !== 'ADDITIONAL_REQUIREMENT');
    if (!platform.identity || !targets.length) return { player, changed: false, reason: platform.identity ? 'ALREADY_STARTED' : 'INVALID_STATE', shortfall: 0, amount: 0 };
    const amount = targets.reduce((sum, operation) => sum + operation.plannedCosts.total, 0);
    const energyCost = targets.length * STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY;
    if (player.energy.current < energyCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_ENERGY', shortfall: energyCost - player.energy.current, amount, energyCost };
    }
    if (platform.treasuryCash < amount) {
        const targetIds = new Set(targets.map(item => item.id));
        const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform, marketOperations: platform.marketOperations.map(operation => targetIds.has(operation.id) ? { ...operation, status: 'AWAITING_FUNDING' as const } : operation) }, player.id);
        return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'INSUFFICIENT_TREASURY', shortfall: amount - platform.treasuryCash, amount, energyCost };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const targetIds = new Set(targets.map(item => item.id));
    const started = targets.map((operation): OwnedStreamingMarketOperation => {
        const profile = operation.countryProfile || getStreamingCountryMarketProfile(operation.countryId || '');
        if (!profile) return operation;
        return startStreamingMarketOperation({ ...operation, countryProfile: profile }, absoluteWeek);
    });
    const byId = new Map(started.map(operation => [operation.id, operation]));
    const commitments: OwnedStreamingCostCommitment[] = targets.map(operation => ({
        id: createDeterministicId('streaming_launch_cost', platform.simulationSeed, `market-paid:${operation.id}`), idempotencyKey: `market-paid:${operation.id}`,
        category: 'MARKET', label: `${countryName(operation)} market entry`, status: 'PAID', plannedAmount: operation.plannedCosts.total,
        committedAmount: operation.plannedCosts.total, paidAmount: operation.plannedCosts.total, weeklyAmount: operation.weeklyOperatingCost,
        createdAtAbsoluteWeek: operation.plannedAtAbsoluteWeek, committedAtAbsoluteWeek: absoluteWeek, paidAtAbsoluteWeek: absoluteWeek, sourceReferenceId: operation.id,
    }));
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `market-clearance:${entryKind}:${absoluteWeek}:${targets.map(item => item.countryId).join('-')}`),
        idempotencyKey: `market-clearance:${entryKind}:${absoluteWeek}:${targets.map(item => item.countryId).join('-')}`, absoluteWeek, type: 'MARKET_CLEARANCE_STARTED',
        summary: `${targets.length} market clearance ${targets.length === 1 ? 'file' : 'files'} entered government review.`, source: 'PLAYER_ACTION', metadata: { marketCount: targets.length, cost: amount, entryKind },
    };
    const existingCommitmentKeys = new Set(platform.costCommitments.map(item => item.idempotencyKey));
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform, treasuryCash: platform.treasuryCash - amount,
        launchProgram: { ...platform.launchProgram, status: 'PLANNING', defineCurrentStep: 'CLEARANCE', configurationRevision: platform.launchProgram.configurationRevision + 1 },
        marketOperations: platform.marketOperations.map(operation => targetIds.has(operation.id) ? byId.get(operation.id)! : operation),
        costCommitments: [...platform.costCommitments, ...commitments.filter(item => !existingCommitmentKeys.has(item.idempotencyKey))],
        eventLedger: platform.eventLedger.some(item => item.idempotencyKey === ledger.idempotencyKey) ? platform.eventLedger : [...platform.eventLedger, ledger],
    }, player.id);
    const nextPlayer = { ...player, energy: { ...player.energy }, flags: { ...player.flags }, ownedStreamingPlatform: nextPlatform };
    spendPlayerEnergy(nextPlayer, energyCost, `Market filing: ${targets.length} ${targets.length === 1 ? 'country' : 'countries'}`);
    return { player: nextPlayer, changed: true, reason: 'STARTED', shortfall: 0, amount, energyCost };
};

export const resolveStreamingMarketRequirement = (player: Player, operationIdValue: string): StreamingMarketMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const operation = platform.marketOperations.find(item => item.id === operationIdValue);
    if (!operation?.clearance || operation.clearance.outcome !== 'ADDITIONAL_REQUIREMENT') return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0, amount: 0 };
    const amount = operation.clearance.additionalPayment;
    if (platform.treasuryCash < amount) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', shortfall: amount - platform.treasuryCash, amount };
    if (player.energy.current < STREAMING_MARKET_REQUIREMENT_ENERGY) {
        return { player, changed: false, reason: 'INSUFFICIENT_ENERGY', shortfall: STREAMING_MARKET_REQUIREMENT_ENERGY - player.energy.current, amount, energyCost: STREAMING_MARKET_REQUIREMENT_ENERGY };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const updated = resolveStreamingMarketRequirementCore(operation, absoluteWeek);
    const clearance = updated.clearance!;
    const ledger = ledgerEntry(platform, updated, absoluteWeek, `requirement-resolved:${clearance.reviewAttempt}`, 'MARKET_REQUIREMENT_RESOLVED', `${countryName(updated)} submitted the additional government requirement.`, { cost: amount, countryId: updated.countryId });
    const commitmentKey = `market-requirement-paid:${updated.id}:${clearance.reviewAttempt}`;
    const commitment: OwnedStreamingCostCommitment | null = amount > 0 ? {
        id: createDeterministicId('streaming_launch_cost', platform.simulationSeed, commitmentKey),
        idempotencyKey: commitmentKey,
        category: 'MARKET',
        label: `${countryName(updated)} additional compliance filing`,
        status: 'PAID',
        plannedAmount: amount,
        committedAmount: amount,
        paidAmount: amount,
        weeklyAmount: 0,
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: absoluteWeek,
        sourceReferenceId: updated.id,
    } : null;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform, treasuryCash: platform.treasuryCash - amount,
        marketOperations: platform.marketOperations.map(item => item.id === updated.id ? updated : item),
        costCommitments: commitment && !platform.costCommitments.some(item => item.idempotencyKey === commitment.idempotencyKey)
            ? [...platform.costCommitments, commitment] : platform.costCommitments,
        eventLedger: [...platform.eventLedger, ledger] }, player.id);
    const nextPlayer = { ...player, energy: { ...player.energy }, flags: { ...player.flags }, ownedStreamingPlatform: nextPlatform };
    spendPlayerEnergy(nextPlayer, STREAMING_MARKET_REQUIREMENT_ENERGY, `Market follow-up: ${countryName(updated)}`);
    return { player: nextPlayer, changed: true, reason: 'RESOLVED', shortfall: 0, amount, energyCost: STREAMING_MARKET_REQUIREMENT_ENERGY };
};

export const resumeStreamingMarketClearance = (player: Player, operationIdValue: string): StreamingMarketMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const operation = platform.marketOperations.find(item => item.id === operationIdValue);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (!operation?.clearance || operation.clearance.outcome !== 'TEMPORARILY_REJECTED') return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0, amount: 0 };
    if ((operation.clearance.resumeAllowedAtAbsoluteWeek || 0) > absoluteWeek) return { player, changed: false, reason: 'TOO_EARLY', shortfall: 0, amount: 0 };
    if (player.energy.current < STREAMING_MARKET_REAPPLICATION_ENERGY) {
        return { player, changed: false, reason: 'INSUFFICIENT_ENERGY', shortfall: STREAMING_MARKET_REAPPLICATION_ENERGY - player.energy.current, amount: 0, energyCost: STREAMING_MARKET_REAPPLICATION_ENERGY };
    }
    const updated = resumeStreamingMarketOperationCore(operation, absoluteWeek);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform, marketOperations: platform.marketOperations.map(item => item.id === updated.id ? updated : item) }, player.id);
    const nextPlayer = { ...player, energy: { ...player.energy }, flags: { ...player.flags }, ownedStreamingPlatform: nextPlatform };
    spendPlayerEnergy(nextPlayer, STREAMING_MARKET_REAPPLICATION_ENERGY, `Market reapplication: ${countryName(updated)}`);
    return { player: nextPlayer, changed: true, reason: 'REAPPLIED', shortfall: 0, amount: 0, energyCost: STREAMING_MARKET_REAPPLICATION_ENERGY };
};

type AdvanceResult = { operation: OwnedStreamingMarketOperation; ledger: OwnedStreamingLedgerEntry[]; news: NewsItem[] };
const unchanged = (operation: OwnedStreamingMarketOperation): AdvanceResult => ({ operation, ledger: [], news: [] });

const advanceClearanceOperation = (platform: OwnedStreamingPlatformState, operation: OwnedStreamingMarketOperation, absoluteWeek: number): AdvanceResult => {
    const progressed = advanceStreamingMarketOperation(operation, absoluteWeek);
    const updated = progressed.operation;
    if (progressed.kind === 'UNCHANGED') return unchanged(operation);
    if (progressed.kind === 'CLEARANCE_PROGRESS' || progressed.kind === 'INFRASTRUCTURE_READY') return { operation: updated, ledger: [], news: [] };
    const clearance = updated.clearance!;
    const name = countryName(updated);
    if (progressed.kind === 'DELAYED') {
        return { operation: updated, ledger: [ledgerEntry(platform, updated, absoluteWeek, `delayed:${clearance.reviewAttempt}`, 'MARKET_CLEARANCE_UPDATED', `${name} market review was delayed.`, { countryId: operation.countryId })],
            news: [marketNews(updated, absoluteWeek, `${name} delays streaming entry decision`, 'The final government review has been extended by one week.', 'MEDIUM')] };
    }
    if (progressed.kind === 'ADDITIONAL_REQUIREMENT') {
        return { operation: updated, ledger: [ledgerEntry(platform, updated, absoluteWeek, `requirement:${clearance.reviewAttempt}`, 'MARKET_CLEARANCE_UPDATED', `${name} requested an additional compliance filing.`, { countryId: operation.countryId, requiredPayment: progressed.additionalPayment })],
            news: [marketNews(updated, absoluteWeek, `${name} requests more from Empire+`, 'The market-entry file remains open while an enhanced compliance review is prepared.', 'MEDIUM')] };
    }
    if (progressed.kind === 'TEMPORARILY_REJECTED') {
        return { operation: updated, ledger: [ledgerEntry(platform, updated, absoluteWeek, `rejected:${clearance.reviewAttempt}`, 'MARKET_CLEARANCE_UPDATED', `${name} temporarily rejected the market-entry application.`, { countryId: operation.countryId })],
            news: [marketNews(updated, absoluteWeek, `${name} pauses Empire+ entry`, 'The company may submit a revised application after the cooling period.', 'HIGH')] };
    }
    const conditional = clearance.outcome === 'APPROVED_WITH_CONDITIONS';
    return { operation: updated, ledger: [ledgerEntry(platform, updated, absoluteWeek, `complete:${clearance.reviewAttempt}`, 'MARKET_CLEARANCE_COMPLETED', `${name} cleared for ${operation.entryKind === 'OPENING' ? 'opening night' : 'infrastructure preparation'}.`, { marketOperationId: operation.id, countryId: operation.countryId, conditional })],
        news: [marketNews(updated, absoluteWeek, conditional ? `${name} approves Empire+ with conditions` : `${name} approves Empire+ market entry`, conditional ? 'The platform must meet additional reporting and local-content conditions.' : 'The government review is complete and launch preparation can continue.', conditional ? 'MEDIUM' : 'HIGH')] };
};

const advanceElection = (platform: OwnedStreamingPlatformState, operation: OwnedStreamingMarketOperation, absoluteWeek: number): AdvanceResult => {
    const current = operation.policySnapshot;
    const profile = operation.countryProfile;
    if (!current || !profile || current.nextElectionAtAbsoluteWeek > absoluteWeek || ['EXITED', 'NOT_ENTERED'].includes(operation.status)) return unchanged(operation);
    const rng = createDeterministicRng(`market-policy:${operation.id}:${current.revision + 1}`);
    const first = rng();
    const direction = first < 0.34 ? -1 : first > 0.68 ? 1 : 0;
    const taxDelta = direction * (1 + Math.floor(rng() * 3));
    const levyDelta = direction * (0.5 + Math.floor(rng() * 3) * 0.5);
    const localDelta = direction > 0 ? 5 : direction < 0 ? -5 : 0;
    const policy: OwnedStreamingMarketPolicySnapshot = {
        effectiveTaxPercent: Math.max(5, Math.min(38, current.effectiveTaxPercent + taxDelta)),
        streamingLevyPercent: Math.max(0, Math.min(10, current.streamingLevyPercent + levyDelta)),
        localContentObligationPercent: Math.max(0, Math.min(45, current.localContentObligationPercent + localDelta)),
        privacyComplianceLevel: direction > 0 && current.privacyComplianceLevel === 'STANDARD' ? 'ENHANCED' : current.privacyComplianceLevel,
        policyClimate: direction > 0 ? 'PROTECTIVE' : direction < 0 ? 'OPEN' : 'BALANCED', revision: current.revision + 1,
        nextElectionAtAbsoluteWeek: absoluteWeek + 52 + Math.floor(rng() * 53), capturedAtAbsoluteWeek: absoluteWeek,
    };
    const updated = { ...operation, policySnapshot: policy, policyHistory: [...(operation.policyHistory || []), current].slice(-12) };
    const changed = taxDelta !== 0 || levyDelta !== 0 || localDelta !== 0;
    return { operation: updated,
        ledger: [ledgerEntry(platform, updated, absoluteWeek, `policy:${policy.revision}`, 'MARKET_POLICY_CHANGED', `${countryName(updated)} policy cycle ${changed ? 'changed' : 'renewed'} streaming terms.`, { countryId: updated.countryId, taxPercent: policy.effectiveTaxPercent, levyPercent: policy.streamingLevyPercent, localContentPercent: policy.localContentObligationPercent })],
        news: [marketNews(updated, absoluteWeek, `${countryName(updated)} sets a new streaming policy`, changed ? `The tax baseline is now ${policy.effectiveTaxPercent}% with a ${policy.streamingLevyPercent}% streaming levy.` : 'The government retained its current streaming policy after the election cycle.', changed ? 'HIGH' : 'LOW')] };
};

/** Government files and election cycles advance with game weeks before and after launch. */
export const advanceStreamingMarketClearances = (player: Player): StreamingMarketMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const clearanceResults = platform.marketOperations.map(operation => advanceClearanceOperation(platform, operation, absoluteWeek));
    const electionResults = clearanceResults.map(result => advanceElection(platform, result.operation, absoluteWeek));
    const activatedResults = electionResults.map(result => ({
        ...result,
        operation: result.operation.entryKind === 'EXPANSION' && result.operation.status === 'READY'
            ? activateStreamingMarketOperation(result.operation, absoluteWeek)
            : result.operation,
    }));
    const changed = activatedResults.some((result, index) => result.operation !== platform.marketOperations[index]);
    if (!changed) return { player, changed: false, reason: 'ADVANCED', shortfall: 0, amount: 0 };
    const newLedger = [...clearanceResults.flatMap(result => result.ledger), ...electionResults.flatMap(result => result.ledger)];
    const existingKeys = new Set(platform.eventLedger.map(item => item.idempotencyKey));
    const news = [...clearanceResults.flatMap(result => result.news), ...electionResults.flatMap(result => result.news)];
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform, marketOperations: activatedResults.map(result => result.operation),
        eventLedger: [...platform.eventLedger, ...newLedger.filter(item => !existingKeys.has(item.idempotencyKey))],
        launchProgram: { ...platform.launchProgram, configurationRevision: platform.launchProgram.configurationRevision + (news.length ? 1 : 0) } }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform, news: addUniqueNews(player, news) }, changed: true, reason: 'ADVANCED', shortfall: 0, amount: 0 };
};

export interface StreamingMarketOperatingCostView { marketOperatingCost: number; marketPolicyCost: number; total: number; activeCountryCount: number }
/** Tax and levy are revenue percentages weighted by active-country audience. */
export const calculateStreamingMarketOperatingCosts = (platform: OwnedStreamingPlatformState, weeklyRevenue: number): StreamingMarketOperatingCostView => {
    const active = platform.marketOperations.filter(operation => operation.scope === 'COUNTRY' && operation.status === 'ACTIVE' && operation.countryProfile && operation.policySnapshot);
    if (!active.length) return { marketOperatingCost: 0, marketPolicyCost: 0, total: 0, activeCountryCount: 0 };
    const audienceTotal = active.reduce((sum, operation) => sum + (operation.countryProfile?.audienceSize || 0), 0) || active.length;
    const marketOperatingCost = Math.round(active.reduce((sum, operation) => sum + operation.weeklyOperatingCost, 0));
    const marketPolicyCost = Math.round(active.reduce((sum, operation) => {
        const share = (operation.countryProfile?.audienceSize || 1) / audienceTotal;
        const rate = ((operation.policySnapshot?.effectiveTaxPercent || 0) + (operation.policySnapshot?.streamingLevyPercent || 0)) / 100;
        return sum + Math.max(0, weeklyRevenue) * share * rate;
    }, 0));
    return { marketOperatingCost, marketPolicyCost, total: marketOperatingCost + marketPolicyCost, activeCountryCount: active.length };
};
