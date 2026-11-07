/**
 * #164 (plan §21.13, §21.17): "Your team". Six seats, each run by one executive, each with two or three jobs the
 * player sets to Do it, Ask me or Off, inside money and energy limits. This file is the catalogue and the save
 * normalisation only: no imports from the platform services, so `ownedStreamingPlatform.ts` can call it.
 */
import type {
    OwnedStreamingDelegationMandate,
    OwnedStreamingExecutiveAppointment,
    OwnedStreamingPlatformState,
    StreamingExecutiveStrategy,
    OwnedStreamingTeamCard,
    OwnedStreamingTeamMarket,
    OwnedStreamingTeamReportEntry,
    OwnedStreamingTeamSeat,
    OwnedStreamingTeamState,
    StreamingExecutiveRole,
    StreamingTeamAction,
    StreamingTeamJobId,
    StreamingTeamJobMode,
    StreamingTeamSeatId,
} from '../../types';

export const STREAMING_TEAM_SEATS: StreamingTeamSeatId[] = ['MARKETING', 'CONTENT', 'TECHNOLOGY', 'INTERNATIONAL', 'MONEY', 'TRUST'];

/** Which roles sit in each seat, the first preferred (a COO takes International when no International head is hired). */
export const STREAMING_TEAM_SEAT_ROLES: Record<StreamingTeamSeatId, StreamingExecutiveRole[]> = {
    MARKETING: ['MARKETING_HEAD'],
    CONTENT: ['CHIEF_CONTENT_OFFICER'],
    TECHNOLOGY: ['CTO'],
    INTERNATIONAL: ['INTERNATIONAL_HEAD', 'COO'],
    MONEY: ['CFO'],
    TRUST: ['SECURITY_TRUST_HEAD'],
};

export const STREAMING_TEAM_SEAT_COPY: Record<StreamingTeamSeatId, { label: string; title: string; room: string; line: string; short: string }> = {
    MARKETING: { label: 'Marketing', title: 'Chief Marketing Officer', room: 'Audience', short: 'MKT', line: 'Campaigns for your premieres and your brand' },
    CONTENT: { label: 'Content', title: 'Chief Content Officer', room: 'Content', short: 'CON', line: 'Renewals, catalogue buys and Original pitches' },
    TECHNOLOGY: { label: 'Technology', title: 'Chief Technology Officer', room: 'Platform', short: 'TECH', line: 'Servers before they fill, incidents fixed' },
    INTERNATIONAL: { label: 'International', title: 'International Head', room: 'Markets', short: 'INTL', line: 'Market filings and languages' },
    MONEY: { label: 'Money', title: 'Chief Financial Officer', room: 'Boardroom', short: 'CFO', line: 'The cash floor, offers, prices, guidance' },
    TRUST: { label: 'Trust', title: 'Security & Trust Head', room: 'Platform', short: 'TRUST', line: 'Leaks taken down, trust incidents repaired' },
};

export interface StreamingTeamJobDefinition {
    id: StreamingTeamJobId;
    seatId: StreamingTeamSeatId;
    label: string;
    line: string;
    /** the modes the player can pick; Ask-only jobs never spend by themselves */
    modes: StreamingTeamJobMode[];
    /** shown only when the company is listed */
    publicOnly?: boolean;
}

