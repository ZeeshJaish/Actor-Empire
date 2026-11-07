/**
 * #228 (plan §25.3, §25.8): where someone else must say yes. Zeesh (2026-11-04): "jaise kisi kisi cheez me board ya team
 * approval chaiye hota hai to i hope ki jaha ho button dabane ke bad hm log ko approval screeen khule jaha sab bote daal rhe
 * apna , just like how we do when filing ipo".
 *
 * This file is only the record of what was voted. An action that needs a yes asks `streamingApprovalGate`:
 *   ASK      nobody has been asked yet: the action answers `needsVote`, and the screen opens the table
 *   CARRIED  the table said yes this week, for this and this amount: the action goes ahead and spends it
 *   BLOCKED  the table said no, and will not hear it again for 4 weeks; or it has met on this already this week
 * What each seat votes, and why, is in streamingApprovalMeeting.ts.
 */
import type { OwnedStreamingApprovalRecord, OwnedStreamingPlatformState } from '../types';

export const STREAMING_APPROVAL_NO_WEEKS = 4;
const KEPT = 12;

export type StreamingApprovalKind = OwnedStreamingApprovalRecord['kind'];

export interface StreamingApprovalAsk {
    kind: StreamingApprovalKind;
    /** what it is about, where it can be about several things: a bid, a director, a candidate */
    refId?: string;
    /** the money or the figure asked for: a yes covers this and nothing else */
    amount?: number;
}

/** everything the ask needs to be judged, from the action that raised it */
export interface StreamingApprovalContext {
    /** the money that leaves the treasury, for the CFO's read */
    cost?: number;
    /** how far the ask is from what is normal: 1 is normal */
    ratio?: number;
    /** a bid's premium over the company's worth */
    premium?: number;
    /** the public's share for it, 0 to 1, when the holders are counted */
    publicFor?: number;
    /** how good the person it is about is, 0 to 100 */
    skill?: number;
    /** how good the one they would replace is */
    currentSkill?: number;
    /** a dividend being cut */
    cut?: boolean;
    /** the words on the screen */
    headline: string;
    chip: string;
    chipWarn?: boolean;
    what: string;
    /** what happened, if it carries */
    title: string;
}

/** an action's answer when someone else must say yes first */
export interface StreamingApprovalVote { ask: StreamingApprovalAsk; context: StreamingApprovalContext }

export type StreamingApprovalGate =
    | { state: 'ASK' }
    | { state: 'CARRIED' }
    | { state: 'BLOCKED'; weeks: number; line: string };

export const streamingApprovalKey = (ask: StreamingApprovalAsk) => `${ask.kind}:${ask.refId || ''}`;

const heardBy = (row: OwnedStreamingApprovalRecord) => (row.mode === 'HOLDERS' ? 'The shareholders' : 'The board');

export const streamingApprovalGate = (platform: OwnedStreamingPlatformState, ask: StreamingApprovalAsk, absoluteWeek: number): StreamingApprovalGate => {
    const key = streamingApprovalKey(ask);
    const rows = (platform.governance.approvals || []).filter(row => row.key === key);
    if (rows.some(row => row.carried && !row.spent && row.atAbsoluteWeek === absoluteWeek && (row.amount ?? null) === (ask.amount ?? null))) return { state: 'CARRIED' };
    const lastNo = [...rows].reverse().find(row => !row.carried);
    const weeks = lastNo ? lastNo.atAbsoluteWeek + STREAMING_APPROVAL_NO_WEEKS - absoluteWeek : 0;
    if (lastNo && weeks > 0) {
        return { state: 'BLOCKED', weeks, line: `${heardBy(lastNo)} said no. ${heardBy(lastNo) === 'The board' ? 'It hears' : 'They hear'} this again in ${weeks} week${weeks === 1 ? '' : 's'}.` };
    }
    const met = rows.find(row => row.carried && row.atAbsoluteWeek === absoluteWeek);
    if (met) return { state: 'BLOCKED', weeks: 1, line: `${heardBy(met)} already met on this this week. Ask again next week.` };
    return { state: 'ASK' };
};

/** the vote's result, on the record */
export const recordStreamingApproval = (
    platform: OwnedStreamingPlatformState,
    row: OwnedStreamingApprovalRecord,
    confidenceAfter: number,
): OwnedStreamingPlatformState => ({
    ...platform,
    governance: {
        ...platform.governance,
        boardConfidence: confidenceAfter,
        approvals: [...(platform.governance.approvals || []), row].slice(-KEPT),
    },
});

/** the yes is used: asking again takes another meeting */
export const spendStreamingApproval = (platform: OwnedStreamingPlatformState, ask: StreamingApprovalAsk): OwnedStreamingPlatformState => {
    const key = streamingApprovalKey(ask);
    const rows = platform.governance.approvals;
    if (!rows?.some(row => row.key === key && row.carried && !row.spent)) return platform;
    return { ...platform, governance: { ...platform.governance, approvals: rows.map(row => (row.key === key && row.carried && !row.spent ? { ...row, spent: true } : row)) } };
};
