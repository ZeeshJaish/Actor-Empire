import type { OwnedStreamingPlatformState } from '../types';

/** Maintenance is paid outside the core operating transfer; never debit it again. */
export const getStreamingAdditionalOperatingExpense = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    recorded?: number,
): number => {
    if (typeof recorded === 'number' && Number.isFinite(recorded)) return Math.max(0, Math.round(recorded));
    const entries = new Map(platform.eventLedger.filter(entry => entry.absoluteWeek === absoluteWeek
        && entry.type === 'INFRASTRUCTURE_MAINTENANCE_COMPLETED').map(entry => [entry.idempotencyKey, entry]));
    return [...entries.values()].reduce((total, entry) => total + Math.max(0, Math.round(Number(entry.metadata?.cost) || 0)), 0);
};
