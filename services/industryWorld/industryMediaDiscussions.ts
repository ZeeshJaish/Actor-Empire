import type {
    IndustryEventFact,
    IndustryMediaClaimMode,
    IndustryMediaDiscussion,
    IndustryMediaDiscussionTurn,
    IndustryMediaPlayerResponse,
    IndustryMediaStory,
    IndustryMediaWorldState,
    Player,
    XPost,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';

export const INDUSTRY_MEDIA_DISCUSSION_LIMIT = 120;
export const INDUSTRY_MEDIA_DISCUSSION_TURN_LIMIT = 8;
export const INDUSTRY_MEDIA_RESPONSE_LIMIT = 120;
export const INDUSTRY_MEDIA_DISCUSSION_KEY_LIMIT = 240;
export const INDUSTRY_MEDIA_RESPONSE_KEY_LIMIT = 240;

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown): string | undefined => cleanText(value) || undefined;
const safeWeek = (value: unknown, fallback = -1): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : fallback;
};
const boundedNumber = (value: unknown, min: number, max: number, fallback = 0): number => {
    const numeric = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
};
const uniqueText = (value: unknown, limit: number): string[] => Array.isArray(value)
    ? [...new Set(value.map(cleanText).filter(Boolean))].slice(-limit)
    : [];

const TURN_KINDS = new Set(['SOURCE', 'MEDIA', 'PLAYER', 'REACTION']);
const CLAIM_MODES = new Set<IndustryMediaClaimMode>(['FACT', 'ANALYSIS', 'OPINION', 'SPECULATION']);
const DISCUSSION_STATUSES = new Set(['OPEN', 'RESPONDED', 'RESOLVED', 'CLOSED']);
const RESPONSE_TONES = new Set(['CLARIFY', 'ACKNOWLEDGE', 'DEFEND', 'CHALLENGE', 'HUMOUR', 'APPRECIATION']);
const RESPONSE_FORMATS = new Set(['REPLY', 'QUOTE', 'STATEMENT']);
const RESPONSE_SPEAKERS = new Set(['PERSONAL', 'STUDIO']);
const RESPONSE_STATUSES = new Set(['PENDING', 'RESOLVED']);
const RESPONSE_OUTCOMES = new Set(['LANDED', 'MIXED', 'BACKFIRED', 'IGNORED']);

const normalizeTurn = (
    value: unknown,
    discussionId: string,
    eventId: string,
    storyId: string,
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): IndustryMediaDiscussionTurn | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaDiscussionTurn>;
    const id = cleanText(source.id);
    const kind = source.kind;
    const content = cleanText(source.content);
    const claimMode = source.claimMode;
    const absoluteWeek = safeWeek(source.absoluteWeek);
    if (!id || !kind || !TURN_KINDS.has(kind) || !content || !claimMode || !CLAIM_MODES.has(claimMode) || absoluteWeek < 0) return null;
    const mediaInstitutionId = optionalText(source.mediaInstitutionId);
    const mediaPersonalityId = optionalText(source.mediaPersonalityId);
    if (mediaInstitutionId && !institutionIds.has(mediaInstitutionId)) return null;
    if (mediaPersonalityId && !personalityIds.has(mediaPersonalityId)) return null;
    return {
        schemaVersion: 1,
        id,
        discussionId,
        kind,
        industryEventId: eventId,
        mediaStoryId: storyId,
        absoluteWeek,
        content,
        claimMode,
        ...(mediaInstitutionId ? { mediaInstitutionId } : {}),
        ...(mediaPersonalityId ? { mediaPersonalityId } : {}),
        ...(optionalText(source.responseId) ? { responseId: optionalText(source.responseId) } : {}),
        ...(optionalText(source.parentTurnId) ? { parentTurnId: optionalText(source.parentTurnId) } : {}),
    };
};

