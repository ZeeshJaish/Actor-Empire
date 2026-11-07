import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const { build, stop } = createRequire(process.cwd() + '/package.json')('esbuild');
const file = mkdtempSync('/private/tmp/cinema-private-result-') + '/audit.mjs';
await build({ entryPoints: ['scripts/audit-cinema-private-result.ts'], bundle: true, platform: 'node', format: 'esm',
    loader: { '.csv': 'text', '.css': 'empty' }, outfile: file, logLevel: 'error',
    banner: { js: 'globalThis.__cinemaMirrorEvents=[];' },
    plugins: [{ name: 'real-private-result-mirror-count', setup(api) {
        api.onLoad({ filter: /\/boxOfficeIdentity\.ts$/ }, args => {
            let contents = readFileSync(args.path, 'utf8');
            for (const [name, event] of [['issueCinemaResult', 'issue'], ['assertIssuedCinemaResult', 'assert']]) {
                const original = '__original_' + name;
                contents = contents.replace('export const ' + name + ' = (', 'const ' + original + ' = (');
                contents += `\nexport const ${name}:typeof ${original}=(...args)=>{(globalThis as any).__cinemaMirrorEvents.push('${event}');return ${original}(...args);};\n`;
            }
            return { contents, loader: 'ts', resolveDir: dirname(args.path) };
        });
    } }],
});
stop(); await import(pathToFileURL(file).href);
