/**
 * #116 The brand studio, from the HQ logo (plan §18.6; Zeesh, 2026-11-01: "एचक्यू के लोगों को टैग करो तो चेंज हो जाए" …
 * "लोगो और इंटेंट बदलने का पैसा और हफ्ता लगेगा, और ठीक है करो"):
 *  - a new look (logo, colours, typeface, lockup) costs money ($2M plus 40¢ a subscriber, up to $60M), keeps the name,
 *    and the next waits 4 weeks; a new ident after launch is a new production (its kit's price, $500K for the included
 *    one) and the next waits 4 weeks; each writes a ledger line the world reads (#117);
 *  - the studio: Look, Ident and Front page tabs, a live preview, a bar that says what Apply does and costs;
 *  - the front page and the ident moved there from the Offer tab, which keeps one line into the studio;
 *  - the real logo in the HQ (a tap opens the studio) and the app (the lockup: a wordmark is the name alone).
 * (~2 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import {
    STREAMING_BRAND_CHANGE_WEEKS, applyStreamingBrandLook, getStreamingBrandLook, getStreamingBrandLookCost, getStreamingBrandStudioView,
    getStreamingIdentChangeCost, rebrandStreamingIdent,
} from '../services/streamingBrandStudio';
import { StreamingBrandStudio } from '../components/streaming-transplant/StreamingBrandStudio';
import { STREAMING_IDENT_SOUNDS } from '../components/streaming-transplant/identSounds';
import { STREAMING_STOREFRONT_LAYOUTS } from '../services/streamingStorefront';
import { ViewerApp, type AppState } from '../components/streaming-transplant/StreamingViewerExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

/* ── a live company with 10M subscribers and $40M ── */
const founded = (): Player => {
    const base: Player = {
        ...structuredClone(INITIAL_PLAYER), id: 'brand-studio', name: 'Brand Audit', money: 200_000_000,
        ownedStreamingPlatform: { ...structuredClone(INITIAL_PLAYER.ownedStreamingPlatform), lifecycle: 'ELIGIBLE', simulationSeed: 'owned-streaming:brand-studio', milestoneKeys: ['streaming-launch-clearance'] },
    };
    const incorporated = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(base, { ...createDefaultStreamingFoundingDraft(100), currentStep: 2, name: 'Brand House+' })).player;
    const platform = incorporated.ownedStreamingPlatform;
    return { ...incorporated, ownedStreamingPlatform: { ...platform, treasuryCash: 40_000_000, metrics: { ...platform.metrics, subscribers: 10_000_000 } } };
};
const company = founded();
const cash = (player: Player) => player.ownedStreamingPlatform.treasuryCash;
const identity = (player: Player) => player.ownedStreamingPlatform.identity!;

/* ── the cost of a new look ── */
assert.deepEqual([0, 10_000_000, 1_000_000_000].map(getStreamingBrandLookCost), [2_000_000, 6_000_000, 60_000_000], '$2M plus 40¢ a subscriber, up to $60M');
assert.deepEqual(['STANDARD', 'FULL', 'CINEMATIC', 'LIVING'].map(id => getStreamingIdentChangeCost(id as 'FULL')), [500_000, 4_500_000, 6_500_000, 14_000_000]);
console.log('PASS costs: a new look $2M + 40¢ a subscriber (≤ $60M); a new ident its kit, $500K for the included one');

