import type {
    IndustryEventFact,
    IndustryEventType,
    IndustryMediaCampaign,
    IndustryMediaCampaignMoment,
    IndustryMediaCampaignOutcome,
    IndustryMediaCampaignParticipationMode,
    IndustryMediaCampaignStage,
    IndustryMediaCampaignType,
    IndustryMediaFandom,
    IndustryMediaFandomArchetype,
    IndustryMediaStory,
    IndustryMediaWorldState,
    InstaPost,
    InstaPostType,
    Player,
    XPost,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

export const INDUSTRY_MEDIA_FANDOM_LIMIT = 96;
export const INDUSTRY_MEDIA_CAMPAIGN_LIMIT = 160;
export const INDUSTRY_MEDIA_CAMPAIGN_MOMENT_LIMIT = 6;
export const INDUSTRY_MEDIA_FANDOM_RECENT_CAMPAIGN_LIMIT = 12;
export const INDUSTRY_MEDIA_FANDOM_RELATION_LIMIT = 8;
export const INDUSTRY_MEDIA_FANDOM_PROCESSED_KEY_LIMIT = 640;
export const INDUSTRY_MEDIA_CAMPAIGN_EVIDENCE_LIMIT = 12;

const ARCHETYPES = new Set<IndustryMediaFandomArchetype>([
    'DEVOTED', 'CREATIVE', 'EVENT', 'PROTECTIVE', 'ANALYTICAL', 'VOLATILE',
]);
const TYPES = new Set<IndustryMediaCampaignType>([
    'COUNTDOWN', 'WATCH_PARTY', 'FAN_EDIT', 'AWARD_DRIVE', 'SAVE_THE_PROJECT',
    'CONTINUE_THE_UNIVERSE', 'DEFEND_SUBJECT', 'CELEBRATE', 'CASTING_WISH', 'HASHTAG_CLASH',
]);
const STAGES = new Set<IndustryMediaCampaignStage>(['SPARK', 'RALLY', 'PEAK', 'AFTERMATH', 'CLOSED']);
const OUTCOMES = new Set<IndustryMediaCampaignOutcome>(['BREAKOUT', 'STRONG', 'MODEST', 'FIZZLED', 'MESSY']);

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

export const normalizeIndustryMediaHashtag = (value: unknown, fallback = '#ScreenTogether'): string => {
    const words = cleanText(value).match(/[A-Za-z0-9]+/g) || [];
    const joined = (words.length <= 1
        ? words.join('')
        : words.map(word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(''))
        .slice(0, 36);
    return joined ? `#${joined}` : fallback;
};

const localAvatar = (name: string, primaryColor: string): string => {
    const initials = (name.match(/[A-Za-z0-9]/g) || ['F']).slice(0, 2).join('').toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="26" fill="${primaryColor}"/><circle cx="74" cy="22" r="22" fill="#ffffff" fill-opacity=".12"/><text x="48" y="58" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="800">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const ARCHETYPE_ORDER: IndustryMediaFandomArchetype[] = [
    'DEVOTED', 'CREATIVE', 'EVENT', 'PROTECTIVE', 'ANALYTICAL', 'VOLATILE',
];
const FANDOM_PALETTES = [
    ['#7C3AED', '#111827'], ['#DB2777', '#1F172A'], ['#0891B2', '#082F49'],
    ['#EA580C', '#431407'], ['#16A34A', '#052E16'], ['#CA8A04', '#422006'],
] as const;
const ARCHETYPE_SUFFIX: Record<IndustryMediaFandomArchetype, string> = {
    DEVOTED: 'Faithful',
    CREATIVE: 'Archive',
    EVENT: 'Premiere Club',
    PROTECTIVE: 'Guard',
    ANALYTICAL: 'Files',
    VOLATILE: 'Storm',
};

const titleCaseId = (value: string): string => value
    .replace(/[_:-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();

const fandomSubjectName = (player: Player, story: IndustryMediaStory): string => {
    if (story.projectId) {
        const project = player.world?.projects?.find(item => item.id === story.projectId);
        const title = cleanText((project as { title?: string; name?: string } | undefined)?.title)
            || cleanText((project as { title?: string; name?: string } | undefined)?.name);
        if (title) return title;
        return titleCaseId(story.projectId);
    }
    return cleanText(story.companyName) || titleCaseId(story.subjectKey.split(':').slice(1).join(':')) || 'Screen Culture';
};

export const createIndustryMediaFandomIdentity = (
    player: Player,
    story: IndustryMediaStory,
    absoluteWeek: number,
): IndustryMediaFandom => {
    const rng = createDeterministicRng(`industry-fandom-identity:${story.subjectKey}`);
    const archetype = ARCHETYPE_ORDER[Math.floor(rng() * ARCHETYPE_ORDER.length) % ARCHETYPE_ORDER.length];
    const palette = FANDOM_PALETTES[Math.floor(rng() * FANDOM_PALETTES.length) % FANDOM_PALETTES.length];
    const subjectName = fandomSubjectName(player, story);
    const name = `${subjectName} ${ARCHETYPE_SUFFIX[archetype]}`;
    const handleRoot = subjectName.replace(/[^A-Za-z0-9]+/g, '').slice(0, 19) || 'ScreenCulture';
    const suffix = Math.floor(rng() * 9_000 + 1_000);
    const sizeBase = story.importance === 'HIGH' ? 18_000 : story.importance === 'MEDIUM' ? 4_500 : 1_200;
    const size = Math.max(250, Math.round(sizeBase * (0.65 + rng() * 0.9)));
    const loyalty = Math.round(45 + rng() * 35);
    const activity = Math.round(35 + rng() * 45);
    const coordination = Math.round(30 + rng() * 50);
    const optimism = Math.round(38 + rng() * 48);
    const volatilityBase = archetype === 'VOLATILE' ? 65 : archetype === 'PROTECTIVE' ? 48 : 24;
    const volatility = Math.min(100, Math.round(volatilityBase + rng() * 24));
    return {
        schemaVersion: 1,
        id: createDeterministicId('industry_fandom', story.subjectKey),
        name,
        handle: `@${handleRoot}${suffix}`,
        bio: `${ARCHETYPE_SUFFIX[archetype]} community following ${subjectName}. Fan-run, not official.`,
        primaryColor: palette[0],
        secondaryColor: palette[1],
        avatar: localAvatar(name, palette[0]),
        motif: archetype,
        subjectKey: story.subjectKey,
        subjectName,
        ...(story.companyId ? { companyId: story.companyId } : {}),
        ...(story.projectId ? { projectId: story.projectId } : {}),
        ...(story.platformId ? { platformId: story.platformId } : {}),
        archetype,
        homeRegionId: 'GLOBAL',
        languageId: 'en',
        size,
        loyalty,
        activity,
        coordination,
        optimism,
        volatility,
        formedAbsoluteWeek: absoluteWeek,
        lastActiveAbsoluteWeek: absoluteWeek,
        friendlySubjectKeys: [],
        rivalSubjectKeys: [],
        recentCampaignIds: [],
    };
};

const formationScore = (
    state: IndustryMediaWorldState,
    story: IndustryMediaStory,
    absoluteWeek: number,
): number => {
    const video = state.youtubeVideos.find(item => item.subjectKey === story.subjectKey
        && (item.outcome === 'HIT' || item.outcome === 'BREAKOUT'));
    const importance = story.importance === 'HIGH' ? 45 : story.importance === 'MEDIUM' ? 20 : 0;
    const repeatAttention = Math.min(18, Math.max(0, story.industryEventIds.length - 1) * 9);
    const category = story.category === 'FRANCHISE' ? 20
        : ['PROJECT_RELEASE', 'PROJECT_OUTCOME', 'AWARDS'].includes(story.category) ? 14 : 0;
    const creatorLift = video ? 32 : 0;
    const freshness = Math.max(0, 8 - Math.max(0, absoluteWeek - story.lastAdvancedAbsoluteWeek) * 2);
    const rng = createDeterministicRng(`industry-fandom-formation:${story.subjectKey}:${absoluteWeek}`);
    return importance + repeatAttention + category + creatorLift + freshness + rng() * 18;
};

export const qualifyIndustryMediaFandoms = (
    player: Player,
    absoluteWeek: number,
    state: IndustryMediaWorldState,
): IndustryMediaFandom[] => {
    const existingSubjects = new Set(state.fandoms.map(item => item.subjectKey));
    const candidate = state.stories
        .filter(story => !existingSubjects.has(story.subjectKey)
            && story.importance !== 'LOW'
            && !['FADED', 'SUPERSEDED'].includes(story.stage)
            && absoluteWeek - story.lastAdvancedAbsoluteWeek <= 8)
        .map(story => ({ story, score: formationScore(state, story, absoluteWeek) }))
        .filter(item => item.score >= 64)
        .sort((left, right) => right.score - left.score || left.story.id.localeCompare(right.story.id))[0];
    return candidate ? [createIndustryMediaFandomIdentity(player, candidate.story, absoluteWeek)] : [];
};

const normalizeFandom = (value: unknown): IndustryMediaFandom | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaFandom>;
    const id = cleanText(source.id);
    const name = cleanText(source.name);
    const handleText = cleanText(source.handle).replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 30);
    const subjectKey = cleanText(source.subjectKey);
    const subjectName = cleanText(source.subjectName);
    const formedAbsoluteWeek = safeInteger(source.formedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, -1);
    if (!id || !name || !handleText || !subjectKey || !subjectName || formedAbsoluteWeek < 0) return null;
    const primaryColor = color(source.primaryColor, '#7C3AED');
    const secondaryColor = color(source.secondaryColor, '#111827');
    const archetype = source.archetype && ARCHETYPES.has(source.archetype) ? source.archetype : 'CREATIVE';
    const avatar = cleanText(source.avatar);
    return {
        schemaVersion: 1,
        id,
        name,
        handle: `@${handleText}`,
        bio: cleanText(source.bio) || `Fans following ${subjectName} together.`,
        primaryColor,
        secondaryColor,
        avatar: avatar.startsWith('data:image/') ? avatar : localAvatar(name, primaryColor),
        motif: cleanText(source.motif) || 'SPARK',
        subjectKey,
        subjectName,
        ...(optionalText(source.companyId) ? { companyId: optionalText(source.companyId) } : {}),
        ...(optionalText(source.projectId) ? { projectId: optionalText(source.projectId) } : {}),
        ...(optionalText(source.universeId) ? { universeId: optionalText(source.universeId) } : {}),
        ...(optionalText(source.platformId) ? { platformId: optionalText(source.platformId) } : {}),
        ...(optionalText(source.talentId) ? { talentId: optionalText(source.talentId) } : {}),
        archetype,
        homeRegionId: cleanText(source.homeRegionId) || 'GLOBAL',
        languageId: cleanText(source.languageId) || 'en',
        size: safeInteger(source.size, 0),
        loyalty: safeInteger(source.loyalty, 0, 100, 50),
        activity: safeInteger(source.activity, 0, 100, 40),
        coordination: safeInteger(source.coordination, 0, 100, 40),
        optimism: safeInteger(source.optimism, 0, 100, 50),
        volatility: safeInteger(source.volatility, 0, 100, 35),
        formedAbsoluteWeek,
        lastActiveAbsoluteWeek: safeInteger(
            source.lastActiveAbsoluteWeek,
            formedAbsoluteWeek,
            Number.MAX_SAFE_INTEGER,
            formedAbsoluteWeek,
        ),
        friendlySubjectKeys: uniqueText(source.friendlySubjectKeys, INDUSTRY_MEDIA_FANDOM_RELATION_LIMIT),
        rivalSubjectKeys: uniqueText(source.rivalSubjectKeys, INDUSTRY_MEDIA_FANDOM_RELATION_LIMIT),
        recentCampaignIds: uniqueText(source.recentCampaignIds, INDUSTRY_MEDIA_FANDOM_RECENT_CAMPAIGN_LIMIT),
    };
};

const normalizeMoment = (
    value: unknown,
    campaignId: string,
    startedAbsoluteWeek: number,
    lastAdvancedAbsoluteWeek: number,
): IndustryMediaCampaignMoment | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaCampaignMoment>;
    const id = cleanText(source.id);
    const caption = cleanText(source.caption);
    const stage = source.stage && STAGES.has(source.stage) ? source.stage : 'RALLY';
    const absoluteWeek = safeInteger(source.absoluteWeek, startedAbsoluteWeek, lastAdvancedAbsoluteWeek, -1);
    if (!id || !caption || absoluteWeek < 0) return null;
    return {
        schemaVersion: 1,
        id,
        campaignId,
        absoluteWeek,
        stage,
        caption,
        reach: safeInteger(source.reach, 0),
        participation: safeInteger(source.participation, 0),
        sentiment: safeInteger(source.sentiment, -100, 100),
        heat: safeInteger(source.heat, 0, 100),
        ...(optionalText(source.instagramPostId) ? { instagramPostId: optionalText(source.instagramPostId) } : {}),
        ...(optionalText(source.xPostId) ? { xPostId: optionalText(source.xPostId) } : {}),
    };
};

const normalizeCampaign = (
    value: unknown,
    fandomIds: Set<string>,
    storyById: Map<string, IndustryMediaStory>,
    responseIds: Set<string>,
    youtubeVideoIds: Set<string>,
): IndustryMediaCampaign | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaCampaign>;
    const id = cleanText(source.id);
    const campaignKey = cleanText(source.campaignKey);
    const fandomId = cleanText(source.fandomId);
    const mediaStoryId = cleanText(source.mediaStoryId);
    const industryEventId = cleanText(source.industryEventId);
    const story = storyById.get(mediaStoryId);
    if (!id || !campaignKey || !fandomIds.has(fandomId) || !story || !story.industryEventIds.includes(industryEventId)) return null;
    const headline = cleanText(source.headline);
    const purpose = cleanText(source.purpose);
    const context = cleanText(source.context);
    if (!headline || !purpose || !context) return null;
    const startedAbsoluteWeek = safeInteger(source.startedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, -1);
    const lastAdvancedAbsoluteWeek = safeInteger(source.lastAdvancedAbsoluteWeek, startedAbsoluteWeek, Number.MAX_SAFE_INTEGER, startedAbsoluteWeek);
    if (startedAbsoluteWeek < 0) return null;
    const type = source.type && TYPES.has(source.type) ? source.type : 'COUNTDOWN';
    const stage = source.stage && STAGES.has(source.stage) ? source.stage : 'SPARK';
    const rawOutcome = source.outcome && OUTCOMES.has(source.outcome) ? source.outcome : undefined;
    const outcome = stage === 'AFTERMATH' || stage === 'CLOSED' ? rawOutcome : undefined;
    const momentById = new Map<string, IndustryMediaCampaignMoment>();
    (Array.isArray(source.moments) ? source.moments : []).forEach(raw => {
        const moment = normalizeMoment(raw, id, startedAbsoluteWeek, lastAdvancedAbsoluteWeek);
        if (moment && !momentById.has(moment.id)) momentById.set(moment.id, moment);
    });
    const youtubeVideoId = optionalText(source.youtubeVideoId);
    const responseId = optionalText(source.responseId);
    const participationSource = source.playerParticipation;
    const participationMode = participationSource?.mode === 'JOIN' || participationSource?.mode === 'THANK'
        ? participationSource.mode : undefined;
    const playerParticipation = participationMode ? {
        mode: participationMode,
        absoluteWeek: safeInteger(participationSource?.absoluteWeek, startedAbsoluteWeek),
        ...(optionalText(participationSource?.playerPostId) ? { playerPostId: optionalText(participationSource?.playerPostId) } : {}),
        followerDelta: safeInteger(participationSource?.followerDelta, 0, 50_000),
        fanLoyaltyDelta: safeInteger(participationSource?.fanLoyaltyDelta, 0, 5),
        controversyDelta: safeInteger(participationSource?.controversyDelta, 0, 5),
    } : undefined;
    return {
        schemaVersion: 1,
        id,
        campaignKey,
        fandomId,
        industryEventId,
        mediaStoryId,
        evidenceEventIds: uniqueText(source.evidenceEventIds, Number.MAX_SAFE_INTEGER)
            .filter(eventId => story.industryEventIds.includes(eventId))
            .slice(0, INDUSTRY_MEDIA_CAMPAIGN_EVIDENCE_LIMIT),
        ...(youtubeVideoId && youtubeVideoIds.has(youtubeVideoId) ? { youtubeVideoId } : {}),
        ...(responseId && responseIds.has(responseId) ? { responseId } : {}),
        subjectKey: story.subjectKey,
        type,
        hashtag: normalizeIndustryMediaHashtag(source.hashtag),
        headline,
        purpose,
        context,
        stage,
        startedAbsoluteWeek,
        lastAdvancedAbsoluteWeek,
        nextEligibleAbsoluteWeek: safeInteger(
            source.nextEligibleAbsoluteWeek,
            lastAdvancedAbsoluteWeek,
            Number.MAX_SAFE_INTEGER,
            lastAdvancedAbsoluteWeek + 1,
        ),
        ...(source.terminalAbsoluteWeek !== undefined ? {
            terminalAbsoluteWeek: safeInteger(source.terminalAbsoluteWeek, startedAbsoluteWeek),
        } : {}),
        reach: safeInteger(source.reach, 0),
        participation: safeInteger(source.participation, 0),
        coordination: safeInteger(source.coordination, 0, 100),
        sentiment: safeInteger(source.sentiment, -100, 100),
        heat: safeInteger(source.heat, 0, 100),
        performanceRoll: boundedNumber(source.performanceRoll, 0, 1, 0.5),
        ...(outcome ? { outcome } : {}),
        playerRelated: Boolean(source.playerRelated),
        moments: [...momentById.values()]
            .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
            .slice(-INDUSTRY_MEDIA_CAMPAIGN_MOMENT_LIMIT),
        ...(playerParticipation ? { playerParticipation } : {}),
    };
};

const retainFandoms = (items: IndustryMediaFandom[]): IndustryMediaFandom[] => [...items]
    .sort((left, right) => left.formedAbsoluteWeek - right.formedAbsoluteWeek || left.id.localeCompare(right.id))
    .slice(0, INDUSTRY_MEDIA_FANDOM_LIMIT);

const retainCampaigns = (items: IndustryMediaCampaign[]): IndustryMediaCampaign[] => [...items]
    .sort((left, right) => (
        Number(left.stage === 'CLOSED') - Number(right.stage === 'CLOSED')
        || Number(right.playerRelated && !right.playerParticipation) - Number(left.playerRelated && !left.playerParticipation)
        || right.lastAdvancedAbsoluteWeek - left.lastAdvancedAbsoluteWeek
        || left.id.localeCompare(right.id)
    ))
    .slice(0, INDUSTRY_MEDIA_CAMPAIGN_LIMIT)
    .sort((left, right) => left.startedAbsoluteWeek - right.startedAbsoluteWeek || left.id.localeCompare(right.id));

export const normalizeIndustryMediaFandomCollections = (
    source: Partial<IndustryMediaWorldState>,
    stories: IndustryMediaStory[],
    responseIds: Set<string>,
    youtubeVideoIds: Set<string>,
): Pick<IndustryMediaWorldState, 'fandoms' | 'campaigns' | 'processedFandomKeys'> => {
    const fandomById = new Map<string, IndustryMediaFandom>();
    const claimedSubjects = new Set<string>();
    (Array.isArray(source.fandoms) ? source.fandoms : []).forEach(raw => {
        const fandom = normalizeFandom(raw);
        if (fandom && !fandomById.has(fandom.id) && !claimedSubjects.has(fandom.subjectKey)) {
            fandomById.set(fandom.id, fandom);
            claimedSubjects.add(fandom.subjectKey);
        }
    });
    let fandoms = retainFandoms([...fandomById.values()]);
    const fandomIds = new Set(fandoms.map(item => item.id));
    const storyById = new Map(stories.map(story => [story.id, story]));
    const campaignById = new Map<string, IndustryMediaCampaign>();
    const claimedKeys = new Set<string>();
    (Array.isArray(source.campaigns) ? source.campaigns : []).forEach(raw => {
        const campaign = normalizeCampaign(raw, fandomIds, storyById, responseIds, youtubeVideoIds);
        if (campaign && !campaignById.has(campaign.id) && !claimedKeys.has(campaign.campaignKey)) {
            campaignById.set(campaign.id, campaign);
            claimedKeys.add(campaign.campaignKey);
        }
    });
    const campaigns = retainCampaigns([...campaignById.values()]);
    const campaignIds = new Set(campaigns.map(item => item.id));
    fandoms = fandoms.map(fandom => ({
        ...fandom,
        recentCampaignIds: fandom.recentCampaignIds
            .filter(campaignId => campaignIds.has(campaignId))
            .slice(-INDUSTRY_MEDIA_FANDOM_RECENT_CAMPAIGN_LIMIT),
    }));
    return {
        fandoms,
        campaigns,
        processedFandomKeys: uniqueText(source.processedFandomKeys, INDUSTRY_MEDIA_FANDOM_PROCESSED_KEY_LIMIT),
    };
};

export const selectIndustryMediaCampaignType = (
    eventType: IndustryEventType,
    context: { hasHitVideo: boolean; hasResponse: boolean; hasRival: boolean },
): IndustryMediaCampaignType => {
    if (context.hasRival) return 'HASHTAG_CLASH';
    if (context.hasResponse) return 'DEFEND_SUBJECT';
    if (eventType === 'PROJECT_RELEASE_PLANNED') return 'COUNTDOWN';
    if (eventType === 'PROJECT_RELEASED') return 'WATCH_PARTY';
    if (eventType === 'AWARD_NOMINATED') return 'AWARD_DRIVE';
    if (eventType === 'PROJECT_HELD' || eventType === 'PROJECT_CANCELLED') return 'SAVE_THE_PROJECT';
    if (eventType === 'FRANCHISE_DECISION') return 'CONTINUE_THE_UNIVERSE';
    if (eventType === 'PROJECT_HIT' || eventType === 'PROJECT_SLEEPER' || eventType === 'AWARD_WON') return 'CELEBRATE';
    if (eventType === 'PROJECT_GREENLIT') return 'CASTING_WISH';
    if (context.hasHitVideo) return 'FAN_EDIT';
    return 'FAN_EDIT';
};

const campaignSuffix: Record<IndustryMediaCampaignType, string> = {
    COUNTDOWN: 'Countdown', WATCH_PARTY: 'WatchTogether', FAN_EDIT: 'FanEdit', AWARD_DRIVE: 'ForTheWin',
    SAVE_THE_PROJECT: 'SaveTheStory', CONTINUE_THE_UNIVERSE: 'ContinueTheWorld', DEFEND_SUBJECT: 'StandTogether',
    CELEBRATE: 'Celebrates', CASTING_WISH: 'DreamCast', HASHTAG_CLASH: 'FanDebate',
};

export interface IndustryMediaCampaignDraft {
    hashtag: string;
    headline: string;
    purpose: string;
    context: string;
}

export const createIndustryMediaCampaignDraft = (input: {
    player: Player;
    fandom: Pick<IndustryMediaFandom, 'name' | 'handle' | 'subjectName' | 'subjectKey' | 'archetype'>;
    story: IndustryMediaStory;
    event: IndustryEventFact;
    type: IndustryMediaCampaignType;
    absoluteWeek: number;
}): IndustryMediaCampaignDraft => {
    const subject = input.fandom.subjectName;
    const hashtag = normalizeIndustryMediaHashtag(`${subject} ${campaignSuffix[input.type]}`);
    const copy: Record<IndustryMediaCampaignType, Omit<IndustryMediaCampaignDraft, 'hashtag'>> = {
        COUNTDOWN: {
            headline: `${input.fandom.name} starts the ${subject} countdown`,
            purpose: `Bring fans together ahead of the confirmed ${subject} event.`,
            context: input.event.detail,
        },
        WATCH_PARTY: {
            headline: `${input.fandom.name} calls a ${subject} watch party`,
            purpose: `Coordinate a fan-led viewing celebration for ${subject}.`,
            context: input.event.detail,
        },
        FAN_EDIT: {
            headline: `${subject} fan edits are gathering momentum`,
            purpose: `Celebrate ${subject} through fan-run edits and artwork.`,
            context: input.event.detail,
        },
        AWARD_DRIVE: {
            headline: `${input.fandom.name} rallies around awards season`,
            purpose: `Show fan support for ${subject} without claiming influence over award results.`,
            context: input.event.detail,
        },
        SAVE_THE_PROJECT: {
            headline: `${input.fandom.name} asks for another chance`,
            purpose: `A fan-led request to save or reconsider ${subject}.`,
            context: input.event.detail,
        },
        CONTINUE_THE_UNIVERSE: {
            headline: `${input.fandom.name} wants the story to continue`,
            purpose: `Show audience interest in more stories connected to ${subject}.`,
            context: input.event.detail,
        },
        DEFEND_SUBJECT: {
            headline: `${input.fandom.name} rallies around ${subject}`,
            purpose: `Respond to the current public conversation with fan support.`,
            context: input.event.detail,
        },
        CELEBRATE: {
            headline: `${input.fandom.name} turns the ${subject} moment into a celebration`,
            purpose: `Celebrate the confirmed milestone with the wider fan community.`,
            context: input.event.detail,
        },
        CASTING_WISH: {
            headline: `${input.fandom.name} shares its ${subject} dream cast`,
            purpose: `A fan wish for who supporters would like to see in ${subject}.`,
            context: `${input.event.detail} This is a fan preference; no casting decision is implied.`,
        },
        HASHTAG_CLASH: {
            headline: `${input.fandom.name} enters a fast-moving fan debate`,
            purpose: `Compare fan enthusiasm without presenting opinions as industry facts.`,
            context: input.event.detail,
        },
    };
    return { hashtag, ...copy[input.type] };
};

export const calculateIndustryMediaCampaignOutcome = (input: {
    fandom: Pick<IndustryMediaFandom, 'loyalty' | 'activity' | 'coordination' | 'optimism' | 'volatility'>;
    importance: IndustryMediaStory['importance'];
    performanceRoll: number;
    creatorLift: number;
}): IndustryMediaCampaignOutcome => {
    const roll = boundedNumber(input.performanceRoll, 0, 1, 0.5);
    if (input.fandom.volatility >= 80 && roll >= 0.72) return 'MESSY';
    const score = input.fandom.loyalty * 0.22
        + input.fandom.activity * 0.2
        + input.fandom.coordination * 0.2
        + input.fandom.optimism * 0.1
        + (input.importance === 'HIGH' ? 18 : input.importance === 'MEDIUM' ? 10 : 2)
        + boundedNumber(input.creatorLift, 0, 25)
        + roll * 20
        - input.fandom.volatility * 0.05;
    if (score >= 85) return 'BREAKOUT';
    if (score >= 68) return 'STRONG';
    if (score >= 48) return 'MODEST';
    return 'FIZZLED';
};

const nextStage = (stage: IndustryMediaCampaignStage): IndustryMediaCampaignStage => {
    if (stage === 'SPARK') return 'RALLY';
    if (stage === 'RALLY') return 'PEAK';
    if (stage === 'PEAK') return 'AFTERMATH';
    return 'CLOSED';
};

const momentCaption = (
    campaign: IndustryMediaCampaign,
    stage: IndustryMediaCampaignStage,
    outcome?: IndustryMediaCampaignOutcome,
): string => {
    if (stage === 'SPARK') return `${campaign.headline}. ${campaign.purpose} ${campaign.hashtag}`;
    if (stage === 'RALLY') return `${campaign.hashtag} is gathering fan edits, comments, and community posts.`;
    if (stage === 'PEAK') {
        if (outcome === 'MESSY') return `${campaign.hashtag} is peaking, but the fan conversation has become divided and messy.`;
        if (outcome === 'FIZZLED') return `${campaign.hashtag} stayed a smaller fan-led moment rather than breaking beyond the core community.`;
        return `${campaign.hashtag} has reached its biggest week as supporters coordinate around ${campaign.purpose.toLowerCase()}`;
    }
    return outcome === 'BREAKOUT' || outcome === 'STRONG'
        ? `${campaign.hashtag} leaves the fandom larger and more organized after the campaign.`
        : `${campaign.hashtag} closes with its core supporters still following the story.`;
};

const createCampaignMoment = (
    campaign: IndustryMediaCampaign,
    stage: IndustryMediaCampaignStage,
    absoluteWeek: number,
    outcome?: IndustryMediaCampaignOutcome,
): IndustryMediaCampaignMoment => {
    const stageMultiplier = stage === 'SPARK' ? 0.3 : stage === 'RALLY' ? 0.65 : stage === 'PEAK' ? 1 : 0.45;
    const reach = Math.max(100, Math.round(campaign.reach * stageMultiplier));
    const participation = Math.max(25, Math.round(campaign.participation * stageMultiplier));
    const id = createDeterministicId('industry_campaign_moment', `${campaign.id}:${stage}:${absoluteWeek}`);
    return {
        schemaVersion: 1,
        id,
        campaignId: campaign.id,
        absoluteWeek,
        stage,
        caption: momentCaption(campaign, stage, outcome),
        reach,
        participation,
        sentiment: campaign.sentiment,
        heat: campaign.heat,
        instagramPostId: `instagram_campaign_${id}`,
        ...(stage === 'RALLY' || stage === 'PEAK' ? { xPostId: `x_campaign_${id}` } : {}),
    };
};

const campaignPosts = (
    fandom: IndustryMediaFandom,
    campaign: IndustryMediaCampaign,
    moment: IndustryMediaCampaignMoment,
): { instaPost: InstaPost; xPost?: XPost } => {
    const instaPost: InstaPost = {
        id: moment.instagramPostId || `instagram_campaign_${moment.id}`,
        authorId: fandom.id,
        authorName: fandom.name,
        authorHandle: fandom.handle,
        authorAvatar: fandom.avatar,
        type: campaign.type === 'FAN_EDIT' ? 'CAROUSEL'
            : campaign.type === 'CELEBRATE' || campaign.type === 'AWARD_DRIVE' ? 'CELEBRATION' : 'ANNOUNCEMENT',
        caption: moment.caption,
        week: (moment.absoluteWeek % 52) + 1,
        year: Math.floor(moment.absoluteWeek / 52) + 1,
        likes: Math.max(25, Math.round(moment.reach * 0.08)),
        comments: Math.max(4, Math.round(moment.participation * 0.035)),
        shares: Math.max(2, Math.round(moment.reach * 0.012)),
        saves: Math.max(2, Math.round(moment.reach * 0.018)),
        commentList: [
            `${campaign.hashtag} brought the community together this week.`,
            campaign.type === 'CASTING_WISH' ? 'A fan wish, not casting news.' : 'The fan edits are everywhere on my feed.',
            campaign.outcome === 'MESSY' ? 'This conversation got intense fast.' : 'Love seeing a fan-run moment grow naturally.',
        ],
        mood: campaign.outcome === 'MESSY' ? 'MESSY' : 'SUPPORTIVE',
        isPlayer: false,
        industryEventId: campaign.industryEventId,
        mediaStoryId: campaign.mediaStoryId,
        fandomId: fandom.id,
        campaignId: campaign.id,
        campaignMomentId: moment.id,
        ...(campaign.mediaClaimId ? { mediaClaimId: campaign.mediaClaimId } : {}),
        ...(fandom.companyId ? { companyId: fandom.companyId } : {}),
        ...(fandom.projectId ? { projectId: fandom.projectId } : {}),
    };
    const xPost = moment.xPostId ? {
        id: moment.xPostId,
        authorId: fandom.id,
        authorName: fandom.name,
        authorHandle: fandom.handle,
        authorAvatar: fandom.avatar,
        content: moment.caption,
        timestamp: moment.absoluteWeek,
        likes: Math.max(20, Math.round(moment.reach * 0.05)),
        retweets: Math.max(3, Math.round(moment.reach * 0.014)),
        replies: Math.max(2, Math.round(moment.participation * 0.025)),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: false,
        postType: 'FILM_OPINION' as const,
        sentiment: campaign.outcome === 'MESSY' ? 'MESSY' as const : 'SUPPORTIVE' as const,
        industryEventId: campaign.industryEventId,
        mediaStoryId: campaign.mediaStoryId,
        fandomId: fandom.id,
        campaignId: campaign.id,
        campaignMomentId: moment.id,
        ...(campaign.mediaClaimId ? { mediaClaimId: campaign.mediaClaimId } : {}),
        ...(fandom.companyId ? { companyId: fandom.companyId } : {}),
        ...(fandom.projectId ? { projectId: fandom.projectId } : {}),
    } : undefined;
    return { instaPost, ...(xPost ? { xPost } : {}) };
};

const prependUnique = <T extends { id: string }>(created: T[], existing: T[], limit: number): T[] => {
    const seen = new Set<string>();
    return [...created, ...existing].filter(item => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    }).slice(0, limit);
};

