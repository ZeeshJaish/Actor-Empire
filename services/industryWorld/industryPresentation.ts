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
        AWARD_WON: 98,
        PROJECT_RELEASED: 90,
        COMPANY_LAUNCHED: 85,
        PROJECT_OVERRUN: 80,
        PROJECT_DELAYED: 75,
        PROJECT_HELD: 70,
    } as Partial<Record<IndustryEventFact['type'], number>>)[event.type] || 0;
    return importance + consequence;
};

const selectEditorialEvents = (events: IndustryEventFact[]): IndustryEventFact[] => {
    const selected: IndustryEventFact[] = [];
    const representedStories = new Set<string>();
    const ordered = [...events].sort((left, right) => (
        right.absoluteWeek - left.absoluteWeek
        || editorialPriority(right) - editorialPriority(left)
        || left.id.localeCompare(right.id)
    ));
    for (const event of ordered) {
        const storyKey = event.projectId
            ? `project:${event.projectId}`
            : event.companyId
                ? `company:${event.companyId}`
                : `event:${event.id}`;
        if (representedStories.has(storyKey)) continue;
        representedStories.add(storyKey);
        selected.push(event);
        if (selected.length >= INDUSTRY_PUBLIC_STORY_LIMIT_PER_WEEK) break;
    }
    return selected;
};

const shouldPublishNews = (event: IndustryEventFact): boolean => (
    event.importance === 'HIGH'
    || (event.importance === 'MEDIUM' && [
        'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_DISTRESS',
        'COMPANY_RECOVERED', 'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED', 'COMPANY_ACQUIRED',
        'COMPANY_CLOSED', 'PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD',
        'PROJECT_SOLD', 'PROJECT_CANCELLED', 'RIGHTS_DEAL', 'RIGHTS_TRANSFER',
    ].includes(event.type))
);

const shouldPublishX = (event: IndustryEventFact): boolean => (
    event.importance === 'HIGH'
    || (event.importance === 'MEDIUM' && !shouldPublishNews(event))
);

const shouldPublishInstagram = (event: IndustryEventFact): boolean => (
    event.importance === 'HIGH'
    && ['COMPANY_LAUNCHED', 'PROJECT_CAST', 'AWARD_WON'].includes(event.type)
);

const newsCategory = (event: IndustryEventFact): NewsItem['category'] => (
    event.importance === 'HIGH' && [
        'COMPANY_PROMOTED', 'COMPANY_ACQUIRED', 'COMPANY_CLOSED',
        'PROJECT_HIT', 'PROJECT_FLOP', 'AWARD_WON',
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
    const selected = selectEditorialEvents(eligible);
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
        return {
            institution: coverage.institution,
            personality: coverage.personality,
            voice: createIndustryMediaVoice({
                event,
                story,
                institution: coverage.institution,
                personality: coverage.personality,
                assignment: coverage.assignment,
                channel,
            }),
        };
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
    const remainingStoryBudget = Math.max(0, INDUSTRY_PUBLIC_STORY_LIMIT_PER_WEEK - selected.length);
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
