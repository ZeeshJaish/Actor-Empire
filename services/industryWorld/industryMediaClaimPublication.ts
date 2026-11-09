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
import { createIndustryMediaClaimNames, type IndustryMediaClaimNames } from './industryMediaClaims';
import { fillCopy, pickCopy, pickFreshCopy, sentenceStart } from './mediaCopyVariety';

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

/* 2026-11-09 (Zeesh: one title repeating with only the name changed): what happened to a claim, said many ways.
   Seeded by the claim and its status, so the same resolution reads the same everywhere. */
type ClaimOutcome = Exclude<IndustryMediaClaim['status'], 'OPEN'>;
const RESOLUTION_HEADLINES: Record<ClaimOutcome, readonly string[]> = {
    CONFIRMED: ['{source} called it: {subject}', 'It happened: {subject}', 'The {subject} report holds up', 'Right all along about {subject}', 'Confirmed: {subject}'],
    PARTLY_CONFIRMED: ['Close, but not quite: {subject}', '{subject}: half right', 'The {subject} report gets a partial nod', 'Nearly there on {subject}'],
    REFUTED: ['Wrong call on {subject}', 'The {subject} report misses', '{subject}: that claim falls apart', 'Not what they said: {subject}', 'Missed it: {subject}'],
    EXPIRED_UNVERIFIED: ['Whatever happened to the {subject} story?', 'The {subject} report fades without proof', 'No proof ever came for the {subject} claim', 'The {subject} chatter goes quiet', 'Unverified: {subject}', 'That {subject} tip never checked out', '{source} goes quiet on {subject}', 'Still no sign of the {subject} story'],
    SUPERSEDED: ['Events overtake the {subject} story', '{subject}: the story moved on', 'The {subject} claim is overtaken by events', 'Plans changed for {subject}'],
};
const RESOLUTION_LEADS: Record<ClaimOutcome, readonly string[]> = {
    CONFIRMED: ['Right on the money.', 'Called it.', 'It checked out.', 'The report held up.', 'Spot on.'],
    PARTLY_CONFIRMED: ['Close, but not exact.', 'Half right.', 'A near miss.', 'Partly right.'],
    REFUTED: ['Wrong call.', 'It did not check out.', 'A miss.', 'Not this time.', 'The report fell apart.'],
    EXPIRED_UNVERIFIED: ['No proof ever came.', 'The trail went cold.', 'Nothing backed it up.', 'It never checked out.', 'Silence since.'],
    SUPERSEDED: ['Events moved on.', 'Plans changed.', 'Bigger news took over.', 'The story changed.'],
};
const EXPIRED_LINES = [
    'The claim was never backed up in time.',
    'No evidence turned up before the story went cold.',
    'Nothing public ever supported it.',
    'Nobody involved ever confirmed it.',
] as const;

