/**
 * The week's popup for a new incident (#75; Zeesh, 2026-10-30: "koi aadmi game khel raha hai hamara to baar
 * baar to nahi streaming platform mein jayega, phir wahan se status kholega check karne ke liye … us popup ka
 * use karke"). An incident that opens on STATUS at the weekly close is queued as the week's popup, once. It
 * offers STATUS's three answers and the popup's golden one, an ad: repaired now, with no energy and no cash.
 * "Open STATUS" leads to the page. Server incidents that Assisted Management answers never open, so never
 * pop up.
 */
import type { Player, ScheduledEvent } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getStreamingStatusIncidents, type StreamingStatusIncident } from './streamingStatusBoard';
import { repairStreamingIncident, type StreamingIncidentRepairResult, type StreamingIncidentSource } from './streamingIncidentRepair';

export interface StreamingIncidentEventData {
    source: StreamingIncidentSource;
    incidentId: string;
}
export type StreamingIncidentEventChoice = 'AD' | 'ENERGY' | 'FIX' | 'WAIT';

const eventId = (data: StreamingIncidentEventData) => `streaming-incident-${data.source.toLowerCase()}-${data.incidentId}`;

/** The popup's data, or null for any other event */
export const streamingIncidentEventData = (event: Pick<ScheduledEvent, 'type' | 'data'> | undefined): StreamingIncidentEventData | null => {
    const data = event?.type === 'STREAMING_INCIDENT' ? event.data?.streamingIncident : null;
    return data && (data.source === 'CRISIS' || data.source === 'INFRASTRUCTURE') && typeof data.incidentId === 'string' ? data : null;
};

/** Queues each incident that opened on STATUS this week as the week's popup, once */
export const queueStreamingIncidentEvents = (player: Player, absoluteWeek: number | undefined): Player => {
    if (absoluteWeek === undefined || !player.ownedStreamingPlatform) return player;
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return player;
    const queued = new Set((player.pendingEvents || []).map(event => event.id));
    const events: ScheduledEvent[] = getStreamingStatusIncidents(platform, absoluteWeek)
        .filter(item => item.stage === 'OPEN' && item.openedAtWeek === absoluteWeek)
        .flatMap(item => {
            const data: StreamingIncidentEventData = { source: item.source, incidentId: item.id };
            return queued.has(eventId(data)) ? [] : [{
                id: eventId(data),
                week: player.currentWeek,
                type: 'STREAMING_INCIDENT' as const,
                title: item.title,
                data: { streamingIncident: data },
            }];
        });
    return events.length ? { ...player, pendingEvents: [...(player.pendingEvents || []), ...events] } : player;
};

export interface StreamingIncidentEventView {
    service: string;
    incident: StreamingStatusIncident;
    /** still waiting for an answer */
    open: boolean;
}

/** What the popup shows: the incident as STATUS lists it, with its answers while it is open */
export const getStreamingIncidentEventView = (player: Player, data: StreamingIncidentEventData): StreamingIncidentEventView | null => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const incident = getStreamingStatusIncidents(platform, absoluteWeek, Math.max(0, player.energy?.current ?? 0))
        .find(item => item.id === data.incidentId && item.source === data.source);
    if (!incident) return null;
    return { service: platform.identity?.name || 'Your service', incident, open: incident.stage === 'OPEN' && incident.repairPath !== 'WAIT' };
};

/** The popup's answer: STATUS's own repair, or for an ad, Repair now with no energy and no cash */
export const answerStreamingIncidentEvent = (
    player: Player,
    data: StreamingIncidentEventData,
    choice: StreamingIncidentEventChoice,
): StreamingIncidentRepairResult => (
    repairStreamingIncident(player, data.source, data.incidentId, choice === 'AD' ? 'ENERGY' : choice, choice === 'AD' ? 'AD' : undefined)
);
