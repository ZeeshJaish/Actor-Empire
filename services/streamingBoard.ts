/**
 * #201 (plan §23.8): the board of directors as people who come and go. Zeesh (2026-11-04): "agar koi board leave kare to
 * stock me bhi impact kare , news me bhi".
 *
 * #217 (plan §24): "बोर्ड का हटना रहना भी थोड़ा सेट करना होगा। बोर्ड हम लोग जब चूज़ करें तो वहाँ भी जैसे कैसे हम लोग 3-4
 * ऑप्शंस मिलते हैं, वो टाइम टाइम रोटेट होता है ... बोर्ड डिच भी कर सकते हैं".
 *
 *   Coming: Find a director: four people from the industry, a new set every 4 weeks, each with their past, what they
 *     bring to the board's confidence and their weekly fee. ⚡5.
 *   Staying: a 3-year term. 13 weeks before it ends you are asked (a popup, and on the board's sheet): Renew, or let it
 *     end. No answer, it ends. Under 40 confidence they will not stay. Off the board, it is not yours to ask: they stay
 *     or go by the board's confidence.
 *   Going: at the end of a term; in protest under 40 confidence; with their investor, for an investor's seat; or because
 *     you removed them. Removing an independent director is yours at 51%, else the board's from 60 confidence: ⚡5, 13
 *     weeks of their fee, and the others mind (confidence −4). An investor's seat goes only by buying them out.
 *
 * A director going moves the price once listed (end of a term −0.5%, removed −1.5%, in protest −3%), and the board's
 * confidence while private; the news carries it.
 */
