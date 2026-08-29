import {
    INITIAL_PLAYER,
    type NewsItem,
    type PlatformAiContentPlan,
    type PlatformId,
    type PlatformState,
    type Player,
    type WorldState,
} from '../../types';
import { buildPlatformContentCandidates, commitPlatformContentCandidate } from './platformAiContentSourcing';
import { choosePlatformContentCandidate } from './platformAiPlanning';
import { commissionPlatformAiOriginal } from './platformAiCommissioning';
import { progressPlatformAiProduction } from './platformAiProduction';
import { commitPlatformResearch, progressPlatformResearch } from './platformAiResearch';
import { choosePlatformResearchPortfolio } from './platformAiResearchPortfolio';
import { choosePlatformMarketExpansion, commitPlatformMarketExpansion, progressPlatformMarketExpansion } from './platformAiMarkets';
import { settlePlatformAiEconomy } from './platformAiEconomy';
import { progressPlatformAiRightsLifecycle } from './platformAiRightsLifecycle';
import { planPlatformAiLocalization, progressPlatformAiLocalization } from './platformAiLocalization';
import {
    getReadyPlatformAiLocalizationJobs,
    releasePlatformContentPlan,
    schedulePlatformStreamingWindow,
} from './platformAiRelease';
import { getPlatformAiPresentationEvents, updatePlatformAiMemory } from './platformAiMemory';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import {
    markPlatformAiStateCanonicalForTurn,
    normalizePlatformAiState,
    resolvePlatformController,
} from './platformAiState';
import { getStreamingCountryMarketProfile } from '../streamingDayOneMarkets';
import { doesStreamingLicenseCoverCountry, isStreamingLicenseActiveAt } from '../streamingRightsCore';
import { progressPlatformAiDistressWorld } from './platformAiDistress';
import { hasEligiblePlayerProductionStudio, hasOpenPlayerCommissionForPlan } from './platformAiPlayerCommissions';
import { getPlatformAiLocalizationRequirements } from './platformAiLocalizationCore';
import { choosePlatformAiPremiere } from './platformAiReleaseReadiness';

const PLATFORM_TURN_ORDER: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const MAX_PREMIERE_SEARCH_WEEKS = 52;
const PRE_WEEK_CHECKPOINT = -1;

export const getPlatformAiTurnIdempotencyKey = (
    platformId: PlatformId,
    absoluteWeek: number,
): string => `platform-ai-turn:${platformId}:${absoluteWeek}`;

export interface PlatformAiWorldTurnResult {
    world: WorldState;
    news: NewsItem[];
    logs: string[];
}

const updatePlatform = (
    world: WorldState,
    platformId: PlatformId,
    platform: PlatformState,
): WorldState => ({
    ...world,
    platforms: { ...world.platforms!, [platformId]: platform },
});

const markCurrentPlatformCanonical = (
    world: WorldState,
    platformId: PlatformId,
    playerId: string,
    absoluteWeek: number,
): void => {
    const platform = world.platforms?.[platformId];
    if (platform) markPlatformAiStateCanonicalForTurn(platform, playerId, absoluteWeek);
};

const countrySupportsLocalization = (
    platform: PlatformState,
    plan: PlatformAiContentPlan,
    countryId: string,
): boolean => {
    void platform;
    void plan;
    return Boolean(getStreamingCountryMarketProfile(countryId));
};

