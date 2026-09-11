import type {
    Player,
    WorldStreamingCustomerAccessPolicy,
    WorldStreamingCustomerCohortState,
    WorldStreamingCustomerCountryState,
    WorldStreamingCustomerGlobalSummary,
    WorldStreamingCustomerMovement,
    WorldStreamingCustomerPlanCell,
    WorldStreamingCustomerPlanSummary,
    WorldStreamingCustomerPlatformSummary,
    WorldStreamingCustomerSnapshot,
    WorldStreamingCustomerState,
    WorldStreamingPlatformOffer,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { normalizeWorldPopulationState } from './worldPopulation';
import {
    allocateWorldStreamingCohort,
    normalizeWorldStreamingCompetitionState,
} from './worldStreamingCompetition';
import { getWorldStreamingOffers } from './worldStreamingOffers';

export const WORLD_STREAMING_CUSTOMER_SCHEMA_VERSION = 1 as const;
const MAX_SNAPSHOTS = 52;
const MAX_RECENT_MOVEMENTS = 624;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round2 = (value: number): number => Math.round(value * 100) / 100;

const distributeInteger = (total: number, weights: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length || !safeTotal) return weights.map(() => 0);
    const safeWeights = weights.map(value => Math.max(0, Number(value) || 0));
    const weightTotal = safeWeights.reduce((sum, value) => sum + value, 0);
    if (weightTotal <= 0) {
        const base = Math.floor(safeTotal / weights.length);
        return weights.map((_, index) => base + (index < safeTotal - base * weights.length ? 1 : 0));
    }
    const exact = safeWeights.map((weight, index) => ({ index, value: safeTotal * weight / weightTotal }));
    const result = exact.map(item => Math.floor(item.value));
    let remaining = safeTotal - result.reduce((sum, value) => sum + value, 0);
    exact
        .slice()
        .sort((left, right) => (right.value - Math.floor(right.value)) - (left.value - Math.floor(left.value)) || left.index - right.index)
        .forEach(item => {
            if (remaining <= 0) return;
            result[item.index] += 1;
            remaining -= 1;
        });
    return result;
};

const defaultPolicy = (absoluteWeek: number): WorldStreamingCustomerAccessPolicy => ({
    sharingPosture: 'BALANCED',
    enforcementInvestment: 'STANDARD',
    source: 'LEADERSHIP_DEFAULT',
    updatedAtAbsoluteWeek: absoluteWeek,
});

const resolvePolicy = (player: Player, absoluteWeek: number): WorldStreamingCustomerAccessPolicy => {
    const saved = player.ownedStreamingPlatform.audienceAccessPolicy;
    if (saved) return saved;
    const activeCeo = player.ownedStreamingPlatform.leadership.appointments.find(appointment => (
        appointment.status === 'ACTIVE'
        && appointment.executiveId === player.ownedStreamingPlatform.leadership.currentCeo.executiveId
    ));
    if (!activeCeo) return defaultPolicy(absoluteWeek);
    if (activeCeo.preferredStrategy === 'GROWTH_FIRST' || activeCeo.preferredStrategy === 'GLOBAL_FIRST') {
        return { sharingPosture: 'REACH_FIRST', enforcementInvestment: 'LIGHT', source: 'LEADERSHIP_DEFAULT', updatedAtAbsoluteWeek: absoluteWeek };
    }
    if (activeCeo.preferredStrategy === 'MARGIN_FIRST') {
        return { sharingPosture: 'HOUSEHOLD_ONLY', enforcementInvestment: 'STANDARD', source: 'LEADERSHIP_DEFAULT', updatedAtAbsoluteWeek: absoluteWeek };
    }
    if (activeCeo.preferredStrategy === 'TECHNOLOGY_FIRST' || activeCeo.preferredStrategy === 'TRUST_FIRST') {
        return { sharingPosture: 'BALANCED', enforcementInvestment: 'AGGRESSIVE', source: 'LEADERSHIP_DEFAULT', updatedAtAbsoluteWeek: absoluteWeek };
    }
    return defaultPolicy(absoluteWeek);
};

const preparePlayer = (player: Player, absoluteWeek: number): Player => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
    const prepared = {
        ...player,
        world: {
            ...player.world,
            worldPopulation: population,
            worldAudienceEconomy: audience,
            worldAudienceParticipation: participation,
        },
    };
    const competition = normalizeWorldStreamingCompetitionState(player.world.worldStreamingCompetition, prepared, absoluteWeek);
    return { ...prepared, world: { ...prepared.world, worldStreamingCompetition: competition } };
};

interface DesiredCohort {
    countryId: string;
    cohortId: string;
    reachableHouseholds: number;
    targetSubscribingHouseholds: number;
    targetSubscriptions: number;
    cells: WorldStreamingCustomerPlanCell[];
}

