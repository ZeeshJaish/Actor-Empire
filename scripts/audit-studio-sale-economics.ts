import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { getAcquisitionDebtSummary } from '../services/acquisitionDebt';
import {
    acceptStudioSaleOffer,
    completeStudioSaleTransfer,
    createStudioSaleDeck,
    getStudioSaleEffectiveTransferTerms,
    getStudioSalePricingBounds,
    getStudioSaleReadiness,
    getStudioSaleValuation,
    getStudioSaleWindowState,
} from '../services/studioSale';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (
    id: string,
    name: string,
    overrides: Partial<Business> = {},
): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: name.slice(0, 2).toUpperCase(),
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance: 120_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
    },
    stats: {
        weeklyRevenue: 42_000_000,
        weeklyExpenses: 30_000_000,
        weeklyProfit: 12_000_000,
        lifetimeRevenue: 3_000_000_000,
        valuation: 4_000_000_000,
        brandHealth: 72,
        customerSatisfaction: 70,
        riskLevel: 28,
        hype: 68,
        studioMomentum: 74,
        investorConfidence: 66,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: 1,
        lastWriterRefreshWeek: 1,
        rightsMarket: [],
        ownedRights: [],
        operatingModel: 'INDEPENDENT_LABEL',
    },
    ...overrides,
});

const makeDebtEntry = (studioId: string, studioName: string, remainingPrincipal: number) => ({
    id: `sale_debt_${studioId}`,
    studioId,
    studioName,
    originalPrincipal: remainingPrincipal,
    remainingPrincipal,
    annualInterestRate: 0.095,
    originatedWeek: 10,
    originatedYear: 35,
    source: 'NEGOTIATED_ACQUISITION' as const,
    status: 'ACTIVE' as const,
    interestPaidToDate: 0,
    missedServiceAmount: 0,
    missedPayments: 0,
});

const parentStudio = makeStudio('PLAYER_MAIN', 'Player Pictures');
const acquiredStudio = makeStudio('ARTISAN_PICTURES', 'Artisan Pictures', {
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        productionType: 'Acquired Studio',
    },
    stats: {
        weeklyRevenue: 14_000_000,
        weeklyExpenses: 13_500_000,
        weeklyProfit: 500_000,
        lifetimeRevenue: 700_000_000,
        valuation: 900_000_000,
        brandHealth: 78,
        customerSatisfaction: 68,
        riskLevel: 55,
        hype: 58,
        studioMomentum: 52,
        investorConfidence: 38,
    },
    studioState: {
        ...parentStudio.studioState!,
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        operatingModel: 'CONTROLLED_SUBSIDIARY',
        acquiredWeek: 10,
        acquiredYear: 35,
    },
});
const mergedStudio = makeStudio('SEARCHLIGHT', 'Searchlight Pictures', {
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        productionType: 'Acquired Studio',
    },
    stats: {
        weeklyRevenue: 8_000_000,
        weeklyExpenses: 7_500_000,
        weeklyProfit: 500_000,
        lifetimeRevenue: 550_000_000,
        valuation: 600_000_000,
        brandHealth: 84,
        customerSatisfaction: 75,
        riskLevel: 35,
        hype: 64,
        studioMomentum: 62,
        investorConfidence: 42,
    },
    studioState: {
        ...parentStudio.studioState!,
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        operatingModel: 'FULL_MERGER',
        mergedIntoStudioId: 'PLAYER_MAIN',
        acquiredWeek: 14,
        acquiredYear: 35,
    },
});

const player: Player = {
    ...INITIAL_PLAYER,
    id: 'audit_studio_sale',
    name: 'Kesar Soni',
    age: 36,
    currentWeek: 22,
    money: 125_000_000,
    businesses: [parentStudio, acquiredStudio, mergedStudio],
    commitments: [],
    activeReleases: [],
    portfolio: [{
        stockId: 'ARTISAN_STOCK',
        shares: 1_000_000,
        averageCost: 12,
        totalInvested: 12_000_000,
    }],
    stocks: [{
        id: 'ARTISAN_STOCK',
        symbol: 'ART',
        name: 'Artisan Pictures',
        sector: 'MEDIA',
        price: 14,
        outstandingShares: 5_000_000,
        publicFloatPercent: 60,
        dividendYield: 0.01,
        volatility: 0.2,
        relatedStudioId: 'ARTISAN_PICTURES',
        priceHistory: [13, 14],
        lastDividendPayoutWeek: 20,
    }],
    stockTakeovers: [{
        id: 'takeover_artisan',
        stockId: 'ARTISAN_STOCK',
        stockSymbol: 'ART',
        companyName: 'Artisan Pictures',
        relatedStudioId: 'ARTISAN_PICTURES',
        acquiredBusinessId: 'ARTISAN_PICTURES',
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 52,
        alliedSupportPercent: 0,
        effectiveControlPercent: 52,
        supportScore: 72,
        rivalDefenceRisk: 0,
        cost: 12_000_000,
        summary: 'Audit takeover control transfer.',
        createdWeek: 18,
        createdYear: 36,
        resolvedWeek: 18,
        resolvedYear: 36,
    }],
    flags: {
        ...INITIAL_PLAYER.flags,
        acquisitionDebtLedger: [
            makeDebtEntry('PLAYER_MAIN', 'Player Pictures', 400_000_000),
            makeDebtEntry('ARTISAN_PICTURES', 'Artisan Pictures', 1_600_000_000),
            makeDebtEntry('SEARCHLIGHT', 'Searchlight Pictures', 500_000_000),
        ],
    },
    news: [],
    inbox: [],
    logs: [],
};

