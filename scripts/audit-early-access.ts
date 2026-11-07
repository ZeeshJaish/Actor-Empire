/**
 * #245 (plan §25.4 Q5): early access. Builds the developer test company, whose Family plan is two weeks early, and runs real weeks: the desk says
 * Early access while views show, the title's age starts at general release, its opening is both, and none of it reaches box office.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingCatalogueReadContext, getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getStreamingTitleOpening } from '../services/streamingEarlyAccess';
import { scheduleStreamingSlateTitle, unscheduleStreamingSlateTitle } from '../services/streamingSlateProgramming';
import { streamingTitleWeeksAvailable } from '../services/worldEconomy/worldStreamingContentValue';
import { placeTitleOnYourService } from '../services/streamingYourPlatform';
import { createBusiness } from '../services/businessLogic';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { recordCinemaStreamingAudience } from '../services/boxOffice/boxOfficeStreamingAudience';
import { createCanonicalContentDeskState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

const pass = (label: string) => console.log(`PASS ${label}`);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'early-access-audit', name: 'Early Access', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const week = async (player: Player): Promise<Player> => ({ ...(await processGameWeek(player)).player, pendingEvents: [] });

async function main() {
    const built = await buildStreamingFullPlatformQa(fresh(), { processWeek: processGameWeek, persistWeek: async next => next });
    /* a licence's rights have to allow it, so a title of the player's own */
    const studio = createBusiness('Early Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20);
    const project = structuredClone(makeCinemaFixture(9).project);
    const film = { id: 'early-film', name: 'Early Film', type: 'MOVIE', year: 2030, studioId: studio.id, projectDetails: { ...project, title: 'Early Film', studioId: studio.id as never, castList: [] } } as never;
    const base: Player = { ...built, money: 2e9, pendingEvents: [], businesses: [...built.businesses, studio], pastProjects: [...built.pastProjects, film] };
    const planEarly = Math.max(0, ...getStreamingCatalogueReadContext(base).offer.subscriptions.map(plan => (plan.benefits?.premiumAccess ? plan.benefits.earlyAccessWeeks : 0)));
    console.log(`early weeks offered by the test company: ${planEarly}`);
    const titleId = 'early-film';
    const now = weekOf(base);
    const general = now + 4;
    const scheduled = placeTitleOnYourService(base, titleId, general);
    assert.ok(scheduled.changed, scheduled.detail);
    const entry = () => scheduled.player.ownedStreamingPlatform.launchSlate!.entries.find(row => row.projectId === titleId)!;
    const desk = (player: Player) => createCanonicalContentDeskState(player).titles.find(row => row.id === titleId)!;
    assert.equal(getStreamingContentAvailability(scheduled.player, titleId).status, 'SCHEDULED');
    pass('four weeks out it is scheduled');

    let run = scheduled.player;
    let earlySeen = 0;
    let lockedChecked = false;
    while (weekOf(run) < general) {
        run = await week(run);
        const at = weekOf(run);
        const status = getStreamingContentAvailability(run, titleId).status;
        const views = run.world.worldStreamingViewing?.platforms.PLAYER?.titlePerformance.find(row => row.projectId === titleId)?.viewingAccounts || 0;
        if (at >= general) break;
        if (at >= general - planEarly) {
            assert.equal(status, 'EARLY_ACCESS', `week ${at - general}: early access`);
            assert.equal(desk(run).status, 'EARLY ACCESS', 'and the desk says so');
            assert.equal(desk(run).views, views, 'with the views it has');
            assert.equal(streamingTitleWeeksAvailable(run, entry(), at), 1, 'its age has not started');
            earlySeen += views;
            if (!lockedChecked) {
                const moved = scheduleStreamingSlateTitle(run, { projectId: titleId, absoluteWeek: general + 6, marketingPlan: 'STANDARD' });
                assert.equal(moved.reason, 'EARLY_ACCESS_RUNNING', 'the date is locked once they are watching');
                assert.equal(moved.player, run);
                assert.equal(unscheduleStreamingSlateTitle(run, titleId).reason, 'EARLY_ACCESS_RUNNING');
                lockedChecked = true;
            }
        } else {
            assert.equal(status, 'SCHEDULED', `week ${at - general}: not yet`);
            assert.equal(views, 0, 'nobody is watching');
        }
    }
    assert.ok(earlySeen > 0, `premium viewers watched early: ${earlySeen}`);
    assert.ok(lockedChecked);
    pass(`early access: the desk says Early access, ${earlySeen.toLocaleString()} early views, and the date is locked`);

    assert.equal(weekOf(run), general);
    assert.equal(getStreamingContentAvailability(run, titleId).status, 'LIVE');
    assert.equal(streamingTitleWeeksAvailable(run, entry(), general), 1, 'general release is its first week');
    assert.equal(streamingTitleWeeksAvailable(run, entry(), general + 1), 2);
    pass('freshness starts at general release, not before');

    const opening = getStreamingTitleOpening(run, titleId)!;
    assert.ok(opening, 'an opening');
    assert.ok(opening.first > 0);
    assert.equal(opening.early, earlySeen, 'the early weeks');
    assert.equal(opening.total, opening.early + opening.first, 'the opening is both');
    pass(`the opening is both: ${opening.early.toLocaleString()} early + ${opening.first.toLocaleString()} first week`);

    /* it stays views */
    const box = readFileSync('views/mobile/BoxOfficeApp.tsx', 'utf8');
    assert.ok(/const openingWeekend = getOpeningWeekend\(rel\);/.test(box), 'an opening weekend is tickets');
    assert.ok(/rel\.totalGross > 0 && renderMetric\(tr\('box\.worldwideGross'\)/.test(box), 'and a streaming card shows the tickets too');
    assert.equal(run.world.cinemaMarket?.titles[titleId], undefined, 'it never entered the cinema market');
    pass('box office stays tickets, and the card shows both');

    /* a title that also played in cinemas: early viewers count as having seen it */
    const fakeViewing = {
        ...run.world.worldStreamingViewing,
        lastProcessedAbsoluteWeek: general - 1,
        cinemaAudienceEvidence: [],
        countries: { US: { countryId: 'US', titlePerformance: [{ projectId: 'seen-film', viewingAccounts: 900 }] } },
    } as never;
    const withCinema: Player = {
        ...run,
        world: {
            ...run.world,
            worldStreamingViewing: fakeViewing,
            cinemaMarket: { ...run.world.cinemaMarket!, titles: { ...run.world.cinemaMarket!.titles, 'seen-film': { titleId: 'seen-film' } as never }, streamingSeen: {} },
        },
    };
    assert.equal(recordCinemaStreamingAudience(withCinema).world.cinemaMarket!.streamingSeen!['seen-film'].countries.US, 900, 'early viewers leave the unseen pool');
    pass('early viewers leave the cinema\'s unseen pool, as any viewers do');
    console.log('early-access audit passed');
}

main().catch(error => { console.error(error); process.exit(1); });
