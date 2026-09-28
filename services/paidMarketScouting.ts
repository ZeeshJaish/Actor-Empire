import type { Player, Script, Genre, Writer } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { getStreamingMarketCycle } from './streamingMarketSupply';
import { advanceStreamingOpportunityMarket, buildStreamingOpportunityOffer } from './streamingOpportunityMarket';
import { getStreamingCataloguePackageOpportunities } from './streamingRightsMarketplace';
import { getContentMarketFunds } from './streamingContentMarket';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { normalizeStudioState } from './businessLogic';
import { WRITER_NPC_LIBRARY } from './writerNpcLibrary';

export const PAID_SCOUT_BASE_PRICE = 450_000;
export const getNextPaidScoutPrice = (completedInCycle: number): number => {
    const count = Number.isSafeInteger(completedInCycle) && completedInCycle > 0 ? completedInCycle : 0;
    return PAID_SCOUT_BASE_PRICE * (count + 1);
};

export interface PaidScoutQuote { price: number; completedInCycle: number; cycle: number; funds: number; shortfall: number }
export interface PaidScoutResult { player: Player; changed: boolean; detail: string }
const quote = (cycle: number, count: number, funds: number): PaidScoutQuote => {
    const price = getNextPaidScoutPrice(count);
    const safeFunds = Number.isFinite(funds) ? Math.max(0, funds) : 0;
    return { price, completedInCycle: count, cycle, funds: safeFunds, shortfall: Math.max(0, price - safeFunds) };
};
const currentCycle = (player: Player) => getStreamingMarketCycle(getAbsoluteWeek(player.age, player.currentWeek));

export const getStudioPaidScoutQuote = (player: Player, studioId: string): PaidScoutQuote => {
    const cycle = currentCycle(player);
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    const state = studio?.studioState;
    const count = state?.paidScoutCycle === cycle && Number.isSafeInteger(state.paidScoutCount)
        ? Math.max(0, state.paidScoutCount || 0) : 0;
    return quote(cycle, count, Math.max(0, studio?.balance || 0));
};

const STUDIO_GENRES: Genre[] = ['DRAMA', 'THRILLER', 'COMEDY', 'ACTION', 'ROMANCE', 'MYSTERY', 'HORROR', 'SCI_FI', 'ADVENTURE', 'BIOPIC'];
const WORD_A = ['Northern', 'Quiet', 'Golden', 'Hidden', 'Silver', 'Broken', 'Last', 'Midnight', 'Wild', 'Paper', 'Second', 'Distant', 'Blue', 'Final', 'Secret', 'Summer'];
const WORD_B = ['Signal', 'Harbour', 'Promise', 'River', 'Witness', 'Valley', 'Garden', 'Orbit', 'Letter', 'Crossing', 'Frontier', 'Shadow', 'Crown', 'Atlas', 'Memory', 'Season'];
const WORD_C = ['Dawn', 'Winter', 'Tomorrow', 'Night', 'Glass', 'Silence', 'Fire', 'Stars', 'Home', 'Rain', 'Light', 'Time'];
const buildStudioShelf = (player: Player, studioId: string, cycle: number, ordinal: number): Script[] => {
    const scripts: Script[] = [];
    for (let index = 0; index < 6; index += 1) {
        const number = (cycle * 101 + ordinal * 6 + index) % (WORD_A.length * WORD_B.length * WORD_C.length);
        const title = `${WORD_A[number % WORD_A.length]} ${WORD_B[Math.floor(number / WORD_A.length) % WORD_B.length]} of ${WORD_C[Math.floor(number / (WORD_A.length * WORD_B.length)) % WORD_C.length]}`;
        const rng = createDeterministicRng(`${player.id}:${studioId}:paid-script:v1:${cycle}:${ordinal}:${index}`);
        const genre = STUDIO_GENRES[Math.floor(rng() * STUDIO_GENRES.length)];
        const quality = 35 + Math.floor(rng() * 55);
        scripts.push({ id: createDeterministicId('paid_studio_script', player.id, studioId, cycle, ordinal, index),
            title, genres: [genre], status: 'READY', quality, baseQuality: quality,
            options: [], writerId: null, weeksInDevelopment: 0, totalDevelopmentWeeks: 0,
            isOriginal: false, projectType: rng() < .25 ? 'SERIES' : 'MOVIE',
            sourceMaterial: 'ORIGINAL', sourceMaterialType: 'SPEC_SCRIPT',
            logline: `A ${genre.toLowerCase().replaceAll('_', ' ')} story from an independent creator, available to develop at your studio.`,
            purchaseCost: Math.round((250_000 + quality * 16_000 + rng() * 900_000) / 50_000) * 50_000,
            hype: Math.floor(rng() * 60), tags: quality > 76 ? ['High Concept'] : [],
        });
    }
    return scripts;
};

