import type { BudgetTier, IndustryProductionCommitment, IndustryProject, NPCStudioState, PlatformAiProjectStreamingWindow, WorldState } from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { upsertCanonicalIndustryProduction } from '../industryProductions';
import { applyStudioProjectOutcome } from '../studioEcosystem';
import { releaseProjectTalentBookings } from '../talentBookings';
import { appendStudioAiProductionKey } from './studioAiProductionState';
import { STUDIO_AI_LEDGER_LIMIT } from './studioAiState';

const money = (value: number) => Math.round((value + Number.EPSILON * 100) * 1000) / 1000;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const budgetTier = (budget: number): BudgetTier => budget >= 150 ? 'BLOCKBUSTER' : budget >= 80 ? 'HIGH' : budget >= 30 ? 'MID' : 'LOW';
const yearWeek = (absoluteWeek: number) => ({ year: Math.floor(Math.max(0, absoluteWeek) / 52) + 1, week: Math.max(0, absoluteWeek) % 52 + 1 });

export interface ReleaseStudioAiProductionInput { world: WorldState; studio: NPCStudioState; production: IndustryProductionCommitment; absoluteWeek: number }
export interface ReleaseStudioAiProductionResult { world: WorldState; studio: NPCStudioState; production: IndustryProductionCommitment; project: IndustryProject | null; changed: boolean }

