import type { AdType } from '../types';
import type { RewardedAdPlacement } from './rewardedAdCoordinator';
import { emitRewardedAdDiagnostic } from './rewardedAdDiagnostics';

const STORAGE_KEY = 'actorEmpirePendingRewardAdV2';
const LEGACY_STORAGE_KEY = 'actorEmpirePendingRewardAdV1';
const MAX_EMPTY_SESSION_AGE_MS = 30 * 60 * 1000;

export type RewardedAdGrantStatus =
    | 'IN_PROGRESS'
    | 'READY_TO_GRANT'
    | 'VERIFIED_SAVE'
    | 'GRANTED';

export interface PendingRewardAdReceipt {
    schemaVersion: 2;
    id: string;
    playerId: string;
    saveSlot: number;
    type: AdType;
    placement: RewardedAdPlacement;
    contextId?: string;
    data?: string;
    stepsRequired: 1 | 2;
    completedSteps: number;
    completedStepIds: string[];
    remainingStep: 1 | 2 | null;
    expiresAt?: number;
    continuationRemainingMs?: number;
    status: RewardedAdGrantStatus;
    grantAttempts: number;
    lastGrantAttemptAt?: number;
    verifiedSaveAt?: number;
    grantedAt?: number;
    createdAt: number;
    updatedAt: number;
}

interface LegacyPendingRewardAdReceipt {
    id?: unknown;
    playerId?: unknown;
    saveSlot?: unknown;
    type?: unknown;
    data?: unknown;
    stepsRequired?: unknown;
    completedSteps?: unknown;
    status?: unknown;
    createdAt?: unknown;
}

export class RewardedAdSessionConflictError extends Error {
    constructor(readonly existingReceipt: PendingRewardAdReceipt) {
        super('A different rewarded-ad session is already pending.');
        this.name = 'RewardedAdSessionConflictError';
    }
}

export class RewardedAdPersistenceError extends Error {
    constructor(
        message: string,
        readonly receipt?: PendingRewardAdReceipt,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'RewardedAdPersistenceError';
    }
}

const isRewardType = (value: unknown): value is AdType => (
    typeof value === 'string'
    && value.startsWith('REWARDED_')
);

const isPlacement = (value: unknown): value is RewardedAdPlacement => (
    value === 'STORE_REWARD'
    || value === 'DEBT_BAILOUT'
    || value === 'LIFE_EVENT_OPTION'
    || value === 'PRODUCTION_CRISIS_OPTION'
);

const isStatus = (value: unknown): value is RewardedAdGrantStatus => (
    value === 'IN_PROGRESS'
    || value === 'READY_TO_GRANT'
    || value === 'VERIFIED_SAVE'
    || value === 'GRANTED'
);

const getStorage = (): Storage | null => (
    typeof localStorage === 'undefined' ? null : localStorage
);

const createId = (): string => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `reward_${Date.now()}_${Math.random().toString(36).slice(2)}`
);

const deriveProgress = (
    stepsRequired: 1 | 2,
    completedStepIds: string[],
): Pick<PendingRewardAdReceipt, 'completedSteps' | 'remainingStep'> => {
    const completedSteps = Math.min(stepsRequired, completedStepIds.length);
    const remainingStep = completedSteps >= stepsRequired
        ? null
        : (completedSteps + 1) as 1 | 2;
    return { completedSteps, remainingStep };
};

