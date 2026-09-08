import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player } from '../../types';

export const contentMarketFixture = (): Player => {
    const p = structuredClone(INITIAL_PLAYER) as Player;
    p.id = 'cm1-player'; p.age = 25; p.currentWeek = 12;
    p.energy.current = 100;
    p.businesses = [{ id: 'cm1-studio', name: 'Empire Studios', type: 'PRODUCTION_HOUSE', isActive: true } as any];
    p.pastProjects = [{ id: 'owned-cm1', name: 'The Last Light', studioId: 'cm1-studio', projectType: 'MOVIE', genre: 'DRAMA', imdbRating: 8 } as any];
    p.world.projects = Array.from({ length: 6 }, (_, i) => ({ id: `cm1-film-${i}`, title: `The Harbour ${i + 1}`, studioId: 'seller-cm1',
        mediaType: 'MOVIE', genre: 'DRAMA', rating: 7, year: 24, boxOffice: 50_000_000 } as any));
    p.world.streamingRightsContracts = {};
    p.ownedStreamingPlatform = { ...createInitialOwnedStreamingPlatformState(p.id), lifecycle: 'FOUNDING', treasuryCash: 500_000_000,
        foundingProfile: { incorporationModel: 'FIXED_V7', founderCashCharged: 85_000_000, setupCostsConsumed: 70_000_000,
            openingTreasuryCash: 15_000_000, incorporatedAtAbsoluteWeek: 1200 } as any,
        identity: { name: 'Empire+', slug: 'empire-plus', primaryColor: '#684cff', secondaryColor: '#101014', logoKey: 'FRAME_PLAY',
            brandPromiseId: 'BALANCED', dayOneMarketIds: ['IN', 'US'], foundedAtAbsoluteWeek: 1200 } as any };
    return p;
};
