
import { Player, XPost, NPCActor } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { AWARD_GOSSIP_TEMPLATES } from './awardLogic';
import { getEnabledGlobalCreatorProfiles } from './youtubeLogic';

// --- TWEET TEMPLATES ---

const GENERAL_TWEETS = [
    "Just had the best coffee of my life. ☕",
    "Does anyone else feel like today is going to be great?",
    "Reading scripts all day. 📖",
    "LA traffic is a personality trait at this point.",
    "Why is it so hard to find good sushi at 2am?",
    "Thinking about starting a podcast. Thoughts?",
    "Set life is the best life. 🎬",
    "Manifesting good energy for everyone reading this.",
    "Can we skip to the weekend?",
    "Cinema is back.",
    "Just watched a masterpiece. No spoilers.",
    "Gym done. Now time to eat everything.",
    "Who's watching the game tonight?"
];

const NEWS_TWEETS = [
    "BREAKING: Studio execs hinting at a massive merger.",
    "Box Office Update: Numbers are looking strong for the summer slate.",
    "Rumor has it a certain A-Lister is walking away from their franchise.",
    "Streaming services announced price hikes again. 📉",
    "Award season predictions are already heating up.",
    "Just In: Production halted on major blockbuster due to weather."
];

const UNIVERSE_TWEETS = [
    "I'm calling it right now, the next {Universe} movie is going to break records.",
    "Who else is staying up till 3AM to watch the new {Universe} trailer drop?",
    "If they don't bring back the original cast for {Universe}, we riot.",
    "Just saw the leaked {Universe} concept art. I am SCREAMING.",
    "Can we talk about the post-credits scene in the latest {Universe} film?",
    "I've mapped out the entire {Universe} timeline on my wall. I need help.",
    "Unpopular opinion: Phase 1 of {Universe} was the peak.",
    "The casting for the new {Universe} villain is absolutely perfect."
];

const HASHTAGS = [
    "#ActorEmpire", "#Hollywood", "#FilmTwitter", "#SetLife", "#Cinema", 
    "#Trending", "#MondayMotivation", "#ThrowbackThursday", "#NewRelease", "#IndieFilm"
];

// --- GENERATORS ---

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateXFeed = (player: Player): XPost[] => {
    const feed: XPost[] = [];
    const creatorProfiles = getEnabledGlobalCreatorProfiles(player).map(creator => ({
        ...creator,
        tier: 'A_LIST' as const
    }));
    const npcMap = [...NPC_DATABASE, ...(Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : []), ...creatorProfiles];

    // 1. Add Player's recent posts (this week)
    const playerPosts = player.x.posts.filter(p => p.timestamp === player.currentWeek);
    playerPosts.forEach(p => feed.push(p));

    // 2. Generate NPC Tweets (Limit 15)
    // Bias towards A-List and random active NPCs
    const count = 10 + Math.floor(Math.random() * 5);
    for(let i=0; i<count; i++) {
        const npc = pick(npcMap);
        const isNews = Math.random() > 0.9;
        
        let content = "";
        
        // CHECK FOR AWARD SEASON
        const pendingCeremony = player.scheduledEvents.find(e => e.type === 'AWARD_CEREMONY');
        const isAwardGossip = pendingCeremony && Math.random() < 0.4; // 40% chance of talking about awards if pending

        const studio = player.businesses?.find(b => b.type === 'PRODUCTION_HOUSE');
        const universes = studio && player.world?.universes ? Object.values(player.world.universes).filter(u => u.studioId === studio.id) : [];
        const isUniverseGossip = universes.length > 0 && Math.random() < 0.3;

        if (isAwardGossip && pendingCeremony) {
             const rival = pick(npcMap);
             content = pick(AWARD_GOSSIP_TEMPLATES)
                .replace('{Player}', player.name)
                .replace('{Rival}', rival.name)
                .replace('{Award}', pendingCeremony.title);
             content += " #AwardsSeason";
        } else if (isUniverseGossip) {
             const randomUniverse = pick(universes);
             content = pick(UNIVERSE_TWEETS).replace(/{Universe}/g, randomUniverse.name);
             content += ` #${randomUniverse.name.replace(/\s+/g, '')}`;
        } else if (isNews && npc.tier === 'A_LIST') {
            content = pick(NEWS_TWEETS);
        } else {
            content = pick(GENERAL_TWEETS);
        }

        // Add hashtags randomly
        if (!content.includes('#') && Math.random() > 0.7) {
            content += ` ${pick(HASHTAGS)}`;
        }

        const likes = Math.floor(npc.followers * (0.001 + Math.random() * 0.005));
        const retweets = Math.floor(likes * 0.2);
        const replies = Math.floor(likes * 0.05);

        feed.push({
            id: `x_post_${npc.id}_${player.currentWeek}_${i}`,
            authorId: npc.id,
            authorName: npc.name,
            authorHandle: npc.handle,
            authorAvatar: npc.avatar,
            content,
            timestamp: player.currentWeek,
            likes,
            retweets,
            replies,
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED',
            postType: isNews ? 'CAREER' : isUniverseGossip ? 'FILM_OPINION' : 'GENERAL',
            sentiment: isNews ? 'INDUSTRY' : 'NEUTRAL',
            replyList: [
                'The timeline needed this context.',
                'Film Twitter is already debating this.',
                'Someone in PR just opened the group chat.',
                'This is going to age interestingly.'
            ].sort(() => 0.5 - Math.random()).slice(0, 3),
            quoteList: [
                'This explains a lot.',
                'People are not ready for this conversation.',
                'Bookmarking this for later.',
                'The industry is moving weird today.'
            ].sort(() => 0.5 - Math.random()).slice(0, 2)
        });
    }

    return feed.sort((a, b) => b.likes - a.likes); // Sort by popularity
};

export const generateTrendingTopics = (player: Player): { tag: string, posts: string, category: string }[] => {
    // Dynamic trends based on player events?
    const trends = [
        { tag: "#ActorEmpire", posts: "54.2K posts", category: "Entertainment" },
        { tag: "Hollywood", posts: "120K posts", category: "Movies" },
        { tag: "Politics", posts: "2.5M posts", category: "Politics" },
        { tag: "The Academy", posts: "12K posts", category: "Entertainment" },
        { tag: "#MetGala", posts: "2.1M posts", category: "Fashion" }
    ];

    // Add movie release trend if active
    const release = player.activeReleases.find(r => r.status === 'RUNNING' || r.status === 'BLOCKBUSTER_TRACK');
    if (release) {
        trends.unshift({ tag: `#${release.name.replace(/\s+/g, '')}`, posts: "Trending in Movies", category: "Entertainment" });
    }

    return trends;
};
