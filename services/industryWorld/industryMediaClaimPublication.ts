import type {
    IndustryEventFact,
    IndustryMediaClaim,
    IndustryMediaInstitution,
    IndustryMediaPersonality,
    IndustryMediaWorldState,
    InstaPost,
    NewsItem,
    Player,
    XPost,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { ensureIndustryMediaDiscussion } from './industryMediaDiscussions';
import { createIndustryMediaAvatar } from './industryMediaIdentities';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

const NEWS_LIMIT = 50;
const X_FEED_LIMIT = 80;
const INSTAGRAM_FEED_LIMIT = 50;
export const INDUSTRY_MEDIA_CLAIM_BEAT_LIMIT_PER_WEEK = 2;

const prependUnique = <T extends { id: string }>(created: T[], existing: T[], limit: number): T[] => {
    const ids = new Set<string>();
    return [...created, ...existing].filter(item => {
        if (!item.id || ids.has(item.id)) return false;
        ids.add(item.id);
        return true;
    }).slice(0, limit);
};

const engagementFor = (claim: IndustryMediaClaim, suffix: string) => {
    const rng = createDeterministicRng(`c6:claim-engagement:${claim.id}:${suffix}`);
    const scale = claim.importance === 'HIGH' ? 4 : claim.importance === 'MEDIUM' ? 2 : 1;
    return {
        likes: Math.round((140 + rng() * 460) * scale),
        retweets: Math.round((18 + rng() * 105) * scale),
        replies: Math.round((10 + rng() * 64) * scale),
    };
};

const resolutionLabel = (claim: IndustryMediaClaim): string => ({
    CONFIRMED: 'CONFIRMED',
    PARTLY_CONFIRMED: 'PARTLY CONFIRMED',
    REFUTED: 'REFUTED',
    EXPIRED_UNVERIFIED: 'UNVERIFIED',
    SUPERSEDED: 'OVERTAKEN BY EVENTS',
    OPEN: 'UNCONFIRMED',
})[claim.status];

const sourceFor = (
    state: IndustryMediaWorldState,
    claim: IndustryMediaClaim,
): { institution: IndustryMediaInstitution; personality?: IndustryMediaPersonality } | null => {
    const institution = state.institutions.find(item => item.id === claim.institutionId);
    if (!institution) return null;
    const personality = claim.personalityId
        ? state.personalities.find(item => item.id === claim.personalityId)
        : undefined;
    return { institution, personality };
};

const avatarFor = (institution: IndustryMediaInstitution, personality?: IndustryMediaPersonality): string => (
    personality
        ? createIndustryMediaAvatar(personality.name, institution.primaryColor)
        : createIndustryMediaAvatar(institution.shortName, institution.primaryColor)
);

const originX = (
    claim: IndustryMediaClaim,
    institution: IndustryMediaInstitution,
    personality?: IndustryMediaPersonality,
): XPost => ({
    id: `x_claim_${claim.id}`,
    authorId: personality?.id || institution.id,
    authorName: personality?.name || institution.name,
    authorHandle: personality?.handle || institution.handles.X || `@${institution.id}`,
    authorAvatar: avatarFor(institution, personality),
    content: `${claim.headline}\n\n${claim.summary}`,
    timestamp: claim.createdAbsoluteWeek,
    ...engagementFor(claim, 'origin'),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: personality?.verified ?? true,
    postType: 'FILM_OPINION',
    sentiment: claim.kind === 'LEAK' ? 'MESSY' : 'INDUSTRY',
    industryEventId: claim.anchorIndustryEventId,
    mediaStoryId: claim.anchorStoryId,
    mediaInstitutionId: institution.id,
    ...(personality ? { mediaPersonalityId: personality.id } : {}),
    mediaClaimId: claim.id,
    ...(claim.target.companyId ? { companyId: claim.target.companyId } : {}),
    ...(claim.target.projectId ? { projectId: claim.target.projectId } : {}),
});

const resolutionX = (
    claim: IndustryMediaClaim,
    absoluteWeek: number,
    institution: IndustryMediaInstitution,
    personality?: IndustryMediaPersonality,
): XPost => ({
    id: `x_claim_resolution_${claim.id}_${claim.status}`,
    authorId: personality?.id || institution.id,
    authorName: personality?.name || institution.name,
    authorHandle: personality?.handle || institution.handles.X || `@${institution.id}`,
    authorAvatar: avatarFor(institution, personality),
    content: `${resolutionLabel(claim)} — ${claim.subjectName}\n\n${claim.resolution?.explanation || 'Later confirmed evidence has resolved this report.'}`,
    timestamp: absoluteWeek,
    ...engagementFor(claim, claim.status),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: personality?.verified ?? true,
    postType: 'FILM_OPINION',
    sentiment: claim.status === 'REFUTED' ? 'MESSY' : 'INDUSTRY',
    industryEventId: claim.resolution?.eventIds[0] || claim.anchorIndustryEventId,
    mediaStoryId: claim.anchorStoryId,
    mediaInstitutionId: institution.id,
    ...(personality ? { mediaPersonalityId: personality.id } : {}),
    mediaClaimId: claim.id,
    ...(claim.target.companyId ? { companyId: claim.target.companyId } : {}),
    ...(claim.target.projectId ? { projectId: claim.target.projectId } : {}),
});

const claimNews = (
    player: Player,
    claim: IndustryMediaClaim,
    institution: IndustryMediaInstitution,
    personality: IndustryMediaPersonality | undefined,
    absoluteWeek: number,
    resolution: boolean,
): NewsItem => ({
    id: resolution ? `news_claim_resolution_${claim.id}_${claim.status}` : `news_claim_${claim.id}`,
    headline: resolution ? `${resolutionLabel(claim)}: ${claim.subjectName}` : claim.headline,
    subtext: resolution ? claim.resolution?.explanation : `${claim.summary} ${claim.knownEvidence}`,
    category: claim.importance === 'HIGH' ? 'TOP_STORY' : 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: claim.importance,
    industryEventId: resolution ? claim.resolution?.eventIds[0] || claim.anchorIndustryEventId : claim.anchorIndustryEventId,
    mediaStoryId: claim.anchorStoryId,
    mediaInstitutionId: institution.id,
    ...(personality ? { mediaPersonalityId: personality.id, byline: personality.name } : {}),
    mediaClaimId: claim.id,
    sourceName: institution.name,
    ...(claim.target.companyId ? { companyId: claim.target.companyId } : {}),
    ...(claim.target.projectId ? { projectId: claim.target.projectId } : {}),
});

const claimInstagram = (
    player: Player,
    claim: IndustryMediaClaim,
    institution: IndustryMediaInstitution,
    personality?: IndustryMediaPersonality,
): InstaPost => ({
    id: `instagram_claim_${claim.id}`,
    authorId: personality?.id || institution.id,
    authorName: personality?.name || institution.name,
    authorHandle: personality?.handle || institution.handles.INSTAGRAM || `@${institution.id}`,
    authorAvatar: avatarFor(institution, personality),
    type: 'ANNOUNCEMENT',
    caption: `${claim.headline}\n\n${claim.summary}`,
    week: player.currentWeek,
    year: player.age,
    likes: engagementFor(claim, 'instagram').likes * 2,
    comments: engagementFor(claim, 'instagram').replies,
    shares: engagementFor(claim, 'instagram').retweets,
    mood: 'INDUSTRY',
    isPlayer: false,
    industryEventId: claim.anchorIndustryEventId,
    mediaStoryId: claim.anchorStoryId,
    mediaInstitutionId: institution.id,
    ...(personality ? { mediaPersonalityId: personality.id } : {}),
    mediaClaimId: claim.id,
    ...(claim.target.companyId ? { companyId: claim.target.companyId } : {}),
    ...(claim.target.projectId ? { projectId: claim.target.projectId } : {}),
});

export interface IndustryMediaClaimPublicationResult {
    player: Player;
    news: NewsItem[];
    xPosts: XPost[];
    instaPosts: InstaPost[];
}

export const publishIndustryMediaClaimBeats = (
    player: Player,
    absoluteWeek: number,
    newClaim: IndustryMediaClaim | undefined,
    resolvedClaims: IndustryMediaClaim[],
): IndustryMediaClaimPublicationResult => {
    let media = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const events = normalizeIndustryEventLedger(player.world?.industryEvents).events;
    const eventById = new Map(events.map(event => [event.id, event]));
    const storyById = new Map(media.stories.map(story => [story.id, story]));
    const processed = new Set(media.processedClaimKeys);
    const news: NewsItem[] = [];
    const xPosts: XPost[] = [];
    const instaPosts: InstaPost[] = [];

    const beats = [
        ...resolvedClaims
            .filter(claim => claim.status !== 'OPEN')
            .sort((left, right) => Number(right.playerRelated) - Number(left.playerRelated)
                || ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[right.importance] - { HIGH: 3, MEDIUM: 2, LOW: 1 }[left.importance])
                || left.id.localeCompare(right.id))
            .map(claim => ({ claim, resolution: true })),
        ...(newClaim ? [{ claim: newClaim, resolution: false }] : []),
    ].filter(beat => {
        const key = beat.resolution
            ? `c6:published:${beat.claim.id}:resolution:${beat.claim.status}`
            : `c6:published:${beat.claim.id}:open`;
        return !processed.has(key);
    }).slice(0, INDUSTRY_MEDIA_CLAIM_BEAT_LIMIT_PER_WEEK);

    beats.forEach(beat => {
        const claim = media.claims.find(item => item.id === beat.claim.id) || beat.claim;
        const source = sourceFor(media, claim);
        const story = storyById.get(claim.anchorStoryId);
        const eventId = beat.resolution ? claim.resolution?.eventIds[0] || claim.anchorIndustryEventId : claim.anchorIndustryEventId;
        const event = eventById.get(eventId) || eventById.get(claim.anchorIndustryEventId);
        if (!source || !story || !event) return;
        const key = beat.resolution
            ? `c6:published:${claim.id}:resolution:${claim.status}`
            : `c6:published:${claim.id}:open`;
        let xPost = beat.resolution
            ? resolutionX(claim, absoluteWeek, source.institution, source.personality)
            : originX(claim, source.institution, source.personality);
        if (!beat.resolution && source.personality) {
            const discussion = ensureIndustryMediaDiscussion({ state: media, story, event, post: xPost, player, absoluteWeek });
            media = discussion.state;
            xPost = discussion.post;
            media = normalizeIndustryMediaWorld({
                ...media,
                claims: media.claims.map(item => item.id === claim.id ? { ...item, discussionId: discussion.discussion.id } : item),
            });
        }
        xPosts.push(xPost);
        if (claim.importance === 'HIGH' || beat.resolution || claim.kind === 'LEAK') {
            news.push(claimNews(player, claim, source.institution, source.personality, absoluteWeek, beat.resolution));
        }
        if (!beat.resolution && claim.importance === 'HIGH'
            && ['CASTING', 'FRANCHISE_DIRECTION', 'AWARDS'].includes(claim.category)
            && source.institution.channels.includes('INSTAGRAM')) {
            instaPosts.push(claimInstagram(player, claim, source.institution, source.personality));
        }
        processed.add(key);
    });

    media = normalizeIndustryMediaWorld({ ...media, processedClaimKeys: [...processed] });
    const nextPlayer: Player = news.length || xPosts.length || instaPosts.length ? {
        ...player,
        news: prependUnique(news, player.news || [], NEWS_LIMIT),
        x: { ...player.x, feed: prependUnique(xPosts, player.x?.feed || [], X_FEED_LIMIT) },
        instagram: { ...player.instagram, feed: prependUnique(instaPosts, player.instagram?.feed || [], INSTAGRAM_FEED_LIMIT) },
        world: { ...player.world, industryMedia: media },
    } : { ...player, world: { ...player.world, industryMedia: media } };
    return { player: nextPlayer, news, xPosts, instaPosts };
};
