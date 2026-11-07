/**
 * #210 (plan §23.11): the decisions that need you, as the week's popup, answered there or opening the page. Zeesh
 * (2026-11-04): "kafi kuch like you kno huamre pop up system se aa saktee jo hme jis jagah deceion lena hai wha direct kar
 * lenge and page khol denge ?".
 *
 * Built like #75's incident popup. At most 2 streaming popups a week, counting incidents, most urgent first; the rest wait
 * on TEAM's tray with its red dot. Small "Ask me" cards stay in the tray: only a card over its job's money limit comes up.
 * While you chair, only the board's and the chief executive's matters come to you. A popup whose decision has gone
 * closes itself.
 */
import { addActivityLog } from './activityLog';
import type { OwnedStreamingPlatformState, OwnedStreamingTeamCard, Player, ScheduledEvent, StreamingRivalResponseId } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { STREAMING_BOARD_RENEW_WEEKS, renewStreamingBoardDirector } from './streamingBoard';
import { resolveStreamingCatalogTitle } from './streamingCatalog';
import { getStreamingTitlePlacement } from './streamingTitlePlacement';
import { acceptStreamingStakeOffer, declineStreamingStakeOffer } from './streamingControl';
import { getStreamingReturnTerms, returnAsStreamingCeo } from './streamingStepDown';
import { approveStreamingTeamCard, declineStreamingTeamCard } from './team/streamingTeam';

export const STREAMING_DECISIONS_A_WEEK = 2;

export type StreamingDecisionKind =
    | 'BOARD_MOVED' | 'CEO_LEFT' | 'BOARD_WARNS' | 'NOTICE' | 'RIVAL_CALL' | 'BIDS_IN' | 'STAKE_OFFER' | 'INVESTORS_IN' | 'DIRECTOR_LEFT' | 'TERM_ENDING' | 'ESTATE_SOLD' | 'ESTATE_SHORT' | 'RAISE' | 'BIG_CARD' | 'ON_THE_SHELF';
export type StreamingDecisionRoom = 'TEAM' | 'OWNERSHIP' | 'SLATE';

export interface StreamingDecisionEventData { kind: StreamingDecisionKind; key: string; cardId?: string }

const URGENCY: StreamingDecisionKind[] = ['BOARD_MOVED', 'CEO_LEFT', 'BOARD_WARNS', 'ESTATE_SOLD', 'NOTICE', 'RIVAL_CALL', 'BIDS_IN', 'STAKE_OFFER', 'ESTATE_SHORT', 'INVESTORS_IN', 'DIRECTOR_LEFT', 'TERM_ENDING', 'RAISE', 'BIG_CARD', 'ON_THE_SHELF'];
/* while you chair, these are yours; the chief executive answers the rest */
const CHAIR_MATTERS = new Set<StreamingDecisionKind>(['BOARD_MOVED', 'CEO_LEFT', 'NOTICE', 'BIDS_IN', 'STAKE_OFFER', 'DIRECTOR_LEFT', 'TERM_ENDING', 'ESTATE_SOLD', 'ESTATE_SHORT']);

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

const eventIdOf = (data: StreamingDecisionEventData) => `streaming-decision-${data.kind.toLowerCase()}-${data.key}`;

/** The popup's data, or null for any other event */
export const streamingDecisionEventData = (event: Pick<ScheduledEvent, 'type' | 'data'> | undefined): StreamingDecisionEventData | null => {
    const data = event?.type === 'STREAMING_DECISION' ? event.data?.streamingDecision : null;
    return data && typeof data.kind === 'string' && typeof data.key === 'string' ? data : null;
};

const cardKind = (card: OwnedStreamingTeamCard, platform: OwnedStreamingPlatformState): StreamingDecisionKind | null => {
    if (card.action.kind === 'NOTICE') return 'NOTICE';
    if (card.action.kind === 'POACH_ANSWER') return 'RIVAL_CALL';
    if (card.action.kind === 'RAISE') return 'RAISE';
    if (card.action.kind === 'OPEN_ROOM' && card.action.room === 'SUCCESSION') return /losing patience/.test(card.title) ? 'BOARD_WARNS' : 'CEO_LEFT';
    /* a pitch or a door needs its page, not an answer here */
    if (card.action.kind === 'OPEN_ROOM' || card.action.kind === 'ORIGINAL_PITCH') return null;
    /* a card over its job's money limit; small ones stay in the tray */
    const seat = platform.leadership.team?.seats.find(item => item.seatId === card.seatId);
    return seat && seat.actionMoney > 0 && card.cost >= seat.actionMoney ? 'BIG_CARD' : null;
};