/* ── a new look ── */
const before = getStreamingBrandLook(identity(company));
const next = { ...before, visualMarkId: 'ORBIT', primaryColor: '#8B5CF6', typefaceId: 'SERIF' as const, wordmarkStyleId: 'STACK' as const };
const looked = applyStreamingBrandLook(company, next);
assert.ok(looked.changed && looked.reason === 'APPLIED');
assert.equal(cash(looked.player), 34_000_000, 'Paid now: $6M for 10M subscribers');
assert.deepEqual(getStreamingBrandLook(identity(looked.player)), { ...next, primaryColor: '#8B5CF6' }, 'The new look is the identity\'s');
assert.equal(identity(looked.player).name, identity(company).name, 'The name stays');
const week = identity(looked.player).lookChangedAtAbsoluteWeek!;
const entry = looked.player.ownedStreamingPlatform.eventLedger.at(-1)!;
assert.match(entry.summary, /unveiled a new look: a new logo, new colours, a new typeface and a new lockup\./);
assert.deepEqual([entry.metadata?.brandChange, entry.metadata?.cost], ['LOOK', 6_000_000], 'A ledger line the world reads (#117)');
assert.equal(applyStreamingBrandLook(looked.player, next).reason, 'NO_CHANGE');
const again = applyStreamingBrandLook(looked.player, { ...next, typefaceId: 'MONO' });
assert.equal(again.reason, 'WAIT', 'The next new look waits');
assert.match(again.message, /in 4 weeks/);
const later: Player = { ...looked.player, currentWeek: looked.player.currentWeek + STREAMING_BRAND_CHANGE_WEEKS };
assert.equal(getStreamingBrandStudioView(later).lookWaitWeeks, 0, '4 weeks later it can come');
assert.equal(applyStreamingBrandLook(later, { ...next, typefaceId: 'MONO' }).reason, 'APPLIED');
const poor: Player = { ...company, ownedStreamingPlatform: { ...company.ownedStreamingPlatform, treasuryCash: 1_000_000 } };
assert.equal(applyStreamingBrandLook(poor, next).reason, 'INSUFFICIENT_TREASURY');
console.log(`PASS look: paid now, the name stays, a ledger line (week ${week}); the next waits 4 weeks; no money, no look`);

/* ── a new ident after launch ── */
assert.equal(rebrandStreamingIdent(company, { soundIdentKey: 'PULSE', identPackageId: 'FULL' }).reason, 'INVALID_STATE', 'Before launch the ident is set in Define the Launch');
const live: Player = { ...company, ownedStreamingPlatform: { ...company.ownedStreamingPlatform, launchCommit: { idempotencyKey: 'launch' } as never } };
const cinematic = rebrandStreamingIdent(live, { soundIdentKey: 'PREMIERE', identPackageId: 'CINEMATIC' });
assert.ok(cinematic.changed, cinematic.message);
assert.equal(cash(cinematic.player), 33_500_000, 'A new production: $6.5M');
const config = cinematic.player.ownedStreamingPlatform.serviceConfiguration;
assert.deepEqual([config.soundIdentKey, config.identPackageId, config.identDurationSeconds], ['PREMIERE', 'CINEMATIC', 12], 'The app opens on it (#115), 12 seconds');
assert.equal(cinematic.player.ownedStreamingPlatform.eventLedger.at(-1)!.metadata?.brandChange, 'IDENT');
assert.equal(rebrandStreamingIdent(cinematic.player, { soundIdentKey: 'PULSE', identPackageId: 'FULL' }).reason, 'WAIT', 'The next new ident waits');
assert.equal(rebrandStreamingIdent(live, { soundIdentKey: 'PULSE', identPackageId: 'GENRE' }).reason, 'LOCKED', 'A kit Tech has not unlocked');
console.log('PASS ident: after launch a new production at its kit\'s price, the next waits 4 weeks; locked kits need their Tech step');

/* ── the studio ── */
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'BOLT', customMark: null, hue: 214, sat: 80, identId: 'PULSE', customIdent: null, promiseId: 'BALANCED',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'badge', identLen: 2, ratingId: 'ALL', lockupId: 'SIDE', serverCity: null,
};
const studio = renderToStaticMarkup(createElement(StreamingBrandStudio, {
    brand, view: { ...getStreamingBrandStudioView(live), look: { visualMarkId: 'BOLT', customMarkDataUrl: null, primaryColor: '#4b8ff0', secondaryColor: '#3a2410', typefaceId: 'GROTESK', wordmarkStyleId: 'SIDE' } },
    ident: { soundIdentKey: 'PULSE', packageId: 'STANDARD' }, identLocks: {}, frontPage: { currentId: 'cinema', layouts: [] },
    onApplyLook: () => ({ ok: true, message: '' }), onApplyIdent: () => ({ ok: true, message: '' }), onClose: () => undefined,
}));
assert.match(studio, /BRAND STUDIO[\s\S]*aria-label="Live preview"[\s\S]*role="tablist"[\s\S]*>Look<[\s\S]*>Ident<[\s\S]*>Front page</, 'The studio: a live preview and three tabs');
assert.match(studio, /YOUR LOOK[\s\S]*Change the logo, colours, type or lockup above/, 'Untouched, nothing to pay (the saved colours do not count as changed)');
console.log('PASS studio: a live preview, Look / Ident / Front page, a bar that waits for a change');

