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
    getStreamingCataloguePackageOpportunities,
    getStreamingRightsOpportunities,
    openStreamingRightsNegotiation,
    openStreamingRightsRenewal,
    processStreamingPrivateOffersWeek,
    signStreamingRightsDeal,
    signOwnedStreamingCataloguePackage,
    submitStreamingRightsOffer,
} from '../services/streamingRightsMarketplace';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
} from '../services/streamingRightsCore';

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
            } as any, {
                id: 'market-title-2', title: 'The Long Weekend', mediaType: 'MOVIE', genre: 'DRAMA', rating: 7.4,
                year: 2025, boxOffice: 120_000_000, studioId,
            } as any, {
                id: 'market-title-3', title: 'Cobalt Run', mediaType: 'MOVIE', genre: 'ACTION', rating: 6.9,
                year: 2024, boxOffice: 75_000_000, studioId,
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
                publicManifesto: 'Northstar backs bold event stories for every market.',
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
        if (negotiation.responseStatus === 'AWAITING_RESPONSE' && negotiation.responseDueAbsoluteWeek != null) {
            current = processStreamingPrivateOffersWeek(current, negotiation.responseDueAbsoluteWeek).player;
            continue;
        }
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
const packageOpportunities = getStreamingCataloguePackageOpportunities(fixture);
assert(packageOpportunities.length > 0, 'The owned platform market should expose real same-studio catalogue packages.');
const packageOpportunity = packageOpportunities[0];
assert(packageOpportunity.package.components.length >= 3, 'A listed package must contain the real source titles.');
assert(new Set(packageOpportunity.rows.map(row => row.minimumGuarantee)).size > 1, 'The owned platform sees a value-based title schedule rather than an equal split.');
assert(packageOpportunity.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0) === packageOpportunity.totalGuarantee, 'The seller schedule must reconcile to the package headline.');
const packageTreasuryBefore = fixture.ownedStreamingPlatform.treasuryCash;
const boughtPackage = signOwnedStreamingCataloguePackage(fixture, packageOpportunity.id);
assert(boughtPackage.changed, 'A funded owned platform should be able to acquire the complete package.');
assert(boughtPackage.contracts.length === packageOpportunity.package.components.length, 'The package purchase must create one canonical contract per title.');
assert(boughtPackage.player.ownedStreamingPlatform.treasuryCash === packageTreasuryBefore - packageOpportunity.totalGuarantee, 'The owned platform pays the package once.');
assert(boughtPackage.player.world.streamingCataloguePackages?.[packageOpportunity.package.id]?.lifecycle === 'SIGNED', 'The package history must link the child contracts.');
const packageReplay = signOwnedStreamingCataloguePackage(boughtPackage.player, packageOpportunity.id);
assert(!packageReplay.changed, 'An owned platform package purchase must be idempotent.');
const opportunities = getStreamingRightsOpportunities(fixture);
const studioOpportunity = opportunities.find(item => item.kind === 'STUDIO_ACQUISITION');
assert(studioOpportunity, 'The rights floor should expose studio-to-platform acquisition opportunities.');
assert(studioOpportunity?.rivalPlatformName && studioOpportunity.rivalBidAmount > 0, 'Every acquisition should carry financially bounded rival pressure.');
assert(
    !opportunities.some(item => item.kind === 'PLATFORM_TRADE' && item.sourceLicenseId === null),
    'A platform trade must never be fabricated from a title label without a canonical seller contract.',
);