const buildWriterShelf = (player: Player, studioId: string, cycle: number, ordinal: number): Writer[] => {
    const rng = createDeterministicRng(`${player.id}:${studioId}:paid-writers:v1:${cycle}:${ordinal}`);
    const pool = WRITER_NPC_LIBRARY.slice().sort((left, right) => left.id.localeCompare(right.id));
    for (let index = pool.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(rng() * (index + 1));
        [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    return pool.slice(0, 10).map(profile => ({ id: profile.id, name: profile.name,
        skill: profile.writerSkill, speed: profile.writerSpeed,
        fee: Math.round((profile.writerTier === 'A_LIST' ? 500_000 : 100_000)
            + profile.writerSkill * 4_000 + rng() * 100_000),
        tier: profile.writerTier, stats: profile.writerStats }));
};

export const refreshStudioPaidScout = (player: Player, studioId: string): PaidScoutResult => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) return { player, changed: false, detail: 'This production studio is not available.' };
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    const offer = getStudioPaidScoutQuote(player, studioId);
    if (offer.shortfall) return { player, changed: false, detail: `Studio funds are short by $${offer.shortfall.toLocaleString()}.` };
    const shelf = buildStudioShelf(player, studioId, offer.cycle, offer.completedInCycle + 1);
    const priorTitles = new Set([...(studioState.ipMarket || []), ...(studioState.scripts || [])].map(script => script.title));
    (studioState.purchasedIPTitles || []).forEach(title => priorTitles.add(title));
    if (!shelf.length || shelf.some(script => priorTitles.has(script.title)))
        return { player, changed: false, detail: 'No distinct scripts were found. No scouting fee was charged.' };
    const updatedStudio = { ...studio, balance: studio.balance - offer.price,
        studioState: { ...studioState, ipMarket: shelf,
            writers: buildWriterShelf(player, studioId, offer.cycle, offer.completedInCycle + 1),
            paidScoutCycle: offer.cycle, paidScoutCount: offer.completedInCycle + 1 } };
    return { player: { ...player, businesses: player.businesses.map(business => business.id === studioId ? updatedStudio : business) },
        changed: true, detail: `Six new scripts scouted for your studio.` };
};

export const getStreamingPaidScoutQuote = (player: Player): PaidScoutQuote => {
    const cycle = currentCycle(player);
    const state = player.world.streamingOpportunityMarket;
    const count = state?.cycle === cycle && Number.isSafeInteger(state.paidScoutCount)
        ? Math.max(0, state.paidScoutCount || 0) : 0;
    return quote(cycle, count, getContentMarketFunds(player));
};

export const refreshStreamingPaidScout = (player: Player): PaidScoutResult => {
    if (!['FOUNDING', 'ACTIVE'].includes(player.ownedStreamingPlatform?.lifecycle))
        return { player, changed: false, detail: 'Open your streaming platform before scouting.' };
    const prepared = advanceStreamingOpportunityMarket(player);
    const state = prepared.world.streamingOpportunityMarket!;
    const offer = getStreamingPaidScoutQuote(prepared);
    if (offer.shortfall) return { player, changed: false, detail: `Platform funds are short by $${offer.shortfall.toLocaleString()}.` };
    const ordinal = offer.completedInCycle + 1;
    const currentTitles = new Set([
        ...state.offers.map(item => item.title),
        ...(Array.isArray(state.scoutedOffers) ? state.scoutedOffers : []).map(item => item.title),
        ...prepared.world.projects.map(item => item.title),
    ]);
    const scoutedOffers = [] as ReturnType<typeof buildStreamingOpportunityOffer>[];
    let candidateIndex = offer.cycle * 997 + ordinal * 20;
    while (scoutedOffers.length < 20 && candidateIndex < offer.cycle * 997 + ordinal * 20 + 500) {
        const candidate = buildStreamingOpportunityOffer(prepared, offer.cycle, candidateIndex++, 'SCOUTED');
        if (currentTitles.has(candidate.title)) continue;
        scoutedOffers.push(candidate);
        currentTitles.add(candidate.title);
    }
    if (scoutedOffers.length !== 20)
        return { player, changed: false, detail: 'No distinct new offers were found. No scouting fee was charged.' };
    const publicCollectionIds = new Set(state.collectionIds);
    const scoutedCollectionIds = getStreamingCataloguePackageOpportunities(prepared)
        .filter(collection => !publicCollectionIds.has(collection.id))
        .slice(0, 5).map(collection => collection.id);
    const platform = normalizeOwnedStreamingPlatformState(prepared.ownedStreamingPlatform, prepared.id);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({ ...platform,
        treasuryCash: platform.treasuryCash - offer.price }, prepared.id);
    return { player: { ...prepared, ownedStreamingPlatform: nextPlatform,
        world: { ...prepared.world, streamingOpportunityMarket: { ...state,
            scoutedOffers, scoutedCollectionIds, paidScoutCount: ordinal } } },
        changed: true, detail: `${scoutedOffers.length + scoutedCollectionIds.length} new player-first offers scouted.` };
};
