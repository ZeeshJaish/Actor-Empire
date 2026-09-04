import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    getStreamingRightsStudioMandate,
    normalizeStreamingRightsManagementState,
    updateStreamingRightsStudioMandate,
    processStreamingRightsCalendarWeek,
} from '../services/streamingRightsCalendar';
import {
    createStreamingRightsDelegationTrace,
    getStreamingCommercialRelationships,
    getStreamingPlatformCommercialStatement,
    getStreamingRightsOffice,
    getStreamingStudioCommercialStatement,
    normalizeStreamingRightsOfficeState,
    processStreamingRightsOfficeWeek,
} from '../services/streamingRightsOffice';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
} from '../services/streamingRightsCore';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingRightsCalendar from '../components/StreamingRightsCalendar';

const player = structuredClone(INITIAL_PLAYER) as Player;
const defaultMandate = getStreamingRightsStudioMandate(player, 'empire-studios');

assert.equal(defaultMandate.controlMode, 'CUSTOM', 'legacy studios must receive Custom Control');
assert.equal(defaultMandate.revision, 1, 'legacy studio mandates must start from revision one');
assert.equal(defaultMandate.financialPriority, 'BALANCED_RETURN');
assert.equal(defaultMandate.distributionPriority, 'REGIONAL_OPTIMIZATION');
assert.equal(defaultMandate.exclusivityPolicy, 'ALLOW_WITHIN_LIMITS');
assert.equal(defaultMandate.durationPreference, 'BALANCED');
assert.equal(defaultMandate.partnerPreference, 'STRONGEST_ECONOMICS');
assert.equal(defaultMandate.maximumAutomaticGuarantee, 150_000_000);
assert.equal(defaultMandate.maximumAutomaticDurationWeeks, 104);

const malformed = normalizeStreamingRightsManagementState({
    controlMode: 'INVALID',
    policy: {
        maximumAutomaticGuarantee: -10,
        maximumAutomaticDurationWeeks: 9_999,
    },
    studioMandates: {
        'empire-studios': {
            controlMode: 'INVALID',
            financialPriority: 'INVALID',
            maximumAutomaticGuarantee: Number.NaN,
            maximumAutomaticDurationWeeks: -50,
            revision: -20,
            updatedAtAbsoluteWeek: -80,
        },
    },
});
assert.equal(malformed.controlMode, 'CUSTOM');
assert.equal(malformed.studioMandates['empire-studios'].controlMode, 'CUSTOM');
assert.equal(malformed.studioMandates['empire-studios'].financialPriority, 'BALANCED_RETURN');
assert.ok(malformed.studioMandates['empire-studios'].maximumAutomaticGuarantee >= 0);
assert.ok(malformed.studioMandates['empire-studios'].maximumAutomaticGuarantee <= 1_000_000_000);
assert.ok(malformed.studioMandates['empire-studios'].maximumAutomaticDurationWeeks >= 13);
assert.ok(malformed.studioMandates['empire-studios'].maximumAutomaticDurationWeeks <= 260);
assert.equal(malformed.studioMandates['empire-studios'].revision, 1);
assert.equal(malformed.studioMandates['empire-studios'].updatedAtAbsoluteWeek, 0);

const signedContractSnapshot = structuredClone(player.world.streamingRightsContracts);
const strategy = updateStreamingRightsStudioMandate(player, {
    studioId: 'empire-studios',
    absoluteWeek: 40,
    patch: {
        controlMode: 'STRATEGY',
        financialPriority: 'UPFRONT_SECURITY',
        distributionPriority: 'GLOBAL_PARTNER',
        exclusivityPolicy: 'REQUIRE_APPROVAL',
        durationPreference: 'SHORT',
        partnerPreference: 'TRUSTED_RELATIONSHIPS',
        maximumAutomaticGuarantee: 80_000_000,
        maximumAutomaticDurationWeeks: 78,
    },
});
const strategyMandate = getStreamingRightsStudioMandate(strategy, 'empire-studios');
assert.equal(strategyMandate.controlMode, 'STRATEGY');
assert.equal(strategyMandate.revision, 2);
assert.equal(strategyMandate.updatedAtAbsoluteWeek, 40);
assert.equal(strategyMandate.maximumAutomaticGuarantee, 80_000_000);
assert.equal(strategyMandate.maximumAutomaticDurationWeeks, 78);
assert.deepEqual(strategy.world.streamingRightsContracts, signedContractSnapshot, 'mode changes must not reroll signed contracts');
assert.equal(getStreamingRightsStudioMandate(player, 'empire-studios').controlMode, 'CUSTOM', 'mandate updates must be immutable');

