/**
 * #206 (plan §23.8): one world clock. The game counts weeks from the player's own age, so an heir starts years "before"
 * the world they inherit. Every dated thing in the world has to move back with them, or nothing the world keeps would run
 * again until the heir had caught up with it: the service loses half its members for no reason (measured: 37.59M alive,
 * 18.91M for the heir six weeks later). Zeesh (2026-11-04): "agar mai mar jau to mera beta ya koi bhi takeover kare to
 * kya scene hai abhi".
 *
 * Only one thing in the world reads the calendar itself, the population's long curves, so they keep their own count of
 * the weeks that moved (`worldPopulation.clockOffsetWeeks`) and never go back.
 */
import type { WorldState } from '../types';

/* the names a date goes by, besides anything ending in AbsoluteWeek */
const DATED_KEYS = new Set([
    'absoluteWeek', 'usageWeek', 'createdWeek', 'settledWeek', 'lastProcessedWeek', 'lastRivalPublicWeek', 'nextEligiblePublicationWeek',
    'rivalTechFromWeek', 'serviceStandardFromWeek', 'streamingCataloguePackagesLastProcessedWeek',
]);
/* these stay put: when the world began, and "for ever" */
const FIXED_KEYS = new Set(['epochAbsoluteWeek']);
const FOREVER = 1e12;

const isDated = (key: string) => !FIXED_KEYS.has(key) && (DATED_KEYS.has(key) || key.endsWith('AbsoluteWeek') || key.endsWith('AbsoluteWeeks'));

/** every date in a value, moved back; "for ever" stays "for ever". `leave` names the parts whose clocks the caller moves itself */
export const rebaseLegacyWeeks = <T,>(value: T, offset: number, key = '', leave?: ReadonlySet<string>): T => {
    if (Array.isArray(value)) return value.map(item => rebaseLegacyWeeks(item, offset, key.endsWith('AbsoluteWeeks') ? key : '', leave)) as unknown as T;
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [childKey, leave?.has(childKey) ? childValue : rebaseLegacyWeeks(childValue, offset, childKey, leave)])) as T;
    }
    if (typeof value === 'number' && Number.isFinite(value) && value < FOREVER && isDated(key)) return Math.max(0, value - offset) as unknown as T;
    return value;
};

/** the world an heir inherits: its dates moved back with them, and the population's own clock carrying on */
export const rebaseWorldForLegacy = <T extends WorldState | undefined>(world: T, offset: number, leave?: readonly string[]): T => {
    if (!world || offset <= 0) return world;
    const moved = rebaseLegacyWeeks(world, offset, '', leave ? new Set(leave) : undefined) as WorldState;
    const people = moved.industryPeople;
    const population = moved.worldPopulation as (WorldState['worldPopulation'] & { clockOffsetWeeks?: number }) | undefined;
    return {
        ...moved,
        /* the industry's people have dates of their own */
        ...(people ? { industryPeople: {
            ...people,
            lastWeek: Math.max(-1, people.lastWeek - offset),
            ...(typeof people.firstWeek === 'number' ? { firstWeek: Math.max(0, people.firstWeek - offset) } : {}),
            joins: Object.fromEntries(Object.entries(people.joins || {}).map(([id, list]) => [id, list.map(join => ({ ...join, w: Math.max(0, join.w - offset) }))])),
        } } : {}),
        ...(population ? { worldPopulation: { ...population, clockOffsetWeeks: (population.clockOffsetWeeks || 0) + offset } } : {}),
    } as T;
};
