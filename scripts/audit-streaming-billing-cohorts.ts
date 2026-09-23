import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type WorldStreamingPlatformOffer } from '../types';
import { normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import {
    allocateWorldStreamingCohort,
    createWorldStreamingCompetitionState,
    normalizeWorldStreamingCompetitionState,
} from '../services/worldEconomy/worldStreamingCompetition';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import {
    createWorldStreamingCustomerState,
    normalizeWorldStreamingCustomerState,
} from '../services/worldEconomy/worldStreamingCustomers';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';

const player = structuredClone(INITIAL_PLAYER) as Player;
const week = getAbsoluteWeek(player.age, player.currentWeek);
const population = normalizeWorldPopulationState(player.world.worldPopulation, week);
const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, week);
const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, week);
const cohort = audience.countries.US.cohorts[0];
const source = participation.countries.US.cohorts.find(row => row.cohortId === cohort.id)!;
const hundredHomes = {
    ...source,
    streamingOnlyHouseholds: 100,
    dualParticipantHouseholds: 0,
    totalMonthlyStreamingBudget: 900,
};
const sampleOffer = getWorldStreamingOffers(player, week).offers[0];
assert.ok(sampleOffer, 'the test needs a real offer structure');
const offer: WorldStreamingPlatformOffer = {
    ...sampleOffer,
    platformId: 'BILLING_PATH_TEST',
    plans: [{
        ...sampleOffer.plans[0],
        id: 'PREMIERE',
        name: 'Premiere',
        monthlyPrice: 17.99,
        effectiveMonthlyPrice: 11.96,
        monthlyBillingPrice: 8.99,
        annualBillingMonthlyPrice: 17.99,
    }],
};
const allocation = allocateWorldStreamingCohort('US', cohort, hundredHomes, [offer]);
assert.equal(allocation.reachableHouseholds, 100, 'billing partitions must not multiply households');
assert.ok(Array.isArray(allocation.paths), 'competition must expose monthly and annual billing partitions');
assert.equal(allocation.paths.reduce((sum, path) => sum + path.reachableHouseholds, 0), 100,
    'monthly and annual partitions must exactly reconcile');
assert.ok(allocation.paths.find(path => path.billingPath === 'MONTHLY')!.subscribingHouseholds > 0,
    'a $9-budget household can afford the $8.99 monthly introductory path');
assert.equal(allocation.paths.find(path => path.billingPath === 'ANNUAL')!.subscribingHouseholds, 0,
    'the same household cannot afford a $17.99 annual-equivalent path');
assert.ok(allocation.totalSpend <= 900, 'path-specific subscribers cannot exceed the cohort budget');
const launchPricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs'] as typeof player.ownedStreamingPlatform.serviceConfiguration.pricing.streams,
    plans: [{ id: 'ACCESS', name: 'Access', monthly: 4.99, featureIds: ['hd'], ads: false }],
    annualDiscount: 20,
    introOffer: 50,
    introOfferPlanId: 'ACCESS',
};
const forecast = forecastWorldStreamingLaunchPricing(player, launchPricing, ['US']);
const access = forecast.planAllocations.find(row => row.planId === 'ACCESS')!;
assert.ok(access.households > 0, 'the path reconciliation fixture needs paid subscribers');
assert.equal(access.monthlyHouseholds + access.annualHouseholds, access.households,
    'canonical plan rows must reconcile monthly and annual buyers');
assert.ok(access.monthlyHouseholds > 0 && access.annualHouseholds > 0,
    'both billing paths remain available on an affordable plan');
assert.equal(forecast.planAllocations.reduce((sum, row) => sum + row.households, 0), forecast.subscribers,
    'plan accounts reconcile to the public forecast');
assert.ok(Math.abs(forecast.firstYearSubscriptionRevenue
    - (access.monthlyHouseholds * 52.41 + access.annualHouseholds * 47.88)) < .02,
    'first-year revenue uses three promoted months for monthly buyers and twelve annual-equivalent months for annual buyers');
const competition = createWorldStreamingCompetitionState(player, week);
const staleCompetition = structuredClone(competition);
const stalePlan = Object.values(staleCompetition.countries).flatMap(country => country.platformAllocations)
    .flatMap(platform => platform.planAllocations)[0];
