import type {
    IndustryEventType,
    IndustryMediaChannel,
    IndustryMediaClaim,
    IndustryMediaClaimCategory,
    IndustryMediaClaimConfidence,
    IndustryMediaClaimKind,
    IndustryMediaClaimStatus,
    IndustryMediaSourceRecord,
    IndustryMediaStory,
    IndustryMediaWorldState,
} from '../../types';

export const INDUSTRY_MEDIA_CLAIM_LIMIT = 192;
export const INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT = 640;
export const INDUSTRY_MEDIA_CLAIM_EVIDENCE_LIMIT = 12;
export const INDUSTRY_MEDIA_CLAIM_RESOLUTION_EVENT_LIMIT = 4;
export const INDUSTRY_MEDIA_SOURCE_RECENT_CLAIM_LIMIT = 16;
export const INDUSTRY_MEDIA_SOURCE_CATEGORY_LIMIT = 8;

const KINDS = new Set<IndustryMediaClaimKind>(['RUMOUR', 'LEAK', 'PREDICTION']);
const STATUSES = new Set<IndustryMediaClaimStatus>([
    'OPEN', 'CONFIRMED', 'PARTLY_CONFIRMED', 'REFUTED', 'EXPIRED_UNVERIFIED', 'SUPERSEDED',
]);
const CATEGORIES = new Set<IndustryMediaClaimCategory>([
    'CASTING', 'PROJECT_STATUS', 'PLATFORM_DESTINATION', 'RELEASE_WINDOW',
    'FRANCHISE_DIRECTION', 'AWARDS', 'COMPANY_MOVE', 'PROJECT_OUTCOME',
]);
const CONFIDENCE = new Set<IndustryMediaClaimConfidence>([
    'TENTATIVE', 'CREDIBLE_CHATTER', 'STRONG_SOURCING',
]);
const CHANNELS = new Set<IndustryMediaChannel>(['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE']);
const EVENT_TYPES = new Set<IndustryEventType>([
    'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_DISTRESS',
    'COMPANY_RECOVERED', 'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED', 'COMPANY_ACQUIRED',
    'COMPANY_CLOSED', 'PROJECT_GREENLIT', 'PROJECT_CAST', 'PROJECT_DELAYED',
    'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_SOLD', 'PROJECT_CANCELLED',
    'PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED', 'PROJECT_HIT', 'PROJECT_FLOP',
    'PROJECT_SLEEPER', 'RIGHTS_DEAL', 'RIGHTS_TRANSFER', 'FRANCHISE_DECISION',
    'AWARD_NOMINATED', 'AWARD_WON', 'PARTNERSHIP_REPEATED',
]);

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown): string | undefined => cleanText(value) || undefined;
const safeWeek = (value: unknown, fallback = -1): number => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
};
const whole = (value: unknown, fallback = 0): number => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : fallback;
};
const clamp = (value: unknown, minimum: number, maximum: number, fallback = minimum): number => (
    Math.max(minimum, Math.min(maximum, whole(value, fallback)))
);
const uniqueText = (value: unknown, limit: number): string[] => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(cleanText).filter(Boolean))].slice(-limit);
};

