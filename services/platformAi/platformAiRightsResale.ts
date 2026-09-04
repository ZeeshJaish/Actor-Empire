import type {
    PlatformAiContentPlan,
    PlatformId,
    PlatformState,
    Player,
    StreamingRightsContract,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeStreamingDayOneMarketIds } from '../streamingDayOneMarkets';
import { normalizeStreamingRightsContractRegistry } from '../streamingRightsCore';
import { settleStreamingRightsTransfer } from '../streamingRightsTransactions';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { clampPlatformContentPlanSupport } from './platformAiResearch';
import { resolvePlatformController } from './platformAiState';

const RESALE_CADENCE_WEEKS = 4;
const MINIMUM_REMAINING_WEEKS = 8;

export interface PlatformAiRightsResaleWeekResult {
    world: WorldState;
    listedTransactionIds: string[];
    settledTransactionIds: string[];
}

const exactCountryIds = (contract: StreamingRightsContract): string[] => (
    contract.territory === 'GLOBAL' ? [] : normalizeStreamingDayOneMarketIds(contract.countryIds).sort()
);

const sellerNeedsDisposal = (platform: PlatformState | undefined): boolean => Boolean(
    platform?.ai
    && (
        platform.ai.status === 'DISTRESSED'
        || platform.ai.status === 'RESTRUCTURING'
        || platform.ai.rightsContracts.filter(contract => contract.status === 'ACTIVE').length >= 12
    )
);

const candidateScore = (
    buyer: PlatformState,
    contract: StreamingRightsContract,
): number => {
    const profile = PLATFORM_AI_PROFILES[buyer.id];
    const genreFit = profile.preferredGenres.includes(contract.genre as any) ? 30 : 0;
    const catalogueGap = Math.max(0, 18 - (buyer.ai?.rightsContracts.length || 0)) * 2;
    return genreFit + catalogueGap + profile.competence.negotiation * 4 + Math.min(40, buyer.cashReserve / 100);
};

const transferPrice = (contract: StreamingRightsContract, absoluteWeek: number): number => {
    const remaining = Math.max(1, contract.expiresAtAbsoluteWeek - absoluteWeek);
    const remainingRatio = Math.min(1, remaining / Math.max(1, contract.durationWeeks));
    return Math.max(1_000_000, Math.round(contract.minimumGuarantee * remainingRatio * 0.55 / 250_000) * 250_000);
};

const buyerCanHold = (
    player: Player,
    buyer: PlatformState,
    contract: StreamingRightsContract,
    price: number,
): boolean => {
    if (!buyer.ai || buyer.id === contract.buyer.platformId || resolvePlatformController(player, buyer.id) !== 'AI') return false;
    if (buyer.ai.status !== 'ACTIVE') return false;
    const requiredCountries = exactCountryIds(contract);
    const activeCountries = new Set(normalizeStreamingDayOneMarketIds(buyer.ai.capabilities.activeCountryIds));
    if (requiredCountries.some(countryId => !activeCountries.has(countryId))) return false;
    const runwayFloor = PLATFORM_AI_PROFILES[buyer.id].baseWeeklyOperationsMillions * 8;
    if (buyer.cashReserve - price / 1_000_000 < runwayFloor) return false;
    return !buyer.ai.rightsContracts.some(candidate => (
        candidate.status === 'ACTIVE'
        && candidate.sourceProjectId === contract.sourceProjectId
        && candidate.expiresAtAbsoluteWeek >= contract.startsAtAbsoluteWeek
    ));
};

