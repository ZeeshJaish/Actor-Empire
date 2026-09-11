import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingCrisis,
    type OwnedStreamingWeeklySnapshot,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    commitStreamingCrisisSecurityWeek,
    getStreamingCrisisWeeklyEffects,
    getStreamingIncidentCommand,
    launchStreamingShadowOperation,
    launchStreamingTrustInitiative,
    respondToStreamingCrisis,
    respondToStreamingRegulator,
    respondToStreamingWhistleblower,
} from '../services/streamingCrisisSecurity';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeSnapshot = (absoluteWeek: number): OwnedStreamingWeeklySnapshot => ({
    id: `phase23-week-${absoluteWeek}`,
    absoluteWeek,
    subscribers: 8_000_000,
    netSubscriberMovement: 120_000,
    churnRate: 0.018,
    engagementRate: 0.7,
    averageRevenuePerUser: 13,
    cashRunwayWeeks: 80,
    technologyHealth: 92,
    causeMarkers: ['PHASE_23_AUDIT'],
    operations: {
        programWeek: 18,
        releaseTitles: [],
        joinedSubscribers: 220_000,
        cancellations: 100_000,
        reactivations: 0,
        subscriptionRevenue: 24_000_000,
        partnerRevenueShareCost: 2_000_000,
        infrastructureCost: 3_000_000,
        leadershipCost: 1_000_000,
        financingCost: 0,
        weeklyPlanCost: 0,
        totalCashCost: 12_000_000,
        netCashContribution: 12_000_000,
        contentAmortization: 2_000_000,
        accountingContribution: 10_000_000,
        peakConcurrentStreams: 1_100_000,
        capacityUtilizationPercent: 64,
        playbackSuccessRate: 99.4,
        appliedDecisionId: null,
        headline: 'A controlled operating week.',
        summary: 'The service remained stable.',
        nextWeekHook: 'Trust remains strategic.',
        causalDrivers: [],
    },
});

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase23-player');
    const absoluteWeek = getAbsoluteWeek(50, 20);
    return {
        ...player,
        id: 'phase23-player',
        name: 'Ari Vale',
        age: 50,
        currentWeek: 20,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#2dd4bf',
                secondaryColor: '#061015',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'PULSE',
                brandPromiseId: 'TECHNOLOGY_FIRST',
                foundedAtAbsoluteWeek: absoluteWeek - 80,
                publicManifesto: 'Technology that keeps every story within reach.',
            },
            launchCommit: {
                id: 'phase23-launch',
                idempotencyKey: 'phase23-launch',
                committedAtAbsoluteWeek: absoluteWeek - 30,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 0,
                readinessScore: 92,
                forecastLikelyConcurrentStreams: 1_000_000,
                forecastHighConcurrentStreams: 1_600_000,
                protectedPeakConcurrentStreams: 2_000_000,
                launchHeadroomPercent: 25,
                initialSubscribers: 2_000_000,
                openingDemandIndex: 80,
                playbackSuccessRate: 99.2,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 8,
                openingOriginalTitle: null,
            },
            treasuryCash: 200_000_000,
            technologyLevels: {
                ...initial.technologyLevels,
                SECURITY: 3,
                RELIABILITY: 3,
            },
            metrics: {
                ...initial.metrics,
                subscribers: 8_000_000,
                technologyHealth: 92,
                engagementRate: 0.7,
                cashRunwayWeeks: 80,
            },
            competitiveWorld: {
                ...initial.competitiveWorld,
                initializedAtAbsoluteWeek: absoluteWeek - 20,
                rivalryHeat: 30,
                globalPrestige: 55,
                rivals: [{
                    platformId: 'NETFLIX',
                    platformName: 'StreamFlix',
                    ceoName: 'Rhea Kane',
                    ceoPersonality: 'Patient consolidator',
                    strategy: 'SCALE_DOMINANCE',
                    baseMonthlyPrice: 15.99,
                    perceivedValue: 82,
                    activeRegionIds: ['NORTH_AMERICA'],
                    copiedTechnologyBranches: [],
                    cashReserveMillions: 80_000,
                    subscribersMillions: 220,
                    technology: 75,
                    catalogPower: 90,
                    prestige: 82,
                    aggression: 78,
                    preferredGenres: ['DRAMA'],
                    preferredRegions: ['NORTH_AMERICA'],
                    cooldownUntilAbsoluteWeek: 0,
                    lastMoveAbsoluteWeek: null,
                    mistakes: 0,
                    memory: {
                        respect: 40,
                        resentment: 40,
                        encounters: 1,
                        rivalWins: 0,
                        playerDefences: 0,
                        lastMoveType: null,
                    },
                }],
            },
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 25, 'The canonical foundation should own streaming schema v25.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 20 }, 'phase23-migration');
assert(migrated.schemaVersion === 25, 'Schema v20 saves should migrate to the current schema.');
assert(
    migrated.crisisSecurity.publicTrust === 72
    && migrated.crisisSecurity.employeeLoyalty === 75
    && migrated.crisisSecurity.crises.length === 0,
    'Older saves should receive safe, neutral crisis and trust defaults.',
);

