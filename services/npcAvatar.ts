import type { Gender } from '../types';
import {
    type ProfileBuilderCategoryId,
    type ProfileBuilderGender,
    createSeededProfileSelection,
    getProfilePart,
} from './profileBuilder';
import { exportProfilePortrait } from '../views/avatar/profilePortraitRenderer';

const avatarCache = new Map<string, string>();

const toProfileBuilderGender = (gender: Gender): ProfileBuilderGender => {
    if (gender === 'FEMALE') return 'FEMALE';
    if (gender === 'NON_BINARY') return 'NON_BINARY';
    return 'MALE';
};

const fallbackColors = (category: ProfileBuilderCategoryId, id: string, fallback: string[]): string[] => {
    const colors = getProfilePart(category, id)?.colors || [];
    return colors.length > 0 ? colors : fallback;
};

const createFallbackPortrait = (gender: ProfileBuilderGender, seed: string): string => {
    const selection = createSeededProfileSelection(gender, seed);
    const skin = fallbackColors('skinTone', selection.skinTone, ['#d8a878', '#b88254', '#8e5c34']);
    const hair = fallbackColors('hairColor', selection.hairColor, ['#4a4644', '#26221e', '#100d0a']);
    const outfit = fallbackColors('outfit', selection.outfit, ['#3e4454', '#262a36', '#14161e', '#e8e6e0']);
    const frame = fallbackColors('frame', selection.frame, ['#20242c', '#12151b', '#5b6470']);
    const eye = fallbackColors('eyeColor', selection.eyeColor, ['#201005', '#4a2c14', '#66421e']);
    const faceShape = getProfilePart('faceShape', selection.faceShape)?.shape || 'oval';
    const hairShape = getProfilePart('hair', selection.hair)?.shape || 'side';
    const mouthShape = getProfilePart('mouth', selection.mouth)?.shape || 'smile';
    const facialHairShape = getProfilePart('facialHair', selection.facialHair)?.shape || 'none';
    const faceWidth = faceShape === 'wide' || faceShape === 'square' ? 54 : faceShape === 'slim' || faceShape === 'sharp' ? 44 : 50;
    const chinRadius = faceShape === 'square' ? 10 : faceShape === 'sharp' ? 4 : 16;
    const hairTop = hairShape === 'bald' ? '' : `<path d="M${64 - faceWidth / 2 - 2} 45 Q64 25 ${64 + faceWidth / 2 + 2} 45 L${64 + faceWidth / 2 - 2} 58 Q64 48 ${64 - faceWidth / 2 + 2} 58 Z" fill="${hair[1] || hair[0]}"/>`;
    const hairExtra = hairShape === 'long' || hairShape === 'bob' || hairShape === 'dreads'
        ? `<rect x="${64 - faceWidth / 2 - 5}" y="50" width="${faceWidth + 10}" height="42" rx="12" fill="${hair[2] || hair[1] || hair[0]}"/>`
        : hairShape === 'bun'
            ? `<circle cx="64" cy="33" r="12" fill="${hair[1] || hair[0]}"/>`
            : hairShape === 'afro' || hairShape === 'curly'
                ? `<circle cx="64" cy="43" r="33" fill="${hair[1] || hair[0]}"/>`
                : '';
    const mouth = mouthShape === 'full-lips' || mouthShape === 'pout'
        ? '<path d="M55 88 Q64 94 73 88 Q64 98 55 88Z" fill="#a65254"/>'
        : '<path d="M55 88 Q64 95 73 88" fill="none" stroke="#5e2d28" stroke-width="4" stroke-linecap="round"/>';
    const beard = facialHairShape === 'none'
        ? ''
        : `<path d="M${64 - faceWidth / 2 + 8} 84 Q64 110 ${64 + faceWidth / 2 - 8} 84 L${64 + faceWidth / 2 - 8} 98 Q64 116 ${64 - faceWidth / 2 + 8} 98 Z" fill="${hair[2] || hair[1] || hair[0]}" opacity="0.72"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" shape-rendering="crispEdges">
<rect width="128" height="128" rx="20" fill="${frame[1] || frame[0]}"/>
<circle cx="64" cy="60" r="48" fill="${frame[0]}" opacity="0.65"/>
<rect x="35" y="95" width="58" height="30" rx="8" fill="${outfit[1] || outfit[0]}"/>
<path d="M45 95 L64 110 L83 95 L86 128 H42 Z" fill="${outfit[2] || outfit[1] || outfit[0]}"/>
${hairExtra}
<rect x="${64 - faceWidth / 2}" y="42" width="${faceWidth}" height="58" rx="${chinRadius}" fill="${skin[1] || skin[0]}"/>
<rect x="${64 - faceWidth / 2 + 7}" y="52" width="${faceWidth - 14}" height="39" rx="${Math.max(4, chinRadius - 4)}" fill="${skin[0]}"/>
${hairTop}
<rect x="${64 - faceWidth / 2 + 10}" y="66" width="10" height="8" fill="#f3f6f8"/>
<rect x="${64 + faceWidth / 2 - 20}" y="66" width="10" height="8" fill="#f3f6f8"/>
<rect x="${64 - faceWidth / 2 + 14}" y="68" width="5" height="5" fill="${eye[1] || eye[0]}"/>
<rect x="${64 + faceWidth / 2 - 16}" y="68" width="5" height="5" fill="${eye[1] || eye[0]}"/>
<rect x="61" y="76" width="6" height="8" fill="${skin[2] || skin[1] || skin[0]}" opacity="0.72"/>
${beard}
${mouth}
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/** The shared portrait source for every NPC-facing surface. */
export const getGenderedAvatar = (gender: Gender, nameSeed: string): string => {
    const seed = nameSeed.replace(/\s/g, '');
    const profileGender = toProfileBuilderGender(gender);
    const cacheKey = `${profileGender}:${seed}`;
    const cached = avatarCache.get(cacheKey);
    if (cached) return cached;

    if (typeof document !== 'undefined') {
        try {
            const portrait = exportProfilePortrait(createSeededProfileSelection(profileGender, seed), 1);
            avatarCache.set(cacheKey, portrait);
            return portrait;
        } catch (error) {
            console.warn('NPC portrait generation failed; using the local fallback portrait.', error);
        }
    }

    const portrait = createFallbackPortrait(profileGender, seed);
    avatarCache.set(cacheKey, portrait);
    return portrait;
};
