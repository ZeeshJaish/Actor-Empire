/**
 * #164 (plan §21.13, §21.17): "Your team". Executives run jobs for the player, inside limits the player sets, and
 * ask for the rest; the service never runs itself.
 *
 *   - Six seats; each job is Do it, Ask me or Off, and every job starts at Ask me.
 *   - Each week, after the weekly close and the energy refill, each executive proposes up to 1–5 actions (its level):
 *     it does the ones that are Do it and inside its money, its energy and the cash floor; the rest become cards in
 *     the tray (Approve, Change, No), which wait two weeks.
 *   - The team spends the player's own energy, on the same actions at the same prices, never above its allowance.
 *   - The report keeps every action with its reason.
 *   - Hiring takes 15⚡, a level of training 10⚡ + cash + weeks. A rival's call on an executive becomes a card.
 */
import type {
    Gender,
    OwnedStreamingExecutiveAppointment,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingRivalMove,
    OwnedStreamingTeamCard,
    OwnedStreamingTeamReportEntry,
    OwnedStreamingTeamSeat,
    OwnedStreamingTeamState,
    Player,
    StreamingExecutiveExitReason,
    StreamingExecutiveStrategy,
    StreamingRivalResponseId,
    StreamingTeamAction,
    StreamingTeamJobId,
    StreamingTeamJobMode,
    StreamingTeamSeatId,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { getAbsoluteWeek } from '../legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { spendPlayerEnergy } from '../premiumLogic';
import { hireStreamingExecutive, STREAMING_EXECUTIVE_CANDIDATES, type StreamingExecutiveCandidate } from '../streamingCompany';
import { dismissStreamingExecutive, STREAMING_EXECUTIVE_ROLE_LABELS } from '../streamingLeadershipGovernance';
import { respondToStreamingRivalMove, streamingRivalResponseCost } from '../streamingCompetitiveWorld';
import { getStreamingSuccessionCandidates, planStreamingSuccession } from '../streamingLegacy';
import { getIndustryPerson, industryEmployerOf, industryHirers, industryPersonNow, industrySeedOf, moveIndustryPerson, type IndustryGrade, type IndustryPerson } from '../industry/industryPeople';
import { streamingExitRole } from '../streamingPublicMarkets';
import {
    STREAMING_TEAM_LOWER_OFFER,
    grantStreamingTeamOptions,
    refreshStreamingTeamMarket,
    settleDepartedStreamingOptions,
    streamingCandidateAsk,
    streamingCandidateWhere,
    streamingCompanyAppeal,
    streamingLowerOfferChance,
    streamingOptionsVested,
    streamingOfferChance,
    streamingOfferCounter,
    streamingOfferLoyalty,
    streamingOfferRatio,
    streamingTeamCandidateSet,
    streamingTeamCandidatesFor,
    streamingTeamWeeksToNextSet,
    type StreamingCandidateAsk,
    type StreamingHireOffer,
    type StreamingOfferBasis,
} from './teamHiring';
import { getStreamingEquityValuation } from '../streamingPublicMarkets';
import { streamingBoardWeek } from '../streamingBoard';
import { STREAMING_BOARD_PATIENCE_LOW, STREAMING_BOARD_PATIENCE_WEEKS, STREAMING_BOARD_WARN_WEEKS, STREAMING_CONTROL_LINE } from '../streamingControl';
import { stepDownFromStreamingCompany } from '../streamingStepDown';
import { industryCareerOf, type IndustryCareerView } from '../industry/industryCareer';
import {
    STREAMING_TEAM_NOTICE_WEEKS,
    STREAMING_TEAM_SEVERANCE_WEEKS,
    STREAMING_TEAM_UNDERPAID_AT,
    streamingExitBoardMove,
    streamingExitHasCounter,
    streamingExitIsSudden,
    streamingNoticeWords,
    streamingTeamCounterAsk,
    streamingTeamCounterChance,
    streamingTeamMarketPay,
    streamingTeamUnderpaidBy,
    streamingTeamWantsToLeave,
} from './teamExits';
import {
    executeStreamingTeamRaise,
    streamingTeamPayAfterLevel,
    streamingTeamRaiseAsk,
    applyStreamingTeamMoney,
    rollStreamingTeamOutcome,
    shiftStreamingTeamOrder,
    streamingTeamAmbitionActions,
    streamingTeamOutcomeMoney,
    streamingTeamPaddedExpenses,
    streamingTeamRaiseDue,
    streamingTeamStatMeaning,
    type StreamingTeamOutcome,
} from './teamOutcomes';
import {
    STREAMING_TEAM_CARD_WEEKS,
    STREAMING_TEAM_QUIET_WEEKS,
    STREAMING_TEAM_CARDS_PER_SEAT,
    STREAMING_TEAM_HIRE_ENERGY,
    STREAMING_TEAM_REPORT_LIMIT,
    STREAMING_TEAM_SEAT_COPY,
    STREAMING_TEAM_SEAT_ROLES,
    STREAMING_TEAM_SEATS,
    STREAMING_TEAM_TRAY_LIMIT,
    normalizeStreamingTeamState,
    streamingTeamActionsPerWeek,
    streamingTeamJobsForSeat,
    streamingTeamLimitCaps,
    streamingTeamSeatHolders,
    streamingTeamTrainCost,
    type StreamingTeamJobDefinition,
    getStreamingTeamCashFloor,
} from './teamState';
import { STREAMING_TEAM_EXECUTORS, STREAMING_TEAM_RUNNERS, type StreamingTeamProposal } from './teamJobs';

export interface StreamingTeamResult {
    player: Player;
    changed: boolean;
    reason?: 'NO_COMPANY' | 'SEAT_FILLED' | 'SEAT_EMPTY' | 'WRONG_SEAT' | 'ENERGY' | 'TREASURY' | 'MAX_LEVEL' | 'TRAINING'
        | 'NOT_FOUND' | 'NOT_WAITING' | 'FAILED' | 'BAD_MODE'
        /* #180: hiring from the industry */
        | 'NOT_ON_OFFER' | 'REFUSED' | 'COUNTERED' | 'CONTROL';
    message?: string;
    /** a pitch approved: the room to open */
    openRoom?: { room: string; focusId?: string };
}

/* ---------------------------------------------------------------- helpers ---------------------------------------- */

const teamOf = (platform: OwnedStreamingPlatformState): OwnedStreamingTeamState => (
    platform.leadership.team || normalizeStreamingTeamState(null, platform.leadership.delegation)
);

const energyOf = (player: Player): number => Math.max(0, Math.round(player.energy?.current || 0));

const commit = (player: Player, platform: OwnedStreamingPlatformState, team: OwnedStreamingTeamState): Player => ({
    ...player,
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
        ...platform,
        leadership: { ...platform.leadership, team },
    }, player.id),
});

const report = (
    team: OwnedStreamingTeamState,
    entry: Omit<OwnedStreamingTeamReportEntry, 'id'>,
    seed: string,
): OwnedStreamingTeamState => ({
    ...team,
    report: [...team.report, {
        ...entry,
        id: createDeterministicId('streaming_team_report', seed, `${entry.absoluteWeek}:${team.report.length}:${entry.title}`),
    }].slice(-STREAMING_TEAM_REPORT_LIMIT),
});

const withSeat = (team: OwnedStreamingTeamState, seatId: StreamingTeamSeatId, patch: Partial<OwnedStreamingTeamSeat>) => ({
    ...team,
    seats: team.seats.map(seat => (seat.seatId === seatId ? { ...seat, ...patch } : seat)),
});

/** A seat's usage belongs to one week; a new week starts it at zero. */
const freshSeat = (seat: OwnedStreamingTeamSeat, absoluteWeek: number): OwnedStreamingTeamSeat => (
    seat.usageWeek === absoluteWeek ? seat : { ...seat, usageWeek: absoluteWeek, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 }
);

const seatOf = (team: OwnedStreamingTeamState, seatId: StreamingTeamSeatId) => (
    team.seats.find(seat => seat.seatId === seatId) || normalizeStreamingTeamState(null).seats.find(seat => seat.seatId === seatId)!
);

const roleLabel = (appointment: OwnedStreamingExecutiveAppointment) => STREAMING_EXECUTIVE_ROLE_LABELS[appointment.role] || appointment.role;

export const streamingTeamFirstName = (name: string) => name.split(' ')[0] || name;

/** The money no executive may spend below: weeks of the company's running costs (12; a CFO moves it by strategy).
 *  #187: it lives in teamState (the buyback reads it there); it is re-exported here. */
export { getStreamingTeamCashFloor };

/** The chance an executive leaves when a rival's call goes unanswered (the expiry rule in `streamingCompetitiveWorld`). */
export const streamingTeamLeaveChance = (appointment: OwnedStreamingExecutiveAppointment) => (
    Math.max(0, Math.min(1, (132 - (appointment.loyalty + appointment.founderRelationship)) / 35))
);

/* ---------------------------------------------------------------- the reorganisation ----------------------------- */

/**
 * The first time the team runs (or the player acts on it), the roles without a seat move on: a COO beside an
 * International head, the Product head and the Advertising head (plan §21.17 #164). Their salaries stop.
 */
const reorganize = (player: Player, absoluteWeek: number): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    let team = teamOf(platform);
    if (team.reorganizedAtAbsoluteWeek !== null) return player;
    const { leftovers } = streamingTeamSeatHolders(platform.leadership.appointments);
    const ledger: OwnedStreamingLedgerEntry[] = [];
    leftovers.forEach(appointment => {
        const idempotencyKey = `team-reorganized:${appointment.id}`;
        ledger.push({
            id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
            idempotencyKey,
            absoluteWeek,
            type: 'EXECUTIVE_DEPARTED',
            summary: `${appointment.nameAtAppointment} moved on as the team was reorganised.`,
            source: 'WEEK_PROCESSOR',
            metadata: { executiveId: appointment.executiveId, role: appointment.role },
        });
        team = report(team, {
            absoluteWeek, seatId: null, appointmentId: appointment.id, jobId: 'TEAM', kind: 'NOTE',
            title: `${appointment.nameAtAppointment} moved on`,
            detail: `${roleLabel(appointment)} has no seat on the new team; the ${money(appointment.weeklyCompensation)} weekly salary stops.`,
            cost: 0, energy: 0,
        }, platform.simulationSeed);
    });
    const leftIds = new Set(leftovers.map(item => item.id));
    const nextPlatform: OwnedStreamingPlatformState = {
        ...platform,
        leadership: {
            ...platform.leadership,
            appointments: platform.leadership.appointments.map(item => (leftIds.has(item.id)
                ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek }
                : item)),
        },
        eventLedger: [...platform.eventLedger, ...ledger],
    };
    return commit(player, nextPlatform, { ...team, reorganizedAtAbsoluteWeek: absoluteWeek });
};

