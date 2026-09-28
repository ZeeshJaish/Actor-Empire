import type { IndustryProductionCommitment, NPCStudioState, Player, WorldState } from '../../types';
import { selectIndustryTalentPackage } from '../industryTalentSelection';
import { upsertCanonicalIndustryProduction } from '../industryProductions';
import { reserveProjectTalentBookings } from '../talentBookings';
import { appendStudioAiProductionKey } from './studioAiProductionState';
import { WRITER_NPC_LIBRARY } from '../writerNpcLibrary';
import { createDeterministicRng } from '../deterministicRandom';
import { creditTalentProject } from '../talentCareer';

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
    const languageName = execution.fingerprintSnapshot?.originalLanguage?.toLowerCase()
        || input.studio.ai.intelligence?.content.selectedFingerprints.find(item => item.id === execution.fingerprintId)?.originalLanguage?.toLowerCase()
        || '';
    const languageCode = ({ hindi: 'hi', english: 'en', japanese: 'ja', bengali: 'bn', spanish: 'es',
        french: 'fr', italian: 'it', urdu: 'ur' } as Record<string, string>)[languageName] || languageName.slice(0, 2);
    const genreWriters = WRITER_NPC_LIBRARY.filter(candidate => candidate.genres.includes(input.production.genre));
    const languageWriters = genreWriters.filter(candidate => candidate.languages.includes(languageCode));
    const writerPool = languageWriters.length ? languageWriters : genreWriters.length ? genreWriters : WRITER_NPC_LIBRARY;
    const writerRng = createDeterministicRng(`${input.studio.ai.seed}:writer:${input.production.id}`);
    const writer = writerPool[Math.floor(writerRng() * writerPool.length)];
    const writerFee = Math.round(selection.estimatedCostMillions * 0.20 * 1000) / 1000;
    const directorFee = Math.round(selection.estimatedCostMillions * 0.30 * 1000) / 1000;
    const actorFee = Math.round((selection.estimatedCostMillions - directorFee - writerFee) * 1000) / 1000;
    const actorBackendPoints = selection.packageScore >= 90 ? 2 : selection.packageScore >= 78 ? 1 : 0;
    const directorBackendPoints = selection.packageScore >= 85 ? 1 : 0;
    const writerBackendPoints = writer.writerSkill >= 85 ? 1 : 0;
    const participation = {
        schemaVersion: 1 as const,
        contracts: [
            { role: 'ACTOR' as const, roleId: 'lead_actor', talentId: selection.leadActor.id, talentName: selection.leadActor.name, upfrontFee: actorFee * 1_000_000, backendPoints: actorBackendPoints, receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS' as const },
            { role: 'DIRECTOR' as const, roleId: 'director', talentId: selection.director.id, talentName: selection.director.name, upfrontFee: directorFee * 1_000_000, backendPoints: directorBackendPoints, receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS' as const },
            { role: 'WRITER' as const, roleId: 'writer', talentId: writer.id, talentName: writer.name, upfrontFee: writerFee * 1_000_000, backendPoints: writerBackendPoints, receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS' as const },
        ].filter(contract => contract.backendPoints > 0)
            .map(contract => ({ ...contract, contractId: `studio_ai:${input.production.id}:${contract.role}:${contract.talentId}` })),
        processedReceiptKeys: [],
    };
    const reservation = reserveProjectTalentBookings({
        bookings: input.world.talentBookings, projectId: input.production.canonicalProjectId,
        projectOwner: 'INDUSTRY_PRODUCTION', producerStudioId: input.production.producerStudioId,
        productionCalendar: input.production.productionCalendar, actorIds: [selection.leadActor.id],
        directorIds: [selection.director.id], writerIds: [writer.id], allowOverlaps: true,
    });
    const production: IndustryProductionCommitment = {
        ...input.production,
        talentBookingIds: reservation.bookingIds,
        writerSource: 'NPC_WRITER', writerId: writer.id, writerName: writer.name, writerSkill: writer.writerSkill,
        status: input.production.status === 'PLANNED' ? 'PRE_PRODUCTION' : input.production.status,
        studioAiExecution: {
            ...execution, talentSelected: true,
            talent: {
                leadActorId: selection.leadActor.id, leadActorName: selection.leadActor.name,
                directorId: selection.director.id, directorName: selection.director.name,
                packageScore: selection.packageScore, estimatedCostMillions: selection.estimatedCostMillions,
                writerId: writer.id, writerName: writer.name,
                upfrontFeesMillions: { actor: actorFee, director: directorFee, writer: writerFee },
                talentParticipation: participation,
            },
            processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-talent:${input.production.id}`),
        },
        updatedAtAbsoluteWeek: input.absoluteWeek,
    };
    const world = creditTalentProject({ ...input.world, talentBookings: reservation.bookings, industryProductions: upsertCanonicalIndustryProduction(input.world.industryProductions, production) },
        production.canonicalProjectId, [
            { talentId: selection.leadActor.id, talentName: selection.leadActor.name, role: 'ACTOR' },
            { talentId: selection.director.id, talentName: selection.director.name, role: 'DIRECTOR' },
            { talentId: writer.id, talentName: writer.name, role: 'WRITER' },
        ], `studio_ai_booking:${production.id}`, input.absoluteWeek);
    return { world, production, changed: true };
};
