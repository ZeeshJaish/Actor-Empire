/**
 * #180 (plan §22.7): hiring from the industry. Zeesh, 2026-11-03: "har 3 hafte me naya canditate / and candiate yk
 * apne hisab se and company ke hisab se alg salery ya espos and stuff mang sakte".
 *
 *   - Every 3 weeks each chair is shown three people for its job, from the industry's people (#178): one high grade,
 *     one middle, one cheap with promise. Never someone at our table, who left us lately, or who was shown to that
 *     chair in the last 4 sets. People working at a rival or a studio can be among them.
 *   - Each asks for their own package, by who they are and by who we are: weekly pay (their market pay; +15% to
 *     leave a job; less from an attractive company, more from a risky one), a signing bonus (2–8 weeks of pay, more
 *     to leave a job) and options (a % of the company, by grade and ambition, more from a small company, fewer once
 *     listed).
 *   - "Offer 15% less": the chance they agree shows on the CV (ambition and our appeal decide it); the answer is set
 *     for that person and set, so asking again changes nothing. A no means they are gone for that set.
 *   - Options sit on the cap table as "Team options" and dilute every holder when granted; they vest a sixteenth a
 *     quarter; whoever leaves returns the part not vested.
 *   - Of the people a chair passed on, about a third join a rival or a studio when the set turns.
 */
