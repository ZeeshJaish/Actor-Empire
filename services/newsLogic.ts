
import { Player, NewsItem, NewsCategory, ActiveRelease, Commitment, ProjectType, BudgetTier } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { STUDIO_CATALOG } from './studioLogic';
import { AWARD_GOSSIP_TEMPLATES, SNUB_TEMPLATES } from './awardLogic'; // Import templates

// ... (Keep existing TEMPLATES arrays like INDUSTRY_TEMPLATES, NPC_HEADLINES, etc.)
const INDUSTRY_TEMPLATES = [
    "Studio executives report 'franchise fatigue' among younger audiences.",
    "Indie cinema sees a 15% uptick in ticket sales this quarter.",
    "Streaming wars intensify as platforms bid for exclusive rights.",
    "Union negotiations stall, raising fears of a production halt.",
    "International markets becoming the key driver for blockbusters.",
    "Critics declare the 'Age of the Movie Star' is returning.",
    "Horror genre continues to offer highest ROI for studios.",
    "Romantic Comedies making a surprise comeback this season.",
    "VFX artists protest over tight deadlines on major tentpoles."
];

const NPC_HEADLINES = [
    "{Name} attached to star in upcoming biopic.",
    "{Name} exits project project due to 'creative differences'.",
    "{Name} signs first-look deal with Warner Bros.",
    "Rumors swirl around {Name} casting in superhero franchise.",
    "{Name} spotted scouting locations in Italy.",
    "Critics praise {Name}'s transformation in latest role."
];

const HIT_HEADLINES = [
    "'{Title}' dominates the box office for a second week.",
    "Audiences flock to '{Title}', defying analyst predictions.",
    "'{Title}' becomes a cultural phenomenon.",
    "Global box office ignited by '{Title}'.",
    "'{Title}' set to break quarterly records."
];

const UNIVERSE_HIT_HEADLINES = [
    "'{Title}' proves the cinematic universe is stronger than ever.",
    "Fans are calling '{Title}' the best entry in the franchise yet.",
    "Box office explodes as '{Title}' expands the universe's lore.",
    "'{Title}' sets up the next major crossover event perfectly."
];

const FLOP_HEADLINES = [
    "'{Title}' stumbles out of the gate with weak opening.",
    "Budget concerns loom as '{Title}' underperforms.",
    "'{Title}' struggles to connect with core demographic.",
    "Marketing misfire blamed for '{Title}' disappointment.",
    "The fall of '{Title}': What went wrong?"
];

const UNIVERSE_FLOP_HEADLINES = [
    "Is franchise fatigue setting in? '{Title}' underperforms.",
    "'{Title}' fails to capture the magic of previous universe entries.",
    "Fans disappointed by '{Title}', questioning the universe's direction.",
    "A rare misstep for the franchise as '{Title}' bombs at the box office."
];

const CRITIC_LOVED_HEADLINES = [
    "Critics hail '{Title}' as a modern masterpiece.",
    "'{Title}' generates early Oscar buzz.",
    "A stunning achievement: '{Title}' wins over skeptics.",
    "'{Title}' is the critical darling of the season."
];

const UNIVERSE_CRITIC_LOVED_HEADLINES = [
    "Critics praise '{Title}' for elevating the entire franchise.",
    "'{Title}' proves superhero movies can be high art.",
    "A masterclass in world-building: '{Title}' stuns reviewers.",
    "'{Title}' successfully balances fan service with a gripping narrative."
];

const CRITIC_HATED_HEADLINES = [
    "Critics tear apart '{Title}' for weak script.",
    "'{Title}' branded a 'confused mess' by top reviewers.",
    "Style over substance: '{Title}' fails to impress.",
    "Reviewers call '{Title}' a missed opportunity."
];

const UNIVERSE_CRITIC_HATED_HEADLINES = [
    "Critics pan '{Title}' as a soulless cash grab.",
    "'{Title}' relies too heavily on cameos, ignoring the plot.",
    "A confusing mess of lore: '{Title}' alienates casual viewers.",
    "Reviewers say '{Title}' is a sign the universe has lost its way."
];

