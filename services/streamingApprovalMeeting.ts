/**
 * #228: who is at the table for an ask, how each of them votes and why. A seat's vote comes from the board's confidence,
 * the size of the ask, and that director's own relationship, independence, priorities and seat, seeded by week and motion,
 * so asking again that week gives the same answer. One call to one director can move someone who is close.
 *
 * #231: a listed company's holders are counted by percent: you, the named investors, and the public, whose share follows
 * how far the ask is from what they would expect.
 */
import type { Gender, OwnedStreamingApprovalRecord, OwnedStreamingBoardDirector, OwnedStreamingPlatformState, Player } from '../types';
import { createDeterministicRng } from './deterministicRandom';
import { findIndustryInvestor, getIndustryPeople } from './industry/industryPeople';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { recordStreamingApproval, streamingApprovalKey, type StreamingApprovalAsk, type StreamingApprovalContext } from './streamingApproval';
import { getStreamingOwnershipView } from './streamingInvestorOffers';
import { streamingExecutiveGender } from './team/streamingTeam';
import { getStreamingTeamCashFloor } from './team/teamState';

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const money = (value: number) => {
    const abs = Math.abs(value);
    return abs >= 1e9 ? `$${(abs / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(abs / 1e3)}K`;
};
const firstName = (name: string) => name.split(' ')[0];
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

export interface StreamingApprovalSeat {
    id: string;
    name: string;
    /** the short name on the tile */
    who: string;
    /** the tiny caps line on the tile */
    role: string;
    gender: Gender | null;
    avatar: string | null;
    /** a seat is 1; a holder is their percent */
    weight: number;
    /** 0 to 1: a person is all one way, the public splits */
    forShare: number;
    /** above 0 is for */
    lean: number;
    reason: string;
    callable: boolean;
    /** who it moves, for the call */
    independence: number;
    relationship: number;
    strategy: string | null;
}

export interface StreamingApprovalSpeaker {
    name: string;
    role: string;
    gender: Gender | null;
    avatar: string | null;
    ok: boolean;
    chip: string;
    line: string;
}

export interface StreamingApprovalMeeting {
    ask: StreamingApprovalAsk;
    mode: OwnedStreamingApprovalRecord['mode'];
    eyebrow: string;
    headline: string;
    chip: string;
    chipWarn: boolean;
    what: string;
    speaker: StreamingApprovalSpeaker | null;
    seats: StreamingApprovalSeat[];
    /** what carries it: seats needed, or more than this percent */
    carriesOn: number;
    center: string;
    title: string;
}

export interface StreamingApprovalCall { seatId: string; argumentId: string }

export const STREAMING_APPROVAL_ARGUMENTS = [
    { id: 'NUMBERS', label: 'THE NUMBERS', line: 'Read the sheet again. The company can carry this.' },
    { id: 'LONG_GAME', label: 'THE LONG GAME', line: 'In three years nobody remembers this week. Think about where we are going.' },
    { id: 'LOYALTY', label: 'PERSONAL LOYALTY', line: 'I am asking you to back me on this one.' },
] as const;

const KIND_WORDS: Record<StreamingApprovalAsk['kind'], string> = {
    SALE_BID: 'A BID FOR THE COMPANY',
    MONEY_OUT: 'MONEY OUT',
    DIVIDEND: 'THE DIVIDEND',
    SALARY: 'YOUR SALARY',
    BONUS: 'YOUR BONUS',
    CEO_RETURN: 'BACK AS CHIEF EXECUTIVE',
    CEO_REPLACE: 'A NEW CHIEF EXECUTIVE',
    REMOVE_DIRECTOR: 'REMOVING A DIRECTOR',
};

