import assert from 'node:assert/strict';
import { budgetAmountAt, budgetPositionFor } from '../components/studio-finance/finance/networkBudget';

// Catch wrong scaling/clamping that silently turns a small slider movement
// into an unaffordable amount, or loses the zero/full-budget endpoints.
assert.equal(budgetAmountAt(0, 100_000_000), 0);
assert.equal(budgetAmountAt(500, 100_000_000), 25_000_000);
assert.equal(budgetAmountAt(1000, 100_000_000), 100_000_000);
assert.equal(budgetAmountAt(10, 1_000_000_000), 100_000);
assert.equal(budgetAmountAt(-10, 100), 0);
assert.equal(budgetAmountAt(1200, 100), 100);
assert.equal(budgetAmountAt(500, 0), 0);
assert.equal(budgetAmountAt(NaN, 100), 0);
assert.equal(budgetAmountAt(500, Infinity), 0);
assert.equal(budgetPositionFor(25_000_000, 100_000_000), 500);
assert.equal(budgetPositionFor(-1, 100), 0);
assert.equal(budgetPositionFor(200, 100), 1000);
assert.equal(budgetPositionFor(100, 0), 0);
assert.equal(budgetPositionFor(NaN, 100), 0);
assert.equal(budgetAmountAt(1000, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
assert.ok(Number.isSafeInteger(budgetAmountAt(333, Number.MAX_SAFE_INTEGER)));
console.log('Network budget sliders: exact endpoints, useful small amounts, clamping and safe whole USD PASS');