const money = (value: number) => {
    const abs = Math.abs(value);
    const text = abs >= 1e9 ? `$${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B`
        : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M`
            : abs >= 1e3 ? `$${Math.round(abs / 1e3)}K` : `$${Math.round(abs)}`;
    return value < 0 ? `−${text}` : text;
};

/* ---------------------------------------------------------------- settings --------------------------------------- */

const jobDefinition = (jobId: StreamingTeamJobId): StreamingTeamJobDefinition | undefined => (
    STREAMING_TEAM_SEATS.flatMap(streamingTeamJobsForSeat).find(job => job.id === jobId)
);

export const setStreamingTeamJobMode = (
    player: Player,
    seatId: StreamingTeamSeatId,
    jobId: StreamingTeamJobId,
    mode: StreamingTeamJobMode,
): StreamingTeamResult => {
    const definition = jobDefinition(jobId);
    if (!definition || definition.seatId !== seatId) return { player, changed: false, reason: 'WRONG_SEAT' };
    if (!definition.modes.includes(mode)) return { player, changed: false, reason: 'BAD_MODE' };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const team = teamOf(platform);
    const seat = seatOf(team, seatId);
    if (seat.jobs[jobId] === mode) return { player, changed: false };
    return { player: commit(player, platform, withSeat(team, seatId, { jobs: { ...seat.jobs, [jobId]: mode } })), changed: true };
};

export const setStreamingTeamLimits = (
    player: Player,
    seatId: StreamingTeamSeatId,
    patch: Partial<Pick<OwnedStreamingTeamSeat, 'weeklyMoney' | 'actionMoney' | 'weeklyEnergy'>>,
): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const team = teamOf(platform);
    const holder = streamingTeamSeatHolders(platform.leadership.appointments).holders.get(seatId);
    const caps = streamingTeamLimitCaps(seatId, holder?.level || 1);
    const seat = seatOf(team, seatId);
    const clampTo = (value: number | undefined, current: number, max: number) => (
        value === undefined || !Number.isFinite(value) ? current : Math.max(0, Math.min(max, Math.round(value)))
    );
    const weeklyMoney = clampTo(patch.weeklyMoney, seat.weeklyMoney, caps.weeklyMoney);
    const next = {
        weeklyMoney,
        actionMoney: Math.min(weeklyMoney, clampTo(patch.actionMoney, seat.actionMoney, caps.actionMoney)),
        weeklyEnergy: clampTo(patch.weeklyEnergy, seat.weeklyEnergy, caps.weeklyEnergy),
    };
    if (next.weeklyMoney === seat.weeklyMoney && next.actionMoney === seat.actionMoney && next.weeklyEnergy === seat.weeklyEnergy) {
        return { player, changed: false };
    }
    return { player: commit(player, platform, withSeat(team, seatId, next)), changed: true };
};

/* ---------------------------------------------------------------- people ----------------------------------------- */

/** #180: a person on offer for an empty chair, with their own package and the lower offer's odds */
export interface StreamingTeamCandidate {
    id: string;
    name: string;
    initials: string;
    gender: Gender;
    roleLabel: string;
    grade: IndustryGrade;
    skill: number;
    loyalty: number;
    ambition: number;
    ethics: number;
    yearsExperience: number;
    specialty: string;
    style: string;
    strength: string;
    caution: string;
    formerCompany: string;
    preferredStrategy: StreamingExecutiveStrategy;
    /** where they work now ("At Netflix", "Between roles") */
    where: string;
    ask: StreamingCandidateAsk;
    /** 15% less of everything, and the chance they say yes */
    lower: { weekly: number; signing: number; optionsPercent: number; chance: number };
    /** #198: what your own offer is read against */
    offerBasis: StreamingOfferBasis;
    /** #198: the counter they made to your offer this set */
    counter: StreamingHireOffer | null;
    /** why the ask is what it is */
    why: string;
    /** #199: where they have worked */
    career: IndustryCareerView;
    /** #183: what their stats would do at our table */
    meaning: { skill: string; loyalty: string; ambition: string; ethics: string };
}

const candidateView = (player: Player, platform: OwnedStreamingPlatformState, person: IndustryPerson): StreamingTeamCandidate => {
    const ask = streamingCandidateAsk(player, platform, person);
    const { appeal } = streamingCompanyAppeal(platform);
    const employer = industryEmployerOf(player, person);
    const company = platform.identity?.name || 'your service';
    const pull = Math.round((appeal - 1) * 45);
    return {
        id: person.id, name: person.name, initials: initialsOf(person.name), gender: person.gender, roleLabel: person.roleLabel, grade: person.grade,
        skill: person.skill, loyalty: person.loyalty, ambition: person.ambition, ethics: person.ethics, yearsExperience: person.yearsExperience,
        specialty: person.specialty, style: person.style, strength: person.strength, caution: person.caution, formerCompany: person.formerCompany,
        preferredStrategy: person.preferredStrategy, where: streamingCandidateWhere(employer), ask,
        lower: {
            weekly: Math.round(ask.weekly * STREAMING_TEAM_LOWER_OFFER / 5_000) * 5_000,
            signing: Math.round(ask.signing * STREAMING_TEAM_LOWER_OFFER / 50_000) * 50_000,
            optionsPercent: Math.max(0.05, Math.round(ask.optionsPercent * STREAMING_TEAM_LOWER_OFFER * 20) / 20),
            chance: streamingLowerOfferChance(person, appeal),
        },
        offerBasis: {
            ask: { weekly: ask.weekly, signing: ask.signing, optionsPercent: ask.optionsPercent },
            companyValue: getStreamingEquityValuation(platform),
            ambition: person.ambition,
            lowerChance: streamingLowerOfferChance(person, appeal),
        },
        counter: (() => {
            const counter = teamOf(platform).market?.counters?.[person.id];
            return counter && counter.set === streamingTeamCandidateSet(getAbsoluteWeek(player.age, player.currentWeek))
                ? { weekly: counter.weekly, signing: counter.signing, optionsPercent: counter.optionsPercent } : null;
        })(),
        meaning: streamingTeamStatMeaning(person),
        career: industryCareerOf(player, getIndustryPerson(player, person.id) || person),
        why: [
            ask.poached ? `Leaving ${employer.name}: +15%.` : null,
            pull > 0 ? `${company} is a name people want on their CV: ${pull}% less.` : pull < 0 ? `${company} looks a risk: ${-pull}% more.` : null,
        ].filter(Boolean).join(' ') || 'Their market pay.',
    };
};

/** #180: an empty chair's three people, a fresh set every 3 weeks (see teamHiring.ts) */
export const getStreamingTeamCandidates = (player: Player, seatId: StreamingTeamSeatId): StreamingTeamCandidate[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return streamingTeamCandidatesFor(player, platform, teamOf(platform), seatId).map(person => candidateView(player, platform, person));
};

/**
 * #180: hire at their ask, or (#198) make your own offer. An offer under their ask is answered once per person and set
 * (the roll is set; asking again changes nothing); a no comes with one counter, and the energy is spent then; under 60%
 * of their ask they are gone for the set. A hire pays the signing bonus from the treasury and grants the options (every
 * holder diluted; never under the founder's 51%).
 */
export const hireStreamingTeamCandidate = (player: Player, seatId: StreamingTeamSeatId, candidateId: string, offer: 'ASK' | 'COUNTER' | StreamingHireOffer = 'ASK'): StreamingTeamResult => {
    if (!player.ownedStreamingPlatform?.identity) return { player, changed: false, reason: 'NO_COMPANY' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const organized = reorganize(player, absoluteWeek);
    const platform = normalizeOwnedStreamingPlatformState(organized.ownedStreamingPlatform, organized.id);
    if (streamingTeamSeatHolders(platform.leadership.appointments).holders.has(seatId)) {
        return { player, changed: false, reason: 'SEAT_FILLED', message: 'That seat is already filled.' };
    }
    const team = teamOf(platform);
    const person = streamingTeamCandidatesFor(organized, platform, team, seatId).find(item => item.id === candidateId);
    if (!person || !person.role || person.role === 'CEO') return { player, changed: false, reason: 'NOT_ON_OFFER', message: 'They are not on offer any more.' };
    const view = candidateView(organized, platform, person);
    const set = streamingTeamCandidateSet(absoluteWeek);
    const first = person.name.split(' ')[0];
    const counter = offer === 'COUNTER' ? view.counter : null;
    if (offer === 'COUNTER' && !counter) return { player, changed: false, reason: 'NOT_ON_OFFER', message: 'There is no counter to take.' };
    /* the energy went on the offer that drew the counter */
    if (!counter && energyOf(organized) < STREAMING_TEAM_HIRE_ENERGY) {
        return { player, changed: false, reason: 'ENERGY', message: `Hiring takes ${STREAMING_TEAM_HIRE_ENERGY}⚡.` };
    }
    const custom: StreamingHireOffer | null = typeof offer === 'object' ? {
        weekly: Math.max(5_000, Math.round(offer.weekly / 5_000) * 5_000),
        signing: Math.max(0, Math.round(offer.signing / 50_000) * 50_000),
        optionsPercent: Math.max(0, Math.round(offer.optionsPercent * 20) / 20),
    } : null;
    if (custom && streamingOfferRatio(view.offerBasis, custom) < 1) {
        const yes = createDeterministicRng(`${industrySeedOf(organized)}:lower-offer:${person.id}:${set}`)() < streamingOfferChance(view.offerBasis, custom);
        if (!yes) {
            const next: Player = { ...organized, energy: { ...organized.energy }, flags: { ...organized.flags } };
            spendPlayerEnergy(next, STREAMING_TEAM_HIRE_ENERGY, `Team: an offer to ${person.name}`);
            const nextPlatform = normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, next.id);
            const market = team.market && team.market.set === set ? team.market : { set, shown: {}, seen: team.market?.seen || {}, refused: {} };
            const talks = streamingOfferChance(view.offerBasis, custom) > 0;
            const weeks = streamingTeamWeeksToNextSet(absoluteWeek);
            const counterOffer = streamingOfferCounter(view.offerBasis.ask, custom);
            const nextMarket = talks
                ? { ...market, counters: { ...(market.counters || {}), [person.id]: { set, ...counterOffer } } }
                : { ...market, refused: { ...market.refused, [person.id]: set } };
            const answered = report({ ...teamOf(nextPlatform), market: nextMarket }, {
                absoluteWeek, seatId, appointmentId: null, jobId: 'TEAM', kind: 'NOTE',
                title: talks ? `${person.name} made a counter` : `${person.name} would not talk`,
                detail: talks
                    ? `${first} would take ${money(counterOffer.weekly)} a week, ${money(counterOffer.signing)} to sign and ${counterOffer.optionsPercent}% in options.`
                    : `${first} wanted ${money(view.ask.weekly)} a week. New people in ${weeks} week${weeks === 1 ? '' : 's'}.`,
                cost: 0, energy: STREAMING_TEAM_HIRE_ENERGY,
            }, nextPlatform.simulationSeed);
            return {
                player: commit(next, nextPlatform, answered), changed: true, reason: talks ? 'COUNTERED' : 'REFUSED',
                message: talks ? `${first} said no, and would take ${money(counterOffer.weekly)} a week.` : `${first} would not talk at that price.`,
            };
        }
    }
    const chosen: StreamingHireOffer = counter || custom || view.offerBasis.ask;
    const terms = { weekly: chosen.weekly, signing: chosen.signing, options: chosen.optionsPercent };
    /* better than they asked buys loyalty */
    const bonusLoyalty = streamingOfferLoyalty(view.offerBasis, chosen);
    if (platform.treasuryCash < terms.signing) return { player, changed: false, reason: 'TREASURY', message: `The signing bonus is ${money(terms.signing)}.` };
    /* #204: only someone who holds 51% has the line to keep */
    if (platform.founderOwnershipPercent >= 51 && platform.founderOwnershipPercent * (1 - terms.options / 100) < 51) {
        return { player, changed: false, reason: 'CONTROL', message: 'Their options would take you under 51%.' };
    }
    const candidate: StreamingExecutiveCandidate = {
        id: person.id, name: person.name, role: person.role, roleLabel: person.roleLabel, initials: initialsOf(person.name), gender: person.gender,
        formerCompany: person.formerCompany, yearsExperience: person.yearsExperience, specialty: person.specialty, style: person.style,
        strength: person.strength, caution: person.caution, weeklyCompensation: terms.weekly, skill: person.skill, loyalty: Math.min(100, person.loyalty + bonusLoyalty),
        ambition: person.ambition, ethics: person.ethics, preferredStrategy: person.preferredStrategy,
    };
    const hired = hireStreamingExecutive(organized, person.id, `team:${seatId}:${person.id}:${absoluteWeek}`, { candidate, signingBonus: terms.signing });
    if (!hired.changed || !hired.appointment) return { player, changed: false, reason: 'FAILED', message: 'That hire could not be completed.' };
    const next: Player = { ...hired.player, energy: { ...hired.player.energy }, flags: { ...hired.player.flags } };
    if (!counter) spendPlayerEnergy(next, STREAMING_TEAM_HIRE_ENERGY, `Team: hired ${person.name}`);
    let nextPlatform = normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, next.id);
    if (terms.options > 0) {
        nextPlatform = grantStreamingTeamOptions(nextPlatform, terms.options, absoluteWeek);
        nextPlatform = {
            ...nextPlatform,
            leadership: {
                ...nextPlatform.leadership,
                appointments: nextPlatform.leadership.appointments.map(item => (item.id === hired.appointment!.id
                    ? { ...item, options: { percent: terms.options, grantedAtAbsoluteWeek: absoluteWeek } } : item)),
            },
        };
    }
    const hiredTeam = report(teamOf(nextPlatform), {
        absoluteWeek, seatId, appointmentId: hired.appointment.id, jobId: 'TEAM', kind: 'NOTE',
        title: `${person.name} took the ${STREAMING_TEAM_SEAT_COPY[seatId].label} chair`,
        detail: `${money(terms.weekly)} a week · ${money(terms.signing)} to sign · ${terms.options}% in options · every job starts at Ask me.`,
        cost: terms.signing, energy: counter ? 0 : STREAMING_TEAM_HIRE_ENERGY,
    }, nextPlatform.simulationSeed);
    return {
        player: commit(next, nextPlatform, hiredTeam), changed: true,
        message: counter ? `${first} signed at the counter.` : custom ? (bonusLoyalty > 0 ? `${first} signed, and is glad of it: loyalty +${bonusLoyalty}.` : `${first} took your offer.`) : undefined,
    };
};

export const trainStreamingTeamExecutive = (player: Player, seatId: StreamingTeamSeatId): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const holder = streamingTeamSeatHolders(platform.leadership.appointments).holders.get(seatId);
    if (!holder) return { player, changed: false, reason: 'SEAT_EMPTY' };
    if (holder.level >= 5) return { player, changed: false, reason: 'MAX_LEVEL', message: 'Already at the top level.' };
    if (platform.leadership.developmentPrograms.some(item => item.executiveId === holder.executiveId && item.status === 'IN_PROGRESS')) {
        return { player, changed: false, reason: 'TRAINING', message: 'Already in training.' };
    }
    const cost = streamingTeamTrainCost(holder.level);
    if (platform.treasuryCash < cost.cash) return { player, changed: false, reason: 'TREASURY', message: `Training costs ${money(cost.cash)}.` };
    if (energyOf(player) < cost.energy) return { player, changed: false, reason: 'ENERGY', message: `Training takes ${cost.energy}⚡.` };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `executive-development:${holder.executiveId}:LEVEL_UP:${absoluteWeek}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'EXECUTIVE_DEVELOPMENT_STARTED',
        summary: `${holder.nameAtAppointment} started training for level ${holder.level + 1}.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId: holder.executiveId, track: 'LEVEL_UP', capitalCost: cost.cash, readyAtAbsoluteWeek: absoluteWeek + cost.weeks },
    };
    const trained: OwnedStreamingPlatformState = {
        ...platform,
        treasuryCash: platform.treasuryCash - cost.cash,
        leadership: {
            ...platform.leadership,
            developmentPrograms: [...platform.leadership.developmentPrograms, {
                id: createDeterministicId('streaming_exec_development', platform.simulationSeed, idempotencyKey),
                idempotencyKey,
                executiveId: holder.executiveId,
                track: 'LEVEL_UP',
                status: 'IN_PROGRESS',
                capitalCost: cost.cash,
                developmentWeeks: cost.weeks,
                startedAtAbsoluteWeek: absoluteWeek,
                readyAtAbsoluteWeek: absoluteWeek + cost.weeks,
                completedAtAbsoluteWeek: null,
            }],
        },
        eventLedger: [...platform.eventLedger, ledger],
    };
    const team = report(teamOf(trained), {
        absoluteWeek, seatId, appointmentId: holder.id, jobId: 'TEAM', kind: 'NOTE',
        title: `${holder.nameAtAppointment} started training`,
        detail: `Level ${holder.level + 1} in ${cost.weeks} weeks · ${money(cost.cash)}.`,
        cost: cost.cash, energy: cost.energy,
    }, platform.simulationSeed);
    const next = commit({ ...player, energy: { ...player.energy }, flags: { ...player.flags } }, trained, team);
    spendPlayerEnergy(next, cost.energy, `Team: training ${holder.nameAtAppointment}`);
    return { player: next, changed: true };
};

export const dismissStreamingTeamExecutive = (player: Player, seatId: StreamingTeamSeatId): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const holder = streamingTeamSeatHolders(platform.leadership.appointments).holders.get(seatId);
    if (!holder) return { player, changed: false, reason: 'SEAT_EMPTY' };
    /* #200: letting someone go costs a quarter's pay */
    const severance = holder.weeklyCompensation * STREAMING_TEAM_SEVERANCE_WEEKS;
    if (platform.treasuryCash < severance) return { player, changed: false, reason: 'TREASURY', message: `Severance is ${money(severance)}, more than the treasury holds.` };
    const dismissed = dismissStreamingExecutive(player, holder.executiveId);
    if (!dismissed.changed) return { player, changed: false, reason: 'FAILED' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = applyStreamingTeamMoney(
        normalizeOwnedStreamingPlatformState(dismissed.player.ownedStreamingPlatform, dismissed.player.id),
        `severance:${holder.id}`, -severance, absoluteWeek, `Severance for ${holder.nameAtAppointment}.`,
    );
    let team = teamOf(nextPlatform);
    /* their waiting cards go with them */
    team = { ...team, tray: team.tray.map(card => (card.appointmentId === holder.id && card.status === 'WAITING'
        ? { ...card, status: 'EXPIRED' as const, resolvedAtAbsoluteWeek: absoluteWeek } : card)) };
    team = report(team, {
        absoluteWeek, seatId, appointmentId: holder.id, jobId: 'TEAM', kind: 'NOTE',
        title: `${holder.nameAtAppointment} was let go`, detail: `${money(severance)} in severance. The ${STREAMING_TEAM_SEAT_COPY[seatId].label} seat is empty; its jobs are yours again.`,
        cost: severance, energy: 0,
    }, nextPlatform.simulationSeed);
    return { player: commit(dismissed.player, nextPlatform, team), changed: true };
};

/** #198: you walk away from their counter: they are gone for the set */
export const walkAwayFromStreamingCandidate = (player: Player, candidateId: string): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const team = teamOf(platform);
    if (!team.market) return { player, changed: false, reason: 'NOT_ON_OFFER' };
    const set = streamingTeamCandidateSet(getAbsoluteWeek(player.age, player.currentWeek));
    const { [candidateId]: gone, ...counters } = team.market.counters || {};
    if (!gone) return { player, changed: false, reason: 'NOT_ON_OFFER' };
    return { player: commit(player, platform, { ...team, market: { ...team.market, counters, refused: { ...team.market.refused, [candidateId]: set } } }), changed: true };
};

/* ---------------------------------------------------------------- the tray --------------------------------------- */

const runAction = (player: Player, card: Pick<OwnedStreamingTeamCard, 'action'>, absoluteWeek: number, executiveName: string) => {
    const executor = STREAMING_TEAM_EXECUTORS[card.action.kind];
    if (!executor) return { player, changed: false, reason: 'No one can carry that out yet.' };
    return executor(player, card.action, { absoluteWeek, executiveName });
};

/**
 * #181: how a job with money in it turned out, by the executive's skill: the money comes back or is spent on top, and
 * a network order is brought forward or pushed back a week. A job that spent nothing has nothing to settle.
 */
const settleStreamingTeamJob = (
    platform: OwnedStreamingPlatformState,
    executive: OwnedStreamingExecutiveAppointment,
    job: { dedupeKey: string; title: string; action: StreamingTeamAction },
    absoluteWeek: number,
    spent: number,
): { platform: OwnedStreamingPlatformState; outcome?: StreamingTeamOutcome; delta: number; words: string } => {
    if (spent <= 0 && job.action.kind !== 'NETWORK_ORDER') return { platform, delta: 0, words: '' };
    const key = `${executive.id}:${job.dedupeKey}:${absoluteWeek}`;
    const outcome = rollStreamingTeamOutcome(platform.simulationSeed, executive.id, `${job.dedupeKey}:${absoluteWeek}`, executive.skill);
    const money181 = streamingTeamOutcomeMoney(outcome, executive.skill, spent);
    let next = applyStreamingTeamMoney(platform, key, money181.delta, absoluteWeek, `${executive.nameAtAppointment}: ${job.title}. ${money181.words}`);
    let words = money181.words;
    if (job.action.kind === 'NETWORK_ORDER') {
        const shifted = shiftStreamingTeamOrder(next, executive.nameAtAppointment, absoluteWeek, outcome);
        if (shifted !== next) words = `${words} ${outcome === 'GREAT' ? 'Ready a week early.' : 'Ready a week late.'}`;
        next = shifted;
    }
    return { platform: next, outcome, delta: money181.delta, words };
};

const resolveCard = (team: OwnedStreamingTeamState, cardId: string, status: OwnedStreamingTeamCard['status'], absoluteWeek: number) => ({
    ...team,
    tray: team.tray.map(card => (card.id === cardId ? { ...card, status, resolvedAtAbsoluteWeek: absoluteWeek } : card)),
});

/** Approve does what the player's own button does, at the same price and energy; #181: the executive who carries it out lands it under or over budget. A rival call needs an answer. */
export const approveStreamingTeamCard = (
    player: Player,
    cardId: string,
    answer?: StreamingRivalResponseId,
    /** #197: a raise answered with your own figure, a week */
    givenWeekly?: number,
): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const card = teamOf(platform).tray.find(item => item.id === cardId);
    if (!card) return { player, changed: false, reason: 'NOT_FOUND' };
    if (card.status !== 'WAITING') return { player, changed: false, reason: 'NOT_WAITING' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const appointment = platform.leadership.appointments.find(item => item.id === card.appointmentId);
    const name = appointment?.nameAtAppointment || 'Your team';
    if (card.energy > energyOf(player)) return { player, changed: false, reason: 'ENERGY', message: `This needs ${card.energy}⚡.` };
    if (card.cost > platform.treasuryCash) return { player, changed: false, reason: 'TREASURY', message: `The treasury cannot cover ${money(card.cost)}.` };
    let result: { player: Player; changed: boolean; reason?: string };
    if (card.action.kind === 'POACH_ANSWER') {
        if (!answer) return { player, changed: false, reason: 'FAILED', message: 'Choose an answer.' };
        const responded = respondToStreamingRivalMove(player, card.action.moveId, answer);
        result = { player: responded.player, changed: responded.changed, reason: responded.reason };
    } else if (card.action.kind === 'RAISE') {
        result = executeStreamingTeamRaise(player, card.action, givenWeekly);
    } else if (card.action.kind === 'NOTICE') {
        /* #200: your figure against what would keep them */
        const held = platform.leadership.appointments.find(item => item.id === card.appointmentId && item.status === 'ACTIVE');
        const wants = card.action.wants;
        if (!held?.notice || !wants) return { player, changed: false, reason: 'FAILED', message: 'Nothing would change their mind.' };
        const given = Math.max(held.weeklyCompensation, givenWeekly ?? wants);
        const stays = createDeterministicRng(`${platform.simulationSeed}:counter:${held.id}:${held.notice.givenAtAbsoluteWeek}`)() < streamingTeamCounterChance(given, wants) || given >= wants;
        const first = streamingTeamFirstName(held.nameAtAppointment);
        if (!stays) {
            const left = resolveCard(teamOf(platform), card.id, 'DECLINED', absoluteWeek);
            const noted = report(left, {
                absoluteWeek, seatId: card.seatId, appointmentId: held.id, jobId: 'NOTICE', kind: 'NOTE',
                title: `${first} turned down ${money(given)}`, detail: `${first} wanted ${money(wants)} and is still leaving.`, cost: 0, energy: 0,
            }, platform.simulationSeed);
            return { player: commit(player, platform, noted), changed: true, message: `${first} wanted ${money(wants)} and is still leaving.` };
        }
        const kept: OwnedStreamingPlatformState = {
            ...platform,
            leadership: {
                ...platform.leadership,
                appointments: platform.leadership.appointments.map(item => {
                    if (item.id !== held.id) return item;
                    const { notice: _notice, ...rest } = item;
                    return { ...rest, weeklyCompensation: given, loyalty: Math.min(100, item.loyalty + 5) };
                }),
            },
        };
        const stayed = report(resolveCard(teamOf(kept), card.id, 'APPROVED', absoluteWeek), {
            absoluteWeek, seatId: card.seatId, appointmentId: held.id, jobId: 'NOTICE', kind: 'APPROVED',
            title: `${first} stays`, detail: `You kept ${first} at ${money(given)} a week.`, cost: 0, energy: 0,
        }, kept.simulationSeed);
        return { player: commit(player, kept, stayed), changed: true, message: `${first} stays at ${money(given)} a week.` };
    } else {
        result = runAction(player, card, absoluteWeek, name);
    }
    if (!result.changed) return { player, changed: false, reason: 'FAILED', message: result.reason || 'That could not be done.' };
    const before = { cash: platform.treasuryCash, energy: energyOf(player) };
    let nextPlatform = normalizeOwnedStreamingPlatformState(result.player.ownedStreamingPlatform, result.player.id);
    /* #181: a job the executive carries out turns out by their skill, approved or not (a rival's call and a raise are answers, not jobs) */
    let outcome: StreamingTeamOutcome | undefined;
    let outcomeWords = '';
    if (appointment && card.jobId !== 'RIVAL_CALL' && card.jobId !== 'RAISE') {
        const settled = settleStreamingTeamJob(nextPlatform, appointment, card, absoluteWeek, Math.max(0, before.cash - nextPlatform.treasuryCash));
        ({ outcome } = settled);
        outcomeWords = settled.words;
        nextPlatform = settled.platform;
    }
    let team = resolveCard(teamOf(nextPlatform), card.id, 'APPROVED', absoluteWeek);
    team = report(team, {
        absoluteWeek, seatId: card.seatId, appointmentId: card.appointmentId, jobId: card.jobId, kind: 'APPROVED',
        title: card.action.kind === 'POACH_ANSWER' ? `${card.title}: ${answerLabel(answer!)}` : card.title,
        detail: outcomeWords ? `Approved by you. ${outcomeWords}` : card.action.kind === 'RAISE' && givenWeekly ? `You gave ${money(givenWeekly)} a week.` : 'Approved by you.',
        cost: Math.max(0, before.cash - nextPlatform.treasuryCash), energy: Math.max(0, before.energy - energyOf(result.player)),
        ...(outcome ? { outcome } : {}),
    }, nextPlatform.simulationSeed);
    return {
        player: commit(result.player, nextPlatform, team),
        changed: true,
        openRoom: card.action.kind === 'OPEN_ROOM' ? { room: card.action.room, focusId: card.action.focusId }
            : card.action.kind === 'ORIGINAL_PITCH' ? { room: 'PITCH' } : undefined,
    };
};

export const declineStreamingTeamCard = (player: Player, cardId: string): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const card = teamOf(platform).tray.find(item => item.id === cardId);
    if (!card) return { player, changed: false, reason: 'NOT_FOUND' };
    if (card.status !== 'WAITING') return { player, changed: false, reason: 'NOT_WAITING' };
    if (card.action.kind === 'POACH_ANSWER') return approveStreamingTeamCard(player, cardId, 'LET_DEPART');
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    /* #181: a raise refused costs their loyalty */
    const refusedRaise = card.action.kind === 'RAISE';
    const settledPlatform: OwnedStreamingPlatformState = refusedRaise ? {
        ...platform,
        leadership: {
            ...platform.leadership,
            appointments: platform.leadership.appointments.map(item => (item.id === card.appointmentId ? { ...item, loyalty: Math.max(0, item.loyalty - 10) } : item)),
        },
    } : platform;
    let team = resolveCard(teamOf(settledPlatform), cardId, 'DECLINED', absoluteWeek);
    team = report(team, {
        absoluteWeek, seatId: card.seatId, appointmentId: card.appointmentId, jobId: card.jobId, kind: 'DECLINED',
        title: card.title, detail: card.action.kind === 'NOTICE' ? 'You let them go. They work out their notice.' : refusedRaise ? 'You said no. Their loyalty fell by 10.' : 'You said no.', cost: 0, energy: 0,
    }, settledPlatform.simulationSeed);
    return { player: commit(player, settledPlatform, team), changed: true };
};

const answerLabel = (answer: StreamingRivalResponseId) => (
    answer === 'MATCH_PACKAGE' ? 'matched the package' : answer === 'EXPAND_MANDATE' ? 'a bigger role' : answer === 'LET_DEPART' ? 'let go' : answer.toLowerCase().replaceAll('_', ' ')
);

/* ---------------------------------------------------------------- the weekly run --------------------------------- */

/*
 * #205: under 51%, you run the company for as long as the board lets you. Under 40 confidence for 13 weeks, it moves you
 * to chair and your named successor (or the best of the team) takes over; at 8 weeks it warns you.
 */
const boardPatienceWeek = (player: Player, absoluteWeek: number): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const founderRuns = platform.leadership.currentCeo.holderType !== 'EXECUTIVE';
    const low = founderRuns && platform.founderOwnershipPercent < STREAMING_CONTROL_LINE && platform.governance.boardConfidence < STREAMING_BOARD_PATIENCE_LOW;
    if (!low) {
        if (platform.governance.boardLowSinceAbsoluteWeek === undefined || platform.governance.boardLowSinceAbsoluteWeek === null) return player;
        return { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, governance: { ...platform.governance, boardLowSinceAbsoluteWeek: null } }, player.id) };
    }
    const since = platform.governance.boardLowSinceAbsoluteWeek ?? absoluteWeek;
    const weeks = absoluteWeek - since;
    let team = teamOf(platform);
    if (weeks >= STREAMING_BOARD_PATIENCE_WEEKS) {
        const { holders } = streamingTeamSeatHolders(platform.leadership.appointments);
        const plan = platform.legacy.successionPlan;
        const planned = plan?.candidateType === 'EXECUTIVE' && platform.leadership.appointments.some(item => item.executiveId === plan.candidateId && item.status === 'ACTIVE');
        const best = [...holders.values()].sort((left, right) => right.skill - left.skill)[0];
        if (planned || best) {
            const named = planned ? player : planStreamingSuccession(player, 'EXECUTIVE', best.executiveId, platform.legacy.currentMandate).player;
            const moved = stepDownFromStreamingCompany(named, 'EXECUTIVE_CHAIR');
            if (moved.changed) {
                const after = normalizeOwnedStreamingPlatformState(moved.player.ownedStreamingPlatform, moved.player.id);
                const key = `streaming-board-moved-founder:${absoluteWeek}`;
                const fact: OwnedStreamingLedgerEntry = {
                    id: createDeterministicId('streaming_event', after.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'FOUNDER_ROLE_CHANGED',
                    summary: `The board moved ${player.name} to chair after ${weeks} weeks without its confidence.`,
                    source: 'PLAYER_ACTION',
                    metadata: { kind: 'BOARD_MOVED' },
                };
                const movedTeam = report(teamOf(after), {
                    absoluteWeek, seatId: null, appointmentId: null, jobId: 'TEAM', kind: 'NOTE',
                    title: 'The board has moved you to chair', detail: `Under 51%, it had ${weeks} weeks without confidence in you. Come back on TEAM, from 60 confidence.`, cost: 0, energy: 0,
                }, after.simulationSeed);
                return commit(moved.player, { ...after, governance: { ...after.governance, boardLowSinceAbsoluteWeek: null }, eventLedger: [...after.eventLedger, fact] }, movedTeam);
            }
        }
    }
    if (weeks === STREAMING_BOARD_WARN_WEEKS) {
        const dedupeKey = `board-warning:${since}`;
        const card: OwnedStreamingTeamCard = {
            id: createDeterministicId('streaming_team_card', platform.simulationSeed, dedupeKey),
            dedupeKey,
            seatId: 'MONEY',
            jobId: 'NOTICE',
            appointmentId: '',
            createdAtAbsoluteWeek: absoluteWeek,
            expiresAtAbsoluteWeek: absoluteWeek + STREAMING_BOARD_PATIENCE_WEEKS - STREAMING_BOARD_WARN_WEEKS,
            title: 'The board is losing patience',
            detail: `Confidence has been ${platform.governance.boardConfidence} for ${weeks} weeks. Under 51%, at 13 weeks it moves you to chair.`,
            reason: 'Choose who should take over, or win the board back.',
            cost: 0,
            energy: 0,
            action: { kind: 'OPEN_ROOM', room: 'SUCCESSION' },
            status: 'WAITING',
            resolvedAtAbsoluteWeek: null,
        };
        team = { ...team, tray: [...team.tray, card].slice(-STREAMING_TEAM_TRAY_LIMIT) };
    }
    return commit(player, { ...platform, governance: { ...platform.governance, boardLowSinceAbsoluteWeek: since } }, team);
};

/* #204: someone from your connections running the company has no chair, so the week's run asks after them here */
const connectionCeoWeek = (player: Player, platform: OwnedStreamingPlatformState, absoluteWeek: number): OwnedStreamingPlatformState => {
    const ceo = platform.leadership.currentCeo;
    const appointment = ceo.holderType === 'EXECUTIVE' ? platform.leadership.appointments.find(item => item.executiveId === ceo.executiveId && item.status === 'ACTIVE' && item.role === 'CEO') : null;
    if (!appointment) return platform;
    const relationship = (player.relationships || []).find(item => `connection:${item.id}` === appointment.executiveId);
    /* the heir's own connections are not the founder's: not on the list is not the same as gone */
    const gone = relationship?.relation === 'Deceased Parent';
    const reason = gone ? 'PERSONAL' as const : streamingTeamWantsToLeave(player, platform.simulationSeed, appointment, absoluteWeek, null);
    if (!reason) return platform;
    return {
        ...platform,
        leadership: {
            ...platform.leadership,
            appointments: platform.leadership.appointments.map(item => (item.id === appointment.id
                ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek, notice: { reason, givenAtAbsoluteWeek: absoluteWeek, leavesAtAbsoluteWeek: absoluteWeek } } : item)),
        },
    };
};

/* #204: the chief executive has gone. At 51% or more you run it again until you name someone; under it the board picks
   the best of the team */
const afterCeoLeft = (
    platform: OwnedStreamingPlatformState, team: OwnedStreamingTeamState, absoluteWeek: number,
): { platform: OwnedStreamingPlatformState; team: OwnedStreamingTeamState } => {
    const ceo = platform.leadership.currentCeo;
    if (ceo.holderType !== 'EXECUTIVE' || platform.leadership.appointments.some(item => item.executiveId === ceo.executiveId && item.status === 'ACTIVE')) return { platform, team };
    const left = [...platform.leadership.appointments].reverse().find(item => item.executiveId === ceo.executiveId);
    const name = left?.nameAtAppointment || 'Your chief executive';
    const { holders } = streamingTeamSeatHolders(platform.leadership.appointments);
    const best = platform.founderOwnershipPercent >= 51 ? null : [...holders.values()].sort((a, b) => b.skill - a.skill)[0] || null;
    if (best) {
        const key = `streaming-successor-appointed:${absoluteWeek}:${best.executiveId}`;
        const fact: OwnedStreamingLedgerEntry = {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek,
            type: 'SUCCESSOR_APPOINTED',
            summary: `The board made ${best.nameAtAppointment} Chief Executive after ${name} left.`,
            source: 'WEEK_PROCESSOR',
            metadata: { executiveId: best.executiveId, founderRoleAfter: platform.legacy.founderOfficeRole, readinessScore: best.skill },
        };
        return {
            platform: {
                ...platform,
                leadership: { ...platform.leadership, currentCeo: { holderType: 'EXECUTIVE', executiveId: best.executiveId, sinceAbsoluteWeek: absoluteWeek } },
                eventLedger: [...platform.eventLedger, fact],
            },
            team: report(team, {
                absoluteWeek, seatId: null, appointmentId: best.id, jobId: 'TEAM', kind: 'NOTE',
                title: `The board made ${best.nameAtAppointment} Chief Executive`, detail: `${name} has left. Under 51%, it is the board's choice.`, cost: 0, energy: 0,
            }, platform.simulationSeed),
        };
    }
    const dedupeKey = `ceo-left:${ceo.executiveId}:${absoluteWeek}`;
    const card: OwnedStreamingTeamCard = {
        id: createDeterministicId('streaming_team_card', platform.simulationSeed, dedupeKey),
        dedupeKey,
        seatId: 'MONEY',
        jobId: 'NOTICE',
        appointmentId: left?.id || '',
        createdAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek + STREAMING_TEAM_CARD_WEEKS,
        title: `${name} has left, and you run the company again`,
        detail: 'Choose someone else, or stay in charge.',
        reason: 'A company cannot wait for a chief executive, so the job comes back to you until you say otherwise.',
        cost: 0,
        energy: 0,
        action: { kind: 'OPEN_ROOM', room: 'SUCCESSION' },
        status: 'WAITING',
        resolvedAtAbsoluteWeek: null,
    };
    return {
        platform: {
            ...platform,
            leadership: { ...platform.leadership, currentCeo: { holderType: 'FOUNDER', executiveId: null, sinceAbsoluteWeek: absoluteWeek } },
            legacy: { ...platform.legacy, founderOfficeRole: 'FOUNDER_CEO' },
        },
        team: report({ ...team, tray: [...team.tray, card].slice(-STREAMING_TEAM_TRAY_LIMIT) }, {
            absoluteWeek, seatId: null, appointmentId: left?.id || null, jobId: 'TEAM', kind: 'NOTE',
            title: `${name} has left`, detail: 'You run the company again until you name someone.', cost: 0, energy: 0,
        }, platform.simulationSeed),
    };
};

