
// ... existing imports
import { NPCActor, NPCTier, NPCPrestige, Player, InstaPost, InstaPostType, InteractionType, Genre, Gender, ActorTrait } from '../types';

const ACTOR_TRAITS: ActorTrait[] = ['DIVA', 'METHOD', 'WORKAHOLIC', 'UNRELIABLE', 'EASY_GOING', 'BOX_OFFICE_POISON', 'PROFESSIONAL', 'AMBITIOUS'];

// --- CURATED AVATAR SEEDS ---
// Pixel Art style seeds that definitely look like males
export const MALE_AVATAR_SEEDS = [
    'Felix', 'Jasper', 'Milo', 'Arthur', 'Leo', 'Jack', 'Max', 'Caleb', 'Liam', 'Noah',
    'Ethan', 'Mason', 'Logan', 'Lucas', 'Oliver', 'Elijah', 'Aiden', 'James', 'Benjamin', 'William',
    'Alexander', 'Michael', 'Daniel', 'Henry', 'Jackson', 'Sebastian', 'Owen', 'Samuel', 'Matthew', 'Joseph',
    'Levi', 'David', 'John', 'Wyatt', 'Luke', 'Asher', 'Carter', 'Julian', 'Grayson', 'Gabriel',
    'Anthony', 'Dylan', 'Lincoln', 'Thomas', 'Maverick', 'Elias', 'Josiah', 'Charles', 'Christopher', 'Jaxon'
];

