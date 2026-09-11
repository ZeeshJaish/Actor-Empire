import React, { useState, useMemo } from 'react';
import { Player, PendingEvent, ScreeningStrategy, ProjectHiddenStats, NextSeasonFundingTier, CampaignPositioning, CampaignTimeline, MarketingChannelAllocations, MarketingChannelId, BoxOfficeRegionId, CinemaChainId, CinemaChain, CinemaChainRegionalTerms, ReleasePlanningDraft, StreamingBiddingSession, StreamingOfferVersion, PlatformId } from '../../../types';
import { FESTIVALS, CALENDAR_EVENTS } from '../../../services/worldLogic';
import { mergeUniverseRosterWithProject, normalizeUniverseMap } from '../../../services/universeLogic';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import { calculateBalancedNextSeasonFundingCap, getPlatformFundingRelationshipMultiplier } from '../../../services/streamingFundingLogic';
import { CAMPAIGN_POSITIONING_OPTIONS, CAMPAIGN_TIMELINE_OPTIONS, MARKETING_CHANNEL_OPTIONS, calculateCampaignFit, calculateCampaignForecast, normalizeMarketingChannelAllocations } from '../../../services/marketingStrategy';
import { BOX_OFFICE_REGIONS, getBoxOfficeRegionLabel, getBoxOfficeRegionShortLabel, getCinemaChainById, getCinemaChainTerms, getCinemaChainsForRegion } from '../../../services/cinemaChains';
import { getDefaultReleaseRegionIds, getRegionMapSummary, normalizeReleaseRegionIds } from '../../../services/regionMap';
import { getBoxOfficeCaps } from '../../../services/roleLogic';
import { applyMusicImpactToHiddenStats, calculateProjectMusicImpact } from '../../../services/musicIndustry';
import { applyInvestorPayoutMemory, calculateInvestorPayout } from '../../../services/projectInvestors';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { spendPlayerEnergy } from '../../../services/premiumLogic';
import { PHASE_ONE_ENERGY_COSTS } from '../../../services/energyCosts';
import { getProjectFundingEconomics } from '../../../services/projectFundingEconomics';
import { calculateCampaignReachProfile } from '../../../services/studioProductionEconomy';
import { registerProductionStreamingRightsContract, registerProductionStreamingRightsContractFromOffer } from '../../../services/streamingRightsCore';
import { acceptStreamingBiddingOffer, createStreamingBiddingSession, finishStreamingBiddingSession, getRestorableStreamingBiddingSession, getStreamingBiddingClosingOffers, getStreamingOfferFundingAllocation, leaveStreamingBiddingSession, upsertStreamingBiddingSession } from '../../../services/streamingBidding';
import { createDeterministicId, createDeterministicRng } from '../../../services/deterministicRandom';
import { resolveCapabilityBackedLocalizationPromise } from '../../../services/platformAi/platformAiLocalizationCore';
import { resolveStreamingPlatformBrandById } from '../../../services/streamingPlatformBrandRegistry';
import { getPlatformAiSpendingRestrictions } from '../../../services/platformAi/platformAiFinancing';
import { buildStreamingBiddingRightsLot } from '../../../services/streamingRightsCompatibility';
import { getCanonicalScheduledRivals } from '../../../services/industryWorld/publicIndustryProjection';
import { getForbesStreamingCompanies } from '../../../services/streamingPlatformEcosystem';
import { buildReleaseStreamingBidderMarket } from '../../../services/releaseStreamingAuction';
import { getReleaseWizardEntryStep } from '../../../services/releasePlanningCommitment';
import {
    CalendarStep,
    CampaignStep,
    DistributionStep,
    FestivalsStep,
    FinalizeStep,
    ReleaseStrategyShell,
    StreamingWarRoomStep,
    TheatricalDeskStep,
    buildReleaseFilmArt,
    getReleaseWizardPhase,
    getReleaseWizardProgress,
    toReleaseWizardRoute,
} from './release-strategy-transplant';

interface ReleaseWizardProps {
    player: Player;
    studio: any;
    project: any;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onComplete: () => void;
    isPostTheatricalBidding?: boolean;
}

const appendInvestorPayoutSummary = (summary: any, payout: number) => {
    const safePayout = Math.max(0, Math.round(Number(payout) || 0));
    return {
        lifetimeInvestorPayout: Math.max(0, Math.round(Number(summary?.lifetimeInvestorPayout) || 0)) + safePayout,
        weeklyInvestorPayouts: [...(Array.isArray(summary?.weeklyInvestorPayouts) ? summary.weeklyInvestorPayouts : []), safePayout].slice(-52)
    };
};

const PLATFORM_ECONOMICS: Array<{
    id: PlatformId;
    baseBid: number;
    qualityReq: number;
    maxBudget: number;
}> = [
    { id: 'NETFLIX', baseBid: 12000000, qualityReq: 72, maxBudget: 420000000 },
    { id: 'APPLE_TV', baseBid: 17000000, qualityReq: 82, maxBudget: 560000000 },
    { id: 'DISNEY_PLUS', baseBid: 11000000, qualityReq: 70, maxBudget: 520000000 },
    { id: 'HULU', baseBid: 7500000, qualityReq: 58, maxBudget: 180000000 },
    { id: 'YOUTUBE', baseBid: 3000000, qualityReq: 38, maxBudget: 80000000 },
];

const PLATFORMS = PLATFORM_ECONOMICS.map(economics => {
    const brand = resolveStreamingPlatformBrandById(economics.id);
    return {
        ...economics,
        name: brand.displayName,
        color: brand.primaryColor,
    };
});

const normalizeDistributionChainSelectionRecord = (rawSelections: unknown): Partial<Record<BoxOfficeRegionId, CinemaChainId[]>> => {
    if (!rawSelections || typeof rawSelections !== 'object') return {};

    return Object.entries(rawSelections as Record<string, CinemaChainId | CinemaChainId[]>).reduce((normalized, [regionId, chainSelection]) => {
        const chainIds = (Array.isArray(chainSelection) ? chainSelection : [chainSelection])
            .filter((chainId): chainId is CinemaChainId => Boolean(chainId));
        const uniqueChainIds = Array.from(new Set(chainIds));

        if (uniqueChainIds.length > 0) {
            normalized[regionId as BoxOfficeRegionId] = uniqueChainIds;
        }

        return normalized;
    }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>);
};

const inferScreeningStrategyFromRegionCount = (regionCount: number): ScreeningStrategy => {
    if (regionCount <= 2) return 'REGIONAL';
    if (regionCount <= 4) return 'NATIONAL';
    return 'INTERNATIONAL';
};

export const getStreamingBidProfile = (packageScore: number, isSeries: boolean, isPostTheatricalBidding?: boolean, runStrength = 0) => {
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

    if (isPostTheatricalBidding) {
        if (runStrength < 0.8) {
            floor *= packageScore < 45 ? 0.96 : 0.98;
            ceiling *= 0.82;
        } else if (runStrength >= 2) {
            const validationBoost = Math.min(1.65, 1 + ((runStrength - 2) * 0.11));
            floor *= Math.min(1.35, validationBoost);
            ceiling *= validationBoost;
        }
    }

    const capBoost = packageScore >= 92 ? 8 : packageScore >= 84 ? 5.6 : packageScore >= 72 ? 3.6 : packageScore >= 60 ? 2.1 : 1.15;
    const safetyPremium = packageScore >= 84 ? 2.35 : packageScore >= 72 ? 1.95 : packageScore >= 60 ? 1.55 : packageScore < 45 ? 0.92 : 1.2;

    return {
        floor: Math.max(0.8, floor),
        ceiling: Math.max(floor + 0.08, ceiling),
        capBoost,
        safetyPremium
    };
};

const getStreamingMarketProofCap = (
    projectBudget: number,
    packageScore: number,
    hiddenStats: Partial<ProjectHiddenStats> = {},
    isSeries: boolean,
    isPostTheatricalBidding?: boolean,
    theatricalGross = 0,
    hasProvenIp = false
) => {
    if (projectBudget <= 0) return Number.MAX_SAFE_INTEGER;

    const castingStrength = hiddenStats.castingStrength ?? 50;
    const fameMultiplier = hiddenStats.fameMultiplier ?? 1;
    const rawHype = hiddenStats.rawHype ?? 50;

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

    const straightCap = projectBudget * Math.max(1.05, capMultiplier);
    if (!isPostTheatricalBidding || theatricalGross <= 0) return straightCap;

    const theatricalValidationCap = theatricalGross * (packageScore >= 90 || castingStrength >= 85 ? 0.92 : 0.72);
    return Math.max(straightCap, theatricalValidationCap);
};

type BidType = 'UPFRONT_ONLY' | 'GREENLIGHT_DEAL' | 'BACKEND_POINTS';

interface Bid {
    id: string;
    platformId: string;
    amount: number;
    type: BidType;
    fundingAmount?: number;
    backendPct?: number;
    fundingTier?: NextSeasonFundingTier;
    fundingReason?: string;
    bidValue: number;
    timestamp: number;
}

interface FundingPerformanceContext {
    genre?: string;
    rating?: number;
    seasonOneViews?: number;
    streamingRevenue?: number;
    rawHype?: number;
}