/* #200: an exit's reason, once: read here so that every way out is caught. A listed company's price reacts at its next
   quote; a private company's board reacts now. History older than two weeks is left alone. */
const noteStreamingExecutiveExits = (platform: OwnedStreamingPlatformState, absoluteWeek: number): OwnedStreamingPlatformState => {
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    let confidence = platform.governance.boardConfidence;
    const appointments = platform.leadership.appointments.map(item => {
        if (item.status === 'ACTIVE' || item.exit || item.endedAtAbsoluteWeek === null || absoluteWeek - item.endedAtAbsoluteWeek > 2) return item;
        const poach = [...platform.competitiveWorld.moves].reverse().find(move => move.type === 'EXECUTIVE_POACH' && move.targetExecutiveId === item.executiveId);
        const reason: StreamingExecutiveExitReason = item.status === 'DISMISSED' ? 'LET_GO'
            : item.notice?.reason ?? (poach ? 'RIVAL_OFFER' : 'RESIGNED');
        const wasCeo = platform.leadership.currentCeo.executiveId === item.executiveId;
        const role = wasCeo ? 'CEO' : streamingExitRole(item);
        if (!listed) confidence += streamingExitBoardMove(reason, role);
        return {
            ...item,
            exit: {
                reason,
                sudden: streamingExitIsSudden(reason),
                ...(wasCeo ? { wasCeo: true } : {}),
                ...(reason === 'RIVAL_OFFER' && poach ? { to: poach.platformName } : {}),
                ...(listed ? {} : { pricedAtAbsoluteWeek: absoluteWeek }),
            },
        };
    });
    return {
        ...platform,
        leadership: { ...platform.leadership, appointments },
        governance: { ...platform.governance, boardConfidence: Math.round(Math.max(0, Math.min(100, confidence))) },
    };
};

