import type {
    IndustryEventFact,
    IndustryEventLedgerState,
    IndustryMediaInstitution,
    IndustryMediaPersonality,
    IndustryMediaStory,
    IndustryMediaWorldState,
    InstaPost,
    NewsItem,
    Player,
    XPost,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import {
    INDUSTRY_EVENT_PUBLISHED_KEY_LIMIT,
    normalizeIndustryEventLedger,
} from './industryEventLedger';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';
import { advanceIndustryMediaStories } from './industryMediaStories';
import { assignIndustryMediaCoverage } from './industryMediaCoverage';
import { createIndustryMediaAvatar } from './industryMediaIdentities';
import { createIndustryMediaVoice, type IndustryMediaVoiceResult } from './industryMediaVoice';
import { ensureIndustryMediaDiscussion } from './industryMediaDiscussions';

const NEWS_LIMIT = 50;
const X_FEED_LIMIT = 80;
const INSTAGRAM_FEED_LIMIT = 50;
export const INDUSTRY_PUBLIC_STORY_LIMIT_PER_WEEK = 2;

const newsKey = (event: IndustryEventFact): string => `news:${event.id}`;
const xKey = (event: IndustryEventFact): string => `x:${event.id}`;
const instagramKey = (event: IndustryEventFact): string => `instagram:${event.id}`;
const evaluatedKey = (event: IndustryEventFact): string => `evaluated:${event.id}`;

const editorialPriority = (event: IndustryEventFact): number => {
    const importance = event.importance === 'HIGH' ? 300 : event.importance === 'MEDIUM' ? 200 : 100;
    const consequence = ({
        COMPANY_CLOSED: 120,
        COMPANY_ACQUIRED: 115,
        PROJECT_HIT: 110,
        PROJECT_FLOP: 110,
        COMPANY_FUNDED: 105,
        COMPANY_RESTRUCTURED: 104,
        PROJECT_CANCELLED: 100,
        PLATFORM_OUTAGE: 100,
        PLATFORM_ADS_ADDED: 100,
        PLATFORM_PRICE_RAISED: 98,
        AWARD_WON: 98,
        PLATFORM_QUALITY_GAP: 96,
        PLATFORM_TECH_LAUNCHED: 95,
        PROJECT_RELEASED: 90,
        COMPANY_LAUNCHED: 85,
        PROJECT_OVERRUN: 80,
        PROJECT_DELAYED: 75,
        PROJECT_HELD: 70,
        PLATFORM_PRICE_CUT: 70,
        PLATFORM_RESTORED: 60,
        /* #117 */
        PLATFORM_OFFER_CHANGED: 97,
        PLATFORM_FREE_TIER: 94,
        PLATFORM_REBRANDED: 92,
        PLATFORM_VALUE_CRITICISED: 90,
        PLATFORM_VALUE_PRAISED: 88,
        PLATFORM_APP_REDESIGNED: 80,
        /* #143 */
        PLATFORM_CHART_MOMENT: 93,
        /* #149 */
        PLATFORM_CAMPAIGN_MOMENT: 95,
        /* #200 */
        PLATFORM_EXECUTIVE_LEFT: 91,
        PLATFORM_EXECUTIVE_HIRED: 72,
    } as Partial<Record<IndustryEventFact['type'], number>>)[event.type] || 0;
    return importance + consequence;
};

/* the story a service's event belongs to in its week */
const PLATFORM_STORY_GROUP: Partial<Record<IndustryEventFact['type'], string>> = {
    PLATFORM_RESTORED: 'PLATFORM_OUTAGE',
    PLATFORM_PRICE_RAISED: 'PLATFORM_PRICING',
    PLATFORM_ADS_ADDED: 'PLATFORM_PRICING',
    PLATFORM_PRICE_CUT: 'PLATFORM_PRICING',
    /* #117: the offer's moves are one story with its prices; a look and an app redesign one; value one */
    PLATFORM_FREE_TIER: 'PLATFORM_PRICING',
    PLATFORM_OFFER_CHANGED: 'PLATFORM_PRICING',
    PLATFORM_REBRANDED: 'PLATFORM_BRAND',
    PLATFORM_APP_REDESIGNED: 'PLATFORM_BRAND',
    PLATFORM_VALUE_PRAISED: 'PLATFORM_VALUE',
    PLATFORM_VALUE_CRITICISED: 'PLATFORM_VALUE',
    PLATFORM_CHART_MOMENT: 'PLATFORM_CHART',
    PLATFORM_CAMPAIGN_MOMENT: 'PLATFORM_CAMPAIGN',
    PLATFORM_EXECUTIVE_LEFT: 'PLATFORM_PEOPLE',
    PLATFORM_EXECUTIVE_HIRED: 'PLATFORM_PEOPLE',
};

/* #162 (Zeesh: "campaign ke hisab se reaction … news me dikhna chaiye"): the player's own campaigns have their own place
   in the week's news, beside the public stories: one story per campaign, at most two campaigns a week */
const OWN_CAMPAIGN_STORIES_PER_WEEK = 2;
const isOwnCampaignStory = (event: IndustryEventFact, ownPlatformId?: string): boolean => Boolean(ownPlatformId)
    && event.type === 'PLATFORM_CAMPAIGN_MOMENT' && (event.companyId === ownPlatformId || event.platformId === ownPlatformId);

const selectEditorialEvents = (events: IndustryEventFact[], ownPlatformId?: string): IndustryEventFact[] => {
    const selected: IndustryEventFact[] = [];
    const representedStories = new Set<string>();
    /* the player's own service's news leads its week (Phase 5, #66): one slot at most, as one story */
    const own = (event: IndustryEventFact) => Number(Boolean(ownPlatformId) && event.type.startsWith('PLATFORM_')
        && (event.companyId === ownPlatformId || event.platformId === ownPlatformId));
    let publicStories = 0;
    let campaignStories = 0;
    const ordered = [...events].sort((left, right) => (
        right.absoluteWeek - left.absoluteWeek
        || own(right) - own(left)
        || editorialPriority(right) - editorialPriority(left)
        || left.id.localeCompare(right.id)
    ));
    for (const event of ordered) {
        /* #162: one of the player's own campaigns is its own story (its key names the campaign), outside the public two */
        const ownCampaign = isOwnCampaignStory(event, ownPlatformId);
        if (ownCampaign ? campaignStories >= OWN_CAMPAIGN_STORIES_PER_WEEK : publicStories >= INDUSTRY_PUBLIC_STORY_LIMIT_PER_WEEK) continue;
        /* a service's launches, outages and prices are separate stories; an outage and its fix one (#67, #68) */
        const storyKey = ownCampaign ? `campaign:${event.idempotencyKey.split(':').slice(0, 3).join(':')}` : event.type.startsWith('PLATFORM_')
            ? `platform:${event.companyId || event.platformId}:${PLATFORM_STORY_GROUP[event.type] || event.type}`
            : event.projectId
                ? `project:${event.projectId}`
                : event.companyId
                    ? `company:${event.companyId}`
                    : `event:${event.id}`;
        if (representedStories.has(storyKey)) continue;
        representedStories.add(storyKey);
        selected.push(event);
        if (ownCampaign) campaignStories += 1;
        else publicStories += 1;
        if (publicStories >= INDUSTRY_PUBLIC_STORY_LIMIT_PER_WEEK && (!ownPlatformId || campaignStories >= OWN_CAMPAIGN_STORIES_PER_WEEK)) break;
    }
    return selected;
};

const shouldPublishNews = (event: IndustryEventFact): boolean => (
    event.importance === 'HIGH'
    || (event.importance === 'MEDIUM' && [
        'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_DISTRESS',
        'COMPANY_RECOVERED', 'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED', 'COMPANY_ACQUIRED',
        'COMPANY_CLOSED', 'PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD',
        'PROJECT_SOLD', 'PROJECT_CANCELLED', 'RIGHTS_DEAL', 'RIGHTS_TRANSFER', 'RIGHTS_SALE_ANNOUNCED',
        /* #161: a campaign's stories (its first week, its fatigue, its result) are news too; people's posts carry it on X */
        'PLATFORM_CAMPAIGN_MOMENT',
        /* #200: who runs a service is news, both ways */
        'PLATFORM_EXECUTIVE_LEFT', 'PLATFORM_EXECUTIVE_HIRED',
    ].includes(event.type))
);

const shouldPublishX = (event: IndustryEventFact): boolean => (
    event.importance === 'HIGH'
    || (event.importance === 'MEDIUM' && !shouldPublishNews(event))
);

const shouldPublishInstagram = (event: IndustryEventFact): boolean => (
    event.importance === 'HIGH'
    && ['COMPANY_LAUNCHED', 'PROJECT_CAST', 'AWARD_WON', 'PLATFORM_TECH_LAUNCHED', 'PLATFORM_QUALITY_GAP', 'PLATFORM_REBRANDED',
        'PLATFORM_VALUE_PRAISED', 'PLATFORM_VALUE_CRITICISED', 'PLATFORM_CHART_MOMENT', 'PLATFORM_CAMPAIGN_MOMENT'].includes(event.type)
);

const newsCategory = (event: IndustryEventFact): NewsItem['category'] => (
    event.importance === 'HIGH' && [
        'COMPANY_PROMOTED', 'COMPANY_ACQUIRED', 'COMPANY_CLOSED',
        'PROJECT_HIT', 'PROJECT_FLOP', 'AWARD_WON', 'PLATFORM_TECH_LAUNCHED', 'PLATFORM_OUTAGE',
        'PLATFORM_PRICE_RAISED', 'PLATFORM_ADS_ADDED', 'PLATFORM_PRICE_CUT',
        'PLATFORM_REBRANDED', 'PLATFORM_FREE_TIER', 'PLATFORM_OFFER_CHANGED', 'PLATFORM_VALUE_PRAISED', 'PLATFORM_VALUE_CRITICISED',
        'PLATFORM_CHART_MOMENT', 'PLATFORM_CAMPAIGN_MOMENT',
    ].includes(event.type) ? 'TOP_STORY' : 'INDUSTRY'
);

const engagementFor = (event: IndustryEventFact) => {
    const rng = createDeterministicRng(`industry-presentation:${event.id}`);
    const scale = event.importance === 'HIGH' ? 5 : event.importance === 'MEDIUM' ? 2 : 1;
    return {
        likes: Math.round((180 + rng() * 520) * scale),
        retweets: Math.round((28 + rng() * 110) * scale),
        replies: Math.round((12 + rng() * 65) * scale),
    };
};

interface IndustryMediaAuthorship {
    institution: IndustryMediaInstitution;
    personality?: IndustryMediaPersonality;
    voice: IndustryMediaVoiceResult;
}

const eventNews = (
    event: IndustryEventFact,
    player: Player,
    mediaStoryId?: string,
    authorship?: IndustryMediaAuthorship,
): NewsItem => ({
    id: `news_${event.id}`,
    headline: authorship?.voice.headline || event.headline,
    subtext: authorship?.voice.detail || event.detail,
    category: newsCategory(event),
    week: player.currentWeek,
    year: player.age,
    impactLevel: event.importance,
    industryEventId: event.id,
    ...(mediaStoryId ? { mediaStoryId } : {}),
    ...(authorship ? {
        mediaInstitutionId: authorship.institution.id,
        sourceName: authorship.institution.name,
    } : {}),
    ...(authorship?.personality ? {
        mediaPersonalityId: authorship.personality.id,
        byline: authorship.personality.name,
    } : {}),
    ...(event.companyId ? { companyId: event.companyId } : {}),
    ...(event.projectId ? { projectId: event.projectId } : {}),
    ...(event.imageMediaId ? { imageMediaId: event.imageMediaId } : {}),
});

const eventXPost = (
    event: IndustryEventFact,
    mediaStoryId?: string,
    authorship?: IndustryMediaAuthorship,
): XPost => {
    const engagement = engagementFor(event);
    const institution = authorship?.institution;
    const personality = authorship?.personality;
    return {
        id: `x_${event.id}`,
        authorId: personality?.id || institution?.id || 'industry_desk',
        authorName: personality?.name || institution?.name || 'Industry Desk',
        authorHandle: personality?.handle || institution?.handles.X || '@industrydesk',
        authorAvatar: personality
            ? createIndustryMediaAvatar(personality.name, institution?.primaryColor || '#52525B')
            : institution
                ? createIndustryMediaAvatar(institution.shortName, institution.primaryColor)
                : '',
        content: authorship?.voice.content || `${event.headline} ${event.detail}`,
        timestamp: event.absoluteWeek,
        ...engagement,
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: personality?.verified ?? true,
        postType: 'FILM_OPINION',
        sentiment: personality?.signatureRole === 'ANTAGONIST'
            ? 'MESSY'
            : personality?.signatureRole === 'SUPPORTER' ? 'SUPPORTIVE' : 'INDUSTRY',
        industryEventId: event.id,
        ...(mediaStoryId ? { mediaStoryId } : {}),
        ...(institution ? { mediaInstitutionId: institution.id } : {}),
        ...(personality ? { mediaPersonalityId: personality.id } : {}),
        ...(event.companyId ? { companyId: event.companyId } : {}),
        ...(event.projectId ? { projectId: event.projectId } : {}),
        ...(event.imageMediaId ? { contentMediaId: event.imageMediaId } : {}),
    };
};

const eventInstagramPost = (
    event: IndustryEventFact,
    player: Player,
    mediaStoryId?: string,
    authorship?: IndustryMediaAuthorship,
): InstaPost => {
    const engagement = engagementFor(event);
    const institution = authorship?.institution;
    const personality = authorship?.personality;
    const authorName = personality?.name || institution?.name || event.companyName || 'Industry Desk';
    const authorHandle = personality?.handle
        || institution?.handles.INSTAGRAM
        || `@${(event.companyName || 'industrydesk').toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
    return {
        id: `instagram_${event.id}`,
        authorId: personality?.id || institution?.id || event.companyId || 'industry_desk',
        authorName,
        authorHandle,
        authorAvatar: personality
            ? createIndustryMediaAvatar(personality.name, institution?.primaryColor || '#52525B')
            : institution ? createIndustryMediaAvatar(institution.shortName, institution.primaryColor) : '',
        type: event.type === 'AWARD_WON' ? 'CELEBRATION' : 'ANNOUNCEMENT',
        caption: authorship?.voice.content || `${event.headline}\n\n${event.detail}`,
        week: player.currentWeek,
        year: player.age,
        likes: engagement.likes * 2,
        comments: engagement.replies,
        shares: engagement.retweets,
        mood: 'INDUSTRY',
        isPlayer: false,
        industryEventId: event.id,
        ...(mediaStoryId ? { mediaStoryId } : {}),
        ...(institution ? { mediaInstitutionId: institution.id } : {}),
        ...(personality ? { mediaPersonalityId: personality.id } : {}),
        ...(event.companyId ? { companyId: event.companyId } : {}),
        ...(event.projectId ? { projectId: event.projectId } : {}),
        ...(event.imageMediaId ? { contentMediaId: event.imageMediaId } : {}),
    };
};

const prependUnique = <T extends { id: string }>(created: T[], existing: T[], limit: number): T[] => {
    const seen = new Set<string>();
    return [...created, ...existing].filter(item => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    }).slice(0, limit);
};

export interface IndustryPresentationResult {
    player: Player;
    ledger: IndustryEventLedgerState;
    mediaWorld: IndustryMediaWorldState;
    news: NewsItem[];
    xPosts: XPost[];
    instaPosts: InstaPost[];
}

export const projectIndustryEvents = (
    player: Player,
    inputLedger: unknown,
    absoluteWeek: number,
    inputMediaWorld?: unknown,
): IndustryPresentationResult => {
    const ledger = normalizeIndustryEventLedger(inputLedger);
    const published = new Set(ledger.publishedEventKeys);
    const eligible = ledger.events.filter(event => (
        event.absoluteWeek <= absoluteWeek && !published.has(evaluatedKey(event))
    ));
    const advancement = advanceIndustryMediaStories(inputMediaWorld, eligible, absoluteWeek);
    let mediaWorld = advancement.state;

    const news: NewsItem[] = [];
    const xPosts: XPost[] = [];
    const instaPosts: InstaPost[] = [];
    const publicationKeys = [...ledger.publishedEventKeys];
    const selected = selectEditorialEvents(eligible, player.ownedStreamingPlatform?.identity?.slug);
    /* lines already out (news and X) and the ones written this week: a critic's next line takes one none of them used */
    const recentVoiceLines: string[] = [
        ...(player.news || []).slice(0, 30).map(item => item.subtext || ''),
        ...(player.x?.feed || []).slice(0, 40).map(post => String(post.content || '')),
    ].filter(Boolean);
    const authorshipFor = (
        event: IndustryEventFact,
        mediaStoryId: string | undefined,
        channel: 'NEWS' | 'X' | 'INSTAGRAM',
    ): IndustryMediaAuthorship | undefined => {
        if (!mediaStoryId) return undefined;
        const story = mediaWorld.stories.find(item => item.id === mediaStoryId);
        if (!story) return undefined;
        const coverage = assignIndustryMediaCoverage({
            state: mediaWorld,
            story,
            event,
            channel,
            player,
            absoluteWeek,
        });
        mediaWorld = coverage.state;
        const voice = createIndustryMediaVoice({
            event,
            story,
            institution: coverage.institution,
            personality: coverage.personality,
            assignment: coverage.assignment,
            channel,
            recentLines: recentVoiceLines,
        });
        recentVoiceLines.push(voice.detail);
        return { institution: coverage.institution, personality: coverage.personality, voice };
    };
    selected.forEach(event => {
        const mediaStoryId = mediaWorld.eventStoryIndex[event.id];
        if (shouldPublishNews(event) && !published.has(newsKey(event))) {
            news.push(eventNews(event, player, mediaStoryId, authorshipFor(event, mediaStoryId, 'NEWS')));
            publicationKeys.push(newsKey(event));
        }
        if (shouldPublishX(event) && !published.has(xKey(event))) {
            xPosts.push(eventXPost(event, mediaStoryId, authorshipFor(event, mediaStoryId, 'X')));
            publicationKeys.push(xKey(event));
        }
        if (shouldPublishInstagram(event) && !published.has(instagramKey(event))) {
            instaPosts.push(eventInstagramPost(
                event,
                player,
                mediaStoryId,
                authorshipFor(event, mediaStoryId, 'INSTAGRAM'),
            ));
            publicationKeys.push(instagramKey(event));
        }
    });
    eligible.forEach(event => publicationKeys.push(evaluatedKey(event)));

    const changedStoryIds = new Set(advancement.changedStoryIds);
    /* #162: the player's own campaign stories do not take the public stories' room */
    const remainingStoryBudget = Math.max(0, INDUSTRY_PUBLIC_STORY_LIMIT_PER_WEEK
        - selected.filter(event => !isOwnCampaignStory(event, player.ownedStreamingPlatform?.identity?.slug)).length);
    const dueStories = mediaWorld.stories
        .filter(story => (
            !changedStoryIds.has(story.id)
            && story.channelEligibility.includes('X')
            && story.nextEligiblePublicationWeek !== undefined
            && story.nextEligiblePublicationWeek <= absoluteWeek
        ))
        .sort((left, right) => (
            ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[right.importance]
                - { HIGH: 3, MEDIUM: 2, LOW: 1 }[left.importance])
            || right.lastAdvancedAbsoluteWeek - left.lastAdvancedAbsoluteWeek
            || left.id.localeCompare(right.id)
        ))
        .slice(0, remainingStoryBudget);
    const publishedBeatKeys = [...mediaWorld.publishedBeatKeys];
    const publishedBeatSet = new Set(publishedBeatKeys);
    const clearedDueStoryIds = new Set<string>();
    dueStories.forEach(story => {
        const beatKey = `discussion:${story.id}:${story.lastAdvancedAbsoluteWeek}`;
        if (publishedBeatSet.has(beatKey)) {
            clearedDueStoryIds.add(story.id);
            return;
        }
        const latestEventId = story.industryEventIds[story.industryEventIds.length - 1];
        const latestEvent = ledger.events.find(event => event.id === latestEventId);
        if (!latestEvent) {
            clearedDueStoryIds.add(story.id);
            return;
        }
        const authored = eventXPost(
            latestEvent,
            story.id,
            authorshipFor(latestEvent, story.id, 'X'),
        );
        xPosts.push({
            ...authored,
            id: `x_story_${story.id}_${story.lastAdvancedAbsoluteWeek}`,
            timestamp: absoluteWeek,
        });
        publishedBeatKeys.push(beatKey);
        publishedBeatSet.add(beatKey);
        clearedDueStoryIds.add(story.id);
    });

    const publishedChannelsByStory = new Map<string, Set<IndustryMediaStory['publishedChannels'][number]>>();
    const rememberChannel = (storyId: string | undefined, channel: 'NEWS' | 'X' | 'INSTAGRAM') => {
        if (!storyId) return;
        const channels = publishedChannelsByStory.get(storyId) || new Set();
        channels.add(channel);
        publishedChannelsByStory.set(storyId, channels);
    };
    news.forEach(item => rememberChannel(item.mediaStoryId, 'NEWS'));
    xPosts.forEach(item => rememberChannel(item.mediaStoryId, 'X'));
    instaPosts.forEach(item => rememberChannel(item.mediaStoryId, 'INSTAGRAM'));
    mediaWorld = normalizeIndustryMediaWorld({
        ...mediaWorld,
        stories: mediaWorld.stories.map(story => {
            const addedChannels = publishedChannelsByStory.get(story.id);
            return {
                ...story,
                ...(clearedDueStoryIds.has(story.id) ? { nextEligiblePublicationWeek: undefined } : {}),
                ...(addedChannels ? {
                    publishedChannels: [...new Set([...story.publishedChannels, ...addedChannels])],
                } : {}),
            };
        }),
        publishedBeatKeys,
    });

    xPosts.forEach((post, index) => {
        if (!post.industryEventId || !post.mediaStoryId || !post.mediaPersonalityId) return;
        const event = ledger.events.find(item => item.id === post.industryEventId);
        const story = mediaWorld.stories.find(item => item.id === post.mediaStoryId);
        if (!event || !story) return;
        const result = ensureIndustryMediaDiscussion({
            state: mediaWorld,
            story,
            event,
            post,
            player,
            absoluteWeek,
            recentLines: recentVoiceLines,
        });
        mediaWorld = result.state;
        xPosts[index] = result.post;
    });

    const nextPlayer: Player = news.length || xPosts.length || instaPosts.length ? {
        ...player,
        news: prependUnique(news, player.news || [], NEWS_LIMIT),
        x: { ...player.x, feed: prependUnique(xPosts, player.x?.feed || [], X_FEED_LIMIT) },
        instagram: {
            ...player.instagram,
            feed: prependUnique(instaPosts, player.instagram?.feed || [], INSTAGRAM_FEED_LIMIT),
        },
    } : player;
    return {
        player: nextPlayer,
        ledger: {
            ...ledger,
            lastProjectedAbsoluteWeek: Math.max(ledger.lastProjectedAbsoluteWeek, absoluteWeek),
            publishedEventKeys: [...new Set(publicationKeys)].slice(-INDUSTRY_EVENT_PUBLISHED_KEY_LIMIT),
        },
        mediaWorld,
        news,
        xPosts,
        instaPosts,
    };
};