const createDesiredCohorts = (
    player: Player,
    offers: ReturnType<typeof getWorldStreamingOffers>,
): DesiredCohort[] => {
    const offerMap = new Map(offers.offers.map(offer => [offer.platformId, offer]));
    return Object.keys(player.world.worldAudienceEconomy!.countries).sort().flatMap(countryId => {
        const audience = player.world.worldAudienceEconomy!.countries[countryId];
        const participation = player.world.worldAudienceParticipation!.countries[countryId];
        const countryOffers = (offers.byCountry[countryId] || [])
            .map(platformId => offerMap.get(platformId))
            .filter((offer): offer is WorldStreamingPlatformOffer => Boolean(offer));
        return audience.cohorts.map(cohort => {
            const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
            if (!overlay) return {
                countryId,
                cohortId: cohort.id,
                reachableHouseholds: 0,
                targetSubscribingHouseholds: 0,
                targetSubscriptions: 0,
                cells: [],
            };
            const allocation = allocateWorldStreamingCohort(countryId, cohort, overlay, countryOffers);
            return {
                countryId,
                cohortId: cohort.id,
                reachableHouseholds: allocation.reachableHouseholds,
                targetSubscribingHouseholds: allocation.subscribingHouseholds,
                targetSubscriptions: allocation.totalSubscriptions,
                cells: allocation.allocations.map(row => ({
                    platformId: row.offer.platformId,
                    platformName: row.offer.name,
                    planId: row.plan.id,
                    planName: row.plan.name,
                    paidAccounts: row.households,
                    primaryHouseholds: row.primaryHouseholds,
                    effectiveMonthlyPrice: row.plan.effectiveMonthlyPrice,
                    monthlySubscriptionRevenue: round2(row.households * row.plan.effectiveMonthlyPrice),
                    tenureNewAccounts: 0,
                    tenureEstablishedAccounts: Math.round(row.households * .64),
                    tenureLoyalAccounts: row.households - Math.round(row.households * .64),
                    externalSharedHouseholds: 0,
                    sharedActiveViewers: 0,
                    piracyReach: 0,
                    accessLoadAccounts: row.households,
                })),
            };
        });
    });
};

const scalePlayerSeed = (cohorts: DesiredCohort[], playerSubscribers: number): void => {
    const playerCells = cohorts.flatMap(cohort => cohort.cells
        .filter(cell => cell.platformId === 'PLAYER')
        .map(cell => ({ cohort, cell })));
    if (!playerCells.length) return;
    const counts = distributeInteger(playerSubscribers, playerCells.map(row => row.cell.paidAccounts));
    playerCells.forEach((row, index) => {
        const original = Math.max(1, row.cell.paidAccounts);
        const next = counts[index];
        const primaryRatio = row.cell.primaryHouseholds / original;
        row.cell.paidAccounts = next;
        row.cell.primaryHouseholds = Math.min(next, Math.round(next * primaryRatio));
        row.cell.monthlySubscriptionRevenue = round2(next * row.cell.effectiveMonthlyPrice);
        row.cell.tenureEstablishedAccounts = Math.round(next * .64);
        row.cell.tenureLoyalAccounts = next - row.cell.tenureEstablishedAccounts;
    });
};

const planSummaries = (cells: WorldStreamingCustomerPlanCell[]): WorldStreamingCustomerPlanSummary[] => {
    const rows = new Map<string, WorldStreamingCustomerPlanSummary>();
    cells.forEach(cell => {
        const key = `${cell.platformId}:${cell.planId}`;
        const current = rows.get(key);
        if (current) {
            current.paidAccounts += cell.paidAccounts;
            current.monthlySubscriptionRevenue = round2(current.monthlySubscriptionRevenue + cell.monthlySubscriptionRevenue);
        } else rows.set(key, {
            planId: cell.planId,
            planName: cell.planName,
            paidAccounts: cell.paidAccounts,
            effectiveMonthlyPrice: cell.effectiveMonthlyPrice,
            monthlySubscriptionRevenue: cell.monthlySubscriptionRevenue,
        });
    });
    return [...rows.values()].sort((left, right) => left.planId.localeCompare(right.planId));
};

const applyAccessPaths = (
    player: Player,
    countryId: string,
    cohort: WorldStreamingCustomerCohortState,
    offers: ReturnType<typeof getWorldStreamingOffers>,
    policy: WorldStreamingCustomerAccessPolicy,
): WorldStreamingCustomerCohortState => {
    if (!cohort.planCells.length || cohort.reachableHouseholds <= 0) return cohort;
    const audience = player.world.worldAudienceEconomy!.countries[countryId]?.cohorts.find(item => item.id === cohort.cohortId);
    const participation = player.world.worldAudienceParticipation!.countries[countryId]?.cohorts.find(item => item.cohortId === cohort.cohortId);
    const population = player.world.worldPopulation!.countries[countryId];
    if (!audience || !participation || !population) return cohort;
    const offerMap = new Map(offers.offers.map(offer => [offer.platformId, offer]));
    const nonPayingHouseholds = Math.max(0, cohort.reachableHouseholds - cohort.payingHouseholds);
    const sharingWeights = cohort.planCells.map(cell => {
        const plan = offerMap.get(cell.platformId)?.plans.find(item => item.id === cell.planId);
        const postureFactor = cell.platformId !== 'PLAYER'
            ? .75
            : policy.sharingPosture === 'REACH_FIRST' ? 1.3 : policy.sharingPosture === 'HOUSEHOLD_ONLY' ? .24 : .75;
        const enforcementFactor = cell.platformId !== 'PLAYER'
            ? .78
            : policy.enforcementInvestment === 'LIGHT' ? 1.08 : policy.enforcementInvestment === 'AGGRESSIVE' ? .48 : .78;
        const planFactor = plan?.featureIds.includes('streams4') ? 1.25 : plan?.featureIds.includes('downloads') ? 1.05 : .82;
        return cell.paidAccounts * audience.sharingTendencyIndex / 100 * .3 * postureFactor * enforcementFactor * planFactor;
    });
    const desiredShared = Math.min(nonPayingHouseholds, Math.round(sharingWeights.reduce((sum, value) => sum + value, 0)));
    const sharedByCell = distributeInteger(desiredShared, sharingWeights);
    const remainingHouseholds = Math.max(0, nonPayingHouseholds - desiredShared);
    const affordabilityPressure = clamp(
        1 - participation.totalMonthlyStreamingBudget / Math.max(1, cohort.reachableHouseholds * Math.max(1, audience.monthlyEntertainmentBudgetPerHousehold)),
        0,
        1,
    );
    const paymentBarrier = participation.streamingBarrierId === 'PAYMENT_ACCESS' || participation.streamingBarrierId === 'AFFORDABILITY' ? .22 : 0;
    const enforcementFactor = policy.enforcementInvestment === 'AGGRESSIVE' ? .48 : policy.enforcementInvestment === 'LIGHT' ? 1.18 : .8;
    const piracyHouseholds = Math.min(remainingHouseholds, Math.round(remainingHouseholds * clamp(
        audience.piracyTendencyIndex / 100 * .24 * enforcementFactor + affordabilityPressure * .08 + paymentBarrier,
        0,
        .52,
    )));
    const piracyPeople = Math.round(piracyHouseholds * population.averageHouseholdSize * .72);
    const piracyByCell = distributeInteger(piracyPeople, cohort.planCells.map(cell => cell.paidAccounts));
    const cells = cohort.planCells.map((cell, index) => {
        const externalSharedHouseholds = sharedByCell[index] || 0;
        const sharedActiveViewers = Math.round(externalSharedHouseholds * population.averageHouseholdSize * .64);
        return {
            ...cell,
            externalSharedHouseholds,
            sharedActiveViewers,
            piracyReach: piracyByCell[index] || 0,
            accessLoadAccounts: cell.paidAccounts + Math.round(externalSharedHouseholds * .72),
        };
    });
    return {
        ...cohort,
        externalSharedHouseholds: cells.reduce((sum, cell) => sum + cell.externalSharedHouseholds, 0),
        sharedActiveViewers: cells.reduce((sum, cell) => sum + cell.sharedActiveViewers, 0),
        piracyReach: cells.reduce((sum, cell) => sum + cell.piracyReach, 0),
        accessLoadAccounts: cells.reduce((sum, cell) => sum + cell.accessLoadAccounts, 0),
        planCells: cells,
    };
};

