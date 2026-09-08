import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingExecutiveAppointment,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    beginNextStreamingEra,
    createStreamingLegacyMontage,
    enactStreamingSuccession,
    getStreamingEraWeeklyEffects,
    getStreamingLegacyOffice,
    handoffOwnedStreamingPlatformToHeir,
    planStreamingSuccession,
} from '../services/streamingLegacy';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const absoluteWeek = getAbsoluteWeek(58, 30);
    const platform = createInitialOwnedStreamingPlatformState('phase24-player');
    const executive: OwnedStreamingExecutiveAppointment = {
        id: 'phase24-executive-appointment',
        executiveId: 'phase24-coo',
        role: 'COO',
        nameAtAppointment: 'Maya Sen',
        status: 'ACTIVE',
        origin: 'INTERNAL_PROMOTION',
        appointedAtAbsoluteWeek: absoluteWeek - 30,
        endedAtAbsoluteWeek: null,
        weeklyCompensation: 180_000,
        skill: 86,
        loyalty: 91,
        ambition: 72,
        ethics: 88,
        preferredStrategy: 'BALANCED',
        founderRelationship: 92,
        internalRelationship: 90,
        performance: 89,
        level: 5,
        experience: 42,
    };
    return {
        ...player,
        id: 'phase24-player',
        name: 'Ari Vale',
        age: 58,
        currentWeek: 30,
        relationships: [{
            id: 'phase24-heir',
            npcId: 'phase24-heir',
            name: 'Rhea Vale',
            relation: 'Child',
            closeness: 88,
            age: 24,
            gender: 'FEMALE',
            image: '',
            lastInteractionWeek: 28,
        }],
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#d2a452',
                secondaryColor: '#090806',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'BALANCED',
                foundedAtAbsoluteWeek: absoluteWeek - 120,
                publicManifesto: 'One screen for every kind of story.',
            },
            leadership: {
                ...platform.leadership,
                appointments: [executive],
                currentCeo: { holderType: 'FOUNDER', executiveId: null, sinceAbsoluteWeek: absoluteWeek - 120 },
            },
            launchCommit: {
                id: 'phase24-launch',
                idempotencyKey: 'phase24-launch',
                committedAtAbsoluteWeek: absoluteWeek - 90,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 0,
                readinessScore: 93,
                forecastLikelyConcurrentStreams: 1_000_000,
                forecastHighConcurrentStreams: 1_600_000,
                protectedPeakConcurrentStreams: 2_000_000,
                launchHeadroomPercent: 25,
                initialSubscribers: 2_000_000,
                openingDemandIndex: 82,
                playbackSuccessRate: 99.3,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 8,
                openingOriginalTitle: 'Signal House',
            },
            treasuryCash: 420_000_000,
            metrics: {
                subscribers: 18_000_000,
                netSubscriberMovement: 220_000,
                churnRate: 0.017,
                engagementRate: 0.76,
                averageRevenuePerUser: 12.4,
                cashRunwayWeeks: 92,
                technologyHealth: 94,
            },
            technologyLevels: {
                DELIVERY_CAPACITY: 72,
                PLAYBACK_QUALITY: 78,
                RELIABILITY: 82,
                DATA_RECOMMENDATIONS: 75,
                SECURITY: 80,
                CONTENT_OPERATIONS: 68,
                ADVERTISING_COMMERCE: 52,
                PRODUCT_EXPERIENCE: 74,
            },
            legacy: {
                ...platform.legacy,
                currentEraStartedAtAbsoluteWeek: absoluteWeek - 120,
            },
            lastProcessedAbsoluteWeek: absoluteWeek,
            eventLedger: [
                {
                    id: 'phase24-founding-fact',
                    idempotencyKey: 'phase24-founding-fact',
                    absoluteWeek: absoluteWeek - 120,
                    type: 'FOUNDATION_CREATED',
                    summary: 'Northstar+ incorporated.',
                    source: 'FOUNDING',
                },
                {
                    id: 'phase24-launch-fact',
                    idempotencyKey: 'phase24-launch-fact',
                    absoluteWeek: absoluteWeek - 90,
                    type: 'LAUNCH_COMMITTED',
                    summary: 'Northstar+ opened to its first audience.',
                    source: 'PLAYER_ACTION',
                },
                {
                    id: 'phase24-milestone-fact',
                    idempotencyKey: 'phase24-milestone-fact',
                    absoluteWeek: absoluteWeek - 20,
                    type: 'MILESTONE_REACHED',
                    summary: 'Northstar+ crossed 10 million subscribers.',
                    source: 'WEEK_PROCESSOR',
                },
            ],
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The canonical foundation should own streaming schema v23.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 21 }, 'phase24-migration');
assert(
    migrated.schemaVersion === 23
    && migrated.legacy.currentEraNumber === 1
    && migrated.legacy.founderOfficeRole === 'FOUNDER_CEO'
    && migrated.legacy.closedEras.length === 0,
    'Schema v21 saves should receive a safe founding-era legacy aggregate.',
);