export const releaseStudioAiProduction = (input: ReleaseStudioAiProductionInput): ReleaseStudioAiProductionResult => {
    const execution = input.production.studioAiExecution;
    if (!execution || input.production.source !== 'STUDIO_INDEPENDENT' || input.studio.ai?.controller !== 'AI' || execution.result
        || input.production.status !== 'AWAITING_RELEASE' || !execution.finalQuality || !execution.talent || !execution.publicReleaseStrategy
        || (execution.plannedReleaseAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) > input.absoluteWeek) {
        return { world: input.world, studio: input.studio, production: input.production, project: null, changed: false };
    }
    if (input.world.projects.some(project => project.id === input.production.canonicalProjectId)) return { world: input.world, studio: input.studio, production: input.production, project: null, changed: false };
    const mode = execution.selectedReleaseMode!;
    const streamingContract = Object.values(input.world.streamingRightsContracts || {}).find(contract => contract.sourceProjectId === input.production.canonicalProjectId
        && contract.status === 'ACTIVE' && contract.startsAtAbsoluteWeek <= input.absoluteWeek && contract.expiresAtAbsoluteWeek >= input.absoluteWeek && contract.buyerPlatformId);
    if ((mode === 'STREAMING_ONLY' || mode === 'THEATRICAL_THEN_STREAMING') && !streamingContract) return { world: input.world, studio: input.studio, production: input.production, project: null, changed: false };
    const quality = execution.finalQuality;
    const rng = createDeterministicRng(`${input.studio.ai.seed}:b6-commercial:${input.production.id}`);
    const modeMultiplier = mode === 'EVENT_THEATRICAL' ? 1.35 : mode === 'WIDE_THEATRICAL' ? 1.18 : mode === 'PRESTIGE_THEATRICAL' ? 0.82 : mode === 'LIMITED_THEATRICAL' ? 0.58 : mode === 'THEATRICAL_THEN_STREAMING' ? 1.05 : 0;
    const theatricalGrossMillions = execution.publicReleaseStrategy === 'STREAMING_ONLY' ? 0 : money(input.production.budgetMillions * modeMultiplier * (0.60 + quality.commercialPotential / 45) * (0.55 + rng() * 1.30));
    const streamingValueMillions = streamingContract ? money(input.production.budgetMillions * (0.35 + quality.commercialPotential / 100) * (0.65 + rng() * 0.35)) : 0;
    const marketingRate = mode === 'EVENT_THEATRICAL' ? 0.25 : mode === 'WIDE_THEATRICAL' ? 0.18 : mode === 'THEATRICAL_THEN_STREAMING' ? 0.16 : mode === 'PRESTIGE_THEATRICAL' ? 0.12 : 0.08;
    const marketingSpendMillions = money(input.production.budgetMillions * marketingRate);
    if (input.studio.cashReserve < marketingSpendMillions) return { world: input.world, studio: input.studio, production: input.production, project: null, changed: false };
    const studioReceiptsMillions = money(theatricalGrossMillions * 0.48 + streamingValueMillions);
    const netResultMillions = money(studioReceiptsMillions - input.production.budgetMillions - marketingSpendMillions);
    const outcome = netResultMillions >= input.production.budgetMillions * 0.6 ? 'HIT' as const : netResultMillions < 0 ? 'FLOP' as const : 'SOLID' as const;
    const rating = Math.round(clamp(4.2 + quality.creativeQuality * 0.058 + (rng() - 0.5) * 0.5, 1, 10) * 10) / 10;
    const { year, week } = yearWeek(input.absoluteWeek);
    const streamingWindows: PlatformAiProjectStreamingWindow[] = streamingContract ? [{
        id: createDeterministicId('studio_ai_streaming_window', input.production.id, streamingContract.id), platformId: streamingContract.buyerPlatformId!,
        platformContentPlanId: streamingContract.platformContentPlanId || `studio-ai:${input.production.id}`, rightsContractId: streamingContract.id,
        contentSource: 'LICENSED_RELEASED_TITLE', platformRelationship: 'LICENSEE', countryIds: streamingContract.countryIds || [],
        startsAtAbsoluteWeek: input.absoluteWeek, expiresAtAbsoluteWeek: streamingContract.expiresAtAbsoluteWeek,
        exclusivity: streamingContract.exclusivity, localizationLevel: 'SUBTITLES', releasePattern: input.production.projectType === 'MOVIE' ? 'MOVIE_SINGLE_PREMIERE' : 'SERIES_FULL_SEASON', installmentAbsoluteWeeks: [input.absoluteWeek],
        performance: {
            calculatedAtAbsoluteWeek: input.absoluteWeek,
            viewsMillions: money(Math.max(0.1, quality.commercialPotential * input.production.budgetMillions / 240)),
            subscriberImpactMillions: money((quality.commercialPotential - 45) / 80),
            engagementIndexDelta: Math.round((quality.creativeQuality - 50) / 10 * 100) / 100,
            catalogueStrengthDelta: Math.round((quality.commercialPotential + quality.prestigePotential) / 40 * 100) / 100,
            commercialScore: quality.commercialPotential,
            prestigeScore: quality.prestigePotential,
            localizationSupportMultiplier: 1,
            outcome,
            seed: `${input.studio.ai.seed}:b6-streaming:${input.production.id}`,
        },
    }] : [];
    const talent = execution.talent;
    const project: IndustryProject = {
        id: input.production.canonicalProjectId, title: input.production.title, genre: input.production.genre, mediaType: input.production.projectType,
        studioId: input.production.producerStudioId, physicalProducerStudioId: input.production.producerStudioId,
        budgetTier: budgetTier(input.production.budgetMillions), quality: Math.round(quality.creativeQuality), rating,
        boxOffice: Math.round(theatricalGrossMillions * 1_000_000), year, weekReleased: week,
        leadActorId: talent.leadActorId, leadActorName: talent.leadActorName, directorId: talent.directorId, directorName: talent.directorName,
        reviews: outcome === 'HIT' ? 'A major audience and critical success' : outcome === 'FLOP' ? 'A disappointing commercial response' : 'A solid industry performance',
        awardProfile: {
            leadPerformance: clamp(Math.round(quality.creativeQuality * 0.72 + talent.packageScore * 0.22)), directing: clamp(Math.round(quality.executionQuality * 0.72 + talent.packageScore * 0.22)),
            screenplay: clamp(Math.round(quality.creativeQuality * 0.75 + input.production.writerSkill * 0.2)), cinematography: clamp(Math.round(quality.executionQuality * 0.9)),
            picture: clamp(Math.round((quality.creativeQuality + quality.executionQuality + quality.prestigePotential) / 3)), originalScore: clamp(Math.round(quality.creativeQuality * 0.75)),
            originalSong: input.production.genre === 'MUSICAL' ? clamp(Math.round(quality.creativeQuality * 0.9)) : clamp(Math.round(quality.creativeQuality * 0.48)), campaign: clamp(Math.round(input.studio.ai.competence.marketing * 0.7 + marketingRate * 100)),
        },
        ...(input.production.universeId ? { universeId: input.production.universeId } : {}), releaseStrategy: execution.publicReleaseStrategy,
        streamingWindows, studioAiSlateCommitmentId: execution.slateCommitmentId, industryContentFingerprintId: execution.fingerprintId,
    };
    const releaseCash = money(input.studio.cashReserve - marketingSpendMillions + studioReceiptsMillions);
    const settledStudio: NPCStudioState = { ...input.studio, cashReserve: releaseCash, ai: { ...input.studio.ai, ledger: [...input.studio.ai.ledger,
        { id: createDeterministicId('studio_ai_release_ledger', input.production.id, 'marketing'), absoluteWeek: input.absoluteWeek, category: 'RELEASE_MARKETING' as const, amountMillions: -marketingSpendMillions, balanceAfterMillions: money(input.studio.cashReserve - marketingSpendMillions), description: `${project.title}: release campaign` },
        { id: createDeterministicId('studio_ai_release_ledger', input.production.id, 'income'), absoluteWeek: input.absoluteWeek, category: 'RIGHTS_INCOME' as const, amountMillions: studioReceiptsMillions, balanceAfterMillions: releaseCash, description: `${project.title}: studio receipts` },
    ].slice(-STUDIO_AI_LEDGER_LIMIT) } };
    const result = { releasedAtAbsoluteWeek: input.absoluteWeek, theatricalGrossMillions, streamingValueMillions, studioReceiptsMillions, productionSpendMillions: input.production.budgetMillions, marketingSpendMillions, netResultMillions, rating, outcome };
    const production: IndustryProductionCommitment = { ...input.production, status: 'RELEASED', updatedAtAbsoluteWeek: input.absoluteWeek, studioAiExecution: { ...execution, result, lastProgressedAbsoluteWeek: input.absoluteWeek, processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-release:${input.production.id}`) } };
    let world: WorldState = { ...input.world, projects: [...input.world.projects, project], studios: { ...(input.world.studios || {}), [settledStudio.id]: settledStudio }, talentBookings: releaseProjectTalentBookings(input.world.talentBookings, project.id, input.absoluteWeek), industryProductions: upsertCanonicalIndustryProduction(input.world.industryProductions, production) };
    world = applyStudioProjectOutcome(world, project, { productionSpendMillions: input.production.budgetMillions, marketingSpendMillions, studioReceiptsMillions, netResultMillions, cashAlreadySettled: true, outcome }).world;
    world = {
        ...world,
        studios: Object.fromEntries(Object.entries(world.studios || {}).map(([studioId, candidate]) => {
            const intelligence = candidate.ai?.intelligence;
            if (!intelligence?.content.selectedFingerprints.some(item => item.id === execution.fingerprintId)) return [studioId, candidate];
            return [studioId, {
                ...candidate,
                ai: { ...candidate.ai!, intelligence: { ...intelligence, content: { ...intelligence.content, selectedFingerprints: intelligence.content.selectedFingerprints.map(item => item.id === execution.fingerprintId ? { ...item, lifecycle: 'MATERIALIZED' as const, canonicalProjectId: project.id } : item) } } },
            }];
        })),
    };
    return { world, studio: world.studios![settledStudio.id], production, project, changed: true };
};
