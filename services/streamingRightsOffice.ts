import {
    STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION,
    type StreamingRightsOfficeDigest,
    type StreamingRightsOfficeState,
    type Player,
    type StreamingRightsContract,
    type StreamingRightsControlMode,
    type StreamingRightsStudioMandate,
} from '../types';
import { getStreamingCataloguePackageDesk } from './streamingCataloguePackages';
import {
    getStreamingRightsCalendar,
    getStreamingRightsStudioMandate,
} from './streamingRightsCalendar';
import {
    isStreamingLicenseActiveAt,
    normalizeStreamingRightsContractRegistry,
} from './streamingRightsCore';
import { normalizeStreamingRoyaltySettlementRegistry } from './streamingContractSettlement';
import { normalizeStreamingRightsTransactionRegistry } from './streamingRightsTransactions';
import { createDeterministicId } from './deterministicRandom';
export { createStreamingRightsDelegationTrace } from './streamingRightsDelegation';

const finiteNonNegative = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
};

const cleanText = (value: unknown, fallback = '', maxLength = 240): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, maxLength);
};

const normalizeDigest = (value: unknown): StreamingRightsOfficeDigest | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    const id = cleanText(source.id);
    if (!id) return null;
    return {
        id,
        absoluteWeek: Math.round(finiteNonNegative(source.absoluteWeek)),
        actionRequired: Math.round(finiteNonNegative(source.actionRequired)),
        delegatedDecisions: Math.round(finiteNonNegative(source.delegatedDecisions)),
        renewals: Math.round(finiteNonNegative(source.renewals)),
        expiries: Math.round(finiteNonNegative(source.expiries)),
        packages: Math.round(finiteNonNegative(source.packages)),
        transfers: Math.round(finiteNonNegative(source.transfers)),
        royaltySettlements: Math.round(finiteNonNegative(source.royaltySettlements)),
        summary: cleanText(source.summary, 'Rights Office update'),
    };
};

export const normalizeStreamingRightsOfficeState = (value: unknown): StreamingRightsOfficeState => {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const digests = (Array.isArray(source.digests) ? source.digests : [])
        .map(normalizeDigest)
        .filter((digest): digest is StreamingRightsOfficeDigest => Boolean(digest))
        .sort((left, right) => right.absoluteWeek - left.absoluteWeek || left.id.localeCompare(right.id))
        .slice(0, 52);
    const lastProcessed = Number(source.lastProcessedAbsoluteWeek);
    return {
        schemaVersion: STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION,
        digests,
        lastProcessedAbsoluteWeek: Number.isFinite(lastProcessed) ? Math.max(-1, Math.round(lastProcessed)) : -1,
    };
};

export type StreamingRightsOfficeGroup =
    | 'ACTION_REQUIRED'
    | 'AVAILABLE_TO_LICENSE'
    | 'UNDER_CONTRACT'
    | 'APPROACHING_EXPIRY'
    | 'DELEGATED_DECISIONS'
    | 'NO_CURRENT_INTEREST';

export interface StreamingRightsOfficeItem {
    id: string;
    projectId: string;
    title: string;
    genre: string;
    quality: number;
    platformName: string | null;
    contractId: string | null;
    minimumGuarantee: number;
    backendPercent: number;
    territory: string | null;
    durationWeeks: number;
    exclusivity: string | null;
    deadlineAbsoluteWeek: number | null;
    warning: string | null;
    delegatedExplanation: string | null;
}

export interface StreamingRightsOfficeView {
    studioId: string;
    controlMode: StreamingRightsControlMode;
    mandate: StreamingRightsStudioMandate;
    totalTitles: number;
    actionRail: StreamingRightsOfficeItem[];
    groups: Record<StreamingRightsOfficeGroup, StreamingRightsOfficeItem[]>;
    latestDigest: StreamingRightsOfficeDigest | null;
}

