import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';

/** Resolve named exports through the installed package's own export table.
 * Avoid traversing thousands of unused icons. Namespace/default imports retain
 * the upstream barrel, including its complete public export semantics.
 */
export function lucideBuildImports(){
 const require=createRequire(import.meta.url),directory=dirname(require.resolve('lucide-react/package.json'));
 const barrel=readFileSync(join(directory,'dist/esm/lucide-react.js'),'utf8'),exports=new Map();
 for(const match of barrel.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"]/g)){
  for(const specifier of match[1].split(',')){
   const part=specifier.trim().match(/^default\s+as\s+(\w+)$/);
   if(part)exports.set(part[1],`lucide-react/dist/esm/${match[2]}`);
  }
 }
 return {name:'direct-lucide-build-imports',apply:'build',enforce:'post',transform(code,id){
  if(id.includes('/node_modules/')||!code.includes('lucide-react'))return null;
  const changes=[];
  for(const node of this.parse(code).body){
   if(node.type!=='ImportDeclaration'||node.source.value!=='lucide-react'||node.specifiers.some(s=>s.type!=='ImportSpecifier'))continue;
   const direct=[],remaining=[];
   for(const s of node.specifiers){
    const imported=s.imported.name,local=s.local.name,path=exports.get(imported);
    if(path)direct.push(`import ${local} from ${JSON.stringify(path)};`);
    else remaining.push(imported===local?imported:`${imported} as ${local}`);
   }
   if(direct.length){if(remaining.length)direct.push(`import {${remaining.join(',')}} from 'lucide-react';`);changes.push({start:node.start,end:node.end,text:direct.join('\n')})}
  }
  if(!changes.length)return null;
  for(const c of changes.reverse())code=code.slice(0,c.start)+c.text+code.slice(c.end);
  return {code,map:null};
 }};
}
