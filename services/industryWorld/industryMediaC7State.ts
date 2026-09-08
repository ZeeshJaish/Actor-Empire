import type {
    IndustryMediaFeudState,
    IndustryMediaNarrative,
    IndustryMediaNarrativeLandmark,
    IndustryMediaNarrativeLandmarkKind,
    IndustryMediaNarrativePolarity,
    IndustryMediaNarrativeStage,
    IndustryMediaNarrativeTheme,
    IndustryMediaPersonality,
    IndustryMediaPrEffectVector,
    IndustryMediaPrIntervention,
    IndustryMediaRelationship,
    IndustryMediaRelationshipDirection,
    IndustryMediaStory,
    IndustryMediaWorldState,
    ProjectPromotionAttribution,
    ProjectPromotionChannel,
    ProjectPromotionType,
} from '../../types';

export const INDUSTRY_MEDIA_NARRATIVE_LIMIT = 120;
export const INDUSTRY_MEDIA_NARRATIVE_LANDMARK_LIMIT = 8;
export const INDUSTRY_MEDIA_RELATIONSHIP_LIMIT = 240;
export const INDUSTRY_MEDIA_RELATIONSHIP_LANDMARK_LIMIT = 12;
export const INDUSTRY_MEDIA_PR_INTERVENTION_LIMIT = 160;
export const INDUSTRY_MEDIA_PROMOTION_ATTRIBUTION_LIMIT = 160;
export const INDUSTRY_MEDIA_C7_KEY_LIMIT = 640;

const THEMES = new Set<IndustryMediaNarrativeTheme>([
    'AMBITIOUS_RISK_TAKER', 'RECKLESS_SPENDER', 'AWARDS_POWERHOUSE', 'FRANCHISE_ARCHITECT',
    'OVERHYPED_STAR', 'RELIABLE_HITMAKER', 'COMEBACK', 'DECLINE', 'GLOBAL_EXPANSION',
    'FADING_DOMINANCE', 'DIFFICULT_COLLABORATOR', 'UNDERDOG',
]);
const POLARITIES = new Set<IndustryMediaNarrativePolarity>(['POSITIVE', 'NEGATIVE', 'MIXED']);
const STAGES = new Set<IndustryMediaNarrativeStage>(['EMERGING', 'ESTABLISHED', 'DEFINING', 'FADING', 'RESOLVED']);
const LANDMARK_KINDS = new Set<IndustryMediaNarrativeLandmarkKind>([
    'ORIGIN', 'SUPPORT', 'CONTRADICTION', 'PLAYER_CONFRONTATION', 'CLAIM_RESOLUTION', 'TURNING_POINT', 'LATEST',
]);
const DIRECTIONS = new Set<IndustryMediaRelationshipDirection>(['IMPROVING', 'WORSENING', 'STABLE']);
const FEUD_STATES = new Set<IndustryMediaFeudState>(['NONE', 'BUILDING', 'ACTIVE', 'COOLING', 'RESOLVED']);
const PR_TIERS = new Set(['ROOKIE', 'STANDARD', 'ELITE', 'LEGEND']);
const IMPORTANCE = new Set(['LOW', 'MEDIUM', 'HIGH']);
const PROMOTION_CHANNELS = new Set<ProjectPromotionChannel>(['X', 'INSTAGRAM', 'YOUTUBE', 'PRESS', 'RED_CARPET']);
const PROMOTION_TYPES = new Set<ProjectPromotionType>(['PROJECT_PROMO', 'ANNOUNCEMENT', 'BTS', 'REEL', 'CELEBRATION', 'INTERVIEW', 'PREMIERE']);

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown): string | undefined => cleanText(value) || undefined;
const safeWeek = (value: unknown, fallback = -1): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : fallback;
};
const clamp = (value: unknown, minimum: number, maximum: number, fallback = minimum): number => {
    const numeric = Number(value);
    return Math.max(minimum, Math.min(maximum, Number.isFinite(numeric) ? numeric : fallback));
};
const whole = (value: unknown, minimum: number, maximum: number, fallback = minimum): number => (
    Math.round(clamp(value, minimum, maximum, fallback))
);
const uniqueText = (value: unknown, limit: number): string[] => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(cleanText).filter(Boolean))].slice(-limit);
};
const uniqueWeeks = (value: unknown, limit: number): number[] => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(item => safeWeek(item)).filter(item => item >= 0))]
        .sort((left, right) => left - right)
        .slice(-limit);
};

