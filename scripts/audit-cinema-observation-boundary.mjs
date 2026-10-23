import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// A completed observation boundary must be checked before any new worker or
// system probe. Resuming it must not simulate an extra paid game week.
const folder=mkdtempSync(join(tmpdir(),'cinema-observation-boundary-'));
try{
 const code="throw Error('A worker must not start after the observation boundary');",digest=createHash('sha256').update(code).digest('hex');
 writeFileSync(join(folder,'normal-worker.mjs'),code);
 writeFileSync(join(folder,'executable.json'),JSON.stringify({sha256:digest,horizon:500,kind:'normal'}));
 writeFileSync(join(folder,'career-0.json'),JSON.stringify({executable:digest,status:'CHECKPOINT_READY',weeks:208}));
 const result=spawnSync(process.execPath,['scripts/run-cinema-normal-cohort.mjs'],{encoding:'utf8',env:{...process.env,CAREER_OUTPUT:folder,CAREER_SEEDS:'0',CAREER_WEEKS:'500',CAREER_OBSERVE_THROUGH:'208',CAREER_AUDIT_KIND:'normal',CAREER_SOURCE_REF:'',CAREER_SOURCE_DIR:'',CAREER_SOURCE_OVERRIDES_DIR:''}});
 assert.equal(result.status,0,'A retained completed observation should exit successfully without spawning: '+result.stderr.slice(-700));
 assert.equal(existsSync(join(folder,'career-0.log')),false,'No child worker should be started');
 console.log('PASS a retained observation boundary cannot simulate an extra paid week');
}finally{rmSync(folder,{recursive:true,force:true})}
