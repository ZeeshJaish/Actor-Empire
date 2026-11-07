import assert from 'node:assert/strict';
import {allocateStreamingStoreUnits} from '../services/worldEconomy/worldStreamingCommercialEconomy';
const weights=Array.from({length:4096},(_,i)=>i+1),sort=Array.prototype.sort;let sorts=0;
Array.prototype.sort=function(...args:any[]){sorts++;return (sort as any).apply(this,args);};
let result:number[];try{result=allocateStreamingStoreUnits(0,weights);}finally{Array.prototype.sort=sort;}
assert.deepEqual(result,Array(4096).fill(0));assert.equal(weights[0],1);assert.equal(weights.at(-1),4096);
assert.deepEqual(allocateStreamingStoreUnits(7,[1,1,1]),[3,2,2]);
assert.deepEqual(allocateStreamingStoreUnits(2.49,[1,1,1]),[1,1,0]);
assert.deepEqual(allocateStreamingStoreUnits(4,[NaN,-1,Infinity,1]),[0,0,0,4]);
assert.equal(sorts,0,'A zero funded pool must not build and sort thousands of fractional allocations');
console.log(JSON.stringify({passed:7,zeroPoolSorts:0,roundingAndConservationPreserved:true}));
