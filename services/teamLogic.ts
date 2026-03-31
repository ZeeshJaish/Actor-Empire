
import { Agent, Manager, Player, SponsorshipOffer, SponsorshipCategory, SponsorshipActionType, AuditionOpportunity, BudgetTier, ProjectType, SponsorshipFrequency, TeamMember } from '../types';
import { generateAudition } from './roleLogic'; // We will export this helper from roleLogic
import { getNextFamousMovie, createFamousOpportunity } from './famousMovieLogic';
import { generateRandomUniverseOpportunity } from './universeLogic';

// --- AGENT CATALOG ---
export const AGENT_CATALOG: Agent[] = [
    // ROOKIE
    {
        id: 'agent_rookie_1', name: 'Barney "Big Shot" Miller', 
        description: 'Works out of his garage. Eager but inexperienced.',
        annualFee: 50000, commission: 0.18, specialty: 'BALANCED', tier: 'ROOKIE', studioAccess: 'LOW'
    },
    {
        id: 'agent_rookie_2', name: 'Stacy from High School', 
        description: 'She has an IMDB Pro account and a lot of energy.',
        annualFee: 40000, commission: 0.20, specialty: 'TV', tier: 'ROOKIE', studioAccess: 'LOW'
    },
    {
        id: 'agent_rookie_3', name: 'Gary "The Hustler"', 
        description: 'Primarily books mattress commercials, but he tries.',
        annualFee: 60000, commission: 0.15, specialty: 'BALANCED', tier: 'ROOKIE', studioAccess: 'LOW'
    },

    // STANDARD
    {
        id: 'agent_std_1', name: 'Sarah Jenkins', 
        description: 'Solid connections in TV networks. Great for steady series work.',
        annualFee: 250000, commission: 0.12, specialty: 'TV', tier: 'STANDARD', studioAccess: 'MID'
    },
    {
        id: 'agent_std_2', name: 'Marcus Kane', 
        description: 'Focuses on indie films and festival darlings.',
        annualFee: 300000, commission: 0.12, specialty: 'FILM', tier: 'STANDARD', studioAccess: 'MID'
    },
    {
        id: 'agent_std_3', name: 'Javier & Associates', 
        description: 'A boutique agency with a reputation for finding diverse roles.',
        annualFee: 280000, commission: 0.13, specialty: 'BALANCED', tier: 'STANDARD', studioAccess: 'MID'
    },
    {
        id: 'agent_std_4', name: 'Lisa Vance', 
        description: 'Former casting director turned agent. She knows everyone.',
        annualFee: 350000, commission: 0.11, specialty: 'BALANCED', tier: 'STANDARD', studioAccess: 'MID'
    },

    // ELITE
    {
        id: 'agent_elite_1', name: 'Vantage Talent', 
        description: 'High-end corporate agency. They get you in the room.',
        annualFee: 1500000, commission: 0.10, specialty: 'BALANCED', tier: 'ELITE', studioAccess: 'HIGH'
    },
    {
        id: 'agent_elite_2', name: 'Creative Artists United', 
        description: 'The machine. You are just a number, but a rich number.',
        annualFee: 2000000, commission: 0.10, specialty: 'FILM', tier: 'ELITE', studioAccess: 'HIGH'
    },
    {
        id: 'agent_elite_3', name: 'Samantha Power', 
        description: 'Ruthless negotiator. Known for getting back-end points.',
        annualFee: 1800000, commission: 0.11, specialty: 'BALANCED', tier: 'ELITE', studioAccess: 'HIGH'
    },

    // LEGEND
    {
        id: 'agent_legend_1', name: 'Ari Golding', 
        description: 'The shark. If he calls, you pick up. Only for stars.',
        annualFee: 10000000, commission: 0.10, specialty: 'BALANCED', tier: 'LEGEND', studioAccess: 'HIGH'
    },
    {
        id: 'agent_legend_2', name: 'The Agency', 
        description: 'An invite-only collective of the industry\'s top power brokers.',
        annualFee: 12000000, commission: 0.08, specialty: 'BALANCED', tier: 'LEGEND', studioAccess: 'HIGH'
    }
];