const normalizeDiscussion = (
    value: unknown,
    storyById: Map<string, IndustryMediaStory>,
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): IndustryMediaDiscussion | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaDiscussion>;
    const id = cleanText(source.id);
    const eventId = cleanText(source.industryEventId);
    const storyId = cleanText(source.mediaStoryId);
    const sourcePostId = cleanText(source.sourcePostId);
    const story = storyById.get(storyId);
    if (!id || !eventId || !sourcePostId || !story?.industryEventIds.includes(eventId)) return null;
    const openedAbsoluteWeek = safeWeek(source.openedAbsoluteWeek);
    const lastActivityAbsoluteWeek = safeWeek(source.lastActivityAbsoluteWeek);
    const responseClosesAbsoluteWeek = safeWeek(source.responseClosesAbsoluteWeek);
    if (openedAbsoluteWeek < 0 || lastActivityAbsoluteWeek < openedAbsoluteWeek || responseClosesAbsoluteWeek < openedAbsoluteWeek) return null;
    const status = source.status;
    if (!status || !DISCUSSION_STATUSES.has(status)) return null;
    const turnsById = new Map<string, IndustryMediaDiscussionTurn>();
    (Array.isArray(source.turns) ? source.turns : []).forEach(raw => {
        const turn = normalizeTurn(raw, id, eventId, storyId, institutionIds, personalityIds);
        if (turn && !turnsById.has(turn.id)) turnsById.set(turn.id, turn);
    });
    return {
        schemaVersion: 1,
        id,
        industryEventId: eventId,
        mediaStoryId: storyId,
        sourcePostId,
        openedAbsoluteWeek,
        lastActivityAbsoluteWeek,
        responseClosesAbsoluteWeek,
        status,
        isPlayerRelated: Boolean(source.isPlayerRelated),
        heat: Math.round(boundedNumber(source.heat, 0, 100)),
        turns: [...turnsById.values()]
            .sort((left, right) => left.absoluteWeek - right.absoluteWeek
                || ({ SOURCE: 0, MEDIA: 1, PLAYER: 2, REACTION: 3 }[left.kind]
                    - { SOURCE: 0, MEDIA: 1, PLAYER: 2, REACTION: 3 }[right.kind])
                || left.id.localeCompare(right.id))
            .slice(-INDUSTRY_MEDIA_DISCUSSION_TURN_LIMIT),
        ...(optionalText(source.mediaClaimId) ? { mediaClaimId: optionalText(source.mediaClaimId) } : {}),
        ...(optionalText(source.playerResponseId) ? { playerResponseId: optionalText(source.playerResponseId) } : {}),
    };
};

const normalizeResponse = (
    value: unknown,
    discussionById: Map<string, IndustryMediaDiscussion>,
): IndustryMediaPlayerResponse | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaPlayerResponse>;
    const id = cleanText(source.id);
    const discussionId = cleanText(source.discussionId);
    const discussion = discussionById.get(discussionId);
    const content = cleanText(source.content);
    const publishedPostId = cleanText(source.publishedPostId);
    const tone = source.tone;
    const format = source.format;
    const speaker = source.speaker;
    const status = source.status;
    const submittedAbsoluteWeek = safeWeek(source.submittedAbsoluteWeek);
    const resolvesAbsoluteWeek = safeWeek(source.resolvesAbsoluteWeek);
    if (
        !id || !discussion || !content || !publishedPostId
        || !tone || !RESPONSE_TONES.has(tone)
        || !format || !RESPONSE_FORMATS.has(format)
        || !speaker || !RESPONSE_SPEAKERS.has(speaker)
        || !status || !RESPONSE_STATUSES.has(status)
        || submittedAbsoluteWeek < 0 || resolvesAbsoluteWeek <= submittedAbsoluteWeek
    ) return null;
    const outcome = source.outcome && RESPONSE_OUTCOMES.has(source.outcome) ? source.outcome : undefined;
    const resolvedAbsoluteWeek = safeWeek(source.resolvedAbsoluteWeek);
    const effects = source.effects && typeof source.effects === 'object' ? {
        reputation: Math.round(boundedNumber(source.effects.reputation, -3, 3)),
        controversy: Math.round(boundedNumber(source.effects.controversy, -8, 10)),
        followers: Math.round(boundedNumber(source.effects.followers, -250_000, 500_000)),
        mediaStance: Math.round(boundedNumber(source.effects.mediaStance, -6, 6)),
        discussionHeat: Math.round(boundedNumber(source.effects.discussionHeat, -25, 30)),
    } : undefined;
    if (status === 'RESOLVED' && (!outcome || !effects || resolvedAbsoluteWeek < resolvesAbsoluteWeek)) return null;
    return {
        schemaVersion: 1,
        id,
        discussionId,
        industryEventId: discussion.industryEventId,
        mediaStoryId: discussion.mediaStoryId,
        sourcePostId: discussion.sourcePostId,
        publishedPostId,
        tone,
        format,
        speaker,
        content,
        submittedAbsoluteWeek,
        resolvesAbsoluteWeek,
        status,
        ...(discussion.mediaClaimId ? { mediaClaimId: discussion.mediaClaimId } : {}),
        ...(outcome ? { outcome } : {}),
        ...(effects ? { effects } : {}),
        ...(resolvedAbsoluteWeek >= 0 ? { resolvedAbsoluteWeek } : {}),
    };
};

