// Run the current benchmark against the saved checkpoint without changing a checkout.
import { build } from 'esbuild';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
    'components/StreamingContentMarket.tsx', 'components/StreamingPlatformHQ.tsx',
    'services/streamingBackendPolicy.ts', 'services/streamingBuyerAuctions.ts',
    'services/streamingCatalog.ts', 'services/streamingContentAvailability.ts',
    'services/streamingHq.ts', 'services/streamingOpportunityMarket.ts',
    'services/streamingRightsMarketplace.ts',
];
const originals = new Map(files.map(file => [path.join(root, file), execFileSync('git',
    ['show', `checkpoint-lazy-load-fix:${file}`], { cwd: root, encoding: 'utf8' })]));
const output = path.join(mkdtempSync(path.join(tmpdir(), 'actor-streaming-checkpoint-')), 'benchmark.cjs');
await build({
    absWorkingDir: root, entryPoints: ['scripts/benchmark-streaming-tap-lag.tsx'],
    bundle: true, platform: 'node', format: 'cjs', loader: { '.csv': 'text', '.css': 'empty' }, outfile: output,
    plugins: [{ name: 'checkpoint-source', setup(builder) {
        builder.onLoad({ filter: /\.tsx?$/ }, args => originals.has(args.path) ? {
            contents: originals.get(args.path), loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path),
        } : undefined);
    } }],
});
const result = spawnSync(process.execPath, [output, 'checkpoint', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
