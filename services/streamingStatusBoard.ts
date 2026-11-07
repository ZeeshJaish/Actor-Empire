/**
 * The STATUS page's health board and the one incident list (codex-handoff/plans/platform-tech-plan.md
 * §7, Phase 3 #49):
 *   "STATUS is the health board of everything running: servers by region and provider; each tech
 *    that is live; products. Each shows working, slow or down."
 *   "One incident list. Crises and infrastructure incidents are shown together, and both reach the
 *    HQ alert."
 *
 * Read-only: what the two incident systems saved (crisisSecurity.crises and
 * crisisSecurity.infrastructureOperations.incidents), the network's facilities, the tech tree, the
 * plans and the product lines. Each incident's damage is what the weekly close applies to it: its
 * harm to viewing and churn (streamingIncidentHarm, #51), then getStreamingCrisisWeeklyEffects,
 * getStreamingInfrastructureOperationsEffects and the tech-health charge in streamingWeeklyLoop.ts.
 * Nothing here saves or changes the engine.
 */
import type {
    BoxOfficeRegionId,
    OwnedStreamingCrisis,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingPlatformState,
    Player,
    StreamingCrisisSeverity,
    StreamingCrisisType,
    StreamingInfrastructureIncidentType,
    StreamingTechGroupId,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getProductionLocation } from './productionLocations';
import { getStreamingCrisisWeeklyEffects } from './streamingCrisisSecurity';
import { getStreamingInfrastructureOperations, getStreamingInfrastructureOperationsEffects } from './streamingInfrastructureOperations';
import { getStreamingServerSite } from './streamingServerSites';
import { getStreamingCloudProvider } from './streamingCloudProviders';
import {
    STREAMING_TECH_GROUPS,
    getStreamingTechGroupLadder,
    getStreamingTechVersionNames,
    resolveStreamingPlatformTechDebt,
    resolveStreamingTechTree,
    streamingTechVersion,
} from './streamingTechTreeCatalogue';
import { getStreamingViewerPlans, streamingNetworkPictureTier, type StreamingViewerResolution } from './streamingViewerQuality';
import {
    getStreamingIncidentRepairOptions, streamingIncidentIsTakedown, streamingIncidentSpeed, streamingIncidentWaitEndsAt, type StreamingIncidentRepairOption,
} from './streamingIncidentRepair';
import { getStreamingIncidentHarm } from './streamingIncidentHarm';

export type StreamingStatusLevel = 'WORKING' | 'SLOW' | 'DOWN';
export type StreamingStatusIncidentStage = 'OPEN' | 'REPAIRING' | 'RESOLVED';
/** The four service components the status strips show. */
export type StreamingServiceComponentId = 'DELIVERY' | 'ACCOUNTS' | 'RECOMMENDATIONS' | 'RIGHTS';

export interface StreamingStatusIncident {
    /** the crisis's or the infrastructure incident's id */
    id: string;
    source: 'CRISIS' | 'INFRASTRUCTURE';
    title: string;
    /** what kind of incident: "Traffic spike", "Platform outage" */
    kind: string;
    /** where a server incident is: "Mumbai · Atlas Compute" */
    where: string | null;
    severity: StreamingCrisisSeverity;
    /** §7's major incident: MAJOR or CRITICAL; MINOR and SERIOUS are minor */
    major: boolean;
    /** OPEN: nobody has responded (full damage) · REPAIRING: a response is under way · RESOLVED */
    stage: StreamingStatusIncidentStage;
    openedAtWeek: number;
    /** weeks since it opened; once resolved, how long it ran */
    weeks: number;
    /** while repairing: the week the repair finishes, and the weeks left until then */
    readyAtWeek: number | null;
    weeksLeft: number | null;
    resolvedAtWeek: number | null;
    affectedViewers: number;
    /** what it does each week while open, as the weekly close applies it: "Playback −1.4 points" */
    damage: string[];
    cause: string;
    /** a line on it: its detail while open, its outcome once resolved */
    note: string;
    /** the service components it turns slow or down */
    hits: StreamingServiceComponentId[];
    /** the server region it is in (a server incident) */
    region: BoxOfficeRegionId | null;
    /** how STATUS answered it (#50): repaired now, a cash fix, waiting it out; null when STATUS did not */
    repairPath: 'ENERGY' | 'FIX' | 'WAIT' | null;
    /** still open: the weeks until it runs its course if nobody repairs it */
    weeksToRunItsCourse: number | null;
    /** still open: Repair now, Fix and Wait, priced for it against the player's energy and treasury (#50) */
    repairs?: StreamingIncidentRepairOption[];
    /** a title on pirate sites (#55): its answers read as takedowns, not repairs */
    takedown?: boolean;
    /** #169: the executive who answered it ("Fixed by Marcus"), when the team did */
    repairedBy?: string;
}

/** #101: one week of a status line: how it ran (NONE: not built, or not running yet) */
export type StreamingStatusDay = StreamingStatusLevel | 'NONE';
/** #101: the weeks a server or tech line shows, as the service strips do */
export const STREAMING_STATUS_LINE_WEEKS = 30;
/** #102 (Zeesh: "zyada se zyada ek saal ka incident"): the weeks the incident history goes back */
export const STREAMING_STATUS_HISTORY_WEEKS = 52;

/**
 * #102 (Zeesh asked why the lines began grey: the weeks before the launch): the weeks a line shows, oldest first: the
 * last STREAMING_STATUS_LINE_WEEKS, from the launch while the service is younger than that. The service strips read
 * the same weeks.
 */
