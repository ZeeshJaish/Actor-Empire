import type {
    IndustryProject,
    OwnedStreamingCatalogLicense,
    PlatformAiCatalogueDistressDeal,
    PlatformAiContentPlan,
    PlatformAiDecisionRecord,
    PlatformAiDistressAction,
    PlatformAiDistressEpisode,
    PlatformAiDistressStageResult,
    PlatformAiTradeRoyaltyAllocation,
    PlatformId,
    PlatformState,
    Player,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    createStreamingRightsContractFromLicense,
    createStreamingLicenseContract,
    isStreamingLicenseActiveAt,
    millionsToFullCurrency,
    registerStreamingRightsContract,
    validateStreamingRightsAvailability,
} from '../streamingRightsCore';
import { calculatePlatformAiRightsValueMillions } from './platformAiContentSourcing';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { resolvePlatformLocalizationLevel } from './platformAiResearch';
import { createUnfundedPlatformAiProductionEscrow } from './platformAiProductionEscrow';
import {
    appendPlatformAiDecisions,
    normalizePlatformAiDistressEpisodes,
    normalizePlatformAiPendingOneTimeObligations,
    normalizePlatformAiState,
    resolvePlatformController,
} from './platformAiState';
import {
    choosePlatformAiAdministrationOutcome,
    createPlatformAiFundingRecord,
    getPlatformAiPostFundingRestrictions,
    quotePlatformAiExternalRecapitalization,
} from './platformAiFinancing';

const CATALOGUE_DEAL_DURATION_WEEKS = 104;
const CATALOGUE_DEAL_TIMEOUT_WEEKS = 4;
const CATALOGUE_DEAL_HISTORY_LIMIT = 104;
const CATALOGUE_DISTRESS_DISCOUNT = 0.7;
const RESTRUCTURED_INTEREST_MULTIPLIER = 0.5;

const roundMillions = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const average = (values: number[]): number => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const rescueQuote = (platform: PlatformState, absoluteWeek: number): {
    amountMillions: number;
    targetReserveMillions: number;
} => {
    const profile = PLATFORM_AI_PROFILES[platform.id];
    if (profile.parentBacking === 'NONE') return { amountMillions: 0, targetReserveMillions: 0 };
    const lastRescue = platform.ai!.lastRescueAbsoluteWeek;
    if (lastRescue !== null && absoluteWeek - lastRescue < 104) {
        return { amountMillions: 0, targetReserveMillions: 0 };
    }
    const history = platform.ai!.financeHistory.slice(-13);
    const averageRevenueMillions = average(history.map(snapshot => snapshot.revenueMillions));
    const averageMandatoryCostMillions = average(history.map(snapshot => (
        Number(snapshot.mandatoryCostAccruedMillions)
        || Number(snapshot.mandatoryCostMillions)
        || Number(snapshot.operatingCostMillions)
        || 0
    )));
    const trailingOperatingCostMillions = average(history.map(snapshot => snapshot.operatingCostMillions))
        || profile.baseWeeklyOperationsMillions;
    const targetReserveMillions = roundMillions(trailingOperatingCostMillions * profile.targetRunwayWeeks);
    const scaleCapMillions = Math.min(averageRevenueMillions * 13, averageMandatoryCostMillions * 13);
    const backingMultiplier = profile.parentBacking === 'STRONG' ? 1 : 0.5;
    const targetCapMillions = targetReserveMillions * 0.5;
    const needMillions = Math.max(0, targetCapMillions - platform.cashReserve) + platform.ai!.debtMillions;
    return {
        amountMillions: roundMillions(Math.min(
            scaleCapMillions * backingMultiplier,
            targetCapMillions,
            needMillions,
        )),
        targetReserveMillions,
    };
};

export const DISTRESS_STAGE_ORDER: PlatformAiDistressAction[] = [
    'FREEZE_GREENLIGHTS',
    'PAUSE_RESEARCH',
    'HOLD_COMMISSION',
    'LICENSE_CATALOGUE',
    'WITHDRAW_REGION',
    'RESTRUCTURE',
    'PARENT_RESCUE',
    'EXTERNAL_RECAPITALIZATION',
    'BANKRUPTCY_ADMINISTRATION',
    'DORMANT',
];

export interface ProgressPlatformAiDistressWorldInput {
    player: Player;
    world: WorldState;
    absoluteWeek: number;
}

export interface ProgressPlatformAiDistressWorldResult {
    world: WorldState;
    changed: boolean;
}

type SellerEntitlement = {
    id: string;
    project: IndustryProject;
    expiresAtAbsoluteWeek: number;
    sourceContractId: string | null;
};

export interface PlatformAiPartnerRevenueShareCalculation {
    totalCostMillions: number;
    platformTradeAllocations: PlatformAiTradeRoyaltyAllocation[];
}

const PLATFORM_TRADE_ROYALTY_EVIDENCE_TYPE = 'PLATFORM_TRADE_ROYALTY_ALLOCATION';

const platformTradeRoyaltyEvidenceId = (
    buyerPlatformId: PlatformId,
    absoluteWeek: number,
): string => createDeterministicId(
    'platform_ai_platform_trade_royalty_evidence',
    buyerPlatformId,
    absoluteWeek,
);

export const createPlatformAiTradeRoyaltyEvidenceDecision = (
    buyerPlatformId: PlatformId,
    absoluteWeek: number,
    allocations: PlatformAiTradeRoyaltyAllocation[],
): PlatformAiDecisionRecord | null => {
    const canonicalAllocations = allocations
        .filter(allocation => (
            Boolean(allocation.contractId)
            && Boolean(PLATFORM_AI_PROFILES[allocation.sellerPlatformId])
            && allocation.sellerPlatformId !== buyerPlatformId
            && roundMillions(allocation.amountMillions) > 0
        ))
        .map(allocation => ({
            contractId: allocation.contractId,
            sellerPlatformId: allocation.sellerPlatformId,
            amountMillions: roundMillions(allocation.amountMillions),
        }))
        .sort((left, right) => (
            left.contractId.localeCompare(right.contractId)
            || left.sellerPlatformId.localeCompare(right.sellerPlatformId)
        ));
    if (!canonicalAllocations.length) return null;
    const totalMillions = roundMillions(canonicalAllocations.reduce((sum, allocation) => (
        sum + allocation.amountMillions
    ), 0));
    return {
        id: platformTradeRoyaltyEvidenceId(buyerPlatformId, absoluteWeek),
        absoluteWeek,
        type: PLATFORM_TRADE_ROYALTY_EVIDENCE_TYPE,
        summary: 'Canonical PLATFORM_TRADE royalty allocation',
        reason: JSON.stringify({
            version: 1,
            buyerPlatformId,
            allocations: canonicalAllocations,
        }),
        cashImpactMillions: -totalMillions,
    };
};

const readPlatformAiTradeRoyaltyEvidence = (
    buyer: PlatformState,
    absoluteWeek: number,
): PlatformAiTradeRoyaltyAllocation[] => {
    const evidence = buyer.ai?.decisionHistory.find(decision => (
        decision.id === platformTradeRoyaltyEvidenceId(buyer.id, absoluteWeek)
        && decision.absoluteWeek === absoluteWeek
        && decision.type === PLATFORM_TRADE_ROYALTY_EVIDENCE_TYPE
    ));
    if (!evidence || !Number.isFinite(evidence.cashImpactMillions) || evidence.cashImpactMillions >= 0) return [];
    let parsed: unknown;
    try {
        parsed = JSON.parse(evidence.reason);
    } catch {
        return [];
    }
    if (!isRecord(parsed) || parsed.version !== 1 || parsed.buyerPlatformId !== buyer.id || !Array.isArray(parsed.allocations)) {
        return [];
    }
    const contractsById = new Map((buyer.ai?.rightsContracts || []).map(contract => [contract.id, contract]));
    const seenContractIds = new Set<string>();
    const allocations: PlatformAiTradeRoyaltyAllocation[] = [];
    for (const raw of parsed.allocations) {
        if (!isRecord(raw)) return [];
        const contractId = String(raw.contractId || '').trim();
        const sellerPlatformId = String(raw.sellerPlatformId) as PlatformId;
        const amountMillions = roundMillions(Number(raw.amountMillions));
        const contract = contractsById.get(contractId);
        if (
            !contractId
            || seenContractIds.has(contractId)
            || !PLATFORM_AI_PROFILES[sellerPlatformId]
            || sellerPlatformId === buyer.id
            || amountMillions <= 0
            || Number(raw.amountMillions) !== amountMillions
            || contract?.origin !== 'PLATFORM_TRADE'
            || contract.sellerType !== 'PLATFORM'
            || contract.sellerPlatformId !== sellerPlatformId
        ) return [];
        seenContractIds.add(contractId);
        allocations.push({ contractId, sellerPlatformId, amountMillions });
    }
    const allocationTotal = roundMillions(allocations.reduce((sum, allocation) => sum + allocation.amountMillions, 0));
    return allocationTotal === roundMillions(-evidence.cashImpactMillions) ? allocations : [];
};

