import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingRightsObligation,
    PlatformState,
    Player,
    PlatformId,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingRightsContractParty,
    StreamingRightsContractPartyType,
    StreamingRightsTransaction,
    StreamingRightsTransactionController,
    StreamingRightsTransactionKind,
    StreamingRightsTransactionRegistry,
    StreamingRightsTransactionStatus,
    StreamingRightsWindowType,
    StreamingRightsContract,
    WorldState,
} from '../types';
import { STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION } from '../types';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import { createDeterministicId } from './deterministicRandom';
import {
    normalizeStreamingRightsContractRegistry,
    registerStreamingRightsContract,
} from './streamingRightsCore';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { appendPlatformAiDecisions } from './platformAi/platformAiState';

const PARTY_TYPES = new Set<StreamingRightsContractPartyType>([
    'PLAYER_STUDIO', 'NPC_STUDIO', 'PLAYER_PLATFORM', 'AI_PLATFORM',
]);
const PLATFORM_IDS = new Set<PlatformId>(['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE']);
const KINDS = new Set<StreamingRightsTransactionKind>(['LICENSE_TRANSFER', 'SUBLICENSE', 'PERMANENT_ACQUISITION']);
const STATUSES = new Set<StreamingRightsTransactionStatus>(['LISTED', 'OPEN', 'ACCEPTED', 'SETTLED', 'CANCELLED', 'INVALIDATED']);
const CONTROLLERS = new Set<StreamingRightsTransactionController>(['AI', 'PLAYER']);
const TERRITORIES = new Set<StreamingLicenseTerritory>(['DOMESTIC', 'MULTI_REGION', 'GLOBAL']);
const EXCLUSIVITY = new Set<StreamingLicenseExclusivity>(['NON_EXCLUSIVE', 'EXCLUSIVE']);
const WINDOWS = new Set<StreamingRightsWindowType>(['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT']);

const asRecord = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);
const text = (value: unknown, fallback = '', maxLength = 180): string => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return (normalized || fallback).slice(0, maxLength);
};
const money = (value: unknown): number => {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? Math.max(0, Math.round(normalized)) : 0;
};
const week = (value: unknown, fallback = 0): number => {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? Math.max(0, Math.round(normalized)) : fallback;
};
const nullableWeek = (value: unknown): number | null => (
    value === null || value === undefined ? null : week(value)
);
const enumValue = <T extends string>(value: unknown, allowed: Set<T>, fallback: T): T => (
    allowed.has(value as T) ? value as T : fallback
);

const normalizeParty = (value: unknown): StreamingRightsContractParty | null => {
    const source = asRecord(value);
    const id = text(source.id);
    const name = text(source.name, '', 140);
    if (!id || !name || !PARTY_TYPES.has(source.type as StreamingRightsContractPartyType)) return null;
    const platformId = source.platformId === null
        ? null
        : PLATFORM_IDS.has(source.platformId as PlatformId)
            ? source.platformId as PlatformId
            : null;
    return {
        type: source.type as StreamingRightsContractPartyType,
        id,
        name,
        platformId,
    };
};

export const normalizeStreamingRightsTransaction = (value: unknown): StreamingRightsTransaction | null => {
    const source = asRecord(value);
    const id = text(source.id);
    const sourceContractId = text(source.sourceContractId);
    const rootContractId = text(source.rootContractId, sourceContractId);
    const sourceProjectId = text(source.sourceProjectId);
    const title = text(source.title, '', 140);
    const originalOwner = normalizeParty(source.originalOwner);
    const seller = normalizeParty(source.seller);
    const buyer = normalizeParty(source.buyer);
    if (!id || !sourceContractId || !rootContractId || !sourceProjectId || !title || !originalOwner || !seller || !buyer) {
        return null;
    }
    const territory = enumValue(source.territory, TERRITORIES, 'GLOBAL');
    const controller = asRecord(source.controllerAtCommitment);
    const askingPrice = money(source.askingPrice);
    const acceptedPrice = money(source.acceptedPrice);
    const sellerReceipt = money(source.sellerReceipt);
    return {
        schemaVersion: STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION,
        id,
        idempotencyKey: text(source.idempotencyKey, id),
        kind: enumValue(source.kind, KINDS, 'LICENSE_TRANSFER'),
        status: enumValue(source.status, STATUSES, 'LISTED'),
        originalOwner,
        seller,
        buyer,
        sourceContractId,
        rootContractId,
        successorContractId: text(source.successorContractId) || null,
        sourceProjectId,
        title,
        territory,
        countryIds: territory === 'GLOBAL' ? [] : normalizeStreamingDayOneMarketIds(source.countryIds).sort(),
        exclusivity: enumValue(source.exclusivity, EXCLUSIVITY, 'NON_EXCLUSIVE'),
        windowType: enumValue(source.windowType, WINDOWS, 'FIRST_WINDOW'),
        startsAtAbsoluteWeek: week(source.startsAtAbsoluteWeek),
        expiresAtAbsoluteWeek: week(source.expiresAtAbsoluteWeek),
        askingPrice,
        acceptedPrice,
        sellerReceipt,
        originalOwnerParticipation: 0,
        controllerAtCommitment: {
            seller: enumValue(controller.seller, CONTROLLERS, 'AI'),
            buyer: enumValue(controller.buyer, CONTROLLERS, 'AI'),
        },
        groupId: text(source.groupId) || null,
        listedAtAbsoluteWeek: week(source.listedAtAbsoluteWeek),
        committedAtAbsoluteWeek: nullableWeek(source.committedAtAbsoluteWeek),
        settledAtAbsoluteWeek: nullableWeek(source.settledAtAbsoluteWeek),
        resolvedAtAbsoluteWeek: nullableWeek(source.resolvedAtAbsoluteWeek),
        resolutionReason: text(source.resolutionReason, '', 260) || null,
    };
};