export const streamingStatusLineWeeks = (absoluteWeek: number, launchedAt: number | null): number[] => {
    const start = Math.min(absoluteWeek, Math.max(absoluteWeek - STREAMING_STATUS_LINE_WEEKS + 1, launchedAt ?? Number.NEGATIVE_INFINITY));
    return Array.from({ length: absoluteWeek - start + 1 }, (_, index) => start + index);
};

export interface StreamingStatusRow {
    id: string;
    label: string;
    detail: string;
    /** OFF: not running (a paused product) */
    status: StreamingStatusLevel | 'OFF';
    /** why it is slow or down: "Mumbai: traffic spike, 24% of capacity lost" */
    reason?: string;
    /** the open incident behind it */
    incidentId?: string;
    /** #101 (Zeesh: "city wise … ek line server ka … server yellow kahin gir raha to samajh aa jayega"): the weeks of
        streamingStatusLineWeeks, from the incidents both systems keep */
    history?: StreamingStatusDay[];
    /** #101: a region's servers, a line a city */
    cities?: StreamingStatusRow[];
}

/** #102 (Zeesh: "tech ka ek pura row ho jaye simple single … same goes with servers, ek single row ho"): a section as one line */
export interface StreamingStatusOverview {
    /** "All 52 cities working", "1 city down · 2 slow", "Apps and devices down · 1 more" */
    label: string;
    status: StreamingStatusLevel;
    /** when it is not working: the worst row's reason */
    reason?: string;
    /** each week, the worst of its rows */
    history: StreamingStatusDay[];
}

export interface StreamingStatusSection {
    id: 'SERVERS' | 'TECH' | 'PRODUCTS';
    title: string;
    note?: string;
    rows: StreamingStatusRow[];
    /** shown when the section has no rows */
    empty: string;
    /** #102: the servers and the tech, a line each, opening to their rows */
    overview?: StreamingStatusOverview;
}

export interface StreamingStatusBoard {
    live: boolean;
    /** the worst of the service, the servers, the tech and the products */
    overall: StreamingStatusLevel;
    headline: string;
    line: string;
    /** open and repairing incidents, the worst first */
    open: StreamingStatusIncident[];
    /** the service strips' state, from the open incidents and the night's load */
    service: Record<StreamingServiceComponentId, StreamingStatusLevel>;
    sections: StreamingStatusSection[];
    /** #102: the lines start at the launch (the service is younger than STREAMING_STATUS_LINE_WEEKS weeks) */
    lineFromLaunch: boolean;
    /** resolved incidents from both systems in the last STREAMING_STATUS_HISTORY_WEEKS weeks, newest first */
    history: StreamingStatusIncident[];
}

export const CRISIS_KIND: Record<StreamingCrisisType, string> = {
    PLATFORM_OUTAGE: 'Platform outage',
    ACCOUNT_BREACH: 'Account breach',
    CONTENT_LEAK: 'Title piracy',
    RECOMMENDATION_BACKLASH: 'Recommendation backlash',
    RIGHTS_COMPLIANCE: 'Rights problem',
    EMPLOYEE_ALLEGATION: 'Staff allegation',
    APP_CRASH: 'App crash',
    FEATURE_BROKEN: 'Feature broken',
    SLOW_STREAMING: 'Slow streaming',
};
const CRISIS_HITS: Record<StreamingCrisisType, StreamingServiceComponentId[]> = {
    PLATFORM_OUTAGE: ['DELIVERY'],
    ACCOUNT_BREACH: ['ACCOUNTS'],
    CONTENT_LEAK: ['RIGHTS'],
    RECOMMENDATION_BACKLASH: ['RECOMMENDATIONS'],
    RIGHTS_COMPLIANCE: ['RIGHTS'],
    EMPLOYEE_ALLEGATION: [],
    APP_CRASH: ['DELIVERY'],
    FEATURE_BROKEN: [],
    SLOW_STREAMING: ['DELIVERY'],
};
export const INFRASTRUCTURE_KIND: Record<StreamingInfrastructureIncidentType, string> = {
    POWER_FAILURE: 'Power failure',
    COOLING_INCIDENT: 'Cooling failure',
    FIBRE_CUT: 'Fibre cut',
    TRAFFIC_SPIKE: 'Traffic spike',
    REGIONAL_OUTAGE: 'Regional outage',
    CYBERATTACK: 'Cyberattack',
    DDOS_ATTACK: 'DDoS attack',
    RIVAL_SABOTAGE: 'Sabotage',
};
const REGION_NAMES: Record<BoxOfficeRegionId, string> = {
    NORTH_AMERICA: 'North America',
    SOUTH_AMERICA: 'South America',
    EUROPE: 'Europe',
    ASIA: 'Asia',
    AFRICA: 'Africa',
    OCEANIA: 'Oceania',
};
const REGION_ORDER: BoxOfficeRegionId[] = ['NORTH_AMERICA', 'EUROPE', 'ASIA', 'SOUTH_AMERICA', 'AFRICA', 'OCEANIA'];
/** the tech-health charge the weekly close takes while an incident is open (streamingWeeklyLoop.ts) */
const TECH_HEALTH_CHARGE: Record<StreamingCrisisSeverity, number> = { MINOR: 1, SERIOUS: 2, MAJOR: 3.5, CRITICAL: 5 };
const SEVERITY_RANK: Record<StreamingCrisisSeverity, number> = { MINOR: 0, SERIOUS: 1, MAJOR: 2, CRITICAL: 3 };
const LEVEL_RANK: Record<StreamingStatusLevel, number> = { WORKING: 0, SLOW: 1, DOWN: 2 };
/** a server under this condition is slow: maintenance has fallen behind */
export const STREAMING_STATUS_SLOW_CONDITION = 60;
/** a server incident that takes this much capacity away takes the video service down while nobody responds */
const DOWN_CAPACITY_LOSS = 30;