const platformSummaries = (
    cohorts: WorldStreamingCustomerCohortState[],
    previousCohorts: WorldStreamingCustomerCohortState[] = [],
    movements: WorldStreamingCustomerMovement[] = [],
): WorldStreamingCustomerPlatformSummary[] => {
    const byPlatform = new Map<string, { name: string; cells: WorldStreamingCustomerPlanCell[] }>();
    cohorts.flatMap(cohort => cohort.planCells).forEach(cell => {
        const row = byPlatform.get(cell.platformId) || { name: cell.platformName, cells: [] };
        row.cells.push(cell);
        byPlatform.set(cell.platformId, row);
    });
    previousCohorts.flatMap(cohort => cohort.planCells).forEach(cell => {
        if (!byPlatform.has(cell.platformId)) byPlatform.set(cell.platformId, { name: cell.platformName, cells: [] });
    });
    return [...byPlatform.entries()].map(([platformId, row]) => {
        const accounts = row.cells.reduce((sum, cell) => sum + cell.paidAccounts, 0);
        const payingHouseholds = row.cells.reduce((sum, cell) => sum + cell.primaryHouseholds, 0);
        const priorAccountTotal = previousCohorts.flatMap(cohort => cohort.planCells)
            .filter(cell => cell.platformId === platformId)
            .reduce((sum, cell) => sum + cell.paidAccounts, 0);
        const startingPaidAccounts = previousCohorts.length ? priorAccountTotal : accounts;
        const destination = movements.filter(item => item.destinationPlatformId === platformId);
        const source = movements.filter(item => item.sourcePlatformId === platformId);
        const joins = destination.filter(item => ['JOIN', 'ADD_SECONDARY', 'SWITCH'].includes(item.kind)).reduce((sum, item) => sum + item.households, 0);
        const reactivations = destination.filter(item => item.kind === 'REACTIVATE').reduce((sum, item) => sum + item.households, 0);
        const cancellations = source.filter(item => ['CANCEL', 'DROP_SECONDARY', 'SWITCH'].includes(item.kind)).reduce((sum, item) => sum + item.households, 0);
        const reasonCounts = new Map<string, number>();
        movements.filter(item => item.sourcePlatformId === platformId || item.destinationPlatformId === platformId).forEach(item => {
            reasonCounts.set(item.reasonId, (reasonCounts.get(item.reasonId) || 0) + item.households);
        });
        return {
            platformId,
            platformName: row.name,
            startingPaidAccounts,
            endingPaidAccounts: accounts,
            payingHouseholds,
            joins,
            cancellations,
            reactivations,
            upgrades: destination.filter(item => item.kind === 'UPGRADE').reduce((sum, item) => sum + item.households, 0),
            downgrades: destination.filter(item => item.kind === 'DOWNGRADE').reduce((sum, item) => sum + item.households, 0),
            switchIns: destination.filter(item => item.kind === 'SWITCH').reduce((sum, item) => sum + item.households, 0),
            switchOuts: source.filter(item => item.kind === 'SWITCH').reduce((sum, item) => sum + item.households, 0),
            externalSharedHouseholds: row.cells.reduce((sum, cell) => sum + cell.externalSharedHouseholds, 0),
            sharedActiveViewers: row.cells.reduce((sum, cell) => sum + cell.sharedActiveViewers, 0),
            piracyReach: row.cells.reduce((sum, cell) => sum + cell.piracyReach, 0),
            accessLoadAccounts: row.cells.reduce((sum, cell) => sum + cell.accessLoadAccounts, 0),
            monthlySubscriptionRevenue: round2(row.cells.reduce((sum, cell) => sum + cell.monthlySubscriptionRevenue, 0)),
            planAllocations: planSummaries(row.cells),
            strongestReasonId: ([...reasonCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || 'OTHER') as WorldStreamingCustomerPlatformSummary['strongestReasonId'],
        };
    }).sort((left, right) => right.endingPaidAccounts - left.endingPaidAccounts || left.platformId.localeCompare(right.platformId));
};

const createCountries = (
    player: Player,
    desired: DesiredCohort[],
    offers: ReturnType<typeof getWorldStreamingOffers>,
    policy: WorldStreamingCustomerAccessPolicy,
): Record<string, WorldStreamingCustomerCountryState> => (
    Object.fromEntries(Object.keys(player.world.worldAudienceEconomy!.countries).sort().map(countryId => {
        const population = player.world.worldPopulation!.countries[countryId];
        const desiredCohorts = desired.filter(row => row.countryId === countryId);
        const cohorts: WorldStreamingCustomerCohortState[] = desiredCohorts.map(row => {
            const accounts = row.cells.reduce((sum, cell) => sum + cell.paidAccounts, 0);
            const subscriptionsPerPayingHousehold = row.targetSubscribingHouseholds > 0
                ? row.targetSubscriptions / row.targetSubscribingHouseholds
                : 1;
            const payingHouseholds = Math.min(row.reachableHouseholds, Math.round(accounts / Math.max(1, subscriptionsPerPayingHousehold)));
            const profiles = Math.min(population.population, Math.round(payingHouseholds * population.averageHouseholdSize * .9));
            return applyAccessPaths(player, countryId, {
                cohortId: row.cohortId,
                reachableHouseholds: row.reachableHouseholds,
                payingHouseholds,
                profiles,
                activeViewers: Math.round(profiles * .68),
                externalSharedHouseholds: 0,
                sharedActiveViewers: 0,
                piracyReach: 0,
                accessLoadAccounts: accounts,
                planCells: row.cells.filter(cell => cell.paidAccounts > 0),
                lapsedCells: [],
            }, offers, policy);
        });
        const platforms = platformSummaries(cohorts);
        const endingPaidAccounts = platforms.reduce((sum, row) => sum + row.endingPaidAccounts, 0);
        const payingHouseholds = cohorts.reduce((sum, row) => sum + row.payingHouseholds, 0);
        const profiles = cohorts.reduce((sum, row) => sum + row.profiles, 0);
        return [countryId, {
            countryId,
            reachableHouseholds: desiredCohorts.reduce((sum, row) => sum + row.reachableHouseholds, 0),
            startingPaidAccounts: endingPaidAccounts,
            endingPaidAccounts,
            payingHouseholds,
            profiles,
            activeViewers: cohorts.reduce((sum, row) => sum + row.activeViewers, 0),
            joins: 0,
            cancellations: 0,
            reactivations: 0,
            upgrades: 0,
            downgrades: 0,
            switchIns: 0,
            switchOuts: 0,
            externalSharedHouseholds: cohorts.reduce((sum, row) => sum + row.externalSharedHouseholds, 0),
            sharedActiveViewers: cohorts.reduce((sum, row) => sum + row.sharedActiveViewers, 0),
            piracyReach: cohorts.reduce((sum, row) => sum + row.piracyReach, 0),
            accessLoadAccounts: cohorts.reduce((sum, row) => sum + row.accessLoadAccounts, 0),
            monthlySubscriptionRevenue: round2(platforms.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
            cohorts,
            platformSummaries: platforms,
        } satisfies WorldStreamingCustomerCountryState];
    }))
);

const cellMap = (cohort: WorldStreamingCustomerCohortState | undefined): Map<string, WorldStreamingCustomerPlanCell> => (
    new Map((cohort?.planCells || []).map(cell => [cell.platformId, cell]))
);

const createMovement = (
    absoluteWeek: number,
    countryId: string,
    cohortId: string,
    kind: WorldStreamingCustomerMovement['kind'],
    households: number,
    sourcePlatformId: string | null,
    destinationPlatformId: string | null,
    fromPlanId: string | null,
    toPlanId: string | null,
    reasonId: WorldStreamingCustomerMovement['reasonId'],
): WorldStreamingCustomerMovement => ({
    id: createDeterministicId('world-streaming-customer-movement', absoluteWeek, countryId, cohortId, kind, sourcePlatformId, destinationPlatformId, fromPlanId, toPlanId, households),
    absoluteWeek,
    countryId,
    cohortId,
    kind,
    households,
    sourcePlatformId,
    destinationPlatformId,
    fromPlanId,
    toPlanId,
    reasonId,
});

const advanceCohort = (
    desired: DesiredCohort,
    previous: WorldStreamingCustomerCohortState | undefined,
    absoluteWeek: number,
    elapsedWeeks: number,
    averageHouseholdSize: number,
    policy: WorldStreamingCustomerAccessPolicy,
): { cohort: WorldStreamingCustomerCohortState; movements: WorldStreamingCustomerMovement[] } => {
    const prior = cellMap(previous);
    const target = new Map(desired.cells.map(cell => [cell.platformId, cell]));
    const platformIds = [...new Set([...prior.keys(), ...target.keys()])].sort();
    const nextCells: WorldStreamingCustomerPlanCell[] = [];
    platformIds.forEach(platformId => {
        const before = prior.get(platformId);
        const wanted = target.get(platformId);
        const starting = before?.paidAccounts || 0;
        const goal = wanted?.paidAccounts || 0;
        const weeklyRate = goal >= starting ? .14 : wanted ? .18 : .55;
        const convergence = 1 - Math.pow(1 - weeklyRate, Math.max(1, elapsedWeeks));
        const policyCancellationRate = platformId === 'PLAYER'
            ? (policy.sharingPosture === 'HOUSEHOLD_ONLY' ? .004 : 0)
                + (policy.enforcementInvestment === 'AGGRESSIVE' ? .004 : 0)
            : 0;
        const ending = Math.max(0, starting + Math.round((goal - starting) * convergence) - Math.round(starting * policyCancellationRate * Math.max(1, elapsedWeeks)));
        if (!ending) return;
        const template = wanted || before!;
        const gained = Math.max(0, ending - starting);
        const retained = ending - gained;
        const tenureLoyalAccounts = Math.min(retained, Math.round((before?.tenureLoyalAccounts || 0) + (before?.tenureEstablishedAccounts || 0) * Math.min(.4, elapsedWeeks / 26)));
        const tenureEstablishedAccounts = Math.max(0, retained - tenureLoyalAccounts);
        const primaryRatio = template.paidAccounts > 0 ? template.primaryHouseholds / template.paidAccounts : 1;
        nextCells.push({
            ...template,
            paidAccounts: ending,
            primaryHouseholds: Math.min(ending, Math.round(ending * clamp(primaryRatio, 0, 1))),
            monthlySubscriptionRevenue: round2(ending * template.effectiveMonthlyPrice),
            tenureNewAccounts: gained,
            tenureEstablishedAccounts,
            tenureLoyalAccounts,
            externalSharedHouseholds: 0,
            sharedActiveViewers: 0,
            piracyReach: 0,
            accessLoadAccounts: ending,
        });
    });

    const next = new Map(nextCells.map(cell => [cell.platformId, cell]));
    const sources = platformIds.flatMap(platformId => {
        const before = prior.get(platformId);
        const after = next.get(platformId);
        const lost = Math.max(0, (before?.paidAccounts || 0) - (after?.paidAccounts || 0));
        return lost ? [{ platformId, planId: before?.planId || null, remaining: lost }] : [];
    });
    const destinations = platformIds.flatMap(platformId => {
        const before = prior.get(platformId);
        const after = next.get(platformId);
        const gained = Math.max(0, (after?.paidAccounts || 0) - (before?.paidAccounts || 0));
        return gained ? [{ platformId, planId: after?.planId || null, remaining: gained }] : [];
    });
    const movements: WorldStreamingCustomerMovement[] = [];
    const lapsedCells = (previous?.lapsedCells || [])
        .filter(cell => cell.households > 0 && absoluteWeek - cell.lastActiveAbsoluteWeek <= 104)
        .map(cell => ({ ...cell }));

    destinations.forEach(destination => {
        const lapsed = lapsedCells.find(cell => cell.platformId === destination.platformId && cell.households > 0);
        if (!lapsed || destination.remaining <= 0) return;
        const households = Math.min(destination.remaining, lapsed.households, Math.max(1, Math.round(lapsed.households * Math.min(.55, .18 + elapsedWeeks * .05))));
        destination.remaining -= households;
        lapsed.households -= households;
        movements.push(createMovement(
            absoluteWeek, desired.countryId, desired.cohortId, 'REACTIVATE', households,
            null, destination.platformId, lapsed.planId, destination.planId, 'RELEASE',
        ));
    });

    platformIds.forEach(platformId => {
        const before = prior.get(platformId);
        const after = next.get(platformId);
        if (!before || !after || before.planId === after.planId) return;
        const moved = Math.min(before.paidAccounts, after.paidAccounts);
        if (!moved) return;
        movements.push(createMovement(
            absoluteWeek, desired.countryId, desired.cohortId,
            after.effectiveMonthlyPrice >= before.effectiveMonthlyPrice ? 'UPGRADE' : 'DOWNGRADE',
            moved, platformId, platformId, before.planId, after.planId, 'PLAN_VALUE',
        ));
    });

    sources.forEach(source => {
        destinations.forEach(destination => {
            if (source.remaining <= 0 || destination.remaining <= 0 || source.platformId === destination.platformId) return;
            const households = Math.min(source.remaining, destination.remaining);
            source.remaining -= households;
            destination.remaining -= households;
            movements.push(createMovement(
                absoluteWeek, desired.countryId, desired.cohortId, 'SWITCH', households,
                source.platformId, destination.platformId, source.planId, destination.planId, 'COMPETITOR',
            ));
        });
    });
    const hadMultipleServices = (previous?.planCells.length || 0) > 1;
    sources.filter(row => row.remaining > 0).forEach(source => {
        movements.push(createMovement(
            absoluteWeek, desired.countryId, desired.cohortId,
            hadMultipleServices ? 'DROP_SECONDARY' : 'CANCEL', source.remaining,
            source.platformId, null, source.planId, null,
            source.platformId === 'PLAYER' && (policy.sharingPosture === 'HOUSEHOLD_ONLY' || policy.enforcementInvestment === 'AGGRESSIVE')
                ? 'SHARING_POLICY'
                : target.has(source.platformId) ? 'PRICE' : 'CATALOGUE',
        ));
        const existing = lapsedCells.find(cell => cell.platformId === source.platformId && cell.planId === source.planId);
        if (existing) {
            existing.households += source.remaining;
            existing.lastActiveAbsoluteWeek = absoluteWeek;
        } else lapsedCells.push({
            platformId: source.platformId,
            planId: source.planId || 'UNKNOWN',
            households: source.remaining,
            lastActiveAbsoluteWeek: absoluteWeek,
        });
    });
    destinations.filter(row => row.remaining > 0).forEach(destination => movements.push(createMovement(
        absoluteWeek, desired.countryId, desired.cohortId,
        prior.size > 0 ? 'ADD_SECONDARY' : 'JOIN', destination.remaining,
        null, destination.platformId, null, destination.planId, 'PLAN_VALUE',
    )));

    const accounts = nextCells.reduce((sum, cell) => sum + cell.paidAccounts, 0);
    const targetRatio = desired.targetSubscribingHouseholds > 0
        ? desired.targetSubscriptions / desired.targetSubscribingHouseholds
        : 1;
    const payingHouseholds = Math.min(desired.reachableHouseholds, Math.round(accounts / Math.max(1, targetRatio)));
    const profiles = Math.round(payingHouseholds * averageHouseholdSize * .9);
    return {
        cohort: {
            cohortId: desired.cohortId,
            reachableHouseholds: desired.reachableHouseholds,
            payingHouseholds,
            profiles,
            activeViewers: Math.round(profiles * .68),
            externalSharedHouseholds: 0,
            sharedActiveViewers: 0,
            piracyReach: 0,
            accessLoadAccounts: accounts,
            planCells: nextCells,
            lapsedCells: lapsedCells
                .filter(cell => cell.households > 0)
                .sort((left, right) => right.lastActiveAbsoluteWeek - left.lastActiveAbsoluteWeek || right.households - left.households || left.platformId.localeCompare(right.platformId))
                .slice(0, 3),
        },
        movements,
    };
};

const advanceCountries = (
    player: Player,
    desired: DesiredCohort[],
    previous: WorldStreamingCustomerState,
    absoluteWeek: number,
    offers: ReturnType<typeof getWorldStreamingOffers>,
    policy: WorldStreamingCustomerAccessPolicy,
): { countries: Record<string, WorldStreamingCustomerCountryState>; movements: WorldStreamingCustomerMovement[] } => {
    const elapsedWeeks = Math.max(1, absoluteWeek - previous.lastProcessedAbsoluteWeek);
    const allMovements: WorldStreamingCustomerMovement[] = [];
    const countries = Object.fromEntries(Object.keys(player.world.worldAudienceEconomy!.countries).sort().map(countryId => {
        const previousCountry = previous.countries[countryId];
        const population = player.world.worldPopulation!.countries[countryId];
        const rows = desired.filter(item => item.countryId === countryId);
        const results = rows.map(row => advanceCohort(
            row,
            previousCountry?.cohorts.find(cohort => cohort.cohortId === row.cohortId),
            absoluteWeek,
            elapsedWeeks,
            population.averageHouseholdSize,
            policy,
        ));
        const movements = results.flatMap(result => result.movements);
        allMovements.push(...movements);
        const cohorts = results.map(result => applyAccessPaths(player, countryId, result.cohort, offers, policy));
        const platforms = platformSummaries(cohorts, previousCountry?.cohorts || [], movements);
        const sumPlatform = (field: keyof Pick<WorldStreamingCustomerPlatformSummary, 'startingPaidAccounts' | 'endingPaidAccounts' | 'joins' | 'cancellations' | 'reactivations' | 'upgrades' | 'downgrades' | 'switchIns' | 'switchOuts'>): number => (
            platforms.reduce((sum, row) => sum + row[field], 0)
        );
        return [countryId, {
            countryId,
            reachableHouseholds: rows.reduce((sum, row) => sum + row.reachableHouseholds, 0),
            startingPaidAccounts: sumPlatform('startingPaidAccounts'),
            endingPaidAccounts: sumPlatform('endingPaidAccounts'),
            payingHouseholds: cohorts.reduce((sum, row) => sum + row.payingHouseholds, 0),
            profiles: cohorts.reduce((sum, row) => sum + row.profiles, 0),
            activeViewers: cohorts.reduce((sum, row) => sum + row.activeViewers, 0),
            joins: sumPlatform('joins'),
            cancellations: sumPlatform('cancellations'),
            reactivations: sumPlatform('reactivations'),
            upgrades: sumPlatform('upgrades'),
            downgrades: sumPlatform('downgrades'),
            switchIns: sumPlatform('switchIns'),
            switchOuts: sumPlatform('switchOuts'),
            externalSharedHouseholds: cohorts.reduce((sum, row) => sum + row.externalSharedHouseholds, 0),
            sharedActiveViewers: cohorts.reduce((sum, row) => sum + row.sharedActiveViewers, 0),
            piracyReach: cohorts.reduce((sum, row) => sum + row.piracyReach, 0),
            accessLoadAccounts: cohorts.reduce((sum, row) => sum + row.accessLoadAccounts, 0),
            monthlySubscriptionRevenue: round2(platforms.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
            cohorts,
            platformSummaries: platforms,
        } satisfies WorldStreamingCustomerCountryState];
    }));
    return { countries, movements: allMovements };
};

const createGlobal = (
    countries: Record<string, WorldStreamingCustomerCountryState>,
    playerOfferPresent: boolean,
): WorldStreamingCustomerGlobalSummary => {
    const values = Object.values(countries);
    const platforms = values.flatMap(country => country.platformSummaries);
    const playerRows = platforms.filter(row => row.platformId === 'PLAYER');
    const playerCells = values.flatMap(country => country.cohorts.flatMap(cohort => cohort.planCells.filter(cell => cell.platformId === 'PLAYER')));
    const endingPaidAccounts = values.reduce((sum, row) => sum + row.endingPaidAccounts, 0);
    return {
        reachableHouseholds: values.reduce((sum, row) => sum + row.reachableHouseholds, 0),
        startingPaidAccounts: values.reduce((sum, row) => sum + row.startingPaidAccounts, 0),
        endingPaidAccounts,
        payingHouseholds: values.reduce((sum, row) => sum + row.payingHouseholds, 0),
        profiles: values.reduce((sum, row) => sum + row.profiles, 0),
        activeViewers: values.reduce((sum, row) => sum + row.activeViewers, 0),
        joins: values.reduce((sum, row) => sum + row.joins, 0),
        cancellations: values.reduce((sum, row) => sum + row.cancellations, 0),
        reactivations: values.reduce((sum, row) => sum + row.reactivations, 0),
        upgrades: values.reduce((sum, row) => sum + row.upgrades, 0),
        downgrades: values.reduce((sum, row) => sum + row.downgrades, 0),
        switchIns: values.reduce((sum, row) => sum + row.switchIns, 0),
        switchOuts: values.reduce((sum, row) => sum + row.switchOuts, 0),
        externalSharedHouseholds: values.reduce((sum, row) => sum + row.externalSharedHouseholds, 0),
        sharedActiveViewers: values.reduce((sum, row) => sum + row.sharedActiveViewers, 0),
        piracyReach: values.reduce((sum, row) => sum + row.piracyReach, 0),
        accessLoadAccounts: values.reduce((sum, row) => sum + row.accessLoadAccounts, 0),
        monthlySubscriptionRevenue: round2(values.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
        playerStartingPaidAccounts: playerRows.reduce((sum, row) => sum + row.startingPaidAccounts, 0),
        playerEndingPaidAccounts: playerRows.reduce((sum, row) => sum + row.endingPaidAccounts, 0),
        playerPayingHouseholds: playerRows.reduce((sum, row) => sum + row.payingHouseholds, 0),
        playerJoins: playerRows.reduce((sum, row) => sum + row.joins, 0),
        playerCancellations: playerRows.reduce((sum, row) => sum + row.cancellations, 0),
        playerReactivations: playerRows.reduce((sum, row) => sum + row.reactivations, 0),
        playerUpgrades: playerRows.reduce((sum, row) => sum + row.upgrades, 0),
        playerDowngrades: playerRows.reduce((sum, row) => sum + row.downgrades, 0),
        playerSwitchIns: playerRows.reduce((sum, row) => sum + row.switchIns, 0),
        playerSwitchOuts: playerRows.reduce((sum, row) => sum + row.switchOuts, 0),
        playerExternalSharedHouseholds: playerRows.reduce((sum, row) => sum + row.externalSharedHouseholds, 0),
        playerSharedActiveViewers: playerRows.reduce((sum, row) => sum + row.sharedActiveViewers, 0),
        playerPiracyReach: playerRows.reduce((sum, row) => sum + row.piracyReach, 0),
        playerAccessLoadAccounts: playerRows.reduce((sum, row) => sum + row.accessLoadAccounts, 0),
        playerMonthlySubscriptionRevenue: round2(playerRows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
        playerPlanAllocations: planSummaries(playerCells),
        playerOfferPresent,
        countryCount: values.length,
        platformCount: new Set(platforms.map(row => row.platformId)).size,
    };
};

const createSnapshot = (absoluteWeek: number, global: WorldStreamingCustomerGlobalSummary): WorldStreamingCustomerSnapshot => ({
    absoluteWeek,
    endingPaidAccounts: global.endingPaidAccounts,
    payingHouseholds: global.payingHouseholds,
    externalSharedHouseholds: global.externalSharedHouseholds,
    piracyReach: global.piracyReach,
    playerEndingPaidAccounts: global.playerEndingPaidAccounts,
    playerMonthlySubscriptionRevenue: global.playerMonthlySubscriptionRevenue,
});

const structurallyValid = (input: unknown): input is WorldStreamingCustomerState => {
    if (!input || typeof input !== 'object') return false;
    const state = input as Partial<WorldStreamingCustomerState>;
    if (state.schemaVersion !== WORLD_STREAMING_CUSTOMER_SCHEMA_VERSION || !state.countries || !state.global || !Array.isArray(state.snapshots) || !Array.isArray(state.recentMovements)) return false;
    if (state.snapshots.length > MAX_SNAPSHOTS || state.recentMovements.length > MAX_RECENT_MOVEMENTS) return false;
    const countries = Object.values(state.countries);
    if (countries.length !== state.global.countryCount) return false;
    if (state.global.startingPaidAccounts + state.global.joins + state.global.reactivations - state.global.cancellations !== state.global.endingPaidAccounts) return false;
    return countries.every(country => (
        country.startingPaidAccounts + country.joins + country.reactivations - country.cancellations === country.endingPaidAccounts
        && country.endingPaidAccounts === country.platformSummaries.reduce((sum, row) => sum + row.endingPaidAccounts, 0)
        && country.cohorts.every(cohort => cohort.planCells.every(cell => (
            cell.paidAccounts >= 0
            && cell.paidAccounts === cell.tenureNewAccounts + cell.tenureEstablishedAccounts + cell.tenureLoyalAccounts
            && Math.abs(cell.monthlySubscriptionRevenue - round2(cell.paidAccounts * cell.effectiveMonthlyPrice)) < .011
        )))
    ));
};

export const createWorldStreamingCustomerState = (player: Player, absoluteWeek: number): WorldStreamingCustomerState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const prepared = preparePlayer(player, week);
    const offers = getWorldStreamingOffers(prepared, week);
    const desired = createDesiredCohorts(prepared, offers);
    if (offers.offers.some(offer => offer.isPlayer)) {
        scalePlayerSeed(desired, Math.max(0, Math.round(prepared.ownedStreamingPlatform.metrics.subscribers || 0)));
    }
    const policy = resolvePolicy(prepared, week);
    const countries = createCountries(prepared, desired, offers, policy);
    const global = createGlobal(countries, offers.offers.some(offer => offer.isPlayer));
    return {
        schemaVersion: WORLD_STREAMING_CUSTOMER_SCHEMA_VERSION,
        initializedAtAbsoluteWeek: week,
        lastProcessedAbsoluteWeek: week,
        sourceFingerprint: createDeterministicId('world-streaming-customers-source', week, prepared.world.worldStreamingCompetition!.sourceFingerprint, offers.fingerprint, policy.sharingPosture, policy.enforcementInvestment),
        playerAccessPolicy: policy,
        countries,
        global,
        recentMovements: [],
        snapshots: [createSnapshot(week, global)],
    };
};

export const normalizeWorldStreamingCustomerState = (
    input: unknown,
    player: Player,
    absoluteWeek: number,
): WorldStreamingCustomerState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const prepared = preparePlayer(player, week);
    const offers = getWorldStreamingOffers(prepared, week);
    const policy = resolvePolicy(prepared, week);
    const sourceFingerprint = createDeterministicId('world-streaming-customers-source', week, prepared.world.worldStreamingCompetition!.sourceFingerprint, offers.fingerprint, policy.sharingPosture, policy.enforcementInvestment);
    if (!structurallyValid(input)) return createWorldStreamingCustomerState(player, week);
    // A committed absolute week is immutable. Owned-platform processing updates subscriber metrics
    // after WE5 runs, which legitimately changes the offer fingerprint; treating that as a new
    // customer turn would reroll movement and tenure during save migration/reload.
    if (input.lastProcessedAbsoluteWeek === week) return input;
    const desired = createDesiredCohorts(prepared, offers);
    const advanced = advanceCountries(prepared, desired, input, week, offers, policy);
    const global = createGlobal(advanced.countries, offers.offers.some(offer => offer.isPlayer));
    const recentForWeek = advanced.movements
        .slice()
        .sort((left, right) => right.households - left.households || left.id.localeCompare(right.id))
        .slice(0, 12);
    return {
        schemaVersion: WORLD_STREAMING_CUSTOMER_SCHEMA_VERSION,
        initializedAtAbsoluteWeek: input.initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: week,
        sourceFingerprint,
        playerAccessPolicy: policy,
        countries: advanced.countries,
        global,
        snapshots: [...input.snapshots, createSnapshot(week, global)].slice(-MAX_SNAPSHOTS),
        recentMovements: [...input.recentMovements, ...recentForWeek].slice(-MAX_RECENT_MOVEMENTS),
    };
};

export const advanceWorldStreamingCustomersToWeek = normalizeWorldStreamingCustomerState;

export const updateWorldStreamingCustomerAccessPolicy = (
    player: Player,
    policy: Pick<WorldStreamingCustomerAccessPolicy, 'sharingPosture' | 'enforcementInvestment'>,
    absoluteWeek: number,
): Player => {
    const current = player.ownedStreamingPlatform.audienceAccessPolicy || defaultPolicy(absoluteWeek);
    if (current.sharingPosture === policy.sharingPosture
        && current.enforcementInvestment === policy.enforcementInvestment
        && current.source === 'PLAYER_ACTION') return player;
    return {
        ...player,
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            audienceAccessPolicy: {
                sharingPosture: policy.sharingPosture,
                enforcementInvestment: policy.enforcementInvestment,
                source: 'PLAYER_ACTION',
                updatedAtAbsoluteWeek: Math.max(0, Math.round(Number(absoluteWeek) || 0)),
            },
        },
    };
};

export const getWorldStreamingPlayerCustomerOutcome = (
    state: WorldStreamingCustomerState | undefined,
): (Pick<WorldStreamingCustomerGlobalSummary,
    | 'playerStartingPaidAccounts'
    | 'playerEndingPaidAccounts'
    | 'playerPayingHouseholds'
    | 'playerJoins'
    | 'playerCancellations'
    | 'playerReactivations'
    | 'playerUpgrades'
    | 'playerDowngrades'
    | 'playerSwitchIns'
    | 'playerSwitchOuts'
    | 'playerExternalSharedHouseholds'
    | 'playerSharedActiveViewers'
    | 'playerPiracyReach'
    | 'playerAccessLoadAccounts'
    | 'playerMonthlySubscriptionRevenue'
    | 'playerPlanAllocations'> & {
        startingPaidAccounts: number;
        endingPaidAccounts: number;
        payingHouseholds: number;
        joins: number;
        cancellations: number;
        reactivations: number;
        upgrades: number;
        downgrades: number;
        switchIns: number;
        switchOuts: number;
        externalSharedHouseholds: number;
        sharedActiveViewers: number;
        piracyReach: number;
        accessLoadAccounts: number;
        monthlySubscriptionRevenue: number;
        planAllocations: WorldStreamingCustomerPlanSummary[];
    }) | null => {
    if (!state || !structurallyValid(state) || !state.global.playerOfferPresent) return null;
    return {
        playerStartingPaidAccounts: state.global.playerStartingPaidAccounts,
        playerEndingPaidAccounts: state.global.playerEndingPaidAccounts,
        playerPayingHouseholds: state.global.playerPayingHouseholds,
        playerJoins: state.global.playerJoins,
        playerCancellations: state.global.playerCancellations,
        playerReactivations: state.global.playerReactivations,
        playerUpgrades: state.global.playerUpgrades,
        playerDowngrades: state.global.playerDowngrades,
        playerSwitchIns: state.global.playerSwitchIns,
        playerSwitchOuts: state.global.playerSwitchOuts,
        playerExternalSharedHouseholds: state.global.playerExternalSharedHouseholds,
        playerSharedActiveViewers: state.global.playerSharedActiveViewers,
        playerPiracyReach: state.global.playerPiracyReach,
        playerAccessLoadAccounts: state.global.playerAccessLoadAccounts,
        playerMonthlySubscriptionRevenue: state.global.playerMonthlySubscriptionRevenue,
        playerPlanAllocations: state.global.playerPlanAllocations.map(row => ({ ...row })),
        startingPaidAccounts: state.global.playerStartingPaidAccounts,
        endingPaidAccounts: state.global.playerEndingPaidAccounts,
        payingHouseholds: state.global.playerPayingHouseholds,
        joins: state.global.playerJoins,
        cancellations: state.global.playerCancellations,
        reactivations: state.global.playerReactivations,
        upgrades: state.global.playerUpgrades,
        downgrades: state.global.playerDowngrades,
        switchIns: state.global.playerSwitchIns,
        switchOuts: state.global.playerSwitchOuts,
        externalSharedHouseholds: state.global.playerExternalSharedHouseholds,
        sharedActiveViewers: state.global.playerSharedActiveViewers,
        piracyReach: state.global.playerPiracyReach,
        accessLoadAccounts: state.global.playerAccessLoadAccounts,
        monthlySubscriptionRevenue: state.global.playerMonthlySubscriptionRevenue,
        planAllocations: state.global.playerPlanAllocations.map(row => ({ ...row })),
    };
};
