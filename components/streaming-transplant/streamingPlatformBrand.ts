/**
 * A service's brand, as the command deck and the opening night draw it. #116 (plan §18.6): the real logo, typeface and lockup, as founded or as the brand studio last made them;
 * the family mark stands in only for an identity that never chose one.
 */
import type { OwnedStreamingPlatformState } from '../../types';
import type { Brand } from './StreamingBrandVisuals';

const colorTone = (hex: string): { hue: number; sat: number } => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return { hue: 258, sat: 78 };
  const [r, g, b] = [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue: Math.round((hue + 360) % 360), sat: Math.max(40, Math.min(100, Math.round(saturation * 100))) };
};

export const streamingPlatformBrand = (platform: OwnedStreamingPlatformState, serverCity: string | null): Brand => {
  const identity = platform.identity!;
  const primary = colorTone(identity.primaryColor);
  const secondary = colorTone(identity.secondaryColor);
  const markId = identity.logoKey === 'SIGNAL_RING'
    ? 'ORBIT'
    : identity.logoKey === 'SPOTLIGHT'
      ? 'APERTURE'
      : identity.logoKey === 'WORDMARK'
        ? 'LETTER_SOLID'
        : 'BOLT';
  const promiseId = identity.brandPromiseId === 'EVENT_HOUSE'
    ? 'EVENT'
    : identity.brandPromiseId === 'BINGE_MACHINE'
      ? 'BINGE'
      : identity.brandPromiseId === 'FANDOM_FOREVER'
        ? 'FANDOM'
        : identity.brandPromiseId === 'WORLD_STAGE'
          ? 'WORLD'
          : identity.brandPromiseId === 'EVERYONES_SCREEN'
            ? 'EVERYONE'
            : identity.brandPromiseId === 'TECHNOLOGY_FIRST'
              ? 'TECH'
              : 'BALANCED';
  return {
    name: identity.name,
    markId: identity.visualMarkId || markId,
    customMark: identity.customMarkDataUrl || null,
    hue: primary.hue,
    sat: primary.sat,
    identId: identity.soundIdentKey === 'ASCENT'
      ? 'RISE'
      : identity.soundIdentKey === 'PREMIERE'
        ? 'ANTHEM'
        : identity.soundIdentKey === 'SILENT'
          ? 'HUSH'
          : 'PULSE',
    customIdent: null,
    promiseId,
    publicManifesto: identity.publicManifesto || '',
    layoutId: platform.serviceConfiguration.storefrontLayoutId || 'cinema',
    typeId: identity.typefaceId || (identity.logoKey === 'WORDMARK' ? 'GEOMETRIC' : 'GROTESK'),
    accentHue: secondary.hue,
    identMode: identity.soundIdentKey === 'SILENT' ? 'none' : 'badge',
    identLen: 2,
    ratingId: 'MATURE',
    lockupId: identity.wordmarkStyleId || (identity.logoKey === 'WORDMARK' ? 'ICON' : 'SIDE'),
    serverCity,
  };
};
