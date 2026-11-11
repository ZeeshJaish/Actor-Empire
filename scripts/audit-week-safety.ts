/**
 * 2026-11-11 (1.0.27 hotfix, evening): "Week N was not applied" must not come back another way. One company's
 * bad data must never stop the player's week. This audit holds the second net added on top of
 * audit:old-save-week-repair:
 * - the weekly company dividend takes the exact credit when it can (a normal company gets the same cents as
 *   before), a plain rounded addition past safe cents, pays the player when the owning company is gone, and
 *   never throws;
 * - a career whose company-funded shares point at a company that no longer exists plays its dividend weeks
 *   (live 1.0.26 stopped at week 13 with UNREPRESENTABLE_CORPORATE_STOCK_RECEIPT);
 * - rival money far past safe cents, set AFTER the load so the load repair cannot hide it, plays weeks
 *   (live 1.0.26 stopped at week 1 with "NPC cinema cash overflow");
 * - each rival studio's week is isolated (services/studioAi/studioAiWeek.ts): a studio whose week throws sits
 *   the week out and the rest of the week goes on.
 * The longer main-vs-live stress runs are in the marketing folder's qa/2026-11-11-fixes/tests/week-safety.
 * Run: npm run audit:week-safety
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { createBusiness } from '../services/businessLogic';
import { creditCorporateDividendSafely, creditCorporateStockReceipt } from '../services/stockCashOwnership';
import { processStudioAiWeek } from '../services/studioAi/studioAiWeek';
import { getAbsoluteWeek } from '../services/legacyLogic';

const pass = (label: string) => console.log(`PASS ${label}`);
const keepAlive = (p: Player): Player => ({ ...p, pendingEvent: null, pendingEvents: [], stats: { ...p.stats, health: 100 }, activeHealthConditions: [], flags: { ...(p.flags || {}), isDead: false } } as Player);
const fresh = (id: string) => migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Week Safety', age: 18, currentWeek: 1 } as Player);
const dividendStock = (p: Player) => [...(p.stocks || [])].filter(stock => stock.dividendYield > 0).sort((a, b) => b.dividendYield - a.dividendYield)[0];
const withHouse = (p: Player, balance: number) => {
    const house = createBusiness('Safety Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO' as any, {} as any, 'S', 1, 18);
    house.id = 'safety_house';
    house.balance = balance;
    return { player: { ...p, businesses: [...(p.businesses || []), house] } as Player, house };
};

async function main() {
    /* ---- the safe company dividend */
    const base = fresh('week-safety-credit');
    const normal = withHouse(base, 5_000_000);
    const exact = creditCorporateStockReceipt(normal.player, normal.house.id, 1234.56, 'DIVIDEND', 'STOCK');
    const safe = creditCorporateDividendSafely(normal.player, normal.house.id, 1234.56, 'STOCK');
    const exactHouse = exact.businesses.find(item => item.id === normal.house.id)!;
    const safeHouse = safe.businesses.find(item => item.id === normal.house.id)!;
    assert.equal(safeHouse.balance, exactHouse.balance, 'a normal company gets the exact credit');
    assert.deepEqual(safeHouse.stats, exactHouse.stats, 'and the same statement');
    pass('a normal company dividend is the exact credit, to the cent');

    const gone = creditCorporateDividendSafely(base, 'closed_company', 500, 'STOCK');
    assert.equal(gone.money, Math.round((base.money + 500) * 100) / 100, 'a gone company pays its owner, the player');
    pass('shares left on a company that no longer exists pay the player');

    const edge = withHouse(base, Number.MAX_SAFE_INTEGER / 100 - 1);
    assert.throws(() => creditCorporateStockReceipt(edge.player, edge.house.id, 5000, 'DIVIDEND', 'STOCK'), 'the exact credit cannot hold this');
    const edgePaid = creditCorporateDividendSafely(edge.player, edge.house.id, 5000, 'STOCK');
    assert.ok(edgePaid.businesses.find(item => item.id === edge.house.id)!.balance > edge.house.balance, 'a balance past safe cents still gets paid');
    pass('a company balance past safe cents takes a plain addition instead of throwing');

    for (const bad of [Number.NaN, -10, 0, Number.POSITIVE_INFINITY]) {
        assert.equal(creditCorporateDividendSafely(normal.player, normal.house.id, bad, 'STOCK'), normal.player, `amount ${bad} changes nothing`);
    }
    pass('an impossible amount changes nothing and never throws');

    /* ---- company-funded shares on a company that no longer exists: the dividend weeks play */
    let orphan = fresh('week-safety-orphan') as any;
    const stock = dividendStock(orphan);
    assert.ok(stock, 'a new career has a dividend stock');
    orphan.portfolio = [{ stockId: stock.id, shares: 400, averageCost: stock.price, totalInvested: stock.price * 400, equityFunding: [{ ownerStudioId: 'closed_company_1', shares: 300 }] }];
    const moneyBefore = orphan.money;
    for (let week = 1; week <= 14; week += 1) orphan = (await processGameWeek(keepAlive(orphan))).player;
    assert.ok(orphan.money > moneyBefore, 'the player received the dividends');
    pass('company shares left on a closed company play 14 weeks, across a dividend week');

    /* ---- rival money far past safe cents, after the load */
    let chaos = fresh('week-safety-chaos') as any;
    const studios = Object.values(chaos.world.studios || {}) as any[];
    studios.slice(0, 3).forEach(studio => { studio.cashReserve = 1e15; studio.valuation = 1e12; });
    if (studios[3]) studios[3].cashReserve = Number.NaN;
    Object.values(chaos.world.platforms || {}).slice(0, 2).forEach((platform: any) => { if (platform) platform.cashReserve = 1e15; });
    for (let week = 1; week <= 3; week += 1) chaos = (await processGameWeek(keepAlive(chaos))).player;
    pass('rival money far past safe cents, set after the load, plays 3 weeks');

    /* ---- each rival studio's week is isolated. The fault sits deep in one studio's AI state: the ecosystem
       setup copies studios shallowly, so the first read of it happens inside that studio's own week. */
    const isolationPlayer = fresh('week-safety-isolation');
    const world = structuredClone(isolationPlayer.world) as any;
    const ids = Object.keys(world.studios).sort();
    const target = ids[0];
    const brokenAi = { ...(world.studios[target].ai || {}) };
    Object.defineProperty(brokenAi, 'finance', { enumerable: true, configurable: true, get() { throw new Error('broken studio data'); } });
    world.studios[target] = { ...world.studios[target], ai: brokenAi };
    const absoluteWeek = getAbsoluteWeek(isolationPlayer.age, isolationPlayer.currentWeek) + 1;
    let result: ReturnType<typeof processStudioAiWeek> | null = null;
    try {
        result = processStudioAiWeek({ ...isolationPlayer, world } as Player, world, absoluteWeek);
    } catch (error) {
        assert.fail(`one broken studio stopped every studio's week: ${(error as Error).message}`);
    }
    assert.ok(result!.skipped?.some(item => item.companyId === target && item.step === 'studio_week'), 'the broken studio sat the week out');
    assert.equal(result!.world.studios![target].ai, brokenAi, 'and was left exactly as it was');
    const ran = ids.slice(1).filter(id => result!.world.studios![id]?.ai?.lastProcessedAbsoluteWeek === absoluteWeek);
    assert.ok(ran.length >= ids.length - 2, `the other studios ran their week (${ran.length} of ${ids.length - 1})`);
    pass(`one broken studio sits the week out; ${ran.length} of ${ids.length - 1} other studios ran`);

    console.log('Week safety audit passed.');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
