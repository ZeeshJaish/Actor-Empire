import type {
    Business,
    Message,
    NewsItem,
    Player,
    StudioSaleBuyerType,
    StudioSaleDeck,
    StudioSaleOffer,
    StudioSaleTransferTerms,
    Transaction,
    XPost,
} from '../types';
import {
    getAcquisitionDebtLedger,
    getAcquisitionDebtSummary,
    syncAcquisitionDebtLedger,
} from './acquisitionDebt';
import { BUSINESS_BLUEPRINTS } from './businessLogic';
import { getAbsoluteWeek } from './legacyLogic';
import { getStudioOwnershipPercent } from './studioOwnership';
import { getStudioSaleEarnings, getStudioSaleHoldingPeriod } from './studioSaleHistory';
import { dematerializeStudioOwnership } from './industryWorld/studioOwnershipMaterializer';

export type StudioSaleRequirementId =
    | 'MINORITY_MERGER_CLEAR'
    | 'HOLDING_PERIOD'
    | 'PRODUCTION_HOUSE'
    | 'ACTIVE_SLATE_CLEAR'
    | 'SUBSIDIARIES_CLEAR'
    | 'VALUATION_READY'
    | 'NOT_ALREADY_LISTED';

export interface StudioSaleRequirement {
    id: StudioSaleRequirementId;
    label: string;
    met: boolean;
    detail: string;
}

export interface StudioSaleIncludedStudio {
    id: string;
    name: string;
    isPrimary: boolean;
    isAcquired: boolean;
    annualRevenue: number;
    cash: number;
    ownershipPercent: number;
    debt: number;
    catalogValue: number;
    recordedValue: number;
    estimatedValue: number;
}

export interface StudioSaleValuation {
    indicativeValue: number;
    recommendedAsk: number;
    recommendedFloor: number;
    annualRevenue: number;
    catalogValue: number;
    debt: number;
    score: number;
    includedStudioIds: string[];
    includedStudios: StudioSaleIncludedStudio[];
    isParentSale: boolean;
    retainedCatalogTargetStudioId?: string;
    retainedCatalogTargetStudioName?: string;
}

export interface StudioSaleReadiness {
    canList: boolean;
    canClose: boolean;
    requirements: StudioSaleRequirement[];
    blockers: string[];
    valuation: StudioSaleValuation;
    activeSlateItems: StudioSaleSlateItem[];
}

export interface StudioSaleSlateItem {
    id: string;
    name: string;
    studioId: string;
    studioName: string;
    phase: string;
    kind: 'PRODUCTION' | 'RELEASE';
}

export interface StudioSaleWindowState {
    elapsedWeeks: number;
    remainingWeeks: number;
    totalWeeks: number;
    availableOffers: StudioSaleOffer[];
    pendingOffers: StudioSaleOffer[];
    windowClosed: boolean;
}

export interface StudioSaleResult {
    success: boolean;
    player: Player;
    deck?: StudioSaleDeck;
    payout?: number;
    message: string;
}

const MIN_STUDIO_SALE_VALUE = 250_000;
const MIN_ASK_TO_VALUE = 0.45;
const MAX_ASK_TO_VALUE = 2.25;
const MIN_FLOOR_TO_VALUE = 0.28;

const roundMoney = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    const scale = Math.abs(safe) >= 1_000_000_000 ? 1_000_000 : 100_000;
    return Math.max(0, Math.round(safe / scale) * scale);
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const getWeekKey = (player: Pick<Player, 'age' | 'currentWeek'>) => `${player.age}:${player.currentWeek}`;

const toAbsoluteWeek = (year: number, week: number) => (Math.max(0, year) * 52) + Math.max(0, week - 1);

const currentAbsoluteWeek = (player: Pick<Player, 'age' | 'currentWeek'>) => toAbsoluteWeek(player.age, player.currentWeek);

const fromAbsoluteWeek = (absoluteWeek: number) => ({
    year: Math.max(0, Math.floor(absoluteWeek / 52)),
    week: (Math.max(0, absoluteWeek) % 52) + 1,
});

const hashString = (value: string) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const makeRng = (seed: string) => {
    let state = hashString(seed) || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
};

const getStudioBusiness = (player: Player, studioId: string) => (
    (player.businesses || []).find(business => business.id === studioId)
);

const isAcquiredStudio = (business: Business) => (
    business.studioState?.acquisitionOrigin === 'STUDIO_ACQUISITION'
    || business.config?.productionType === 'Acquired Studio'
);

const isParentStudioSale = (business: Business) => (
    business.type === 'PRODUCTION_HOUSE'
    && !isAcquiredStudio(business)
    && business.studioState?.operatingModel !== 'FULL_MERGER'
);

const findParentProductionHouse = (player: Player, studio?: Business) => {
    const explicitParentId = studio?.studioState?.mergedIntoStudioId;
    const explicitParent = explicitParentId
        ? getStudioBusiness(player, explicitParentId)
        : undefined;
    if (explicitParent && explicitParent.id !== studio?.id && isParentStudioSale(explicitParent) && explicitParent.isActive !== false) {
        return explicitParent;
    }
    return (player.businesses || []).find(candidate => (
        candidate.id !== studio?.id
        && isParentStudioSale(candidate)
        && candidate.isActive !== false
    ));
};

const getIncludedStudioIds = (player: Player, studio: Business): string[] => {
    const ids = new Set<string>([studio.id]);
    if (isParentStudioSale(studio)) {
        (player.businesses || []).forEach(candidate => {
            if (
                candidate.id !== studio.id
                && isAcquiredStudio(candidate)
                && candidate.isActive !== false
            ) {
                ids.add(candidate.id);
            }
        });
    }
    return Array.from(ids);
};

const getTransferredStudioIds = (player: Player, studio: Business): string[] => {
    const ids = new Set(getIncludedStudioIds(player, studio));
    // Full-merger records keep a reversible asset snapshot. They transfer with
    // their HQ and must be consumed, but must never be valued a second time.
    let added = true;
    while (added) {
        added = false;
        (player.businesses || []).forEach(business => {
            if (business.studioState?.operatingModel === 'FULL_MERGER'
                && ids.has(String(business.studioState.mergedIntoStudioId || '')) && !ids.has(business.id)) {
                ids.add(business.id); added = true;
            }
        });
    }
    return [...ids];
};

const getOpenSubsidiaries = (player: Player, studio: Business) => {
    if (!isParentStudioSale(studio)) return [];
    return (player.businesses || []).filter(candidate => (
        candidate.id !== studio.id
        && isAcquiredStudio(candidate)
        && candidate.isActive !== false
        && candidate.studioState?.saleDeck
        && !['CLOSED', 'WITHDRAWN'].includes(candidate.studioState.saleDeck.status)
    ));
};

const ACTIVE_PRODUCTION_PHASES = new Set([
    'PLANNING',
    'PRE_PRODUCTION',
    'AUDITION',
    'PRODUCTION',
    'POST_PRODUCTION',
    'SCHEDULED',
    'AWAITING_RELEASE',
]);

const formatSlatePhase = (phase: string) => phase
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase());

const isLiveStudioCommitment = (commitment: any) => {
    const phase = String(commitment?.projectPhase || '');
    if (ACTIVE_PRODUCTION_PHASES.has(phase)) return true;
    // Older saves may not have a phase, but an explicitly running timer is still live work.
    return !phase && (Number(commitment?.phaseWeeksLeft) > 0 || Number(commitment?.durationLeft) > 0);
};

export const getStudioSaleActiveSlateItems = (player: Player, studioIds: string[]): StudioSaleSlateItem[] => {
    const targetIds = new Set(studioIds);
    const studioNames = new Map((player.businesses || []).map(studio => [String(studio.id), studio.name]));
    const commitments = (player.commitments || [])
        .filter(commitment => targetIds.has(String(commitment.projectDetails?.studioId || '')) && isLiveStudioCommitment(commitment))
        .map((commitment: any) => {
            const studioId = String(commitment.projectDetails?.studioId);
            return {
                id: `commitment:${commitment.id}`,
                name: commitment.projectDetails?.title || commitment.name || 'Untitled production',
                studioId,
                studioName: studioNames.get(studioId) || 'Production house',
                phase: formatSlatePhase(String(commitment.projectPhase || 'IN_PROGRESS')),
                kind: 'PRODUCTION' as const,
            };
        });
    const releases = (player.activeReleases || [])
        .filter(release => targetIds.has(String(release.projectDetails?.studioId || '')) && release.status !== 'FINISHED')
        .map(release => {
            const studioId = String(release.projectDetails?.studioId);
            const phase = release.distributionPhase === 'THEATRICAL'
                ? 'In theaters'
                : release.distributionPhase === 'STREAMING_BIDDING'
                    ? 'Streaming bids'
                    : 'Streaming run';
            return {
                id: `release:${release.id}`,
                name: release.name || release.projectDetails?.title || 'Untitled release',
                studioId,
                studioName: studioNames.get(studioId) || 'Production house',
                phase,
                kind: 'RELEASE' as const,
            };
        });
    return [...commitments, ...releases];
};

