import type {
    DynastyCareerEvent,
    DynastyCareerMember,
    DynastyCareerState,
    DynastyCareerStatus,
    Genre,
    NPCActor,
    NewsItem,
    PlatformId,
    Player,
    WorldState,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getOldAgeIncidentChance } from './healthConditions';
import { cancelProjectTalentBookings } from './talentBookings';

export const DYNASTY_CAREER_SCHEMA_VERSION = 1 as const;
export const DYNASTY_CAREER_HISTORY_LIMIT = 36;

export interface DynastyCareerArchive {
    parent: Record<string, any>;
    pastProjects: any[];
    activeReleases: any[];
    awards: any[];
}

const clamp = (value: unknown, min = 0, max = 100): number => (
    Math.max(min, Math.min(max, Math.round(Number(value) || 0)))
);

const safeWeek = (value: unknown, fallback = 0): number => {
    const numeric = Math.round(Number(value));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const safeIds = (value: unknown): string[] => (
    Array.isArray(value)
        ? [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))]
        : []
);

const normalizeHistory = (value: unknown): DynastyCareerEvent[] => {
    if (!Array.isArray(value)) return [];
    const byId = new Map<string, DynastyCareerEvent>();
    value.forEach(raw => {
        if (!raw || typeof raw !== 'object') return;
        const candidate = raw as Partial<DynastyCareerEvent>;
        if (!candidate.id || !candidate.type || !candidate.title || !candidate.detail) return;
        if (!['SUCCESSION', 'PROJECT_JOINED', 'PROJECT_COMPLETED', 'HIATUS_STARTED', 'RETURNED', 'RETIRED', 'DIED'].includes(candidate.type)) return;
        byId.set(candidate.id, {
            id: candidate.id,
            type: candidate.type,
            absoluteWeek: safeWeek(candidate.absoluteWeek),
            title: candidate.title,
            detail: candidate.detail,
            ...(candidate.projectId ? { projectId: candidate.projectId } : {}),
        });
    });
    return [...byId.values()]
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .slice(-DYNASTY_CAREER_HISTORY_LIMIT);
};

const normalizeMember = (value: unknown, id: string): DynastyCareerMember | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<DynastyCareerMember>;
    const npcId = typeof candidate.npcId === 'string' && candidate.npcId ? candidate.npcId : id;
    const name = typeof candidate.name === 'string' && candidate.name ? candidate.name : 'Former family member';
    const status = candidate.status && ['ACTIVE', 'SELECTIVE', 'HIATUS', 'RETIRED', 'DECEASED'].includes(candidate.status)
        ? candidate.status
        : 'ACTIVE';
    return {
        id: npcId,
        playerId: typeof candidate.playerId === 'string' ? candidate.playerId : npcId,
        npcId,
        name,
        avatar: typeof candidate.avatar === 'string' ? candidate.avatar : '',
        gender: candidate.gender || 'NON_BINARY',
        generation: Math.max(1, safeWeek(candidate.generation, 1)),
        ageAtSuccession: Math.max(1, safeWeek(candidate.ageAtSuccession, 18)),
        successionAbsoluteWeek: safeWeek(candidate.successionAbsoluteWeek),
        health: clamp(candidate.health, 0, 100),
        fame: clamp(candidate.fame, 0, 100),
        talent: clamp(candidate.talent, 0, 100),
        ambition: clamp(candidate.ambition, 0, 100),
        selectivity: clamp(candidate.selectivity, 0, 100),
        familyLoyalty: clamp(candidate.familyLoyalty, 0, 100),
        status,
        currentProjectIds: safeIds(candidate.currentProjectIds),
        completedProjectIds: safeIds(candidate.completedProjectIds),
        lastDecisionAbsoluteWeek: safeWeek(candidate.lastDecisionAbsoluteWeek),
        nextDecisionAbsoluteWeek: safeWeek(candidate.nextDecisionAbsoluteWeek),
        ...(candidate.hiatusUntilAbsoluteWeek !== undefined ? { hiatusUntilAbsoluteWeek: safeWeek(candidate.hiatusUntilAbsoluteWeek) } : {}),
        ...(candidate.retiredAtAbsoluteWeek !== undefined ? { retiredAtAbsoluteWeek: safeWeek(candidate.retiredAtAbsoluteWeek) } : {}),
        ...(candidate.diedAtAbsoluteWeek !== undefined ? { diedAtAbsoluteWeek: safeWeek(candidate.diedAtAbsoluteWeek) } : {}),
        ...(typeof candidate.deathCause === 'string' && candidate.deathCause ? { deathCause: candidate.deathCause } : {}),
        history: normalizeHistory(candidate.history),
    };
};