// --- NEW SEQUEL / DRAMA HEADLINES ---
const SEQUEL_HYPE_HEADLINES = [
    "Fans demand a sequel to '{Title}' on social media.",
    "Online buzz grows around possible '{Title}' cinematic universe.",
    "Audiences want more from the '{Title}' world.",
    "Is '{Title}' the start of a new franchise? Fans think so.",
    "Hashtag #WeWant{Title}2 trending worldwide.",
    "Speculation mounts over '{Title}' follow-up."
];

const SEQUEL_CONFIRMED_HEADLINES = [
    "IT'S OFFICIAL: Studio greenlights '{Title}' sequel.",
    "'{Title} 2' is happening! Pre-production starts soon.",
    "Studio confirms return to the world of '{Title}'.",
    "Franchise alert! '{Title}' sequel officially announced."
];

const SCANDAL_HEADLINES = [
    "BREAKING: {Name} caught in a whirlwind of controversy.",
    "Is this the end for {Name}? New allegations surface.",
    "Social media erupts as {Name}'s past comes to light.",
    "Brands distance themselves from {Name} after recent events.",
    "Exclusive: The shocking truth behind {Name}'s latest scandal.",
    "Public opinion of {Name} takes a sharp dive.",
    "Fans divided as {Name} faces intense scrutiny."
];

const LEGAL_HEADLINES = [
    "Legal battle looms for {Name} as court date set.",
    "Inside the courtroom: {Name}'s high-stakes legal drama.",
    "Will {Name} settle? Experts weigh in on the ongoing case.",
    "A blow to {Name}'s career as legal troubles mount.",
    "The verdict is in: How {Name}'s case will change everything.",
    "Government audit targets {Name}'s financial dealings.",
    "Underworld connections? Rumors swirl around {Name}'s latest case."
];

const SEQUEL_CANCELLED_HEADLINES = [
    "Studio confirms '{Title}' will be a standalone film.",
    "No plans for '{Title}' sequel despite fan requests.",
    "'{Title}' universe plans scrapped by studio executives.",
    "The story of '{Title}' ends here, says producer."
];

const NEGOTIATION_FAIL_HEADLINES = [
    "Talks break down for '{Title}' sequel return.",
    "Studio and lead actor fail to agree on terms for '{Title} 2'.",
    "'{Title}' sequel in jeopardy as salary negotiations stall.",
    "Actor reportedly walks away from '{Title}' franchise offer."
];

const FAN_BACKLASH_HEADLINES = [
    "Fans outraged over '{Title}' casting rumors.",
    "Social media campaign demands original star return for '{Title} 2'.",
    "Studio facing backlash after failed '{Title}' negotiations.",
    "Boycott threats loom over '{Title}' sequel without original lead."
];

// --- TV RENEWAL HEADLINES ---
const TV_RENEWAL_HEADLINES = [
    "'{Title}' renewed for another season!",
    "Network gives green light to '{Title}' Season {Season}.",
    "Fans rejoice: '{Title}' will return.",
    "'{Title}' secures renewal after strong ratings."
];

const TV_CANCELLATION_HEADLINES = [
    "'{Title}' cancelled after {Season} season(s).",
    "Network pulls the plug on '{Title}'.",
    "'{Title}' will not return for another season.",
    "Shock cancellation: '{Title}' ends."
];

// --- FORBES TEMPLATES ---
const FORBES_RISE_HEADLINES = [
    "{Name} climbs the wealth ladder, now ranked #{Rank}.",
    "Financial upswing: {Name} jumps to #{Rank} on Forbes list.",
    "Smart investments pay off for {Name} (Rank #{Rank}).",
    "{Name}'s net worth surges, overtaking industry veterans."
];

const FORBES_DROP_HEADLINES = [
    "{Name} slips in rankings to #{Rank}.",
    "Stagnant earnings see {Name} drop to #{Rank}.",
    "{Name} falls behind in the race for Hollywood's richest.",
    "Forbes update: {Name} slides down the list."
];

const FORBES_ENTRY_HEADLINES = [
    "Forbes Debut: {Name} enters the list at #{Rank}.",
    "New Money: {Name} is Hollywood's newest rich lister.",
    "Welcome to the club: {Name} makes the Forbes cut."
];