const projectStudioId = (project: any): string => cleanText(project?.studioId || project?.projectDetails?.studioId);
const projectTitle = (project: any): string => cleanText(project?.name || project?.title || project?.projectDetails?.title, 'Untitled project', 140);
const projectGenre = (project: any): string => cleanText(project?.genre || project?.projectDetails?.genre, 'UNKNOWN', 80);
const projectQuality = (project: any): number => Math.max(0, Math.min(100, Number(
    project?.projectQuality ?? project?.quality ?? (Number(project?.rating || project?.imdbRating || 0) * 10),
) || 0));
const isCommissionedProject = (project: any): boolean => Boolean(
    project?.isPlatformCommissionCredit
    || project?.countsTowardOwnedStudioEvaluation === false
    || project?.projectDetails?.hiddenStats?.playerPlatformCommissionOfferId
);

const officeItemFrom = (
    project: any,
    contract: StreamingRightsContract | null,
    renewalCase: ReturnType<typeof getStreamingRightsCalendar>['groups']['actionRequired'][number] | null,
): StreamingRightsOfficeItem => ({
    id: renewalCase?.id || contract?.id || `rights-office:${project.id}`,
    projectId: String(project.id),
    title: projectTitle(project),
    genre: projectGenre(project),
    quality: projectQuality(project),
    platformName: contract?.buyer.name || renewalCase?.incumbentBuyer.name || null,
    contractId: contract?.id || renewalCase?.sourceContractId || null,
    minimumGuarantee: renewalCase?.proposedEconomics?.minimumGuarantee ?? contract?.minimumGuarantee ?? 0,
    backendPercent: renewalCase?.proposedEconomics?.licensorRevenueShare ?? contract?.licensorRevenueShare ?? 0,
    territory: renewalCase?.territory || contract?.territory || null,
    durationWeeks: renewalCase?.proposedEconomics?.durationWeeks ?? contract?.durationWeeks ?? 0,
    exclusivity: renewalCase?.exclusivity || contract?.exclusivity || null,
    deadlineAbsoluteWeek: renewalCase?.decisionDeadlineAbsoluteWeek ?? contract?.expiresAtAbsoluteWeek ?? null,
    warning: renewalCase?.protectionReasons.length
        ? renewalCase.protectionReasons.map(reason => reason.replaceAll('_', ' ').toLowerCase()).join(' · ')
        : null,
    delegatedExplanation: renewalCase?.delegationTrace?.explanation || renewalCase?.delegatedReason || null,
});

