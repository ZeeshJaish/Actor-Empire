import type { CSSProperties } from 'react';

/**
 * EMPIRE+ — BRAND BRIDGE
 *
 * The whole streaming UI re-themes around the colour the player picked when
 * they founded their platform. Before this file, fourteen screens each invented
 * their own variable name for that one idea — `--epx-bld-c`, `--epx-hq-c`,
 * `--epx-nw-c`, `--epx-ad-c`, `--epx-br-c`, `--epx-cd-c` and so on — which is
 * why a Buildout tweak never reached the Boardroom and why nothing felt like
 * one product.
 *
 * There is now one idea behind it. A screen that wants the brand colour writes
 * `var(--epx-brand)`; a screen that wants a 12% tint writes
 * `var(--epx-brand-wash)` instead of mixing its own rgba by hand.
 *
 * WHY THE RAMP IS COMPUTED HERE AND NOT IN CSS
 * tokens.css declares the ramp on `:root` as `hsl(var(--epx-brand-h) …)`. A
 * custom property's var() references are substituted at computed-value time on
 * the element the DECLARATION sits on — so `--epx-brand` resolves once, at
 * :root, using :root's hue. A screen root deeper in the tree that overrides
 * `--epx-brand-h` inherits the already-substituted value and its override does
 * nothing. (Verified in the browser: a nested host set to hue 52 still painted
 * root blue.) Declaring the ramp on a shared class would fix it, but would mean
 * touching every screen root's markup; computing the values here fixes it in
 * one file and cannot be silently re-broken by a future nesting change.
 *
 * The :root declarations in tokens.css remain the defaults for surfaces that
 * render before a platform exists — the locked screen, eligibility, chapter one.
 *
 * MIGRATION
 * `brandVars()` also emits every legacy per-screen name, so a screen root can
 * switch to it today with no visual change at all, and the legacy names can be
 * deleted from that screen's module later, one screen at a time. When a
 * screen's CSS no longer mentions its legacy name, drop it from LEGACY_ALIASES
 * below — when that list is empty, the migration is finished.
 */

/** The two numbers a Brand actually carries. Kept structural so this module
 *  never has to import the full Brand type or the components that own it. */
export interface BrandTone {
  hue: number;
  sat: number;
}

/** Every legacy per-screen brand variable still referenced by a CSS module.
 *  Each entry is a screen that has not been migrated yet. */
const LEGACY_ALIASES = [
  '--epx-bld-c',        // Buildout
  '--epx-hq-c',         // Command Deck
  '--epx-cd-c',         // Content Desk
  '--epx-nw-c',         // Network Desk
  '--epx-ad-c',         // Audience Desk
  '--epx-br-c',         // Boardroom
  '--epx-pr-c',         // Pricing
  '--epx-rs-c',         // Capital Raise
  '--epx-pn-c',         // Premiere Night
  '--epx-dos-c',        // Title Dossier
  '--epx-va-c',         // Viewer App
  '--epx-cine-c',       // Cinematics
  '--epx-ep2-c',        // Founding shell
  '--epx-ep2-brand',    // Founding shell (button gradient)
  '--epx-deck-primary', // Brand visuals
] as const;

/** The legacy names that want the DEEP end of the brand ramp, not the face. */
const LEGACY_DEEP_ALIASES = [
  '--epx-hq-c2',
  '--epx-cine-c2',
  '--epx-ep2-c2',
  '--epx-ep2-brand2',
  '--epx-deck-deep',
] as const;

export const brandHsl = (tone: BrandTone, lightness: number): string =>
  `hsl(${tone.hue} ${tone.sat}% ${lightness}%)`;

const hueChannel = (p: number, q: number, rawHue: number): number => {
  let hue = rawHue;
  if (hue < 0) hue += 1;
  if (hue > 1) hue -= 1;
  if (hue < 1 / 6) return p + (q - p) * 6 * hue;
  if (hue < 1 / 2) return q;
  if (hue < 2 / 3) return p + (q - p) * (2 / 3 - hue) * 6;
  return p;
};

const linearChannel = (channel: number): number => (
  channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
);

