import {getStreamingBuyerBackendCapability, streamingBackendPercentForBuyer, validateNewStreamingBackendTerms} from './streamingBackendPolicy';
import type { Genre, IndustryProject, Player, StreamingOpportunityOffer } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { NPC_DATABASE } from './npcLogic';
import { WRITER_NPC_LIBRARY } from './writerNpcLibrary';
import { getStreamingMarketCycle } from './streamingMarketSupply';
import { getStreamingCataloguePackageOpportunities } from './streamingRightsMarketplace';
import { getActiveStreamingQuoteVersion, getStreamingLicenseQuote } from './streamingCatalog';
import { normalizeOwnedStreamingPlatformState, compactOwnedStreamingPlatformForPersistence } from './ownedStreamingPlatform';
import { createStreamingLicenseContract, createStreamingRightsContractFromLicense,
    registerStreamingRightsContract } from './streamingRightsCore';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { creditTalentProject, creditTalentUpfront } from './talentCareer';
import { PLATFORM_AI_PROFILES } from './platformAi/platformAiProfiles';
import { createStreamingRightsAccessGrantForOffer } from './streamingRightsAccessGrant';
import { appendIndustryEventFacts, createIndustryEventFact } from './industryWorld/industryEventLedger';

const GENRES: Genre[] = ['DRAMA', 'THRILLER', 'COMEDY', 'ACTION', 'ROMANCE', 'MYSTERY',
    'HORROR', 'SCI_FI', 'ADVENTURE', 'BIOPIC', 'SPORTS', 'ANIMATION', 'FANTASY', 'CRIME'];
const OPENERS = ['A Certain', 'Beyond', 'Last', 'Northern', 'The Quiet', 'The Broken',
    'Midnight', 'Blue', 'Shadow', 'Wild', 'The Second', 'Golden', 'After', 'Paper'];
const SUBJECTS = ['Harbour', 'Orbit', 'Promise', 'Signal', 'Summer', 'Atlas', 'Valley',
    'Letter', 'Crown', 'Frontier', 'House', 'River', 'Witness', 'Garden', 'Crossing'];
const ENDINGS = ['at Dawn', 'in Winter', 'of Glass', 'Beyond the Sea', 'After Dark',
    'Remembered', 'in Motion', 'of Tomorrow', 'Under Stars', 'Unspoken'];
const TITLE_QUALIFIERS = ['Amber', 'Ancient', 'Burning', 'Crimson', 'Distant', 'Emerald',
    'Forgotten', 'Hidden', 'Hollow', 'Ivory', 'Lasting', 'Lost', 'Lunar', 'Copper',
    'Cinder', 'Restless', 'Silver', 'Silent', 'Solitary', 'Southern', 'Open', 'Velvet',
    'Wandering', 'Winter'];
const SCOUT_PREFIXES = ['Echoes of', 'Stories from', 'Letters to', 'Secrets of', 'Paths through', 'Voices from'];
const actors = NPC_DATABASE.filter(npc => npc.id.startsWith('celeb_act_'))
    .sort((left, right) => left.id.localeCompare(right.id));
const directors = NPC_DATABASE.filter(npc => npc.id.startsWith('celeb_dir_'))
    .sort((left, right) => left.id.localeCompare(right.id));

