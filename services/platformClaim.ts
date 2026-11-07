/**
 * #241 (plan §25.4 Q1, §25.8): a platform takes you to court. Zeesh (2026-11-05): "may bhi abhi hm simpilfied dalde ki bas netflix filed
 * a law suite , abhi huamre pop events and stuff me kahi hai wo law suit cheeze to sayad ussi ko reuse kare ?"
 *
 * It reuses the game's own case: a `LegalCase` on `flags.activeCases`, as the studio name rights claim does. So it is plain data, it
 * survives a reload, and its hearings are the game's hearing popups (`generateLegalHearing`). Filing it is news and a line in the activity
 * log; the popup comes when there is something to decide. A paid Lawsuit Pack can later add a courtroom and suing anyone on these records.
 *
 *   Walked away after greenlight  the fee they paid back, plus damages from how far along it was
 *   Missed the deadline           a notice, then 4 weeks later a claim for the delay
 *   Unused locked funding         the old "Funding Claim", on the same record
 */
import { addActivityLog } from './activityLog';
import type { Business, LegalCase, LifeEvent, NewsItem, Player, Transaction } from '../types';

export type PlatformClaimKind = NonNullable<LegalCase['platformClaim']>['kind'];
export const PLATFORM_CLAIM_CASE = 'PLATFORM_CLAIM';
export const PLATFORM_CLAIM_HEARINGS = 2;
/** a court's award against settling now */
export const PLATFORM_CLAIM_VERDICT = 1.35;
export const PLATFORM_CLAIM_SETTLES_AT = 0.8;

const clamp = (value: number, low = 0, high = 100) => Math.max(low, Math.min(high, value));
const round = (value: number, step = 50_000) => Math.max(step, Math.round(value / step) * step);
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);

const STRENGTH: Record<PlatformClaimKind, number> = { WALKED_AWAY: 76, MISSED_DEADLINE: 60, FUNDING: 56 };

/** money out of the studio, on its books; a studio since sold leaves it with you */
export const chargeStudioLegal = (player: Player, studioId: string | undefined, amount: number, label: string, key: string): Player => {
    const charge = Math.max(0, Math.round(amount));
    const studio = (player.businesses || []).find(item => item.id === studioId && item.studioState);
    const transaction: Transaction = {
        id: `tx_platform_claim_${key}`,
        week: player.currentWeek,
        year: player.age,
        amount: -charge,
        category: 'BUSINESS',
        description: `${studio?.name || 'Legal'}: ${label}`,
    };
    const finance = { ...player.finance, history: [transaction, ...(player.finance?.history || [])].slice(0, 200) };
    if (!studio) return { ...player, money: player.money - charge, finance };
    return {
        ...player,
        finance,
        businesses: player.businesses.map(item => (item.id !== studio.id ? item : {
            ...item,
            balance: Number(item.balance || 0) - charge,
            studioState: {
                ...item.studioState!,
                financeLedger: [{ id: `studio_legal_${key}`, week: player.currentWeek, year: player.age, amount: -charge, type: 'LEGAL' as const, label }, ...(item.studioState!.financeLedger || [])],
            },
        })),
    };
};

const say = (player: Player, id: string, headline: string, subtext: string, impactLevel: NewsItem['impactLevel'], log: string, tone: 'negative' | 'neutral' | 'positive'): Player => ({
    ...player,
    news: [{ id: `news_platform_claim_${id}`, headline, subtext, category: 'INDUSTRY' as const, week: player.currentWeek, year: player.age, impactLevel }, ...(player.news || [])].slice(0, 80),
    logs: addActivityLog(player, log, tone).logs,
});

const nextWeek = (player: Player) => (player.currentWeek >= 52 ? 1 : player.currentWeek + 1);

const defenseOf = (player: Player, studio: Business | undefined) => Math.round(clamp(30 + (player.stats?.reputation || 0) * 0.18 + (studio?.stats?.investorConfidence || 0) * 0.12, 25, 65));

