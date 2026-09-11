import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  PROFILE_ART_GRID,
  PROFILE_AVATAR_EXPORT,
  PROFILE_BUILDER_CATEGORIES,
  PROFILE_BUILDER_PARTS,
  PROFILE_FEATURE_REGIONS,
  createDefaultProfileSelection,
  createSeededProfileSelection,
  getCompatibleProfileOptions,
  getRenderableProfileLayers,
  normalizeProfileSelection,
} from '../services/profileBuilder.ts';

const rendererSource = readFileSync(new URL('../views/avatar/profilePortraitRenderer.ts', import.meta.url), 'utf8');
const creationMenuSource = readFileSync(new URL('../views/CreationMenu.tsx', import.meta.url), 'utf8');
const npcAvatarSource = readFileSync(new URL('../services/npcAvatar.ts', import.meta.url), 'utf8');
const forbesSource = readFileSync(new URL('../views/mobile/ForbesApp.tsx', import.meta.url), 'utf8');
const socialPageSource = readFileSync(new URL('../views/SocialPage.tsx', import.meta.url), 'utf8');
const socialAdapterSource = readFileSync(new URL('../services/socialUiAdapter.ts', import.meta.url), 'utf8');
const profileAvatarSource = readFileSync(new URL('../services/profileAvatar.ts', import.meta.url), 'utf8');

assert.deepEqual(PROFILE_ART_GRID, { width: 112, height: 128, sourceSize: 1024 }, 'Portrait renderer should use the CharacterCreator-compatible fixed art grid.');
assert.deepEqual(PROFILE_AVATAR_EXPORT, { shape: 'square', size: 128, contentWidth: 112, contentHeight: 128, padX: 8, padY: 0 }, 'Saved avatars should export square-safe so circular game slots do not trim the top.');
assert(PROFILE_FEATURE_REGIONS.face.width > 0, 'Feature crop regions should be registered for future sprite compositing.');
assert(PROFILE_FEATURE_REGIONS.hair.height > PROFILE_FEATURE_REGIONS.mouth.height, 'Hair crop region should cover more vertical space than the mouth crop.');
assert(!rendererSource.includes('span(ctx, bottom + 1, x - 6, x + 6, state.skin.sh'), 'Renderer should not draw a continuous under-eye shadow bar; it reads as a crop line in small NPC avatars.');
assert(rendererSource.includes('drawSubtleLowerLid'), 'Renderer should use broken/pixel-dithered lower-lid detail for NPC-safe eyes.');
assert(rendererSource.includes('drawAvatarExportBackground'), 'Saved avatar exports should fill the full square background before centering the portrait layer.');
assert(!rendererSource.includes('ctx.clearRect(0, 0, outputSize, outputSize);\n  ctx.drawImage(sourceCanvas, offsetX, offsetY);'), 'Saved avatar exports should not leave transparent side padding around the narrower portrait source.');
assert(rendererSource.includes("const upperLip = '#A05048'"), 'Full lips and pout should use the CharacterCreator rosy lip palette.');
assert(rendererSource.includes("span(ctx, 87, 46, 53, upperLip"), 'Full lips should match the CharacterCreator upper-lip scanline shape.');
assert(rendererSource.includes("span(ctx, 95, 52, 60, state.skin.mid"), 'Pout should include the compact CharacterCreator under-pout shadow.');
assert(!creationMenuSource.includes('MALE_AVATAR_SEEDS'), 'Creation page should not use the old male DiceBear preset seeds.');
assert(!creationMenuSource.includes('FEMALE_AVATAR_SEEDS'), 'Creation page should not use the old female DiceBear preset seeds.');
assert(!creationMenuSource.includes('api.dicebear.com'), 'Creation page presets should come from the modular pixel portrait builder, not DiceBear URLs.');
assert(creationMenuSource.includes('createSeededProfileSelection'), 'Creation page should build random presets from the modular profile system.');
assert(!npcAvatarSource.includes('api.dicebear.com/7.x/pixel-art/svg'), 'New NPC avatars should not fall back to DiceBear.');
assert(npcAvatarSource.includes('createFallbackPortrait'), 'NPC avatar generation should have a local non-DiceBear fallback for non-DOM contexts.');
assert(npcAvatarSource.includes('data:image/svg+xml;charset=UTF-8'), 'NPC fallback avatars should be generated as local SVG data URIs.');
assert(forbesSource.includes('isForbesCelebRankingEntry'), 'Forbes Celebs should filter ranking source rows before rendering.');
assert(forbesSource.includes('isForbesBrandCategory'), 'Forbes Celebs should explicitly exclude brand/company categories.');
assert(forbesSource.includes('getForbesCelebAvatar'), 'Forbes Celebs should normalize generated NPC avatars through the profile system.');
assert(!forbesSource.includes('avatar: npc.avatar'), 'Forbes Celebs should not render raw NPC avatar strings that may be old seed-system URLs.');
assert(forbesSource.includes('grayscale opacity-70'), 'Forbes Celebs should keep non-player portraits visually muted while the player card stays colored.');
assert(socialPageSource.includes('getFamilyProfileAvatar'), 'Connections should normalize Mom/Dad through the profile avatar system.');
assert(socialPageSource.includes("family-profile:${rel.id}:${rel.name}"), 'Family profile seeds should be stable per relationship.');
assert(socialPageSource.includes("rel.id === 'rel_mom'"), 'Mom should be explicitly mapped to the female profile system.');
assert(socialPageSource.includes("rel.id === 'rel_dad'"), 'Dad should be explicitly mapped to the male profile system.');
assert(socialPageSource.includes('[image-rendering:pixelated]'), 'Family profile avatars should preserve crisp profile-builder pixel rendering.');
assert(profileAvatarSource.includes('isLegacyPixelAvatar'), 'The profile system should recognize retired pixel avatar URLs.');
assert(profileAvatarSource.includes('normalizePlayerProfileAvatars'), 'Existing saves should normalize retired player and family portraits.');
assert(socialAdapterSource.includes('getCanonicalProfileAvatar(relationship.image'), 'The transplanted Connections UI should not bypass profile normalization.');

