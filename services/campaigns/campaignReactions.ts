/**
 * What people say about the player's campaigns, by what they ran (#161; plan §20.14, Zeesh: "कैंपेन आफ्टर मार्थ कि सोशल
 * मीडिया न्यूज़ एंड ऑल जगह … हमारे कैंपेन के अलग अलग टाइप्स अलग अलग होता है ना रिस्पॉन्स दिखे"):
 *  - each format has its own voices and words: a feed's post that stops the scroll, a short video's trend, creators'
 *    sponsored reviews (and the eye-rolls at them), the ad in the TV break, billboards, trains, posters and flyers seen in
 *    the street (and the litter), the screens travellers and shoppers pass; a search ad only the trade notices;
 *  - its first week (its loudest format leads, another joins), a week mid-run, and its end;
 *  - all-out and long campaigns tire people out; a good result is celebrated, a dear one criticised.
 * Pure words and voices: streamingCampaignNews.ts picks the weeks and makes the facts and the posts.
 */
import type { CampaignFormatId } from '../../types';

export type ReactionVoice = 'FAN' | 'PUBLIC' | 'CREATOR' | 'TRADE';
/** UP: glad of it; MIXED: amused or unsure; DOWN: tired of it, or unimpressed */
export type ReactionTone = 'UP' | 'MIXED' | 'DOWN';
/** `own`: the words when the campaign is for the service itself (its name is the service's) */
export interface ReactionLine { voice: ReactionVoice; tone: ReactionTone; text: string; own?: string }

interface FormatReactions {
    /** the story its first week makes when it leads a campaign with no big moment (`own…`: for the service itself) */
    headline: string;
    detail: string;
    ownHeadline?: string;
    ownDetail?: string;
    /** what people post its first week, the first the loudest */
    posts: ReactionLine[];
    /** how far its posts carry, 1–5 */
    loud: number;
    /** it is seen in the street, so people share a picture of it */
    photo?: boolean;
}

