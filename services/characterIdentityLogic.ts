import {
    AuditionOpportunity,
    CharacterAbilityType,
    CharacterIdentityProfile,
    CharacterNature,
    CharacterStoryFunction,
    CharacterStoryRole,
    Genre,
    Player,
    ProjectDetails,
    RoleType,
    Script,
    StoryCastShape,
    StoryCompass,
    StoryConflictSource,
    StoryPerspective,
    StoryTone,
    StoryWorldRule,
} from '../types';
import { getRoleOfferMarketDecision } from './roleMarketDemand';
import {
    evaluateCharacterProfileFit,
    getCharacterIdentityOption,
} from './characterStoryFit';

type StorySource = Partial<Pick<
    Script,
    'genres' | 'logline' | 'options' | 'tags' | 'isOriginal' | 'storyCompass' | 'sourceMaterial'
>> & Partial<Pick<
    ProjectDetails,
    'genre' | 'description' | 'storyCompass' | 'isOriginal' | 'subtype' | 'universeId'
>>;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const STORY_PERSPECTIVES: StoryPerspective[] = ['PROTAGONIST_LED', 'VILLAIN_LED', 'DUAL', 'ENSEMBLE'];
const STORY_CONFLICT_SOURCES: StoryConflictSource[] = ['ANTAGONIST', 'RIVAL', 'INTERNAL', 'SOCIETY', 'NATURE', 'MYSTERY'];
const STORY_WORLD_RULES: StoryWorldRule[] = ['GROUNDED', 'MAGIC', 'TECHNOLOGY', 'SUPERNATURAL', 'SUPERPOWERED', 'MIXED'];
const STORY_TONES: StoryTone[] = ['HEROIC', 'DARK', 'COMEDIC', 'MORALLY_GREY', 'TRAGIC'];
const STORY_CAST_SHAPES: StoryCastShape[] = ['INTIMATE', 'BALANCED', 'ENSEMBLE'];
const STORY_FLEXIBILITY = ['OPEN', 'ADAPTABLE', 'PROTECTED'] as const;
const STORY_SOURCES: StoryCompass['source'][] = ['SCRIPT_DNA', 'MARKET_INFERENCE', 'AUTHOR_INTENT', 'CANON'];
const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T => (
    typeof value === 'string' && values.includes(value as T)
);
const normalizedText = (source: StorySource): string => [
    source.logline,
    source.description,
    ...(source.tags || []),
    ...(source.options || []).flatMap(option => [option.questionId, option.choiceId]),
].filter(Boolean).join(' ').toLowerCase();

const hasAny = (text: string, values: string[]) => values.some(value => text.includes(value));
const primaryGenre = (source: StorySource): Genre | undefined => source.genre || source.genres?.[0];

const inferWorldRule = (source: StorySource, text: string): StoryWorldRule => {
    const genre = primaryGenre(source);
    const hasMagic = genre === 'FANTASY' || hasAny(text, ['magic', 'myth', 'wizard', 'witch', 'spell', 'arcane']);
    const hasTechnology = genre === 'SCI_FI' || hasAny(text, ['robot', 'android', 'technology', 'cyber', 'machine', 'alien tech']);
    const hasSupernatural = genre === 'HORROR' || hasAny(text, ['ghost', 'vampire', 'demon', 'supernatural', 'spirit']);
    const hasSuperpowers = genre === 'SUPERHERO' || hasAny(text, ['superpower', 'superhero', 'mutant', 'power origin']);
    const lanes = [hasMagic, hasTechnology, hasSupernatural, hasSuperpowers].filter(Boolean).length;
    if (lanes > 1) return 'MIXED';
    if (hasSuperpowers) return 'SUPERPOWERED';
    if (hasMagic) return 'MAGIC';
    if (hasTechnology) return 'TECHNOLOGY';
    if (hasSupernatural) return 'SUPERNATURAL';
    return 'GROUNDED';
};

const inferPerspective = (text: string): StoryPerspective => {
    if (hasAny(text, ['villain-led', 'villain led', 'become the villain', 'antagonist perspective'])) return 'VILLAIN_LED';
    if (hasAny(text, ['ensemble', 'team-up', 'team up', 'found family', 'group'])) return 'ENSEMBLE';
    if (hasAny(text, ['dual protagonist', 'two leads', 'buddy', 'rivals forced together'])) return 'DUAL';
    return 'PROTAGONIST_LED';
};

