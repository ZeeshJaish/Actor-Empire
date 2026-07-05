import {
  PROFILE_ART_GRID,
  PROFILE_AVATAR_EXPORT,
  ProfileBuilderSelection,
  getProfilePart,
} from '../../services/profileBuilder';

export const PROFILE_CANVAS_SCALE = 3;
export const PROFILE_CANVAS_WIDTH = PROFILE_ART_GRID.width * PROFILE_CANVAS_SCALE;
export const PROFILE_CANVAS_HEIGHT = PROFILE_ART_GRID.height * PROFILE_CANVAS_SCALE;
export const PROFILE_AVATAR_CANVAS_SIZE = PROFILE_AVATAR_EXPORT.size * PROFILE_CANVAS_SCALE;

type Ctx = CanvasRenderingContext2D;
type HeadShape = 'oval' | 'round' | 'square' | 'sharp' | 'heart' | 'slim' | 'wide';

interface SkinPalette {
  hi: string;
  base: string;
  mid: string;
  sh: string;
  dk: string;
}

interface HairPalette {
  hi: string;
  base: string;
  dk: string;
}

interface EyePalette {
  ring: string;
  iris: string;
  hi: string;
}

interface OutfitPalette {
  hi: string;
  main: string;
  dk: string;
  accent: string;
}

interface RenderState {
  skin: SkinPalette;
  headType: HeadShape;
  hair: string;
  hairColor: HairPalette;
  eyeColor: EyePalette;
  eyes: string;
  eyebrows: string;
  nose: string;
  mouth: string;
  facialHair: string;
  outfit: string;
  outfitPalette: OutfitPalette;
  frame: string;
  frameColors: string[];
}

const CX = 56;
const LASH = '#141008';

const fallbackSkin: SkinPalette = { hi: '#ecc49a', base: '#d8a878', mid: '#b88254', sh: '#8e5c34', dk: '#5e3a1e' };
const fallbackHair: HairPalette = { hi: '#6e4a2e', base: '#3e2614', dk: '#1e1006' };
const fallbackEye: EyePalette = { ring: '#201005', iris: '#4a2c14', hi: '#66421e' };
const fallbackOutfit: OutfitPalette = { hi: '#3e4454', main: '#262a36', dk: '#14161e', accent: '#e8e6e0' };

const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string, scale: number) => {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
};

const span = (ctx: Ctx, y: number, x0: number, x1: number, color: string, scale: number) => {
  if (x1 < x0) return;
  px(ctx, x0, y, x1 - x0 + 1, 1, color, scale);
};

const skinPalette = (colors: string[]): SkinPalette => ({
  hi: colors[0] || fallbackSkin.hi,
  base: colors[1] || fallbackSkin.base,
  mid: colors[2] || fallbackSkin.mid,
  sh: colors[3] || fallbackSkin.sh,
  dk: colors[4] || fallbackSkin.dk,
});

const hairPalette = (colors: string[]): HairPalette => ({
  hi: colors[0] || fallbackHair.hi,
  base: colors[1] || fallbackHair.base,
  dk: colors[2] || fallbackHair.dk,
});

const eyePalette = (colors: string[]): EyePalette => ({
  ring: colors[0] || fallbackEye.ring,
  iris: colors[1] || fallbackEye.iris,
  hi: colors[2] || fallbackEye.hi,
});

const outfitPalette = (colors: string[]): OutfitPalette => ({
  hi: colors[0] || fallbackOutfit.hi,
  main: colors[1] || fallbackOutfit.main,
  dk: colors[2] || fallbackOutfit.dk,
  accent: colors[3] || fallbackOutfit.accent,
});

const makeState = (selection: ProfileBuilderSelection): RenderState => {
  const skin = getProfilePart('skinTone', selection.skinTone);
  const head = getProfilePart('faceShape', selection.faceShape);
  const hair = getProfilePart('hair', selection.hair);
  const hairColor = getProfilePart('hairColor', selection.hairColor);
  const eyeColor = getProfilePart('eyeColor', selection.eyeColor);
  const eyes = getProfilePart('eyes', selection.eyes);
  const eyebrows = getProfilePart('eyebrows', selection.eyebrows);
  const nose = getProfilePart('nose', selection.nose);
  const mouth = getProfilePart('mouth', selection.mouth);
  const facialHair = getProfilePart('facialHair', selection.facialHair);
  const outfit = getProfilePart('outfit', selection.outfit);
  const frame = getProfilePart('frame', selection.frame);

  return {
    skin: skinPalette(skin?.colors || []),
    headType: (head?.shape as HeadShape) || 'oval',
    hair: hair?.shape || 'side',
    hairColor: hairPalette(hairColor?.colors || []),
    eyeColor: eyePalette(eyeColor?.colors || []),
    eyes: eyes?.shape || 'almond',
    eyebrows: eyebrows?.shape || 'thick',
    nose: nose?.shape || 'pointed',
    mouth: mouth?.shape || 'smile',
    facialHair: facialHair?.shape || 'none',
    outfit: outfit?.shape || 'suit',
    outfitPalette: outfitPalette(outfit?.colors || []),
    frame: frame?.shape || 'slate',
    frameColors: frame?.colors || ['#8a8fa0', '#565a68', '#a6abb8'],
  };
};

