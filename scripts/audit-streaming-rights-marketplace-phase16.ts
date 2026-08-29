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
import {
    acceptStreamingRightsCounter,
    applyStreamingRightsChangeOfControl,
    evaluateStreamingRightsCompliance,
    getStreamingRightsOpportunities,
    openStreamingRightsNegotiation,
    openStreamingRightsRenewal,
    signStreamingRightsDeal,
    submitStreamingRightsOffer,
} from '../services/streamingRightsMarketplace';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase16-player');
    const studioId = Object.keys(player.world.studios)[0] as keyof typeof player.world.studios;
    const absoluteWeek = getAbsoluteWeek(44, 12);
    return {
        ...player,
        id: 'phase16-player',
        age: 44,
        currentWeek: 12,
        pastProjects: [{
            id: 'platform-trade-title',
            name: 'Borrowed Crown',
            studioId,
            projectType: 'SERIES',
            genre: 'DRAMA',
            rating: 8,
            imdbRating: 8,
            gross: 160_000_000,
            streamingPlatform: 'NETFLIX',
        } as any],
        world: {
            ...player.world,
            projects: [{
                id: 'market-title',
                title: 'The Signal Cartel',
                mediaType: 'MOVIE',
                genre: 'THRILLER',
                rating: 8.2,
                year: 2025,
                boxOffice: 280_000_000,
                studioId,
            } as any],
        },
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#22d3ee',
                secondaryColor: '#070912',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 20,
            },
            starterCatalog: {
                packageId: 'CURATED_PREMIERE',
                ownedProjectIds: [],
                licensedProjectIds: [],
                establishedAtAbsoluteWeek: absoluteWeek - 15,
            },
            treasuryCash: 500_000_000,
        },
    };
};

const driveToSignature = (player: Player, negotiationId: string): Player => {
    let current = player;
    for (let round = 0; round < 3; round += 1) {
        const negotiation = current.ownedStreamingPlatform.rightsNegotiations.find(item => item.id === negotiationId);
        if (!negotiation || negotiation.status === 'READY_TO_SIGN' || negotiation.status === 'LOST') break;
        if (negotiation.status === 'COUNTERED') {
            const accepted = acceptStreamingRightsCounter(current, negotiationId);
            assert(accepted.changed, 'A live counteroffer should be acceptible.');
            current = accepted.player;
            break;
        }
        const submitted = submitStreamingRightsOffer(current, negotiationId);
        assert(submitted.changed, 'Each live negotiation round should resolve deterministically.');
        current = submitted.player;
    }
    return current;
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The canonical foundation should preserve the Phase 16 rights market in schema v23.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 13 }, 'phase16-migration');
assert(migrated.rightsNegotiations.length === 0, 'Older saves should migrate without fabricated negotiations.');
assert(migrated.sublicenseDeals.length === 0, 'Older saves should migrate without fabricated sublicenses.');
assert(migrated.rightsObligations.length === 0, 'Older saves should migrate without fabricated contract obligations.');

let fixture = createFixture();
const opportunities = getStreamingRightsOpportunities(fixture);
const studioOpportunity = opportunities.find(item => item.kind === 'STUDIO_ACQUISITION');
assert(studioOpportunity, 'The rights floor should expose studio-to-platform acquisition opportunities.');
assert(studioOpportunity?.rivalPlatformName && studioOpportunity.rivalBidAmount > 0, 'Every acquisition should carry financially bounded rival pressure.');
assert(opportunities.some(item => item.kind === 'PLATFORM_TRADE' && item.sellerPlatformId === 'NETFLIX'), 'The rights floor should expose platform-to-platform catalog trading.');

const opened = openStreamingRightsNegotiation(fixture, studioOpportunity!.id);
assert(opened.changed && opened.negotiation?.status === 'OPEN', 'A market listing should open a persisted term sheet.');
fixture = driveToSignature(opened.player, opened.negotiation!.id);
let acquisition = fixture.ownedStreamingPlatform.rightsNegotiations.find(item => item.id === opened.negotiation!.id)!;
assert(acquisition.status === 'READY_TO_SIGN', 'A viable negotiated or accepted counteroffer should reach signature.');
const treasuryBeforeAcquisition = fixture.ownedStreamingPlatform.treasuryCash;
const signed = signStreamingRightsDeal(fixture, acquisition.id);
assert(signed.changed, 'A funded acquisition should sign.');
fixture = signed.player;
const acquiredLicense = fixture.ownedStreamingPlatform.catalogLicenses.find(item => item.sourceProjectId === 'market-title')!;
assert(acquiredLicense?.origin === 'STUDIO_MARKET', 'Studio deals should retain their acquisition origin.');
const canonicalAcquiredContract = fixture.world.streamingRightsContracts?.[acquiredLicense.id];
assert(canonicalAcquiredContract, 'A signed owned-platform licence should register one world-level canonical contract.');
assert(canonicalAcquiredContract?.sourceProjectId === acquiredLicense.sourceProjectId, 'The projection and canonical contract should reference the same project.');
assert(canonicalAcquiredContract?.minimumGuarantee === acquiredLicense.minimumGuarantee, 'The projection and canonical contract should retain the same guarantee.');
assert(canonicalAcquiredContract?.buyer.type === 'PLAYER_PLATFORM', 'The canonical buyer should be the player-owned streaming platform.');
assert(acquiredLicense.sublicensingAllowed, 'Negotiated sublicensing rights should persist in the contract.');
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBeforeAcquisition - acquisition.minimumGuarantee, 'The guarantee should debit platform treasury exactly once.');
assert(fixture.ownedStreamingPlatform.rightsObligations.length === 2, 'Marketing and viewership promises should become tracked obligations.');

