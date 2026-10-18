/** Read-only cost presentation. Never use this summary to charge or settle money. */
type CostRecord = {
    estimatedBudget?: number;
    budget?: number;
    reservedMarketingBudget?: number;
    marketingBudgetSpent?: number;
    returnedMarketingBudget?: number;
    totalCampaignSpend?: number;
    releaseStrategy?: string;
    campaignPositioning?: string;
    hiddenStats?: { greenlightPackageBudget?: number };
};
type CostProject = CostRecord & { phase?: string; projectDetails?: CostRecord };

export interface ProjectCostSummary {
    production: number;
    marketing: number | null;
    marketingKind: 'RESERVED' | 'SPENT';
    returned: number;
    total: number;
}

const money = (value: unknown): number => (
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
);

export const getProjectCostSummary = (project: CostProject): ProjectCostSummary => {
    const details = project.projectDetails || project;
    const production = money(details.estimatedBudget) || money(project.budget);
    // Releases also carry root-level campaign history. Prefer surviving recorded
    // values over migration's default zeros, without adding duplicate copies.
    const reserve = Math.max(money(details.reservedMarketingBudget), money(project.reservedMarketingBudget));
    const spent = Math.max(money(details.marketingBudgetSpent), money(project.marketingBudgetSpent),
        money(details.totalCampaignSpend), money(project.totalCampaignSpend));
    const returned = Math.max(money(details.returnedMarketingBudget), money(project.returnedMarketingBudget));
    const locked = Boolean(details.releaseStrategy || details.campaignPositioning || project.releaseStrategy)
        || ['RELEASED', 'STREAMING', 'IN THEATERS', 'BIDDING', 'PLANNED RELEASE'].includes(project.phase || '')
        || spent > 0 || returned > 0;
    // Old migrations fill absent marketing fields with zero. Those zeros alone
    // do not prove a free campaign; preserve uncertainty instead of inventing it.
    const settlementRecorded = spent > 0 || returned > 0
        || Boolean(details.campaignPositioning || project.campaignPositioning);
    const known = locked ? settlementRecorded : reserve > 0
        || money(details.hiddenStats?.greenlightPackageBudget) > 0;
    const marketing = known ? (locked ? spent : reserve) : null;
    return { production, marketing, marketingKind: locked ? 'SPENT' : 'RESERVED', returned,
        total: production + (marketing ?? 0) };
};