export const normalizeIndustryMediaDiscussionCollections = (
    source: Partial<IndustryMediaWorldState>,
    stories: IndustryMediaStory[],
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): Pick<IndustryMediaWorldState, 'discussions' | 'playerResponses' | 'processedDiscussionKeys' | 'processedResponseKeys'> => {
    const storyById = new Map(stories.map(story => [story.id, story]));
    const byId = new Map<string, IndustryMediaDiscussion>();
    (Array.isArray(source.discussions) ? source.discussions : []).forEach(raw => {
        const discussion = normalizeDiscussion(raw, storyById, institutionIds, personalityIds);
        if (discussion && !byId.has(discussion.id)) byId.set(discussion.id, discussion);
    });
    const pendingDiscussionIds = new Set(
        (Array.isArray(source.playerResponses) ? source.playerResponses : [])
            .filter(response => response && typeof response === 'object' && (response as Partial<IndustryMediaPlayerResponse>).status === 'PENDING')
            .map(response => cleanText((response as Partial<IndustryMediaPlayerResponse>).discussionId))
            .filter(Boolean),
    );
    const discussions = [...byId.values()]
        .sort((left, right) => (
            Number(pendingDiscussionIds.has(right.id)) - Number(pendingDiscussionIds.has(left.id))
            || Number(right.status === 'RESPONDED') - Number(left.status === 'RESPONDED')
            || right.lastActivityAbsoluteWeek - left.lastActivityAbsoluteWeek
            || left.id.localeCompare(right.id)
        ))
        .slice(0, INDUSTRY_MEDIA_DISCUSSION_LIMIT)
        .sort((left, right) => left.openedAbsoluteWeek - right.openedAbsoluteWeek || left.id.localeCompare(right.id));
    const retainedDiscussionIds = new Set(discussions.map(item => item.id));
    const responseById = new Map<string, IndustryMediaPlayerResponse>();
    const claimedDiscussionIds = new Set<string>();
    const claimedEventIds = new Set<string>();
    const claimedClaimIds = new Set<string>();
    (Array.isArray(source.playerResponses) ? source.playerResponses : []).forEach(raw => {
        const response = normalizeResponse(raw, byId);
        if (
            response
            && retainedDiscussionIds.has(response.discussionId)
            && !responseById.has(response.id)
            && !claimedDiscussionIds.has(response.discussionId)
            && (response.mediaClaimId
                ? !claimedClaimIds.has(response.mediaClaimId)
                : !claimedEventIds.has(response.industryEventId))
        ) {
            responseById.set(response.id, response);
            claimedDiscussionIds.add(response.discussionId);
            claimedEventIds.add(response.industryEventId);
            if (response.mediaClaimId) claimedClaimIds.add(response.mediaClaimId);
        }
    });
    return {
        discussions,
        playerResponses: [...responseById.values()]
            .sort((left, right) => left.submittedAbsoluteWeek - right.submittedAbsoluteWeek || left.id.localeCompare(right.id))
            .slice(-INDUSTRY_MEDIA_RESPONSE_LIMIT),
        processedDiscussionKeys: uniqueText(source.processedDiscussionKeys, INDUSTRY_MEDIA_DISCUSSION_KEY_LIMIT),
        processedResponseKeys: uniqueText(source.processedResponseKeys, INDUSTRY_MEDIA_RESPONSE_KEY_LIMIT),
    };
};

const isPlayerRelated = (player: Player, story: IndustryMediaStory, event: IndustryEventFact): boolean => {
    const ownedCompanyIds = new Set([player.id, ...(player.businesses || []).map(item => item.id)]);
    if (event.companyId && ownedCompanyIds.has(event.companyId)) return true;
    if (story.companyId && ownedCompanyIds.has(story.companyId)) return true;
    const ownedProjectIds = new Set([
        ...(player.pastProjects || []).map(item => item.id),
        ...(player.world?.projects || []).filter(project => (
            ownedCompanyIds.has(String(project.studioId || ''))
        )).map(item => item.id),
    ]);
    return Boolean((event.projectId && ownedProjectIds.has(event.projectId)) || (story.projectId && ownedProjectIds.has(story.projectId)));
};

const discussionLine = (signatureRole?: 'ANTAGONIST' | 'SUPPORTER', optimism = 50): string => {
    if (signatureRole === 'ANTAGONIST') return 'The announcement is real. Execution is still the question.';
    if (signatureRole === 'SUPPORTER') return 'The ambition deserves credit. Delivery will decide the rest.';
    if (optimism >= 60) return 'There is reason for optimism, though the finished work still matters most.';
    if (optimism <= 40) return 'The facts are clear; the larger promise still has to be earned.';
    return 'The confirmed move matters. Its long-term meaning is still open to debate.';
};

export interface EnsureIndustryMediaDiscussionInput {
    state: IndustryMediaWorldState;
    story: IndustryMediaStory;
    event: IndustryEventFact;
    post: XPost;
    player: Player;
    absoluteWeek: number;
}

export interface EnsureIndustryMediaDiscussionResult {
    state: IndustryMediaWorldState;
    discussion: IndustryMediaDiscussion;
    post: XPost;
}

