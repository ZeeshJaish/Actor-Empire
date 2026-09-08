import type {
    IndustryEventFact,
    IndustryMediaClaimMode,
    IndustryMediaCreatorChannel,
    IndustryMediaPlayerResponse,
    IndustryMediaStory,
    IndustryMediaWorldState,
    IndustryMediaPersonality,
    IndustryMediaYoutubeFormat,
    IndustryMediaYoutubeOutcome,
    IndustryMediaYoutubeVideo,
    InstaPost,
    Player,
    XPost,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';
import { createIndustryMediaAvatar } from './industryMediaIdentities';

export const INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT = 160;
export const INDUSTRY_MEDIA_CREATOR_CHANNEL_LIMIT = 80;
export const INDUSTRY_MEDIA_CREATOR_RECENT_VIDEO_LIMIT = 16;
export const INDUSTRY_MEDIA_YOUTUBE_COMMENT_LIMIT = 8;
export const INDUSTRY_MEDIA_YOUTUBE_EVIDENCE_LIMIT = 12;
export const INDUSTRY_MEDIA_YOUTUBE_PROCESSED_KEY_LIMIT = 640;

const FORMATS = new Set<IndustryMediaYoutubeFormat>([
    'THEORY', 'EXPLAINED', 'BUSINESS_BREAKDOWN', 'REVIEW_AFTERMATH',
    'RESPONSE_ANALYSIS', 'CREATOR_REACTION',
]);
const CLAIM_MODES = new Set<IndustryMediaClaimMode>(['FACT', 'ANALYSIS', 'OPINION', 'SPECULATION']);
const OUTCOMES = new Set<IndustryMediaYoutubeOutcome>(['BREAKOUT', 'HIT', 'NORMAL', 'FLOP']);

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown): string | undefined => cleanText(value) || undefined;
const boundedNumber = (value: unknown, minimum: number, maximum: number, fallback = 0): number => {
    const numeric = Number(value);
    return Math.max(minimum, Math.min(maximum, Number.isFinite(numeric) ? numeric : fallback));
};
const safeInteger = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER, fallback = 0): number => (
    Math.round(boundedNumber(value, minimum, maximum, fallback))
);
const uniqueText = (value: unknown, limit: number): string[] => Array.isArray(value)
    ? [...new Set(value.map(cleanText).filter(Boolean))].slice(-limit)
    : [];
const color = (value: unknown, fallback: string): string => {
    const candidate = cleanText(value);
    return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toUpperCase() : fallback;
};