let player = createFixture();
let office = getStreamingLegacyOffice(player);
assert(office.available && office.milestones.length === 3, 'Legacy Office should derive history from canonical company facts.');
assert(office.candidates.some(item => item.id === 'phase24-coo'), 'Active executives should become evidence-scored succession candidates.');
assert(office.candidates.some(item => item.id === 'phase24-heir'), 'Existing children should appear through the canonical family legacy system.');

const planAction = planStreamingSuccession(player, 'EXECUTIVE', 'phase24-coo', 'TECHNOLOGY_LEADERSHIP');
assert(planAction.changed, 'The founder should be able to designate an active executive without retiring the player.');
player = planAction.player;
assert(player.ownedStreamingPlatform.legacy.successionPlan?.candidateName === 'Maya Sen', 'The named succession plan should persist.');

const successionAction = enactStreamingSuccession(player, 'EXECUTIVE_CHAIR');
assert(successionAction.changed, 'A designated executive should be able to assume the CEO office.');
player = successionAction.player;
assert(
    player.ownedStreamingPlatform.leadership.currentCeo.executiveId === 'phase24-coo'
    && player.ownedStreamingPlatform.legacy.founderOfficeRole === 'EXECUTIVE_CHAIR'
    && player.ownedStreamingPlatform.legacy.currentEraNumber === 2
    && player.ownedStreamingPlatform.founderOwnershipPercent === 100,
    'Operational succession should open a new era without changing actual ownership.',
);
assert(!enactStreamingSuccession(player, 'FOUNDER_EMERITUS').changed, 'The same transition cannot commit twice.');
assert(player.ownedStreamingPlatform.eventLedger.some(item => item.type === 'COMPANY_ERA_CLOSED'), 'The founding era should enter the permanent record.');

const effects = getStreamingEraWeeklyEffects(player.ownedStreamingPlatform);
assert(effects.mandate === 'TECHNOLOGY_LEADERSHIP' && effects.playbackBoost > 0, 'The new era mandate should affect the canonical weekly model.');

let film = createStreamingLegacyMontage(player);
assert(film.changed && film.montage?.chapters.length === 3, 'The archive should cut a personalized film from retained company facts.');
player = film.player;
film = createStreamingLegacyMontage(player);
assert(!film.changed && film.montage?.id === player.ownedStreamingPlatform.legacy.montages[0].id, 'The same era film should be idempotent and replayable.');

const afterTwelveWeeks = {
    ...player,
    currentWeek: player.currentWeek + 12,
};
const eraAction = beginNextStreamingEra(afterTwelveWeeks, 'GLOBAL_EXPANSION');
assert(eraAction.changed && eraAction.player.ownedStreamingPlatform.legacy.currentEraNumber === 3, 'Endless play should archive a mature era and open the next mandate.');

const heirPlatform = handoffOwnedStreamingPlatformToHeir(
    player,
    { id: 'phase24-heir', name: 'Rhea Vale' },
    24,
    player.currentWeek,
);
const heirAbsoluteWeek = getAbsoluteWeek(24, player.currentWeek);
assert(
    heirPlatform.identity?.name === 'Northstar+'
    && heirPlatform.legacy.endlessMode
    && heirPlatform.legacy.currentEraNumber === 3
    && heirPlatform.leadership.currentCeo.holderType === 'FOUNDER',
    'The existing family handoff should preserve the platform and open a new family era.',
);
assert(
    (heirPlatform.lastProcessedAbsoluteWeek || 0) <= heirAbsoluteWeek,
    'Inherited company clocks must rebase so the heir can process the next platform week immediately.',
);
assert(heirPlatform.eventLedger.some(item => item.type === 'GENERATION_HANDOFF'), 'The dynasty transfer should remain a canonical company fact.');

console.log('EMPIRE+ Phase 24 legacy and endless-company audit passed.');
console.log('✓ Schema v22 safely migrates existing platforms into a founding legacy era');
console.log('✓ Timeline, identity and montage read real retained company facts');
console.log('✓ Executive succession separates CEO authority from founder ownership');
console.log('✓ Era mandates create small persistent weekly effects and endless new chapters');
console.log('✓ Existing family legacy handoff preserves and rebases the streaming company');
