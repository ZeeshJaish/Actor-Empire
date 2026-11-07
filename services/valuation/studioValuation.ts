/**
 * #184: the valuation engine's studio adapter, for the world's studios and the NPC ventures (and, later, the
 * production house).
 *
 * A studio's scale comes from its standing (the catalogue's valuation: its library and its brands), and its current
 * performance from its own books (margin and growth over the last year), its record (hits and flops), its greenlit
 * slate, its cash and its debt. So a studio that keeps making flops, or borrows to survive, is worth less, and one on a
 * run of hits is worth more; the value no longer stands still.
 */
import type { NPCStudioState, StudioAiLedgerCategory } from '../../types';
import { valueCompany, type CompanyFundamentals, type CompanyValuation } from './valuationEngine';

const YEAR = 52;
const QUARTER = 13;
const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const INCOME: ReadonlySet<StudioAiLedgerCategory> = new Set(['RIGHTS_INCOME', 'PROJECT_OUTCOME', 'CATALOGUE_OPERATIONS']);
/* the running costs; what goes into films (development, rewrites, production, release marketing) is an investment in
   the slate, not a loss: it comes back as the pipeline until the film is out */
const OVERHEADS: ReadonlySet<StudioAiLedgerCategory> = new Set(['OPERATING_COST', 'DEBT_SERVICE', 'TALENT_BACKEND', 'TURNAROUND']);
const INVESTMENT: ReadonlySet<StudioAiLedgerCategory> = new Set(['DEVELOPMENT', 'REWRITE', 'PRODUCTION', 'RELEASE_MARKETING']);
/* a studio's books are lumpy (a year of costs, then a release), so they move its value gently around a normal year */
const NORMAL_MARGIN = 0.08;
const BOOKS_WEIGHT = 0.3;

/** what the adapter reads; the catalogue's own studios have only some of it */
export type StudioValuationSource = Pick<NPCStudioState, 'id' | 'valuation'> & Partial<Pick<NPCStudioState,
    'reputation' | 'cashReserve' | 'recentHits' | 'projectsReleased' | 'hits' | 'flops' | 'ai'>>;

export const worldStudioFundamentals = (studio: StudioValuationSource, absoluteWeek?: number): CompanyFundamentals => {
    /* its standing: the library and brands, and the revenue a studio of its size makes in a normal year */
    const standing = Math.max(0.05, number(studio.valuation)) * 1_000_000_000;
    const scale = standing * 0.2;
    const ledger = studio.ai?.ledger || [];
    const now = absoluteWeek ?? ledger.at(-1)?.absoluteWeek ?? 0;
    const lastYear = ledger.filter(entry => entry.absoluteWeek > now - YEAR);
    const covered = lastYear.length ? Math.max(QUARTER, Math.min(YEAR, now - lastYear[0].absoluteWeek + 1)) : 0;
    const total = (entries: typeof ledger, kinds: ReadonlySet<StudioAiLedgerCategory>, sign: 1 | -1) => entries.reduce((sum, entry) => (
        sum + (kinds.has(entry.category) && entry.amountMillions * sign > 0 ? entry.amountMillions * sign : 0)), 0);
    /* a year's pace of each, from however much of the year the books cover */
    const yearIncome = covered ? total(lastYear, INCOME, 1) * YEAR / covered : 0;
    const quarterIncome = total(lastYear.filter(entry => entry.absoluteWeek > now - QUARTER), INCOME, 1) * 4;
    const overheads = covered ? total(lastYear, OVERHEADS, -1) * YEAR / covered : 0;
    const invested = total(lastYear, INVESTMENT, -1) * 1_000_000;
    /* its performance, from its own books when it keeps them */
    const booksMargin = yearIncome > 0 ? (yearIncome - overheads) / yearIncome : NORMAL_MARGIN;
    const margin = Math.max(-0.25, Math.min(0.3, NORMAL_MARGIN + BOOKS_WEIGHT * (booksMargin - NORMAL_MARGIN)));
    const growth = yearIncome > 0 ? Math.max(-0.4, Math.min(0.6, BOOKS_WEIGHT * (quarterIncome / yearIncome - 1))) : 0;
    /* its record: the last (up to) 8 releases in the shares of its whole record */
    const released = number(studio.projectsReleased) || number(studio.hits) + number(studio.flops);
    const window = Math.min(8, released);
    const recentHits = released ? Math.round(window * number(studio.hits) / released) : Math.min(8, number(studio.recentHits));
    const recentFlops = released ? Math.round(window * number(studio.flops) / released) : 0;
    const hitChance = (recentHits + 1) / (recentHits + recentFlops + 2);
    /* the pipeline: its greenlit slate, or what it spent on films this year if that is more, by its chance of a hit */
    const slate = (studio.ai?.slate?.commitments || []).filter(item => item.status === 'GREENLIT')
        .reduce((sum, item) => sum + number(item.greenlightBudgetMillions ?? item.proposedBudgetMillions) * 1_000_000, 0);
    const pipelineValue = Math.max(slate, invested) * (0.5 + hitChance);
    const competence = studio.ai?.competence;
    const leadership = competence
        ? (Object.values(competence) as number[]).reduce((sum, value) => sum + number(value), 0) / Object.values(competence).length
        : 55;
    const status = studio.ai?.status;
    return {
        kind: 'STUDIO',
        revenueTtm: scale,
        revenueRunRate: scale * (1 + growth),
        earningsTtm: scale * margin,
        cash: Math.max(0, number(studio.cashReserve)) * 1_000_000,
        debt: number(studio.ai?.finance?.debtPrincipalMillions) * 1_000_000,
        libraryValue: standing * 0.55,
        technologyValue: 0,
        pipelineValue,
        recentHits,
        recentFlops,
        prestige: number(studio.reputation ?? 50),
        franchiseValue: standing * (studio.ai?.profile?.strategy === 'FRANCHISE' ? 0.22 : 0.15),
        reliability: 70,
        leadership: leadership <= 1 ? leadership * 100 : leadership,
        distress: status === 'RESTRUCTURING' ? 0.25 : status === 'DISTRESSED' ? 0.15 : 0,
    };
};

export const valueWorldStudio = (studio: StudioValuationSource, absoluteWeek?: number): CompanyValuation => (
    valueCompany(worldStudioFundamentals(studio, absoluteWeek))
);
