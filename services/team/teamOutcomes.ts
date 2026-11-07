/**
 * #181 (plan §22.4): an executive's stats change what their work comes to. Zeesh, 2026-11-03: "logo ka stats sach me
 * changes laye i mean agar low grade ko hire kar rhe to aisa nahi ki bahut khash kuch wo kar denge but esa bhi nahi
 * ki wo rare cases na kare kuch".
 *
 *   Skill: every job they carry out lands under or over its budget by their skill (0.85–1.20 of plan: half the gap
 *   comes back or is spent on top). Rarely a great move (1% + 0.08% a skill point: 20% of the cost comes back) or a
 *   slip (1% + 0.12% for each point under 100: 15% more). A network order they place is ready a week early on a great
 *   move, a week late on a slip. A weak hire is rarely great; a star rarely slips.
 *   Ambition: 80+ do one more job a week, under 40 one fewer. 75+ ask for a raise (+8%) every 26 weeks; a no costs
 *   10 loyalty, a yes adds 5.
 *   Ethics: under 45, each quarter a 3–8% chance of padded expenses (two weeks of their pay).
 *   Loyalty: rivals' calls, as before; and under 45, a 25% chance of leaving after a quarter under pressure.
 * Every roll is seeded (the career, the person, the job, the week), so it cannot be taken back by trying again.
 */
import type { OwnedStreamingExecutiveAppointment, OwnedStreamingLedgerEntry, OwnedStreamingPlatformState, Player, StreamingTeamAction } from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';

export type StreamingTeamOutcome = 'GREAT' | 'PLAN' | 'SLIP';

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const money = (value: number) => {
    const absolute = Math.abs(value);
    return absolute >= 1e9 ? `$${(absolute / 1e9).toFixed(1)}B` : absolute >= 1e6 ? `$${(absolute / 1e6).toFixed(1)}M` : `$${Math.round(absolute / 1e3)}K`;
};

/** how well their work turns out against plan, by skill: 30 → 0.92, 50 → 1.00, 80 → 1.12, 95 → 1.18 */
export const streamingTeamQuality = (skill: number) => clamp(0.8 + clamp(skill, 0, 100) * 0.004, 0.85, 1.2);
export const streamingTeamGreatChance = (skill: number) => 0.01 + clamp(skill, 0, 100) * 0.0008;
export const streamingTeamSlipChance = (skill: number) => 0.01 + (100 - clamp(skill, 0, 100)) * 0.0012;

export const rollStreamingTeamOutcome = (seed: string, appointmentId: string, key: string, skill: number): StreamingTeamOutcome => {
    const roll = createDeterministicRng(`${seed}:outcome:${appointmentId}:${key}`)();
    if (roll < streamingTeamGreatChance(skill)) return 'GREAT';
    if (roll > 1 - streamingTeamSlipChance(skill)) return 'SLIP';
    return 'PLAN';
};

/** what an outcome does to a job's money: + comes back, − is spent on top; and the minutes' words */
export const streamingTeamOutcomeMoney = (outcome: StreamingTeamOutcome, skill: number, cost: number): { delta: number; words: string } => {
    if (outcome === 'GREAT') {
        const back = Math.round(cost * 0.2);
        return { delta: back, words: back > 0 ? `A great move: 20% under budget, ${money(back)} back.` : 'A great move.' };
    }
    if (outcome === 'SLIP') {
        const more = Math.round(cost * 0.15);
        return { delta: -more, words: more > 0 ? `A slip: 15% over budget, ${money(more)} more.` : 'A slip.' };
    }
    const gap = streamingTeamQuality(skill) - 1;
    const delta = Math.round(cost * gap * 0.5);
    const percent = Math.round(Math.abs(gap) * 50);
    return { delta, words: delta > 0 ? `${percent}% under budget.` : delta < 0 ? `${percent}% over budget.` : 'On budget.' };
};

/** the money moves, booked once as a team result (so the books and the treasury agree) */
export const applyStreamingTeamMoney = (
    platform: OwnedStreamingPlatformState, key: string, delta: number, absoluteWeek: number, summary: string,
): OwnedStreamingPlatformState => {
    if (!delta) return platform;
    const idempotencyKey = `team-result:${key}`;
    if (platform.eventLedger.some(entry => entry.idempotencyKey === idempotencyKey)) return platform;
    const entry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'TEAM_RESULT',
        summary,
        source: 'SYSTEM',
        metadata: delta > 0 ? { refund: delta } : { overrun: -delta },
    };
    return { ...platform, treasuryCash: platform.treasuryCash + delta, eventLedger: [...platform.eventLedger, entry] };
};