const applyPeakToFandom = (
    fandom: IndustryMediaFandom,
    campaign: IndustryMediaCampaign,
): IndustryMediaFandom => {
    const outcome = campaign.outcome;
    const growthRate = outcome === 'BREAKOUT' ? 0.28 : outcome === 'STRONG' ? 0.13
        : outcome === 'MODEST' ? 0.045 : outcome === 'MESSY' ? 0.035 : 0.005;
    const loyaltyDelta = outcome === 'BREAKOUT' ? 5 : outcome === 'STRONG' ? 3
        : outcome === 'MESSY' ? -3 : outcome === 'FIZZLED' ? -1 : 1;
    return {
        ...fandom,
        size: fandom.size + Math.max(20, Math.round(fandom.size * growthRate)),
        loyalty: safeInteger(fandom.loyalty + loyaltyDelta, 0, 100),
        activity: safeInteger(fandom.activity + (outcome === 'FIZZLED' ? -6 : outcome === 'MESSY' ? 5 : 3), 0, 100),
        coordination: safeInteger(fandom.coordination + (outcome === 'BREAKOUT' ? 5 : outcome === 'FIZZLED' ? -2 : 1), 0, 100),
        optimism: safeInteger(fandom.optimism + (outcome === 'MESSY' ? -5 : outcome === 'FIZZLED' ? -3 : 2), 0, 100),
        volatility: safeInteger(fandom.volatility + (outcome === 'MESSY' ? 8 : -1), 0, 100),
        lastActiveAbsoluteWeek: campaign.lastAdvancedAbsoluteWeek,
    };
};

