import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingTitleWeekPerformance,
    OwnedStreamingWeeklyOperations,
    OwnedStreamingWeeklySnapshot,
    Player,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { STREAMING_CELEBRITY_INVESTOR_OFFERS } from './streamingLeadershipGovernance';

export type StreamingFinanceLedgerCategory =
    | 'FORMATION'
    | 'CAPITAL'
    | 'REVENUE'
    | 'CONTENT'
    | 'NETWORK'
    | 'PEOPLE'
    | 'PRODUCT'
    | 'GROWTH'
    | 'RISK'
    | 'CORPORATE'
    | 'ADJUSTMENT';

export interface StreamingFinanceLedgerEntry {
    id: string;
    absoluteWeek: number;
    label: string;
    detail: string;
    category: StreamingFinanceLedgerCategory;
    source: 'FORMATION' | 'CAPITAL' | 'OPERATIONS' | 'DECISION' | 'HISTORY';
    /** Signed movement in company treasury. */
    cashDelta: number;
    /** Amount emphasized in the row. Formation can display cost while moving $0 treasury. */
    displayAmount: number;
    affectsTreasury: boolean;
}

export interface StreamingFinanceCashflowPoint {
    absoluteWeek: number;
    revenue: number;
    outflow: number;
    net: number;
}

export interface StreamingFinanceSlice {
    id: string;
    label: string;
    amount: number;
    sharePercent: number;
}

export interface StreamingFinanceTitlePerformance {
    projectId: string;
    title: string;
    source: string;
    genre: string;
    revenue: number;
    cost: number;
    contribution: number;
    viewingAccounts: number;
}

export interface StreamingFinanceInvestorOffer {
    id: string;
    name: string;
    initials: string;
    publicIdentity: string;
    investedCapital: number;
    ownershipPercent: number;
    profitParticipationPercent: number;
    boardSeat: boolean;
    influenceDemand: string;
    caution: string;
    accepted: boolean;
}

export interface StreamingFinanceRoomModel {
    absoluteWeek: number;
    companyName: string;
    treasuryCash: number;
    personalCash: number;
    treasuryStatus: 'EMPTY' | 'CRITICAL' | 'WATCH' | 'HEALTHY';
    treasuryStatusLabel: string;
    runwayWeeks: number | null;
    estimatedWeeklyCommitment: number;
    periodLabel: string;
    periodRevenue: number;
    periodOutflow: number;
    periodNet: number;
    periodMarginPercent: number;
    revenueChangePercent: number | null;
    openingCash: number;
    cashflow: StreamingFinanceCashflowPoint[];
    revenueSlices: StreamingFinanceSlice[];
    expenseSlices: StreamingFinanceSlice[];
    titlePerformance: StreamingFinanceTitlePerformance[];
    ledger: StreamingFinanceLedgerEntry[];
    founderOwnershipPercent: number;
    founderCapitalContributed: number;
    outsideCapitalRaised: number;
    companyDebt: number;
    personalDebt: number;
    hasCfo: boolean;
    cfoName: string | null;
    publicMarketStatus: string;
    investorOffers: StreamingFinanceInvestorOffer[];
    nextAction: {
        kind: 'INJECT' | 'BUILD' | 'STABILIZE' | 'REVIEW';
        eyebrow: string;
        title: string;
        detail: string;
    };
}

const roundMoney = (value: number): number => Math.max(0, Math.round(Number(value) || 0));
const sum = (values: number[]): number => values.reduce((total, value) => total + roundMoney(value), 0);

const aggregateTitlePerformance = (rows: OwnedStreamingTitleWeekPerformance[]): StreamingFinanceTitlePerformance[] => {
    const totals = new Map<string, StreamingFinanceTitlePerformance>();
    for (const row of rows) {
        const current = totals.get(row.projectId) || {
            projectId: row.projectId,
            title: row.title,
            source: row.source,
            genre: row.genre,
            revenue: 0,
            cost: 0,
            contribution: 0,
            viewingAccounts: 0,
        };
        current.revenue += roundMoney(row.attributedSubscriptionRevenue);
        current.cost += roundMoney(row.allocatedCashCost);
        current.contribution += Math.round(Number(row.cashContribution) || 0);
        current.viewingAccounts += roundMoney(row.viewingAccounts);
        totals.set(row.projectId, current);
    }
    return [...totals.values()].sort((left, right) => right.contribution - left.contribution);
};

