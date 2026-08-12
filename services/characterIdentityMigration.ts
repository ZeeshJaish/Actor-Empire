import {
    type AuditionOpportunity,
    type Business,
    type CastMember,
    type CharacterAbilityType,
    type CharacterIdentityProfile,
    type CharacterIdentitySource,
    type CharacterNature,
    type CharacterStoryFunction,
    type CharacterStoryRole,
    type Player,
    type ProjectConcept,
    type ProjectDetails,
    type RoleType,
    type Script,
    type Universe,
    type UniverseCharacter,
} from '../types';
import {
    enrichAuditionOpportunity,
    inferStoryCompass,
    suggestCharacterIdentity,
} from './characterIdentityLogic';

const STORY_FUNCTIONS: CharacterStoryFunction[] = [
    'PROTAGONIST', 'ANTAGONIST', 'DEUTERAGONIST', 'MENTOR', 'RIVAL',
    'ALLY', 'COMIC_RELIEF', 'CIVILIAN', 'OTHER',
];
const STORY_ROLES: CharacterStoryRole[] = [
    'HERO', 'VILLAIN', 'ANTI_HERO', 'ALLY', 'CIVILIAN', 'OTHER',
];
const ABILITY_TYPES: CharacterAbilityType[] = [
    'NONE', 'SUPERPOWERED', 'MAGIC', 'TECH', 'SUPERNATURAL', 'TRAINED',
];
const NATURES: CharacterNature[] = ['HUMAN', 'ROBOT', 'ALIEN', 'CREATURE', 'SPIRIT', 'OTHER'];
const IDENTITY_SOURCES: CharacterIdentitySource[] = ['AUTO', 'PLAYER', 'CANON', 'AUTHOR_INTENT'];
const ROLE_TYPES: RoleType[] = ['LEAD', 'SUPPORTING', 'ENSEMBLE', 'CAMEO', 'MINOR'];

const isOneOf = <T extends string>(value: unknown, values: readonly T[]): value is T => (
    typeof value === 'string' && values.includes(value as T)
);

const inferRoleType = (entry: any, index: number): RoleType => {
    if (isOneOf(entry?.roleType, ROLE_TYPES)) return entry.roleType;
    const label = String(entry?.role || '').toLowerCase();
    if (label.includes('lead')) return 'LEAD';
    if (label.includes('support')) return 'SUPPORTING';
    if (label.includes('cameo')) return 'CAMEO';
    if (label.includes('extra')) return 'MINOR';
    if (label.includes('ensemble')) return 'ENSEMBLE';
    return index === 0 ? 'LEAD' : 'SUPPORTING';
};

const normalizeProfile = (
    value: any,
    fallback: CharacterIdentityProfile,
    forceCanon = false,
): CharacterIdentityProfile => ({
    storyFunction: isOneOf(value?.storyFunction, STORY_FUNCTIONS)
        ? value.storyFunction
        : fallback.storyFunction,
    storyRole: isOneOf(value?.storyRole, STORY_ROLES) ? value.storyRole : fallback.storyRole,
    abilityType: isOneOf(value?.abilityType, ABILITY_TYPES) ? value.abilityType : fallback.abilityType,
    nature: isOneOf(value?.nature, NATURES) ? value.nature : fallback.nature,
    identitySource: forceCanon
        ? 'CANON'
        : isOneOf(value?.identitySource, IDENTITY_SOURCES)
            ? value.identitySource
            : fallback.identitySource,
});

const normalizeCastList = (
    castList: unknown,
    project: Partial<ProjectDetails>,
    forceCanon = false,
): CastMember[] => {
    if (!Array.isArray(castList)) return [];
    const storyCompass = inferStoryCompass(project, forceCanon ? 'CANON' : undefined);
    return castList
        .filter(member => member && typeof member === 'object')
        .map((member: any, index) => {
            if (member.type && member.type !== 'ACTOR') return { ...member };
            const roleType = inferRoleType(member, index);
            const fallback = suggestCharacterIdentity(storyCompass, roleType, index, project);
            return {
                ...member,
                roleType,
                ...normalizeProfile(member, fallback, forceCanon || member.identitySource === 'CANON'),
            };
        });
};

export const migrateLegacyProjectIdentity = (
    project: ProjectDetails | Record<string, any>,
    forceCanon = false,
): ProjectDetails => {
    const next = project && typeof project === 'object' ? { ...project } : {} as ProjectDetails;
    const storyCompass = inferStoryCompass(next, forceCanon ? 'CANON' : undefined);
    return {
        ...next,
        storyCompass: forceCanon
            ? { ...storyCompass, flexibility: 'PROTECTED', source: 'CANON' }
            : storyCompass,
        castList: normalizeCastList(next.castList, { ...next, storyCompass }, forceCanon),
    } as ProjectDetails;
};

const migrateScript = (script: Script): Script => ({
    ...script,
    storyCompass: inferStoryCompass(script),
});

const migrateConcept = (concept: ProjectConcept, scriptsById: Map<string, Script>): ProjectConcept => {
    const sourceScript = scriptsById.get(String(concept.scriptId || ''));
    const storySource = {
        ...(sourceScript || {}),
        ...concept,
        storyCompass: concept.storyCompass || sourceScript?.storyCompass,
    };
    const storyCompass = inferStoryCompass(storySource);
    const castList = Array.isArray(concept.castList)
        ? concept.castList.map((member: any, index) => {
            const roleType = inferRoleType(member, index);
            const fallback = suggestCharacterIdentity(storyCompass, roleType, index, storySource);
            return {
                ...member,
                roleType,
                ...normalizeProfile(member, fallback, storyCompass.flexibility === 'PROTECTED'),
            };
        })
        : [];
    return { ...concept, storyCompass, castList };
};

