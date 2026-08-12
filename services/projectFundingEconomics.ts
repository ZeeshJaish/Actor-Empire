type FundedProjectLike = {
    id?: string;
    budget?: number;
    platformProductionFunding?: number;
    studioCashAtRisk?: number;
    productionFundApplied?: number;
    streamingFundingAmount?: number;
    investorPlan?: { totalRaised?: number };
    projectDetails?: {
        estimatedBudget?: number;
        investorPlan?: { totalRaised?: number };
        hiddenStats?: Record<string, any>;
    };
};

export interface ProjectFundingEconomics {
    budget: number;
    platformFunding: number;
    investorFunding: number;
    productionFund: number;
    studioCashAtRisk: number;
    isPlatformFundedPremiere: boolean;
}

const safeMoney = (value: unknown): number => (
    Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : 0))
);

const getHiddenStats = (project: FundedProjectLike): Record<string, any> => (
    project.projectDetails?.hiddenStats || {}
);

const getProjectId = (project: FundedProjectLike): string | undefined => (
    project.id
);

export const getProjectFundingEconomics = (
    project: FundedProjectLike,
    budgetOverride?: number
): ProjectFundingEconomics => {
    const hiddenStats = getHiddenStats(project);
    const budget = safeMoney(
        budgetOverride
        ?? project.budget
        ?? project.projectDetails?.estimatedBudget
    );
    const projectId = getProjectId(project);
    const explicitlyApplied = safeMoney(
        project.platformProductionFunding
        ?? hiddenStats.platformProductionFundingApplied
    );
    const legacyFundingWasUsedHere = Boolean(
        projectId
        && hiddenStats.nextSeasonFundingUsedByProjectId === projectId
    );
    const legacyApplied = legacyFundingWasUsedHere
        ? safeMoney(
            project.streamingFundingAmount
            ?? hiddenStats.nextSeasonFundingAmount
        )
        : 0;
    // Old saves only retained the cap. Never infer more current-season financing
    // than the project's recorded production cost.
    const platformFunding = explicitlyApplied > 0
        ? explicitlyApplied
        : Math.min(budget, legacyApplied);
    const investorFunding = safeMoney(
        hiddenStats.investorFundingApplied
        ?? project.investorPlan?.totalRaised
        ?? project.projectDetails?.investorPlan?.totalRaised
    );
    const productionFund = safeMoney(
        project.productionFundApplied
        ?? hiddenStats.productionFundApplied
    );
    const explicitStudioCashAtRisk = project.studioCashAtRisk ?? hiddenStats.studioCashAtRisk;
    const studioCashAtRisk = Number.isFinite(Number(explicitStudioCashAtRisk))
        ? safeMoney(explicitStudioCashAtRisk)
        : Math.max(0, budget - Math.min(budget, platformFunding) - investorFunding - productionFund);

    return {
        budget,
        platformFunding,
        investorFunding,
        productionFund,
        studioCashAtRisk,
        isPlatformFundedPremiere: Boolean(
            hiddenStats.platformFundedPremiere
            || platformFunding > 0
        )
    };
};

export const getProjectMarketOutcomeRevenue = (
    project: FundedProjectLike,
    cashRevenue: number,
    budgetOverride?: number
): number => {
    const economics = getProjectFundingEconomics(project, budgetOverride);
    // Financing is contract value, not a second cash payout. It belongs in market
    // outcome economics exactly once so a commissioned season is not judged as
    // though the studio paid the entire production cost and earned nothing.
    return safeMoney(cashRevenue) + Math.min(economics.budget, economics.platformFunding);
};

export const getStudioReturnPercent = (
    project: FundedProjectLike,
    studioReceipts: number,
    budgetOverride?: number
): number | null => {
    const economics = getProjectFundingEconomics(project, budgetOverride);
    if (economics.studioCashAtRisk <= 0) return null;
    return ((safeMoney(studioReceipts) - economics.studioCashAtRisk) / economics.studioCashAtRisk) * 100;
};
