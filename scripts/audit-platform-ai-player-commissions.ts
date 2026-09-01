import assert from 'node:assert/strict';
import type { Business, Player } from '../types';
import {
    acceptPlatformAiPlayerCommission,
    buildPlatformCommissionActiveCardPresentation,
    buildPlatformCommissionBudgetPresentation,
    buildPlatformCommissionFilmography,
    createPlatformAiPlayerCommissionOffer,
    createPlatformAiPlayerCommissionQaFixture,
    declinePlatformAiPlayerCommission,
    finalizePlatformAiPlayerCommissionGreenlight,
    generatePlatformAiPlayerCommissionOffers,
    normalizePlatformAiState,
    normalizePlatformAiPlayerCommissionOffers,
    settlePlatformAiPlayerCommissionDelivery,
    transferPlatformAiPlayerCommission,
} from '../services/platformAi';
import { createProductionCalendar } from '../services/productionCalendar';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const ABSOLUTE_WEEK = 2_092;

const makeStudio = (): Business => ({
    id: 'PLAYER_STUDIO',
    name: 'Z Studios',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: '🎬',
    color: '#38bdf8',
    foundedWeek: 1,
    balance: 10_000_000,
    isActive: true,
    config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' },
    stats: {
        weeklyRevenue: 0,
        weeklyExpenses: 0,
        weeklyProfit: 0,
        lifetimeRevenue: 0,
        valuation: 80_000_000,
        brandHealth: 72,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 55,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 0,
    history: [],
    studioState: {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: 0,
        lastWriterRefreshWeek: 0,
        lockedStreamingFunds: [],
        platformRelations: {},
        financeLedger: [],
    },
});

const makePlayer = (): Player => {
    const fixture = createPlatformAiFixture();
    const studio = makeStudio();
    return { ...fixture, businesses: [...fixture.businesses, studio] };
};

const player = makePlayer();
player.world.platforms!.NETFLIX.ai = {
    ...(player.world.platforms!.NETFLIX.ai as any),
    status: 'ACTIVE',
    slate: [{
    id: 'commission-plan-101',
    platformId: 'NETFLIX',
    source: 'COMMISSIONED_ORIGINAL',
    status: 'BRIEF',
    title: 'Netflix Working Brief',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    targetAudience: 'ADULTS',
    sourceProjectIds: [],
    rightsContractIds: [],
    cataloguePackageId: null,
    commissionId: null,
    sourceStudioId: null,
    streamingWindow: 'GLOBAL_EXCLUSIVE',
    localizationLevel: 'STANDARD',
    releaseCountryIds: [],
    minimumGuaranteeMillions: 0,
    rightsCostMillions: 0,
    productionFundingMillions: 300,
    paidSpendMillions: 0,
    marketingReserveMillions: 0,
    contingencyMillions: 0,
    commissioningLifecycle: {
        status: 'PENDING',
        attemptCount: 0,
        nextAttemptAtAbsoluteWeek: ABSOLUTE_WEEK,
        lastAttemptAtAbsoluteWeek: null,
        lastFailureReason: null,
        depositEscrowMillions: 0,
        depositRefundedAtAbsoluteWeek: null,
    },
    committedAtAbsoluteWeek: ABSOLUTE_WEEK,
    rightsReadyAtAbsoluteWeek: null,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
    forecast: { strategic: 70, creative: 75, commercial: 70, prestige: 65, risk: 30 },
    } as any],
};
assert.deepEqual(normalizePlatformAiPlayerCommissionOffers({ broken: { id: '' } }, ABSOLUTE_WEEK), {}, 'Malformed commission rows must not survive save migration.');

const restrictedPlayer = makePlayer();
const restrictedPlatform = normalizePlatformAiState(
    restrictedPlayer.world.platforms!.NETFLIX,
    restrictedPlayer.id,
    ABSOLUTE_WEEK,
);
restrictedPlatform.ai!.spendingRestrictions = {
    source: 'EXTERNAL_RECAPITALIZATION',
    blocksNewBids: true,
    blocksNewGreenlights: true,
    blocksNewResearch: true,
    blocksExpansion: true,
    expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 13,
};
restrictedPlayer.world.platforms!.NETFLIX = restrictedPlatform;
const restrictedOffer = createPlatformAiPlayerCommissionOffer({
    player: restrictedPlayer,
    platformId: 'NETFLIX',
    planId: 'restricted-commission-plan',
    title: 'Restricted Commission',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    productionFundingMillions: 100,
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(restrictedOffer.changed, false, 'Funding restrictions must block a new player commission offer.');
assert.equal(restrictedOffer.reason, 'PLATFORM_FINANCIAL_RESTRICTION');
const platformCashBefore = player.world.platforms!.NETFLIX.cashReserve;

const qaFixture = createPlatformAiPlayerCommissionQaFixture({
    player: makePlayer(),
    studioId: 'PLAYER_STUDIO',
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(qaFixture.changed, true, 'The cheat fixture must create a real commission offer.');
assert.equal(qaFixture.offer?.status, 'PENDING');
assert.equal(qaFixture.offer?.title, 'After the Monsoon', 'The screenshot cheat must use a believable in-world title.');
assert.doesNotMatch(qaFixture.offer?.title || '', /test|qa/i, 'Player-facing cheat content must not expose test language.');
assert.equal(qaFixture.offer?.productionBudget, 95_000_000);
assert.equal(qaFixture.offer?.minimumImdbRating, 7.2);
assert.equal(qaFixture.player.inbox[0]?.type, 'OFFER_PLATFORM_COMMISSION');
assert.equal(qaFixture.player.inbox[0]?.data?.offerId, qaFixture.offer?.id);
assert.ok(
    qaFixture.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')?.studioState?.scripts
        .some(script => script.id === qaFixture.scriptId && script.status === 'READY' && script.projectType === 'MOVIE' && script.genres.includes('DRAMA')),
    'The fixture must add a Greenlight-ready script matching the platform brief.',
);
const qaScript = qaFixture.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')?.studioState?.scripts
    .find(script => script.id === qaFixture.scriptId);
assert.equal(qaScript?.author, 'Anika Sen');
assert.doesNotMatch(qaScript?.logline || '', /test|qa/i);
const qaPlan = qaFixture.player.world.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === qaFixture.planId);
assert.equal(qaPlan?.source, 'COMMISSIONED_ORIGINAL');
assert.equal(qaPlan?.status, 'BRIEF');
assert.equal(qaPlan?.commissioningLifecycle?.depositEscrowMillions, 8);
assert.equal(qaPlan?.paidSpendMillions, 8);
assert.equal(qaFixture.player.world.projects.length, makePlayer().world.projects.length, 'The cheat must not skip ahead to a released title.');

const declinedQaFixture = declinePlatformAiPlayerCommission({
    player: qaFixture.player,
    offerId: qaFixture.offer!.id,
    absoluteWeek: ABSOLUTE_WEEK,
});
const repeatedQaFixture = createPlatformAiPlayerCommissionQaFixture({
    player: declinedQaFixture.player,
    studioId: 'PLAYER_STUDIO',
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(repeatedQaFixture.changed, true, 'The cheat must create another commission after the previous fixture is passed in the same week.');
assert.notEqual(repeatedQaFixture.offer?.id, qaFixture.offer?.id, 'Repeated same-week fixtures must receive a fresh offer identity.');
assert.equal(repeatedQaFixture.offer?.title, 'A City Without Dawn', 'Repeated fixtures should rotate through believable showcase titles.');

const generatedFixture = makePlayer();
generatedFixture.world.platforms!.NETFLIX.ai = {
    ...(generatedFixture.world.platforms!.NETFLIX.ai as any),
    status: 'ACTIVE',
    slate: [{
        id: 'generated-player-brief',
        title: 'Generated Original',
        source: 'COMMISSIONED_ORIGINAL',
        status: 'BRIEF',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        targetAudience: 'ADULTS',
        productionFundingMillions: 120,
        paidSpendMillions: 6,
        forecast: { creative: 75 },
        commissioningLifecycle: { status: 'PENDING', depositEscrowMillions: 6 },
    }],
};
const generated = generatePlatformAiPlayerCommissionOffers(generatedFixture, ABSOLUTE_WEEK);
assert.equal(generated.changed, true, 'An eligible player studio should receive an AI original brief before the AI hires itself.');
assert.equal(generated.player.inbox[0].type, 'OFFER_PLATFORM_COMMISSION');
assert.equal(Object.values(generated.player.world.platformAiPlayerCommissionOffers || {}).length, 1);
const generatedAgain = generatePlatformAiPlayerCommissionOffers(generated.player, ABSOLUTE_WEEK);
assert.equal(generatedAgain.changed, false, 'Weekly offer generation must be idempotent.');
const generatedCashBefore = generated.player.world.platforms!.NETFLIX.cashReserve;
const generatedOffer = Object.values(generated.player.world.platformAiPlayerCommissionOffers || {})[0];
const generatedAccepted = acceptPlatformAiPlayerCommission({
    player: generated.player,
    offerId: generatedOffer.id,
    studioId: 'PLAYER_STUDIO',
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(
    generatedAccepted.player.world.platforms!.NETFLIX.cashReserve,
    Math.round((generatedCashBefore - ((generatedOffer.productionBudget + generatedOffer.producerFee) / 1_000_000 - 6)) * 100) / 100,
    'Accepting a generated brief must credit its existing commissioning deposit against the reserved total.',
);

const offered = createPlatformAiPlayerCommissionOffer({
    player,
    platformId: 'NETFLIX',
    planId: 'commission-plan-101',
    title: 'Netflix Working Brief',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    productionFundingMillions: 300,
    minimumImdbRating: 7,
    absoluteWeek: ABSOLUTE_WEEK,
});

assert.equal(offered.changed, true);
assert.ok(offered.offer);
assert.equal(offered.offer!.status, 'PENDING');
assert.match(offered.offer!.briefReference, /^Netflix Commission #[0-9]{3}$/);
assert.equal(offered.offer!.deliveryAllowanceWeeks, 40);
assert.ok(offered.offer!.producerFee > 0);
assert.equal(offered.player.inbox[0].type, 'OFFER_PLATFORM_COMMISSION');
assert.match(offered.player.inbox[0].text, /7\.0 IMDb/);
assert.match(offered.player.inbox[0].text, /producer fee/i);

const offerId = offered.offer!.id;
const accepted = acceptPlatformAiPlayerCommission({
    player: offered.player,
    offerId,
    studioId: 'PLAYER_STUDIO',
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(accepted.changed, true);
assert.equal(accepted.offer?.status, 'ACCEPTED');
assert.deepEqual(buildPlatformCommissionActiveCardPresentation(accepted.offer!), {
    title: offered.offer!.briefReference,
    phase: 'SCRIPT REQUIRED',
    sourceLabel: 'NETFLIX COMMISSION',
    productionBudget: 300_000_000,
});
assert.deepEqual(buildPlatformCommissionBudgetPresentation(86_000_000, accepted.offer!), {
    packageBudget: 86_000_000,
    productionCap: 300_000_000,
    remainingBudget: 214_000_000,
    producerFee: accepted.offer!.producerFee,
    overBudget: false,
});
assert.equal(accepted.studioId, 'PLAYER_STUDIO');
assert.equal(accepted.player.world.platforms!.NETFLIX.cashReserve, platformCashBefore - (offered.offer!.productionBudget + offered.offer!.producerFee) / 1_000_000);
assert.equal(accepted.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.balance, 10_000_000, 'Acceptance must not pay an exploitable advance.');
assert.equal(accepted.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.studioState!.lockedStreamingFunds!.length, 1);
assert.equal(accepted.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.studioState!.lockedStreamingFunds![0].fundingSource, 'AI_PLATFORM_COMMISSION');

const duplicateAccept = acceptPlatformAiPlayerCommission({ player: accepted.player, offerId, studioId: 'PLAYER_STUDIO', absoluteWeek: ABSOLUTE_WEEK });
assert.equal(duplicateAccept.changed, false);
assert.equal(duplicateAccept.reason, 'NOT_PENDING');

const calendar = createProductionCalendar({ preProductionWeeks: 8, productionWeeks: 13, postProductionWeeks: 14 });
const greenlit = finalizePlatformAiPlayerCommissionGreenlight({
    player: accepted.player,
    offerId,
    studioId: 'PLAYER_STUDIO',
    commitmentId: 'player-commission-production-101',
    projectTitle: 'Project 101',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    scriptId: 'script-101',
    packageBudget: accepted.offer!.productionBudget - 20_000_000,
    productionCalendar: calendar,
    finalQualityScore: 76,
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(greenlit.changed, true);
assert.equal(greenlit.offer?.status, 'GREENLIT');
assert.equal(greenlit.offer?.title, 'Project 101', 'The selected script title must replace the commission working title at Greenlight.');
assert.equal(greenlit.offer?.deliveryDeadlineAtAbsoluteWeek, ABSOLUTE_WEEK + 41, 'The allowance must be longer than the generated 35-week calendar.');
assert.equal(greenlit.offer?.productionBudgetReturned, 20_000_000);
assert.equal(greenlit.player.world.projects.length, accepted.player.world.projects.length, 'Greenlight must not create a released title.');
assert.ok(greenlit.player.world.industryProductions?.[greenlit.offer!.canonicalProductionId!]);
assert.equal(
    greenlit.player.world.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === 'commission-plan-101')!.paidSpendMillions,
    (greenlit.offer!.productionBudget - 20_000_000 + greenlit.offer!.producerFee) / 1_000_000,
    'The platform plan must record the actual package cost plus producer fee.',
);
assert.equal(
    greenlit.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.balance,
    10_000_000 + Math.round(greenlit.offer!.producerFee * 0.25),
    'Only the first producer-fee milestone is studio income at Greenlight.',
);
assert.equal(
    greenlit.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.stats.lifetimeRevenue,
    Math.round(greenlit.offer!.producerFee * 0.25),
    'Producer-fee milestones must count as studio income.',
);

const overCap = finalizePlatformAiPlayerCommissionGreenlight({
    player: accepted.player,
    offerId,
    studioId: 'PLAYER_STUDIO',
    commitmentId: 'too-expensive',
    projectTitle: 'Project 101',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    scriptId: 'script-101',
    packageBudget: accepted.offer!.productionBudget + 1,
    productionCalendar: calendar,
    finalQualityScore: 76,
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(overCap.changed, false);
assert.equal(overCap.reason, 'OVER_BUDGET_CAP');

const deliveryPlayer = {
    ...greenlit.player,
    world: {
        ...greenlit.player.world,
        talentBookings: [{
            id: 'player-commission-booking',
            npcId: 'actor-101',
            role: 'ACTOR',
            projectId: 'player-commission-production-101',
            projectOwner: 'PLAYER_COMMITMENT',
            producerStudioId: 'PLAYER_STUDIO',
            startAbsoluteWeek: ABSOLUTE_WEEK,
            endAbsoluteWeek: ABSOLUTE_WEEK + 35,
            status: 'BOOKED',
        } as any],
    },
};
const delivered = settlePlatformAiPlayerCommissionDelivery({
    player: deliveryPlayer,
    offerId,
    commitmentId: 'player-commission-production-101',
    finalQualityScore: 76,
    absoluteWeek: ABSOLUTE_WEEK + 35,
});
assert.equal(delivered.changed, true);
assert.equal(delivered.offer?.status, 'DELIVERED');
assert.equal(delivered.offer?.deliveredImdbRating, 7.6);
assert.equal(delivered.offer?.releasedAtAbsoluteWeek, null, 'Delivery is not a streaming release.');
assert.equal(delivered.player.world.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === 'commission-plan-101')!.status, 'DELIVERED');
assert.equal(delivered.player.world.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === 'commission-plan-101')!.releasedAtAbsoluteWeek, null);
assert.equal(delivered.player.world.talentBookings?.[0]?.status, 'RELEASED');
assert.equal(
    delivered.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.balance,
    10_000_000 + delivered.offer!.producerFee,
    'Delivery pays the remainder of the already-agreed producer fee exactly once.',
);
assert.equal(delivered.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.studioState!.platformRelations!.NETFLIX.completedDeals, 1);
assert.equal(delivered.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.studioState!.platformRelations!.NETFLIX.profitableDeals, 1);
assert.equal(
    delivered.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.stats.lifetimeRevenue,
    delivered.offer!.producerFee,
    'The complete producer fee, but not the restricted production budget, must become lifetime revenue.',
);
const filmography = buildPlatformCommissionFilmography({
    ownedProjects: [{ id: 'owned-film', name: 'Owned Film', rating: 8.2, gross: 500_000_000 }],
    offers: delivered.player.world.platformAiPlayerCommissionOffers,
    studioId: 'PLAYER_STUDIO',
});
assert.equal(filmography.evaluationProjects.length, 1, 'Commission credits must not enter owned-studio evaluation inputs.');
assert.equal(filmography.displayProjects.length, 2, 'Delivered commissions must remain visible beside owned filmography.');
assert.equal(filmography.commissionCredits[0]?.sourceLabel, 'NETFLIX COMMISSION');
assert.equal(filmography.commissionCredits[0]?.countsTowardOwnedStudioEvaluation, false);

const duplicateDelivery = settlePlatformAiPlayerCommissionDelivery({
    player: delivered.player,
    offerId,
    commitmentId: 'player-commission-production-101',
    finalQualityScore: 99,
    absoluteWeek: ABSOLUTE_WEEK + 36,
});
assert.equal(duplicateDelivery.changed, false);
assert.equal(duplicateDelivery.reason, 'ALREADY_DELIVERED');

const lowPlayer = makePlayer();
const lowOffered = createPlatformAiPlayerCommissionOffer({
    player: lowPlayer,
    platformId: 'NETFLIX',
    planId: 'commission-plan-low',
    title: 'Difficult Delivery',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    productionFundingMillions: 80,
    minimumImdbRating: 7,
    absoluteWeek: ABSOLUTE_WEEK,
});
const lowAccepted = acceptPlatformAiPlayerCommission({ player: lowOffered.player, offerId: lowOffered.offer!.id, studioId: 'PLAYER_STUDIO', absoluteWeek: ABSOLUTE_WEEK });
const lowGreenlit = finalizePlatformAiPlayerCommissionGreenlight({
    player: lowAccepted.player,
    offerId: lowOffered.offer!.id,
    studioId: 'PLAYER_STUDIO',
    commitmentId: 'low-production',
    projectTitle: 'Difficult Delivery',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    scriptId: 'low-script',
    packageBudget: lowOffered.offer!.productionBudget,
    productionCalendar: calendar,
    finalQualityScore: 40,
    absoluteWeek: ABSOLUTE_WEEK,
});
const lowDelivered = settlePlatformAiPlayerCommissionDelivery({ player: lowGreenlit.player, offerId: lowOffered.offer!.id, commitmentId: 'low-production', finalQualityScore: 40, absoluteWeek: ABSOLUTE_WEEK + 35 });
assert.equal(lowDelivered.offer?.deliveredImdbRating, 4);
assert.ok((lowDelivered.offer?.cooldownUntilAbsoluteWeek || 0) >= ABSOLUTE_WEEK + 35 + 15);
assert.ok(lowDelivered.player.news.some(item => item.projectId === 'low-production'));

const declined = declinePlatformAiPlayerCommission({ player: offered.player, offerId, absoluteWeek: ABSOLUTE_WEEK });
assert.equal(declined.changed, true);
assert.equal(declined.offer?.status, 'DECLINED');
assert.equal(declined.player.world.platforms!.NETFLIX.cashReserve, platformCashBefore, 'Declining an unreserved offer changes no platform cash.');

const transferSource = createPlatformAiPlayerCommissionOffer({
    player: makePlayer(),
    platformId: 'NETFLIX',
    planId: 'commission-plan-transfer',
    title: 'Transfer Test',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    productionFundingMillions: 60,
    absoluteWeek: ABSOLUTE_WEEK,
});
const transferAccepted = acceptPlatformAiPlayerCommission({ player: transferSource.player, offerId: transferSource.offer!.id, studioId: 'PLAYER_STUDIO', absoluteWeek: ABSOLUTE_WEEK });
const transferred = transferPlatformAiPlayerCommission({ player: transferAccepted.player, offerId: transferSource.offer!.id, absoluteWeek: ABSOLUTE_WEEK + 1 });
assert.equal(transferred.changed, true);
assert.equal(transferred.offer?.status, 'TRANSFERRED');
assert.equal(transferred.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.studioState!.lockedStreamingFunds!.length, 0);
assert.ok(transferred.player.businesses.find(studio => studio.id === 'PLAYER_STUDIO')!.studioState!.platformRelations!.NETFLIX.recoveryWeeksRemaining >= 20);

console.log('Platform AI player commission audit passed.');
