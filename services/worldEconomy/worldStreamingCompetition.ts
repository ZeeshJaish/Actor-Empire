import type {
    Player,
    WorldAudienceCohortState,
    WorldAudienceParticipationCohortState,
    WorldStreamingCompetitionCountryState,
    WorldStreamingCompetitionGlobalSummary,
    WorldStreamingCompetitionSnapshot,
    WorldStreamingCompetitionState,
    WorldStreamingPlanAllocation,
    WorldStreamingPlatformAllocation,
    WorldStreamingPlatformOffer,
    StreamingBillingPath,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { getWorldStreamingDeviceReachFactor, getWorldStreamingOfferMarketing, getWorldStreamingOffers, getWorldStreamingOfferExposure, getWorldStreamingStoreStrength } from './worldStreamingOffers';
import { normalizeWorldAudienceEconomyState } from './worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldAudienceParticipation';
import { normalizeWorldPopulationState } from './worldPopulation';
import { calculateStreamingCommercialAudienceAdjustment } from './worldStreamingCommercialEconomy';
import { STREAMING_ANNUAL_BILLING_SHARE, STREAMING_REFERENCE_ANNUAL_DISCOUNT, streamingAnnualBillingShare } from '../streamingPricingEconomy';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { STREAMING_4K_RANK, STREAMING_AD_LEVEL_EFFECTS, STREAMING_MOBILE_PLAN, streamingPrestigePictureBonus } from '../streamingPlanOffer';

export const WORLD_STREAMING_COMPETITION_SCHEMA_VERSION = 1 as const;
const MAX_SNAPSHOTS = 32;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round2 = (value: number): number => Math.round(value * 100) / 100;

const distributeInteger = (total: number, weights: number[], caps?: number[]): number[] => {
    const safeTotal = Math.max(0, Math.round(Number(total) || 0));
    if (!weights.length || safeTotal === 0) return weights.map(() => 0);
    const result = weights.map(() => 0);
    let remaining = safeTotal;
    let available = weights.map((_, index) => index);
    while (remaining > 0 && available.length) {
        const weightTotal = available.reduce((sum, index) => sum + Math.max(.0001, weights[index] || 0), 0);
        const exact = available.map(index => ({
            index,
            exact: remaining * Math.max(.0001, weights[index] || 0) / weightTotal,
        }));
        let granted = 0;
        exact.forEach(item => {
            const capacity = Math.max(0, (caps?.[item.index] ?? safeTotal) - result[item.index]);
            const value = Math.min(capacity, Math.floor(item.exact));
            result[item.index] += value;
            granted += value;
        });
        remaining -= granted;
        if (remaining <= 0) break;
        const order = exact
            .filter(item => result[item.index] < (caps?.[item.index] ?? safeTotal))
            .sort((left, right) => (right.exact - Math.floor(right.exact)) - (left.exact - Math.floor(left.exact)) || left.index - right.index);
        if (!order.length) break;
        order.forEach(item => {
            if (remaining <= 0) return;
            result[item.index] += 1;
            remaining -= 1;
        });
        available = available.filter(index => result[index] < (caps?.[index] ?? safeTotal));
        if (granted === 0 && !order.length) break;
    }
    return result;
};

interface Candidate {
    offer: WorldStreamingPlatformOffer;
    plan: WorldStreamingPlatformOffer['plans'][number];
    billingPath: StreamingBillingPath;
    billingPrice: number;
    utility: number;
    weight: number;
    driver: string;
}

interface BillingPathAllocation {
    billingPath: StreamingBillingPath;
    reachableHouseholds: number;
    subscribingHouseholds: number;
    totalSubscriptions: number;
    totalBudget: number;
    totalSpend: number;
    allocations: Array<Candidate & { households: number; primaryHouseholds: number }>;
}

interface CohortAllocation extends Omit<BillingPathAllocation, 'billingPath'> {
    paths: BillingPathAllocation[];
}

const planUtility = (
    cohort: WorldAudienceCohortState,
    participation: WorldAudienceParticipationCohortState,
    offer: WorldStreamingPlatformOffer,
    plan: WorldStreamingPlatformOffer['plans'][number],
    countryId: string,
    budgetPerHousehold: number,
    billingPrice: number,
    transactionalPrice: number,
    bestRivalPictureRank = STREAMING_4K_RANK,
): { utility: number; driver: string } => {
    const affordability = clamp(100 - billingPrice / Math.max(.5, budgetPerHousehold) * 62, -80, 95);
    /* Phase 2 (§6.7): ads cost what their level costs (standard is what ads always cost), and a
       prestige viewer weighs 4K HDR and beyond against the best picture a rival sells here. */
    const ads = STREAMING_AD_LEVEL_EFFECTS[plan.ads ? (plan.adLevel && plan.adLevel !== 'NONE' ? plan.adLevel : 'STANDARD') : 'NONE'];
    const featureFit = plan.appealIndex
        // families: four screens or more (six a little more, #60), Watch party on the whole service (#60) and
        // Kids profiles on the plans that include them (#62); a rival's are 0
        + (cohort.lifeStageId === 'FAMILY'
            ? (plan.featureIds.includes('streams6') ? 20 : plan.featureIds.includes('streams4') ? 16 : 0) + (offer.familyAppealIndex || 0)
                + (plan.featureIds.includes('kids') ? offer.kidsAppealIndex || 0 : 0) : 0)
        + (cohort.primaryPersonaId === 'HABIT_STREAMERS' && plan.featureIds.includes('downloads') ? 10 : 0)
        // Playback's fast starts, no buffering and the extras around the player (#53); a rival's is 0
        + (cohort.primaryPersonaId === 'HABIT_STREAMERS' ? offer.habitAppealIndex || 0 : 0)
        // Content protection (#55): where homes pirate, a service whose titles are hard to copy is the way to watch them
        + cohort.piracyTendencyIndex / 100 * (offer.protectionIndex || 0) * .25
        + (cohort.primaryPersonaId === 'PRESTIGE_EXPLORERS' && plan.featureIds.includes('uhd')
            ? streamingPrestigePictureBonus(plan.pictureRank ?? STREAMING_4K_RANK, bestRivalPictureRank) : 0)
        + (cohort.primaryPersonaId === 'VALUE_SEEKERS' && plan.ads ? ads.valueBonus : 0)
        // Smarter ad breaks (#61): the player's ads cost it less with viewers; a rival's factor is 1
        - (plan.ads ? (100 - cohort.priceSensitivityIndex) * ads.penalty * (offer.adPenaltyFactor ?? 1) : 0)
        // #106 a phones-only plan: a home that watches on a TV gives it up, one that watches on a phone alone loses
        // nothing, and a price-minded home minds the small screen less, so it draws where many homes have a phone and
        // no TV, and the price-minded everywhere
        - (plan.mobileOnly ? STREAMING_MOBILE_PLAN.tvHomePenalty * (1 - (offer.phoneOnlyShareByCountry?.[countryId] ?? 0))
            * (1 - cohort.priceSensitivityIndex / 250) : 0);
    const countryCatalogue = offer.subscriptionCatalogueStrengthByCountry?.[countryId]
        ?? offer.catalogueStrengthByCountry?.[countryId] ?? offer.catalogueStrengthIndex;
    const catalogueFit = countryCatalogue
        + (cohort.primaryPersonaId === 'FANDOM_LOYALISTS' ? countryCatalogue * .16 : 0);
    // The player's offer carries its region subtitles and dubbing per market.
    const localizationStrength = offer.localizationStrengthByCountry?.[countryId] ?? offer.localizationStrengthIndex;
    const localizationFit = localizationStrength
        + (cohort.primaryPersonaId === 'LOCAL_FIRST' ? localizationStrength * .22 : 0);
    const trustFit = offer.reliabilityIndex
        + (cohort.primaryPersonaId === 'HABIT_STREAMERS' ? offer.loyaltyIndex * .16 : 0);
    const momentum = clamp(offer.countryMomentum[countryId] || 0, -20, 20);
    const commercialAccessFit = offer.commercialConfiguration
        ? calculateStreamingCommercialAudienceAdjustment(offer.commercialConfiguration)
        : 0;
    // A monthly bundle must earn its price through expected use. Low-use
    // households can buy a few titles instead; frequent viewers value a bundle.
    // This changes willingness, never the household's spending power.
    const expectedTitles = (.5 + cohort.entertainmentAppetiteIndex / 10)
        * clamp(countryCatalogue / 100, .1, 1);
    const usageValue = clamp(100 - billingPrice
        / Math.max(.5, expectedTitles * transactionalPrice) * 50, -100, 90);
    const utility = round2(
        affordability * (.18 + cohort.priceSensitivityIndex / 500)
        + featureFit * .19
        + catalogueFit * .21
        + localizationFit * .13
        + offer.reputationIndex * .1
        + trustFit * .1
        + getWorldStreamingOfferMarketing(offer, countryId) * .05
        + offer.loyaltyIndex * .04
        + momentum
        + participation.streamingInterestIndex * .08
        + commercialAccessFit
        + (usageValue - 50) * .4,
    );
    const drivers = [
        { id: 'PRICE_FIT', value: affordability * (.18 + cohort.priceSensitivityIndex / 500) },
        { id: 'PLAN_FIT', value: featureFit * .19 },
        { id: 'CATALOGUE_FIT', value: catalogueFit * .21 },
        { id: 'LOCALIZATION_FIT', value: localizationFit * .13 },
        { id: 'TRUST', value: trustFit * .1 },
    ];
    return { utility, driver: drivers.sort((left, right) => right.value - left.value || left.id.localeCompare(right.id))[0].id };
};

const allocateBillingPath = (
    countryId: string,
    cohort: WorldAudienceCohortState,
    participation: WorldAudienceParticipationCohortState,
    offers: WorldStreamingPlatformOffer[],
    billingPath: StreamingBillingPath,
    reachableHouseholds: number,
    totalBudget: number,
    transactionalOffers: WorldStreamingPlatformOffer[],
): BillingPathAllocation => {
    if (!reachableHouseholds || !totalBudget || !offers.length) {
        return { billingPath, reachableHouseholds, subscribingHouseholds: 0, totalSubscriptions: 0, totalBudget, totalSpend: 0, allocations: [] };
    }
    const budgetPerHousehold = totalBudget / reachableHouseholds;
    const publicRentalPrices = transactionalOffers.flatMap(offer => {
        const store = projectStreamingCommercialOffers(offer.commercialConfiguration).storeOffer;
        const weight=getWorldStreamingStoreStrength(offer,countryId)/100*getWorldStreamingOfferExposure(offer, countryId);
        return store?.eligibility.kind === 'PUBLIC' && store.rent > 0 && weight>0
            && store.rent <= budgetPerHousehold ? [{price:store.rent,weight}] : [];
    });
    /* The best 4K-HDR-or-better picture each offer sells, and so the best its rivals here sell. */
    const offerBestPicture = offers.map(offer => offer.plans.reduce((best, plan) => (
        plan.featureIds.includes('uhd') ? Math.max(best, plan.pictureRank ?? STREAMING_4K_RANK) : best), -1));
    const bestRivalPicture = (index: number): number => offerBestPicture.reduce((best, rank, other) => (
        other === index ? best : Math.max(best, rank)), STREAMING_4K_RANK);
    // A tiny/unseen store cannot set the whole market's value benchmark.
    const referencePrice=Math.max(.5,budgetPerHousehold/4);
    const transactionalPrice=(referencePrice+publicRentalPrices.reduce((sum,row)=>sum+row.price*row.weight,0))
        /(1+publicRentalPrices.reduce((sum,row)=>sum+row.weight,0));
    const candidates = offers.flatMap((offer, offerIndex) => {
        const rivalPicture = bestRivalPicture(offerIndex);
        const affordablePlans = offer.plans.filter(plan => (
            (billingPath === 'MONTHLY' ? plan.monthlyBillingPrice : plan.annualBillingMonthlyPrice) <= budgetPerHousehold + .001
        ));
        if (!affordablePlans.length) return [];
        const ranked = affordablePlans.map(plan => {
            const billingPrice = billingPath === 'MONTHLY' ? plan.monthlyBillingPrice : plan.annualBillingMonthlyPrice;
            return { plan, billingPrice, ...planUtility(cohort, participation, offer, plan, countryId, budgetPerHousehold, billingPrice, transactionalPrice, rivalPicture) };
        })
            .sort((left, right) => right.utility - left.utility || left.plan.id.localeCompare(right.plan.id));
        const best = ranked[0];
        // An affordable plan is only an option, not an automatic customer.
        // Awareness and catalogue depth affect both its share versus rivals
        // and the choice to subscribe at all.
        const countryCatalogue = offer.subscriptionCatalogueStrengthByCountry?.[countryId]
            ?? offer.catalogueStrengthByCountry?.[countryId] ?? offer.catalogueStrengthIndex;
        if (countryCatalogue <= 0) return [];
        const catalogueFit = clamp((countryCatalogue - 10) / 90, .02, 1);
        return [{ offer, plan: best.plan, billingPath, billingPrice: best.billingPrice, utility: best.utility,
            weight: Math.max(.0001, Math.exp(clamp((best.utility - 45) / 24, -3, 3))
                * catalogueFit * getWorldStreamingOfferExposure(offer, countryId) * getWorldStreamingDeviceReachFactor(offer)), driver: best.driver }];
    }).sort((left, right) => right.utility - left.utility || left.offer.platformId.localeCompare(right.offer.platformId));
    if (!candidates.length) {
        return { billingPath, reachableHouseholds, subscribingHouseholds: 0, totalSubscriptions: 0, totalBudget, totalSpend: 0, allocations: [] };
    }
    const willingnessRate = clamp(
        .12 + participation.streamingEligibilityIndex / 260 + participation.streamingInterestIndex / 210
        + cohort.entertainmentAppetiteIndex / 620 - cohort.piracyTendencyIndex / 1500,
        .08,
        .94,
    );
    // The outside option remains available even in a one-service market. A
    // launch-day offer with little catalogue therefore cannot inherit every
    // household merely because no rival happens to be present.
    const totalOfferWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    const paidChoiceShare = totalOfferWeight / (1 + totalOfferWeight);
    const subscribingHouseholds = Math.min(reachableHouseholds,
        Math.round(reachableHouseholds * willingnessRate * paidChoiceShare));
    const sortedPrices = candidates.map(candidate => candidate.billingPrice).sort((left, right) => left - right);
    let affordableServices = 0;
    let cumulativePrice = 0;
    for (const price of sortedPrices) {
        if (affordableServices >= 3 || cumulativePrice + price > budgetPerHousehold + .001) break;
        cumulativePrice += price;
        affordableServices += 1;
    }
    affordableServices = Math.max(1, affordableServices);
    const secondaryRate = affordableServices >= 2
        ? clamp(.08 + cohort.entertainmentAppetiteIndex / 420 + (budgetPerHousehold - sortedPrices[0]) / Math.max(1, budgetPerHousehold) * .18, .05, .48)
        : 0;
    const tertiaryRate = affordableServices >= 3 ? clamp((cohort.entertainmentAppetiteIndex - 55) / 500, 0, .12) : 0;
    const desiredSlots = subscribingHouseholds
        + Math.round(subscribingHouseholds * secondaryRate)
        + Math.round(subscribingHouseholds * tertiaryRate);
    const counts = distributeInteger(desiredSlots, candidates.map(candidate => candidate.weight), candidates.map(() => subscribingHouseholds));
    let spendCents = counts.reduce((sum, count, index) => sum + count * Math.round(candidates[index].billingPrice * 100), 0);
    const budgetCents = Math.round(totalBudget * 100);
    const removalOrder = candidates.map((candidate, index) => ({ candidate, index }))
        .sort((left, right) => right.candidate.billingPrice - left.candidate.billingPrice
            || left.candidate.utility - right.candidate.utility || left.index - right.index);
    for (const { candidate, index } of removalOrder) {
        if (spendCents <= budgetCents) break;
        const priceCents = Math.max(1, Math.round(candidate.billingPrice * 100));
        const remove = Math.min(counts[index], Math.ceil((spendCents - budgetCents) / priceCents));
        counts[index] -= remove;
        spendCents -= remove * priceCents;
    }
    const totalSubscriptions = counts.reduce((sum, count) => sum + count, 0);
    const actualSubscribingHouseholds = Math.min(subscribingHouseholds, totalSubscriptions);
    const primaryCounts = distributeInteger(actualSubscribingHouseholds, candidates.map(candidate => candidate.weight), counts);
    return {
        billingPath,
        reachableHouseholds,
        subscribingHouseholds: actualSubscribingHouseholds,
        totalSubscriptions,
        totalBudget,
        totalSpend: round2(spendCents / 100),
        allocations: candidates.flatMap((candidate, index) => counts[index] > 0 ? [{
            ...candidate,
            households: counts[index],
            primaryHouseholds: primaryCounts[index],
        }] : []),
    };
};

/* Pay yearly (#71): the pools choose who subscribes to what; how the player's subscribers pay follows its
   discount. The odds that one pays yearly grow in step with it (15% keeps the pools' split, so the market is
   exactly as before), and those who switch take their homes and what they spend to the other path. A switch
   to a dearer price stops where that path's budget runs out. Rivals keep the pools' split. */
const rebillPlayerSubscribers = (monthly: BillingPathAllocation, annual: BillingPathAllocation): void => {
    const mine = (path: BillingPathAllocation) => path.allocations.find(row => row.offer.isPlayer);
    const offer = (mine(monthly) || mine(annual))?.offer;
    const discount = offer?.annualDiscountPercent ?? STREAMING_REFERENCE_ANNUAL_DISCOUNT;
    if (!offer || discount === STREAMING_REFERENCE_ANNUAL_DISCOUNT) return;
    const yearly = mine(annual)?.households || 0;
    const total = (mine(monthly)?.households || 0) + yearly;
    if (!total) return;
    const shift = Math.round(total * streamingAnnualBillingShare(discount, yearly / total)) - yearly;
    if (!shift) return;
    const [from, to] = shift > 0 ? [monthly, annual] : [annual, monthly];
    const source = mine(from)!;
    const price = (plan: Candidate['plan']) => to.billingPath === 'MONTHLY' ? plan.monthlyBillingPrice : plan.annualBillingMonthlyPrice;
    let target = mine(to);
    if (!target) {
        /* both pools hold the same budget a home */
        const homes = from.reachableHouseholds + to.reachableHouseholds;
        if (!homes || price(source.plan) > (from.totalBudget + to.totalBudget) / homes + .001) return;
        target = { ...source, billingPath: to.billingPath, billingPrice: price(source.plan), households: 0, primaryHouseholds: 0 };
        to.allocations.push(target);
    }
    const dearer = target.billingPrice - source.billingPrice;
    const room = dearer > 0 ? Math.max(0, Math.floor((to.totalBudget - to.totalSpend + .001) / dearer)) : source.households;
    const moved = Math.min(Math.abs(shift), source.households, room);
    if (!moved) {
        if (!target.households) to.allocations.splice(to.allocations.indexOf(target), 1);
        return;
    }
    const homes = Math.min(source.primaryHouseholds, Math.round(moved * source.primaryHouseholds / source.households));
    const spend = round2(moved * source.billingPrice);
    source.households -= moved;
    source.primaryHouseholds -= homes;
    target.households += moved;
    target.primaryHouseholds += homes;
    from.reachableHouseholds -= homes;
    to.reachableHouseholds += homes;
    from.subscribingHouseholds -= homes;
    to.subscribingHouseholds += homes;
    from.totalSubscriptions -= moved;
    to.totalSubscriptions += moved;
    from.totalBudget = round2(from.totalBudget - spend);
    to.totalBudget = round2(to.totalBudget + spend);
    from.totalSpend = round2(from.totalSpend - spend);
    to.totalSpend = round2(to.totalSpend + moved * target.billingPrice);
    if (!source.households) from.allocations.splice(from.allocations.indexOf(source), 1);
};

export const allocateWorldStreamingCohort = (
    countryId: string,
    cohort: WorldAudienceCohortState,
    participation: WorldAudienceParticipationCohortState,
    offers: WorldStreamingPlatformOffer[],
    transactionalOffers: WorldStreamingPlatformOffer[] = offers,
): CohortAllocation => {
    const reachableHouseholds = participation.streamingOnlyHouseholds + participation.dualParticipantHouseholds;
    const totalBudget = Math.max(0, participation.totalMonthlyStreamingBudget);
    const annualHomes = Math.round(reachableHouseholds * STREAMING_ANNUAL_BILLING_SHARE);
    const monthlyHomes = reachableHouseholds - annualHomes;
    const monthlyBudget = reachableHouseholds > 0 ? round2(totalBudget * monthlyHomes / reachableHouseholds) : 0;
    const paths = [
        allocateBillingPath(countryId, cohort, participation, offers, 'MONTHLY', monthlyHomes, monthlyBudget, transactionalOffers),
        allocateBillingPath(countryId, cohort, participation, offers, 'ANNUAL', annualHomes, round2(totalBudget - monthlyBudget), transactionalOffers),
    ];
    rebillPlayerSubscribers(paths[0], paths[1]);
    return {
        reachableHouseholds,
        subscribingHouseholds: paths.reduce((sum, path) => sum + path.subscribingHouseholds, 0),
        totalSubscriptions: paths.reduce((sum, path) => sum + path.totalSubscriptions, 0),
        totalBudget,
        totalSpend: round2(paths.reduce((sum, path) => sum + path.totalSpend, 0)),
        allocations: paths.flatMap(path => path.allocations),
        paths,
    };
};

const createCountry = (
    countryId: string,
    player: Player,
    offersById: Map<string, WorldStreamingPlatformOffer>,
    offerIds: string[],
): WorldStreamingCompetitionCountryState => {
    const audience = player.world.worldAudienceEconomy!.countries[countryId];
    const participation = player.world.worldAudienceParticipation!.countries[countryId];
    const offers = offerIds.map(id => offersById.get(id)).filter((offer): offer is WorldStreamingPlatformOffer => Boolean(offer));
    const platformRows = new Map<string, WorldStreamingPlatformAllocation>();
    let subscribingHouseholds = 0;
    let totalSubscriptions = 0;
    let totalSpend = 0;
    audience.cohorts.forEach(cohort => {
        const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
        if (!overlay) return;
        const result = allocateWorldStreamingCohort(countryId, cohort, overlay, offers);
        subscribingHouseholds += result.subscribingHouseholds;
        totalSubscriptions += result.totalSubscriptions;
        totalSpend = round2(totalSpend + result.totalSpend);
        result.allocations.forEach(allocation => {
            const current = platformRows.get(allocation.offer.platformId) || {
                platformId: allocation.offer.platformId,
                platformName: allocation.offer.name,
                households: 0,
                primaryHouseholds: 0,
                monthlySubscriptionRevenue: 0,
                planAllocations: [],
                strongestDriver: allocation.driver,
            };
            current.households += allocation.households;
            current.primaryHouseholds += allocation.primaryHouseholds;
            const revenue = round2(allocation.households * allocation.billingPrice);
            current.monthlySubscriptionRevenue = round2(current.monthlySubscriptionRevenue + revenue);
            const planRow = current.planAllocations.find(row => row.planId === allocation.plan.id);
            if (planRow) {
                planRow.households += allocation.households;
                planRow.monthlyHouseholds += allocation.billingPath === 'MONTHLY' ? allocation.households : 0;
                planRow.annualHouseholds += allocation.billingPath === 'ANNUAL' ? allocation.households : 0;
                planRow.monthlySubscriptionRevenue = round2(planRow.monthlySubscriptionRevenue + revenue);
                planRow.effectiveMonthlyPrice = round2(planRow.monthlySubscriptionRevenue / planRow.households);
            } else {
                current.planAllocations.push({
                    planId: allocation.plan.id,
                    planName: allocation.plan.name,
                    households: allocation.households,
                    monthlyHouseholds: allocation.billingPath === 'MONTHLY' ? allocation.households : 0,
                    annualHouseholds: allocation.billingPath === 'ANNUAL' ? allocation.households : 0,
                    effectiveMonthlyPrice: allocation.billingPrice,
                    monthlySubscriptionRevenue: revenue,
                });
            }
            platformRows.set(current.platformId, current);
        });
    });
    const platformAllocations = [...platformRows.values()]
        .map(row => ({ ...row, planAllocations: row.planAllocations.sort((left, right) => left.planId.localeCompare(right.planId)) }))
        .sort((left, right) => right.households - left.households || left.platformId.localeCompare(right.platformId));
    return {
        countryId,
        streamingReachableHouseholds: participation.streamingReachableHouseholds,
        subscribingHouseholds,
        unclaimedHouseholds: participation.streamingReachableHouseholds - subscribingHouseholds,
        totalSubscriptions,
        totalMonthlyStreamingBudget: participation.totalMonthlyStreamingBudget,
        totalMonthlySubscriptionSpend: round2(totalSpend),
        evaluatedCohortCount: audience.cohorts.length,
        eligiblePlatformCount: offers.length,
        platformAllocations,
    };
};

const mergePlans = (rows: WorldStreamingPlatformAllocation[]): WorldStreamingPlanAllocation[] => {
    const plans = new Map<string, WorldStreamingPlanAllocation>();
    rows.flatMap(row => row.planAllocations).forEach(row => {
        const current = plans.get(row.planId);
        if (current) {
            current.households += row.households;
            current.monthlyHouseholds += row.monthlyHouseholds;
            current.annualHouseholds += row.annualHouseholds;
            current.monthlySubscriptionRevenue = round2(current.monthlySubscriptionRevenue + row.monthlySubscriptionRevenue);
            current.effectiveMonthlyPrice = current.households > 0
                ? round2(current.monthlySubscriptionRevenue / current.households) : 0;
        } else plans.set(row.planId, { ...row });
    });
    return [...plans.values()].sort((left, right) => left.planId.localeCompare(right.planId));
};

const createGlobal = (
    countries: Record<string, WorldStreamingCompetitionCountryState>,
    offerCount: number,
    playerOfferPresent: boolean,
): WorldStreamingCompetitionGlobalSummary => {
    const values = Object.values(countries);
    const playerRows = values.flatMap(country => country.platformAllocations.filter(row => row.platformId === 'PLAYER'));
    return {
        streamingReachableHouseholds: values.reduce((sum, row) => sum + row.streamingReachableHouseholds, 0),
        subscribingHouseholds: values.reduce((sum, row) => sum + row.subscribingHouseholds, 0),
        unclaimedHouseholds: values.reduce((sum, row) => sum + row.unclaimedHouseholds, 0),
        totalSubscriptions: values.reduce((sum, row) => sum + row.totalSubscriptions, 0),
        totalMonthlyStreamingBudget: values.reduce((sum, row) => sum + row.totalMonthlyStreamingBudget, 0),
        totalMonthlySubscriptionSpend: round2(values.reduce((sum, row) => sum + row.totalMonthlySubscriptionSpend, 0)),
        playerHouseholds: playerRows.reduce((sum, row) => sum + row.households, 0),
        playerPrimaryHouseholds: playerRows.reduce((sum, row) => sum + row.primaryHouseholds, 0),
        playerMonthlySubscriptionRevenue: round2(playerRows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
        playerPlanAllocations: mergePlans(playerRows),
        playerOfferPresent,
        countryCount: values.length,
        offerCount,
    };
};

const snapshot = (absoluteWeek: number, global: WorldStreamingCompetitionGlobalSummary): WorldStreamingCompetitionSnapshot => ({
    absoluteWeek,
    subscribingHouseholds: global.subscribingHouseholds,
    totalSubscriptions: global.totalSubscriptions,
    playerHouseholds: global.playerHouseholds,
    playerMonthlySubscriptionRevenue: global.playerMonthlySubscriptionRevenue,
});

const preparePlayer = (player: Player, absoluteWeek: number): Player => {
    const population = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
    const audience = normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy, population, absoluteWeek);
    const participation = normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation, population, audience, absoluteWeek);
    return { ...player, world: { ...player.world, worldPopulation: population, worldAudienceEconomy: audience, worldAudienceParticipation: participation } };
};

