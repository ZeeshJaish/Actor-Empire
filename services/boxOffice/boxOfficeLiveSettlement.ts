import { STUDIO_AI_LEDGER_LIMIT } from '../studioAi/studioAiState';
import { cinemaAudienceReport, cinemaDistributionReport } from './boxOfficeLiveReports';
import {consumeUnexposedCinemaWeek, simulateCinemaWeek} from './boxOfficeMarket';
import { quoteCinemaSupply } from './boxOfficeSupply';
import { assertIssuedCinemaResult, issueCinemaResult } from './boxOfficeIdentity';
import type { Player, StudioFinanceEntry } from '../../types';
import { appendIndustryEventFacts, createIndustryEventFact } from '../industryWorld/industryEventLedger';
import { clonePlayerForWeekProcessing } from '../gameLoopClone';
import { creditSignedActorBackend, settleTalentReceipt } from '../talentCareer';
import { applyStudioProjectOutcome } from '../studioEcosystem';
import { recordStudioAiReleaseLesson, studioAiBudgetTier } from '../studioAi/studioAiLearning';
import { calculateInvestorPayout } from '../projectInvestors';
import { calculateWeeklySoundtrackRevenue, getMusicArtistCatalog, mergeSoundtrackRevenueBreakdowns } from '../musicIndustry';
import { buildCinemaWeekInput, buildUnexposedOwnedCinemaWeekInput, findCinemaBusiness, serializeCinemaFacts } from './boxOfficeWeek';
import { makeCinemaSettledTitle } from './boxOfficeMigration';
import { compactCinemaMarketState } from './boxOfficeHistory';
import { dollarsToCinemaCents, classifyCinemaProfit } from './boxOfficeSettlement';
import type { CinemaWeekInput, CinemaWeekResult, CinemaCommitResult, CinemaCommittedTitle } from './boxOfficeTypes';
/** Weekly cinema receipts kept in the save (lag round 2026-11-09; was 52). */
export const CINEMA_RECEIPT_WEEKS_KEPT = 12;

/* B7 (2026-11-15): a film played in each country separately and counted as "in cinemas" until every country had
   stopped. A country stops after two weak weeks, and the tuning had no week limit, so one small country with a
   trickle of tickets kept a film in cinemas 65 to 100+ weeks (players saw $40M a week fall to $1K), and everything
   after it (streaming, bids, "live by itself next week") waited. The run now also ends for the whole film:
   - when a week's takings fall below 3% of its opening week, two weeks running;
   - at its window: 16 weeks, 26 if it still takes 15% of its opening by then, 30 if it still takes 30%, never more.
   Every country closes together in that week's settlement. A run already past its window in an old save ends at
   the next settlement, as an ordinary final week.
   16 Nov (Zeesh: "cinema me bhi hai ya streaming me bhi hai, dono saath me ... real world me kya scene hai"): a
   streaming window no longer ends the run (it did on 15 Nov). In the real world a film keeps playing after it reaches
   homes, on fewer screens and for less money: in the US the home release came 32–39 days after opening on average
   in 2025, and India's multiplexes hold Hindi and Hollywood films for 8 weeks. Where it opened late (an Asian market,
   say), it can still be fresh. The cinema engine already counts this country by country: where a window is near or
   open, people wait and watch at home (cinemaHomeChoice), so takings there fall, and the floor or the window above
   ends the run. */
