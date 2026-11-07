import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { checkAwardEligibility, generateFullBallot, resolveCanonicalAwardSeason } from '../services/awardLogic';
import { getOutsideOriginalAwardRows } from '../services/outsideOriginals';
import { getOriginalTitleDetail } from '../services/originalsTitleDetail';
import { createCanonicalContentDeskState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

/* #293: an Original made outside competes at the award shows as the studio's title. The player gets no credit for it, and rivals cannot stock it. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-awards-audit', name: 'Zed Auditor', age: 30, currentWeek: 20 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const base = prepareStreamingFullPlatformQa(fresh());
const AWARD_YEAR = base.age;
const row = (quality: number, rating: number, extra: any = {}) => ({
    id: 'job_award', name: 'Harrow Lane', type: 'ACTING_GIG', roleType: 'MINOR', year: AWARD_YEAR, earnings: 0, rating, imdbRating: rating, reception: 'FINISHED', projectQuality: quality, boxOfficeResult: '$0', outcomeTier: 'NEUTRAL',
    subtype: 'STANDALONE', studioId: 'WARNER_BROS', outsideOriginal: true, genre: 'DRAMA', projectType: 'SERIES', episodes: 8, description: 'x', directorName: 'Ada Penn', directorId: 'npc_director', writerId: 'npc_writer', writerName: 'Wren Bell',
    castList: [{ id: 'a', name: 'Mara Quill', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', roleType: 'LEAD', actorId: 'a' }],
    reviews: [], gross: 0, budget: 50_000_000, releaseYear: AWARD_YEAR, releaseWeek: 10, releasedAtAbsoluteWeek: getAbsoluteWeek(AWARD_YEAR, 10), ...extra,
});
const withRow = (quality: number, rating: number, extra: any = {}): Player => ({
    ...base,
    pastProjects: [...base.pastProjects, row(quality, rating, extra) as any],
    ownedStreamingPlatform: {
        ...base.ownedStreamingPlatform,
        originalCommissions: [...base.ownedStreamingPlatform.originalCommissions, {
            id: 'commission_award', scriptId: 'script', canonicalProjectId: 'job_award', title: 'Harrow Lane', gapId: 'SERIES_RETENTION', projectType: 'SERIES', genre: 'DRAMA', episodes: 8,
            producerStudioId: 'WARNER_BROS', producerStudioName: 'Warner Bros.', commissionedByPlatformName: 'Test', productionBudgetCap: 60_000_000, productionFundingApplied: 60_000_000,
            status: 'RELEASED', commissionedAtAbsoluteWeek: 1, greenlitAtAbsoluteWeek: 1, lineageId: 'commission_award', seasonNumber: 1,
            contract: { platformRightsPercent: 100, producerBackendPercent: 0, exclusiveWindowWeeks: 104, sequelRightsIncluded: true },
            localization: null, lifecycleDecision: null, way: 'PITCH', deal: 'BUY', making: 50_000_000, fee: 10_000_000, feePercent: 20,
            releasePlan: { scope: 'GLOBAL', releasePattern: 'FULL_SEASON', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: getAbsoluteWeek(AWARD_YEAR, 10), authorizedAtAbsoluteWeek: 1 },
        } as any],
    },
});

/* the row the shows read */
const rows = getOutsideOriginalAwardRows(withRow(92, 8.9) as any);
assert.equal(rows.length, 1);
assert.equal(rows[0].studioId, 'WARNER_BROS');
assert.equal(rows[0].leadActorName, 'Mara Quill');
assert.equal(rows[0].directorName, 'Ada Penn');
assert.equal(rows[0].mediaType, 'SERIES');
assert.equal(rows[0].year, AWARD_YEAR);
assert.equal(getOutsideOriginalAwardRows(base as any).length, 0, 'no row without such a title');

/* the player is not nominated for it */
const player = withRow(92, 8.9);
const playerNominations = checkAwardEligibility(player, 34, AWARD_YEAR);
assert.ok(!playerNominations.some(item => item.project?.id === 'job_award'), 'not on the player\'s ballot at all');

/* a great one is on the ballot, by its studio's people */
const ballot = generateFullBallot(player, 'EMMY', [], AWARD_YEAR);
const named = Object.entries(ballot).flatMap(([category, nominees]) => nominees.filter(item => item.project.id === 'job_award').map(item => ({ category, name: item.nomineeName, isPlayer: item.isPlayer })));
assert.ok(named.length > 0, 'a 9.0 series is nominated');
assert.ok(named.every(item => !item.isPlayer));
assert.ok(!named.some(item => item.name === 'Zed Auditor'), 'never the player');

/* a poor one is not */
const poor = generateFullBallot(withRow(40, 4.5), 'EMMY', [], AWARD_YEAR);
assert.ok(!Object.values(poor).flat().some(item => item.project.id === 'job_award'));

/* a film at the Oscars, a series at the Emmys */
const film = withRow(95, 9.1, { projectType: 'MOVIE' });
assert.ok(Object.values(generateFullBallot(film, 'OSCAR', [], AWARD_YEAR + 1)).flat().some(item => item.project.id === 'job_award'), 'a film at next year\'s Oscars');
assert.ok(!Object.values(generateFullBallot(film, 'EMMY', [], AWARD_YEAR)).flat().some(item => item.project.id === 'job_award'), 'but not at the Emmys');

/* it can win, and the page says so */
let won = false;
for (let attempt = 0; attempt < 8 && !won; attempt += 1) {
    const season = resolveCanonicalAwardSeason(player, 'EMMY', AWARD_YEAR, undefined, ballot);
    const mine = season.winners.filter(winner => winner.projectId === 'job_award');
    if (mine.length) {
        won = true;
        assert.ok(mine.every(winner => !winner.isPlayer));
        const after: Player = { ...player, world: { ...player.world, awardHistory: [...(player.world.awardHistory || []), season] } };
        const page = getOriginalTitleDetail(after, 'commission_award')!;
        assert.ok(page.wins.length >= mine.length, 'on its page');
        assert.equal(page.wins[0].show, 'Emmys');
    }
}
assert.ok(won, 'a 9.0 series wins something');

/* a licensed Original reads as a window on the Rights tab */
const now = getAbsoluteWeek(base.age, base.currentWeek);
const licensed: Player = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, originalCommissions: player.ownedStreamingPlatform.originalCommissions.map(item => (item.id === 'commission_award' ? { ...item, deal: 'LICENCE', licenceEndsAtAbsoluteWeek: now + 40 } as any : item)) } };
const onDesk = createCanonicalContentDeskState(licensed).titles.find(item => item.id === 'job_award')!;
assert.equal(onDesk.rightsState, 'WINDOW');
assert.equal(onDesk.rights?.endsInWeeks, 40);
assert.equal(onDesk.rights?.licensor, 'Warner Bros.');
assert.equal(createCanonicalContentDeskState(player).titles.find(item => item.id === 'job_award')!.rightsState, 'KEPT', 'one you bought is kept');

console.log('original awards audit passed');