const valuation = getStudioSaleValuation(player, parentStudio);
assert(valuation.annualRevenue > parentStudio.stats.weeklyRevenue * 52, 'Parent sale valuation should include acquired studio revenue.');
assert(valuation.debt === 2_500_000_000, 'Parent sale valuation should include all bundled studio debt.');
assert(valuation.includedStudios.length === 3, 'Parent sale valuation should disclose each bundled studio in the banker file.');
assert(valuation.includedStudios.some(studio => studio.id === 'ARTISAN_PICTURES' && studio.isAcquired), 'Parent sale valuation should mark acquired subsidiaries.');

const normalizedParentTerms = getStudioSaleEffectiveTransferTerms(player, parentStudio, {
    nameRights: 'BUYER_KEEPS_NAME',
    catalogRights: 'SELLER_RETAINS_BACK_CATALOG',
    sellerCredit: true,
    staffProtectionWeeks: 12,
    royaltyPercent: 2,
    royaltyWeeks: 104,
});
assert(normalizedParentTerms.catalogRights === 'FULL_LIBRARY', 'Parent production-house sale should force full library transfer.');

const staleRecordedValueStudio = makeStudio('SPIKE_CHILD', 'Spike Child Pictures', {
    balance: 0,
    config: {
        quality: 'BUDGET',
        pricing: 'MARKET',
        marketing: 'LOW',
        productionType: 'Acquired Studio',
    },
    stats: {
        weeklyRevenue: 2_600_000,
        weeklyExpenses: 2_350_000,
        weeklyProfit: 250_000,
        lifetimeRevenue: 220_000_000,
        valuation: 3_000_000_000,
        brandHealth: 52,
        customerSatisfaction: 50,
        riskLevel: 65,
        hype: 45,
        studioMomentum: 43,
        investorConfidence: 32,
    },
    studioState: {
        ...parentStudio.studioState!,
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        operatingModel: 'CONTROLLED_SUBSIDIARY',
        acquiredWeek: 18,
        acquiredYear: 36,
    },
});
const staleValuePlayer: Player = {
    ...player,
    businesses: [parentStudio, staleRecordedValueStudio],
    flags: {
        ...player.flags,
        acquisitionDebtLedger: [
            makeDebtEntry('SPIKE_CHILD', 'Spike Child Pictures', 615_000_000),
        ],
    },
};
const staleChildValuation = getStudioSaleValuation(staleValuePlayer, staleRecordedValueStudio);
assert(staleChildValuation.indicativeValue < 1_800_000_000, `Stale recorded valuation should not hard-floor a debt-heavy acquired child at billions. Got ${staleChildValuation.indicativeValue}.`);

const readiness = getStudioSaleReadiness(player, parentStudio);
assert(readiness.canList, `Parent group sale should be listable: ${readiness.blockers.join(', ')}`);
assert(
    readiness.requirements.some(requirement => /Group package includes 2 acquired banners/.test(requirement.detail)),
    'Readiness should disclose that acquired studios are bundled into the parent sale.',
);

const bounds = getStudioSalePricingBounds(valuation);
const floorAboveAsk = createStudioSaleDeck(player, parentStudio.id, bounds.minAsk, bounds.minAsk + 100_000_000);
assert(!floorAboveAsk.success, 'Sale deck should reject a walk-away floor above asking price.');
const foolishAsk = createStudioSaleDeck(player, parentStudio.id, bounds.minAsk - 100_000_000, bounds.minFloor);
assert(!foolishAsk.success, 'Sale deck should reject foolishly low asking prices.');

