import { build } from 'esbuild';
import { mkdtemp, mkdir, rm, readFile,open,access,copyFile,writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { createWriteStream,openSync,closeSync,ftruncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn,spawnSync } from 'node:child_process';

// Standalone verification only; never loads the App's real persistence store.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const output = resolve(process.env.CAREER_OUTPUT || '/private/tmp/actor-cinema-career-economics-rerun');
const seeds = (process.env.CAREER_SEEDS || '0,1,2,3').split(',').map(Number);
const horizon = Number(process.env.CAREER_WEEKS || 208);
const policyGenre=process.env.CAREER_GENRE||'DRAMA';
if(!['DRAMA','COMEDY','ACTION'].includes(policyGenre))throw new Error('Choose an implemented ordinary career policy');
const concurrency = Number(process.env.CAREER_CONCURRENCY || 1);
const heapMB=Number(process.env.CAREER_CHILD_HEAP_MB||1536),batchWeeks=Number(process.env.CAREER_BATCH_WEEKS||13),maxBatches=Number(process.env.CAREER_MAX_BATCHES||0);
if (!seeds.every(Number.isSafeInteger) || !Number.isSafeInteger(horizon) || horizon < 1
    || concurrency !== 1 || !Number.isInteger(heapMB)||heapMB<256||heapMB>1536
    || !Number.isInteger(batchWeeks)||batchWeeks<1||batchWeeks%13!==0||!Number.isInteger(maxBatches)||maxBatches<0) throw new Error('Use one worker, at most 1536MB Node heap, and batches of 13 weeks');
await mkdir(output, { recursive: true });
const lockPath=join(tmpdir(),'actor-cinema-career-audit.lock');
const workerLockPath=join(tmpdir(),'actor-cinema-career-worker.lock');
let parentLockFd;
if(process.platform==='darwin'){
    // Respect an active lock from the older JSON-format runner during upgrades.
    let existing;try{existing=await readFile(lockPath,'utf8')}catch{}
    if(existing?.trim().startsWith('{')){
        const prior=JSON.parse(existing);
        try{process.kill(prior.pid,0);throw new Error('A career audit is already running')}
        catch(check){if(check.code!=='ESRCH')throw check}
    }
    parentLockFd=openSync(lockPath,'a+');
    if(spawnSync('/usr/bin/lockf',['-s','-t','0','3'],{stdio:['ignore','ignore','pipe',parentLockFd]}).status!==0){closeSync(parentLockFd);throw new Error('A career audit is already running')}
    ftruncateSync(parentLockFd,0);
}else for(let attempt=0;;attempt++){
    try{const handle=await open(lockPath,'wx');await handle.writeFile(JSON.stringify({pid:process.pid}));await handle.close();break}
    catch(error){
        if(error.code!=='EEXIST'||attempt)throw error;
        const prior=JSON.parse(await readFile(lockPath,'utf8'));
        let workerPid;try{workerPid=Number((await readFile(workerLockPath,'utf8')).trim())}catch{}
        if(workerPid){try{process.kill(workerPid,0);throw new Error('An audit worker is still active; retain its checkpoint and wait for it to exit')}catch(check){if(check.code!=='ESRCH')throw check}}
        try{process.kill(prior.pid,0);throw new Error('A career audit is already running; wait for its checkpoint instead of starting another worker')}
        catch(check){if(check.code!=='ESRCH')throw check;await rm(lockPath)}
    }
}
const temp = await mkdtemp(join(tmpdir(), 'actor-normal-careers-'));
let bundle = join(temp, 'normal-career.mjs');
let failed = false;
try {
    const pinned=join(output,'normal-career.mjs'),pinnedMetadata=join(output,'executable-metadata.json');
    let signature;
    try{
        const contents=await readFile(pinned),metadata=JSON.parse(await readFile(pinnedMetadata,'utf8'));
        signature=createHash('sha256').update(contents).digest('hex');
        if(signature!==metadata.sha256||metadata.entrypoint!=='audit-normal-career.ts')throw new Error('Pinned audit source is corrupt');
        if(process.env.CAREER_RESUME==='0')throw new Error('Keep the pinned run; use a separate output folder for fresh source');
        bundle=pinned;console.log(JSON.stringify({status:'REUSE_PINNED_AUDIT_SOURCE',sha256:signature}));
    }catch(error){
        if(error.code!=='ENOENT')throw error;
        await build({ entryPoints: [join(here, 'audit-normal-career.ts')], bundle: true, platform: 'node', format: 'esm',
            loader: { '.csv': 'text', '.css': 'empty' }, outfile: bundle, logLevel: 'error' });
        signature=createHash('sha256').update(await readFile(bundle)).digest('hex');
        await copyFile(bundle,pinned);await writeFile(pinnedMetadata,JSON.stringify({sha256:signature,entrypoint:'audit-normal-career.ts',scope:'Pinned audit snapshot; evidence applies to this executable, not later workspace edits'},null,2));bundle=pinned;
    }
    for(const seed of seeds){
        let batches=0;
        while(true){
            let prior;try{prior=JSON.parse(await readFile(join(output,`career-${seed}.json`),'utf8'))}catch{}
            if(prior&&(prior.executionCodeSha256!==signature||prior.horizon!==horizon))throw new Error('Existing evidence uses different source or horizon; keep it and choose a separate output folder');
            if(prior&&(prior.policyGenre||'DRAMA')!==policyGenre)throw new Error('Existing evidence uses a different action policy; use a separate output folder');
            if(['HORIZON_COMPLETE','CAREER_ENDED_DEATH'].includes(prior?.status)){console.log(JSON.stringify({seed,status:'RETAIN_COMPLETED_RESULT',outcome:prior.status}));break}
            if(['AUDIT_OR_POLICY_FAILURE','CAREER_UNFUNDED'].includes(prior?.status)){failed=true;console.log(JSON.stringify({seed,status:'RETAIN_FAILED_RESULT',outcome:prior.status}));break}
            if(prior?.executedWeeks>0){try{await access(join(output,`career-${seed}-checkpoint.json.gz`))}catch{throw new Error('Interrupted evidence has no durable checkpoint; keep it and use a separate output folder')}}
            // The worker owns this guard, so killing its controller cannot permit
            // a second heavy child while the first one is still alive.
            const workerGuard=`const fs=await import('node:fs'),cp=await import('node:child_process'),workerLock=${JSON.stringify(workerLockPath)},owner=String(process.pid);
                if(process.platform==='darwin'){
                    const handle=fs.openSync(workerLock,'a+');
                    if(cp.spawnSync('/usr/bin/lockf',['-s','-t','0','3'],{stdio:['ignore','ignore','pipe',handle]}).status!==0){fs.closeSync(handle);throw Error('Another audit worker is active')}
                    process.once('exit',()=>{try{fs.closeSync(handle)}catch{}});
                }else{const handle=fs.openSync(workerLock,'wx');fs.writeFileSync(handle,owner);fs.closeSync(handle);
                    process.once('exit',()=>{try{if(fs.readFileSync(workerLock,'utf8').trim()===owner)fs.unlinkSync(workerLock)}catch{}})};`;
            const bootstrap = workerGuard+`let state=${(20261023 + seed) >>> 0},tick=0;Math.random=()=>{let t=state+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};Date.now=()=>1800000000000+tick++;await import(${JSON.stringify(pathToFileURL(bundle).href)});`;
            const log = createWriteStream(join(output, `career-${seed}.txt`),{flags:'a'});
            const child = spawn(process.execPath, [`--max-old-space-size=${heapMB}`,'--input-type=module', '--eval', bootstrap], { cwd: root,
                env: { ...process.env, CAREER_SEED: String(seed), CAREER_WEEKS: String(horizon), CAREER_OUTPUT: output,CAREER_BATCH_WEEKS:String(batchWeeks) },
                stdio: ['ignore', 'pipe', 'pipe'] });
            const stop=()=>child.kill('SIGTERM');process.once('SIGTERM',stop);process.once('SIGINT',stop);
            child.stdout.pipe(log, { end: false });
            child.stderr.pipe(log, { end: false });
            const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
            await new Promise(resolve => log.end(resolve));
            process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);
            if (code !== 0) failed = true;
            const result=JSON.parse(await readFile(join(output,`career-${seed}.json`),'utf8'));batches++;
            console.log(JSON.stringify({ seed,exitCode:code,status:result.status,weeks:result.executedWeeks,peakRssMiB:Math.round(result.peakRssBytes/1024/1024),report:join(output,`career-${seed}.json`) }));
            if(code!==0||result.status!=='CHECKPOINT_READY'||maxBatches&&batches>=maxBatches)break;
        }
        if(failed)break;
    }
} finally {
    await rm(temp, { recursive: true, force: true });
    if(parentLockFd!==undefined)closeSync(parentLockFd);
    else try{const raw=(await readFile(lockPath,'utf8')).trim();const owner=raw.startsWith('{')?JSON.parse(raw).pid:Number(raw);if(owner===process.pid)await rm(lockPath)}catch{}
}
if (failed) process.exitCode = 1;