export const CINEMA_RUN_FLOOR_SHARE = 0.03;
export const CINEMA_RUN_FLOOR_WEEKS = 2;
export const CINEMA_RUN_WINDOW_WEEKS = 16;
export const CINEMA_RUN_LEGS_WEEKS = 26;
export const CINEMA_RUN_MAX_WEEKS = 30;
export const CINEMA_RUN_LEGS_SHARE = 0.15;
export const CINEMA_RUN_LONG_LEGS_SHARE = 0.3;
export type CinemaRunEndReason = 'FLOOR' | 'WINDOW';
export const resolveCinemaRunEnd = (facts: {
    /** 1 in the release week */
    weeksOut: number;
    weekGrossCents: number;
    openingGrossCents?: number;
    lowWeeks: number;
}): CinemaRunEndReason | null => {
    if (facts.lowWeeks >= CINEMA_RUN_FLOOR_WEEKS) return 'FLOOR';
    if (facts.weeksOut >= CINEMA_RUN_MAX_WEEKS) return 'WINDOW';
    const share = facts.openingGrossCents ? facts.weekGrossCents / facts.openingGrossCents : 0;
    if (facts.weeksOut >= CINEMA_RUN_LEGS_WEEKS && share < CINEMA_RUN_LONG_LEGS_SHARE) return 'WINDOW';
    if (facts.weeksOut >= CINEMA_RUN_WINDOW_WEEKS && share < CINEMA_RUN_LEGS_SHARE) return 'WINDOW';
    return null;
};
const sum = (ns: number[]) => ns.reduce((a, b) => { const n = a + b; if (!Number.isSafeInteger(n))
    throw new RangeError('Cinema money overflow'); return n; }, 0);
const amount = (n: number) => { if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError('Invalid cinema receipt money'); return n; };
const receiptSignature = (r: CinemaWeekResult) => serializeCinemaFacts({ week: r.absoluteWeek, epoch: r.live?.clockEpoch, tuning: r.tuningVersion, fingerprint: r.inputFingerprint,
    titles: [...r.titles].sort((a, b) => a.titleId.localeCompare(b.titleId)).map(({ countries, ...t }) => t), costs: [...new Set(r.costEvents.map(c => c.titleId))].sort().map(id => ({ titleId: id, total: sum(r.costEvents.filter(c => c.titleId === id).map(c => c.amountCents)) })) });
