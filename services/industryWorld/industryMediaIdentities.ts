import type {
    IndustryMediaChannel,
    IndustryMediaClaimMode,
    IndustryMediaInstitution,
    IndustryMediaInstitutionKind,
    IndustryMediaPersonality,
    IndustryMediaPersonalityRole,
    IndustryMediaStoryAssignment,
    IndustryMediaStoryCategory,
    IndustryMediaSubjectStance,
    IndustryMediaVoiceArchetype,
    IndustryMediaWorldState,
    NPCActor,
} from '../../types';

export const INDUSTRY_MEDIA_ANCHOR_INSTITUTION_LIMIT = 16;
export const INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT = 16;
export const INDUSTRY_MEDIA_ANCHOR_PERSONALITY_LIMIT = 40;
export const INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT = 40;
export const INDUSTRY_MEDIA_RECENT_STORY_LIMIT = 12;
export const INDUSTRY_MEDIA_STANCE_LIMIT = 320;
export const INDUSTRY_MEDIA_ASSIGNMENTS_PER_STORY_LIMIT = 4;
export const INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT = 960;

const CHANNELS = new Set<IndustryMediaChannel>(['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE']);
const INSTITUTION_KINDS = new Set<IndustryMediaInstitutionKind>([
    'TRADE', 'BUSINESS', 'PRESTIGE', 'TABLOID', 'STREAMING', 'REGIONAL', 'FANDOM',
]);
const ROLES = new Set<IndustryMediaPersonalityRole>([
    'REPORTER', 'INVESTIGATOR', 'BUSINESS_ANALYST', 'CRITIC', 'COLUMNIST',
    'COMMENTATOR', 'THEORY_CREATOR',
]);
const VOICES = new Set<IndustryMediaVoiceArchetype>([
    'MEASURED', 'INSIDER', 'NUMBERS_FIRST', 'AUTEUR', 'PROVOCATEUR', 'POPULIST', 'FAN_SCHOLAR',
]);
const CLAIM_MODES = new Set<IndustryMediaClaimMode>(['FACT', 'ANALYSIS', 'OPINION', 'SPECULATION']);
const CATEGORIES = new Set<IndustryMediaStoryCategory>([
    'COMPANY', 'PROJECT_DEVELOPMENT', 'PROJECT_PRODUCTION', 'PROJECT_RELEASE',
    'PROJECT_OUTCOME', 'RIGHTS', 'FRANCHISE', 'AWARDS', 'PARTNERSHIP',
]);
const GENDERS = new Set(['MALE', 'FEMALE', 'NON_BINARY'] as const);

const allCategories: IndustryMediaStoryCategory[] = [...CATEGORIES];
const projectCategories: IndustryMediaStoryCategory[] = [
    'PROJECT_DEVELOPMENT', 'PROJECT_PRODUCTION', 'PROJECT_RELEASE', 'PROJECT_OUTCOME',
    'FRANCHISE', 'AWARDS',
];
const businessCategories: IndustryMediaStoryCategory[] = ['COMPANY', 'RIGHTS', 'PARTNERSHIP', 'PROJECT_OUTCOME'];

const clamp = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, Math.round(numeric))) : fallback;
};
const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const safeWeek = (value: unknown): number => clamp(value, -1, Number.MAX_SAFE_INTEGER, -1);
const uniqueText = (value: unknown, limit: number): string[] => (
    Array.isArray(value)
        ? [...new Set(value.map(cleanText).filter(Boolean))].slice(-limit)
        : []
);
const normalizeChannels = (value: unknown): IndustryMediaChannel[] => (
    uniqueText(value, CHANNELS.size).filter((item): item is IndustryMediaChannel => (
        CHANNELS.has(item as IndustryMediaChannel)
    ))
);
const normalizeCategories = (value: unknown): IndustryMediaStoryCategory[] => (
    uniqueText(value, CATEGORIES.size).filter((item): item is IndustryMediaStoryCategory => (
        CATEGORIES.has(item as IndustryMediaStoryCategory)
    ))
);
const handleFor = (value: unknown, fallback: string): string => {
    const cleaned = cleanText(value).replace(/\s+/g, '');
    if (!cleaned) return fallback;
    return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
};
const colorFor = (value: unknown, fallback: string): string => {
    const cleaned = cleanText(value);
    return /^#[0-9a-f]{6}$/i.test(cleaned) ? cleaned.toUpperCase() : fallback;
};

