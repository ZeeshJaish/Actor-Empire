import assert from 'node:assert/strict';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { processGameWeek } from '../services/gameLoop';
import { resolveStreamingProductionReadiness } from '../services/streamingProductionReadiness';
import { compactOwnedStreamingPlatformForPersistence } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';

const player = createC6QaCareer();
const commission = player.ownedStreamingPlatform.originalCommissions[0];
const projectId = commission.canonicalProjectId!;
player.commitments = [];
player.activeReleases = [{
  id: projectId, name: commission.title, type: 'MOVIE', roleType: 'LEAD',
  status: 'FINISHED', distributionPhase: 'STREAMING', weekNum: 1,
  budget: 20_000_000, totalGross: 0, weeklyGross: [], imdbRating: 7.5,
  projectDetails: { title: commission.title, type: 'MOVIE', genre: 'DRAMA', budgetTier: 'MEDIUM',
    hiddenStats: { ownedStreamingOriginal: true, qualityScore: 75 }, castList: [] },
} as any];
const next = (await processGameWeek(player)).player;
assert.equal(next.activeReleases.some(project => project.id === projectId), false);
assert.equal(next.pastProjects.filter(project => project.id === projectId).length, 1,
  'The real Original release must be retained when there is no external streaming state.');
assert.equal(resolveStreamingProductionReadiness(next, projectId, commission).status, 'RELEASED');
const again = (await processGameWeek(next)).player;
assert.equal(again.pastProjects.filter(project => project.id === projectId).length, 1);
assert.equal(again.ownedStreamingPlatform.originalCommissions[0].productionFundingApplied, commission.productionFundingApplied);
const week = getAbsoluteWeek(player.age, player.currentWeek);
for (const type of ['ORIGINAL_LOCALIZATION_COMMITTED', 'TITLE_LOCALIZATION_COMMITTED', 'TITLE_LOCALIZATION_READY', 'ORIGINAL_RELEASE_AUTHORIZED', 'ORIGINAL_LIFECYCLE_DECIDED'] as const) {
  const platform = structuredClone(player.ownedStreamingPlatform);
  platform.eventLedger.push({ id: `audit-${type}`, idempotencyKey: `audit-${type}`, absoluteWeek: week,
    type, summary: type, source: 'PLAYER_ACTION', metadata: { projectId, commissionId: commission.id } });
  const persisted = compactOwnedStreamingPlatformForPersistence(platform, player.id);
  assert.equal(persisted.eventLedger.find(event => event.idempotencyKey === `audit-${type}`)?.type, type);
}
console.log('Original release handoff, archive deduplication, funding and ledger persistence passed.');
