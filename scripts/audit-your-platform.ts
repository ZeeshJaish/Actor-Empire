/**
 * #244 (plan §25.4 Q3): your own film on your own service, and one answer to where a title streams, read from both directions. Builds the developer
 * test company (~30 s), then runs real weeks: a planned premiere, a film that leaves cinemas, an outside window that ends.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type ActiveRelease, type Commitment, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createBusiness } from '../services/businessLogic';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getContentMarketOwnedTitles, linkContentMarketOwnedTitles } from '../services/streamingContentMarket';
import { getEligibleOwnedStreamingTitles } from '../services/streamingCatalog';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';
import { getStreamingTitlePlacement } from '../services/streamingTitlePlacement';
import { announceStreamingRightsBack, placeTitleOnYourService, pullTitleFromYourService, sendTitleToYourService } from '../services/streamingYourPlatform';
import { getOwnedStreamingProgramEntries } from '../services/streamingOriginals';
import { getStreamingDecisionView } from '../services/streamingDecisionEvent';
import { buildCinemaWeekInput } from '../services/boxOffice/boxOfficeWeek';
import { quoteCinemaSupply } from '../services/boxOffice/boxOfficeSupply';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { scheduleStreamingSlateTitle } from '../services/streamingSlateProgramming';

const pass = (label: string) => console.log(`PASS ${label}`);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const entryOf = (player: Player, id: string) => player.ownedStreamingPlatform.launchSlate?.entries.find(entry => entry.projectId === id);
const premiereOf = (player: Player, id: string) => {
    const entry = entryOf(player, id);
    return entry ? player.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek + entry.launchWeek - 1 : null;
};
const atWeek = (player: Player, target: number): Player => {
    let age = player.age;
    let currentWeek = player.currentWeek + target - weekOf(player);
    while (currentWeek > 52) { currentWeek -= 52; age += 1; }
    return { ...player, age, currentWeek };
};
const logged = (player: Player, text: string) => (player.logs || []).some(log => log.message.includes(text));

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'your-platform-audit', name: 'Your Platform', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

async function main() {
    const started = performance.now();
    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const studio = built.businesses.find(business => business.type === 'PRODUCTION_HOUSE') || createBusiness('Audit Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20);
    const base: Player = { ...built, money: 2e9, pendingEvent: null, pendingEvents: [], businesses: built.businesses.some(business => business.id === studio.id) ? built.businesses : [...built.businesses, studio] };
    const service = base.ownedStreamingPlatform.identity!.name;
    const details = (title: string, extra: Record<string, unknown> = {}) => {
        const project = structuredClone(makeCinemaFixture(7).project);
        return { ...project, title, studioId: studio.id as never, castList: [], releaseStrategy: 'STREAMING_ONLY', hiddenStats: { ...project.hiddenStats, ...extra } };
    };
    const pastFilm = { id: 'past-film', name: 'Past Film', type: 'MOVIE', year: 2030, studioId: studio.id, projectDetails: details('Past Film') } as never;
    const withPast: Player = { ...base, pastProjects: [...base.pastProjects, pastFilm] };
    const now = weekOf(withPast);

    /* ---- the one answer */
    const nowhere = getStreamingTitlePlacement(withPast, 'past-film');
    assert.equal(nowhere.kind, 'NOWHERE');
    assert.equal(nowhere.line, 'Not streaming anywhere.');
    assert.ok(nowhere.mayPutOnYours && nowhere.maySellOutside && !nowhere.mayPull);
    pass('a released title on nothing can go either way');

    /* #252: the rights floor sends it to the shelf; only Content's Slate gives it a week */
    const sent = sendTitleToYourService(withPast, 'past-film');
    assert.ok(sent.changed, sent.detail);
    assert.equal(sent.detail, `It is on your ${service} shelf. Schedule it in Content.`);
    assert.equal(sent.player.logs.at(-1)?.message, `"Past Film" is on your ${service} shelf. Schedule it in Content.`, 'a line in the activity log too');
    const shelved = getStreamingTitlePlacement(sent.player, 'past-film');
    assert.equal(shelved.kind, 'YOURS');
    assert.equal(shelved.onShelf, true);
    assert.equal(shelved.line, `On your ${service} shelf. Not live yet.`);
    assert.equal(premiereOf(sent.player, 'past-film'), null, 'no week yet');
    assert.ok(sent.player.ownedStreamingPlatform.catalogProjectIds.includes('past-film'));
    assert.equal(getStreamingContentAvailability(sent.player, 'past-film').status, 'READY', 'not live');
    assert.equal(sent.player.money, withPast.money, 'no fee');
    assert.equal(sendTitleToYourService(sent.player, 'past-film').changed, false, 'it cannot be sent twice');
    assert.ok(!getOwnedStreamingProgramEntries(sent.player).some(entry => entry.projectId === 'past-film'), 'nothing in the programme');
    pass('sent to your service: no fee, on the shelf, not live, and the words say so');

    let sitting = sent.player;
    for (let weeks = 0; weeks < 2; weeks += 1) sitting = { ...(await processGameWeek(sitting)).player, pendingEvents: [] };
    assert.equal(getStreamingContentAvailability(sitting, 'past-film').status, 'READY', 'two real weeks later it is still not live');
    assert.ok(!getOwnedStreamingProgramEntries(sitting).some(entry => entry.projectId === 'past-film'), 'and still not in the programme');
    assert.equal(getStreamingContentAvailability(compactPlayerForPersistence(structuredClone({ ...sent.player })) as Player, 'past-film').status, 'READY', 'and a save keeps it there');
    pass('two real weeks on the shelf: still not live, until someone schedules it');

    const put = scheduleStreamingSlateTitle(sent.player, { projectId: 'past-film', absoluteWeek: now + 4, marketingPlan: 'STANDARD' });
    assert.ok(put.changed, put.reason);
    const placed = getStreamingTitlePlacement(put.player, 'past-film');
    assert.equal(placed.kind, 'YOURS');
    assert.equal(placed.onShelf, false);
    assert.equal(premiereOf(put.player, 'past-film'), now + 4, 'the week the Slate set');
    assert.equal(getStreamingContentAvailability(put.player, 'past-film').status, 'SCHEDULED');
    assert.ok(placed.line.startsWith(`On ${service} from Week`), placed.line);
    pass('scheduled on the Slate: a premiere week, and the words say so');

    assert.equal(placed.maySellOutside, false);
    assert.equal(placed.whyNotSellOutside, `It is on ${service}. Pull it off first.`);
    assert.ok(/getStreamingTitlePlacement\(player, project\.id\)\.maySellOutside/.test(readFileSync('views/lifestyle/business/components/ProjectDashboardModal.tsx', 'utf8')), 'Filmography reads it');
    assert.ok(/titlePlacement\.onYours && titlePlacement\.whyNotSellOutside/.test(readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8')), 'the wizard reads it');
    pass('on your service, selling outside asks you to pull it first');

    const pulled = pullTitleFromYourService(put.player, 'past-film');
    assert.ok(pulled.changed);
    assert.equal(entryOf(pulled.player, 'past-film'), undefined);
    assert.ok(!pulled.player.ownedStreamingPlatform.catalogProjectIds.includes('past-film'));
    const afterPull = getStreamingTitlePlacement(pulled.player, 'past-film');
    assert.ok(afterPull.kind === 'NOWHERE' && afterPull.maySellOutside && afterPull.mayPutOnYours);
    assert.equal(pullTitleFromYourService(pulled.player, 'past-film').changed, false, 'nothing to pull twice');
    assert.ok(sendTitleToYourService(pulled.player, 'past-film').changed, 'it can go back');
    assert.ok(pullTitleFromYourService(sent.player, 'past-film').changed, 'off the shelf too');
    pass('pull it: off the shelves and the Slate, free to sell, free to come back');

    const liveFor = await processGameWeek(placeTitleOnYourService(withPast, 'past-film', now + 1).player);
    assert.equal(getStreamingContentAvailability(liveFor.player, 'past-film').status, 'LIVE', 'a real week: it is on the service');
    const pullLive = pullTitleFromYourService(liveFor.player, 'past-film');
    assert.ok(pullLive.changed, 'a premiered title can come off too');
    assert.ok(!(await processGameWeek(pullLive.player)).player.ownedStreamingPlatform.catalogProjectIds.includes('past-film'), 'and it stays off');
    pass('a real week: it premieres in that week, and a live title can be pulled');

    /* ---- an outside window */
    const sold = registerProductionStreamingRightsContract(withPast, {
        sourceProjectId: 'past-film', title: 'Past Film', projectType: 'MOVIE', genre: 'ACTION', sellerStudioId: studio.id, sellerStudioName: studio.name, sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: 'NETFLIX', minimumGuarantee: 1_000_000, platformRevenueShare: 100, signedAtAbsoluteWeek: now, startsAtAbsoluteWeek: now + 1, durationWeeks: 10,
    });
    assert.ok(sold.contract);
    const held = getStreamingTitlePlacement(sold.player, 'past-film');
    assert.equal(held.kind, 'EXCLUSIVE_OUTSIDE');
    assert.ok(held.line.startsWith('Netflix holds it until Week'), held.line);
    assert.equal(held.mayPutOnYours, false);
    const refused = sendTitleToYourService(sold.player, 'past-film');
    assert.equal(refused.changed, false);
    assert.equal(refused.player, sold.player, 'refused: the save is untouched');
    const lot = getContentMarketOwnedTitles(sold.player).find(title => title.id === 'past-film')!;
    assert.ok(lot.unavailableReason?.startsWith('Netflix holds it until Week'), `Bring it across says who and until when: ${lot.unavailableReason}`);
    assert.equal(linkContentMarketOwnedTitles(sold.player, ['past-film']).changed, false);
    assert.equal(held.maySellOutside, false, 'nor can it be sold twice');
    pass('with an outside exclusive: Bring it across and Filmography say who holds it and until when');

    /* window ends: one line, and it is free */
    const ends = sold.contract!.expiresAtAbsoluteWeek;
    const atEnd = atWeek(sold.player, ends);
    assert.equal(weekOf(atEnd), ends);
    const back = getStreamingTitlePlacement(atEnd, 'past-film');
    assert.equal(back.kind, 'NOWHERE', 'at the end week the holder has gone');
    assert.ok(back.mayPutOnYours && back.maySellOutside, 'it can go either way again');
    const told = announceStreamingRightsBack(atEnd, ends);
    assert.equal(told.logs.at(-1)?.message, `"Past Film" is back from Netflix. Sell it again or send it to ${service} from Filmography.`);
    assert.equal(told.pendingEvents.length, atEnd.pendingEvents.length, 'a line in the log, not a popup');
    pass('the window ends: one line in the activity log, no popup, free both ways');

    /* on the shelf, then exclusive: nothing to come back to but the shelf */
    const shelfSold = registerProductionStreamingRightsContract(sent.player, {
        sourceProjectId: 'past-film', title: 'Past Film', projectType: 'MOVIE', genre: 'ACTION', sellerStudioId: studio.id, sellerStudioName: studio.name, sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: 'NETFLIX', minimumGuarantee: 1_000_000, platformRevenueShare: 100, signedAtAbsoluteWeek: now, startsAtAbsoluteWeek: now, durationWeeks: 10,
    }).player;
    assert.ok(!getStreamingTitlePlacement(shelfSold, 'past-film').line.includes('Back on'), getStreamingTitlePlacement(shelfSold, 'past-film').line);
    assert.equal(announceStreamingRightsBack(atWeek(shelfSold, now + 10), now + 10).logs.at(-1)?.message, `"Past Film" is back from Netflix, and on your ${service} shelf. Schedule it in Content.`);
    pass('on the shelf, then sold: the words do not say it was ever on the service');

    /* on yours first (an old save), then exclusive: no dark week when it ends */
    const oldSave = placeTitleOnYourService(withPast, 'past-film', now + 1).player;
    const oldSold = registerProductionStreamingRightsContract(oldSave, {
        sourceProjectId: 'past-film', title: 'Past Film', projectType: 'MOVIE', genre: 'ACTION', sellerStudioId: studio.id, sellerStudioName: studio.name, sellerPartyType: 'PLAYER_STUDIO',
        buyerPlatformId: 'NETFLIX', minimumGuarantee: 1_000_000, platformRevenueShare: 100, signedAtAbsoluteWeek: now, startsAtAbsoluteWeek: now, durationWeeks: 10,
    }).player;
    assert.ok(getStreamingTitlePlacement(oldSold, 'past-film').line.includes(`Back on ${service} after that`));
    const at = (week: number): Player => atWeek(oldSold, week);
    assert.equal(getStreamingContentAvailability(at(now + 9), 'past-film').available, false, 'dark while Netflix holds it');
    assert.equal(getStreamingContentAvailability(at(now + 9), 'past-film').coveredCountryIds.length, 0, 'in every market: a worldwide deal covers the ones opened after day one too');
    assert.equal(getStreamingContentAvailability(at(now + 10), 'past-film').available, true, 'and back the week the window ends: no dark week');
    assert.equal(announceStreamingRightsBack(at(now + 10), now + 10).logs.at(-1)?.message, `"Past Film" is back from Netflix, and back on ${service}.`);
    pass('an old save with both: dark only while the buyer holds it, and no dark week after');

    /* ---- a Netflix commission is not the player's to place */
    const commissioned: Player = { ...withPast, world: { ...withPast.world, platformAiPlayerCommissionOffers: { offer: { id: 'offer', status: 'DELIVERED', canonicalProductionId: 'past-film', platformName: 'Netflix' } as never } } };
    const theirs = getStreamingTitlePlacement(commissioned, 'past-film');
    assert.equal(theirs.kind, 'THEIRS');
    assert.ok(!theirs.mayPutOnYours && !theirs.maySellOutside);
    assert.equal(getContentMarketOwnedTitles(commissioned).find(title => title.id === 'past-film')!.unavailableReason, 'Netflix owns it. You made it for them.');
    pass('a commission: the platform owns it, and every door says so');

    /* ---- the wizard's route: a real release, on the Slate from the moment it is locked */
    const commitment = {
        id: 'planned-film', name: 'Planned Film', type: 'JOB', roleType: 'LEAD', projectPhase: 'AWAITING_RELEASE', phaseWeeksLeft: 4, totalPhaseDuration: 4, productionPerformance: 70,
        projectDetails: details('Planned Film', { ownPlatformRelease: true }),
    } as unknown as Commitment;
    const planned: Player = { ...base, commitments: [...base.commitments, commitment] };
    assert.ok(getEligibleOwnedStreamingTitles(planned).some(title => title.id === 'planned-film'), 'on your shelves while it waits');
    const locked = placeTitleOnYourService(planned, 'planned-film', now + 4);
    assert.ok(locked.changed, locked.detail);
    assert.equal(premiereOf(locked.player, 'planned-film'), now + 4);
    assert.equal(getStreamingContentAvailability(locked.player, 'planned-film').status, 'SCHEDULED');
    const moved = scheduleStreamingSlateTitle(locked.player, { projectId: 'planned-film', absoluteWeek: now + 6, marketingPlan: 'STANDARD' });
    assert.equal(moved.player.commitments.find(item => item.id === 'planned-film')?.phaseWeeksLeft, 6, 'moving it on the Slate moves its release');
    const plannedPlacement = getStreamingTitlePlacement(locked.player, 'planned-film');
    assert.equal(plannedPlacement.kind, 'YOURS');
    assert.equal(plannedPlacement.mayPull, false, 'not until it is released; the Slate can move it');
    assert.equal(plannedPlacement.maySellOutside, false);
    let ran = locked.player;
    for (let weeks = 0; weeks < 3; weeks += 1) ran = { ...(await processGameWeek(ran)).player, pendingEvents: [] };
    assert.ok(ran.commitments.some(item => item.id === 'planned-film'), 'still waiting');
    ran = { ...(await processGameWeek(ran)).player, pendingEvents: [] };
    assert.ok(!ran.commitments.some(item => item.id === 'planned-film'), 'released on that week');
    assert.ok(ran.pastProjects.some(item => item.id === 'planned-film'), 'and archived: no outside run to wait for');
    assert.ok(!ran.activeReleases.some(item => item.id === 'planned-film'));
    assert.equal(weekOf(ran), now + 4);
    assert.equal(getStreamingContentAvailability(ran, 'planned-film').status, 'LIVE');
    assert.ok(logged(ran, `"Planned Film" is on ${service}.`), 'a line in the log');
    assert.equal(Object.values(ran.world.streamingRightsContracts || {}).filter(contract => contract.sourceProjectId === 'planned-film').length, 0, 'no contract with anybody');
    assert.equal(getStreamingTitlePlacement(ran, 'planned-film').mayPull, true);
    pass('the wizard route: Slate at once, a real release that week, no outside platform, no contract');

    /* ---- it survives a save */
    const saved = compactPlayerForPersistence(structuredClone({ ...locked.player }));
    assert.equal(saved.commitments.find(item => item.id === 'planned-film')?.projectDetails?.hiddenStats?.ownPlatformRelease, true);
    assert.ok(saved.ownedStreamingPlatform.catalogProjectIds.includes('planned-film'));
    assert.ok(entryOf(saved as Player, 'planned-film'));
    pass('it survives a save');

    /* ---- a film in cinemas goes on when they close */
    const cinemaWeek = now + 1;
    const film = {
        id: 'cinema-film', name: 'Cinema Film', type: 'MOVIE', roleType: 'LEAD',
        projectDetails: { ...details('Cinema Film'), releaseStrategy: 'THEATRICAL', estimatedBudget: 1e12, releaseRegionIds: ['NORTH_AMERICA'], releaseChainSelections: { NORTH_AMERICA: ['NOVA_CIRCUIT'] }, cinemaExposure: { version: 1, attentionBasis: 'PACKAGE', attentionPotential: 0, events: [] } },
        weekNum: 11, weeklyGross: [], totalGross: 0, budget: 1e12, status: 'RUNNING', productionPerformance: 80, imdbRating: 8, distributionPhase: 'THEATRICAL', sequelDecisionMade: true, releasedAtAbsoluteWeek: cinemaWeek - 10,
    } as unknown as ActiveRelease;
    const inCinemas: Player = { ...base, activeReleases: [...base.activeReleases, film] };
    assert.ok(getStreamingTitlePlacement(inCinemas, 'cinema-film').mayPutOnYours);
    /* #253: live by itself, the weeks chosen after the run closes */
    const flagged = sendTitleToYourService(inCinemas, 'cinema-film', 2);
    assert.ok(flagged.changed);
    const waiting = getStreamingTitlePlacement(flagged.player, 'cinema-film');
    assert.equal(waiting.line, `On ${service} 2 weeks after cinemas close`);
    assert.equal(flagged.player.logs.at(-1)?.message, `"Cinema Film": It goes live on ${service} 2 weeks after cinemas close.`);
    assert.equal(waiting.maySellOutside, false);
    assert.ok(!flagged.player.ownedStreamingPlatform.catalogProjectIds.includes('cinema-film'), 'not on the shelves while it plays');
    const unflagged = pullTitleFromYourService(flagged.player, 'cinema-film');
    assert.ok(unflagged.changed && getStreamingTitlePlacement(unflagged.player, 'cinema-film').afterCinema === false, 'it can be changed');
    flagged.player.world.cinemaMarket!.market.runs = quoteCinemaSupply(buildCinemaWeekInput(flagged.player, cinemaWeek)).offers.map(offer => ({ ...offer, quietWeeks: 2, closed: false }));
    const closed = (await processGameWeek(flagged.player)).player;
    assert.ok(!closed.activeReleases.some(item => item.id === 'cinema-film'), 'the run closed');
    assert.ok(closed.pastProjects.some(item => item.id === 'cinema-film'), 'archived');
    assert.equal(premiereOf(closed, 'cinema-film'), cinemaWeek + 2, 'the weeks chosen after it closed');
    assert.ok(closed.ownedStreamingPlatform.catalogProjectIds.includes('cinema-film'));
    assert.ok(logged(closed, '"Cinema Film" left cinemas. It premieres on'), closed.logs.slice(-3).map(log => log.message).join(' | '));
    assert.equal(closed.activeReleases.filter(item => item.distributionPhase === 'STREAMING_BIDDING' && item.id === 'cinema-film').length, 0, 'no bids waiting');
    assert.equal((closed.pendingEvents || []).filter(event => event.data?.streamingDecision?.kind === 'ON_THE_SHELF').length, 0, 'it has its date: nothing to ask');
    pass('a film in cinemas, live by itself: it plays out, then goes on the weeks chosen after, with no bid room');

    /* #253: the shelf road: on the shelf when the run closes, not live, and the popup says what is left */
    const forShelf = sendTitleToYourService(inCinemas, 'cinema-film', 0);
    assert.equal(getStreamingTitlePlacement(forShelf.player, 'cinema-film').line, `On your ${service} shelf after cinemas close`);
    forShelf.player.world.cinemaMarket!.market.runs = quoteCinemaSupply(buildCinemaWeekInput(forShelf.player, cinemaWeek)).offers.map(offer => ({ ...offer, quietWeeks: 2, closed: false }));
    const shelvedAfter = (await processGameWeek(forShelf.player)).player;
    assert.ok(shelvedAfter.pastProjects.some(item => item.id === 'cinema-film'), 'archived');
    assert.equal(premiereOf(shelvedAfter, 'cinema-film'), null, 'no week: Content schedules it');
    assert.equal(getStreamingContentAvailability(shelvedAfter, 'cinema-film').status, 'READY', 'not live');
    assert.ok(getStreamingTitlePlacement(shelvedAfter, 'cinema-film').onShelf);
    assert.ok(logged(shelvedAfter, '"Cinema Film" left cinemas. It is on your'), shelvedAfter.logs.slice(-3).map(log => log.message).join(' | '));
    const shelfPopup = (shelvedAfter.pendingEvents || []).find(event => event.data?.streamingDecision?.kind === 'ON_THE_SHELF');
    assert.ok(shelfPopup, 'the popup is queued');
    const shelfView = getStreamingDecisionView(shelvedAfter, shelfPopup!.data!.streamingDecision!);
    assert.equal(shelfView?.title, 'Cinema Film is on your shelf');
    assert.equal(shelfView?.door.room, 'SLATE');
    const scheduledNow = scheduleStreamingSlateTitle(shelvedAfter, { projectId: 'cinema-film', absoluteWeek: weekOf(shelvedAfter) + 3, marketingPlan: 'STANDARD' });
    assert.ok(scheduledNow.changed, scheduledNow.reason);
    assert.equal(getStreamingDecisionView(scheduledNow.player, shelfPopup!.data!.streamingDecision!), null, 'scheduled already: the popup closes itself');
    pass('a film in cinemas, for the shelf: on the shelf when the run closes, not live, and a popup to schedule it');

    /* a title sent before the choice existed was told the week after */
    const oldFlag: Player = { ...inCinemas, activeReleases: inCinemas.activeReleases.map(release => (release.id === 'cinema-film' ? { ...release, projectDetails: { ...release.projectDetails, hiddenStats: { ...release.projectDetails.hiddenStats, ownPlatformAfterCinema: true } } } : release)) };
    assert.equal(getStreamingTitlePlacement(oldFlag, 'cinema-film').line, `On ${service} the week after cinemas close`);
    pass('a title sent before the choice keeps what it was told');

    /* ---- bids waiting: bringing it across ends them */
    const bidding = { ...film, id: 'bid-film', name: 'Bid Film', distributionPhase: 'STREAMING_BIDDING', status: 'FINISHED', bids: [{ platformId: 'NETFLIX', upfront: 1_000_000, royalty: 0, duration: 52 }] } as unknown as ActiveRelease;
    const waitingBids: Player = { ...base, activeReleases: [...base.activeReleases, bidding] };
    const fromBids = sendTitleToYourService(waitingBids, 'bid-film');
    assert.ok(fromBids.changed, fromBids.detail);
    const released = fromBids.player.activeReleases.find(item => item.id === 'bid-film')!;
    assert.equal(released.distributionPhase, 'STREAMING');
    assert.equal(released.bids, undefined);
    const afterBids = (await processGameWeek(fromBids.player)).player;
    assert.ok(afterBids.pastProjects.some(item => item.id === 'bid-film') && !afterBids.activeReleases.some(item => item.id === 'bid-film'), 'archived at the close');
    assert.equal(getStreamingContentAvailability(afterBids, 'bid-film').status, 'READY', 'on the shelf, not live');
    assert.ok(getStreamingTitlePlacement(afterBids, 'bid-film').onShelf);
    assert.ok(scheduleStreamingSlateTitle(afterBids, { projectId: 'bid-film', absoluteWeek: weekOf(afterBids) + 2, marketingPlan: 'STANDARD' }).changed, 'the Slate takes it from there');
    pass('bids waiting: sending it ends the bid room, and it is archived on the shelf');

    /* #252: sent and pulled in the same week: back on the rights floor, not stranded with no run to play */
    const changedMind = pullTitleFromYourService(fromBids.player, 'bid-film');
    assert.ok(changedMind.changed, changedMind.detail);
    const onTheFloor = changedMind.player.activeReleases.find(item => item.id === 'bid-film')!;
    assert.equal(onTheFloor.distributionPhase, 'STREAMING_BIDDING');
    assert.equal(onTheFloor.projectDetails.hiddenStats.ownPlatformRelease, undefined);
    const floorPlacement = getStreamingTitlePlacement(changedMind.player, 'bid-film');
    assert.ok(floorPlacement.kind === 'NOWHERE' && floorPlacement.maySellOutside && floorPlacement.mayPutOnYours, 'free both ways');
    const floorWeek = (await processGameWeek(changedMind.player)).player;
    assert.equal(floorWeek.activeReleases.find(item => item.id === 'bid-film')?.distributionPhase, 'STREAMING_BIDDING', 'a real week: it still waits for a buyer');
    pass('sent and pulled in one week: back on the rights floor');

    /* #252: one door, on the rights floor, and Content keeps its own */
    const source = (path: string) => readFileSync(path, 'utf8');
    const floor = source('views/lifestyle/business/release-strategy-transplant/StreamingWarRoomStep.tsx');
    assert.ok(floor.includes('SEND TO {yourService.name.toUpperCase()}'), 'the second door is on the rights floor');
    assert.ok(/<StreamingWarRoomStep\s+yourService=/.test(source('views/lifestyle/business/ReleaseWizard.tsx')), 'the wizard opens it');
    assert.ok(!source('components/StreamingTitlePlacementPanel.tsx').includes('Put on'), 'Filmography has no button of its own');
    assert.ok(!source('views/lifestyle/business/release-strategy-transplant/DistributionStep.tsx').includes('yourPlatform'), 'the first step has two roads');
    assert.ok(source('content-market-exact/ExactContentMarket.tsx').includes('BRING IT ACROSS'), 'Content keeps Bring it across');
    pass('one door: the rights floor, plus Bring it across in Content');

    /* ---- the wizard offers it only while the service is live */
    const notLive: Player = { ...withPast, ownedStreamingPlatform: { ...withPast.ownedStreamingPlatform, lifecycle: 'FOUNDING' } };
    assert.equal(getStreamingTitlePlacement(notLive, 'past-film').serviceName, null);
    assert.equal(getStreamingTitlePlacement(notLive, 'past-film').mayPutOnYours, false);
    pass('no live service: the choice does not show');
    console.log('your-platform audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
