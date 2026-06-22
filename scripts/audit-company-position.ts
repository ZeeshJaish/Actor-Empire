import { getCompanyPosition } from '../services/companyPosition';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const basePlayer: any = {
    stocks: [{
        id: 'stk_public',
        symbol: 'PUB',
        name: 'Public Pictures',
        sector: 'MEDIA',
        price: 50,
        volatility: 0.02,
        dividendYield: 0.04,
        relatedStudioId: 'PUBLIC_STUDIO',
        outstandingShares: 1_000,
        priceHistory: [50],
        lastDividendPayoutWeek: 0,
    }],
    portfolio: [{ stockId: 'stk_public', shares: 125 }],
    flags: {},
};

const publicProfile: any = {
    id: 'PUBLIC_STUDIO',
    name: 'Public Pictures',
    acquisitionState: 'PUBLICLY_TRADED',
    ownershipStructure: 'Public company · Institutional ownership',
    isPlayerOwned: false,
    valuation: 50_000,
};

const publicPosition = getCompanyPosition(basePlayer, publicProfile);
assert(publicPosition.strategicThreshold === 20, 'Public studios should require a 20% strategic stake.');
assert(publicPosition.shares === 125, 'The position should reuse the existing portfolio share count.');
assert(publicPosition.stockValue === 6_250, 'The public holding should use the live stock price.');
assert(publicPosition.stockPercent === 12.5, 'Ownership percentage should use outstanding shares.');
assert(publicPosition.ownershipPercent === 12.5, 'Combined ownership should include the public holding.');
assert(publicPosition.influenceStatus === 'FINANCIAL_STAKE', 'A sub-threshold public holding should remain financial.');
assert(publicPosition.estimatedAnnualDividend === 250, 'Annual dividends should use holding value and yield.');

const strategicPublic = getCompanyPosition({
    ...basePlayer,
    portfolio: [{ stockId: 'stk_public', shares: 250 }],
} as any, publicProfile);
assert(strategicPublic.influenceStatus === 'STRATEGIC_STAKE', 'A 25% public holding should grant strategic influence.');

const privateProfile: any = {
    ...publicProfile,
    id: 'PRIVATE_STUDIO',
    name: 'Private Pictures',
    acquisitionState: 'OPEN_TO_OFFERS',
    ownershipStructure: 'Privately held · Strategic ownership group',
};
const privatePosition = getCompanyPosition({
    ...basePlayer,
    portfolio: [],
    flags: {
        companyEquityPositions: [{ studioId: 'PRIVATE_STUDIO', percent: 18, investedAmount: 9_000 }],
    },
} as any, privateProfile);
assert(privatePosition.strategicThreshold === 25, 'Strategic private ownership should require 25%.');
assert(privatePosition.negotiatedPercent === 18, 'Negotiated equity should contribute to the company position.');
assert(privatePosition.investedValue === 9_000, 'Negotiated investment value should be retained.');

const founderProfile: any = {
    ...privateProfile,
    id: 'FOUNDER_STUDIO',
    ownershipStructure: 'Privately held · Founder controlled',
};
const founderPosition = getCompanyPosition({
    ...basePlayer,
    portfolio: [],
    flags: {
        companyEquityPositions: [{ studioId: 'FOUNDER_STUDIO', percent: 30, investedAmount: 15_000 }],
    },
} as any, founderProfile);
assert(founderPosition.strategicThreshold === 30, 'Founder-controlled studios should require 30%.');
assert(founderPosition.influenceStatus === 'STRATEGIC_STAKE', 'Meeting a founder threshold should grant strategic influence.');

const playerPosition = getCompanyPosition(basePlayer, {
    ...privateProfile,
    id: 'PLAYER_STUDIO',
    isPlayerOwned: true,
});
assert(playerPosition.ownershipPercent === 100, 'Player-owned companies should show full ownership.');
assert(playerPosition.influenceStatus === 'CONTROLLING_OWNER', 'Player-owned companies should show controlling ownership.');

const legacyStockPlayer: any = {
    ...basePlayer,
    stocks: [{ ...basePlayer.stocks[0], id: 'legacy_stock', outstandingShares: undefined, price: 50 }],
    portfolio: [{ stockId: 'legacy_stock', shares: 10_000 }],
};
const legacyProfile = { ...publicProfile, valuation: 100_000_000 };
const legacyBefore = getCompanyPosition(legacyStockPlayer, legacyProfile);
const legacyAfter = getCompanyPosition({
    ...legacyStockPlayer,
    stocks: [{ ...legacyStockPlayer.stocks[0], price: 100 }],
}, legacyProfile);
assert(
    legacyBefore.stockPercent === legacyAfter.stockPercent,
    'Legacy saves should receive a stable outstanding-share fallback even when stock price changes.',
);

console.log('Company position audit passed.');
