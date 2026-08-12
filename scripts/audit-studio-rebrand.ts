import type { Business, Player } from '../types';
import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    getStudioNameError,
    getStudioRenameCooldownWeeks,
    getStudioRenameQuote,
    renameAcquiredStudio,
} from '../services/studioRebrand';
import { createStudioNameRightsHearing } from '../services/studioNameRights';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (overrides: Partial<Business> = {}): Business => ({
    id: 'acquired_studio',
    name: 'Heritage Pictures',
    type: 'PRODUCTION_HOUSE',
    subtype: 'INDIE_STUDIO',
    logo: 'FILM',
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
        weeklyRevenue: 8_000_000,
        weeklyExpenses: 4_000_000,
        weeklyProfit: 4_000_000,
        lifetimeRevenue: 600_000_000,
        valuation: 2_000_000_000,
        brandHealth: 78,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 65,
        studioMomentum: 60,
        investorConfidence: 72,
        locations: 1,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        ...createDefaultStudioState(1),
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 4,
        acquiredYear: 31,
        operatingModel: 'CONTROLLED_SUBSIDIARY',
    },
    ...overrides,
});

const makePlayer = ({
    studio = makeStudio(),
    preserveName = false,
}: {
    studio?: Business;
    preserveName?: boolean;
} = {}): Player => ({
    ...structuredClone(INITIAL_PLAYER),
    age: 31,
    currentWeek: 12,
    money: 900_000_000,
    stats: {
        ...structuredClone(INITIAL_PLAYER.stats),
        reputation: 50,
    },
    businesses: [studio],
    flags: {
        studioAcquisitionCases: [{
            studioId: studio.id,
            studioName: studio.name,
            status: 'ACQUIRED',
            offer: {
                commitments: preserveName ? ['PRESERVE_STUDIO_NAME'] : [],
            },
            closing: {
                acquiredBusinessId: studio.id,
                finalPrice: 2_200_000_000,
            },
        }],
        acquisitionDebtLedger: [{
            id: 'studio_debt',
            studioId: studio.id,
            studioName: studio.name,
            status: 'ACTIVE',
            remainingPrincipal: 40_000_000,
        }],
    },
});

const player = makePlayer();
const studio = player.businesses[0];
const quote = getStudioRenameQuote(player, studio);
const personalCashBefore = player.money;
const studioCashBefore = studio.balance;
const result = renameAcquiredStudio({
    player,
    studioId: studio.id,
    value: '  Northstar   Studios  ',
});

