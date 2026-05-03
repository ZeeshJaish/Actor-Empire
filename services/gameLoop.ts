
import { Player, Commitment, ActiveRelease, StreamingState, LogEntry, NegotiationData, ActorSkills, Application, AuditionOpportunity, ProjectDetails, ScheduledEvent, TransactionCategory, Transaction, YearlyFinance, Message, IndustryProject, TeamMember, Business, InstaPost, XPost, WriterStats, DirectorStats, PlatformId, LegalCase, LifeEvent, RoleType, FamilyObligation, FuturePotential, PlayerReturnStatus, SponsorshipCategory, SponsorshipOffer } from '../types';
import { PROPERTY_CATALOG, BUSINESS_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from './lifestyleLogic';
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
    calculateAuditionGain,
    calculateProductionGain,
    calculatePassiveGain,
    getBoxOfficeCaps
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
    generateCancellationNews
} from './newsLogic';
import { generateWeeklyEvent } from './geminiService';
import { generateLifeEvent, generateLegalHearing, generateLuxeLifeEvent, hasEligibleLuxeEventTarget } from './lifeEventLogic';
import { generateWeeklyFeed, NPC_DATABASE, calculateProjectFameMultiplier, generateNewUnknowns, updateNPCLives } from './npcLogic';
import { generateAgentOffers, generateManagerOffer, generateDirectOffer, getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists } from './teamLogic';
import { processStockMarket, calculatePortfolioValue, getDividendPayout, initializeStocks } from './stockLogic';
import { AWARD_CALENDAR, checkAwardEligibility, AwardDefinition, generateSeasonWinners, generateFullBallot } from './awardLogic';
import { processWorldTurn, generateIndustryProject } from './worldLogic'; 
import { generateFamousMovieOpportunity, generateCameoOffer } from './famousMovieLogic'; 
import { calculateYoutubeCreatorScore, generateYoutubeBrandDeal, generateYoutubeCollabOffer, getYoutubePublicImageLabel, processYoutubeChannel } from './youtubeLogic';
import { getInstagramPostComments, pickInstagramMicroBrand } from './instagramLogic';
import { checkForDirectorDecision, checkForProductionCrisis } from './productionService';
import { processBusinessWeek } from './businessLogic';
import { getAbsoluteWeek, getRelationshipAge, inferStreamingStartWeekAbsolute } from './legacyLogic';
import { hasNoAds, resetWeeklyEnergy, spendPlayerEnergy } from './premiumLogic';
import { advanceLuxeConnections, advanceTinderConnections } from './datingLogic';
import { generateNpcVentureRoleOffer, getNpcVentureOfferText } from './npcVentureLogic';

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

const HIGH_FATALITY_GENRES = new Set(['ACTION', 'THRILLER', 'SCI_FI', 'SUPERHERO', 'ADVENTURE']);

const getReturnStatusForContinuation = (
    rel: ActiveRelease,
    player: Player,
    isPlayerProduction: boolean,
    isUniverseContracted: boolean
): { getsOffer: boolean; status: PlayerReturnStatus; note: string } => {
    if (isPlayerProduction || isUniverseContracted) {
        return {
            getsOffer: true,
            status: 'RETURNING',
            note: rel.type === 'SERIES'
                ? 'The continuation keeps your character in the center of the story.'
                : 'The sequel keeps you on the call sheet.'
        };
    }

    const baseReturnChanceByRole: Record<RoleType, number> = {
        LEAD: 88,
        SUPPORTING: 66,
        ENSEMBLE: 54,
        CAMEO: 34,
        MINOR: 22,
    };
    const role = rel.roleType || 'SUPPORTING';
    const performanceBonus = rel.productionPerformance >= 85 ? 10 : rel.productionPerformance >= 70 ? 5 : rel.productionPerformance <= 40 ? -10 : 0;
    const ratingBonus = (rel.imdbRating || 5) >= 8 ? 8 : (rel.imdbRating || 5) >= 7 ? 4 : (rel.imdbRating || 5) < 5.8 ? -10 : 0;
    const fameBonus = player.stats.fame >= 80 ? 6 : player.stats.fame >= 60 ? 3 : 0;
    const returnChance = Math.max(8, Math.min(96, baseReturnChanceByRole[role] + performanceBonus + ratingBonus + fameBonus));
    const getsOffer = Math.random() * 100 < returnChance;

    if (getsOffer) {
        return {
            getsOffer: true,
            status: 'RETURNING',
            note: rel.type === 'SERIES'
                ? 'The network wants your character back for the next season.'
                : 'The studio wants your character back for the follow-up film.'
        };
    }

    const lethalChance = HIGH_FATALITY_GENRES.has(rel.projectDetails.genre) ? 0.55 : 0.18;
    const status: PlayerReturnStatus = Math.random() < lethalChance ? 'KILLED_OFF' : 'WRITTEN_OFF';
    const note = status === 'KILLED_OFF'
        ? (rel.type === 'SERIES'
            ? 'The renewed season continues without your character after an off-screen death.'
            : 'The sequel moves forward after your character is killed off.')
        : (rel.type === 'SERIES'
            ? 'The renewed season continues without your character.'
            : 'The sequel moves forward after your character is written out.');

    return { getsOffer: false, status, note };
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

const ensureFiniteNumber = (value: any, fallback = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const ensureObjectArray = <T extends Record<string, any>>(value: any): T[] => {
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as T[] : [];
};

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

    if (runStrength < 0.65) {
        floor *= packageScore < 45 ? 0.96 : 0.98;
        ceiling *= 0.84;
    } else if (runStrength > 1.25) {
        floor *= 1 + Math.min(0.18, (runStrength - 1.25) * 0.08);
        ceiling *= 1 + Math.min(0.45, (runStrength - 1.25) * 0.12);
    }

    return {
        floor: Math.max(0.8, floor),
        ceiling: Math.max(floor + 0.08, ceiling)
    };
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

const getNextWeekNumber = (week: number): number => week >= 52 ? 1 : week + 1;

const createYoutubeLegalCase = (
    player: Player,
    title: string,
    description: string,
    evidenceStrength: number,
    playerDefense: number
): LegalCase => ({
    id: `yt_case_${Date.now()}_${Math.random()}`,
    title,
    description,
    weeksRemaining: 0,
    severity: evidenceStrength >= 70 ? 'HIGH' : evidenceStrength >= 50 ? 'MEDIUM' : 'LOW',
    evidence: evidenceStrength,
    currentHearing: 1,
    totalHearings: 2 + Math.floor(Math.random() * 2),
    nextHearingWeek: getNextWeekNumber(player.currentWeek),
    evidenceStrength,
    playerDefense,
    status: 'ACTIVE',
    history: []
});

export const createYoutubeCopyrightEvent = (
    videoTitle: string,
    claimAmount: number,
    evidenceStrength: number
): ScheduledEvent => ({
    id: `yt_copyright_event_${Date.now()}_${Math.random()}`,
    week: 0,
    type: 'LEGAL_HEARING',
    title: 'YouTube Copyright Claim',
    data: {
        lifeEvent: {
            id: `yt_copyright_life_${Date.now()}_${Math.random()}`,
            type: 'LEGAL',
            title: 'Copyright Claim',
            description: `"${videoTitle}" has been hit with a copyright claim. You can accept the claim, quietly edit the upload, or dispute it and risk a court case.`,
            options: [
                {
                    label: 'Accept Claim',
                    description: 'Pay the claim and move on. Safest, but it costs money and trust.',
                    impact: (p: Player) => {
                        p.money -= claimAmount;
                        p.youtube.audienceTrust = Math.max(0, (p.youtube.audienceTrust ?? 55) - 2);
                        p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 2);
                        return { updatedPlayer: p, log: `You accepted the copyright claim and paid $${claimAmount.toLocaleString()}.` };
                    }
                },
                {
                    label: 'Risky Dispute',
                    description: 'Can clear your name, but losing creates a legal case.',
                    impact: (p: Player) => {
                        const defenseScore = (p.stats.reputation * 0.45) + ((p.youtube.audienceTrust ?? 55) * 0.35) + Math.random() * 35;
                        if (defenseScore > evidenceStrength + 18) {
                            p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 4);
                            p.stats.reputation = Math.min(100, p.stats.reputation + 2);
                            return { updatedPlayer: p, log: 'You disputed the claim and won. Fans praised you for standing up for the channel.' };
                        }

                        if (!p.flags.activeCases) p.flags.activeCases = [];
                        p.flags.activeCases.push(createYoutubeLegalCase(
                            p,
                            'YouTube Copyright Dispute',
                            `A copyright holder escalated the claim around "${videoTitle}".`,
                            evidenceStrength,
                            Math.floor(defenseScore)
                        ));
                        p.youtube.controversy = Math.min(100, (p.youtube.controversy ?? 0) + 8);
                        p.news.unshift({
                            id: `news_yt_copyright_case_${Date.now()}`,
                            headline: `${p.name} faces a copyright dispute over a YouTube upload.`,
                            subtext: 'The creator side of fame just got legally messy.',
                            category: 'YOU',
                            week: p.currentWeek,
                            year: p.age,
                            impactLevel: 'MEDIUM'
                        });
                        p.news = p.news.slice(0, 50);
                        return { updatedPlayer: p, log: 'The dispute escalated into a legal case. A hearing has been scheduled.' };
                    }
                },
                {
                    label: 'Golden Legal Team (Watch Ad)',
                    isGolden: true,
                    description: 'Safest route. Clear the claim with platform lawyers and keep the channel clean.',
                    impact: (p: Player) => {
                        const video = p.youtube.videos.find(v => v.title === videoTitle);
                        if (video) {
                            const recoveredViews = Math.floor(Math.max(750, video.views * 0.08));
                            video.views += recoveredViews;
                            video.likes += Math.floor(recoveredViews * 0.05);
                            video.comments = ['The claim was handled professionally.', ...(video.comments || [])].slice(0, 5);
                        }
                        p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 5);
                        p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 2);
                        p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 10);
                        p.stats.reputation = Math.min(100, p.stats.reputation + 2);
                        return { updatedPlayer: p, log: 'Your legal team cleared the copyright claim before it damaged the channel.' };
                    }
                }
            ]
        } as LifeEvent
    }
});

export const createYoutubeBacklashEvent = (
    videoTitle: string,
    severity: number
): ScheduledEvent => ({
    id: `yt_backlash_event_${Date.now()}_${Math.random()}`,
    week: 0,
    type: 'SCANDAL',
    title: 'YouTube Backlash',
    data: {
        lifeEvent: {
            id: `yt_backlash_life_${Date.now()}_${Math.random()}`,
            type: 'SCANDAL',
            title: 'Creator Backlash',
            description: `The comments around "${videoTitle}" are turning ugly. Fans want a response before this becomes bigger than the video.`,
            options: [
                {
                    label: 'Post Apology Video',
                    description: 'Costs pride, restores trust, lowers heat.',
                    impact: (p: Player) => {
                        p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 7);
                        p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 3);
                        p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 12);
                        p.stats.reputation = Math.min(100, p.stats.reputation + 1);
                        return { updatedPlayer: p, log: 'You posted a grounded apology. The heat cooled before it became a career fire.' };
                    }
                },
                {
                    label: 'Crisis PR Team (Watch Ad)',
                    isGolden: true,
                    description: 'Safest route. Turn the outrage into accountability, trust, and controlled buzz.',
                    impact: (p: Player) => {
                        const recoveryViews = Math.floor(Math.max(1200, p.youtube.subscribers * (0.05 + Math.random() * 0.08)));
                        const video = p.youtube.videos.find(v => v.title === videoTitle);
                        if (video) {
                            video.views += recoveryViews;
                            video.likes += Math.floor(recoveryViews * 0.06);
                            video.comments = ['This response actually felt mature.', ...(video.comments || [])].slice(0, 5);
                        }
                        p.youtube.totalChannelViews += recoveryViews;
                        p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 9);
                        p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 5);
                        p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 16);
                        p.stats.reputation = Math.min(100, p.stats.reputation + 3);
                        return { updatedPlayer: p, log: `Your PR team turned the backlash into a mature comeback and recovered ${recoveryViews.toLocaleString()} views.` };
                    }
                },
                {
                    label: 'Double Down',
                    description: 'Riskier response. Can spike views, but severe backlash can become legal.',
                    impact: (p: Player) => {
                        const spikeViews = Math.floor(Math.max(1000, p.youtube.subscribers * (0.08 + Math.random() * 0.14)));
                        const video = p.youtube.videos.find(v => v.title === videoTitle);
                        if (video) {
                            video.views += spikeViews;
                            video.likes += Math.floor(spikeViews * 0.035);
                            video.comments = ['This response made everything louder.', ...(video.comments || [])].slice(0, 5);
                        }
                        p.youtube.totalChannelViews += spikeViews;
                        p.youtube.fanMood = Math.max(0, (p.youtube.fanMood ?? 55) - 2);
                        p.youtube.audienceTrust = Math.max(0, (p.youtube.audienceTrust ?? 55) - 8);
                        p.youtube.controversy = Math.min(100, (p.youtube.controversy ?? 0) + 15);
                        p.stats.fame = Math.min(100, p.stats.fame + 1);

                        if (severity >= 72 || Math.random() < 0.25) {
                            if (!p.flags.activeCases) p.flags.activeCases = [];
                            p.flags.activeCases.push(createYoutubeLegalCase(
                                p,
                                'Creator Backlash Defamation Case',
                                `A public response to backlash around "${videoTitle}" triggered a legal complaint.`,
                                55 + Math.floor(Math.random() * 25),
                                Math.floor((p.stats.reputation * 0.35) + Math.random() * 30)
                            ));
                            return { updatedPlayer: p, log: `You doubled down and gained views, but the backlash escalated into a legal complaint.` };
                        }

                        return { updatedPlayer: p, log: `You doubled down and gained ${spikeViews.toLocaleString()} extra views, but trust took a hit.` };
                    }
                }
            ]
        } as LifeEvent
    }
});

