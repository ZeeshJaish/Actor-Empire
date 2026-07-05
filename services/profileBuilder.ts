export type ProfileBuilderCategoryId =
  | 'skinTone'
  | 'faceShape'
  | 'hair'
  | 'hairColor'
  | 'eyebrows'
  | 'eyes'
  | 'eyeColor'
  | 'nose'
  | 'mouth'
  | 'facialHair'
  | 'outfit'
  | 'frame';

export type ProfileBuilderGender = 'MALE' | 'FEMALE' | 'NON_BINARY';
export type ProfileBuilderGenderTag = ProfileBuilderGender | 'ALL';

export interface ProfileBuilderCategory {
  id: ProfileBuilderCategoryId;
  label: string;
}

export interface ProfileBuilderFeatureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProfileBuilderPart {
  id: string;
  category: ProfileBuilderCategoryId;
  label: string;
  genderTags: ProfileBuilderGenderTag[];
  swatch: string;
  colors: string[];
  shape?: string;
  mood?: 'sharp' | 'soft' | 'neutral';
  sourceFile?: string;
}

export type ProfileBuilderSelection = Record<ProfileBuilderCategoryId, string>;

export const PROFILE_ART_GRID = {
  width: 112,
  height: 128,
  sourceSize: 1024,
} as const;

export const PROFILE_AVATAR_EXPORT = {
  shape: 'square',
  size: 128,
  contentWidth: 112,
  contentHeight: 128,
  padX: 8,
  padY: 0,
} as const;

export const PROFILE_FEATURE_REGIONS: Record<string, ProfileBuilderFeatureRegion> = {
  face: { x: 20, y: 8, width: 72, height: 108 },
  hair: { x: 10, y: 0, width: 92, height: 68 },
  eyes: { x: 24, y: 38, width: 64, height: 34 },
  eyebrows: { x: 24, y: 32, width: 64, height: 24 },
  nose: { x: 40, y: 54, width: 32, height: 34 },
  mouth: { x: 34, y: 80, width: 44, height: 24 },
  facialHair: { x: 22, y: 70, width: 68, height: 46 },
  outfit: { x: 4, y: 104, width: 104, height: 24 },
};

export const PROFILE_BUILDER_CATEGORIES: ProfileBuilderCategory[] = [
  { id: 'skinTone', label: 'Skin' },
  { id: 'faceShape', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'hairColor', label: 'Hair Color' },
  { id: 'eyebrows', label: 'Brows' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'eyeColor', label: 'Eye Color' },
  { id: 'nose', label: 'Nose' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'facialHair', label: 'Facial Hair' },
  { id: 'outfit', label: 'Clothes' },
  { id: 'frame', label: 'Frame' },
];

export const PROFILE_LAYER_ORDER: ProfileBuilderCategoryId[] = [
  'frame',
  'outfit',
  'skinTone',
  'faceShape',
  'nose',
  'eyeColor',
  'eyes',
  'eyebrows',
  'mouth',
  'facialHair',
  'hairColor',
  'hair',
];

const all: ProfileBuilderGenderTag[] = ['ALL'];
const male: ProfileBuilderGenderTag[] = ['MALE', 'NON_BINARY'];
const female: ProfileBuilderGenderTag[] = ['FEMALE', 'NON_BINARY'];