export const buildStreamingOpportunityOffer = (
    player: Player, cycle: number, index: number, lane: 'PUBLIC' | 'BROKERED' | 'SCOUTED' = 'PUBLIC',
): StreamingOpportunityOffer => {
    const rng = createDeterministicRng(`${player.id}:market-opportunity:v1:${cycle}:${lane}:${index}`);
    const genre = GENRES[Math.floor(rng() * GENRES.length)];
    const writer = WRITER_NPC_LIBRARY[Math.floor(rng() * WRITER_NPC_LIBRARY.length)];
    const director = directors[Math.floor(rng() * directors.length)];
    const lead = actors[Math.floor(rng() * actors.length)];
    const supporting = actors[Math.floor(rng() * actors.length)];
    const studios = Object.values(player.world.studios || {})
        .filter(studio => studio.id && studio.archetype !== 'PLATFORM')
        .sort((left, right) => left.id.localeCompare(right.id));
    const historical = player.world.historicalCatalogue?.producerRoster || [];
    const seller = studios[Math.floor(rng() * studios.length)]
        || historical[Math.floor(rng() * historical.length)];
    const sellerId = seller?.id || 'independent-rights-holder';
    const sellerName = seller?.name || 'Independent rights holder';
    const titleCode = lane === 'SCOUTED' ? index : cycle * 22 + index;
    const opener = OPENERS[titleCode % OPENERS.length];
    const subject = SUBJECTS[Math.floor(titleCode / OPENERS.length) % SUBJECTS.length];
    const ending = ENDINGS[Math.floor(titleCode / (OPENERS.length * SUBJECTS.length)) % ENDINGS.length];
    // A three-week market eventually exhausts the base name space. Keep the
    // saved seed/identity stable, but introduce new title variants before it
    // wraps so a decades-old acquired film cannot be advertised again.
    const titleVariant = Math.floor(titleCode / (OPENERS.length * SUBJECTS.length * ENDINGS.length));
    const firstQualifierIndex = (titleVariant - 1) % TITLE_QUALIFIERS.length;
    const secondQualifierIndex = (Math.floor((titleVariant - 1) / TITLE_QUALIFIERS.length) - 1)
        % TITLE_QUALIFIERS.length;
    const distinctSecondIndex = secondQualifierIndex === firstQualifierIndex
        ? (secondQualifierIndex + 1) % TITLE_QUALIFIERS.length : secondQualifierIndex;
    const qualifier = titleVariant > 0
        ? `${TITLE_QUALIFIERS[firstQualifierIndex]}${titleVariant > TITLE_QUALIFIERS.length
            ? ` ${TITLE_QUALIFIERS[distinctSecondIndex]}` : ''} ` : '';
    const title = lane === 'SCOUTED'
        ? `${SCOUT_PREFIXES[(titleCode + titleVariant) % SCOUT_PREFIXES.length]} ${opener} ${qualifier}${subject} ${ending}`
        : `${opener} ${qualifier}${subject} ${ending}`;
    const premium = index % 9 === 0;
    const qualityForecast = Math.round((premium ? 84 : 48) + rng() * (premium ? 12 : 39));
    const budgetTier = premium ? (index % 18 === 0 ? 'BLOCKBUSTER' : 'HIGH')
        : index % 7 === 0 ? 'LOW' : index % 3 === 0 ? 'HIGH' : 'MID';
    const pricingVersion = getActiveStreamingQuoteVersion(player.ownedStreamingPlatform.marketQuotePolicy,
        getAbsoluteWeek(player.age, player.currentWeek));
    const askingPrice = pricingVersion === 3
        ? getStreamingLicenseQuote({ id: '', title, projectType: index % 5 === 0 ? 'SERIES' : 'MOVIE', genre,
            rating: null, releaseYear: null, gross: null, studioId: sellerId, studioName: sellerName,
            source: 'EXTERNAL_MARKET', quality: qualityForecast,
            reach: Math.min(100, 38 + qualityForecast * .36 + (premium ? 18 : 0)),
            prestige: Math.min(100, 32 + qualityForecast * .42 + (premium ? 22 : 0)),
            budgetTier, catalogueTier: premium ? 'MARQUEE' : undefined },
        'GLOBAL', 104, 'NON_EXCLUSIVE', pricingVersion, 'FIRST_WINDOW', player.age).suggestedGuarantee
        : Math.round((premium ? 20_000_000 + rng() * 35_000_000
            : 2_000_000 + rng() * 14_000_000) / 250_000) * 250_000;
    // Keep legacy shelf prices on their original RNG sequence during an in-flight rollout.
    const productionBudgetEstimate = Math.round(({
        LOW: 8_000_000, MID: 35_000_000, HIGH: 80_000_000, BLOCKBUSTER: 180_000_000,
    }[budgetTier] * (.85 + rng() * .3)) / 250_000) * 250_000;
    const id = createDeterministicId('streaming_opportunity', player.id, cycle, lane, index);
    return {
        id, projectId: createDeterministicId('market_project', id), cycle, title,
        logline: `${sellerName} presents a ${genre.toLowerCase().replaceAll('_', ' ')} story about a choice that changes the fate of the ${subject.toLowerCase()}.`,
        projectType: index % 5 === 0 ? 'SERIES' : 'MOVIE', genre,
        originalLanguageId: writer.languages[0] === 'hi' ? 'hindi' : writer.languages[0] === 'ja'
            ? 'japanese' : writer.languages[0] === 'fr' ? 'french' : writer.languages[0] === 'es'
                ? 'spanish' : 'english',
        sellerId, sellerName, writerId: writer.id, writerName: writer.name,
        directorId: director.id, directorName: director.name,
        leadActorId: lead.id, leadActorName: lead.name,
        cast: [...new Map([lead, supporting].map(npc => [npc.id, { id: npc.id, name: npc.name }])).values()],
        askingPrice, qualityForecast, premium,
        budgetTier, productionBudgetEstimate,
        talentUpfrontPool: pricingVersion === 3
            ? Math.round(productionBudgetEstimate * (premium ? .1 : .08))
            : Math.round(askingPrice * (premium ? .12 : .08)),
    };
};