/* claims written before 2026-11-09 carry a name made from a project id ("Studio Ai Project 1cug4ph"): show the title */
const idName = (value: string): string => value.replace(/[_:-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()).trim();
const claimSubject = (claim: IndustryMediaClaim, names?: IndustryMediaClaimNames): string => {
    const projectId = claim.target.projectId;
    if (!projectId || claim.subjectName !== idName(projectId)) return claim.subjectName;
    return names?.project(projectId) || claim.subjectName;
};

const resolutionHeadline = (claim: IndustryMediaClaim, subject: string, sourceName: string, recentLines: readonly string[] = []): string => (
    claim.status === 'OPEN' ? claim.headline
        : sentenceStart(fillCopy(pickFreshCopy(`claim-resolution:${claim.id}:${claim.status}`, RESOLUTION_HEADLINES[claim.status], recentLines), { subject, source: sourceName }))
);
const resolutionText = (claim: IndustryMediaClaim): string => {
    if (claim.status === 'OPEN') return claim.resolution?.explanation || '';
    const lead = pickCopy(`claim-resolution-lead:${claim.id}:${claim.status}`, RESOLUTION_LEADS[claim.status]);
    const detail = claim.status === 'EXPIRED_UNVERIFIED'
        ? pickCopy(`claim-resolution-detail:${claim.id}`, EXPIRED_LINES)
        : claim.resolution?.explanation || 'Later confirmed evidence has resolved this report.';
    return `${lead} ${detail}`;
};

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

/* the source's own post does not open with their own name ("Mara Voss: …", "Mara Voss calls it: …") */
const ownHeadline = (headline: string, authorName: string): string => (
    headline.startsWith(`${authorName} calls it: `) ? `Calling it: ${headline.slice(authorName.length + 11)}`
        : headline.startsWith(`${authorName}: `) ? sentenceStart(headline.slice(authorName.length + 2))
            : headline
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
    content: `${ownHeadline(claim.headline, personality?.name || institution.name)}\n\n${claim.summary}`,
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
    subject = claim.subjectName,
    headline = resolutionHeadline(claim, subject, personality?.name || institution.name),
): XPost => ({
    id: `x_claim_resolution_${claim.id}_${claim.status}`,
    authorId: personality?.id || institution.id,
    authorName: personality?.name || institution.name,
    authorHandle: personality?.handle || institution.handles.X || `@${institution.id}`,
    authorAvatar: avatarFor(institution, personality),
    content: `${headline}\n\n${resolutionText(claim)}`,
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
    subject = claim.subjectName,
    headline = resolution ? resolutionHeadline(claim, subject, personality?.name || institution.name) : claim.headline,
): NewsItem => ({
    id: resolution ? `news_claim_resolution_${claim.id}_${claim.status}` : `news_claim_${claim.id}`,
    headline,
    subtext: resolution ? resolutionText(claim) : `${claim.summary} ${claim.knownEvidence}`,
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

/** News written before 2026-11-09 kept project ids as names ("Studio Ai Project 1cug4ph") and one fixed resolution
    line ("UNVERIFIED: …"). Shown, not saved: those resolution items read like new ones, and other claim items show the
    film's real title. Items written after the fix pass through unchanged. */
export const refreshIndustryClaimNews = (player: Player, items: NewsItem[]): NewsItem[] => {
    const media = player.world?.industryMedia;
    if (!media?.claims?.length || !items.some(item => item.mediaClaimId)) return items;
    const byId = new Map(media.claims.map(claim => [claim.id, claim]));
    let names: IndustryMediaClaimNames | undefined;
    return items.map(item => {
        const claim = item.mediaClaimId ? byId.get(item.mediaClaimId) : undefined;
        if (!claim) return item;
        names = names || createIndustryMediaClaimNames(player);
        const subject = claimSubject(claim, names);
        if (claim.status !== 'OPEN' && item.id.startsWith('news_claim_resolution_')
            && /^(CONFIRMED|PARTLY CONFIRMED|REFUTED|UNVERIFIED|OVERTAKEN BY EVENTS): /.test(item.headline)) {
            const institution = media.institutions?.find(entry => entry.id === claim.institutionId);
            const personality = claim.personalityId ? media.personalities?.find(entry => entry.id === claim.personalityId) : undefined;
            return {
                ...item,
                headline: resolutionHeadline(claim, subject, personality?.name || institution?.name || item.sourceName || 'The trades'),
                subtext: resolutionText(claim),
            };
        }
        if (subject === claim.subjectName) return item;
        const swap = (text: string) => text.split(claim.subjectName).join(subject);
        return { ...item, headline: swap(item.headline), ...(item.subtext ? { subtext: swap(item.subtext) } : {}) };
    });
};

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
    const names = createIndustryMediaClaimNames(player);
    const recentHeadlines = (player.news || []).slice(0, 40).map(item => item.headline);
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
        const subject = claimSubject(claim, names);
        const headline = beat.resolution
            ? resolutionHeadline(claim, subject, source.personality?.name || source.institution.name, recentHeadlines)
            : claim.headline;
        recentHeadlines.unshift(headline);
        let xPost = beat.resolution
            ? resolutionX(claim, absoluteWeek, source.institution, source.personality, subject, headline)
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
            news.push(claimNews(player, claim, source.institution, source.personality, absoluteWeek, beat.resolution, subject, headline));
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
