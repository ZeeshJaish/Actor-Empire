import type {
    Player, WorldAudienceCohortState, WorldAudienceParticipationCohortState,
    WorldStreamingAudienceChoiceAllocation, WorldStreamingAudienceChoiceCountrySummary,
    WorldStreamingAudienceChoicePlatformSummary, WorldStreamingAudienceChoiceState,
    WorldStreamingAudienceEntitlement, WorldStreamingPlatformOffer, StreamingBillingPath,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { normalizeStreamingPricingConfiguration } from '../streamingPricingEconomy';
import { evaluatePlayerStreamingTitleRoute } from '../streamingContentAvailability';
import { evaluateStreamingStoreBuyer } from '../streamingTitleAccess';
import { normalizeWorldPopulationState } from './worldPopulation';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { allocateWorldStreamingCohort } from './worldStreamingCompetition';
import { getWorldStreamingOffers, getWorldStreamingOfferExposure } from './worldStreamingOffers';

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
const integer = (value: number): number => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
const round2 = (value: number): number => Math.round(value * 100) / 100;

const distribute = (total: number, weights: number[]): number[] => {
    if (!weights.length) return [];
    const safe = weights.map(weight => Math.max(0, weight));
    const sum = safe.reduce((value, weight) => value + weight, 0);
    if (!sum || !total) return weights.map(() => 0);
    const exact = safe.map(weight => total * weight / sum);
    const result = exact.map(Math.floor);
    let remainder = total - result.reduce((value, count) => value + count, 0);
    exact.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
        .forEach(row => { if (remainder > 0) { result[row.index] += 1; remainder -= 1; } });
    return result;
};

export interface StreamingAudienceCohortChoice {
    reachableHouseholds: number;
    primarySubscriptions: number;
    monthlySubscriptions: number;
    annualSubscriptions: number;
    secondarySubscriptions: number;
    freeAdHouseholds: number;
    storeHouseholds: number;
    outsideHouseholds: number;
    paidMonthlyBudget: number;
    paidMonthlySpend: number;
    allocations: WorldStreamingAudienceChoiceAllocation[];
}

/** Shared player/AI choice kernel. Nothing returned here is a sale or a viewer account. */
export const allocateStreamingAudienceChoice = (
    countryId: string,
    cohort: WorldAudienceCohortState,
    participation: WorldAudienceParticipationCohortState,
    offers: WorldStreamingPlatformOffer[],
): StreamingAudienceCohortChoice => {
    const countryOffers = offers.filter(offer => offer.activeCountryIds.includes(countryId))
        .slice().sort((a, b) => a.platformId.localeCompare(b.platformId));
    const reachable = integer(participation.streamingOnlyHouseholds + participation.dualParticipantHouseholds);
    const paidOffers = countryOffers.map(offer => ({
        ...offer,
        plans: offer.plans.filter(plan => plan.monthlyPrice > 0 && plan.monthlyBillingPrice > 0 && plan.annualBillingMonthlyPrice > 0),
    })).filter(offer => offer.plans.length > 0 && offer.commercialConfiguration.streams.includes('subs'));
    const paid = allocateWorldStreamingCohort(countryId, cohort, participation, paidOffers);
    const pathRows: Array<{ billingPath: StreamingBillingPath; reachableHouseholds: number; primarySubscriptions: number;
        monthlySpend: number; allocations: WorldStreamingAudienceChoiceAllocation[] }> = [];
    const nonpaidAllocations: WorldStreamingAudienceChoiceAllocation[] = [];
    let freeAdHouseholds = 0;
    let storeHouseholds = 0;
    let outsideHouseholds = 0;
    paid.paths.forEach(path => {
        const budgetPerHome = path.reachableHouseholds > 0 ? path.totalBudget / path.reachableHouseholds : 0;
        const alternatives = countryOffers.flatMap(offer => {
            const projected = projectStreamingCommercialOffers(offer.commercialConfiguration);
            const exposure = getWorldStreamingOfferExposure(offer);
            const countryCatalogue = offer.catalogueStrengthByCountry?.[countryId] ?? offer.catalogueStrengthIndex;
            const quality = clamp((countryCatalogue * .28 + offer.localizationStrengthIndex * .16
                + offer.reliabilityIndex * .17 + offer.reputationIndex * .16 + offer.marketingIndex * .11
                + offer.loyaltyIndex * .12) / 100, .05, 1);
            const free = projected.freeAdOffer ? [{ offer, kind: 'FREE_AD' as const, exposure,
                weight: quality * (1 + cohort.priceSensitivityIndex / 120)
                    * clamp(1 - projected.freeAdOffer.adMinutesPerHour / 35, .3, 1) * exposure }] : [];
            const store = projected.storeOffer && projected.storeOffer.eligibility.kind === 'PUBLIC'
                && projected.storeOffer.rent <= budgetPerHome
                ? [{ offer, kind: 'STORE' as const, exposure, weight: quality * .72
                    * clamp(1 - projected.storeOffer.rent / Math.max(1, budgetPerHome) * .45, .2, 1) * exposure }]
                : [];
            return [...free, ...store];
        });
        const freeWeight = alternatives.filter(row => row.kind === 'FREE_AD').reduce((sum, row) => sum + row.weight, 0);
        const diversion = freeWeight > 0
            ? clamp((cohort.priceSensitivityIndex - 45) / 290 + freeWeight / (freeWeight + 5) * .18, 0, .36)
            : 0;
        const primarySubscriptions = Math.min(path.reachableHouseholds,
            Math.round(path.subscribingHouseholds * (1 - diversion)));
        const primaryCounts = distribute(primarySubscriptions, path.allocations.map(row => row.primaryHouseholds));
        const subscriptionAllocations = path.allocations.map((row, index) => {
            const primary = primaryCounts[index];
            const accounts = Math.max(primary, Math.floor(row.households * (1 - diversion)));
            return { platformId: row.offer.platformId, kind: 'SUBSCRIPTION' as const, planId: row.plan.id,
                billingPath: path.billingPath, households: accounts, primaryHouseholds: primary,
                monthlySpend: round2(accounts * row.billingPrice) };
        }).filter(row => row.households > 0);
        const remainder = path.reachableHouseholds - primarySubscriptions;
        const interest = clamp(.16 + participation.streamingInterestIndex / 155
            + cohort.entertainmentAppetiteIndex / 420, .08, .84);
        const exposureAvailability = alternatives.length
            ? clamp(alternatives.reduce((sum, row) => sum + row.weight, 0)
                / Math.max(.001, alternatives.reduce((sum, row) => sum + row.weight / row.exposure, 0)), 0, 1)
            : 0;
        const active = Math.min(remainder, Math.round(remainder * interest * exposureAvailability));
        const chosen = distribute(active, alternatives.map(row => row.weight));
        alternatives.forEach((row, index) => {
            const households = chosen[index];
            if (!households) return;
            nonpaidAllocations.push({ platformId: row.offer.platformId, kind: row.kind,
                planId: null, billingPath: null, households, primaryHouseholds: households, monthlySpend: 0 });
            if (row.kind === 'FREE_AD') freeAdHouseholds += households;
            else storeHouseholds += households;
        });
        outsideHouseholds += remainder - active;
        pathRows.push({ billingPath: path.billingPath, reachableHouseholds: path.reachableHouseholds,
            primarySubscriptions, monthlySpend: round2(subscriptionAllocations.reduce((sum, row) => sum + row.monthlySpend, 0)),
            allocations: subscriptionAllocations });
    });
    const subscriptionAllocations = pathRows.flatMap(row => row.allocations);
    const primarySubscriptions = pathRows.reduce((sum, row) => sum + row.primarySubscriptions, 0);
    const secondarySubscriptions = subscriptionAllocations.reduce((sum, row) => sum + row.households - row.primaryHouseholds, 0);
    return { reachableHouseholds: reachable, primarySubscriptions,
        monthlySubscriptions: pathRows.find(row => row.billingPath === 'MONTHLY')?.primarySubscriptions || 0,
        annualSubscriptions: pathRows.find(row => row.billingPath === 'ANNUAL')?.primarySubscriptions || 0,
        secondarySubscriptions, freeAdHouseholds, storeHouseholds, outsideHouseholds,
        paidMonthlyBudget: round2(paid.totalBudget),
        paidMonthlySpend: round2(pathRows.reduce((sum, row) => sum + row.monthlySpend, 0)),
        allocations: [...subscriptionAllocations, ...nonpaidAllocations],
    };
};

const countryZero = (countryId: string): WorldStreamingAudienceChoiceCountrySummary => ({
    countryId, reachableHouseholds: 0, primarySubscriptions: 0, monthlySubscriptions: 0,
    annualSubscriptions: 0, secondarySubscriptions: 0, freeAdHouseholds: 0,
    storeHouseholds: 0, outsideHouseholds: 0, paidMonthlyBudget: 0, paidMonthlySpend: 0,
    playerSubscriptions: 0, playerFreeAdHouseholds: 0, playerStoreHouseholds: 0,
});
const platformZero = (platformId: string): WorldStreamingAudienceChoicePlatformSummary => ({
    platformId, primarySubscriptions: 0, secondarySubscriptions: 0, freeAdHouseholds: 0,
    storeHouseholds: 0, passOpportunities: 0, rentalOpportunities: 0, purchaseOpportunities: 0,
});
const add = (value: number, count: number): number => value + count;

const validEntitlements = (value: unknown, week: number): WorldStreamingAudienceEntitlement[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const valid = value.filter((row): row is WorldStreamingAudienceEntitlement => {
        if (!row || typeof row !== 'object' || typeof row.transactionId !== 'string'
            || !row.transactionId || seen.has(row.transactionId)
            || row.platformId !== 'PLAYER' || typeof row.countryId !== 'string' || !row.countryId
            || typeof row.titleId !== 'string' || !row.titleId
            || !['RENTAL', 'PURCHASE'].includes(row.kind)
            || !Number.isSafeInteger(row.households) || row.households <= 0
            || !Number.isSafeInteger(row.purchasedAtAbsoluteWeek) || row.purchasedAtAbsoluteWeek > week
            || (row.kind === 'RENTAL' && (!Number.isSafeInteger(row.expiresAtAbsoluteWeek)
                || Number(row.expiresAtAbsoluteWeek) <= week))
            || (row.kind === 'PURCHASE' && row.expiresAtAbsoluteWeek !== null)) return false;
        seen.add(row.transactionId);
        return true;
    });
    const positions = new Map<string, WorldStreamingAudienceEntitlement>();
    valid.forEach(row => {
        const key = row.kind === 'PURCHASE'
            ? `PURCHASE:${row.countryId}:${row.titleId}` : `RENTAL:${row.transactionId}`;
        const previous = positions.get(key);
        if (!previous) { positions.set(key, row); return; }
        const households = previous.households + row.households;
        if (!Number.isSafeInteger(households)) return;
        positions.set(key, { ...previous, households,
            purchasedAtAbsoluteWeek: Math.min(previous.purchasedAtAbsoluteWeek, row.purchasedAtAbsoluteWeek) });
    });
    return [...positions.values()];
};

const sourceFingerprintFor = (player: Player, absoluteWeek: number): string => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
    const prepared: Player = { ...player, world: { ...player.world, worldPopulation: population,
        worldAudienceEconomy: audience, worldAudienceParticipation: participation } };
    const offers = getWorldStreamingOffers(prepared, absoluteWeek);
    return createDeterministicId('streaming-audience-choice', absoluteWeek, offers.fingerprint,
        participation.lastProcessedAbsoluteWeek, participation.global.streamingReachableHouseholds);
};