/** Pure shared calculation used by buyer economy and seller settlement. */
export const calculatePlatformAiPartnerRevenueShares = (
    platform: PlatformState,
    weeklySubscriptionRevenueMillions: number,
    absoluteWeek: number,
): PlatformAiPartnerRevenueShareCalculation => {
    const eligibleProjects = new Set((platform.ai?.slate || [])
        .filter(plan => plan.status === 'RELEASED')
        .flatMap(plan => plan.sourceProjectIds)
        .filter(Boolean));
    const seenProjects = new Set<string>();
    const active = (platform.ai?.rightsContracts || []).filter(contract => {
        if (
            contract.status !== 'ACTIVE'
            || !isStreamingLicenseActiveAt(contract, absoluteWeek)
            || contract.origin === 'OWNED_STUDIO_TRANSFER'
            || contract.permanentPurchase
            || !contract.sourceProjectId
            || !eligibleProjects.has(contract.sourceProjectId)
            || seenProjects.has(contract.sourceProjectId)
        ) return false;
        seenProjects.add(contract.sourceProjectId);
        return true;
    });
    if (!active.length) return { totalCostMillions: 0, platformTradeAllocations: [] };
    const viewingWeight = Math.min(0.45, active.length / Math.max(1, eligibleProjects.size));
    const rawAmounts = active.map(contract => (
        Math.max(0, weeklySubscriptionRevenueMillions)
        * Math.max(0, Math.min(100, Number(contract.licensorRevenueShare) || 0))
        / 100
        * viewingWeight
        / active.length
    ));
    const totalCostMillions = roundMillions(rawAmounts.reduce((sum, amount) => sum + amount, 0));
    let allocatedMillions = 0;
    const exactAmounts = rawAmounts.map((amount, index) => {
        const exact = index === rawAmounts.length - 1
            ? roundMillions(totalCostMillions - allocatedMillions)
            : roundMillions(amount);
        allocatedMillions = roundMillions(allocatedMillions + exact);
        return exact;
    });
    return {
        totalCostMillions,
        platformTradeAllocations: active.flatMap((contract, index) => (
            contract.origin === 'PLATFORM_TRADE'
            && contract.sellerType === 'PLATFORM'
            && contract.sellerPlatformId
            && PLATFORM_AI_PROFILES[contract.sellerPlatformId]
            && exactAmounts[index] > 0
                ? [{
                    contractId: contract.id,
                    sellerPlatformId: contract.sellerPlatformId,
                    amountMillions: exactAmounts[index],
                }]
                : []
        )),
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const normalizePlatformAiCatalogueDistressDeals = (
    value: unknown,
): PlatformAiCatalogueDistressDeal[] => {
    const byId = new Map<string, PlatformAiCatalogueDistressDeal>();
    for (const raw of Array.isArray(value) ? value : []) {
        if (!isRecord(raw)) continue;
        const id = String(raw.id || '').trim();
        const episodeId = String(raw.episodeId || '').trim();
        const sellerPlatformId = String(raw.sellerPlatformId) as PlatformId;
        const buyerPlatformId = String(raw.buyerPlatformId) as PlatformId;
        const sourceProjectId = String(raw.sourceProjectId || '').trim();
        const sellerEntitlementId = String(raw.sellerEntitlementId || '').trim();
        const buyerObligationId = String(raw.buyerObligationId || '').trim();
        const buyerPlanId = String(raw.buyerPlanId || '').trim();
        const buyerContractId = String(raw.buyerContractId || '').trim();
        const status = String(raw.status) as PlatformAiCatalogueDistressDeal['status'];
        const numericFields = [
            raw.sellerEntitlementExpiresAtAbsoluteWeek,
            raw.priceMillions,
            raw.durationWeeks,
            raw.startsAtAbsoluteWeek,
            raw.expiresAtAbsoluteWeek,
            raw.createdAtAbsoluteWeek,
        ].map(Number);
        if (
            !id || !episodeId || !sourceProjectId || !sellerEntitlementId
            || !buyerObligationId || !buyerPlanId || !buyerContractId
            || !PLATFORM_AI_PROFILES[sellerPlatformId] || !PLATFORM_AI_PROFILES[buyerPlatformId]
            || sellerPlatformId === buyerPlatformId
            || !['PENDING_PAYMENT', 'TRANSFERRED', 'CANCELLED'].includes(status)
            || numericFields.some(field => !Number.isFinite(field) || field < 0)
        ) continue;
        const nullableWeek = (field: unknown): number | null => (
            field === null || field === undefined || !Number.isFinite(Number(field))
                ? null
                : Math.max(0, Math.round(Number(field)))
        );
        const deal: PlatformAiCatalogueDistressDeal = {
            id,
            episodeId,
            sellerPlatformId,
            buyerPlatformId,
            sourceProjectId,
            sellerEntitlementId,
            sellerEntitlementExpiresAtAbsoluteWeek: Math.round(numericFields[0]),
            priceMillions: roundMillions(numericFields[1]),
            buyerObligationId,
            buyerPlanId,
            buyerContractId,
            durationWeeks: Math.round(numericFields[2]),
            startsAtAbsoluteWeek: Math.round(numericFields[3]),
            expiresAtAbsoluteWeek: Math.round(numericFields[4]),
            status,
            paymentDisposition: ['HELD', 'CAPTURED', 'REFUNDED', 'VOIDED', 'INVALID_EVIDENCE']
                .includes(String(raw.paymentDisposition))
                    ? raw.paymentDisposition as PlatformAiCatalogueDistressDeal['paymentDisposition']
                    : status === 'TRANSFERRED'
                        ? 'CAPTURED'
                        : status === 'CANCELLED'
                            ? nullableWeek(raw.refundedAtAbsoluteWeek) !== null ? 'REFUNDED' : 'VOIDED'
                            : 'HELD',
            createdAtAbsoluteWeek: Math.round(numericFields[5]),
            paymentSettledAtAbsoluteWeek: nullableWeek(raw.paymentSettledAtAbsoluteWeek),
            refundedAtAbsoluteWeek: nullableWeek(raw.refundedAtAbsoluteWeek),
            refundedAmountMillions: Number.isFinite(Number(raw.refundedAmountMillions))
                ? roundMillions(Math.max(0, Number(raw.refundedAmountMillions)))
                : 0,
            transferredAtAbsoluteWeek: nullableWeek(raw.transferredAtAbsoluteWeek),
            cancelledAtAbsoluteWeek: nullableWeek(raw.cancelledAtAbsoluteWeek),
            cancellationReason: raw.cancellationReason === null || raw.cancellationReason === undefined
                ? null
                : String(raw.cancellationReason),
        };
        byId.set(id, deal);
    }
    const rows = Array.from(byId.values());
    const pending = rows.filter(deal => deal.status === 'PENDING_PAYMENT')
        .sort((left, right) => left.createdAtAbsoluteWeek - right.createdAtAbsoluteWeek || left.id.localeCompare(right.id));
    const terminal = rows.filter(deal => deal.status !== 'PENDING_PAYMENT')
        .sort((left, right) => (
            (left.transferredAtAbsoluteWeek ?? left.cancelledAtAbsoluteWeek ?? left.createdAtAbsoluteWeek)
            - (right.transferredAtAbsoluteWeek ?? right.cancelledAtAbsoluteWeek ?? right.createdAtAbsoluteWeek)
            || left.id.localeCompare(right.id)
        ))
        .slice(-CATALOGUE_DEAL_HISTORY_LIMIT);
    return [...terminal, ...pending];
};

const replacePlatform = (world: WorldState, platform: PlatformState): WorldState => ({
    ...world,
    platforms: { ...world.platforms!, [platform.id]: platform },
});

const sellerEntitlements = (
    world: WorldState,
    seller: PlatformState,
    absoluteWeek: number,
): SellerEntitlement[] => {
    const projectsById = new Map(world.projects.map(project => [project.id, project]));
    const originals = seller.ai!.slate
        .filter(plan => plan.source === 'COMMISSIONED_ORIGINAL' && plan.status === 'RELEASED')
        .flatMap(plan => plan.releaseEntries.flatMap(entry => {
            const project = projectsById.get(entry.canonicalProjectId);
            if (!project || entry.status !== 'RELEASED') return [];
            return [{
                id: `original:${plan.id}`,
                project,
                expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
                sourceContractId: null,
            }];
        }));
    const sublicences = seller.ai!.rightsContracts.flatMap(contract => {
        const project = projectsById.get(contract.sourceProjectId);
        if (
            !project || !contract.sublicensingAllowed
            || !isStreamingLicenseActiveAt(contract, absoluteWeek)
            || contract.expiresAtAbsoluteWeek < absoluteWeek + 1 + CATALOGUE_DEAL_DURATION_WEEKS
        ) return [];
        return [{
            id: contract.id,
            project,
            expiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
            sourceContractId: contract.id,
        }];
    });
    return [...originals, ...sublicences]
        .sort((left, right) => (
            right.project.quality - left.project.quality
            || right.project.boxOffice - left.project.boxOffice
            || left.project.id.localeCompare(right.project.id)
            || left.id.localeCompare(right.id)
        ));
};

const canonicalPriceMillions = (project: IndustryProject): number => roundMillions(
    calculatePlatformAiRightsValueMillions(project) * CATALOGUE_DISTRESS_DISCOUNT,
);

const canonicalDealIdentity = (
    episode: PlatformAiDistressEpisode,
    sellerPlatformId: PlatformId,
    buyerPlatformId: PlatformId,
    projectId: string,
) => {
    const id = createDeterministicId(
        'platform_ai_distress_catalogue_deal',
        episode.id,
        sellerPlatformId,
        buyerPlatformId,
        projectId,
    );
    return {
        id,
        buyerObligationId: `platform-ai-distress-catalogue:${id}`,
        buyerPlanId: createDeterministicId('platform_ai_distress_catalogue_plan', id),
        buyerContractId: createDeterministicId('platform_ai_distress_catalogue_contract', id),
    };
};

const selectBuyer = (
    player: Player,
    world: WorldState,
    seller: PlatformState,
    entitlement: SellerEntitlement,
    priceMillions: number,
    absoluteWeek: number,
): PlatformState | null => Object.values(world.platforms || {})
    .filter(candidate => (
        candidate.id !== seller.id
        && candidate.ai?.status === 'ACTIVE'
        && resolvePlatformController(player, candidate.id) === 'AI'
        && candidate.cashReserve - priceMillions >= PLATFORM_AI_PROFILES[candidate.id].baseWeeklyOperationsMillions * 8
        && !candidate.ai.rightsContracts.some(contract => (
            contract.sourceProjectId === entitlement.project.id
            && isStreamingLicenseActiveAt(contract, absoluteWeek + 1)
        ))
        && validateStreamingRightsAvailability({
            player,
            world,
            sourceProjectId: entitlement.project.id,
            buyerPlatformId: candidate.id,
            exclusivity: 'NON_EXCLUSIVE',
            startsAtAbsoluteWeek: absoluteWeek + 1,
            expiresAtAbsoluteWeek: absoluteWeek + 1 + CATALOGUE_DEAL_DURATION_WEEKS,
            excludeLicenseIds: entitlement.sourceContractId ? [entitlement.sourceContractId] : [],
        }).available
    ))
    .sort((left, right) => {
        const score = (platform: PlatformState): number => {
            const profile = PLATFORM_AI_PROFILES[platform.id];
            const catalogueGap = Math.max(0, 20 - platform.ai!.rightsContracts.length) * 2;
            const genreAffinity = profile.preferredGenres.includes(entitlement.project.genre) ? 20 : 0;
            return catalogueGap + genreAffinity + profile.competence.negotiation * 4 + Math.min(30, platform.cashReserve / 50);
        };
        return score(right) - score(left) || left.id.localeCompare(right.id);
    })[0] || null;

const updateEpisode = (
    platform: PlatformState,
    episodeId: string,
    transform: (episode: PlatformAiDistressEpisode) => PlatformAiDistressEpisode,
    absoluteWeek: number,
): PlatformState => ({
    ...platform,
    ai: {
        ...platform.ai!,
        distressEpisodes: normalizePlatformAiDistressEpisodes(
            platform.ai!.distressEpisodes.map(episode => episode.id === episodeId ? transform(episode) : episode),
            platform.id,
            absoluteWeek,
        ),
    },
});

const recordCatalogueUnavailable = (
    platform: PlatformState,
    episode: PlatformAiDistressEpisode,
    absoluteWeek: number,
    reason: string,
): PlatformState => {
    const result = unavailableResult('LICENSE_CATALOGUE', absoluteWeek, reason);
    const updated = updateEpisode(platform, episode.id, source => ({
        ...source,
        lastAdvancedAtAbsoluteWeek: absoluteWeek,
        stageResults: [...source.stageResults, result],
    }), absoluteWeek);
    return {
        ...updated,
        ai: {
            ...updated.ai!,
            decisionHistory: appendPlatformAiDecisions(updated.ai!.decisionHistory, [
                distressDecision(updated, absoluteWeek, result),
            ]),
        },
    };
};

const queueCatalogueDeal = (
    player: Player,
    sourceWorld: WorldState,
    sellerPlatformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let world = sourceWorld;
    if (resolvePlatformController(player, sellerPlatformId) === 'PLAYER') return world;
    const seller = world.platforms?.[sellerPlatformId];
    if (!seller?.ai) return world;
    const episode = seller.ai!.distressEpisodes.find(item => item.completedAtAbsoluteWeek === null);
    if (!episode || episode.currentStageIndex !== 3 || episode.lastAdvancedAtAbsoluteWeek >= absoluteWeek) return world;
    const deals = normalizePlatformAiCatalogueDistressDeals(world.platformAiCatalogueDistressDeals);
    const pendingKeys = new Set(deals.filter(deal => deal.status === 'PENDING_PAYMENT')
        .map(deal => `${deal.sellerPlatformId}:${deal.sourceProjectId}`));
    let selected: { entitlement: SellerEntitlement; buyer: PlatformState; priceMillions: number } | null = null;
    for (const entitlement of sellerEntitlements(world, seller, absoluteWeek)) {
        if (pendingKeys.has(`${seller.id}:${entitlement.project.id}`)) continue;
        const priceMillions = canonicalPriceMillions(entitlement.project);
        const buyer = selectBuyer({ ...player, world }, world, seller, entitlement, priceMillions, absoluteWeek);
        if (buyer) {
            selected = { entitlement, buyer, priceMillions };
            break;
        }
    }
    if (!selected) {
        return replacePlatform(world, recordCatalogueUnavailable(
            seller,
            episode,
            absoluteWeek,
            'No released sublicensable title and financially eligible AI buyer were available.',
        ));
    }
    const identity = canonicalDealIdentity(
        episode,
        seller.id,
        selected.buyer.id,
        selected.entitlement.project.id,
    );
    const existing = deals.find(deal => deal.id === identity.id);
    if (existing) return world;
    const startsAtAbsoluteWeek = absoluteWeek + 1;
    const deal: PlatformAiCatalogueDistressDeal = {
        ...identity,
        episodeId: episode.id,
        sellerPlatformId: seller.id,
        buyerPlatformId: selected.buyer.id,
        sourceProjectId: selected.entitlement.project.id,
        sellerEntitlementId: selected.entitlement.id,
        sellerEntitlementExpiresAtAbsoluteWeek: selected.entitlement.expiresAtAbsoluteWeek,
        priceMillions: selected.priceMillions,
        durationWeeks: CATALOGUE_DEAL_DURATION_WEEKS,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: startsAtAbsoluteWeek + CATALOGUE_DEAL_DURATION_WEEKS,
        status: 'PENDING_PAYMENT',
        paymentDisposition: 'HELD',
        createdAtAbsoluteWeek: absoluteWeek,
        paymentSettledAtAbsoluteWeek: null,
        refundedAtAbsoluteWeek: null,
        refundedAmountMillions: 0,
        transferredAtAbsoluteWeek: null,
        cancelledAtAbsoluteWeek: null,
        cancellationReason: null,
    };
    const result: PlatformAiDistressStageResult = {
        stage: 'LICENSE_CATALOGUE',
        outcome: 'PENDING',
        enteredAtAbsoluteWeek: absoluteWeek,
        resolvedAtAbsoluteWeek: null,
        reason: `${selected.entitlement.project.title} was offered as a 104-week non-exclusive licence.`,
        referenceId: deal.id,
    };
    const nextSeller = updateEpisode(seller, episode.id, source => ({
        ...source,
        lastAdvancedAtAbsoluteWeek: absoluteWeek,
        stageResults: [...source.stageResults, result],
    }), absoluteWeek);
    const nextBuyer: PlatformState = {
        ...selected.buyer,
        ai: {
            ...selected.buyer.ai!,
            pendingOneTimeObligations: normalizePlatformAiPendingOneTimeObligations([
                ...selected.buyer.ai!.pendingOneTimeObligations,
                {
                    id: deal.buyerObligationId,
                    category: 'CONTRACTUAL',
                    amountMillions: deal.priceMillions,
                    createdWeek: absoluteWeek,
                    status: 'HELD',
                    settledWeek: null,
                },
            ], new Set([deal.buyerObligationId])),
        },
    };
    world = replacePlatform(world, nextSeller);
    world = replacePlatform(world, nextBuyer);
    return {
        ...world,
        platformAiCatalogueDistressDeals: normalizePlatformAiCatalogueDistressDeals([...deals, deal]),
    };
};

const findEntitlementForDeal = (
    world: WorldState,
    seller: PlatformState,
    deal: PlatformAiCatalogueDistressDeal,
    absoluteWeek: number,
): SellerEntitlement | null => sellerEntitlements(world, seller, absoluteWeek)
    .find(entitlement => (
        entitlement.id === deal.sellerEntitlementId
        && entitlement.project.id === deal.sourceProjectId
        && entitlement.expiresAtAbsoluteWeek === deal.sellerEntitlementExpiresAtAbsoluteWeek
    )) || null;

const dealIsCanonical = (
    world: WorldState,
    deal: PlatformAiCatalogueDistressDeal,
    episode: PlatformAiDistressEpisode,
    entitlement: SellerEntitlement | null,
): boolean => {
    const project = world.projects.find(item => item.id === deal.sourceProjectId);
    if (!project || !entitlement) return false;
    const identity = canonicalDealIdentity(
        episode,
        deal.sellerPlatformId,
        deal.buyerPlatformId,
        deal.sourceProjectId,
    );
    return deal.id === identity.id
        && deal.buyerObligationId === identity.buyerObligationId
        && deal.buyerPlanId === identity.buyerPlanId
        && deal.buyerContractId === identity.buyerContractId
        && deal.durationWeeks === CATALOGUE_DEAL_DURATION_WEEKS
        && deal.startsAtAbsoluteWeek === deal.createdAtAbsoluteWeek + 1
        && deal.expiresAtAbsoluteWeek === deal.startsAtAbsoluteWeek + CATALOGUE_DEAL_DURATION_WEEKS
        && deal.sellerEntitlementExpiresAtAbsoluteWeek >= deal.expiresAtAbsoluteWeek
        && deal.priceMillions === canonicalPriceMillions(project);
};

const dealHasCanonicalImmutableRefundTerms = (
    world: WorldState,
    deal: PlatformAiCatalogueDistressDeal,
): boolean => {
    const project = world.projects.find(item => item.id === deal.sourceProjectId);
    const seller = world.platforms?.[deal.sellerPlatformId];
    const episode = seller?.ai?.distressEpisodes.find(item => item.id === deal.episodeId);
    if (!project || !episode || episode.platformId !== deal.sellerPlatformId) return false;
    const identity = canonicalDealIdentity(
        episode,
        deal.sellerPlatformId,
        deal.buyerPlatformId,
        deal.sourceProjectId,
    );
    return deal.id === identity.id
        && deal.buyerObligationId === identity.buyerObligationId
        && deal.buyerPlanId === identity.buyerPlanId
        && deal.buyerContractId === identity.buyerContractId
        && deal.priceMillions === canonicalPriceMillions(project)
        && deal.durationWeeks === CATALOGUE_DEAL_DURATION_WEEKS
        && deal.createdAtAbsoluteWeek >= episode.startedAtAbsoluteWeek
        && deal.startsAtAbsoluteWeek === deal.createdAtAbsoluteWeek + 1
        && deal.expiresAtAbsoluteWeek === deal.startsAtAbsoluteWeek + CATALOGUE_DEAL_DURATION_WEEKS
        && deal.sellerEntitlementExpiresAtAbsoluteWeek >= deal.expiresAtAbsoluteWeek;
};

const adjustCurrentFinanceCash = (
    platform: PlatformState,
    absoluteWeek: number,
    amountMillions: number,
    kind: 'SELLER_RECEIPT' | 'BUYER_REFUND',
    relatedPaymentWeek: number | null = null,
): PlatformState => {
    const index = platform.ai!.financeHistory.findIndex(snapshot => snapshot.absoluteWeek === absoluteWeek);
    if (index < 0) return { ...platform, cashReserve: roundMillions(platform.cashReserve + amountMillions) };
    const financeHistory = platform.ai!.financeHistory.slice();
    const snapshot = financeHistory[index];
    financeHistory[index] = kind === 'SELLER_RECEIPT'
        ? {
            ...snapshot,
            verifiedContractIncomeMillions: roundMillions(snapshot.verifiedContractIncomeMillions + amountMillions),
            revenueMillions: roundMillions(snapshot.revenueMillions + amountMillions),
            netCashFlowMillions: roundMillions(snapshot.netCashFlowMillions + amountMillions),
            closingCashMillions: roundMillions(snapshot.closingCashMillions + amountMillions),
        }
        : {
            ...snapshot,
            contractualCostMillions: relatedPaymentWeek === absoluteWeek
                ? roundMillions(Math.max(0, snapshot.contractualCostMillions - amountMillions))
                : snapshot.contractualCostMillions,
            settledObligationCostMillions: relatedPaymentWeek === absoluteWeek
                ? roundMillions(Math.max(0, snapshot.settledObligationCostMillions - amountMillions))
                : snapshot.settledObligationCostMillions,
            netCashFlowMillions: roundMillions(snapshot.netCashFlowMillions + amountMillions),
            closingCashMillions: roundMillions(snapshot.closingCashMillions + amountMillions),
        };
    return {
        ...platform,
        cashReserve: roundMillions(platform.cashReserve + amountMillions),
        ai: { ...platform.ai!, financeHistory },
    };
};

const settlePlatformTradeRevenueShares = (
    player: Player,
    sourceWorld: WorldState,
    absoluteWeek: number,
): WorldState => {
    let world = sourceWorld;
    for (const buyerId of Object.keys(world.platforms || {}).sort() as PlatformId[]) {
        const buyer = world.platforms?.[buyerId];
        const snapshot = buyer?.ai?.financeHistory.find(item => item.absoluteWeek === absoluteWeek);
        if (!buyer?.ai || !snapshot || resolvePlatformController(player, buyer.id) === 'PLAYER') continue;
        const allocations = readPlatformAiTradeRoyaltyEvidence(buyer, absoluteWeek);
        const allocationTotal = roundMillions(allocations.reduce((sum, allocation) => sum + allocation.amountMillions, 0));
        if (allocationTotal > snapshot.partnerRevenueShareCostMillions) continue;
        for (const allocation of allocations) {
            const seller = world.platforms?.[allocation.sellerPlatformId];
            if (!seller?.ai) continue;
            const evidenceId = createDeterministicId(
                'platform_ai_platform_trade_share',
                buyer.id,
                allocation.contractId,
                absoluteWeek,
            );
            if (seller.ai.decisionHistory.some(decision => decision.id === evidenceId)) continue;
            const credited = adjustCurrentFinanceCash(
                seller,
                absoluteWeek,
                allocation.amountMillions,
                'SELLER_RECEIPT',
            );
            world = replacePlatform(world, {
                ...credited,
                ai: {
                    ...credited.ai!,
                    decisionHistory: appendPlatformAiDecisions(credited.ai!.decisionHistory, [{
                        id: evidenceId,
                        absoluteWeek,
                        type: 'PLATFORM_TRADE_REVENUE_SHARE',
                        summary: 'Platform-trade revenue share received',
                        reason: `${buyer.name} paid ${allocation.amountMillions}M under ${allocation.contractId}.`,
                        cashImpactMillions: allocation.amountMillions,
                    }]),
                },
            });
        }
    }
    return world;
};

const resolveSellerStage = (
    seller: PlatformState,
    deal: PlatformAiCatalogueDistressDeal,
    absoluteWeek: number,
    outcome: 'APPLIED' | 'UNAVAILABLE' | 'FAILED',
    reason: string,
): PlatformState => updateEpisode(seller, deal.episodeId, episode => ({
    ...episode,
    currentStageIndex: outcome === 'APPLIED'
        ? Math.min(DISTRESS_STAGE_ORDER.length, episode.currentStageIndex + 1)
        : episode.currentStageIndex,
    lastAdvancedAtAbsoluteWeek: absoluteWeek,
    stageResults: episode.stageResults.map(result => (
        result.stage === 'LICENSE_CATALOGUE' && result.referenceId === deal.id
            ? { ...result, outcome, resolvedAtAbsoluteWeek: absoluteWeek, reason }
            : result
    )),
}), absoluteWeek);

const cancelPendingDeal = (
    world: WorldState,
    deal: PlatformAiCatalogueDistressDeal,
    absoluteWeek: number,
    reason: string,
): WorldState => {
    if (deal.status !== 'PENDING_PAYMENT') return world;
    let seller = world.platforms?.[deal.sellerPlatformId];
    let buyer = world.platforms?.[deal.buyerPlatformId];
    const obligation = buyer?.ai?.pendingOneTimeObligations.find(item => item.id === deal.buyerObligationId);
    const settlementSnapshot = obligation?.settledWeek === null || obligation?.settledWeek === undefined
        ? null
        : buyer?.ai?.financeHistory.find(snapshot => snapshot.absoluteWeek === obligation.settledWeek) || null;
    const hasCanonicalSettlementEvidence = deal.paymentDisposition === 'HELD'
        && deal.createdAtAbsoluteWeek <= absoluteWeek
        && dealHasCanonicalImmutableRefundTerms(world, deal)
        && obligation?.status === 'SETTLED'
        && obligation.settledWeek !== null
        && obligation.settledWeek <= absoluteWeek
        && obligation.category === 'CONTRACTUAL'
        && obligation.amountMillions === deal.priceMillions
        && obligation.createdWeek === deal.createdAtAbsoluteWeek
        && Boolean(settlementSnapshot)
        && settlementSnapshot!.contractualCostMillions >= deal.priceMillions
        && settlementSnapshot!.settledObligationCostMillions >= deal.priceMillions;
    const refundableSettledAmount = hasCanonicalSettlementEvidence ? deal.priceMillions : 0;
    if (buyer?.ai && refundableSettledAmount > 0) {
        buyer = adjustCurrentFinanceCash(
            buyer,
            absoluteWeek,
            refundableSettledAmount,
            'BUYER_REFUND',
            obligation!.settledWeek,
        );
    }
    if (buyer?.ai) {
        buyer = {
            ...buyer,
            ai: {
                ...buyer.ai,
                pendingOneTimeObligations: normalizePlatformAiPendingOneTimeObligations(
                    buyer.ai.pendingOneTimeObligations.filter(item => (
                        item.id !== deal.buyerObligationId || item.status === 'SETTLED'
                    )),
                ),
            },
        };
    }
    if (seller?.ai) seller = resolveSellerStage(seller, deal, absoluteWeek, 'UNAVAILABLE', reason);
    const cancelled: PlatformAiCatalogueDistressDeal = {
        ...deal,
        status: 'CANCELLED',
        paymentDisposition: hasCanonicalSettlementEvidence
            ? 'REFUNDED'
            : obligation?.status === 'SETTLED' ? 'INVALID_EVIDENCE' : 'VOIDED',
        paymentSettledAtAbsoluteWeek: hasCanonicalSettlementEvidence ? obligation!.settledWeek : null,
        refundedAtAbsoluteWeek: hasCanonicalSettlementEvidence ? absoluteWeek : null,
        refundedAmountMillions: refundableSettledAmount,
        cancelledAtAbsoluteWeek: absoluteWeek,
        cancellationReason: reason,
    };
    let next = world;
    if (seller) next = replacePlatform(next, seller);
    if (buyer) next = replacePlatform(next, buyer);
    return {
        ...next,
        platformAiCatalogueDistressDeals: normalizePlatformAiCatalogueDistressDeals(
            (world.platformAiCatalogueDistressDeals || []).map(item => item.id === deal.id ? cancelled : item),
        ),
    };
};

export const reconcilePlatformAiCatalogueDistressDealsForMigration = (
    player: Player,
    sourceWorld: WorldState,
    absoluteWeek: number,
): WorldState => {
    let world: WorldState = {
        ...sourceWorld,
        platformAiCatalogueDistressDeals: normalizePlatformAiCatalogueDistressDeals(
            sourceWorld.platformAiCatalogueDistressDeals,
        ),
    };
    for (const sourceDeal of world.platformAiCatalogueDistressDeals) {
        const deal = world.platformAiCatalogueDistressDeals.find(item => item.id === sourceDeal.id)!;
        if (deal.status !== 'PENDING_PAYMENT') continue;
        const seller = world.platforms?.[deal.sellerPlatformId];
        const buyer = world.platforms?.[deal.buyerPlatformId];
        const episode = seller?.ai?.distressEpisodes.find(item => item.id === deal.episodeId);
        const entitlement = seller && episode
            ? findEntitlementForDeal(world, seller, deal, absoluteWeek)
            : null;
        const obligation = buyer?.ai?.pendingOneTimeObligations.find(item => item.id === deal.buyerObligationId);
        const activeCatalogueStage = Boolean(
            episode
            && episode.completedAtAbsoluteWeek === null
            && episode.status !== 'RECOVERED'
            && episode.status !== 'DORMANT'
            && DISTRESS_STAGE_ORDER[episode.currentStageIndex] === 'LICENSE_CATALOGUE'
            && episode.stageResults.some(result => (
                result.stage === 'LICENSE_CATALOGUE'
                && result.outcome === 'PENDING'
                && result.referenceId === deal.id
                && result.resolvedAtAbsoluteWeek === null
            )),
        );
        const impossibleTimeline = deal.createdAtAbsoluteWeek > absoluteWeek
            || deal.startsAtAbsoluteWeek !== deal.createdAtAbsoluteWeek + 1
            || deal.expiresAtAbsoluteWeek !== deal.startsAtAbsoluteWeek + deal.durationWeeks
            || deal.durationWeeks !== CATALOGUE_DEAL_DURATION_WEEKS
            || deal.sellerEntitlementExpiresAtAbsoluteWeek < deal.expiresAtAbsoluteWeek
            || deal.paymentDisposition !== 'HELD'
            || deal.paymentSettledAtAbsoluteWeek !== null
            || deal.refundedAtAbsoluteWeek !== null
            || deal.refundedAmountMillions !== 0
            || deal.transferredAtAbsoluteWeek !== null
            || deal.cancelledAtAbsoluteWeek !== null;
        const impossibleObligation = !obligation
            || obligation.category !== 'CONTRACTUAL'
            || obligation.amountMillions !== deal.priceMillions
            || obligation.createdWeek !== deal.createdAtAbsoluteWeek
            || obligation.createdWeek > absoluteWeek
            || obligation.status === 'SETTLED' && (
                obligation.settledWeek === null
                || obligation.settledWeek < obligation.createdWeek
                || obligation.settledWeek > absoluteWeek
            );
        const timedOutHeldPayment = obligation?.status === 'HELD'
            && absoluteWeek - deal.createdAtAbsoluteWeek >= CATALOGUE_DEAL_TIMEOUT_WEEKS;
        if (
            !seller?.ai
            || !buyer?.ai
            || resolvePlatformController(player, deal.sellerPlatformId) === 'PLAYER'
            || resolvePlatformController(player, deal.buyerPlatformId) === 'PLAYER'
            || !activeCatalogueStage
            || impossibleTimeline
            || impossibleObligation
            || timedOutHeldPayment
            || !episode
            || !dealIsCanonical(world, deal, episode, entitlement)
        ) {
            world = cancelPendingDeal(
                world,
                deal,
                absoluteWeek,
                'Save migration cancelled an impossible pending catalogue licence.',
            );
        }
    }
    return world;
};

const buildBuyerPlan = (
    buyer: PlatformState,
    project: IndustryProject,
    deal: PlatformAiCatalogueDistressDeal,
    absoluteWeek: number,
): PlatformAiContentPlan => ({
    id: deal.buyerPlanId,
    platformId: buyer.id,
    controllerAtCommitment: 'AI',
    source: 'LICENSED_RELEASED_TITLE',
    status: 'RIGHTS_READY',
    title: project.title,
    projectType: project.mediaType || 'MOVIE',
    genre: project.genre,
    targetAudience: project.targetAudience || 'PG-13',
    sourceProjectIds: [project.id],
    rightsContractIds: [deal.buyerContractId],
    cataloguePackageId: null,
    commissionId: null,
    sourceStudioId: project.studioId,
    streamingWindow: project.boxOffice > 0 ? 'POST_THEATRICAL_WINDOW' : 'CATALOGUE_WINDOW',
    localizationLevel: resolvePlatformLocalizationLevel(buyer.ai!.capabilities),
    releaseCountryIds: [...buyer.ai!.capabilities.activeCountryIds],
    minimumGuaranteeMillions: deal.priceMillions,
    rightsCostMillions: deal.priceMillions,
    productionFundingMillions: 0,
    paidSpendMillions: deal.priceMillions,
    marketingReserveMillions: 0,
    contingencyMillions: 0,
    productionEscrow: createUnfundedPlatformAiProductionEscrow(0),
    commissioningLifecycle: null,
    committedAtAbsoluteWeek: deal.createdAtAbsoluteWeek,
    rightsReadyAtAbsoluteWeek: absoluteWeek,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
    productionHoldStartedAtAbsoluteWeek: null,
    forecast: {
        strategic: roundMillions(project.quality * 0.8),
        creative: project.quality,
        commercial: roundMillions(project.quality * 0.85),
        prestige: roundMillions(project.quality * 0.9),
        risk: 8,
    },
});

const transferPendingDeal = (
    player: Player,
    world: WorldState,
    deal: PlatformAiCatalogueDistressDeal,
    absoluteWeek: number,
    entitlement: SellerEntitlement,
): WorldState => {
    let seller = world.platforms![deal.sellerPlatformId];
    let buyer = world.platforms![deal.buyerPlatformId];
    const project = world.projects.find(item => item.id === deal.sourceProjectId)!;
    const availability = validateStreamingRightsAvailability({
        player: { ...player, world },
        world,
        sourceProjectId: project.id,
        buyerPlatformId: buyer.id,
        exclusivity: 'NON_EXCLUSIVE',
        startsAtAbsoluteWeek: deal.startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: deal.expiresAtAbsoluteWeek,
        excludeLicenseIds: entitlement.sourceContractId ? [entitlement.sourceContractId] : [],
    });
    if (
        !availability.available
        || buyer.ai!.rightsContracts.some(contract => contract.id === deal.buyerContractId)
        || buyer.ai!.slate.some(plan => plan.id === deal.buyerPlanId)
        || resolvePlatformController(player, seller.id) === 'PLAYER'
        || resolvePlatformController(player, buyer.id) === 'PLAYER'
    ) {
        return cancelPendingDeal(world, deal, absoluteWeek, 'Post-queue rights or control validation failed.');
    }
    const contract: OwnedStreamingCatalogLicense = createStreamingLicenseContract({
        id: deal.buyerContractId,
        sourceProject: project,
        buyerPlatformId: buyer.id,
        platformContentPlanId: deal.buyerPlanId,
        cataloguePackageId: null,
        contentSource: 'LICENSED_RELEASED_TITLE',
        licensorName: seller.name,
        territory: 'GLOBAL',
        countryIds: [],
        durationWeeks: deal.durationWeeks,
        exclusivity: 'NON_EXCLUSIVE',
        minimumGuarantee: millionsToFullCurrency(deal.priceMillions),
        platformRevenueShare: 70,
        signedAtAbsoluteWeek: absoluteWeek,
        startsAtAbsoluteWeek: deal.startsAtAbsoluteWeek,
        status: 'ACTIVE',
        origin: 'PLATFORM_TRADE',
        sellerType: 'PLATFORM',
        sellerPlatformId: seller.id,
        windowType: project.boxOffice > 0 ? 'SECOND_WINDOW' : 'FIRST_WINDOW',
        permanentPurchase: false,
        renewalOption: false,
        sublicensingAllowed: false,
        sequelRightsIncluded: false,
        changeOfControl: 'NOTICE',
        cancellationPenalty: 0,
    });
    buyer = {
        ...buyer,
        ai: {
            ...buyer.ai!,
            rightsContracts: [...buyer.ai!.rightsContracts, contract],
            slate: [...buyer.ai!.slate, buildBuyerPlan(buyer, project, deal, absoluteWeek)],
        },
    };
    seller = adjustCurrentFinanceCash(seller, absoluteWeek, deal.priceMillions, 'SELLER_RECEIPT');
    seller = resolveSellerStage(
        seller,
        deal,
        absoluteWeek,
        'APPLIED',
        `${project.title} transferred as a paid 104-week non-exclusive licence.`,
    );
    const transferred: PlatformAiCatalogueDistressDeal = {
        ...deal,
        status: 'TRANSFERRED',
        paymentDisposition: 'CAPTURED',
        paymentSettledAtAbsoluteWeek: buyer.ai!.pendingOneTimeObligations
            .find(item => item.id === deal.buyerObligationId)?.settledWeek ?? absoluteWeek,
        transferredAtAbsoluteWeek: absoluteWeek,
    };
    let next = replacePlatform(world, seller);
    next = replacePlatform(next, buyer);
    const canonicalRegistration = registerStreamingRightsContract(
        next.streamingRightsContracts,
        createStreamingRightsContractFromLicense({
            license: contract,
            seller: {
                type: 'AI_PLATFORM',
                id: seller.id,
                name: seller.name,
                platformId: seller.id,
            },
            buyer: {
                type: 'AI_PLATFORM',
                id: buyer.id,
                name: buyer.name,
                platformId: buyer.id,
            },
            guaranteeDisposition: 'PAID',
            settledAtAbsoluteWeek: absoluteWeek,
        }),
    );
    return {
        ...next,
        streamingRightsContracts: canonicalRegistration.registry,
        platformAiCatalogueDistressDeals: normalizePlatformAiCatalogueDistressDeals(
            (world.platformAiCatalogueDistressDeals || []).map(item => item.id === deal.id ? transferred : item),
        ),
    };
};

const resolvePendingCatalogueDeals = (
    player: Player,
    sourceWorld: WorldState,
    absoluteWeek: number,
): WorldState => {
    let world: WorldState = {
        ...sourceWorld,
        platformAiCatalogueDistressDeals: normalizePlatformAiCatalogueDistressDeals(
            sourceWorld.platformAiCatalogueDistressDeals,
        ),
    };
    for (const sourceDeal of world.platformAiCatalogueDistressDeals) {
        const deal = world.platformAiCatalogueDistressDeals.find(item => item.id === sourceDeal.id)!;
        if (deal.status !== 'PENDING_PAYMENT') continue;
        const seller = world.platforms?.[deal.sellerPlatformId];
        const buyer = world.platforms?.[deal.buyerPlatformId];
        if (
            resolvePlatformController(player, deal.sellerPlatformId) === 'PLAYER'
            || resolvePlatformController(player, deal.buyerPlatformId) === 'PLAYER'
        ) {
            world = cancelPendingDeal(world, deal, absoluteWeek, 'The pending licence was cancelled after platform control changed.');
            continue;
        }
        const episode = seller?.ai?.distressEpisodes.find(item => item.id === deal.episodeId);
        const activeCatalogueStage = Boolean(
            episode
            && episode.completedAtAbsoluteWeek === null
            && episode.status !== 'RECOVERED'
            && episode.status !== 'DORMANT'
            && DISTRESS_STAGE_ORDER[episode.currentStageIndex] === 'LICENSE_CATALOGUE'
            && episode.stageResults.some(result => (
                result.stage === 'LICENSE_CATALOGUE'
                && result.outcome === 'PENDING'
                && result.referenceId === deal.id
                && result.resolvedAtAbsoluteWeek === null
            )),
        );
        if (!activeCatalogueStage) {
            world = cancelPendingDeal(world, deal, absoluteWeek, 'The seller is no longer actively licensing catalogue in this distress episode.');
            continue;
        }
        const entitlement = seller && episode ? findEntitlementForDeal(world, seller, deal, absoluteWeek) : null;
        if (!seller || !buyer || !episode || !dealIsCanonical(world, deal, episode, entitlement)) {
            world = cancelPendingDeal(world, deal, absoluteWeek, 'Malformed or tampered catalogue deal was rejected.');
            continue;
        }
        const obligation = buyer.ai!.pendingOneTimeObligations.find(item => item.id === deal.buyerObligationId);
        if (
            !obligation
            || obligation.category !== 'CONTRACTUAL'
            || obligation.amountMillions !== deal.priceMillions
            || obligation.createdWeek !== deal.createdAtAbsoluteWeek
        ) {
            world = cancelPendingDeal(world, deal, absoluteWeek, 'Catalogue payment evidence did not match the canonical deal.');
            continue;
        }
        if (obligation.status === 'HELD') {
            if (absoluteWeek - deal.createdAtAbsoluteWeek >= CATALOGUE_DEAL_TIMEOUT_WEEKS) {
                world = cancelPendingDeal(world, deal, absoluteWeek, 'The buyer could not fund the licence within four weeks.');
            }
            continue;
        }
        if (obligation.settledWeek === null || obligation.settledWeek > absoluteWeek) {
            world = cancelPendingDeal(world, deal, absoluteWeek, 'Impossible settlement evidence was rejected.');
            continue;
        }
        world = transferPendingDeal(player, world, deal, absoluteWeek, entitlement!);
    }
    return world;
};

export interface CancelPendingPlatformAiCatalogueDistressDealsForAcquisitionInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}

export const cancelPendingPlatformAiCatalogueDistressDealsForAcquisition = (
    input: CancelPendingPlatformAiCatalogueDistressDealsForAcquisitionInput,
): WorldState => {
    let world = input.world;
    const deals = normalizePlatformAiCatalogueDistressDeals(world.platformAiCatalogueDistressDeals)
        .filter(deal => deal.status === 'PENDING_PAYMENT' && (
            deal.sellerPlatformId === input.platformId || deal.buyerPlatformId === input.platformId
        ));
    for (const deal of deals) {
        world = cancelPendingDeal(world, deal, input.absoluteWeek, 'The pending licence was cancelled before acquisition handoff.');
    }
    return world;
};

const latestFinanceShowsDistress = (platform: PlatformState): boolean => {
    const latest = platform.ai?.financeHistory.at(-1);
    return platform.ai?.status !== 'ACTIVE'
        || (platform.ai?.debtMillions || 0) > 0
        || Boolean(latest && (
            latest.debtIncurredMillions > 0
            || latest.lossRunwayWeeks !== null && latest.lossRunwayWeeks !== undefined && latest.lossRunwayWeeks < 8
        ));
};

const distressDecision = (
    platform: PlatformState,
    absoluteWeek: number,
    result: PlatformAiDistressStageResult,
): PlatformAiDecisionRecord => ({
    id: createDeterministicId('platform_ai_decision', platform.id, absoluteWeek, 'DISTRESS_EPISODE', result.stage),
    absoluteWeek,
    type: 'DISTRESS_RESPONSE',
    action: result.stage,
    summary: result.stage,
    reason: result.reason,
    cashImpactMillions: 0,
});

const openEpisode = (platformId: PlatformId, absoluteWeek: number): PlatformAiDistressEpisode => ({
    id: createDeterministicId('platform_ai_distress_episode', platformId, absoluteWeek),
    platformId,
    status: 'ACTIVE',
    startedAtAbsoluteWeek: absoluteWeek,
    completedAtAbsoluteWeek: null,
    currentStageIndex: 0,
    lastAdvancedAtAbsoluteWeek: Math.max(0, absoluteWeek - 1),
    stageResults: [],
});

const appliedResult = (
    stage: PlatformAiDistressAction,
    absoluteWeek: number,
    reason: string,
    referenceId: string | null = null,
): PlatformAiDistressStageResult => ({
    stage,
    outcome: 'APPLIED',
    enteredAtAbsoluteWeek: absoluteWeek,
    resolvedAtAbsoluteWeek: absoluteWeek,
    reason,
    referenceId,
});

const unavailableResult = (
    stage: PlatformAiDistressAction,
    absoluteWeek: number,
    reason: string,
): PlatformAiDistressStageResult => ({
    stage,
    outcome: 'UNAVAILABLE',
    enteredAtAbsoluteWeek: absoluteWeek,
    resolvedAtAbsoluteWeek: absoluteWeek,
    reason,
    referenceId: null,
});

const recordRescueFinance = (
    platform: PlatformState,
    absoluteWeek: number,
    rescueAmountMillions: number,
    debtReductionMillions: number,
): PlatformState => {
    const index = platform.ai!.financeHistory.findIndex(snapshot => snapshot.absoluteWeek === absoluteWeek);
    if (index < 0) return platform;
    const history = platform.ai!.financeHistory.slice();
    const snapshot = history[index];
    const cashRemainderMillions = roundMillions(rescueAmountMillions - debtReductionMillions);
    history[index] = {
        ...snapshot,
        rescueIncomeMillions: roundMillions(snapshot.rescueIncomeMillions + rescueAmountMillions),
        rescueDebtReductionMillions: roundMillions(snapshot.rescueDebtReductionMillions + debtReductionMillions),
        netCashFlowMillions: roundMillions(snapshot.netCashFlowMillions + cashRemainderMillions),
        closingCashMillions: roundMillions(snapshot.closingCashMillions + cashRemainderMillions),
        closingDebtMillions: roundMillions(Math.max(0, snapshot.closingDebtMillions - debtReductionMillions)),
    };
    return { ...platform, ai: { ...platform.ai!, financeHistory: history } };
};

const recordExternalFundingFinance = (
    platform: PlatformState,
    absoluteWeek: number,
    settledMillions: number,
    arrearsReductionMillions: number,
    debtReductionMillions: number,
): PlatformState => {
    const index = platform.ai!.financeHistory.findIndex(snapshot => snapshot.absoluteWeek === absoluteWeek);
    if (index < 0) return platform;
    const financeHistory = platform.ai!.financeHistory.slice();
    const snapshot = financeHistory[index];
    const cashRemainderMillions = roundMillions(
        settledMillions - arrearsReductionMillions - debtReductionMillions,
    );
    financeHistory[index] = {
        ...snapshot,
        externalInvestmentIncomeMillions: roundMillions(
            snapshot.externalInvestmentIncomeMillions + settledMillions,
        ),
        externalInvestmentArrearsReductionMillions: roundMillions(
            snapshot.externalInvestmentArrearsReductionMillions + arrearsReductionMillions,
        ),
        externalInvestmentDebtReductionMillions: roundMillions(
            snapshot.externalInvestmentDebtReductionMillions + debtReductionMillions,
        ),
        netCashFlowMillions: roundMillions(snapshot.netCashFlowMillions + cashRemainderMillions),
        closingCashMillions: roundMillions(snapshot.closingCashMillions + cashRemainderMillions),
        closingDebtMillions: roundMillions(Math.max(
            0,
            snapshot.closingDebtMillions - arrearsReductionMillions - debtReductionMillions,
        )),
    };
    return { ...platform, ai: { ...platform.ai!, financeHistory } };
};

const progressPlatform = (
    player: Player,
    source: PlatformState,
    absoluteWeek: number,
): PlatformState => {
    if (resolvePlatformController(player, source.id) === 'PLAYER') return source;
    let platform = normalizePlatformAiState(source, player.id, absoluteWeek);
    let episodes = normalizePlatformAiDistressEpisodes(
        platform.ai!.distressEpisodes,
        platform.id,
        absoluteWeek,
    );
    let episode = episodes.find(item => item.completedAtAbsoluteWeek === null) || null;
    const distressed = latestFinanceShowsDistress(platform);
    if (!distressed) {
        if (!episode) return platform;
        const recovered: PlatformAiDistressEpisode = {
            ...episode,
            status: 'RECOVERED',
            completedAtAbsoluteWeek: absoluteWeek,
            lastAdvancedAtAbsoluteWeek: absoluteWeek,
        };
        return {
            ...platform,
            ai: {
                ...platform.ai!,
                distressEpisodes: normalizePlatformAiDistressEpisodes(
                    episodes.map(item => item.id === recovered.id ? recovered : item),
                    platform.id,
                    absoluteWeek,
                ),
            },
        };
    }
    if (platform.ai!.status === 'DORMANT') return platform;
    if (!episode) {
        episode = openEpisode(platform.id, absoluteWeek);
        episodes = [...episodes, episode];
    }
    if (episode.lastAdvancedAtAbsoluteWeek >= absoluteWeek) {
        if (episodes === platform.ai!.distressEpisodes) return platform;
        return { ...platform, ai: { ...platform.ai!, distressEpisodes: episodes } };
    }
    if (episode.status === 'MONITORING_RECAPITALIZATION'
        && platform.ai!.restructuringFailedAtAbsoluteWeek === null) {
        return platform;
    }
    const stage = DISTRESS_STAGE_ORDER[episode.currentStageIndex];
    if (!stage) return platform;
    const existingStage = episode.stageResults.find(result => result.stage === stage);
    if (existingStage?.outcome === 'UNAVAILABLE' || existingStage?.outcome === 'FAILED') {
        if ((existingStage.resolvedAtAbsoluteWeek ?? absoluteWeek) >= absoluteWeek) return platform;
        const advanced: PlatformAiDistressEpisode = {
            ...episode,
            currentStageIndex: Math.min(DISTRESS_STAGE_ORDER.length, episode.currentStageIndex + 1),
            lastAdvancedAtAbsoluteWeek: absoluteWeek,
        };
        return {
            ...platform,
            ai: {
                ...platform.ai!,
                distressEpisodes: episodes.map(item => item.id === advanced.id ? advanced : item),
            },
        };
    }
    if (existingStage) return platform;

    // Cross-company catalogue transactions are queued by the world resolver so
    // buyer obligation, seller episode and deal ledger are persisted together.
    if (stage === 'LICENSE_CATALOGUE') return platform;

    let result: PlatformAiDistressStageResult;
    if (stage === 'FREEZE_GREENLIGHTS') {
        result = appliedResult(stage, absoluteWeek, 'New discretionary greenlights are frozen while mandatory obligations are protected.');
        platform = { ...platform, ai: { ...platform.ai!, status: 'DISTRESSED' } };
    } else if (stage === 'PAUSE_RESEARCH') {
        result = appliedResult(stage, absoluteWeek, 'New research commitments are paused until recurring losses recover.');
        platform = { ...platform, ai: { ...platform.ai!, status: 'DISTRESSED' } };
    } else if (stage === 'HOLD_COMMISSION') {
        const holdable = platform.ai!.slate
            .filter(plan => ['BRIEF', 'PRODUCER_SELECTED', 'GREENLIT'].includes(plan.status))
            .sort((left, right) => left.id.localeCompare(right.id))[0];
        if (holdable) {
            result = appliedResult(stage, absoluteWeek, `${holdable.title} was placed on hold before another discretionary payment.`, holdable.id);
            platform = {
                ...platform,
                ai: {
                    ...platform.ai!,
                    slate: platform.ai!.slate.map(plan => plan.id === holdable.id ? { ...plan, status: 'ON_HOLD' } : plan),
                },
            };
        } else {
            result = unavailableResult(stage, absoluteWeek, 'No unpaid commission was eligible to hold.');
        }
    } else if (stage === 'WITHDRAW_REGION') {
        const withdrawable = platform.ai!.marketOperations
            .filter(operation => operation.status === 'ACTIVE')
            .slice()
            .sort((left, right) => (
                Number(left.countryProfile?.audienceSize || 0) - Number(right.countryProfile?.audienceSize || 0)
                || Number(right.weeklyOperatingCost || 0) - Number(left.weeklyOperatingCost || 0)
                || left.id.localeCompare(right.id)
            ))[0];
        if (withdrawable) {
            result = appliedResult(
                stage,
                absoluteWeek,
                `${withdrawable.countryProfile?.country || withdrawable.countryId || 'A weak market'} was suspended to reduce recurring cost.`,
                withdrawable.id,
            );
            platform = {
                ...platform,
                ai: {
                    ...platform.ai!,
                    marketOperations: platform.ai!.marketOperations.map(operation => operation.id === withdrawable.id
                        ? { ...operation, status: 'SUSPENDED', suspendedAtAbsoluteWeek: absoluteWeek }
                        : operation),
                    capabilities: {
                        ...platform.ai!.capabilities,
                        activeCountryIds: platform.ai!.capabilities.activeCountryIds
                            .filter(countryId => countryId !== withdrawable.countryId),
                    },
                },
            };
        } else {
            result = unavailableResult(stage, absoluteWeek, 'No active market remained to withdraw.');
        }
    } else if (stage === 'RESTRUCTURE') {
        result = appliedResult(stage, absoluteWeek, 'Leadership entered a formal restructuring after operating cuts were exhausted.');
        platform = {
            ...platform,
            ai: {
                ...platform.ai!,
                status: 'RESTRUCTURING',
                restructuringStartedAtAbsoluteWeek: absoluteWeek,
                restructuringFailedAtAbsoluteWeek: null,
                healthyOperatingWeeks: 0,
                restructuringInterestRateMultiplier: Math.max(
                    0.5,
                    platform.ai!.restructuringInterestRateMultiplier * RESTRUCTURED_INTEREST_MULTIPLIER,
                ),
                debtInterestRateAnnualPercent: Math.max(
                    2,
                    Math.min(platform.ai!.debtInterestRateAnnualPercent - 1, platform.ai!.debtInterestRateAnnualPercent * 0.5),
                ),
            },
        };
    } else if (stage === 'PARENT_RESCUE') {
        if (platform.ai!.restructuringFailedAtAbsoluteWeek === null) return platform;
        const quote = rescueQuote(platform, absoluteWeek);
        const rescueAmount = quote.amountMillions;
        if (PLATFORM_AI_PROFILES[platform.id].parentBacking !== 'NONE' && rescueAmount > 0) {
            result = appliedResult(stage, absoluteWeek, 'Capped parent support restored part of the operating target.');
            const debtReductionMillions = roundMillions(Math.min(platform.ai!.debtMillions, rescueAmount));
            const targetReserveMillions = quote.targetReserveMillions;
            const cashRemainderMillions = roundMillions(Math.min(
                rescueAmount - debtReductionMillions,
                Math.max(0, targetReserveMillions * 0.5 - platform.cashReserve),
            ));
            platform = {
                ...platform,
                cashReserve: roundMillions(platform.cashReserve + cashRemainderMillions),
                ai: {
                    ...platform.ai!,
                    status: 'RESTRUCTURING',
                    debtMillions: roundMillions(platform.ai!.debtMillions - debtReductionMillions),
                    lastRescueAbsoluteWeek: absoluteWeek,
                    rescueCount: platform.ai!.rescueCount + 1,
                    restructuringStartedAtAbsoluteWeek: absoluteWeek,
                    restructuringFailedAtAbsoluteWeek: null,
                    healthyOperatingWeeks: 0,
                },
            };
            platform = recordRescueFinance(platform, absoluteWeek, rescueAmount, debtReductionMillions);
        } else {
            result = unavailableResult(stage, absoluteWeek, 'No eligible parent rescue remained after restructuring failed.');
        }
    } else if (stage === 'EXTERNAL_RECAPITALIZATION') {
        if (platform.ai!.restructuringFailedAtAbsoluteWeek === null) return platform;
        const quoteInput = {
            player,
            platform,
            episode,
            absoluteWeek,
            competitivePressure: 0.5,
        };
        const quote = quotePlatformAiExternalRecapitalization(quoteInput);
        const fundingRecord = createPlatformAiFundingRecord(quoteInput, quote);
        if (!quote.eligible || quote.amountMillions <= 0) {
            result = unavailableResult(stage, absoluteWeek, quote.reason);
            platform = {
                ...platform,
                ai: {
                    ...platform.ai!,
                    externalRecapitalizations: [...platform.ai!.externalRecapitalizations, fundingRecord],
                },
            };
        } else {
            const latest = platform.ai!.financeHistory.at(-1);
            const arrearsOutstandingMillions = roundMillions(Math.min(
                platform.ai!.debtMillions,
                (latest?.unfundedMandatoryCostMillions || 0)
                    + (latest?.unfundedSettledObligationCostMillions || 0)
                    + (latest?.unfundedFinancingCostMillions || 0),
            ));
            const arrearsReductionMillions = roundMillions(Math.min(
                quote.amountMillions,
                arrearsOutstandingMillions,
            ));
            const remainingAfterArrearsMillions = roundMillions(quote.amountMillions - arrearsReductionMillions);
            const debtReductionMillions = roundMillions(Math.min(
                remainingAfterArrearsMillions,
                Math.max(0, platform.ai!.debtMillions - arrearsReductionMillions),
            ));
            const cashRemainderMillions = roundMillions(
                quote.amountMillions - arrearsReductionMillions - debtReductionMillions,
            );
            const settledRecord = {
                ...fundingRecord,
                status: 'SETTLED' as const,
                settledMillions: quote.amountMillions,
                arrearsReductionMillions,
                debtReductionMillions,
                cashRemainderMillions,
                settledAtAbsoluteWeek: absoluteWeek,
                cooldownUntilAbsoluteWeek: absoluteWeek + 104,
            };
            result = appliedResult(
                stage,
                absoluteWeek,
                `${quote.investorArchetype} funding settled with debt-first restrictions.`,
                settledRecord.id,
            );
            platform = {
                ...platform,
                cashReserve: roundMillions(platform.cashReserve + cashRemainderMillions),
                ai: {
                    ...platform.ai!,
                    status: 'RESTRUCTURING',
                    debtMillions: roundMillions(
                        platform.ai!.debtMillions - arrearsReductionMillions - debtReductionMillions,
                    ),
                    externalRecapitalizations: [...platform.ai!.externalRecapitalizations, settledRecord],
                    spendingRestrictions: getPlatformAiPostFundingRestrictions(absoluteWeek),
                    restructuringStartedAtAbsoluteWeek: absoluteWeek,
                    restructuringFailedAtAbsoluteWeek: null,
                    healthyOperatingWeeks: 0,
                },
            };
            platform = recordExternalFundingFinance(
                platform,
                absoluteWeek,
                quote.amountMillions,
                arrearsReductionMillions,
                debtReductionMillions,
            );
        }
    } else if (stage === 'BANKRUPTCY_ADMINISTRATION') {
        if (platform.ai!.restructuringFailedAtAbsoluteWeek === null) return platform;
        result = appliedResult(
            stage,
            absoluteWeek,
            'The platform entered bankruptcy administration after independent financing failed.',
            episode.id,
        );
        platform = {
            ...platform,
            ai: {
                ...platform.ai!,
                status: 'RESTRUCTURING',
                administration: {
                    enteredAtAbsoluteWeek: absoluteWeek,
                    episodeId: episode.id,
                    outcome: 'PENDING',
                    resolvedAtAbsoluteWeek: null,
                    referenceId: null,
                },
                spendingRestrictions: {
                    source: 'ADMINISTRATION',
                    blocksNewBids: true,
                    blocksNewGreenlights: true,
                    blocksNewResearch: true,
                    blocksExpansion: true,
                    expiresAtAbsoluteWeek: null,
                },
            },
        };
    } else if (stage === 'DORMANT') {
        if (platform.ai!.status === 'RESTRUCTURING' && platform.ai!.restructuringFailedAtAbsoluteWeek === null) return platform;
        const administrationOutcome = platform.ai!.administration?.outcome === 'PENDING'
            ? choosePlatformAiAdministrationOutcome({ player, platform, episode, absoluteWeek })
            : null;
        result = appliedResult(
            stage,
            absoluteWeek,
            administrationOutcome?.reason || 'No independent recovery path remained after the fixed distress ladder.',
            administrationOutcome?.referenceId || null,
        );
        platform = {
            ...platform,
            ai: {
                ...platform.ai!,
                status: 'DORMANT',
                administration: platform.ai!.administration && administrationOutcome
                    ? {
                        ...platform.ai!.administration,
                        outcome: administrationOutcome.outcome,
                        resolvedAtAbsoluteWeek: absoluteWeek,
                        referenceId: administrationOutcome.referenceId,
                    }
                    : platform.ai!.administration,
            },
        };
    } else {
        result = unavailableResult(stage, absoluteWeek, `${stage} is not available for this platform state.`);
    }
    const nextEpisode: PlatformAiDistressEpisode = {
        ...episode,
        status: stage === 'RESTRUCTURE' && result.outcome === 'APPLIED'
            ? 'MONITORING_RESTRUCTURE'
            : stage === 'PARENT_RESCUE' && result.outcome === 'APPLIED'
                ? 'MONITORING_RESCUE'
                : stage === 'EXTERNAL_RECAPITALIZATION' && result.outcome === 'APPLIED'
                    ? 'MONITORING_RECAPITALIZATION'
                    : stage === 'BANKRUPTCY_ADMINISTRATION' && result.outcome === 'APPLIED'
                        ? 'ADMINISTRATION'
                : stage === 'DORMANT' && result.outcome === 'APPLIED'
                    ? 'DORMANT'
                    : episode.status,
        completedAtAbsoluteWeek: stage === 'DORMANT' && result.outcome === 'APPLIED'
            ? absoluteWeek
            : episode.completedAtAbsoluteWeek,
        currentStageIndex: result.outcome === 'APPLIED'
            ? Math.min(DISTRESS_STAGE_ORDER.length, episode.currentStageIndex + 1)
            : episode.currentStageIndex,
        lastAdvancedAtAbsoluteWeek: absoluteWeek,
        stageResults: [...episode.stageResults, result],
    };
    return {
        ...platform,
        ai: {
            ...platform.ai!,
            distressEpisodes: normalizePlatformAiDistressEpisodes(
                episodes.map(item => item.id === nextEpisode.id ? nextEpisode : item),
                platform.id,
                absoluteWeek,
            ),
            decisionHistory: appendPlatformAiDecisions(
                platform.ai!.decisionHistory,
                [distressDecision(platform, absoluteWeek, result)],
            ),
        },
    };
};

export const progressPlatformAiDistressWorld = (
    input: ProgressPlatformAiDistressWorldInput,
): ProgressPlatformAiDistressWorldResult => {
    if (!input.world.platforms) return { world: input.world, changed: false };
    let world = resolvePendingCatalogueDeals(input.player, input.world, input.absoluteWeek);
    world = settlePlatformTradeRevenueShares(input.player, world, input.absoluteWeek);
    for (const platformId of Object.keys(world.platforms!).sort() as PlatformId[]) {
        const before = world.platforms![platformId];
        const after = progressPlatform({ ...input.player, world }, before, input.absoluteWeek);
        if (JSON.stringify(after) !== JSON.stringify(before)) world = replacePlatform(world, after);
        world = queueCatalogueDeal({ ...input.player, world }, world, platformId, input.absoluteWeek);
    }
    const changed = JSON.stringify(world) !== JSON.stringify(input.world);
    return changed ? { world, changed: true } : { world: input.world, changed: false };
};
