import type {
    Commitment,
    IndustryTalentBooking,
    IndustryTalentBookingOwner,
    IndustryTalentBookingRole,
    PlatformId,
    ProductionCalendar,
    StudioId,
} from '../types';
import { normalizeProductionCalendar } from './productionCalendar';

const VIRTUAL_TALENT_IDS = new Set(['PLAYER_SELF', 'STUDIO_STAFF', 'UNKNOWN']);
const BOOKING_ROLES = new Set<IndustryTalentBookingRole>(['ACTOR', 'DIRECTOR']);
const BOOKING_OWNERS = new Set<IndustryTalentBookingOwner>(['PLAYER_COMMITMENT', 'INDUSTRY_PRODUCTION']);
const BOOKING_STATUSES = new Set<IndustryTalentBooking['status']>(['BOOKED', 'CANCELLED', 'RELEASED']);

const asSafeWeek = (value: unknown): number | null => {
    const numeric = Math.round(Number(value));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
};

export const isVirtualTalentId = (npcId?: string | null): boolean => (
    !npcId || VIRTUAL_TALENT_IDS.has(npcId)
);

export const createTalentBookingId = (
    projectId: string,
    role: IndustryTalentBookingRole,
    npcId: string,
): string => `talent:${projectId}:${role}:${npcId}`;

export const normalizeTalentBookings = (value: unknown): IndustryTalentBooking[] => {
    if (!Array.isArray(value)) return [];
    const byId = new Map<string, IndustryTalentBooking>();
    value.forEach(raw => {
        if (!raw || typeof raw !== 'object') return;
        const candidate = raw as Partial<IndustryTalentBooking>;
        const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
        const npcId = typeof candidate.npcId === 'string' ? candidate.npcId.trim() : '';
        const projectId = typeof candidate.projectId === 'string' ? candidate.projectId.trim() : '';
        const producerStudioId = typeof candidate.producerStudioId === 'string' ? candidate.producerStudioId.trim() : '';
        if (!id || !npcId || isVirtualTalentId(npcId) || !projectId || !producerStudioId) return;
        if (!candidate.role || !BOOKING_ROLES.has(candidate.role)) return;
        if (!candidate.projectOwner || !BOOKING_OWNERS.has(candidate.projectOwner)) return;
        const start = asSafeWeek(candidate.startAbsoluteWeek);
        const end = asSafeWeek(candidate.endAbsoluteWeek);
        if (start === null || end === null) return;
        const status = candidate.status && BOOKING_STATUSES.has(candidate.status) ? candidate.status : 'BOOKED';
        const cancelledAt = asSafeWeek(candidate.cancelledAtAbsoluteWeek);
        const releasedAt = asSafeWeek(candidate.releasedAtAbsoluteWeek);
        const normalized: IndustryTalentBooking = {
            id,
            npcId,
            role: candidate.role,
            projectId,
            projectOwner: candidate.projectOwner,
            producerStudioId: producerStudioId as StudioId,
            ...(candidate.commissioningPlatformId ? { commissioningPlatformId: candidate.commissioningPlatformId } : {}),
            startAbsoluteWeek: Math.min(start, end),
            endAbsoluteWeek: Math.max(start, end),
            status,
            ...(cancelledAt !== null ? { cancelledAtAbsoluteWeek: cancelledAt } : {}),
            ...(releasedAt !== null ? { releasedAtAbsoluteWeek: releasedAt } : {}),
        };
        if (!byId.has(id)) byId.set(id, normalized);
    });
    return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
};

export interface TalentBookingWindow {
    startAbsoluteWeek: number;
    endAbsoluteWeek: number;
    excludeProjectId?: string;
}

