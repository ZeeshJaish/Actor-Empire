
import { Agent, Manager, Player, SponsorshipOffer, SponsorshipCategory, SponsorshipActionType, AuditionOpportunity, BudgetTier, ProjectType, SponsorshipFrequency, TeamMember } from '../types';
import { generateAudition } from './roleLogic'; // We will export this helper from roleLogic
import { getNextFamousMovie, createFamousOpportunity } from './famousMovieLogic';
import { generateRandomUniverseOpportunity } from './universeLogic';
import { calculateYoutubeCreatorScore, getYoutubePublicImageLabel } from './youtubeLogic';
import { getPlayerLanguage } from './i18n';
import { getAbsoluteWeek } from './legacyLogic';

// --- AGENT CATALOG ---
export const AGENT_CATALOG: Agent[] = [
    // ROOKIE
    {
        id: 'agent_rookie_1', name: 'Barney "Big Shot" Miller', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_rookie_1.description',
        annualFee: 50000, commission: 0.18, specialty: 'BALANCED', tier: 'ROOKIE', studioAccess: 'LOW'
    },
    {
        id: 'agent_rookie_2', name: 'Stacy from High School', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_rookie_2.description',
        annualFee: 40000, commission: 0.20, specialty: 'TV', tier: 'ROOKIE', studioAccess: 'LOW'
    },
    {
        id: 'agent_rookie_3', name: 'Gary "The Hustler"', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_rookie_3.description',
        annualFee: 60000, commission: 0.15, specialty: 'BALANCED', tier: 'ROOKIE', studioAccess: 'LOW'
    },

    // STANDARD
    {
        id: 'agent_std_1', name: 'Sarah Jenkins', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_std_1.description',
        annualFee: 250000, commission: 0.12, specialty: 'TV', tier: 'STANDARD', studioAccess: 'MID'
    },
    {
        id: 'agent_std_2', name: 'Marcus Kane', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_std_2.description',
        annualFee: 300000, commission: 0.12, specialty: 'FILM', tier: 'STANDARD', studioAccess: 'MID'
    },
    {
        id: 'agent_std_3', name: 'Javier & Associates', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_std_3.description',
        annualFee: 280000, commission: 0.13, specialty: 'BALANCED', tier: 'STANDARD', studioAccess: 'MID'
    },
    {
        id: 'agent_std_4', name: 'Lisa Vance', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_std_4.description',
        annualFee: 350000, commission: 0.11, specialty: 'BALANCED', tier: 'STANDARD', studioAccess: 'MID'
    },

    // ELITE
    {
        id: 'agent_elite_1', name: 'Vantage Talent', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_elite_1.description',
        annualFee: 1500000, commission: 0.10, specialty: 'BALANCED', tier: 'ELITE', studioAccess: 'HIGH'
    },
    {
        id: 'agent_elite_2', name: 'Creative Artists United', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_elite_2.description',
        annualFee: 2000000, commission: 0.10, specialty: 'FILM', tier: 'ELITE', studioAccess: 'HIGH'
    },
    {
        id: 'agent_elite_3', name: 'Samantha Power', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_elite_3.description',
        annualFee: 1800000, commission: 0.11, specialty: 'BALANCED', tier: 'ELITE', studioAccess: 'HIGH'
    },

    // LEGEND
    {
        id: 'agent_legend_1', name: 'Ari Golding', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_legend_1.description',
        annualFee: 10000000, commission: 0.10, specialty: 'BALANCED', tier: 'LEGEND', studioAccess: 'HIGH'
    },
    {
        id: 'agent_legend_2', name: 'The Agency', 
        description: '', descriptionKey: 'services.teamLogic.agent.agent_legend_2.description',
        annualFee: 12000000, commission: 0.08, specialty: 'BALANCED', tier: 'LEGEND', studioAccess: 'HIGH'
    }
];