const getCatalogValue = (player: Player, studioIds: string[]) => {
    const targetIds = new Set(studioIds);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const contracts = Object.values(player.world?.streamingRightsContracts || {});
    // A completed film is a remaining-rights asset, not its already collected
    // box office or licensing proceeds a second time. Count each title once.
    const titles = new Map<string, { id: string; studioId: string; budget?: number; rating?: number; year?: number }>();
    (player.pastProjects || []).forEach(project => {
        if (targetIds.has(String(project.studioId || ''))) titles.set(project.id, project);
    });
    (player.activeReleases || []).forEach(release => {
        const studioId = String(release.projectDetails?.studioId || '');
        if (targetIds.has(studioId) && !titles.has(release.id)) {
            titles.set(release.id, { id: release.id, studioId, budget: release.budget, rating: release.imdbRating });
        }
    });
    const libraryValue = Array.from(titles.values()).reduce((sum, title) => {
        const soldRights = contracts.filter(contract => (
            contract.sourceProjectId === title.id && contract.status === 'ACTIVE' && !contract.transferredToContractId
        ));
        const permanentGlobalSale = soldRights.some(contract => contract.permanentPurchase && contract.territory === 'GLOBAL');
        if (permanentGlobalSale) return sum;
        const exclusiveWindow = soldRights.some(contract => (
            contract.exclusivity === 'EXCLUSIVE' && contract.expiresAtAbsoluteWeek > now
        ));
        const age = Math.max(0, player.age - Number(title.year || player.age));
        const quality = clamp(Number(title.rating || 5) * 10) / 100;
        const replacementCost = Math.min(500_000_000, Math.max(1_000_000, Number(title.budget || 10_000_000)));
        const futureRightsValue = replacementCost * 0.08 * (0.5 + quality) / (1 + age * 0.12);
        return sum + futureRightsValue * (exclusiveWindow ? 0.25 : 1);
    }, 0);
    const rightsValue = (player.businesses || [])
        .filter(business => targetIds.has(business.id))
        .reduce((sum, business) => {
            const ownedRights = (business.studioState?.ownedRights || [])
                .filter(right => right.status !== 'EXPIRED')
                .reduce((total, right) => {
                    const purchaseAnchor = Math.max(0, Number(right.purchasePrice || 0));
                    const rarityBonus = right.rarity === 'LEGENDARY' ? 1.4
                        : right.rarity === 'RARE' ? 1.15
                            : right.rarity === 'COMMON' ? 0.75
                                : 1;
                    return total + Math.max(4_000_000, purchaseAnchor * 0.55 * rarityBonus);
                }, 0);
            const purchasedTitles = (business.studioState?.purchasedIPTitles || []).length * 6_000_000;
            return sum + ownedRights + purchasedTitles;
        }, 0);
    return roundMoney(libraryValue + rightsValue);
};

const getDebtForStudios = (player: Player, studioIds: string[]) => {
    const targetIds = new Set(studioIds);
    return Math.round(getAcquisitionDebtSummary(player).entries
        .filter(entry => targetIds.has(entry.studioId))
        .reduce((sum, entry) => sum + Math.max(0, entry.remainingPrincipal), 0));
};

const getStudioQualityScore = (business: Business) => {
    const momentum = clamp(Number(business.stats?.studioMomentum || business.stats?.hype || 45));
    const brand = clamp(Number(business.stats?.brandHealth || 45));
    const confidence = clamp(Number(business.stats?.investorConfidence || 45));
    return (momentum * 0.34) + (brand * 0.36) + (confidence * 0.3);
};

const getStudioValuationPart = (
    player: Player,
    studio: Business,
    primaryStudioId: string,
): StudioSaleIncludedStudio & { score: number; operatingValue: number } => {
    const earnings = getStudioSaleEarnings(player, studio);
    const annualRevenue = Math.max(0, earnings.revenue);
    const annualProfit = earnings.profit;
    const catalogValue = getCatalogValue(player, [studio.id]);
    const debt = getDebtForStudios(player, getTransferredStudioIds(player, studio).filter(id => id === studio.id
        || getStudioBusiness(player, id)?.studioState?.operatingModel === 'FULL_MERGER'));
    const qualityScore = getStudioQualityScore(studio);
    const revenueMultiple = 1.35 + (qualityScore / 100) * 2.1;
    const profitPremium = annualProfit > 0 ? annualProfit * (2.5 + (qualityScore / 35)) : annualProfit * 0.5;
    const balanceValue = Math.max(0, Number(studio.balance || 0));
    const state = studio.studioState;
    const facilities = Object.values(state?.departments || {}).reduce((sum, level) => sum + Math.max(0, level), 0) * 350_000
        + Object.values(state?.equipment || {}).reduce((sum, level) => sum + Math.max(0, level), 0) * 600_000;
    const development = (state?.scripts?.length || 0) * 1_200_000 + (state?.concepts?.length || 0) * 500_000;
    const baseCost = BUSINESS_BLUEPRINTS.PRODUCTION_HOUSE.baseCost;
    const tangibleAssets = baseCost * 0.42 * Math.max(1, Number(studio.stats.locations || 1)) + facilities + development;
    const brandValue = baseCost * 0.3 * qualityScore / 100;
    const operatingValue = balanceValue + Math.max(MIN_STUDIO_SALE_VALUE,
        annualRevenue * revenueMultiple + profitPremium + tangibleAssets + brandValue + catalogValue);
    // Keep the historical display field without using a contaminated lifetime/
    // latest-week valuation as a price floor.
    const recordedValue = Math.max(0, Number(studio.stats?.valuation || 0));
    const acquired = isAcquiredStudio(studio);

    return {
        id: studio.id,
        name: studio.name,
        isPrimary: studio.id === primaryStudioId,
        isAcquired: acquired,
        annualRevenue: roundMoney(annualRevenue),
        cash: balanceValue,
        ownershipPercent: getStudioOwnershipPercent(player, studio),
        debt,
        catalogValue,
        recordedValue: roundMoney(recordedValue),
        estimatedValue: Math.round(operatingValue),
        score: Math.round(qualityScore),
        operatingValue,
    };
};

export const getStudioSaleValuation = (player: Player, studio: Business): StudioSaleValuation => {
    const includedStudioIds = getIncludedStudioIds(player, studio);
    const includedSet = new Set(includedStudioIds);
    const includedStudios = (player.businesses || []).filter(business => includedSet.has(business.id));
    const valuationStudios = includedStudios.length ? includedStudios : [studio];
    const parts = valuationStudios.map(business => getStudioValuationPart(player, business, studio.id));
    const annualRevenue = parts.reduce((sum, part) => sum + part.annualRevenue, 0);
    const catalogValue = getCatalogValue(player, includedStudioIds);
    const debt = getDebtForStudios(player, getTransferredStudioIds(player, studio));
    const weightedScoreBase = parts.reduce((sum, part) => sum + Math.max(1, part.annualRevenue + (Math.max(0, part.estimatedValue - part.cash) * 0.18)), 0);
    const qualityScore = parts.reduce((sum, part) => (
        sum + (part.score * Math.max(1, part.annualRevenue + (Math.max(0, part.estimatedValue - part.cash) * 0.18)))
    ), 0) / Math.max(1, weightedScoreBase);
    const operatingValue = parts.reduce((sum, part) => sum + part.operatingValue, 0);
    const cash = parts.reduce((sum, part) => sum + part.cash, 0);
    const enterpriseValue = Math.max(0, operatingValue - cash);
    const leverageRatio = debt / Math.max(1, enterpriseValue);
    const pressureDiscount = debt > 0 ? Math.min(0.38, leverageRatio * 0.42) : 0;
    const debtDrag = debt > 0 ? Math.min(enterpriseValue * 0.65, debt * (0.2 + Math.min(0.45, leverageRatio * 0.3))) : 0;
    const indicativeValue = Math.round(cash) + roundMoney(Math.max(MIN_STUDIO_SALE_VALUE, ((operatingValue - cash) * (1 - pressureDiscount)) - debtDrag));
    const catalogTarget = isAcquiredStudio(studio) ? findParentProductionHouse(player, studio) : undefined;
    return {
        indicativeValue,
        recommendedAsk: cash + roundMoney((indicativeValue - cash) * 1.12),
        recommendedFloor: cash + Math.max(roundMoney(MIN_STUDIO_SALE_VALUE), roundMoney((indicativeValue - cash) * 0.82)),
        annualRevenue: roundMoney(annualRevenue),
        catalogValue,
        debt,
        score: Math.round(qualityScore),
        includedStudioIds,
        includedStudios: parts.map(({ score: _score, operatingValue: _operatingValue, ...part }) => part),
        isParentSale: isParentStudioSale(studio),
        retainedCatalogTargetStudioId: catalogTarget?.id,
        retainedCatalogTargetStudioName: catalogTarget?.name,
    };
};

export const getStudioSalePricingBounds = (valuation: StudioSaleValuation) => {
    const value = Math.max(MIN_STUDIO_SALE_VALUE, Number(valuation.indicativeValue || 0));
    const cash = valuation.includedStudios.reduce((sum, part) => sum + part.cash, 0);
    const enterprise = Math.max(MIN_STUDIO_SALE_VALUE, value - cash);
    return {
        minAsk: cash + roundMoney(Math.max(MIN_STUDIO_SALE_VALUE, enterprise * MIN_ASK_TO_VALUE)),
        maxAsk: cash + roundMoney(Math.max(MIN_STUDIO_SALE_VALUE, enterprise * MAX_ASK_TO_VALUE)),
        minFloor: cash + roundMoney(Math.max(MIN_STUDIO_SALE_VALUE, enterprise * MIN_FLOOR_TO_VALUE)),
    };
};

export const normalizeStudioSalePricing = (
    valuation: StudioSaleValuation,
    askPrice: number,
    minimumPrice: number,
) => {
    const bounds = getStudioSalePricingBounds(valuation);
    const cash = valuation.includedStudios.reduce((sum, part) => sum + part.cash, 0);
    const ask = cash + roundMoney(clamp((Number(askPrice) || 0) - cash, bounds.minAsk - cash, bounds.maxAsk - cash));
    const floor = cash + roundMoney(clamp((Number(minimumPrice) || 0) - cash, bounds.minFloor - cash, ask - cash));
    return { askPrice: ask, minimumPrice: floor, bounds };
};

export const getStudioSalePricingIssue = (
    valuation: StudioSaleValuation,
    askPrice: number,
    minimumPrice: number,
) => {
    const safeAsk = Math.max(0, Math.round(askPrice));
    const safeMinimum = Math.max(0, Math.round(minimumPrice));
    const bounds = getStudioSalePricingBounds(valuation);
    if (safeAsk <= 0 || safeMinimum <= 0) return 'Set a valid ask price and walk-away floor before listing.';
    if (safeMinimum > safeAsk) return 'Walk-away floor cannot be above the asking price.';
    if (safeAsk < bounds.minAsk) return `Asking price is too far below the valuation file. Minimum ask: ${formatMoney(bounds.minAsk)}.`;
    if (safeMinimum < bounds.minFloor) return `Walk-away floor is too low for a managed sale. Minimum floor: ${formatMoney(bounds.minFloor)}.`;
    if (safeAsk > bounds.maxAsk) return `Asking price is too far above the valuation file. Maximum ask: ${formatMoney(bounds.maxAsk)}.`;
    return null;
};