const worst = (levels: StreamingStatusLevel[]): StreamingStatusLevel => (
    levels.reduce<StreamingStatusLevel>((current, level) => (LEVEL_RANK[level] > LEVEL_RANK[current] ? level : current), 'WORKING')
);
const signed = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)}`;
const money = (value: number) => (value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1_000)}K`);
const stageOf = (stage: OwnedStreamingCrisis['stage']): StreamingStatusIncidentStage => (
    stage === 'DETECTED' ? 'OPEN' : stage === 'RECOVERING' ? 'REPAIRING' : 'RESOLVED'
);
/** a server site's city (server sites are their own registry; film locations are the fallback) */
const cityName = (cityId: string) => getStreamingServerSite(cityId)?.name || getProductionLocation(cityId)?.name || cityId.replaceAll('_', ' ');
/** How a site is held: its cloud provider's name, or rented or owned (a lease with no tenure is rented). */
const holdingOf = (lease: { tenure?: 'CLOUD' | 'RENTED' | 'OWNED'; cloudProvider?: Parameters<typeof getStreamingCloudProvider>[0] } | undefined): string => (
    lease?.tenure === 'CLOUD' ? getStreamingCloudProvider(lease.cloudProvider).name : lease?.tenure === 'OWNED' ? 'Owned' : 'Rented'
);

/** The newest crisis and the newest infrastructure incident still running: the ones the weekly close charges. */
const activeOf = <T extends { stage: OwnedStreamingCrisis['stage'] }>(items: T[]): T | null => (
    [...items].reverse().find(item => item.stage !== 'RESOLVED') || null
);

/**
 * Both systems' incidents as one list: open and repairing ones the worst first, then resolved ones
 * newest first. The damage lines are what the weekly close charges the incident it is running.
 */
