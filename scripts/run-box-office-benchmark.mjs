import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
// Seed catalogue/talent module initialization as well as each measured game week.
const folder = await mkdtemp(join(tmpdir(), 'actor-cinema-benchmark-'));
try {
    const bundle = join(folder, 'week.mjs');
    await build({ entryPoints: ['scripts/benchmark-box-office-week.ts'], bundle: true, platform: 'node',
        format: 'esm', loader: { '.csv': 'text' }, outfile: bundle, logLevel: 'error' });
    const bootstrap = `let state=20261022,tick=0;Math.random=()=>{let t=state+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};Date.now=()=>1800000000000+tick++;process.argv.push(...${JSON.stringify(process.argv.slice(2))});await import(${JSON.stringify(pathToFileURL(bundle).href)});`;
    const result = spawnSync(process.execPath, ['--max-old-space-size=12000', '--expose-gc', '--input-type=module', '--eval', bootstrap],
        { stdio: 'inherit', timeout: 1_800_000 });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
} finally { await rm(folder, { recursive: true, force: true }); }
