import type {
    OwnedStreamingRivalMove,
    PlatformAiExternalCommitment,
    PlatformAiPendingOneTimeObligation,
    PlatformId,
    PlatformState,
    Player,
    StreamingRivalMoveType,
} from '../../types';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../../types';
import {
    STREAMING_RIVAL_MOVE_COST_MILLIONS,
    STREAMING_RIVAL_MOVE_COST_VERSION,
    getStreamingRivalMoveCostMillions,
    getStreamingRivalMoveCostMillionsForVersion,
} from '../streamingCompetitiveWorld';

const SETTLED_HISTORY_LIMIT = 80;
const OBLIGATION_PREFIX = 'platform-war:';
const MOVE_TYPES = new Set<StreamingRivalMoveType>(
    Object.keys(STREAMING_RIVAL_MOVE_COST_MILLIONS) as StreamingRivalMoveType[],
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const week = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
};

export const getPlatformAiExternalCommitmentId = (moveId: string): string => (
    `${OBLIGATION_PREFIX}${moveId.trim()}`
);

export const normalizePlatformAiExternalCommitments = (
    value: unknown,
    platformId: PlatformId,
    obligations: unknown = [],
    authoritativeMoves?: readonly OwnedStreamingRivalMove[],
    maxAbsoluteWeek = Number.MAX_SAFE_INTEGER,
): PlatformAiExternalCommitment[] => {
    const byMoveId = new Map<string, PlatformAiExternalCommitment>();
    const obligationsById = new Map((Array.isArray(obligations) ? obligations : [])
        .filter(isRecord)
        .map(raw => [String(raw.id || ''), raw]));
    const authoritativeById = authoritativeMoves
        ? new Map(authoritativeMoves.map(move => [move.id, move]))
        : null;
    for (const raw of Array.isArray(value) ? value : []) {
        if (!isRecord(raw)) continue;
        const moveId = String(raw.moveId || '').trim();
        const authoritativeMove = authoritativeById?.get(moveId) || null;
        if (authoritativeById && !authoritativeMove) continue;
        const moveType = (authoritativeMove?.type || String(raw.moveType || '')) as StreamingRivalMoveType;
        if (!moveId || !MOVE_TYPES.has(moveType)) continue;
        if (authoritativeMove && (
            authoritativeMove.platformId !== platformId
            || !['OPEN', 'MISFIRED', 'ANSWERED', 'EXPIRED'].includes(authoritativeMove.status)
        )) continue;
        const createdAtAbsoluteWeek = week(authoritativeMove?.createdAtAbsoluteWeek ?? raw.createdAtAbsoluteWeek);
        if (createdAtAbsoluteWeek > maxAbsoluteWeek) continue;
        const pricingVersion = Math.round(Number(
            authoritativeMove?.pricingVersion
            ?? raw.pricingVersion
            ?? STREAMING_RIVAL_MOVE_COST_VERSION,
        ));
        const canonicalCostMillions = getStreamingRivalMoveCostMillionsForVersion(moveType, pricingVersion);
        if (!canonicalCostMillions) continue;
        const obligationId = getPlatformAiExternalCommitmentId(moveId);
        const paymentEvidence = obligationsById.get(obligationId);
        const evidenceSettledAt = paymentEvidence?.settledWeek === null || paymentEvidence?.settledWeek === undefined
            ? null
            : week(paymentEvidence.settledWeek);
        const settled = paymentEvidence?.category === 'DISCRETIONARY'
            && Number(paymentEvidence.amountMillions) === canonicalCostMillions
            && week(paymentEvidence.createdWeek) === createdAtAbsoluteWeek
            && paymentEvidence.status === 'SETTLED'
            && evidenceSettledAt !== null
            && evidenceSettledAt >= createdAtAbsoluteWeek;
        const id = obligationId;
        const normalized: PlatformAiExternalCommitment = {
            id,
            moveId,
            obligationId: id,
            platformId,
            moveType,
            pricingVersion,
            outcome: (authoritativeMove?.status === 'MISFIRED' || !authoritativeMove && raw.outcome === 'MISFIRED') ? 'MISFIRED' : 'SUCCESS',
            costMillions: canonicalCostMillions,
            createdAtAbsoluteWeek,
            status: settled ? 'SETTLED' : 'PENDING_PAYMENT',
            settledAtAbsoluteWeek: settled ? evidenceSettledAt : null,
        };
        const existing = byMoveId.get(moveId);
        if (!existing || normalized.status === 'SETTLED' || existing.status !== 'SETTLED') {
            byMoveId.set(moveId, normalized);
        }
    }
    const rows = Array.from(byMoveId.values());
    const pending = rows
        .filter(item => item.status === 'PENDING_PAYMENT')
        .sort((left, right) => (
            left.createdAtAbsoluteWeek - right.createdAtAbsoluteWeek
            || left.moveId.localeCompare(right.moveId)
        ));
    const settled = rows
        .filter(item => item.status === 'SETTLED')
        .sort((left, right) => (
            (left.settledAtAbsoluteWeek || 0) - (right.settledAtAbsoluteWeek || 0)
            || left.moveId.localeCompare(right.moveId)
        ))
        .slice(-SETTLED_HISTORY_LIMIT);
    return [...settled, ...pending];
};