const normalizeYoutubeVideo = (
    value: unknown,
    storyById: Map<string, IndustryMediaStory>,
    personalityIds: Set<string>,
    institutionIds: Set<string>,
    responseById: Map<string, IndustryMediaPlayerResponse>,
): IndustryMediaYoutubeVideo | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaYoutubeVideo>;
    const id = cleanText(source.id);
    const publicationKey = cleanText(source.publicationKey);
    const industryEventId = cleanText(source.industryEventId);
    const mediaStoryId = cleanText(source.mediaStoryId);
    const personalityId = cleanText(source.personalityId);
    const story = storyById.get(mediaStoryId);
    const format = source.format;
    const outcome = source.outcome;
    if (
        !id || !publicationKey || !story || !story.industryEventIds.includes(industryEventId)
        || !personalityIds.has(personalityId) || !format || !FORMATS.has(format)
        || !outcome || !OUTCOMES.has(outcome)
    ) return null;
    const title = cleanText(source.title);
    const summary = cleanText(source.summary);
    const confirmedFacts = cleanText(source.confirmedFacts);
    const publishedAbsoluteWeek = safeInteger(source.publishedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, -1);
    if (!title || !summary || !confirmedFacts || publishedAbsoluteWeek < 0) return null;
    const sourceClaimMode = source.claimMode && CLAIM_MODES.has(source.claimMode) ? source.claimMode : 'ANALYSIS';
    const claimMode: IndustryMediaClaimMode = format === 'THEORY' ? 'SPECULATION' : sourceClaimMode;
    const interpretation = optionalText(source.interpretation);
    if (format === 'THEORY' && !interpretation) return null;
    const institutionId = optionalText(source.institutionId);
    const responseId = optionalText(source.responseId);
    const response = responseId ? responseById.get(responseId) : undefined;
    if (format === 'RESPONSE_ANALYSIS' && (!response || response.status !== 'RESOLVED')) return null;
    const evidenceEventIds = uniqueText(source.evidenceEventIds, Number.MAX_SAFE_INTEGER)
        .filter(eventId => story.industryEventIds.includes(eventId));
    if (!evidenceEventIds.includes(industryEventId)) evidenceEventIds.unshift(industryEventId);
    return {
        schemaVersion: 1,
        id,
        publicationKey,
        industryEventId,
        mediaStoryId,
        evidenceEventIds: evidenceEventIds.slice(0, INDUSTRY_MEDIA_YOUTUBE_EVIDENCE_LIMIT),
        personalityId,
        ...(institutionId && institutionIds.has(institutionId) ? { institutionId } : {}),
        format,
        claimMode,
        title,
        summary,
        confirmedFacts,
        ...(interpretation ? { interpretation } : {}),
        thumbnail: {
            primaryColor: color(source.thumbnail?.primaryColor, '#DC2626'),
            secondaryColor: color(source.thumbnail?.secondaryColor, '#18181B'),
            label: cleanText(source.thumbnail?.label) || format.replace(/_/g, ' '),
            motif: cleanText(source.thumbnail?.motif) || 'FRAME',
        },
        subjectKey: story.subjectKey,
        ...(optionalText(source.companyId) || story.companyId ? { companyId: optionalText(source.companyId) || story.companyId } : {}),
        ...(optionalText(source.projectId) || story.projectId ? { projectId: optionalText(source.projectId) || story.projectId } : {}),
        importance: story.importance,
        publishedAbsoluteWeek,
        lastPerformanceAbsoluteWeek: safeInteger(
            source.lastPerformanceAbsoluteWeek,
            publishedAbsoluteWeek,
            Number.MAX_SAFE_INTEGER,
            publishedAbsoluteWeek,
        ),
        views: safeInteger(source.views, 0),
        likes: safeInteger(source.likes, 0),
        comments: uniqueText(source.comments, INDUSTRY_MEDIA_YOUTUBE_COMMENT_LIMIT),
        outcome,
        subscriberDelta: safeInteger(source.subscriberDelta, -10_000_000, 10_000_000),
        estimatedRevenue: safeInteger(source.estimatedRevenue, 0),
        ...(response ? { responseId: response.id, responseOutcome: response.outcome } : {}),
    };
};

const retainYoutubeVideos = (videos: IndustryMediaYoutubeVideo[]): IndustryMediaYoutubeVideo[] => {
    if (videos.length <= INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT) return videos;
    const ordered = [...videos].sort((left, right) => (
        Number(right.importance === 'HIGH') - Number(left.importance === 'HIGH')
        || right.publishedAbsoluteWeek - left.publishedAbsoluteWeek
        || left.id.localeCompare(right.id)
    ));
    return ordered.slice(0, INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT)
        .sort((left, right) => left.publishedAbsoluteWeek - right.publishedAbsoluteWeek || left.id.localeCompare(right.id));
};

const normalizeCreatorChannel = (
    value: unknown,
    personalityIds: Set<string>,
    retainedVideoIds: Set<string>,
): IndustryMediaCreatorChannel | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaCreatorChannel>;
    const id = cleanText(source.id);
    const personalityId = cleanText(source.personalityId);
    if (!id || !personalityIds.has(personalityId)) return null;
    return {
        schemaVersion: 1,
        id,
        personalityId,
        subscribers: safeInteger(source.subscribers, 0),
        totalViews: safeInteger(source.totalViews, 0),
        credibility: safeInteger(source.credibility, 0, 100, 50),
        momentum: safeInteger(source.momentum, 0, 100, 50),
        sponsorAppeal: safeInteger(source.sponsorAppeal, 0, 100, 50),
        estimatedLifetimeRevenue: safeInteger(source.estimatedLifetimeRevenue, 0),
        uploadCount: safeInteger(source.uploadCount, 0),
        hitCount: safeInteger(source.hitCount, 0),
        flopCount: safeInteger(source.flopCount, 0),
        lastUploadAbsoluteWeek: safeInteger(source.lastUploadAbsoluteWeek, -1, Number.MAX_SAFE_INTEGER, -1),
        recentVideoIds: uniqueText(source.recentVideoIds, Number.MAX_SAFE_INTEGER)
            .filter(videoId => retainedVideoIds.has(videoId))
            .slice(-INDUSTRY_MEDIA_CREATOR_RECENT_VIDEO_LIMIT),
    };
};