assert(result.success, `Expected rename to succeed: ${result.error || result.reason}`);
assert(result.player.businesses[0].name === 'Northstar Studios', 'Rename should normalize and update the owned studio name.');
assert(result.player.money === personalCashBefore, 'A studio rebrand must not charge personal cash.');
assert(result.player.businesses[0].balance === studioCashBefore - quote.cost, 'The one-time rebrand fee must come from studio capital.');
assert(result.player.businesses[0].studioState?.formerNames?.includes('Heritage Pictures'), 'The former studio name should be retained in history.');
assert(result.player.news[0]?.headline.includes('Northstar Studios'), 'A rename should create an industry news story.');
assert(result.player.x.feed[0]?.content.includes('Northstar Studios'), 'A rename should create public industry chatter.');
assert(result.player.finance.history[0]?.amount === -quote.cost, 'The rebrand should appear as a business expense in finance history.');
assert(result.player.flags.studioAcquisitionCases[0].studioName === 'Northstar Studios', 'The acquisition record should follow the live studio name.');
assert(result.player.flags.acquisitionDebtLedger[0].studioName === 'Northstar Studios', 'The debt ledger should follow the live studio name.');
assert(
    getStudioRenameCooldownWeeks(result.player, result.player.businesses[0]) === 4,
    'A completed rebrand should start a four-week cooldown.',
);
const immediateSecondRename = renameAcquiredStudio({
    player: result.player,
    studioId: studio.id,
    value: 'Northstar Entertainment',
});
assert(
    !immediateSecondRename.success && immediateSecondRename.reason === 'COOLDOWN_ACTIVE',
    'The service must reject a second rename during the rollout cooldown.',
);
const threeWeeksLater = {
    ...result.player,
    currentWeek: result.player.currentWeek + 3,
};
assert(
    getStudioRenameCooldownWeeks(threeWeeksLater, threeWeeksLater.businesses[0]) === 1,
    'The cooldown should report the correct remaining week.',
);
const fourWeeksLater = {
    ...result.player,
    currentWeek: result.player.currentWeek + 4,
};
assert(
    getStudioRenameCooldownWeeks(fourWeeksLater, fourWeeksLater.businesses[0]) === 0,
    'The studio should unlock exactly four weeks after its previous rebrand.',
);
const yearBoundaryStudio = makeStudio({
    studioState: {
        ...createDefaultStudioState(1),
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 4,
        acquiredYear: 31,
        operatingModel: 'CONTROLLED_SUBSIDIARY',
        lastRenamedWeek: 51,
        lastRenamedYear: 31,
    },
});
const yearBoundaryPlayer = makePlayer({ studio: yearBoundaryStudio });
assert(
    getStudioRenameCooldownWeeks({ ...yearBoundaryPlayer, age: 32, currentWeek: 2 }, yearBoundaryStudio) === 1,
    'The cooldown should remain accurate when it crosses into a new in-game year.',
);
assert(
    getStudioRenameCooldownWeeks({ ...yearBoundaryPlayer, age: 32, currentWeek: 3 }, yearBoundaryStudio) === 0,
    'The year-crossing cooldown should unlock after the same four elapsed weeks.',
);

const duplicateStudio = makeStudio({ id: 'other_studio', name: 'Northstar Studios' });
const duplicatePlayer = { ...player, businesses: [studio, duplicateStudio] };
assert(
    getStudioNameError(duplicatePlayer, studio, 'northstar studios') === 'You already own a business with this name.',
    'Duplicate owned business names should be rejected.',
);

