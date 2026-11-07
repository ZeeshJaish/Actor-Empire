import type { Genre } from '../types';
import { inferSeasonNumber } from './episodeRatings';
import { getSeriesBaseTitle } from './seriesIdentity';

/**
 * #273: every series has episode names. They are built from a seed, so nothing is saved unless the player
 * asks for another set (a number) or types a name (only that name).
 */

const NAMES_BY_GENRE: Record<Genre, string[]> = {
    DRAMA: ['Old Wounds', 'The Empty Chair', 'Sunday Dinner', 'Letters Home', 'What We Owe', 'Second Chances', 'The Long Drive', 'Family Business', 'The Visit', 'Promises', 'Hard Truths', 'Room for One More', 'An Honest Mistake', 'Thirty Years', 'The Will', 'Moving Day', 'A Small Favor', 'Blood and Water', 'Last Summer', 'The Good Daughter', 'Broken Glass', 'Things Left Unsaid', 'The Wedding', 'Home for the Holidays', 'The Diagnosis', 'Starting Over'],
    CRIME: ['The Score', 'Cold Case', 'Paper Trail', 'Burner Phone', 'Dirty Money', 'The Inside Man', 'Safe House', 'Street Value', 'Wire Transfer', 'The Informant', 'A Clean Job', 'Loose Ends', 'Plea Deal', 'Chain of Custody', 'Protection', 'The Drop', 'Interrogation', 'Bad Blood', 'The Witness', 'Getaway', 'Reasonable Doubt', 'The Fence', 'Back Room', 'The Setup', 'Turned', 'Hush Money'],
    MYSTERY: ['The Harbour Light', 'Salt Water', 'Who Kept the Key', 'Second Burial', 'Low Water', 'The Lantern Room', 'The Missing Page', 'A Locked Door', 'The Last Letter', 'Footprints', 'The Stranger at the Inn', 'What the Maid Saw', 'Echoes', 'The Photograph', 'False Bottom', 'Room Nine', 'Old Records', 'The Alibi', 'Under the Floorboards', 'The Quiet Tide', 'Black Ink', 'A Name in the Ledger', 'The Clock Stopped', 'Tide Marks', 'The Visitor', 'Dead Reckoning'],
    THRILLER: ['Zero Hour', 'No Way Back', 'The Handler', 'Trust No One', 'Countdown', 'Dead Drop', 'Blackout', 'The Exit', 'Breach', 'Compromised', 'Point of No Return', 'The Asset', 'Forty-Eight Hours', 'Burned', 'Line of Sight', 'Cover Story', 'Run', 'The Mole', 'Extraction', 'Safe Word', 'Flashpoint', 'Last Known Address', 'Silent Alarm', 'The Second Phone', 'Cut Off', 'False Flag'],
    HORROR: ["Don't Go Upstairs", 'The Basement', 'Something in the Walls', 'Lights Out', 'It Knows', 'The Crawlspace', 'Scratching', 'Bad Dreams', 'Nobody Home', 'The Old Well', 'Cold Spot', 'Hush', 'The Attic', 'They Come at Night', 'Feeding Time', 'Bone Orchard', 'The Doll', 'Knock Three Times', 'Sleepwalker', 'Blood Moon', 'Dead Air', 'Vacancy', 'The Thing in the Lake', 'Last Rites', 'Skin Deep', "Don't Look Back"],
    SCI_FI: ['First Contact', 'Dead Orbit', 'The Signal', 'Zero-G', 'Cold Sleep', 'Terminal Velocity', 'Ghost in the Code', 'Deep Space', 'Colony', 'The Long Dark', 'Reentry', 'Hard Reset', 'Station Nine', 'Parallax', 'Uplink', 'Time Dilation', 'Last Transmission', 'The Array', 'Red Dust', 'Failsafe', 'Synthetic', 'Airlock', 'Blind Jump', 'Memory Core', 'Earthrise', 'Quantum Drift'],
    ACTION: ['Hot Zone', 'Full Throttle', 'Ambush', 'Crossfire', 'Breakout', 'Rescue Run', 'Live Ammo', 'Head On', 'Last Stand', 'Bridge Out', 'Convoy', 'Road Block', 'Firefight', 'Close Quarters', 'Rooftops', 'Collateral', 'Getaway Driver', 'Stand Your Ground', 'Demolition', 'Night Raid', 'Danger Close', 'No Retreat', 'Smoke and Steel', 'Point Blank', 'Overrun', 'Payback'],
    ADVENTURE: ['The Map', 'Uncharted Waters', 'Base Camp', 'The Crossing', 'Lost River', 'Treasure', 'High Pass', 'The Old Temple', 'Shipwreck', 'Into the Jungle', 'The Expedition', 'Rope Bridge', 'Deep Cave', 'The Compass', 'No Trail', 'Desert Road', 'Island of Bones', 'The Summit', 'Storm at Sea', 'Trading Post', 'Hidden Valley', 'The Guide', 'Last Supplies', 'Ancient Stones', 'The Long Walk', 'Wild Country'],
    SUPERHERO: ['Origin', 'The Mask', 'Secret Identity', 'Powers', 'Collateral Damage', 'First Flight', 'Night Patrol', 'The Suit', 'Nemesis', 'Hero of the City', 'Day Job', 'Unmasked', 'The Lab', 'Sidekick', 'Public Enemy', 'Team Up', 'Weak Spot', 'Power Surge', 'The Cape', 'Civilians', 'Rogue', 'New Recruit', 'The Hearing', 'City on Fire', 'Double Life', 'The Vigilante'],
    COMEDY: ['Bad Idea', 'Who Invited Him', 'Group Chat', 'Office Party', 'Awkward Silence', 'Oops', 'The Wrong Wedding', 'Free Samples', 'Parking Ticket', "My Cousin's Boat", 'Neighbors', 'Reply All', 'Everyone Knows', 'Bring Your Mom to Work', 'The Surprise Party', 'Couples Therapy', 'Worst Best Man', 'Karaoke Night', 'Lost Luggage', 'The Diet', 'Road Trip', 'Stuck in the Elevator', 'Jury Duty', 'The Gym Membership', 'Big Fat Lie', 'Not My Fault'],
    ROMANCE: ['First Date', 'The Wrong Number', 'Meet Me There', 'Rain Check', 'Almost', 'Last Train', 'Love Letters', 'Two Tickets', 'The Ex', 'Slow Dance', 'Stay', 'Honest Hearts', 'Second First Date', 'The Proposal', 'Long Distance', 'What Might Have Been', 'Morning After', 'Coffee at Nine', 'The Other Woman', 'Say It', 'Paper Hearts', "Summer's End", 'Goodbye Kiss', 'You Again', 'Two Rooms', 'Right Person, Wrong Time'],
    MUSICAL: ['Opening Number', 'Sound Check', 'The Audition', 'Encore', 'Off Key', 'Stage Fright', 'Duet', 'Harmony', 'Rehearsal', 'Curtain Up', 'Solo', 'First Note', 'Backstage', 'Understudy', 'Tour Bus', 'Big Number', 'The Record Deal', 'Standing Ovation', 'Broken Strings', 'Second Verse', 'Tempo', 'Final Rehearsal', 'Battle of the Bands', 'Last Song', 'Spotlight', 'Sing It Back'],
    BIOPIC: ['Early Years', 'The First Break', 'Small Town', 'Rising', 'Fame', 'The Price', 'Family First', 'Rock Bottom', 'The Comeback', 'The Interview', 'The Scandal', 'Home Movies', 'Legacy', 'Turning Point', 'The Big Stage', 'Private Life', 'Public Life', 'Years of Struggle', 'First Success', 'The Trial', 'Old Friends', 'The Letter', 'Losing Everything', 'The Award', 'Growing Up', 'In Their Own Words'],
    SPORTS: ['Game Day', 'The Draft', 'Training Camp', 'Injury Time', 'Home Field', 'Underdogs', 'Fourth Quarter', 'The Rival', 'Last Season', 'Locker Room', 'Trade Deadline', 'Penalty', 'Overtime', 'The Coach', 'Away Game', 'Playoffs', 'New Contract', 'Season Opener', 'Sudden Death', 'Rookie', 'Bench', 'The Comeback', 'Second Half', 'Championship', 'Hard Tackle', 'The Final Whistle'],
    ANIMATION: ['The Big Day', 'Lost Puppy', 'Snow Day', 'Best Friends', 'The Talent Show', 'Moon Trip', 'Bad Hair Day', 'Pirate Island', 'Dragon Sitter', 'The Giant Sandwich', 'Monster Under the Bed', 'School Picture', 'Robot Buddy', 'Big Bad Storm', 'Field Trip', 'The Wishing Well', 'Time Machine Trouble', 'Treasure Hunt', 'Invisible Day', 'Sleepover', 'Shrink Ray', 'The Great Race', 'Haunted Playground', 'Birthday Surprise', 'Cloud Castle', 'The Lost Balloon'],
    FANTASY: ['The Prophecy', 'Blood Oath', "The Regent's Daughter", 'Ash and Oath', 'The Burnt Road', 'A Crown Offered', 'What the Regent Knew', 'Embers', 'The Long Council', 'Before the Fire', 'Queen of Nothing', 'Dragonfire', 'Old Magic', 'The Sword', 'The Wall of Thorns', 'Witch Hunt', 'The High Keep', 'Coronation', 'Exile', 'Dark Forest', 'Spellbound', 'Moonrise', 'The Betrayal', 'Winter Court', 'The Pact', 'Heir Apparent'],
    DOCUMENTARY: ['The Beginning', 'Inside Story', 'Eyewitness', 'Behind Closed Doors', 'The Evidence', 'Turning Points', 'The Real Story', 'In the Archives', 'On the Ground', 'Voices', 'Who Profits', 'Follow the Money', 'Day by Day', 'Home Movies', 'The Cover-Up', 'What Happened Next', 'The People', 'A Closer Look', 'First Accounts', 'Unseen Footage', 'Aftermath', 'The Investigation', 'Testimony', 'Where They Are Now', 'The Numbers', 'Lessons'],
};

