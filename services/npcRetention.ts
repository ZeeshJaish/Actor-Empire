import type { NPCActor, Player } from '../types';

const rows = (value: unknown): any[] => Array.isArray(value) ? value : [];
const contractsFor = (player: Player) => [
    ...rows(player.studio?.talentRoster),
    ...rows(player.businesses).flatMap(b => rows(b.studioState?.talentRoster)),
];

const deceasedIds = (player: Player): Set<string> => {
    const ids = new Set<string>();
    for (const [id, member] of Object.entries(player.flags?.dynastyCareer?.members || {}) as Array<[string, { status?: unknown; npcId?: unknown }]>) {
        if (member?.status !== 'DECEASED') continue;
        ids.add(id);
        if (typeof member.npcId === 'string') ids.add(member.npcId);
    }
    return ids;
};

export const isKnownDeceasedNpc = (player: Player, id: string): boolean => deceasedIds(player).has(id);

/** Only a complete saved actor profile can restore casting eligibility. */
export const isActorProfileSnapshot = (value: any, id: string): value is NPCActor => Boolean(
    value && value.id === id && value.occupation === 'ACTOR'
    && typeof value.name === 'string' && value.name.trim()
    && typeof value.avatar === 'string' && typeof value.handle === 'string'
    && typeof value.gender === 'string' && typeof value.tier === 'string'
    && Number.isFinite(value.stats?.talent) && Number.isFinite(value.stats?.fame),
);

function* projectReferences(player: Player): Generator<any> {
    yield* rows(player.commitments);
    yield* rows(player.activeReleases);
    yield* rows(player.pastProjects);
    for (const business of rows(player.businesses)) {
        yield* rows(business.studioState?.scripts);
        yield* rows(business.studioState?.concepts);
        yield* rows(business.studioState?.subsidiaryProjectProposals);
    }
    for (const archive of Object.values(player.flags?.dynastyCareerArchives || {}) as any[]) {
        yield* rows(archive?.pastProjects);
        yield* rows(archive?.activeReleases);
    }
}

/** Shared by weekly cleanup and persistence: references outlive market rotation. */
export const collectReferencedNpcIds = (player: Player): Set<string> => {
    const ids = new Set<string>();
    const add = (...values: unknown[]) => values.forEach(value => {
        if (typeof value === 'string' && value) ids.add(value);
    });
    const project = (value: any) => {
        if (!value || typeof value !== 'object') return;
        add(value.directorId, value.actorId, value.npcId, value.sourceNpcId, value.writerId);
        for (const person of [...rows(value.castList), ...rows(value.crewList), ...rows(value.returningTalent)]) add(person?.npcId, person?.actorId, person?.id);
    };
    for (const contract of contractsFor(player)) add(contract?.npcId, contract?.actorId, contract?.talentId, contract?.personId, contract?.directorId);
    for (const rel of rows(player.relationships)) add(rel?.id, rel?.npcId, rel?.sourceNpcId);
    for (const value of projectReferences(player)) { project(value); project(value?.projectDetails); }
    for (const booking of rows(player.world?.talentBookings)) add(booking?.npcId);
    for (const universe of Object.values(player.world?.universes || {}) as any[]) {
        for (const character of rows(universe?.roster)) add(character?.actorId, character?.id);
    }
    Object.keys(player.flags?.dynastyCareer?.members || {}).forEach(id => add(id));
    return ids;
};

/** Never change contracts or finances to repair identity; use only matching snapshots. */
export const restoreContractActorProfiles = (player: Player): Player => {
    const existing = rows(player.flags?.extraNPCs);
    const ids = new Set(existing.map(npc => npc?.id));
    const recovered: NPCActor[] = [];
    const deceased = deceasedIds(player);
    for (const contract of contractsFor(player)) {
        if (!deceased.has(contract?.npcId) && !ids.has(contract?.npcId) && isActorProfileSnapshot(contract?.actorSnapshot, contract?.npcId)) {
            recovered.push(structuredClone(contract.actorSnapshot));
            ids.add(contract.npcId);
        }
    }
    return recovered.length ? { ...player, flags: { ...player.flags, extraNPCs: [...existing, ...recovered] } } : player;
};

