import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import type {Player,Agent,TeamMember} from '../../types';
import {getAbsoluteWeek} from '../../services/legacyLogic';
const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
const appSource=readFileSync('App.tsx','utf8');
const teamSource=readFileSync('views/mobile/TeamApp.tsx','utf8');
const app=ts.createSourceFile('App.tsx',appSource,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
const team=ts.createSourceFile('TeamApp.tsx',teamSource,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
let agentCallback='',memberCallback='';
function visitApp(n:import('typescript').Node){
 if(ts.isJsxAttribute(n)&&n.name.getText(app)==='onHireAgent'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression)agentCallback=n.initializer.expression.getText(app);
 ts.forEachChild(n,visitApp);
}
function visitTeam(n:import('typescript').Node){
 if(ts.isVariableDeclaration(n)&&n.name.getText(team)==='handleHireMember')memberCallback=`const ${n.getText(team)};`;
 ts.forEachChild(n,visitTeam);
}
visitApp(app);visitTeam(team);assert(agentCallback&&memberCallback);
/** Production callbacks; only React state/render sinks are replaced. No billing calls. */
export const hireRewardScenarioTeam=(initial:Player,agent:Agent,member:TeamMember):Player=>{
 let player=initial;
 const agentBody=ts.transpileModule(`const hire=${agentCallback};hire(agent);`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('agent','handleGenericUpdate','tr','setToastMessage','getAbsoluteWeek',agentBody)(agent,(fn:(p:Player)=>Player)=>{player=fn(player)},()=>'',()=>{},getAbsoluteWeek);
 const memberBody=ts.transpileModule(memberCallback+'\nhandleHireMember(member);',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('member','player','onUpdatePlayer','guardTeamChange','safeShowToast','tr','setSelectedMember','getAbsoluteWeek',memberBody)(member,player,(p:Player)=>{player=p},()=>!player.flags.teamChangeLocked,()=>{},()=>'',()=>{},getAbsoluteWeek);
 assert.equal(player.team.agent?.id,agent.id);assert.equal(player.team.publicist?.id,member.id);
 return player;
};
