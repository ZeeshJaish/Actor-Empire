
import { Genre, Player, ProjectDetails, AuditionOpportunity, RoleType, ProjectHiddenStats, StudioId, ProjectType } from '../types';
import { ROLE_DEFINITIONS } from './roleLogic';

interface FamousProjectDef {
    title: string;
    genre: Genre;
    director: string; // Showrunner for TV
    difficulty: number; // 0-100
    studioId: StudioId;
    prestige: number; 
    description: string;
    type: ProjectType;
}

// 🎬 CURATED LIST OF FAMOUS MOVIES
export const FAMOUS_MOVIE_DB: FamousProjectDef[] = [
    // 🎭 PRESTIGE / AWARD GIANTS
    { title: "The Godfather", genre: "DRAMA", director: "Francis Ford Coppola", difficulty: 95, studioId: "PARAMOUNT", prestige: 100, description: "A mafia family saga that redefines cinema.", type: 'MOVIE' },
    { title: "Forrest Gump", genre: "DRAMA", director: "Robert Zemeckis", difficulty: 85, studioId: "PARAMOUNT", prestige: 90, description: "Life is like a box of chocolates.", type: 'MOVIE' },
    { title: "Titanic", genre: "ROMANCE", director: "James Cameron", difficulty: 88, studioId: "PARAMOUNT", prestige: 95, description: "A tragic romance on the unsinkable ship.", type: 'MOVIE' },
    { title: "The Shawshank Redemption", genre: "DRAMA", director: "Frank Darabont", difficulty: 90, studioId: "WARNER_BROS", prestige: 98, description: "Hope is a good thing, maybe the best of things.", type: 'MOVIE' },
    { title: "Schindler's List", genre: "DRAMA", director: "Steven Spielberg", difficulty: 95, studioId: "UNIVERSAL", prestige: 100, description: "A black and white masterpiece of humanity.", type: 'MOVIE' },
    { title: "Gladiator", genre: "ACTION", director: "Ridley Scott", difficulty: 85, studioId: "UNIVERSAL", prestige: 92, description: "Are you not entertained?", type: 'MOVIE' },
    { title: "Parasite", genre: "THRILLER", director: "Bong Joon-ho", difficulty: 92, studioId: "ARTISAN_PICTURES", prestige: 99, description: "A dark satire on class discrimination.", type: 'MOVIE' },
    { title: "La La Land", genre: "ROMANCE", director: "Damien Chazelle", difficulty: 80, studioId: "ARTISAN_PICTURES", prestige: 88, description: "Here's to the fools who dream.", type: 'MOVIE' },

    // 🧠 HIGH-CONCEPT / CULT ICONS
    { title: "Inception", genre: "SCI_FI", director: "Christopher Nolan", difficulty: 85, studioId: "WARNER_BROS", prestige: 90, description: "Dreams within dreams.", type: 'MOVIE' },
    { title: "Fight Club", genre: "THRILLER", director: "David Fincher", difficulty: 88, studioId: "ARTISAN_PICTURES", prestige: 92, description: "The first rule is you do not talk about it.", type: 'MOVIE' },
    { title: "Interstellar", genre: "SCI_FI", director: "Christopher Nolan", difficulty: 85, studioId: "PARAMOUNT", prestige: 90, description: "Love transcends dimensions.", type: 'MOVIE' },
    { title: "The Matrix", genre: "SCI_FI", director: "The Wachowskis", difficulty: 82, studioId: "WARNER_BROS", prestige: 95, description: "Take the red pill.", type: 'MOVIE' },
    { title: "Joker", genre: "DRAMA", director: "Todd Phillips", difficulty: 90, studioId: "WARNER_BROS", prestige: 92, description: "Put on a happy face.", type: 'MOVIE' },
    { title: "The Dark Knight", genre: "ACTION", director: "Christopher Nolan", difficulty: 95, studioId: "WARNER_BROS", prestige: 98, description: "Why so serious?", type: 'MOVIE' },

    // 🔥 ACTION / THRILLER LEGENDS
    { title: "John Wick", genre: "ACTION", director: "Chad Stahelski", difficulty: 75, studioId: "ARTISAN_PICTURES", prestige: 80, description: "Just a man and his dog.", type: 'MOVIE' },
    { title: "Mad Max: Fury Road", genre: "ACTION", director: "George Miller", difficulty: 80, studioId: "WARNER_BROS", prestige: 90, description: "What a lovely day.", type: 'MOVIE' },
    { title: "Die Hard", genre: "ACTION", director: "John McTiernan", difficulty: 70, studioId: "ARTISAN_PICTURES", prestige: 85, description: "Yippee-ki-yay.", type: 'MOVIE' },
    { title: "The Bourne Identity", genre: "ACTION", director: "Doug Liman", difficulty: 75, studioId: "UNIVERSAL", prestige: 80, description: "He doesn't know who he is.", type: 'MOVIE' },
    { title: "Taken", genre: "ACTION", director: "Pierre Morel", difficulty: 65, studioId: "ARTISAN_PICTURES", prestige: 70, description: "I have a particular set of skills.", type: 'MOVIE' },

    // 😄 COMEDY / FEEL-GOOD CLASSICS
    { title: "The Hangover", genre: "COMEDY", director: "Todd Phillips", difficulty: 60, studioId: "WARNER_BROS", prestige: 75, description: "Some guys just can't handle Vegas.", type: 'MOVIE' },
    { title: "Home Alone", genre: "COMEDY", director: "Chris Columbus", difficulty: 55, studioId: "ARTISAN_PICTURES", prestige: 80, description: "Keep the change, ya filthy animal.", type: 'MOVIE' },
    { title: "The Grand Budapest Hotel", genre: "COMEDY", director: "Wes Anderson", difficulty: 85, studioId: "ARTISAN_PICTURES", prestige: 92, description: "A story within a story.", type: 'MOVIE' },
    { title: "The Wolf of Wall Street", genre: "COMEDY", director: "Martin Scorsese", difficulty: 90, studioId: "PARAMOUNT", prestige: 90, description: "Sell me this pen.", type: 'MOVIE' },

    // 🩸 HORROR / DARK CULT
    { title: "The Exorcist", genre: "HORROR", director: "William Friedkin", difficulty: 88, studioId: "WARNER_BROS", prestige: 95, description: "The scariest movie ever made.", type: 'MOVIE' },
    { title: "Get Out", genre: "HORROR", director: "Jordan Peele", difficulty: 85, studioId: "UNIVERSAL", prestige: 92, description: "Just because you're invited, doesn't mean you're welcome.", type: 'MOVIE' },
    { title: "A Quiet Place", genre: "HORROR", director: "John Krasinski", difficulty: 75, studioId: "PARAMOUNT", prestige: 85, description: "If they hear you, they hunt you.", type: 'MOVIE' },
    { title: "Hereditary", genre: "HORROR", director: "Ari Aster", difficulty: 90, studioId: "ARTISAN_PICTURES", prestige: 90, description: "Evil runs in the family.", type: 'MOVIE' }
];