export const getTalentConflicts = (
    bookings: readonly IndustryTalentBooking[] | undefined,
    input: TalentBookingWindow & { npcId: string },
): IndustryTalentBooking[] => {
    if (isVirtualTalentId(input.npcId)) return [];
    const start = Math.min(input.startAbsoluteWeek, input.endAbsoluteWeek);
    const end = Math.max(input.startAbsoluteWeek, input.endAbsoluteWeek);
    return normalizeTalentBookings(bookings).filter(booking => (
        booking.status === 'BOOKED'
        && booking.npcId === input.npcId
        && booking.projectId !== input.excludeProjectId
        && booking.startAbsoluteWeek <= end
        && booking.endAbsoluteWeek >= start
    ));
};

export const getAvailableTalentForWindow = <T extends { id: string }>(
    candidates: readonly T[],
    bookings: readonly IndustryTalentBooking[] | undefined,
    window: TalentBookingWindow,
): T[] => candidates.filter(candidate => (
    getTalentConflicts(bookings, { ...window, npcId: candidate.id }).length === 0
));

export type TalentWithBookingAvailability<T> = T & {
    isBookingUnavailable: boolean;
    bookingConflictLabel?: string;
};

const formatProjectId = (projectId: string): string => projectId
    .replace(/^(project|proj)[_:-]?/i, 'Project ')
    .replace(/[_:-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();

export const markTalentBookingAvailability = <T extends { id: string }>(
    candidates: readonly T[],
    bookings: readonly IndustryTalentBooking[] | undefined,
    window: TalentBookingWindow,
): TalentWithBookingAvailability<T>[] => candidates.map(candidate => {
    const conflict = getTalentConflicts(bookings, { ...window, npcId: candidate.id })[0];
    return {
        ...candidate,
        isBookingUnavailable: Boolean(conflict),
        ...(conflict ? { bookingConflictLabel: `Booked on ${formatProjectId(conflict.projectId)}` } : {}),
    };
});

export interface ReserveProjectTalentBookingsInput {
    bookings: readonly IndustryTalentBooking[] | undefined;
    projectId: string;
    projectOwner: IndustryTalentBookingOwner;
    producerStudioId: StudioId;
    commissioningPlatformId?: PlatformId;
    productionCalendar: ProductionCalendar;
    actorIds: readonly (string | null | undefined)[];
    directorIds: readonly (string | null | undefined)[];
    /** Phase 3 records NPC workload but does not treat overlapping projects as a hard block. */
    allowOverlaps?: boolean;
}

export interface TalentBookingReservationResult {
    bookings: IndustryTalentBooking[];
    bookingIds: string[];
    conflicts: IndustryTalentBooking[];
}

const uniqueRealIds = (ids: readonly (string | null | undefined)[]): string[] => (
    [...new Set(ids.filter((id): id is string => !isVirtualTalentId(id)))]
);

export const reserveProjectTalentBookings = (
    input: ReserveProjectTalentBookingsInput,
): TalentBookingReservationResult => {
    const bookings = normalizeTalentBookings(input.bookings);
    const calendar = normalizeProductionCalendar(input.productionCalendar);
    if (!calendar || !Number.isFinite(calendar.startedAbsoluteWeek)) {
        return { bookings, bookingIds: [], conflicts: [] };
    }
    const started = Math.round(calendar.startedAbsoluteWeek!);
    const actorStart = started + calendar.preProductionWeeks;
    const actorEnd = actorStart + calendar.productionWeeks - 1;
    const directorEnd = started + calendar.totalWeeks - 1;
    const requests = [
        ...uniqueRealIds(input.actorIds).map(npcId => ({ role: 'ACTOR' as const, npcId, start: actorStart, end: actorEnd })),
        ...uniqueRealIds(input.directorIds).map(npcId => ({ role: 'DIRECTOR' as const, npcId, start: started, end: directorEnd })),
    ];
    const conflicts = input.allowOverlaps ? [] : requests.flatMap(request => getTalentConflicts(bookings, {
        npcId: request.npcId,
        startAbsoluteWeek: request.start,
        endAbsoluteWeek: request.end,
        excludeProjectId: input.projectId,
    }));
    const uniqueConflicts = normalizeTalentBookings(conflicts);
    if (uniqueConflicts.length > 0) return { bookings, bookingIds: [], conflicts: uniqueConflicts };

    const additions: IndustryTalentBooking[] = requests.map(request => ({
        id: createTalentBookingId(input.projectId, request.role, request.npcId),
        npcId: request.npcId,
        role: request.role,
        projectId: input.projectId,
        projectOwner: input.projectOwner,
        producerStudioId: input.producerStudioId,
        ...(input.commissioningPlatformId ? { commissioningPlatformId: input.commissioningPlatformId } : {}),
        startAbsoluteWeek: request.start,
        endAbsoluteWeek: request.end,
        status: 'BOOKED',
    }));
    const existingIds = new Set(bookings.map(booking => booking.id));
    return {
        bookings: normalizeTalentBookings([...bookings, ...additions.filter(booking => !existingIds.has(booking.id))]),
        bookingIds: additions.map(booking => booking.id),
        conflicts: [],
    };
};

const changeProjectBookingStatus = (
    bookings: readonly IndustryTalentBooking[] | undefined,
    projectId: string,
    status: 'CANCELLED' | 'RELEASED',
    absoluteWeek: number,
): IndustryTalentBooking[] => normalizeTalentBookings(bookings).map(booking => {
    if (booking.projectId !== projectId || booking.status !== 'BOOKED') return booking;
    return status === 'CANCELLED'
        ? { ...booking, status, cancelledAtAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)) }
        : { ...booking, status, releasedAtAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)) };
});

