import assert from 'node:assert/strict';
import { calculateTheatricalDistributionBreakdown } from '../services/distributionRevenue';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import type { CinemaChainId } from '../types';
const f=makeCinemaFixture(31); const tests:Array<[string,()=>void]>=[];
const test=(name:string,run:()=>void)=>tests.push([name,run]);
test('final ticket gross is capped before shares are allocated',()=>{
 const breakdown=calculateTheatricalDistributionBreakdown(f.project,100_000_000,1,{maxGross:1_000_001});
 assert.equal(breakdown.gross,1_000_001);
 assert.equal(breakdown.studioReceipts+breakdown.exhibitorReceipts,1_000_001);
 assert.equal(breakdown.regionReceipts.reduce((n,r)=>n+r.gross,0),1_000_001);
});
test('already realized gross is not transformed into demand again',()=>{
 const breakdown=calculateTheatricalDistributionBreakdown(f.project,1_000_001,1,{grossBasis:'REALIZED'});
 assert.equal(breakdown.gross,1_000_001);
 assert.equal(breakdown.studioReceipts+breakdown.exhibitorReceipts,1_000_001);
});
test('unavailable cinema selections cannot create unallocated ticket money',()=>{
 const project={...f.project,releaseRegionIds:['NORTH_AMERICA' as const],releaseChainSelections:{NORTH_AMERICA:['MISSING_CHAIN' as CinemaChainId]}};
 const result=calculateTheatricalDistributionBreakdown(project,100e6,1);
 assert.equal(result.gross,0);assert.equal(result.studioReceipts,0);assert.equal(result.exhibitorReceipts,0);
});
let failures=0;for(const[name,run]of tests){try{run();console.log('PASS',name)}catch(error){failures++;console.error('FAIL',name,error instanceof Error?error.message:error)}}
assert.equal(failures,0,`${failures} cinema finance regressions`);