export const getStudioSaleReadiness = (player: Player, studio: Business): StudioSaleReadiness => {
    const valuation = getStudioSaleValuation(player, studio);
    const includedStudioIds = getIncludedStudioIds(player, studio);
    const bundledSubsidiaryCount = Math.max(0, includedStudioIds.length - 1);
    const activeSlateItems = getStudioSaleActiveSlateItems(player, includedStudioIds);
    const activeSlateCount = activeSlateItems.length;
    const openSubsidiaries = getOpenSubsidiaries(player, studio);
    const activeDeck = studio.studioState?.saleDeck;
    const alreadyListed = Boolean(activeDeck && !['CLOSED', 'WITHDRAWN'].includes(activeDeck.status));
    // Dormant merged records are not valued twice: their assets already live in
    // HQ. Their original holding period and minority interests still matter.
    const dormantMergers = isParentStudioSale(studio) ? (player.businesses || []).filter(business => (
        business.studioState?.operatingModel === 'FULL_MERGER'
        && business.studioState?.mergedIntoStudioId === studio.id
    )) : [];
    const partialMergers = dormantMergers.filter(business => getStudioOwnershipPercent(player, business) < 100);
    const holdingStudioIds = new Set([...includedStudioIds, ...dormantMergers.map(business => business.id)]);
    const holdingBlockers = (player.businesses || []).filter(business => holdingStudioIds.has(business.id))
        .map(business => ({ business, holding: getStudioSaleHoldingPeriod(player, business) }))
        .filter(({ holding }) => !holding.eligible);
    const requirements: StudioSaleRequirement[] = [
        {
            id: 'MINORITY_MERGER_CLEAR', label: 'Merged minority ownership settled', met: partialMergers.length === 0,
            detail: partialMergers.length
                ? `Carve out ${partialMergers.map(business => business.name).join(', ')} before selling the group so minority owners receive their share.`
                : 'No dormant merged banner has unsettled minority ownership.',
        },
        {
            id: 'HOLDING_PERIOD', label: '13 completed weeks of ownership',
            met: holdingBlockers.length === 0,
            detail: holdingBlockers.length
                ? holdingBlockers.map(({ business, holding }) => `${business.name}: ${holding.remainingWeeks} week${holding.remainingWeeks === 1 ? '' : 's'} remaining before listing.`).join(' ')
                : 'Every included banner has completed its 13-week holding period.',
        },
        {
            id: 'PRODUCTION_HOUSE',
            label: 'Production house',
            met: studio.type === 'PRODUCTION_HOUSE' && studio.studioState?.operatingModel !== 'FULL_MERGER',
            detail: 'Only active studio banners can be listed for sale.',
        },
        {
            id: 'ACTIVE_SLATE_CLEAR',
            label: 'No active slate',
            met: activeSlateCount === 0,
            detail: activeSlateCount > 0
                ? `${activeSlateCount} active project${activeSlateCount === 1 ? '' : 's'} must finish before closing.`
                : 'No active productions are tied to this studio.',
        },
        {
            id: 'SUBSIDIARIES_CLEAR',
            label: 'Group structure clear',
            met: openSubsidiaries.length === 0,
            detail: openSubsidiaries.length > 0
                ? `${openSubsidiaries.length} subsidiar${openSubsidiaries.length === 1 ? 'y has' : 'ies have'} a live sale file. Close or cancel that deck first.`
                : bundledSubsidiaryCount > 0
                    ? `Group package includes ${bundledSubsidiaryCount} acquired banner${bundledSubsidiaryCount === 1 ? '' : 's'}.`
                    : 'No loose subsidiary sale file blocks the transfer.',
        },
        {
            id: 'VALUATION_READY',
            label: 'Valuation file ready',
            met: valuation.indicativeValue > 0,
            detail: 'Bankers can price the banner from revenue, catalog, and balance sheet.',
        },
        {
            id: 'NOT_ALREADY_LISTED',
            label: 'No duplicate listing',
            met: !alreadyListed,
            detail: alreadyListed ? 'A live sale process already exists for this studio.' : 'Ready to open a sale room.',
        },
    ];
    const blockers = requirements.filter(requirement => !requirement.met).map(requirement => requirement.detail);
    const closeBlockers = blockers.filter(blocker => !blocker.includes('live sale process'));
    return {
        canList: requirements.every(requirement => requirement.met),
        canClose: closeBlockers.length === 0,
        requirements,
        blockers,
        valuation,
        activeSlateItems,
    };
};

const defaultTransferTerms: StudioSaleTransferTerms = {
    nameRights: 'BUYER_KEEPS_NAME',
    catalogRights: 'FULL_LIBRARY',
    sellerCredit: true,
    staffProtectionWeeks: 12,
    royaltyPercent: 2,
    royaltyWeeks: 104,
};

const normalizeTransferTerms = (terms?: Partial<StudioSaleTransferTerms>): StudioSaleTransferTerms => ({
    nameRights: terms?.nameRights || defaultTransferTerms.nameRights,
    catalogRights: terms?.catalogRights || defaultTransferTerms.catalogRights,
    sellerCredit: terms?.sellerCredit ?? defaultTransferTerms.sellerCredit,
    staffProtectionWeeks: Math.max(0, Math.min(52, Math.round(terms?.staffProtectionWeeks ?? defaultTransferTerms.staffProtectionWeeks))),
    royaltyPercent: Math.max(0, Math.min(8, Number(terms?.royaltyPercent ?? defaultTransferTerms.royaltyPercent))),
    royaltyWeeks: Math.max(0, Math.min(208, Math.round(terms?.royaltyWeeks ?? defaultTransferTerms.royaltyWeeks))),
});

const sellerRetainsCatalog = (terms: StudioSaleTransferTerms) => terms.catalogRights !== 'FULL_LIBRARY';

const normalizeTransferTermsForStudio = (
    player: Player,
    studio: Business,
    terms?: Partial<StudioSaleTransferTerms>,
): StudioSaleTransferTerms => {
    const normalized = normalizeTransferTerms(terms);
    if (isParentStudioSale(studio) || getStudioOwnershipPercent(player, studio) < 100) {
        return { ...normalized, catalogRights: 'FULL_LIBRARY' };
    }
    if (isAcquiredStudio(studio) && sellerRetainsCatalog(normalized) && !findParentProductionHouse(player, studio)) {
        return { ...normalized, catalogRights: 'FULL_LIBRARY' };
    }
    return normalized;
};

export const getStudioSaleEffectiveTransferTerms = (
    player: Player,
    studio: Business,
    terms?: Partial<StudioSaleTransferTerms>,
) => normalizeTransferTermsForStudio(player, studio, terms);

const buyerPools: Record<StudioSaleBuyerType, string[]> = {
    RIVAL_STUDIO: ['Aster Gate Pictures', 'Silverline Studios', 'North Pier Entertainment', 'Helio Film Group'],
    FAMOUS_PERSON: ['Maya Hart', 'Rohan Vale', 'Elena Cross', 'Dev Arman'],
    PRIVATE_EQUITY: ['Northstar Media Capital', 'Cobalt Creek Partners', 'Kinetic Arts Fund', 'Summit House Equity'],
    STREAMING_PLATFORM: ['Orion Stream', 'BlueRiver Plus', 'NovaPlay', 'Atlas Screen'],
    NPC_PRODUCER: ['Kieran Shah Productions', 'Luxe Slate Co.', 'Fableline Producers', 'Vega Unit'],
};

const buyerIntent: Record<StudioSaleBuyerType, string[]> = {
    RIVAL_STUDIO: ['fold the slate into a larger theatrical pipeline', 'buy the catalog and preserve the banner name'],
    FAMOUS_PERSON: ['turn the studio into a star-driven boutique label', 'use the studio as a personal production hub'],
    PRIVATE_EQUITY: ['trim costs and chase higher-margin franchises', 'hold the asset for a bigger resale later'],
    STREAMING_PLATFORM: ['secure output for a streaming-first slate', 'lock the library into exclusive platform windows'],
    NPC_PRODUCER: ['keep the team small and make prestige bets', 'rebuild the studio around producer-led films'],
};

const buyerHeadlines: Record<StudioSaleBuyerType, string[]> = {
    RIVAL_STUDIO: ['Strategic studio-to-studio bid', 'Library expansion proposal'],
    FAMOUS_PERSON: ['Celebrity-led takeover pitch', 'Boutique label buyout'],
    PRIVATE_EQUITY: ['Financial sponsor offer', 'Leveraged media roll-up'],
    STREAMING_PLATFORM: ['Platform output bid', 'Streaming library acquisition'],
    NPC_PRODUCER: ['Producer consortium bid', 'Independent banner rescue'],
};

const buyerTypes: StudioSaleBuyerType[] = [
    'RIVAL_STUDIO',
    'FAMOUS_PERSON',
    'PRIVATE_EQUITY',
    'STREAMING_PLATFORM',
    'NPC_PRODUCER',
];

const pick = <T,>(items: T[], rng: () => number) => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

const getTermsValueModifier = (terms: StudioSaleTransferTerms) => {
    const nameModifier = terms.nameRights === 'BUYER_KEEPS_NAME' ? 0.04 : terms.nameRights === 'BUYER_REBRANDS' ? 0 : -0.08;
    const catalogModifier = terms.catalogRights === 'FULL_LIBRARY' ? 0.08 : terms.catalogRights === 'FUTURE_SLATE_ONLY' ? -0.1 : -0.2;
    const creditModifier = terms.sellerCredit ? -0.01 : 0.01;
    const staffModifier = terms.staffProtectionWeeks > 26 ? -0.025 : terms.staffProtectionWeeks > 0 ? -0.01 : 0.01;
    const royaltyDuration = Math.max(0.15, Math.min(2, terms.royaltyWeeks / 104));
    const royaltyModifier = -(terms.royaltyPercent * royaltyDuration * 0.018);
    return nameModifier + catalogModifier + creditModifier + staffModifier + royaltyModifier;
};

const getRoyaltyDurationFactor = (weeks: number) => Math.max(0, Math.min(2, weeks / 104));

