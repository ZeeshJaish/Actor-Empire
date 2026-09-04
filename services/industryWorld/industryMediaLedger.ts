import type {
    IndustryEventImportance,
    IndustryMediaChannel,
    IndustryMediaStory,
    IndustryMediaStoryCategory,
    IndustryMediaStoryStage,
    IndustryMediaWorldState,
} from '../../types';
import { normalizeIndustryEventLedger } from './industryEventLedger';

export const INDUSTRY_MEDIA_SCHEMA_VERSION = 1 as const;
export const INDUSTRY_MEDIA_STORY_LIMIT = 240;
export const INDUSTRY_MEDIA_STORY_EVENT_LIMIT = 24;
export const INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT = 480;

const STAGES = new Set<IndustryMediaStoryStage>([
    'EMERGING', 'DEVELOPING', 'CONFIRMED', 'RESOLVED', 'FADED', 'SUPERSEDED',
]);
const CATEGORIES = new Set<IndustryMediaStoryCategory>([
    'COMPANY', 'PROJECT_DEVELOPMENT', 'PROJECT_PRODUCTION', 'PROJECT_RELEASE',
    'PROJECT_OUTCOME', 'RIGHTS', 'FRANCHISE', 'AWARDS', 'PARTNERSHIP',
]);
const IMPORTANCE = new Set<IndustryEventImportance>(['LOW', 'MEDIUM', 'HIGH']);
const CHANNELS = new Set<IndustryMediaChannel>(['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE']);

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown): string | undefined => cleanText(value) || undefined;
const safeWeek = (value: unknown, fallback = -1): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : fallback;
};

const uniqueText = (value: unknown, limit: number): string[] => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(cleanText).filter(Boolean))].slice(-limit);
};

const normalizeChannels = (value: unknown): IndustryMediaChannel[] => (
    uniqueText(value, CHANNELS.size)
        .filter((channel): channel is IndustryMediaChannel => CHANNELS.has(channel as IndustryMediaChannel))
);

const boundedEventIds = (value: unknown, primaryId: string): string[] => {
    const ids = uniqueText(value, Number.MAX_SAFE_INTEGER);
    if (!ids.includes(primaryId)) ids.unshift(primaryId);
    if (ids.length <= INDUSTRY_MEDIA_STORY_EVENT_LIMIT) return ids;
    return [primaryId, ...ids.filter(id => id !== primaryId).slice(-(INDUSTRY_MEDIA_STORY_EVENT_LIMIT - 1))];
};

const normalizeStory = (value: unknown): IndustryMediaStory | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<IndustryMediaStory>;
    const id = cleanText(candidate.id);
    const subjectKey = cleanText(candidate.subjectKey);
    const category = candidate.category;
    const stage = candidate.stage;
    const importance = candidate.importance;
    const primaryIndustryEventId = cleanText(candidate.primaryIndustryEventId);
    const headline = cleanText(candidate.headline);
    const detail = cleanText(candidate.detail);
    const firstAbsoluteWeek = safeWeek(candidate.firstAbsoluteWeek);
    const lastAdvancedAbsoluteWeek = safeWeek(candidate.lastAdvancedAbsoluteWeek);
    if (
        !id || !subjectKey || !category || !CATEGORIES.has(category)
        || !stage || !STAGES.has(stage)
        || !importance || !IMPORTANCE.has(importance)
        || !primaryIndustryEventId || !headline || !detail
        || firstAbsoluteWeek < 0 || lastAdvancedAbsoluteWeek < firstAbsoluteWeek
    ) return null;

    const industryEventIds = boundedEventIds(candidate.industryEventIds, primaryIndustryEventId);
    if (!industryEventIds.length) return null;
    const channelEligibility = normalizeChannels(candidate.channelEligibility);
    const eligibleSet = new Set(channelEligibility);
    const publishedChannels = normalizeChannels(candidate.publishedChannels)
        .filter(channel => eligibleSet.has(channel));
    const nextEligiblePublicationWeek = safeWeek(candidate.nextEligiblePublicationWeek);
    const resolutionAbsoluteWeek = safeWeek(candidate.resolutionAbsoluteWeek);
    const resolutionIndustryEventId = optionalText(candidate.resolutionIndustryEventId);

    return {
        schemaVersion: INDUSTRY_MEDIA_SCHEMA_VERSION,
        id,
        subjectKey,
        category,
        stage,
        importance,
        primaryIndustryEventId,
        industryEventIds,
        firstAbsoluteWeek,
        lastAdvancedAbsoluteWeek,
        ...(nextEligiblePublicationWeek >= 0 ? { nextEligiblePublicationWeek } : {}),
        headline,
        detail,
        channelEligibility,
        publishedChannels,
        ...(optionalText(candidate.companyId) ? { companyId: optionalText(candidate.companyId) } : {}),
        ...(optionalText(candidate.companyName) ? { companyName: optionalText(candidate.companyName) } : {}),
        ...(optionalText(candidate.platformId) ? { platformId: optionalText(candidate.platformId) } : {}),
        ...(optionalText(candidate.projectId) ? { projectId: optionalText(candidate.projectId) } : {}),
        ...(optionalText(candidate.productionId) ? { productionId: optionalText(candidate.productionId) } : {}),
        ...(optionalText(candidate.rightsContractId) ? { rightsContractId: optionalText(candidate.rightsContractId) } : {}),
        ...(optionalText(candidate.transactionId) ? { transactionId: optionalText(candidate.transactionId) } : {}),
        ...(optionalText(candidate.awardEventId) ? { awardEventId: optionalText(candidate.awardEventId) } : {}),
        ...(resolutionIndustryEventId ? { resolutionIndustryEventId } : {}),
        ...(resolutionAbsoluteWeek >= 0 ? { resolutionAbsoluteWeek } : {}),
    };
};