const buildState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingCompetitionSnapshot[],
): WorldStreamingCompetitionState => {
    const prepared = preparePlayer(player, absoluteWeek);
    const offers = getWorldStreamingOffers(prepared, absoluteWeek);
    const offerMap = new Map(offers.offers.map(offer => [offer.platformId, offer]));
    const countries = Object.fromEntries(Object.keys(prepared.world.worldAudienceParticipation!.countries).sort().map(countryId => [
        countryId,
        createCountry(countryId, prepared, offerMap, offers.byCountry[countryId] || []),
    ]));
    const global = createGlobal(countries, offers.offers.length, offers.offers.some(offer => offer.isPlayer));
    return {
        schemaVersion: WORLD_STREAMING_COMPETITION_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('world-streaming-competition-source',
            absoluteWeek, prepared.world.worldPopulation!.lastProcessedAbsoluteWeek,
            prepared.world.worldAudienceEconomy!.lastProcessedAbsoluteWeek,
            prepared.world.worldAudienceParticipation!.lastProcessedAbsoluteWeek, offers.fingerprint),
        countries,
        global,
        snapshots,
    };
};

export const createWorldStreamingCompetitionState = (player: Player, absoluteWeek: number): WorldStreamingCompetitionState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const state = buildState(player, week, week, []);
    return { ...state, snapshots: [snapshot(week, state.global)] };
};