const startCampaign = (
    player: Player,
    state: IndustryMediaWorldState,
    fandom: IndustryMediaFandom,
    story: IndustryMediaStory,
    event: IndustryEventFact,
    absoluteWeek: number,
): IndustryMediaCampaign => {
    const hitVideo = [...state.youtubeVideos]
        .filter(video => video.subjectKey === story.subjectKey && (video.outcome === 'HIT' || video.outcome === 'BREAKOUT'))
        .sort((left, right) => right.publishedAbsoluteWeek - left.publishedAbsoluteWeek)[0];
    const response = [...state.playerResponses]
        .filter(item => item.mediaStoryId === story.id && item.status === 'RESOLVED')
        .sort((left, right) => (right.resolvedAbsoluteWeek || 0) - (left.resolvedAbsoluteWeek || 0))[0];
    const linkedClaim = (hitVideo?.mediaClaimId
        ? state.claims.find(claim => claim.id === hitVideo.mediaClaimId)
        : undefined) || [...state.claims]
        .filter(claim => claim.anchorStoryId === story.id && claim.createdAbsoluteWeek < absoluteWeek)
        .sort((left, right) => right.createdAbsoluteWeek - left.createdAbsoluteWeek || left.id.localeCompare(right.id))[0];
    const type = selectIndustryMediaCampaignType(event.type, {
        hasHitVideo: Boolean(hitVideo),
        hasResponse: Boolean(response),
        hasRival: fandom.rivalSubjectKeys.length > 0,
    });
    const campaignKey = `fandom-campaign:${fandom.id}:${event.id}:${type}`;
    const draft = createIndustryMediaCampaignDraft({ player, fandom, story, event, type, absoluteWeek });
    const rng = createDeterministicRng(`industry-campaign-performance:${campaignKey}`);
    const reach = Math.max(500, Math.round(fandom.size * (0.35 + fandom.activity / 140 + rng() * 0.25)));
    const participation = Math.max(100, Math.round(reach * (0.12 + fandom.coordination / 500)));
    const campaign: IndustryMediaCampaign = {
        schemaVersion: 1,
        id: createDeterministicId('industry_campaign', campaignKey),
        campaignKey,
        fandomId: fandom.id,
        industryEventId: event.id,
        mediaStoryId: story.id,
        evidenceEventIds: [...story.industryEventIds].slice(-INDUSTRY_MEDIA_CAMPAIGN_EVIDENCE_LIMIT),
        ...(hitVideo ? { youtubeVideoId: hitVideo.id } : {}),
        ...(response ? { responseId: response.id } : {}),
        ...(linkedClaim ? { mediaClaimId: linkedClaim.id } : {}),
        subjectKey: story.subjectKey,
        type,
        ...draft,
        stage: 'SPARK',
        startedAbsoluteWeek: absoluteWeek,
        lastAdvancedAbsoluteWeek: absoluteWeek,
        nextEligibleAbsoluteWeek: absoluteWeek + 1,
        reach,
        participation,
        coordination: fandom.coordination,
        sentiment: Math.round((fandom.optimism - 50) * 1.5),
        heat: safeInteger((fandom.activity + fandom.volatility) / 2, 0, 100),
        performanceRoll: rng(),
        playerRelated: story.companyId === player.id,
        moments: [],
    };
    return { ...campaign, moments: [createCampaignMoment(campaign, 'SPARK', absoluteWeek)] };
};