const FORBES_TOP_10_HEADLINES = [
    "ELITE STATUS: {Name} breaks into the Forbes Top 10.",
    "The 1%: {Name} is now one of the 10 richest actors.",
    "Power Move: {Name} joins the Top 10 wealth bracket."
];

const FORBES_NUMBER_ONE_HEADLINES = [
    "THE KING: {Name} is officially the richest actor in the world.",
    "New #1: {Name} tops the Forbes Rich List.",
    "Billion Dollar Baby: {Name} sits on the iron throne of wealth."
];

const FORBES_INDUSTRY_HEADLINES = [
    "Forbes releases annual 'State of Cinema' wealth report.",
    "Tech investments driving actor wealth, says Forbes.",
    "The gap between A-List pay and working actors widens.",
    "Streaming residuals shaking up this year's Rich List."
];

const UNIVERSE_NEWS_TEMPLATES = [
    "Fans are speculating wildly about the next phase of the {Universe} universe.",
    "Is {Universe} planning a massive crossover event? Insiders say yes.",
    "Merchandise sales for {Universe} hit an all-time high this quarter.",
    "Rumors suggest {Universe} is looking to cast a major A-lister for their next villain.",
    "The internet breaks down the latest Easter eggs found in {Universe} projects.",
    "Studio executives promise the next {Universe} saga will 'change everything'.",
    "Leaked set photos from the upcoming {Universe} project have fans divided.",
    "Can {Universe} maintain its momentum? Analysts weigh in on the franchise's future."
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ... (Generate Personal News, Top Stories, Industry News functions remain same)

const generatePersonalNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;

    player.commitments.forEach(c => {
        if (c.type === 'ACTING_GIG' && c.projectDetails) {
            if (c.projectPhase === 'PRODUCTION' && c.phaseWeeksLeft === c.totalPhaseDuration) {
                const headline = `Casting Alert: You join the cast of '${c.name}'.`;
                const subtext = c.roleType === 'LEAD' ? "Sources say it's a career-defining role." : "Production begins immediately.";
                news.push({
                    id: `news_you_sign_${c.id}`, headline, subtext, category: 'YOU', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
    });

    return news;
};

const generateTopStories = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;

    player.activeReleases.forEach(rel => {
        if (rel.weekNum === 1) {
            const budget = rel.budget;
            const gross = rel.weeklyGross[0];
            
            if (gross > budget * 0.5) {
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse ? [...HIT_HEADLINES, ...UNIVERSE_HIT_HEADLINES] : HIT_HEADLINES;
                news.push({
                    id: `news_bo_hit_${rel.id}`,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: `$${(gross/1000000).toFixed(1)}M opening weekend stuns Hollywood.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (gross < budget * 0.15 && rel.projectDetails.budgetTier !== 'LOW') {
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse ? [...FLOP_HEADLINES, ...UNIVERSE_FLOP_HEADLINES] : FLOP_HEADLINES;
                news.push({
                    id: `news_bo_flop_${rel.id}`,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: `Disastrous $${(gross/1000000).toFixed(1)}M opening raises questions.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
                });
            } else if (rel.projectDetails.budgetTier === 'HIGH') {
                news.push({
                    id: `news_bo_open_${rel.id}`,
                    headline: `'${rel.name}' opens at #1.`,
                    subtext: `Solid performance for the ${rel.projectDetails.genre} blockbuster.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
        if (rel.weekNum === 2 && rel.imdbRating) {
            if (rel.imdbRating >= 8.5) {
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse ? [...CRITIC_LOVED_HEADLINES, ...UNIVERSE_CRITIC_LOVED_HEADLINES] : CRITIC_LOVED_HEADLINES;
                news.push({
                    id: `news_crit_high_${rel.id}`,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: `With an ${rel.imdbRating} rating, word of mouth is electric.`,
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            } else if (rel.imdbRating <= 4.0) {
                const isUniverse = rel.projectDetails.universeId != null;
                const headlineArr = isUniverse ? [...CRITIC_HATED_HEADLINES, ...UNIVERSE_CRITIC_HATED_HEADLINES] : CRITIC_HATED_HEADLINES;
                news.push({
                    id: `news_crit_low_${rel.id}`,
                    headline: pick(headlineArr).replace('{Title}', rel.name),
                    subtext: "Audience scores are equally punishing.",
                    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
                });
            }
        }
    });

    return news;
};

const generateIndustryNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;

    if (Math.random() < 0.2) {
        news.push({
            id: `news_ind_trend_${Date.now()}`,
            headline: pick(INDUSTRY_TEMPLATES),
            category: 'INDUSTRY', week, year, impactLevel: 'LOW'
        });
    }

    if (Math.random() < 0.3) {
        const npc = pick(NPC_DATABASE);
        const headline = pick(NPC_HEADLINES).replace('{Name}', npc.name);
        news.push({
            id: `news_ind_npc_${Date.now()}`,
            headline: headline,
            category: 'INDUSTRY', week, year, impactLevel: 'LOW'
        });
    }

    // --- NEW: AWARD GOSSIP INJECTION ---
    const pendingCeremony = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY');
    if (pendingCeremony) {
        if (Math.random() < 0.6) { // High chance during season
            const template = Math.random() > 0.3 ? pick(AWARD_GOSSIP_TEMPLATES) : pick(SNUB_TEMPLATES);
            // Replace placeholders
            const rival = pick(NPC_DATABASE);
            const awardName = pendingCeremony.title;
            const headline = template
                .replace('{Player}', player.name)
                .replace('{Rival}', rival.name)
                .replace('{Award}', awardName);
            
            news.push({
                id: `news_gossip_${Date.now()}`,
                headline: headline,
                category: 'INDUSTRY',
                week, year,
                impactLevel: 'MEDIUM',
                subtext: "The rumor mill is spinning as the ceremony approaches."
            });
        }
    }

    if (Math.random() < 0.1) {
        const studio = pick(Object.values(STUDIO_CATALOG));
        news.push({
            id: `news_ind_studio_${Date.now()}`,
            headline: `${studio.name} reshuffles executive leadership.`,
            category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
        });
    }

    // --- NEW: SCANDAL & LEGAL NEWS ---
    if (player.activeCases && player.activeCases.length > 0) {
        if (Math.random() < 0.7) {
            news.push({
                id: `news_legal_active_${Date.now()}`,
                headline: pick(LEGAL_HEADLINES).replace('{Name}', player.name),
                category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
            });
        }
    }

    if (player.heat > 30 && Math.random() < (player.heat / 100)) {
        news.push({
            id: `news_scandal_active_${Date.now()}`,
            headline: pick(SCANDAL_HEADLINES).replace('{Name}', player.name),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
    }

    return news;
};

// ... (Exported Helpers)
export const generateSequelHypeNews = (title: string, week: number, year: number): NewsItem => ({
    id: `news_hype_${Date.now()}`,
    headline: pick(SEQUEL_HYPE_HEADLINES).replace('{Title}', title),
    category: 'TOP_STORY', week, year, impactLevel: 'MEDIUM'
});
export const generateSequelConfirmedNews = (title: string, week: number, year: number): NewsItem => ({
    id: `news_sequel_yes_${Date.now()}`,
    headline: pick(SEQUEL_CONFIRMED_HEADLINES).replace('{Title}', title),
    subtext: "Studio insiders confirm a deal is in the works.",
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});
export const generateSequelCancelledNews = (title: string, week: number, year: number): NewsItem => ({
    id: `news_sequel_no_${Date.now()}`,
    headline: pick(SEQUEL_CANCELLED_HEADLINES).replace('{Title}', title),
    category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
});
export const generateNegotiationFailNews = (title: string, week: number, year: number): NewsItem => ({
    id: `news_negot_fail_${Date.now()}`,
    headline: pick(NEGOTIATION_FAIL_HEADLINES).replace('{Title}', title),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});
export const generateFanBacklashNews = (title: string, week: number, year: number): NewsItem => ({
    id: `news_backlash_${Date.now()}`,
    headline: pick(FAN_BACKLASH_HEADLINES).replace('{Title}', title),
    subtext: "The internet is not happy about the recasting news.",
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

// NEW EXPORTS FOR TV
export const generateRenewalNews = (title: string, season: number, week: number, year: number): NewsItem => ({
    id: `news_renew_${Date.now()}`,
    headline: pick(TV_RENEWAL_HEADLINES).replace('{Title}', title).replace('{Season}', season.toString()),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateCancellationNews = (title: string, season: number, week: number, year: number): NewsItem => ({
    id: `news_cancel_${Date.now()}`,
    headline: pick(TV_CANCELLATION_HEADLINES).replace('{Title}', title).replace('{Season}', season.toString()),
    category: 'INDUSTRY', week, year, impactLevel: 'MEDIUM'
});

export const generateForbesNews = (player: Player, currentRank: number, prevRank: number | undefined): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;

    if (prevRank === undefined) {
        if (currentRank <= 100) {
             news.push({
                id: `news_forbes_entry_${Date.now()}`,
                headline: pick(FORBES_ENTRY_HEADLINES).replace('{Name}', player.name).replace('{Rank}', currentRank.toString()),
                subtext: "A sign of rising power in the industry.",
                category: 'YOU', week, year, impactLevel: 'HIGH'
            });
        }
        return news;
    }

    const diff = prevRank - currentRank;

    if (currentRank === 1 && prevRank !== 1) {
        news.push({
            id: `news_forbes_one_${Date.now()}`,
            headline: pick(FORBES_NUMBER_ONE_HEADLINES).replace('{Name}', player.name),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
        return news;
    }

    if (currentRank <= 10 && prevRank > 10) {
        news.push({
            id: `news_forbes_top10_${Date.now()}`,
            headline: pick(FORBES_TOP_10_HEADLINES).replace('{Name}', player.name),
            category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
        });
        return news;
    }

    if (diff >= 5) {
        news.push({
            id: `news_forbes_rise_${Date.now()}`,
            headline: pick(FORBES_RISE_HEADLINES).replace('{Name}', player.name).replace('{Rank}', currentRank.toString()),
            category: 'YOU', week, year, impactLevel: 'MEDIUM'
        });
    }
    
    if (diff <= -5) {
        news.push({
            id: `news_forbes_drop_${Date.now()}`,
            headline: pick(FORBES_DROP_HEADLINES).replace('{Name}', player.name).replace('{Rank}', currentRank.toString()),
            category: 'YOU', week, year, impactLevel: 'LOW'
        });
    }

    return news;
};

export const generateForbesIndustryNews = (week: number, year: number): NewsItem => ({
    id: `news_forbes_ind_${Date.now()}`,
    headline: pick(FORBES_INDUSTRY_HEADLINES),
    category: 'INDUSTRY', week, year, impactLevel: 'LOW'
});

export const generateScandalNews = (name: string, week: number, year: number): NewsItem => ({
    id: `news_scandal_${Date.now()}`,
    headline: pick(SCANDAL_HEADLINES).replace('{Name}', name),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

export const generateLegalNews = (name: string, week: number, year: number): NewsItem => ({
    id: `news_legal_${Date.now()}`,
    headline: pick(LEGAL_HEADLINES).replace('{Name}', name),
    category: 'TOP_STORY', week, year, impactLevel: 'HIGH'
});

const generateUniverseNews = (player: Player): NewsItem[] => {
    const news: NewsItem[] = [];
    const week = player.currentWeek;
    const year = player.age;

    // Find if player has a studio with universes
    const studio = player.businesses?.find(b => b.type === 'PRODUCTION_HOUSE');
    if (studio && player.world?.universes) {
        const universes = Object.values(player.world.universes).filter(u => u.studioId === studio.id);
        if (universes.length > 0 && Math.random() < 0.4) { // 40% chance per week if they have a universe
            const randomUniverse = pick(universes);
            const headline = pick(UNIVERSE_NEWS_TEMPLATES).replace(/{Universe}/g, randomUniverse.name);
            news.push({
                id: `news_uni_buzz_${Date.now()}`,
                headline,
                category: 'UNIVERSE',
                week, year, impactLevel: 'MEDIUM'
            });
        }
    }

    return news;
};

export const generateWeeklyNews = (player: Player): NewsItem[] => {
    const topStories = generateTopStories(player);
    const industry = generateIndustryNews(player);
    const personal = generatePersonalNews(player);
    const universe = generateUniverseNews(player);

    const all = [...topStories, ...personal, ...industry, ...universe];
    return all;
};