/** what needs you this week, most urgent first */
const decisionsThisWeek = (platform: OwnedStreamingPlatformState, absoluteWeek: number, wallet: number): StreamingDecisionEventData[] => {
    const found: StreamingDecisionEventData[] = [];
    (platform.leadership.team?.tray || []).filter(card => card.status === 'WAITING' && card.createdAtAbsoluteWeek === absoluteWeek).forEach(card => {
        const kind = cardKind(card, platform);
        if (kind) found.push({ kind, key: card.id, cardId: card.id });
    });
    if (platform.eventLedger.some(entry => entry.type === 'FOUNDER_ROLE_CHANGED' && entry.metadata?.kind === 'BOARD_MOVED' && entry.absoluteWeek === absoluteWeek)) found.push({ kind: 'BOARD_MOVED', key: String(absoluteWeek) });
    const sale = platform.governance.sale;
    if (sale?.status === 'BIDS' && sale.bidsCloseAtAbsoluteWeek !== null && sale.bidsAtAbsoluteWeek <= absoluteWeek && sale.bidsAtAbsoluteWeek > absoluteWeek - 1) found.push({ kind: 'BIDS_IN', key: sale.id });
    const stake = platform.governance.stakeSale;
    if (stake?.status === 'OFFER' && stake.offerAtAbsoluteWeek === absoluteWeek) found.push({ kind: 'STAKE_OFFER', key: String(stake.startedAtAbsoluteWeek) });
    const round = platform.governance.investorRound;
    if (round && round.closesAtAbsoluteWeek !== null && round.offersAtAbsoluteWeek === absoluteWeek && round.offerCount > 0) found.push({ kind: 'INVESTORS_IN', key: round.id });
    /* one you removed yourself needs no telling */
    platform.governance.directors.filter(item => item.status === 'DEPARTED' && item.exit && item.exit.reason !== 'REMOVED' && item.endedAtAbsoluteWeek === absoluteWeek).forEach(item => found.push({ kind: 'DIRECTOR_LEFT', key: item.id }));
    /* #217: a term coming up asks you, and asks again near its end; with you off the board, it is not yours to ask */
    const offBoard = platform.leadership.currentCeo.holderType === 'EXECUTIVE' && platform.legacy.founderOfficeRole === 'FOUNDER_EMERITUS';
    if (!offBoard) platform.governance.directors.filter(item => item.status === 'ACTIVE' && item.seatType === 'INDEPENDENT' && item.termEndsAtAbsoluteWeek !== undefined
        && (item.termEndsAtAbsoluteWeek - absoluteWeek === STREAMING_BOARD_RENEW_WEEKS || item.termEndsAtAbsoluteWeek - absoluteWeek === 4))
        .forEach(item => found.push({ kind: 'TERM_ENDING', key: `${item.id}|${item.termEndsAtAbsoluteWeek}|${item.termEndsAtAbsoluteWeek! - absoluteWeek}` }));
    /* #221: the estate: two weeks before a payment the wallet cannot cover, and when shares had to be sold for it */
    const estate = platform.governance.estatePlan;
    if (estate?.lastSold?.atAbsoluteWeek === absoluteWeek) found.push({ kind: 'ESTATE_SOLD', key: String(absoluteWeek) });
    if (estate && estate.nextDueAbsoluteWeek - absoluteWeek === 2 && wallet < estate.quarterly) found.push({ kind: 'ESTATE_SHORT', key: String(estate.nextDueAbsoluteWeek) });
    const chair = platform.leadership.currentCeo.holderType === 'EXECUTIVE';
    const ceoAppointment = chair ? platform.leadership.appointments.find(item => item.executiveId === platform.leadership.currentCeo.executiveId) : null;
    return found
        .filter(item => !chair || (CHAIR_MATTERS.has(item.kind) && (item.kind !== 'NOTICE' || platform.leadership.team?.tray.find(card => card.id === item.cardId)?.appointmentId === ceoAppointment?.id)))
        .sort((left, right) => URGENCY.indexOf(left.kind) - URGENCY.indexOf(right.kind));
};

