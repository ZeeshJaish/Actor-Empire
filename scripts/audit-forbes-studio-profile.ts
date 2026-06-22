import { buildForbesStudioProfile } from '../services/forbesStudioProfile';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const staticStudio: any = {
    id: 'WARNER_BROS',
    name: 'Warner Bros.',
    valuation: 74,
    reputation: 90,
    cashReserve: 5000,
    recentHits: 2,
    archetype: 'LEGACY',
};

const staticInput: any = {
    studio: staticStudio,
    rank: 3,
    worldProjects: [
        { id: 'old', title: 'Older Film', studioId: 'WARNER_BROS', boxOffice: 180_000_000, quality: 66, reviews: 'MIXED', year: 20, weekReleased: 4 },
        { id: 'new', title: 'New Hit', studioId: 'WARNER_BROS', boxOffice: 650_000_000, quality: 87, reviews: 'HIT', year: 21, weekReleased: 20 },
        { id: 'other', title: 'Other Studio', studioId: 'HBO', boxOffice: 900_000_000, quality: 90, reviews: 'HIT', year: 22, weekReleased: 1 },
    ],
    universes: {},
    playerFranchiseIds: [],
};

const first = buildForbesStudioProfile(staticInput);
const second = buildForbesStudioProfile(staticInput);
assert(JSON.stringify(first) === JSON.stringify(second), 'Studio profiles must be deterministic for the same save data.');
assert(first.acquisitionState === 'PUBLICLY_TRADED', 'A major listed company should be publicly traded.');
assert(first.valuation === 74_000_000_000 && first.capital === 5_000_000_000, 'Profile finance values should use dollars.');
assert(first.catalog.length === 2 && first.catalog[0].title === 'New Hit', 'Catalog should use this studio’s releases, newest first.');
assert(first.hits === 1 && first.flops === 0, 'World project outcomes should drive performance counts.');
assert(first.franchiseCount > 0, 'Empty player-only fields must not suppress market-studio franchise estimates.');

const venture = buildForbesStudioProfile({
    studio: { id: 'venture_1', name: 'Risk House', valuation: 0.04, reputation: 24.7, cashReserve: -6, recentHits: 0, archetype: 'GENRE HOUSE', isNpcVenture: true, ownerName: 'Ava Risk' },
    rank: 12,
    worldProjects: [],
    universes: {},
    venture: {
        hits: 0,
        flops: 3,
        risk: 82,
        creativeQuality: 48,
        cashReserve: -6,
        valuation: 0.04,
        ownerName: 'Ava Risk',
        history: [{ id: 'miss', title: 'Last Chance', year: 21, week: 40, revenue: 4_000_000, profit: -16_000_000, quality: 38, outcome: 'FLOP' }],
    },
} as any);
assert(venture.acquisitionState === 'AUCTION_EXPECTED', 'A failing venture with negative cash should expect an auction.');
assert(venture.debt > 0 && venture.profitability < 0, 'Venture debt and profitability should reflect its real history.');
assert(venture.managementPersonality.includes('Ava Risk'), 'Founder-led ventures should identify their manager.');
assert(venture.reputation === 25, 'Profile reputation should be a clean whole-number score.');

const playerStudio = buildForbesStudioProfile({
    studio: { id: 'player_studio', name: 'Player Pictures', valuation: 1.2, reputation: 70, cashReserve: 180, recentHits: 1, archetype: 'PLAYER STUDIO', isPlayerOwned: true },
    rank: 7,
    worldProjects: [],
    universes: {},
    playerBusiness: { balance: 180_000_000, history: [{ week: 1, profit: 12_000_000 }], staff: [{ id: 'staff_1' }] },
    playerProjects: [{ id: 'player_hit', title: 'Player Hit', year: 21, week: 12, revenue: 260_000_000, quality: 82, outcome: 'HIT' }],
    playerRights: [{ id: 'right_1', title: 'Solar Vow' }, { id: 'right_2', title: 'Player Hit' }],
    playerFranchiseIds: ['franchise_player_hit'],
    playerFacilities: ['Writing Department L2', 'Camera Department L1'],
    playerTalent: [{ name: 'Ava Star', role: 'Lead Actor' }, { name: 'Noah Lens', role: 'Director' }],
} as any);
assert(playerStudio.acquisitionState === 'NOT_FOR_SALE', 'The player’s studio must not be listed for acquisition.');
assert(playerStudio.ownershipStructure === 'Privately held · Player controlled', 'Player ownership should be explicit.');
assert(playerStudio.profitability === 12_000_000, 'Player profitability should reuse business history.');
assert(playerStudio.catalog.length === 1 && playerStudio.hits === 1, 'Player profiles should reuse the studio’s released catalog.');
assert(playerStudio.rightsCount === 2 && playerStudio.rightsHighlights[0] === 'Solar Vow', 'Player profiles should expose owned rights and IP.');
assert(playerStudio.franchiseCount === 1, 'Player profiles should expose existing franchise IDs.');
assert(playerStudio.facilities.length === 2 && playerStudio.facilitiesEstimated === false, 'Player facilities should use actual studio upgrades.');
assert(playerStudio.keyTalent.length === 2 && playerStudio.keyTalent[0].name === 'Ava Star', 'Player profiles should expose real studio talent.');
assert(playerStudio.assetDataSource === 'SAVE_DATA', 'Player company assets should be labelled as save data.');

assert(first.facilities.length > 0 && first.facilitiesEstimated === true, 'Market studios should receive stable Forbes facility estimates when save data is absent.');
assert(first.keyTalent.some((talent: any) => talent.name === 'New Hit' ? false : true), 'Market profiles should expose project-derived or estimated talent intelligence.');
assert(first.assetDataSource === 'FORBES_ESTIMATE', 'Static market company assets should identify Forbes estimates.');

console.log('Forbes studio profile audit passed.');