export const normalizeIndustryMediaYoutubeCollections = (
    source: Partial<IndustryMediaWorldState>,
    stories: IndustryMediaStory[],
    institutionIds: Set<string>,
    personalityIds: Set<string>,
    responses: IndustryMediaPlayerResponse[],
): Pick<IndustryMediaWorldState, 'creatorChannels' | 'youtubeVideos' | 'processedYoutubeKeys'> => {
    const storyById = new Map(stories.map(story => [story.id, story]));
    const responseById = new Map(responses.map(response => [response.id, response]));
    const videoById = new Map<string, IndustryMediaYoutubeVideo>();
    const claimedPublicationKeys = new Set<string>();
    (Array.isArray(source.youtubeVideos) ? source.youtubeVideos : []).forEach(raw => {
        const video = normalizeYoutubeVideo(raw, storyById, personalityIds, institutionIds, responseById);
        if (video && !videoById.has(video.id) && !claimedPublicationKeys.has(video.publicationKey)) {
            videoById.set(video.id, video);
            claimedPublicationKeys.add(video.publicationKey);
        }
    });
    const youtubeVideos = retainYoutubeVideos([...videoById.values()]);
    const retainedVideoIds = new Set(youtubeVideos.map(video => video.id));
    const channelById = new Map<string, IndustryMediaCreatorChannel>();
    const claimedPersonalityIds = new Set<string>();
    (Array.isArray(source.creatorChannels) ? source.creatorChannels : []).forEach(raw => {
        const channel = normalizeCreatorChannel(raw, personalityIds, retainedVideoIds);
        if (channel && !channelById.has(channel.id) && !claimedPersonalityIds.has(channel.personalityId)) {
            channelById.set(channel.id, channel);
            claimedPersonalityIds.add(channel.personalityId);
        }
    });
    const creatorChannels = [...channelById.values()]
        .sort((left, right) => right.subscribers - left.subscribers || left.id.localeCompare(right.id))
        .slice(0, INDUSTRY_MEDIA_CREATOR_CHANNEL_LIMIT)
        .sort((left, right) => left.id.localeCompare(right.id));
    return {
        creatorChannels,
        youtubeVideos,
        processedYoutubeKeys: uniqueText(source.processedYoutubeKeys, INDUSTRY_MEDIA_YOUTUBE_PROCESSED_KEY_LIMIT),
    };
};

export interface IndustryMediaYoutubePerformanceInput {
    personality: IndustryMediaPersonality;
    channel: IndustryMediaCreatorChannel;
    story: IndustryMediaStory;
    format: IndustryMediaYoutubeFormat;
    discussionHeat: number;
    absoluteWeek: number;
    seedKey: string;
}

export interface IndustryMediaYoutubePerformance {
    views: number;
    likes: number;
    subscriberDelta: number;
    estimatedRevenue: number;
    outcome: IndustryMediaYoutubeOutcome;
}

const importanceWeight = (importance: IndustryMediaStory['importance']): number => (
    importance === 'HIGH' ? 3 : importance === 'MEDIUM' ? 2 : 1
);

export const calculateIndustryMediaYoutubePerformance = (
    input: IndustryMediaYoutubePerformanceInput,
): IndustryMediaYoutubePerformance => {
    const rng = createDeterministicRng(`industry-youtube-performance:${input.seedKey}`);
    const freshnessWeeks = Math.max(0, input.absoluteWeek - input.story.lastAdvancedAbsoluteWeek);
    const importanceLift = input.story.importance === 'HIGH' ? 0.35 : input.story.importance === 'MEDIUM' ? 0.15 : 0;
    const formatLift = input.format === 'THEORY' ? 0.12
        : input.format === 'RESPONSE_ANALYSIS' ? 0.1
            : input.format === 'REVIEW_AFTERMATH' ? 0.07 : 0.03;
    const freshnessLift = Math.max(-0.25, 0.18 - freshnessWeeks * 0.06);
    const momentumLift = ((input.channel.momentum - 50) / 100) * 0.3;
    const uploadGap = input.absoluteWeek - input.channel.lastUploadAbsoluteWeek;
    const fatiguePenalty = input.channel.lastUploadAbsoluteWeek >= input.absoluteWeek
        ? 0.55 : uploadGap <= 1 ? 0.25 : 0;
    const expectedRatio = Math.max(0.05,
        0.2
        + (input.personality.reach / 100) * 0.35
        + importanceLift
        + (Math.max(0, Math.min(100, input.discussionHeat)) / 100) * 0.25
        + formatLift
        + freshnessLift
        + momentumLift
        - fatiguePenalty,
    );
    const variance = 0.25 + rng() * 1.55;
    const viewRatio = Math.max(0.03, expectedRatio * variance);
    const views = Math.max(300, Math.round(Math.max(500, input.channel.subscribers) * viewRatio));
    const engagementRate = 0.035 + rng() * 0.055;
    const likes = Math.min(views, Math.round(views * engagementRate));
    const outcome: IndustryMediaYoutubeOutcome = viewRatio >= 1.75 ? 'BREAKOUT'
        : viewRatio >= 0.85 ? 'HIT'
            : viewRatio < 0.22 ? 'FLOP' : 'NORMAL';
    const subscriberRate = outcome === 'BREAKOUT' ? 0.045
        : outcome === 'HIT' ? 0.022
            : outcome === 'NORMAL' ? 0.008 : -0.0015;
    const subscriberDelta = Math.round(views * subscriberRate);
    const estimatedRevenue = Math.max(0, Math.round((views / 1_000) * (1.8 + rng() * 2.4)));
    return { views, likes, subscriberDelta, estimatedRevenue, outcome };
};

