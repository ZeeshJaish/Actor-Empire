import type { IndustryProductionCommitment, NPCStudioState, Player, WorldState } from '../../types';
import { selectIndustryTalentPackage } from '../industryTalentSelection';
import { upsertCanonicalIndustryProduction } from '../industryProductions';
import { reserveProjectTalentBookings } from '../talentBookings';
import { appendStudioAiProductionKey } from './studioAiProductionState';

export interface PackageStudioAiProductionTalentInput {
    player: Player;
    world: WorldState;
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
    absoluteWeek: number;
}

export interface PackageStudioAiProductionTalentResult {
    world: WorldState;
    production: IndustryProductionCommitment;
    changed: boolean;
}

export const packageStudioAiProductionTalent = (input: PackageStudioAiProductionTalentInput): PackageStudioAiProductionTalentResult => {
    const execution = input.production.studioAiExecution;
    if (!execution || input.production.source !== 'STUDIO_INDEPENDENT' || input.studio.ai?.controller !== 'AI'
        || execution.talentSelected || ['CANCELLED', 'RELEASED'].includes(input.production.status)) {
        return { world: input.world, production: input.production, changed: false };
    }
    const selection = selectIndustryTalentPackage({
        player: input.player, companyId: input.studio.id, canonicalProjectId: input.production.canonicalProjectId,
        genre: input.production.genre, productionCalendar: input.production.productionCalendar,
        bookings: input.world.talentBookings, companyTalentSkill: input.studio.ai.competence.talentRelations,
        budgetMillions: input.production.budgetMillions, seedNamespace: input.studio.ai.seed,
    });
    if (!selection) return { world: input.world, production: input.production, changed: false };
    const reservation = reserveProjectTalentBookings({
        bookings: input.world.talentBookings, projectId: input.production.canonicalProjectId,
        projectOwner: 'INDUSTRY_PRODUCTION', producerStudioId: input.production.producerStudioId,
        productionCalendar: input.production.productionCalendar, actorIds: [selection.leadActor.id],
        directorIds: [selection.director.id], allowOverlaps: true,
    });
    const production: IndustryProductionCommitment = {
        ...input.production,
        talentBookingIds: reservation.bookingIds,
        status: input.production.status === 'PLANNED' ? 'PRE_PRODUCTION' : input.production.status,
        studioAiExecution: {
            ...execution, talentSelected: true,
            talent: {
                leadActorId: selection.leadActor.id, leadActorName: selection.leadActor.name,
                directorId: selection.director.id, directorName: selection.director.name,
                packageScore: selection.packageScore, estimatedCostMillions: selection.estimatedCostMillions,
            },
            processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-talent:${input.production.id}`),
        },
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };
    const world = { ...input.world, talentBookings: reservation.bookings, industryProductions: upsertCanonicalIndustryProduction(input.world.industryProductions, production) };
    return { world, production, changed: true };
};