const normalizeTarget = (value: unknown): IndustryMediaClaim['target'] | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<IndustryMediaClaim['target']>;
    const expectedEventTypes = Array.isArray(raw.expectedEventTypes)
        ? [...new Set(raw.expectedEventTypes)].filter((item): item is IndustryEventType => EVENT_TYPES.has(item as IndustryEventType))
        : [];
    if (!expectedEventTypes.length) return null;
    const expectedAbsoluteWeek = safeWeek(raw.expectedAbsoluteWeek);
    const toleranceWeeks = clamp(raw.toleranceWeeks, 0, 52, 0);
    return {
        expectedEventTypes,
        ...(optionalText(raw.companyId) ? { companyId: optionalText(raw.companyId) } : {}),
        ...(optionalText(raw.projectId) ? { projectId: optionalText(raw.projectId) } : {}),
        ...(optionalText(raw.platformId) ? { platformId: optionalText(raw.platformId) } : {}),
        ...(optionalText(raw.rightsContractId) ? { rightsContractId: optionalText(raw.rightsContractId) } : {}),
        ...(optionalText(raw.universeId) ? { universeId: optionalText(raw.universeId) } : {}),
        ...(optionalText(raw.talentId) ? { talentId: optionalText(raw.talentId) } : {}),
        ...(optionalText(raw.awardEventId) ? { awardEventId: optionalText(raw.awardEventId) } : {}),
        ...(uniqueText(raw.expectedCountryIds, 24).length ? { expectedCountryIds: uniqueText(raw.expectedCountryIds, 24) } : {}),
        ...(expectedAbsoluteWeek >= 0 ? { expectedAbsoluteWeek } : {}),
        ...(toleranceWeeks > 0 ? { toleranceWeeks } : {}),
        ...(optionalText(raw.expectedOutcome) ? { expectedOutcome: optionalText(raw.expectedOutcome) } : {}),
    };
};

const normalizeClaim = (
    value: unknown,
    storyById: Map<string, IndustryMediaStory>,
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): IndustryMediaClaim | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<IndustryMediaClaim>;
    const id = cleanText(raw.id);
    const claimKey = cleanText(raw.claimKey);
    const anchorStoryId = cleanText(raw.anchorStoryId);
    const story = storyById.get(anchorStoryId);
    const anchorIndustryEventId = cleanText(raw.anchorIndustryEventId);
    const institutionId = cleanText(raw.institutionId);
    const personalityId = optionalText(raw.personalityId);
    const subjectKey = cleanText(raw.subjectKey);
    const subjectName = cleanText(raw.subjectName);
    const headline = cleanText(raw.headline);
    const summary = cleanText(raw.summary);
    const knownEvidence = cleanText(raw.knownEvidence);
    const target = normalizeTarget(raw.target);
    const createdAbsoluteWeek = safeWeek(raw.createdAbsoluteWeek);
    const earliestResolutionAbsoluteWeek = safeWeek(raw.earliestResolutionAbsoluteWeek);
    const expiryAbsoluteWeek = safeWeek(raw.expiryAbsoluteWeek);
    if (
        !id || !claimKey || !story || !anchorIndustryEventId
        || !story.industryEventIds.includes(anchorIndustryEventId)
        || !institutionIds.has(institutionId)
        || (personalityId && !personalityIds.has(personalityId))
        || !subjectKey || subjectKey !== story.subjectKey || !subjectName
        || !headline || !summary || !knownEvidence || !target
        || createdAbsoluteWeek < 0
        || earliestResolutionAbsoluteWeek <= createdAbsoluteWeek
        || expiryAbsoluteWeek < earliestResolutionAbsoluteWeek
    ) return null;

    const kind = KINDS.has(raw.kind as IndustryMediaClaimKind) ? raw.kind as IndustryMediaClaimKind : 'RUMOUR';
    const status = STATUSES.has(raw.status as IndustryMediaClaimStatus) ? raw.status as IndustryMediaClaimStatus : 'OPEN';
    const category = CATEGORIES.has(raw.category as IndustryMediaClaimCategory)
        ? raw.category as IndustryMediaClaimCategory
        : 'PROJECT_STATUS';
    const confidence = CONFIDENCE.has(raw.confidence as IndustryMediaClaimConfidence)
        ? raw.confidence as IndustryMediaClaimConfidence
        : 'TENTATIVE';
    const publicationChannel = CHANNELS.has(raw.publicationChannel as IndustryMediaChannel)
        ? raw.publicationChannel as IndustryMediaChannel
        : 'X';
    const evidenceEventIds = uniqueText(raw.evidenceEventIds, INDUSTRY_MEDIA_CLAIM_EVIDENCE_LIMIT);
    if (!evidenceEventIds.includes(anchorIndustryEventId)) evidenceEventIds.unshift(anchorIndustryEventId);
    const boundedEvidence = evidenceEventIds.slice(0, INDUSTRY_MEDIA_CLAIM_EVIDENCE_LIMIT);
    const lastEvaluatedAbsoluteWeek = Math.max(
        createdAbsoluteWeek,
        Math.min(expiryAbsoluteWeek, safeWeek(raw.lastEvaluatedAbsoluteWeek, createdAbsoluteWeek)),
    );
    const resolutionRaw = raw.resolution;
    const resolutionStatus = resolutionRaw?.status;
    const resolutionWeek = safeWeek(resolutionRaw?.absoluteWeek);
    const resolution = status !== 'OPEN'
        && resolutionRaw
        && resolutionStatus === status
        && resolutionWeek >= earliestResolutionAbsoluteWeek
        ? {
            status: resolutionStatus,
            absoluteWeek: resolutionWeek,
            eventIds: uniqueText(resolutionRaw.eventIds, INDUSTRY_MEDIA_CLAIM_RESOLUTION_EVENT_LIMIT),
            explanation: cleanText(resolutionRaw.explanation) || 'The claim was resolved by later industry evidence.',
            sourceReliabilityDelta: clamp(resolutionRaw.sourceReliabilityDelta, -8, 8, 0),
            ...(resolutionRaw.playerCredibilityApplied ? { playerCredibilityApplied: true } : {}),
        }
        : undefined;

    return {
        schemaVersion: 1,
        id,
        claimKey,
        kind,
        status: resolution ? status : 'OPEN',
        category,
        confidence,
        subjectKey,
        subjectName,
        anchorIndustryEventId,
        anchorStoryId,
        evidenceEventIds: boundedEvidence,
        institutionId,
        ...(personalityId ? { personalityId } : {}),
        publicationChannel,
        importance: raw.importance === 'HIGH' || raw.importance === 'MEDIUM' ? raw.importance : 'LOW',
        headline,
        summary,
        knownEvidence,
        ...(optionalText(raw.interpretation) ? { interpretation: optionalText(raw.interpretation) } : {}),
        target,
        createdAbsoluteWeek,
        earliestResolutionAbsoluteWeek,
        expiryAbsoluteWeek,
        lastEvaluatedAbsoluteWeek,
        playerRelated: Boolean(raw.playerRelated),
        ...(raw.leakIntentSnapshot ? { leakIntentSnapshot: raw.leakIntentSnapshot } : {}),
        ...(resolution ? { resolution } : {}),
        ...(optionalText(raw.discussionId) ? { discussionId: optionalText(raw.discussionId) } : {}),
        ...(optionalText(raw.responseId) ? { responseId: optionalText(raw.responseId) } : {}),
        ...(optionalText(raw.youtubeVideoId) ? { youtubeVideoId: optionalText(raw.youtubeVideoId) } : {}),
        ...(optionalText(raw.fandomId) ? { fandomId: optionalText(raw.fandomId) } : {}),
        ...(optionalText(raw.campaignId) ? { campaignId: optionalText(raw.campaignId) } : {}),
    };
};

