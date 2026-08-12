import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const lab = readFileSync('views/lifestyle/business/DevelopmentLab.tsx', 'utf8');
const market = readFileSync('views/lifestyle/business/components/DevelopmentLabMarket.tsx', 'utf8');
const scriptWizard = readFileSync('views/lifestyle/business/components/DevelopmentLabScriptWizard.tsx', 'utf8');
const franchiseManager = readFileSync('views/lifestyle/business/components/DevelopmentLabFranchiseManager.tsx', 'utf8');
const universeManager = readFileSync('views/lifestyle/business/components/DevelopmentLabUniverseManager.tsx', 'utf8');
const universeDashboard = readFileSync('views/lifestyle/business/components/DevelopmentLabUniverseDashboard.tsx', 'utf8');
const universeMerch = readFileSync('views/lifestyle/business/components/DevelopmentLabUniverseMerch.tsx', 'utf8');
const formatting = readFileSync('views/lifestyle/business/developmentLabFormatting.ts', 'utf8');
const scriptVault = readFileSync('views/lifestyle/business/components/DevelopmentLabScriptVault.tsx', 'utf8');

assert(lab.includes("import { DevelopmentLabMarket } from './components/DevelopmentLabMarket'"), 'Development Lab should import the extracted Market feature.');
assert(lab.includes("activeTab === 'IP_MARKET' && <DevelopmentLabMarket"), 'The IP Market tab should render the extracted Market feature.');
assert(!lab.includes('const IPMarket: React.FC'), 'The old inline IP Market component should be removed.');
assert(!lab.includes('const SourceMaterialMarket: React.FC'), 'The old inline source-material component should be removed.');

assert(lab.includes('initialRightsMarketOpportunityId={initialRightsMarketOpportunityId}'), 'Message targets should still pass into the Market feature.');
assert(lab.includes('onRightsMarketTargetConsumed={onRightsMarketTargetConsumed}'), 'Consumed message targets should still flow back to the Development Lab coordinator.');
assert(market.includes("setMarketLane('PROPERTIES')"), 'A targeted rights opportunity should still open the Properties lane.');
assert(market.includes('initialOpportunityId={initialRightsMarketOpportunityId}'), 'The selected rights opportunity should still reach Rights Market.');
assert(market.includes('onInitialOpportunityConsumed={onRightsMarketTargetConsumed}'), 'Rights Market should still acknowledge the consumed target.');

assert(market.includes('market={getStudioMarketScripts(market || [])}'), 'The source-material lane should retain studio market filtering.');
assert(market.includes("getScriptMarketDemand(script, currentWeek, marketTrends) >= 1.08"), 'The Trending filter should retain its demand threshold.');
assert(market.includes('disabled={playerMoney < 250000}'), 'Manual market refresh should remain funds-gated.');
assert(market.includes('onBuy(script, cost)'), 'Purchases should still delegate to the Development Lab coordinator.');
assert(lab.includes("status: 'READY' as const, developmentCost: cost"), 'The coordinator should still record acquired scripts as ready with their development cost.');
assert(lab.includes('ipMarket: studioState.ipMarket.filter(s => s.id !== script.id)'), 'A purchased item should still be removed from the current market.');
assert(!market.includes('onUpdatePlayer({'), 'Player mutation should remain outside the extracted presentation feature.');

assert(lab.includes("import { DevelopmentLabScriptWizard } from './components/DevelopmentLabScriptWizard'"), 'Development Lab should import the extracted Script Wizard.');
assert(lab.includes("activeTab === 'NEW_CONCEPT' && <DevelopmentLabScriptWizard"), 'The New Concept tab should render the extracted Script Wizard.');
assert(scriptVault.includes("assignmentMode === 'WIZARD'"), 'The vault rewrite flow should retain its Wizard mode.');
assert(scriptVault.includes('<DevelopmentLabScriptWizard\n                        language={language}\n                        initialScript={script}'), 'Vault rewrites should render the extracted Wizard with the selected script.');
assert(!lab.includes('<ScriptWizard'), 'No stale Script Wizard render should remain in the coordinator.');
assert(!lab.includes('const calculateConceptAttributes'), 'Concept scoring should move with the Script Wizard.');
assert(!lab.includes('const getScriptQuestions'), 'Concept questions should move with the Script Wizard.');