const inferConflict = (text: string, genre?: Genre): StoryConflictSource => {
    if (hasAny(text, ['villain', 'antagonist', 'crime lord', 'dark mirror', 'nemesis'])) return 'ANTAGONIST';
    if (hasAny(text, ['rival', 'competition', 'versus', 'tournament'])) return 'RIVAL';
    if (hasAny(text, ['inner conflict', 'identity', 'grief', 'addiction', 'guilt', 'self-doubt'])) return 'INTERNAL';
    if (hasAny(text, ['society', 'system', 'government', 'corporation', 'class'])) return 'SOCIETY';
    if (hasAny(text, ['storm', 'disaster', 'wilderness', 'survival']) || genre === 'ADVENTURE') return 'NATURE';
    return genre === 'MYSTERY' ? 'MYSTERY' : 'ANTAGONIST';
};

const inferTone = (text: string, genre?: Genre): StoryTone => {
    if (hasAny(text, ['morally grey', 'morally gray', 'antihero', 'anti-hero', 'twisted justice'])) return 'MORALLY_GREY';
    if (hasAny(text, ['tragic', 'sacrifice', 'downfall', 'heartbreak'])) return 'TRAGIC';
    if (genre === 'COMEDY' || hasAny(text, ['comedy', 'funny', 'satire'])) return 'COMEDIC';
    if (genre === 'HORROR' || hasAny(text, ['dark', 'bleak', 'brutal'])) return 'DARK';
    return 'HEROIC';
};

const inferCastShape = (text: string, perspective: StoryPerspective): StoryCastShape => {
    if (perspective === 'ENSEMBLE' || hasAny(text, ['ensemble', 'team-up', 'team up', 'large cast'])) return 'ENSEMBLE';
    if (hasAny(text, ['intimate', 'two-hander', 'one room', 'solo', 'single character'])) return 'INTIMATE';
    return 'BALANCED';
};

export const inferStoryCompass = (
    source: StorySource,
    sourceHint?: StoryCompass['source']
): StoryCompass => {
    const existing = source.storyCompass as Partial<StoryCompass> | undefined;
    const text = normalizedText(source);
    const genre = primaryGenre(source);
    const inferredPerspective = inferPerspective(text);
    const perspective = isOneOf(existing?.perspective, STORY_PERSPECTIVES) ? existing.perspective : inferredPerspective;
    const inferredSource = sourceHint
        || (source.universeId ? 'CANON' : source.isOriginal === false ? 'MARKET_INFERENCE' : 'SCRIPT_DNA');
    const confidenceSignals = [
        Boolean(text),
        Boolean(genre),
        Boolean(source.options?.length),
        Boolean(source.tags?.length),
        Boolean(source.universeId),
    ].filter(Boolean).length;

    return {
        perspective,
        conflictSource: isOneOf(existing?.conflictSource, STORY_CONFLICT_SOURCES)
            ? existing.conflictSource
            : inferConflict(text, genre),
        worldRule: isOneOf(existing?.worldRule, STORY_WORLD_RULES)
            ? existing.worldRule
            : inferWorldRule(source, text),
        tone: isOneOf(existing?.tone, STORY_TONES) ? existing.tone : inferTone(text, genre),
        castShape: isOneOf(existing?.castShape, STORY_CAST_SHAPES)
            ? existing.castShape
            : inferCastShape(text, perspective),
        flexibility: isOneOf(existing?.flexibility, STORY_FLEXIBILITY)
            ? existing.flexibility
            : source.universeId ? 'PROTECTED' : source.isOriginal === false ? 'ADAPTABLE' : 'OPEN',
        source: isOneOf(existing?.source, STORY_SOURCES) ? existing.source : inferredSource,
        confidence: clamp(Number(existing?.confidence ?? (45 + confidenceSignals * 10)), 45, 95),
    };
};

const getDefaultAbility = (worldRule: StoryWorldRule): CharacterAbilityType => {
    if (worldRule === 'MAGIC') return 'MAGIC';
    if (worldRule === 'TECHNOLOGY') return 'TECH';
    if (worldRule === 'SUPERNATURAL') return 'SUPERNATURAL';
    if (worldRule === 'SUPERPOWERED') return 'SUPERPOWERED';
    return 'NONE';
};