/** The UI reads this saved snapshot; it never generates or rerolls on mount. */
export const getStreamingOpportunityCards = (player: Player) => {
    const state = player.world.streamingOpportunityMarket;
    if (!state || state.schemaVersion !== 1
        || state.cycle !== getStreamingMarketCycle(getAbsoluteWeek(player.age, player.currentWeek))) {
        return { individuals: [], collections: [] };
    }
    const collectionIds = new Set([...state.collectionIds,
        ...(Array.isArray(state.scoutedCollectionIds) ? state.scoutedCollectionIds : [])]);
    const collections = getStreamingCataloguePackageOpportunities(player)
        .filter(collection => collectionIds.has(collection.id));
    return { individuals: [...state.offers,
        ...(Array.isArray(state.scoutedOffers) ? state.scoutedOffers : [])], collections };
};

/** One persisted, absolute-week transition. Unsold cards disappear at cycle rollover. */
export const advanceStreamingOpportunityMarket = (
    player: Player, absoluteWeek: number = getAbsoluteWeek(player.age, player.currentWeek),
): Player => {
    if (!['FOUNDING', 'ACTIVE'].includes(player.ownedStreamingPlatform?.lifecycle)) return player;
    const cycle = getStreamingMarketCycle(absoluteWeek);
    const prior = player.world.streamingOpportunityMarket;
    if (prior && (prior.schemaVersion !== 1 || !Array.isArray(prior.offers)
        || !Array.isArray(prior.collectionIds) || typeof prior.sellerReceipts !== 'object')) {
        throw new Error('Unsupported or damaged streaming opportunity market; preserve the save for recovery.');
    }
    if (prior?.cycle === cycle) return player;
    const collectionIds = getStreamingCataloguePackageOpportunities(player)
        .slice(0, 5).map(collection => collection.id);
    return { ...player, world: { ...player.world, streamingOpportunityMarket: {
        schemaVersion: 1,
        cycle,
        openedAtAbsoluteWeek: absoluteWeek,
        offers: Array.from({ length: 20 }, (_, index) => buildStreamingOpportunityOffer(player, cycle, index)),
        collectionIds,
        scoutedOffers: [],
        scoutedCollectionIds: [],
        paidScoutCount: 0,
        sellerReceipts: prior?.sellerReceipts || {},
        lastRivalCycle: prior?.lastRivalCycle ?? null,
        lastRivalPublicWeek: null,
    } } };
};

