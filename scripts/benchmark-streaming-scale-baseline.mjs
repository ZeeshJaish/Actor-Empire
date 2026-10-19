// Compare current scale fixture/benchmark with the source before this repair.
// Source overlay only: never resets or modifies the checkout or a user save.
import { build } from 'esbuild';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(mkdtempSync(path.join(tmpdir(), 'actor-streaming-scale-baseline-')), 'benchmark.cjs');
await build({
    absWorkingDir: root, entryPoints: ['scripts/benchmark-streaming-catalogue-scale.tsx'], bundle: true,
    platform: 'node', format: 'cjs', loader: { '.csv': 'text', '.css': 'empty' }, outfile: output,
    plugins: [{ name: 'pre-scale-source', setup(builder) {
        builder.onLoad({ filter: /\.(tsx?|jsx?)$/ }, args => {
            const relative = path.relative(root, args.path);
            if (relative.startsWith('..') || relative.startsWith('node_modules/') || relative.startsWith('scripts/')) return;
            return { contents: execFileSync('git', ['show', `693c84d:${relative}`], { cwd: root, encoding: 'utf8' }),
                loader: relative.endsWith('tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
        });
    } }],
});
const result = spawnSync(process.execPath, [output, 'before'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