const PROFILES: Record<HeadShape, [number, number][]> = {
  oval: [[10, 12], [14, 20], [20, 26], [28, 30], [38, 32], [52, 32], [66, 32], [76, 31], [86, 28], [96, 22], [104, 14], [110, 8], [113, 4]],
  round: [[12, 13], [16, 22], [22, 28], [30, 32], [42, 34], [56, 34], [70, 33], [80, 30], [90, 26], [100, 18], [108, 10], [113, 5]],
  square: [[10, 12], [14, 20], [20, 26], [28, 30], [38, 32], [52, 32], [68, 32], [82, 31], [94, 30], [102, 27], [107, 20], [110, 12]],
  sharp: [[10, 12], [14, 20], [20, 26], [28, 30], [38, 32], [52, 32], [64, 31], [76, 28], [88, 22], [98, 15], [108, 7], [115, 2]],
  heart: [[10, 13], [14, 22], [20, 28], [26, 32], [36, 34], [48, 33], [60, 31], [72, 27], [84, 21], [94, 14], [102, 8], [108, 3]],
  slim: [[10, 10], [15, 18], [22, 24], [32, 27], [48, 28], [66, 28], [80, 26], [94, 18], [106, 8], [114, 3]],
  wide: [[10, 14], [16, 24], [24, 31], [36, 35], [54, 36], [72, 35], [88, 31], [100, 24], [109, 14], [113, 7]],
};

const headHalf = (type: HeadShape, y: number): number => {
  const profile = PROFILES[type] || PROFILES.oval;
  if (y < profile[0][0] || y > profile[profile.length - 1][0]) return 0;
  for (let i = 0; i < profile.length - 1; i++) {
    const [y0, h0] = profile[i];
    const [y1, h1] = profile[i + 1];
    if (y >= y0 && y <= y1) {
      return Math.round(h0 + ((y - y0) / (y1 - y0)) * (h1 - h0));
    }
  }
  return 0;
};

const headBottom = (type: HeadShape): number => {
  const profile = PROFILES[type] || PROFILES.oval;
  return profile[profile.length - 1][0];
};

const drawBackgroundSurface = (ctx: Ctx, state: RenderState, scale: number, width: number = PROFILE_ART_GRID.width) => {
  const [top = '#7f8794', bottom = '#5b6470', accent = '#c3c9d1'] = state.frameColors;
  const horizon = state.frame === 'clean-red-carpet' || state.frame === 'clean-award-night' ? 94 : 98;
  const right = width - 1;
  const center = Math.floor(width / 2);

  for (let y = 0; y < 128; y++) {
    const t = y / 127;
    const shade = t < 0.5 ? top : bottom;
    span(ctx, y, 0, right, shade, scale);
  }

  if (state.frame === 'clean-studio-halo') {
    for (let y = 12; y <= 96; y++) {
      const glowWidth = Math.max(0, Math.floor(34 - Math.abs(y - 54) * 0.36));
      if (glowWidth > 0) span(ctx, y, center - glowWidth, center + glowWidth, 'rgba(255,255,255,0.12)', scale);
    }
    for (let y = 16; y <= 72; y += 6) span(ctx, y, 18, right - 17, 'rgba(255,255,255,0.05)', scale);
  }

  if (state.frame === 'clean-casting-room') {
    px(ctx, 15, 0, 2, 128, 'rgba(255,255,255,0.08)', scale);
    px(ctx, right - 16, 0, 2, 128, 'rgba(0,0,0,0.16)', scale);
    for (let x = 24; x <= right - 23; x += 16) px(ctx, x, 12, 2, 84, 'rgba(255,255,255,0.06)', scale);
  }

  if (state.frame === 'clean-red-carpet') {
    for (let y = 0; y < horizon; y++) {
      if (y % 7 === 0) span(ctx, y, 0, right, 'rgba(255,255,255,0.05)', scale);
    }
    px(ctx, 0, horizon, width, 34, '#251018', scale);
  }

  if (state.frame === 'clean-award-night') {
    for (let y = 8; y <= 86; y += 13) {
      for (let x = 14; x <= right - 13; x += 18) px(ctx, x, y, 2, 2, accent, scale);
    }
    for (let y = 26; y <= 92; y++) {
      const spotlightWidth = Math.floor((y - 18) * 0.18);
      span(ctx, y, center - spotlightWidth, center + spotlightWidth, 'rgba(214,166,64,0.12)', scale);
    }
  }

  if (state.frame === 'clean-press-wall') {
    for (let y = 14; y <= 88; y += 16) {
      for (let x = 12; x <= right - 23; x += 22) {
        px(ctx, x, y, 9, 3, 'rgba(255,255,255,0.14)', scale);
        px(ctx, x + 4, y + 5, 5, 2, 'rgba(0,0,0,0.08)', scale);
      }
    }
  }

  px(ctx, 0, horizon, width, 30, 'rgba(0,0,0,0.14)', scale);
  span(ctx, horizon, 0, right, 'rgba(255,255,255,0.13)', scale);
};

const drawBackground = (ctx: Ctx, state: RenderState, scale: number) => {
  drawBackgroundSurface(ctx, state, scale);
};

