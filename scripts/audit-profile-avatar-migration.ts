import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { INITIAL_PLAYER } from '../types';
import {
    getCanonicalProfileAvatar,
    isLegacyPixelAvatar,
    replaceLegacyPixelAvatarUrls,
} from '../services/profileAvatar';
import { migratePlayerSave } from '../services/saveMigration';
import { buildSocialUiModel } from '../services/socialUiAdapter';

const legacyFelix = 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Felix';
const customPhoto = 'data:image/jpeg;base64,custom-photo';

assert.equal(isLegacyPixelAvatar(legacyFelix), true, 'The retired DiceBear pixel portrait must be recognized.');
assert.equal(isLegacyPixelAvatar(customPhoto), false, 'Uploaded photos must not be classified as legacy portraits.');

const canonicalFelix = getCanonicalProfileAvatar(legacyFelix, 'MALE', 'Felix');
assert.notEqual(canonicalFelix, legacyFelix, 'A legacy portrait must be replaced by the shared profile system.');
assert.match(canonicalFelix, /^data:image\//, 'Replacement portraits must be local image data.');
assert.equal(getCanonicalProfileAvatar(customPhoto, 'FEMALE', 'Custom'), customPhoto, 'Uploaded photos must remain untouched.');

const nested = replaceLegacyPixelAvatarUrls({
    profile: { avatar: legacyFelix },
    untouched: customPhoto,
});
assert.equal(isLegacyPixelAvatar(nested.profile.avatar), false, 'Nested legacy portraits in existing saves must be migrated.');
assert.equal(nested.untouched, customPhoto, 'Nested non-legacy images must remain untouched.');

const migrated = migratePlayerSave({
    ...INITIAL_PLAYER,
    avatar: legacyFelix,
    relationships: [
        ...INITIAL_PLAYER.relationships.map(relationship => ({
            ...relationship,
            image: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${relationship.name}`,
        })),
        { id: 'pet', name: 'Pixel', relation: 'Pet', closeness: 70, image: legacyFelix, lastInteractionWeek: 1, petEmoji: '🐕' },
    ],
});
assert.equal(isLegacyPixelAvatar(migrated.avatar), false, 'Existing player saves must stop showing the retired portrait.');
assert(migrated.relationships.every(relationship => !isLegacyPixelAvatar(relationship.image)), 'Mom, Dad, and all saved relationships must stop showing retired portraits.');
assert.equal(migrated.relationships.find(relationship => relationship.relation === 'Pet')?.image, '', 'A retired human portrait on a pet must be cleared for the pet emoji fallback.');

const socialModel = buildSocialUiModel({
    ...INITIAL_PLAYER,
    avatar: legacyFelix,
    relationships: [
        ...INITIAL_PLAYER.relationships.map(relationship => ({
            ...relationship,
            image: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${relationship.name}`,
        })),
        { id: 'pet', name: 'Pixel', relation: 'Pet', closeness: 70, image: legacyFelix, lastInteractionWeek: 1, petEmoji: '🐕' },
    ],
});
assert(socialModel.people.every(person => !isLegacyPixelAvatar(person.avatarUrl)), 'The transplanted Connections UI must normalize relationship portraits even before a reload.');
assert.equal(socialModel.people.find(person => person.relationship.relation === 'Pet')?.avatarUrl, undefined, 'The Connections UI must not render a retired human portrait on a pet.');
assert(socialModel.generations.flatMap(generation => generation.members).every(member => !isLegacyPixelAvatar(member.avatarUrl)), 'Legacy and current-player cards must normalize portraits before rendering.');

const scanRoots = ['App.tsx', 'types.ts', 'hooks', 'services', 'views', 'components'];
const ignoredFiles = new Set(['audit-profile-avatar-migration.ts']);
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.mjs']);
const legacyPattern = /api\.dicebear\.com\/(?:7|8)\.x\/pixel-art\/svg/;

const scan = (path: string): string[] => {
    if (ignoredFiles.has(path.split('/').pop() || '')) return [];
    const extension = extname(path);
    if (extension && codeExtensions.has(extension)) return legacyPattern.test(readFileSync(path, 'utf8')) ? [path] : [];
    if (extension) return [];
    return readdirSync(path, { withFileTypes: true }).flatMap(entry => scan(join(path, entry.name)));
};

const legacySources = scanRoots.flatMap(scan);
assert.deepEqual(legacySources, [], `Retired DiceBear pixel portrait URLs remain in: ${legacySources.join(', ')}`);

console.log('Profile avatar migration audit passed.');
