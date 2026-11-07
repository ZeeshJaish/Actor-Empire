/** #168 (plan §21.17): the Content seat's jobs on the full test company.
 *  - renewals the Rights calendar left for you: renew from 62 when it pays back (Nia, creative first, from 58), let go
 *    under 35; a strong title that does not pay back, or one in between, is a card with her lean; never a title you
 *    took into your own hands; over the limit, a card; done through the renewal's own service, with "Renewed by Nia"
 *    on the Content room's card;
 *  - market buys: the weakest shelf by genre (what the market watches against what you carry), one title through the
 *    Content Market's own Buy inside the limit; never the same title twice; a pause after a no; a collection through
 *    its own signing (10⚡);
 *  - the Original pitch: Ask me only, once a quarter; taking it fills the commissioning desk;
 *  - what you said no to is not asked again for eight weeks. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type StreamingRightsRenewalCase } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
    approveStreamingTeamCard,
    declineStreamingTeamCard,
    runStreamingTeamWeek,
    setStreamingTeamJobMode,
    setStreamingTeamLimits,
} from '../services/team/streamingTeam';
import { executeCatalogueSign, getStreamingShelfGaps, runMarketBuys, runOriginalPitch, runRenewals } from '../services/team/teamContent';
import { normalizeStreamingRightsCalendarState, processStreamingRightsCalendarWeek } from '../services/streamingRightsCalendar';
import { getStreamingCataloguePackageOpportunities } from '../services/streamingRightsMarketplace';
import { createCanonicalContentDeskState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Content', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
/* #181: whoever carries a job out lands it under or over budget, booked once as a team result (refund +, overrun −) */
const teamResultSince = (before: Player, after: Player) => {
    const seen = new Set(platformOf(before).eventLedger.map(entry => entry.id));
    return platformOf(after).eventLedger
        .filter(entry => entry.type === 'TEAM_RESULT' && !seen.has(entry.id) && !entry.idempotencyKey.startsWith('team-result:expenses:'))
        .reduce((sum, entry) => sum + Number(entry.metadata?.refund || 0) - Number(entry.metadata?.overrun || 0), 0);
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, amount: number): Player => ({
    ...player, energy: { current: amount, max: amount }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 },
});
const rich = (player: Player): Player => ({ ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: 50_000_000_000 } });
const contextOf = (player: Player): StreamingTeamJobContext => {
    const platform = platformOf(player);
    const executive = streamingTeamSeatHolders(platform.leadership.appointments).holders.get('CONTENT')!;
    const seat = platform.leadership.team!.seats.find(item => item.seatId === 'CONTENT')!;
    return { player, platform, absoluteWeek: weekOf(player), seat, executive, moneyLeft: seat.weeklyMoney, energyLeft: seat.weeklyEnergy };
};
/* the build's own weekly close already ran the team this week; run it again as a fresh week's run */
const rerun = (player: Player): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return runStreamingTeamWeek({ ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: {
        ...team, lastRunAbsoluteWeek: null, seats: team.seats.map(seat => ({ ...seat, usageWeek: 0, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 })),
    } } } });
};
const only = (player: Player, jobs: Partial<Record<'RENEWALS' | 'MARKET_BUYS' | 'ORIGINAL_PITCH', 'DO' | 'ASK' | 'OFF'>>): Player => {
    let next = player;
    (['RENEWALS', 'MARKET_BUYS', 'ORIGINAL_PITCH'] as const).forEach(jobId => { next = setStreamingTeamJobMode(next, 'CONTENT', jobId, jobs[jobId] || 'OFF').player; });
    return next;
};
const caseOf = (player: Player, caseId: string) => normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar).renewalCases[caseId];
/* the case as given, and no card the build's own weekly run already left for it */
const withCase = (player: Player, item: StreamingRightsRenewalCase): Player => {
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return {
        ...player,
        ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: { ...team, tray: team.tray.filter(card => card.dedupeKey !== `renewal:${item.id}`) } } },
        world: { ...player.world, streamingRightsCalendar: { ...calendar, renewalCases: { ...calendar.renewalCases, [item.id]: item } } },
    };
};
/* the build's own weekly runs (every job at Ask me) left Content cards; start each part from an empty tray */
const clearContent = (player: Player): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return { ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: { ...team, tray: team.tray.filter(card => card.seatId !== 'CONTENT') } } } };
};
const pass = (label: string) => console.log(`✓ ${label}`);