const normalizeLandmark = (
    value: unknown,
    retainedEventIds: Set<string>,
): IndustryMediaNarrativeLandmark | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<IndustryMediaNarrativeLandmark>;
    const id = cleanText(raw.id);
    const absoluteWeek = safeWeek(raw.absoluteWeek);
    const summary = cleanText(raw.summary);
    const industryEventIds = uniqueText(raw.industryEventIds, 4).filter(idValue => retainedEventIds.has(idValue));
    if (!id || absoluteWeek < 0 || !summary || !industryEventIds.length) return null;
    return {
        id,
        kind: LANDMARK_KINDS.has(raw.kind as IndustryMediaNarrativeLandmarkKind)
            ? raw.kind as IndustryMediaNarrativeLandmarkKind
            : 'ORIGIN',
        industryEventIds,
        absoluteWeek,
        summary,
        impact: whole(raw.impact, -20, 20, 0),
        ...(optionalText(raw.mediaClaimId) ? { mediaClaimId: optionalText(raw.mediaClaimId) } : {}),
        ...(optionalText(raw.mediaResponseId) ? { mediaResponseId: optionalText(raw.mediaResponseId) } : {}),
    };
};

const normalizeNarrative = (
    value: unknown,
    storyById: Map<string, IndustryMediaStory>,
    eventIdsBySubject: Map<string, Set<string>>,
): IndustryMediaNarrative | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<IndustryMediaNarrative>;
    const id = cleanText(raw.id);
    const narrativeKey = cleanText(raw.narrativeKey);
    const subjectKey = cleanText(raw.subjectKey);
    const subjectName = cleanText(raw.subjectName);
    const primaryStoryId = cleanText(raw.primaryStoryId);
    const primaryIndustryEventId = cleanText(raw.primaryIndustryEventId);
    const story = storyById.get(primaryStoryId);
    const firstAbsoluteWeek = safeWeek(raw.firstAbsoluteWeek);
    if (
        !id || !narrativeKey || !subjectKey || !subjectName || !story
        || story.subjectKey !== subjectKey
        || !primaryIndustryEventId || !story.industryEventIds.includes(primaryIndustryEventId)
        || firstAbsoluteWeek < 0
    ) return null;
    const lastAdvancedAbsoluteWeek = Math.max(firstAbsoluteWeek, safeWeek(raw.lastAdvancedAbsoluteWeek, firstAbsoluteWeek));
    const retainedEventIds = eventIdsBySubject.get(subjectKey) || new Set(story.industryEventIds);
    const landmarksById = new Map<string, IndustryMediaNarrativeLandmark>();
    (Array.isArray(raw.landmarks) ? raw.landmarks : []).forEach(item => {
        const landmark = normalizeLandmark(item, retainedEventIds);
        if (landmark && !landmarksById.has(landmark.id)) landmarksById.set(landmark.id, landmark);
    });
    const landmarks = [...landmarksById.values()]
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .slice(-INDUSTRY_MEDIA_NARRATIVE_LANDMARK_LIMIT);
    const resolvedAbsoluteWeek = safeWeek(raw.resolvedAbsoluteWeek);
    const lastPublishedAbsoluteWeek = safeWeek(raw.lastPublishedAbsoluteWeek);
    return {
        schemaVersion: 1,
        id,
        narrativeKey,
        subjectKey,
        subjectName,
        theme: THEMES.has(raw.theme as IndustryMediaNarrativeTheme)
            ? raw.theme as IndustryMediaNarrativeTheme
            : 'AMBITIOUS_RISK_TAKER',
        polarity: POLARITIES.has(raw.polarity as IndustryMediaNarrativePolarity)
            ? raw.polarity as IndustryMediaNarrativePolarity
            : 'MIXED',
        stage: STAGES.has(raw.stage as IndustryMediaNarrativeStage)
            ? raw.stage as IndustryMediaNarrativeStage
            : 'EMERGING',
        strength: whole(raw.strength, 0, 100, 0),
        confidence: whole(raw.confidence, 0, 100, 0),
        supportingEvidence: whole(raw.supportingEvidence, 0, 999, 0),
        contradictingEvidence: whole(raw.contradictingEvidence, 0, 999, 0),
        primaryStoryId,
        primaryIndustryEventId,
        firstAbsoluteWeek,
        lastAdvancedAbsoluteWeek,
        nextEligiblePublicationAbsoluteWeek: Math.max(
            lastAdvancedAbsoluteWeek,
            safeWeek(raw.nextEligiblePublicationAbsoluteWeek, lastAdvancedAbsoluteWeek),
        ),
        ...(lastPublishedAbsoluteWeek >= firstAbsoluteWeek ? { lastPublishedAbsoluteWeek } : {}),
        ...(resolvedAbsoluteWeek >= firstAbsoluteWeek ? { resolvedAbsoluteWeek } : {}),
        landmarks,
        playerRelated: Boolean(raw.playerRelated),
    };
};

