/**
 * Repair on STATUS (codex-handoff/plans/platform-tech-plan.md §7, Phase 3 #50): every open
 * incident, crisis or server incident alike, can be
 *
 *   repaired now   energy and some cash: fixed the week it is taken, so it does no more damage
 *   fixed          cash only, slower on purpose: repairing for 3 or 5 weeks at about half the harm
 *   waited out     no cash: it runs 6 or 10 weeks from when it opened, at full harm
 *
 *   | Option     | Minor (MINOR, SERIOUS)        | Major (MAJOR, CRITICAL)        |
 *   |------------|-------------------------------|--------------------------------|
 *   | Repair now | 25 energy + $0.5M, this week  | 50 energy + $1.5M, this week   |
 *   | Fix        | $2M, 3 weeks                  | $6M, 5 weeks                   |
 *   | Wait       | 6 weeks of damage             | 10 weeks of damage             |
 *
 * "The fix's longer time is what makes the energy repair worth taking." An incident nobody
 * answers runs its waiting time too, so an unanswered crisis no longer stays open for ever (and
 * no longer blocks every later incident, which waits for none to be open). Start numbers: Phase 5
 * tunes them. The two systems keep their own records and Incident Command's responses.
 */
import type {
    OwnedStreamingCrisis,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    Player,
    StreamingCrisisSeverity,
    StreamingIncidentStatusRepair,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import { normalizeStreamingFacilityPhysical } from './streamingFacilities';
import { createDeterministicId } from './deterministicRandom';
import { resolveStreamingTechTree, streamingTechTakedownSpeed } from './streamingTechTreeCatalogue';

export type StreamingIncidentRepairPath = StreamingIncidentStatusRepair['path'];
export type StreamingIncidentSource = 'CRISIS' | 'INFRASTRUCTURE';

/** §7's start numbers. */
export const STREAMING_INCIDENT_REPAIR = {
    ENERGY: { minor: { energy: 25, cash: 500_000 }, major: { energy: 50, cash: 1_500_000 } },
    FIX: { minor: { cash: 2_000_000, weeks: 3 }, major: { cash: 6_000_000, weeks: 5 } },
    WAIT: { minor: { weeks: 6 }, major: { weeks: 10 } },
} as const;

/**
 * #73 and #74, Zeesh: "badi service par incidents zyada aayein", then "do mahine ke andar ek se teen incident
 * … aur stabilization optimization isko aur reduce kar sakta hai … aisa bhi ho sakta hai ki kisi do mahine ke
 * gap mein ek bhi incident na aaye". From 500K subscribers to 10M, a service's weekly chance of a new incident
 * on STATUS never falls below a floor that rises to 30% times its exposure (the share of incidents its tech
 * lets through: 1 with none, about a third fully protected), and the weeks it waits after the last one shrink
 * from six to two *(start)*. An unprotected service of 10M or more has one to three in two months, a
 * protected one about one, and two months without any happen. Below 500K nothing changes. How bad each one is
 * still follows the risk; server incidents keep their own rates (Assisted Management answers them with cash).
 */
export const STREAMING_SIZE_INCIDENTS = { pace: .3, spacingWeeks: 6, bigSpacingWeeks: 2 } as const;
export const streamingServiceSize = (subscribers: number): number => (
    Math.max(0, Math.min(1, ((Number(subscribers) || 0) - 500_000) / 9_500_000))
);
/** The week's chance of a new incident on STATUS: its risk, or the floor its size and exposure set */
export const streamingIncidentChance = (risk: number, subscribers: number, exposure = 1): number => (
    Math.max(risk, STREAMING_SIZE_INCIDENTS.pace * streamingServiceSize(subscribers) * Math.max(0, exposure))
);
/** The weeks a new incident on STATUS waits after the last one: six, down to two for a big service */
export const streamingIncidentSpacingWeeks = (subscribers: number): number => Math.round(
    STREAMING_SIZE_INCIDENTS.spacingWeeks
    - (STREAMING_SIZE_INCIDENTS.spacingWeeks - STREAMING_SIZE_INCIDENTS.bigSpacingWeeks) * streamingServiceSize(subscribers),
);

/** §7's major incident: MAJOR or CRITICAL. */
export const streamingIncidentIsMajor = (severity: StreamingCrisisSeverity): boolean => severity === 'MAJOR' || severity === 'CRITICAL';
/** How long an incident nobody repairs runs, from the week it opened. */
export const streamingIncidentWaitWeeks = (severity: StreamingCrisisSeverity): number => (
    streamingIncidentIsMajor(severity) ? STREAMING_INCIDENT_REPAIR.WAIT.major.weeks : STREAMING_INCIDENT_REPAIR.WAIT.minor.weeks
);
/** The week an unrepaired incident runs its course at the weekly close. `speed` (#55): a takedown's
 *  share of the usual weeks; 1 for everything but a pirated title. */
export const streamingIncidentWaitEndsAt = (incident: { severity: StreamingCrisisSeverity; detectedAtAbsoluteWeek: number }, speed = 1): number => (
    incident.detectedAtAbsoluteWeek + Math.max(1, Math.ceil(streamingIncidentWaitWeeks(incident.severity) * speed))
);

/** A title on pirate sites (#55) is a takedown: the Takedown network or the AI hunter cut its weeks. Anything else, 1. */
export const streamingIncidentIsTakedown = (incident: { type?: string }): boolean => incident.type === 'CONTENT_LEAK';
export const streamingIncidentSpeed = (platform: OwnedStreamingPlatformState, incident: { type?: string }): number => (
    streamingIncidentIsTakedown(incident) ? streamingTechTakedownSpeed(resolveStreamingTechTree(platform)) : 1
);

export interface StreamingIncidentRepairOption {
    path: StreamingIncidentRepairPath;
    cash: number;
    energy: number;
    /** FIX: weeks of repair · WAIT: weeks of damage left · ENERGY: 0, fixed this week */
    weeks: number;
    available: boolean;
    /** why it cannot be taken now */
    refusal?: string;
}

const money = (value: number) => (value >= 1_000_000 ? `$${String(+(value / 1_000_000).toFixed(1))}M` : `$${Math.round(value / 1_000)}K`);
export const STREAMING_REPAIR_OUT_OF_ENERGY = 'Out of energy for now. It refills next week, or get more in the Store.';

/** The three answers an open incident offers, priced for its severity, against what the player has. */
export const getStreamingIncidentRepairOptions = (
    incident: { severity: StreamingCrisisSeverity; detectedAtAbsoluteWeek: number; statusRepair?: StreamingIncidentStatusRepair },
    absoluteWeek: number,
    energyAvailable: number,
    treasuryCash: number,
    speed = 1,
): StreamingIncidentRepairOption[] => {
    const major = streamingIncidentIsMajor(incident.severity);
    const energy = major ? STREAMING_INCIDENT_REPAIR.ENERGY.major : STREAMING_INCIDENT_REPAIR.ENERGY.minor;
    const base = major ? STREAMING_INCIDENT_REPAIR.FIX.major : STREAMING_INCIDENT_REPAIR.FIX.minor;
    const fix = { cash: base.cash, weeks: Math.max(1, Math.ceil(base.weeks * speed)) };
    const waitLeft = Math.max(1, streamingIncidentWaitEndsAt(incident, speed) - absoluteWeek);
    const cashShort = (cash: number) => (treasuryCash < cash ? `Needs ${money(cash)}; the treasury has ${money(Math.max(0, treasuryCash))}.` : undefined);
    const energyRefusal = energyAvailable < energy.energy
        ? energyAvailable <= 0 ? STREAMING_REPAIR_OUT_OF_ENERGY : `Needs ${energy.energy} energy; you have ${Math.floor(energyAvailable)}.`
        : cashShort(energy.cash);
    const fixRefusal = cashShort(fix.cash);
    return [
        { path: 'ENERGY', cash: energy.cash, energy: energy.energy, weeks: 0, available: !energyRefusal, ...(energyRefusal ? { refusal: energyRefusal } : {}) },
        { path: 'FIX', cash: fix.cash, energy: 0, weeks: fix.weeks, available: !fixRefusal, ...(fixRefusal ? { refusal: fixRefusal } : {}) },
        ...(incident.statusRepair?.path === 'WAIT' ? [] : [{ path: 'WAIT' as const, cash: 0, energy: 0, weeks: waitLeft, available: true }]),
    ];
};

export type StreamingIncidentRepairRefusal = 'NOT_OPEN' | 'NO_ENERGY' | 'NO_CASH' | 'NOT_LIVE';
export interface StreamingIncidentRepairResult {
    changed: boolean;
    player: Player;
    refusal?: StreamingIncidentRepairRefusal;
    /** what the player is told, either way */
    message: string;
}

const ledgerEntry = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    type: OwnedStreamingLedgerEntry['type'],
    key: string,
    summary: string,
    metadata: Record<string, string | number | boolean | null>,
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type,
    summary,
    source: 'PLAYER_ACTION',
    metadata,
});

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Answers an open incident from STATUS. Repair now resolves it at once (no damage at this week's
 * close); Fix starts a repair that the weekly close finishes, with no weekly recovery bill on top;
 * Wait records the choice and changes nothing else (it runs its course either way).
 */