export interface StreamingOpportunityPurchaseResult {
    player: Player;
    changed: boolean;
    detail: string;
}

/** One atomic buyer/seller/rights/career transition; unsold cards remain inert. */
export const purchaseStreamingOpportunityOffer = (
    player: Player, offerId: string,
): StreamingOpportunityPurchaseResult => {
    const fail = (detail: string): StreamingOpportunityPurchaseResult => ({ player, changed: false, detail });
    const state = player.world.streamingOpportunityMarket;
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    if (!state || state.schemaVersion !== 1 || state.cycle !== getStreamingMarketCycle(now)) return fail('This market cycle has closed.');
    const offer = [...state.offers,
        ...(Array.isArray(state.scoutedOffers) ? state.scoutedOffers : [])].find(item => item.id === offerId);
    if (!offer) return fail('This opportunity is no longer available.');
    if (player.world.projects.some(project => project.id === offer.projectId)) return fail('This project has already entered the world.');
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) return fail('Open your streaming platform before signing.');
    const commitments = platform.costCommitments.filter(item => item.status === 'COMMITTED')
        .reduce((sum, item) => sum + item.committedAmount, 0);
    if (platform.treasuryCash - commitments < offer.askingPrice) return fail('Available platform funds cannot cover this agreement.');
    const compatible = resolveStreamingRightsCompatibility({ world: player.world,
        sourceProjectId: offer.projectId, buyerPlatformId: null, sellerPartyId: offer.sellerId,
        territory: 'GLOBAL', countryIds: [], startsAtAbsoluteWeek: now,
        expiresAtAbsoluteWeek: now + 104, windowType: 'FIRST_WINDOW', exclusivity: 'NON_EXCLUSIVE' });
    if (!compatible.available) return fail(compatible.summary);
    const license = createStreamingLicenseContract({
        id: createDeterministicId('market_package_right', offer.id),
        sourceProject: { id: offer.projectId, title: offer.title, mediaType: offer.projectType, genre: offer.genre },
        buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
        licensorName: offer.sellerName, territory: 'GLOBAL', countryIds: [], durationWeeks: 104,
        exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: offer.askingPrice, platformRevenueShare: 100 - streamingBackendPercentForBuyer(player,null,now,10),
        signedAtAbsoluteWeek: now, startsAtAbsoluteWeek: now,
        origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
        windowType: 'FIRST_WINDOW', accessGrant: createStreamingRightsAccessGrantForOffer(
            platform.serviceConfiguration.pricing.streams, false),
    });
    const registration = registerStreamingRightsContract(player.world.streamingRightsContracts,
        createStreamingRightsContractFromLicense({ license,
            seller: { type: 'NPC_STUDIO', id: offer.sellerId, name: offer.sellerName, platformId: null },
            buyer: { type: 'PLAYER_PLATFORM', id: platform.identity?.slug || `player-platform:${player.id}`,
                name: platform.identity?.name || 'Your platform', platformId: null },
            guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: now,
            sourceOfferId: offer.id, idempotencyKey: `market-package:${offer.id}` }));
    if (!registration.changed) return fail('These rights have already been signed.');
    const project: IndustryProject = {
        id: offer.projectId, title: offer.title, genre: offer.genre,
        originalLanguageId: offer.originalLanguageId, mediaType: offer.projectType,
        targetAudience: offer.genre === 'HORROR' || offer.genre === 'CRIME' ? 'R' : 'PG-13',
        studioId: offer.sellerId, budgetTier: offer.budgetTier || (offer.premium ? 'HIGH' : 'MID'),
        quality: offer.qualityForecast, boxOffice: 0,
        year: player.age, weekReleased: player.currentWeek,
        leadActorId: offer.leadActorId, leadActorName: offer.leadActorName,
        directorId: offer.directorId, directorName: offer.directorName,
        writerId: offer.writerId, writerName: offer.writerName,
        reviews: '', marketOpportunityId: offer.id, marketAcquiredAtAbsoluteWeek: now,
        marketPremiereAtAbsoluteWeek: null,
    };
    const participants = [
        ...offer.cast.map(person => ({ talentId: person.id, talentName: person.name, role: 'ACTOR' as const })),
        { talentId: offer.directorId, talentName: offer.directorName, role: 'DIRECTOR' as const },
        { talentId: offer.writerId, talentName: offer.writerName, role: 'WRITER' as const },
    ];
    const credited = creditTalentProject({ ...player.world, projects: [...player.world.projects, project],
        streamingRightsContracts: registration.registry }, project.id, participants, `market-acquired:${offer.id}`, now);
    const upfront = creditTalentUpfront(credited, project.id, [
        { ...participants[0], amount: Math.round(offer.talentUpfrontPool * .5) },
        { ...participants[participants.length - 2], amount: Math.round(offer.talentUpfrontPool * .3) },
        { ...participants[participants.length - 1], amount: offer.talentUpfrontPool
            - Math.round(offer.talentUpfrontPool * .5) - Math.round(offer.talentUpfrontPool * .3) },
    ], `market-seller-settlement:${offer.id}`, now);
    const sellerNet = Math.max(0, offer.askingPrice - upfront.totalCredited);
    const seller = upfront.world.studios?.[offer.sellerId];
    const world = { ...upfront.world,
        industryEvents: appendIndustryEventFacts(upfront.world.industryEvents, [createIndustryEventFact({
            idempotencyKey: `market-opportunity-signed:${offer.id}`, absoluteWeek: now,
            type: 'RIGHTS_DEAL', importance: offer.premium ? 'HIGH' : 'MEDIUM',
            companyId: offer.sellerId, companyName: offer.sellerName,
            projectId: offer.projectId, rightsContractId: license.id,
            headline: `${platform.identity?.name || 'A streaming platform'} acquires ${offer.title}`,
            detail: `${offer.sellerName} licensed ${offer.title}. Its public premiere is still ahead.`,
            evidence: [{ kind: 'PROJECT', id: offer.projectId },
                { kind: 'RIGHTS_CONTRACT', id: license.id }],
        })]),
        ...(seller ? { studios: { ...upfront.world.studios, [seller.id]: {
            ...seller, cashReserve: seller.cashReserve + sellerNet / 1_000_000,
        } } } : {}),
        streamingOpportunityMarket: { ...state,
            offers: state.offers.filter(item => item.id !== offer.id),
            scoutedOffers: (Array.isArray(state.scoutedOffers) ? state.scoutedOffers : []).filter(item => item.id !== offer.id),
            sellerReceipts: { ...state.sellerReceipts,
                [offer.sellerId]: (state.sellerReceipts[offer.sellerId] || 0) + sellerNet },
        },
    };
    const eventKey = `market-package:${offer.id}`;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform,
        treasuryCash: platform.treasuryCash - offer.askingPrice,
        catalogLicenses: [...platform.catalogLicenses, license],
        catalogProjectIds: [...new Set([...platform.catalogProjectIds, offer.projectId])],
        eventLedger: [...platform.eventLedger, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, eventKey),
            idempotencyKey: eventKey, absoluteWeek: now, type: 'LICENSE_SIGNED',
            summary: `${offer.title} joined the catalogue from the content market.`,
            source: 'PLAYER_ACTION', metadata: { sourceProjectId: offer.projectId,
                minimumGuarantee: offer.askingPrice, sellerNet },
        }],
    }, player.id);
    return { player: { ...player, world, ownedStreamingPlatform: nextPlatform }, changed: true,
        detail: `${offer.title} joined your catalogue. Its public premiere will activate reviews and awards.` };
};