/** #181: the weekly work of the stats: a quarter under pressure, raises falling due, and padded expenses */
const statsWeek = (player: Player, platform: OwnedStreamingPlatformState, team: OwnedStreamingTeamState, absoluteWeek: number) => {
    let nextPlatform = platform;
    let nextTeam = team;
    const { holders } = streamingTeamSeatHolders(platform.leadership.appointments);
    const latestReview = platform.cycleReviews.at(-1);
    const badQuarter = latestReview?.kind === 'TWELVE_WEEK_REVIEW' && latestReview.performanceTier === 'UNDER_PRESSURE' && latestReview.endAbsoluteWeek >= absoluteWeek - 1
        ? latestReview : null;
    holders.forEach((appointment, seatId) => {
        const first = appointment.nameAtAppointment.split(' ')[0];
        /* #200: someone on notice works it out, then the chair empties */
        if (appointment.notice) {
            if (appointment.notice.leavesAtAbsoluteWeek > absoluteWeek) return;
            nextPlatform = {
                ...nextPlatform,
                leadership: {
                    ...nextPlatform.leadership,
                    appointments: nextPlatform.leadership.appointments.map(item => (item.id === appointment.id
                        ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek } : item)),
                },
            };
            nextTeam = report(nextTeam, {
                absoluteWeek, seatId, appointmentId: appointment.id, jobId: 'NOTICE', kind: 'NOTE',
                title: `${appointment.nameAtAppointment} has left`,
                detail: `The ${STREAMING_TEAM_SEAT_COPY[seatId].label} chair is empty.`, cost: 0, energy: 0,
            }, nextPlatform.simulationSeed);
            /* their waiting cards go with them */
            nextTeam = { ...nextTeam, tray: nextTeam.tray.map(card => (card.appointmentId === appointment.id && card.status === 'WAITING'
                ? { ...card, status: 'EXPIRED' as const, resolvedAtAbsoluteWeek: absoluteWeek } : card)) };
            return;
        }
        const leaving = streamingTeamWantsToLeave(player, nextPlatform.simulationSeed, appointment, absoluteWeek, badQuarter?.id ?? null);
        if (leaving) {
            const leavesAt = absoluteWeek + STREAMING_TEAM_NOTICE_WEEKS;
            const market = streamingTeamMarketPay(player, appointment);
            const person = getIndustryPerson(player, appointment.executiveId);
            const years = person ? industryPersonNow(player, person).yearsExperience : 0;
            const words = streamingNoticeWords(leaving, first, appointment.weeklyCompensation, market, years, money);
            const wants = streamingExitHasCounter(leaving) ? streamingTeamCounterAsk(player, appointment) : null;
            const dedupeKey = `notice:${appointment.id}:${absoluteWeek}`;
            nextPlatform = {
                ...nextPlatform,
                leadership: {
                    ...nextPlatform.leadership,
                    appointments: nextPlatform.leadership.appointments.map(item => (item.id === appointment.id
                        ? { ...item, notice: { reason: leaving, givenAtAbsoluteWeek: absoluteWeek, leavesAtAbsoluteWeek: leavesAt } } : item)),
                },
            };
            const card: OwnedStreamingTeamCard = {
                id: createDeterministicId('streaming_team_card', nextPlatform.simulationSeed, dedupeKey),
                dedupeKey,
                seatId,
                jobId: 'NOTICE',
                appointmentId: appointment.id,
                createdAtAbsoluteWeek: absoluteWeek,
                expiresAtAbsoluteWeek: leavesAt,
                title: words.title,
                detail: `${words.detail} Leaves in ${STREAMING_TEAM_NOTICE_WEEKS} weeks.`.trim(),
                reason: wants ? `${money(wants)} a week would keep ${first}; 10% under that will not.` : `The ${STREAMING_TEAM_SEAT_COPY[seatId].label} chair empties then: time to find someone.`,
                cost: 0,
                energy: 0,
                action: { kind: 'NOTICE', appointmentId: appointment.id, weekly: appointment.weeklyCompensation, wants },
                status: 'WAITING',
                resolvedAtAbsoluteWeek: null,
            };
            nextTeam = report({ ...nextTeam, tray: [...nextTeam.tray, card].slice(-STREAMING_TEAM_TRAY_LIMIT) }, {
                absoluteWeek, seatId, appointmentId: appointment.id, jobId: 'NOTICE', kind: 'NOTE',
                title: words.title, detail: `${words.detail} Leaves in ${STREAMING_TEAM_NOTICE_WEEKS} weeks.`.trim(), cost: 0, energy: 0,
            }, nextPlatform.simulationSeed);
            return;
        }
        /* #200: paid well under the market, loyalty wears away, a little each quarter */
        const tenure = absoluteWeek - appointment.appointedAtAbsoluteWeek;
        if (tenure > 0 && tenure % 13 === 0 && streamingTeamUnderpaidBy(player, appointment) >= STREAMING_TEAM_UNDERPAID_AT) {
            nextPlatform = {
                ...nextPlatform,
                leadership: {
                    ...nextPlatform.leadership,
                    appointments: nextPlatform.leadership.appointments.map(item => (item.id === appointment.id ? { ...item, loyalty: Math.max(0, item.loyalty - 2) } : item)),
                },
            };
        }
        const period = streamingTeamRaiseDue(appointment, absoluteWeek);
        const dedupeKey = `raise:${appointment.id}:${period}`;
        if (period !== null && !nextTeam.tray.some(card => card.dedupeKey === dedupeKey)) {
            const percent = streamingTeamRaiseAsk(appointment);
            const weekly = Math.round(appointment.weeklyCompensation * (1 + percent / 100) / 5_000) * 5_000;
            nextTeam = {
                ...nextTeam,
                tray: [...nextTeam.tray, proposalCard(nextPlatform, seatId, appointment, {
                    jobId: 'RAISE', dedupeKey, askOnly: true, cost: 0, energy: 0,
                    title: appointment.ambition >= 75 ? `${first} asks for a raise` : `${first}'s yearly review`,
                    detail: `+${percent}%: ${money(weekly)} a week, from ${money(appointment.weeklyCompensation)}`,
                    reason: `Ambition ${appointment.ambition}: ${first} wants the pay to follow the work. A no costs 10 loyalty, less than asked costs some, and a yes adds 5.`,
                    action: { kind: 'RAISE', appointmentId: appointment.id, percent, weekly },
                }, absoluteWeek)].slice(-STREAMING_TEAM_TRAY_LIMIT),
            };
        }
        const padded = streamingTeamPaddedExpenses(nextPlatform.simulationSeed, appointment, absoluteWeek);
        if (padded > 0) {
            nextPlatform = applyStreamingTeamMoney(nextPlatform, `expenses:${appointment.id}:${absoluteWeek}`, -padded, absoluteWeek, `${appointment.nameAtAppointment} padded their expenses.`);
            nextTeam = report(nextTeam, {
                absoluteWeek, seatId, appointmentId: appointment.id, jobId: 'TEAM', kind: 'NOTE',
                title: `${first} padded their expenses`, detail: `${money(padded)} gone. Ethics ${appointment.ethics}: it can happen again.`, cost: padded, energy: 0, outcome: 'SLIP',
            }, nextPlatform.simulationSeed);
        }
    });
    return { platform: nextPlatform, team: nextTeam };
};


