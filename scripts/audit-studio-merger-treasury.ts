import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    executeFullStudioMerger,
    getStudioTreasuryWithdrawalQuote,
    performStudioTreasuryTransfer,
} from '../services/studioGroup';
import { getTradableStocks, initializeStocks } from '../services/stockLogic';
import type { Business, Player } from '../types';

const createStudio = (id: string, name: string, productionType: string, balance: number): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: '🏛️',
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
        theme: productionType,
        productionType,
        amenities: [],
    },
    stats: {
        weeklyRevenue: 2_000_000,
        weeklyExpenses: 1_000_000,
        weeklyProfit: 1_000_000,
        lifetimeRevenue: 200_000_000,
        valuation: balance * 2,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 60,
        studioMomentum: 62,
        investorConfidence: 66,
    },
    staff: [{ id: `${id}_exec`, name: `${name} Exec`, role: 'MANAGER', skill: 70, salary: 1_000_000, morale: 70 }],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: createDefaultStudioState(1),
});

const parentStudio = createStudio('parent_studio', 'Empire Pictures', 'Original Studio', 900_000_000);
const acquiredStudio: Business = {
    ...createStudio('acquired_studio', 'Artisan Pictures', 'Acquired Studio', 300_000_000),
    studioState: {
        ...createDefaultStudioState(1),
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 1,
        acquiredYear: 31,
        operatingModel: 'CONTROLLED_SUBSIDIARY',
        scripts: [{
            id: 'artisan_script',
            title: 'Artisan Slate',
            genres: ['DRAMA'],
            status: 'CONCEPT',
            quality: 72,
            options: [],
            writerId: null,
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: 0,
            isOriginal: true,
            projectType: 'MOVIE',
        }],
        concepts: [{
            id: 'artisan_concept',
            scriptId: 'artisan_script',
            lastUpdated: 1,
            crewModes: {},
            selectedCrew: {},
            castList: [],
            selectedLocations: [],
            tone: 50,
        }],
        purchasedIPTitles: ['Moon Castle'],
        ownedRights: [{
            id: 'right_moon_castle',
            sourceOpportunityId: 'opp_moon_castle',
            title: 'Moon Castle',
            sellerName: 'Estate',
            propertyType: 'FRANCHISE',
            archetype: 'DORMANT_HERO',
            primaryGenre: 'FANTASY',
            rarity: 'RARE',
            accent: 'amber',
            emblemKey: 'BOOK',
            dealType: 'BUYOUT',
            purchasePrice: 80_000_000,
            acquiredWeek: 1,
            acquiredYear: 31,
            projectsUsed: 0,
            status: 'ACTIVE',
        }],
        departments: {
            writing: 3,
            directing: 2,
            casting: 2,
            production: 4,
            postProduction: 3,
        },
        equipment: {
            cameras: 2,
            lighting: 2,
            sound: 1,
            practicalEffects: 2,
        },
        financeLedger: [],
    },
};
const acquiredStudioStock = {
    ...initializeStocks().find(stock => stock.id === 'stk_wbd')!,
    id: 'stk_acquired_studio',
    symbol: 'ARTI',
    name: 'Artisan Pictures',
    relatedStudioId: acquiredStudio.id as any,
};

const player: Player = {
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 24,
    money: 500_000_000,
    businesses: [parentStudio, acquiredStudio],
    stocks: [acquiredStudioStock as any],
    portfolio: [{ stockId: acquiredStudioStock.id, shares: 1_000_000, averageCost: acquiredStudioStock.price, totalInvested: acquiredStudioStock.price * 1_000_000 }],
    commitments: [{
        id: 'commit_artisan',
        name: 'Artisan Active Movie',
        type: 'ACTING_GIG',
        energyCost: 0,
        income: 0,
        payoutType: 'LUMPSUM',
        projectDetails: {
            title: 'Artisan Active Movie',
            type: 'MOVIE',
            description: 'Active acquired-studio production.',
            studioId: acquiredStudio.id,
            subtype: 'STANDALONE',
            genre: 'DRAMA',
            budgetTier: 'MID',
            estimatedBudget: 60_000_000,
            visibleHype: 'MID',
            hiddenStats: {
                scriptQuality: 60,
                directorQuality: 60,
                castingStrength: 60,
                distributionPower: 60,
                rawHype: 60,
                qualityScore: 60,
                prestigeBonus: 0,
            },
            directorName: 'House Director',
            visibleDirectorTier: 'Reliable',
            visibleScriptBuzz: 'Solid',
            visibleCastStrength: 'Balanced',
        },
    }],
    activeReleases: [],
    pastProjects: [{
        id: 'past_artisan',
        name: 'Past Artisan Hit',
        type: 'ACTING_GIG',
        roleType: 'LEAD',
        year: 31,
        earnings: 0,
        rating: 80,
        reception: 'Hit',
        projectQuality: 80,
        boxOfficeResult: 'SUCCESS',
        outcomeTier: 'SUCCESS',
        subtype: 'STANDALONE',
        futurePotential: { sequelChance: 60, renewalChance: 0, rebootChance: 20, franchiseChance: 40, isFranchiseStarter: false, isSequelGreenlit: false, isRenewed: false, seriesStatus: 'N/A' },
        studioId: acquiredStudio.id,
        budget: 50_000_000,
        gross: 150_000_000,
        genre: 'DRAMA',
        projectType: 'MOVIE',
    }],
    news: [],
    logs: [],
};