type InstitutionSeed = Pick<
    IndustryMediaInstitution,
    'id' | 'name' | 'shortName' | 'kind' | 'homeRegionId' | 'coveredRegionIds'
    | 'focusCategories' | 'primaryColor' | 'secondaryColor' | 'credibility' | 'reach'
    | 'access' | 'sensationalism' | 'prestige'
> & Partial<Pick<IndustryMediaInstitution, 'channels' | 'languageIds'>>;

const institution = (seed: InstitutionSeed): IndustryMediaInstitution => ({
    schemaVersion: 1,
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    kind: seed.kind,
    handles: {
        NEWS: `@${seed.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
        X: `@${seed.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
        INSTAGRAM: `@${seed.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
    },
    channels: seed.channels || ['NEWS', 'X', 'INSTAGRAM'],
    homeRegionId: seed.homeRegionId,
    coveredRegionIds: seed.coveredRegionIds,
    languageIds: seed.languageIds || ['en'],
    focusCategories: seed.focusCategories,
    primaryColor: seed.primaryColor,
    secondaryColor: seed.secondaryColor,
    avatar: `media-institution:${seed.id}`,
    credibility: seed.credibility,
    reach: seed.reach,
    access: seed.access,
    sensationalism: seed.sensationalism,
    prestige: seed.prestige,
    isAnchor: true,
    isActive: true,
});

const ANCHOR_INSTITUTIONS: IndustryMediaInstitution[] = [
    institution({ id: 'screenline_trade', name: 'Screenline', shortName: 'Screenline', kind: 'TRADE', homeRegionId: 'GLOBAL', coveredRegionIds: ['GLOBAL', 'NORTH_AMERICA', 'EUROPE', 'INDIA', 'EAST_ASIA'], focusCategories: allCategories, primaryColor: '#E11D48', secondaryColor: '#18181B', credibility: 88, reach: 82, access: 94, sensationalism: 24, prestige: 82 }),
    institution({ id: 'ledger_media', name: 'The Media Ledger', shortName: 'Ledger', kind: 'BUSINESS', homeRegionId: 'GLOBAL', coveredRegionIds: ['GLOBAL', 'NORTH_AMERICA', 'EUROPE', 'INDIA', 'EAST_ASIA'], focusCategories: businessCategories, primaryColor: '#0F766E', secondaryColor: '#042F2E', credibility: 91, reach: 76, access: 86, sensationalism: 12, prestige: 90 }),
    institution({ id: 'aperture_review', name: 'Aperture Review', shortName: 'Aperture', kind: 'PRESTIGE', homeRegionId: 'EUROPE', coveredRegionIds: ['GLOBAL', 'EUROPE', 'NORTH_AMERICA'], focusCategories: projectCategories, primaryColor: '#C4A35A', secondaryColor: '#1C1917', credibility: 90, reach: 66, access: 72, sensationalism: 10, prestige: 96 }),
    institution({ id: 'flashpoint_entertainment', name: 'Flashpoint Entertainment', shortName: 'Flashpoint', kind: 'TABLOID', homeRegionId: 'NORTH_AMERICA', coveredRegionIds: ['GLOBAL', 'NORTH_AMERICA', 'EUROPE'], focusCategories: ['COMPANY', 'PROJECT_DEVELOPMENT', 'PROJECT_PRODUCTION', 'PROJECT_RELEASE', 'AWARDS'], primaryColor: '#F43F5E', secondaryColor: '#4C0519', credibility: 48, reach: 91, access: 65, sensationalism: 94, prestige: 28 }),
    institution({ id: 'streamscope', name: 'StreamScope', shortName: 'StreamScope', kind: 'STREAMING', homeRegionId: 'GLOBAL', coveredRegionIds: ['GLOBAL', 'NORTH_AMERICA', 'EUROPE', 'INDIA', 'EAST_ASIA', 'LATIN_AMERICA'], focusCategories: ['COMPANY', 'RIGHTS', 'PARTNERSHIP', 'PROJECT_RELEASE', 'PROJECT_OUTCOME'], primaryColor: '#38BDF8', secondaryColor: '#082F49', credibility: 84, reach: 72, access: 88, sensationalism: 22, prestige: 72 }),
    institution({ id: 'cinema_bharat', name: 'Cinema Bharat', shortName: 'Cinema Bharat', kind: 'REGIONAL', homeRegionId: 'INDIA', coveredRegionIds: ['INDIA', 'SOUTH_ASIA'], focusCategories: allCategories, primaryColor: '#F97316', secondaryColor: '#7C2D12', credibility: 82, reach: 78, access: 87, sensationalism: 35, prestige: 73, languageIds: ['en', 'hi'] }),
    institution({ id: 'han_river_screen', name: 'Han River Screen', shortName: 'Han River', kind: 'REGIONAL', homeRegionId: 'EAST_ASIA', coveredRegionIds: ['EAST_ASIA', 'JAPAN', 'KOREA'], focusCategories: allCategories, primaryColor: '#A78BFA', secondaryColor: '#2E1065', credibility: 84, reach: 74, access: 85, sensationalism: 25, prestige: 79, languageIds: ['en', 'ko', 'ja'] }),
    institution({ id: 'luz_cinema', name: 'Luz Cinema', shortName: 'Luz', kind: 'REGIONAL', homeRegionId: 'LATIN_AMERICA', coveredRegionIds: ['LATIN_AMERICA', 'SOUTH_AMERICA'], focusCategories: allCategories, primaryColor: '#FACC15', secondaryColor: '#713F12', credibility: 78, reach: 70, access: 77, sensationalism: 38, prestige: 68, languageIds: ['es', 'pt-BR', 'en'] }),
    institution({ id: 'africa_screen_report', name: 'Africa Screen Report', shortName: 'ASR', kind: 'REGIONAL', homeRegionId: 'AFRICA', coveredRegionIds: ['AFRICA'], focusCategories: allCategories, primaryColor: '#22C55E', secondaryColor: '#052E16', credibility: 81, reach: 64, access: 79, sensationalism: 20, prestige: 74 }),
    institution({ id: 'lorewire', name: 'LoreWire', shortName: 'LoreWire', kind: 'FANDOM', homeRegionId: 'GLOBAL', coveredRegionIds: ['GLOBAL', 'NORTH_AMERICA', 'EUROPE', 'INDIA', 'EAST_ASIA', 'LATIN_AMERICA', 'AFRICA'], focusCategories: ['PROJECT_DEVELOPMENT', 'PROJECT_RELEASE', 'FRANCHISE', 'AWARDS'], primaryColor: '#8B5CF6', secondaryColor: '#2E1065', credibility: 68, reach: 85, access: 42, sensationalism: 56, prestige: 52, channels: ['X', 'INSTAGRAM', 'YOUTUBE'] }),
];

type PersonalitySeed = Pick<
    IndustryMediaPersonality,
    'id' | 'name' | 'gender' | 'institutionId' | 'role' | 'voiceArchetype'
    | 'homeRegionId' | 'focusCategories' | 'credibility' | 'reach' | 'aggression'
    | 'optimism' | 'humour' | 'sensationalism' | 'independence' | 'baselinePlayerAffinity'
> & Partial<Pick<
    IndustryMediaPersonality,
    'channels' | 'languageIds' | 'preferredGenreIds' | 'signatureRole' | 'stanceFloor' | 'stanceCeiling'
>>;

const personality = (seed: PersonalitySeed): IndustryMediaPersonality => ({
    schemaVersion: 1,
    id: seed.id,
    name: seed.name,
    handle: `@${seed.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
    avatar: `media-personality:${seed.id}`,
    gender: seed.gender,
    institutionId: seed.institutionId,
    role: seed.role,
    voiceArchetype: seed.voiceArchetype,
    channels: seed.channels || ['NEWS', 'X'],
    homeRegionId: seed.homeRegionId,
    languageIds: seed.languageIds || ['en'],
    focusCategories: seed.focusCategories,
    preferredGenreIds: seed.preferredGenreIds || [],
    credibility: seed.credibility,
    reach: seed.reach,
    aggression: seed.aggression,
    optimism: seed.optimism,
    humour: seed.humour,
    sensationalism: seed.sensationalism,
    independence: seed.independence,
    baselinePlayerAffinity: seed.baselinePlayerAffinity,
    stanceFloor: seed.stanceFloor ?? -100,
    stanceCeiling: seed.stanceCeiling ?? 100,
    signatureRole: seed.signatureRole,
    isAnchor: true,
    isActive: true,
    verified: seed.reach >= 65,
    lastAppearanceAbsoluteWeek: -1,
    recentStoryIds: [],
});

const ANCHOR_PERSONALITIES: IndustryMediaPersonality[] = [
    personality({ id: 'mara_voss', name: 'Mara Voss', gender: 'FEMALE', institutionId: 'screenline_trade', role: 'REPORTER', voiceArchetype: 'INSIDER', homeRegionId: 'GLOBAL', focusCategories: allCategories, credibility: 91, reach: 78, aggression: 38, optimism: 48, humour: 18, sensationalism: 18, independence: 82, baselinePlayerAffinity: 0 }),
    personality({ id: 'jonas_mercer', name: 'Jonas Mercer', gender: 'MALE', institutionId: 'screenline_trade', role: 'INVESTIGATOR', voiceArchetype: 'MEASURED', homeRegionId: 'NORTH_AMERICA', focusCategories: ['COMPANY', 'PROJECT_PRODUCTION', 'RIGHTS', 'PARTNERSHIP'], credibility: 94, reach: 72, aggression: 62, optimism: 32, humour: 8, sensationalism: 12, independence: 94, baselinePlayerAffinity: -5 }),
    personality({ id: 'dev_malhotra', name: 'Dev Malhotra', gender: 'MALE', institutionId: 'ledger_media', role: 'BUSINESS_ANALYST', voiceArchetype: 'NUMBERS_FIRST', homeRegionId: 'INDIA', focusCategories: businessCategories, credibility: 92, reach: 73, aggression: 44, optimism: 43, humour: 10, sensationalism: 8, independence: 88, baselinePlayerAffinity: 0, languageIds: ['en', 'hi'], channels: ['NEWS', 'X', 'YOUTUBE'] }),
    personality({ id: 'elise_marrow', name: 'Elise Marrow', gender: 'FEMALE', institutionId: 'aperture_review', role: 'CRITIC', voiceArchetype: 'AUTEUR', homeRegionId: 'EUROPE', focusCategories: projectCategories, credibility: 93, reach: 69, aggression: 55, optimism: 48, humour: 21, sensationalism: 9, independence: 96, baselinePlayerAffinity: 0, channels: ['NEWS', 'X', 'YOUTUBE'] }),
    personality({ id: 'roxie_vale', name: 'Roxie Vale', gender: 'FEMALE', institutionId: 'flashpoint_entertainment', role: 'COLUMNIST', voiceArchetype: 'POPULIST', homeRegionId: 'NORTH_AMERICA', focusCategories: ['COMPANY', 'PROJECT_DEVELOPMENT', 'PROJECT_PRODUCTION', 'PROJECT_RELEASE', 'AWARDS'], credibility: 52, reach: 88, aggression: 72, optimism: 36, humour: 66, sensationalism: 91, independence: 58, baselinePlayerAffinity: -12, channels: ['NEWS', 'X', 'INSTAGRAM'] }),
    personality({ id: 'noah_pike', name: 'Noah Pike', gender: 'MALE', institutionId: 'streamscope', role: 'BUSINESS_ANALYST', voiceArchetype: 'NUMBERS_FIRST', homeRegionId: 'GLOBAL', focusCategories: ['COMPANY', 'RIGHTS', 'PARTNERSHIP', 'PROJECT_RELEASE', 'PROJECT_OUTCOME'], credibility: 88, reach: 74, aggression: 42, optimism: 45, humour: 14, sensationalism: 15, independence: 84, baselinePlayerAffinity: 0, channels: ['NEWS', 'X', 'YOUTUBE'] }),
    personality({ id: 'anaya_rao', name: 'Anaya Rao', gender: 'FEMALE', institutionId: 'cinema_bharat', role: 'REPORTER', voiceArchetype: 'INSIDER', homeRegionId: 'INDIA', focusCategories: allCategories, credibility: 88, reach: 77, aggression: 45, optimism: 59, humour: 22, sensationalism: 24, independence: 87, baselinePlayerAffinity: 4, languageIds: ['en', 'hi'], channels: ['NEWS', 'X', 'INSTAGRAM'] }),
    personality({ id: 'mina_park', name: 'Mina Park', gender: 'FEMALE', institutionId: 'han_river_screen', role: 'CRITIC', voiceArchetype: 'MEASURED', homeRegionId: 'EAST_ASIA', focusCategories: projectCategories, credibility: 89, reach: 71, aggression: 39, optimism: 52, humour: 17, sensationalism: 12, independence: 91, baselinePlayerAffinity: 0, languageIds: ['en', 'ko'] }),
    personality({ id: 'lucia_torres', name: 'Lucia Torres', gender: 'FEMALE', institutionId: 'luz_cinema', role: 'REPORTER', voiceArchetype: 'POPULIST', homeRegionId: 'LATIN_AMERICA', focusCategories: allCategories, credibility: 82, reach: 69, aggression: 41, optimism: 67, humour: 42, sensationalism: 31, independence: 81, baselinePlayerAffinity: 2, languageIds: ['es', 'pt-BR', 'en'] }),
    personality({ id: 'kwame_ndlovu', name: 'Kwame Ndlovu', gender: 'MALE', institutionId: 'africa_screen_report', role: 'COLUMNIST', voiceArchetype: 'MEASURED', homeRegionId: 'AFRICA', focusCategories: allCategories, credibility: 87, reach: 63, aggression: 46, optimism: 61, humour: 28, sensationalism: 16, independence: 92, baselinePlayerAffinity: 0 }),
    personality({ id: 'gideon_price', name: 'Gideon Price', gender: 'MALE', institutionId: 'flashpoint_entertainment', role: 'COMMENTATOR', voiceArchetype: 'PROVOCATEUR', homeRegionId: 'GLOBAL', focusCategories: allCategories, credibility: 61, reach: 94, aggression: 96, optimism: 18, humour: 62, sensationalism: 88, independence: 76, baselinePlayerAffinity: -82, stanceFloor: -100, stanceCeiling: -36, signatureRole: 'ANTAGONIST', channels: ['NEWS', 'X', 'YOUTUBE'] }),
    personality({ id: 'celeste_monroe', name: 'Celeste Monroe', gender: 'FEMALE', institutionId: 'aperture_review', role: 'COLUMNIST', voiceArchetype: 'AUTEUR', homeRegionId: 'GLOBAL', focusCategories: projectCategories, credibility: 84, reach: 79, aggression: 48, optimism: 83, humour: 35, sensationalism: 20, independence: 78, baselinePlayerAffinity: 72, stanceFloor: 24, stanceCeiling: 100, signatureRole: 'SUPPORTER', channels: ['NEWS', 'X'] }),
    personality({ id: 'ira_kapoor', name: 'Ira Kapoor', gender: 'NON_BINARY', institutionId: 'lorewire', role: 'THEORY_CREATOR', voiceArchetype: 'FAN_SCHOLAR', homeRegionId: 'INDIA', focusCategories: ['PROJECT_DEVELOPMENT', 'PROJECT_RELEASE', 'FRANCHISE'], credibility: 72, reach: 86, aggression: 22, optimism: 88, humour: 53, sensationalism: 46, independence: 90, baselinePlayerAffinity: 12, languageIds: ['en', 'hi'], preferredGenreIds: ['SCI_FI', 'FANTASY', 'SUPERHERO', 'MYSTERY'], channels: ['X', 'INSTAGRAM', 'YOUTUBE'] }),
    personality({ id: 'theo_grant', name: 'Theo Grant', gender: 'MALE', institutionId: 'lorewire', role: 'THEORY_CREATOR', voiceArchetype: 'FAN_SCHOLAR', homeRegionId: 'NORTH_AMERICA', focusCategories: ['PROJECT_DEVELOPMENT', 'PROJECT_RELEASE', 'FRANCHISE'], credibility: 66, reach: 77, aggression: 28, optimism: 76, humour: 64, sensationalism: 52, independence: 86, baselinePlayerAffinity: 0, preferredGenreIds: ['SCI_FI', 'THRILLER', 'HORROR', 'MYSTERY'], channels: ['X', 'INSTAGRAM', 'YOUTUBE'] }),
];

const cloneInstitution = (item: IndustryMediaInstitution): IndustryMediaInstitution => ({
    ...item,
    handles: { ...item.handles },
    channels: [...item.channels],
    coveredRegionIds: [...item.coveredRegionIds],
    languageIds: [...item.languageIds],
    focusCategories: [...item.focusCategories],
});
const clonePersonality = (item: IndustryMediaPersonality): IndustryMediaPersonality => ({
    ...item,
    channels: [...item.channels],
    languageIds: [...item.languageIds],
    focusCategories: [...item.focusCategories],
    preferredGenreIds: [...item.preferredGenreIds],
    recentStoryIds: [...item.recentStoryIds],
});

export const createDefaultIndustryMediaIdentities = (): Pick<
    IndustryMediaWorldState,
    'institutions' | 'personalities' | 'subjectStances' | 'storyAssignments'
> => ({
    institutions: ANCHOR_INSTITUTIONS.map(cloneInstitution),
    personalities: ANCHOR_PERSONALITIES.map(clonePersonality),
    subjectStances: [],
    storyAssignments: [],
});

export const normalizeIndustryMediaInstitution = (value: unknown): IndustryMediaInstitution | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaInstitution>;
    const id = cleanText(source.id);
    const name = cleanText(source.name);
    const shortName = cleanText(source.shortName) || name;
    if (!id || !name || !source.kind || !INSTITUTION_KINDS.has(source.kind)) return null;
    const channels = normalizeChannels(source.channels);
    const categories = normalizeCategories(source.focusCategories);
    if (!channels.length || !categories.length) return null;
    const handles: IndustryMediaInstitution['handles'] = {};
    channels.forEach(channel => {
        const raw = source.handles?.[channel];
        if (cleanText(raw)) handles[channel] = handleFor(raw, `@${id}`);
    });
    return {
        schemaVersion: 1,
        id,
        name,
        shortName,
        kind: source.kind,
        handles,
        channels,
        homeRegionId: cleanText(source.homeRegionId) || 'GLOBAL',
        coveredRegionIds: uniqueText(source.coveredRegionIds, 12).length
            ? uniqueText(source.coveredRegionIds, 12)
            : ['GLOBAL'],
        languageIds: uniqueText(source.languageIds, 8).length ? uniqueText(source.languageIds, 8) : ['en'],
        focusCategories: categories,
        primaryColor: colorFor(source.primaryColor, '#52525B'),
        secondaryColor: colorFor(source.secondaryColor, '#18181B'),
        avatar: cleanText(source.avatar) || `media-institution:${id}`,
        credibility: clamp(source.credibility, 0, 100, 50),
        reach: clamp(source.reach, 0, 100, 50),
        access: clamp(source.access, 0, 100, 50),
        sensationalism: clamp(source.sensationalism, 0, 100, 50),
        prestige: clamp(source.prestige, 0, 100, 50),
        isAnchor: source.isAnchor === true,
        isActive: source.isActive !== false,
    };
};

export const normalizeIndustryMediaPersonality = (value: unknown): IndustryMediaPersonality | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaPersonality>;
    const id = cleanText(source.id);
    const name = cleanText(source.name);
    if (!id || !name || !source.role || !ROLES.has(source.role) || !source.voiceArchetype || !VOICES.has(source.voiceArchetype)) return null;
    const channels = normalizeChannels(source.channels);
    const categories = normalizeCategories(source.focusCategories);
    if (!channels.length || !categories.length) return null;
    const floor = clamp(source.stanceFloor, -100, 100, -100);
    const ceiling = Math.max(floor, clamp(source.stanceCeiling, -100, 100, 100));
    const signatureRole = source.signatureRole === 'ANTAGONIST' || source.signatureRole === 'SUPPORTER'
        ? source.signatureRole
        : undefined;
    const gender = source.gender && GENDERS.has(source.gender as 'MALE' | 'FEMALE' | 'NON_BINARY')
        ? source.gender
        : 'NON_BINARY';
    return {
        schemaVersion: 1,
        id,
        name,
        handle: handleFor(source.handle, `@${id}`),
        avatar: cleanText(source.avatar) || `media-personality:${id}`,
        gender,
        ...(cleanText(source.institutionId) ? { institutionId: cleanText(source.institutionId) } : {}),
        role: source.role,
        voiceArchetype: source.voiceArchetype,
        channels,
        homeRegionId: cleanText(source.homeRegionId) || 'GLOBAL',
        languageIds: uniqueText(source.languageIds, 8).length ? uniqueText(source.languageIds, 8) : ['en'],
        focusCategories: categories,
        preferredGenreIds: uniqueText(source.preferredGenreIds, 12),
        credibility: clamp(source.credibility, 0, 100, 50),
        reach: clamp(source.reach, 0, 100, 50),
        aggression: clamp(source.aggression, 0, 100, 50),
        optimism: clamp(source.optimism, 0, 100, 50),
        humour: clamp(source.humour, 0, 100, 50),
        sensationalism: clamp(source.sensationalism, 0, 100, 50),
        independence: clamp(source.independence, 0, 100, 50),
        baselinePlayerAffinity: clamp(source.baselinePlayerAffinity, floor, ceiling, 0),
        stanceFloor: floor,
        stanceCeiling: ceiling,
        ...(signatureRole ? { signatureRole } : {}),
        isAnchor: source.isAnchor === true,
        isActive: source.isActive !== false,
        verified: source.verified === true,
        lastAppearanceAbsoluteWeek: safeWeek(source.lastAppearanceAbsoluteWeek),
        recentStoryIds: uniqueText(source.recentStoryIds, INDUSTRY_MEDIA_RECENT_STORY_LIMIT),
    };
};

const normalizeStance = (value: unknown, personalityIds: Set<string>): IndustryMediaSubjectStance | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaSubjectStance>;
    const personalityId = cleanText(source.personalityId);
    const subjectKey = cleanText(source.subjectKey);
    if (!personalityIds.has(personalityId) || !subjectKey) return null;
    return {
        id: `${personalityId}:${subjectKey}`,
        personalityId,
        subjectKey,
        affinity: clamp(source.affinity, -100, 100, 0),
        lastUpdatedAbsoluteWeek: safeWeek(source.lastUpdatedAbsoluteWeek),
        ...(cleanText(source.lastIndustryEventId) ? { lastIndustryEventId: cleanText(source.lastIndustryEventId) } : {}),
    };
};

