/**
 * #115 The viewer app opens with the ident, then "Who's watching?" (plan §18.5, 4: "the ident the player paid for plays,
 * with its sound and its length; then 'Who's watching?', with profiles as owned and Kids as the plan allows; then the
 * home"; Zeesh, 2026-11-01: the app should open "वैसे ही … जैसे हमने इंडेंट यहाँ डाला है, प्रोफाइल वाला चीज़ डाला है"):
 *  - a live service with an ident opens on it: its kit (the flourish), its length (the bar), its sound (the wave; none for
 *    Silent), Skip; a service before launch, or without an ident, opens as before;
 *  - "Who's watching?" has a profile for each screen the plan has at once (2–6; 3 when the plan does not say), Kids where
 *    the plan includes Kids profiles;
 *  - the app's state carries the ident from the save: its sound (the uploaded one where it is used), length and kit.
 * Renders with react-dom/server. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ViewerApp, streamingViewerKitSurface, streamingViewerProfiles, type AppState, type AppTitle } from '../components/streaming-transplant/StreamingViewerExperience';
import { StreamingIdentPlayer } from '../components/streaming-transplant/StreamingIdentPlayer';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import type { StreamingViewerPlan } from '../services/streamingViewerQuality';

/* ── profiles: one a screen ── */
const plan = (features: string[]): StreamingViewerPlan => ({
    id: 'P', name: 'Plan', monthly: 9.99, price: '$9.99 a month', adLevel: 'NONE', adSpotsPerHour: 0, picture: '1080p Full HD', features,
    ads: 'No ads', colorId: 'ocean', quality: { planName: 'Plan', planMax: '1080p', nowIn: null, badges: [], menu: [] },
});
const names = (features: string[]) => streamingViewerProfiles(plan(features)).map(profile => profile.name);
assert.deepEqual(names(['2 screens at once']), ['You', 'Alex']);
assert.deepEqual(names(['4 screens at once', 'Downloads']), ['You', 'Alex', 'Mia', 'Sam']);
assert.deepEqual(names(['6 screens at once']), ['You', 'Alex', 'Mia', 'Sam', 'Ravi', 'Noor']);
assert.deepEqual(names(['1 screen at once']), ['You', 'Alex'], 'Two at least');
assert.deepEqual(names([]), ['You', 'Alex', 'Mia'], 'Three when the plan does not say');
console.log('PASS profiles: one a screen the plan has (2, 4, 6), two at least, three when unsaid');

/* ── the app opens on the ident ── */
const titles: AppTitle[] = [{ id: 't1', title: 'Midnight Harbor', kind: 'ORIGINAL', format: 'Series', genre: 'Thriller', hue: 214, logline: 'A town.', rank: 1 }];
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
};
const base: AppState = {
    live: true, layoutId: 'cinema', titles, watchingNow: 1000, network: { peakLoad: 40, tier: '4K', latencyMs: 30 },
    plans: [plan(['4 screens at once', 'Kids profiles'])], currentPlanId: 'P', personal: { because: false, profiles: true },
};
const render = (state: AppState) => renderToStaticMarkup(createElement(ViewerApp, { brand, state, onBack: () => undefined }));
const cinematic = render({ ...base, opening: { sound: 'premiere', seconds: 12, packageId: 'CINEMATIC' } });
assert.match(cinematic, /data-ident-kit="CINEMATIC" role="button" tabindex="0" aria-label="NORTHSTAR\+ ident\. Tap to skip" style="--epx-va-ident-s:12s"/,
    'A live service with an ident opens on it, for its length');
