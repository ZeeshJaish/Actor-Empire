import type {
    Player,
    StreamingGuaranteeRecoupment,
    StreamingRoyaltySettlement,
    StreamingRoyaltySettlementRegistry,
    StreamingTitleRevenueAttribution,
    StreamingTitleRevenueSignal,
} from '../types';
import { createDeterministicId } from './deterministicRandom';

const finiteNonNegative = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
};

const roundMoney = (value: number): number => Math.max(0, Math.round(finiteNonNegative(value)));
const roundWeight = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const distributeIntegerTotal = (total: number, weights: number[]): number[] => {
    const integerTotal = roundMoney(total);
    if (!weights.length) return [];
    const normalized = weights.map(weight => finiteNonNegative(weight));
    const weightTotal = normalized.reduce((sum, weight) => sum + weight, 0);
    const effective = weightTotal > 0 ? normalized : normalized.map(() => 1);
    const effectiveTotal = effective.reduce((sum, weight) => sum + weight, 0);
    const raw = effective.map(weight => integerTotal * weight / effectiveTotal);
    const allocated = raw.map(Math.floor);
    let remaining = integerTotal - allocated.reduce((sum, value) => sum + value, 0);
    raw
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
        .forEach(row => {
            if (remaining <= 0) return;
            allocated[row.index] += 1;
            remaining -= 1;
        });
    return allocated;
};

export interface AttributeStreamingTitleRevenueInput {
    subscriptionRevenue: number;
    titles: StreamingTitleRevenueSignal[];
}

export const attributeStreamingTitleRevenue = (
    input: AttributeStreamingTitleRevenueInput,
): StreamingTitleRevenueAttribution[] => {
    if (!Array.isArray(input.titles) || !input.titles.length) return [];
    const rows = input.titles.map(title => ({
        ...title,
        viewingAccounts: finiteNonNegative(title.viewingAccounts),
        watchHours: finiteNonNegative(title.watchHours),
        subscriberAcquisition: finiteNonNegative(title.subscriberAcquisition),
        subscriberRetention: finiteNonNegative(title.subscriberRetention),
    }));
    const accountTotal = rows.reduce((sum, row) => sum + row.viewingAccounts, 0);
    const watchTotal = rows.reduce((sum, row) => sum + row.watchHours, 0);
    const acquisitionTotal = rows.reduce((sum, row) => sum + row.subscriberAcquisition, 0);
    const retentionTotal = rows.reduce((sum, row) => sum + row.subscriberRetention, 0);
    const weights = rows.map(row => (
        (watchTotal > 0 ? row.watchHours / watchTotal * 0.45 : 0)
        + (accountTotal > 0 ? row.viewingAccounts / accountTotal * 0.25 : 0)
        + (acquisitionTotal > 0 ? row.subscriberAcquisition / acquisitionTotal * 0.2 : 0)
        + (retentionTotal > 0 ? row.subscriberRetention / retentionTotal * 0.1 : 0)
    ));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = totalWeight > 0
        ? weights.map(weight => weight / totalWeight)
        : weights.map(() => 1 / weights.length);
    const subscriptionAllocations = distributeIntegerTotal(input.subscriptionRevenue, normalizedWeights);

    return rows.map((row, index) => {
        const attributedSubscriptionRevenue = subscriptionAllocations[index] || 0;
        const attributedAdvertisingRevenue = roundMoney(row.advertisingRevenue);
        const attributedTransactionalRevenue = roundMoney(row.transactionalRevenue);
        const allowedDeductions = roundMoney(row.taxesRefundsAndStorefrontFees);
        return {
            projectId: String(row.projectId || '').trim(),
            contributionWeight: roundWeight(normalizedWeights[index]),
            attributedSubscriptionRevenue,
            attributedAdvertisingRevenue,
            attributedTransactionalRevenue,
            allowedDeductions,
            adjustedGrossReceipts: Math.max(
                0,
                attributedSubscriptionRevenue
                + attributedAdvertisingRevenue
                + attributedTransactionalRevenue
                - allowedDeductions,
            ),
        };
    });
};

