import { CharacterStoryRole, PastProject, Player } from '../types';
import { getActorCareerArc } from './actorCareerArc';
import { getRoleMasteryContribution, getRoleMasteryLanes } from './actorRoleIdentity';

export type RolePerformanceTone = 'BREAKOUT' | 'STRONG' | 'SOLID' | 'MIXED' | 'MISCAST';

export interface RolePerformanceBreakdown {
    role: CharacterStoryRole;
    roleLabel: string;
    characterLabel: string;
    performance: number;
    roleFit: number;
    roleFitLabel: 'NATURAL FIT' | 'STRONG FIT' | 'STRETCH ROLE' | 'AGAINST TYPE';
    screenPresence: number;
    chemistry: number;
    mastery: number;
    masteryGain: number;
    roleCredits: number;
    typecastingPressure: number;
    typecastingLabel: 'OPEN RANGE' | 'EARLY PATTERN' | 'KNOWN FOR IT' | 'TYPECAST RISK';
    tone: RolePerformanceTone;
    verdict: string;
    careerEffect: string;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const projectWeek = (project: PastProject) => Number(
    project.releasedAtAbsoluteWeek
    ?? (Number(project.releaseYear || project.year || 0) * 52 + Number(project.releaseWeek || 0))
);
const projectPerformance = (project: PastProject) => clamp(Number(
    project.playerRolePerformance
    ?? project.projectQuality
    ?? Number(project.imdbRating || project.rating || 5) * 10
    ?? 50
));
const formatRole = (role: CharacterStoryRole) => role.replaceAll('_', ' ').toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());

const getPriorCredits = (player: Player, project: PastProject, role: CharacterStoryRole) => {
    const selectedWeek = projectWeek(project);
    return (player.pastProjects || []).filter(credit => (
        credit.id !== project.id
        && !credit.isQaArchive
        && credit.playerCharacterProfile?.storyRole === role
        && projectWeek(credit) <= selectedWeek
    ));
};

const getRoleFit = (priorCredits: PastProject[]) => {
    const recent = [...priorCredits]
        .sort((a, b) => projectWeek(b) - projectWeek(a))
        .slice(0, 5);
    const average = recent.length
        ? recent.reduce((sum, credit) => sum + projectPerformance(credit), 0) / recent.length
        : 50;
    const score = Math.round(clamp(50 + Math.min(24, recent.length * 5) + Math.max(0, average - 55) * 0.35));
    return {
        score,
        label: score >= 82
            ? 'NATURAL FIT' as const
            : score >= 68
                ? 'STRONG FIT' as const
                : recent.length > 0
                    ? 'STRETCH ROLE' as const
                    : 'AGAINST TYPE' as const,
    };
};

const getTypecastingRead = (player: Player, role: CharacterStoryRole) => {
    const recent = [...(player.pastProjects || [])]
        .filter(credit => !credit.isQaArchive && credit.playerCharacterProfile?.storyRole)
        .sort((a, b) => projectWeek(b) - projectWeek(a))
        .slice(0, 8);
    const sameRole = recent.filter(credit => credit.playerCharacterProfile?.storyRole === role).length;
    const concentration = recent.length ? sameRole / recent.length : 0;
    const pressure = Math.round(clamp(concentration * 65 + Math.max(0, sameRole - 1) * 8));
    return {
        pressure,
        label: pressure >= 78
            ? 'TYPECAST RISK' as const
            : pressure >= 55
                ? 'KNOWN FOR IT' as const
                : pressure >= 30
                    ? 'EARLY PATTERN' as const
                    : 'OPEN RANGE' as const,
    };
};

const getTone = (performance: number, roleFit: number): RolePerformanceTone => {
    if (performance >= 88 || (performance >= 82 && roleFit < 68)) return 'BREAKOUT';
    if (performance >= 76) return 'STRONG';
    if (performance >= 64) return 'SOLID';
    if (performance >= 48) return 'MIXED';
    return 'MISCAST';
};