assert.match(cinematic, /SKIP ›/, 'Skip');
assert.doesNotMatch(cinematic, /Who’s watching\?|Top 10 on |Exit app/, 'Nothing else until it ends');
assert.equal((cinematic.match(/class="[^"]*_lb(top|bottom)[ "]/g) ?? []).length, 2, 'Cinematic letterboxes it');
assert.match(cinematic, /class="[^"]*_iwave[ "]/, 'with its sound\'s wave');
assert.match(cinematic, /class="[^"]*_isweep[ "]/, 'and a sweep of light');
const silent = render({ ...base, opening: { sound: 'silent', seconds: 3, packageId: 'STANDARD' } });
assert.doesNotMatch(silent, /class="[^"]*_iwave[ "]/, 'A silent ident has no wave');
assert.doesNotMatch(silent, /class="[^"]*_isweep[ "]/, 'The included ident: no sweep');
assert.match(render(base), /Who’s watching\?/, 'Without an ident: "Who\'s watching?" first, as before');
assert.doesNotMatch(render({ ...base, live: false, opening: { sound: 'pulse', seconds: 3, packageId: 'STANDARD' } }), /data-ident-kit/, 'Before launch: no ident');
const who = render(base);
assert.deepEqual([...who.matchAll(/aria-pressed="false"[^>]*><span[^>]*><svg[\s\S]*?<\/svg><\/span><b>([^<]+)<\/b>/g)].map(match => match[1]), ['You', 'Alex', 'Mia', 'Sam', 'Kids'],
    'Four screens: four profiles, and Kids');
console.log('PASS opening: the ident first (kit, length, sound, Skip), then "Who\'s watching?" with a profile a screen and Kids, then the home');

/* ── from the save ── */
const canonical = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/createCanonicalStreamingPresentation.ts'), 'utf8');
assert.ok(canonical.includes("sound: (config.customIdentAudio ? 'custom' : config.soundIdentKey.toLowerCase())")
    && canonical.includes('seconds: config.identDurationSeconds || 3') && canonical.includes('...(opening ? { opening } : {})'),
    'The app\'s state carries the saved ident: its sound (the uploaded one in use), its length, its kit');
const css = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/presentation/screens/ViewerApp/ViewerApp.module.css'), 'utf8');
assert.match(css, /\.va \.opening \.irun i\{[^}]*animation:epx-irun var\(--epx-va-ident-s,3s\) linear both/, 'The bar runs for its length');
assert.match(css, /\.va \.opening \.skip,\.va \.opening \.irun\{z-index:3\}/, 'Skip and the bar above the letterbox');
console.log('PASS save: the state carries the saved ident; the bar runs its length; Skip sits above the letterbox');

/* ── #119 each kit its own film (the same scene the brand studio previews) ── */
const scene = (kit: 'STANDARD' | 'FULL' | 'CINEMATIC' | 'GENRE' | 'ADAPTIVE' | 'LIVING', extra: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(StreamingIdentPlayer, {
    brand, kit, sound: 'pulse', seconds: 10, next: { title: 'Glass Coast', hue: 28 }, hour: 22, ...extra,
}));
assert.ok(cinematic.includes('data-kit="CINEMATIC"'), 'The opening plays the kit\'s own scene');
assert.doesNotMatch(scene('STANDARD'), /_isweep|_orbit|_beam|data-world|_tint|_sky/, 'Just the ident: the mark, the name, the wave');
assert.equal((scene('FULL').match(/<i style="--k:\d"/g) ?? []).length, 8, 'The whole kit: eight marks orbit in and become one');
assert.match(scene('CINEMATIC'), /_beam[\s\S]*_dust[\s\S]*_flare[\s\S]*_lbtop[\s\S]*_lbbottom/, 'Cinematic: a beam through dust, a flare, the letterbox');
assert.deepEqual([...scene('GENRE').matchAll(/data-world="(\w+)"/g)].map(match => match[1]), ['drama', 'action', 'comedy', 'family', 'event'], 'Genre worlds: five worlds pass');
assert.match(scene('ADAPTIVE'), /--nh:28[\s\S]*_tint[\s\S]*Tonight · <b>Glass Coast<\/b>/, 'Adaptive: the next title\'s colour, and its name');
assert.match(scene('LIVING'), /data-sky="night"[\s\S]*_sky[\s\S]*_stars[\s\S]*_orb[\s\S]*Good evening · 22:00/, 'Living: the night sky, the moon, a greeting');
assert.match(scene('LIVING', { hour: 8 }), /data-sky="dawn"[\s\S]*Good morning · 08:00/, 'and the morning at eight');
assert.doesNotMatch(scene('LIVING', { hour: 8 }), /_stars/, 'Stars only at night');
const still = scene('CINEMATIC', { still: true, surface: 'LIVE' });
assert.match(still, /_still[ "][^>]*data-kit="CINEMATIC" data-surface="LIVE"/, 'A still frame of a surface (the studio\'s cards)');
assert.ok(!still.includes('_isweep') && still.includes('Live now'), 'no sweep, its kicker');
assert.doesNotMatch(scene('STANDARD', { surface: 'END', still: true }), /Up next/, 'Just the ident has no surfaces of its own');
console.log('PASS kits: Just the ident, the whole kit\'s orbit, Cinematic\'s beam and letterbox, five genre worlds, Adaptive\'s next title, Living\'s hour; stills for the studio');

/* ── #124 the kit's other five places in the app (Zeesh: "haan, baaki 5 bhi app mein laga do") ── */
const fresh = { newThisWeek: true }, older = { newThisWeek: false };
assert.equal(streamingViewerKitSurface('FULL', 'TRAILER', older), 'TRAILER', 'A trailer opens on the kit\'s trailer ident');
assert.equal(streamingViewerKitSurface('GENRE', 'LIVE', older), 'LIVE', 'A live channel on its Live ident');
assert.equal(streamingViewerKitSurface('CINEMATIC', null, fresh), 'PREMIERE', 'A new title on its premiere');
assert.equal(streamingViewerKitSurface('CINEMATIC', null, fresh, true), null, 'not when Autoplay carries the show on');
assert.equal(streamingViewerKitSurface('CINEMATIC', null, older), null, 'and an older title starts as before');
assert.equal(streamingViewerKitSurface('STANDARD', 'TRAILER', fresh), null, 'Just the ident has no other places');
assert.equal(streamingViewerKitSurface(null, 'LIVE', fresh), null, 'nor a service without an ident');
const app = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/StreamingViewerExperience.tsx'), 'utf8');
assert.ok(app.includes("setBumper({ surface: 'KIDS', then: () => setScreen('BROWSE') })"), 'Kids opens on the kit\'s Kids ident');
assert.ok(app.includes("onClick={() => play(ch.title, 0, 'LIVE')}"), 'an AI channel plays as live');
assert.ok(app.includes("onTrailer={() => play(open, 0, 'TRAILER')}") && app.includes('<i className={css.tri} />Trailer</button>'), 'the title page has a Trailer');
assert.ok(app.includes('surface="END"') && app.includes('upNext !== null && nextEp && kit &&'), 'the kit\'s end card under Up next');
assert.match(renderToStaticMarkup(createElement(StreamingIdentPlayer, { brand, kit: 'FULL', sound: 'pulse', seconds: 2.6, surface: 'PREMIERE' })), /World premiere/, 'The premiere says "World premiere"');
const playerCss = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/presentation/screens/ViewerApp/IdentPlayer.module.css'), 'utf8');
assert.ok(playerCss.includes(".scene[data-surface='KIDS'][data-kit] .imark { color: var(--c);"), 'Kids keeps the mark in the brand colour in its white bubble');
console.log('PASS places: a trailer, a live channel and a new title open on the kit\'s ident; Kids on its own; the end card under Up next; none for Just the ident');
console.log('done');