export const normalizeDynastyCareerState = (player: Pick<Player, 'flags'>): DynastyCareerState => {
    const raw = player.flags?.dynastyCareer;
    const members: Record<string, DynastyCareerMember> = {};
    if (raw?.members && typeof raw.members === 'object') {
        Object.entries(raw.members).forEach(([id, value]) => {
            const normalized = normalizeMember(value, id);
            if (normalized) members[normalized.npcId] = normalized;
        });
    }
    return {
        schemaVersion: DYNASTY_CAREER_SCHEMA_VERSION,
        members,
        lastProcessedAbsoluteWeek: safeWeek(raw?.lastProcessedAbsoluteWeek),
    };
};

export const getDynastyCareerArchives = (player: Pick<Player, 'flags'>): DynastyCareerArchive[] => {
    const state = normalizeDynastyCareerState(player);
    const rawArchives = player.flags?.dynastyCareerArchives && typeof player.flags.dynastyCareerArchives === 'object'
        ? player.flags.dynastyCareerArchives as Record<string, DynastyCareerArchive>
        : {};
    const entries = Object.entries(rawArchives)
        .filter(([, archive]) => archive && typeof archive === 'object')
        .sort(([leftId], [rightId]) => {
            const leftGeneration = state.members[leftId]?.generation || 0;
            const rightGeneration = state.members[rightId]?.generation || 0;
            return leftGeneration - rightGeneration || leftId.localeCompare(rightId);
        })
        .map(([, archive]) => archive);
    if (entries.length > 0) return entries;
    const compatibilityArchive = player.flags?.legacyCareerArchive;
    return compatibilityArchive && typeof compatibilityArchive === 'object' ? [compatibilityArchive] : [];
};

export const createDynastyNpcProjection = (member: DynastyCareerMember): NPCActor => ({
    id: member.npcId,
    name: member.name,
    handle: `@${member.name.replace(/\s+/g, '_').toLowerCase()}`,
    gender: member.gender,
    avatar: member.avatar,
    tier: member.fame >= 90 ? 'ICON' : member.fame >= 75 ? 'A_LIST' : member.fame >= 50 ? 'ESTABLISHED' : member.fame >= 25 ? 'RISING' : 'INDIE',
    prestigeBias: 'MIXED',
    openness: member.status === 'ACTIVE' ? 82 : member.status === 'SELECTIVE' ? 52 : 0,
    followers: 0,
    netWorth: 0,
    occupation: 'ACTOR',
    age: member.ageAtSuccession,
    bio: `${member.name} is a former head of the family studio with an independent screen career.`,
    stats: { fame: member.fame, talent: member.talent },
    isIndependent: false,
});