/** Public availability is separate from signing; no pre-premiere reviews or award year. */
export const processStreamingOpportunityPremieres = (player: Player, absoluteWeek: number): Player => {
    const platform = player.ownedStreamingPlatform;
    const playerActive = platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit);
    const ownedIds = new Set(playerActive ? platform.catalogProjectIds : []);
    let changed = false;
    const releaseFacts = [];
    const projects = player.world.projects.map(project => {
        if (!project.marketOpportunityId || project.marketPremiereAtAbsoluteWeek !== null
            || project.marketAcquiredAtAbsoluteWeek == null || absoluteWeek <= project.marketAcquiredAtAbsoluteWeek
            || (!ownedIds.has(project.id) && !project.marketBuyerPlatformId)) return project;
        const license = project.marketBuyerPlatformId
            ? Object.values(player.world.streamingRightsContracts || {}).find(item => item.sourceProjectId === project.id
                && item.buyerPlatformId === project.marketBuyerPlatformId && item.status === 'ACTIVE'
                && item.startsAtAbsoluteWeek <= absoluteWeek && item.expiresAtAbsoluteWeek >= absoluteWeek)
            : platform.catalogLicenses.find(item => item.sourceProjectId === project.id
                && item.status === 'ACTIVE' && item.startsAtAbsoluteWeek <= absoluteWeek
                && item.expiresAtAbsoluteWeek >= absoluteWeek);
        if (!license) return project;
        changed = true;
        const quality = project.quality;
        releaseFacts.push(createIndustryEventFact({
            idempotencyKey: `market-opportunity-premiere:${project.id}`, absoluteWeek,
            type: 'PROJECT_RELEASED', importance: quality >= 85 ? 'HIGH' : 'MEDIUM',
            companyId: project.studioId, projectId: project.id,
            platformId: project.marketBuyerPlatformId || undefined,
            headline: `${project.title} premieres on streaming`,
            detail: `The acquired project is now publicly available; reviews and award eligibility begin this season.`,
            evidence: [{ kind: 'PROJECT', id: project.id }],
        }));
        return { ...project, year: Math.floor(absoluteWeek / 52) + 1,
            weekReleased: absoluteWeek % 52 + 1,
            rating: Math.round(Math.min(9.7, 4.1 + quality * .055) * 10) / 10,
            reviews: quality >= 85 ? 'Critics praise the premiere.' : quality >= 65
                ? 'Reviews note a promising new release.' : 'Reviews are mixed.',
            marketPremiereAtAbsoluteWeek: absoluteWeek,
        };
    });
    return changed ? { ...player, world: { ...player.world, projects,
        industryEvents: appendIndustryEventFacts(player.world.industryEvents, releaseFacts),
    } } : player;
};

