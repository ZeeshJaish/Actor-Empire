import{spawn}from'node:child_process';
import{readFileSync,writeFileSync,openSync,closeSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{isDeepStrictEqual}from'node:util';
import assert from'node:assert/strict';
const root='/private/tmp/actor-week-latency-soak-20261030';
for(const mode of['before','after']){
 const log=openSync(root+'/compat-'+mode+'.log','w');
 const code=await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--max-old-space-size=1536','--expose-gc',root+'/compat-worker.mjs'],{env:{...process.env,OWNED_COMPAT_MODE:mode,OWNED_COMPAT_OUTPUT:root+'/compat-'+mode+'.json',OWNED_COMPAT_SNAPSHOT_DIR:root+'/exact-'+mode},stdio:['ignore',log,log]});c.once('error',reject);c.once('exit',resolve)});
 closeSync(log);assert.equal(code,0,readFileSync(root+'/compat-'+mode+'.log','utf8'));
}
const a=JSON.parse(readFileSync(root+'/compat-before.json')),b=JSON.parse(readFileSync(root+'/compat-after.json'));
assert.equal(a.rows.length,12);assert.equal(b.rows.length,12);
// Raw JSON hashes can differ solely because public world normalization rebuilds
// object insertion order. Verify every parsed JSON value independently, rather
// than accepting a smaller financial projection or dropping a mismatched field.
const compareWeek=i=>isDeepStrictEqual(JSON.parse(gunzipSync(readFileSync(root+'/exact-before/week-'+i+'.json.gz')).toString('utf8')),JSON.parse(gunzipSync(readFileSync(root+'/exact-after/week-'+i+'.json.gz')).toString('utf8')));
for(let i=1;i<=12;i++){assert.ok(compareWeek(i),'Every complete parsed player JSON value must match in week '+i);globalThis.gc?.();}
const model=v=>({...v,rows:v.rows.map(({playerSha256,...row})=>row)});
assert.deepEqual(model(b),model(a),'Every manifest, cash, receipt, RNG count and simulation clock must match');
const result={weeks:12,allPriorPlayersUnchanged:true,completeParsedPlayerJsonExactlyEqual:true,rawJsonByteOrderEqual:a.rows.every((r,i)=>r.playerSha256===b.rows[i].playerSha256),cashAndReceiptParity:true,manifestDigestParity:true,randomAndClockParity:true,comparison:'node:util isDeepStrictEqual on each entire independently parsed old/new gzip snapshot; array order and all values are compared, object key insertion order is irrelevant; raw byte hashes retained'};
writeFileSync(root+'/compat-pair.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