/** Relative luminance for the 58% brand face used throughout the UI. */
const brandLuminance = (tone: BrandTone): number => {
  const hue = (((tone.hue % 360) + 360) % 360) / 360;
  const saturation = Math.max(0, Math.min(100, tone.sat)) / 100;
  const lightness = 0.58;
  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const rgb = saturation === 0
    ? [lightness, lightness, lightness]
    : [
      hueChannel(p, q, hue + 1 / 3),
      hueChannel(p, q, hue),
      hueChannel(p, q, hue - 1 / 3),
    ];
  const [red, green, blue] = rgb.map(linearChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/**
 * Accessible text colour for controls filled with the player's brand colour.
 * The colour wizard permits bright yellow, orange and neutral presets; white
 * text on those faces fails contrast, so the ink must be derived rather than
 * hard-coded.
 */
export const contrastInkForBrand = (tone: BrandTone): '#05070b' | '#ffffff' => {
  const luminance = brandLuminance(tone);
  const darkContrast = (luminance + 0.05) / (0.0021 + 0.05);
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast ? '#05070b' : '#ffffff';
};

/**
 * The style object a screen root spreads to theme everything beneath it.
 *
 * Emits the canonical `--epx-brand-h` / `--epx-brand-s` plus every legacy alias, so the
 * call is a drop-in replacement for the hand-rolled inline styles it supersedes:
 *
 *   <div className={css.bld} style={brandVars(brand)}>
 *
 * Extra variables a screen genuinely needs (per-instance hues, animation
 * delays) go in `extra` rather than being merged at the call site, so the
 * brand contract stays in one place.
 */
export const brandVars = (
  tone: BrandTone,
  extra?: CSSProperties,
): CSSProperties => {
  const { hue } = tone;
  const sat = `${tone.sat}%`;
  const satDeep = `${Math.round(tone.sat * 0.85)}%`;
  /** The 58% face at a given alpha — the one mix the whole system is built on. */
  const faceAt = (alpha: number) => `hsl(${hue} ${sat} 58% / ${alpha})`;

  const face = brandHsl(tone, 58);
  const deep = `hsl(${hue} ${satDeep} 26%)`;

  const vars: Record<string, string | number> = {
    /* The raw numbers stay available so a module can still colour-mix its own
       one-off shade without reaching for a literal. */
    '--epx-brand-h': `${hue}`,
    '--epx-brand-s': sat,
    '--epx-brand-s-deep': satDeep,

    /* The full ramp, resolved here rather than in CSS — see the note at the top
       of this file for why deriving it at :root cannot work for nested roots. */
    '--epx-brand': face,
    '--epx-brand-lift': brandHsl(tone, 70),
    '--epx-brand-deep': deep,
    '--epx-brand-ink': contrastInkForBrand(tone),
    '--epx-brand-wash': faceAt(0.12),
    '--epx-brand-veil': faceAt(0.05),
    '--epx-brand-line': faceAt(0.38),
    '--epx-brand-glow': `0 0 12px ${faceAt(0.55)}`,
    '--epx-brand-grad': `linear-gradient(150deg, ${face}, ${deep})`,
    '--epx-e-brand': `0 12px 32px ${faceAt(0.3)}`,
  };
  for (const name of LEGACY_ALIASES) vars[name] = face;
  for (const name of LEGACY_DEEP_ALIASES) vars[name] = deep;

  return { ...vars, ...extra } as CSSProperties;
};

/**
 * Semantic tone for any 0–1 pressure reading, so "what colour is this number"
 * is answered once instead of by a different ternary on every screen.
 * Higher input means more strain.
 */
export type Tone = 'good' | 'warn' | 'bad';

export const toneForLoad = (ratio: number, warnAt = 0.75, badAt = 0.92): Tone =>
  ratio >= badAt ? 'bad' : ratio >= warnAt ? 'warn' : 'good';

/** The same question asked the other way round: higher input is healthier. */
export const toneForHealth = (ratio: number, warnAt = 0.7, badAt = 0.4): Tone =>
  ratio <= badAt ? 'bad' : ratio <= warnAt ? 'warn' : 'good';
