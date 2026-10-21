// Run from the repository root. Seed module initialization as well as the audit,
// because NPC defaults and IDs can otherwise change between identical runs.
import { buildSync } from 'esbuild';
import { pathToFileURL } from 'node:url';
const bundle = '/tmp/box-office-current-system-analysis.mjs';
buildSync({entryPoints:['docs/reports/2026-10-22-box-office-analysis/audit.ts'],bundle:true,
  platform:'node',format:'esm',loader:{'.csv':'text'},outfile:bundle,logLevel:'warning'});
const originalRandom=Math.random, originalNow=Date.now;
let state=20261022, tick=0;
Math.random=()=>{let t=state+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
Date.now=()=>1_800_000_000_000+tick++;
try { await import(pathToFileURL(bundle).href); }
finally { Math.random=originalRandom;Date.now=originalNow; }
