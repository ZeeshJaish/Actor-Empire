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

export const replaceLegacyPixelAvatarUrls = <T,>(value: T): T => {
    if (isLegacyPixelAvatar(value)) {
        return getCanonicalProfileAvatar(value, 'NON_BINARY', legacySeedFromUrl(value)) as T;
    }
    if (Array.isArray(value)) {
        return value.map(item => replaceLegacyPixelAvatarUrls(item)) as T;
    }
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, replaceLegacyPixelAvatarUrls(nested)]),
    ) as T;
};

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