/** Rival brokered discovery never consumes the saved public shelf. Two funded deals max per cycle. */
export const processRivalBrokeredOpportunityWeek = (player: Player, absoluteWeek: number): Player => {
    const state = player.world.streamingOpportunityMarket;
    if (!state || state.schemaVersion !== 1) return player;
    const cycle = getStreamingMarketCycle(absoluteWeek);
    if (state.cycle !== cycle) return player;
    const brokeredDue = state.lastRivalCycle === null || state.lastRivalCycle < cycle;
    const publicDue = absoluteWeek > (state.openedAtAbsoluteWeek ?? cycle * 3)
        && absoluteWeek < cycle * 3 + 3
        && state.lastRivalPublicWeek !== absoluteWeek && state.offers.length > 12;
    if (!brokeredDue && !publicDue) return player;
    let world = player.world;
    const usedRivals = new Set<string>();
    const rivals = Object.values(world.platforms || {}).filter(platform => (
        platform.id in PLATFORM_AI_PROFILES && platform.ai?.status === 'ACTIVE'
        && Number.isFinite(platform.cashReserve)
    )).sort((left, right) => {
        const leftCount = Object.values(world.streamingRightsContracts || {})
            .filter(contract => contract.buyerPlatformId === left.id && contract.status === 'ACTIVE').length;
        const rightCount = Object.values(world.streamingRightsContracts || {})
            .filter(contract => contract.buyerPlatformId === right.id && contract.status === 'ACTIVE').length;
        return leftCount - rightCount || left.id.localeCompare(right.id);
    });
    const candidates: Array<{ offer: StreamingOpportunityOffer; lane: 'BROKERED' | 'PUBLIC' }> = [
        ...(brokeredDue ? Array.from({ length: 2 }, (_, index) => ({
            offer: buildStreamingOpportunityOffer(player, cycle, 20 + index, 'BROKERED' as const),
            lane: 'BROKERED' as const,
        })) : []),
        ...(publicDue ? state.offers.slice(12).sort((left, right) =>
            right.qualityForecast - left.qualityForecast || left.id.localeCompare(right.id))
            .map(offer => ({ offer, lane: 'PUBLIC' as const })) : []),
    ];
    let publicSigned = false;
    for (const { offer, lane } of candidates) {
        if (lane === 'PUBLIC' && publicSigned) break;
        if (world.projects.some(project => project.id === offer.projectId)
            || (lane === 'BROKERED' && state.offers.some(publicOffer => publicOffer.projectId === offer.projectId))) continue;
        const rival = rivals.find(candidate => {
            if (usedRivals.has(candidate.id)) return false;
            const profile = PLATFORM_AI_PROFILES[candidate.id];
            const floor = Math.max(25, profile.baseWeeklyOperationsMillions * 8);
            const spent = offer.askingPrice / 1_000_000;
            return candidate.cashReserve - spent >= floor
                && (profile.preferredGenres.includes(offer.genre) || offer.qualityForecast >= 75);
        });
        if (!rival) continue;
        const startsAtAbsoluteWeek = absoluteWeek + 2;
        const compatibility = resolveStreamingRightsCompatibility({ world,
            sourceProjectId: offer.projectId, buyerPlatformId: rival.id,
            sellerPartyId: offer.sellerId, territory: 'GLOBAL', countryIds: [],
            startsAtAbsoluteWeek, expiresAtAbsoluteWeek: startsAtAbsoluteWeek + 104,
            windowType: 'FIRST_WINDOW', exclusivity: 'NON_EXCLUSIVE' });
        if (!compatibility.available) continue;
        const license = createStreamingLicenseContract({
            id: createDeterministicId('market_brokered_right', offer.id, rival.id),
            sourceProject: { id: offer.projectId, title: offer.title, mediaType: offer.projectType, genre: offer.genre },
            buyerPlatformId: rival.id, platformContentPlanId: null, cataloguePackageId: null,
            licensorName: offer.sellerName, territory: 'GLOBAL', countryIds: [], durationWeeks: 104,
            exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: offer.askingPrice, platformRevenueShare: 100 - streamingBackendPercentForBuyer({...player,world},rival.id,absoluteWeek,10),
            signedAtAbsoluteWeek: absoluteWeek, startsAtAbsoluteWeek,
            origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
            windowType: 'FIRST_WINDOW', accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'],
                earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
        });
        const registered = registerStreamingRightsContract(world.streamingRightsContracts,
            createStreamingRightsContractFromLicense({ license,
                seller: { type: 'NPC_STUDIO', id: offer.sellerId, name: offer.sellerName, platformId: null },
                buyer: { type: 'AI_PLATFORM', id: rival.id, name: rival.name, platformId: rival.id },
                guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: absoluteWeek,
                sourceOfferId: offer.id, idempotencyKey: `market-${lane.toLowerCase()}:${offer.id}` }));
        if (!registered.changed) continue;
        const project: IndustryProject = {
            id: offer.projectId, title: offer.title, genre: offer.genre,
            originalLanguageId: offer.originalLanguageId, mediaType: offer.projectType,
            targetAudience: offer.genre === 'HORROR' || offer.genre === 'CRIME' ? 'R' : 'PG-13',
            studioId: offer.sellerId, budgetTier: offer.budgetTier || (offer.premium ? 'HIGH' : 'MID'),
            quality: offer.qualityForecast, boxOffice: 0,
            year: Math.floor(absoluteWeek / 52) + 1, weekReleased: absoluteWeek % 52 + 1,
            leadActorId: offer.leadActorId, leadActorName: offer.leadActorName,
            directorId: offer.directorId, directorName: offer.directorName,
            writerId: offer.writerId, writerName: offer.writerName,
            reviews: '', marketOpportunityId: offer.id, marketAcquiredAtAbsoluteWeek: absoluteWeek,
            marketPremiereAtAbsoluteWeek: null, marketBuyerPlatformId: rival.id,
        };
        const participants = [
            ...offer.cast.map(person => ({ talentId: person.id, talentName: person.name, role: 'ACTOR' as const })),
            { talentId: offer.directorId, talentName: offer.directorName, role: 'DIRECTOR' as const },
            { talentId: offer.writerId, talentName: offer.writerName, role: 'WRITER' as const },
        ];
        const credited = creditTalentProject({ ...world, projects: [...world.projects, project],
            streamingRightsContracts: registered.registry }, project.id, participants,
            `market-acquired:${offer.id}`, absoluteWeek);
        const upfront = creditTalentUpfront(credited, project.id, [
            { ...participants[0], amount: Math.round(offer.talentUpfrontPool * .5) },
            { ...participants[participants.length - 2], amount: Math.round(offer.talentUpfrontPool * .3) },
            { ...participants[participants.length - 1], amount: offer.talentUpfrontPool
                - Math.round(offer.talentUpfrontPool * .5) - Math.round(offer.talentUpfrontPool * .3) },
        ], `market-seller-settlement:${offer.id}`, absoluteWeek);
        const sellerNet = Math.max(0, offer.askingPrice - upfront.totalCredited);
        const seller = upfront.world.studios?.[offer.sellerId];
        world = { ...upfront.world,
            industryEvents: appendIndustryEventFacts(upfront.world.industryEvents, [createIndustryEventFact({
                idempotencyKey: `market-opportunity-signed:${offer.id}`, absoluteWeek,
                type: 'RIGHTS_DEAL', importance: offer.premium ? 'HIGH' : 'MEDIUM',
                companyId: offer.sellerId, companyName: offer.sellerName,
                projectId: offer.projectId, platformId: rival.id, rightsContractId: license.id,
                headline: `${rival.name} acquires ${offer.title}`,
                detail: `${offer.sellerName} licensed ${offer.title}. Its streaming premiere is scheduled ahead.`,
                evidence: [{ kind: 'PROJECT', id: offer.projectId },
                    { kind: 'RIGHTS_CONTRACT', id: license.id }],
            })]),
            platforms: { ...upfront.world.platforms, [rival.id]: {
                ...rival, cashReserve: rival.cashReserve - offer.askingPrice / 1_000_000,
            } },
            ...(seller ? { studios: { ...upfront.world.studios, [seller.id]: {
                ...seller, cashReserve: seller.cashReserve + sellerNet / 1_000_000,
            } } } : {}),
            streamingOpportunityMarket: { ...world.streamingOpportunityMarket!,
                offers: lane === 'PUBLIC' ? world.streamingOpportunityMarket!.offers.filter(item => item.id !== offer.id)
                    : world.streamingOpportunityMarket!.offers,
                sellerReceipts: { ...world.streamingOpportunityMarket!.sellerReceipts,
                    [offer.sellerId]: (world.streamingOpportunityMarket!.sellerReceipts[offer.sellerId] || 0) + sellerNet },
            },
        };
        usedRivals.add(rival.id);
        if (lane === 'PUBLIC') publicSigned = true;
    }
    return { ...player, world: { ...world, streamingOpportunityMarket: {
        ...world.streamingOpportunityMarket!,
        lastRivalCycle: brokeredDue ? cycle : state.lastRivalCycle,
        lastRivalPublicWeek: publicDue ? absoluteWeek : state.lastRivalPublicWeek,
    } } };
};