const ANY_SHOW = ['Crossroads', 'The Long Night', 'Breaking Point', 'Fallout', 'Unfinished Business', 'Point of View', 'The Deal', 'New Blood', 'Rules of the Game', 'Second Thoughts', 'Cracks', 'Shifting Ground', 'Hard Choices', 'Slow Burn', 'Uninvited', 'Collision', 'Turning Back', 'One More Time', 'In Plain Sight', 'The Favor', 'Heavy Lies', 'A Fair Price', 'Tell Me Why', 'Room to Breathe', 'Nowhere Left', 'Wake Up', 'On the Edge', 'The Gift', 'Face to Face', 'Sea Change', 'Undercurrent', 'Tipping Point', 'Moment of Truth', 'Pressure', 'The Truth', 'Changing Sides', 'Common Ground', 'All In'];
const FIRST_SEASON_OPENERS = ['Pilot', 'The First Day', 'Day One', 'New Arrivals', 'Where It Starts', 'Arrival', 'First Light', 'Opening Night', 'The Offer', 'Everything Changes', 'Before the Storm'];
const LATER_SEASON_OPENERS = ['Six Months Later', 'The Return', 'Back to Work', 'After', 'What Came Next', 'Welcome Back', 'New Rules', 'Picking Up the Pieces', 'A Year Later', 'Back Again'];
const CLOSERS = ['The Last Day', 'Reckoning', 'What Remains', 'The Final Hour', 'Last Call', 'Full Circle', 'Goodbye', 'Everything Ends', 'The Long Way Home', 'Last Light', 'Final Cut', 'The Last Word'];