const normalizeReceipt = (value: unknown): PendingRewardAdReceipt | null => {
    if (!value || typeof value !== 'object') return null;
    const parsed = value as Partial<PendingRewardAdReceipt>;
    if (parsed.schemaVersion !== 2 || typeof parsed.id !== 'string' || typeof parsed.playerId !== 'string') return null;
    if (!Number.isInteger(parsed.saveSlot) || !isRewardType(parsed.type) || !isPlacement(parsed.placement)) return null;
    if (parsed.stepsRequired !== 1 && parsed.stepsRequired !== 2) return null;
    if (!isStatus(parsed.status)) return null;

    const completedStepIds = Array.isArray(parsed.completedStepIds)
        ? [...new Set(parsed.completedStepIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
            .slice(0, parsed.stepsRequired)
        : [];
    const progress = deriveProgress(parsed.stepsRequired, completedStepIds);
    const createdAt = Number.isFinite(Number(parsed.createdAt)) ? Number(parsed.createdAt) : Date.now();
    const updatedAt = Number.isFinite(Number(parsed.updatedAt)) ? Number(parsed.updatedAt) : createdAt;

    return {
        schemaVersion: 2,
        id: parsed.id,
        playerId: parsed.playerId,
        saveSlot: Number(parsed.saveSlot),
        type: parsed.type,
        placement: parsed.placement,
        contextId: typeof parsed.contextId === 'string' ? parsed.contextId : undefined,
        data: typeof parsed.data === 'string' ? parsed.data : undefined,
        stepsRequired: parsed.stepsRequired,
        ...progress,
        completedStepIds,
        expiresAt: Number.isFinite(Number(parsed.expiresAt)) ? Number(parsed.expiresAt) : undefined,
        continuationRemainingMs: Number.isFinite(Number(parsed.continuationRemainingMs))
            ? Math.max(0, Number(parsed.continuationRemainingMs))
            : undefined,
        status: parsed.status,
        grantAttempts: Math.max(0, Math.floor(Number(parsed.grantAttempts) || 0)),
        lastGrantAttemptAt: Number.isFinite(Number(parsed.lastGrantAttemptAt)) ? Number(parsed.lastGrantAttemptAt) : undefined,
        verifiedSaveAt: Number.isFinite(Number(parsed.verifiedSaveAt)) ? Number(parsed.verifiedSaveAt) : undefined,
        grantedAt: Number.isFinite(Number(parsed.grantedAt)) ? Number(parsed.grantedAt) : undefined,
        createdAt,
        updatedAt,
    };
};

const migrateLegacyReceipt = (value: LegacyPendingRewardAdReceipt): PendingRewardAdReceipt | null => {
    if (typeof value.id !== 'string' || typeof value.playerId !== 'string') return null;
    if (!Number.isInteger(value.saveSlot) || !isRewardType(value.type)) return null;
    const stepsRequired: 1 | 2 = Number(value.stepsRequired) === 2 ? 2 : 1;
    const completedCount = Math.max(0, Math.min(stepsRequired, Math.floor(Number(value.completedSteps) || 0)));
    const completedStepIds = Array.from({ length: completedCount }, (_, index) => `legacy-step-${index + 1}`);
    const progress = deriveProgress(stepsRequired, completedStepIds);
    const createdAt = Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : Date.now();
    return {
        schemaVersion: 2,
        id: value.id,
        playerId: value.playerId,
        saveSlot: Number(value.saveSlot),
        type: value.type,
        placement: value.type === 'REWARDED_BAILOUT' ? 'DEBT_BAILOUT' : 'STORE_REWARD',
        data: typeof value.data === 'string' ? value.data : undefined,
        stepsRequired,
        ...progress,
        completedStepIds,
        status: value.status === 'READY_TO_GRANT' && progress.remainingStep === null
            ? 'READY_TO_GRANT'
            : 'IN_PROGRESS',
        grantAttempts: 0,
        createdAt,
        updatedAt: createdAt,
    };
};

const writeReceipt = (receipt: PendingRewardAdReceipt): PendingRewardAdReceipt => {
    const storage = getStorage();
    if (!storage) throw new RewardedAdPersistenceError('Durable rewarded-ad storage is unavailable.', receipt);
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(receipt));
        storage.removeItem(LEGACY_STORAGE_KEY);
        return receipt;
    } catch (error) {
        throw new RewardedAdPersistenceError('Could not persist the rewarded-ad session.', receipt, { cause: error });
    }
};