export const PROFILE_BUILDER_PARTS: ProfileBuilderPart[] = [
  { id: 'skin-fair', category: 'skinTone', label: 'Fair', genderTags: all, swatch: '#ecbe98', colors: ['#f8dcc0', '#ecbe98', '#ce9670', '#a06848', '#6e4028'], sourceFile: 'base.png' },
  { id: 'skin-light', category: 'skinTone', label: 'Light', genderTags: all, swatch: '#d8a878', colors: ['#ecc49a', '#d8a878', '#b88254', '#8e5c34', '#5e3a1e'], sourceFile: 'base.png' },
  { id: 'skin-medium', category: 'skinTone', label: 'Medium', genderTags: all, swatch: '#ac7848', colors: ['#c89468', '#ac7848', '#8a5c30', '#66401e', '#442810'], sourceFile: 'base.png' },
  { id: 'skin-tan', category: 'skinTone', label: 'Tan', genderTags: all, swatch: '#8a5e34', colors: ['#a87850', '#8a5e34', '#6a4622', '#4c2f14', '#301d0a'], sourceFile: 'base.png' },
  { id: 'skin-deep', category: 'skinTone', label: 'Deep', genderTags: all, swatch: '#5c3e26', colors: ['#7a5638', '#5c3e26', '#422c18', '#2a1b0e', '#180f06'], sourceFile: 'base.png' },

  { id: 'face-oval', category: 'faceShape', label: 'Oval', genderTags: all, swatch: '#c9793f', colors: [], shape: 'oval', mood: 'neutral', sourceFile: 'head_oval.png' },
  { id: 'face-round', category: 'faceShape', label: 'Round', genderTags: all, swatch: '#d79051', colors: [], shape: 'round', mood: 'soft', sourceFile: 'head_round.png' },
  { id: 'face-square', category: 'faceShape', label: 'Square', genderTags: all, swatch: '#b16b3d', colors: [], shape: 'square', mood: 'sharp', sourceFile: 'head_square.png' },
  { id: 'face-sharp', category: 'faceShape', label: 'Sharp', genderTags: all, swatch: '#c9793f', colors: [], shape: 'sharp', mood: 'sharp', sourceFile: 'head_sharp.png' },
  { id: 'face-heart', category: 'faceShape', label: 'Heart', genderTags: all, swatch: '#e5a06e', colors: [], shape: 'heart', mood: 'soft', sourceFile: 'head_heart.png' },
  { id: 'face-slim', category: 'faceShape', label: 'Slim', genderTags: all, swatch: '#d89a62', colors: [], shape: 'slim', mood: 'soft', sourceFile: 'head_slim.png' },
  { id: 'face-wide', category: 'faceShape', label: 'Wide', genderTags: all, swatch: '#bc7545', colors: [], shape: 'wide', mood: 'sharp', sourceFile: 'head_wide.png' },

  { id: 'side-part', category: 'hair', label: 'Side Part', genderTags: all, swatch: '#3e2614', colors: [], shape: 'side', sourceFile: 'hair_side.png' },
  { id: 'buzz', category: 'hair', label: 'Buzz Cut', genderTags: male, swatch: '#26221e', colors: [], shape: 'buzz', sourceFile: 'hair_buzz.png' },
  { id: 'flat-top', category: 'hair', label: 'Flat Top', genderTags: all, swatch: '#3e2614', colors: [], shape: 'flat', sourceFile: 'hair_flat.png' },
  { id: 'spiky', category: 'hair', label: 'Spiky', genderTags: all, swatch: '#3e2614', colors: [], shape: 'spiky', sourceFile: 'hair_spiky.png' },
  { id: 'curly', category: 'hair', label: 'Curly', genderTags: all, swatch: '#3e2614', colors: [], shape: 'curly', sourceFile: 'hair_curly.png' },
  { id: 'mohawk', category: 'hair', label: 'Mohawk', genderTags: all, swatch: '#3e2614', colors: [], shape: 'mohawk', sourceFile: 'hair_mohawk.png' },
  { id: 'bald', category: 'hair', label: 'Bald', genderTags: all, swatch: '#26221e', colors: [], shape: 'bald', sourceFile: 'hair_bald.png' },
  { id: 'pixie', category: 'hair', label: 'Pixie', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'pixie', sourceFile: 'hair_pixie.png' },
  { id: 'bob', category: 'hair', label: 'Bob', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'bob', sourceFile: 'hair_bob.png' },
  { id: 'ponytail', category: 'hair', label: 'Ponytail', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'ponytail', sourceFile: 'hair_ponytail.png' },
  { id: 'top-bun', category: 'hair', label: 'Top Bun', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'bun', sourceFile: 'hair_bun.png' },
  { id: 'bangs', category: 'hair', label: 'Bangs', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'bangs', sourceFile: 'hair_bangs.png' },
  { id: 'wavy', category: 'hair', label: 'Wavy', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'wavy', sourceFile: 'hair_wavy.png' },
  { id: 'long', category: 'hair', label: 'Long', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'long', sourceFile: 'hair_long.png' },
  { id: 'afro', category: 'hair', label: 'Afro', genderTags: all, swatch: '#3e2614', colors: [], shape: 'afro', sourceFile: 'hair_afro.png' },
  { id: 'dreads', category: 'hair', label: 'Dreads', genderTags: all, swatch: '#3e2614', colors: [], shape: 'dreads', sourceFile: 'hair_dreads.png' },
  { id: 'pigtails', category: 'hair', label: 'Pigtails', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'pigtails', sourceFile: 'hair_pigtails.png' },
  { id: 'messy', category: 'hair', label: 'Messy', genderTags: all, swatch: '#3e2614', colors: [], shape: 'messy', sourceFile: 'hair_messy.png' },

  { id: 'hair-black', category: 'hairColor', label: 'Black', genderTags: all, swatch: '#26221e', colors: ['#4a4644', '#26221e', '#100d0a'], shape: 'black' },
  { id: 'hair-dark-brown', category: 'hairColor', label: 'Dark Brown', genderTags: all, swatch: '#3e2614', colors: ['#6e4a2e', '#3e2614', '#1e1006'], shape: 'dark_brown' },
  { id: 'hair-brown', category: 'hairColor', label: 'Brown', genderTags: all, swatch: '#64401e', colors: ['#96683e', '#64401e', '#38220e'], shape: 'brown' },
  { id: 'hair-blonde', category: 'hairColor', label: 'Blonde', genderTags: all, swatch: '#b89040', colors: ['#e8c878', '#b89040', '#7a5a20'], shape: 'blonde' },
  { id: 'hair-red', category: 'hairColor', label: 'Red', genderTags: all, swatch: '#8a3414', colors: ['#c05a30', '#8a3414', '#521c08'], shape: 'red' },
  { id: 'hair-blue', category: 'hairColor', label: 'Blue', genderTags: all, swatch: '#34509a', colors: ['#5a7ac8', '#34509a', '#1c2e62'], shape: 'blue' },
  { id: 'hair-white', category: 'hairColor', label: 'White', genderTags: all, swatch: '#d0d2d8', colors: ['#f4f4f6', '#d0d2d8', '#9a9eac'], shape: 'white' },

  { id: 'brow-normal', category: 'eyebrows', label: 'Normal', genderTags: all, swatch: '#3e2614', colors: [], shape: 'normal', mood: 'neutral', sourceFile: 'brows_normal.png' },
  { id: 'brow-thick', category: 'eyebrows', label: 'Thick', genderTags: all, swatch: '#3e2614', colors: [], shape: 'thick', mood: 'sharp', sourceFile: 'brows_thick.png' },
  { id: 'brow-thin', category: 'eyebrows', label: 'Thin', genderTags: ['ALL', 'FEMALE'], swatch: '#3e2614', colors: [], shape: 'thin', mood: 'soft', sourceFile: 'brows_thin.png' },
  { id: 'brow-raised', category: 'eyebrows', label: 'Raised', genderTags: all, swatch: '#3e2614', colors: [], shape: 'raised', mood: 'soft', sourceFile: 'brows_raised.png' },
  { id: 'brow-angry', category: 'eyebrows', label: 'Angry', genderTags: all, swatch: '#3e2614', colors: [], shape: 'angry', mood: 'sharp', sourceFile: 'brows_angry.png' },

  { id: 'eyes-almond', category: 'eyes', label: 'Almond', genderTags: all, swatch: '#4a2c14', colors: [], shape: 'almond', sourceFile: 'eyes_almond.png' },
  { id: 'eyes-round', category: 'eyes', label: 'Round', genderTags: all, swatch: '#4a2c14', colors: [], shape: 'round', sourceFile: 'eyes_round.png' },
  { id: 'eyes-big', category: 'eyes', label: 'Big', genderTags: all, swatch: '#4a2c14', colors: [], shape: 'big', sourceFile: 'eyes_big.png' },
  { id: 'eyes-sharp', category: 'eyes', label: 'Sharp', genderTags: all, swatch: '#4a2c14', colors: [], shape: 'sharp', sourceFile: 'eyes_sharp.png' },
  { id: 'eyes-sleepy', category: 'eyes', label: 'Sleepy', genderTags: all, swatch: '#4a2c14', colors: [], shape: 'sleepy', sourceFile: 'eyes_sleepy.png' },
  { id: 'eyes-lashes', category: 'eyes', label: 'Lashes', genderTags: ['ALL', 'FEMALE'], swatch: '#4a2c14', colors: [], shape: 'lashes', sourceFile: 'eyes_lashes.png' },

  { id: 'eye-brown', category: 'eyeColor', label: 'Brown', genderTags: all, swatch: '#4a2c14', colors: ['#201005', '#4a2c14', '#66421e'], shape: 'brown' },
  { id: 'eye-blue', category: 'eyeColor', label: 'Blue', genderTags: all, swatch: '#2e5a88', colors: ['#102034', '#2e5a88', '#5f8fc0'], shape: 'blue' },
  { id: 'eye-green', category: 'eyeColor', label: 'Green', genderTags: all, swatch: '#2e6438', colors: ['#102414', '#2e6438', '#67a36c'], shape: 'green' },
  { id: 'eye-hazel', category: 'eyeColor', label: 'Hazel', genderTags: all, swatch: '#6a5218', colors: ['#2a1d08', '#6a5218', '#a47a2a'], shape: 'hazel' },
  { id: 'eye-grey', category: 'eyeColor', label: 'Grey', genderTags: all, swatch: '#5a626e', colors: ['#222833', '#5a626e', '#9ca6b3'], shape: 'grey' },
  { id: 'eye-amber', category: 'eyeColor', label: 'Amber', genderTags: all, swatch: '#8a5410', colors: ['#3a1e04', '#8a5410', '#c98222'], shape: 'amber' },

  { id: 'nose-pointed', category: 'nose', label: 'Pointed', genderTags: all, swatch: '#b88254', colors: [], shape: 'pointed', sourceFile: 'nose_pointed.png' },
  { id: 'nose-button', category: 'nose', label: 'Button', genderTags: all, swatch: '#d8a878', colors: [], shape: 'button', sourceFile: 'nose_button.png' },
  { id: 'nose-wide', category: 'nose', label: 'Wide', genderTags: all, swatch: '#ac7848', colors: [], shape: 'wide', sourceFile: 'nose_wide.png' },

  { id: 'mouth-smile', category: 'mouth', label: 'Smile', genderTags: all, swatch: '#7b3a35', colors: [], shape: 'smile', mood: 'neutral', sourceFile: 'mouth_smile.png' },
  { id: 'mouth-full-lips', category: 'mouth', label: 'Full Lips', genderTags: female, swatch: '#a65254', colors: [], shape: 'full-lips', mood: 'soft', sourceFile: 'mouth_full_lips.png' },
  { id: 'mouth-pout', category: 'mouth', label: 'Pout', genderTags: female, swatch: '#924c58', colors: [], shape: 'pout', mood: 'soft', sourceFile: 'mouth_pout.png' },

  { id: 'facial-clean', category: 'facialHair', label: 'Clean', genderTags: all, swatch: '#3e2614', colors: [], shape: 'none', sourceFile: 'beard_none.png' },
  { id: 'facial-stubble', category: 'facialHair', label: 'Stubble', genderTags: male, swatch: '#3e2614', colors: [], shape: 'stubble', sourceFile: 'beard_stubble.png' },
  { id: 'facial-mustache', category: 'facialHair', label: 'Mustache', genderTags: male, swatch: '#3e2614', colors: [], shape: 'mustache', sourceFile: 'beard_mustache.png' },
  { id: 'facial-goatee', category: 'facialHair', label: 'Goatee', genderTags: male, swatch: '#3e2614', colors: [], shape: 'goatee', sourceFile: 'beard_goatee.png' },
  { id: 'facial-full', category: 'facialHair', label: 'Full Beard', genderTags: male, swatch: '#3e2614', colors: [], shape: 'full', sourceFile: 'beard_full.png' },

  { id: 'classic-tux', category: 'outfit', label: 'Classic Tux', genderTags: male, swatch: '#262a36', colors: ['#3e4454', '#262a36', '#14161e', '#e8e6e0'], shape: 'suit', sourceFile: 'outfit_suit.png' },
  { id: 'black-blazer', category: 'outfit', label: 'Black Blazer', genderTags: all, swatch: '#262a36', colors: ['#3e4454', '#262a36', '#14161e', '#e8e6e0'], shape: 'suit', sourceFile: 'outfit_suit.png' },
  { id: 'blue-tee', category: 'outfit', label: 'Blue Tee', genderTags: all, swatch: '#3a62a0', colors: ['#5c87c8', '#3a62a0', '#24406e', '#e8e6e0'], shape: 'tee', sourceFile: 'outfit_tee.png' },
  { id: 'brown-hoodie', category: 'outfit', label: 'Hoodie', genderTags: all, swatch: '#62402a', colors: ['#8a5a3a', '#62402a', '#3e2816', '#c89868'], shape: 'hoodie', sourceFile: 'outfit_hoodie.png' },
  { id: 'sci-fi-armor', category: 'outfit', label: 'Sci-Fi Armor', genderTags: all, swatch: '#6e7e8e', colors: ['#a8b4c0', '#6e7e8e', '#46525e', '#48d8f8'], shape: 'armor', sourceFile: 'outfit_armor.png' },
  { id: 'silk-blouse', category: 'outfit', label: 'Silk Blouse', genderTags: female, swatch: '#c8c4b6', colors: ['#d8d0c2', '#c8c4b6', '#5d626c', '#f2e9d8'], shape: 'blouse', sourceFile: 'outfit_blouse.png' },
  { id: 'red-carpet', category: 'outfit', label: 'Red Carpet', genderTags: female, swatch: '#5b1d31', colors: ['#d49aa9', '#5b1d31', '#17070c', '#f0c2ce'], shape: 'gown', sourceFile: 'outfit_gown.png' },

  { id: 'frame-studio-halo', category: 'frame', label: 'Studio Halo', genderTags: all, swatch: '#747b88', colors: ['#7f8794', '#5b6470', '#c3c9d1'], shape: 'clean-studio-halo' },
  { id: 'frame-casting-room', category: 'frame', label: 'Casting Room', genderTags: all, swatch: '#5f6874', colors: ['#6e7680', '#3f4650', '#9ba3ad'], shape: 'clean-casting-room' },
  { id: 'frame-red-carpet', category: 'frame', label: 'Red Carpet', genderTags: all, swatch: '#6b2438', colors: ['#5a1f31', '#291018', '#d293a4'], shape: 'clean-red-carpet' },
  { id: 'frame-award-night', category: 'frame', label: 'Award Night', genderTags: all, swatch: '#b98a2e', colors: ['#2a2117', '#5a3e20', '#d6a640'], shape: 'clean-award-night' },
  { id: 'frame-press-wall', category: 'frame', label: 'Press Wall', genderTags: all, swatch: '#aeb5bd', colors: ['#9da5af', '#6a717c', '#e0e5ec'], shape: 'clean-press-wall' },
];