const preparePlanForScheduling = (
    world: WorldState,
    platformId: PlatformId,
    planId: string,
    absoluteWeek: number,
    premiereAtAbsoluteWeek: number,
): { world: WorldState; localizationReadyAtAbsoluteWeek: number } | null => {
    const platform = world.platforms?.[platformId];
    const plan = platform?.ai?.slate.find(item => item.id === planId);
    if (!platform?.ai || !plan || !['RIGHTS_READY', 'DELIVERED'].includes(plan.status)) return null;
    const activeCountryIds = new Set(platform.ai.marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!));
    const plannedCountries = [...plan.releaseCountryIds].sort();
    if (!plannedCountries.length) return null;
    if (plannedCountries.some(countryId => !activeCountryIds.has(countryId))) return null;

    const contracts = plan.source === 'COMMISSIONED_ORIGINAL'
        ? []
        : plan.sourceProjectIds.map(projectId => platform.ai!.rightsContracts.find(contract => (
            plan.rightsContractIds.includes(contract.id)
            && contract.sourceProjectId === projectId
            && contract.buyerPlatformId === platformId
            && contract.platformContentPlanId === plan.id
            && contract.status === 'ACTIVE'
            && isStreamingLicenseActiveAt(contract, premiereAtAbsoluteWeek)
        )) || null);
    if (contracts.some(contract => !contract)) return null;
    if (contracts.some(contract => (
        contract!.status !== 'ACTIVE'
        || !isStreamingLicenseActiveAt(contract!, premiereAtAbsoluteWeek)
    ))) return null;

    const allCountriesEligible = plannedCountries.every(countryId => (
        countrySupportsLocalization(platform, plan, countryId)
        && contracts.every(contract => doesStreamingLicenseCoverCountry(contract!, countryId))
    ));
    if (!allCountriesEligible) return null;
    const production = plan.industryProductionId
        ? world.industryProductions?.[plan.industryProductionId]
        : null;
    const projectIds = plan.source === 'COMMISSIONED_ORIGINAL'
        ? production && production.status === 'DELIVERED' ? [production.canonicalProjectId] : []
        : plan.sourceProjectIds;
    if (!projectIds.length) return null;
    const localizationJobs = getReadyPlatformAiLocalizationJobs(platform, plan, projectIds, absoluteWeek, world);
    if (localizationJobs.some(job => !job)) return null;
    const localizationReadyAtAbsoluteWeek = Math.max(
        absoluteWeek,
        ...localizationJobs.map(job => job!.readyAtAbsoluteWeek!),
    );
    if (localizationReadyAtAbsoluteWeek > premiereAtAbsoluteWeek) return null;

    const preparedPlan: PlatformAiContentPlan = {
        ...plan,
        localizationReadyAtAbsoluteWeek,
    };
    return {
        world: updatePlatform(world, platformId, {
            ...platform,
            ai: {
                ...platform.ai,
                slate: platform.ai.slate.map(item => item.id === planId ? preparedPlan : item),
            },
        }),
        localizationReadyAtAbsoluteWeek,
    };
};

const ensureLocalizationJobs = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let nextWorld = world;
    const plans = (nextWorld.platforms?.[platformId].ai?.slate || [])
        .filter(plan => plan.status === 'RIGHTS_READY' || plan.status === 'DELIVERED')
        .sort((left, right) => left.id.localeCompare(right.id));
    for (const planSnapshot of plans) {
        const currentPlatform = nextWorld.platforms?.[platformId];
        const plan = currentPlatform?.ai?.slate.find(item => item.id === planSnapshot.id);
        if (!currentPlatform?.ai || !plan) continue;
        const production = plan.industryProductionId
            ? nextWorld.industryProductions?.[plan.industryProductionId]
            : null;
        const projectIds = plan.source === 'COMMISSIONED_ORIGINAL'
            ? production && production.status === 'DELIVERED' ? [production.canonicalProjectId] : []
            : plan.sourceProjectIds;
        for (const projectId of [...projectIds].sort()) {
            const project = nextWorld.projects.find(item => item.id === projectId);
            const requirements = getPlatformAiLocalizationRequirements(currentPlatform, plan, project);
            for (const requirement of requirements.filter(item => item.mandatory && item.supported)) {
                markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
                const planned = planPlatformAiLocalization({
                    player: { ...player, world: nextWorld },
                    world: nextWorld,
                    platform: nextWorld.platforms![platformId],
                    absoluteWeek,
                    contentPlanId: plan.id,
                    projectId,
                    countryIds: requirement.countryIds,
                    languageId: requirement.languageId,
                    mode: requirement.mode,
                });
                if (planned.changed) nextWorld = updatePlatform(nextWorld, platformId, planned.platform);
            }
        }
    }
    return nextWorld;
};

