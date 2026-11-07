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

/** A conservative lower bound, not a serializer. Ignore keys/punctuation and
 * unknown conversions; stop once ordinary data alone exceeds the mirror limit.
 * A bounded inconclusive probe simply falls back to the original JSON path. */
const dataExceedsMirrorBudget = (value: unknown, budget: number): boolean => {
    if (!Number.isFinite(budget)) return false;
    const seen = new WeakSet<object>();
    let size = 0, visited = 0;
    const inconclusive = {};
    const visit = (item: unknown, inArray = false): boolean => {
        if (++visited > 250_000) throw inconclusive;
        if (typeof item === 'string') size += item.length;
        else if (typeof item === 'number') size += Number.isFinite(item) ? String(item).length : 4;
        else if (typeof item === 'boolean') size += item ? 4 : 5;
        else if (item === null) size += 4;
        else if (item === undefined || typeof item === 'function' || typeof item === 'symbol') size += inArray ? 4 : 0;
        else if (typeof item === 'object') {
            if (seen.has(item)) return false;
            const array = Array.isArray(item), prototype = Object.getPrototypeOf(item);
            if (prototype !== null && prototype !== Object.prototype && (!array || prototype !== Array.prototype)) return false;
            const conversion = Object.getOwnPropertyDescriptor(item, 'toJSON')
                || (prototype && Object.getOwnPropertyDescriptor(prototype, 'toJSON'));
            if (conversion && (conversion.get || conversion.set || typeof conversion.value === 'function')) return false;
            seen.add(item);
            if (array) {
                for (let index = 0; index < item.length; index++) {
                    const field = Object.getOwnPropertyDescriptor(item, String(index));
                    if (!field) { size += 4; if (size > budget) return true; }
                    else if ('value' in field && visit(field.value, true)) return true;
                }
            } else {
                for (const key of Object.keys(item)) {
                    const field = Object.getOwnPropertyDescriptor(item, key)!;
                    if ('value' in field && visit(field.value)) return true;
                }
            }
        }
        return size > budget;
    };
    try { return visit(value); } catch { return false; }
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
    if (serialize === JSON.stringify && dataExceedsMirrorBudget(player, budgetBytes)) return { kind: 'METADATA_ONLY' };
    const serialized = serialize(player);
    return serialized.length <= budgetBytes
        ? { kind: 'FULL', serialized }
        : { kind: 'METADATA_ONLY' };
};
