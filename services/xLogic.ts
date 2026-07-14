
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

type IndustryAccountId = 'POP_BASE' | 'BOX_OFFICE' | 'AWARDS' | 'STUDIO_WIRE' | 'STREAMING';

const INDUSTRY_ACCOUNTS: Record<IndustryAccountId, {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    reach: number;
}> = {
    POP_BASE: {
        id: 'industry_pop_base',
        name: 'Pop Base',
        handle: '@PopBase',
        avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=PopBase&backgroundColor=1d4ed8',
        reach: 1.28,
    },
    BOX_OFFICE: {
        id: 'industry_box_office_watch',
        name: 'Box Office Watch',
        handle: '@BoxOfficeWatch',
        avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=BoxOfficeWatch&backgroundColor=f59e0b',
        reach: 1.18,
    },
    AWARDS: {
        id: 'industry_awards_daily',
        name: 'Awards Daily',
        handle: '@AwardsDaily',
        avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=AwardsDaily&backgroundColor=7c3aed',
        reach: 1.08,
    },
    STUDIO_WIRE: {
        id: 'industry_studio_wire',
        name: 'Studio Wire',
        handle: '@StudioWire',
        avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=StudioWire&backgroundColor=0f766e',
        reach: 1.12,
    },
    STREAMING: {
        id: 'industry_streaming_report',
        name: 'Streaming Report',
        handle: '@StreamingReport',
        avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=StreamingReport&backgroundColor=0891b2',
        reach: 1.14,
    },
};

export const isIndustryInfoPost = (post: Pick<XPost, 'authorId'>): boolean => (
    typeof post.authorId === 'string' && post.authorId.startsWith('industry_')
);