/** nothing to choose in it: an answer that only closes it, and no page that needs the player now */
const onlyTells = (platform: OwnedStreamingPlatformState, data: StreamingDecisionEventData, view: StreamingDecisionView | null): boolean => {
    if (!view) return false;
    if (data.kind === 'BIDS_IN' || data.kind === 'INVESTORS_IN' || data.kind === 'BOARD_WARNS' || data.kind === 'CEO_LEFT' || data.kind === 'ON_THE_SHELF') return false;
    /* a public company with no director left does need one */
    if (data.kind === 'DIRECTOR_LEFT') return platform.governance.directors.some(item => item.status === 'ACTIVE');
    return !view.answers.some(answer => answer.primary);
};

/** Queues the week's decisions as popups: at most 2 a week, counting incidents; the rest wait on the tray */
export const queueStreamingDecisionEvents = (player: Player, absoluteWeek: number | undefined): Player => {
    if (absoluteWeek === undefined || !player.ownedStreamingPlatform) return player;
    const platform = platformOf(player);
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return player;
    const pending = player.pendingEvents || [];
    const already = new Set(pending.map(event => event.id));
    const taken = pending.filter(event => event.week === player.currentWeek && (event.type === 'STREAMING_INCIDENT' || event.type === 'STREAMING_DECISION')).length;
    const room = Math.max(0, STREAMING_DECISIONS_A_WEEK - taken);
    /* #247: Zeesh (2026-11-05): "jaruri nahi har notification ke liye pop up use kare". What only tells goes to the activity log; a popup is for a decision */
    const fresh = decisionsThisWeek(platform, absoluteWeek, Math.max(0, player.money || 0)).filter(data => !already.has(eventIdOf(data)));
    const told = fresh.filter(data => onlyTells(platform, data, viewOf(player, platform, data, absoluteWeek)));
    const logged = told.reduce<Player>((next, data) => {
        const view = viewOf(player, platform, data, absoluteWeek)!;
        const line = `${view.title}. ${view.detail}`;
        return (next.logs || []).some(log => log.message === line && log.week === next.currentWeek && log.year === next.age) ? next : addActivityLog(next, line, view.urgent ? 'negative' : 'neutral');
    }, player);
    const events: ScheduledEvent[] = fresh
        .filter(data => !told.includes(data))
        .slice(0, room)
        .map(data => ({
            id: eventIdOf(data),
            week: player.currentWeek,
            type: 'STREAMING_DECISION' as const,
            title: viewOf(player, platform, data, absoluteWeek)?.title || 'A decision',
            data: { streamingDecision: data },
        }));
    return events.length ? { ...logged, pendingEvents: [...pending, ...events] } : logged;
};

export interface StreamingDecisionAnswer { id: string; label: string; line?: string; primary?: boolean }
export interface StreamingDecisionView {
    service: string;
    kicker: string;
    title: string;
    detail: string;
    reason: string;
    urgent: boolean;
    answers: StreamingDecisionAnswer[];
    /** the answer that opens a figure: from what they are paid now, what they asked */
    figure: { answerId: string; current: number; asked: number; verb: string } | null;
    door: { room: StreamingDecisionRoom; label: string };
}