import type {
    IndustryEmployer,
    OwnedStreamingExecutiveAppointment,
    OwnedStreamingPlatformState,
    OwnedStreamingTeamState,
    Player,
    StreamingTeamSeatId,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { getAbsoluteWeek } from '../legacyLogic';
import {
    getIndustryPeople,
    getIndustryPerson,
    industryEmployerOf,
    industryHirers,
    industrySeedOf,
    moveIndustryPerson,
    type IndustryGrade,
    type IndustryPerson,
} from '../industry/industryPeople';
import { getStreamingEquityValuation } from '../streamingPublicMarkets';
import { STREAMING_TEAM_SEATS, STREAMING_TEAM_SEAT_ROLES } from './teamState';

export const STREAMING_TEAM_CANDIDATE_WEEKS = 3;
export const STREAMING_TEAM_LOWER_OFFER = 0.85;
export const TEAM_OPTIONS_HOLDER = 'Team options';
const OPTIONS_VEST_QUARTERS = 16;
const SEEN_SETS = 4;
const PASSED_ON_HIRED = 0.35;
const LEFT_US_WEEKS = 26;
const SIGNING_WEEKS: Record<IndustryGrade, number> = { STAR: 8, SENIOR: 6, SOLID: 4, RISING: 2 };
const OPTIONS_BASE: Record<IndustryGrade, number> = { STAR: 0.6, SENIOR: 0.35, SOLID: 0.2, RISING: 0.1 };
const BANDS: IndustryGrade[][] = [['STAR', 'SENIOR'], ['SENIOR', 'SOLID'], ['SOLID', 'RISING']];

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export const streamingTeamCandidateSet = (absoluteWeek: number) => Math.floor(absoluteWeek / STREAMING_TEAM_CANDIDATE_WEEKS);
/** weeks until the next set of candidates */
export const streamingTeamWeeksToNextSet = (absoluteWeek: number) => STREAMING_TEAM_CANDIDATE_WEEKS - (absoluteWeek % STREAMING_TEAM_CANDIDATE_WEEKS);

/** how attractive we are to work for: size, growth, reputation, risk, listed (0.85–1.2) */
export const streamingCompanyAppeal = (platform: OwnedStreamingPlatformState) => {
    const members = Math.max(0, platform.metrics.subscribers || 0);
    const size = clamp(Math.log10(Math.max(1, members) / 1e6) / 1.5, 0, 1);
    const growth = clamp((platform.metrics.netSubscriberMovement || 0) / Math.max(50_000, members * 0.01), -1, 1);
    const prestige = clamp(((platform.competitiveWorld?.globalPrestige ?? 50) - 50) / 50, -1, 1);
    const listed = platform.publicCompany?.lifecycle === 'PUBLIC';
    const risky = platform.treasuryCash <= 0;
    const appeal = clamp(1 + 0.08 * size + 0.06 * growth + 0.05 * prestige - (risky ? 0.08 : 0) + (listed ? 0.04 : 0), 0.85, 1.2);
    return { appeal, size, growth, listed, risky };
};

export interface StreamingCandidateAsk {
    weekly: number;
    signing: number;
    /** % of the company */
    optionsPercent: number;
    /** what those options are worth today */
    optionsValue: number;
    /** leaving a job at a rival or a studio */
    poached: boolean;
}

/** a candidate's package: by who they are, and by who we are */
export const streamingCandidateAsk = (player: Player, platform: OwnedStreamingPlatformState, person: IndustryPerson): StreamingCandidateAsk => {
    const { appeal, size, listed } = streamingCompanyAppeal(platform);
    const employer = industryEmployerOf(player, person);
    const poached = employer.kind === 'RIVAL' || employer.kind === 'STUDIO';
    const weekly = roundTo(person.weeklyCompensation * (poached ? 1.15 : 1) * (1 - (appeal - 1) * 0.45), 5_000);
    const signing = roundTo(weekly * SIGNING_WEEKS[person.grade] * (poached ? 1.5 : 1), 50_000);
    const optionsPercent = Math.max(0.05, Math.round(OPTIONS_BASE[person.grade] * (0.6 + person.ambition / 125) * (listed ? 0.8 : 1) * (1.4 - 0.4 * size) * 20) / 20);
    return { weekly, signing, optionsPercent, optionsValue: Math.round(getStreamingEquityValuation(platform) * optionsPercent / 100), poached };
};

/** the chance they take 15% less: the ambitious push back; an attractive company is easier to say yes to */
export const streamingLowerOfferChance = (person: Pick<IndustryPerson, 'ambition'>, appeal: number) => clamp(0.75 - (person.ambition - 50) / 150 + (appeal - 1), 0.25, 0.9);

const shuffled = <T,>(list: T[], rng: () => number) => {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(rng() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
};

const unavailableIds = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => new Set(platform.leadership.appointments
    .filter(item => item.status === 'ACTIVE' || (item.endedAtAbsoluteWeek !== null && absoluteWeek - item.endedAtAbsoluteWeek < LEFT_US_WEEKS))
    .map(item => item.executiveId));

/** three people for a chair's job: one high, one middle, one cheap with promise */
export const pickStreamingTeamCandidates = (
    player: Player, platform: OwnedStreamingPlatformState, seatId: StreamingTeamSeatId, set: number, exclude: Set<string>,
): IndustryPerson[] => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const roles = STREAMING_TEAM_SEAT_ROLES[seatId] as string[];
    const away = unavailableIds(platform, absoluteWeek);
    const eligible = getIndustryPeople(player).filter(person => (
        person.kind === 'EXECUTIVE' && person.role !== null && roles.includes(person.role) && !away.has(person.id)
        && industryEmployerOf(player, person).kind !== 'OURS'
    ));
    /* the pool runs dry before anyone is shown twice in a row */
    const fresh = eligible.filter(person => !exclude.has(person.id));
    const pool = shuffled(fresh.length >= 3 ? fresh : eligible, createDeterministicRng(`${industrySeedOf(player)}:candidates:${seatId}:${set}`));
    const picked: IndustryPerson[] = [];
    BANDS.forEach(band => {
        const found = pool.find(person => band.includes(person.grade) && !picked.includes(person));
        if (found) picked.push(found);
    });
    pool.forEach(person => { if (picked.length < 3 && !picked.includes(person)) picked.push(person); });
    return picked.slice(0, 3);
};

/** who a chair is shown now: the set the weekly close stored, or the same draw before it does */
export const streamingTeamCandidatesFor = (player: Player, platform: OwnedStreamingPlatformState, team: OwnedStreamingTeamState, seatId: StreamingTeamSeatId): IndustryPerson[] => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const set = streamingTeamCandidateSet(absoluteWeek);
    const market = team.market;
    const away = unavailableIds(platform, absoluteWeek);
    const stored = market && market.set === set ? market.shown[seatId] : undefined;
    const people = stored
        ? stored.map(id => getIndustryPerson(player, id)).filter((person): person is IndustryPerson => Boolean(person))
        : pickStreamingTeamCandidates(player, platform, seatId, set, new Set(market?.seen?.[seatId] || []));
    return people.filter(person => market?.refused?.[person.id] !== set && !away.has(person.id) && industryEmployerOf(player, person).kind !== 'OURS');
};

/**
 * The weekly close, when the set turns: the people a chair passed on may join a rival or a studio, and each chair is
 * shown its next three (never anyone it saw in the last 4 sets).
 */
