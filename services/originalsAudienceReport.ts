import type { OwnedStreamingAudienceGap, OwnedStreamingAudienceReport, Player } from '../types';
import { formatGenreLabel } from './genreCatalog';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { resolveStreamingCatalogTitle } from './streamingCatalog';
import { getWorldStreamingGenreAffinity } from './worldEconomy/worldStreamingViewing';

/**
 * #280: a paid look at what the platform's viewers want and its catalogue does not have. It reads the same audience the viewing engine reads,
 * so it is true, not advice. Money only. It lasts 13 weeks, and while it lasts pitches and scripts that fit carry a tag.
 */

export const ORIGINAL_AUDIENCE_REPORT_WEEKS = 13;

/** About $500K, by company size */
export const getOriginalAudienceReportPrice = (player: Player): number => {
    const subscribers = Number(player.ownedStreamingPlatform?.metrics?.subscribers || 0);
    const treasury = Number(player.ownedStreamingPlatform?.treasuryCash || 0);
    const size = Math.max(subscribers / 5_000_000, treasury / 1_000_000_000);
    const price = 250_000 + Math.min(1, size) * 750_000 + Math.max(0, size - 1) * 250_000;
    return Math.round(Math.min(2_000_000, price) / 50_000) * 50_000;
};

const openCountryIds = (player: Player): string[] => {
    const platform = player.ownedStreamingPlatform;
    const audience = player.world?.worldAudienceEconomy?.countries || {};
    const operating = (platform?.marketOperations || [])
        .filter(operation => operation.countryId && !['CANCELLED', 'FAILED', 'SUSPENDED', 'EXITED'].includes(String(operation.status)))
        .map(operation => String(operation.countryId))
        .filter(id => audience[id]);
    if (operating.length) return [...new Set(operating)];
    /* before any market is open: the biggest audiences it could reach */
    return Object.values(audience)
        .sort((a: any, b: any) => b.commercialHouseholds - a.commercialHouseholds)
        .slice(0, 20)
        .map((country: any) => country.id);
};

/** The biggest things its viewers want and it does not have, one a country and one a genre */
export const getOriginalAudienceGaps = (player: Player): OwnedStreamingAudienceGap[] => {
    const platform = player.ownedStreamingPlatform;
    const audience = player.world?.worldAudienceEconomy?.countries || {};
    const population = player.world?.worldPopulation?.countries || {};
    const affinity = getWorldStreamingGenreAffinity();
    const titles = (platform?.catalogProjectIds || [])
        .map(id => resolveStreamingCatalogTitle(player, id))
        .filter(Boolean);
    const haveShare = (genre: string) => (titles.length ? titles.filter(title => title!.genre === genre).length / titles.length : 0);
    const haveLanguage = (language: string) => (titles.length ? titles.filter(title => String(title!.originalLanguageId || 'english').toLowerCase() === language.toLowerCase()).length / titles.length : 0);

    const candidates: Array<OwnedStreamingAudienceGap & { score: number }> = [];
    for (const countryId of openCountryIds(player)) {
        const country: any = audience[countryId];
        const place: any = population[countryId];
        if (!country || !place) continue;
        const homes = Number(country.commercialHouseholds || 0);
        const wants = new Map<string, number>();
        Object.entries(country.personaShares || {}).forEach(([persona, share]) => {
            const genres = affinity[persona] || [];
            genres.forEach(genre => wants.set(genre, (wants.get(genre) || 0) + Number(share) / Math.max(1, genres.length)));
        });
        for (const [genre, wantPercent] of wants) {
            const want = wantPercent / 100;
            const have = haveShare(genre);
            if (want - have <= 0) continue;
            candidates.push({
                id: `genre:${countryId}:${genre}`,
                countryId,
                countryName: place.name,
                homes,
                genre,
                title: formatGenreLabel(genre),
                wantPercent: Math.round(want * 100),
                havePercent: Math.round(have * 100),
                score: homes * (want - have),
            });
        }
        const language = String(place.languages?.[0] || '');
        const localShare = Number(country.personaShares?.LOCAL_FIRST || 0) / 100;
        if (language && language.toLowerCase() !== 'english' && localShare > 0) {
            const have = haveLanguage(language);
            const want = localShare + 0.1;
            if (want - have > 0) {
                candidates.push({
                    id: `language:${countryId}:${language}`,
                    countryId,
                    countryName: place.name,
                    homes,
                    language,
                    title: `Stories in ${language}`,
                    wantPercent: Math.round(want * 100),
                    havePercent: Math.round(have * 100),
                    score: homes * (want - have),
                });
            }
        }
    }
    const picked: Array<OwnedStreamingAudienceGap & { score: number }> = [];
    const usedCountries = new Set<string>();
    const usedKinds = new Set<string>();
    for (const gap of candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))) {
        /* one language at most: a pitch answers a genre, and a whole list of languages tells the player only one thing */
        const kind = gap.genre || 'language';
        if (usedCountries.has(gap.countryId) || usedKinds.has(kind)) continue;
        usedCountries.add(gap.countryId);
        usedKinds.add(kind);
        picked.push(gap);
        if (picked.length === 3) break;
    }
    return picked.map(({ score: _score, ...gap }) => gap);
};

/** The report while it lasts */
export const getActiveAudienceReport = (player: Player): OwnedStreamingAudienceReport | null => {
    const report = player.ownedStreamingPlatform?.audienceReport;
    if (!report) return null;
    return report.expiresAtAbsoluteWeek > getAbsoluteWeek(player.age, player.currentWeek) ? report : null;
};

export const buyOriginalAudienceReport = (player: Player): { player: Player; changed: boolean; detail: string } => {
    const price = getOriginalAudienceReportPrice(player);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (getActiveAudienceReport(player)) return { player, changed: false, detail: 'You already have this quarter\'s report.' };
    if (platform.treasuryCash < price) return { player, changed: false, detail: `Platform funds are short by $${(price - platform.treasuryCash).toLocaleString()}.` };
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - price,
                audienceReport: { boughtAtAbsoluteWeek: now, expiresAtAbsoluteWeek: now + ORIGINAL_AUDIENCE_REPORT_WEEKS, gaps: getOriginalAudienceGaps(player) },
            }, player.id),
        },
        changed: true,
        detail: 'The report is in.',
    };
};

/** A script fits if it is what the report says is missing */
export const getScriptGapFit = (player: Player, genres: readonly string[] | undefined): OwnedStreamingAudienceGap | null => {
    const report = getActiveAudienceReport(player);
    if (!report || !genres?.length) return null;
    return report.gaps.find(gap => gap.genre && genres.includes(gap.genre)) || null;
};
