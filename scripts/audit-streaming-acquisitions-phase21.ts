import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { commitStreamingCompetitiveWorldWeek, getStreamingCompetitiveWorld } from '../services/streamingCompetitiveWorld';
import {
    STREAMING_ACQUISITION_COMMITMENTS,
    STREAMING_INTEGRATION_MODES,
    acceptStreamingAcquisitionCounter,
    beatStreamingAcquisitionCounterbid,
    commissionStreamingDueDiligence,
    completeDueStreamingAcquisitionIntegrations,
    getStreamingAcquisitionCommand,
    getStreamingAcquisitionWeeklyEffects,
    lockStreamingAcquisitionFinancing,
    resolveStreamingRegulatoryReview,
    scoutStreamingAcquisitionTarget,
    seekStreamingAcquisitionApproval,
    signStreamingPlatformAcquisition,
    submitStreamingAcquisitionOffer,
    valueStreamingAcquisitionTarget,
} from '../services/streamingAcquisitions';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase21-player');
    const absoluteWeek = getAbsoluteWeek(48, 22);
    return {
        ...player,
        id: 'phase21-player',
        name: 'Ari Vale',
        age: 48,
        currentWeek: 22,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#d9b56d',
                secondaryColor: '#07090d',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 100,
            },
            foundingProfile: {
                incorporationModel: 'FIXED_V7',
                founderCashCharged: 85_000_000,
                setupCostsConsumed: 70_000_000,
                openingTreasuryCash: 15_000_000,
                outsideCapitalRaisedAtIncorporation: 0,
                debtPrincipalAtIncorporation: 0,
                founderOwnershipPercentAtIncorporation: 100,
                founderWasCeoAtIncorporation: true,
                incorporatedAtAbsoluteWeek: absoluteWeek - 100,
            },
            launchCommit: {
                id: 'phase21-launch',
                idempotencyKey: 'phase21-launch',
                committedAtAbsoluteWeek: absoluteWeek - 20,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 0,
                readinessScore: 96,
                forecastLikelyConcurrentStreams: 8_000_000,
                forecastHighConcurrentStreams: 14_000_000,
                protectedPeakConcurrentStreams: 30_000_000,
                launchHeadroomPercent: 114,
                initialSubscribers: 18_000_000,
                openingDemandIndex: 88,
                playbackSuccessRate: 99.85,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 8,
                openingOriginalTitle: 'Signal Fire',
            },
            infrastructureStrategy: 'HYBRID',
            capacity: { baselineConcurrentStreams: 25_000_000, burstConcurrentStreams: 40_000_000 },
            technologyLevels: Object.fromEntries(
                Object.keys(initial.technologyLevels).map(key => [key, 60]),
            ) as typeof initial.technologyLevels,
            treasuryCash: 500_000_000_000,
            metrics: {
                ...initial.metrics,
                subscribers: 32_000_000,
                technologyHealth: 90,
                engagementRate: 0.76,
            },
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 22, 'Phase 24 should advance the owned-streaming schema to v22.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 18 }, 'phase21-migration');
assert(migrated.schemaVersion === 22, 'Schema v18 saves should migrate to v22.');
assert(migrated.corporateDevelopment.acquisitionCases.length === 0, 'Legacy saves must receive a safe empty corporate-development state.');
assert(STREAMING_ACQUISITION_COMMITMENTS.length === 4, 'The acquisition system should expose four durable seller, board and regulator commitments.');
assert(STREAMING_INTEGRATION_MODES.length === 8, 'All eight locked integration strategies should be playable.');

let player = createFixture();
const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
player = {
    ...player,
    ownedStreamingPlatform: commitStreamingCompetitiveWorldWeek(
        player.ownedStreamingPlatform,
        player,
        absoluteWeek,
    ),
};
assert(getStreamingCompetitiveWorld(player).rivals.length === 5, 'The acquisition market should consume the same five canonical Phase 20 rivals.');

const treasuryBeforeScout = player.ownedStreamingPlatform.treasuryCash;
let action = scoutStreamingAcquisitionTarget(player, 'HULU');
assert(action.changed && action.caseId, 'A live platform should be able to open a confidential target file.');
player = action.player;
const caseId = action.caseId!;
assert(player.ownedStreamingPlatform.treasuryCash === treasuryBeforeScout, 'Scouting should not fabricate or consume money.');
assert(!scoutStreamingAcquisitionTarget(player, 'HULU').changed, 'The same target cannot create duplicate live files.');

