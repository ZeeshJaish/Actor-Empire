import { resolveStreamingProductionReadiness } from '../streamingProductionReadiness';
import { CINEMA_RIGHTS_PROFILE as P } from './boxOfficeProfiles';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import type { Player, ProjectDetails } from '../../types';
export interface CinemaStreamingAudienceEvidence {
    titleId: string;
    countryId: string;
    platformId: string;
    viewingAccounts: number;
    absoluteWeek: number;
}
/** Original language or completed project-specific localization, never a promised future job. */
export const cinemaStreamingLanguageReady = (player: Player, titleId: string, countryId: string, platformId: string, week: number, details?: ProjectDetails): boolean => {
    const active = player.activeReleases.find(r => r.id === titleId)?.projectDetails;
    const archived = player.pastProjects.find(r => r.id === titleId);
    const language = normalizeStreamingLanguageId(details?.originalLanguageId || active?.originalLanguageId || archived?.originalLanguageId || 'english');
    const languages = (player.world.worldPopulation?.countries[countryId]?.languages || []).map(normalizeStreamingLanguageId);
    if (languages.includes(language))
        return true;
    const coreId = player.world.streamingPlatformEcosystem?.operators?.[platformId]?.corePlatformId || platformId;
    return (player.world.platforms?.[coreId]?.ai?.localizationJobs || []).some(j => j.projectId === titleId && j.status === 'READY' && j.readyAtAbsoluteWeek !== null && j.readyAtAbsoluteWeek <= week && j.countryIds.includes(countryId) && languages.includes(normalizeStreamingLanguageId(j.languageId)));
};
/** Preference within an already playable, funded catalogue. Creates no access, accounts, starts or money. */
export const cinemaStreamingInterestWeight = (player: Player, titleId: string, countryId: string, week: number): number => {
    const title = player.world.cinemaMarket?.titles[titleId], country = title?.audienceSignals?.countries.find(c => c.countryId === countryId);
    if (!title || !country || title.lastSettledWeek > week)
        return 1;
    return 1 + Math.min(P.maximumWaitingPreference, country.deferredPeople / Math.max(1, country.awarePeople)) * P.intentRetentionPerWeek ** Math.max(0, week - title.lastSettledWeek);
};
/** Integer allocation within actual licensed viewing envelopes; repeated starts never become cinema cash. */
export const allocateCinemaStreamingEvidence = (player: Player, countryId: string, platformId: string, absoluteWeek: number, eligibleTitleIds: readonly string[], accounts: number): CinemaStreamingAudienceEvidence[] => {
    const ids = [...new Set(eligibleTitleIds)].filter(id => !player.world.cinemaMarket?.titles[id] || (resolveStreamingProductionReadiness(player, id).ready && cinemaStreamingLanguageReady(player, id, countryId, platformId, absoluteWeek))).sort();
    if (!ids.length || accounts <= 0)
        return [];
    if (!Number.isSafeInteger(accounts))
        throw new RangeError('Invalid streaming viewing envelope');
    const weights = ids.map(id => cinemaStreamingInterestWeight(player, id, countryId, absoluteWeek)), sum = weights.reduce((n, w) => n + w, 0);
    const rows = ids.map((id, i) => ({ id, n: Math.floor(accounts * weights[i] / sum), fraction: accounts * weights[i] / sum % 1 }));
    let left = accounts - rows.reduce((n, r) => n + r.n, 0);
    for (const r of [...rows].sort((a, b) => b.fraction - a.fraction || a.id.localeCompare(b.id))) {
        if (left-- > 0)
            r.n++;
    }
    return rows.filter(r => player.world.cinemaMarket?.titles[r.id] && r.n > 0).map(r => ({ titleId: r.id, countryId, platformId, absoluteWeek, viewingAccounts: r.n }));
};
/** Conservative observed lower bound: max across weeks/routes/platforms, never sum repeat starts as unique homes. */
export const recordCinemaStreamingAudience = (player: Player): Player => {
    const state = player.world.cinemaMarket, viewing = player.world.worldStreamingViewing;
    if (!state || !viewing)
        return player;
    const rows = [...(Array.isArray(viewing.cinemaAudienceEvidence) ? viewing.cinemaAudienceEvidence : [])];
    for (const c of Object.values(viewing.countries))
        for (const t of c.titlePerformance)
            if (state.titles[t.projectId] && t.viewingAccounts > 0)
                rows.push({ titleId: t.projectId, countryId: c.countryId, platformId: 'PLAYER', absoluteWeek: viewing.lastProcessedAbsoluteWeek, viewingAccounts: t.viewingAccounts });
    if (!rows.length)
        return player;
    const seen = structuredClone(state.streamingSeen || {});
    for (const row of rows) {
        if (!row || row.absoluteWeek !== viewing.lastProcessedAbsoluteWeek || !state.titles[row.titleId] || !Number.isSafeInteger(row.viewingAccounts) || row.viewingAccounts < 0)
            continue;
        const old = seen[row.titleId];
        if (old && old.lastWeek > row.absoluteWeek)
            continue;
        const countries = { ...(old?.countries || {}) };
        countries[row.countryId] = Math.max(countries[row.countryId] || 0, row.viewingAccounts);
        seen[row.titleId] = { lastWeek: row.absoluteWeek, countries };
    }
    return { ...player, world: { ...player.world, cinemaMarket: { ...state, streamingSeen: seen } } };
};
