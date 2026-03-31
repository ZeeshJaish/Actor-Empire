import { Writer, Script, Genre, WriterTier, ProjectType } from '../../types';

const FIRST_NAMES = ['John', 'Jane', 'Alex', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Chris', 'Amanda', 'Robert', 'Ashley', 'William', 'Brittany', 'James', 'Megan', 'Joseph', 'Samantha', 'Charles', 'Lauren', 'Thomas', 'Kayla', 'Daniel', 'Brianna', 'Matthew', 'Rachel', 'Anthony', 'Victoria', 'Mark', 'Morgan', 'Paul', 'Taylor', 'Steven', 'Haley', 'Andrew', 'Alexis', 'Kenneth', 'Sydney', 'Joshua', 'Chloe', 'Kevin', 'Alyssa', 'Brian', 'Hannah', 'George', 'Madison', 'Edward', 'Jasmine', 'Ronald', 'Destiny'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

const TITLES_BY_GENRE: Record<Genre, string[]> = {
    ACTION: ['Lethal Force', 'The Last Stand', 'Bulletproof', 'Code Red', 'Vengeance', 'The Operative', 'No Escape', 'Rogue State', 'Maximum Velocity', 'Crossfire'],
    HORROR: ['The Awakening', 'Blood Moon', 'The Cabin', 'Night Terrors', 'The Entity', 'Scream Queen', 'Dead of Night', 'The Haunting', 'Slaughterhouse', 'The Cursed'],
    COMEDY: ['The Hangover', 'Bridesmaids', 'Superbad', 'Step Brothers', 'Anchorman', 'Dumb and Dumber', 'Tropic Thunder', 'Mean Girls', 'Shaun of the Dead', 'Hot Fuzz'],
    SCI_FI: ['The Matrix', 'Inception', 'Interstellar', 'Blade Runner', 'The Terminator', 'Alien', 'Avatar', 'The Martian', 'Arrival', 'Ex Machina'],
    DRAMA: ['The Godfather', 'Schindler\'s List', 'The Shawshank Redemption', 'Forrest Gump', 'Fight Club', 'Pulp Fiction', 'The Green Mile', 'Goodfellas', 'The Social Network', 'There Will Be Blood'],
    ROMANCE: ['The Notebook', 'Titanic', 'Pride and Prejudice', 'La La Land', 'Casablanca', 'When Harry Met Sally', 'Dirty Dancing', 'A Walk to Remember', 'Notting Hill', 'Love Actually'],
    THRILLER: ['The Silence of the Lambs', 'Se7en', 'The Sixth Sense', 'Gone Girl', 'Prisoners', 'Zodiac', 'Shutter Island', 'The Departed', 'Memento', 'Black Swan'],
    ADVENTURE: ['Indiana Jones', 'Jurassic Park', 'Pirates of the Caribbean', 'The Lord of the Rings', 'Jumanji', 'The Mummy', 'National Treasure', 'Tomb Raider', 'The Goonies', 'Cast Away'],
    SUPERHERO: ['The Dark Knight', 'The Avengers', 'Spider-Man', 'Iron Man', 'Black Panther', 'Wonder Woman', 'Superman', 'Captain America', 'Thor', 'Guardians of the Galaxy']
};

const TITLE_COMPONENTS = {
    prefixes: [
        'The', 'Project', 'Operation', 'Dark', 'Last', 'Final', 'Secret', 'Hidden', 'Lost', 'Deadly', 'Silent', 'Broken', 'Golden', 'Iron', 'Shadow', 'Neon', 'Digital', 'Quantum', 'Eternal', 'Infinite',
        'Red', 'Blue', 'Black', 'White', 'Silver', 'Crystal', 'Burning', 'Frozen', 'Shattered', 'Ancient', 'Modern', 'Future', 'Cyber', 'Bio', 'Nano', 'Mega', 'Ultra', 'Hyper', 'Super', 'Global',
        'Cosmic', 'Galactic', 'Universal', 'Atomic', 'Nuclear', 'Solar', 'Lunar', 'Stellar', 'Void', 'Phantom', 'Ghost', 'Spirit', 'Soul', 'Mind', 'Heart', 'Blood', 'Bone', 'Steel', 'Titanium', 'Diamond'
    ],
    nouns: [
        'Protocol', 'Legacy', 'Horizon', 'Empire', 'Revenge', 'Justice', 'Edge', 'Point', 'Zero', 'One', 'Code', 'Signal', 'Echo', 'Void', 'Star', 'Moon', 'Sun', 'Earth', 'World', 'City', 'Street', 'Road', 'Path', 'Gate', 'Key', 'Sword', 'Shield', 'Heart', 'Soul', 'Mind', 'Blood', 'Bone', 'Stone', 'Fire', 'Water', 'Wind', 'Storm', 'Rain', 'Snow', 'Ice',
        'Agent', 'Assassin', 'Warrior', 'Soldier', 'Knight', 'King', 'Queen', 'Prince', 'Princess', 'Lord', 'Master', 'Slave', 'Rebel', 'Traitor', 'Spy', 'Detective', 'Hunter', 'Killer', 'Monster', 'Demon',
        'Angel', 'God', 'Titan', 'Giant', 'Dragon', 'Beast', 'Wolf', 'Lion', 'Tiger', 'Eagle', 'Hawk', 'Snake', 'Spider', 'Scorpion', 'Phoenix', 'Serpent', 'Leviathan', 'Kraken', 'Hydra', 'Chimera',
        'Machine', 'Robot', 'Cyborg', 'Android', 'AI', 'System', 'Network', 'Matrix', 'Grid', 'Core', 'Shell', 'Frame', 'Circuit', 'Data', 'Virus', 'Glitch', 'Error', 'Bug', 'Hack', 'Crack'
    ],
    suffixes: [
        'Rising', 'Falling', 'Awakened', 'Reborn', 'Forgotten', 'Unbound', 'Betrayed', 'Redeemed', 'Lost', 'Found', 'Broken', 'Mended', 'Divided', 'United', 'Beyond', 'Within', 'Without', 'Above', 'Below', 'Forever',
        'Incarnate', 'Unleashed', 'Reloaded', 'Revolution', 'Evolution', 'Revelation', 'Extinction', 'Survival', 'Arrival', 'Departure', 'Ascension', 'Descension', 'Invasion', 'Resistance', 'Liberation', 'Domination', 'Destruction', 'Creation', 'Origin', 'End'
    ],
    connectors: ['of', 'and', 'the', 'for', 'in', 'at', 'on', 'to', 'with', 'against', 'from', 'through', 'between', 'under', 'over']
};

const LOGLINE_COMPONENTS = {
    protagonists: [
        'A disgraced detective', 'A rogue AI', 'A group of teenagers', 'An aging hitman', 'A brilliant scientist', 
        'A small-town teacher', 'A space marine', 'A struggling artist', 'A corrupt politician', 'A mysterious drifter',
        'A high-school nerd', 'A world-class thief', 'A lonely widow', 'A cynical journalist', 'A naive intern',
        'A retired superhero', 'A time-traveling historian', 'A blind monk', 'A deaf musician', 'A mute assassin',
        'A paranoid conspiracy theorist', 'A disgraced priest', 'A runaway bride', 'A homeless veteran', 'A child prodigy',
        'A world-weary diplomat', 'A rebellious princess', 'A loyal bodyguard', 'A double agent', 'A professional mourner'
    ],
    incitingIncidents: [
        'discovers a hidden portal', 'is framed for a crime they didn\'t commit', 'witnesses a brutal murder', 
        'inherits a haunted mansion', 'accidentally starts a global war', 'loses their memory', 
        'finds a bag of stolen cash', 'receives a message from the future', 'is kidnapped by a secret society',
        'uncovers a corporate conspiracy', 'wakes up in a parallel universe', 'finds a mysterious artifact',
        'is infected with a strange virus', 'receives a terminal diagnosis', 'is forced out of retirement',
        'witnesses an alien abduction', 'discovers they have superpowers', 'is haunted by a vengeful spirit',
        'accidentally kills a powerful figure', 'finds a map to a lost city'
    ],
    goals: [
        'must save the world', 'fights for survival', 'seeks revenge', 'tries to clear their name', 
        'must find the truth', 'attempts to escape a dying planet', 'protects a child with special powers', 
        'races against time to stop a bomb', 'navigates a dangerous underworld', 'competes in a deadly tournament',
        'must dismantle a corrupt empire', 'seeks redemption for their past', 'tries to reunite with their family',
        'must prevent a catastrophic event', 'fights to reclaim their identity', 'attempts to pull off one last heist',
        'must survive a night in a haunted house', 'tries to stop a serial killer', 'must deliver a secret message',
        'fights to protect their hometown'
    ],
    twists: [
        'only to realize they are the villain', 'but their past comes back to haunt them', 
        'while falling in love with their enemy', 'before discovering it was all a simulation', 
        'as the walls close in', 'with the help of an unlikely ally', 'at the cost of everything they love',
        'in a world where emotions are illegal', 'under the watchful eye of an oppressive regime',
        'only to find out their ally is the traitor', 'but the truth is more terrifying than the lie',
        'while the clock ticks down', 'as the world crumbles around them', 'before realizing they are already dead',
        'with a secret that could change everything', 'in a race against their own shadow',
        'only to discover they are not alone', 'but the price of victory is too high',
        'while the lines between good and evil blur', 'as they become the very thing they feared'
    ]
};

export const generateProceduralAuthor = (): string => {
    const r = Math.random();
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    
    if (r < 0.1) return `${first.charAt(0)}. ${last}`;
    if (r < 0.2) return `${first.charAt(0)}.${last.charAt(0)}. ${last}`;
    if (r < 0.3) return `${first} ${last.charAt(0)}.`;
    return `${first} ${last}`;
};

export const generateProceduralTitle = (genre?: Genre): string => {
    const r = Math.random();
    const { prefixes, nouns, suffixes, connectors } = TITLE_COMPONENTS;
    
    if (r < 0.2 && genre && TITLES_BY_GENRE[genre]) {
        const base = TITLES_BY_GENRE[genre][Math.floor(Math.random() * TITLES_BY_GENRE[genre].length)];
        const pre = Math.random() < 0.3 ? prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' : '';
        const suf = Math.random() > 0.7 ? ' ' + suffixes[Math.floor(Math.random() * suffixes.length)] : '';
        return `${pre}${base}${suf}`.trim();
    }

    if (r < 0.4) {
        // Pattern: Prefix + Noun
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    } else if (r < 0.6) {
        // Pattern: Noun + Connector + Noun
        return `${nouns[Math.floor(Math.random() * nouns.length)]} ${connectors[Math.floor(Math.random() * connectors.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    } else if (r < 0.8) {
        // Pattern: Noun + Suffix
        return `${nouns[Math.floor(Math.random() * nouns.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    } else {
        // Pattern: Prefix + Noun + Suffix
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }
};

export const generateProceduralLogline = (): string => {
    const { protagonists, incitingIncidents, goals, twists } = LOGLINE_COMPONENTS;
    const p = protagonists[Math.floor(Math.random() * protagonists.length)];
    const i = incitingIncidents[Math.floor(Math.random() * incitingIncidents.length)];
    const g = goals[Math.floor(Math.random() * goals.length)];
    const t = twists[Math.floor(Math.random() * twists.length)];
    
    return `${p} ${i} and ${g}, ${t}.`;
};

const FAMOUS_WRITERS = [
    { name: 'Quentin Tarantino', skill: 98, tier: 'A_LIST' as WriterTier, stats: { creativity: 99, dialogue: 100, structure: 85, pacing: 92 } },
    { name: 'Aaron Sorkin', skill: 97, tier: 'A_LIST' as WriterTier, stats: { creativity: 85, dialogue: 100, structure: 95, pacing: 98 } },
    { name: 'Christopher Nolan', skill: 96, tier: 'A_LIST' as WriterTier, stats: { creativity: 98, dialogue: 80, structure: 100, pacing: 95 } },
    { name: 'Greta Gerwig', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 98, structure: 90, pacing: 92 } },
    { name: 'Jordan Peele', skill: 92, tier: 'A_LIST' as WriterTier, stats: { creativity: 98, dialogue: 90, structure: 88, pacing: 90 } },
    { name: 'Phoebe Waller-Bridge', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 96, dialogue: 99, structure: 92, pacing: 96 } },
    { name: 'Charlie Kaufman', skill: 93, tier: 'A_LIST' as WriterTier, stats: { creativity: 100, dialogue: 90, structure: 75, pacing: 70 } },
    { name: 'Bong Joon-ho', skill: 96, tier: 'A_LIST' as WriterTier, stats: { creativity: 97, dialogue: 92, structure: 98, pacing: 95 } },
    { name: 'Martin Scorsese', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 95, structure: 95, pacing: 98 } },
    { name: 'Steven Spielberg', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 88, structure: 98, pacing: 96 } },
    { name: 'Wes Anderson', skill: 93, tier: 'A_LIST' as WriterTier, stats: { creativity: 98, dialogue: 90, structure: 95, pacing: 92 } },
    { name: 'Sofia Coppola', skill: 91, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 85, structure: 88, pacing: 85 } },
    { name: 'Paul Thomas Anderson', skill: 96, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 96, structure: 92, pacing: 90 } },
    { name: 'David Fincher', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 92, structure: 98, pacing: 100 } },
    { name: 'Shonda Rhimes', skill: 92, tier: 'A_LIST' as WriterTier, stats: { creativity: 88, dialogue: 98, structure: 95, pacing: 96 } },
    { name: 'Ryan Murphy', skill: 90, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 90, structure: 85, pacing: 92 } },
    { name: 'Tina Fey', skill: 89, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 98, structure: 88, pacing: 95 } },
    { name: 'Donald Glover', skill: 93, tier: 'A_LIST' as WriterTier, stats: { creativity: 98, dialogue: 92, structure: 85, pacing: 90 } },
    { name: 'Taika Waititi', skill: 91, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 95, structure: 80, pacing: 92 } },
    { name: 'Guillermo del Toro', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 100, dialogue: 85, structure: 90, pacing: 88 } },
    { name: 'Alfonso Cuarón', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 88, structure: 96, pacing: 94 } },
    { name: 'Chloe Zhao', skill: 92, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 85, structure: 92, pacing: 80 } },
    { name: 'Emerald Fennell', skill: 90, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 95, structure: 85, pacing: 88 } },
    { name: 'Damien Chazelle', skill: 93, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 88, structure: 98, pacing: 95 } },
    { name: 'Taylor Sheridan', skill: 89, tier: 'A_LIST' as WriterTier, stats: { creativity: 85, dialogue: 92, structure: 95, pacing: 92 } },
    { name: 'Noah Baumbach', skill: 91, tier: 'A_LIST' as WriterTier, stats: { creativity: 88, dialogue: 98, structure: 85, pacing: 82 } },
    { name: 'Spike Lee', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 95, structure: 90, pacing: 92 } },
    { name: 'M. Night Shyamalan', skill: 88, tier: 'A_LIST' as WriterTier, stats: { creativity: 98, dialogue: 80, structure: 85, pacing: 88 } },
    { name: 'James Gunn', skill: 92, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 95, structure: 90, pacing: 96 } },
    { name: 'Rian Johnson', skill: 91, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 90, structure: 95, pacing: 94 } },
    { name: 'Denis Villeneuve', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 94, dialogue: 85, structure: 98, pacing: 92 } },
    { name: 'Hayao Miyazaki', skill: 99, tier: 'A_LIST' as WriterTier, stats: { creativity: 100, dialogue: 90, structure: 95, pacing: 90 } },
    { name: 'James Cameron', skill: 93, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 80, structure: 98, pacing: 98 } },
    { name: 'George Lucas', skill: 90, tier: 'A_LIST' as WriterTier, stats: { creativity: 98, dialogue: 75, structure: 90, pacing: 85 } },
    { name: 'Francis Ford Coppola', skill: 96, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 95, structure: 98, pacing: 92 } },
    { name: 'Joel Coen', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 98, structure: 95, pacing: 94 } },
    { name: 'Ethan Coen', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 98, structure: 95, pacing: 94 } },
    { name: 'Ava DuVernay', skill: 90, tier: 'A_LIST' as WriterTier, stats: { creativity: 88, dialogue: 92, structure: 90, pacing: 88 } },
    { name: 'Barry Jenkins', skill: 93, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 95, structure: 90, pacing: 85 } },
    { name: 'Sian Heder', skill: 89, tier: 'A_LIST' as WriterTier, stats: { creativity: 85, dialogue: 92, structure: 90, pacing: 88 } },
    { name: 'Celine Sciamma', skill: 92, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 90, structure: 88, pacing: 82 } },
    { name: 'Michaela Coel', skill: 91, tier: 'A_LIST' as WriterTier, stats: { creativity: 95, dialogue: 95, structure: 85, pacing: 92 } },
    { name: 'Jesse Armstrong', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 98, structure: 95, pacing: 98 } },
    { name: 'Vince Gilligan', skill: 95, tier: 'A_LIST' as WriterTier, stats: { creativity: 92, dialogue: 95, structure: 98, pacing: 96 } },
    { name: 'David Simon', skill: 94, tier: 'A_LIST' as WriterTier, stats: { creativity: 90, dialogue: 98, structure: 95, pacing: 92 } }

];

