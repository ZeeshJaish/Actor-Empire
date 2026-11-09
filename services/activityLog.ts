/**
 * #244: the activity log on the main screen. Zeesh (2026-11-05): "jaruri nahi har notification ke liye pop up use kare, movie release and kafi kuch
 * ke liye hm log gave ka activity log use karte hai". It reads oldest first and the week's close keeps the last 50, so a new line goes at the end:
 * a line put at the front is the first one that close throws away.
 */
import type { LogEntry, Player } from '../types';

export const addActivityLog = <T extends Pick<Player, 'logs' | 'currentWeek' | 'age'>>(player: T, message: string, type: LogEntry['type'] = 'neutral'): T => ({
    ...player,
    logs: [...(player.logs || []), { week: player.currentWeek, year: player.age, message, type }],
});

/** oldest first, by the week each line belongs to; lines of one week keep their order. Trimming after this drops the oldest week, never this week's news. */
export const inActivityOrder = <T extends { week?: number; year?: number }>(logs: T[]): T[] => logs
    .map((log, index) => ({ log, index }))
    .sort((left, right) => (left.log.year || 0) - (right.log.year || 0) || (left.log.week || 0) - (right.log.week || 0) || left.index - right.index)
    .map(row => row.log);

/* a line about the world, not about the player */
const WORLD_LINE = /^(\u{1F4DA}|\u{1F5C2}\u{FE0F}|\u{1F4C5})/u;
/* #254: what the other companies did, written before it moved to the News app: an older save still holds these */
const OLD_WORLD_LINE = /^(\u{1F3E2}|\u{1F31F})/u;
export const isOldWorldLine = (message: string): boolean => OLD_WORLD_LINE.test(message);

const feedRank = (log: { type?: string; message?: string }) => (
    WORLD_LINE.test(log.message || '') ? 2 : log.type === 'positive' || log.type === 'negative' ? 0 : 1
);

/**
 * #250: the home screen's feed: newest week first. Inside a week, what happened to the player comes before the industry's news, so a line that replaced a popup
 * is seen: a busy company's week has dozens of lines and the feed shows three.
 */
export const inFeedOrder = <T extends { week?: number; year?: number; type?: string; message?: string }>(logs: T[]): T[] => logs
    .map((log, index) => ({ log, index }))
    .sort((left, right) => (right.log.year || 0) - (left.log.year || 0) || (right.log.week || 0) - (left.log.week || 0)
        || feedRank(left.log) - feedRank(right.log) || right.index - left.index)
    .map(row => row.log);

