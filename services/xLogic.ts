
import { Player, XPost, NPCActor } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { getAwardGossipTemplate } from './awardLogic';
import { getEnabledGlobalCreatorProfiles } from './youtubeLogic';
import { normalizeUniverseMap } from './universeLogic';
import { getPlayerLanguage, t } from './i18n';

// --- TWEET TEMPLATES ---

const HASHTAGS = [
    "#ActorEmpire", "#Hollywood", "#FilmTwitter", "#SetLife", "#Cinema", 
    "#Trending", "#MondayMotivation", "#ThrowbackThursday", "#NewRelease", "#IndieFilm"
];

// --- GENERATORS ---

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const X_VARIANT_SEPARATOR = ' || ';
const getXVariants = (language: ReturnType<typeof getPlayerLanguage>, key: string, vars: Record<string, string | number> = {}) =>
    t(language, key, vars).split(X_VARIANT_SEPARATOR);
const pickXVariant = (language: ReturnType<typeof getPlayerLanguage>, key: string, vars: Record<string, string | number> = {}) =>
    pick(getXVariants(language, key, vars));

export const generateXFeed = (player: Player): XPost[] => {
    const feed: XPost[] = [];
    const language = getPlayerLanguage(player);
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
        const universes = studio && player.world?.universes ? Object.values(normalizeUniverseMap(player.world.universes)).filter(u => u.studioId === studio.id) : [];
        const isUniverseGossip = universes.length > 0 && Math.random() < 0.3;

        if (isAwardGossip && pendingCeremony) {
             const rival = pick(npcMap);
             content = getAwardGossipTemplate(language)
                .replace('{Player}', player.name)
                .replace('{Rival}', rival.name)
                .replace('{Award}', pendingCeremony.title);
             content += " #AwardsSeason";
        } else if (isUniverseGossip) {
             const randomUniverse = pick(universes);
             content = pickXVariant(language, 'services.x.universePost', { universeName: randomUniverse.name });
             content += ` #${randomUniverse.name.replace(/\s+/g, '')}`;
        } else if (isNews && npc.tier === 'A_LIST') {
            content = pickXVariant(language, 'services.x.newsPost');
        } else {
            content = pickXVariant(language, 'services.x.generalPost');
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
            replyList: getXVariants(language, 'services.x.reply').sort(() => 0.5 - Math.random()).slice(0, 3),
            quoteList: getXVariants(language, 'services.x.quote').sort(() => 0.5 - Math.random()).slice(0, 2)
        });
    }

    return feed.sort((a, b) => b.likes - a.likes); // Sort by popularity
};

export const generateTrendingTopics = (player: Player): { tag: string, posts: string, category: string }[] => {
    const language = getPlayerLanguage(player);
    // Dynamic trends based on player events?
    const trends = [
        { tag: "#ActorEmpire", posts: t(language, 'services.x.trends.posts', { count: '54.2K' }), category: t(language, 'services.x.trends.entertainment') },
        { tag: "Hollywood", posts: t(language, 'services.x.trends.posts', { count: '120K' }), category: t(language, 'services.x.trends.movies') },
        { tag: "Politics", posts: t(language, 'services.x.trends.posts', { count: '2.5M' }), category: t(language, 'services.x.trends.politics') },
        { tag: "The Academy", posts: t(language, 'services.x.trends.posts', { count: '12K' }), category: t(language, 'services.x.trends.entertainment') },
        { tag: "#MetGala", posts: t(language, 'services.x.trends.posts', { count: '2.1M' }), category: t(language, 'services.x.trends.fashion') }
    ];

    // Add movie release trend if active
    const release = player.activeReleases.find(r => r.status === 'RUNNING' || r.status === 'BLOCKBUSTER_TRACK');
    if (release) {
        trends.unshift({ tag: `#${release.name.replace(/\s+/g, '')}`, posts: t(language, 'services.x.trends.trendingInMovies'), category: t(language, 'services.x.trends.entertainment') });
    }

    return trends;
};