export const generateWriters = (count: number): Writer[] => {
    const writers: Writer[] = [];
    for (let i = 0; i < count; i++) {
        // 20% chance for a famous writer in the first 5 slots
        const isFamous = Math.random() < 0.2 && i < 5; 
        
        if (isFamous) {
            const famous = FAMOUS_WRITERS[Math.floor(Math.random() * FAMOUS_WRITERS.length)];
            writers.push({
                id: `writer_famous_${Date.now()}_${i}`,
                name: famous.name,
                skill: famous.skill,
                fee: 500000 + Math.floor(Math.random() * 500000),
                speed: 0.5 + (Math.random() * 0.3),
                tier: 'A_LIST',
                stats: famous.stats
            });
            continue;
        }

        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        
        // Tier logic
        const r = Math.random();
        let tier: WriterTier = 'COMMON';
        let skill = 0;
        let fee = 0;
        let speed = 1.0;
        let creativity = 0;
        let dialogue = 0;
        let structure = 0;
        let pacing = 0;

        if (r < 0.15) {
            tier = 'A_LIST';
            skill = Math.floor(Math.random() * 20) + 81; // 81 to 100
            fee = 250000 + Math.floor(Math.random() * 500000);
            speed = 0.6 + (Math.random() * 0.4); // 0.6 to 1.0 (Fast)
            creativity = Math.floor(Math.random() * 20) + 80;
            dialogue = Math.floor(Math.random() * 20) + 80;
            structure = Math.floor(Math.random() * 20) + 80;
            pacing = Math.floor(Math.random() * 20) + 80;
        } else if (r < 0.4) {
            tier = 'ASPIRING';
            skill = Math.floor(Math.random() * 30) + 10; // 10 to 40
            fee = 2000 + Math.floor(Math.random() * 8000);
            speed = 1.0 + (Math.random() * 0.5); // 1.0 to 1.5 (Slow)
            creativity = Math.floor(Math.random() * 40) + 10;
            dialogue = Math.floor(Math.random() * 40) + 10;
            structure = Math.floor(Math.random() * 40) + 10;
            pacing = Math.floor(Math.random() * 40) + 10;
        } else {
            tier = 'COMMON';
            skill = Math.floor(Math.random() * 40) + 41; // 41 to 80
            fee = 20000 + Math.floor(Math.random() * 80000);
            speed = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2 (Normal)
            creativity = Math.floor(Math.random() * 40) + 40;
            dialogue = Math.floor(Math.random() * 40) + 40;
            structure = Math.floor(Math.random() * 40) + 40;
            pacing = Math.floor(Math.random() * 40) + 40;
        }

        writers.push({
            id: `writer_${Date.now()}_${i}`,
            name: `${firstName} ${lastName}`,
            skill,
            fee,
            speed,
            tier,
            stats: {
                creativity,
                dialogue,
                structure,
                pacing
            }
        });
    }
    return writers.sort((a, b) => b.skill - a.skill);
};