/* {name} the campaign's subject (a title, or the service), {service}, {city} its biggest country's city, {countries} */
export const FORMAT_REACTIONS: Record<CampaignFormatId, FormatReactions> = {
    SOCIAL_FEED: {
        headline: '{name} is all over people\'s feeds',
        detail: '{service}\'s campaign for {name} is running in social feeds in {countries}.',
        loud: 4,
        posts: [
            { voice: 'FAN', tone: 'UP', text: 'The {name} ad just stopped my scroll. Adding it tonight', own: 'The {service} ad just stopped my scroll. Signing up tonight' },
            { voice: 'PUBLIC', tone: 'MIXED', text: 'Every third post on my feed is {name} now. Okay {service}, I get it', own: 'Every third post on my feed is {service} now. Okay, I get it' },
            { voice: 'FAN', tone: 'UP', text: 'Whoever made the {name} posts for {service} deserves a raise', own: 'Whoever made the {service} posts deserves a raise' },
        ],
    },
    SHORT_VIDEO: {
        headline: '{name} clips take over short video',
        detail: 'Vertical cuts of {name} are running on short-video apps in {countries}.',
        loud: 5,
        posts: [
            { voice: 'FAN', tone: 'UP', text: 'The {name} clip is on my feed for the fifth time today and I\'m not even mad' },
            { voice: 'CREATOR', tone: 'UP', text: 'Duetting the {name} trailer because that last shot 😮' },
            { voice: 'PUBLIC', tone: 'MIXED', text: 'Everyone\'s using the {name} sound now. I don\'t even know what it\'s from' },
        ],
    },
    SEARCH: {
        headline: '{service} buys the top of the search results for {name}',
        detail: 'People looking for {name} in {countries} find {service} first.',
        ownHeadline: '{service} buys the top of the search results',
        ownDetail: 'People looking for something to watch in {countries} find {service} first.',
        loud: 1,
        posts: [
            { voice: 'TRADE', tone: 'MIXED', text: 'Quiet, smart buy: {service} sits first in search for {name}, right when people look', own: 'Quiet, smart buy: {service} sits first in search right when people look for something to watch' },
        ],
    },
    CREATORS: {
        headline: 'Creators line up for {name}',
        detail: '{service} is paying creators to review and react to {name} in {countries}.',
        ownDetail: '{service} is paying creators to try it and talk about it in {countries}.',
        loud: 4,
        posts: [
            { voice: 'CREATOR', tone: 'UP', text: 'Watched {name} so you don\'t have to... okay, you should actually watch it #ad', own: 'Tried {service} for a week so you don\'t have to... okay, you should actually try it #ad' },
            { voice: 'PUBLIC', tone: 'DOWN', text: 'Is every creator sponsored by {service} this week or is it just me' },
            { voice: 'CREATOR', tone: 'UP', text: '{service} sent me {name} early. My honest review is up', own: '{service} gave me early access. My honest review is up' },
        ],
    },
    CTV: {
        headline: '{name} ads land on smart TVs',
        detail: '{service} is running {name} as the sponsored pick on connected TVs in {countries}.',
        ownDetail: '{service} is the sponsored pick on connected TVs in {countries}.',
        loud: 3,
        posts: [
            { voice: 'PUBLIC', tone: 'MIXED', text: 'Can\'t even skip the {name} ad on my TV. Fine. It looks good' },
            { voice: 'FAN', tone: 'UP', text: 'The {name} ad came on before my show and now I\'m watching {name} instead', own: 'The {service} ad came on before my show. Okay, I\'m curious' },
        ],
    },
    TV_SPOTS: {
        headline: '{service}\'s {name} spot hits prime time',
        detail: '{service} bought prime-time breaks for {name} in {countries}.',
        ownHeadline: '{service}\'s TV spot hits prime time',
        ownDetail: '{service} bought prime-time breaks in {countries}.',
        loud: 5,
        posts: [
            { voice: 'PUBLIC', tone: 'UP', text: 'That {name} ad in the break 👀 the whole room went quiet' },
            { voice: 'FAN', tone: 'UP', text: 'The {name} TV spot gave me chills. My mum asked what it was' },
            { voice: 'TRADE', tone: 'MIXED', text: '{service} is buying prime time for {name}: reach over targeting, old school and loud', own: '{service} is buying prime time: reach over targeting, old school and loud' },
        ],
    },
    BILLBOARD: {
        headline: '{name} billboards go up in {city}',
        detail: '{service} put {name} on roadside and rooftop boards in {countries}.',
        loud: 3,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'UP', text: 'Saw the {name} billboard on my way home. Okay {service}, noted', own: 'Saw the {service} billboard on my way home. Okay, noted' },
            { voice: 'FAN', tone: 'UP', text: 'There\'s a giant {name} board outside my office and I keep staring at it' },
        ],
    },
    METRO_WRAP: {
        headline: '{service} wraps {city}\'s trains in {name}',
        detail: 'Whole trains carry {name} in {countries}.',
        ownHeadline: '{service} wraps {city}\'s trains',
        loud: 4,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'MIXED', text: 'The whole train is {name} now 😂 my commute has a theme' },
            { voice: 'FAN', tone: 'UP', text: 'Rode the {name} train today. Ten out of ten, would ride again' },
        ],
    },
    POSTER_WALL: {
        headline: '{name} posters cover {city}\'s streets',
        detail: 'Walls of {name} posters went up in {countries}.',
        loud: 3,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'MIXED', text: 'The {name} posters are on every wall between my flat and the station' },
            { voice: 'FAN', tone: 'UP', text: 'Someone already drew a moustache on the {name} poster near me. It\'s an event now' },
        ],
    },
    FLYERS: {
        headline: '{service} takes {name} to the streets, hand to hand',
        detail: 'Teams are handing out {name} flyers in busy streets in {countries}.',
        ownHeadline: '{service} takes to the streets, hand to hand',
        loud: 1,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'UP', text: 'Got handed a {name} flyer at the station. Old school, I like it' },
            { voice: 'PUBLIC', tone: 'DOWN', text: '{name} flyers all over the pavement this morning. Bin them please, {service}', own: '{service} flyers all over the pavement this morning. Bin them please' },
        ],
    },
    AIRPORT_SCREENS: {
        headline: '{name} greets travellers at airports',
        detail: '{service} took the screens at gates and baggage halls for {name} in {countries}.',
        ownDetail: '{service} took the screens at gates and baggage halls in {countries}.',
        loud: 2,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'UP', text: 'Landed and {name} was on every screen at the gate. Welcome home, I guess' },
            { voice: 'FAN', tone: 'MIXED', text: 'Flight delayed but at least the {name} trailer is on a loop at my gate', own: 'Flight delayed but at least the {service} ad is on a loop at my gate' },
        ],
    },
    MALL_SCREENS: {
        headline: '{name} lights up the malls',
        detail: '{service} is showing {name} on the big screens in malls in {countries}.',
        ownDetail: '{service} took the big screens in malls in {countries}.',
        loud: 2,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'UP', text: 'The {name} trailer on the giant mall screen stopped half the escalator' },
            { voice: 'FAN', tone: 'UP', text: 'Went shopping, came back with plans to watch {name}', own: 'Went shopping, came back with a {service} trial' },
        ],
    },
    CITY_SCREEN: {
        headline: '{name} takes over the famous screens',
        detail: '{service} filled a city\'s famous screens with {name}.',
        ownDetail: '{service} filled a city\'s famous screens.',
        loud: 5,
        photo: true,
        posts: [
            { voice: 'PUBLIC', tone: 'UP', text: 'Tourists are taking photos of the {name} screen like it\'s a landmark' },
        ],
    },
    /* the big moments have their nights (streamingCampaignNews.ts); these are what the crowd adds */
    BUILDING_REVEAL: { headline: '', detail: '', loud: 5, photo: true, posts: [{ voice: 'PUBLIC', tone: 'UP', text: 'A whole building of {name}. Okay, {service}, you win the week', own: 'A whole building of {service}. Okay, you win the week' }] },
    LANDMARK_LIGHT_SHOW: { headline: '', detail: '', loud: 5, photo: true, posts: [{ voice: 'PUBLIC', tone: 'UP', text: 'Never thought I\'d see {name} on a landmark. Wild night' }] },
    DRONE_SHOW: { headline: '', detail: '', loud: 5, photo: true, posts: [{ voice: 'CREATOR', tone: 'UP', text: 'Filmed the {service} drone show from the roof. Video up in an hour' }] },
    FAN_FESTIVAL: { headline: '', detail: '', loud: 5, photo: true, posts: [{ voice: 'CREATOR', tone: 'UP', text: 'Live from the {name} festival: the queue alone is a story' }] },
    LIVE_SHOW: { headline: '', detail: '', loud: 5, photo: true, posts: [{ voice: 'PUBLIC', tone: 'MIXED', text: 'My heart can\'t take another {service} stunt. Watching anyway' }] },
};

