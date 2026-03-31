
import { Player, Commitment, ActiveRelease, StreamingState, LogEntry, NegotiationData, ActorSkills, Application, AuditionOpportunity, ProjectDetails, ScheduledEvent, TransactionCategory, Transaction, YearlyFinance, Message, IndustryProject, TeamMember, Business, InstaPost, XPost, WriterStats, DirectorStats, PlatformId, LegalCase, LifeEvent } from '../types';
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
    calculatePassiveGain
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
import { generateLifeEvent, generateLegalHearing } from './lifeEventLogic';
import { generateWeeklyFeed, NPC_DATABASE, calculateProjectFameMultiplier, generateNewUnknowns, updateNPCLives } from './npcLogic';
import { generateAgentOffers, generateManagerOffer, generateDirectOffer, getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists } from './teamLogic';
import { processStockMarket, calculatePortfolioValue, getDividendPayout, initializeStocks } from './stockLogic';
import { AWARD_CALENDAR, checkAwardEligibility, AwardDefinition, generateSeasonWinners, generateFullBallot } from './awardLogic';
import { processWorldTurn, generateIndustryProject } from './worldLogic'; 
import { generateFamousMovieOpportunity, generateCameoOffer } from './famousMovieLogic'; 
import { processYoutubeChannel } from './youtubeLogic';
import { checkForProductionCrisis } from './productionService';
import { processBusinessWeek } from './businessLogic';
import { getRelationshipAge } from './legacyLogic';

