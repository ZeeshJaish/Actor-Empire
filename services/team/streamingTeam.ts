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
import { getIndustryPerson, industryEmployerOf, industrySeedOf, type IndustryGrade, type IndustryPerson } from '../industry/industryPeople';
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
    streamingTeamCandidateSet,
    streamingTeamCandidatesFor,
    streamingTeamWeeksToNextSet,
    type StreamingCandidateAsk,
} from './teamHiring';
import {
    STREAMING_TEAM_RAISE_PERCENT,
    applyStreamingTeamMoney,
    rollStreamingTeamOutcome,
    shiftStreamingTeamOrder,
    streamingTeamAmbitionActions,
    streamingTeamLeavesAfterBadQuarter,
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
        | 'NOT_ON_OFFER' | 'REFUSED' | 'CONTROL';
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
    /** why the ask is what it is */
    why: string;
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
        meaning: streamingTeamStatMeaning(person),
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
 * #180: hire at their ask, or offer 15% less. A lower offer is answered once per person and set (asking again
 * changes nothing); a no means they are gone for the set, and the energy is spent. A hire pays the signing bonus
 * from the treasury and grants the options (every holder diluted; never under the founder's 51%).
 */
export const hireStreamingTeamCandidate = (player: Player, seatId: StreamingTeamSeatId, candidateId: string, offer: 'ASK' | 'LOWER' = 'ASK'): StreamingTeamResult => {
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
    if (energyOf(organized) < STREAMING_TEAM_HIRE_ENERGY) {
        return { player, changed: false, reason: 'ENERGY', message: `Hiring takes ${STREAMING_TEAM_HIRE_ENERGY}⚡.` };
    }
    const view = candidateView(organized, platform, person);
    const set = streamingTeamCandidateSet(absoluteWeek);
    const first = person.name.split(' ')[0];
    if (offer === 'LOWER') {
        const yes = createDeterministicRng(`${industrySeedOf(organized)}:lower-offer:${person.id}:${set}`)() < view.lower.chance;
        if (!yes) {
            const next: Player = { ...organized, energy: { ...organized.energy }, flags: { ...organized.flags } };
            spendPlayerEnergy(next, STREAMING_TEAM_HIRE_ENERGY, `Team: offered ${person.name} less`);
            const nextPlatform = normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, next.id);
            const market = team.market && team.market.set === set ? team.market : { set, shown: {}, seen: team.market?.seen || {}, refused: {} };
            const weeks = streamingTeamWeeksToNextSet(absoluteWeek);
            const refusedTeam = report({ ...teamOf(nextPlatform), market: { ...market, refused: { ...market.refused, [person.id]: set } } }, {
                absoluteWeek, seatId, appointmentId: null, jobId: 'TEAM', kind: 'NOTE',
                title: `${person.name} turned down the lower offer`,
                detail: `${first} wanted ${money(view.ask.weekly)} a week. New people in ${weeks} week${weeks === 1 ? '' : 's'}.`,
                cost: 0, energy: STREAMING_TEAM_HIRE_ENERGY,
            }, nextPlatform.simulationSeed);
            return { player: commit(next, nextPlatform, refusedTeam), changed: true, reason: 'REFUSED', message: `${first} said no to 15% less.` };
        }
    }
    const terms = offer === 'LOWER'
        ? { weekly: view.lower.weekly, signing: view.lower.signing, options: view.lower.optionsPercent }
        : { weekly: view.ask.weekly, signing: view.ask.signing, options: view.ask.optionsPercent };
    if (platform.treasuryCash < terms.signing) return { player, changed: false, reason: 'TREASURY', message: `The signing bonus is ${money(terms.signing)}.` };
    if (platform.founderOwnershipPercent * (1 - terms.options / 100) < 51) {
        return { player, changed: false, reason: 'CONTROL', message: 'Their options would take you under 51%.' };
    }
    const candidate: StreamingExecutiveCandidate = {
        id: person.id, name: person.name, role: person.role, roleLabel: person.roleLabel, initials: initialsOf(person.name), gender: person.gender,
        formerCompany: person.formerCompany, yearsExperience: person.yearsExperience, specialty: person.specialty, style: person.style,
        strength: person.strength, caution: person.caution, weeklyCompensation: terms.weekly, skill: person.skill, loyalty: person.loyalty,
        ambition: person.ambition, ethics: person.ethics, preferredStrategy: person.preferredStrategy,
    };
    const hired = hireStreamingExecutive(organized, person.id, `team:${seatId}:${person.id}:${absoluteWeek}`, { candidate, signingBonus: terms.signing });
    if (!hired.changed || !hired.appointment) return { player, changed: false, reason: 'FAILED', message: 'That hire could not be completed.' };
    const next: Player = { ...hired.player, energy: { ...hired.player.energy }, flags: { ...hired.player.flags } };
    spendPlayerEnergy(next, STREAMING_TEAM_HIRE_ENERGY, `Team: hired ${person.name}`);
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
        cost: terms.signing, energy: STREAMING_TEAM_HIRE_ENERGY,
    }, nextPlatform.simulationSeed);
    return { player: commit(next, nextPlatform, hiredTeam), changed: true, message: offer === 'LOWER' ? `${first} took 15% less.` : undefined };
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
    const dismissed = dismissStreamingExecutive(player, holder.executiveId);
    if (!dismissed.changed) return { player, changed: false, reason: 'FAILED' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = normalizeOwnedStreamingPlatformState(dismissed.player.ownedStreamingPlatform, dismissed.player.id);
    let team = teamOf(nextPlatform);
    /* their waiting cards go with them */
    team = { ...team, tray: team.tray.map(card => (card.appointmentId === holder.id && card.status === 'WAITING'
        ? { ...card, status: 'EXPIRED' as const, resolvedAtAbsoluteWeek: absoluteWeek } : card)) };
    team = report(team, {
        absoluteWeek, seatId, appointmentId: holder.id, jobId: 'TEAM', kind: 'NOTE',
        title: `${holder.nameAtAppointment} was let go`, detail: `The ${STREAMING_TEAM_SEAT_COPY[seatId].label} seat is empty; its jobs are yours again.`,
        cost: 0, energy: 0,
    }, nextPlatform.simulationSeed);
    return { player: commit(dismissed.player, nextPlatform, team), changed: true };
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
        detail: outcomeWords ? `Approved by you. ${outcomeWords}` : 'Approved by you.',
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
        title: card.title, detail: refusedRaise ? 'You said no. Their loyalty fell by 10.' : 'You said no.', cost: 0, energy: 0,
    }, settledPlatform.simulationSeed);
    return { player: commit(player, settledPlatform, team), changed: true };
};

