import { CharacterStoryRole, PastProject, Player } from '../types';

export type RoleIdentityArcId =
    | 'VILLAIN_ERA'
    | 'HEROIC_RUN'
    | 'ANTI_HERO_PHASE'
    | 'SCENE_STEALER'
    | 'TYPECAST_PRESSURE';

export interface RoleMasteryLane {
    role: CharacterStoryRole;
    credits: number;
    recentCredits: number;
    averagePerformance: number;
    mastery: number;
    latestTitle?: string;
}

export interface RoleIdentityArcCandidate {
    id: RoleIdentityArcId;
    lane: RoleMasteryLane;
    signals: Array<{ key: string; vars?: Record<string, string | number> }>;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const performanceOf = (project: PastProject) => clamp(Number(
    project.playerRolePerformance
    ?? project.projectQuality
    ?? (Number(project.imdbRating || project.rating || 5) * 10)
    ?? 50
));

export const getRoleMasteryContribution = (project: PastProject, priorRoleCredits = 0): number => {
    const performance = performanceOf(project);
    const supportingBreakout = project.roleType === 'SUPPORTING' && performance >= 84 ? 2 : 0;
    const againstTypeBreakout = priorRoleCredits === 0 && performance >= 78 ? 4 : 0;
    return Math.round(clamp(
        5 + Math.max(0, performance - 40) * 0.2 + supportingBreakout + againstTypeBreakout,
        3,
        20
    ));
};

const getRecentCredits = (player: Player): PastProject[] => [...(player.pastProjects || [])]
    .filter(project => !project.isQaArchive && project.playerCharacterProfile?.storyRole)
    .sort((a, b) => Number(b.releasedAtAbsoluteWeek || b.releaseYear || b.year || 0) - Number(a.releasedAtAbsoluteWeek || a.releaseYear || a.year || 0))
    .slice(0, 8);

const getActiveIdentityCredits = (player: Player): PastProject[] => (player.activeReleases || [])
    .map(release => {
        const playerCast = release.projectDetails?.castList?.find(member => member.isPlayer || member.actorId === 'PLAYER_SELF');
        if (!playerCast?.storyRole) return null;
        return {
            id: `active_${release.id}`,
            name: release.name,
            type: 'ACTING_GIG',
            roleType: release.roleType || playerCast.roleType || 'SUPPORTING',
            year: player.age,
            earnings: 0,
            rating: Number(release.imdbRating || 0),
            reception: release.status,
            projectQuality: Number(release.productionPerformance || release.projectDetails?.hiddenStats?.qualityScore || 50),
            genre: release.projectDetails?.genre || 'DRAMA',
            releasedAtAbsoluteWeek: player.age * 52 + player.currentWeek,
            playerRolePerformance: Number(release.productionPerformance || 50),
            playerCharacterProfile: {
                storyFunction: playerCast.storyFunction || 'OTHER',
                storyRole: playerCast.storyRole,
                abilityType: playerCast.abilityType || 'NONE',
                nature: playerCast.nature || 'HUMAN',
                identitySource: playerCast.identitySource || 'AUTO',
            },
        } as PastProject;
    })
    .filter((project): project is PastProject => Boolean(project));

const getAllIdentityCredits = (player: Player): PastProject[] => [
    ...getActiveIdentityCredits(player),
    ...getRecentCredits(player),
].sort((a, b) => Number(b.releasedAtAbsoluteWeek || b.releaseYear || b.year || 0) - Number(a.releasedAtAbsoluteWeek || a.releaseYear || a.year || 0))
    .slice(0, 8);

export const getRoleMasteryLanes = (player: Player): RoleMasteryLane[] => {
    const projects = getAllIdentityCredits(player);
    const roles: CharacterStoryRole[] = ['HERO', 'ANTI_HERO', 'VILLAIN', 'ALLY', 'CIVILIAN', 'OTHER'];
    return roles.map(role => {
        const credits = projects.filter(project => project.playerCharacterProfile?.storyRole === role);
        const averagePerformance = credits.length
            ? credits.reduce((sum, project) => sum + performanceOf(project), 0) / credits.length
            : 0;
        return {
            role,
            credits: credits.length,
            recentCredits: credits.slice(0, 5).length,
            averagePerformance: Math.round(averagePerformance),
            mastery: Math.round(clamp(
                [...credits]
                    .reverse()
                    .reduce((sum, project, index) => sum + getRoleMasteryContribution(project, index), 0)
            )),
            latestTitle: credits[0]?.name,
        };
    }).filter(lane => lane.credits > 0);
};

export const getRoleIdentityArcCandidate = (player: Player): RoleIdentityArcCandidate | null => {
    const lanes = getRoleMasteryLanes(player);
    const strongest = [...lanes].sort((a, b) => b.mastery - a.mastery)[0];
    if (!strongest) return null;

    const baseSignals = [
        { key: 'home.actorArc.signal.roleCredits', vars: { count: strongest.credits, role: strongest.role.replaceAll('_', ' ').toLowerCase() } },
        { key: 'home.actorArc.signal.rolePerformance', vars: { score: strongest.averagePerformance } },
        strongest.latestTitle ? { key: 'home.actorArc.signal.roleLatest', vars: { title: strongest.latestTitle } } : null,
    ].filter(Boolean) as RoleIdentityArcCandidate['signals'];

    if (strongest.credits >= 4 && strongest.averagePerformance < 66) {
        return { id: 'TYPECAST_PRESSURE', lane: strongest, signals: baseSignals };
    }
    if (strongest.role === 'VILLAIN' && (
        (strongest.credits >= 2 && strongest.averagePerformance >= 72)
        || strongest.averagePerformance >= 88
    )) {
        return { id: 'VILLAIN_ERA', lane: strongest, signals: baseSignals };
    }
    if (strongest.role === 'ANTI_HERO' && strongest.credits >= 2 && strongest.averagePerformance >= 70) {
        return { id: 'ANTI_HERO_PHASE', lane: strongest, signals: baseSignals };
    }
    if (strongest.role === 'HERO' && strongest.credits >= 3 && strongest.averagePerformance >= 74) {
        return { id: 'HEROIC_RUN', lane: strongest, signals: baseSignals };
    }
    const supporting = getAllIdentityCredits(player).filter(project => (
        project.roleType === 'SUPPORTING'
        && performanceOf(project) >= 84
    ));
    if (supporting.length >= 2) {
        return {
            id: 'SCENE_STEALER',
            lane: strongest,
            signals: [
                { key: 'home.actorArc.signal.sceneStealing', vars: { count: supporting.length } },
                ...baseSignals,
            ],
        };
    }
    return null;
};