const operatingSnapshots = (history: OwnedStreamingWeeklySnapshot[]): Array<OwnedStreamingWeeklySnapshot & { operations: OwnedStreamingWeeklyOperations }> => (
    history.filter((snapshot): snapshot is OwnedStreamingWeeklySnapshot & { operations: OwnedStreamingWeeklyOperations } => Boolean(snapshot.operations))
);

/**
 * Weekly processing clamps treasury at zero. This is therefore the outflow the
 * game actually allowed through the operating account, not an invented P&L
 * payable that is not represented anywhere in the save.
 */
const actualTreasuryOutflow = (operations: OwnedStreamingWeeklyOperations): number => {
    const revenue = roundMoney(operations.subscriptionRevenue) + roundMoney(operations.productRevenue || 0);
    return Math.max(0, revenue - Math.round(Number(operations.netCashContribution) || 0));
};

const readNumber = (
    metadata: OwnedStreamingLedgerEntry['metadata'],
    ...keys: string[]
): number => {
    if (!metadata) return 0;
    for (const key of keys) {
        const numeric = Number(metadata[key]);
        if (Number.isFinite(numeric) && numeric !== 0) return Math.abs(Math.round(numeric));
    }
    return 0;
};

const cashDecisionFromEvent = (
    entry: OwnedStreamingLedgerEntry,
): Omit<StreamingFinanceLedgerEntry, 'id' | 'absoluteWeek'> | null => {
    const expense = (
        category: StreamingFinanceLedgerCategory,
        label: string,
        keys: string[],
    ): Omit<StreamingFinanceLedgerEntry, 'id' | 'absoluteWeek'> | null => {
        const amount = readNumber(entry.metadata, ...keys);
        if (!amount) return null;
        return {
            label,
            detail: entry.summary,
            category,
            source: 'DECISION',
            cashDelta: -amount,
            displayAmount: amount,
            affectsTreasury: true,
        };
    };
    const income = (
        category: StreamingFinanceLedgerCategory,
        label: string,
        keys: string[],
    ): Omit<StreamingFinanceLedgerEntry, 'id' | 'absoluteWeek'> | null => {
        const amount = readNumber(entry.metadata, ...keys);
        if (!amount) return null;
        return {
            label,
            detail: entry.summary,
            category,
            source: 'DECISION',
            cashDelta: amount,
            displayAmount: amount,
            affectsTreasury: true,
        };
    };

    switch (entry.type) {
        case 'INFRASTRUCTURE_COMMITTED': return expense('NETWORK', 'Infrastructure commissioned', ['transactionCost']);
        case 'TECHNOLOGY_PROJECT_STARTED': return expense('PRODUCT', 'Technology program funded', ['capitalCost', 'researchCost', 'installationCost', 'cost']);
        case 'CAMPUS_PROJECT_STARTED': return expense('NETWORK', 'Campus project started', ['landCost', 'cost']);
        case 'CAMPUS_STAGE_COMPLETED': return expense('NETWORK', 'Campus construction stage', ['cost']);
        case 'PRODUCT_DEVELOPMENT_STARTED': return expense('PRODUCT', 'Product development funded', ['capitalCost', 'cost']);
        case 'ORIGINAL_COMMISSIONED': return expense('CONTENT', 'Original commissioned', ['productionBudgetCap']);
        case 'ORIGINAL_GREENLIT': return income('CONTENT', 'Unused production funds returned', ['unusedFundingReturned']);
        case 'ORIGINAL_LOCALIZATION_COMMITTED': return expense('CONTENT', 'Localization committed', ['cashCost', 'cost']);
        case 'TITLE_LOCALIZATION_COMMITTED': return expense('CONTENT', 'Title localization ordered', ['cashCost', 'cost']);
        case 'LAUNCH_COMMITTED': return expense('NETWORK', 'Opening night committed', ['capacityPlanCost', 'cost']);
        case 'REGIONAL_LAUNCH_STARTED': return expense('GROWTH', 'Regional launch started', ['capitalCost', 'cost']);
        case 'MARKET_CLEARANCE_STARTED': return expense('GROWTH', 'Market entry cleared', ['cost']);
        case 'MARKET_REQUIREMENT_RESOLVED': return expense('GROWTH', 'Market compliance requirement', ['cost']);
        case 'SERVICE_CONFIGURATION_COMMITTED': return expense('PRODUCT', 'Service identity commissioned', ['cost']);
        case 'RIVAL_MOVE_RESPONDED': return expense('GROWTH', 'Competitive response funded', ['cost', 'cashCost']);
        case 'EXECUTIVE_DEVELOPMENT_STARTED': return expense('PEOPLE', 'Executive development funded', ['capitalCost', 'cost']);
        case 'INFRASTRUCTURE_RESPONSE_LOCKED': return expense('RISK', 'Infrastructure response funded', ['netCost', 'cost']);
        case 'INFRASTRUCTURE_MAINTENANCE_COMPLETED': return expense('NETWORK', 'Infrastructure maintenance', ['cost']);
        case 'CRISIS_RESPONSE_LOCKED': return expense('RISK', 'Crisis response funded', ['responseCost', 'cost']);
        case 'TRUST_INITIATIVE_COMPLETED': return expense('RISK', 'Trust initiative completed', ['cashCost', 'cost']);
        case 'SHADOW_OPERATION_COMMITTED': return expense('RISK', 'Shadow operation funded', ['cashCost', 'cost']);
        case 'REGULATORY_CASE_RESOLVED': return expense('RISK', 'Regulatory case resolved', ['responseCost', 'cost']);
        case 'WHISTLEBLOWER_REPORT_RESOLVED': return expense('RISK', 'Whistleblower response funded', ['responseCost', 'cost']);
        case 'ACTIVIST_CAMPAIGN_RESOLVED': return expense('CORPORATE', 'Activist campaign resolved', ['cost']);
        case 'HOSTILE_TAKEOVER_DEFENDED': return expense('CORPORATE', 'Takeover defence funded', ['cost']);
        case 'ACQUISITION_VALUED': return expense('CORPORATE', 'Acquisition valuation', ['valuationCost', 'cost']);
        case 'ACQUISITION_DILIGENCE_COMPLETED': return expense('CORPORATE', 'Acquisition diligence', ['commissionedCost', 'cost']);
        case 'STREAMING_PLATFORM_ACQUIRED': return expense('CORPORATE', 'Platform acquisition signed', ['treasuryPaid']);
        case 'SYSTEM_REPAIR': return expense('RISK', 'System repair charge', ['penalty', 'cost']);
        case 'LICENSE_SIGNED': {
            const kind = String(entry.metadata?.kind || '');
            return kind === 'SUBLICENSE_OUT'
                ? income('CONTENT', 'Rights sublicense income', ['minimumGuarantee', 'guarantee'])
                : expense('CONTENT', 'Content rights signed', ['minimumGuarantee', 'guarantee']);
        }
        default: return null;
    }
};