export const getStreamingRightsOffice = (
    player: Player,
    studioId: string,
    absoluteWeek: number,
): StreamingRightsOfficeView => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const mandate = getStreamingRightsStudioMandate(player, studioId);
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(contract => contract.seller.type === 'PLAYER_STUDIO' && contract.seller.id === studioId);
    const activeContracts = contracts.filter(contract => isStreamingLicenseActiveAt(contract, week));
    const activeByProject = new Map<string, StreamingRightsContract>();
    activeContracts.sort((left, right) => left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek || left.id.localeCompare(right.id))
        .forEach(contract => {
            if (!activeByProject.has(contract.sourceProjectId)) activeByProject.set(contract.sourceProjectId, contract);
        });
    const calendar = getStreamingRightsCalendar(player, week);
    const renewalItems = Object.values(calendar.groups).flat()
        .filter(item => item.seller.type === 'PLAYER_STUDIO' && item.seller.id === studioId);
    const renewalByProject = new Map(renewalItems.map(item => [item.sourceProjectId, item]));
    const packageDesk = getStreamingCataloguePackageDesk(player, studioId, week);
    const eligibleByProject = new Map(packageDesk.eligibleTitles.map(title => [title.id, title]));
    const projects = new Map<string, any>();
    [
        ...(player.pastProjects || []),
        ...(player.activeReleases || []).filter(release => release.status === 'FINISHED'),
    ].forEach(project => {
        if (project?.id && projectStudioId(project) === studioId && !isCommissionedProject(project)) projects.set(project.id, project);
    });
    contracts.forEach(contract => {
        if (!projects.has(contract.sourceProjectId)) {
            projects.set(contract.sourceProjectId, {
                id: contract.sourceProjectId,
                name: contract.titleAtSigning,
                genre: contract.genre,
                studioId,
            });
        }
    });
    eligibleByProject.forEach(title => {
        if (!projects.has(title.id)) projects.set(title.id, { ...title, name: title.title, studioId });
    });

    const groups: StreamingRightsOfficeView['groups'] = {
        ACTION_REQUIRED: [],
        AVAILABLE_TO_LICENSE: [],
        UNDER_CONTRACT: [],
        APPROACHING_EXPIRY: [],
        DELEGATED_DECISIONS: [],
        NO_CURRENT_INTEREST: [],
    };
    [...projects.values()].sort((left, right) => projectTitle(left).localeCompare(projectTitle(right))).forEach(project => {
        const contract = activeByProject.get(project.id) || null;
        const renewalCase = renewalByProject.get(project.id) || null;
        const item = officeItemFrom(project, contract, renewalCase);
        if (contract) groups.UNDER_CONTRACT.push(item);
        if (renewalCase && ['WATCHING', 'OFFER_AVAILABLE', 'ACTION_REQUIRED'].includes(renewalCase.status)) {
            groups.APPROACHING_EXPIRY.push(item);
        }
        if (renewalCase?.status === 'ACTION_REQUIRED') groups.ACTION_REQUIRED.push(item);
        if (renewalCase?.outcome === 'DELEGATED_ACCEPTED') groups.DELEGATED_DECISIONS.push(item);
        if (!contract && eligibleByProject.has(project.id)) {
            const releaseWeek = Number(project.releasedAtAbsoluteWeek ?? project.streaming?.startWeekAbsolute ?? week);
            if (Number.isFinite(releaseWeek) && releaseWeek <= week - 52 && projectQuality(project) < 60) {
                groups.NO_CURRENT_INTEREST.push(item);
            } else {
                groups.AVAILABLE_TO_LICENSE.push(item);
            }
        }
    });
    const actionRail = [...groups.ACTION_REQUIRED]
        .sort((left, right) => (
            (left.deadlineAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) - (right.deadlineAbsoluteWeek ?? Number.MAX_SAFE_INTEGER)
            || left.title.localeCompare(right.title)
        ))
        .slice(0, 7);
    const state = normalizeStreamingRightsOfficeState(player.world.streamingRightsOffice);
    return {
        studioId,
        controlMode: mandate.controlMode,
        mandate,
        totalTitles: projects.size,
        actionRail,
        groups,
        latestDigest: state.digests[0] || null,
    };
};

export type StreamingCommercialRelationshipTier = 'TRUSTED_PARTNER' | 'PREFERRED' | 'WORKING' | 'STRAINED';
export type StreamingCommercialRelationshipTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface StreamingCommercialRelationshipView {
    platformId: string;
    platformName: string;
    score: number;
    tier: StreamingCommercialRelationshipTier;
    trend: StreamingCommercialRelationshipTrend;
    acceptedDeals: number;
    rejectedOffers: number;
    renewals: number;
    deliveredCommissions: number;
    cancelledCommissions: number;
    backendPaid: number;
    realizedPartnerValue: number;
    reasons: string[];
}

const platformNameFor = (player: Player, platformId: string): string => {
    const ownedPlatformId = player.ownedStreamingPlatform.identity?.slug || `player-platform:${player.id}`;
    if (platformId === ownedPlatformId) {
        return player.ownedStreamingPlatform.identity?.name || 'EMPIRE+';
    }
    return player.world.platforms?.[platformId as keyof typeof player.world.platforms]?.name
        || Object.values(player.world.platformAiPlayerCommissionOffers || {}).find(offer => offer.platformId === platformId)?.platformName
        || platformId.replaceAll('_', ' ');
};