const drawAvatarExportBackground = (ctx: Ctx, state: RenderState, scale: number) => {
  drawBackgroundSurface(ctx, state, scale, PROFILE_AVATAR_EXPORT.size);
};

const bodyHalf = (y: number) => {
  const widths = [10, 13, 17, 21, 26, 30, 34, 37, 40, 42, 44, 45, 46, 47, 47, 48];
  return widths[Math.min(15, Math.max(0, y - 112))];
};

const drawBody = (ctx: Ctx, state: RenderState, scale: number) => {
  const outfit = state.outfitPalette;
  for (let y = 112; y <= 127; y++) {
    const half = bodyHalf(y);
    span(ctx, y, CX - half, CX + half, outfit.main, scale);
    span(ctx, y, CX - half, CX - half + 2, outfit.hi, scale);
    span(ctx, y, CX + half - 2, CX + half, outfit.dk, scale);
  }

  if (state.outfit === 'tee') {
    span(ctx, 112, CX - 10, CX + 10, outfit.dk, scale);
    span(ctx, 115, CX - 8, CX + 8, outfit.hi, scale);
    span(ctx, 121, CX - 20, CX - 12, outfit.dk, scale);
    span(ctx, 124, CX + 10, CX + 18, outfit.dk, scale);
    return;
  }

  if (state.outfit === 'hoodie') {
    for (let y = 110; y <= 116; y++) {
      const half = 14 + (y - 110) * 2;
      span(ctx, y, CX - half, CX + half, outfit.dk, scale);
    }
    px(ctx, CX, 117, 1, 11, outfit.dk, scale);
    px(ctx, CX - 6, 117, 1, 7, outfit.accent, scale);
    px(ctx, CX + 6, 117, 1, 7, outfit.accent, scale);
    return;
  }

  if (state.outfit === 'armor') {
    span(ctx, 116, CX - 14, CX + 14, outfit.dk, scale);
    span(ctx, 121, CX - 16, CX + 16, outfit.dk, scale);
    span(ctx, 126, CX - 18, CX + 18, outfit.dk, scale);
    px(ctx, CX - 3, 118, 7, 6, outfit.dk, scale);
    px(ctx, CX - 2, 119, 5, 4, outfit.accent, scale);
    px(ctx, CX - 1, 120, 2, 2, '#efffff', scale);
    return;
  }

  if (state.outfit === 'blouse' || state.outfit === 'gown') {
    for (let y = 112; y <= 127; y++) {
      const half = 9 + Math.floor((y - 112) / 2);
      span(ctx, y, CX - half, CX + half, state.outfit === 'gown' ? outfit.main : outfit.accent, scale);
    }
    return;
  }

  for (let y = 112; y <= 127; y++) {
    const inner = Math.max(3, 9 - (y - 112));
    span(ctx, y, CX - inner - 5, CX - inner, outfit.dk, scale);
    span(ctx, y, CX + inner, CX + inner + 5, outfit.dk, scale);
    for (let x = CX - bodyHalf(y) + 4; x <= CX + bodyHalf(y) - 4; x += 5) {
      if (Math.abs(x - CX) > 15) px(ctx, x, y, 1, 1, outfit.hi, scale);
    }
  }
  for (let y = 112; y <= 117; y++) {
    const half = 7 - (y - 112);
    if (half > 1) span(ctx, y, CX - half, CX + half, outfit.accent, scale);
  }
  px(ctx, CX - 2, 115, 5, 4, '#6e4498', scale);
  for (let y = 119; y <= 127; y++) {
    const half = 2 + Math.floor((y - 119) / 3);
    span(ctx, y, CX - half, CX + half, '#6e4498', scale);
  }
};

const drawNeck = (ctx: Ctx, skin: SkinPalette, scale: number) => {
  for (let y = 102; y <= 122; y++) span(ctx, y, 47, 65, skin.base, scale);
  for (let y = 102; y <= 110; y++) span(ctx, y, 47, 65, skin.sh, scale);
  for (let y = 102; y <= 122; y++) {
    px(ctx, 47, y, 2, 1, skin.mid, scale);
    px(ctx, 64, y, 2, 1, skin.mid, scale);
  }
  span(ctx, 119, 50, 62, skin.hi, scale);
};

const drawEars = (ctx: Ctx, state: RenderState, scale: number) => {
  const half = headHalf(state.headType, 60);
  [CX - half - 4, CX + half].forEach((x, index) => {
    for (let y = 54; y <= 69; y++) span(ctx, y, x, x + (y < 56 || y > 66 ? 4 : 5), state.skin.base, scale);
    for (let y = 57; y <= 65; y++) span(ctx, y, x + 1, x + 3, state.skin.mid, scale);
    for (let y = 59; y <= 63; y++) span(ctx, y, x + 1, x + 2, state.skin.sh, scale);
    if (index === 0) for (let y = 55; y <= 67; y++) px(ctx, x, y, 1, 1, state.skin.hi, scale);
  });
};

