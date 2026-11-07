import { makeCinemaMarketFixture } from './boxOfficeScenarios';
import type { CinemaWeekInput } from '../../services/boxOffice/boxOfficeTypes';
export const cinemaLanguageScenarios = (): CinemaWeekInput[] => {
    const base = makeCinemaMarketFixture(), large = structuredClone(base);
    large.titles = Array.from({ length: 12 }, (_, i) => {
        const t = structuredClone(base.titles[0]); t.id = `film-${i}`;
        t.market!.languages = i % 2 ? ['Français', 'Hindi'] : ['English', 'Español'];
        t.exposure!.events = t.exposure!.events.map(e => ({ ...e, id: `${e.id}-${i}`, titleId: t.id })); return t;
    });
    large.cohorts = Array.from({ length: 80 }, (_, i) => {
        const c = structuredClone(base.cohorts[0]); c.id = `audience-${i}`;
        c.market!.languages = i % 3 ? ['ENGLISH', 'Español'] : ['franc\u0327ais', 'Hindi']; return c;
    });
    large.supply!.offers = large.titles.flatMap(t => base.supply!.offers.map(o => ({ ...o, titleId: t.id })));
    const missing = structuredClone(base); missing.titles[0].market = undefined;
    const noMarket = structuredClone(base); noMarket.cohorts[0].market = undefined;
    const empty = structuredClone(base); empty.titles[0].market!.languages = [];
    const sparse = structuredClone(base); sparse.titles[0].market!.languages = [, 'ÉNGLISH'] as string[]; sparse.cohorts[0].market!.languages = [, 'english'] as string[];
    const changed = structuredClone(base); changed.cohorts[0].market!.languages = ['Hindi'];
    return [base, large, missing, noMarket, empty, sparse, changed];
};
