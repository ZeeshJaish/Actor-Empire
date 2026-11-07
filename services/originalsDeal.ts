import type { OriginalsStudioCard } from './originalsStudios';

/**
 * #278: what an Original costs. The whole bill comes from Greenlight's own numbers, so nothing is invented here:
 * a series is the wizard's total × episodes ÷ 8, then the studio's fee on top. Paid at once.
 */

export const ORIGINAL_STANDARD_EPISODES = 8;
export const ORIGINAL_LICENCE_WEEKS = 156;
export const LICENCE_SHARE_OF_MAKING = 0.72;

export type OriginalDealKind = 'BUY' | 'LICENCE';

/** A series costs by its length. 8 episodes is the wizard's own total. A film is itself. */
export const getOriginalEpisodeScale = (projectType: string | undefined, episodes: number | undefined): number => (
    projectType === 'SERIES' ? Math.max(1, Number(episodes) || ORIGINAL_STANDARD_EPISODES) / ORIGINAL_STANDARD_EPISODES : 1
);

const hash = (value: string): number => {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        result ^= value.charCodeAt(i);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

/** "Artisan Pictures'", "Warner Bros.'", "Monarch's" */
export const studioPossessive = (name: string): string => (/s\.?$/i.test(name) ? `${name}'` : `${name}'s`);

export interface OriginalStudioFee {
    /** 15 to 40: a studio's price on top of the cost, what the real business calls cost plus */
    percent: number;
    /** Why it is asking this now, in one line */
    why: string;
}

type FeeCard = Pick<OriginalsStudioCard, 'name' | 'reputation' | 'creative' | 'hotStreak' | 'runwayWeeks' | 'openSlots' | 'negotiation' | 'budgetControl' | 'momentum'>;

/**
 * A studio's price moves. Quality and reputation set its level, a hot streak raises it, being short of money or of work lowers it,
 * and each deal has a small roll of its own. So the same studio can be cheap one month and dear the next.
 */
export const getStudioFee = (card: FeeCard, seed: string): OriginalStudioFee => {
    const level = 19 + ((card.reputation - 30) / 70) * 8 + ((card.creative - 50) / 50) * 4;
    const hard = (card.negotiation - 70) * 0.06 + (card.budgetControl - 60) * 0.02;
    const heat = (card.hotStreak ? 2.5 : 0) + Math.max(-1.5, Math.min(2, (card.momentum - 50) * 0.05));
    const cash = card.runwayWeeks < 26 ? -5 : card.runwayWeeks < 52 ? -3 : card.runwayWeeks < 104 ? -1 : 0;
    const work = card.openSlots >= 2 ? -2 : card.openSlots === 1 ? -1 : 1;
    const roll = ((hash(`${seed}:fee`) % 1000) / 1000 - 0.5) * 5;
    const percent = Math.round(Math.max(15, Math.min(40, level + hard + heat + cash + work + roll)));
    const reasons: Array<[number, string]> = [
        [cash, `${card.name} is short of cash, so it came in cheap.`],
        [heat, `${card.name} is on a hot streak and is charging for it.`],
        [work, card.openSlots >= 1 ? `${card.name} has empty stages and wants the work.` : `${card.name} is busy, and busy studios charge more.`],
        [roll, roll > 0 ? `${card.name} is holding out for more on this one.` : `${card.name} gave you a good price on this one.`],
    ];
    const biggest = reasons.reduce((best, reason) => (Math.abs(reason[0]) > Math.abs(best[0]) ? reason : best));
    const why = Math.abs(biggest[0]) >= 1.5 ? biggest[1] : `${card.name} is asking what its name is worth.`;
    return { percent, why };
};

/** Every line of Greenlight's budget, scaled for a season's length */
export const scaleOriginalBudget = <T extends { total: number; baseCost: number; scriptCost: number; cast: number; backgroundEnsemble: number; director: number; crew: number; locationCost: number; equipmentCost: number; effectsCost: number }>(budget: T, scale: number): T => {
    if (scale === 1) return budget;
    const by = (value: number) => Math.round((Number(value) || 0) * scale);
    return {
        ...budget,
        total: by(budget.total),
        baseCost: by(budget.baseCost),
        scriptCost: budget.scriptCost,
        cast: by(budget.cast),
        backgroundEnsemble: by(budget.backgroundEnsemble),
        director: by(budget.director),
        crew: by(budget.crew),
        locationCost: by(budget.locationCost),
        equipmentCost: by(budget.equipmentCost),
        effectsCost: by(budget.effectsCost),
    };
};

export interface OriginalBillInput {
    scriptCost: number;
    director: number;
    cast: number;
    backgroundEnsemble: number;
    crew: number;
    locationCost: number;
    equipmentCost: number;
    effectsCost?: number;
    baseCost: number;
    musicBudget: number;
}

export interface OriginalBill {
    above: Array<{ label: string; amount: number }>;
    below: Array<{ label: string; amount: number }>;
    /** What it costs to make */
    making: number;
    feePercent: number;
    fee: number;
    /** What the deal asks for */
    total: number;
    deal: OriginalDealKind;
    perEpisode: number;
}

/** Above the line, below the line, the fee, the total. Your own studio takes no fee and has one kind of deal. */
export const buildOriginalBill = (input: OriginalBillInput, episodes: number, feePercent: number, deal: OriginalDealKind = 'BUY'): OriginalBill => {
    const above = [
        { label: 'Script rights', amount: input.scriptCost },
        { label: 'Director', amount: input.director },
        { label: 'Principal cast', amount: input.cast },
        { label: 'Background ensemble', amount: input.backgroundEnsemble },
    ];
    const below = [
        { label: 'Production crew', amount: input.crew },
        { label: 'Locations', amount: input.locationCost },
        { label: 'Equipment and gear', amount: input.equipmentCost },
        ...((input.effectsCost || 0) > 0 ? [{ label: 'Effects', amount: input.effectsCost || 0 }] : []),
        { label: 'Base production', amount: input.baseCost },
        { label: 'Soundtrack', amount: input.musicBudget },
    ];
    const making = [...above, ...below].reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const fee = deal === 'BUY' ? Math.round(making * (feePercent / 100)) : 0;
    const total = deal === 'BUY' ? making + fee : Math.round(making * LICENCE_SHARE_OF_MAKING);
    return { above, below, making, feePercent, fee, total, deal, perEpisode: Math.round(total / Math.max(1, Number(episodes) || 1)) };
};

/** Only a studio that can wait for its money can offer a licence: it carries the rest of the cost until the rights come back */
/** #294: a pitch's fee: the studio's, and more once a rival is after it */
export const getPitchFee = (
    card: Parameters<typeof getStudioFee>[0],
    pitch: { seed: string; chasedByPlatformName?: string; priceClimbPercent?: number },
): { percent: number; why: string } => {
    const base = getStudioFee(card, pitch.seed);
    return pitch.chasedByPlatformName
        ? { percent: base.percent + (pitch.priceClimbPercent || 0), why: `${pitch.chasedByPlatformName} is after it too, so the price has gone up.` }
        : base;
};

export const canStudioOfferLicence = (card: Pick<OriginalsStudioCard, 'financiallyStrong'>): boolean => Boolean(card.financiallyStrong);