/** a licence of the service the Rights calendar left for you: the build's own, or one brought near its end */
const decisionCase = (player: Player): { player: Player; item: StreamingRightsRenewalCase } => {
    const found = Object.values(normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar).renewalCases)
        .find(item => item.incumbentBuyer.type === 'PLAYER_PLATFORM' && item.status === 'ACTION_REQUIRED' && item.outcome === 'PENDING'
            && item.offerDisposition === 'OFFERED' && item.proposedEconomics && item.performance);
    if (found) return { player, item: found };
    const week = weekOf(player);
    const contract = Object.values(player.world.streamingRightsContracts || {})
        .find(item => item.buyer.type === 'PLAYER_PLATFORM' && item.status === 'ACTIVE' && !item.permanentPurchase && item.windowType !== 'PERMANENT')!;
    const near = { ...contract, expiresAtAbsoluteWeek: week + 5 };
    const platform = platformOf(player);
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const prepared: Player = {
        ...player,
        streamingRightsManagement: { ...player.streamingRightsManagement, controlMode: 'FULL' },
        ownedStreamingPlatform: { ...platform, catalogLicenses: platform.catalogLicenses.map(item => (item.id === contract.id ? { ...item, expiresAtAbsoluteWeek: week + 5 } : item)) },
        world: { ...player.world, streamingRightsContracts: { ...player.world.streamingRightsContracts, [contract.id]: near }, streamingRightsCalendar: { ...calendar, lastProcessedAbsoluteWeek: week - 1 } },
    };
    const processed = processStreamingRightsCalendarWeek(prepared, week).player;
    const item = Object.values(normalizeStreamingRightsCalendarState(processed.world.streamingRightsCalendar).renewalCases)
        .find(candidate => candidate.sourceContractId === contract.id && candidate.status === 'ACTION_REQUIRED')!;
    return { player: processed, item };
};

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-content'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = rich(withEnergy(player, 100));
    const nia = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('CONTENT')!;
    assert.equal(nia.preferredStrategy, 'CREATIVE_FIRST');
    pass(`the Content seat: ${nia.nameAtAppointment}, creative first, skill ${nia.skill}`);

    /* ── renewals ── */
    const decision = decisionCase(player);
    player = decision.player;
    const offered = decision.item;
    /* the licensor's own offer (dear for what the title earns): strong, but it does not pay back */
    const dear = runRenewals(contextOf(withCase(player, { ...offered, performance: { ...offered.performance!, performanceScore: 75 } })))
        .find(item => item.dedupeKey === `renewal:${offered.id}`)!;
    assert.ok(dear.askOnly && /your call/.test(dear.reason));
    pass(`score 75 at the licensor's $${(offered.proposedEconomics!.minimumGuarantee / 1e6).toFixed(0)}M: a card, "${dear.title}" · ${dear.reason}`);
    /* a fair offer: $20M for the same window */
    const base: StreamingRightsRenewalCase = { ...offered, proposedEconomics: { ...offered.proposedEconomics!, minimumGuarantee: 20_000_000 } };
    const price = 20_000_000;
    const scored = (score: number, extra: Partial<StreamingRightsRenewalCase> = {}) => withCase(player, { ...base, ...extra, performance: { ...base.performance!, performanceScore: score } });

    let proposals = runRenewals(contextOf(scored(75)));
    let renew = proposals.find(item => item.dedupeKey === `renewal:${base.id}`)!;
    assert.equal(renew.title, `Renew ${base.title}`);
    assert.ok(!renew.askOnly && renew.cost === price && renew.action.kind === 'RENEWAL' && renew.action.decision === 'ACCEPT_RENEWAL');
    pass(`score 75: "${renew.title}" · ${renew.detail} · ${renew.reason}`);

    /* Do it: renewed through the renewal's own service, paid, "Renewed by Nia" */
    let doing = only(scored(75), { RENEWALS: 'DO' });
    const cash = platformOf(doing).treasuryCash;
    const beforeRenewal = doing;
    doing = rerun(doing);
    const renewalResult = teamResultSince(beforeRenewal, doing);
    const renewed = caseOf(doing, base.id);
    assert.equal(renewed.outcome, 'ACCEPTED');
    assert.ok(renewed.replacementContractId, 'a new window contract');
    assert.equal(renewed.decidedBy?.name, nia.nameAtAppointment);
    assert.equal(cash - platformOf(doing).treasuryCash, price - renewalResult);
    const done = platformOf(doing).leadership.team!.report.find(item => item.kind === 'DONE' && item.jobId === 'RENEWALS')!;
    assert.ok(done && done.cost === price - renewalResult);
    const desk = createCanonicalContentDeskState(doing).titles.find(title => title.id === base.sourceProjectId)!;
    assert.equal(desk.renewal?.stage, 'RENEWED');
    assert.equal(desk.renewal?.by, nia.nameAtAppointment);
    assert.equal(desk.renewal?.byWeeksAgo, 0);
    assert.equal(runRenewals(contextOf(doing)).filter(item => item.dedupeKey === `renewal:${base.id}`).length, 0, 'never twice');
    pass(`Do it: renewed, ${(price / 1e6).toFixed(1)}M paid, "Renewed by ${nia.nameAtAppointment.split(' ')[0]}" on the Content room's card, DONE in the report`);

    /* weak: let it go, nothing to pay */
    proposals = runRenewals(contextOf(scored(20)));
    const letGo = proposals.find(item => item.dedupeKey === `renewal:${base.id}`)!;
    assert.ok(letGo.title === `Let ${base.title} go` && !letGo.askOnly && letGo.cost === 0);
    const lettingGo = rerun(only(scored(20), { RENEWALS: 'DO' }));
    assert.equal(caseOf(lettingGo, base.id).outcome, 'LET_EXPIRE');
    assert.equal(caseOf(lettingGo, base.id).decidedBy?.name, nia.nameAtAppointment);
    assert.equal(createCanonicalContentDeskState(lettingGo).titles.find(title => title.id === base.sourceProjectId)?.renewal?.stage, 'LETTING_GO');
    pass(`score 20: "${letGo.title}" · ${letGo.reason}`);

    /* in between: a card with her lean, even at Do it */
    proposals = runRenewals(contextOf(scored(47)));
    const middle = proposals.find(item => item.dedupeKey === `renewal:${base.id}`)!;
    assert.ok(middle.askOnly && /your call/.test(middle.reason));
    const middleRun = rerun(only(scored(47), { RENEWALS: 'DO' }));
    assert.equal(caseOf(middleRun, base.id).outcome, 'PENDING');
    const middleCard = platformOf(middleRun).leadership.team!.tray.find(card => card.dedupeKey === `renewal:${base.id}` && card.status === 'WAITING')!;
    assert.ok(middleCard, 'a card in the in-tray');
    pass(`score 47: a card even at Do it, "${middle.title}" · ${middle.reason}`);

    /* you said no: not asked again for eight weeks */
    const declined = declineStreamingTeamCard(middleRun, middleCard.id).player;
    const after = rerun(declined);
    assert.equal(platformOf(after).leadership.team!.tray.filter(card => card.dedupeKey === `renewal:${base.id}`).length, 1, 'not asked again');
    pass('a no is not asked again for eight weeks');

    /* a title you took into your own hands is never touched */
    assert.equal(runRenewals(contextOf(scored(75, { protectionReasons: [...base.protectionReasons, 'MANUAL_CONTROL'] }))).filter(item => item.dedupeKey === `renewal:${base.id}`).length, 0);
    pass('a title under your own control is never touched');

    /* over the limit: a card with the reason */
    const tight = setStreamingTeamLimits(only(scored(75), { RENEWALS: 'DO' }), 'CONTENT', { weeklyMoney: 10_000_000, actionMoney: 10_000_000 }).player;
    const overRun = rerun(tight);
    const over = platformOf(overRun).leadership.team!.tray.find(card => card.dedupeKey === `renewal:${base.id}` && card.status === 'WAITING')!;
    assert.ok(over && over.reason.endsWith('It is over the limits you set.'));
    assert.equal(caseOf(overRun, base.id).outcome, 'PENDING');
    pass(`over the most-for-one-action limit ($10M for a $20M renewal): a card ("${over.reason}")`);

    /* ── market buys ── */
    player = clearContent(player);
    const shelves = getStreamingShelfGaps(player, platformOf(player));
    const weak = shelves[0];
    assert.ok(weak && weak.gap >= 0.04, 'a weak shelf');
    pass(`the weakest shelf: ${weak.genre} is ${Math.round(weak.watchShare * 100)}% of what the market watches, ${Math.round(weak.shelfShare * 100)}% of your shelves (${weak.titles} titles)`);
    const market = only(player, { MARKET_BUYS: 'ASK' });
    const buy = runMarketBuys(contextOf(market))[0];
    assert.ok(buy && buy.action.kind === 'TITLE_LICENSE');
    const seatMoney = contextOf(market).seat.actionMoney;
    assert.ok(buy.cost <= seatMoney, 'inside the limit');
    pass(`market buy: "${buy.title}" · ${buy.detail} · $${(buy.cost / 1e6).toFixed(1)}M · ${buy.reason}`);

    const listingId = (buy.action as { listingId: string }).listingId;
    let bought = only(player, { MARKET_BUYS: 'DO' });
    const cash2 = platformOf(bought).treasuryCash;
    const titlesBefore = platformOf(bought).catalogProjectIds.length;
    const beforeBuy = bought;
    bought = rerun(bought);
    const report = platformOf(bought).leadership.team!.report.find(item => item.kind === 'DONE' && item.jobId === 'MARKET_BUYS')!;
    assert.ok(report, 'DONE in the report');
    assert.equal(cash2 - platformOf(bought).treasuryCash, buy.cost - teamResultSince(beforeBuy, bought));
    assert.equal(platformOf(bought).catalogProjectIds.length, titlesBefore + 1);
    const next = runMarketBuys(contextOf(bought))[0];
    assert.ok(!next || (next.action as { listingId?: string }).listingId !== listingId, 'never the same title twice');
    pass(`Do it: licensed through the Content Market's own Buy, $${(buy.cost / 1e6).toFixed(1)}M paid, one more title on the shelves; next pick ${next ? `"${next.title}"` : 'none'}`);

    /* a no on a market card: a pause */
    const asked = rerun(market);
    const marketCard = platformOf(asked).leadership.team!.tray.find(card => card.jobId === 'MARKET_BUYS' && card.status === 'WAITING')!;
    assert.ok(marketCard);
    const paused = declineStreamingTeamCard(asked, marketCard.id).player;
    assert.equal(runMarketBuys(contextOf(paused)).length, 0, 'a pause after a no');
    pass('Ask me: a card; after a no, a four-week pause');

    /* a collection through its own signing: 10⚡, as yours */
    const collection = getStreamingCataloguePackageOpportunities(player).sort((left, right) => left.totalGuarantee - right.totalGuarantee)[0];
    if (collection) {
        const energy = player.energy.current;
        const signed = executeCatalogueSign(player, { kind: 'CATALOGUE_SIGN', packageId: collection.id }, { absoluteWeek: weekOf(player), executiveName: nia.nameAtAppointment });
        assert.ok(signed.changed);
        assert.equal(energy - signed.player.energy.current, 10);
        pass(`a collection signs through its own deal: ${collection.package.name}, ${collection.package.components.length} titles, ⚡10`);
    }

    /* ── the Original pitch ── */
    const pitch = runOriginalPitch(contextOf(player))[0];
    assert.ok(pitch && pitch.askOnly && pitch.action.kind === 'ORIGINAL_PITCH' && /^“.+”$/.test(pitch.title));
    pass(`the pitch: ${pitch.title} · ${pitch.detail} · ${pitch.reason}`);
    const pitched = rerun(only(player, { ORIGINAL_PITCH: 'ASK' }));
    const pitchCard = platformOf(pitched).leadership.team!.tray.find(card => card.jobId === 'ORIGINAL_PITCH' && card.status === 'WAITING')!;
    assert.ok(pitchCard, 'a card in the in-tray');
    const taken = approveStreamingTeamCard(pitched, pitchCard.id);
    assert.ok(taken.changed);
    assert.deepEqual(taken.openRoom, { room: 'PITCH' });
    const draft = platformOf(taken.player).originalCommissionDraft!;
    const sent = (pitch.action as unknown as { draft: { title: string; genre: string } }).draft;
    assert.ok(draft.title === sent.title && draft.genre === sent.genre && draft.currentStep === 1);
    assert.equal(runOriginalPitch(contextOf(taken.player)).length, 0, 'once a quarter');
    pass(`taken: the commissioning desk opens on the brief, "${draft.title}" (${draft.genre}, ${draft.projectType}); no second pitch this quarter`);

    console.log(`Team Content audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