const advanceCampaign = (
    campaign: IndustryMediaCampaign,
    fandom: IndustryMediaFandom,
    story: IndustryMediaStory,
    state: IndustryMediaWorldState,
    absoluteWeek: number,
): IndustryMediaCampaign => {
    const stage = nextStage(campaign.stage);
    const creatorLift = campaign.youtubeVideoId
        ? state.youtubeVideos.find(item => item.id === campaign.youtubeVideoId)?.outcome === 'BREAKOUT' ? 20 : 12
        : 0;
    const outcome = stage === 'PEAK'
        ? calculateIndustryMediaCampaignOutcome({
            fandom,
            importance: story.importance,
            performanceRoll: campaign.performanceRoll,
            creatorLift,
        })
        : campaign.outcome;
    const next: IndustryMediaCampaign = {
        ...campaign,
        stage,
        lastAdvancedAbsoluteWeek: absoluteWeek,
        nextEligibleAbsoluteWeek: absoluteWeek + 1,
        ...(outcome ? { outcome } : {}),
        ...(stage === 'CLOSED' ? { terminalAbsoluteWeek: absoluteWeek } : {}),
    };
    if (stage === 'CLOSED') return next;
    const moment = createCampaignMoment(next, stage, absoluteWeek, outcome);
    return { ...next, moments: [...next.moments, moment].slice(-INDUSTRY_MEDIA_CAMPAIGN_MOMENT_LIMIT) };
};

