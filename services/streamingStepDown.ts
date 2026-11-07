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
import { spendStreamingApproval, streamingApprovalGate, type StreamingApprovalVote } from './streamingApproval';
import type { OwnedStreamingLedgerEntry, OwnedStreamingPlatformState, Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { createDeterministicId } from './deterministicRandom';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { enactStreamingSuccession, getStreamingSuccessionCandidates, streamingConnectionCeo } from './streamingLegacy';
import { STREAMING_TEAM_JOBS } from './team/teamState';
import { streamingFounderHasNoTie, streamingFounderLeaves } from './streamingControl';

export type StreamingStepDownRole = 'EXECUTIVE_CHAIR' | 'LEAVE_BOARD';
export interface StreamingStepDownResult { player: Player; changed: boolean; message: string; vote?: StreamingApprovalVote }

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
    if (!plan) return { player, changed: false, message: 'Choose a successor first.' };
    const enacted = enactStreamingSuccession(player, role === 'EXECUTIVE_CHAIR' ? 'EXECUTIVE_CHAIR' : 'FOUNDER_EMERITUS');
    if (!enacted.changed) return { player, changed: false, message: enacted.reason === 'TOO_YOUNG' ? `${plan.candidateName} can take over at 18.` : enacted.reason === 'EXECUTIVE_NOT_ACTIVE' ? 'Your named successor is no longer on the team. Name another.' : 'You cannot step down now.' };
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
    /* #205: leaving the board with no shares ends your last tie */
    const out = streamingFounderHasNoTie(handed.founderOwnershipPercent, handed);
    return {
        changed: true,
        message: out
            ? `${successor?.name || 'Your successor'} is Chief Executive. You hold no shares and no office: you have left ${platform.identity?.name || 'the company'}.`
            : `${successor?.name || 'Your successor'} is Chief Executive. ${role === 'EXECUTIVE_CHAIR' ? 'You chair the board.' : 'You keep your shares and leave the board.'}`,
        player: { ...enacted.player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(out ? streamingFounderLeaves(handed, getAbsoluteWeek(player.age, player.currentWeek), 0) : handed, player.id) },
    };
};

/** a chair's other powers (a director, a sale, a listing), under 51%: the board has to trust them */
export const streamingChairMayAct = (platform: OwnedStreamingPlatformState) => platform.founderOwnershipPercent >= 51 || platform.governance.boardConfidence >= STREAMING_RETURN_CONFIDENCE;

/** coming back as CEO: yours at 51% or more; under it, the board votes, and its no holds for 4 weeks */
export const getStreamingReturnTerms = (platform: OwnedStreamingPlatformState, absoluteWeek?: number) => {
    const founder = platform.founderOwnershipPercent;
    if (founder >= 51) return { by: 'YOURS' as const, allowed: true, line: 'At 51% or more, this is yours to decide.' };
    const gate = absoluteWeek === undefined ? null : streamingApprovalGate(platform, { kind: 'CEO_RETURN' }, absoluteWeek);
    return { by: 'BOARD' as const, allowed: gate?.state !== 'BLOCKED', line: gate?.state === 'BLOCKED' ? gate.line : 'Under 51%, the board votes on it.' };
};

export const returnAsStreamingCeo = (player: Player): StreamingStepDownResult => {
    const platform = platformOf(player);
    const successor = streamingChiefExecutive(platform);
    if (!successor) return { player, changed: false, message: 'You are the Chief Executive.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const terms = getStreamingReturnTerms(platform, absoluteWeek);
    if (!terms.allowed) return { player, changed: false, message: terms.line };
    const ask = { kind: 'CEO_RETURN' as const };
    if (terms.by === 'BOARD' && streamingApprovalGate(platform, ask, absoluteWeek).state === 'ASK') {
        return { player, changed: false, message: '', vote: { ask, context: {
            currentSkill: successor.skill,
            headline: player.name,
            chip: `${successor.name} goes back to their chair`,
            what: `Back as Chief Executive. ${successor.name} runs the company now, with a skill of ${Math.round(successor.skill)}.`,
            title: `You are Chief Executive again`,
        } } };
    }
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
        leadership: {
            ...platform.leadership,
            /* #203: someone from your connections has no chair to go back to; the handover was the story, so no second one */
            appointments: platform.leadership.appointments.map(item => (item.executiveId === successor.executiveId && item.role === 'CEO'
                ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek, exit: { reason: 'RESIGNED' as const, sudden: false, pricedAtAbsoluteWeek: absoluteWeek } } : item)),
            currentCeo: { holderType: 'FOUNDER', executiveId: null, sinceAbsoluteWeek: absoluteWeek },
        },
        /* the successor stays named, ready for the next time */
        legacy: { ...platform.legacy, founderOfficeRole: 'FOUNDER_CEO', successionPlan: plan ? { ...plan, status: 'DESIGNATED' } : plan },
        eventLedger: [...platform.eventLedger, fact],
    };
    return {
        changed: true,
        message: terms.by === 'YOURS' ? 'You are Chief Executive again.' : 'The board agreed: you are Chief Executive again.',
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(spendStreamingApproval(back, ask), player.id) },
    };
};

/**
 * #204: as chair, replace the chief executive: yours at 51% or more; under it the board's, from 60 confidence; one
 * handover at a time. An executive goes back to their chair; someone from your connections leaves. The board and the
 * market react to the new one's skill, as to any new chief executive.
 */
