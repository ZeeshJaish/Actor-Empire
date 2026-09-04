import { buildForbesStudioProfile } from '../services/forbesStudioProfile';
import {
    buildPublicIndustryProjection,
    getCanonicalReleasedMarketProjects,
    getCanonicalScheduledRivals,
} from '../services/industryWorld/publicIndustryProjection';
import { INITIAL_PLAYER } from '../types';
import type { IndustryProductionCommitment, Player } from '../types';

const currentAbsoluteWeek = (40 - 1) * 52 + (12 - 1);
const production = (id: string, strategy: 'THEATRICAL' | 'STREAMING_ONLY', releaseOffset: number): IndustryProductionCommitment => ({
    id: `production_${id}`,
    canonicalProjectId: id,
    title: id === 'project_theatrical' ? 'Midnight Republic' : 'Signal Room',
    projectType: 'MOVIE',
    genre: id === 'project_theatrical' ? 'THRILLER' : 'SCI_FI',
    producerStudioId: 'rival_studio',
    source: 'STUDIO_INDEPENDENT',
    status: 'AWAITING_RELEASE',
    productionCalendar: {
        preProductionWeeks: 4, productionWeeks: 8, postProductionWeeks: 4,
        totalWeeks: 16, focusWindowWeeks: 4, elapsedWeeks: 16,
        startedAbsoluteWeek: currentAbsoluteWeek - 16,
    },
    budgetMillions: 80,
    paidMillions: 80,
    talentBookingIds: [],
    writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Story Unit', writerSkill: 78,
    createdAtAbsoluteWeek: currentAbsoluteWeek - 20,
    updatedAtAbsoluteWeek: currentAbsoluteWeek,
    studioAiExecution: {
        schemaVersion: 1,
        source: 'STUDIO_INDEPENDENT',
        slateCommitmentId: `slate_${id}`,
        fingerprintId: `fingerprint_${id}`,
        controllerAtLastProgression: 'AI',
        selectedReleaseMode: strategy === 'STREAMING_ONLY' ? 'STREAMING_ONLY' : 'WIDE_THEATRICAL',
        publicReleaseStrategy: strategy,
        plannedReleaseAbsoluteWeek: currentAbsoluteWeek + releaseOffset,
        talentSelected: true,
        talent: null,
        finalQuality: { creativeQuality: 82, executionQuality: 79, commercialPotential: 76, prestigePotential: 65, downsideRisk: 22 },
        result: null,
        problems: [], paidMilestoneIds: [], processedKeys: [],
        nextReviewAbsoluteWeek: currentAbsoluteWeek + releaseOffset,
        lastProgressedAbsoluteWeek: currentAbsoluteWeek,
    },
});

const theatrical = production('project_theatrical', 'THEATRICAL', 3);
const streaming = production('project_streaming', 'STREAMING_ONLY', 3);
const released = {
    id: theatrical.canonicalProjectId,
    title: theatrical.title,
    genre: theatrical.genre,
    mediaType: 'MOVIE' as const,
    studioId: theatrical.producerStudioId,
    budgetTier: 'MID' as const,
    quality: 82,
    rating: 7.9,
    boxOffice: 280_000_000,
    year: 40,
    weekReleased: 10,
    leadActorId: 'actor_1', leadActorName: 'Asha Vale',
    directorId: 'director_1', directorName: 'Mira Cross',
    reviews: 'A major audience and critical success',
    awardProfile: {
        leadPerformance: 80, directing: 81, screenplay: 78, cinematography: 79,
        picture: 82, originalScore: 74, originalSong: 40, campaign: 76,
    },
    releaseStrategy: 'THEATRICAL' as const,
};

const player: Player = {
    ...INITIAL_PLAYER,
    age: 40,
    currentWeek: 12,
    world: {
        ...INITIAL_PLAYER.world,
        projects: [released],
        industryProductions: { [theatrical.id]: theatrical, [streaming.id]: streaming },
    },
    news: [{
        id: 'news_release', headline: 'Midnight Republic breaks out', category: 'INDUSTRY',
        week: 10, year: 40, impactLevel: 'HIGH', projectId: released.id, industryEventId: 'event_release',
    }],
};

const rivals = getCanonicalScheduledRivals(player.world, currentAbsoluteWeek, 8);
if (rivals.length !== 1 || rivals[0].id !== theatrical.canonicalProjectId || rivals[0].weekReleased !== player.currentWeek + 3) {
    throw new Error('Release competition must use the canonical B6 schedule and exclude streaming-only titles.');
}
const market = getCanonicalReleasedMarketProjects(player.world, currentAbsoluteWeek, 8);
if (market.length !== 1 || market[0].id !== released.id) {
    throw new Error('Theatrical market charts must reuse released canonical projects.');
}
const surfaces = buildPublicIndustryProjection(player, released.id);
const identities = [surfaces.imdb?.projectId, surfaces.boxOffice?.projectId, surfaces.awards?.projectId, surfaces.news[0]?.projectId];
if (identities.some(id => id !== released.id) || new Set(identities).size !== 1) {
    throw new Error('IMDb, box office, awards, and news must point to one canonical project identity.');
}
if (buildPublicIndustryProjection(player, streaming.canonicalProjectId).boxOffice !== null) {
    throw new Error('Streaming-only projects must never appear as theatrical box-office records.');
}

const distressed = buildForbesStudioProfile({
    studio: { id: 'rival_studio', name: 'Rival Studio', valuation: 0.04, reputation: 34, cashReserve: -8, recentHits: 0, archetype: 'GENRE HOUSE', isNpcVenture: true },
    rank: 18,
    worldProjects: [{ ...released, studioId: 'rival_studio', reviews: 'FLOP', boxOffice: 12_000_000 }],
    universes: {},
    venture: { hits: 0, flops: 3, risk: 85, creativeQuality: 48, cashReserve: -8, valuation: 0.04, ownerName: 'Rival Founder', history: [] },
} as any);
if ((distressed as any).publicStatusLabel !== undefined || distressed.distressEvidence.length === 0 || distressed.publicSignals.length === 0) {
    throw new Error('Rival Forbes profiles must communicate evidence, not expose a raw internal status label.');
}

console.log('B7 public industry parity audit passed.');