const inferNature = (source: StorySource): CharacterNature => {
    const text = normalizedText(source);
    if (hasAny(text, ['robot', 'android', 'machine body'])) return 'ROBOT';
    if (hasAny(text, ['alien', 'extraterrestrial'])) return 'ALIEN';
    if (hasAny(text, ['creature', 'monster', 'beast'])) return 'CREATURE';
    if (hasAny(text, ['ghost', 'spirit'])) return 'SPIRIT';
    return 'HUMAN';
};

export const suggestCharacterIdentity = (
    compass: StoryCompass,
    roleType: RoleType,
    castIndex = 0,
    source: StorySource = {}
): CharacterIdentityProfile => {
    let storyFunction: CharacterStoryFunction = 'OTHER';
    let storyRole: CharacterStoryRole = 'OTHER';

    if (roleType === 'LEAD' || castIndex === 0) {
        storyFunction = 'PROTAGONIST';
        storyRole = compass.perspective === 'VILLAIN_LED'
            ? 'VILLAIN'
            : compass.tone === 'MORALLY_GREY' || compass.tone === 'DARK'
                ? 'ANTI_HERO'
                : 'HERO';
    } else if (castIndex === 1 && compass.conflictSource === 'ANTAGONIST') {
        storyFunction = 'ANTAGONIST';
        storyRole = 'VILLAIN';
    } else if (castIndex === 1 && compass.conflictSource === 'RIVAL') {
        storyFunction = 'RIVAL';
        storyRole = compass.tone === 'HEROIC' ? 'ALLY' : 'ANTI_HERO';
    } else if (roleType === 'SUPPORTING' || roleType === 'ENSEMBLE') {
        storyFunction = compass.castShape === 'ENSEMBLE' ? 'DEUTERAGONIST' : 'ALLY';
        storyRole = 'ALLY';
    } else if (roleType === 'CAMEO') {
        storyFunction = 'COMIC_RELIEF';
        storyRole = 'OTHER';
    } else {
        storyFunction = 'CIVILIAN';
        storyRole = 'CIVILIAN';
    }

    return {
        storyFunction,
        storyRole,
        abilityType: getDefaultAbility(compass.worldRule),
        nature: inferNature(source),
        identitySource: compass.source === 'CANON' ? 'CANON' : compass.source === 'AUTHOR_INTENT' ? 'AUTHOR_INTENT' : 'AUTO',
    };
};

export const getOpportunityCharacterProfile = (opportunity: AuditionOpportunity): CharacterIdentityProfile => {
    if (opportunity.characterProfile) return opportunity.characterProfile;
    const compass = inferStoryCompass(opportunity.project, opportunity.project?.isOriginal === false ? 'MARKET_INFERENCE' : undefined);
    return suggestCharacterIdentity(compass, opportunity.roleType, 0, opportunity.project);
};

const getRoleFit = (player: Player, profile: CharacterIdentityProfile) => {
    const archivedCredits = (player.pastProjects || []).filter(project => project.playerCharacterProfile?.storyRole === profile.storyRole);
    const activeCredits = (player.activeReleases || []).filter(release => (
        release.projectDetails?.castList?.some(member => (
            (member.isPlayer || member.actorId === 'PLAYER_SELF') && member.storyRole === profile.storyRole
        ))
    ));
    const credits = [
        ...archivedCredits,
        ...activeCredits.map(release => ({
            playerRolePerformance: release.productionPerformance,
            projectQuality: release.projectDetails?.hiddenStats?.qualityScore,
        })),
    ];
    const recentStrength = credits.slice(-5).reduce((sum, project) => (
        sum + Math.max(0, Number(project.playerRolePerformance || project.projectQuality || 50) - 45)
    ), 0);
    const base = 52 + Math.min(24, credits.length * 4) + Math.min(12, recentStrength / 15);
    const score = Math.round(clamp(base));
    return {
        score,
        label: score >= 82 ? 'NATURAL_FIT' as const
            : score >= 68 ? 'STRONG_FIT' as const
                : credits.length > 0 ? 'STRETCH' as const
                    : 'AGAINST_TYPE' as const,
        reasons: credits.length > 0
            ? [`${credits.length} released ${profile.storyRole.toLowerCase().replace('_', ' ')} credit${credits.length === 1 ? '' : 's'}`]
            : [`Fresh territory: ${profile.storyRole.toLowerCase().replace('_', ' ')}`],
    };
};

