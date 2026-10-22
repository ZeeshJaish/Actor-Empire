import type { CastMember, Player, ProjectDetails, RoleType } from '../../types';
import { NPC_DATABASE, isCastableActor } from '../npcLogic';
import { createDeterministicRng } from '../deterministicRandom';
import { buildCinemaDeliveryInput } from './boxOfficeDelivery';
import { CINEMA_ROLE_WEIGHTS } from './boxOfficeProfiles';
import { readCinemaExposureRecord } from './boxOfficeAwareness';
import type { CinemaOwnerRef, CinemaTitleInput } from './boxOfficeTypes';

const score = (value: unknown, fallback = 0): number => (
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
);
export const isCinemaPlayerCredit = (member: Partial<CastMember>): boolean => (
    member.isPlayer === true || ['PLAYER_SELF', 'player'].includes(member.actorId || member.npcId || '')
);

export const normalizeCinemaTitle = ({ titleId, owner, project, player }: {
    titleId: string; owner: CinemaOwnerRef; project: ProjectDetails; player: Player;
}): CinemaTitleInput => {
    const people = new Map<string, CinemaTitleInput['cast'][number]>();
    const actors = new Map([...NPC_DATABASE, ...(player.flags?.extraNPCs || [])].map(actor => [actor.id, actor]));
    for (const [index, member] of (project.castList || []).entries()) {
        if (member.type === 'DIRECTOR') continue;
        const isPlayer = isCinemaPlayerCredit(member);
        const rawId = member.actorId || member.npcId || member.id;
        const relation = player.relationships?.find(row => row.id === rawId);
        const personId = isPlayer ? 'PLAYER_SELF' : relation?.npcId || rawId;
        const anonymous = !personId || ['UNKNOWN', 'STUDIO_STAFF'].includes(personId);
        const canonicalId = anonymous ? `uncredited:${member.roleId || member.id || index}` : personId;
        const roleType = member.roleType && member.roleType in CINEMA_ROLE_WEIGHTS ? member.roleType : 'SUPPORTING';
        const roleWeight = CINEMA_ROLE_WEIGHTS[roleType];
        const existing = people.get(canonicalId);
        const characterIds = [...new Set([...(existing?.characterIds || []), ...(member.characterId ? [member.characterId] : [])])];
        if (!existing || roleWeight > existing.roleWeight) {
            people.set(canonicalId, { personId: canonicalId, name: member.actorName || member.name,
                roleType, roleWeight, fame: anonymous ? 0 : isPlayer ? score(player.stats.fame) : score(actors.get(personId)?.stats?.fame),
                stature: anonymous || isPlayer ? 0 : ({ ICON:100,A_LIST:85,ESTABLISHED:60,RISING:30,INDIE:15,UNKNOWN:0 }[actors.get(personId)?.tier || 'UNKNOWN']),
                isPlayer, characterIds });
        } else existing.characterIds = characterIds;
    }
    const budget = Number(project.estimatedBudget);
    const budgetCents = Number.isFinite(budget) ? Math.round(Math.max(0, budget) * 100) : 0;
    if (!Number.isSafeInteger(budgetCents)) throw new RangeError('Cinema production budget exceeds safe integer cents');
    const directorId = project.directorId || project.director?.id || project.crewList?.find(c => c.role === 'DIRECTOR')?.id;
    const playerDirected = directorId === 'PLAYER_SELF' || project.crewList?.some(c => c.role === 'DIRECTOR' && c.isPlayer);
    return { id: titleId, owner: { ...owner }, projectType: project.type, genre: project.genre, budgetCents,
        cast: [...people.values()].sort((a, b) => a.personId.localeCompare(b.personId)), directorId,
        playerCredited: Boolean(playerDirected || people.has('PLAYER_SELF')), delivery: buildCinemaDeliveryInput(project),
        ...(project.cinemaExposure ? { exposure: readCinemaExposureRecord(project) } : {}) };
};

/** Only offered packages with an absent/legacy player-only ensemble are reconstructed.
 * Authored studio casting, salaries, character roles and already populated offers stay intact.
 * Select real catalogue actors near the offered craft level; never synthesize star stats.
 */
export const completeOfferedCinemaCast = (project: ProjectDetails): ProjectDetails => {
    if (project.castPackageSource === 'AUTHORED') return project;
    const cast = project.castList || [];
    if (cast.some(member => member.type !== 'DIRECTOR' && !isCinemaPlayerCredit(member))) return project;
    const spectacle = ['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY', 'ANIMATION'].includes(project.genre);
    const target = spectacle ? (project.estimatedBudget > 120_000_000 ? 7 : project.estimatedBudget > 45_000_000 ? 6 : 4)
        : project.estimatedBudget > 120_000_000 ? 4 : project.estimatedBudget > 45_000_000 ? 3 : 2;
    const rng = createDeterministicRng(`cinema-offer-cast:${project.studioId}:${project.title}:${project.genre}`);
    const craft = score(project.hiddenStats?.castingStrength, 50);
    const pool = NPC_DATABASE.filter(isCastableActor).map(npc => ({ npc,
        priority: Math.abs(score(npc.stats?.talent, 50) - craft) + rng() * 25,
    })).sort((a, b) => a.priority - b.priority || a.npc.id.localeCompare(b.npc.id));
    const actorCount = new Set(cast.filter(member => member.type !== 'DIRECTOR').map(member =>
        isCinemaPlayerCredit(member) ? 'PLAYER_SELF' : member.actorId || member.npcId || member.id)).size;
    const additions: CastMember[] = pool.slice(0, Math.max(0, target - actorCount)).map(({ npc }) => ({
        id: npc.id, npcId: npc.id, actorId: npc.id, actorName: npc.name, name: npc.name,
        role: 'Co-Star', roleType: 'SUPPORTING', isPlayer: false, image: npc.avatar, type: 'ACTOR',
    }));
    return { ...project, castList: [...cast, ...additions], castPackageSource: 'OFFER_GENERATED' };
};