import type {
    Gender,
    OwnedStreamingBoardDirector,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    Player,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { industryCareerOf, type IndustryCareerView } from './industry/industryCareer';
import {
    findIndustryInvestor,
    getIndustryPeopleNow,
    getIndustryPerson,
    industryEmployerOf,
    industryPersonNow,
    industryPersonWorking,
    industrySeedOf,
    type IndustryGrade,
    type IndustryPerson,
} from './industry/industryPeople';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import { spendStreamingApproval, streamingApprovalGate, type StreamingApprovalVote } from './streamingApproval';
import { STREAMING_INDEPENDENT_DIRECTORS } from './streamingLeadershipGovernance';

export const STREAMING_BOARD_TERM_WEEKS = 156;
export const STREAMING_BOARD_FIND_ENERGY = 5;
export const STREAMING_BOARD_REMOVE_ENERGY = 5;
/** independent seats */
export const STREAMING_BOARD_SEATS = 3;
/** new people every 4 weeks, four at a time */
export const STREAMING_BOARD_SET_WEEKS = 4;
export const STREAMING_BOARD_CANDIDATES = 4;
/** how long before a term ends you are asked */
export const STREAMING_BOARD_RENEW_WEEKS = 13;
const REMOVE_FEE_WEEKS = 13;
const REMOVE_CONFIDENCE = 4;
const CONTROL = 51;
const PROTEST_BELOW = 40;
const PROTEST_CHANCE = 0.04;
const LIST_NEEDS = 55;

export type StreamingDirectorExitReason = NonNullable<OwnedStreamingBoardDirector['exit']>['reason'];

/** the price a director's exit moves, as a fraction */
export const streamingDirectorExitPriceMove = (reason: StreamingDirectorExitReason) => (reason === 'PROTEST' ? -0.03 : reason === 'REMOVED' ? -0.015 : -0.005);
const BOARD_MOVE = { TERM: -1, PROTEST: -4 };

export interface StreamingBoardDirectorView {
    id: string;
    name: string;
    gender: Gender | null;
    seat: 'Independent' | "Investor's seat";
    /** what they bring */
    line: string;
    /** weeks left in the term; null for a nominee */
    weeksLeft: number | null;
    weekly: number;
    /** where they have worked, for someone from the industry */
    career: IndustryCareerView | null;
    /** the term is coming up: Renew, or why not */
    renew: { allowed: boolean; line: string } | null;
    /** an independent director can be removed: what it costs, or why not; a nominee says how their seat goes */
    remove: { allowed: boolean; cost: number; energy: number; line: string };
}
export interface StreamingBoardCandidateView {
    id: string;
    name: string;
    gender: Gender | null;
    grade: IndustryGrade;
    line: string;
    weekly: number;
    /** what they add to the board's confidence */
    adds: number;
    career: IndustryCareerView;
}
export interface StreamingBoardView {
    confidence: number;
    /** what the confidence means right now */
    line: string;
    /** what the board decides, at your stake */
    about: string[];
    directors: StreamingBoardDirectorView[];
    candidates: StreamingBoardCandidateView[];
    seats: number;
    seatsLeft: number;
    energy: number;
    nextInWeeks: number;
    /** a term is coming up */
    termEnding: { name: string; weeksLeft: number } | null;
}

const FIRST_DIRECTOR_GENDER: Record<string, Gender> = { 'director-meera-sen': 'FEMALE', 'director-thomas-adebayo': 'MALE', 'director-lucia-reyes': 'FEMALE' };

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const isOffBoard = (platform: OwnedStreamingPlatformState) => platform.leadership.currentCeo.holderType === 'EXECUTIVE' && platform.legacy.founderOfficeRole === 'FOUNDER_EMERITUS';
const termEndOf = (director: OwnedStreamingBoardDirector) => director.termEndsAtAbsoluteWeek ?? director.appointedAtAbsoluteWeek + STREAMING_BOARD_TERM_WEEKS;

const confidenceLine = (confidence: number, active: number) => {
    if (active === 0) return 'Nobody sits on it. A public company needs at least one director.';
    if (confidence < PROTEST_BELOW) return 'Directors may resign in protest under 40.';
    if (confidence < LIST_NEEDS) return `Uneasy. Under ${LIST_NEEDS} you cannot list.`;
    if (confidence < 70) return 'Steady, and watching the numbers.';
    return 'The board trusts you.';
};

const aboutLines = (platform: OwnedStreamingPlatformState) => {
    const founder = platform.founderOwnershipPercent;
    const stake = `${Math.round(founder * 10) / 10}%`;
    return [
        founder >= CONTROL
            ? `You hold ${stake}, so it advises and you decide.`
            : `You hold ${stake}, so it decides: your pay, any dividend and the bids for the company. Under 40 for 13 weeks, it moves you to chair.`,
        platform.publicCompany.lifecycle === 'PUBLIC'
            ? 'The market watches it: a director going moves the price.'
            : `To list, you need at least 1 director and ${LIST_NEEDS} confidence.`,
    ];
};

const lineOf = (person: IndustryPerson | null, fallback: string) => (person ? `Was ${person.roleLabel} · ${person.specialty}` : fallback);

const roundFee = (value: number) => Math.max(10_000, Math.round(value / 5_000) * 5_000);
const feeOf = (person: IndustryPerson) => roundFee(person.weeklyCompensation * 0.35);
/** a star's name on the board counts for more */
const addsOf = (grade: IndustryGrade) => (grade === 'STAR' ? 5 : 3);

/** four people every 4 weeks: senior people from the industry, free or retired, who have not sat here before */
const candidatesFor = (player: Player, platform: OwnedStreamingPlatformState, absoluteWeek: number): IndustryPerson[] => {
    const seated = new Set(platform.governance.directors.map(item => item.candidateId));
    const ours = new Set(platform.leadership.appointments.filter(item => item.status === 'ACTIVE').map(item => item.executiveId));
    const set = Math.floor(absoluteWeek / STREAMING_BOARD_SET_WEEKS);
    const rng = createDeterministicRng(`${industrySeedOf(player)}:directors:${set}`);
    const pool = getIndustryPeopleNow(player).filter(person => {
        if (person.kind !== 'EXECUTIVE' || seated.has(person.id) || ours.has(person.id)) return false;
        const now = industryPersonNow(player, person);
        if (now.grade !== 'STAR' && now.grade !== 'SENIOR') return false;
        return industryEmployerOf(player, person).kind === 'FREE' || !industryPersonWorking(player, person);
    });
    const picked: IndustryPerson[] = [];
    while (picked.length < STREAMING_BOARD_CANDIDATES && pool.length) picked.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
    return picked;
};

const removeTerms = (platform: OwnedStreamingPlatformState, director: OwnedStreamingBoardDirector, investorName: string | null, absoluteWeek: number) => {
    const cost = director.weeklyCompensation * REMOVE_FEE_WEEKS;
    const base = { cost, energy: STREAMING_BOARD_REMOVE_ENERGY };
    if (director.seatType !== 'INDEPENDENT') return { ...base, allowed: false, line: `Sits for ${investorName || 'an investor'}. The seat goes when you buy them out, on OWNERSHIP.` };
    const founder = platform.founderOwnershipPercent;
    const gate = founder < CONTROL ? streamingApprovalGate(platform, { kind: 'REMOVE_DIRECTOR', refId: director.id }, absoluteWeek) : null;
    if (gate?.state === 'BLOCKED') return { ...base, allowed: false, line: gate.line };
    return {
        ...base,
        allowed: true,
        line: `${gate ? 'Under 51%, the board votes on it. ' : ''}Costs 13 weeks of their fee (${money(cost)}) and ⚡${STREAMING_BOARD_REMOVE_ENERGY}. The others mind: confidence −${REMOVE_CONFIDENCE}.${platform.publicCompany.lifecycle === 'PUBLIC' ? ' The market marks it down 1.5%, and the news carries it.' : ''}`,
    };
};

export const getStreamingBoardView = (player: Player): StreamingBoardView => {
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const active = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    const independents = active.filter(item => item.seatType === 'INDEPENDENT').length;
    const confidence = platform.governance.boardConfidence;
    const directors = active.map((item): StreamingBoardDirectorView => {
        const person = getIndustryPerson(player, item.candidateId);
        const name = item.name.replace(/ nominee$/, '');
        /* the first directors the game had, and an investor's own seat */
        const first = STREAMING_INDEPENDENT_DIRECTORS.find(candidate => candidate.id === item.candidateId);
        const investor = item.seatType === 'INVESTOR_NOMINEE' ? findIndustryInvestor(player, name) : null;
        const weeksLeft = item.seatType === 'INDEPENDENT' ? Math.max(0, termEndOf(item) - absoluteWeek) : null;
        return {
            id: item.id,
            name,
            gender: person?.gender ?? (first ? FIRST_DIRECTOR_GENDER[first.id] : null) ?? (investor?.person ? investor.gender : null),
            seat: item.seatType === 'INDEPENDENT' ? 'Independent' : "Investor's seat",
            line: first ? first.specialty : investor?.publicIdentity || lineOf(person, 'Sits for an investor'),
            weeksLeft,
            weekly: item.weeklyCompensation,
            career: person && item.seatType === 'INDEPENDENT' ? industryCareerOf(player, person) : null,
            renew: weeksLeft !== null && weeksLeft <= STREAMING_BOARD_RENEW_WEEKS && !isOffBoard(platform)
                ? confidence < PROTEST_BELOW
                    ? { allowed: false, line: `They will not stay: board confidence is ${confidence}.` }
                    : { allowed: true, line: `Three more years at ${money(item.weeklyCompensation)} a week. No answer, and they go when the term ends.` }
                : null,
            remove: removeTerms(platform, item, name, absoluteWeek),
        };
    });
    const ending = directors.filter(item => item.renew).sort((left, right) => (left.weeksLeft ?? 0) - (right.weeksLeft ?? 0))[0];
    return {
        confidence,
        line: confidenceLine(confidence, active.length),
        about: aboutLines(platform),
        directors,
        candidates: candidatesFor(player, platform, absoluteWeek).map(person => {
            const now = industryPersonNow(player, person);
            return { id: person.id, name: person.name, gender: person.gender, grade: now.grade, line: lineOf(now, ''), weekly: feeOf(now), adds: addsOf(now.grade), career: industryCareerOf(player, person) };
        }),
        seats: STREAMING_BOARD_SEATS,
        seatsLeft: Math.max(0, STREAMING_BOARD_SEATS - independents),
        energy: STREAMING_BOARD_FIND_ENERGY,
        nextInWeeks: STREAMING_BOARD_SET_WEEKS - (absoluteWeek % STREAMING_BOARD_SET_WEEKS),
        termEnding: ending ? { name: ending.name, weeksLeft: ending.weeksLeft ?? 0 } : null,
    };
};

export interface StreamingBoardResult { player: Player; changed: boolean; message?: string; vote?: StreamingApprovalVote }

/** a person from this set takes a seat */
export const appointStreamingBoardDirector = (player: Player, personId: string): StreamingBoardResult => {
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const person = candidatesFor(player, platform, absoluteWeek).find(item => item.id === personId);
    if (!person) return { player, changed: false, message: 'They are not available now.' };
    const independents = platform.governance.directors.filter(item => item.status === 'ACTIVE' && item.seatType === 'INDEPENDENT').length;
    if (independents >= STREAMING_BOARD_SEATS) return { player, changed: false, message: `All ${STREAMING_BOARD_SEATS} independent seats are taken.` };
    if ((player.energy?.current || 0) < STREAMING_BOARD_FIND_ENERGY) return { player, changed: false, message: `This takes ${STREAMING_BOARD_FIND_ENERGY}⚡.` };
    const rng = createDeterministicRng(`${industrySeedOf(player)}:director:${person.id}`);
    const now = industryPersonNow(player, person);
    const idempotencyKey = `board-director:${person.id}:${absoluteWeek}`;
    const director: OwnedStreamingBoardDirector = {
        id: createDeterministicId('streaming_board_director', platform.simulationSeed, idempotencyKey),
        candidateId: person.id,
        name: person.name,
        seatType: 'INDEPENDENT',
        status: 'ACTIVE',
        preferredStrategy: person.preferredStrategy,
        independence: Math.round(70 + rng() * 25),
        founderRelationship: Math.round(50 + rng() * 15),
        weeklyCompensation: feeOf(now),
        appointedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        linkedInvestorId: null,
        termEndsAtAbsoluteWeek: absoluteWeek + STREAMING_BOARD_TERM_WEEKS,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'BOARD_DIRECTOR_APPOINTED',
        summary: `${person.name} joined the board as an independent director.`,
        source: 'PLAYER_ACTION',
        metadata: { candidateId: person.id, weeklyCompensation: director.weeklyCompensation },
    };
    const next: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags } };
    spendPlayerEnergy(next, STREAMING_BOARD_FIND_ENERGY, `Board: ${person.name}`);
    return {
        changed: true,
        message: `${person.name} joins the board.`,
        player: {
            ...next,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                governance: {
                    ...platform.governance,
                    boardConfidence: Math.min(100, platform.governance.boardConfidence + addsOf(now.grade)),
                    directors: [...platform.governance.directors, director],
                },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

/** another three years, from the end of this term */
export const renewStreamingBoardDirector = (player: Player, directorId: string): StreamingBoardResult => {
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const director = platform.governance.directors.find(item => item.id === directorId && item.status === 'ACTIVE');
    if (!director || director.seatType !== 'INDEPENDENT') return { player, changed: false, message: 'They are not on the board now.' };
    if (termEndOf(director) - absoluteWeek > STREAMING_BOARD_RENEW_WEEKS) return { player, changed: false, message: 'Their term is not up yet.' };
    if (platform.governance.boardConfidence < PROTEST_BELOW) return { player, changed: false, message: `${director.name} will not stay: board confidence is ${platform.governance.boardConfidence}.` };
    return {
        changed: true,
        message: `${director.name} stays for three more years.`,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                governance: {
                    ...platform.governance,
                    directors: platform.governance.directors.map(item => (item.id === directorId ? { ...item, termEndsAtAbsoluteWeek: termEndOf(item) + STREAMING_BOARD_TERM_WEEKS } : item)),
                },
            }, player.id),
        },
    };
};

