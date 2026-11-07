import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingOriginalCommission, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getOwnedStreamingProgramEntries } from '../services/streamingOriginals';
import { resolveStreamingViewingProjectFacts } from '../services/worldEconomy/worldStreamingViewing';
import {
    endOriginal, extendOriginalLicence, getOriginalFutureView, getSeasonPriceRise, ORIGINAL_EVIDENCE_WEEKS, renewOriginal, spinOffOriginal,
} from '../services/originalsRenewal';
import { getOriginalTitleDetail } from '../services/originalsTitleDetail';
import { getSeasonEffects, getStudioSeasonShares } from '../services/originalsEpisodeBudget';
import { runOriginalLicenceWeek } from '../services/originalsRivals';
import { groupSeriesRows, getSeasonRatings } from '../services/seriesIdentity';

/* #292: another season, a spin-off, an end, a licence running out: all on the title's own page, all from the real record. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-renewal-audit', name: 'Audit', age: 30, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

/* the ranges */
assert.equal(getSeasonPriceRise(2, 0), 15);
assert.equal(getSeasonPriceRise(2, 1), 25);
assert.equal(getSeasonPriceRise(3, 0), 25);
assert.equal(getSeasonPriceRise(3, 1), 40);
assert.equal(getSeasonPriceRise(4, 0), 40);
assert.equal(getSeasonPriceRise(7, 1), 60);

const PROJECT = 'job_live';
const COMMISSION = 'commission_live';
const STUDIO = 'WARNER_BROS';
const bars = getStudioSeasonShares('BIG_FINALE', 8);

