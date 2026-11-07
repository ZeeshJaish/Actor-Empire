/** #175 (plan §22.7): MONEY is the summary and Studio Finance the books, with one runway.
 *  - the cash summary: the last 12 weekly closes rebuilt from the books (the last one is today's treasury), the last
 *    4 weeks' pace and the runway at it; Studio Finance reads the same runway;
 *  - MONEY: the pace or the runway, the cash line, this week in one bar and three numbers, the door to the books;
 *    a company losing money shows its runway and the alert says the same weeks;
 *  - Studio Finance › Capital for the streaming company: your own money and the bank only, with doors to OWNERSHIP
 *    and MARKETS; without the scope (the production house) Capital is as it was. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingCashSummary, getStreamingStudioFinanceData } from '../services/streamingStudioFinance';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { Boardroom } from '../components/streaming-transplant/StreamingBoardroomExperience';
import { createCanonicalBoardroomState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { StudioFinance } from '../components/studio-finance/components/StudioFinance';

const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
} as Brand;
const noop = () => undefined;
const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Money Summary', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const billions = (value: number) => `$${(value / 1e9).toFixed(2)}B`;

async function main() {
    const started = performance.now();
    const player = await buildStreamingFullPlatformQa(fresh('money-summary'), { processWeek: processGameWeek, persistWeek: async next => next });
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

    /* ── one runway, from the books ── */
    const cash = getStreamingCashSummary(player);
    assert.equal(cash.closes.length, 12, 'twelve weekly closes');
    assert.equal(cash.closes.at(-1)!.cash, platform.treasuryCash, "the last close is today's treasury");
    assert.ok(cash.closes.every((point, index) => index === 0 || point.week === cash.closes[index - 1].week + 1), 'one close a week, in order');
    assert.equal(cash.runwayWeeks, cash.weeklyNet >= 0 ? null : Math.floor(cash.treasury / Math.abs(cash.weeklyNet)));
    const books = getStreamingStudioFinanceData(player);
    assert.equal(books.runwayWeeks, cash.runwayWeeks, 'Studio Finance reads the same runway');
    assert.equal(books.capitalScope, 'founder');
    pass(`the cash summary: W${cash.closes[0].week}–W${cash.closes.at(-1)!.week}, ${billions(cash.closes[0].cash)} → ${billions(cash.treasury)}; the last 4 weeks' pace ${billions(cash.weeklyNet)} a week; runway ${cash.runwayWeeks ?? 'none (cash grows)'}; Studio Finance the same`);

    /* ── MONEY ── */
    const money = (summary = cash) => text(renderToStaticMarkup(
        <Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} onBack={noop} initialTab="MONEY"
            onOpenFinance={noop} mnaComingSoon cash={summary} />,
    ));
    const growing = money();
    for (const words of ['CASH IS GROWING', 'a week, on average over the last 4 weeks', 'now ·', 'in 12 weeks', 'This week', 'IN', 'OUT', 'NET', 'Most in ·', 'Most out ·', 'The full books: statements, every title, the ledger and your own money']) {
        assert.ok(growing.includes(words), `MONEY shows "${words}"`);
    }
    assert.ok(!growing.includes('COMPANY TREASURY') && !growing.includes('MONEY IN') && !growing.includes('Capital, loans, investors'), 'the old treasury card and statement are gone');
    assert.match(renderToStaticMarkup(<Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} onBack={noop} initialTab="MONEY" cash={cash} />), /<polyline points=/);
    const burning = money({ ...cash, weeklyNet: -50_000_000, runwayWeeks: 9 });
    assert.ok(burning.includes('RUNWAY') && burning.includes('9 weeks') && burning.includes("the last 4 weeks' pace"), 'a company losing money shows its runway');
    assert.ok(burning.includes("9 weeks of runway remain at the last 4 weeks' pace."), 'the alert says the same weeks');
    pass('MONEY: the pace (or the runway), the cash line, this week in one bar and three numbers, one door to the books; a losing company sees "9 weeks" in the card and the alert');

    /* ── Studio Finance › Capital ── */
    const capital = (data = books) => text(renderToStaticMarkup(
        <StudioFinance data={data} initialTab="capital" onOpenBank={noop} onOpenOwnership={noop} onOpenMarkets={noop} onFounderInjection={() => ({ ok: true, message: '' })} />,
    ));
    const founderOnly = capital();
    for (const words of ['Your own money', 'Founder capital', 'Inject capital', 'Your bank', 'Shares and investors, in the Boardroom', 'Owners and investors', 'Going public']) {
        assert.ok(founderOnly.includes(words), `Capital shows "${words}"`);
    }
    for (const words of ['Company ownership', 'IPO readiness', 'Review term sheet', 'Open IPO desk', 'Funding routes']) {
        assert.ok(!founderOnly.includes(words), `Capital no longer shows "${words}"`);
    }
    const unscoped = capital({ ...books, capitalScope: undefined });
    assert.ok(unscoped.includes('Company ownership') && unscoped.includes('IPO readiness') && unscoped.includes('Funding routes'), 'without the scope (the production house) Capital is unchanged');
    pass('Studio Finance › Capital: founder capital and the bank, with doors to OWNERSHIP and MARKETS; unscoped Capital unchanged');

    console.log(`Money summary audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