const isCompatible = (part: ProfileBuilderPart, gender: ProfileBuilderGender): boolean =>
  part.genderTags.includes('ALL') || part.genderTags.includes(gender);

export const getCompatibleProfileOptions = (gender: ProfileBuilderGender): Record<ProfileBuilderCategoryId, ProfileBuilderPart[]> => {
  const grouped = {} as Record<ProfileBuilderCategoryId, ProfileBuilderPart[]>;
  for (const category of PROFILE_BUILDER_CATEGORIES) {
    grouped[category.id] = PROFILE_BUILDER_PARTS.filter(part => part.category === category.id && isCompatible(part, gender));
  }
  return grouped;
};

export const getProfilePart = (category: ProfileBuilderCategoryId, id: string): ProfileBuilderPart | undefined =>
  PROFILE_BUILDER_PARTS.find(part => part.category === category && part.id === id);

export const createDefaultProfileSelection = (gender: ProfileBuilderGender): ProfileBuilderSelection => {
  const options = getCompatibleProfileOptions(gender);
  const selection = PROFILE_BUILDER_CATEGORIES.reduce((currentSelection, category) => {
    currentSelection[category.id] = options[category.id][0]?.id || PROFILE_BUILDER_PARTS.find(part => part.category === category.id)?.id || '';
    return currentSelection;
  }, {} as ProfileBuilderSelection);

  if (gender === 'FEMALE') {
    selection.hair = options.hair.find(option => option.id === 'long')?.id || selection.hair;
    selection.eyebrows = options.eyebrows.find(option => option.id === 'brow-raised')?.id || selection.eyebrows;
    selection.mouth = options.mouth.find(option => option.id === 'mouth-full-lips')?.id || selection.mouth;
    selection.facialHair = options.facialHair.find(option => option.id === 'facial-clean')?.id || selection.facialHair;
    selection.outfit = options.outfit.find(option => option.id === 'silk-blouse')?.id || selection.outfit;
  }

  return selection;
};

