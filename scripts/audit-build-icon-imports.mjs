import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {build} from 'esbuild';import {parseAst} from 'rollup/parseAst';import {lucideBuildImports} from './build/lucideImports.mjs';
// Catch accidental fallback to the full barrel while preserving real SVG output,
// alias imports, unknown namespace exports, and inert import text in strings.
const root=process.cwd(),temp=await fs.mkdtemp(path.join(os.tmpdir(),'icon-build-test-'));
const code=`import {AlarmClockCheck as Bell, ChevronLeft, createLucideIcon} from 'lucide-react';\nimport React from 'react';import {renderToStaticMarkup} from 'react-dom/server';\nexport const result=renderToStaticMarkup(React.createElement('div',null,React.createElement(Bell),React.createElement(ChevronLeft)));export const helper=typeof createLucideIcon;`;
const plugin=lucideBuildImports();plugin.parse=parseAst;
try{const transformed=process.env.AUDIT_ICON_BASELINE==='1'?null:await plugin.transform(code,path.join(root,'icon-probe.js'));const texts=[code,transformed?.code||code],results=[];
 for(let i=0;i<texts.length;i++){const out=path.join(temp,`case-${i}.cjs`);const b=await build({stdin:{contents:texts[i],resolveDir:root,sourcefile:'icon-probe.js'},bundle:true,platform:'node',mainFields:['module','main'],format:'cjs',outfile:out,metafile:true,logLevel:'silent'});const {createRequire}=await import('node:module');results.push({exports:createRequire(import.meta.url)(out),inputs:Object.keys(b.metafile.inputs).filter(k=>k.includes('lucide-react/')).length});}
 assert.deepEqual(results[1].exports,results[0].exports,'SVG/alias/helper exports must be identical');assert.ok(results[1].inputs<results[0].inputs/10,'Named icons must not traverse unused icon barrel');
 const fallback=await plugin.transform(`import { icons } from 'lucide-react'; export {icons};`,path.join(root,'namespace-probe.js'));assert.equal(fallback,null,'Namespace semantics must remain intact');
 const text=await plugin.transform('export const text = "import {Camera} from \'lucide-react\'";',path.join(root,'text-probe.js'));assert.equal(text,null,'Strings must stay unchanged');
 console.log(JSON.stringify({status:'PASS',barrelModules:results[0].inputs,directModules:results[1].inputs,identicalSvg:true}));
}finally{await fs.rm(temp,{recursive:true,force:true})}