const replay = updateStreamingRightsStudioMandate(strategy, {
    studioId: 'empire-studios',
    absoluteWeek: 41,
    patch: { controlMode: 'STRATEGY' },
});
assert.equal(replay, strategy, 'an identical mandate update must not create another revision');

const emptyOffice = normalizeStreamingRightsOfficeState(undefined);
assert.equal(emptyOffice.lastProcessedAbsoluteWeek, -1);
assert.deepEqual(emptyOffice.digests, []);

const officePlayer = structuredClone(strategy) as Player;
officePlayer.businesses = [{
    id: 'empire-studios',
    name: 'Empire Studios',
    type: 'PRODUCTION_HOUSE',
    balance: 500_000_000,
    stats: { weeklyRevenue: 0, weeklyProfit: 0, lifetimeRevenue: 0 },
    studioState: { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 },
}] as Player['businesses'];
officePlayer.pastProjects = Array.from({ length: 40 }, (_, index) => ({
    id: `office-title-${index}`,
    name: `Office Title ${String(index).padStart(2, '0')}`,
    studioId: 'empire-studios',
    projectType: 'MOVIE',
    genre: index % 2 ? 'DRAMA' : 'ACTION',
    projectQuality: 55 + index % 35,
    releasedAtAbsoluteWeek: index === 3 ? 20 : 180 + index,
    status: 'FINISHED',
})) as unknown as Player['pastProjects'];

const makeContract = (projectId: string, expiresAtAbsoluteWeek: number) => {
    const license = createStreamingLicenseContract({
        id: `office-contract-${projectId}`,
        sourceProject: { id: projectId, title: projectId.replaceAll('-', ' '), mediaType: 'MOVIE', genre: 'DRAMA' },
        buyerPlatformId: 'NETFLIX',
        platformContentPlanId: null,
        cataloguePackageId: null,
        contentSource: 'LICENSED_RELEASED_TITLE',
        licensorName: 'Empire Studios',
        territory: 'DOMESTIC',
        countryIds: ['US'],
        durationWeeks: expiresAtAbsoluteWeek - 120,
        exclusivity: 'EXCLUSIVE',
        minimumGuarantee: 50_000_000,
        platformRevenueShare: 94,
        signedAtAbsoluteWeek: 120,
        startsAtAbsoluteWeek: 120,
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        sellerType: 'STUDIO',
        sellerPlatformId: null,
        windowType: 'FIRST_WINDOW',
        permanentPurchase: false,
        renewalOption: true,
        sublicensingAllowed: true,
    });
    return createStreamingRightsContractFromLicense({
        license,
        seller: { type: 'PLAYER_STUDIO', id: 'empire-studios', name: 'Empire Studios', platformId: null },
        buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
        guaranteeDisposition: 'PAID',
        settledAtAbsoluteWeek: 120,
        productionFunding: 0,
        futureSeasonFunding: 0,
        localization: 'SUBTITLES',
        guaranteeRecoupment: 'RECOUPABLE',
        backendCap: null,
        idempotencyKey: `office-contract:${projectId}`,
    });
};