const scheduleReadyPlans = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let nextWorld = world;
    const readyPlanIds = (nextWorld.platforms?.[platformId].ai?.slate || [])
        .filter(plan => plan.status === 'RIGHTS_READY' || plan.status === 'DELIVERED')
        .map(plan => plan.id)
        .sort();
    for (const planId of readyPlanIds) {
        const sourcePlan = nextWorld.platforms?.[platformId].ai?.slate.find(plan => plan.id === planId);
        const sourceAi = nextWorld.platforms?.[platformId].ai;
        if (!sourcePlan || !sourceAi) continue;
        const legalCandidates: Array<{
            result: ReturnType<typeof schedulePlatformStreamingWindow>;
            premiereAtAbsoluteWeek: number;
            latestRequiredAbsoluteWeek: number;
            rightsExpireAtAbsoluteWeek: number;
            scheduledTitleCount: number;
            sameGenreCount: number;
            sameAudienceCount: number;
        }> = [];
        for (let offset = 1; offset <= MAX_PREMIERE_SEARCH_WEEKS; offset += 1) {
            const premiereAtAbsoluteWeek = absoluteWeek + offset;
            const prepared = preparePlanForScheduling(
                nextWorld,
                platformId,
                planId,
                absoluteWeek,
                premiereAtAbsoluteWeek,
            );
            if (!prepared) continue;
            markCurrentPlatformCanonical(prepared.world, platformId, player.id, absoluteWeek);
            const scheduled = schedulePlatformStreamingWindow({
                // The prepared plan is assembled from canonical turn state.
                player,
                world: prepared.world,
                platformId,
                planId,
                absoluteWeek,
                premiereAtAbsoluteWeek,
                localizationReadyAtAbsoluteWeek: prepared.localizationReadyAtAbsoluteWeek,
            });
            if (scheduled.changed) {
                const scheduledPlan = scheduled.plan!;
                const readiness = scheduledPlan.releaseReadiness!;
                const contractExpiries = scheduledPlan.releaseEntries.flatMap(entry => {
                    if (!entry.rightsContractId) return [];
                    const contract = sourceAi.rightsContracts.find(item => item.id === entry.rightsContractId);
                    return contract ? [contract.expiresAtAbsoluteWeek] : [];
                });
                const competingPlans = sourceAi.slate.filter(plan => (
                    plan.id !== sourcePlan.id
                    && plan.releaseEntries.some(entry => entry.premiereAtAbsoluteWeek === premiereAtAbsoluteWeek)
                ));
                legalCandidates.push({
                    result: scheduled,
                    premiereAtAbsoluteWeek,
                    latestRequiredAbsoluteWeek: readiness.latestRequiredAbsoluteWeek,
                    rightsExpireAtAbsoluteWeek: contractExpiries.length
                        ? Math.min(...contractExpiries)
                        : Number.MAX_SAFE_INTEGER,
                    scheduledTitleCount: competingPlans.reduce((sum, plan) => sum + plan.releaseEntries.length, 0),
                    sameGenreCount: competingPlans.filter(plan => plan.genre === sourcePlan.genre).length,
                    sameAudienceCount: competingPlans.filter(plan => plan.targetAudience === sourcePlan.targetAudience).length,
                });
                continue;
            }
        }
        const choice = choosePlatformAiPremiere({
            playerId: player.id,
            platformId,
            planId: sourcePlan.id,
            absoluteWeek,
            strategyCycle: sourceAi.strategyCycle,
            strategySkill: sourceAi.competence.strategy,
            genre: sourcePlan.genre,
            targetAudience: sourcePlan.targetAudience,
            commercialForecast: sourcePlan.forecast.commercial,
            prestigeForecast: sourcePlan.forecast.prestige,
            marketingReserveMillions: sourcePlan.marketingReserveMillions,
            candidates: legalCandidates.map(({ result: _result, ...candidate }) => candidate),
        });
        if (!choice) continue;
        const chosen = legalCandidates.find(candidate => (
            candidate.premiereAtAbsoluteWeek === choice.premiereAtAbsoluteWeek
        ));
        if (chosen) {
            const chosenPlatform = chosen.result.world.platforms![platformId];
            nextWorld = updatePlatform(chosen.result.world, platformId, {
                ...chosenPlatform,
                ai: {
                    ...chosenPlatform.ai!,
                    slate: chosenPlatform.ai!.slate.map(plan => plan.id === planId && plan.releaseReadiness
                        ? {
                            ...plan,
                            releaseReadiness: {
                                ...plan.releaseReadiness,
                                selectionScore: choice.score,
                                selectionReasons: [...choice.reasons],
                            },
                        }
                        : plan),
                },
            });
        }
    }
    return nextWorld;
};