const normalizeAssignment = (
    value: unknown,
    institutionIds: Set<string>,
    personalityIds: Set<string>,
): IndustryMediaStoryAssignment | null => {
    if (!value || typeof value !== 'object') return null;
    const source = value as Partial<IndustryMediaStoryAssignment>;
    const id = cleanText(source.id);
    const storyId = cleanText(source.storyId);
    const industryEventId = cleanText(source.industryEventId);
    const institutionId = cleanText(source.institutionId);
    if (!id || !storyId || !industryEventId || !institutionIds.has(institutionId)) return null;
    if (!source.channel || !CHANNELS.has(source.channel) || !source.angle || !CLAIM_MODES.has(source.angle)) return null;
    const personalityId = cleanText(source.personalityId);
    if (personalityId && !personalityIds.has(personalityId)) return null;
    const assignedAbsoluteWeek = safeWeek(source.assignedAbsoluteWeek);
    const lastUsedAbsoluteWeek = Math.max(assignedAbsoluteWeek, safeWeek(source.lastUsedAbsoluteWeek));
    return {
        id,
        storyId,
        industryEventId,
        channel: source.channel,
        institutionId,
        ...(personalityId ? { personalityId } : {}),
        angle: source.angle,
        assignedAbsoluteWeek,
        lastUsedAbsoluteWeek,
    };
};