export const repairStreamingIncident = (
    player: Player,
    source: StreamingIncidentSource,
    incidentId: string,
    path: StreamingIncidentRepairPath,
    /** #75: Repair now for an ad (the week's popup's golden answer): no energy, no cash */
    paidBy?: 'AD',
): StreamingIncidentRepairResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return { changed: false, player, refusal: 'NOT_LIVE', message: 'The service is not live yet.' };
    const crisis = source === 'CRISIS' ? platform.crisisSecurity.crises.find(item => item.id === incidentId) : undefined;
    const incident = source === 'INFRASTRUCTURE' ? platform.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === incidentId) : undefined;
    const target = crisis || incident;
    if (!target || target.stage !== 'DETECTED') return { changed: false, player, refusal: 'NOT_OPEN', message: 'That incident is already being repaired or is over.' };
    const energyAvailable = Math.max(0, player.energy?.current ?? 0);
    const takedown = streamingIncidentIsTakedown(target);
    const listed = getStreamingIncidentRepairOptions(target, absoluteWeek, energyAvailable, platform.treasuryCash, streamingIncidentSpeed(platform, target))
        .find(item => item.path === path);
    const byAd = paidBy === 'AD' && path === 'ENERGY';
    const option = listed && byAd ? { ...listed, cash: 0, energy: 0, available: true, refusal: undefined } : listed;
    if (!option) return { changed: false, player, refusal: 'NOT_OPEN', message: 'You are already waiting this one out.' };
    if (!option.available) {
        return { changed: false, player, refusal: path === 'ENERGY' && energyAvailable < option.energy ? 'NO_ENERGY' : 'NO_CASH', message: option.refusal || 'Not now.' };
    }
    const repair: StreamingIncidentStatusRepair = { path, atAbsoluteWeek: absoluteWeek, cash: option.cash, energy: option.energy, ...(byAd ? { paidBy: 'AD' as const } : {}) };
    const how = byAd ? 'repaired for an ad, no energy and no cash' : `an all-hands push (${option.energy} energy, ${money(option.cash)})`;
    const key = `${target.idempotencyKey}:status-${path.toLowerCase()}`;
    const fixedBy = absoluteWeek + option.weeks;

    let next: OwnedStreamingPlatformState = platform;
    let message = '';
    if (crisis) {
        const updated: OwnedStreamingCrisis = path === 'ENERGY'
            ? { ...crisis, stage: 'RESOLVED', resolvedAtAbsoluteWeek: absoluteWeek, responseCost: option.cash, statusRepair: repair,
                outcomeNote: takedown
                    ? `Taken down the week it was found: ${byAd ? how : `an all-hands takedown (${option.energy} energy, ${money(option.cash)})`}.`
                    : `Repaired the week it was taken: ${how}.` }
            : path === 'FIX'
                ? { ...crisis, stage: 'RECOVERING', recoveryReadyAtAbsoluteWeek: fixedBy, responseCost: option.cash, weeklyRecoveryCost: 0, statusRepair: repair,
                    outcomeNote: takedown ? `${money(option.cash)} of takedown requests filed: the copies come down by week ${fixedBy}.`
                        : `A ${money(option.cash)} fix is under way: repaired by week ${fixedBy}.` }
                : { ...crisis, statusRepair: repair };
        const state = platform.crisisSecurity;
        next = {
            ...platform,
            treasuryCash: platform.treasuryCash - option.cash,
            crisisSecurity: {
                ...state,
                /* repaired at once: the recovery's own trust, as a verified recovery gives it */
                publicTrust: clampScore(state.publicTrust + (path === 'ENERGY' ? 3 : path === 'FIX' ? 1 : 0)),
                regulatoryScrutiny: clampScore(state.regulatoryScrutiny - (path === 'ENERGY' ? 4 : 0)),
                securityPressure: clampScore(state.securityPressure - (path === 'ENERGY' ? 10 : 0)),
                crises: state.crises.map(item => (item.id === crisis.id ? updated : item)),
            },
            eventLedger: [...platform.eventLedger, ledgerEntry(platform, absoluteWeek, path === 'ENERGY' ? 'CRISIS_RECOVERED' : 'CRISIS_RESPONSE_LOCKED', key,
                path === 'ENERGY' ? `${crisis.title} was repaired the week it was taken.` : path === 'FIX' ? `A fix was funded for ${crisis.title}.` : `Leadership chose to wait out ${crisis.title}.`,
                { crisisId: crisis.id, statusRepair: path, cash: option.cash, energy: option.energy, paidBy: byAd ? 'AD' : null })],
        };
        message = takedown
            ? path === 'ENERGY' ? 'Taken down: the copies are gone, and its viewers are back on your service.'
                : path === 'FIX' ? `Takedowns filed: the copies come down in ${option.weeks} week${option.weeks === 1 ? '' : 's'}, about half of them right away.`
                    : `Letting it run: ${option.weeks} more week${option.weeks === 1 ? '' : 's'} of viewers watching pirated copies, no cash.`
            : path === 'ENERGY' ? `Repaired: ${crisis.title}. It does no more damage.`
                : path === 'FIX' ? `Fix under way: repaired in ${option.weeks} weeks, at about half the harm until then.`
                    : `Waiting it out: ${option.weeks} more week${option.weeks === 1 ? '' : 's'} of damage, no cash.`;
    } else if (incident) {
        const operations = platform.crisisSecurity.infrastructureOperations;
        const updated: OwnedStreamingInfrastructureIncident = path === 'ENERGY'
            ? { ...incident, stage: 'RESOLVED', resolvedAtAbsoluteWeek: absoluteWeek, responseCost: option.cash, statusRepair: repair,
                outcomeNote: `Repaired the week it was taken: ${how}.` }
            : path === 'FIX'
                ? { ...incident, stage: 'RECOVERING', responseAction: 'ISOLATE_AND_REPAIR', recoveryReadyAtAbsoluteWeek: fixedBy, responseCost: option.cash, statusRepair: repair,
                    outcomeNote: `A ${money(option.cash)} fix is under way: repaired by week ${fixedBy}.` }
                : { ...incident, statusRepair: repair };
        /* repaired at once: the site's checks pass as a verified recovery's do */
        const facilities = path !== 'ENERGY' ? platform.infrastructureSetup?.facilities : platform.infrastructureSetup?.facilities?.map(facility => {
            if (facility.id !== incident.facilityId) return facility;
            const physical = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
            return { ...facility, physical: { ...physical, maintenanceConditionPercent: Math.min(96, physical.maintenanceConditionPercent + 14), lastMaintenanceAbsoluteWeek: absoluteWeek } };
        });
        next = {
            ...platform,
            treasuryCash: platform.treasuryCash - option.cash,
            ...(platform.infrastructureSetup && facilities ? { infrastructureSetup: { ...platform.infrastructureSetup, facilities } } : {}),
            crisisSecurity: {
                ...platform.crisisSecurity,
                publicTrust: clampScore(platform.crisisSecurity.publicTrust + (path === 'ENERGY' ? 2 : 0)),
                infrastructureOperations: { ...operations, incidents: operations.incidents.map(item => (item.id === incident.id ? updated : item)) },
            },
            eventLedger: [...platform.eventLedger, ledgerEntry(platform, absoluteWeek, path === 'ENERGY' ? 'INFRASTRUCTURE_INCIDENT_RECOVERED' : 'INFRASTRUCTURE_RESPONSE_LOCKED', key,
                path === 'ENERGY' ? `${incident.title} was repaired the week it was taken.` : path === 'FIX' ? `A fix was funded for ${incident.title}.` : `Leadership chose to wait out ${incident.title}.`,
                { incidentId: incident.id, statusRepair: path, cash: option.cash, energy: option.energy, paidBy: byAd ? 'AD' : null })],
        };
        message = path === 'ENERGY' ? `Repaired: ${incident.title}. The site is back to full strength.`
            : path === 'FIX' ? `Fix under way: repaired in ${option.weeks} weeks, at about half the harm until then.`
                : `Waiting it out: ${option.weeks} more week${option.weeks === 1 ? '' : 's'} of damage, no cash.`;
    }
    const nextPlayer: Player = {
        ...player,
        energy: { ...player.energy },
        flags: { ...player.flags },
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(next, player.id),
    };
    if (option.energy > 0) spendPlayerEnergy(nextPlayer, option.energy, `Repair: ${target.title}`);
    return { changed: true, player: nextPlayer, message };
};