const listed = createStudioSaleDeck(player, parentStudio.id, valuation.recommendedAsk, valuation.recommendedFloor, {
    nameRights: 'BUYER_KEEPS_NAME',
    catalogRights: 'FULL_LIBRARY',
    sellerCredit: true,
    staffProtectionWeeks: 12,
    royaltyPercent: 3,
    royaltyWeeks: 156,
});
assert(listed.success && listed.deck, 'Valid parent sale should create a sale deck.');
assert(listed.deck.debtAtListing === valuation.debt, 'Sale deck should snapshot debt at listing.');

listed.deck.offers.forEach(offer => {
    const sellerDebtPayoff = Math.max(0, offer.amount - offer.bankerFee - offer.cashAtClose);
    assert(
        offer.debtAssumed + sellerDebtPayoff >= valuation.debt - 1_000_000,
        `Every offer should account for all listed debt through assumption or escrow payoff. ${offer.buyerName}: assumed=${offer.debtAssumed}, escrow=${sellerDebtPayoff}, debt=${valuation.debt}, amount=${offer.amount}, fee=${offer.bankerFee}, cash=${offer.cashAtClose}`,
    );
    assert(offer.cashAtClose <= offer.amount, 'Net cash at close should never exceed the cash purchase price.');
    assert(offer.royaltyPercent >= 0 && offer.royaltyPercent <= 8, 'Royalty offers should stay inside allowed bounds.');
});
assert(
    new Set(listed.deck.offers.map(offer => offer.royaltyPercent.toFixed(1))).size > 1,
    'Buyer offers should vary royalty terms instead of all copying one number.',
);

const listedPlayer = listed.player;
const listedStudio = listedPlayer.businesses.find(studio => studio.id === parentStudio.id)!;
const availableOffer = getStudioSaleWindowState(listedPlayer, listedStudio.studioState!.saleDeck!).availableOffers[0];
assert(availableOffer, 'At least one offer should be available immediately.');

const signing = acceptStudioSaleOffer(listedPlayer, parentStudio.id, availableOffer.id);
assert(signing.success, `Accepting an available offer should enter signing: ${signing.message}`);
const signedStudio = signing.player.businesses.find(studio => studio.id === parentStudio.id)!;
const acceptedOffer = signedStudio.studioState!.saleDeck!.offers.find(offer => offer.id === availableOffer.id)!;
const sold = completeStudioSaleTransfer(signing.player, parentStudio.id);
assert(sold.success, `Final signature should close sale: ${sold.message}`);
assert(!sold.player.businesses.some(studio => ['PLAYER_MAIN', 'ARTISAN_PICTURES', 'SEARCHLIGHT'].includes(studio.id)), 'Selling the parent production house should remove the whole bundled studio group.');
assert(!sold.player.stocks.some(stock => stock.relatedStudioId && ['PLAYER_MAIN', 'ARTISAN_PICTURES', 'SEARCHLIGHT'].includes(stock.relatedStudioId)), 'Selling the parent production house should remove related stock rows.');
assert(!sold.player.portfolio.some(position => position.stockId === 'ARTISAN_STOCK'), 'Sold related stock portfolio positions should be cleared.');
assert(!sold.player.stockTakeovers.some(takeover => takeover.relatedStudioId === 'ARTISAN_PICTURES'), 'Sold related takeover records should be cleared.');
assert(getAcquisitionDebtSummary(sold.player).totalRemainingPrincipal === 0, 'Bundled studio debt should be closed only after being accounted for by offer economics.');
assert(sold.player.money === player.money + acceptedOffer.cashAtClose, 'Player cash should increase exactly by net cash at close.');
assert((sold.player.flags?.studioSaleHistory || []).length > 0, 'Closed sale should write sale history.');
assert(Object.keys(sold.player.flags?.soldStudioIds || {}).length >= 3, 'Closed sale should mark all bundled sold studio ids.');