export const calculateStreamingAuctionOffer = (
    platform: typeof PLATFORMS[number],
    projectBudget: number,
    packageScore: number,
    isSeries: boolean,
    currentHighestBidValue: number,
    previousBestBidValue?: number,
    isPostTheatricalBidding?: boolean,
    theatricalGross = 0,
    hiddenStats: Partial<ProjectHiddenStats> = {},
    hasProvenIp = false,
    fundingContext: FundingPerformanceContext = {},
    relationshipMultiplier = 1
): Bid | null => {
    const seed = [
        'legacy-streaming-auction', platform.id, projectBudget, packageScore, isSeries,
        currentHighestBidValue, previousBestBidValue || 0, Boolean(isPostTheatricalBidding),
        theatricalGross, hasProvenIp, relationshipMultiplier,
        hiddenStats.rawHype || 0, hiddenStats.qualityScore || 0,
        fundingContext.genre || '', fundingContext.rating || 0,
        fundingContext.seasonOneViews || 0, fundingContext.streamingRevenue || 0,
    ].join(':');
    const rng = createDeterministicRng(seed);
    const runStrength = projectBudget > 0 && theatricalGross > 0 ? theatricalGross / projectBudget : 0;
    const bidProfile = getStreamingBidProfile(packageScore, isSeries, isPostTheatricalBidding, runStrength);
    const safetyPremium = bidProfile.safetyPremium;
    const qualityEscalator = Math.max(0.85, 0.95 + ((packageScore - 55) / 105));
    const baseFloorOffer = projectBudget > 0 ? projectBudget * bidProfile.floor : platform.baseBid;
    const topPlatformBudget = Math.max(...PLATFORMS.map(p => p.maxBudget));
    const platformMuscle = topPlatformBudget > 0 ? platform.maxBudget / topPlatformBudget : 0.5;
    const floorVariance = 0.96 + (rng() * 0.1) + (platformMuscle * 0.05);
    const safeMinimum = projectBudget > 0
        ? Math.max(baseFloorOffer, packageScore < 45 ? projectBudget * 0.8 : 0)
        : baseFloorOffer;
    const floorOffer = Math.floor(Math.max(safeMinimum, baseFloorOffer * floorVariance));
    const qualityRange = projectBudget > 0
        ? projectBudget * (bidProfile.floor + ((bidProfile.ceiling - bidProfile.floor) * (0.24 + rng() * 0.62)))
        : platform.baseBid * (0.95 + rng() * 0.35) * safetyPremium;
    const platformAppetite = platform.baseBid * (packageScore / 52) * (1 + rng() * 0.32) * safetyPremium * qualityEscalator;
    const theatricalProof = theatricalGross > 0
        ? theatricalGross * (0.42 + Math.min(0.34, packageScore / 290) + rng() * 0.12)
        : 0;
    const straightToStreamingUpside = !isPostTheatricalBidding && projectBudget > 0
        ? projectBudget * Math.pow(Math.max(0.35, packageScore / 100), 2.35) * (packageScore >= 92 ? 9.5 : packageScore >= 84 ? 6.6 : packageScore >= 72 ? 3.9 : 1.8) * (0.9 + rng() * 0.38)
        : 0;
    const hardCeiling = projectBudget > 0 ? projectBudget * bidProfile.ceiling : Number.MAX_SAFE_INTEGER;
    const marketProofCap = getStreamingMarketProofCap(projectBudget, packageScore, hiddenStats, isSeries, isPostTheatricalBidding, theatricalGross, hasProvenIp);
    const platformSoftCap = Math.max(floorOffer, platform.maxBudget * bidProfile.capBoost);
    let maxOffer = Math.max(
        floorOffer,
        Math.min(
            hardCeiling,
            platformSoftCap,
            marketProofCap,
            Math.max(floorOffer * (1.04 + rng() * 0.12), platformAppetite, qualityRange, theatricalProof, straightToStreamingUpside)
        )
    );
    
    // Re-bidding should discourage fishing for better bids, but never break the safe-floor rule.
    if (previousBestBidValue) {
        if (rng() > 0.05) {
            maxOffer = Math.max(floorOffer, Math.min(maxOffer, previousBestBidValue * (0.7 + rng() * 0.25)));
        }
    }

    if (maxOffer <= currentHighestBidValue * 1.025) return null;

    const newAmount = currentHighestBidValue === 0
        ? Math.floor(Math.max(
            floorOffer,
            Math.min(
                maxOffer,
                Math.max(
                    floorOffer * (0.96 + rng() * 0.18),
                    platform.baseBid * (0.95 + rng() * 0.3) * safetyPremium,
                    maxOffer * (packageScore >= 84 ? 0.42 + rng() * 0.2 : 0.3 + rng() * 0.18)
                )
            )
        ))
        : Math.floor(Math.max(floorOffer, Math.min(maxOffer, currentHighestBidValue * (1.045 + rng() * 0.07))));
    
    const rand = rng();
    let type: BidType = 'UPFRONT_ONLY';
    let fundingAmount = 0;
    let backendPct = 0;
    let upfrontAmount = newAmount;
    let fundingTier: NextSeasonFundingTier | undefined;
    let fundingReason: string | undefined;
    const calculateSeriesFunding = () => calculateBalancedNextSeasonFundingCap({
        projectBudget,
        packageScore,
        currentOffer: newAmount,
        platform,
        genre: fundingContext.genre,
        rating: fundingContext.rating,
        seasonOneViews: fundingContext.seasonOneViews,
        streamingRevenue: fundingContext.streamingRevenue,
        rawHype: fundingContext.rawHype ?? hiddenStats.rawHype,
        hasProvenIp
    });
    
    if (isSeries && rand > 0.66) {
        type = 'GREENLIGHT_DEAL';
        upfrontAmount = newAmount;
        const funding = calculateSeriesFunding();
        fundingAmount = funding.amount;
        fundingTier = funding.tier;
        fundingReason = funding.reason;
    } else if (rand > 0.94) {
        type = 'GREENLIGHT_DEAL';
        upfrontAmount = Math.min(newAmount, Math.floor(Math.max(floorOffer, newAmount * 0.45)));
        if (isSeries) {
            const funding = calculateSeriesFunding();
            fundingAmount = funding.amount;
            fundingTier = funding.tier;
            fundingReason = funding.reason;
        } else {
            fundingAmount = Math.max(0, newAmount - upfrontAmount);
        }
    } else if (rand > 0.84) {
        type = 'BACKEND_POINTS';
        upfrontAmount = Math.min(newAmount, Math.floor(Math.max(floorOffer, newAmount * (isPostTheatricalBidding ? 0.7 : 0.8))));
        backendPct = Math.floor(rng() * (isPostTheatricalBidding ? 6 : 8)) + (isPostTheatricalBidding ? 4 : 6);
    }

    const safeRelationshipMultiplier = Math.max(0.84, Math.min(1.16, Number(relationshipMultiplier) || 1));
    upfrontAmount = Math.floor(upfrontAmount * safeRelationshipMultiplier);
    fundingAmount = Math.floor(fundingAmount * safeRelationshipMultiplier);
    const bidValue = type === 'GREENLIGHT_DEAL' ? upfrontAmount + fundingAmount : upfrontAmount;
    
    return {
        id: createDeterministicId('legacy_streaming_offer', seed, type, upfrontAmount, fundingAmount, backendPct),
        platformId: platform.id,
        amount: upfrontAmount,
        type,
        fundingAmount,
        backendPct,
        fundingTier,
        fundingReason,
        bidValue,
        timestamp: 0
    };
};