const underContract = makeContract('office-title-0', 260);
const actionContract = makeContract('office-title-1', 205);
const delegatedContract = makeContract('office-title-2', 204);
officePlayer.world.streamingRightsContracts = {
    [underContract.id]: underContract,
    [actionContract.id]: actionContract,
    [delegatedContract.id]: delegatedContract,
};
const renewalCase = (contractId: string, projectId: string, status: string, outcome: string, delegatedReason: string | null) => ({
    id: `renewal-${projectId}`,
    idempotencyKey: `renewal:${projectId}`,
    sourceContractId: contractId,
    sourceProjectId: projectId,
    title: projectId.replaceAll('-', ' '),
    projectType: 'MOVIE', genre: 'DRAMA', territory: 'DOMESTIC', countryIds: ['US'], exclusivity: 'EXCLUSIVE', windowType: 'FIRST_WINDOW',
    seller: { type: 'PLAYER_STUDIO', id: 'empire-studios', name: 'Empire Studios', platformId: null },
    incumbentBuyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    sourceExpiresAtAbsoluteWeek: 205,
    renewalStartsAtAbsoluteWeek: 206,
    openedAtAbsoluteWeek: 197,
    decisionDeadlineAbsoluteWeek: 204,
    renewalOption: true,
    status,
    offerDisposition: 'OFFERED',
    performance: null,
    proposedEconomics: { minimumGuarantee: 60_000_000, platformRevenueShare: 93, licensorRevenueShare: 7, durationWeeks: 78, offerExpiresAtAbsoluteWeek: 204 },
    controlModeAtOpen: 'STRATEGY',
    policyPreferenceAtOpen: 'UPFRONT_SECURITY',
    protectionReasons: status === 'ACTION_REQUIRED' ? ['GLOBAL_EXCLUSIVE'] : [],
    delegatedReason,
    outcome,
    replacementContractId: outcome === 'DELEGATED_ACCEPTED' ? 'replacement-office-title-2' : null,
    resolvedAtAbsoluteWeek: outcome === 'PENDING' ? null : 199,
    lastProcessedAbsoluteWeek: 200,
});
officePlayer.world.streamingRightsCalendar = {
    schemaVersion: 2,
    renewalCases: {
        'renewal-office-title-1': renewalCase(actionContract.id, 'office-title-1', 'ACTION_REQUIRED', 'PENDING', null),
        'renewal-office-title-2': renewalCase(delegatedContract.id, 'office-title-2', 'RENEWAL_SECURED', 'DELEGATED_ACCEPTED', 'Strategy Mode renewed a qualified title.'),
    },
    digests: [], urgentNoticeKeys: [], lastProcessedAbsoluteWeek: 200,
} as Player['world']['streamingRightsCalendar'];

const office = getStreamingRightsOffice(officePlayer, 'empire-studios', 200);
assert.equal(office.groups.ACTION_REQUIRED.length, 1, 'protected renewals belong in the action queue');
assert.ok(office.groups.UNDER_CONTRACT.some(row => row.projectId === 'office-title-0'));
assert.ok(office.groups.APPROACHING_EXPIRY.some(row => row.projectId === 'office-title-1'));
assert.ok(office.groups.DELEGATED_DECISIONS.some(row => row.projectId === 'office-title-2'));
assert.ok(office.groups.AVAILABLE_TO_LICENSE.length > 0);
assert.ok(office.groups.NO_CURRENT_INTEREST.some(row => row.projectId === 'office-title-3'));
assert.equal(office.totalTitles, 40, 'the Rights Office must preserve complete title access');
assert.ok(office.actionRail.length <= 7, 'Strategy and Custom must keep a bounded interruption queue');

const trace = createStreamingRightsDelegationTrace({
    mandate: strategyMandate,
    rule: 'RENEWAL_SCORE_WITHIN_MANDATE',
    facts: {
        performanceScore: 76,
        minimumGuarantee: 60_000_000,
        durationWeeks: 78,
        exclusivity: 'NON_EXCLUSIVE',
    },
    explanation: 'Renewed because performance and terms remained inside the saved mandate.',
});
assert.equal(trace.mandateRevision, 2);
assert.equal(trace.controlMode, 'STRATEGY');
assert.equal(trace.rule, 'RENEWAL_SCORE_WITHIN_MANDATE');
assert.equal(trace.facts.minimumGuarantee, 60_000_000);
assert.match(trace.explanation, /saved mandate/);

const delegationPlayer = structuredClone(officePlayer) as Player;
const delegationContract = { ...makeContract('office-title-4', 209), minimumGuarantee: 5_000_000 };
delegationPlayer.world.streamingRightsContracts![delegationContract.id] = delegationContract;
delegationPlayer.world.streamingRightsCalendar!.lastProcessedAbsoluteWeek = 200;
const delegationOpened = processStreamingRightsCalendarWeek(delegationPlayer, 201).player;
const delegationSettled = processStreamingRightsCalendarWeek(delegationOpened, 202).player;
const delegatedRenewal = Object.values(delegationSettled.world.streamingRightsCalendar!.renewalCases)
    .find(candidate => candidate.sourceContractId === delegationContract.id)!;