export const migrateLegacyDynastyCareerState = (
    player: Player,
    absoluteWeek: number,
): { state: DynastyCareerState; archives: Record<string, DynastyCareerArchive>; extraNPCs: NPCActor[] } => {
    const state = normalizeDynastyCareerState(player);
    const archives = player.flags?.dynastyCareerArchives && typeof player.flags.dynastyCareerArchives === 'object'
        ? { ...player.flags.dynastyCareerArchives } as Record<string, DynastyCareerArchive>
        : {};
    const legacyParent = player.flags?.legacyParent;
    const compatibilityArchive = player.flags?.legacyCareerArchive as DynastyCareerArchive | undefined;
    if (legacyParent?.actorId && !state.members[legacyParent.actorId]) {
        const existingNpc = (player.flags?.extraNPCs || []).find((npc: NPCActor) => npc?.id === legacyParent.actorId);
        const relationship = (player.relationships || []).find(entry => (entry.npcId || entry.id) === legacyParent.actorId);
        const isDeceased = Boolean(legacyParent.isDeceased || relationship?.relation === 'Deceased Parent');
        const seedNpc = existingNpc || ({
            id: legacyParent.actorId,
            name: legacyParent.name,
            avatar: legacyParent.avatar,
            gender: legacyParent.gender,
            stats: { fame: 50, talent: 50 },
        } as NPCActor);
        const member: DynastyCareerMember = {
            id: legacyParent.actorId,
            playerId: String(legacyParent.playerId || legacyParent.actorId),
            npcId: legacyParent.actorId,
            name: String(legacyParent.name || seedNpc.name || 'Previous generation'),
            avatar: String(legacyParent.avatar || seedNpc.avatar || ''),
            gender: legacyParent.gender || seedNpc.gender || 'NON_BINARY',
            generation: Math.max(1, (player.bloodline || []).find(entry => entry.id === legacyParent.playerId)?.generation || (player.bloodline?.length || 1)),
            ageAtSuccession: Math.max(1, Math.round(Number(relationship?.age || legacyParent.inheritedAtAge || seedNpc.age || 18))),
            successionAbsoluteWeek: absoluteWeek,
            health: isDeceased ? 0 : 65,
            fame: clamp(seedNpc.stats?.fame, 0, 100),
            talent: clamp(seedNpc.stats?.talent, 0, 100),
            ambition: getTrait(`${legacyParent.actorId}:ambition`, 42, 92),
            selectivity: getTrait(`${legacyParent.actorId}:selectivity`, 35, 90),
            familyLoyalty: getTrait(`${legacyParent.actorId}:family-loyalty`, 58, 96),
            status: isDeceased ? 'DECEASED' : 'ACTIVE',
            currentProjectIds: [],
            completedProjectIds: [],
            lastDecisionAbsoluteWeek: absoluteWeek,
            nextDecisionAbsoluteWeek: absoluteWeek + 4,
            ...(isDeceased ? { diedAtAbsoluteWeek: absoluteWeek, deathCause: 'Recorded before dynasty career migration' } : {}),
            history: [{
                id: createDeterministicId('dynasty_event', legacyParent.actorId, 'SUCCESSION', absoluteWeek),
                type: 'SUCCESSION',
                absoluteWeek,
                title: `${legacyParent.name} belongs to the previous generation`,
                detail: isDeceased ? 'This career is preserved in the family record.' : 'This living former character may continue an independent career.',
            }],
        };
        state.members[member.npcId] = member;
        if (compatibilityArchive) archives[member.npcId] = compatibilityArchive;
    }
    const existingExtraNPCs = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs as NPCActor[] : [];
    const byId = new Map(existingExtraNPCs.filter(npc => npc?.id).map(npc => [npc.id, npc]));
    Object.values(state.members).forEach(member => {
        if (member.status === 'DECEASED') {
            byId.delete(member.npcId);
            return;
        }
        if (!byId.has(member.npcId)) byId.set(member.npcId, createDynastyNpcProjection(member));
    });
    return { state, archives, extraNPCs: [...byId.values()] };
};

const shiftOptionalWeek = (value: number | undefined, delta: number): number | undefined => (
    value === undefined ? undefined : Math.max(0, value + delta)
);

const rebaseMember = (member: DynastyCareerMember, delta: number): DynastyCareerMember => ({
    ...member,
    successionAbsoluteWeek: Math.max(0, member.successionAbsoluteWeek + delta),
    lastDecisionAbsoluteWeek: Math.max(0, member.lastDecisionAbsoluteWeek + delta),
    nextDecisionAbsoluteWeek: Math.max(0, member.nextDecisionAbsoluteWeek + delta),
    hiatusUntilAbsoluteWeek: shiftOptionalWeek(member.hiatusUntilAbsoluteWeek, delta),
    retiredAtAbsoluteWeek: shiftOptionalWeek(member.retiredAtAbsoluteWeek, delta),
    diedAtAbsoluteWeek: shiftOptionalWeek(member.diedAtAbsoluteWeek, delta),
    history: member.history.map(event => ({
        ...event,
        absoluteWeek: Math.max(0, event.absoluteWeek + delta),
    })),
});

const getTrait = (seed: string, minimum: number, maximum: number): number => {
    const roll = createDeterministicRng(seed)();
    return Math.round(minimum + roll * (maximum - minimum));
};

