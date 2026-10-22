import { STUDIO_AI_LEDGER_LIMIT } from '../studioAi/studioAiState';
import { cinemaAudienceReport, cinemaDistributionReport } from './boxOfficeLiveReports';
import { quoteCinemaSupply } from './boxOfficeSupply';
import { assertIssuedCinemaResult } from './boxOfficeIdentity';
import type { Player, StudioFinanceEntry } from '../../types';
import { appendIndustryEventFacts, createIndustryEventFact } from '../industryWorld/industryEventLedger';
import { clonePlayerForWeekProcessing } from '../gameLoopClone';
import { creditSignedActorBackend, settleTalentReceipt } from '../talentCareer';
import { applyStudioProjectOutcome } from '../studioEcosystem';
import { calculateInvestorPayout } from '../projectInvestors';
import { calculateWeeklySoundtrackRevenue, getMusicArtistCatalog, mergeSoundtrackRevenueBreakdowns } from '../musicIndustry';
import { buildCinemaWeekInput, findCinemaBusiness, serializeCinemaFacts } from './boxOfficeWeek';
import { makeCinemaSettledTitle } from './boxOfficeMigration';
import { compactCinemaMarketState } from './boxOfficeHistory';
import { dollarsToCinemaCents } from './boxOfficeSettlement';
import type { CinemaWeekResult, CinemaCommitResult, CinemaCommittedTitle } from './boxOfficeTypes';
const sum = (ns: number[]) => ns.reduce((a, b) => { const n = a + b; if (!Number.isSafeInteger(n))
    throw new RangeError('Cinema money overflow'); return n; }, 0);
const amount = (n: number) => { if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError('Invalid cinema receipt money'); return n; };
const receiptSignature = (r: CinemaWeekResult) => serializeCinemaFacts({ week: r.absoluteWeek, epoch: r.live?.clockEpoch, tuning: r.tuningVersion, fingerprint: r.inputFingerprint,
    titles: [...r.titles].sort((a, b) => a.titleId.localeCompare(b.titleId)).map(({ countries, ...t }) => t), costs: [...new Set(r.costEvents.map(c => c.titleId))].sort().map(id => ({ titleId: id, total: sum(r.costEvents.filter(c => c.titleId === id).map(c => c.amountCents)) })) });