export interface IndustryMediaFandomResult {
    player: Player;
    createdFandoms: IndustryMediaFandom[];
    startedCampaigns: IndustryMediaCampaign[];
    advancedCampaigns: IndustryMediaCampaign[];
    instaPosts: InstaPost[];
    xPosts: XPost[];
}

export interface IndustryMediaCampaignParticipationDraft {
    postType: InstaPostType;
    caption: string;
}

export const getIndustryMediaCampaignParticipationDraft = (
    campaign: Pick<IndustryMediaCampaign, 'hashtag' | 'headline' | 'purpose' | 'type'>,
    fandom: Pick<IndustryMediaFandom, 'name' | 'subjectName'>,
    mode: IndustryMediaCampaignParticipationMode,
): IndustryMediaCampaignParticipationDraft => {
    const hashtag = normalizeIndustryMediaHashtag(campaign.hashtag);
    if (mode === 'THANK') {
        return {
            postType: 'ANNOUNCEMENT',
            caption: `Thank you to ${fandom.name} and everyone showing up for ${fandom.subjectName}. This belongs to the fans. ${hashtag}`,
        };
    }
    return {
        postType: 'ANNOUNCEMENT',
        caption: campaign.type === 'SAVE_THE_PROJECT'
            ? `We hear how much ${fandom.subjectName} means to you. Keep making your voices heard. ${hashtag}`
            : `We see the love behind ${campaign.headline.toLowerCase()}. We're joining the moment with you. ${hashtag}`,
    };
};