/** One atomic candidate mutation. Caller persists it through existing verified save generations. */
const commitCinemaWeekWithInput = (player: Player, result: CinemaWeekResult, readInput: () => CinemaWeekInput, reuseDetachedWeekCandidate = false, unexposedFreshResult = false, consumePrivateMarket = false): CinemaCommitResult => {
    const previous = player.world.cinemaMarket;
    if (!previous || result.mode !== 'LIVE' || !result.live || result.tuningVersion !== previous.tuningVersion)
        throw new Error('Live cinema result requires migrated source');
    if (result.live.clockEpoch !== previous.clockEpoch)
        throw new Error('Cinema clock epoch conflict');
    const signature = receiptSignature(result);
    const old = previous.weeks.find(w => w.clockEpoch === previous.clockEpoch && w.absoluteWeek === result.absoluteWeek);
    if (old) {
        if (old.receiptSignature !== signature)
            throw new Error('Cinema committed receipt conflict');
        return { player, applied: false, receipt: old };
    }
    // Only the private consumer below has an allocator result that no caller has
    // observed. All public/detached proposals retain the complete mutation guard.
    if (!unexposedFreshResult) assertIssuedCinemaResult(result);
    if (result.absoluteWeek !== previous.lastProcessedAbsoluteWeek + 1 || result.absoluteWeek < previous.activationWeek)
        throw new Error('Cinema stale or out-of-order result');
    const input = readInput();
    if (input.live!.sourceSignature !== result.live.sourceSignature)
        throw new Error('Cinema source or ownership changed before settlement');
    const ids = new Set(input.titles.map(t => t.id));
    if (result.titles.length !== ids.size || new Set(result.titles.map(t => t.titleId)).size !== ids.size || result.titles.some(t => !ids.has(t.titleId)))
        throw new Error('Cinema result slate conflict');
    for (const r of result.titles) {
        for (const n of [r.grossCents, r.producerReceiptsCents, r.exhibitorReceiptsCents, r.distributionDeductionsCents, r.firstAdmissions, r.repeatAdmissions])
            amount(n);
        if (r.grossCents !== sum([r.producerReceiptsCents, r.exhibitorReceiptsCents, r.distributionDeductionsCents]))
            throw new Error('Cinema receipt conservation failed');
    }
    if (result.nextState.lastProcessedAbsoluteWeek !== result.absoluteWeek || result.nextState.schemaVersion !== 1 || result.nextState.tuningVersion !== result.tuningVersion)
        throw new Error('Cinema next state conflict');
    const costIds = new Set<string>();
    for (const c of result.costEvents) {
        amount(c.amountCents);
        if (costIds.has(c.id) || !ids.has(c.titleId))
            throw new Error('Cinema cost source conflict');
        costIds.add(c.id);
    }
    const settlementFields = { world: player.world, businesses: player.businesses, activeReleases: player.activeReleases, outsideProductions: player.outsideProductions };
    // processGameWeek already owns a detached complete candidate. Its caller only
    // publishes after verified persistence, and discards this candidate on failure.
    // Public/detached proposals retain the independent copy and source recheck.
    const copied = reuseDetachedWeekCandidate ? settlementFields : clonePlayerForWeekProcessing(settlementFields as Player);
    const next: Player = { ...player, ...copied, stats: { ...player.stats }, finance: { ...player.finance, history: [...player.finance.history] } };
    const state = next.world.cinemaMarket!;
    const committed: CinemaCommittedTitle[] = [];
    const physicalSupply = quoteCinemaSupply(input);
    const year = next.age, week = next.currentWeek;
    for (const row of [...result.titles].sort((a, b) => a.titleId.localeCompare(b.titleId))) {
        const title = input.titles.find(t => t.id === row.titleId)!;
        const release = next.activeReleases.find(r => r.id === row.titleId);
        const project = next.world.projects.find(p => p.id === row.titleId);
        const production = Object.values(next.world.industryProductions || {}).find(p => p.canonicalProjectId === row.titleId);
        const outside = next.outsideProductions?.find(p => p.projectId === row.titleId && p.releasePath !== 'STREAMING');
        const prior = state.titles[row.titleId] || makeCinemaSettledTitle(row.titleId, title.owner.id, 'UNSETTLED_WEEKLY', result.absoluteWeek);
        if (prior.closed || prior.lastSettledWeek >= result.absoluteWeek)
            throw new Error('Cinema title already settled');
        const cost = sum(result.costEvents.filter(c => c.titleId === row.titleId).map(c => c.amountCents));
        const runs = result.nextState.runs.filter(r => r.titleId === row.titleId);
        /* B7: the whole film's run ends at its floor or its window (see resolveCinemaRunEnd; streaming no longer ends it) */
        const releaseWeek = title.market!.releaseWeek;
        const weeksOut = result.absoluteWeek - releaseWeek + 1;
        const firstWeekBefore = release?.weeklyGross?.find(gross => gross > 0);
        const openingGrossCents = prior.openingWeekGrossCents
            ?? (prior.grossCents === 0 && row.grossCents > 0 ? row.grossCents : firstWeekBefore ? Math.round(firstWeekBefore * 100) : undefined);
        const lowWeeks = openingGrossCents !== undefined && weeksOut >= 2 && row.grossCents < openingGrossCents * CINEMA_RUN_FLOOR_SHARE ? (prior.lowWeeks || 0) + 1 : 0;
        const runEnd = resolveCinemaRunEnd({ weeksOut, weekGrossCents: row.grossCents, openingGrossCents, lowWeeks });
        const closed = (runs.length ? runs.every(r => r.closed) : result.absoluteWeek - releaseWeek >= 4) || runEnd !== null;
        const cinemaMarker = { schemaVersion: 1 as const, settlementBasis: prior.basis, activationWeek: prior.activationWeek, audienceBasis: prior.basis === 'LEGACY_ACTIVE' ? 'LEGACY_ESTIMATE' as const : 'TRACKED' as const };
        const music = release ? calculateWeeklySoundtrackRevenue(release.projectDetails, { week: release.weekNum, theatricalGross: row.grossCents / 100, catalog: getMusicArtistCatalog(next.world), seed: `cinema:${state.clockEpoch}:${result.absoluteWeek}:${row.titleId}` }) : undefined;
        const musicCents = dollarsToCinemaCents(music?.totalRevenue || 0);
        const receipts = row.producerReceiptsCents;
        const investorPlan = release?.investorPlan || release?.projectDetails.investorPlan;
        const investor = outside ? Math.min(receipts, Math.round(receipts * outside.stakePercent / 100)) : Math.min(receipts + musicCents, dollarsToCinemaCents(calculateInvestorPayout(investorPlan, receipts / 100) + calculateInvestorPayout(investorPlan, musicCents / 100)));
        const sourceId = `cinema:${state.clockEpoch}:${result.absoluteWeek}:${row.titleId}`;
        const participation = release?.projectDetails.talentParticipation || production?.studioAiExecution?.talent?.talentParticipation;
        const settled = settleTalentReceipt(next.world, row.titleId, participation, sourceId, (receipts + musicCents - investor) / 100, result.absoluteWeek);
        next.world = settled.world;
        if (release && settled.participation)
            release.projectDetails.talentParticipation = settled.participation;
        if (production?.studioAiExecution?.talent && settled.participation)
            production.studioAiExecution.talent.talentParticipation = settled.participation;
        const talent = dollarsToCinemaCents(settled.totalPaid);
        // Preserve the signed legacy actor formula; historical gross itself never triggers a new payout.
        const percent = release?.royaltyPercentage || 0;
        const grossAfter = prior.legacyGrossCents + prior.grossCents + row.grossCents;
        const baselineProfit = Math.max(0, prior.legacyGrossCents - (release?.budget || 0) * 200);
        const newProfit = Math.max(0, grossAfter - (release?.budget || 0) * 200);
        const actor = Math.max(0, Math.floor((newProfit - baselineProfit) * percent / 10000) * 100 - prior.actorPaidCents);
        if (actor > receipts + musicCents - investor - talent)
            throw new Error('Signed actor/backend shares exceed current collected receipts');
        const business = findCinemaBusiness(next, title.owner.id);
        const net = receipts + musicCents - investor - talent - actor - cost;
        const ledger: StudioFinanceEntry[] = [{ id: sourceId, week, year, amount: receipts / 100, type: 'THEATRICAL', label: `${title.id}: collected ticket receipts`, projectId: title.id }];
        if (musicCents)
            ledger.push({ id: `${sourceId}:music`, week, year, amount: musicCents / 100, type: 'SOUNDTRACK', label: `${title.id}: soundtrack receipts`, projectId: title.id });
        for (const [suffix, value, type] of [['investor', investor, 'INVESTOR_PAYOUT'], ['talent', talent, 'TALENT_BACKEND'], ['actor', actor, 'TALENT_BACKEND'], ['booking', cost, 'CINEMA_BOOKING']] as const)
            if (value)
                ledger.push({ id: `${sourceId}:${suffix}`, week, year, amount: -value / 100, type, label: `${title.id}: ${suffix}`, projectId: title.id });
        if (business) {
            business.balance = (Math.round(business.balance * 100) + net) / 100;
            business.stats.weeklyRevenue += (receipts + musicCents - investor) / 100;
            business.stats.lifetimeRevenue += (receipts + musicCents - investor) / 100;
            business.stats.weeklyProfit += net / 100;
            if (business.studioState)
                business.studioState.financeLedger = [...ledger, ...(business.studioState.financeLedger || [])];
        }
        else if (next.world.studios?.[title.owner.id]) {
            const studio = next.world.studios[title.owner.id];
            studio.cashReserve = (Math.round(studio.cashReserve * 1e8) + net) / 1e8;
            if (studio.ai)
                studio.ai.ledger = [...studio.ai.ledger, { id: sourceId, absoluteWeek: result.absoluteWeek, category: 'RIGHTS_INCOME' as const, amountMillions: net / 1e8, balanceAfterMillions: studio.cashReserve, description: `${title.id}: net collected cinema receipts after signed shares and booking costs` }].slice(-STUDIO_AI_LEDGER_LIMIT);
        }
        else {
            // Sparse legacy imports can lack producer identity, and so can a film whose producer no longer exists
            // (2026-11-15, B2): a legacy heir keeps the parent's cinema market but not the parent's outside stakes,
            // and a studio can be gone while its film still plays. Stopping the week here blocked those careers
            // for ever ("Week N was not applied"). Their net receipts go to the external producer ledger, as legacy
            // imports already did; never guess a studio, never pay the player.
            state.externalProducerBalancesCents = { ...state.externalProducerBalancesCents, [title.owner.id]: sum([state.externalProducerBalancesCents?.[title.owner.id] || 0, net]) };
        }
        const actorPayee = release?.actorRoyaltyPayeeId || 'PLAYER_SELF';
        if (actor && actorPayee !== 'PLAYER_SELF')
            next.world = creditSignedActorBackend(next.world, actorPayee, (release as any)?.legacyParentName || actorPayee, sourceId, actor / 100, result.absoluteWeek);
        if (actor && actorPayee === 'PLAYER_SELF' || outside && investor) {
            const cash = (actorPayee === 'PLAYER_SELF' ? actor : 0) + (outside ? investor : 0);
            next.money = (Math.round(next.money * 100) + cash) / 100;
            next.finance.history = [{ id: sourceId, category: 'ROYALTY' as const, amount: cash / 100, description: `Cinema settlement: ${title.id}`, week, year }, ...(next.finance.history || [])];
        }
        if (release) {
            release.cinema = cinemaMarker;
            release.totalGross = (prior.legacyGrossCents + prior.grossCents + row.grossCents) / 100;
            release.weeklyGross = [...release.weeklyGross, row.grossCents / 100];
            release.totalStudioReceipts = ((release.totalStudioReceipts || 0) * 100 + receipts) / 100;
            release.totalExhibitorReceipts = ((release.totalExhibitorReceipts || 0) * 100 + row.exhibitorReceiptsCents) / 100;
            release.weeklyStudioReceipts = [...(release.weeklyStudioReceipts || []), receipts / 100];
            release.weeklyExhibitorReceipts = [...(release.weeklyExhibitorReceipts || []), row.exhibitorReceiptsCents / 100];
            release.weeksInTheaters = (release.weeksInTheaters || release.weekNum - 1) + 1;
            release.weekNum++;
            release.bookingCostPaid = (release.bookingCostPaid || 0) + cost / 100;
            release.talentBackendPaid = (release.talentBackendPaid || 0) + (talent + actor) / 100;
            if (investorPlan)
                release.investorPayouts = { lifetimeInvestorPayout: (release.investorPayouts?.lifetimeInvestorPayout || 0) + investor / 100, weeklyInvestorPayouts: [...(release.investorPayouts?.weeklyInvestorPayouts || []), investor / 100] };
            if (music) {
                release.soundtrackRevenue = (release.soundtrackRevenue || 0) + musicCents / 100;
                release.weeklySoundtrackRevenue = [...(release.weeklySoundtrackRevenue || []), musicCents / 100];
                release.soundtrackRevenueBreakdown = mergeSoundtrackRevenueBreakdowns(release.soundtrackRevenueBreakdown, music);
                release.weeklySoundtrackBreakdowns = [...(release.weeklySoundtrackBreakdowns || []), music];
            }
        }
        if (project) {
            project.boxOffice = grossAfter / 100;
            project.cinema = cinemaMarker;
            project.reviews = closed ? `Cinema run complete: ${Math.round(row.satisfactionScore || project.quality)} audience satisfaction` : 'In theaters: paid audience run in progress';
        }
        if (outside) {
            outside.grossRevenue = grossAfter / 100;
            outside.producerReceipts = (prior.legacyProducerReceiptsCents || 0) / 100 + (prior.producerReceiptsCents + receipts) / 100;
            outside.playerPayout = (outside.playerPayout || 0) + investor / 100;
            outside.profit = outside.playerPayout - outside.investedAmount;
            outside.status = closed ? 'FINISHED' : 'RELEASED';
            if (closed) {
                outside.finishYear = year;
                outside.finishWeek = week;
                outside.finalOutcome = outside.profit > outside.investedAmount * .75 ? 'HIT' : outside.profit > 0 ? 'PROFIT' : 'LOSS';
                outside.resultSummary = 'Settled from actual paid cinema admissions and the signed producer-receipt stake.';
            }
        }
        state.titles[row.titleId] = { ...prior, audienceSignals:row.audienceSignals, ownerId: title.owner.id, grossCents: prior.grossCents + row.grossCents, producerReceiptsCents: prior.producerReceiptsCents + receipts,
            exhibitorReceiptsCents: prior.exhibitorReceiptsCents + row.exhibitorReceiptsCents, distributionDeductionsCents: prior.distributionDeductionsCents + row.distributionDeductionsCents,
            bookingCostCents: prior.bookingCostCents + cost, investorPaidCents: prior.investorPaidCents + investor, talentPaidCents: prior.talentPaidCents + talent, actorPaidCents: prior.actorPaidCents + actor,
            satisfactionScoreUnits: (prior.satisfactionScoreUnits || 0) + Math.round((row.satisfactionScore || 0) * 100) * (row.firstAdmissions + row.repeatAdmissions), satisfactionAdmissions: (prior.satisfactionAdmissions || 0) + row.firstAdmissions + row.repeatAdmissions,
            firstAdmissions: prior.firstAdmissions + row.firstAdmissions, repeatAdmissions: prior.repeatAdmissions + row.repeatAdmissions, lastSettledWeek: result.absoluteWeek, closed,
            ...(openingGrossCents !== undefined ? { openingWeekGrossCents: openingGrossCents } : {}), lowWeeks,
            ...(closed && runEnd ? { runEndReason: runEnd } : {}) };
        state.bookingContracts={...state.bookingContracts,[row.titleId]:title.market!.bookingContract || 'REVENUE_SHARE'};
        if (release) {
            release.weeklyDistributionBreakdowns = [...(release.weeklyDistributionBreakdowns || []), cinemaDistributionReport(input, result, physicalSupply, row.titleId, release.weekNum - 1)];
            release.audienceReception = cinemaAudienceReport(state.titles[row.titleId], release.audienceReception, week, year);
            release.projectDetails.audienceReception = release.audienceReception;
        }
        if (closed && production?.studioAiExecution?.result) {
            const financial = state.titles[row.titleId], oldResult = production.studioAiExecution.result;
            const netMillions = (financial.producerReceiptsCents - financial.bookingCostCents - financial.talentPaidCents - financial.investorPaidCents) / 1e8 - oldResult.productionSpendMillions - oldResult.marketingSpendMillions;
            const severity=classifyCinemaProfit(netMillions*1e8,(oldResult.productionSpendMillions+oldResult.marketingSpendMillions)*1e8+financial.bookingCostCents+financial.talentPaidCents);
            const outcome = netMillions >= oldResult.productionSpendMillions * .6 ? 'HIT' : severity==='LOSS'||severity==='SUBSTANTIAL_LOSS' ? 'FLOP' : 'SOLID';
            if (outcome === 'HIT' || outcome === 'FLOP')
                next.world.industryEvents = appendIndustryEventFacts(next.world.industryEvents, [createIndustryEventFact({ absoluteWeek: result.absoluteWeek, companyId: title.owner.id, companyName: next.world.studios?.[title.owner.id]?.name || title.owner.id, projectId: title.id, productionId: production.id, idempotencyKey: `production-result:${production.id}:${outcome}`, type: outcome === 'HIT' ? 'PROJECT_HIT' : 'PROJECT_FLOP', importance: 'HIGH', headline: `${project?.title || title.id}: ${outcome.toLowerCase()} cinema result`, detail: 'Commercial outcome from committed paid admissions, actual producer receipts and costs.', evidence: [{ kind: 'PROJECT', id: title.id, metric: 'theatricalGross', value: grossAfter / 100 }] })]);
            production.studioAiExecution.result = { ...oldResult, cinemaSettlement: 'WEEKLY_CLOSED', theatricalGrossMillions: grossAfter / 1e8, studioReceiptsMillions: financial.producerReceiptsCents / 1e8, netResultMillions: Math.round(netMillions * 1e8) / 1e8, outcome };
            if (project && next.world.studios?.[project.studioId]) {
                const cash = next.world.studios[project.studioId].cashReserve;
                next.world = applyStudioProjectOutcome(next.world, project, { productionSpendMillions: oldResult.productionSpendMillions, marketingSpendMillions: oldResult.marketingSpendMillions, studioReceiptsMillions: financial.producerReceiptsCents / 1e8, netResultMillions: netMillions, cashAlreadySettled: true, outcome }).world;
                next.world.studios![project.studioId].cashReserve = cash;
                /* 18 Nov 2026 (rival learning): the studio remembers the run: what it cost, what paid admissions brought back
                   to it (producer receipts) and what its cinema forecast had said (studioAiLearning.ts) */
                const receiptsMillions = financial.producerReceiptsCents / 1e8;
                next.world.studios![project.studioId] = recordStudioAiReleaseLesson(next.world.studios![project.studioId], {
                    productionId: production.id, absoluteWeek: result.absoluteWeek,
                    format: production.studioAiExecution.fingerprintSnapshot?.format || 'MOVIE',
                    budgetTier: studioAiBudgetTier(oldResult.productionSpendMillions),
                    costMillions: Math.max(0, receiptsMillions - netMillions), receiptsMillions,
                    marketForecastReceiptsMillions: production.studioAiExecution.underwriting?.marketForecastReceiptsMillions, outcome });
            }
        }
        const { countries: _countries, ...compactRow } = row;
        committed.push({ ...compactRow, soundtrackReceiptsCents: musicCents, ownerId: title.owner.id, ownerRoute: title.owner.route, costsCents: cost, investorPaidCents: investor, talentPaidCents: talent, actorPaidCents: actor, closed,
            screens: row.screens || 0 });
    }
    const receipt = { id: `cinema:${state.clockEpoch}:${result.absoluteWeek}`, absoluteWeek: result.absoluteWeek, clockEpoch: state.clockEpoch, inputFingerprint: result.inputFingerprint, receiptSignature: signature, titles: committed };
    /* 16 Nov (final break test): a title that stopped being settled (its film left the market in an old save) stayed
       "in cinemas" for ever: 66 weeks in one test career, shown as a run in progress and kept in the save. A title that
       has played and then missed more than 4 settlements is closed at its window. A running film is settled every
       week, so it is never touched. */
    for (const t of Object.values(state.titles)) {
        if (!t.closed && t.lastSettledWeek >= t.activationWeek && result.absoluteWeek - t.lastSettledWeek > 4)
            state.titles[t.titleId] = { ...t, closed: true, runEndReason: t.runEndReason || 'WINDOW' };
    }
    state.lastProcessedAbsoluteWeek = result.absoluteWeek;
    // Only the player-only owner can consume this already-detached market. The
    // diagnostic getter and public proposals can escape, so their independent
    // copy remains mandatory even when settlement reused the weekly candidate.
    const market = consumePrivateMarket ? result.nextState : structuredClone(result.nextState);
    state.market = compactCinemaMarketState(market, new Set(Object.values(state.titles).filter(t => !t.closed).map(t => t.titleId)));
    // Lag round (2026-11-09): 12 weekly receipts, not 52. The chart reads this week and last week,
    // and a repeated commit only meets the latest; every title's lifetime totals live in state.titles.
    state.weeks = [...state.weeks, receipt].slice(-CINEMA_RECEIPT_WEEKS_KEPT);
    next.world.cinemaMarket = state;
    return { player: next, applied: true, receipt };
};

