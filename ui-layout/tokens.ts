/** Semantic defaults; games can theme the matching CSS custom properties. */
export const DEFAULT_LAYOUT_TOKENS = {
  minimumTouchTargetPx: 44,
  minimumStatItemPx: 96,
  minimumFullActionPx: 144,
  groupGapPx: 8,
  inlineSpacePx: 12,
  maximumContentWidthPx: 960,
  modes: ['compact', 'regular', 'wide'],
} as const;

export type LayoutMode = (typeof DEFAULT_LAYOUT_TOKENS.modes)[number];
