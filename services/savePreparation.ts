import type { Player } from '../types';
import { compactPlayerForPersistence } from './saveCompaction';
import {
    compareProtectedSaveState,
    createSaveIntegrityManifest,
    type ProtectedSaveComparison,
    type SaveIntegrityManifest,
    type SaveIntegrityReason,
} from './saveIntegrity';
import { migratePlayerSave } from './saveMigration';

const OVERSIZED_LEGACY_BYTES = 24 * 1024 * 1024;

const utf8ByteLength = (value: string, cache: Map<string, number>): number => {
    const cached = cache.get(value);
    if (cached !== undefined) return cached;
    const bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(value).byteLength : value.length * 2;
    cache.set(value, bytes);
    return bytes;
};

/** Estimates JSON output size without constructing the complete JSON string. */
export const estimateSaveJsonBytes = (value: unknown): number => {
    const stringBytes = new Map<string, number>();
    const visit = (item: unknown, ancestors: Set<object>): number => {
        if (item === null || item === undefined || typeof item === 'function') return 4;
        if (typeof item === 'boolean') return item ? 4 : 5;
        if (typeof item === 'number') return Number.isFinite(item) ? String(item).length : 4;
        if (typeof item === 'string') return utf8ByteLength(item, stringBytes) + 2;
        if (typeof item !== 'object') return 4;
        if (ancestors.has(item)) throw new Error('Cannot estimate a cyclic save payload.');
        const nextAncestors = new Set(ancestors).add(item);
        if (Array.isArray(item)) {
            return 2 + item.reduce((sum, child, index) => sum + (index ? 1 : 0) + visit(child, nextAncestors), 0);
        }
        const entries = Object.entries(item as Record<string, unknown>)
            .filter(([, child]) => child !== undefined && typeof child !== 'function');
        return 2 + entries.reduce((sum, [key, child], index) => (
            sum + (index ? 1 : 0) + utf8ByteLength(key, stringBytes) + 3 + visit(child, nextAncestors)
        ), 0);
    };
    return visit(value, new Set());
};

export const isClearlyOversizedLegacySave = (player: Player): boolean => {
    const rightsCount = Object.keys(player.world?.streamingRightsContracts || {}).length;
    const worldProjects = player.world?.projects?.length || 0;
    const platformPlans = Object.values(player.world?.platforms || {})
        .reduce((sum, platform) => sum + (platform.ai?.slate.length || 0), 0);
    if (rightsCount > 1_500 || worldProjects > 1_200 || platformPlans > 1_000) return true;
    return estimateSaveJsonBytes(player) > OVERSIZED_LEGACY_BYTES;
};

export interface PreparedVerifiedPlayer {
    player: Player;
    manifest: SaveIntegrityManifest;
    comparison: ProtectedSaveComparison;
    estimatedSourceBytes: number | null;
    oversizedLegacy: boolean;
    retainPrevious: boolean;
    needsRecoveryCheckpoint: boolean;
}

export const prepareVerifiedPlayerForPersistence = (
    sourcePlayer: Player,
    reason: SaveIntegrityReason,
    options: { legacyOrExternal?: boolean; currentIsUnverified?: boolean; sourceByteEstimate?: number } = {},
): PreparedVerifiedPlayer => {
    const canonical = options.legacyOrExternal ? migratePlayerSave(sourcePlayer) : sourcePlayer;
    const currentIsUnverified = options.currentIsUnverified === true;
    const estimatedSourceBytes = currentIsUnverified
        ? Math.max(0, Number(options.sourceByteEstimate) || estimateSaveJsonBytes(canonical))
        : null;
    const oversizedLegacy = currentIsUnverified && (
        (estimatedSourceBytes ?? 0) > OVERSIZED_LEGACY_BYTES
        || Object.keys(canonical.world?.streamingRightsContracts || {}).length > 1_500
        || (canonical.world?.projects?.length || 0) > 1_200
    );
    const player = compactPlayerForPersistence(canonical);
    const comparison = compareProtectedSaveState(canonical, player);
    if ('violations' in comparison) {
        throw new Error(`Save compaction rejected: ${comparison.violations.join('; ')}`);
    }
    return {
        player,
        manifest: createSaveIntegrityManifest(player, reason, Date.now(), oversizedLegacy),
        comparison,
        estimatedSourceBytes,
        oversizedLegacy,
        retainPrevious: !oversizedLegacy,
        needsRecoveryCheckpoint: oversizedLegacy,
    };
};