const validCurrentState = (input: WorldStreamingAudienceChoiceState, absoluteWeek: number): boolean => {
    if (input.schemaVersion !== 1 || input.lastProcessedAbsoluteWeek !== absoluteWeek
        || input.global?.settledRevenue !== 0 || !input.countries || !input.platforms
        || !Array.isArray(input.entitlements)) return false;
    const countryRows = Object.values(input.countries);
    const numericKeys = ['reachableHouseholds', 'primarySubscriptions', 'monthlySubscriptions',
        'annualSubscriptions', 'secondarySubscriptions', 'freeAdHouseholds', 'storeHouseholds',
        'outsideHouseholds', 'paidMonthlyBudget', 'paidMonthlySpend'] as const;
    if (!countryRows.every(row => numericKeys.every(key => Number.isFinite(row[key]) && row[key] >= 0)
        && row.reachableHouseholds === row.primarySubscriptions + row.freeAdHouseholds
            + row.storeHouseholds + row.outsideHouseholds
        && row.primarySubscriptions === row.monthlySubscriptions + row.annualSubscriptions
        && row.paidMonthlySpend <= row.paidMonthlyBudget + .01)) return false;
    if (input.global.countryCount !== countryRows.length
        || !numericKeys.every(key => Number.isFinite(input.global[key]) && input.global[key] >= 0
            && Math.abs(input.global[key] - countryRows.reduce((sum, row) => sum + row[key], 0)) < .1)) return false;
    if (!Object.values(input.platforms).every(row => Object.values(row).every(value => (
        typeof value !== 'number' || (Number.isFinite(value) && value >= 0)
    )))) return false;
    const platformRows = Object.values(input.platforms);
    if (platformRows.reduce((sum, row) => sum + row.primarySubscriptions, 0) !== input.global.primarySubscriptions
        || platformRows.reduce((sum, row) => sum + row.secondarySubscriptions, 0) !== input.global.secondarySubscriptions
        || platformRows.reduce((sum, row) => sum + row.freeAdHouseholds, 0) !== input.global.freeAdHouseholds
        || platformRows.reduce((sum, row) => sum + row.storeHouseholds, 0) !== input.global.storeHouseholds) return false;
    return validEntitlements(input.entitlements, absoluteWeek).length === input.entitlements.length;
};