const drawHead = (ctx: Ctx, state: RenderState, scale: number) => {
  const bottom = headBottom(state.headType);
  for (let y = 10; y <= bottom; y++) {
    const half = headHalf(state.headType, y);
    if (half <= 0) continue;
    const x0 = CX - half;
    const x1 = CX + half;
    span(ctx, y, x0, x1, state.skin.base, scale);
    if (y >= 26 && y <= 98) span(ctx, y, x0 + 1, x0 + 3, state.skin.hi, scale);
    if (y >= 22 && y <= 102) {
      span(ctx, y, x1 - 6, x1 - 3, state.skin.mid, scale);
      span(ctx, y, x1 - 2, x1, state.skin.sh, scale);
    }
  }
  for (let y = 26; y <= 42; y++) span(ctx, y, 42, 64, state.skin.hi, scale);
  for (let y = 30; y <= 44; y++) {
    for (let x = 30; x <= 35; x++) if ((x + y) % 2 === 0) px(ctx, x, y, 1, 1, state.skin.mid, scale);
  }
  for (let y = 64; y <= 76; y++) {
    for (let x = 77; x <= 82; x++) if ((x + y) % 2 === 0 || x > 80) px(ctx, x, y, 1, 1, state.skin.mid, scale);
  }
  for (let y = bottom - 4; y <= bottom; y++) {
    const half = headHalf(state.headType, y);
    if (half > 2) span(ctx, y, CX - half + 1, CX + half - 1, state.skin.mid, scale);
  }
  span(ctx, 102, 52, 60, state.skin.hi, scale);
  span(ctx, 98, 50, 62, state.skin.mid, scale);
};

const drawBrows = (ctx: Ctx, state: RenderState, scale: number) => {
  for (let i = 0; i < 20; i++) {
    const t = i / 19;
    const arch = Math.round(Math.sin(Math.PI * t) * 2);
    let yTop = 46;
    let height = 3;
    if (state.eyebrows === 'normal') { yTop = 47 - arch; height = 3; }
    if (state.eyebrows === 'thick') { yTop = 45 - Math.round(arch * 0.7); height = 5; }
    if (state.eyebrows === 'thin') { yTop = 48 - arch; height = 2; }
    if (state.eyebrows === 'raised') { yTop = 43 - arch - (t > 0.75 ? 1 : 0); height = 3; }
    if (state.eyebrows === 'angry') { yTop = 44 + Math.round(4 * t); height = 4; }
    px(ctx, 29 + i, yTop, 1, height, state.hairColor.dk, scale);
    px(ctx, 83 - i, yTop, 1, height, state.hairColor.dk, scale);
    px(ctx, 29 + i, yTop, 1, 1, state.hairColor.base, scale);
    px(ctx, 83 - i, yTop, 1, 1, state.hairColor.base, scale);
  }
};

const drawEye = (ctx: Ctx, x: number, sign: number, state: RenderState, scale: number) => {
  let top = 55;
  let bottom = 60;
  let lashTop = 53;
  let lashBottom = 54;
  let irisWidth = 8;
  let pupilWidth = 3;
  if (state.eyes === 'round') { top = 54; bottom = 61; lashBottom = 53; }
  if (state.eyes === 'big') { top = 53; bottom = 62; lashTop = 52; lashBottom = 52; irisWidth = 10; pupilWidth = 4; }
  if (state.eyes === 'sleepy') { top = 58; bottom = 60; lashTop = 57; lashBottom = 58; }
  if (state.eyes === 'lashes') { top = 54; bottom = 61; lashTop = 52; lashBottom = 54; irisWidth = 8; }

  span(ctx, 52, x - 8, x + 8, state.skin.mid, scale);
  if (state.eyes === 'sleepy') {
    span(ctx, 55, x - 8, x + 8, state.skin.base, scale);
    span(ctx, 56, x - 8, x + 8, state.skin.base, scale);
    span(ctx, 57, x - 8, x + 8, state.skin.mid, scale);
  }
  for (let y = top; y <= bottom; y++) {
    const width = y === top || y === bottom ? 6 : 8;
    span(ctx, y, x - width, x + width, '#e2dcd0', scale);
  }
  const irisStart = x - Math.floor(irisWidth / 2);
  const irisEnd = irisStart + irisWidth - 1;
  for (let y = top; y <= bottom; y++) span(ctx, y, irisStart, irisEnd, state.eyeColor.iris, scale);
  span(ctx, top, irisStart, irisEnd, state.eyeColor.ring, scale);
  span(ctx, bottom, irisStart, irisEnd, state.eyeColor.ring, scale);
  for (let y = top + 1; y < bottom; y++) span(ctx, y, x - 1, x + 1, state.eyeColor.hi, scale);
  const pupilStart = x - Math.floor(pupilWidth / 2);
  for (let y = Math.max(top + 1, 56); y <= Math.min(bottom - 1, 59); y++) span(ctx, y, pupilStart, pupilStart + pupilWidth - 1, '#0e0804', scale);
  px(ctx, x - 3, top + 1, 2, 2, '#f4f0e8', scale);
  px(ctx, x + 2, bottom - 1, 1, 1, '#c8b8a0', scale);
  for (let y = lashTop; y <= lashBottom; y++) span(ctx, y, x - 8, x + 7, LASH, scale);
  if (state.eyes === 'sharp') {
    px(ctx, x - 9 * sign - (sign > 0 ? 1 : 0), 52, 1, 1, LASH, scale);
    px(ctx, x - 10 * sign - (sign > 0 ? 1 : 0), 51, 1, 1, LASH, scale);
  }
  if (state.eyes === 'lashes') {
    px(ctx, x - 9, 53, 1, 2, LASH, scale);
    px(ctx, x + 8, 53, 1, 2, LASH, scale);
    px(ctx, x - 7, 52, 1, 1, LASH, scale);
    px(ctx, x + 6, 52, 1, 1, LASH, scale);
  }
  px(ctx, x - 8, 57, 1, 1, LASH, scale);
  px(ctx, x + 8, 57, 1, 1, LASH, scale);
  drawSubtleLowerLid(ctx, x, bottom, state, scale);
};