/** an independent director off the board, before the term is up */
export const removeStreamingBoardDirector = (player: Player, directorId: string): StreamingBoardResult => {
    const platform = platformOf(player);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const director = platform.governance.directors.find(item => item.id === directorId && item.status === 'ACTIVE');
    if (!director) return { player, changed: false, message: 'They are not on the board now.' };
    const terms = removeTerms(platform, director, director.name.replace(/ nominee$/, ''), absoluteWeek);
    if (!terms.allowed) return { player, changed: false, message: terms.line };
    if ((player.energy?.current || 0) < STREAMING_BOARD_REMOVE_ENERGY) return { player, changed: false, message: `This takes ${STREAMING_BOARD_REMOVE_ENERGY}⚡.` };
    if (platform.treasuryCash < terms.cost) return { player, changed: false, message: `13 weeks of their fee is ${money(terms.cost)}, more than the treasury holds.` };
    const ask = { kind: 'REMOVE_DIRECTOR' as const, refId: director.id };
    if (platform.founderOwnershipPercent < CONTROL && streamingApprovalGate(platform, ask, absoluteWeek).state === 'ASK') {
        return { player, changed: false, vote: { ask, context: {
            headline: director.name,
            chip: `Off the board · ${money(terms.cost)}`,
            chipWarn: true,
            what: 'Removing an independent director before the term is up. The others mind, whatever they vote.',
            title: `${director.name} is off the board. ${money(terms.cost)} paid`,
        } } };
    }
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    const key = `board-director-removed:${director.id}:${absoluteWeek}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'BOARD_DIRECTOR_REMOVED',
        summary: `${director.name} was removed from the board.`,
        source: 'PLAYER_ACTION',
        metadata: { candidateId: director.candidateId, paid: terms.cost },
    };
    const next: Player = { ...player, energy: { ...player.energy }, flags: { ...player.flags } };
    spendPlayerEnergy(next, STREAMING_BOARD_REMOVE_ENERGY, `Board: removed ${director.name}`);
    return {
        changed: true,
        message: `${director.name} is off the board. ${money(terms.cost)} paid.`,
        player: {
            ...next,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - terms.cost,
                governance: {
                    ...spendStreamingApproval(platform, ask).governance,
                    boardConfidence: Math.max(0, platform.governance.boardConfidence - REMOVE_CONFIDENCE),
                    directors: platform.governance.directors.map(item => (item.id === directorId ? {
                        ...item,
                        status: 'DEPARTED' as const,
                        endedAtAbsoluteWeek: absoluteWeek,
                        exit: { reason: 'REMOVED' as const, ...(listed ? {} : { pricedAtAbsoluteWeek: absoluteWeek }) },
                    } : item)),
                },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export interface StreamingBoardWeekNote { title: string; detail: string }

/** the week's run: terms end, and a board without confidence loses people */
export const streamingBoardWeek = (platform: OwnedStreamingPlatformState, absoluteWeek: number): { platform: OwnedStreamingPlatformState; notes: StreamingBoardWeekNote[] } => {
    const listed = platform.publicCompany.lifecycle === 'PUBLIC';
    const offBoard = isOffBoard(platform);
    let confidence = platform.governance.boardConfidence;
    const notes: StreamingBoardWeekNote[] = [];
    const directors = platform.governance.directors.map(director => {
        if (director.status !== 'ACTIVE' || director.seatType !== 'INDEPENDENT') return director;
        const rng = createDeterministicRng(`${platform.simulationSeed}:board:${director.id}:${absoluteWeek}`);
        /* one from before terms: its term runs from now */
        if (director.termEndsAtAbsoluteWeek === undefined) return { ...director, termEndsAtAbsoluteWeek: absoluteWeek + Math.round(26 + rng() * (STREAMING_BOARD_TERM_WEEKS - 26)) };
        let reason: 'TERM' | 'PROTEST' | null = null;
        if (absoluteWeek >= director.termEndsAtAbsoluteWeek) {
            /* #217: a term ends unless you renewed it; with you off the board, the board keeps its own if it can */
            if (offBoard && confidence >= 50 && rng() < 0.6) return { ...director, termEndsAtAbsoluteWeek: absoluteWeek + STREAMING_BOARD_TERM_WEEKS };
            reason = 'TERM';
        } else if (confidence < PROTEST_BELOW && rng() < PROTEST_CHANCE) {
            reason = 'PROTEST';
        }
        if (!reason) return director;
        if (!listed) confidence += BOARD_MOVE[reason];
        notes.push(reason === 'PROTEST'
            ? { title: `${director.name} resigned from the board in protest`, detail: `Board confidence is ${platform.governance.boardConfidence}. Find a director on OWNERSHIP.` }
            : { title: `${director.name} left the board`, detail: 'Their term is over. Find a director on OWNERSHIP.' });
        return {
            ...director,
            status: 'DEPARTED' as const,
            endedAtAbsoluteWeek: absoluteWeek,
            exit: { reason, ...(listed ? {} : { pricedAtAbsoluteWeek: absoluteWeek }) },
        };
    });
    return {
        platform: { ...platform, governance: { ...platform.governance, directors, boardConfidence: Math.round(Math.max(0, Math.min(100, confidence))) } },
        notes,
    };
};
