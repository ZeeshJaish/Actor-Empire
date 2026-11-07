import assert from 'node:assert/strict';
import * as platformAi from '../services/platformAi/platformAiState';
import * as studioAi from '../services/studioAi/studioAiState';
import {createPlatformAiFixture} from './helpers/platformAiFixture';
import {createSaveIntegrityManifest,verifySaveIntegrity} from '../services/saveIntegrity';
const readPlatform=(platformAi as any).readNormalizedPlatformAiIntelligence;
const readStudio=(studioAi as any).readNormalizedStudioAiIntelligence;
assert.equal(typeof readPlatform,'function','Integrity needs an exact intelligence-only platform read');
assert.equal(typeof readStudio,'function','Integrity needs an exact intelligence-only studio read');
const player=createPlatformAiFixture(),week=player.age*52+player.currentWeek;
const base=Object.values(player.world.platforms!)[0];
const canonical=platformAi.normalizePlatformAiState(structuredClone(base),player.id,week);
const legacy=structuredClone(canonical) as any;legacy.ai.schemaVersion=1;legacy.ai.intelligence.platformMigration=undefined;legacy.ai.intelligenceMigration={legacyField:'keep normalization behavior'};
const marked=structuredClone(canonical) as any;delete marked.ai.intelligence.platformMigration;marked.ai.intelligence.futureField={kept:17};
platformAi.markPlatformAiStateCanonicalForTurn(marked,player.id,week);
let passed=0;
for(const [platform,at]of [[{...base,ai:undefined},week],[canonical,week],[legacy,week],[marked,week],[marked,week-1]] as const){
 const before=JSON.stringify(platform),expected=platformAi.normalizePlatformAiState(platform as any,player.id,at).ai?.intelligence;
 assert.deepEqual(readPlatform(platform,player.id,at),expected,'Canonical, marked, future-marked and legacy reads must match the complete normalizer, including optional keys');
 assert.equal(JSON.stringify(platform),before);passed++;
}
assert.equal(readPlatform(marked,player.id,week),marked.ai.intelligence,'An internal canonical marker preserves the raw issued shape');
assert.equal(readPlatform(marked,player.id,week).futureField.kept,17);
assert.equal(Object.hasOwn(readPlatform(marked,player.id,week),'platformMigration'),false,'A later optional key must not be inserted on the canonical branch');
const studio=Object.values(player.world.studios!)[0];
for(const value of [studio,{...studio,ai:undefined},{...studio,ai:{seed:'saved-seed',intelligence:{companyId:studio.id,learning:{}}}}] as any[]){
 const before=JSON.stringify(value);assert.deepEqual(readStudio(value,{absoluteWeek:week}),studioAi.normalizeStudioAiState(value,{absoluteWeek:week}).intelligence);
 assert.equal(JSON.stringify(value),before);passed++;
}
player.world.platforms={...player.world.platforms,[base.id]:legacy};
platformAi.resetPlatformAiNormalizationDiagnostics();
const manifest=createSaveIntegrityManifest(player,'MANUAL',17);
assert.equal(platformAi.getPlatformAiNormalizationDiagnostics().rebuildCount,0,'Signing intelligence must not rebuild unrelated localization, slate, rights or payment-obligation histories');
assert.equal(verifySaveIntegrity(player,manifest).ok,true);
player.money++;assert.equal(verifySaveIntegrity(player,manifest).ok,false,'Narrow derivation must retain fresh money verification');
console.log(JSON.stringify({passed:passed+7,canonicalAndLegacyProjectionExact:true,rawOptionalShapePreserved:true,fullPlatformRebuilds:0,moneyTamperingRejected:true}));
