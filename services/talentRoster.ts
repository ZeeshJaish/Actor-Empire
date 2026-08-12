import { StudioContract } from '../types';

type StudioContractInput = Partial<StudioContract> & {
    actorId?: unknown;
    talentId?: unknown;
    personId?: unknown;
};

const getLegacyNpcId = (contract: StudioContractInput): string => {
    const value = contract.npcId || contract.actorId || contract.talentId || contract.personId;
    return typeof value === 'string' ? value : '';
};

export const normalizeStudioContract = (
    value: StudioContractInput,
    parentStudioId?: string,
): StudioContract | null => {
    const npcId = getLegacyNpcId(value);
    if (!npcId) return null;

    const totalMovies = Math.max(1, Number(value.totalMovies || value.moviesRemaining || 1));
    const moviesRemaining = Math.max(0, Number(value.moviesRemaining ?? totalMovies));
    const id = typeof value.id === 'string' && value.id
        ? value.id
        : `contract_${parentStudioId || 'hq'}_${npcId}`;

    return {
        id,
        ...(typeof value.studioId === 'string' && value.studioId ? { studioId: value.studioId } : {}),
        npcId,
        type: 'MOVIE_DEAL',
        paymentMode: value.paymentMode === 'WEEKLY_INSTALLMENTS' ? 'WEEKLY_INSTALLMENTS' : 'UPFRONT',
        totalAmount: Math.max(0, Number(value.totalAmount || 0)),
        maintenanceFee: Math.max(0, Number(value.maintenanceFee || 0)),
        installmentsPaid: Math.max(0, Number(value.installmentsPaid || 0)),
        totalInstallments: Math.max(1, Number(value.totalInstallments || 1)),
        moviesRemaining,
        totalMovies,
        startWeek: Math.max(0, Number(value.startWeek || 0)),
        status: value.status === 'EXPIRED' || value.status === 'TERMINATED'
            ? value.status
            : moviesRemaining > 0
                ? 'ACTIVE'
                : 'EXPIRED',
    };
};

const contractScore = (contract: StudioContract): number =>
    (contract.status === 'ACTIVE' ? 1000 : 0)
    + Math.max(0, contract.moviesRemaining) * 10
    + (contract.totalAmount > 0 ? 2 : 0)
    + (contract.studioId ? 1 : 0);

/**
 * Reconciles the two historical parent-studio roster locations. Subsidiary
 * contracts are intentionally excluded so talent never leaks between studios.
 */
export const mergeParentStudioTalentRosters = (
    parentStudioId: string,
    ...sources: Array<Array<StudioContractInput> | undefined>
): StudioContract[] => {
    const byIdentity = new Map<string, StudioContract>();

    sources.flatMap(source => source || []).forEach(raw => {
        const normalized = normalizeStudioContract(raw, parentStudioId);
        if (!normalized) return;
        if (normalized.studioId && normalized.studioId !== parentStudioId) return;

        const identity = normalized.npcId || normalized.id;
        const existing = byIdentity.get(identity);
        if (!existing || contractScore(normalized) >= contractScore(existing)) {
            byIdentity.set(identity, { ...normalized, studioId: parentStudioId });
        }
    });

    return [...byIdentity.values()];
};
