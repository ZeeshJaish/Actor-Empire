import {createRequire} from 'node:module';
import {readFileSync,mkdtempSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {build,stop}=createRequire(process.cwd()+'/package.json')('esbuild');
const entry=process.argv[2];if(!entry)throw Error('Audit entry required');
const file=mkdtempSync('/private/tmp/actor-week-audit-')+'/audit.mjs';
await build({entryPoints:[entry],outfile:file,bundle:true,format:'esm',platform:'node',loader:{'.csv':'text','.css':'empty'},logLevel:'error',
 plugins:[{name:'test-only-compaction-boundaries',setup(api){api.onLoad({filter:/\/saveCompaction\.ts$/},args=>({
  contents:readFileSync(args.path,'utf8')+'\n(globalThis as any).__historyRetentionProbe=retainBoundedHistory;(globalThis as any).__platformSlateProbe=compactPlatformAiSlate;\n',loader:'ts',resolveDir:dirname(args.path),
 }));api.onLoad({filter:/\/boxOfficeMarket\.ts$/},args=>({contents:readFileSync(args.path,'utf8')+'\n(globalThis as any).__cinemaPopulationProbe=reconcilePopulation;(globalThis as any).__cinemaFingerprintProbe=fingerprint;\n',loader:'ts',resolveDir:dirname(args.path)}));
 api.onLoad({filter:/\/boxOfficeAudience\.ts$/},args=>({contents:readFileSync(args.path,'utf8').replace('const castUnique =','const castUniqueImplementation =')+'\nconst castUnique=(...args:Parameters<typeof castUniqueImplementation>)=>{(globalThis as any).__cinemaCastPasses=((globalThis as any).__cinemaCastPasses||0)+1;return castUniqueImplementation(...args);};\n',loader:'ts',resolveDir:dirname(args.path)}));
 api.onLoad({filter:/\/worldStreamingRoyaltyAttribution\.ts$/},args=>({contents:readFileSync(args.path,'utf8').replace('const routePools = allocateStreamingStoreUnits','if(gross===0)(globalThis as any).__zeroRoyaltyRoutes=((globalThis as any).__zeroRoyaltyRoutes||0)+1;const routePools = allocateStreamingStoreUnits'),loader:'ts',resolveDir:dirname(args.path)}));}}]});stop();await import(pathToFileURL(file).href);
