import type { ActiveRelease, Player } from '../../types';
export interface CommittedCinemaChartRow {
    id: string;
    title: string;
    source: 'PLAYER' | 'MARKET' | 'OUTSIDE';
    rel?: ActiveRelease;
    weeklyGross: number;
    previousGross?: number;
    studioReceipts: number;
    screens: number;
    runWeek: number;
    budget: number;
    imdbRating?: number;
}
/** Read-only projection of committed tickets. Legacy lifetime gross never becomes invented weekly cash. */
export const getCommittedCinemaChartRows = (player: Player, absoluteWeek = player.world.cinemaMarket?.lastProcessedAbsoluteWeek): {
    rows: CommittedCinemaChartRow[];
    previousRanks: Map<string, number>;
} => {
    const state = player.world.cinemaMarket;
    const current = state?.weeks.find(w => w.absoluteWeek === absoluteWeek && w.clockEpoch === state.clockEpoch);
    const previous = state?.weeks.find(w => w.absoluteWeek === (absoluteWeek || 0) - 1 && w.clockEpoch === state.clockEpoch);
    const previousRanks = new Map((previous?.titles || []).filter(t => t.grossCents > 0).sort((a, b) => b.grossCents - a.grossCents || a.titleId.localeCompare(b.titleId)).map((t, i) => [t.titleId, i + 1]));
    const rows: CommittedCinemaChartRow[] = (current?.titles || []).map((t): CommittedCinemaChartRow => {
        const rel = player.activeReleases.find(r => r.id === t.titleId), archive = player.pastProjects.find(p => p.id === t.titleId), project = player.world.projects.find(p => p.id === t.titleId), outside = player.outsideProductions?.find(o => o.projectId === t.titleId);
        const production = Object.values(player.world.industryProductions || {}).find(p => p.canonicalProjectId === t.titleId);
        const activation = state!.titles[t.titleId]?.activationWeek || absoluteWeek || 0;
        const prior = previous?.titles.find(p => p.titleId === t.titleId);
        return { id: t.titleId, title: rel?.name || archive?.name || project?.title || outside?.projectTitle || t.titleId, source: outside ? 'OUTSIDE' : rel || archive ? 'PLAYER' : 'MARKET', rel,
            weeklyGross: t.grossCents / 100, previousGross: prior ? prior.grossCents / 100 : undefined, studioReceipts: t.producerReceiptsCents / 100, screens: t.screens, runWeek: Math.max(1, (absoluteWeek || activation) - activation + 1),
            budget: rel?.budget || archive?.budget || outside?.budget || (production?.budgetMillions || 0) * 1e6, imdbRating: rel?.imdbRating || archive?.imdbRating || project?.rating };
    }).filter(t => t.weeklyGross > 0).sort((a, b) => b.weeklyGross - a.weeklyGross || a.id.localeCompare(b.id));
    return { rows, previousRanks };
};