export const STREAMING_TEAM_JOBS: StreamingTeamJobDefinition[] = [
    { id: 'PREMIERE_PUSH', seatId: 'MARKETING', label: 'Premiere push', line: 'A campaign in each premiere week, in your biggest markets', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'BRAND_CAMPAIGN', seatId: 'MARKETING', label: 'Brand campaign', line: 'One service campaign a quarter', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'CAMPAIGN_RESULTS', seatId: 'MARKETING', label: 'Stop or extend', line: 'Stop a dear campaign, extend a strong one', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'RENEWALS', seatId: 'CONTENT', label: 'Renewals', line: 'Renew strong licences, let weak ones go', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'MARKET_BUYS', seatId: 'CONTENT', label: 'Market buys', line: 'License titles for your weakest shelf', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'ORIGINAL_PITCH', seatId: 'CONTENT', label: 'Original pitch', line: 'One Original idea a quarter, for you to greenlight', modes: ['ASK', 'OFF'] },
    { id: 'CAPACITY', seatId: 'TECHNOLOGY', label: 'Capacity', line: 'Order servers before a region fills', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'INCIDENTS', seatId: 'TECHNOLOGY', label: 'Incidents', line: 'Fix small incidents; big ones always ask', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'FILINGS', seatId: 'INTERNATIONAL', label: 'Filings', line: 'Answer follow-ups and reapply in your markets', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'LANGUAGES', seatId: 'INTERNATIONAL', label: 'Languages', line: "Raise the weakest region's localization", modes: ['DO', 'ASK', 'OFF'] },
    { id: 'OFFERS', seatId: 'MONEY', label: 'Investor offers', line: 'Brings each new offer to you', modes: ['ASK', 'OFF'] },
    { id: 'PRICE_IDEAS', seatId: 'MONEY', label: 'Price ideas', line: 'A price idea each quarter, from what homes will pay', modes: ['ASK', 'OFF'] },
    { id: 'GUIDANCE', seatId: 'MONEY', label: 'Earnings guidance', line: "Sets each quarter's promise to the market", modes: ['DO', 'ASK', 'OFF'], publicOnly: true },
    { id: 'LEAKS', seatId: 'TRUST', label: 'Leaks', line: 'Take leaked titles down', modes: ['DO', 'ASK', 'OFF'] },
    { id: 'TRUST_INCIDENTS', seatId: 'TRUST', label: 'Trust incidents', line: 'Repair account and trust incidents', modes: ['DO', 'ASK', 'OFF'] },
];

export const streamingTeamJobsForSeat = (seatId: StreamingTeamSeatId): StreamingTeamJobDefinition[] => (
    STREAMING_TEAM_JOBS.filter(job => job.seatId === seatId)
);

/** Every job starts at Ask me (plan §21.13): nothing runs by itself until the player says so. */
const defaultMode = (job: StreamingTeamJobDefinition): StreamingTeamJobMode => (job.modes.includes('ASK') ? 'ASK' : job.modes[0]);

/** *(start)* limits, the old delegation mandate where it maps (its $10M weekly campaign authority, its $50M rights bid). */
export const streamingTeamDefaultLimits = (
    seatId: StreamingTeamSeatId,
    delegation?: Partial<OwnedStreamingDelegationMandate> | null,
): Pick<OwnedStreamingTeamSeat, 'weeklyMoney' | 'actionMoney' | 'weeklyEnergy'> => {
    const campaign = Math.max(1_000_000, Math.round(delegation?.weeklyCampaignLimit ?? 10_000_000));
    const rights = Math.max(1_000_000, Math.round(delegation?.maximumRightsBid ?? 50_000_000));
    switch (seatId) {
        case 'MARKETING': return { weeklyMoney: campaign, actionMoney: campaign, weeklyEnergy: 15 };
        case 'CONTENT': return { weeklyMoney: rights, actionMoney: rights, weeklyEnergy: 10 };
        case 'TECHNOLOGY': return { weeklyMoney: 20_000_000, actionMoney: 10_000_000, weeklyEnergy: 0 };
        case 'INTERNATIONAL': return { weeklyMoney: 10_000_000, actionMoney: 5_000_000, weeklyEnergy: 10 };
        case 'MONEY': return { weeklyMoney: 0, actionMoney: 0, weeklyEnergy: 0 };
        case 'TRUST': return { weeklyMoney: 10_000_000, actionMoney: 5_000_000, weeklyEnergy: 0 };
        default: return { weeklyMoney: 0, actionMoney: 0, weeklyEnergy: 0 };
    }
};

