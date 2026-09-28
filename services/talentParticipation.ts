import type { TalentParticipationContract, TalentParticipationPackage } from '../types';

export type ParticipationRole = 'ACTOR' | 'DIRECTOR' | 'WRITER';

export interface SelectedTalentParticipant {
    role: ParticipationRole;
    roleId: string;
    talentId: string;
    talentName: string;
    upfrontFee: number;
}

export const participationKey = (role: ParticipationRole, roleId: string, talentId: string): string =>
    `${role}:${roleId}:${talentId}`;

export const participationTalentId = (key: string): string => key.split(':').slice(2).join(':');

export const participationPointsForTalent = (draft: Record<string, number>, talentId: string): number =>
    Object.entries(draft).reduce((sum, [key, points]) => sum + (participationTalentId(key) === talentId ? points : 0), 0);

export const suggestReturningBackendDemand = (role: string, salary: number, internallyControlled: boolean): number => {
    if (internallyControlled || !['LEAD_ACTOR', 'DIRECTOR'].includes(role)) return 0;
    if (salary >= 30_000_000) return 2;
    if (salary >= 10_000_000) return 1;
    return 0;
};

export const calculateGreenlightCounterChance = (
    cashDemandRatio: number,
    offeredBackendPoints: number,
    demandedBackendPoints: number,
    talentTier: string,
): number => {
    let chance = 0.1 + cashDemandRatio * 0.8 + (offeredBackendPoints - demandedBackendPoints) * 0.12;
    if (talentTier === 'A_LIST') chance *= 0.8;
    if (talentTier === 'ESTABLISHED') chance *= 0.9;
    return Math.max(0.05, Math.min(0.95, chance));
};

export const normalizeTalentBackendDraft = (raw: unknown): Record<string, number> => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([key, value]) => (
        key.length > 0 && typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 3
    ))) as Record<string, number>;
};

export const setTalentBackendPoints = (
    draft: Record<string, number>,
    key: string,
    points: number,
    activeKeys: string[],
): Record<string, number> => {
    const active = new Set(activeKeys);
    const currentActive = Object.fromEntries(Object.entries(normalizeTalentBackendDraft(draft)).filter(([id]) => active.has(id)));
    const next = { ...currentActive };
    if (!active.has(key) || !Number.isInteger(points) || points < 0 || points > 3) return next;
    if (points === 0) delete next[key];
    else next[key] = points;
    if (participationPointsForTalent(next, participationTalentId(key)) > 3) return currentActive;
    if (Object.values(next).reduce((sum, value) => sum + value, 0) > 10) return currentActive;
    return next;
};

export const buildGreenlightTalentParticipation = (
    projectId: string,
    draft: unknown,
    participants: SelectedTalentParticipant[],
): TalentParticipationPackage | undefined => {
    const selected = normalizeTalentBackendDraft(draft);
    const usedKeys = new Set<string>();
    const contracts: TalentParticipationContract[] = [];
    for (const participant of participants) {
        if (!participant.talentId || !participant.roleId || !participant.talentName) continue;
        const key = participationKey(participant.role, participant.roleId, participant.talentId);
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        const points = selected[key] || 0;
        if (points === 0) continue;
        contracts.push({
            contractId: `${projectId}:talent:${key}`,
            role: participant.role,
            roleId: participant.roleId,
            talentId: participant.talentId,
            talentName: participant.talentName,
            upfrontFee: Math.max(0, Math.round(Number(participant.upfrontFee) || 0)),
            backendPoints: points,
            receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS',
        });
    }
    if (!contracts.length || contracts.reduce((sum, contract) => sum + contract.backendPoints, 0) > 10) return undefined;
    const totalsByTalent = new Map<string, number>();
    for (const contract of contracts) {
        const total = (totalsByTalent.get(contract.talentId) || 0) + contract.backendPoints;
        if (total > 3) return undefined;
        totalsByTalent.set(contract.talentId, total);
    }
    return { schemaVersion: 1, contracts, processedReceiptKeys: [] };
};