export const createWorldStreamingAudienceChoiceState = (
    player: Player, absoluteWeek: number, prior?: WorldStreamingAudienceChoiceState,
): WorldStreamingAudienceChoiceState => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
    const prepared: Player = { ...player, world: { ...player.world, worldPopulation: population,
        worldAudienceEconomy: audience, worldAudienceParticipation: participation } };
    const offers = getWorldStreamingOffers(prepared, absoluteWeek);
    const offerMap = new Map(offers.offers.map(offer => [offer.platformId, offer]));
    const countries: Record<string, WorldStreamingAudienceChoiceCountrySummary> = {};
    const platforms: Record<string, WorldStreamingAudienceChoicePlatformSummary> = {};
    const adExposedSubscriptions = new Map<string, number>();
    const eligibleStoreMemberships = new Map<string, number>();
    for (const countryId of Object.keys(audience.countries).sort()) {
        const summary = countryZero(countryId);
        const countryOffers = (offers.byCountry[countryId] || []).map(id => offerMap.get(id))
            .filter((offer): offer is WorldStreamingPlatformOffer => Boolean(offer));
        for (const cohort of audience.countries[countryId].cohorts) {
            const participationCohort = participation.countries[countryId]?.cohorts.find(row => row.cohortId === cohort.id);
            if (!participationCohort) continue;
            const choice = allocateStreamingAudienceChoice(countryId, cohort, participationCohort, countryOffers);
            for (const key of ['reachableHouseholds', 'primarySubscriptions', 'monthlySubscriptions', 'annualSubscriptions',
                'secondarySubscriptions', 'freeAdHouseholds', 'storeHouseholds', 'outsideHouseholds',
                'paidMonthlyBudget', 'paidMonthlySpend'] as const) summary[key] = add(summary[key], choice[key]);
            choice.allocations.forEach(row => {
                const platform = platforms[row.platformId] ||= platformZero(row.platformId);
                if (row.kind === 'SUBSCRIPTION') {
                    platform.primarySubscriptions += row.primaryHouseholds;
                    platform.secondarySubscriptions += row.households - row.primaryHouseholds;
                    if (offerMap.get(row.platformId)?.plans.some(plan => plan.id === row.planId && plan.ads)) {
                        adExposedSubscriptions.set(row.platformId,
                            (adExposedSubscriptions.get(row.platformId) || 0) + row.primaryHouseholds);
                    }
                    if (row.platformId === 'PLAYER') summary.playerSubscriptions += row.primaryHouseholds;
                    const storeOffer = offerMap.get(row.platformId)
                        ? projectStreamingCommercialOffers(offerMap.get(row.platformId)!.commercialConfiguration).storeOffer : null;
                    if (evaluateStreamingStoreBuyer(storeOffer,
                        { planId: row.planId, membershipActive: true }).allowed) {
                        eligibleStoreMemberships.set(row.platformId,
                            (eligibleStoreMemberships.get(row.platformId) || 0) + row.primaryHouseholds);
                    }
                } else if (row.kind === 'FREE_AD') {
                    platform.freeAdHouseholds += row.households;
                    if (row.platformId === 'PLAYER') summary.playerFreeAdHouseholds += row.households;
                } else {
                    platform.storeHouseholds += row.households;
                    if (row.platformId === 'PLAYER') summary.playerStoreHouseholds += row.households;
                }
            });
        }
        countries[countryId] = summary;
    }
    for (const offer of offers.offers) {
        const summary = platforms[offer.platformId];
        if (!summary) continue;
        const projected = projectStreamingCommercialOffers(offer.commercialConfiguration);
        const accessHomes = summary.primarySubscriptions + summary.freeAdHouseholds + summary.storeHouseholds;
        const storeHomes = !projected.storeOffer ? 0
            : projected.storeOffer.eligibility.kind === 'PUBLIC' ? accessHomes
                : eligibleStoreMemberships.get(offer.platformId) || 0;
        const adExposedHomes = summary.freeAdHouseholds + (adExposedSubscriptions.get(offer.platformId) || 0);
        summary.passOpportunities = projected.adFreePasses.oneHourPrice || projected.adFreePasses.dayPrice
            ? Math.min(adExposedHomes, Math.round(adExposedHomes * .06)) : 0;
        summary.rentalOpportunities = storeHomes ? Math.round(storeHomes * .035) : 0;
        summary.purchaseOpportunities = storeHomes ? Math.round(storeHomes * .008) : 0;
    }
    const totals = Object.values(countries);
    const global = {
        reachableHouseholds: totals.reduce((sum, row) => sum + row.reachableHouseholds, 0),
        primarySubscriptions: totals.reduce((sum, row) => sum + row.primarySubscriptions, 0),
        monthlySubscriptions: totals.reduce((sum, row) => sum + row.monthlySubscriptions, 0),
        annualSubscriptions: totals.reduce((sum, row) => sum + row.annualSubscriptions, 0),
        secondarySubscriptions: totals.reduce((sum, row) => sum + row.secondarySubscriptions, 0),
        freeAdHouseholds: totals.reduce((sum, row) => sum + row.freeAdHouseholds, 0),
        storeHouseholds: totals.reduce((sum, row) => sum + row.storeHouseholds, 0),
        outsideHouseholds: totals.reduce((sum, row) => sum + row.outsideHouseholds, 0),
        paidMonthlyBudget: round2(totals.reduce((sum, row) => sum + row.paidMonthlyBudget, 0)),
        paidMonthlySpend: round2(totals.reduce((sum, row) => sum + row.paidMonthlySpend, 0)),
        settledRevenue: 0 as const,
        countryCount: totals.length,
    };
    return { schemaVersion: 1, initializedAtAbsoluteWeek: prior?.initializedAtAbsoluteWeek ?? absoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('streaming-audience-choice', absoluteWeek, offers.fingerprint,
            participation.lastProcessedAbsoluteWeek, participation.global.streamingReachableHouseholds),
        countries, platforms, global,
        entitlements: validEntitlements(prior?.entitlements, absoluteWeek),
        settledViewingFingerprint: prior?.settledViewingFingerprint,
    };
};