assert.notEqual(delegatedRenewal.outcome, 'PENDING', 'Strategy must resolve a routine renewal after its observation week');
assert.equal(delegatedRenewal.delegationTrace?.mandateRevision, 2, 'delegated actions must retain the exact mandate revision');
assert.equal(delegatedRenewal.delegationTrace?.facts.sourceContractId, delegationContract.id);
assert.equal(delegatedRenewal.delegationTrace?.facts.performanceScore, delegatedRenewal.performance?.performanceScore);

const commercialPlayer = structuredClone(officePlayer) as Player;
commercialPlayer.world.streamingRoyaltySettlements = {
    'settlement-office-0': {
        id: 'settlement-office-0', idempotencyKey: 'settlement-office-0', contractId: underContract.id,
        projectId: 'office-title-0', buyerPlatformId: 'NETFLIX', sellerStudioId: 'empire-studios', absoluteWeek: 190,
        adjustedGrossReceipts: 80_000_000, grossRoyaltyAccrued: 4_800_000, royaltyPaid: 2_000_000,
        recoupmentRemaining: 45_200_000, capRemaining: null,
    },
    'settlement-office-1': {
        id: 'settlement-office-1', idempotencyKey: 'settlement-office-1', contractId: actionContract.id,
        projectId: 'office-title-1', buyerPlatformId: 'NETFLIX', sellerStudioId: 'empire-studios', absoluteWeek: 191,
        adjustedGrossReceipts: 30_000_000, grossRoyaltyAccrued: 1_800_000, royaltyPaid: 0,
        recoupmentRemaining: 48_200_000, capRemaining: null,
    },
};
commercialPlayer.world.platformAiPlayerCommissionOffers = {
    'commission-office-1': {
        id: 'commission-office-1', platformId: 'NETFLIX', platformName: 'Netflix', platformContentPlanId: 'plan-office-1',
        briefReference: 'NX-DR-201', title: 'Commissioned Drama', projectType: 'MOVIE', genre: 'DRAMA', status: 'DELIVERED',
        productionBudget: 100_000_000, producerFee: 10_000_000, producerFeePaid: 10_000_000, productionBudgetReturned: 0,
        minimumImdbRating: 7, deliveryAllowanceWeeks: 40, createdAtAbsoluteWeek: 120, expiresAtAbsoluteWeek: 125,
        acceptedAtAbsoluteWeek: 121, greenlitAtAbsoluteWeek: 125, deliveredAtAbsoluteWeek: 165,
        deliveryDeadlineAtAbsoluteWeek: 170, cooldownUntilAbsoluteWeek: null, studioId: 'empire-studios', scriptId: 'script-office',
        commitmentId: 'commitment-office', canonicalProductionId: 'production-office', finalQualityScore: 82,
        deliveredImdbRating: 8.1, releasedAtAbsoluteWeek: 170,
    },
};
commercialPlayer.world.streamingBiddingSessions = {
    'session-office': {
        id: 'session-office', idempotencyKey: 'session-office', projectId: 'office-title-0', title: 'Office Title 00',
        sellerStudioId: 'empire-studios', sellerStudioName: 'Empire Studios', absoluteWeek: 120,
        projectType: 'MOVIE', genre: 'DRAMA', status: 'ACCEPTED', acceptedOfferId: 'offer-netflix',
        offers: [
            { id: 'offer-netflix', platformId: 'NETFLIX', status: 'ACCEPTED', minimumGuarantee: 50_000_000 },
            { id: 'offer-hulu', platformId: 'HULU', status: 'FINAL', minimumGuarantee: 44_000_000 },
        ],
    },
} as unknown as Player['world']['streamingBiddingSessions'];
const commercialStudio = commercialPlayer.businesses.find(business => business.id === 'empire-studios')!;
commercialStudio.studioState!.platformRelations = {
    NETFLIX: {
        trustModifier: 6, recoveryWeeksRemaining: 0, completedDeals: 4, profitableDeals: 2,
        loyaltyScore: 72, realizedPartnerValue: 110_000_000,
    },
    HULU: {
        trustModifier: -2, recoveryWeeksRemaining: 5, lastBreachWeek: 10, lastBreachYear: 30,
        completedDeals: 1, profitableDeals: 0, loyaltyScore: 18, realizedPartnerValue: 5_000_000,
    },
};