/** files the case. News and the activity log say so; the first hearing is next week */
export const fileStreamingPlatformClaim = (player: Player, input: {
    kind: PlatformClaimKind;
    studioId?: string;
    platformId: string;
    platformName: string;
    titleName: string;
    feeBack: number;
    damages: number;
    key: string;
}): Player => {
    const studio = (player.businesses || []).find(item => item.id === input.studioId);
    const claim = Math.round(Math.max(0, input.feeBack) + Math.max(0, input.damages));
    const description = input.kind === 'WALKED_AWAY'
        ? `${input.platformName} says ${studio?.name || 'your studio'} walked away from "${input.titleName}" after greenlight. It wants the fee back and what the delay cost it.`
        : input.kind === 'MISSED_DEADLINE'
            ? `"${input.titleName}" is past its delivery date and ${input.platformName} has run out of patience. It wants damages for the delay.`
            : `${input.platformName} funded "${input.titleName}" and says the money sat unused past the deadline. It wants damages.`;
    const legalCase: LegalCase = {
        id: `platform_claim_${input.key}`,
        title: `${input.platformName} v. ${studio?.name || player.name}`,
        description,
        weeksRemaining: PLATFORM_CLAIM_HEARINGS * 2,
        severity: 'HIGH',
        evidence: STRENGTH[input.kind],
        currentHearing: 1,
        totalHearings: PLATFORM_CLAIM_HEARINGS,
        nextHearingWeek: nextWeek(player),
        evidenceStrength: STRENGTH[input.kind],
        playerDefense: defenseOf(player, studio),
        status: 'ACTIVE',
        history: [],
        caseType: PLATFORM_CLAIM_CASE,
        studioId: input.studioId,
        claimantName: input.platformName,
        settlementDemand: round(claim * PLATFORM_CLAIM_SETTLES_AT),
        legalFeePerHearing: round(clamp(claim * 0.03, 250_000, 10_000_000)),
        platformClaim: { kind: input.kind, platformId: input.platformId, platformName: input.platformName, titleName: input.titleName, feeBack: Math.round(Math.max(0, input.feeBack)), damages: Math.round(Math.max(0, input.damages)) },
    };
    const filed = {
        ...player,
        flags: { ...player.flags, activeCases: [...(player.flags?.activeCases || []), legalCase] },
    };
    return say(filed, `${input.key}_filed`, `${input.platformName} files a lawsuit over ${input.titleName}`,
        `The claim is ${money(claim)}. ${input.kind === 'WALKED_AWAY' ? 'The fee back, and damages for the delay.' : 'Damages for the delay.'}`,
        'HIGH', `${input.platformName} filed a lawsuit over "${input.titleName}": ${money(claim)}. The first hearing is next week.`, 'negative');
};

const closeCase = (player: Player, caseId: string, status: LegalCase['status'], choice: string, defense?: number): Player => ({
    ...player,
    flags: {
        ...player.flags,
        activeCases: (player.flags?.activeCases || []).map((item: LegalCase) => (item.id !== caseId ? item : {
            ...item,
            status,
            ...(defense !== undefined ? { playerDefense: defense } : {}),
            history: [...item.history, { hearing: item.currentHearing, choice }],
        })),
    },
});