/** How far a level lets the player raise a seat's limits (every level shows: one more action and higher limits). */
export const streamingTeamLimitCaps = (seatId: StreamingTeamSeatId, level: number) => {
    const base = { MARKETING: 25_000_000, CONTENT: 60_000_000, TECHNOLOGY: 30_000_000, INTERNATIONAL: 12_000_000, MONEY: 0, TRUST: 12_000_000 }[seatId];
    const factor = Math.max(1, Math.min(5, Math.round(level)));
    return { weeklyMoney: base * (factor + 1), actionMoney: base * factor, weeklyEnergy: 40 };
};

/** One action a week at level 1, up to five at level 5. */
export const streamingTeamActionsPerWeek = (level: number): number => Math.max(1, Math.min(5, Math.round(level || 1)));

export const STREAMING_TEAM_HIRE_ENERGY = 15;
export const STREAMING_TEAM_TRAIN_ENERGY = 10;
/** A card waits this many weeks before it expires. */
export const STREAMING_TEAM_CARD_WEEKS = 2;
/** At most this many waiting cards per seat, so a seat never floods the tray. */
export const STREAMING_TEAM_CARDS_PER_SEAT = 3;
/** #168: after you say no (or let a card expire), the same thing is not asked again for this many weeks */
export const STREAMING_TEAM_QUIET_WEEKS = 8;
const TRAY_LIMIT = 30;
const REPORT_LIMIT = 60;

export const streamingTeamTrainCost = (level: number) => {
    const from = Math.max(1, Math.min(4, Math.round(level)));
    return {
        cash: [2_000_000, 3_000_000, 5_000_000, 8_000_000][from - 1],
        weeks: [2, 2, 3, 4][from - 1],
        energy: STREAMING_TEAM_TRAIN_ENERGY,
    };
};

/** The seat each active executive sits in; anyone left over (a second COO-type role, Product, Advertising) has none. */
export const streamingTeamSeatHolders = (appointments: OwnedStreamingExecutiveAppointment[]) => {
    const active = appointments.filter(item => item.status === 'ACTIVE');
    const holders = new Map<StreamingTeamSeatId, OwnedStreamingExecutiveAppointment>();
    STREAMING_TEAM_SEATS.forEach(seatId => {
        for (const role of STREAMING_TEAM_SEAT_ROLES[seatId]) {
            const holder = active.find(item => item.role === role && ![...holders.values()].includes(item));
            if (holder) { holders.set(seatId, holder); break; }
        }
    });
    const seated = new Set([...holders.values()].map(item => item.id));
    /* #203: someone from your connections runs the company without a chair */
    const leftovers = active.filter(item => !seated.has(item.id) && item.role !== 'CEO');
    return { holders, leftovers };
};

const asRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);
const num = (value: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
};
const text = (value: unknown, fallback: string, max = 240) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback);
const oneOf = <T extends string>(value: unknown, values: readonly T[], fallback: T): T => (
    typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T : fallback
);

const normalizeSeat = (
    seatId: StreamingTeamSeatId,
    value: unknown,
    delegation?: Partial<OwnedStreamingDelegationMandate> | null,
): OwnedStreamingTeamSeat => {
    const source = asRecord(value);
    const defaults = streamingTeamDefaultLimits(seatId, delegation);
    const jobsSource = asRecord(source.jobs);
    const jobs: OwnedStreamingTeamSeat['jobs'] = {};
    streamingTeamJobsForSeat(seatId).forEach(job => {
        jobs[job.id] = oneOf(jobsSource[job.id], job.modes, defaultMode(job));
    });
    const caps = streamingTeamLimitCaps(seatId, 5);
    return {
        seatId,
        jobs,
        weeklyMoney: num(source.weeklyMoney, 0, caps.weeklyMoney, defaults.weeklyMoney),
        actionMoney: num(source.actionMoney, 0, caps.actionMoney, defaults.actionMoney),
        weeklyEnergy: num(source.weeklyEnergy, 0, caps.weeklyEnergy, defaults.weeklyEnergy),
        usageWeek: num(source.usageWeek, 0, Number.MAX_SAFE_INTEGER, 0),
        moneyUsed: num(source.moneyUsed, 0, Number.MAX_SAFE_INTEGER, 0),
        energyUsed: num(source.energyUsed, 0, 10_000, 0),
        actionsUsed: num(source.actionsUsed, 0, 100, 0),
    };
};

