import type { Player } from '../types';
import { transferPlatformAiCanonicalTurnMarker } from './platformAi/platformAiState';
import { isCanonicalStreamingRightsContractRegistry } from './streamingRightsCore';

const OMIT = Symbol('omit-json-value');

/* Round 4 (2026-11-09): the objects being copied are kept as the current path, a short list (a save is about ten
   levels deep), instead of a Set: the same "is it already being copied" question, without hashing every one of
   a late career's millions of objects in and out of a Set. */
const cloneJsonValue = (
    value: unknown,
    ancestors: object[],
    arraySlot: boolean,
): unknown | typeof OMIT => {
    if (value === null) return null;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return value === 0 ? 0 : value;
    }
    if (typeof value === 'bigint') throw new TypeError('Do not know how to serialize a BigInt');
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
        return arraySlot ? null : OMIT;
    }
    if (typeof value !== 'object') return arraySlot ? null : OMIT;
    for (let index = 0; index < ancestors.length; index += 1) {
        if (ancestors[index] === value) throw new TypeError('Converting circular structure to JSON');
    }

    const jsonValue = value as { toJSON?: () => unknown };
    if (typeof jsonValue.toJSON === 'function') {
        return cloneJsonValue(jsonValue.toJSON(), ancestors, arraySlot);
    }

    ancestors.push(value);
    try {
        if (Array.isArray(value)) {
            const output = new Array<unknown>(value.length);
            for (let index = 0; index < value.length; index += 1) {
                const child = cloneJsonValue(value[index], ancestors, true);
                output[index] = child === OMIT ? null : child;
            }
            return output;
        }
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
            const child = cloneJsonValue((value as Record<string, unknown>)[key], ancestors, false);
            if (child !== OMIT) output[key] = child;
        }
        return output;
    } finally {
        ancestors.pop();
    }
};

/**
 * Clones the weekly state with the exact data semantics of
 * `JSON.parse(JSON.stringify(player))`, without building and reparsing a
 * multi-megabyte intermediate string.
 */
export const clonePlayerForWeekProcessing = <T extends Player>(player: T): T => {
    const cloned = cloneJsonValue(player, [], false);
    if (cloned === OMIT || !cloned || typeof cloned !== 'object') {
        throw new TypeError('Player state could not be cloned for weekly processing.');
    }
    const result = cloned as T;
    if (isCanonicalStreamingRightsContractRegistry(player.world?.streamingRightsContracts)) {
        result.world.streamingRightsContracts = player.world.streamingRightsContracts;
    }
    const sourcePlatforms = player.world?.platforms;
    const clonedPlatforms = result.world?.platforms;
    if (sourcePlatforms && clonedPlatforms) {
        for (const platformId of Object.keys(sourcePlatforms)) {
            const sourcePlatform = sourcePlatforms[platformId as keyof typeof sourcePlatforms];
            const clonedPlatform = clonedPlatforms[platformId as keyof typeof clonedPlatforms];
            if (sourcePlatform && clonedPlatform) {
                transferPlatformAiCanonicalTurnMarker(sourcePlatform, clonedPlatform);
            }
        }
    }
    return result;
};
