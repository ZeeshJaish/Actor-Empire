/**
 * 2026-11-11, 1.0.26 live: "Week N was not applied" (about 52 players). Old 1.0.25 economies left rival money
 * above about $90T, which 1.0.26's exact-cents money cannot hold; a new career in debt with dividend shares
 * failed its first dividend week. This audit holds the repair:
 * - the load repair bounds runaway rival cash, valuation and studio AI weekly cost/debt/committed spend,
 *   and leaves a fresh world untouched;
 * - a rival cash move past the limit is held there, never thrown;
 * - a dividend or share sale can land on a balance in debt; a purchase still cannot overdraw;
 * - a new career in debt that holds dividend shares plays through its dividend weeks.
 * The long old-save runs (7 to 30 old years, 52 weeks each) are in the marketing folder's
 * qa/2026-11-11-fixes report, because they need saves built by the 1.0.25 engine.
 * Run: npm run audit:old-save-week-repair
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { RIVAL_CASH_CEILING_MILLIONS, RIVAL_VALUATION_CEILING_BILLIONS, RIVAL_WEEKLY_COST_CEILING_MILLIONS, repairRunawayRivalEconomy } from '../services/worldEconomyRepair';
import { getNpcCinemaCashSaturations, moveCinemaNpcCash, NPC_CINEMA_CASH_LIMIT_MILLIONS } from '../services/boxOffice/boxOfficeSettlement';
import { settleStockCash } from '../services/stockSettlement';

const pass = (label: string) => console.log(`PASS ${label}`);
const keepAlive = (p: Player): Player => ({ ...p, pendingEvent: null, pendingEvents: [], stats: { ...p.stats, health: 100 }, activeHealthConditions: [], flags: { ...(p.flags || {}), isDead: false } } as Player);

async function main() {
    /* ---- a fresh world is untouched */
    const fresh = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'old-save-repair', name: 'Old Save Repair', age: 18, currentWeek: 1 } as Player);
    const untouched = repairRunawayRivalEconomy(fresh);
    assert.equal(untouched.repaired, 0, 'a fresh world needs no repair');
    assert.equal(untouched.player, fresh, 'and comes back as the same object');
    pass('a fresh 1.0.26 world is untouched');

    /* ---- an old runaway world is bounded on load */
    const old = structuredClone(fresh) as any;
    const [firstId, secondId] = Object.keys(old.world.studios);
    old.world.studios[firstId] = { ...old.world.studios[firstId], cashReserve: 2.7e12, valuation: 9e11,
        ai: old.world.studios[firstId].ai ? { ...old.world.studios[firstId].ai, finance: { ...old.world.studios[firstId].ai.finance, weeklyOperatingCostMillions: 75_000, debtPrincipalMillions: 4e9, committedSpendMillions: Number.NaN } } : old.world.studios[firstId].ai };
    old.world.studios[secondId] = { ...old.world.studios[secondId], cashReserve: Number.POSITIVE_INFINITY, valuation: Number.NaN };
    const platformId = Object.keys(old.world.platforms)[0];
    old.world.platforms[platformId] = { ...old.world.platforms[platformId], cashReserve: 3e10 };
    const loaded = migratePlayerSave(old);
    const studio = (loaded.world.studios as any)[firstId];
    assert.equal(studio.cashReserve, RIVAL_CASH_CEILING_MILLIONS);
    assert.equal(studio.valuation, RIVAL_VALUATION_CEILING_BILLIONS);
    if (studio.ai?.finance) {
        assert.equal(studio.ai.finance.weeklyOperatingCostMillions, RIVAL_WEEKLY_COST_CEILING_MILLIONS);
        assert.equal(studio.ai.finance.debtPrincipalMillions, RIVAL_CASH_CEILING_MILLIONS);
        assert.equal(studio.ai.finance.committedSpendMillions, 0, 'NaN committed spend becomes 0');
    }
    assert.ok(Number.isFinite((loaded.world.studios as any)[secondId].cashReserve), 'an infinite treasury becomes a number');
    assert.ok(Number.isFinite((loaded.world.studios as any)[secondId].valuation), 'a NaN valuation becomes a number');
    assert.equal((loaded.world.platforms as any)[platformId].cashReserve, RIVAL_CASH_CEILING_MILLIONS);
    assert.equal(repairRunawayRivalEconomy(loaded).repaired, 0, 'the repair is idempotent');
    pass('an old runaway world: rival cash, valuation, weekly cost, debt and committed spend bounded on load');

    /* ---- the weeks after the repair pass */
    let played = loaded;
    for (let week = 1; week <= 6; week += 1) played = (await processGameWeek(keepAlive(played))).player;
    assert.ok(Object.values(played.world.studios as any).every((row: any) => Number.isFinite(row.cashReserve) && row.cashReserve < NPC_CINEMA_CASH_LIMIT_MILLIONS));
    pass('the repaired world plays its weeks');

    /* ---- the safety net */
    assert.equal(moveCinemaNpcCash(1_234.5678, 10.0001), 1244.5679, 'a normal move keeps its cents');
    const before = getNpcCinemaCashSaturations();
    const held = moveCinemaNpcCash(NPC_CINEMA_CASH_LIMIT_MILLIONS - 1, 1e9);
    assert.ok(held <= NPC_CINEMA_CASH_LIMIT_MILLIONS && held > 0, 'a move past the limit is held at it');
    assert.equal(moveCinemaNpcCash(Number.NaN, 5), 5, 'a NaN treasury restarts from zero');
    assert.ok(getNpcCinemaCashSaturations() >= before + 2, 'and each is counted');
    pass('a rival cash move past $90T is held at the limit, never thrown');

    /* ---- stock cash: credits may land on debt, debits never overdraw */
    assert.deepEqual(settleStockCash(-50_000, 12_345.67), { success: true, balance: -37_654.33 }, 'a dividend on a debt');
    assert.deepEqual(settleStockCash(-50_000, 80_000), { success: true, balance: 30_000 }, 'a share sale that clears a debt');
    assert.equal(settleStockCash(-50_000, -10).success, false, 'no purchase from a debt');
    assert.equal(settleStockCash(100, -200).success, false, 'no overdraft');
    assert.deepEqual(settleStockCash(5e6, 12_345.67), { success: true, balance: 5_012_345.67 });
    pass('stock cash: credits land on a debt; debits cannot overdraw');

    /* ---- a new career in debt that holds dividend shares plays its dividend weeks (failed week 13) */
    let debtor: any = structuredClone(fresh);
    const payer = (debtor.stocks || []).filter((stock: any) => stock.dividendYield > 0).sort((left: any, right: any) => right.dividendYield - left.dividendYield)[0];
    assert.ok(payer, 'a new career has a dividend stock');
    debtor.portfolio = [{ stockId: payer.id, shares: 50, averageCost: payer.price, totalInvested: payer.price * 50 }];
    let credited = 0;
    for (let week = 1; week <= 27; week += 1) {
        debtor.money = -50_000;
        debtor = (await processGameWeek(keepAlive(debtor))).player;
        if ((debtor.finance?.history || []).some((row: any) => row.category === 'DIVIDEND' && row.week === debtor.currentWeek - 1)) credited += 1;
    }
    assert.ok(credited >= 2, `dividends credited while in debt (${credited})`);
    pass(`a career in debt with dividend shares plays 27 weeks (${credited} dividend weeks)`);

    /* ---- a huge old balance takes its dividend without failing the week */
    let rich: any = structuredClone(fresh);
    rich.portfolio = [{ stockId: payer.id, shares: 5_000, averageCost: payer.price, totalInvested: payer.price * 5_000 }];
    rich.money = 378e12;
    for (let week = 1; week <= 14; week += 1) rich = (await processGameWeek(keepAlive(rich))).player;
    assert.ok(Number.isFinite(rich.money) && rich.money >= 378e12, 'the $378T balance keeps its dividend');
    pass('a $378T balance takes its dividend week');

    console.log('old-save week repair audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