assert(scriptWizard.includes("initialScript ? 'STORY' : 'IDEA'"), 'Existing script rewrites should still begin on the Story step.');
assert(scriptWizard.includes('resolveProjectType(initialScript?.projectType'), 'Project type should still initialize from legacy and current script fields.');
assert(scriptWizard.includes("status: 'CONCEPT'"), 'Completed concepts should retain their concept status.');
assert(scriptWizard.includes('logline: finalPremise'), 'The player premise should still be saved as the script logline.');
assert(scriptWizard.includes('storyCompass: previewStoryCompass'), 'Story compass inference should still be persisted.');
assert(scriptWizard.includes('onComplete(buildScript())'), 'The Wizard should still delegate the completed script to its parent.');
assert(!scriptWizard.includes('onUpdatePlayer'), 'Studio save mutation should remain in the Development Lab coordinator.');
assert(lab.includes('scripts: [...studioState.scripts, { ...script, createdAtWeek: player.currentWeek }]'), 'New concepts should still be added to the studio vault with their creation week.');
assert(lab.includes("setActiveTab('VAULT')"), 'Completing a new concept should still return to the Vault.');
assert(scriptVault.includes('onUpdateScript(updatedScript)'), 'Vault rewrites should still replace the selected script.');
assert(!scriptWizard.includes('const ProgressRail = ()'), 'Wizard presentation components should remain outside the stateful Wizard render.');
assert(scriptWizard.includes('useState(() => initialScript?.logline || generateProceduralLogline())'), 'Procedural premise generation should use lazy state initialization.');

assert(lab.includes("import { DevelopmentLabFranchiseManager } from './components/DevelopmentLabFranchiseManager'"), 'Development Lab should import the extracted Franchise Manager.');
assert(lab.includes("activeTab === 'FRANCHISES' && <DevelopmentLabFranchiseManager"), 'The Franchises tab should render the extracted manager.');
assert(!lab.includes('const FranchiseManager: React.FC'), 'The old inline Franchise Manager should be removed.');
assert(franchiseManager.includes('export interface DevelopmentLabFranchiseManagerProps'), 'The Franchise Manager should expose an explicit parent contract.');
assert(franchiseManager.includes('getInheritedStudioProjects(player, studio.id)'), 'Inherited studio projects should remain part of franchise discovery.');
assert(franchiseManager.includes('getReleaseDisplayPhase(r)'), 'Active release presentation should remain normalized for franchise history.');
assert(franchiseManager.includes("SEQUEL: getContinuationEligibility"), 'Sequel commissioning should retain eligibility checks.');
assert(franchiseManager.includes("SPINOFF: getContinuationEligibility"), 'Spinoff commissioning should retain eligibility checks.');
assert(franchiseManager.includes("FINALE: getContinuationEligibility"), 'Finale commissioning should retain eligibility checks.');
assert(franchiseManager.includes("REBOOT: getContinuationEligibility"), 'Reboot commissioning should retain eligibility checks.');
assert(franchiseManager.includes('const result = createContinuationScript({'), 'Franchise commissioning should still use the canonical continuation builder.');
assert(franchiseManager.includes('onCommission(result.script)'), 'The extracted manager should delegate its completed script to Development Lab.');
assert(franchiseManager.includes('<WorkingTitleDialog'), 'Franchise commissioning should retain editable working titles.');
assert(!franchiseManager.includes('onUpdatePlayer'), 'Player and studio save mutation should remain in Development Lab.');
assert(lab.includes("activeTab === 'FRANCHISES'" ) && lab.includes("setActiveTab('VAULT')"), 'Completed franchise scripts should still return the player to the Vault.');