/* what the ask itself does to everyone's view */
const askTerm = (ask: StreamingApprovalAsk, platform: OwnedStreamingPlatformState, context: StreamingApprovalContext) => {
    const treasury = Math.max(1, platform.treasuryCash);
    switch (ask.kind) {
        case 'MONEY_OUT': return -((context.cost || 0) / treasury) * 50;
        case 'DIVIDEND': return context.cut ? -6 : -((context.cost || 0) / treasury) * 40;
        case 'SALARY': return -((context.ratio || 1) - 1) * 40;
        case 'BONUS': return -clamp(((context.ratio || 1) - 1) * 20, 0, 30);
        case 'SALE_BID': return ((context.premium || 1.1) - 1.1) * 100;
        case 'CEO_RETURN': return 5 - ((context.currentSkill ?? 60) - 60) * 0.4;
        case 'CEO_REPLACE': return ((context.skill ?? 60) - (context.currentSkill ?? 60)) * 0.5;
        case 'REMOVE_DIRECTOR': return -6;
        default: return 0;
    }
};

/* what their own priorities make of it */
const priorityTerm = (ask: StreamingApprovalAsk, strategy: string, investorSeat: boolean, context: StreamingApprovalContext) => {
    const money_out = ask.kind === 'MONEY_OUT' || (ask.kind === 'DIVIDEND' && !context.cut);
    const pay = ask.kind === 'SALARY' || ask.kind === 'BONUS';
    let term = 0;
    if (money_out) term += strategy === 'GROWTH_FIRST' ? -6 : strategy === 'MARGIN_FIRST' ? 3 : 0;
    if (pay) term += strategy === 'TRUST_FIRST' ? -4 : 0;
    if (ask.kind === 'SALE_BID') term += strategy === 'GROWTH_FIRST' ? -3 : strategy === 'MARGIN_FIRST' ? 3 : 0;
    if (investorSeat) term += money_out || ask.kind === 'SALE_BID' ? 8 : pay ? -6 : ask.kind === 'DIVIDEND' ? -10 : 0;
    return term;
};

const reasonOf = (ask: StreamingApprovalAsk, forIt: boolean, investorSeat: boolean, strategy: string, context: StreamingApprovalContext, platform: OwnedStreamingPlatformState) => {
    /* a board that has lost faith says so, whatever the ask */
    if (!forIt && platform.governance.boardConfidence < 40) return 'The board has lost confidence. Not now.';
    switch (ask.kind) {
        case 'MONEY_OUT':
            if (forIt) return investorSeat ? 'We get our share of it too.' : 'The treasury can carry it.';
            if ((context.cost || 0) / Math.max(1, platform.treasuryCash) > 0.25) return 'That is too much of the treasury at once.';
            return strategy === 'GROWTH_FIRST' ? 'That money should be building the company.' : 'Better kept in the treasury for now.';
        case 'DIVIDEND':
            if (context.cut) return forIt ? 'Better in the business for now.' : 'Holders were promised this.';
            return forIt ? (investorSeat ? 'Holders have waited for this.' : 'We can afford to pay it.') : 'It is more than we should commit to each quarter.';
        case 'SALARY':
        case 'BONUS':
            if (forIt) return ask.kind === 'BONUS' ? 'The results earned it.' : 'A fair price for the job.';
            return investorSeat ? 'That comes out of our return.' : ask.kind === 'BONUS' ? 'The results do not earn that.' : 'More than the job pays anywhere.';
        case 'SALE_BID':
            return forIt ? 'A good price. Holders should take it.' : 'We are worth more than this.';
        case 'CEO_RETURN':
            return forIt ? 'The founder knows this company best.' : 'The company is doing well as it is.';
        case 'CEO_REPLACE':
            return forIt ? 'A stronger pair of hands.' : `We see no reason to change.`;
        case 'REMOVE_DIRECTOR':
            return forIt ? 'If the founder cannot work with them, so be it.' : 'A director should not go for disagreeing.';
        default:
            return forIt ? 'Agreed.' : 'Not now.';
    }
};

