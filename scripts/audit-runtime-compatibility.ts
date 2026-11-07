import assert from 'node:assert/strict';
const original={clone:globalThis.structuredClone,at:Array.prototype.at,own:Object.hasOwn,replaceAll:String.prototype.replaceAll};
// This entry is bundled as ESM so the dynamic import follows capability setup.
const legacy=process.env.LEGACY_APIS==='1';
if(legacy){delete (globalThis as any).structuredClone;delete (globalThis as any).PerformanceMark;delete (Array.prototype as any).at;delete (Object as any).hasOwn;delete (String.prototype as any).replaceAll;}
await import('../services/runtimeCompatibility');
if(!legacy){assert.equal(globalThis.structuredClone,original.clone);assert.equal(Array.prototype.at,original.at);assert.equal(Object.hasOwn,original.own);assert.equal(String.prototype.replaceAll,original.replaceAll);}
const buffer=new ArrayBuffer(8),bytes=new Uint8Array(buffer);bytes[3]=17;
const sparse=new Array(4);sparse[2]=undefined;
const source:any={date:new Date(1700000000000),invalid:new Date(NaN),negativeZero:-0,nan:NaN,big:7n,sparse,buffer,bytes,
    view:new DataView(buffer),set:new Set(['paid']),map:new Map([['receipt',{amount:17}]]),text:'archive 🦊\ud800',missing:undefined};
source.self=source;source.alias=source.map;
const copy=structuredClone(source);
assert.notEqual(copy,source);assert.equal(copy.self,copy);assert.equal(copy.alias,copy.map);
assert.equal(copy.date.getTime(),1700000000000);assert.ok(Number.isNaN(copy.invalid.getTime()));assert.ok(Object.is(copy.negativeZero,-0));assert.ok(Number.isNaN(copy.nan));assert.equal(copy.big,7n);
assert.equal(0 in copy.sparse,false);assert.equal(2 in copy.sparse,true);assert.equal(copy.sparse[2],undefined);assert.ok(Object.hasOwn(copy,'missing'));
assert.equal(copy.bytes.buffer,copy.buffer);assert.equal(copy.view.buffer,copy.buffer);assert.equal(copy.bytes[3],17);copy.bytes[3]=4;assert.equal(bytes[3],17);
assert.equal(copy.map.get('receipt').amount,17);assert.ok(copy.set.has('paid'));assert.equal(copy.text,source.text);
assert.throws(()=>structuredClone({bad:()=>1}),error=>(error as Error).name==='DataCloneError');
assert.equal([1,2,3].at(-1),3);assert.equal([1].at(3),undefined);assert.equal(Array.prototype.at.call({0:'x',length:1},0),'x');assert.throws(()=>[1].at(1n as any),TypeError);
assert.equal(Object.hasOwn(Object.create({inherited:1}),'inherited'),false);assert.equal(Object.hasOwn(Object.assign(Object.create(null),{paid:17}),'paid'),true);assert.throws(()=>Object.hasOwn(null,'x'),TypeError);
assert.equal('paid_in_full'.replaceAll('_',' '),'paid in full');assert.equal('ab'.replaceAll('','-'),'-a-b-');
assert.equal('x2x'.replaceAll(/x/g,(_match,offset)=>String(offset)),'022');assert.throws(()=>'xx'.replaceAll(/x/,'y'),TypeError);
assert.equal('xy'.replaceAll('x',"[$&][$`][$']"),'[x][][y]y');
console.log(JSON.stringify({compatibilityChecks:31,mode:legacy?'missing APIs installed':'native APIs preserved',nativeArchiveTypesPreserved:true}));