assert.ok(stalePlan, 'the stale-competition fixture needs an AI plan allocation');
delete (stalePlan as Partial<typeof stalePlan>).monthlyHouseholds;
delete (stalePlan as Partial<typeof stalePlan>).annualHouseholds;
const repairedCompetition = normalizeWorldStreamingCompetitionState(staleCompetition, player, week);
assert.ok(Object.values(repairedCompetition.countries).flatMap(country => country.platformAllocations)
    .flatMap(platform => platform.planAllocations).every(plan => plan.monthlyHouseholds + plan.annualHouseholds === plan.households),
    'an old same-week derived competition cache must be rebuilt with path counts');
const livePlayer = structuredClone(player) as Player;
livePlayer.money = 987_654_321;
const savedCustomers = createWorldStreamingCustomerState(livePlayer, week);
const duplicatedPathSave = structuredClone(savedCustomers);
duplicatedPathSave.countries.US.cohorts.push(structuredClone(duplicatedPathSave.countries.US.cohorts[0]));
const repairedPathSave = normalizeWorldStreamingCustomerState(duplicatedPathSave, livePlayer, week);
assert.equal(repairedPathSave.countries.US.cohorts.length, savedCustomers.countries.US.cohorts.length,
    'duplicate saved billing partitions are repaired rather than doubling accounts on reload');
const originalCells = Object.values(savedCustomers.countries).flatMap(country => country.cohorts.flatMap(row => row.planCells));
const originalAccounts = originalCells.reduce((sum, cell) => sum + cell.paidAccounts, 0);
const originalTenure = originalCells.reduce((sum, cell) => sum
    + cell.tenureNewAccounts + cell.tenureEstablishedAccounts + cell.tenureLoyalAccounts, 0);
const legacyCustomers = structuredClone(savedCustomers) as typeof savedCustomers;
legacyCustomers.schemaVersion = 1 as typeof legacyCustomers.schemaVersion;
Object.values(legacyCustomers.countries).forEach(country => {
    const groups = new Map<string, typeof country.cohorts>();
    country.cohorts.forEach(cohort => groups.set(cohort.cohortId, [...(groups.get(cohort.cohortId) || []), cohort]));
    country.cohorts = [...groups.values()].map(paths => {
        const [first] = paths;
        const cells = new Map<string, typeof first.planCells[number]>();
        paths.flatMap(path => path.planCells).forEach(cell => {
            const previous = cells.get(cell.platformId);
            if (!previous) { cells.set(cell.platformId, { ...cell }); return; }
            const paidAccounts = previous.paidAccounts + cell.paidAccounts;
            const revenue = previous.monthlySubscriptionRevenue + cell.monthlySubscriptionRevenue;
            const effectiveMonthlyPrice = Math.round(revenue / paidAccounts * 100) / 100;
            cells.set(cell.platformId, {
                ...previous, paidAccounts,
                primaryHouseholds: previous.primaryHouseholds + cell.primaryHouseholds,
                effectiveMonthlyPrice,
                monthlySubscriptionRevenue: Math.round(paidAccounts * effectiveMonthlyPrice * 100) / 100,
                tenureNewAccounts: previous.tenureNewAccounts + cell.tenureNewAccounts,
                tenureEstablishedAccounts: previous.tenureEstablishedAccounts + cell.tenureEstablishedAccounts,
                tenureLoyalAccounts: previous.tenureLoyalAccounts + cell.tenureLoyalAccounts,
                externalSharedHouseholds: previous.externalSharedHouseholds + cell.externalSharedHouseholds,
                sharedActiveViewers: previous.sharedActiveViewers + cell.sharedActiveViewers,
                piracyReach: previous.piracyReach + cell.piracyReach,
                accessLoadAccounts: previous.accessLoadAccounts + cell.accessLoadAccounts,
            });
        });
        const sum = (field: 'reachableHouseholds' | 'payingHouseholds' | 'profiles' | 'activeViewers'
            | 'externalSharedHouseholds' | 'sharedActiveViewers' | 'piracyReach' | 'accessLoadAccounts') => (
            paths.reduce((total, path) => total + path[field], 0)
        );
        const legacy = {
            ...first,
            reachableHouseholds: sum('reachableHouseholds'),
            payingHouseholds: sum('payingHouseholds'),
            profiles: sum('profiles'),
            activeViewers: sum('activeViewers'),
            externalSharedHouseholds: sum('externalSharedHouseholds'),
            sharedActiveViewers: sum('sharedActiveViewers'),
            piracyReach: sum('piracyReach'),
            accessLoadAccounts: sum('accessLoadAccounts'),
            planCells: [...cells.values()],
            lapsedCells: paths.flatMap(path => path.lapsedCells),
        };
        delete (legacy as Partial<typeof legacy>).billingPath;
        return legacy;
    });
});
const legacyCohortCount = Object.values(legacyCustomers.countries).reduce((sum, country) => sum + country.cohorts.length, 0);
const migratedCustomers = normalizeWorldStreamingCustomerState(legacyCustomers, livePlayer, week);
const migratedCells = Object.values(migratedCustomers.countries).flatMap(country => country.cohorts.flatMap(row => row.planCells));
assert.equal(migratedCustomers.schemaVersion, 2, 'legacy customer saves migrate into billing-path schema');
assert.ok(Object.values(migratedCustomers.countries).flatMap(country => country.cohorts)
    .every(row => row.billingPath === 'MONTHLY' || row.billingPath === 'ANNUAL'),
    'every migrated customer cohort has a durable billing identity');