const migrateBusiness = (business: Business): Business => {
    if (!business.studioState) return business;
    const scripts = Array.isArray(business.studioState.scripts)
        ? business.studioState.scripts.map(migrateScript)
        : [];
    const scriptsById = new Map(scripts.map(script => [String(script.id), script]));
    return {
        ...business,
        studioState: {
            ...business.studioState,
            scripts,
            ipMarket: Array.isArray(business.studioState.ipMarket)
                ? business.studioState.ipMarket.map(migrateScript)
                : [],
            concepts: Array.isArray(business.studioState.concepts)
                ? business.studioState.concepts.map(concept => migrateConcept(concept, scriptsById))
                : [],
        },
    };
};

const migrateUniverseCharacter = (
    character: UniverseCharacter,
    index: number,
    universe: Universe,
): UniverseCharacter => {
    const matchingProject = (universe.slate || []).find(project => (
        project.castList?.some(member => (
            member.characterId === character.characterId
            || member.characterName === character.name
            || member.actorId === character.actorId
        ))
    ));
    const source = matchingProject || {
        title: universe.name,
        genre: 'SUPERHERO',
        universeId: universe.id,
        isOriginal: false,
    };
    const compass = inferStoryCompass(source, 'CANON');
    const roleType = inferRoleType(character, index);
    return {
        ...character,
        roleType,
        ...normalizeProfile(
            character,
            suggestCharacterIdentity(compass, roleType, index, source),
            true,
        ),
    };
};

const migrateUniverse = (universe: Universe): Universe => {
    const slate = Array.isArray(universe.slate)
        ? universe.slate.map(project => migrateLegacyProjectIdentity(project, true))
        : [];
    const nextUniverse = { ...universe, slate };
    return {
        ...nextUniverse,
        roster: Array.isArray(universe.roster)
            ? universe.roster.map((character, index) => migrateUniverseCharacter(character, index, nextUniverse))
            : [],
    };
};

const migrateOpportunity = (value: any, player: Player): AuditionOpportunity | any => {
    if (!value || typeof value !== 'object' || !value.project) return value;
    const migratedProject = migrateLegacyProjectIdentity(value.project, Boolean(value.project.universeId));
    return enrichAuditionOpportunity({ ...value, project: migratedProject } as AuditionOpportunity, player);
};

/**
 * Adds the role-identity model to legacy saves without changing authored values.
 * The transform is immutable and idempotent, so save/load cycles cannot duplicate
 * casts, universes, credits, or opportunity records.
 */
export const migrateLegacyCharacterIdentity = (player: Player): Player => {
    const businesses = (player.businesses || []).map(migrateBusiness);
    const activeReleases = (player.activeReleases || []).map(release => ({
        ...release,
        projectDetails: migrateLegacyProjectIdentity(
            release.projectDetails,
            Boolean(release.projectDetails?.universeId),
        ),
    }));
    const commitments = (player.commitments || []).map(commitment => (
        commitment.projectDetails
            ? {
                ...commitment,
                projectDetails: migrateLegacyProjectIdentity(
                    commitment.projectDetails,
                    Boolean(commitment.projectDetails.universeId),
                ),
            }
            : commitment
    ));
    const pastProjects = (player.pastProjects || []).map((project: any) => {
        const projectDetails = project.projectDetails
            ? migrateLegacyProjectIdentity(project.projectDetails, Boolean(project.projectDetails.universeId))
            : undefined;
        const castList = normalizeCastList(
            project.castList || projectDetails?.castList,
            projectDetails || {
                title: project.name,
                genre: project.genre,
                type: project.projectType,
                isOriginal: project.isOriginal,
            },
            Boolean(projectDetails?.universeId),
        );
        const playerCast = castList.find(member => member.isPlayer || member.actorId === 'PLAYER_SELF');
        const fallback = suggestCharacterIdentity(
            projectDetails?.storyCompass || inferStoryCompass(projectDetails || project),
            inferRoleType(project, 0),
            0,
            projectDetails || project,
        );
        return {
            ...project,
            ...(projectDetails ? { projectDetails } : {}),
            castList,
            playerCharacterProfile: normalizeProfile(
                project.playerCharacterProfile || playerCast,
                fallback,
                Boolean(projectDetails?.universeId),
            ),
            playerRolePerformance: Math.max(
                0,
                Math.min(100, Number(project.playerRolePerformance ?? project.productionPerformance ?? project.projectQuality ?? 50)),
            ),
        };
    });
    const universes = Object.fromEntries(
        Object.entries(player.world?.universes || {}).map(([id, universe]) => [
            id,
            migrateUniverse(universe as Universe),
        ]),
    ) as Player['world']['universes'];

    const migratedBase: Player = {
        ...player,
        businesses,
        activeReleases,
        commitments,
        pastProjects,
        world: { ...player.world, universes },
    };

    return {
        ...migratedBase,
        applications: (migratedBase.applications || []).map(application => ({
            ...application,
            data: migrateOpportunity(application.data, migratedBase),
        })),
        weeklyOpportunities: {
            ...migratedBase.weeklyOpportunities,
            auditions: (migratedBase.weeklyOpportunities?.auditions || [])
                .map(opportunity => migrateOpportunity(opportunity, migratedBase)),
        },
    };
};