const estimateRoyaltyValue = (amount: number, royaltyPercent: number, royaltyWeeks: number) => (
    roundMoney(amount * (Math.max(0, royaltyPercent) / 100) * getRoyaltyDurationFactor(royaltyWeeks))
);

const getOfferPackageValue = (amount: number, royaltyPercent: number, royaltyWeeks: number) => (
    roundMoney(amount + (estimateRoyaltyValue(amount, royaltyPercent, royaltyWeeks) * 0.65))
);

const getOfferRoyaltyPitch = (
    type: StudioSaleBuyerType,
    terms: StudioSaleTransferTerms,
    amountRatio: number,
    valuation: StudioSaleValuation,
    rng: () => number,
) => {
    const typeBias = type === 'FAMOUS_PERSON' ? 0.6
        : type === 'NPC_PRODUCER' ? 0.35
            : type === 'PRIVATE_EQUITY' ? -0.65
                : type === 'STREAMING_PLATFORM' ? -0.25
                    : -0.1;
    const debtPressure = valuation.debt > Math.max(0, valuation.indicativeValue - valuation.includedStudios.reduce((sum, part) => sum + part.cash, 0)) * 0.55 ? 0.45 + rng() * 0.55 : 0;
    const cashTrade = amountRatio > 1.05 ? 0.35 + rng() * 0.75 : amountRatio < 0.82 ? -(0.15 + rng() * 0.35) : 0;
    const royalty = terms.royaltyPercent + typeBias - debtPressure - cashTrade + ((rng() - 0.5) * 0.7);
    return Math.max(0, Math.min(8, Math.round(royalty * 10) / 10));
};

const createOfferConditions = (
    type: StudioSaleBuyerType,
    debtAssumed: number,
    totalDebt: number,
    terms: StudioSaleTransferTerms,
    valuation: StudioSaleValuation,
    amount: number,
    rng: () => number,
): string[] => {
    const nameClause = terms.nameRights === 'BUYER_KEEPS_NAME'
        ? 'Buyer receives studio name and banner marks'
        : terms.nameRights === 'BUYER_REBRANDS'
            ? 'Buyer may rebrand after transfer'
            : 'Seller retains studio name; buyer receives assets only';
    const catalogClause = terms.catalogRights === 'FULL_LIBRARY'
        ? 'Full catalog and IP library transfer'
        : terms.catalogRights === 'FUTURE_SLATE_ONLY'
            ? 'Future slate and operations transfer; back catalog excluded'
            : 'Seller keeps back catalog and participation rights';
    const sellerDebtPayoff = Math.max(0, totalDebt - debtAssumed);
    const shared = [
        totalDebt > 0
            ? debtAssumed >= totalDebt
                ? 'Buyer assumes all listed acquisition debt at closing'
                : `Buyer assumes ${formatMoney(debtAssumed)} debt; escrow pays ${formatMoney(sellerDebtPayoff)} from sale price`
            : 'Clean cash closing with no inherited debt clause',
        nameClause,
        catalogClause,
        terms.royaltyPercent > 0 ? `${terms.royaltyPercent.toFixed(1)}% backend royalty reserved for seller` : 'No post-sale royalty participation',
        rng() > 0.52 ? 'Existing leadership retained through transition' : 'Buyer can install new studio leadership',
    ];
    if (valuation.debt > valuation.indicativeValue * 0.55) {
        shared.push('Distress pricing: buyer knows debt pressure weakens seller leverage');
    } else if (amount < valuation.indicativeValue * 0.78) {
        shared.push('Opportunistic lowball bid with heavy buyer downside protection');
    }
    if (type === 'STREAMING_PLATFORM') return [...shared, 'First-look streaming output window required'];
    if (type === 'PRIVATE_EQUITY') return [...shared, 'Cost review begins after transfer'];
    if (type === 'FAMOUS_PERSON') return [...shared, 'Buyer wants name approval on the next slate'];
    if (type === 'RIVAL_STUDIO') return [...shared, 'Catalog cross-promotion rights included'];
    return [...shared, 'Producer committee controls greenlight priorities'];
};

const applyOfferEconomics = (
    offer: StudioSaleOffer,
    amount: number,
    royaltyPercent: number,
    terms: StudioSaleTransferTerms,
    totalDebt = offer.debtAssumed,
): StudioSaleOffer => {
    const safeAmount = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
    const safeTotalDebt = Math.max(0, Math.round(Number.isFinite(totalDebt) ? totalDebt : 0));
    const royaltyWeeks = terms.royaltyWeeks;
    const safeRoyaltyPercent = Math.max(0, Math.min(8, Number(royaltyPercent) || 0));
    const royaltyEstimate = royaltyWeeks > 0 ? estimateRoyaltyValue(safeAmount, safeRoyaltyPercent, royaltyWeeks) : 0;
    const bankerFee = Math.round(safeAmount * 0.025);
    const requiredDebtAssumption = safeTotalDebt > 0
        ? Math.round(Math.max(0, safeTotalDebt - Math.max(0, safeAmount - bankerFee)))
        : 0;
    const debtAssumed = safeTotalDebt > 0
        ? Math.round(Math.min(safeTotalDebt, Math.max(offer.debtAssumed, requiredDebtAssumption)))
        : 0;
    const sellerDebtPayoff = Math.round(Math.max(0, safeTotalDebt - debtAssumed));
    const cashAtClose = Math.round(Math.max(0, safeAmount - sellerDebtPayoff - bankerFee));
    return {
        ...offer,
        amount: safeAmount,
        debtAssumed,
        cashAtClose,
        companyCashAtClose: cashAtClose,
        royaltyCompanyEstimate: royaltyEstimate,
        bankerFee,
        royaltyPercent: safeRoyaltyPercent,
        royaltyWeeks,
        royaltyEstimate,
    };
};

const getPackageCash = (valuation: StudioSaleValuation) => valuation.includedStudios.reduce((sum, part) => sum + part.cash, 0);

const applySellerEntitlement = (player: Player, studio: Business, offer: StudioSaleOffer): StudioSaleOffer => {
    const valuation = getStudioSaleValuation(player, studio);
    const packageCash = getPackageCash(valuation);
    const enterpriseWeight = valuation.includedStudios.reduce((sum, part) => sum + Math.max(0, part.estimatedValue - part.cash), 0);
    const companyCash = offer.companyCashAtClose ?? offer.cashAtClose;
    const payoff = Math.max(0, offer.amount - offer.bankerFee - companyCash);
    const entitlement = valuation.includedStudios.reduce((sum, part) => {
        const valueWeight = enterpriseWeight > 0 ? Math.max(0, part.estimatedValue - part.cash) / enterpriseWeight : 1 / valuation.includedStudios.length;
        const grossPrice = part.cash + Math.max(0, offer.amount - packageCash) * valueWeight;
        const allocatedFee = offer.amount > 0 ? offer.bankerFee * grossPrice / offer.amount : 0;
        const debtPayoff = valuation.debt > 0 ? payoff * part.debt / valuation.debt : 0;
        return sum + (grossPrice - allocatedFee - debtPayoff) * part.ownershipPercent / 100;
    }, 0);
    const sellerCash = Math.round(clamp(entitlement, 0, companyCash));
    const equityPercent = companyCash > 0 ? sellerCash / companyCash * 100
        : valuation.includedStudios.reduce((sum, part) => sum + Math.max(0, part.estimatedValue - part.cash) * part.ownershipPercent, 0) / Math.max(1, enterpriseWeight);
    const companyRoyalty = estimateRoyaltyValue(Math.max(0, offer.amount - getPackageCash(valuation)), offer.royaltyPercent, offer.royaltyWeeks);
    // Future royalties are contingent enterprise income, not the cash/debt
    // closing waterfall. Minority interests survive an underwater cash exit.
    const ownedEnterprise = valuation.includedStudios.reduce((sum, part) => (
        sum + Math.max(0, part.estimatedValue - part.cash) * part.ownershipPercent / 100
    ), 0);
    const royaltyOwnership = enterpriseWeight > 0 ? ownedEnterprise / enterpriseWeight : equityPercent / 100;
    return { ...offer, companyCashAtClose: companyCash, sellerOwnershipPercent: equityPercent,
        cashAtClose: sellerCash, royaltyCompanyEstimate: companyRoyalty,
        royaltyEstimate: Math.round(companyRoyalty * royaltyOwnership) };
};

const makeSaleSnapshot = (player: Player, studio: Business): NonNullable<StudioSaleDeck['saleSnapshot']> => ({
    version: 1,
    studios: getTransferredStudioIds(player, studio).sort().map(id => {
        const business = getStudioBusiness(player, id)!;
        return {
            id, cash: business.studioState?.operatingModel === 'FULL_MERGER' ? 0 : Math.round(Math.max(0, Number(business.balance || 0))),
            debt: getDebtForStudios(player, [id]), ownershipPercent: getStudioOwnershipPercent(player, business),
            materialFingerprint: JSON.stringify({ mergedSnapshotCash: business.studioState?.operatingModel === 'FULL_MERGER' ? business.balance : undefined, config: business.config, departments: business.studioState?.departments,
                equipment: business.studioState?.equipment, scripts: business.studioState?.scripts,
                concepts: business.studioState?.concepts, ownedRights: business.studioState?.ownedRights,
                purchasedIPTitles: business.studioState?.purchasedIPTitles,
                catalogue: getCatalogValue(player, [id]), quality: getStudioQualityScore(business),
                locations: business.stats.locations, earnings: getStudioSaleEarnings(player, business) }),
        };
    }),
});

export const getStudioSaleRevalidationIssue = (player: Player, studio: Business, deck = studio.studioState?.saleDeck): string | null => {
    if (!deck || ['CLOSED', 'WITHDRAWN'].includes(deck.status)) return null;
    if (!deck.saleSnapshot || deck.saleSnapshot.version !== 1) {
        return 'This saved sale room needs buyer revalidation. Refresh buyer terms before accepting or signing.';
    }
    if (JSON.stringify(deck.saleSnapshot) !== JSON.stringify(makeSaleSnapshot(player, studio))) {
        return 'Studio cash, debt, ownership or assets changed. Refresh buyer terms to reprice the package before accepting or signing.';
    }
    return null;
};