const formatShortMoney = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return '$0';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(amount >= 10_000_000_000 ? 1 : 2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 100_000_000 ? 0 : 1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${Math.round(amount)}`;
};

const formatShortCount = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return '0';
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(amount >= 10_000_000_000 ? 1 : 2)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount >= 100_000_000 ? 0 : 1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
    return `${Math.round(amount)}`;
};

const getIndustryAccountForNews = (headline = '', subtext = ''): IndustryAccountId => {
    const text = `${headline} ${subtext}`.toLowerCase();
    if (text.includes('award') || text.includes('oscar') || text.includes('emmy') || text.includes('nomination')) return 'AWARDS';
    if (text.includes('box office') || text.includes('billion') || text.includes('gross') || text.includes('opening')) return 'BOX_OFFICE';
    if (text.includes('stream') || text.includes('season') || text.includes('renew') || text.includes('series')) return 'STREAMING';
    if (text.includes('studio') || text.includes('acquire') || text.includes('merger') || text.includes('greenlit') || text.includes('slate')) return 'STUDIO_WIRE';
    return 'POP_BASE';
};

const makeIndustryPost = (
    accountId: IndustryAccountId,
    content: string,
    player: Player,
    index: number,
    weight = 1,
): XPost => {
    const account = INDUSTRY_ACCOUNTS[accountId];
    const baseReach = Math.max(2800, Math.floor((player.stats.fame + player.stats.reputation + 40) * 95 * account.reach * weight));
    const likes = Math.max(220, Math.floor(baseReach * (0.08 + (index % 5) * 0.012)));
    return {
        id: `${account.id}_${player.age}_${player.currentWeek}_${index}_${content.slice(0, 28).replace(/[^a-z0-9]+/gi, '_')}`,
        authorId: account.id,
        authorName: account.name,
        authorHandle: account.handle,
        authorAvatar: account.avatar,
        content,
        timestamp: player.currentWeek,
        likes,
        retweets: Math.floor(likes * 0.31),
        replies: Math.floor(likes * 0.12),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'CAREER',
        sentiment: 'INDUSTRY',
        replyList: getXVariants(getPlayerLanguage(player), 'services.x.industry.reply').slice(0, 4),
        quoteList: getXVariants(getPlayerLanguage(player), 'services.x.industry.quote').slice(0, 3),
    };
};

export const generateIndustryXPosts = (player: Player): XPost[] => {
    const language = getPlayerLanguage(player);
    const posts: XPost[] = [];
    const pushPost = (accountId: IndustryAccountId, content: string, weight = 1) => {
        const normalized = content.replace(/\s+/g, ' ').trim();
        if (!normalized) return;
        if (posts.some(post => post.content === normalized)) return;
        posts.push(makeIndustryPost(accountId, normalized, player, posts.length, weight));
    };

    (player.news || []).slice(0, 5).forEach(news => {
        const headline = news.headline || '';
        const subtext = news.subtext || '';
        pushPost(
            getIndustryAccountForNews(headline, subtext),
            subtext ? `${headline}\n\n${subtext}` : headline,
            news.impactLevel === 'HIGH' ? 1.35 : news.impactLevel === 'MEDIUM' ? 1.15 : 1,
        );
    });

    const topActiveRelease = [...(player.activeReleases || [])]
        .filter(release => release && (release.status === 'RUNNING' || release.status === 'BLOCKBUSTER_TRACK' || release.distributionPhase === 'STREAMING'))
        .sort((a, b) => (b.totalGross + (b.streamingRevenue || 0)) - (a.totalGross + (a.streamingRevenue || 0)))[0];
    if (topActiveRelease) {
        if (topActiveRelease.type === 'SERIES' || topActiveRelease.distributionPhase === 'STREAMING') {
            const score = topActiveRelease.audienceReception?.currentScore || topActiveRelease.imdbRating || topActiveRelease.productionPerformance || 70;
            pushPost(
                'STREAMING',
                t(language, 'services.x.industry.streamingRelease', {
                    title: topActiveRelease.name,
                    score: Math.round(score),
                    views: formatShortCount(topActiveRelease.streaming?.totalViews || topActiveRelease.streamingRevenue || 0),
                }),
                1.18,
            );
        } else if ((topActiveRelease.totalGross || 0) >= 1_000_000_000) {
            pushPost(
                'BOX_OFFICE',
                t(language, 'services.x.industry.billionGross', {
                    title: topActiveRelease.name,
                    gross: formatShortMoney(topActiveRelease.totalGross || 0),
                }),
                1.42,
            );
        } else if (topActiveRelease.status === 'BLOCKBUSTER_TRACK' || (topActiveRelease.totalGross || 0) >= 400_000_000) {
            pushPost(
                'BOX_OFFICE',
                t(language, 'services.x.industry.boxOfficeRun', {
                    title: topActiveRelease.name,
                    gross: formatShortMoney(topActiveRelease.totalGross || 0),
                }),
                1.22,
            );
        }
    }

    const recentAward = (player.awards || []).find(award => award.year >= player.age - 1);
    if (recentAward) {
        pushPost(
            'AWARDS',
            t(language, recentAward.outcome === 'WON' ? 'services.x.industry.awardWin' : 'services.x.industry.awardNomination', {
                project: recentAward.projectName,
                award: recentAward.name,
                category: recentAward.category,
            }),
            recentAward.outcome === 'WON' ? 1.26 : 1.08,
        );
    }

    const pendingCeremony = (player.scheduledEvents || []).find(event => event.type === 'AWARD_CEREMONY');
    if (pendingCeremony) {
        pushPost(
            'AWARDS',
            t(language, 'services.x.industry.awardsCalendar', { title: pendingCeremony.title }),
            1.03,
        );
    }

    const latestConnectedProject = (player.pastProjects || []).find(project => (
        project.year >= player.age - 1 &&
        (project.futurePotential?.isRenewed || project.futurePotential?.isSequelGreenlit || (project.franchiseId && project.installmentNumber && project.installmentNumber > 1))
    ));
    if (latestConnectedProject) {
        pushPost(
            latestConnectedProject.projectType === 'SERIES' ? 'STREAMING' : 'STUDIO_WIRE',
            t(language, latestConnectedProject.projectType === 'SERIES' ? 'services.x.industry.renewalBuzz' : 'services.x.industry.sequelBuzz', {
                title: latestConnectedProject.name,
            }),
            1.12,
        );
    }

    const studio = (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.isActive);
    if (studio) {
        const activeSlate = (player.commitments || []).filter(commitment => commitment.projectDetails?.studioId === studio.id).length;
        if (activeSlate > 0) {
            pushPost(
                'STUDIO_WIRE',
                t(language, 'services.x.industry.studioSlate', {
                    studio: studio.name,
                    count: activeSlate,
                }),
                1.06,
            );
        }
    }

    if (posts.length === 0) {
        pushPost('POP_BASE', pickXVariant(language, 'services.x.industry.popPulse'), 1);
    }

    return posts.slice(0, 8);
};

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

    generateIndustryXPosts(player).forEach(post => feed.push(post));

    // 2. Generate NPC posts (Limit 15)
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
