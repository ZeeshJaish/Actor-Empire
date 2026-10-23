import type { Genre } from '../types';

export interface ProjectTitlePalette { nouns: readonly string[]; adjectives: readonly string[] }
const DEFAULT: ProjectTitlePalette = {
    nouns: ['Dream', 'Heart', 'City', 'World', 'Night', 'Star', 'Shadow', 'Horizon', 'Frontier', 'Empire', 'Signal', 'Promise', 'Journey', 'Memory', 'River', 'Storm', 'Soul', 'Life', 'Love', 'Moon', 'Sun', 'Sea', 'Ocean', 'Mountain', 'Forest', 'Desert', 'Garden', 'Machine', 'Ghost', 'Spirit', 'Light', 'Flame', 'Spark', 'Ember', 'Ash', 'Dust', 'Blood', 'Whisper', 'Song', 'Dance', 'Kingdom', 'Republic', 'Union', 'Alliance', 'Syndicate'],
    adjectives: ['Hidden', 'Silent', 'Golden', 'Broken', 'Wild', 'Last', 'First', 'Lost', 'Distant', 'Electric', 'Velvet', 'Crimson', 'Silver', 'Endless', 'Quiet', 'Fading', 'Secret', 'Eternal', 'Fleeting', 'Brave', 'Fierce', 'Gentle', 'Azure', 'Violet', 'Black', 'White', 'Grey', 'Neon', 'Digital', 'Analog', 'Final', 'Infinite', 'Zero', 'Prime', 'Solar', 'Lunar', 'Stellar', 'Crystal', 'Iron', 'Glass'],
};
const PALETTES: Partial<Record<Genre, ProjectTitlePalette>> = {
    ACTION: { nouns: ['Redline', 'Convoy', 'Throttle', 'Getaway', 'Crossfire', 'Ignition', 'Pursuit', 'Road', 'Mission', 'Velocity'], adjectives: ['Full', 'Midnight', 'Final', 'Open', 'Burning', 'Rogue', 'Furious', 'Steel'] },
    ADVENTURE: { nouns: ['Compass', 'Voyage', 'Treasure', 'Corsair', 'Expedition', 'Harbour', 'Frontier', 'Map', 'Outpost', 'Passage'], adjectives: ['Uncharted', 'Stormbound', 'Forgotten', 'Wayward', 'Distant', 'Golden', 'Lost', 'Wild'] },
    SCI_FI: { nouns: ['Paradox', 'Timeline', 'Orbit', 'Signal', 'Continuum', 'Voyager', 'Protocol', 'Gravity', 'Tomorrow', 'Echo'], adjectives: ['Quantum', 'Distant', 'Parallel', 'Silent', 'Infinite', 'Fractured', 'Solar', 'Unknown'] },
    CRIME: { nouns: ['Ledger', 'Alibi', 'Vault', 'Witness', 'Crew', 'Ransom', 'Getaway', 'Switch', 'Debt', 'Operation'], adjectives: ['Crooked', 'Midnight', 'Stolen', 'Silent', 'Double', 'Last', 'Broken', 'Dirty'] },
    THRILLER: { nouns: ['Witness', 'Patient', 'Memory', 'Pursuit', 'Signal', 'Deadline', 'Confession', 'Visitor', 'Promise', 'Room'], adjectives: ['Unreliable', 'Missing', 'Silent', 'Last', 'Hidden', 'Fractured', 'Deadly', 'Distant'] },
    MYSTERY: { nouns: ['Clue', 'Island', 'Reflection', 'Letter', 'Patient', 'Portrait', 'Witness', 'Memory', 'Door', 'Secret'], adjectives: ['Missing', 'Unspoken', 'Hidden', 'Forgotten', 'Twisted', 'Silent', 'False', 'Final'] },
    HORROR: { nouns: ['House', 'Visitor', 'Door', 'Whisper', 'Ritual', 'Shadow', 'Hollow', 'Attic', 'Harvest', 'Night'], adjectives: ['Hollow', 'Unquiet', 'Forbidden', 'Buried', 'Waking', 'Cold', 'Crimson', 'Forgotten'] },
    DRAMA: { nouns: ['Promise', 'Letter', 'Inheritance', 'Home', 'River', 'Portrait', 'Summer', 'Farewell', 'Family', 'Memory'], adjectives: ['Unfinished', 'Quiet', 'Broken', 'Little', 'Last', 'Distant', 'Ordinary', 'Golden'] },
    ROMANCE: { nouns: ['Letter', 'Summer', 'Promise', 'Heart', 'Dance', 'Chance', 'Station', 'Kiss', 'Sunday', 'Home'], adjectives: ['Unexpected', 'Last', 'First', 'Endless', 'Stolen', 'Wild', 'Distant', 'Golden'] },
    COMEDY: { nouns: ['Neighbour', 'Wedding', 'Weekend', 'Holiday', 'Mistake', 'Reunion', 'Roommate', 'Cousin', 'Plan', 'Trouble'], adjectives: ['Accidental', 'Unexpected', 'Unlikely', 'Perfect', 'Awkward', 'Double', 'Wrong', 'Wild'] },
    FANTASY: { nouns: ['Crown', 'Kingdom', 'Oath', 'Dragon', 'Lantern', 'Gate', 'Wanderer', 'Oracle', 'Forest', 'Spell'], adjectives: ['Forgotten', 'Silver', 'Fallen', 'Hidden', 'Eternal', 'Wild', 'Crimson', 'Ancient'] },
    SUPERHERO: { nouns: ['Sentinel', 'Alliance', 'Guardian', 'Legacy', 'Shield', 'Beacon', 'City', 'Dawn', 'Vanguard', 'Reckoning'], adjectives: ['Fallen', 'Last', 'United', 'Silent', 'Rising', 'Hidden', 'Iron', 'Unbroken'] },
    SPORTS: { nouns: ['Contender', 'Final', 'Season', 'Comeback', 'Champion', 'Rival', 'Finish', 'Captain', 'Victory', 'Arena'], adjectives: ['Unbeaten', 'Last', 'Rising', 'Final', 'Unknown', 'Unbroken', 'Wild', 'Golden'] },
    BIOPIC: { nouns: ['Portrait', 'Legacy', 'Journey', 'Voice', 'Life', 'Stage', 'Dream', 'Revolution', 'Vision', 'Name'], adjectives: ['Unwritten', 'Extraordinary', 'Hidden', 'Restless', 'Unbroken', 'Quiet', 'First', 'Last'] },
    DOCUMENTARY: { nouns: ['Witness', 'Frontier', 'Planet', 'Border', 'Ocean', 'Truth', 'Archive', 'Voices', 'Horizon', 'Footprint'], adjectives: ['Unseen', 'Hidden', 'Changing', 'Vanishing', 'Living', 'Forgotten', 'Last', 'Open'] },
    MUSICAL: { nouns: ['Melody', 'Rhythm', 'Stage', 'Song', 'Dance', 'Encore', 'Harmony', 'Chorus', 'Spotlight', 'Dream'], adjectives: ['Electric', 'Golden', 'Restless', 'Unfinished', 'Last', 'First', 'Midnight', 'Wild'] },
    ANIMATION: { nouns: ['Lantern', 'Cloud', 'Garden', 'Comet', 'Journey', 'Fox', 'Island', 'Clock', 'Compass', 'Star'], adjectives: ['Little', 'Brave', 'Wild', 'Hidden', 'Golden', 'Wayward', 'Impossible', 'Distant'] },
};
export const PROJECT_TITLE_PLACES = ['Midnight', 'Dawn', 'Tomorrow', 'the Border', 'the Harbour', 'the Valley', 'the City', 'the River', 'the Horizon', 'the Last Station', 'the Mountains', 'the Storm', 'Winter', 'Summer', 'the Edge', 'the Coast', 'the Crossroads', 'the Rain', 'the Frontier', 'the Old Quarter', 'the Far Shore', 'the Garden', 'the Northern Lights', 'the Orchard', 'the Desert', 'the Hill', 'the Market', 'the Bridge', 'the Lighthouse', 'the Wild', 'the Deep', 'the End'];
export const PROJECT_TITLE_SUBTITLES = ['Beyond Tomorrow', 'The Last Promise', 'After the Storm', 'A Second Chance', 'Before the Dawn', 'The Long Way Home', 'No Way Back', 'A World Apart', 'One More Night', 'The Other Side', 'Where We Begin', 'The Final Crossing', 'Under Open Skies', 'An Unwritten Future', 'What We Leave Behind', 'Until Morning', 'A Quiet Reckoning', 'Across the Divide', 'The Missing Years', 'An Open Road', 'The First Light', 'Against the Tide', 'A Hidden Life', 'The Unfinished Story', 'After the Silence', 'One Final Wish', 'A Different Sky', 'The Turning Point', 'What Remains', 'On Borrowed Time', 'A Place to Return', 'Nothing Left Unsaid'];
export const PROJECT_TITLE_VERBS = ['Rising', 'Falling', 'Burning', 'Awakening', 'Returning', 'Calling', 'Running', 'Waiting', 'Remembered', 'Unbound', 'Reborn', 'Uncovered', 'Breaking', 'Healing', 'Living', 'Surviving', 'Searching', 'Hiding', 'Seeking', 'Chasing', 'Dreaming', 'Waking', 'Answering', 'Finding'];
const paletteCache = new Map<Genre, ProjectTitlePalette>();
export const getProjectTitlePalette = (genre?: Genre): ProjectTitlePalette => {
    if (!genre || !PALETTES[genre]) return DEFAULT;
    const existing = paletteCache.get(genre);
    if (existing) return existing;
    const palette = {
        nouns: [...new Set([...PALETTES[genre]!.nouns, ...DEFAULT.nouns])],
        adjectives: [...new Set([...PALETTES[genre]!.adjectives, ...DEFAULT.adjectives])],
    };
    paletteCache.set(genre, palette);
    return palette;
};