const faceOfDirector = (player: Player, director: OwnedStreamingBoardDirector): Gender | null => {
    const investor = findIndustryInvestor(player, director.name.replace(/ nominee$/, ''));
    if (investor) return investor.person ? investor.gender : null;
    return getIndustryPeople(player).find(item => item.name === director.name)?.gender ?? null;
};

/* the director's own mind, given the ask */
const directorLean = (player: Player, platform: OwnedStreamingPlatformState, ask: StreamingApprovalAsk, context: StreamingApprovalContext, id: string, independence: number, relationship: number, strategy: string, investorSeat: boolean, week: number) => {
    const rng = createDeterministicRng(`${platform.simulationSeed}:table:${streamingApprovalKey(ask)}:${id}:${week}`);
    const confidence = platform.governance.boardConfidence;
    return (confidence - 60) * 0.9 + askTerm(ask, platform, context) + (relationship - 50) * 0.25 - (independence - 50) * 0.1
        + priorityTerm(ask, strategy, investorSeat, context) + (rng() - 0.5) * 20;
};

const boardSeats = (player: Player, platform: OwnedStreamingPlatformState, ask: StreamingApprovalAsk, context: StreamingApprovalContext, week: number): StreamingApprovalSeat[] => {
    const directors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    const offBoard = platform.leadership.currentCeo.holderType === 'EXECUTIVE' && platform.legacy.founderOfficeRole !== 'EXECUTIVE_CHAIR';
    const you: StreamingApprovalSeat[] = offBoard ? [] : [{
        id: 'founder', name: player.name, who: 'You', role: platform.legacy.founderOfficeRole === 'EXECUTIVE_CHAIR' ? 'CHAIR' : 'FOUNDER',
        gender: player.gender, avatar: player.avatar || null, weight: 1, forShare: 1, lean: 99, reason: '', callable: false, independence: 50, relationship: 100, strategy: null,
    }];
    return [...you, ...directors.map((director): StreamingApprovalSeat => {
        const investorSeat = director.seatType !== 'INDEPENDENT';
        const isTarget = ask.kind === 'REMOVE_DIRECTOR' && ask.refId === director.id;
        const lean = isTarget ? -99 : directorLean(player, platform, ask, context, director.id, director.independence, director.founderRelationship, director.preferredStrategy, investorSeat, week);
        return {
            id: director.id,
            name: director.name,
            who: firstName(director.name),
            role: investorSeat ? 'INVESTOR' : 'INDEPENDENT',
            gender: faceOfDirector(player, director),
            avatar: null,
            weight: 1,
            forShare: lean > 0 ? 1 : 0,
            lean,
            reason: isTarget ? 'It is my seat.' : reasonOf(ask, lean > 0, investorSeat, director.preferredStrategy, context, platform),
            callable: !isTarget,
            independence: director.independence,
            relationship: director.founderRelationship,
            strategy: director.preferredStrategy,
        };
    })];
};