const relationships = getStreamingCommercialRelationships(commercialPlayer, 'empire-studios');
const netflixRelationship = relationships.find(row => row.platformId === 'NETFLIX')!;
assert.ok(netflixRelationship.score > 60, 'profitable repeat delivery should produce a strong relationship');
assert.equal(netflixRelationship.acceptedDeals, 1);
assert.equal(netflixRelationship.deliveredCommissions, 1);
assert.ok(netflixRelationship.renewals >= 1);
assert.equal(netflixRelationship.backendPaid, 2_000_000);
assert.ok(netflixRelationship.reasons.some(reason => /delivery/i.test(reason)));
const huluRelationship = relationships.find(row => row.platformId === 'HULU')!;
assert.equal(huluRelationship.rejectedOffers, 1);
assert.ok(huluRelationship.score < netflixRelationship.score);
assert.ok(huluRelationship.reasons.some(reason => /recovery/i.test(reason)));

const studioStatement = getStreamingStudioCommercialStatement(commercialPlayer, 'empire-studios');
assert.equal(studioStatement.licensingGuarantees, 150_000_000);
assert.equal(studioStatement.producerFeesPaid, 10_000_000);
assert.equal(studioStatement.platformFundedProductionBudgets, 100_000_000);
assert.equal(studioStatement.attributedAdjustedGross, 110_000_000);
assert.equal(studioStatement.grossBackendAccrued, 6_600_000);
assert.equal(studioStatement.backendPaid, 2_000_000);
assert.equal(studioStatement.recoupmentRemaining, 93_400_000);
assert.equal(studioStatement.downstreamTransferProceeds, 0, 'the original studio receives no downstream resale participation');
assert.equal(studioStatement.cashIncome, 162_000_000, 'restricted production funding must not be counted as studio income');

const platformStatement = getStreamingPlatformCommercialStatement(commercialPlayer, 'NETFLIX');
assert.equal(platformStatement.titleAttributedRevenue, 110_000_000);
assert.equal(platformStatement.guaranteesAndAcquisitionCost, 150_000_000);
assert.equal(platformStatement.productionFunding, 100_000_000);
assert.equal(platformStatement.producerFees, 10_000_000);
assert.equal(platformStatement.royaltyExpense, 2_000_000);
assert.equal(platformStatement.retainedContribution, -152_000_000);
assert.equal(platformStatement.forecastVariance, null, 'missing canonical forecast data must not be fabricated');

commercialPlayer.world.streamingCataloguePackageDigests = [{
    id: 'package-digest-office-200', absoluteWeek: 200, proposed: 1, signed: 1, skipped: 0,
    summary: 'One catalogue package signed.',
}];
commercialPlayer.world.streamingRightsOffice = {
    schemaVersion: 1, digests: [], lastProcessedAbsoluteWeek: 199,
};
const digestResult = processStreamingRightsOfficeWeek(commercialPlayer, 200);
assert.equal(digestResult.processed, true);
assert.equal(digestResult.digest?.actionRequired, 1);
assert.equal(digestResult.digest?.packages, 1);
assert.match(digestResult.digest?.summary || '', /1 decision requires approval/);
assert.equal(digestResult.player.world.streamingRightsOffice?.digests.length, 1);
const digestReplay = processStreamingRightsOfficeWeek(digestResult.player, 200);
assert.equal(digestReplay.processed, false, 'same-week office processing must be idempotent');
assert.equal(digestReplay.player, digestResult.player);
assert.equal(digestReplay.player.world.streamingRightsOffice?.digests.length, 1);

