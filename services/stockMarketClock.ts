/** Same zero-based absolute week used by legacyLogic and the world engine. */
export const getStockMarketAbsoluteWeek = (age: number, week: number): number => (
    (Math.max(1, Math.floor(age)) - 1) * 52 + Math.max(0, Math.floor(week) - 1)
);

/** Translate a week-only legacy marker to the most recent occurrence, never a future year. */
export const stockLegacyMarkerAbsoluteWeek = (age: number, week: number, legacyWeek = 0): number => {
    const yearStart = getStockMarketAbsoluteWeek(age, 1);
    if (!legacyWeek) return yearStart - 1;
    const candidate = yearStart + legacyWeek - 1;
    return candidate > getStockMarketAbsoluteWeek(age, week) ? candidate - 52 : candidate;
};
