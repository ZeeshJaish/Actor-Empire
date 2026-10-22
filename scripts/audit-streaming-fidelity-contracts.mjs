import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the real audit against in-memory broken inputs. Never edit a UI file.
const source=readFileSync('scripts/audit-streaming-zip-fidelity.mjs','utf8').replace(/^import .*;\n/gm,'');
const run=(path,change)=>vm.runInNewContext(source,{
  createHash,
  readFileSync:(file,...args)=>{
    const original=readFileSync(file,...args);
    return file===path ? change(original) : original;
  },
  console:{log(){}},
});
run();
const checks=[
  ['components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css',text=>`${text}\n/* unexpected drift */`,/Buildout.*drifted/],
  ['components/StreamingPlatformHQ.tsx',text=>text.replace('<StreamingPlatformDesk','<RetiredPlatformDesk'),/HQ must mount StreamingPlatformDesk/],
  ['components/StreamingPlatformHQ.tsx',text=>text.replace('offer={platformOffer()}','offer={undefined}'),/canonical Offer actions/],
  ['components/StreamingPlatformHQ.tsx',text=>text.replace('onInjectCapital={injectFinanceCapital}','onInjectCapital={undefined}'),/canonical capital/],
  ['components/studio-finance/components/launch/StepMarkets.tsx',text=>text.replace('setRegion(name);','setRegion(name); patch({ selectedCountryIds: [] });'),/Browsing a region must not select/],
  ['components/studio-finance/components/launch/StepMarkets.tsx',text=>text.replaceAll('<FlagField','<EmojiFlag'),/cross-platform SVG flags/],
  ['components/streaming-transplant/StreamingAudienceExperience.tsx',text=>text.replace('market?.worldCountries','undefined'),/canonical all-country market intelligence/],
];
for(const [path,change,message] of checks) assert.throws(()=>run(path,change),message);
console.log(`PASS fidelity audit accepts approved UI and rejects ${checks.length} stylesheet/routing/data regressions`);
