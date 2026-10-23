import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {INITIAL_PLAYER,type Player} from '../types';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {AGENT_CATALOG,PUBLICIST_CATALOG} from '../services/teamLogic';
import {hireRewardScenarioTeam} from './fixtures/actorRewardScenarioActions';
const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
const source=readFileSync('services/gameLoop.ts','utf8');
const body=source.slice(source.indexOf('    // Annual Fees'),source.indexOf("    emitLoopStage('creator_talent_done'"));
const bill=(p:Player)=>{
 const entries:any[]=[];
 const addTransaction=(amount:number,category:string,description:string)=>{p.money+=amount;entries.push({amount,category,description})};
 new Function('nextPlayer','getAbsoluteWeek','ensureFiniteNumber','addTransaction','logsToAdd',ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(p,getAbsoluteWeek,(v:any,f=0)=>Number.isFinite(Number(v))?Number(v):f,addTransaction,[]);
 return entries;
};
let failures=0,passes=0;
const test=(n:string,f:()=>void)=>{try{f();passes++;console.log('PASS '+n)}catch(e){failures++;console.error('FAIL '+n+': '+(e as Error).message)}};
test('paid hire callbacks prevent a second annual and first-week staff fee',()=>{
 let p=structuredClone(INITIAL_PLAYER);p.money=100000;p=hireRewardScenarioTeam(p,AGENT_CATALOG[1],PUBLICIST_CATALOG[0]);assert.equal(p.money,59700);
 const snapshot=structuredClone(p);assert.equal(bill(p).length,0);assert.equal(p.money,snapshot.money);
 p.currentWeek=2;const next=bill(p);assert.equal(next.length,1);assert.equal(next[0].amount,-300);
});
test('anniversary renews once at the contracted fee, including a midyear hire',()=>{
 const p=structuredClone(INITIAL_PLAYER);p.currentWeek=20;p.money=200000;p.team.agent=AGENT_CATALOG[1];p.team.lastAgentFeePaidWeek=getAbsoluteWeek(p.age,p.currentWeek);
 p.age++;p.currentWeek=1;assert.equal(bill(p).length,0);
 p.currentWeek=20;assert.equal(bill(p)[0].amount,-40000);assert.equal(bill(p).length,0);
 p.age++;assert.equal(bill(p)[0].amount,-40000);
});
test('legacy untracked staff retain calendar renewals with no historical refunds',()=>{
 const p=structuredClone(INITIAL_PLAYER);p.money=100000;p.team.agent=AGENT_CATALOG[1];const before=structuredClone(p.finance.history);
 assert.equal(bill(p)[0].amount,-40000);assert.equal(p.money,60000);assert.deepEqual(p.finance.history,before);
});
test('manager renewal follows its paid term without changing commission or annual fee',()=>{
 const p=structuredClone(INITIAL_PLAYER);p.team.manager={id:'signed-manager',annualFee:50000,commission:.2} as any;p.team.lastManagerFeePaidWeek=getAbsoluteWeek(p.age,p.currentWeek);
 assert.equal(bill(p).length,0);p.age++;const rows=bill(p);assert.equal(rows.length,1);assert.equal(rows[0].amount,-50000);assert.equal(p.team.manager.commission,.2);
});
console.log(JSON.stringify({passes,failures}));if(failures)process.exitCode=1;