const boundStories = (stories: IndustryMediaStory[]): IndustryMediaStory[] => {
    if (stories.length <= INDUSTRY_MEDIA_STORY_LIMIT) return stories;
    const important = stories.filter(story => story.importance === 'HIGH');
    const retainedImportant = important.slice(-Math.min(
        important.length,
        Math.floor(INDUSTRY_MEDIA_STORY_LIMIT / 2),
    ));
    const retainedIds = new Set(retainedImportant.map(story => story.id));
    const recent = stories
        .filter(story => !retainedIds.has(story.id))
        .slice(-(INDUSTRY_MEDIA_STORY_LIMIT - retainedImportant.length));
    return [...retainedImportant, ...recent]
        .sort((left, right) => (
            left.firstAbsoluteWeek - right.firstAbsoluteWeek || left.id.localeCompare(right.id)
        ));
};

const removeEventConflicts = (stories: IndustryMediaStory[]): IndustryMediaStory[] => {
    const claimedEvents = new Set<string>();
    return stories.flatMap(story => {
        const industryEventIds = story.industryEventIds.filter(eventId => {
            if (claimedEvents.has(eventId)) return false;
            claimedEvents.add(eventId);
            return true;
        });
        if (!industryEventIds.length) return [];
        return [{
            ...story,
            primaryIndustryEventId: industryEventIds.includes(story.primaryIndustryEventId)
                ? story.primaryIndustryEventId
                : industryEventIds[0],
            industryEventIds,
        }];
    });
};

export const normalizeIndustryMediaWorld = (value: unknown): IndustryMediaWorldState => {
    const source = value && typeof value === 'object' ? value as Partial<IndustryMediaWorldState> : {};
    const byId = new Map<string, IndustryMediaStory>();
    (Array.isArray(source.stories) ? source.stories : []).forEach(raw => {
        const story = normalizeStory(raw);
        if (story && !byId.has(story.id)) byId.set(story.id, story);
    });
    const ordered = [...byId.values()].sort((left, right) => (
        left.firstAbsoluteWeek - right.firstAbsoluteWeek || left.id.localeCompare(right.id)
    ));
    const stories = removeEventConflicts(boundStories(ordered));
    const eventStoryIndex: Record<string, string> = {};
    stories.forEach(story => story.industryEventIds.forEach(eventId => {
        eventStoryIndex[eventId] = story.id;
    }));
    return {
        schemaVersion: INDUSTRY_MEDIA_SCHEMA_VERSION,
        lastProcessedAbsoluteWeek: safeWeek(source.lastProcessedAbsoluteWeek),
        stories,
        eventStoryIndex,
        publishedBeatKeys: uniqueText(
            source.publishedBeatKeys,
            INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT,
        ),
    };
};

export const reconcileIndustryMediaWorldWithEvents = (
    inputMediaWorld: unknown,
    inputEventLedger: unknown,
): IndustryMediaWorldState => {
    const eventLedger = normalizeIndustryEventLedger(inputEventLedger);
    const retainedEventIds = new Set(eventLedger.events.map(event => event.id));
    const source = inputMediaWorld && typeof inputMediaWorld === 'object'
        ? inputMediaWorld as Partial<IndustryMediaWorldState>
        : {};
    return normalizeIndustryMediaWorld({
        ...source,
        stories: (Array.isArray(source.stories) ? source.stories : []).flatMap(rawStory => {
            if (!rawStory || typeof rawStory !== 'object') return [];
            const story = rawStory as Partial<IndustryMediaStory>;
            const industryEventIds = uniqueText(story.industryEventIds, Number.MAX_SAFE_INTEGER)
                .filter(eventId => retainedEventIds.has(eventId));
            if (!industryEventIds.length) return [];
            const resolutionRetained = story.resolutionIndustryEventId
                ? retainedEventIds.has(story.resolutionIndustryEventId)
                : false;
            return [{
                ...story,
                primaryIndustryEventId: story.primaryIndustryEventId
                    && industryEventIds.includes(story.primaryIndustryEventId)
                    ? story.primaryIndustryEventId
                    : industryEventIds[0],
                industryEventIds,
                ...(!resolutionRetained ? {
                    resolutionIndustryEventId: undefined,
                    resolutionAbsoluteWeek: undefined,
                } : {}),
            }];
        }),
    });
};