assert(lab.includes("import { DevelopmentLabUniverseManager } from './components/DevelopmentLabUniverseManager'"), 'Development Lab should import the extracted Universe Manager.');
assert(lab.includes("activeTab === 'UNIVERSE' && <DevelopmentLabUniverseManager"), 'The Universe tab should render the extracted manager.');
assert(!lab.includes('const UniverseManager: React.FC'), 'The old inline Universe Manager should be removed.');
assert(!lab.includes('const UniverseDashboard: React.FC'), 'The old inline Universe Dashboard should be removed.');
assert(!lab.includes('const UniverseMerchView: React.FC'), 'The old inline Universe Merch view should be removed.');
assert(universeManager.includes('export interface DevelopmentLabUniverseManagerProps'), 'Universe Manager should expose an explicit parent contract.');
assert(universeManager.includes('<UniverseDashboard'), 'Universe Manager should delegate selected-universe detail to the Dashboard.');
assert(universeManager.includes('normalizeUniverseMap(player.world?.universes || {})'), 'Universe Manager should normalize world universe reads.');
assert(universeManager.includes('normalizeUniverseForSave({'), 'New universes should remain normalized before saving.');
assert(universeManager.includes('balance: studio.balance - 5000000'), 'Universe registration should retain its studio cost.');
assert(universeDashboard.includes('buildUniverseRoster(universe, universeProjects, player.name)'), 'Universe Dashboard should retain normalized roster construction.');
assert(universeDashboard.includes('retireUniverseForArchive(universe, player.age, player.currentWeek)'), 'Universe retirement should use the canonical lifecycle helper.');
assert(universeDashboard.includes('rebootRetiredUniverse(universe, title'), 'Universe reboot should use the canonical lifecycle helper.');
assert(universeDashboard.includes('onCommission(newScript)'), 'Universe event films should delegate their script to Development Lab.');
assert(universeDashboard.includes('<UniverseMerchView'), 'Universe Dashboard should delegate product operations to the Merch view.');
assert(universeMerch.includes('calculateUniverseProductWeeklyRevenue'), 'Universe Merch should retain weekly revenue projections.');
assert(universeMerch.includes('normalizeUniverseForSave(updatedUniverse, universe.id)'), 'Product launches should normalize the updated universe before saving.');
assert(universeMerch.includes('onUpdatePlayer(updatedPlayer)'), 'Product launches should still commit the synchronized player state.');
assert(formatting.includes('export const formatCurrency'), 'Development Lab modules should share currency presentation logic.');

assert(lab.includes("import { DevelopmentLabScriptVault } from './components/DevelopmentLabScriptVault'"), 'Development Lab should import the extracted Script Vault.');
assert(lab.includes("activeTab === 'VAULT' && <DevelopmentLabScriptVault"), 'The Vault tab should render the extracted Script Vault.');
assert(!lab.includes('const ScriptVault: React.FC'), 'The old inline Script Vault should be removed.');
assert(!lab.includes('const ScriptDoctorPanel: React.FC'), 'The old inline Script Doctor should be removed.');
assert(scriptVault.includes('export interface DevelopmentLabScriptVaultProps'), 'Script Vault should expose an explicit parent contract.');
assert(scriptVault.includes('if (!initialScriptId || !scripts.some'), 'Targeted script deep links should still select an existing vault script.');
assert(scriptVault.includes('initialScript={script}'), 'Vault rewrites should still open the Script Wizard with the selected script.');
assert(scriptVault.includes('<ScriptDoctorPanel'), 'Vault should retain Script Doctor mode.');
assert(scriptVault.includes('onUpdateScript(updatedScript, costType, costAmount)'), 'Script Doctor changes should still delegate through the Vault callback.');
assert(scriptVault.includes('<OwnedIpDossier'), 'Vault should retain the owned-IP dossier.');
assert(scriptVault.includes('<OwnedRightDevelopmentBrief'), 'Vault should retain owned-right development choices.');
assert(scriptVault.includes('<DiscardScriptDialog'), 'Vault should retain guarded script discarding.');
assert(scriptVault.includes('<WorkingTitleDialog'), 'Vault should retain working-title editing.');
assert(scriptVault.includes('onRenew={() => onRenewRight(dossierRight.id)}'), 'Owned-right renewal should still delegate to Development Lab.');
assert(!scriptVault.includes('onUpdatePlayer'), 'Player and studio mutation should remain in Development Lab.');
assert(lab.includes('discardUnreleasedScript('), 'Development Lab should retain canonical script discard mutation.');
assert(lab.includes('renameScriptWorkingTitle(player, studio.id'), 'Development Lab should retain canonical working-title mutation.');

console.log('Development Lab module audit passed: coordinator, Vault, Market, Script Wizard, Franchise, and Universe modules retain routing, save ownership, lifecycle guards, and commissioning behavior.');