export const applyIndustryMediaCampaignParticipation = (
    player: Player,
    campaignId: string,
    mode: IndustryMediaCampaignParticipationMode,
    absoluteWeek: number,
): Player => {
    const state = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const campaign = state.campaigns.find(item => item.id === campaignId);
    if (!campaign || !campaign.playerRelated || campaign.stage === 'CLOSED' || campaign.playerParticipation) return player;
    const fandom = state.fandoms.find(item => item.id === campaign.fandomId);
    if (!fandom) return player;

    const rng = createDeterministicRng(`industry-campaign-player-participation:${campaign.id}:${mode}`);
    const responseFit = mode === 'THANK' ? fandom.loyalty : fandom.activity;
    const followerDelta = safeInteger(
        Math.min(50_000, campaign.reach * (0.025 + responseFit / 2_500) * (0.82 + rng() * 0.36)),
        0,
        50_000,
    );
    const fanLoyaltyDelta = safeInteger(
        1 + responseFit / 34 + (mode === 'THANK' ? 0.8 : 0) + rng(),
        0,
        5,
    );
    const controversyDelta = safeInteger(
        mode === 'JOIN' ? fandom.volatility / 34 + rng() * 1.8 : fandom.volatility / 75 + rng(),
        0,
        5,
    );
    const participation = {
        mode,
        absoluteWeek: safeInteger(absoluteWeek, campaign.startedAbsoluteWeek),
        followerDelta,
        fanLoyaltyDelta,
        controversyDelta,
    };
    const campaigns = state.campaigns.map(item => item.id === campaign.id ? {
        ...item,
        playerParticipation: participation,
        heat: safeInteger(item.heat + (mode === 'JOIN' ? 5 : 3), 0, 100),
        participation: item.participation + Math.max(50, Math.round(followerDelta * 0.18)),
    } : item);
    const fandoms = state.fandoms.map(item => item.id === fandom.id ? {
        ...item,
        loyalty: safeInteger(item.loyalty + fanLoyaltyDelta, 0, 100),
        activity: safeInteger(item.activity + (mode === 'JOIN' ? 3 : 2), 0, 100),
        volatility: safeInteger(item.volatility + controversyDelta - (mode === 'THANK' ? 1 : 0), 0, 100),
        lastActiveAbsoluteWeek: Math.max(item.lastActiveAbsoluteWeek, absoluteWeek),
    } : item);
    return {
        ...player,
        instagram: {
            ...player.instagram,
            followers: player.instagram.followers + followerDelta,
            fanLoyalty: safeInteger(player.instagram.fanLoyalty + fanLoyaltyDelta, 0, 100),
            controversy: safeInteger(player.instagram.controversy + controversyDelta, 0, 100),
        },
        world: {
            ...player.world,
            industryMedia: normalizeIndustryMediaWorld({ ...state, campaigns, fandoms }),
        },
    };
};