export const cancelProjectTalentBookings = (
    bookings: readonly IndustryTalentBooking[] | undefined,
    projectId: string,
    absoluteWeek: number,
): IndustryTalentBooking[] => changeProjectBookingStatus(bookings, projectId, 'CANCELLED', absoluteWeek);

export const releaseProjectTalentBookings = (
    bookings: readonly IndustryTalentBooking[] | undefined,
    projectId: string,
    absoluteWeek: number,
): IndustryTalentBooking[] => changeProjectBookingStatus(bookings, projectId, 'RELEASED', absoluteWeek);

export const extendProjectTalentBookings = (
    bookings: readonly IndustryTalentBooking[] | undefined,
    projectId: string,
    endAbsoluteWeek: number,
): IndustryTalentBooking[] => normalizeTalentBookings(bookings).map(booking => (
    booking.projectId === projectId && booking.status === 'BOOKED'
        ? { ...booking, endAbsoluteWeek: Math.max(booking.endAbsoluteWeek, Math.round(endAbsoluteWeek)) }
        : booking
));

const ACTIVE_PLAYER_PHASES = new Set<Commitment['projectPhase']>(['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION']);

export const backfillActivePlayerCommitmentTalentBookings = (
    bookings: readonly IndustryTalentBooking[] | undefined,
    commitments: readonly Commitment[] | undefined,
): IndustryTalentBooking[] => {
    let next = normalizeTalentBookings(bookings);
    (commitments || []).forEach(commitment => {
        if (!ACTIVE_PLAYER_PHASES.has(commitment.projectPhase)) return;
        const calendar = normalizeProductionCalendar(commitment.productionCalendar);
        const studioId = commitment.projectDetails?.studioId;
        if (!calendar || !Number.isFinite(calendar.startedAbsoluteWeek) || !studioId) return;
        const reservation = reserveProjectTalentBookings({
            bookings: next,
            projectId: commitment.id,
            projectOwner: 'PLAYER_COMMITMENT',
            producerStudioId: studioId,
            productionCalendar: calendar,
            actorIds: (commitment.projectDetails?.castList || []).map(member => member.actorId || member.npcId || member.id),
            directorIds: [commitment.projectDetails?.directorId || commitment.projectDetails?.director?.id],
        });
        if (reservation.conflicts.length === 0) next = reservation.bookings;
    });
    return next;
};
