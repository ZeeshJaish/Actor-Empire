import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
const { build, stop } = createRequire(process.cwd() + '/package.json')('esbuild');
const file = mkdtempSync('/private/tmp/viewing-readiness-cost-') + '/audit.mjs';
await build({ entryPoints: ['scripts/audit-viewing-readiness-cost.ts'], bundle: true, platform: 'node', format: 'esm',
    loader: { '.csv': 'text', '.css': 'empty' }, outfile: file, logLevel: 'error',
    banner: { js: 'globalThis.__viewingReadinessBatches=[];globalThis.__currentViewingReadiness=null;' },
    plugins: [{ name: 'real-readiness-call-probe', setup(api) {
        api.onLoad({ filter: /\/(worldStreamingViewing|streamingProductionReadiness)\.ts$/ }, args => {
            const local = relative(process.cwd(), args.path);
            const old = process.env.READINESS_COST_SOURCE && process.env.READINESS_COST_SOURCE + '/' + local;
            let contents = readFileSync(old || args.path, 'utf8');
            if (local.endsWith('/worldStreamingViewing.ts')) {
                contents = contents.replace('const projectRivalViewing = (', 'const __originalProjectRivalViewing = (');
                contents += `\nconst projectRivalViewing:typeof __originalProjectRivalViewing=(...args)=>{
                    const previous=(globalThis as any).__currentViewingReadiness;
                    const batch={calls:0,titles:new Set<string>()};(globalThis as any).__currentViewingReadiness=batch;
                    try{return __originalProjectRivalViewing(...args);}finally{(globalThis as any).__currentViewingReadiness=previous;(globalThis as any).__viewingReadinessBatches.push(batch);}
                };\n`;
            } else {
                contents = contents.replace('export const resolveStreamingProductionReadiness = (', 'const __originalReadiness = (');
                contents += `\nexport const resolveStreamingProductionReadiness:typeof __originalReadiness=(...args)=>{
                    const batch=(globalThis as any).__currentViewingReadiness;if(batch){batch.calls++;batch.titles.add(args[1]);}
                    return __originalReadiness(...args);
                };\n`;
            }
            return { contents, loader: 'ts', resolveDir: dirname(args.path) };
        });
    } }],
});
stop(); await import(pathToFileURL(file).href);