export const getStreamingStatusIncidents = (
    value: OwnedStreamingPlatformState,
    absoluteWeek: number,
    /** the player's energy: with it, each open incident carries its repair options */
    energyAvailable?: number,
): StreamingStatusIncident[] => {
    const platform = normalizeOwnedStreamingPlatformState(value);
    const crises = platform.crisisSecurity.crises;
    const incidents = platform.crisisSecurity.infrastructureOperations.incidents;
    const crisisEffects = getStreamingCrisisWeeklyEffects(platform);
    const serverEffects = getStreamingInfrastructureOperationsEffects(platform);
    const activeCrisisId = activeOf(crises)?.id;
    const activeIncidentId = activeOf(incidents)?.id;
    const facilities = platform.infrastructureSetup?.facilities || [];
    /* the server repair's weekly cost: what the incident adds to the insurance premium */
    const premium = serverEffects.activeIncident
        ? getStreamingInfrastructureOperationsEffects({
            ...platform,
            crisisSecurity: { ...platform.crisisSecurity, infrastructureOperations: { ...platform.crisisSecurity.infrastructureOperations, incidents: [] } },
        }).weeklyOperatingCost
        : serverEffects.weeklyOperatingCost;
    const serverRepairCost = Math.max(0, serverEffects.weeklyOperatingCost - premium);
    const capacityLoss = Math.round((1 - serverEffects.capacityMultiplier) * 100);
    /* #51: what it does to viewers: the share of all viewing it takes, the extra churn a week */
    const harm = getStreamingIncidentHarm(platform);
    const viewerDamage = (id: string): string[] => {
        const row = harm.rows.find(item => item.id === id);
        if (!row) return [];
        return [
            ...(row.viewingLoss >= .0005 ? [`Viewing −${(row.viewingLoss * 100).toFixed(1)}%`] : []),
            ...(row.extraChurn >= .00005 ? [`Churn +${(row.extraChurn * 100).toFixed(2)}% a week`] : []),
        ];
    };
    /* #50: what STATUS did, the weeks left before it runs its course, and the three answers */
    const answers = (item: OwnedStreamingCrisis | OwnedStreamingInfrastructureIncident) => {
        /* #55: a title on pirate sites is a takedown, and the Takedown network or AI hunter shortens it */
        const speed = streamingIncidentSpeed(platform, item);
        return {
            repairPath: item.statusRepair?.path ?? null,
            ...(item.statusRepair?.by ? { repairedBy: item.statusRepair.by } : {}),
            weeksToRunItsCourse: item.stage === 'DETECTED' ? Math.max(1, streamingIncidentWaitEndsAt(item, speed) - absoluteWeek) : null,
            ...(streamingIncidentIsTakedown(item) ? { takedown: true } : {}),
            ...(item.stage === 'DETECTED' && energyAvailable !== undefined
                ? { repairs: getStreamingIncidentRepairOptions(item, absoluteWeek, energyAvailable, platform.treasuryCash, speed) } : {}),
        };
    };

    const fromCrisis = (crisis: OwnedStreamingCrisis): StreamingStatusIncident => {
        const stage = stageOf(crisis.stage);
        const charged = crisis.id === activeCrisisId && stage !== 'RESOLVED';
        return {
            id: crisis.id,
            source: 'CRISIS',
            title: crisis.title,
            kind: CRISIS_KIND[crisis.type],
            where: null,
            severity: crisis.severity,
            major: SEVERITY_RANK[crisis.severity] >= SEVERITY_RANK.MAJOR,
            stage,
            openedAtWeek: crisis.detectedAtAbsoluteWeek,
            weeks: Math.max(0, (crisis.resolvedAtAbsoluteWeek ?? absoluteWeek) - crisis.detectedAtAbsoluteWeek),
            readyAtWeek: stage === 'REPAIRING' ? crisis.recoveryReadyAtAbsoluteWeek : null,
            weeksLeft: stage === 'REPAIRING' && crisis.recoveryReadyAtAbsoluteWeek !== null ? Math.max(0, crisis.recoveryReadyAtAbsoluteWeek - absoluteWeek) : null,
            resolvedAtWeek: crisis.resolvedAtAbsoluteWeek,
            affectedViewers: Math.max(0, Math.round(crisis.affectedSubscribers)),
            damage: charged ? [
                ...viewerDamage(crisis.id),
                ...(crisisEffects.playbackDelta < 0 ? [`Playback ${signed(crisisEffects.playbackDelta)} points`] : []),
                `Tech health −${TECH_HEALTH_CHARGE[crisis.severity]} a week`,
                ...(crisisEffects.weeklyRecoveryCost > 0 ? [`Recovery ${money(crisisEffects.weeklyRecoveryCost)} a week`] : []),
            ] : [],
            cause: crisis.cause,
            note: stage === 'RESOLVED' ? crisis.outcomeNote || crisis.detail : crisis.detail,
            hits: stage === 'RESOLVED' ? [] : CRISIS_HITS[crisis.type],
            region: null,
            ...answers(crisis),
        };
    };

    const fromIncident = (incident: OwnedStreamingInfrastructureIncident): StreamingStatusIncident => {
        const stage = stageOf(incident.stage);
        const charged = incident.id === activeIncidentId && stage !== 'RESOLVED';
        const facility = facilities.find(item => item.id === incident.facilityId);
        const cloud = facility?.lease?.tenure === 'CLOUD' ? holdingOf(facility.lease) : null;
        return {
            id: incident.id,
            source: 'INFRASTRUCTURE',
            title: incident.title,
            kind: INFRASTRUCTURE_KIND[incident.type],
            where: [cityName(incident.cityId), cloud].filter(Boolean).join(' · '),
            severity: incident.severity,
            major: SEVERITY_RANK[incident.severity] >= SEVERITY_RANK.MAJOR,
            stage,
            openedAtWeek: incident.detectedAtAbsoluteWeek,
            weeks: Math.max(0, (incident.resolvedAtAbsoluteWeek ?? absoluteWeek) - incident.detectedAtAbsoluteWeek),
            readyAtWeek: stage === 'REPAIRING' ? incident.recoveryReadyAtAbsoluteWeek : null,
            weeksLeft: stage === 'REPAIRING' && incident.recoveryReadyAtAbsoluteWeek !== null ? Math.max(0, incident.recoveryReadyAtAbsoluteWeek - absoluteWeek) : null,
            resolvedAtWeek: incident.resolvedAtAbsoluteWeek,
            affectedViewers: Math.max(0, Math.round(incident.affectedSubscribers)),
            damage: charged ? [
                ...viewerDamage(incident.id),
                ...(serverEffects.playbackDelta < 0 ? [`Playback ${signed(serverEffects.playbackDelta)} points`] : []),
                ...(capacityLoss > 0 ? [`Capacity −${capacityLoss}%`] : []),
                `Tech health −${TECH_HEALTH_CHARGE[incident.severity]} a week`,
                ...(serverRepairCost > 0 ? [`Recovery ${money(serverRepairCost)} a week`] : []),
            ] : [],
            cause: incident.cause,
            note: stage === 'RESOLVED' ? incident.outcomeNote || incident.detail : incident.detail,
            hits: stage === 'RESOLVED' ? [] : ['DELIVERY'],
            region: getStreamingServerSite(incident.cityId)?.regionId ?? null,
            ...answers(incident),
        };
    };

    const all = [...crises.map(fromCrisis), ...incidents.map(fromIncident)];
    /* unanswered first, then those being waited out, then repairs under way */
    const urgency = (item: StreamingStatusIncident) => (item.stage === 'OPEN' ? item.repairPath === 'WAIT' ? 1 : 0 : 2);
    const open = all.filter(item => item.stage !== 'RESOLVED').sort((left, right) => (
        urgency(left) - urgency(right)
        || SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
        || right.openedAtWeek - left.openedAtWeek
    ));
    const resolved = all.filter(item => item.stage === 'RESOLVED')
        .sort((left, right) => (right.resolvedAtWeek ?? right.openedAtWeek) - (left.resolvedAtWeek ?? left.openedAtWeek));
    return [...open, ...resolved];
};

export interface StreamingIncidentAlert {
    /** incidents open or being repaired, in both systems */
    count: number;
    /** the one to show: an unanswered one before a repairing one, the worst, the newest */
    first: { id: string; title: string; kind: string; severity: StreamingCrisisSeverity; major: boolean; stage: 'OPEN' | 'REPAIRING'; waiting: boolean } | null;
}

/**
 * The HQ alert's read (#49): both systems' open incidents counted from the saved lists alone, with
 * no effects worked out and nothing normalised, so the HQ can read it on every render.
 */
export const getStreamingIncidentAlert = (platform: Pick<OwnedStreamingPlatformState, 'crisisSecurity'>): StreamingIncidentAlert => {
    const rows = [
        ...(platform.crisisSecurity?.crises || []).map(item => ({ item, kind: CRISIS_KIND[item.type] })),
        ...(platform.crisisSecurity?.infrastructureOperations?.incidents || []).map(item => ({ item, kind: INFRASTRUCTURE_KIND[item.type] })),
    ].filter(({ item }) => item.stage !== 'RESOLVED');
    const urgency = (item: OwnedStreamingCrisis | OwnedStreamingInfrastructureIncident) => (item.stage === 'DETECTED' ? item.statusRepair?.path === 'WAIT' ? 1 : 0 : 2);
    const [top] = [...rows].sort((left, right) => (
        urgency(left.item) - urgency(right.item)
        || SEVERITY_RANK[right.item.severity] - SEVERITY_RANK[left.item.severity]
        || right.item.detectedAtAbsoluteWeek - left.item.detectedAtAbsoluteWeek
    ));
    return {
        count: rows.length,
        first: top ? {
            id: top.item.id,
            title: top.item.title,
            kind: top.kind,
            severity: top.item.severity,
            major: SEVERITY_RANK[top.item.severity] >= SEVERITY_RANK.MAJOR,
            stage: top.item.stage === 'DETECTED' ? 'OPEN' : 'REPAIRING',
            waiting: top.item.statusRepair?.path === 'WAIT',
        } : null,
    };
};