const slices = (entries: Array<{ id: string; label: string; amount: number }>): StreamingFinanceSlice[] => {
    const positive = entries.filter(entry => roundMoney(entry.amount) > 0);
    const total = sum(positive.map(entry => entry.amount));
    if (!total) return [];
    return positive
        .map(entry => ({
            ...entry,
            amount: roundMoney(entry.amount),
            sharePercent: Math.round((roundMoney(entry.amount) / total) * 100),
        }))
        .sort((a, b) => b.amount - a.amount);
};

const expenseGroups = (operations: OwnedStreamingWeeklyOperations[]): StreamingFinanceSlice[] => {
    const scheduledTotal = sum(operations.map(operation => operation.totalCashCost));
    const actualTotal = sum(operations.map(actualTreasuryOutflow));
    const scale = scheduledTotal > 0 ? Math.min(1, actualTotal / scheduledTotal) : 0;
    const scaled = (value: number) => Math.round(value * scale);
    return slices([
        {
            id: 'content',
            label: 'Content & rights',
            amount: scaled(sum(operations.map(item => item.partnerRevenueShareCost + (item.rightsComplianceCost || 0)))),
        },
        {
            id: 'network',
            label: 'Network',
            amount: scaled(sum(operations.map(item => item.infrastructureCost))),
        },
        {
            id: 'people',
            label: 'People & governance',
            amount: scaled(sum(operations.map(item => item.leadershipCost + (item.governanceCost || 0)))),
        },
        {
            id: 'product',
            label: 'Product & technology',
            amount: scaled(sum(operations.map(item => (item.technologyCampusCost || 0) + (item.productSuiteCost || 0)))),
        },
        {
            id: 'growth',
            label: 'Growth & competition',
            amount: scaled(sum(operations.map(item => item.weeklyPlanCost + (item.growthPlanCost || 0) + (item.competitiveOperationsCost || 0)))),
        },
        {
            id: 'corporate',
            label: 'Finance & corporate',
            amount: scaled(sum(operations.map(item => item.financingCost + (item.acquisitionIntegrationCost || 0)))),
        },
        {
            id: 'risk',
            label: 'Risk & recovery',
            amount: scaled(sum(operations.map(item => item.crisisRecoveryCost || 0))),
        },
    ]);
};