export const ensureIndustryMediaDiscussion = (
    input: EnsureIndustryMediaDiscussionInput,
): EnsureIndustryMediaDiscussionResult => {
    if (
        input.post.industryEventId !== input.event.id
        || input.post.mediaStoryId !== input.story.id
        || !input.story.industryEventIds.includes(input.event.id)
        || !input.post.mediaPersonalityId
    ) throw new Error('C3 discussion requires valid B7/C1/C2 X lineage.');
    const key = `discussion:${input.post.id}`;
    const existing = input.state.discussions.find(item => (
        item.sourcePostId === input.post.id
        || (input.post.mediaClaimId
            ? item.mediaClaimId === input.post.mediaClaimId
            : !item.mediaClaimId && item.industryEventId === input.event.id)
    ));
    if (existing) return {
        state: input.state,
        discussion: existing,
        post: { ...input.post, mediaDiscussionId: existing.id, publishedAbsoluteWeek: existing.openedAbsoluteWeek },
    };

    const sourcePersonality = input.state.personalities.find(item => item.id === input.post.mediaPersonalityId);
    if (!sourcePersonality) throw new Error('C3 discussion source personality is missing.');
    const discussionId = input.post.mediaClaimId
        ? `media_discussion_claim_${input.post.mediaClaimId}`
        : `media_discussion_${input.event.id}`;
    const sourceTurnId = `${discussionId}_source`;
    const sourceTurn: IndustryMediaDiscussionTurn = {
        schemaVersion: 1,
        id: sourceTurnId,
        discussionId,
        kind: 'SOURCE',
        industryEventId: input.event.id,
        mediaStoryId: input.story.id,
        absoluteWeek: input.absoluteWeek,
        content: input.post.content,
        claimMode: input.post.mediaClaimId ? 'SPECULATION' : 'OPINION',
        ...(input.post.mediaInstitutionId ? { mediaInstitutionId: input.post.mediaInstitutionId } : {}),
        mediaPersonalityId: sourcePersonality.id,
    };
    const candidates = input.state.personalities
        .filter(item => item.isActive && item.channels.includes('X') && item.id !== sourcePersonality.id)
        .map(item => ({
            item,
            score: createDeterministicRng(`c3-discussion:${input.event.id}:${item.id}`)(),
        }))
        .sort((left, right) => right.score - left.score || left.item.id.localeCompare(right.item.id))
        .slice(0, input.event.importance === 'HIGH' ? 3 : 2)
        .map(({ item }, index): IndustryMediaDiscussionTurn => ({
            schemaVersion: 1,
            id: `${discussionId}_media_${index + 1}`,
            discussionId,
            kind: 'MEDIA',
            industryEventId: input.event.id,
            mediaStoryId: input.story.id,
            absoluteWeek: input.absoluteWeek,
            content: discussionLine(item.signatureRole, item.optimism),
            claimMode: 'OPINION',
            ...(item.institutionId ? { mediaInstitutionId: item.institutionId } : {}),
            mediaPersonalityId: item.id,
            parentTurnId: sourceTurnId,
        }));
    const discussion: IndustryMediaDiscussion = {
        schemaVersion: 1,
        id: discussionId,
        industryEventId: input.event.id,
        mediaStoryId: input.story.id,
        sourcePostId: input.post.id,
        openedAbsoluteWeek: input.absoluteWeek,
        lastActivityAbsoluteWeek: input.absoluteWeek,
        responseClosesAbsoluteWeek: input.absoluteWeek + 2,
        status: 'OPEN',
        isPlayerRelated: isPlayerRelated(input.player, input.story, input.event),
        heat: Math.round(boundedNumber(18 + input.post.replies / 20 + input.post.retweets / 50, 10, 90)),
        turns: [sourceTurn, ...candidates].slice(0, INDUSTRY_MEDIA_DISCUSSION_TURN_LIMIT),
        ...(input.post.mediaClaimId ? { mediaClaimId: input.post.mediaClaimId } : {}),
    };
    const normalized = normalizeIndustryMediaDiscussionCollections(
        {
            ...input.state,
            discussions: [...input.state.discussions, discussion],
            processedDiscussionKeys: [...input.state.processedDiscussionKeys, key],
        },
        input.state.stories,
        new Set(input.state.institutions.map(item => item.id)),
        new Set(input.state.personalities.map(item => item.id)),
    );
    const nextDiscussion = normalized.discussions.find(item => item.id === discussionId) || discussion;
    return {
        state: { ...input.state, ...normalized },
        discussion: nextDiscussion,
        post: { ...input.post, mediaDiscussionId: discussionId, publishedAbsoluteWeek: input.absoluteWeek },
    };
};