const boundClaims = (claims: IndustryMediaClaim[]): IndustryMediaClaim[] => {
    if (claims.length <= INDUSTRY_MEDIA_CLAIM_LIMIT) return claims;
    const open = claims.filter(claim => claim.status === 'OPEN');
    const retainedOpen = open.slice(-Math.min(open.length, INDUSTRY_MEDIA_CLAIM_LIMIT));
    const openIds = new Set(retainedOpen.map(claim => claim.id));
    const playerRelated = claims.filter(claim => !openIds.has(claim.id) && claim.playerRelated);
    const retainedPlayer = playerRelated.slice(-Math.min(
        playerRelated.length,
        INDUSTRY_MEDIA_CLAIM_LIMIT - retainedOpen.length,
    ));
    const retainedPriority = [...retainedOpen, ...retainedPlayer];
    const retainedIds = new Set(retainedPriority.map(claim => claim.id));
    const remaining = INDUSTRY_MEDIA_CLAIM_LIMIT - retainedPriority.length;
    const recent = remaining > 0
        ? claims.filter(claim => !retainedIds.has(claim.id)).slice(-remaining)
        : [];
    return [...retainedPriority, ...recent]
        .sort((left, right) => left.createdAbsoluteWeek - right.createdAbsoluteWeek || left.id.localeCompare(right.id));
};