export const reconcilePlatformAiExternalCommitmentObligations = (
    obligations: unknown,
    commitments: PlatformAiExternalCommitment[],
): PlatformAiPendingOneTimeObligation[] => {
    const unrelated = (Array.isArray(obligations) ? obligations : [])
        .filter((raw): raw is PlatformAiPendingOneTimeObligation => (
            isRecord(raw) && !String(raw.id || '').startsWith(OBLIGATION_PREFIX)
        ));
    const canonical = commitments.map((commitment): PlatformAiPendingOneTimeObligation => ({
        id: commitment.obligationId,
        category: 'DISCRETIONARY',
        amountMillions: commitment.costMillions,
        createdWeek: commitment.createdAtAbsoluteWeek,
        status: commitment.status === 'SETTLED' ? 'SETTLED' : 'HELD',
        settledWeek: commitment.status === 'SETTLED' ? commitment.settledAtAbsoluteWeek : null,
    }));
    return [...unrelated, ...canonical];
};

export interface CommitPlatformAiExternalCommitmentInput {
    player: Player;
    platform: PlatformState;
    move: OwnedStreamingRivalMove;
    absoluteWeek: number;
}

export interface CommitPlatformAiExternalCommitmentResult {
    platform: PlatformState;
    changed: boolean;
}