/** Detached public proposals always recheck current authority, ownership and terms. */
export const commitCinemaWeek = (player: Player, result: CinemaWeekResult): CinemaCommitResult =>
    commitCinemaWeekWithInput(player, result, () => buildCinemaWeekInput(player, result.absoluteWeek));

/** A single synchronous owner returns only the settled player, never a proposal.
 * Keep all authority/clock/receipt/conservation/replay checks. A full detachable
 * source string cannot protect against an intervening caller here: none exists. */
export const processUnexposedOwnedCinemaWeek = (player: Player, absoluteWeek: number, diagnostics?: {onPhase:(name:string,ms:number)=>void}): Player => {
    let started=performance.now();
    const input=buildUnexposedOwnedCinemaWeekInput(player,absoluteWeek),inputMs=performance.now()-started;
    started=performance.now();
    return consumeUnexposedCinemaWeek(input,result=>{
        const simulationMs=performance.now()-started;
        started=performance.now();
        const committed=commitCinemaWeekWithInput(player,result,()=>input,true,true,true),commitMs=performance.now()-started;
        diagnostics?.onPhase('cinema_input_ms',inputMs);
        diagnostics?.onPhase('cinema_simulate_ms',simulationMs);
        diagnostics?.onPhase('cinema_commit_ms',commitMs);
        return committed.player;
    });
};

