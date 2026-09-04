
import { Player, Commitment, ActiveRelease, StreamingState, LogEntry, NegotiationData, ActorSkills, Application, AuditionOpportunity, ProjectDetails, ScheduledEvent, TransactionCategory, Transaction, YearlyFinance, Message, IndustryProject, TeamMember, Business, InstaPost, XPost, WriterStats, DirectorStats, PlatformId, LegalCase, LifeEvent, RoleType, FamilyObligation, FuturePotential, PlayerReturnStatus, SponsorshipCategory, SponsorshipOffer, NewsItem, PastProject, StreamingDistributionBreakdown, TheatricalDistributionBreakdown, Relationship, MusicCultureMomentRecord, GameLanguage } from '../types';
import { PROPERTY_CATALOG, BUSINESS_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from './lifestyleLogic';
import { calculateRealEstateValueUpdate, quoteRealEstateWeeklyRent } from './realEstateLogic';
import { 
    calculateGlobalTalent, 
    getActorTalent,
    getWriterTalent,
    getDirectorTalent,
    getPhaseDuration, 
    checkAuditionPass, 
    calculateIMDbRating, 
    getEstimatedBudget, 
    calculateWeeklyBoxOffice, 
    calculateRunOutcome, 
    getConsequences, 
    calculateFuturePotential, 
    generateSequelOffer,
    generateRenewalOffer,
    generateAuditions,
    generatePartTimeJobs,
    generateCastList,
    generateReviews,
    calculateCastDepthScore,
    calculateProjectExperienceGain,
    calculateAuditionGain,
    calculateProductionGain,
    calculatePassiveGain,
    calculateDynamicBoxOfficeTotalCap,
    rewardGenreExperience,
    getRoleRejectionFeedback,
    formatRoleRejectionReview,
    evaluateCastingApplication,
    generateBreakthroughAuditionInvite
} from './roleLogic';
import { 
    determineStreamingAcquisition, 
    PLATFORMS, 
    calculateStreamingViewership, 
    checkStreamingExit 
} from './streamingLogic';
import { 
    generateWeeklyNews, 
    generateSequelHypeNews, 
    generateSequelConfirmedNews, 
    generateSequelCancelledNews, 
    generateFanBacklashNews, 
    generateForbesNews, 
    generateForbesIndustryNews,
    generateRenewalNews,
    generateCancellationNews,
    generateUniverseSocialReactions
} from './newsLogic';
import { generateWeeklyEvent } from './geminiService';
import { generateLifeEvent, generateLuxeLifeEvent, hasEligibleLuxeEventTarget } from './lifeEventLogic';
import { generateWeeklyFeed, NPC_DATABASE, calculateProjectFameMultiplier, generateNewUnknowns, updateNPCLives, createNPCFromMusicArtist } from './npcLogic';
import { generateAgentOffers, generateManagerOffer, generateDirectOffer, getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists, getRandomWellness, sanitizeTeamPools } from './teamLogic';
import { processStockMarket, calculatePortfolioValue, getDividendPayout, initializeStocks } from './stockLogic';
import { AWARD_CALENDAR, checkAwardEligibility, AwardDefinition, createCanonicalAwardNominationId, resolveCanonicalAwardSeason, generateFullBallot, getAwardCeremonyYear, sanitizeAwardCeremonyEvent, sanitizeAwardHistoryEntries, sanitizeAwardRecords } from './awardLogic';
import { createDeterministicId } from './deterministicRandom';
import { isPlayerCastInProject, isPlayerDirectingProject } from './ownedProductionCareer';
import { processDynastyCareerWeek } from './dynastyCareer';
import { PLATFORM_AI_PROFILES } from './platformAi/platformAiProfiles';
import {
    generatePlatformAiPlayerCommissionOffers,
    syncPlatformAiPlayerCommissionProductions,
} from './platformAi';
import { processIndustryWorldWeek } from './industryWorld';
import { calculateStreamingAdvertisingRevenueFullCurrency, calculateStreamingSubscriptionRevenueFullCurrency } from './streamingEconomyCore';
import { attributeStreamingTitleRevenue, settleStreamingContractRoyaltyForPlayer } from './streamingContractSettlement';
import { processStreamingRightsCalendarWeek } from './streamingRightsCalendar';
import { processStreamingCataloguePackagesWeek } from './streamingCataloguePackages';
import { processStreamingCataloguePackageStrategyAutomation } from './streamingCataloguePackageAutomation';
import { processStreamingRightsOfficeWeek } from './streamingRightsOffice';
import { processWorldTurn } from './worldLogic';
import { generateFamousMovieOpportunity, generateCameoOffer } from './famousMovieLogic'; 
import { calculateYoutubeCreatorScore, generateMusicVideoFeatureOffer, generateYoutubeBrandDeal, generateYoutubeCollabOffer, getYoutubePublicImageLabel, processYoutubeChannel } from './youtubeLogic';
import { getInstagramPostComments, pickInstagramMicroBrand } from './instagramLogic';
import { checkForDirectorDecision, checkForProductionCrisis } from './productionService';
import { applyProductionHouseReleaseOutcome, processBusinessWeek, recalculateBusinessValuation, resolveProjectType } from './businessLogic';
import { getAbsoluteWeek, getRelationshipAge, getStreamingWeeksUntilStart, inferStreamingStartWeekAbsolute } from './legacyLogic';
import { hasNoAds, resetWeeklyEnergy, spendPlayerEnergy } from './premiumLogic';
import { advanceLuxeConnections, advanceTinderConnections } from './datingLogic';
import { generateNpcVentureRoleOffer, getNpcVentureOfferText } from './npcVentureLogic';
import { getUniverseReleaseActivity, normalizeUniverseMap } from './universeLogic';
import { processFamilyDramaWeek } from './familyLogic';
import { getProjectMarketDemand } from './marketTrends';
import {
    evaluateTheatricalExtension,
    getTheatricalExtensionReasonLabel,
    getTheatricalWeekRange
} from './theatricalRunLogic';
import { getStudioGenreReputation, improveStudioGenreReputation } from './studioSpecialization';
import { getPlayerLanguage, t } from './i18n';
import {
    generateReleaseInstagramReactions,
    generateReleaseSocialReactions,
    generateRoleAwareCriticReview,
} from './releaseMediaNarrative';
import { addBreadcrumb, setCrashContext, trackGameEvent } from './firebaseService';
import { applyOpportunityIdentityToProject, enrichAuditionOpportunity, getCharacterIdentityLabels, inferStoryCompass, suggestCharacterIdentity } from './characterIdentityLogic';
import { formatCharacterStoryFitLabel } from './characterStoryFit';
import { getRoleOfferMessageLine } from './roleMarketDemand';
import { resolveRareHollywoodChaos } from './rareHollywoodChaos';
import { getReturnStatusForContinuation } from './continuationReturnLogic';
import { createContinuationScript } from './sequelFlow';
import { processStreamingFundingContracts } from './streamingFundingLogic';
import { getProjectFundingEconomics, getProjectMarketOutcomeRevenue } from './projectFundingEconomics';
import { resolveInstagramReferralOutcome } from './instagramOfferLogic';
import { resolveYoutubeEventChoice, YoutubeEventResolution } from './youtubeEventLogic';
import { resolveStudioAcquisitionResponses } from './studioAcquisition';
import { buildAudienceReception } from './audienceReception';
import { prepareSubsidiaryProjectsForGameLoop, processSubsidiaryAutonomousOperations } from './subsidiaryOperations';
import { calculateStreamingDistributionBreakdown, calculateTheatricalDistributionBreakdown } from './distributionRevenue';
import { processSubsidiaryDecisionEngine } from './subsidiaryDecisions';
import { processShareholderVoting } from './shareholderVoting';
import { processStockTakeoverEvents } from './stockTakeover';
import { processPrivateEquityWeek } from './privateEquityLogic';
import { processWorldReactions } from './worldReactions';
import { processAcquisitionDebtService } from './acquisitionDebt';
import { processRegulatorPressure } from './regulatorPressure';
import { processTalentInstability } from './talentInstability';
import { processRivalRetaliation } from './rivalRetaliation';
import { processAcquisitionMarketPulse } from './acquisitionMarketPulse';
import { processStudioSaleRoyalties } from './studioSale';
import { getStudioGroup } from './studioGroup';
import {
    advanceProductionCalendarWeek,
    ensureProductionCalendarForCommitment,
    getProductionCalendarPhaseDuration,
    normalizeProductionCalendar,
} from './productionCalendar';
import { evaluatePostReleaseReality } from './marketingReality';
import { applyHealthConditionIncident, getHealthConditionLabel, processHealthConditionsWeek } from './healthConditions';
import { addMusicCultureMoment, applyMusicImpactToHiddenStats, calculateProjectMusicImpact, calculateWeeklySoundtrackRevenue, createMusicCultureMoment, getMusicArtistCatalog, mergeSoundtrackRevenueBreakdowns, processMusicIndustryWeek, withAutomaticMusicPlan } from './musicIndustry';
import { getActorCareerArc, getActorCareerArcTransitionFromPrevious } from './actorCareerArc';
import { applyInvestorPayoutMemory, calculateInvestorPayout, processInvestorLeadershipChanges } from './projectInvestors';
import { buildOutsideProducerInvestmentMessage, generateOutsideProducerInvestmentOffers, getOutsideProducerOfferCadenceWeeks, processOutsideProductionsWeek } from './outsideProductions';
import { buildEpisodeRatingsStory, generateEpisodeRatings, getEpisodeRatingsGameplayImpact } from './episodeRatings';
import { calculateProductionRiskProfile } from './productionRisk';
import { calculateStudioSlateFatigue } from './studioSlateFatigue';
import { getContinuationPerformanceGross, shouldResolveContinuationDecision } from './releaseContinuationLogic';
import { processLivingEnsembleWeek } from './livingEnsemble';
import { processOwnedStreamingPlatformWeek } from './streamingWeeklyLoop';
import { advanceStreamingMarketClearances } from './streamingMarkets';
import { advanceStreamingTitleLocalization } from './streamingOpeningCatalogue';
import {
    migrateStreamingRightsContractRegistry,
    registerProductionStreamingRightsContract,
} from './streamingRightsCore';

// --- CONSTANTS ---
const ANNUAL_TAX_FREE_ALLOWANCE = 25000;
const ANNUAL_INCOME_TAX_RATE = 0.15;

const ESTRANGEMENT_TEMPLATES = [
    "Sources claim {Name} hasn't spoken to their {Rel} in months.",
    "{Rel} of {Name} sells story to tabloids: 'Fame changed them.'",
    "Family Feud: {Name} snubbed by {Rel} at recent event?",
    "Rumors swirl: Is {Name} cutting off their {Rel}?",
    "Inside the toxic dynamic between {Name} and their {Rel}.",
    "Exclusive: {Name}'s {Rel} claims they've been 'abandoned'.",
    "Paparazzi capture tense argument between {Name} and {Rel}.",
    "{Name} reportedly refuses to pay for {Rel}'s debts."
];

// Helper to calculate weeks between two points in time handling year wrap
const getWeeksSince = (postWeek: number, postYear: number, currentWeek: number, currentYear: number): number => {
    return ((currentYear - postYear) * 52) + (currentWeek - postWeek);
};

const formatMoneyShort = (value: number) => {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    if (safeValue >= 1_000_000_000) return `$${(safeValue / 1_000_000_000).toFixed(1)}B`;
    if (safeValue >= 1_000_000) return `$${(safeValue / 1_000_000).toFixed(1)}M`;
    if (safeValue >= 1_000) return `$${(safeValue / 1_000).toFixed(0)}k`;
    return `$${safeValue.toLocaleString()}`;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const rollContinuationGreenlight = (chance: number, maxChance = 96) => {
    const safeChance = clampPercent(chance);
    return Math.random() * 100 < Math.min(safeChance, maxChance);
};

const appendInvestorPayout = (
    summary: ActiveRelease['investorPayouts'] | undefined,
    payout: number
): ActiveRelease['investorPayouts'] => {
    const safePayout = Math.max(0, Math.round(Number(payout) || 0));
    return {
        lifetimeInvestorPayout: Math.max(0, Math.round(Number(summary?.lifetimeInvestorPayout) || 0)) + safePayout,
        weeklyInvestorPayouts: [...(Array.isArray(summary?.weeklyInvestorPayouts) ? summary!.weeklyInvestorPayouts : []), safePayout].slice(-52)
    };
};

const musicArtistNpcId = (artistId: string) => `music_npc_${artistId}`;

const applyMusicArtistNpcEarnings = (
    player: Player,
    earnings: { artistId: string; amount: number; followerGain?: number }[]
): Player => {
    if (!earnings.length) return player;
    const totals = new Map<string, { amount: number; followerGain: number }>();
    earnings.forEach(entry => {
        const amount = Math.max(0, Math.round(entry.amount || 0));
        const followerGain = Math.max(0, Math.round(entry.followerGain || 0));
        if (amount <= 0 && followerGain <= 0) return;
        const current = totals.get(entry.artistId) || { amount: 0, followerGain: 0 };
        totals.set(entry.artistId, {
            amount: current.amount + amount,
            followerGain: current.followerGain + followerGain
        });
    });
    if (!totals.size) return player;

    const applyToNpc = (npc: any): any => {
        const match = Array.from(totals.entries()).find(([artistId]) => npc.id === artistId || npc.id === musicArtistNpcId(artistId));
        if (!match) return npc;
        const [, payout] = match;
        const fameGain = Math.min(1.2, payout.amount / 1_500_000 + payout.followerGain / 8_000_000);
        return {
            ...npc,
            netWorth: Math.max(0, Math.round((npc.netWorth || 0) + payout.amount)),
            followers: Math.max(0, Math.round((npc.followers || 0) + payout.followerGain)),
            stats: {
                ...(npc.stats || {}),
                fame: Math.min(100, Math.round((((npc.stats?.fame || 35) + fameGain) * 10)) / 10)
            }
        };
    };

    NPC_DATABASE.forEach((npc: any, index) => {
        const updated = applyToNpc(npc);
        if (updated !== npc) NPC_DATABASE[index] = updated;
    });

    const extraNPCs = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : [];
    return {
        ...player,
        flags: {
            ...(player.flags || {}),
            extraNPCs: extraNPCs.map(applyToNpc)
        }
    };
};

const buildSoundtrackCreditEarnings = (
    project: ProjectDetails | undefined,
    weeklyStudioSoundtrackRevenue: number
): { artistId: string; amount: number; followerGain: number }[] => {
    const credits = project?.musicPlan?.credits || [];
    const revenue = Math.max(0, Math.round(weeklyStudioSoundtrackRevenue || 0));
    if (!credits.length || revenue <= 0) return [];
    const roleWeight = (role: string): number => {
        if (role === 'PROMO_ALBUM') return 1.35;
        if (role === 'SOUNDTRACK_EP') return 1.15;
        if (role === 'LEAD_SINGLE') return 1;
        if (role === 'MUSIC_VIDEO_TIE_IN') return 0.85;
        if (role === 'TRAILER_ANTHEM') return 0.75;
        return 0.7;
    };
    const weights = credits.map(credit => roleWeight(credit.role));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const artistRoyaltyPool = revenue * 0.48;
    return credits.map((credit, index) => {
        const amount = Math.round((artistRoyaltyPool * weights[index]) / totalWeight);
        return {
            artistId: credit.artistId,
            amount,
            followerGain: Math.round(Math.max(350, amount / 70))
        };
    });
};

const deterministicCultureRoll = (seed: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
};

const buildSoundtrackCultureOutcomes = (
    player: Player,
    rel: ActiveRelease,
    weeklySoundtrackRevenue: number,
    context: {
        releaseWeek: number;
        marketPulse: number;
        source: 'THEATRICAL' | 'STREAMING';
    }
): {
    moments: MusicCultureMomentRecord[];
    news: NewsItem[];
    posts: XPost[];
    logs: string[];
    artistEarnings: { artistId: string; amount: number; followerGain: number }[];
    reputationDelta: number;
    rawHypeDelta: number;
} => {
    const revenue = Math.max(0, Math.round(weeklySoundtrackRevenue || 0));
    const project = rel.projectDetails;
    const credits = project?.musicPlan?.credits || [];
    if (!project || !credits.length || revenue <= 0 || context.releaseWeek > 6) {
        return { moments: [], news: [], posts: [], logs: [], artistEarnings: [], reputationDelta: 0, rawHypeDelta: 0 };
    }

    const language = getPlayerLanguage(player);
    const catalog = getMusicArtistCatalog(player.world);
    const artistById = new Map(catalog.map(artist => [artist.id, artist]));
    const creditedArtists = credits
        .map(credit => ({ credit, artist: artistById.get(credit.artistId) }))
        .filter((entry): entry is { credit: typeof credits[number]; artist: NonNullable<ReturnType<typeof artistById.get>> } => Boolean(entry.artist));
    if (!creditedArtists.length) {
        return { moments: [], news: [], posts: [], logs: [], artistEarnings: [], reputationDelta: 0, rawHypeDelta: 0 };
    }

    const lead = creditedArtists
        .slice()
        .sort((left, right) => (right.artist.socialFollowers || 0) - (left.artist.socialFollowers || 0))[0];
    const musicImpact = calculateProjectMusicImpact(project, project.musicPlan, catalog);
    const moments: MusicCultureMomentRecord[] = [];
    const news: NewsItem[] = [];
    const posts: XPost[] = [];
    const logs: string[] = [];
    const artistEarnings: { artistId: string; amount: number; followerGain: number }[] = [];
    let reputationDelta = 0;
    let rawHypeDelta = 0;
    const existingMomentIds = new Set((player.world.musicIndustry?.cultureMoments || []).map(moment => moment.id));

    const pushMoment = (moment: MusicCultureMomentRecord, source: string): void => {
        if (existingMomentIds.has(moment.id)) return;
        existingMomentIds.add(moment.id);
        moments.push(moment);
        news.push({
            id: moment.id,
            headline: moment.headline,
            subtext: moment.description,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: moment.impactLevel
        });
        posts.push({
            id: `x_${moment.id}`,
            authorId: source,
            authorName: source === 'music_watch' ? 'Music Watch' : source === 'chart_fans' ? 'Chart Fans' : 'Soundtrack Pulse',
            authorHandle: source === 'music_watch' ? '@musicwatch' : source === 'chart_fans' ? '@chartfans' : '@soundtrackpulse',
            authorAvatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(moment.headline)}`,
            content: moment.description,
            timestamp: Date.now(),
            likes: Math.max(120, Math.floor(revenue * 0.018)),
            retweets: Math.max(28, Math.floor(revenue * 0.0032)),
            replies: Math.max(12, Math.floor(revenue * 0.0018)),
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
            postType: 'FILM_OPINION',
            sentiment: source === 'music_watch' ? 'MESSY' : 'INDUSTRY'
        });
        logs.push(moment.headline);
    };

    const weekKey = `${rel.id}_${player.age}_${player.currentWeek}_${context.source}`;
    if (context.releaseWeek <= 3 && (revenue >= 650_000 || musicImpact.score >= 78)) {
        const moment = createMusicCultureMoment('SOUNDTRACK_TREND', {
            id: `music_culture_soundtrack_trend_${rel.id}`,
            headline: t(language, 'services.gameLoop.soundtrackCulture.SOUNDTRACK_TREND.headline', {
                project: rel.name,
                genre: lead.artist.genre
            }),
            description: t(language, 'services.gameLoop.soundtrackCulture.SOUNDTRACK_TREND.description', {
                artist: lead.artist.stageName
            }),
            artistIds: creditedArtists.map(entry => entry.artist.id),
            artistNames: creditedArtists.map(entry => entry.artist.stageName),
            songTitle: lead.credit.songTitle,
            projectTitle: rel.name,
            heat: Math.min(100, Math.round(48 + revenue / 45_000 + musicImpact.socialHypeLift)),
            week: player.currentWeek,
            year: player.age,
            impactLevel: revenue >= 1_800_000 || musicImpact.score >= 86 ? 'HIGH' : 'MEDIUM'
        });
        pushMoment(moment, 'soundtrack_pulse');
        artistEarnings.push({
            artistId: lead.artist.id,
            amount: Math.round(revenue * 0.08),
            followerGain: Math.round(Math.max(4_000, revenue / 35))
        });
    }

    const marketPulse = Math.max(1, context.marketPulse || 1);
    const biggerThanMovie =
        context.releaseWeek <= 4 &&
        revenue >= 320_000 &&
        (
            revenue >= marketPulse * 0.16 ||
            (rel.budget > 0 && marketPulse < rel.budget * 0.12 && musicImpact.socialHypeLift >= 12)
        );
    if (biggerThanMovie) {
        const moment = createMusicCultureMoment('SONG_BIGGER_THAN_MOVIE', {
            id: `music_culture_song_bigger_${rel.id}`,
            headline: t(language, 'services.gameLoop.soundtrackCulture.SONG_BIGGER_THAN_MOVIE.headline', {
                song: lead.credit.songTitle,
                project: rel.name
            }),
            description: t(language, 'services.gameLoop.soundtrackCulture.SONG_BIGGER_THAN_MOVIE.description'),
            artistIds: [lead.artist.id],
            artistNames: [lead.artist.stageName],
            songTitle: lead.credit.songTitle,
            projectTitle: rel.name,
            heat: Math.min(100, Math.round(58 + revenue / 38_000)),
            week: player.currentWeek,
            year: player.age,
            impactLevel: revenue >= 1_200_000 ? 'HIGH' : 'MEDIUM'
        });
        pushMoment(moment, 'chart_fans');
        artistEarnings.push({
            artistId: lead.artist.id,
            amount: Math.round(revenue * 0.06),
            followerGain: Math.round(Math.max(6_000, revenue / 28))
        });
        rawHypeDelta += 3;
    }

    const riskyArtist = creditedArtists.find(entry => entry.artist.scandalRisk === 'HIGH')
        || creditedArtists.find(entry => entry.artist.scandalRisk === 'MEDIUM' && entry.credit.risk >= 18);
    const controversyChance = Math.min(0.45, Math.max(0.04, (musicImpact.controversyRisk + musicImpact.mismatchBacklashRisk) / 240));
    if (
        context.releaseWeek <= 2 &&
        riskyArtist &&
        deterministicCultureRoll(`${weekKey}_${riskyArtist.artist.id}_controversy`) < controversyChance
    ) {
        const moment = createMusicCultureMoment('CONTROVERSIAL_CAMPAIGN', {
            id: `music_culture_controversial_campaign_${rel.id}_${riskyArtist.artist.id}`,
            headline: t(language, 'services.gameLoop.soundtrackCulture.CONTROVERSIAL_CAMPAIGN.headline', {
                artist: riskyArtist.artist.stageName,
                project: rel.name
            }),
            description: t(language, 'services.gameLoop.soundtrackCulture.CONTROVERSIAL_CAMPAIGN.description'),
            artistIds: [riskyArtist.artist.id],
            artistNames: [riskyArtist.artist.stageName],
            songTitle: riskyArtist.credit.songTitle,
            projectTitle: rel.name,
            heat: Math.min(100, Math.round(52 + musicImpact.controversyRisk + riskyArtist.credit.risk)),
            week: player.currentWeek,
            year: player.age,
            impactLevel: musicImpact.controversyRisk >= 30 ? 'HIGH' : 'MEDIUM'
        });
        pushMoment(moment, 'music_watch');
        reputationDelta -= moment.impactLevel === 'HIGH' ? 1.2 : 0.6;
        rawHypeDelta -= moment.impactLevel === 'HIGH' ? 6 : 3;
    }

    return { moments, news, posts, logs, artistEarnings, reputationDelta, rawHypeDelta };
};

const getProductionHealthIncident = (player: Player, commitment: Commitment): 'stunt_fracture' | undefined => {
    const project = commitment.projectDetails;
    if (!project) return undefined;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const lastProductionHealthIncident = Number(player.flags?.lastProductionHealthIncidentAbsoluteWeek || -999);
    if (absoluteWeek - lastProductionHealthIncident < 16) return undefined;

    const stuntHeavyGenres = ['ACTION', 'ADVENTURE', 'SUPERHERO', 'SCI_FI', 'THRILLER', 'HORROR', 'SPORTS'];
    const intenseProduction = stuntHeavyGenres.includes(project.genre)
        || Number(project.estimatedBudget || 0) >= 75_000_000
        || ['LEAD', 'SUPPORTING'].includes(String(commitment.roleType || ''));
    if (!intenseProduction) return undefined;

    const body = Number(player.stats.body || 0);
    const health = Number(player.stats.health || 0);
    const productionPerformance = Number(commitment.productionPerformance || 0);
    const risk = Math.min(0.12,
        0.012
        + (body < 32 ? 0.035 : 0)
        + (health < 58 ? 0.025 : 0)
        + (productionPerformance < 25 ? 0.018 : 0)
        + (project.genre === 'ACTION' || project.genre === 'SUPERHERO' ? 0.018 : 0)
    );
    return Math.random() < risk ? 'stunt_fracture' : undefined;
};

const adjustPlatformFundingRelationship = (
    player: Player,
    businessId: string,
    platformId: string,
    modifierDelta: number,
    recoveryDelta: number
) => {
    const business = player.businesses.find(item => item.id === businessId);
    if (!business?.studioState) return;

    const relations = business.studioState.platformRelations || {};
    const current = relations[platformId];
    if (!current) return;

    const trustModifier = Math.max(-8, Math.min(0, current.trustModifier + modifierDelta));
    const recoveryWeeksRemaining = Math.max(0, Math.min(36, current.recoveryWeeksRemaining + recoveryDelta));
    const hasCommercialHistory = Math.max(0, Number(current.completedDeals || 0)) > 0
        || Math.max(0, Number(current.profitableDeals || 0)) > 0
        || Math.max(0, Number(current.loyaltyScore || 0)) > 0
        || Math.max(0, Number(current.realizedPartnerValue || 0)) > 0;
    const shouldRetainRelationship = hasCommercialHistory || (trustModifier !== 0 && recoveryWeeksRemaining !== 0);
    business.studioState.platformRelations = {
        ...relations,
        ...(shouldRetainRelationship
            ? {
                [platformId]: {
                    ...current,
                    trustModifier,
                    recoveryWeeksRemaining
                }
            }
            : {})
    };

    if (!shouldRetainRelationship) {
        delete business.studioState.platformRelations[platformId];
    }
};

const createFundingBreachLifeEvent = (
    businessId: string,
    businessName: string,
    platformId: string,
    platformName: string,
    sourceTitle: string,
    fundingAmount: number,
    studioBalance: number,
    language: GameLanguage = 'en'
): LifeEvent => {
    const settlement = Math.max(
        100_000,
        Math.min(5_000_000, fundingAmount * 0.03, Math.max(100_000, studioBalance * 0.08))
    );
    const legalFee = Math.max(50_000, Math.floor(settlement * 0.35));
    const settlementText = formatMoneyShort(settlement);
    const legalFeeText = formatMoneyShort(legalFee);
    const textVars = { businessName, platformName, sourceTitle };

    return {
        id: `funding_breach_${businessId}_${platformId}_${Date.now()}`,
        type: 'LEGAL',
        title: t(language, 'life.event.fundingBreach.title', { platformName }),
        titleKey: 'life.event.fundingBreach.title',
        description: t(language, 'life.event.fundingBreach.description', textVars),
        descriptionKey: 'life.event.fundingBreach.description',
        textVars,
        options: [
            {
                label: t(language, 'life.event.fundingBreach.settle.label', { settlement: settlementText }),
                labelKey: 'life.event.fundingBreach.settle.label',
                description: t(language, 'life.event.fundingBreach.settle.description'),
                descriptionKey: 'life.event.fundingBreach.settle.description',
                textVars: { settlement: settlementText },
                impact: (player) => {
                    const resultLanguage = getPlayerLanguage(player);
                    const business = player.businesses.find(item => item.id === businessId);
                    if (business) business.balance -= settlement;
                    adjustPlatformFundingRelationship(player, businessId, platformId, 1, -6);
                    const logVars = { businessName, platformName, settlement: settlementText };
                    return {
                        updatedPlayer: player,
                        log: t(resultLanguage, 'life.event.fundingBreach.settle.log', logVars),
                        logKey: 'life.event.fundingBreach.settle.log',
                        logVars
                    };
                }
            },
            {
                label: t(language, 'life.event.fundingBreach.arbitration.label', { legalFee: legalFeeText }),
                labelKey: 'life.event.fundingBreach.arbitration.label',
                description: t(language, 'life.event.fundingBreach.arbitration.description'),
                descriptionKey: 'life.event.fundingBreach.arbitration.description',
                textVars: { legalFee: legalFeeText },
                impact: (player) => {
                    const resultLanguage = getPlayerLanguage(player);
                    const business = player.businesses.find(item => item.id === businessId);
                    if (business) business.balance -= legalFee;
                    const won = Math.random() < 0.4;

                    if (won) {
                        adjustPlatformFundingRelationship(player, businessId, platformId, 2, -10);
                        const logVars = { businessName, platformName };
                        return {
                            updatedPlayer: player,
                            log: t(resultLanguage, 'life.event.fundingBreach.arbitration.winLog', logVars),
                            logKey: 'life.event.fundingBreach.arbitration.winLog',
                            logVars
                        };
                    }

                    const loss = Math.max(100_000, Math.floor(settlement * 0.75));
                    if (business) business.balance -= loss;
                    adjustPlatformFundingRelationship(player, businessId, platformId, -1, 6);
                    const totalCost = formatMoneyShort(legalFee + loss);
                    const logVars = { businessName, totalCost };
                    return {
                        updatedPlayer: player,
                        log: t(resultLanguage, 'life.event.fundingBreach.arbitration.lossLog', logVars),
                        logKey: 'life.event.fundingBreach.arbitration.lossLog',
                        logVars
                    };
                }
            }
        ]
    };
};

const createReturnStatusNews = (
    projectName: string,
    status: PlayerReturnStatus,
    week: number,
    year: number,
    isSeries: boolean
) => {
    if (status === 'RETURNING') return null;

    return {
        id: `news_return_status_${projectName}_${status}_${Date.now()}`,
        headline: status === 'KILLED_OFF'
            ? (isSeries
                ? `${projectName} returns, but your character is reportedly killed off.`
                : `${projectName} sequel locks in after your character is killed off.`)
            : (isSeries
                ? `${projectName} returns without your character in the new season.`
                : `${projectName} sequel proceeds after writing your character out.`),
        subtext: status === 'KILLED_OFF'
            ? 'Industry chatter says the story is moving on in brutal fashion.'
            : 'The continuation is moving ahead, but your role is no longer part of it.',
        category: 'YOU' as const,
        week,
        year,
        impactLevel: 'MEDIUM' as const
    };
};

const getNextSeasonNumber = (title: string) => {
    const seasonMatch = title.match(/Season (\d+)/i);
    return seasonMatch ? parseInt(seasonMatch[1], 10) + 1 : 2;
};

const createContinuationDecisionMessage = ({
    id,
    sender,
    subject,
    text,
    week,
    type,
    data,
}: {
    id: string;
    sender: string;
    subject: string;
    text: string;
    week: number;
    type?: Message['type'];
    data?: Message['data'];
}): Message => ({
    id: `${id}_${Date.now()}`,
    sender,
    subject,
    text,
    type: type || 'TEXT',
    data,
    isRead: false,
    weekSent: week,
    expiresIn: 8
});

const createSequelPassNews = (
    release: ActiveRelease,
    potential: FuturePotential,
    week: number,
    year: number
): NewsItem => {
    const hitPassed = potential.sequelChance >= 70 || release.totalGross >= release.budget * 3;
    return {
        id: `news_sequel_pass_${release.id}_${Date.now()}`,
        headline: hitPassed
            ? `Studio Passes on "${release.name}" Sequel Despite Hit Run`
            : `No Sequel Planned for "${release.name}"`,
        subtext: hitPassed
            ? 'Executives are choosing to protect the original run instead of forcing a follow-up.'
            : 'The studio says the project will remain a standalone release for now.',
        category: 'INDUSTRY',
        week,
        year,
        impactLevel: hitPassed ? 'HIGH' : 'MEDIUM'
    };
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
    try {
        const result = await Promise.race<T>([
            promise,
            new Promise<T>(resolve => setTimeout(() => resolve(fallback), timeoutMs))
        ]);
        return result;
    } catch {
        return fallback;
    }
};

const yieldWeekProcessingFrame = () => new Promise<void>(resolve => {
    globalThis.setTimeout(resolve, 0);
});

const ensureFiniteNumber = (value: any, fallback = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const ensureObjectArray = <T extends Record<string, any>>(value: any): T[] => {
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as T[] : [];
};

const ensureMoneyArray = (value: any): number[] => (
    Array.isArray(value) ? value.map(amount => ensureFiniteNumber(amount)).filter(amount => amount >= 0) : []
);

const getStreamingBidProfile = (packageScore: number, isSeries: boolean, runStrength = 1) => {
    let floor = 1.04;
    let ceiling = 1.3;

    if (packageScore < 35) {
        floor = 0.82;
        ceiling = 0.96;
    } else if (packageScore < 45) {
        floor = 0.9;
        ceiling = 1.02;
    } else if (packageScore < 60) {
        floor = 1.01;
        ceiling = 1.35;
    } else if (packageScore < 72) {
        floor = 1.18;
        ceiling = 2.8;
    } else if (packageScore < 84) {
        floor = 1.55;
        ceiling = 5.2;
    } else if (packageScore < 92) {
        floor = 2.1;
        ceiling = 8.6;
    } else {
        floor = 2.9;
        ceiling = 13.5;
    }

    if (isSeries) {
        floor += packageScore < 45 ? 0.04 : 0.08;
        ceiling += packageScore >= 60 ? 0.75 : 0.15;
    }

    if (runStrength < 0.65) {
        floor *= packageScore < 45 ? 0.96 : 0.98;
        ceiling *= 0.84;
    } else if (runStrength > 1.25) {
        floor *= 1 + Math.min(0.35, (runStrength - 1.25) * 0.08);
        ceiling *= 1 + Math.min(1.65, (runStrength - 1.25) * 0.14);
    }

    return {
        floor: Math.max(0.8, floor),
        ceiling: Math.max(floor + 0.08, ceiling)
    };
};

const getStreamingMarketProofCap = (
    projectBudget: number,
    packageScore: number,
    hiddenStats: Record<string, any> = {},
    isSeries: boolean,
    theatricalGross = 0,
    hasProvenIp = false
) => {
    if (projectBudget <= 0) return Number.MAX_SAFE_INTEGER;

    const castingStrength = Number.isFinite(hiddenStats.castingStrength) ? hiddenStats.castingStrength : 50;
    const fameMultiplier = Number.isFinite(hiddenStats.fameMultiplier) ? hiddenStats.fameMultiplier : 1;
    const rawHype = Number.isFinite(hiddenStats.rawHype) ? hiddenStats.rawHype : 50;

    let capMultiplier = packageScore >= 92 ? 4.25 : packageScore >= 84 ? 3.45 : packageScore >= 72 ? 2.65 : packageScore >= 60 ? 1.85 : 1.22;
    if (isSeries) capMultiplier += 0.35;
    if (castingStrength >= 88) capMultiplier += 0.65;
    else if (castingStrength >= 78) capMultiplier += 0.35;
    else if (castingStrength < 62) capMultiplier -= 0.35;

    if (fameMultiplier >= 7) capMultiplier += 2.2;
    else if (fameMultiplier >= 5.25) capMultiplier += 1.15;
    else if (fameMultiplier >= 3.6) capMultiplier += 0.55;

    if (rawHype >= 92) capMultiplier += 0.45;
    if (hasProvenIp) capMultiplier += 1.9;

    const packageCap = projectBudget * Math.max(1.05, capMultiplier);
    const theatricalValidationCap = theatricalGross > 0
        ? theatricalGross * (packageScore >= 90 || castingStrength >= 85 ? 0.92 : 0.72)
        : 0;

    return Math.max(packageCap, theatricalValidationCap);
};

const getYoutubeEventCooldown = (player: Player): number => {
    const videoCount = player.youtube?.videos?.length || 0;
    const subscriberPressure = player.youtube?.subscribers >= 50000 ? -1 : 0;
    return Math.max(3, 6 - Math.min(2, Math.floor(videoCount / 6)) + subscriberPressure);
};

const getYoutubeIdentityTuning = (identity?: string) => {
    switch (identity) {
        case 'CHAOS_CREATOR':
            return { trustDrift: -1, moodDrift: 2, heatDrift: 3, eventChance: 0.08, viralBoost: 0.12, backlashBoost: 0.12, memberBoost: -0.03 };
        case 'PRESTIGE_FILMMAKER':
            return { trustDrift: 2, moodDrift: -1, heatDrift: -2, eventChance: -0.02, viralBoost: -0.04, backlashBoost: -0.08, memberBoost: 0.02 };
        case 'LIFESTYLE_ICON':
            return { trustDrift: 1, moodDrift: 2, heatDrift: 0, eventChance: 0.02, viralBoost: 0, backlashBoost: -0.03, memberBoost: 0.12 };
        case 'CONTROVERSY_MAGNET':
            return { trustDrift: -2, moodDrift: 3, heatDrift: 5, eventChance: 0.1, viralBoost: 0.16, backlashBoost: 0.18, memberBoost: -0.08 };
        case 'ACTOR_VLOGGER':
        default:
            return { trustDrift: 1, moodDrift: 1, heatDrift: -1, eventChance: 0, viralBoost: 0.02, backlashBoost: -0.06, memberBoost: 0.08 };
    }
};

const createYoutubeChoiceImpact = (resolution: YoutubeEventResolution, choiceId: string) =>
    (player: Player) => resolveYoutubeEventChoice(player, resolution, choiceId);

export const createYoutubeCopyrightEvent = (
    videoTitle: string,
    claimAmount: number,
    evidenceStrength: number,
    language: GameLanguage = 'en'
): ScheduledEvent => {
    const editingFee = Math.max(100, Math.round(claimAmount * 0.35));
    const resolution: YoutubeEventResolution = {
        domain: 'YOUTUBE',
        kind: 'COPYRIGHT',
        payload: { videoTitle, claimAmount, evidenceStrength }
    };

    return {
        id: `yt_copyright_event_${Date.now()}_${Math.random()}`,
        week: 0,
        type: 'LEGAL_HEARING',
        title: t(language, 'life.event.youtube.copyright.eventTitle'),
        data: {
            youtubeResolution: resolution,
            lifeEvent: {
                id: `yt_copyright_life_${Date.now()}_${Math.random()}`,
                type: 'LEGAL',
                title: t(language, 'life.event.youtube.copyright.title'),
                titleKey: 'life.event.youtube.copyright.title',
                description: t(language, 'life.event.youtube.copyright.description', { videoTitle }),
                descriptionKey: 'life.event.youtube.copyright.description',
                textVars: { videoTitle },
                options: [
                    {
                        id: 'ACCEPT_CLAIM',
                        label: t(language, 'life.event.youtube.copyright.accept.label'),
                        labelKey: 'life.event.youtube.copyright.accept.label',
                        description: t(language, 'life.event.youtube.copyright.accept.description'),
                        descriptionKey: 'life.event.youtube.copyright.accept.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.cash'), labelKey: 'life.effect.cash', value: `-$${claimAmount.toLocaleString()}`, tone: 'negative' },
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '-2', tone: 'negative' },
                            { label: t(language, 'life.effect.risk'), labelKey: 'life.effect.risk', value: t(language, 'life.effect.value.none'), valueKey: 'life.effect.value.none', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'ACCEPT_CLAIM')
                    },
                    {
                        id: 'EDIT_UPLOAD',
                        label: t(language, 'life.event.youtube.copyright.edit.label'),
                        labelKey: 'life.event.youtube.copyright.edit.label',
                        description: t(language, 'life.event.youtube.copyright.edit.description'),
                        descriptionKey: 'life.event.youtube.copyright.edit.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.editingCost'), labelKey: 'life.effect.editingCost', value: `-$${editingFee.toLocaleString()}`, tone: 'negative' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-6', tone: 'positive' },
                            { label: t(language, 'life.effect.fanMood'), labelKey: 'life.effect.fanMood', value: '-1', tone: 'negative' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'EDIT_UPLOAD')
                    },
                    {
                        id: 'DISPUTE_CLAIM',
                        label: t(language, 'life.event.youtube.copyright.dispute.label'),
                        labelKey: 'life.event.youtube.copyright.dispute.label',
                        description: t(language, 'life.event.youtube.copyright.dispute.description'),
                        descriptionKey: 'life.event.youtube.copyright.dispute.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.upside'), labelKey: 'life.effect.upside', value: t(language, 'life.effect.value.trustPlus4'), valueKey: 'life.effect.value.trustPlus4', tone: 'positive' },
                            { label: t(language, 'life.effect.risk'), labelKey: 'life.effect.risk', value: t(language, 'life.effect.value.legalCase'), valueKey: 'life.effect.value.legalCase', tone: 'negative' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'DISPUTE_CLAIM')
                    },
                    {
                        id: 'GOLDEN_LEGAL',
                        label: t(language, 'life.event.youtube.copyright.golden.label'),
                        labelKey: 'life.event.youtube.copyright.golden.label',
                        isGolden: true,
                        description: t(language, 'life.event.youtube.copyright.golden.description'),
                        descriptionKey: 'life.event.youtube.copyright.golden.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+5', tone: 'positive' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-10', tone: 'positive' },
                            { label: t(language, 'life.effect.views'), labelKey: 'life.effect.views', value: t(language, 'life.effect.value.recovered'), valueKey: 'life.effect.value.recovered', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'GOLDEN_LEGAL')
                    }
                ]
            } as LifeEvent
        }
    };
};

export const createYoutubeBacklashEvent = (
    videoTitle: string,
    severity: number,
    language: GameLanguage = 'en'
): ScheduledEvent => {
    const resolution: YoutubeEventResolution = {
        domain: 'YOUTUBE',
        kind: 'BACKLASH',
        payload: { videoTitle, severity }
    };

    return {
        id: `yt_backlash_event_${Date.now()}_${Math.random()}`,
        week: 0,
        type: 'SCANDAL',
        title: t(language, 'life.event.youtube.backlash.eventTitle'),
        data: {
            youtubeResolution: resolution,
            lifeEvent: {
                id: `yt_backlash_life_${Date.now()}_${Math.random()}`,
                type: 'SCANDAL',
                title: t(language, 'life.event.youtube.backlash.title'),
                titleKey: 'life.event.youtube.backlash.title',
                description: t(language, 'life.event.youtube.backlash.description', { videoTitle }),
                descriptionKey: 'life.event.youtube.backlash.description',
                textVars: { videoTitle },
                options: [
                    {
                        id: 'POST_APOLOGY',
                        label: t(language, 'life.event.youtube.backlash.apology.label'),
                        labelKey: 'life.event.youtube.backlash.apology.label',
                        description: t(language, 'life.event.youtube.backlash.apology.description'),
                        descriptionKey: 'life.event.youtube.backlash.apology.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+7', tone: 'positive' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-12', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'POST_APOLOGY')
                    },
                    {
                        id: 'PR_TEAM',
                        label: t(language, 'life.event.youtube.backlash.pr.label'),
                        labelKey: 'life.event.youtube.backlash.pr.label',
                        isGolden: true,
                        description: t(language, 'life.event.youtube.backlash.pr.description'),
                        descriptionKey: 'life.event.youtube.backlash.pr.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+9', tone: 'positive' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-16', tone: 'positive' },
                            { label: t(language, 'life.effect.views'), labelKey: 'life.effect.views', value: t(language, 'life.effect.value.recovered'), valueKey: 'life.effect.value.recovered', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'PR_TEAM')
                    },
                    {
                        id: 'DOUBLE_DOWN',
                        label: t(language, 'life.event.youtube.backlash.doubleDown.label'),
                        labelKey: 'life.event.youtube.backlash.doubleDown.label',
                        description: t(language, 'life.event.youtube.backlash.doubleDown.description'),
                        descriptionKey: 'life.event.youtube.backlash.doubleDown.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.views'), labelKey: 'life.effect.views', value: t(language, 'life.effect.value.spike'), valueKey: 'life.effect.value.spike', tone: 'positive' },
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '-8', tone: 'negative' },
                            { label: t(language, 'life.effect.legalRisk'), labelKey: 'life.effect.legalRisk', value: t(language, 'life.effect.value.high'), valueKey: 'life.effect.value.high', tone: 'negative' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'DOUBLE_DOWN')
                    }
                ]
            } as LifeEvent
        }
    };
};

export const createYoutubeCreatorInviteEvent = (
    player: Player,
    kind: 'PODCAST' | 'CREATOR_GALA' | 'PLATFORM_SUMMIT'
): ScheduledEvent => {
    const language = getPlayerLanguage(player);
    const eventCopy: Record<typeof kind, { titleKey: string; descriptionKey: string; venue: string }> = {
        PODCAST: {
            titleKey: 'life.event.youtube.creatorInvite.PODCAST.title',
            venue: 'The Hot Seat Podcast',
            descriptionKey: 'life.event.youtube.creatorInvite.PODCAST.description'
        },
        CREATOR_GALA: {
            titleKey: 'life.event.youtube.creatorInvite.CREATOR_GALA.title',
            venue: 'Creator Awards Afterparty',
            descriptionKey: 'life.event.youtube.creatorInvite.CREATOR_GALA.description'
        },
        PLATFORM_SUMMIT: {
            titleKey: 'life.event.youtube.creatorInvite.PLATFORM_SUMMIT.title',
            venue: 'YouTube Creator Summit',
            descriptionKey: 'life.event.youtube.creatorInvite.PLATFORM_SUMMIT.description'
        }
    };
    const copy = eventCopy[kind];
    const resolution: YoutubeEventResolution = {
        domain: 'YOUTUBE',
        kind: 'CREATOR_INVITE',
        payload: { inviteKind: kind, venue: copy.venue }
    };

    return {
        id: `yt_creator_invite_${kind}_${Date.now()}_${Math.random()}`,
        week: 0,
        type: 'LIFE_EVENT',
        title: t(language, copy.titleKey),
        data: {
            youtubeResolution: resolution,
            lifeEvent: {
                id: `yt_creator_life_${kind}_${Date.now()}_${Math.random()}`,
                type: kind === 'PODCAST' ? 'NETWORKING' : 'LIFE',
                title: t(language, copy.titleKey),
                titleKey: `life.event.youtube.creatorInvite.${kind}.title`,
                description: t(language, copy.descriptionKey, { playerName: player.name }),
                descriptionKey: copy.descriptionKey,
                textVars: { playerName: player.name },
                options: [
                    {
                        id: 'STEADY_NETWORK',
                        label: t(language, kind === 'PODCAST' ? 'life.event.youtube.creatorInvite.steady.podcast.label' : 'life.event.youtube.creatorInvite.steady.room.label'),
                        labelKey: kind === 'PODCAST' ? 'life.event.youtube.creatorInvite.steady.podcast.label' : 'life.event.youtube.creatorInvite.steady.room.label',
                        description: t(language, 'life.event.youtube.creatorInvite.steady.description'),
                        descriptionKey: 'life.event.youtube.creatorInvite.steady.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+6', tone: 'positive' },
                            { label: t(language, 'life.effect.reputation'), labelKey: 'life.effect.reputation', value: '+3', tone: 'positive' },
                            { label: t(language, 'life.effect.xFollowers'), labelKey: 'life.effect.xFollowers', value: kind === 'PLATFORM_SUMMIT' ? '+12K' : '+6K', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'STEADY_NETWORK')
                    },
                    {
                        id: 'CHASE_VIRAL',
                        label: t(language, kind === 'PODCAST' ? 'life.event.youtube.creatorInvite.viral.podcast.label' : 'life.event.youtube.creatorInvite.viral.entrance.label'),
                        labelKey: kind === 'PODCAST' ? 'life.event.youtube.creatorInvite.viral.podcast.label' : 'life.event.youtube.creatorInvite.viral.entrance.label',
                        description: t(language, 'life.event.youtube.creatorInvite.viral.description'),
                        descriptionKey: 'life.event.youtube.creatorInvite.viral.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.growth'), labelKey: 'life.effect.growth', value: t(language, 'life.effect.value.high'), valueKey: 'life.effect.value.high', tone: 'positive' },
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '-4', tone: 'negative' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '+12', tone: 'negative' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'CHASE_VIRAL')
                    },
                    {
                        id: 'GOLDEN_HANDLER',
                        label: t(language, 'life.event.youtube.creatorInvite.golden.label'),
                        labelKey: 'life.event.youtube.creatorInvite.golden.label',
                        isGolden: true,
                        description: t(language, 'life.event.youtube.creatorInvite.golden.description'),
                        descriptionKey: 'life.event.youtube.creatorInvite.golden.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.growth'), labelKey: 'life.effect.growth', value: t(language, 'life.effect.value.highest'), valueKey: 'life.effect.value.highest', tone: 'positive' },
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+8', tone: 'positive' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-8', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'GOLDEN_HANDLER')
                    }
                ]
            } as LifeEvent
        }
    };
};

const YOUTUBE_RIVAL_NAMES = [
    'Milo Vance',
    'Ava Circuit',
    'Jett Monroe',
    'Nova Banks',
    'Riley Riot',
    'Kian Cross',
    'Luna Shade',
    'Blake Vale'
];

export const createYoutubeRivalryEvent = (player: Player, random: () => number = Math.random, language: GameLanguage = getPlayerLanguage(player)): ScheduledEvent => {
    const rivalName = YOUTUBE_RIVAL_NAMES[Math.floor(random() * YOUTUBE_RIVAL_NAMES.length)];
    const creatorScore = calculateYoutubeCreatorScore(player);
    const publicImage = getYoutubePublicImageLabel(player);
    const baseReach = Math.max(25000, player.youtube.subscribers * (0.25 + random() * 0.35));
    const topicKey = player.youtube.creatorIdentity === 'CONTROVERSY_MAGNET' || publicImage === 'Volatile'
        ? 'controversy'
        : player.youtube.creatorIdentity === 'PRESTIGE_FILMMAKER'
            ? 'polished'
            : 'copying';
    const resolution: YoutubeEventResolution = {
        domain: 'YOUTUBE',
        kind: 'RIVALRY',
        payload: { rivalName, baseReach }
    };

    return {
        id: `yt_rivalry_${Date.now()}_${Math.random()}`,
        week: 0,
        type: 'SCANDAL',
        title: t(language, 'life.event.youtube.rivalry.eventTitle'),
        data: {
            youtubeResolution: resolution,
            lifeEvent: {
                id: `yt_rivalry_life_${Date.now()}_${Math.random()}`,
                type: 'SCANDAL',
                title: t(language, 'life.event.youtube.rivalry.title', { rivalName }),
                titleKey: 'life.event.youtube.rivalry.title',
                description: t(language, `life.event.youtube.rivalry.description.${topicKey}`, { rivalName }),
                descriptionKey: `life.event.youtube.rivalry.description.${topicKey}`,
                textVars: { rivalName },
                options: [
                    {
                        id: 'IGNORE_BAIT',
                        label: t(language, 'life.event.youtube.rivalry.ignore.label'),
                        labelKey: 'life.event.youtube.rivalry.ignore.label',
                        description: t(language, 'life.event.youtube.rivalry.ignore.description'),
                        descriptionKey: 'life.event.youtube.rivalry.ignore.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+3', tone: 'positive' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-5', tone: 'positive' },
                            { label: t(language, 'life.effect.fanMood'), labelKey: 'life.effect.fanMood', value: '-1', tone: 'negative' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'IGNORE_BAIT')
                    },
                    {
                        id: 'CLAP_BACK',
                        label: t(language, 'life.event.youtube.rivalry.clapBack.label'),
                        labelKey: 'life.event.youtube.rivalry.clapBack.label',
                        description: t(language, 'life.event.youtube.rivalry.clapBack.description'),
                        descriptionKey: 'life.event.youtube.rivalry.clapBack.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.viewsSubs'), labelKey: 'life.effect.viewsSubs', value: t(language, 'life.effect.value.spike'), valueKey: 'life.effect.value.spike', tone: 'positive' },
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '-6', tone: 'negative' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '+16', tone: 'negative' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'CLAP_BACK')
                    },
                    {
                        id: 'MEDIATED_COLLAB',
                        label: t(language, 'life.event.youtube.rivalry.golden.label'),
                        labelKey: 'life.event.youtube.rivalry.golden.label',
                        isGolden: true,
                        description: t(language, 'life.event.youtube.rivalry.golden.description'),
                        descriptionKey: 'life.event.youtube.rivalry.golden.description',
                        previewEffects: [
                            { label: t(language, 'life.effect.viewsSubs'), labelKey: 'life.effect.viewsSubs', value: t(language, 'life.effect.value.bigGain'), valueKey: 'life.effect.value.bigGain', tone: 'positive' },
                            { label: t(language, 'life.effect.audienceTrust'), labelKey: 'life.effect.audienceTrust', value: '+8', tone: 'positive' },
                            { label: t(language, 'life.effect.controversy'), labelKey: 'life.effect.controversy', value: '-12', tone: 'positive' }
                        ],
                        impact: createYoutubeChoiceImpact(resolution, 'MEDIATED_COLLAB')
                    }
                ]
            } as LifeEvent,
            rivalName,
            creatorScore
        }
    };
};

const appendStudioLedgerEntry = (business: Business, entry: any) => {
    if (!business.studioState) business.studioState = {} as any;
    const ledger = Array.isArray(business.studioState.financeLedger) ? business.studioState.financeLedger : [];
    business.studioState.financeLedger = [entry, ...ledger].slice(0, 200);
};

const getPlayerProjectRoleType = (roleType: string | undefined, castList?: any[]): RoleType => {
    const playerCastEntry = castList?.find((member: any) => member?.actorId === 'PLAYER_SELF');
    if (playerCastEntry?.roleType) return playerCastEntry.roleType as RoleType;
    return (roleType as RoleType) || 'MINOR';
};

const defaultFuturePotential = (): FuturePotential => ({
    sequelChance: 0,
    franchiseChance: 0,
    rebootChance: 0,
    renewalChance: 0,
    isFranchiseStarter: false,
    isSequelGreenlit: false,
    isRenewed: false,
    seriesStatus: 'N/A',
    playerReturnStatus: undefined,
    returnStatusNote: undefined
});

const normalizeReleaseProjectDetails = (details: any): ProjectDetails => {
    const safeDetails = details && typeof details === 'object' ? details : {};
    const resolvedType = resolveProjectType(safeDetails.type, safeDetails.projectType, safeDetails.mediaType);
    const normalized = {
        ...safeDetails,
        title: safeDetails.title || safeDetails.name || 'Untitled Project',
        type: resolvedType,
        description: safeDetails.description || '',
        studioId: safeDetails.studioId || 'ARTISAN_PICTURES',
        subtype: safeDetails.subtype || 'STANDALONE',
        genre: safeDetails.genre || 'DRAMA',
        budgetTier: safeDetails.budgetTier || 'MID',
        estimatedBudget: ensureFiniteNumber(safeDetails.estimatedBudget),
        visibleHype: safeDetails.visibleHype || 'MID',
        hiddenStats: {
            ...(safeDetails.hiddenStats || {})
        },
        directorName: safeDetails.directorName || 'Unknown Director',
        visibleDirectorTier: safeDetails.visibleDirectorTier || 'Unknown',
        visibleScriptBuzz: safeDetails.visibleScriptBuzz || 'Unknown',
        visibleCastStrength: safeDetails.visibleCastStrength || 'Unknown',
        castList: ensureObjectArray(safeDetails.castList),
        reviews: ensureObjectArray(safeDetails.reviews),
        audienceReception: safeDetails.audienceReception && typeof safeDetails.audienceReception === 'object'
            ? safeDetails.audienceReception
            : undefined,
        episodeRatings: ensureObjectArray(safeDetails.episodeRatings),
        selectedLocations: Array.isArray(safeDetails.selectedLocations) ? safeDetails.selectedLocations : [],
        releaseRegionIds: Array.isArray(safeDetails.releaseRegionIds) ? safeDetails.releaseRegionIds : [],
        releaseChainSelections: safeDetails.releaseChainSelections && typeof safeDetails.releaseChainSelections === 'object'
            ? safeDetails.releaseChainSelections
            : {},
        reservedMarketingBudget: ensureFiniteNumber(safeDetails.reservedMarketingBudget),
        marketingBudgetSpent: ensureFiniteNumber(safeDetails.marketingBudgetSpent),
        marketingBudgetRemaining: ensureFiniteNumber(safeDetails.marketingBudgetRemaining),
        returnedMarketingBudget: ensureFiniteNumber(safeDetails.returnedMarketingBudget),
        totalCampaignSpend: ensureFiniteNumber(safeDetails.totalCampaignSpend),
        marketingChannelAllocations: safeDetails.marketingChannelAllocations && typeof safeDetails.marketingChannelAllocations === 'object'
            ? safeDetails.marketingChannelAllocations
            : undefined,
        campaignFitSnapshot: safeDetails.campaignFitSnapshot && typeof safeDetails.campaignFitSnapshot === 'object'
            ? safeDetails.campaignFitSnapshot
            : undefined,
        campaignForecastSnapshot: safeDetails.campaignForecastSnapshot && typeof safeDetails.campaignForecastSnapshot === 'object'
            ? safeDetails.campaignForecastSnapshot
            : undefined,
        campaignRealitySnapshot: safeDetails.campaignRealitySnapshot && typeof safeDetails.campaignRealitySnapshot === 'object'
            ? safeDetails.campaignRealitySnapshot
            : undefined,
        investorPlan: safeDetails.investorPlan && typeof safeDetails.investorPlan === 'object'
            ? safeDetails.investorPlan
            : undefined,
        investorPayouts: safeDetails.investorPayouts && typeof safeDetails.investorPayouts === 'object'
            ? {
                lifetimeInvestorPayout: ensureFiniteNumber(safeDetails.investorPayouts.lifetimeInvestorPayout),
                weeklyInvestorPayouts: ensureMoneyArray(safeDetails.investorPayouts.weeklyInvestorPayouts)
            }
            : undefined,
    } as ProjectDetails;
    return withAutomaticMusicPlan(normalized);
};

const readReleaseTimingNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const getTimingFromAbsoluteWeek = (absoluteWeek: number) => ({
    releaseYear: Math.floor(Math.max(0, Math.floor(absoluteWeek)) / 52) + 1,
    releaseWeek: (Math.max(0, Math.floor(absoluteWeek)) % 52) + 1
});

const inferArchiveReleaseTiming = (
    release: ActiveRelease,
    projectDetails: ProjectDetails,
    player: Player
): { releaseYear: number; releaseWeek: number; releasedAtAbsoluteWeek: number } => {
    const details = projectDetails as any;
    const hiddenStats = details.hiddenStats || {};
    let releasedAtAbsoluteWeek = readReleaseTimingNumber(
        release.releasedAtAbsoluteWeek,
        details.releasedAtAbsoluteWeek,
        hiddenStats.releasedAtAbsoluteWeek
    );
    let releaseYear = readReleaseTimingNumber(
        release.releaseYear,
        details.releaseYear,
        hiddenStats.releaseYear
    );
    let releaseWeek = readReleaseTimingNumber(
        release.releaseWeek,
        details.releaseWeek,
        hiddenStats.releaseWeek
    );

    if (releasedAtAbsoluteWeek !== undefined) {
        const absoluteTiming = getTimingFromAbsoluteWeek(releasedAtAbsoluteWeek);
        releaseYear = releaseYear ?? absoluteTiming.releaseYear;
        releaseWeek = releaseWeek ?? absoluteTiming.releaseWeek;
    }

    const runWeek = Math.max(1, Math.round(readReleaseTimingNumber(
        release.weekNum,
        release.streaming?.weekOnPlatform
    ) || 1));
    const inferredAbsoluteWeek = Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - Math.max(0, runWeek - 1));
    const inferredTiming = getTimingFromAbsoluteWeek(inferredAbsoluteWeek);

    releaseYear = releaseYear ?? inferredTiming.releaseYear;
    releaseWeek = releaseWeek ?? inferredTiming.releaseWeek;
    releasedAtAbsoluteWeek = releasedAtAbsoluteWeek ?? inferredAbsoluteWeek;

    const safeReleaseWeek = releaseWeek >= 1 && releaseWeek <= 52
        ? Math.floor(releaseWeek)
        : inferredTiming.releaseWeek;

    return {
        releaseYear: Math.max(1, Math.floor(releaseYear || inferredTiming.releaseYear)),
        releaseWeek: safeReleaseWeek,
        releasedAtAbsoluteWeek: Math.max(0, Math.floor(releasedAtAbsoluteWeek))
    };
};

const createPastProjectArchiveSnapshot = (
    release: ActiveRelease,
    options: { player: Player; streamingRevenue?: number; totalViews?: number; weeklyStreamingBreakdowns?: any[]; weeklyViews?: number[] }
): PastProject => {
    const projectDetails = normalizeReleaseProjectDetails(release.projectDetails);
    const archiveTiming = inferArchiveReleaseTiming(release, projectDetails, options.player);
    const episodeRatings = projectDetails.episodeRatings?.length
        ? projectDetails.episodeRatings
        : generateEpisodeRatings({ ...release, projectDetails });
    const weeklyGross = ensureMoneyArray(release.weeklyGross);
    const weeklyStudioReceipts = ensureMoneyArray(release.weeklyStudioReceipts);
    const weeklyExhibitorReceipts = ensureMoneyArray(release.weeklyExhibitorReceipts);
    const weeklyViews = ensureMoneyArray(options.weeklyViews || release.streaming?.weeklyViews);
    const weeklyDistributionBreakdowns = ensureObjectArray<TheatricalDistributionBreakdown>(release.weeklyDistributionBreakdowns);
    const weeklyStreamingBreakdowns = ensureObjectArray<StreamingDistributionBreakdown>(options.weeklyStreamingBreakdowns || release.weeklyStreamingBreakdowns);
    const totalGross = ensureFiniteNumber(release.totalGross, weeklyGross.reduce((sum, value) => sum + value, 0));
    const streamingRevenue = ensureFiniteNumber(options.streamingRevenue ?? release.streamingRevenue);
    const soundtrackRevenue = ensureFiniteNumber(release.soundtrackRevenue);
    const totalStudioReceipts = ensureFiniteNumber(release.totalStudioReceipts, weeklyStudioReceipts.reduce((sum, value) => sum + value, 0));
    const totalExhibitorReceipts = ensureFiniteNumber(release.totalExhibitorReceipts, weeklyExhibitorReceipts.reduce((sum, value) => sum + value, 0));
    const qualityScore = ensureFiniteNumber(projectDetails.hiddenStats?.qualityScore, ensureFiniteNumber(release.productionPerformance, 50));
    const playerRoleType = getPlayerProjectRoleType(release.roleType, projectDetails.castList);
    const playerCastMember = projectDetails.castList?.find(member => member.isPlayer || member.actorId === 'PLAYER_SELF');
    const playerCharacterProfile = playerCastMember?.storyRole
        ? {
            storyFunction: playerCastMember.storyFunction || 'PROTAGONIST' as const,
            storyRole: playerCastMember.storyRole,
            abilityType: playerCastMember.abilityType || 'NONE' as const,
            nature: playerCastMember.nature || 'HUMAN' as const,
            identitySource: playerCastMember.identitySource || 'AUTO' as const,
        }
        : suggestCharacterIdentity(inferStoryCompass(projectDetails), playerRoleType, 0, projectDetails);

    return {
        id: release.id,
        name: release.name,
        type: 'ACTING_GIG',
        roleType: playerRoleType,
        playerCharacterProfile,
        playerRolePerformance: Math.round(ensureFiniteNumber(release.productionPerformance, qualityScore)),
        year: archiveTiming.releaseYear,
        earnings: 0,
        rating: ensureFiniteNumber(release.imdbRating),
        reception: release.status || 'FINISHED',
        projectQuality: qualityScore,
        imdbRating: release.imdbRating,
        boxOfficeResult: `$${(totalGross / 1000000).toFixed(1)}M`,
        outcomeTier: calculateRunOutcome(
            getProjectMarketOutcomeRevenue(
                release,
                totalGross + streamingRevenue + soundtrackRevenue,
                ensureFiniteNumber(release.budget)
            ),
            ensureFiniteNumber(release.budget),
            release.imdbRating || 5
        ).tier,
        subtype: projectDetails.subtype,
        futurePotential: release.futurePotential || defaultFuturePotential(),
        studioId: projectDetails.studioId,
        streamingPlatform: release.streaming?.platformId,
        streamingContractId: release.streamingContractId || release.streaming?.contractId,
        totalViews: ensureFiniteNumber(options.totalViews ?? release.streaming?.totalViews),
        weeklyViews,
        streamingRevenue,
        platformProductionFunding: ensureFiniteNumber(
            release.platformProductionFunding
            ?? projectDetails.hiddenStats?.platformProductionFundingApplied
        ),
        studioCashAtRisk: ensureFiniteNumber(
            release.studioCashAtRisk
            ?? projectDetails.hiddenStats?.studioCashAtRisk
        ),
        productionFundApplied: ensureFiniteNumber(
            release.productionFundApplied
            ?? projectDetails.hiddenStats?.productionFundApplied
        ),
        weeklyStreamingBreakdowns,
        soundtrackRevenue,
        weeklySoundtrackRevenue: ensureMoneyArray(release.weeklySoundtrackRevenue),
        soundtrackRevenueBreakdown: release.soundtrackRevenueBreakdown,
        weeklySoundtrackBreakdowns: ensureObjectArray(release.weeklySoundtrackBreakdowns),
        investorPlan: release.investorPlan || projectDetails.investorPlan,
        investorPayouts: release.investorPayouts,
        castList: ensureObjectArray(projectDetails.castList),
        backgroundCastingPlan: projectDetails.backgroundCastingPlan,
        reviews: ensureObjectArray(projectDetails.reviews),
        audienceReception: release.audienceReception || projectDetails.audienceReception,
        episodeRatings,
        campaignRealitySnapshot: projectDetails.campaignRealitySnapshot,
        campaignPositioning: projectDetails.campaignPositioning,
        campaignTimeline: projectDetails.campaignTimeline,
        campaignFitSnapshot: projectDetails.campaignFitSnapshot,
        campaignForecastSnapshot: projectDetails.campaignForecastSnapshot,
        marketingChannelAllocations: projectDetails.marketingChannelAllocations,
        reservedMarketingBudget: ensureFiniteNumber(projectDetails.reservedMarketingBudget),
        marketingBudgetSpent: ensureFiniteNumber(projectDetails.marketingBudgetSpent),
        marketingBudgetRemaining: ensureFiniteNumber(projectDetails.marketingBudgetRemaining),
        returnedMarketingBudget: ensureFiniteNumber(projectDetails.returnedMarketingBudget),
        totalCampaignSpend: ensureFiniteNumber(projectDetails.totalCampaignSpend),
        budget: ensureFiniteNumber(release.budget),
        gross: totalGross,
        weeklyGross,
        weeklyStudioReceipts,
        totalStudioReceipts,
        weeklyExhibitorReceipts,
        totalExhibitorReceipts,
        weeklyDistributionBreakdowns,
        releaseRegionIds: Array.isArray(projectDetails.releaseRegionIds) ? projectDetails.releaseRegionIds : [],
        releaseChainSelections: projectDetails.releaseChainSelections && typeof projectDetails.releaseChainSelections === 'object'
            ? projectDetails.releaseChainSelections
            : {},
        boxOfficeArchiveVersion: 1,
        baseTheatricalWeeks: release.baseTheatricalWeeks,
        theatricalExtensionWeeks: release.theatricalExtensionWeeks,
        theatricalExtensionHistory: ensureObjectArray(release.theatricalExtensionHistory),
        genre: projectDetails.genre,
        format: projectDetails.format,
        subjectName: projectDetails.subjectName,
        subjectType: projectDetails.subjectType,
        description: projectDetails.description,
        projectType: resolveProjectType(release.type, projectDetails.type, (release as any).projectType),
        royaltyPercentage: release.royaltyPercentage,
        franchiseId: projectDetails.franchiseId,
        universeId: projectDetails.universeId,
        universeSagaName: projectDetails.universeSagaName,
        universePhaseName: projectDetails.universePhaseName,
        installmentNumber: projectDetails.installmentNumber,
        directorId: projectDetails.directorId,
        sourceScriptId: projectDetails.sourceScriptId,
        isOriginal: projectDetails.isOriginal,
        releaseWeek: archiveTiming.releaseWeek,
        releaseYear: archiveTiming.releaseYear,
        releasedAtAbsoluteWeek: archiveTiming.releasedAtAbsoluteWeek,
        customPoster: projectDetails.customPoster,
        musicPlan: projectDetails.musicPlan,
    };
};

const buildFriendFavorRequest = (player: Player, absoluteWeek: number): Message | null => {
    const flags = player.flags || {};
    const lastFavorWeek = Number(flags.lastFriendFavorAbsWeek || -999);
    if (absoluteWeek - lastFavorWeek < 14) return null;

    const friends = (player.relationships || []).filter((relationship: Relationship) =>
        relationship.relation === 'Friend' && (relationship.closeness || 0) >= 35
    );
    if (friends.length === 0) return null;

    const fame = Number(player.stats?.fame || 0);
    const cash = Number(player.money || 0);
    if (fame < 28 && cash < 150000) return null;

    const chance = Math.min(0.32, 0.08 + Math.max(0, fame - 28) / 280 + Math.max(0, cash - 150000) / 4000000);
    if (Math.random() > chance) return null;

    const friend = friends[Math.floor(Math.random() * friends.length)];
    const wantsRoleHelp = fame >= 45 && Math.random() < 0.55;
    const amount = Math.max(2500, Math.min(250000, Math.round((cash * (0.015 + Math.random() * 0.025)) / 500) * 500));

    return {
        id: `friend_favor_${friend.id}_${absoluteWeek}_${Date.now()}`,
        sender: friend.name,
        subject: wantsRoleHelp ? 'Can you put in a word?' : 'Need a little help',
        text: wantsRoleHelp
            ? `${friend.name} saw your career taking off and asks if you can mention them for a small role, cameo, or set introduction. Helping could deepen the friendship, but forcing it may hurt your industry reputation.`
            : `${friend.name} asks for $${amount.toLocaleString()} to handle a personal problem. Helping can build loyalty; ignoring it may cool the friendship.`,
        type: 'SYSTEM',
        data: {
            kind: 'FRIEND_FAVOR',
            friendId: friend.id,
            favorType: wantsRoleHelp ? 'ROLE_HELP' : 'MONEY',
            amount: wantsRoleHelp ? 0 : amount,
            createdAbsoluteWeek: absoluteWeek,
        },
        isRead: false,
        weekSent: player.currentWeek,
        expiresIn: 6,
    };
};

export type ProcessGameWeekDiagnostics = {
    onStage?: (stage: string, context?: Record<string, unknown>) => void;
};

// Returns updated player AND a flag if an ad should be triggered
export const processGameWeek = async (
    player: Player,
    diagnostics: ProcessGameWeekDiagnostics = {}
): Promise<{ player: Player, triggerAd: boolean }> => {
    setCrashContext(player, {
        flow: 'game_loop',
        loop_stage: 'start',
    });
    addBreadcrumb('game_loop:start', {
        age: player.age,
        week: player.currentWeek,
        commitments: player.commitments?.length || 0,
        releases: player.activeReleases?.length || 0,
    });
    let nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
    let triggerAd = false;
    const emitLoopStage = (stage: string, context: Record<string, unknown> = {}) => {
        const stageContext = {
            age: nextPlayer.age,
            week: nextPlayer.currentWeek,
            pending_events: nextPlayer.pendingEvents?.length || 0,
            commitments: nextPlayer.commitments?.length || 0,
            active_releases: nextPlayer.activeReleases?.length || 0,
            inbox_messages: nextPlayer.inbox?.length || 0,
            businesses: nextPlayer.businesses?.length || 0,
            ...context,
        };
        diagnostics.onStage?.(stage, stageContext);
        setCrashContext(nextPlayer, {
            flow: 'game_loop',
            loop_stage: stage,
            ...stageContext,
        });
        addBreadcrumb(`game_loop:${stage}`, stageContext);
    };
    emitLoopStage('state_cloned');
    const language = getPlayerLanguage(nextPlayer);
    const actorArcBeforeWeek = getActorCareerArc(nextPlayer);
    const getCommitmentDisplayName = (commitment: Commitment, currentLanguage: GameLanguage = language) => {
        if (!commitment.nameKey) return commitment.name;
        const translated = t(currentLanguage, commitment.nameKey);
        return translated === commitment.nameKey ? commitment.name : translated;
    };
    
    // --- 0. INIT STOCKS, FINANCE, WORLD, STUDIO IF MISSING ---
    if (!nextPlayer.stocks || nextPlayer.stocks.length === 0) {
        nextPlayer.stocks = initializeStocks();
        nextPlayer.portfolio = [];
    }
    if (!nextPlayer.finance) {
        nextPlayer.finance = {
            history: [],
            yearly: [],
            loans: [],
            credit: { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }
        };
    }
    if (!Array.isArray(nextPlayer.finance.history)) nextPlayer.finance.history = [];
    if (!Array.isArray(nextPlayer.finance.yearly)) nextPlayer.finance.yearly = [];
    if (!Array.isArray(nextPlayer.finance.loans)) nextPlayer.finance.loans = [];
    if (!nextPlayer.finance.credit) {
        nextPlayer.finance.credit = { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 };
    }
    if (!nextPlayer.world) {
        nextPlayer.world = { 
            projects: [], 
            trendingGenre: 'ACTION', 
            universes: {} as any, 
            famousMoviesReleased: [],
            awardHistory: [],
            upcomingRivals: []
        };
    }
    if (!Array.isArray(nextPlayer.world.projects)) nextPlayer.world.projects = [];
    if (!nextPlayer.world.universes || typeof nextPlayer.world.universes !== 'object') nextPlayer.world.universes = {} as any;
    nextPlayer.world.universes = normalizeUniverseMap(nextPlayer.world.universes);
    if (!Array.isArray(nextPlayer.world.famousMoviesReleased)) nextPlayer.world.famousMoviesReleased = [];
    nextPlayer.world.awardHistory = sanitizeAwardHistoryEntries(
        Array.isArray(nextPlayer.world.awardHistory) ? nextPlayer.world.awardHistory : []
    );
    if (!Array.isArray(nextPlayer.world.upcomingRivals)) nextPlayer.world.upcomingRivals = [];
    if (nextPlayer.world.musicIndustry && !Array.isArray(nextPlayer.world.musicIndustry.chart)) nextPlayer.world.musicIndustry.chart = [];
    if (nextPlayer.world.musicIndustry && !Array.isArray(nextPlayer.world.musicIndustry.history)) nextPlayer.world.musicIndustry.history = [];
    if (nextPlayer.world.musicIndustry && !Array.isArray(nextPlayer.world.musicIndustry.recentReleases)) nextPlayer.world.musicIndustry.recentReleases = [];
    if (nextPlayer.world.musicIndustry && !Array.isArray(nextPlayer.world.musicIndustry.rivalries)) nextPlayer.world.musicIndustry.rivalries = [];
    if (nextPlayer.world.musicIndustry && !Array.isArray(nextPlayer.world.musicIndustry.scandals)) nextPlayer.world.musicIndustry.scandals = [];
    if (!nextPlayer.studio) {
        nextPlayer.studio = {
            isUnlocked: false,
            baseType: null,
            talentRoster: [],
            lastTalentRefreshWeek: 0
        };
    }
    if (!Array.isArray(nextPlayer.studio.talentRoster)) nextPlayer.studio.talentRoster = [];
    if (!nextPlayer.flags) nextPlayer.flags = {};
    if (!Array.isArray(nextPlayer.flags.familyObligations)) nextPlayer.flags.familyObligations = [];
    if (!Array.isArray(nextPlayer.flags.abandonedChildIds)) nextPlayer.flags.abandonedChildIds = [];
    if (!Array.isArray(nextPlayer.flags.hiddenChildren)) nextPlayer.flags.hiddenChildren = [];
    if (!Array.isArray(nextPlayer.flags.familyDramaSeeds)) nextPlayer.flags.familyDramaSeeds = [];
    if (!Array.isArray(nextPlayer.flags.familyClaimHistory)) nextPlayer.flags.familyClaimHistory = [];
    if (!Array.isArray(nextPlayer.flags.extraNPCs)) nextPlayer.flags.extraNPCs = [];
    if (!Array.isArray(nextPlayer.flags.youtubeMilestonesUnlocked)) nextPlayer.flags.youtubeMilestonesUnlocked = [];
    if (!nextPlayer.team) nextPlayer.team = { availableAgents: [], availableManagers: [], availableTrainers: [], availableStylists: [], availableTherapists: [], availablePublicists: [], availableWellness: [] } as any;
    if (!Array.isArray(nextPlayer.team.availableAgents)) nextPlayer.team.availableAgents = [];
    if (!Array.isArray(nextPlayer.team.availableManagers)) nextPlayer.team.availableManagers = [];
    if (!Array.isArray(nextPlayer.team.availableTrainers)) nextPlayer.team.availableTrainers = [];
    if (!Array.isArray(nextPlayer.team.availableStylists)) nextPlayer.team.availableStylists = [];
    if (!Array.isArray(nextPlayer.team.availableTherapists)) nextPlayer.team.availableTherapists = [];
    if (!Array.isArray(nextPlayer.team.availablePublicists)) nextPlayer.team.availablePublicists = [];
    if (!Array.isArray(nextPlayer.team.availableWellness)) nextPlayer.team.availableWellness = [];
    if (nextPlayer.team.wellness === undefined) nextPlayer.team.wellness = null;
    nextPlayer.team = sanitizeTeamPools(nextPlayer);
    nextPlayer.commitments = ensureObjectArray<Commitment>(nextPlayer.commitments).map(commitment => ({
        ...commitment,
        energyCost: ensureFiniteNumber(commitment.energyCost),
        income: ensureFiniteNumber(commitment.income),
        weeklyCost: ensureFiniteNumber(commitment.weeklyCost),
        lumpSum: commitment.lumpSum === undefined ? undefined : ensureFiniteNumber(commitment.lumpSum),
        agentCommission: commitment.agentCommission === undefined ? undefined : ensureFiniteNumber(commitment.agentCommission),
        royaltyPercentage: commitment.royaltyPercentage === undefined ? undefined : ensureFiniteNumber(commitment.royaltyPercentage),
        phaseWeeksLeft: commitment.phaseWeeksLeft === undefined ? undefined : ensureFiniteNumber(commitment.phaseWeeksLeft, 1),
        totalPhaseDuration: commitment.totalPhaseDuration === undefined ? undefined : ensureFiniteNumber(commitment.totalPhaseDuration),
        productionCalendar: normalizeProductionCalendar(commitment.productionCalendar),
        weeksCompleted: commitment.weeksCompleted === undefined ? undefined : ensureFiniteNumber(commitment.weeksCompleted),
        totalDuration: commitment.totalDuration === undefined ? undefined : ensureFiniteNumber(commitment.totalDuration),
        durationLeft: commitment.durationLeft === undefined ? undefined : ensureFiniteNumber(commitment.durationLeft),
        projectDetails: commitment.projectDetails && typeof commitment.projectDetails === 'object'
            ? {
                ...commitment.projectDetails,
                hiddenStats: {
                    ...(commitment.projectDetails.hiddenStats || {})
                },
                castList: ensureObjectArray(commitment.projectDetails.castList),
                reviews: ensureObjectArray(commitment.projectDetails.reviews),
                audienceReception: commitment.projectDetails.audienceReception && typeof commitment.projectDetails.audienceReception === 'object'
                    ? commitment.projectDetails.audienceReception
                    : undefined
            }
            : commitment.projectDetails
    }) as Commitment);
    nextPlayer.activeReleases = ensureObjectArray<ActiveRelease>(nextPlayer.activeReleases).map(release => ({
        ...release,
        roleType: getPlayerProjectRoleType(release.roleType, release.projectDetails?.castList),
        weekNum: ensureFiniteNumber(release.weekNum, 1),
        weeklyGross: ensureMoneyArray(release.weeklyGross),
        totalGross: ensureFiniteNumber(release.totalGross),
        weeklyStudioReceipts: ensureMoneyArray(release.weeklyStudioReceipts),
        totalStudioReceipts: ensureFiniteNumber(release.totalStudioReceipts),
        weeklyExhibitorReceipts: ensureMoneyArray(release.weeklyExhibitorReceipts),
        totalExhibitorReceipts: ensureFiniteNumber(release.totalExhibitorReceipts),
        weeklyDistributionBreakdowns: ensureObjectArray(release.weeklyDistributionBreakdowns),
        budget: ensureFiniteNumber(release.budget),
        imdbRating: release.imdbRating === undefined ? undefined : ensureFiniteNumber(release.imdbRating),
        productionPerformance: ensureFiniteNumber(release.productionPerformance, 50),
        sequelDecisionWeek: release.sequelDecisionWeek === undefined ? undefined : ensureFiniteNumber(release.sequelDecisionWeek),
        promotionalBuzz: ensureFiniteNumber(release.promotionalBuzz),
        streamingRevenue: ensureFiniteNumber(release.streamingRevenue),
        weeklyStreamingBreakdowns: ensureObjectArray(release.weeklyStreamingBreakdowns),
        soundtrackRevenue: ensureFiniteNumber(release.soundtrackRevenue),
        weeklySoundtrackRevenue: ensureMoneyArray(release.weeklySoundtrackRevenue),
        soundtrackRevenueBreakdown: release.soundtrackRevenueBreakdown && typeof release.soundtrackRevenueBreakdown === 'object'
            ? mergeSoundtrackRevenueBreakdowns(undefined, release.soundtrackRevenueBreakdown)
            : undefined,
        weeklySoundtrackBreakdowns: ensureObjectArray(release.weeklySoundtrackBreakdowns),
        investorPlan: release.investorPlan || release.projectDetails?.investorPlan,
        audienceReception: release.audienceReception || release.projectDetails?.audienceReception,
        investorPayouts: release.investorPayouts && typeof release.investorPayouts === 'object'
            ? {
                lifetimeInvestorPayout: ensureFiniteNumber(release.investorPayouts.lifetimeInvestorPayout),
                weeklyInvestorPayouts: ensureMoneyArray(release.investorPayouts.weeklyInvestorPayouts)
            }
            : undefined,
        royaltyPercentage: release.royaltyPercentage === undefined ? undefined : ensureFiniteNumber(release.royaltyPercentage),
        studioRoyaltyPercentage: release.studioRoyaltyPercentage === undefined ? undefined : ensureFiniteNumber(release.studioRoyaltyPercentage),
        streamingUpfrontFee: release.streamingUpfrontFee === undefined ? undefined : ensureFiniteNumber(release.streamingUpfrontFee),
        streamingRoyaltyRevenue: release.streamingRoyaltyRevenue === undefined ? undefined : ensureFiniteNumber(release.streamingRoyaltyRevenue),
        streamingFundingAmount: release.streamingFundingAmount === undefined ? undefined : ensureFiniteNumber(release.streamingFundingAmount),
        platformProductionFunding: release.platformProductionFunding === undefined ? undefined : ensureFiniteNumber(release.platformProductionFunding),
        studioCashAtRisk: release.studioCashAtRisk === undefined ? undefined : ensureFiniteNumber(release.studioCashAtRisk),
        productionFundApplied: release.productionFundApplied === undefined ? undefined : ensureFiniteNumber(release.productionFundApplied),
        maxTheatricalWeeks: release.maxTheatricalWeeks === undefined ? undefined : ensureFiniteNumber(release.maxTheatricalWeeks),
        generatedNewsKeys: Array.isArray(release.generatedNewsKeys) ? release.generatedNewsKeys.filter(key => typeof key === 'string') : [],
        projectDetails: normalizeReleaseProjectDetails(release.projectDetails),
        streaming: release.streaming && typeof release.streaming === 'object'
            ? {
                ...release.streaming,
                weekOnPlatform: ensureFiniteNumber(release.streaming.weekOnPlatform, 1),
                totalViews: ensureFiniteNumber(release.streaming.totalViews),
                weeklyViews: ensureMoneyArray(release.streaming.weeklyViews),
                ...(typeof inferStreamingStartWeekAbsolute(release.streaming, nextPlayer.age, nextPlayer.currentWeek) === 'number'
                    ? { startWeekAbsolute: inferStreamingStartWeekAbsolute(release.streaming, nextPlayer.age, nextPlayer.currentWeek) }
                    : {})
            }
            : release.streaming,
        bids: ensureObjectArray(release.bids).map(bid => ({
            ...bid,
            platformId: bid.platformId,
            upfront: ensureFiniteNumber(bid.upfront),
            fundingAmount: bid.fundingAmount === undefined ? undefined : ensureFiniteNumber(bid.fundingAmount),
            royalty: ensureFiniteNumber(bid.royalty),
            duration: ensureFiniteNumber(bid.duration, 52)
        }))
    }) as ActiveRelease);
    nextPlayer.pastProjects = ensureObjectArray<PastProject>(nextPlayer.pastProjects).map(project => ({
        ...project,
        platformProductionFunding: project.platformProductionFunding === undefined ? undefined : ensureFiniteNumber(project.platformProductionFunding),
        studioCashAtRisk: project.studioCashAtRisk === undefined ? undefined : ensureFiniteNumber(project.studioCashAtRisk),
        productionFundApplied: project.productionFundApplied === undefined ? undefined : ensureFiniteNumber(project.productionFundApplied),
        awards: sanitizeAwardRecords(ensureObjectArray<any>((project as any).awards) as any) as any
    }));
    nextPlayer.applications = ensureObjectArray<Application>(nextPlayer.applications).map(app => ({
        ...app,
        weeksRemaining: ensureFiniteNumber(app.weeksRemaining, 1)
    }));
    nextPlayer.activeSponsorships = ensureObjectArray(nextPlayer.activeSponsorships).map((spon: any) => ({
        ...spon,
        weeklyPay: ensureFiniteNumber(spon.weeklyPay),
        durationWeeks: ensureFiniteNumber(spon.durationWeeks),
        weeksCompleted: ensureFiniteNumber(spon.weeksCompleted),
        penalty: ensureFiniteNumber(spon.penalty),
        requirements: {
            ...(spon.requirements || {}),
            progress: ensureFiniteNumber(spon.requirements?.progress),
            totalRequired: ensureFiniteNumber(spon.requirements?.totalRequired, 1),
            energyCost: ensureFiniteNumber(spon.requirements?.energyCost)
        }
    }));
    nextPlayer.inbox = ensureObjectArray<Message>(nextPlayer.inbox);
    nextPlayer.outsideProductions = ensureObjectArray(nextPlayer.outsideProductions);
    nextPlayer.news = ensureObjectArray(nextPlayer.news);
    nextPlayer.relationships = ensureObjectArray(nextPlayer.relationships);
    nextPlayer.scheduledEvents = ensureObjectArray<ScheduledEvent>(nextPlayer.scheduledEvents).map(event => ({
        ...event,
        week: ensureFiniteNumber(event.week, nextPlayer.currentWeek),
        data: event.data && typeof event.data === 'object' ? event.data : {}
    }));
    nextPlayer.awards = sanitizeAwardRecords(ensureObjectArray<any>(nextPlayer.awards) as any);
    nextPlayer.logs = ensureObjectArray(nextPlayer.logs);
    nextPlayer.pendingEvents = ensureObjectArray<ScheduledEvent>(nextPlayer.pendingEvents)
        .map(event => ({
            ...event,
            week: ensureFiniteNumber(event.week, nextPlayer.currentWeek),
            data: event.data && typeof event.data === 'object' ? event.data : {}
        }))
        .filter(event => typeof event.id === 'string' && typeof event.type === 'string');
    const outsideProductionResult = processOutsideProductionsWeek(nextPlayer);
    nextPlayer = outsideProductionResult.player;
    nextPlayer.portfolio = ensureObjectArray(nextPlayer.portfolio).map((holding: any) => ({
        ...holding,
        shares: ensureFiniteNumber(holding.shares)
    })).filter((holding: any) => typeof holding.stockId === 'string' && holding.shares > 0);
    nextPlayer.businesses = ensureObjectArray<Business>(nextPlayer.businesses).map(business => ({
        ...business,
        balance: ensureFiniteNumber((business as any).balance),
        stats: {
            ...((business as any).stats || {}),
            weeklyRevenue: ensureFiniteNumber((business as any).stats?.weeklyRevenue),
            weeklyExpenses: ensureFiniteNumber((business as any).stats?.weeklyExpenses),
            weeklyProfit: ensureFiniteNumber((business as any).stats?.weeklyProfit),
            lifetimeRevenue: ensureFiniteNumber((business as any).stats?.lifetimeRevenue),
            valuation: ensureFiniteNumber((business as any).stats?.valuation),
            studioMomentum: business.type === 'PRODUCTION_HOUSE' ? ensureFiniteNumber((business as any).stats?.studioMomentum, 50) : (business as any).stats?.studioMomentum,
            investorConfidence: business.type === 'PRODUCTION_HOUSE' ? ensureFiniteNumber((business as any).stats?.investorConfidence, 50) : (business as any).stats?.investorConfidence,
            recentHitStreak: business.type === 'PRODUCTION_HOUSE' ? ensureFiniteNumber((business as any).stats?.recentHitStreak, 0) : (business as any).stats?.recentHitStreak,
            recentFlopStreak: business.type === 'PRODUCTION_HOUSE' ? ensureFiniteNumber((business as any).stats?.recentFlopStreak, 0) : (business as any).stats?.recentFlopStreak,
            recentReleaseOutcomes: business.type === 'PRODUCTION_HOUSE' && Array.isArray((business as any).stats?.recentReleaseOutcomes)
                ? (business as any).stats.recentReleaseOutcomes.filter((value: any) => typeof value === 'string')
                : (business.type === 'PRODUCTION_HOUSE' ? [] : (business as any).stats?.recentReleaseOutcomes),
            processedReleaseOutcomeIds: business.type === 'PRODUCTION_HOUSE' && Array.isArray((business as any).stats?.processedReleaseOutcomeIds)
                ? (business as any).stats.processedReleaseOutcomeIds.filter((value: any) => typeof value === 'string')
                : (business.type === 'PRODUCTION_HOUSE' ? [] : (business as any).stats?.processedReleaseOutcomeIds)
        },
        studioState: business.type === 'PRODUCTION_HOUSE' && business.studioState && typeof business.studioState === 'object'
            ? {
                ...business.studioState,
                talentRoster: ensureObjectArray(business.studioState.talentRoster),
                activeProjects: ensureObjectArray((business.studioState as any).activeProjects),
                library: ensureObjectArray((business.studioState as any).library),
                bids: ensureObjectArray((business.studioState as any).bids),
                lockedStreamingFunds: ensureObjectArray((business.studioState as any).lockedStreamingFunds),
                platformRelations: business.studioState.platformRelations && typeof business.studioState.platformRelations === 'object'
                    ? business.studioState.platformRelations
                    : {},
                financeLedger: ensureObjectArray((business.studioState as any).financeLedger)
            }
            : business.studioState
    }));
    if (!nextPlayer.studioMemory || typeof nextPlayer.studioMemory !== 'object') nextPlayer.studioMemory = {} as any;
    if (!nextPlayer.weeklyOpportunities || typeof nextPlayer.weeklyOpportunities !== 'object') nextPlayer.weeklyOpportunities = { auditions: [], jobs: [] };
    if (!Array.isArray(nextPlayer.weeklyOpportunities.auditions)) nextPlayer.weeklyOpportunities.auditions = [];
    if (!Array.isArray(nextPlayer.weeklyOpportunities.jobs)) nextPlayer.weeklyOpportunities.jobs = [];
    if (!nextPlayer.instagram || typeof nextPlayer.instagram !== 'object') nextPlayer.instagram = { handle: '@player', followers: 0, posts: [], feed: [], npcStates: {}, weeklyPostCount: 0, lastPostWeek: 0, aesthetic: 50, authenticity: 55, controversy: 0, fashionInfluence: 10, fanLoyalty: 45 } as any;
    if (!Array.isArray(nextPlayer.instagram.posts)) nextPlayer.instagram.posts = [];
    if (!Array.isArray(nextPlayer.instagram.feed)) nextPlayer.instagram.feed = [];
    if (!nextPlayer.instagram.npcStates || typeof nextPlayer.instagram.npcStates !== 'object') nextPlayer.instagram.npcStates = {};
    if (typeof nextPlayer.instagram.weeklyPostCount !== 'number') nextPlayer.instagram.weeklyPostCount = 0;
    if (typeof nextPlayer.instagram.lastPostWeek !== 'number') nextPlayer.instagram.lastPostWeek = 0;
    if (typeof nextPlayer.instagram.followers !== 'number') nextPlayer.instagram.followers = nextPlayer.stats?.followers || 0;
    if (typeof nextPlayer.instagram.aesthetic !== 'number') nextPlayer.instagram.aesthetic = 50;
    if (typeof nextPlayer.instagram.authenticity !== 'number') nextPlayer.instagram.authenticity = 55;
    if (typeof nextPlayer.instagram.controversy !== 'number') nextPlayer.instagram.controversy = 0;
    if (typeof nextPlayer.instagram.fashionInfluence !== 'number') nextPlayer.instagram.fashionInfluence = 10;
    if (typeof nextPlayer.instagram.fanLoyalty !== 'number') nextPlayer.instagram.fanLoyalty = 45;
    if (!nextPlayer.x || typeof nextPlayer.x !== 'object') nextPlayer.x = { handle: nextPlayer.instagram.handle || '@player', followers: 0, posts: [], feed: [], lastPostWeek: 0 } as any;
    if (!Array.isArray(nextPlayer.x.posts)) nextPlayer.x.posts = [];
    if (!Array.isArray(nextPlayer.x.feed)) nextPlayer.x.feed = [];
    if (typeof nextPlayer.x.followers !== 'number') nextPlayer.x.followers = 0;
    if (typeof nextPlayer.x.lastPostWeek !== 'number') nextPlayer.x.lastPostWeek = 0;
    if (!nextPlayer.youtube || typeof nextPlayer.youtube !== 'object') nextPlayer.youtube = { handle: nextPlayer.instagram.handle || '@player', subscribers: 0, videos: [], lifetimeEarnings: 0, isMonetized: false, bannerColor: 'bg-gradient-to-r from-red-900 to-zinc-900', totalChannelViews: 0, activeCollabs: [], activeBrandDeals: [], audienceTrust: 55, fanMood: 55, controversy: 0, membershipsActive: false, members: 0, lastLivestreamWeek: 0, lastMerchDropWeek: 0, creatorIdentity: 'ACTOR_VLOGGER', lastIdentityChangeWeek: 0 } as any;
    nextPlayer.youtube.videos = ensureObjectArray(nextPlayer.youtube.videos).map((video: any) => ({
        ...video,
        views: ensureFiniteNumber(video.views),
        likes: ensureFiniteNumber(video.likes),
        earnings: ensureFiniteNumber(video.earnings),
        weekUploaded: ensureFiniteNumber(video.weekUploaded, nextPlayer.currentWeek),
        yearUploaded: ensureFiniteNumber(video.yearUploaded, nextPlayer.age),
        qualityScore: ensureFiniteNumber(video.qualityScore, 50),
        controversyScore: ensureFiniteNumber(video.controversyScore, 0),
        trustImpact: ensureFiniteNumber(video.trustImpact, 0),
        weeklyHistory: Array.isArray(video.weeklyHistory) ? video.weeklyHistory.map((value: any) => ensureFiniteNumber(value)) : [],
        comments: Array.isArray(video.comments) ? video.comments.filter((comment: any) => typeof comment === 'string') : []
    }));
    if (typeof nextPlayer.youtube.subscribers !== 'number') nextPlayer.youtube.subscribers = 0;
    if (typeof nextPlayer.youtube.lifetimeEarnings !== 'number') nextPlayer.youtube.lifetimeEarnings = 0;
    if (typeof nextPlayer.youtube.isMonetized !== 'boolean') nextPlayer.youtube.isMonetized = false;
    if (typeof nextPlayer.youtube.totalChannelViews !== 'number') nextPlayer.youtube.totalChannelViews = 0;
    if (!nextPlayer.youtube.bannerColor) nextPlayer.youtube.bannerColor = 'bg-gradient-to-r from-red-900 to-zinc-900';
    nextPlayer.youtube.activeCollabs = ensureObjectArray(nextPlayer.youtube.activeCollabs);
    nextPlayer.youtube.activeBrandDeals = ensureObjectArray(nextPlayer.youtube.activeBrandDeals);
    if (typeof nextPlayer.youtube.audienceTrust !== 'number') nextPlayer.youtube.audienceTrust = 55;
    if (typeof nextPlayer.youtube.fanMood !== 'number') nextPlayer.youtube.fanMood = 55;
    if (typeof nextPlayer.youtube.controversy !== 'number') nextPlayer.youtube.controversy = 0;
    if (typeof nextPlayer.youtube.membershipsActive !== 'boolean') nextPlayer.youtube.membershipsActive = false;
    if (typeof nextPlayer.youtube.members !== 'number') nextPlayer.youtube.members = 0;
    if (typeof nextPlayer.youtube.lastLivestreamWeek !== 'number') nextPlayer.youtube.lastLivestreamWeek = 0;
    if (typeof nextPlayer.youtube.lastMerchDropWeek !== 'number') nextPlayer.youtube.lastMerchDropWeek = 0;
    if (!nextPlayer.youtube.creatorIdentity) nextPlayer.youtube.creatorIdentity = 'ACTOR_VLOGGER';
    if (typeof nextPlayer.youtube.lastIdentityChangeWeek !== 'number') nextPlayer.youtube.lastIdentityChangeWeek = 0;
    nextPlayer.instagram.posts = ensureObjectArray(nextPlayer.instagram.posts);
    nextPlayer.instagram.feed = ensureObjectArray(nextPlayer.instagram.feed);
    nextPlayer.x.posts = ensureObjectArray(nextPlayer.x.posts);
    nextPlayer.x.feed = ensureObjectArray(nextPlayer.x.feed);
    if (!nextPlayer.world.platforms || typeof nextPlayer.world.platforms !== 'object') nextPlayer.world.platforms = {} as any;
    if (!Array.isArray(nextPlayer.flags.pendingFeedback)) nextPlayer.flags.pendingFeedback = [];
    nextPlayer.flags.pendingFeedback = ensureObjectArray(nextPlayer.flags.pendingFeedback);
    if (!Array.isArray(nextPlayer.flags.activeCases)) nextPlayer.flags.activeCases = [];
    nextPlayer.flags.activeCases = ensureObjectArray(nextPlayer.flags.activeCases);

    // Ensure Youtube Init
    if (!nextPlayer.youtube.totalChannelViews) nextPlayer.youtube.totalChannelViews = nextPlayer.youtube.videos.reduce((a,b) => a + b.views, 0);

    // RESET TEAM CHANGE FLAGS
    nextPlayer.flags.teamChangeLocked = false; 
    emitLoopStage('state_normalized');

    // --- DEBT CHECK ---
    if (nextPlayer.money < 0) {
        const currentDebtWeeks = nextPlayer.flags.weeksInDebt || 0;
        nextPlayer.flags.weeksInDebt = currentDebtWeeks + 1;
    } else {
        nextPlayer.flags.weeksInDebt = 0;
    }

    const logsToAdd: {msg: string, type: 'positive'|'negative'|'neutral'}[] = [];
    const addCastingFeedbackMessage = (
        projectName: string,
        stage: 'APPLICATION' | 'AUDITION',
        feedback: { summary: string; reasons: string[]; hint: string }
    ) => {
        nextPlayer.inbox.unshift({
            id: `casting_feedback_${Date.now()}_${Math.random()}`,
            sender: t(language, 'services.role.rejection.inbox.sender'),
            subject: t(language, 'services.role.rejection.inbox.subject', { projectName }),
            text: formatRoleRejectionReview(projectName, stage, feedback, language),
            type: 'CASTING_FEEDBACK',
            isRead: false,
            weekSent: nextPlayer.currentWeek,
            expiresIn: 8
        });
    };

    // --- 0.5 INBOX MAINTENANCE ---
    nextPlayer.inbox = nextPlayer.inbox.reduce<Message[]>((messages, msg) => {
        if (msg.isExpired) {
            const noticeWeeks = Math.max(0, Number(msg.expiredNoticeWeeks ?? 1) - 1);
            if (noticeWeeks > 0) {
                messages.push({ ...msg, expiredNoticeWeeks: noticeWeeks });
            }
            return messages;
        }

        if (msg.expiresIn !== undefined) {
            const expiresIn = Number(msg.expiresIn) - 1;
            if (expiresIn <= 0) {
                logsToAdd.push({ msg: `⚠️ Offer expired: "${msg.subject}"`, type: 'neutral' });
                messages.push({
                    ...msg,
                    isExpired: true,
                    isRead: false,
                    expiresIn: undefined,
                    expiredAtWeek: nextPlayer.currentWeek,
                    expiredNoticeWeeks: 2,
                    text: `Expired offer. ${msg.text || 'This opportunity is no longer available.'}`,
                });
                return messages;
            }
            messages.push({ ...msg, expiresIn });
            return messages;
        }

        messages.push(msg);
        return messages;
    }, []);

    const friendFavorAbsWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const friendFavorRequest = buildFriendFavorRequest(nextPlayer, friendFavorAbsWeek);
    if (friendFavorRequest) {
        nextPlayer.inbox.unshift(friendFavorRequest);
        nextPlayer.flags.lastFriendFavorAbsWeek = friendFavorAbsWeek;
        logsToAdd.push({ msg: `New friend favor request from ${friendFavorRequest.sender}.`, type: 'neutral' });
    }
    
    // Transaction Helper
    const addTransaction = (amount: number, category: TransactionCategory, description: string) => {
        const safeAmount = Math.trunc(ensureFiniteNumber(amount));
        if (safeAmount === 0) return;
        nextPlayer.money = ensureFiniteNumber(nextPlayer.money) + safeAmount;
        nextPlayer.finance.history.unshift({
            id: `tx_${Date.now()}_${Math.random()}`,
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            amount: safeAmount,
            category,
            description
        });
        if (nextPlayer.finance.history.length > 200) nextPlayer.finance.history.pop();
    };

    // --- 0.55 PERSONAL LOANS ---
    nextPlayer.finance.loans = nextPlayer.finance.loans.map((loan) => {
        if (loan.status !== 'ACTIVE') return loan;

        const interestDue = Math.max(0, Math.round(loan.principal * (loan.annualInterestRate / 52)));
        const scheduledPayment = Math.max(loan.weeklyPayment, interestDue + 1);

        if (nextPlayer.money >= scheduledPayment) {
            addTransaction(-scheduledPayment, 'LOAN', `${loan.lenderName} weekly loan payment`);
            const principalPaid = Math.max(0, scheduledPayment - interestDue);
            const newPrincipal = Math.max(0, loan.principal - principalPaid);
            const weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
            nextPlayer.finance.credit.successfulPayments += 1;
            nextPlayer.finance.credit.totalRepaid += scheduledPayment;

            if (newPrincipal <= 0 || weeksRemaining === 0) {
                logsToAdd.push({ msg: `🏦 Loan fully repaid with ${loan.lenderName}. Your credit standing improves.`, type: 'positive' });
                return {
                    ...loan,
                    principal: 0,
                    weeksRemaining: 0,
                    successfulPayments: loan.successfulPayments + 1,
                    status: 'PAID'
                };
            }

            return {
                ...loan,
                principal: newPrincipal,
                weeksRemaining,
                successfulPayments: loan.successfulPayments + 1
            };
        }

        const lateFee = Math.max(1000, Math.round(loan.originalPrincipal * 0.01));
        const penalizedPrincipal = loan.principal + interestDue + lateFee;
        const missedPayments = loan.missedPayments + 1;
        nextPlayer.finance.credit.missedPayments += 1;
        nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 2);
        nextPlayer.stats.happiness = Math.max(0, nextPlayer.stats.happiness - 3);
        logsToAdd.push({ msg: `⚠️ Missed a loan payment to ${loan.lenderName}. Late fee added.`, type: 'negative' });

        if (missedPayments >= 3) {
            nextPlayer.finance.credit.defaults += 1;
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 8);
            logsToAdd.push({ msg: `🚨 ${loan.lenderName} marked your loan in default. Future borrowing will be much harder.`, type: 'negative' });
            return {
                ...loan,
                principal: penalizedPrincipal,
                missedPayments,
                status: 'DEFAULTED'
            };
        }

        return {
            ...loan,
            principal: penalizedPrincipal,
            missedPayments
        };
    });

    // --- 0.56 FAMILY SUPPORT OBLIGATIONS ---
    (nextPlayer.flags.familyObligations as FamilyObligation[]) = (nextPlayer.flags.familyObligations as FamilyObligation[]).map(obligation => {
        if (!obligation.active) return obligation;

        const couldCover = nextPlayer.money >= obligation.weeklyAmount;
        const label = obligation.type === 'ALIMONY'
            ? `Alimony payment to ${obligation.targetName}`
            : `Child support for ${obligation.targetName}`;

        addTransaction(-obligation.weeklyAmount, 'EXPENSE', label);

        if (!couldCover) {
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 2);
            nextPlayer.stats.happiness = Math.max(0, nextPlayer.stats.happiness - 2);
            logsToAdd.push({
                msg: `⚠️ ${label} pushed you deeper into the red this week.`,
                type: 'negative'
            });

            if (nextPlayer.stats.fame > 35 && Math.random() < 0.3) {
                nextPlayer.news.unshift({
                    id: `news_support_missed_${Date.now()}_${Math.random()}`,
                    headline: `${nextPlayer.name} under fire over missed family support`,
                    subtext: `${obligation.targetName}'s situation is becoming a public scandal as support trouble deepens.`,
                    category: 'TOP_STORY',
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    impactLevel: 'MEDIUM'
                });
                nextPlayer.news = nextPlayer.news.slice(0, 50);
            }
        }

        return obligation;
    });

    const familyDramaResult = processFamilyDramaWeek(nextPlayer);
    nextPlayer = familyDramaResult.player;
    familyDramaResult.logs.forEach(log => logsToAdd.push(log));

    // --- 0.6 CHECK FOR SCHEDULED EVENTS ---
    const eventsToday = nextPlayer.scheduledEvents.filter(e => e.week === nextPlayer.currentWeek);
    if (eventsToday.length > 0) {
        nextPlayer.scheduledEvents = nextPlayer.scheduledEvents.filter(e => e.week !== nextPlayer.currentWeek);
        eventsToday.forEach(eventToday => {
            if (eventToday.type === 'AWARD_CEREMONY') {
                const cleanedAwardEvent = sanitizeAwardCeremonyEvent(eventToday);
                const nominations = cleanedAwardEvent.data?.nominations || [];
                if (nominations.length > 0) {
                    nextPlayer.pendingEvent = cleanedAwardEvent;
                    logsToAdd.push({ msg: `📅 Today is the day: ${cleanedAwardEvent.title}. Good luck!`, type: 'neutral' });
                } else {
                    logsToAdd.push({ msg: `📺 ${cleanedAwardEvent.title} is airing tonight. You are watching from home.`, type: 'neutral' });
                }
            } else if (['LIFE_EVENT', 'LEGAL_HEARING', 'SCANDAL', 'UNDERWORLD_OFFER'].includes(eventToday.type)) {
                if (!nextPlayer.pendingEvents) nextPlayer.pendingEvents = [];
                nextPlayer.pendingEvents.push(eventToday);
                logsToAdd.push({ msg: `📅 Event: ${eventToday.title}`, type: 'neutral' });
            } else {
                nextPlayer.pendingEvent = eventToday;
                logsToAdd.push({ msg: `📅 Event: ${eventToday.title}`, type: 'neutral' });
            }
        });
    }

    const pendingUniversePayouts: { universeId: string; studioId: string; label: string; amount: number }[] = [];

    // --- 1. WORLD & INDUSTRY UPDATE ---
    emitLoopStage('world_industry_start');
    try {
        emitLoopStage('world_turn_start');
        const worldResult = processWorldTurn(nextPlayer);
        nextPlayer.world = worldResult.world;
        nextPlayer.news = [...worldResult.news, ...nextPlayer.news].slice(0, 50);
        if (worldResult.socialPosts.length > 0) {
            nextPlayer.x.feed = [...worldResult.socialPosts, ...(nextPlayer.x.feed || [])].slice(0, 80);
        }
        if (worldResult.logs?.length) {
            worldResult.logs.forEach(message => logsToAdd.push({ msg: `🏢 ${message}`, type: 'neutral' }));
        }
        emitLoopStage('world_turn_done', { world_news: worldResult.news?.length || 0 });

        emitLoopStage('music_industry_start');
        const musicResult = processMusicIndustryWeek(nextPlayer);
        nextPlayer.world = musicResult.world;
        if (musicResult.news.length > 0) {
            nextPlayer.news = [...musicResult.news, ...nextPlayer.news].slice(0, 50);
        }
        if (musicResult.news.length > 0) {
            const latestMusicRelease = musicResult.world.musicIndustry?.recentReleases?.[0];
            const latestRivalry = musicResult.world.musicIndustry?.rivalries?.[0];
            const latestScandal = musicResult.world.musicIndustry?.scandals?.[0];
            const musicSocialPosts: XPost[] = musicResult.news.slice(0, 2).map((item, index) => {
                const isScandal = latestScandal && item.id === latestScandal.id;
                const isRivalry = /rivalry/i.test(item.headline);
                const reach = latestMusicRelease?.youtubeViews || latestMusicRelease?.followerGain || 50000;
                return {
                    id: `x_music_world_${item.id}_${index}`,
                    authorId: isScandal ? 'music_watch' : isRivalry ? 'chart_fans' : 'soundtrack_pulse',
                    authorName: isScandal ? 'Music Watch' : isRivalry ? 'Chart Fans' : 'Soundtrack Pulse',
                    authorHandle: isScandal ? '@musicwatch' : isRivalry ? '@chartfans' : '@soundtrackpulse',
                    authorAvatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(item.headline)}`,
                    content: isScandal
                        ? `${latestScandal?.artistName || 'An artist'} is trending for the wrong reasons. Music Twitter is already dissecting the rollout.`
                        : isRivalry
                            ? `${latestRivalry?.artistNames?.join(' vs ') || 'Two fanbases'} just turned the chart into a fight. Numbers, clips, receipts, everything.`
                            : `${latestMusicRelease?.artistName || 'An artist'} has a new music moment moving through YouTube and social: "${latestMusicRelease?.songTitle || item.headline}".`,
                    timestamp: Date.now() - index * 5000,
                    likes: Math.max(40, Math.floor(reach * 0.012)),
                    retweets: Math.max(8, Math.floor(reach * 0.0025)),
                    replies: Math.max(3, Math.floor(reach * 0.0014)),
                    isPlayer: false,
                    isLiked: false,
                    isRetweeted: false,
                    isVerified: true,
                    postType: 'FILM_OPINION',
                    sentiment: isScandal ? 'MESSY' : isRivalry ? 'INDUSTRY' : 'SUPPORTIVE'
                };
            });
            if (musicSocialPosts.length) {
                nextPlayer.x.feed = [...musicSocialPosts, ...(nextPlayer.x.feed || [])].slice(0, 80);
            }
        }
        // Music-world releases and chart movement already feed News and social.
        // Keep the player live feed for personal career events.
        if (musicResult.artistEarnings?.length) {
            nextPlayer = applyMusicArtistNpcEarnings(nextPlayer, musicResult.artistEarnings);
        }
        if (musicResult.newArtists?.length) {
            const extraNPCs = Array.isArray(nextPlayer.flags.extraNPCs) ? nextPlayer.flags.extraNPCs : [];
            const debutNPCs = musicResult.newArtists
                .map(artist => createNPCFromMusicArtist(artist))
                .filter(npc => !NPC_DATABASE.some(existing => existing.id === npc.id) && !extraNPCs.some(existing => existing.id === npc.id));
            if (debutNPCs.length) {
                nextPlayer.flags.extraNPCs = [...extraNPCs, ...debutNPCs].slice(-240);
            }
        }
        emitLoopStage('music_industry_done', {
            music_news: musicResult.news?.length || 0,
            new_artists: musicResult.newArtists?.length || 0,
        });

        emitLoopStage('universe_payouts_start');
        Object.values(nextPlayer.world.universes || {}).forEach((universe: any) => {
            if (!universe?.studioId) return;
            const releaseActivity = getUniverseReleaseActivity(nextPlayer, universe, nextPlayer.activeReleases || []);
            if (releaseActivity.multiplier <= 0) return;
            const weeklyUniverseRevenue = ensureFiniteNumber(universe.stats?.weeklyRevenue);
            if (weeklyUniverseRevenue <= 0) return;

            const ownerStudio = nextPlayer.businesses?.find(b => b.id === universe.studioId);
            if (!ownerStudio) return;

            pendingUniversePayouts.push({
                universeId: String(universe.id),
                studioId: String(universe.studioId),
                amount: weeklyUniverseRevenue,
                label: `${universe.name} merch & licensing`
            });
        });
        emitLoopStage('universe_payouts_done', { pending_universe_payouts: pendingUniversePayouts.length });
    } catch (error) {
        console.error('World turn failed during week processing:', error);
    }
    emitLoopStage('world_industry_done', {
        pending_universe_payouts: pendingUniversePayouts.length,
    });
    await yieldWeekProcessingFrame();

    // --- 2. STOCK MARKET UPDATE ---
    emitLoopStage('markets_start');
    const marketUpdate = processStockMarket(nextPlayer.stocks, nextPlayer.currentWeek, nextPlayer);
    nextPlayer.stocks = marketUpdate.stocks;
    if (marketUpdate.news.length > 0) {
        nextPlayer.news = [
            ...marketUpdate.news,
            ...(nextPlayer.news || []).filter(existing => !marketUpdate.news.some(item => item.id === existing.id)),
        ].slice(0, 80);
    }
    marketUpdate.notifications.forEach(notification => {
        logsToAdd.push({ msg: `📈 ${notification}`, type: 'neutral' });
    });
    
    // Calculate Dividends
    const dividends = getDividendPayout(nextPlayer.portfolio, nextPlayer.stocks, nextPlayer.currentWeek, nextPlayer);
    if (dividends > 0) {
        addTransaction(dividends, 'DIVIDEND', 'Stock Dividends');
        logsToAdd.push({ msg: `💰 Stock Dividends Received: $${dividends.toLocaleString()}`, type: 'positive' });
    }

    const privateEquityUpdate = processPrivateEquityWeek(nextPlayer);
    nextPlayer = privateEquityUpdate.player;
    privateEquityUpdate.events.forEach(event => {
        if (event.type === 'DISTRIBUTION' && event.amount) {
            addTransaction(event.amount, 'DIVIDEND', `Private distribution: ${event.studioName}`);
        }
        logsToAdd.push({ msg: event.message, type: event.tone });
    });

    nextPlayer = processShareholderVoting(nextPlayer);
    nextPlayer = processStockTakeoverEvents(nextPlayer);
    nextPlayer = processAcquisitionDebtService(nextPlayer).player;
    nextPlayer = processRegulatorPressure(nextPlayer);
    nextPlayer = processWorldReactions(nextPlayer);
    nextPlayer = processRivalRetaliation(nextPlayer);
    nextPlayer = processTalentInstability(nextPlayer);
    nextPlayer = processAcquisitionMarketPulse(nextPlayer);
    nextPlayer = processStudioSaleRoyalties(nextPlayer);
    emitLoopStage('markets_done', {
        stocks: nextPlayer.stocks?.length || 0,
        portfolio: nextPlayer.portfolio?.length || 0,
    });

    // --- 3. YOUTUBE & TALENT SIMULATION ---
    emitLoopStage('creator_talent_start');
    try {
        const identityTuning = getYoutubeIdentityTuning(nextPlayer.youtube?.creatorIdentity);
        const ytResult = processYoutubeChannel(nextPlayer);
        nextPlayer.youtube = ytResult.channel;
        const recentVideo = nextPlayer.youtube.videos?.[0];
        const trustDrift = recentVideo ? Math.sign(ensureFiniteNumber(recentVideo.trustImpact, 0)) : 0;
        nextPlayer.youtube.audienceTrust = Math.max(0, Math.min(100, ensureFiniteNumber(nextPlayer.youtube.audienceTrust, 55) + trustDrift + identityTuning.trustDrift));
        nextPlayer.youtube.fanMood = Math.max(0, Math.min(100, ensureFiniteNumber(nextPlayer.youtube.fanMood, 55) - 1 + (ytResult.newSubs > 0 ? 1 : 0) + identityTuning.moodDrift));
        nextPlayer.youtube.controversy = Math.max(0, Math.min(100, ensureFiniteNumber(nextPlayer.youtube.controversy, 0) - 2 + (recentVideo?.uploadPlan === 'VIRAL_BAIT' ? 1 : 0) + identityTuning.heatDrift));
        
        if (ytResult.weeklyRevenue > 0) {
            addTransaction(Math.floor(ytResult.weeklyRevenue), 'BUSINESS', t(language, 'services.gameLoop.youtubeWeekly.finance.adRevenue'));
            if (ytResult.weeklyRevenue > 100) {
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeWeekly.log.earnings', {
                        amount: `$${Math.floor(ytResult.weeklyRevenue).toLocaleString()}`
                    }),
                    type: 'positive'
                });
            }
        }
        ytResult.notifications.forEach(note => logsToAdd.push({ msg: note, type: 'positive' }));

        if (nextPlayer.youtube.membershipsActive) {
            const trust = ensureFiniteNumber(nextPlayer.youtube.audienceTrust, 55);
            const mood = ensureFiniteNumber(nextPlayer.youtube.fanMood, 55);
            const controversy = ensureFiniteNumber(nextPlayer.youtube.controversy, 0);
            const memberMultiplier = Math.max(0.35, 1 + identityTuning.memberBoost);
            const targetMembers = Math.max(0, Math.floor(nextPlayer.youtube.subscribers * (0.006 + (trust / 10000) + (mood / 14000) - (controversy / 16000)) * memberMultiplier));
            const currentMembers = ensureFiniteNumber(nextPlayer.youtube.members, 0);
            const nextMembers = Math.max(0, Math.floor((currentMembers * 0.82) + (targetMembers * 0.18)));
            const memberRevenue = Math.floor(nextMembers * 4);
            nextPlayer.youtube.members = nextMembers;
            if (memberRevenue > 0) {
                addTransaction(memberRevenue, 'BUSINESS', t(language, 'services.gameLoop.youtubeWeekly.finance.memberships'));
                nextPlayer.youtube.lifetimeEarnings += memberRevenue;
                if (memberRevenue >= 500) {
                    logsToAdd.push({
                        msg: t(language, 'services.gameLoop.youtubeWeekly.log.memberships', {
                            amount: `$${memberRevenue.toLocaleString()}`
                        }),
                        type: 'positive'
                    });
                }
            }
        }

        const unlockedMilestones = nextPlayer.flags.youtubeMilestonesUnlocked as string[];
        const youtubeMilestones = [
            {
                id: 'subs_10000',
                reached: nextPlayer.youtube.subscribers >= 10000,
                titleKey: 'services.gameLoop.youtubeWeekly.milestone.subs10000.title',
                headlineKey: 'services.gameLoop.youtubeWeekly.milestone.subs10000.headline',
                reward: () => {
                    nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 1);
                    nextPlayer.youtube.fanMood = Math.min(100, (nextPlayer.youtube.fanMood ?? 55) + 4);
                }
            },
            {
                id: 'views_1000000',
                reached: nextPlayer.youtube.totalChannelViews >= 1000000,
                titleKey: 'services.gameLoop.youtubeWeekly.milestone.views1000000.title',
                headlineKey: 'services.gameLoop.youtubeWeekly.milestone.views1000000.headline',
                reward: () => {
                    nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 2);
                    nextPlayer.youtube.audienceTrust = Math.min(100, (nextPlayer.youtube.audienceTrust ?? 55) + 4);
                }
            },
            {
                id: 'subs_100000',
                reached: nextPlayer.youtube.subscribers >= 100000,
                titleKey: 'services.gameLoop.youtubeWeekly.milestone.subs100000.title',
                headlineKey: 'services.gameLoop.youtubeWeekly.milestone.subs100000.headline',
                reward: () => {
                    nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 3);
                    nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 3);
                    nextPlayer.youtube.fanMood = Math.min(100, (nextPlayer.youtube.fanMood ?? 55) + 8);
                }
            },
            {
                id: 'subs_1000000',
                reached: nextPlayer.youtube.subscribers >= 1000000,
                titleKey: 'services.gameLoop.youtubeWeekly.milestone.subs1000000.title',
                headlineKey: 'services.gameLoop.youtubeWeekly.milestone.subs1000000.headline',
                reward: () => {
                    nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 6);
                    nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 4);
                    nextPlayer.youtube.audienceTrust = Math.min(100, (nextPlayer.youtube.audienceTrust ?? 55) + 8);
                }
            }
        ];

        youtubeMilestones.forEach(milestone => {
            if (!milestone.reached || unlockedMilestones.includes(milestone.id)) return;
            unlockedMilestones.push(milestone.id);
            milestone.reward();
            const milestoneTitle = t(language, milestone.titleKey);
            const milestoneHeadline = t(language, milestone.headlineKey, { playerName: nextPlayer.name });
            nextPlayer.inbox.unshift({
                id: `yt_milestone_${milestone.id}_${Date.now()}`,
                sender: t(language, 'services.gameLoop.youtubeWeekly.milestone.sender'),
                subject: milestoneTitle,
                text: t(language, 'services.gameLoop.youtubeWeekly.milestone.text', { headline: milestoneHeadline }),
                type: 'SYSTEM',
                isRead: false,
                weekSent: nextPlayer.currentWeek,
                expiresIn: 8
            });
            nextPlayer.news.unshift({
                id: `news_yt_milestone_${milestone.id}_${Date.now()}`,
                headline: milestoneHeadline,
                subtext: t(language, 'services.gameLoop.youtubeWeekly.milestone.newsSubtext'),
                category: 'YOU',
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                impactLevel: milestone.id.includes('1000000') || milestone.id.includes('100000') ? 'HIGH' : 'MEDIUM'
            });
            logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeWeekly.log.milestone', { title: milestoneTitle }), type: 'positive' });
        });

        const creatorInviteCooldown = nextPlayer.youtube.subscribers >= 100000 ? 6 : 8;
        const lastCreatorInviteAbs = ensureFiniteNumber(nextPlayer.flags.lastYoutubeCreatorInviteAbsWeek, 0);
        const currentCreatorAbs = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
        if (
            nextPlayer.youtube.subscribers >= 25000 &&
            currentCreatorAbs - lastCreatorInviteAbs >= creatorInviteCooldown &&
            Math.random() < 0.28
        ) {
            const inviteKind = nextPlayer.youtube.subscribers >= 250000
                ? (Math.random() < 0.45 ? 'PLATFORM_SUMMIT' : Math.random() < 0.7 ? 'CREATOR_GALA' : 'PODCAST')
                : (Math.random() < 0.65 ? 'PODCAST' : 'CREATOR_GALA');
            nextPlayer.pendingEvents.push(createYoutubeCreatorInviteEvent(nextPlayer, inviteKind as 'PODCAST' | 'CREATOR_GALA' | 'PLATFORM_SUMMIT'));
            nextPlayer.flags.lastYoutubeCreatorInviteAbsWeek = currentCreatorAbs;
            logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeWeekly.log.creatorInvite'), type: 'positive' });
        }
    } catch (error) {
        console.error('YouTube processing failed during week processing:', error);
    }

    try {
        const lastYoutubeEventAbs = ensureFiniteNumber(nextPlayer.flags.lastYoutubeEventAbsWeek, 0);
        const currentAbs = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
        const channelVideos = nextPlayer.youtube.videos || [];
        const cooldown = getYoutubeEventCooldown(nextPlayer);
        const identityTuning = getYoutubeIdentityTuning(nextPlayer.youtube?.creatorIdentity);
        const subscriberCount = Math.max(0, ensureFiniteNumber(nextPlayer.youtube.subscribers, 0));
        const hasAudienceForCreatorEvent = subscriberCount >= 1000;

        const earlyChannelEventChance = Math.max(0.42, Math.min(0.68, 0.42 + channelVideos.length * 0.025 + subscriberCount / 5000));

        if (!hasAudienceForCreatorEvent && channelVideos.length > 0 && currentAbs - lastYoutubeEventAbs >= 3 && Math.random() < earlyChannelEventChance) {
            const recentVideos = channelVideos.slice(0, Math.min(channelVideos.length, 4));
            const pickedVideo = recentVideos[Math.floor(Math.random() * recentVideos.length)];
            const audienceTrust = ensureFiniteNumber(nextPlayer.youtube.audienceTrust, 55);
            const fanMood = ensureFiniteNumber(nextPlayer.youtube.fanMood, 55);
            const quality = ensureFiniteNumber(pickedVideo.qualityScore, 50);
            const microRoll = Math.random();
            const baseViews = Math.max(10, Math.floor(14 + subscriberCount * (0.08 + Math.random() * 0.16) + quality / 6));
            const title = pickedVideo.title || t(language, 'services.gameLoop.youtubeEarly.fallbackTitle');
            const formatEarlySubText = (count: number, variant: 'new' | 'plain' | 'loyal' | 'lost') => {
                if (count <= 0) return '';
                return t(language, `services.gameLoop.youtubeEarly.subText.${variant}.${count === 1 ? 'one' : 'other'}`, { subs: String(count) });
            };

            if (microRoll < 0.24) {
                const bonusViews = Math.min(180, baseViews + Math.floor(Math.random() * 35));
                const bonusSubs = subscriberCount < 35
                    ? (Math.random() < 0.7 ? 1 : 0)
                    : Math.min(8, Math.max(1, Math.floor(bonusViews / 28)));
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.08));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [
                    t(language, 'services.gameLoop.youtubeEarly.comment.smallFound'),
                    t(language, 'services.gameLoop.youtubeEarly.comment.deservesMore'),
                    ...(pickedVideo.comments || [])
                ].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 2);
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeEarly.log.smallMoment', {
                        title,
                        views: bonusViews.toLocaleString(),
                        subText: formatEarlySubText(bonusSubs, 'new')
                    }),
                    type: 'positive'
                });
            } else if (microRoll < 0.42) {
                const bonusViews = Math.min(140, Math.max(8, Math.floor(baseViews * 0.9)));
                const bonusSubs = subscriberCount >= 75 ? Math.min(6, Math.max(1, Math.floor(bonusViews / 34))) : (Math.random() < 0.45 ? 1 : 0);
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.06));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [t(language, 'services.gameLoop.youtubeEarly.comment.tinyRepost'), ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.audienceTrust = Math.min(100, audienceTrust + 1);
                if (nextPlayer.x.followers >= 25) {
                    nextPlayer.x.feed.unshift({
                        id: `x_yt_tiny_share_${Date.now()}`,
                        authorId: 'small_creator_circle',
                        authorName: 'Small Creator Circle',
                        authorHandle: '@smallcreatorcircle',
                        authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=SmallCreatorCircle',
                        content: t(language, 'services.gameLoop.youtubeEarly.social.tinyShare', { title, playerName: nextPlayer.name }),
                        timestamp: Date.now(),
                        likes: Math.max(1, Math.floor(bonusViews * 0.08)),
                        retweets: Math.max(0, Math.floor(bonusViews * 0.02)),
                        replies: Math.max(0, Math.floor(bonusViews * 0.01)),
                        isPlayer: false,
                        isLiked: false,
                        isRetweeted: false,
                        isVerified: false
                    });
                    nextPlayer.x.feed = nextPlayer.x.feed.slice(0, 50);
                }
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeEarly.log.tinyShare', {
                        title,
                        views: bonusViews.toLocaleString(),
                        subText: formatEarlySubText(bonusSubs, 'plain')
                    }),
                    type: 'positive'
                });
            } else if (microRoll < 0.58) {
                const bonusViews = Math.min(220, Math.max(15, Math.floor(baseViews * (1.2 + Math.random() * 0.5))));
                const bonusSubs = Math.min(10, Math.max(1, Math.floor(bonusViews / 30)));
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(2, Math.floor(bonusViews * 0.09));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [
                    t(language, 'services.gameLoop.youtubeEarly.comment.clipBestPart'),
                    t(language, 'services.gameLoop.youtubeEarly.comment.shortVersion'),
                    ...(pickedVideo.comments || [])
                ].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 3);
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeEarly.log.clipLift', {
                        title,
                        views: bonusViews.toLocaleString(),
                        subText: formatEarlySubText(bonusSubs, 'new')
                    }),
                    type: 'positive'
                });
            } else if (microRoll < 0.72) {
                const bonusViews = Math.min(110, Math.max(10, Math.floor(baseViews * 0.75)));
                const bonusSubs = Math.random() < 0.65 ? Math.min(4, Math.max(1, Math.floor(bonusViews / 40))) : 0;
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.07));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [
                    t(language, 'services.gameLoop.youtubeEarly.comment.thumbnailClick'),
                    t(language, 'services.gameLoop.youtubeEarly.comment.thumbnailBetter'),
                    ...(pickedVideo.comments || [])
                ].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.audienceTrust = Math.min(100, audienceTrust + 2);
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeEarly.log.betterPackaging', {
                        title,
                        views: bonusViews.toLocaleString(),
                        subText: formatEarlySubText(bonusSubs, 'plain')
                    }),
                    type: 'positive'
                });
            } else if (microRoll < 0.86) {
                const bonusViews = Math.min(90, Math.max(8, Math.floor(baseViews * 0.6)));
                const bonusSubs = Math.random() < 0.5 ? 1 : 0;
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.05));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [t(language, 'services.gameLoop.youtubeEarly.comment.consistentUpload'), ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 1);
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeEarly.log.consistency', {
                        title,
                        views: bonusViews.toLocaleString(),
                        subText: formatEarlySubText(bonusSubs, 'loyal')
                    }),
                    type: 'positive'
                });
            } else {
                const lostSubs = subscriberCount > 8 && Math.random() < 0.45 ? Math.min(2, Math.floor(subscriberCount * 0.04)) : 0;
                nextPlayer.youtube.subscribers = Math.max(0, nextPlayer.youtube.subscribers - lostSubs);
                nextPlayer.youtube.audienceTrust = Math.max(0, audienceTrust - 1);
                nextPlayer.youtube.fanMood = Math.max(0, fanMood - 1);
                pickedVideo.comments = [t(language, 'services.gameLoop.youtubeEarly.comment.roughPacing'), ...(pickedVideo.comments || [])].slice(0, 5);
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeEarly.log.feedback', {
                        title,
                        ending: lostSubs > 0
                            ? formatEarlySubText(lostSubs, 'lost')
                            : t(language, 'services.gameLoop.youtubeEarly.subText.learned')
                    }),
                    type: lostSubs > 0 ? 'negative' : 'neutral'
                });
            }

            nextPlayer.flags.lastYoutubeEventAbsWeek = currentAbs;
        }

        if (hasAudienceForCreatorEvent && channelVideos.length > 0 && currentAbs - lastYoutubeEventAbs >= cooldown && Math.random() < Math.max(0.18, Math.min(0.58, 0.38 + identityTuning.eventChance))) {
            const recentVideos = channelVideos.slice(0, Math.min(channelVideos.length, 6));
            const pickedVideo = recentVideos[Math.floor(Math.random() * recentVideos.length)];
            const quality = ensureFiniteNumber(pickedVideo.qualityScore, 50);
            const subscriberBase = subscriberCount;
            const audienceTrust = ensureFiniteNumber(nextPlayer.youtube.audienceTrust, 55);
            const fanMood = ensureFiniteNumber(nextPlayer.youtube.fanMood, 55);
            const controversy = ensureFiniteNumber(nextPlayer.youtube.controversy, 0);
            const eventRoll = Math.random();
            const backlashThreshold = 0.64 + Math.min(0.18, controversy / 280) - Math.min(0.12, audienceTrust / 650) + identityTuning.backlashBoost;
            const title = pickedVideo.title || t(language, 'services.gameLoop.youtubeEarly.fallbackTitle');

            if (quality >= 78 && fanMood >= 45 && eventRoll < 0.34 + Math.min(0.12, fanMood / 500) + identityTuning.viralBoost) {
                const bonusViews = Math.max(50, Math.floor(subscriberBase * (0.16 + Math.random() * 0.24)));
                const bonusSubs = Math.max(1, Math.floor(bonusViews / 120));
                pickedVideo.views += bonusViews;
                pickedVideo.likes += Math.floor(bonusViews * 0.06);
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [
                    t(language, 'services.gameLoop.youtubeAudience.comment.viralEverywhere'),
                    t(language, 'services.gameLoop.youtubeAudience.comment.algorithmFound'),
                    ...(pickedVideo.comments || [])
                ].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 4);
                nextPlayer.youtube.controversy = Math.max(0, controversy - 2);
                nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 1);
                nextPlayer.x.followers += Math.floor(bonusViews * 0.015);
                nextPlayer.x.feed.unshift({
                    id: `x_yt_viral_${Date.now()}`,
                    authorId: 'yt_trends',
                    authorName: 'Creator Watch',
                    authorHandle: '@creatorwatch',
                    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=CreatorWatch',
                    content: t(language, 'services.gameLoop.youtubeAudience.social.viralClip', { playerName: nextPlayer.name, title }),
                    timestamp: Date.now(),
                    likes: Math.floor(bonusViews * 0.04),
                    retweets: Math.floor(bonusViews * 0.01),
                    replies: Math.floor(bonusViews * 0.006),
                    isPlayer: false,
                    isLiked: false,
                    isRetweeted: false,
                    isVerified: true
                });
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeAudience.log.viralClip', { title, subscribers: bonusSubs.toLocaleString() }),
                    type: 'positive'
                });
            } else if (nextPlayer.youtube.isMonetized && audienceTrust >= 50 && eventRoll < 0.56) {
                const payout = Math.floor(Math.max(500, nextPlayer.youtube.subscribers * (0.04 + Math.random() * 0.08)));
                const payoutAmount = `$${payout.toLocaleString()}`;
                addTransaction(payout, 'BUSINESS', t(language, 'services.gameLoop.youtubeAudience.finance.creatorBonus'));
                nextPlayer.youtube.lifetimeEarnings += payout;
                nextPlayer.youtube.audienceTrust = Math.min(100, audienceTrust + 2);
                nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 1);
                nextPlayer.inbox.unshift({
                    id: `yt_bonus_${Date.now()}`,
                    sender: t(language, 'services.gameLoop.youtubeAudience.bonus.sender'),
                    subject: t(language, 'services.gameLoop.youtubeAudience.bonus.subject'),
                    text: t(language, 'services.gameLoop.youtubeAudience.bonus.text', { amount: payoutAmount }),
                    type: 'SYSTEM',
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: 4
                });
                logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeAudience.log.creatorBonus', { amount: payoutAmount }), type: 'positive' });
            } else if (eventRoll < backlashThreshold) {
                const lostSubs = Math.max(1, Math.floor(subscriberBase * (0.015 + Math.random() * 0.025)));
                nextPlayer.youtube.subscribers = Math.max(0, nextPlayer.youtube.subscribers - lostSubs);
                nextPlayer.youtube.audienceTrust = Math.max(0, audienceTrust - 5);
                nextPlayer.youtube.fanMood = Math.max(0, fanMood - 6);
                nextPlayer.youtube.controversy = Math.min(100, controversy + 9);
                pickedVideo.comments = [
                    t(language, 'services.gameLoop.youtubeAudience.comment.backlashOldChannel'),
                    t(language, 'services.gameLoop.youtubeAudience.comment.backlashFighting'),
                    ...(pickedVideo.comments || [])
                ].slice(0, 5);
                nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 2);
                if (subscriberBase >= 10000) {
                    nextPlayer.news.unshift({
                        id: `news_yt_backlash_${Date.now()}`,
                        headline: t(language, 'services.gameLoop.youtubeAudience.news.backlashHeadline', { playerName: nextPlayer.name }),
                        subtext: t(language, 'services.gameLoop.youtubeAudience.news.backlashSubtext'),
                        category: 'YOU',
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        impactLevel: 'LOW'
                    });
                }
                logsToAdd.push({
                    msg: t(language, 'services.gameLoop.youtubeAudience.log.backlash', { title, subscribers: lostSubs.toLocaleString() }),
                    type: 'negative'
                });
                if (subscriberBase >= 10000 || controversy >= 60) {
                    nextPlayer.pendingEvents.push(createYoutubeBacklashEvent(title, controversy + ensureFiniteNumber(pickedVideo.controversyScore, 0), language));
                }
            } else {
                const claim = Math.floor(Math.max(150, ensureFiniteNumber(pickedVideo.earnings, 0) * 0.3 + Math.random() * 500));
                pickedVideo.earnings = Math.max(0, ensureFiniteNumber(pickedVideo.earnings, 0) - claim);
                nextPlayer.youtube.audienceTrust = Math.max(0, audienceTrust - 2);
                pickedVideo.comments = [t(language, 'services.gameLoop.youtubeAudience.comment.claimed'), ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.pendingEvents.push(createYoutubeCopyrightEvent(title, claim, 45 + Math.floor(Math.random() * 35), language));
                logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeAudience.log.copyrightClaim', { title }), type: 'negative' });
            }

            nextPlayer.flags.lastYoutubeEventAbsWeek = currentAbs;
            nextPlayer.news = nextPlayer.news.slice(0, 50);
            nextPlayer.x.feed = nextPlayer.x.feed.slice(0, 50);
        }
    } catch (error) {
        console.error('YouTube event simulation failed during week processing:', error);
    }

    try {
        const currentAbs = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
        const lastInstagramEventAbs = ensureFiniteNumber(nextPlayer.flags.lastInstagramMicroEventAbsWeek, 0);
        const instagramFollowers = Math.max(0, ensureFiniteNumber(nextPlayer.instagram.followers, nextPlayer.stats.followers || 0));
        const recentPosts = (nextPlayer.instagram.posts || []).filter(post => getWeeksSince(post.week || 0, post.year || nextPlayer.age, nextPlayer.currentWeek, nextPlayer.age) <= 8);

        if (recentPosts.length > 0 && currentAbs - lastInstagramEventAbs >= 3 && instagramFollowers < 100000 && Math.random() < 0.34) {
            const pickedPost = recentPosts[Math.floor(Math.random() * recentPosts.length)];
            const eventRoll = Math.random();
            let followerGain = 0;
            let type: 'positive' | 'negative' | 'neutral' = 'positive';
            let message = '';

            if (eventRoll < 0.18) {
                const celebrityPool = NPC_DATABASE.filter(npc => (
                    (npc.occupation === 'ACTOR' || npc.occupation === 'DIRECTOR')
                    && (npc.tier === 'A_LIST' || npc.tier === 'ICON' || npc.occupation === 'DIRECTOR')
                ));
                const celebrity = celebrityPool[Math.floor(Math.random() * celebrityPool.length)] || NPC_DATABASE[0];
                const bonusLikes = Math.max(20, Math.min(1800, Math.floor((pickedPost.likes || 10) * (0.4 + Math.random() * 0.9))));
                followerGain = Math.max(4, Math.min(180, Math.floor(bonusLikes * 0.09)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + 1;
                pickedPost.commentList = [
                    t(language, 'services.gameLoop.instagramMicro.comment.celebrityClean', { celebrityName: celebrity.name }),
                    ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3, language))
                ].slice(0, 8);
                nextPlayer.instagram.fanLoyalty = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.fanLoyalty, 45) + 2);
                nextPlayer.instagram.feed.unshift({
                    id: `ig_celebrity_like_${Date.now()}_${Math.random()}`,
                    authorId: 'social_spotter',
                    authorName: 'Social Spotter',
                    authorHandle: '@socialspotter',
                    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=SocialSpotter',
                    type: 'INDUSTRY_NEWS',
                    caption: t(language, 'services.gameLoop.instagramMicro.social.celebrityLike', { celebrityName: celebrity.name, playerName: nextPlayer.name }),
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    likes: 900 + Math.floor(Math.random() * 2200),
                    comments: 35 + Math.floor(Math.random() * 90),
                    shares: 20 + Math.floor(Math.random() * 70),
                    saves: 12 + Math.floor(Math.random() * 45),
                    commentList: getInstagramPostComments('INDUSTRY_NEWS', 5, language),
                    isPlayer: false
                });
                if (celebrity.tier === 'A_LIST' || celebrity.tier === 'ICON') {
                    nextPlayer.news.unshift({
                        id: `news_ig_celebrity_notice_${Date.now()}`,
                        headline: t(language, 'services.gameLoop.instagramMicro.news.celebrityNotice', { celebrityName: celebrity.name, playerName: nextPlayer.name }),
                        subtext: t(language, 'services.gameLoop.instagramMicro.news.celebrityNoticeSubtext'),
                        category: 'YOU',
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        impactLevel: 'LOW'
                    });
                }
                message = t(language, 'services.gameLoop.instagramMicro.log.notice', { celebrityName: celebrity.name, followers: followerGain.toLocaleString() });
            } else if (eventRoll < 0.38) {
                const bonusLikes = Math.max(8, Math.min(900, Math.floor((pickedPost.likes || 10) * (0.35 + Math.random() * 0.55))));
                followerGain = Math.max(1, Math.min(90, Math.floor(bonusLikes * 0.08)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + Math.max(1, Math.floor(bonusLikes * 0.05));
                pickedPost.shares = ensureFiniteNumber(pickedPost.shares, 0) + Math.max(1, Math.floor(bonusLikes * 0.04));
                pickedPost.commentList = [t(language, 'services.gameLoop.instagramMicro.comment.fanRepost'), ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3, language))].slice(0, 7);
                nextPlayer.instagram.fanLoyalty = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.fanLoyalty, 45) + 2);
                message = t(language, 'services.gameLoop.instagramMicro.log.fanPage', { likes: bonusLikes.toLocaleString(), followers: followerGain.toLocaleString() });
            } else if (eventRoll < 0.56) {
                const bonusLikes = Math.max(12, Math.min(1200, Math.floor((pickedPost.likes || 10) * (0.45 + Math.random() * 0.75))));
                followerGain = Math.max(2, Math.min(120, Math.floor(bonusLikes * 0.07)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.saves = ensureFiniteNumber(pickedPost.saves, 0) + Math.max(2, Math.floor(bonusLikes * 0.08));
                pickedPost.commentList = [t(language, 'services.gameLoop.instagramMicro.comment.moodBoard'), ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3, language))].slice(0, 7);
                nextPlayer.instagram.aesthetic = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.aesthetic, 50) + 2);
                nextPlayer.instagram.fashionInfluence = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.fashionInfluence, 10) + 1);
                message = t(language, 'services.gameLoop.instagramMicro.log.aestheticLift', { likes: bonusLikes.toLocaleString(), followers: followerGain.toLocaleString() });
            } else if (eventRoll < 0.74) {
                const bonusLikes = Math.max(6, Math.min(600, Math.floor((pickedPost.likes || 10) * 0.3)));
                followerGain = Math.max(1, Math.min(60, Math.floor(bonusLikes * 0.05)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + Math.max(1, Math.floor(bonusLikes * 0.07));
                pickedPost.commentList = [t(language, 'services.gameLoop.instagramMicro.comment.relatable'), ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3, language))].slice(0, 7);
                nextPlayer.instagram.authenticity = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.authenticity, 55) + 2);
                message = t(language, 'services.gameLoop.instagramMicro.log.relatable', { followers: followerGain.toLocaleString() });
            } else if (pickedPost.type === 'CONTROVERSIAL' || ensureFiniteNumber(nextPlayer.instagram.controversy, 0) > 40) {
                const lostFollowers = Math.max(1, Math.min(80, Math.floor(instagramFollowers * (0.01 + Math.random() * 0.025))));
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + Math.max(3, Math.floor(lostFollowers * 0.5));
                pickedPost.commentList = [t(language, 'services.gameLoop.instagramMicro.comment.messy'), ...(pickedPost.commentList || getInstagramPostComments('CONTROVERSIAL', 3, language))].slice(0, 7);
                nextPlayer.instagram.followers = Math.max(0, instagramFollowers - lostFollowers);
                nextPlayer.stats.followers = Math.max(0, ensureFiniteNumber(nextPlayer.stats.followers, 0) - lostFollowers);
                nextPlayer.instagram.controversy = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.controversy, 0) + 3);
                type = 'negative';
                message = t(language, 'services.gameLoop.instagramMicro.log.commentFire', { followers: lostFollowers.toLocaleString() });
            } else {
                pickedPost.commentList = [t(language, 'services.gameLoop.instagramMicro.comment.consistency'), ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3, language))].slice(0, 7);
                nextPlayer.instagram.authenticity = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.authenticity, 55) + 1);
                type = 'neutral';
                message = t(language, 'services.gameLoop.instagramMicro.log.pulse');
            }

            if (followerGain > 0) {
                nextPlayer.instagram.followers = instagramFollowers + followerGain;
                nextPlayer.stats.followers = ensureFiniteNumber(nextPlayer.stats.followers, 0) + followerGain;
            }

            nextPlayer.flags.lastInstagramMicroEventAbsWeek = currentAbs;
            logsToAdd.push({ msg: message, type });
        }
    } catch (error) {
        console.error('Instagram micro event simulation failed during week processing:', error);
    }

    try {
        const pendingReferrals = Array.isArray(nextPlayer.flags.pendingInstagramReferrals)
            ? nextPlayer.flags.pendingInstagramReferrals
            : [];
        const remainingReferrals: any[] = [];

        pendingReferrals.forEach((referral: any) => {
            const weeksLeft = ensureFiniteNumber(referral.weeksLeft, 0) - 1;
            if (weeksLeft <= 0) {
                const referralId = referral.id || referral.actionId || `legacy_${referral.npcId || 'connection'}`;
                const messageId = `ig_referral_offer_${referralId}`;
                const alreadyDelivered = nextPlayer.inbox.some(message => message.id === messageId);
                if (!alreadyDelivered) {
                    const outcome = resolveInstagramReferralOutcome(referral, nextPlayer);
                    const isDirectRole = outcome.deliveryType === 'DIRECT_ROLE';
                    const opportunity = outcome.opportunity;
                    const connectionName = referral.npcName || t(language, 'services.gameLoop.instagramDm.fallback.celebrityConnection');
                    nextPlayer.inbox.unshift({
                        id: messageId,
                        sender: t(language, 'services.gameLoop.instagramDm.referral.sender'),
                        subject: t(language, isDirectRole ? 'services.gameLoop.instagramDm.referral.directSubject' : 'services.gameLoop.instagramDm.referral.auditionSubject', { projectName: opportunity.projectName }),
                        text: isDirectRole
                            ? t(language, 'services.gameLoop.instagramDm.referral.directText', { connectionName })
                            : t(language, 'services.gameLoop.instagramDm.referral.auditionText', { connectionName }),
                        type: isDirectRole ? 'OFFER_ROLE' : 'OFFER_AUDITION',
                        data: opportunity,
                        isRead: false,
                        weekSent: nextPlayer.currentWeek,
                        expiresIn: 4
                    });
                    if (isDirectRole) {
                        nextPlayer.flags.lastInstagramDirectRoleAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
                    }
                    logsToAdd.push({
                        msg: t(language, 'services.gameLoop.instagramDm.log.referral', {
                            connectionName: referral.npcName || t(language, 'services.gameLoop.instagramDm.fallback.connection'),
                            outcome: t(language, isDirectRole ? 'services.gameLoop.instagramDm.referral.outcome.directRole' : 'services.gameLoop.instagramDm.referral.outcome.audition'),
                            projectName: opportunity.projectName
                        }),
                        type: 'positive'
                    });
                }
            } else {
                remainingReferrals.push({ ...referral, weeksLeft });
            }
        });
        nextPlayer.flags.pendingInstagramReferrals = remainingReferrals;

        const currentAbs = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
        const npcLookup = [...NPC_DATABASE, ...(Array.isArray(nextPlayer.flags.extraNPCs) ? nextPlayer.flags.extraNPCs : [])]
            .reduce((acc: Record<string, any>, npc: any) => {
                acc[npc.id] = npc;
                return acc;
            }, {});
        let hasPendingInstagramDmAction = false;
        Object.entries(nextPlayer.instagram.npcStates || {}).forEach(([npcId, state]: [string, any]) => {
            const updatedChat = (state.chatHistory || []).map((message: any) => {
                if (message.sender !== 'NPC' || message.action?.status !== 'PENDING') return message;
                const payload = message.action.payload || {};
                const expiresAbsWeek = ensureFiniteNumber(
                    payload.expiresAbsWeek,
                    ensureFiniteNumber(payload.createdAbsWeek, currentAbs) + ensureFiniteNumber(payload.expiresWeeks, 3)
                );
                if (currentAbs < expiresAbsWeek) {
                    hasPendingInstagramDmAction = true;
                    return message;
                }

                const npcName = npcLookup[npcId]?.name || payload.brandHandle || payload.brandName || t(language, 'services.gameLoop.instagramDm.fallback.someone');
                const isReferral = message.action.kind === 'IG_REFERRAL';
                logsToAdd.push({
                    msg: t(language, isReferral ? 'services.gameLoop.instagramDm.log.seenReferral' : 'services.gameLoop.instagramDm.log.seenCampaign', { npcName }),
                    type: isReferral ? 'neutral' : 'negative'
                });
                if (isReferral && Math.random() < 0.45) {
                    nextPlayer.news.unshift({
                        id: `news_ig_seen_${Date.now()}_${Math.random()}`,
                        headline: t(language, 'services.gameLoop.instagramDm.news.seenHeadline', { playerName: nextPlayer.name, npcName }),
                        subtext: t(language, 'services.gameLoop.instagramDm.news.seenSubtext'),
                        category: 'YOU',
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        impactLevel: 'LOW'
                    });
                }
                return {
                    ...message,
                    action: { ...message.action, status: 'DECLINED' as const }
                };
            });

            const expiredSomething = updatedChat.some((message: any, index: number) => message !== (state.chatHistory || [])[index]);
            if (expiredSomething) {
                const followUpText = t(language, 'services.gameLoop.instagramDm.followUp.expired');
                nextPlayer.instagram.npcStates[npcId] = {
                    ...state,
                    chatHistory: [
                        ...updatedChat,
                        { sender: 'NPC', text: followUpText, timestamp: Date.now() + Math.random() }
                    ]
                };
            }
        });
        nextPlayer.news = nextPlayer.news.slice(0, 50);

        const lastDmAbs = ensureFiniteNumber(nextPlayer.flags.lastInstagramDmOfferAbsWeek, 0);
        const publicFollowers = Math.max(nextPlayer.stats.followers || 0, nextPlayer.instagram.followers || 0);
        const canReceiveDm = !hasPendingInstagramDmAction && currentAbs - lastDmAbs >= 5 && (publicFollowers >= 500 || nextPlayer.stats.fame >= 12);

        if (canReceiveDm && Math.random() < 0.18) {
            const actionId = `ig_dm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const isBrand = publicFollowers >= 1000 && nextPlayer.activeSponsorships.length < 3 && Math.random() < 0.5;

            if (isBrand) {
                const categories: SponsorshipCategory[] = ['FASHION', 'BEVERAGE', 'FITNESS'];
                if ((nextPlayer.instagram.fashionInfluence || 0) >= 35) categories.push('LUXURY');
                if ((nextPlayer.instagram.aesthetic || 0) >= 55) categories.push('TECH');
                const category = categories[Math.floor(Math.random() * categories.length)];
                const brand = pickInstagramMicroBrand(category);
                const brandNpc = {
                    id: `ig_brand_account_${brand.id}`,
                    name: brand.name,
                    handle: brand.handle,
                    gender: 'ALL',
                    avatar: `https://api.dicebear.com/8.x/shapes/svg?seed=${brand.avatarSeed}`,
                    tier: 'RISING',
                    prestigeBias: 'MIXED',
                    openness: 60,
                    followers: brand.followers,
                    netWorth: 2,
                    occupation: 'DIRECTOR',
                    bio: t(language, 'services.gameLoop.instagramDm.brand.bio', { vibe: brand.vibe }),
                    forbesCategory: 'Brand'
                } as any;
                const extraNPCs = Array.isArray(nextPlayer.flags.extraNPCs) ? nextPlayer.flags.extraNPCs : [];
                if (!extraNPCs.some((entry: any) => entry.id === brandNpc.id)) {
                    nextPlayer.flags.extraNPCs = [...extraNPCs, brandNpc];
                }
                const state = nextPlayer.instagram.npcStates[brandNpc.id] || {
                    npcId: brandNpc.id,
                    isFollowing: false,
                    isFollowedBy: true,
                    relationshipScore: 12,
                    relationshipLevel: 'BRAND',
                    lastInteractionWeek: nextPlayer.currentWeek,
                    hasMet: false,
                    chatHistory: []
                };
                const recentProjectBudgets = [
                    ...(nextPlayer.activeReleases || []).map(rel => ensureFiniteNumber(rel.budget, 0)),
                    ...(nextPlayer.commitments || []).map(commitment => ensureFiniteNumber(commitment.projectDetails?.estimatedBudget, 0)),
                    ...(nextPlayer.pastProjects || []).filter(project => !project.isQaArchive).slice(-5).map(project => ensureFiniteNumber(project.budget, 0))
                ];
                const recentProjectEarnings = [
                    ...(nextPlayer.commitments || []).map(commitment => Math.max(ensureFiniteNumber(commitment.income, 0) * 8, ensureFiniteNumber(commitment.lumpSum, 0))),
                    ...(nextPlayer.pastProjects || []).filter(project => !project.isQaArchive).slice(-5).map(project => ensureFiniteNumber(project.earnings, 0))
                ];
                const topProjectBudget = Math.max(0, ...recentProjectBudgets);
                const topProjectEarnings = Math.max(0, ...recentProjectEarnings);
                const influenceScore = ensureFiniteNumber(nextPlayer.instagram.aesthetic, 50)
                    + ensureFiniteNumber(nextPlayer.instagram.fashionInfluence, 10)
                    + ensureFiniteNumber(nextPlayer.instagram.fanLoyalty, 45);
                const categoryMultiplier: Record<SponsorshipCategory, number> = {
                    FASHION: 1,
                    FITNESS: 0.95,
                    TECH: 1.15,
                    BEVERAGE: 0.9,
                    LUXURY: 1.45,
                    AUTOMOTIVE: 1.35
                };
                const audienceQuote = publicFollowers * (0.025 + Math.min(0.02, influenceScore / 8000));
                const fameQuote = Math.pow(Math.max(0, nextPlayer.stats.fame), 1.35) * 28;
                const projectQuote = topProjectBudget * 0.00012;
                const earningsQuote = topProjectEarnings * 0.01;
                const rawWeeklyPay = (300 + audienceQuote + fameQuote + projectQuote + earningsQuote) * categoryMultiplier[category];
                const roundingStep = rawWeeklyPay >= 10000 ? 1000 : rawWeeklyPay >= 3000 ? 500 : 50;
                const weeklyPay = Math.max(250, Math.floor(rawWeeklyPay / roundingStep) * roundingStep);
                const durationWeeks = 4 + Math.floor(Math.random() * 5);
                const totalRequired = weeklyPay >= 15000 ? 4 : weeklyPay >= 5000 ? 3 : 2;
                const offer: SponsorshipOffer = {
                    id: `ig_brand_${Date.now()}_${Math.random()}`,
                    brandName: brand.name,
                    category,
                    weeklyPay,
                    durationWeeks,
                    requirements: { type: 'POST', energyCost: 8, totalRequired, progress: 0 },
                    isExclusive: false,
                    penalty: Math.floor(weeklyPay * 1.5),
                    description: t(language, 'services.gameLoop.instagramDm.brand.offerDescription', { brandHandle: brand.handle }),
                    expiresIn: 3,
                    weeksCompleted: 0
                };
                const weeklyPayText = `$${weeklyPay.toLocaleString()}`;
                state.chatHistory = [
                    ...(state.chatHistory || []),
                    {
                        sender: 'NPC',
                        text: t(language, 'services.gameLoop.instagramDm.brand.offerText', {
                            playerName: nextPlayer.name,
                            brandName: brand.name,
                            durationWeeks: durationWeeks.toLocaleString(),
                            weeklyPay: weeklyPayText,
                            totalRequired: totalRequired.toLocaleString()
                        }),
                        timestamp: Date.now(),
                        tag: 'IG_BRAND_DM',
                        action: {
                            id: actionId,
                            kind: 'IG_BRAND_OFFER',
                            status: 'PENDING',
                            payload: { offer, brandHandle: brand.handle, createdAbsWeek: currentAbs, expiresAbsWeek: currentAbs + 3, expiresWeeks: 3 }
                        }
                    }
                ];
                nextPlayer.instagram.npcStates[brandNpc.id] = {
                    ...state,
                    isFollowedBy: true,
                    relationshipScore: Math.max(state.relationshipScore || 0, 16),
                    lastInteractionWeek: nextPlayer.currentWeek
                };
                logsToAdd.push({ msg: t(language, 'services.gameLoop.instagramDm.log.brandOffer', { brandHandle: brand.handle, weeklyPay: weeklyPayText }), type: 'positive' });
            } else {
                const npcPool = NPC_DATABASE.filter(npc => (
                    (npc.occupation === 'ACTOR' || npc.occupation === 'DIRECTOR')
                    && (npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED' || npc.occupation === 'DIRECTOR')
                ));
                const npc = npcPool[Math.floor(Math.random() * npcPool.length)] || NPC_DATABASE[0];
                const state = nextPlayer.instagram.npcStates[npc.id] || {
                    npcId: npc.id,
                    isFollowing: false,
                    isFollowedBy: true,
                    relationshipScore: 10,
                    relationshipLevel: 'STRANGER',
                    lastInteractionWeek: nextPlayer.currentWeek,
                    hasMet: false,
                    chatHistory: []
                };
                const projectHint = t(language, nextPlayer.stats.fame >= 35 ? 'services.gameLoop.instagramDm.referral.projectHint.studio' : 'services.gameLoop.instagramDm.referral.projectHint.indie');
                const referralWeeks = 2 + Math.floor(Math.random() * 2);
                state.chatHistory = [
                    ...(state.chatHistory || []),
                    {
                        sender: 'NPC',
                        text: t(language, 'services.gameLoop.instagramDm.referral.dmText', { projectHint, referralWeeks: referralWeeks.toLocaleString() }),
                        timestamp: Date.now(),
                        tag: 'IG_REFERRAL_DM',
                        action: { id: actionId, kind: 'IG_REFERRAL', status: 'PENDING', payload: { weeksLeft: referralWeeks, createdAbsWeek: currentAbs, expiresAbsWeek: currentAbs + 3, expiresWeeks: 3 } }
                    }
                ];
                nextPlayer.instagram.feed.unshift({
                    id: `ig_dm_buzz_${Date.now()}_${Math.random()}`,
                    authorId: 'casting_room_buzz',
                    authorName: 'Casting Room Buzz',
                    authorHandle: '@castingroombuzz',
                    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=CastingRoomBuzz',
                    type: 'INDUSTRY_NEWS',
                    caption: t(language, 'services.gameLoop.instagramDm.social.referralBuzz'),
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    likes: 1200 + Math.floor(Math.random() * 1800),
                    comments: 60 + Math.floor(Math.random() * 80),
                    shares: 30 + Math.floor(Math.random() * 60),
                    saves: 18 + Math.floor(Math.random() * 35),
                    commentList: getInstagramPostComments('INDUSTRY_NEWS', 5, language),
                    isPlayer: false
                });
                logsToAdd.push({ msg: t(language, 'services.gameLoop.instagramDm.log.referralHint', { npcName: npc.name }), type: 'positive' });

                nextPlayer.instagram.npcStates[npc.id] = {
                    ...state,
                    isFollowedBy: true,
                    relationshipScore: Math.max(state.relationshipScore || 0, 18),
                    lastInteractionWeek: nextPlayer.currentWeek
                };
            }
            nextPlayer.flags.lastInstagramDmOfferAbsWeek = currentAbs;
            nextPlayer.instagram.feed = nextPlayer.instagram.feed.slice(0, 50);
        }
    } catch (error) {
        console.error('Instagram DM offer simulation failed during week processing:', error);
    }

    try {
        const currentAbs = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
        const lastRippleAbs = ensureFiniteNumber(nextPlayer.flags.lastYoutubeImageRippleAbsWeek, 0);
        const creatorScore = calculateYoutubeCreatorScore(nextPlayer);
        const publicImage = getYoutubePublicImageLabel(nextPlayer);
        const publicImageLabel = t(language, 'services.gameLoop.youtubeImage.publicImageKey.' + publicImage);
        const channelIsVisible = nextPlayer.youtube.subscribers >= 20000 || nextPlayer.youtube.totalChannelViews >= 250000;

        if (channelIsVisible && currentAbs - lastRippleAbs >= 10 && Math.random() < 0.22) {
            nextPlayer.flags.lastYoutubeImageRippleAbsWeek = currentAbs;

            if (creatorScore >= 78 && publicImage !== 'Volatile') {
                nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 2);
                nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 1);
                nextPlayer.news.unshift({
                    id: `news_yt_image_good_${Date.now()}`,
                    headline: t(language, 'services.gameLoop.youtubeImage.news.goodHeadline', { playerName: nextPlayer.name }),
                    subtext: t(language, 'services.gameLoop.youtubeImage.news.goodSubtext'),
                    category: 'YOU',
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    impactLevel: 'MEDIUM'
                });
                logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeImage.log.good', { publicImage: publicImageLabel.toLowerCase() }), type: 'positive' });
            } else if (publicImage === 'Volatile' || creatorScore < 38) {
                nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 3);
                nextPlayer.youtube.audienceTrust = Math.max(0, (nextPlayer.youtube.audienceTrust ?? 55) - 3);
                nextPlayer.news.unshift({
                    id: `news_yt_image_bad_${Date.now()}`,
                    headline: t(language, 'services.gameLoop.youtubeImage.news.badHeadline', { playerName: nextPlayer.name }),
                    subtext: t(language, 'services.gameLoop.youtubeImage.news.badSubtext'),
                    category: 'YOU',
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    impactLevel: 'LOW'
                });
                logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeImage.log.bad'), type: 'negative' });
            }

            nextPlayer.news = nextPlayer.news.slice(0, 50);
        }
    } catch (error) {
        console.error('YouTube creator image ripple failed during week processing:', error);
    }

    try {
        const currentAbs = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
        const lastRivalAbs = ensureFiniteNumber(nextPlayer.flags.lastYoutubeRivalryAbsWeek, 0);
        const creatorScore = calculateYoutubeCreatorScore(nextPlayer);
        const publicImage = getYoutubePublicImageLabel(nextPlayer);
        const rivalryCooldown = publicImage === 'Volatile' || nextPlayer.youtube.creatorIdentity === 'CHAOS_CREATOR' ? 8 : 12;
        const channelHasRivalGravity = nextPlayer.youtube.subscribers >= 35000 || nextPlayer.youtube.totalChannelViews >= 500000;
        const rivalryChance = publicImage === 'Volatile' || nextPlayer.youtube.creatorIdentity === 'CONTROVERSY_MAGNET'
            ? 0.28
            : creatorScore >= 72
                ? 0.2
                : 0.14;

        if (channelHasRivalGravity && currentAbs - lastRivalAbs >= rivalryCooldown && Math.random() < rivalryChance) {
            nextPlayer.pendingEvents.push(createYoutubeRivalryEvent(nextPlayer, Math.random, language));
            nextPlayer.flags.lastYoutubeRivalryAbsWeek = currentAbs;
            nextPlayer.youtube.controversy = Math.min(100, (nextPlayer.youtube.controversy ?? 0) + 4);
            nextPlayer.news.unshift({
                id: `news_yt_rival_tease_${Date.now()}`,
                headline: t(language, 'services.gameLoop.youtubeRivalry.news.headline', { playerName: nextPlayer.name }),
                subtext: t(language, 'services.gameLoop.youtubeRivalry.news.subtext'),
                category: 'YOU',
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                impactLevel: 'LOW'
            });
            nextPlayer.news = nextPlayer.news.slice(0, 50);
            logsToAdd.push({ msg: t(language, 'services.gameLoop.youtubeRivalry.log'), type: 'neutral' });
        }
    } catch (error) {
        console.error('YouTube rivalry generation failed during week processing:', error);
    }

    // NPC Life Updates
    const allNPCs = [...NPC_DATABASE, ...(nextPlayer.flags.extraNPCs || [])];
    const updatedNPCs = updateNPCLives(allNPCs);
    // We only store the "extra" ones back to flags, the core DB is static in memory but we simulate growth
    // Actually, it's better to store the "state" of NPCs in the player object if we want persistence
    // For now, let's just update the extra ones
    if (nextPlayer.flags.extraNPCs) {
        nextPlayer.flags.extraNPCs = updateNPCLives(nextPlayer.flags.extraNPCs);
    }

    // Talent Refresh (Every 3 Weeks)
    const lastTalentRefresh = nextPlayer.studio.lastTalentRefreshWeek || 0;
    const weeksSinceTalentRefresh = ((nextPlayer.age - 1) * 52 + nextPlayer.currentWeek) - lastTalentRefresh;
    
    if (weeksSinceTalentRefresh >= 3) {
        const newUnknowns = generateNewUnknowns(5);
        nextPlayer.flags.extraNPCs = [...(nextPlayer.flags.extraNPCs || []), ...newUnknowns];
        nextPlayer.studio.lastTalentRefreshWeek = (nextPlayer.age - 1) * 52 + nextPlayer.currentWeek;
        logsToAdd.push({ msg: "🌟 New talent has emerged in the industry.", type: 'neutral' });
    }

    // Weekly Payments for Signed Talent
    if (nextPlayer.studio.talentRoster) {
        nextPlayer.studio.talentRoster = nextPlayer.studio.talentRoster.filter(contract => {
            if (contract.status !== 'ACTIVE') return true;

            // 1. Maintenance Fee (Always paid while active)
            if (contract.maintenanceFee > 0) {
                addTransaction(-contract.maintenanceFee, 'EXPENSE', `Talent Maintenance Fee (${contract.npcId})`);
            }

            // 2. Installments (If applicable)
            if (contract.paymentMode === 'WEEKLY_INSTALLMENTS' && contract.installmentsPaid < contract.totalInstallments) {
                const installmentAmount = Math.floor(contract.totalAmount / contract.totalInstallments);
                addTransaction(-installmentAmount, 'EXPENSE', `Talent Installment (${contract.npcId})`);
                contract.installmentsPaid += 1;
            }

            // 3. Expiration Check
            if (contract.type === 'MOVIE_DEAL' && contract.moviesRemaining !== undefined && contract.moviesRemaining <= 0) {
                logsToAdd.push({ msg: `📜 Movie deal completed: ${contract.npcId}`, type: 'positive' });
                return false; // Remove from roster
            }

            return true;
        });

        // The legacy global roster mirrors only the parent/HQ studio. Never
        // copy it into acquired studios: each subsidiary has its own contracts
        // and pays them from its own treasury.
        const parentStudioId = getStudioGroup(nextPlayer).parentStudio?.id;
        nextPlayer.businesses.forEach(b => {
            if (b.id === parentStudioId && b.studioState) {
                b.studioState.talentRoster = [...nextPlayer.studio.talentRoster];
            }
        });
    }

    // Process subsidiary talent independently. Contract ownership is explicit,
    // so old HQ roster mirrors in imported saves cannot charge a subsidiary.
    const parentStudioId = getStudioGroup(nextPlayer).parentStudio?.id;
    nextPlayer.businesses.forEach(business => {
        if (
            business.type !== 'PRODUCTION_HOUSE'
            || business.id === parentStudioId
            || !business.studioState
        ) return;

        const ownedContracts = (business.studioState.talentRoster || [])
            .filter(contract => contract.studioId === business.id);
        const weeklyLedgerEntries: NonNullable<typeof business.studioState.financeLedger> = [];

        business.studioState.talentRoster = ownedContracts.filter(contract => {
            if (contract.status !== 'ACTIVE') return true;

            let weeklyCost = Math.max(0, contract.maintenanceFee || 0);
            if (contract.paymentMode === 'WEEKLY_INSTALLMENTS' && contract.installmentsPaid < contract.totalInstallments) {
                weeklyCost += Math.floor(contract.totalAmount / Math.max(1, contract.totalInstallments));
                contract.installmentsPaid += 1;
            }

            if (weeklyCost > 0) {
                business.balance -= weeklyCost;
                weeklyLedgerEntries.push({
                    id: `studio_talent_weekly_${business.id}_${contract.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    amount: -weeklyCost,
                    type: 'PRODUCTION_SPEND',
                    label: `Talent payroll (${contract.npcId})`,
                });
            }

            if (contract.type === 'MOVIE_DEAL' && contract.moviesRemaining <= 0) {
                logsToAdd.push({ msg: `📜 ${business.name} completed a talent deal: ${contract.npcId}`, type: 'positive' });
                return false;
            }
            return true;
        });

        if (weeklyLedgerEntries.length) {
            business.studioState.financeLedger = [
                ...weeklyLedgerEntries,
                ...(business.studioState.financeLedger || []),
            ].slice(0, 200);
        }
    });

    // --- 2B. TEAM ROTATION ---
    if ((nextPlayer.currentWeek + 1) % 3 === 0) {
        const hiredTeamIds = [
            nextPlayer.team.agent?.id,
            nextPlayer.team.manager?.id,
            nextPlayer.team.personalTrainer?.id,
            nextPlayer.team.therapist?.id,
            nextPlayer.team.stylist?.id,
            nextPlayer.team.publicist?.id,
            nextPlayer.team.wellness?.id,
        ].filter((id): id is string => Boolean(id));

        nextPlayer.team.availableAgents = getRandomAgents(3, hiredTeamIds);
        nextPlayer.team.availableManagers = getRandomManagers(2, hiredTeamIds);
        nextPlayer.team.availableTrainers = getRandomTrainers(2, hiredTeamIds);
        nextPlayer.team.availableTherapists = getRandomTherapists(2, hiredTeamIds);
        nextPlayer.team.availableStylists = getRandomStylists(2, hiredTeamIds);
        nextPlayer.team.availablePublicists = getRandomPublicists(2, hiredTeamIds);
        nextPlayer.team.availableWellness = getRandomWellness(2, hiredTeamIds);
        nextPlayer.team = sanitizeTeamPools(nextPlayer);
        
        logsToAdd.push({ msg: "The hiring pool for Agents & Managers has refreshed.", type: 'neutral' });
    }

    // --- 3. FINANCES & UPKEEP ---
    const weeklySubscriptionCost = nextPlayer.commitments.reduce((sum, c) => sum + (c.weeklyCost || 0), 0);
    const propertyUpkeep = nextPlayer.residenceId ? PROPERTY_CATALOG.find(p => p.id === nextPlayer.residenceId)?.weeklyExpense || 0 : 0;
    const marketAssets = [...PROPERTY_CATALOG, ...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG, ...CLOTHING_CATALOG];
    nextPlayer.assetStates = (nextPlayer.assetStates || [])
        .filter(state => nextPlayer.assets.includes(state.assetId))
        .map(state => {
            const asset = nextPlayer.customItems.find(item => item.id === state.assetId) || marketAssets.find(item => item.id === state.assetId);
            if (!asset) return state;
            const currentCondition = Math.max(35, Math.min(100, state.condition ?? 100));
            let nextValue = Math.max(0, Math.round(Number(asset.price || 0)));
            let valueTrend = Number(state.valueTrend || 0);
            let marketCycle = state.marketCycle;
            let neighborhoodTier = state.neighborhoodTier;
            let rentDemand = Math.max(0, Math.min(100, Math.round(Number(state.rentDemand || 0))));
            let vacancyChance = Math.max(0, Math.min(1, Number(state.vacancyChance || 0)));
            if (asset.type === 'Property') {
                const marketUpdate = calculateRealEstateValueUpdate(asset, state, nextPlayer);
                nextValue = marketUpdate.nextValue;
                valueTrend = marketUpdate.valueTrend;
                marketCycle = marketUpdate.snapshot.cycle;
                neighborhoodTier = marketUpdate.snapshot.neighborhoodTier;
                rentDemand = marketUpdate.snapshot.rentDemand;
                vacancyChance = marketUpdate.snapshot.vacancyChance;
            }
            if (!state.rentalListed || asset.type !== 'Property' || state.assetId === nextPlayer.residenceId) {
                return {
                    ...state,
                    currentValue: nextValue,
                    valueTrend,
                    marketCycle,
                    neighborhoodTier,
                    rentDemand,
                    vacancyChance,
                    rentalListed: false,
                    weeklyRent: 0,
                    vacancyWeeks: 0,
                    condition: Math.max(0, Math.min(100, state.condition ?? 100)),
                };
            }
            const marketRent = quoteRealEstateWeeklyRent(asset, { ...state, currentValue: nextValue, condition: currentCondition }, nextPlayer);
            const vacantThisWeek = Math.random() < vacancyChance;
            const rent = vacantThisWeek ? 0 : Math.max(0, Math.round(marketRent * (0.9 + currentCondition / 1000)));
            if (rent > 0) {
                addTransaction(rent, 'ASSET', `Rental income (${asset.name})`);
            }
            const wearChance = vacantThisWeek ? 0.04 : 0.18;
            const conditionDrop = Math.random() < wearChance ? Math.max(1, Math.ceil(asset.price / 5000000)) : 0;
            return {
                ...state,
                currentValue: nextValue,
                valueTrend,
                marketCycle,
                neighborhoodTier,
                rentDemand,
                vacancyChance,
                weeklyRent: marketRent,
                vacancyWeeks: vacantThisWeek ? Math.max(0, Math.round(Number(state.vacancyWeeks || 0))) + 1 : 0,
                condition: Math.max(25, currentCondition - conditionDrop),
                lifetimeRevenue: Math.max(0, (state.lifetimeRevenue || 0) + rent),
            };
        });

    // Annual Fees
    if (nextPlayer.team.agent && nextPlayer.currentWeek === 1) {
        const annualFee = ensureFiniteNumber(nextPlayer.team.agent.annualFee);
        addTransaction(-annualFee, 'EXPENSE', `Agent Fee (${nextPlayer.team.agent.name})`);
        logsToAdd.push({msg: `Paid annual agent fee: $${annualFee.toLocaleString()}`, type: 'neutral'});
    }
    if (nextPlayer.team.manager && nextPlayer.currentWeek === 1) {
        const annualFee = ensureFiniteNumber(nextPlayer.team.manager.annualFee);
        addTransaction(-annualFee, 'EXPENSE', `Manager Fee (${nextPlayer.team.manager.name})`);
        logsToAdd.push({msg: `Paid annual manager fee: $${annualFee.toLocaleString()}`, type: 'neutral'});
    }

    // Weekly Lifestyle Team Fees
    const lifestyleMembers: (keyof typeof nextPlayer.team)[] = ['personalTrainer', 'therapist', 'stylist', 'publicist', 'wellness'];
    lifestyleMembers.forEach(role => {
        const member = nextPlayer.team[role] as TeamMember | null;
        if (member) {
            addTransaction(-member.weeklyCost, 'EXPENSE', `${member.type} Fee (${member.name})`);
        }
    });
    emitLoopStage('creator_talent_done', {
        talent_roster: nextPlayer.studio?.talentRoster?.length || 0,
        team_agents: nextPlayer.team.availableAgents?.length || 0,
    });

    // --- NEW: BUSINESS SIMULATION ---
    emitLoopStage('business_sim_start');
    if (nextPlayer.businesses && nextPlayer.businesses.length > 0) {
        const updatedBusinesses: Business[] = [];
        nextPlayer.businesses.forEach(biz => {
            try {
                const res = processBusinessWeek(
                    biz,
                    nextPlayer.stats.fame,
                    nextPlayer.currentWeek,
                    getPlayerLanguage(nextPlayer),
                    nextPlayer.age
                );
                updatedBusinesses.push(res.updated);

                res.rightsReportsReady.forEach(report => {
                    const opportunity = report.opportunity;
                    const reportMessageId = `rights_report_${report.studioId}_${opportunity.id}`;
                    if (nextPlayer.inbox.some(message => message.id === reportMessageId)) return;
                    nextPlayer.inbox.unshift({
                        id: reportMessageId,
                        sender: 'Studio Intelligence',
                        subject: `Inside Report Ready: ${opportunity.title}`,
                        text: `Your research team finished its confidential review of ${opportunity.title}. Open Development Lab > Market > IP Rights to review the findings and decide your next move.`,
                        type: 'RIGHTS_REPORT',
                        data: {
                            studioId: report.studioId,
                            studioName: report.studioName,
                            opportunityId: opportunity.id,
                            opportunityTitle: opportunity.title,
                            report: opportunity.insideReport,
                        },
                        isRead: false,
                        weekSent: nextPlayer.currentWeek >= 52 ? 1 : nextPlayer.currentWeek + 1,
                    });
                    logsToAdd.push({
                        msg: `🔎 Inside Report ready: ${opportunity.title}.`,
                        type: 'neutral',
                    });
                });

                res.rightsNegotiationResponses.forEach(response => {
                    const negotiation = response.negotiation;
                    const messageId = `rights_negotiation_${response.studioId}_${negotiation.id}_r${negotiation.round}_${negotiation.status}`;
                    if (nextPlayer.inbox.some(message => message.id === messageId)) return;
                    const subjectPrefix: Record<string, string> = {
                        ACCEPTED: t(language, 'services.rightsNegotiation.inbox.subject.ACCEPTED'),
                        COUNTEROFFER: t(language, 'services.rightsNegotiation.inbox.subject.COUNTEROFFER'),
                        CREATIVE_GUARANTEE: t(language, 'services.rightsNegotiation.inbox.subject.CREATIVE_GUARANTEE'),
                        RIVAL_OFFER: t(language, 'services.rightsNegotiation.inbox.subject.RIVAL_OFFER'),
                        BIDDING_WAR: t(language, 'services.rightsNegotiation.inbox.subject.BIDDING_WAR'),
                        REJECTED: t(language, 'services.rightsNegotiation.inbox.subject.REJECTED'),
                    };
                    nextPlayer.inbox.unshift({
                        id: messageId,
                        sender: t(language, 'services.rightsNegotiation.inbox.sender'),
                        subject: t(language, 'services.rightsNegotiation.inbox.subjectWithTitle', {
                            prefix: subjectPrefix[negotiation.status] || t(language, 'services.rightsNegotiation.inbox.subject.default'),
                            title: negotiation.opportunityTitle,
                        }),
                        text: t(language, 'services.rightsNegotiation.inbox.text', {
                            summary: negotiation.responseSummary || t(language, 'services.rightsNegotiation.inbox.fallbackSummary'),
                        }),
                        type: 'RIGHTS_NEGOTIATION',
                        data: {
                            studioId: response.studioId,
                            studioName: response.studioName,
                            negotiation,
                        },
                        isRead: false,
                        weekSent: nextPlayer.currentWeek >= 52 ? 1 : nextPlayer.currentWeek + 1,
                    });
                    logsToAdd.push({
                        msg: t(language, 'services.rightsNegotiation.inbox.log', {
                            title: negotiation.opportunityTitle,
                            status: t(language, `services.rightsNegotiation.status.${negotiation.status}`),
                        }),
                        type: negotiation.status === 'ACCEPTED'
                            ? 'positive'
                            : negotiation.status === 'REJECTED'
                                ? 'negative'
                                : 'neutral',
                    });
                });
                
                // Color-code alerts based on content
                res.alerts.forEach(a => {
                    let type: 'neutral' | 'positive' | 'negative' = 'neutral';
                    if (
                        a.includes('REFUSE') || 
                        a.includes('CRITICAL') || 
                        a.includes('overwhelmed') || 
                        a.includes('burning') || 
                        a.includes('Complaints') || 
                        a.includes('No one') || 
                        a.includes('Bad reviews')
                    ) {
                        type = 'negative';
                    } else if (a.includes('sold out')) {
                        type = 'positive';
                    }
                    logsToAdd.push({ msg: a, type });
                });
            } catch (error) {
                console.error('Business week failed during week processing:', error, biz);
                updatedBusinesses.push(biz);
            }
        });
        nextPlayer.businesses = updatedBusinesses;
    } 
    emitLoopStage('business_sim_done', {
        businesses: nextPlayer.businesses?.length || 0,
        rights_inbox: nextPlayer.inbox?.filter(message => message.type === 'RIGHTS_NEGOTIATION' || message.type === 'RIGHTS_REPORT').length || 0,
    });

    if (pendingUniversePayouts.length > 0 && nextPlayer.businesses?.length) {
        let totalUniversePayout = 0;
        nextPlayer.businesses = nextPlayer.businesses.map(business => {
            const payouts = pendingUniversePayouts.filter(payout => payout.studioId === business.id);
            if (payouts.length === 0) return business;

            const payoutTotal = payouts.reduce((sum, payout) => sum + payout.amount, 0);
            totalUniversePayout += payoutTotal;

            const updatedBusiness: Business = {
                ...business,
                balance: business.balance + payoutTotal,
                stats: {
                    ...business.stats,
                    weeklyRevenue: (business.stats.weeklyRevenue || 0) + payoutTotal,
                    weeklyProfit: (business.stats.weeklyProfit || 0) + payoutTotal,
                    lifetimeRevenue: (business.stats.lifetimeRevenue || 0) + payoutTotal
                }
            };

            payouts.forEach(payout => {
                appendStudioLedgerEntry(updatedBusiness, {
                    id: `studio_ledger_universe_${payout.universeId}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    amount: payout.amount,
                    type: 'UNIVERSE',
                    label: payout.label
                });
            });

            return recalculateBusinessValuation(updatedBusiness, nextPlayer);
        });

        if (totalUniversePayout > 0) {
            logsToAdd.push({ msg: `🌐 Universe licensing paid $${totalUniversePayout.toLocaleString()} into studio capital.`, type: 'positive' });
        }
    }

    addTransaction(-propertyUpkeep, 'EXPENSE', 'Property Upkeep');

    // Bankruptcy Check
    if (nextPlayer.money < 0) {
        if (weeklySubscriptionCost > 0 || propertyUpkeep > 0) {
             const paidCommitments = nextPlayer.commitments.filter(c => (c.type === 'COURSE' || c.type === 'GYM'));
             if (paidCommitments.length > 0) {
                 logsToAdd.push({ msg: t(language, 'services.gameLoop.commitment.autoPayFailed'), type: 'negative' });
                 nextPlayer.commitments = nextPlayer.commitments.filter(c => c.type !== 'COURSE' && c.type !== 'GYM');
             }
        }
    }

    // Job Income / Course Costs
    nextPlayer.commitments.forEach(c => {
        const commitmentName = getCommitmentDisplayName(c, language);
        if ((c.payoutType === 'WEEKLY' || c.type === 'JOB') && c.income > 0) {
            addTransaction(c.income, 'SALARY', t(language, 'services.gameLoop.commitment.wages', { name: commitmentName }));
            logsToAdd.push({ msg: t(language, 'services.gameLoop.commitment.earned', { amount: `$${c.income.toLocaleString()}`, name: commitmentName }), type: 'positive' });
        }
        if (c.weeklyCost) {
            addTransaction(-c.weeklyCost, 'EXPENSE', t(language, 'services.gameLoop.commitment.fee', { name: commitmentName }));
        }
    });

    // --- 4. ENERGY & SKILLS ---
    const commitmentDrain = nextPlayer.commitments.reduce((sum, c) => {
        if (c.type === 'ACTING_GIG') return sum;
        return sum + c.energyCost;
    }, 0); 
    
    // Business Drain Removed
    const totalDrain = commitmentDrain;
    
    resetWeeklyEnergy(nextPlayer);
    spendPlayerEnergy(nextPlayer, totalDrain, 'Weekly commitments');

    // --- UPDATED STAT DECAY & LIFESTYLE BONUSES ---
    // DIFFICULTY SCALING: Reduce decay for new players to make early game easier.
    // As fame grows, life gets harder/busier, normalizing decay.
    let difficultyMult = 1.0;
    if (nextPlayer.stats.fame < 25) {
        difficultyMult = 0.3; // Easy mode (70% slower decay)
    } else if (nextPlayer.stats.fame < 50) {
        difficultyMult = 0.7; // Medium mode
    }

    const trainer = nextPlayer.team.personalTrainer;
    const therapist = nextPlayer.team.therapist;
    const stylist = nextPlayer.team.stylist;
    const publicist = nextPlayer.team.publicist;
    const wellness = nextPlayer.team.wellness;

    const getBonusGain = (member: TeamMember | null) => {
        if (!member) return 0;
        if (member.tier === 'ROOKIE') return 0.5;
        if (member.tier === 'STANDARD') return 1.0;
        if (member.tier === 'ELITE' || member.tier === 'LEGEND') return 1.5;
        return 0;
    };

    const BASE_DECAY = 1.0 * difficultyMult; 
    const HEALTH_DECAY = 0.5 * difficultyMult;
    const FAME_DECAY = 0.18; // Middle ground: fame still grows, but weekly momentum no longer snowballs too quickly.
    emitLoopStage('health_social_start');
    const healthBeforeWeeklyChanges = Number(nextPlayer.stats.health || 0);

    const bodyBonus = getBonusGain(trainer);
    nextPlayer.stats.body = Math.max(0, Math.min(100, nextPlayer.stats.body - BASE_DECAY + bodyBonus));

    const wellnessBonus = getBonusGain(wellness);
    nextPlayer.stats.health = Math.max(0, Math.min(100, nextPlayer.stats.health - HEALTH_DECAY + wellnessBonus));
    const healthAfterBaseAndWellness = nextPlayer.stats.health;

    const happinessBonus = getBonusGain(therapist);
    nextPlayer.stats.happiness = Math.max(0, Math.min(100, nextPlayer.stats.happiness - BASE_DECAY + happinessBonus));

    const looksBonus = getBonusGain(stylist);
    nextPlayer.stats.looks = Math.max(0, Math.min(100, nextPlayer.stats.looks - BASE_DECAY + looksBonus));

    const fameBonus = getBonusGain(publicist);
    if (nextPlayer.stats.fame > 0) {
        nextPlayer.stats.fame = Math.max(0, Math.min(100, nextPlayer.stats.fame - FAME_DECAY + fameBonus));
    }

    const healthConditionsResult = processHealthConditionsWeek(nextPlayer);
    nextPlayer = healthConditionsResult.player;
    nextPlayer.activeHealthConditions = healthConditionsResult.player.activeHealthConditions || [];
    const healthAfterConditions = nextPlayer.stats.health;
    healthConditionsResult.logs.forEach(log => logsToAdd.push({ msg: log.message, type: log.type }));
    if (healthConditionsResult.news.length) {
        nextPlayer.news = [...healthConditionsResult.news, ...(nextPlayer.news || [])].slice(0, 80);
    }

    // --- CRITICAL WELLBEING SAFETY NET ---
    // Low wellbeing should matter at any age, but early players should get recoverable scares before harsh outcomes.
    const absoluteWeekForWellbeing = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const lastWellbeingAlertWeek = ensureFiniteNumber(nextPlayer.flags.lastWellbeingAlertAbsoluteWeek, 0);
    const currentHealth = ensureFiniteNumber(nextPlayer.stats.health, 50);
    const currentMood = ensureFiniteNumber(nextPlayer.stats.happiness, 50);
    const currentBody = ensureFiniteNumber(nextPlayer.stats.body, 50);
    const currentLooks = ensureFiniteNumber(nextPlayer.stats.looks, 50);
    const criticalHealthWeeks = ensureFiniteNumber(nextPlayer.flags.criticalHealthWeeks, 0);
    const trainerCare = trainer ? getBonusGain(trainer) : 0;
    const therapistCare = therapist ? getBonusGain(therapist) : 0;
    const wellnessCare = wellness ? getBonusGain(wellness) : 0;
    const totalCareSupport = trainerCare + therapistCare + wellnessCare;
    const lastHealthCrisisWeek = ensureFiniteNumber(nextPlayer.flags.lastHealthCrisisAbsoluteWeek, -999);
    const recentHealthCrises = absoluteWeekForWellbeing - lastHealthCrisisWeek <= 26
        ? ensureFiniteNumber(nextPlayer.flags.recentHealthCrises, 0)
        : Math.max(0, ensureFiniteNumber(nextPlayer.flags.recentHealthCrises, 0) - 1);
    const careDiscount = Math.min(0.45, (trainerCare + therapistCare) * 0.06 + wellnessCare * 0.14);

    if (currentHealth <= 0) {
        const newCriticalWeeks = criticalHealthWeeks + 1;
        nextPlayer.flags.criticalHealthWeeks = newCriticalWeeks;
        const newRecentHealthCrises = recentHealthCrises + 1;
        nextPlayer.flags.recentHealthCrises = newRecentHealthCrises;
        nextPlayer.flags.lastHealthCrisisAbsoluteWeek = absoluteWeekForWellbeing;

        const wealthBuffer = Math.max(0, Math.min(2500, Math.floor(ensureFiniteNumber(nextPlayer.money) * 0.015)));
        const famePremium = Math.floor(ensureFiniteNumber(nextPlayer.stats.fame) * 35);
        const relapsePremium = Math.min(5000, Math.max(0, newRecentHealthCrises - 1) * 900);
        const emergencyBill = Math.max(350, Math.min(12000, Math.floor((450 + wealthBuffer + famePremium + relapsePremium) * (1 - careDiscount))));
        addTransaction(-emergencyBill, 'EXPENSE', t(language, 'services.gameLoop.wellbeing.finance.emergencyHospital'));

        const recoveryBoost = 18 + Math.floor(trainerCare * 4) + Math.floor(therapistCare * 2) + Math.floor(wellnessCare * 6);
        nextPlayer.stats.health = Math.max(nextPlayer.stats.health, recoveryBoost);
        nextPlayer.stats.happiness = Math.max(0, Math.min(100, nextPlayer.stats.happiness + 4 + Math.floor(therapistCare * 2)));
        nextPlayer.stats.body = Math.max(0, Math.min(100, nextPlayer.stats.body + 2 + Math.floor(trainerCare)));
        if (newRecentHealthCrises >= 2) {
            nextPlayer.stats.fame = Math.max(0, nextPlayer.stats.fame - Math.min(4, newRecentHealthCrises));
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - Math.min(3, newRecentHealthCrises - 1));
        }

        logsToAdd.push({
            msg: t(language, 'services.gameLoop.wellbeing.log.healthCrisis', {
                amount: `$${emergencyBill.toLocaleString()}`,
                supportText: t(language, totalCareSupport > 0 ? 'services.gameLoop.wellbeing.log.healthCrisis.teamSupport' : 'services.gameLoop.wellbeing.log.healthCrisis.roughRecovery')
            }),
            type: 'negative'
        });
        if (newRecentHealthCrises >= 2) {
            logsToAdd.push({ msg: t(language, 'services.gameLoop.wellbeing.log.repeatedHealthScare'), type: 'negative' });
        }

        if (nextPlayer.stats.fame >= 35) {
            const healthNews: NewsItem = {
                id: `news_health_scare_${Date.now()}`,
                headline: t(language, 'services.gameLoop.wellbeing.news.healthScareHeadline', { playerName: nextPlayer.name }),
                subtext: t(language, 'services.gameLoop.wellbeing.news.healthScareSubtext'),
                category: 'YOU',
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                impactLevel: 'MEDIUM'
            };
            nextPlayer.news = [healthNews, ...nextPlayer.news].slice(0, 50);
        }

        const ageRisk = nextPlayer.age < 30 ? 0.003 : nextPlayer.age < 45 ? 0.008 : nextPlayer.age < 65 ? 0.025 : 0.08;
        const repeatRisk = newRecentHealthCrises >= 4 ? 0.06 : newRecentHealthCrises >= 2 ? 0.02 : 0;
        const moodRisk = currentMood <= 5 ? 0.01 : 0;
        if (Math.random() < ageRisk + repeatRisk + moodRisk) {
            nextPlayer.flags = {
                ...(nextPlayer.flags || {}),
                isDead: true,
                deathCauseTitle: 'Health collapse',
                deathCauseDetail: 'Repeated medical emergencies overwhelmed your body. Better health care, rest, trainer support, or wellness treatment could have reduced the risk.',
                deathCauseType: 'HEALTH_COLLAPSE',
                deathCauseWeek: nextPlayer.currentWeek,
                deathCauseYear: nextPlayer.age,
            };
            logsToAdd.push({ msg: t(language, 'services.gameLoop.wellbeing.log.healthCollapsed'), type: 'negative' });
        }
    } else if (currentHealth < 10) {
        nextPlayer.flags.criticalHealthWeeks = criticalHealthWeeks + 1;
        const newRecentHealthCrises = recentHealthCrises + 1;
        nextPlayer.flags.recentHealthCrises = newRecentHealthCrises;
        nextPlayer.flags.lastHealthCrisisAbsoluteWeek = absoluteWeekForWellbeing;
        const urgentRelapsePremium = Math.min(1600, Math.max(0, newRecentHealthCrises - 1) * 350);
        const urgentCareBill = Math.max(120, Math.min(3600, Math.floor((180 + Math.floor(nextPlayer.stats.fame * 15) + Math.floor(Math.max(0, nextPlayer.money) * 0.006) + urgentRelapsePremium) * (1 - careDiscount))));
        addTransaction(-urgentCareBill, 'EXPENSE', t(language, 'services.gameLoop.wellbeing.finance.urgentCare'));
        nextPlayer.stats.health = Math.max(nextPlayer.stats.health, 14 + Math.floor(trainerCare * 3) + Math.floor(therapistCare) + Math.floor(wellnessCare * 5));
        nextPlayer.stats.happiness = Math.max(0, Math.min(100, nextPlayer.stats.happiness + 2 + Math.floor(therapistCare)));
        if (newRecentHealthCrises >= 3) {
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 1);
        }
        logsToAdd.push({
            msg: t(language, 'services.gameLoop.wellbeing.log.urgentCare', {
                amount: `$${urgentCareBill.toLocaleString()}`,
                supportText: totalCareSupport > 0 ? t(language, 'services.gameLoop.wellbeing.log.urgentCare.teamSupport') : ''
            }),
            type: 'negative'
        });
    } else {
        nextPlayer.flags.criticalHealthWeeks = 0;
        nextPlayer.flags.recentHealthCrises = recentHealthCrises;
        if (currentHealth < 25 && absoluteWeekForWellbeing - lastWellbeingAlertWeek >= 4) {
            nextPlayer.flags.lastWellbeingAlertAbsoluteWeek = absoluteWeekForWellbeing;
            logsToAdd.push({ msg: t(language, 'services.gameLoop.wellbeing.log.lowHealthWarning'), type: 'negative' });
        }
    }

    if (currentMood <= 0) {
        const burnoutWeeks = ensureFiniteNumber(nextPlayer.flags.burnoutWeeks, 0) + 1;
        nextPlayer.flags.burnoutWeeks = burnoutWeeks;
        const supportCost = therapist ? Math.max(0, Math.floor(therapist.weeklyCost * 0.5)) : 90;
        addTransaction(-supportCost, 'EXPENSE', t(language, therapist ? 'services.gameLoop.wellbeing.finance.therapyCrisis' : 'services.gameLoop.wellbeing.finance.mentalHealthSupport'));
        nextPlayer.stats.happiness = Math.max(nextPlayer.stats.happiness, 12 + Math.floor(therapistCare * 4));
        nextPlayer.stats.health = Math.max(0, Math.min(100, nextPlayer.stats.health + 2));
        logsToAdd.push({ msg: t(language, 'services.gameLoop.wellbeing.log.burnout'), type: 'negative' });
    } else {
        nextPlayer.flags.burnoutWeeks = 0;
    }

    if ((currentBody <= 0 || currentLooks <= 0) && absoluteWeekForWellbeing - ensureFiniteNumber(nextPlayer.flags.lastConditionAlertAbsoluteWeek, 0) >= 6) {
        nextPlayer.flags.lastConditionAlertAbsoluteWeek = absoluteWeekForWellbeing;
        logsToAdd.push({
            msg: t(language, 'services.gameLoop.wellbeing.log.conditionWarning'),
            type: 'negative'
        });
    }
    const healthAfterCrisisRecovery = nextPlayer.stats.health;
    
    // --- ORGANIC FOLLOWER GROWTH ---
    if (nextPlayer.stats.fame > 10) {
        const organicGrowthIG = Math.floor(nextPlayer.stats.fame * 50 + (nextPlayer.stats.reputation * 10));
        nextPlayer.stats.followers += organicGrowthIG;

        const currentX = nextPlayer.x.followers || 0;
        const organicGrowthX = Math.floor(nextPlayer.stats.fame * 30 + (nextPlayer.stats.reputation * 5));
        nextPlayer.x.followers = currentX + organicGrowthX;
    }

    // --- PASSIVE SOCIAL MEDIA ENGAGEMENT GROWTH ---
    const processPassiveEngagement = (posts: any[]) => {
        return posts.map(p => {
            const age = getWeeksSince(p.week || p.timestamp, p.year || p.yearUploaded, nextPlayer.currentWeek, nextPlayer.age);
            if (age >= 1 && age <= 8) {
                const decay = 1 / (age + 1);
                const viralBurst = Math.random() > 0.95 ? 3.0 : 1.0;
                const growthRate = (0.02 + Math.random() * 0.03) * decay * viralBurst;
                const addedLikes = Math.floor(p.likes * growthRate);
                
                if (addedLikes > 0) {
                    p.likes += addedLikes;
                    if (p.comments !== undefined) p.comments += Math.floor(addedLikes * 0.05);
                    if (p.shares !== undefined) p.shares += Math.floor(addedLikes * 0.03);
                    if (p.saves !== undefined) p.saves += Math.floor(addedLikes * 0.04);
                    if (p.retweets !== undefined) p.retweets += Math.floor(addedLikes * 0.2);
                    if (p.replies !== undefined) p.replies += Math.floor(addedLikes * 0.05);
                }
            }
            return p;
        });
    };

    if (nextPlayer.instagram?.posts) nextPlayer.instagram.posts = processPassiveEngagement(nextPlayer.instagram.posts) as InstaPost[];
    if (nextPlayer.x?.posts) nextPlayer.x.posts = processPassiveEngagement(nextPlayer.x.posts) as XPost[];

    // Process Skills
    let newSkills = { ...nextPlayer.stats.skills };
    let newWriterStats = nextPlayer.writerStats ? { ...nextPlayer.writerStats } : { creativity: 0, dialogue: 0, structure: 0, pacing: 0 };
    let newDirectorStats = nextPlayer.directorStats ? { ...nextPlayer.directorStats } : { vision: 0, technical: 0, leadership: 0, style: 0 };
    
    nextPlayer.commitments = nextPlayer.commitments.map(c => {
        if (c.type === 'COURSE') {
            if (c.skillGains) {
                Object.entries(c.skillGains).forEach(([key, baseGain]) => {
                    const skillKey = key as keyof ActorSkills;
                    const currentVal = newSkills[skillKey];
                    const actualGain = (baseGain as number) * (1 - (currentVal / 120));
                    newSkills[skillKey] = Math.min(100, currentVal + actualGain);
                });
            }
            if (c.writerGains) {
                Object.entries(c.writerGains).forEach(([key, baseGain]) => {
                    const statKey = key as keyof WriterStats;
                    const currentVal = newWriterStats[statKey];
                    const actualGain = (baseGain as number) * (1 - (currentVal / 120));
                    newWriterStats[statKey] = Math.min(100, currentVal + actualGain);
                });
            }
            if (c.directorGains) {
                Object.entries(c.directorGains).forEach(([key, baseGain]) => {
                    const statKey = key as keyof DirectorStats;
                    const currentVal = newDirectorStats[statKey];
                    const actualGain = (baseGain as number) * (1 - (currentVal / 120));
                    newDirectorStats[statKey] = Math.min(100, currentVal + actualGain);
                });
            }
            if (c.weeksCompleted !== undefined && c.totalDuration !== undefined) {
                 return { ...c, weeksCompleted: c.weeksCompleted + 1 };
            }
        }
        if (c.type === 'GYM' && c.statGains) {
             if (c.statGains.health) nextPlayer.stats.health = Math.min(100, nextPlayer.stats.health + c.statGains.health);
             if (c.statGains.looks) nextPlayer.stats.looks = Math.min(100, nextPlayer.stats.looks + c.statGains.looks);
        }
        return c;
    });

    // Clean up finished courses
    nextPlayer.commitments = nextPlayer.commitments.filter(c => {
        if (c.type === 'COURSE' && c.weeksCompleted !== undefined && c.totalDuration !== undefined) {
            if (c.weeksCompleted >= c.totalDuration) {
                logsToAdd.push({ msg: t(language, 'services.gameLoop.commitment.courseCompleted', { name: getCommitmentDisplayName(c, language) }), type: 'positive' });
                if (c.skillGains) {
                    Object.keys(c.skillGains).forEach((key) => {
                         const skillKey = key as keyof ActorSkills;
                         newSkills[skillKey] = Math.min(100, newSkills[skillKey] + 2);
                    });
                }
                if (c.writerGains) {
                    Object.keys(c.writerGains).forEach((key) => {
                         const statKey = key as keyof WriterStats;
                         newWriterStats[statKey] = Math.min(100, newWriterStats[statKey] + 2);
                    });
                }
                if (c.directorGains) {
                    Object.keys(c.directorGains).forEach((key) => {
                         const statKey = key as keyof DirectorStats;
                         newDirectorStats[statKey] = Math.min(100, newDirectorStats[statKey] + 2);
                    });
                }
                return false;
            }
        }
        return true;
    });

    nextPlayer.stats.skills = newSkills;
    nextPlayer.writerStats = newWriterStats;
    nextPlayer.directorStats = newDirectorStats;
    nextPlayer.stats.talent = calculateGlobalTalent(newSkills, nextPlayer.writerStats, nextPlayer.directorStats);
    const finalWeeklyHealth = nextPlayer.stats.health;
    nextPlayer.flags.lastHealthBreakdown = {
        year: nextPlayer.age,
        week: nextPlayer.currentWeek,
        before: healthBeforeWeeklyChanges,
        baseDecay: -HEALTH_DECAY,
        wellnessRecovery: wellnessBonus,
        conditionImpact: healthAfterConditions - healthAfterBaseAndWellness,
        crisisRecovery: healthAfterCrisisRecovery - healthAfterConditions,
        activityRecovery: finalWeeklyHealth - healthAfterCrisisRecovery,
        after: finalWeeklyHealth,
        netChange: finalWeeklyHealth - healthBeforeWeeklyChanges,
        activeConditions: (nextPlayer.activeHealthConditions || []).map(condition => (
            getHealthConditionLabel(condition, language)
        )),
    };
    emitLoopStage('health_social_done', {
        health_conditions: nextPlayer.activeHealthConditions?.length || 0,
        instagram_posts: nextPlayer.instagram?.posts?.length || 0,
        x_posts: nextPlayer.x?.posts?.length || 0,
    });

    // --- 5. RELATIONSHIPS DECAY ---
    nextPlayer.relationships = nextPlayer.relationships.map(rel => {
        if (rel.relation === 'Deceased Parent') {
            return rel;
        }

        const lastInteraction = rel.lastInteractionWeek || nextPlayer.currentWeek;
        const weeksSince = nextPlayer.currentWeek - lastInteraction;
        let newCloseness = rel.closeness;
        if (weeksSince > 4) {
             newCloseness = Math.max(0, newCloseness - 2);
        }
        
        if (nextPlayer.stats.fame > 40 && newCloseness < 20 && ['Parent', 'Partner'].includes(rel.relation)) {
            if (Math.random() < 0.03) {
                const template = ESTRANGEMENT_TEMPLATES[Math.floor(Math.random() * ESTRANGEMENT_TEMPLATES.length)];
                const headline = template.replace('{Name}', nextPlayer.name).replace('{Rel}', rel.relation.toLowerCase());
                
                nextPlayer.news.unshift({
                    id: `news_estrange_${Date.now()}`,
                    headline: headline,
                    category: 'TOP_STORY',
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    impactLevel: 'HIGH'
                });
                logsToAdd.push({ msg: `📰 Tabloids are reporting on your bad relationship with ${rel.name}.`, type: 'negative' });
            }
        }
        return { ...rel, closeness: newCloseness, lastInteractionWeek: lastInteraction };
    });

    // --- 6. SPONSORSHIPS ---
    let processedSponsorships: any[] = [];
    nextPlayer.activeSponsorships.forEach(spon => {
        const req: any = spon.requirements || {};
        const totalDone = Math.max(0, Number(req.progress || 0));
        const goal = Math.max(1, Number(req.totalRequired || 1));
        const deliverablesComplete = totalDone >= goal;
        const remainingBeforePayment = Math.max(1, Number(spon.durationWeeks || 1));
        const isFinalPaidWeek = remainingBeforePayment <= 1;
        addTransaction(
            spon.weeklyPay,
            'SPONSORSHIP',
            `${spon.brandName}${isFinalPaidWeek ? ' Final' : ''} Payment`,
        );
        const nextWeekSpon = { 
            ...spon, 
            durationWeeks: Math.max(0, remainingBeforePayment - 1),
            weeksCompleted: (spon.weeksCompleted || 0) + 1 
        };

        if (isFinalPaidWeek && deliverablesComplete) {
            logsToAdd.push({ msg: `✅ Campaign completed with ${spon.brandName}. All promised weekly payments were paid.`, type: 'positive' });
            nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 5);
        } else if (isFinalPaidWeek) {
            const penalty = spon.penalty || 0;
            addTransaction(-penalty, 'EXPENSE', `Breach of Contract (${spon.brandName})`);
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 10);
            logsToAdd.push({ msg: `❌ CONTRACT BREACHED: Failed to complete tasks for ${spon.brandName}. Penalty applied.`, type: 'negative' });
        } else {
            processedSponsorships.push(nextWeekSpon);
        }
    });
    nextPlayer.activeSponsorships = processedSponsorships;

    const remainingYoutubeCollabs: any[] = [];
    nextPlayer.youtube.activeCollabs.forEach(collab => {
        const nextCollab = { ...collab, expiresInWeeks: (collab.expiresInWeeks ?? 1) - 1 };
        if (nextCollab.expiresInWeeks <= 0) {
            logsToAdd.push({ msg: t(language, 'services.youtube.log.missedCollab', { creator: collab.creatorName, concept: collab.conceptTitle }), type: 'negative' });
        } else {
            remainingYoutubeCollabs.push(nextCollab);
        }
    });
    nextPlayer.youtube.activeCollabs = remainingYoutubeCollabs;

    const remainingYoutubeBrandDeals: any[] = [];
    nextPlayer.youtube.activeBrandDeals.forEach(deal => {
        const nextDeal = { ...deal, expiresInWeeks: (deal.expiresInWeeks ?? 1) - 1 };
        if (nextDeal.expiresInWeeks <= 0) {
            addTransaction(-deal.penalty, 'EXPENSE', t(language, 'services.youtube.finance.missedBrand', { brand: deal.brandName }));
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 4);
            logsToAdd.push({ msg: t(language, 'services.youtube.log.missedBrand', { brand: deal.brandName }), type: 'negative' });
        } else {
            remainingYoutubeBrandDeals.push(nextDeal);
        }
    });
    nextPlayer.youtube.activeBrandDeals = remainingYoutubeBrandDeals;

    emitLoopStage('commitments_releases_start');

    // --- 7. APPLICATIONS ---
    const nextApplications: Application[] = [];
    const newAuditionCommitments: Commitment[] = [];
    const castingAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const lastCastingMomentumWeek = ensureFiniteNumber(nextPlayer.flags.lastCastingMomentumAbsoluteWeek, -999);
    const storedCastingMomentum = castingAbsoluteWeek - lastCastingMomentumWeek > 8
        ? 0
        : Math.max(0, Math.min(3, Math.floor(ensureFiniteNumber(nextPlayer.flags.castingApplicationMomentum, 0))));
    const resolvingAuditionApps = nextPlayer.applications.filter(app =>
        app.type === 'AUDITION'
        && app.weeksRemaining - 1 <= 0
        && app.data
        && typeof app.data === 'object'
    );
    const baseCastingEvaluations = resolvingAuditionApps.map(app => ({
        app,
        evaluation: evaluateCastingApplication(nextPlayer, app.data as AuditionOpportunity, 0)
    }));
    const momentumTargetId = baseCastingEvaluations
        .filter(entry => entry.evaluation.plausible)
        .sort((a, b) => b.evaluation.baseChance - a.evaluation.baseChance)[0]?.app.id;
    let shortlistedAnyApplication = false;
    let rejectedPlausibleApplication = false;

    nextPlayer.applications.forEach(app => {
        const weeksLeft = app.weeksRemaining - 1;
        if (weeksLeft <= 0) {
            if (app.type === 'AUDITION') {
                if (!app.data || typeof app.data !== 'object') {
                    logsToAdd.push({ msg: `Application data expired for "${app.name}".`, type: 'neutral' });
                    return;
                }
                const opp = app.data as AuditionOpportunity;
                const evaluation = evaluateCastingApplication(
                    nextPlayer,
                    opp,
                    app.id === momentumTargetId ? storedCastingMomentum : 0
                );
                const passedShortlist = Math.random() < evaluation.finalChance;
                if (passedShortlist) {
                    const duration = getPhaseDuration('AUDITION');
                    
                    newAuditionCommitments.push({
                        id: `aud_active_${Date.now()}_${Math.random()}`,
                        name: opp.projectName,
                        type: 'ACTING_GIG',
                        roleType: opp.roleType,
                        energyCost: 0,
                        income: 0,
                        lumpSum: opp.estimatedIncome,
                        payoutType: 'LUMPSUM',
                        projectDetails: applyOpportunityIdentityToProject(opp, nextPlayer),
                        projectPhase: 'AUDITION',
                        phaseWeeksLeft: duration, 
                        totalPhaseDuration: duration,
                        auditionPerformance: 0,
                        productionPerformance: 0,
                        agentCommission: opp.source === 'AGENT' ? (nextPlayer.team.agent?.commission || 0) : 0,
                        royaltyPercentage: opp.royaltyPercentage
                    });
                    shortlistedAnyApplication = true;
                    logsToAdd.push({ msg: `🎫 Audition Invite: "${opp.projectName}". Prepare yourself!`, type: 'positive' });
                } else {
                    const feedback = getRoleRejectionFeedback(nextPlayer, opp, 'APPLICATION', undefined, language);
                    addCastingFeedbackMessage(app.name, 'APPLICATION', feedback);
                    if (evaluation.plausible) rejectedPlausibleApplication = true;
                    logsToAdd.push({ msg: `❌ Application declined for "${app.name}". ${feedback.reasons[0] || feedback.summary}`, type: 'negative' });
                }
            }
        } else {
            nextApplications.push({ ...app, weeksRemaining: weeksLeft });
        }
    });
    nextPlayer.applications = nextApplications;
    if (shortlistedAnyApplication) {
        nextPlayer.flags.castingApplicationMomentum = 0;
        nextPlayer.flags.lastCastingMomentumAbsoluteWeek = castingAbsoluteWeek;
    } else if (rejectedPlausibleApplication) {
        // At most one point per week, regardless of how many roles the player applies for.
        nextPlayer.flags.castingApplicationMomentum = Math.min(3, storedCastingMomentum + 1);
        nextPlayer.flags.lastCastingMomentumAbsoluteWeek = castingAbsoluteWeek;
    } else if (storedCastingMomentum === 0) {
        nextPlayer.flags.castingApplicationMomentum = 0;
    }

    // --- 8. CAREER COMMITMENTS & 9. ACTIVE RELEASES (Collapsed for brevity, logic maintained) ---
    // ... [Career logic processing remains identical to original provided code] ...
    // Assuming logic integrity is maintained from existing file provided in prompt.
    // Re-injecting the full robust career logic:

    const nextCommitments: Commitment[] = [];
    const newReleases: ActiveRelease[] = [];
    nextPlayer = prepareSubsidiaryProjectsForGameLoop(nextPlayer);
    
    nextPlayer.commitments.forEach(c => {
        let updatedC = { ...c };
        const isPersonalCareerRole = c.type === 'ACTING_GIG'
            ? isPlayerCastInProject(c)
            : c.type === 'DIRECTOR_GIG'
                ? (isPlayerDirectingProject(c) || !c.projectDetails?.directorId)
                : c.type === 'WRITER_GIG';
        if (c.type === 'ACTING_GIG' && isPersonalCareerRole && (c.projectPhase === 'AUDITION' || c.projectPhase === 'PRODUCTION')) {
            const passivePoints = calculatePassiveGain(nextPlayer.stats.talent);
            if (passivePoints > 0) {
                if (c.projectPhase === 'AUDITION') updatedC.auditionPerformance = Math.min(100, (updatedC.auditionPerformance || 0) + passivePoints);
                else updatedC.productionPerformance = Math.min(100, (updatedC.productionPerformance || 0) + passivePoints);
            }
        }

        // Allow studio projects (JOB with projectPhase) to fall through to phase logic
        const isStudioProject = updatedC.type === 'JOB' && updatedC.projectPhase !== undefined;
        const isStudioProductionProject = isStudioProject && Boolean(updatedC.projectDetails?.studioId);

        if (updatedC.type !== 'ACTING_GIG' && updatedC.type !== 'DIRECTOR_GIG' && updatedC.type !== 'WRITER_GIG' && !isStudioProject) {
            if (updatedC.type === 'JOB' && updatedC.durationLeft !== undefined) {
                 const newDuration = updatedC.durationLeft - 1;
                 if (newDuration <= 0) { logsToAdd.push({ msg: `Contract ended at ${updatedC.name}.`, type: 'neutral' }); return; }
                 nextCommitments.push({ ...updatedC, durationLeft: newDuration });
                 return;
            }
            nextCommitments.push(updatedC);
            return;
        }

        if (isStudioProductionProject) {
            updatedC = ensureProductionCalendarForCommitment(updatedC);
            if (updatedC.projectPhase === 'PRE_PRODUCTION' || updatedC.projectPhase === 'PRODUCTION' || updatedC.projectPhase === 'POST_PRODUCTION') {
                updatedC = advanceProductionCalendarWeek(updatedC);
            }
        }

        const weeksLeft = (updatedC.phaseWeeksLeft || 1) - 1;

        if (updatedC.projectPhase === 'SCHEDULED') {
            if (weeksLeft <= 0) {
                const duration = isStudioProductionProject
                    ? getProductionCalendarPhaseDuration(updatedC, 'PRE_PRODUCTION', getPhaseDuration('PRE_PRODUCTION'))
                    : getPhaseDuration('PRE_PRODUCTION');
                logsToAdd.push({ msg: `🎬 Production gearing up for "${updatedC.name}". Entering Pre-Production.`, type: 'positive' });
                nextCommitments.push({ ...updatedC, projectPhase: 'PRE_PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, productionPerformance: 50 });
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
            return;
        }

        if (updatedC.projectPhase === 'PLANNING') {
            if (weeksLeft <= 0) {
                const duration = isStudioProductionProject
                    ? getProductionCalendarPhaseDuration(updatedC, 'PRE_PRODUCTION', getPhaseDuration('PRE_PRODUCTION'))
                    : getPhaseDuration('PRE_PRODUCTION');
                logsToAdd.push({ msg: `📜 Planning for "${updatedC.name}" is complete. Entering Pre-Production.`, type: 'neutral' });
                nextCommitments.push({ ...updatedC, projectPhase: 'PRE_PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, auditionPerformance: 0 });
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'PRE_PRODUCTION') {
            if (weeksLeft <= 0) {
                const duration = isStudioProductionProject
                    ? getProductionCalendarPhaseDuration(updatedC, 'PRODUCTION', getPhaseDuration('PRODUCTION'))
                    : getPhaseDuration('PRODUCTION');
                logsToAdd.push({ msg: `🎬 Pre-production wrapped for "${updatedC.name}". Filming begins!`, type: 'positive' });
                nextCommitments.push({ ...updatedC, projectPhase: 'PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, productionPerformance: 0 });
                // FIX: Grant +1 Experience here for roles that skipped the 'AUDITION' phase (like Direct Offers) to ensure progression
                if (isPersonalCareerRole) nextPlayer.stats.experience = Math.min(100, nextPlayer.stats.experience + 1);
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'AUDITION') {
            if (weeksLeft <= 0) {
                const result = checkAuditionPass(nextPlayer, updatedC);
                if (result.passed) {
                    const duration = isStudioProductionProject
                        ? getProductionCalendarPhaseDuration(updatedC, 'PRODUCTION', getPhaseDuration('PRODUCTION'))
                        : getPhaseDuration('PRODUCTION');
                    logsToAdd.push({ msg: `🎉 CAST! You booked the role in "${updatedC.name}"! Production starts now.`, type: 'positive' });
                    if (updatedC.projectDetails?.isFamous) {
                        nextPlayer.world.famousMoviesReleased.push(updatedC.name);
                        nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 10); 
                    }
                    nextCommitments.push({ ...updatedC, projectPhase: 'PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, productionPerformance: 0 });
                    nextPlayer.stats.experience = Math.min(100, nextPlayer.stats.experience + 1);
                } else {
                    const feedbackSource = updatedC.projectDetails
                        ? { project: updatedC.projectDetails, roleType: updatedC.roleType } as AuditionOpportunity
                        : undefined;
                    const feedback = getRoleRejectionFeedback(nextPlayer, feedbackSource, 'AUDITION', result.rivalWinner, language);
                    addCastingFeedbackMessage(updatedC.name, 'AUDITION', feedback);
                    logsToAdd.push({ msg: `❌ Rejection: "${updatedC.name}". ${result.reason} ${feedback.reasons[0] || ''}`, type: 'negative' });
                }
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'PRODUCTION') {
            // Check for Production Crisis (Traits & General)
            const crisis = checkForProductionCrisis(nextPlayer, updatedC);
            if (crisis) {
                if (!nextPlayer.pendingEvents) nextPlayer.pendingEvents = [];
                nextPlayer.pendingEvents.push({
                    id: crisis.id,
                    week: nextPlayer.currentWeek,
                    type: 'PRODUCTION_CRISIS',
                    title: crisis.title,
                    description: crisis.description,
                    data: {
                        crisisId: crisis.id,
                        projectId: updatedC.id,
                        titleKey: crisis.titleKey,
                        descriptionKey: crisis.descriptionKey,
                        textVars: crisis.textVars,
                        trait: (crisis as any).trait,
                        npcId: (crisis as any).npcId,
                        isGeneral: (crisis as any).isGeneral,
                        templateIndex: (crisis as any).templateIndex,
                        isGenerative: (crisis as any).isGenerative,
                        options: crisis.options.map((o, i) => ({
                            label: o.label,
                            labelKey: o.labelKey,
                            textVars: o.textVars,
                            isGolden: o.isGolden,
                            index: i
                        }))
                    }
                });
                logsToAdd.push({ msg: `⚠️ CRISIS on the set of "${updatedC.name}"!`, type: 'negative' });
            }

            // Check for Director Decision
            const decision = checkForDirectorDecision(nextPlayer, updatedC);
            if (decision) {
                if (!nextPlayer.pendingEvents) nextPlayer.pendingEvents = [];
                nextPlayer.pendingEvents.push({
                    id: decision.id,
                    week: nextPlayer.currentWeek,
                    type: 'DIRECTOR_DECISION',
                    title: decision.title,
                    description: decision.description,
                    data: {
                        crisisId: decision.id,
                        projectId: updatedC.id,
                        titleKey: decision.titleKey,
                        descriptionKey: decision.descriptionKey,
                        textVars: decision.textVars,
                        options: decision.options.map((o, i) => ({
                            label: o.label,
                            labelKey: o.labelKey,
                            textVars: o.textVars,
                            isGolden: o.isGolden,
                            index: i
                        }))
                    }
                });
                logsToAdd.push({ msg: `🎬 Creative Decision needed for "${updatedC.name}"!`, type: 'neutral' });
            }

            const productionHealthIncident = isPersonalCareerRole ? getProductionHealthIncident(nextPlayer, updatedC) : null;
            if (productionHealthIncident) {
                const incident = applyHealthConditionIncident(nextPlayer, productionHealthIncident, {
                    sourceLabel: `Production on "${updatedC.name}"`,
                    detail: `A demanding shoot created a medical issue that should be treated in Wellness.`,
                    publicity: (nextPlayer.stats.fame || 0) >= 45 ? 'PUBLIC_RISK' : 'STANDARD',
                });
                nextPlayer = {
                    ...incident.player,
                    flags: {
                        ...(incident.player.flags || {}),
                        lastProductionHealthIncidentAbsoluteWeek: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
                    },
                    inbox: [...incident.inbox, ...(incident.player.inbox || [])].slice(0, 120),
                    news: [...incident.news, ...(incident.player.news || [])].slice(0, 100),
                };
                incident.logs.forEach(log => logsToAdd.push({ msg: log.message, type: log.type }));
            }

            if (weeksLeft <= 0) {
                const duration = isStudioProductionProject
                    ? getProductionCalendarPhaseDuration(updatedC, 'POST_PRODUCTION', getPhaseDuration('POST_PRODUCTION'))
                    : getPhaseDuration('POST_PRODUCTION');
                logsToAdd.push({ msg: `🎬 That's a wrap on "${updatedC.name}"! Moving to post-production.`, type: 'positive' });
                nextCommitments.push({
                    ...updatedC,
                    projectPhase: 'POST_PRODUCTION',
                    phaseWeeksLeft: duration,
                    totalPhaseDuration: duration,
                    promotionalBuzz: Number.isFinite(Number(updatedC.promotionalBuzz))
                        ? Number(updatedC.promotionalBuzz)
                        : Number(updatedC.projectDetails?.hiddenStats?.rawHype || 0),
                });
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'POST_PRODUCTION') {
            if (weeksLeft <= 0) {
                logsToAdd.push({ msg: `🎬 Post-production complete for "${updatedC.name}"! Ready for release strategy.`, type: 'positive' });
                nextCommitments.push({ ...updatedC, projectPhase: 'AWAITING_RELEASE', phaseWeeksLeft: 0, totalPhaseDuration: 0 });
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'AWAITING_RELEASE') {
            const isStudioProject = updatedC.projectDetails?.studioId !== undefined;
            
            if (updatedC.projectDetails?.releaseStrategy) {
                if (weeksLeft <= 0) {
                    let imdb = calculateIMDbRating(updatedC);
                const budget = updatedC.projectDetails?.estimatedBudget || getEstimatedBudget(updatedC.projectDetails?.budgetTier || 'LOW');
                const isTV = updatedC.projectDetails?.type === 'SERIES';
                const isStreamingOnly = isTV || updatedC.projectDetails?.releaseStrategy === 'STREAMING_ONLY';

                let releaseMusicImpact = updatedC.projectDetails
                    ? calculateProjectMusicImpact(updatedC.projectDetails, updatedC.projectDetails.musicPlan, getMusicArtistCatalog(nextPlayer.world))
                    : undefined;

                if (updatedC.projectDetails) {
                    if (!updatedC.projectDetails.castList) updatedC.projectDetails.castList = generateCastList(nextPlayer, updatedC.projectDetails, updatedC.roleType || 'MINOR');
                    
                    // Calculate Fame Multiplier for Acting Gig
                    const castIds = updatedC.projectDetails.castList.map(c => c.npcId).filter(Boolean) as string[];
                    
                    let talentValue = 0;
                    if (updatedC.type === 'ACTING_GIG') talentValue = getActorTalent(nextPlayer.stats.skills);
                    else if (updatedC.type === 'DIRECTOR_GIG') talentValue = getDirectorTalent(nextPlayer.directorStats || { vision: 0, technical: 0, leadership: 0, style: 0 });
                    else if (updatedC.type === 'WRITER_GIG') talentValue = getWriterTalent(nextPlayer.writerStats || { creativity: 0, dialogue: 0, structure: 0, pacing: 0 });

                    updatedC.projectDetails.hiddenStats.fameMultiplier = calculateProjectFameMultiplier(
                        castIds, 
                        updatedC.projectDetails.directorName, 
                        nextPlayer.stats.fame,
                        talentValue
                    );

                    const castDepth = calculateCastDepthScore(
                        updatedC.projectDetails.castList.length,
                        updatedC.projectDetails.genre,
                        updatedC.projectDetails.budgetTier,
                        updatedC.projectDetails.hiddenStats.castingStrength
                    );
                    updatedC.projectDetails.hiddenStats.castDepthScore = updatedC.projectDetails.hiddenStats.castDepthScore ?? castDepth.score;
                    updatedC.projectDetails.hiddenStats.castDepthNote = updatedC.projectDetails.hiddenStats.castDepthNote ?? castDepth.note;
                    releaseMusicImpact = calculateProjectMusicImpact(updatedC.projectDetails, updatedC.projectDetails.musicPlan, getMusicArtistCatalog(nextPlayer.world));
                    updatedC.projectDetails.hiddenStats = applyMusicImpactToHiddenStats(
                        updatedC.projectDetails.hiddenStats,
                        releaseMusicImpact,
                        updatedC.projectDetails.musicPlan
                    );

                    const studioSlateFatigue = calculateStudioSlateFatigue(nextPlayer, updatedC.projectDetails, updatedC.id);
                    updatedC.projectDetails.hiddenStats.studioSlateFatigueScore = studioSlateFatigue.score;
                    updatedC.projectDetails.hiddenStats.studioSlateFatigueLabel = studioSlateFatigue.label;
                    if (studioSlateFatigue.label !== 'FRESH') {
                        const fatigueDetails = studioSlateFatigue.notes.length ? `: ${studioSlateFatigue.notes.join(', ')}` : '';
                        logsToAdd.push({
                            msg: `📉 Audience response: "${updatedC.name}" enters a ${studioSlateFatigue.label.toLowerCase()} studio slate${fatigueDetails}.`,
                            type: 'neutral',
                        });
                    }
                    const quality = Math.max(1, updatedC.projectDetails.hiddenStats.qualityScore - (studioSlateFatigue.reviewPenalty * 2));
                    imdb = Math.max(1, Math.min(10, imdb - (studioSlateFatigue.reviewPenalty * 0.32)));
                    const isRecast = updatedC.projectDetails.hiddenStats.isRecast;
                    updatedC.projectDetails.reviews = generateReviews(
                        quality,
	                        updatedC.projectDetails.genre,
	                        nextPlayer.name,
	                        isRecast,
	                        updatedC.projectDetails.hiddenStats.castDepthScore,
	                        updatedC.projectDetails.budgetTier,
	                        updatedC.projectDetails.format || 'LIVE_ACTION',
	                        updatedC.projectDetails.subjectName,
	                        language,
	                        updatedC.projectDetails.estimatedBudget || budget
	                    );
                }

                let streamingState: StreamingState | undefined = undefined;
                if (isStreamingOnly && updatedC.projectDetails) {
                    const isOwnedPlatformOriginal = Boolean(updatedC.projectDetails.hiddenStats.ownedStreamingOriginal);
                    if (isOwnedPlatformOriginal) {
                        const ownedPlatformName = nextPlayer.ownedStreamingPlatform.identity?.name || 'EMPIRE+';
                        logsToAdd.push({ msg: `📺 "${updatedC.name}" premiered as a ${ownedPlatformName} Original! IMDb Page Created.`, type: 'positive' });
                    } else {
                        const isAlreadySold = !!updatedC.projectDetails.hiddenStats.platformId;
                        const platformId = (updatedC.projectDetails.hiddenStats.platformId as PlatformId) || determineStreamingAcquisition(updatedC.projectDetails);
                        streamingState = { platformId, weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false };
                        logsToAdd.push({ msg: `📺 "${updatedC.name}" is now streaming on ${PLATFORMS[platformId].name}! IMDb Page Created.`, type: 'positive' });

                        // Update platform state only if not already sold (otherwise it was paid during bidding)
                        if (!isAlreadySold && nextPlayer.world.platforms && nextPlayer.world.platforms[platformId]) {
                            const platform = nextPlayer.world.platforms[platformId];
                            // Estimate acquisition cost
                            const cost = Math.floor((updatedC.projectDetails?.estimatedBudget || 0) * 0.4 * PLATFORMS[platformId].payoutMult);
                            platform.cashReserve = Math.max(0, platform.cashReserve - cost);
                            platform.recentHits += 1;
                        }
                    }
                } else {
                    logsToAdd.push({ msg: `🌍 RELEASE DAY: "${updatedC.name}" hits theaters! IMDb Page Created.`, type: 'positive' });
                }
                
                if (updatedC.lumpSum && isPersonalCareerRole) {
                    let finalPay = updatedC.lumpSum;
                    if (updatedC.agentCommission) {
                        const commAmt = Math.floor(finalPay * updatedC.agentCommission);
                        finalPay -= commAmt;
                        addTransaction(-commAmt, 'EXPENSE', `Agent Commission (${updatedC.name})`);
                    }
                    addTransaction(finalPay, 'SALARY', `Salary: ${updatedC.name}`);
                    logsToAdd.push({ msg: `💰 Payday! Received $${finalPay.toLocaleString()} for "${updatedC.name}".`, type: 'positive' });
                }
                
                if (updatedC.projectDetails) {
                    if (isPersonalCareerRole) {
                        const releaseExperienceGain = calculateProjectExperienceGain(
                            getPlayerProjectRoleType(updatedC.roleType, updatedC.projectDetails.castList),
                            imdb,
                            updatedC.projectDetails.budgetTier,
                            updatedC.projectDetails.isFamous,
                            isStudioProject
                        );
	                        nextPlayer.stats.experience = Math.min(100, nextPlayer.stats.experience + releaseExperienceGain);
	                        rewardGenreExperience(nextPlayer, updatedC.projectDetails.genre, Math.max(1, releaseExperienceGain * 0.8));
	                        if (releaseExperienceGain > 1) {
	                            logsToAdd.push({ msg: `🎭 Career XP: "${updatedC.name}" added ${releaseExperienceGain} experience from a meaningful credit.`, type: 'positive' });
	                        }
	                    }

                    let accumulatedBuzz = updatedC.promotionalBuzz || 0;
                    
                    // Add Red Carpet Hype
                    if (updatedC.projectDetails.hiddenStats.redCarpetHype) {
                        accumulatedBuzz += updatedC.projectDetails.hiddenStats.redCarpetHype;
                    }
                    
                    // Add Festival Hype
                    if (updatedC.projectDetails.hiddenStats.festivalPremiere) {
                        accumulatedBuzz += 25; // Significant boost for festival premiere
                        updatedC.projectDetails.hiddenStats.prestigeBonus = (updatedC.projectDetails.hiddenStats.prestigeBonus || 0) + 1;
                    }

                    if (releaseMusicImpact && releaseMusicImpact.score > 0) {
                        accumulatedBuzz += releaseMusicImpact.socialHypeLift + Math.round(releaseMusicImpact.trailerStrengthLift * 0.6);
                        if (releaseMusicImpact.awardChanceLift > 0) {
                            updatedC.projectDetails.hiddenStats.prestigeBonus = (updatedC.projectDetails.hiddenStats.prestigeBonus || 0) + (releaseMusicImpact.awardChanceLift / 12);
                        }
                        if (releaseMusicImpact.score >= 58) {
                            const leadCredit = updatedC.projectDetails.musicPlan?.credits?.[0];
                            const musicCampaignNews: NewsItem = {
                                id: `music_campaign_${updatedC.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                                headline: `${updatedC.name} gains music buzz from ${leadCredit?.artistName || 'its soundtrack campaign'}.`,
                                subtext: releaseMusicImpact.headline,
                                category: 'INDUSTRY',
                                week: nextPlayer.currentWeek,
                                year: nextPlayer.age,
                                impactLevel: releaseMusicImpact.score >= 76 ? 'HIGH' : 'MEDIUM'
                            };
                            nextPlayer.news = [musicCampaignNews, ...(nextPlayer.news || [])].slice(0, 50);
                        }
                        if (releaseMusicImpact.mismatchBacklashRisk >= 42 || releaseMusicImpact.controversyRisk >= 42) {
                            const musicBacklashPost: XPost = {
                                id: `music_backlash_${updatedC.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                                authorId: 'film_music_watch',
                                authorName: 'Film Music Watch',
                                authorHandle: '@filmmusicwatch',
                                authorAvatar: 'https://api.dicebear.com/9.x/initials/svg?seed=FMW',
                                content: `${updatedC.name}'s soundtrack push is getting attention, but fans are arguing whether the artist fit actually matches the movie.`,
                                timestamp: Date.now(),
                                likes: 2200 + releaseMusicImpact.socialHypeLift * 120,
                                retweets: 340 + releaseMusicImpact.mismatchBacklashRisk * 18,
                                replies: 180 + releaseMusicImpact.controversyRisk * 12,
                                isPlayer: false,
                                isLiked: false,
                                isRetweeted: false,
                                isVerified: true,
                                postType: 'FILM_OPINION',
                                controversyScore: Math.max(releaseMusicImpact.mismatchBacklashRisk, releaseMusicImpact.controversyRisk),
                                quoteList: releaseMusicImpact.warnings.slice(0, 2)
                            };
                            nextPlayer.x = {
                                ...nextPlayer.x,
                                feed: [musicBacklashPost, ...(nextPlayer.x?.feed || [])].slice(0, 80)
                            };
                        }
                    }

                    // Rival Clash Penalty
                    const rivalsThisWeek = nextPlayer.world.projects.filter(p => p.weekReleased === nextPlayer.currentWeek && p.id !== updatedC.id);
                    const heavyHitters = rivalsThisWeek.filter(r => r.budgetTier === 'HIGH').length;
                    const clashPenalty = (rivalsThisWeek.length * 5) + (heavyHitters * 15);
                    accumulatedBuzz = Math.max(0, accumulatedBuzz - clashPenalty);

                    const budgetTier = updatedC.projectDetails.budgetTier;
                    const theatricalWeekRange = getTheatricalWeekRange(budgetTier);
                    const maxTheatricalWeeks = Math.floor(
                        Math.random() * (theatricalWeekRange.max - theatricalWeekRange.min + 1)
                    ) + theatricalWeekRange.min;

                        const releaseFundingEconomics = getProjectFundingEconomics(updatedC, budget);
		                    let newRelease: ActiveRelease = {
	                        id: updatedC.id, name: updatedC.name, type: updatedC.projectDetails.type, roleType: getPlayerProjectRoleType(updatedC.roleType, updatedC.projectDetails.castList),
	                        projectDetails: updatedC.projectDetails, weekNum: 1, weeklyGross: [], totalGross: 0, budget: budget,
                        status: updatedC.projectDetails.hiddenStats.ownedStreamingOriginal ? 'FINISHED' : 'RUNNING', imdbRating: imdb, productionPerformance: updatedC.productionPerformance || 50,
                        distributionPhase: isStreamingOnly ? 'STREAMING' : 'THEATRICAL',
                        streaming: streamingState,
                        streamingRevenue: updatedC.projectDetails.streamingRevenue || 0,
                        soundtrackRevenue: 0,
                        weeklySoundtrackRevenue: [],
                        soundtrackRevenueBreakdown: mergeSoundtrackRevenueBreakdowns(),
                        weeklySoundtrackBreakdowns: [],
                        investorPlan: updatedC.projectDetails.investorPlan,
                        investorPayouts: updatedC.projectDetails.investorPlan
                            ? (updatedC.projectDetails.investorPayouts || { lifetimeInvestorPayout: 0, weeklyInvestorPayouts: [] })
                            : undefined,
                        royaltyPercentage: updatedC.royaltyPercentage,
                        studioRoyaltyPercentage: updatedC.projectDetails.hiddenStats.backendPct,
                        streamingUpfrontFee: isStreamingOnly ? Math.max(0, Number(updatedC.projectDetails.streamingRevenue || 0)) : 0,
                        streamingRoyaltyRevenue: 0,
                        streamingFundingAmount: Math.max(0, Number(updatedC.projectDetails.hiddenStats.nextSeasonFundingAmount || 0)),
                        platformProductionFunding: releaseFundingEconomics.platformFunding,
                        studioCashAtRisk: releaseFundingEconomics.studioCashAtRisk,
                        productionFundApplied: releaseFundingEconomics.productionFund,
                        sequelDecisionWeek: isTV ? 6 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 7),
                        promotionalBuzz: accumulatedBuzz,
                        maxTheatricalWeeks,
                        baseTheatricalWeeks: maxTheatricalWeeks,
                        theatricalExtensionWeeks: 0,
                        theatricalExtensionHistory: [],
                        releaseWeek: nextPlayer.currentWeek,
	                        releaseYear: nextPlayer.age,
	                        releasedAtAbsoluteWeek: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek)
		                    };
		                    if (newRelease.type === 'SERIES' && !newRelease.projectDetails.episodeRatings?.length) {
		                        newRelease.projectDetails = {
		                            ...newRelease.projectDetails,
		                            episodeRatings: generateEpisodeRatings(newRelease)
		                        };
		                    }
                        const openingAudienceReception = buildAudienceReception(
                            newRelease,
                            undefined,
                            nextPlayer.currentWeek,
                            nextPlayer.age
                        );
                        newRelease = {
                            ...newRelease,
                            audienceReception: openingAudienceReception,
                            projectDetails: {
                                ...newRelease.projectDetails,
                                audienceReception: openingAudienceReception
                            }
                        };
		                    newReleases.push(newRelease);
	                    nextPlayer = improveStudioGenreReputation(nextPlayer, updatedC.projectDetails.studioId, updatedC.projectDetails.genre, imdb);
	                }
            } else { 
                nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); 
            }
        } else {
            // Waiting for player to set strategy
            nextCommitments.push({ ...updatedC, phaseWeeksLeft: 0 });
        }
    }
});

    nextPlayer.commitments = [...nextCommitments, ...newAuditionCommitments];
    nextPlayer = syncPlatformAiPlayerCommissionProductions(
        nextPlayer,
        getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
    );

    // --- 9. ACTIVE RELEASES LOGIC ---
    let processedReleases: ActiveRelease[] = [];
    const allRunning = [...nextPlayer.activeReleases, ...newReleases];
    let newNews = [...nextPlayer.news];
    let newInbox = [...nextPlayer.inbox];
    const applyStudioMarketOutcome = (studio: Business | undefined, rel: ActiveRelease, totalRevenue: number) => {
        if (!studio || studio.type !== 'PRODUCTION_HOUSE') return;
        const marketOutcomeRevenue = getProjectMarketOutcomeRevenue(rel, totalRevenue, rel.budget);

        const outcomeResult = applyProductionHouseReleaseOutcome(
            studio,
            {
                id: rel.id,
                name: rel.name,
                totalRevenue: marketOutcomeRevenue,
                budget: rel.budget,
                rating: rel.imdbRating
            },
            nextPlayer.currentWeek,
            nextPlayer.age,
            getPlayerLanguage(nextPlayer)
        );
        const revaluedStudio = recalculateBusinessValuation(outcomeResult.business, nextPlayer);
        Object.assign(studio, revaluedStudio);

        if (outcomeResult.news) {
            newNews.unshift(outcomeResult.news);
            newNews = newNews.slice(0, 50);
        }
        if (outcomeResult.log) {
            logsToAdd.push({
                msg: outcomeResult.log,
                type: outcomeResult.log.includes('pressure') ? 'negative' : 'positive'
            });
        }
    };

    const closeIndependentSubsidiaryStreamingDeal = (
        release: ActiveRelease,
        studio: Business,
        availableBids: NonNullable<ActiveRelease['bids']>,
    ): ActiveRelease => {
        const winningBid = availableBids.reduce((best, bid) => (
            bid.upfront > best.upfront ? bid : best
        ));
        const upfront = Math.max(0, Number(winningBid.upfront || 0));
        const platformName = PLATFORMS[winningBid.platformId]?.name || 'a streaming platform';

        studio.balance += upfront;
        studio.stats.weeklyRevenue += upfront;
        studio.stats.weeklyProfit += upfront;
        studio.stats.lifetimeRevenue += upfront;
        appendStudioLedgerEntry(studio, {
            id: `studio_ledger_independent_streaming_bid_${release.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            amount: upfront,
            type: 'STREAMING_DEAL',
            label: `${release.name} automatic ${platformName} deal`,
            projectId: release.id,
        });

        const platformState = nextPlayer.world.platforms?.[winningBid.platformId];
        if (platformState) {
            platformState.cashReserve = Math.max(0, platformState.cashReserve - upfront);
            platformState.recentHits += 1;
        }

        logsToAdd.push({
            msg: `📺 ${studio.name} accepted the strongest streaming offer for "${release.name}" from ${platformName}.`,
            type: 'positive',
        });

        const signedRelease: ActiveRelease = {
            ...release,
            distributionPhase: 'STREAMING',
            status: 'FINISHED',
            bids: undefined,
            streamingRevenue: Math.max(0, Number(release.streamingRevenue || 0)) + upfront,
            streamingUpfrontFee: Math.max(0, Number(release.streamingUpfrontFee || 0)) + upfront,
            streamingRoyaltyRevenue: Math.max(0, Number(release.streamingRoyaltyRevenue || 0)),
            studioRoyaltyPercentage: Math.max(0, Number(winningBid.royalty || 0)),
            streaming: {
                platformId: winningBid.platformId,
                weekOnPlatform: 1,
                totalViews: 0,
                weeklyViews: [],
                isLeaving: false,
            },
            projectDetails: {
                ...release.projectDetails,
                hiddenStats: {
                    ...release.projectDetails.hiddenStats,
                    platformId: winningBid.platformId,
                    backendPct: Math.max(0, Number(winningBid.royalty || 0)),
                },
            },
        };
        const registration = registerProductionStreamingRightsContract(nextPlayer, {
            sourceProjectId: release.id,
            title: release.name,
            projectType: release.type === 'SERIES' ? 'SERIES' : 'MOVIE',
            genre: release.projectDetails.genre,
            sellerStudioId: studio.id,
            sellerStudioName: studio.name,
            sellerPartyType: 'PLAYER_STUDIO',
            buyerPlatformId: winningBid.platformId,
            minimumGuarantee: upfront,
            platformRevenueShare: 100 - Math.max(0, Math.min(100, Number(winningBid.royalty || 0))),
            productionFunding: winningBid.fundingAmount,
            signedAtAbsoluteWeek: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
            startsAtAbsoluteWeek: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
            durationWeeks: winningBid.duration,
        });
        nextPlayer = registration.player;
        const contractId = registration.contract?.id;
        return contractId ? {
            ...signedRelease,
            streamingContractId: contractId,
            streaming: signedRelease.streaming ? { ...signedRelease.streaming, contractId } : signedRelease.streaming,
        } : signedRelease;
    };

    const processPostReleaseReality = (rel: ActiveRelease): ActiveRelease => {
        const hiddenStats = rel.projectDetails.hiddenStats;
        if (
            rel.weekNum !== 2 ||
            hiddenStats.campaignRealityChecked ||
            !rel.projectDetails.campaignPositioning ||
            !rel.weeklyGross?.length
        ) {
            return rel;
        }

        const reality = evaluatePostReleaseReality(rel, nextPlayer.currentWeek, nextPlayer.age);
        const existingReviews = Array.isArray(rel.projectDetails.reviews) ? rel.projectDetails.reviews : [];
        const hasRealityReview = existingReviews.some(review => review.id === reality.review.id);
        const nextHiddenStats = {
            ...hiddenStats,
            rawHype: Math.max(0, Math.min(100, (hiddenStats.rawHype || 50) + reality.buzzDelta)),
            campaignRealityChecked: true,
            campaignRealityOutcome: reality.outcome
        };

        if (reality.newsItem && !newNews.some(item => item.id === reality.newsItem!.id)) {
            newNews.unshift(reality.newsItem);
            newNews = newNews.slice(0, 50);
        }

        if (reality.socialPost && nextPlayer.x.feed && !nextPlayer.x.feed.some(post => post.id === reality.socialPost!.id)) {
            nextPlayer.x.feed = [reality.socialPost, ...nextPlayer.x.feed].slice(0, 100);
        }

        nextPlayer.stats.reputation = Math.max(0, Math.min(100, nextPlayer.stats.reputation + reality.reputationDelta));
        logsToAdd.push({
            msg: `Reality Check: ${rel.name} - ${reality.label}`,
            type: reality.tone === 'NEGATIVE' ? 'negative' : reality.tone === 'POSITIVE' ? 'positive' : 'neutral'
        });
        trackGameEvent('marketing_reality', {
            projectId: rel.id,
            outcome: reality.outcome,
            tone: reality.tone,
            newsworthy: reality.newsworthy
        });

        return {
            ...rel,
            projectDetails: {
                ...rel.projectDetails,
                campaignRealitySnapshot: reality,
                reviews: hasRealityReview ? existingReviews : [reality.review, ...existingReviews].slice(0, 12),
                hiddenStats: nextHiddenStats
            }
        };
    };

    const phaseTwoAttributionByProject = new Map<string, ReturnType<typeof attributeStreamingTitleRevenue>[number]>();
    const settlementAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const phaseTwoContracts = Object.values(nextPlayer.world.streamingRightsContracts || {}).filter(contract => (
        contract.status === 'ACTIVE'
        && Boolean(contract.biddingSessionId)
        && Boolean(contract.sourceOfferId)
        && settlementAbsoluteWeek >= contract.startsAtAbsoluteWeek
        && settlementAbsoluteWeek < contract.expiresAtAbsoluteWeek
    ));
    const phaseTwoPlatformIds = Array.from(new Set(phaseTwoContracts
        .map(contract => contract.buyer.platformId)
        .filter((platformId): platformId is PlatformId => Boolean(platformId))));
    phaseTwoPlatformIds.forEach(platformId => {
        const platform = nextPlayer.world.platforms?.[platformId];
        const profile = PLATFORM_AI_PROFILES[platformId];
        if (!platform || !profile) return;
        const playerRows = allRunning.flatMap(release => {
            const contract = phaseTwoContracts.find(candidate => (
                candidate.sourceProjectId === release.id
                && candidate.buyer.platformId === platformId
            ));
            if (!contract || release.distributionPhase !== 'STREAMING' || !release.streaming) return [];
            const priorViews = Math.max(0, Number(release.streaming.weeklyViews.at(-1) || 0));
            const quality = Math.max(0, Math.min(100, Number(release.projectDetails.hiddenStats.qualityScore || 50)));
            return [{
                projectId: release.id,
                viewingAccounts: priorViews,
                watchHours: priorViews * (release.type === 'SERIES' ? 2.1 : 1.7),
                subscriberAcquisition: priorViews * Math.max(0.005, (quality - 42) / 1_000),
                subscriberRetention: priorViews * (0.035 + quality / 2_000),
                advertisingRevenue: 0,
                transactionalRevenue: 0,
                taxesRefundsAndStorefrontFees: 0,
            }];
        });
        if (!playerRows.length) return;
        const playerProjectIds = new Set(playerRows.map(row => row.projectId));
        const industryRows = (nextPlayer.world.projects || []).flatMap(project => {
            if (playerProjectIds.has(project.id)) return [];
            const activeWindow = (project.streamingWindows || []).find(window => (
                window.platformId === platformId
                && settlementAbsoluteWeek >= window.startsAtAbsoluteWeek
                && settlementAbsoluteWeek < window.expiresAtAbsoluteWeek
            ));
            const performance = activeWindow?.performance || project.streamingPerformance;
            if (!activeWindow || !performance) return [];
            const ageWeeks = Math.max(0, settlementAbsoluteWeek - activeWindow.startsAtAbsoluteWeek);
            const decay = Math.max(0.16, Math.pow(0.9, ageWeeks));
            const views = Math.max(0, performance.viewsMillions * 1_000_000 * decay);
            return [{
                projectId: project.id,
                viewingAccounts: views,
                watchHours: views * (project.mediaType === 'SERIES' ? 2.1 : 1.7),
                subscriberAcquisition: Math.max(0, performance.subscriberImpactMillions) * 1_000_000 * decay,
                subscriberRetention: views * Math.max(0.02, performance.commercialScore / 1_500),
                advertisingRevenue: 0,
                transactionalRevenue: 0,
                taxesRefundsAndStorefrontFees: 0,
            }];
        });
        const subscribers = Math.max(0, Number(platform.subscribers || 0)) * 1_000_000;
        const catalogueBaseline = {
            projectId: `platform-catalogue:${platformId}`,
            viewingAccounts: subscribers * 0.32,
            watchHours: subscribers * 0.54,
            subscriberAcquisition: subscribers * 0.002,
            subscriberRetention: subscribers * 0.045,
            advertisingRevenue: 0,
            transactionalRevenue: 0,
            taxesRefundsAndStorefrontFees: 0,
        };
        const signals = [...playerRows, ...industryRows, catalogueBaseline];
        const advertisingRevenue = calculateStreamingAdvertisingRevenueFullCurrency({
            subscribers,
            adSupportedShare: profile.adSupportedShare,
            weeklyAdRevenuePerSubscriber: profile.weeklyAdRevenuePerSubscriber,
        });
        const totalViewingAccounts = signals.reduce((sum, row) => sum + Math.max(0, row.viewingAccounts), 0);
        let allocatedAdvertising = 0;
        const signalsWithAdvertising = signals.map((row, index) => {
            const directAdvertising = index === signals.length - 1
                ? Math.max(0, Math.round(advertisingRevenue) - allocatedAdvertising)
                : Math.max(0, Math.round(advertisingRevenue * row.viewingAccounts / Math.max(1, totalViewingAccounts)));
            allocatedAdvertising += directAdvertising;
            return { ...row, advertisingRevenue: directAdvertising };
        });
        attributeStreamingTitleRevenue({
            subscriptionRevenue: calculateStreamingSubscriptionRevenueFullCurrency({
                subscribers,
                monthlyArpu: profile.monthlyArpu,
                paidSubscriberShare: profile.paidSubscriberShare,
            }),
            titles: signalsWithAdvertising,
        }).forEach(row => {
            if (playerProjectIds.has(row.projectId)) phaseTwoAttributionByProject.set(row.projectId, row);
        });
    });

    allRunning.forEach(initialRelease => {
        let rel = processPostReleaseReality(initialRelease);
        if (rel.imdbRating) {
            const change = (Math.random() * 0.1) - 0.05; 
            rel.imdbRating = Math.max(1.1, Math.min(9.9, rel.imdbRating + change));
        }
        const roleAwareReview = generateRoleAwareCriticReview(nextPlayer, rel);
        if (roleAwareReview) {
            const existingReviews = Array.isArray(rel.projectDetails.reviews) ? rel.projectDetails.reviews : [];
            if (!existingReviews.some(review => review.id === roleAwareReview.id)) {
                rel.projectDetails = {
                    ...rel.projectDetails,
                    reviews: [roleAwareReview, ...existingReviews].slice(0, 12),
                };
            }
        }

        if (shouldResolveContinuationDecision(rel)) {
            rel.sequelDecisionMade = true;
            const continuationPerformanceGross = getContinuationPerformanceGross(rel);
            const potential = calculateFuturePotential(
                rel.type,
                rel.projectDetails.budgetTier,
                continuationPerformanceGross,
                rel.budget,
                rel.imdbRating || 5,
                rel.projectDetails.genre,
                rel.roleType,
                rel.type === 'SERIES' ? {
                    totalViews: rel.streaming?.totalViews || 0,
                    recentWeeklyViews: rel.streaming?.weeklyViews?.slice(-4) || [],
                    streamingRevenue: rel.streamingRevenue || 0,
                    productionPerformance: rel.productionPerformance,
                    platformId: (rel.streaming?.platformId || rel.projectDetails.hiddenStats.platformId) as any
                } : undefined
	            );
            if (rel.type !== 'SERIES') {
                potential.isSequelGreenlit = rollContinuationGreenlight(potential.sequelChance, 94);
            }
            const isUniverseContracted = !!(player.activeUniverseContract && rel.projectDetails.universeId && player.activeUniverseContract.universeId === rel.projectDetails.universeId);
            
            // Check if this project belongs to the player's production house
            const isPlayerProduction = nextPlayer.businesses?.some(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');
            if (rel.type === 'SERIES' && rel.projectDetails.episodeRatings?.length) {
                const episodeImpact = getEpisodeRatingsGameplayImpact(rel.projectDetails.episodeRatings);
                potential.renewalChance = clampPercent(potential.renewalChance + episodeImpact.renewalModifier);
                potential.franchiseChance = clampPercent((potential.franchiseChance || 0) + episodeImpact.franchiseValueModifier);
                potential.isRenewed = rollContinuationGreenlight(potential.renewalChance, 94);

                const platformId = (rel.streaming?.platformId || rel.projectDetails.hiddenStats.platformId) as PlatformId | undefined;
                const platform = platformId ? nextPlayer.world.platforms?.[platformId] : undefined;
                if (platform) {
                    platform.reputation = clampPercent(platform.reputation + episodeImpact.platformConfidenceModifier);
                    platform.recentHits = Math.max(0, platform.recentHits + (episodeImpact.platformConfidenceModifier >= 5 ? 1 : episodeImpact.platformConfidenceModifier <= -6 ? -1 : 0));
                }

                const releaseStudio = nextPlayer.businesses?.find(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');
                if (releaseStudio) {
                    releaseStudio.stats = {
                        ...releaseStudio.stats,
                        studioMomentum: clampPercent((releaseStudio.stats.studioMomentum ?? 50) + episodeImpact.studioMomentumModifier),
                        investorConfidence: clampPercent((releaseStudio.stats.investorConfidence ?? 50) + Math.round(episodeImpact.platformConfidenceModifier / 2)),
                        brandHealth: clampPercent((releaseStudio.stats.brandHealth ?? 50) + episodeImpact.studioReputationModifier),
                        hype: clampPercent((releaseStudio.stats.hype ?? 0) + Math.max(-4, Math.min(6, episodeImpact.franchiseValueModifier))),
                    };
                    releaseStudio.stats.valuation = recalculateBusinessValuation(releaseStudio, nextPlayer).stats.valuation;
                }

                nextPlayer.stats.reputation = clampPercent(nextPlayer.stats.reputation + episodeImpact.studioReputationModifier);
                const episodeStory = buildEpisodeRatingsStory({
                    projectId: rel.id,
                    title: rel.name,
                    ratings: rel.projectDetails.episodeRatings,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                });
                if (episodeStory) {
                    newNews.unshift(episodeStory.news);
                    newNews = newNews.slice(0, 50);
                    logsToAdd.push({
                        msg: `📺 Episode scorecard: ${rel.name} ${episodeImpact.signal} signal (${episodeImpact.renewalModifier >= 0 ? '+' : ''}${episodeImpact.renewalModifier} renewal).`,
                        type: episodeImpact.renewalModifier >= 0 ? 'positive' : 'negative',
                    });
	                }
	            }
            if (rel.type === 'SERIES' && !rel.projectDetails.episodeRatings?.length) {
                potential.isRenewed = rollContinuationGreenlight(potential.renewalChance, 94);
            }
            const hasForcedRareChaos = Boolean(rel.projectDetails.hiddenStats.forcedRareChaosKind);
            const shouldCheckRareChaos = hasForcedRareChaos
                || (rel.type === 'SERIES' ? !potential.isRenewed : !potential.isSequelGreenlit);
            const rareChaos = shouldCheckRareChaos
                ? resolveRareHollywoodChaos({
                    release: rel,
                    player: nextPlayer,
                    isPlayerProduction: !!isPlayerProduction
                })
                : null;

            if (rareChaos) {
                Object.assign(potential, rareChaos.futurePotentialPatch);
                const hiddenStats = rel.projectDetails.hiddenStats;
                const { forcedRareChaosKind: _forcedRareChaosKind, ...persistedHiddenStats } = hiddenStats;
                rel.projectDetails.hiddenStats = {
                    ...persistedHiddenStats,
                    rareChaosResolved: true,
                    rareChaosKind: rareChaos.kind,
                    rareChaosReason: rareChaos.reason,
                    rareChaosPlatformId: rareChaos.platformId || null,
                    rareChaosFundingCap: rareChaos.funding?.amount || 0,
                    rareChaosResolvedWeek: nextPlayer.currentWeek,
                    rareChaosResolvedYear: nextPlayer.age,
                    ...(rareChaos.platformId ? { platformId: rareChaos.platformId } : {}),
                    ...(rareChaos.funding ? {
                        nextSeasonFundingAmount: rareChaos.funding.amount,
                        nextSeasonFundingPlatformId: rareChaos.platformId || null,
                        nextSeasonFundingSourceProjectId: rel.id,
                        nextSeasonFundingTier: rareChaos.funding.tier,
                        nextSeasonFundingReason: rareChaos.funding.reason
                    } : {})
                };

                if (rareChaos.funding && rareChaos.platformId && isPlayerProduction) {
                    const studio = nextPlayer.businesses?.find(business =>
                        business.id === rel.projectDetails.studioId
                        && business.type === 'PRODUCTION_HOUSE'
                    );
                    if (studio?.studioState) {
                        const existingFunds = studio.studioState.lockedStreamingFunds || [];
                        const alreadyReserved = existingFunds.some(fund => fund.sourceProjectId === rel.id);
                        if (!alreadyReserved) {
                            studio.studioState.lockedStreamingFunds = [
                                {
                                    id: `rare_chaos_fund_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                                    platformId: rareChaos.platformId,
                                    platformName: rareChaos.platformName || PLATFORMS[rareChaos.platformId].name,
                                    amount: rareChaos.funding.amount,
                                    sourceProjectId: rel.id,
                                    sourceTitle: rel.name,
                                    franchiseId: rel.projectDetails.franchiseId || rel.id,
                                    installmentNumber: rel.projectDetails.installmentNumber || 1,
                                    projectType: rel.type,
                                    createdWeek: nextPlayer.currentWeek,
                                    createdYear: nextPlayer.age,
                                    tier: rareChaos.funding.tier,
                                    reason: rareChaos.funding.reason
                                },
                                ...existingFunds
                            ].slice(0, 30);
                        }
                    }
                }

                logsToAdd.push({
                    msg: `🎲 Rare Hollywood move: ${rareChaos.news.headline}`,
                    type: rareChaos.kind === 'CANCELLED_SHOW_REVIVAL' ? 'positive' : 'neutral'
                });
            }

            if (rel.type === 'SERIES') {
                if (potential.isRenewed) {
                    potential.seriesStatus = 'RUNNING';
                    const returnDecision = getReturnStatusForContinuation(rel, nextPlayer, !!isPlayerProduction, false);
                    potential.playerReturnStatus = returnDecision.status;
                    potential.returnStatusNote = returnDecision.note;
                    rel.futurePotential = potential;

                    if (!isPlayerProduction && returnDecision.getsOffer) {
                        const offer = generateRenewalOffer(rel, nextPlayer);
                        if (rareChaos?.platformId) {
                            offer.opportunity.project.hiddenStats = {
                                ...offer.opportunity.project.hiddenStats,
                                platformId: rareChaos.platformId,
                                rareChaosResolved: true,
                                rareChaosKind: rareChaos.kind,
                                rareChaosReason: rareChaos.reason
                            };
                        }
                        const seasonMatch = offer.opportunity.projectName.match(/Season (\d+)/);
                        const nextSeasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 2;
                        newNews.unshift(rareChaos?.news || generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age, language));
                        newInbox.unshift({
                            id: `renew_offer_${Date.now()}`,
                            sender: rareChaos?.platformName ? `${rareChaos.platformName} Executive` : 'Network Exec',
                            subject: rareChaos?.kind === 'CANCELLED_SHOW_REVIVAL'
                                ? `REVIVAL OFFER: ${offer.opportunity.projectName}`
                                : rareChaos?.kind === 'PLATFORM_MOONSHOT'
                                    ? `RISKY RENEWAL: ${offer.opportunity.projectName}`
                                    : `RENEWAL: ${offer.opportunity.projectName}`,
                            text: rareChaos?.reason || "We are picking up the show for another season.",
                            type: 'OFFER_NEGOTIATION',
                            data: offer,
                            isRead: false,
                            weekSent: nextPlayer.currentWeek,
                            expiresIn: 4
                        });
                    } else if (isPlayerProduction) {
                        const nextSeasonNum = getNextSeasonNumber(rel.name);
                        const sourceStudio = isPlayerProduction
                            ? nextPlayer.businesses?.find(business => (
                                business.id === rel.projectDetails.studioId
                                && business.type === 'PRODUCTION_HOUSE'
                                && Boolean(business.studioState)
                            ))
                            : undefined;
                        const seasonTitle = /Season\s+\d+/i.test(rel.name)
                            ? rel.name.replace(/Season\s+\d+/i, `Season ${nextSeasonNum}`)
                            : `${rel.name} Season ${nextSeasonNum}`;
                        const continuation = sourceStudio?.studioState
                            ? createContinuationScript({
                                player: nextPlayer,
                                studioScripts: sourceStudio.studioState.scripts || [],
                                project: rel,
                                mode: 'SEQUEL',
                                title: seasonTitle,
                            })
                            : null;
                        const existingContinuation = sourceStudio?.studioState?.scripts?.find(script => (
                            script.franchiseId === (rel.projectDetails.franchiseId || rel.id)
                            && script.installmentNumber === nextSeasonNum
                        ));
                        const continuationScript = continuation?.script || existingContinuation;

                        if (continuation?.ok && continuation.script && sourceStudio?.studioState) {
                            sourceStudio.studioState.scripts = [
                                continuation.script,
                                ...(sourceStudio.studioState.scripts || []),
                            ];
                        }

                        if (!continuationScript || !sourceStudio) {
                            potential.seriesStatus = 'RUNNING';
                            rel.futurePotential = potential;
                            newInbox.unshift(createContinuationDecisionMessage({
                                id: `renewal_hold_${rel.id}`,
                                sender: rareChaos?.platformName ? `${rareChaos.platformName} Executive` : 'Network Exec',
                                subject: `Season ${nextSeasonNum} Planning Paused`,
                                text: `${rel.name} has a renewal signal, but no playable Season ${nextSeasonNum} package could be prepared yet. The network is still reviewing the next step.`,
                                week: nextPlayer.currentWeek,
                            }));
                        } else {
                            newNews.unshift(rareChaos?.news || generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age, language));
                            newInbox.unshift(createContinuationDecisionMessage({
                                id: `renewal_decision_${rel.id}`,
                                sender: rareChaos?.platformName ? `${rareChaos.platformName} Executive` : 'Network Exec',
                                subject: rareChaos?.kind === 'PLATFORM_MOONSHOT'
                                    ? `Risky Season ${nextSeasonNum} Bet`
                                    : `Season ${nextSeasonNum} Renewed`,
                                text: `${rel.name} has been renewed. Season ${nextSeasonNum} is waiting in your Studio Vault with the returning-cast decision attached.`,
                                week: nextPlayer.currentWeek,
                                type: 'STUDIO_CONTINUATION' as const,
                                data: {
                                    kind: 'STUDIO_CONTINUATION',
                                    studioId: sourceStudio.id,
                                    scriptId: continuationScript.id,
                                    sourceProjectId: rel.id,
                                    sourceProjectName: rel.name,
                                    seasonNumber: nextSeasonNum,
                                    platformName: rareChaos?.platformName || (rel.streaming ? PLATFORMS[rel.streaming.platformId]?.name : undefined) || 'Network',
                                    castStatus: returnDecision.note,
                                },
                            }));
                        }
                    } else {
	                        const nextSeasonNum = getNextSeasonNumber(rel.name);
	                        newNews.unshift(rareChaos?.news || generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age, language));
	                        const returnStatusNews = createReturnStatusNews(rel.name, returnDecision.status, nextPlayer.currentWeek, nextPlayer.age, true);
	                        if (returnStatusNews) newNews.unshift(returnStatusNews);
	                        newInbox.unshift(createContinuationDecisionMessage({
	                            id: `renewal_without_player_${rel.id}`,
	                            sender: 'Network Exec',
	                            subject: `Season ${nextSeasonNum} Without You`,
	                            text: `${rel.name} was renewed, but the new season is moving forward without your character. ${returnDecision.note}`,
	                            week: nextPlayer.currentWeek
	                        }));
	                    }
	                } else {
	                    potential.seriesStatus = 'CANCELLED';
	                    rel.futurePotential = potential;
	                    const nextSeasonNum = getNextSeasonNumber(rel.name);
	                    newNews.unshift(generateCancellationNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age, language));
	                    newInbox.unshift(createContinuationDecisionMessage({
	                        id: `renewal_pass_${rel.id}`,
	                        sender: 'Network Exec',
	                        subject: `No Season ${nextSeasonNum}`,
	                        text: potential.renewalChance >= 70
	                            ? `${rel.name} had a strong case for renewal, but the network is stopping here. No Season ${nextSeasonNum} is planned.`
	                            : `${rel.name} will not continue to Season ${nextSeasonNum}. The network is treating it as a completed run for now.`,
	                        week: nextPlayer.currentWeek
	                    }));
	                }
	            } else {
	                if (potential.isSequelGreenlit) {
                    const returnDecision = getReturnStatusForContinuation(rel, nextPlayer, !!isPlayerProduction, isUniverseContracted);
                    potential.playerReturnStatus = returnDecision.status;
                    potential.returnStatusNote = returnDecision.note;
                    rel.futurePotential = potential;

                    if (!isUniverseContracted && !isPlayerProduction && returnDecision.getsOffer) {
                        newNews.unshift(rareChaos?.news || generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age, language));
                        const offer = generateSequelOffer(rel, nextPlayer);
                        if (rareChaos?.continuationSubtype === 'REBOOT') {
                            const rebootTitle = `${rel.name}: New Blood`;
                            offer.opportunity.projectName = rebootTitle;
                            offer.opportunity.project = {
                                ...offer.opportunity.project,
                                title: rebootTitle,
                                subtype: 'REBOOT',
                                connectedProjectIntent: 'REBOOT',
                                hiddenStats: {
                                    ...offer.opportunity.project.hiddenStats,
                                    connectedProjectIntent: 'REBOOT',
                                    rareChaosResolved: true,
                                    rareChaosKind: rareChaos.kind,
                                    rareChaosReason: rareChaos.reason
                                }
                            };
                        }
                        newInbox.unshift({
	                            id: `negot_${Date.now()}`,
	                            sender: 'Studio Legal',
	                            subject: rareChaos?.continuationSubtype === 'REBOOT'
	                                ? `Reboot Offer: ${offer.opportunity.projectName}`
	                                : rareChaos?.kind === 'FLOP_SEQUEL_GAMBLE'
	                                    ? `Risky Sequel Bet: ${offer.opportunity.projectName}`
	                                    : `Return Offer: ${offer.opportunity.projectName}`,
                            text: rareChaos?.reason || `We offer you the role in the sequel.`,
                            type: 'OFFER_NEGOTIATION',
                            data: offer,
                            isRead: false,
                            weekSent: nextPlayer.currentWeek,
                            expiresIn: 4
                        });
	                    } else if ((isUniverseContracted || isPlayerProduction) || returnDecision.status === 'RETURNING') {
	                        newNews.unshift(rareChaos?.news || generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age, language));
	                        newInbox.unshift(createContinuationDecisionMessage({
	                            id: `sequel_greenlit_${rel.id}`,
	                            sender: rareChaos?.continuationSubtype === 'REBOOT' ? 'Studio Strategy' : 'Studio Legal',
	                            subject: rareChaos?.kind === 'FLOP_SEQUEL_GAMBLE'
	                                ? `Risky Sequel Bet: ${rel.name}`
	                                : rareChaos?.continuationSubtype === 'REBOOT'
	                                    ? `Reboot Moving Forward: ${rel.name}`
	                                    : `Sequel Greenlit: ${rel.name}`,
	                            text: rareChaos?.reason || (isPlayerProduction
	                                ? `${rel.name} has been cleared for a follow-up from your production house.`
	                                : `${rel.name} is getting a follow-up. ${returnDecision.note}`),
	                            week: nextPlayer.currentWeek
	                        }));
	                    } else {
	                        newNews.unshift(rareChaos?.news || generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age, language));
	                        const returnStatusNews = createReturnStatusNews(rel.name, returnDecision.status, nextPlayer.currentWeek, nextPlayer.age, false);
	                        if (returnStatusNews) newNews.unshift(returnStatusNews);
	                        newInbox.unshift(createContinuationDecisionMessage({
	                            id: `sequel_without_player_${rel.id}`,
	                            sender: 'Studio Legal',
	                            subject: `Sequel Without You: ${rel.name}`,
	                            text: `${rel.name} is getting a follow-up, but the studio is moving on from your character. ${returnDecision.note}`,
	                            week: nextPlayer.currentWeek
	                        }));
	                    }
	                } else {
	                    newNews.unshift(createSequelPassNews(rel, potential, nextPlayer.currentWeek, nextPlayer.age));
	                    newInbox.unshift(createContinuationDecisionMessage({
	                        id: `sequel_pass_${rel.id}`,
	                        sender: 'Studio Strategy',
	                        subject: potential.sequelChance >= 70
	                            ? `No Sequel Despite Hit: ${rel.name}`
	                            : `No Sequel Planned: ${rel.name}`,
	                        text: potential.sequelChance >= 70
	                            ? `${rel.name} performed like sequel material, but the studio is choosing not to continue it right now.`
	                            : `${rel.name} will stay standalone for now. The studio is not opening a sequel room.`,
	                        week: nextPlayer.currentWeek
	                    }));
	                }
	            }
        }

	        if (rel.distributionPhase === 'THEATRICAL') {
	            const prevGross = rel.weeklyGross.length > 0 ? rel.weeklyGross[rel.weeklyGross.length - 1] : 0;
	            const releaseStudio = nextPlayer.businesses?.find(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');
	            const marketDemand = getProjectMarketDemand(rel.projectDetails, nextPlayer.currentWeek, releaseStudio?.studioState?.marketTrends);
	            const studioGenreReputation = getStudioGenreReputation(releaseStudio, rel.projectDetails.genre);
		            const productionRisk = calculateProductionRiskProfile(rel.projectDetails, {
		                budget: rel.budget,
		                imdbRating: rel.imdbRating,
		                productionPerformance: rel.productionPerformance
		            });
		            const existingCapRoll = rel.projectDetails.hiddenStats.boxOfficeCapRoll;
		            const capRoll = typeof existingCapRoll === 'number' && Number.isFinite(existingCapRoll)
		                ? Math.max(0, Math.min(1, existingCapRoll))
		                : Math.random();
		            rel.projectDetails.hiddenStats.boxOfficeCapRoll = capRoll;
		            const uncappedRevenue = calculateWeeklyBoxOffice(
	                rel.weekNum,
	                rel.budget,
                rel.projectDetails.hiddenStats,
                prevGross,
                rel.weekNum === 1 ? rel.promotionalBuzz : undefined,
	                rel.projectDetails.budgetTier,
	                rel.projectDetails.genre,
	                rel.projectDetails.format || 'LIVE_ACTION',
	                marketDemand,
	                studioGenreReputation
	            );
            const riskAdjustedRevenue = Math.floor(uncappedRevenue * productionRisk.theatricalDemandMultiplier);
            if (rel.weekNum === 1 && productionRisk.label !== 'Balanced') {
                const riskTone = productionRisk.riskScore >= 78 ? 'positive' : productionRisk.riskScore < 58 ? 'negative' : 'neutral';
                const riskNotes = productionRisk.notes.length ? `: ${productionRisk.notes.join(', ')}` : '';
                logsToAdd.push({ msg: `🎬 Production risk: "${rel.name}" is ${productionRisk.label}${riskNotes}.`, type: riskTone });
            }
            const charityGoodwillMultiplier = Math.max(0, Math.min(0.03, Number(nextPlayer.flags?.charityMovieGoodwillMultiplier || 0)));
            const goodwillAdjustedRevenue = Math.floor(riskAdjustedRevenue * (1 + charityGoodwillMultiplier));
	            const dynamicBoxOfficeCap = calculateDynamicBoxOfficeTotalCap({
                budgetTier: rel.projectDetails.budgetTier,
                genre: rel.projectDetails.genre,
                format: rel.projectDetails.format || 'LIVE_ACTION',
                hiddenStats: rel.projectDetails.hiddenStats,
                marketDemand,
                studioGenreReputation,
                capRoll
            });
            const thinSpectaclePenalty =
                ['ACTION', 'SCI_FI', 'SUPERHERO', 'ADVENTURE'].includes(rel.projectDetails.genre) &&
                ['HIGH', 'BLOCKBUSTER'].includes(rel.projectDetails.budgetTier) &&
                (rel.projectDetails.hiddenStats.castDepthScore ?? 70) < 55;
            const effectiveTotalCap = thinSpectaclePenalty
                ? Math.floor(dynamicBoxOfficeCap.totalCap * (0.54 + ((rel.projectDetails.hiddenStats.castDepthScore ?? 45) / 180)))
                : dynamicBoxOfficeCap.totalCap;
            rel.projectDetails.hiddenStats.boxOfficeTotalCap = effectiveTotalCap;
            rel.projectDetails.hiddenStats.boxOfficeCapLabel = thinSpectaclePenalty ? 'LIMITED' : dynamicBoxOfficeCap.label;
            const remainingHeadroom = Math.max(0, effectiveTotalCap - rel.totalGross);
            const rawRevenue = Math.min(goodwillAdjustedRevenue, remainingHeadroom);
            const distributionBreakdown = calculateTheatricalDistributionBreakdown(
                rel.projectDetails,
                rawRevenue,
                rel.weekNum
            );
            const revenue = Math.min(distributionBreakdown.gross, remainingHeadroom);
            const finalDistributionBreakdown = revenue === distributionBreakdown.gross
                ? distributionBreakdown
                : calculateTheatricalDistributionBreakdown(rel.projectDetails, revenue, rel.weekNum);
            const newTotal = rel.totalGross + revenue;
            const newWeeklyGross = [...rel.weeklyGross, revenue];
            const newWeeklyStudioReceipts = [...(rel.weeklyStudioReceipts || []), finalDistributionBreakdown.studioReceipts];
            const newWeeklyExhibitorReceipts = [...(rel.weeklyExhibitorReceipts || []), finalDistributionBreakdown.exhibitorReceipts];
            const newWeeklyDistributionBreakdowns = [...(rel.weeklyDistributionBreakdowns || []), finalDistributionBreakdown];
            const weeklySoundtrackBreakdown = calculateWeeklySoundtrackRevenue(rel.projectDetails, {
                week: rel.weekNum,
                theatricalGross: revenue,
                catalog: getMusicArtistCatalog(nextPlayer.world),
                seed: `${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}_theatrical`
            });
            const weeklySoundtrackRevenue = weeklySoundtrackBreakdown.totalRevenue;
            if (weeklySoundtrackRevenue > 0) {
                nextPlayer = applyMusicArtistNpcEarnings(
                    nextPlayer,
                    buildSoundtrackCreditEarnings(rel.projectDetails, weeklySoundtrackRevenue)
                );
                const soundtrackCulture = buildSoundtrackCultureOutcomes(nextPlayer, rel, weeklySoundtrackRevenue, {
                    releaseWeek: rel.weekNum,
                    marketPulse: revenue,
                    source: 'THEATRICAL'
                });
                if (soundtrackCulture.moments.length) {
                    soundtrackCulture.moments.forEach(moment => {
                        if (nextPlayer.world.musicIndustry) {
                            nextPlayer.world.musicIndustry = addMusicCultureMoment(nextPlayer.world.musicIndustry, moment);
                        }
                    });
                    newNews = [...soundtrackCulture.news, ...newNews].slice(0, 50);
                    nextPlayer.x.feed = [...soundtrackCulture.posts, ...(nextPlayer.x.feed || [])].slice(0, 80);
                    soundtrackCulture.logs.forEach(message => logsToAdd.push({ msg: `🎵 ${message}`, type: 'neutral' }));
                    if (soundtrackCulture.artistEarnings.length) {
                        nextPlayer = applyMusicArtistNpcEarnings(nextPlayer, soundtrackCulture.artistEarnings);
                    }
                    if (soundtrackCulture.reputationDelta) {
                        nextPlayer.stats.reputation = Math.max(0, Math.min(100, nextPlayer.stats.reputation + soundtrackCulture.reputationDelta));
                    }
                    if (soundtrackCulture.rawHypeDelta) {
                        rel.projectDetails.hiddenStats.rawHype = Math.max(0, Math.min(100, rel.projectDetails.hiddenStats.rawHype + soundtrackCulture.rawHypeDelta));
                    }
                }
            }
            const newSoundtrackRevenue = (rel.soundtrackRevenue || 0) + weeklySoundtrackRevenue;
            const newWeeklySoundtrackRevenue = [...(rel.weeklySoundtrackRevenue || []), weeklySoundtrackRevenue];
            const newSoundtrackRevenueBreakdown = mergeSoundtrackRevenueBreakdowns(rel.soundtrackRevenueBreakdown, weeklySoundtrackBreakdown);
            const newWeeklySoundtrackBreakdowns = [...(rel.weeklySoundtrackBreakdowns || []), weeklySoundtrackBreakdown].slice(-24);
            const activeInvestorPlan = rel.investorPlan || rel.projectDetails.investorPlan;
            const investorTheatricalPayout = calculateInvestorPayout(activeInvestorPlan, finalDistributionBreakdown.studioReceipts);
            const investorSoundtrackPayout = calculateInvestorPayout(activeInvestorPlan, weeklySoundtrackRevenue);
            const weeklyInvestorPayout = investorTheatricalPayout + investorSoundtrackPayout;
            const newInvestorPayouts = activeInvestorPlan
                ? appendInvestorPayout(rel.investorPayouts, weeklyInvestorPayout)
                : rel.investorPayouts;
            const maxWeeks = rel.maxTheatricalWeeks || 12;
            const baseTheatricalWeeks = rel.baseTheatricalWeeks || maxWeeks;
            const extensionResult = evaluateTheatricalExtension({
                weekNum: rel.weekNum,
                baseTheatricalWeeks,
                maxTheatricalWeeks: maxWeeks,
                extensionWeeks: rel.theatricalExtensionWeeks,
                extensionHistory: rel.theatricalExtensionHistory,
                weeklyGross: newWeeklyGross,
                budget: rel.budget,
                imdbRating: rel.imdbRating || 0,
                marketDemand,
                remainingBoxOfficeHeadroom: Math.max(0, effectiveTotalCap - newTotal),
            });
            const theatricalExtensionHistory = extensionResult.decision
                ? [...(rel.theatricalExtensionHistory || []), extensionResult.decision]
                : (rel.theatricalExtensionHistory || []);
            const isPulledRevenue = rel.weekNum >= 3 && revenue < (rel.budget * 0.05);
            const isPulledTime = rel.weekNum >= maxWeeks && !extensionResult.shouldExtend;
            if (extensionResult.shouldExtend && extensionResult.decision) {
                logsToAdd.push({
                    msg: `🎟️ "${rel.name}" extended ${extensionResult.addedWeeks} week${extensionResult.addedWeeks === 1 ? '' : 's'} for ${getTheatricalExtensionReasonLabel(extensionResult.decision.reason)}.`,
                    type: 'positive'
                });
            }
            const roleVisibility = rel.roleType === 'LEAD' ? 1 : rel.roleType === 'SUPPORTING' ? 0.7 : 0.35;
            const theatricalFamePulse = revenue >= rel.budget * 0.35
                ? 0.45 * roleVisibility
                : revenue >= rel.budget * 0.18
                    ? 0.25 * roleVisibility
                    : revenue >= rel.budget * 0.08
                        ? 0.1 * roleVisibility
                        : 0;
            if (theatricalFamePulse > 0) {
                nextPlayer.stats.fame = Math.max(0, Math.min(100, nextPlayer.stats.fame + theatricalFamePulse));
            }
            
            // Add revenue to player's studio if they own it
            const studioId = rel.projectDetails.studioId;
            const playerStudio = nextPlayer.businesses?.find(b => b.id === studioId);
            if (playerStudio) {
                const studioShare = finalDistributionBreakdown.studioReceipts;
                const netStudioShare = Math.max(0, studioShare - investorTheatricalPayout);
                playerStudio.balance += netStudioShare;
                playerStudio.stats.weeklyRevenue += netStudioShare;
                playerStudio.stats.weeklyProfit += netStudioShare;
                playerStudio.stats.lifetimeRevenue += netStudioShare;
                if (studioShare > 0) {
                    appendStudioLedgerEntry(playerStudio, {
                        id: `studio_ledger_theatrical_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        amount: netStudioShare,
                        type: 'THEATRICAL',
                        label: investorTheatricalPayout > 0
                            ? `${rel.name} theatrical receipts after investor split`
                            : `${rel.name} theatrical receipts (${Math.round(finalDistributionBreakdown.studioShare * 100)}% studio share)`,
                        projectId: rel.id
                    });
                    if (investorTheatricalPayout > 0) {
                        appendStudioLedgerEntry(playerStudio, {
                            id: `studio_ledger_investor_payout_theatrical_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                            week: nextPlayer.currentWeek,
                            year: nextPlayer.age,
                            amount: -investorTheatricalPayout,
                            type: 'INVESTOR_PAYOUT',
                            label: `${rel.name} investor theatrical payout`,
                            projectId: rel.id
                        });
                    }
                }
	                if (weeklySoundtrackRevenue > 0) {
	                    const netSoundtrackRevenue = Math.max(0, weeklySoundtrackRevenue - investorSoundtrackPayout);
                    playerStudio.balance += netSoundtrackRevenue;
                    playerStudio.stats.weeklyRevenue += netSoundtrackRevenue;
                    playerStudio.stats.weeklyProfit += netSoundtrackRevenue;
                    playerStudio.stats.lifetimeRevenue += netSoundtrackRevenue;
                    appendStudioLedgerEntry(playerStudio, {
                        id: `studio_ledger_soundtrack_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        amount: netSoundtrackRevenue,
                        type: 'SOUNDTRACK',
                        label: investorSoundtrackPayout > 0
                            ? `${rel.name} soundtrack revenue after investor split`
                            : `${rel.name} soundtrack revenue`,
                        projectId: rel.id
                    });
                    if (investorSoundtrackPayout > 0) {
                        appendStudioLedgerEntry(playerStudio, {
                            id: `studio_ledger_investor_payout_soundtrack_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                            week: nextPlayer.currentWeek,
                            year: nextPlayer.age,
                            amount: -investorSoundtrackPayout,
                            type: 'INVESTOR_PAYOUT',
                            label: `${rel.name} investor soundtrack payout`,
                            projectId: rel.id
                        });
	                    }
	                }
	                if (weeklyInvestorPayout > 0 && activeInvestorPlan) {
	                    const rememberedStudio = applyInvestorPayoutMemory({
	                        studio: playerStudio,
	                        plan: activeInvestorPlan,
	                        payout: weeklyInvestorPayout,
	                        projectId: rel.id,
	                        projectTitle: rel.name,
	                        week: nextPlayer.currentWeek,
	                        year: nextPlayer.age
	                    });
	                    if (rememberedStudio?.studioState) {
	                        playerStudio.studioState = rememberedStudio.studioState;
	                    }
	                }
	                playerStudio.stats.valuation = recalculateBusinessValuation(playerStudio, nextPlayer).stats.valuation;
	            }

            const theatricalAudienceReception = buildAudienceReception(
                {
                    ...rel,
                    totalGross: newTotal,
                    weeklyGross: newWeeklyGross,
                    soundtrackRevenue: newSoundtrackRevenue,
                    investorPlan: activeInvestorPlan,
                    investorPayouts: newInvestorPayouts
                },
                rel.audienceReception || rel.projectDetails.audienceReception,
                nextPlayer.currentWeek,
                nextPlayer.age
            );
            const theatricalDistributionState = {
                projectDetails: {
                    ...rel.projectDetails,
                    audienceReception: theatricalAudienceReception
                },
                totalGross: newTotal,
                weeklyGross: newWeeklyGross,
                weeklyStudioReceipts: newWeeklyStudioReceipts,
                totalStudioReceipts: (rel.totalStudioReceipts || 0) + finalDistributionBreakdown.studioReceipts,
                weeklyExhibitorReceipts: newWeeklyExhibitorReceipts,
                totalExhibitorReceipts: (rel.totalExhibitorReceipts || 0) + finalDistributionBreakdown.exhibitorReceipts,
                weeklyDistributionBreakdowns: newWeeklyDistributionBreakdowns,
                weeksInTheaters: newWeeklyGross.length,
                maxTheatricalWeeks: extensionResult.newMaxTheatricalWeeks,
                baseTheatricalWeeks,
                theatricalExtensionWeeks: extensionResult.totalExtensionWeeks,
                theatricalExtensionHistory,
                soundtrackRevenue: newSoundtrackRevenue,
                weeklySoundtrackRevenue: newWeeklySoundtrackRevenue,
                soundtrackRevenueBreakdown: newSoundtrackRevenueBreakdown,
                weeklySoundtrackBreakdowns: newWeeklySoundtrackBreakdowns,
                investorPlan: activeInvestorPlan,
                investorPayouts: newInvestorPayouts,
                audienceReception: theatricalAudienceReception
            };

            if (isPulledRevenue || isPulledTime) {
                const totalProjectRevenue = newTotal + newSoundtrackRevenue;
                const { tier, score } = calculateRunOutcome(totalProjectRevenue, rel.budget, rel.imdbRating || 5);
                const memory = nextPlayer.studioMemory[studioId] || { projectOutcomes: [] };
                const newOutcomes = [...memory.projectOutcomes, score];
                if (newOutcomes.length > 3) newOutcomes.shift();
                nextPlayer.studioMemory[studioId] = { projectOutcomes: newOutcomes };
                const consequences = getConsequences(tier, rel.roleType, rel.productionPerformance, rel.projectDetails.hiddenStats.qualityScore, newTotal, rel.budget, rel.projectDetails.isFamous);
                nextPlayer.stats.fame = Math.max(0, Math.min(100, nextPlayer.stats.fame + consequences.fameDelta));
                nextPlayer.stats.reputation = Math.max(0, Math.min(100, nextPlayer.stats.reputation + consequences.repDelta));
                if (consequences.followerDelta > 0) {
                    nextPlayer.stats.followers += consequences.followerDelta;
                    logsToAdd.push({ msg: `📈 Gained ${consequences.followerDelta.toLocaleString()} followers!`, type: 'positive' });
                }
                applyStudioMarketOutcome(playerStudio, rel, totalProjectRevenue);

                if (playerStudio) {
                    // Trigger bidding war for player's studio
                    logsToAdd.push({ msg: `📉 "${rel.name}" left theaters. Awaiting streaming bids!`, type: 'neutral' });
                    
                    // Generate bids
                    if (rel.streaming) {
                        // Already has a streaming deal (accepted while in theaters)
                        processedReleases.push({ ...rel, ...theatricalDistributionState, distributionPhase: 'STREAMING', status: 'FINISHED' });
                    } else {
                        const bids: { platformId: PlatformId, upfront: number, royalty: number, duration: number }[] = [];
                        const isSeries = rel.type === 'SERIES';
                        const platforms = Object.keys(PLATFORMS) as PlatformId[];
                        const bidRiskMultiplier = productionRisk.platformBidMultiplier;
                        platforms.forEach(pId => {
                            const platformProfile = PLATFORMS[pId];
                            const platformState = nextPlayer.world.platforms?.[pId];
                            
                            if (!platformState) return;

                            // Base interest on quality, genre match, and platform's desperation (recentHits)
                            const normalizePlatformGenre = (value: string) => {
                                const normalized = value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                                if (normalized === 'ROMCOM') return 'ROMANCE';
                                if (normalized === 'INDIE') return 'DRAMA';
                                return normalized;
                            };
                            const isGenreMatch = platformProfile.genreBias.some(g => normalizePlatformGenre(g) === rel.projectDetails.genre) ? 1.15 : 0.95;
                            const desperation = Math.max(0.5, 1.5 - (platformState.recentHits * 0.1));
                            const qualityScore = rel.projectDetails.hiddenStats.qualityScore || 50;
                            const scriptQuality = rel.projectDetails.hiddenStats.scriptQuality || 50;
                            const directorQuality = rel.projectDetails.hiddenStats.directorQuality || 50;
                            const castingStrength = rel.projectDetails.hiddenStats.castingStrength || 50;
	                            const packageStrength = (qualityScore * 0.45) + (scriptQuality * 0.2) + (directorQuality * 0.15) + (castingStrength * 0.2);
	                            const runStrength = Math.max(0.5, Math.min(3, newTotal / Math.max(rel.budget, 1)));
	                            const hasProvenIp = Boolean(rel.projectDetails.franchiseId || rel.projectDetails.universeId || rel.projectDetails.subtype === 'SEQUEL' || rel.projectDetails.subtype === 'SPINOFF' || rel.projectDetails.subtype === 'UNIVERSE_EVENT');
	                            const campaignReach = Math.max(0.38, Math.min(1.28, rel.projectDetails.hiddenStats.campaignReachMultiplier ?? 1));
		                            const interest = (
	                                (packageStrength * isGenreMatch * desperation * marketDemand)
	                                + ((rel.promotionalBuzz ?? 0) * 0.15)
	                                + (runStrength * 12)
	                            ) * (0.82 + (campaignReach * 0.18));
                            
                            if (interest > 60 || Math.random() > 0.7) {
                                const bidProfile = getStreamingBidProfile(packageStrength, isSeries, runStrength);
                                const qualityFactor = Math.max(0.85, 0.95 + ((packageStrength - 55) / 105));
                                const baseFloorOffer = rel.budget * bidProfile.floor;
                                const topPlatformCash = Math.max(...platforms.map(id => nextPlayer.world.platforms?.[id]?.cashReserve || 0), 1);
                                const platformMuscle = Math.max(0.25, Math.min(1, (platformState.cashReserve || 0) / topPlatformCash));
                                const safeMinimum = Math.max(baseFloorOffer, packageStrength < 45 ? rel.budget * 0.8 : 0);
                                const riskAdjustedSafeMinimum = packageStrength < 45
                                    ? Math.max(rel.budget * 0.45, safeMinimum * bidRiskMultiplier)
                                    : safeMinimum * Math.min(1.05, bidRiskMultiplier);
                                const floorOffer = Math.floor(Math.max(riskAdjustedSafeMinimum, baseFloorOffer * (0.96 + Math.random() * 0.1 + platformMuscle * 0.05) * bidRiskMultiplier));
                                const qualityRange = rel.budget * (
                                    bidProfile.floor + ((bidProfile.ceiling - bidProfile.floor) * (0.18 + Math.random() * 0.5))
                                ) * bidRiskMultiplier;
                                const theatricalProofOffer = newTotal
                                    * (0.42 + Math.min(0.34, packageStrength / 290) + Math.random() * 0.12)
	                                    * platformProfile.payoutMult
	                                    * isGenreMatch
	                                    * marketDemand
	                                    * Math.max(0.82, desperation)
	                                    * bidRiskMultiplier;
	                                const marketOffer = rel.budget
	                                    * (0.65 + (runStrength * 0.24))
                                    * qualityFactor
	                                    * platformProfile.payoutMult
	                                    * desperation
	                                    * isGenreMatch
	                                    * marketDemand
	                                    * bidRiskMultiplier;
                                let baseOffer = Math.max(
                                    floorOffer * (1.02 + Math.random() * 0.12),
                                    qualityRange,
                                    marketOffer,
                                    theatricalProofOffer
                                );

                                // Streaming is meant to be the safest lane, so don't let platform cash quirks undercut viable projects.
                                const platformCashCap = Math.max(
                                    floorOffer,
                                    platformState.cashReserve * (isSeries ? 0.78 : 0.68),
                                    rel.budget * Math.min(
                                        bidProfile.ceiling,
                                        packageStrength >= 92 ? 16 : packageStrength >= 84 ? 12 : packageStrength >= 72 ? 7 : packageStrength >= 60 ? 3.5 : 1.4
                                    ) * Math.max(0.55, bidRiskMultiplier),
                                    newTotal * (packageStrength >= 84 ? 0.92 : packageStrength >= 72 ? 0.72 : 0.55) * Math.max(0.62, bidRiskMultiplier)
                                );
                                const marketProofCap = getStreamingMarketProofCap(rel.budget, packageStrength, rel.projectDetails.hiddenStats || {}, isSeries, newTotal, hasProvenIp) * Math.max(0.55, Math.min(1.05, bidRiskMultiplier));
                                const maxOffer = Math.min(platformCashCap, rel.budget * bidProfile.ceiling, marketProofCap);
                                baseOffer = Math.min(baseOffer, Math.max(floorOffer, maxOffer));

                                const upfront = Math.floor(Math.max(floorOffer, baseOffer * (0.96 + Math.random() * 0.28)));
                                const royalty = Math.floor(Math.random() * (isSeries ? 6 : 8)) + (isSeries ? 6 : 5); // series get slightly safer backend terms
                                
                                if (upfront > 0) {
                                    bids.push({ platformId: pId, upfront, royalty, duration: 52 }); // 1 year contract
                                }
                            }
                        });

                        const minimumCompetitiveBids = Math.min(3, platforms.length);
                        if (bids.length < minimumCompetitiveBids) {
                            const hiddenStats = (rel.projectDetails.hiddenStats || {}) as Record<string, number>;
                            const qualityScore = hiddenStats.qualityScore || 50;
                            const scriptQuality = hiddenStats.scriptQuality || 50;
                            const directorQuality = hiddenStats.directorQuality || 50;
                            const castingStrength = hiddenStats.castingStrength || 50;
                            const packageStrength = (qualityScore * 0.45) + (scriptQuality * 0.2) + (directorQuality * 0.15) + (castingStrength * 0.2);
                            const runStrength = Math.max(0.5, Math.min(3, newTotal / Math.max(rel.budget, 1)));
                            const bidProfile = getStreamingBidProfile(packageStrength, isSeries, runStrength);
                            const hasProvenIp = Boolean(rel.projectDetails.franchiseId || rel.projectDetails.universeId || rel.projectDetails.subtype === 'SEQUEL' || rel.projectDetails.subtype === 'SPINOFF' || rel.projectDetails.subtype === 'UNIVERSE_EVENT');
                            const marketProofCap = getStreamingMarketProofCap(rel.budget, packageStrength, rel.projectDetails.hiddenStats || {}, isSeries, newTotal, hasProvenIp);
                            const bestExistingBid = bids.reduce((max, bid) => Math.max(max, bid.upfront), 0);
                            const missingPlatforms = platforms.filter(pId => !bids.some(bid => bid.platformId === pId));

                            missingPlatforms.some((pId, index) => {
                                if (bids.length >= minimumCompetitiveBids) return true;

                                const platformProfile = PLATFORMS[pId];
                                const platformState = nextPlayer.world.platforms?.[pId];
                                if (!platformState) return false;

                                const floorOffer = Math.max(1_000_000, rel.budget * bidProfile.floor * Math.max(0.55, bidRiskMultiplier));
                                const competitiveAnchor = bestExistingBid > 0
                                    ? bestExistingBid * (0.52 + Math.random() * 0.36)
                                    : floorOffer * (1.08 + Math.random() * 0.42);
                                const platformCap = Math.max(
                                    floorOffer,
                                    platformState.cashReserve * (isSeries ? 0.72 : 0.62),
                                    rel.budget * bidProfile.ceiling * Math.max(0.55, bidRiskMultiplier),
                                    newTotal * (packageStrength >= 84 ? 0.82 : packageStrength >= 72 ? 0.65 : 0.48) * Math.max(0.62, bidRiskMultiplier)
                                );
                                const cap = Math.max(floorOffer, Math.min(platformCap, marketProofCap * Math.max(0.55, Math.min(1.05, bidRiskMultiplier))));
                                const upfront = Math.floor(Math.max(floorOffer, Math.min(cap, competitiveAnchor * platformProfile.payoutMult)));

                                bids.push({
                                    platformId: pId,
                                    upfront,
                                    royalty: Math.floor(Math.random() * (isSeries ? 5 : 7)) + (isSeries ? 5 : 4),
                                    duration: 52,
                                });

                                return false;
                            });
                        }
                        
                        if (bids.length === 0) {
                            const hiddenStats = (rel.projectDetails.hiddenStats || {}) as Record<string, number>;
                            const packageStrength = ((hiddenStats.qualityScore || 50) * 0.45)
                                + ((hiddenStats.scriptQuality || 50) * 0.2)
                                + ((hiddenStats.directorQuality || 50) * 0.15)
                                + ((hiddenStats.castingStrength || 50) * 0.2);
                            const runStrength = Math.max(0.5, Math.min(3, newTotal / Math.max(rel.budget, 1)));
                            const bidProfile = getStreamingBidProfile(packageStrength, isSeries, runStrength);
                            // Fallback bid should still preserve streaming as a safer release lane.
                            bids.push({
                                platformId: 'NETFLIX',
                                upfront: Math.floor(rel.budget * bidProfile.floor * Math.max(0.55, bidRiskMultiplier)),
                                royalty: isSeries ? 6 : 5,
                                duration: 52
                            });
                        }

                        const biddingRelease: ActiveRelease = {
                            ...rel,
                            ...theatricalDistributionState,
                            distributionPhase: 'STREAMING_BIDDING',
                            status: 'FINISHED',
                            bids,
                        };
                        if (
                            playerStudio.studioState?.operatingModel === 'INDEPENDENT_LABEL'
                            && bids.length > 0
                        ) {
                            processedReleases.push(closeIndependentSubsidiaryStreamingDeal(
                                biddingRelease,
                                playerStudio,
                                bids,
                            ));
                        } else {
                            processedReleases.push(biddingRelease);
                        }
                    }
                } else {
                    // NPC studio, just auto-assign
                    const platformId = determineStreamingAcquisition(rel.projectDetails);
                    const cost = Math.floor(rel.budget * 0.4 * PLATFORMS[platformId].payoutMult);
                    logsToAdd.push({ msg: `📉 "${rel.name}" left theaters. Acquired by ${PLATFORMS[platformId].name}.`, type: 'neutral' });
                    
                    // Update platform state
                    if (nextPlayer.world.platforms && nextPlayer.world.platforms[platformId]) {
                        const platform = nextPlayer.world.platforms[platformId];
                        platform.cashReserve = Math.max(0, platform.cashReserve - cost);
                        platform.recentHits += 1;
                    }

                    const signedNpcRelease: ActiveRelease = {
                        ...rel,
                        ...theatricalDistributionState,
                        distributionPhase: 'STREAMING',
                        status: 'FINISHED',
                        streamingUpfrontFee: Math.max(0, Number(rel.streamingUpfrontFee || 0)) + cost,
                        streamingRevenue: Math.max(0, Number(rel.streamingRevenue || 0)) + cost,
                        streaming: { platformId, weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false },
                    };
                    const npcRegistration = registerProductionStreamingRightsContract(nextPlayer, {
                        sourceProjectId: rel.id,
                        title: rel.name,
                        projectType: rel.type === 'SERIES' ? 'SERIES' : 'MOVIE',
                        genre: rel.projectDetails.genre,
                        sellerStudioId: rel.projectDetails.studioId || 'npc-studio',
                        sellerStudioName: rel.projectDetails.studioId || 'NPC studio',
                        sellerPartyType: 'NPC_STUDIO',
                        buyerPlatformId: platformId,
                        minimumGuarantee: cost,
                        platformRevenueShare: 100,
                        signedAtAbsoluteWeek: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
                        startsAtAbsoluteWeek: getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek),
                        durationWeeks: 52,
                    });
                    nextPlayer = npcRegistration.player;
                    const npcContractId = npcRegistration.contract?.id;
                    processedReleases.push(npcContractId ? {
                        ...signedNpcRelease,
                        streamingContractId: npcContractId,
                        streaming: { ...signedNpcRelease.streaming!, contractId: npcContractId },
                    } : signedNpcRelease);
                }
            } else {
                processedReleases.push({ ...rel, ...theatricalDistributionState, weekNum: rel.weekNum + 1 });
            }
        } 
        else if (rel.distributionPhase === 'STREAMING_BIDDING') {
            const biddingStudio = nextPlayer.businesses?.find(business => (
                business.id === rel.projectDetails.studioId
                && business.type === 'PRODUCTION_HOUSE'
            ));
            if (
                biddingStudio?.studioState?.operatingModel === 'INDEPENDENT_LABEL'
                && Array.isArray(rel.bids)
                && rel.bids.length > 0
            ) {
                // Repair older saves that were left waiting for a player decision
                // even though the subsidiary was meant to operate independently.
                processedReleases.push(closeIndependentSubsidiaryStreamingDeal(
                    rel,
                    biddingStudio,
                    rel.bids,
                ));
            } else {
                // HQ and controlled subsidiaries wait for the player to accept a bid.
                processedReleases.push(rel);
            }
        }
        else if (rel.distributionPhase === 'STREAMING' && rel.streaming) {
            // Handle delayed streaming release, including year rollover.
            const weeksUntilStreamingStart = getStreamingWeeksUntilStart(
                rel.streaming,
                nextPlayer.age,
                nextPlayer.currentWeek
            );
            if (weeksUntilStreamingStart > 0) {
                processedReleases.push(rel);
                return;
            }
            let streamingStudio = nextPlayer.businesses?.find(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');
            const streamingDemand = getProjectMarketDemand(rel.projectDetails, nextPlayer.currentWeek, streamingStudio?.studioState?.marketTrends);
            const streamingProductionRisk = calculateProductionRiskProfile(rel.projectDetails, {
                budget: rel.budget,
                imdbRating: rel.imdbRating,
                productionPerformance: rel.productionPerformance
            });
            const rawNewViews = calculateStreamingViewership(
                rel.streaming.platformId,
                rel.streaming.weekOnPlatform,
                rel.projectDetails.hiddenStats.qualityScore,
                rel.streaming.weeklyViews[rel.streaming.weeklyViews.length - 1] || 0,
                rel.type,
                streamingDemand
            );
            const newViews = Math.max(0, Math.floor(rawNewViews * streamingProductionRisk.streamingViewMultiplier));
            const totalViews = rel.streaming.totalViews + newViews;
            const newWeeklyViews = [...rel.streaming.weeklyViews, newViews];
            const shouldExit = checkStreamingExit(rel.streaming.platformId, newViews, rel.streaming.weekOnPlatform);
            const roleVisibility = rel.roleType === 'LEAD' ? 1 : rel.roleType === 'SUPPORTING' ? 0.7 : 0.35;
            const streamingFamePulse = newViews >= 5_000_000
                ? 0.35 * roleVisibility
                : newViews >= 2_000_000
                    ? 0.18 * roleVisibility
                    : newViews >= 750_000
                        ? 0.06 * roleVisibility
                        : 0;
            if (streamingFamePulse > 0) {
                nextPlayer.stats.fame = Math.max(0, Math.min(100, nextPlayer.stats.fame + streamingFamePulse));
            }

            const explicitUpfrontFee = rel.streamingUpfrontFee ?? rel.projectDetails?.streamingRevenue;
            const inferredUpfrontFee = Math.max(0, Number(
                explicitUpfrontFee
                ?? (rel.studioRoyaltyPercentage ? 0 : rel.streamingRevenue || 0)
            ));
            const inferredRoyaltyRevenue = Math.max(0, Number(
                rel.streamingRoyaltyRevenue
                ?? Math.max(0, Number(rel.streamingRevenue || 0) - inferredUpfrontFee)
            ));
            const isSubsidiaryStreamingContract = Boolean(rel.projectDetails.hiddenStats?.subsidiaryStreamingContract);
            const shouldCreditSubsidiaryUpfront = isSubsidiaryStreamingContract
                && !rel.projectDetails.hiddenStats?.subsidiaryStreamingUpfrontPaid
                && inferredUpfrontFee > 0;
            if (shouldCreditSubsidiaryUpfront && streamingStudio) {
                streamingStudio.balance += inferredUpfrontFee;
                streamingStudio.stats.weeklyRevenue += inferredUpfrontFee;
                streamingStudio.stats.weeklyProfit += inferredUpfrontFee;
                streamingStudio.stats.lifetimeRevenue += inferredUpfrontFee;
                appendStudioLedgerEntry(streamingStudio, {
                    id: `studio_ledger_subsidiary_streaming_deal_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    amount: inferredUpfrontFee,
                    type: 'STREAMING_DEAL',
                    label: `${rel.name} autonomous streaming deal`,
                    projectId: rel.id,
                });
                streamingStudio.stats.valuation = recalculateBusinessValuation(streamingStudio, nextPlayer).stats.valuation;
            }
            let weeklyStreamingRevenue = 0;
            let investorStreamingPayout = 0;
            const canonicalStreamingContract = rel.streamingContractId
                ? nextPlayer.world.streamingRightsContracts?.[rel.streamingContractId]
                : undefined;
            const phaseTwoAttribution = canonicalStreamingContract?.biddingSessionId
                ? phaseTwoAttributionByProject.get(rel.id)
                : undefined;
            let phaseTwoSettlementApplied = false;
            if (canonicalStreamingContract && phaseTwoAttribution) {
                const settlement = settleStreamingContractRoyaltyForPlayer(nextPlayer, {
                    contractId: canonicalStreamingContract.id,
                    attribution: phaseTwoAttribution,
                    absoluteWeek: settlementAbsoluteWeek,
                });
                nextPlayer = settlement.player;
                weeklyStreamingRevenue = settlement.royaltyPaid;
                phaseTwoSettlementApplied = settlement.changed || Boolean(settlement.settlementId);
                streamingStudio = nextPlayer.businesses?.find(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');
            } else if (rel.studioRoyaltyPercentage) {
                // Legacy contracts retain the historical view proxy. Phase 2 contracts settle from attributable adjusted gross.
                weeklyStreamingRevenue = Math.floor(newViews * 0.10 * (rel.studioRoyaltyPercentage / 100));
            }
            if (rel.studioRoyaltyPercentage || canonicalStreamingContract?.licensorRevenueShare) {
                const studioId = rel.projectDetails.studioId;
                const playerStudio = nextPlayer.businesses?.find(b => b.id === studioId);
                if (playerStudio && weeklyStreamingRevenue > 0) {
                    const activeInvestorPlan = rel.investorPlan || rel.projectDetails.investorPlan;
                    investorStreamingPayout = calculateInvestorPayout(activeInvestorPlan, weeklyStreamingRevenue);
                    const netStreamingRevenue = Math.max(0, weeklyStreamingRevenue - investorStreamingPayout);
                    if (!phaseTwoSettlementApplied) {
                        playerStudio.balance += netStreamingRevenue;
                        playerStudio.stats.weeklyRevenue += netStreamingRevenue;
                        playerStudio.stats.weeklyProfit += netStreamingRevenue;
                        playerStudio.stats.lifetimeRevenue += netStreamingRevenue;
                        appendStudioLedgerEntry(playerStudio, {
                            id: `studio_ledger_streaming_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                            week: nextPlayer.currentWeek,
                            year: nextPlayer.age,
                            amount: netStreamingRevenue,
                            type: 'STREAMING_ROYALTY',
                            label: investorStreamingPayout > 0
                                ? `${rel.name} streaming royalties after investor split`
                                : `${rel.name} streaming royalties`,
                            projectId: rel.id
                        });
                    } else if (investorStreamingPayout > 0) {
                        playerStudio.balance = Math.max(0, playerStudio.balance - investorStreamingPayout);
                        playerStudio.stats.weeklyProfit -= investorStreamingPayout;
                    }
                    if (investorStreamingPayout > 0) {
                        appendStudioLedgerEntry(playerStudio, {
                            id: `studio_ledger_investor_payout_streaming_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                            week: nextPlayer.currentWeek,
                            year: nextPlayer.age,
                            amount: -investorStreamingPayout,
                            type: 'INVESTOR_PAYOUT',
                            label: `${rel.name} investor streaming payout`,
                            projectId: rel.id
                        });
                    }
                    playerStudio.stats.valuation = recalculateBusinessValuation(playerStudio, nextPlayer).stats.valuation;
                }
            }
            const newStreamingRoyaltyRevenue = inferredRoyaltyRevenue + weeklyStreamingRevenue;
            const newStreamingRevenue = inferredUpfrontFee + newStreamingRoyaltyRevenue;
            const weeklyStreamingBreakdown = calculateStreamingDistributionBreakdown(
                rel.projectDetails,
                rel.streaming.platformId,
                newViews,
                weeklyStreamingRevenue,
                rel.streaming.weekOnPlatform
            );
            const newWeeklyStreamingBreakdowns = [
                ...(rel.weeklyStreamingBreakdowns || []),
                weeklyStreamingBreakdown
            ].slice(-24);
            const weeklySoundtrackBreakdown = calculateWeeklySoundtrackRevenue(rel.projectDetails, {
                week: rel.streaming.weekOnPlatform,
                streamingViews: newViews,
                catalog: getMusicArtistCatalog(nextPlayer.world),
                seed: `${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}_streaming`
            });
            const weeklySoundtrackRevenue = weeklySoundtrackBreakdown.totalRevenue;
            if (weeklySoundtrackRevenue > 0) {
                nextPlayer = applyMusicArtistNpcEarnings(
                    nextPlayer,
                    buildSoundtrackCreditEarnings(rel.projectDetails, weeklySoundtrackRevenue)
                );
                const soundtrackCulture = buildSoundtrackCultureOutcomes(nextPlayer, rel, weeklySoundtrackRevenue, {
                    releaseWeek: rel.streaming.weekOnPlatform,
                    marketPulse: Math.max(weeklyStreamingRevenue, newViews * 0.1),
                    source: 'STREAMING'
                });
                if (soundtrackCulture.moments.length) {
                    soundtrackCulture.moments.forEach(moment => {
                        if (nextPlayer.world.musicIndustry) {
                            nextPlayer.world.musicIndustry = addMusicCultureMoment(nextPlayer.world.musicIndustry, moment);
                        }
                    });
                    newNews = [...soundtrackCulture.news, ...newNews].slice(0, 50);
                    nextPlayer.x.feed = [...soundtrackCulture.posts, ...(nextPlayer.x.feed || [])].slice(0, 80);
                    soundtrackCulture.logs.forEach(message => logsToAdd.push({ msg: `🎵 ${message}`, type: 'neutral' }));
                    if (soundtrackCulture.artistEarnings.length) {
                        nextPlayer = applyMusicArtistNpcEarnings(nextPlayer, soundtrackCulture.artistEarnings);
                    }
                    if (soundtrackCulture.reputationDelta) {
                        nextPlayer.stats.reputation = Math.max(0, Math.min(100, nextPlayer.stats.reputation + soundtrackCulture.reputationDelta));
                    }
                    if (soundtrackCulture.rawHypeDelta) {
                        rel.projectDetails.hiddenStats.rawHype = Math.max(0, Math.min(100, rel.projectDetails.hiddenStats.rawHype + soundtrackCulture.rawHypeDelta));
                    }
                }
            }
            const newSoundtrackRevenue = (rel.soundtrackRevenue || 0) + weeklySoundtrackRevenue;
            const newWeeklySoundtrackRevenue = [...(rel.weeklySoundtrackRevenue || []), weeklySoundtrackRevenue];
            const newSoundtrackRevenueBreakdown = mergeSoundtrackRevenueBreakdowns(rel.soundtrackRevenueBreakdown, weeklySoundtrackBreakdown);
            const newWeeklySoundtrackBreakdowns = [...(rel.weeklySoundtrackBreakdowns || []), weeklySoundtrackBreakdown].slice(-24);
            const activeInvestorPlan = rel.investorPlan || rel.projectDetails.investorPlan;
            const investorSoundtrackPayout = calculateInvestorPayout(activeInvestorPlan, weeklySoundtrackRevenue);
            const streamingInvestorPayouts = activeInvestorPlan
                ? appendInvestorPayout(rel.investorPayouts, investorStreamingPayout + investorSoundtrackPayout)
                : rel.investorPayouts;
            if (streamingStudio && weeklySoundtrackRevenue > 0) {
                const netSoundtrackRevenue = Math.max(0, weeklySoundtrackRevenue - investorSoundtrackPayout);
                streamingStudio.balance += netSoundtrackRevenue;
                streamingStudio.stats.weeklyRevenue += netSoundtrackRevenue;
                streamingStudio.stats.weeklyProfit += netSoundtrackRevenue;
                streamingStudio.stats.lifetimeRevenue += netSoundtrackRevenue;
                appendStudioLedgerEntry(streamingStudio, {
                    id: `studio_ledger_soundtrack_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    amount: netSoundtrackRevenue,
                    type: 'SOUNDTRACK',
                    label: investorSoundtrackPayout > 0
                        ? `${rel.name} soundtrack streaming revenue after investor split`
                        : `${rel.name} soundtrack streaming revenue`,
                    projectId: rel.id
                });
	                if (investorSoundtrackPayout > 0) {
	                    appendStudioLedgerEntry(streamingStudio, {
                        id: `studio_ledger_investor_payout_streaming_soundtrack_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        amount: -investorSoundtrackPayout,
                        type: 'INVESTOR_PAYOUT',
                        label: `${rel.name} investor soundtrack payout`,
	                        projectId: rel.id
	                    });
	                }
	                if ((investorStreamingPayout + investorSoundtrackPayout) > 0 && activeInvestorPlan) {
	                    const rememberedStudio = applyInvestorPayoutMemory({
	                        studio: streamingStudio,
	                        plan: activeInvestorPlan,
	                        payout: investorStreamingPayout + investorSoundtrackPayout,
	                        projectId: rel.id,
	                        projectTitle: rel.name,
	                        week: nextPlayer.currentWeek,
	                        year: nextPlayer.age
	                    });
	                    if (rememberedStudio?.studioState) {
	                        streamingStudio.studioState = rememberedStudio.studioState;
	                    }
	                }
	                streamingStudio.stats.valuation = recalculateBusinessValuation(streamingStudio, nextPlayer).stats.valuation;
	            }

            const streamingAudienceReception = buildAudienceReception(
                {
                    ...rel,
                    streamingRevenue: newStreamingRevenue,
                    streamingUpfrontFee: inferredUpfrontFee,
                    streamingRoyaltyRevenue: newStreamingRoyaltyRevenue,
                    weeklyStreamingBreakdowns: newWeeklyStreamingBreakdowns,
                    soundtrackRevenue: newSoundtrackRevenue,
                    weeklySoundtrackRevenue: newWeeklySoundtrackRevenue,
                    soundtrackRevenueBreakdown: newSoundtrackRevenueBreakdown,
                    weeklySoundtrackBreakdowns: newWeeklySoundtrackBreakdowns,
                    investorPlan: activeInvestorPlan,
                    investorPayouts: streamingInvestorPayouts,
                    streaming: {
                        ...rel.streaming,
                        totalViews,
                        weeklyViews: newWeeklyViews
                    }
                },
                rel.audienceReception || rel.projectDetails.audienceReception,
                nextPlayer.currentWeek,
                nextPlayer.age,
                { isFinal: shouldExit }
            );
            const streamingProjectDetails = {
                ...rel.projectDetails,
                hiddenStats: {
                    ...rel.projectDetails.hiddenStats,
                    ...(shouldCreditSubsidiaryUpfront ? { subsidiaryStreamingUpfrontPaid: true } : {}),
                },
                audienceReception: streamingAudienceReception
            };

            if (shouldExit) {
                const outcomeStudio = nextPlayer.businesses?.find(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');
                applyStudioMarketOutcome(outcomeStudio, rel, rel.totalGross + newStreamingRevenue + newSoundtrackRevenue);
                logsToAdd.push({ msg: `👋 "${rel.name}" left ${PLATFORMS[rel.streaming.platformId].name}.`, type: 'neutral' });
                if (rel.royaltyPercentage && rel.royaltyPercentage > 0) {
                    const studioCut = rel.budget * 2; 
                    const netProfit = rel.totalGross - studioCut;
                    if (netProfit > 0) {
                        const royaltyAmount = Math.floor(netProfit * (rel.royaltyPercentage / 100));
                        if (royaltyAmount > 0) {
                            addTransaction(royaltyAmount, 'ROYALTY', `Royalties: ${rel.name}`);
                            logsToAdd.push({ msg: `👑 ROYALTY PAYOUT: $${royaltyAmount.toLocaleString()}`, type: 'positive' });
                        }
                    }
                }
                    const completedSnapshot = createPastProjectArchiveSnapshot({
                        ...rel,
                        streamingRevenue: newStreamingRevenue,
                        streamingUpfrontFee: inferredUpfrontFee,
                        streamingRoyaltyRevenue: newStreamingRoyaltyRevenue,
                        soundtrackRevenue: newSoundtrackRevenue,
                        weeklySoundtrackRevenue: newWeeklySoundtrackRevenue,
                        soundtrackRevenueBreakdown: newSoundtrackRevenueBreakdown,
                        weeklySoundtrackBreakdowns: newWeeklySoundtrackBreakdowns,
                        investorPlan: activeInvestorPlan,
                        investorPayouts: streamingInvestorPayouts,
                        audienceReception: streamingAudienceReception,
                        projectDetails: streamingProjectDetails
                    }, {
                        player: nextPlayer,
                        totalViews,
                        streamingRevenue: newStreamingRevenue,
                        weeklyStreamingBreakdowns: newWeeklyStreamingBreakdowns,
                        weeklyViews: newWeeklyViews
                    });
                    if ((rel as any).isLegacyCareerProject || (rel as any).legacyParentActorId) {
                        const existingArchive = nextPlayer.flags?.legacyCareerArchive || {
                            parent: nextPlayer.flags?.legacyParent,
                            pastProjects: nextPlayer.flags?.legacyStudioProjects || [],
                            activeReleases: [],
                            awards: []
                        };
                        const archivedPastProjects = Array.isArray(existingArchive.pastProjects) ? existingArchive.pastProjects : [];
                        const archivedActiveReleases = Array.isArray(existingArchive.activeReleases) ? existingArchive.activeReleases : [];
                        nextPlayer.flags = {
                            ...nextPlayer.flags,
                            legacyCareerArchive: {
                                ...existingArchive,
                                pastProjects: [
                                    { ...completedSnapshot, isLegacyCareerProject: true, legacyParentActorId: (rel as any).legacyParentActorId, legacyParentName: (rel as any).legacyParentName },
                                    ...archivedPastProjects.filter((project: any) => project?.id !== completedSnapshot.id)
                                ],
                                activeReleases: archivedActiveReleases.filter((project: any) => project?.id !== rel.id)
                            }
                        };
                    } else {
                        nextPlayer.pastProjects.push(completedSnapshot);
                    }
            } else {
                processedReleases.push({
                    ...rel,
                    streamingRevenue: newStreamingRevenue,
                    streamingUpfrontFee: inferredUpfrontFee,
                    streamingRoyaltyRevenue: newStreamingRoyaltyRevenue,
                    weeklyStreamingBreakdowns: newWeeklyStreamingBreakdowns,
                    soundtrackRevenue: newSoundtrackRevenue,
                    weeklySoundtrackRevenue: newWeeklySoundtrackRevenue,
                    soundtrackRevenueBreakdown: newSoundtrackRevenueBreakdown,
                    weeklySoundtrackBreakdowns: newWeeklySoundtrackBreakdowns,
                    investorPlan: activeInvestorPlan,
                    investorPayouts: streamingInvestorPayouts,
                    audienceReception: streamingAudienceReception,
                    projectDetails: streamingProjectDetails,
                    streaming: {
                        ...rel.streaming,
                        totalViews,
                        weeklyViews: newWeeklyViews,
                        weekOnPlatform: rel.streaming.weekOnPlatform + 1,
                        isLeaving: newWeeklyViews.length > 20 && newViews < 50000
                    }
                });
            }
        }
    });

    nextPlayer.activeReleases = processedReleases;
    nextPlayer = migrateStreamingRightsContractRegistry(nextPlayer);
    nextPlayer.news = newNews;
    nextPlayer.inbox = newInbox;
    emitLoopStage('commitments_releases_done', {
        processed_releases: processedReleases.length,
        new_releases: newReleases.length,
        past_projects: nextPlayer.pastProjects?.length || 0,
    });

    // --- 10. AWARD SEASON LOGIC ---
    emitLoopStage('awards_start');
    Object.entries(AWARD_CALENDAR).forEach(([weekStr, def]) => {
        if (nextPlayer.currentWeek === def.inviteWeek) {
            const ceremonyWeek = parseInt(weekStr);
            const awardYear = getAwardCeremonyYear(def, ceremonyWeek, nextPlayer.age, nextPlayer.currentWeek);
            const alreadyScheduled = nextPlayer.scheduledEvents.some(event =>
                event.type === 'AWARD_CEREMONY' &&
                event.data?.awardDef?.type === def.type &&
                event.data?.awardYear === awardYear
            );
            const alreadyHasSeasonRecords = nextPlayer.awards.some(award => award.type === def.type && award.year === awardYear);
            const alreadyHasHistory = nextPlayer.world.awardHistory.some(entry => entry.type === def.type && entry.year === awardYear);

            if (alreadyScheduled || alreadyHasHistory) return;

            const noms = checkAwardEligibility(nextPlayer, def.inviteWeek, awardYear);
            const fullBallot = generateFullBallot(nextPlayer, def.type, noms, awardYear);
            let addedNominationEntries = false;
            if (noms.length > 0) {
                const awardEntries = noms
                    .filter(n => !nextPlayer.awards.some(a =>
                        a.type === def.type &&
                        a.projectId === n.project.id &&
                        a.category === n.category
                    ))
                    .map(n => ({
                        id: createCanonicalAwardNominationId(def.type, awardYear, n.category, n.project.id),
                        name: def.name,
                        category: n.category,
                        year: awardYear,
                        outcome: 'NOMINATED' as const,
                        projectId: n.project.id,
                        projectName: n.project.name,
                        type: def.type
                    }));
                if (awardEntries.length > 0) {
                    addedNominationEntries = true;
                    nextPlayer.awards.push(...awardEntries);
                    nextPlayer.awards = sanitizeAwardRecords(nextPlayer.awards);
                    nextPlayer.inbox.unshift({
                        id: createDeterministicId('msg_award_invite', def.type, awardYear),
                        sender: t(language, 'services.gameLoop.awards.inbox.sender'),
                        subject: t(language, 'services.gameLoop.awards.inbox.subject', { awardName: def.name }),
                        text: t(language, 'services.gameLoop.awards.inbox.text', { count: awardEntries.length.toLocaleString() }),
                        type: 'OFFER_EVENT',
                        data: null,
                        isRead: false,
                        weekSent: nextPlayer.currentWeek,
                        expiresIn: 4
                    });
                    logsToAdd.push({ msg: t(language, 'services.gameLoop.awards.log.nominated', { awardName: def.name }), type: 'positive' });
                }
            }
            nextPlayer.scheduledEvents.push({ id: `evt_award_${def.type}_${awardYear}`, week: ceremonyWeek, type: 'AWARD_CEREMONY', title: def.name, description: t(language, 'services.gameLoop.awards.ceremony.description'), data: { awardDef: def, awardYear, nominations: noms, fullBallot: fullBallot } });
            if (addedNominationEntries && !alreadyHasSeasonRecords) {
                nextPlayer.news.unshift({ id: `news_noms_${def.type}_${awardYear}`, headline: t(language, 'services.gameLoop.awards.news.nominations', { awardName: def.name }), category: 'TOP_STORY', week: nextPlayer.currentWeek, year: nextPlayer.age, impactLevel: 'HIGH' });
            }
        }
    });

    const awardShow = AWARD_CALENDAR[nextPlayer.currentWeek];
    if (awardShow) {
        const existingEntry = nextPlayer.world.awardHistory.find(h => h.year === nextPlayer.age && h.type === awardShow.type);
        const ceremonyPendingForPlayer = nextPlayer.pendingEvent?.type === 'AWARD_CEREMONY' && nextPlayer.pendingEvent.data?.awardDef?.type === awardShow.type;
        if (!existingEntry && !ceremonyPendingForPlayer) {
            const historyEntry = resolveCanonicalAwardSeason(nextPlayer, awardShow.type, nextPlayer.age);
            nextPlayer.world.awardHistory.push(historyEntry);
            nextPlayer.world.awardHistory = sanitizeAwardHistoryEntries(nextPlayer.world.awardHistory);
            const bestPic = historyEntry.winners.find(w => w.category.includes('Picture') || w.category.includes('Series'));
            if (bestPic) { nextPlayer.news.unshift({ id: createDeterministicId('news_award', awardShow.type, nextPlayer.age), headline: t(language, 'services.gameLoop.awards.news.winner', { projectName: bestPic.projectName, awardName: awardShow.name }), category: 'INDUSTRY', week: nextPlayer.currentWeek, year: nextPlayer.age, impactLevel: 'MEDIUM' }); }
        }
    }
    emitLoopStage('awards_done', {
        awards: nextPlayer.awards?.length || 0,
        award_history: nextPlayer.world.awardHistory?.length || 0,
    });

    // --- 11. END OF WEEK UPDATES ---
    emitLoopStage('end_week_start');
    nextPlayer.currentWeek += 1;
    nextPlayer = resolveStudioAcquisitionResponses(nextPlayer);
    if (!hasNoAds(nextPlayer) && nextPlayer.currentWeek % 12 === 0) triggerAd = true;
    nextPlayer.flags.bailoutAdsUsedThisWeek = 0;
    nextPlayer = advanceTinderConnections(nextPlayer);
    nextPlayer = advanceLuxeConnections(nextPlayer);

    // --- 11.5 ATMOSPHERIC LOGS (Paranoia & Tension) ---
    const heat = nextPlayer.flags.heat || 0;
    if (heat > 20 && Math.random() < 0.15) {
        const paranoiaLogs = [
            "You see a police car and your heart skips a beat.",
            "You have a second thought about that recent deal.",
            "The paparazzi seem more aggressive than usual.",
            "You're at a premiere, but you can't stop thinking about that offshore account.",
            "A fan asks a strange question that makes you nervous.",
            "You check your bank account twice to make sure the 'extra' funds are still there.",
            "A news report about a fraud investigation catches your eye."
        ];
        logsToAdd.push({ msg: paranoiaLogs[Math.floor(Math.random() * paranoiaLogs.length)], type: 'neutral' });
    }

    // --- 11.6 DELAYED FEEDBACK (The "Underworld" Consequences) ---
    if (nextPlayer.flags.pendingFeedback && nextPlayer.flags.pendingFeedback.length > 0) {
        nextPlayer.flags.pendingFeedback = nextPlayer.flags.pendingFeedback.map((f: any) => ({
            ...f,
            weeksLeft: f.weeksLeft - 1
        }));

        const triggered = nextPlayer.flags.pendingFeedback.filter((f: any) => f.weeksLeft <= 0);
        nextPlayer.flags.pendingFeedback = nextPlayer.flags.pendingFeedback.filter((f: any) => f.weeksLeft > 0);

        triggered.forEach((f: any) => {
            if (f.type === 'GOVT_AUDIT') {
                const penalty = 100000 + Math.floor(Math.random() * 200000);
                const lifeEvent: LifeEvent = {
                    id: `audit_${Date.now()}`,
                    type: 'SCANDAL',
                    title: t(language, 'life.event.audit.government.title'),
                    titleKey: 'life.event.audit.government.title',
                    description: t(language, 'life.event.audit.government.description'),
                    descriptionKey: 'life.event.audit.government.description',
                    options: [
                        {
                            label: t(language, 'life.event.audit.government.pay.label', { penalty: `$${penalty.toLocaleString()}` }),
                            labelKey: 'life.event.audit.government.pay.label',
                            textVars: { penalty: `$${penalty.toLocaleString()}` },
                            impact: (p) => {
                                p.money -= penalty;
                                return {
                                    updatedPlayer: p,
                                    log: t(getPlayerLanguage(p), 'life.event.audit.government.pay.log'),
                                    logKey: 'life.event.audit.government.pay.log',
                                };
                            }
                        },
                        {
                            label: t(language, 'life.event.audit.government.fight.label'),
                            labelKey: 'life.event.audit.government.fight.label',
                            impact: (p) => {
                                p.stats.reputation -= 15;
                                return {
                                    updatedPlayer: p,
                                    log: t(getPlayerLanguage(p), 'life.event.audit.government.fight.log'),
                                    logKey: 'life.event.audit.government.fight.log',
                                };
                            }
                        }
                    ]
                };
                
                const auditEvent: ScheduledEvent = {
                    id: lifeEvent.id,
                    week: nextPlayer.currentWeek,
                    type: 'SCANDAL',
                    title: lifeEvent.title,
                    data: { lifeEvent }
                };
                nextPlayer.scheduledEvents.push(auditEvent);
                logsToAdd.push({ msg: t(language, 'services.gameLoop.audit.government.urgentLog'), type: 'negative' });
            }

            if (f.type === 'PROJECT_OFFER' || f.type === 'PROJECT_OFFER_PREMIUM') {
                const offer = generateDirectOffer(nextPlayer);
                if (offer) {
                    if (f.type === 'PROJECT_OFFER_PREMIUM') {
                        offer.estimatedIncome *= 1.5;
                        offer.projectName = `[PRESTIGE] ${offer.projectName}`;
                    }
                    nextPlayer.inbox.unshift({
                        id: `direct_event_${Date.now()}`,
                        sender: "Director Connection",
                        subject: `Following up from the party: ${offer.projectName}`,
                        text: `It was great meeting you. We'd love to have you on board for this.`,
                        type: 'OFFER_ROLE',
                        data: offer,
                        isRead: false,
                        weekSent: nextPlayer.currentWeek,
                        expiresIn: 4
                    });
                    nextPlayer.flags.lastDirectOfferAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
                    nextPlayer.flags.lastDirectOfferWeek = nextPlayer.currentWeek;
                    logsToAdd.push({ msg: `📩 You received a project offer following your networking!`, type: 'positive' });
                }
            }
        });
    }

    // --- 11.7 LEGAL HEARINGS ---
    if (nextPlayer.flags.activeCases && nextPlayer.flags.activeCases.length > 0) {
        nextPlayer.flags.activeCases.forEach((c: LegalCase) => {
            if (c.nextHearingWeek === nextPlayer.currentWeek && c.status === 'ACTIVE') {
                // Scheduled events are persisted before the player sees them. Keep this
                // payload as plain data; LifeEventModal rebuilds the hearing actions later.
                const hearingEvent: ScheduledEvent = {
                    id: `hearing_${c.id}_${c.currentHearing}`,
                    week: nextPlayer.currentWeek,
                    type: 'LEGAL_HEARING',
                    title: `${c.title}: Hearing #${c.currentHearing}`,
                    data: { caseId: c.id, hearing: c.currentHearing }
                };
                nextPlayer.scheduledEvents.push(hearingEvent);
            }
        });
    }

    // --- 11.8 RANDOM LIFE EVENTS (Not every year/week) ---
    const currentAbsoluteWeekForEvents = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const lastLuxeLifeEventAbsoluteWeek = ensureFiniteNumber(nextPlayer.flags.lastLuxeLifeEventAbsoluteWeek, 0);
    const weeksSinceLastLuxeEvent = currentAbsoluteWeekForEvents - lastLuxeLifeEventAbsoluteWeek;
    let scheduledLuxeEventThisWeek = false;
    if (
        hasEligibleLuxeEventTarget(nextPlayer) &&
        weeksSinceLastLuxeEvent >= 5 &&
        Math.random() < 0.16
    ) {
        const luxeLifeEvent = generateLuxeLifeEvent(nextPlayer);
        if (luxeLifeEvent) {
            const scheduledLuxeLifeEvent: ScheduledEvent = {
                id: luxeLifeEvent.id,
                week: nextPlayer.currentWeek,
                type: 'LIFE_EVENT',
                title: luxeLifeEvent.title,
                data: { lifeEvent: luxeLifeEvent }
            };
            nextPlayer.scheduledEvents.push(scheduledLuxeLifeEvent);
            nextPlayer.flags.lastLuxeLifeEventAbsoluteWeek = currentAbsoluteWeekForEvents;
            scheduledLuxeEventThisWeek = true;
        }
    }

    if (!scheduledLuxeEventThisWeek && Math.random() < 0.08) { // 8% chance per week
        const lifeEvent = generateLifeEvent(nextPlayer);
        if (lifeEvent) {
            const scheduledLifeEvent: ScheduledEvent = {
                id: lifeEvent.id,
                week: nextPlayer.currentWeek,
                type: 'LIFE_EVENT',
                title: lifeEvent.title,
                data: { lifeEvent }
            };
            nextPlayer.scheduledEvents.push(scheduledLifeEvent);
        }
    }

    if (nextPlayer.currentWeek > 52) {
        nextPlayer.currentWeek = 1;
        nextPlayer.age += 1;
        logsToAdd.push({ msg: `🎂 Happy Birthday! You are now ${nextPlayer.age}.`, type: 'positive' });
        
        // Age up parents yearly. Children with tracked birth weeks are resolved separately.
        if (nextPlayer.relationships) {
            nextPlayer.relationships.forEach(rel => {
                if (rel.relation === 'Child' || rel.relation === 'Parent') {
                    if (rel.relation === 'Child' && typeof rel.birthWeekAbsolute === 'number') {
                        rel.age = getRelationshipAge(rel, nextPlayer.age, nextPlayer.currentWeek);
                    } else {
                        rel.age = (rel.age || 0) + 1;
                    }
                    
                    // Parent death logic (simple chance based on age)
                    if (rel.relation === 'Parent' && rel.age > 75) {
                        if (Math.random() < 0.1) { // 10% chance per year after 75
                            rel.relation = 'Deceased Parent' as any;
                            logsToAdd.push({ msg: `🕊️ Your parent ${rel.name} has passed away at age ${rel.age}.`, type: 'negative' });
                            nextPlayer.stats.happiness = Math.max(0, nextPlayer.stats.happiness - 30);
                        }
                    }
                }
            });
        }

        // Check for player death (age > 70)
        if (nextPlayer.age > 70) {
            const happiness = nextPlayer.stats.happiness ?? 50;
            const health = nextPlayer.stats.health ?? 50;
            
            if (health < 30 && happiness < 30) {
                nextPlayer.stats.health = Math.max(0, health - Math.floor(Math.random() * 15 + 5));
            } else if (health < 50) {
                nextPlayer.stats.health = Math.max(0, health - Math.floor(Math.random() * 10 + 2));
            } else {
                nextPlayer.stats.health = Math.max(0, health - Math.floor(Math.random() * 5));
            }

            if (nextPlayer.stats.health <= 0) {
                nextPlayer.flags = {
                    ...(nextPlayer.flags || {}),
                    isDead: true,
                    deathCauseTitle: 'Age and failing health',
                    deathCauseDetail: 'Health reached zero in later life after age-related decline. Wellness, rest, and support staff can slow this down before it becomes fatal.',
                    deathCauseType: 'AGE_HEALTH_DECLINE',
                    deathCauseWeek: nextPlayer.currentWeek,
                    deathCauseYear: nextPlayer.age,
                };
            } else if (nextPlayer.stats.health < 20) {
                logsToAdd.push({ msg: `⚠️ Your health is failing. You need to focus on your wellbeing.`, type: 'negative' });
            }
        }

        // Year-end finance and taxes
        const yearTransactions = nextPlayer.finance.history.filter(t => t.year === nextPlayer.age - 1);
        const income = yearTransactions.filter(t => t.amount > 0 && t.category !== 'LOAN').reduce((sum, t) => sum + t.amount, 0);
        const expense = yearTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const netIncome = Math.max(0, income - expense);
        const taxableIncome = Math.max(0, netIncome - ANNUAL_TAX_FREE_ALLOWANCE);
        const annualTaxDue = Math.floor(taxableIncome * ANNUAL_INCOME_TAX_RATE);
        const breakdown: Record<TransactionCategory, number> = { SALARY: 0, ROYALTY: 0, SPONSORSHIP: 0, DIVIDEND: 0, EXPENSE: 0, ASSET: 0, BUSINESS: 0, OTHER: 0, AD_REVENUE: 0, LOAN: 0 };
        yearTransactions.filter(t => t.amount > 0).forEach(t => breakdown[t.category] = (breakdown[t.category] || 0) + t.amount);
        nextPlayer.finance.yearly.push({ year: nextPlayer.age - 1, totalIncome: income, totalExpenses: expense, incomeByCategory: breakdown });

        if (annualTaxDue > 0) {
            addTransaction(-annualTaxDue, 'EXPENSE', `Annual Income Tax (${nextPlayer.age - 1})`);
            logsToAdd.push({
                msg: `🏛️ Annual tax bill paid: $${annualTaxDue.toLocaleString()} on $${taxableIncome.toLocaleString()} taxable income.`,
                type: 'negative'
            });
        } else if (netIncome > 0) {
            logsToAdd.push({
                msg: `🏛️ No income tax due this year. Your net income stayed within the $${ANNUAL_TAX_FREE_ALLOWANCE.toLocaleString()} allowance.`,
                type: 'neutral'
            });
        }
    }

    const enteredStreamingAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    emitLoopStage('streaming_rights_calendar_start', { absolute_week: enteredStreamingAbsoluteWeek });
    const streamingRightsCalendarResult = processStreamingRightsCalendarWeek(
        nextPlayer,
        enteredStreamingAbsoluteWeek,
    );
    nextPlayer = streamingRightsCalendarResult.player;
    if (streamingRightsCalendarResult.digest) {
        logsToAdd.push({
            msg: `📅 ${streamingRightsCalendarResult.digest.summary}`,
            type: streamingRightsCalendarResult.digest.actionRequired > 0 ? 'negative' : 'neutral',
        });
    }
    emitLoopStage('streaming_rights_calendar_done', {
        absolute_week: enteredStreamingAbsoluteWeek,
        created_cases: streamingRightsCalendarResult.createdCaseIds.length,
        expired_contracts: streamingRightsCalendarResult.expiredContractIds.length,
    });

    emitLoopStage('streaming_catalogue_packages_start', { absolute_week: enteredStreamingAbsoluteWeek });
    const streamingCataloguePackagesResult = processStreamingCataloguePackagesWeek(
        nextPlayer,
        enteredStreamingAbsoluteWeek,
    );
    nextPlayer = streamingCataloguePackagesResult.player;
    const streamingCataloguePackageAutomationResult = processStreamingCataloguePackageStrategyAutomation(
        nextPlayer,
        enteredStreamingAbsoluteWeek,
    );
    nextPlayer = streamingCataloguePackageAutomationResult.player;
    const cataloguePackageDigest = nextPlayer.world.streamingCataloguePackageDigests
        ?.find(digest => digest.absoluteWeek === enteredStreamingAbsoluteWeek)
        || streamingCataloguePackagesResult.digest;
    if (cataloguePackageDigest) {
        logsToAdd.push({
            msg: `📚 ${cataloguePackageDigest.summary}`,
            type: 'neutral',
        });
    }
    emitLoopStage('streaming_catalogue_packages_done', {
        absolute_week: enteredStreamingAbsoluteWeek,
        proposed_packages: streamingCataloguePackagesResult.createdPackageIds.length,
        signed_packages: streamingCataloguePackageAutomationResult.signedPackageIds.length,
    });

    emitLoopStage('streaming_rights_office_start', { absolute_week: enteredStreamingAbsoluteWeek });
    const streamingRightsOfficeResult = processStreamingRightsOfficeWeek(nextPlayer, enteredStreamingAbsoluteWeek);
    nextPlayer = streamingRightsOfficeResult.player;
    if (streamingRightsOfficeResult.digest) {
        logsToAdd.push({
            msg: `🗂️ Rights Office: ${streamingRightsOfficeResult.digest.summary}.`,
            type: streamingRightsOfficeResult.digest.actionRequired > 0 ? 'negative' : 'neutral',
        });
    }
    emitLoopStage('streaming_rights_office_done', {
        absolute_week: enteredStreamingAbsoluteWeek,
        action_required: streamingRightsOfficeResult.digest?.actionRequired || 0,
        delegated_decisions: streamingRightsOfficeResult.digest?.delegatedDecisions || 0,
    });

    emitLoopStage('streaming_industry_start');
    const streamingIndustryResult = processIndustryWorldWeek(
        nextPlayer,
        nextPlayer.world,
        enteredStreamingAbsoluteWeek,
    );
    nextPlayer = streamingIndustryResult.player;
    nextPlayer.world = streamingIndustryResult.world;
    streamingIndustryResult.logs.forEach(message => logsToAdd.push({ msg: `🏢 ${message}`, type: 'neutral' }));
    const dynastyCareerResult = processDynastyCareerWeek(nextPlayer, enteredStreamingAbsoluteWeek);
    nextPlayer = dynastyCareerResult.player;
    nextPlayer.news = [...dynastyCareerResult.news, ...nextPlayer.news].slice(0, 50);
    dynastyCareerResult.logs.forEach(message => logsToAdd.push({ msg: `👑 ${message}`, type: 'neutral' }));
    const playerCommissionGeneration = generatePlatformAiPlayerCommissionOffers(
        nextPlayer,
        enteredStreamingAbsoluteWeek,
    );
    nextPlayer = playerCommissionGeneration.player;
    if (playerCommissionGeneration.offer) {
        logsToAdd.push({
            msg: `📩 ${playerCommissionGeneration.offer.platformName} sent a production commission to your studio.`,
            type: 'positive',
        });
    }
    emitLoopStage('streaming_industry_done', {
        absolute_week: enteredStreamingAbsoluteWeek,
        world_news: streamingIndustryResult.news.length,
    });

    emitLoopStage('owned_streaming_start');
    nextPlayer = advanceStreamingMarketClearances(nextPlayer).player;
    nextPlayer = advanceStreamingTitleLocalization(nextPlayer).player;
    const ownedStreamingResult = processOwnedStreamingPlatformWeek(nextPlayer);
    nextPlayer = ownedStreamingResult.player;
    if (ownedStreamingResult.snapshot?.operations) {
        logsToAdd.push({
            msg: `EMPIRE+ weekly brief: ${ownedStreamingResult.snapshot.operations.headline}`,
            type: ownedStreamingResult.snapshot.netSubscriberMovement >= 0 ? 'positive' : 'negative',
        });
    }
    emitLoopStage('owned_streaming_done', {
        processed: ownedStreamingResult.processed,
        absolute_week: ownedStreamingResult.snapshot?.absoluteWeek,
        subscriber_movement: ownedStreamingResult.snapshot?.netSubscriberMovement,
    });

    if (nextPlayer.relationships) {
        nextPlayer.relationships = nextPlayer.relationships.map(rel => {
            if ((rel.relation === 'Child' || rel.relation === 'Sibling') && typeof rel.birthWeekAbsolute === 'number') {
                return { ...rel, age: getRelationshipAge(rel, nextPlayer.age, nextPlayer.currentWeek) };
            }
            return rel;
        });
    }
    emitLoopStage('end_week_done', {
        is_dead: Boolean(nextPlayer.flags?.isDead),
        relationships: nextPlayer.relationships?.length || 0,
    });

    // --- 12. GENERATE EVENTS ---
    emitLoopStage('weekly_events_start');
    emitLoopStage('weekly_event_text_start');
    const eventText = await withTimeout(
        generateWeeklyEvent(nextPlayer.age, "Actor", nextPlayer.stats.fame),
        1500,
        "You kept your head down and stayed busy."
    );
    logsToAdd.push({ msg: eventText, type: 'neutral' });
    emitLoopStage('weekly_event_text_done');

    emitLoopStage('weekly_news_start');
    try {
        const weeklyNews = generateWeeklyNews(nextPlayer);
        const releaseNewsKeys = weeklyNews
            .map(item => item.id)
            .filter(id => /^news_(bo|crit|uni_cast)_/.test(id));

        if (releaseNewsKeys.length > 0) {
            nextPlayer.activeReleases = nextPlayer.activeReleases.map(release => {
                const matchingKeys = releaseNewsKeys.filter(key => key.endsWith(`_${release.id}`));
                if (matchingKeys.length === 0) return release;

                const generatedNewsKeys = Array.from(new Set([
                    ...(release.generatedNewsKeys || []),
                    ...matchingKeys
                ])).slice(-24);

                return { ...release, generatedNewsKeys };
            });
        }

        const seenNewsIds = new Set<string>();
        nextPlayer.news = [...weeklyNews, ...nextPlayer.news]
            .filter(item => {
                if (!item?.id) return true;
                if (seenNewsIds.has(item.id)) return false;
                seenNewsIds.add(item.id);
                return true;
            })
            .slice(0, 50);
    } catch (error) {
        console.error('Weekly news generation failed during week processing:', error);
    }
    emitLoopStage('weekly_news_done', { news_items: nextPlayer.news?.length || 0 });

    emitLoopStage('weekly_social_start');
    try {
        const releaseSocial = [
            ...generateUniverseSocialReactions(nextPlayer),
            ...generateReleaseSocialReactions(nextPlayer),
        ];
        if (releaseSocial.length > 0) {
            const existingXFeed = nextPlayer.x?.feed || [];
            const knownXIds = new Set(existingXFeed.map(post => post.id));
            const freshReleaseSocial = releaseSocial.filter(post => !knownXIds.has(post.id));
            if (freshReleaseSocial.length > 0) {
                nextPlayer.x = {
                    ...(nextPlayer.x || { handle: '@player', followers: 0, posts: [], lastPostWeek: 0 }),
                    feed: [...freshReleaseSocial, ...existingXFeed].slice(0, 80)
                };
            }
        }
        const releaseInstagram = generateReleaseInstagramReactions(nextPlayer);
        const existingInstagram = nextPlayer.instagram.feed || [];
        const knownInstagramIds = new Set(existingInstagram.map(post => post.id));
        const freshReleaseInstagram = releaseInstagram.filter(post => !knownInstagramIds.has(post.id));
        const weeklyInsta = generateWeeklyFeed(nextPlayer);
        // CRITICAL FIX: Limit Instagram Feed History to prevent overflow
        nextPlayer.instagram.feed = [...freshReleaseInstagram, ...weeklyInsta, ...existingInstagram]
            .filter((post, index, posts) => posts.findIndex(candidate => candidate.id === post.id) === index)
            .slice(0, 50);
    } catch (error) {
        console.error('Weekly social feed generation failed during week processing:', error);
    }

    // Limit social history (User Posts) to prevent bloat (e.g. 200 posts)
    if (nextPlayer.instagram?.posts && nextPlayer.instagram.posts.length > 200) {
        nextPlayer.instagram.posts = nextPlayer.instagram.posts.slice(0, 200);
    }
    if (nextPlayer.x?.posts && nextPlayer.x.posts.length > 200) {
        nextPlayer.x.posts = nextPlayer.x.posts.slice(0, 200);
    }
    emitLoopStage('weekly_social_done', { instagram_feed: nextPlayer.instagram?.feed?.length || 0 });
    await yieldWeekProcessingFrame();

    emitLoopStage('weekly_offers_start');
    if (nextPlayer.team.agent) {
        try {
            const agentOffer = generateAgentOffers(nextPlayer);
            if (agentOffer) {
                const enrichedOffer = enrichAuditionOpportunity(agentOffer, nextPlayer);
                const identity = getCharacterIdentityLabels(enrichedOffer.characterProfile!).join(' · ');
                const industryLine = getRoleOfferMessageLine(enrichedOffer);
                const storyFitLine = enrichedOffer.characterStoryFit
                    ? `${formatCharacterStoryFitLabel(enrichedOffer.characterStoryFit.label)}: ${enrichedOffer.characterStoryFit.summary}`
                    : '';
                nextPlayer.inbox.unshift({
                    id: `offer_${Date.now()}`,
                    sender: nextPlayer.team.agent.name,
                    subject: `Audition: ${enrichedOffer.projectName}`,
                    text: `${enrichedOffer.roleType} billing · ${identity}. ${storyFitLine} ${industryLine || `${enrichedOffer.roleFit?.label.replaceAll('_', ' ').toLowerCase() || 'Fresh casting'} for your current screen identity.`}`.trim(),
                    type: 'OFFER_ROLE',
                    data: enrichedOffer,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: 4
                });
            }
        } catch (error) {
            console.error('Agent offer generation failed during week processing:', error);
        }
    }
    
    const currentOfferAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);

    if (nextPlayer.team.manager) {
        const lastOfferWeek = Number(nextPlayer.flags.lastSponsorshipOfferAbsoluteWeek || 0);
        const managerTier = nextPlayer.team.manager.tier;
        
        // Dynamic cooldown based on manager tier
        let minCooldown = 5;
        if (managerTier === 'STANDARD') minCooldown = 3;
        if (managerTier === 'ELITE') minCooldown = 2;
        
        if (currentOfferAbsoluteWeek - lastOfferWeek >= minCooldown + Math.floor(Math.random() * 3)) {
            try {
                const sponOffer = generateManagerOffer(nextPlayer);
                if (sponOffer) {
                    nextPlayer.inbox.unshift({ id: `spon_${Date.now()}`, sender: nextPlayer.team.manager.name, subject: `Sponsorship: ${sponOffer.brandName}`, text: "Brand deal offer.", type: 'OFFER_SPONSORSHIP', data: sponOffer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 3 });
                    nextPlayer.flags.lastSponsorshipOfferAbsoluteWeek = currentOfferAbsoluteWeek;
                    nextPlayer.flags.lastSponsorshipOfferWeek = nextPlayer.currentWeek;
                    nextPlayer.flags.sponsorshipPity = 0; // Reset pity
                    logsToAdd.push({ msg: `🤝 Brand Deal: ${sponOffer.brandName} wants to work with you!`, type: 'positive' });
                } else {
                    // Increment pity if no offer was generated
                    nextPlayer.flags.sponsorshipPity = (nextPlayer.flags.sponsorshipPity || 0) + 1;
                }
            } catch (error) {
                console.error('Manager offer generation failed during week processing:', error);
            }
        }
    }

    const lastYoutubeCollabOfferWeek = Number(nextPlayer.flags.lastYoutubeCollabOfferAbsoluteWeek || 0);
    if (nextPlayer.youtube.subscribers >= 1500 && currentOfferAbsoluteWeek - lastYoutubeCollabOfferWeek >= 4 + Math.floor(Math.random() * 3)) {
        try {
            const collabOffer = generateYoutubeCollabOffer(nextPlayer, language);
            if (collabOffer) {
                nextPlayer.inbox.unshift({
                    id: `ytcollab_${Date.now()}`,
                    sender: collabOffer.creatorName,
                    subject: t(language, 'services.youtube.inbox.collab.subject', { concept: collabOffer.conceptTitle }),
                    text: t(language, 'services.youtube.inbox.collab.text', { creator: collabOffer.creatorName }),
                    type: 'OFFER_YOUTUBE_COLLAB',
                    data: collabOffer,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: collabOffer.expiresInWeeks
                });
                nextPlayer.flags.lastYoutubeCollabOfferAbsoluteWeek = currentOfferAbsoluteWeek;
                nextPlayer.flags.lastYoutubeCollabOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: t(language, 'services.youtube.log.collabOffer', { creator: collabOffer.creatorName }), type: 'positive' });
            }
        } catch (error) {
            console.error('YouTube collab generation failed during week processing:', error);
        }
    }

    const lastYoutubeBrandOfferWeek = Number(nextPlayer.flags.lastYoutubeBrandOfferAbsoluteWeek || 0);
    if (nextPlayer.youtube.isMonetized && currentOfferAbsoluteWeek - lastYoutubeBrandOfferWeek >= 5 + Math.floor(Math.random() * 3)) {
        try {
            const brandDeal = generateYoutubeBrandDeal(nextPlayer, language);
            if (brandDeal) {
                nextPlayer.inbox.unshift({
                    id: `ytbrand_${Date.now()}`,
                    sender: t(language, 'services.youtube.inbox.brand.sender', { brand: brandDeal.brandName }),
                    subject: t(language, 'services.youtube.inbox.brand.subject', { brand: brandDeal.brandName }),
                    text: t(language, 'services.youtube.inbox.brand.text', { brand: brandDeal.brandName }),
                    type: 'OFFER_YOUTUBE_BRAND',
                    data: brandDeal,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: brandDeal.expiresInWeeks
                });
                nextPlayer.flags.lastYoutubeBrandOfferAbsoluteWeek = currentOfferAbsoluteWeek;
                nextPlayer.flags.lastYoutubeBrandOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: t(language, 'services.youtube.log.brandOffer', { brand: brandDeal.brandName }), type: 'positive' });
            }
        } catch (error) {
            console.error('YouTube brand deal generation failed during week processing:', error);
        }
    }

    const lastMusicVideoFeatureOfferWeek = Number(nextPlayer.flags.lastMusicVideoFeatureOfferAbsoluteWeek || 0);
    const musicFeaturePull = (nextPlayer.stats.fame || 0) + (nextPlayer.youtube?.subscribers || 0) / 50000;
    if (musicFeaturePull >= 35 && currentOfferAbsoluteWeek - lastMusicVideoFeatureOfferWeek >= 5 + Math.floor(Math.random() * 4)) {
        try {
            const featureOffer = generateMusicVideoFeatureOffer(nextPlayer, language);
            if (featureOffer) {
                nextPlayer.inbox.unshift({
                    id: `musicfeature_${Date.now()}`,
                    sender: t(language, 'services.youtube.inbox.musicFeature.sender', { artist: featureOffer.artistName }),
                    subject: t(language, 'services.youtube.inbox.musicFeature.subject', { song: featureOffer.songTitle }),
                    text: t(language, 'services.youtube.inbox.musicFeature.text', { artist: featureOffer.artistName }),
                    type: 'OFFER_MUSIC_VIDEO_FEATURE',
                    data: featureOffer,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: featureOffer.expiresInWeeks
                });
                nextPlayer.flags.lastMusicVideoFeatureOfferAbsoluteWeek = currentOfferAbsoluteWeek;
                nextPlayer.flags.lastMusicVideoFeatureOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: t(language, 'services.youtube.log.musicFeatureOffer', { artist: featureOffer.artistName, song: featureOffer.songTitle }), type: 'positive' });
            }
        } catch (error) {
            console.error('Music video feature generation failed during week processing:', error);
        }
    }

    const currentAbsoluteWeekForOutsideDeals = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const hasOutsideProducerCadence = Number.isFinite(Number(nextPlayer.flags.lastOutsideProducerOfferWeek))
        && Number(nextPlayer.flags.lastOutsideProducerOfferWeek) > 0;
    if (!hasOutsideProducerCadence) {
        nextPlayer.flags.lastOutsideProducerOfferWeek = currentAbsoluteWeekForOutsideDeals;
    }
    const lastOutsideProducerOfferWeek = hasOutsideProducerCadence
        ? Number(nextPlayer.flags.lastOutsideProducerOfferWeek)
        : currentAbsoluteWeekForOutsideDeals;
    const outsideDealGap = currentAbsoluteWeekForOutsideDeals - lastOutsideProducerOfferWeek;
    const hasPendingOutsideDeal = nextPlayer.inbox.some(message => message.type === 'OFFER_OUTSIDE_PRODUCER_INVESTMENT');
    const outsideDealCadenceWeeks = getOutsideProducerOfferCadenceWeeks(nextPlayer);
    const activeOutsideExposure = (nextPlayer.outsideProductions || []).filter(item => !['FINISHED', 'CANCELLED'].includes(item.status)).length;
    const hotOutsideDealWeek = outsideDealGap >= outsideDealCadenceWeeks
        && activeOutsideExposure < 5
        && (currentAbsoluteWeekForOutsideDeals + Math.round(nextPlayer.money / 1_000_000)) % 19 === 0;
    if (!hasPendingOutsideDeal && (outsideDealGap >= outsideDealCadenceWeeks || hotOutsideDealWeek)) {
        try {
            const offerCount = hotOutsideDealWeek ? 2 : 1;
            const outsideOffers = generateOutsideProducerInvestmentOffers(nextPlayer, offerCount);
            outsideOffers.forEach(offer => {
                nextPlayer.inbox.unshift(buildOutsideProducerInvestmentMessage(offer, language));
            });
            if (outsideOffers.length) {
                nextPlayer.flags.lastOutsideProducerOfferWeek = currentAbsoluteWeekForOutsideDeals;
                logsToAdd.push({
                    msg: outsideOffers.length > 1
                        ? t(language, 'services.outsideProducer.gameLoop.multipleOffersLog', { count: outsideOffers.length })
                        : t(language, 'services.outsideProducer.gameLoop.singleOfferLog', { title: outsideOffers[0].projectTitle }),
                    type: 'neutral'
                });
            }
        } catch (error) {
            console.error('Outside producer investment offer generation failed during week processing:', error);
        }
    }

    try {
        const usedTitles = [
            ...nextPlayer.commitments.map(commitment => commitment.name),
            ...nextPlayer.activeReleases.map(release => release.name),
            ...nextPlayer.pastProjects.map(project => project.name),
            ...nextPlayer.inbox
                .map(message => (message.data as AuditionOpportunity | undefined)?.projectName)
                .filter((title): title is string => typeof title === 'string')
        ];
        const breakthroughInvite = generateBreakthroughAuditionInvite(nextPlayer, usedTitles, language);
        if (breakthroughInvite) {
            nextPlayer.inbox.unshift({
                id: `breakthrough_invite_${Date.now()}_${Math.random()}`,
                sender: breakthroughInvite.sender,
                subject: breakthroughInvite.subject,
                text: breakthroughInvite.text,
                type: 'OFFER_AUDITION',
                data: breakthroughInvite.opportunity,
                isRead: false,
                weekSent: nextPlayer.currentWeek,
                expiresIn: 4
            });
            nextPlayer.flags.lastBreakthroughInviteAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
            logsToAdd.push({
                msg: t(language, 'services.weeklyOffer.breakthrough.log', {
                    projectName: breakthroughInvite.opportunity.projectName,
                    role: t(language, `services.weeklyOffer.role.${breakthroughInvite.opportunity.roleType}`),
                }),
                type: 'positive'
            });
        }
    } catch (error) {
        console.error('Breakthrough audition invite generation failed during week processing:', error);
    }

    try {
        const directOffer = generateDirectOffer(nextPlayer);
        if (directOffer) {
            const enrichedDirectOffer = enrichAuditionOpportunity(directOffer, nextPlayer);
            const directIdentity = getCharacterIdentityLabels(enrichedDirectOffer.characterProfile!).join(' · ');
            const directIndustryLine = getRoleOfferMessageLine(enrichedDirectOffer);
            const directStoryFitLine = enrichedDirectOffer.characterStoryFit
                ? `${formatCharacterStoryFitLabel(enrichedDirectOffer.characterStoryFit.label)}: ${enrichedDirectOffer.characterStoryFit.summary}`
                : '';
            nextPlayer.inbox.unshift({
                id: `direct_${Date.now()}`,
                sender: t(language, 'services.weeklyOffer.direct.sender'),
                subject: t(language, 'services.weeklyOffer.direct.subject', { projectName: enrichedDirectOffer.projectName }),
                text: `${t(language, 'services.weeklyOffer.direct.text')} ${enrichedDirectOffer.roleType} billing · ${directIdentity}. ${directStoryFitLine} ${directIndustryLine}`.trim(),
                type: 'OFFER_ROLE',
                data: enrichedDirectOffer,
                isRead: false,
                weekSent: nextPlayer.currentWeek,
                expiresIn: 4
            });
            nextPlayer.flags.lastDirectOfferAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
            nextPlayer.flags.lastDirectOfferWeek = nextPlayer.currentWeek;
            logsToAdd.push({ msg: t(language, 'services.weeklyOffer.direct.log', { projectName: enrichedDirectOffer.projectName }), type: 'positive' });
        }
    } catch (error) {
        console.error('Direct offer generation failed during week processing:', error);
    }

    const currentNpcVentureOfferAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const lastNpcVentureOfferWeek = Number(nextPlayer.flags.lastNpcVentureOfferAbsoluteWeek || 0);
    if (currentNpcVentureOfferAbsoluteWeek - lastNpcVentureOfferWeek >= 7 + Math.floor(Math.random() * 4)) {
        try {
            const ventureOffer = generateNpcVentureRoleOffer(nextPlayer);
            if (ventureOffer) {
                nextPlayer.inbox.unshift({
                    id: `npc_venture_offer_${Date.now()}`,
                    sender: t(language, 'services.npcVenture.inbox.sender', { ventureName: ventureOffer.venture.name }),
                    subject: t(language, 'services.npcVenture.inbox.subject', { projectName: ventureOffer.opportunity.projectName }),
                    text: getNpcVentureOfferText(ventureOffer.venture, ventureOffer.opportunity, language),
                    type: 'OFFER_ROLE',
                    data: ventureOffer.opportunity,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: 4
                });
                nextPlayer.flags.lastNpcVentureOfferAbsoluteWeek = currentNpcVentureOfferAbsoluteWeek;
                nextPlayer.flags.lastNpcVentureOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: t(language, 'services.npcVenture.log.offer', { ventureName: ventureOffer.venture.name }), type: 'positive' });
            }
        } catch (error) {
            console.error('NPC venture offer generation failed during week processing:', error);
        }
    }
    
    if (nextPlayer.currentWeek % 3 === 0) {
        // Updated: usedTitles now includes past projects to prevent repeating famous titles
        const usedTitles = [
            ...nextPlayer.commitments.map(c => c.name), 
            ...nextPlayer.activeReleases.map(r => r.name),
            ...nextPlayer.pastProjects.map(p => p.name),
            ...nextPlayer.inbox
                .map(message => (message.data as AuditionOpportunity | undefined)?.projectName)
                .filter((title): title is string => typeof title === 'string')
        ];
        nextPlayer.weeklyOpportunities = { auditions: generateAuditions(nextPlayer, usedTitles), jobs: generatePartTimeJobs() };
        logsToAdd.push({ msg: "🔄 CastLink updated.", type: 'neutral' });
    }
    emitLoopStage('weekly_offers_done', { inbox_messages: nextPlayer.inbox?.length || 0 });
    emitLoopStage('weekly_events_done', {
        inbox_messages: nextPlayer.inbox?.length || 0,
        weekly_auditions: nextPlayer.weeklyOpportunities?.auditions?.length || 0,
    });

    emitLoopStage('studio_funding_start');
		nextPlayer.businesses.forEach(business => {
		    if (business.type !== 'PRODUCTION_HOUSE' || !business.studioState) return;

	    const investorLeadership = processInvestorLeadershipChanges({
	        studio: business,
	        week: nextPlayer.currentWeek,
	        year: nextPlayer.age
	    });
	    if (investorLeadership.changes.length) {
	        business.studioState = investorLeadership.studio.studioState;
	        investorLeadership.changes.forEach(change => {
	            const investorName = change.investorId
	                .replace('investor_', '')
	                .split('_')
	                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
	                .join(' ');
	            nextPlayer.news.unshift({
	                id: `news_investor_leadership_${change.investorId}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
	                headline: `${investorName} appoints ${change.newOwnerName}`,
	                subtext: `${change.newOwnerName} is now ${change.title}. This stays as an industry item, not a personal live-feed event.`,
	                category: 'INDUSTRY',
	                week: nextPlayer.currentWeek,
	                year: nextPlayer.age,
	                impactLevel: 'LOW'
	            });
	        });
	        nextPlayer.news = nextPlayer.news.slice(0, 50);
	    }

	    const contractResult = processStreamingFundingContracts({
            lockedStreamingFunds: business.studioState.lockedStreamingFunds || [],
            platformRelations: business.studioState.platformRelations || {},
            currentWeek: nextPlayer.currentWeek,
            currentYear: nextPlayer.age
        });

        business.studioState.lockedStreamingFunds = contractResult.lockedStreamingFunds;
        business.studioState.platformRelations = contractResult.platformRelations;

        contractResult.events.forEach(event => {
            const platformName = event.funding.platformName || 'Streaming platform';
            const sourceTitle = event.funding.sourceTitle || 'the funded series';

            if (event.type === 'WARNING' || event.type === 'FINAL_WARNING') {
                const isFinal = event.type === 'FINAL_WARNING';
                nextPlayer.inbox.unshift({
                    id: `funding_deadline_${event.funding.id}_${event.type}`,
                    sender: t(language, 'services.gameLoop.fundingDeadline.sender', { platformName }),
                    subject: t(language, isFinal ? 'services.gameLoop.fundingDeadline.finalSubject' : 'services.gameLoop.fundingDeadline.subject', { sourceTitle }),
                    text: t(language, 'services.gameLoop.fundingDeadline.text', {
                        platformName,
                        amount: formatMoneyShort(event.funding.amount),
                        weeks: String(event.weeksRemaining)
                    }),
                    type: 'SYSTEM',
                    data: {
                        fundingId: event.funding.id,
                        platformId: event.funding.platformId,
                        weeksRemaining: event.weeksRemaining
                    },
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: Math.max(8, event.weeksRemaining)
                });
                logsToAdd.push({
                    msg: t(language, isFinal ? 'services.gameLoop.fundingDeadline.finalLog' : 'services.gameLoop.fundingDeadline.log', {
                        sourceTitle,
                        weeks: String(event.weeksRemaining)
                    }),
                    type: isFinal ? 'negative' : 'neutral'
                });
                return;
            }

            const platform = nextPlayer.world.platforms?.[event.funding.platformId as PlatformId];
            if (platform) {
                platform.cashReserve += Math.max(0, event.funding.amount);
            }

            const lifeEvent = createFundingBreachLifeEvent(
                business.id,
                business.name,
                event.funding.platformId,
                platformName,
                sourceTitle,
                Math.max(0, event.funding.amount),
                business.balance,
                language
            );
            nextPlayer.pendingEvents.push({
                id: lifeEvent.id,
                week: nextPlayer.currentWeek,
                type: 'SCANDAL',
                title: lifeEvent.title,
                description: lifeEvent.description,
                data: { lifeEvent }
            });
            nextPlayer.inbox.unshift({
                id: `funding_default_${event.funding.id}`,
                sender: t(language, 'services.gameLoop.fundingDefault.sender', { platformName }),
                subject: t(language, 'services.gameLoop.fundingDefault.subject', { sourceTitle }),
                text: t(language, 'services.gameLoop.fundingDefault.text', {
                    platformName,
                    amount: formatMoneyShort(event.funding.amount)
                }),
                type: 'SYSTEM',
                data: {
                    fundingId: event.funding.id,
                    platformId: event.funding.platformId,
                    status: 'DEFAULTED'
                },
                isRead: false,
                weekSent: nextPlayer.currentWeek,
                expiresIn: 26
            });
            nextPlayer.news.unshift({
                id: `news_funding_default_${event.funding.id}_${Date.now()}`,
                headline: t(language, 'services.gameLoop.fundingDefault.news.headline', { platformName, sourceTitle }),
                subtext: t(language, 'services.gameLoop.fundingDefault.news.subtext', { businessName: business.name }),
                category: 'INDUSTRY',
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                impactLevel: 'MEDIUM'
            });
            logsToAdd.push({
                msg: t(language, 'services.gameLoop.fundingDefault.log', { platformName, sourceTitle }),
                type: 'negative'
            });
	        });
	    });
    emitLoopStage('studio_funding_done');

    emitLoopStage('subsidiaries_start');
    nextPlayer = processSubsidiaryAutonomousOperations(nextPlayer);
    nextPlayer = processSubsidiaryDecisionEngine(nextPlayer);
    nextPlayer = processLivingEnsembleWeek(nextPlayer);
    emitLoopStage('subsidiaries_done', {
        subsidiaries: nextPlayer.businesses?.filter(business => (business as any).parentStudioId).length || 0,
    });

    const actorArcTransition = getActorCareerArcTransitionFromPrevious(actorArcBeforeWeek, nextPlayer);
    const currentArcAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
    const lastArcNotificationWeek = Number(nextPlayer.flags?.lastActorArcNotificationAbsoluteWeek ?? -999);
    const arcNotificationReady = currentArcAbsoluteWeek - lastArcNotificationWeek >= 4;
    if (actorArcTransition && arcNotificationReady) {
        logsToAdd.push({
            msg: t(language, actorArcTransition.logKey, {
                arc: t(language, actorArcTransition.current.labelKey),
            }),
            type: actorArcTransition.tone,
        });
        nextPlayer.flags = {
            ...(nextPlayer.flags || {}),
            lastActorArcNotificationAbsoluteWeek: currentArcAbsoluteWeek,
            lastActorArcNotificationId: actorArcTransition.current.id,
        };
    }

    // Final safety caps keep older saves from becoming too heavy for mobile WebViews.
    nextPlayer.inbox = ensureObjectArray<Message>(nextPlayer.inbox).slice(0, 120);
    nextPlayer.news = ensureObjectArray<NewsItem>(nextPlayer.news).slice(0, 80);
    if (nextPlayer.instagram?.feed) nextPlayer.instagram.feed = ensureObjectArray<InstaPost>(nextPlayer.instagram.feed).slice(0, 80);
    if (nextPlayer.x?.feed) nextPlayer.x.feed = ensureObjectArray<XPost>(nextPlayer.x.feed).slice(0, 80);

    // Apply Logs - Limit to last 50 entries to prevent storage overflow (CRITICAL FIX)
    const allLogs = [...nextPlayer.logs, ...logsToAdd.map(l => ({ week: nextPlayer.currentWeek, year: nextPlayer.age, message: l.msg, type: l.type }))];
    nextPlayer.logs = allLogs.slice(-50);
    emitLoopStage('final_trim_done', {
        logs_added: logsToAdd.length,
        inbox_messages: nextPlayer.inbox?.length || 0,
        news_items: nextPlayer.news?.length || 0,
    });

    addBreadcrumb('game_loop:complete', {
        age: nextPlayer.age,
        week: nextPlayer.currentWeek,
        logsAdded: logsToAdd.length,
        inbox: nextPlayer.inbox?.length || 0,
    });
    trackGameEvent('game_loop_completed', {
        age: nextPlayer.age,
        week: nextPlayer.currentWeek,
        logs_added: logsToAdd.length,
        inbox_count: nextPlayer.inbox?.length || 0,
    });
    return { player: nextPlayer, triggerAd };
};