/** a week mid-run: people are still talking (UP), or are tired of it (DOWN, all-out or long) */
export const MID_REACTIONS: ReactionLine[] = [
    { voice: 'FAN', tone: 'UP', text: 'Week {week} of the {name} ads and somehow I\'m still not tired of them' },
    { voice: 'PUBLIC', tone: 'UP', text: 'My group chat only talks about {name} now. The ads worked' },
    { voice: 'FAN', tone: 'UP', text: 'Finally started {name} because of the ads. No regrets', own: 'Finally signed up for {service} because of the ads. No regrets' },
];
export const FATIGUE_REACTIONS: ReactionLine[] = [
    { voice: 'PUBLIC', tone: 'DOWN', text: 'If I see one more {name} ad I\'m cancelling {service}', own: 'If I see one more {service} ad I\'m cancelling it' },
    { voice: 'PUBLIC', tone: 'DOWN', text: '{service}, we know about {name}. Everyone knows about {name}', own: '{service}, we know you exist. Everyone knows you exist' },
    { voice: 'FAN', tone: 'MIXED', text: 'The {name} ads are everywhere. I started watching it out of spite', own: 'The {service} ads are everywhere. I signed up out of spite' },
];
export const FATIGUE_STORY = {
    headline: 'Viewers tire of {service}\'s {name} ads',
    ownHeadline: 'Viewers tire of {service}\'s ads',
    detail: '{weeks} weeks at full volume in {countries}: the posts have turned from curious to fed up.',
};
/** its end: a good result, celebrated; a dear one, criticised */
export const RESULT_REACTIONS: ReactionLine[] = [
    { voice: 'TRADE', tone: 'UP', text: '{name}\'s campaign paid off: {joins} new members for {service}, about {cost} each', own: '{service}\'s own campaign paid off: {joins} new members, about {cost} each' },
    { voice: 'FAN', tone: 'UP', text: 'Joined {service} for {name}. The ads got me, fair play', own: 'Joined {service} because of the ads. They got me, fair play' },
];
export const FLOP_STORY = {
    headline: '{name} campaign falls flat for {service}',
    ownHeadline: '{service}\'s own campaign falls flat',
    detail: '{money} over {weeksWords} brought {joinsWords}.',
};
export const FLOP_REACTIONS: ReactionLine[] = [
    { voice: 'TRADE', tone: 'DOWN', text: 'Expensive lesson: {service}\'s {name} push cost about {cost} a new member', own: 'Expensive lesson: {service}\'s own push cost about {cost} a new member' },
    { voice: 'PUBLIC', tone: 'DOWN', text: 'Saw the {name} ads everywhere and still don\'t know what it\'s about', own: 'Saw the {service} ads everywhere and still don\'t know what\'s on it' },
];