/** One synchronous owner builds, simulates and settles from the same fresh snapshot.
 * No caller callbacks run between snapshot creation and settlement. This reuses
 * only this invocation's input; detached/public results keep the full recheck. */
export const processAndCommitCinemaWeek = (player: Player, absoluteWeek: number, diagnostics?: {onPhase:(name:string,ms:number)=>void}, options?: { reuseDetachedWeekCandidate?: true }): {player:Player;result:CinemaWeekResult} => {
    let started=performance.now();
    const input=buildCinemaWeekInput(player,absoluteWeek),inputMs=performance.now()-started;
    started=performance.now();
    if(options?.reuseDetachedWeekCandidate) {
        return consumeUnexposedCinemaWeek(input,result=>{
            const simulationMs=performance.now()-started;
            started=performance.now();
            // No callbacks or exposed result references exist before settlement.
            // Source authority, money conservation, ledgers and replay checks all run.
            const committed=commitCinemaWeekWithInput(player,result,()=>input,true,true),commitMs=performance.now()-started;
            diagnostics?.onPhase('cinema_input_ms',inputMs);
            diagnostics?.onPhase('cinema_simulate_ms',simulationMs);
            diagnostics?.onPhase('cinema_commit_ms',commitMs);
            let exposed=false;
            return {player:committed.player,get result(){
                // Issue exactly once before exposure. Re-reading after a mutation
                // must never replace the original mirror or bless altered money.
                if(!exposed){issueCinemaResult(result);exposed=true;}
                return result;
            }};
        });
    }
    const result=simulateCinemaWeek(input),simulationMs=performance.now()-started;
    started=performance.now();
    const committed=commitCinemaWeekWithInput(player,result,()=>input,options?.reuseDetachedWeekCandidate),commitMs=performance.now()-started;
    diagnostics?.onPhase('cinema_input_ms',inputMs);
    diagnostics?.onPhase('cinema_simulate_ms',simulationMs);
    diagnostics?.onPhase('cinema_commit_ms',commitMs);
    return {player:committed.player,result};
};