export interface CalculateStreamingContractRoyaltyInput {
    adjustedGrossReceipts: number;
    licensorRevenueShare: number;
    minimumGuarantee: number;
    guaranteeRecoupment: StreamingGuaranteeRecoupment;
    backendCap: number | null;
    cumulativeRoyaltyAccrued: number;
    cumulativeRoyaltyPaid: number;
}

export interface StreamingContractRoyaltyCalculation {
    grossRoyaltyAccrued: number;
    royaltyPayable: number;
    cumulativeRoyaltyAccrued: number;
    cumulativeRoyaltyPaid: number;
    recoupmentRemaining: number;
    capRemaining: number | null;
}

export const calculateStreamingContractRoyalty = (
    input: CalculateStreamingContractRoyaltyInput,
): StreamingContractRoyaltyCalculation => {
    const adjustedGrossReceipts = finiteNonNegative(input.adjustedGrossReceipts);
    const licensorRevenueShare = Math.min(100, finiteNonNegative(input.licensorRevenueShare));
    const minimumGuarantee = roundMoney(input.minimumGuarantee);
    const priorAccrued = roundMoney(input.cumulativeRoyaltyAccrued);
    const priorPaid = roundMoney(input.cumulativeRoyaltyPaid);
    const grossRoyaltyAccrued = roundMoney(adjustedGrossReceipts * licensorRevenueShare / 100);
    const cumulativeRoyaltyAccrued = priorAccrued + grossRoyaltyAccrued;
    const rawPayable = input.guaranteeRecoupment === 'RECOUPABLE'
        ? Math.max(0, cumulativeRoyaltyAccrued - minimumGuarantee) - Math.max(0, priorAccrued - minimumGuarantee)
        : grossRoyaltyAccrued;
    const backendCap = input.backendCap === null ? null : roundMoney(input.backendCap);
    const capRemainingBeforePayment = backendCap === null ? null : Math.max(0, backendCap - priorPaid);
    const royaltyPayable = roundMoney(capRemainingBeforePayment === null
        ? rawPayable
        : Math.min(rawPayable, capRemainingBeforePayment));
    const cumulativeRoyaltyPaid = priorPaid + royaltyPayable;
    return {
        grossRoyaltyAccrued,
        royaltyPayable,
        cumulativeRoyaltyAccrued,
        cumulativeRoyaltyPaid,
        recoupmentRemaining: input.guaranteeRecoupment === 'RECOUPABLE'
            ? Math.max(0, minimumGuarantee - cumulativeRoyaltyAccrued)
            : 0,
        capRemaining: backendCap === null ? null : Math.max(0, backendCap - cumulativeRoyaltyPaid),
    };
};

const isValidSettlement = (value: StreamingRoyaltySettlement): boolean => Boolean(
    value
    && value.id
    && value.idempotencyKey
    && value.contractId
    && value.projectId
    && value.sellerStudioId
    && Number.isFinite(value.absoluteWeek)
);

export const normalizeStreamingRoyaltySettlementRegistry = (value: unknown): StreamingRoyaltySettlementRegistry => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const registry: StreamingRoyaltySettlementRegistry = {};
    for (const raw of Object.values(value as Record<string, unknown>)) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const source = raw as Record<string, unknown>;
        const settlement: StreamingRoyaltySettlement = {
            id: String(source.id || '').trim(),
            idempotencyKey: String(source.idempotencyKey || '').trim(),
            contractId: String(source.contractId || '').trim(),
            projectId: String(source.projectId || '').trim(),
            buyerPlatformId: source.buyerPlatformId === null ? null : source.buyerPlatformId as StreamingRoyaltySettlement['buyerPlatformId'],
            sellerStudioId: String(source.sellerStudioId || '').trim(),
            absoluteWeek: Math.max(0, Math.floor(Number(source.absoluteWeek) || 0)),
            adjustedGrossReceipts: roundMoney(source.adjustedGrossReceipts as number),
            grossRoyaltyAccrued: roundMoney(source.grossRoyaltyAccrued as number),
            royaltyPaid: roundMoney(source.royaltyPaid as number),
            recoupmentRemaining: roundMoney(source.recoupmentRemaining as number),
            capRemaining: source.capRemaining === null ? null : roundMoney(source.capRemaining as number),
        };
        if (!isValidSettlement(settlement) || registry[settlement.id]) continue;
        registry[settlement.id] = settlement;
    }
    return registry;
};