export const getStreamingCommercialRelationships = (
    player: Player,
    studioId: string,
): StreamingCommercialRelationshipView[] => {
    const studio = player.businesses.find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    const relationRegistry = studio?.studioState?.platformRelations || {};
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(contract => contract.seller.type === 'PLAYER_STUDIO' && contract.seller.id === studioId);
    const calendarCases = Object.values(player.world.streamingRightsCalendar?.renewalCases || {})
        .filter(renewalCase => renewalCase.seller.type === 'PLAYER_STUDIO' && renewalCase.seller.id === studioId);
    const commissions = Object.values(player.world.platformAiPlayerCommissionOffers || {})
        .filter(offer => offer.studioId === studioId);
    const sessions = Object.values(player.world.streamingBiddingSessions || {})
        .filter(session => session.sellerStudioId === studioId);
    const settlements = Object.values(normalizeStreamingRoyaltySettlementRegistry(player.world.streamingRoyaltySettlements))
        .filter(settlement => settlement.sellerStudioId === studioId);
    const transactions = Object.values(normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions))
        .filter(transaction => transaction.status === 'SETTLED' && transaction.originalOwner.id === studioId);
    const platformIds = new Set<string>([
        ...Object.keys(relationRegistry),
        ...contracts.map(contract => contract.buyer.platformId || contract.buyer.id),
        ...calendarCases.map(renewalCase => renewalCase.incumbentBuyer.platformId || renewalCase.incumbentBuyer.id),
        ...commissions.map(offer => offer.platformId),
        ...sessions.flatMap(session => session.offers.map(offer => String(offer.platformId))),
        ...transactions.flatMap(transaction => [transaction.seller.platformId || transaction.seller.id, transaction.buyer.platformId || transaction.buyer.id]),
    ].filter(Boolean));

    return [...platformIds].sort().map((platformId): StreamingCommercialRelationshipView => {
        const relation = relationRegistry[platformId];
        const acceptedDeals = sessions.filter(session => {
            const accepted = session.offers.find(offer => offer.id === session.acceptedOfferId);
            return accepted?.platformId === platformId;
        }).length;
        const rejectedOffers = sessions.filter(session => (
            session.offers.some(offer => offer.platformId === platformId)
            && session.offers.find(offer => offer.id === session.acceptedOfferId)?.platformId !== platformId
        )).length;
        const renewals = calendarCases.filter(renewalCase => (
            (renewalCase.incumbentBuyer.platformId || renewalCase.incumbentBuyer.id) === platformId
            && ['ACCEPTED', 'DELEGATED_ACCEPTED'].includes(renewalCase.outcome)
        )).length;
        const platformCommissions = commissions.filter(offer => offer.platformId === platformId);
        const deliveredCommissions = platformCommissions.filter(offer => offer.status === 'DELIVERED' || offer.status === 'TRANSFERRED').length;
        const cancelledCommissions = platformCommissions.filter(offer => offer.status === 'CANCELLED').length;
        const backendPaid = settlements.filter(settlement => settlement.buyerPlatformId === platformId)
            .reduce((sum, settlement) => sum + settlement.royaltyPaid, 0);
        const trust = Math.max(-8, Math.min(8, Number(relation?.trustModifier || 0)));
        const loyalty = Math.max(0, Math.min(100, Number(relation?.loyaltyScore || 0)));
        const recoveryWeeks = Math.max(0, Number(relation?.recoveryWeeksRemaining || 0));
        const profitableDeals = Math.max(0, Number(relation?.profitableDeals || 0));
        const score = Math.round(Math.max(0, Math.min(100,
            50
            + trust * 2
            + loyalty * 0.2
            + acceptedDeals * 2
            + deliveredCommissions * 4
            + profitableDeals * 2
            + (backendPaid > 0 ? 5 : 0)
            - recoveryWeeks * 2
            - (relation?.lastBreachWeek !== undefined ? 5 : 0)
            - cancelledCommissions * 4,
        )));
        const reasons = [
            deliveredCommissions > 0 ? `${deliveredCommissions} commissioned ${deliveredCommissions === 1 ? 'delivery' : 'deliveries'} completed` : null,
            renewals > 0 ? `${renewals} successful ${renewals === 1 ? 'renewal' : 'renewals'}` : null,
            backendPaid > 0 ? `${backendPaid.toLocaleString()} paid through backend settlements` : null,
            recoveryWeeks > 0 ? `${recoveryWeeks} weeks of relationship recovery remain` : null,
            rejectedOffers > 0 ? `${rejectedOffers} offer${rejectedOffers === 1 ? '' : 's'} lost in competitive bidding` : null,
            cancelledCommissions > 0 ? `${cancelledCommissions} commissioned project${cancelledCommissions === 1 ? '' : 's'} cancelled` : null,
        ].filter((reason): reason is string => Boolean(reason)).slice(0, 4);
        return {
            platformId,
            platformName: platformNameFor(player, platformId),
            score,
            tier: score >= 80 ? 'TRUSTED_PARTNER' : score >= 65 ? 'PREFERRED' : score >= 45 ? 'WORKING' : 'STRAINED',
            trend: recoveryWeeks > 0 || cancelledCommissions > 0
                ? 'DECLINING'
                : deliveredCommissions > 0 || renewals > 0 || backendPaid > 0 ? 'IMPROVING' : 'STABLE',
            acceptedDeals,
            rejectedOffers,
            renewals,
            deliveredCommissions,
            cancelledCommissions,
            backendPaid,
            realizedPartnerValue: Math.max(0, Number(relation?.realizedPartnerValue || 0)),
            reasons: reasons.length ? reasons : ['No material commercial history yet'],
        };
    }).sort((left, right) => right.score - left.score || left.platformName.localeCompare(right.platformName));
};

