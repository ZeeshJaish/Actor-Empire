import type { Player, ScheduledEvent } from '../types';

export type AcquisitionPressureEventFamily = 'WORLD_REACTION' | 'REGULATOR' | 'RIVAL_RETALIATION' | 'TALENT_INSTABILITY';

export interface AcquisitionPressureEventCadence {
    lastAnyAbsoluteWeek: number;
    lastAnyFamily?: AcquisitionPressureEventFamily;
    lastAnyEventType?: string;
    byFamily: Partial<Record<AcquisitionPressureEventFamily, {
        lastAbsoluteWeek: number;
        eventType: string;
    }>>;
}

const GLOBAL_QUIET_WEEKS = 8;
const FAMILY_QUIET_WEEKS = 12;

const getAbsoluteWeek = (player: Pick<Player, 'age' | 'currentWeek'>) => (
    (Math.max(1, Math.round(Number(player.age) || 1)) * 52)
    + Math.max(1, Math.round(Number(player.currentWeek) || 1))
);

const getCadence = (player: Pick<Player, 'flags'>): AcquisitionPressureEventCadence => {
    const raw = player.flags?.acquisitionPressureEventCadence;
    if (!raw || typeof raw !== 'object') {
        return {
            lastAnyAbsoluteWeek: 0,
            byFamily: {},
        };
    }
    return {
        lastAnyAbsoluteWeek: Math.max(0, Math.round(Number(raw.lastAnyAbsoluteWeek || 0))),
        lastAnyFamily: raw.lastAnyFamily,
        lastAnyEventType: raw.lastAnyEventType,
        byFamily: raw.byFamily && typeof raw.byFamily === 'object' ? raw.byFamily : {},
    };
};

export const canQueueAcquisitionPressureEvent = (
    player: Player,
    family: AcquisitionPressureEventFamily,
): boolean => {
    const cadence = getCadence(player);
    const absoluteWeek = getAbsoluteWeek(player);
    if (cadence.lastAnyAbsoluteWeek && absoluteWeek - cadence.lastAnyAbsoluteWeek < GLOBAL_QUIET_WEEKS) {
        return false;
    }

    const familyCadence = cadence.byFamily[family];
    if (familyCadence?.lastAbsoluteWeek && absoluteWeek - familyCadence.lastAbsoluteWeek < FAMILY_QUIET_WEEKS) {
        return false;
    }

    return true;
};

export const markAcquisitionPressureEventQueued = (
    player: Player,
    family: AcquisitionPressureEventFamily,
    eventType: string,
): Record<string, any> => {
    const cadence = getCadence(player);
    const absoluteWeek = getAbsoluteWeek(player);
    return {
        ...player.flags,
        acquisitionPressureEventCadence: {
            ...cadence,
            lastAnyAbsoluteWeek: absoluteWeek,
            lastAnyFamily: family,
            lastAnyEventType: eventType,
            byFamily: {
                ...cadence.byFamily,
                [family]: {
                    lastAbsoluteWeek: absoluteWeek,
                    eventType,
                },
            },
        },
    };
};

export const queueAcquisitionPressureEvent = (
    player: Player,
    existingPendingEvents: ScheduledEvent[],
    event: ScheduledEvent | null,
    family: AcquisitionPressureEventFamily,
    eventType: string | undefined,
    hasExistingEvent: (event: ScheduledEvent) => boolean,
): { pendingEvents: ScheduledEvent[]; flags: Record<string, any>; queued: boolean } => {
    if (!event || !eventType || hasExistingEvent(event) || !canQueueAcquisitionPressureEvent(player, family)) {
        return {
            pendingEvents: existingPendingEvents,
            flags: player.flags,
            queued: false,
        };
    }

    return {
        pendingEvents: [event, ...existingPendingEvents].slice(0, 12),
        flags: markAcquisitionPressureEventQueued(player, family, eventType),
        queued: true,
    };
};