/** The incidents still open or being repaired, the worst first, with what each does a week. */
export const getStreamingOpenIncidents = (
    value: OwnedStreamingPlatformState,
    absoluteWeek: number,
): StreamingStatusIncident[] => getStreamingStatusIncidents(value, absoluteWeek).filter(item => item.stage !== 'RESOLVED');

/**
 * The four service strips' state: a platform outage, or a server incident that takes away
 * DOWN_CAPACITY_LOSS% or more, takes video delivery down until someone responds; a response
 * under way, any other server incident or a night above 90% load makes it slow. A breach slows
 * accounts, a backlash recommendations, a rights problem or a leak rights and publishing; each
 * also follows video delivery, as the status page always has (an outage turns the page red).
 */
export const getStreamingServiceStatus = (
    open: StreamingStatusIncident[],
    peakLoad: number,
    capacityLossPercent: number,
): Record<StreamingServiceComponentId, StreamingStatusLevel> => {
    const levelFor = (component: StreamingServiceComponentId) => worst(open.filter(item => item.hits.includes(component)).map(item => {
        if (component === 'DELIVERY' && item.stage === 'OPEN' && (item.source === 'CRISIS' || capacityLossPercent >= DOWN_CAPACITY_LOSS)) return 'DOWN';
        return 'SLOW';
    }));
    const delivery = worst([levelFor('DELIVERY'), peakLoad >= 90 ? 'SLOW' : 'WORKING']);
    return {
        DELIVERY: delivery,
        ACCOUNTS: worst([levelFor('ACCOUNTS'), delivery]),
        RECOMMENDATIONS: worst([levelFor('RECOMMENDATIONS'), delivery]),
        RIGHTS: worst([levelFor('RIGHTS'), delivery]),
    };
};

const SERVICE_NAMES: Record<StreamingServiceComponentId, string> = {
    DELIVERY: 'Video delivery', ACCOUNTS: 'Accounts and payments', RECOMMENDATIONS: 'Recommendations', RIGHTS: 'Rights and publishing',
};

