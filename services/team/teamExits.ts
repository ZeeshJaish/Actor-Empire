/**
 * #200 (plan §23.8): executives leave by themselves. Zeesh (2026-11-04): "i also hope ki agar koi board leave kare to
 * stock me bhi impact kare , news me bhi and kafi baar aisa ho ki wo khud leave kar de like yk aisa nahi ki hm hi fire
 * kare to wo leave kare. may be rival offfer better or just wanna quit".
 *
 * Why someone goes: a rival's better offer (its own card), underpaid against the market, burnt out or simply wanting out
 * (about 3% a year at loyalty 80, about 12% at 40), retiring after a long career, or a hard quarter. They give four
 * weeks' notice as a card; retirement and personal reasons have no counter. The chair then empties, vested options stay
 * and the rest go back.
 *
 * What it does to the company: listed, the price moves at the next quote (a planned exit about −0.3%; a sudden one −6%
 * for a chief executive, −4% for a CFO, −1.5% for another chair; half as much again after a hard quarter; real studies
 * put a routine chief executive's exit at about −0.4% and one with bad news at about −8%). Private, the board's
 * confidence moves instead.
 *
 * Pure rules: no service here writes anything.
 */
import type {
    OwnedStreamingExecutiveAppointment,
    Player,
    StreamingExecutiveExitReason,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { getIndustryPerson, industryPersonNow } from '../industry/industryPeople';

export const STREAMING_TEAM_NOTICE_WEEKS = 4;
export const STREAMING_TEAM_SEVERANCE_WEEKS = 13;
/** paid this far under the market, they feel it */
export const STREAMING_TEAM_UNDERPAID_AT = 0.15;
const LEVEL_RAISE = 1.15;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const roundToPay = (value: number) => Math.max(5_000, Math.round(value / 5_000) * 5_000);

/** what the market would pay them today: their own market pay, and what each level here has earned */
export const streamingTeamMarketPay = (player: Player, appointment: OwnedStreamingExecutiveAppointment) => {
    const person = getIndustryPerson(player, appointment.executiveId);
    if (!person) return appointment.weeklyCompensation;
    return roundToPay(industryPersonNow(player, person).weeklyCompensation * LEVEL_RAISE ** Math.max(0, appointment.level - 2));
};
/** how far under the market they are paid: 0.2 is 20% under */
export const streamingTeamUnderpaidBy = (player: Player, appointment: OwnedStreamingExecutiveAppointment) => (
    Math.max(0, 1 - appointment.weeklyCompensation / Math.max(1, streamingTeamMarketPay(player, appointment)))
);

/** a year's chance of simply wanting out: about 3% at loyalty 80, about 12% at 40 */
export const streamingTeamWalkOutChance = (loyalty: number) => clamp(0.03 + (80 - loyalty) * 0.00225, 0.01, 0.2);
/** a quarter's chance of leaving over pay */
export const streamingTeamUnderpaidChance = (underpaidBy: number, loyalty: number) => (
    underpaidBy < STREAMING_TEAM_UNDERPAID_AT ? 0 : clamp(underpaidBy * (1 - loyalty / 100) * 1.5, 0, 0.6)
);

/** a reason you can answer with money; the rest leave whatever you offer */
export const streamingExitHasCounter = (reason: StreamingExecutiveExitReason) => reason === 'UNDERPAID' || reason === 'HARD_QUARTER' || reason === 'RIVAL_OFFER';
/** a planned exit, which the market shrugs at, or a sudden one */
export const streamingExitIsSudden = (reason: StreamingExecutiveExitReason) => !['RETIRING', 'PERSONAL', 'BURNT_OUT'].includes(reason);

/**
 * Who wants to leave this week, and why (the week's seed decides, so a reload changes nothing). The new hire is left
 * alone for a quarter; retiring comes first.
 */
export const streamingTeamWantsToLeave = (
    player: Player,
    seed: string,
    appointment: OwnedStreamingExecutiveAppointment,
    absoluteWeek: number,
    badQuarterId: string | null,
): StreamingExecutiveExitReason | null => {
    const person = getIndustryPerson(player, appointment.executiveId);
    if (person?.retireAtYears !== undefined && industryPersonNow(player, person).yearsExperience >= person.retireAtYears) return 'RETIRING';
    if (badQuarterId && appointment.loyalty < 45 && createDeterministicRng(`${seed}:bad-quarter:${appointment.id}:${badQuarterId}`)() < 0.25) return 'HARD_QUARTER';
    const tenure = absoluteWeek - appointment.appointedAtAbsoluteWeek;
    if (tenure < 13) return null;
    const rng = createDeterministicRng(`${seed}:walk-out:${appointment.id}:${absoluteWeek}`);
    if (tenure % 13 === 0 && rng() < streamingTeamUnderpaidChance(streamingTeamUnderpaidBy(player, appointment), appointment.loyalty)) return 'UNDERPAID';
    if (rng() < streamingTeamWalkOutChance(appointment.loyalty) / 52) return rng() < 0.5 ? 'BURNT_OUT' : 'PERSONAL';
    return null;
};

/** what would keep them: the market, and more than they are paid now */
export const streamingTeamCounterAsk = (player: Player, appointment: OwnedStreamingExecutiveAppointment) => (
    roundToPay(Math.max(streamingTeamMarketPay(player, appointment), appointment.weeklyCompensation * 1.1))
);
/** the chance your figure keeps them: their figure does; 10% under it never does */
export const streamingTeamCounterChance = (given: number, wants: number) => clamp((given / Math.max(1, wants) - 0.9) / 0.1, 0, 1);

/** the price move an exit makes, as a fraction */
export const streamingExitPriceMove = (reason: StreamingExecutiveExitReason, role: 'CEO' | 'CFO' | 'OTHER') => {
    if (!streamingExitIsSudden(reason)) return -0.003;
    const hit = role === 'CEO' ? 0.06 : role === 'CFO' ? 0.04 : 0.015;
    return -hit * (reason === 'HARD_QUARTER' ? 1.5 : 1);
};
/** what a private company's board makes of it, in confidence */
export const streamingExitBoardMove = (reason: StreamingExecutiveExitReason, role: 'CEO' | 'CFO' | 'OTHER') => {
    if (!streamingExitIsSudden(reason)) return -1;
    const hit = role === 'CEO' ? 8 : role === 'CFO' ? 5 : 2;
    return -Math.round(hit * (reason === 'HARD_QUARTER' ? 1.5 : 1));
};

/** the card's words */
export const streamingNoticeWords = (reason: StreamingExecutiveExitReason, first: string, weekly: number, market: number, years: number, money: (value: number) => string) => {
    switch (reason) {
        case 'UNDERPAID': return { title: `${first} has given notice`, detail: `Paid ${money(weekly)} a week; the market pays ${money(market)}.` };
        case 'HARD_QUARTER': return { title: `${first} has given notice`, detail: 'The hard quarter was enough.' };
        case 'BURNT_OUT': return { title: `${first} is burnt out and leaving`, detail: 'Nothing you could pay changes this.' };
        case 'PERSONAL': return { title: `${first} is leaving for personal reasons`, detail: 'Nothing you could pay changes this.' };
        case 'RETIRING': return { title: `${first} is retiring`, detail: `After ${years} years in the business.` };
        default: return { title: `${first} has given notice`, detail: '' };
    }
};