export interface BuildDynastySuccessionInput {
    player: Player;
    parentActor: NPCActor;
    archive: DynastyCareerArchive;
    sourceAbsoluteWeek: number;
    targetAbsoluteWeek: number;
    isDeceased: boolean;
}

export const buildDynastySuccessionState = (input: BuildDynastySuccessionInput): {
    state: DynastyCareerState;
    archives: Record<string, DynastyCareerArchive>;
} => {
    const existing = normalizeDynastyCareerState(input.player);
    const delta = input.targetAbsoluteWeek - input.sourceAbsoluteWeek;
    const members = Object.fromEntries(
        Object.entries(existing.members).map(([id, member]) => [id, rebaseMember(member, delta)]),
    );
    const eventId = createDeterministicId('dynasty_event', input.parentActor.id, 'SUCCESSION', input.targetAbsoluteWeek);
    const successionEvent: DynastyCareerEvent = {
        id: eventId,
        type: 'SUCCESSION',
        absoluteWeek: input.targetAbsoluteWeek,
        title: `${input.parentActor.name} steps away from family leadership`,
        detail: input.isDeceased
            ? `${input.parentActor.name}'s career is preserved as part of the family legacy.`
            : `${input.parentActor.name} remains free to continue a personal career after the handoff.`,
    };
    const member: DynastyCareerMember = {
        id: input.parentActor.id,
        playerId: input.player.id,
        npcId: input.parentActor.id,
        name: input.parentActor.name,
        avatar: input.parentActor.avatar,
        gender: input.parentActor.gender,
        generation: (input.player.bloodline?.length || 0) + 1,
        ageAtSuccession: Math.max(1, Math.round(input.player.age)),
        successionAbsoluteWeek: input.targetAbsoluteWeek,
        health: clamp(input.player.stats?.health, 0, 100),
        fame: clamp(input.player.stats?.fame, 0, 100),
        talent: clamp(input.player.stats?.talent, 0, 100),
        ambition: getTrait(`${input.parentActor.id}:ambition`, 42, 92),
        selectivity: getTrait(`${input.parentActor.id}:selectivity`, 35, 90),
        familyLoyalty: getTrait(`${input.parentActor.id}:family-loyalty`, 58, 96),
        status: input.isDeceased ? 'DECEASED' : 'ACTIVE',
        currentProjectIds: safeIds((input.player.commitments || [])
            .filter(commitment => commitment.projectDetails?.castList?.some(member => member.actorId === 'PLAYER_SELF' || member.isPlayer))
            .map(commitment => commitment.id)),
        completedProjectIds: [],
        lastDecisionAbsoluteWeek: input.targetAbsoluteWeek,
        nextDecisionAbsoluteWeek: input.targetAbsoluteWeek + 4,
        ...(input.isDeceased ? {
            diedAtAbsoluteWeek: input.targetAbsoluteWeek,
            deathCause: String(input.player.flags?.deathCauseTitle || 'Death before succession'),
        } : {}),
        history: [successionEvent],
    };
    members[member.npcId] = member;
    const existingArchives = input.player.flags?.dynastyCareerArchives && typeof input.player.flags.dynastyCareerArchives === 'object'
        ? input.player.flags.dynastyCareerArchives as Record<string, DynastyCareerArchive>
        : {};
    return {
        state: {
            schemaVersion: DYNASTY_CAREER_SCHEMA_VERSION,
            members,
            lastProcessedAbsoluteWeek: Math.max(0, existing.lastProcessedAbsoluteWeek + delta),
        },
        archives: {
            ...existingArchives,
            [member.npcId]: input.archive,
        },
    };
};

export const getDynastyMemberAge = (member: DynastyCareerMember, absoluteWeek: number): number => (
    member.ageAtSuccession + Math.max(0, Math.floor(((member.diedAtAbsoluteWeek === undefined
        ? absoluteWeek
        : Math.min(absoluteWeek, member.diedAtAbsoluteWeek)) - member.successionAbsoluteWeek) / 52))
);

