import React, { useState, useMemo } from 'react';
import { Player, PendingEvent, ScreeningStrategy, ProjectHiddenStats, NextSeasonFundingTier, CampaignPositioning, CampaignTimeline, MarketingChannelAllocations, MarketingChannelId, BoxOfficeRegionId, CinemaChainId, CinemaChain, CinemaChainRegionalTerms, ReleasePlanningDraft } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Film, Tv, Calendar, TrendingUp, CheckCircle2, Camera, Star, Globe, Youtube, Share2, Megaphone, Music2, Zap, ShieldCheck } from 'lucide-react';
import { FESTIVALS, CALENDAR_EVENTS } from '../../../services/worldLogic';
import { mergeUniverseRosterWithProject, normalizeUniverseMap } from '../../../services/universeLogic';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import { calculateBalancedNextSeasonFundingCap, getPlatformFundingRelationshipMultiplier } from '../../../services/streamingFundingLogic';
import { CAMPAIGN_POSITIONING_OPTIONS, CAMPAIGN_TIMELINE_OPTIONS, MARKETING_CHANNEL_OPTIONS, calculateCampaignFit, calculateCampaignForecast, normalizeMarketingChannelAllocations } from '../../../services/marketingStrategy';
import { BOX_OFFICE_REGIONS, getBoxOfficeRegionLabel, getBoxOfficeRegionShortLabel, getCinemaChainById, getCinemaChainTerms, getCinemaChainsForRegion } from '../../../services/cinemaChains';
import { getDefaultReleaseRegionIds, getRegionMapSummary, normalizeReleaseRegionIds } from '../../../services/regionMap';
import { getBoxOfficeCaps } from '../../../services/roleLogic';
import { applyMusicImpactToHiddenStats, calculateProjectMusicImpact } from '../../../services/musicIndustry';
import { CinemaChainLogo } from './components/CinemaChainLogo';
import { InteractiveRegionMap } from './components/InteractiveRegionMap';
import { applyInvestorPayoutMemory, calculateInvestorPayout } from '../../../services/projectInvestors';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { spendPlayerEnergy } from '../../../services/premiumLogic';
import { PHASE_ONE_ENERGY_COSTS } from '../../../services/energyCosts';
import { getProjectFundingEconomics } from '../../../services/projectFundingEconomics';
import { calculateCampaignReachProfile } from '../../../services/studioProductionEconomy';

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

