import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import assert from 'node:assert/strict';
const root='/private/tmp/actor-week-latency-soak-20261030';
for(const mode of ['before','after']){
 const log=openSync(root+'/firstweek-'+mode+'.log','w');
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--max-old-space-size=1536','--expose-gc',root+'/compat-worker.mjs'],{env:{...process.env,OWNED_COMPAT_MODE:mode,OWNED_COMPAT_WEEKS:'1',OWNED_COMPAT_SNAPSHOT:root+'/firstweek-'+mode+'.json',OWNED_COMPAT_OUTPUT:root+'/firstweek-'+mode+'-summary.json'},stdio:['ignore',log,log]});c.once('error',reject);c.once('exit',resolve)});
 closeSync(log);assert.equal(code,0,'one-week snapshot worker '+mode);
}
const a=JSON.parse(readFileSync(root+'/firstweek-before.json')),b=JSON.parse(readFileSync(root+'/firstweek-after.json'));
const ordering=[],values=[];
const walk=(x,y,path)=>{
 if(typeof x!==typeof y||x===null||y===null||typeof x!=='object'){if(!Object.is(x,y)&&values.length<10)values.push({path,before:typeof x==='string'?x.slice(0,140):x,after:typeof y==='string'?y.slice(0,140):y});return;}
 const kx=Object.keys(x),ky=Object.keys(y),sx=[...kx].sort(),sy=[...ky].sort();
 if(JSON.stringify(sx)!==JSON.stringify(sy)){if(values.length<10)values.push({path,beforeKeys:kx,afterKeys:ky});return;}
 if(JSON.stringify(kx)!==JSON.stringify(ky)&&ordering.length<20)ordering.push({path,beforeKeys:kx,afterKeys:ky});
 for(const key of sx)walk(x[key],y[key],path+'.'+key);
};
walk(a,b,'player');
const result={exactParsedDataEqual:isDeepStrictEqual(a,b),valueDifferences:values,firstObjectKeyOrderDifferences:ordering};
writeFileSync(root+'/firstweek-semantic-diff.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.equal(result.exactParsedDataEqual,true,'Do not accept any data-value difference as key ordering');
