import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('..',import.meta.url));
const work=mkdtempSync(join(tmpdir(),'actor-empire-names-'));
const checks=['audit-fictional-names','audit-builtin-name-transition','audit-builtin-name-flow','audit-talent-roster-flow'];
try {
    for(const check of checks){
        const output=join(work,check+'.mjs');
        await build({entryPoints:[resolve(root,'scripts',check+'.ts')],outfile:output,bundle:true,platform:'node',format:'esm',loader:{'.csv':'text'},logLevel:'error'});
        console.log(`\n${check}`);
        const result=spawnSync(process.execPath,[output],{cwd:root,stdio:'inherit'});
        if(result.error)throw result.error;
        if(result.status!==0)throw new Error(`${check} exited with ${result.status ?? result.signal}`);
    }
} finally {
    rmSync(work,{recursive:true,force:true});
}