export const normalizeWorldStreamingAudienceChoiceState = (
    input: WorldStreamingAudienceChoiceState | undefined, player: Player, absoluteWeek: number,
): WorldStreamingAudienceChoiceState => {
    if (input && validCurrentState(input, absoluteWeek)
        && input.sourceFingerprint === sourceFingerprintFor(player, absoluteWeek)) return input;
    return createWorldStreamingAudienceChoiceState(player, absoluteWeek, input);
};

/** Explicit C4 transaction hook: never infer a purchase from opportunity counts alone. */
export const recordPlayerStreamingAudienceEntitlement = (
    state: WorldStreamingAudienceChoiceState,
    player: Player,
    transaction: Omit<WorldStreamingAudienceEntitlement, 'platformId' | 'expiresAtAbsoluteWeek'> & {
        buyerPlanId?: string | null;
    },
): WorldStreamingAudienceChoiceState => {
    if (state.entitlements.some(row => row.transactionId === transaction.transactionId)) return state;
    if (!transaction.transactionId || !transaction.titleId || !transaction.countryId
        || !['RENTAL', 'PURCHASE'].includes(transaction.kind)
        || !Number.isSafeInteger(transaction.households) || transaction.households <= 0
        || transaction.purchasedAtAbsoluteWeek !== state.lastProcessedAbsoluteWeek) {
        throw new Error('Invalid streaming entitlement transaction');
    }
    const route = evaluatePlayerStreamingTitleRoute(player, transaction.titleId, transaction.countryId,
        transaction.purchasedAtAbsoluteWeek, { kind: transaction.kind });
    if (!route.allowed) throw new Error(`Streaming title access denied: ${route.reasonCode}`);
    const storeOffer = projectStreamingCommercialOffers(
        player.ownedStreamingPlatform.serviceConfiguration.pricing).storeOffer;
    const country = state.countries[transaction.countryId];
    const accessible = (country?.playerSubscriptions || 0) + (country?.playerFreeAdHouseholds || 0)
        + (country?.playerStoreHouseholds || 0);
    if (storeOffer?.eligibility.kind === 'MEMBERSHIP_PLANS') {
        const customers = player.world.worldStreamingCustomers;
        const customer = customers?.lastProcessedAbsoluteWeek === transaction.purchasedAtAbsoluteWeek
            ? customers.countries[transaction.countryId]
                ?.platformSummaries.find(row => row.platformId === 'PLAYER') : undefined;
        const activePlanAccounts = customer?.planAllocations.find(row => row.planId === transaction.buyerPlanId)?.paidAccounts || 0;
        if (!evaluateStreamingStoreBuyer(storeOffer, { planId: transaction.buyerPlanId || null,
            membershipActive: activePlanAccounts > 0 }).allowed || transaction.households > activePlanAccounts) {
            throw new Error('Streaming store buyer membership denied');
        }
    }
    if (transaction.households > accessible) throw new Error('Streaming transaction exceeds reachable households');
    const existingIndex = state.entitlements.findIndex(row => row.kind === transaction.kind
        && row.countryId === transaction.countryId && row.titleId === transaction.titleId
        && (transaction.kind === 'PURCHASE' || row.purchasedAtAbsoluteWeek === transaction.purchasedAtAbsoluteWeek));
    if (existingIndex >= 0 && state.entitlements[existingIndex].households + transaction.households > accessible) {
        throw new Error('Streaming transaction exceeds remaining reachable households');
    }
    const windowWeeks = normalizeStreamingPricingConfiguration(
        player.ownedStreamingPlatform.serviceConfiguration.pricing,
    ).rentals.windowWeeks;
    const { buyerPlanId: _buyerPlanId, ...sale } = transaction;
    const entitlement: WorldStreamingAudienceEntitlement = {
        ...sale, platformId: 'PLAYER',
        expiresAtAbsoluteWeek: transaction.kind === 'RENTAL'
            ? transaction.purchasedAtAbsoluteWeek + windowWeeks : null,
    };
    if (existingIndex < 0) return { ...state, entitlements: [...state.entitlements, entitlement] };
    const entitlements = [...state.entitlements];
    entitlements[existingIndex] = { ...entitlements[existingIndex],
        households: entitlements[existingIndex].households + entitlement.households };
    return { ...state, entitlements };
};