const createCreatorChannel = (personality: IndustryMediaPersonality): IndustryMediaCreatorChannel => {
    const rng = createDeterministicRng(`industry-youtube-channel:${personality.id}`);
    const subscribers = Math.round(Math.max(8_000, personality.reach * personality.reach * (55 + rng() * 45)));
    return {
        schemaVersion: 1,
        id: createDeterministicId('industry_youtube_channel', personality.id),
        personalityId: personality.id,
        subscribers,
        totalViews: Math.round(subscribers * (6 + rng() * 18)),
        credibility: personality.credibility,
        momentum: Math.round(38 + rng() * 24),
        sponsorAppeal: Math.round(Math.max(10, Math.min(100,
            personality.reach * 0.55 + personality.credibility * 0.35 - personality.sensationalism * 0.12,
        ))),
        estimatedLifetimeRevenue: Math.round(subscribers * (0.4 + rng() * 1.2)),
        uploadCount: Math.round(18 + rng() * 70),
        hitCount: Math.round(3 + rng() * 14),
        flopCount: Math.round(1 + rng() * 7),
        lastUploadAbsoluteWeek: -1,
        recentVideoIds: [],
    };
};

const discussionHeatFor = (state: IndustryMediaWorldState, storyId: string): number => (
    state.discussions
        .filter(discussion => discussion.mediaStoryId === storyId)
        .reduce((highest, discussion) => Math.max(highest, discussion.heat), 0)
);

const responseFor = (
    state: IndustryMediaWorldState,
    storyId: string,
    absoluteWeek: number,
): IndustryMediaPlayerResponse | undefined => (
    [...state.playerResponses]
        .filter(response => response.mediaStoryId === storyId
            && response.status === 'RESOLVED'
            && (response.resolvedAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) <= absoluteWeek)
        .sort((left, right) => (right.resolvedAbsoluteWeek || 0) - (left.resolvedAbsoluteWeek || 0)
            || left.id.localeCompare(right.id))[0]
);

const formatFor = (
    story: IndustryMediaStory,
    response?: IndustryMediaPlayerResponse,
): IndustryMediaYoutubeFormat => {
    if (response) return 'RESPONSE_ANALYSIS';
    if (story.category === 'FRANCHISE' || story.category === 'PROJECT_DEVELOPMENT') return 'THEORY';
    if (story.category === 'RIGHTS' || story.category === 'COMPANY' || story.category === 'PARTNERSHIP') {
        return 'BUSINESS_BREAKDOWN';
    }
    if (story.category === 'PROJECT_RELEASE' || story.category === 'PROJECT_OUTCOME' || story.category === 'AWARDS') {
        return 'REVIEW_AFTERMATH';
    }
    return 'CREATOR_REACTION';
};

const roleFit = (personality: IndustryMediaPersonality, format: IndustryMediaYoutubeFormat): number => {
    if (format === 'THEORY') return personality.role === 'THEORY_CREATOR' ? 120 : -200;
    if (format === 'BUSINESS_BREAKDOWN') return personality.role === 'BUSINESS_ANALYST' ? 100 : 0;
    if (format === 'REVIEW_AFTERMATH') return personality.role === 'CRITIC' ? 90 : 0;
    if (format === 'CREATOR_REACTION') return personality.role === 'COMMENTATOR' ? 80 : 0;
    return personality.role === 'COMMENTATOR' || personality.role === 'REPORTER' ? 55 : 25;
};