const answerLabel = (answer: StreamingRivalResponseId) => (
    answer === 'MATCH_PACKAGE' ? 'matched the package' : answer === 'EXPAND_MANDATE' ? 'a bigger role' : answer === 'LET_DEPART' ? 'let go' : answer.toLowerCase().replaceAll('_', ' ')
);

/* ---------------------------------------------------------------- the weekly run --------------------------------- */

/** #181: the weekly work of the stats: a quarter under pressure, raises falling due, and padded expenses */
const statsWeek = (platform: OwnedStreamingPlatformState, team: OwnedStreamingTeamState, absoluteWeek: number) => {
    let nextPlatform = platform;
    let nextTeam = team;
    const { holders } = streamingTeamSeatHolders(platform.leadership.appointments);
    const latestReview = platform.cycleReviews.at(-1);
    const badQuarter = latestReview?.kind === 'TWELVE_WEEK_REVIEW' && latestReview.performanceTier === 'UNDER_PRESSURE' && latestReview.endAbsoluteWeek >= absoluteWeek - 1
        ? latestReview : null;
    holders.forEach((appointment, seatId) => {
        const first = appointment.nameAtAppointment.split(' ')[0];
        if (badQuarter && streamingTeamLeavesAfterBadQuarter(nextPlatform.simulationSeed, appointment, badQuarter.id)) {
            nextPlatform = {
                ...nextPlatform,
                leadership: {
                    ...nextPlatform.leadership,
                    appointments: nextPlatform.leadership.appointments.map(item => (item.id === appointment.id
                        ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek } : item)),
                },
            };
            nextTeam = report(nextTeam, {
                absoluteWeek, seatId, appointmentId: appointment.id, jobId: 'TEAM', kind: 'NOTE',
                title: `${appointment.nameAtAppointment} resigned after a hard quarter`,
                detail: `Loyalty ${appointment.loyalty}: the quarter under pressure was enough. The ${STREAMING_TEAM_SEAT_COPY[seatId].label} chair is empty.`, cost: 0, energy: 0,
            }, nextPlatform.simulationSeed);
            return;
        }
        const period = streamingTeamRaiseDue(appointment, absoluteWeek);
        const dedupeKey = `raise:${appointment.id}:${period}`;
        if (period !== null && !nextTeam.tray.some(card => card.dedupeKey === dedupeKey)) {
            const weekly = Math.round(appointment.weeklyCompensation * (1 + STREAMING_TEAM_RAISE_PERCENT / 100) / 5_000) * 5_000;
            nextTeam = {
                ...nextTeam,
                tray: [...nextTeam.tray, proposalCard(nextPlatform, seatId, appointment, {
                    jobId: 'RAISE', dedupeKey, askOnly: true, cost: 0, energy: 0,
                    title: `${first} asks for a raise`,
                    detail: `+${STREAMING_TEAM_RAISE_PERCENT}%: ${money(weekly)} a week, from ${money(appointment.weeklyCompensation)}`,
                    reason: `Ambition ${appointment.ambition}: ${first} wants the pay to follow the work. A no costs 10 loyalty; a yes adds 5.`,
                    action: { kind: 'RAISE', appointmentId: appointment.id, percent: STREAMING_TEAM_RAISE_PERCENT, weekly },
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
    ({ platform, team } = statsWeek(platform, team, absoluteWeek));
    player = commit(player, platform, team);

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
            if (ask) {
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
    };
    jobs: Array<{ id: StreamingTeamJobId; label: string; line: string; modes: StreamingTeamJobMode[]; mode: StreamingTeamJobMode; available: boolean }>;
    limits: Pick<OwnedStreamingTeamSeat, 'weeklyMoney' | 'actionMoney' | 'weeklyEnergy'>;
    caps: { weeklyMoney: number; actionMoney: number; weeklyEnergy: number };
    usage: { moneyUsed: number; energyUsed: number; actionsUsed: number; actionsPerWeek: number };
    waiting: number;
    doneThisWeek: number;
    train: { cash: number; weeks: number; energy: number; nextLevel: number } | null;
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
    const waitingCards = team.tray.filter(card => card.status === 'WAITING' && card.expiresAtAbsoluteWeek >= absoluteWeek);
    const reportWeek = team.report.length ? Math.max(...team.report.map(entry => entry.absoluteWeek)) : null;
    const latest = reportWeek === null ? [] : team.report.filter(entry => entry.absoluteWeek >= reportWeek - 0).reverse();
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
                trainingReadyAtAbsoluteWeek: training?.readyAtAbsoluteWeek ?? null,
                options: holder.options ? { percent: holder.options.percent, vested: streamingOptionsVested(holder.options, absoluteWeek) } : null,
                meaning: streamingTeamStatMeaning(holder),
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
            train: holder && holder.level < 5 ? { ...streamingTeamTrainCost(holder.level), nextLevel: holder.level + 1 } : null,
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
                role: platform.legacy.successionPlan.candidateType === 'FAMILY_HEIR' ? 'Family heir' : roleOfExecutive(platform, platform.legacy.successionPlan.candidateId),
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