const retainNarratives = (items: IndustryMediaNarrative[]): IndustryMediaNarrative[] => {
    if (items.length <= INDUSTRY_MEDIA_NARRATIVE_LIMIT) return items;
    const defining = items.filter(item => item.stage === 'DEFINING');
    const retainedDefining = defining.slice(-Math.min(defining.length, 40));
    const retainedIds = new Set(retainedDefining.map(item => item.id));
    const player = items.filter(item => item.playerRelated && !retainedIds.has(item.id));
    const retainedPlayer = player.slice(-Math.min(player.length, 40));
    retainedPlayer.forEach(item => retainedIds.add(item.id));
    const recent = items.filter(item => !retainedIds.has(item.id))
        .slice(-(INDUSTRY_MEDIA_NARRATIVE_LIMIT - retainedIds.size));
    return [...retainedDefining, ...retainedPlayer, ...recent]
        .sort((left, right) => left.firstAbsoluteWeek - right.firstAbsoluteWeek || left.id.localeCompare(right.id));
};

const normalizeRelationship = (
    value: unknown,
    personalityIds: Set<string>,
): IndustryMediaRelationship | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<IndustryMediaRelationship>;
    const id = cleanText(raw.id);
    const relationshipKey = cleanText(raw.relationshipKey);
    const personalityId = cleanText(raw.personalityId);
    const subjectKey = cleanText(raw.subjectKey);
    const subjectName = cleanText(raw.subjectName);
    const counterpartPersonalityId = optionalText(raw.counterpartPersonalityId);
    const firstInteractionAbsoluteWeek = safeWeek(raw.firstInteractionAbsoluteWeek);
    if (
        !id || !relationshipKey || !personalityIds.has(personalityId)
        || !subjectKey || !subjectName || firstInteractionAbsoluteWeek < 0
        || (counterpartPersonalityId && !personalityIds.has(counterpartPersonalityId))
    ) return null;
    return {
        schemaVersion: 1,
        id,
        relationshipKey,
        personalityId,
        subjectKey,
        subjectName,
        ...(counterpartPersonalityId ? { counterpartPersonalityId } : {}),
        affinity: whole(raw.affinity, -100, 100, 0),
        respect: whole(raw.respect, 0, 100, 50),
        trust: whole(raw.trust, 0, 100, 50),
        tension: whole(raw.tension, 0, 100, 0),
        familiarity: whole(raw.familiarity, 0, 100, 0),
        direction: DIRECTIONS.has(raw.direction as IndustryMediaRelationshipDirection)
            ? raw.direction as IndustryMediaRelationshipDirection
            : 'STABLE',
        feudState: FEUD_STATES.has(raw.feudState as IndustryMediaFeudState)
            ? raw.feudState as IndustryMediaFeudState
            : 'NONE',
        conflictEventIds: uniqueText(raw.conflictEventIds, 12),
        conflictAbsoluteWeeks: uniqueWeeks(raw.conflictAbsoluteWeeks, 12),
        landmarkInteractionIds: uniqueText(raw.landmarkInteractionIds, INDUSTRY_MEDIA_RELATIONSHIP_LANDMARK_LIMIT),
        firstInteractionAbsoluteWeek,
        lastMeaningfulInteractionAbsoluteWeek: Math.max(
            firstInteractionAbsoluteWeek,
            safeWeek(raw.lastMeaningfulInteractionAbsoluteWeek, firstInteractionAbsoluteWeek),
        ),
        ...(optionalText(raw.lastIndustryEventId) ? { lastIndustryEventId: optionalText(raw.lastIndustryEventId) } : {}),
        playerRelated: Boolean(raw.playerRelated),
    };
};

