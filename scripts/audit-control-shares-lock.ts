/**
 * #237 (plan §25.4 Q4): shares are locked once they have taken control. Before: buy 52% of WBD, sign at $0, sell every share for
 * $14.97B, and the studio stays yours. After: the sale is refused, nothing moves; before control, selling works as always.
 */
import assert from "node:assert/strict";
import { INITIAL_PLAYER, type Player } from "../types";
import { completeStockControlAcquisition } from "../services/studioAcquisition";
import { executeStockTrade, getStockOutstandingShares, initializeStocks, isStockLockedByControl } from "../services/stockLogic";

const stocks = initializeStocks();
const stock = stocks.find(candidate => candidate.id === "stk_wbd")!;
assert.ok(stock.relatedStudioId, "Warner stock links to a studio");
const shares = Math.floor(getStockOutstandingShares(stock) * 0.52);
const profile: any = {
    id: stock.relatedStudioId, name: "Warner Bros.", isPlayerOwned: false, acquisitionState: "PUBLICLY_TRADED",
    valuation: 305_900_000_000, capital: 12_000_000_000, debt: 8_200_000_000, profitability: 6_400_000_000,
    reputation: 84, hits: 8, flops: 2, rightsCount: 28, franchiseCount: 7, universeCount: 4,
    facilities: ["Burbank Lot"], keyTalent: [{ name: "Studio Chair", role: "Chairperson" }],
    catalog: [{ id: "c1", title: "Castle Saga", revenue: 1_800_000_000, outcome: "HIT" }], rightsHighlights: ["Castle Saga"],
    ownershipStructure: "Public company", archetype: "LEGACY",
};
const player: Player = {
    ...INITIAL_PLAYER, id: "lock", name: "Control Buyer", age: 39, currentWeek: 44, money: 90_000_000_000, stocks,
    portfolio: [{ stockId: stock.id, shares, averageCost: stock.price, totalInvested: shares * stock.price }],
    flags: { ...INITIAL_PLAYER.flags }, businesses: [], pendingEvents: [],
} as Player;

assert.equal(isStockLockedByControl(player, stock), false);
const before = executeStockTrade(player, stock.id, -1000);
assert.ok(before.success, before.reason);
assert.ok(before.player.money > player.money, "before control, selling pays");
console.log("✓ before control, selling works as always");

const control = completeStockControlAcquisition({ player, profile });
assert.ok(control.success, control.reason);
assert.ok(control.player.businesses.some(business => business.id === stock.relatedStudioId), "the studio is yours");
assert.equal(isStockLockedByControl(control.player, stock), true);
const held = control.player.portfolio.find(item => item.stockId === stock.id)!.shares;
const refused = executeStockTrade(control.player, stock.id, -held);
assert.equal(refused.success, false);
assert.equal(refused.reason, "CONTROL_LOCKED");
assert.equal(refused.player.money, control.player.money, "no money moved");
assert.equal(refused.player.portfolio.find(item => item.stockId === stock.id)!.shares, held, "no shares moved");
console.log("✓ after control, " + held.toLocaleString() + " shares cannot be sold; no money moves");

const more = executeStockTrade(control.player, stock.id, 1000);
assert.ok(more.success, more.reason);
console.log("✓ buying more of it is still allowed");
const other = stocks.find(candidate => candidate.id !== stock.id && candidate.relatedStudioId !== stock.relatedStudioId)!;
assert.equal(isStockLockedByControl(control.player, other), false, "other stocks are not locked");
console.log("control-shares-lock audit passed");