const injectedFromPersonal = performStudioTreasuryTransfer({
    player,
    studioId: acquiredStudio.id,
    action: 'INJECT',
    counterparty: 'PERSONAL',
    amount: 50_000_000,
});
if (!injectedFromPersonal.success) throw new Error('Personal-to-subsidiary injection should succeed.');
if (injectedFromPersonal.player.money !== player.money - 50_000_000) throw new Error('Personal injection should deduct player cash.');
if (injectedFromPersonal.studio?.balance !== acquiredStudio.balance + 50_000_000) throw new Error('Personal injection should add studio capital.');

const withdrawnToHq = performStudioTreasuryTransfer({
    player: injectedFromPersonal.player,
    studioId: acquiredStudio.id,
    action: 'WITHDRAW',
    counterparty: 'HQ',
    amount: 40_000_000,
});
if (!withdrawnToHq.success) throw new Error('Subsidiary-to-HQ withdrawal should succeed.');
const hqAfterWithdrawal = withdrawnToHq.player.businesses.find(business => business.id === parentStudio.id)!;
const studioAfterWithdrawal = withdrawnToHq.player.businesses.find(business => business.id === acquiredStudio.id)!;
if (hqAfterWithdrawal.balance !== parentStudio.balance + 40_000_000) throw new Error('HQ withdrawal should increase parent studio capital.');
if (!studioAfterWithdrawal.studioState?.financeLedger?.some(entry => entry.type === 'CAPITAL_WITHDRAWAL' && entry.label.includes('Headquarters'))) {
    throw new Error('Subsidiary treasury action should be recorded in studio ledger.');
}

const partialControlStock = {
    ...acquiredStudioStock,
    outstandingShares: acquiredStudioStock.outstandingShares,
};
const partialControlShares = Math.round((Number(partialControlStock.outstandingShares) * 52) / 100);
const partialControlPlayer: Player = {
    ...player,
    stocks: [partialControlStock as any],
    portfolio: [{
        stockId: partialControlStock.id,
        shares: partialControlShares,
        averageCost: partialControlStock.price,
        totalInvested: partialControlStock.price * partialControlShares,
    }],
    stockTakeovers: [{
        id: 'takeover_artisan',
        stockId: partialControlStock.id,
        stockSymbol: partialControlStock.symbol,
        companyName: acquiredStudio.name,
        relatedStudioId: acquiredStudio.id,
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 52,
        alliedSupportPercent: 0,
        effectiveControlPercent: 52,
        supportScore: 80,
        rivalDefenceRisk: 10,
        cost: 0,
        summary: 'Control secured',
        createdWeek: player.currentWeek,
        createdYear: player.age,
        resolvedWeek: player.currentWeek,
        resolvedYear: player.age,
        acquiredBusinessId: acquiredStudio.id,
    }],
};
const partialQuote = getStudioTreasuryWithdrawalQuote(partialControlPlayer, acquiredStudio);
if (partialQuote.ownershipPercent !== 52) {
    throw new Error('Treasury quote should use the live controlled ownership percentage.');
}
const dilutedControlPlayer: Player = {
    ...partialControlPlayer,
    stocks: [{
        ...partialControlStock,
        outstandingShares: Math.round(Number(partialControlStock.outstandingShares) * 1.3),
    } as any],
};
const dilutedQuote = getStudioTreasuryWithdrawalQuote(dilutedControlPlayer, acquiredStudio);
if (dilutedQuote.ownershipPercent !== 40) {
    throw new Error('Newly issued shares should dilute the owner share used by treasury distributions.');
}
if (dilutedQuote.maxOwnerProceeds >= partialQuote.maxOwnerProceeds) {
    throw new Error('Dilution should reduce the maximum cash attributable to the owner.');
}
if (partialQuote.operatingReserve <= 0 || partialQuote.maxOwnerProceeds >= acquiredStudio.balance) {
    throw new Error('Treasury quote should protect an operating reserve and limit owner proceeds.');
}
const partialWithdrawal = performStudioTreasuryTransfer({
    player: partialControlPlayer,
    studioId: acquiredStudio.id,
    action: 'WITHDRAW',
    counterparty: 'PERSONAL',
    amount: partialQuote.maxOwnerProceeds,
});
if (!partialWithdrawal.success || !partialWithdrawal.withdrawalQuote) {
    throw new Error('A partial owner should be able to take the quoted maximum distribution.');
}
if (partialWithdrawal.player.money !== partialControlPlayer.money + partialQuote.maxOwnerProceeds) {
    throw new Error('A partial owner should receive only their ownership share of the distribution.');
}
if (partialWithdrawal.withdrawalQuote.minorityDistribution <= 0) {
    throw new Error('The remainder of a partial-owner distribution should go to outside shareholders.');
}
if (partialWithdrawal.studio?.balance !== partialQuote.operatingReserve) {
    throw new Error('A maximum distribution should leave the protected operating reserve in the studio.');
}
const postWithdrawalQuote = getStudioTreasuryWithdrawalQuote(
    partialWithdrawal.player,
    partialWithdrawal.studio!,
);
if (postWithdrawalQuote.maxOwnerProceeds !== 0) {
    throw new Error('The owner must not repeatedly drain the protected studio reserve.');
}
const overLimitWithdrawal = performStudioTreasuryTransfer({
    player: partialControlPlayer,
    studioId: acquiredStudio.id,
    action: 'WITHDRAW',
    counterparty: 'PERSONAL',
    amount: partialQuote.maxOwnerProceeds + 1,
});
if (overLimitWithdrawal.success || overLimitWithdrawal.reason !== 'EXCEEDS_DISTRIBUTABLE_CASH') {
    throw new Error('A partial owner must not withdraw above the ownership-aware board limit.');
}
if (overLimitWithdrawal.player.money !== partialControlPlayer.money) {
    throw new Error('A blocked treasury withdrawal must not change player cash.');
}
if (overLimitWithdrawal.studio?.balance !== acquiredStudio.balance) {
    throw new Error('A blocked treasury withdrawal must not change studio cash.');
}