const ACTION_KINDS: StreamingTeamAction['kind'][] = [
    'POACH_ANSWER', 'CAMPAIGN_START', 'CAMPAIGN_STOP', 'CAMPAIGN_EXTEND', 'RENEWAL', 'CATALOGUE_SIGN', 'NETWORK_ORDER',
    'INCIDENT_REPAIR', 'MARKET_FOLLOW_UP', 'LOCALIZATION_LEVEL', 'GUIDANCE', 'OPEN_ROOM', 'ORIGINAL_PITCH', 'TITLE_LICENSE', 'PRICE_CHANGE', 'RAISE', 'NOTICE',
];
const JOB_IDS = [...STREAMING_TEAM_JOBS.map(job => job.id), 'RIVAL_CALL', 'RAISE', 'NOTICE'] as const;

const normalizeCard = (value: unknown): OwnedStreamingTeamCard | null => {
    const source = asRecord(value);
    const id = text(source.id, '', 120);
    const action = asRecord(source.action);
    if (!id || !ACTION_KINDS.includes(action.kind as StreamingTeamAction['kind'])) return null;
    const created = num(source.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, 0);
    return {
        id,
        dedupeKey: text(source.dedupeKey, id, 200),
        seatId: oneOf(source.seatId, STREAMING_TEAM_SEATS, 'MARKETING'),
        jobId: oneOf(source.jobId, JOB_IDS, 'RIVAL_CALL'),
        appointmentId: text(source.appointmentId, '', 120),
        createdAtAbsoluteWeek: created,
        expiresAtAbsoluteWeek: num(source.expiresAtAbsoluteWeek, created, Number.MAX_SAFE_INTEGER, created + STREAMING_TEAM_CARD_WEEKS),
        title: text(source.title, 'Waiting for you'),
        detail: text(source.detail, '', 400),
        reason: text(source.reason, '', 400),
        cost: num(source.cost, 0, Number.MAX_SAFE_INTEGER, 0),
        energy: num(source.energy, 0, 10_000, 0),
        action: action as unknown as StreamingTeamAction,
        status: oneOf(source.status, ['WAITING', 'APPROVED', 'DECLINED', 'EXPIRED', 'FAILED'] as const, 'WAITING'),
        resolvedAtAbsoluteWeek: source.resolvedAtAbsoluteWeek === null || source.resolvedAtAbsoluteWeek === undefined
            ? null : num(source.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, created),
    };
};

const normalizeReport = (value: unknown): OwnedStreamingTeamReportEntry | null => {
    const source = asRecord(value);
    const id = text(source.id, '', 120);
    if (!id) return null;
    return {
        id,
        absoluteWeek: num(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER, 0),
        seatId: source.seatId === null ? null : oneOf(source.seatId, STREAMING_TEAM_SEATS, 'MARKETING'),
        appointmentId: typeof source.appointmentId === 'string' ? source.appointmentId.slice(0, 120) : null,
        jobId: oneOf(source.jobId, [...JOB_IDS, 'TEAM'] as const, 'TEAM'),
        kind: oneOf(source.kind, ['DONE', 'ASKED', 'HELD', 'APPROVED', 'DECLINED', 'NOTE'] as const, 'NOTE'),
        title: text(source.title, 'Team note'),
        detail: text(source.detail, '', 400),
        cost: num(source.cost, 0, Number.MAX_SAFE_INTEGER, 0),
        energy: num(source.energy, 0, 10_000, 0),
        ...(source.outcome === 'GREAT' || source.outcome === 'PLAN' || source.outcome === 'SLIP' ? { outcome: source.outcome } : {}),
    };
};