// --- MANAGER CATALOG ---
export const MANAGER_CATALOG: Manager[] = [
    // ROOKIE
    {
        id: 'mgr_rookie_1', name: 'Cousin Vinny', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_rookie_1.description',
        annualFee: 75000, commission: 0.20, tier: 'ROOKIE', sponsorshipPower: 2
    },
    {
        id: 'mgr_rookie_2', name: 'Momager Karen', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_rookie_2.description',
        annualFee: 50000, commission: 0.20, tier: 'ROOKIE', sponsorshipPower: 1
    },
    
    // STANDARD
    {
        id: 'mgr_std_1', name: 'PR Solutions', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_std_1.description',
        annualFee: 200000, commission: 0.15, tier: 'STANDARD', sponsorshipPower: 5
    },
    {
        id: 'mgr_std_2', name: 'Image Craft', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_std_2.description',
        annualFee: 180000, commission: 0.16, tier: 'STANDARD', sponsorshipPower: 4
    },
    {
        id: 'mgr_std_3', name: 'Michael Scott Mgmt', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_std_3.description',
        annualFee: 220000, commission: 0.15, tier: 'STANDARD', sponsorshipPower: 6
    },

    // ELITE
    {
        id: 'mgr_elite_1', name: 'Icon Management', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_elite_1.description',
        annualFee: 800000, commission: 0.10, tier: 'ELITE', sponsorshipPower: 9
    },
    {
        id: 'mgr_elite_2', name: 'Alpha Strategies', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_elite_2.description',
        annualFee: 950000, commission: 0.10, tier: 'ELITE', sponsorshipPower: 8
    },
    {
        id: 'mgr_elite_3', name: 'Elena "The Fixer" Cruz', 
        description: '', descriptionKey: 'services.teamLogic.manager.mgr_elite_3.description',
        annualFee: 1200000, commission: 0.12, tier: 'ELITE', sponsorshipPower: 10
    }
];

// --- TRAINER CATALOG ---
export const TRAINER_CATALOG: TeamMember[] = [
    {
        id: 'train_rookie', name: 'Iron Gym Basics', type: 'TRAINER', tier: 'ROOKIE', weeklyCost: 200, 
        description: '', descriptionKey: 'services.teamLogic.member.train_rookie.description', perks: '', perksKey: 'services.teamLogic.member.train_rookie.perks'
    },
    {
        id: 'train_std', name: 'Celebrity Fitness', type: 'TRAINER', tier: 'STANDARD', weeklyCost: 1000, 
        description: '', descriptionKey: 'services.teamLogic.member.train_std.description', perks: '', perksKey: 'services.teamLogic.member.train_std.perks'
    },
    {
        id: 'train_elite', name: 'Spartan Elite', type: 'TRAINER', tier: 'ELITE', weeklyCost: 3500, 
        description: '', descriptionKey: 'services.teamLogic.member.train_elite.description', perks: '', perksKey: 'services.teamLogic.member.train_elite.perks'
    },
    {
        id: 'train_legend', name: 'Gunnar P.', type: 'TRAINER', tier: 'LEGEND', weeklyCost: 10000, 
        description: '', descriptionKey: 'services.teamLogic.member.train_legend.description', perks: '', perksKey: 'services.teamLogic.member.train_legend.perks'
    }
];

// --- THERAPIST CATALOG ---
export const THERAPIST_CATALOG: TeamMember[] = [
    {
        id: 'ther_rookie', name: 'BetterHelp App', type: 'THERAPIST', tier: 'ROOKIE', weeklyCost: 100, 
        description: '', descriptionKey: 'services.teamLogic.member.ther_rookie.description', perks: '', perksKey: 'services.teamLogic.member.ther_rookie.perks'
    },
    {
        id: 'ther_std', name: 'Mindful Space', type: 'THERAPIST', tier: 'STANDARD', weeklyCost: 800, 
        description: '', descriptionKey: 'services.teamLogic.member.ther_std.description', perks: '', perksKey: 'services.teamLogic.member.ther_std.perks'
    },
    {
        id: 'ther_elite', name: 'Dr. Sterling', type: 'THERAPIST', tier: 'ELITE', weeklyCost: 2500, 
        description: '', descriptionKey: 'services.teamLogic.member.ther_elite.description', perks: '', perksKey: 'services.teamLogic.member.ther_elite.perks'
    }
];