/* ── #119 the Ident tab: hear it, see it (Zeesh: "आइडेंट म्यूजिक के लिए समझ ही नहीं आ रहा" … "इसका प्रीव्यू क्या है कैसे") ── */
const identTab = renderToStaticMarkup(createElement(StreamingBrandStudio, {
    brand, view: { ...getStreamingBrandStudioView(live), look: null }, initialTab: 'IDENT',
    ident: { soundIdentKey: 'PULSE', packageId: 'STANDARD' }, identLocks: { LIVING: { techId: 'AI_TASTE', tech: 'Taste engine' } },
    frontPage: { currentId: 'cinema', layouts: [] },
    onApplyLook: () => ({ ok: true, message: '' }), onApplyIdent: () => ({ ok: true, message: '' }), onClose: () => undefined,
}));
assert.match(identTab, /aria-label="Live preview"[\s\S]*?data-kit="STANDARD"[\s\S]*?<b>Just the ident<\/b><em>Pulse · two deep heartbeat hits · 3 seconds<\/em>[\s\S]*?Play the ident again/,
    'The preview is the ident itself: the kit with the sound, named, replayable');
for (const sound of STREAMING_IDENT_SOUNDS) assert.ok(identTab.includes(`aria-label="${sound.name}: ${sound.feel}. Tap to listen"`), `${sound.name} says what it sounds like`);
assert.equal((identTab.match(/class="[^"]*_swave[ "]/g) ?? []).length, 15, 'Each sound shows its shape');
assert.match(identTab, /aria-label="Living ident, \$14M, 12 seconds, locked: unlock Taste engine in Tech\. Tap to preview"/, 'A locked kit names its Tech step');
assert.match(identTab, /Unlock in Tech<br\/>Taste engine/, 'and wears it over its still');
assert.equal((identTab.match(/data-kit="(STANDARD|FULL|CINEMATIC|GENRE|ADAPTIVE|LIVING)"/g) ?? []).length, 1 + 6 + 1, 'The stage, six kit stills, and the one place Just the ident dresses');
assert.match(identTab, /WHAT YOU GET · JUST THE IDENT[\s\S]*App opening[\s\S]*(Not in this kit[\s\S]*){5}/, 'What Just the ident makes, and the five places the bigger kits add');
assert.doesNotMatch(identTab, /<button[^>]*disabled=""[^>]*aria-label="[^"]*Tap to (listen|preview)/, 'Sounds and kits can be heard and seen before launch too');
console.log('PASS ident tab: the ident playing as the preview; fifteen sounds with their feel and shape; six kits as stills, locks naming their Tech step; what each kit makes');

/* ── #120 the Front page tab: ready, in use and locked at a glance (Zeesh: "प्रोमिनेंट पता ही नहीं चल रहा है कि रिसर्च
   ओनली कौन सा है, कौन सा अनलॉक है, कौन सा नहीं है") ── */
const layouts = STREAMING_STOREFRONT_LAYOUTS.map(layout => ({
    id: layout.id, name: layout.name, line: layout.line, composition: layout.composition, category: layout.category,
    locked: layout.id === 'marquee' || layout.id === 'split-hero' ? 'Smart TV apps' : null, lockTech: layout.id === 'marquee' || layout.id === 'split-hero' ? 'APPS_TV' as const : null,
}));
const frontTab = renderToStaticMarkup(createElement(StreamingBrandStudio, {
    brand, view: { ...getStreamingBrandStudioView(live), look: null }, initialTab: 'FRONT',
    ident: { soundIdentKey: 'PULSE', packageId: 'STANDARD' }, identLocks: {}, frontPage: { currentId: 'timeline', layouts },
    onApplyLook: () => ({ ok: true, message: '' }), onApplyIdent: () => ({ ok: true, message: '' }), onClose: () => undefined,
}));
const readyAt = frontTab.indexOf(`READY TO USE · ${layouts.length - 2}`);
const lockedAt = frontTab.indexOf('UNLOCK IN TECH · 2');
assert.ok(readyAt > 0 && lockedAt > readyAt, 'Two sections: the ready front pages, then the locked ones');
assert.match(frontTab.slice(readyAt), /^[\s\S]*?aria-label="Timeline, in use\. Tap to preview"/, 'The one in use leads the ready ones');
assert.match(frontTab.slice(readyAt, lockedAt), /aria-label="Timeline, in use\. Tap to preview"[\s\S]*?✓ In use[\s\S]*?Your front page/, 'and says so');
assert.ok(frontTab.slice(lockedAt).includes('aria-label="Marquee, locked: unlock Smart TV apps in Tech. Tap to preview"')
    && frontTab.slice(lockedAt).includes('aria-label="Split Hero, locked: unlock Smart TV apps in Tech. Tap to preview"'), 'A locked one names its Tech step');
assert.equal((frontTab.slice(lockedAt).match(/class="[^"]*_flock[ "]/g) ?? []).length, 2, 'under a padlock');
assert.equal((frontTab.match(/data-home-lead="[A-Z]+"[^>]*><div class="[^"]*_pvbar/g) ?? []).length, layouts.length + 1, 'Each tile, and the preview, is the app\'s own home in miniature');
assert.match(frontTab, /aria-label="Live preview"[\s\S]*?✓ In use[\s\S]*?<b>Timeline<\/b>[\s\S]*?Clear release rhythm[\s\S]*?Shows fewer titles at once/, 'The preview: in use, the name, its upside and its trade-off');
console.log('PASS front tab: ready ones first (the one in use leading, marked), the locked ones under a padlock naming their Tech step; every tile the app\'s own home');

/* ── moved, and the real logo ── */
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const offer = source('components/streaming-transplant/PlatformOffer.tsx');
assert.ok(!offer.includes('Use this storefront') && !offer.includes('Playback ident') && offer.includes('Brand studio ›'), 'The Offer tab: the front page and ident moved out; one line into the studio');
const deck = source('components/streaming-transplant/StreamingPlatformCommandDeck.tsx');
assert.ok(deck.includes('className={css.hqlogo} onClick={onOpenBrandStudio}') && deck.includes('Open the brand studio'), 'The HQ logo opens the studio');
const hq = source('components/StreamingPlatformHQ.tsx');
const hqBrand = source('components/streaming-transplant/streamingPlatformBrand.ts');
assert.ok(hq.includes('streamingPlatformBrand(readPlatform') && hqBrand.includes('customMark: identity.customMarkDataUrl || null') && hqBrand.includes('typeId: identity.typefaceId ||') && hqBrand.includes('lockupId: identity.wordmarkStyleId ||'),
    'The HQ and the app draw the real logo, typeface and lockup');
const app = (lockupId: string) => renderToStaticMarkup(createElement(ViewerApp, {
    brand: { ...brand, lockupId }, onBack: () => undefined,
    state: { live: true, layoutId: 'shelves', titles: [], watchingNow: 1, network: { peakLoad: 1, tier: '4K', latencyMs: 30 } } as AppState,
}));
assert.match(app('SIDE'), /class="[^"]*_tmark[ "]/, 'The app\'s top bar: the mark and the name');
assert.doesNotMatch(app('WORDMARK'), /class="[^"]*_tmark[ "]/, 'A wordmark is the name alone');
console.log('PASS moved: the Offer tab links to the studio; the HQ logo opens it; the HQ and the app wear the real logo and lockup');
console.log('done');