/** #162: a campaign's ad shared on Instagram, its picture with it, for what is not seen in the street (online, TV) */
export const SHARE_REACTIONS: Partial<Record<CampaignFormatId, ReactionLine>> = {
    SOCIAL_FEED: { voice: 'FAN', tone: 'UP', text: 'This {name} ad is so good I\'m reposting it 🔁', own: 'This {service} ad is so good I\'m reposting it 🔁' },
    SHORT_VIDEO: { voice: 'FAN', tone: 'UP', text: 'Can\'t stop replaying the {name} teaser 🎬', own: 'Can\'t stop replaying the {service} teaser 🎬' },
    CREATORS: { voice: 'CREATOR', tone: 'UP', text: 'Partnered with {service} this week: my take on {name} is up 🎬 #ad', own: 'Partnered with {service} this week: my honest take is up 🎬 #ad' },
    CTV: { voice: 'PUBLIC', tone: 'MIXED', text: 'My TV won\'t stop showing me {name} 📺', own: 'My TV won\'t stop showing me {service} 📺' },
    TV_SPOTS: { voice: 'FAN', tone: 'UP', text: 'Caught the {name} ad during the break tonight 📺 who else saw it', own: 'Caught the {service} ad during the break tonight 📺 who else saw it' },
};

/** #162: what people comment under a campaign's photo: something seen in the street, an ad shared, a big night */
export const COMMENT_BANK: Record<'STREET' | 'AD' | 'NIGHT', string[]> = {
    STREET: ['I walked past this today!', 'This is on my street 😂', 'They put it up everywhere', 'Free art in the city honestly', 'Is this real?? where', 'The colours on this 😍', 'Took a photo of the same one', '{name} is taking over'],
    AD: ['Ok the marketing team ate', 'This ad keeps following me lol', 'The edit 🔥', 'I skipped it… then went back to watch it', 'Already added {name} to my list', 'Not me watching the ad three times', 'Who made this, they need a raise', '#ad but honestly fair'],
    NIGHT: ['I was there!! 😭', 'Best night of the year', 'The crowd was insane', 'Wish I\'d gone', 'This looks unreal in person', 'Still thinking about it', '{service} really went all out', 'Core memory unlocked'],
};