export const createYoutubeCreatorInviteEvent = (
    player: Player,
    kind: 'PODCAST' | 'CREATOR_GALA' | 'PLATFORM_SUMMIT'
): ScheduledEvent => {
    const eventCopy: Record<typeof kind, { title: string; description: string; venue: string }> = {
        PODCAST: {
            title: 'Podcast Invite',
            venue: 'The Hot Seat Podcast',
            description: `${player.name} is invited onto a major creator podcast. One honest answer can build trust, but one messy clip can travel everywhere.`
        },
        CREATOR_GALA: {
            title: 'Creator Gala',
            venue: 'Creator Awards Afterparty',
            description: `${player.name} gets an invite to a private creator gala where brands, streamers, and celebrities trade favors off-camera.`
        },
        PLATFORM_SUMMIT: {
            title: 'Platform Summit',
            venue: 'YouTube Creator Summit',
            description: `YouTube wants ${player.name} at a closed-door creator summit. It is polished, powerful, and full of people who can change the channel's ceiling.`
        }
    };
    const copy = eventCopy[kind];

    return {
        id: `yt_creator_invite_${kind}_${Date.now()}_${Math.random()}`,
        week: 0,
        type: 'LIFE_EVENT',
        title: copy.title,
        data: {
            lifeEvent: {
                id: `yt_creator_life_${kind}_${Date.now()}_${Math.random()}`,
                type: kind === 'PODCAST' ? 'NETWORKING' : 'LIFE',
                title: copy.title,
                description: copy.description,
                options: [
                    {
                        label: kind === 'PODCAST' ? 'Give A Real Interview' : 'Work The Room',
                        description: 'Build trust and reputation with a steady creator move.',
                        impact: (p: Player) => {
                            p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 6);
                            p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 4);
                            p.stats.reputation = Math.min(100, p.stats.reputation + 3);
                            p.x.followers += kind === 'PLATFORM_SUMMIT' ? 12000 : 6000;
                            return { updatedPlayer: p, log: `${copy.venue} turned into a clean creator reputation win.` };
                        }
                    },
                    {
                        label: kind === 'PODCAST' ? 'Chase The Viral Clip' : 'Make A Loud Entrance',
                        description: 'More fame and views, but more heat.',
                        impact: (p: Player) => {
                            const bonusViews = Math.floor(Math.max(15000, p.youtube.subscribers * (0.18 + Math.random() * 0.25)));
                            p.youtube.totalChannelViews += bonusViews;
                            p.youtube.subscribers += Math.floor(bonusViews / 120);
                            p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 5);
                            p.youtube.controversy = Math.min(100, (p.youtube.controversy ?? 0) + 12);
                            p.youtube.audienceTrust = Math.max(0, (p.youtube.audienceTrust ?? 55) - 4);
                            p.stats.fame = Math.min(100, p.stats.fame + 3);
                            p.x.followers += Math.floor(bonusViews * 0.02);
                            return { updatedPlayer: p, log: `${copy.venue} gave you a viral creator spike: +${bonusViews.toLocaleString()} channel views.` };
                        }
                    },
                    {
                        label: 'Golden Handler (Watch Ad)',
                        isGolden: true,
                        description: 'Best route. Your team scripts the moment, protects your image, and captures the upside.',
                        impact: (p: Player) => {
                            const bonusViews = Math.floor(Math.max(22000, p.youtube.subscribers * (0.22 + Math.random() * 0.25)));
                            p.youtube.totalChannelViews += bonusViews;
                            p.youtube.subscribers += Math.floor(bonusViews / 95);
                            p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 8);
                            p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 6);
                            p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 8);
                            p.stats.reputation = Math.min(100, p.stats.reputation + 4);
                            p.x.followers += Math.floor(bonusViews * 0.025);
                            return { updatedPlayer: p, log: `Your team turned ${copy.venue} into a controlled creator win: +${bonusViews.toLocaleString()} views and stronger trust.` };
                        }
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

const createCreatorRivalPost = (content: string, reach: number, rivalName: string): XPost => ({
    id: `x_yt_rival_${Date.now()}_${Math.random()}`,
    authorId: `rival_${rivalName.toLowerCase().replace(/\s+/g, '_')}`,
    authorName: rivalName,
    authorHandle: `@${rivalName.toLowerCase().replace(/\s+/g, '')}`,
    authorAvatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${encodeURIComponent(rivalName)}`,
    content,
    timestamp: Date.now(),
    likes: Math.max(80, Math.floor(reach * 0.05)),
    retweets: Math.max(10, Math.floor(reach * 0.012)),
    replies: Math.max(8, Math.floor(reach * 0.01)),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true
});

export const createYoutubeRivalryEvent = (player: Player): ScheduledEvent => {
    const rivalName = YOUTUBE_RIVAL_NAMES[Math.floor(Math.random() * YOUTUBE_RIVAL_NAMES.length)];
    const creatorScore = calculateYoutubeCreatorScore(player);
    const publicImage = getYoutubePublicImageLabel(player);
    const baseReach = Math.max(25000, player.youtube.subscribers * (0.25 + Math.random() * 0.35));
    const topic = player.youtube.creatorIdentity === 'CONTROVERSY_MAGNET' || publicImage === 'Volatile'
        ? 'called your channel manufactured chaos'
        : player.youtube.creatorIdentity === 'PRESTIGE_FILMMAKER'
            ? 'said your creator era is too polished to be real'
            : 'accused you of copying their creator lane';

    return {
        id: `yt_rivalry_${Date.now()}_${Math.random()}`,
        week: 0,
        type: 'SCANDAL',
        title: 'Creator Rivalry',
        data: {
            lifeEvent: {
                id: `yt_rivalry_life_${Date.now()}_${Math.random()}`,
                type: 'SCANDAL',
                title: `${rivalName} Starts Creator Drama`,
                description: `${rivalName} just ${topic}. The clip is moving across X and YouTube comments. This can become a growth moment, a messy feud, or a surprisingly valuable bridge.`,
                options: [
                    {
                        label: 'Ignore The Bait',
                        description: 'Avoid drama, protect trust, but lose a little momentum.',
                        impact: (p: Player) => {
                            p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 3);
                            p.youtube.fanMood = Math.max(0, (p.youtube.fanMood ?? 55) - 1);
                            p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 5);
                            p.x.feed.unshift(createCreatorRivalPost(`${p.name} refusing to feed the ${rivalName} drama is... annoyingly mature.`, baseReach, 'Creator Watch'));
                            p.x.feed = p.x.feed.slice(0, 50);
                            return { updatedPlayer: p, log: `You ignored ${rivalName}'s bait. The channel stayed cleaner.` };
                        }
                    },
                    {
                        label: 'Clap Back Publicly',
                        description: 'Fast views and fame, but more heat and sponsor risk.',
                        impact: (p: Player) => {
                            const bonusViews = Math.floor(baseReach * (0.65 + Math.random() * 0.55));
                            const bonusSubs = Math.floor(bonusViews / 110);
                            p.youtube.totalChannelViews += bonusViews;
                            p.youtube.subscribers += bonusSubs;
                            p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 5);
                            p.youtube.audienceTrust = Math.max(0, (p.youtube.audienceTrust ?? 55) - 6);
                            p.youtube.controversy = Math.min(100, (p.youtube.controversy ?? 0) + 16);
                            p.stats.fame = Math.min(100, p.stats.fame + 2);
                            p.stats.reputation = Math.max(0, p.stats.reputation - 2);
                            p.x.followers += Math.floor(bonusViews * 0.015);
                            p.x.feed.unshift(createCreatorRivalPost(`${p.name} just answered ${rivalName} and the timeline is on fire.`, bonusViews, 'Creator Watch'));
                            p.x.feed = p.x.feed.slice(0, 50);
                            return { updatedPlayer: p, log: `You clapped back at ${rivalName}: +${bonusViews.toLocaleString()} views and +${bonusSubs.toLocaleString()} subs, but heat rose.` };
                        }
                    },
                    {
                        label: 'Golden Mediated Collab (Watch Ad)',
                        isGolden: true,
                        description: 'Best route. A mediator turns the feud into a controlled collab without the messy downside.',
                        impact: (p: Player) => {
                            const trust = p.youtube.audienceTrust ?? 55;
                            const bonusViews = Math.floor(baseReach * (0.85 + Math.random() * 0.75));
                            p.youtube.totalChannelViews += bonusViews;
                            p.youtube.subscribers += Math.floor(bonusViews / 90);
                            p.youtube.audienceTrust = Math.min(100, trust + 8);
                            p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 8);
                            p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 12);
                            p.stats.reputation = Math.min(100, p.stats.reputation + 5);
                            p.x.feed.unshift(createCreatorRivalPost(`${p.name} and ${rivalName} turned beef into a polished collab. That is career control.`, bonusViews, 'Creator Watch'));
                            p.x.feed = p.x.feed.slice(0, 50);
                            return { updatedPlayer: p, log: `You turned ${rivalName}'s feud into a controlled hit collab. The industry noticed.` };
                        }
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