const drawSubtleLowerLid = (ctx: Ctx, x: number, bottom: number, state: RenderState, scale: number) => {
  const shade = state.skin.mid;
  const light = state.skin.hi;
  [-5, -2, 2, 5].forEach(offset => px(ctx, x + offset, bottom + 1, 1, 1, shade, scale));
  [-3, 3].forEach(offset => px(ctx, x + offset, bottom + 2, 1, 1, light, scale));
};

const drawEyes = (ctx: Ctx, state: RenderState, scale: number) => {
  drawEye(ctx, 38, 1, state, scale);
  drawEye(ctx, 74, -1, state, scale);
};

const drawNose = (ctx: Ctx, state: RenderState, scale: number) => {
  if (state.nose === 'button') {
    for (let y = 66; y <= 75; y++) px(ctx, 57, y, 1, 1, state.skin.mid, scale);
    px(ctx, 54, 74, 4, 2, state.skin.hi, scale);
    for (let y = 77; y <= 79; y++) {
      span(ctx, y, 49, 52, state.skin.mid, scale);
      span(ctx, y, 60, 63, state.skin.mid, scale);
    }
    px(ctx, 51, 78, 1, 2, state.skin.dk, scale);
    px(ctx, 61, 78, 1, 2, state.skin.dk, scale);
    span(ctx, 80, 51, 61, state.skin.sh, scale);
    return;
  }

  if (state.nose === 'wide') {
    for (let y = 60; y <= 75; y++) {
      px(ctx, 52, y, 1, 1, state.skin.hi, scale);
      px(ctx, 59, y, 1, 1, state.skin.sh, scale);
    }
    px(ctx, 53, 74, 5, 2, state.skin.hi, scale);
    for (let y = 76; y <= 81; y++) {
      span(ctx, y, 44, 52, state.skin.mid, scale);
      span(ctx, y, 60, 68, state.skin.mid, scale);
    }
    px(ctx, 47, 79, 3, 2, state.skin.dk, scale);
    px(ctx, 62, 79, 3, 2, state.skin.dk, scale);
    span(ctx, 82, 46, 66, state.skin.sh, scale);
    return;
  }

  for (let y = 58; y <= 75; y++) {
    px(ctx, 53, y, 1, 1, state.skin.hi, scale);
    px(ctx, 58, y, 1, 1, state.skin.sh, scale);
  }
  px(ctx, 54, 74, 4, 3, state.skin.hi, scale);
  for (let y = 77; y <= 80; y++) {
    span(ctx, y, 48, 52, state.skin.mid, scale);
    span(ctx, y, 60, 64, state.skin.mid, scale);
  }
  px(ctx, 50, 79, 2, 2, state.skin.dk, scale);
  px(ctx, 61, 79, 2, 2, state.skin.dk, scale);
  span(ctx, 81, 50, 62, state.skin.sh, scale);
};

const drawMouth = (ctx: Ctx, state: RenderState, scale: number) => {
  const upperLip = '#A05048';
  const lowerLip = '#C87068';
  const lipHighlight = '#E09088';

  if (state.mouth === 'full-lips') {
    span(ctx, 87, 46, 53, upperLip, scale);
    span(ctx, 87, 59, 66, upperLip, scale);
    span(ctx, 88, 44, 68, upperLip, scale);
    span(ctx, 89, 44, 68, upperLip, scale);
    span(ctx, 90, 43, 69, state.skin.dk, scale);
    span(ctx, 91, 44, 68, lowerLip, scale);
    span(ctx, 92, 45, 67, lowerLip, scale);
    span(ctx, 92, 50, 62, lipHighlight, scale);
    span(ctx, 93, 46, 66, lowerLip, scale);
    span(ctx, 94, 48, 64, upperLip, scale);
    px(ctx, 42, 90, 1, 1, state.skin.sh, scale);
    px(ctx, 70, 90, 1, 1, state.skin.sh, scale);
    return;
  }

  if (state.mouth === 'pout') {
    span(ctx, 88, 49, 63, upperLip, scale);
    span(ctx, 89, 48, 64, upperLip, scale);
    span(ctx, 90, 47, 65, state.skin.dk, scale);
    span(ctx, 91, 48, 64, lowerLip, scale);
    span(ctx, 92, 49, 63, lowerLip, scale);
    span(ctx, 92, 52, 60, lipHighlight, scale);
    span(ctx, 93, 50, 62, upperLip, scale);
    px(ctx, 46, 90, 1, 1, state.skin.sh, scale);
    px(ctx, 66, 90, 1, 1, state.skin.sh, scale);
    span(ctx, 95, 52, 60, state.skin.mid, scale);
    return;
  }

  const y = 89;
  span(ctx, y, 43, 46, state.skin.dk, scale);
  span(ctx, y, 66, 69, state.skin.dk, scale);
  span(ctx, y + 1, 46, 50, state.skin.dk, scale);
  span(ctx, y + 1, 62, 66, state.skin.dk, scale);
  span(ctx, y + 2, 50, 62, state.skin.dk, scale);
  px(ctx, 42, y - 1, 1, 2, state.skin.sh, scale);
  px(ctx, 70, y - 1, 1, 2, state.skin.sh, scale);
  span(ctx, y - 1, 46, 66, state.skin.mid, scale);
  span(ctx, y + 3, 47, 65, state.skin.base, scale);
  span(ctx, y + 4, 48, 64, state.skin.base, scale);
  span(ctx, y + 4, 52, 60, state.skin.hi, scale);
  px(ctx, 64, y, 2, 1, '#ffe6ca', scale);
};