// --- CONSTANTS ---
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
        nextPlayer.finance = { history: [], yearly: [] };
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
    if (!nextPlayer.studio) {
        nextPlayer.studio = {
            isUnlocked: false,
            baseType: null,
            talentRoster: [],
            lastTalentRefreshWeek: 0
        };
    }
    if (!nextPlayer.studio.talentRoster) nextPlayer.studio.talentRoster = [];
    if (!nextPlayer.flags.extraNPCs) nextPlayer.flags.extraNPCs = [];
    if (!nextPlayer.world.famousMoviesReleased) nextPlayer.world.famousMoviesReleased = []; 
    if (!nextPlayer.world.awardHistory) nextPlayer.world.awardHistory = []; 
    
    // Ensure Youtube Init
    if (!nextPlayer.youtube.totalChannelViews) nextPlayer.youtube.totalChannelViews = nextPlayer.youtube.videos.reduce((a,b) => a + b.views, 0);

    // RESET TEAM CHANGE FLAGS
    if (!nextPlayer.flags) nextPlayer.flags = {};
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
        if (amount === 0) return;
        nextPlayer.money += amount;
        nextPlayer.finance.history.unshift({
            id: `tx_${Date.now()}_${Math.random()}`,
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            amount,
            category,
            description
        });
        if (nextPlayer.finance.history.length > 200) nextPlayer.finance.history.pop();
    };

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
    const worldResult = processWorldTurn(nextPlayer);
    nextPlayer.world = worldResult.world;
    nextPlayer.news = [...worldResult.news, ...nextPlayer.news].slice(0, 50); 

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
    const ytResult = processYoutubeChannel(nextPlayer);
    nextPlayer.youtube = ytResult.channel;
    
    if (ytResult.weeklyRevenue > 0) {
        addTransaction(Math.floor(ytResult.weeklyRevenue), 'BUSINESS', 'YouTube Ad Revenue');
        if (ytResult.weeklyRevenue > 100) {
            logsToAdd.push({ msg: `▶️ YouTube Earnings: $${Math.floor(ytResult.weeklyRevenue).toLocaleString()}`, type: 'positive' });
        }
    }
    ytResult.notifications.forEach(note => logsToAdd.push({ msg: note, type: 'positive' }));

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
        addTransaction(-nextPlayer.team.agent.annualFee, 'EXPENSE', `Agent Fee (${nextPlayer.team.agent.name})`);
        logsToAdd.push({msg: `Paid annual agent fee: $${nextPlayer.team.agent.annualFee.toLocaleString()}`, type: 'neutral'});
    }
    if (nextPlayer.team.manager && nextPlayer.currentWeek === 1) {
        addTransaction(-nextPlayer.team.manager.annualFee, 'EXPENSE', `Manager Fee (${nextPlayer.team.manager.name})`);
        logsToAdd.push({msg: `Paid annual manager fee: $${nextPlayer.team.manager.annualFee.toLocaleString()}`, type: 'neutral'});
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
    
    nextPlayer.energy.max = 100; 
    nextPlayer.energy.current = Math.max(0, 100 - totalDrain);

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
    const FAME_DECAY = 0.25; // Fame decay stays constant or scales differently? Kept constant for now.

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
            import('./productionService').then(({ checkForDirectorDecision }) => {
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
            });

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
                        id: updatedC.id, name: updatedC.name, type: updatedC.projectDetails.type, roleType: updatedC.roleType || 'MINOR',
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
                if (potential.isRenewed && !isPlayerProduction) {
                    const offer = generateRenewalOffer(rel, nextPlayer);
                    const seasonMatch = offer.opportunity.projectName.match(/Season (\d+)/);
                    const nextSeasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 2;
                    newNews.unshift(generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age));
                    newInbox.unshift({
                        id: `renew_offer_${Date.now()}`, sender: 'Network Exec', subject: `RENEWAL: ${offer.opportunity.projectName}`, text: "We are picking up the show for another season.", type: 'OFFER_NEGOTIATION', data: offer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4
                    });
                } else if (potential.isRenewed && isPlayerProduction) {
                    // Just show news for player production if it's "renewed" (successful)
                    const seasonMatch = rel.name.match(/Season (\d+)/);
                    const nextSeasonNum = seasonMatch ? parseInt(seasonMatch[1]) + 1 : 2;
                    newNews.unshift(generateRenewalNews(rel.name, nextSeasonNum, nextPlayer.currentWeek, nextPlayer.age));
                } else {
                    newNews.unshift(generateCancellationNews(rel.name, 1, nextPlayer.currentWeek, nextPlayer.age));
                }
            } else {
                if (potential.isSequelGreenlit && !isUniverseContracted && !isPlayerProduction) {
                    newNews.unshift(generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age));
                    const offer = generateSequelOffer(rel, nextPlayer);
                    newInbox.unshift({
                        id: `negot_${Date.now()}`, sender: 'Studio Legal', subject: `Return Offer: ${offer.opportunity.projectName}`, text: `We offer you the role in the sequel.`, type: 'OFFER_NEGOTIATION', data: offer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4
                    });
                } else if ((isUniverseContracted || isPlayerProduction) && potential.isSequelGreenlit) {
                    newNews.unshift(generateSequelConfirmedNews(rel.name, nextPlayer.currentWeek, nextPlayer.age));
                }
            }
        }

        if (rel.distributionPhase === 'THEATRICAL') {
            const prevGross = rel.weeklyGross.length > 0 ? rel.weeklyGross[rel.weeklyGross.length - 1] : 0;
            const revenue = calculateWeeklyBoxOffice(rel.weekNum, rel.budget, rel.projectDetails.hiddenStats, prevGross, rel.weekNum === 1 ? rel.promotionalBuzz : undefined, rel.projectDetails.budgetTier);
            const newTotal = rel.totalGross + revenue;
            const newWeeklyGross = [...rel.weeklyGross, revenue];
            const maxWeeks = rel.maxTheatricalWeeks || 12; 
            const isPulledRevenue = rel.weekNum >= 3 && revenue < (rel.budget * 0.05); 
            const isPulledTime = rel.weekNum >= maxWeeks; 
            
            // Add revenue to player's studio if they own it
            const studioId = rel.projectDetails.studioId;
            const playerStudio = nextPlayer.businesses?.find(b => b.id === studioId);
            if (playerStudio) {
                const studioShare = Math.floor(revenue * 0.5); // 50% to studio
                playerStudio.balance += studioShare;
                playerStudio.stats.weeklyRevenue += studioShare;
                playerStudio.stats.lifetimeRevenue += studioShare;
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
                        const platforms = Object.keys(PLATFORMS) as PlatformId[];
                        platforms.forEach(pId => {
                            const platformProfile = PLATFORMS[pId];
                            const platformState = nextPlayer.world.platforms?.[pId];
                            
                            if (!platformState) return;

                            // Base interest on quality, genre match, and platform's desperation (recentHits)
                            const isGenreMatch = platformProfile.genreBias.includes(rel.projectDetails.genre) ? 1.5 : 1.0;
                            const desperation = Math.max(0.5, 1.5 - (platformState.recentHits * 0.1));
                            
                            const interest = (rel.projectDetails.hiddenStats.qualityScore * 0.6) + 
                                             ((rel.promotionalBuzz || 50) * 0.4) * isGenreMatch * desperation;
                            
                            if (interest > 60 || Math.random() > 0.7) {
                                // Platform makes a bid
                                // Base offer depends on project budget, platform payout multiplier, and platform's cash reserve
                                // We want this to be a safe revenue stream, so we offer a significant portion of the budget
                                let baseOffer = (rel.budget * (0.7 + Math.random() * 0.4)) * platformProfile.payoutMult * desperation;
                                
                                // Cap offer based on cash reserve (they won't offer more than 50% of their cash for a single hit)
                                const maxOffer = platformState.cashReserve * 0.5;
                                if (baseOffer > maxOffer) baseOffer = maxOffer;

                                const upfront = Math.floor(baseOffer * (0.9 + Math.random() * 0.3));
                                const royalty = Math.floor(Math.random() * 10) + 10; // 10-20%
                                
                                if (upfront > 0) {
                                    bids.push({ platformId: pId, upfront, royalty, duration: 52 }); // 1 year contract
                                }
                            }
                        });
                        
                        if (bids.length === 0) {
                            // Fallback bid if no one is interested
                            bids.push({ platformId: 'NETFLIX', upfront: Math.floor(rel.budget * 0.1), royalty: 5, duration: 52 });
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
            // Handle delayed streaming release
            if (rel.streaming.startWeek && nextPlayer.currentWeek < rel.streaming.startWeek) {
                processedReleases.push(rel);
                return;
            }
            const newViews = calculateStreamingViewership(rel.streaming.platformId, rel.streaming.weekOnPlatform, rel.projectDetails.hiddenStats.qualityScore, rel.streaming.weeklyViews[rel.streaming.weeklyViews.length - 1] || 0, rel.type);
            const totalViews = rel.streaming.totalViews + newViews;
            const newWeeklyViews = [...rel.streaming.weeklyViews, newViews];
            const shouldExit = checkStreamingExit(rel.streaming.platformId, newViews, rel.streaming.weekOnPlatform);

            let weeklyStreamingRevenue = 0;
            if (rel.studioRoyaltyPercentage) {
                // Assume $0.10 per view
                weeklyStreamingRevenue = Math.floor(newViews * 0.10 * (rel.studioRoyaltyPercentage / 100));
                const studioId = rel.projectDetails.studioId;
                const playerStudio = nextPlayer.businesses?.find(b => b.id === studioId);
                if (playerStudio && weeklyStreamingRevenue > 0) {
                    playerStudio.balance += weeklyStreamingRevenue;
                    playerStudio.stats.weeklyRevenue += weeklyStreamingRevenue;
                    playerStudio.stats.lifetimeRevenue += weeklyStreamingRevenue;
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
                    id: rel.id, name: rel.name, type: 'ACTING_GIG', roleType: rel.roleType, year: nextPlayer.age,
                    earnings: 0, rating: rel.imdbRating || 0, reception: rel.status, projectQuality: rel.projectDetails.hiddenStats.qualityScore, imdbRating: rel.imdbRating, boxOfficeResult: `$${(rel.totalGross/1000000).toFixed(1)}M`, outcomeTier: calculateRunOutcome(rel.totalGross + newStreamingRevenue, rel.budget, rel.imdbRating || 5).tier, subtype: rel.projectDetails.subtype, futurePotential: { sequelChance: 0, franchiseChance: 0, rebootChance: 0, renewalChance: 0, isFranchiseStarter: false, isSequelGreenlit: false, isRenewed: false, seriesStatus: 'N/A' }, studioId: rel.projectDetails.studioId, streamingPlatform: rel.streaming.platformId, totalViews, streamingRevenue: newStreamingRevenue, castList: rel.projectDetails.castList, reviews: rel.projectDetails.reviews, budget: rel.budget, gross: rel.totalGross, genre: rel.projectDetails.genre, description: rel.projectDetails.description, projectType: rel.type, royaltyPercentage: rel.royaltyPercentage, franchiseId: rel.projectDetails.franchiseId, universeId: rel.projectDetails.universeId, installmentNumber: rel.projectDetails.installmentNumber, directorId: rel.projectDetails.directorId
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
                const awardEntries = noms.map(n => ({ id: `award_nom_${Date.now()}_${Math.random()}`, name: def.name, category: n.category, year: nextPlayer.age, outcome: 'NOMINATED' as const, projectId: n.project.id, projectName: n.project.name, type: def.type }));
                nextPlayer.awards.push(...awardEntries);
                nextPlayer.inbox.unshift({ id: `msg_award_invite_${def.type}_${Date.now()}`, sender: 'The Academy', subject: `NOMINATION: ${def.name}`, text: `Congratulations! You have been nominated for ${noms.length} awards.`, type: 'OFFER_EVENT', data: null, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4 });
                logsToAdd.push({ msg: `🏆 You have been nominated for the ${def.name}!`, type: 'positive' });
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
    if (nextPlayer.currentWeek % 12 === 0) triggerAd = true;

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
    if (Math.random() < 0.08) { // 8% chance per week
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

        // Yearly Finance
        const yearTransactions = nextPlayer.finance.history.filter(t => t.year === nextPlayer.age - 1);
        const income = yearTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const expense = yearTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const breakdown: Record<TransactionCategory, number> = { SALARY: 0, ROYALTY: 0, SPONSORSHIP: 0, DIVIDEND: 0, EXPENSE: 0, ASSET: 0, BUSINESS: 0, OTHER: 0, AD_REVENUE: 0 };
        yearTransactions.filter(t => t.amount > 0).forEach(t => breakdown[t.category] = (breakdown[t.category] || 0) + t.amount);
        nextPlayer.finance.yearly.push({ year: nextPlayer.age - 1, totalIncome: income, totalExpenses: expense, incomeByCategory: breakdown });
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
    const eventText = await generateWeeklyEvent(nextPlayer.age, "Actor", nextPlayer.stats.fame);
    logsToAdd.push({ msg: eventText, type: 'neutral' });

    const weeklyNews = generateWeeklyNews(nextPlayer);
    nextPlayer.news = [...weeklyNews, ...nextPlayer.news].slice(0, 50);

    const weeklyInsta = generateWeeklyFeed(nextPlayer);
    // CRITICAL FIX: Limit Instagram Feed History to prevent overflow
    nextPlayer.instagram.feed = [...weeklyInsta, ...nextPlayer.instagram.feed].slice(0, 50);

    // Limit social history (User Posts) to prevent bloat (e.g. 200 posts)
    if (nextPlayer.instagram?.posts && nextPlayer.instagram.posts.length > 200) {
        nextPlayer.instagram.posts = nextPlayer.instagram.posts.slice(0, 200);
    }
    if (nextPlayer.x?.posts && nextPlayer.x.posts.length > 200) {
        nextPlayer.x.posts = nextPlayer.x.posts.slice(0, 200);
    }

    if (nextPlayer.team.agent) {
        const agentOffer = generateAgentOffers(nextPlayer);
        if (agentOffer) nextPlayer.inbox.unshift({ id: `offer_${Date.now()}`, sender: nextPlayer.team.agent.name, subject: `Audition: ${agentOffer.projectName}`, text: "New role for you.", type: 'OFFER_ROLE', data: agentOffer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 2 });
    }
    
    if (nextPlayer.team.manager) {
        const lastOfferWeek = nextPlayer.flags.lastSponsorshipOfferWeek || 0;
        const managerTier = nextPlayer.team.manager.tier;
        
        // Dynamic cooldown based on manager tier
        let minCooldown = 5;
        if (managerTier === 'STANDARD') minCooldown = 3;
        if (managerTier === 'ELITE') minCooldown = 2;
        
        if (nextPlayer.currentWeek - lastOfferWeek >= minCooldown + Math.floor(Math.random() * 3)) {
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
        }
    }

    const directOffer = generateDirectOffer(nextPlayer);
    if (directOffer) {
        nextPlayer.inbox.unshift({ id: `direct_${Date.now()}`, sender: "Studio Casting", subject: `Direct Offer: ${directOffer.projectName}`, text: `We want you for the lead.`, type: 'OFFER_ROLE', data: directOffer, isRead: false, weekSent: nextPlayer.currentWeek, expiresIn: 4 });
        logsToAdd.push({ msg: `⭐ You received a direct offer for "${directOffer.projectName}"!`, type: 'positive' });
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
