/**
 * #191 (plan §22.4, §22.7 Q5): stepping down.
 *
 * TEAM › If you step down › Step down, as Executive Chair (you keep your shares and your board seat) or leaving the
 * board (your shares only). The successor you named becomes Chief Executive (`enactStreamingSuccession`, written for
 * this and never called until now) and runs the company through the team: every job they can do themselves is set to
 * Do it, and their own skill carries the results the team brings. The board's confidence and, once listed, the share
 * price react to who they are. You can come back as CEO: at 51% or more it is yours; under it the board decides, and
 * agrees from 60 confidence.
 */
import type { OwnedStreamingLedgerEntry, OwnedStreamingPlatformState, Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { createDeterministicId } from './deterministicRandom';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { enactStreamingSuccession } from './streamingLegacy';
import { STREAMING_TEAM_JOBS } from './team/teamState';

export type StreamingStepDownRole = 'EXECUTIVE_CHAIR' | 'LEAVE_BOARD';
export interface StreamingStepDownResult { player: Player; changed: boolean; message: string }

/** the board takes the founder back from this confidence when the founder no longer holds 51% */
export const STREAMING_RETURN_CONFIDENCE = 60;
/** #192: the board takes one handover at a time: 26 weeks between a handover and the next */
export const STREAMING_HANDOVER_GAP_WEEKS = 26;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

/** the chief executive this week: you, or your successor (with their skill) */
export const streamingChiefExecutive = (platform: OwnedStreamingPlatformState) => {
    const ceo = platform.leadership.currentCeo;
    if (ceo.holderType !== 'EXECUTIVE' || !ceo.executiveId) return null;
    const appointment = platform.leadership.appointments.find(item => item.executiveId === ceo.executiveId && item.status === 'ACTIVE');
    return appointment ? { name: appointment.nameAtAppointment, skill: appointment.skill, since: ceo.sinceAbsoluteWeek, executiveId: ceo.executiveId } : null;
};

/** the market's view of a new chief executive: a lift for a strong one, a drop for a weak one (−5% to +5%) */
export const streamingSuccessorMove = (skill: number) => clamp((skill - 60) / 800, -0.05, 0.05);
/** the board's view of one: (skill − 60) ÷ 4 */
const boardLift = (skill: number) => Math.round((skill - 60) / 4);

/** #192: weeks until the board takes another handover (0 when it would) */
export const streamingHandoverWait = (platform: OwnedStreamingPlatformState, absoluteWeek: number) => {
    const last = [...platform.eventLedger].reverse().find(entry => entry.type === 'SUCCESSOR_APPOINTED'
        || (entry.type === 'FOUNDER_ROLE_CHANGED' && entry.idempotencyKey.startsWith('streaming-founder-returned:')));
    return last ? Math.max(0, last.absoluteWeek + STREAMING_HANDOVER_GAP_WEEKS - absoluteWeek) : 0;
};
const gapMessage = (weeks: number) => `The board takes one handover at a time: the next in ${weeks} week${weeks === 1 ? '' : 's'}.`;

/** TEAM › If you step down › Step down */
export const stepDownFromStreamingCompany = (player: Player, role: StreamingStepDownRole): StreamingStepDownResult => {
    const platform = platformOf(player);
    if (!platform.identity || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return { player, changed: false, message: 'You can step down once the service is live.' };
    if (platform.leadership.currentCeo.holderType === 'EXECUTIVE') return { player, changed: false, message: 'You have already stepped down.' };
    const wait = streamingHandoverWait(platform, getAbsoluteWeek(player.age, player.currentWeek));
    if (wait > 0) return { player, changed: false, message: gapMessage(wait) };
    const plan = platform.legacy.successionPlan;
    if (!plan) return { player, changed: false, message: 'Name a successor first.' };
    if (plan.candidateType === 'FAMILY_HEIR') return { player, changed: false, message: 'A family heir takes over by inheritance. Name an executive to step down now.' };
    const enacted = enactStreamingSuccession(player, role === 'EXECUTIVE_CHAIR' ? 'EXECUTIVE_CHAIR' : 'FOUNDER_EMERITUS');
    if (!enacted.changed) return { player, changed: false, message: enacted.reason === 'EXECUTIVE_NOT_ACTIVE' ? 'Your named successor is no longer on the team. Name another.' : 'You cannot step down now.' };
    const next = platformOf(enacted.player);
    const successor = streamingChiefExecutive(next);
    /* the successor runs the company through the team: every job they can do themselves, they do */
    const team = next.leadership.team;
    const seats = team ? team.seats.map(seat => ({
        ...seat,
        jobs: Object.fromEntries(Object.entries(seat.jobs).map(([jobId, mode]) => {
            const job = STREAMING_TEAM_JOBS.find(item => item.id === jobId);
            return [jobId, job && job.modes.includes('DO') ? 'DO' : mode];
        })) as typeof seat.jobs,
    })) : null;
    const confidence = clamp(next.governance.boardConfidence + boardLift(successor?.skill ?? 60), 0, 100);
    const handed: OwnedStreamingPlatformState = {
        ...next,
        leadership: { ...next.leadership, ...(team && seats ? { team: { ...team, seats } } : {}) },
        governance: { ...next.governance, boardConfidence: confidence },
    };
    return {
        changed: true,
        message: `${successor?.name || 'Your successor'} is Chief Executive. ${role === 'EXECUTIVE_CHAIR' ? 'You chair the board.' : 'You keep your shares and leave the board.'}`,
        player: { ...enacted.player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(handed, player.id) },
    };
};

/** coming back as CEO: yours at 51% or more; under it, the board decides */
export const getStreamingReturnTerms = (platform: OwnedStreamingPlatformState) => {
    const founder = platform.founderOwnershipPercent;
    if (founder >= 51) return { by: 'YOURS' as const, allowed: true };
    return { by: 'BOARD' as const, allowed: platform.governance.boardConfidence >= STREAMING_RETURN_CONFIDENCE };
};

export const returnAsStreamingCeo = (player: Player): StreamingStepDownResult => {
    const platform = platformOf(player);
    const successor = streamingChiefExecutive(platform);
    if (!successor) return { player, changed: false, message: 'You are the Chief Executive.' };
    const terms = getStreamingReturnTerms(platform);
    if (!terms.allowed) return { player, changed: false, message: `The board backs ${successor.name}: it wants them to stay (confidence ${platform.governance.boardConfidence}, it needs ${STREAMING_RETURN_CONFIDENCE}).` };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `streaming-founder-returned:${absoluteWeek}`;
    const fact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'FOUNDER_ROLE_CHANGED',
        summary: `${player.name} returned as Chief Executive; ${successor.name} went back to their chair.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId: successor.executiveId, by: terms.by },
    };
    const plan = platform.legacy.successionPlan;
    /* #192: the board gives back the lift a strong successor brought, and a little more for the change */
    const confidence = clamp(platform.governance.boardConfidence - Math.max(0, boardLift(successor.skill)) - 2, 0, 100);
    const back: OwnedStreamingPlatformState = {
        ...platform,
        governance: { ...platform.governance, boardConfidence: confidence },
        leadership: { ...platform.leadership, currentCeo: { holderType: 'FOUNDER', executiveId: null, sinceAbsoluteWeek: absoluteWeek } },
        /* the successor stays named, ready for the next time */
        legacy: { ...platform.legacy, founderOfficeRole: 'FOUNDER_CEO', successionPlan: plan ? { ...plan, status: 'DESIGNATED' } : plan },
        eventLedger: [...platform.eventLedger, fact],
    };
    return {
        changed: true,
        message: terms.by === 'YOURS' ? 'You are Chief Executive again.' : 'The board agreed: you are Chief Executive again.',
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(back, player.id) },
    };
};

/** TEAM's view of it */
export interface StreamingStepDownView {
    /** who runs the company */
    ceo: { you: boolean; name: string; skill: number; since: number };
    role: 'FOUNDER_CEO' | 'EXECUTIVE_CHAIR' | 'FOUNDER_EMERITUS';
    /** stepping down: who would take over, or why not */
    successor: { name: string; skill: number } | null;
    stepDownBlocked: string | null;
    /** coming back */
    returnBy: 'YOURS' | 'BOARD';
    returnAllowed: boolean;
    boardConfidence: number;
}

export const getStreamingStepDownView = (player: Player): StreamingStepDownView | null => {
    const platform = platformOf(player);
    if (!platform.identity || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return null;
    const ceo = streamingChiefExecutive(platform);
    const plan = platform.legacy.successionPlan;
    const named = plan && plan.candidateType === 'EXECUTIVE'
        ? platform.leadership.appointments.find(item => item.executiveId === plan.candidateId && item.status === 'ACTIVE') || null : null;
    const terms = getStreamingReturnTerms(platform);
    return {
        ceo: ceo ? { you: false, name: ceo.name, skill: ceo.skill, since: ceo.since } : { you: true, name: player.name, skill: 0, since: platform.leadership.currentCeo.sinceAbsoluteWeek },
        role: platform.legacy.founderOfficeRole,
        successor: named ? { name: named.nameAtAppointment, skill: named.skill } : null,
        stepDownBlocked: ceo ? null : !plan ? 'Name a successor first.' : plan.candidateType === 'FAMILY_HEIR' ? 'A family heir takes over by inheritance. Name an executive to step down now.' : !named ? 'Your named successor is no longer on the team.'
            : streamingHandoverWait(platform, getAbsoluteWeek(player.age, player.currentWeek)) > 0 ? gapMessage(streamingHandoverWait(platform, getAbsoluteWeek(player.age, player.currentWeek))) : null,
        returnBy: terms.by,
        returnAllowed: terms.allowed,
        boardConfidence: platform.governance.boardConfidence,
    };
};