export const registerStreamingRoyaltySettlement = (
    value: StreamingRoyaltySettlementRegistry | null | undefined,
    settlement: StreamingRoyaltySettlement,
): { registry: StreamingRoyaltySettlementRegistry; changed: boolean } => {
    const registry = value && typeof value === 'object' ? value : {};
    if (!isValidSettlement(settlement)) return { registry, changed: false };
    if (registry[settlement.id] || Object.values(registry).some(row => row.idempotencyKey === settlement.idempotencyKey)) {
        return { registry, changed: false };
    }
    return { registry: { ...registry, [settlement.id]: settlement }, changed: true };
};

export interface SettleStreamingContractRoyaltyForPlayerInput {
    contractId: string;
    attribution: StreamingTitleRevenueAttribution;
    absoluteWeek: number;
}

export interface SettleStreamingContractRoyaltyForPlayerResult {
    player: Player;
    changed: boolean;
    royaltyPaid: number;
    settlementId: string | null;
}

export const settleStreamingContractRoyaltyForPlayer = (
    player: Player,
    input: SettleStreamingContractRoyaltyForPlayerInput,
): SettleStreamingContractRoyaltyForPlayerResult => {
    const contract = player.world.streamingRightsContracts?.[input.contractId];
    if (!contract || contract.status !== 'ACTIVE') {
        return { player, changed: false, royaltyPaid: 0, settlementId: null };
    }
    const absoluteWeek = Math.max(0, Math.floor(Number(input.absoluteWeek) || 0));
    if (absoluteWeek < contract.startsAtAbsoluteWeek || absoluteWeek >= contract.expiresAtAbsoluteWeek) {
        return { player, changed: false, royaltyPaid: 0, settlementId: null };
    }
    const idempotencyKey = `streaming-royalty:${contract.id}:${absoluteWeek}`;
    const existing = Object.values(player.world.streamingRoyaltySettlements || {})
        .find(row => row.idempotencyKey === idempotencyKey);
    if (existing) {
        return { player, changed: false, royaltyPaid: 0, settlementId: existing.id };
    }
    const calculation = calculateStreamingContractRoyalty({
        adjustedGrossReceipts: input.attribution.adjustedGrossReceipts,
        licensorRevenueShare: contract.licensorRevenueShare,
        minimumGuarantee: contract.minimumGuarantee,
        guaranteeRecoupment: contract.guaranteeRecoupment,
        backendCap: contract.backendCap,
        cumulativeRoyaltyAccrued: contract.cumulativeRoyaltyAccrued,
        cumulativeRoyaltyPaid: contract.cumulativeRoyaltyPaid,
    });
    const settlementId = createDeterministicId('streaming_royalty', contract.id, absoluteWeek);
    const settlement: StreamingRoyaltySettlement = {
        id: settlementId,
        idempotencyKey,
        contractId: contract.id,
        projectId: contract.sourceProjectId,
        buyerPlatformId: contract.buyer.platformId,
        sellerStudioId: contract.seller.id,
        absoluteWeek,
        adjustedGrossReceipts: input.attribution.adjustedGrossReceipts,
        grossRoyaltyAccrued: calculation.grossRoyaltyAccrued,
        royaltyPaid: calculation.royaltyPayable,
        recoupmentRemaining: calculation.recoupmentRemaining,
        capRemaining: calculation.capRemaining,
    };
    const registration = registerStreamingRoyaltySettlement(player.world.streamingRoyaltySettlements, settlement);
    if (!registration.changed) {
        return { player, changed: false, royaltyPaid: 0, settlementId: null };
    }

    const buyerPlatformId = contract.buyer.platformId;
    const platforms = buyerPlatformId && player.world.platforms?.[buyerPlatformId]
        ? {
            ...player.world.platforms,
            [buyerPlatformId]: {
                ...player.world.platforms[buyerPlatformId],
                cashReserve: Math.max(
                    0,
                    player.world.platforms[buyerPlatformId].cashReserve - calculation.royaltyPayable / 1_000_000,
                ),
            },
        }
        : player.world.platforms;
    const businesses = player.businesses.map(business => {
        if (business.id !== contract.seller.id || business.type !== 'PRODUCTION_HOUSE') return business;
        const currentRelations = business.studioState?.platformRelations || {};
        const currentRelation = buyerPlatformId ? currentRelations[buyerPlatformId] : undefined;
        const completedDeals = Math.max(0, Math.floor(Number(currentRelation?.completedDeals || 0)));
        const profitableDeals = Math.max(0, Math.min(completedDeals, Math.floor(Number(currentRelation?.profitableDeals || 0))));
        const relationship = buyerPlatformId ? {
            ...currentRelations,
            [buyerPlatformId]: {
                trustModifier: Math.max(-8, Math.min(8, Number(currentRelation?.trustModifier || 0))),
                recoveryWeeksRemaining: Math.max(0, Number(currentRelation?.recoveryWeeksRemaining || 0)),
                completedDeals,
                profitableDeals: calculation.royaltyPayable > 0
                    ? Math.min(completedDeals, profitableDeals + 1)
                    : profitableDeals,
                loyaltyScore: Math.min(100, Math.max(0, Number(currentRelation?.loyaltyScore || 0)) + (calculation.royaltyPayable > 0 ? 1 : 0)),
                realizedPartnerValue: Math.max(0, Number(currentRelation?.realizedPartnerValue || 0)) + input.attribution.adjustedGrossReceipts,
                lastBreachWeek: currentRelation?.lastBreachWeek,
                lastBreachYear: currentRelation?.lastBreachYear,
            },
        } : currentRelations;
        return {
            ...business,
            balance: business.balance + calculation.royaltyPayable,
            stats: {
                ...business.stats,
                weeklyRevenue: business.stats.weeklyRevenue + calculation.royaltyPayable,
                weeklyProfit: business.stats.weeklyProfit + calculation.royaltyPayable,
                lifetimeRevenue: business.stats.lifetimeRevenue + calculation.royaltyPayable,
            },
            studioState: business.studioState ? {
                ...business.studioState,
                platformRelations: relationship,
                financeLedger: calculation.royaltyPayable > 0 ? [{
                    id: `studio_ledger_streaming_${contract.id}_${absoluteWeek}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: calculation.royaltyPayable,
                    type: 'STREAMING_ROYALTY' as const,
                    label: `${contract.titleAtSigning} adjusted-gross royalty`,
                    projectId: contract.sourceProjectId,
                }, ...(business.studioState.financeLedger || [])].slice(0, 260) : business.studioState.financeLedger,
            } : business.studioState,
        };
    });
    const updatedContract = {
        ...contract,
        cumulativeRoyaltyAccrued: calculation.cumulativeRoyaltyAccrued,
        cumulativeRoyaltyPaid: calculation.cumulativeRoyaltyPaid,
    };
    return {
        player: {
            ...player,
            businesses,
            world: {
                ...player.world,
                platforms,
                streamingRightsContracts: {
                    ...player.world.streamingRightsContracts,
                    [contract.id]: updatedContract,
                },
                streamingRoyaltySettlements: registration.registry,
            },
        },
        changed: true,
        royaltyPaid: calculation.royaltyPayable,
        settlementId,
    };
};