const normalizeSourceRecords = (
    value: unknown,
    retainedClaimIds: Set<string>,
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): IndustryMediaSourceRecord[] => {
    if (!Array.isArray(value)) return [];
    const bySourceCategory = new Map<string, IndustryMediaSourceRecord>();
    value.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const raw = item as Partial<IndustryMediaSourceRecord>;
        const id = cleanText(raw.id);
        const sourceId = cleanText(raw.sourceId);
        const institutionId = cleanText(raw.institutionId);
        const personalityId = optionalText(raw.personalityId);
        if (!id || !sourceId || !institutionIds.has(institutionId) || (personalityId && !personalityIds.has(personalityId))) return;
        const category = CATEGORIES.has(raw.category as IndustryMediaClaimCategory)
            ? raw.category as IndustryMediaClaimCategory
            : 'PROJECT_STATUS';
        const key = `${sourceId}:${category}`;
        if (bySourceCategory.has(key)) return;
        const calls = clamp(raw.calls, 0, 9999, 0);
        const confirmed = clamp(raw.confirmed, 0, calls, 0);
        const partlyConfirmed = clamp(raw.partlyConfirmed, 0, Math.max(0, calls - confirmed), 0);
        const refuted = clamp(raw.refuted, 0, Math.max(0, calls - confirmed - partlyConfirmed), 0);
        const expired = clamp(raw.expired, 0, Math.max(0, calls - confirmed - partlyConfirmed - refuted), 0);
        bySourceCategory.set(key, {
            schemaVersion: 1,
            id,
            sourceId,
            institutionId,
            ...(personalityId ? { personalityId } : {}),
            category,
            calls,
            confirmed,
            partlyConfirmed,
            refuted,
            expired,
            reliability: clamp(raw.reliability, 0, 100, 50),
            currentStreak: clamp(raw.currentStreak, -20, 20, 0),
            lastResolvedAbsoluteWeek: safeWeek(raw.lastResolvedAbsoluteWeek),
            recentClaimIds: uniqueText(raw.recentClaimIds, INDUSTRY_MEDIA_SOURCE_RECENT_CLAIM_LIMIT)
                .filter(claimId => retainedClaimIds.has(claimId)),
        });
    });
    const grouped = new Map<string, IndustryMediaSourceRecord[]>();
    [...bySourceCategory.values()].forEach(record => {
        const list = grouped.get(record.sourceId) || [];
        list.push(record);
        grouped.set(record.sourceId, list);
    });
    return [...grouped.values()].flatMap(records => records
        .sort((left, right) => right.lastResolvedAbsoluteWeek - left.lastResolvedAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(0, INDUSTRY_MEDIA_SOURCE_CATEGORY_LIMIT));
};

export const normalizeIndustryMediaClaimCollections = (
    source: Partial<IndustryMediaWorldState>,
    stories: IndustryMediaStory[],
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): Pick<IndustryMediaWorldState, 'claims' | 'sourceRecords' | 'processedClaimKeys'> => {
    const storyById = new Map(stories.map(story => [story.id, story]));
    const byKey = new Map<string, IndustryMediaClaim>();
    (Array.isArray(source.claims) ? source.claims : []).forEach(raw => {
        const claim = normalizeClaim(raw, storyById, institutionIds, personalityIds);
        if (claim && !byKey.has(claim.claimKey)) byKey.set(claim.claimKey, claim);
    });
    const claims = boundClaims([...byKey.values()]
        .sort((left, right) => left.createdAbsoluteWeek - right.createdAbsoluteWeek || left.id.localeCompare(right.id)));
    const claimIds = new Set(claims.map(claim => claim.id));
    return {
        claims,
        sourceRecords: normalizeSourceRecords(
            source.sourceRecords,
            claimIds,
            institutionIds,
            personalityIds,
        ),
        processedClaimKeys: uniqueText(source.processedClaimKeys, INDUSTRY_MEDIA_CLAIM_PROCESSED_KEY_LIMIT),
    };
};
