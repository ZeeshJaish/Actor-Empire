import type { Business, TalentParticipationPackage, WorldState } from '../types';
import { settleTalentReceipt } from './talentCareer';

export interface PlayerTalentReceiptInput {
    world: WorldState;
    studio: Business;
    projectId: string;
    projectTitle: string;
    participation?: TalentParticipationPackage;
    receiptKey: string;
    studioReceipts: number;
    absoluteWeek: number;
    year: number;
    week: number;
}

export const applyPlayerTalentReceipt = (input: PlayerTalentReceiptInput): {
    world: WorldState;
    studio: Business;
    participation: TalentParticipationPackage | undefined;
    totalPaid: number;
} => {
    const settled = settleTalentReceipt(input.world, input.projectId, input.participation,
        input.receiptKey, input.studioReceipts, input.absoluteWeek);
    if (settled.totalPaid <= 0) return { ...settled, studio: input.studio };
    const ledgerId = `studio_ledger_talent_backend_${input.projectId}_${input.receiptKey}`;
    const studio: Business = {
        ...input.studio,
        balance: input.studio.balance - settled.totalPaid,
        stats: { ...input.studio.stats, weeklyProfit: input.studio.stats.weeklyProfit - settled.totalPaid },
        studioState: input.studio.studioState ? {
            ...input.studio.studioState,
            financeLedger: [{
                id: ledgerId, week: input.week, year: input.year, amount: -settled.totalPaid,
                type: 'TALENT_BACKEND' as const, label: `${input.projectTitle} talent backend on collected studio receipts`,
                projectId: input.projectId,
            }, ...(input.studio.studioState.financeLedger || []).filter(entry => entry.id !== ledgerId)].slice(0, 200),
        } : input.studio.studioState,
    };
    return { ...settled, studio };
};
