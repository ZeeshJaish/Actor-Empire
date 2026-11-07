import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type Player} from '../types';
import {prepareLocalStorageMirror} from '../services/saveMirror';

const large=structuredClone(INITIAL_PLAYER) as Player;
(large.world as any).retainedHistory=Array.from({length:4000},(_,i)=>({id:i,body:'Keep this complete history. '.repeat(30)}));
const stringify=JSON.stringify;let fullPasses=0;
(JSON as any).stringify=(value:unknown,...rest:any[])=>{if(value===large)fullPasses++;return (stringify as any)(value,...rest);};
try{assert.equal(prepareLocalStorageMirror(large,600_000).kind,'METADATA_ONLY');}
finally{JSON.stringify=stringify;}
assert.equal(fullPasses,0,'A discarded optional mirror still constructs the complete oversized save string');

for(const payload of [
    {name:'small',data:'é 中文 🦊\n"\\'.repeat(5)},
    {array:[undefined,,NaN,Infinity,-0],optional:undefined},
    {date:new Date('2020-01-01'),custom:{toJSON:()=>''}},
    {custom:{long:'x'.repeat(10000),toJSON:()=>undefined}},
])for(const budget of [0,1,20,200,600_000]){
    const text=JSON.stringify(payload),plan=prepareLocalStorageMirror(payload as any,budget);
    assert.deepEqual(plan,text.length<=budget?{kind:'FULL',serialized:text}:{kind:'METADATA_ONLY'},'Mirror eligibility or exact small-save bytes changed');
}
const custom=prepareLocalStorageMirror(large,600_000,()=> 'custom serializer');
assert.deepEqual(custom,{kind:'FULL',serialized:'custom serializer'},'Explicit serializer semantics changed');
console.log('PASS: bounded optional mirror work; ordinary/special/custom JSON and explicit serializers retain exact eligibility and bytes.');
