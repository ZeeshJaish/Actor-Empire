import assert from 'node:assert/strict';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createDefaultStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { createStreamingCatalogueReadContext } from '../services/streamingContentAvailability';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { getStreamingLaunchProgramView } from '../services/streamingLaunchProgram';

const player = filedMarketFixture();
addStreamingAuditCatalogueTitle(player, getAbsoluteWeek(player.age, player.currentWeek), 'build-reuse-title');
player.ownedStreamingPlatform.catalogProjectIds.push('build-reuse-title');
player.ownedStreamingPlatform.infrastructureSetupDraft = createDefaultStreamingInfrastructureDraft(player);
const context = createStreamingCatalogueReadContext(player);
const coverage = getStreamingOpeningCatalogueView(player, context);
const next = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform,
    infrastructureSetupDraft: { ...player.ownedStreamingPlatform.infrastructureSetupDraft,
        networkPlacements: [{ cityId: 'MUMBAI', role: 'CORE_ORIGIN' as const, racks: 2 }],
    },
} };
// Explicit previous context is a read-only UI optimization for immutable saves.
const nextContext = createStreamingCatalogueReadContext(next, context);
assert.equal(getStreamingOpeningCatalogueView(next, nextContext), coverage,
    'rack drawings must not rebuild the unchanged catalogue and 197-country route coverage');
assert.equal(getStreamingLaunchProgramView(player, context).milestones.find(row => row.id === 'NETWORK_BLUEPRINT')!.complete, false);
assert.equal(getStreamingLaunchProgramView(next, nextContext).milestones.find(row => row.id === 'NETWORK_BLUEPRINT')!.complete, true,
    'network gates must use the new drawing even while catalogue coverage is reused');
for (const changed of [
    { ...next, currentWeek: next.currentWeek + 1 },
    { ...next, world: { ...next.world, streamingRightsContracts: {} } },
    { ...next, ownedStreamingPlatform: { ...next.ownedStreamingPlatform, marketOperations: [] } },
    { ...next, ownedStreamingPlatform: { ...next.ownedStreamingPlatform, futureRightsRevision: 1 } },
]) assert.notEqual(getStreamingOpeningCatalogueView(changed, createStreamingCatalogueReadContext(changed, nextContext)), coverage,
    'week, rights, markets and unknown canonical changes must invalidate the reused coverage');
assert.notEqual(getStreamingOpeningCatalogueView(next), coverage,
    'public default reads must remain fresh and must not install a hidden global cache');
console.log(JSON.stringify({ passed: 8, failed: 0 }));