const outgoingOpportunity = getStreamingRightsOpportunities(fixture).find(item => (
    item.kind === 'SUBLICENSE_OUT' && item.sourceLicenseId === acquiredLicense.id
));
assert(outgoingOpportunity, 'A sublicensable inbound contract should create a platform-to-platform sales opportunity.');
const outgoingOpened = openStreamingRightsNegotiation(fixture, outgoingOpportunity!.id);
assert(outgoingOpened.changed && outgoingOpened.negotiation?.buyerPlatformId, 'An outgoing sales table should snapshot a real rival platform buyer.');
fixture = driveToSignature(outgoingOpened.player, outgoingOpened.negotiation!.id);
const outgoingReady = fixture.ownedStreamingPlatform.rightsNegotiations.find(item => item.id === outgoingOpened.negotiation!.id)!;
assert(outgoingReady.status === 'READY_TO_SIGN', 'Outgoing negotiations should use the same competitive deal loop.');
const treasuryBeforeSublicense = fixture.ownedStreamingPlatform.treasuryCash;
const sublicensed = signStreamingRightsDeal(fixture, outgoingReady.id);
assert(sublicensed.changed, 'A ready outgoing sublicense should sign.');
fixture = sublicensed.player;
assert(fixture.ownedStreamingPlatform.sublicenseDeals.length === 1, 'The outgoing platform trade should persist separately from inbound rights.');
const signedSublicense = fixture.ownedStreamingPlatform.sublicenseDeals[0]!;
assert(
    fixture.world.streamingRightsContracts?.[signedSublicense.id]?.buyer.platformId === signedSublicense.buyerPlatformId,
    'An outgoing sublicense must register the rival platform as the canonical buyer.',
);
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBeforeSublicense + outgoingReady.minimumGuarantee, 'Sublicense cash should credit treasury exactly once.');

const renewal = openStreamingRightsRenewal(fixture, acquiredLicense.id);
assert(renewal.changed && renewal.negotiation?.kind === 'RENEW', 'Renewal options should open a future-window negotiation.');

const complianceWeek = Math.max(...fixture.ownedStreamingPlatform.rightsObligations.map(item => item.dueAtAbsoluteWeek)) + 1;
const compliance = evaluateStreamingRightsCompliance(fixture.ownedStreamingPlatform, complianceWeek);
assert(compliance.platform.rightsObligations.every(item => item.status === 'BREACHED'), 'Unmet due obligations should breach from canonical evidence.');
assert(compliance.complianceCost > 0, 'Breaches should return a real weekly cash penalty.');
const complianceAgain = evaluateStreamingRightsCompliance({
    ...compliance.platform,
    eventLedger: [...compliance.platform.eventLedger, ...compliance.ledgerEntries],
}, complianceWeek + 1);
assert(complianceAgain.complianceCost === 0, 'The same breach must never charge twice.');

const controlledFixture: Player = {
    ...fixture,
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        catalogLicenses: fixture.ownedStreamingPlatform.catalogLicenses.map(item => (
            item.id === acquiredLicense.id
                ? { ...item, changeOfControl: 'CONSENT_REQUIRED', cancellationPenalty: 2_000_000 }
                : item
        )),
    },
};
const terminated = applyStreamingRightsChangeOfControl(controlledFixture, acquiredLicense.id, false);
assert(terminated.changed, 'Denied change-of-control consent should terminate the protected contract.');
assert(terminated.player.ownedStreamingPlatform.catalogLicenses.find(item => item.id === acquiredLicense.id)?.status === 'TERMINATED', 'Termination state should persist.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingRightsExchange.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-rights-exchange.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
assert(component.includes('Every title has a price. Every clause has a consequence.'), 'The exchange should open with a cinematic rights-floor thesis.');
assert(component.includes('Contract vault') && component.includes('PERFORMANCE OBLIGATIONS'), 'The UI should expose contract and compliance evidence.');
assert(styles.includes('@media (max-width: 560px)') && styles.includes('prefers-reduced-motion'), 'The exchange should have explicit mobile and motion-safe treatment.');
/* The launcher moved from the retired Content/Market rooms to the Command
   Deck's CONTENT chips and the Content Desk's renew/lapse actions. Asserting
   the live route rather than the old button's label. */
assert(
    hq.includes('showRightsExchange')
    && hq.includes("chip === 'RIGHTS'")
    && hq.includes('onRenew={() => setShowRightsExchange(true)}'),
    'The rights exchange must be reachable from the Content division and the Content Desk.',
);

console.log('EMPIRE+ Phase 16 Rights Marketplace audit passed.');