const makeSaleOffer = (
    deckId: string,
    index: number,
    type: StudioSaleBuyerType,
    player: Player,
    studio: Business,
    valuation: StudioSaleValuation,
    askPrice: number,
    minimumPrice: number,
    terms: StudioSaleTransferTerms,
    rng: () => number,
): StudioSaleOffer => {
    const qualityLift = (valuation.score - 50) / 250;
    const cashAtListing = getPackageCash(valuation);
    const askTension = Math.max(0, askPrice - cashAtListing) / Math.max(1, valuation.indicativeValue - cashAtListing);
    const buyerAggression = 0.78 + (rng() * 0.45) + qualityLift;
    const askAnchor = 1 + ((askTension - 1) * (0.22 + rng() * 0.24));
    const riskHaircut = valuation.debt > 0 ? Math.min(0.16, valuation.debt / Math.max(1, valuation.indicativeValue - cashAtListing) * (0.12 + rng() * 0.12)) : 0;
    const loyaltyPremium = type === 'FAMOUS_PERSON' ? 0.04 : type === 'RIVAL_STUDIO' ? 0.06 : type === 'PRIVATE_EQUITY' ? -0.03 : 0;
    const termsModifier = getTermsValueModifier(terms);
    const packageCash = getPackageCash(valuation);
    const enterpriseValue = Math.max(0, valuation.indicativeValue - packageCash);
    const preliminaryAmount = packageCash + roundMoney(Math.max(
        Math.max(0, minimumPrice - packageCash) * (0.72 + rng() * 0.25),
        enterpriseValue * buyerAggression * askAnchor * (1 - riskHaircut + loyaltyPremium + termsModifier),
    ));
    const royaltyPercent = getOfferRoyaltyPitch(type, terms, Math.max(0, preliminaryAmount - packageCash) / Math.max(1, enterpriseValue), valuation, rng);
    const royaltyCashTrade = 1 + ((terms.royaltyPercent - royaltyPercent) * 0.012);
    const amount = packageCash + roundMoney(Math.max(Math.max(0, minimumPrice - packageCash) * 0.72, (preliminaryAmount - packageCash) * royaltyCashTrade));
    const debtCoverage = valuation.debt > 0 ? clamp(45 + (rng() * 50) + (type === 'PRIVATE_EQUITY' ? 10 : 0), 20, 100) / 100 : 0;
    const debtAssumed = roundMoney(Math.min(valuation.debt, valuation.debt * debtCoverage, Math.max(0, amount - packageCash) * 0.45));
    const baseOffer: StudioSaleOffer = {
        id: `${deckId}_offer_${index}_${type.toLowerCase()}`,
        buyerName: pick(buyerPools[type], rng),
        buyerType: type,
        headline: pick(buyerHeadlines[type], rng),
        amount,
        originalAmount: amount, originalRoyaltyPercent: royaltyPercent, packageCash,
        cashAtClose: 0,
        debtAssumed,
        bankerFee: 0,
        royaltyPercent,
        royaltyWeeks: terms.royaltyWeeks,
        royaltyEstimate: 0,
        availableAfterWeeks: [0, 1, 1, 2, 3][index - 1] ?? Math.min(3, index - 1),
        availableWeek: player.currentWeek,
        availableYear: player.age,
        reputationImpact: Math.round(clamp((amount / Math.max(1, valuation.indicativeValue) - 0.82) * 18, -8, 12)),
        buyerIntent: pick(buyerIntent[type], rng),
        conditions: [],
        status: 'PENDING',
    };
    const availability = fromAbsoluteWeek(currentAbsoluteWeek(player) + baseOffer.availableAfterWeeks);
    const offerWithEconomics = applySellerEntitlement(player, studio, applyOfferEconomics(baseOffer, amount, royaltyPercent, terms, valuation.debt));
    return {
        ...offerWithEconomics,
        availableWeek: availability.week,
        availableYear: availability.year,
        conditions: createOfferConditions(type, offerWithEconomics.debtAssumed, valuation.debt, terms, valuation, offerWithEconomics.amount, rng),
    };
};

const generateOffers = (
    player: Player,
    studio: Business,
    valuation: StudioSaleValuation,
    askPrice: number,
    minimumPrice: number,
    terms: StudioSaleTransferTerms,
    deckId: string,
): StudioSaleOffer[] => {
    const rng = makeRng(`${deckId}:${studio.id}:${askPrice}:${minimumPrice}:${player.age}:${player.currentWeek}`);
    const shuffledTypes = [...buyerTypes].sort(() => rng() - 0.5);
    return shuffledTypes.slice(0, 5)
        .map((type, index) => makeSaleOffer(deckId, index + 1, type, player, studio, valuation, askPrice, minimumPrice, terms, rng))
        .sort((a, b) => a.availableAfterWeeks - b.availableAfterWeeks || b.cashAtClose - a.cashAtClose);
};

const updateStudioDeck = (player: Player, studioId: string, deck?: StudioSaleDeck): Player => ({
    ...player,
    businesses: (player.businesses || []).map(business => {
        if (business.id !== studioId) return business;
        return {
            ...business,
            studioState: {
                ...business.studioState!,
                saleDeck: deck,
            },
        };
    }),
});

export const getStudioSaleWindowState = (player: Player, deck: StudioSaleDeck): StudioSaleWindowState => {
    const listedAbs = toAbsoluteWeek(deck.listedYear, deck.listedWeek);
    const nowAbs = currentAbsoluteWeek(player);
    const elapsedWeeks = Math.max(0, nowAbs - listedAbs);
    const totalWeeks = Math.max(1, deck.offerWindowWeeks || 3);
    const availableOffers = deck.offers.filter(offer => currentAbsoluteWeek(player) >= toAbsoluteWeek(offer.availableYear, offer.availableWeek));
    return {
        elapsedWeeks: Math.min(totalWeeks, elapsedWeeks),
        remainingWeeks: Math.max(0, totalWeeks - elapsedWeeks),
        totalWeeks,
        availableOffers,
        pendingOffers: deck.offers.filter(offer => !availableOffers.some(available => available.id === offer.id)),
        windowClosed: elapsedWeeks >= totalWeeks,
    };
};

export const createStudioSaleDeck = (
    player: Player,
    studioId: string,
    askPrice: number,
    minimumPrice: number,
    transferTerms?: Partial<StudioSaleTransferTerms>,
): StudioSaleResult => {
    const studio = getStudioBusiness(player, studioId);
    if (!studio || !studio.studioState) {
        return { success: false, player, message: 'Studio sale file could not be opened.' };
    }
    const readiness = getStudioSaleReadiness(player, studio);
    if (!readiness.canList) {
        return { success: false, player, message: readiness.blockers[0] || 'Requirements are not met yet.' };
    }
    const pricingIssue = getStudioSalePricingIssue(readiness.valuation, askPrice, minimumPrice);
    if (pricingIssue) {
        return { success: false, player, message: pricingIssue };
    }
    const { askPrice: safeAsk, minimumPrice: safeMinimum } = normalizeStudioSalePricing(readiness.valuation, askPrice, minimumPrice);

    const terms = normalizeTransferTermsForStudio(player, studio, transferTerms);
    const deckId = `studio_sale_${studio.id}_${player.age}_${player.currentWeek}_${Date.now()}`;
    const closeDate = fromAbsoluteWeek(currentAbsoluteWeek(player) + 3);
    const deck: StudioSaleDeck = {
        id: deckId,
        studioId: studio.id,
        studioName: studio.name,
        status: 'LISTED',
        askPrice: safeAsk,
        minimumPrice: safeMinimum,
        indicativeValuation: readiness.valuation.indicativeValue,
        debtAtListing: readiness.valuation.debt,
        saleSnapshot: makeSaleSnapshot(player, studio),
        listedWeek: player.currentWeek,
        listedYear: player.age,
        offerWindowWeeks: 3,
        offersCloseWeek: closeDate.week,
        offersCloseYear: closeDate.year,
        transferTerms: terms,
        offers: generateOffers(player, studio, readiness.valuation, safeAsk, safeMinimum, terms, deckId),
    };

    const nextPlayer = updateStudioDeck(player, studio.id, deck);
    return {
        success: true,
        player: {
            ...nextPlayer,
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: `${studio.name} listed for sale. Buyer offers will arrive over the next three weeks.`,
                type: 'neutral' as const,
            }, ...(nextPlayer.logs || [])].slice(0, 120),
        },
        deck,
        message: 'Studio is listed. Offers will arrive across the three-week sale window.',
    };
};

export const refreshStudioSaleDeck = (player: Player, studioId: string): StudioSaleResult => {
    const studio = getStudioBusiness(player, studioId);
    const deck = studio?.studioState?.saleDeck;
    if (!studio || !deck || ['CLOSED', 'WITHDRAWN'].includes(deck.status)) {
        return { success: false, player, message: 'No live sale room to revalidate.' };
    }
    const readiness = getStudioSaleReadiness(player, studio);
    if (!readiness.canClose) return { success: false, player, message: readiness.blockers.find(blocker => !blocker.includes('live sale process')) || 'Closing requirements are not met yet.' };
    const oldCash = deck.saleSnapshot?.studios.reduce((sum, part) => sum + part.cash, 0) || 0;
    const newCash = getPackageCash(readiness.valuation);
    const oldEnterprise = Math.max(1, deck.indicativeValuation - oldCash);
    const newEnterprise = Math.max(0, readiness.valuation.indicativeValue - newCash);
    const terms = normalizeTransferTermsForStudio(player, studio, deck.transferTerms);
    const pricing = normalizeStudioSalePricing(readiness.valuation,
        newCash + Math.max(0, deck.askPrice - oldCash) * newEnterprise / oldEnterprise,
        newCash + Math.max(0, deck.minimumPrice - oldCash) * newEnterprise / oldEnterprise);
    const refreshed: StudioSaleDeck = {
        ...deck, status: 'LISTED', acceptedOfferId: undefined, signingStartedWeek: undefined, signingStartedYear: undefined,
        indicativeValuation: readiness.valuation.indicativeValue, debtAtListing: readiness.valuation.debt,
        askPrice: pricing.askPrice, minimumPrice: pricing.minimumPrice,
        saleSnapshot: makeSaleSnapshot(player, studio), transferTerms: terms,
        offers: deck.offers.map(offer => {
            const amount = newCash + roundMoney(Math.max(0, offer.amount - oldCash) * newEnterprise / oldEnterprise);
            const revised = applyOfferEconomics({ ...offer, debtAssumed: Math.min(offer.debtAssumed, readiness.valuation.debt) },
                amount, offer.royaltyPercent, terms, readiness.valuation.debt);
            return { ...applySellerEntitlement(player, studio, revised), status: 'PENDING',
                originalAmount: newCash + roundMoney(Math.max(0, (offer.originalAmount ?? offer.amount) - oldCash) * newEnterprise / oldEnterprise),
                originalRoyaltyPercent: offer.originalRoyaltyPercent ?? offer.royaltyPercent, packageCash: newCash,
                counterAmount: undefined, counterRoyaltyPercent: undefined, counterStatus: undefined,
                conditions: offer.conditions.filter(condition => !condition.includes('Counter accepted')) } as StudioSaleOffer;
        }),
    };
    return { success: true, player: updateStudioDeck(player, studioId, refreshed), deck: refreshed,
        message: 'Buyer terms refreshed for the current cash, debt, ownership and assets. Review the revised proceeds and accept a bid again.' };
};