const quietPlayer = structuredClone(INITIAL_PLAYER) as Player;
quietPlayer.world.streamingRightsOffice = { schemaVersion: 1, digests: [], lastProcessedAbsoluteWeek: 299 };
const quiet = processStreamingRightsOfficeWeek(quietPlayer, 300);
assert.equal(quiet.processed, true);
assert.equal(quiet.digest, null, 'an empty rights week must not create player-facing noise');
assert.equal(quiet.player.world.streamingRightsOffice?.lastProcessedAbsoluteWeek, 300);

const persistedOffice = migratePlayerSave(compactPlayerForPersistence(digestResult.player));
assert.equal(getStreamingRightsStudioMandate(persistedOffice, 'empire-studios').revision, 2);
assert.equal(persistedOffice.world.streamingRightsOffice?.digests[0]?.id, digestResult.digest?.id);
assert.equal(persistedOffice.world.streamingRightsOffice?.lastProcessedAbsoluteWeek, 200);
const malformedOfficePlayer = structuredClone(INITIAL_PLAYER) as Player;
malformedOfficePlayer.world.streamingRightsOffice = {
    schemaVersion: 1,
    digests: [
        { id: '', absoluteWeek: -8, actionRequired: -1, delegatedDecisions: -1, renewals: -1, expiries: -1, packages: -1, transfers: -1, royaltySettlements: -1, summary: '' },
        { id: 'valid-office-digest', absoluteWeek: -8, actionRequired: -1, delegatedDecisions: -1, renewals: -1, expiries: -1, packages: -1, transfers: -1, royaltySettlements: -1, summary: '' },
    ],
    lastProcessedAbsoluteWeek: Number.POSITIVE_INFINITY,
};
const normalizedMalformedOffice = migratePlayerSave(malformedOfficePlayer).world.streamingRightsOffice!;
assert.equal(normalizedMalformedOffice.digests.length, 1);
assert.equal(normalizedMalformedOffice.digests[0].absoluteWeek, 0);
assert.equal(normalizedMalformedOffice.digests[0].actionRequired, 0);
assert.equal(normalizedMalformedOffice.lastProcessedAbsoluteWeek, -1);

const portfolioMarkup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
    player: commercialPlayer,
    context: 'STUDIO',
    studioId: 'empire-studios',
    onUpdatePlayer: () => undefined,
    initialDeskTab: 'PORTFOLIO',
}));
assert.match(portfolioMarkup, /Rights Office/);
assert.match(portfolioMarkup, /Portfolio/);
assert.match(portfolioMarkup, /Mandate/);
assert.match(portfolioMarkup, /Relationships/);
assert.match(portfolioMarkup, /Statements/);
assert.match(portfolioMarkup, /Packages/);
assert.match(portfolioMarkup, /Action rail/);
assert.match(portfolioMarkup, /40 titles under management/);
assert.doesNotMatch(portfolioMarkup, /best deal/i);

const mandateMarkup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
    player: commercialPlayer, context: 'STUDIO', studioId: 'empire-studios', onUpdatePlayer: () => undefined,
    initialDeskTab: 'MANDATE',
}));
assert.match(mandateMarkup, /Licensing mandate/);
assert.match(mandateMarkup, /Financial priority/);
assert.match(mandateMarkup, /Distribution priority/);
assert.match(mandateMarkup, /Protected decisions always return to you/);

const relationshipsMarkup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
    player: commercialPlayer, context: 'STUDIO', studioId: 'empire-studios', onUpdatePlayer: () => undefined,
    initialDeskTab: 'RELATIONSHIPS',
}));
assert.match(relationshipsMarkup, /Relationship intelligence/);
assert.match(relationshipsMarkup, /Netflix/);
assert.match(relationshipsMarkup, /Trusted partner/i);
assert.match(relationshipsMarkup, /commissioned delivery/i);

const statementsMarkup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
    player: commercialPlayer, context: 'STUDIO', studioId: 'empire-studios', onUpdatePlayer: () => undefined,
    initialDeskTab: 'STATEMENTS',
}));
assert.match(statementsMarkup, /Commercial statement/);
assert.match(statementsMarkup, /Licensing guarantees/);
assert.match(statementsMarkup, /Restricted production funding/);
assert.match(statementsMarkup, /Backend paid/);

console.log('Streaming Rights Office Phase A7 mandate audit passed.');