const rivalCallCards = (
    platform: OwnedStreamingPlatformState,
    team: OwnedStreamingTeamState,
    absoluteWeek: number,
): OwnedStreamingTeamState => {
    const { holders } = streamingTeamSeatHolders(platform.leadership.appointments);
    const seatByAppointment = new Map([...holders.entries()].map(([seatId, appointment]) => [appointment.id, seatId]));
    let next = team;
    platform.competitiveWorld.moves
        .filter((move: OwnedStreamingRivalMove) => move.type === 'EXECUTIVE_POACH' && move.status === 'OPEN' && move.targetExecutiveId)
        .forEach(move => {
            const appointment = platform.leadership.appointments.find(item => item.executiveId === move.targetExecutiveId && item.status === 'ACTIVE');
            const seatId = appointment ? seatByAppointment.get(appointment.id) : undefined;
            const dedupeKey = `poach:${move.id}`;
            if (!appointment || !seatId || next.tray.some(card => card.dedupeKey === dedupeKey)) return;
            const leave = Math.round(streamingTeamLeaveChance(appointment) * 100);
            const card: OwnedStreamingTeamCard = {
                id: createDeterministicId('streaming_team_card', platform.simulationSeed, dedupeKey),
                dedupeKey,
                seatId,
                jobId: 'RIVAL_CALL',
                appointmentId: appointment.id,
                createdAtAbsoluteWeek: absoluteWeek,
                expiresAtAbsoluteWeek: Math.max(absoluteWeek, move.expiresAtAbsoluteWeek),
                title: `${move.platformName} called ${appointment.nameAtAppointment}`,
                detail: `${move.ceoName} offered a bigger job. Match the package (${money(streamingRivalResponseCost(move, 'MATCH_PACKAGE', appointment.weeklyCompensation))}), give a bigger role (${money(streamingRivalResponseCost(move, 'EXPAND_MANDATE', appointment.weeklyCompensation))}), or let them go.`,
                reason: leave > 0
                    ? `${appointment.loyalty}% loyal: if you do nothing, about ${leave}% chance ${streamingTeamFirstName(appointment.nameAtAppointment)} leaves.`
                    : `${appointment.loyalty}% loyal: ${streamingTeamFirstName(appointment.nameAtAppointment)} would most likely stay.`,
                cost: 0,
                energy: 0,
                action: { kind: 'POACH_ANSWER', moveId: move.id },
                status: 'WAITING',
                resolvedAtAbsoluteWeek: null,
            };
            next = { ...next, tray: [...next.tray, card].slice(-STREAMING_TEAM_TRAY_LIMIT) };
        });
    return next;
};