const drawFacialHair = (ctx: Ctx, state: RenderState, scale: number) => {
  if (state.facialHair === 'none') return;
  const bottom = headBottom(state.headType);
  const mustache = () => {
    span(ctx, 84, 46, 66, state.hairColor.dk, scale);
    span(ctx, 85, 44, 68, state.hairColor.dk, scale);
    span(ctx, 86, 44, 68, state.hairColor.dk, scale);
    span(ctx, 87, 44, 54, state.hairColor.dk, scale);
    span(ctx, 87, 58, 68, state.hairColor.dk, scale);
    px(ctx, 46, 85, 6, 1, state.hairColor.base, scale);
    px(ctx, 60, 85, 6, 1, state.hairColor.base, scale);
  };

  if (state.facialHair === 'stubble') {
    for (let y = 80; y <= bottom; y++) {
      const half = headHalf(state.headType, y);
      for (let x = CX - half + 2; x <= CX + half - 2; x++) {
        const onJaw = x < CX - 14 || x > CX + 14 || y > 96;
        const clearMouth = !(y >= 88 && y <= 96 && x >= 42 && x <= 70);
        if (onJaw && clearMouth && (x * 7 + y * 5) % 4 === 0) px(ctx, x, y, 1, 1, state.hairColor.dk, scale);
      }
    }
    return;
  }
  if (state.facialHair === 'mustache') {
    mustache();
    return;
  }
  if (state.facialHair === 'goatee') {
    mustache();
    px(ctx, 43, 90, 3, 6, state.hairColor.dk, scale);
    px(ctx, 66, 90, 3, 6, state.hairColor.dk, scale);
    for (let y = 96; y <= 105; y++) span(ctx, y, 48 + Math.abs(101 - y), 64 - Math.abs(101 - y), state.hairColor.dk, scale);
    return;
  }
  mustache();
  for (let y = 74; y <= bottom + 1; y++) {
    const half = headHalf(state.headType, Math.min(y, bottom));
    if (y <= 94) {
      span(ctx, y, CX - half, CX - half + 7, state.hairColor.dk, scale);
      span(ctx, y, CX + half - 7, CX + half, state.hairColor.dk, scale);
    } else {
      span(ctx, y, CX - half, CX + half, state.hairColor.dk, scale);
    }
  }
};

const hairTopRow = (y: number, type: HeadShape): number => {
  const dome: Record<number, number> = { 4: 14, 5: 18, 6: 22, 7: 25, 8: 27, 9: 29 };
  return y < 10 ? (dome[y] || 0) : headHalf(type, Math.max(y, 12)) + 2;
};

const drawHairBack = (ctx: Ctx, state: RenderState, scale: number) => {
  if (!['long', 'bob', 'ponytail', 'pigtails', 'wavy', 'dreads'].includes(state.hair)) return;
  for (let y = 20; y <= 118; y++) {
    const half = y < 96 ? headHalf(state.headType, Math.min(y, 96)) : headHalf(state.headType, 90);
    const width = state.hair === 'bob' ? 5 : y > 96 ? 7 + Math.min(5, (y - 96) >> 1) : 7;
    const offset = Math.max(half, 26);
    span(ctx, y, CX - offset - width, CX - offset + 1, state.hairColor.base, scale);
    span(ctx, y, CX + offset - 1, CX + offset + width, state.hairColor.base, scale);
    px(ctx, CX - offset - width, y, 2, 1, state.hairColor.hi, scale);
    px(ctx, CX + offset + width - 2, y, 2, 1, state.hairColor.dk, scale);
  }

  if (state.hair === 'ponytail') {
    for (let y = 36; y <= 98; y++) span(ctx, y, 86, 98 - Math.floor((y - 36) / 8), state.hairColor.base, scale);
    span(ctx, 42, 82, 98, state.hairColor.dk, scale);
  }

  if (state.hair === 'pigtails') {
    for (let y = 42; y <= 92; y++) {
      const width = 5 + Math.floor((y - 42) / 12);
      span(ctx, y, 16, 16 + width, state.hairColor.base, scale);
      span(ctx, y, 96 - width, 96, state.hairColor.base, scale);
    }
  }
};