const hash = (value: string): number => {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        result ^= value.charCodeAt(i);
        result = Math.imul(result, 16777619);
    }
    return result >>> 0;
};

const shuffled = <T,>(items: T[], seed: string): T[] => {
    const list = [...items];
    let state = hash(seed) || 1;
    for (let i = list.length - 1; i > 0; i -= 1) {
        /* xorshift: the same seed always gives the same order */
        state ^= state << 13; state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5; state >>>= 0;
        const j = state % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
};

export interface EpisodeNameInput {
    seed: string;
    genre?: string;
    episodes: number;
    season?: number;
    /** 0 is the first set; Auto-name all moves to the next */
    set?: number;
    /** names the player typed, by episode number */
    custom?: Record<string, string>;
}

export const buildEpisodeNames = ({ seed, genre, episodes, season = 1, set = 0, custom }: EpisodeNameInput): string[] => {
    const count = Math.max(0, Math.round(episodes));
    const key = `${seed}:${season}:${set}`;
    const opener = shuffled(season > 1 ? LATER_SEASON_OPENERS : FIRST_SEASON_OPENERS, `${key}:open`)[0];
    const closer = shuffled(CLOSERS, `${key}:close`)[0];
    const middle = [
        ...shuffled(NAMES_BY_GENRE[genre as Genre] || NAMES_BY_GENRE.DRAMA, `${key}:genre`),
        ...shuffled(ANY_SHOW, `${key}:any`),
    ];
    const names = Array.from({ length: count }, (_, index) => {
        if (index === 0) return opener;
        if (index === count - 1) return closer;
        return middle[index - 1] || `Episode ${index + 1}`;
    });
    return names.map((name, index) => custom?.[String(index + 1)]?.trim() || name);
};

/** The names of a saved season, whichever record holds it */
export const getProjectEpisodeNames = (row: any, episodes?: number): string[] => {
    const details = row?.projectDetails || row || {};
    const title = row?.name || row?.title || details.title || '';
    return buildEpisodeNames({
        seed: String(details.episodeNameSeed || details.sourceScriptId || getSeriesBaseTitle(title)),
        genre: details.genre || row?.genre,
        episodes: Number(episodes || details.episodes || row?.episodes || 0),
        season: inferSeasonNumber({ ...details, title }),
        set: Number(details.episodeNameSet || 0),
        custom: details.customEpisodeNames,
    });
};