// --- STYLIST CATALOG ---
export const STYLIST_CATALOG: TeamMember[] = [
    {
        id: 'style_rookie', name: 'Stitch Fix', type: 'STYLIST', tier: 'ROOKIE', weeklyCost: 150, 
        description: '', descriptionKey: 'services.teamLogic.member.style_rookie.description', perks: '', perksKey: 'services.teamLogic.member.style_rookie.perks'
    },
    {
        id: 'style_std', name: 'Vogue Vision', type: 'STYLIST', tier: 'STANDARD', weeklyCost: 1200, 
        description: '', descriptionKey: 'services.teamLogic.member.style_std.description', perks: '', perksKey: 'services.teamLogic.member.style_std.perks'
    },
    {
        id: 'style_elite', name: 'Law Roach-ish', type: 'STYLIST', tier: 'ELITE', weeklyCost: 5000, 
        description: '', descriptionKey: 'services.teamLogic.member.style_elite.description', perks: '', perksKey: 'services.teamLogic.member.style_elite.perks'
    }
];

// --- PUBLICIST CATALOG ---
export const PUBLICIST_CATALOG: TeamMember[] = [
    {
        id: 'pub_rookie', name: 'Spin Doctors', type: 'PUBLICIST', tier: 'ROOKIE', weeklyCost: 300, 
        description: '', descriptionKey: 'services.teamLogic.member.pub_rookie.description', perks: '', perksKey: 'services.teamLogic.member.pub_rookie.perks'
    },
    {
        id: 'pub_std', name: 'Global PR', type: 'PUBLICIST', tier: 'STANDARD', weeklyCost: 1500, 
        description: '', descriptionKey: 'services.teamLogic.member.pub_std.description', perks: '', perksKey: 'services.teamLogic.member.pub_std.perks'
    },
    {
        id: 'pub_elite', name: 'Sunshine Sachs', type: 'PUBLICIST', tier: 'ELITE', weeklyCost: 6000, 
        description: '', descriptionKey: 'services.teamLogic.member.pub_elite.description', perks: '', perksKey: 'services.teamLogic.member.pub_elite.perks'
    }
];

// --- WELLNESS CATALOG ---
export const WELLNESS_CATALOG: TeamMember[] = [
    {
        id: 'well_rookie', name: 'Meal Prep Coach', type: 'WELLNESS', tier: 'ROOKIE', weeklyCost: 250,
        description: '', descriptionKey: 'services.teamLogic.member.well_rookie.description', perks: '', perksKey: 'services.teamLogic.member.well_rookie.perks'
    },
    {
        id: 'well_std', name: 'Private Nutritionist', type: 'WELLNESS', tier: 'STANDARD', weeklyCost: 1200,
        description: '', descriptionKey: 'services.teamLogic.member.well_std.description', perks: '', perksKey: 'services.teamLogic.member.well_std.perks'
    },
    {
        id: 'well_elite', name: 'Medical Concierge', type: 'WELLNESS', tier: 'ELITE', weeklyCost: 4500,
        description: '', descriptionKey: 'services.teamLogic.member.well_elite.description', perks: '', perksKey: 'services.teamLogic.member.well_elite.perks'
    },
    {
        id: 'well_legend', name: 'Longevity Doctor', type: 'WELLNESS', tier: 'LEGEND', weeklyCost: 14000,
        description: '', descriptionKey: 'services.teamLogic.member.well_legend.description', perks: '', perksKey: 'services.teamLogic.member.well_legend.perks'
    }
];