export const withdrawStudioSaleDeck = (player: Player, studioId: string): StudioSaleResult => {
    const studio = getStudioBusiness(player, studioId);
    const deck = studio?.studioState?.saleDeck;
    if (!studio || !deck || ['CLOSED', 'WITHDRAWN'].includes(deck.status)) {
        return { success: false, player, message: 'No live sale deck to withdraw.' };
    }
    if (deck.status === 'SIGNING' && !getStudioSaleRevalidationIssue(player, studio, deck)) {
        return { success: false, player, message: 'This deal is already in signing. Finish or leave the room before changing terms.' };
    }
    const withdrawnDeck: StudioSaleDeck = { ...deck, status: 'WITHDRAWN' };
    return {
        success: true,
        player: updateStudioDeck(player, studioId, withdrawnDeck),
        deck: withdrawnDeck,
        message: 'Sale listing cancelled. You can relist later with a new ask.',
    };
};

const getDeckDebtAtClose = (player: Player, studio: Business, deck: StudioSaleDeck) => (
    getDebtForStudios(player, deck.saleSnapshot?.studios.map(part => part.id) || getIncludedStudioIds(player, studio))
);

const updateOfferInDeck = (
    player: Player,
    studioId: string,
    updater: (deck: StudioSaleDeck, studio: Business, debtAtClose: number) => StudioSaleDeck,
): StudioSaleResult => {
    const studio = getStudioBusiness(player, studioId);
    const deck = studio?.studioState?.saleDeck;
    if (!studio || !deck) return { success: false, player, message: 'Sale room is not open.' };
    const issue = getStudioSaleRevalidationIssue(player, studio, deck);
    if (issue) return { success: false, player, message: issue };
    const updated = updater(deck, studio, getDeckDebtAtClose(player, studio, deck));
    const nextDeck = { ...updated, offers: updated.offers.map(offer => applySellerEntitlement(player, studio, offer)) };
    return {
        success: true,
        player: updateStudioDeck(player, studioId, nextDeck),
        deck: nextDeck,
        message: 'Sale room updated.',
    };
};

const counterAccepted = (
    deck: StudioSaleDeck,
    offer: StudioSaleOffer,
    counterAmount: number,
    counterRoyaltyPercent: number,
) => {
    const rng = makeRng(`${deck.id}:${offer.id}:counter-ceiling`);
    const cash = offer.packageCash ?? deck.saleSnapshot?.studios.reduce((sum, part) => sum + part.cash, 0) ?? 0;
    const originalAmount = offer.originalAmount ?? offer.amount;
    const originalRoyalty = offer.originalRoyaltyPercent ?? offer.royaltyPercent;
    const originalPackage = getOfferPackageValue(Math.max(0, originalAmount - cash), originalRoyalty, offer.royaltyWeeks);
    const counterPackage = getOfferPackageValue(Math.max(0, counterAmount - cash), counterRoyaltyPercent, offer.royaltyWeeks);
    const packageStretch = counterPackage / Math.max(1, originalPackage);
    const royaltyStretch = Math.max(0, counterRoyaltyPercent - originalRoyalty);
    const acceptanceLimit = 1.03 + (rng() * 0.08) + (offer.buyerType === 'FAMOUS_PERSON' ? 0.03 : 0) + (offer.buyerType === 'PRIVATE_EQUITY' ? -0.025 : 0);
    const packageFloor = 0.92 + (rng() * 0.05);
    return counterAmount >= cash && packageStretch >= packageFloor
        && packageStretch <= acceptanceLimit
        && royaltyStretch <= 2.5 + rng() * 1.5;
};

export const counterStudioSaleOffer = (
    player: Player,
    studioId: string,
    offerId: string,
    counterAmount: number,
    counterRoyaltyPercent?: number,
): StudioSaleResult => updateOfferInDeck(player, studioId, (deck, _studio, debtAtClose) => {
    const availableIds = new Set(getStudioSaleWindowState(player, deck).availableOffers.map(offer => offer.id));
    const nextOffers = deck.offers.map(offer => {
        if (offer.id !== offerId || !availableIds.has(offer.id) || !['PENDING', 'COUNTERED'].includes(offer.status)) return offer;
        const royalty = Math.max(0, Math.min(8, Number(counterRoyaltyPercent ?? offer.royaltyPercent)));
        const cash = offer.packageCash ?? 0;
        const amount = cash + roundMoney(Math.max(0, counterAmount - cash));
        const accepted = amount > 0 && counterAccepted(deck, offer, amount, royalty);
        if (!accepted) {
            return {
                ...offer,
                counterAmount: amount,
                counterRoyaltyPercent: royalty,
                counterStatus: 'REJECTED' as const,
                status: 'REJECTED' as const,
            };
        }
        return {
            ...applyOfferEconomics(offer, amount, royalty, deck.transferTerms, debtAtClose),
            counterAmount: amount,
            counterRoyaltyPercent: royalty,
            counterStatus: 'ACCEPTED' as const,
            status: 'COUNTERED' as const,
            conditions: [...offer.conditions.filter(condition => !condition.includes('Counter accepted')), 'Counter accepted by buyer'],
        };
    });
    return {
        ...deck,
        status: 'NEGOTIATING',
        offers: nextOffers,
    };
});

export const counterAllStudioSaleOffers = (
    player: Player,
    studioId: string,
    counterAmount: number,
    counterRoyaltyPercent?: number,
): StudioSaleResult => updateOfferInDeck(player, studioId, (deck, _studio, debtAtClose) => {
    const availableIds = new Set(getStudioSaleWindowState(player, deck).availableOffers
        .filter(offer => offer.status === 'PENDING' || offer.status === 'COUNTERED')
        .map(offer => offer.id));
    const nextOffers = deck.offers.map(offer => {
        if (!availableIds.has(offer.id)) return offer;
        const cash = offer.packageCash ?? 0;
        const amount = cash + roundMoney(Math.max(0, counterAmount - cash));
        const royalty = Math.max(0, Math.min(8, Number(counterRoyaltyPercent ?? offer.royaltyPercent)));
        const accepted = amount > 0 && counterAccepted(deck, offer, amount, royalty);
        if (!accepted) {
            return {
                ...offer,
                counterAmount: amount,
                counterRoyaltyPercent: royalty,
                counterStatus: 'REJECTED' as const,
                status: 'REJECTED' as const,
            };
        }
        return {
            ...applyOfferEconomics(offer, amount, royalty, deck.transferTerms, debtAtClose),
            counterAmount: amount,
            counterRoyaltyPercent: royalty,
            counterStatus: 'ACCEPTED' as const,
            status: 'COUNTERED' as const,
            conditions: [...offer.conditions.filter(condition => !condition.includes('Universal counter accepted')), 'Universal counter accepted by buyer'],
        };
    });
    return {
        ...deck,
        status: 'NEGOTIATING',
        offers: nextOffers,
    };
});

export const acceptStudioSaleOffer = (
    player: Player,
    studioId: string,
    offerId: string,
): StudioSaleResult => {
    const studio = getStudioBusiness(player, studioId);
    const deck = studio?.studioState?.saleDeck;
    const offer = deck?.offers.find(candidate => candidate.id === offerId);
    if (!studio || !deck || !offer) {
        return { success: false, player, message: 'That offer is no longer available.' };
    }
    if (['CLOSED', 'WITHDRAWN'].includes(deck.status)) return { success: false, player, message: 'That sale room is no longer open.' };
    const revalidationIssue = getStudioSaleRevalidationIssue(player, studio, deck);
    if (revalidationIssue) return { success: false, player, message: revalidationIssue };
    if (!getStudioSaleWindowState(player, deck).availableOffers.some(candidate => candidate.id === offerId)) {
        return { success: false, player, message: 'That buyer has not submitted the signed bid yet.' };
    }
    if (offer.status === 'REJECTED') {
        return { success: false, player, message: 'That buyer walked away after the counter.' };
    }
    const readiness = getStudioSaleReadiness(player, studio);
    if (!readiness.canClose) {
        return { success: false, player, message: readiness.blockers[0] || 'Closing requirements are not met yet.' };
    }
    const transferTerms = normalizeTransferTermsForStudio(player, studio, deck.transferTerms);
    const debtAtClose = getDeckDebtAtClose(player, studio, deck);
    const closingOffer = applySellerEntitlement(player, studio, applyOfferEconomics(offer, offer.amount, offer.royaltyPercent, transferTerms, debtAtClose));

    const signingDeck: StudioSaleDeck = {
        ...deck,
        status: 'SIGNING',
        transferTerms,
        acceptedOfferId: closingOffer.id,
        signingStartedWeek: player.currentWeek,
        signingStartedYear: player.age,
        offers: deck.offers.map(candidate => ({
            ...(candidate.id === closingOffer.id ? closingOffer : candidate),
            status: candidate.id === closingOffer.id ? 'ACCEPTED' : candidate.status,
        })),
    };

    return {
        success: true,
        player: updateStudioDeck(player, studio.id, signingDeck),
        deck: signingDeck,
        message: `${closingOffer.buyerName} is ready. Sign the transfer documents.`,
    };
};