export const readPendingRewardAd = (nowMs = Date.now()): PendingRewardAdReceipt | null => {
    const storage = getStorage();
    if (!storage) return null;
    try {
        const currentRaw = storage.getItem(STORAGE_KEY);
        let receipt = currentRaw ? normalizeReceipt(JSON.parse(currentRaw)) : null;
        if (!receipt) {
            const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
            if (legacyRaw) {
                receipt = migrateLegacyReceipt(JSON.parse(legacyRaw) as LegacyPendingRewardAdReceipt);
                if (receipt) writeReceipt(receipt);
            }
        }
        if (!receipt) return null;

        const expiredContinuation = receipt.status === 'IN_PROGRESS'
            && receipt.expiresAt !== undefined
            && nowMs >= receipt.expiresAt;
        const abandonedEmptySession = receipt.status === 'IN_PROGRESS'
            && receipt.completedSteps === 0
            && nowMs - receipt.createdAt > MAX_EMPTY_SESSION_AGE_MS;
        if (expiredContinuation || abandonedEmptySession) {
            emitRewardedAdDiagnostic({
                name: 'reward_ad_expired',
                rewardSessionId: receipt.id,
                type: receipt.type,
                placement: receipt.placement,
                contextId: receipt.contextId,
                completedSteps: receipt.completedSteps,
                requiredSteps: receipt.stepsRequired,
                reason: expiredContinuation ? 'CONTINUATION_EXPIRED' : 'EMPTY_SESSION_EXPIRED',
            });
            clearPendingRewardAd(receipt.id);
            return null;
        }
        return receipt;
    } catch {
        try {
            storage.removeItem(STORAGE_KEY);
            storage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
            // The caller will safely treat unreadable durable state as unavailable.
        }
        return null;
    }
};

export const getRecoverableRewardedAdReceipt = (input: {
    playerId: string;
    saveSlot: number;
    placement: RewardedAdPlacement;
    contextId: string;
    nowMs?: number;
}): PendingRewardAdReceipt | null => {
    const receipt = readPendingRewardAd(input.nowMs);
    if (!receipt) return null;
    if (receipt.playerId !== input.playerId || receipt.saveSlot !== input.saveSlot) return null;
    if (receipt.placement !== input.placement || receipt.contextId !== input.contextId) return null;
    if (receipt.completedSteps !== receipt.stepsRequired) return null;
    return receipt.status === 'READY_TO_GRANT' || receipt.status === 'VERIFIED_SAVE'
        ? receipt
        : null;
};

export const beginPendingRewardAd = (input: {
    playerId: string;
    saveSlot: number;
    type: AdType;
    placement: RewardedAdPlacement;
    contextId?: string;
    data?: unknown;
    stepsRequired: number;
    nowMs?: number;
}): PendingRewardAdReceipt => {
    const nowMs = input.nowMs ?? Date.now();
    const existing = readPendingRewardAd(nowMs);
    if (existing) throw new RewardedAdSessionConflictError(existing);
    const stepsRequired: 1 | 2 = input.stepsRequired === 2 ? 2 : 1;
    return writeReceipt({
        schemaVersion: 2,
        id: createId(),
        playerId: input.playerId,
        saveSlot: input.saveSlot,
        type: input.type,
        placement: input.placement,
        contextId: input.contextId,
        data: typeof input.data === 'string' ? input.data : undefined,
        stepsRequired,
        completedSteps: 0,
        completedStepIds: [],
        remainingStep: 1,
        status: 'IN_PROGRESS',
        grantAttempts: 0,
        createdAt: nowMs,
        updatedAt: nowMs,
    });
};

export const recordPendingRewardAdStep = (
    receipt: PendingRewardAdReceipt,
    input: { stepId: string; stepNumber: number; nowMs?: number },
): PendingRewardAdReceipt => {
    if (receipt.status !== 'IN_PROGRESS') return receipt;
    if (
        !input.stepId
        || receipt.completedStepIds.includes(input.stepId)
        || input.stepNumber !== receipt.completedSteps + 1
        || input.stepNumber > receipt.stepsRequired
    ) {
        emitRewardedAdDiagnostic({
            name: 'reward_ad_duplicate_rejected',
            rewardSessionId: receipt.id,
            type: receipt.type,
            placement: receipt.placement,
            contextId: receipt.contextId,
            completedSteps: receipt.completedSteps,
            requiredSteps: receipt.stepsRequired,
            reason: receipt.completedStepIds.includes(input.stepId)
                ? 'DUPLICATE_STEP_ID'
                : 'OUT_OF_ORDER_STEP',
        });
        return receipt;
    }
    const completedStepIds = [...receipt.completedStepIds, input.stepId];
    return writeReceipt({
        ...receipt,
        ...deriveProgress(receipt.stepsRequired, completedStepIds),
        completedStepIds,
        expiresAt: undefined,
        continuationRemainingMs: undefined,
        updatedAt: input.nowMs ?? Date.now(),
    });
};