const viewOf = (player: Player, platform: OwnedStreamingPlatformState, data: StreamingDecisionEventData, absoluteWeek: number): StreamingDecisionView | null => {
    const service = platform.identity?.name || 'Your service';
    const team: StreamingDecisionRoom = 'TEAM';
    const ownership: StreamingDecisionRoom = 'OWNERSHIP';
    /* #253: a film out of cinemas, only pushed so far; scheduled already, the popup has nothing to ask */
    if (data.kind === 'ON_THE_SHELF') {
        if (!getStreamingTitlePlacement(player, data.key).onShelf) return null;
        const name = resolveStreamingCatalogTitle(player, data.key)?.title || 'Your film';
        return {
            service, kicker: 'Out of cinemas', title: `${name} is on your shelf`, detail: 'Its cinema run is over. It is not live yet. Schedule it in Content.', reason: '', urgent: false, figure: null,
            answers: [{ id: 'OPEN_DOOR', label: 'Schedule it', primary: true }, { id: 'LATER', label: 'Later', line: 'It waits on the shelf' }],
            door: { room: 'SLATE', label: '' },
        };
    }
    if (data.cardId) {
        const card = platform.leadership.team?.tray.find(item => item.id === data.cardId);
        if (!card || card.status !== 'WAITING' || card.expiresAtAbsoluteWeek < absoluteWeek) return null;
        const base = { service, title: card.title, detail: card.detail, reason: card.reason, door: { room: team, label: 'Open TEAM ›' } };
        if (card.action.kind === 'NOTICE') {
            const wants = card.action.wants;
            return {
                ...base, kicker: 'Notice', urgent: true,
                answers: [
                    ...(wants ? [{ id: 'COUNTER', label: `Keep them at ${money(wants)} a week`, line: 'Or set your own figure', primary: true }] : []),
                    { id: 'LET_GO', label: wants ? 'Let them go' : 'Understood', line: 'They work out their notice' },
                ],
                figure: wants ? { answerId: 'COUNTER', current: card.action.weekly, asked: wants, verb: 'Offer' } : null,
            };
        }
        if (card.action.kind === 'POACH_ANSWER') {
            return {
                ...base, kicker: 'A rival called', urgent: true, figure: null,
                answers: [
                    { id: 'MATCH_PACKAGE', label: 'Match the package', primary: true },
                    { id: 'EXPAND_MANDATE', label: 'A bigger role' },
                    { id: 'LET_DEPART', label: 'Let them go' },
                ],
            };
        }
        if (card.action.kind === 'RAISE') {
            const current = Math.round(card.action.weekly / (1 + card.action.percent / 100) / 5_000) * 5_000;
            return {
                ...base, kicker: 'Pay review', urgent: false,
                answers: [
                    { id: 'GIVE', label: `Give +${card.action.percent}%`, line: `${money(card.action.weekly)} a week`, primary: true },
                    { id: 'FIGURE', label: 'Your figure' },
                    { id: 'NO', label: 'No', line: 'It costs 10 loyalty' },
                ],
                figure: { answerId: 'FIGURE', current, asked: card.action.weekly, verb: 'Give' },
            };
        }
        if (card.action.kind === 'OPEN_ROOM') {
            return {
                ...base, kicker: 'The board', urgent: true, figure: null,
                door: { room: team, label: 'Choose someone ›' },
                answers: [{ id: 'STAY', label: 'Stay in charge', line: 'You can choose someone later' }],
            };
        }
        return {
            ...base, kicker: 'Over the limit you set', urgent: false, figure: null,
            answers: [
                { id: 'APPROVE', label: card.cost > 0 ? `Approve ${money(card.cost)}` : 'Approve', primary: true },
                { id: 'NO', label: 'No' },
            ],
        };
    }
    if (data.kind === 'BOARD_MOVED') {
        if (platform.leadership.currentCeo.holderType !== 'EXECUTIVE') return null;
        const terms = getStreamingReturnTerms(platform, getAbsoluteWeek(player.age, player.currentWeek));
        const allowed = terms.by === 'YOURS';
        return {
            service, kicker: 'The board', urgent: true, figure: null,
            title: 'The board has moved you to chair',
            detail: 'Under 51%, it had no confidence in you for 13 weeks. Your successor runs the company now.',
            reason: allowed ? 'At 51% or more, coming back is yours.' : terms.allowed ? 'You can ask the board to have you back, on TEAM.' : terms.line,
            door: { room: team, label: 'Open TEAM ›' },
            answers: [
                ...(allowed ? [{ id: 'COME_BACK', label: 'Come back as CEO', primary: true }] : []),
                { id: 'ACCEPT', label: 'Accept it' },
            ],
        };
    }
    if (data.kind === 'BIDS_IN') {
        const sale = platform.governance.sale;
        if (sale?.status !== 'BIDS' || sale.id !== data.key) return null;
        const best = sale.bids.filter(bid => bid.status === 'OPEN').sort((left, right) => right.price - left.price)[0];
        if (!best) return null;
        return {
            service, kicker: 'The bids are in', urgent: false, figure: null,
            title: `${best.buyerName} bids ${money(best.price)}`,
            detail: `The best of ${sale.bids.length} bids for ${service}. You would get ${money(best.price * platform.founderOwnershipPercent / 100)}.`,
            reason: `They stand ${Math.max(0, (sale.bidsCloseAtAbsoluteWeek || absoluteWeek) - absoluteWeek)} weeks.`,
            door: { room: ownership, label: 'See the bids ›' },
            answers: [{ id: 'LATER', label: 'Later' }],
        };
    }
    if (data.kind === 'STAKE_OFFER') {
        const stake = platform.governance.stakeSale;
        if (stake?.status !== 'OFFER' || stake.price === null) return null;
        return {
            service, kicker: 'A buyer', urgent: false, figure: null,
            title: `${stake.buyerName} offers ${money(stake.price)}`,
            detail: `For ${stake.percent}% of ${service}, your own shares.`,
            reason: `It stands ${Math.max(0, (stake.standsUntilAbsoluteWeek ?? absoluteWeek) - absoluteWeek)} weeks.`,
            door: { room: ownership, label: 'Open OWNERSHIP ›' },
            answers: [{ id: 'SELL', label: 'Sell', primary: true }, { id: 'TURN_DOWN', label: 'Turn it down' }, { id: 'LATER', label: 'Later' }],
        };
    }
    if (data.kind === 'INVESTORS_IN') {
        const round = platform.governance.investorRound;
        if (!round || round.id !== data.key) return null;
        const open = (platform.governance.investorOffers || []).filter(offer => offer.roundId === round.id && offer.expiresAtAbsoluteWeek >= absoluteWeek);
        const best = [...open].sort((left, right) => right.investedCapital - left.investedCapital)[0];
        if (!best) return null;
        return {
            service, kicker: 'Investors', urgent: false, figure: null,
            title: `${open.length} investor${open.length === 1 ? '' : 's'} made an offer`,
            detail: `The largest: ${best.name}, ${money(best.investedCapital)} for ${best.ownershipPercent}%.`,
            reason: 'The term sheets stand 6 weeks.',
            door: { room: ownership, label: 'See the term sheets ›' },
            answers: [{ id: 'LATER', label: 'Later' }],
        };
    }
    if (data.kind === 'ESTATE_SOLD') {
        const sold = platform.governance.estatePlan?.lastSold;
        if (!sold || String(sold.atAbsoluteWeek) !== data.key) return null;
        return {
            service, kicker: 'The estate', urgent: true, figure: null,
            title: `${sold.percent}% of your shares were sold`,
            detail: `Your wallet was ${money(sold.amount)} short of the estate's payment.`,
            reason: `You hold ${Math.round(platform.founderOwnershipPercent * 10) / 10}% now.`,
            door: { room: ownership, label: 'Open OWNERSHIP ›' },
            answers: [{ id: 'LATER', label: 'Understood' }],
        };
    }
    if (data.kind === 'ESTATE_SHORT') {
        const plan = platform.governance.estatePlan;
        if (!plan || String(plan.nextDueAbsoluteWeek) !== data.key || (player.money || 0) >= plan.quarterly) return null;
        return {
            service, kicker: 'The estate', urgent: false, figure: null,
            title: `${money(plan.quarterly)} is due in ${Math.max(0, plan.nextDueAbsoluteWeek - absoluteWeek)} weeks`,
            detail: `Your wallet holds ${money(Math.max(0, player.money || 0))}. If it is short, shares are sold to cover it.`,
            reason: 'A dividend, your salary or selling something can cover it.',
            door: { room: ownership, label: 'Open OWNERSHIP ›' },
            answers: [{ id: 'LATER', label: 'Understood' }],
        };
    }
    if (data.kind === 'TERM_ENDING') {
        const [directorId, termEnd] = data.key.split('|');
        const director = platform.governance.directors.find(item => item.id === directorId && item.status === 'ACTIVE' && String(item.termEndsAtAbsoluteWeek) === termEnd);
        if (!director) return null;
        const weeks = Math.max(0, Number(termEnd) - absoluteWeek);
        const refuses = platform.governance.boardConfidence < 40;
        return {
            service, kicker: 'The board', urgent: false, figure: null,
            title: `${director.name}'s term ends in ${weeks} week${weeks === 1 ? '' : 's'}`,
            detail: refuses ? `They will not stay: board confidence is ${platform.governance.boardConfidence}.` : `Three more years at ${money(director.weeklyCompensation)} a week, or let the term end.`,
            reason: 'No answer, and they go when it ends.',
            door: { room: ownership, label: 'Open OWNERSHIP ›' },
            answers: refuses ? [{ id: 'LATER', label: 'Understood' }] : [{ id: 'RENEW', label: 'Renew for 3 years', primary: true }, { id: 'LET_END', label: 'Let the term end' }],
        };
    }
    if (data.kind === 'DIRECTOR_LEFT') {
        const director = platform.governance.directors.find(item => item.id === data.key);
        if (!director?.exit) return null;
        const protest = director.exit.reason === 'PROTEST';
        return {
            service, kicker: 'The board', urgent: protest, figure: null,
            title: protest ? `${director.name} resigned in protest` : `${director.name} left the board`,
            detail: protest ? `Board confidence is ${platform.governance.boardConfidence}. The news will carry it.` : 'Their term is over.',
            reason: 'A public company needs at least one director.',
            door: { room: ownership, label: 'Find a director ›' },
            answers: [{ id: 'LATER', label: 'Later' }],
        };
    }
    return null;
};