export const normalizeStreamingRightsTransactionRegistry = (
    value: unknown,
): StreamingRightsTransactionRegistry => {
    const registry: StreamingRightsTransactionRegistry = {};
    Object.values(asRecord(value)).forEach(rawTransaction => {
        const transaction = normalizeStreamingRightsTransaction(rawTransaction);
        if (!transaction || registry[transaction.id]) return;
        const replay = Object.values(registry).find(item => item.idempotencyKey === transaction.idempotencyKey);
        if (!replay) registry[transaction.id] = transaction;
    });
    return registry;
};

export type StreamingRightsTransferFailure =
    | 'NOT_FOUND'
    | 'NOT_ACTIVE'
    | 'SELLER_MISMATCH'
    | 'SAME_PARTY'
    | 'INSUFFICIENT_TREASURY'
    | 'RIGHTS_UNAVAILABLE'
    | 'INVALID_PRICE'
    | 'ALREADY_SETTLED';

export interface SettleStreamingRightsTransferInput {
    sourceContractId: string;
    seller: StreamingRightsContractParty;
    buyer: StreamingRightsContractParty;
    askingPrice?: number;
    price: number;
    absoluteWeek: number;
    idempotencyKey: string;
    controllerAtCommitment: {
        seller: StreamingRightsTransactionController;
        buyer: StreamingRightsTransactionController;
    };
    groupId?: string | null;
    buyerPaymentAlreadyCaptured?: boolean;
    successorContractId?: string;
}

export interface SettleStreamingRightsSublicenseInput {
    sourceContractId: string;
    seller: StreamingRightsContractParty;
    buyer: StreamingRightsContractParty;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    windowType: StreamingRightsWindowType;
    exclusivity: StreamingLicenseExclusivity;
    durationWeeks: number;
    price: number;
    buyerRevenueShare: number;
    absoluteWeek: number;
    idempotencyKey: string;
    successorContractId?: string;
    controllerAtCommitment: {
        seller: StreamingRightsTransactionController;
        buyer: StreamingRightsTransactionController;
    };
}

export type StreamingRightsTransferResult =
    | {
        changed: true;
        player: Player;
        transaction: StreamingRightsTransaction;
        successorContract: StreamingRightsContract;
    }
    | {
        changed: false;
        player: Player;
        reason: StreamingRightsTransferFailure;
        detail: string;
        transaction?: StreamingRightsTransaction;
    };

export interface StreamingRightsTransferChain {
    rootContractId: string;
    currentContractId: string;
    holders: StreamingRightsContractParty[];
    transactions: StreamingRightsTransaction[];
}

export interface SettleStreamingRightsTransferBatchInput {
    groupId: string;
    transfers: SettleStreamingRightsTransferInput[];
}

export type StreamingRightsTransferBatchResult =
    | {
        changed: true;
        player: Player;
        transactions: StreamingRightsTransaction[];
        successorContracts: StreamingRightsContract[];
    }
    | {
        changed: false;
        player: Player;
        reason: StreamingRightsTransferFailure;
        detail: string;
    };

const partyKey = (party: StreamingRightsContractParty): string => (
    party.platformId || `${party.type}:${party.id}`
);

const isSameParty = (left: StreamingRightsContractParty, right: StreamingRightsContractParty): boolean => (
    partyKey(left) === partyKey(right)
);

