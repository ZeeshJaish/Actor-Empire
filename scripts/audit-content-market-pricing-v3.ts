import assert from 'node:assert/strict';
import { createDefaultStreamingCatalogDraft, getStreamingLicenseCandidatePool, getStreamingLicenseQuote,
    submitStreamingCatalogOffer, type StreamingCatalogTitle } from '../services/streamingCatalog';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getStreamingMarketCycle } from '../services/streamingMarketSupply';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingRightsOpportunities } from '../services/streamingRightsMarketplace';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { advanceStreamingOpportunityMarket, buildStreamingOpportunityOffer,
    purchaseStreamingOpportunityOffer } from '../services/streamingOpportunityMarket';
import { getHistoricalCatalogueTitles, initializeHistoricalCatalogue } from '../services/historicalCatalogue';

const film: StreamingCatalogTitle = {
    id: 'value-film', title: 'Value Film', projectType: 'MOVIE', genre: 'DRAMA',
    rating: 7, releaseYear: 25, gross: 50_000_000, studioId: 'studio-a',
    studioName: 'Studio A', source: 'EXTERNAL_MARKET', quality: 70, reach: 50,
    prestige: 50, budgetTier: 'MID',
} as StreamingCatalogTitle;
const quote = (title: StreamingCatalogTitle, territory: 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL',
    weeks: number, exclusivity: 'NON_EXCLUSIVE' | 'EXCLUSIVE', window: 'FIRST_WINDOW' | 'SECOND_WINDOW' = 'FIRST_WINDOW') =>
    getStreamingLicenseQuote(title, territory, weeks, exclusivity, 3 as any, window).suggestedGuarantee;

const midGlobal = quote(film, 'GLOBAL', 104, 'NON_EXCLUSIVE');
assert.ok(midGlobal >= 70_000_000 && midGlobal <= 150_000_000,
    `A solid mid-budget film's two-year global shared rights should be substantial, got ${midGlobal}`);
assert.ok(quote({ ...film, budgetTier: 'LOW' } as StreamingCatalogTitle, 'DOMESTIC', 52, 'NON_EXCLUSIVE') < 30_000_000,
    'Limited rights to a smaller film must stay accessible to a new platform');
assert.ok(quote(film, 'DOMESTIC', 104, 'NON_EXCLUSIVE') < midGlobal);
assert.ok(quote(film, 'GLOBAL', 52, 'NON_EXCLUSIVE') < midGlobal);
assert.ok(quote(film, 'GLOBAL', 260, 'NON_EXCLUSIVE') > quote(film, 'GLOBAL', 156, 'NON_EXCLUSIVE'),
    'Five-year rights must be worth more than three-year rights');
assert.ok(quote(film, 'GLOBAL', 104, 'EXCLUSIVE') > midGlobal);
assert.ok(quote(film, 'GLOBAL', 104, 'NON_EXCLUSIVE', 'SECOND_WINDOW') < midGlobal);

const headline: StreamingCatalogTitle = { ...film, id: 'headline-series', projectType: 'SERIES',
    gross: 0, budgetTier: 'HIGH', quality: 94, reach: 91, prestige: 88,
    rating: 9.1, catalogueTier: 'MARQUEE' } as StreamingCatalogTitle;
assert.ok(quote(headline, 'GLOBAL', 104, 'NON_EXCLUSIVE') >= 300_000_000,
    'A premium series with no box office must still carry meaningful worldwide value');
assert.ok(quote(headline, 'GLOBAL', 104, 'EXCLUSIVE') > quote(headline, 'GLOBAL', 104, 'NON_EXCLUSIVE'));
assert.ok(Number.isFinite(quote({ ...film, gross: Number.NaN, quality: Number.NaN,
    reach: Number.NaN, prestige: Number.NaN } as StreamingCatalogTitle, 'GLOBAL', 104, 'NON_EXCLUSIVE')),
    'Legacy missing performance fields must not produce a broken price');
assert.ok(Number.isFinite(quote({ ...film, budgetTier: 'UNKNOWN' as any } as StreamingCatalogTitle,
    'GLOBAL', 104, 'NON_EXCLUSIVE')), 'Malformed legacy budget tiers must not produce a broken price');

const historicalCareer = initializeHistoricalCatalogue(contentMarketFixture());
const historicalHeadline = getHistoricalCatalogueTitles(historicalCareer)
    .find(title => title.catalogueTier === 'MARQUEE' && title.projectType === 'SERIES')!;
const licensableHeadline = getStreamingLicenseCandidatePool(historicalCareer)
    .find(title => title.id === historicalHeadline.id)!;
assert.equal(licensableHeadline.budgetTier, historicalHeadline.budgetTier,
    'A seeded headline series must carry its production scale into rights valuation');

const freshPolicy = createInitialOwnedStreamingPlatformState('fresh-v3').marketQuotePolicy;
assert.deepEqual(freshPolicy, { version: 3, effectiveCycle: 0 },
    'Fresh careers must use one shared valuation from their first market cycle');