// Returns updated player AND a flag if an ad should be triggered
export const processGameWeek = async (player: Player): Promise<{ player: Player, triggerAd: boolean }> => {
    let nextPlayer = JSON.parse(JSON.stringify(player)) as Player;
    let triggerAd = false;
    
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
    if (!Array.isArray(nextPlayer.world.famousMoviesReleased)) nextPlayer.world.famousMoviesReleased = [];
    if (!Array.isArray(nextPlayer.world.awardHistory)) nextPlayer.world.awardHistory = [];
    if (!Array.isArray(nextPlayer.world.upcomingRivals)) nextPlayer.world.upcomingRivals = [];
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
    if (!Array.isArray(nextPlayer.flags.extraNPCs)) nextPlayer.flags.extraNPCs = [];
    if (!Array.isArray(nextPlayer.flags.youtubeMilestonesUnlocked)) nextPlayer.flags.youtubeMilestonesUnlocked = [];
    if (!nextPlayer.team) nextPlayer.team = { availableAgents: [], availableManagers: [], availableTrainers: [], availableStylists: [], availableTherapists: [], availablePublicists: [] } as any;
    if (!Array.isArray(nextPlayer.team.availableAgents)) nextPlayer.team.availableAgents = [];
    if (!Array.isArray(nextPlayer.team.availableManagers)) nextPlayer.team.availableManagers = [];
    if (!Array.isArray(nextPlayer.team.availableTrainers)) nextPlayer.team.availableTrainers = [];
    if (!Array.isArray(nextPlayer.team.availableStylists)) nextPlayer.team.availableStylists = [];
    if (!Array.isArray(nextPlayer.team.availableTherapists)) nextPlayer.team.availableTherapists = [];
    if (!Array.isArray(nextPlayer.team.availablePublicists)) nextPlayer.team.availablePublicists = [];
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
                reviews: ensureObjectArray(commitment.projectDetails.reviews)
            }
            : commitment.projectDetails
    }) as Commitment);
    nextPlayer.activeReleases = ensureObjectArray<ActiveRelease>(nextPlayer.activeReleases).map(release => ({
        ...release,
        roleType: getPlayerProjectRoleType(release.roleType, release.projectDetails?.castList),
        weekNum: ensureFiniteNumber(release.weekNum, 1),
        weeklyGross: Array.isArray(release.weeklyGross) ? release.weeklyGross.map(gross => ensureFiniteNumber(gross)).filter(gross => gross >= 0) : [],
        totalGross: ensureFiniteNumber(release.totalGross),
        budget: ensureFiniteNumber(release.budget),
        imdbRating: release.imdbRating === undefined ? undefined : ensureFiniteNumber(release.imdbRating),
        productionPerformance: ensureFiniteNumber(release.productionPerformance, 50),
        sequelDecisionWeek: release.sequelDecisionWeek === undefined ? undefined : ensureFiniteNumber(release.sequelDecisionWeek),
        promotionalBuzz: ensureFiniteNumber(release.promotionalBuzz),
        streamingRevenue: ensureFiniteNumber(release.streamingRevenue),
        royaltyPercentage: release.royaltyPercentage === undefined ? undefined : ensureFiniteNumber(release.royaltyPercentage),
        studioRoyaltyPercentage: release.studioRoyaltyPercentage === undefined ? undefined : ensureFiniteNumber(release.studioRoyaltyPercentage),
        maxTheatricalWeeks: release.maxTheatricalWeeks === undefined ? undefined : ensureFiniteNumber(release.maxTheatricalWeeks),
        projectDetails: release.projectDetails && typeof release.projectDetails === 'object'
            ? {
                ...release.projectDetails,
                hiddenStats: {
                    ...(release.projectDetails.hiddenStats || {})
                },
                castList: ensureObjectArray(release.projectDetails.castList),
                reviews: ensureObjectArray(release.projectDetails.reviews)
            }
            : {
                hiddenStats: {},
                castList: [],
                reviews: []
            } as any,
        streaming: release.streaming && typeof release.streaming === 'object'
            ? {
                ...release.streaming,
                weekOnPlatform: ensureFiniteNumber(release.streaming.weekOnPlatform, 1),
                totalViews: ensureFiniteNumber(release.streaming.totalViews),
                weeklyViews: Array.isArray(release.streaming.weeklyViews) ? release.streaming.weeklyViews.map(views => ensureFiniteNumber(views)).filter(views => views >= 0) : [],
                ...(typeof inferStreamingStartWeekAbsolute(release.streaming, nextPlayer.age, nextPlayer.currentWeek) === 'number'
                    ? { startWeekAbsolute: inferStreamingStartWeekAbsolute(release.streaming, nextPlayer.age, nextPlayer.currentWeek) }
                    : {})
            }
            : release.streaming,
        bids: ensureObjectArray(release.bids).map(bid => ({
            ...bid,
            platformId: bid.platformId,
            upfront: ensureFiniteNumber(bid.upfront),
            royalty: ensureFiniteNumber(bid.royalty),
            duration: ensureFiniteNumber(bid.duration, 52)
        }))
    }) as ActiveRelease);
    nextPlayer.pastProjects = ensureObjectArray(nextPlayer.pastProjects);
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
    nextPlayer.news = ensureObjectArray(nextPlayer.news);
    nextPlayer.relationships = ensureObjectArray(nextPlayer.relationships);
    nextPlayer.scheduledEvents = ensureObjectArray<ScheduledEvent>(nextPlayer.scheduledEvents).map(event => ({
        ...event,
        week: ensureFiniteNumber(event.week, nextPlayer.currentWeek),
        data: event.data && typeof event.data === 'object' ? event.data : {}
    }));
    nextPlayer.awards = ensureObjectArray(nextPlayer.awards);
    nextPlayer.logs = ensureObjectArray(nextPlayer.logs);
    nextPlayer.pendingEvents = ensureObjectArray<ScheduledEvent>(nextPlayer.pendingEvents)
        .map(event => ({
            ...event,
            week: ensureFiniteNumber(event.week, nextPlayer.currentWeek),
            data: event.data && typeof event.data === 'object' ? event.data : {}
        }))
        .filter(event => typeof event.id === 'string' && typeof event.type === 'string');
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
            valuation: ensureFiniteNumber((business as any).stats?.valuation)
        },
        studioState: business.type === 'PRODUCTION_HOUSE' && business.studioState && typeof business.studioState === 'object'
            ? {
                ...business.studioState,
                talentRoster: ensureObjectArray(business.studioState.talentRoster),
                activeProjects: ensureObjectArray((business.studioState as any).activeProjects),
                library: ensureObjectArray((business.studioState as any).library),
                bids: ensureObjectArray((business.studioState as any).bids),
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

    // --- DEBT CHECK ---
    if (nextPlayer.money < 0) {
        const currentDebtWeeks = nextPlayer.flags.weeksInDebt || 0;
        nextPlayer.flags.weeksInDebt = currentDebtWeeks + 1;
    } else {
        nextPlayer.flags.weeksInDebt = 0;
    }

    const logsToAdd: {msg: string, type: 'positive'|'negative'|'neutral'}[] = [];

    // --- 0.5 INBOX MAINTENANCE ---
    nextPlayer.inbox = nextPlayer.inbox.filter(msg => {
        if (msg.expiresIn !== undefined) {
            msg.expiresIn -= 1;
            if (msg.expiresIn <= 0) {
                logsToAdd.push({ msg: `⚠️ Offer expired: "${msg.subject}"`, type: 'neutral' });
                return false; 
            }
        }
        return true;
    });
    
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

    // --- 0.6 CHECK FOR SCHEDULED EVENTS ---
    const eventsToday = nextPlayer.scheduledEvents.filter(e => e.week === nextPlayer.currentWeek);
    if (eventsToday.length > 0) {
        nextPlayer.scheduledEvents = nextPlayer.scheduledEvents.filter(e => e.week !== nextPlayer.currentWeek);
        eventsToday.forEach(eventToday => {
            if (eventToday.type === 'AWARD_CEREMONY') {
                const nominations = eventToday.data?.nominations || [];
                if (nominations.length > 0) {
                    nextPlayer.pendingEvent = eventToday;
                    logsToAdd.push({ msg: `📅 Today is the day: ${eventToday.title}. Good luck!`, type: 'neutral' });
                } else {
                    logsToAdd.push({ msg: `📺 ${eventToday.title} is airing tonight. You are watching from home.`, type: 'neutral' });
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

    // --- 1. WORLD & INDUSTRY UPDATE ---
    try {
        const worldResult = processWorldTurn(nextPlayer);
        nextPlayer.world = worldResult.world;
        nextPlayer.news = [...worldResult.news, ...nextPlayer.news].slice(0, 50);
        if (worldResult.logs?.length) {
            worldResult.logs.forEach(message => logsToAdd.push({ msg: `🏢 ${message}`, type: 'neutral' }));
        }

        Object.values(nextPlayer.world.universes || {}).forEach((universe: any) => {
            if (!universe?.studioId) return;
            const weeklyUniverseRevenue = ensureFiniteNumber(universe.stats?.weeklyRevenue);
            if (weeklyUniverseRevenue <= 0) return;

            const ownerStudio = nextPlayer.businesses?.find(b => b.id === universe.studioId);
            if (!ownerStudio) return;

            ownerStudio.balance += weeklyUniverseRevenue;
            ownerStudio.stats.weeklyRevenue += weeklyUniverseRevenue;
            ownerStudio.stats.weeklyProfit += weeklyUniverseRevenue;
            ownerStudio.stats.lifetimeRevenue += weeklyUniverseRevenue;
            appendStudioLedgerEntry(ownerStudio, {
                id: `studio_ledger_universe_${universe.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                amount: weeklyUniverseRevenue,
                type: 'UNIVERSE',
                label: `${universe.name} merch & licensing`
            });
        });
    } catch (error) {
        console.error('World turn failed during week processing:', error);
    }

    // --- 2. STOCK MARKET UPDATE ---
    const marketUpdate = processStockMarket(nextPlayer.stocks, nextPlayer.currentWeek);
    nextPlayer.stocks = marketUpdate.stocks;
    
    // Calculate Dividends
    const dividends = getDividendPayout(nextPlayer.portfolio, nextPlayer.stocks, nextPlayer.currentWeek);
    if (dividends > 0) {
        addTransaction(dividends, 'DIVIDEND', 'Stock Dividends');
        logsToAdd.push({ msg: `💰 Stock Dividends Received: $${dividends.toLocaleString()}`, type: 'positive' });
    }

    // --- 3. YOUTUBE & TALENT SIMULATION ---
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
            addTransaction(Math.floor(ytResult.weeklyRevenue), 'BUSINESS', 'YouTube Ad Revenue');
            if (ytResult.weeklyRevenue > 100) {
                logsToAdd.push({ msg: `▶️ YouTube Earnings: $${Math.floor(ytResult.weeklyRevenue).toLocaleString()}`, type: 'positive' });
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
                addTransaction(memberRevenue, 'BUSINESS', 'YouTube Memberships');
                nextPlayer.youtube.lifetimeEarnings += memberRevenue;
                if (memberRevenue >= 500) {
                    logsToAdd.push({ msg: `💎 YouTube Members paid $${memberRevenue.toLocaleString()} this week.`, type: 'positive' });
                }
            }
        }

        const unlockedMilestones = nextPlayer.flags.youtubeMilestonesUnlocked as string[];
        const youtubeMilestones = [
            {
                id: 'subs_10000',
                reached: nextPlayer.youtube.subscribers >= 10000,
                title: '10K Creator Breakout',
                headline: `${nextPlayer.name} crosses 10K YouTube subscribers.`,
                reward: () => {
                    nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 1);
                    nextPlayer.youtube.fanMood = Math.min(100, (nextPlayer.youtube.fanMood ?? 55) + 4);
                }
            },
            {
                id: 'views_1000000',
                reached: nextPlayer.youtube.totalChannelViews >= 1000000,
                title: 'Million View Channel',
                headline: `${nextPlayer.name}'s channel passes 1M total views.`,
                reward: () => {
                    nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 2);
                    nextPlayer.youtube.audienceTrust = Math.min(100, (nextPlayer.youtube.audienceTrust ?? 55) + 4);
                }
            },
            {
                id: 'subs_100000',
                reached: nextPlayer.youtube.subscribers >= 100000,
                title: 'Silver Play Button',
                headline: `${nextPlayer.name} earns a Silver Play Button.`,
                reward: () => {
                    nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 3);
                    nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 3);
                    nextPlayer.youtube.fanMood = Math.min(100, (nextPlayer.youtube.fanMood ?? 55) + 8);
                }
            },
            {
                id: 'subs_1000000',
                reached: nextPlayer.youtube.subscribers >= 1000000,
                title: 'Gold Play Button',
                headline: `${nextPlayer.name} becomes a million-subscriber creator.`,
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
            nextPlayer.inbox.unshift({
                id: `yt_milestone_${milestone.id}_${Date.now()}`,
                sender: 'YouTube Creator Awards',
                subject: milestone.title,
                text: `${milestone.headline}\n\nThe channel is no longer just a side hustle. Fans, brands, and the industry are paying attention.`,
                type: 'SYSTEM',
                isRead: false,
                weekSent: nextPlayer.currentWeek,
                expiresIn: 8
            });
            nextPlayer.news.unshift({
                id: `news_yt_milestone_${milestone.id}_${Date.now()}`,
                headline: milestone.headline,
                subtext: 'The creator career is becoming part of the public image.',
                category: 'YOU',
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                impactLevel: milestone.id.includes('1000000') || milestone.id.includes('100000') ? 'HIGH' : 'MEDIUM'
            });
            logsToAdd.push({ msg: `🏆 YouTube Milestone: ${milestone.title}.`, type: 'positive' });
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
            logsToAdd.push({ msg: `📩 YouTube Invite: A creator-world event is waiting for your response.`, type: 'positive' });
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
            const title = pickedVideo.title || 'your latest upload';

            if (microRoll < 0.24) {
                const bonusViews = Math.min(180, baseViews + Math.floor(Math.random() * 35));
                const bonusSubs = subscriberCount < 35
                    ? (Math.random() < 0.7 ? 1 : 0)
                    : Math.min(8, Math.max(1, Math.floor(bonusViews / 28)));
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.08));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [`Small channel gang found this one.`, `This deserves more views.`, ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 2);
                logsToAdd.push({ msg: `💬 Small Channel Moment: "${title}" picked up ${bonusViews.toLocaleString()} extra views${bonusSubs > 0 ? ` and ${bonusSubs} new sub${bonusSubs === 1 ? '' : 's'}` : ''}.`, type: 'positive' });
            } else if (microRoll < 0.42) {
                const bonusViews = Math.min(140, Math.max(8, Math.floor(baseViews * 0.9)));
                const bonusSubs = subscriberCount >= 75 ? Math.min(6, Math.max(1, Math.floor(bonusViews / 34))) : (Math.random() < 0.45 ? 1 : 0);
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.06));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [`A tiny creator reposted this to friends.`, ...(pickedVideo.comments || [])].slice(0, 5);
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
                        content: `Tiny channel find: "${title}" by ${nextPlayer.name}. Low views, but the idea is solid.`,
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
                logsToAdd.push({ msg: `🔁 Tiny Share: A small creator circle passed around "${title}" for ${bonusViews.toLocaleString()} extra views${bonusSubs > 0 ? ` and ${bonusSubs} sub${bonusSubs === 1 ? '' : 's'}` : ''}.`, type: 'positive' });
            } else if (microRoll < 0.58) {
                const bonusViews = Math.min(220, Math.max(15, Math.floor(baseViews * (1.2 + Math.random() * 0.5))));
                const bonusSubs = Math.min(10, Math.max(1, Math.floor(bonusViews / 30)));
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(2, Math.floor(bonusViews * 0.09));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [`Someone clipped the best part.`, `The short version sold me on the full video.`, ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 3);
                logsToAdd.push({ msg: `✂️ Clip Lift: A short clip from "${title}" brought in ${bonusViews.toLocaleString()} views and ${bonusSubs} new sub${bonusSubs === 1 ? '' : 's'}.`, type: 'positive' });
            } else if (microRoll < 0.72) {
                const bonusViews = Math.min(110, Math.max(10, Math.floor(baseViews * 0.75)));
                const bonusSubs = Math.random() < 0.65 ? Math.min(4, Math.max(1, Math.floor(bonusViews / 40))) : 0;
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.07));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [`The thumbnail actually made me click.`, `Title and thumbnail are getting better.`, ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.audienceTrust = Math.min(100, audienceTrust + 2);
                logsToAdd.push({ msg: `🖼️ Better Packaging: Viewers clicked "${title}" a little more, adding ${bonusViews.toLocaleString()} views${bonusSubs > 0 ? ` and ${bonusSubs} subs` : ''}.`, type: 'positive' });
            } else if (microRoll < 0.86) {
                const bonusViews = Math.min(90, Math.max(8, Math.floor(baseViews * 0.6)));
                const bonusSubs = Math.random() < 0.5 ? 1 : 0;
                pickedVideo.views = ensureFiniteNumber(pickedVideo.views, 0) + bonusViews;
                pickedVideo.likes = ensureFiniteNumber(pickedVideo.likes, 0) + Math.max(1, Math.floor(bonusViews * 0.05));
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [`I saw you upload consistently. Subscribed.`, ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.youtube.subscribers += bonusSubs;
                nextPlayer.youtube.totalChannelViews += bonusViews;
                nextPlayer.youtube.fanMood = Math.min(100, fanMood + 1);
                logsToAdd.push({ msg: `📅 Consistency Noticed: A few repeat viewers came back to "${title}" for ${bonusViews.toLocaleString()} more views${bonusSubs > 0 ? ' and 1 loyal sub' : ''}.`, type: 'positive' });
            } else {
                const lostSubs = subscriberCount > 8 && Math.random() < 0.45 ? Math.min(2, Math.floor(subscriberCount * 0.04)) : 0;
                nextPlayer.youtube.subscribers = Math.max(0, nextPlayer.youtube.subscribers - lostSubs);
                nextPlayer.youtube.audienceTrust = Math.max(0, audienceTrust - 1);
                nextPlayer.youtube.fanMood = Math.max(0, fanMood - 1);
                pickedVideo.comments = [`The pacing feels a little rough, but keep going.`, ...(pickedVideo.comments || [])].slice(0, 5);
                logsToAdd.push({ msg: `📝 Early Feedback: A few viewers bounced from "${title}"${lostSubs > 0 ? ` and ${lostSubs} unsubscribed` : ', but the channel learned what to improve'}.`, type: lostSubs > 0 ? 'negative' : 'neutral' });
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

            if (quality >= 78 && fanMood >= 45 && eventRoll < 0.34 + Math.min(0.12, fanMood / 500) + identityTuning.viralBoost) {
                const bonusViews = Math.max(50, Math.floor(subscriberBase * (0.16 + Math.random() * 0.24)));
                const bonusSubs = Math.max(1, Math.floor(bonusViews / 120));
                pickedVideo.views += bonusViews;
                pickedVideo.likes += Math.floor(bonusViews * 0.06);
                pickedVideo.weeklyHistory = [...(pickedVideo.weeklyHistory || []), bonusViews];
                pickedVideo.comments = [`This clip is suddenly everywhere.`, `The algorithm finally found this one.`, ...(pickedVideo.comments || [])].slice(0, 5);
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
                    content: `${nextPlayer.name}'s "${pickedVideo.title}" clip is everywhere today. This is the kind of creator moment brands chase.`,
                    timestamp: Date.now(),
                    likes: Math.floor(bonusViews * 0.04),
                    retweets: Math.floor(bonusViews * 0.01),
                    replies: Math.floor(bonusViews * 0.006),
                    isPlayer: false,
                    isLiked: false,
                    isRetweeted: false,
                    isVerified: true
                });
                logsToAdd.push({ msg: `▶️ Viral Clip: "${pickedVideo.title}" caught a second wave and gained ${bonusSubs.toLocaleString()} subscribers.`, type: 'positive' });
            } else if (nextPlayer.youtube.isMonetized && audienceTrust >= 50 && eventRoll < 0.56) {
                const payout = Math.floor(Math.max(500, nextPlayer.youtube.subscribers * (0.04 + Math.random() * 0.08)));
                addTransaction(payout, 'BUSINESS', 'YouTube Creator Bonus');
                nextPlayer.youtube.lifetimeEarnings += payout;
                nextPlayer.youtube.audienceTrust = Math.min(100, audienceTrust + 2);
                nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 1);
                nextPlayer.inbox.unshift({
                    id: `yt_bonus_${Date.now()}`,
                    sender: 'YouTube Creator Support',
                    subject: 'Creator Bonus Released',
                    text: `Your channel performance triggered a creator bonus payout of $${payout.toLocaleString()}. Keep the upload rhythm strong.`,
                    type: 'SYSTEM',
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: 4
                });
                logsToAdd.push({ msg: `💸 YouTube Creator Bonus: $${payout.toLocaleString()} landed in your account.`, type: 'positive' });
            } else if (eventRoll < backlashThreshold) {
                const lostSubs = Math.max(1, Math.floor(subscriberBase * (0.015 + Math.random() * 0.025)));
                nextPlayer.youtube.subscribers = Math.max(0, nextPlayer.youtube.subscribers - lostSubs);
                nextPlayer.youtube.audienceTrust = Math.max(0, audienceTrust - 5);
                nextPlayer.youtube.fanMood = Math.max(0, fanMood - 6);
                nextPlayer.youtube.controversy = Math.min(100, controversy + 9);
                pickedVideo.comments = [`This feels different from the old channel.`, `The comments are fighting today.`, ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 2);
                if (subscriberBase >= 10000) {
                    nextPlayer.news.unshift({
                        id: `news_yt_backlash_${Date.now()}`,
                        headline: `${nextPlayer.name}'s latest upload splits the internet.`,
                        subtext: 'Some viewers call it bold. Others say the channel is trying too hard.',
                        category: 'YOU',
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        impactLevel: 'LOW'
                    });
                }
                logsToAdd.push({ msg: `📉 YouTube Backlash: "${pickedVideo.title}" lost you ${lostSubs.toLocaleString()} subscribers.`, type: 'negative' });
                if (subscriberBase >= 10000 || controversy >= 60) {
                    nextPlayer.pendingEvents.push(createYoutubeBacklashEvent(pickedVideo.title, controversy + ensureFiniteNumber(pickedVideo.controversyScore, 0)));
                }
            } else {
                const claim = Math.floor(Math.max(150, ensureFiniteNumber(pickedVideo.earnings, 0) * 0.3 + Math.random() * 500));
                pickedVideo.earnings = Math.max(0, ensureFiniteNumber(pickedVideo.earnings, 0) - claim);
                nextPlayer.youtube.audienceTrust = Math.max(0, audienceTrust - 2);
                pickedVideo.comments = [`Wait, did this get claimed?`, ...(pickedVideo.comments || [])].slice(0, 5);
                nextPlayer.pendingEvents.push(createYoutubeCopyrightEvent(pickedVideo.title, claim, 45 + Math.floor(Math.random() * 35)));
                logsToAdd.push({ msg: `⚠️ Copyright Claim: "${pickedVideo.title}" needs your response.`, type: 'negative' });
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
                const celebrityPool = NPC_DATABASE.filter(npc => npc.tier === 'A_LIST' || npc.tier === 'ICON' || npc.occupation === 'DIRECTOR');
                const celebrity = celebrityPool[Math.floor(Math.random() * celebrityPool.length)] || NPC_DATABASE[0];
                const bonusLikes = Math.max(20, Math.min(1800, Math.floor((pickedPost.likes || 10) * (0.4 + Math.random() * 0.9))));
                followerGain = Math.max(4, Math.min(180, Math.floor(bonusLikes * 0.09)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + 1;
                pickedPost.commentList = [`${celebrity.name}: This is clean.`, ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3))].slice(0, 8);
                nextPlayer.instagram.fanLoyalty = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.fanLoyalty, 45) + 2);
                nextPlayer.instagram.feed.unshift({
                    id: `ig_celebrity_like_${Date.now()}_${Math.random()}`,
                    authorId: 'social_spotter',
                    authorName: 'Social Spotter',
                    authorHandle: '@socialspotter',
                    authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=SocialSpotter',
                    type: 'INDUSTRY_NEWS',
                    caption: `${celebrity.name} liked ${nextPlayer.name}'s post. The tiny notification that starts a whole fan theory.`,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    likes: 900 + Math.floor(Math.random() * 2200),
                    comments: 35 + Math.floor(Math.random() * 90),
                    shares: 20 + Math.floor(Math.random() * 70),
                    saves: 12 + Math.floor(Math.random() * 45),
                    commentList: getInstagramPostComments('INDUSTRY_NEWS', 5),
                    isPlayer: false
                });
                if (celebrity.tier === 'A_LIST' || celebrity.tier === 'ICON') {
                    nextPlayer.news.unshift({
                        id: `news_ig_celebrity_notice_${Date.now()}`,
                        headline: `${celebrity.name} noticed ${nextPlayer.name} on Instagram.`,
                        subtext: 'A small social signal is getting screenshots in fan circles and casting group chats.',
                        category: 'YOU',
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        impactLevel: 'LOW'
                    });
                }
                message = `🌟 Instagram Notice: ${celebrity.name} liked your post. +${followerGain} followers.`;
            } else if (eventRoll < 0.38) {
                const bonusLikes = Math.max(8, Math.min(900, Math.floor((pickedPost.likes || 10) * (0.35 + Math.random() * 0.55))));
                followerGain = Math.max(1, Math.min(90, Math.floor(bonusLikes * 0.08)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + Math.max(1, Math.floor(bonusLikes * 0.05));
                pickedPost.shares = ensureFiniteNumber(pickedPost.shares, 0) + Math.max(1, Math.floor(bonusLikes * 0.04));
                pickedPost.commentList = [`A small fan page reposted this.`, ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3))].slice(0, 7);
                nextPlayer.instagram.fanLoyalty = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.fanLoyalty, 45) + 2);
                message = `📸 Instagram Fan Page: One of your posts got reposted and gained ${bonusLikes.toLocaleString()} likes plus ${followerGain} followers.`;
            } else if (eventRoll < 0.56) {
                const bonusLikes = Math.max(12, Math.min(1200, Math.floor((pickedPost.likes || 10) * (0.45 + Math.random() * 0.75))));
                followerGain = Math.max(2, Math.min(120, Math.floor(bonusLikes * 0.07)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.saves = ensureFiniteNumber(pickedPost.saves, 0) + Math.max(2, Math.floor(bonusLikes * 0.08));
                pickedPost.commentList = [`This belongs on a mood board.`, ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3))].slice(0, 7);
                nextPlayer.instagram.aesthetic = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.aesthetic, 50) + 2);
                nextPlayer.instagram.fashionInfluence = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.fashionInfluence, 10) + 1);
                message = `✨ Instagram Aesthetic Lift: Your post got saved around mood boards, adding ${bonusLikes.toLocaleString()} likes and ${followerGain} followers.`;
            } else if (eventRoll < 0.74) {
                const bonusLikes = Math.max(6, Math.min(600, Math.floor((pickedPost.likes || 10) * 0.3)));
                followerGain = Math.max(1, Math.min(60, Math.floor(bonusLikes * 0.05)));
                pickedPost.likes = ensureFiniteNumber(pickedPost.likes, 0) + bonusLikes;
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + Math.max(1, Math.floor(bonusLikes * 0.07));
                pickedPost.commentList = [`This feels more real than the usual celebrity feed.`, ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3))].slice(0, 7);
                nextPlayer.instagram.authenticity = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.authenticity, 55) + 2);
                message = `🤳 Relatable Moment: Followers liked the more human side of your feed. +${followerGain} followers.`;
            } else if (pickedPost.type === 'CONTROVERSIAL' || ensureFiniteNumber(nextPlayer.instagram.controversy, 0) > 40) {
                const lostFollowers = Math.max(1, Math.min(80, Math.floor(instagramFollowers * (0.01 + Math.random() * 0.025))));
                pickedPost.comments = ensureFiniteNumber(pickedPost.comments, 0) + Math.max(3, Math.floor(lostFollowers * 0.5));
                pickedPost.commentList = [`This is getting messy in the comments.`, ...(pickedPost.commentList || getInstagramPostComments('CONTROVERSIAL', 3))].slice(0, 7);
                nextPlayer.instagram.followers = Math.max(0, instagramFollowers - lostFollowers);
                nextPlayer.stats.followers = Math.max(0, ensureFiniteNumber(nextPlayer.stats.followers, 0) - lostFollowers);
                nextPlayer.instagram.controversy = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.controversy, 0) + 3);
                type = 'negative';
                message = `⚠️ Instagram Comment Fire: A messy post cost you ${lostFollowers} followers.`;
            } else {
                pickedPost.commentList = [`A few people noticed the consistency.`, ...(pickedPost.commentList || getInstagramPostComments(pickedPost.type, 3))].slice(0, 7);
                nextPlayer.instagram.authenticity = Math.min(100, ensureFiniteNumber(nextPlayer.instagram.authenticity, 55) + 1);
                type = 'neutral';
                message = `📱 Instagram Pulse: Your feed stayed active and a few regulars kept engaging.`;
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
                const offer = generateDirectOffer(nextPlayer);
                if (offer) {
                    nextPlayer.inbox.unshift({
                        id: `ig_referral_offer_${Date.now()}_${Math.random()}`,
                        sender: 'Casting Director',
                        subject: `Referral Follow-Up: ${offer.projectName}`,
                        text: `${referral.npcName || 'A celebrity connection'} mentioned you might be a strong fit. We'd like to talk about this role.`,
                        type: 'OFFER_ROLE',
                        data: offer,
                        isRead: false,
                        weekSent: nextPlayer.currentWeek,
                        expiresIn: 4
                    });
                    logsToAdd.push({ msg: `📩 Instagram Referral: ${referral.npcName || 'A connection'}'s DM turned into a project offer.`, type: 'positive' });
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

                const npcName = npcLookup[npcId]?.name || payload.brandHandle || payload.brandName || 'someone';
                const isReferral = message.action.kind === 'IG_REFERRAL';
                logsToAdd.push({
                    msg: isReferral
                        ? `📵 Instagram Seen: You left ${npcName}'s referral DM unanswered.`
                        : `📵 Instagram Seen: You missed a campaign DM from ${npcName}.`,
                    type: isReferral ? 'neutral' : 'negative'
                });
                if (isReferral && Math.random() < 0.45) {
                    nextPlayer.news.unshift({
                        id: `news_ig_seen_${Date.now()}_${Math.random()}`,
                        headline: `${nextPlayer.name} reportedly left ${npcName}'s movie DM on seen.`,
                        subtext: 'The internet turned a missed reply into a tiny industry mystery.',
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
                const followUpText = `No worries, timing matters. I'll move this one along.`;
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
                    bio: `${brand.vibe} brand scouting creators on Instagram.`,
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
                    ...(nextPlayer.pastProjects || []).slice(-5).map(project => ensureFiniteNumber(project.budget, 0))
                ];
                const recentProjectEarnings = [
                    ...(nextPlayer.commitments || []).map(commitment => Math.max(ensureFiniteNumber(commitment.income, 0) * 8, ensureFiniteNumber(commitment.lumpSum, 0))),
                    ...(nextPlayer.pastProjects || []).slice(-5).map(project => ensureFiniteNumber(project.earnings, 0))
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
                    description: `A micro Instagram campaign from ${brand.handle} built around your feed style.`,
                    expiresIn: 3,
                    weeksCompleted: 0
                };
                state.chatHistory = [
                    ...(state.chatHistory || []),
                    {
                        sender: 'NPC',
                        text: `Hey ${nextPlayer.name}, we like your feed. ${brand.name} wants a ${durationWeeks}-week IG campaign: $${weeklyPay.toLocaleString()}/week, ${totalRequired} posts total, 8 energy each. Reply within 3 weeks. If you accept, check your Team app to complete the contract.`,
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
                logsToAdd.push({ msg: `📱 Instagram DM: ${brand.handle} sent a $${weeklyPay.toLocaleString()}/week campaign offer.`, type: 'positive' });
            } else {
                const npcPool = NPC_DATABASE.filter(npc => npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED' || npc.occupation === 'DIRECTOR');
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
                const projectHint = nextPlayer.stats.fame >= 35 ? 'a studio project' : 'an indie project';
                const referralWeeks = 2 + Math.floor(Math.random() * 2);
                state.chatHistory = [
                    ...(state.chatHistory || []),
                    {
                        sender: 'NPC',
                        text: `Hey. I heard a casting director asking around for a solid fit on ${projectHint}. I mentioned your name. If you want me to keep the door open, reply within 3 weeks. If you accept, they may reach out in ${referralWeeks}-${referralWeeks + 1} weeks.`,
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
                    caption: `A few quiet referrals are moving around town this week. Sometimes one DM changes a call sheet.`,
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    likes: 1200 + Math.floor(Math.random() * 1800),
                    comments: 60 + Math.floor(Math.random() * 80),
                    shares: 30 + Math.floor(Math.random() * 60),
                    saves: 18 + Math.floor(Math.random() * 35),
                    commentList: getInstagramPostComments('INDUSTRY_NEWS', 5),
                    isPlayer: false
                });
                logsToAdd.push({ msg: `📱 Instagram DM: ${npc.name} hinted at a possible casting referral.`, type: 'positive' });

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
        const channelIsVisible = nextPlayer.youtube.subscribers >= 20000 || nextPlayer.youtube.totalChannelViews >= 250000;

        if (channelIsVisible && currentAbs - lastRippleAbs >= 10 && Math.random() < 0.22) {
            nextPlayer.flags.lastYoutubeImageRippleAbsWeek = currentAbs;

            if (creatorScore >= 78 && publicImage !== 'Volatile') {
                nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 2);
                nextPlayer.stats.fame = Math.min(100, nextPlayer.stats.fame + 1);
                nextPlayer.news.unshift({
                    id: `news_yt_image_good_${Date.now()}`,
                    headline: `${nextPlayer.name}'s creator image is opening industry doors.`,
                    subtext: 'Casting teams and brands are starting to treat the channel as career leverage.',
                    category: 'YOU',
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    impactLevel: 'MEDIUM'
                });
                logsToAdd.push({ msg: `📈 Creator Image: Your ${publicImage.toLowerCase()} channel boosted industry trust.`, type: 'positive' });
            } else if (publicImage === 'Volatile' || creatorScore < 38) {
                nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 3);
                nextPlayer.youtube.audienceTrust = Math.max(0, (nextPlayer.youtube.audienceTrust ?? 55) - 3);
                nextPlayer.news.unshift({
                    id: `news_yt_image_bad_${Date.now()}`,
                    headline: `Brands hesitate as ${nextPlayer.name}'s creator image gets messy.`,
                    subtext: 'The attention is real, but some industry rooms are getting cautious.',
                    category: 'YOU',
                    week: nextPlayer.currentWeek,
                    year: nextPlayer.age,
                    impactLevel: 'LOW'
                });
                logsToAdd.push({ msg: `⚠️ Creator Image: Your volatile channel made some brands and casting rooms cautious.`, type: 'negative' });
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
            nextPlayer.pendingEvents.push(createYoutubeRivalryEvent(nextPlayer));
            nextPlayer.flags.lastYoutubeRivalryAbsWeek = currentAbs;
            nextPlayer.youtube.controversy = Math.min(100, (nextPlayer.youtube.controversy ?? 0) + 4);
            nextPlayer.news.unshift({
                id: `news_yt_rival_tease_${Date.now()}`,
                headline: `A creator rival takes aim at ${nextPlayer.name}'s channel.`,
                subtext: 'The creator economy has noticed the rise, and not everyone is clapping.',
                category: 'YOU',
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
                impactLevel: 'LOW'
            });
            nextPlayer.news = nextPlayer.news.slice(0, 50);
            logsToAdd.push({ msg: `🥊 Creator Rivalry: A rival creator is trying to pull you into drama.`, type: 'neutral' });
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

        // Sync to business objects for consistency
        nextPlayer.businesses.forEach(b => {
            if (b.type === 'PRODUCTION_HOUSE' && b.studioState) {
                b.studioState.talentRoster = [...nextPlayer.studio.talentRoster];
            }
        });
    }

    // --- 2B. TEAM ROTATION ---
    if ((nextPlayer.currentWeek + 1) % 3 === 0) {
        nextPlayer.team.availableAgents = getRandomAgents(3);
        nextPlayer.team.availableManagers = getRandomManagers(2);
        nextPlayer.team.availableTrainers = getRandomTrainers(2);
        nextPlayer.team.availableTherapists = getRandomTherapists(2);
        nextPlayer.team.availableStylists = getRandomStylists(2);
        nextPlayer.team.availablePublicists = getRandomPublicists(2);
        
        logsToAdd.push({ msg: "The hiring pool for Agents & Managers has refreshed.", type: 'neutral' });
    }

    // --- 3. FINANCES & UPKEEP ---
    const weeklySubscriptionCost = nextPlayer.commitments.reduce((sum, c) => sum + (c.weeklyCost || 0), 0);
    const propertyUpkeep = nextPlayer.residenceId ? PROPERTY_CATALOG.find(p => p.id === nextPlayer.residenceId)?.weeklyExpense || 0 : 0;

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
    const lifestyleMembers: (keyof typeof nextPlayer.team)[] = ['personalTrainer', 'therapist', 'stylist', 'publicist'];
    lifestyleMembers.forEach(role => {
        const member = nextPlayer.team[role] as TeamMember | null;
        if (member) {
            addTransaction(-member.weeklyCost, 'EXPENSE', `${member.type} Fee (${member.name})`);
        }
    });

    // --- NEW: BUSINESS SIMULATION ---
    if (nextPlayer.businesses && nextPlayer.businesses.length > 0) {
        const updatedBusinesses: Business[] = [];
        nextPlayer.businesses.forEach(biz => {
            try {
                const res = processBusinessWeek(biz, nextPlayer.stats.fame, nextPlayer.currentWeek);
                updatedBusinesses.push(res.updated);
                
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

    addTransaction(-propertyUpkeep, 'EXPENSE', 'Property Upkeep');

    // Bankruptcy Check
    if (nextPlayer.money < 0) {
        if (weeklySubscriptionCost > 0 || propertyUpkeep > 0) {
             const paidCommitments = nextPlayer.commitments.filter(c => (c.type === 'COURSE' || c.type === 'GYM'));
             if (paidCommitments.length > 0) {
                 logsToAdd.push({ msg: "🛑 BROKE! Gym & Classes cancelled. Auto-payments failed.", type: 'negative' });
                 nextPlayer.commitments = nextPlayer.commitments.filter(c => c.type !== 'COURSE' && c.type !== 'GYM');
             }
        }
    }

    // Job Income / Course Costs
    nextPlayer.commitments.forEach(c => {
        if ((c.payoutType === 'WEEKLY' || c.type === 'JOB') && c.income > 0) {
            addTransaction(c.income, 'SALARY', `${c.name} Wages`);
            logsToAdd.push({ msg: `💰 Earned $${c.income.toLocaleString()} from ${c.name}.`, type: 'positive' });
        }
        if (c.weeklyCost) {
            addTransaction(-c.weeklyCost, 'EXPENSE', `${c.name} Fee`);
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
    spendPlayerEnergy(nextPlayer, totalDrain);

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

    const bodyBonus = getBonusGain(trainer);
    nextPlayer.stats.body = Math.max(0, Math.min(100, nextPlayer.stats.body - BASE_DECAY + bodyBonus));

    nextPlayer.stats.health = Math.max(0, Math.min(100, nextPlayer.stats.health - HEALTH_DECAY));

    const happinessBonus = getBonusGain(therapist);
    nextPlayer.stats.happiness = Math.max(0, Math.min(100, nextPlayer.stats.happiness - BASE_DECAY + happinessBonus));

    const looksBonus = getBonusGain(stylist);
    nextPlayer.stats.looks = Math.max(0, Math.min(100, nextPlayer.stats.looks - BASE_DECAY + looksBonus));

    const fameBonus = getBonusGain(publicist);
    if (nextPlayer.stats.fame > 0) {
        nextPlayer.stats.fame = Math.max(0, Math.min(100, nextPlayer.stats.fame - FAME_DECAY + fameBonus));
    }
    
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
                logsToAdd.push({ msg: `🎓 Completed "${c.name}"!`, type: 'positive' });
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

    // --- 5. RELATIONSHIPS DECAY ---
    nextPlayer.relationships = nextPlayer.relationships.map(rel => {
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
        const req = spon.requirements;
        addTransaction(spon.weeklyPay, 'SPONSORSHIP', `${spon.brandName} Payment`);
        
        const nextWeekSpon = { 
            ...spon, 
            durationWeeks: spon.durationWeeks - 1, 
            weeksCompleted: (spon.weeksCompleted || 0) + 1 
        };

        if (nextWeekSpon.durationWeeks <= 0) {
            const totalDone = req.progress || 0;
            const goal = req.totalRequired || 1; 

            if (totalDone >= goal) {
                logsToAdd.push({ msg: `✅ Contract fulfilled with ${spon.brandName}. Reputation increased.`, type: 'positive' });
                nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 5);
            } else {
                const penalty = spon.penalty || 0;
                addTransaction(-penalty, 'EXPENSE', `Breach of Contract (${spon.brandName})`);
                nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 10);
                logsToAdd.push({ msg: `❌ CONTRACT BREACHED: Failed to complete tasks for ${spon.brandName}. Penalty applied.`, type: 'negative' });
            }
        } else {
            processedSponsorships.push(nextWeekSpon);
        }
    });
    nextPlayer.activeSponsorships = processedSponsorships;

    const remainingYoutubeCollabs: any[] = [];
    nextPlayer.youtube.activeCollabs.forEach(collab => {
        const nextCollab = { ...collab, expiresInWeeks: (collab.expiresInWeeks ?? 1) - 1 };
        if (nextCollab.expiresInWeeks <= 0) {
            logsToAdd.push({ msg: `🎥 Missed Collab: ${collab.creatorName} moved on from "${collab.conceptTitle}".`, type: 'negative' });
        } else {
            remainingYoutubeCollabs.push(nextCollab);
        }
    });
    nextPlayer.youtube.activeCollabs = remainingYoutubeCollabs;

    const remainingYoutubeBrandDeals: any[] = [];
    nextPlayer.youtube.activeBrandDeals.forEach(deal => {
        const nextDeal = { ...deal, expiresInWeeks: (deal.expiresInWeeks ?? 1) - 1 };
        if (nextDeal.expiresInWeeks <= 0) {
            addTransaction(-deal.penalty, 'EXPENSE', `Missed YouTube Deal (${deal.brandName})`);
            nextPlayer.stats.reputation = Math.max(0, nextPlayer.stats.reputation - 4);
            logsToAdd.push({ msg: `📉 You missed the ${deal.brandName} YouTube integration window.`, type: 'negative' });
        } else {
            remainingYoutubeBrandDeals.push(nextDeal);
        }
    });
    nextPlayer.youtube.activeBrandDeals = remainingYoutubeBrandDeals;

    // --- 7. APPLICATIONS ---
    const nextApplications: Application[] = [];
    const newAuditionCommitments: Commitment[] = [];
    nextPlayer.applications.forEach(app => {
        const weeksLeft = app.weeksRemaining - 1;
        if (weeksLeft <= 0) {
            if (app.type === 'AUDITION') {
                const passedShortlist = Math.random() > 0.3; 
                if (passedShortlist) {
                    const opp = app.data as AuditionOpportunity;
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
                        projectDetails: opp.project,
                        projectPhase: 'AUDITION',
                        phaseWeeksLeft: duration, 
                        totalPhaseDuration: duration,
                        auditionPerformance: 0,
                        productionPerformance: 0,
                        agentCommission: opp.source === 'AGENT' ? (nextPlayer.team.agent?.commission || 0) : 0,
                        royaltyPercentage: opp.royaltyPercentage
                    });
                    logsToAdd.push({ msg: `🎫 Audition Invite: "${opp.projectName}". Prepare yourself!`, type: 'positive' });
                } else {
                    logsToAdd.push({ msg: `❌ Application declined for "${app.name}".`, type: 'negative' });
                }
            }
        } else {
            nextApplications.push({ ...app, weeksRemaining: weeksLeft });
        }
    });
    nextPlayer.applications = nextApplications;

    // --- 8. CAREER COMMITMENTS & 9. ACTIVE RELEASES (Collapsed for brevity, logic maintained) ---
    // ... [Career logic processing remains identical to original provided code] ...
    // Assuming logic integrity is maintained from existing file provided in prompt.
    // Re-injecting the full robust career logic:

    const nextCommitments: Commitment[] = [];
    const newReleases: ActiveRelease[] = [];
    
    nextPlayer.commitments.forEach(c => {
        let updatedC = { ...c };
        if (c.type === 'ACTING_GIG' && (c.projectPhase === 'AUDITION' || c.projectPhase === 'PRODUCTION')) {
            const passivePoints = calculatePassiveGain(nextPlayer.stats.talent);
            if (passivePoints > 0) {
                if (c.projectPhase === 'AUDITION') updatedC.auditionPerformance = Math.min(100, (updatedC.auditionPerformance || 0) + passivePoints);
                else updatedC.productionPerformance = Math.min(100, (updatedC.productionPerformance || 0) + passivePoints);
            }
        }

        // Allow studio projects (JOB with projectPhase) to fall through to phase logic
        const isStudioProject = updatedC.type === 'JOB' && updatedC.projectPhase !== undefined;

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

        const weeksLeft = (updatedC.phaseWeeksLeft || 1) - 1;

        if (updatedC.projectPhase === 'SCHEDULED') {
            if (weeksLeft <= 0) {
                const duration = getPhaseDuration('PRE_PRODUCTION');
                logsToAdd.push({ msg: `🎬 Production gearing up for "${updatedC.name}". Entering Pre-Production.`, type: 'positive' });
                nextCommitments.push({ ...updatedC, projectPhase: 'PRE_PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, productionPerformance: 50 });
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
            return;
        }

        if (updatedC.projectPhase === 'PLANNING') {
            if (weeksLeft <= 0) {
                const duration = getPhaseDuration('PRE_PRODUCTION');
                logsToAdd.push({ msg: `📜 Planning for "${updatedC.name}" is complete. Entering Pre-Production.`, type: 'neutral' });
                nextCommitments.push({ ...updatedC, projectPhase: 'PRE_PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, auditionPerformance: 0 });
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'PRE_PRODUCTION') {
            if (weeksLeft <= 0) {
                const duration = getPhaseDuration('PRODUCTION');
                logsToAdd.push({ msg: `🎬 Pre-production wrapped for "${updatedC.name}". Filming begins!`, type: 'positive' });
                nextCommitments.push({ ...updatedC, projectPhase: 'PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, productionPerformance: 0 });
                // FIX: Grant +1 Experience here for roles that skipped the 'AUDITION' phase (like Direct Offers) to ensure progression
                nextPlayer.stats.experience = Math.min(100, nextPlayer.stats.experience + 1);
            } else { nextCommitments.push({ ...updatedC, phaseWeeksLeft: weeksLeft }); }
        } else if (updatedC.projectPhase === 'AUDITION') {
            if (weeksLeft <= 0) {
                const result = checkAuditionPass(nextPlayer, updatedC);
                if (result.passed) {
                    const duration = getPhaseDuration('PRODUCTION');
                    logsToAdd.push({ msg: `🎉 CAST! You booked the role in "${updatedC.name}"! Production starts now.`, type: 'positive' });
                    if (updatedC.projectDetails?.isFamous) {
                        nextPlayer.world.famousMoviesReleased.push(updatedC.name);
                        nextPlayer.stats.reputation = Math.min(100, nextPlayer.stats.reputation + 10); 
                    }
                    nextCommitments.push({ ...updatedC, projectPhase: 'PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, productionPerformance: 0 });
                    nextPlayer.stats.experience = Math.min(100, nextPlayer.stats.experience + 1);
                } else {
                    logsToAdd.push({ msg: `❌ Rejection: "${updatedC.name}". ${result.reason}`, type: 'negative' });
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
                        trait: (crisis as any).trait,
                        npcId: (crisis as any).npcId,
                        isGeneral: (crisis as any).isGeneral,
                        templateIndex: (crisis as any).templateIndex,
                        isGenerative: (crisis as any).isGenerative,
                        options: crisis.options.map((o, i) => ({ label: o.label, index: i }))
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
                        options: decision.options.map((o, i) => ({ label: o.label, index: i }))
                    }
                });
                logsToAdd.push({ msg: `🎬 Creative Decision needed for "${updatedC.name}"!`, type: 'neutral' });
            }

            if (weeksLeft <= 0) {
                const duration = getPhaseDuration('POST_PRODUCTION');
                logsToAdd.push({ msg: `🎬 That's a wrap on "${updatedC.name}"! Moving to post-production.`, type: 'positive' });
                nextCommitments.push({ ...updatedC, projectPhase: 'POST_PRODUCTION', phaseWeeksLeft: duration, totalPhaseDuration: duration, promotionalBuzz: 0 });
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
                    const imdb = calculateIMDbRating(updatedC);
                const budget = updatedC.projectDetails?.estimatedBudget || getEstimatedBudget(updatedC.projectDetails?.budgetTier || 'LOW');
                const isTV = updatedC.projectDetails?.type === 'SERIES';
                const isStreamingOnly = isTV || updatedC.projectDetails?.releaseStrategy === 'STREAMING_ONLY';

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

                    const quality = updatedC.projectDetails.hiddenStats.qualityScore;
                    const isRecast = updatedC.projectDetails.hiddenStats.isRecast;
                    updatedC.projectDetails.reviews = generateReviews(quality, updatedC.projectDetails.genre, nextPlayer.name, isRecast);
                }

                let streamingState: StreamingState | undefined = undefined;
                if (isStreamingOnly && updatedC.projectDetails) {
                    const isAlreadySold = !!updatedC.projectDetails.hiddenStats.platformId;
                    const platformId = (updatedC.projectDetails.hiddenStats.platformId as PlatformId) || determineStreamingAcquisition(updatedC.projectDetails);
                    streamingState = { platformId, weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false };
                    logsToAdd.push({ msg: `📺 "${updatedC.name}" is now streaming on ${PLATFORMS[platformId].name}! IMDb Page Created.`, type: 'positive' });
                    
                    // Update platform state only if not already sold (otherwise it was paid during bidding)
                    if (!isAlreadySold && nextPlayer.world.platforms && nextPlayer.world.platforms[platformId]) {
                        const platform = nextPlayer.world.platforms[platformId];
                        // Estimate acquisition cost
                        const cost = Math.floor((updatedC.projectDetails?.estimatedBudget || 0) * 0.4 * PLATFORMS[platformId].payoutMult);
                        platform.cashReserve -= cost;
                        platform.recentHits += 1;
                    }
                } else {
                    logsToAdd.push({ msg: `🌍 RELEASE DAY: "${updatedC.name}" hits theaters! IMDb Page Created.`, type: 'positive' });
                }
                
                if (updatedC.lumpSum) {
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

                    // Rival Clash Penalty
                    const rivalsThisWeek = nextPlayer.world.projects.filter(p => p.weekReleased === nextPlayer.currentWeek && p.id !== updatedC.id);
                    const heavyHitters = rivalsThisWeek.filter(r => r.budgetTier === 'HIGH').length;
                    const clashPenalty = (rivalsThisWeek.length * 5) + (heavyHitters * 15);
                    accumulatedBuzz = Math.max(0, accumulatedBuzz - clashPenalty);

                    const budgetTier = updatedC.projectDetails.budgetTier;
                    let minW = 8, maxW = 12;
                    if (budgetTier === 'MID') { minW = 10; maxW = 14; }
                    if (budgetTier === 'HIGH') { minW = 12; maxW = 15; }
                    const maxTheatricalWeeks = Math.floor(Math.random() * (maxW - minW + 1)) + minW;

                    const newRelease: ActiveRelease = {
                        id: updatedC.id, name: updatedC.name, type: updatedC.projectDetails.type, roleType: getPlayerProjectRoleType(updatedC.roleType, updatedC.projectDetails.castList),
                        projectDetails: updatedC.projectDetails, weekNum: 1, weeklyGross: [], totalGross: 0, budget: budget,
                        status: 'RUNNING', imdbRating: imdb, productionPerformance: updatedC.productionPerformance || 50,
                        distributionPhase: isStreamingOnly ? 'STREAMING' : 'THEATRICAL',
                        streaming: streamingState,
                        streamingRevenue: updatedC.projectDetails.streamingRevenue || 0,
                        royaltyPercentage: updatedC.royaltyPercentage,
                        studioRoyaltyPercentage: updatedC.projectDetails.hiddenStats.backendPct,
                        sequelDecisionWeek: 4 + Math.floor(Math.random() * 7),
                        promotionalBuzz: accumulatedBuzz,
                        maxTheatricalWeeks
                    };
                    newReleases.push(newRelease);
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

    // --- 9. ACTIVE RELEASES LOGIC ---
    let processedReleases: ActiveRelease[] = [];
    const allRunning = [...nextPlayer.activeReleases, ...newReleases];
    let newNews = [...nextPlayer.news];
    let newInbox = [...nextPlayer.inbox];

    allRunning.forEach(rel => {
        if (rel.imdbRating) {
            const change = (Math.random() * 0.1) - 0.05; 
            rel.imdbRating = Math.max(1.1, Math.min(9.9, rel.imdbRating + change));
        }

        const decisionWeek = rel.sequelDecisionWeek || 5; 
        if (rel.weekNum === decisionWeek && !rel.sequelDecisionMade) {
            rel.sequelDecisionMade = true;
            const potential = calculateFuturePotential(rel.type, rel.projectDetails.budgetTier, rel.totalGross, rel.budget, rel.imdbRating || 5, rel.projectDetails.genre, rel.roleType);
            const isUniverseContracted = !!(player.activeUniverseContract && rel.projectDetails.universeId && player.activeUniverseContract.universeId === rel.projectDetails.universeId);
            
            // Check if this project belongs to the player's production house
            const isPlayerProduction = nextPlayer.businesses?.some(b => b.id === rel.projectDetails.studioId && b.type === 'PRODUCTION_HOUSE');

            if (rel.type === 'SERIES') {
                if (potential.isRenewed) {
                    potential.seriesStatus = 'RUNNING';
                    const returnDecision = getReturnStatusForContinuation(rel, nextPlayer, !!isPlayerProduction, false);
                    potential.playerReturnStatus = returnDecision.status;
                    potential.returnStatusNote = returnDecision.note;
                    rel.futurePotential = potential;

                    if (!isPlayerProduction && returnDecision.getsOffer) {
                        const offer = generateRenewalOffer(rel, nextPlayer);
                        const seasonMatch = offer.opportunity.projectName.match(/Season (\d+)/);
                        const nextSeasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 2;
                        newNews.unshift(generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age));
                        newInbox.unshift({
                            id: `renew_offer_${Date.now()}`, sender: 'Network Exec', subject: `RENEWAL: ${offer.opportunity.projectName}`, text: "We are picking up the show for another season.", type: 'OFFER_NEGOTIATION', data: offer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4
                        });
                    } else if (isPlayerProduction || returnDecision.status === 'RETURNING') {
                        // Just show news for player production if it's "renewed" (successful)
                        const seasonMatch = rel.name.match(/Season (\d+)/);
                        const nextSeasonNum = seasonMatch ? parseInt(seasonMatch[1]) + 1 : 2;
                        newNews.unshift(generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age));
                    } else {
                        const seasonMatch = rel.name.match(/Season (\d+)/);
                        const nextSeasonNum = seasonMatch ? parseInt(seasonMatch[1]) + 1 : 2;
                        newNews.unshift(generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age));
                        const returnStatusNews = createReturnStatusNews(rel.name, returnDecision.status, nextPlayer.currentWeek, nextPlayer.age, true);
                        if (returnStatusNews) newNews.unshift(returnStatusNews);
                    }
                } else {
                    potential.seriesStatus = 'CANCELLED';
                    rel.futurePotential = potential;
                    newNews.unshift(generateCancellationNews(rel.name, 1, nextPlayer.currentWeek, nextPlayer.age));
                }
            } else {
                if (potential.isSequelGreenlit) {
                    const returnDecision = getReturnStatusForContinuation(rel, nextPlayer, !!isPlayerProduction, isUniverseContracted);
                    potential.playerReturnStatus = returnDecision.status;
                    potential.returnStatusNote = returnDecision.note;
                    rel.futurePotential = potential;

                    if (!isUniverseContracted && !isPlayerProduction && returnDecision.getsOffer) {
                        newNews.unshift(generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age));
                        const offer = generateSequelOffer(rel, nextPlayer);
                        newInbox.unshift({
                            id: `negot_${Date.now()}`, sender: 'Studio Legal', subject: `Return Offer: ${offer.opportunity.projectName}`, text: `We offer you the role in the sequel.`, type: 'OFFER_NEGOTIATION', data: offer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4
                        });
                    } else if ((isUniverseContracted || isPlayerProduction) || returnDecision.status === 'RETURNING') {
                        newNews.unshift(generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age));
                    } else {
                        newNews.unshift(generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age));
                        const returnStatusNews = createReturnStatusNews(rel.name, returnDecision.status, nextPlayer.currentWeek, nextPlayer.age, false);
                        if (returnStatusNews) newNews.unshift(returnStatusNews);
                    }
                }
            }
        }

        if (rel.distributionPhase === 'THEATRICAL') {
            const prevGross = rel.weeklyGross.length > 0 ? rel.weeklyGross[rel.weeklyGross.length - 1] : 0;
            const uncappedRevenue = calculateWeeklyBoxOffice(
                rel.weekNum,
                rel.budget,
                rel.projectDetails.hiddenStats,
                prevGross,
                rel.weekNum === 1 ? rel.promotionalBuzz : undefined,
                rel.projectDetails.budgetTier,
                rel.projectDetails.genre
            );
            const boxOfficeCaps = getBoxOfficeCaps(rel.projectDetails.budgetTier);
            const remainingHeadroom = Math.max(0, boxOfficeCaps.total - rel.totalGross);
            const revenue = Math.min(uncappedRevenue, remainingHeadroom);
            const newTotal = rel.totalGross + revenue;
            const newWeeklyGross = [...rel.weeklyGross, revenue];
            const maxWeeks = rel.maxTheatricalWeeks || 12; 
            const isPulledRevenue = rel.weekNum >= 3 && revenue < (rel.budget * 0.05); 
            const isPulledTime = rel.weekNum >= maxWeeks; 
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
                const studioShare = Math.floor(revenue * 0.5); // 50% to studio
                playerStudio.balance += studioShare;
                playerStudio.stats.weeklyRevenue += studioShare;
                playerStudio.stats.weeklyProfit += studioShare;
                playerStudio.stats.lifetimeRevenue += studioShare;
                if (studioShare > 0) {
                    appendStudioLedgerEntry(playerStudio, {
                        id: `studio_ledger_theatrical_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        amount: studioShare,
                        type: 'THEATRICAL',
                        label: `${rel.name} theatrical receipts`,
                        projectId: rel.id
                    });
                }
            }

            if (isPulledRevenue || isPulledTime) {
                const { tier, score } = calculateRunOutcome(newTotal, rel.budget, rel.imdbRating || 5);
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

                if (playerStudio) {
                    // Trigger bidding war for player's studio
                    logsToAdd.push({ msg: `📉 "${rel.name}" left theaters. Awaiting streaming bids!`, type: 'neutral' });
                    
                    // Generate bids
                    if (rel.streaming) {
                        // Already has a streaming deal (accepted while in theaters)
                        processedReleases.push({ ...rel, distributionPhase: 'STREAMING', totalGross: newTotal, weeklyGross: newWeeklyGross, status: 'FINISHED' });
                    } else {
                        const bids: { platformId: PlatformId, upfront: number, royalty: number, duration: number }[] = [];
                        const isSeries = rel.type === 'SERIES';
                        const platforms = Object.keys(PLATFORMS) as PlatformId[];
                        platforms.forEach(pId => {
                            const platformProfile = PLATFORMS[pId];
                            const platformState = nextPlayer.world.platforms?.[pId];
                            
                            if (!platformState) return;

                            // Base interest on quality, genre match, and platform's desperation (recentHits)
                            const isGenreMatch = platformProfile.genreBias.some(g => g.toUpperCase().replace('-', '_') === rel.projectDetails.genre) ? 1.15 : 0.95;
                            const desperation = Math.max(0.5, 1.5 - (platformState.recentHits * 0.1));
                            const qualityScore = rel.projectDetails.hiddenStats.qualityScore || 50;
                            const scriptQuality = rel.projectDetails.hiddenStats.scriptQuality || 50;
                            const directorQuality = rel.projectDetails.hiddenStats.directorQuality || 50;
                            const castingStrength = rel.projectDetails.hiddenStats.castingStrength || 50;
                            const packageStrength = (qualityScore * 0.45) + (scriptQuality * 0.2) + (directorQuality * 0.15) + (castingStrength * 0.2);
                            const runStrength = Math.max(0.5, Math.min(3, newTotal / Math.max(rel.budget, 1)));
                            const interest = (packageStrength * isGenreMatch * desperation) + ((rel.promotionalBuzz || 50) * 0.15) + (runStrength * 12);
                            
                            if (interest > 60 || Math.random() > 0.7) {
                                const bidProfile = getStreamingBidProfile(packageStrength, isSeries, runStrength);
                                const qualityFactor = Math.max(0.85, 0.95 + ((packageStrength - 55) / 105));
                                const floorOffer = rel.budget * bidProfile.floor;
                                const qualityRange = rel.budget * (
                                    bidProfile.floor + ((bidProfile.ceiling - bidProfile.floor) * (0.18 + Math.random() * 0.5))
                                );
                                const marketOffer = rel.budget
                                    * (0.45 + (runStrength * 0.18))
                                    * qualityFactor
                                    * platformProfile.payoutMult
                                    * desperation
                                    * isGenreMatch;
                                let baseOffer = Math.max(
                                    floorOffer * (1.02 + Math.random() * 0.12),
                                    qualityRange,
                                    marketOffer
                                );

                                // Streaming is meant to be the safest lane, so don't let platform cash quirks undercut viable projects.
                                const platformCashCap = Math.max(
                                    floorOffer,
                                    platformState.cashReserve * (isSeries ? 0.78 : 0.68),
                                    rel.budget * Math.min(
                                        bidProfile.ceiling,
                                        packageStrength >= 84 ? 9 : packageStrength >= 72 ? 4.5 : packageStrength >= 60 ? 2.4 : 1.4
                                    )
                                );
                                const maxOffer = Math.min(platformCashCap, rel.budget * bidProfile.ceiling);
                                baseOffer = Math.min(baseOffer, Math.max(floorOffer, maxOffer));

                                const upfront = Math.floor(Math.max(floorOffer, baseOffer * (0.96 + Math.random() * 0.28)));
                                const royalty = Math.floor(Math.random() * (isSeries ? 6 : 8)) + (isSeries ? 6 : 5); // series get slightly safer backend terms
                                
                                if (upfront > 0) {
                                    bids.push({ platformId: pId, upfront, royalty, duration: 52 }); // 1 year contract
                                }
                            }
                        });
                        
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
                                upfront: Math.floor(rel.budget * bidProfile.floor),
                                royalty: isSeries ? 6 : 5,
                                duration: 52
                            });
                        }

                        processedReleases.push({ ...rel, distributionPhase: 'STREAMING_BIDDING', totalGross: newTotal, weeklyGross: newWeeklyGross, status: 'FINISHED', bids });
                    }
                } else {
                    // NPC studio, just auto-assign
                    const platformId = determineStreamingAcquisition(rel.projectDetails);
                    logsToAdd.push({ msg: `📉 "${rel.name}" left theaters. Acquired by ${PLATFORMS[platformId].name}.`, type: 'neutral' });
                    
                    // Update platform state
                    if (nextPlayer.world.platforms && nextPlayer.world.platforms[platformId]) {
                        const platform = nextPlayer.world.platforms[platformId];
                        // Estimate acquisition cost
                        const cost = Math.floor(rel.budget * 0.4 * PLATFORMS[platformId].payoutMult);
                        platform.cashReserve -= cost;
                        platform.recentHits += 1;
                    }

                    processedReleases.push({ ...rel, distributionPhase: 'STREAMING', totalGross: newTotal, weeklyGross: newWeeklyGross, status: 'FINISHED', streaming: { platformId, weekOnPlatform: 1, totalViews: 0, weeklyViews: [], isLeaving: false } });
                }
            } else {
                processedReleases.push({ ...rel, totalGross: newTotal, weeklyGross: newWeeklyGross, weekNum: rel.weekNum + 1 });
            }
        } 
        else if (rel.distributionPhase === 'STREAMING_BIDDING') {
            // Wait for player to accept a bid
            processedReleases.push(rel);
        }
        else if (rel.distributionPhase === 'STREAMING' && rel.streaming) {
            // Handle delayed streaming release, including year rollover.
            const currentAbsoluteWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
            if (
                (typeof rel.streaming.startWeekAbsolute === 'number' && currentAbsoluteWeek < rel.streaming.startWeekAbsolute) ||
                (typeof rel.streaming.startWeekAbsolute !== 'number' && rel.streaming.startWeek && nextPlayer.currentWeek < rel.streaming.startWeek)
            ) {
                processedReleases.push(rel);
                return;
            }
            const newViews = calculateStreamingViewership(rel.streaming.platformId, rel.streaming.weekOnPlatform, rel.projectDetails.hiddenStats.qualityScore, rel.streaming.weeklyViews[rel.streaming.weeklyViews.length - 1] || 0, rel.type);
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

            let weeklyStreamingRevenue = 0;
            if (rel.studioRoyaltyPercentage) {
                // Assume $0.10 per view
                weeklyStreamingRevenue = Math.floor(newViews * 0.10 * (rel.studioRoyaltyPercentage / 100));
                const studioId = rel.projectDetails.studioId;
                const playerStudio = nextPlayer.businesses?.find(b => b.id === studioId);
                if (playerStudio && weeklyStreamingRevenue > 0) {
                    playerStudio.balance += weeklyStreamingRevenue;
                    playerStudio.stats.weeklyRevenue += weeklyStreamingRevenue;
                    playerStudio.stats.weeklyProfit += weeklyStreamingRevenue;
                    playerStudio.stats.lifetimeRevenue += weeklyStreamingRevenue;
                    appendStudioLedgerEntry(playerStudio, {
                        id: `studio_ledger_streaming_${rel.id}_${nextPlayer.age}_${nextPlayer.currentWeek}`,
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        amount: weeklyStreamingRevenue,
                        type: 'STREAMING_ROYALTY',
                        label: `${rel.name} streaming royalties`,
                        projectId: rel.id
                    });
                }
            }
            const newStreamingRevenue = (rel.streamingRevenue || 0) + weeklyStreamingRevenue;

            if (shouldExit) {
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
                nextPlayer.pastProjects.push({
                    id: rel.id, name: rel.name, type: 'ACTING_GIG', roleType: getPlayerProjectRoleType(rel.roleType, rel.projectDetails.castList), year: nextPlayer.age,
                    earnings: 0, rating: rel.imdbRating || 0, reception: rel.status, projectQuality: rel.projectDetails.hiddenStats.qualityScore, imdbRating: rel.imdbRating, boxOfficeResult: `$${(rel.totalGross/1000000).toFixed(1)}M`, outcomeTier: calculateRunOutcome(rel.totalGross + newStreamingRevenue, rel.budget, rel.imdbRating || 5).tier, subtype: rel.projectDetails.subtype, futurePotential: rel.futurePotential || { sequelChance: 0, franchiseChance: 0, rebootChance: 0, renewalChance: 0, isFranchiseStarter: false, isSequelGreenlit: false, isRenewed: false, seriesStatus: 'N/A', playerReturnStatus: undefined, returnStatusNote: undefined }, studioId: rel.projectDetails.studioId, streamingPlatform: rel.streaming.platformId, totalViews, streamingRevenue: newStreamingRevenue, castList: rel.projectDetails.castList, reviews: rel.projectDetails.reviews, budget: rel.budget, gross: rel.totalGross, genre: rel.projectDetails.genre, description: rel.projectDetails.description, projectType: rel.type, royaltyPercentage: rel.royaltyPercentage, franchiseId: rel.projectDetails.franchiseId, universeId: rel.projectDetails.universeId, universeSagaName: rel.projectDetails.universeSagaName, universePhaseName: rel.projectDetails.universePhaseName, installmentNumber: rel.projectDetails.installmentNumber, directorId: rel.projectDetails.directorId
                });
            } else {
                processedReleases.push({ ...rel, streamingRevenue: newStreamingRevenue, streaming: { ...rel.streaming, totalViews, weeklyViews: newWeeklyViews, weekOnPlatform: rel.streaming.weekOnPlatform + 1, isLeaving: newWeeklyViews.length > 20 && newViews < 50000 } });
            }
        }
    });

    nextPlayer.activeReleases = processedReleases;
    nextPlayer.news = newNews;
    nextPlayer.inbox = newInbox;

    // --- 10. AWARD SEASON LOGIC ---
    Object.entries(AWARD_CALENDAR).forEach(([weekStr, def]) => {
        if (nextPlayer.currentWeek === def.inviteWeek) {
            const noms = checkAwardEligibility(nextPlayer, def.inviteWeek);
            const fullBallot = generateFullBallot(nextPlayer, def.type, noms);
            if (noms.length > 0) {
                const awardEntries = noms
                    .filter(n => !nextPlayer.awards.some(a =>
                        a.type === def.type &&
                        a.year === nextPlayer.age &&
                        a.projectId === n.project.id &&
                        a.category === n.category
                    ))
                    .map(n => ({
                        id: `award_nom_${Date.now()}_${Math.random()}`,
                        name: def.name,
                        category: n.category,
                        year: nextPlayer.age,
                        outcome: 'NOMINATED' as const,
                        projectId: n.project.id,
                        projectName: n.project.name,
                        type: def.type
                    }));
                if (awardEntries.length > 0) {
                    nextPlayer.awards.push(...awardEntries);
                    nextPlayer.inbox.unshift({ id: `msg_award_invite_${def.type}_${Date.now()}`, sender: 'The Academy', subject: `NOMINATION: ${def.name}`, text: `Congratulations! You have been nominated for ${awardEntries.length} awards.`, type: 'OFFER_EVENT', data: null, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4 });
                    logsToAdd.push({ msg: `🏆 You have been nominated for the ${def.name}!`, type: 'positive' });
                }
            }
            nextPlayer.scheduledEvents.push({ id: `evt_award_${def.type}_${nextPlayer.age}`, week: parseInt(weekStr), type: 'AWARD_CEREMONY', title: def.name, description: "Award Ceremony", data: { awardDef: def, nominations: noms, fullBallot: fullBallot } });
            nextPlayer.news.unshift({ id: `news_noms_${def.type}_${Date.now()}`, headline: `${def.name} Nominations Announced!`, category: 'TOP_STORY', week: nextPlayer.currentWeek, year: nextPlayer.age, impactLevel: 'HIGH' });
        }
    });

    const awardShow = AWARD_CALENDAR[nextPlayer.currentWeek];
    if (awardShow) {
        const existingEntry = nextPlayer.world.awardHistory.find(h => h.year === nextPlayer.age && h.type === awardShow.type);
        if (!existingEntry) {
            const historyEntry = generateSeasonWinners(nextPlayer, awardShow.type);
            nextPlayer.world.awardHistory.push(historyEntry);
            const bestPic = historyEntry.winners.find(w => w.category.includes('Picture') || w.category.includes('Series'));
            if (bestPic) { nextPlayer.news.unshift({ id: `news_award_${Date.now()}`, headline: `${bestPic.projectName} wins big at ${awardShow.name}!`, category: 'INDUSTRY', week: nextPlayer.currentWeek, year: nextPlayer.age, impactLevel: 'MEDIUM' }); }
        }
    }

    // --- 11. END OF WEEK UPDATES ---
    nextPlayer.currentWeek += 1;
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
                    title: "Government Audit!",
                    description: "The tax authorities have flagged your recent 'Private' performance. They are demanding a full audit of your finances.",
                    options: [
                        {
                            label: `Pay the Penalty ($${penalty.toLocaleString()})`,
                            impact: (p) => {
                                p.money -= penalty;
                                return { updatedPlayer: p, log: "You paid the fine. Your accountant is furious." };
                            }
                        },
                        {
                            label: "Fight it in Court",
                            impact: (p) => {
                                p.stats.reputation -= 15;
                                return { updatedPlayer: p, log: "You're fighting the audit. The press is having a field day." };
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
                logsToAdd.push({ msg: "⚠️ URGENT: The Government is auditing your finances!", type: 'negative' });
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
                    logsToAdd.push({ msg: `📩 You received a project offer following your networking!`, type: 'positive' });
                }
            }
        });
    }

    // --- 11.7 LEGAL HEARINGS ---
    if (nextPlayer.flags.activeCases && nextPlayer.flags.activeCases.length > 0) {
        nextPlayer.flags.activeCases.forEach((c: LegalCase) => {
            if (c.nextHearingWeek === nextPlayer.currentWeek && c.status === 'ACTIVE') {
                const lifeEvent = generateLegalHearing(nextPlayer, c.id);
                if (lifeEvent) {
                    const hearingEvent: ScheduledEvent = {
                        id: `hearing_${c.id}_${c.currentHearing}`,
                        week: nextPlayer.currentWeek,
                        type: 'LEGAL_HEARING',
                        title: `${c.title}: Hearing #${c.currentHearing}`,
                        data: { caseId: c.id, lifeEvent }
                    };
                    nextPlayer.scheduledEvents.push(hearingEvent);
                }
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
                if (rel.relation === 'Child' || rel.relation === 'Parent' || rel.relation === 'Deceased Parent') {
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
            const happiness = nextPlayer.stats.happiness || 50;
            const health = nextPlayer.stats.health || 50;
            
            if (health < 30 && happiness < 30) {
                nextPlayer.stats.health = Math.max(0, health - Math.floor(Math.random() * 15 + 5));
            } else if (health < 50) {
                nextPlayer.stats.health = Math.max(0, health - Math.floor(Math.random() * 10 + 2));
            } else {
                nextPlayer.stats.health = Math.max(0, health - Math.floor(Math.random() * 5));
            }

            if (nextPlayer.stats.health <= 0) {
                nextPlayer.flags.isDead = true;
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

    if (nextPlayer.relationships) {
        nextPlayer.relationships = nextPlayer.relationships.map(rel => {
            if ((rel.relation === 'Child' || rel.relation === 'Sibling') && typeof rel.birthWeekAbsolute === 'number') {
                return { ...rel, age: getRelationshipAge(rel, nextPlayer.age, nextPlayer.currentWeek) };
            }
            return rel;
        });
    }

    // --- 12. GENERATE EVENTS ---
    const eventText = await withTimeout(
        generateWeeklyEvent(nextPlayer.age, "Actor", nextPlayer.stats.fame),
        1500,
        "You kept your head down and stayed busy."
    );
    logsToAdd.push({ msg: eventText, type: 'neutral' });

    try {
        const weeklyNews = generateWeeklyNews(nextPlayer);
        nextPlayer.news = [...weeklyNews, ...nextPlayer.news].slice(0, 50);
    } catch (error) {
        console.error('Weekly news generation failed during week processing:', error);
    }

    try {
        const weeklyInsta = generateWeeklyFeed(nextPlayer);
        // CRITICAL FIX: Limit Instagram Feed History to prevent overflow
        nextPlayer.instagram.feed = [...weeklyInsta, ...nextPlayer.instagram.feed].slice(0, 50);
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

    if (nextPlayer.team.agent) {
        try {
            const agentOffer = generateAgentOffers(nextPlayer);
            if (agentOffer) nextPlayer.inbox.unshift({ id: `offer_${Date.now()}`, sender: nextPlayer.team.agent.name, subject: `Audition: ${agentOffer.projectName}`, text: "New role for you.", type: 'OFFER_ROLE', data: agentOffer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 2 });
        } catch (error) {
            console.error('Agent offer generation failed during week processing:', error);
        }
    }
    
    if (nextPlayer.team.manager) {
        const lastOfferWeek = nextPlayer.flags.lastSponsorshipOfferWeek || 0;
        const managerTier = nextPlayer.team.manager.tier;
        
        // Dynamic cooldown based on manager tier
        let minCooldown = 5;
        if (managerTier === 'STANDARD') minCooldown = 3;
        if (managerTier === 'ELITE') minCooldown = 2;
        
        if (nextPlayer.currentWeek - lastOfferWeek >= minCooldown + Math.floor(Math.random() * 3)) {
            try {
                const sponOffer = generateManagerOffer(nextPlayer);
                if (sponOffer) {
                    nextPlayer.inbox.unshift({ id: `spon_${Date.now()}`, sender: nextPlayer.team.manager.name, subject: `Sponsorship: ${sponOffer.brandName}`, text: "Brand deal offer.", type: 'OFFER_SPONSORSHIP', data: sponOffer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 3 });
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

    const lastYoutubeCollabOfferWeek = nextPlayer.flags.lastYoutubeCollabOfferWeek || 0;
    if (nextPlayer.youtube.subscribers >= 1500 && nextPlayer.currentWeek - lastYoutubeCollabOfferWeek >= 4 + Math.floor(Math.random() * 3)) {
        try {
            const collabOffer = generateYoutubeCollabOffer(nextPlayer);
            if (collabOffer) {
                nextPlayer.inbox.unshift({
                    id: `ytcollab_${Date.now()}`,
                    sender: collabOffer.creatorName,
                    subject: `YouTube Collab: ${collabOffer.conceptTitle}`,
                    text: `${collabOffer.creatorName} wants to collaborate on your channel.`,
                    type: 'OFFER_YOUTUBE_COLLAB',
                    data: collabOffer,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: collabOffer.expiresInWeeks
                });
                nextPlayer.flags.lastYoutubeCollabOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: `🎥 YouTube Collab: ${collabOffer.creatorName} wants to shoot with you.`, type: 'positive' });
            }
        } catch (error) {
            console.error('YouTube collab generation failed during week processing:', error);
        }
    }

    const lastYoutubeBrandOfferWeek = nextPlayer.flags.lastYoutubeBrandOfferWeek || 0;
    if (nextPlayer.youtube.isMonetized && nextPlayer.currentWeek - lastYoutubeBrandOfferWeek >= 5 + Math.floor(Math.random() * 3)) {
        try {
            const brandDeal = generateYoutubeBrandDeal(nextPlayer);
            if (brandDeal) {
                nextPlayer.inbox.unshift({
                    id: `ytbrand_${Date.now()}`,
                    sender: `${brandDeal.brandName} Creator Team`,
                    subject: `YouTube Deal: ${brandDeal.brandName}`,
                    text: `${brandDeal.brandName} sent a creator integration offer for your channel.`,
                    type: 'OFFER_YOUTUBE_BRAND',
                    data: brandDeal,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: brandDeal.expiresInWeeks
                });
                nextPlayer.flags.lastYoutubeBrandOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: `💼 YouTube Deal: ${brandDeal.brandName} sent a creator integration offer.`, type: 'positive' });
            }
        } catch (error) {
            console.error('YouTube brand deal generation failed during week processing:', error);
        }
    }

    try {
        const directOffer = generateDirectOffer(nextPlayer);
        if (directOffer) {
            nextPlayer.inbox.unshift({ id: `direct_${Date.now()}`, sender: "Studio Casting", subject: `Direct Offer: ${directOffer.projectName}`, text: `We want you for the lead.`, type: 'OFFER_ROLE', data: directOffer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4 });
            logsToAdd.push({ msg: `⭐ You received a direct offer for "${directOffer.projectName}"!`, type: 'positive' });
        }
    } catch (error) {
        console.error('Direct offer generation failed during week processing:', error);
    }

    const lastNpcVentureOfferWeek = nextPlayer.flags.lastNpcVentureOfferWeek || 0;
    if (nextPlayer.currentWeek - lastNpcVentureOfferWeek >= 7 + Math.floor(Math.random() * 4)) {
        try {
            const ventureOffer = generateNpcVentureRoleOffer(nextPlayer);
            if (ventureOffer) {
                nextPlayer.inbox.unshift({
                    id: `npc_venture_offer_${Date.now()}`,
                    sender: `${ventureOffer.venture.name} Casting`,
                    subject: `Offer: ${ventureOffer.opportunity.projectName}`,
                    text: getNpcVentureOfferText(ventureOffer.venture, ventureOffer.opportunity),
                    type: 'OFFER_ROLE',
                    data: ventureOffer.opportunity,
                    isRead: false,
                    weekSent: nextPlayer.currentWeek,
                    expiresIn: 4
                });
                nextPlayer.flags.lastNpcVentureOfferWeek = nextPlayer.currentWeek;
                logsToAdd.push({ msg: `📩 ${ventureOffer.venture.name} sent you a role offer.`, type: 'positive' });
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
            ...nextPlayer.pastProjects.map(p => p.name)
        ];
        nextPlayer.weeklyOpportunities = { auditions: generateAuditions(nextPlayer, usedTitles), jobs: generatePartTimeJobs() };
        logsToAdd.push({ msg: "🔄 CastLink updated.", type: 'neutral' });
    }

    // Apply Logs - Limit to last 50 entries to prevent storage overflow (CRITICAL FIX)
    const allLogs = [...nextPlayer.logs, ...logsToAdd.map(l => ({ week: nextPlayer.currentWeek, year: nextPlayer.age, message: l.msg, type: l.type }))];
    nextPlayer.logs = allLogs.slice(-50);

    return { player: nextPlayer, triggerAd };
};