export const replaceStreamingCeo = (player: Player, type: 'EXECUTIVE' | 'FAMILY_HEIR', candidateId: string): StreamingStepDownResult => {
    const platform = platformOf(player);
    const current = streamingChiefExecutive(platform);
    if (!current) return { player, changed: false, message: 'You are the Chief Executive.' };
    if (platform.legacy.founderOfficeRole !== 'EXECUTIVE_CHAIR') return { player, changed: false, message: 'Off the board, you cannot replace them.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const wait = streamingHandoverWait(platform, absoluteWeek);
    if (wait > 0) return { player, changed: false, message: gapMessage(wait) };
    const candidate = getStreamingSuccessionCandidates(player).find(item => item.type === type && item.id === candidateId);
    if (!candidate) return { player, changed: false, message: 'They cannot take over now.' };
    if (!candidate.canOperateNow) return { player, changed: false, message: `${candidate.name} can take over at 18.` };
    if (type === 'EXECUTIVE' && candidateId === current.executiveId) return { player, changed: false, message: `${current.name} already runs it.` };
    const replaceAsk = { kind: 'CEO_REPLACE' as const, refId: candidateId };
    if (platform.founderOwnershipPercent < 51) {
        const gate = streamingApprovalGate(platform, replaceAsk, absoluteWeek);
        if (gate.state === 'BLOCKED') return { player, changed: false, message: gate.line };
        if (gate.state === 'ASK') {
            return { player, changed: false, message: '', vote: { ask: replaceAsk, context: {
                skill: candidate.readinessScore,
                currentSkill: current.skill,
                headline: candidate.name,
                chip: `Skill ${Math.round(candidate.readinessScore)} for ${Math.round(current.skill)}`,
                chipWarn: candidate.readinessScore < current.skill,
                what: `${candidate.name} takes over from ${current.name}.`,
                title: `${candidate.name} runs the company now`,
            } } };
        }
    }
    const relationship = type === 'FAMILY_HEIR' ? (player.relationships || []).find(item => item.id === candidateId) : null;
    const joining = relationship ? streamingConnectionCeo(platform, relationship, candidate.readinessScore, absoluteWeek) : null;
    const next = joining || platform.leadership.appointments.find(item => item.executiveId === candidateId && item.status === 'ACTIVE');
    if (!next) return { player, changed: false, message: 'They are no longer on the team.' };
    const key = `streaming-successor-appointed:${absoluteWeek}:${next.executiveId}`;
    const fact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'SUCCESSOR_APPOINTED',
        summary: `${next.nameAtAppointment} became Chief Executive, replacing ${current.name}.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId: next.executiveId, founderRoleAfter: 'EXECUTIVE_CHAIR', readinessScore: candidate.readinessScore },
    };
    const replaced: OwnedStreamingPlatformState = {
        ...platform,
        governance: { ...platform.governance, boardConfidence: clamp(platform.governance.boardConfidence + boardLift(next.skill) - Math.max(0, boardLift(current.skill)), 0, 100) },
        leadership: {
            ...platform.leadership,
            appointments: [
                ...platform.leadership.appointments.map(item => (item.executiveId === current.executiveId && item.role === 'CEO'
                    ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: absoluteWeek, exit: { reason: 'RESIGNED' as const, sudden: false, pricedAtAbsoluteWeek: absoluteWeek, wasCeo: true } } : item)),
                ...(joining ? [joining] : []),
            ],
            currentCeo: { holderType: 'EXECUTIVE', executiveId: next.executiveId, sinceAbsoluteWeek: absoluteWeek },
        },
        eventLedger: [...platform.eventLedger, fact],
    };
    return {
        changed: true,
        message: `${next.nameAtAppointment} is Chief Executive.`,
        player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(spendStreamingApproval(replaced, replaceAsk), player.id) },
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
    /** #228: who decides, in words */
    returnLine: string;
    /** #205: you hold no shares: leaving the board would be leaving altogether */
    noShares: boolean;
}

export const getStreamingStepDownView = (player: Player): StreamingStepDownView | null => {
    const platform = platformOf(player);
    if (!platform.identity || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return null;
    const ceo = streamingChiefExecutive(platform);
    const plan = platform.legacy.successionPlan;
    const named = plan && plan.candidateType === 'EXECUTIVE'
        ? platform.leadership.appointments.find(item => item.executiveId === plan.candidateId && item.status === 'ACTIVE') || null : null;
    /* #203: someone from your connections */
    const connection = plan && plan.candidateType === 'FAMILY_HEIR'
        ? getStreamingSuccessionCandidates(player).find(item => item.type === 'FAMILY_HEIR' && item.id === plan.candidateId) || null : null;
    const terms = getStreamingReturnTerms(platform, getAbsoluteWeek(player.age, player.currentWeek));
    return {
        ceo: ceo ? { you: false, name: ceo.name, skill: ceo.skill, since: ceo.since } : { you: true, name: player.name, skill: 0, since: platform.leadership.currentCeo.sinceAbsoluteWeek },
        role: platform.legacy.founderOfficeRole,
        successor: named ? { name: named.nameAtAppointment, skill: named.skill } : connection ? { name: connection.name, skill: connection.readinessScore } : null,
        stepDownBlocked: ceo ? null : !plan ? 'Choose a successor first.' : connection && !connection.canOperateNow ? `${connection.name} can take over at 18.` : !named && !connection ? 'Your named successor is no longer on the team.'
            : streamingHandoverWait(platform, getAbsoluteWeek(player.age, player.currentWeek)) > 0 ? gapMessage(streamingHandoverWait(platform, getAbsoluteWeek(player.age, player.currentWeek))) : null,
        returnBy: terms.by,
        returnAllowed: terms.allowed,
        returnLine: terms.line,
        boardConfidence: platform.governance.boardConfidence,
        noShares: platform.founderOwnershipPercent <= 0.005,
    };
};