const structurallyValid = (state: unknown): state is WorldStreamingCompetitionState => {
    if (!state || typeof state !== 'object') return false;
    const input = state as Partial<WorldStreamingCompetitionState>;
    if (input.schemaVersion !== 1 || !input.countries || !input.global || typeof input.global.playerOfferPresent !== 'boolean' || !Array.isArray(input.snapshots) || input.snapshots.length > MAX_SNAPSHOTS) return false;
    const countries = Object.values(input.countries);
    if (!countries.length || input.global.countryCount !== countries.length) return false;
    const validCountries = countries.every(country => {
        if (!country || !Array.isArray(country.platformAllocations)) return false;
        if (country.subscribingHouseholds + country.unclaimedHouseholds !== country.streamingReachableHouseholds) return false;
        if (country.totalMonthlySubscriptionSpend < 0 || country.totalMonthlySubscriptionSpend > country.totalMonthlyStreamingBudget + .01) return false;
        if (country.totalSubscriptions !== country.platformAllocations.reduce((sum, row) => sum + row.households, 0)) return false;
        return country.platformAllocations.every(row => row.households === row.planAllocations.reduce((sum, plan) => sum + plan.households, 0)
            && Math.abs(row.monthlySubscriptionRevenue - row.planAllocations.reduce((sum, plan) => sum + plan.monthlySubscriptionRevenue, 0)) < .011
            && row.planAllocations.every(plan => Number.isInteger(plan.monthlyHouseholds)
                && Number.isInteger(plan.annualHouseholds)
                && plan.monthlyHouseholds >= 0 && plan.annualHouseholds >= 0
                && plan.monthlyHouseholds + plan.annualHouseholds === plan.households));
    });
    if (!validCountries) return false;
    const playerRows = countries.flatMap(country => country.platformAllocations.filter(row => row.platformId === 'PLAYER'));
    const playerPlans = mergePlans(playerRows);
    const savedPlayerPlans = input.global.playerPlanAllocations;
    const playerPlansMatch = Array.isArray(savedPlayerPlans)
        && savedPlayerPlans.length === playerPlans.length
        && savedPlayerPlans.every((saved, index) => {
            const expected = playerPlans[index];
            return Boolean(expected)
                && saved.planId === expected.planId
                && saved.planName === expected.planName
                && saved.households === expected.households
                && saved.monthlyHouseholds === expected.monthlyHouseholds
                && saved.annualHouseholds === expected.annualHouseholds
                && saved.effectiveMonthlyPrice === expected.effectiveMonthlyPrice
                && saved.monthlySubscriptionRevenue === expected.monthlySubscriptionRevenue;
        });
    return input.global.streamingReachableHouseholds === countries.reduce((sum, country) => sum + country.streamingReachableHouseholds, 0)
        && input.global.subscribingHouseholds === countries.reduce((sum, country) => sum + country.subscribingHouseholds, 0)
        && input.global.unclaimedHouseholds === countries.reduce((sum, country) => sum + country.unclaimedHouseholds, 0)
        && input.global.totalSubscriptions === countries.reduce((sum, country) => sum + country.totalSubscriptions, 0)
        && Math.abs(input.global.totalMonthlySubscriptionSpend - round2(countries.reduce((sum, country) => sum + country.totalMonthlySubscriptionSpend, 0))) < .011
        && input.global.playerHouseholds === playerRows.reduce((sum, row) => sum + row.households, 0)
        && input.global.playerPrimaryHouseholds === playerRows.reduce((sum, row) => sum + row.primaryHouseholds, 0)
        && Math.abs(input.global.playerMonthlySubscriptionRevenue - round2(playerRows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0))) < .011
        && playerPlansMatch;
};

