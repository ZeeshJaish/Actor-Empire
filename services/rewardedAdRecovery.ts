import { AdType } from '../types';

const STORAGE_KEY = 'actorEmpirePendingRewardAdV1';
const MAX_RECEIPT_AGE_MS = 30 * 60 * 1000;

export interface PendingRewardAdReceipt {
    id: string;
    playerId: string;
    saveSlot: number;
    type: AdType;
    data?: string;
    stepsRequired: number;
    completedSteps: number;
    status: 'REQUESTED' | 'READY_TO_GRANT';
    createdAt: number;
}

const isRewardType = (value: unknown): value is AdType => (
    typeof value === 'string'
    && value.startsWith('REWARDED_')
);

export const readPendingRewardAd = (): PendingRewardAdReceipt | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as PendingRewardAdReceipt | null;
        if (!parsed || typeof parsed.id !== 'string' || typeof parsed.playerId !== 'string') return null;
        if (!Number.isInteger(parsed.saveSlot) || !isRewardType(parsed.type)) return null;
        if (![1, 2].includes(Number(parsed.stepsRequired))) return null;
        if (Date.now() - Number(parsed.createdAt || 0) > MAX_RECEIPT_AGE_MS) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return {
            ...parsed,
            stepsRequired: Number(parsed.stepsRequired),
            completedSteps: Math.max(0, Math.min(Number(parsed.stepsRequired), Number(parsed.completedSteps || 0))),
            status: parsed.status === 'READY_TO_GRANT' ? 'READY_TO_GRANT' : 'REQUESTED',
        };
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

const writeReceipt = (receipt: PendingRewardAdReceipt) => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
        }
    } catch {
        // The live reward flow can still complete when durable browser storage
        // is unavailable; recovery simply will not be possible for that ad.
    }
    return receipt;
};

export const beginPendingRewardAd = (input: {
    playerId: string;
    saveSlot: number;
    type: AdType;
    data?: unknown;
    stepsRequired: number;
}): PendingRewardAdReceipt => writeReceipt({
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `reward_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    playerId: input.playerId,
    saveSlot: input.saveSlot,
    type: input.type,
    data: typeof input.data === 'string' ? input.data : undefined,
    stepsRequired: Math.max(1, Math.min(2, Math.round(input.stepsRequired))),
    completedSteps: 0,
    status: 'REQUESTED',
    createdAt: Date.now(),
});

export const recordPendingRewardAdStep = (
    receipt: PendingRewardAdReceipt,
    completedSteps: number,
): PendingRewardAdReceipt => writeReceipt({
    ...receipt,
    completedSteps: Math.max(receipt.completedSteps, Math.min(receipt.stepsRequired, completedSteps)),
});

export const markPendingRewardAdReady = (
    receipt: PendingRewardAdReceipt,
): PendingRewardAdReceipt => writeReceipt({
    ...receipt,
    completedSteps: receipt.stepsRequired,
    status: 'READY_TO_GRANT',
});

export const clearPendingRewardAd = (receiptId?: string) => {
    if (typeof localStorage === 'undefined') return;
    try {
        const current = readPendingRewardAd();
        if (!receiptId || !current || current.id === receiptId) {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Best-effort cleanup. Validation prevents a stale receipt from
        // granting across a different player or save slot.
    }
};
