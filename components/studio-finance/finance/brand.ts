/* ============================================================================
   BRAND

   The platform colour is chosen by the player when they found the streaming
   service, so this screen cannot assume anything about it — it may be a near
   black navy or a bright yellow. Every interactive accent derives from it, and
   three values fall out of the one hex:

   · brand    — the colour itself, for filled surfaces (the primary button).
   · brandOn  — the same hue lifted until it is legible ON the near-black canvas,
                for text, markers, hairlines and thin bars. A maroon platform
                colour would otherwise draw its own tab underline invisible.
   · brandInk — black or white, whichever survives on top of a brand fill, so a
                yellow platform never gets white text on a yellow button.

   Money colours are NOT derived from this. Green and red mean profit and loss
   and belong to the numbers, never to the brand — that separation is the whole
   reason a player can read the screen at a glance.
   ========================================================================== */

export interface BrandVars {
  '--sf-brand-rgb': string;
  '--sf-brand-on-rgb': string;
  '--sf-brand-ink': string;
}

const FALLBACK = '#e0322f';

export function brandVars(hex?: string): BrandVars {
  const rgb = parseHex(hex ?? FALLBACK) ?? (parseHex(FALLBACK) as [number, number, number]);
  const light = luminance(rgb);

  return {
    '--sf-brand-rgb': rgb.join(', '),
    '--sf-brand-on-rgb': (light < 0.3 ? lift(rgb) : rgb).join(', '),
    /* 0.42 is where white text stops holding up: an amber or lime platform
       needs black on its buttons, a blue or maroon one needs white. */
    '--sf-brand-ink': light > 0.42 ? '#0a0b0f' : '#ffffff',
  };
}

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Relative luminance, 0–1. Good enough to pick a side; not a contrast audit. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Raises lightness while holding hue and saturation. Mixing toward white would
 * be simpler, but it desaturates: a deep navy platform came out grey, which
 * reads as "no brand colour at all" rather than as that platform's blue.
 */
function lift(rgb: [number, number, number]): [number, number, number] {
  const [h, s, l] = toHsl(rgb);
  return toRgb(h, Math.max(s, 0.45), Math.max(l, 0.58));
}

function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function toRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}
