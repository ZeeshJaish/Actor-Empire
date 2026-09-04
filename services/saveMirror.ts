import type { Player } from '../types';

export type LocalStorageMirrorPlan =
    | { kind: 'FULL'; serialized: string }
    | { kind: 'METADATA_ONLY' };

const isClearlyOversizedLocalMirror = (player: Player): boolean => {
    const rightsContracts = Object.keys(player.world?.streamingRightsContracts || {}).length;
    if (rightsContracts > 1_500) return true;
    const platformPlans = Object.values(player.world?.platforms || {})
        .reduce((sum, platform) => sum + (platform.ai?.slate.length || 0), 0);
    if (platformPlans > 1_000) return true;
    return (player.world?.projects?.length || 0) > 1_200;
};

/**
 * IndexedDB is authoritative. This plans only the optional legacy localStorage mirror and
 * avoids a large main-thread JSON pass when canonical collection counts already prove that
 * the save is far beyond the mirror's fixed budget.
 */
export const prepareLocalStorageMirror = (
    player: Player,
    budgetBytes: number,
    serialize: (value: Player) => string = JSON.stringify,
): LocalStorageMirrorPlan => {
    if (isClearlyOversizedLocalMirror(player)) return { kind: 'METADATA_ONLY' };
    const serialized = serialize(player);
    return serialized.length <= budgetBytes
        ? { kind: 'FULL', serialized }
        : { kind: 'METADATA_ONLY' };
};