const releaseDuePlans = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let nextWorld = world;
    const duePlanIds = (nextWorld.platforms?.[platformId].ai?.slate || [])
        .filter(plan => plan.status === 'SCHEDULED' && (plan.premiereAtAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) <= absoluteWeek)
        .map(plan => plan.id)
        .sort();
    for (const planId of duePlanIds) {
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = releasePlatformContentPlan({
            player,
            world: nextWorld,
            platformId,
            planId,
            absoluteWeek,
        }).world;
    }
    return nextWorld;
};

const progressProductions = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let nextWorld = world;
    const planIds = (nextWorld.platforms?.[platformId].ai?.slate || [])
        .filter(plan => {
            if (plan.source !== 'COMMISSIONED_ORIGINAL' || !plan.industryProductionId) return false;
            const production = nextWorld.industryProductions?.[plan.industryProductionId];
            return Boolean(production && !['DELIVERED', 'CANCELLED'].includes(production.status));
        })
        .map(plan => plan.id)
        .sort();
    for (const planId of planIds) {
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = progressPlatformAiProduction({
            player,
            world: nextWorld,
            platformId,
            planId,
            absoluteWeek,
        }).world;
    }
    return nextWorld;
};

const retryPendingOriginalCommissions = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let nextWorld = world;
    const planIds = (nextWorld.platforms?.[platformId].ai?.slate || [])
        .filter(plan => plan.source === 'COMMISSIONED_ORIGINAL'
            && plan.status === 'BRIEF'
            && !hasOpenPlayerCommissionForPlan(nextWorld, plan.id, absoluteWeek))
        .map(plan => plan.id)
        .sort();
    for (const planId of planIds) {
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = commissionPlatformAiOriginal({
            player: { ...player, world: nextWorld },
            world: nextWorld,
            platformId,
            planId,
            absoluteWeek,
        }).world;
    }
    return nextWorld;
};