const buildLedger = (
    player: Player,
    snapshots: Array<OwnedStreamingWeeklySnapshot & { operations: OwnedStreamingWeeklyOperations }>,
): StreamingFinanceLedgerEntry[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const entries: StreamingFinanceLedgerEntry[] = [];
    const capitalKeys = new Set(platform.finance.capitalActions.map(action => action.idempotencyKey));

    for (const action of platform.finance.capitalActions) {
        if (action.type === 'INCORPORATION') {
            entries.push({
                id: action.id,
                absoluteWeek: action.absoluteWeek,
                label: 'Company incorporated',
                detail: action.treasuryDelta > 0
                    ? `Historical founding terms consumed part of the ${action.amount.toLocaleString()} formation payment and placed ${action.treasuryDelta.toLocaleString()} in treasury.`
                    : `${action.amount.toLocaleString()} was fully consumed by legal formation, foundational rights and registration. Operating treasury opened at $0.`,
                category: 'FORMATION',
                source: 'FORMATION',
                cashDelta: action.treasuryDelta,
                displayAmount: action.amount,
                affectsTreasury: action.treasuryDelta !== 0,
            });
            continue;
        }
        const label = action.type === 'FOUNDER_CONTRIBUTION'
            ? 'Founder capital injected'
            : action.type === 'LOAN_DRAW'
                ? action.treasuryDelta > 0 ? 'Legacy company facility drawn' : 'Acquisition debt arranged'
                : action.type === 'LOAN_REPAYMENT'
                    ? 'Company debt repaid'
                    : 'Outside equity issued';
        entries.push({
            id: action.id,
            absoluteWeek: action.absoluteWeek,
            label,
            detail: action.type === 'FOUNDER_CONTRIBUTION'
                ? 'Personal cash moved into the company without debt or dilution.'
                : action.type === 'EQUITY_ISSUANCE'
                    ? `Founder ownership moved from ${action.ownershipBefore}% to ${action.ownershipAfter}%.`
                    : 'Recorded in the company capital book.',
            category: 'CAPITAL',
            source: 'CAPITAL',
            cashDelta: action.treasuryDelta,
            displayAmount: action.amount,
            affectsTreasury: action.treasuryDelta !== 0,
        });
    }

    for (const snapshot of snapshots) {
        const operations = snapshot.operations;
        const revenue = roundMoney(operations.subscriptionRevenue) + roundMoney(operations.productRevenue || 0);
        const outflow = actualTreasuryOutflow(operations);
        if (revenue > 0) entries.push({
            id: `${snapshot.id}:revenue`,
            absoluteWeek: snapshot.absoluteWeek,
            label: 'Viewer and product revenue',
            detail: operations.headline,
            category: 'REVENUE',
            source: 'OPERATIONS',
            cashDelta: revenue,
            displayAmount: revenue,
            affectsTreasury: true,
        });
        if (outflow > 0) entries.push({
            id: `${snapshot.id}:outflow`,
            absoluteWeek: snapshot.absoluteWeek,
            label: 'Weekly operating outflow',
            detail: operations.summary,
            category: 'CORPORATE',
            source: 'OPERATIONS',
            cashDelta: -outflow,
            displayAmount: outflow,
            affectsTreasury: true,
        });
    }

    for (const event of platform.eventLedger) {
        if (capitalKeys.has(event.idempotencyKey)) continue;
        if (['FOUNDER_CAPITAL_CONTRIBUTED', 'LOAN_DRAWN', 'LOAN_REPAID', 'EQUITY_ISSUED', 'CELEBRITY_INVESTMENT_ACCEPTED', 'IPO_LISTED'].includes(event.type)) continue;
        const decision = cashDecisionFromEvent(event);
        if (!decision) continue;
        entries.push({ id: event.id, absoluteWeek: event.absoluteWeek, ...decision });
    }

    const knownTreasury = entries
        .filter(entry => entry.affectsTreasury)
        .reduce((total, entry) => total + entry.cashDelta, 0);
    const reconciliation = Math.round(platform.treasuryCash - knownTreasury);
    if (reconciliation !== 0) {
        entries.push({
            id: `finance-history:${player.id}`,
            absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
            label: 'Historical treasury balance',
            detail: 'Older or compacted transactions are represented by this reconciliation so the ledger closes exactly to the current treasury.',
            category: 'ADJUSTMENT',
            source: 'HISTORY',
            cashDelta: reconciliation,
            displayAmount: Math.abs(reconciliation),
            affectsTreasury: true,
        });
    }

    return entries.sort((a, b) => (
        b.absoluteWeek - a.absoluteWeek
        || Number(b.source === 'CAPITAL') - Number(a.source === 'CAPITAL')
        || b.id.localeCompare(a.id)
    ));
};