const drawHairFront = (ctx: Ctx, state: RenderState, scale: number) => {
  const hair = state.hair;
  const streaks = (fromY: number, toY: number) => {
    for (let y = fromY; y <= toY; y++) {
      const half = hairTopRow(y, state.headType);
      for (let x = CX - half; x <= CX + half; x++) {
        const t = x + y * 2;
        if (t % 11 < 3 && y < toY - 3) px(ctx, x, y, 1, 1, state.hairColor.hi, scale);
        else if (t % 13 < 2) px(ctx, x, y, 1, 1, state.hairColor.dk, scale);
      }
    }
  };

  if (hair === 'bald') {
    span(ctx, 13, 42, 62, state.skin.hi, scale);
    span(ctx, 14, 46, 58, state.skin.hi, scale);
    return;
  }

  if (hair === 'buzz') {
    for (let y = 10; y <= 22; y++) span(ctx, y, CX - headHalf(state.headType, Math.max(y, 12)), CX + headHalf(state.headType, Math.max(y, 12)), state.hairColor.dk, scale);
    for (let y = 13; y <= 24; y += 2) {
      for (let x = 32; x <= 80; x += 3) if ((x + y) % 2 === 0) px(ctx, x, y, 1, 1, state.hairColor.hi, scale);
    }
    return;
  }

  if (hair === 'mohawk') {
    for (let y = 8; y <= 20; y++) {
      const half = hairTopRow(y, state.headType) - 2;
      for (let x = CX - half; x <= CX + half; x++) if (Math.abs(x - CX) > 8 && (x + y) % 2 === 0) px(ctx, x, y, 1, 1, state.hairColor.dk, scale);
    }
    for (let y = 0; y <= 22; y++) span(ctx, y, CX - (y < 4 ? 4 : 6), CX + (y < 4 ? 4 : 6), state.hairColor.base, scale);
    px(ctx, CX - 1, 2, 2, 18, state.hairColor.hi, scale);
    px(ctx, CX + 4, 4, 2, 18, state.hairColor.dk, scale);
    return;
  }

  if (hair === 'curly' || hair === 'afro') {
    const ball = (x: number, y: number, radius: number) => {
      for (let dy = -radius; dy <= radius; dy++) {
        const width = Math.floor(Math.sqrt(radius * radius - dy * dy));
        span(ctx, y + dy, x - width, x + width, state.hairColor.base, scale);
      }
      px(ctx, x - Math.floor(radius / 2), y - Math.floor(radius / 2), 2, 2, state.hairColor.hi, scale);
      px(ctx, x + Math.floor(radius / 2), y + Math.floor(radius / 3), 1, 2, state.hairColor.dk, scale);
    };
    const extra = hair === 'afro' ? 5 : 0;
    for (let y = 8; y <= 28 + extra; y++) span(ctx, y, CX - hairTopRow(Math.max(y, 10), state.headType) - extra, CX + hairTopRow(Math.max(y, 10), state.headType) + extra, state.hairColor.base, scale);
    ball(30, 14, 7 + extra); ball(42, 9, 7 + extra); ball(55, 7, 8 + extra); ball(68, 9, 7 + extra); ball(81, 14, 7 + extra);
    ball(25, 24, 6 + extra); ball(88, 24, 6 + extra);
  } else if (hair === 'spiky') {
    for (let y = 10; y <= 22; y++) span(ctx, y, CX - hairTopRow(y, state.headType), CX + hairTopRow(y, state.headType), state.hairColor.base, scale);
    [[30, 4], [42, 2], [54, 1], [67, 2], [80, 4]].forEach(([x, tipY]) => {
      for (let y = tipY; y <= 12; y++) {
        const width = Math.min(5, Math.ceil((y - tipY) * 0.7));
        span(ctx, y, x - width, x + width, state.hairColor.base, scale);
        px(ctx, x - width, y, 1, 1, state.hairColor.hi, scale);
        px(ctx, x + width, y, 1, 1, state.hairColor.dk, scale);
      }
    });
  } else if (hair === 'flat') {
    for (let y = 6; y <= 22; y++) span(ctx, y, CX - (y <= 8 ? 30 : hairTopRow(y, state.headType)), CX + (y <= 8 ? 30 : hairTopRow(y, state.headType)), state.hairColor.base, scale);
    span(ctx, 6, CX - 30, CX + 30, state.hairColor.dk, scale);
    for (let y = 9; y <= 11; y++) span(ctx, y, CX - 24, CX + 24, state.hairColor.hi, scale);
  } else if (hair === 'pixie') {
    for (let y = 6; y <= 24; y++) span(ctx, y, CX - hairTopRow(y, state.headType) + 2, CX + hairTopRow(y, state.headType) - 3, state.hairColor.base, scale);
    span(ctx, 24, 33, 78, state.hairColor.dk, scale);
    for (let x = 34; x <= 78; x += 8) span(ctx, 14 + (x % 3), x, x + 4, state.hairColor.hi, scale);
  } else if (hair === 'bob') {
    for (let y = 5; y <= 30; y++) span(ctx, y, CX - hairTopRow(y, state.headType) - 1, CX + hairTopRow(y, state.headType) + 1, state.hairColor.base, scale);
    for (let y = 26; y <= 62; y++) {
      const half = headHalf(state.headType, Math.max(y, 26));
      span(ctx, y, CX - half - 5, CX - half + 2, state.hairColor.base, scale);
      span(ctx, y, CX + half - 2, CX + half + 5, state.hairColor.base, scale);
    }
    span(ctx, 62, 25, 87, state.hairColor.dk, scale);
  } else if (hair === 'bangs') {
    for (let y = 4; y <= 22; y++) span(ctx, y, CX - hairTopRow(y, state.headType), CX + hairTopRow(y, state.headType), state.hairColor.base, scale);
    for (let x = 31; x <= 81; x += 8) {
      for (let y = 20; y <= 34; y++) px(ctx, x + Math.floor((y - 20) / 4), y, 4, 1, state.hairColor.dk, scale);
    }
    streaks(5, 22);
  } else if (hair === 'bun') {
    for (let y = 10; y <= 28; y++) span(ctx, y, CX - hairTopRow(y, state.headType), CX + hairTopRow(y, state.headType), state.hairColor.base, scale);
    for (let y = -2; y <= 13; y++) {
      const width = Math.floor(Math.sqrt(Math.max(0, 8 * 8 - (y - 6) * (y - 6))));
      span(ctx, y, CX - width, CX + width, state.hairColor.base, scale);
    }
    px(ctx, CX - 3, 3, 6, 3, state.hairColor.hi, scale);
  } else if (hair === 'wavy' || hair === 'messy' || hair === 'dreads') {
    for (let y = 4; y <= 26; y++) span(ctx, y, CX - hairTopRow(y, state.headType) - 2, CX + hairTopRow(y, state.headType) + 2, state.hairColor.base, scale);
    for (let x = 25; x <= 87; x += hair === 'dreads' ? 6 : 9) {
      const length = hair === 'messy' ? 18 + (x % 4) : hair === 'dreads' ? 44 : 30;
      for (let y = 16; y <= length; y++) {
        if ((y + x) % 3 !== 0) px(ctx, x + Math.floor(Math.sin(y / 3) * 2), y, hair === 'dreads' ? 2 : 4, 1, y % 5 === 0 ? state.hairColor.hi : state.hairColor.dk, scale);
      }
    }
  } else {
    for (let y = 4; y <= 24; y++) span(ctx, y, CX - hairTopRow(y, state.headType), CX + hairTopRow(y, state.headType), state.hairColor.base, scale);
    streaks(5, 22);
    if (hair === 'long' || hair === 'ponytail' || hair === 'pigtails') px(ctx, CX, 5, 1, 16, state.hairColor.dk, scale);
  }

  const edgeY = hair === 'curly' || hair === 'afro' ? 24 : 22;
  span(ctx, edgeY, CX - hairTopRow(edgeY, state.headType), CX + hairTopRow(edgeY, state.headType), state.hairColor.dk, scale);
  const longLike = ['long', 'ponytail', 'pigtails', 'wavy', 'dreads'].includes(hair);
  for (let y = longLike ? 25 : 23; y <= (longLike ? 60 : 46); y++) {
    const half = headHalf(state.headType, Math.max(y, 12));
    span(ctx, y, CX - half - 1, CX - half + 3, longLike ? state.hairColor.base : state.hairColor.dk, scale);
    span(ctx, y, CX + half - 3, CX + half + 1, longLike ? state.hairColor.base : state.hairColor.dk, scale);
  }
};