const fullCurrencyToMillions = (amount: number): number => Math.round(amount) / 1_000_000;

const partyAvailableCash = (player: Player, party: StreamingRightsContractParty): number => {
    if (party.type === 'PLAYER_PLATFORM') return player.ownedStreamingPlatform?.treasuryCash || 0;
    if (party.type === 'AI_PLATFORM' && party.platformId) {
        return Math.max(0, Number(player.world.platforms?.[party.platformId]?.cashReserve || 0)) * 1_000_000;
    }
    return 0;
};

const appendAiDecision = (
    platform: PlatformState,
    transaction: StreamingRightsTransaction,
    deltaMillions: number,
    role: 'BUYER' | 'SELLER',
): PlatformState => {
    if (!platform.ai) return platform;
    const decisionId = createDeterministicId('platform_ai_rights_transfer', transaction.id, role);
    if (platform.ai.decisionHistory.some(decision => decision.id === decisionId)) return platform;
    return {
        ...platform,
        ai: {
            ...platform.ai,
            decisionHistory: appendPlatformAiDecisions(platform.ai.decisionHistory, [{
                id: decisionId,
                absoluteWeek: transaction.settledAtAbsoluteWeek || transaction.listedAtAbsoluteWeek,
                type: role === 'BUYER' ? 'RIGHTS_TRANSFER_ACQUIRED' : 'RIGHTS_TRANSFER_SOLD',
                summary: role === 'BUYER' ? 'Platform licence acquired' : 'Platform licence sold',
                reason: `${transaction.title}: ${transaction.seller.name} → ${transaction.buyer.name}.`,
                cashImpactMillions: deltaMillions,
            }]),
        },
    };
};

const adjustAiCash = (
    platform: PlatformState,
    amountFullCurrency: number,
    absoluteWeek: number,
    role: 'BUYER' | 'SELLER',
): PlatformState => {
    const deltaMillions = (role === 'BUYER' ? -1 : 1) * fullCurrencyToMillions(amountFullCurrency);
    if (!platform.ai) return { ...platform, cashReserve: Math.max(0, platform.cashReserve + deltaMillions) };
    const financeHistory = platform.ai.financeHistory.map(snapshot => {
        if (snapshot.absoluteWeek !== absoluteWeek) return snapshot;
        return role === 'BUYER'
            ? {
                ...snapshot,
                contractualCostMillions: snapshot.contractualCostMillions + Math.abs(deltaMillions),
                settledObligationCostMillions: snapshot.settledObligationCostMillions + Math.abs(deltaMillions),
                netCashFlowMillions: snapshot.netCashFlowMillions + deltaMillions,
                closingCashMillions: snapshot.closingCashMillions + deltaMillions,
            }
            : {
                ...snapshot,
                verifiedContractIncomeMillions: snapshot.verifiedContractIncomeMillions + deltaMillions,
                revenueMillions: snapshot.revenueMillions + deltaMillions,
                netCashFlowMillions: snapshot.netCashFlowMillions + deltaMillions,
                closingCashMillions: snapshot.closingCashMillions + deltaMillions,
            };
    });
    return {
        ...platform,
        cashReserve: Math.max(0, platform.cashReserve + deltaMillions),
        ai: { ...platform.ai, financeHistory },
    };
};

const projectAiContractTransfer = (
    platform: PlatformState,
    source: StreamingRightsContract,
    successor: StreamingRightsContract,
    role: 'BUYER' | 'SELLER',
): PlatformState => {
    if (!platform.ai) return platform;
    const rightsContracts = role === 'SELLER'
        ? platform.ai.rightsContracts.map(contract => contract.id === source.id ? {
            ...contract,
            status: 'TRANSFERRED_OUT' as const,
        } : contract)
        : platform.ai.rightsContracts.some(contract => contract.id === successor.id)
            ? platform.ai.rightsContracts
            : [...platform.ai.rightsContracts, successor];
    return { ...platform, ai: { ...platform.ai, rightsContracts } };
};

const updateAiParty = (
    world: WorldState,
    party: StreamingRightsContractParty,
    updater: (platform: PlatformState) => PlatformState,
): WorldState => {
    if (party.type !== 'AI_PLATFORM' || !party.platformId || !world.platforms?.[party.platformId]) return world;
    return {
        ...world,
        platforms: {
            ...world.platforms,
            [party.platformId]: updater(world.platforms[party.platformId]),
        },
    };
};