export interface StreamingStudioCommercialStatement {
    studioId: string;
    licensingGuarantees: number;
    producerFeesPaid: number;
    platformFundedProductionBudgets: number;
    lockedFutureSeasonFunding: number;
    attributedAdjustedGross: number;
    grossBackendAccrued: number;
    backendPaid: number;
    recoupmentRemaining: number;
    downstreamTransferProceeds: number;
    cashIncome: number;
}

export interface StreamingPlatformCommercialStatement {
    platformId: string;
    titleAttributedRevenue: number;
    guaranteesAndAcquisitionCost: number;
    productionFunding: number;
    futureSeasonFunding: number;
    producerFees: number;
    royaltyExpense: number;
    transferPurchases: number;
    transferSaleProceeds: number;
    retainedContribution: number;
    forecastVariance: number | null;
}

const latestRecoupmentByContract = (
    settlements: ReturnType<typeof normalizeStreamingRoyaltySettlementRegistry>[string][],
): number => {
    const latest = new Map<string, (typeof settlements)[number]>();
    settlements.forEach(settlement => {
        const current = latest.get(settlement.contractId);
        if (!current || settlement.absoluteWeek > current.absoluteWeek || (
            settlement.absoluteWeek === current.absoluteWeek && settlement.id.localeCompare(current.id) > 0
        )) latest.set(settlement.contractId, settlement);
    });
    return [...latest.values()].reduce((sum, settlement) => sum + settlement.recoupmentRemaining, 0);
};