const FAMOUS_BOOKS = [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'DRAMA' as Genre, quality: 95, logline: 'A mysterious millionaire pursues a lost love in the Roaring Twenties.' },
    { title: '1984', author: 'George Orwell', genre: 'SCI_FI' as Genre, quality: 98, logline: 'A man struggles against a totalitarian regime that controls every thought.' },
    { title: 'Dune', author: 'Frank Herbert', genre: 'SCI_FI' as Genre, quality: 94, logline: 'A young noble must protect the most valuable substance in the universe.' },
    { title: 'The Shining', author: 'Stephen King', genre: 'HORROR' as Genre, quality: 92, logline: 'A family is trapped in a haunted hotel during a brutal winter.' },
    { title: 'Sherlock Holmes', author: 'Arthur Conan Doyle', genre: 'THRILLER' as Genre, quality: 90, logline: 'A brilliant detective solves impossible crimes with logic and observation.' },
    { title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'ROMANCE' as Genre, quality: 96, logline: 'A spirited woman navigates social class and marriage in 19th-century England.' },
    { title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'ADVENTURE' as Genre, quality: 93, logline: 'A homebody hobbit is swept into an epic quest to reclaim a dragon\'s hoard.' },
    { title: 'Dracula', author: 'Bram Stoker', genre: 'HORROR' as Genre, quality: 88, logline: 'An ancient vampire travels to London to spread his undead curse.' },
    { title: 'The Godfather', author: 'Mario Puzo', genre: 'DRAMA' as Genre, quality: 97, logline: 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.' },
    { title: 'Jurassic Park', author: 'Michael Crichton', genre: 'SCI_FI' as Genre, quality: 89, logline: 'A theme park featuring cloned dinosaurs descends into chaos.' },
    { title: 'The Martian', author: 'Andy Weir', genre: 'SCI_FI' as Genre, quality: 87, logline: 'An astronaut is stranded on Mars and must use his ingenuity to survive.' },
    { title: 'Gone Girl', author: 'Gillian Flynn', genre: 'THRILLER' as Genre, quality: 91, logline: 'A man becomes the prime suspect when his wife goes missing on their fifth anniversary.' },
    { title: 'The Alchemist', author: 'Paulo Coelho', genre: 'ADVENTURE' as Genre, quality: 85, logline: 'A shepherd boy travels to Egypt in search of a hidden treasure.' },
    { title: 'The Da Vinci Code', author: 'Dan Brown', genre: 'THRILLER' as Genre, quality: 82, logline: 'A symbologist uncovers a secret society while investigating a murder at the Louvre.' },
    { title: 'The Hunger Games', author: 'Suzanne Collins', genre: 'ACTION' as Genre, quality: 88, logline: 'In a dystopian future, teenagers are forced to fight to the death on live TV.' },
    { title: 'Harry Potter', author: 'J.K. Rowling', genre: 'ADVENTURE' as Genre, quality: 94, logline: 'A young boy discovers he is a wizard and attends a magical boarding school.' },
    { title: 'The Road', author: 'Cormac McCarthy', genre: 'DRAMA' as Genre, quality: 93, logline: 'A father and son walk through a post-apocalyptic landscape.' },
    { title: 'American Psycho', author: 'Bret Easton Ellis', genre: 'THRILLER' as Genre, quality: 86, logline: 'A wealthy investment banker leads a double life as a serial killer.' },
    { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', genre: 'THRILLER' as Genre, quality: 89, logline: 'A journalist and a hacker team up to solve a decades-old disappearance.' },
    { title: 'Life of Pi', author: 'Yann Martel', genre: 'ADVENTURE' as Genre, quality: 90, logline: 'A boy survives a shipwreck and shares a lifeboat with a Bengal tiger.' }
];

const BOOK_TITLE_COMPONENTS = {
    adjectives: [
        'The', 'A', 'Silent', 'Hidden', 'Broken', 'Last', 'Final', 'Golden', 'Iron', 'Shadow', 'Neon', 'Digital', 'Quantum', 'Eternal', 'Infinite', 'Forgotten', 'Lost', 'Found', 'Secret', 'Dark',
        'Vibrant', 'Melancholy', 'Crimson', 'Azure', 'Emerald', 'Obsidian', 'Radiant', 'Gloomy', 'Whimsical', 'Savage', 'Graceful', 'Ancient', 'Celestial', 'Terrestrial', 'Ethereal', 'Subterranean'
    ],
    nouns: [
        'Empire', 'Legacy', 'Protocol', 'Horizon', 'Revenge', 'Justice', 'Edge', 'Point', 'Zero', 'Code', 'Signal', 'Echo', 'Void', 'Star', 'Moon', 'Sun', 'Earth', 'World', 'City', 'Street', 'Road', 'Path', 'Gate', 'Key', 'Sword', 'Shield', 'Heart', 'Soul', 'Mind', 'Blood', 'Bone', 'Stone', 'Fire', 'Water', 'Wind', 'Storm', 'Rain', 'Snow', 'Ice',
        'Chronicle', 'Tale', 'Fable', 'Myth', 'Legend', 'Saga', 'Odyssey', 'Journey', 'Voyage', 'Quest', 'Mission', 'Venture', 'Endeavor', 'Enterprise', 'Scheme', 'Plot', 'Conspiracy', 'Intrigue'
    ],
    verbs: [
        'Rising', 'Falling', 'Awakened', 'Reborn', 'Forgotten', 'Unbound', 'Betrayed', 'Redeemed', 'Lost', 'Found', 'Broken', 'Mended', 'Divided', 'United', 'Beyond', 'Within', 'Without', 'Above', 'Below', 'Forever',
        'Whispering', 'Screaming', 'Dancing', 'Sleeping', 'Waiting', 'Watching', 'Searching', 'Hiding', 'Fighting', 'Winning', 'Losing', 'Dying', 'Living', 'Dreaming', 'Waking'
    ]
};

export const generateTags = (quality: number, genre: Genre): string[] => {
    const tags: string[] = [];
    const r = Math.random();
    
    // Oscar Bait logic: High quality, usually Drama/Indie/Historical
    if (quality > 75 && ['DRAMA', 'INDIE', 'ROMANCE'].includes(genre) && r < 0.3) {
        tags.push('Oscar Bait');
    }
    
    // Crowd Pleaser logic: Action/Superhero/Comedy, good quality
    if (quality > 60 && ['ACTION', 'SUPERHERO', 'COMEDY', 'SCI_FI'].includes(genre) && r < 0.4) {
        tags.push('Crowd Pleaser');
    }

    // Add some random flavor tags occasionally
    if (Math.random() < 0.1) tags.push('Four-Quadrant');
    if (Math.random() < 0.1) tags.push('High Concept');
    if (Math.random() < 0.1 && genre === 'HORROR') tags.push('Elevated Horror');
    if (Math.random() < 0.1 && genre === 'SCI_FI') tags.push('Hard Sci-Fi');
    
    return tags;
};

export const generateBookIP = (): Script => {
    const { adjectives, nouns, verbs } = BOOK_TITLE_COMPONENTS;
    const genres = Object.keys(TITLES_BY_GENRE) as Genre[];
    const genre = genres[Math.floor(Math.random() * genres.length)];
    
    const r = Math.random();
    let title = '';
    if (r < 0.3) {
        title = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    } else if (r < 0.6) {
        title = `${nouns[Math.floor(Math.random() * nouns.length)]} of ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    } else if (r < 0.8) {
        title = `${nouns[Math.floor(Math.random() * nouns.length)]} ${verbs[Math.floor(Math.random() * verbs.length)]}`;
    } else {
        title = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${verbs[Math.floor(Math.random() * verbs.length)]}`;
    }
        
    const author = generateProceduralAuthor();
    const baseQuality = Math.floor(Math.random() * 50) + 40; // 40 to 90
    const projectType = Math.random() > 0.4 ? 'MOVIE' : 'SERIES';
    
    return {
        id: `ip_book_${Date.now()}_${Math.random()}`,
        title,
        author,
        genres: [genre],
        status: 'READY',
        quality: baseQuality,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: false,
        projectType,
        baseQuality,
        logline: generateProceduralLogline(),
        sourceMaterial: 'ADAPTATION',
        sourceMaterialType: 'BOOK',
        hype: Math.floor(Math.random() * 100),
        purchaseCost: 100000 + Math.floor(Math.random() * 900000), // 100k to 1M
        tags: generateTags(baseQuality, genre)
    };
};

export const generateIPMarket = (count: number, excludeTitles: string[] = []): Script[] => {
    const scripts: Script[] = [];
    
    // Add 2-3 famous books to the market
    const shuffledFamous = [...FAMOUS_BOOKS]
        .filter(book => !excludeTitles.includes(book.title))
        .sort(() => 0.5 - Math.random());
    const famousCount = Math.min(3, count);
    
    for (let i = 0; i < famousCount; i++) {
        const book = shuffledFamous[i];
        if (!book) continue;
        scripts.push({
            id: `ip_famous_${Date.now()}_${i}`,
            title: book.title,
            author: book.author,
            genres: [book.genre],
            status: 'READY',
            quality: book.quality,
            options: [],
            writerId: null,
            weeksInDevelopment: 0,
            totalDevelopmentWeeks: 0,
            isOriginal: false,
            projectType: Math.random() > 0.5 ? 'MOVIE' : 'SERIES',
            baseQuality: book.quality,
            logline: book.logline,
            sourceMaterial: 'ADAPTATION',
            sourceMaterialType: 'BOOK',
            hype: 80 + Math.floor(Math.random() * 20),
            purchaseCost: 1000000 + Math.floor(Math.random() * 4000000), // 1M to 5M
            tags: generateTags(book.quality, book.genre)
        });
    }

    const genres = Object.keys(TITLES_BY_GENRE) as Genre[];

    for (let i = scripts.length; i < count; i++) {
        const r = Math.random();
        if (r < 0.4) {
            const book = generateBookIP();
            if (!excludeTitles.includes(book.title)) {
                scripts.push(book);
            } else {
                i--; // Try again
            }
        } else {
            const genre = genres[Math.floor(Math.random() * genres.length)];
            const title = generateProceduralTitle(genre);
            
            if (excludeTitles.includes(title)) {
                i--;
                continue;
            }

            const logline = generateProceduralLogline();

            const baseQuality = Math.floor(Math.random() * 60) + 20; // 20 to 80
            const projectType = Math.random() > 0.3 ? 'MOVIE' : 'SERIES';
            const episodes = projectType === 'SERIES' ? (Math.floor(Math.random() * 8) + 6) : undefined;
            
            const isSpecScript = Math.random() > 0.5;

            scripts.push({
                id: `ip_${Date.now()}_${i}`,
                title,
                genres: [genre],
                status: 'READY',
                quality: baseQuality,
                options: [],
                writerId: null,
                weeksInDevelopment: 0,
                totalDevelopmentWeeks: 0,
                isOriginal: false,
                projectType,
                episodes,
                baseQuality,
                logline,
                sourceMaterial: 'ORIGINAL',
                sourceMaterialType: isSpecScript ? 'SPEC_SCRIPT' : 'SCREENPLAY',
                hype: Math.floor(Math.random() * 50),
                tags: generateTags(baseQuality, genre)
            });
        }
    }
    return scripts;
};