export const normalizeProfileSelection = (
  gender: ProfileBuilderGender,
  selection: Partial<ProfileBuilderSelection>,
): ProfileBuilderSelection => {
  const defaults = createDefaultProfileSelection(gender);
  const options = getCompatibleProfileOptions(gender);
  return PROFILE_BUILDER_CATEGORIES.reduce((normalized, category) => {
    const requested = selection[category.id];
    const compatible = requested ? options[category.id].find(option => option.id === requested) : undefined;
    normalized[category.id] = compatible?.id || defaults[category.id];
    return normalized;
  }, {} as ProfileBuilderSelection);
};

export const getRenderableProfileLayers = (selection: ProfileBuilderSelection): ProfileBuilderPart[] =>
  PROFILE_LAYER_ORDER
    .map(category => getProfilePart(category, selection[category]))
    .filter((part): part is ProfileBuilderPart => Boolean(part));

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickSeededOption = (
  options: ProfileBuilderPart[],
  seed: string,
  salt: string,
  fallbackId: string,
): string => {
  if (options.length === 0) return fallbackId;
  const hash = hashSeed(`${seed}:${salt}`);
  return options[hash % options.length]?.id || fallbackId;
};

export const createSeededProfileSelection = (
  gender: ProfileBuilderGender,
  seed: string,
): ProfileBuilderSelection => {
  const options = getCompatibleProfileOptions(gender);
  const defaults = createDefaultProfileSelection(gender);
  const selection = PROFILE_BUILDER_CATEGORIES.reduce((currentSelection, category) => {
    currentSelection[category.id] = pickSeededOption(options[category.id], seed, category.id, defaults[category.id]);
    return currentSelection;
  }, {} as ProfileBuilderSelection);

  if (gender === 'FEMALE') {
    const femaleHairOptions = options.hair.filter(option => option.genderTags.includes('FEMALE'));
    const femaleMouthOptions = options.mouth.filter(option => option.id === 'mouth-full-lips' || option.id === 'mouth-pout');
    selection.hair = pickSeededOption(femaleHairOptions, seed, 'female-hair', defaults.hair);
    selection.mouth = pickSeededOption(femaleMouthOptions, seed, 'female-mouth', defaults.mouth);
    selection.facialHair = 'facial-clean';
  }

  return normalizeProfileSelection(gender, selection);
};