assert.equal(Object.values(migratedCustomers.countries).reduce((sum, country) => sum + country.cohorts.length, 0), legacyCohortCount * 2,
    'one legacy audience cohort becomes exactly two billing-path cohorts');
assert.equal(migratedCells.reduce((sum, cell) => sum + cell.paidAccounts, 0), originalAccounts,
    'migration preserves the exact number of old paid accounts');
assert.equal(migratedCells.reduce((sum, cell) => sum
    + cell.tenureNewAccounts + cell.tenureEstablishedAccounts + cell.tenureLoyalAccounts, 0), originalTenure,
    'migration preserves all existing customer tenure counts');
assert.ok(Object.values(migratedCustomers.countries).every(country => Math.abs(country.monthlySubscriptionRevenue
    - country.cohorts.flatMap(row => row.planCells).reduce((sum, cell) => sum + cell.monthlySubscriptionRevenue, 0)) < .02),
    'migrated country revenue reconciles with real billing-path customer cells');
assert.deepEqual(migratedCustomers.recentMovements, legacyCustomers.recentMovements,
    'migration does not invent new customer movements');
assert.deepEqual(migratedCustomers.snapshots, legacyCustomers.snapshots,
    'migration does not rewrite settled customer snapshots');
assert.deepEqual(normalizeWorldStreamingCustomerState(migratedCustomers, livePlayer, week), migratedCustomers,
    'same-week reload after migration is idempotent');
assert.equal(livePlayer.money, 987_654_321, 'migration never books historical cash');
const legacyPlayer = structuredClone(livePlayer) as Player;
legacyPlayer.world.worldStreamingCustomers = legacyCustomers;
const migratedPlayer = migratePlayerSave(legacyPlayer);
assert.equal(migratedPlayer.money, legacyPlayer.money, 'full save migration does not retroactively charge treasury');
assert.equal(migratedPlayer.world.worldStreamingCustomers?.global.endingPaidAccounts, originalAccounts,
    'full save migration retains existing customer accounts instead of reseeding them');
const nextWeekCustomers = normalizeWorldStreamingCustomerState(migratedCustomers, livePlayer, week + 1);
assert.equal(nextWeekCustomers.global.startingPaidAccounts + nextWeekCustomers.global.joins
    + nextWeekCustomers.global.reactivations - nextWeekCustomers.global.cancellations,
    nextWeekCustomers.global.endingPaidAccounts, 'next-week movement ledger reconciles across both billing paths');
assert.equal(new Set(nextWeekCustomers.recentMovements.map(row => row.id)).size,
    nextWeekCustomers.recentMovements.length, 'monthly and annual movements have distinct durable IDs');
console.log(`Billing paths: ${allocation.paths.map(path => `${path.billingPath} ${path.subscribingHouseholds}/${path.reachableHouseholds}`).join(', ')}; $9-budget fixture old blend 0 buyers/$0, new ${allocation.totalSubscriptions} buyers/$${allocation.totalSpend.toFixed(2)} monthly equivalent.`);