const holderSeats = (player: Player, platform: OwnedStreamingPlatformState, ask: StreamingApprovalAsk, context: StreamingApprovalContext, week: number): StreamingApprovalSeat[] => {
    const holders = getStreamingOwnershipView(player).holders.filter(holder => holder.percent > 0.005);
    const seat = (holder: typeof holders[number]): StreamingApprovalSeat => {
        if (holder.kind === 'YOU') {
            return { id: holder.id, name: holder.name, who: 'You', role: `${holder.percent.toFixed(1)}%`, gender: holder.gender ?? null, avatar: player.avatar || null, weight: holder.percent, forShare: 1, lean: 99, reason: '', callable: false, independence: 50, relationship: 100, strategy: null };
        }
        if (holder.kind === 'TEAM') {
            return { id: holder.id, name: holder.name, who: 'Team', role: `${holder.percent.toFixed(1)}%`, gender: null, avatar: null, weight: holder.percent, forShare: 1, lean: 50, reason: 'Your executives vote with you.', callable: false, independence: 50, relationship: 100, strategy: null };
        }
        if (holder.kind === 'PUBLIC') {
            const forShare = clamp(context.publicFor ?? 0.5, 0, 1);
            return { id: holder.id, name: holder.name, who: 'Public', role: `${holder.percent.toFixed(1)}%`, gender: null, avatar: null, weight: holder.percent, forShare, lean: (forShare - 0.5) * 100, reason: `${Math.round(forShare * 100)}% of them are for it.`, callable: false, independence: 50, relationship: 50, strategy: null };
        }
        const lean = directorLean(player, platform, ask, context, holder.id, 55, 50, 'BALANCED', true, week);
        return { id: holder.id, name: holder.name, who: firstName(holder.name), role: `${holder.percent.toFixed(1)}%`, gender: holder.gender ?? null, avatar: null, weight: holder.percent, forShare: lean > 0 ? 1 : 0, lean, reason: reasonOf(ask, lean > 0, true, 'BALANCED', context, platform), callable: true, independence: 55, relationship: 50, strategy: 'BALANCED' };
    };
    return holders.map(seat);
};

const cfoOf = (player: Player, platform: OwnedStreamingPlatformState, cost: number): StreamingApprovalSpeaker | null => {
    const cfo = platform.leadership.appointments.find(item => item.status === 'ACTIVE' && item.role === 'CFO');
    if (!cfo) return null;
    const floor = getStreamingTeamCashFloor(platform);
    const weekly = floor.amount / Math.max(1, floor.weeks);
    const weeksAfter = weekly > 0 ? Math.floor(Math.max(0, platform.treasuryCash - cost) / weekly) : null;
    const ok = weeksAfter === null || weeksAfter >= floor.weeks * 1.5;
    return {
        name: cfo.nameAtAppointment,
        role: 'CHIEF FINANCIAL OFFICER',
        gender: streamingExecutiveGender(player, cfo.executiveId),
        avatar: null,
        ok,
        chip: ok ? 'SIGNS IT' : 'ADVISES AGAINST',
        line: weeksAfter === null
            ? `“${money(cost)} leaves the treasury. I can put my name to that.”`
            : ok
                ? `“${money(cost)} leaves ${weeksAfter} weeks of costs in the treasury. I can put my name to that.”`
                : `“${money(cost)} leaves ${weeksAfter} weeks of costs in the treasury. I would not do it, and I will say so at the table.”`,
    };
};

const MONEY_KINDS = new Set<StreamingApprovalAsk['kind']>(['MONEY_OUT', 'DIVIDEND', 'SALARY', 'BONUS']);

/** who is at the table and how they lean, before any call */
export const getStreamingApprovalMeeting = (player: Player, ask: StreamingApprovalAsk, context: StreamingApprovalContext): StreamingApprovalMeeting => {
    const platform = platformOf(player);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    const directors = platform.governance.directors.filter(item => item.status === 'ACTIVE').length;
    /* a listed company's holders vote on a tender and on the founder's pay; with no real board, the holders are counted too */
    const mode: OwnedStreamingApprovalRecord['mode'] = (listed && (ask.kind === 'SALE_BID' || ask.kind === 'SALARY' || ask.kind === 'BONUS')) || directors < 2 ? 'HOLDERS' : 'BOARD';
    const seats = mode === 'HOLDERS' ? holderSeats(player, platform, ask, context, week) : boardSeats(player, platform, ask, context, week);
    const total = seats.length;
    return {
        ask,
        mode,
        eyebrow: `${mode === 'HOLDERS' ? 'THE SHAREHOLDERS' : 'THE TABLE'} · ${KIND_WORDS[ask.kind]}`,
        headline: context.headline,
        chip: context.chip,
        chipWarn: Boolean(context.chipWarn),
        what: context.what,
        speaker: MONEY_KINDS.has(ask.kind) && (context.cost || 0) > 0 ? cfoOf(player, platform, context.cost || 0) : null,
        seats,
        carriesOn: mode === 'HOLDERS' ? 50 : Math.floor(total / 2) + 1,
        center: mode === 'HOLDERS' ? 'CARRIES OVER 50%' : `THE BOARD · CARRIES ON ${Math.floor(total / 2) + 1}`,
        title: context.title,
    };
};