const catalogChild = makeStudio('CATALOG_CHILD', 'Catalog Child Pictures', {
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        productionType: 'Acquired Studio',
    },
    stats: {
        weeklyRevenue: 3_500_000,
        weeklyExpenses: 2_800_000,
        weeklyProfit: 700_000,
        lifetimeRevenue: 300_000_000,
        valuation: 450_000_000,
        brandHealth: 64,
        customerSatisfaction: 62,
        riskLevel: 38,
        hype: 56,
        studioMomentum: 58,
        investorConfidence: 55,
    },
    studioState: {
        ...parentStudio.studioState!,
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        operatingModel: 'CONTROLLED_SUBSIDIARY',
        acquiredWeek: 19,
        acquiredYear: 36,
        purchasedIPTitles: ['Moon Vault'],
        ownedRights: [{
            id: 'right_moon_vault',
            sourceOpportunityId: 'opp_moon_vault',
            title: 'Moon Vault',
            sellerName: 'Catalog Child Pictures',
            propertyType: 'CATALOG',
            archetype: 'STREAMING_CATALOG',
            primaryGenre: 'SCI_FI',
            rarity: 'RARE',
            accent: '#7dd3fc',
            emblemKey: 'LIBRARY',
            dealType: 'BUYOUT',
            purchasePrice: 50_000_000,
            acquiredWeek: 19,
            acquiredYear: 36,
            projectsUsed: 0,
            status: 'ACTIVE',
            ownershipSource: 'STUDIO_ORIGINAL',
        }],
    },
});
const catalogPlayer: Player = {
    ...INITIAL_PLAYER,
    id: 'audit_child_catalog_sale',
    name: 'Kesar Soni',
    age: 36,
    currentWeek: 24,
    money: 100_000_000,
    businesses: [parentStudio, catalogChild],
    commitments: [],
    activeReleases: [],
    pastProjects: [{
        id: 'past_moon_vault',
        name: 'Moon Vault',
        type: 'ACTING_GIG',
        roleType: 'LEAD',
        year: 36,
        earnings: 0,
        rating: 82,
        reception: 'Cult hit',
        projectQuality: 80,
        imdbRating: 8.1,
        boxOfficeResult: 'Hit',
        outcomeTier: 'SUCCESS',
        subtype: 'STANDALONE',
        futurePotential: {
            sequelChance: 35,
            franchiseChance: 25,
            rebootChance: 10,
            renewalChance: 0,
            isFranchiseStarter: false,
            isSequelGreenlit: false,
            isRenewed: false,
            seriesStatus: 'N/A',
        },
        studioId: 'CATALOG_CHILD',
        budget: 40_000_000,
        gross: 220_000_000,
        genre: 'SCI_FI',
        projectType: 'MOVIE',
    }],
    flags: {
        ...INITIAL_PLAYER.flags,
        acquisitionDebtLedger: [],
    },
    news: [],
    inbox: [],
    logs: [],
};
const childValuation = getStudioSaleValuation(catalogPlayer, catalogChild);
assert(childValuation.retainedCatalogTargetStudioName === parentStudio.name, 'Child sale should know which parent receives retained catalog.');
const childListed = createStudioSaleDeck(catalogPlayer, catalogChild.id, childValuation.recommendedAsk, childValuation.recommendedFloor, {
    nameRights: 'BUYER_REBRANDS',
    catalogRights: 'SELLER_RETAINS_BACK_CATALOG',
    sellerCredit: true,
    staffProtectionWeeks: 8,
    royaltyPercent: 1,
    royaltyWeeks: 52,
});
assert(childListed.success && childListed.deck?.transferTerms.catalogRights === 'SELLER_RETAINS_BACK_CATALOG', 'Child sale should allow retaining catalog into the parent.');
const childListedStudio = childListed.player.businesses.find(studio => studio.id === catalogChild.id)!;
const childOffer = getStudioSaleWindowState(childListed.player, childListedStudio.studioState!.saleDeck!).availableOffers[0];
const childSigning = acceptStudioSaleOffer(childListed.player, catalogChild.id, childOffer.id);
assert(childSigning.success, `Child sale should enter signing: ${childSigning.message}`);
const childSold = completeStudioSaleTransfer(childSigning.player, catalogChild.id);
assert(childSold.success, `Child final signature should close sale: ${childSold.message}`);
assert(!childSold.player.businesses.some(studio => studio.id === catalogChild.id), 'Sold child studio should be removed from owned businesses.');
const parentAfterChildSale = childSold.player.businesses.find(studio => studio.id === parentStudio.id)!;
assert(parentAfterChildSale.studioState?.ownedRights?.some(right => right.id === 'right_moon_vault'), 'Retained child rights should move into parent production house.');
assert(childSold.player.pastProjects.find(project => project.id === 'past_moon_vault')?.studioId === parentStudio.id, 'Retained child past projects should be reassigned to parent production house.');
assert(/relaunch/i.test(childSold.player.news[0]?.subtext || '') || /relaunch/i.test(childSold.player.inbox[0]?.text || ''), 'Rebrand sale should be explained in news or deal message.');
assert(/move into Player Pictures/i.test(childSold.player.inbox[0]?.text || ''), 'Retained catalog destination should be explained in the deal message.');

console.log('Studio sale economics audit passed.');