export const normalizeWorldStreamingCompetitionState = (
    input: unknown,
    player: Player,
    absoluteWeek: number,
): WorldStreamingCompetitionState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const rebuilt = createWorldStreamingCompetitionState(player, week);
    if (!structurallyValid(input)) return rebuilt;
    if (input.lastProcessedAbsoluteWeek === week && input.sourceFingerprint === rebuilt.sourceFingerprint) return input;
    const crossedYear = Math.floor(week / 52) > Math.floor(input.lastProcessedAbsoluteWeek / 52);
    const snapshots = crossedYear
        ? [...input.snapshots, snapshot(week, rebuilt.global)].slice(-MAX_SNAPSHOTS)
        : input.snapshots.slice(-MAX_SNAPSHOTS);
    return { ...rebuilt, initializedAtAbsoluteWeek: input.initializedAtAbsoluteWeek, snapshots };
};

export const advanceWorldStreamingCompetitionToWeek = normalizeWorldStreamingCompetitionState;

export const getWorldStreamingPlayerOutcome = (
    state: WorldStreamingCompetitionState | undefined,
): (Pick<WorldStreamingCompetitionGlobalSummary, 'playerHouseholds' | 'playerPrimaryHouseholds' | 'playerMonthlySubscriptionRevenue' | 'playerPlanAllocations'> & {
    households: number;
    planAllocations: WorldStreamingPlanAllocation[];
    monthlySubscriptionRevenue: number;
}) | null => {
    if (!state || !structurallyValid(state) || !state.global.playerOfferPresent) return null;
    return {
        households: state.global.playerHouseholds,
        playerHouseholds: state.global.playerHouseholds,
        playerPrimaryHouseholds: state.global.playerPrimaryHouseholds,
        playerMonthlySubscriptionRevenue: state.global.playerMonthlySubscriptionRevenue,
        playerPlanAllocations: state.global.playerPlanAllocations,
        // Compact consumer alias used by weekly and UI adapters.
        planAllocations: state.global.playerPlanAllocations,
        monthlySubscriptionRevenue: state.global.playerMonthlySubscriptionRevenue,
    };
};