const runPlanningCycle = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    absoluteWeek: number,
): WorldState => {
    let nextWorld = world;
    markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
    const researchPortfolio = choosePlatformResearchPortfolio({
        player,
        world: nextWorld,
        platformId,
        absoluteWeek,
    });
    for (const researchChoice of researchPortfolio.choices) {
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        const committedResearch = commitPlatformResearch({
            player,
            world: nextWorld,
            platformId,
            absoluteWeek,
            choice: researchChoice,
        });
        if (!committedResearch.changed) break;
        nextWorld = committedResearch.world;
    }
    markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
    const marketChoice = choosePlatformMarketExpansion({ player, world: nextWorld, platformId, absoluteWeek });
    if (marketChoice) {
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = commitPlatformMarketExpansion({
            player,
            world: nextWorld,
            platformId,
            absoluteWeek,
            countryId: marketChoice.countryId,
        }).world;
    }
    const platform = nextWorld.platforms?.[platformId];
    if (!platform?.ai) return nextWorld;
    markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
    const candidates = buildPlatformContentCandidates({ player, world: nextWorld, platformId, absoluteWeek });
    const candidate = choosePlatformContentCandidate({
        player,
        platformId,
        absoluteWeek,
        strategyCycle: platform.ai.strategyCycle,
        strategySkill: platform.ai.competence.strategy,
        candidates,
        platform,
    });
    if (!candidate) return nextWorld;
    markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
    const committed = commitPlatformContentCandidate({
        player,
        world: nextWorld,
        platformId,
        absoluteWeek,
        candidate,
    });
    nextWorld = committed.world;
    if (committed.changed
        && committed.plan?.source === 'COMMISSIONED_ORIGINAL'
        && !hasEligiblePlayerProductionStudio(player, platformId)) {
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = commissionPlatformAiOriginal({
            player,
            world: nextWorld,
            platformId,
            planId: committed.plan.id,
            absoluteWeek,
        }).world;
    }
    return nextWorld;
};

const presentationNews = (
    platformId: PlatformId,
    platform: PlatformState,
    knownEventIds: Set<string>,
    absoluteWeek: number,
): { news: NewsItem[]; logs: string[] } => {
    const events = getPlatformAiPresentationEvents(platform)
        .filter(event => !knownEventIds.has(event.id));
    const turnIdempotencyKey = getPlatformAiTurnIdempotencyKey(platformId, absoluteWeek);
    const year = Math.floor(Math.max(0, absoluteWeek) / 52) + 1;
    const week = (Math.max(0, absoluteWeek) % 52) + 1;
    return {
        news: events.map(event => ({
            id: `${turnIdempotencyKey}:${event.id}`,
            headline: event.summary,
            subtext: `${event.reason} ${event.playerConsequence}`,
            category: 'INDUSTRY',
            week,
            year,
            impactLevel: event.type === 'RELEASE_FLOP' || event.type === 'RELEASE_HIT' || event.type === 'PARENT_RESCUE'
                ? 'HIGH'
                : 'MEDIUM',
        })),
        logs: events.map(event => `${platform.name}: ${event.summary}`),
    };
};