const formatContractMoney = (value: number) => {
    if (value <= 0) return '$0';
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(value / 1_000).toLocaleString()}k`;
};

const CAMPAIGN_POSITIONING_ACCENTS: Record<CampaignPositioning, { icon: React.ReactNode; tone: string; bar: string }> = {
    MASS_EVENT: {
        icon: <Megaphone size={18} />,
        tone: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
        bar: 'bg-amber-400'
    },
    PRESTIGE_PUSH: {
        icon: <Star size={18} />,
        tone: 'border-purple-400/50 bg-purple-500/10 text-purple-200',
        bar: 'bg-purple-300'
    },
    FANBASE_MOBILIZATION: {
        icon: <Globe size={18} />,
        tone: 'border-sky-400/50 bg-sky-500/10 text-sky-200',
        bar: 'bg-sky-300'
    },
    VIRAL_HEAT: {
        icon: <Share2 size={18} />,
        tone: 'border-rose-400/50 bg-rose-500/10 text-rose-200',
        bar: 'bg-rose-300'
    },
    SLEEPER_BUILD: {
        icon: <TrendingUp size={18} />,
        tone: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
        bar: 'bg-emerald-300'
    }
};

const MARKETING_CHANNEL_ICONS: Record<MarketingChannelId, React.ReactNode> = {
    TRAILER_LAUNCH: <Youtube size={16} />,
    SOCIAL_DIGITAL: <Share2 size={16} />,
    TV_OUTDOOR: <Tv size={16} />,
    RED_CARPET: <Camera size={16} />,
    CRITIC_SCREENINGS: <Star size={16} />,
    INFLUENCER_PUSH: <Megaphone size={16} />,
    INTERNATIONAL: <Globe size={16} />,
    FAN_EVENTS: <Film size={16} />
};

const PLATFORMS = [
    { id: 'NETFLIX', name: 'Netflix', baseBid: 12000000, qualityReq: 72, color: '#E50914', maxBudget: 420000000 },
    { id: 'APPLE_TV', name: 'Apple TV+', baseBid: 17000000, qualityReq: 82, color: '#FFFFFF', maxBudget: 560000000 },
    { id: 'DISNEY_PLUS', name: 'Disney+', baseBid: 11000000, qualityReq: 70, color: '#113CCF', maxBudget: 520000000 },
    { id: 'HULU', name: 'Hulu', baseBid: 7500000, qualityReq: 58, color: '#1CE783', maxBudget: 180000000 },
    { id: 'YOUTUBE', name: 'YouTube Premium', baseBid: 3000000, qualityReq: 38, color: '#FF0000', maxBudget: 80000000 }
];

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
    const runStrength = projectBudget > 0 && theatricalGross > 0 ? theatricalGross / projectBudget : 0;
    const bidProfile = getStreamingBidProfile(packageScore, isSeries, isPostTheatricalBidding, runStrength);
    const safetyPremium = bidProfile.safetyPremium;
    const qualityEscalator = Math.max(0.85, 0.95 + ((packageScore - 55) / 105));
    const baseFloorOffer = projectBudget > 0 ? projectBudget * bidProfile.floor : platform.baseBid;
    const topPlatformBudget = Math.max(...PLATFORMS.map(p => p.maxBudget));
    const platformMuscle = topPlatformBudget > 0 ? platform.maxBudget / topPlatformBudget : 0.5;
    const floorVariance = 0.96 + (Math.random() * 0.1) + (platformMuscle * 0.05);
    const safeMinimum = projectBudget > 0
        ? Math.max(baseFloorOffer, packageScore < 45 ? projectBudget * 0.8 : 0)
        : baseFloorOffer;
    const floorOffer = Math.floor(Math.max(safeMinimum, baseFloorOffer * floorVariance));
    const qualityRange = projectBudget > 0
        ? projectBudget * (bidProfile.floor + ((bidProfile.ceiling - bidProfile.floor) * (0.24 + Math.random() * 0.62)))
        : platform.baseBid * (0.95 + Math.random() * 0.35) * safetyPremium;
    const platformAppetite = platform.baseBid * (packageScore / 52) * (1 + Math.random() * 0.32) * safetyPremium * qualityEscalator;
    const theatricalProof = theatricalGross > 0
        ? theatricalGross * (0.42 + Math.min(0.34, packageScore / 290) + Math.random() * 0.12)
        : 0;
    const straightToStreamingUpside = !isPostTheatricalBidding && projectBudget > 0
        ? projectBudget * Math.pow(Math.max(0.35, packageScore / 100), 2.35) * (packageScore >= 92 ? 9.5 : packageScore >= 84 ? 6.6 : packageScore >= 72 ? 3.9 : 1.8) * (0.9 + Math.random() * 0.38)
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
            Math.max(floorOffer * (1.04 + Math.random() * 0.12), platformAppetite, qualityRange, theatricalProof, straightToStreamingUpside)
        )
    );
    
    // Re-bidding should discourage fishing for better bids, but never break the safe-floor rule.
    if (previousBestBidValue) {
        if (Math.random() > 0.05) {
            maxOffer = Math.max(floorOffer, Math.min(maxOffer, previousBestBidValue * (0.7 + Math.random() * 0.25)));
        }
    }

    if (maxOffer <= currentHighestBidValue * 1.025) return null;

    const newAmount = currentHighestBidValue === 0
        ? Math.floor(Math.max(
            floorOffer,
            Math.min(
                maxOffer,
                Math.max(
                    floorOffer * (0.96 + Math.random() * 0.18),
                    platform.baseBid * (0.95 + Math.random() * 0.3) * safetyPremium,
                    maxOffer * (packageScore >= 84 ? 0.42 + Math.random() * 0.2 : 0.3 + Math.random() * 0.18)
                )
            )
        ))
        : Math.floor(Math.max(floorOffer, Math.min(maxOffer, currentHighestBidValue * (1.045 + Math.random() * 0.07))));
    
    const rand = Math.random();
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
        backendPct = Math.floor(Math.random() * (isPostTheatricalBidding ? 6 : 8)) + (isPostTheatricalBidding ? 4 : 6);
    }

    const safeRelationshipMultiplier = Math.max(0.84, Math.min(1, Number(relationshipMultiplier) || 1));
    upfrontAmount = Math.floor(upfrontAmount * safeRelationshipMultiplier);
    fundingAmount = Math.floor(fundingAmount * safeRelationshipMultiplier);
    const bidValue = type === 'GREENLIGHT_DEAL' ? upfrontAmount + fundingAmount : upfrontAmount;
    
    return {
        id: Math.random().toString(),
        platformId: platform.id,
        amount: upfrontAmount,
        type,
        fundingAmount,
        backendPct,
        fundingTier,
        fundingReason,
        bidValue,
        timestamp: Date.now()
    };
};

export const ReleaseWizard: React.FC<ReleaseWizardProps> = ({ player, studio, project, onBack, onUpdatePlayer, onComplete, isPostTheatricalBidding }) => {
    const savedDraft = project.projectDetails?.releasePlanningDraft as ReleasePlanningDraft | undefined;
    const [step, setStep] = useState(savedDraft?.step || (isPostTheatricalBidding ? 2 : 1));
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
    const [festivalPremiere, setFestivalPremiere] = useState<string | null>(savedDraft?.festivalPremiere || null);
    const [releaseWeek, setReleaseWeek] = useState<number>(savedDraft?.releaseWeek || player.currentWeek + 4);
    const releaseDraftClearedRef = React.useRef(false);
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
        festivalPremiere,
        releaseWeek,
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
        selectedRegionIds,
        step,
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
            timestamp: Date.now()
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
    
    // Bidding State
    const [auctionState, setAuctionState] = useState<'IDLE' | 'ACTIVE' | 'FINISHED'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(100);
    const [currentBids, setCurrentBids] = useState<Bid[]>([]);
    const [highestBid, setHighestBid] = useState<Bid | null>(null);
    const [activePlatforms, setActivePlatforms] = useState<string[]>(PLATFORMS.map(p => p.id));
    const lastAuctionBidAtRef = React.useRef(0);
    const auctionTimeLeftRef = React.useRef(100);

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

    const createOpeningBids = () => {
        const { hiddenStats, packageScore, projectBudget, theatricalGross, hasProvenIp, fundingContext } = getProjectAuctionContext();
        const independentBids = PLATFORMS
            .map(platform => {
                const fitGap = Math.max(0, platform.qualityReq - packageScore);
                const effectiveScore = Math.max(32, packageScore - (fitGap * 0.28));
                const relationshipMultiplier = getPlatformFundingRelationshipMultiplier(
                    studio?.studioState?.platformRelations?.[platform.id]
                );
                return calculateStreamingAuctionOffer(
                    platform,
                    projectBudget,
                    effectiveScore,
                    isSeries,
                    0,
                    project.previousBestBidValue,
                    isPostTheatricalBidding,
                    theatricalGross,
                    hiddenStats,
                    hasProvenIp,
                    fundingContext,
                    relationshipMultiplier
                );
            })
            .filter((bid): bid is Bid => !!bid)
            .sort((a, b) => b.bidValue - a.bidValue);

        if (independentBids.length === 0) return [];

        const leaderValue = independentBids[0].bidValue;
        const targetCount = Math.min(4, independentBids.length);
        return independentBids.slice(0, targetCount).map((bid, index) => {
            if (index === 0) return bid;
            const competitiveFloor = leaderValue * (0.5 + (Math.random() * 0.22));
            const adjustedAmount = Math.floor(Math.max(bid.amount, Math.min(leaderValue * 0.94, competitiveFloor)));
            return {
                ...bid,
                amount: adjustedAmount,
                bidValue: bid.type === 'GREENLIGHT_DEAL' ? adjustedAmount + (bid.fundingAmount || 0) : adjustedAmount,
                id: Math.random().toString(),
                timestamp: Date.now() + index,
            };
        }).sort((a, b) => b.bidValue - a.bidValue);
    };

    const startAuction = () => {
        const openingBids = createOpeningBids();
        if (openingBids.length > 0) {
            const openingFloorBid = openingBids[openingBids.length - 1];
            setCurrentBids([openingFloorBid]);
            setHighestBid(openingFloorBid);
            setActivePlatforms(PLATFORMS.map(p => p.id));
        }
        lastAuctionBidAtRef.current = Date.now();
        auctionTimeLeftRef.current = 100;
        setTimeLeft(100);
        setAuctionState('ACTIVE');
    };

    React.useEffect(() => {
        if (auctionState !== 'ACTIVE') return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    auctionTimeLeftRef.current = 0;
                    setAuctionState('FINISHED');
                    
                    // Update player state with the best bid value to prevent re-bidding exploits
                    if (highestBid) {
                        const updatedPlayer = { ...player };
                        let found = false;
                        
                        // Check commitments
                        const cIdx = updatedPlayer.commitments.findIndex(c => c.id === project.id);
                        if (cIdx !== -1) {
                            updatedPlayer.commitments[cIdx].previousBestBidValue = highestBid.bidValue;
                            found = true;
                        }
                        
                        // Check active releases
                        if (!found) {
                            const rIdx = updatedPlayer.activeReleases.findIndex(r => r.id === project.id);
                            if (rIdx !== -1) {
                                updatedPlayer.activeReleases[rIdx].previousBestBidValue = highestBid.bidValue;
                                found = true;
                            }
                        }
                        
                        if (found) {
                            onUpdatePlayer(updatedPlayer);
                        }
                    }
                    
                    // Fallback bid if no one bid
                    if (!highestBid) {
                        const projectBudget = project.projectDetails?.estimatedBudget || 0;
                        const hiddenStats = project.projectDetails?.hiddenStats || {};
                        const packageScore = ((hiddenStats.qualityScore || 50) * 0.4) + ((hiddenStats.scriptQuality || 50) * 0.2) + ((hiddenStats.directorQuality || 50) * 0.15) + ((hiddenStats.castingStrength || 50) * 0.15) + ((hiddenStats.rawHype || 50) * 0.1);
                        const theatricalGross = project.totalGross || project.gross || 0;
                        const runStrength = projectBudget > 0 && theatricalGross > 0 ? theatricalGross / projectBudget : 0;
                        const bidProfile = getStreamingBidProfile(packageScore, isSeries, isPostTheatricalBidding, runStrength);
                        const fallbackBase = Math.max(
                            5000000,
                            Math.floor(Math.max(projectBudget * bidProfile.floor, theatricalGross * 0.48))
                        );
                        const fallbackBid: Bid = {
                            id: Math.random().toString(),
                            platformId: 'NETFLIX',
                            amount: fallbackBase,
                            type: 'UPFRONT_ONLY',
                            bidValue: fallbackBase,
                            timestamp: Date.now()
                        };
                        setHighestBid(fallbackBid);
                        setCurrentBids([fallbackBid]);
                    }
                    
                    return 0;
                }
                const nextTime = prev - 1;
                auctionTimeLeftRef.current = nextTime;
                return nextTime; // Decreases by 1% every tick
            });

            // AI Bidding Logic
            const { hiddenStats, packageScore, projectBudget, theatricalGross, hasProvenIp, fundingContext } = getProjectAuctionContext();
            const eligiblePlatforms = PLATFORMS.filter(p => activePlatforms.includes(p.id));

            const lastBidderId = currentBids.length > 0 ? currentBids[0].platformId : null;
            const biddingPool = eligiblePlatforms.filter(platform => platform.id !== highestBid?.platformId && platform.id !== lastBidderId);
            const now = Date.now();
            const liveTimeLeft = auctionTimeLeftRef.current;
            const phaseConfig = liveTimeLeft > 82
                ? { minGap: 1450, bidChance: 0.16 }
                : liveTimeLeft > 45
                    ? { minGap: 950, bidChance: 0.34 }
                    : liveTimeLeft > 18
                        ? { minGap: 700, bidChance: 0.5 }
                        : { minGap: 380, bidChance: 0.78 };
            const canBidAgain = now - lastAuctionBidAtRef.current >= phaseConfig.minGap;

            if (biddingPool.length > 0 && canBidAgain && Math.random() < phaseConfig.bidChance) {
                const platform = biddingPool[Math.floor(Math.random() * biddingPool.length)];
                
                const currentHighest = highestBid ? highestBid.bidValue : 0;
                const fitGap = Math.max(0, platform.qualityReq - packageScore);
                const effectivePackageScore = Math.max(32, packageScore - (fitGap * 0.28));
                const relationshipMultiplier = getPlatformFundingRelationshipMultiplier(
                    studio?.studioState?.platformRelations?.[platform.id]
                );
                const newBid = calculateStreamingAuctionOffer(
                    platform,
                    projectBudget,
                    effectivePackageScore,
                    isSeries,
                    currentHighest,
                    project.previousBestBidValue,
                    isPostTheatricalBidding,
                    theatricalGross,
                    hiddenStats,
                    hasProvenIp,
                    fundingContext,
                    relationshipMultiplier
                );
                
                if (newBid) {
                    setCurrentBids(prev => [newBid, ...prev].slice(0, 10));
                    setHighestBid(newBid);
                    lastAuctionBidAtRef.current = now;
                    const bidCountAfterThis = currentBids.length + 1;
                    setTimeLeft(prev => {
                        const minimumTimeAfterBid = bidCountAfterThis < 3 ? 76 : bidCountAfterThis < 6 ? 48 : 18;
                        const nextTime = Math.max(prev, minimumTimeAfterBid);
                        auctionTimeLeftRef.current = nextTime;
                        return nextTime;
                    }); // early bids extend the room, later bids become last-minute snipes.
                } else {
                    // Platform drops out
                    if (activePlatforms.length > 3 && Math.random() > 0.72) {
                        setActivePlatforms(prev => prev.filter(id => id !== platform.id));
                    }
                }
            }
        }, 150); // Tick every 150ms

        return () => clearInterval(interval);
    }, [auctionState, highestBid, activePlatforms, project.projectDetails?.hiddenStats?.qualityScore]);

    const handleAcceptBid = (bid: Bid | null) => {
        if (!bid) return;
        if (!hasStreamingDealEnergy) return;

        const updatedPlayer = { ...player };
        const platformName = PLATFORMS.find(p => p.id === bid.platformId)?.name || 'Platform';
        const isFundedPremiereConfirmation = bid.id.startsWith('locked_premiere_');
        const isSeriesDeal = (project.projectDetails?.type || project.type) === 'SERIES';
        const investorPlan = project.investorPlan || project.projectDetails?.investorPlan;
        const investorStreamingDealPayout = calculateInvestorPayout(investorPlan, bid.amount);
        const netStreamingDealAmount = Math.max(0, bid.amount - investorStreamingDealPayout);
        const nextInvestorPayouts = investorPlan
            ? appendInvestorPayoutSummary(project.investorPayouts || project.projectDetails?.investorPayouts, investorStreamingDealPayout)
            : project.investorPayouts || project.projectDetails?.investorPayouts;
        const lockedFunding = isSeriesDeal && bid.fundingAmount
            ? {
                id: `stream_fund_${project.id}_${bid.platformId}_${Date.now()}`,
                platformId: bid.platformId,
                platformName,
                amount: bid.fundingAmount,
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
                const ledger = Array.isArray(b.studioState.financeLedger) ? b.studioState.financeLedger : [];
	                b.studioState.financeLedger = [
                    ...(!isFundedPremiereConfirmation ? [{
                        id: `studio_ledger_bid_${project.id}_${player.age}_${player.currentWeek}`,
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
                } else if (bid.fundingAmount) {
                    b.studioState.productionFund = (b.studioState.productionFund || 0) + bid.fundingAmount;
                }
            }
        } else {
            // Add upfront cash to player's money if no studio
            updatedPlayer.money += netStreamingDealAmount;
            if (!isFundedPremiereConfirmation) updatedPlayer.finance.history.unshift({
                id: Math.random().toString(),
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
            const totalCost = bid.amount + (bid.fundingAmount || 0);
            const platformState = updatedPlayer.world.platforms[bid.platformId as any];
            platformState.cashReserve = Math.max(0, platformState.cashReserve - totalCost);
            platformState.recentHits += 1;
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
                    releaseDate: player.currentWeek + 1,
                    streamingRevenue: bid.amount,
                    investorPayouts: nextInvestorPayouts,
                    hiddenStats: {
                        ...commitment.projectDetails.hiddenStats,
                        platformId: bid.platformId,
                        backendPct: bid.backendPct || 0,
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
                let startWeek = undefined;
                let startWeekAbsolute = undefined;
                if (isStillTheatrical) {
                    const completedTheatricalWeeks = Math.max(
                        release.weeksInTheaters || 0,
                        release.weeklyGross?.length || 0,
                        Math.max(0, release.weekNum - 1)
                    );
                    const weeksRemaining = (release.maxTheatricalWeeks || 8) - completedTheatricalWeeks;
                    const waitWeeks = Math.max(1, weeksRemaining + 1);
                    startWeekAbsolute = getAbsoluteWeek(player.age, player.currentWeek) + waitWeeks;
                    startWeek = ((player.currentWeek + waitWeeks - 1) % 52) + 1;
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
                    streamingFundingAmount: Math.max(0, Number(release.streamingFundingAmount || 0)) + Math.max(0, Number(bid.fundingAmount || 0)),
                    investorPayouts: nextInvestorPayouts,
                    streaming: {
                        platformId: bid.platformId as any,
                        weekOnPlatform: 1,
                        totalViews: 0,
                        weeklyViews: [],
                        isLeaving: false,
                        startWeek: startWeek,
                        startWeekAbsolute: startWeekAbsolute
                    },
                    studioRoyaltyPercentage: bid.backendPct || 0,
                    projectDetails: {
                        ...release.projectDetails,
                        releasePlanningDraft: isPostTheatricalBidding
                            ? undefined
                            : release.projectDetails.releasePlanningDraft,
                        investorPayouts: nextInvestorPayouts,
                        hiddenStats: {
                            ...release.projectDetails.hiddenStats,
                            platformId: bid.platformId,
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

        spendPlayerEnergy(updatedPlayer, streamingDealEnergyCost, `Streaming deal: ${project.name}`);
        onUpdatePlayer(updatedPlayer);
        
        if (isPostTheatricalBidding) {
            releaseDraftClearedRef.current = true;
            onComplete();
        } else {
            setStep(3); // Move to Campaign step
        }
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
        if (!hasReleaseStrategyEnergy) return;

        const updatedPlayer = { ...player };
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
                phaseWeeksLeft: releaseWeek - player.currentWeek,
                totalPhaseDuration: releaseWeek - player.currentWeek,
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
                    releaseDate: releaseWeek,
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
        if (highestBid) {
            // Save bid progress to prevent exploits
            let found = false;
            const cIdx = updatedPlayer.commitments.findIndex(c => c.id === project.id);
            if (cIdx !== -1) {
                updatedPlayer.commitments[cIdx].previousBestBidValue = highestBid.bidValue;
                found = true;
            }
            if (!found) {
                const rIdx = updatedPlayer.activeReleases?.findIndex(r => r.id === project.id);
                if (rIdx !== undefined && rIdx !== -1 && updatedPlayer.activeReleases) {
                    updatedPlayer.activeReleases[rIdx].previousBestBidValue = highestBid.bidValue;
                    found = true;
                }
            }
        }
        onUpdatePlayer(updatedPlayer);
        onBack();
    };

    const upcomingRivals = player.world.upcomingRivals || [];
    const rivalsThisWeek = upcomingRivals.filter(r => r.weekReleased === releaseWeek);

    return (
        <div className="fixed inset-0 z-[70] bg-[#0a0502] text-white flex flex-col font-sans overflow-hidden">
            {/* Atmospheric Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#3a1510_0%,_transparent_50%)] opacity-60 mix-blend-screen"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_#ff4e00_0%,_transparent_40%)] opacity-20 mix-blend-screen"></div>
                <div className="absolute inset-0 backdrop-blur-[60px]"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex flex-col gap-3 border-b border-white/5 bg-black/20 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto sm:gap-4">
                    <button onClick={handleBack} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 transition-colors hover:bg-white/10">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="whitespace-nowrap font-serif text-xl tracking-tight text-white/90 sm:text-2xl">Release Strategy</h1>
                        <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80 sm:text-[10px] sm:tracking-[0.2em]">{project.name}</p>
                    </div>
                </div>
                <div className="flex w-full gap-1.5 sm:w-auto">
                    {!isPostTheatricalBidding && Array.from({ length: 6 }, (_, i) => i + 1).map(s => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 sm:w-8 sm:flex-none ${s === step ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : s < step ? 'bg-white/40' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div ref={contentScrollRef} className="relative z-10 flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6">
                <div className="mx-auto max-w-3xl py-6 sm:py-8">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Release Type */}
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-12">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Distribution</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">How will the world experience your vision?</p>
                                </div>

                                {isSeries && (
                                    <div className="rounded-[2rem] border border-blue-500/25 bg-blue-500/10 p-5 text-center shadow-[0_18px_55px_rgba(37,99,235,0.08)]">
                                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">Series Distribution</div>
                                        <p className="mt-2 text-sm leading-relaxed text-blue-50/75">
                                            This project is a series, so theatrical release is shown but locked. Series seasons premiere through streaming platforms.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button 
                                        disabled={isSeries}
                                        onClick={() => setReleaseType('THEATRICAL')}
                                        className={`group relative p-8 rounded-3xl border transition-all duration-500 overflow-hidden ${releaseType === 'THEATRICAL' ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'bg-white/5 border-white/10 hover:bg-white/10'} ${isSeries ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-colors duration-500 ${releaseType === 'THEATRICAL' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-black/50 border-white/10 text-white/50'}`}>
                                                <Film size={32} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <div className="font-serif text-2xl text-white/90 mb-2 flex items-center justify-center gap-2">
                                                    Theatrical
                                                    {isSeries && <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-amber-200">Locked</span>}
                                                </div>
                                                <div className="text-sm text-white/50 leading-relaxed">{isSeries ? 'Series cannot be released in theaters.' : 'Traditional cinema run. High risk, high reward box office potential.'}</div>
                                            </div>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => setReleaseType('STREAMING_ONLY')}
                                        className={`group relative p-8 rounded-3xl border transition-all duration-500 overflow-hidden ${releaseType === 'STREAMING_ONLY' ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
                                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-colors duration-500 ${releaseType === 'STREAMING_ONLY' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-black/50 border-white/10 text-white/50'}`}>
                                                <Tv size={32} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <div className="font-serif text-2xl text-white/90 mb-2">Streaming</div>
                                                <div className="text-sm text-white/50 leading-relaxed">{isSeries ? 'Series must be released on streaming.' : 'Guaranteed upfront buyout. Lower prestige, but safe money.'}</div>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex justify-center pt-8">
                                    <button disabled={!releaseType} onClick={nextStep} className="px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all disabled:opacity-30 disabled:hover:scale-100">
                                        Continue
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Screening Strategy (Theatrical) */}
                        {step === 2 && releaseType === 'THEATRICAL' && (
                            <motion.div key="step2t" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-12">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Distribution Desk</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Choose regions, cinema partners, and the shape of the theatrical run.</p>
                                    <button
                                        onClick={() => {
                                            const recommendedStrategy = normalizedSelectedRegionIds.length > 0 ? effectiveScreeningStrategy : 'NATIONAL';
                                            setScreeningStrategy(recommendedStrategy);
                                            applyRecommendedDistributionDesk(recommendedStrategy);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-400/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100 transition-colors hover:bg-emerald-400/20"
                                    >
                                        <CheckCircle2 size={14} />
                                        Auto Build Footprint
                                    </button>
                                </div>

                                <div className="rounded-[2rem] border border-amber-400/20 bg-black/30 p-4 shadow-[0_0_45px_rgba(245,158,11,0.08)]">
                                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Distribution map</div>
                                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                                                Tap regions to choose where the theatrical run opens. After that, choose which cinema partners carry each region.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Region preview</div>
                                            <div className="mt-1 text-lg font-black text-white">
                                                {regionMapSummary.regionCount || 0} region{regionMapSummary.regionCount === 1 ? '' : 's'}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/80">
                                                {distributionDealSummary.totalScreens.toLocaleString()} screens planned
                                            </div>
                                        </div>
                                    </div>
                                    <InteractiveRegionMap
                                        selectedRegionIds={normalizedSelectedRegionIds}
                                        onSelectRegion={toggleSelectedRegion}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                                    <div className="rounded-[2rem] border border-amber-300/20 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
                                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Selected region partners</div>
                                                <p className="mt-2 text-sm leading-relaxed text-white/50">
                                                    Pick one partner for a focused deal, or stack multiple partners for more screens. More reach usually means more booking cost and a different weighted cut.
                                                </p>
                                            </div>
                                            <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
                                                {normalizedSelectedRegionIds.length} active
                                            </div>
                                        </div>

                                        {selectedDistributionRows.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/15 bg-black/25 p-5 text-sm font-semibold text-white/45">
                                                Tap regions on the map to build the release footprint.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedDistributionRows.map((row: any) => {
                                                    const chains = getCinemaChainsForRegion(row.regionId, language);
                                                    const allChainsSelected = row.chainIds.length === chains.length;
                                                    return (
                                                        <div key={row.regionId} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="font-serif text-lg text-white/90">{row.region.label}</div>
                                                                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                                                                        {row.chainIds.length} partner{row.chainIds.length === 1 ? '' : 's'} • {row.terms.screens.toLocaleString()} screens • {(row.terms.exhibitorCut * 100).toFixed(0)}% cut • {formatDealMoney(row.terms.bookingCost)}
                                                                    </div>
                                                                </div>
                                                                <div className="flex -space-x-2">
                                                                    {row.chains.slice(0, 3).map((chain: any) => (
                                                                        <CinemaChainLogo key={chain.id} chain={chain} size="sm" />
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => selectAllDistributionChainsForRegion(row.regionId)}
                                                                className={`mb-2 w-full rounded-xl border px-3 py-2 text-left transition-all ${
                                                                    allChainsSelected
                                                                        ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-100'
                                                                        : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-emerald-300/35 hover:bg-emerald-400/10'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-[10px] font-black uppercase tracking-[0.18em]">All partners</div>
                                                                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">Max screens</div>
                                                                </div>
                                                            </button>

                                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                                {chains.map(chain => {
                                                                    const terms = getCinemaChainTerms(chain.id, row.regionId, language);
                                                                    const isSelected = row.chainIds.includes(chain.id);
                                                                    return (
                                                                        <button
                                                                            key={chain.id}
                                                                            onClick={() => toggleDistributionChain(row.regionId, chain.id)}
                                                                            className={`rounded-xl border p-2 text-left transition-all ${
                                                                                isSelected
                                                                                    ? 'border-amber-300/60 bg-amber-400/10 shadow-[0_0_18px_rgba(245,158,11,0.12)]'
                                                                                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <CinemaChainLogo chain={chain} size="sm" />
                                                                                <div className="min-w-0">
                                                                                    <div className="truncate text-[10px] font-black text-white">{chain.name}</div>
                                                                                    <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">
                                                                                        {terms?.screens.toLocaleString()} screens • {terms ? (terms.exhibitorCut * 100).toFixed(0) : 0}% cut
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-950/10 p-5">
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">Deal summary</div>
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Screens</div>
                                                <div className="mt-1 font-mono text-xl text-white">{distributionDealSummary.totalScreens.toLocaleString()}</div>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Booking cost</div>
                                                <div className="mt-1 font-mono text-xl text-amber-300">{formatDealMoney(distributionDealSummary.bookingCost)}</div>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Audience pull</div>
                                                <div className="mt-1 font-mono text-xl text-sky-200">{formatFootfall(distributionDealSummary.expectedFootfall)}</div>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Partner cut</div>
                                                <div className="mt-1 font-mono text-xl text-rose-200">{(distributionDealSummary.weightedCut * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                                            <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                                                <div>
                                                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-100/70">Studio share</div>
                                                    <div className="mt-1 font-mono text-3xl text-emerald-200">{(distributionDealSummary.studioShare * 100).toFixed(0)}%</div>
                                                </div>
                                                <div className="sm:text-right">
                                                    <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/35">Gross opening estimate</div>
                                                    <div className="mt-1 font-mono text-lg text-white">
                                                        {formatDealMoney(distributionDealSummary.openingLow)}-{formatDealMoney(distributionDealSummary.openingHigh)}
                                                    </div>
                                                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-100/70">
                                                        Studio receipts {formatDealMoney(distributionDealSummary.studioOpeningLow)}-{formatDealMoney(distributionDealSummary.studioOpeningHigh)}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-[10px] leading-relaxed text-emerald-50/60">
                                                If the run sells $100 in tickets, your studio keeps about ${distributionDealSummary.studioExampleShare} and cinema partners take about ${distributionDealSummary.partnerExampleShare}. Final weekly results can move with audience reaction and box-office variance.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button disabled={normalizedSelectedRegionIds.length === 0} onClick={nextStep} className="px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all disabled:opacity-30 disabled:hover:scale-100">
                                        Continue
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Platform Bidding (Streaming) */}
                        {step === 2 && releaseType === 'STREAMING_ONLY' && (
                            <motion.div key="step2s" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className={lockedPremiereBid ? 'space-y-4' : 'space-y-8'}>
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">The War Room</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">
                                        {lockedPremiereBid
                                            ? `${lockedPremierePlatform?.name} already funded this season.`
                                            : 'Streaming platforms are bidding for your project.'}
                                    </p>
                                </div>

                                {auctionState === 'IDLE' && (
                                    <div className={`flex flex-col items-center justify-center space-y-6 ${lockedPremiereBid ? 'py-0 sm:py-6' : 'py-20'}`}>
                                        <div className="text-center max-w-md">
                                            {lockedPremiereBid ? (
                                                <>
                                                    <div className="border-y border-sky-300/25 bg-gradient-to-r from-sky-400/[0.04] via-sky-400/[0.11] to-transparent px-2 py-5 text-left sm:py-7">
                                                        <div className="flex items-center gap-3">
                                                            <ShieldCheck size={22} className="text-sky-300" />
                                                            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-300">Commissioned season</div>
                                                        </div>
                                                        <div className="mt-3 text-2xl font-serif italic text-white sm:mt-4 sm:text-3xl">
                                                            {lockedPremierePlatform?.name} premiere secured
                                                        </div>
                                                        <p className="mt-2 text-sm leading-relaxed text-white/65 sm:mt-3">
                                                            {lockedPremierePlatform?.name} already contributed {formatContractMoney(lockedPremiereFundingApplied)} to make this season. Confirming the premiere does not create a second upfront payment.
                                                        </p>
                                                        <div className="mt-4 grid grid-cols-3 border-y border-white/10 py-3 sm:mt-6 sm:py-4">
                                                            <div className="pr-3">
                                                                <div className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">Platform covered</div>
                                                                <div className="mt-1 font-mono text-sm font-black text-sky-200">{formatContractMoney(lockedPremiereFundingApplied)}</div>
                                                            </div>
                                                            <div className="border-x border-white/10 px-3">
                                                                <div className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">Studio at risk</div>
                                                                <div className="mt-1 font-mono text-sm font-black text-white">{formatContractMoney(lockedPremiereStudioCashAtRisk)}</div>
                                                            </div>
                                                            <div className="pl-3">
                                                                <div className="text-[8px] font-black uppercase tracking-[0.22em] text-zinc-500">New rights fee</div>
                                                                <div className="mt-1 text-sm font-black text-emerald-300">Included</div>
                                                            </div>
                                                        </div>
                                                        <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:mt-4">
                                                            The season’s success will be judged using its funded cost, ratings and audience performance—not as an unpaid full-budget release.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAcceptBid(lockedPremiereBid)}
                                                        disabled={!hasStreamingDealEnergy}
                                                        className={`px-12 py-4 rounded-full font-bold tracking-widest uppercase text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                                                            hasStreamingDealEnergy
                                                                ? 'bg-sky-400 text-black hover:bg-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.3)] cursor-pointer'
                                                                : 'bg-white/10 text-white/35 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {hasStreamingDealEnergy ? `Confirm ${lockedPremierePlatform?.name} Premiere · ${streamingDealEnergyCost}E` : `Need ${streamingDealEnergyCost}E`}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-white/70 mb-6">Open the floor to streaming platforms. They will bid based on the estimated quality and genre of your project.</p>
                                                    <button onClick={startAuction} className="px-12 py-4 bg-blue-500 text-white rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                                        Start Bidding War
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!lockedPremiereBid && auctionState !== 'IDLE' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                        {/* Left: Platforms */}
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Bidders</h3>
                                            {PLATFORMS.map(p => {
                                                const isActive = activePlatforms.includes(p.id);
                                                const isHighest = highestBid?.platformId === p.id;
                                                return (
                                                    <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isActive ? 'bg-white/5' : 'opacity-30 grayscale'}`}>
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color, boxShadow: isHighest ? `0 0 10px ${p.color}` : 'none' }} />
                                                        <span className="font-serif text-sm">{p.name}</span>
                                                        {isHighest && <span className="ml-auto text-[8px] font-bold text-amber-400 uppercase tracking-widest">Leading</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Center: Highest Bid */}
                                        <div className="lg:col-span-2 flex flex-col gap-6">
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden flex-1 flex flex-col justify-center items-center text-center min-h-[300px]">
                                                {/* Tension Timer Background */}
                                                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-150" style={{ width: `${timeLeft}%` }} />
                                                
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-6">Current Highest Bid</h3>
                                                
                                                {highestBid ? (
                                                    <motion.div key={highestBid.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
                                                        <div className="text-5xl md:text-7xl font-mono font-light text-emerald-400">
                                                            ${(highestBid.amount / 1000000).toFixed(1)}M
                                                        </div>
                                                        <div className="text-lg font-serif text-white/90">
                                                            from <span style={{ color: PLATFORMS.find(p => p.id === highestBid.platformId)?.color }}>{PLATFORMS.find(p => p.id === highestBid.platformId)?.name}</span>
                                                        </div>
                                                        
                                                        {highestBid.type === 'GREENLIGHT_DEAL' && (
                                                            <div className="mt-4 space-y-2">
                                                                <div className="inline-block px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                                                                    + ${(highestBid.fundingAmount! / 1000000).toFixed(1)}M {isSeries ? `${highestBid.fundingTier ? `${highestBid.fundingTier.replace('_', ' ')} ` : ''}Next Season Cap` : 'Production Fund'}
                                                                </div>
                                                                {isSeries && highestBid.fundingReason && (
                                                                    <p className="mx-auto max-w-sm text-xs leading-relaxed text-emerald-100/65">
                                                                        {highestBid.fundingReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {highestBid.type === 'BACKEND_POINTS' && (
                                                            <div className="inline-block mt-4 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-[10px] font-bold uppercase tracking-widest">
                                                                + {highestBid.backendPct}% Backend Points
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ) : (
                                                    <div className="text-xl font-serif text-white/30 italic">Awaiting first bid...</div>
                                                )}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex justify-between items-center">
                                                <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                                
                                                <button
                                                    disabled={!highestBid || !hasStreamingDealEnergy}
                                                    onClick={() => handleAcceptBid(highestBid)} 
                                                    className={`px-12 py-4 rounded-full font-bold tracking-widest uppercase text-xs transition-all ${
                                                        highestBid && hasStreamingDealEnergy
                                                            ? 'bg-amber-500 text-black hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                                                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {!hasStreamingDealEnergy ? `Need ${streamingDealEnergyCost}E` : `${auctionState === 'FINISHED' ? 'Accept Winning Bid' : 'Slam the Gavel'} · ${streamingDealEnergyCost}E`}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right: Live Feed */}
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4 overflow-hidden max-h-[400px]">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Live Feed</h3>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
                                                <AnimatePresence>
                                                    {currentBids.map(bid => {
                                                        const p = PLATFORMS.find(pl => pl.id === bid.platformId);
                                                        return (
                                                            <motion.div key={bid.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-3 rounded-xl bg-black/40 border border-white/5 text-sm">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="font-serif" style={{ color: p?.color }}>{p?.name}</span>
                                                                    <span className="font-mono text-emerald-400">${(bid.amount / 1000000).toFixed(1)}M</span>
                                                                </div>
                                                                {bid.type === 'GREENLIGHT_DEAL' && <div className="text-[9px] text-emerald-500/80 uppercase tracking-widest">+ {bid.fundingTier ? bid.fundingTier.replace('_', ' ') : 'Fund'}</div>}
                                                                {bid.type === 'BACKEND_POINTS' && <div className="text-[9px] text-purple-500/80 uppercase tracking-widest">+ Backend</div>}
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 3: Campaign */}
                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-12">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Campaign</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Position the promise before you spend.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="text-[10px] text-amber-500/80 uppercase tracking-[0.3em] font-bold">Campaign Position</div>
                                            <div className="text-white/50 text-sm mt-1">Marketing can amplify demand, but it cannot repair weak reception.</div>
                                        </div>
                                        <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border text-xs uppercase tracking-widest font-bold ${CAMPAIGN_POSITIONING_ACCENTS[campaignPositioning].tone}`}>
                                            {CAMPAIGN_POSITIONING_ACCENTS[campaignPositioning].icon}
                                            {getCampaignPositionShortLabel(selectedCampaignPosition)}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                                        {CAMPAIGN_POSITIONING_OPTIONS.map(option => {
                                            const isSelected = campaignPositioning === option.id;
                                            const accent = CAMPAIGN_POSITIONING_ACCENTS[option.id];
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => setCampaignPositioning(option.id)}
                                                    className={`min-w-[154px] md:min-w-0 md:flex-1 p-3 rounded-2xl border transition-all duration-300 text-left ${isSelected ? `${accent.tone} shadow-[0_0_18px_rgba(245,158,11,0.12)]` : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${isSelected ? 'bg-black/30 border-current' : 'bg-black/40 border-white/10'}`}>
                                                            {accent.icon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[8px] uppercase tracking-widest font-bold opacity-60 truncate">{getCampaignPositionPromise(option)}</div>
                                                            <div className="font-serif text-base text-white/90 leading-tight truncate">{getCampaignPositionLabel(option)}</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="campaign-meaning-card rounded-3xl border border-white/10 bg-black/50 backdrop-blur-md p-4 md:p-5">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${CAMPAIGN_POSITIONING_ACCENTS[campaignPositioning].tone}`}>
                                            {CAMPAIGN_POSITIONING_ACCENTS[campaignPositioning].icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-[10px] text-amber-500/80 uppercase tracking-[0.3em] font-bold">Campaign Meaning</div>
                                                <div className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${CAMPAIGN_POSITIONING_ACCENTS[campaignPositioning].tone}`}>
                                                    {getCampaignPositionPromise(selectedCampaignPosition)}
                                                </div>
                                            </div>
                                            <div className="font-serif text-2xl text-white/90 mt-2">{getCampaignPositionLabel(selectedCampaignPosition)}</div>
                                            <p className="text-sm text-white/50 leading-relaxed mt-2">{getCampaignPositionDescription(selectedCampaignPosition)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="timeline-selector rounded-3xl border border-white/10 bg-black/45 backdrop-blur-md p-4 md:p-5">
                                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
                                        <div>
                                            <div className="text-[10px] text-amber-500/80 uppercase tracking-[0.3em] font-bold">Campaign Timeline</div>
                                            <p className="text-sm text-white/45 mt-1">{getCampaignTimelineDescription(selectedCampaignTimeline)}</p>
                                        </div>
                                        <div className="text-[9px] uppercase tracking-widest font-bold text-white/45 border border-white/10 rounded-full px-3 py-1 w-fit">
                                            {getCampaignTimelinePromise(selectedCampaignTimeline)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {CAMPAIGN_TIMELINE_OPTIONS.map(option => {
                                            const isSelected = campaignTimeline === option.id;
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => setCampaignTimeline(option.id)}
                                                    className={`min-h-[82px] rounded-2xl border p-3 text-left transition-all ${isSelected ? 'border-amber-400/70 bg-amber-400/10 shadow-[0_0_18px_rgba(245,158,11,0.14)]' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'}`}
                                                >
                                                    <div className={`text-[8px] uppercase tracking-widest font-bold ${isSelected ? 'text-amber-300' : 'text-white/35'}`}>{getCampaignTimelinePromise(option)}</div>
                                                    <div className="font-serif text-base leading-tight text-white/90 mt-1">{getCampaignTimelineShortLabel(option)}</div>
                                                    <div className="text-[11px] leading-snug text-white/40 mt-1 line-clamp-2">{getCampaignTimelineDescription(option)}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-black/45 backdrop-blur-md overflow-hidden">
                                    <div className="p-4 md:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] text-amber-500/80 uppercase tracking-[0.3em] font-bold">Studio Forecast</div>
                                            <p className="text-xs text-white/45 mt-1">Audience reaction can rewrite this after week one.</p>
                                        </div>
                                        <div
                                            className={`forecast-speedometer flex items-center gap-3 rounded-2xl border bg-white/[0.04] px-3 py-2 shadow-[0_0_28px_rgba(0,0,0,0.25)] ${forecastGaugeTone}`}
                                            aria-label={`Studio forecast confidence ${forecastGaugeScore} out of 100, ${forecastGaugeLabel}`}
                                        >
                                            <div className="forecast-gauge-shell relative h-16 w-28 shrink-0">
                                                <svg viewBox="0 0 120 76" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-hidden="true">
                                                    <path
                                                        className="forecast-gauge-track"
                                                        d="M 16 64 A 44 44 0 0 1 104 64"
                                                        pathLength="100"
                                                        fill="none"
                                                        stroke="rgba(255,255,255,0.13)"
                                                        strokeWidth="13"
                                                        strokeLinecap="round"
                                                    />
                                                    <path
                                                        className="forecast-gauge-fill transition-all duration-700 ease-out"
                                                        d="M 16 64 A 44 44 0 0 1 104 64"
                                                        pathLength="100"
                                                        fill="none"
                                                        stroke={forecastGaugeAccent}
                                                        strokeWidth="13"
                                                        strokeLinecap="round"
                                                        strokeDasharray="100"
                                                        strokeDashoffset={forecastGaugeRingOffset}
                                                        style={{ filter: `drop-shadow(0 0 10px ${forecastGaugeAccent}88)` }}
                                                    />
                                                </svg>
                                                <div className="absolute inset-x-0 bottom-0 text-center">
                                                    <div className="font-mono text-xl leading-none text-white">{forecastGaugeScore}</div>
                                                    <div className="mt-1 text-[9px] uppercase tracking-[0.2em] font-black" style={{ color: forecastGaugeAccent }}>
                                                        {forecastGaugeWord}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="min-w-[4.5rem]">
                                                <div className="text-[9px] uppercase tracking-widest font-bold text-white/35">Forecast Read</div>
                                                <div className="font-mono text-lg leading-none text-white/90 mt-1">{forecastGaugeLabel}</div>
                                                <div className="text-[9px] uppercase tracking-widest font-bold text-white/35 mt-1">Market signal</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4">
                                        <div className="p-4 border-r border-b md:border-b-0 border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Opening Weekend</div>
                                            <div className="font-mono text-lg text-white/90 mt-2">
                                                ${formatCampaignMillions(campaignForecast.openingWeekendLow)}M-{formatCampaignMillions(campaignForecast.openingWeekendHigh)}M
                                            </div>
                                        </div>
                                        <div className="p-4 border-r-0 md:border-r border-b md:border-b-0 border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Total Revenue</div>
                                            <div className="font-mono text-lg text-white/90 mt-2">
                                                ${formatCampaignMillions(campaignForecast.totalRevenueLow)}M-{formatCampaignMillions(campaignForecast.totalRevenueHigh)}M
                                            </div>
                                        </div>
                                        <div className="p-4 border-r border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Break-even</div>
                                            <div className="font-mono text-lg text-emerald-300 mt-2">{campaignForecast.breakEvenChance}%</div>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Week-two Drop</div>
                                            <div className="font-mono text-lg text-amber-300 mt-2">{campaignForecast.weekTwoDropRisk}%</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10">
                                        <div className="p-4 border-r border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Streaming Bid</div>
                                            <div className="font-mono text-base text-sky-300 mt-1">+{campaignForecast.streamingBidBoost}%</div>
                                        </div>
                                        <div className="p-4 md:border-r border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Awards</div>
                                            <div className="font-mono text-base text-purple-200 mt-1">{campaignForecast.awardsVisibility}%</div>
                                        </div>
                                        <div className="p-4 border-r border-t md:border-t-0 border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Franchise</div>
                                            <div className="font-mono text-base text-amber-300 mt-1">{campaignForecast.franchiseValueImpact >= 0 ? '+' : ''}{campaignForecast.franchiseValueImpact}%</div>
                                        </div>
                                        <div className="p-4 border-t md:border-t-0 border-white/10">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Launch Reach</div>
                                            <div className={`font-mono text-base mt-1 ${
                                                campaignReachPreview.label === 'LIMITED'
                                                    ? 'text-rose-300'
                                                    : campaignReachPreview.label === 'TARGETED'
                                                        ? 'text-amber-300'
                                                        : 'text-emerald-300'
                                            }`}>
                                                {campaignReachPreview.label === 'LIMITED' ? 'Limited' : campaignReachPreview.label === 'TARGETED' ? 'Targeted' : campaignReachPreview.label === 'WIDE' ? 'Wide' : 'Event'}
                                            </div>
                                        </div>
                                    </div>
                                    {campaignReachPreview.label === 'LIMITED' && (
                                        <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-white/45">
                                            A quiet launch starts with fewer viewers. Exceptional reviews can still create a rare sleeper run through word of mouth.
                                        </div>
                                    )}
                                </div>

                                {musicImpact.score > 0 && (
                                    <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/75">
                                                    <Music2 size={14} /> Soundtrack Impact
                                                </div>
                                                <div className="mt-1 truncate text-sm font-black text-white">{musicImpact.label}</div>
                                            </div>
                                            <div className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                                                musicImpact.mismatchBacklashRisk >= 38 || musicImpact.controversyRisk >= 36
                                                    ? 'border-amber-300/40 bg-amber-400/10 text-amber-200'
                                                    : 'border-cyan-200/40 bg-cyan-300/10 text-cyan-100'
                                            }`}>
                                                Score {musicImpact.score}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Opening</div>
                                                <div className="mt-1 font-mono text-base font-black text-emerald-300">{musicImpact.openingWeekendLiftPct >= 0 ? '+' : ''}{musicImpact.openingWeekendLiftPct}%</div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Trailer</div>
                                                <div className="mt-1 font-mono text-base font-black text-cyan-300">+{musicImpact.trailerStrengthLift}</div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Awards</div>
                                                <div className="mt-1 font-mono text-base font-black text-purple-200">+{musicImpact.awardChanceLift}</div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                                                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">Backlash</div>
                                                <div className={`mt-1 font-mono text-base font-black ${musicImpact.mismatchBacklashRisk >= 38 ? 'text-amber-300' : 'text-zinc-300'}`}>{musicImpact.mismatchBacklashRisk}</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 truncate text-xs font-bold text-zinc-400">
                                            {musicImpact.headline}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] overflow-hidden">
                                    <div className="p-5 md:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] text-amber-500/80 uppercase tracking-[0.3em] font-bold">Marketing Channel Mix</div>
                                            <p className="text-sm text-white/45 mt-1">
                                                Spend from the reserved pool. Unused campaign money returns to the studio wallet when locked.
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Step</div>
                                            <div className="font-mono text-white/80">${(allocationStep / 1000000).toFixed(allocationStep >= 1000000 ? 1 : 2)}M</div>
                                        </div>
                                    </div>

                                    <div className="divide-y divide-white/10">
                                        {MARKETING_CHANNEL_OPTIONS.map(channel => {
                                            const amount = normalizedChannelMix.allocations[channel.id] || 0;
                                            const canIncrease = campaignBudgetRemaining > 0;
                                            const maxForChannel = amount + campaignBudgetRemaining;
                                            const amountInMillions = amount / 1000000;
                                            const amountDisplay = formatCampaignMillions(amount);
                                            const meterFill = legacyCampaignBudgetCap > 0 ? Math.min(4, Math.ceil((amount / legacyCampaignBudgetCap) * 4)) : 0;
                                            return (
                                                <div key={channel.id} className="channel-minimal-row channel-grid-row p-4 md:p-5">
                                                    <div className="grid grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[44px_minmax(0,1fr)_236px] gap-x-3 gap-y-3 items-center">
                                                        <div className="w-11 h-11 rounded-2xl bg-black/40 border border-white/10 text-amber-300 flex items-center justify-center">
                                                            {MARKETING_CHANNEL_ICONS[channel.id]}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-serif text-xl md:text-lg text-white/90 leading-tight">{getMarketingChannelLabel(channel)}</div>
                                                            <div className="text-xs text-white/45 leading-relaxed mt-1">{getMarketingChannelDescription(channel)}</div>
                                                        </div>
                                                        <div className="channel-control-dock channel-control-cluster col-span-2 md:col-span-1 grid grid-cols-[38px_minmax(0,1fr)_38px] gap-2 items-center">
                                                            <button
                                                                onClick={() => updateChannelAllocation(channel.id, -allocationStep)}
                                                                disabled={amount <= 0}
                                                                className="h-10 rounded-xl border border-white/10 bg-black/40 text-white/70 disabled:opacity-25 disabled:cursor-not-allowed"
                                                            >
                                                                -
                                                            </button>
                                                            <label className="channel-input-shell relative block">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35 font-mono">$</span>
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    aria-label={tr('release.campaign.channel.customSpendAria', { channel: getMarketingChannelLabel(channel) })}
                                                                    min={0}
                                                                    max={maxForChannel / 1000000}
                                                                    step={0.05}
                                                                    value={amountDisplay}
                                                                    onChange={(event) => setChannelAllocationAmount(channel.id, Number(event.target.value) * 1000000)}
                                                                    className="channel-amount-input w-full h-10 rounded-xl border border-white/10 bg-black/45 pl-6 pr-7 text-center font-mono tabular-nums text-sm text-white/90 focus:outline-none focus:border-amber-400/60"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35 font-mono">M</span>
                                                            </label>
                                                            <button
                                                                onClick={() => updateChannelAllocation(channel.id, allocationStep)}
                                                                disabled={!canIncrease}
                                                                className="h-10 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 disabled:opacity-25 disabled:cursor-not-allowed"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <div className="channel-mini-meter col-span-2 md:col-start-2 md:col-span-2 flex items-center justify-between gap-3">
                                                            <div className="grid grid-cols-4 gap-1.5 w-28">
                                                                {[0, 1, 2, 3].map(segment => (
                                                                    <button
                                                                        key={segment}
                                                                        onClick={() => setChannelAllocationAmount(channel.id, maxForChannel * ((segment + 1) / 4))}
                                                                        className={`h-2 rounded-full transition-colors ${segment < meterFill ? 'bg-amber-400' : 'bg-white/10 hover:bg-white/20'}`}
                                                                        aria-label={tr('release.campaign.channel.quickAllocationAria', { channel: getMarketingChannelLabel(channel), segment: segment + 1 })}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="text-[8px] uppercase tracking-widest text-white/25 font-bold">
                                                                ${formatCampaignMillions(maxForChannel)}M available
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-2 border-t border-white/10">
                                        <div className="p-5 border-r border-white/10">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Pool Used</div>
                                            <div className="font-mono text-2xl text-amber-300 mt-1">${(totalCampaignCost / 1000000).toFixed(1)}M</div>
                                        </div>
                                        <div className="p-5">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Pool Remaining</div>
                                            <div className="font-mono text-2xl text-emerald-300 mt-1">${(campaignBudgetRemaining / 1000000).toFixed(1)}M</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button onClick={nextStep} className="px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all">
                                        Continue
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Festival Premiere */}
                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-12">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Festivals</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Prestigious debuts for critical acclaim.</p>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => setFestivalPremiere(null)}
                                        className={`w-full p-6 rounded-3xl border transition-all duration-300 text-left ${festivalPremiere === null ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="font-serif text-xl text-white/90 mb-1">{tr('release.festival.skipTitle')}</div>
                                        <p className="text-sm text-white/50">{tr('release.festival.skipDescription')}</p>
                                    </button>

                                    {FESTIVALS.map(fest => {
                                        const weekOfYear = getWeekOfYear(releaseWeek);
                                        const timingMeta = getFestivalTimingMeta(fest.weeks, weekOfYear);
                                        const isTimingRight = timingMeta.isTimingRight;
                                        const canAfford = player.money >= fest.cost;
                                        const projectQualityScore = project.projectDetails?.hiddenStats?.qualityScore || 0;
                                        const displayQualityScore = Math.round(projectQualityScore);
                                        const hasPrestige = projectQualityScore >= fest.prestigeReq;
                                        const isEligible = canAfford && hasPrestige && isTimingRight;

                                        return (
                                            <button
                                                key={fest.id}
                                                disabled={!isEligible}
                                                onClick={() => setFestivalPremiere(fest.id)}
                                                className={`w-full p-6 rounded-3xl border transition-all duration-300 text-left ${festivalPremiere === fest.id ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'} ${!isEligible ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="font-serif text-xl text-white/90 mb-1">{getFestivalName(fest)}</div>
                                                        <p className="text-sm text-white/50 italic">{getFestivalDescription(fest)}</p>
                                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                                                            <Calendar size={12} className="text-amber-400" />
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{tr('release.festival.window')}</span>
                                                            <span className="text-xs font-bold text-white/80">{timingMeta.weekLabel}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-lg text-amber-500/80">${(fest.cost / 1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="flex gap-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">{tr('release.festival.qualityReq')}</span>
                                                        <span className={`text-xs font-bold ${hasPrestige ? 'text-emerald-400' : 'text-rose-400'}`}>{tr('release.festival.qualityScore', { req: fest.prestigeReq, score: displayQualityScore })}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">{tr('release.festival.timing')}</span>
                                                        <span className={`text-xs font-bold ${timingMeta.statusTone}`}>{timingMeta.statusLabel}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button onClick={nextStep} className="px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all">
                                        Continue
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 5: Release Calendar */}
                        {step === 5 && (
                            <motion.div key="step5" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-12">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">{tr('release.calendar.title')}</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">{tr('release.calendar.subtitle')}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(offset => {
                                        const week = player.currentWeek + offset;
                                        const rivals = upcomingRivals.filter(r => r.weekReleased === week);
                                        const isSelected = releaseWeek === week;
                                        const weekOfYear = getWeekOfYear(week);
                                        const season = getSeasonLabel(weekOfYear);
                                        const calendarEvent = CALENDAR_EVENTS.find(e => e.week === weekOfYear);
                                        
                                        return (
                                            <button
                                                key={week}
                                                onClick={() => setReleaseWeek(week)}
                                                className={`group relative w-full p-6 rounded-3xl border transition-all duration-300 text-left overflow-hidden ${isSelected ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-6 right-6">
                                                        <CheckCircle2 className="text-amber-500" size={24} />
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className={`font-serif text-3xl ${isSelected ? 'text-amber-400' : 'text-white/90'}`}>{tr('release.calendar.week', { week })}</div>
                                                    <div className="flex gap-2">
                                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-widest">{season}</span>
                                                        {calendarEvent && (
                                                            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                                                <Calendar size={10} /> {getCalendarEventName(calendarEvent)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{tr('release.calendar.competition')}</div>
                                                    {rivals.length > 0 ? (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {rivals.map(rival => (
                                                                <div key={rival.id} className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-1 h-10 rounded-full ${rival.budgetTier === 'HIGH' ? 'bg-rose-500' : rival.budgetTier === 'MID' ? 'bg-amber-500' : 'bg-white/20'}`}></div>
                                                                        <div>
                                                                            <div className="text-sm font-bold text-white/90">{rival.title}</div>
                                                                            <div className="text-[10px] text-white/40 uppercase tracking-widest">{rival.genre} • {rival.studioId}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${rival.budgetTier === 'HIGH' ? 'text-rose-500' : 'text-white/50'}`}>{rival.budgetTier} Budget</div>
                                                                        <div className="text-[10px] text-white/40 mt-1">Hype: {rival.quality > 80 ? 'Extreme' : 'High'}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="py-4 px-5 rounded-2xl border border-dashed border-white/10 flex items-center gap-3 text-white/40 italic text-sm">
                                                            <TrendingUp size={16} className="text-emerald-500/70" />
                                                            Clear path for a massive opening.
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button onClick={nextStep} className="px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all">
                                        Review
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 6: Confirmation */}
                        {step === 6 && (
                            <motion.div key="step6" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-12">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Finalize</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Review your strategy before locking it in.</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Distribution</div>
                                            <div className="font-serif text-2xl text-white/90">{releaseType === 'THEATRICAL' ? 'Theatrical' : 'Streaming'}</div>
                                        </div>
                                        
                                        {releaseType === 'THEATRICAL' && (
                                            <div className="flex justify-between items-end pb-6 border-b border-white/10 gap-6">
                                                <div>
                                                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Footprint</div>
                                                    <div className="text-[10px] uppercase tracking-widest font-bold text-white/35">
                                                        {normalizedSelectedRegionIds.length} regions · {distributionDealSummary.totalScreens.toLocaleString()} screens
                                                    </div>
                                                </div>
                                                <div className="font-serif text-2xl text-white/90 text-right">{formatDealMoney(distributionDealSummary.studioOpeningLow)}-{formatDealMoney(distributionDealSummary.studioOpeningHigh)}</div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                            <div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Marketing</div>
                                                <div className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold">
                                                    ${((hasReservedMarketingPool ? campaignBudgetRemaining : 0) / 1000000).toFixed(1)}M returns
                                                </div>
                                            </div>
                                            <div className="font-serif text-2xl text-white/90">{activeCampaignChannels.length} Channels</div>
                                        </div>

                                        <div className="flex justify-between items-end pb-6 border-b border-white/10 gap-6">
                                            <div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Campaign Position</div>
                                                <div className="text-[10px] uppercase tracking-widest font-bold text-white/35">{getCampaignPositionPromise(selectedCampaignPosition)}</div>
                                            </div>
                                            <div className="font-serif text-2xl text-white/90 text-right">{getCampaignPositionLabel(selectedCampaignPosition)}</div>
                                        </div>
                                        
                                        {festivalPremiere && (
                                            <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">{tr('release.festival.summaryLabel')}</div>
                                                <div className="font-serif text-2xl text-white/90">{getFestivalName(FESTIVALS.find(f => f.id === festivalPremiere) || FESTIVALS[0])}</div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">{tr('release.calendar.releaseDate')}</div>
                                            <div className="font-serif text-2xl text-white/90">{tr('release.calendar.week', { week: releaseWeek })}</div>
                                        </div>

                                        <div className="flex justify-between items-end pt-4">
                                            <div>
                                                <div className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold mb-1">Campaign Spend</div>
                                                <div className="text-xs text-white/35">{hasReservedMarketingPool ? 'From reserved pool' : 'Legacy cash spend'}</div>
                                            </div>
                                            <div className="font-mono text-4xl font-light text-amber-400">${(totalCampaignCost / 1000000).toFixed(1)}M</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button
                                        onClick={handleComplete}
                                        disabled={!hasReleaseStrategyEnergy}
                                        className={`px-12 py-4 rounded-full font-bold tracking-widest uppercase text-xs transition-all inline-flex items-center gap-2 ${
                                            hasReleaseStrategyEnergy
                                                ? 'bg-amber-500 text-black hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                                : 'bg-white/10 text-white/35 cursor-not-allowed'
                                        }`}
                                    >
                                        <Zap className="w-4 h-4" />
                                        {hasReleaseStrategyEnergy ? `Lock Strategy · ${releaseStrategyEnergyCost}E` : `Need ${releaseStrategyEnergyCost}E`}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