// --- MANAGER CATALOG ---
export const MANAGER_CATALOG: Manager[] = [
    // ROOKIE
    {
        id: 'mgr_rookie_1', name: 'Cousin Vinny', 
        description: 'He managed a band once in the 90s.',
        annualFee: 75000, commission: 0.20, tier: 'ROOKIE', sponsorshipPower: 2
    },
    {
        id: 'mgr_rookie_2', name: 'Momager Karen', 
        description: 'She means well, but sends emails in Comic Sans.',
        annualFee: 50000, commission: 0.20, tier: 'ROOKIE', sponsorshipPower: 1
    },
    
    // STANDARD
    {
        id: 'mgr_std_1', name: 'PR Solutions', 
        description: 'Professional representation for working actors.',
        annualFee: 200000, commission: 0.15, tier: 'STANDARD', sponsorshipPower: 5
    },
    {
        id: 'mgr_std_2', name: 'Image Craft', 
        description: 'Good at cleaning up scandals and booking local ads.',
        annualFee: 180000, commission: 0.16, tier: 'STANDARD', sponsorshipPower: 4
    },
    {
        id: 'mgr_std_3', name: 'Michael Scott Mgmt', 
        description: 'Passionate about branding. Very hands-on.',
        annualFee: 220000, commission: 0.15, tier: 'STANDARD', sponsorshipPower: 6
    },

    // ELITE
    {
        id: 'mgr_elite_1', name: 'Icon Management', 
        description: 'They turn actors into global brands.',
        annualFee: 800000, commission: 0.10, tier: 'ELITE', sponsorshipPower: 9
    },
    {
        id: 'mgr_elite_2', name: 'Alpha Strategies', 
        description: 'Focuses on long-term wealth and luxury partnerships.',
        annualFee: 950000, commission: 0.10, tier: 'ELITE', sponsorshipPower: 8
    },
    {
        id: 'mgr_elite_3', name: 'Elena "The Fixer" Cruz', 
        description: 'She can get you a Vogue cover and a coffee deal in one afternoon.',
        annualFee: 1200000, commission: 0.12, tier: 'ELITE', sponsorshipPower: 10
    }
];

// --- TRAINER CATALOG ---
export const TRAINER_CATALOG: TeamMember[] = [
    {
        id: 'train_rookie', name: 'Iron Gym Basics', type: 'TRAINER', tier: 'ROOKIE', weeklyCost: 200, 
        description: 'A local gym trainer. Prevents minor decay.', perks: 'Stops 50% Body decay'
    },
    {
        id: 'train_std', name: 'Celebrity Fitness', type: 'TRAINER', tier: 'STANDARD', weeklyCost: 1000, 
        description: 'Works with TV stars. Keeps you in shape.', perks: 'Stops 100% Body decay'
    },
    {
        id: 'train_elite', name: 'Spartan Elite', type: 'TRAINER', tier: 'ELITE', weeklyCost: 3500, 
        description: 'Transformation specialists for blockbusters.', perks: 'Stops decay + Adds Body Stat'
    },
    {
        id: 'train_legend', name: 'Gunnar P.', type: 'TRAINER', tier: 'LEGEND', weeklyCost: 10000, 
        description: 'The guy who trains superheroes.', perks: 'Max Stats + High Energy'
    }
];

// --- THERAPIST CATALOG ---
export const THERAPIST_CATALOG: TeamMember[] = [
    {
        id: 'ther_rookie', name: 'BetterHelp App', type: 'THERAPIST', tier: 'ROOKIE', weeklyCost: 100, 
        description: 'Online counseling.', perks: 'Stops 50% Happiness decay'
    },
    {
        id: 'ther_std', name: 'Mindful Space', type: 'THERAPIST', tier: 'STANDARD', weeklyCost: 800, 
        description: 'Private practice in Silver Lake.', perks: 'Stops 100% Happiness decay'
    },
    {
        id: 'ther_elite', name: 'Dr. Sterling', type: 'THERAPIST', tier: 'ELITE', weeklyCost: 2500, 
        description: 'Renowned psychologist to the stars.', perks: 'Stops decay + Adds Happiness'
    }
];

// --- STYLIST CATALOG ---
export const STYLIST_CATALOG: TeamMember[] = [
    {
        id: 'style_rookie', name: 'Stitch Fix', type: 'STYLIST', tier: 'ROOKIE', weeklyCost: 150, 
        description: 'Box subscription styling.', perks: 'Stops 50% Looks decay'
    },
    {
        id: 'style_std', name: 'Vogue Vision', type: 'STYLIST', tier: 'STANDARD', weeklyCost: 1200, 
        description: 'Red carpet ready looks.', perks: 'Stops 100% Looks decay'
    },
    {
        id: 'style_elite', name: 'Law Roach-ish', type: 'STYLIST', tier: 'ELITE', weeklyCost: 5000, 
        description: 'Image architect. Changes careers.', perks: 'Stops decay + Adds Looks + Rep'
    }
];