const retainRelationships = (items: IndustryMediaRelationship[]): IndustryMediaRelationship[] => {
    if (items.length <= INDUSTRY_MEDIA_RELATIONSHIP_LIMIT) return items;
    const active = items.filter(item => item.feudState === 'ACTIVE');
    const retainedActive = active.slice(-Math.min(active.length, 80));
    const retainedIds = new Set(retainedActive.map(item => item.id));
    const player = items.filter(item => item.playerRelated && !retainedIds.has(item.id));
    const retainedPlayer = player.slice(-Math.min(player.length, 80));
    retainedPlayer.forEach(item => retainedIds.add(item.id));
    const recent = items.filter(item => !retainedIds.has(item.id))
        .slice(-(INDUSTRY_MEDIA_RELATIONSHIP_LIMIT - retainedIds.size));
    return [...retainedActive, ...retainedPlayer, ...recent]
        .sort((left, right) => left.firstInteractionAbsoluteWeek - right.firstInteractionAbsoluteWeek || left.id.localeCompare(right.id));
};

const normalizeEffectVector = (value: unknown): IndustryMediaPrEffectVector => {
    const raw = value && typeof value === 'object' ? value as Partial<IndustryMediaPrEffectVector> : {};
    return {
        reputation: whole(raw.reputation, -100, 100, 0),
        controversy: whole(raw.controversy, -100, 100, 0),
        followers: whole(raw.followers, -2_000_000, 2_000_000, 0),
        projectBuzz: whole(raw.projectBuzz, -50, 50, 0),
        mediaStance: whole(raw.mediaStance, -100, 100, 0),
        discussionHeat: whole(raw.discussionHeat, -100, 100, 0),
        relationshipTension: whole(raw.relationshipTension, -100, 100, 0),
        narrativeMomentum: whole(raw.narrativeMomentum, -100, 100, 0),
    };
};

const normalizePrIntervention = (value: unknown): IndustryMediaPrIntervention | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<IndustryMediaPrIntervention>;
    const id = cleanText(raw.id);
    const interventionKey = cleanText(raw.interventionKey);
    const absoluteWeek = safeWeek(raw.absoluteWeek);
    const summary = cleanText(raw.summary);
    if (!id || !interventionKey || absoluteWeek < 0 || !summary) return null;
    return {
        schemaVersion: 1,
        id,
        interventionKey,
        absoluteWeek,
        tier: PR_TIERS.has(raw.tier || '') ? raw.tier! : 'ROOKIE',
        importance: IMPORTANCE.has(raw.importance || '') ? raw.importance! : 'LOW',
        rawEffects: normalizeEffectVector(raw.rawEffects),
        appliedEffects: normalizeEffectVector(raw.appliedEffects),
        ...(optionalText(raw.outcomeLabel) ? { outcomeLabel: optionalText(raw.outcomeLabel) } : {}),
        summary,
        ...(optionalText(raw.sourceId) ? { sourceId: optionalText(raw.sourceId) } : {}),
        ...(optionalText(raw.projectId) ? { projectId: optionalText(raw.projectId) } : {}),
    };
};

