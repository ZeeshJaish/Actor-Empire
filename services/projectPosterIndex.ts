import type { CustomPoster, Player } from '../types';

/* B20 (2026-11-15): one answer, for every streaming screen, to "has the player made a poster for this title?"
   The Library read five places, the Studio Finance room two and the Content Market two, so a studio title's
   poster set in the studio (on its library entry, its concept, or the script it was made from) never reached
   the service, and an Original commissioned from another studio could not have one at all. The first poster
   found for an id wins, in the order the Library used before; the new places come after it. */
export const buildProjectPosterIndex = (player: Player): Map<string, CustomPoster> => {
    const index = new Map<string, CustomPoster>();
    const add = (id: unknown, poster: CustomPoster | null | undefined) => {
        if (!poster || id === undefined || id === null || String(id) === '' || index.has(String(id))) return;
        index.set(String(id), poster);
    };
    const businesses = player.businesses || [];
    const scripts = new Map(businesses.flatMap(business => (business.studioState?.scripts || []).map(script => [String(script.id), script] as const)));
    /* a title made from a script carries the script's poster when it has none of its own */
    const fromScript = (row: any): CustomPoster | undefined => {
        const scriptId = row?.sourceScriptId ?? row?.projectDetails?.sourceScriptId;
        return scriptId ? scripts.get(String(scriptId))?.customPoster : undefined;
    };
    (player.pastProjects || []).forEach(project => add(project.id, project.customPoster || fromScript(project)));
    (player.activeReleases || []).forEach(release => add(release.id, release.projectDetails?.customPoster || fromScript(release)));
    (player.commitments || []).forEach(commitment => add(commitment.id, commitment.projectDetails?.customPoster || fromScript(commitment)));
    (Array.isArray(player.flags?.legacyStudioProjects) ? player.flags.legacyStudioProjects as Array<Record<string, any>> : [])
        .forEach(project => add(project.id, project.customPoster || project.projectDetails?.customPoster || fromScript(project)));
    scripts.forEach((script, id) => add(id, script.customPoster));
    (player.ownedStreamingPlatform?.originalCommissions || []).forEach(commission => {
        const poster = commission.customPoster || scripts.get(String(commission.scriptId))?.customPoster;
        add(commission.canonicalProjectId, poster);
        add(commission.id, poster);
    });
    /* new places: the studio's library and its concepts */
    businesses.forEach(business => {
        ((business as any).library || []).forEach((project: any) => add(project?.id, project?.customPoster || project?.projectDetails?.customPoster || fromScript(project)));
        (business.studioState?.concepts || []).forEach(concept => add(concept.id, concept.customPoster));
    });
    return index;
};

/** B20: a poster set on an Original's page goes on the Original and on every record of the same title
    (its release, its archive entry, its production, the studio's library), so every screen shows the same one. */
export const setTitlePoster = (player: Player, ids: { projectId?: string | null; commissionId?: string | null }, poster: CustomPoster): Player => {
    const projectId = ids.projectId ? String(ids.projectId) : '';
    const sameTitle = (id: unknown) => Boolean(projectId) && String(id) === projectId;
    const platform = player.ownedStreamingPlatform;
    return {
        ...player,
        activeReleases: (player.activeReleases || []).map(release => (sameTitle(release.id) && release.projectDetails
            ? { ...release, projectDetails: { ...release.projectDetails, customPoster: poster } } : release)),
        pastProjects: (player.pastProjects || []).map(project => (sameTitle(project.id) ? { ...project, customPoster: poster } : project)),
        commitments: (player.commitments || []).map(commitment => (sameTitle(commitment.id) && commitment.projectDetails
            ? { ...commitment, projectDetails: { ...commitment.projectDetails, customPoster: poster } } : commitment)),
        businesses: (player.businesses || []).map(business => (Array.isArray((business as any).library) && (business as any).library.some((project: any) => sameTitle(project?.id))
            ? { ...business, library: (business as any).library.map((project: any) => (sameTitle(project?.id) ? { ...project, customPoster: poster } : project)) } as typeof business
            : business)),
        ownedStreamingPlatform: platform ? {
            ...platform,
            originalCommissions: platform.originalCommissions.map(commission => (commission.id === ids.commissionId || sameTitle(commission.canonicalProjectId)
                ? { ...commission, customPoster: poster } : commission)),
        } : platform,
    };
};
