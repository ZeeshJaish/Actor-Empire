import assert from 'node:assert/strict';
import '../services/saveCompaction';
const compact=(globalThis as any).__platformSlateProbe;assert.equal(typeof compact,'function');
const rows=[{id:'world-live',status:'RELEASED',scheduledAtAbsoluteWeek:1},
 {id:'paid-only-a',status:'RELEASED',scheduledAtAbsoluteWeek:2},
 {id:'award-history',status:'RELEASED',scheduledAtAbsoluteWeek:3,sourceProjectIds:['award-record']},
 ...Array.from({length:120},(_,i)=>({id:'terminal-'+i,status:'RELEASED',scheduledAtAbsoluteWeek:100+i}))];
const a={id:'a',ai:{slate:rows,rightsContracts:[{status:'ACTIVE',expiresAtAbsoluteWeek:501,platformContentPlanId:'paid-only-a'}]}};
const b={id:'b',ai:{slate:rows,rightsContracts:[]}};
const world={projects:[],industryProductions:{}},shared=new Set(['world-live']),awards=new Set(['award-record']);
const before=JSON.stringify({a,b,world});
const first=compact(a,world,[],awards,500,shared),second=compact(b,world,[],awards,500,shared);
assert.ok(first.some((r:any)=>r.id==='paid-only-a'),'Paid local rights must remain protected');
assert.ok(!second.some((r:any)=>r.id==='paid-only-a'),'Local rights must not leak into another platform via the shared world index');
for(const kept of [first,second]){assert.ok(kept.some((r:any)=>r.id==='world-live'));assert.ok(kept.some((r:any)=>r.id==='award-history'));}
assert.deepEqual([...shared],['world-live']);assert.equal(JSON.stringify({a,b,world}),before);
console.log(JSON.stringify({slateIsolationChecks:8,paidRightsProtected:true,worldAndAwardsProtected:true,noCrossPlatformLeak:true}));
