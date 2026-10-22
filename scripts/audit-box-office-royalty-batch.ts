import assert from 'node:assert/strict';
import {calculateStreamingSignedRoyaltyAllocations,calculateStreamingStoreRevenueShareAllocations,type StreamingRevenueShareLicense} from '../services/streamingEconomyCore';
const licenses:StreamingRevenueShareLicense[]=Array.from({length:200},(_,i)=>({id:`contract-${i}`,sourceProjectId:`film-${i}`,status:'ACTIVE',startsAtAbsoluteWeek:1,expiresAtAbsoluteWeek:50,licensorRevenueShare:10}));
let reads=0;
const receipts=Array.from({length:4000},(_,i)=>({receiptId:`receipt-${i}`,get contractId(){reads++;return `contract-${i%200}`},grossReceipts:100,sourceKind:'SUBSCRIPTION' as const}));
const result=calculateStreamingSignedRoyaltyAllocations({licenses,receipts,absoluteWeek:10});
assert.equal(result.length,200);
for(const row of result){assert.equal(row.adjustedGrossReceipts,2000);assert.equal(row.royaltyPayable,200);assert.equal(row.lastRoyaltyReceiptAbsoluteWeek,10)}
assert.ok(reads<=receipts.length*10,`Royalty close rescanned receipt archive ${reads} times for ${receipts.length} receipts`);
assert.equal(calculateStreamingSignedRoyaltyAllocations({licenses:licenses.map(l=>({...l,lastRoyaltyReceiptAbsoluteWeek:10})),receipts,absoluteWeek:10}).length,0,'Same-week settlement remains idempotent');
const license=licenses[0];
const duplicate=[{...license,licensorRevenueShare:20},{...license,licensorRevenueShare:90}];
assert.equal(calculateStreamingStoreRevenueShareAllocations({licenses:duplicate,receipts:[{contractId:license.id,grossReceipts:1000}],absoluteWeek:10})[0].royaltyPayable,200,'Duplicate license lookup preserves first-position precedence');
const boundary=calculateStreamingSignedRoyaltyAllocations({licenses:[{...license,backendBasis:'ADS_RENTAL_RECEIPTS'}],receipts:[
 {receiptId:'a',contractId:license.id,grossReceipts:1000,sourceKind:'SUBSCRIPTION'},
 {receiptId:'a',contractId:license.id,grossReceipts:1000,sourceKind:'RENTAL'},
 {receiptId:'b',contractId:license.id,grossReceipts:500,sourceKind:'RENTAL'},
 {receiptId:'c',contractId:license.id,grossReceipts:-100,sourceKind:'RENTAL'},
],absoluteWeek:10});
assert.equal(boundary[0].adjustedGrossReceipts,500,'Filtering and duplicate receipt precedence stay unchanged');assert.equal(boundary[0].royaltyPayable,50);
console.log('PASS exact contract cash, linear receipt reads, duplicate precedence, backend eligibility and same-week replay');