export const processPlatformAiWorldTurn = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): PlatformAiWorldTurnResult => {
    const fallbackPlatforms = INITIAL_PLAYER.world.platforms;
    let nextWorld: WorldState = world.platforms || !fallbackPlatforms
        ? world
        : { ...world, platforms: structuredClone(fallbackPlatforms) };
    const news: NewsItem[] = [];
    const logs: string[] = [];

    for (const platformId of PLATFORM_TURN_ORDER) {
        // Ownership is intentionally resolved before normalization so an acquired
        // company's complete persisted state stays byte-for-byte player-controlled.
        if (resolvePlatformController(player, platformId) === 'PLAYER') continue;
        const sourcePlatform = nextWorld.platforms?.[platformId];
        if (!sourcePlatform) continue;
        const normalizedAtCurrentWeek = normalizePlatformAiState(sourcePlatform, player.id, absoluteWeek);
        const normalized: PlatformState = sourcePlatform.ai
            ? normalizedAtCurrentWeek
            : {
                ...normalizedAtCurrentWeek,
                ai: {
                    ...normalizedAtCurrentWeek.ai!,
                    // -1 is an idempotency sentinel only. All canonical market,
                    // finance and planning dates remain on the real game clock.
                    lastProcessedAbsoluteWeek: PRE_WEEK_CHECKPOINT,
                    nextPlanningAbsoluteWeek: absoluteWeek,
                },
            };
        if (normalized.ai!.lastProcessedAbsoluteWeek >= absoluteWeek) continue;
        const knownEventIds = new Set(getPlatformAiPresentationEvents(normalized).map(event => event.id));
        nextWorld = updatePlatform(nextWorld, platformId, normalized);

        // Rights expiry, schedule repair, renewal queuing and paid-renewal activation
        // precede both economy settlement and any scheduling attempt.
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = progressPlatformAiRightsLifecycle({
            player: { ...player, world: nextWorld },
            world: nextWorld,
            platformId,
            absoluteWeek,
        }).world;

        // A failed producer/talent/funding match remains a persisted BRIEF and
        // receives one bounded retry per canonical week before its deposit is refunded.
        nextWorld = retryPendingOriginalCommissions(player, nextWorld, platformId, absoluteWeek);

        // Localization is a persisted, funded lifecycle. Jobs are planned before
        // economy settlement so a funded job may start this week, then progress
        // only when its disclosed lead time has actually elapsed.
        nextWorld = ensureLocalizationJobs(player, nextWorld, platformId, absoluteWeek);

        const economyPlayer = { ...player, world: nextWorld };
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        const economy = settlePlatformAiEconomy({
            player: economyPlayer,
            platform: nextWorld.platforms![platformId],
            absoluteWeek,
        });
        nextWorld = updatePlatform(nextWorld, platformId, economy.platform);
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = updatePlatform(nextWorld, platformId, progressPlatformAiLocalization({
            player: { ...player, world: nextWorld },
            platform: nextWorld.platforms![platformId],
            absoluteWeek,
        }).platform);
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = progressPlatformMarketExpansion({ player, world: nextWorld, platformId, absoluteWeek }).world;
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = progressPlatformResearch({ player, world: nextWorld, platformId, absoluteWeek }).world;
        nextWorld = progressProductions(player, nextWorld, platformId, absoluteWeek);
        nextWorld = scheduleReadyPlans(player, nextWorld, platformId, absoluteWeek);
        nextWorld = releaseDuePlans(player, nextWorld, platformId, absoluteWeek);
        markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        nextWorld = updatePlatformAiMemory({ player, world: nextWorld, platformId, absoluteWeek }).world;

        const beforePlanning = nextWorld.platforms![platformId];
        const planningDue = beforePlanning.ai!.status === 'ACTIVE'
            && absoluteWeek >= beforePlanning.ai!.nextPlanningAbsoluteWeek;
        if (planningDue) {
            nextWorld = runPlanningCycle(player, nextWorld, platformId, absoluteWeek);
        }

        const completedPlatform = nextWorld.platforms![platformId];
        const checkpointed: PlatformState = {
            ...completedPlatform,
            ai: {
                ...completedPlatform.ai!,
                lastProcessedAbsoluteWeek: absoluteWeek,
                nextPlanningAbsoluteWeek: planningDue
                    ? absoluteWeek + PLATFORM_AI_PROFILES[platformId].planningCadenceWeeks
                    : completedPlatform.ai!.nextPlanningAbsoluteWeek,
                strategyCycle: planningDue
                    ? completedPlatform.ai!.strategyCycle + 1
                    : completedPlatform.ai!.strategyCycle,
            },
        };
        nextWorld = updatePlatform(nextWorld, platformId, checkpointed);
        const presentation = presentationNews(platformId, checkpointed, knownEventIds, absoluteWeek);
        news.push(...presentation.news);
        logs.push(...presentation.logs);
    }

    for (const platformId of PLATFORM_TURN_ORDER) {
        if (resolvePlatformController(player, platformId) !== 'PLAYER') {
            markCurrentPlatformCanonical(nextWorld, platformId, player.id, absoluteWeek);
        }
    }
    nextWorld = progressPlatformAiDistressWorld({
        player: { ...player, world: nextWorld },
        world: nextWorld,
        absoluteWeek,
    }).world;

    return { world: nextWorld, news, logs };
};

export const PLATFORM_AI_TURN_ORDER = PLATFORM_TURN_ORDER;
export const PLATFORM_AI_TURN_IDEMPOTENCY_PREFIX = 'platform-ai-turn';