// 📺 CURATED LIST OF FAMOUS TV SERIES
export const FAMOUS_SERIES_DB: FamousProjectDef[] = [
    { title: "The Big Bang Theory", genre: "COMEDY", director: "Chuck Lorre", difficulty: 60, studioId: "WARNER_BROS", prestige: 85, description: "Smart is the new sexy. A sitcom about physicists and their neighbors.", type: 'SERIES' },
    { title: "Grey's Anatomy", genre: "DRAMA", director: "Shonda Rhimes", difficulty: 70, studioId: "DISNEY_PLUS", prestige: 88, description: "Lives on the line. Doctors breaking boundaries and hearts.", type: 'SERIES' },
    { title: "Game of Thrones", genre: "ADVENTURE", director: "HBO", difficulty: 95, studioId: "WARNER_BROS", prestige: 99, description: "Winter is coming. The battle for the Iron Throne begins.", type: 'SERIES' },
    { title: "Breaking Bad", genre: "THRILLER", director: "Vince Gilligan", difficulty: 92, studioId: "ARTISAN_PICTURES", prestige: 100, description: "A chemistry teacher turns to a life of crime.", type: 'SERIES' },
    { title: "Friends", genre: "COMEDY", director: "David Crane", difficulty: 65, studioId: "WARNER_BROS", prestige: 90, description: "I'll be there for you. Six friends living in New York.", type: 'SERIES' },
    { title: "Stranger Things", genre: "SCI_FI", director: "The Duffer Brothers", difficulty: 80, studioId: "NETFLIX", prestige: 92, description: "One summer can change everything. Hawkins is not safe.", type: 'SERIES' },
    { title: "The Office", genre: "COMEDY", director: "Greg Daniels", difficulty: 60, studioId: "UNIVERSAL", prestige: 88, description: "A mockumentary about everyday office life.", type: 'SERIES' },
    { title: "Succession", genre: "DRAMA", director: "Jesse Armstrong", difficulty: 90, studioId: "WARNER_BROS", prestige: 98, description: "Power, politics, and money in a dysfunctional family.", type: 'SERIES' },
    { title: "Lost", genre: "SCI_FI", director: "J.J. Abrams", difficulty: 80, studioId: "DISNEY_PLUS", prestige: 85, description: "Survivors of a plane crash uncover secrets on a mysterious island.", type: 'SERIES' },
    { title: "The Sopranos", genre: "THRILLER", director: "David Chase", difficulty: 95, studioId: "WARNER_BROS", prestige: 100, description: "A mob boss tries to balance family and crime.", type: 'SERIES' },
    { title: "Seinfeld", genre: "COMEDY", director: "Larry David", difficulty: 70, studioId: "UNIVERSAL", prestige: 92, description: "A show about nothing.", type: 'SERIES' },
    { title: "House of Cards", genre: "DRAMA", director: "David Fincher", difficulty: 85, studioId: "NETFLIX", prestige: 90, description: "Democracy is overrated. Ruthless politics in DC.", type: 'SERIES' },
    { title: "Black Mirror", genre: "SCI_FI", director: "Charlie Brooker", difficulty: 88, studioId: "NETFLIX", prestige: 94, description: "The dark side of technology and modern society.", type: 'SERIES' },
    { title: "The Mandalorian", genre: "SCI_FI", director: "Jon Favreau", difficulty: 85, studioId: "LUCASFILM", prestige: 92, description: "This is the way. A bounty hunter protects a child.", type: 'SERIES' },
    { title: "Ted Lasso", genre: "COMEDY", director: "Bill Lawrence", difficulty: 65, studioId: "APPLE_TV", prestige: 90, description: "Believe. An American coach takes over a British soccer team.", type: 'SERIES' }
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- HELPERS ---

export const getNextFamousMovie = (player: Player): FamousProjectDef | null => {
    // Filter out movies already released in this world run
    const available = FAMOUS_MOVIE_DB.filter(m => !player.world.famousMoviesReleased?.includes(m.title));
    if (available.length === 0) return null;
    return pick(available);
};

export const getNextFamousSeries = (player: Player): FamousProjectDef | null => {
    // Filter out series already released
    const available = FAMOUS_SERIES_DB.filter(m => !player.world.famousMoviesReleased?.includes(m.title));
    if (available.length === 0) return null;
    return pick(available);
};

export const createFamousOpportunity = (def: FamousProjectDef, roleType: RoleType, source: 'CASTING_APP' | 'AGENT' | 'DIRECT'): AuditionOpportunity => {
    // Generate Stats
    const hidden: ProjectHiddenStats = {
        scriptQuality: Math.min(100, def.prestige + Math.random() * 5),
        directorQuality: Math.min(100, def.prestige + Math.random() * 5),
        castingStrength: 90 + Math.random() * 10,
        distributionPower: 90 + Math.random() * 10,
        rawHype: 80 + Math.random() * 20,
        qualityScore: def.prestige, // High base quality
        prestigeBonus: 5
    };

    const isTV = def.type === 'SERIES';
    const estimatedBudget = isTV 
        ? 5000000 + Math.random() * 10000000 // Per episode budget roughly
        : 100000000 + Math.random() * 50000000;

    const details: ProjectDetails = {
        title: def.title,
        type: def.type,
        description: def.description,
        studioId: def.studioId,
        subtype: 'STANDALONE', // Could be series starter
        genre: def.genre,
        budgetTier: 'HIGH',
        estimatedBudget,
        releaseScale: 'GLOBAL',
        releaseStrategy: isTV ? 'STREAMING_ONLY' : 'THEATRICAL',
        visibleHype: 'HIGH',
        hiddenStats: hidden,
        directorName: def.director,
        visibleDirectorTier: 'Legend',
        visibleScriptBuzz: 'Masterpiece',
        visibleCastStrength: 'Iconic',
        isFamous: true // MARKER
    };

    const config = ROLE_DEFINITIONS[roleType];
    
    // Pay is standard for role, higher for movies, but TV has potential recurring
    // For simplicity, we give a huge lump sum for the "Season" or "Film"
    const pay = config.baseIncome * (isTV ? 15 : 20); 

    return {
        id: `famous_${source.toLowerCase()}_${Date.now()}`,
        roleType,
        projectName: def.title,
        genre: def.genre,
        config: { 
            ...config, 
            difficulty: def.difficulty, // Override with specific difficulty
            label: `Famous ${roleType === 'LEAD' ? 'Lead' : 'Role'}`
        },
        project: details,
        estimatedIncome: pay,
        source: source,
        royaltyPercentage: isTV ? 1.5 : 2.5 // TV residuals vs Movie points
    };
};

// --- GENERATORS ---

// 1. Hard Audition Path (Standard appearance in CastLink)
export const generateFamousMovieOpportunity = (player: Player): AuditionOpportunity | null => {
    const movie = getNextFamousMovie(player);
    if (!movie) return null;

    // Famous movies usually audition for Supporting or Lead
    const roleType: RoleType = Math.random() > 0.7 ? 'LEAD' : 'SUPPORTING';
    
    return createFamousOpportunity(movie, roleType, 'CASTING_APP');
};

// 2. TV Series Path
export const generateFamousSeriesOpportunity = (player: Player): AuditionOpportunity | null => {
    const series = getNextFamousSeries(player);
    if (!series) return null;

    // Series usually audition for Lead or Ensemble
    const roleType: RoleType = Math.random() > 0.5 ? 'LEAD' : 'ENSEMBLE';
    
    return createFamousOpportunity(series, roleType, 'CASTING_APP');
};

// 3. Cameo Break Path (Direct Invite via Message)
export const generateCameoOffer = (player: Player): { opportunity: AuditionOpportunity, messageText: string } | null => {
    // Trigger Conditions: Rising Star status
    if (player.stats.fame < 20 || player.stats.fame > 70) return null; // "Rising" window
    if (player.stats.reputation < 30) return null; // Need some respect

    const project = Math.random() > 0.5 ? getNextFamousMovie(player) : getNextFamousSeries(player);
    if (!project) return null;

    const opp = createFamousOpportunity(project, 'CAMEO', 'DIRECT');
    
    // Adjust cameo specific income
    opp.estimatedIncome = 15000; 
    opp.config = { ...opp.config, label: 'Iconic Cameo', difficulty: 20, energyCost: 10, expGain: 20 };

    const messageText = `Director/Showrunner ${project.director} saw your recent work. They want you for a specific cameo in "${project.title}". It's a small scene, but it will be a career moment. Pay is standard scale, but the exposure is massive.`;

    return { opportunity: opp, messageText };
};
