import type { Gender, Player } from '../types';
import { getGenderedAvatar } from './npcAvatar';

const LEGACY_PIXEL_AVATAR_PATTERN = /^https:\/\/api\.dicebear\.com\/(?:7|8)\.x\/pixel-art\/svg(?:\?|$)/i;

export const isLegacyPixelAvatar = (avatarUrl: unknown): avatarUrl is string => (
    typeof avatarUrl === 'string' && LEGACY_PIXEL_AVATAR_PATTERN.test(avatarUrl.trim())
);

const legacySeedFromUrl = (avatarUrl: string): string => {
    try {
        return new URL(avatarUrl).searchParams.get('seed')?.trim() || '';
    } catch {
        return '';
    }
};

/**
 * Keeps user-uploaded and current profile-builder portraits, while replacing
 * the retired DiceBear pixel artwork (or an empty slot) through the shared
 * in-game profile system.
 */
export const getCanonicalProfileAvatar = (
    avatarUrl: unknown,
    gender: Gender | undefined,
    nameSeed: string,
): string => {
    const existing = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    if (existing && !isLegacyPixelAvatar(existing)) return existing;

    const legacySeed = existing ? legacySeedFromUrl(existing) : '';
    return getGenderedAvatar(gender || 'NON_BINARY', legacySeed || nameSeed || 'Profile');
};

/* #256: the save's big slices, walked once and found clean. An update from a screen keeps them, so the walk visits only what changed. Nothing writes these URLs any more. */
const KNOWN_CLEAN_DEPTH = 3;
const knownClean = new WeakSet<object>();

const walkLegacyAvatars = (value: unknown, depth: number): unknown => {
    if (isLegacyPixelAvatar(value)) return getCanonicalProfileAvatar(value, 'NON_BINARY', legacySeedFromUrl(value));
    if (!value || typeof value !== 'object') return value;
    if (depth <= KNOWN_CLEAN_DEPTH && knownClean.has(value)) return value;
    let next: unknown = value;
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            const item = walkLegacyAvatars(value[index], depth + 1);
            if (item === value[index]) continue;
            if (next === value) next = value.slice();
            (next as unknown[])[index] = item;
        }
    } else {
        for (const key of Object.keys(value)) {
            const nested = (value as Record<string, unknown>)[key];
            const item = walkLegacyAvatars(nested, depth + 1);
            if (item === nested) continue;
            if (next === value) next = { ...value };
            (next as Record<string, unknown>)[key] = item;
        }
    }
    if (depth <= KNOWN_CLEAN_DEPTH) knownClean.add(next as object);
    return next;
};

/** A clean object comes back as itself. */
export const replaceLegacyPixelAvatarUrls = <T,>(value: T): T => walkLegacyAvatars(value, 0) as T;

/** One migration boundary for existing saves and imported careers. */
export const normalizePlayerProfileAvatars = (player: Player): Player => {
    const gender = player.gender || 'NON_BINARY';
    const withIdentityAwareProfiles: Player = {
        ...player,
        avatar: getCanonicalProfileAvatar(player.avatar, gender, player.name),
        relationships: player.relationships.map(relationship => (
            relationship.relation === 'Pet'
                ? {
                    ...relationship,
                    // Some old saves assigned the retired human portrait system
                    // to pets. Drop only that invalid image so the pet UI can use
                    // its species emoji; preserve real/custom pet artwork.
                    image: isLegacyPixelAvatar(relationship.image) ? '' : relationship.image,
                }
                : {
                    ...relationship,
                    image: getCanonicalProfileAvatar(
                        relationship.image,
                        relationship.gender,
                        `${relationship.id}:${relationship.name}`,
                    ),
                }
        )),
    };

    return replaceLegacyPixelAvatarUrls(withIdentityAwareProfiles);
};