const ownedLedgerEntry = (
    player: Player,
    transaction: StreamingRightsTransaction,
    role: 'BUYER' | 'SELLER',
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', player.id, transaction.id, role),
    idempotencyKey: `rights-transfer:${transaction.id}:${role}`,
    absoluteWeek: transaction.settledAtAbsoluteWeek || transaction.listedAtAbsoluteWeek,
    type: 'LICENSE_SIGNED',
    summary: role === 'BUYER'
        ? `${transaction.title} was acquired from ${transaction.seller.name} for its remaining term.`
        : `${transaction.title} was transferred to ${transaction.buyer.name}.`,
    source: transaction.controllerAtCommitment[role.toLowerCase() as 'buyer' | 'seller'] === 'PLAYER'
        ? 'PLAYER_ACTION'
        : 'SYSTEM',
    metadata: {
        transactionId: transaction.id,
        sourceContractId: transaction.sourceContractId,
        successorContractId: transaction.successorContractId,
        price: transaction.acceptedPrice,
    },
});

const inheritedOwnedObligations = (
    successor: StreamingRightsContract,
    transaction: StreamingRightsTransaction,
): OwnedStreamingRightsObligation[] => {
    const settledWeek = transaction.settledAtAbsoluteWeek || transaction.listedAtAbsoluteWeek;
    return [
        ...(successor.marketingGuarantee > 0 ? [{
            id: createDeterministicId('streaming_rights_obligation', successor.id, 'marketing'),
            licenseId: successor.id,
            sourceProjectId: successor.sourceProjectId,
            title: successor.titleAtSigning,
            type: 'MARKETING_SPEND' as const,
            targetAmount: successor.marketingGuarantee,
            observedAmount: 0,
            dueAtAbsoluteWeek: Math.min(successor.expiresAtAbsoluteWeek, settledWeek + 4),
            status: 'PENDING' as const,
            breachPenalty: successor.cancellationPenalty,
            successPayment: 0,
            resolvedAtAbsoluteWeek: null,
        }] : []),
        ...(successor.viewershipBonusThreshold > 0 ? [{
            id: createDeterministicId('streaming_rights_obligation', successor.id, 'viewership'),
            licenseId: successor.id,
            sourceProjectId: successor.sourceProjectId,
            title: successor.titleAtSigning,
            type: 'VIEWERSHIP_THRESHOLD' as const,
            targetAmount: successor.viewershipBonusThreshold,
            observedAmount: 0,
            dueAtAbsoluteWeek: Math.min(successor.expiresAtAbsoluteWeek, settledWeek + 6),
            status: 'PENDING' as const,
            breachPenalty: successor.cancellationPenalty,
            successPayment: successor.viewershipBonusAmount,
            resolvedAtAbsoluteWeek: null,
        }] : []),
    ];
};

const updateOwnedParty = (
    player: Player,
    party: StreamingRightsContractParty,
    transaction: StreamingRightsTransaction,
    source: StreamingRightsContract,
    successor: StreamingRightsContract,
    role: 'BUYER' | 'SELLER',
    captureBuyerPayment: boolean,
): Player => {
    if (party.type !== 'PLAYER_PLATFORM' || !player.ownedStreamingPlatform) return player;
    const platform = player.ownedStreamingPlatform;
    const ledger = ownedLedgerEntry(player, transaction, role);
    const catalogLicenses = role === 'SELLER'
        ? platform.catalogLicenses.map(contract => contract.id === source.id ? {
            ...contract,
            status: 'TRANSFERRED_OUT' as const,
        } : contract)
        : platform.catalogLicenses.some(contract => contract.id === successor.id)
            ? platform.catalogLicenses
            : [...platform.catalogLicenses, successor];
    const sourceObligations = platform.rightsObligations
        .filter(obligation => obligation.licenseId === source.id && obligation.status !== 'SATISFIED')
        .map(obligation => ({
            ...obligation,
            id: createDeterministicId('streaming_rights_obligation', successor.id, obligation.type.toLowerCase()),
            licenseId: successor.id,
        }));
    const transferredObligations = sourceObligations.length
        ? sourceObligations
        : inheritedOwnedObligations(successor, transaction);
    const obligations = role === 'SELLER'
        ? platform.rightsObligations.filter(obligation => obligation.licenseId !== source.id)
        : [
            ...platform.rightsObligations.filter(obligation => obligation.licenseId !== source.id && obligation.licenseId !== successor.id),
            ...transferredObligations,
        ];
    return {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            treasuryCash: platform.treasuryCash + (
                role === 'SELLER' ? transaction.sellerReceipt : captureBuyerPayment ? -transaction.acceptedPrice : 0
            ),
            catalogLicenses,
            catalogProjectIds: role === 'BUYER'
                ? Array.from(new Set([...platform.catalogProjectIds, successor.sourceProjectId]))
                : platform.catalogProjectIds.filter(projectId => (
                    projectId !== source.sourceProjectId
                    || catalogLicenses.some(contract => contract.sourceProjectId === projectId && contract.status === 'ACTIVE')
                )),
            rightsObligations: obligations,
            eventLedger: platform.eventLedger.some(entry => entry.idempotencyKey === ledger.idempotencyKey)
                ? platform.eventLedger
                : [...platform.eventLedger, ledger],
        },
    };
};