export const processIndustryMediaFandoms = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaFandomResult => {
    let state = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const createdFandoms = qualifyIndustryMediaFandoms(player, absoluteWeek, state);
    state = normalizeIndustryMediaWorld({ ...state, fandoms: [...state.fandoms, ...createdFandoms] });
    const storyById = new Map(state.stories.map(story => [story.id, story]));
    const fandomById = new Map(state.fandoms.map(fandom => [fandom.id, { ...fandom }]));
    const advancedCampaigns: IndustryMediaCampaign[] = [];
    const momentPairs: Array<{ fandom: IndustryMediaFandom; campaign: IndustryMediaCampaign; moment: IndustryMediaCampaignMoment }> = [];
    let campaigns = state.campaigns.map(campaign => {
        if (advancedCampaigns.length >= 2 || campaign.stage === 'CLOSED'
            || campaign.lastAdvancedAbsoluteWeek >= absoluteWeek
            || campaign.nextEligibleAbsoluteWeek > absoluteWeek) return campaign;
        const fandom = fandomById.get(campaign.fandomId);
        const story = storyById.get(campaign.mediaStoryId);
        if (!fandom || !story) return campaign;
        const advanced = advanceCampaign(campaign, fandom, story, state, absoluteWeek);
        advancedCampaigns.push(advanced);
        const newestMoment = advanced.moments[advanced.moments.length - 1];
        if (newestMoment?.absoluteWeek === absoluteWeek) momentPairs.push({ fandom, campaign: advanced, moment: newestMoment });
        const updatedFandom = advanced.stage === 'PEAK'
            ? applyPeakToFandom(fandom, advanced)
            : { ...fandom, lastActiveAbsoluteWeek: absoluteWeek };
        fandomById.set(fandom.id, updatedFandom);
        return advanced;
    });

    const eventLedger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const eventById = new Map(eventLedger.events.map(event => [event.id, event]));
    const processedKeys = new Set(state.processedFandomKeys);
    const startedCampaigns: IndustryMediaCampaign[] = [];
    if (momentPairs.length < 2) {
        const candidate = state.fandoms.flatMap(fandom => {
            const story = state.stories.find(item => item.subjectKey === fandom.subjectKey
                && item.importance !== 'LOW'
                && !['FADED', 'SUPERSEDED'].includes(item.stage)
                && absoluteWeek - item.lastAdvancedAbsoluteWeek <= 8);
            if (!story) return [];
            const event = [...story.industryEventIds]
                .map(id => eventById.get(id))
                .filter((item): item is IndustryEventFact => Boolean(item) && item.absoluteWeek <= absoluteWeek)
                .sort((left, right) => right.absoluteWeek - left.absoluteWeek || left.id.localeCompare(right.id))[0];
            if (!event) return [];
            const hitVideo = state.youtubeVideos.some(video => video.subjectKey === story.subjectKey
                && (video.outcome === 'HIT' || video.outcome === 'BREAKOUT'));
            const response = state.playerResponses.some(item => item.mediaStoryId === story.id && item.status === 'RESOLVED');
            const type = selectIndustryMediaCampaignType(event.type, {
                hasHitVideo: hitVideo, hasResponse: response, hasRival: fandom.rivalSubjectKeys.length > 0,
            });
            const key = `fandom-campaign:${fandom.id}:${event.id}:${type}`;
            if (processedKeys.has(key)) return [];
            const importance = story.importance === 'HIGH' ? 3 : 2;
            return [{ fandom, story, event, key, score: importance * 100 + fandom.activity + fandom.coordination }];
        }).sort((left, right) => right.score - left.score || left.key.localeCompare(right.key))[0];
        if (candidate) {
            const campaign = startCampaign(player, state, candidate.fandom, candidate.story, candidate.event, absoluteWeek);
            campaigns = [...campaigns, campaign];
            startedCampaigns.push(campaign);
            processedKeys.add(campaign.campaignKey);
            const newestMoment = campaign.moments[campaign.moments.length - 1];
            momentPairs.push({ fandom: candidate.fandom, campaign, moment: newestMoment });
            fandomById.set(candidate.fandom.id, {
                ...candidate.fandom,
                lastActiveAbsoluteWeek: absoluteWeek,
                recentCampaignIds: [...candidate.fandom.recentCampaignIds.filter(id => id !== campaign.id), campaign.id]
                    .slice(-INDUSTRY_MEDIA_FANDOM_RECENT_CAMPAIGN_LIMIT),
            });
        }
    }

    state = normalizeIndustryMediaWorld({
        ...state,
        fandoms: [...fandomById.values()],
        campaigns,
        processedFandomKeys: [...processedKeys],
    });
    const instaPosts: InstaPost[] = [];
    const xPosts: XPost[] = [];
    momentPairs.slice(0, 2).forEach(pair => {
        const currentFandom = state.fandoms.find(item => item.id === pair.fandom.id) || pair.fandom;
        const posts = campaignPosts(currentFandom, pair.campaign, pair.moment);
        instaPosts.push(posts.instaPost);
        if (posts.xPost) xPosts.push(posts.xPost);
    });
    const nextPlayer: Player = {
        ...player,
        world: { ...player.world, industryMedia: state },
        ...(instaPosts.length ? {
            instagram: { ...player.instagram, feed: prependUnique(instaPosts, player.instagram?.feed || [], 50) },
        } : {}),
        ...(xPosts.length ? {
            x: { ...player.x, feed: prependUnique(xPosts, player.x?.feed || [], 80) },
        } : {}),
    };
    return { player: nextPlayer, createdFandoms, startedCampaigns, advancedCampaigns, instaPosts, xPosts };
};
