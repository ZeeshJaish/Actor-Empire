import assert from 'node:assert/strict';
import {stableSaveHash} from '../services/stableSaveHash';
import {issuedSaveHash as issuedSaveHashReference} from './fixtures/issuedSaveHashReference';

// Regression for the measured quote/escape hotspot. Ordinary JSON strings must
// not require a JavaScript replace scan of every character. Issued UTF-16 bytes
// (including lone surrogates) remain the independent correctness oracle.
const input=Array.from({length:4096},(_,i)=>({id:'record-'+i,text:'A normal archive row '+i+' with "quotes", slash \\, newline\n and multilingual é 中文'}));
const replace=String.prototype.replace;let scanned=0;
String.prototype.replace=function(search:any,replacement:any){scanned+=String(this).length;return replace.call(this,search,replacement);};
let actual:string;
try{actual=stableSaveHash(input);}finally{String.prototype.replace=replace;}
assert.equal(actual!,issuedSaveHashReference(input));
assert.equal(scanned,0,'Ordinary strings still traverse the measured JavaScript escape-scan path');
for(const value of ['\ud800','\udfff','a\ud800z','🦊','\u0000\u2028\u2029',{'key\udfff':'value\ud800'}]){
    assert.equal(stableSaveHash(value),issuedSaveHashReference(value),'Issued UTF-16 signature changed');
}
console.log('PASS: ordinary archive strings avoid JS escape scans; independent issued UTF-16 signatures remain exact.');