/** One atomic candidate mutation. Caller persists it through existing verified save generations. */
export const commitCinemaWeek = (player: Player, result: CinemaWeekResult): CinemaCommitResult => {
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
    assertIssuedCinemaResult(result);
    if (result.absoluteWeek !== previous.lastProcessedAbsoluteWeek + 1 || result.absoluteWeek < previous.activationWeek)
        throw new Error('Cinema stale or out-of-order result');
    const input = buildCinemaWeekInput(player, result.absoluteWeek);
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
    const copied = clonePlayerForWeekProcessing({ world: player.world, businesses: player.businesses, activeReleases: player.activeReleases, outsideProductions: player.outsideProductions } as Player);
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
        const closed = runs.length ? runs.every(r => r.closed) : result.absoluteWeek - title.market!.releaseWeek >= 4;
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
                business.studioState.financeLedger = [...ledger, ...(business.studioState.financeLedger || [])].slice(0, 200);
        }
        else if (next.world.studios?.[title.owner.id]) {
            const studio = next.world.studios[title.owner.id];
            studio.cashReserve = (Math.round(studio.cashReserve * 1e8) + net) / 1e8;
            if (studio.ai)
                studio.ai.ledger = [...studio.ai.ledger, { id: sourceId, absoluteWeek: result.absoluteWeek, category: 'RIGHTS_INCOME' as const, amountMillions: net / 1e8, balanceAfterMillions: studio.cashReserve, description: `${title.id}: net collected cinema receipts after signed shares and booking costs` }].slice(-STUDIO_AI_LEDGER_LIMIT);
        }
        else if (outside || (prior.basis==='LEGACY_ACTIVE' && prior.ownerId===`legacy-owner:${title.id}` && title.owner.id===prior.ownerId)) {
            // Sparse legacy imports can lack producer identity. Keep their new
            // net receipts in the existing external ledger; never guess a studio.
            state.externalProducerBalancesCents = { ...state.externalProducerBalancesCents, [title.owner.id]: sum([state.externalProducerBalancesCents?.[title.owner.id] || 0, net]) };
        }
        else
            throw new Error(`Missing canonical cinema producer ${title.owner.id}`);
        const actorPayee = release?.actorRoyaltyPayeeId || 'PLAYER_SELF';
        if (actor && actorPayee !== 'PLAYER_SELF')
            next.world = creditSignedActorBackend(next.world, actorPayee, (release as any)?.legacyParentName || actorPayee, sourceId, actor / 100, result.absoluteWeek);
        if (actor && actorPayee === 'PLAYER_SELF' || outside && investor) {
            const cash = (actorPayee === 'PLAYER_SELF' ? actor : 0) + (outside ? investor : 0);
            next.money = (Math.round(next.money * 100) + cash) / 100;
            next.finance.history = [{ id: sourceId, category: 'ROYALTY' as const, amount: cash / 100, description: `Cinema settlement: ${title.id}`, week, year }, ...(next.finance.history || [])].slice(0, 120);
        }
        if (release) {
            release.cinema = cinemaMarker;
            release.totalGross = (prior.legacyGrossCents + prior.grossCents + row.grossCents) / 100;
            release.weeklyGross = [...release.weeklyGross, row.grossCents / 100].slice(-104);
            release.totalStudioReceipts = ((release.totalStudioReceipts || 0) * 100 + receipts) / 100;
            release.totalExhibitorReceipts = ((release.totalExhibitorReceipts || 0) * 100 + row.exhibitorReceiptsCents) / 100;
            release.weeklyStudioReceipts = [...(release.weeklyStudioReceipts || []), receipts / 100].slice(-104);
            release.weeklyExhibitorReceipts = [...(release.weeklyExhibitorReceipts || []), row.exhibitorReceiptsCents / 100].slice(-104);
            release.weeksInTheaters = (release.weeksInTheaters || release.weekNum - 1) + 1;
            release.weekNum++;
            release.bookingCostPaid = (release.bookingCostPaid || 0) + cost / 100;
            release.talentBackendPaid = (release.talentBackendPaid || 0) + (talent + actor) / 100;
            if (investorPlan)
                release.investorPayouts = { lifetimeInvestorPayout: (release.investorPayouts?.lifetimeInvestorPayout || 0) + investor / 100, weeklyInvestorPayouts: [...(release.investorPayouts?.weeklyInvestorPayouts || []), investor / 100].slice(-104) };
            if (music) {
                release.soundtrackRevenue = (release.soundtrackRevenue || 0) + musicCents / 100;
                release.weeklySoundtrackRevenue = [...(release.weeklySoundtrackRevenue || []), musicCents / 100].slice(-104);
                release.soundtrackRevenueBreakdown = mergeSoundtrackRevenueBreakdowns(release.soundtrackRevenueBreakdown, music);
                release.weeklySoundtrackBreakdowns = [...(release.weeklySoundtrackBreakdowns || []), music].slice(-24);
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
            firstAdmissions: prior.firstAdmissions + row.firstAdmissions, repeatAdmissions: prior.repeatAdmissions + row.repeatAdmissions, lastSettledWeek: result.absoluteWeek, closed };
        if (release) {
            release.weeklyDistributionBreakdowns = [...(release.weeklyDistributionBreakdowns || []), cinemaDistributionReport(input, result, physicalSupply, row.titleId, release.weekNum - 1)].slice(-104);
            release.audienceReception = cinemaAudienceReport(state.titles[row.titleId], release.audienceReception, week, year);
            release.projectDetails.audienceReception = release.audienceReception;
        }
        if (closed && production?.studioAiExecution?.result) {
            const financial = state.titles[row.titleId], oldResult = production.studioAiExecution.result;
            const netMillions = (financial.producerReceiptsCents - financial.bookingCostCents - financial.talentPaidCents - financial.investorPaidCents) / 1e8 - oldResult.productionSpendMillions - oldResult.marketingSpendMillions;
            const outcome = netMillions >= oldResult.productionSpendMillions * .6 ? 'HIT' : netMillions < 0 ? 'FLOP' : 'SOLID';
            if (outcome === 'HIT' || outcome === 'FLOP')
                next.world.industryEvents = appendIndustryEventFacts(next.world.industryEvents, [createIndustryEventFact({ absoluteWeek: result.absoluteWeek, companyId: title.owner.id, companyName: next.world.studios?.[title.owner.id]?.name || title.owner.id, projectId: title.id, productionId: production.id, idempotencyKey: `production-result:${production.id}:${outcome}`, type: outcome === 'HIT' ? 'PROJECT_HIT' : 'PROJECT_FLOP', importance: 'HIGH', headline: `${project?.title || title.id}: ${outcome.toLowerCase()} cinema result`, detail: 'Commercial outcome from committed paid admissions, actual producer receipts and costs.', evidence: [{ kind: 'PROJECT', id: title.id, metric: 'theatricalGross', value: grossAfter / 100 }] })]);
            production.studioAiExecution.result = { ...oldResult, cinemaSettlement: 'WEEKLY_CLOSED', theatricalGrossMillions: grossAfter / 1e8, studioReceiptsMillions: financial.producerReceiptsCents / 1e8, netResultMillions: Math.round(netMillions * 1e8) / 1e8, outcome };
            if (project && next.world.studios?.[project.studioId]) {
                const cash = next.world.studios[project.studioId].cashReserve;
                next.world = applyStudioProjectOutcome(next.world, project, { productionSpendMillions: oldResult.productionSpendMillions, marketingSpendMillions: oldResult.marketingSpendMillions, studioReceiptsMillions: financial.producerReceiptsCents / 1e8, netResultMillions: netMillions, cashAlreadySettled: true, outcome }).world;
                next.world.studios![project.studioId].cashReserve = cash;
            }
        }
        const { countries: _countries, ...compactRow } = row;
        committed.push({ ...compactRow, soundtrackReceiptsCents: musicCents, ownerId: title.owner.id, ownerRoute: title.owner.route, costsCents: cost, investorPaidCents: investor, talentPaidCents: talent, actorPaidCents: actor, closed,
            screens: row.screens || 0 });
    }
    const receipt = { id: `cinema:${state.clockEpoch}:${result.absoluteWeek}`, absoluteWeek: result.absoluteWeek, clockEpoch: state.clockEpoch, inputFingerprint: result.inputFingerprint, receiptSignature: signature, titles: committed };
    state.lastProcessedAbsoluteWeek = result.absoluteWeek;
    state.market = compactCinemaMarketState(structuredClone(result.nextState), new Set(Object.values(state.titles).filter(t => !t.closed).map(t => t.titleId)));
    state.weeks = [...state.weeks, receipt].slice(-52);
    next.world.cinemaMarket = state;
    return { player: next, applied: true, receipt };
};
