/**
 * #246 (plan §25.4 Q8): who gets the next season. Builds the developer test company, then runs the real renewal decision in the week loop, the first
 * word for the last season's platform, the way out of a paid season, and a commissioned show's platform deciding for itself.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type ActiveRelease, type Commitment, type Player, type PlatformId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createBusiness } from '../services/businessLogic';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { getProjectFundingEconomics } from '../services/projectFundingEconomics';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';
import { decidePlatformAiCommissionRenewals, PLATFORM_COMMISSION_RENEWAL_WEEKS } from '../services/platformAi/platformAiPlayerCommissions';
import {
    getStreamingFirstNegotiation, getStreamingNextSeasonLine, getStreamingSeasonFunding, getStreamingSeasonLeaveQuote, leaveStreamingSeasonFunding, releaseStreamingSeasonFunding,
    STREAMING_SEASON_LEAVE_PENALTY,
} from '../services/streamingSeasonRights';

const pass = (label: string) => console.log(`PASS ${label}`);
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'season-rights-audit', name: 'Season Rights', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

async function main() {
    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    const studio = createBusiness('Season Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20);
    studio.balance = 2e9;
    const now = getAbsoluteWeek(built.age, built.currentWeek);
    const details = (title: string, extra: Record<string, unknown> = {}, hidden: Record<string, unknown> = {}) => {
        const project = structuredClone(makeCinemaFixture(11).project);
        return { ...project, title, type: 'SERIES' as const, studioId: studio.id as never, castList: [], franchiseId: 'show', estimatedBudget: 60_000_000, releaseStrategy: 'STREAMING_ONLY' as const, ...extra, hiddenStats: { ...project.hiddenStats, ...hidden } };
    };
    const seasonOne = {
        id: 'show', name: 'Glass Harbour', type: 'SERIES', roleType: 'LEAD', projectDetails: details('Glass Harbour', { installmentNumber: 1 }),
        weekNum: 8, weeklyGross: [], totalGross: 0, budget: 60_000_000, status: 'FINISHED', productionPerformance: 80, imdbRating: 8.2, distributionPhase: 'STREAMING', releasedAtAbsoluteWeek: now - 12, sequelDecisionMade: false,
        streaming: { platformId: 'NETFLIX', weekOnPlatform: 9, totalViews: 90_000_000, weeklyViews: [20e6, 20e6, 15e6, 15e6, 10e6, 10e6], isLeaving: false, startWeekAbsolute: now - 10, startWeek: 1 },
    } as unknown as ActiveRelease;
    const fund = { id: 'fund-1', platformId: 'NETFLIX', platformName: 'Netflix', amount: 40_000_000, sourceProjectId: 'show', sourceTitle: 'Glass Harbour', franchiseId: 'show', installmentNumber: 1, projectType: 'SERIES', createdWeek: built.currentWeek, createdYear: built.age } as never;
    const withStudio = (funds: unknown[]): Player => ({
        ...built, money: 2e9, pendingEvents: [], commitments: [], activeReleases: [structuredClone(seasonOne)],
        businesses: [...built.businesses, { ...structuredClone(studio), studioState: { ...structuredClone(studio.studioState!), lockedStreamingFunds: structuredClone(funds) as never } }],
    });
    const studioIn = (player: Player) => player.businesses.find(item => item.id === studio.id)!;
    const stub = async <T,>(value: number, run: () => Promise<T>): Promise<T> => {
        const real = Math.random;
        Math.random = () => value;
        try { return await run(); } finally { Math.random = real; }
    };

    /* ---- the money a platform paid for the next season */
    const paid = withStudio([fund]);
    assert.equal(getStreamingSeasonFunding(studioIn(paid), seasonOne)?.id, 'fund-1');
    assert.equal(getStreamingNextSeasonLine(paid, studioIn(paid), seasonOne), 'Netflix already paid for the next season, so it goes to Netflix.');
    assert.equal(getStreamingSeasonFunding(studioIn(withStudio([])), seasonOne), null);
    pass('Filmography says who the next season goes to');

    /* the renewal door used to open the floor, and then the platform sued at week 26 */
    const renewed = (await stub(0.001, () => processGameWeek(withStudio([fund])))).player;
    const script = (studioIn(renewed).studioState!.scripts || []).find(item => item.franchiseId === 'show' && item.installmentNumber === 2);
    assert.ok(script, 'the real week renewed it');
    assert.equal(script!.lockedStreamingFunding?.id, 'fund-1', 'and the money comes with it');
    assert.ok(renewed.logs.some(log => log.message.includes('"Glass Harbour" was renewed.')), 'and the activity log says so');
    pass('a real renewal: the new season carries the platform\'s money, so it stays with that platform');

    /* the network stops the show: the money goes back, with no lawsuit waiting */
    const netflixBefore = paid.world.platforms!.NETFLIX.cashReserve;
    const stopped = (await stub(0.999, () => processGameWeek(withStudio([fund])))).player;
    assert.equal((studioIn(stopped).studioState!.lockedStreamingFunds || []).length, 0, 'nothing left locked');
    assert.ok(stopped.logs.some(log => log.message.includes('took back the money')), 'a line in the activity log');
    assert.ok(stopped.logs.some(log => log.message.includes('"Glass Harbour" will not get a Season 2.')), 'and the show\'s own line');
    assert.equal((stopped.flags?.activeCases || []).length, (paid.flags?.activeCases || []).length, 'no lawsuit');
    assert.ok(stopped.world.platforms!.NETFLIX.cashReserve >= netflixBefore + 39, `the platform has it back: ${netflixBefore} → ${stopped.world.platforms!.NETFLIX.cashReserve}`);
    const released = releaseStreamingSeasonFunding(paid, studio.id, 'show');
    assert.equal((studioIn(released).studioState!.lockedStreamingFunds || []).length, 0);
    assert.equal(releaseStreamingSeasonFunding(released, studio.id, 'show'), released, 'only once');
    pass('"No Season" in a real week: the money goes back, and nobody is sued');

    /* ---- the first word */
    const licensed = registerProductionStreamingRightsContract({ ...withStudio([]) }, {
        sourceProjectId: 'show', title: 'Glass Harbour', projectType: 'SERIES', genre: 'ACTION', sellerStudioId: studio.id, sellerStudioName: studio.name, sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: 'NETFLIX', minimumGuarantee: 10_000_000, platformRevenueShare: 100, signedAtAbsoluteWeek: now - 12, startsAtAbsoluteWeek: now - 10, durationWeeks: 52,
    }).player;
    const seasonTwo = details('Glass Harbour Season 2', { installmentNumber: 2 });
    const first = getStreamingFirstNegotiation(licensed, seasonTwo, 'show-2', now + 1)!;
    assert.ok(first, 'the last season\'s platform has the first word');
    assert.equal(first.platformName, 'Netflix');
    assert.equal(first.lastSeasonTitle, 'Glass Harbour');
    assert.ok(first.interested && first.amount >= 1_000_000, `it makes an offer: ${first.amount}`);
    assert.ok(first.premiereWeek !== null && first.premiereWeek > now, 'and it picks the week');
    assert.equal(getStreamingNextSeasonLine(licensed, studioIn(licensed), seasonOne), 'Netflix streamed this season, so it gets the first word on the next.');
    pass(`the first word: Netflix offers $${(first.amount / 1e6).toFixed(1)}M, short of what the floor can reach`);

    assert.equal(getStreamingFirstNegotiation(licensed, details('Spin', { installmentNumber: 1 }), 'spin', now + 1), null, 'a first season has nobody to ask');
    assert.equal(getStreamingFirstNegotiation(withStudio([]), seasonTwo, 'show-2', now + 1), null, 'nobody bought the last season: the floor is open');
    const broke: Player = { ...licensed, world: { ...licensed.world, streamingPlatformEcosystem: { ...licensed.world.streamingPlatformEcosystem!, operators: { ...licensed.world.streamingPlatformEcosystem!.operators, NETFLIX: { ...licensed.world.streamingPlatformEcosystem!.operators.NETFLIX, cashMillions: 0 } } }, platforms: { ...licensed.world.platforms!, NETFLIX: { ...licensed.world.platforms!.NETFLIX, cashReserve: 0 } } } };
    assert.equal(getStreamingFirstNegotiation(broke, seasonTwo, 'show-2', now + 1)?.interested, false, 'a platform with no money passes');
    pass('no last buyer, a first season, or a platform that cannot pay: the floor is open');

    /* ---- the way out */
    const paidSeason = {
        id: 'show-2', name: 'Glass Harbour Season 2', type: 'JOB', roleType: 'LEAD', projectPhase: 'AWAITING_RELEASE', phaseWeeksLeft: 0, productionPerformance: 70, platformProductionFunding: 40_000_000,
        projectDetails: details('Glass Harbour Season 2', { installmentNumber: 2 }, { platformId: 'NETFLIX', nextSeasonFundingPlatformId: 'NETFLIX', nextSeasonFundingAmount: 40_000_000, nextSeasonFundingSourceProjectId: 'show', nextSeasonFundingUsedByProjectId: 'show-2', platformProductionFundingApplied: 40_000_000 }),
    } as unknown as Commitment;
    const committed: Player = { ...withStudio([]), commitments: [paidSeason] };
    const quote = getStreamingSeasonLeaveQuote(paidSeason, 'Netflix')!;
    assert.equal(quote.repay, 40_000_000);
    assert.equal(quote.penalty, 40_000_000 * STREAMING_SEASON_LEAVE_PENALTY);
    const cashBefore = committed.world.platforms!.NETFLIX.cashReserve;
    const left = leaveStreamingSeasonFunding(committed, 'show-2');
    assert.ok(left.changed, left.detail);
    assert.equal(studioIn(left.player).balance, studioIn(committed).balance - quote.total, 'the studio repays it and the penalty');
    assert.ok(Math.abs(left.player.world.platforms!.NETFLIX.cashReserve - cashBefore - quote.total / 1e6) < 1e-6, 'and the platform has it');
    const free = left.player.commitments[0];
    assert.equal(getProjectFundingEconomics(free).platformFunding, 0, 'no platform money in it now');
    assert.equal(free.projectDetails!.hiddenStats.platformId, undefined, 'and no platform attached, so the wizard opens the floor');
    assert.ok(studioIn(left.player).studioState!.platformRelations!.NETFLIX.trustModifier! < 0, 'the platform remembers');
    assert.equal(left.player.logs.at(-1)?.message, '"Glass Harbour Season 2" left Netflix: repaid what it paid and a penalty. It is free to sell.');
    const tooPoor: Player = { ...committed, businesses: committed.businesses.map(item => (item.id === studio.id ? { ...item, balance: 1_000_000 } : item)) };
    const refused = leaveStreamingSeasonFunding(tooPoor, 'show-2');
    assert.equal(refused.changed, false);
    assert.equal(refused.player, tooPoor, 'refused: untouched');
    pass('leaving: repay it and 15%, the platform has the money, and the season is free to sell');

    /* ---- every door */
    const wizard = readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
    assert.ok(/getForbesStreamingCompanies\(player\)\.find\(item => item\.id === lockedPremierePlatformId\)/.test(wizard), 'any funder, Prime Video too');
    assert.ok(/getStreamingSeasonFunding\(studio, continuationProject\)/.test(readFileSync('views/lifestyle/business/components/DevelopmentLabFranchiseManager.tsx', 'utf8')), 'Franchise Manager');
    assert.ok(/getStreamingSeasonFunding\(studio, project\)/.test(readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8')), 'Make Sequel');
    pass('Make Sequel, Franchise Manager and the renewal read the same rule, and any platform can be the funder');

    /* ---- a commissioned show: the platform owns it and decides */
    const netflix = built.world.platforms!.NETFLIX;
    const planId = 'season-plan-1';
    const template = {
        id: planId, platformId: 'NETFLIX', controllerAtCommitment: 'AI', source: 'COMMISSIONED_ORIGINAL', status: 'RELEASED', title: 'Paper Kings', projectType: 'SERIES', genre: 'DRAMA', sourceProjectIds: [], rightsContractIds: [],
        cataloguePackageId: null, commissionId: null, sourceStudioId: null, streamingWindow: 'ORIGINAL_STREAMING_PREMIERE', localizationLevel: 'DUBS_AND_SUBTITLES', releaseCountryIds: [], minimumGuaranteeMillions: 0, rightsCostMillions: 0,
        productionFundingMillions: 50, paidSpendMillions: 50, marketingReserveMillions: 14, contingencyMillions: 8, productionEscrow: null, commissioningLifecycle: null, committedAtAbsoluteWeek: now - 40, rightsReadyAtAbsoluteWeek: null,
        localizationReadyAtAbsoluteWeek: null, premiereAtAbsoluteWeek: now - 20, releasePattern: null, releaseEntries: [], scheduledAtAbsoluteWeek: null, releasedAtAbsoluteWeek: now - 20, industryProductionId: null, productionHoldStartedAtAbsoluteWeek: null,
        forecast: { strategic: 82, creative: 78, commercial: 76, prestige: 74, risk: 26 },
    } as never;
    const offer = (rating: number, deliveredAgo: number) => ({
        id: 'delivered-offer', platformId: 'NETFLIX' as PlatformId, platformName: 'Netflix', platformContentPlanId: planId, briefReference: 'REF', title: 'Paper Kings', projectType: 'SERIES', genre: 'DRAMA', status: 'DELIVERED',
        productionBudget: 50_000_000, producerFee: 5_000_000, producerFeePaid: 5_000_000, productionBudgetReturned: 0, minimumImdbRating: 6.5, deliveryAllowanceWeeks: 40, createdAtAbsoluteWeek: now - 60, expiresAtAbsoluteWeek: now - 50,
        acceptedAtAbsoluteWeek: now - 60, greenlitAtAbsoluteWeek: now - 55, deliveredAtAbsoluteWeek: now - deliveredAgo, deliveryDeadlineAtAbsoluteWeek: null, cooldownUntilAbsoluteWeek: null, studioId: studio.id, scriptId: null, commitmentId: null,
        canonicalProductionId: 'paper-kings', finalQualityScore: 80, deliveredImdbRating: rating, releasedAtAbsoluteWeek: null,
    }) as never;
    const withOffer = (rating: number, deliveredAgo: number): Player => ({
        ...withStudio([]),
        world: {
            ...built.world,
            platformAiPlayerCommissionOffers: { 'delivered-offer': offer(rating, deliveredAgo) },
            platforms: { ...built.world.platforms!, NETFLIX: { ...netflix, cashReserve: 5000, ai: { ...netflix.ai!, status: 'ACTIVE', slate: [...netflix.ai!.slate, template] } } },
        },
    });
    const early = withOffer(8, PLATFORM_COMMISSION_RENEWAL_WEEKS - 1);
    assert.equal(decidePlatformAiCommissionRenewals(early, now), early, 'it is still watching');
    const hit = decidePlatformAiCommissionRenewals(withOffer(8, PLATFORM_COMMISSION_RENEWAL_WEEKS), now);
    const offers = Object.values(hit.world.platformAiPlayerCommissionOffers!);
    const next = offers.find(item => item.id !== 'delivered-offer')!;
    assert.ok(next, 'a good show brings the studio back');
    assert.equal(next.title, 'Paper Kings Season 2');
    assert.equal(next.status, 'PENDING');
    assert.ok(next.producerFee > 0, 'for a new fee');
    assert.ok(hit.inbox.some(message => message.data?.offerId === next.id), 'a new offer in the inbox');
    assert.ok(hit.logs.some(log => log.message.includes('wants your studio back for Paper Kings Season 2')));
    assert.ok(hit.world.platforms!.NETFLIX.ai!.slate.some(plan => plan.title === 'Paper Kings Season 2' && plan.status === 'BRIEF'), 'on its slate');
    assert.equal(decidePlatformAiCommissionRenewals(hit, now), hit, 'it decides once');
    const miss = decidePlatformAiCommissionRenewals(withOffer(5, PLATFORM_COMMISSION_RENEWAL_WEEKS), now);
    assert.equal(Object.values(miss.world.platformAiPlayerCommissionOffers!).length, 1, 'a weak show: no next season');
    assert.ok(miss.logs.some(log => log.message.includes('is not renewing "Paper Kings"')));
    pass('a commission: the platform decides, a good show brings the studio back for a new fee, a weak one ends');
    console.log('season-rights audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