/** #162: the replies under a campaign's posts on X, in the post's own mood */
export const REPLY_BANK: Record<ReactionTone, string[]> = {
    UP: ['Same!! watching tonight', 'This ad actually worked on me', 'Okay I\'m sold', 'Adding {name} to my list', 'The marketing is everywhere and I\'m not complaining', 'Facts'],
    MIXED: ['Lmao same', 'The algorithm knows', 'It\'s everywhere, I\'ll give them that', 'Okay but is {name} any good though', 'I see it every day on my way to work', 'Marketing budget said yes'],
    DOWN: ['Literally every ad break', 'Please, we get it', 'I muted it and it still found me', 'Spending all that and still no clue what it is', 'Ratio\'d by an ad', 'Same, I\'m tired'],
};

/** #162: what a post is quoted with on X, in its mood */
export const QUOTE_BANK: Record<ReactionTone, string[]> = {
    UP: ['This is how you sell {name}', '{service} marketing team is on another level this week', 'Everyone I know is talking about this'],
    MIXED: ['The {service} marketing budget is not a joke', 'Can\'t tell if I\'m sold or just worn down', 'The ads are working, I hate that they\'re working'],
    DOWN: ['Who approved this many ads', 'Brands, please, less is more', 'Spend less on ads, more on the show'],
};

/** the voices: invented people and outlets, names and handles only, their avatars drawn from their names */
export const REACTION_VOICES: Record<ReactionVoice, Array<{ name: string; handle: string; colour: string; verified?: boolean }>> = {
    FAN: [
        { name: 'Maya Torres', handle: '@mayawatches', colour: '#DB2777' },
        { name: 'Dev Kapoor', handle: '@devbinges', colour: '#2563EB' },
        { name: 'Lina Haddad', handle: '@linaonscreen', colour: '#059669' },
        { name: 'Kenji Mori', handle: '@kenjiframes', colour: '#D97706' },
        { name: 'Sofia Reyes', handle: '@sofiastreams', colour: '#7C3AED' },
        { name: 'Tomás Silva', handle: '@tomasreacts', colour: '#DC2626' },
        { name: 'Aisha Bello', handle: '@aishaseries', colour: '#0891B2' },
        { name: 'Noah Fischer', handle: '@noahnightshow', colour: '#4F46E5' },
    ],
    PUBLIC: [
        { name: 'Kat Morgan', handle: '@commuterkat', colour: '#0EA5E9' },
        { name: 'Neil Okafor', handle: '@nightbusneil', colour: '#F97316' },
        { name: 'Priya Shah', handle: '@priyaonthego', colour: '#A855F7' },
        { name: 'Leo Santos', handle: '@leo_walks', colour: '#22C55E' },
        { name: 'Hana Kim', handle: '@hana.daily', colour: '#E11D48' },
        { name: 'Omar Farouk', handle: '@omarsaysso', colour: '#F59E0B' },
    ],
    CREATOR: [
        { name: 'Mo Reviews', handle: '@mo_reviews', colour: '#EF4444' },
        { name: 'Reel Talk Ana', handle: '@ana.reeltalk', colour: '#8B5CF6' },
        { name: 'Jay Binges', handle: '@jaybinges', colour: '#10B981' },
        { name: 'Cinephile 22', handle: '@cinephile22', colour: '#3B82F6' },
    ],
    TRADE: [
        { name: 'The Ad Ledger', handle: '@adledger', colour: '#111827', verified: true },
        { name: 'Screen Trade Daily', handle: '@screentradedaily', colour: '#1F2937', verified: true },
    ],
};

/** the words with their names filled in */
export const fillReaction = (text: string, words: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (all, key: string) => words[key] ?? all);

/** the format that leads a campaign's first week of talk: the loudest of its picks (not a big moment: those have nights) */
export const leadingFormats = (formats: CampaignFormatId[]): CampaignFormatId[] => formats
    .filter(id => FORMAT_REACTIONS[id].headline)
    .sort((left, right) => FORMAT_REACTIONS[right].loud - FORMAT_REACTIONS[left].loud || formats.indexOf(left) - formats.indexOf(right));