export const getStreamingFinanceRoom = (player: Player, requestedPeriod: 4 | 13 | 52 | 'ALL' = 13): StreamingFinanceRoomModel => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const allOperations = operatingSnapshots(platform.weeklyHistory);
    const periodLength = requestedPeriod === 'ALL' ? allOperations.length : requestedPeriod;
    const period = allOperations.slice(-periodLength);
    const previousPeriod = requestedPeriod === 'ALL' ? [] : allOperations.slice(-(periodLength * 2), -periodLength);
    const chartOperations = requestedPeriod === 'ALL' ? period : period.slice(-24);
    const periodRevenue = sum(period.map(item => item.operations.subscriptionRevenue + (item.operations.productRevenue || 0)));
    const periodOutflow = sum(period.map(item => actualTreasuryOutflow(item.operations)));
    const periodNet = period.reduce((total, item) => total + Math.round(Number(item.operations.netCashContribution) || 0), 0);
    const previousRevenue = sum(previousPeriod.map(item => item.operations.subscriptionRevenue + (item.operations.productRevenue || 0)));
    const revenueChangePercent = previousRevenue > 0 ? ((periodRevenue - previousRevenue) / previousRevenue) * 100 : null;
    const periodMarginPercent = periodRevenue > 0 ? (periodNet / periodRevenue) * 100 : 0;
    const periodCapital = platform.finance.capitalActions
        .filter(action => action.absoluteWeek >= (period[0]?.absoluteWeek ?? Number.POSITIVE_INFINITY))
        .reduce((total, action) => total + action.treasuryDelta, 0);
    const openingCash = Math.max(0, platform.treasuryCash - periodNet - periodCapital);
    const latestOperations = allOperations.at(-1)?.operations || null;
    const activeExecutives = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    const hasCfo = activeExecutives.some(item => item.role === 'CFO');
    const cfo = activeExecutives.find(item => item.role === 'CFO') || null;
    const baselineCommitment = latestOperations
        ? actualTreasuryOutflow(latestOperations)
        : roundMoney(platform.infrastructureSetup?.weeklyOperatingCost || 0)
            + sum(activeExecutives.map(item => item.weeklyCompensation))
            + sum(activeDirectors.map(item => item.weeklyCompensation))
            + sum(platform.technologyProjects.filter(item => item.status === 'COMPLETED').map(item => item.weeklyOperatingCostDelta))
            + sum(platform.productLines.filter(item => item.status === 'ACTIVE').map(item => item.weeklyOperatingCost))
            + sum(platform.campusProjects.filter(item => item.status === 'OPEN').map(item => item.weeklyOperatingCost));
    const estimatedWeeklyCommitment = roundMoney(baselineCommitment);
    const runwayWeeks = estimatedWeeklyCommitment > 0
        ? Math.max(0, Math.floor(platform.treasuryCash / estimatedWeeklyCommitment))
        : null;
    const treasuryStatus: StreamingFinanceRoomModel['treasuryStatus'] = platform.treasuryCash <= 0
        ? 'EMPTY'
        : runwayWeeks !== null && runwayWeeks < 4
            ? 'CRITICAL'
            : runwayWeeks !== null && runwayWeeks < 12
                ? 'WATCH'
                : 'HEALTHY';
    const treasuryStatusLabel = treasuryStatus === 'EMPTY'
        ? 'UNFUNDED'
        : treasuryStatus === 'CRITICAL'
            ? 'CRITICAL RUNWAY'
            : treasuryStatus === 'WATCH'
                ? 'WATCH RUNWAY'
                : 'FUNDED';
    const founderCapitalContributed = sum(platform.finance.capitalActions
        .filter(action => action.type === 'FOUNDER_CONTRIBUTION')
        .map(action => action.amount));
    const outsideCapitalRaised = sum(platform.finance.capitalActions
        .filter(action => action.type === 'EQUITY_ISSUANCE')
        .map(action => action.amount));
    const companyDebt = sum(platform.finance.loans
        .filter(loan => loan.status !== 'REPAID')
        .map(loan => loan.outstandingPrincipal));
    const personalDebt = sum((player.finance?.loans || [])
        .filter(loan => loan.status !== 'PAID')
        .map(loan => loan.principal));
    const revenueSlices = slices([
        { id: 'subscriptions', label: 'Subscriptions', amount: sum(period.map(item => item.operations.subscriptionRevenue)) },
        { id: 'products', label: 'Products & commerce', amount: sum(period.map(item => item.operations.productRevenue || 0)) },
    ]);
    const cashflow = chartOperations.map(snapshot => {
        const revenue = roundMoney(snapshot.operations.subscriptionRevenue) + roundMoney(snapshot.operations.productRevenue || 0);
        const outflow = actualTreasuryOutflow(snapshot.operations);
        return {
            absoluteWeek: snapshot.absoluteWeek,
            revenue,
            outflow,
            net: Math.round(Number(snapshot.operations.netCashContribution) || 0),
        };
    });
    const acceptedIds = new Set(platform.governance.celebrityInvestors.map(item => item.candidateId));
    const investorOffers = STREAMING_CELEBRITY_INVESTOR_OFFERS.map(offer => ({
        id: offer.id,
        name: offer.name,
        initials: offer.initials,
        publicIdentity: offer.publicIdentity,
        investedCapital: offer.investedCapital,
        ownershipPercent: offer.ownershipPercent,
        profitParticipationPercent: offer.profitParticipationPercent,
        boardSeat: offer.boardSeat,
        influenceDemand: offer.influenceDemand,
        caution: offer.caution,
        accepted: acceptedIds.has(offer.id),
    }));
    const nextAction: StreamingFinanceRoomModel['nextAction'] = platform.treasuryCash <= 0
        ? {
            kind: 'INJECT',
            eyebrow: 'FIRST MOVE',
            title: 'Fund the operating account.',
            detail: 'Move founder cash into the company before committing infrastructure, rights or staff.',
        }
        : runwayWeeks !== null && runwayWeeks < 4
            ? {
                kind: 'STABILIZE',
                eyebrow: 'RUNWAY ALERT',
                title: 'Protect the next four weeks.',
                detail: 'Add capital or reduce commitments before approving another major decision.',
            }
            : !platform.infrastructureSetup
                ? {
                    kind: 'BUILD',
                    eyebrow: 'CAPITAL READY',
                    title: 'Turn cash into a launch network.',
                    detail: 'Treasury is funded. Return to Build and commission only what the company can carry.',
                }
                : {
                    kind: 'REVIEW',
                    eyebrow: 'CEO BRIEF',
                    title: periodNet >= 0 ? 'Cash is holding.' : 'The company is consuming cash.',
                    detail: period.length
                        ? `Review the last ${period.length} operating week${period.length === 1 ? '' : 's'} before the next commitment.`
                        : 'Operating history begins after opening night.',
                };

    return {
        absoluteWeek,
        companyName: platform.identity?.name || 'EMPIRE+',
        treasuryCash: roundMoney(platform.treasuryCash),
        personalCash: roundMoney(player.money),
        treasuryStatus,
        treasuryStatusLabel,
        runwayWeeks,
        estimatedWeeklyCommitment,
        periodLabel: period.length ? `LAST ${period.length} OPERATING WEEK${period.length === 1 ? '' : 'S'}` : 'PRE-LAUNCH',
        periodRevenue,
        periodOutflow,
        periodNet,
        periodMarginPercent,
        revenueChangePercent,
        openingCash,
        cashflow,
        revenueSlices,
        expenseSlices: expenseGroups(period.map(item => item.operations)),
        titlePerformance: aggregateTitlePerformance(period.flatMap(item => item.operations.titlePerformance || [])),
        ledger: buildLedger(player, allOperations),
        founderOwnershipPercent: platform.founderOwnershipPercent,
        founderCapitalContributed,
        outsideCapitalRaised,
        companyDebt,
        personalDebt,
        hasCfo,
        cfoName: cfo?.nameAtAppointment || null,
        publicMarketStatus: platform.publicCompany.lifecycle.replaceAll('_', ' '),
        investorOffers,
        nextAction,
    };
};