const protectedBase = makePlayer({ preserveName: true });
const protectedPlayer: Player = {
    ...protectedBase,
    businesses: protectedBase.businesses.map(candidate => ({
        ...candidate,
        studioState: candidate.studioState ? {
            ...candidate.studioState,
            saleDeck: {
                id: 'sale_deck_heritage',
                studioId: candidate.id,
                studioName: candidate.name,
                status: 'DRAFT',
                askPrice: 2_000_000_000,
                minimumPrice: 1_500_000_000,
                indicativeValuation: 2_000_000_000,
                listedWeek: 10,
                listedYear: 31,
                offerWindowWeeks: 3,
                offersCloseWeek: 13,
                offersCloseYear: 31,
                transferTerms: {
                    nameRights: 'BUYER_KEEPS_NAME',
                    catalogRights: 'FULL_LIBRARY',
                    sellerCredit: true,
                    staffProtectionWeeks: 8,
                    royaltyPercent: 0,
                    royaltyWeeks: 0,
                },
                offers: [],
            },
        } : candidate.studioState,
    })),
    stocks: [{
        id: 'heritage_stock',
        symbol: 'HERI',
        name: 'Heritage Pictures',
        sector: 'MEDIA',
        price: 120,
        outstandingShares: 1_000_000,
        volatility: 0.04,
        dividendYield: 0,
        relatedStudioId: 'heritage_public_company',
        priceHistory: [120],
        lastDividendPayoutWeek: 0,
    }],
    stockTakeovers: [{
        id: 'heritage_takeover',
        stockId: 'heritage_stock',
        stockSymbol: 'HERI',
        companyName: 'Heritage Pictures',
        relatedStudioId: 'heritage_public_company',
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 52,
        alliedSupportPercent: 0,
        effectiveControlPercent: 52,
        supportScore: 75,
        rivalDefenceRisk: 10,
        cost: 0,
        summary: 'Control secured',
        createdWeek: 4,
        createdYear: 31,
        acquiredBusinessId: 'acquired_studio',
    }],
    flags: {
        ...protectedBase.flags,
        studioAcquisitionCases: protectedBase.flags.studioAcquisitionCases.map((acquisitionCase: any) => ({
            ...acquisitionCase,
            studioId: 'heritage_public_company',
        })),
    },
};
const protectedStudio = protectedPlayer.businesses[0];
const protectedQuote = getStudioRenameQuote(protectedPlayer, protectedStudio);
assert(protectedQuote.hasProtectedNamePromise, 'A signed name-protection commitment should be surfaced before confirmation.');
assert(protectedQuote.cost > getStudioRenameQuote(player, studio).cost, 'Breaking a name promise should increase the rebrand cost.');
const protectedResult = renameAcquiredStudio({
    player: protectedPlayer,
    studioId: protectedStudio.id,
    value: 'Rebel House',
});
assert(protectedResult.success, 'The player should be allowed to deliberately break the name promise after seeing the consequences.');
assert(protectedResult.player.stats.reputation < protectedPlayer.stats.reputation, 'Breaking the name promise should reduce player reputation.');
assert(
    protectedResult.player.businesses[0].stats.brandHealth < protectedStudio.stats.brandHealth,
    'Breaking the name promise should reduce studio brand health.',
);
assert(
    protectedResult.player.businesses[0].studioState?.brokenAcquisitionCommitments?.includes('PRESERVE_STUDIO_NAME'),
    'The broken promise should be recorded so the same penalty is not presented as unbroken later.',
);
assert(protectedResult.player.stocks[0].name === 'Rebel House', 'The linked public stock identity should follow the live rebrand.');
assert(protectedResult.player.stockTakeovers[0].companyName === 'Rebel House', 'The takeover record should follow the live rebrand.');
assert(protectedResult.player.businesses[0].studioState?.saleDeck?.studioName === 'Rebel House', 'An open studio sale file should follow the live rebrand.');
const nameRightsCase = protectedResult.player.flags.activeCases?.find((legalCase: any) => (
    legalCase.caseType === 'STUDIO_NAME_RIGHTS'
));
assert(nameRightsCase, 'Breaking a signed name-protection promise should create a naming-rights lawsuit.');
assert(nameRightsCase.nextHearingWeek === 13, 'The first naming-rights hearing should be scheduled for the following week.');
const hearing = createStudioNameRightsHearing(protectedResult.player, nameRightsCase.id);
assert(hearing?.options.length === 3, 'The naming-rights hearing should offer settle, restore, and fight paths.');
const restoreOption = hearing?.options.find(option => option.id === 'RESTORE_NAME');
const settleOption = hearing?.options.find(option => option.id === 'SETTLE_KEEP_NAME');
const fightOption = hearing?.options.find(option => option.id === 'FIGHT_CASE');
assert(restoreOption?.impact, 'The hearing should provide a playable protected-name restoration path.');
assert(settleOption?.impact, 'The hearing should provide a playable settlement path.');
assert(fightOption?.impact, 'The hearing should provide a playable courtroom-defense path.');
const settled = settleOption!.impact!(structuredClone(protectedResult.player)).updatedPlayer;
assert(settled.businesses[0].name === 'Rebel House', 'Settling should keep the rebranded studio name.');
assert(
    settled.flags.activeCases.find((legalCase: any) => legalCase.id === nameRightsCase.id)?.status === 'SETTLED',
    'Settling should close the naming-rights case.',
);
assert(
    settled.businesses[0].studioState?.financeLedger?.[0]?.label === 'Name-rights settlement',
    'The settlement should be charged to the subsidiary ledger.',
);
const defended = fightOption!.impact!(structuredClone(protectedResult.player)).updatedPlayer;
assert(
    defended.flags.activeCases.find((legalCase: any) => legalCase.id === nameRightsCase.id)?.currentHearing === 2,
    'Fighting the claim should advance the case to its next hearing.',
);
assert(
    defended.businesses[0].studioState?.financeLedger?.[0]?.type === 'LEGAL',
    'Fighting the claim should charge legal counsel to the subsidiary.',
);
const secondFightPlayer = { ...defended, currentWeek: 13 };
const secondHearing = createStudioNameRightsHearing(secondFightPlayer, nameRightsCase.id);
const secondDefended = secondHearing!.options.find(option => option.id === 'FIGHT_CASE')!
    .impact!(structuredClone(secondFightPlayer)).updatedPlayer;