// --- PUBLICIST CATALOG ---
export const PUBLICIST_CATALOG: TeamMember[] = [
    {
        id: 'pub_rookie', name: 'Spin Doctors', type: 'PUBLICIST', tier: 'ROOKIE', weeklyCost: 300, 
        description: 'Gets your name in local papers.', perks: 'Stops 50% Fame decay'
    },
    {
        id: 'pub_std', name: 'Global PR', type: 'PUBLICIST', tier: 'STANDARD', weeklyCost: 1500, 
        description: 'Solid damage control and booking.', perks: 'Stops 100% Fame decay'
    },
    {
        id: 'pub_elite', name: 'Sunshine Sachs', type: 'PUBLICIST', tier: 'ELITE', weeklyCost: 6000, 
        description: 'They control the narrative completely.', perks: 'Stops decay + Passive Fame'
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

export const getRandomAgents = (count: number): Agent[] => {
    const shuffled = [...AGENT_CATALOG].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export const getRandomManagers = (count: number): Manager[] => {
    const shuffled = [...MANAGER_CATALOG].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

export const getRandomTrainers = (count: number): TeamMember[] => {
    return [...TRAINER_CATALOG].sort(() => 0.5 - Math.random()).slice(0, count);
};

export const getRandomTherapists = (count: number): TeamMember[] => {
    return [...THERAPIST_CATALOG].sort(() => 0.5 - Math.random()).slice(0, count);
};

export const getRandomStylists = (count: number): TeamMember[] => {
    return [...STYLIST_CATALOG].sort(() => 0.5 - Math.random()).slice(0, count);
};

export const getRandomPublicists = (count: number): TeamMember[] => {
    return [...PUBLICIST_CATALOG].sort(() => 0.5 - Math.random()).slice(0, count);
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
                    return createFamousOpportunity(famousMovie, 'SUPPORTING', 'AGENT'); // Agents usually get supporting in these big ones first
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
    
    // Base chance: Rookie (1) = ~18%, Elite (10) = 50%
    // Pity bonus adds 5% per week without an offer
    const successChance = 15 + (managerPower * 3.5) + (pityBonus * 5);
    
    if ((Math.random() * 100) > successChance) return null;

    // Pick Category based on Fame/Manager
    const categories: SponsorshipCategory[] = ['FASHION', 'FITNESS', 'BEVERAGE'];
    if (player.stats.fame > 40) categories.push('TECH', 'AUTOMOTIVE');
    if (player.stats.fame > 70) categories.push('LUXURY');

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
    if (player.stats.fame < 50 && player.stats.reputation < 60) return null;

    // Cooldown Check (9 Weeks)
    const lastOffer = player.flags.lastDirectOfferWeek || 0;
    if (player.currentWeek - lastOffer < 9) return null;

    // --- DYNAMIC AVAILABILITY CHECK ---
    const hasActiveBlockbuster = player.commitments.some(c => 
        c.type === 'ACTING_GIG' && 
        c.projectDetails?.budgetTier === 'HIGH' &&
        (c.projectPhase === 'PRE_PRODUCTION' || c.projectPhase === 'PRODUCTION')
    );

    if (hasActiveBlockbuster && Math.random() < 0.8) return null; // 80% reduced chance if busy

    // Increased probability for direct offers (was 0.1)
    if (Math.random() > 0.25) return null; 

    // --- PREMIUM DIRECT OFFERS ---
    // If superstar status, chance for direct Famous/Universe invite
    if (player.stats.fame > 70) {
        if (Math.random() < 0.35) { // Increased from 0.25
             // 1. Try Famous Movie
             if (Math.random() < 0.5) {
                const famousMovie = getNextFamousMovie(player);
                if (famousMovie) {
                    return createFamousOpportunity(famousMovie, 'LEAD', 'DIRECT'); // Direct offers are usually Lead
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
    const tier = player.stats.fame > 80 ? 'HIGH' : 'MID';
    const usedTitles = [...player.commitments.map(c => c.name)];
    
    // Direct offers usually follow the player's trend or random
    const type: ProjectType = Math.random() > 0.5 ? 'MOVIE' : 'SERIES';

    return generateAudition('LEAD', tier, usedTitles, player, 'DIRECT', type);
};