export const resolveDynastyCareerDecision = (
    member: DynastyCareerMember,
    age: number,
    absoluteWeek: number,
    hasLiveWork: boolean,
): DynastyCareerStatus => {
    if (member.status === 'DECEASED' || member.status === 'RETIRED') return member.status;
    if (hasLiveWork) return member.status === 'SELECTIVE' ? 'SELECTIVE' : 'ACTIVE';
    if (member.status === 'HIATUS' && (member.hiatusUntilAbsoluteWeek || 0) > absoluteWeek) return 'HIATUS';

    const roll = createDeterministicRng(`${member.npcId}:career-decision:${absoluteWeek}`)();
    const retirementPressure = Math.max(0, age - 55) * 2
        + Math.max(0, 50 - member.health) * 1.5
        + member.selectivity * 0.25
        - member.ambition * 0.35
        + roll * 10;
    if (age >= 58 && retirementPressure >= 72) return 'RETIRED';
    if (member.health < 42 || roll < Math.max(0.03, (55 - member.health) / 160)) return 'HIATUS';
    if (age >= 58 || member.selectivity > member.ambition + 18) return 'SELECTIVE';
    return 'ACTIVE';
};

export const shouldDynastyMemberDie = (
    member: DynastyCareerMember,
    age: number,
    absoluteWeek: number,
    health: number,
): boolean => {
    if (member.status === 'DECEASED' || age < 68 || health >= 18) return false;
    const frailty = Math.max(0, 18 - health) / 18;
    const deathRisk = Math.min(0.48, getOldAgeIncidentChance(age) * (0.35 + frailty));
    return createDeterministicRng(`${member.npcId}:mortality:${absoluteWeek}`)() < deathRisk;
};

export interface DynastyTalentOfferInput {
    platformId: PlatformId;
    canonicalProjectId: string;
    genre: Genre;
    absoluteWeek: number;
}

export interface DynastyTalentOfferDecision {
    eligible: boolean;
    modifier: number;
    reason: 'NOT_DYNASTY' | 'ACTIVE' | 'SELECTIVE_ACCEPTED' | 'SELECTIVE_DECLINED' | 'UNAVAILABLE' | 'HEALTH';
}

export const evaluateDynastyTalentOffer = (
    player: Pick<Player, 'flags'>,
    npc: NPCActor,
    offer: DynastyTalentOfferInput,
): DynastyTalentOfferDecision => {
    const member = normalizeDynastyCareerState(player).members[npc.id];
    if (!member) return { eligible: true, modifier: 0, reason: 'NOT_DYNASTY' };
    if (member.health < 18) return { eligible: false, modifier: -100, reason: 'HEALTH' };
    if (member.status === 'DECEASED' || member.status === 'RETIRED' || member.status === 'HIATUS') {
        return { eligible: false, modifier: -100, reason: 'UNAVAILABLE' };
    }
    if (member.status === 'ACTIVE') {
        const activeModifier = Math.round((member.ambition - member.selectivity) / 16);
        return { eligible: true, modifier: activeModifier, reason: 'ACTIVE' };
    }

    const prestigeGenre = offer.genre === 'DRAMA' || offer.genre === 'BIOPIC' || offer.genre === 'DOCUMENTARY';
    const prestigeFit = npc.prestigeBias === 'MIXED' || (prestigeGenre && npc.prestigeBias === 'PRESTIGE') ? 0.16 : 0;
    const ambitionLift = member.ambition / 260;
    const healthLift = member.health / 500;
    const threshold = 0.42 + member.selectivity / 250;
    const roll = createDeterministicRng(`${member.npcId}:${offer.platformId}:${offer.canonicalProjectId}:${offer.absoluteWeek}:offer`)();
    const eligible = roll + prestigeFit + ambitionLift + healthLift >= threshold;
    return eligible
        ? { eligible: true, modifier: 4 + Math.round(prestigeFit * 20), reason: 'SELECTIVE_ACCEPTED' }
        : { eligible: false, modifier: -100, reason: 'SELECTIVE_DECLINED' };
};