export const enrichAuditionOpportunity = (
    opportunity: AuditionOpportunity,
    player: Player,
    options: { forceRange?: boolean } = {},
): AuditionOpportunity => {
    const storyCompass = inferStoryCompass(opportunity.project);
    if (
        !options.forceRange
        && opportunity.industryContext
        && opportunity.characterProfile
        && opportunity.roleFit
        && opportunity.characterStoryFit
    ) {
        return {
            ...opportunity,
            project: { ...opportunity.project, storyCompass },
        };
    }
    const suggestedProfile = getOpportunityCharacterProfile({ ...opportunity, project: { ...opportunity.project, storyCompass } });
    const decision = getRoleOfferMarketDecision(
        player,
        suggestedProfile.storyRole,
        opportunity.id,
        {
            forceRange: options.forceRange,
            protectedIdentity: (
                storyCompass.flexibility === 'PROTECTED'
                || suggestedProfile.identitySource === 'CANON'
                || suggestedProfile.identitySource === 'AUTHOR_INTENT'
            ),
        },
    );
    const storyFunctionForRole = (role: CharacterStoryRole): CharacterStoryFunction => {
        if (role === 'VILLAIN') return 'ANTAGONIST';
        if (role === 'ALLY') return 'ALLY';
        if (role === 'CIVILIAN') return 'CIVILIAN';
        if (role === 'OTHER') return 'OTHER';
        return 'PROTAGONIST';
    };
    const characterProfile = decision.role !== suggestedProfile.storyRole
        ? {
            ...suggestedProfile,
            storyRole: decision.role,
            storyFunction: storyFunctionForRole(decision.role),
        }
        : suggestedProfile;
    const roleFit = getRoleFit(player, characterProfile);
    const characterStoryFit = evaluateCharacterProfileFit(
        storyCompass,
        characterProfile,
        opportunity.roleType,
    );
    roleFit.reasons = Array.from(new Set([
        ...roleFit.reasons,
        decision.context.reason,
    ])).slice(0, 3);
    return {
        ...opportunity,
        project: { ...opportunity.project, storyCompass },
        characterProfile,
        characterStoryFit,
        roleFit,
        industryContext: decision.context,
    };
};

export const applyOpportunityIdentityToProject = (
    opportunity: AuditionOpportunity,
    player: Pick<Player, 'name' | 'avatar'>
): ProjectDetails => {
    const profile = getOpportunityCharacterProfile(opportunity);
    const storyCompass = inferStoryCompass(opportunity.project);
    const existingCast = Array.isArray(opportunity.project.castList) ? opportunity.project.castList : [];
    const playerEntry = existingCast.find(member => member.isPlayer || member.actorId === 'PLAYER_SELF');
    const castList = playerEntry
        ? existingCast.map(member => member === playerEntry ? {
            ...member,
            ...profile,
            roleType: opportunity.roleType,
            identitySource: profile.identitySource,
        } : member)
        : [{
            id: 'player',
            name: player.name,
            role: opportunity.roleType === 'LEAD' ? 'Lead' : opportunity.roleType === 'SUPPORTING' ? 'Supporting' : 'Cast',
            isPlayer: true,
            image: player.avatar,
            type: 'ACTOR' as const,
            actorId: 'PLAYER_SELF',
            actorName: player.name,
            roleType: opportunity.roleType,
            ...profile,
        }, ...existingCast];

    return {
        ...opportunity.project,
        storyCompass,
        castList,
    };
};

export const getStoryCompassLabels = (compass: StoryCompass): string[] => [
    compass.perspective.replaceAll('_', ' '),
    compass.conflictSource.replaceAll('_', ' '),
    compass.worldRule.replaceAll('_', ' '),
    compass.castShape.replaceAll('_', ' '),
];

export const getCharacterIdentityLabels = (profile: CharacterIdentityProfile): string[] => [
    getCharacterIdentityOption('storyFunction', profile.storyFunction).label,
    getCharacterIdentityOption('storyRole', profile.storyRole).label,
    getCharacterIdentityOption('abilityType', profile.abilityType).label,
    getCharacterIdentityOption('nature', profile.nature).label,
];
