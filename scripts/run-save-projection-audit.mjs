import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const { build, stop } = createRequire(process.cwd() + '/package.json')('esbuild');
const out = mkdtempSync('/private/tmp/actor-save-projection-') + '/audit.mjs';
await build({ entryPoints: [process.argv[2] || 'scripts/audit-save-projection-work.ts'], outfile: out, bundle: true, platform: 'node', format: 'esm', loader: { '.csv': 'text' }, logLevel: 'error',
    plugins: [{ name: 'test-only-projection-work', setup(api) {
        api.onLoad({ filter: /\/streamingLocalizationCapabilities\.ts$/ }, args => ({
            contents: readFileSync(args.path, 'utf8').replace("=> String(value || '')", "=> ((globalThis as any).__captureCinemaLanguage && ((globalThis as any).__cinemaLanguageCalls=((globalThis as any).__cinemaLanguageCalls||0)+1), String(value || ''))"),
            loader: 'ts', resolveDir: dirname(args.path),
        }));
        api.onLoad({ filter: /\/stableSaveHash\.ts$/ }, args => {
            let source = readFileSync(args.path, 'utf8');
            if (source.includes('let sortKeyNodes')) source = source.replace('return (first >>> 0)', '(globalThis as any).__hashSortKeyNodes=sortKeyNodes;return (first >>> 0)');
            return { contents: source, loader: 'ts', resolveDir: dirname(args.path) };
        });
        api.onLoad({ filter: /\/saveIntegrity\.ts$/ }, args => ({ contents: readFileSync(args.path, 'utf8') + '\n(globalThis as any).__industryIntegrityProbe=(player:any)=>industryIntelligenceStateOf(industryIntelligenceInput(player));\n', loader: 'ts', resolveDir: dirname(args.path) }));
        api.onLoad({ filter: /\/industryIntelligenceState\.ts$/ }, args => ({ contents: readFileSync(args.path, 'utf8').replace('export const compactIndustryIntelligenceState =', 'const compactIndustryIntelligenceStateImplementation =') + `
export const compactIndustryIntelligenceState=(state:Parameters<typeof compactIndustryIntelligenceStateImplementation>[0])=>{
 if((globalThis as any).__captureIndustryWork){
  const w=(globalThis as any).__industryWork;
  w.ignoredRows+=(state.shadowComparisons?.length||0)+(state.processedKeys?.length||0)+(state.learning?.samples?.length||0)+(state.learning?.processedEvidenceIds?.length||0);
  for(const p of state.proposals||[])if(p&&typeof p==='object')w.extraProposalFields+=Object.keys(p).filter(k=>!['id','lane','status'].includes(k)).length;
 }
 return compactIndustryIntelligenceStateImplementation(state);
};`, loader: 'ts', resolveDir: dirname(args.path) }));
    } }] });
stop(); await import(pathToFileURL(out).href);