const progressDynastyHealth = (
    member: DynastyCareerMember,
    age: number,
    absoluteWeek: number,
    hasLiveWork: boolean,
): number => {
    const ageDrain = age < 60 ? 0 : Math.min(1.35, (age - 59) * 0.045);
    const workloadDrain = hasLiveWork ? 0.35 : 0;
    const recovery = !hasLiveWork && age < 70 && member.health < 82 ? 0.2 : 0;
    const incidentRoll = createDeterministicRng(`${member.npcId}:old-age-incident:${absoluteWeek}`)();
    const incidentDrain = incidentRoll < getOldAgeIncidentChance(age)
        ? 1.5 + Math.max(0, age - 68) * 0.08
        : 0;
    return Math.max(0, Math.min(100, Math.round((member.health - ageDrain - workloadDrain - incidentDrain + recovery) * 10) / 10));
};

const appendEvent = (member: DynastyCareerMember, event: DynastyCareerEvent): DynastyCareerMember => {
    if (member.history.some(existing => existing.id === event.id)) return member;
    return {
        ...member,
        history: [...member.history, event]
            .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
            .slice(-DYNASTY_CAREER_HISTORY_LIMIT),
    };
};

const getProductionTitle = (player: Player, projectId: string): string => {
    const production = Object.values(player.world?.industryProductions || {})
        .find(candidate => candidate.canonicalProjectId === projectId);
    return production?.title || 'an industry production';
};

const getLiveProjectIds = (player: Player, npcId: string): string[] => (
    safeIds((player.world?.talentBookings || [])
        .filter(booking => (
            booking.npcId === npcId
            && booking.status === 'BOOKED'
        ))
        .map(booking => booking.projectId))
);

const interruptProductionsForDeceasedTalent = (
    world: WorldState,
    npcId: string,
    absoluteWeek: number,
): WorldState => {
    const projectIds = safeIds((world.talentBookings || [])
        .filter(booking => booking.npcId === npcId && booking.status === 'BOOKED')
        .map(booking => booking.projectId));
    if (projectIds.length === 0) return world;

    let platforms = world.platforms;
    const industryProductions = { ...(world.industryProductions || {}) };
    let talentBookings = world.talentBookings;
    projectIds.forEach(projectId => {
        const production = Object.values(industryProductions).find(candidate => (
            candidate.canonicalProjectId === projectId
            && !['DELIVERED', 'CANCELLED'].includes(candidate.status)
        ));
        if (!production) {
            talentBookings = cancelProjectTalentBookings(talentBookings, projectId, absoluteWeek);
            return;
        }

        const usesPlatformAiRecovery = Boolean(
            production.aiExecution
            && production.commissioningPlatformId
            && production.platformContentPlanId,
        );
        industryProductions[production.id] = usesPlatformAiRecovery ? {
            ...production,
            status: 'ON_HOLD',
            aiExecution: {
                ...production.aiExecution!,
                failureResponse: 'ON_HOLD',
                failureResponseAppliedAtAbsoluteWeek: absoluteWeek,
                lastProgressedAbsoluteWeek: absoluteWeek,
                holdReason: 'TALENT_DECEASED',
            },
            updatedAtAbsoluteWeek: absoluteWeek,
        } : {
            ...production,
            status: 'CANCELLED',
            updatedAtAbsoluteWeek: absoluteWeek,
        };
        talentBookings = cancelProjectTalentBookings(talentBookings, projectId, absoluteWeek);

        if (usesPlatformAiRecovery) {
            const platformId = production.commissioningPlatformId!;
            const platform = platforms?.[platformId];
            if (platform?.ai) {
                platforms = {
                    ...platforms,
                    [platformId]: {
                        ...platform,
                        ai: {
                            ...platform.ai,
                            slate: platform.ai.slate.map(plan => (
                                plan.id === production.platformContentPlanId
                                    ? { ...plan, status: 'ON_HOLD' }
                                    : plan
                            )),
                        },
                    },
                };
            }
        }
    });
    return {
        ...world,
        platforms,
        industryProductions,
        talentBookings,
    };
};

const projectIsCompleted = (player: Player, npcId: string, projectId: string): boolean => {
    const bookingCompleted = (player.world?.talentBookings || []).some(booking => (
        booking.npcId === npcId
        && booking.projectId === projectId
        && booking.status === 'RELEASED'
    ));
    const productionCompleted = Object.values(player.world?.industryProductions || {}).some(production => (
        production.canonicalProjectId === projectId
        && production.status === 'DELIVERED'
    ));
    return bookingCompleted && productionCompleted;
};

