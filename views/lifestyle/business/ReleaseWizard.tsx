import React, { useState, useMemo } from 'react';
import { Player, PendingEvent, ScreeningStrategy, CampaignItem } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Film, Tv, Calendar, TrendingUp, CheckCircle2, Camera, Star, Globe, Youtube, Share2 } from 'lucide-react';
import { FESTIVALS, CALENDAR_EVENTS } from '../../../services/worldLogic';
import { mergeUniverseRosterWithProject } from '../../../services/universeLogic';
import { getAbsoluteWeek } from '../../../services/legacyLogic';

interface ReleaseWizardProps {
    player: Player;
    studio: any;
    project: any;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
    onComplete: () => void;
    isPostTheatricalBidding?: boolean;
}

const CAMPAIGN_OPTIONS: CampaignItem[] = [
    { id: 'red_carpet', name: 'Red Carpet Premiere', cost: 250000, buzzImpact: 20, description: 'Grand event with press and celebrities.', type: 'PREMIERE' },
    { id: 'exclusive_screening', name: 'Exclusive Celeb Screening', cost: 150000, buzzImpact: 12, description: 'Private screening for A-list influencers.', type: 'EVENT' },
    { id: 'social_ads', name: 'Social Media Blitz', cost: 100000, buzzImpact: 15, description: 'Targeted ads on Instagram, X, and TikTok.', type: 'SOCIAL' },
    { id: 'youtube_trailer', name: 'YouTube Trailer Launch', cost: 50000, buzzImpact: 10, description: 'Promoted trailer on YouTube trending.', type: 'SOCIAL' },
    { id: 'tv_spots', name: 'TV Talk Show Tour', cost: 300000, buzzImpact: 25, description: 'Cast appearances on major late-night shows.', type: 'TV' },
    { id: 'billboards', name: 'Times Square Billboards', cost: 200000, buzzImpact: 18, description: 'Massive physical presence in major cities.', type: 'OTHER' }
];

const SCREENING_STRATEGIES = [
    { id: 'REGIONAL', name: 'Regional Release', screens: 500, cut: 35, description: 'Limited to specific territories. Low risk.' },
    { id: 'NATIONAL', name: 'National Release', screens: 3000, cut: 45, description: 'Full domestic coverage. Standard for major films.' },
    { id: 'INTERNATIONAL', name: 'International Mass', screens: 12000, cut: 55, description: 'Global saturation. Highest potential, highest cut taken.' }
];

const PLATFORMS = [
    { id: 'NETFLIX', name: 'Netflix', baseBid: 12000000, qualityReq: 72, color: '#E50914', maxBudget: 140000000 },
    { id: 'APPLE_TV', name: 'Apple TV+', baseBid: 17000000, qualityReq: 82, color: '#FFFFFF', maxBudget: 180000000 },
    { id: 'DISNEY_PLUS', name: 'Disney+', baseBid: 11000000, qualityReq: 70, color: '#113CCF', maxBudget: 130000000 },
    { id: 'HULU', name: 'Hulu', baseBid: 7500000, qualityReq: 58, color: '#1CE783', maxBudget: 90000000 },
    { id: 'YOUTUBE', name: 'YouTube Premium', baseBid: 3000000, qualityReq: 38, color: '#FF0000', maxBudget: 35000000 }
];

const getStreamingBidProfile = (packageScore: number, isSeries: boolean, isPostTheatricalBidding?: boolean) => {
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
        floor = 1.12;
        ceiling = 2.4;
    } else if (packageScore < 84) {
        floor = 1.35;
        ceiling = 4.5;
    } else if (packageScore < 92) {
        floor = 1.75;
        ceiling = 7;
    } else {
        floor = 2.25;
        ceiling = 9;
    }

    if (isSeries) {
        floor += packageScore < 45 ? 0.04 : 0.08;
        ceiling += packageScore >= 60 ? 0.75 : 0.15;
    }

    if (isPostTheatricalBidding) {
        floor *= packageScore < 45 ? 0.96 : 0.98;
        ceiling *= packageScore >= 72 ? 0.9 : 0.84;
    }

    const capBoost = packageScore >= 92 ? 6 : packageScore >= 84 ? 4.4 : packageScore >= 72 ? 2.8 : packageScore >= 60 ? 1.7 : 1;
    const safetyPremium = packageScore >= 84 ? 2.35 : packageScore >= 72 ? 1.95 : packageScore >= 60 ? 1.55 : packageScore < 45 ? 0.92 : 1.2;

    return {
        floor: Math.max(0.8, floor),
        ceiling: Math.max(floor + 0.08, ceiling),
        capBoost,
        safetyPremium
    };
};