/** Commit only WE6 transactions that already reconciled to a licensed title-country revenue row. */
export const settleWorldStreamingAudienceEntitlements = (player: Player, absoluteWeek: number): Player => {
    const viewing = player.world.worldStreamingViewing;
    const choice = player.world.worldStreamingAudienceChoice;
    if (!viewing || !choice || viewing.lastProcessedAbsoluteWeek !== absoluteWeek
        || choice.lastProcessedAbsoluteWeek !== absoluteWeek) return player;
    const transactions = viewing.commercialTransactions || [];
    if (choice.settledViewingFingerprint === viewing.sourceFingerprint) return player;
    const playerRevenue = viewing.platforms.PLAYER?.revenue;
    const rentalCount = transactions.filter(row => row.kind === 'RENTAL')
        .reduce((sum, row) => sum + row.households, 0);
    const purchaseCount = transactions.filter(row => row.kind === 'PURCHASE')
        .reduce((sum, row) => sum + row.households, 0);
    if (rentalCount !== (playerRevenue?.rentalTransactions || 0)
        || purchaseCount !== (playerRevenue?.purchaseTransactions || 0)) {
        throw new Error('Streaming store transactions do not reconcile to platform viewing revenue');
    }
    let nextChoice = choice;
    const transactionTotals = new Map<string, number>();
    transactions.forEach(row => {
        const key = JSON.stringify([row.countryId, row.titleId, row.kind]);
        transactionTotals.set(key, (transactionTotals.get(key) || 0) + row.households);
    });
    for (const transaction of transactions) {
        const title = viewing.countries[transaction.countryId]?.titlePerformance
            .find(row => row.projectId === transaction.titleId);
        const expected = transaction.kind === 'RENTAL'
            ? title?.revenue.rentalTransactions : title?.revenue.purchaseTransactions;
        if (!title || expected !== transactionTotals.get(JSON.stringify([
            transaction.countryId, transaction.titleId, transaction.kind,
        ]))) {
            throw new Error('Streaming store transaction does not reconcile to licensed country title');
        }
        nextChoice = recordPlayerStreamingAudienceEntitlement(nextChoice, player, transaction);
    }
    return { ...player, world: { ...player.world,
        worldStreamingAudienceChoice: { ...nextChoice, settledViewingFingerprint: viewing.sourceFingerprint } } };
};
