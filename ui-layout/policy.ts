import { DEFAULT_LAYOUT_TOKENS } from './tokens';

/** A game-neutral policy for a row of equally sized items. */
export interface ColumnPolicy {
  gapPx: number;
  variants: readonly { columns: number; minItemWidthPx: number }[];
}

export const STAT_GROUP_POLICY: ColumnPolicy = {
  gapPx: DEFAULT_LAYOUT_TOKENS.groupGapPx,
  variants: [
    { columns: 1, minItemWidthPx: DEFAULT_LAYOUT_TOKENS.minimumStatItemPx },
    { columns: 2, minItemWidthPx: DEFAULT_LAYOUT_TOKENS.minimumStatItemPx },
    { columns: 4, minItemWidthPx: DEFAULT_LAYOUT_TOKENS.minimumStatItemPx },
  ],
};

export const ACTION_GROUP_POLICY: ColumnPolicy = {
  gapPx: DEFAULT_LAYOUT_TOKENS.groupGapPx,
  variants: [
    { columns: 1, minItemWidthPx: DEFAULT_LAYOUT_TOKENS.minimumFullActionPx },
    { columns: 2, minItemWidthPx: DEFAULT_LAYOUT_TOKENS.minimumFullActionPx },
  ],
};

export function chooseColumnCount(containerWidthPx: number, policy: ColumnPolicy): number {
  if (!Number.isFinite(policy.gapPx) || policy.gapPx < 0) {
    throw new Error('Column policy gap must be nonnegative and finite.');
  }
  if (policy.variants.length === 0) {
    throw new Error('Column policy needs at least one variant.');
  }

  let previousColumns = 0;
  for (const variant of policy.variants) {
    if (!Number.isInteger(variant.columns) || variant.columns <= previousColumns) {
      throw new Error('Column policy variants must be in ascending column order.');
    }
    if (!Number.isFinite(variant.minItemWidthPx) || variant.minItemWidthPx <= 0) {
      throw new Error('Column policy minimum item width must be positive and finite.');
    }
    previousColumns = variant.columns;
  }

  const smallest = policy.variants[0].columns;
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) return smallest;

  let chosen = smallest;
  for (const { columns, minItemWidthPx } of policy.variants) {
    const requiredWidth = columns * minItemWidthPx + (columns - 1) * policy.gapPx;
    if (containerWidthPx >= requiredWidth) chosen = columns;
  }
  return chosen;
}