export const commitPlatformAiExternalCommitment = (
    input: CommitPlatformAiExternalCommitmentInput,
): CommitPlatformAiExternalCommitmentResult => {
    const { player, platform, move } = input;
    const playerControlsPlatform = Boolean(
        player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds?.includes(platform.id),
    );
    if (
        playerControlsPlatform
        || !platform.ai
        || platform.ai.profileId !== platform.id
        || move.platformId !== platform.id
        || !MOVE_TYPES.has(move.type)
        || !['OPEN', 'MISFIRED'].includes(move.status)
        || !move.id.trim()
        || week(move.createdAtAbsoluteWeek) > week(input.absoluteWeek)
    ) {
        return { platform, changed: false };
    }
    const existing = platform.ai.schemaVersion >= PLATFORM_AI_RUNTIME_SCHEMA_VERSION
        ? normalizePlatformAiExternalCommitments(
            platform.ai.externalCommitments,
            platform.id,
            platform.ai.pendingOneTimeObligations,
        )
        : [];
    if (existing.some(item => item.moveId === move.id)) {
        return { platform, changed: false };
    }
    const id = getPlatformAiExternalCommitmentId(move.id);
    const commitment: PlatformAiExternalCommitment = {
        id,
        moveId: move.id,
        obligationId: id,
        platformId: platform.id,
        moveType: move.type,
        pricingVersion: STREAMING_RIVAL_MOVE_COST_VERSION,
        outcome: move.status === 'MISFIRED' ? 'MISFIRED' : 'SUCCESS',
        costMillions: getStreamingRivalMoveCostMillions(move.type),
        createdAtAbsoluteWeek: week(move.createdAtAbsoluteWeek),
        status: 'PENDING_PAYMENT',
        settledAtAbsoluteWeek: null,
    };
    const sourceObligations = reconcilePlatformAiExternalCommitmentObligations(
        platform.ai.pendingOneTimeObligations,
        [...existing, commitment],
    );
    const canonicalCommitment = normalizePlatformAiExternalCommitments(
        [commitment],
        platform.id,
        sourceObligations,
        [move],
    )[0];
    if (!canonicalCommitment) return { platform, changed: false };
    const externalCommitments = normalizePlatformAiExternalCommitments(
        [...existing, canonicalCommitment],
        platform.id,
        sourceObligations,
    );
    return {
        platform: {
            ...platform,
            ai: {
                ...platform.ai,
                schemaVersion: PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
                externalCommitments,
                pendingOneTimeObligations: reconcilePlatformAiExternalCommitmentObligations(
                    sourceObligations,
                    externalCommitments,
                ),
            },
        },
        changed: true,
    };
};

export const settlePlatformAiExternalCommitments = (
    commitments: PlatformAiExternalCommitment[],
    obligations: PlatformAiPendingOneTimeObligation[],
    absoluteWeek: number,
    platformId: PlatformId,
): PlatformAiExternalCommitment[] => {
    return normalizePlatformAiExternalCommitments(
        commitments,
        platformId,
        obligations,
        undefined,
        absoluteWeek,
    );
};

/** Crystallizes executed Platform Wars liabilities before an acquisition ends AI control. */
export const settlePendingPlatformAiExternalCommitmentsForAcquisition = (
    platform: PlatformState,
    absoluteWeek: number,
    authoritativeMoves: readonly OwnedStreamingRivalMove[],
): PlatformState => {
    if (!platform.ai) return platform;
    const commitments = normalizePlatformAiExternalCommitments(
        platform.ai.externalCommitments,
        platform.id,
        platform.ai.pendingOneTimeObligations,
        authoritativeMoves,
        absoluteWeek,
    );
    const pending = commitments.filter(commitment => commitment.status === 'PENDING_PAYMENT');
    if (!pending.length) return platform;
    const canonicalObligations = reconcilePlatformAiExternalCommitmentObligations(
        platform.ai.pendingOneTimeObligations,
        commitments,
    );
    const pendingIds = new Set(pending.map(commitment => commitment.obligationId));
    const totalMillions = Math.round(pending.reduce((sum, commitment) => sum + commitment.costMillions, 0) * 1_000_000) / 1_000_000;
    const paidFromCashMillions = Math.min(Math.max(0, platform.cashReserve), totalMillions);
    const shortfallMillions = Math.round((totalMillions - paidFromCashMillions) * 1_000_000) / 1_000_000;
    const obligations = canonicalObligations.map(obligation => pendingIds.has(obligation.id)
        ? { ...obligation, status: 'SETTLED' as const, settledWeek: absoluteWeek }
        : obligation);
    const settledCommitments = settlePlatformAiExternalCommitments(
        commitments,
        obligations,
        absoluteWeek,
        platform.id,
    );
    return {
        ...platform,
        cashReserve: Math.round((platform.cashReserve - paidFromCashMillions) * 1_000_000) / 1_000_000,
        ai: {
            ...platform.ai,
            schemaVersion: PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
            debtMillions: Math.round((platform.ai.debtMillions + shortfallMillions) * 1_000_000) / 1_000_000,
            externalCommitments: settledCommitments,
            pendingOneTimeObligations: obligations,
        },
    };
};