/** What the popup shows, or null when the decision has gone */
export const getStreamingDecisionView = (player: Player, data: StreamingDecisionEventData): StreamingDecisionView | null => {
    const source = player.ownedStreamingPlatform;
    if (!source?.identity) return null;
    return viewOf(player, platformOf(player), data, getAbsoluteWeek(player.age, player.currentWeek));
};

export interface StreamingDecisionResult { player: Player; changed: boolean; message: string }

/** The popup's answer: the same services as the page's own buttons */
export const answerStreamingDecisionEvent = (player: Player, data: StreamingDecisionEventData, answerId: string, figure?: number): StreamingDecisionResult => {
    const settled = (result: { player: Player; changed: boolean; message?: string }, fallback: string): StreamingDecisionResult => ({ player: result.player, changed: result.changed, message: result.message || (result.changed ? fallback : 'That could not be done.') });
    const cardId = data.cardId;
    switch (answerId) {
        case 'COUNTER': case 'FIGURE': case 'GIVE': case 'APPROVE':
            return cardId ? settled(approveStreamingTeamCard(player, cardId, undefined, figure), 'Done.') : { player, changed: false, message: 'That has gone.' };
        case 'MATCH_PACKAGE': case 'EXPAND_MANDATE': case 'LET_DEPART':
            return cardId ? settled(approveStreamingTeamCard(player, cardId, answerId as StreamingRivalResponseId), 'Answered.') : { player, changed: false, message: 'That has gone.' };
        case 'LET_GO': case 'NO': case 'STAY':
            return cardId ? settled(declineStreamingTeamCard(player, cardId), 'Noted.') : { player, changed: false, message: 'That has gone.' };
        case 'COME_BACK':
            return settled(returnAsStreamingCeo(player), 'You are Chief Executive again.');
        case 'RENEW':
            return settled(renewStreamingBoardDirector(player, data.key.split('|')[0]), 'Renewed.');
        case 'LET_END':
            return { player, changed: true, message: 'They go when their term ends.' };
        case 'SELL':
            return settled(acceptStreamingStakeOffer(player), 'Sold.');
        case 'TURN_DOWN':
            return settled(declineStreamingStakeOffer(player), 'Turned down.');
        default:
            return { player, changed: true, message: 'Later.' };
    }
};