/** one call: only someone close can be moved, and the right argument moves them most */
export const callStreamingSeat = (seat: StreamingApprovalSeat, argumentId: string): { seat: StreamingApprovalSeat; reply: string } => {
    const name = firstName(seat.name);
    const weight = argumentId === 'NUMBERS' ? 4 + seat.independence / 10
        : argumentId === 'LOYALTY' ? seat.relationship / 8
            : seat.strategy === 'GROWTH_FIRST' || seat.strategy === 'GLOBAL_FIRST' || seat.strategy === 'CREATIVE_FIRST' ? 9 : 4;
    if (seat.lean > 0) return { seat, reply: `${name}: “You already had me. You spent your call on the wrong person.”` };
    const moved = seat.lean > -14 ? seat.lean + weight : seat.lean;
    if (moved <= 0) return { seat, reply: `${name}: “I have read the same numbers you have. It does not change my vote.”` };
    return { seat: { ...seat, lean: moved, forShare: 1, reason: 'You made the call.' }, reply: `${name}: “All right. I will vote for it. Put the reason in the minutes.”` };
};

export const applyStreamingApprovalCall = (meeting: StreamingApprovalMeeting, call: StreamingApprovalCall | null): { seats: StreamingApprovalSeat[]; reply: string | null } => {
    if (!call) return { seats: meeting.seats, reply: null };
    let reply: string | null = null;
    const seats = meeting.seats.map(seat => {
        if (seat.id !== call.seatId) return seat;
        const result = callStreamingSeat(seat, call.argumentId);
        reply = result.reply;
        return result.seat;
    });
    return { seats, reply };
};

export const streamingApprovalCount = (meeting: Pick<StreamingApprovalMeeting, 'mode' | 'carriesOn'>, seats: StreamingApprovalSeat[]) => {
    const forTotal = seats.reduce((sum, seat) => sum + seat.weight * seat.forShare, 0);
    const againstTotal = seats.reduce((sum, seat) => sum + seat.weight * (1 - seat.forShare), 0);
    return {
        forTotal,
        againstTotal,
        carried: meeting.mode === 'HOLDERS' ? forTotal > againstTotal : forTotal >= meeting.carriesOn,
    };
};

/** the vote's result, on the record; a no costs a little confidence, because it shows */
export const settleStreamingApproval = (player: Player, meeting: StreamingApprovalMeeting, call: StreamingApprovalCall | null): { player: Player; carried: boolean; forPercent: number } => {
    const platform = platformOf(player);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const { seats } = applyStreamingApprovalCall(meeting, call);
    const { carried, forTotal, againstTotal } = streamingApprovalCount(meeting, seats);
    const forPercent = Math.round(forTotal / Math.max(0.01, forTotal + againstTotal) * 1000) / 10;
    const row: OwnedStreamingApprovalRecord = {
        key: streamingApprovalKey(meeting.ask),
        kind: meeting.ask.kind,
        ...(meeting.ask.refId ? { refId: meeting.ask.refId } : {}),
        ...(meeting.ask.amount !== undefined ? { amount: meeting.ask.amount } : {}),
        atAbsoluteWeek: week,
        mode: meeting.mode,
        carried,
        forPercent,
        title: meeting.title,
    };
    const confidence = carried ? platform.governance.boardConfidence : Math.max(0, platform.governance.boardConfidence - 2);
    return {
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(recordStreamingApproval(platform, row, confidence), player.id) },
        carried,
        forPercent,
    };
};