const insufficient = performStudioTreasuryTransfer({
    player,
    studioId: acquiredStudio.id,
    action: 'INJECT',
    counterparty: 'HQ',
    amount: 2_000_000_000,
});
if (insufficient.success || insufficient.reason !== 'INSUFFICIENT_HQ_CAPITAL') {
    throw new Error('HQ injection must fail when HQ lacks capital.');
}

const merged = executeFullStudioMerger({
    player: withdrawnToHq.player,
    studioId: acquiredStudio.id,
});
if (!merged.success) throw new Error('Full studio merger should succeed.');
const mergedParent = merged.player.businesses.find(business => business.id === parentStudio.id)!;
const mergedArchive = merged.player.businesses.find(business => business.id === acquiredStudio.id)!;
if (mergedArchive.studioState?.operatingModel !== 'FULL_MERGER') throw new Error('Merged studio should become an inactive merged archive.');
if (mergedArchive.stats.valuation !== 0) throw new Error('Merged archive valuation should be retired to prevent double-counting.');
if (mergedParent.stats.valuation < parentStudio.stats.valuation + Math.round(acquiredStudio.stats.valuation * 0.9)) {
    throw new Error('Merged HQ valuation should absorb most of the acquired studio valuation.');
}
if (getTradableStocks(merged.player.stocks, merged.player).some(stock => stock.relatedStudioId === acquiredStudio.id)) {
    throw new Error('Merged public studio stock should be retired from tradable stock listings.');
}
if (!mergedParent.studioState?.scripts.some(script => script.id === 'artisan_script')) throw new Error('Merged scripts should transfer into HQ.');
if (!mergedParent.studioState?.ownedRights?.some(right => right.id === 'right_moon_castle')) throw new Error('Merged owned IP should transfer into HQ.');
if (!merged.player.commitments.every(commitment => commitment.projectDetails?.studioId !== acquiredStudio.id)) throw new Error('Active commitments should be reassigned to HQ.');
if (!merged.player.pastProjects.every(project => project.studioId !== acquiredStudio.id)) throw new Error('Past projects should be reassigned to HQ.');
if (!merged.player.news.some(item => item.headline.includes('absorbs Artisan Pictures'))) throw new Error('Merger should generate industry news.');
if (!mergedParent.studioState?.financeLedger?.some(entry => entry.type === 'ACQUISITION_MERGER')) throw new Error('HQ ledger should record the merger integration.');

const transferAfterMerge = performStudioTreasuryTransfer({
    player: merged.player,
    studioId: acquiredStudio.id,
    action: 'WITHDRAW',
    counterparty: 'PERSONAL',
    amount: 1,
});
if (transferAfterMerge.success || transferAfterMerge.reason !== 'MERGED_STUDIO') {
    throw new Error('Merged studios should reject separate treasury transfers.');
}

console.log('Studio merger and treasury audit passed.');
