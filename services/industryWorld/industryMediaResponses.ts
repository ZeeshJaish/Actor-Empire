import type {
    IndustryEventFact,
    IndustryMediaDiscussion,
    IndustryMediaPlayerResponse,
    IndustryMediaResponseFormat,
    IndustryMediaResponseSpeaker,
    IndustryMediaResponseTone,
    IndustryMediaStory,
    NewsItem,
    Player,
    TeamMember,
    XPost,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';
import { getIndustryMediaCoverageSubjectKey } from './industryMediaCoverage';
import { applyPublicistMediaBatch } from './industryMediaPublicist';

export type IndustryMediaResponseIneligibility =
    | 'NO_DISCUSSION'
    | 'NOT_PLAYER_RELATED'
    | 'WINDOW_CLOSED'
    | 'ALREADY_RESPONDED'
    | 'MISSING_CANONICAL_LINEAGE'
    | 'FORMAT_NOT_AVAILABLE'
    | 'SPEAKER_NOT_AVAILABLE';

export interface IndustryMediaResponseOpportunity {
    isEligible: boolean;
    reason?: IndustryMediaResponseIneligibility;
    discussion?: IndustryMediaDiscussion;
    story?: IndustryMediaStory;
    event?: IndustryEventFact;
    allowedFormats: IndustryMediaResponseFormat[];
    allowedSpeakers: IndustryMediaResponseSpeaker[];
    closesAbsoluteWeek?: number;
    existingResponse?: IndustryMediaPlayerResponse;
}

const findContext = (player: Player, sourcePost: XPost) => {
    const media = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const discussion = media.discussions.find(item => (
        item.id === sourcePost.mediaDiscussionId || item.sourcePostId === sourcePost.id
    ));
    const story = discussion ? media.stories.find(item => item.id === discussion.mediaStoryId) : undefined;
    const eventLedger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const event = discussion ? eventLedger.events.find(item => item.id === discussion.industryEventId) : undefined;
    const existingResponse = discussion
        ? media.playerResponses.find(item => item.discussionId === discussion.id || (
            discussion.mediaClaimId
                ? item.mediaClaimId === discussion.mediaClaimId
                : !item.mediaClaimId && item.industryEventId === discussion.industryEventId
        ))
        : undefined;
    return { media, discussion, story, event, existingResponse };
};

export const getIndustryMediaResponseOpportunity = (
    player: Player,
    sourcePost: XPost,
    absoluteWeek: number,
): IndustryMediaResponseOpportunity => {
    const { discussion, story, event, existingResponse } = findContext(player, sourcePost);
    if (!discussion) return { isEligible: false, reason: 'NO_DISCUSSION', allowedFormats: [], allowedSpeakers: [] };
    if (!story || !event || sourcePost.industryEventId !== event.id || sourcePost.mediaStoryId !== story.id) {
        return { isEligible: false, reason: 'MISSING_CANONICAL_LINEAGE', discussion, allowedFormats: [], allowedSpeakers: [] };
    }
    const allowedFormats: IndustryMediaResponseFormat[] = [
        'REPLY',
        'QUOTE',
        ...(event.importance === 'HIGH' ? ['STATEMENT' as const] : []),
    ];
    const allowedSpeakers: IndustryMediaResponseSpeaker[] = [
        'PERSONAL',
        ...((story.companyId || story.companyName || story.projectId) ? ['STUDIO' as const] : []),
    ];
    const base = { discussion, story, event, allowedFormats, allowedSpeakers, closesAbsoluteWeek: discussion.responseClosesAbsoluteWeek };
    if (!discussion.isPlayerRelated) return { ...base, isEligible: false, reason: 'NOT_PLAYER_RELATED' };
    if (existingResponse || discussion.playerResponseId) {
        return { ...base, isEligible: false, reason: 'ALREADY_RESPONDED', existingResponse };
    }
    if (absoluteWeek > discussion.responseClosesAbsoluteWeek) return { ...base, isEligible: false, reason: 'WINDOW_CLOSED' };
    return { ...base, isEligible: true };
};

const responseTail = (tone: IndustryMediaResponseTone): string => ({
    CLARIFY: 'That is the confirmed position, and we will let the work speak for itself.',
    ACKNOWLEDGE: 'The questions are fair. We understand the responsibility that comes with this move.',
    DEFEND: 'We stand behind the decision and the team doing the work.',
    CHALLENGE: 'The conclusion being drawn goes beyond what the confirmed facts show.',
    HUMOUR: 'Apparently one announcement is enough to keep the timeline busy.',
    APPRECIATION: 'We appreciate everyone giving the work a fair chance.',
}[tone]);

const responseContent = (
    event: IndustryEventFact,
    tone: IndustryMediaResponseTone,
    format: IndustryMediaResponseFormat,
): string => {
    const core = `${event.headline}. ${responseTail(tone)}`;
    return format === 'STATEMENT' ? `Official statement: ${core}` : core;
};

export const getIndustryMediaResponseDraft = (
    player: Player,
    sourcePost: XPost,
    tone: IndustryMediaResponseTone,
    format: IndustryMediaResponseFormat,
    absoluteWeek: number,
): string => {
    const opportunity = getIndustryMediaResponseOpportunity(player, sourcePost, absoluteWeek);
    if (!opportunity.event || !opportunity.allowedFormats.includes(format)) return '';
    return responseContent(opportunity.event, tone, format);
};

const publicistStrength = (publicist: TeamMember | null): number => ({
    ROOKIE: 1,
    STANDARD: 2,
    ELITE: 3,
    LEGEND: 4,
}[publicist?.tier || 'ROOKIE'] - (publicist ? 0 : 1));

export interface IndustryMediaResponseAdvice {
    publicistName?: string;
    recommendedTone: IndustryMediaResponseTone;
    recommendedFormat: IndustryMediaResponseFormat;
    summary: string;
    confidence: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export const getIndustryMediaResponseAdvice = (
    player: Player,
    sourcePost: XPost,
    absoluteWeek: number,
): IndustryMediaResponseAdvice => {
    const opportunity = getIndustryMediaResponseOpportunity(player, sourcePost, absoluteWeek);
    const heat = opportunity.discussion?.heat || 0;
    const recommendedTone: IndustryMediaResponseTone = heat >= 65
        ? 'CLARIFY'
        : opportunity.event?.importance === 'HIGH' ? 'ACKNOWLEDGE' : 'APPRECIATION';
    const recommendedFormat: IndustryMediaResponseFormat = opportunity.allowedFormats.includes('STATEMENT') && heat >= 75
        ? 'STATEMENT'
        : heat >= 45 ? 'QUOTE' : 'REPLY';
    const publicist = player.team?.publicist || null;
    const strength = publicistStrength(publicist);
    return {
        ...(publicist ? { publicistName: publicist.name } : {}),
        recommendedTone,
        recommendedFormat,
        summary: publicist
            ? `${publicist.name} recommends ${recommendedTone.toLowerCase()} as a ${recommendedFormat.toLowerCase()}. The reaction can still vary.`
            : 'No publicist recommendation. You can respond, or leave the discussion alone without a penalty.',
        confidence: strength >= 4 ? 'HIGH' : strength >= 3 ? 'MEDIUM' : strength >= 1 ? 'LOW' : 'NONE',
    };
};

export interface SubmitIndustryMediaResponseInput {
    player: Player;
    sourcePost: XPost;
    tone: IndustryMediaResponseTone;
    format: IndustryMediaResponseFormat;
    speaker: IndustryMediaResponseSpeaker;
    absoluteWeek: number;
}

export interface SubmitIndustryMediaResponseResult {
    player: Player;
    accepted: boolean;
    reason?: IndustryMediaResponseIneligibility;
    response?: IndustryMediaPlayerResponse;
    publishedPost?: XPost;
}

const prependUnique = <T extends { id: string }>(item: T, items: T[], limit: number): T[] => [
    item,
    ...items.filter(existing => existing.id !== item.id),
].slice(0, limit);

export const submitIndustryMediaResponse = (
    input: SubmitIndustryMediaResponseInput,
): SubmitIndustryMediaResponseResult => {
    const opportunity = getIndustryMediaResponseOpportunity(input.player, input.sourcePost, input.absoluteWeek);
    if (!opportunity.isEligible || !opportunity.discussion || !opportunity.story || !opportunity.event) {
        return { player: input.player, accepted: false, reason: opportunity.reason || 'MISSING_CANONICAL_LINEAGE' };
    }
    if (!opportunity.allowedFormats.includes(input.format)) {
        return { player: input.player, accepted: false, reason: 'FORMAT_NOT_AVAILABLE' };
    }
    if (!opportunity.allowedSpeakers.includes(input.speaker)) {
        return { player: input.player, accepted: false, reason: 'SPEAKER_NOT_AVAILABLE' };
    }
    const { media, discussion, story, event } = {
        media: normalizeIndustryMediaWorld(input.player.world.industryMedia),
        discussion: opportunity.discussion,
        story: opportunity.story,
        event: opportunity.event,
    };
    const responseId = discussion.mediaClaimId
        ? `media_response_claim_${discussion.mediaClaimId}`
        : `media_response_${event.id}`;
    const publishedPostId = `x_${responseId}`;
    const content = responseContent(event, input.tone, input.format);
    const response: IndustryMediaPlayerResponse = {
        schemaVersion: 1,
        id: responseId,
        discussionId: discussion.id,
        industryEventId: event.id,
        mediaStoryId: story.id,
        sourcePostId: input.sourcePost.id,
        publishedPostId,
        tone: input.tone,
        format: input.format,
        speaker: input.speaker,
        content,
        submittedAbsoluteWeek: input.absoluteWeek,
        resolvesAbsoluteWeek: input.absoluteWeek + 1,
        status: 'PENDING',
        ...(discussion.mediaClaimId ? { mediaClaimId: discussion.mediaClaimId } : {}),
    };
    const rng = createDeterministicRng(`c3-response-post:${responseId}:${input.tone}:${input.format}`);
    const sourceReach = Math.max(100, input.sourcePost.likes + input.sourcePost.retweets * 2 + input.sourcePost.replies * 3);
    const likes = Math.max(1, Math.round(sourceReach * (0.06 + rng() * 0.05)));
    const authorName = input.speaker === 'STUDIO'
        ? story.companyName || input.player.businesses.find(item => item.type === 'PRODUCTION_HOUSE')?.name || input.player.name
        : input.player.name;
    const publishedPost: XPost = {
        id: publishedPostId,
        authorId: 'PLAYER',
        authorName,
        authorHandle: input.player.x.handle,
        authorAvatar: input.player.avatar.startsWith('data:') ? '' : input.player.avatar,
        content,
        timestamp: input.player.currentWeek,
        publishedAbsoluteWeek: input.absoluteWeek,
        likes,
        retweets: Math.round(likes * (input.format === 'STATEMENT' ? 0.3 : input.format === 'QUOTE' ? 0.24 : 0.12)),
        replies: Math.round(likes * (input.tone === 'CHALLENGE' ? 0.32 : 0.14)),
        isPlayer: true,
        isLiked: false,
        isRetweeted: false,
        isVerified: input.player.stats.fame > 50,
        postType: input.format === 'STATEMENT' || input.tone === 'CLARIFY' || input.tone === 'ACKNOWLEDGE'
            ? 'PR_STATEMENT'
            : input.tone === 'CHALLENGE' ? 'DRAMA_REPLY' : input.tone === 'HUMOUR' ? 'JOKE' : 'GENERAL',
        sentiment: input.tone === 'CHALLENGE' ? 'MESSY' : input.tone === 'APPRECIATION' ? 'SUPPORTIVE' : 'INDUSTRY',
        controversyScore: 0,
        industryEventId: event.id,
        mediaStoryId: story.id,
        mediaDiscussionId: discussion.id,
        mediaResponseId: response.id,
        ...(discussion.mediaClaimId ? { mediaClaimId: discussion.mediaClaimId } : {}),
        ...(event.companyId ? { companyId: event.companyId } : {}),
        ...(event.projectId ? { projectId: event.projectId } : {}),
        ...(input.format === 'REPLY' ? { replyToId: input.sourcePost.id } : {}),
        ...(input.format === 'QUOTE' ? { quoteOfId: input.sourcePost.id } : {}),
    };
    const playerTurn = {
        schemaVersion: 1 as const,
        id: `${discussion.id}_player`,
        discussionId: discussion.id,
        kind: 'PLAYER' as const,
        industryEventId: event.id,
        mediaStoryId: story.id,
        absoluteWeek: input.absoluteWeek,
        content,
        claimMode: 'OPINION' as const,
        responseId: response.id,
        parentTurnId: discussion.turns[0]?.id,
    };
    const nextMedia = normalizeIndustryMediaWorld({
        ...media,
        discussions: media.discussions.map(item => item.id === discussion.id ? {
            ...item,
            status: 'RESPONDED',
            lastActivityAbsoluteWeek: input.absoluteWeek,
            playerResponseId: response.id,
            turns: [...item.turns, playerTurn],
        } : item),
        playerResponses: [...media.playerResponses, response],
        claims: discussion.mediaClaimId ? media.claims.map(claim => claim.id === discussion.mediaClaimId ? {
            ...claim,
            responseId: response.id,
        } : claim) : media.claims,
    });
    const nextPlayer: Player = {
        ...input.player,
        world: { ...input.player.world, industryMedia: nextMedia },
        x: {
            ...input.player.x,
            posts: prependUnique(publishedPost, input.player.x.posts || [], 80),
            feed: prependUnique(publishedPost, input.player.x.feed || [], 80),
        },
        logs: [{
            week: input.player.currentWeek,
            year: input.player.age,
            message: `${authorName} responded to ${input.sourcePost.authorName}'s public discussion.`,
            type: 'neutral' as const,
        }, ...(input.player.logs || [])].slice(0, 50),
    };
    return { player: nextPlayer, accepted: true, response, publishedPost };
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const outcomeFor = (
    player: Player,
    response: IndustryMediaPlayerResponse,
    discussion: IndustryMediaDiscussion,
    event: IndustryEventFact,
    sourcePost?: XPost,
): { outcome: NonNullable<IndustryMediaPlayerResponse['outcome']>; effects: NonNullable<IndustryMediaPlayerResponse['effects']> } => {
    const media = normalizeIndustryMediaWorld(player.world.industryMedia);
    const sourcePersonalityId = discussion.turns.find(turn => turn.kind === 'SOURCE')?.mediaPersonalityId;
    const personality = media.personalities.find(item => item.id === sourcePersonalityId);
    const institution = media.institutions.find(item => item.id === personality?.institutionId);
    const toneFit = ({
        CLARIFY: 10,
        ACKNOWLEDGE: discussion.heat >= 55 ? 11 : 7,
        DEFEND: 4,
        CHALLENGE: (institution?.credibility || 50) >= 70 ? -8 : 4,
        HUMOUR: discussion.heat >= 75 ? -5 : 5,
        APPRECIATION: 6,
    } as Record<IndustryMediaResponseTone, number>)[response.tone];
    const formatFit = response.format === 'STATEMENT'
        ? (event.importance === 'HIGH' ? 7 : -5)
        : response.format === 'QUOTE' ? 3 : 1;
    const playerSignal = (player.stats.reputation - 50) / 6 - (player.instagram.controversy || 0) / 18;
    const sourcePressure = ((institution?.credibility || 50) - 50) / 12 + ((personality?.aggression || 50) - 50) / 18;
    const timing = Math.max(0, 2 - (response.submittedAbsoluteWeek - discussion.openedAbsoluteWeek)) * 2;
    const rng = createDeterministicRng(`c3-response-outcome:${response.id}:${response.tone}:${response.format}`);
    const score = toneFit + formatFit + playerSignal + timing - sourcePressure + (rng() * 20 - 10);
    const outcome: NonNullable<IndustryMediaPlayerResponse['outcome']> = score >= 18
        ? 'LANDED'
        : score >= 5 ? 'MIXED' : score <= -8 ? 'BACKFIRED' : 'IGNORED';
    const baseReach = clamp(Math.round(
        Math.max(25, player.x.followers * 0.002 + (sourcePost?.likes || 0) * 0.35 + (sourcePost?.retweets || 0) * 0.6),
    ), 25, 250_000);
    const base = ({
        LANDED: { reputation: 2, controversy: -2, followers: baseReach, mediaStance: 4, discussionHeat: -12 },
        MIXED: { reputation: 0, controversy: 0, followers: Math.round(baseReach * 0.35), mediaStance: 1, discussionHeat: -3 },
        BACKFIRED: { reputation: -2, controversy: 7, followers: -Math.round(baseReach * 0.2), mediaStance: -4, discussionHeat: 18 },
        IGNORED: { reputation: 0, controversy: 0, followers: 0, mediaStance: 0, discussionHeat: -4 },
    } as const)[outcome];
    const toneControversy = ({
        CLARIFY: -2,
        ACKNOWLEDGE: -1,
        DEFEND: 1,
        CHALLENGE: 3,
        HUMOUR: 1,
        APPRECIATION: -1,
    } as Record<IndustryMediaResponseTone, number>)[response.tone];
    return {
        outcome,
        effects: {
            reputation: clamp(base.reputation, -3, 3),
            controversy: clamp(base.controversy + toneControversy, -8, 10),
            followers: clamp(base.followers, -250_000, 500_000),
            mediaStance: clamp(base.mediaStance, -6, 6),
            discussionHeat: clamp(base.discussionHeat + (response.tone === 'CHALLENGE' ? 5 : 0), -25, 30),
        },
    };
};

const reactionContent = (outcome: NonNullable<IndustryMediaPlayerResponse['outcome']>): string => ({
    LANDED: 'The response addressed the discussion directly, and the public reaction is broadly favourable.',
    MIXED: 'The response answered part of the debate, but opinion remains divided.',
    BACKFIRED: 'The response intensified the debate and drew more criticism than reassurance.',
    IGNORED: 'The response passed without materially changing the public conversation.',
}[outcome]);

export interface ResolveIndustryMediaResponsesResult {
    player: Player;
    news: NewsItem[];
    resolvedResponseIds: string[];
}

export const resolveIndustryMediaResponses = (
    player: Player,
    absoluteWeek: number,
): ResolveIndustryMediaResponsesResult => {
    let media = normalizeIndustryMediaWorld(player.world.industryMedia);
    const eventLedger = normalizeIndustryEventLedger(player.world.industryEvents);
    const processed = new Set(media.processedResponseKeys);
    const due = media.playerResponses.filter(response => (
        response.status === 'PENDING'
        && response.resolvesAbsoluteWeek <= absoluteWeek
        && !processed.has(`resolved:${response.id}`)
    ));
    if (!due.length) return { player, news: [], resolvedResponseIds: [] };

    const rawByResponseId = new Map<string, ReturnType<typeof outcomeFor>>();
    const prInputs = due.flatMap(response => {
        const discussion = media.discussions.find(item => item.id === response.discussionId);
        const event = eventLedger.events.find(item => item.id === response.industryEventId);
        if (!discussion || !event || !media.stories.some(item => item.id === response.mediaStoryId)) return [];
        const sourcePost = player.x.feed.find(item => item.id === response.sourcePostId);
        const raw = outcomeFor(player, response, discussion, event, sourcePost);
        rawByResponseId.set(response.id, raw);
        return [{
            key: `response:${response.id}`,
            absoluteWeek,
            importance: event.importance,
            sourceId: response.id,
            outcomeLabel: raw.outcome,
            projectId: event.projectId,
            rawEffects: {
                ...raw.effects,
                projectBuzz: 0,
                relationshipTension: raw.effects.mediaStance < 0 ? Math.abs(raw.effects.mediaStance) : -raw.effects.mediaStance,
                narrativeMomentum: raw.effects.reputation,
            },
        }];
    });
    const prBatch = applyPublicistMediaBatch(player, prInputs);
    const prByResponseId = new Map(prBatch.results.map(result => [result.key.replace(/^response:/, ''), result]));
    media = normalizeIndustryMediaWorld(prBatch.player.world.industryMedia);

    let reputationDelta = 0;
    let controversyDelta = 0;
    let followerDelta = 0;
    const news: NewsItem[] = [];
    const resolvedResponseIds: string[] = [];
    const resolvedById = new Map<string, IndustryMediaPlayerResponse>();
    for (const response of due) {
        const discussion = media.discussions.find(item => item.id === response.discussionId);
        const story = media.stories.find(item => item.id === response.mediaStoryId);
        const event = eventLedger.events.find(item => item.id === response.industryEventId);
        if (!discussion || !story || !event) continue;
        const raw = rawByResponseId.get(response.id);
        if (!raw) continue;
        const applied = prByResponseId.get(response.id)?.appliedEffects;
        const result = {
            outcome: raw.outcome,
            effects: {
                reputation: applied?.reputation ?? raw.effects.reputation,
                controversy: applied?.controversy ?? raw.effects.controversy,
                followers: applied?.followers ?? raw.effects.followers,
                mediaStance: applied?.mediaStance ?? raw.effects.mediaStance,
                discussionHeat: applied?.discussionHeat ?? raw.effects.discussionHeat,
            },
        };
        const resolvedResponse: IndustryMediaPlayerResponse = {
            ...response,
            status: 'RESOLVED',
            outcome: result.outcome,
            effects: result.effects,
            resolvedAbsoluteWeek: absoluteWeek,
        };
        resolvedById.set(response.id, resolvedResponse);
        processed.add(`resolved:${response.id}`);
        resolvedResponseIds.push(response.id);
        reputationDelta += result.effects.reputation;
        controversyDelta += result.effects.controversy;
        followerDelta += result.effects.followers;

        const sourcePersonalityId = discussion.turns.find(turn => turn.kind === 'SOURCE')?.mediaPersonalityId;
        const personality = media.personalities.find(item => item.id === sourcePersonalityId);
        const subjectKey = getIndustryMediaCoverageSubjectKey(story, player);
        if (personality) {
            const stanceId = `${personality.id}:${subjectKey}`;
            const current = media.subjectStances.find(item => item.id === stanceId);
            const affinity = clamp(
                (current?.affinity ?? personality.baselinePlayerAffinity) + result.effects.mediaStance,
                personality.stanceFloor,
                personality.stanceCeiling,
            );
            media = {
                ...media,
                subjectStances: [
                    ...media.subjectStances.filter(item => item.id !== stanceId),
                    {
                        id: stanceId,
                        personalityId: personality.id,
                        subjectKey,
                        affinity,
                        lastUpdatedAbsoluteWeek: absoluteWeek,
                        lastIndustryEventId: event.id,
                    },
                ],
            };
        }
        const reactionTurn = {
            schemaVersion: 1 as const,
            id: `${discussion.id}_reaction_${response.id}`,
            discussionId: discussion.id,
            kind: 'REACTION' as const,
            industryEventId: event.id,
            mediaStoryId: story.id,
            absoluteWeek,
            content: reactionContent(result.outcome),
            claimMode: 'OPINION' as const,
            ...(personality?.institutionId ? { mediaInstitutionId: personality.institutionId } : {}),
            ...(personality ? { mediaPersonalityId: personality.id } : {}),
            responseId: response.id,
            parentTurnId: `${discussion.id}_player`,
        };
        media = {
            ...media,
            discussions: media.discussions.map(item => item.id === discussion.id ? {
                ...item,
                status: 'RESOLVED',
                lastActivityAbsoluteWeek: absoluteWeek,
                heat: clamp(item.heat + result.effects.discussionHeat, 0, 100),
                turns: [...item.turns, reactionTurn],
            } : item),
        };
        if (response.format === 'STATEMENT' && event.importance === 'HIGH') {
            const institution = media.institutions.find(item => item.id === personality?.institutionId);
            news.push({
                id: `news_${response.id}`,
                headline: `${story.companyName || player.name} issues a public statement`,
                subtext: `${event.headline}. The public response was ${result.outcome.toLowerCase()}.`,
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM',
                industryEventId: event.id,
                mediaStoryId: story.id,
                mediaDiscussionId: discussion.id,
                mediaResponseId: response.id,
                ...(response.mediaClaimId ? { mediaClaimId: response.mediaClaimId } : {}),
                ...(institution ? { mediaInstitutionId: institution.id, sourceName: institution.name } : {}),
                ...(personality ? { mediaPersonalityId: personality.id, byline: personality.name } : {}),
                ...(event.companyId ? { companyId: event.companyId } : {}),
                ...(event.projectId ? { projectId: event.projectId } : {}),
            });
        }
    }
    if (!resolvedResponseIds.length) return { player, news: [], resolvedResponseIds: [] };
    media = normalizeIndustryMediaWorld({
        ...media,
        playerResponses: media.playerResponses.map(item => resolvedById.get(item.id) || item),
        processedResponseKeys: [...processed],
    });
    const nextPlayer: Player = {
        ...player,
        stats: { ...player.stats, reputation: clamp(player.stats.reputation + reputationDelta, 0, 100) },
        instagram: {
            ...player.instagram,
            controversy: clamp((player.instagram.controversy || 0) + controversyDelta, 0, 100),
        },
        x: { ...player.x, followers: Math.max(0, player.x.followers + followerDelta) },
        news: [...news, ...(player.news || []).filter(item => !news.some(created => created.id === item.id))].slice(0, 50),
        world: { ...player.world, industryMedia: media },
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: `${resolvedResponseIds.length} public response${resolvedResponseIds.length === 1 ? '' : 's'} resolved.`,
            type: (controversyDelta > 0 ? 'negative' : reputationDelta > 0 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
        }, ...(player.logs || [])].slice(0, 50),
    };
    return { player: nextPlayer, news, resolvedResponseIds };
};