const finalFightPlayer = { ...secondDefended, currentWeek: 14 };
const finalHearing = createStudioNameRightsHearing(finalFightPlayer, nameRightsCase.id);
const finalDefended = finalHearing!.options.find(option => option.id === 'FIGHT_CASE')!
    .impact!(structuredClone(finalFightPlayer)).updatedPlayer;
assert(
    ['WON', 'LOST'].includes(finalDefended.flags.activeCases.find((legalCase: any) => legalCase.id === nameRightsCase.id)?.status),
    'Fighting through all hearings should resolve the case with a final verdict.',
);
assert(finalDefended.businesses[0].name === 'Rebel House', 'Fighting the case should not silently change the studio name.');

const restorationPlayer = { ...protectedResult.player, currentWeek: 13 };
const restorationHearing = createStudioNameRightsHearing(restorationPlayer, nameRightsCase.id);
const restored = restorationHearing!.options.find(option => option.id === 'RESTORE_NAME')!
    .impact!(structuredClone(restorationPlayer)).updatedPlayer;
assert(restored.businesses[0].name === 'Heritage Pictures', 'Restoring the protected name should update the live studio identity.');
assert(
    restored.flags.activeCases.find((legalCase: any) => legalCase.id === nameRightsCase.id)?.status === 'SETTLED',
    'Restoring the protected name should close the lawsuit.',
);
assert(
    !restored.businesses[0].studioState?.brokenAcquisitionCommitments?.includes('PRESERVE_STUDIO_NAME'),
    'Restoring the protected name should cure the broken name commitment.',
);
assert(
    restored.businesses[0].studioState?.financeLedger?.[0]?.type === 'LEGAL',
    'Court and reversal costs should be recorded in the subsidiary finance ledger.',
);
assert(restored.flags.studioAcquisitionCases[0].studioName === 'Heritage Pictures', 'Name restoration should update the acquisition record.');
assert(restored.flags.acquisitionDebtLedger[0].studioName === 'Heritage Pictures', 'Name restoration should update the debt ledger.');
assert(restored.businesses[0].studioState?.saleDeck?.studioName === 'Heritage Pictures', 'Name restoration should update an open sale file.');
assert(restored.stocks[0].name === 'Heritage Pictures', 'Name restoration should update the linked stock identity.');
assert(restored.stockTakeovers[0].companyName === 'Heritage Pictures', 'Name restoration should update the takeover record.');
assert(
    restored.businesses[0].studioState?.formerNames?.includes('Rebel House'),
    'The reversed rebrand should remain in studio name history.',
);
assert(
    getStudioRenameCooldownWeeks(restored, restored.businesses[0]) === 3,
    'A court-ordered restoration should not bypass the original four-week rollout cooldown.',
);

const unresolvedCaseAfterCooldown = {
    ...protectedResult.player,
    currentWeek: 16,
};
const blockedByCourt = renameAcquiredStudio({
    player: unresolvedCaseAfterCooldown,
    studioId: protectedStudio.id,
    value: 'Escape The Lawsuit Studios',
});
assert(
    !blockedByCourt.success && blockedByCourt.reason === 'LEGAL_CASE_ACTIVE',
    'An unresolved naming-rights case must block another rename even after the rollout cooldown.',
);

const underfundedStudio = makeStudio({ balance: 1 });
const underfundedPlayer = makePlayer({ studio: underfundedStudio });
const underfundedResult = renameAcquiredStudio({
    player: underfundedPlayer,
    studioId: underfundedStudio.id,
    value: 'No Cash Films',
});
assert(
    !underfundedResult.success && underfundedResult.reason === 'INSUFFICIENT_STUDIO_CAPITAL',
    'A studio without enough capital must not receive a free rebrand.',
);

console.log('Studio rebrand audit passed.');