export const settleStreamingRightsTransfer = (
    player: Player,
    input: SettleStreamingRightsTransferInput,
): StreamingRightsTransferResult => {
    const transactions = normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions);
    const prior = Object.values(transactions).find(transaction => transaction.idempotencyKey === input.idempotencyKey);
    if (prior?.status === 'SETTLED') {
        return { player, changed: false, reason: 'ALREADY_SETTLED', detail: 'This transfer has already settled.', transaction: prior };
    }
    const registry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const source = registry[input.sourceContractId];
    if (!source) return { player, changed: false, reason: 'NOT_FOUND', detail: 'The source licence does not exist.' };
    if (source.status !== 'ACTIVE' || input.absoluteWeek > source.expiresAtAbsoluteWeek) {
        return { player, changed: false, reason: 'NOT_ACTIVE', detail: 'The source licence is no longer active.' };
    }
    if (!isSameParty(source.buyer, input.seller)) {
        return { player, changed: false, reason: 'SELLER_MISMATCH', detail: 'The seller is not the current rights holder.' };
    }
    if (isSameParty(input.seller, input.buyer)) {
        return { player, changed: false, reason: 'SAME_PARTY', detail: 'Buyer and seller must be different platforms.' };
    }
    const price = money(input.price);
    if (price <= 0) return { player, changed: false, reason: 'INVALID_PRICE', detail: 'A transfer price must be positive.' };
    if (!input.buyerPaymentAlreadyCaptured && partyAvailableCash(player, input.buyer) < price) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', detail: 'The buyer cannot fund this transfer.' };
    }
    const compatibility = resolveStreamingRightsCompatibility({
        world: { streamingRightsContracts: registry },
        sourceProjectId: source.sourceProjectId,
        buyerPlatformId: input.buyer.platformId,
        sellerPartyId: input.seller.id,
        territory: source.territory,
        countryIds: source.countryIds,
        startsAtAbsoluteWeek: Math.max(input.absoluteWeek, source.startsAtAbsoluteWeek),
        expiresAtAbsoluteWeek: source.expiresAtAbsoluteWeek,
        windowType: source.windowType || 'FIRST_WINDOW',
        exclusivity: source.exclusivity,
        action: 'LICENSE',
        excludeContractIds: [source.id],
    });
    if (!compatibility.available) {
        return { player, changed: false, reason: 'RIGHTS_UNAVAILABLE', detail: compatibility.summary };
    }
    const root = registry[source.rootContractId] || source;
    const transactionId = createDeterministicId('streaming_rights_transaction', input.idempotencyKey);
    const successorId = input.successorContractId || createDeterministicId(
        'streaming_rights_successor',
        source.id,
        partyKey(input.buyer),
        input.absoluteWeek,
        input.idempotencyKey,
    );
    const successor: StreamingRightsContract = {
        ...source,
        id: successorId,
        idempotencyKey: `streaming-transfer-contract:${input.idempotencyKey}`,
        origin: 'PLATFORM_TRADE',
        buyer: input.buyer,
        buyerPlatformId: input.buyer.platformId,
        parentContractId: source.id,
        rootContractId: root.id,
        rightsTransactionId: transactionId,
        transferredToContractId: null,
        transferredAtAbsoluteWeek: null,
        status: 'ACTIVE',
    };
    const closedSource: StreamingRightsContract = {
        ...source,
        status: 'TRANSFERRED_OUT',
        transferredToContractId: successor.id,
        transferredAtAbsoluteWeek: input.absoluteWeek,
    };
    const transaction = normalizeStreamingRightsTransaction({
        schemaVersion: STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION,
        id: transactionId,
        idempotencyKey: input.idempotencyKey,
        kind: 'LICENSE_TRANSFER',
        status: 'SETTLED',
        originalOwner: root.seller,
        seller: input.seller,
        buyer: input.buyer,
        sourceContractId: source.id,
        rootContractId: root.id,
        successorContractId: successor.id,
        sourceProjectId: source.sourceProjectId,
        title: source.titleAtSigning,
        territory: source.territory,
        countryIds: source.countryIds,
        exclusivity: source.exclusivity,
        windowType: source.windowType,
        startsAtAbsoluteWeek: source.startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: source.expiresAtAbsoluteWeek,
        askingPrice: input.askingPrice ?? price,
        acceptedPrice: price,
        sellerReceipt: price,
        originalOwnerParticipation: 0,
        controllerAtCommitment: input.controllerAtCommitment,
        groupId: input.groupId || null,
        listedAtAbsoluteWeek: input.absoluteWeek,
        committedAtAbsoluteWeek: input.absoluteWeek,
        settledAtAbsoluteWeek: input.absoluteWeek,
        resolvedAtAbsoluteWeek: input.absoluteWeek,
        resolutionReason: null,
    })!;
    const registered = registerStreamingRightsContract({ ...registry, [closedSource.id]: closedSource }, successor);
    let nextPlayer: Player = {
        ...player,
        world: {
            ...player.world,
            streamingRightsContracts: registered.registry,
            streamingRightsTransactions: { ...transactions, [transaction.id]: transaction },
        },
    };
    nextPlayer = updateOwnedParty(
        nextPlayer,
        input.seller,
        transaction,
        closedSource,
        successor,
        'SELLER',
        !input.buyerPaymentAlreadyCaptured,
    );
    nextPlayer = updateOwnedParty(
        nextPlayer,
        input.buyer,
        transaction,
        closedSource,
        successor,
        'BUYER',
        !input.buyerPaymentAlreadyCaptured,
    );
    let nextWorld = nextPlayer.world;
    nextWorld = updateAiParty(nextWorld, input.seller, platform => appendAiDecision(
        projectAiContractTransfer(
            adjustAiCash(platform, transaction.sellerReceipt, input.absoluteWeek, 'SELLER'),
            closedSource,
            successor,
            'SELLER',
        ),
        transaction,
        fullCurrencyToMillions(transaction.sellerReceipt),
        'SELLER',
    ));
    nextWorld = updateAiParty(nextWorld, input.buyer, platform => appendAiDecision(
        projectAiContractTransfer(
            input.buyerPaymentAlreadyCaptured
                ? platform
                : adjustAiCash(platform, transaction.acceptedPrice, input.absoluteWeek, 'BUYER'),
            closedSource,
            successor,
            'BUYER',
        ),
        transaction,
        -fullCurrencyToMillions(transaction.acceptedPrice),
        'BUYER',
    ));
    nextPlayer = { ...nextPlayer, world: nextWorld };
    return { player: nextPlayer, changed: true, transaction, successorContract: successor };
};