export const ReleaseWizard: React.FC<ReleaseWizardProps> = ({ player, studio, project, onBack, onUpdatePlayer, onComplete, isPostTheatricalBidding }) => {
    const savedDraft = project.projectDetails?.releasePlanningDraft as ReleasePlanningDraft | undefined;
    const [commitmentState, setCommitmentState] = useState<'DRAFT' | 'SIGNED'>(savedDraft?.commitmentState || 'DRAFT');
    const [lockedPremiereAbsoluteWeek, setLockedPremiereAbsoluteWeek] = useState<number | null>(savedDraft?.lockedPremiereAbsoluteWeek ?? null);
    const [step, setStep] = useState(getReleaseWizardEntryStep(savedDraft, isPostTheatricalBidding ? 2 : 1));
    const contentScrollRef = React.useRef<HTMLDivElement>(null);
    const [releaseType, setReleaseType] = useState<'THEATRICAL' | 'STREAMING_ONLY' | null>(
        savedDraft?.releaseType ?? (isPostTheatricalBidding ? 'STREAMING_ONLY' : (project.projectDetails?.type === 'SERIES' ? 'STREAMING_ONLY' : null))
    );
    const [screeningStrategy, setScreeningStrategy] = useState<ScreeningStrategy | null>(savedDraft?.screeningStrategy ?? project.projectDetails?.screeningStrategy ?? null);
    const [selectedRegionIds, setSelectedRegionIds] = useState<BoxOfficeRegionId[]>(
        normalizeReleaseRegionIds(savedDraft?.selectedRegionIds || project.projectDetails?.releaseRegionIds || [])
    );
    const [distributionChainSelections, setDistributionChainSelections] = useState<Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>>(
        normalizeDistributionChainSelectionRecord(savedDraft?.distributionChainSelections || project.projectDetails?.releaseChainSelections)
    );
    const [campaignPositioning, setCampaignPositioning] = useState<CampaignPositioning>(savedDraft?.campaignPositioning || project.projectDetails?.campaignPositioning || 'MASS_EVENT');
    const [campaignTimeline, setCampaignTimeline] = useState<CampaignTimeline>(savedDraft?.campaignTimeline || project.projectDetails?.campaignTimeline || 'BALANCED_ROLLOUT');
    const [channelAllocations, setChannelAllocations] = useState<MarketingChannelAllocations>(savedDraft?.channelAllocations || project.projectDetails?.marketingChannelAllocations || {});
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(savedDraft?.selectedPlatform || null);
    const [selectedStreamingPlatformIds, setSelectedStreamingPlatformIds] = useState<string[]>(
        savedDraft?.selectedStreamingPlatformIds || (savedDraft?.selectedPlatform ? [savedDraft.selectedPlatform] : [])
    );
    const [selectedStreamingContractIds, setSelectedStreamingContractIds] = useState<string[]>(
        savedDraft?.selectedStreamingContractIds || []
    );
    const distributionLocked = commitmentState === 'SIGNED'
        && releaseType === 'STREAMING_ONLY'
        && selectedStreamingContractIds.length > 0;
    const [festivalPremiere, setFestivalPremiere] = useState<string | null>(savedDraft?.festivalPremiere || null);
    const [releaseWeek, setReleaseWeek] = useState<number>(savedDraft?.releaseWeek || player.currentWeek + 4);
    const releaseDraftClearedRef = React.useRef(false);
    const completionStartedRef = React.useRef(false);
    const lastPersistedDraftRef = React.useRef(savedDraft ? JSON.stringify({ ...savedDraft, updatedAt: 0 }) : '');
    const language = getPlayerLanguage(player);
    const tr = (key: string, vars?: Record<string, string | number>) => t(language, key, vars);
    const streamingDealEnergyCost = PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT;
    const releaseStrategyEnergyCost = PHASE_ONE_ENERGY_COSTS.RELEASE_STRATEGY_LOCK;
    const hasStreamingDealEnergy = player.energy.current >= streamingDealEnergyCost;
    const hasReleaseStrategyEnergy = player.energy.current >= releaseStrategyEnergyCost;
    const buildReleasePlanningDraft = (): ReleasePlanningDraft => ({
        step,
        releaseType,
        screeningStrategy,
        selectedRegionIds: normalizeReleaseRegionIds(selectedRegionIds),
        distributionChainSelections: normalizeDistributionChainSelectionRecord(distributionChainSelections),
        campaignPositioning,
        campaignTimeline,
        channelAllocations,
        selectedPlatform,
        selectedStreamingPlatformIds,
        selectedStreamingContractIds,
        festivalPremiere,
        releaseWeek,
        commitmentState,
        lockedPremiereAbsoluteWeek,
        updatedAt: Date.now(),
    });
    const writeReleasePlanningDraft = (sourcePlayer: Player, draft: ReleasePlanningDraft): Player => {
        const updateDetails = (details: any) => ({ ...details, releasePlanningDraft: draft });
        return {
            ...sourcePlayer,
            commitments: sourcePlayer.commitments.map(commitment => (
                commitment.id === project.id && commitment.projectDetails
                    ? { ...commitment, projectDetails: updateDetails(commitment.projectDetails) }
                    : commitment
            )),
            activeReleases: sourcePlayer.activeReleases.map(release => (
                release.id === project.id
                    ? { ...release, projectDetails: updateDetails(release.projectDetails) }
                    : release
            )),
        };
    };
    React.useEffect(() => {
        if (releaseDraftClearedRef.current) return;
        const draft = buildReleasePlanningDraft();
        const comparableDraft = JSON.stringify({ ...draft, updatedAt: 0 });
        if (comparableDraft === lastPersistedDraftRef.current) return;

        const timer = window.setTimeout(() => {
            const nextPlayer = writeReleasePlanningDraft(player, draft);
            lastPersistedDraftRef.current = comparableDraft;
            onUpdatePlayer(nextPlayer);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [
        campaignPositioning,
        campaignTimeline,
        channelAllocations,
        distributionChainSelections,
        festivalPremiere,
        onUpdatePlayer,
        player,
        project.id,
        releaseType,
        releaseWeek,
        screeningStrategy,
        selectedPlatform,
        selectedStreamingPlatformIds,
        selectedStreamingContractIds,
        selectedRegionIds,
        step,
        lockedPremiereAbsoluteWeek,
    ]);
    const trFallback = (key: string, fallback: string) => {
        const translated = tr(key);
        return translated === key ? fallback : translated;
    };
    const getCampaignPositionLabel = (option: typeof CAMPAIGN_POSITIONING_OPTIONS[number]) => trFallback(`release.campaign.position.${option.id}.label`, option.label);
    const getCampaignPositionShortLabel = (option: typeof CAMPAIGN_POSITIONING_OPTIONS[number]) => trFallback(`release.campaign.position.${option.id}.shortLabel`, option.shortLabel);
    const getCampaignPositionDescription = (option: typeof CAMPAIGN_POSITIONING_OPTIONS[number]) => trFallback(`release.campaign.position.${option.id}.description`, option.description);
    const getCampaignPositionPromise = (option: typeof CAMPAIGN_POSITIONING_OPTIONS[number]) => trFallback(`release.campaign.position.${option.id}.promise`, option.promise);
    const getCampaignTimelineShortLabel = (option: typeof CAMPAIGN_TIMELINE_OPTIONS[number]) => trFallback(`release.campaign.timeline.${option.id}.shortLabel`, option.shortLabel);
    const getCampaignTimelineDescription = (option: typeof CAMPAIGN_TIMELINE_OPTIONS[number]) => trFallback(`release.campaign.timeline.${option.id}.description`, option.description);
    const getCampaignTimelinePromise = (option: typeof CAMPAIGN_TIMELINE_OPTIONS[number]) => trFallback(`release.campaign.timeline.${option.id}.promise`, option.promise);
    const getMarketingChannelLabel = (channel: typeof MARKETING_CHANNEL_OPTIONS[number]) => trFallback(`release.campaign.channel.${channel.id}.label`, channel.label);
    const getMarketingChannelDescription = (channel: typeof MARKETING_CHANNEL_OPTIONS[number]) => trFallback(`release.campaign.channel.${channel.id}.description`, channel.description);
    const getFestivalName = (festival: typeof FESTIVALS[number]) => festival.nameKey ? tr(festival.nameKey) : festival.name;
    const getFestivalDescription = (festival: typeof FESTIVALS[number]) => festival.descriptionKey ? tr(festival.descriptionKey) : festival.description;
    const getCalendarEventName = (event: typeof CALENDAR_EVENTS[number]) => event.nameKey ? tr(event.nameKey) : event.name;
    const getSeasonLabel = (weekOfYear: number) => {
        const season = weekOfYear <= 13 ? 'spring' : weekOfYear <= 26 ? 'summer' : weekOfYear <= 39 ? 'fall' : 'winter';
        return tr(`services.worldLogic.season.${season}`);
    };
    const projectHiddenStats = project.projectDetails?.hiddenStats || {};
    const lockedPremiereEconomics = getProjectFundingEconomics(project);
    const hasUnconfirmedFundedPremiere = lockedPremiereEconomics.platformFunding > 0
        && projectHiddenStats.platformFundedPremiereConfirmed !== true;
    const lockedPremierePlatformId = hasUnconfirmedFundedPremiere
        ? (projectHiddenStats.nextSeasonFundingPlatformId || projectHiddenStats.platformId || null)
        : null;
    const lockedPremiereFundingTier = projectHiddenStats.nextSeasonFundingTier;
    const lockedPremiereFundingReason = projectHiddenStats.nextSeasonFundingReason;
    const lockedPremierePlatform = lockedPremierePlatformId
        ? PLATFORMS.find(platform => platform.id === lockedPremierePlatformId)
        : null;
    const lockedPremiereBid: Bid | null = lockedPremierePlatform
        ? {
            id: `locked_premiere_${project.id}_${lockedPremierePlatform.id}`,
            platformId: lockedPremierePlatform.id,
            amount: 0,
            type: 'UPFRONT_ONLY',
            fundingAmount: 0,
            backendPct: 0,
            fundingTier: lockedPremiereFundingTier,
            fundingReason: lockedPremiereFundingReason,
            bidValue: 0,
            timestamp: 0
        }
        : null;
    const lockedPremiereFundingApplied = lockedPremiereEconomics.platformFunding;
    const lockedPremiereStudioCashAtRisk = lockedPremiereEconomics.studioCashAtRisk;
    const normalizedSelectedRegionIds = useMemo(() => normalizeReleaseRegionIds(selectedRegionIds), [selectedRegionIds]);
    const regionMapSummary = useMemo(() => getRegionMapSummary(normalizedSelectedRegionIds), [normalizedSelectedRegionIds]);
    const inferredScreeningStrategy = useMemo(
        () => inferScreeningStrategyFromRegionCount(normalizedSelectedRegionIds.length),
        [normalizedSelectedRegionIds.length]
    );

    React.useEffect(() => {
        contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [step]);
    const effectiveScreeningStrategy = screeningStrategy || inferredScreeningStrategy;
    const boxOfficeRegionById = useMemo(() => (
        Object.fromEntries(BOX_OFFICE_REGIONS.map(region => [
            region.id,
            {
                ...region,
                label: getBoxOfficeRegionLabel(language, region.id),
                shortLabel: getBoxOfficeRegionShortLabel(language, region.id)
            }
        ])) as Record<BoxOfficeRegionId, typeof BOX_OFFICE_REGIONS[number]>
    ), [language]);
    
    const isSeries = project.projectDetails?.type === 'SERIES';
    const getProjectAuctionContext = () => {
        const hiddenStats = project.projectDetails?.hiddenStats || {};
        const estQuality = hiddenStats.qualityScore || 50;
        const scriptQuality = hiddenStats.scriptQuality || 50;
        const directorQuality = hiddenStats.directorQuality || 50;
        const castingStrength = hiddenStats.castingStrength || 50;
        const rawHype = hiddenStats.rawHype || 50;
        const packageScore = (estQuality * 0.4) + (scriptQuality * 0.2) + (directorQuality * 0.15) + (castingStrength * 0.15) + (rawHype * 0.1);
        const projectBudget = project.projectDetails?.estimatedBudget || 0;
        const theatricalGross = project.totalGross || project.gross || 0;
        const rating = Number(project.imdbRating || project.rating || project.projectDetails?.imdbRating || 0) || undefined;
        const seasonOneViews = Number(project.streaming?.totalViews || project.totalViews || 0) || undefined;
        const streamingRevenue = Number(project.streamingRevenue || project.projectDetails?.streamingRevenue || 0) || undefined;
        const hasProvenIp = Boolean(project.projectDetails?.franchiseId || project.projectDetails?.universeId || project.projectDetails?.subtype === 'SEQUEL' || project.projectDetails?.subtype === 'SPINOFF' || project.projectDetails?.subtype === 'UNIVERSE_EVENT');
        const fundingContext: FundingPerformanceContext = {
            genre: project.projectDetails?.genre,
            rating,
            seasonOneViews,
            streamingRevenue,
            rawHype
        };
        return { hiddenStats, packageScore, projectBudget, theatricalGross, hasProvenIp, fundingContext };
    };
    const biddingAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const biddingSellerStudioId = studio?.id || project.projectDetails?.studioId || 'player-rights-holder';
    const biddingRightsStartWeek = useMemo(() => {
        if (project.distributionPhase === 'THEATRICAL') {
            const completedTheatricalWeeks = Math.max(
                project.weeksInTheaters || 0,
                project.weeklyGross?.length || 0,
                Math.max(0, Number(project.weekNum || 1) - 1),
            );
            const weeksRemaining = Math.max(0, Number(project.maxTheatricalWeeks || 8) - completedTheatricalWeeks);
            return biddingAbsoluteWeek + Math.max(1, weeksRemaining + 1);
        }
        return player.commitments.some(commitment => commitment.id === project.id)
            ? biddingAbsoluteWeek + 1
            : biddingAbsoluteWeek;
    }, [biddingAbsoluteWeek, player.commitments, project]);
    const biddingLotBuild = useMemo(() => buildStreamingBiddingRightsLot({
        world: player.world,
        sourceProjectId: project.id,
        sellerPartyId: biddingSellerStudioId,
        startsAtAbsoluteWeek: biddingRightsStartWeek,
        maximumDurationWeeks: 156,
        windowType: 'FIRST_WINDOW',
    }), [biddingRightsStartWeek, biddingSellerStudioId, player.world.streamingRightsContracts, project.id]);
    const [biddingRightsMessage, setBiddingRightsMessage] = useState<string | null>(null);
    const [biddingSession, setBiddingSession] = useState<StreamingBiddingSession | null>(() => {
        const restoredSession = getRestorableStreamingBiddingSession(
            player.world.streamingBiddingSessions,
            project.id,
            biddingSellerStudioId,
            biddingAbsoluteWeek,
        );
        return restoredSession?.status === 'LIVE'
            || restoredSession?.status === 'CLOSING'
            || (restoredSession?.status === 'ACCEPTED' && restoredSession.offers.some(offer => offer.status === 'ACCEPTED'))
            ? restoredSession
            : null;
    });
    const streamingMarketPlatforms = useMemo(() => (
        getForbesStreamingCompanies(player).map(company => ({
            id: company.id,
            name: company.name,
            color: company.brand.primaryColor,
        }))
    ), [player.world.streamingPlatformEcosystem, player.world.platforms]);

    const persistBiddingSession = (session: StreamingBiddingSession) => {
        setBiddingSession(session);
        onUpdatePlayer({
            ...player,
            world: {
                ...player.world,
                streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, session),
            },
        });
    };

    const startAuction = () => {
        if (!biddingLotBuild.lot) {
            setBiddingRightsMessage(biddingLotBuild.compatibility.summary);
            return;
        }
        setBiddingRightsMessage(null);
        const { packageScore, projectBudget, theatricalGross } = getProjectAuctionContext();
        const bidderMarket = buildReleaseStreamingBidderMarket(player, {
            projectId: project.id,
            title: project.name || project.title || 'Untitled project',
            genre: project.projectDetails?.genre || project.genre || 'UNKNOWN',
            packageScore,
            absoluteWeek: biddingAbsoluteWeek,
            earliestPremiereAbsoluteWeek: biddingRightsStartWeek,
            studioPlatformRelations: studio?.studioState?.platformRelations || {},
        });
        const session = createStreamingBiddingSession({
            projectId: project.id,
            title: project.name || project.title || 'Untitled project',
            sellerStudioId: biddingSellerStudioId,
            sellerStudioName: studio?.name || project.projectDetails?.studioName || 'Player rights holder',
            absoluteWeek: biddingAbsoluteWeek,
            projectType: isSeries ? 'SERIES' : 'MOVIE',
            genre: project.projectDetails?.genre || project.genre,
            projectBudget,
            packageScore,
            theatricalGross,
            rightsLot: biddingLotBuild.lot,
            platforms: bidderMarket.map(platform => {
                const worldPlatform = player.world.platforms?.[platform.id as keyof typeof player.world.platforms];
                const localizationPromise = worldPlatform?.ai
                    ? resolveCapabilityBackedLocalizationPromise({
                        platform: worldPlatform,
                        countryIds: worldPlatform.ai.capabilities.activeCountryIds,
                        originalLanguageId: project.originalLanguageId || project.projectDetails?.originalLanguageId || 'english',
                        requestedLevel: 'DUBS_AND_SUBTITLES',
                    })
                    : { localizationLevel: 'NONE' as const, requirements: [] };
                return {
                    ...platform,
                    canStartNewBids: worldPlatform
                        ? !getPlatformAiSpendingRestrictions(worldPlatform, biddingAbsoluteWeek).blocksNewBids
                        : platform.canStartNewBids,
                    localizationLevelCap: worldPlatform ? localizationPromise.localizationLevel : platform.localizationLevelCap,
                    localizationRequirements: worldPlatform ? localizationPromise.requirements : platform.localizationRequirements,
                    strategicCountryIds: worldPlatform?.ai?.capabilities.activeCountryIds || platform.strategicCountryIds,
                };
            }),
        });
        persistBiddingSession(session);
    };

    const leaveAuction = () => {
        if (!biddingSession) return;
        const leftSession = leaveStreamingBiddingSession(biddingSession);
        const nextPlayer = {
            ...player,
            world: {
                ...player.world,
                streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, leftSession),
            },
        };
        setBiddingSession(null);
        if (isPostTheatricalBidding) {
            const draft = buildReleasePlanningDraft();
            lastPersistedDraftRef.current = JSON.stringify({ ...draft, updatedAt: 0 });
            onUpdatePlayer(writeReleasePlanningDraft(nextPlayer, draft));
            onBack();
            return;
        }
        onUpdatePlayer(nextPlayer);
        setStep(1);
    };

    const finishStreamingLicensing = () => {
        if (!biddingSession) return;
        const finishedSession = finishStreamingBiddingSession(biddingSession);
        if (finishedSession === biddingSession) return;
        persistBiddingSession(finishedSession);
        if (isPostTheatricalBidding) {
            releaseDraftClearedRef.current = true;
            onComplete();
            return;
        }
        setStep(3);
    };

    const handleAcceptBid = (
        bid: Bid | null,
        structuredAcceptance?: { session: StreamingBiddingSession; offer: StreamingOfferVersion },
    ) => {
        if (!bid) return;
        if (!hasStreamingDealEnergy) return;
        const signedAtAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
        const promisedPremiereAbsoluteWeek = structuredAcceptance?.session.lockedPremiereAbsoluteWeek
            ?? structuredAcceptance?.offer.proposedPremiereAbsoluteWeek
            ?? biddingRightsStartWeek;
        const preparedSigning = structuredAcceptance
            ? registerProductionStreamingRightsContractFromOffer(player, {
                session: structuredAcceptance.session,
                offer: structuredAcceptance.offer,
                signedAtAbsoluteWeek,
                startsAtAbsoluteWeek: promisedPremiereAbsoluteWeek,
            })
            : null;
        if (structuredAcceptance && !preparedSigning?.contract) {
            setBiddingRightsMessage('Rights availability changed before signature. Reopen the room for the current eligible markets.');
            return;
        }
        if (structuredAcceptance && !preparedSigning?.changed) {
            setBiddingSession(structuredAcceptance.session);
            return;
        }
        setBiddingRightsMessage(null);
        const nextSelectedPlatform = selectedPlatform || bid.platformId;
        const nextSelectedStreamingPlatformIds = structuredAcceptance
            ? Array.from(new Set([...selectedStreamingPlatformIds, bid.platformId]))
            : selectedStreamingPlatformIds;
        const nextSelectedStreamingContractIds = preparedSigning?.contract
            ? Array.from(new Set([...selectedStreamingContractIds, preparedSigning.contract.id]))
            : selectedStreamingContractIds;
        setSelectedPlatform(nextSelectedPlatform);
        if (structuredAcceptance) {
            setSelectedStreamingPlatformIds(nextSelectedStreamingPlatformIds);
            setSelectedStreamingContractIds(nextSelectedStreamingContractIds);
            setCommitmentState('SIGNED');
            setLockedPremiereAbsoluteWeek(promisedPremiereAbsoluteWeek);
            setReleaseWeek(((promisedPremiereAbsoluteWeek - 1) % 52) + 1);
        }

        const updatedPlayer = structuredAcceptance
            ? {
                ...preparedSigning!.player,
                world: {
                    ...preparedSigning!.player.world,
                    streamingBiddingSessions: upsertStreamingBiddingSession(
                        preparedSigning!.player.world.streamingBiddingSessions,
                        structuredAcceptance.session,
                    ),
                },
            }
            : { ...player };
        const platformName = structuredAcceptance?.offer.platformName
            || PLATFORMS.find(p => p.id === bid.platformId)?.name
            || bid.platformId;
        const isFundedPremiereConfirmation = bid.id.startsWith('locked_premiere_');
        const isSeriesDeal = (project.projectDetails?.type || project.type) === 'SERIES';
        const fundingAllocation = structuredAcceptance
            ? getStreamingOfferFundingAllocation(structuredAcceptance.offer)
            : {
                productionFund: isSeriesDeal ? 0 : Math.max(0, Number(bid.fundingAmount || 0)),
                lockedFutureSeasonFund: isSeriesDeal ? Math.max(0, Number(bid.fundingAmount || 0)) : 0,
                totalFunding: Math.max(0, Number(bid.fundingAmount || 0)),
            };
        const investorPlan = project.investorPlan || project.projectDetails?.investorPlan;
        const investorStreamingDealPayout = calculateInvestorPayout(investorPlan, bid.amount);
        const netStreamingDealAmount = Math.max(0, bid.amount - investorStreamingDealPayout);
        const nextInvestorPayouts = investorPlan
            ? appendInvestorPayoutSummary(project.investorPayouts || project.projectDetails?.investorPayouts, investorStreamingDealPayout)
            : project.investorPayouts || project.projectDetails?.investorPayouts;
        const lockedFunding = isSeriesDeal && fundingAllocation.lockedFutureSeasonFund > 0
            ? {
                id: structuredAcceptance
                    ? `stream_fund_${structuredAcceptance.offer.id}`
                    : `stream_fund_${project.id}_${bid.platformId}_${Date.now()}`,
                platformId: bid.platformId,
                platformName,
                amount: fundingAllocation.lockedFutureSeasonFund,
                sourceProjectId: project.id,
                sourceTitle: project.name || project.title || 'Series',
                franchiseId: project.projectDetails?.franchiseId || project.franchiseId || project.id,
                installmentNumber: project.projectDetails?.installmentNumber || project.installmentNumber || 1,
                projectType: 'SERIES' as const,
                createdWeek: player.currentWeek,
                createdYear: player.age,
                tier: bid.fundingTier,
                reason: bid.fundingReason
            }
            : null;
        
        if (studio) {
            const b = updatedPlayer.businesses.find(b => b.id === studio.id);
            if (b) {
                b.balance += netStreamingDealAmount;
                b.stats.weeklyRevenue += netStreamingDealAmount;
                b.stats.weeklyProfit += netStreamingDealAmount;
                b.stats.lifetimeRevenue += netStreamingDealAmount;
                if (!b.studioState) b.studioState = {} as any;
                if (structuredAcceptance) {
                    const relations = b.studioState.platformRelations || {};
                    const currentRelation = relations[bid.platformId];
                    b.studioState.platformRelations = {
                        ...relations,
                        [bid.platformId]: {
                            trustModifier: Math.max(-8, Math.min(8, Number(currentRelation?.trustModifier || 0) + 1)),
                            recoveryWeeksRemaining: Math.max(0, Number(currentRelation?.recoveryWeeksRemaining || 0)),
                            completedDeals: Math.max(0, Number(currentRelation?.completedDeals || 0)) + 1,
                            profitableDeals: Math.max(0, Number(currentRelation?.profitableDeals || 0)),
                            loyaltyScore: Math.min(100, Math.max(0, Number(currentRelation?.loyaltyScore || 0)) + 8),
                            realizedPartnerValue: Math.max(0, Number(currentRelation?.realizedPartnerValue || 0)),
                            lastBreachWeek: currentRelation?.lastBreachWeek,
                            lastBreachYear: currentRelation?.lastBreachYear,
                        },
                    };
                }
                const ledger = Array.isArray(b.studioState.financeLedger) ? b.studioState.financeLedger : [];
	                b.studioState.financeLedger = [
                    ...(!isFundedPremiereConfirmation ? [{
                        id: `studio_ledger_bid_${structuredAcceptance?.offer.id || `${project.id}_${bid.platformId}_${player.age}_${player.currentWeek}`}`,
                        week: player.currentWeek,
                        year: player.age,
                        amount: netStreamingDealAmount,
                        type: 'STREAMING_DEAL',
                        label: investorStreamingDealPayout > 0
                            ? `${project.name} ${platformName} deal after investor split`
                            : `${project.name} ${platformName} deal`,
                        projectId: project.id
                    }] : []),
                    ...(investorStreamingDealPayout > 0 ? [{
                        id: `studio_ledger_investor_payout_deal_${project.id}_${player.age}_${player.currentWeek}`,
                        week: player.currentWeek,
                        year: player.age,
                        amount: -investorStreamingDealPayout,
                        type: 'INVESTOR_PAYOUT' as const,
                        label: `${project.name} investor streaming deal payout`,
                        projectId: project.id
                    }] : []),
	                    ...ledger
	                ].slice(0, 40);
	                if (investorStreamingDealPayout > 0 && investorPlan) {
	                    const rememberedStudio = applyInvestorPayoutMemory({
	                        studio: b,
	                        plan: investorPlan,
	                        payout: investorStreamingDealPayout,
	                        projectId: project.id,
	                        projectTitle: project.name,
	                        week: player.currentWeek,
	                        year: player.age
	                    });
	                    if (rememberedStudio?.studioState) {
	                        b.studioState = rememberedStudio.studioState;
	                    }
	                }
	                
	                // Series renewal funding is locked to the next season. Other greenlight money remains a generic production fund.
                if (lockedFunding) {
                    b.studioState.lockedStreamingFunds = [lockedFunding, ...(b.studioState.lockedStreamingFunds || [])].slice(0, 20);
                }
                if (fundingAllocation.productionFund > 0) {
                    b.studioState.productionFund = (b.studioState.productionFund || 0) + fundingAllocation.productionFund;
                }
            }
        } else {
            // Add upfront cash to player's money if no studio
            updatedPlayer.money += netStreamingDealAmount;
            if (!isFundedPremiereConfirmation) updatedPlayer.finance.history.unshift({
                id: structuredAcceptance ? `finance_streaming_${structuredAcceptance.offer.id}` : Math.random().toString(),
                week: updatedPlayer.currentWeek,
                year: updatedPlayer.age,
                amount: netStreamingDealAmount,
                category: 'BUSINESS',
                description: investorStreamingDealPayout > 0
                    ? tr('release.generated.streamingRightsInvestorSplit', { project: project.name, platform: platformName })
                    : tr('release.generated.streamingRights', { project: project.name, platform: platformName })
            });
        }

        // Update platform cash reserve
        if (updatedPlayer.world.platforms && updatedPlayer.world.platforms[bid.platformId as any]) {
            const totalCost = structuredAcceptance?.offer.fixedExposure ?? (bid.amount + (bid.fundingAmount || 0));
            const platformState = updatedPlayer.world.platforms[bid.platformId as any];
            platformState.cashReserve = Math.max(0, platformState.cashReserve - (totalCost / 1_000_000));
            platformState.recentHits += 1;
        } else if (updatedPlayer.world.streamingPlatformEcosystem?.operators?.[bid.platformId]) {
            const ecosystem = updatedPlayer.world.streamingPlatformEcosystem;
            const operator = ecosystem.operators[bid.platformId];
            const totalCost = structuredAcceptance?.offer.fixedExposure ?? (bid.amount + (bid.fundingAmount || 0));
            updatedPlayer.world.streamingPlatformEcosystem = {
                ...ecosystem,
                operators: {
                    ...ecosystem.operators,
                    [bid.platformId]: {
                        ...operator,
                        cashMillions: Math.max(0, operator.cashMillions - totalCost / 1_000_000),
                    },
                },
            };
        }

        const commitmentIndex = updatedPlayer.commitments.findIndex(c => c.id === project.id);
        if (commitmentIndex !== -1) {
            const commitment = updatedPlayer.commitments[commitmentIndex];
            updatedPlayer.commitments[commitmentIndex] = {
                ...commitment,
                projectPhase: 'AWAITING_RELEASE',
                phaseWeeksLeft: 1, // Streaming releases happen quickly
                totalPhaseDuration: 1,
                projectDetails: commitment.projectDetails ? {
                    ...commitment.projectDetails,
                    releaseStrategy: 'STREAMING_ONLY',
                    releaseDate: ((promisedPremiereAbsoluteWeek - 1) % 52) + 1,
                    streamingRevenue: Math.max(0, Number(commitment.projectDetails.streamingRevenue || 0)) + bid.amount,
                    investorPayouts: nextInvestorPayouts,
                    hiddenStats: {
                        ...commitment.projectDetails.hiddenStats,
                        platformId: commitment.projectDetails.hiddenStats.platformId || bid.platformId,
                        streamingPlatformIds: Array.from(new Set([
                            ...(commitment.projectDetails.hiddenStats.streamingPlatformIds || []),
                            bid.platformId,
                        ])),
                        streamingContractIds: preparedSigning?.contract ? Array.from(new Set([
                            ...(commitment.projectDetails.hiddenStats.streamingContractIds || []),
                            preparedSigning.contract.id,
                        ])) : commitment.projectDetails.hiddenStats.streamingContractIds,
                        backendPct: Math.max(commitment.projectDetails.hiddenStats.backendPct || 0, bid.backendPct || 0),
                        ...(isFundedPremiereConfirmation ? { platformFundedPremiereConfirmed: true } : {}),
                        ...(lockedFunding ? {
                            nextSeasonFundingAmount: lockedFunding.amount,
                            nextSeasonFundingPlatformId: lockedFunding.platformId,
                            nextSeasonFundingSourceProjectId: lockedFunding.sourceProjectId,
                            nextSeasonFundingTier: lockedFunding.tier,
                            nextSeasonFundingReason: lockedFunding.reason
                        } : {})
                    }
                } : undefined
            };
        } else {
            // It might be an ActiveRelease in STREAMING_BIDDING or THEATRICAL
            const releaseIndex = updatedPlayer.activeReleases?.findIndex(r => r.id === project.id);
            if (releaseIndex !== undefined && releaseIndex !== -1 && updatedPlayer.activeReleases) {
                const release = updatedPlayer.activeReleases[releaseIndex];
                const isStillTheatrical = release.distributionPhase === 'THEATRICAL';
                
                // If still in theaters, calculate when it should start streaming (week after theatrical ends)
                let startWeek = ((promisedPremiereAbsoluteWeek - 1) % 52) + 1;
                let startWeekAbsolute = promisedPremiereAbsoluteWeek;
                if (isStillTheatrical) {
                    const completedTheatricalWeeks = Math.max(
                        release.weeksInTheaters || 0,
                        release.weeklyGross?.length || 0,
                        Math.max(0, release.weekNum - 1)
                    );
                    const weeksRemaining = (release.maxTheatricalWeeks || 8) - completedTheatricalWeeks;
                    const waitWeeks = Math.max(1, weeksRemaining + 1);
                    startWeekAbsolute = Math.max(promisedPremiereAbsoluteWeek, getAbsoluteWeek(player.age, player.currentWeek) + waitWeeks);
                    startWeek = ((startWeekAbsolute - 1) % 52) + 1;
                }

                updatedPlayer.activeReleases[releaseIndex] = {
                    ...release,
                    // Only switch phase if not theatrical, otherwise gameLoop will handle the transition
                    distributionPhase: isStillTheatrical ? 'THEATRICAL' : 'STREAMING',
                    streamingRevenue: (release.streamingRevenue || 0) + bid.amount,
                    streamingUpfrontFee: Math.max(0, Number(release.streamingUpfrontFee ?? release.projectDetails?.streamingRevenue ?? 0)) + bid.amount,
                    streamingRoyaltyRevenue: Math.max(0, Number(
                        release.streamingRoyaltyRevenue
                        ?? Math.max(0, Number(release.streamingRevenue || 0) - Number(release.streamingUpfrontFee ?? release.projectDetails?.streamingRevenue ?? 0))
                    )),
                    streamingFundingAmount: Math.max(0, Number(release.streamingFundingAmount || 0)) + fundingAllocation.totalFunding,
                    investorPayouts: nextInvestorPayouts,
                    streaming: {
                        platformId: release.streaming?.platformId || bid.platformId as any,
                        weekOnPlatform: 1,
                        totalViews: 0,
                        weeklyViews: [],
                        isLeaving: false,
                        startWeek: startWeek,
                        startWeekAbsolute: startWeekAbsolute
                    },
                    streamingRuns: preparedSigning?.contract ? [
                        ...(release.streamingRuns || []).filter(run => run.contractId !== preparedSigning.contract!.id),
                        {
                            platformId: bid.platformId,
                            contractId: preparedSigning.contract.id,
                            startWeekAbsolute: promisedPremiereAbsoluteWeek,
                            weekOnPlatform: 1,
                            totalViews: 0,
                            weeklyViews: [],
                            isLeaving: false,
                        },
                    ] : release.streamingRuns,
                    studioRoyaltyPercentage: bid.backendPct || 0,
                    projectDetails: {
                        ...release.projectDetails,
                        releasePlanningDraft: isPostTheatricalBidding
                            ? undefined
                            : release.projectDetails.releasePlanningDraft,
                        investorPayouts: nextInvestorPayouts,
                        hiddenStats: {
                            ...release.projectDetails.hiddenStats,
                            platformId: release.projectDetails.hiddenStats.platformId || bid.platformId,
                            streamingPlatformIds: Array.from(new Set([
                                ...(release.projectDetails.hiddenStats.streamingPlatformIds || []),
                                bid.platformId,
                            ])),
                            streamingContractIds: preparedSigning?.contract ? Array.from(new Set([
                                ...(release.projectDetails.hiddenStats.streamingContractIds || []),
                                preparedSigning.contract.id,
                            ])) : release.projectDetails.hiddenStats.streamingContractIds,
                            backendPct: bid.backendPct || release.projectDetails.hiddenStats.backendPct || 0,
                            ...(isFundedPremiereConfirmation ? { platformFundedPremiereConfirmed: true } : {}),
                            ...(lockedFunding ? {
                                nextSeasonFundingAmount: lockedFunding.amount,
                                nextSeasonFundingPlatformId: lockedFunding.platformId,
                                nextSeasonFundingSourceProjectId: lockedFunding.sourceProjectId,
                                nextSeasonFundingTier: lockedFunding.tier,
                                nextSeasonFundingReason: lockedFunding.reason
                            } : {})
                        }
                    }
                };
            }
        }

        const signedRelease = updatedPlayer.activeReleases?.find(release => release.id === project.id);
        const startsAtAbsoluteWeek = structuredAcceptance
            ? promisedPremiereAbsoluteWeek
            : signedRelease?.streaming?.startWeekAbsolute
            ?? (commitmentIndex !== -1 ? signedAtAbsoluteWeek + 1 : signedAtAbsoluteWeek);
        const registeredSigning = structuredAcceptance
            ? { player: updatedPlayer, contract: preparedSigning!.contract, changed: preparedSigning!.changed }
            : registerProductionStreamingRightsContract(updatedPlayer, {
            sourceProjectId: project.id,
            title: project.name || project.title || 'Untitled project',
            projectType: isSeriesDeal ? 'SERIES' : 'MOVIE',
            genre: project.projectDetails?.genre || project.genre,
            sellerStudioId: studio?.id || project.projectDetails?.studioId || 'player-rights-holder',
            sellerStudioName: studio?.name || project.projectDetails?.studioName || 'Player rights holder',
            sellerPartyType: 'PLAYER_STUDIO',
            buyerPlatformId: bid.platformId as any,
            minimumGuarantee: bid.amount,
            platformRevenueShare: 100 - Math.max(0, Math.min(100, bid.backendPct || 0)),
            productionFunding: fundingAllocation.productionFund,
            futureSeasonFunding: fundingAllocation.lockedFutureSeasonFund,
            signedAtAbsoluteWeek,
            startsAtAbsoluteWeek,
            durationWeeks: 52,
            });
        spendPlayerEnergy(registeredSigning.player, streamingDealEnergyCost, `Streaming deal: ${project.name}`);
        if (structuredAcceptance) setBiddingSession(structuredAcceptance.session);
        const playerWithSynchronousDraft = structuredAcceptance && !isPostTheatricalBidding
            ? writeReleasePlanningDraft(registeredSigning.player, {
                ...buildReleasePlanningDraft(),
                selectedPlatform: nextSelectedPlatform,
                selectedStreamingPlatformIds: nextSelectedStreamingPlatformIds,
                selectedStreamingContractIds: nextSelectedStreamingContractIds,
                commitmentState: 'SIGNED',
                lockedPremiereAbsoluteWeek: promisedPremiereAbsoluteWeek,
                releaseWeek: ((promisedPremiereAbsoluteWeek - 1) % 52) + 1,
                updatedAt: Date.now(),
            })
            : registeredSigning.player;
        if (structuredAcceptance && !isPostTheatricalBidding) {
            const storedDraft = playerWithSynchronousDraft.commitments.find(commitment => commitment.id === project.id)?.projectDetails?.releasePlanningDraft
                || playerWithSynchronousDraft.activeReleases.find(release => release.id === project.id)?.projectDetails?.releasePlanningDraft;
            if (storedDraft) lastPersistedDraftRef.current = JSON.stringify({ ...storedDraft, updatedAt: 0 });
        }
        onUpdatePlayer(playerWithSynchronousDraft);
        
        const licensingComplete = !structuredAcceptance || structuredAcceptance.session.status === 'ACCEPTED';
        if (isPostTheatricalBidding && licensingComplete) {
            releaseDraftClearedRef.current = true;
            onComplete();
        } else if (!isPostTheatricalBidding && licensingComplete) {
            setStep(3); // Move to Campaign step
        }
    };

    const handleAcceptStreamingOffer = (offer: StreamingOfferVersion, renderedSession: StreamingBiddingSession = biddingSession!) => {
        const sourceSession = renderedSession || biddingSession;
        if (!sourceSession) return;
        const currentOffer = getStreamingBiddingClosingOffers(sourceSession).find(candidate => candidate.id === offer.id)
            || getStreamingBiddingClosingOffers(sourceSession).find(candidate => candidate.platformId === offer.platformId);
        if (!currentOffer) return;
        const acceptedSession = acceptStreamingBiddingOffer(sourceSession, currentOffer.id);
        if (acceptedSession === sourceSession || acceptedSession.acceptedOfferId !== currentOffer.id) return;
        const acceptedOffer = acceptedSession.offers.find(candidate => candidate.id === currentOffer.id && candidate.status === 'ACCEPTED');
        if (!acceptedOffer) return;
        const fundingAmount = acceptedOffer.productionFunding + acceptedOffer.futureSeasonFunding;
        handleAcceptBid({
            id: acceptedOffer.id,
            platformId: acceptedOffer.platformId,
            amount: acceptedOffer.minimumGuarantee,
            type: fundingAmount > 0 ? 'GREENLIGHT_DEAL' : acceptedOffer.licensorRevenueShare > 0 ? 'BACKEND_POINTS' : 'UPFRONT_ONLY',
            fundingAmount,
            backendPct: acceptedOffer.licensorRevenueShare,
            bidValue: acceptedOffer.expectedTotalCost,
            timestamp: acceptedOffer.createdAtActiveSecond,
        }, { session: acceptedSession, offer: acceptedOffer });
    };

    const reservedMarketingBudget = Math.max(0, Number(project.projectDetails?.reservedMarketingBudget || 0));
    const hasReservedMarketingPool = reservedMarketingBudget > 0;
    const projectBudgetForCampaignCap = Math.max(1_000_000, Number(project.projectDetails?.estimatedBudget || project.budget || 0) || 5_000_000);
    const legacyCampaignBudgetCeiling = Math.max(500_000, Math.round(projectBudgetForCampaignCap * 0.65));
    const legacyCampaignBudgetCap = hasReservedMarketingPool ? reservedMarketingBudget : Math.min(Math.max(0, player.money), legacyCampaignBudgetCeiling);
    const normalizedChannelMix = useMemo(() => {
        return normalizeMarketingChannelAllocations(channelAllocations, legacyCampaignBudgetCap);
    }, [channelAllocations, legacyCampaignBudgetCap]);
    const totalCampaignCost = normalizedChannelMix.totalSpent;
    const campaignBudgetRemaining = normalizedChannelMix.remaining;
    const activeCampaignChannels = MARKETING_CHANNEL_OPTIONS.filter(channel => (normalizedChannelMix.allocations[channel.id] || 0) > 0);
    const campaignFitSpend = Math.max(totalCampaignCost, reservedMarketingBudget);
    const campaignFit = useMemo(() => {
        return calculateCampaignFit(project.projectDetails || project, campaignPositioning, campaignFitSpend);
    }, [project, campaignPositioning, campaignFitSpend]);
    const campaignForecast = useMemo(() => {
        return calculateCampaignForecast(project.projectDetails || project, campaignPositioning, normalizedChannelMix.allocations, campaignFit, campaignTimeline);
    }, [project, campaignPositioning, normalizedChannelMix.allocations, campaignFit, campaignTimeline]);
    const campaignReachPreview = useMemo(() => calculateCampaignReachProfile({
        productionBudget: project.projectDetails?.estimatedBudget || project.budget || 0,
        marketingSpend: totalCampaignCost,
        rawHype: project.projectDetails?.hiddenStats?.rawHype,
        fameMultiplier: project.projectDetails?.hiddenStats?.fameMultiplier,
        distributionPower: project.projectDetails?.hiddenStats?.distributionPower,
    }), [project, totalCampaignCost]);
    const musicImpact = useMemo(() => {
        const details = project.projectDetails || project;
        return calculateProjectMusicImpact(details, details?.musicPlan);
    }, [project]);
    const forecastGaugeScore = useMemo(() => {
        const confidenceWeight = campaignForecast.confidenceLabel === 'Market Read'
            ? 14
            : campaignForecast.confidenceLabel === 'Early Estimate'
                ? 8
                : 2;
        const score = (campaignForecast.breakEvenChance * 0.48)
            + ((100 - campaignForecast.weekTwoDropRisk) * 0.26)
            + (campaignForecast.streamingBidBoost * 0.12)
            + (campaignForecast.awardsVisibility * 0.08)
            + (Math.max(-15, Math.min(25, campaignForecast.franchiseValueImpact)) * 0.22)
            + confidenceWeight;

        return Math.round(Math.max(0, Math.min(100, score)));
    }, [campaignForecast]);
    const forecastGaugeLabel = forecastGaugeScore >= 72 ? 'Strong Read' : forecastGaugeScore >= 42 ? 'Early Read' : 'Volatile';
    const forecastGaugeWord = forecastGaugeScore >= 72 ? 'STRONG' : forecastGaugeScore >= 42 ? 'EARLY' : 'VOLATILE';
    const forecastGaugeTone = forecastGaugeScore >= 72
        ? 'text-emerald-300 border-emerald-300/30 bg-emerald-400/10'
        : forecastGaugeScore >= 42
            ? 'text-amber-300 border-amber-300/30 bg-amber-400/10'
            : 'text-rose-300 border-rose-300/30 bg-rose-400/10';
    const forecastGaugeAccent = forecastGaugeScore >= 72
            ? '#34d399'
            : forecastGaugeScore >= 42
                ? '#facc15'
                : '#fb7185';
    const forecastGaugeRingOffset = 100 - forecastGaugeScore;
    const allocationStep = Math.max(50_000, Math.round(Math.max(legacyCampaignBudgetCap * 0.1, 250_000) / 50_000) * 50_000);
    const formatCampaignMillions = (value: number) => {
        const millions = Math.max(0, value) / 1000000;
        if (millions >= 100) return millions.toFixed(0);
        if (millions >= 10) return millions.toFixed(1);
        return millions.toFixed(2);
    };
    const getAllocationTotal = (allocations: MarketingChannelAllocations, excludeChannelId?: MarketingChannelId) => {
        return MARKETING_CHANNEL_OPTIONS.reduce((sum, channel) => {
            if (channel.id === excludeChannelId) return sum;
            return sum + Math.max(0, Number(allocations[channel.id] || 0));
        }, 0);
    };
    const setChannelAllocationAmount = (channelId: MarketingChannelId, amount: number) => {
        setChannelAllocations(prev => {
            const otherSpend = getAllocationTotal(prev, channelId);
            const maxForChannel = Math.max(0, legacyCampaignBudgetCap - otherSpend);
            const nextValue = Math.min(maxForChannel, Math.max(0, Math.floor(Number(amount) || 0)));
            return normalizeMarketingChannelAllocations({ ...prev, [channelId]: nextValue }, legacyCampaignBudgetCap).allocations;
        });
    };
    const updateChannelAllocation = (channelId: MarketingChannelId, delta: number) => {
        setChannelAllocations(prev => {
            const current = Math.max(0, Number(prev[channelId] || 0));
            const otherSpend = getAllocationTotal(prev, channelId);
            const maxForChannel = Math.max(0, legacyCampaignBudgetCap - otherSpend);
            const nextValue = Math.min(maxForChannel, Math.max(0, current + delta));
            return normalizeMarketingChannelAllocations({ ...prev, [channelId]: nextValue }, legacyCampaignBudgetCap).allocations;
        });
    };
    const selectedCampaignPosition = CAMPAIGN_POSITIONING_OPTIONS.find(option => option.id === campaignPositioning) || CAMPAIGN_POSITIONING_OPTIONS[0];
    const selectedCampaignTimeline = CAMPAIGN_TIMELINE_OPTIONS.find(option => option.id === campaignTimeline) || CAMPAIGN_TIMELINE_OPTIONS[1];
    const getWeekOfYear = (week: number) => ((week - 1) % 52) + 1;
    const formatDealMoney = (value: number) => {
        const absValue = Math.max(0, Number(value) || 0);
        if (absValue >= 1_000_000_000) return `$${(absValue / 1_000_000_000).toFixed(1)}B`;
        if (absValue >= 1_000_000) return `$${(absValue / 1_000_000).toFixed(1)}M`;
        if (absValue >= 1_000) return `$${Math.round(absValue / 1_000)}k`;
        return `$${Math.round(absValue)}`;
    };
    const formatFootfall = (value: number) => {
        const safeValue = Math.max(0, Number(value) || 0);
        if (safeValue >= 1_000_000) return `${(safeValue / 1_000_000).toFixed(1)}M`;
        if (safeValue >= 1_000) return `${Math.round(safeValue / 1_000)}k`;
        return `${Math.round(safeValue)}`;
    };
    const getRecommendedDistributionChainIds = (regionId: BoxOfficeRegionId, strategyId: ScreeningStrategy | null = effectiveScreeningStrategy): CinemaChainId[] => {
        const hiddenStats = project.projectDetails?.hiddenStats || {};
        const qualityScore = Number(hiddenStats.qualityScore || 50);
        const rawHype = Number(hiddenStats.rawHype || 50);
        const hasFranchiseSignal = Boolean(project.projectDetails?.franchiseId || project.projectDetails?.universeId || project.projectDetails?.subtype === 'SEQUEL' || project.projectDetails?.subtype === 'SPINOFF' || project.projectDetails?.subtype === 'UNIVERSE_EVENT');

        if (strategyId === 'REGIONAL') {
            if (qualityScore >= 74 && ['NORTH_AMERICA', 'EUROPE'].includes(regionId)) return ['ARCLIGHT_GRID'];
            if (regionId === 'ASIA' || regionId === 'SOUTH_AMERICA') return ['PRISM_HALLS'];
            return ['NOVA_CIRCUIT'];
        }

        if (strategyId === 'NATIONAL') {
            if (hasFranchiseSignal || rawHype >= 78) return regionId === 'ASIA' ? ['Z_CINEMAS', 'CROWNSCREEN'] : ['CROWNSCREEN', 'NOVA_CIRCUIT'];
            if (qualityScore >= 76 && ['EUROPE', 'NORTH_AMERICA'].includes(regionId)) return ['EMPIRE_CINEMAS'];
            return ['NOVA_CIRCUIT'];
        }

        if (regionId === 'ASIA' || regionId === 'SOUTH_AMERICA') return rawHype >= 70 ? ['Z_CINEMAS', 'PRISM_HALLS'] : ['PRISM_HALLS', 'NOVA_CIRCUIT'];
        if (regionId === 'NORTH_AMERICA' || regionId === 'EUROPE') return hasFranchiseSignal ? ['CROWNSCREEN', 'EMPIRE_CINEMAS'] : ['EMPIRE_CINEMAS', 'NOVA_CIRCUIT'];
        if (regionId === 'OCEANIA') return ['NOVA_CIRCUIT'];
        return qualityScore >= 70 ? ['EMPIRE_CINEMAS'] : ['NOVA_CIRCUIT'];
    };
    const normalizedDistributionChainSelections = useMemo(() => {
        return normalizedSelectedRegionIds.reduce((selections, regionId) => {
            const selectedChainIds = distributionChainSelections[regionId] || [];
            selections[regionId] = selectedChainIds.length > 0
                ? selectedChainIds
                : getRecommendedDistributionChainIds(regionId);
            return selections;
        }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>);
    }, [distributionChainSelections, effectiveScreeningStrategy, normalizedSelectedRegionIds, project.projectDetails]);
    const selectedDistributionRows = useMemo(() => (
        normalizedSelectedRegionIds.map(regionId => {
            const chainIds = normalizedDistributionChainSelections[regionId] || getRecommendedDistributionChainIds(regionId);
            const chains = chainIds
                .map(chainId => getCinemaChainById(chainId, language))
                .filter((chain): chain is CinemaChain => Boolean(chain));
            const termsList = chainIds
                .map(chainId => getCinemaChainTerms(chainId, regionId, language))
                .filter((terms): terms is CinemaChainRegionalTerms => Boolean(terms));
            const region = boxOfficeRegionById[regionId];
            if (chains.length === 0 || termsList.length === 0 || !region) return null;

            const totalScreens = termsList.reduce((sum, terms) => sum + terms.screens, 0);
            const bookingCost = termsList.reduce((sum, terms) => sum + terms.bookingCost, 0);
            const exhibitorCut = totalScreens > 0
                ? termsList.reduce((sum, terms) => sum + (terms.exhibitorCut * terms.screens), 0) / totalScreens
                : 0;
            const footfallPower = totalScreens > 0
                ? termsList.reduce((sum, terms) => sum + (terms.footfallPower * terms.screens), 0) / totalScreens
                : 0;
            const expectedFootfall = Math.round(totalScreens * footfallPower * region.marketWeight * 680);
            return {
                regionId,
                region,
                chainIds,
                chains,
                terms: {
                    screens: totalScreens,
                    bookingCost,
                    exhibitorCut,
                    footfallPower
                },
                expectedFootfall
            };
        }).filter(Boolean)
    ), [boxOfficeRegionById, language, normalizedDistributionChainSelections, normalizedSelectedRegionIds, project.projectDetails, effectiveScreeningStrategy]);
    const distributionDealSummary = useMemo(() => {
        const rows = selectedDistributionRows as Array<NonNullable<typeof selectedDistributionRows[number]>>;
        const releaseReach = rows.reduce((sum, row) => sum + row.region.marketWeight, 0);
        const totalScreens = rows.reduce((sum, row) => sum + row.terms.screens, 0);
        const bookingCost = rows.reduce((sum, row) => sum + row.terms.bookingCost, 0);
        const expectedFootfall = rows.reduce((sum, row) => sum + row.expectedFootfall, 0);
        const weightedCut = releaseReach > 0
            ? rows.reduce((sum, row) => sum + (row.terms.exhibitorCut * row.region.marketWeight), 0) / releaseReach
            : 0;
        const studioShare = Math.max(0, 1 - weightedCut);
        const budget = Math.max(1_000_000, Number(project.projectDetails?.estimatedBudget || project.budget || 0) || 1_000_000);
        const hiddenStats = project.projectDetails?.hiddenStats || {};
        const quality = Number(hiddenStats.qualityScore || 50);
        const scriptQuality = Number(hiddenStats.scriptQuality || quality);
        const directorQuality = Number(hiddenStats.directorQuality || quality);
        const castingStrength = Number(hiddenStats.castingStrength || 50);
        const rawHype = Number(hiddenStats.rawHype || 50);
        const fameMultiplier = Number(hiddenStats.fameMultiplier || 1);
        const packageScore = (scriptQuality * 0.32) + (directorQuality * 0.24) + (castingStrength * 0.26) + (quality * 0.18);
        const genreEventMultiplier = ['SUPERHERO', 'SCI_FI', 'ADVENTURE', 'ACTION', 'FANTASY', 'ANIMATION'].includes(project.projectDetails?.genre)
            ? 1.12
            : ['DRAMA', 'BIOPIC', 'DOCUMENTARY', 'ROMANCE'].includes(project.projectDetails?.genre)
                ? 0.72
                : 0.92;
        const screenReach = 1 - Math.exp(-totalScreens / 14500);
        const regionReach = 1 - Math.exp(-releaseReach / 2.75);
        const footfallSignal = Math.min(1.28, expectedFootfall / 18_000_000);
        const distributionPower = Math.max(35, Math.min(98, 42 + (screenReach * 34) + (releaseReach * 4) + (footfallSignal * 7)));
        const campaignLift = Math.min(0.38, totalCampaignCost / Math.max(1, budget * 2.4));
        const qualityLift = 0.72 + (packageScore / 100) * 0.64;
        const hypeLift = 0.78 + (rawHype / 100) * 0.55;
        const fameLift = 0.92 + Math.min(0.32, Math.max(0, fameMultiplier - 1) * 0.28);
        const distributionLift = Math.pow(distributionPower / 50, 0.72);
        const musicOpeningMod = Math.max(0.9, Math.min(1.32, 1 + (musicImpact.openingWeekendLiftPct / 100) + (musicImpact.trailerStrengthLift / 260) - (musicImpact.mismatchBacklashRisk / 1000)));
        const grossDemand = budget * (0.28 + screenReach * 0.34 + regionReach * 0.26 + footfallSignal * 0.14 + campaignLift) * qualityLift * hypeLift * fameLift * genreEventMultiplier * distributionLift * musicOpeningMod;
        const caps = getBoxOfficeCaps(project.projectDetails?.budgetTier || 'MID');
        const openingCap = caps.opening * (quality >= 88 && rawHype >= 82 ? 1.08 : 0.92);
        const midpoint = Math.min(openingCap, grossDemand);
        const uncertainty = quality < 55
            ? 0.34
            : quality >= 82
                ? 0.18
                : 0.25;
        const openingLow = Math.round(midpoint * (1 - uncertainty));
        const openingHigh = Math.round(Math.max(openingLow + 1, midpoint * (1 + uncertainty)));
        const studioOpeningLow = Math.round(openingLow * studioShare);
        const studioOpeningHigh = Math.round(openingHigh * studioShare);
        const partnerExampleShare = Math.round(100 * weightedCut);
        const studioExampleShare = Math.round(100 * studioShare);

        return {
            regionCount: rows.length,
            releaseReach,
            totalScreens,
            bookingCost,
            expectedFootfall,
            weightedCut,
            studioShare,
            openingLow,
            openingHigh,
            studioOpeningLow,
            studioOpeningHigh,
            partnerExampleShare,
            studioExampleShare,
            distributionPower
        };
    }, [project.budget, project.projectDetails, selectedDistributionRows, totalCampaignCost, musicImpact]);
    const toggleDistributionChain = (regionId: BoxOfficeRegionId, chainId: CinemaChainId) => {
        setDistributionChainSelections(currentSelections => {
            const currentChainIds = currentSelections[regionId] || [];
            const nextChainIds = currentChainIds.includes(chainId)
                ? currentChainIds.filter(currentChainId => currentChainId !== chainId)
                : [...currentChainIds, chainId];

            return {
                ...currentSelections,
                [regionId]: nextChainIds.length > 0 ? nextChainIds : [chainId]
            };
        });
    };
    const selectAllDistributionChainsForRegion = (regionId: BoxOfficeRegionId) => {
        setDistributionChainSelections(currentSelections => ({
            ...currentSelections,
            [regionId]: getCinemaChainsForRegion(regionId, language).map(chain => chain.id)
        }));
    };
    const applyRecommendedDistributionDesk = (strategyId: ScreeningStrategy | null = effectiveScreeningStrategy) => {
        const resolvedStrategy = strategyId || effectiveScreeningStrategy;
        const defaultRegions = getDefaultReleaseRegionIds(resolvedStrategy);
        setSelectedRegionIds(defaultRegions);
        setScreeningStrategy(resolvedStrategy);
        setDistributionChainSelections(defaultRegions.reduce((selections, regionId) => {
            selections[regionId] = getRecommendedDistributionChainIds(regionId, resolvedStrategy);
            return selections;
        }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>));
    };
    const getFestivalTimingMeta = (festivalWeeks: number[], targetWeekOfYear: number) => {
        const sortedWeeks = [...festivalWeeks].sort((a, b) => a - b);
        const firstWeek = sortedWeeks[0];
        const lastWeek = sortedWeeks[sortedWeeks.length - 1];
        const isLive = sortedWeeks.includes(targetWeekOfYear);

        if (isLive) {
            return {
                isTimingRight: true,
                statusLabel: 'Available This Week',
                statusTone: 'text-emerald-400',
                weekLabel: sortedWeeks.length > 1 ? `Weeks ${firstWeek}-${lastWeek}` : `Week ${firstWeek}`
            };
        }

        const nextFestivalWeek = sortedWeeks.find(week => week > targetWeekOfYear) ?? firstWeek;
        const weeksUntil = nextFestivalWeek > targetWeekOfYear
            ? nextFestivalWeek - targetWeekOfYear
            : (52 - targetWeekOfYear) + nextFestivalWeek;

        const hasPassedThisSeason = targetWeekOfYear > lastWeek;

        return {
            isTimingRight: false,
            statusLabel: hasPassedThisSeason
                ? `Returns in ${weeksUntil} ${weeksUntil === 1 ? 'week' : 'weeks'}`
                : `Opens in ${weeksUntil} ${weeksUntil === 1 ? 'week' : 'weeks'}`,
            statusTone: hasPassedThisSeason ? 'text-amber-400' : 'text-sky-400',
            weekLabel: sortedWeeks.length > 1 ? `Weeks ${firstWeek}-${lastWeek}` : `Week ${firstWeek}`
        };
    };

    const handleComplete = () => {
        if (completionStartedRef.current || !hasReleaseStrategyEnergy) return;
        completionStartedRef.current = true;

        const updatedPlayer = { ...player };
        const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
        const effectiveReleaseAbsoluteWeek = releaseType === 'STREAMING_ONLY' && lockedPremiereAbsoluteWeek
            ? lockedPremiereAbsoluteWeek
            : currentAbsoluteWeek + ((releaseWeek - player.currentWeek + 52) % 52);
        const effectiveReleaseWeek = ((effectiveReleaseAbsoluteWeek - 1) % 52) + 1;
        const weeksUntilRelease = Math.max(0, effectiveReleaseAbsoluteWeek - currentAbsoluteWeek);
        let festivalCost = 0;

        if (festivalPremiere) {
            const fest = FESTIVALS.find(f => f.id === festivalPremiere);
            if (fest) festivalCost += fest.cost;
        }

        const campaignSpend = totalCampaignCost;
        const unusedCampaignReserve = hasReservedMarketingPool ? campaignBudgetRemaining : 0;
        const campaignReach = campaignReachPreview;

        if (!hasReservedMarketingPool) {
            if (campaignSpend > 0) {
                updatedPlayer.money -= campaignSpend;
                updatedPlayer.finance.history.unshift({
                    id: Math.random().toString(),
                    week: updatedPlayer.currentWeek,
                    year: updatedPlayer.age,
                    amount: -campaignSpend,
                    category: 'BUSINESS',
                    description: tr('release.generated.releaseCampaign', { project: project.name })
                });
            }
        }

        if (festivalCost > 0) {
            updatedPlayer.money -= festivalCost;
            updatedPlayer.finance.history.unshift({
                id: Math.random().toString(),
                week: updatedPlayer.currentWeek,
                year: updatedPlayer.age,
                amount: -festivalCost,
                category: 'BUSINESS',
                description: tr('release.generated.festivalPremiere', { project: project.name })
            });
        }

        if (unusedCampaignReserve > 0 && studio) {
            const b = updatedPlayer.businesses.find(b => b.id === studio.id);
            if (b) {
                b.balance += unusedCampaignReserve;
                if (!b.studioState) b.studioState = {} as any;
                const ledger = Array.isArray(b.studioState.financeLedger) ? b.studioState.financeLedger : [];
                b.studioState.financeLedger = [{
                    id: `studio_ledger_campaign_return_${project.id}_${player.age}_${player.currentWeek}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: unusedCampaignReserve,
                    type: 'FUNDING_SURPLUS',
                    label: tr('release.generated.unusedCampaignReserveReturned', { project: project.name }),
                    projectId: project.id
                }, ...ledger].slice(0, 40);
            }
        }

        if ((normalizedChannelMix.allocations.RED_CARPET || 0) > 0) {
            const premiereEvent: PendingEvent = {
                id: `premiere_${project.id}`,
                week: player.currentWeek,
                type: 'PREMIERE',
                title: tr('release.generated.premiereTitle', { project: project.name }),
                description: tr('release.generated.premiereDescription', { project: project.name }),
                data: { projectId: project.id }
            };
            updatedPlayer.pendingEvent = premiereEvent;
        }

        const commitmentIndex = updatedPlayer.commitments.findIndex(c => c.id === project.id);
        if (commitmentIndex !== -1) {
            const commitment = updatedPlayer.commitments[commitmentIndex];
            updatedPlayer.commitments[commitmentIndex] = {
                ...commitment,
                projectPhase: 'AWAITING_RELEASE',
                phaseWeeksLeft: weeksUntilRelease,
                totalPhaseDuration: weeksUntilRelease,
                projectDetails: commitment.projectDetails ? {
                    ...commitment.projectDetails,
                    releasePlanningDraft: undefined,
                    releaseStrategy: releaseType as any,
                    screeningStrategy: effectiveScreeningStrategy as any,
                    releaseRegionIds: releaseType === 'THEATRICAL'
                        ? (normalizedSelectedRegionIds.length > 0 ? normalizedSelectedRegionIds : getDefaultReleaseRegionIds(effectiveScreeningStrategy))
                        : undefined,
                    releaseChainSelections: releaseType === 'THEATRICAL'
                        ? normalizedDistributionChainSelections
                        : undefined,
                    campaignPositioning,
                    campaignTimeline,
                    campaignFitSnapshot: campaignFit,
                    campaignForecastSnapshot: campaignForecast,
                    marketingChannelAllocations: normalizedChannelMix.allocations,
                    marketingBudgetSpent: campaignSpend,
                    marketingBudgetRemaining: 0,
                    returnedMarketingBudget: unusedCampaignReserve,
                    campaignItems: activeCampaignChannels.map(channel => channel.id),
                    totalCampaignSpend: campaignSpend,
                    releaseDate: effectiveReleaseWeek,
                    hiddenStats: {
                        ...applyMusicImpactToHiddenStats(commitment.projectDetails.hiddenStats, musicImpact, commitment.projectDetails.musicPlan),
                        redCarpetHype: (normalizedChannelMix.allocations.RED_CARPET || 0) > 0 ? 20 : 0,
                        festivalPremiere: festivalPremiere || undefined,
                        campaignFitScore: campaignFit.fitScore,
                        falseMarketingRisk: campaignFit.falseMarketingRisk,
                        campaignOverspendRisk: campaignFit.overspendRisk,
                        campaignPromise: campaignPositioning,
                        campaignTimeline,
                        campaignReachMultiplier: campaignReach.multiplier,
                        campaignReachLabel: campaignReach.label,
                    }
                } : undefined
            };
        }

        // Update Universe Stats if applicable
        if (project.projectDetails?.universeId) {
            const universeId = project.projectDetails.universeId;
            updatedPlayer.world.universes = normalizeUniverseMap(updatedPlayer.world?.universes || {}, language);
            if (updatedPlayer.world.universes[universeId]) {
                const universe = updatedPlayer.world.universes[universeId];
                const quality = project.projectDetails.hiddenStats?.qualityScore || 50;
                const updatedUniverse = mergeUniverseRosterWithProject(
                    universe,
                    project.name,
                    project.projectDetails.castList,
                    player.name,
                    language
                );
                
                // Increase Brand Power and Momentum
                updatedUniverse.brandPower = Math.min(100, updatedUniverse.brandPower + Math.floor(quality / 20));
                updatedUniverse.momentum = Math.min(100, updatedUniverse.momentum + Math.floor(quality / 10));
                updatedPlayer.world.universes[universeId] = updatedUniverse;
            }
        }

        spendPlayerEnergy(updatedPlayer, releaseStrategyEnergyCost, `Release strategy: ${project.name}`);
        releaseDraftClearedRef.current = true;
        onUpdatePlayer(updatedPlayer);
        onComplete();
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => {
        if (step === 2 && isPostTheatricalBidding) {
            const draft = buildReleasePlanningDraft();
            lastPersistedDraftRef.current = JSON.stringify({ ...draft, updatedAt: 0 });
            onUpdatePlayer(writeReleasePlanningDraft(player, draft));
            onBack();
        } else {
            setStep(step - 1);
        }
    };
    const toggleSelectedRegion = (regionId: BoxOfficeRegionId) => {
        setSelectedRegionIds(currentRegionIds => {
            if (currentRegionIds.includes(regionId)) {
                if (currentRegionIds.length <= 1) return currentRegionIds;
                setDistributionChainSelections(currentSelections => {
                    const nextSelections = { ...currentSelections };
                    delete nextSelections[regionId];
                    return nextSelections;
                });
                return currentRegionIds.filter(currentRegionId => currentRegionId !== regionId);
            }

            setDistributionChainSelections(currentSelections => ({
                ...currentSelections,
                [regionId]: currentSelections[regionId] || getRecommendedDistributionChainIds(regionId)
            }));
            return [...currentRegionIds, regionId];
        });
    };

    const handleBack = () => {
        const draft = buildReleasePlanningDraft();
        const updatedPlayer = writeReleasePlanningDraft(player, draft);
        lastPersistedDraftRef.current = JSON.stringify({ ...draft, updatedAt: 0 });
        onUpdatePlayer(updatedPlayer);
        onBack();
    };

    const upcomingRivals = getCanonicalScheduledRivals(
        player.world,
        getAbsoluteWeek(player.age, player.currentWeek),
        8,
    );
    const displayReleaseWeek = distributionLocked && lockedPremiereAbsoluteWeek
        ? ((lockedPremiereAbsoluteWeek - 1) % 52) + 1
        : releaseWeek;
    const rivalsThisWeek = upcomingRivals.filter(r => r.weekReleased === displayReleaseWeek);

    const releaseFilm = buildReleaseFilmArt(project);
    const releasePhase = getReleaseWizardPhase(step, releaseType, Boolean(isPostTheatricalBidding));
    const releaseRoute = releaseType ? toReleaseWizardRoute(releaseType) : null;
    const releaseProgress = getReleaseWizardProgress(step, releaseType);
    const positionPresentation = {
        MASS_EVENT: { hue: 28, style: 'mass' as const },
        PRESTIGE_PUSH: { hue: 274, style: 'prestige' as const },
        FANBASE_MOBILIZATION: { hue: 202, style: 'fanbase' as const },
        VIRAL_HEAT: { hue: 346, style: 'viral' as const },
        SLEEPER_BUILD: { hue: 142, style: 'sleeper' as const },
    };
    const timelineWeights: Record<CampaignTimeline, number[]> = {
        FRONT_LOADED_OPENING: [0.72, 0.88, 1, 0.94, 0.82, 0.7, 0.48, 0.31, 0.2, 0.12, 0.08],
        BALANCED_ROLLOUT: [0.2, 0.3, 0.42, 0.58, 0.76, 1, 0.88, 0.72, 0.52, 0.34, 0.18],
        SLOW_BURN_WOM: [0.08, 0.12, 0.18, 0.25, 0.38, 0.58, 0.7, 0.82, 0.94, 1, 0.88],
        LAST_WEEK_BLITZ: [0.05, 0.05, 0.08, 0.1, 0.18, 1, 0.6, 0.26, 0.12, 0.08, 0.05],
    };
    const channelGlyphs: Record<MarketingChannelId, string> = {
        TRAILER_LAUNCH: 'play',
        SOCIAL_DIGITAL: 'share',
        TV_OUTDOOR: 'tv',
        RED_CARPET: 'camera',
        CRITIC_SCREENINGS: 'star',
        INFLUENCER_PUSH: 'megaphone',
        INTERNATIONAL: 'globe',
        FAN_EVENTS: 'reel',
    };
    const projectQualityScore = Math.round(Number(project.projectDetails?.hiddenStats?.qualityScore || 0));
    const targetFestivalWeek = getWeekOfYear(player.currentWeek);
    const festivalModels = FESTIVALS.map((festival, index) => {
        const timing = getFestivalTimingMeta(festival.weeks, targetFestivalWeek);
        return {
            id: festival.id,
            name: getFestivalName(festival),
            description: getFestivalDescription(festival),
            cost: festival.cost,
            qualityRequirement: festival.prestigeReq,
            qualityMet: projectQualityScore >= festival.prestigeReq,
            affordable: player.money >= festival.cost,
            timingRight: timing.isTimingRight,
            timingLabel: timing.statusLabel,
            weekLabel: timing.weekLabel,
            hue: [192, 44, 8, 214][index % 4],
        };
    });
    const calendarSlots = Array.from({ length: 52 }, (_, index) => {
        const absoluteReleaseWeek = player.currentWeek + index;
        const weekOfYear = getWeekOfYear(absoluteReleaseWeek);
        const calendarEvent = CALENDAR_EVENTS.find(event => event.week === weekOfYear);
        const rivals = upcomingRivals.filter(rival => rival.weekReleased === absoluteReleaseWeek);
        return {
            week: absoluteReleaseWeek,
            weekOfYear,
            selectable: index >= 1 && index <= 8,
            isCurrent: index === 0,
            selected: releaseWeek === absoluteReleaseWeek,
            season: getSeasonLabel(weekOfYear),
            event: calendarEvent ? getCalendarEventName(calendarEvent) : null,
            rivals: rivals.map(rival => ({
                id: rival.id,
                title: rival.title,
                scale: (rival.budgetTier === 'HIGH' ? 'TENTPOLE' : rival.budgetTier === 'MID' ? 'MID' : 'SMALL') as 'TENTPOLE' | 'MID' | 'SMALL',
                genre: rival.genre,
            })),
        };
    });
    const deskRegions = BOX_OFFICE_REGIONS.map((region) => ({
        id: region.id,
        label: getBoxOfficeRegionLabel(language, region.id),
        shortLabel: getBoxOfficeRegionShortLabel(language, region.id),
        selected: normalizedSelectedRegionIds.includes(region.id),
        marketWeight: region.marketWeight,
        chains: getCinemaChainsForRegion(region.id, language).map(chain => {
            const terms = getCinemaChainTerms(chain.id, region.id, language)!;
            return {
                id: chain.id,
                name: chain.name,
                color: chain.brandColor,
                selected: (normalizedDistributionChainSelections[region.id] || []).includes(chain.id),
                screens: terms.screens,
                exhibitorCut: terms.exhibitorCut,
                bookingCost: terms.bookingCost,
            };
        }),
    }));
    const campaignPositions = CAMPAIGN_POSITIONING_OPTIONS.map(option => ({
        id: option.id,
        label: getCampaignPositionLabel(option),
        shortLabel: getCampaignPositionShortLabel(option),
        description: getCampaignPositionDescription(option),
        promise: getCampaignPositionPromise(option),
        ...positionPresentation[option.id],
    }));
    const campaignTimelines = CAMPAIGN_TIMELINE_OPTIONS.map(option => ({
        id: option.id,
        label: getCampaignTimelineShortLabel(option),
        description: getCampaignTimelineDescription(option),
        weights: timelineWeights[option.id],
    }));
    const campaignChannels = MARKETING_CHANNEL_OPTIONS.map(channel => ({
        id: channel.id,
        label: getMarketingChannelLabel(channel),
        description: getMarketingChannelDescription(channel),
        icon: channelGlyphs[channel.id],
        amount: normalizedChannelMix.allocations[channel.id] || 0,
    }));
    const chosenFestival = FESTIVALS.find(festival => festival.id === festivalPremiere);
    const partnerNames = Array.from(new Set((selectedDistributionRows as any[]).flatMap(row => row?.chains?.map((chain: CinemaChain) => chain.name) || [])));

    return (
        <ReleaseStrategyShell
            film={releaseFilm}
            phase={releasePhase}
            progress={releaseProgress}
            route={releaseRoute}
            hue={positionPresentation[campaignPositioning].hue}
            onBack={step <= 1 ? handleBack : prevStep}
        >
            {step === 1 && (
                <DistributionStep
                    film={releaseFilm}
                    selected={releaseRoute}
                    theatricalDisabled={isSeries}
                    streamingDisabled={false}
                    theatricalNote={isSeries ? 'Series seasons premiere through streaming platforms.' : undefined}
                    streamingNote={isSeries ? 'Take this season into the live platform market.' : undefined}
                    onSelect={route => {
                        if (!distributionLocked) setReleaseType(route === 'THEATRICAL' ? 'THEATRICAL' : 'STREAMING_ONLY');
                    }}
                    onContinue={nextStep}
                    locked={distributionLocked}
                />
            )}

            {step === 2 && releaseType === 'THEATRICAL' && (
                <TheatricalDeskStep
                    regions={deskRegions}
                    selectedRegionCount={normalizedSelectedRegionIds.length}
                    totalScreens={distributionDealSummary.totalScreens}
                    bookingCost={distributionDealSummary.bookingCost}
                    studioShare={distributionDealSummary.studioShare}
                    expectedFootfall={distributionDealSummary.expectedFootfall}
                    openingRange={[distributionDealSummary.studioOpeningLow, distributionDealSummary.studioOpeningHigh]}
                    onToggleRegion={regionId => toggleSelectedRegion(regionId as BoxOfficeRegionId)}
                    onToggleChain={(regionId, chainId) => toggleDistributionChain(regionId as BoxOfficeRegionId, chainId as CinemaChainId)}
                    onAutoBuild={() => applyRecommendedDistributionDesk(normalizedSelectedRegionIds.length > 0 ? effectiveScreeningStrategy : 'NATIONAL')}
                    onContinue={nextStep}
                    onBack={prevStep}
                />
            )}

            {step === 2 && releaseType === 'STREAMING_ONLY' && (
                <StreamingWarRoomStep
                    film={releaseFilm}
                    session={biddingSession}
                    marketPlatforms={streamingMarketPlatforms}
                    canAccept={hasStreamingDealEnergy}
                    energyCost={streamingDealEnergyCost}
                    onStart={startAuction}
                    onSessionChange={persistBiddingSession}
                    onAccept={handleAcceptStreamingOffer}
                    onFinish={finishStreamingLicensing}
                    onContinue={() => setStep(3)}
                    onLeave={leaveAuction}
                    onBack={prevStep}
                    preflightMessage={biddingRightsMessage || biddingLotBuild.lot?.notice || (!biddingLotBuild.lot ? biddingLotBuild.compatibility.summary : null)}
                    canStart={Boolean(biddingLotBuild.lot)}
                    commissionedPremiere={lockedPremiereBid && lockedPremierePlatform ? {
                        platformName: lockedPremierePlatform.name,
                        platformFunding: lockedPremiereFundingApplied,
                        studioCashAtRisk: lockedPremiereStudioCashAtRisk,
                    } : null}
                    onConfirmPremiere={() => handleAcceptBid(lockedPremiereBid)}
                />
            )}

            {step === 3 && (
                <CampaignStep
                    film={releaseFilm}
                    positions={campaignPositions}
                    selectedPositionId={campaignPositioning}
                    timelines={campaignTimelines}
                    selectedTimelineId={campaignTimeline}
                    forecast={{
                        score: forecastGaugeScore,
                        label: forecastGaugeLabel,
                        openingRange: '$' + formatCampaignMillions(campaignForecast.openingWeekendLow) + 'M–$' + formatCampaignMillions(campaignForecast.openingWeekendHigh) + 'M',
                        breakEvenChance: campaignForecast.breakEvenChance,
                        weekTwoDropRisk: campaignForecast.weekTwoDropRisk,
                        streamingBidBoost: campaignForecast.streamingBidBoost,
                        awardsVisibility: campaignForecast.awardsVisibility,
                        note: campaignFit.warning,
                    }}
                    soundtrack={{
                        label: musicImpact.label || 'Production score',
                        score: musicImpact.score,
                        openingLift: musicImpact.openingWeekendLiftPct,
                        trailerLift: musicImpact.trailerStrengthLift,
                        mismatchRisk: musicImpact.mismatchBacklashRisk,
                    }}
                    channels={campaignChannels}
                    budget={legacyCampaignBudgetCap}
                    spent={totalCampaignCost}
                    allocationStep={allocationStep}
                    onSelectPosition={id => setCampaignPositioning(id as CampaignPositioning)}
                    onSelectTimeline={id => setCampaignTimeline(id as CampaignTimeline)}
                    onChangeChannel={(id, delta) => updateChannelAllocation(id as MarketingChannelId, delta)}
                    onContinue={nextStep}
                    onBack={prevStep}
                />
            )}

            {step === 4 && (
                <FestivalsStep
                    qualityScore={projectQualityScore}
                    selectedFestivalId={festivalPremiere}
                    festivals={festivalModels}
                    onSelectFestival={setFestivalPremiere}
                    onContinue={nextStep}
                    onBack={prevStep}
                />
            )}

            {step === 5 && (
                <CalendarStep
                    film={releaseFilm}
                    slots={calendarSlots}
                    selectedWeek={displayReleaseWeek}
                    onSelectWeek={week => {
                        if (!distributionLocked) setReleaseWeek(week);
                    }}
                    onContinue={nextStep}
                    onBack={prevStep}
                    locked={distributionLocked}
                />
            )}

            {step >= 6 && releaseRoute && (
                <FinalizeStep
                    film={releaseFilm}
                    route={releaseRoute}
                    campaignStyle={positionPresentation[campaignPositioning].style}
                    campaignLabel={getCampaignPositionLabel(selectedCampaignPosition)}
                    campaignPromise={getCampaignPositionPromise(selectedCampaignPosition)}
                    timelineLabel={getCampaignTimelineShortLabel(selectedCampaignTimeline)}
                    channelCount={activeCampaignChannels.length}
                    campaignSpend={totalCampaignCost}
                    campaignReturn={hasReservedMarketingPool ? campaignBudgetRemaining : 0}
                    festivalLabel={chosenFestival ? getFestivalName(chosenFestival) : null}
                    releaseWeek={displayReleaseWeek}
                    screenCount={distributionDealSummary.totalScreens}
                    regionCount={normalizedSelectedRegionIds.length}
                    partnerNames={partnerNames}
                    bookingCost={distributionDealSummary.bookingCost}
                    studioShare={distributionDealSummary.studioShare}
                    valueRange={[distributionDealSummary.studioOpeningLow, distributionDealSummary.studioOpeningHigh]}
                    buyerName={streamingMarketPlatforms.find(platform => platform.id === selectedPlatform)?.name || selectedPlatform}
                    buyerNames={Array.from(new Set([
                        ...((biddingSession?.offers || [])
                            .filter(offer => offer.status === 'ACCEPTED')
                            .map(offer => offer.platformName)),
                        ...selectedStreamingPlatformIds.map(platformId => (
                            streamingMarketPlatforms.find(platform => platform.id === platformId)?.name || platformId
                        )),
                    ]))}
                    energyCost={releaseStrategyEnergyCost}
                    disabled={!hasReleaseStrategyEnergy}
                    disabledReason={!hasReleaseStrategyEnergy ? 'Not enough energy to lock this release.' : undefined}
                    onLock={handleComplete}
                    onBack={prevStep}
                />
            )}
        </ReleaseStrategyShell>
    );
};
