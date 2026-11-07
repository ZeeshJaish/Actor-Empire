/**
 * #236 (plan §25.4 Q6): the one way a date reaches a screen. An absolute week is zero-based: `getAbsoluteWeek` is
 * (age − 1) × 52 + (week − 1). So the week of the year is (absolute % 52) + 1, and a screen never shows the raw number.
 */

/** the week of the year, 1 to 52 */
export const weekOfYear = (absoluteWeek: number) => ((Math.floor(Number(absoluteWeek) || 0) % 52) + 52) % 52 + 1;

const yearOf = (absoluteWeek: number) => Math.floor(Math.floor(Number(absoluteWeek) || 0) / 52);

const yearWords = (absoluteWeek: number, now?: number | null) => {
    if (now === undefined || now === null) return '';
    const years = yearOf(absoluteWeek) - yearOf(now);
    if (years === 0) return '';
    if (years === 1) return ' next year';
    if (years === -1) return ' last year';
    return years > 1 ? ` in ${years} years` : ` ${-years} years ago`;
};

/** "Week 14", or "Week 14 next year" when `now` is known and the year differs */
export const gameWeekLabel = (absoluteWeek: number, now?: number | null) => `Week ${weekOfYear(absoluteWeek)}${yearWords(absoluteWeek, now)}`;

/** the same inside a sentence: "week 14 next year" */
export const gameWeekText = (absoluteWeek: number, now?: number | null) => `week ${weekOfYear(absoluteWeek)}${yearWords(absoluteWeek, now)}`;

/** a tight label: "W14" */
export const gameWeekShort = (absoluteWeek: number) => `W${weekOfYear(absoluteWeek)}`;
