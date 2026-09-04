import type { NPCStudioState, Player, StudioAiController, StudioId } from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    attachNormalizedStudioAiState,
    STUDIO_AI_DECISION_LIMIT,
    STUDIO_AI_EVENT_LIMIT,
} from './studioAiState';

export const resolveStudioAiController = (player: Player, studioId: StudioId): StudioAiController => {
    const businesses = Array.isArray(player.businesses) ? player.businesses : [];
    if (businesses.some(business => business.type === 'PRODUCTION_HOUSE' && business.id === studioId)) return 'PLAYER';

    const cases = Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : [];
    const controlledCase = cases.find((entry: any) => (
        entry?.status === 'ACQUIRED'
        && entry?.closing?.outcome === 'CONTROL'
        && entry?.studioId === studioId
        && businesses.some(business => business.type === 'PRODUCTION_HOUSE' && business.id === entry?.closing?.acquiredBusinessId)
    ));
    if (controlledCase) return 'PLAYER';

    const controlledTakeover = (player.stockTakeovers || []).find(takeover => (
        (takeover.relatedStudioId === studioId || takeover.acquiredBusinessId === studioId)
        && Number(takeover.ownershipPercent || 0) >= 50
    ));
    return controlledTakeover ? 'PLAYER' : 'AI';
};

export const reconcileStudioAiController = (
    studio: NPCStudioState,
    player: Player,
    absoluteWeek: number,
): NPCStudioState => {
    const desired = resolveStudioAiController(player, studio.id);
    const normalized = attachNormalizedStudioAiState(studio, { absoluteWeek });
    const previous = normalized.ai!.controller;
    if (previous === desired) return normalized;

    const handoffKey = `${previous}:${desired}:${studio.id}:${absoluteWeek}`;
    if (normalized.ai!.handoffKeys.includes(handoffKey)) return normalized;
    const verb = desired === 'PLAYER' ? 'Player control began' : 'AI control resumed';
    return {
        ...normalized,
        ai: {
            ...normalized.ai!,
            controller: desired,
            handoffKeys: [...normalized.ai!.handoffKeys, handoffKey].slice(-104),
            events: [...normalized.ai!.events, {
                id: createDeterministicId('studio_ai_handoff_event', handoffKey),
                absoluteWeek,
                type: 'OWNERSHIP_CHANGED' as const,
                summary: `${verb} at ${studio.name}; existing progress and finances were preserved.`,
            }].slice(-STUDIO_AI_EVENT_LIMIT),
            decisions: [...normalized.ai!.decisions, {
                id: createDeterministicId('studio_ai_handoff_decision', handoffKey),
                absoluteWeek,
                type: 'OWNERSHIP_HANDOFF' as const,
                summary: `${previous} to ${desired} control handoff.`,
            }].slice(-STUDIO_AI_DECISION_LIMIT),
        },
    };
};