/** the hearing, as the game's own popup: rebuilt from the record each time it opens */
export const createPlatformClaimHearing = (player: Player, caseId: string): LifeEvent | null => {
    const active: LegalCase | undefined = player.flags?.activeCases?.find((item: LegalCase) => item.id === caseId && item.caseType === PLATFORM_CLAIM_CASE && item.status === 'ACTIVE');
    if (!active?.platformClaim) return null;
    const { platformName, titleName, feeBack, damages } = active.platformClaim;
    const claim = feeBack + damages;
    const settlement = active.settlementDemand || round(claim * PLATFORM_CLAIM_SETTLES_AT);
    const fee = active.legalFeePerHearing || 250_000;
    const award = round(claim * PLATFORM_CLAIM_VERDICT);
    const risk = Math.round(clamp(active.evidenceStrength - active.playerDefense + 50));
    return {
        id: `hearing_${active.id}_${active.currentHearing}`,
        type: 'LEGAL',
        category: 'THE LAWSUIT',
        title: `${active.title}: Hearing ${active.currentHearing}/${active.totalHearings}`,
        description: active.currentHearing === 1
            ? active.description
            : `${platformName} is back in court over "${titleName}". This hearing decides it.`,
        options: [
            {
                id: 'SETTLE_CLAIM',
                label: `Settle for ${money(settlement)}`,
                description: `It ends today, from studio money. ${platformName} may work with you again sooner.`,
                previewEffects: [
                    { label: 'Studio Legal Cost', value: `-${money(settlement)}`, tone: 'negative' },
                    { label: 'Case', value: 'Settled', tone: 'neutral' },
                ],
                impact: (current) => {
                    let next = chargeStudioLegal(current, active.studioId, settlement, `Settlement with ${platformName}`, `${active.id}_settle`);
                    next = closeCase(next, caseId, 'SETTLED', 'SETTLE_CLAIM');
                    next = say(next, `${active.id}_settled`, `${platformName} lawsuit over ${titleName} is settled`, `The studio paid ${money(settlement)}.`, 'MEDIUM',
                        `You settled with ${platformName} over "${titleName}" for ${money(settlement)}.`, 'neutral');
                    return { updatedPlayer: next, log: `The case is settled for ${money(settlement)}.` };
                },
            },
            {
                id: 'FIGHT_CLAIM',
                label: 'Fight the claim',
                description: active.currentHearing >= active.totalHearings
                    ? `Pay ${money(fee)} for the last hearing. Lose, and the court orders ${money(award)}.`
                    : `Pay ${money(fee)} for this hearing. It goes on to a last one.`,
                previewEffects: [
                    { label: 'Legal Counsel', value: `-${money(fee)}`, tone: 'negative' },
                    { label: 'Case Risk', value: `${risk}%`, tone: risk > 50 ? 'negative' : 'neutral' },
                    { label: 'If You Lose', value: `-${money(award)}`, tone: 'negative' },
                ],
                impact: (current) => {
                    let next = chargeStudioLegal(current, active.studioId, fee, `Hearing ${active.currentHearing}: ${platformName}`, `${active.id}_hearing_${active.currentHearing}`);
                    const gain = Math.round(clamp(4 + (next.stats?.reputation || 0) * 0.08, 4, 12));
                    if (active.currentHearing < active.totalHearings) {
                        next = {
                            ...next,
                            flags: {
                                ...next.flags,
                                activeCases: next.flags.activeCases.map((item: LegalCase) => (item.id !== caseId ? item : {
                                    ...item,
                                    currentHearing: item.currentHearing + 1,
                                    nextHearingWeek: nextWeek(next),
                                    playerDefense: clamp(item.playerDefense + gain),
                                    history: [...item.history, { hearing: item.currentHearing, choice: 'FIGHT_CLAIM' }],
                                })),
                            },
                        };
                        return { updatedPlayer: next, log: `Your lawyers pushed back. The last hearing is next week. ${money(fee)} in fees.` };
                    }
                    const defense = active.playerDefense + gain;
                    if (defense >= active.evidenceStrength) {
                        next = closeCase(next, caseId, 'WON', 'FIGHT_CLAIM_WIN', defense);
                        next = say(next, `${active.id}_won`, `Court throws out ${platformName} lawsuit over ${titleName}`, 'The studio owes nothing more.', 'MEDIUM',
                            `You won the case against ${platformName} over "${titleName}".`, 'positive');
                        return { updatedPlayer: next, log: 'You won. You owe nothing more.' };
                    }
                    next = chargeStudioLegal(next, active.studioId, award, `Court order: ${platformName}`, `${active.id}_award`);
                    next = closeCase(next, caseId, 'LOST', 'FIGHT_CLAIM_LOSS', defense);
                    next = { ...next, stats: { ...next.stats, reputation: clamp((next.stats.reputation || 0) - 4) } };
                    next = say(next, `${active.id}_lost`, `${platformName} wins lawsuit over ${titleName}`, `The court ordered ${money(award)} in damages.`, 'HIGH',
                        `You lost the case against ${platformName} over "${titleName}" and paid ${money(award)}.`, 'negative');
                    return { updatedPlayer: next, log: `You lost. The court ordered ${money(award)}.` };
                },
            },
        ],
    };
};