const getVerdict = (tone: RolePerformanceTone, roleLabel: string, roleFit: number) => {
    if (tone === 'BREAKOUT' && roleFit < 68) return `A bold ${roleLabel.toLowerCase()} turn changed the industry's read on you.`;
    if (tone === 'BREAKOUT') return `You owned the ${roleLabel.toLowerCase()} role and became the conversation.`;
    if (tone === 'STRONG') return `A confident ${roleLabel.toLowerCase()} performance strengthened your casting pull.`;
    if (tone === 'SOLID') return `The role landed cleanly and added a dependable credit to your filmography.`;
    if (tone === 'MIXED') return `Some moments connected, but the role did not fully settle around you.`;
    return `The role and performance never found the same rhythm.`;
};

const getCareerEffect = (
    roleLabel: string,
    performance: number,
    roleFit: number,
    typecastingPressure: number,
    arcLabel: string,
) => {
    if (performance >= 82 && roleFit < 68) {
        return `Against-type success unlocks wider offers and can push your public image toward ${arcLabel.replaceAll('_', ' ').toLowerCase()}.`;
    }
    if (typecastingPressure >= 78) {
        return `Demand for ${roleLabel.toLowerCase()} roles is high, but another similar part may narrow future offers.`;
    }
    if (performance >= 76) {
        return `Casting teams now trust you more in ${roleLabel.toLowerCase()} roles.`;
    }
    if (performance < 48) {
        return `A stronger follow-up in a different lane can reset this career read.`;
    }
    return `This credit adds experience without locking your next role.`;
};

export const getRolePerformanceBreakdown = (
    player: Player,
    project: PastProject
): RolePerformanceBreakdown | null => {
    const profile = project.playerCharacterProfile;
    if (!profile?.storyRole) return null;

    const role = profile.storyRole;
    const roleLabel = formatRole(role);
    const priorCredits = getPriorCredits(player, project, role);
    const roleFit = getRoleFit(priorCredits);
    const performance = Math.round(projectPerformance(project));
    const audienceScore = clamp(Number(project.audienceReception?.currentScore || project.rating * 10 || performance));
    const castCount = Math.max(1, (project.castList || []).filter(member => member.type === 'ACTOR').length);
    const billingBoost = project.roleType === 'LEAD' ? 5 : project.roleType === 'SUPPORTING' ? 1 : -3;
    const screenPresence = Math.round(clamp(
        performance * 0.76
        + Number(project.projectQuality || performance) * 0.18
        + billingBoost
        + (project.roleType === 'SUPPORTING' && performance >= 84 ? 6 : 0)
    ));
    const chemistry = Math.round(clamp(
        performance * 0.48
        + audienceScore * 0.34
        + Number(project.projectQuality || performance) * 0.18
        + (castCount >= 3 ? 3 : 0)
    ));
    const lane = getRoleMasteryLanes(player).find(item => item.role === role);
    const masteryGain = getRoleMasteryContribution(project, priorCredits.length);
    const typecasting = getTypecastingRead(player, role);
    const tone = getTone(performance, roleFit.score);
    const actorArc = getActorCareerArc(player);

    return {
        role,
        roleLabel,
        characterLabel: profile.storyFunction.replaceAll('_', ' ').toLowerCase()
            .replace(/\b\w/g, letter => letter.toUpperCase()),
        performance,
        roleFit: roleFit.score,
        roleFitLabel: roleFit.label,
        screenPresence,
        chemistry,
        mastery: lane?.mastery || masteryGain,
        masteryGain,
        roleCredits: lane?.credits || 1,
        typecastingPressure: typecasting.pressure,
        typecastingLabel: typecasting.label,
        tone,
        verdict: getVerdict(tone, roleLabel, roleFit.score),
        careerEffect: getCareerEffect(
            roleLabel,
            performance,
            roleFit.score,
            typecasting.pressure,
            actorArc.id
        ),
    };
};
