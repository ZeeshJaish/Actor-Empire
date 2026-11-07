/**
 * #184 (plan §22.4): one valuation for every company in the game: our streaming service, the AI platforms, the world's
 * studios and the other listed companies. Zeesh, 2026-11-03: "company stock prices and valution ka ek universal system
 * banay. jo humare stock market ke sare company me apply kare / jo yk sab kuch analysis kar ke banega, current stats,
 * past stasta, future stasts, film related company hai to yk universe, hit flops awards and much more stuff".
 *
 * Pure: the same fundamentals always give the same value (the share price's noise is #185's, seeded there).
 *
 *   enterprise value = (half a revenue multiple set by growth and margin, on revenue between the last year's and the
 *                       latest quarter's pace
 *                       + half an earnings multiple on positive earnings) × the track record of the last releases
 *                    + assets (the library's remaining rights, technology)
 *                    + the pipeline (upcoming releases × their chance of a hit)
 *                    + franchises and prestige
 *                    − a risk discount (churn, losses, reliability and trust, leadership, debt)
 *   equity value     = enterprise value + cash − debt: no premium on cash; a distressed company keeps a small option value
 *   per share        = equity value ÷ shares
 */

export type CompanyKind = 'STREAMING' | 'STUDIO' | 'OTHER';

export interface CompanyFundamentals {
    kind: CompanyKind;
    /** the last 12 months' revenue, full currency */
    revenueTtm: number;
    /** the latest quarter's revenue, a year's worth: against the 12 months it is the growth */
    revenueRunRate: number;
    /** a year's operating earnings (negative for a loss); each adapter says how it measures them */
    earningsTtm: number;
    cash: number;
    debt: number;
    /** streaming: the share of members leaving in a month, in % */
    churnPercent?: number;
    /** what the library's remaining rights are worth */
    libraryValue: number;
    /** servers, technology */
    technologyValue: number;
    /** upcoming releases, each × its chance of a hit */
    pipelineValue: number;
    /** the last releases (up to 8): hits and flops */
    recentHits: number;
    recentFlops: number;
    /** 0–100: awards, reputation */
    prestige: number;
    /** franchises and universes */
    franchiseValue: number;
    /** 0–100: reliability and trust */
    reliability: number;
    /** 0–100: the quality of the people running it */
    leadership: number;
    /** 0–1: a distressed company's extra discount (rescues, restructuring) */
    distress?: number;
    shares?: number;
}

export interface CompanyValuation {
    enterpriseValue: number;
    equityValue: number;
    perShare: number | null;
    growth: number;
    margin: number;
    multiples: { revenue: number; earnings: number };
    /** what makes up the enterprise value, before the risk discount */
    parts: { operating: number; assets: number; pipeline: number; franchise: number };
    riskDiscount: number;
    /** the risks behind the discount, in words, largest first */
    risks: string[];
}

/* each kind of company's multiples: a base revenue multiple, how much growth and margin move it, an earnings multiple */
const MULTIPLES: Record<CompanyKind, { revenue: number; growth: number; margin: number; earnings: number; earningsGrowth: number }> = {
    STREAMING: { revenue: 2.0, growth: 5, margin: 3, earnings: 10, earningsGrowth: 15 },
    STUDIO: { revenue: 1.8, growth: 3, margin: 1.5, earnings: 6, earningsGrowth: 8 },
    OTHER: { revenue: 2.0, growth: 5, margin: 4, earnings: 14, earningsGrowth: 16 },
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));
const positive = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);

export const valueCompany = (input: CompanyFundamentals): CompanyValuation => {
    const yearRevenue = positive(input.revenueTtm);
    const growth = yearRevenue > 0 ? clamp(positive(input.revenueRunRate) / yearRevenue - 1, -0.6, 1.5) : 0;
    /* a growing company is valued between the year it had and the pace it runs at now */
    const revenue = (yearRevenue + positive(input.revenueRunRate)) / 2;
    const margin = revenue > 0 ? clamp(input.earningsTtm / revenue, -1, 0.6) : input.earningsTtm < 0 ? -1 : 0;
    const multiple = MULTIPLES[input.kind];
    const revenueMultiple = clamp(multiple.revenue + growth * multiple.growth + margin * multiple.margin, 0.3, 12);
    const earningsMultiple = input.earningsTtm > 0 ? clamp(multiple.earnings + growth * multiple.earningsGrowth, 5, 40) : 0;
    const track = clamp(1 + 0.04 * (positive(input.recentHits) - positive(input.recentFlops)), 0.8, 1.25);
    const operating = (0.5 * revenue * revenueMultiple + 0.5 * positive(input.earningsTtm) * earningsMultiple) * track;
    const assets = positive(input.libraryValue) + positive(input.technologyValue);
    const pipeline = positive(input.pipelineValue);
    /* brands and prestige rise and fall with the record too */
    const franchise = (positive(input.franchiseValue) + revenue * 0.25 * clamp(input.prestige, 0, 100) / 100) * track;
    const gross = operating + assets + pipeline + franchise;

    const risks: Array<[string, number]> = [
        ['Members leaving', input.churnPercent === undefined ? 0 : clamp((input.churnPercent - 2.5) * 0.05, 0, 0.25)],
        ['Losing money', margin < 0 ? clamp(-margin * 0.3, 0, 0.25) : 0],
        ['Reliability and trust', clamp((70 - input.reliability) * 0.004, 0, 0.15)],
        ['Leadership', clamp((55 - input.leadership) * 0.003, 0, 0.1)],
        ['Debt', gross > 0 ? clamp((positive(input.debt) / gross - 0.4) * 0.3, 0, 0.2) : 0],
        ['Distress', clamp(input.distress || 0, 0, 0.5)],
    ];
    const riskDiscount = clamp(risks.reduce((sum, [, value]) => sum + value, 0), 0, 0.7);
    const enterpriseValue = Math.round(gross * (1 - riskDiscount));
    const equityValue = Math.round(Math.max(enterpriseValue * 0.05, enterpriseValue + positive(input.cash) - positive(input.debt)));
    return {
        enterpriseValue,
        equityValue,
        perShare: input.shares && input.shares > 0 ? equityValue / input.shares : null,
        growth,
        margin,
        multiples: { revenue: revenueMultiple, earnings: earningsMultiple },
        parts: { operating: Math.round(operating), assets: Math.round(assets), pipeline: Math.round(pipeline), franchise: Math.round(franchise) },
        riskDiscount,
        risks: risks.filter(([, value]) => value >= 0.01).sort((left, right) => right[1] - left[1]).map(([label]) => label),
    };
};