const proposalCard = (
    platform: OwnedStreamingPlatformState,
    seatId: StreamingTeamSeatId,
    appointment: OwnedStreamingExecutiveAppointment,
    proposal: Omit<StreamingTeamProposal, 'jobId'> & { jobId: OwnedStreamingTeamCard['jobId'] },
    absoluteWeek: number,
    reasonSuffix?: string,
): OwnedStreamingTeamCard => ({
    id: createDeterministicId('streaming_team_card', platform.simulationSeed, `${proposal.dedupeKey}:${absoluteWeek}`),
    dedupeKey: proposal.dedupeKey,
    seatId,
    jobId: proposal.jobId,
    appointmentId: appointment.id,
    createdAtAbsoluteWeek: absoluteWeek,
    expiresAtAbsoluteWeek: absoluteWeek + STREAMING_TEAM_CARD_WEEKS,
    title: proposal.title,
    detail: proposal.detail,
    reason: reasonSuffix ? `${proposal.reason} ${reasonSuffix}` : proposal.reason,
    cost: proposal.cost,
    energy: proposal.energy,
    action: proposal.action,
    status: 'WAITING',
    resolvedAtAbsoluteWeek: null,
});

/**
 * The week's run, in the weekly close after the week's results and the energy refill (`gameLoop`). Pure: player in,
 * player out. Nothing here runs on a tap.
 */
