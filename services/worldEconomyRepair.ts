/**
 * 2026-11-11 (1.0.26 live, "Week N was not applied", about 52 players): 1.0.25's rival economy had no
 * ceiling, so a rival studio's cash and valuation grew about five times a game year. 1.0.26 keeps rival
 * money in exact cents, and a number above about $90 trillion cannot be held in cents, so the first week
 * after the update threw on every retry (qa/2026-11-11-npc-cash-overflow in the marketing folder).
 *
 * This load repair bounds what the old economy left behind: rival cash, valuation, and the studio AI's
 * weekly cost, debt and committed spend (that weekly cost is seeded from the square root of the old
 * valuation, so bounding cash alone failed again within six weeks on 20+ year saves). It only touches
 * values far above anything a 1.0.26 world reaches (a fresh world's richest rival holds about $20B and
 * Apple TV+ starts at $2.9T), so a fresh save is unchanged. Non-finite values become safe ones.
 */
import type { Player } from '../types';

/** $500B cash (millions) */
export const RIVAL_CASH_CEILING_MILLIONS = 500_000;
/** $5T valuation (billions) */
export const RIVAL_VALUATION_CEILING_BILLIONS = 5_000;
/** $50M a week (millions) */
export const RIVAL_WEEKLY_COST_CEILING_MILLIONS = 50;

type Repair = { player: Player; repaired: number };

const bounded = (value: unknown, ceiling: number, fallback: number, floor = -ceiling): number => {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return fallback;
    return number > ceiling ? ceiling : number < floor ? floor : number;
};

/** A rival record (studio, platform or venture): cash in millions, valuation in billions. */
const repairRival = <T extends Record<string, any>>(row: T, counter: { count: number }): T => {
    if (!row || typeof row !== 'object') return row;
    let next: Record<string, any> = row;
    const set = (key: string, value: number) => {
        if (next[key] === value) return;
        if (next === row) next = { ...row };
        next[key] = value;
        counter.count += 1;
    };
    if ('cashReserve' in row) set('cashReserve', bounded(row.cashReserve, RIVAL_CASH_CEILING_MILLIONS, 0));
    if ('valuation' in row) set('valuation', bounded(row.valuation, RIVAL_VALUATION_CEILING_BILLIONS, 1, 0));
    const finance = row.ai?.finance;
    if (finance && typeof finance === 'object') {
        const repairedFinance = {
            ...finance,
            weeklyOperatingCostMillions: bounded(finance.weeklyOperatingCostMillions, RIVAL_WEEKLY_COST_CEILING_MILLIONS, 1, 0),
            debtPrincipalMillions: bounded(finance.debtPrincipalMillions, RIVAL_CASH_CEILING_MILLIONS, 0, 0),
            committedSpendMillions: bounded(finance.committedSpendMillions, RIVAL_CASH_CEILING_MILLIONS, 0, 0),
        };
        const changed = (['weeklyOperatingCostMillions', 'debtPrincipalMillions', 'committedSpendMillions'] as const)
            .filter(key => repairedFinance[key] !== finance[key]).length;
        if (changed) {
            if (next === row) next = { ...row };
            next.ai = { ...row.ai, finance: repairedFinance };
            counter.count += changed;
        }
    }
    return next as T;
};

const repairGroup = <T extends Record<string, any>>(group: Record<string, T> | undefined, counter: { count: number }) => {
    if (!group || typeof group !== 'object') return group;
    let next: Record<string, T> | null = null;
    for (const [id, row] of Object.entries(group)) {
        const repaired = repairRival(row, counter);
        if (repaired !== row) {
            next ??= { ...group };
            next[id] = repaired;
        }
    }
    return next ?? group;
};

/** Idempotent: a world already inside the bounds comes back as the same object. */
export const repairRunawayRivalEconomy = (player: Player): Repair => {
    const counter = { count: 0 };
    const world = player.world as Player['world'] & Record<string, any>;
    if (!world || typeof world !== 'object') return { player, repaired: 0 };
    const studios = repairGroup(world.studios as any, counter);
    const platforms = repairGroup(world.platforms as any, counter);
    const worldVentures = repairGroup(world.npcVentures as any, counter);
    const playerVentures = repairGroup((player as any).npcVentures, counter);
    if (!counter.count) return { player, repaired: 0 };
    return {
        player: {
            ...player,
            ...(playerVentures !== (player as any).npcVentures ? { npcVentures: playerVentures } : {}),
            world: {
                ...world,
                ...(studios !== world.studios ? { studios } : {}),
                ...(platforms !== world.platforms ? { platforms } : {}),
                ...(worldVentures !== world.npcVentures ? { npcVentures: worldVentures } : {}),
            },
        } as Player,
        repaired: counter.count,
    };
};