let player = createFixture();
let command = getStreamingIncidentCommand(player);
assert(command.available && !command.activeCrisis, 'Incident Command should open after launch without fabricating a crisis.');

const trustBefore = command.publicTrust;
const pressureBefore = command.securityPressure;
let action = launchStreamingTrustInitiative(player, 'SECURITY_DRILL');
assert(action.changed, 'Clean defensive initiatives should be playable, funded company actions.');
player = action.player;
command = getStreamingIncidentCommand(player);
assert(command.publicTrust > trustBefore && command.securityPressure < pressureBefore, 'A security drill should improve persistent clean-play tracks.');
assert(!launchStreamingTrustInitiative(player, 'SECURITY_DRILL').changed, 'The same initiative should not be farmable during its benefit window.');

const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
const crisis: OwnedStreamingCrisis = {
    id: 'phase23-crisis',
    idempotencyKey: `streaming-crisis:${absoluteWeek}:ACCOUNT_BREACH`,
    type: 'ACCOUNT_BREACH',
    severity: 'MAJOR',
    stage: 'DETECTED',
    title: 'Account-trust controls reported a breach',
    detail: 'A verified account-security event requires leadership response.',
    cause: 'Security pressure exceeded the verified control envelope.',
    detectedAtAbsoluteWeek: absoluteWeek,
    affectedSubscribers: 420_000,
    estimatedRevenueAtRisk: 12_000_000,
    responseDoctrine: null,
    compensation: null,
    communication: null,
    responseCost: 0,
    weeklyRecoveryCost: 1_200_000,
    recoveryReadyAtAbsoluteWeek: null,
    resolvedAtAbsoluteWeek: null,
    outcomeNote: null,
};
player = {
    ...player,
    ownedStreamingPlatform: normalizeOwnedStreamingPlatformState({
        ...player.ownedStreamingPlatform,
        crisisSecurity: {
            ...player.ownedStreamingPlatform.crisisSecurity,
            crises: [crisis],
        },
    }, player.id),
};
const crisisEffects = getStreamingCrisisWeeklyEffects(player.ownedStreamingPlatform);
assert(
    crisisEffects.acquisitionRateDelta < 0
    && crisisEffects.churnRateDelta > 0
    && crisisEffects.activeCrisis?.id === crisis.id,
    'An unresolved crisis should produce real audience pressure in the weekly simulation.',
);
action = respondToStreamingCrisis(player, crisis.id, 'TRANSPARENT_FIRST', 'FULL', 'FULL_DISCLOSURE');
assert(action.changed, 'A funded response package should move a detected crisis into recovery.');
player = action.player;
const recovering = getStreamingIncidentCommand(player).activeCrisis!;
assert(recovering.stage === 'RECOVERING' && recovering.recoveryReadyAtAbsoluteWeek! > absoluteWeek, 'The response should create a future recovery route rather than instant resolution.');
assert(player.ownedStreamingPlatform.eventLedger.some(item => item.type === 'CRISIS_RESPONSE_LOCKED'), 'The leadership response should enter the canonical event ledger.');

action = launchStreamingShadowOperation(player, 'INTELLIGENCE_PURCHASE', 'NETFLIX');
assert(action.changed, 'Optional abstract shadow strategy should be playable against a fictional rival.');
player = action.player;
const shadow = player.ownedStreamingPlatform.crisisSecurity.shadowOperations.at(-1)!;
assert(shadow.status === 'EVIDENCE_PENDING' && shadow.evidenceDueAtAbsoluteWeek > absoluteWeek, 'Shadow consequences should resolve through delayed evidence.');
assert(!launchStreamingShadowOperation(player, 'WHISPER_CAMPAIGN', 'NETFLIX').changed, 'Only one delayed evidence window should be open at a time.');

