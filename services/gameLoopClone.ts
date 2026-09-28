import type { Player } from '../types';
import { transferPlatformAiCanonicalTurnMarker } from './platformAi/platformAiState';
import { isCanonicalStreamingRightsContractRegistry } from './streamingRightsCore';

const OMIT = Symbol('omit-json-value');

// These world domains establish their own map before weekly writes. Sharing
// their immutable inputs avoids cloning large histories before replacement.
const WEEKLY_OWNED_WORLD_DOMAINS = new Set([
    'studios',
    'industryProductions',
    'talentBookings',
    'streamingPlatformEcosystem',
    'worldPopulation',
    'worldAudienceEconomy',
    'worldAudienceParticipation',
    'worldStreamingCompetition',
    'worldStreamingCustomers',
    'worldStreamingViewing',
    'worldStreamingPlatformEconomy',
]);

const canShareJsonDomain = (value: unknown, ancestors = new Set<object>(), completed = new WeakSet<object>()): boolean => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'object') return false;
    if (ancestors.has(value)) return false;
    if (completed.has(value)) return true;
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') return false;
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
    ancestors.add(value);
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            if (!(index in value) || !canShareJsonDomain(value[index], ancestors, completed)) return false;
        }
    } else {
        for (const key of Object.keys(value)) {
            if (!canShareJsonDomain((value as Record<string, unknown>)[key], ancestors, completed)) return false;
        }
    }
    ancestors.delete(value);
    completed.add(value);
    return true;
};

const cloneJsonValue = (
    value: unknown,
    ancestors: Set<object>,
    arraySlot: boolean,
    shareChild?: (parent: object, key: string) => boolean,
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
    if (ancestors.has(value)) throw new TypeError('Converting circular structure to JSON');

    const jsonValue = value as { toJSON?: () => unknown };
    if (typeof jsonValue.toJSON === 'function') {
        return cloneJsonValue(jsonValue.toJSON(), ancestors, arraySlot, shareChild);
    }

    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            const output = new Array<unknown>(value.length);
            for (let index = 0; index < value.length; index += 1) {
                const child = cloneJsonValue(value[index], ancestors, true, shareChild);
                output[index] = child === OMIT ? null : child;
            }
            return output;
        }
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
            const sourceChild = (value as Record<string, unknown>)[key];
            const child = shareChild?.(value, key)
                ? sourceChild
                : cloneJsonValue(sourceChild, ancestors, false, shareChild);
            if (child !== OMIT) output[key] = child;
        }
        return output;
    } finally {
        ancestors.delete(value);
    }
};

/**
 * Clones the weekly state with the exact data semantics of
 * `JSON.parse(JSON.stringify(player))`, without building and reparsing a
 * multi-megabyte intermediate string.
 */
export const clonePlayerForWeekProcessing = <T extends Player>(player: T): T => {
    const cloned = cloneJsonValue(player, new Set<object>(), false, (parent, key) => (
        parent === player.world && WEEKLY_OWNED_WORLD_DOMAINS.has(key)
            && canShareJsonDomain((parent as Record<string, unknown>)[key])
    ));
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