const expectedCategories = ['skinTone', 'faceShape', 'hair', 'hairColor', 'eyebrows', 'eyes', 'eyeColor', 'nose', 'mouth', 'facialHair', 'outfit', 'frame'];
assert.deepEqual(PROFILE_BUILDER_CATEGORIES.map(category => category.id), expectedCategories, 'Builder categories should follow the canonical face-to-frame order.');

const maleOptions = getCompatibleProfileOptions('MALE');
const femaleOptions = getCompatibleProfileOptions('FEMALE');
const nonBinaryOptions = getCompatibleProfileOptions('NON_BINARY');

assert(maleOptions.hair.some(option => option.genderTags.includes('MALE')), 'Male-compatible hair options should exist.');
assert(femaleOptions.hair.some(option => option.genderTags.includes('FEMALE')), 'Female-compatible hair options should exist.');
assert(nonBinaryOptions.hair.length >= maleOptions.hair.length, 'Non-binary pool should expose a broad compatible hair set.');
assert(!femaleOptions.hair.some(option => option.id === 'buzz'), 'Female default pool should filter out hard-masculine hair unless explicitly added later.');
assert(!femaleOptions.outfit.some(option => option.id === 'classic-tux'), 'Female default pool should filter out hard-masculine formalwear unless explicitly added later.');
assert.equal(maleOptions.faceShape.length, 7, 'Face shape pool should match the updated CharacterCreator head-shape set.');
assert.equal(maleOptions.hair.length, 18, 'Male hair pool should match the updated CharacterCreator hair set.');
assert.equal(maleOptions.hairColor.length, 7, 'Hair color pool should expose palette-swap colors.');
assert.equal(maleOptions.eyes.length, 6, 'Eye pool should match the updated CharacterCreator eye set.');
assert.equal(maleOptions.eyeColor.length, 6, 'Eye color pool should match the updated CharacterCreator eye-color set.');
assert.equal(maleOptions.eyebrows.length, 5, 'Eyebrow pool should match the updated CharacterCreator brow set.');
assert.equal(maleOptions.nose.length, 3, 'Nose pool should match the CharacterCreator nose set.');
assert.equal(maleOptions.outfit.length >= 4, true, 'Outfit pool should include the CharacterCreator clothing set.');
assert(femaleOptions.facialHair.every(option => option.id === 'facial-clean'), 'Female default pool should keep facial hair clean-only.');
assert.deepEqual(
  PROFILE_BUILDER_PARTS.filter(part => part.category === 'mouth').map(part => part.id),
  ['mouth-smile', 'mouth-full-lips', 'mouth-pout'],
  'Mouth pool should match the updated CharacterCreator set: smile, full lips, and pout.',
);
assert(femaleOptions.mouth.some(option => option.id === 'mouth-full-lips'), 'Female mouth pool should include full lips.');
assert(femaleOptions.mouth.some(option => option.id === 'mouth-pout'), 'Female mouth pool should include pout.');
assert.equal(maleOptions.frame.length, 5, 'Frame/background pool should expose five new game-safe frame styles.');
assert(!maleOptions.frame.some(option => ['studio-slate', 'award-gold', 'night-blue', 'press-gray'].includes(option.id)), 'Old square-border frame options should be removed.');
assert(maleOptions.frame.every(option => option.shape?.startsWith('clean-')), 'Every frame option should render as a clean background instead of an internal square border.');

