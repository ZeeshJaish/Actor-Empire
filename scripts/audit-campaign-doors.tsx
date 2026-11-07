/** #150 (plan §20.10, #150): campaigns everywhere, and the Growth War Room gone.
 *  - the War Room's component and stylesheet are gone and the HQ never names it; its doors open the Campaign Studio;
 *  - a title page offers Start a campaign (only for a title on the service, saying why not otherwise) and Campaigns · N;
 *    Change artwork and Put on homepage hero are gone; Season 2, spin-off, licence, renew and lapse stay;
 *  - a marketing guarantee counts what the Studio's campaigns spent on the title, so it can be met;
 *  - the Audience room's "Push it" skips a title a Studio campaign already pushes. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { evaluateStreamingRightsCompliance } from '../services/streamingRightsMarketplace';
import { startStreamingCampaign, streamingCampaignBook, streamingCampaignSubjects } from '../services/campaigns/streamingCampaigns';
import { createCanonicalAudienceState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { TitleDossier, type DossierTitle } from '../components/streaming-transplant/StreamingDossierExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Campaign Doors Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'SIDE', serverCity: null,
};
const dossier = (kind: DossierTitle['kind']): DossierTitle => ({
    id: 'p1', title: 'Paper Kingdoms', kind, format: 'Series', genre: 'Historical', hue: 120, logline: 'A test title.', status: 'ON THE SERVICE',
    viewers: 1_000_000, completion: 60, subsAcquired: 10_000, churnPrevented: 5_000, revenue: 2_000_000, cost: 1_000_000,
    sources: [], journey: { steps: ['Live'], at: 0 }, dna: [], artwork: [], press: [], maturity: { have: 4, need: 4 },
});

async function main() {
    const started = performance.now();

    /* ── the War Room is gone ── */
    const root = process.cwd();
    assert.ok(!existsSync(resolve(root, 'components/StreamingPromotionWarRoom.tsx')) && !existsSync(resolve(root, 'styles/streaming-promotion.css')), 'The War Room\'s component and stylesheet are gone');
    const hq = readFileSync(resolve(root, 'components/StreamingPlatformHQ.tsx'), 'utf8');
    assert.ok(!/StreamingPromotionWarRoom|openPromotionWarRoom\(|showPromotionWarRoom|promotionInitial|Enter Growth War Room/.test(hq), 'The HQ never opens it (the old dossier keeps its prop name; comments may still name it)');
    assert.ok((hq.match(/openCampaignStudio\(/g) || []).length >= 6, 'Its doors open the Campaign Studio (Audience twice, the title page twice, Rights, the old dossier)');
    for (const [file, words] of [['components/StreamingRightsExchange.tsx', 'Open Campaign Studio'], ['components/StreamingTitleDossier.tsx', 'Open Campaign Studio']] as const) {
        assert.ok(readFileSync(resolve(root, file), 'utf8').includes(words), `${file} names the Campaign Studio`);
    }
    console.log('PASS gone: the War Room\'s component and stylesheet removed; every door opens the Campaign Studio');

    /* ── a title page ── */
    const draw = (kind: DossierTitle['kind'], campaigns?: { count: number; canStart: boolean; reason?: string }) => text(renderToStaticMarkup(
        <TitleDossier brand={brand} t={dossier(kind)} onClose={() => undefined} onAction={() => undefined} campaigns={campaigns} />));
    const original = draw('ORIGINAL', { count: 2, canStart: true });
    for (const words of ['RENEW FOR SEASON 2', 'COMMISSION A SPIN-OFF', 'LICENCE IT OUT', 'START A CAMPAIGN', 'CAMPAIGNS · 2']) assert.ok(original.includes(words), `An original's page offers ${words}`);
    /* the HQ passes the format as the catalogue writes it (SERIES); a series is renewed for a season, never a sequel */
    assert.ok(text(renderToStaticMarkup(<TitleDossier brand={brand} t={{ ...dossier('ORIGINAL'), format: 'SERIES' }} onClose={() => undefined} />)).includes('RENEW FOR SEASON 2'), 'SERIES in capitals is a series');
    for (const words of ['CHANGE ARTWORK', 'PUT ON HOMEPAGE HERO']) assert.ok(!original.includes(words), `${words} is gone`);
    const licensed = draw('LICENSED', { count: 0, canStart: false, reason: 'Campaigns start once it streams on your service.' });
    assert.ok(licensed.includes('RENEW THE RIGHTS') && licensed.includes('LET IT LAPSE') && licensed.includes('START A CAMPAIGN'), 'A licensed title keeps renew and lapse');
    assert.ok(licensed.includes('Campaigns start once it streams on your service.') && !licensed.includes('CAMPAIGNS ·'), 'Not yet streaming: it says why, and no count');
    console.log('PASS title page: Start a campaign and Campaigns · N; Season 2, spin-off, licence, renew and lapse kept; artwork and homepage hero gone');

    /* ── on the test company ── */
    let player = await buildStreamingFullPlatformQa(fresh('campaign-doors'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = (await processGameWeek(player)).player;
    player = { ...player, energy: { ...player.energy, current: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s`);
    const subjects = streamingCampaignSubjects(player);
    const titles = subjects.filter(item => item.kind === 'TITLE');
    const before = createCanonicalAudienceState(player).room.nextMove;
    const target = before?.id === 'PUSH_TITLE' && before.projectId ? titles.find(item => item.id === before.projectId)! : titles[0];
    const launched = startStreamingCampaign(player, { name: target.name, subject: { kind: 'TITLE', id: target.id }, where: { kind: 'LIVE' },
        formats: ['SOCIAL_FEED', 'SHORT_VIDEO'], budget: { kind: 'BURST', total: 6_000_000, weeks: 2 } });
    assert.ok(launched.ok, `The campaign launches: ${launched.problems.join(', ')}`);
    if (before?.id === 'PUSH_TITLE') {
        const after = createCanonicalAudienceState(launched.player).room.nextMove;
        assert.ok(!(after?.id === 'PUSH_TITLE' && after.projectId === target.id), 'Push it no longer offers a title a Studio campaign pushes');
        console.log(`PASS push: "${before.cta}" until a Studio campaign pushes it; then "${after?.cta ?? 'nothing'}"`);
    } else {
        console.log(`(the test company's next move is ${before?.id ?? 'none'}, not Push it; the skip is read from the campaign book)`);
    }
    player = (await processGameWeek(launched.player)).player;
    const spent = streamingCampaignBook(player.ownedStreamingPlatform).campaigns.find(item => item.id === launched.campaignId)!.spent;
    assert.ok(spent > 0, 'It spent');

    /* ── a marketing guarantee counts the Studio's spend ── */
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const obligation = (id: string, projectId: string, target: number) => ({
        id, licenseId: `license-${id}`, sourceProjectId: projectId, title: `Guarantee ${id}`, type: 'MARKETING_SPEND' as const, targetAmount: target,
        observedAmount: 0, dueAtAbsoluteWeek: week + 8, status: 'PENDING' as const, breachPenalty: 250_000, successPayment: 0, resolvedAtAbsoluteWeek: null,
    });
    const other = titles.find(item => item.id !== target.id)!;
    const platform = normalizeOwnedStreamingPlatformState({
        ...player.ownedStreamingPlatform,
        rightsObligations: [obligation('met', target.id, Math.floor(spent * 0.9)), obligation('unmet', other.id, 1_000_000)],
    }, player.id);
    const compliance = evaluateStreamingRightsCompliance(platform, week);
    const met = compliance.platform.rightsObligations.find(item => item.id === 'met')!;
    const unmet = compliance.platform.rightsObligations.find(item => item.id === 'unmet')!;
    assert.equal(met.status, 'SATISFIED', 'A guarantee on the campaign\'s title is met by its spend');
    assert.ok(met.observedAmount >= spent - 1, 'It counts what the campaign spent');
    assert.equal(unmet.status, 'PENDING', 'Another title\'s guarantee is untouched');
    console.log(`PASS guarantee: "${target.name}" — a ${Math.round(spent * 0.9 / 1e5) / 10}M marketing guarantee met by the Studio campaign's $${(spent / 1e6).toFixed(1)}M; another title's still pending`);
    console.log(`campaign doors audit passed in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