export const runStreamingTeamWeek = (input: Player): Player => {
    if (!input.ownedStreamingPlatform?.identity || input.ownedStreamingPlatform.lifecycle !== 'ACTIVE') return input;
    const absoluteWeek = getAbsoluteWeek(input.age, input.currentWeek);
    let player = reorganize(input, absoluteWeek);
    let platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    let team = teamOf(platform);
    if (team.lastRunAbsoluteWeek === absoluteWeek) return player;
    /* #205: the board's patience, before the week's work */
    player = boardPatienceWeek(player, absoluteWeek);
    platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    team = teamOf(platform);
    /* #180: whoever left returns the options not vested; every 3 weeks the chairs see new people */
    platform = settleDepartedStreamingOptions(platform);
    const refreshed = refreshStreamingTeamMarket(player, platform, team);
    player = refreshed.player;
    team = refreshed.team;

    /* cards past their week expire; a new week clears each seat's usage */
    team = {
        ...team,
        tray: team.tray.map(card => (card.status === 'WAITING' && card.expiresAtAbsoluteWeek < absoluteWeek
            ? { ...card, status: 'EXPIRED' as const, resolvedAtAbsoluteWeek: absoluteWeek } : card)),
        seats: team.seats.map(seat => freshSeat(seat, absoluteWeek)),
    };
    team = rivalCallCards(platform, team, absoluteWeek);
    /* #181: raises the ambitious ask for, expenses padded by the careless, and the disloyal leaving after a bad quarter */
    ({ platform, team } = statsWeek(player, platform, team, absoluteWeek));
    /* #204: someone from your connections running it may go */
    platform = connectionCeoWeek(player, platform, absoluteWeek);
    /* #200: however they left this week (a notice, a rival's call, let go), it now has its reason, its story and its reaction */
    platform = noteStreamingExecutiveExits(platform, absoluteWeek);
    /* #204: and if that was the chief executive */
    ({ platform, team } = afterCeoLeft(platform, team, absoluteWeek));
    /* #201: directors' terms, and a board without confidence */
    const board = streamingBoardWeek(platform, absoluteWeek);
    platform = board.platform;
    board.notes.forEach(note => {
        team = report(team, { absoluteWeek, seatId: null, appointmentId: null, jobId: 'TEAM', kind: 'NOTE', title: note.title, detail: note.detail, cost: 0, energy: 0 }, platform.simulationSeed);
    });
    /* whoever left for a rival works there now, and their CV says so */
    platform.leadership.appointments.filter(item => item.exit?.to && item.endedAtAbsoluteWeek !== null && absoluteWeek - item.endedAtAbsoluteWeek <= 2).forEach(item => {
        const rival = industryHirers().find(employer => employer.name === item.exit!.to);
        const person = getIndustryPerson(player, item.executiveId);
        if (rival && person && industryEmployerOf(player, person).name !== rival.name) player = moveIndustryPerson(player, item.executiveId, rival);
    });
    player = commit(player, platform, team);

    /* #204: while someone else runs it, the jobs are theirs: they spend no energy of yours, and nothing asks you */
    const ceoRuns = platform.leadership.currentCeo.holderType === 'EXECUTIVE';
    const yourEnergy = ceoRuns ? { energy: { ...player.energy }, weekly: player.flags?.weeklyBaseEnergyRemaining, bonus: player.flags?.bonusEnergyBank } : null;
    if (ceoRuns) player = { ...player, energy: { ...player.energy, current: Math.max(player.energy?.current || 0, 200) }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 200 } };

    const floor = getStreamingTeamCashFloor(platform);
    const isPublic = platform.publicCompany.lifecycle === 'PUBLIC';
    for (const seatId of STREAMING_TEAM_SEATS) {
        platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
        team = teamOf(platform);
        const executive = streamingTeamSeatHolders(platform.leadership.appointments).holders.get(seatId);
        if (!executive) continue;
        /* #181: the ambitious take on one more job a week, the unambitious one fewer */
        const actionsAllowed = Math.max(1, streamingTeamActionsPerWeek(executive.level) + streamingTeamAmbitionActions(executive.ambition));
        const proposals: StreamingTeamProposal[] = streamingTeamJobsForSeat(seatId)
            .filter(job => (!job.publicOnly || isPublic) && seatOf(team, seatId).jobs[job.id] !== 'OFF')
            .flatMap(job => {
                const runner = STREAMING_TEAM_RUNNERS[job.id];
                if (!runner) return [];
                const seat = seatOf(team, seatId);
                return runner({
                    player, platform, absoluteWeek, seat, executive,
                    moneyLeft: Math.max(0, seat.weeklyMoney - seat.moneyUsed),
                    energyLeft: Math.max(0, Math.min(seat.weeklyEnergy - seat.energyUsed, energyOf(player))),
                });
            })
            .sort((left, right) => (right.priority || 0) - (left.priority || 0));

        for (const proposal of proposals) {
            platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
            team = teamOf(platform);
            const seat = seatOf(team, seatId);
            if (seat.actionsUsed >= actionsAllowed) break;
            /* one card per target; and what you said no to (or let expire) is not asked again for a while */
            if (team.tray.some(card => card.dedupeKey === proposal.dedupeKey && (card.status === 'WAITING'
                || ((card.status === 'DECLINED' || card.status === 'EXPIRED') && absoluteWeek - (card.resolvedAtAbsoluteWeek ?? card.createdAtAbsoluteWeek) < STREAMING_TEAM_QUIET_WEEKS)))) continue;
            const mode = seat.jobs[proposal.jobId] || 'ASK';
            const overMoney = proposal.cost > seat.actionMoney || seat.moneyUsed + proposal.cost > seat.weeklyMoney;
            const overEnergy = proposal.energy > 0 && (seat.energyUsed + proposal.energy > seat.weeklyEnergy || proposal.energy > energyOf(player));
            const belowFloor = proposal.cost > 0 && platform.treasuryCash - proposal.cost < floor.amount;
            const ask = mode === 'ASK' || proposal.askOnly || overMoney || overEnergy || belowFloor;
            /* #204: a job someone must do at a screen, or that goes over the limits or the floor, waits; the rest they just do */
            if (ceoRuns && (belowFloor || overMoney || overEnergy || !STREAMING_TEAM_EXECUTORS[proposal.action.kind])) continue;
            if (ask && !ceoRuns) {
                if (team.tray.filter(card => card.status === 'WAITING' && card.seatId === seatId).length >= STREAMING_TEAM_CARDS_PER_SEAT) continue;
                const why = mode === 'DO' && !proposal.askOnly
                    ? belowFloor ? `Held: the treasury would fall under ${floor.weeks} weeks of costs.`
                        : overMoney ? 'It is over the limits you set.'
                            : overEnergy ? 'It needs more energy than the allowance.' : undefined
                    : undefined;
                team = { ...team, tray: [...team.tray, proposalCard(platform, seatId, executive, proposal, absoluteWeek, why)].slice(-STREAMING_TEAM_TRAY_LIMIT) };
                team = withSeat(team, seatId, { actionsUsed: seat.actionsUsed + 1 });
                team = report(team, {
                    absoluteWeek, seatId, appointmentId: executive.id, jobId: proposal.jobId,
                    kind: belowFloor && mode === 'DO' ? 'HELD' : 'ASKED',
                    title: proposal.title, detail: why || proposal.reason, cost: proposal.cost, energy: proposal.energy,
                }, platform.simulationSeed);
                player = commit(player, platform, team);
                continue;
            }
            const before = { cash: platform.treasuryCash, energy: energyOf(player) };
            const result = runAction(player, proposal, absoluteWeek, executive.nameAtAppointment);
            if (!result.changed) {
                team = report(team, {
                    absoluteWeek, seatId, appointmentId: executive.id, jobId: proposal.jobId, kind: 'NOTE',
                    title: `Could not: ${proposal.title}`, detail: result.reason || 'It was refused.', cost: 0, energy: 0,
                }, platform.simulationSeed);
                player = commit(player, platform, team);
                continue;
            }
            const doneBefore = normalizeOwnedStreamingPlatformState(result.player.ownedStreamingPlatform, result.player.id);
            const spentGross = Math.max(0, before.cash - doneBefore.treasuryCash);
            const energySpent = Math.max(0, before.energy - energyOf(result.player));
            /* #181: how it turned out, by their skill: under or over budget, rarely a great move or a slip (jobs with money in them) */
            const settled = settleStreamingTeamJob(doneBefore, executive, proposal, absoluteWeek, spentGross);
            const afterPlatform = settled.platform;
            const { outcome } = settled;
            const spent = Math.max(0, spentGross - settled.delta);
            team = teamOf(afterPlatform);
            const seatAfter = seatOf(team, seatId);
            team = withSeat(team, seatId, {
                actionsUsed: seatAfter.actionsUsed + 1,
                moneyUsed: seatAfter.moneyUsed + spent,
                energyUsed: seatAfter.energyUsed + energySpent,
            });
            team = report(team, {
                absoluteWeek, seatId, appointmentId: executive.id, jobId: proposal.jobId, kind: 'DONE',
                title: proposal.title, detail: [proposal.reason, settled.words].filter(Boolean).join(' '),
                cost: spent, energy: energySpent, ...(outcome ? { outcome } : {}),
            }, afterPlatform.simulationSeed);
            /* experience: one a job done; a level every 18 (the existing rule) */
            const experienced: OwnedStreamingPlatformState = {
                ...afterPlatform,
                leadership: {
                    ...afterPlatform.leadership,
                    appointments: afterPlatform.leadership.appointments.map(item => {
                        if (item.id !== executive.id) return item;
                        const experience = item.experience + 1;
                        const earned = Math.max(1, Math.min(5, 1 + Math.floor(experience / 18)));
                        return { ...item, experience, level: Math.max(item.level, earned) as 1 | 2 | 3 | 4 | 5 };
                    }),
                },
            };
            player = commit(result.player, experienced, team);
        }
    }
    /* #204: what would have come to you, the chief executive answers: raises, a rival's call, a notice. Only their own goes to you. Every third week they fill an empty chair. */
    if (ceoRuns && yourEnergy) {
        const answering = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
        const ceoAppointment = answering.leadership.appointments.find(item => item.executiveId === answering.leadership.currentCeo.executiveId);
        teamOf(answering).tray.filter(card => card.status === 'WAITING' && card.appointmentId !== ceoAppointment?.id).forEach(card => {
            if (card.action.kind === 'RAISE') player = approveStreamingTeamCard(player, card.id).player;
            else if (card.action.kind === 'POACH_ANSWER') player = approveStreamingTeamCard(player, card.id, 'MATCH_PACKAGE').player;
            else if (card.action.kind === 'NOTICE') {
                const held = answering.leadership.appointments.find(item => item.id === card.appointmentId);
                const wants = card.action.wants;
                player = wants && held && wants <= streamingTeamMarketPay(player, held) * 1.1
                    ? approveStreamingTeamCard(player, card.id, undefined, wants).player
                    : declineStreamingTeamCard(player, card.id).player;
            }
        });
        if (absoluteWeek % 3 === 0) {
            for (const seatId of STREAMING_TEAM_SEATS) {
                const now = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
                if (streamingTeamSeatHolders(now.leadership.appointments).holders.has(seatId)) continue;
                const people = getStreamingTeamCandidates(player, seatId);
                const pick = people[Math.min(1, people.length - 1)];
                if (pick) player = hireStreamingTeamCandidate(player, seatId, pick.id).player;
            }
        }
        player = { ...player, energy: yourEnergy.energy, flags: { ...player.flags, weeklyBaseEnergyRemaining: yourEnergy.weekly ?? player.flags.weeklyBaseEnergyRemaining, bonusEnergyBank: yourEnergy.bonus ?? player.flags.bonusEnergyBank } };
    }
    platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return commit(player, platform, { ...teamOf(platform), lastRunAbsoluteWeek: absoluteWeek });
};

/* ---------------------------------------------------------------- the view --------------------------------------- */

export type StreamingTeamSeatStatus = 'WORKING' | 'WAITING' | 'TRAINING' | 'EMPTY';

export interface StreamingTeamSeatView {
    seatId: StreamingTeamSeatId;
    copy: (typeof STREAMING_TEAM_SEAT_COPY)[StreamingTeamSeatId];
    status: StreamingTeamSeatStatus;
    executive: null | {
        appointmentId: string;
        executiveId: string;
        name: string;
        initials: string;
        /** #179: draws their portrait */
        gender: Gender;
        roleLabel: string;
        level: number;
        experience: number;
        nextLevelAt: number;
        skill: number;
        loyalty: number;
        ambition: number;
        ethics: number;
        strategy: StreamingExecutiveStrategy;
        salary: number;
        leaveChance: number;
        trainingReadyAtAbsoluteWeek: number | null;
        /** #180: the options they were granted, and how much has vested */
        options: { percent: number; vested: number } | null;
        /** #181: what their skill, ambition and ethics mean, in words (#183: and loyalty) */
        meaning: { skill: string; loyalty: string; ambition: string; ethics: string };
        /** #199: where they have worked */
        career: IndustryCareerView | null;
        /** #200: paid well under what the market pays them */
        underpaid: { market: number } | null;
        /** #200: what letting them go costs */
        severance: number;
        /** #200: they are working out their notice */
        notice: { weeksLeft: number; reason: StreamingExecutiveExitReason } | null;
    };
    jobs: Array<{ id: StreamingTeamJobId; label: string; line: string; modes: StreamingTeamJobMode[]; mode: StreamingTeamJobMode; available: boolean }>;
    limits: Pick<OwnedStreamingTeamSeat, 'weeklyMoney' | 'actionMoney' | 'weeklyEnergy'>;
    caps: { weeklyMoney: number; actionMoney: number; weeklyEnergy: number };
    usage: { moneyUsed: number; energyUsed: number; actionsUsed: number; actionsPerWeek: number };
    waiting: number;
    doneThisWeek: number;
    train: { cash: number; weeks: number; energy: number; nextLevel: number; payAfter: number } | null;
    /** an empty seat's three candidates, a fresh set every 3 weeks (#180) */
    candidates: StreamingTeamCandidate[];
    /** weeks until the next set */
    nextCandidatesInWeeks: number;
}

