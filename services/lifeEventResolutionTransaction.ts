import type {
    LifeEventResolutionKind,
    LifeEventResolutionReceipt,
    Player,
    ScheduledEvent,
} from '../types';

const MAX_DETAILED_RECEIPTS = 250;
const inFlightTransactions = new Map<string, Promise<LifeEventResolutionTransactionResult>>();

export interface LifeEventResolutionTransactionInput {
    sourcePlayer: Player;
    proposedPlayer: Player;
    event: ScheduledEvent;
    optionId: string;
    impactId?: string;
    resolutionSeed?: string;
    resolutionKind: LifeEventResolutionKind;
    log: string;
    logType?: 'positive' | 'negative' | 'neutral';
    resolvedAt?: number;
    persist: (candidate: Player) => Promise<Player>;
}

export interface LifeEventResolutionTransactionResult {
    status: 'COMMITTED' | 'ALREADY_COMMITTED';
    player: Player;
    receipt: LifeEventResolutionReceipt;
}

const receiptsFor = (player: Player): LifeEventResolutionReceipt[] => (
    Array.isArray(player.flags?.lifeEventResolutionReceipts)
        ? player.flags.lifeEventResolutionReceipts
        : []
);

const receiptIdFor = (eventId: string): string => `life_event:${eventId}`;

const assertFiniteNumber = (value: unknown, name: string): void => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`Life-event transaction rejected invalid ${name}.`);
    }
};

const validateCandidate = (source: Player, candidate: Player): void => {
    if (!candidate || candidate.id !== source.id) throw new Error('Life-event transaction changed the player identity.');
    assertFiniteNumber(candidate.money, 'money');
    assertFiniteNumber(candidate.age, 'age');
    assertFiniteNumber(candidate.currentWeek, 'current week');
    assertFiniteNumber(candidate.energy?.current, 'current energy');
    assertFiniteNumber(candidate.energy?.max, 'maximum energy');
    const numericStats = ['health', 'happiness', 'fame', 'reputation', 'experience', 'talent', 'followers'] as const;
    numericStats.forEach(stat => assertFiniteNumber(candidate.stats?.[stat], `stat ${stat}`));
    if (!Array.isArray(candidate.relationships) || !Array.isArray(candidate.businesses) || !candidate.world) {
        throw new Error('Life-event transaction rejected incomplete protected player state.');
    }
};

const buildCandidate = (
    input: LifeEventResolutionTransactionInput,
    receipt: LifeEventResolutionReceipt,
): Player => {
    const sourceQueue = Array.isArray(input.sourcePlayer.pendingEvents) ? input.sourcePlayer.pendingEvents : [];
    const pendingEvents = sourceQueue.filter(event => event?.id !== input.event.id);
    if (pendingEvents.length === sourceQueue.length) {
        throw new Error('Life-event transaction could not find the queued event.');
    }
    const receipts = receiptsFor(input.sourcePlayer);
    const nextLogs = [{
        week: input.proposedPlayer.currentWeek,
        year: input.proposedPlayer.age,
        message: input.log,
        type: input.logType || 'neutral' as const,
    }, ...(input.proposedPlayer.logs || input.sourcePlayer.logs || [])].slice(0, 50);
    return {
        ...input.proposedPlayer,
        totalPlayTimeMs: Math.max(
            Number(input.sourcePlayer.totalPlayTimeMs) || 0,
            Number(input.proposedPlayer.totalPlayTimeMs) || 0,
        ),
        settings: input.sourcePlayer.settings,
        pendingEvents,
        logs: nextLogs,
        flags: {
            ...input.proposedPlayer.flags,
            lifeEventResolutionReceipts: [receipt, ...receipts].slice(0, MAX_DETAILED_RECEIPTS),
        },
    };
};

const runTransaction = async (
    input: LifeEventResolutionTransactionInput,
    receiptId: string,
): Promise<LifeEventResolutionTransactionResult> => {
    const existing = receiptsFor(input.sourcePlayer).find(receipt => receipt.id === receiptId);
    if (existing) {
        const eventStillQueued = (input.sourcePlayer.pendingEvents || []).some(event => event.id === input.event.id);
        if (!eventStillQueued) {
            return { status: 'ALREADY_COMMITTED', player: input.sourcePlayer, receipt: existing };
        }
        const repairCandidate: Player = {
            ...input.sourcePlayer,
            pendingEvents: (input.sourcePlayer.pendingEvents || []).filter(event => event.id !== input.event.id),
        };
        validateCandidate(input.sourcePlayer, repairCandidate);
        const repairedPlayer = await input.persist(repairCandidate);
        validateCandidate(input.sourcePlayer, repairedPlayer);
        return { status: 'COMMITTED', player: repairedPlayer, receipt: existing };
    }
    const receipt: LifeEventResolutionReceipt = {
        id: receiptId,
        eventId: input.event.id,
        optionId: input.optionId,
        impactId: input.impactId,
        resolutionSeed: input.resolutionSeed,
        resolutionKind: input.resolutionKind,
        resolvedAt: input.resolvedAt ?? Date.now(),
        resolvedAge: input.sourcePlayer.age,
        resolvedWeek: input.sourcePlayer.currentWeek,
    };
    const candidate = buildCandidate(input, receipt);
    validateCandidate(input.sourcePlayer, candidate);
    const persistedPlayer = await input.persist(candidate);
    validateCandidate(input.sourcePlayer, persistedPlayer);
    return { status: 'COMMITTED', player: persistedPlayer, receipt };
};

export const commitLifeEventResolutionTransaction = (
    input: LifeEventResolutionTransactionInput,
): Promise<LifeEventResolutionTransactionResult> => {
    const key = `${input.sourcePlayer.id}:${input.event.id}`;
    const active = inFlightTransactions.get(key);
    if (active) return active;
    const receiptId = receiptIdFor(input.event.id);
    const transaction = runTransaction(input, receiptId).finally(() => {
        if (inFlightTransactions.get(key) === transaction) inFlightTransactions.delete(key);
    });
    inFlightTransactions.set(key, transaction);
    return transaction;
};