export const renderProfilePortrait = (ctx: Ctx, selection: ProfileBuilderSelection, scale = PROFILE_CANVAS_SCALE) => {
  const state = makeState(selection);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, PROFILE_ART_GRID.width * scale, PROFILE_ART_GRID.height * scale);

  drawBackground(ctx, state, scale);
  drawHairBack(ctx, state, scale);
  drawBody(ctx, state, scale);
  drawNeck(ctx, state.skin, scale);
  drawEars(ctx, state, scale);
  drawHead(ctx, state, scale);
  drawBrows(ctx, state, scale);
  drawEyes(ctx, state, scale);
  drawNose(ctx, state, scale);
  if (state.facialHair === 'full') {
    drawFacialHair(ctx, state, scale);
    drawMouth(ctx, state, scale);
  } else {
    drawMouth(ctx, state, scale);
    drawFacialHair(ctx, state, scale);
  }
  drawHairFront(ctx, state, scale);
};

export const exportProfilePortrait = (selection: ProfileBuilderSelection, exportScale = 3): string => {
  const sourceCanvas = document.createElement('canvas');
  const canvas = document.createElement('canvas');
  const scale = PROFILE_CANVAS_SCALE * exportScale;
  const sourceWidth = PROFILE_ART_GRID.width * scale;
  const sourceHeight = PROFILE_ART_GRID.height * scale;
  const outputSize = PROFILE_AVATAR_EXPORT.size * scale;
  const offsetX = PROFILE_AVATAR_EXPORT.padX * scale;
  const offsetY = PROFILE_AVATAR_EXPORT.padY * scale;

  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  canvas.width = outputSize;
  canvas.height = outputSize;

  const sourceContext = sourceCanvas.getContext('2d');
  const ctx = canvas.getContext('2d');
  if (!sourceContext || !ctx) return '';
  const state = makeState(selection);
  renderProfilePortrait(sourceContext, selection, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, outputSize, outputSize);
  drawAvatarExportBackground(ctx, state, scale);
  ctx.drawImage(sourceCanvas, offsetX, offsetY);
  return canvas.toDataURL('image/png');
};
