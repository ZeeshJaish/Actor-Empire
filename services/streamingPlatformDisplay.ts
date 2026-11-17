/**
 * 2026-11-15 (B1): how a screen names and colours the platform a title streams on.
 * Titles are sold to every platform in the world (ViX, JioHotstar, Monolith…), not only the five original ones in
 * PLATFORMS, so a screen must never index PLATFORMS directly for a title's platform: an unknown id made the Box Office
 * Streaming tab throw ("Cannot read properties of undefined (reading 'color')") and open Recovery Mode.
 * The five original platforms keep their existing name and colour; any other platform takes its world name and its
 * brand colour.
 */
import type { Player } from '../types';
import { PLATFORMS } from './streamingLogic';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';

export interface StreamingPlatformDisplay {
    id: string;
    name: string;
    /** a text-colour class for the five original platforms */
    colorClass?: string;
    /** the brand colour, used when there is no class */
    colorHex: string;
}

export const getStreamingPlatformDisplay = (
    player: Player | null | undefined,
    platformId: string | null | undefined,
): StreamingPlatformDisplay => {
    const id = String(platformId || '').trim();
    const original = (PLATFORMS as Record<string, { name: string; color: string } | undefined>)[id];
    const operator = (player?.world?.streamingPlatformEcosystem?.operators as Record<string, { name?: string } | undefined> | undefined)?.[id];
    const brand = resolveStreamingPlatformBrandById(id || 'UNKNOWN_PLATFORM', original?.name || operator?.name);
    return {
        id,
        name: original?.name || operator?.name || brand.displayName,
        colorClass: original?.color,
        colorHex: brand.primaryColor,
    };
};
