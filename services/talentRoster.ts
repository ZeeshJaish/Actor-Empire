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

    const safeNumber = (input: unknown, fallback = 0) => Number.isFinite(Number(input)) ? Math.max(0, Number(input)) : fallback;
    const totalAmount = safeNumber(value.totalAmount);
    const totalInstallments = Math.max(1, Math.floor(safeNumber(value.totalInstallments, value.paymentMode === 'WEEKLY_INSTALLMENTS' ? 52 : 1)));
    const installmentsPaid = Math.min(totalInstallments, Math.floor(safeNumber(value.installmentsPaid)));
    const inferredPaid = value.paymentMode === 'WEEKLY_INSTALLMENTS'
        ? (installmentsPaid >= totalInstallments ? totalAmount : Math.floor(totalAmount / totalInstallments) * installmentsPaid)
        : totalAmount;
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
        totalAmount,
        maintenanceFee: safeNumber(value.maintenanceFee),
        installmentsPaid,
        totalInstallments,
        amountPaid: value.amountPaid === undefined ? inferredPaid : Math.min(totalAmount, safeNumber(value.amountPaid)),
        ...(Number.isFinite(value.lastPaymentAbsoluteWeek) ? { lastPaymentAbsoluteWeek: value.lastPaymentAbsoluteWeek } : {}),
        ...(Array.isArray(value.consumedProjectIds) ? { consumedProjectIds: [...new Set(value.consumedProjectIds.filter(id => typeof id === 'string'))] } : {}),
        ...(value.accountingVersion === 1 ? { accountingVersion: 1 as const } : {}),
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

        // Only old, paid-up upfront mirrors used actor identity. New deals and
        // every outstanding financial obligation retain their own contract ID.
        const identity = !normalized.accountingVersion && normalized.paymentMode === 'UPFRONT'
            ? `legacy:${normalized.npcId}:${normalized.startWeek}:${normalized.totalAmount}:${normalized.totalMovies}`
            : normalized.id;
        const existing = byIdentity.get(identity);
        if (!existing) {
            byIdentity.set(identity, { ...normalized, studioId: parentStudioId });
        } else {
            const moviesRemaining = Math.min(existing.moviesRemaining, normalized.moviesRemaining);
            const status = existing.status === 'TERMINATED' || normalized.status === 'TERMINATED'
                ? 'TERMINATED' : existing.status === 'EXPIRED' || normalized.status === 'EXPIRED' || moviesRemaining <= 0 ? 'EXPIRED' : 'ACTIVE';
            byIdentity.set(identity, {
                ...existing, moviesRemaining, status,
                installmentsPaid: Math.max(existing.installmentsPaid, normalized.installmentsPaid),
                amountPaid: Math.max(existing.amountPaid || 0, normalized.amountPaid || 0),
                lastPaymentAbsoluteWeek: Math.max(existing.lastPaymentAbsoluteWeek ?? -1, normalized.lastPaymentAbsoluteWeek ?? -1),
                consumedProjectIds: [...new Set([...(existing.consumedProjectIds || []), ...(normalized.consumedProjectIds || [])])],
            });
        }
    });

    return [...byIdentity.values()];
};

export const hasTalentUses = (contract: StudioContract): boolean =>
    contract.status === 'ACTIVE' && contract.type === 'MOVIE_DEAL' && contract.moviesRemaining > 0;

export const talentAmountOutstanding = (contract: StudioContract): number => {
    const normalized = normalizeStudioContract(contract)!;
    return normalized.paymentMode === 'WEEKLY_INSTALLMENTS'
        ? Math.max(0, normalized.totalAmount - (normalized.amountPaid || 0)) : 0;
};

/** One project consumes one use, irrespective of how many cast slots an actor fills. */
export const consumeTalentUses = (roster: StudioContract[], actorIds: string[], projectId: string): StudioContract[] => {
    const consumedActors = new Set(roster.filter(c => c.consumedProjectIds?.includes(projectId)).map(c => c.npcId));
    return roster.map(raw => {
        const contract = normalizeStudioContract(raw)!;
        if (!hasTalentUses(contract) || !actorIds.includes(contract.npcId) || consumedActors.has(contract.npcId)) return contract;
        consumedActors.add(contract.npcId);
        if (contract.consumedProjectIds?.includes(projectId)) return contract;
        const moviesRemaining = contract.moviesRemaining - 1;
        return { ...contract, moviesRemaining, status: moviesRemaining > 0 ? 'ACTIVE' as const : 'EXPIRED' as const,
            consumedProjectIds: [...(contract.consumedProjectIds || []), projectId] };
    });
};

/** Settles at most one week, including when every promised film has already been used. */
export const settleTalentContractWeek = (raw: StudioContract, absoluteWeek: number) => {
    const contract = normalizeStudioContract(raw)!;
    if ((contract.lastPaymentAbsoluteWeek ?? -1) >= absoluteWeek) return { contract, maintenance: 0, installment: 0 };
    const maintenance = hasTalentUses(contract) ? contract.maintenanceFee : 0;
    const outstanding = talentAmountOutstanding(contract);
    const periodsLeft = Math.max(1, contract.totalInstallments - contract.installmentsPaid);
    const installment = outstanding > 0
        ? Math.min(outstanding, periodsLeft === 1 ? outstanding : Math.floor(contract.totalAmount / contract.totalInstallments)) : 0;
    return {
        contract: { ...contract, amountPaid: (contract.amountPaid || 0) + installment,
            installmentsPaid: Math.min(contract.totalInstallments, contract.installmentsPaid + (outstanding > 0 ? 1 : 0)),
            lastPaymentAbsoluteWeek: absoluteWeek },
        maintenance, installment,
    };
};