const opened = openStreamingRightsNegotiation(fixture, studioOpportunity!.id);
assert(opened.changed && opened.negotiation?.status === 'OPEN', 'A market listing should open a persisted term sheet.');
fixture = driveToSignature(opened.player, opened.negotiation!.id);
let acquisition = fixture.ownedStreamingPlatform.rightsNegotiations.find(item => item.id === opened.negotiation!.id)!;
assert(acquisition.status === 'READY_TO_SIGN', 'A viable negotiated or accepted counteroffer should reach signature.');
const acquisitionAbsoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
const hotstarIndiaContract = createStreamingRightsContractFromLicense({
    license: createStreamingLicenseContract({
        id: 'hotstar-india-exclusive',
        sourceProject: { id: acquisition.sourceProjectId, title: acquisition.title, mediaType: acquisition.projectType, genre: acquisition.genre },
        buyerPlatformId: null,
        platformContentPlanId: null,
        cataloguePackageId: null,
        licensorName: acquisition.sellerName,
        territory: 'DOMESTIC',
        countryIds: ['IN'],
        durationWeeks: 80,
        exclusivity: 'EXCLUSIVE',
        minimumGuarantee: 30_000_000,
        platformRevenueShare: 90,
        signedAtAbsoluteWeek: acquisitionAbsoluteWeek - 1,
        startsAtAbsoluteWeek: acquisitionAbsoluteWeek - 1,
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        sellerType: 'STUDIO',
        sellerPlatformId: null,
        windowType: 'FIRST_WINDOW',
    }),
    seller: { type: 'NPC_STUDIO', id: acquisition.sellerId, name: acquisition.sellerName, platformId: null },
    buyer: { type: 'AI_PLATFORM', id: 'hotstar', name: 'Hotstar', platformId: null },
    guaranteeDisposition: 'PAID',
    settledAtAbsoluteWeek: acquisitionAbsoluteWeek - 1,
});
const blockedAcquisitionPlayer: Player = {
    ...fixture,
    world: {
        ...fixture.world,
        streamingRightsContracts: {
            ...fixture.world.streamingRightsContracts,
            [hotstarIndiaContract.id]: hotstarIndiaContract,
        },
    },
};
const blockedTreasury = blockedAcquisitionPlayer.ownedStreamingPlatform.treasuryCash;
const blockedAcquisition = signStreamingRightsDeal(blockedAcquisitionPlayer, acquisition.id);
assert(!blockedAcquisition.changed, 'A player platform cannot acquire a global scope already granted in India.');
assert(blockedAcquisition.reason === 'RIGHTS_UNAVAILABLE', 'Compatibility failure should have a rights-specific reason.');
assert(
    blockedAcquisition.detail === `India is exclusively licensed to Hotstar until Week ${hotstarIndiaContract.expiresAtAbsoluteWeek}.`,
    'The player should receive a short factual controlling-contract explanation.',
);
assert(blockedAcquisition.player.ownedStreamingPlatform.treasuryCash === blockedTreasury, 'A rejected rights deal must not debit treasury.');
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
const disallowedSublicensePlayer: Player = {
    ...fixture,
    world: {
        ...fixture.world,
        streamingRightsContracts: {
            ...fixture.world.streamingRightsContracts,
            [acquiredLicense.id]: {
                ...fixture.world.streamingRightsContracts[acquiredLicense.id],
                sublicensingAllowed: false,
            },
        },
    },
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        catalogLicenses: fixture.ownedStreamingPlatform.catalogLicenses.map(license => (
            license.id === acquiredLicense.id ? { ...license, sublicensingAllowed: false } : license
        )),
    },
};
const disallowedSublicense = signStreamingRightsDeal(disallowedSublicensePlayer, outgoingReady.id);
assert(!disallowedSublicense.changed, 'A source contract without sublicense permission must stop before signing.');
assert(disallowedSublicense.reason === 'RIGHTS_RESTRICTED', 'Disallowed sublicensing should return the rights-restricted reason.');
assert(disallowedSublicense.detail === 'The source contract does not permit sublicensing.', 'Disallowed sublicensing should explain the source-contract restriction.');
const treasuryBeforeSublicense = fixture.ownedStreamingPlatform.treasuryCash;
const sublicensed = signStreamingRightsDeal(fixture, outgoingReady.id);
assert(sublicensed.changed, 'A ready outgoing sublicense should sign.');
fixture = sublicensed.player;
assert(fixture.ownedStreamingPlatform.sublicenseDeals.length === 1, 'The outgoing platform trade should persist separately from inbound rights.');
const signedSublicense = fixture.ownedStreamingPlatform.sublicenseDeals[0]!;
assert(Array.isArray(signedSublicense.countryIds) && signedSublicense.countryIds.length === 1, 'A domestic sublicense must persist one exact country.');
assert(signedSublicense.windowType === outgoingReady.windowType, 'A sublicense must persist its exact streaming window.');
assert(
    fixture.world.streamingRightsContracts?.[signedSublicense.id]?.buyer.platformId === signedSublicense.buyerPlatformId,
    'An outgoing sublicense must register the rival platform as the canonical buyer.',
);
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBeforeSublicense + outgoingReady.minimumGuarantee, 'Sublicense cash should credit treasury exactly once.');
const sublicenseTransaction = Object.values(fixture.world.streamingRightsTransactions || {}).find(transaction => (
    transaction.kind === 'SUBLICENSE' && transaction.sourceContractId === acquiredLicense.id
));
assert(sublicenseTransaction, 'An outgoing sublicense must settle through the shared A6 transaction history.');
assert(sublicenseTransaction?.sellerReceipt === outgoingReady.minimumGuarantee, 'The platform seller receives the complete sublicense fee.');
assert(sublicenseTransaction?.originalOwnerParticipation === 0, 'A downstream sublicense does not create a transfer participation payment.');

const earlyRenewal = openStreamingRightsRenewal(fixture, acquiredLicense.id);
assert(!earlyRenewal.changed && earlyRenewal.reason === 'NOT_READY', 'A4 should keep a renewal closed before its saved notice window.');
const renewalOpenAbsoluteWeek = acquiredLicense.expiresAtAbsoluteWeek - 8;
const renewalFixture: Player = {
    ...fixture,
    age: Math.floor(renewalOpenAbsoluteWeek / 52) + 1,
    currentWeek: (renewalOpenAbsoluteWeek % 52) + 1,
};
const renewal = openStreamingRightsRenewal(renewalFixture, acquiredLicense.id);
assert(renewal.changed && renewal.negotiation?.kind === 'RENEW', 'Renewal options should open a future-window negotiation inside the A4 notice window.');

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
assert(!terminated.changed, 'A6 change of platform control must retain the acquired licence and its obligations.');
assert(terminated.player.ownedStreamingPlatform.catalogLicenses.find(item => item.id === acquiredLicense.id)?.status === 'ACTIVE', 'A valid licence must not terminate solely because platform control changed.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingRightsExchange.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-rights-exchange.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
assert(component.includes('Every title has a price. Every clause has a consequence.'), 'The exchange should open with a cinematic rights-floor thesis.');
assert(component.includes('Contract vault') && component.includes('PERFORMANCE OBLIGATIONS'), 'The UI should expose contract and compliance evidence.');
assert(component.includes('Catalogue packages') && component.includes('Acquire complete package'), 'The Market Floor should expose portfolio-scale buying without hiding title schedules.');
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