const normalizePromotionAttribution = (value: unknown): ProjectPromotionAttribution | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<ProjectPromotionAttribution>;
    const id = cleanText(raw.id);
    const attributionKey = cleanText(raw.attributionKey);
    const publicationId = cleanText(raw.publicationId);
    const projectId = cleanText(raw.projectId);
    const projectName = cleanText(raw.projectName);
    const absoluteWeek = safeWeek(raw.absoluteWeek);
    if (!id || !attributionKey || !publicationId || !projectId || !projectName || absoluteWeek < 0) return null;
    return {
        schemaVersion: 1,
        id,
        attributionKey,
        publicationId,
        projectId,
        projectName,
        channel: PROMOTION_CHANNELS.has(raw.channel as ProjectPromotionChannel)
            ? raw.channel as ProjectPromotionChannel
            : 'X',
        promotionType: PROMOTION_TYPES.has(raw.promotionType as ProjectPromotionType)
            ? raw.promotionType as ProjectPromotionType
            : 'PROJECT_PROMO',
        absoluteWeek,
        baseBuzzDelta: whole(raw.baseBuzzDelta, -50, 50, 0),
        fatigueMultiplier: clamp(raw.fatigueMultiplier, 0, 1, 1),
        prMultiplier: clamp(raw.prMultiplier, 0, 2, 1),
        appliedBuzzDelta: whole(raw.appliedBuzzDelta, -50, 50, 0),
        ...(optionalText(raw.prInterventionId) ? { prInterventionId: optionalText(raw.prInterventionId) } : {}),
    };
};

const uniqueBy = <T>(value: unknown, normalizer: (item: unknown) => T | null, keyFor: (item: T) => string): T[] => {
    const byKey = new Map<string, T>();
    (Array.isArray(value) ? value : []).forEach(raw => {
        const item = normalizer(raw);
        if (item && !byKey.has(keyFor(item))) byKey.set(keyFor(item), item);
    });
    return [...byKey.values()];
};

export const normalizeIndustryMediaC7Collections = (
    source: Partial<IndustryMediaWorldState>,
    stories: IndustryMediaStory[],
    personalities: IndustryMediaPersonality[],
): Pick<IndustryMediaWorldState, 'narratives' | 'mediaRelationships' | 'prInterventions' | 'promotionAttributions' | 'processedC7Keys'> => {
    const storyById = new Map(stories.map(story => [story.id, story]));
    const eventIdsBySubject = new Map<string, Set<string>>();
    stories.forEach(story => {
        const retained = eventIdsBySubject.get(story.subjectKey) || new Set<string>();
        story.industryEventIds.forEach(eventId => retained.add(eventId));
        eventIdsBySubject.set(story.subjectKey, retained);
    });
    const personalityIds = new Set(personalities.map(personality => personality.id));
    const narratives = retainNarratives(uniqueBy(
        source.narratives,
        item => normalizeNarrative(item, storyById, eventIdsBySubject),
        item => item.narrativeKey,
    ).sort((left, right) => left.firstAbsoluteWeek - right.firstAbsoluteWeek || left.id.localeCompare(right.id)));
    const mediaRelationships = retainRelationships(uniqueBy(
        source.mediaRelationships,
        item => normalizeRelationship(item, personalityIds),
        item => item.relationshipKey,
    ).sort((left, right) => left.firstInteractionAbsoluteWeek - right.firstInteractionAbsoluteWeek || left.id.localeCompare(right.id)));
    const prInterventions = uniqueBy(
        source.prInterventions,
        normalizePrIntervention,
        item => item.interventionKey,
    ).sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .slice(-INDUSTRY_MEDIA_PR_INTERVENTION_LIMIT);
    const promotionAttributions = uniqueBy(
        source.promotionAttributions,
        normalizePromotionAttribution,
        item => item.attributionKey,
    ).sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .slice(-INDUSTRY_MEDIA_PROMOTION_ATTRIBUTION_LIMIT);
    return {
        narratives,
        mediaRelationships,
        prInterventions,
        promotionAttributions,
        processedC7Keys: uniqueText(source.processedC7Keys, INDUSTRY_MEDIA_C7_KEY_LIMIT),
    };
};
