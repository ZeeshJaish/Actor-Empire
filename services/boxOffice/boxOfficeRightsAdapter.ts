import { CINEMA_RIGHTS_PROFILE as P } from './boxOfficeProfiles';
import { getPlatformAiSpendingRestrictions } from '../platformAi/platformAiFinancing';
import { cinemaStreamingLanguageReady } from './boxOfficeStreamingAudience';
import type { Player, ProjectDetails, StreamingBiddingPlatformInput } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { getForbesStreamingCompanies } from '../streamingPlatformEcosystem';
import { getWorldStreamingBuyerCommercialOffer } from '../worldEconomy/worldStreamingOffers';
import { registerProductionStreamingRightsContract } from '../streamingRightsCore';
import { buildStreamingBiddingRightsLot, resolveStreamingRightsCompatibility } from '../streamingRightsCompatibility';
import { buildCinemaAwarenessSnapshot } from './boxOfficeExposureAdapters';
import { prepareCinemaAudienceWorld } from './boxOfficeWeek';
import { valueCinemaStreamingRights, type CinemaRightsQuote } from './boxOfficeRightsValue';
/** Read-only buyer value. Existing contracts and their payment history are never repriced. */
export const quoteCinemaRightsForBuyer = (player: Player, project: ProjectDetails, titleId: string, buyerId: string, startsAtAbsoluteWeek?: number, durationWeeks = 52, offeredCountryIds?: readonly string[], exclusivity: import('../../types').StreamingLicenseExclusivity = 'EXCLUSIVE', windowType: import('../../types').StreamingRightsWindowType = 'FIRST_WINDOW'): CinemaRightsQuote => {
    const now = getAbsoluteWeek(player.age, player.currentWeek), starts = Math.max(now, startsAtAbsoluteWeek ?? now);
    const prepared = prepareCinemaAudienceWorld(player, now), company = getForbesStreamingCompanies(prepared).find(c => c.id === buyerId);
    const offer = getWorldStreamingBuyerCommercialOffer(prepared, buyerId, now);
    const paid = prepared.world.cinemaMarket?.titles[titleId];
    const exact = offeredCountryIds ? resolveStreamingRightsCompatibility({ world: prepared.world, sourceProjectId: titleId, sellerPartyId: project.studioId, buyerPlatformId: buyerId,
        territory: 'MULTI_REGION', countryIds: [...offeredCountryIds], startsAtAbsoluteWeek: starts, expiresAtAbsoluteWeek: starts + durationWeeks, exclusivity, windowType }) : null;
    const lot = offeredCountryIds ? null : buildStreamingBiddingRightsLot({ world: prepared.world, sourceProjectId: titleId, sellerPartyId: project.studioId, startsAtAbsoluteWeek: starts, maximumDurationWeeks: durationWeeks, windowType }).lot;
    const active = new Set(offer?.activeCountryIds || company?.activeCountryIds || []), allowed = new Set(offeredCountryIds ? exact?.available ? offeredCountryIds : [] : lot?.countryIds || []);
    const awareness = buildCinemaAwarenessSnapshot(prepared, project, titleId);
    const old = prepared.world.cinemaMarket?.market.titles.find(t => t.titleId === titleId);
    const observedWeek = paid?.lastSettledWeek ?? now, decay = Math.pow(P.intentRetentionPerWeek, Math.max(0, now - observedWeek));
    const core = prepared.world.platforms?.[buyerId];
    const actualCash = Math.max(0, core ? core.cashReserve : (company?.cashMillions || 0)) * 1e6;
    const obligations = Object.values(prepared.world.streamingRightsContracts || {}).filter(c => c.buyer.platformId === buyerId && c.settlement.guarantee === 'PENDING')
        .reduce((n, c) => n + c.minimumGuarantee + c.productionFunding + c.futureSeasonFunding, 0);
    const monthly = offer?.plans.length ? Math.min(...offer.plans.map(p => p.effectiveMonthlyPrice).filter(p => p > 0)) : 0;
    const countries = Object.values(prepared.world.worldAudienceEconomy!.countries).filter(c => active.has(c.id) && allowed.has(c.id) && cinemaStreamingLanguageReady(prepared, titleId, c.id, buyerId, starts, project)).map(c => {
        const households = c.households, peoplePerHousehold = c.population / Math.max(1, households);
        const signal = paid?.audienceSignals?.countries.find(s => s.countryId === c.id);
        const current = awareness.cohorts.filter(a => a.countryId === c.id).reduce((n, a) => n + a.awarePeople, 0);
        const stateAware = old?.cells.filter(cell => cell.cohortId.startsWith(c.id + ':')).reduce((n, a) => n + a.awarePeople, 0) || 0;
        const aware = Math.min(c.population, Math.max(current, stateAware, (signal?.awarePeople || 0) * decay));
        const marketReach = prepared.world.worldAudienceParticipation!.countries[c.id]?.streamingReachableHouseholds || 0;
        const knownCustomers = prepared.world.worldStreamingCustomers?.countries[c.id]?.platformSummaries.find(p => p.platformId === buyerId)?.endingPaidAccounts;
        const footprintPeople = Object.values(prepared.world.worldAudienceEconomy!.countries).filter(m => active.has(m.id)).reduce((n, m) => n + m.households, 0);
        const countryHomes = (company?.subscribersMillions || 0) * 1e6 * c.households / Math.max(1, footprintPeople);
        const reachable = Math.max(0, Math.min(households, marketReach, (knownCustomers ?? countryHomes) * P.reachableSubscriberMultiple));
        const views = Math.max(prepared.world.cinemaMarket?.streamingSeen?.[titleId]?.countries[c.id] || 0, prepared.world.worldStreamingViewing?.countries[c.id]?.titlePerformance.find(t => t.projectId === titleId)?.viewingAccounts || 0);
        // Intent remains an uncertain subset of people aware of the title. Deferral overlaps that subset.
        return { countryId: c.id, reachableHouseholds: Math.floor(reachable), interestedHouseholds: Math.floor(aware / Math.max(1, peoplePerHousehold) * P.awarenessIntentShare),
            deferredHouseholds: Math.floor((signal?.deferredPeople || 0) * decay / Math.max(1, peoplePerHousehold)),
            overlapFraction: Math.min(1, views / Math.max(1, aware / Math.max(1, peoplePerHousehold))),
            contributionCentsPerHousehold: Math.max(0, Math.floor((Number.isFinite(monthly) ? monthly : 0) * 100 * P.paidContributionMargin * P.attributedPaidMonths)) };
    });
    const alreadySigned = Object.values(prepared.world.streamingRightsContracts || {}).some(c => c.sourceProjectId === titleId && c.buyer.platformId === buyerId && c.startsAtAbsoluteWeek < starts + durationWeeks && c.expiresAtAbsoluteWeek > starts && c.status === 'ACTIVE' && c.countryIds.some(id => countries.some(m => m.countryId === id)));
    const quote = valueCinemaStreamingRights({ titleId, buyerId, absoluteWeek: now, startsAtAbsoluteWeek: starts, durationWeeks, hasRights: (offeredCountryIds ? Boolean(exact?.available) : Boolean(lot)) && Boolean(company) && Boolean(offer) && company.lifecycle !== 'CLOSED' && company.lifecycle !== 'ACQUIRED' && (!core || !getPlatformAiSpendingRestrictions(core, now).blocksNewBids), alreadySigned,
        // A title competes with the rest of the acquisition slate; no minimum cash or budget floor.
        buyerCashCents: Math.floor(Math.max(0, actualCash - obligations) * P.titleCashShare * 100), unpaidObligationsCents: 0, countries, uncertainty: paid?.firstAdmissions ? P.observedUncertainty : P.unobservedUncertainty });
    return { ...quote, scope: { countryIds: countries.map(c => c.countryId), startsAtAbsoluteWeek: starts, durationWeeks } };
};
export const applyCinemaRightsQuoteToBidder = (platform: StreamingBiddingPlatformInput, quote: CinemaRightsQuote): StreamingBiddingPlatformInput => ({
    ...platform, canStartNewBids: platform.canStartNewBids !== false && quote.eligible && quote.maximumBidCents >= 100000,
    baseBid: Math.min(platform.baseBid, quote.range.mid / 100), acquisitionCeiling: Math.min(platform.acquisitionCeiling, quote.maximumBidCents / 100),
    cinemaExpectedValue: quote.maximumBidCents / (100 * P.maximumValueShare), cinemaMaximumBid: quote.maximumBidCents / 100,
});
/** Automatic routes sign only the exact affordable country/window quote, through the existing registry authority. */
export const registerQuotedCinemaStreamingRights = (player: Player, project: ProjectDetails, input: Parameters<typeof registerProductionStreamingRightsContract>[1]) => {
    const existing = Object.values(player.world.streamingRightsContracts || {}).find(c => c.sourceProjectId === input.sourceProjectId && c.buyer.platformId === input.buyerPlatformId && c.signedAtAbsoluteWeek === input.signedAtAbsoluteWeek && c.startsAtAbsoluteWeek === input.startsAtAbsoluteWeek);
    if (existing)
        return { player, contract: existing.minimumGuarantee === input.minimumGuarantee ? existing : null, changed: false };
    const quote = quoteCinemaRightsForBuyer(player, project, input.sourceProjectId, input.buyerPlatformId, input.startsAtAbsoluteWeek, input.durationWeeks || 52, input.countryIds, input.exclusivity, input.windowType);
    if (!quote.eligible || !quote.scope?.countryIds.length || Math.round((input.minimumGuarantee + (input.productionFunding || 0) + (input.futureSeasonFunding || 0)) * 100) > quote.maximumBidCents)
        return { player, contract: null, changed: false };
    return registerProductionStreamingRightsContract(player, { ...input, territory: 'MULTI_REGION', countryIds: quote.scope.countryIds });
};
/** Automatic outside-producer sale: registry and both cash legs move in one candidate, once. */
export const settleQuotedCinemaStreamingSale = (player: Player, project: ProjectDetails, input: Parameters<typeof registerProductionStreamingRightsContract>[1]) => {
    // A buyer debit must always have a durable producer destination in the same candidate.
    if (!player.world.studios?.[input.sellerStudioId] && !player.world.cinemaMarket)
        return { player, contract: null, changed: false };
    const registration = registerQuotedCinemaStreamingRights(player, project, input);
    if (!registration.contract || !registration.changed)
        return registration;
    const amount = Math.round((input.minimumGuarantee + (input.productionFunding || 0) + (input.futureSeasonFunding || 0)) * 100);
    const next = { ...registration.player, world: { ...registration.player.world } };
    const core = next.world.platforms?.[input.buyerPlatformId];
    if (core) {
        const cash = Math.round(core.cashReserve * 1e8);
        if (cash < amount)
            throw new Error('Cinema buyer no longer has cash');
        next.world.platforms = { ...next.world.platforms, [input.buyerPlatformId]: { ...core, cashReserve: (cash - amount) / 1e8 } };
    }
    else {
        const ecosystem = next.world.streamingPlatformEcosystem, operator = ecosystem?.operators[input.buyerPlatformId];
        if (!operator || Math.round(operator.cashMillions * 1e8) < amount)
            throw new Error('Cinema buyer no longer has cash');
        next.world.streamingPlatformEcosystem = { ...ecosystem!, operators: { ...ecosystem!.operators, [input.buyerPlatformId]: { ...operator, cashMillions: (Math.round(operator.cashMillions * 1e8) - amount) / 1e8 } } };
    }
    const producer = next.world.studios?.[input.sellerStudioId];
    if (producer)
        next.world.studios = { ...next.world.studios, [input.sellerStudioId]: { ...producer, cashReserve: (Math.round(producer.cashReserve * 1e8) + amount) / 1e8 } };
    else if (next.world.cinemaMarket) {
        const state = next.world.cinemaMarket, balances = { ...(state.externalProducerBalancesCents || {}) };
        balances[input.sellerStudioId] = (balances[input.sellerStudioId] || 0) + amount;
        next.world.cinemaMarket = { ...state, externalProducerBalancesCents: balances };
    }
    return { ...registration, player: next };
};
