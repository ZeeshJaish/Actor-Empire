import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Player, Commitment, ImprovementOption } from '../../types';
import {OWNED_PRODUCTION_ACTIONS,applyOwnedProductionFocusAction,getOwnedProductionActionProgress} from '../../services/ownedProductionCareer';
import * as balance from '../../services/actorCareerBalance';
import { calculateAuditionGain, calculateProductionGain, rewardGenreExperience } from '../../services/roleLogic';
import { spendPlayerEnergy, syncWeeklyEnergyForCommitments } from '../../services/premiumLogic';
const ts: typeof import('typescript') = createRequire(process.cwd() + '/package.json')('typescript');
const source = readFileSync('hooks/useGameActions.ts', 'utf8');
const ast = ts.createSourceFile('useGameActions.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const declarations = new Map<string,string>();
function collect(node: import('typescript').Node) {
    if (ts.isVariableDeclaration(node) && ['handleImproveAction','handleRehearse','handleOwnedProductionFocus'].includes(node.name.getText(ast)))
        declarations.set(node.name.getText(ast), `const ${node.getText(ast)};`);
    ts.forEachChild(node, collect);
}
collect(ast);
/** Run the exact production UI callbacks; only React state and toast/render sinks are captured. */
export function careerActionHarness(input: Player) {
    let current = input;
    const deps = { ...balance, OWNED_PRODUCTION_ACTIONS,applyOwnedProductionFocusAction,getOwnedProductionActionProgress, calculateAuditionGain, calculateProductionGain, rewardGenreExperience, spendPlayerEnergy,
        setPlayer: (fn: (p:Player)=>Player) => { current=fn(current); }, tr: (key:string)=>key,
        setToastMessage:()=>{}, handlePromotionAction:()=>{} };
    const code = ts.transpileModule([...declarations.values()].join('\n')+'\nreturn {handleImproveAction,handleRehearse,handleOwnedProductionFocus};',
        {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    const actions = new Function(...Object.keys(deps),code)(...Object.values(deps));
    return { improve:(category:string,name:string,option:ImprovementOption)=>{actions.handleImproveAction(category,name,option);return current},
        ownedFocus:(id:string,action:import('../../types').OwnedProductionActionId)=>{actions.handleOwnedProductionFocus(id,action);return current},
        rehearse:(id:string)=>{actions.handleRehearse(id);return current}, player:()=>current };
}
const app = readFileSync('App.tsx','utf8');
const appAst=ts.createSourceFile('App.tsx',app,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
let normalize='',enroll='';
function readApp(node:import('typescript').Node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(appAst)==='normalizeCommitment')normalize=`const ${node.getText(appAst)};`;
    if(ts.isJsxAttribute(node)&&node.name.getText(appAst)==='onEnroll'&&node.initializer&&ts.isJsxExpression(node.initializer)&&node.initializer.expression)
        enroll=node.initializer.expression.getText(appAst);
    ts.forEachChild(node,readApp);
}
readApp(appAst);
export function enrollThroughApp(input:Player,course:Commitment):Player{
    let result=input;
    const code=ts.transpileModule(`const enroll=${enroll};enroll(course);`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    new Function('handleGenericUpdate','syncWeeklyEnergyForCommitments','course',code)(
        (fn:(p:Player)=>Player)=>{result=balance.ensureActorCareerBalance(fn(result))},syncWeeklyEnergyForCommitments,course);
    return result;
}
/** Field-whitelist compatibility check; project details are already normalized by real save migration. */
export function normalizeCareerCommitmentsThroughApp(rows:Commitment[]):Commitment[]{
    const code=ts.transpileModule(normalize+'\nreturn rows.map(normalizeCommitment);',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    return new Function('normalizeProjectDetails','rows',code)((details:unknown)=>details,rows);
}