const makeSaleTransaction = (player: Player, amount: number, studioName: string): Transaction => ({
    id: `tx_studio_sale_${player.age}_${player.currentWeek}_${Date.now()}`,
    week: player.currentWeek,
    year: player.age,
    amount: Math.trunc(amount),
    category: 'BUSINESS',
    description: `${studioName} sale proceeds`,
});

const makeRoyaltyTransaction = (player: Player, amount: number): Transaction => ({
    id: `tx_studio_sale_royalty_${player.age}_${player.currentWeek}_${Date.now()}`,
    week: player.currentWeek,
    year: player.age,
    amount: Math.trunc(amount),
    category: 'ROYALTY',
    description: 'Studio sale royalty collection',
});

const formatMoney = (value: number) => {
    const absolute = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(0)}K`;
    return `${sign}$${absolute.toFixed(0)}`;
};

const uniqueById = <T extends { id?: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter(item => {
        const key = item.id || JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const uniqueStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const getCatalogRetentionTarget = (
    player: Player,
    studio: Business,
    terms: StudioSaleTransferTerms,
) => {
    if (!isAcquiredStudio(studio) || !sellerRetainsCatalog(terms) || isParentStudioSale(studio)) return undefined;
    return findParentProductionHouse(player, studio);
};

const makeNameRightsSummary = (
    studio: Business,
    offer: StudioSaleOffer,
    terms: StudioSaleTransferTerms,
) => {
    if (terms.nameRights === 'BUYER_REBRANDS') {
        return `${offer.buyerName} may relaunch ${studio.name} under a new banner after closing`;
    }
    if (terms.nameRights === 'SELLER_RETAINS_NAME') {
        return `the seller retains the ${studio.name} name while ${offer.buyerName} receives the operating assets`;
    }
    return `${offer.buyerName} receives the ${studio.name} name and banner marks`;
};

const makeCatalogSummary = (
    studio: Business,
    offer: StudioSaleOffer,
    terms: StudioSaleTransferTerms,
    catalogTargetName?: string,
) => {
    if (isParentStudioSale(studio)) {
        return 'the full production-house group, subsidiaries, catalog and IP library transfer together';
    }
    if (!sellerRetainsCatalog(terms)) {
        return `${offer.buyerName} receives the full catalog and IP library`;
    }
    if (catalogTargetName) {
        return `back catalog and retained IP move into ${catalogTargetName}`;
    }
    return 'the back catalog remains outside the buyer package';
};

const moveRetainedCatalogToParent = (
    player: Player,
    studio: Business,
    includedStudioIds: string[],
    terms: StudioSaleTransferTerms,
) => {
    const targetStudio = getCatalogRetentionTarget(player, studio, terms);
    if (!targetStudio) {
        return { player, catalogTargetName: undefined };
    }

    const includedSet = new Set(includedStudioIds);
    const sourceStudios = (player.businesses || []).filter(business => includedSet.has(business.id));
    const retainedRights = sourceStudios.flatMap(source => source.studioState?.ownedRights || []);
    const retainedTitles = sourceStudios.flatMap(source => source.studioState?.purchasedIPTitles || []);

    const nextPlayer: Player = {
        ...player,
        businesses: (player.businesses || []).map(business => {
            if (business.id !== targetStudio.id) return business;
            const parentState = business.studioState!;
            return {
                ...business,
                studioState: {
                    ...parentState,
                    ownedRights: uniqueById([...(parentState.ownedRights || []), ...retainedRights]),
                    purchasedIPTitles: uniqueStrings([...(parentState.purchasedIPTitles || []), ...retainedTitles]),
                },
            };
        }),
        commitments: (player.commitments || []).map(commitment => (
            commitment.projectDetails?.studioId && includedSet.has(String(commitment.projectDetails.studioId))
                ? {
                    ...commitment,
                    projectDetails: {
                        ...commitment.projectDetails,
                        studioId: targetStudio.id,
                    },
                }
                : commitment
        )),
        activeReleases: (player.activeReleases || []).map(release => (
            release.projectDetails?.studioId && includedSet.has(String(release.projectDetails.studioId))
                ? {
                    ...release,
                    projectDetails: {
                        ...release.projectDetails,
                        studioId: targetStudio.id,
                    },
                }
                : release
        )),
        pastProjects: (player.pastProjects || []).map(project => (
            includedSet.has(String(project.studioId || ''))
                ? {
                    ...project,
                    studioId: targetStudio.id,
                }
                : project
        )),
        world: {
            ...player.world,
            universes: Object.fromEntries(Object.entries(player.world?.universes || {}).map(([universeId, universe]) => [
                universeId,
                universe?.studioId && includedSet.has(String(universe.studioId))
                    ? { ...universe, studioId: targetStudio.id }
                    : universe,
            ])),
        },
    };

    return { player: nextPlayer, catalogTargetName: targetStudio.name };
};

const makeSaleNews = (
    player: Player,
    studio: Business,
    offer: StudioSaleOffer,
    terms: StudioSaleTransferTerms,
    catalogTargetName?: string,
): NewsItem => ({
    id: `news_studio_sale_${studio.id}_${player.age}_${player.currentWeek}`,
    headline: `${player.name} sells ${studio.name}`,
    subtext: `${offer.buyerName} closes the transfer for ${formatMoney(offer.amount)}${offer.royaltyPercent > 0 ? ` plus ${offer.royaltyPercent.toFixed(1)}% backend participation` : ''}; ${makeNameRightsSummary(studio, offer, terms)}, and ${makeCatalogSummary(studio, offer, terms, catalogTargetName)}.`,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: offer.amount >= 1_000_000_000 ? 'HIGH' : 'MEDIUM',
});

const makeSalePost = (
    player: Player,
    studio: Business,
    offer: StudioSaleOffer,
    terms: StudioSaleTransferTerms,
    catalogTargetName?: string,
): XPost => ({
    id: `x_studio_sale_${studio.id}_${player.age}_${player.currentWeek}`,
    authorId: 'dealwire',
    authorName: 'DealWire',
    authorHandle: '@dealwire',
    authorAvatar: '$',
    content: `${studio.name} sale closed with ${offer.buyerName}. Cash at close: ${formatMoney(offer.cashAtClose)}; ${makeNameRightsSummary(studio, offer, terms)}. ${catalogTargetName ? `Retained catalog moves to ${catalogTargetName}.` : makeCatalogSummary(studio, offer, terms, catalogTargetName)}${offer.royaltyPercent > 0 ? ` Seller keeps ${offer.royaltyPercent.toFixed(1)}% backend.` : ''}`,
    timestamp: Date.now(),
    likes: 800 + Math.round(offer.amount / 12_000_000),
    retweets: 120 + Math.round(offer.amount / 60_000_000),
    replies: 60 + Math.max(0, offer.reputationImpact * 16),
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    postType: 'GENERAL',
    sentiment: offer.reputationImpact >= 4 ? 'INDUSTRY' : offer.reputationImpact < -2 ? 'MESSY' : 'NEUTRAL',
});

const makeSaleMessage = (
    player: Player,
    studio: Business,
    offer: StudioSaleOffer,
    terms: StudioSaleTransferTerms,
    catalogTargetName?: string,
): Message => ({
    id: `msg_studio_sale_${studio.id}_${player.age}_${player.currentWeek}`,
    sender: 'Deal Counsel',
    subject: `${studio.name} sale closed`,
    text: `${offer.buyerName} has completed the transfer. ${formatMoney(offer.cashAtClose)} was wired to your personal account after debt assumptions and banker fees. ${makeNameRightsSummary(studio, offer, terms)}. ${makeCatalogSummary(studio, offer, terms, catalogTargetName)}.${offer.royaltyPercent > 0 ? ` Royalty collections will post weekly for ${offer.royaltyWeeks} weeks.` : ''}`,
    type: 'SYSTEM',
    data: {
        studioSale: true,
        studioId: studio.id,
        buyerName: offer.buyerName,
        amount: offer.amount,
        cashAtClose: offer.cashAtClose,
        debtAssumed: offer.debtAssumed,
        royaltyPercent: offer.royaltyPercent,
        royaltyWeeks: offer.royaltyWeeks,
        nameRights: terms.nameRights,
        catalogRights: terms.catalogRights,
        retainedCatalogTargetName: catalogTargetName,
    },
    isRead: false,
    weekSent: player.currentWeek,
});

const closeDebtForStudios = (player: Player, studioIds: string[]): Player => {
    const targetIds = new Set(studioIds);
    const synced = syncAcquisitionDebtLedger(player);
    const nextLedger = getAcquisitionDebtLedger(synced).map(entry => (
        targetIds.has(entry.studioId)
            ? { ...entry, remainingPrincipal: 0, status: 'PAID_OFF' as const, missedServiceAmount: 0, missedPayments: 0 }
            : entry
    ));
    const nextFlags: Player['flags'] = {
        ...synced.flags,
        acquisitionDebtLedger: nextLedger,
    };
    return {
        ...synced,
        flags: nextFlags,
    };
};

const makeRoyaltyContract = (
    player: Player,
    studio: Business,
    offer: StudioSaleOffer,
    includedStudioIds: string[],
) => {
    if (offer.royaltyPercent <= 0 || offer.royaltyWeeks <= 0 || offer.royaltyEstimate <= 0) return null;
    return {
        id: `studio_sale_royalty_${studio.id}_${player.age}_${player.currentWeek}`,
        sourceStudioId: studio.id,
        sourceStudioName: studio.name,
        soldStudioIds: includedStudioIds,
        buyerName: offer.buyerName,
        royaltyPercent: offer.royaltyPercent,
        weeklyBase: Math.round(offer.royaltyEstimate / Math.max(1, offer.royaltyWeeks)),
        weeksRemaining: offer.royaltyWeeks,
        totalCollected: 0,
        startedWeek: player.currentWeek,
        startedYear: player.age,
    };
};

export const completeStudioSaleTransfer = (
    player: Player,
    studioId: string,
): StudioSaleResult => {
    const studio = getStudioBusiness(player, studioId);
    const deck = studio?.studioState?.saleDeck;
    const acceptedOffer = deck?.offers.find(candidate => candidate.id === deck.acceptedOfferId);
    if (!studio || !deck || !acceptedOffer || deck.status !== 'SIGNING') {
        return { success: false, player, message: 'No accepted sale package is ready for signature.' };
    }

    const revalidationIssue = getStudioSaleRevalidationIssue(player, studio, deck);
    if (revalidationIssue) return { success: false, player, message: revalidationIssue };
    const readiness = getStudioSaleReadiness(player, studio);
    if (!readiness.canClose) return { success: false, player, message: readiness.blockers.find(blocker => !blocker.includes('live sale process')) || 'Closing requirements are not met yet.' };
    const transferTerms = normalizeTransferTermsForStudio(player, studio, deck.transferTerms);
    const includedStudioIds = getTransferredStudioIds(player, studio);
    const includedSet = new Set(includedStudioIds);
    const debtAtClose = getDebtForStudios(player, includedStudioIds);
    const offer = applySellerEntitlement(player, studio, applyOfferEconomics(acceptedOffer, acceptedOffer.amount, acceptedOffer.royaltyPercent, transferTerms, debtAtClose));
    const relatedStockIds = new Set((player.stocks || [])
        .filter(stock => stock.relatedStudioId && includedSet.has(stock.relatedStudioId))
        .map(stock => stock.id));
    const closedDeck: StudioSaleDeck = {
        ...deck,
        status: 'CLOSED',
        transferTerms,
        closedWeek: player.currentWeek,
        closedYear: player.age,
        offers: deck.offers.map(candidate => ({
            ...(candidate.id === offer.id ? offer : candidate),
            status: candidate.id === offer.id ? 'ACCEPTED' : candidate.status === 'REJECTED' ? 'REJECTED' : 'REJECTED',
        })),
    };

    let handoffPlayer = player;
    includedStudioIds.forEach(includedStudioId => {
        handoffPlayer = dematerializeStudioOwnership(
            handoffPlayer,
            includedStudioId,
            currentAbsoluteWeek(player),
        ).player;
    });
    let nextPlayer = closeDebtForStudios(handoffPlayer, includedStudioIds);
    const catalogRetention = moveRetainedCatalogToParent(nextPlayer, studio, includedStudioIds, transferTerms);
    nextPlayer = catalogRetention.player;
    const royaltyContract = makeRoyaltyContract(nextPlayer, studio, offer, includedStudioIds);
    const logType: 'positive' | 'neutral' = offer.amount >= deck.minimumPrice ? 'positive' : 'neutral';
    nextPlayer = {
        ...nextPlayer,
        money: Math.max(0, Math.trunc((nextPlayer.money || 0) + offer.cashAtClose)),
        businesses: (nextPlayer.businesses || []).filter(business => !includedSet.has(business.id)),
        stocks: (nextPlayer.stocks || []).filter(stock => !(stock.relatedStudioId && includedSet.has(stock.relatedStudioId))),
        portfolio: (nextPlayer.portfolio || []).filter(item => !relatedStockIds.has(item.stockId)),
        stockTakeovers: (nextPlayer.stockTakeovers || []).filter(takeover => (
            !(
                (takeover.relatedStudioId && includedSet.has(takeover.relatedStudioId))
                || (takeover.acquiredBusinessId && includedSet.has(takeover.acquiredBusinessId))
            )
        )),
        pendingEvents: (nextPlayer.pendingEvents || []).filter(event => !includedSet.has(String(event.data?.relatedStudioId || event.data?.studioId || ''))),
        finance: {
            ...nextPlayer.finance,
            history: [makeSaleTransaction(nextPlayer, offer.cashAtClose, studio.name), ...(nextPlayer.finance?.history || [])].slice(0, 200),
        },
        news: [makeSaleNews(nextPlayer, studio, offer, transferTerms, catalogRetention.catalogTargetName), ...(nextPlayer.news || [])].slice(0, 80),
        inbox: [makeSaleMessage(nextPlayer, studio, offer, transferTerms, catalogRetention.catalogTargetName), ...(nextPlayer.inbox || [])].slice(0, 120),
        x: {
            ...nextPlayer.x,
            feed: [makeSalePost(nextPlayer, studio, offer, transferTerms, catalogRetention.catalogTargetName), ...(nextPlayer.x?.feed || [])].slice(0, 100),
        },
        logs: [{
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            message: `${studio.name} sold to ${offer.buyerName}. Net cash received: ${formatMoney(offer.cashAtClose)}.${catalogRetention.catalogTargetName ? ` Retained catalog moved to ${catalogRetention.catalogTargetName}.` : ''}`,
            type: logType,
        }, ...(nextPlayer.logs || [])].slice(0, 120),
        flags: {
            ...nextPlayer.flags,
            studioSaleHistory: [{
                deck: closedDeck,
                soldStudioIds: includedStudioIds,
                buyerName: offer.buyerName,
                amount: offer.amount,
                cashAtClose: offer.cashAtClose,
                royaltyPercent: offer.royaltyPercent,
                royaltyWeeks: offer.royaltyWeeks,
                nameRights: transferTerms.nameRights,
                catalogRights: transferTerms.catalogRights,
                retainedCatalogTargetName: catalogRetention.catalogTargetName,
                week: nextPlayer.currentWeek,
                year: nextPlayer.age,
            }, ...((nextPlayer.flags?.studioSaleHistory || []) as any[])].slice(0, 40),
            studioSaleRoyalties: [
                ...(royaltyContract ? [royaltyContract] : []),
                ...((nextPlayer.flags?.studioSaleRoyalties || []) as any[]),
            ].slice(0, 40),
            soldStudioIds: {
                ...(nextPlayer.flags?.soldStudioIds || {}),
                ...includedStudioIds.reduce<Record<string, any>>((map, id) => {
                    map[id] = {
                        buyerName: offer.buyerName,
                        week: nextPlayer.currentWeek,
                        year: nextPlayer.age,
                        amount: offer.amount,
                    };
                    return map;
                }, {}),
            },
        },
    };

    return {
        success: true,
        player: nextPlayer,
        deck: closedDeck,
        payout: offer.cashAtClose,
        message: `${studio.name} transferred to ${offer.buyerName}.`,
    };
};

export const processStudioSaleRoyalties = (player: Player): Player => {
    const contracts = Array.isArray(player.flags?.studioSaleRoyalties)
        ? (player.flags.studioSaleRoyalties as any[])
        : [];
    if (!contracts.length) return player;
    const weekKey = getWeekKey(player);
    if (player.flags?.studioSaleRoyaltiesLastProcessedWeekKey === weekKey) return player;

    let totalPayout = 0;
    const updatedContracts = contracts.map(contract => {
        const weeksRemaining = Math.max(0, Math.round(Number(contract.weeksRemaining || 0)));
        const weeklyBase = Math.max(0, Math.round(Number(contract.weeklyBase || 0)));
        if (weeksRemaining <= 0 || weeklyBase <= 0) return { ...contract, weeksRemaining: 0 };
        const rng = makeRng(`${contract.id}:${weekKey}`);
        const payout = Math.round(weeklyBase * (0.85 + (rng() * 0.3)));
        totalPayout += payout;
        return {
            ...contract,
            weeksRemaining: weeksRemaining - 1,
            totalCollected: Math.round(Number(contract.totalCollected || 0) + payout),
            lastCollectedWeek: player.currentWeek,
            lastCollectedYear: player.age,
        };
    });

    const activeContracts = updatedContracts.filter(contract => Math.max(0, Number(contract.weeksRemaining || 0)) > 0);
    if (totalPayout <= 0) {
        return {
            ...player,
            flags: {
                ...player.flags,
                studioSaleRoyalties: activeContracts,
                studioSaleRoyaltiesLastProcessedWeekKey: weekKey,
            },
        };
    }

    const shouldLog = player.currentWeek % 4 === 0 || activeContracts.length < updatedContracts.length;
    return {
        ...player,
        money: Math.max(0, Math.trunc((player.money || 0) + totalPayout)),
        finance: {
            ...player.finance,
            history: [makeRoyaltyTransaction(player, totalPayout), ...(player.finance?.history || [])].slice(0, 200),
        },
        logs: shouldLog
            ? [{
                week: player.currentWeek,
                year: player.age,
                message: `Studio sale royalty collection posted: ${formatMoney(totalPayout)}.`,
                type: 'positive' as const,
            }, ...(player.logs || [])].slice(0, 120)
            : player.logs,
        flags: {
            ...player.flags,
            studioSaleRoyalties: activeContracts,
            studioSaleRoyaltiesLastProcessedWeekKey: weekKey,
        },
    };
};

export const formatStudioSaleBuyerType = (type: StudioSaleBuyerType) => {
    switch (type) {
        case 'RIVAL_STUDIO': return 'Rival studio';
        case 'FAMOUS_PERSON': return 'Famous buyer';
        case 'PRIVATE_EQUITY': return 'Private equity';
        case 'STREAMING_PLATFORM': return 'Streamer';
        case 'NPC_PRODUCER': return 'Producer group';
        default: return 'Buyer';
    }
};

export const formatStudioSaleNameRights = (value: StudioSaleTransferTerms['nameRights']) => {
    switch (value) {
        case 'BUYER_KEEPS_NAME': return 'Buyer gets the studio name';
        case 'BUYER_REBRANDS': return 'Buyer may rebrand';
        case 'SELLER_RETAINS_NAME': return 'Seller keeps the name';
        default: return 'Name rights';
    }
};

export const formatStudioSaleCatalogRights = (value: StudioSaleTransferTerms['catalogRights']) => {
    switch (value) {
        case 'FULL_LIBRARY': return 'Full library transfer';
        case 'FUTURE_SLATE_ONLY': return 'Future slate only';
        case 'SELLER_RETAINS_BACK_CATALOG': return 'Seller keeps back catalog';
        default: return 'Catalog rights';
    }
};