export const refreshStreamingTeamMarket = (player: Player, platform: OwnedStreamingPlatformState, team: OwnedStreamingTeamState): { player: Player; team: OwnedStreamingTeamState } => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const set = streamingTeamCandidateSet(absoluteWeek);
    const market = team.market;
    if (market && market.set === set) return { player, team };
    const seed = industrySeedOf(player);
    let next = player;
    if (market) {
        const ours = new Set(platform.leadership.appointments.filter(item => item.status === 'ACTIVE').map(item => item.executiveId));
        const hirers = industryHirers();
        Object.values(market.shown).flat().filter((id): id is string => typeof id === 'string').forEach(id => {
            if (ours.has(id)) return;
            const rng = createDeterministicRng(`${seed}:passed-on:${id}:${market.set}`);
            if (rng() < PASSED_ON_HIRED) next = moveIndustryPerson(next, id, hirers[Math.floor(rng() * hirers.length) % hirers.length]);
        });
    }
    const shown: Partial<Record<StreamingTeamSeatId, string[]>> = {};
    const seen: Partial<Record<StreamingTeamSeatId, string[]>> = { ...(market?.seen || {}) };
    STREAMING_TEAM_SEATS.forEach(seatId => {
        const picks = pickStreamingTeamCandidates(next, platform, seatId, set, new Set(seen[seatId] || [])).map(person => person.id);
        shown[seatId] = picks;
        seen[seatId] = [...(seen[seatId] || []), ...picks].slice(-SEEN_SETS * 3);
    });
    const refused = Object.fromEntries(Object.entries(market?.refused || {}).filter(([, at]) => at >= set - 1));
    return { player: next, team: { ...team, market: { set, shown, seen, refused } } };
};

/** how much of an executive's options have vested: a sixteenth each full quarter */
export const streamingOptionsVested = (options: NonNullable<OwnedStreamingExecutiveAppointment['options']>, absoluteWeek: number) => (
    clamp(Math.floor(Math.max(0, absoluteWeek - options.grantedAtAbsoluteWeek) / 13) / OPTIONS_VEST_QUARTERS, 0, 1)
);

/** new options: every holder is diluted by the grant, and the team's pool holds it */
export const grantStreamingTeamOptions = (platform: OwnedStreamingPlatformState, percent: number, absoluteWeek: number): OwnedStreamingPlatformState => {
    if (percent <= 0) return platform;
    const keep = 1 - percent / 100;
    const holders = platform.finance.equityHolders.map(holder => ({ ...holder, ownershipPercent: round3(holder.ownershipPercent * keep) }));
    const pool = holders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER);
    return {
        ...platform,
        founderOwnershipPercent: round3(platform.founderOwnershipPercent * keep),
        finance: {
            ...platform.finance,
            equityHolders: pool
                ? holders.map(holder => (holder === pool ? { ...holder, ownershipPercent: round3(holder.ownershipPercent + percent) } : holder))
                : [...holders, {
                    id: createDeterministicId('streaming_equity', platform.simulationSeed, 'team-options'),
                    holderName: TEAM_OPTIONS_HOLDER,
                    ownershipPercent: round3(percent),
                    investedCapital: 0,
                    issuedAtAbsoluteWeek: absoluteWeek,
                }],
        },
    };
};

/** options returned: they leave the pool, and every other holder's share grows back */
const returnStreamingTeamOptions = (platform: OwnedStreamingPlatformState, percent: number): OwnedStreamingPlatformState => {
    const pool = platform.finance.equityHolders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER);
    const back = pool ? Math.min(percent, pool.ownershipPercent) : 0;
    if (back <= 0) return platform;
    const grow = 100 / (100 - back);
    return {
        ...platform,
        founderOwnershipPercent: round3(platform.founderOwnershipPercent * grow),
        finance: {
            ...platform.finance,
            equityHolders: platform.finance.equityHolders
                .map(holder => (holder === pool ? { ...holder, ownershipPercent: holder.ownershipPercent - back } : holder))
                .filter(holder => holder.holderName !== TEAM_OPTIONS_HOLDER || holder.ownershipPercent > 0.0005)
                .map(holder => ({ ...holder, ownershipPercent: round3(holder.ownershipPercent * grow) })),
        },
    };
};

/** whoever left returns the options not vested by the week they left (once) */
export const settleDepartedStreamingOptions = (platform: OwnedStreamingPlatformState): OwnedStreamingPlatformState => {
    let next = platform;
    platform.leadership.appointments.forEach(appointment => {
        if (appointment.status === 'ACTIVE' || !appointment.options || appointment.options.settledAtAbsoluteWeek !== undefined) return;
        const ended = appointment.endedAtAbsoluteWeek ?? appointment.appointedAtAbsoluteWeek;
        const unvested = appointment.options.percent * (1 - streamingOptionsVested(appointment.options, ended));
        next = returnStreamingTeamOptions(next, unvested);
        next = {
            ...next,
            leadership: {
                ...next.leadership,
                appointments: next.leadership.appointments.map(item => (item.id === appointment.id
                    ? { ...item, options: { ...item.options!, settledAtAbsoluteWeek: ended } } : item)),
            },
        };
    });
    return next;
};

/** where a candidate works now, said plainly */
export const streamingCandidateWhere = (employer: IndustryEmployer) => (employer.kind === 'FREE' ? 'Between roles' : `At ${employer.name}`);
