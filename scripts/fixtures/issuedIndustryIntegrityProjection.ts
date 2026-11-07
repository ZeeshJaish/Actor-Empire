import type { Player } from '../../types';
import { stableSaveHash } from '../../services/stableSaveHash';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { compactIndustryIntelligenceState } from '../../services/industryIntelligence/industryIntelligenceState';
import { readNormalizedStudioAiIntelligence } from '../../services/studioAi/studioAiState';
import { readNormalizedPlatformAiIntelligence } from '../../services/platformAi/platformAiState';

/** Frozen issued digest projection before the save-pipeline optimization. */
export const issuedIndustryIntegrityProjection = (player: Player): string => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const acquired = new Set<string>(player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds || []);
    const states = [
        ...Object.values(player.world.studios || {}).map(studio => studio.ai ? readNormalizedStudioAiIntelligence(studio, { absoluteWeek: week }) : undefined),
        ...Object.entries(player.world.platforms || {}).map(([id, platform]) => !platform.ai?.intelligence ? undefined
            : acquired.has(id) ? platform.ai.intelligence : readNormalizedPlatformAiIntelligence(platform, player.id, week)),
    ];
    return stableSaveHash(states.filter(Boolean).map(state => {
        const c = compactIndustryIntelligenceState(state!);
        return { schemaVersion: c.schemaVersion, companyId: c.companyId, companyKind: c.companyKind,
            lastProcessedAbsoluteWeek: c.lastProcessedAbsoluteWeek, nextDueAbsoluteWeek: c.nextDueAbsoluteWeek,
            decisionCycleByLane: c.decisionCycleByLane, momentum: c.momentum,
            averageOutcomeByLane: c.learning.averageOutcomeByLane, capabilityProgress: c.learning.capabilityProgress,
            repetitionFatigue: c.learning.repetitionFatigue, franchiseFatigue: c.learning.franchiseFatigue,
            content: c.content, materialProposalIds: c.proposals.filter(p => p.status !== 'SHADOW').map(p => p.id).sort() };
    }).sort((a, b) => a.companyId.localeCompare(b.companyId)));
};