const run = async () => {
    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    const base = ('player' in built ? built.player : built) as Player;
    const now = getAbsoluteWeek(base.age, base.currentWeek);
    const commission = (extra: Partial<OwnedStreamingOriginalCommission> = {}): OwnedStreamingOriginalCommission => ({
        id: COMMISSION, scriptId: 'script_live', canonicalProjectId: PROJECT, title: 'Harrow Lane', gapId: 'SERIES_RETENTION', projectType: 'SERIES', genre: 'DRAMA', episodes: 8,
        producerStudioId: STUDIO, producerStudioName: 'Warner Bros.', commissionedByPlatformName: 'Test', productionBudgetCap: 60_000_000, productionFundingApplied: 60_000_000,
        status: 'GREENLIT', commissionedAtAbsoluteWeek: now - 40, greenlitAtAbsoluteWeek: now - 40, lineageId: COMMISSION, seasonNumber: 1,
        contract: { platformRightsPercent: 100, producerBackendPercent: 0, exclusiveWindowWeeks: 104, sequelRightsIncluded: true },
        localization: null, lifecycleDecision: null, way: 'PITCH', deal: 'BUY', making: 50_000_000, fee: 10_000_000, feePercent: 20,
        releasePlan: { scope: 'GLOBAL', releasePattern: 'FULL_SEASON', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: now - 6, authorizedAtAbsoluteWeek: now - 8 },
        ...extra,
    } as OwnedStreamingOriginalCommission);
    const row = (rating: number) => ({
        id: PROJECT, name: 'Harrow Lane', type: 'ACTING_GIG', roleType: 'MINOR', year: base.age, earnings: 0, rating, imdbRating: rating, reception: 'FINISHED', projectQuality: 74, boxOfficeResult: '$0', outcomeTier: 'NEUTRAL',
        subtype: 'STANDALONE', studioId: STUDIO, outsideOriginal: true, genre: 'DRAMA', projectType: 'SERIES', episodes: 8, description: 'A town keeps a secret.', directorName: 'Ada Penn', directorId: 'npc_director',
        castList: [
            { id: 'a', name: 'Mara Quill', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', roleType: 'LEAD', actorId: 'a' },
            { id: 'b', name: 'Tom Rill', role: 'Second', isPlayer: false, image: '', type: 'ACTOR', roleType: 'SUPPORTING', actorId: 'b' },
        ],
        reviews: [], gross: 0, budget: 50_000_000, releaseYear: base.age, releaseWeek: base.currentWeek, releasedAtAbsoluteWeek: now - 6, episodeBudgetShares: bars,
    });
    const history = (projectId: string) => Array.from({ length: 6 }, (_, index) => ({
        absoluteWeek: now - 6 + index, operations: { titlePerformance: [{ projectId, title: 'Harrow Lane', absoluteWeek: now - 6 + index, viewingAccounts: 2_000_000, completionRate: 0.7, discoveryMix: { homepagePercent: 50, recommendationsPercent: 20, searchPercent: 10, directPercent: 10, marketingPercent: 5, externalBuzzPercent: 5 }, attributedSubscriptionRevenue: 0, advertisingRevenue: 0, incrementalRevenue: 0, allocatedCashCost: 0, allocatedContentAmortization: 0, satisfactionScore: 70 }] },
    }));
    const company = (rating = 8.2, extra: Partial<OwnedStreamingOriginalCommission> = {}): Player => ({
        ...base,
        pastProjects: [...base.pastProjects, row(rating) as any],
        ownedStreamingPlatform: {
            ...base.ownedStreamingPlatform,
            treasuryCash: 900_000_000,
            originalCommissions: [...base.ownedStreamingPlatform.originalCommissions, commission(extra)],
            weeklyHistory: [...base.ownedStreamingPlatform.weeklyHistory, ...history(PROJECT)] as any,
        },
    });
    const of = (player: Player, id = COMMISSION) => player.ownedStreamingPlatform.originalCommissions.find(item => item.id === id)!;

    /* --- the page's quote */
    const hit = getOriginalFutureView(company(8.4), COMMISSION)!;
    const quiet = getOriginalFutureView(company(6.1), COMMISSION)!;
    assert.equal(hit.waitWeeks, 0);
    assert.ok(hit.next && quiet.next);
    assert.ok(hit.next!.rise > quiet.next!.rise, `a bigger hit asks more: ${hit.next!.rise} and ${quiet.next!.rise}`);
    assert.ok(hit.next!.rise >= 15 && hit.next!.rise <= 25, 'Season 2 is 15 to 25%');
    assert.equal(hit.next!.nextSeason, 2);
    assert.equal(hit.next!.making, Math.round(50_000_000 * (1 + hit.next!.rise / 100) / 100_000) * 100_000);
    assert.ok(hit.next!.fee > 0, 'a studio takes its fee again');
    assert.equal(hit.next!.total, hit.next!.making + hit.next!.fee);
    assert.equal(hit.next!.hype, getSeasonEffects(bars).hype, 'the finale it spent on');
    assert.ok(hit.next!.hype > 0);
    assert.ok(getOriginalFutureView(company(8.4), COMMISSION, 12)!.next!.making > hit.next!.making, 'more episodes cost more');
    assert.equal(getOriginalFutureView(company(8.4, { deal: 'LICENCE', fee: 0 }), COMMISSION)!.next!.fee, 0);

    /* waits for numbers */
    const early = company(8.4, { releasePlan: { scope: 'GLOBAL', releasePattern: 'FULL_SEASON', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: now, authorizedAtAbsoluteWeek: now - 2 } as any });
    assert.equal(getOriginalFutureView(early, COMMISSION)!.waitWeeks, ORIGINAL_EVIDENCE_WEEKS);
    assert.equal(renewOriginal(early, COMMISSION).changed, false, 'numbers first');

    /* --- renew */
    const player = company(8.4);
    const treasury = player.ownedStreamingPlatform.treasuryCash;
    const renewed = renewOriginal(player, COMMISSION);
    assert.ok(renewed.changed, renewed.message);
    assert.equal(renewed.player.ownedStreamingPlatform.treasuryCash, treasury - hit.next!.total, 'paid at once');
    assert.equal(renewed.player.energy.current, player.energy.current - 15, '15 energy');
    const parent = of(renewed.player);
    const child = of(renewed.player, renewed.nextCommissionId);
    assert.equal(parent.nextSeasonCommissionId, renewed.nextCommissionId);
    assert.equal(child.parentCommissionId, COMMISSION);
    assert.equal(child.lineageId, COMMISSION);
    assert.equal(child.seasonNumber, 2);
    assert.equal(child.title, 'Harrow Lane: Season 2');
    assert.equal(child.making, hit.next!.making);
    const job = renewed.player.commitments.find(item => item.id === child.canonicalProjectId)!;
    assert.ok(job, 'a real project');
    assert.equal(job.projectPhase, 'PRE_PRODUCTION');
    assert.equal(job.projectDetails!.studioId, STUDIO);
    assert.equal(job.projectDetails!.hiddenStats.outsideOriginal, true);
    assert.equal(job.projectDetails!.hiddenStats.previousSeasonHype, hit.next!.hype);
    assert.equal(job.projectDetails!.installmentNumber, 2);
    assert.deepEqual(job.projectDetails!.castList!.map(member => member.name), ['Mara Quill', 'Tom Rill'], 'the same people');
    assert.equal(job.projectDetails!.directorName, 'Ada Penn');
    assert.ok(job.productionCalendar!.totalWeeks >= 20 && job.productionCalendar!.totalWeeks <= 35);
    assert.equal(job.projectDetails!.episodeBudgetShares?.length, 8);
    assert.equal(getOriginalTitleDetail(renewed.player, child.id)!.stage, 'MAKING');
    assert.equal(getOriginalFutureView(renewed.player, COMMISSION)!.next, null, 'not twice');
    assert.equal(getOriginalFutureView(renewed.player, COMMISSION)!.nextCommissionId, renewed.nextCommissionId);
    assert.equal(renewOriginal(renewed.player, COMMISSION).changed, false);
    const broke: Player = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, treasuryCash: 100 } };
    assert.equal(renewOriginal(broke, COMMISSION).changed, false, 'no money');
    assert.equal(renewOriginal({ ...player, energy: { ...player.energy, current: 3 } }, COMMISSION).changed, false, 'no energy');

    /* the season's own hype reaches viewers: same title, first weeks, more pull */
    const seasonTwoRow = { ...row(8), id: 's2', name: 'Harrow Lane: Season 2', previousSeasonHype: 0.2, episodeBudgetShares: undefined };
    const facts = (extra: any) => resolveStreamingViewingProjectFacts({ ...player, pastProjects: [{ ...seasonTwoRow, ...extra } as any] }, { projectId: 's2', projectType: 'SERIES', source: 'ORIGINAL' } as any, 1);
    assert.ok(facts({}).pacingPull! - facts({ previousSeasonHype: 0 }).pacingPull! > 0.19, 'the finale brings them back');

    /* a season group reads as one show on its page */
    const groups = groupSeriesRows([row(8), { ...row(8), id: 's2', name: 'Harrow Lane: Season 2', franchiseId: PROJECT, installmentNumber: 2 }], (item: any) => item);
    assert.ok(groups.length <= 2 && getSeasonRatings({ ...row(8), episodeRatings: undefined }).length === 0);

    /* --- a licence */
    const licensed = company(8.4, { deal: 'LICENCE', fee: 0, licenceEndsAtAbsoluteWeek: now + 10 });
    const clock = getOriginalFutureView(licensed, COMMISSION)!.licence!;
    assert.equal(clock.weeksLeft, 10);
    assert.equal(clock.gone, false);
    assert.equal(getStreamingContentAvailability(licensed, PROJECT).status, 'LIVE');
    assert.ok(getOwnedStreamingProgramEntries(licensed).some(entry => entry.projectId === PROJECT));
    assert.equal(getOriginalFutureView(licensed, COMMISSION)!.canSpinOff, false, 'a spin-off is not yours on a licence');
    const over = company(8.4, { deal: 'LICENCE', fee: 0, licenceEndsAtAbsoluteWeek: now });
    assert.equal(getOriginalFutureView(over, COMMISSION)!.licence!.gone, true);
    assert.equal(getStreamingContentAvailability(over, PROJECT).status, 'RIGHTS_EXPIRED', 'it has gone back');
    assert.ok(!getOwnedStreamingProgramEntries(over).some(entry => entry.projectId === PROJECT), 'off the programme');
    const bought = extendOriginalLicence(over, COMMISSION);
    assert.ok(bought.changed);
    assert.equal(of(bought.player).licenceEndsAtAbsoluteWeek, now + 156);
    assert.equal(bought.player.ownedStreamingPlatform.treasuryCash, over.ownedStreamingPlatform.treasuryCash - clock.extendPrice);
    assert.equal(getStreamingContentAvailability(bought.player, PROJECT).status, 'LIVE', 'and back on');
    assert.equal(extendOriginalLicence(company(8.4), COMMISSION).changed, false, 'one you bought is yours');
    /* the log says when it is close, and when it has gone, once each */
    const twelve = company(8.4, { deal: 'LICENCE', fee: 0, licenceEndsAtAbsoluteWeek: now + 12 });
    assert.match(runOriginalLicenceWeek(twelve).logs.at(-1)!.message, /goes back to Warner Bros\. in 12 weeks/);
    assert.match(runOriginalLicenceWeek(over).logs.at(-1)!.message, /went back to Warner Bros\./);
    assert.equal(runOriginalLicenceWeek(licensed).logs.length, licensed.logs.length, 'quiet the other weeks');

    /* --- a spin-off */
    const view = getOriginalFutureView(player, COMMISSION)!;
    assert.ok(view.canSpinOff);
    const spun = spinOffOriginal(player, COMMISSION);
    assert.ok(spun.changed, spun.message);
    assert.equal(of(spun.player).lifecycleDecision?.type, 'FRANCHISE');
    const spunChild = spun.player.ownedStreamingPlatform.originalCommissions.at(-1)!;
    assert.match(spunChild.title, /^Harrow Lane: /);
    assert.equal(spun.player.commitments.find(item => item.id === spunChild.canonicalProjectId)!.projectDetails!.subtype, 'SPINOFF');
    assert.deepEqual(spun.player.commitments.find(item => item.id === spunChild.canonicalProjectId)!.projectDetails!.castList!.map(member => member.name), ['Mara Quill'], 'its lead carries it');
    assert.equal(getOriginalFutureView(spun.player, COMMISSION)!.canSpinOff, false, 'one spin-off');
    assert.ok(getOriginalFutureView(spun.player, COMMISSION)!.next, 'and the show can still be renewed');

    /* --- the end */
    const hitEnd = endOriginal(player, COMMISSION);
    assert.ok(hitEnd.changed);
    assert.match(hitEnd.player.news[0].headline, /furious/, 'fans have their say');
    assert.equal(of(hitEnd.player).lifecycleDecision?.type, 'CANCEL');
    assert.equal(getOriginalFutureView(hitEnd.player, COMMISSION)!.ended, true);
    assert.equal(getOriginalFutureView(hitEnd.player, COMMISSION)!.next, null);
    assert.equal(renewOriginal(hitEnd.player, COMMISSION).changed, false, 'no more of it');
    assert.equal(getStreamingContentAvailability(hitEnd.player, PROJECT).status, 'LIVE', 'it stays on the service');
    assert.doesNotMatch(endOriginal(company(6.1), COMMISSION).player.news[0].headline, /furious/);

    /* your own studio pays no fee */
    const house = { id: STUDIO, type: 'PRODUCTION_HOUSE', name: 'House', balance: 0, stats: {}, studioState: {} } as any;
    const ownRow = { ...row(8.4), outsideOriginal: false };
    const own: Player = { ...player, businesses: [...player.businesses, house], pastProjects: [...base.pastProjects, ownRow as any] };
    const ownQuote = getOriginalFutureView(own, COMMISSION)!.next!;
    assert.equal(ownQuote.fee, 0);
    assert.equal(ownQuote.outside, false);

    /* --- a season all the way through the real week */
    let current = renewed.player;
    const seasonJob = child.canonicalProjectId!;
    current = { ...current, commitments: current.commitments.map(item => (item.id === seasonJob ? { ...item, projectPhase: 'POST_PRODUCTION', phaseWeeksLeft: 1, totalPhaseDuration: 1 } : item)) };
    current = (await processGameWeek(current)).player;
    assert.equal(current.commitments.find(item => item.id === seasonJob)?.projectPhase, 'AWAITING_RELEASE');
    current = { ...current, commitments: current.commitments.map(item => (item.id === seasonJob ? { ...item, phaseWeeksLeft: 1, totalPhaseDuration: 1, projectDetails: { ...item.projectDetails!, releaseStrategy: 'STREAMING_ONLY' } } : item)) };
    current = (await processGameWeek(current)).player;
    const archived: any = current.pastProjects.find(item => item.id === seasonJob);
    assert.ok(archived, 'Season 2 opens');
    assert.equal(archived.previousSeasonHype, hit.next!.hype, 'the archive keeps it for the first weeks');
    assert.equal(archived.installmentNumber, 2);
    assert.ok(archived.imdbRating > 0);
    assert.equal(getSeasonRatings(archived)[0]?.season, 2, 'its ratings are its own');

    /* a save keeps it all */
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(renewed.player)));
    assert.equal(of(reloaded).nextSeasonCommissionId, renewed.nextCommissionId);
    assert.equal(of(reloaded, renewed.nextCommissionId).parentCommissionId, COMMISSION);

    console.log('original renewal audit passed');
};
run().catch(error => { console.error(error); process.exit(1); });
