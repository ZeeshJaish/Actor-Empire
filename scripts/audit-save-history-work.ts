import assert from 'node:assert/strict';
import '../services/saveCompaction';
const retain = (globalThis as any).__historyRetentionProbe;
assert.equal(typeof retain, 'function', 'Use the test-only instrumented runner');
const rows = [{id:'open',active:true,week:1}, {id:'new',active:false,week:100},
    {id:'old',active:false,week:2}, {id:'open',active:false,week:200}, {id:'',active:false,week:400}];
let calls=0;
const kept=retain({items:rows,idOf:(r:any)=>r.id,isProtected:(r:any)=>{calls++;return r.active;},activityWeekOf:(r:any)=>r.week,terminalLimit:2});
assert.deepEqual(kept,[rows[0],rows[1]],'Protect active IDs, preserve duplicate-ID and terminal-budget semantics, return original records in original order');
assert.equal(calls,rows.length,'Repeated full protection classification in one synchronous compaction wastes late-save work');
assert.deepEqual(rows.map(r=>r.week),[1,100,2,200,400],'Retention must not mutate or reorder the source');
console.log(JSON.stringify({historyRetentionChecks:3,protectionChecksPerRow:1,recordsAndOrderingPreserved:true}));
