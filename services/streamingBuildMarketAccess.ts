import type { Player } from '../types';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';

export interface StreamingBuildMarketAccess {
    countryIds: string[];
    editable: boolean;
    reason: string | null;
    source: 'FILED_OPERATIONS' | 'LEGACY_OPENING_IDS' | 'NONE';
}

/** A Build drawing is allowed only after at least one opening-market filing.
 * A saved legacy opening list remains usable if it predates the operation ledger.
 * Merely selected (PLANNED/AWAITING_FUNDING) and exited operations are not a filing.
 */
export const getStreamingBuildMarketAccess = (player: Player): StreamingBuildMarketAccess => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const opening = platform.marketOperations.filter(operation => operation.scope === 'COUNTRY' && operation.entryKind === 'OPENING');
    const filed = opening.filter(operation => (
        operation.countryId
        && operation.status !== 'EXITED'
        && !['PLANNED', 'AWAITING_FUNDING'].includes(operation.status)
        && (operation.committedAtAbsoluteWeek != null || operation.clearance != null || ['READY', 'ACTIVE'].includes(operation.status))
    ));
    const countryIds = [...new Set(filed.map(operation => operation.countryId!))].sort();
    if (countryIds.length) return { countryIds, editable: true, reason: null, source: 'FILED_OPERATIONS' };
    const legacy = platform.identity?.dayOneMarketIds?.length
        && opening.every(operation => operation.source === 'LEGACY_DAY_ONE' && operation.status === 'PLANNED')
        && (platform.infrastructureSetupDraft || platform.infrastructureSetup || platform.pendingInfrastructureSetup)
        ? [...new Set(platform.identity.dayOneMarketIds)].sort()
        : [];
    if (legacy.length) return { countryIds: legacy, editable: true, reason: null, source: 'LEGACY_OPENING_IDS' };
    return {
        countryIds: [], editable: false,
        reason: 'File an opening market in Market Clearance first. You can inspect Build stages and unit prices now, but cannot edit, rehearse, or commission yet.',
        source: 'NONE',
    };
};