/** A shared, originally signed contract establishes lineage; player.id is not unique per career. */
const signedContractAnchors = (player: Player): Map<string, string> => {
    const anchors = new Map<string, string>();
    const studios = rows(player.businesses).filter(b => b?.studioState && typeof b.id === 'string');
    const owners = new Set(studios.map(b => b.id));
    const add = (contract: any, ownerId: string) => {
        const id = contract?.npcId;
        if (typeof id !== 'string' || !id || !owners.has(ownerId)) return;
        if (contract.studioId && contract.studioId !== ownerId) return;
        // normalizeStudioContract can synthesize legacy IDs. Those cannot prove lineage.
        const prefix = `contract_${id}_`;
        if (typeof contract.id !== 'string' || !contract.id.startsWith(prefix)
            || !/^\d{10,}$/.test(contract.id.slice(prefix.length))) return;
        if (contract.type !== 'MOVIE_DEAL' || !['UPFRONT', 'WEEKLY_INSTALLMENTS'].includes(contract.paymentMode)) return;
        const terms = [contract.totalAmount, contract.totalMovies, contract.startWeek, contract.maintenanceFee, contract.totalInstallments];
        if (terms.some(value => !Number.isFinite(value) || value < 0)) return;
        const key = JSON.stringify([ownerId, contract.id, id, contract.type, contract.paymentMode, ...terms]);
        anchors.set(key, id);
    };
    for (const studio of studios) for (const contract of rows(studio.studioState.talentRoster)) add(contract, studio.id);
    for (const contract of rows(player.studio?.talentRoster)) add(contract, contract?.studioId);
    return anchors;
};

/** Only unresolved signed actors warrant a backup read; built-in profiles are already usable. */
export const getMissingContractActorIds = (player: Player, databaseIds: ReadonlySet<string>): Set<string> => {
    const known = new Set([...databaseIds, ...rows(player.flags?.extraNPCs).map(npc => npc?.id)]);
    const deceased = deceasedIds(player);
    return new Set([...signedContractAnchors(player).values()].filter(id => !known.has(id) && !deceased.has(id)));
};

/** Caller verifies the generation. Copy profiles only for matching contract + owning studio provenance. */
export const recoverNpcProfilesFromPrevious = (current: Player, previous: Player, missingIds: ReadonlySet<string>): Player => {
    if (!current.id || current.id !== previous.id) return current;
    const previousAnchors = signedContractAnchors(previous);
    const authorized = new Set([...signedContractAnchors(current)].filter(([key]) => previousAnchors.has(key)).map(([, id]) => id));
    const existing = rows(current.flags?.extraNPCs);
    const known = new Set(existing.map(npc => npc?.id));
    const deceased = deceasedIds(current);
    const recovered: NPCActor[] = [];
    const candidates = [...rows(previous.flags?.extraNPCs), ...contractsFor(previous).map(c => c?.actorSnapshot)];
    for (const npc of candidates) {
        if (!npc?.id || known.has(npc.id) || deceased.has(npc.id) || !missingIds.has(npc.id)
            || !authorized.has(npc.id) || !isActorProfileSnapshot(npc, npc.id)) continue;
        recovered.push(structuredClone(npc));
        known.add(npc.id);
    }
    return recovered.length ? { ...current, flags: { ...current.flags, extraNPCs: [...existing, ...recovered] } } : current;
};

export const retainReferencedNpcProfiles = (player: Player, candidates: NPCActor[], recentLimit: number): NPCActor[] => {
    const referenced = collectReferencedNpcIds(player);
    const byId = new Map<string, NPCActor>();
    const deceased = deceasedIds(player);
    for (const contract of contractsFor(player)) {
        if (!deceased.has(contract?.npcId) && isActorProfileSnapshot(contract?.actorSnapshot, contract?.npcId)) byId.set(contract.npcId, contract.actorSnapshot);
    }
    // The current saved profile wins over an older contract snapshot.
    for (const npc of rows(candidates)) if (npc?.id && !deceased.has(npc.id)) byId.set(npc.id, npc);
    const unique = [...byId.values()];
    const unreferenced = unique.filter(npc => !referenced.has(npc.id));
    const recent = new Set((recentLimit > 0 ? unreferenced.slice(-recentLimit) : []).map(npc => npc.id));
    return unique.filter(npc => referenced.has(npc.id) || recent.has(npc.id));
};

/** Display-only evidence. A name is never promoted into invented skills or a new actor. */
export const getSavedTalentName = (player: Player, id: string): string | undefined => {
    const snapshot = contractsFor(player).find(c => c?.npcId === id)?.actorSnapshot;
    if (snapshot?.id === id && typeof snapshot.name === 'string' && snapshot.name.trim()) return snapshot.name;
    for (const value of projectReferences(player)) {
        for (const project of [value, value?.projectDetails]) {
            for (const person of [...rows(project?.castList), ...rows(project?.crewList), ...rows(project?.returningTalent)]) {
                if ((person?.actorId || person?.npcId || person?.id) !== id) continue;
                const name = person.actorName || person.name;
                if (typeof name === 'string' && name.trim()) return name;
            }
        }
    }
    return undefined;
};