/** Idempotent; an older save gets six seats with every job at Ask me and the mandate's limits. */
export const normalizeStreamingTeamState = (
    value: unknown,
    delegation?: Partial<OwnedStreamingDelegationMandate> | null,
): OwnedStreamingTeamState => {
    const source = asRecord(value);
    const storedSeats = Array.isArray(source.seats) ? source.seats.map(asRecord) : [];
    const tray = (Array.isArray(source.tray) ? source.tray : [])
        .map(normalizeCard).filter((card): card is OwnedStreamingTeamCard => Boolean(card));
    const report = (Array.isArray(source.report) ? source.report : [])
        .map(normalizeReport).filter((entry): entry is OwnedStreamingTeamReportEntry => Boolean(entry));
    const week = (key: string) => (source[key] === null || source[key] === undefined ? null : num(source[key], 0, Number.MAX_SAFE_INTEGER, 0));
    return {
        schemaVersion: 1,
        seats: STREAMING_TEAM_SEATS.map(seatId => normalizeSeat(seatId, storedSeats.find(seat => seat.seatId === seatId), delegation)),
        tray: tray.slice(-TRAY_LIMIT),
        report: report.slice(-REPORT_LIMIT),
        lastRunAbsoluteWeek: week('lastRunAbsoluteWeek'),
        reorganizedAtAbsoluteWeek: week('reorganizedAtAbsoluteWeek'),
        ...(source.market && typeof source.market === 'object' ? { market: normalizeMarket(asRecord(source.market)) } : {}),
    };
};

/* #180: the candidates' market: ids only, each list short */
const ids = (value: unknown, limit: number) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(-limit) : []);
const normalizeMarket = (source: Record<string, unknown>): OwnedStreamingTeamMarket => {
    const bySeat = (value: unknown, limit: number) => {
        const record = asRecord(value);
        return Object.fromEntries(STREAMING_TEAM_SEATS.filter(seatId => Array.isArray(record[seatId])).map(seatId => [seatId, ids(record[seatId], limit)]));
    };
    const refused = asRecord(source.refused);
    const counters = Object.entries(asRecord(source.counters)).slice(-18).flatMap(([id, value]) => {
        const row = asRecord(value);
        return typeof row.set === 'number' ? [[id, {
            set: row.set, weekly: num(row.weekly, 0, 1e9, 0), signing: num(row.signing, 0, 1e10, 0), optionsPercent: typeof row.optionsPercent === 'number' ? Math.max(0, Math.min(50, row.optionsPercent)) : 0,
        }] as const] : [];
    });
    return {
        set: num(source.set, 0, Number.MAX_SAFE_INTEGER, 0),
        shown: bySeat(source.shown, 3),
        seen: bySeat(source.seen, 12),
        refused: Object.fromEntries(Object.entries(refused).filter(([, set]) => typeof set === 'number').slice(-24)) as Record<string, number>,
        ...(counters.length ? { counters: Object.fromEntries(counters) } : {}),
    };
};

export const STREAMING_TEAM_TRAY_LIMIT = TRAY_LIMIT;
export const STREAMING_TEAM_REPORT_LIMIT = REPORT_LIMIT;

/** The cash floor: the weeks of costs the team (and the buyback, #187) keeps in the treasury, by the CFO's strategy
 *  (8–16 weeks; 12 without a CFO). */
export const getStreamingTeamCashFloor = (platform: OwnedStreamingPlatformState) => {
    const { holders } = streamingTeamSeatHolders(platform.leadership.appointments);
    const cfo = holders.get('MONEY') || null;
    const strategyWeeks: Partial<Record<StreamingExecutiveStrategy, number>> = { MARGIN_FIRST: 16, TRUST_FIRST: 14, GROWTH_FIRST: 8, GLOBAL_FIRST: 10 };
    const weeks = cfo ? strategyWeeks[cfo.preferredStrategy] ?? 12 : 12;
    const recent = platform.weeklyHistory.slice(-4).flatMap(snapshot => snapshot.operations ? [snapshot.operations.totalCashCost] : []);
    const weeklyCost = recent.length
        ? recent.reduce((sum, value) => sum + Math.max(0, value), 0) / recent.length
        : Math.max(0, platform.infrastructureSetup?.weeklyOperatingCost || 0);
    return { weeks, weeklyCost: Math.round(weeklyCost), amount: Math.round(weeklyCost * weeks), cfo };
};
