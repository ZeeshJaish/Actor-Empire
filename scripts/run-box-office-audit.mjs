import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const suites = new Set(['inputs', 'delivery', 'finance', 'phase1-integration']);
const suite = process.argv[2];
if (!suites.has(suite)) throw new Error(`Choose an implemented cinema audit: ${[...suites].join(', ')}`);
const folder = await mkdtemp(join(tmpdir(), 'actor-box-office-'));
try {
  const bundle = join(folder, `${suite}.mjs`);
  await build({ entryPoints: [`scripts/audit-box-office-${suite}.ts`], bundle: true,
    platform: 'node', format: 'esm', loader: { '.csv': 'text' }, outfile: bundle, logLevel: 'error' });
  const result = spawnSync(process.execPath, [bundle], { stdio: 'inherit', timeout: 120_000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { await rm(folder, { recursive: true, force: true }); }
