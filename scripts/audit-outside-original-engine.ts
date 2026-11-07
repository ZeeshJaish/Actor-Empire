import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Commitment, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getOriginalsStudios, getOutsideQualitySwing, getStudioQualityEdge, getStudioShootWeeks, rollOutsideQuality } from '../services/originalsStudios';
import { buildOriginalBill } from '../services/originalsDeal';
import { finalizeOriginalCommission, getOriginalCommissionId, type OriginalWizardMode } from '../services/originalsCommission';
import { getCareerProjects, isOutsideOriginal } from '../services/outsideOriginals';
import { getEligibleOwnedStreamingTitles, getStreamingLicenseCandidatePool, resolveStreamingCatalogTitle } from '../services/streamingCatalog';
import { getEligiblePromotionProjects } from '../services/projectPromotionAttribution';
import { buildLegacyStudioInheritance } from '../services/legacyLogic';
import { getActorCareerArc } from '../services/actorCareerArc';
import { buildCareerUiModel } from '../services/careerUiAdapter';

/* #288: an Original made outside runs through the ordinary project engine, and stays out of the player's own career. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'outside-original-audit', name: 'Zed Auditor', age: 30, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

const LEAD = 'Mara Quill';
const jobFor = (studioId: string, id = 'job_outside'): Commitment => ({
    careerBalanceVersion: 1, careerRewardPacingVersion: 1,
    id,
    name: 'Harrow Lane',
    type: 'JOB',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectPhase: 'PRE_PRODUCTION',
    phaseWeeksLeft: 1,
    totalPhaseDuration: 1,
    productionCalendar: { preProductionWeeks: 1, productionWeeks: 1, postProductionWeeks: 1, totalWeeks: 3, focusWindowWeeks: 2, elapsedWeeks: 0 },
    promotionalBuzz: 30,
    playerProductionFocus: { isPlayerActor: false, isPlayerDirector: false, isPlayerProducer: true },
    projectDetails: {
        title: 'Harrow Lane',
        sourceScriptId: 'script_outside',
        type: 'SERIES',
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        budgetTier: 'MID',
        estimatedBudget: 40_000_000,
        episodes: 8,
        studioId,
        description: 'A town keeps a secret.',
        directorName: 'Ada Penn',
        directorId: 'npc_director',
        castList: [
            { id: 'npc_lead', name: LEAD, role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', roleType: 'LEAD', actorId: 'npc_lead' },
            { id: 'npc_second', name: 'Tom Rill', role: 'Second', isPlayer: false, image: '', type: 'ACTOR', roleType: 'SUPPORTING', actorId: 'npc_second' },
        ],
        hiddenStats: { qualityScore: 60, rawHype: 45, scriptQuality: 60, castingStrength: 60, directorQuality: 60, backendPct: 0, lockedFinances: true },
    },
} as unknown as Commitment);

const run = async () => {
    const base = prepareStreamingFullPlatformQa(fresh());
    const player: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, treasuryCash: 900_000_000 } };
    const studio = getOriginalsStudios(player)[0];
    assert.ok(studio, 'a studio can make it');
    const bill = buildOriginalBill({ total: 40_000_000, baseCost: 5_000_000, scriptCost: 2_000_000, cast: 10_000_000, backgroundEnsemble: 1_000_000, director: 4_000_000, crew: 8_000_000, locationCost: 6_000_000, equipmentCost: 4_000_000, effectsCost: 0, musicBudget: 0 } as any, 8, 20);
    const script = { id: 'script_outside', title: 'Harrow Lane', genres: ['DRAMA'], projectType: 'SERIES', episodes: 8 } as any;
    const mode: OriginalWizardMode = {
        way: 'OUTSIDE', locked: false, commissionId: getOriginalCommissionId(player, script.id), platformName: 'Test', treasury: 900_000_000,
        studioCard: studio, feePercent: 20, feeWhy: '', episodes: 8, onStepBack: () => {},
    } as any;
    const planned = jobFor(studio.id);
    const commissioned = finalizeOriginalCommission({ ...player, commitments: [...player.commitments, planned] }, {
        mode, commitmentId: planned.id, script, makerStudioId: studio.id, makerStudioName: studio.name, bill, deal: 'BUY',
    })!;
    assert.ok(commissioned, 'it goes through');
    const made = commissioned.player.commitments.find(item => item.id === planned.id)!;

    /* --- the studio's people count */
    assert.ok(isOutsideOriginal(made));
    /* #301: a careful studio stays close, a shaky one can land far from the estimate */
    assert.ok(getOutsideQualitySwing({ onSet: 90, budgetControl: 90 }) <= 2);
    assert.ok(getOutsideQualitySwing({ onSet: 40, budgetControl: 40 }) >= 7);
    assert.ok(getOutsideQualitySwing({ onSet: 10, budgetControl: 10 }) <= 8);
    const swings = Array.from({ length: 200 }, (_, index) => rollOutsideQuality({ id: 'x', onSet: 40, budgetControl: 40 }, `seed-${index}`));
    assert.ok(Math.min(...swings) < -4 && Math.max(...swings) > 4, 'it goes both ways');
    assert.ok(swings.every(value => Math.abs(value) <= 8));
    assert.equal(made.projectDetails!.hiddenStats.qualityScore, Math.max(1, Math.min(100, 60 + getStudioQualityEdge(studio) + rollOutsideQuality(studio, made.projectDetails!.hiddenStats.ownedStreamingCommissionId as string))), 'its people add to quality, or take from it');
    assert.equal(made.productionCalendar!.productionWeeks, getStudioShootWeeks(studio, 1), 'a shoot takes as long as its crew takes');
    assert.equal(made.productionCalendar!.totalWeeks, 1 + made.productionCalendar!.productionWeeks + 1);
    const again = getOriginalsStudios(commissioned.player).find(card => card.id === studio.id);
    assert.ok(!again || again.openSlots <= studio.openSlots, 'it takes a slot');
    assert.ok(!getEligiblePromotionProjects(commissioned.player).some(item => item.id === planned.id), 'the player does not promote it as their own');

    /* --- the phases, week by week: no crisis, no decision, no XP, no pay, no wallet */
    let current: Player = { ...commissioned.player, commitments: commissioned.player.commitments.map(item => item.id === planned.id ? { ...item, projectPhase: 'PRODUCTION', phaseWeeksLeft: 50, totalPhaseDuration: 50 } : item) };
    const seen = new Set<string>();
    for (let week = 0; week < 40; week += 1) {
        current = (await processGameWeek(current)).player;
        const job = current.commitments.find(item => item.id === planned.id);
        if (job?.projectPhase) seen.add(job.projectPhase);
        assert.ok(!(current.pendingEvents || []).some(event => event.data?.projectId === planned.id), 'nothing on its set reaches the player');
    }
    assert.ok(seen.has('PRODUCTION'), 'it keeps shooting');
    current = { ...current, commitments: current.commitments.map(item => item.id === planned.id ? { ...item, projectPhase: 'PRODUCTION', phaseWeeksLeft: 1 } : item) };
    current = (await processGameWeek(current)).player;
    assert.equal(current.commitments.find(item => item.id === planned.id)?.projectPhase, 'POST_PRODUCTION', 'wrapped');
    current = { ...current, commitments: current.commitments.map(item => item.id === planned.id ? { ...item, phaseWeeksLeft: 1 } : item) };
    current = (await processGameWeek(current)).player;
    assert.equal(current.commitments.find(item => item.id === planned.id)?.projectPhase, 'AWAITING_RELEASE', 'delivered');
    /* #314: the week it comes out of post-production its quality is locked, once, and never at the top */
    {
        const locked = current.commitments.find(item => item.id === planned.id)!.projectDetails!.hiddenStats;
        assert.equal(typeof locked.finalCutRoll, 'number', 'the final cut has happened');
        assert.ok(locked.qualityScore <= 97);
    }

    /* --- release: the path the Slate will take */
    current = { ...current, commitments: current.commitments.map(item => (item.id !== planned.id ? item : {
        ...item, phaseWeeksLeft: 1, totalPhaseDuration: 1,
        projectDetails: { ...item.projectDetails!, releaseStrategy: 'STREAMING_ONLY', releaseDate: (current.currentWeek % 52) + 1 },
    })) };
    const careerBefore = getCareerProjects(current).length;
    current = (await processGameWeek(current)).player;
    assert.ok(!current.commitments.some(item => item.id === planned.id), 'it has left production');
    const row: any = current.pastProjects.find(item => item.id === planned.id);
    assert.ok(row, 'and is on the record');
    assert.equal(row.outsideOriginal, true);
    assert.equal(row.studioId, studio.id);
    assert.ok(row.imdbRating > 0, 'a real rating');
    assert.ok(row.reviews?.length, 'real reviews');
    assert.ok(row.audienceReception, 'a real audience');
    assert.equal(row.episodeRatings?.flatMap((season: any) => season.episodes || []).length, 8, 'named by episode');
    assert.ok(!JSON.stringify(row.reviews).includes('Zed Auditor'), 'the reviews do not praise the player');
    assert.equal(row.playerCharacterProfile, undefined, 'no role in it');
    assert.ok(row.reviews.some((review: any) => JSON.stringify(review).includes(LEAD)) || row.projectQuality < 70, 'the good ones name its lead');
    assert.ok(!current.logs.some(log => log.message.includes('Career XP') && log.message.includes('Harrow Lane')), 'no career XP from it');

    /* --- not the player's career */
    assert.equal(getCareerProjects(current).length, careerBefore, 'not a credit');
    assert.ok(!getCareerProjects(current).some(item => item.id === planned.id));
    const withoutRow: Player = { ...current, pastProjects: current.pastProjects.filter(item => item.id !== planned.id) };
    assert.deepEqual(getActorCareerArc(current), getActorCareerArc(withoutRow), 'the career arc does not read it');
    assert.equal(buildCareerUiModel(current).credits, buildCareerUiModel(withoutRow).credits, 'the career page does not count it');

    /* --- the platform's title */
    const shelf = getEligibleOwnedStreamingTitles(current).find(item => item.id === planned.id);
    assert.ok(shelf, 'on the shelves');
    assert.equal(shelf!.source, 'OWNED_LIBRARY');
    assert.equal(shelf!.studioName, studio.name);
    assert.ok(Number(shelf!.rating) > 0);
    assert.ok(!getStreamingLicenseCandidatePool(current).some(item => item.id === planned.id), 'it is not offered to the player as a licence');
    assert.equal(resolveStreamingCatalogTitle(current, planned.id)?.source, 'OWNED_LIBRARY');

    /* --- a save */
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(current)));
    assert.equal(reloaded.pastProjects.find(item => item.id === planned.id)?.outsideOriginal, true, 'a save keeps it');
    assert.equal(getCareerProjects(reloaded).length, careerBefore);

    /* --- an heir keeps the platform's titles and what is in the works */
    const making = jobFor(studio.id, 'job_outside_two');
    const withWork: Player = { ...current, commitments: [...current.commitments, { ...making, projectDetails: { ...making.projectDetails!, hiddenStats: { ...making.projectDetails!.hiddenStats, outsideOriginal: true, ownedStreamingOriginal: true } } }] };
    const inherited = buildLegacyStudioInheritance(withWork, { isDeceased: true, heirAge: 18, heirWeek: 1 });
    assert.ok(inherited.commitments.some(item => item.id === 'job_outside_two'), 'what is being made comes along');
    assert.ok(inherited.legacyProjects.some((item: any) => item.id === planned.id), 'and the titles');
    assert.ok(!inherited.flags.legacyCareerArchive.pastProjects.some((item: any) => item.id === planned.id), 'but not in the parent\'s credits');
    const heir: Player = { ...current, pastProjects: [], flags: { ...current.flags, legacyStudioProjects: inherited.legacyProjects } };
    assert.ok(getEligibleOwnedStreamingTitles(heir).some(item => item.id === planned.id), 'still on the shelves for the heir');

    console.log('outside original engine audit passed');
};

run().catch(error => { console.error(error); process.exit(1); });