const mergeInstitutions = (value: unknown): IndustryMediaInstitution[] => {
    const input = Array.isArray(value) ? value : [];
    const savedById = new Map(input.map(item => {
        const normalized = normalizeIndustryMediaInstitution(item);
        return normalized ? [normalized.id, normalized] as const : null;
    }).filter((item): item is readonly [string, IndustryMediaInstitution] => Boolean(item)));
    const anchors = ANCHOR_INSTITUTIONS.slice(0, INDUSTRY_MEDIA_ANCHOR_INSTITUTION_LIMIT).map(cloneInstitution);
    const anchorIds = new Set(anchors.map(item => item.id));
    const generated = [...savedById.values()]
        .filter(item => !item.isAnchor && !anchorIds.has(item.id))
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, INDUSTRY_MEDIA_GENERATED_INSTITUTION_LIMIT);
    return [...anchors, ...generated];
};

const mergePersonalities = (
    value: unknown,
    institutionIds: Set<string>,
): IndustryMediaPersonality[] => {
    const input = Array.isArray(value) ? value : [];
    const normalizedInput = input.map(normalizeIndustryMediaPersonality)
        .filter((item): item is IndustryMediaPersonality => Boolean(item));
    const savedById = new Map(normalizedInput.map(item => [item.id, item]));
    const anchors = ANCHOR_PERSONALITIES.slice(0, INDUSTRY_MEDIA_ANCHOR_PERSONALITY_LIMIT)
        .map(defaultItem => {
            const saved = savedById.get(defaultItem.id);
            return {
                ...clonePersonality(defaultItem),
                lastAppearanceAbsoluteWeek: saved?.lastAppearanceAbsoluteWeek ?? -1,
                recentStoryIds: saved?.recentStoryIds || [],
            };
        });
    const anchorIds = new Set(anchors.map(item => item.id));
    const generated = normalizedInput
        .filter(item => !item.isAnchor && !anchorIds.has(item.id))
        .filter(item => !item.institutionId || institutionIds.has(item.institutionId))
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, INDUSTRY_MEDIA_GENERATED_PERSONALITY_LIMIT);
    return [...anchors, ...generated];
};