const treasuryBeforeValue = player.ownedStreamingPlatform.treasuryCash;
action = valueStreamingAcquisitionTarget(player, caseId);
assert(action.changed, 'An open target should accept one independent valuation.');
player = action.player;
let acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.valuation && acquisitionCase.valuation.fairValue > 0, 'Valuation should reconcile to a positive canonical fair value.');
assert(player.ownedStreamingPlatform.treasuryCash === treasuryBeforeValue - acquisitionCase.valuation.valuationCost, 'The disclosed valuation fee must debit treasury once.');
assert(!valueStreamingAcquisitionTarget(player, caseId).changed, 'Valuation cannot be charged twice.');

action = submitStreamingAcquisitionOffer(
    player,
    caseId,
    'STRATEGIC_MERGER',
    acquisitionCase.valuation.sellerFloor * 0.8,
    ['SERVICE_CONTINUITY'],
);
assert(action.changed, 'A valid control proposal should reach the seller.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.status === 'OFFER_COUNTERED' && acquisitionCase.offer?.sellerCounterPrice, 'A weak opening price should create a persistent seller counter.');
action = acceptStreamingAcquisitionCounter(player, caseId);
assert(action.changed, 'The player should be able to accept a disclosed seller counter.');
player = action.player;

const treasuryBeforeDiligence = player.ownedStreamingPlatform.treasuryCash;
const rivalCashBefore = new Map(player.ownedStreamingPlatform.competitiveWorld.rivals.map(rival => [rival.platformId, rival.cashReserveMillions]));
action = commissionStreamingDueDiligence(player, caseId);
assert(action.changed, 'Accepted economics should open full diligence.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.diligence?.issues.length && acquisitionCase.diligence.adjustedFairValue > 0, 'Diligence should expose persistent priced risks and adjusted value.');
assert(player.ownedStreamingPlatform.treasuryCash === treasuryBeforeDiligence - acquisitionCase.diligence.commissionedCost, 'Diligence must debit its disclosed cost once.');
assert(acquisitionCase.counterbid?.status === 'OPEN', 'A contested catalog target should produce one resource-backed rival counterbid.');
const counterbid = acquisitionCase.counterbid!;
const bidderAfter = player.ownedStreamingPlatform.competitiveWorld.rivals.find(rival => rival.platformId === counterbid.bidderPlatformId)!;
assert(bidderAfter.cashReserveMillions === rivalCashBefore.get(counterbid.bidderPlatformId)! - counterbid.pursuitCostMillions, 'The rival counterbid must consume real rival cash.');

action = beatStreamingAcquisitionCounterbid(player, caseId);
assert(action.changed, 'The founder should be able to raise to the disclosed control price.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.status === 'APPROVALS' && acquisitionCase.finalPurchasePrice === counterbid.playerRequiredBid, 'Winning the bid should persist the final purchase price.');

action = seekStreamingAcquisitionApproval(
    player,
    caseId,
    ['SERVICE_CONTINUITY', 'EMPLOYEE_PROTECTION', 'CREATOR_GUARANTEE', 'DATA_SEPARATION'],
);
assert(action.changed, 'The acquisition should pass through the actual governance posture.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.approval?.status === 'APPROVED' && acquisitionCase.status === 'REGULATORY_REVIEW', 'Founder control should create an advisory approval without a fake board veto.');

action = resolveStreamingRegulatoryReview(player, caseId, 'ASSET_CARVEOUT');
assert(action.changed, 'A structural remedy should receive a canonical regulatory decision.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.regulatoryReview?.status === 'CLEARED_WITH_REMEDIES', 'The carve-out route should clear with disclosed asset retention and remedy cost.');
assert(acquisitionCase.regulatoryReview.subscriberRetentionPercent === 75, 'The regulator should reduce the actual subscriber asset transferred.');

action = lockStreamingAcquisitionFinancing(player, caseId, 'HYBRID');
assert(action.changed, 'A sufficiently capitalized platform should be able to lock hybrid merger financing.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
assert(acquisitionCase.financing?.debtPrincipal && acquisitionCase.financing.equityConsideration > 0, 'A strategic-merger hybrid stack should expose both debt and equity consideration.');
assert(acquisitionCase.financing.founderOwnershipAfter < acquisitionCase.financing.founderOwnershipBefore, 'Merger equity should disclose real founder dilution before signing.');

const treasuryBeforeSigning = player.ownedStreamingPlatform.treasuryCash;
const subscribersBeforeSigning = player.ownedStreamingPlatform.metrics.subscribers;
const debtBeforeSigning = player.ownedStreamingPlatform.debtPrincipal;
action = signStreamingPlatformAcquisition(player, caseId, 'PRESERVE_BRAND');
assert(action.changed, 'A fully cleared and financed transaction should sign.');
player = action.player;
acquisitionCase = player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === caseId)!;
const integration = player.ownedStreamingPlatform.corporateDevelopment.integrations.find(item => item.acquisitionCaseId === caseId)!;
const financing = acquisitionCase.financing!;
assert(acquisitionCase.status === 'SIGNED' && integration.status === 'IN_PROGRESS', 'Signing should atomically create one live integration.');
assert(player.ownedStreamingPlatform.treasuryCash === treasuryBeforeSigning - financing.treasuryContribution - integration.capitalReserve, 'Signing should debit only treasury consideration and the funded integration reserve.');
assert(player.ownedStreamingPlatform.debtPrincipal === debtBeforeSigning + financing.debtPrincipal, 'Acquisition debt should enter canonical company debt exactly once.');
assert(player.ownedStreamingPlatform.founderOwnershipPercent === financing.founderOwnershipAfter, 'Merger consideration should update canonical founder ownership.');
assert(player.ownedStreamingPlatform.metrics.subscribers === subscribersBeforeSigning + integration.acquiredSubscriberCount, 'Only retained, regulator-cleared subscribers should transfer.');
assert(!player.ownedStreamingPlatform.competitiveWorld.rivals.some(rival => rival.platformId === 'HULU'), 'An acquired platform must stop operating as an independent Phase 20 rival.');
assert(player.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds.includes('HULU'), 'Dedicated corporate-development ownership should reserve the acquired platform.');
assert(player.ownedStreamingPlatform.cinematicQueue.filter(event => event.type === 'ACQUISITION_SIGNING').length === 1, 'Signing should queue one fact-backed major cinematic.');
assert(!signStreamingPlatformAcquisition(player, caseId, 'PRESERVE_BRAND').changed, 'Replaying signing must never charge or transfer subscribers twice.');

const weeklyEffects = getStreamingAcquisitionWeeklyEffects(player.ownedStreamingPlatform);
assert(weeklyEffects.weeklyOperatingCost === integration.weeklyOperatingCost && weeklyEffects.reliabilityRisk > 0, 'An in-progress integration should enter weekly cost and reliability pressure.');
const healthBeforeCompletion = player.ownedStreamingPlatform.metrics.technologyHealth;
const completion = completeDueStreamingAcquisitionIntegrations(
    player.ownedStreamingPlatform,
    integration.readyAtAbsoluteWeek,
);
assert(completion.completedIntegrations.length === 1, 'A due integration should complete on its canonical game week.');
assert(completion.platform.metrics.technologyHealth >= healthBeforeCompletion, 'A completed integration should convert retained technology into an operating benefit.');
assert(completion.platform.eventLedger.filter(entry => entry.type === 'ACQUISITION_INTEGRATION_COMPLETED').length === 1, 'Integration completion should create one permanent ledger fact.');
assert(completeDueStreamingAcquisitionIntegrations(completion.platform, integration.readyAtAbsoluteWeek).completedIntegrations.length === 0, 'The same integration must not complete twice.');

const service = readFileSync(resolve(process.cwd(), 'services/streamingAcquisitions.ts'), 'utf8');
const legacyAcquisition = readFileSync(resolve(process.cwd(), 'services/studioAcquisition.ts'), 'utf8');
const component = readFileSync(resolve(process.cwd(), 'components/StreamingAcquisitionCommand.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-acquisition-command.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const weekly = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert(legacyAcquisition.includes('STREAMING_PLATFORM_RESERVED'), 'The existing studio-acquisition route must continue to reserve streaming platforms.');
assert(service.includes('signStreamingPlatformAcquisition') && service.includes('completeDueStreamingAcquisitionIntegrations'), 'Phase 21 should own the only deliberate platform-signing and integration path.');
assert(component.includes('Target room') && component.includes('Data room') && component.includes('Regulatory review') && component.includes('Capital stack'), 'The playable command should cover scouting, diligence, clearance and financing.');
assert(component.includes('ACQUISITION_SIGNING') && component.includes('Skip ceremony'), 'The signing cinematic should be fact-backed, skippable and replay-safe.');
assert(styles.includes('@media (max-width: 640px)') && styles.includes('prefers-reduced-motion'), 'The acquisition command should include explicit mobile and reduced-motion treatment.');
assert(hq.includes('showAcquisitionCommand') && hq.includes('StreamingAcquisitionCommand'), 'Market HQ should launch Acquisition Command as a first-class room.');
assert(weekly.includes('getStreamingAcquisitionWeeklyEffects') && weekly.includes('acquisitionIntegrationCost'), 'The canonical weekly loop should reconcile integration consequences.');
assert(!component.includes('IPO') && !component.includes('server hack') && !component.includes('Buy acquisition'), 'Phase 21 must not leak IPO, shadow-operations or monetized-win systems.');

console.log('✓ Streaming Mergers, Acquisitions and Integration Phase 21 audit passed');