export const setPendingRewardAdContinuationExpiry = (
    receipt: PendingRewardAdReceipt,
    expiresAt: number,
    nowMs = Date.now(),
): PendingRewardAdReceipt => {
    if (receipt.status !== 'IN_PROGRESS' || receipt.completedSteps === 0) return receipt;
    return writeReceipt({
        ...receipt,
        expiresAt,
        continuationRemainingMs: undefined,
        updatedAt: nowMs,
    });
};

export const pausePendingRewardAdContinuation = (
    receipt: PendingRewardAdReceipt,
    nowMs = Date.now(),
): PendingRewardAdReceipt => {
    if (receipt.status !== 'IN_PROGRESS' || receipt.completedSteps !== 1) return receipt;
    const continuationRemainingMs = receipt.expiresAt === undefined
        ? receipt.continuationRemainingMs
        : Math.max(0, receipt.expiresAt - nowMs);
    if (continuationRemainingMs === undefined) return receipt;
    return writeReceipt({
        ...receipt,
        expiresAt: undefined,
        continuationRemainingMs,
        updatedAt: nowMs,
    });
};

export const markPendingRewardAdReady = (
    receipt: PendingRewardAdReceipt,
    nowMs = Date.now(),
): PendingRewardAdReceipt => {
    if (receipt.completedSteps !== receipt.stepsRequired) return receipt;
    return writeReceipt({
        ...receipt,
        remainingStep: null,
        expiresAt: undefined,
        continuationRemainingMs: undefined,
        status: 'READY_TO_GRANT',
        updatedAt: nowMs,
    });
};

export const recordPendingRewardAdGrantAttempt = (
    receipt: PendingRewardAdReceipt,
    nowMs = Date.now(),
): PendingRewardAdReceipt => writeReceipt({
    ...receipt,
    status: 'READY_TO_GRANT',
    grantAttempts: receipt.grantAttempts + 1,
    lastGrantAttemptAt: nowMs,
    updatedAt: nowMs,
});

export const markPendingRewardAdVerifiedSave = (
    receipt: PendingRewardAdReceipt,
    nowMs = Date.now(),
): PendingRewardAdReceipt => writeReceipt({
    ...receipt,
    status: 'VERIFIED_SAVE',
    verifiedSaveAt: nowMs,
    updatedAt: nowMs,
});

export const markPendingRewardAdGranted = (
    receipt: PendingRewardAdReceipt,
    nowMs = Date.now(),
): PendingRewardAdReceipt => writeReceipt({
    ...receipt,
    status: 'GRANTED',
    grantedAt: nowMs,
    updatedAt: nowMs,
});

export const clearPendingRewardAd = (receiptId?: string) => {
    const storage = getStorage();
    if (!storage) return;
    try {
        if (!receiptId) {
            storage.removeItem(STORAGE_KEY);
            storage.removeItem(LEGACY_STORAGE_KEY);
            return;
        }
        const raw = storage.getItem(STORAGE_KEY);
        const currentId = raw ? (JSON.parse(raw) as { id?: unknown })?.id : undefined;
        if (!raw || currentId === receiptId) storage.removeItem(STORAGE_KEY);
        const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
        const legacyId = legacyRaw ? (JSON.parse(legacyRaw) as { id?: unknown })?.id : undefined;
        if (!legacyRaw || legacyId === receiptId) storage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
        // Best-effort cleanup; a saved player grant ID still prevents duplicate rewards.
    }
};
