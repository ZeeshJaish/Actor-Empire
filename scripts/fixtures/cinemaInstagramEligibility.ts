import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import type {Player,InstaPostType} from '../../types';

const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
const source=readFileSync('views/mobile/InstagramApp.tsx','utf8');
const ast=ts.createSourceFile('InstagramApp.tsx',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
const names=new Set(['hasActiveRole','hasFilmingRole','hasReleasedMovie','hasRomance','publicFollowers']);
const declarations=new Map<string,string>();let options:import('typescript').ArrayLiteralExpression|undefined;
const visit=(n:import('typescript').Node)=>{
 if(ts.isVariableDeclaration(n)&&n.initializer){
  const name=n.name.getText(ast);if(names.has(name))declarations.set(name,`const ${name}=${n.initializer.getText(ast)};`);
  if(name==='postTypeOptions'&&ts.isCallExpression(n.initializer)&&ts.isPropertyAccessExpression(n.initializer.expression)&&ts.isArrayLiteralExpression(n.initializer.expression.expression))options=n.initializer.expression.expression;
 }
 ts.forEachChild(n,visit);
};visit(ast);
assert.equal(declarations.size,names.size);assert.ok(options,'Read the actual normal post picker eligibility, not a handwritten approximation');
const rows=options.elements.map(n=>{assert.ok(ts.isArrayLiteralExpression(n));return `${n.elements[0].getText(ast)}:${n.elements[3]?.getText(ast)||'undefined'}`});
const code=ts.transpileModule([...declarations.values()].join('\n')+`return {${rows.join(',')}};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const readLocks=new Function('player',code) as (p:Player)=>Partial<Record<InstaPostType,string|undefined>>;
export const getMatureInstagramPostLocks=(p:Player)=>readLocks(p);