export interface DynastyCareerWeekResult {
    player: Player;
    news: NewsItem[];
    logs: string[];
}

export const processDynastyCareerWeek = (player: Player, absoluteWeek: number): DynastyCareerWeekResult => {
    const state = normalizeDynastyCareerState(player);
    if (state.lastProcessedAbsoluteWeek >= absoluteWeek) return { player, news: [], logs: [] };

    const news: NewsItem[] = [];
    const logs: string[] = [];
    const deceasedNpcIds: string[] = [];
    const members: Record<string, DynastyCareerMember> = {};
    Object.values(state.members)
        .sort((left, right) => left.npcId.localeCompare(right.npcId))
        .forEach(sourceMember => {
            let member = { ...sourceMember };
            if (member.status !== 'DECEASED') {
                const liveProjectIds = getLiveProjectIds(player, member.npcId);
                const joinedProjectIds = liveProjectIds.filter(projectId => !member.currentProjectIds.includes(projectId));
                const departedProjectIds = member.currentProjectIds.filter(projectId => !liveProjectIds.includes(projectId));

                joinedProjectIds.forEach(projectId => {
                    const title = getProductionTitle(player, projectId);
                    const event: DynastyCareerEvent = {
                        id: createDeterministicId('dynasty_event', member.npcId, 'PROJECT_JOINED', projectId),
                        type: 'PROJECT_JOINED',
                        absoluteWeek,
                        projectId,
                        title: `${member.name} joins ${title}`,
                        detail: `${member.name} accepted an outside production through the normal industry talent market.`,
                    };
                    member = appendEvent(member, event);
                    news.push({
                        id: `news_${event.id}`,
                        headline: event.title,
                        subtext: event.detail,
                        category: 'INDUSTRY',
                        week: (absoluteWeek % 52) + 1,
                        year: Math.floor(absoluteWeek / 52) + 1,
                        impactLevel: member.fame >= 75 ? 'HIGH' : 'MEDIUM',
                    });
                    logs.push(event.title);
                });

                departedProjectIds.forEach(projectId => {
                    if (!projectIsCompleted(player, member.npcId, projectId) || member.completedProjectIds.includes(projectId)) return;
                    const title = getProductionTitle(player, projectId);
                    const event: DynastyCareerEvent = {
                        id: createDeterministicId('dynasty_event', member.npcId, 'PROJECT_COMPLETED', projectId),
                        type: 'PROJECT_COMPLETED',
                        absoluteWeek,
                        projectId,
                        title: `${member.name} completes ${title}`,
                        detail: `${member.name}'s work is preserved in the family career record.`,
                    };
                    member = appendEvent(member, event);
                    member.completedProjectIds = safeIds([...member.completedProjectIds, projectId]);
                    logs.push(event.title);
                });
                member.currentProjectIds = liveProjectIds;
                const age = getDynastyMemberAge(member, absoluteWeek);
                member.health = progressDynastyHealth(member, age, absoluteWeek, liveProjectIds.length > 0);
                if (shouldDynastyMemberDie(member, age, absoluteWeek, member.health)) {
                    const event: DynastyCareerEvent = {
                        id: createDeterministicId('dynasty_event', member.npcId, 'DIED', absoluteWeek),
                        type: 'DIED',
                        absoluteWeek,
                        title: `${member.name} dies at age ${age}`,
                        detail: `${member.name}'s health declined after a long life and career.`,
                    };
                    member = appendEvent(member, event);
                    member.status = 'DECEASED';
                    member.diedAtAbsoluteWeek = absoluteWeek;
                    member.deathCause = 'Age-related health complications';
                    member.currentProjectIds = [];
                    deceasedNpcIds.push(member.npcId);
                    news.push({
                        id: `news_${event.id}`,
                        headline: event.title,
                        subtext: event.detail,
                        category: 'INDUSTRY',
                        week: (absoluteWeek % 52) + 1,
                        year: Math.floor(absoluteWeek / 52) + 1,
                        impactLevel: member.fame >= 75 ? 'HIGH' : 'MEDIUM',
                    });
                    logs.push(event.title);
                } else if (liveProjectIds.length === 0 && absoluteWeek >= member.nextDecisionAbsoluteWeek) {
                    const previousStatus = member.status;
                    const nextStatus = resolveDynastyCareerDecision(member, age, absoluteWeek, false);
                    member.status = nextStatus;
                    member.lastDecisionAbsoluteWeek = absoluteWeek;
                    member.nextDecisionAbsoluteWeek = absoluteWeek + 4 + Math.floor(createDeterministicRng(`${member.npcId}:next-decision:${absoluteWeek}`)() * 5);
                    if (nextStatus === 'HIATUS') member.hiatusUntilAbsoluteWeek = member.nextDecisionAbsoluteWeek + 4;
                    if (nextStatus === 'RETIRED') member.retiredAtAbsoluteWeek = absoluteWeek;
                    if (nextStatus !== previousStatus) {
                        const eventType: DynastyCareerEvent['type'] = nextStatus === 'RETIRED'
                            ? 'RETIRED'
                            : nextStatus === 'HIATUS'
                                ? 'HIATUS_STARTED'
                                : 'RETURNED';
                        const title = nextStatus === 'RETIRED'
                            ? `${member.name} retires from acting`
                            : nextStatus === 'HIATUS'
                                ? `${member.name} steps away from the screen`
                                : `${member.name} returns to the industry`;
                        const event: DynastyCareerEvent = {
                            id: createDeterministicId('dynasty_event', member.npcId, eventType, absoluteWeek),
                            type: eventType,
                            absoluteWeek,
                            title,
                            detail: nextStatus === 'RETIRED'
                                ? `${member.name} chose to close an independent career on personal terms.`
                                : nextStatus === 'HIATUS'
                                    ? `${member.name} is taking time away before considering another role.`
                                    : `${member.name} is available for selected industry work again.`,
                        };
                        member = appendEvent(member, event);
                        news.push({
                            id: `news_${event.id}`,
                            headline: event.title,
                            subtext: event.detail,
                            category: 'INDUSTRY',
                            week: (absoluteWeek % 52) + 1,
                            year: Math.floor(absoluteWeek / 52) + 1,
                            impactLevel: member.fame >= 75 ? 'HIGH' : 'MEDIUM',
                        });
                        logs.push(event.title);
                    }
                }
            }
            members[member.npcId] = member;
        });

    const nextState: DynastyCareerState = {
        schemaVersion: DYNASTY_CAREER_SCHEMA_VERSION,
        members,
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
    const existingExtraNPCs = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs as NPCActor[] : [];
    const projectedById = new Map(existingExtraNPCs.map(npc => [npc.id, npc]));
    Object.values(members).forEach(member => {
        if (member.status === 'DECEASED') projectedById.delete(member.npcId);
        else if (!projectedById.has(member.npcId)) projectedById.set(member.npcId, createDynastyNpcProjection(member));
    });
    const extraNPCs = [...projectedById.values()]
        .filter((npc: NPCActor) => members[npc.id]?.status !== 'DECEASED').map((npc: NPCActor) => {
            const member = members[npc.id];
            if (!member) return npc;
            return {
                ...npc,
                age: getDynastyMemberAge(member, absoluteWeek),
                openness: member.status === 'ACTIVE' ? 82 : member.status === 'SELECTIVE' ? 52 : 0,
                stats: {
                    ...npc.stats,
                    fame: member.fame,
                    talent: member.talent,
                },
            };
        });
    const relationships = (player.relationships || []).map(relationship => {
        const member = members[relationship.npcId || relationship.id];
        if (!member) return relationship;
        return {
            ...relationship,
            age: getDynastyMemberAge(member, absoluteWeek),
            relation: member.status === 'DECEASED' ? 'Deceased Parent' as const : relationship.relation,
        };
    });
    const world = deceasedNpcIds.reduce(
        (currentWorld, npcId) => interruptProductionsForDeceasedTalent(currentWorld, npcId, absoluteWeek),
        player.world,
    );
    return {
        player: {
            ...player,
            world,
            relationships,
            flags: {
                ...(player.flags || {}),
                dynastyCareer: nextState,
                extraNPCs,
            },
        },
        news,
        logs,
    };
};