const femaleDefault = createDefaultProfileSelection('FEMALE');
assert.equal(femaleDefault.mouth, 'mouth-full-lips', 'Female default mouth should use full lips.');
assert(femaleOptions.hair.some(option => option.id === femaleDefault.hair), 'Female default hair must be in the female-compatible option pool.');
assert(femaleOptions.outfit.some(option => option.id === femaleDefault.outfit), 'Female default outfit must be in the female-compatible option pool.');
assert.equal(femaleDefault.facialHair, 'facial-clean', 'Female default facial hair should stay clean.');

const normalizedFemale = normalizeProfileSelection('FEMALE', {
  ...femaleDefault,
  hair: 'buzz',
  outfit: 'classic-tux',
  mouth: 'wide-smile',
  facialHair: 'facial-full',
});
assert.notEqual(normalizedFemale.hair, 'buzz', 'Incompatible hair should normalize back to a female-compatible option.');
assert.notEqual(normalizedFemale.outfit, 'classic-tux', 'Incompatible outfit should normalize back to a female-compatible option.');
assert.equal(normalizedFemale.mouth, 'mouth-full-lips', 'Unsupported female mouth should normalize back to full lips.');
assert.equal(normalizedFemale.facialHair, 'facial-clean', 'Incompatible female facial hair should normalize back to clean.');

const seededFemale = createSeededProfileSelection('FEMALE', 'Zendaya');
const seededFemaleAgain = createSeededProfileSelection('FEMALE', 'Zendaya');
assert.deepEqual(seededFemale, seededFemaleAgain, 'Seeded NPC profile selections should be deterministic.');
assert.equal(seededFemale.facialHair, 'facial-clean', 'Seeded female NPC profiles should never receive beards.');
assert(seededFemale.mouth === 'mouth-full-lips' || seededFemale.mouth === 'mouth-pout', 'Seeded female NPC profiles should use full lips or pout.');
assert(femaleOptions.hair.find(option => option.id === seededFemale.hair)?.genderTags.includes('FEMALE'), 'Seeded female NPC profiles should prefer explicitly female hair options.');

const renderLayers = getRenderableProfileLayers(femaleDefault);
assert.deepEqual(
  renderLayers.map(layer => layer.category),
  ['frame', 'outfit', 'skinTone', 'faceShape', 'nose', 'eyeColor', 'eyes', 'eyebrows', 'mouth', 'facialHair', 'hairColor', 'hair'],
  'Render layers should stack in a stable avatar order.',
);

for (const part of PROFILE_BUILDER_PARTS) {
  assert(part.id, 'Every part needs a stable id.');
  assert(part.label, `Part ${part.id} needs a label.`);
  assert(part.genderTags.length > 0, `Part ${part.id} needs gender compatibility tags.`);
}

console.log('Profile builder system audit passed.');