export const getStreamingStudioCommercialStatement = (
    player: Player,
    studioId: string,
): StreamingStudioCommercialStatement => {
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(contract => contract.seller.type === 'PLAYER_STUDIO' && contract.seller.id === studioId);
    const settlements = Object.values(normalizeStreamingRoyaltySettlementRegistry(player.world.streamingRoyaltySettlements))
        .filter(settlement => settlement.sellerStudioId === studioId);
    const commissions = Object.values(player.world.platformAiPlayerCommissionOffers || {})
        .filter(offer => offer.studioId === studioId && !['DECLINED', 'EXPIRED', 'CANCELLED'].includes(offer.status));
    const transactions = Object.values(normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions))
        .filter(transaction => transaction.status === 'SETTLED' && transaction.seller.type === 'PLAYER_STUDIO' && transaction.seller.id === studioId);
    const licensingGuarantees = contracts
        .filter(contract => contract.settlement.guarantee === 'PAID' || contract.settlement.guarantee === 'LEGACY_PAID')
        .reduce((sum, contract) => sum + contract.minimumGuarantee, 0);
    const producerFeesPaid = commissions.reduce((sum, offer) => sum + Math.max(0, offer.producerFeePaid), 0);
    const platformFundedProductionBudgets = contracts.reduce((sum, contract) => sum + contract.productionFunding, 0)
        + commissions.reduce((sum, offer) => sum + Math.max(0, offer.productionBudget - offer.productionBudgetReturned), 0);
    const lockedFutureSeasonFunding = contracts.reduce((sum, contract) => sum + contract.futureSeasonFunding, 0);
    const attributedAdjustedGross = settlements.reduce((sum, settlement) => sum + settlement.adjustedGrossReceipts, 0);
    const grossBackendAccrued = settlements.reduce((sum, settlement) => sum + settlement.grossRoyaltyAccrued, 0);
    const backendPaid = settlements.reduce((sum, settlement) => sum + settlement.royaltyPaid, 0);
    const downstreamTransferProceeds = transactions.reduce((sum, transaction) => sum + transaction.sellerReceipt, 0);
    return {
        studioId,
        licensingGuarantees,
        producerFeesPaid,
        platformFundedProductionBudgets,
        lockedFutureSeasonFunding,
        attributedAdjustedGross,
        grossBackendAccrued,
        backendPaid,
        recoupmentRemaining: latestRecoupmentByContract(settlements),
        downstreamTransferProceeds,
        cashIncome: licensingGuarantees + producerFeesPaid + backendPaid + downstreamTransferProceeds,
    };
};

export const getStreamingPlatformCommercialStatement = (
    player: Player,
    platformPartyId: string,
): StreamingPlatformCommercialStatement => {
    const matchesPlatform = (party: StreamingRightsContract['buyer']): boolean => (
        party.id === platformPartyId || party.platformId === platformPartyId
    );
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(contract => matchesPlatform(contract.buyer));
    const settlements = Object.values(normalizeStreamingRoyaltySettlementRegistry(player.world.streamingRoyaltySettlements))
        .filter(settlement => settlement.buyerPlatformId === platformPartyId);
    const commissions = Object.values(player.world.platformAiPlayerCommissionOffers || {})
        .filter(offer => offer.platformId === platformPartyId && !['DECLINED', 'EXPIRED', 'CANCELLED'].includes(offer.status));
    const transactions = Object.values(normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions))
        .filter(transaction => transaction.status === 'SETTLED');
    const guaranteesAndAcquisitionCost = contracts
        .filter(contract => contract.settlement.guarantee === 'PAID' || contract.settlement.guarantee === 'LEGACY_PAID')
        .reduce((sum, contract) => sum + contract.minimumGuarantee, 0);
    const productionFunding = contracts.reduce((sum, contract) => sum + contract.productionFunding, 0)
        + commissions.reduce((sum, offer) => sum + Math.max(0, offer.productionBudget - offer.productionBudgetReturned), 0);
    const futureSeasonFunding = contracts.reduce((sum, contract) => sum + contract.futureSeasonFunding, 0);
    const producerFees = commissions.reduce((sum, offer) => sum + Math.max(0, offer.producerFeePaid), 0);
    const titleAttributedRevenue = settlements.reduce((sum, settlement) => sum + settlement.adjustedGrossReceipts, 0);
    const royaltyExpense = settlements.reduce((sum, settlement) => sum + settlement.royaltyPaid, 0);
    const transferPurchases = transactions.filter(transaction => matchesPlatform(transaction.buyer))
        .reduce((sum, transaction) => sum + transaction.acceptedPrice, 0);
    const transferSaleProceeds = transactions.filter(transaction => (
        transaction.seller.id === platformPartyId || transaction.seller.platformId === platformPartyId
    )).reduce((sum, transaction) => sum + transaction.sellerReceipt, 0);
    return {
        platformId: platformPartyId,
        titleAttributedRevenue,
        guaranteesAndAcquisitionCost,
        productionFunding,
        futureSeasonFunding,
        producerFees,
        royaltyExpense,
        transferPurchases,
        transferSaleProceeds,
        retainedContribution: titleAttributedRevenue + transferSaleProceeds
            - guaranteesAndAcquisitionCost - productionFunding - futureSeasonFunding - producerFees - royaltyExpense - transferPurchases,
        forecastVariance: null,
    };
};

