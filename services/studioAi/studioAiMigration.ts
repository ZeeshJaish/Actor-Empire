import type { NPCStudioState, NpcVentureState } from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { attachNormalizedStudioAiState, STUDIO_AI_EVENT_LIMIT } from './studioAiState';

const ventureStatus = (venture: NpcVentureState) => venture.status === 'CLOSED' ? 'CLOSED' as const : 'ACTIVE' as const;

const copyVenture = (venture: NpcVentureState): NpcVentureState => ({
    ...venture,
    history: Array.isArray(venture.history) ? venture.history.map(entry => ({ ...entry })) : [],
});

/**
 * Promotes the legacy generated-venture record into the canonical studio registry.
 * The legacy payload remains attached only as a compatibility bridge for the old
 * project scheduler; identity, cash, valuation and reputation come from the studio.
 */
export const migrateNpcVentureToStudio = (
    venture: NpcVentureState,
    existing: NPCStudioState | undefined,
    absoluteWeek: number,
): NPCStudioState => {
    const migrationKey = `npc-venture:${venture.id}`;
    const base: NPCStudioState = {
        ...(existing || {} as NPCStudioState),
        id: venture.id,
        name: venture.name,
        valuation: Math.max(0.01, Number.isFinite(venture.valuation) ? venture.valuation : existing?.valuation || 0.01),
        reputation: Math.max(0, Math.min(100, Number.isFinite(venture.reputation) ? venture.reputation : existing?.reputation || 50)),
        cashReserve: Math.max(0, Number.isFinite(venture.cashReserve) ? venture.cashReserve : existing?.cashReserve || 0),
        recentHits: Math.max(0, venture.hits || 0),
        archetype: venture.archetype,
        projectsReleased: Math.max(0, venture.projectsReleased || 0),
        hits: Math.max(0, venture.hits || 0),
        flops: Math.max(0, venture.flops || 0),
        slateMomentum: existing?.slateMomentum ?? Math.max(0, Math.min(100, venture.hype || 45)),
        lastReleaseTitle: venture.history?.[0]?.title || existing?.lastReleaseTitle,
        lastReleaseWeek: venture.lastProjectWeek || existing?.lastReleaseWeek,
        lastReleaseYear: venture.history?.[0]?.year || existing?.lastReleaseYear,
        lifetimeBoxOffice: existing?.lifetimeBoxOffice ?? venture.history.reduce((sum, project) => sum + Math.max(0, project.revenue || 0), 0),
        lifetimeProfit: existing?.lifetimeProfit ?? venture.history.reduce((sum, project) => sum + (Number.isFinite(project.profit) ? project.profit : 0), 0),
        ownerNpcId: venture.ownerNpcId,
        ownerName: venture.ownerName,
        isNpcVenture: true,
    };
    const normalized = attachNormalizedStudioAiState(base, {
        absoluteWeek,
        controller: existing?.ai?.controller || 'AI',
        status: ventureStatus(venture),
    });
    const alreadyMigrated = normalized.ai!.migrationKeys.includes(migrationKey);
    normalized.ai = {
        ...normalized.ai!,
        origin: 'GENERATED',
        legacyVenture: copyVenture({
            ...venture,
            cashReserve: normalized.cashReserve,
            valuation: normalized.valuation,
            reputation: normalized.reputation,
        }),
        migrationKeys: alreadyMigrated
            ? normalized.ai!.migrationKeys
            : [...normalized.ai!.migrationKeys, migrationKey],
        events: alreadyMigrated
            ? normalized.ai!.events
            : [...normalized.ai!.events, {
                id: createDeterministicId('studio_ai_migration', venture.id),
                absoluteWeek,
                type: 'MIGRATED' as const,
                summary: `${venture.name} joined the canonical studio simulation.`,
            }].slice(-STUDIO_AI_EVENT_LIMIT),
    };
    return normalized;
};

/** Read-only projection for callers that still consume NpcVentureState. */
export const projectStudioToNpcVenture = (studio: NPCStudioState): NpcVentureState | null => {
    const legacy = studio.ai?.legacyVenture;
    if (!studio.isNpcVenture || !legacy) return null;
    return {
        ...copyVenture(legacy),
        id: studio.id,
        name: studio.name,
        ownerNpcId: studio.ownerNpcId || legacy.ownerNpcId,
        ownerName: studio.ownerName || legacy.ownerName,
        status: studio.ai?.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE',
        valuation: studio.valuation,
        cashReserve: studio.cashReserve,
        reputation: studio.reputation,
        projectsReleased: studio.projectsReleased || legacy.projectsReleased,
        hits: studio.hits || legacy.hits,
        flops: studio.flops || legacy.flops,
    };
};
