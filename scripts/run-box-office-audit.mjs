import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const suites = new Set(['inputs', 'delivery', 'finance', 'finance-contracts', 'finance-ui', 'phase1-integration', 'awareness', 'phase2-integration', 'audience', 'market']);
const suite = process.argv[2];
if (!suites.has(suite)) throw new Error(`Choose an implemented cinema audit: ${[...suites].join(', ')}`);
const folder = await mkdtemp(join(tmpdir(), 'actor-box-office-'));
try {
  const ui = suite === 'finance-ui';
  const bundle = join(folder, `${suite}.${ui ? 'cjs' : 'mjs'}`);
  await build({ entryPoints: [`scripts/audit-box-office-${suite}.${ui ? 'tsx' : 'ts'}`], bundle: true,
    platform: 'node', format: ui ? 'cjs' : 'esm', loader: { '.csv': 'text', '.css': 'empty' }, outfile: bundle, logLevel: 'error' });
  const seed = Number(process.argv[3] ?? 20261022);
  if (!Number.isSafeInteger(seed)) throw new Error('Cinema audit seed must be an integer');
  // Seed module initialization too: catalogue defaults and generated IDs consume RNG.
  const bootstrap = `let state=${seed >>> 0},tick=0;Math.random=()=>{let t=state+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};Date.now=()=>1800000000000+tick++;await import(${JSON.stringify(pathToFileURL(bundle).href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', bootstrap], { stdio: 'inherit', timeout: 120_000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { await rm(folder, { recursive: true, force: true }); }
