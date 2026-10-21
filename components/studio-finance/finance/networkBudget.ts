const safeCeiling = (value: number) => Number.isFinite(value)
  ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0;

/** More travel for small budgets; the exact text amount is never rounded by this scale. */
export function budgetAmountAt(position: number, ceiling: number): number {
  const share = Number.isFinite(position) ? Math.min(1000, Math.max(0, position)) / 1000 : 0;
  return Math.round(safeCeiling(ceiling) * share * share);
}

export function budgetPositionFor(amount: number, ceiling: number): number {
  const maximum = safeCeiling(ceiling);
  if (!maximum || !Number.isFinite(amount)) return 0;
  return Math.round(Math.sqrt(Math.min(maximum, Math.max(0, amount)) / maximum) * 1000);
}
