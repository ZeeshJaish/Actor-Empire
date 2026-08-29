import { readFileSync } from 'node:fs';
import {
  createAssistedNetworkPlan,
  derive,
  type BuildInputs,
  type BuildSel,
} from '../components/streaming-transplant/StreamingBuildoutExperience';
import {
  DEFAULT_STREAMING_MANAGEMENT_POLICY,
  normalizeStreamingInfrastructureManagementPolicy,
} from '../services/streamingInfrastructureManagement';
import { getSuggestedStreamingNetworkPlacements } from '../services/streamingInfrastructure';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const normalized = normalizeStreamingInfrastructureManagementPolicy({
  mode: 'INVALID',
  priority: 'PREMIUM',
  maximumBudget: Number.POSITIVE_INFINITY,
  riskTolerance: 'LOW',
  preferredCityIds: ['bom', 'BOM', 'la', 'nyc', 'ldn', 'par'],
  requireApprovalForExpensiveChanges: false,
  approvalThreshold: 1,
});
assert(normalized.mode === 'ASSISTED', 'Unknown modes must fall back to Assisted management.');
assert(normalized.priority === 'PREMIUM', 'Valid player priorities must survive normalization.');
assert(normalized.maximumBudget === DEFAULT_STREAMING_MANAGEMENT_POLICY.maximumBudget, 'Non-finite budgets must use the safe default.');
assert(normalized.preferredCityIds.join(',') === 'BOM,LA,NYC,LDN', 'Preferred cities must be unique, normalized and capped at four.');
assert(normalized.requireApprovalForExpensiveChanges === false, 'Players must be able to disable approval prompts.');
assert(normalized.approvalThreshold === 250_000, 'Approval thresholds must remain inside the supported range.');

const marketIds = ['US', 'IN', 'GB'];
const markets = marketIds.flatMap(id => {
  const market = getStreamingDayOneMarket(id);
  return market ? [{
    id: market.id,
    country: market.country,
    region: market.regionId,
    audience: market.streamingAudience,
    annualGrowthPercent: market.annualGrowthPercent,
    recommendedCityId: market.recommendedCityId,
    localizationNote: market.localizationNote,
  }] : [];
});
const recommendedPlacements = getSuggestedStreamingNetworkPlacements(marketIds, 1);
const inputs: BuildInputs = {
  treasury: 200_000_000,
  catalogueSpend: 0,
  catalogueTitles: 0,
  originalsSpend: 0,
  originalsCount: 0,
  premiereTitle: 'Opening Signal',
  regions: ['NORTH_AMERICA', 'ASIA', 'EUROPE'],
  coverageRegions: ['NORTH_AMERICA', 'ASIA', 'EUROPE'],
  markets,
  recommendedPlacements,
  homeCityId: null,
  audienceMul: 1,
};
const baseSelection: BuildSel = {
  placements: [],
  facilities: [],
  arch: 'HYBRID',
  doctrine: 'STANDARD',
  campaign: 'NONE',
};
const policy = normalizeStreamingInfrastructureManagementPolicy({
  mode: 'ASSISTED',
  priority: 'BALANCED',
  maximumBudget: 30_000_000,
  riskTolerance: 'MEDIUM',
  preferredCityIds: ['BOM'],
  requireApprovalForExpensiveChanges: true,
  approvalThreshold: 2_000_000,
});
const plan = createAssistedNetworkPlan(baseSelection, inputs, policy);
const repeatedPlan = createAssistedNetworkPlan(baseSelection, inputs, policy);
assert(JSON.stringify(plan) === JSON.stringify(repeatedPlan), 'Assisted planning must be deterministic.');
assert(plan.selection.facilities?.length, 'Assisted planning must draft real Phase 1 facilities.');
assert(plan.selection.placements.some(node => node.cityId === 'BOM'), 'A valid preferred city must receive priority.');
assert(plan.selection.placements.filter(node => node.role === 'CORE_ORIGIN').length === 1, 'Every assisted plan must contain one main library.');
assert(plan.networkBudget <= policy.maximumBudget, 'The assistant must respect a feasible player budget cap.');
assert(plan.requiresApproval, 'Expensive assisted plans must stop for approval when requested.');

const assistedSelection: BuildSel = { ...plan.selection, managementPolicy: policy };
const handsOnSelection: BuildSel = {
  ...plan.selection,
  managementPolicy: { ...policy, mode: 'HANDS_ON' },
};
const assistedDerived = derive(assistedSelection, inputs);
const handsOnDerived = derive(handsOnSelection, inputs);
assert(
  JSON.stringify({
    capex: assistedDerived.capex,
    weekly: assistedDerived.weekly,
    ceiling: assistedDerived.ceiling,
    demand: assistedDerived.demandTotal('LIKELY'),
    coverage: assistedDerived.coverage,
  }) === JSON.stringify({
    capex: handsOnDerived.capex,
    weekly: handsOnDerived.weekly,
    ceiling: handsOnDerived.ceiling,
    demand: handsOnDerived.demandTotal('LIKELY'),
    coverage: handsOnDerived.coverage,
  }),
  'Assisted and Hands-On modes must use identical infrastructure economics and simulation math.',
);

const source = (path: string) => readFileSync(path, 'utf8');
const buildSource = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
const hqSource = source('components/StreamingPlatformHQ.tsx');
const infrastructureSource = source('services/streamingInfrastructure.ts');
const platformSource = source('services/ownedStreamingPlatform.ts');
const managementSource = source('services/streamingInfrastructureManagement.ts');
[
  'HOW YOUR NETWORK GETS MANAGED',
  'HANDS-ON CONTROL ACTIVE',
  'WHAT MATTERS MOST?',
  'MAX NETWORK BUDGET',
  'PREFERRED CITIES',
  'DRAFT MY NETWORK',
  'APPLY THIS DRAFT',
  'ASK BEFORE A BIG UPGRADE',
].forEach(fragment => assert(buildSource.includes(fragment), `Phase 2 UI should include ${fragment}.`));
assert(buildSource.includes('saveManagementPolicy'), 'Management preferences must save without changing the network.');
assert(buildSource.includes('commit(next);') && buildSource.includes('selectionWithFacilities(s, s.facilities)'), 'Applying an assisted plan must use the ordinary facility edit path.');
assert(hqSource.includes('managementPolicy: initialInfrastructureDraft.managementPolicy') && hqSource.includes('managementPolicy: selection.managementPolicy'), 'HQ must resume and save management preferences.');
assert(infrastructureSource.includes('managementPolicy: normalizeStreamingInfrastructureManagementPolicy'), 'Infrastructure drafts and commits must normalize management preferences.');
assert(platformSource.includes('managementPolicy: normalizeStreamingInfrastructureManagementPolicy'), 'Legacy company saves must migrate into the management contract.');
assert(!buildSource.includes('Math.random') && !managementSource.includes('Math.random'), 'Assisted management must never use uncontrolled randomness.');

console.log('EMPIRE+ Assisted and Hands-On Management Phase 2 audit passed.');