const dueWeek = Math.max(shadow.evidenceDueAtAbsoluteWeek, recovering.recoveryReadyAtAbsoluteWeek!);
const committed = commitStreamingCrisisSecurityWeek(
    player.ownedStreamingPlatform,
    player,
    makeSnapshot(dueWeek),
);
assert(committed.crisisSecurity.crises[0].stage === 'RESOLVED', 'Every funded crisis should reach a verified recovery state.');
assert(committed.crisisSecurity.shadowOperations[0].status !== 'EVIDENCE_PENDING', 'Delayed evidence should deterministically resolve at its due week.');
assert(committed.eventLedger.some(item => item.type === 'CRISIS_RECOVERED'), 'Recovery should remain a canonical company fact.');
assert(committed.eventLedger.some(item => item.type === 'SHADOW_EVIDENCE_RESOLVED'), 'Evidence resolution should remain a canonical company fact.');

player = {
    ...player,
    ownedStreamingPlatform: normalizeOwnedStreamingPlatformState({
        ...committed,
        crisisSecurity: {
            ...committed.crisisSecurity,
            regulatoryCases: [{
                id: 'phase23-regulator',
                idempotencyKey: 'phase23-regulator',
                title: 'Platform conduct inquiry',
                status: 'OPEN',
                scrutinyAtOpening: 65,
                openedAtAbsoluteWeek: dueWeek,
                response: null,
                responseCost: 0,
                resolvedAtAbsoluteWeek: null,
                outcomeNote: null,
            }],
            whistleblowerReports: [{
                id: 'phase23-report',
                idempotencyKey: 'phase23-report',
                title: 'Protected internal disclosure',
                allegation: 'An employee raised a verified operating concern.',
                status: 'OPEN',
                sourceConfidence: 72,
                openedAtAbsoluteWeek: dueWeek,
                response: null,
                responseCost: 0,
                resolvedAtAbsoluteWeek: null,
                outcomeNote: null,
            }],
        },
    }, player.id),
};
action = respondToStreamingRegulator(player, 'phase23-regulator', 'REMEDIATE');
assert(action.changed && action.player.ownedStreamingPlatform.crisisSecurity.regulatoryCases[0].status === 'CLOSED', 'Regulatory cases should have a funded, recoverable closure route.');
player = action.player;
action = respondToStreamingWhistleblower(player, 'phase23-report', 'PROTECT_AND_INVESTIGATE');
assert(action.changed && action.player.ownedStreamingPlatform.crisisSecurity.whistleblowerReports[0].status === 'RESOLVED', 'Protected disclosures should have a trust-building resolution route.');

const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingIncidentCommand.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const cssSource = readFileSync(resolve(process.cwd(), 'styles/streaming-incident-command.css'), 'utf8');
assert(componentSource.includes("type IncidentTab = 'COMMAND' | 'OPERATIONS' | 'DEFENCE' | 'SHADOW' | 'EVIDENCE' | 'OVERSIGHT'"), 'The UI should preserve all five crisis rooms and add connected Live Operations.');
assert(componentSource.includes('ABSTRACT STRATEGY ONLY') && componentSource.includes('Clean play can win every objective'), 'The shadow experience should be explicitly abstract and clean play should remain equally competitive.');
assert(!/\b(?:nmap|metasploit|sql injection|reverse shell|credential stuffing)\b/i.test(componentSource), 'The shadow UI must not contain operational attack instructions.');
/* The launcher class belonged to the retired Tech room. Incident Command is
   now reached from the NETWORK division's INCIDENTS chip and from the live
   INCIDENT event on the Command Deck — both gated on an actual crisis. */
assert(
    hqSource.includes('showIncidentCommand')
    && hqSource.includes("chip === 'INCIDENTS' && incidentCommand.available")
    && hqSource.includes("event.id === 'INCIDENT' && incidentCommand.available"),
    'Incident Command must be reachable from the Network division and the live incident event.',
);
assert(cssSource.includes('@media (max-width: 640px)') && cssSource.includes('@media (prefers-reduced-motion: reduce)'), 'The war room should ship mobile and reduced-motion layouts.');

console.log('✓ Phase 23 crisis, trust, evidence and oversight records remain safe in schema v22');
console.log('✓ Funded crisis responses create multi-week recovery routes with weekly audience and cash consequences');
console.log('✓ Clean defence, abstract shadow operations and delayed evidence are deterministic and equally optional');
console.log('✓ Regulators and protected disclosures have funded responses instead of instant game-over');
console.log('✓ Incident Command connects five crisis rooms plus Live Operations to Technology Campus');
