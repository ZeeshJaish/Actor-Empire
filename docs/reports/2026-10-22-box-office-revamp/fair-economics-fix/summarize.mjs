import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(process.env.CAREER_MANIFEST || join(here, 'evidence/career-windows.json'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const careers = manifest.windows.map(window => ({
    ...JSON.parse(fs.readFileSync(resolve(dirname(manifestPath), window.report), 'utf8')),
    observationStatus: window.observationStatus,
}));
const seeds = careers.map(c => c.seed);
assert.equal(new Set(seeds).size, seeds.length);
for (const c of careers) {
    assert.ok(c.executedWeeks > 0 && c.executedWeeks <= c.horizon);
    assert.equal(c.observationStatus, c.status === 'HORIZON_COMPLETE' ? 'HORIZON_COMPLETE' : 'INTERRUPTED_OBSERVATION_WINDOW');
    assert.equal(c.failedPromotionChecked, true);
    assert.equal(c.replays, c.executedWeeks);
    assert.equal(c.saves, c.reloads + 1 + (c.resumeBootstrapWrites||0));
    assert.equal(c.failure, undefined);
}
const observations = careers.flatMap(c => c.films.map(f => ({ ...f, seed: c.seed })));
const quantile = (values, q) => {
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * q;
    return sorted[Math.floor(position)] + (sorted[Math.ceil(position)] - sorted[Math.floor(position)]) * (position % 1);
};
const summarize = films => {
    const closed = films.filter(f => f.closed);
    const known = closed.filter(f => f.productionCampaignBookingKnown);
    const result = f => f.theatricalProjectProfitBeforeFinancingCents;
    const recouped = known.filter(f => result(f) >= 0).length;
    const hits = known.filter(f => result(f) >= f.budgetCents * .6).length;
    return { observations: films.length, uniqueCanonicalTitleIds: new Set(films.map(f => f.id)).size,
        closed: closed.length, open: films.length - closed.length, closedCostsKnown: known.length, closedCostsUnknown: closed.length - known.length,
        recouped, solid: recouped - hits, hits, theatricalLoss: known.length - recouped,
        recoupPercent: known.length ? recouped / known.length * 100 : null,
        hitPercent: known.length ? hits / known.length * 100 : null,
        lossPercent: known.length ? (known.length - recouped) / known.length * 100 : null,
        grossMedianMillions: quantile(closed.map(f => f.grossCents / 1e8), .5),
        grossP90Millions: quantile(closed.map(f => f.grossCents / 1e8), .9),
        grossMaxClosedMillions: closed.length ? Math.max(...closed.map(f => f.grossCents / 1e8)) : null,
        grossMaxIncludingOpenMillions: films.length ? Math.max(...films.map(f => f.grossCents / 1e8)) : null,
        atLeast1BIncludingOpen: films.filter(f => f.grossCents >= 1e11).length,
        atLeast2BIncludingOpen: films.filter(f => f.grossCents >= 2e11).length,
        atLeast3BIncludingOpen: films.filter(f => f.grossCents >= 3e11).length,
        frozenGrossNoBookingRecouped: known.filter(f => result(f) + f.bookingCents >= 0).length,
        budgetMedianMillions: quantile(known.map(f => f.budgetCents / 1e8), .5),
        campaignMedianMillions: quantile(known.map(f => f.campaignCents / 1e8), .5) };
};
const own = observations.filter(f => f.ownCredit);
const ownRows = own.map(f => {
    const weekly = f.weekly || [];
    const total = weekly.reduce((n, w) => n + w.grossCents, 0);
    let running = 0, week95 = null;
    weekly.forEach((w, i) => { running += w.grossCents; if (week95 === null && running >= total * .95) week95 = i + 1; });
    assert.equal(total, f.grossCents);
    return { seed: f.seed, id: f.id, name: f.name, budgetMillions: f.budgetCents / 1e8, campaignMillions: f.campaignCents / 1e8,
        quality: f.quality, grossMillions: f.grossCents / 1e8, projectProfitMillions: f.theatricalProjectProfitBeforeFinancingCents / 1e8,
        closed: f.closed, paidWeeks: weekly.length, week95, actorBackendDollars: f.actorPaidCents / 100 };
});
const summary = {
    kind: 'FIVE_NORMAL_STARTER_CAREER_UNEQUAL_OBSERVATION_WINDOWS', status: 'OBSERVED_BALANCE_WITH_CENSORED_RUNS',
    seeds, totalWeeks: careers.reduce((n, c) => n + c.executedWeeks, 0),
    successfulDurableWrites: careers.reduce((n, c) => n + c.saves, 0),
    verifiedReloadsAndMigrations: careers.reduce((n, c) => n + c.reloads, 0),
    rejectedDuplicateSettlementAttempts: careers.reduce((n, c) => n + c.replays, 0),
    failedPromotionRecoveryCases: careers.filter(c => c.failedPromotionChecked).length,
    overall: summarize(observations), npc: summarize(observations.filter(f => !f.ownCredit)),
    matureReleaseCohort: { seeds: careers.filter(c => c.executedWeeks >= 208).map(c => c.seed), cutoffAbsoluteWeek: 832,
        meaning: 'Only 208-week windows: released during first 104 career weeks, with at least 104 further observed weeks',
        ...summarize(careers.filter(c => c.executedWeeks >= 208).flatMap(c => c.films.filter(f => f.activationWeek <= 832))) },
    smallUnder25M: summarize(observations.filter(f => f.budgetCents <= 25e8)),
    smallUnder10M: summarize(observations.filter(f => f.budgetCents <= 10e8)),
    smallNpcUnder10M: summarize(observations.filter(f => !f.ownCredit && f.budgetCents <= 10e8)),
    ownCreditFilms: ownRows,
    byCareer: careers.map(c => ({ seed: c.seed, status: c.status, observationStatus: c.observationStatus,
        executionCodeSha256: c.executionCodeSha256 || manifest.legacyExecutableSha256,
        weeks: c.executedWeeks, endingCashDollars: c.endingMoney,
        health: c.health, alive: c.alive, saves: c.saves, reloads: c.reloads, replayChecks: c.replays,
        resumeBootstrapWrites: c.resumeBootstrapWrites || 0, peakRssBytes: c.peakRssBytes || null,
        finalSaveBytes: c.saveBytes, ownPaidFilms: c.ownPaidFilms.length, films: summarize(c.films) })),
    definitions: { recouped: 'Completed theatrical project profit >= 0, before financing distributions',
        hit: 'Completed theatrical project profit >= 60% of production budget; matches current NPC HIT threshold',
        loss: 'Completed theatrical project profit < 0; does not establish a lifetime all-media flop',
        projectProfit: 'Producer receipts minus production, actual campaign, booking and contracted actor/talent backends',
        investorPayouts: 'Recorded separately as ownership/financing distributions, not a second project production cost' },
    limitations: ['One existing sustainable DRAMA/minor-role action policy, ordinary $2000/zero-skill start; no creator-studio capital path',
        'Four interrupted 105-week windows plus one completed 208-week window; not five completed 208-week careers and not matched to the older 208-week baseline',
        'Runtime/module initialization seeds share the standard industry roster and fixed studio AI seed profiles; title observations are correlated, not independent lottery draws',
        'All open runs excluded from lifetime financial classification; milestone counts include any already crossed by open runs',
        'The first-104-week mature release cohort uses only the one 208-week career; its remaining open runs are still excluded',
        'Small-film sample is limited; player actor income is not the production company project result',
        'No probability estimate for reaching an advanced $2B studio career or guarantee of fair balance across all strategies',
        'Read-only frozen-gross no-booking arithmetic is diagnostic only; changing future contracts changes future worlds',
        'No full-UI or native-device/performance certification from this engine/save experiment']
};
fs.mkdirSync(join(here,'evidence'),{recursive:true});
fs.writeFileSync(join(here, 'evidence/summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ status: summary.status, totalWeeks: summary.totalWeeks, overall: summary.overall,
    smallNpcUnder10M: summary.smallNpcUnder10M, byCareer: summary.byCareer.map(c => ({seed:c.seed,weeks:c.weeks,status:c.status})) }, null, 2));
