/** #228: what the screen does with an action that needs a yes: count the votes, then run it if they carried */
import assert from 'node:assert/strict';
import type { Player } from '../../types';
import type { StreamingApprovalVote } from '../../services/streamingApproval';
import { getStreamingApprovalMeeting, settleStreamingApproval, type StreamingApprovalCall } from '../../services/streamingApprovalMeeting';

export const atTheTable = <R extends { player: Player; changed: boolean; message?: string; vote?: StreamingApprovalVote }>(
    player: Player,
    result: R,
    run: (next: Player) => R,
    call: StreamingApprovalCall | null = null,
) => {
    assert.ok(result.vote, `it goes to the table, but said: ${result.message}`);
    const meeting = getStreamingApprovalMeeting(player, result.vote!.ask, result.vote!.context);
    const counted = settleStreamingApproval(player, meeting, call);
    return { meeting, carried: counted.carried, forPercent: counted.forPercent, player: counted.player, done: counted.carried ? run(counted.player) : null };
};
