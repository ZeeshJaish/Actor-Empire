import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import type {Player,Genre} from '../../types';
import {WORKSHOP_CATALOG,GENRE_TRAINING_CATALOG,IMPROVEMENT_CATALOG} from '../../services/lifestyleLogic';
import {getActorTalent,calculateGenreFit} from '../../services/roleLogic';
import {applyCareerAuditionApplication,acceptCareerPartTimeJob} from '../../services/careerApplicationActions';
import {resolveLifeEventFallback} from '../../services/lifeEventFallback';
import {applyCrisisImpact} from '../../services/productionService';
import {careerActionHarness,enrollThroughApp} from './actorCareerActions';
const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
const source=readFileSync('scripts/audit-actor-career-flow.ts','utf8');
const ast=ts.createSourceFile('policy.ts',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS),parts:string[]=[];
const wanted=new Set(['record','ui','chooseLife','wellbeing','policy']);
for(const node of ast.statements){
    if(ts.isFunctionDeclaration(node)&&node.name&&wanted.has(node.name.text))parts.push(node.getText(ast));
    if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations)
        if(wanted.has(d.name.getText(ast)))parts.push(`const ${d.getText(ast)};`);
}
assert.equal(parts.length,5,'Normal-career policy extraction must include its real action handlers');

/** Audit policy shared verbatim with the current actor-career journey.
 * The runner freezes these source strings when it pins the executable.
 */
export const createNormalAppCareerPolicy=(genre:Genre,seed:number,actions:any[],signed:Map<string,number>,phases:Set<string>)=>{
    const deps={assert,WORKSHOP_CATALOG,GENRE_TRAINING_CATALOG,IMPROVEMENT_CATALOG,getActorTalent,calculateGenreFit,
        applyCareerAuditionApplication,acceptCareerPartTimeJob,resolveLifeEventFallback,applyCrisisImpact,careerActionHarness,enrollThroughApp,
        genre,seed,actions,signed,phases};
    const code=ts.transpileModule(`let player:Player,weeks=0;${parts.join('\n')}\nreturn (input:Player,week:number)=>{player=input;weeks=week;policy();return player;};`,
        {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    return new Function(...Object.keys(deps),code)(...Object.values(deps)) as (player:Player,week:number)=>Player;
};