const boundSubjectStances = (
    values: IndustryMediaSubjectStance[],
    personalities: IndustryMediaPersonality[],
): IndustryMediaSubjectStance[] => {
    const ordered = [...values].sort((left, right) => (
        left.lastUpdatedAbsoluteWeek - right.lastUpdatedAbsoluteWeek || left.id.localeCompare(right.id)
    ));
    if (ordered.length <= INDUSTRY_MEDIA_STANCE_LIMIT) return ordered;
    const signaturePersonalityIds = new Set(
        personalities.filter(item => Boolean(item.signatureRole)).map(item => item.id),
    );
    const signatureReserveLimit = Math.floor(INDUSTRY_MEDIA_STANCE_LIMIT / 4);
    const retainedSignature = ordered
        .filter(item => signaturePersonalityIds.has(item.personalityId))
        .slice(-signatureReserveLimit);
    const retainedSignatureIds = new Set(retainedSignature.map(item => item.id));
    const retainedRecent = ordered
        .filter(item => !retainedSignatureIds.has(item.id))
        .slice(-(INDUSTRY_MEDIA_STANCE_LIMIT - retainedSignature.length));
    return [...retainedSignature, ...retainedRecent].sort((left, right) => (
        left.lastUpdatedAbsoluteWeek - right.lastUpdatedAbsoluteWeek || left.id.localeCompare(right.id)
    ));
};