const legacy = contentMarketFixture();
legacy.ownedStreamingPlatform.marketQuotePolicy = { version: 2, effectiveCycle: 0 };
const currentCycle = getStreamingMarketCycle(getAbsoluteWeek(legacy.age, legacy.currentWeek));
const currentOffer = getStreamingRightsOpportunities(legacy)[0];
assert.ok(currentOffer);
const migrated = processOwnedStreamingPlatformWeek(legacy).player;
assert.deepEqual(migrated.ownedStreamingPlatform.marketQuotePolicy,
    { version: 3, effectiveCycle: currentCycle + 1, previousVersion: 2 },
    'An existing career must keep current-cycle prices and schedule V3 for its next shelf');
const sameCycleOffer = getStreamingRightsOpportunities(migrated)
    .find(item => item.id === currentOffer.id);
assert.equal(sameCycleOffer?.quote.suggestedGuarantee, currentOffer.quote.suggestedGuarantee);
const nextCycle = structuredClone(migrated);
nextCycle.currentWeek += 3;
const futureOffer = getStreamingRightsOpportunities(nextCycle)
    .find(item => item.id === currentOffer.id);
assert.ok(futureOffer && futureOffer.quote.suggestedGuarantee > currentOffer.quote.suggestedGuarantee,
    'Only newly rotated listings may adopt the new price');
const saved = compactOwnedStreamingPlatformForPersistence(migrated.ownedStreamingPlatform, migrated.id);
assert.deepEqual(normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(saved)), migrated.id).marketQuotePolicy,
    { version: 3, effectiveCycle: currentCycle + 1, previousVersion: 2 }, 'V3 rollout must survive save serialization');

const newMarket = contentMarketFixture();
newMarket.ownedStreamingPlatform.marketQuotePolicy = { version: 3, effectiveCycle: 0 };
newMarket.ownedStreamingPlatform.treasuryCash = 2_000_000_000;
const cycle = getStreamingMarketCycle(getAbsoluteWeek(newMarket.age, newMarket.currentWeek));
const premiumCard = buildStreamingOpportunityOffer(newMarket, cycle, 0);
const regularCard = buildStreamingOpportunityOffer(newMarket, cycle, 1);
assert.ok(premiumCard.askingPrice >= 200_000_000,
    `A premium worldwide first-window package cannot cost a few million, got ${premiumCard.askingPrice}`);
assert.ok(regularCard.askingPrice >= 50_000_000 && regularCard.askingPrice < premiumCard.askingPrice,
    'An ordinary global offer should be valuable but remain below the headline');
assert.ok(Number((premiumCard as any).productionBudgetEstimate) > 0);
assert.ok(premiumCard.talentUpfrontPool <= Number((premiumCard as any).productionBudgetEstimate) * .15,
    'Talent production fees must be bounded by production scale, not the licence guarantee');
assert.notEqual(premiumCard.talentUpfrontPool, Math.round(premiumCard.askingPrice * .12),
    'Changing rights valuation must not mechanically increase NPC production pay');
const savedMarket = advanceStreamingOpportunityMarket(newMarket);
const oldCard = { ...savedMarket.world.streamingOpportunityMarket!.offers[0],
    askingPrice: 25_000_000, talentUpfrontPool: 2_000_000 };
savedMarket.world.streamingOpportunityMarket!.offers[0] = oldCard;
assert.equal(advanceStreamingOpportunityMarket(savedMarket).world.streamingOpportunityMarket!.offers[0].askingPrice,
    25_000_000, 'An old saved shelf stays at its quoted amount until the rotation');
const boughtOld = purchaseStreamingOpportunityOffer(savedMarket, oldCard.id);
assert.equal(boughtOld.changed, true);
assert.equal(boughtOld.player.ownedStreamingPlatform.treasuryCash,
    savedMarket.ownedStreamingPlatform.treasuryCash - 25_000_000,
    'Signing a saved legacy card uses its frozen guarantee');

const freshOpeningDraft = createDefaultStreamingCatalogDraft(newMarket);
assert.equal((freshOpeningDraft as any).quoteVersion, 3,
    'A new opening catalogue negotiation must use the same rights valuation as the market');
const olderOpening = contentMarketFixture();
delete olderOpening.ownedStreamingPlatform.marketQuotePolicy;
const oldDraft = createDefaultStreamingCatalogDraft(olderOpening);
olderOpening.ownedStreamingPlatform.catalogSetupDraft = oldDraft;
olderOpening.ownedStreamingPlatform.marketQuotePolicy = { version: 3, effectiveCycle: 0 };
const submittedOldDraft = submitStreamingCatalogOffer(olderOpening, oldDraft);
assert.doesNotMatch(submittedOldDraft.message, /Keep the guarantee between/,
    'An in-progress old opening negotiation must not be rejected by a later pricing upgrade');

console.log('Content market pricing V3 quote contract: PASS');
