import { getStockMarketAbsoluteWeek } from './stockMarketClock';
import type { Player } from '../types';
interface ControlNotice { acknowledgedAbsoluteWeek: number; wasEligible: boolean; action: 'OPEN' | 'DEFER' }
const absoluteWeek = (p: Pick<Player, 'age'|'currentWeek'>) => getStockMarketAbsoluteWeek(p.age, p.currentWeek);
const records = (p: Player): Record<string, ControlNotice> => p.flags?.stockControlNotices || {};
export const acknowledgeStockControlNotice = (player: Player, stockId: string, action: 'OPEN'|'DEFER'): Player => ({
    ...player,
    flags: { ...player.flags, stockControlNotices: { ...records(player), [stockId]: { acknowledgedAbsoluteWeek: absoluteWeek(player), wasEligible: true, action } } },
    pendingEvents: (player.pendingEvents || []).filter(e => !(e.data?.stockDecisionType === 'TAKEOVER_CONTROL' && e.data?.stockId === stockId)),
});
export const canQueueStockControlNotice = (player: Player, stockId: string): boolean => {
    const notice = records(player)[stockId];
    return !notice || notice.wasEligible === false || (absoluteWeek(player) < notice.acknowledgedAbsoluteWeek || absoluteWeek(player) - notice.acknowledgedAbsoluteWeek >= 12);
};
export const markStockControlEligibilityLost = (player: Player, stockId: string): Player => {
    const prior = records(player)[stockId];
    if (!prior || !prior.wasEligible) return player;
    return { ...player, flags: { ...player.flags, stockControlNotices: { ...records(player), [stockId]: { ...prior, wasEligible: false } } } };
};