export const normalizeIndustryMediaIdentityCollections = (value: unknown): Pick<
    IndustryMediaWorldState,
    'institutions' | 'personalities' | 'subjectStances' | 'storyAssignments'
> => {
    const source = value && typeof value === 'object' ? value as Partial<IndustryMediaWorldState> : {};
    const institutions = mergeInstitutions(source.institutions);
    const institutionIds = new Set(institutions.map(item => item.id));
    const personalities = mergePersonalities(source.personalities, institutionIds);
    const personalityIds = new Set(personalities.map(item => item.id));
    const subjectStancesById = new Map<string, IndustryMediaSubjectStance>();
    (Array.isArray(source.subjectStances) ? source.subjectStances : []).forEach(raw => {
        const normalized = normalizeStance(raw, personalityIds);
        if (normalized) subjectStancesById.set(normalized.id, normalized);
    });
    const subjectStances = boundSubjectStances([...subjectStancesById.values()], personalities);
    const assignmentById = new Map<string, IndustryMediaStoryAssignment>();
    (Array.isArray(source.storyAssignments) ? source.storyAssignments : []).forEach(raw => {
        const normalized = normalizeAssignment(raw, institutionIds, personalityIds);
        if (normalized) assignmentById.set(normalized.id, normalized);
    });
    const perStoryCount = new Map<string, number>();
    const storyAssignments = [...assignmentById.values()]
        .sort((left, right) => right.lastUsedAbsoluteWeek - left.lastUsedAbsoluteWeek || left.id.localeCompare(right.id))
        .filter(item => {
            const count = perStoryCount.get(item.storyId) || 0;
            if (count >= INDUSTRY_MEDIA_ASSIGNMENTS_PER_STORY_LIMIT) return false;
            perStoryCount.set(item.storyId, count + 1);
            return true;
        })
        .slice(0, INDUSTRY_MEDIA_STORY_ASSIGNMENT_LIMIT)
        .sort((left, right) => left.assignedAbsoluteWeek - right.assignedAbsoluteWeek || left.id.localeCompare(right.id));
    return { institutions, personalities, subjectStances, storyAssignments };
};

