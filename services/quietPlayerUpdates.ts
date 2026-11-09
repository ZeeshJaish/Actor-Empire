/* Lag round (2026-11-09): a change that only remembers where the player has looked (a room
   visited) stays in memory and rides along with the next real save, instead of starting the full
   save path a moment after the tap. On a late career that save froze the screen for seconds.
   Losing such a change to a crash only shows a room as new once more. */
const quietPlayers = new WeakSet<object>();

/** Marks this exact player object as a UI-memory change; any later change saves as usual. */
export const markQuietPlayerUpdate = <T extends object>(player: T): T => {
    quietPlayers.add(player);
    return player;
};

export const isQuietPlayerUpdate = (player: unknown): boolean => Boolean(
    player && typeof player === 'object' && quietPlayers.has(player as object),
);
