import type {Player, WorldStreamingViewingState, WorldStreamingPlatformOffer, StreamingRoyaltyRevenueSource} from '../../types';
import {allocateStreamingSubscriptionReceipts} from '../streamingEconomyCore';
import {createStreamingCatalogueReadContext, evaluatePlayerStreamingTitleRoute} from '../streamingContentAvailability';
import type {StreamingTitleAccessRoute} from '../streamingTitleAccess';
import {createAiTitleAccessResolver} from './worldStreamingAiCatalogue';
import {allocateStreamingStoreUnits} from './worldStreamingCommercialEconomy';
import {streamingTitleFreshness, streamingTitleQuality} from './worldStreamingContentValue';

type Receipts = NonNullable<WorldStreamingViewingState['royaltyReceipts']>;
/** Conserved contribution attribution; this does not create customer revenue or measure causal profit. */
export const attachStreamingRoyaltyReceipts = (
    player: Player, state: WorldStreamingViewingState, offers: WorldStreamingPlatformOffer[],
): WorldStreamingViewingState => {
    const week = state.lastProcessedAbsoluteWeek;
    const receipts: Receipts = [];
    const titleFacts=createStreamingCatalogueReadContext(player);
    // Facts are immutable within this close; reuse them across countries/plans.
    const qualityCache = new Map<string, number>();
    const titleQuality = (projectId: string): number => {
        const cached = qualityCache.get(projectId);
        if (cached !== undefined) return cached;
        const quality = streamingTitleQuality(player, projectId, titleFacts);
        qualityCache.set(projectId, quality);
        return quality;
    };
    const signedContractIds=new Set([...Object.keys(player.world.streamingRightsContracts || {}),
        ...player.ownedStreamingPlatform.catalogLicenses.map(row=>row.id),
        ...Object.values(player.world.platforms || {}).flatMap(platform=>platform.ai?.rightsContracts?.map(row=>row.id) || [])]);
    for (const offer of offers) {
        const summary = state.platforms[offer.platformId];
        if (!summary) continue;
        const aiResolve = offer.isPlayer ? null : createAiTitleAccessResolver(player, offer, state.aiCatalogue || []);
        const titleMap = new Map(summary.titlePerformance.map(row => [row.projectId, row]));
        // Free/ad and store-only services legitimately have no subscription customer row.
        const countries = [...new Set([...Object.keys(state.countries),
            ...Object.keys(player.world.worldStreamingCustomers?.countries || {})])]
            .filter(countryId=>offer.activeCountryIds.includes(countryId)).map(countryId=>({country:{countryId},
                customer:player.world.worldStreamingCustomers?.countries[countryId]?.platformSummaries.find(row=>row.platformId===offer.platformId)
                    || {monthlySubscriptionRevenue:0,planAllocations:[],endingPaidAccounts:0,joins:0,reactivations:0}}));
        const totalWeekly = Math.max(0, Math.round(countries.reduce((sum, row) => sum + row.customer!.monthlySubscriptionRevenue, 0) / 4.33));
        const countryPools = allocateStreamingStoreUnits(totalWeekly, countries.map(row => row.customer!.monthlySubscriptionRevenue));
        const resolveEligible = (countryId: string, route: StreamingTitleAccessRoute) => {
            if (aiResolve) return [...new Map(aiResolve(countryId, week, route).map(row => [row.titleId, {
                projectId: row.titleId, contractId: row.contractId, startsAt: row.startsAtAbsoluteWeek}])).values()];
            return summary.titlePerformance.flatMap(title => {
                const decision = evaluatePlayerStreamingTitleRoute(player, title.projectId, countryId, week, route);
                return decision.allowed ? [{projectId: title.projectId, contractId: decision.contractId,
                    startsAt: week - title.weeksAvailable + 1}] : [];
            });
        };
        const routeCache = new Map<string, ReturnType<typeof resolveEligible>>();
        const eligible = (countryId: string, route: StreamingTitleAccessRoute) => {
            const key = JSON.stringify([countryId, route]);
            const cached = routeCache.get(key);
            if (cached) return cached;
            const positions = resolveEligible(countryId, route);
            routeCache.set(key, positions);
            return positions;
        };
        if (offer.isPlayer) for (const title of summary.titlePerformance) {
            title.revenue.attributedSubscriptionRevenue = 0;
            for (const country of title.countryPerformance) country.revenue.attributedSubscriptionRevenue = 0;
        }
        countries.forEach(({country, customer}, countryIndex) => {
            const countryId = country.countryId;
            const plans = customer!.planAllocations;
            const delivered = offer.isPlayer ? state.countries[countryId] : state.countries[countryId]?.platformPerformance?.[offer.platformId];
            const countryTitle = (id: string) => titleMap.get(id)?.countryPerformance.find(row => row.countryId === countryId);
            const positionWeight = (position: ReturnType<typeof eligible>[number], route: StreamingTitleAccessRoute) => {
                const row = countryTitle(position.projectId);
                if (!offer.isPlayer) return (.15 + titleQuality(position.projectId) / 100)
                    * (.55 + .45 * streamingTitleFreshness(week - position.startsAt + 1));
                return route.kind === 'SUBSCRIPTION' ? row?.accessMix.paidViewingAccounts || 0
                    : route.kind === 'AD_SUPPORTED' ? row?.accessMix.freeViewingAccounts || 0
                    : row?.accessMix.storeViewingAccounts || 0;
            };
            const planPools = allocateStreamingStoreUnits(countryPools[countryIndex] || 0, plans.map(plan => plan.monthlySubscriptionRevenue));
            const planViewers = allocateStreamingStoreUnits(delivered?.accessMix.paidViewingAccounts || 0, plans.map(plan => plan.paidAccounts));
            plans.forEach((plan, planIndex) => {
                const route: StreamingTitleAccessRoute = {kind: 'SUBSCRIPTION', planId: plan.planId};
                const positions = eligible(countryId, route);
                const accounts = allocateStreamingStoreUnits(planViewers[planIndex] || 0, positions.map(position => positionWeight(position, route)));
                const signals = positions.map((position, index) => {
                    const title = titleMap.get(position.projectId);
                    const row = countryTitle(position.projectId);
                    const paidFraction = row ? row.accessMix.paidViewingAccounts / Math.max(1, row.viewingAccounts) : 0;
                    const accountFraction = accounts[index] / Math.max(1, planViewers[planIndex] || 0);
                    const planFraction = plan.paidAccounts / Math.max(1, customer!.endingPaidAccounts);
                    // Preserve the title's existing freshness/marketing acquisition and retention signals.
                    const titleFraction = accounts[index] / Math.max(1, title?.accessMix.paidViewingAccounts || 0);
                    return {...position, viewingAccounts: accounts[index],
                        watchHours: offer.isPlayer ? (row?.hoursViewed || 0) * paidFraction
                            * accounts[index] / Math.max(1, row?.accessMix.paidViewingAccounts || 0)
                            : (delivered?.totalHoursViewed || 0) * (delivered?.accessMix.paidViewingAccounts || 0)
                                / Math.max(1, delivered?.totalViewingAccounts || 0) * planFraction * accountFraction,
                        subscriberAcquisition: offer.isPlayer ? (title?.acquisitionAttributedAccounts || 0) * titleFraction
                            : (customer!.joins + customer!.reactivations) * planFraction * accountFraction,
                        subscriberRetention: offer.isPlayer ? (title?.retentionAttributedAccounts || 0) * titleFraction
                            : Math.max(0, customer!.endingPaidAccounts - customer!.joins - customer!.reactivations) * planFraction * accountFraction,
                        advertisingRevenue: 0, transactionalRevenue: 0, taxesRefundsAndStorefrontFees: 0};
                });
                const allocations = allocateStreamingSubscriptionReceipts({weeklySubscriptionRevenueFullCurrency: planPools[planIndex] || 0, titles: signals});
                for (const allocation of allocations) {
                    if (allocation.attributedSubscriptionRevenue <= 0) continue;
                    receipts.push({receiptId: JSON.stringify([week, offer.platformId, countryId, plan.planId, allocation.projectId, 'SUBSCRIPTION']),
                        platformId: offer.platformId, countryId, projectId: allocation.projectId, contractId: allocation.contractId,
                        planId: plan.planId, kind: 'SUBSCRIPTION', sourceKind: 'SUBSCRIPTION', grossReceipts: allocation.attributedSubscriptionRevenue});
                    if (offer.isPlayer) {
                        titleMap.get(allocation.projectId)!.revenue.attributedSubscriptionRevenue += allocation.attributedSubscriptionRevenue;
                        const row = countryTitle(allocation.projectId);
                        if (row) row.revenue.attributedSubscriptionRevenue += allocation.attributedSubscriptionRevenue;
                    }
                }
            });
            let sourceIndex = 0;
            const appendSource = (sourceKind: StreamingRoyaltyRevenueSource, gross: number, routes: Array<{route: StreamingTitleAccessRoute; weight: number}>, projectId?: string) => {
                const index = sourceIndex++;
                const routePools = allocateStreamingStoreUnits(gross, routes.map(row => row.weight));
                routes.forEach(({route}, routeIndex) => {
                    const positions = eligible(countryId, route).filter(row => !projectId || row.projectId === projectId);
                    const amounts = allocateStreamingStoreUnits(routePools[routeIndex] || 0, positions.map(row => positionWeight(row, route)));
                    positions.forEach((position, titleIndex) => {
                        if (!(amounts[titleIndex] > 0)) return;
                        receipts.push({receiptId: JSON.stringify([week, offer.platformId, countryId, 'NON_STORE', index, routeIndex, position.projectId]),
                            platformId: offer.platformId, countryId, projectId: position.projectId, contractId: position.contractId,
                            kind: 'NON_STORE', sourceKind, grossReceipts: amounts[titleIndex], ...(route.kind === 'SUBSCRIPTION' ? {planId: route.planId} : {})});
                    });
                });
            };
            for (const source of state.royaltySourceReceipts || []) {
                if (source.platformId !== offer.platformId || source.countryId !== countryId) continue;
                if (source.sourceKind === 'SUBSCRIPTION') appendSource('ANCILLARY', source.grossReceipts,
                    [{route: {kind: 'SUBSCRIPTION', planId: source.planId || ''}, weight: 1}], source.projectId);
                else if (source.sourceKind === 'FREE_AD') appendSource('ANCILLARY', source.grossReceipts,
                    [{route: {kind: 'AD_SUPPORTED'}, weight: 1}], source.projectId);
                else {
                    // A store customer can fund extras only against their actually delivered store title/mode.
                    const entitlements = offer.isPlayer
                        ? [...(player.world.worldStreamingAudienceChoice?.entitlements || []),
                            ...(state.commercialTransactions || []).map(row => ({...row, platformId: 'PLAYER',
                                expiresAtAbsoluteWeek: row.kind === 'PURCHASE' ? null : week + offer.commercialConfiguration.rentals.windowWeeks}))]
                        : state.aiStoreEntitlements || [];
                    const weights = (['RENTAL', 'PURCHASE'] as const).map(kind => entitlements.filter(row => row.countryId === countryId
                        && row.platformId === offer.platformId && (!source.projectId || row.titleId === source.projectId)
                        && row.kind === kind && (row.expiresAtAbsoluteWeek === null || row.expiresAtAbsoluteWeek > week))
                        .reduce((sum, row) => sum + row.households, 0));
                    appendSource('ANCILLARY', source.grossReceipts, [{route: {kind: 'RENTAL'}, weight: weights[0]},
                        {route: {kind: 'PURCHASE'}, weight: weights[1]}], source.projectId);
                }
            }
            // Business-funded ads follow actual ad-supported access; sponsorship follows delivered audiences.
            const businessSources = offer.isPlayer ? summary.titlePerformance.map(title => ({projectId: title.projectId,
                revenue: countryTitle(title.projectId)?.revenue, mix: countryTitle(title.projectId)?.accessMix}))
                : [{projectId: undefined, revenue: delivered?.revenue, mix: delivered?.accessMix}];
            for (const source of businessSources) {
                const paid = source.mix?.paidViewingAccounts || 0;
                const free = source.mix?.freeViewingAccounts || 0;
                const routes = [{route: {kind: 'AD_SUPPORTED'} as StreamingTitleAccessRoute, weight: free},
                    ...plans.map(plan => ({route: {kind: 'SUBSCRIPTION', planId: plan.planId} as StreamingTitleAccessRoute,
                        weight: paid * plan.paidAccounts / Math.max(1, customer!.endingPaidAccounts)}))];
                appendSource('ADVERTISING', source.revenue?.advertisingRevenue || 0, routes.map(row => ({...row,
                    weight: row.route.kind === 'SUBSCRIPTION' && !offer.plans.find(plan => plan.id === (row.route as Extract<StreamingTitleAccessRoute, {kind: 'SUBSCRIPTION'}>).planId)?.ads ? 0 : row.weight})), source.projectId);
                appendSource('SPONSORSHIP', source.revenue?.sponsorshipRevenue || 0, routes, source.projectId);
            }
        });
        if (offer.isPlayer) {
            summary.revenue.attributedSubscriptionRevenue = totalWeekly;
            for (const country of Object.values(state.countries)) country.revenue.attributedSubscriptionRevenue = summary.titlePerformance.reduce((sum, title) => sum
                + (title.countryPerformance.find(row => row.countryId === country.countryId)?.revenue.attributedSubscriptionRevenue || 0), 0);
        }
    }
    // Legacy AI catalogue placeholders have no signed financial obligation. They
    // still consume contribution weight, but do not need thousands of fake invoices.
    // Funding rows are transient clearing evidence; the routed result is retained.
    const {royaltySourceReceipts:_funding,...settledState}=state;
    return {...settledState, royaltyReceipts: receipts.filter(row=>row.platformId==='PLAYER'
        || !!row.contractId && signedContractIds.has(row.contractId))};
};
