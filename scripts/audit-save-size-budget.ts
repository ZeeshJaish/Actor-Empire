/**
 * #234 (plan §25.8): the save's size, watched. It fails when a company or a plain career outgrows its budget, or when one list or one area
 * takes too much of a save, so growth is seen early, while it is one list and not half a save. It trims nothing by itself.
 *
 * Measured on 2026-11-05, on this code: a company 25.2 MB at week 26 and 38.1 MB at week 104 (it was 90.3); a plain career 36.7 MB
 * at 6 years (it was 52.8). The numbers below leave room for honest growth.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';

const COMPANY_WEEKS = 26;
const COMPANY_BUDGET_MB = 32;
const PLAIN_WEEKS = 52;
const PLAIN_BUDGET_MB = 24;
const MOST_OF_A_SAVE = 0.33;
const LONGEST_LIST = 8_000;
/* a career's own records are never trimmed, so they are not held to the list limit */
const FREE_TO_GROW = new Set(['pastProjects', 'instagram.posts', 'flags.dynastyCareerArchives']);

const pass = (label: string) => console.log(`✓ ${label}`);
const size = (value: unknown) => JSON.stringify(value ?? null).length;
const fresh = (id: string) => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Budget Founder', age: 25, currentWeek: 1 });
    return { ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } } as Player;
};
const week = async (player: Player) => (await processGameWeek({ ...player, energy: { current: 100, max: 100 }, pendingEvents: [], stats: { ...player.stats, health: 100, happiness: 100 }, activeHealthConditions: [] })).player;

const longLists = (value: unknown, path: string, depth: number, out: Array<[string, number]>) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        if (value.length > LONGEST_LIST && !FREE_TO_GROW.has(path)) out.push([path, value.length]);
        return;
    }
    if (depth <= 0) return;
    const keys = Object.keys(value as object);
    if (keys.length > 200) {
        if (keys.length > LONGEST_LIST && !FREE_TO_GROW.has(path)) out.push([path, keys.length]);
        return;
    }
    for (const key of keys) longLists((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, depth - 1, out);
};

const judge = (label: string, player: Player, budgetMb: number) => {
    const prepared = prepareVerifiedPlayerForPersistence(player, 'MANUAL').player as unknown as Record<string, unknown> & { world: Record<string, unknown> };
    const total = size(prepared);
    const areas: Array<[string, number]> = [
        ...Object.entries(prepared).filter(([key]) => key !== 'world').map(([key, value]) => [key, size(value)] as [string, number]),
        ...Object.entries(prepared.world).map(([key, value]) => [`world.${key}`, size(value)] as [string, number]),
    ].sort((left, right) => right[1] - left[1]);
    console.log(`${label}: ${(total / 1e6).toFixed(2)} MB; biggest: ${areas.slice(0, 4).map(([key, bytes]) => `${key} ${(bytes / 1e6).toFixed(1)}`).join(', ')}`);
    assert.ok(total / 1e6 <= budgetMb, `${label} is ${(total / 1e6).toFixed(1)} MB, over its ${budgetMb} MB`);
    assert.ok(areas[0][1] / total <= MOST_OF_A_SAVE, `${areas[0][0]} is ${Math.round(areas[0][1] / total * 100)}% of the save`);
    const lists: Array<[string, number]> = [];
    longLists(prepared, '', 6, lists);
    assert.deepEqual(lists, [], 'a list without a limit');
    pass(`${label}: inside ${budgetMb} MB, no area over ${MOST_OF_A_SAVE * 100}%, no list over ${LONGEST_LIST.toLocaleString()} rows`);
};

const main = async () => {
    let company: Player = await buildStreamingFullPlatformQa(fresh('budget-company'), { processWeek: processGameWeek, persistWeek: async next => next });
    for (let index = 0; index < COMPANY_WEEKS; index += 1) company = await week(company);
    judge(`a company at week ${COMPANY_WEEKS}`, company, COMPANY_BUDGET_MB);
    let plain = fresh('budget-plain');
    for (let index = 0; index < PLAIN_WEEKS; index += 1) plain = await week(plain);
    judge(`a plain career at week ${PLAIN_WEEKS}`, plain, PLAIN_BUDGET_MB);
};

main().then(() => console.log('save-size-budget audit passed')).catch(error => { console.error(error); process.exit(1); });