export interface StreamingTeamView {
    available: boolean;
    /** the service is live: before Opening Night the team neither acts nor asks */
    live: boolean;
    absoluteWeek: number;
    /** the company's own week (32), for labels */
    companyWeek: number;
    /** the company week of the latest report */
    reportCompanyWeek: number | null;
    energy: number;
    hireEnergy: number;
    seats: StreamingTeamSeatView[];
    leftovers: Array<{ appointmentId: string; name: string; roleLabel: string; salary: number }>;
    tray: OwnedStreamingTeamCard[];
    /** the latest week the team ran, newest first */
    report: OwnedStreamingTeamReportEntry[];
    reportWeek: number | null;
    floor: { weeks: number; amount: number; hasCfo: boolean };
    /** #166: "If you step down", moved here from the Legacy office */
    succession: {
        plan: { name: string; role: string; readiness: number; type: 'EXECUTIVE' | 'FAMILY_HEIR'; candidateId: string } | null;
        candidates: Array<{ id: string; type: 'EXECUTIVE' | 'FAMILY_HEIR'; name: string; role: string; readinessScore: number; readinessNote: string; gender?: Gender }>;
    };
    totals: { waiting: number; doneThisWeek: number; energyUsed: number; energyAllowance: number; moneyUsed: number; filled: number };
}

const initialsOf = (name: string) => name.split(' ').map(word => word[0] || '').join('').slice(0, 2).toUpperCase();

/** #179: an executive's gender, from the industry's people (or the old candidates' list) */
export const streamingExecutiveGender = (player: Player, executiveId: string): Gender => (
    getIndustryPerson(player, executiveId)?.gender ?? STREAMING_EXECUTIVE_CANDIDATES.find(item => item.id === executiveId)?.gender ?? 'NON_BINARY'
);

const roleOfExecutive = (platform: OwnedStreamingPlatformState, executiveId: string) => {
    const appointment = platform.leadership.appointments.find(item => item.executiveId === executiveId);
    return appointment ? roleLabel(appointment) : 'Executive';
};

/** #166: name who takes over if you step down (the Legacy office's succession, now on TEAM). The era's mandate is kept. */
export const nameStreamingTeamSuccessor = (
    player: Player,
    candidateType: 'EXECUTIVE' | 'FAMILY_HEIR',
    candidateId: string,
): StreamingTeamResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const planned = planStreamingSuccession(player, candidateType, candidateId, platform.legacy.currentMandate);
    if (!planned.changed) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = normalizeOwnedStreamingPlatformState(planned.player.ownedStreamingPlatform, planned.player.id);
    const plan = nextPlatform.legacy.successionPlan;
    const team = report(teamOf(nextPlatform), {
        absoluteWeek, seatId: null, appointmentId: null, jobId: 'TEAM', kind: 'NOTE',
        title: `${plan?.candidateName || 'A successor'} named to take over if you step down`,
        detail: `Readiness ${plan?.readinessScore ?? 0}.`, cost: 0, energy: 0,
    }, nextPlatform.simulationSeed);
    return { player: commit(planned.player, nextPlatform, team), changed: true };
};

export const getStreamingTeamView = (player: Player): StreamingTeamView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const team = teamOf(platform);
    const { holders, leftovers } = streamingTeamSeatHolders(platform.leadership.appointments);
    const isPublic = platform.publicCompany.lifecycle === 'PUBLIC';
    /* #204: off the board, nothing comes to you */
    const offTheBoard = platform.leadership.currentCeo.holderType === 'EXECUTIVE' && platform.legacy.founderOfficeRole !== 'EXECUTIVE_CHAIR';
    const waitingCards = offTheBoard ? [] : team.tray.filter(card => card.status === 'WAITING' && card.expiresAtAbsoluteWeek >= absoluteWeek);
    const reportWeek = team.report.length ? Math.max(...team.report.map(entry => entry.absoluteWeek)) : null;
    const latest = reportWeek === null || offTheBoard ? [] : team.report.filter(entry => entry.absoluteWeek >= reportWeek - 0).reverse();
    const seats: StreamingTeamSeatView[] = STREAMING_TEAM_SEATS.map(seatId => {
        const stored = freshSeat(seatOf(team, seatId), absoluteWeek);
        const holder = holders.get(seatId) || null;
        const training = holder
            ? platform.leadership.developmentPrograms.find(item => item.executiveId === holder.executiveId && item.status === 'IN_PROGRESS') || null
            : null;
        const waiting = waitingCards.filter(card => card.seatId === seatId).length;
        const doneThisWeek = latest.filter(entry => entry.seatId === seatId && entry.kind === 'DONE').length;
        return {
            seatId,
            copy: STREAMING_TEAM_SEAT_COPY[seatId],
            status: !holder ? 'EMPTY' : training ? 'TRAINING' : waiting ? 'WAITING' : 'WORKING',
            executive: holder ? {
                appointmentId: holder.id,
                executiveId: holder.executiveId,
                name: holder.nameAtAppointment,
                initials: initialsOf(holder.nameAtAppointment),
                gender: streamingExecutiveGender(player, holder.executiveId),
                roleLabel: roleLabel(holder),
                level: holder.level,
                experience: holder.experience,
                nextLevelAt: 18 * holder.level,
                skill: holder.skill,
                loyalty: holder.loyalty,
                ambition: holder.ambition,
                ethics: holder.ethics,
                strategy: holder.preferredStrategy,
                salary: holder.weeklyCompensation,
                leaveChance: streamingTeamLeaveChance(holder),
                /* #200: paid 15% or more under the market, the page says so */
                underpaid: (() => {
                    const by = streamingTeamUnderpaidBy(player, holder);
                    return by >= STREAMING_TEAM_UNDERPAID_AT ? { market: streamingTeamMarketPay(player, holder) } : null;
                })(),
                severance: holder.weeklyCompensation * STREAMING_TEAM_SEVERANCE_WEEKS,
                notice: holder.notice ? { weeksLeft: Math.max(0, holder.notice.leavesAtAbsoluteWeek - absoluteWeek), reason: holder.notice.reason } : null,
                trainingReadyAtAbsoluteWeek: training?.readyAtAbsoluteWeek ?? null,
                options: holder.options ? { percent: holder.options.percent, vested: streamingOptionsVested(holder.options, absoluteWeek) } : null,
                meaning: streamingTeamStatMeaning(holder),
                career: (() => {
                    const person = getIndustryPerson(player, holder.executiveId);
                    return person ? industryCareerOf(player, person) : null;
                })(),
            } : null,
            jobs: streamingTeamJobsForSeat(seatId).map(job => ({
                id: job.id, label: job.label, line: job.line, modes: job.modes,
                mode: stored.jobs[job.id] || 'ASK',
                available: !job.publicOnly || isPublic,
            })),
            limits: { weeklyMoney: stored.weeklyMoney, actionMoney: stored.actionMoney, weeklyEnergy: stored.weeklyEnergy },
            caps: streamingTeamLimitCaps(seatId, holder?.level || 1),
            usage: {
                moneyUsed: stored.moneyUsed, energyUsed: stored.energyUsed, actionsUsed: stored.actionsUsed,
                actionsPerWeek: Math.max(1, streamingTeamActionsPerWeek(holder?.level || 1) + streamingTeamAmbitionActions(holder?.ambition ?? 60)),
            },
            waiting,
            doneThisWeek,
            train: holder && holder.level < 5 ? { ...streamingTeamTrainCost(holder.level), nextLevel: holder.level + 1, payAfter: streamingTeamPayAfterLevel(holder.weeklyCompensation) } : null,
            candidates: holder ? [] : getStreamingTeamCandidates(player, seatId),
            nextCandidatesInWeeks: streamingTeamWeeksToNextSet(absoluteWeek),
        };
    });
    const floor = getStreamingTeamCashFloor(platform);
    const foundedAt = platform.identity?.foundedAtAbsoluteWeek ?? absoluteWeek;
    return {
        available: Boolean(platform.identity),
        live: platform.lifecycle === 'ACTIVE',
        absoluteWeek,
        companyWeek: Math.max(1, absoluteWeek - foundedAt + 1),
        reportCompanyWeek: reportWeek === null ? null : Math.max(1, reportWeek - foundedAt + 1),
        energy: energyOf(player),
        hireEnergy: STREAMING_TEAM_HIRE_ENERGY,
        seats,
        leftovers: team.reorganizedAtAbsoluteWeek === null
            ? leftovers.map(item => ({ appointmentId: item.id, name: item.nameAtAppointment, roleLabel: roleLabel(item), salary: item.weeklyCompensation }))
            : [],
        tray: waitingCards.sort((left, right) => left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek),
        report: latest,
        reportWeek,
        floor: { weeks: floor.weeks, amount: floor.amount, hasCfo: Boolean(floor.cfo) },
        succession: {
            plan: platform.legacy.successionPlan && platform.legacy.successionPlan.status !== 'TRANSITIONED' ? {
                name: platform.legacy.successionPlan.candidateName,
                role: platform.legacy.successionPlan.candidateType === 'FAMILY_HEIR'
                    ? (getStreamingSuccessionCandidates(player).find(item => item.type === 'FAMILY_HEIR' && item.id === platform.legacy.successionPlan!.candidateId)?.role || 'Your connection')
                    : roleOfExecutive(platform, platform.legacy.successionPlan.candidateId),
                readiness: platform.legacy.successionPlan.readinessScore,
                type: platform.legacy.successionPlan.candidateType,
                candidateId: platform.legacy.successionPlan.candidateId,
            } : null,
            candidates: getStreamingSuccessionCandidates(player).map(candidate => ({
                id: candidate.id, type: candidate.type, name: candidate.name,
                role: candidate.type === 'EXECUTIVE' ? roleOfExecutive(platform, candidate.id) : candidate.role,
                readinessScore: candidate.readinessScore, readinessNote: candidate.readinessNote,
                gender: candidate.type === 'EXECUTIVE'
                    ? streamingExecutiveGender(player, candidate.id)
                    : (player.relationships || []).find(item => item.id === candidate.id || item.name === candidate.name)?.gender,
            })),
        },
        totals: {
            waiting: waitingCards.length,
            doneThisWeek: seats.reduce((sum, seat) => sum + seat.doneThisWeek, 0),
            energyUsed: seats.reduce((sum, seat) => sum + seat.usage.energyUsed, 0),
            energyAllowance: seats.filter(seat => seat.executive).reduce((sum, seat) => sum + seat.limits.weeklyEnergy, 0),
            moneyUsed: seats.reduce((sum, seat) => sum + seat.usage.moneyUsed, 0),
            filled: seats.filter(seat => seat.executive).length,
        },
    };
};

/** The waiting count for the HQ tile. */
export const getStreamingTeamWaitingCount = (player: Player): number => {
    const team = player.ownedStreamingPlatform?.leadership?.team;
    if (!team) return 0;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return team.tray.filter(card => card.status === 'WAITING' && card.expiresAtAbsoluteWeek >= absoluteWeek).length;
};