const escapeXml = (value: string): string => value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[character] || character));

export const createIndustryMediaAvatar = (name: string, primaryColor: string): string => {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'M';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${escapeXml(primaryColor)}"/><text x="64" y="74" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#fff">${escapeXml(initials)}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const getIndustryMediaSocialProfiles = (mediaWorld: Pick<IndustryMediaWorldState, 'institutions' | 'personalities'>): NPCActor[] => {
    const institutions = new Map(mediaWorld.institutions.map(item => [item.id, item]));
    return mediaWorld.personalities.filter(item => item.isActive).map(item => {
        const owner = item.institutionId ? institutions.get(item.institutionId) : undefined;
        return {
            id: item.id,
            name: item.name,
            handle: item.handle,
            gender: item.gender,
            avatar: createIndustryMediaAvatar(item.name, owner?.primaryColor || '#52525B'),
            tier: item.reach >= 85 ? 'A_LIST' : item.reach >= 65 ? 'ESTABLISHED' : 'RISING',
            prestigeBias: item.role === 'CRITIC' ? 'PRESTIGE' : 'MIXED',
            openness: clamp(100 - item.aggression, 10, 90, 50),
            followers: Math.max(5_000, Math.round(item.reach * item.reach * 1_250)),
            netWorth: 0,
            occupation: 'EXECUTIVE',
            specialties: item.focusCategories,
            bio: `${item.role.replaceAll('_', ' ').toLowerCase()} at ${owner?.name || 'an independent media desk'}. ${item.voiceArchetype.replaceAll('_', ' ').toLowerCase()} industry voice.`,
        };
    });
};