const projectPlans = (
    world: WorldState,
    sellerId: PlatformId,
    buyerId: PlatformId,
    sourceContractId: string,
    successorContractId: string,
    price: number,
    absoluteWeek: number,
): WorldState => {
    const seller = world.platforms?.[sellerId];
    const buyer = world.platforms?.[buyerId];
    if (!seller?.ai || !buyer?.ai) return world;
    const sourcePlan = seller.ai.slate.find(plan => plan.rightsContractIds.includes(sourceContractId));
    const sellerSlate = seller.ai.slate.map(plan => (
        plan.rightsContractIds.includes(sourceContractId)
            ? { ...plan, status: 'SOLD' as const, releaseReadiness: null }
            : plan
    ));
    let buyerSlate = buyer.ai.slate;
    if (sourcePlan && !buyerSlate.some(plan => plan.rightsContractIds.includes(successorContractId))) {
        const acquiredPlan: PlatformAiContentPlan = clampPlatformContentPlanSupport({
            ...sourcePlan,
            id: createDeterministicId('platform_ai_resale_plan', successorContractId),
            platformId: buyerId,
            controllerAtCommitment: 'AI',
            status: 'RIGHTS_READY',
            rightsContractIds: [successorContractId],
            minimumGuaranteeMillions: price / 1_000_000,
            rightsCostMillions: price / 1_000_000,
            paidSpendMillions: price / 1_000_000,
            committedAtAbsoluteWeek: absoluteWeek,
            rightsReadyAtAbsoluteWeek: absoluteWeek,
            localizationReadyAtAbsoluteWeek: null,
            premiereAtAbsoluteWeek: null,
            releasePattern: null,
            releaseEntries: [],
            releaseReadiness: null,
            scheduledAtAbsoluteWeek: null,
            releasedAtAbsoluteWeek: null,
        }, buyer.ai.capabilities);
        buyerSlate = [...buyerSlate, acquiredPlan];
    }
    return {
        ...world,
        platforms: {
            ...world.platforms!,
            [sellerId]: { ...seller, ai: { ...seller.ai, slate: sellerSlate } },
            [buyerId]: { ...buyer, ai: { ...buyer.ai, slate: buyerSlate } },
        },
    };
};

export const processPlatformAiRightsResaleWeek = (
    player: Player,
    sourceWorld: WorldState,
    absoluteWeek: number,
): PlatformAiRightsResaleWeekResult => {
    if (absoluteWeek % RESALE_CADENCE_WEEKS !== 0) {
        return { world: sourceWorld, listedTransactionIds: [], settledTransactionIds: [] };
    }
    let world = sourceWorld;
    const registry = normalizeStreamingRightsContractRegistry(world.streamingRightsContracts);
    const candidates = Object.values(registry)
        .filter(contract => (
            contract.status === 'ACTIVE'
            && !contract.permanentPurchase
            && contract.buyer.type === 'AI_PLATFORM'
            && contract.buyer.platformId
            && contract.expiresAtAbsoluteWeek - absoluteWeek >= MINIMUM_REMAINING_WEEKS
            && resolvePlatformController(player, contract.buyer.platformId) === 'AI'
            && sellerNeedsDisposal(world.platforms?.[contract.buyer.platformId])
        ))
        .sort((left, right) => left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek || left.id.localeCompare(right.id));
    for (const source of candidates) {
        const sellerId = source.buyer.platformId!;
        const seller = world.platforms?.[sellerId];
        if (!seller?.ai) continue;
        const price = transferPrice(source, absoluteWeek);
        const buyer = Object.values(world.platforms || {})
            .filter(candidate => buyerCanHold({ ...player, world }, candidate, source, price))
            .sort((left, right) => candidateScore(right, source) - candidateScore(left, source) || left.id.localeCompare(right.id))[0];
        if (!buyer) continue;
        const transfer = settleStreamingRightsTransfer(
            { ...player, world },
            {
                sourceContractId: source.id,
                seller: source.buyer,
                buyer: { type: 'AI_PLATFORM', id: buyer.id, name: buyer.name, platformId: buyer.id },
                askingPrice: price,
                price,
                absoluteWeek,
                idempotencyKey: `platform-ai-rights-resale:${source.id}:${sellerId}:${buyer.id}:${absoluteWeek}`,
                controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
            },
        );
        if (!transfer.changed) continue;
        world = projectPlans(
            transfer.player.world,
            sellerId,
            buyer.id,
            source.id,
            transfer.successorContract.id,
            price,
            absoluteWeek,
        );
        return {
            world,
            listedTransactionIds: [transfer.transaction.id],
            settledTransactionIds: [transfer.transaction.id],
        };
    }
    return { world, listedTransactionIds: [], settledTransactionIds: [] };
};