export const settleStreamingRightsTransferBatch = (
    player: Player,
    input: SettleStreamingRightsTransferBatchInput,
): StreamingRightsTransferBatchResult => {
    if (!input.transfers.length) {
        return { player, changed: false, reason: 'NOT_FOUND', detail: 'The transfer package is empty.' };
    }
    let stagedPlayer = player;
    const transactions: StreamingRightsTransaction[] = [];
    const successorContracts: StreamingRightsContract[] = [];
    for (const transferInput of input.transfers) {
        const settled = settleStreamingRightsTransfer(stagedPlayer, {
            ...transferInput,
            groupId: input.groupId,
        });
        if ('reason' in settled) {
            return { player, changed: false, reason: settled.reason, detail: settled.detail };
        }
        stagedPlayer = settled.player;
        transactions.push(settled.transaction);
        successorContracts.push(settled.successorContract);
    }
    return { player: stagedPlayer, changed: true, transactions, successorContracts };
};

export const settleStreamingRightsSublicense = (
    player: Player,
    input: SettleStreamingRightsSublicenseInput,
): StreamingRightsTransferResult => {
    const transactions = normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions);
    const prior = Object.values(transactions).find(transaction => transaction.idempotencyKey === input.idempotencyKey);
    if (prior?.status === 'SETTLED') {
        return { player, changed: false, reason: 'ALREADY_SETTLED', detail: 'This sublicense has already settled.', transaction: prior };
    }
    const registry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const source = registry[input.sourceContractId];
    if (!source) return { player, changed: false, reason: 'NOT_FOUND', detail: 'The source licence does not exist.' };
    if (source.status !== 'ACTIVE' || input.absoluteWeek > source.expiresAtAbsoluteWeek || !source.sublicensingAllowed) {
        return { player, changed: false, reason: 'NOT_ACTIVE', detail: 'The source licence cannot be sublicensed.' };
    }
    if (!isSameParty(source.buyer, input.seller)) {
        return { player, changed: false, reason: 'SELLER_MISMATCH', detail: 'The seller is not the current rights holder.' };
    }
    if (isSameParty(input.seller, input.buyer)) {
        return { player, changed: false, reason: 'SAME_PARTY', detail: 'Buyer and seller must be different platforms.' };
    }
    const price = money(input.price);
    if (price <= 0) return { player, changed: false, reason: 'INVALID_PRICE', detail: 'A sublicense price must be positive.' };
    if (partyAvailableCash(player, input.buyer) < price) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', detail: 'The buyer cannot fund this sublicense.' };
    }
    const startsAtAbsoluteWeek = Math.max(input.absoluteWeek, source.startsAtAbsoluteWeek);
    const expiresAtAbsoluteWeek = Math.min(
        source.expiresAtAbsoluteWeek,
        startsAtAbsoluteWeek + Math.max(1, Math.round(input.durationWeeks)),
    );
    const compatibility = resolveStreamingRightsCompatibility({
        world: { streamingRightsContracts: registry },
        sourceProjectId: source.sourceProjectId,
        buyerPlatformId: input.buyer.platformId,
        sellerPartyId: input.seller.id,
        territory: input.territory,
        countryIds: input.countryIds,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek,
        windowType: input.windowType,
        exclusivity: input.exclusivity,
        action: 'SUBLICENSE',
        sourceContractId: source.id,
    });
    if (!compatibility.available) {
        return { player, changed: false, reason: 'RIGHTS_UNAVAILABLE', detail: compatibility.summary };
    }
    const root = registry[source.rootContractId] || source;
    const transactionId = createDeterministicId('streaming_rights_transaction', input.idempotencyKey);
    const successorId = input.successorContractId
        || createDeterministicId('streaming_rights_sublicense', source.id, partyKey(input.buyer), input.idempotencyKey);
    const buyerRevenueShare = Math.max(0, Math.min(100, Math.round(input.buyerRevenueShare)));
    const successor: StreamingRightsContract = {
        ...source,
        id: successorId,
        idempotencyKey: `streaming-sublicense-contract:${input.idempotencyKey}`,
        origin: 'PLATFORM_TRADE',
        seller: input.seller,
        buyer: input.buyer,
        sellerType: 'PLATFORM',
        sellerPlatformId: input.seller.platformId,
        buyerPlatformId: input.buyer.platformId,
        licensorName: input.seller.name,
        territory: input.territory,
        countryIds: input.territory === 'GLOBAL' ? [] : normalizeStreamingDayOneMarketIds(input.countryIds).sort(),
        windowType: input.windowType,
        exclusivity: input.exclusivity,
        durationWeeks: Math.max(1, expiresAtAbsoluteWeek - startsAtAbsoluteWeek),
        minimumGuarantee: price,
        platformRevenueShare: buyerRevenueShare,
        licensorRevenueShare: 100 - buyerRevenueShare,
        signedAtAbsoluteWeek: input.absoluteWeek,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek,
        status: 'ACTIVE',
        dealStructure: 'GUARANTEE_REVENUE_SHARE',
        cumulativeRoyaltyAccrued: 0,
        cumulativeRoyaltyPaid: 0,
        settlement: {
            guarantee: 'PAID',
            paymentKey: `streaming-sublicense:${transactionId}`,
            settledAtAbsoluteWeek: input.absoluteWeek,
        },
        parentContractId: source.id,
        rootContractId: root.id,
        rightsTransactionId: transactionId,
        transferredToContractId: null,
        transferredAtAbsoluteWeek: null,
        renewalOption: false,
        sublicensingAllowed: false,
        changeOfControl: 'NONE',
    };
    const transaction = normalizeStreamingRightsTransaction({
        schemaVersion: STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION,
        id: transactionId,
        idempotencyKey: input.idempotencyKey,
        kind: 'SUBLICENSE',
        status: 'SETTLED',
        originalOwner: root.seller,
        seller: input.seller,
        buyer: input.buyer,
        sourceContractId: source.id,
        rootContractId: root.id,
        successorContractId: successor.id,
        sourceProjectId: source.sourceProjectId,
        title: source.titleAtSigning,
        territory: successor.territory,
        countryIds: successor.countryIds,
        exclusivity: successor.exclusivity,
        windowType: successor.windowType,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek,
        askingPrice: price,
        acceptedPrice: price,
        sellerReceipt: price,
        originalOwnerParticipation: 0,
        controllerAtCommitment: input.controllerAtCommitment,
        groupId: null,
        listedAtAbsoluteWeek: input.absoluteWeek,
        committedAtAbsoluteWeek: input.absoluteWeek,
        settledAtAbsoluteWeek: input.absoluteWeek,
        resolvedAtAbsoluteWeek: input.absoluteWeek,
        resolutionReason: null,
    })!;
    const registered = registerStreamingRightsContract(registry, successor);
    let nextPlayer: Player = {
        ...player,
        world: {
            ...player.world,
            streamingRightsContracts: registered.registry,
            streamingRightsTransactions: { ...transactions, [transaction.id]: transaction },
        },
    };
    if (input.seller.type === 'PLAYER_PLATFORM' && nextPlayer.ownedStreamingPlatform) {
        const ledger = ownedLedgerEntry(nextPlayer, transaction, 'SELLER');
        nextPlayer = {
            ...nextPlayer,
            ownedStreamingPlatform: {
                ...nextPlayer.ownedStreamingPlatform,
                treasuryCash: nextPlayer.ownedStreamingPlatform.treasuryCash + price,
                eventLedger: nextPlayer.ownedStreamingPlatform.eventLedger.some(entry => entry.idempotencyKey === ledger.idempotencyKey)
                    ? nextPlayer.ownedStreamingPlatform.eventLedger
                    : [...nextPlayer.ownedStreamingPlatform.eventLedger, ledger],
            },
        };
    }
    let nextWorld = nextPlayer.world;
    nextWorld = updateAiParty(nextWorld, input.seller, platform => appendAiDecision(
        adjustAiCash(platform, price, input.absoluteWeek, 'SELLER'),
        transaction,
        fullCurrencyToMillions(price),
        'SELLER',
    ));
    nextWorld = updateAiParty(nextWorld, input.buyer, platform => appendAiDecision(
        projectAiContractTransfer(
            adjustAiCash(platform, price, input.absoluteWeek, 'BUYER'),
            source,
            successor,
            'BUYER',
        ),
        transaction,
        -fullCurrencyToMillions(price),
        'BUYER',
    ));
    if (input.buyer.type === 'PLAYER_PLATFORM' && nextPlayer.ownedStreamingPlatform) {
        const ledger = ownedLedgerEntry(nextPlayer, transaction, 'BUYER');
        nextPlayer = {
            ...nextPlayer,
            ownedStreamingPlatform: {
                ...nextPlayer.ownedStreamingPlatform,
                treasuryCash: nextPlayer.ownedStreamingPlatform.treasuryCash - price,
                catalogLicenses: [...nextPlayer.ownedStreamingPlatform.catalogLicenses, successor],
                catalogProjectIds: Array.from(new Set([
                    ...nextPlayer.ownedStreamingPlatform.catalogProjectIds,
                    successor.sourceProjectId,
                ])),
                eventLedger: nextPlayer.ownedStreamingPlatform.eventLedger.some(entry => entry.idempotencyKey === ledger.idempotencyKey)
                    ? nextPlayer.ownedStreamingPlatform.eventLedger
                    : [...nextPlayer.ownedStreamingPlatform.eventLedger, ledger],
            },
        };
    }
    return { player: { ...nextPlayer, world: nextWorld }, changed: true, transaction, successorContract: successor };
};