const selectCreator = (
    state: IndustryMediaWorldState,
    story: IndustryMediaStory,
    format: IndustryMediaYoutubeFormat,
    absoluteWeek: number,
    channelByPersonalityId: Map<string, IndustryMediaCreatorChannel>,
): IndustryMediaPersonality | undefined => {
    const assignedPersonalityIds = new Set(state.storyAssignments
        .filter(assignment => assignment.storyId === story.id)
        .map(assignment => assignment.personalityId)
        .filter((value): value is string => Boolean(value)));
    return state.personalities
        .filter(personality => personality.isActive
            && personality.channels.includes('YOUTUBE')
            && personality.focusCategories.includes(story.category))
        .map(personality => {
            const channel = channelByPersonalityId.get(personality.id) || createCreatorChannel(personality);
            const rng = createDeterministicRng(`industry-youtube-creator:${story.id}:${absoluteWeek}:${personality.id}`);
            const cadencePenalty = channel.lastUploadAbsoluteWeek === absoluteWeek ? 1_000
                : absoluteWeek - channel.lastUploadAbsoluteWeek <= 1 ? 35 : 0;
            const score = roleFit(personality, format)
                + personality.reach * 0.34
                + personality.credibility * 0.28
                + (assignedPersonalityIds.has(personality.id) ? 24 : 0)
                - cadencePenalty
                + rng() * 18;
            return { personality, score };
        })
        .filter(item => item.score > -100)
        .sort((left, right) => right.score - left.score || left.personality.id.localeCompare(right.personality.id))[0]
        ?.personality;
};

const displaySubject = (story: IndustryMediaStory, event: IndustryEventFact): string => (
    event.companyName || story.companyName || event.headline
);

const copyFor = (
    story: IndustryMediaStory,
    event: IndustryEventFact,
    format: IndustryMediaYoutubeFormat,
    response?: IndustryMediaPlayerResponse,
): Pick<IndustryMediaYoutubeVideo, 'title' | 'summary' | 'confirmedFacts' | 'interpretation' | 'claimMode'> => {
    const subject = displaySubject(story, event);
    if (format === 'THEORY') return {
        title: `${event.headline} — What It Could Mean`,
        summary: `A theory-led breakdown of the confirmed ${subject} development and what it may suggest next.`,
        confirmedFacts: event.detail,
        interpretation: 'Theory: this could shape another connected story, but no further project has been confirmed.',
        claimMode: 'SPECULATION',
    };
    if (format === 'BUSINESS_BREAKDOWN') return {
        title: `${event.headline} — The Business Explained`,
        summary: `A numbers-first breakdown of the confirmed ${subject} move and the strategy behind it.`,
        confirmedFacts: event.detail,
        interpretation: 'Analysis: the move may change competitive positioning, though later results will decide its value.',
        claimMode: 'ANALYSIS',
    };
    if (format === 'REVIEW_AFTERMATH') return {
        title: `${event.headline} — The Full Aftermath`,
        summary: `A critical look at the confirmed outcome and what the public record shows so far.`,
        confirmedFacts: event.detail,
        interpretation: 'Analysis: the result strengthens one reading of the project, while its longer legacy remains unsettled.',
        claimMode: 'ANALYSIS',
    };
    if (format === 'RESPONSE_ANALYSIS' && response) return {
        title: `${subject} Responded — Did It Work?`,
        summary: `A breakdown of the public statement and its saved ${response.outcome?.toLowerCase() || 'resolved'} reception.`,
        confirmedFacts: `${event.detail} The recorded public response resolved as ${response.outcome || 'MIXED'}.`,
        interpretation: 'Analysis: the response changed the tone of the conversation, not the underlying industry facts.',
        claimMode: 'ANALYSIS',
    };
    return {
        title: `${event.headline} — Creator Reaction`,
        summary: `A creator perspective on the confirmed ${subject} development.`,
        confirmedFacts: event.detail,
        interpretation: 'Opinion: the decision is worth watching, but its eventual result is not yet known.',
        claimMode: 'OPINION',
    };
};

const commentsFor = (format: IndustryMediaYoutubeFormat, outcome: IndustryMediaYoutubeOutcome): string[] => {
    const opening = format === 'THEORY'
        ? 'Finally, a theory that separates the confirmed facts from the possibilities.'
        : format === 'BUSINESS_BREAKDOWN'
            ? 'The context makes this deal much easier to understand.'
            : format === 'RESPONSE_ANALYSIS'
                ? 'The response mattered, but the original facts still stand.'
                : 'This is the kind of industry context the headline needed.';
    const result = outcome === 'BREAKOUT' ? 'This video is everywhere this week.'
        : outcome === 'HIT' ? 'The comments are turning this into a much bigger conversation.'
            : outcome === 'FLOP' ? 'Good topic, but this upload arrived after the conversation moved on.'
                : 'A measured breakdown without pretending to know more than the record says.';
    return [opening, result, 'I want to see how this story develops next.'];
};

