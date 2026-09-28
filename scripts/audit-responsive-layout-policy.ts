import assert from 'node:assert/strict';
import { ACTION_GROUP_POLICY, STAT_GROUP_POLICY, chooseColumnCount } from '../ui-layout/policy';
import { DEFAULT_LAYOUT_TOKENS } from '../ui-layout/tokens';

assert.equal(chooseColumnCount(199, STAT_GROUP_POLICY), 1);
assert.equal(chooseColumnCount(200, STAT_GROUP_POLICY), 2);
assert.equal(chooseColumnCount(407, STAT_GROUP_POLICY), 2);
assert.equal(chooseColumnCount(408, STAT_GROUP_POLICY), 4);
assert.equal(chooseColumnCount(295, ACTION_GROUP_POLICY), 1);
assert.equal(chooseColumnCount(296, ACTION_GROUP_POLICY), 2);
assert.equal(chooseColumnCount(Number.NaN, ACTION_GROUP_POLICY), 1);
assert.equal(chooseColumnCount(0, STAT_GROUP_POLICY), 1);
assert.throws(() => chooseColumnCount(400, { gapPx: 8, variants: [] }), /variant/i);
assert.throws(() => chooseColumnCount(400, { gapPx: -1, variants: [{ columns: 1, minItemWidthPx: 96 }] }), /gap/i);
assert.throws(() => chooseColumnCount(400, { gapPx: 8, variants: [{ columns: 2, minItemWidthPx: 96 }, { columns: 1, minItemWidthPx: 96 }] }), /order/i);
assert.equal(DEFAULT_LAYOUT_TOKENS.minimumTouchTargetPx, 44);
assert.equal(DEFAULT_LAYOUT_TOKENS.minimumStatItemPx, 96);
assert.equal(DEFAULT_LAYOUT_TOKENS.minimumFullActionPx, 144);

console.log('Responsive layout policy audit passed.');