export const getStreamingStatusBoard = (player: Player): StreamingStatusBoard => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const latest = platform.weeklyHistory.at(-1);
    const peakLoad = Math.max(0, Math.round(latest?.operations?.capacityUtilizationPercent ?? 0));
    const incidents = getStreamingStatusIncidents(platform, absoluteWeek, Math.max(0, player.energy?.current ?? 0));
    const open = incidents.filter(item => item.stage !== 'RESOLVED');
    const serverEffects = getStreamingInfrastructureOperationsEffects(platform);
    const capacityLoss = Math.round((1 - serverEffects.capacityMultiplier) * 100);
    const service = getStreamingServiceStatus(open, peakLoad, capacityLoss);

    /* ── servers, by region: a server incident takes its site down until a response is under way;
       a site below STREAMING_STATUS_SLOW_CONDITION% condition is slow ── */
    const operations = getStreamingInfrastructureOperations(player);
    const openServerIncidents = platform.crisisSecurity.infrastructureOperations.incidents.filter(item => item.stage !== 'RESOLVED');
    type Site = { region: BoxOfficeRegionId; name: string; holding: string; racks: number; status: StreamingStatusLevel; reason?: string; incidentId?: string };
    const sites: Site[] = operations.facilities.map(({ facility, view }) => {
        const region = getStreamingServerSite(facility.cityId)?.regionId ?? 'NORTH_AMERICA';
        const name = cityName(facility.cityId);
        const incident = openServerIncidents.find(item => item.facilityId === facility.id);
        const condition = Math.round(view.state.maintenanceConditionPercent);
        const base = { region, name, holding: holdingOf(facility.lease), racks: facility.installedRacks };
        if (incident) {
            const kind = INFRASTRUCTURE_KIND[incident.type].toLowerCase();
            return incident.stage === 'DETECTED'
                ? { ...base, status: 'DOWN' as const, reason: `${name}: ${kind}, ${Math.round(incident.capacityLossPercent)}% of capacity lost`, incidentId: incident.id }
                : { ...base, status: 'SLOW' as const, reason: `${name}: ${kind}, being repaired`, incidentId: incident.id };
        }
        if (condition < STREAMING_STATUS_SLOW_CONDITION) return { ...base, status: 'SLOW' as const, reason: `${name}: ${condition}% condition, maintenance has fallen behind` };
        return { ...base, status: 'WORKING' as const };
    });
    /* ── #101 the lines: each of the last STREAMING_STATUS_LINE_WEEKS weeks (#102: from the launch while the service is
       younger), from the incidents both systems keep (24 crises, 32 server incidents: more than the window at #74's
       pace). An incident darkens its weeks from the week it was found to the week before it ended (the week itself when
       it ended that week): down until a repair began (STATUS's answer, or Incident Command's response, taken as the week
       it was found), slow while it was repaired; waiting it out stays down. The week now is the row's own state. ── */
    const launchedAt = platform.launchCommit?.committedAtAbsoluteWeek ?? null;
    const lineWeeks = streamingStatusLineWeeks(absoluteWeek, launchedAt);
    type Kept = OwnedStreamingCrisis | OwnedStreamingInfrastructureIncident;
    const lastWeekOf = (item: Kept) => (item.resolvedAtAbsoluteWeek === null ? absoluteWeek : Math.max(item.detectedAtAbsoluteWeek, item.resolvedAtAbsoluteWeek - 1));
    const repairFrom = (item: Kept): number | null => (item.statusRepair
        ? item.statusRepair.path === 'WAIT' ? null : item.statusRepair.atAbsoluteWeek
        : item.recoveryReadyAtAbsoluteWeek !== null || item.stage === 'RECOVERING' ? item.detectedAtAbsoluteWeek : null);
    const during = (items: Kept[], week: number) => items.filter(item => item.detectedAtAbsoluteWeek <= week && week <= lastWeekOf(item));
    const lineOf = (now: StreamingStatusLevel, from: number, items: Kept[], downWhenUnanswered: (item: Kept) => boolean): StreamingStatusDay[] => lineWeeks.map(week => {
        if (week === absoluteWeek) return now;
        const hits = during(items, week);
        if (hits.length) return worst(hits.map(item => {
            const repair = repairFrom(item);
            return (repair === null || week < repair) && downWhenUnanswered(item) ? 'DOWN' : 'SLOW';
        }));
        return week < from ? 'NONE' : 'WORKING';
    });
    /* each week, the worst of a region's cities (NONE only when none of them had been built) */
    const worstDay = (lines: StreamingStatusDay[][]): StreamingStatusDay[] => lineWeeks.map((_, index) => {
        const days = lines.map(line => line[index]).filter((day): day is StreamingStatusLevel => day !== 'NONE');
        return days.length ? worst(days) : 'NONE';
    });

    /* a city: its sites together; it opened with the order that added it (a year of orders is kept), or with the
       founding network */
    const allServerIncidents = platform.crisisSecurity.infrastructureOperations.incidents;
    const openedAt = (cityId: string) => {
        const order = (platform.networkOrders || [])
            .filter(item => item.status === 'DONE' && item.completedAtAbsoluteWeek !== null && item.newCityIds.includes(cityId))
            .sort((left, right) => (right.completedAtAbsoluteWeek ?? 0) - (left.completedAtAbsoluteWeek ?? 0))[0];
        return order?.completedAtAbsoluteWeek ?? launchedAt ?? Number.NEGATIVE_INFINITY;
    };
    const cityRows = (region: BoxOfficeRegionId): StreamingStatusRow[] => {
        const ids = [...new Set(operations.facilities
            .filter(({ facility }) => (getStreamingServerSite(facility.cityId)?.regionId ?? 'NORTH_AMERICA') === region)
            .map(({ facility }) => facility.cityId))];
        return ids.map(cityId => {
            const here = sites.filter((_, index) => operations.facilities[index].facility.cityId === cityId);
            const status = worst(here.map(site => site.status));
            const trouble = [...here].sort((left, right) => LEVEL_RANK[right.status] - LEVEL_RANK[left.status])[0];
            const racks = here.reduce((sum, site) => sum + site.racks, 0);
            return {
                id: `CITY:${cityId}`,
                label: cityName(cityId),
                detail: [`${racks.toLocaleString()} rack${racks === 1 ? '' : 's'}`, ...new Set(here.map(site => site.holding))].join(' · '),
                status,
                ...(status !== 'WORKING' && trouble?.reason ? { reason: trouble.reason } : {}),
                ...(status !== 'WORKING' && trouble?.incidentId ? { incidentId: trouble.incidentId } : {}),
                history: lineOf(status, openedAt(cityId), allServerIncidents.filter(item => item.cityId === cityId), () => true),
            };
        });
    };

    const serverRows: StreamingStatusRow[] = REGION_ORDER.flatMap(region => {
        const here = sites.filter(site => site.region === region);
        if (!here.length) return [];
        const status = worst(here.map(site => site.status));
        const troubled = here.filter(site => site.status !== 'WORKING').sort((left, right) => LEVEL_RANK[right.status] - LEVEL_RANK[left.status]);
        /* how the region's sites are held: "Atlas Compute", "Rented", or "Atlas Compute 4 · Rented 12" */
        const holdings = [...new Set(here.map(site => site.holding))];
        const held = holdings.length === 1 ? holdings[0] : holdings.map(holding => `${holding} ${here.filter(site => site.holding === holding).length}`).join(' · ');
        const racks = here.reduce((sum, site) => sum + site.racks, 0);
        /* #101: the region's cities, the troubled first, then by name */
        const cities = cityRows(region).sort((left, right) => (
            LEVEL_RANK[right.status === 'OFF' ? 'WORKING' : right.status] - LEVEL_RANK[left.status === 'OFF' ? 'WORKING' : left.status]
            || left.label.localeCompare(right.label)
        ));
        return [{
            id: `SERVER:${region}`,
            label: REGION_NAMES[region],
            detail: [`${cities.length} cit${cities.length === 1 ? 'y' : 'ies'}`, `${racks.toLocaleString()} rack${racks === 1 ? '' : 's'}`, held].join(' · '),
            status,
            ...(troubled.length ? {
                reason: troubled.length === 1 ? troubled[0].reason : `${troubled[0].reason}; ${troubled.length - 1} more site${troubled.length === 2 ? '' : 's'} slow or down`,
                ...(troubled[0].incidentId ? { incidentId: troubled[0].incidentId } : {}),
            } : {}),
            history: worstDay(cities.map(city => city.history ?? [])),
            cities,
        }];
    });
    /* #102 (Zeesh: "same goes with servers, ek single row ho"): the servers as one line, the worst city each week; how many
       cities are slow or down now, and the worst one's reason */
    const levelOf = (status: StreamingStatusRow['status']): StreamingStatusLevel => (status === 'OFF' ? 'WORKING' : status);
    const allCities = serverRows.flatMap(row => row.cities ?? []);
    const citiesAt = (level: StreamingStatusLevel) => allCities.filter(city => city.status === level).length;
    const cityWord = (count: number) => `${count} cit${count === 1 ? 'y' : 'ies'}`;
    const [downCities, slowCities] = [citiesAt('DOWN'), citiesAt('SLOW')];
    const worstSite = [...sites].sort((left, right) => LEVEL_RANK[right.status] - LEVEL_RANK[left.status])[0];
    const serversOverview: StreamingStatusOverview | null = serverRows.length ? {
        label: downCities || slowCities
            ? [downCities ? `${cityWord(downCities)} down` : '', slowCities ? `${downCities ? slowCities : cityWord(slowCities)} slow` : ''].filter(Boolean).join(' · ')
            : allCities.length === 1 ? '1 city working' : `All ${allCities.length} cities working`,
        status: worst(serverRows.map(row => levelOf(row.status))),
        ...(worstSite && worstSite.status !== 'WORKING' && worstSite.reason ? { reason: worstSite.reason } : {}),
        history: worstDay(serverRows.map(row => row.history ?? [])),
    } : null;

    /* ── tech: each group running something; Picture is slow when the network delivers less than
       the plans sell (the app's player reads the same rule), Stabilization when debt is high ── */
    const tree = resolveStreamingTechTree(platform);
    const plans = getStreamingViewerPlans(platform, absoluteWeek).plans;
    const RES: StreamingViewerResolution[] = ['480p', '720p', '1080p', '4K', '8K', '12K', '16K', '24K'];
    const sold = plans.reduce<StreamingViewerResolution>((best, plan) => (RES.indexOf(plan.quality.planMax) > RES.indexOf(best) ? plan.quality.planMax : best), '480p');
    const health = Math.round(platform.metrics.technologyHealth);
    const tier = streamingNetworkPictureTier(platform.metrics.technologyHealth, peakLoad);
    const delivered: StreamingViewerResolution = tier === '4K' ? sold : tier === 'HD' ? (RES.indexOf(sold) > RES.indexOf('1080p') ? '1080p' : sold) : '480p';
    const debt = Math.round(resolveStreamingPlatformTechDebt(platform));
    /* an app crash marks the Apps row, a broken feature or slow streams the Playback row (#53), and a
       breach or a leak the Trust and safety row (#54), while open */
    const TECH_INCIDENT_GROUP: Partial<Record<OwnedStreamingCrisis['type'], StreamingTechGroupId>> = {
        APP_CRASH: 'APPS', FEATURE_BROKEN: 'PLAYBACK', SLOW_STREAMING: 'PLAYBACK', ACCOUNT_BREACH: 'TRUST', CONTENT_LEAK: 'TRUST',
        RECOMMENDATION_BACKLASH: 'SMART_AI',
    };
    const techIncident = [...platform.crisisSecurity.crises].reverse().find(item => item.stage !== 'RESOLVED' && TECH_INCIDENT_GROUP[item.type]) || null;
    const techIncidentGroup = techIncident ? TECH_INCIDENT_GROUP[techIncident.type] : null;
    /* #101 a group's line: the incidents that marked it, from the week its first tech was unlocked (a given one, or
       Playback's standard player, from the launch), and never before the launch, as the servers; an app crash is down
       until a repair begins, the rest slow */
    const techLine = (row: StreamingStatusRow, groupId: StreamingTechGroupId): StreamingStatusRow => {
        const unlocked = getStreamingTechGroupLadder(groupId).flatMap(item => {
            const progress = tree.techs[item.id];
            return progress ? [progress.granted ? Number.NEGATIVE_INFINITY : progress.unlockedAtAbsoluteWeek] : [];
        });
        const first = unlocked.length ? Math.min(...unlocked) : groupId === 'PLAYBACK' ? Number.NEGATIVE_INFINITY : absoluteWeek;
        const from = Math.max(first, launchedAt ?? Number.NEGATIVE_INFINITY);
        const items = platform.crisisSecurity.crises.filter(item => TECH_INCIDENT_GROUP[item.type] === groupId);
        return { ...row, history: lineOf(row.status === 'OFF' ? 'WORKING' : row.status, from, items, item => (item as OwnedStreamingCrisis).type === 'APP_CRASH') };
    };
    const techRows: StreamingStatusRow[] = STREAMING_TECH_GROUPS.flatMap((group): StreamingStatusRow[] => {
        const ladder = getStreamingTechGroupLadder(group.id);
        const best = [...ladder.filter(item => !item.sideLine)].reverse().find(item => streamingTechVersion(tree, item.id) >= 1);
        const sides = ladder.filter(item => item.sideLine && streamingTechVersion(tree, item.id) >= 1).map(item => item.name);
        const hit = techIncidentGroup === group.id ? techIncident : null;
        // Playback has no starter (#52): a service running only its side lines (Downloads) plays on the standard player
        if (!best && !sides.length && !hit) return [];
        const head = best
            ? `${best.name} · ${getStreamingTechVersionNames(best.id)[Math.max(0, streamingTechVersion(tree, best.id) - 1)]}`
            : group.id === 'PLAYBACK' ? 'Standard player' : 'Off';
        const row: StreamingStatusRow = {
            id: `TECH:${group.id}`,
            label: group.name,
            detail: `${head}${sides.length ? `, plus ${sides.join(', ')}` : ''}`,
            status: 'WORKING',
        };
        if (group.id === 'PICTURE' && delivered !== sold) {
            const why = tier === 'SD' ? `tech health ${health}` : peakLoad >= 85 ? `peak load ${peakLoad}%` : `tech health ${health}`;
            return [{ ...row, status: tier === 'SD' ? 'DOWN' : 'SLOW', reason: `Plans sell ${sold}; viewers get ${delivered} (${why})` }];
        }
        if (group.id === 'STABILIZATION' && debt >= 50) return [{ ...row, status: 'SLOW', reason: `Tech debt ${debt}: it slows playback until it is paid down` }];
        if (hit) {
            const repairing = hit.stage === 'RECOVERING';
            return [{
                ...row,
                status: hit.type === 'APP_CRASH' && !repairing ? 'DOWN' : 'SLOW',
                reason: repairing ? `Fix under way: ${hit.title.charAt(0).toLowerCase()}${hit.title.slice(1)}` : hit.title,
                incidentId: hit.id,
            }];
        }
        return [row];
    }).map(row => techLine(row, row.id.slice('TECH:'.length) as StreamingTechGroupId));
    /* #102 (Zeesh: "tech ka ek pura row ho jaye simple single"): the tech as one line, the worst group each week; the
       worst group slow or down now (and how many more), and its reason */
    const techTroubled = techRows.filter(row => row.status === 'SLOW' || row.status === 'DOWN')
        .sort((left, right) => LEVEL_RANK[levelOf(right.status)] - LEVEL_RANK[levelOf(left.status)]);
    const techOverview: StreamingStatusOverview | null = techRows.length ? {
        label: techTroubled.length
            ? `${techTroubled[0].label} ${techTroubled[0].status === 'DOWN' ? 'down' : 'slow'}${techTroubled.length > 1 ? ` · ${techTroubled.length - 1} more` : ''}`
            : techRows.length === 1 ? `${techRows[0].label} working` : `All ${techRows.length} working`,
        status: worst(techRows.map(row => levelOf(row.status))),
        ...(techTroubled[0]?.reason ? { reason: techTroubled[0].reason } : {}),
        history: worstDay(techRows.map(row => row.history ?? [])),
    } : null;

    /* ── products: a launched product goes down with the video service ── */
    const productRows: StreamingStatusRow[] = platform.productLines
        .filter(product => product.status !== 'UNDER_DEVELOPMENT')
        .map(product => ({
            id: `PRODUCT:${product.id}`,
            label: product.title,
            detail: product.status === 'PAUSED' ? 'Paused' : product.peakLoadPercent > 0 ? `Adds ${product.peakLoadPercent}% to peak load` : 'Running',
            status: product.status === 'PAUSED' ? 'OFF' as const : service.DELIVERY === 'DOWN' ? 'DOWN' as const : 'WORKING' as const,
            ...(product.status !== 'PAUSED' && service.DELIVERY === 'DOWN' ? { reason: 'The video service is down' } : {}),
        }));

    const cityCount = serverRows.reduce((sum, row) => sum + (row.cities?.length ?? 0), 0);
    const sections: StreamingStatusSection[] = [
        {
            id: 'SERVERS', title: 'Servers', rows: serverRows, empty: 'No servers yet: they are built on the Network tab.',
            note: cityCount ? `${cityCount} cit${cityCount === 1 ? 'y' : 'ies'} · peak load ${peakLoad}%` : `Peak load ${peakLoad}% of capacity`,
            ...(serversOverview ? { overview: serversOverview } : {}),
        },
        {
            id: 'TECH', title: 'Tech', note: techRows.length ? `${techRows.length} running` : undefined, rows: techRows, empty: 'No tech running yet.',
            ...(techOverview ? { overview: techOverview } : {}),
        },
        { id: 'PRODUCTS', title: 'Products', rows: productRows, empty: 'No products launched yet.' },
    ];
    const levels: StreamingStatusLevel[] = [
        ...Object.values(service),
        ...sections.flatMap(section => section.rows.map(row => (row.status === 'OFF' ? 'WORKING' : row.status))),
        ...open.map(item => (item.stage === 'OPEN' && item.major ? 'DOWN' as const : 'SLOW' as const)),
    ];
    const overall = worst(levels);
    const first = open[0];
    const slowRow = sections.flatMap(section => section.rows).find(row => row.status === 'SLOW' || row.status === 'DOWN');
    const slowService = (Object.keys(service) as StreamingServiceComponentId[]).find(id => service[id] !== 'WORKING');
    const headline = overall === 'WORKING'
        ? 'All systems working'
        : first
            ? `${first.kind}${first.where ? ` in ${first.where.split(' · ')[0]}` : ''}${open.length > 1 ? ` and ${open.length - 1} more` : ''}`
            : slowService === 'DELIVERY' && peakLoad >= 90 ? `Slow streaming: peak load ${peakLoad}%`
                : slowRow?.reason || (slowService ? `${SERVICE_NAMES[slowService]} is slow` : 'Something is slow');
    return {
        live: platform.lifecycle === 'ACTIVE',
        overall,
        headline,
        line: overall === 'WORKING' ? 'Subscribers are watching normally'
            : first?.stage === 'OPEN' ? first.repairPath === 'WAIT' ? 'Subscribers are seeing this while you wait it out' : 'Subscribers are seeing this right now, and nobody has responded yet'
                : first ? 'Subscribers are seeing this while it is repaired' : 'Some subscribers notice it',
        open,
        service,
        sections,
        lineFromLaunch: lineWeeks.length < STREAMING_STATUS_LINE_WEEKS,
        /* #102 (Zeesh: "zyada se zyada ek saal ka incident"): every one resolved in the last year (it showed the newest
           8, however old) */
        history: incidents.filter(item => item.stage === 'RESOLVED'
            && absoluteWeek - (item.resolvedAtWeek ?? item.openedAtWeek) < STREAMING_STATUS_HISTORY_WEEKS),
    };
};