// Pixel Art style seeds that definitely look like females
export const FEMALE_AVATAR_SEEDS = [
    'Sophie', 'Cleo', 'Bella', 'Daisy', 'Ruby', 'Luna', 'Mia', 'Ava', 'Amelia', 'Harper',
    'Evelyn', 'Abigail', 'Ella', 'Elizabeth', 'Sofia', 'Avery', 'Scarlett', 'Grace', 'Chloe', 'Victoria',
    'Riley', 'Aria', 'Lily', 'Aubrey', 'Zoey', 'Penelope', 'Lillian', 'Addison', 'Layla', 'Natalie',
    'Camila', 'Hannah', 'Brooklyn', 'Zoe', 'Nora', 'Leah', 'Savannah', 'Audrey', 'Claire', 'Eleanor',
    'Skylar', 'Ellie', 'Samantha', 'Stella', 'Paisley', 'Violet', 'Mila', 'Allison', 'Alexa', 'Anna'
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to get gendered pixel art
export const getGenderedAvatar = (gender: Gender, nameSeed: string): string => {
    let seed = nameSeed.replace(/\s/g, '');
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
};

// --- REAL CELEBRITY DATABASE ---

const M = 1000000;

interface RealCeleb {
    name: string;
    handle: string;
    followers: number;
    netWorth: number;
    tier: NPCTier;
    occupation: 'ACTOR' | 'DIRECTOR';
    bias: NPCPrestige;
    gender: Gender; // Added
    bio?: string;
    genres?: Genre[];
    talentBase?: number;
    traits?: ActorTrait[];
    potential?: number;
    isIndependent?: boolean;
}

const REAL_ACTORS: RealCeleb[] = [
    // A_LIST
    { name: "Dwayne Johnson", handle: "@therock", followers: 395 * M, netWorth: 800 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Mana. Gratitude. Tequila.", genres: ['ACTION', 'ADVENTURE', 'COMEDY'], talentBase: 70, traits: ['WORKAHOLIC', 'PROFESSIONAL'], potential: 80, isIndependent: true },
    { name: "Leonardo DiCaprio", handle: "@leodicaprio", followers: 62 * M, netWorth: 300 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Actor and Environmentalist.", genres: ['DRAMA', 'THRILLER'], talentBase: 98, traits: ['METHOD', 'PROFESSIONAL'], potential: 95, isIndependent: true },
    { name: "Tom Cruise", handle: "@tomcruise", followers: 12 * M, netWorth: 600 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Running in movies since 1981.", genres: ['ACTION', 'SCI_FI'], talentBase: 90, traits: ['WORKAHOLIC', 'PROFESSIONAL'], potential: 90, isIndependent: true },
    { name: "Zendaya", handle: "@zendaya", followers: 184 * M, netWorth: 22 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "I'm just a cool person.", genres: ['DRAMA', 'SCI_FI', 'ROMANCE'], talentBase: 88, traits: ['AMBITIOUS', 'PROFESSIONAL'], potential: 98, isIndependent: false },
    { name: "Margot Robbie", handle: "@margotrobbieofficial", followers: 5 * M, netWorth: 60 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "Producer & Actor. Aussie.", genres: ['COMEDY', 'DRAMA', 'ACTION'], talentBase: 92, traits: ['WORKAHOLIC', 'AMBITIOUS'], potential: 96, isIndependent: false }, 
    { name: "Ryan Reynolds", handle: "@vancityreynolds", followers: 51 * M, netWorth: 350 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Owner of Aviation Gin.", genres: ['COMEDY', 'ACTION', 'SUPERHERO'], talentBase: 85, traits: ['EASY_GOING', 'PROFESSIONAL'], potential: 85, isIndependent: true },
    { name: "Will Smith", handle: "@willsmith", followers: 65 * M, netWorth: 350 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "West Philadelphia born and raised.", genres: ['ACTION', 'DRAMA', 'SCI_FI'], talentBase: 88, traits: ['DIVA', 'AMBITIOUS'], potential: 88, isIndependent: true },
    { name: "Robert Downey Jr.", handle: "@robertdowneyjr", followers: 56 * M, netWorth: 300 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "You know who I am.", genres: ['SUPERHERO', 'DRAMA', 'COMEDY'], talentBase: 95, traits: ['PROFESSIONAL', 'EASY_GOING'], potential: 90, isIndependent: true },
    { name: "Scarlett Johansson", handle: "@scarlettjohanssonworld", followers: 4 * M, netWorth: 165 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "Official Fan Page.", genres: ['ACTION', 'DRAMA', 'SCI_FI'], talentBase: 92, traits: ['PROFESSIONAL', 'AMBITIOUS'], potential: 92, isIndependent: true }, 
    { name: "Brad Pitt", handle: "@bradpitt_official", followers: 1 * M, netWorth: 400 * M, tier: 'A_LIST', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Architecture enthusiast.", genres: ['DRAMA', 'ACTION', 'THRILLER'], talentBase: 94, traits: ['METHOD', 'EASY_GOING'], potential: 94, isIndependent: true },
    
    // ESTABLISHED (High Tier)
    { name: "Chris Hemsworth", handle: "@chrishemsworth", followers: 58 * M, netWorth: 130 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Part-time Asgardian.", genres: ['ACTION', 'SUPERHERO', 'COMEDY'], talentBase: 82, traits: ['EASY_GOING', 'WORKAHOLIC'], potential: 85 },
    { name: "Gal Gadot", handle: "@gal_gadot", followers: 109 * M, netWorth: 40 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "Wonder Woman.", genres: ['ACTION', 'SUPERHERO'], talentBase: 75, traits: ['PROFESSIONAL', 'EASY_GOING'], potential: 80 },
    { name: "Florence Pugh", handle: "@florencepugh", followers: 9 * M, netWorth: 10 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "Cooking with Flo.", genres: ['DRAMA', 'HORROR', 'THRILLER'], talentBase: 94, traits: ['AMBITIOUS', 'PROFESSIONAL'], potential: 97 },
    { name: "Timothée Chalamet", handle: "@tchalamet", followers: 19 * M, netWorth: 25 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Lisan al Gaib.", genres: ['DRAMA', 'SCI_FI', 'ROMANCE'], talentBase: 93, traits: ['METHOD', 'AMBITIOUS'], potential: 98 },
    { name: "Viola Davis", handle: "@violadavis", followers: 12 * M, netWorth: 25 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "EGOT Winner.", genres: ['DRAMA', 'THRILLER'], talentBase: 99, traits: ['PROFESSIONAL', 'WORKAHOLIC'], potential: 99 },
    { name: "Denzel Washington", handle: "@denzelwashington.official", followers: 500000, netWorth: 280 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Actor. Director.", genres: ['DRAMA', 'ACTION', 'THRILLER'], talentBase: 99, traits: ['PROFESSIONAL', 'METHOD'], potential: 99 },
    { name: "Meryl Streep", handle: "@merylstreep", followers: 300000, netWorth: 160 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "The G.O.A.T.", genres: ['DRAMA', 'COMEDY'], talentBase: 100, traits: ['PROFESSIONAL', 'METHOD'], potential: 100 },
    { name: "Keanu Reeves", handle: "@keanu_reeves_fan", followers: 2 * M, netWorth: 380 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Be kind to animals.", genres: ['ACTION', 'SCI_FI'], talentBase: 85, traits: ['EASY_GOING', 'PROFESSIONAL'], potential: 85 },
    { name: "Tom Holland", handle: "@tomholland2013", followers: 66 * M, netWorth: 25 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "I spoil movies accidentally.", genres: ['SUPERHERO', 'ADVENTURE', 'DRAMA'], talentBase: 88, traits: ['EASY_GOING', 'AMBITIOUS'], potential: 95 },
    { name: "Emma Stone", handle: "@emmastone_official_", followers: 500000, netWorth: 40 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "La La Land.", genres: ['COMEDY', 'DRAMA', 'ROMANCE'], talentBase: 96, traits: ['PROFESSIONAL', 'AMBITIOUS'], potential: 98 },
    
    // ESTABLISHED (Mid Tier)
    { name: "Austin Butler", handle: "@austinbutler", followers: 4 * M, netWorth: 5 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Elvis has left the building.", genres: ['DRAMA', 'SCI_FI'], talentBase: 89 },
    { name: "Jenna Ortega", handle: "@jennaortega", followers: 39 * M, netWorth: 5 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "I like dark things.", genres: ['HORROR', 'DRAMA', 'COMEDY'], talentBase: 87 },
    { name: "Anya Taylor-Joy", handle: "@anyataylorjoy", followers: 10 * M, netWorth: 7 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "Queen's Gambit.", genres: ['HORROR', 'DRAMA', 'THRILLER'], talentBase: 91 },
    { name: "Pedro Pascal", handle: "@pascalispunk", followers: 8 * M, netWorth: 10 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'MIXED', gender: 'MALE', bio: "Daddy is a state of mind.", genres: ['ACTION', 'SCI_FI', 'DRAMA'], talentBase: 90 },
    { name: "Adam Driver", handle: "@adamdriver_updates", followers: 200000, netWorth: 16 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Marine turned actor.", genres: ['DRAMA', 'SCI_FI'], talentBase: 94 },
    { name: "Cillian Murphy", handle: "@cillianmurphyofficial", followers: 2 * M, netWorth: 20 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Oppenheimer.", genres: ['DRAMA', 'THRILLER', 'HORROR'], talentBase: 95 },
    { name: "Ana de Armas", handle: "@ana_d_armas", followers: 13 * M, netWorth: 6 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "Cuban-Spanish Actress.", genres: ['ACTION', 'THRILLER', 'DRAMA'], talentBase: 86 },
    { name: "Michael B. Jordan", handle: "@michaelbjordan", followers: 26 * M, netWorth: 25 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Creed.", genres: ['ACTION', 'DRAMA', 'SUPERHERO'], talentBase: 89 },
    { name: "Jason Momoa", handle: "@prideofgypsies", followers: 17 * M, netWorth: 25 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Aloha always.", genres: ['ACTION', 'ADVENTURE', 'SUPERHERO'], talentBase: 78 },
    { name: "Millie Bobby Brown", handle: "@milliebobbybrown", followers: 63 * M, netWorth: 14 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "Florence by Mills.", genres: ['SCI_FI', 'ADVENTURE', 'DRAMA'], talentBase: 84 },

    // ESTABLISHED (Vets)
    { name: "Julia Roberts", handle: "@juliaroberts", followers: 12 * M, netWorth: 250 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "Pretty Woman.", genres: ['ROMANCE', 'DRAMA'], talentBase: 90 },
    { name: "George Clooney", handle: "@clooneyfoundation", followers: 500000, netWorth: 500 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Casamigos.", genres: ['DRAMA', 'THRILLER'], talentBase: 89 },
    { name: "Jennifer Aniston", handle: "@jenniferaniston", followers: 45 * M, netWorth: 320 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "Friends forever.", genres: ['COMEDY', 'ROMANCE'], talentBase: 85 },
    { name: "Reese Witherspoon", handle: "@reesewitherspoon", followers: 30 * M, netWorth: 400 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "Hello Sunshine.", genres: ['DRAMA', 'COMEDY'], talentBase: 88 },
    { name: "Matt Damon", handle: "@matt_damon_official", followers: 200000, netWorth: 170 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "How do you like them apples?", genres: ['ACTION', 'DRAMA', 'SCI_FI'], talentBase: 91 },
    { name: "Ben Affleck", handle: "@benaffleck", followers: 5 * M, netWorth: 150 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Boston.", genres: ['THRILLER', 'DRAMA', 'ACTION'], talentBase: 87 },
    { name: "Sandra Bullock", handle: "@sandra.bullock.official", followers: 1 * M, netWorth: 250 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "Official page.", genres: ['COMEDY', 'THRILLER', 'ACTION'], talentBase: 89 },
    { name: "Christian Bale", handle: "@christianbale_", followers: 300000, netWorth: 120 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Transformation specialist.", genres: ['DRAMA', 'THRILLER', 'ACTION'], talentBase: 98 },
    { name: "Bradley Cooper", handle: "@bradleycooper_org", followers: 100000, netWorth: 100 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Maestro.", genres: ['DRAMA', 'ROMANCE', 'COMEDY'], talentBase: 92 },
    { name: "Matthew McConaughey", handle: "@officiallymcconaughey", followers: 9 * M, netWorth: 160 * M, tier: 'ESTABLISHED', occupation: 'ACTOR', bias: 'MIXED', gender: 'MALE', bio: "Alright, alright, alright.", genres: ['DRAMA', 'SCI_FI'], talentBase: 93 },

    // RISING (Next Gen)
    { name: "Paul Mescal", handle: "@paulmescalpics", followers: 500000, netWorth: 3 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Normal People.", genres: ['DRAMA', 'ROMANCE'], talentBase: 92 },
    { name: "Jacob Elordi", handle: "@jacobelordi", followers: 13 * M, netWorth: 4 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'MIXED', gender: 'MALE', bio: "Euphoria.", genres: ['DRAMA', 'THRILLER', 'ROMANCE'], talentBase: 85 },
    { name: "Sydney Sweeney", handle: "@sydney_sweeney", followers: 20 * M, netWorth: 10 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "Car enthusiast.", genres: ['DRAMA', 'COMEDY', 'ROMANCE'], talentBase: 83 },
    { name: "Barry Keoghan", handle: "@barrykeoghan", followers: 2 * M, netWorth: 4 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Saltburn.", genres: ['THRILLER', 'DRAMA', 'HORROR'], talentBase: 93 },
    { name: "Jeremy Allen White", handle: "@jeremyallenwhitefinally", followers: 5 * M, netWorth: 8 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Yes Chef.", genres: ['DRAMA', 'COMEDY'], talentBase: 94 },
    { name: "Rachel Zegler", handle: "@rachelzegler", followers: 1 * M, netWorth: 3 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'MIXED', gender: 'FEMALE', bio: "WSS.", genres: ['DRAMA', 'ACTION'], talentBase: 88 },
    { name: "Halle Bailey", handle: "@hallebailey", followers: 7 * M, netWorth: 3 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'FEMALE', bio: "The Little Mermaid.", genres: ['DRAMA', 'ADVENTURE'], talentBase: 86 },
    { name: "Simu Liu", handle: "@simuliu", followers: 3 * M, netWorth: 4 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Shang-Chi.", genres: ['ACTION', 'COMEDY'], talentBase: 82 },
    { name: "Daisy Edgar-Jones", handle: "@daisyedgarjones", followers: 2 * M, netWorth: 2 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "Twisters.", genres: ['DRAMA', 'THRILLER', 'HORROR'], talentBase: 87 },
    { name: "Yahya Abdul-Mateen II", handle: "@yahya", followers: 1 * M, netWorth: 5 * M, tier: 'RISING', occupation: 'ACTOR', bias: 'MIXED', gender: 'MALE', bio: "Aquaman.", genres: ['ACTION', 'DRAMA', 'THRILLER'], talentBase: 89 }
];

const REAL_DIRECTORS: RealCeleb[] = [
    // CUSTOM ELITE DIRECTOR
    { name: "Nyanika Mishra", handle: "@nyanikacinema", followers: 5 * M, netWorth: 500 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "Every frame is a masterpiece. The Midas Touch.", talentBase: 95 },
    
    { name: "Christopher Nolan", handle: "@nolan_verse", followers: 1 * M, netWorth: 250 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Film is tangible.", talentBase: 98 },
    { name: "Greta Gerwig", handle: "@gretagerwig_fans", followers: 500000, netWorth: 15 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'MIXED', gender: 'FEMALE', bio: "I like pink.", talentBase: 92 },
    { name: "Steven Spielberg", handle: "@amblin", followers: 2 * M, netWorth: 8000 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Amblin Entertainment.", talentBase: 96 },
    { name: "Martin Scorsese", handle: "@martinscorsese_", followers: 2 * M, netWorth: 200 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Cinema.", talentBase: 97 },
    { name: "Quentin Tarantino", handle: "@tarantinoxx", followers: 4 * M, netWorth: 120 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Feet enthusiast.", talentBase: 94 },
    { name: "Denis Villeneuve", handle: "@denisvilleneuve_official", followers: 300000, netWorth: 30 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Dune.", talentBase: 93 },
    { name: "Jordan Peele", handle: "@jordanpeele", followers: 2 * M, netWorth: 50 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'MIXED', gender: 'MALE', bio: "Monkeypaw Productions.", talentBase: 88 },
    { name: "Wes Anderson", handle: "@wesandersonplanet", followers: 1 * M, netWorth: 50 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Symmetry.", talentBase: 90 },
    { name: "James Cameron", handle: "@jamescameron", followers: 1 * M, netWorth: 700 * M, tier: 'A_LIST', occupation: 'DIRECTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "I see you.", talentBase: 95 },
    { name: "David Fincher", handle: "@davidfincherfans", followers: 200000, netWorth: 100 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Perfectionist.", talentBase: 92 },
    { name: "Ryan Coogler", handle: "@proxymedia", followers: 150000, netWorth: 25 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Wakanda Forever.", talentBase: 87 },
    { name: "Zack Snyder", handle: "@zacksnyder", followers: 6 * M, netWorth: 60 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "Slow motion.", talentBase: 78 },
    { name: "Chloé Zhao", handle: "@chloezhao", followers: 200000, netWorth: 5 * M, tier: 'RISING', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'FEMALE', bio: "Nomadland.", talentBase: 89 },
    { name: "James Gunn", handle: "@jamesgunn", followers: 3 * M, netWorth: 50 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'COMMERCIAL', gender: 'MALE', bio: "DC Studios CEO.", talentBase: 85 },
    { name: "Bong Joon-ho", handle: "@bongjoonho", followers: 100000, netWorth: 30 * M, tier: 'ESTABLISHED', occupation: 'DIRECTOR', bias: 'PRESTIGE', gender: 'MALE', bio: "Parasite.", talentBase: 96 }
];

// --- RANDOM NPC GENERATOR (For low budget filler) ---
const FIRST_NAMES = ['Kai', 'Luna', 'Nova', 'Ezra', 'Milo', 'Ayla', 'Finn', 'Ivy', 'Leo', 'Mia', 'Jax', 'Zoey', 'Ash', 'Sky', 'River', 'Sage', 'Jett', 'Piper', 'Zane', 'Remi', 'Atlas', 'Cleo', 'Hugo', 'Eden', 'Theo', 'Jade', 'Nash', 'Faye', 'Otis', 'Vera'];
const LAST_NAMES = ['Rivers', 'Stone', 'Wilder', 'Frost', 'Knight', 'Woods', 'Black', 'Steel', 'Moon', 'Storm', 'Fox', 'Wolf', 'Hart', 'Drake', 'Cross', 'Banks', 'Reid', 'Cole', 'West', 'Gray', 'Brooks', 'Hayes', 'Price', 'Rice', 'Lane', 'Ford', 'King', 'Rose', 'Snow', 'Lake'];
const GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'SCI_FI', 'HORROR', 'ADVENTURE', 'SUPERHERO'];

const createGenreXP = (favored: Genre[]): Record<Genre, number> => {
    const xp: any = {};
    const ALL_GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO'];
    ALL_GENRES.forEach(g => {
        xp[g] = favored.includes(g) ? 80 + Math.floor(Math.random() * 20) : Math.floor(Math.random() * 20);
    });
    return xp;
};

const generateRandomNPC = (seed: number | string): NPCActor => {
    const gender: Gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${first} ${last}`;
    const handle = `@${first.toLowerCase()}${last.toLowerCase()}${Math.floor(Math.random()*99)}`;
    
    // Low stats for randoms
    const followers = 5000 + Math.floor(Math.random() * 50000);
    const netWorth = 50000 + Math.floor(Math.random() * 200000);
    const tier: NPCTier = Math.random() > 0.8 ? 'RISING' : 'UNKNOWN';
    const openness = 50 + Math.floor(Math.random() * 40); // Very open to networking

    const bios = [
        "Chasing dreams in LA.",
        "Actor. Dreamer. Coffee addict.",
        "Available for bookings.",
        "Just living life one script at a time.",
        "Art is life.",
        "Indie filmmaker.",
        "Represented by XYZ Talent.",
        "Catch me on my next project!",
        "Love the process.",
        "Storyteller."
    ];

    const randomGenres = [GENRES[Math.floor(Math.random() * GENRES.length)], GENRES[Math.floor(Math.random() * GENRES.length)]];
    
    // Random traits
    const traits: ActorTrait[] = [];
    const traitCount = Math.floor(Math.random() * 2) + 1;
    for(let i=0; i<traitCount; i++) {
        const t = pick(ACTOR_TRAITS);
        if(!traits.includes(t)) traits.push(t);
    }

    return {
        id: `npc_rnd_${seed}_${Date.now()}`,
        name,
        handle,
        gender,
        avatar: getGenderedAvatar(gender, name),
        tier,
        prestigeBias: 'MIXED',
        openness,
        followers,
        netWorth,
        occupation: 'ACTOR',
        bio: bios[Math.floor(Math.random() * bios.length)],
        stats: {
            talent: 20 + Math.random() * 50, // 20-70 for randoms
            fame: tier === 'RISING' ? 15 + Math.random() * 15 : Math.random() * 10,
            genreXP: createGenreXP(randomGenres)
        },
        traits,
        potential: 40 + Math.random() * 60, // High potential for unknowns
        isIndependent: Math.random() > 0.7
    };
};

// --- NPC DATABASE FACTORY ---
export const generateNPCs = (): NPCActor[] => {
    const npcs: NPCActor[] = [];
    
    // 1. Add Real Actors
    REAL_ACTORS.forEach((celeb, idx) => {
        // Calculate dynamic openness based on tier (reusing logic but applying to real data)
        let openness = 0;
        if (celeb.tier === 'A_LIST') openness = 5 + Math.floor(Math.random() * 15);
        else if (celeb.tier === 'ESTABLISHED') openness = 20 + Math.floor(Math.random() * 20);
        else openness = 40 + Math.floor(Math.random() * 30);

        // Calc Fame from followers roughly (Log scaleish)
        let fame = 0;
        if (celeb.tier === 'A_LIST') fame = 85 + Math.random() * 15;
        else if (celeb.tier === 'ESTABLISHED') fame = 60 + Math.random() * 25;
        else fame = 30 + Math.random() * 30;

        npcs.push({
            id: `celeb_act_${idx}`,
            name: celeb.name,
            handle: celeb.handle,
            gender: celeb.gender,
            // UPDATED: Ignore name seed, use gendered curation to ensure Ryan looks like a male
            avatar: getGenderedAvatar(celeb.gender, celeb.name), 
            tier: celeb.tier,
            prestigeBias: celeb.bias,
            openness,
            followers: celeb.followers,
            netWorth: celeb.netWorth,
            occupation: 'ACTOR',
            bio: celeb.bio || "Hollywood Icon.",
            stats: {
                talent: celeb.talentBase || 80,
                fame,
                genreXP: createGenreXP(celeb.genres || ['DRAMA'])
            },
            traits: celeb.traits || ['PROFESSIONAL'],
            potential: celeb.potential || 50,
            isIndependent: celeb.isIndependent ?? true
        });
    });

    // 2. Add Real Directors
    REAL_DIRECTORS.forEach((celeb, idx) => {
        let openness = 10 + Math.floor(Math.random() * 20); // Directors usually private
        
        // Calc Fame from followers roughly
        let fame = 0;
        if (celeb.tier === 'A_LIST') fame = 85 + Math.random() * 15;
        else if (celeb.tier === 'ESTABLISHED') fame = 60 + Math.random() * 25;
        else fame = 30 + Math.random() * 30;

        npcs.push({
            id: `celeb_dir_${idx}`,
            name: celeb.name,
            handle: celeb.handle,
            gender: celeb.gender,
            avatar: getGenderedAvatar(celeb.gender, celeb.name),
            tier: celeb.tier,
            prestigeBias: celeb.bias,
            openness,
            followers: celeb.followers,
            netWorth: celeb.netWorth,
            occupation: 'DIRECTOR',
            bio: celeb.bio || "Filmmaker.",
            stats: {
                talent: celeb.talentBase || 70,
                fame,
                genreXP: createGenreXP(celeb.genres || ['DRAMA'])
            }
        });
    });

    // 3. Add Random Directors (Cheap/Indie options)
    for(let i=0; i<40; i++) {
        const gender: Gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
        const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        const tier: NPCTier = Math.random() > 0.8 ? 'RISING' : 'INDIE';

        npcs.push({
            id: `rnd_dir_${i}`,
            name: `${first} ${last}`,
            handle: `@${first.toLowerCase()}_films`,
            gender,
            avatar: getGenderedAvatar(gender, `${first} ${last}`),
            tier,
            prestigeBias: Math.random() > 0.5 ? 'PRESTIGE' : 'COMMERCIAL',
            openness: 40 + Math.floor(Math.random() * 40),
            followers: 1000 + Math.floor(Math.random() * 10000),
            netWorth: 10000 + Math.floor(Math.random() * 50000),
            occupation: 'DIRECTOR',
            bio: "Aspiring director looking for a break.",
            stats: {
                talent: 25 + Math.random() * 50, // 25-75 for randoms
                fame: 5 + Math.random() * 10,
                genreXP: createGenreXP([GENRES[Math.floor(Math.random() * GENRES.length)]])
            }
        });
    }

    // 4. Add Random Actors (Filler for low budget)
    for(let i=0; i<50; i++) {
        npcs.push(generateRandomNPC(i));
    }

    return npcs;
};

// GLOBAL DB (Initialized once in app)
export const NPC_DATABASE = generateNPCs();

// --- TALENT AVAILABILITY LOGIC ---

// --- TALENT REFRESH LOGIC ---

export const generateNewUnknowns = (count: number): NPCActor[] => {
    const newUnknowns: NPCActor[] = [];
    for(let i=0; i<count; i++) {
        newUnknowns.push(generateRandomNPC(`new_${i}`));
    }
    return newUnknowns;
};

export const updateNPCLives = (npcs: NPCActor[]): NPCActor[] => {
    return npcs.map(npc => {
        if(npc.occupation !== 'ACTOR') return npc;
        
        // Career progression
        const r = Math.random();
        if(r < 0.05) { // 5% chance of career growth per week
            const potential = npc.potential || 50;
            const talent = npc.stats?.talent || 50;
            const fame = npc.stats?.fame || 0;
            
            const newTalent = Math.min(100, talent + (potential / 100) * 2);
            const newFame = Math.min(100, fame + (potential / 100) * 1.5);
            
            // Tier promotion
            let newTier = npc.tier;
            if(newFame > 80) newTier = 'A_LIST';
            else if(newFame > 50) newTier = 'ESTABLISHED';
            else if(newFame > 20) newTier = 'RISING';
            
            return {
                ...npc,
                tier: newTier,
                stats: {
                    ...npc.stats,
                    talent: newTalent,
                    fame: newFame
                }
            };
        }
        return npc;
    });
};

export const getAvailableTalent = (currentWeek: number, occupation: 'ACTOR' | 'DIRECTOR', extraNPCs: NPCActor[] = []): NPCActor[] => {
    // 1. Seed based on 3-week rotation
    const rotationSeed = Math.floor(currentWeek / 3);
    
    // 2. Filter DB by occupation
    const allTalent = [...NPC_DATABASE, ...extraNPCs].filter(npc => npc.occupation === occupation);
    
    // 3. Shuffle using a more robust seeded shuffle
    // We use a pseudo-random number generator based on the rotationSeed
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const shuffled = [...allTalent].map(value => {
        // Extract numeric part of ID for seeding
        const idNum = parseInt(value.id.replace(/\D/g, '') || '0');
        return { value, sort: seededRandom(idNum + rotationSeed * 1337) };
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

    // 4. Return a smaller subset (e.g., 8-12 available for this period)
    // This makes it feel more exclusive and rotating
    const count = occupation === 'DIRECTOR' ? 8 : 15;
    return shuffled.slice(0, count);
};

// --- FEED GENERATION ---

const CAPTIONS = {
    'ANNOUNCEMENT': ["Excited to announce my next project!", "Script reading day. 🤐", "Something big is coming.", "Contract signed. Let's go.", "New character, new world."],
    'BTS': ["Set life. 🎬", "Waiting for lighting...", "Night shoots are brutal but worth it.", "My trailer is my home now.", "The crew on this film is legendary."],
    'CELEBRATION': ["Thank you for the award nomination! 🙏", "Box office #1! You guys are amazing.", "It's a wrap! What a journey.", "Premiere night. Feeling grateful.", "Season 2 is a GO!"],
    'LIFESTYLE': ["Sunday reset.", "Gym time.", "Coffee first.", "Views.", "Family time."],
    'SELFIE': ["Feeling cute.", "Selfie time.", "Good hair day.", "Just me.", "Mood.", "Golden hour.", "Hi."],
    'INDUSTRY_NEWS': [
        "Can't wait for everyone to see the next phase of the universe.",
        "Just saw the concept art for the new franchise. Mind blown.",
        "The fans are going to love what we have planned for the next saga.",
        "Crossover event of the century? Maybe. 😉",
        "Reading the script for the sequel... you guys are not ready.",
        "So proud to be part of this cinematic universe.",
        "The lore is getting deep. Who's caught up on the timeline?",
        "Suiting up again soon. 🦸‍♂️🦸‍♀️"
    ]
};

export const generateWeeklyFeed = (player: Player): InstaPost[] => {
    const feed: InstaPost[] = [];
    
    // 1. Add Player's posts from this week (Persist them in the new feed batch)
    const playerPosts = player.instagram.posts.filter(p => p.week === player.currentWeek);
    playerPosts.forEach(p => {
        feed.push({ ...p, authorId: 'PLAYER', authorName: player.name, authorHandle: player.instagram.handle, authorAvatar: player.avatar, isPlayer: true });
    });

    // 2. Generate NPC Posts
    // Goal: ~5-8 posts per week to feel alive
    
    const candidates: NPCActor[] = [];
    
    // A. Followed NPCs (High chance)
    NPC_DATABASE.filter(n => player.instagram.npcStates[n.id]?.isFollowing).forEach(npc => {
        if (Math.random() < 0.6) candidates.push(npc);
    });

    // B. A-List / Established (Discovery - Medium chance)
    const celebs = NPC_DATABASE.filter(n => !player.instagram.npcStates[n.id]?.isFollowing && (n.tier === 'A_LIST' || n.tier === 'ESTABLISHED'));
    // Pick 3-5 random celebs
    candidates.push(...celebs.sort(() => 0.5 - Math.random()).slice(0, 4));

    // C. Random Rising Stars (Low chance)
    const rising = NPC_DATABASE.filter(n => n.tier === 'RISING');
    candidates.push(...rising.sort(() => 0.5 - Math.random()).slice(0, 1));

    // Deduplicate just in case
    const uniqueCandidates = Array.from(new Set(candidates));

    uniqueCandidates.forEach(npc => {
        const typeRoll = Math.random();
        let type: InstaPostType = 'LIFESTYLE';
        if (typeRoll > 0.90) type = 'INDUSTRY_NEWS';
        else if (typeRoll > 0.80) type = 'ANNOUNCEMENT';
        else if (typeRoll > 0.65) type = 'CELEBRATION';
        else if (typeRoll > 0.45) type = 'BTS';
        else if (typeRoll > 0.25) type = 'SELFIE';

        const caption = CAPTIONS[type][Math.floor(Math.random() * CAPTIONS[type].length)];
        // Variance in likes based on followers
        const likes = Math.floor(npc.followers * (0.02 + Math.random() * 0.08)); 
        const comments = Math.floor(likes * 0.01);

        feed.push({
            id: `post_${npc.id}_${player.currentWeek}_${Math.random().toString(36).substr(2, 5)}`,
            authorId: npc.id,
            authorName: npc.name,
            authorHandle: npc.handle,
            authorAvatar: npc.avatar,
            type,
            caption,
            likes,
            comments,
            week: player.currentWeek,
            year: player.age,
            isPlayer: false,
        });
    });

    // 3. Add Industry News (Flavor) - Higher chance
    if (Math.random() > 0.3) {
        feed.push({
            id: `news_${player.currentWeek}_${Math.random()}`,
            authorId: 'deadline',
            authorName: 'Deadline',
            authorHandle: '@deadline',
            authorAvatar: 'https://ui-avatars.com/api/?name=DL&background=000&color=fff',
            type: 'INDUSTRY_NEWS',
            caption: "BREAKING: " + (Math.random() > 0.5 ? "Major studio merger announced impacting upcoming slate." : "Box Office records shattered this weekend."),
            likes: 12000 + Math.floor(Math.random() * 5000),
            comments: 450,
            week: player.currentWeek,
            year: player.age,
            isPlayer: false,
        });
    }

    // Shuffle and Sort
    return feed.sort((a, b) => b.likes - a.likes); 
};

// --- INTERACTION LOGIC ---

export interface InteractionResult {
    success: boolean;
    relationshipDelta: number;
    playerText: string;
    npcText: string;
    energyCost: number;
    isBefriended: boolean;
    isFollowing: boolean;
}

export const calculateInteraction = (player: Player, npc: NPCActor, type: InteractionType): InteractionResult => {
    let cost = 0;
    let delta = 0;
    let playerText = "";
    let npcText = "";
    let isBefriended = false;

    const state = player.instagram.npcStates[npc.id] || { relationshipScore: 0, isFollowing: false };
    const currentRel = state.relationshipScore || 0;
    const playerFame = player.stats.fame;

    // Difficulty Modifier (A-List is hard)
    let difficulty = 0;
    if (npc.tier === 'A_LIST') difficulty = 50;
    else if (npc.tier === 'ESTABLISHED') difficulty = 30;
    else difficulty = 10;

    // Base Success Probability: (Openness + PlayerFame + CurrentRel) - Difficulty
    let chance = npc.openness + (playerFame * 0.5) + (currentRel * 0.5) - difficulty;
    
    // Ensure a minimum floor for chance so players can eventually break through
    // Even a nobody has a 10% chance to get a reply from an A-Lister
    const minChance = 10;

    // --- GREET (Start Here) ---
    if (type === 'GREET') {
        cost = 5;
        chance += 40; // Increased from 30
        playerText = "Hey! Huge fan of your work.";
        if (Math.random() * 100 < Math.max(minChance, chance)) {
            delta = 3; // Increased from 2
            npcText = "Hey thanks! 👋";
        } else {
            delta = 1; // Minimum gain for effort
            npcText = "Seen"; 
        }
    } 
    // --- COMPLIMENT (Requires Rel > 15) ---
    else if (type === 'COMPLIMENT') {
        cost = 10;
        if (currentRel < 15) {
            return { success: false, relationshipDelta: -1, playerText: "You are amazing!", npcText: "...", energyCost: cost, isBefriended: false, isFollowing: state.isFollowing || false };
        }
        chance += 30; // Increased from 20
        playerText = "Loved your recent performance. Really inspiring.";
        if (Math.random() * 100 < Math.max(minChance, chance)) {
            delta = 5; // Increased from 4
            npcText = "Appreciate that! Means a lot coming from you.";
        } else {
            delta = 1;
            npcText = "Seen";
        }
    }
    // --- COFFEE (Requires Rel > 40) ---
    else if (type === 'COFFEE') {
        cost = 15;
        if (currentRel < 40) {
            return { success: false, relationshipDelta: -5, playerText: "We should grab coffee sometime!", npcText: "I'm pretty busy right now.", energyCost: cost, isBefriended: false, isFollowing: state.isFollowing || false };
        }
        chance += 5; // Increased from -10
        playerText = "Are you in town? Let's grab a coffee.";
        if (Math.random() * 100 < Math.max(minChance, chance)) {
            delta = 10; // Increased from 8
            npcText = "Sounds fun! Let's do it.";
        } else {
            delta = 0;
            npcText = "My schedule is crazy, maybe another time.";
        }
    }
    // --- COLLAB (Requires Rel > 60) ---
    else if (type === 'COLLAB') {
        cost = 20;
        if (currentRel < 60) {
            return { success: false, relationshipDelta: -10, playerText: "I have a project idea for us.", npcText: "Let's stick to DMing for now.", energyCost: cost, isBefriended: false, isFollowing: state.isFollowing || false };
        }
        chance -= 5; // Increased from -20
        playerText = "I think we'd work great together. Thoughts on collaborating?";
        if (Math.random() * 100 < Math.max(minChance, chance)) {
            delta = 15; // Increased from 10
            npcText = "I was thinking the same thing. Have your agent call mine.";
        } else {
            delta = -2; // Reduced penalty
            npcText = "I'm booked solid for the next 2 years, sorry.";
        }
    }
    // --- BEFRIEND (Requires Rel > 80) ---
    else if (type === 'BEFRIEND') {
        cost = 0; // Free action to convert status
        if (currentRel >= 80) {
            isBefriended = true;
            delta = 5;
            playerText = "Let's make this official. Friends?";
            npcText = "Absolutely. I've got your back.";
        } else {
            return { success: false, relationshipDelta: 0, playerText: "Friends?", npcText: "Let's not rush things.", energyCost: 0, isBefriended: false, isFollowing: state.isFollowing || false };
        }
    }

    const success = npcText !== "" && npcText !== "...";
    const newCloseness = Math.min(100, Math.max(0, currentRel + delta));
    
    let isFollowing = state.isFollowing || false;
    if (!isFollowing && success && newCloseness > 40 && Math.random() > 0.5) {
        isFollowing = true;
    }

    return {
        success,
        relationshipDelta: delta,
        playerText,
        npcText,
        energyCost: cost,
        isBefriended,
        isFollowing
    };
};

/**
 * Calculates a box office multiplier based on the collective fame of the cast and director.
 * Base 1.0, +0.1 for every 20 points of total fame.
 */
export const calculateProjectFameMultiplier = (castIds: string[], directorName: string, playerFame: number, playerTalent?: number, extraFame: number = 0): number => {
    let totalFame = playerFame + extraFame;
    
    // Find director fame
    const director = NPC_DATABASE.find(n => n.name === directorName && n.occupation === 'DIRECTOR');
    if (director?.stats?.fame) totalFame += director.stats.fame;
    
    // Find cast fame
    castIds.forEach(id => {
        if (id === 'player') return;
        const npc = NPC_DATABASE.find(n => n.id === id);
        if (npc?.stats?.fame) totalFame += npc.stats.fame;
    });
    
    // Base 1.0, +1.0 for every 50 points of total fame
    let multiplier = 1.0 + (totalFame / 50);
    if (playerTalent) {
        multiplier += (playerTalent / 100) * 0.5;
    }
    return multiplier;
};