export interface ProcessStreamingRightsOfficeWeekResult {
    player: Player;
    processed: boolean;
    digest: StreamingRightsOfficeDigest | null;
}

export const processStreamingRightsOfficeWeek = (
    player: Player,
    absoluteWeek: number,
): ProcessStreamingRightsOfficeWeekResult => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const state = normalizeStreamingRightsOfficeState(player.world.streamingRightsOffice);
    if (state.lastProcessedAbsoluteWeek >= week) return { player, processed: false, digest: null };

    const renewalCases = Object.values(player.world.streamingRightsCalendar?.renewalCases || {});
    const actionRequired = renewalCases.filter(renewalCase => (
        renewalCase.status === 'ACTION_REQUIRED' && renewalCase.lastProcessedAbsoluteWeek === week
    )).length;
    const delegatedDecisions = renewalCases.filter(renewalCase => (
        renewalCase.resolvedAtAbsoluteWeek === week && Boolean(renewalCase.delegationTrace || renewalCase.delegatedReason)
    )).length;
    const renewals = renewalCases.filter(renewalCase => (
        renewalCase.resolvedAtAbsoluteWeek === week
        && (renewalCase.outcome === 'ACCEPTED' || renewalCase.outcome === 'DELEGATED_ACCEPTED')
    )).length;
    const expiries = renewalCases.filter(renewalCase => (
        renewalCase.resolvedAtAbsoluteWeek === week
        && (renewalCase.status === 'EXPIRED' || renewalCase.outcome === 'LET_EXPIRE')
    )).length;
    const packages = (player.world.streamingCataloguePackageDigests || [])
        .filter(candidate => candidate.absoluteWeek === week)
        .reduce((sum, candidate) => sum + candidate.signed, 0);
    const transfers = Object.values(normalizeStreamingRightsTransactionRegistry(player.world.streamingRightsTransactions))
        .filter(transaction => transaction.status === 'SETTLED' && transaction.settledAtAbsoluteWeek === week).length;
    const royaltySettlements = Object.values(normalizeStreamingRoyaltySettlementRegistry(player.world.streamingRoyaltySettlements))
        .filter(settlement => settlement.absoluteWeek === week).length;
    const activity = actionRequired + delegatedDecisions + renewals + expiries + packages + transfers + royaltySettlements;
    const digest = activity > 0 ? {
        id: createDeterministicId('streaming_rights_office_digest', week),
        absoluteWeek: week,
        actionRequired,
        delegatedDecisions,
        renewals,
        expiries,
        packages,
        transfers,
        royaltySettlements,
        summary: [
            actionRequired ? `${actionRequired} decision${actionRequired === 1 ? '' : 's'} requires approval` : null,
            delegatedDecisions ? `${delegatedDecisions} routine ${delegatedDecisions === 1 ? 'decision' : 'decisions'} handled` : null,
            renewals ? `${renewals} ${renewals === 1 ? 'renewal' : 'renewals'} secured` : null,
            expiries ? `${expiries} ${expiries === 1 ? 'right returned' : 'rights returned'}` : null,
            packages ? `${packages} catalogue ${packages === 1 ? 'package' : 'packages'} signed` : null,
            transfers ? `${transfers} licence ${transfers === 1 ? 'transfer' : 'transfers'} settled` : null,
            royaltySettlements ? `${royaltySettlements} backend ${royaltySettlements === 1 ? 'settlement' : 'settlements'} posted` : null,
        ].filter((part): part is string => Boolean(part)).join(' · '),
    } satisfies StreamingRightsOfficeDigest : null;
    const nextState: StreamingRightsOfficeState = {
        ...state,
        digests: digest
            ? [digest, ...state.digests.filter(candidate => candidate.id !== digest.id)].slice(0, 52)
            : state.digests,
        lastProcessedAbsoluteWeek: week,
    };
    return {
        processed: true,
        digest,
        player: {
            ...player,
            world: { ...player.world, streamingRightsOffice: nextState },
        },
    };
};