/** a network order a great move brings forward a week, a slip pushes back a week */
export const shiftStreamingTeamOrder = (platform: OwnedStreamingPlatformState, executiveName: string, absoluteWeek: number, outcome: StreamingTeamOutcome): OwnedStreamingPlatformState => {
    if (outcome === 'PLAN') return platform;
    const order = [...(platform.networkOrders || [])].reverse().find(item => item.orderedBy?.name === executiveName && item.orderedAtAbsoluteWeek === absoluteWeek);
    if (!order) return platform;
    const ready = outcome === 'GREAT' ? Math.max(order.orderedAtAbsoluteWeek + 1, order.readyAtAbsoluteWeek - 1) : order.readyAtAbsoluteWeek + 1;
    return { ...platform, networkOrders: (platform.networkOrders || []).map(item => (item === order ? { ...item, readyAtAbsoluteWeek: ready } : item)) };
};

/** ambition's pull on how many jobs a week they take on */
export const streamingTeamAmbitionActions = (ambition: number) => (ambition >= 80 ? 1 : ambition < 40 ? -1 : 0);

export const STREAMING_TEAM_RAISE_PERCENT = 8;
const RAISE_WEEKS = 26;
/** an ambitious executive's raise falls due every 26 weeks at our table; the period numbers each ask */
export const streamingTeamRaiseDue = (appointment: OwnedStreamingExecutiveAppointment, absoluteWeek: number): number | null => {
    const served = absoluteWeek - appointment.appointedAtAbsoluteWeek;
    if (appointment.ambition < 75 || served < RAISE_WEEKS || served % RAISE_WEEKS !== 0) return null;
    return served / RAISE_WEEKS;
};

/** low ethics: each quarter at our table, a chance of padded expenses (two weeks of their pay) */
export const streamingTeamEthicsChance = (ethics: number) => (ethics >= 45 ? 0 : clamp(0.03 + (45 - ethics) * 0.0025, 0.03, 0.08));
export const streamingTeamPaddedExpenses = (seed: string, appointment: OwnedStreamingExecutiveAppointment, absoluteWeek: number): number => {
    const served = absoluteWeek - appointment.appointedAtAbsoluteWeek;
    const chance = streamingTeamEthicsChance(appointment.ethics);
    if (!chance || served <= 0 || served % 13 !== 0) return 0;
    return createDeterministicRng(`${seed}:expenses:${appointment.id}:${absoluteWeek}`)() < chance ? appointment.weeklyCompensation * 2 : 0;
};

/** low loyalty: after a quarter under pressure, a 25% chance they leave (one roll a review, however often it is read) */
export const streamingTeamLeavesAfterBadQuarter = (seed: string, appointment: OwnedStreamingExecutiveAppointment, reviewId: string) => (
    appointment.loyalty < 45 && createDeterministicRng(`${seed}:bad-quarter:${appointment.id}:${reviewId}`)() < 0.25
);

/** what each stat means for this person, for their page and their CV */
export const streamingTeamStatMeaning = (executive: Pick<OwnedStreamingExecutiveAppointment, 'skill' | 'loyalty' | 'ambition' | 'ethics'>) => {
    const budget = Math.round((streamingTeamQuality(executive.skill) - 1) * 50);
    return {
        skill: `${budget > 0 ? `Jobs ${budget}% under budget` : budget < 0 ? `Jobs ${-budget}% over budget` : 'Jobs on budget'} · great move ${Math.round(streamingTeamGreatChance(executive.skill) * 100)}% · slip ${Math.round(streamingTeamSlipChance(executive.skill) * 100)}%`,
        ambition: executive.ambition >= 80 ? 'One more job a week · asks for a raise every 6 months'
            : executive.ambition >= 75 ? 'Asks for a raise every 6 months'
                : executive.ambition < 40 ? 'One job fewer a week' : 'Content with the role',
        ethics: executive.ethics < 45 ? `May pad expenses: about ${Math.round(streamingTeamEthicsChance(executive.ethics) * 100)}% a quarter` : executive.ethics >= 80 ? 'Clean books' : 'Plays it straight',
        /* #183: loyalty's own line (the rival risk is its chip) */
        loyalty: executive.loyalty < 45 ? 'May quit after a hard quarter: 1 in 4' : executive.loyalty >= 80 ? 'Stays through hard times' : 'Stays through a hard quarter',
    };
};

/** a raise approved: their pay follows, and they are a little more loyal */
export const executeStreamingTeamRaise = (player: Player, action: StreamingTeamAction): { player: Player; changed: boolean; reason?: string } => {
    if (action.kind !== 'RAISE') return { player, changed: false, reason: 'Not a raise.' };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const appointment = platform.leadership.appointments.find(item => item.id === action.appointmentId && item.status === 'ACTIVE');
    if (!appointment) return { player, changed: false, reason: 'They are no longer at the table.' };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                leadership: {
                    ...platform.leadership,
                    appointments: platform.leadership.appointments.map(item => (item.id === appointment.id
                        ? { ...item, weeklyCompensation: action.weekly, loyalty: Math.min(100, item.loyalty + 5) } : item)),
                },
            }, player.id),
        },
        changed: true,
    };
};
