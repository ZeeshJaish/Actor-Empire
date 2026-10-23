import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import type {Player,Message,InstaPostType} from '../../types';
import {getAbsoluteWeek} from '../../services/legacyLogic';
import {getPhaseDuration} from '../../services/roleLogic';
import {applyOpportunityIdentityToProject} from '../../services/characterIdentityLogic';
import {normalizeUniverseMap} from '../../services/universeLogic';
const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
import {INSTAGRAM_POST_CONFIGS,calculateInstagramPostOutcome,clampInstagramStat} from '../../services/instagramLogic';
import {spendPlayerEnergy,syncWeeklyEnergyForCommitments} from '../../services/premiumLogic';
const app=readFileSync('App.tsx','utf8');
const mobile=readFileSync('views/mobile/MobilePage.tsx','utf8');
const team=readFileSync('views/mobile/TeamApp.tsx','utf8');
function extract(source:string,file:string,name:string){const ast=ts.createSourceFile(file,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);let code='';function visit(n:import('typescript').Node){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)code=`const ${n.getText(ast)};`;ts.forEachChild(n,visit)}visit(ast);assert(code,name);return ts.transpileModule(code+`\nreturn ${name};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
const accept=extract(mobile,'MobilePage.tsx','handleAcceptMessage'),agent=extract(mobile,'MobilePage.tsx','handleHireAgent'),member=extract(team,'TeamApp.tsx','handleHireMember');
export const lifetimeAccept=(initial:Player,msg:Message):Player=>{
 assert(['OFFER_ROLE','OFFER_NEGOTIATION','OFFER_AUDITION'].includes(msg.type));let player=initial;
 const deps={props:{player:initial},handleUpdatePlayer:(p:Player)=>player=p,showToast:()=>{},tr:()=>'',getPhaseDuration,applyOpportunityIdentityToProject,normalizeUniverseMap};
 new Function(...Object.keys(deps),accept)(...Object.values(deps))(msg);return player;
};
export const lifetimeHire=(initial:Player,kind:'agent'|'member',candidate:any):Player=>{
 assert(!initial.flags.teamChangeLocked);assert(initial.money>=(kind==='agent'?candidate.annualFee:candidate.weeklyCost));let player=initial;
 const deps=kind==='agent'?{props:{player:initial},handleUpdatePlayer:(p:Player)=>player=p,showToast:()=>{},getAbsoluteWeek,tr:()=>''}
 :{player:initial,onUpdatePlayer:(p:Player)=>player=p,guardTeamChange:()=>!initial.flags.teamChangeLocked,safeShowToast:()=>{},tr:()=>'',setSelectedMember:()=>{},getAbsoluteWeek};
 new Function(...Object.keys(deps),kind==='agent'?agent:member)(...Object.values(deps))(candidate);return player;
};

const appAst=ts.createSourceFile('App.tsx',app,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);let postCallback='';
function visitPost(n:import('typescript').Node){if(ts.isJsxAttribute(n)&&n.name.getText(appAst)==='onPost'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression)postCallback=n.initializer.expression.getText(appAst);ts.forEachChild(n,visitPost)}visitPost(appAst);assert(postCallback);
const postCode=ts.transpileModule(`return (${postCallback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
export const lifetimePost=(initial:Player,type:InstaPostType):Player=>{let player={...initial,instagram:{...initial.instagram}};const deps={handleGenericUpdate:(fn:(p:Player)=>Player)=>player=fn(player),setToastMessage:()=>{},tr:()=>'',INSTAGRAM_POST_CONFIGS,calculateInstagramPostOutcome,clampInstagramStat,spendPlayerEnergy};new Function(...Object.keys(deps),postCode)(...Object.values(deps))(type,'A week of work and training.');return player;};
const quitCode=extract(app,'App.tsx','handleQuitJob');
export const lifetimeQuitJob=(initial:Player,id:string):Player=>{let player=initial;const deps={handleGenericUpdate:(fn:(p:Player)=>Player)=>player=fn(player),syncWeeklyEnergyForCommitments};new Function(...Object.keys(deps),quitCode)(...Object.values(deps))(id);return player;};
const fireMemberCode=extract(team,'TeamApp.tsx','handleFireMember');
export const lifetimeFireMember=(initial:Player,type:string):Player=>{let player=initial;const deps={player:initial,onUpdatePlayer:(p:Player)=>player=p,guardTeamChange:()=>!initial.flags.teamChangeLocked,safeShowToast:()=>{},tr:()=>''};new Function(...Object.keys(deps),fireMemberCode)(...Object.values(deps))(type);return player;};
let fireAgentCallback='';function readFire(n:import('typescript').Node){if(ts.isJsxAttribute(n)&&n.name.getText(appAst)==='onFireAgent'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression)fireAgentCallback=n.initializer.expression.getText(appAst);ts.forEachChild(n,readFire)}readFire(appAst);assert(fireAgentCallback);
const fireAgentCode=ts.transpileModule(`return (${fireAgentCallback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
export const lifetimeFireAgent=(initial:Player):Player=>{let player=initial;new Function('handleGenericUpdate',fireAgentCode)((fn:(p:Player)=>Player)=>player=fn(player))();return player;};