const thumbnailFor = (
    format: IndustryMediaYoutubeFormat,
    institution?: IndustryMediaWorldState['institutions'][number],
): IndustryMediaYoutubeVideo['thumbnail'] => ({
    primaryColor: institution?.primaryColor || '#DC2626',
    secondaryColor: institution?.secondaryColor || '#18181B',
    label: format.replace(/_/g, ' '),
    motif: format === 'THEORY' ? 'SIGNAL'
        : format === 'BUSINESS_BREAKDOWN' ? 'CHART'
            : format === 'REVIEW_AFTERMATH' ? 'FRAME' : 'MIC',
});

const advanceLongTail = (
    state: IndustryMediaWorldState,
    absoluteWeek: number,
): Pick<IndustryMediaWorldState, 'youtubeVideos' | 'creatorChannels'> => {
    const channelByPersonality = new Map(state.creatorChannels.map(channel => [channel.personalityId, { ...channel }]));
    const youtubeVideos = state.youtubeVideos.map(video => {
        if (video.lastPerformanceAbsoluteWeek >= absoluteWeek || absoluteWeek - video.publishedAbsoluteWeek > 12) return video;
        const elapsed = Math.min(absoluteWeek - video.lastPerformanceAbsoluteWeek, 12);
        const rng = createDeterministicRng(`industry-youtube-long-tail:${video.id}:${video.lastPerformanceAbsoluteWeek}:${absoluteWeek}`);
        const extraViews = Math.max(0, Math.round(video.views * (0.012 + rng() * 0.025) * elapsed));
        const extraLikes = Math.round(extraViews * (0.035 + rng() * 0.035));
        const extraRevenue = Math.round((extraViews / 1_000) * (1.6 + rng() * 1.8));
        const channel = channelByPersonality.get(video.personalityId);
        if (channel) {
            channel.totalViews += extraViews;
            channel.estimatedLifetimeRevenue += extraRevenue;
        }
        return {
            ...video,
            views: video.views + extraViews,
            likes: Math.min(video.views + extraViews, video.likes + extraLikes),
            estimatedRevenue: video.estimatedRevenue + extraRevenue,
            lastPerformanceAbsoluteWeek: absoluteWeek,
        };
    });
    return { youtubeVideos, creatorChannels: [...channelByPersonality.values()] };
};

export interface IndustryMediaYoutubeResult {
    player: Player;
    createdVideos: IndustryMediaYoutubeVideo[];
    xPosts: XPost[];
    instaPosts: InstaPost[];
}

const prependUnique = <T extends { id: string }>(created: T[], existing: T[], limit: number): T[] => {
    const seen = new Set<string>();
    return [...created, ...existing].filter(item => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    }).slice(0, limit);
};

const createYoutubeEchoes = (
    state: IndustryMediaWorldState,
    videos: IndustryMediaYoutubeVideo[],
    absoluteWeek: number,
): { xPosts: XPost[]; instaPosts: InstaPost[] } => {
    const xPosts: XPost[] = [];
    const instaPosts: InstaPost[] = [];
    videos.forEach(video => {
        const personality = state.personalities.find(item => item.id === video.personalityId);
        if (!personality) return;
        const institution = state.institutions.find(item => item.id === video.institutionId);
        const avatar = createIndustryMediaAvatar(personality.name, institution?.primaryColor || video.thumbnail.primaryColor);
        xPosts.push({
            id: `x_youtube_${video.id}`,
            authorId: personality.id,
            authorName: personality.name,
            authorHandle: personality.handle,
            authorAvatar: avatar,
            content: `New video: ${video.title}. ${video.summary}`,
            timestamp: absoluteWeek,
            likes: Math.max(25, Math.round(video.likes * 0.08)),
            retweets: Math.max(5, Math.round(video.likes * 0.012)),
            replies: Math.max(3, Math.round(video.comments.length * 18 + video.likes * 0.003)),
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: personality.verified,
            postType: 'FILM_OPINION',
            sentiment: personality.signatureRole === 'ANTAGONIST' ? 'MESSY'
                : personality.signatureRole === 'SUPPORTER' ? 'SUPPORTIVE' : 'INDUSTRY',
            industryEventId: video.industryEventId,
            mediaStoryId: video.mediaStoryId,
            ...(institution ? { mediaInstitutionId: institution.id } : {}),
            mediaPersonalityId: personality.id,
            industryYoutubeVideoId: video.id,
            ...(video.mediaClaimId ? { mediaClaimId: video.mediaClaimId } : {}),
            ...(video.companyId ? { companyId: video.companyId } : {}),
            ...(video.projectId ? { projectId: video.projectId } : {}),
        });
        if ((video.outcome === 'BREAKOUT' || video.outcome === 'HIT')
            && (video.format === 'THEORY' || video.format === 'REVIEW_AFTERMATH')) {
            instaPosts.push({
                id: `instagram_youtube_${video.id}`,
                authorId: personality.id,
                authorName: personality.name,
                authorHandle: personality.handle,
                authorAvatar: avatar,
                type: 'ANNOUNCEMENT',
                caption: `${video.title}\n\n${video.summary}`,
                week: (absoluteWeek % 52) + 1,
                year: Math.floor(absoluteWeek / 52) + 1,
                likes: Math.max(50, Math.round(video.likes * 0.14)),
                comments: Math.max(5, Math.round(video.comments.length * 24)),
                shares: Math.max(3, Math.round(video.likes * 0.015)),
                mood: 'INDUSTRY',
                isPlayer: false,
                industryEventId: video.industryEventId,
                mediaStoryId: video.mediaStoryId,
                ...(institution ? { mediaInstitutionId: institution.id } : {}),
                mediaPersonalityId: personality.id,
                industryYoutubeVideoId: video.id,
                ...(video.mediaClaimId ? { mediaClaimId: video.mediaClaimId } : {}),
                ...(video.companyId ? { companyId: video.companyId } : {}),
                ...(video.projectId ? { projectId: video.projectId } : {}),
            });
        }
    });
    return { xPosts, instaPosts };
};