export const getStreamingRightsTransferChain = (
    world: WorldState,
    contractId: string,
): StreamingRightsTransferChain => {
    const contracts = normalizeStreamingRightsContractRegistry(world.streamingRightsContracts);
    const transactions = Object.values(normalizeStreamingRightsTransactionRegistry(world.streamingRightsTransactions));
    const contract = contracts[contractId];
    if (!contract) return { rootContractId: contractId, currentContractId: contractId, holders: [], transactions: [] };
    const root = contracts[contract.rootContractId] || contract;
    const chainTransactions = transactions
        .filter(transaction => (
            transaction.rootContractId === root.id
            && transaction.status === 'SETTLED'
            && (transaction.kind === 'LICENSE_TRANSFER' || transaction.kind === 'PERMANENT_ACQUISITION')
        ))
        .sort((left, right) => (
            Number(left.settledAtAbsoluteWeek || 0) - Number(right.settledAtAbsoluteWeek || 0)
            || left.id.localeCompare(right.id)
        ));
    const holders: StreamingRightsContractParty[] = [root.seller, root.buyer];
    chainTransactions.forEach(transaction => {
        if (!isSameParty(holders[holders.length - 1], transaction.buyer)) holders.push(transaction.buyer);
    });
    const currentContractId = chainTransactions[chainTransactions.length - 1]?.successorContractId || root.id;
    return { rootContractId: root.id, currentContractId, holders, transactions: chainTransactions };
};
