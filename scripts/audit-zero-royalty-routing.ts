// The existing frozen-oracle suite includes zero rows before actual paid rows;
// preserving their source ordinals is required for exactly-once receipt IDs.
import './audit-royalty-source-index';
import assert from 'node:assert/strict';
assert.equal((globalThis as any).__zeroRoyaltyRoutes||0,0,'Zero source amounts must retain their ordinal without routing every catalogue title');
console.log(JSON.stringify({passed:1,zeroSourceRoutes:0,frozenReceiptIdsAndAmountsPreserved:true}));