export const processIndustryMediaYoutube = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaYoutubeResult => {
    const originalPlayerYoutube = player.youtube;
    let mediaState = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const advanced = advanceLongTail(mediaState, absoluteWeek);
    mediaState = normalizeIndustryMediaWorld({ ...mediaState, ...advanced });
    const eventLedger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const eventById = new Map(eventLedger.events.map(event => [event.id, event]));
    const channels = new Map(mediaState.creatorChannels.map(channel => [channel.personalityId, { ...channel }]));
    const createdVideos: IndustryMediaYoutubeVideo[] = [];
    const processedKeys = new Set(mediaState.processedYoutubeKeys);
    const candidates = mediaState.stories
        .filter(story => story.channelEligibility.includes('YOUTUBE')
            && story.importance !== 'LOW'
            && !['FADED', 'SUPERSEDED'].includes(story.stage)
            && absoluteWeek - story.lastAdvancedAbsoluteWeek <= 8)
        .map(story => {
            const event = [...story.industryEventIds]
                .map(eventId => eventById.get(eventId))
                .filter((item): item is IndustryEventFact => Boolean(item) && item.absoluteWeek <= absoluteWeek)
                .sort((left, right) => right.absoluteWeek - left.absoluteWeek || left.id.localeCompare(right.id))[0];
            const response = responseFor(mediaState, story.id, absoluteWeek);
            const format = formatFor(story, response);
            const publicationKey = event ? `youtube:${story.id}:${response?.id || event.id}:${format}` : '';
            return { story, event, response, format, publicationKey };
        })
        .filter(item => item.event && item.publicationKey && !processedKeys.has(item.publicationKey))
        .sort((left, right) => (
            Number(Boolean(right.response)) - Number(Boolean(left.response))
            || importanceWeight(right.story.importance) - importanceWeight(left.story.importance)
            || right.story.lastAdvancedAbsoluteWeek - left.story.lastAdvancedAbsoluteWeek
            || left.story.id.localeCompare(right.story.id)
        ));

    for (const candidate of candidates) {
        if (createdVideos.length >= 2) break;
        const creator = selectCreator(mediaState, candidate.story, candidate.format, absoluteWeek, channels);
        if (!creator || !candidate.event) continue;
        let channel = channels.get(creator.id) || createCreatorChannel(creator);
        if (channel.lastUploadAbsoluteWeek === absoluteWeek) continue;
        const performance = calculateIndustryMediaYoutubePerformance({
            personality: creator,
            channel,
            story: candidate.story,
            format: candidate.format,
            discussionHeat: discussionHeatFor(mediaState, candidate.story.id),
            absoluteWeek,
            seedKey: candidate.publicationKey,
        });
        const id = createDeterministicId('industry_youtube_video', candidate.publicationKey);
        const institution = mediaState.institutions.find(item => item.id === creator.institutionId);
        const copy = copyFor(candidate.story, candidate.event, candidate.format, candidate.response);
        const linkedClaim = [...mediaState.claims]
            .filter(claim => claim.anchorStoryId === candidate.story.id && claim.createdAbsoluteWeek < absoluteWeek)
            .sort((left, right) => right.createdAbsoluteWeek - left.createdAbsoluteWeek || left.id.localeCompare(right.id))[0];
        const video: IndustryMediaYoutubeVideo = {
            schemaVersion: 1,
            id,
            publicationKey: candidate.publicationKey,
            industryEventId: candidate.event.id,
            mediaStoryId: candidate.story.id,
            evidenceEventIds: [...candidate.story.industryEventIds].slice(-INDUSTRY_MEDIA_YOUTUBE_EVIDENCE_LIMIT),
            personalityId: creator.id,
            ...(institution ? { institutionId: institution.id } : {}),
            format: candidate.format,
            ...copy,
            thumbnail: thumbnailFor(candidate.format, institution),
            subjectKey: candidate.story.subjectKey,
            ...(candidate.story.companyId ? { companyId: candidate.story.companyId } : {}),
            ...(candidate.story.projectId ? { projectId: candidate.story.projectId } : {}),
            importance: candidate.story.importance,
            publishedAbsoluteWeek: absoluteWeek,
            lastPerformanceAbsoluteWeek: absoluteWeek,
            views: performance.views,
            likes: performance.likes,
            comments: commentsFor(candidate.format, performance.outcome),
            outcome: performance.outcome,
            subscriberDelta: performance.subscriberDelta,
            estimatedRevenue: performance.estimatedRevenue,
            ...(candidate.response ? { responseId: candidate.response.id, responseOutcome: candidate.response.outcome } : {}),
            ...(linkedClaim ? { mediaClaimId: linkedClaim.id } : {}),
        };
        channel = {
            ...channel,
            subscribers: Math.max(0, channel.subscribers + performance.subscriberDelta),
            totalViews: channel.totalViews + performance.views,
            credibility: Math.max(0, Math.min(100, channel.credibility
                + (performance.outcome === 'HIT' || performance.outcome === 'BREAKOUT' ? 1 : performance.outcome === 'FLOP' ? -1 : 0))),
            momentum: Math.max(0, Math.min(100, channel.momentum
                + (performance.outcome === 'BREAKOUT' ? 14 : performance.outcome === 'HIT' ? 7 : performance.outcome === 'FLOP' ? -8 : 1))),
            sponsorAppeal: Math.max(0, Math.min(100, channel.sponsorAppeal
                + (performance.outcome === 'BREAKOUT' ? 4 : performance.outcome === 'HIT' ? 2 : performance.outcome === 'FLOP' ? -2 : 0))),
            estimatedLifetimeRevenue: channel.estimatedLifetimeRevenue + performance.estimatedRevenue,
            uploadCount: channel.uploadCount + 1,
            hitCount: channel.hitCount + Number(performance.outcome === 'HIT' || performance.outcome === 'BREAKOUT'),
            flopCount: channel.flopCount + Number(performance.outcome === 'FLOP'),
            lastUploadAbsoluteWeek: absoluteWeek,
            recentVideoIds: [...channel.recentVideoIds.filter(videoId => videoId !== id), id]
                .slice(-INDUSTRY_MEDIA_CREATOR_RECENT_VIDEO_LIMIT),
        };
        channels.set(creator.id, channel);
        createdVideos.push(video);
        processedKeys.add(candidate.publicationKey);
    }

    const publishedStoryIds = new Set(createdVideos.map(video => video.mediaStoryId));
    mediaState = normalizeIndustryMediaWorld({
        ...mediaState,
        stories: mediaState.stories.map(story => publishedStoryIds.has(story.id) && !story.publishedChannels.includes('YOUTUBE')
            ? { ...story, publishedChannels: [...story.publishedChannels, 'YOUTUBE'] }
            : story),
        creatorChannels: [...channels.values()],
        youtubeVideos: [...mediaState.youtubeVideos, ...createdVideos],
        processedYoutubeKeys: [...processedKeys],
    });
    const echoes = createYoutubeEchoes(mediaState, createdVideos, absoluteWeek);
    const nextPlayer: Player = {
        ...player,
        youtube: originalPlayerYoutube,
        world: { ...player.world, industryMedia: mediaState },
        ...(echoes.xPosts.length ? {
            x: { ...player.x, feed: prependUnique(echoes.xPosts, player.x?.feed || [], 80) },
        } : {}),
        ...(echoes.instaPosts.length ? {
            instagram: {
                ...player.instagram,
                feed: prependUnique(echoes.instaPosts, player.instagram?.feed || [], 50),
            },
        } : {}),
    };
    return { player: nextPlayer, createdVideos, ...echoes };
};