// --- SPONSORSHIP DATA ---
const BRAND_DB: Record<SponsorshipCategory, string[]> = {
    FASHION: ['H&M', 'Zara', 'Gucci', 'Nike', 'Supreme', 'Uniqlo', 'Louis Vuitton', 'Prada', 'Balenciaga', 'Calvin Klein'],
    FITNESS: ['GymShark', 'Peloton', 'Gatorade', 'FitBit', 'Equinox', 'Alo Yoga', 'Lululemon', 'Nike Pro', 'Under Armour'],
    TECH: ['Samsung', 'Sony', 'Apple', 'Bose', 'Logitech', 'Alienware', 'Beats by Dre', 'PlayStation', 'Xbox'],
    BEVERAGE: ['Coca-Cola', 'Pepsi', 'Red Bull', 'Starbucks', 'Nespresso', 'Vitamin Water', 'Monster Energy', 'Heineken', 'Mountain Dew'],
    LUXURY: ['Rolex', 'BMW', 'Chanel', 'Cartier', 'Bentley', 'Tiffany & Co.', 'Patek Philippe', 'Hermès', 'Mercedes-Benz'],
    AUTOMOTIVE: ['Toyota', 'Ford', 'Tesla', 'Honda', 'Mercedes', 'Porsche', 'Audi', 'Chevrolet', 'Lexus']
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- HELPERS ---
const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

const getHiredTeamIds = (player: Player): Set<string> => new Set([
    player.team?.agent?.id,
    player.team?.manager?.id,
    player.team?.personalTrainer?.id,
    player.team?.stylist?.id,
    player.team?.therapist?.id,
    player.team?.publicist?.id,
    player.team?.wellness?.id,
].filter((id): id is string => typeof id === 'string' && id.length > 0));

const withoutHired = <T extends { id: string }>(pool: T[] | undefined, hiredIds: Set<string>): T[] =>
    Array.isArray(pool) ? pool.filter(member => !hiredIds.has(member.id)) : [];

export const sanitizeTeamPools = (player: Player): Player['team'] => {
    const hiredIds = getHiredTeamIds(player);
    return {
        ...player.team,
        availableAgents: withoutHired(player.team?.availableAgents, hiredIds),
        availableManagers: withoutHired(player.team?.availableManagers, hiredIds),
        availableTrainers: withoutHired(player.team?.availableTrainers, hiredIds),
        availableStylists: withoutHired(player.team?.availableStylists, hiredIds),
        availableTherapists: withoutHired(player.team?.availableTherapists, hiredIds),
        availablePublicists: withoutHired(player.team?.availablePublicists, hiredIds),
        availableWellness: withoutHired(player.team?.availableWellness, hiredIds),
    };
};

export const getRandomAgents = (count: number, excludeIds: string[] = []): Agent[] => {
    const excluded = new Set(excludeIds);
    return shuffle(AGENT_CATALOG.filter(agent => !excluded.has(agent.id))).slice(0, count);
};

export const getRandomManagers = (count: number, excludeIds: string[] = []): Manager[] => {
    const excluded = new Set(excludeIds);
    return shuffle(MANAGER_CATALOG.filter(manager => !excluded.has(manager.id))).slice(0, count);
};

export const getRandomTrainers = (count: number, excludeIds: string[] = []): TeamMember[] => {
    const excluded = new Set(excludeIds);
    return shuffle(TRAINER_CATALOG.filter(member => !excluded.has(member.id))).slice(0, count);
};

export const getRandomTherapists = (count: number, excludeIds: string[] = []): TeamMember[] => {
    const excluded = new Set(excludeIds);
    return shuffle(THERAPIST_CATALOG.filter(member => !excluded.has(member.id))).slice(0, count);
};

export const getRandomStylists = (count: number, excludeIds: string[] = []): TeamMember[] => {
    const excluded = new Set(excludeIds);
    return shuffle(STYLIST_CATALOG.filter(member => !excluded.has(member.id))).slice(0, count);
};

export const getRandomPublicists = (count: number, excludeIds: string[] = []): TeamMember[] => {
    const excluded = new Set(excludeIds);
    return shuffle(PUBLICIST_CATALOG.filter(member => !excluded.has(member.id))).slice(0, count);
};

export const getRandomWellness = (count: number, excludeIds: string[] = []): TeamMember[] => {
    const excluded = new Set(excludeIds);
    return shuffle(WELLNESS_CATALOG.filter(member => !excluded.has(member.id))).slice(0, count);
};

// --- OFFER GENERATORS ---

export const generateAgentOffers = (player: Player): AuditionOpportunity | null => {
    const agent = player.team.agent;
    if (!agent) return null;

    // --- DYNAMIC AVAILABILITY CHECK ---
    // Check if player is already in PRE_PRODUCTION or PRODUCTION of a HIGH budget movie
    const hasActiveBlockbuster = player.commitments.some(c => 
        c.type === 'ACTING_GIG' && 
        c.projectDetails?.budgetTier === 'HIGH' &&
        (c.projectPhase === 'PRE_PRODUCTION' || c.projectPhase === 'PRODUCTION')
    );

    // Chance to generate offer based on tier
    let chance = 0;
    switch (agent.tier) {
        case 'ROOKIE': chance = 0.12; break;
        case 'STANDARD': chance = 0.15; break;
        case 'ELITE': chance = 0.20; break;
        case 'LEGEND': chance = 0.25; break;
    }

    if (Math.random() > chance) return null;

    // --- PREMIUM CONTENT CHECK (FAMOUS / UNIVERSE) ---
    // Expanded to STANDARD agents (small chance)
    if (['STANDARD', 'ELITE', 'LEGEND'].includes(agent.tier)) {
        let premiumChance = 0.01; // Standard
        if (agent.tier === 'ELITE') premiumChance = 0.08;
        if (agent.tier === 'LEGEND') premiumChance = 0.20;
        
        // If busy with a blockbuster, drastically reduce premium offers
        const adjustedPremiumChance = hasActiveBlockbuster ? premiumChance * 0.2 : premiumChance;

        if (Math.random() < adjustedPremiumChance) {
            // 1. Try Famous Movie
            if (Math.random() < 0.6) {
                const famousMovie = getNextFamousMovie(player);
                if (famousMovie) {
                    return createFamousOpportunity(famousMovie, 'SUPPORTING', 'AGENT', getPlayerLanguage(player)); // Agents usually get supporting in these big ones first
                }
            } 
            // 2. Try Universe Role
            else {
                const universeOpp = generateRandomUniverseOpportunity(player, 'AGENT');
                if (universeOpp) return universeOpp;
            }
        }
    }

    // --- STANDARD OFFER GENERATION ---
    // Determine Offer Quality based on Agent + Player Fame
    let tier: BudgetTier = 'LOW';
    if (agent.studioAccess === 'MID' && Math.random() > 0.4) tier = 'MID';
    if (agent.studioAccess === 'HIGH') {
        const roll = Math.random();
        // If already busy with a blockbuster, FORCE low/mid tier offers mostly (80% chance)
        if (hasActiveBlockbuster && roll > 0.2) {
            tier = Math.random() > 0.5 ? 'MID' : 'LOW';
        } else if (!hasActiveBlockbuster && roll > 0.6) {
            tier = 'HIGH'; // Normal chance if free
        } else if (!hasActiveBlockbuster && roll > 0.2) {
            tier = 'MID';
        }
    }

    // Role Type Bias
    const roleRoll = Math.random();
    let roleType: any = 'SUPPORTING';
    if (roleRoll > 0.7) roleType = 'LEAD';
    else if (roleRoll > 0.4) roleType = 'ENSEMBLE';
    else roleType = 'SUPPORTING';

    // NEW: Type Logic based on Specialty
    let type: ProjectType = 'MOVIE';
    if (agent.specialty === 'TV') {
        type = Math.random() > 0.2 ? 'SERIES' : 'MOVIE'; // 80% TV
    } else if (agent.specialty === 'FILM') {
        type = Math.random() > 0.1 ? 'MOVIE' : 'SERIES'; // 90% Film
    } else {
        type = Math.random() > 0.5 ? 'MOVIE' : 'SERIES'; // 50/50
    }

    const usedTitles = [...player.commitments.map(c => c.name), ...player.activeReleases.map(r => r.name)];
    
    return generateAudition(roleType, tier, usedTitles, player, 'AGENT', type);
};


export const generateManagerOffer = (player: Player): SponsorshipOffer | null => {
    const manager = player.team.manager;
    if (!manager) return null;

    // Chance based on Manager Power + Player Fame
    // Need at least some fame for sponsorships
    if (player.stats.fame < 5) return null;

    // Limit active sponsorships to prevent overwhelming the player
    if (player.activeSponsorships.length >= 3) return null;

    // Frequency Check is done in gameLoop.ts.
    
    const managerPower = manager.sponsorshipPower; // 1-10
    const pityBonus = player.flags.sponsorshipPity || 0;
    const creatorScore = calculateYoutubeCreatorScore(player);
    const creatorImage = getYoutubePublicImageLabel(player);
    const creatorPull = player.youtube?.subscribers >= 10000 ? Math.max(-8, Math.min(12, (creatorScore - 50) * 0.22)) : 0;
    
    // Base chance: Rookie (1) = ~18%, Elite (10) = 50%
    // Pity bonus adds 5% per week without an offer
    const successChance = 15 + (managerPower * 3.5) + (pityBonus * 5) + creatorPull;
    
    if ((Math.random() * 100) > successChance) return null;

    // Pick Category based on Fame/Manager
    const categories: SponsorshipCategory[] = ['FASHION', 'FITNESS', 'BEVERAGE'];
    if (player.stats.fame > 40) categories.push('TECH', 'AUTOMOTIVE');
    if (player.stats.fame > 70) categories.push('LUXURY');
    if (creatorScore > 65 || player.youtube?.creatorIdentity === 'LIFESTYLE_ICON') categories.push('TECH', 'LUXURY');
    if (creatorImage === 'Volatile' || creatorImage === 'Risky Bet') categories.push('BEVERAGE');

    const cat = pick(categories);
    const brand = pick(BRAND_DB[cat]);

    // Requirements & Type Logic
    // Higher paying deals have harder requirements
    const typeRoll = Math.random();
    let type: SponsorshipActionType = 'POST';
    let energyCost = 10;
    
    if (typeRoll > 0.8) {
        type = 'SHOOT'; // Ad Shoot
        energyCost = 30; // High energy
    } else {
        type = 'POST'; // Social Post
        energyCost = 10;
    }

    // Duration: 8-20 weeks
    const duration = 8 + Math.floor(Math.random() * 12); 
    
    // Calculate Total Required for contract (e.g., 1 post per week approx)
    const totalRequired = duration; // 1 per week standard

    // --- UPDATED PAY CALCULATION (Balanced) ---
    const fame = player.stats.fame;
    let baseWeekly = 0;

    // TIERED PAY SCALE
    if (fame < 20) {
        // Rookie: $500 - $1,500 per week
        baseWeekly = 500 + (fame * 50); 
    } else if (fame < 50) {
        // Rising Star: $2,000 - $8,000 per week
        baseWeekly = 2000 + ((fame - 20) * 200);
    } else if (fame < 80) {
        // A-List: $10,000 - $40,000 per week
        baseWeekly = 10000 + ((fame - 50) * 1000);
    } else {
        // Icon: $50,000 - $150,000 per week (Excellent but not movie replacement)
        baseWeekly = 50000 + ((fame - 80) * 5000);
    }

    // Follower Bonus (Small kicker on top)
    const followerBonus = Math.floor(player.stats.followers * 0.05); // $0.05 per follower per week
    
    let weeklyPay = baseWeekly + followerBonus;
    if (player.youtube?.subscribers >= 10000) {
        const creatorPayMultiplier = 0.88 + Math.min(0.34, creatorScore / 250);
        weeklyPay = Math.floor(weeklyPay * creatorPayMultiplier);
    }

    // Manager Multiplier (Power 1-10 -> 0.8x to 1.5x)
    const managerMult = 0.8 + (manager.sponsorshipPower * 0.07);
    weeklyPay = Math.floor(weeklyPay * managerMult);

    if (type === 'SHOOT') weeklyPay *= 1.5;

    // Exclusivity logic: High tier brands want exclusivity
    const isLuxury = ['LUXURY', 'AUTOMOTIVE', 'TECH'].includes(cat);
    const isExclusive = isLuxury || Math.random() > 0.7;
    
    if (isExclusive) weeklyPay *= 2.0;

    // Penalty Calculation (High risk for high reward)
    const penalty = Math.floor(weeklyPay * 4.0); // 1 month worth of pay as penalty

    return {
        id: `spon_offer_${Date.now()}_${Math.random()}`,
        brandName: brand,
        category: cat,
        weeklyPay,
        durationWeeks: duration,
        // Updated Requirements Structure
        requirements: { 
            type, 
            energyCost, 
            totalRequired: totalRequired,
            progress: 0 
        },
        isExclusive,
        penalty,
        description: isExclusive 
            ? `EXCLUSIVE: ${brand} contract. No other ${cat.toLowerCase()} deals allowed.` 
            : `${brand} partnership.`,
        expiresIn: 3
    };
};

export const generateDirectOffer = (player: Player): AuditionOpportunity | null => {
    // Only for high fame/rep players
    const creatorScore = calculateYoutubeCreatorScore(player);
    const publicImage = getYoutubePublicImageLabel(player);
    const creatorOpensDoors = creatorScore >= 76 && publicImage !== 'Volatile';
    if (player.stats.fame < 50 && player.stats.reputation < 60 && !creatorOpensDoors) return null;

    // Cooldown Check (9 Weeks)
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const lastOffer = Number(player.flags.lastDirectOfferAbsoluteWeek || 0);
    if (currentAbsoluteWeek - lastOffer < 9) return null;

    // --- DYNAMIC AVAILABILITY CHECK ---
    const hasActiveBlockbuster = player.commitments.some(c => 
        c.type === 'ACTING_GIG' && 
        c.projectDetails?.budgetTier === 'HIGH' &&
        (c.projectPhase === 'PRE_PRODUCTION' || c.projectPhase === 'PRODUCTION')
    );

    if (hasActiveBlockbuster && Math.random() < 0.8) return null; // 80% reduced chance if busy

    // Increased probability for direct offers (was 0.1)
    const directOfferChance = Math.max(0.12, Math.min(0.42, 0.25 + ((creatorScore - 50) / 250) - (publicImage === 'Volatile' ? 0.12 : 0)));
    if (Math.random() > directOfferChance) return null; 

    // --- PREMIUM DIRECT OFFERS ---
    // If superstar status, chance for direct Famous/Universe invite
    if (player.stats.fame > 70) {
        if (Math.random() < 0.35) { // Increased from 0.25
             // 1. Try Famous Movie
             if (Math.random() < 0.5) {
                const famousMovie = getNextFamousMovie(player);
                if (famousMovie) {
                    return createFamousOpportunity(famousMovie, 'LEAD', 'DIRECT', getPlayerLanguage(player)); // Direct offers are usually Lead
                }
            } 
            // 2. Try Universe Role
            else {
                const universeOpp = generateRandomUniverseOpportunity(player, 'DIRECT');
                if (universeOpp) return universeOpp;
            }
        }
    }

    // --- STANDARD DIRECT OFFER ---
    const tier = player.stats.fame > 80 || (creatorScore >= 82 && player.stats.reputation >= 45) ? 'HIGH' : 'MID';
    const usedTitles = [...player.commitments.map(c => c.name)];
    
    // Direct offers usually follow the player's trend or random
    const type: ProjectType = Math.random() > 0.5 ? 'MOVIE' : 'SERIES';

    return generateAudition('LEAD', tier, usedTitles, player, 'DIRECT', type);
};