type BidType = 'UPFRONT_ONLY' | 'GREENLIGHT_DEAL' | 'BACKEND_POINTS';

interface Bid {
    id: string;
    platformId: string;
    amount: number;
    type: BidType;
    fundingAmount?: number;
    backendPct?: number;
    bidValue: number;
    timestamp: number;
}

export const ReleaseWizard: React.FC<ReleaseWizardProps> = ({ player, studio, project, onBack, onUpdatePlayer, onComplete, isPostTheatricalBidding }) => {
    const [step, setStep] = useState(isPostTheatricalBidding ? 2 : 1);
    const [releaseType, setReleaseType] = useState<'THEATRICAL' | 'STREAMING_ONLY' | null>(
        isPostTheatricalBidding ? 'STREAMING_ONLY' : (project.projectDetails?.type === 'SERIES' ? 'STREAMING_ONLY' : null)
    );
    const [screeningStrategy, setScreeningStrategy] = useState<ScreeningStrategy | null>(null);
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [festivalPremiere, setFestivalPremiere] = useState<string | null>(null);
    const [releaseWeek, setReleaseWeek] = useState<number>(player.currentWeek + 4); 
    
    // Bidding State
    const [auctionState, setAuctionState] = useState<'IDLE' | 'ACTIVE' | 'FINISHED'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(100);
    const [currentBids, setCurrentBids] = useState<Bid[]>([]);
    const [highestBid, setHighestBid] = useState<Bid | null>(null);
    const [activePlatforms, setActivePlatforms] = useState<string[]>(PLATFORMS.map(p => p.id));

    const isSeries = project.projectDetails?.type === 'SERIES';

    React.useEffect(() => {
        if (auctionState !== 'ACTIVE') return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
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
                        const bidProfile = getStreamingBidProfile(packageScore, isSeries, isPostTheatricalBidding);
                        const fallbackBase = Math.max(
                            5000000,
                            Math.floor(projectBudget * bidProfile.floor)
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
                return prev - 1; // Decreases by 1% every tick
            });

            // AI Bidding Logic
            const hiddenStats = project.projectDetails?.hiddenStats || {};
            const estQuality = hiddenStats.qualityScore || 50;
            const scriptQuality = hiddenStats.scriptQuality || 50;
            const directorQuality = hiddenStats.directorQuality || 50;
            const castingStrength = hiddenStats.castingStrength || 50;
            const rawHype = hiddenStats.rawHype || 50;
            const packageScore = (estQuality * 0.4) + (scriptQuality * 0.2) + (directorQuality * 0.15) + (castingStrength * 0.15) + (rawHype * 0.1);
            const eligiblePlatforms = PLATFORMS.filter(p => packageScore >= p.qualityReq && activePlatforms.includes(p.id));

            if (eligiblePlatforms.length > 0 && Math.random() > 0.8) { // 20% chance per tick to bid
                const platform = eligiblePlatforms[Math.floor(Math.random() * eligiblePlatforms.length)];
                
                // CRITICAL: Don't bid against yourself
                const lastBidderId = currentBids.length > 0 ? currentBids[0].platformId : null;
                if (highestBid?.platformId === platform.id || lastBidderId === platform.id) {
                    return;
                }
                
                const projectBudget = project.projectDetails?.estimatedBudget || 0;
                const bidProfile = getStreamingBidProfile(packageScore, isSeries, isPostTheatricalBidding);
                const safetyPremium = bidProfile.safetyPremium;
                const qualityEscalator = Math.max(0.85, 0.95 + ((packageScore - 55) / 105));
                const floorOffer = projectBudget > 0 ? projectBudget * bidProfile.floor : platform.baseBid;
                const qualityRange = projectBudget > 0
                    ? projectBudget * (bidProfile.floor + ((bidProfile.ceiling - bidProfile.floor) * (0.2 + Math.random() * 0.58)))
                    : platform.baseBid * (0.95 + Math.random() * 0.35) * safetyPremium;
                let maxOffer = Math.min(
                    platform.maxBudget * bidProfile.capBoost,
                    projectBudget > 0 ? projectBudget * bidProfile.ceiling : Number.MAX_SAFE_INTEGER,
                    Math.max(floorOffer * (1.04 + Math.random() * 0.12), platform.baseBid * (packageScore / 52) * (1 + Math.random() * 0.32) * safetyPremium * qualityEscalator, qualityRange)
                );
                
                // RE-BIDDING PENALTY: If they already auctioned, most bids will be lower.
                // 5% chance to be higher, otherwise 70-90% of previous best.
                if (project.previousBestBidValue) {
                    if (Math.random() > 0.05) {
                        maxOffer = Math.min(maxOffer, project.previousBestBidValue * (0.7 + Math.random() * 0.25));
                    }
                }

                const currentHighest = highestBid ? highestBid.bidValue : 0;
                
                if (maxOffer > currentHighest * 1.05) {
                    // They can outbid!
                    const minimumOpeningBid = Math.floor(floorOffer);
                    const newAmount = currentHighest === 0
                        ? Math.floor(Math.min(maxOffer, Math.max(minimumOpeningBid, floorOffer * (0.99 + Math.random() * 0.18), platform.baseBid * (0.95 + Math.random() * 0.3) * safetyPremium)))
                        : Math.floor(Math.min(maxOffer, currentHighest * (1.08 + Math.random() * 0.12)));
                    
                    const rand = Math.random();
                    let type: BidType = 'UPFRONT_ONLY';
                    let fundingAmount = 0;
                    let backendPct = 0;
                    let upfrontAmount = newAmount;
                    
                    if (rand > 0.8) {
                        type = 'GREENLIGHT_DEAL';
                        // Split the total offer: 40% upfront, 60% for next season
                        upfrontAmount = Math.floor(Math.max(minimumOpeningBid, newAmount * 0.45));
                        fundingAmount = newAmount - upfrontAmount;
                    } else if (rand > 0.6) {
                        type = 'BACKEND_POINTS';
                        // Lower upfront for backend points
                        upfrontAmount = Math.floor(Math.max(minimumOpeningBid, newAmount * (isPostTheatricalBidding ? 0.7 : 0.8)));
                        backendPct = Math.floor(Math.random() * (isPostTheatricalBidding ? 6 : 8)) + (isPostTheatricalBidding ? 4 : 6);
                    }
                    
                    const newBid: Bid = {
                        id: Math.random().toString(),
                        platformId: platform.id,
                        amount: upfrontAmount,
                        type,
                        fundingAmount,
                        backendPct,
                        bidValue: newAmount,
                        timestamp: Date.now()
                    };
                    
                    setCurrentBids(prev => [newBid, ...prev].slice(0, 10));
                    setHighestBid(newBid);
                    setTimeLeft(100); // Reset timer
                } else {
                    // Platform drops out
                    if (Math.random() > 0.5) {
                        setActivePlatforms(prev => prev.filter(id => id !== platform.id));
                    }
                }
            }
        }, 150); // Tick every 150ms

        return () => clearInterval(interval);
    }, [auctionState, highestBid, activePlatforms, project.projectDetails?.hiddenStats?.qualityScore]);

    const handleAcceptBid = (bid: Bid | null) => {
        if (!bid) return;

        const updatedPlayer = { ...player };
        
        if (studio) {
            const b = updatedPlayer.businesses.find(b => b.id === studio.id);
            if (b) {
                b.balance += bid.amount;
                b.stats.lifetimeRevenue += bid.amount;
                if (!b.studioState) b.studioState = {} as any;
                const ledger = Array.isArray(b.studioState.financeLedger) ? b.studioState.financeLedger : [];
                b.studioState.financeLedger = [{
                    id: `studio_ledger_bid_${project.id}_${player.age}_${player.currentWeek}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: bid.amount,
                    type: 'STREAMING_DEAL',
                    label: `${project.name} ${PLATFORMS.find(p => p.id === bid.platformId)?.name || 'platform'} deal`,
                    projectId: project.id
                }, ...ledger].slice(0, 40);
                
                // Add funding to studio production fund
                if (bid.fundingAmount) {
                    b.studioState.productionFund = (b.studioState.productionFund || 0) + bid.fundingAmount;
                }
            }
        } else {
            // Add upfront cash to player's money if no studio
            updatedPlayer.money += bid.amount;
            updatedPlayer.finance.history.unshift({
                id: Math.random().toString(),
                week: updatedPlayer.currentWeek,
                year: updatedPlayer.age,
                amount: bid.amount,
                category: 'BUSINESS',
                description: `Streaming Rights: ${project.name} (${PLATFORMS.find(p => p.id === bid.platformId)?.name})`
            });
        }

        // Update platform cash reserve
        if (updatedPlayer.world.platforms && updatedPlayer.world.platforms[bid.platformId as any]) {
            const totalCost = bid.amount + (bid.fundingAmount || 0);
            updatedPlayer.world.platforms[bid.platformId as any].cashReserve -= totalCost;
            updatedPlayer.world.platforms[bid.platformId as any].recentHits += 1;
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
                    hiddenStats: {
                        ...commitment.projectDetails.hiddenStats,
                        platformId: bid.platformId,
                        backendPct: bid.backendPct || 0
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
                    const weeksRemaining = (release.maxTheatricalWeeks || 8) - (release.weeksInTheaters || 0);
                    const waitWeeks = Math.max(1, weeksRemaining + 1);
                    startWeekAbsolute = getAbsoluteWeek(player.age, player.currentWeek) + waitWeeks;
                    startWeek = ((player.currentWeek + waitWeeks - 1) % 52) + 1;
                }

                updatedPlayer.activeReleases[releaseIndex] = {
                    ...release,
                    // Only switch phase if not theatrical, otherwise gameLoop will handle the transition
                    distributionPhase: isStillTheatrical ? 'THEATRICAL' : 'STREAMING',
                    streamingRevenue: (release.streamingRevenue || 0) + bid.amount,
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
                        hiddenStats: {
                            ...release.projectDetails.hiddenStats,
                            platformId: bid.platformId
                        }
                    }
                };
            }
        }

        onUpdatePlayer(updatedPlayer);
        
        if (isPostTheatricalBidding) {
            onComplete();
        } else {
            setStep(3); // Move to Campaign step
        }
    };

    const totalCampaignCost = useMemo(() => {
        return selectedCampaigns.reduce((sum, id) => {
            const item = CAMPAIGN_OPTIONS.find(c => c.id === id);
            return sum + (item?.cost || 0);
        }, 0);
    }, [selectedCampaigns]);

    const getWeekOfYear = (week: number) => ((week - 1) % 52) + 1;
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
        const updatedPlayer = { ...player };
        let totalCost = totalCampaignCost;

        if (festivalPremiere) {
            const fest = FESTIVALS.find(f => f.id === festivalPremiere);
            if (fest) totalCost += fest.cost;
        }

        updatedPlayer.money -= totalCost;
        updatedPlayer.finance.history.unshift({
            id: Math.random().toString(),
            week: updatedPlayer.currentWeek,
            year: updatedPlayer.age,
            amount: -totalCost,
            category: 'BUSINESS',
            description: `Release Campaign: ${project.name}`
        });

        if (selectedCampaigns.includes('red_carpet')) {
            const premiereEvent: PendingEvent = {
                id: `premiere_${project.id}`,
                week: player.currentWeek,
                type: 'PREMIERE',
                title: `${project.name} Premiere`,
                description: `The grand red carpet premiere for your latest film, ${project.name}.`,
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
                    releaseStrategy: releaseType as any,
                    screeningStrategy: screeningStrategy as any,
                    campaignItems: selectedCampaigns,
                    totalCampaignSpend: totalCampaignCost,
                    releaseDate: releaseWeek,
                    hiddenStats: {
                        ...commitment.projectDetails.hiddenStats,
                        redCarpetHype: selectedCampaigns.includes('red_carpet') ? 20 : 0,
                        festivalPremiere: festivalPremiere || undefined
                    }
                } : undefined
            };
        }

        // Update Universe Stats if applicable
        if (project.projectDetails?.universeId) {
            const universeId = project.projectDetails.universeId;
            if (updatedPlayer.world.universes[universeId]) {
                const universe = updatedPlayer.world.universes[universeId];
                const quality = project.projectDetails.hiddenStats?.qualityScore || 50;
                const updatedUniverse = mergeUniverseRosterWithProject(
                    universe,
                    project.name,
                    project.projectDetails.castList,
                    player.name
                );
                
                // Increase Brand Power and Momentum
                updatedUniverse.brandPower += Math.floor(quality / 20);
                updatedUniverse.momentum += Math.floor(quality / 10);
                updatedPlayer.world.universes[universeId] = updatedUniverse;
            }
        }

        onUpdatePlayer(updatedPlayer);
        onComplete();
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => {
        if (step === 2 && isPostTheatricalBidding) {
            onBack();
        } else {
            setStep(step - 1);
        }
    };

    const handleBack = () => {
        if (highestBid) {
            // Save bid progress to prevent exploits
            const updatedPlayer = { ...player };
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
            if (found) onUpdatePlayer(updatedPlayer);
        }
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
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="font-serif text-2xl tracking-tight text-white/90">Release Strategy</h1>
                        <p className="text-[10px] text-amber-500/80 font-bold tracking-[0.2em] uppercase">{project.name}</p>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    {!isPostTheatricalBidding && Array.from({ length: 6 }, (_, i) => i + 1).map(s => (
                        <div key={s} className={`w-8 h-1 rounded-full transition-all duration-500 ${s === step ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : s < step ? 'bg-white/40' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-3xl mx-auto py-8">
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
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Scale</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Choose your distribution scale and partner cinemas.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {SCREENING_STRATEGIES.map(strategy => (
                                        <button 
                                            key={strategy.id}
                                            onClick={() => setScreeningStrategy(strategy.id)}
                                            className={`group relative p-6 rounded-3xl border transition-all duration-500 text-left overflow-hidden ${screeningStrategy === strategy.id ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                        >
                                            <div className="relative z-10 flex justify-between items-center">
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-colors ${screeningStrategy === strategy.id ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-black/50 border-white/10 text-white/50'}`}>
                                                        <Globe size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-serif text-xl text-white/90 mb-1">{strategy.name}</div>
                                                        <p className="text-sm text-white/50">{strategy.description}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-light text-white/90">{strategy.screens.toLocaleString()}</div>
                                                    <div className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold">Screens</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button disabled={!screeningStrategy} onClick={nextStep} className="px-12 py-4 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all disabled:opacity-30 disabled:hover:scale-100">
                                        Continue
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Platform Bidding (Streaming) */}
                        {step === 2 && releaseType === 'STREAMING_ONLY' && (
                            <motion.div key="step2s" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="space-y-8">
                                <div className="text-center space-y-4">
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">The War Room</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Streaming platforms are bidding for your project.</p>
                                </div>

                                {auctionState === 'IDLE' && (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-8">
                                        <div className="text-center max-w-md">
                                            <p className="text-white/70 mb-6">Open the floor to streaming platforms. They will bid based on the estimated quality and genre of your project.</p>
                                            <button onClick={() => setAuctionState('ACTIVE')} className="px-12 py-4 bg-blue-500 text-white rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                                Start Bidding War
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {auctionState !== 'IDLE' && (
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
                                                            <div className="inline-block mt-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                                                                + ${(highestBid.fundingAmount! / 1000000).toFixed(1)}M Next Season Fund
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
                                                    disabled={!highestBid} 
                                                    onClick={() => handleAcceptBid(highestBid)} 
                                                    className={`px-12 py-4 rounded-full font-bold tracking-widest uppercase text-xs transition-all ${highestBid ? 'bg-amber-500 text-black hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                                                >
                                                    {auctionState === 'FINISHED' ? 'Accept Winning Bid' : 'Slam the Gavel'}
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
                                                                {bid.type === 'GREENLIGHT_DEAL' && <div className="text-[9px] text-emerald-500/80 uppercase tracking-widest">+ Fund</div>}
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
                                    <p className="text-lg text-white/50 font-light tracking-wide">Build buzz and anticipation.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {CAMPAIGN_OPTIONS.map(option => {
                                        const isSelected = selectedCampaigns.includes(option.id);
                                        return (
                                            <button 
                                                key={option.id}
                                                onClick={() => {
                                                    if (isSelected) setSelectedCampaigns(selectedCampaigns.filter(id => id !== option.id));
                                                    else setSelectedCampaigns([...selectedCampaigns, option.id]);
                                                }}
                                                className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[160px] ${isSelected ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <div className="flex justify-between items-start w-full">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isSelected ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-black/50 border-white/10 text-white/50'}`}>
                                                        {option.id === 'red_carpet' ? <Camera size={16} /> : 
                                                         option.id === 'exclusive_screening' ? <Star size={16} /> :
                                                         option.id === 'social_ads' ? <Share2 size={16} /> :
                                                         option.id === 'youtube_trailer' ? <Youtube size={16} /> :
                                                         <Tv size={16} />}
                                                    </div>
                                                    <div className="font-mono text-sm text-white/70">${(option.cost / 1000).toFixed(0)}k</div>
                                                </div>
                                                <div className="text-left mt-4">
                                                    <div className="font-serif text-lg text-white/90 mb-1">{option.name}</div>
                                                    <div className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold">+{option.buzzImpact} Buzz</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between items-center p-6 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                                    <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Total Spend</span>
                                    <span className="text-2xl font-light text-white/90">${(totalCampaignCost / 1000).toFixed(0)}k</span>
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
                                        <div className="font-serif text-xl text-white/90 mb-1">Skip Festivals</div>
                                        <p className="text-sm text-white/50">Go straight to general release.</p>
                                    </button>

                                    {FESTIVALS.map(fest => {
                                        const weekOfYear = getWeekOfYear(releaseWeek);
                                        const timingMeta = getFestivalTimingMeta(fest.weeks, weekOfYear);
                                        const isTimingRight = timingMeta.isTimingRight;
                                        const canAfford = player.money >= fest.cost;
                                        const hasPrestige = (project.projectDetails?.hiddenStats?.qualityScore || 0) >= fest.prestigeReq;
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
                                                        <div className="font-serif text-xl text-white/90 mb-1">{fest.name}</div>
                                                        <p className="text-sm text-white/50 italic">{fest.description}</p>
                                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                                                            <Calendar size={12} className="text-amber-400" />
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Festival Window</span>
                                                            <span className="text-xs font-bold text-white/80">{timingMeta.weekLabel}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-lg text-amber-500/80">${(fest.cost / 1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="flex gap-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Quality Req</span>
                                                        <span className={`text-xs font-bold ${hasPrestige ? 'text-emerald-400' : 'text-rose-400'}`}>{fest.prestigeReq} (Yours: {project.projectDetails?.hiddenStats?.qualityScore || 0})</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Timing</span>
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
                                    <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white/90">Calendar</h2>
                                    <p className="text-lg text-white/50 font-light tracking-wide">Select your opening weekend.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(offset => {
                                        const week = player.currentWeek + offset;
                                        const rivals = upcomingRivals.filter(r => r.weekReleased === week);
                                        const isSelected = releaseWeek === week;
                                        const weekOfYear = getWeekOfYear(week);
                                        const season = weekOfYear <= 13 ? 'Spring' : weekOfYear <= 26 ? 'Summer' : weekOfYear <= 39 ? 'Fall' : 'Winter';
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
                                                    <div className={`font-serif text-3xl ${isSelected ? 'text-amber-400' : 'text-white/90'}`}>Week {week}</div>
                                                    <div className="flex gap-2">
                                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-widest">{season}</span>
                                                        {calendarEvent && (
                                                            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                                                <Calendar size={10} /> {calendarEvent.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Box Office Competition</div>
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
                                            <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Scale</div>
                                                <div className="font-serif text-2xl text-white/90">{SCREENING_STRATEGIES.find(s => s.id === screeningStrategy)?.name}</div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Marketing</div>
                                            <div className="font-serif text-2xl text-white/90">{selectedCampaigns.length} Campaigns</div>
                                        </div>
                                        
                                        {festivalPremiere && (
                                            <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Festival</div>
                                                <div className="font-serif text-2xl text-white/90">{FESTIVALS.find(f => f.id === festivalPremiere)?.name}</div>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-end pb-6 border-b border-white/10">
                                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Release Date</div>
                                            <div className="font-serif text-2xl text-white/90">Week {releaseWeek}</div>
                                        </div>

                                        <div className="flex justify-between items-end pt-4">
                                            <div className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold mb-1">Total Investment</div>
                                            <div className="font-mono text-4xl font-light text-amber-400">${(totalCampaignCost / 1000).toFixed(0)}k</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button onClick={prevStep} className="px-8 py-4 text-white/50 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase">Back</button>
                                    <button onClick={handleComplete} className="px-12 py-4 bg-amber-500 text-black rounded-full font-bold tracking-widest uppercase text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                        Lock Strategy
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
