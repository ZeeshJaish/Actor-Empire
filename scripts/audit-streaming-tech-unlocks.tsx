/**
 * #109 Locks name their tech; Tech steps list what they unlock; the dead locks removed (Zeesh, 2026-11-01: "विज़ार्ड में …
 * स्टोर फ्रंट डिज़ाइन या प्लेबैक इंटेंट ऐसे थे जो लॉक्ड रहे रिसर्च से खुले गए … वो सारी चीज़ हमने अच्छा टेक में डाल दे";
 * plan §18.5, §18.2 10-11):
 *  - each locked front page and ident kit names the Tech step that unlocks it (Marquee and Split Hero Smart TV apps,
 *    Vertical Feed Phone and web apps, Freeform Canvas VR and holo screens, Mosaic Personal artwork; the Genre worlds
 *    ident Because you watched, Adaptive Personal artwork, Living Taste engine), in place of Product Experience levels;
 *  - each of those steps lists what it unlocks, and the Offer tab's locked layouts open their step;
 *  - the kit or layout already chosen stays usable; Live events before launch say when they come;
 *  - gone: "Research locked", the stream:/feature: locks nobody read, the brand's old LAYOUTS list, Build › Money's
 *    "Research Product Experience level 1", and RESEARCH_REQUIRED, never assigned.
 * (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OwnedStreamingTechTreeState } from '../types';
import { STREAMING_LAUNCH_UNLOCKS, streamingLaunchUnlockLock, streamingTechUnlocks } from '../services/streamingLaunchUnlocks';
import { STREAMING_STOREFRONT_LAYOUTS, getStreamingStorefrontLock, getStreamingStorefrontLockReason } from '../services/streamingStorefront';
import { getStreamingTechDefinition, resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';

/* ── the map: every lock a Tech step, with Tech's prices unchanged ── */
assert.deepEqual(Object.fromEntries(Object.entries(STREAMING_LAUNCH_UNLOCKS).map(([key, unlock]) => [key, unlock.techId])), {
    'storefront:marquee': 'APPS_TV', 'storefront:split-hero': 'APPS_TV', 'storefront:mosaic': 'AI_ARTWORK',
    'storefront:vertical-feed': 'APPS_PHONE', 'storefront:freeform-canvas': 'APPS_HOLO',
    'ident:genre': 'AI_BECAUSE', 'ident:adaptive': 'AI_ARTWORK', 'ident:living': 'AI_TASTE',
    /* #122: the new front pages that need a step */
    'storefront:coverflow': 'APPS_TV', 'storefront:bento': 'AI_ARTWORK', 'storefront:orbit': 'APPS_HOLO', 'storefront:the-deck': 'APPS_PHONE',
}, 'The approved map (plan §18.5, and #122\'s four)');
assert.deepEqual(['APPS_TV', 'AI_ARTWORK', 'APPS_HOLO', 'AI_BECAUSE', 'AI_TASTE'].map(id => getStreamingTechDefinition(id as 'APPS_TV')?.unlockCost),
    [12_000_000, 25_000_000, 250_000_000, 8_000_000, 150_000_000], 'Tech prices unchanged');
assert.ok(!JSON.stringify(STREAMING_STOREFRONT_LAYOUTS).includes('requirements'), 'No front page carries a Product Experience level');
console.log('PASS map: nine front pages and three ident kits, each a Tech step; Tech prices unchanged; no levels');

/* ── a new service, then with Smart TV apps ── */
const fresh = resolveStreamingTechTree(null);
const marquee = streamingLaunchUnlockLock(fresh, 'storefront:marquee');
assert.deepEqual(marquee, { techId: 'APPS_TV', tech: 'Smart TV apps', needs: 'Unlock Smart TV apps in Tech' }, 'Marquee names Smart TV apps');
assert.equal(streamingLaunchUnlockLock(fresh, 'storefront:vertical-feed'), null, 'Vertical Feed comes with the starter Phone and web apps');
assert.equal(streamingLaunchUnlockLock(fresh, 'storefront:cinema'), null, 'A layout with no lock is open');
assert.deepEqual(streamingLaunchUnlockLock(fresh, 'ident:living')?.tech, 'Taste engine');
const withTv: OwnedStreamingTechTreeState = { ...fresh, techs: { ...fresh.techs, APPS_TV: { version: 1, energy: 0, unlockedAtAbsoluteWeek: 1 } as never } };
assert.equal(getStreamingStorefrontLockReason({ techTree: withTv }, 'split-hero'), null, 'With Smart TV apps, Split Hero opens');
assert.equal(getStreamingStorefrontLockReason({ techTree: fresh }, 'split-hero'), 'Unlock Smart TV apps in Tech');
assert.equal(getStreamingStorefrontLock({ techTree: fresh }, 'freeform-canvas')?.techId, 'APPS_HOLO');
console.log('PASS locks: a new service is told "Unlock Smart TV apps in Tech"; Vertical Feed is open; with the step, the page opens');

/* ── steps list what they unlock ── */
assert.deepEqual(streamingTechUnlocks('APPS_TV'), ['the Marquee front page', 'the Split Hero front page', 'the Coverflow front page']);
assert.deepEqual(streamingTechUnlocks('AI_ARTWORK'), ['the Mosaic front page', 'the Bento front page', 'the Adaptive ident']);
assert.deepEqual(streamingTechUnlocks('APPS_HOLO'), ['the Freeform Canvas front page', 'the Orbit front page'], '#122: VR and holo screens open Orbit too');
assert.deepEqual(streamingTechUnlocks('PICTURE_4K'), [], 'A step that unlocks none says nothing');
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const desk = source('components/streaming-transplant/TechDesk.tsx');
assert.ok(desk.includes('const unlocks = streamingTechUnlocks(step.id);') && desk.includes('{unlocksLine && <li className={t.feeds}>{unlocksLine}</li>}'),
    'The Tech tab lists them on the step, open or still locked');
// #116: the front pages moved from the Offer tab to the brand studio, which names and opens the step
const studio = source('components/streaming-transplant/StreamingBrandStudio.tsx');
/* #120 put the lock under a padlock with its step in amber (the tile's line is the step's name; aloud "locked: unlock … in Tech") */
assert.ok(studio.includes("`, locked: unlock ${item.locked} in Tech`") && studio.includes('{item.locked ? item.locked :') && studio.includes('onGoToTech(layoutDef.lockTech!)'),
    'The brand studio\'s locked front pages name and open their step');
console.log('PASS steps: Smart TV apps unlocks Marquee and Split Hero, Personal artwork Mosaic and the Adaptive ident; the Tech tab and the brand studio say so');

/* ── the saves keep the choice already made; the wizard opens the step ── */
const program = source('services/streamingLaunchProgram.ts');
assert.ok(program.includes("input.identPackageId !== platform.serviceConfiguration.identPackageId") && !program.includes('productLevel < 20'),
    'An ident kit is checked against its Tech step, and the kit in use stays usable');
assert.ok(program.includes('storefrontId !== platform.serviceConfiguration.storefrontLayoutId && getStreamingStorefrontLockReason'), 'and so is the layout in use');
for (const step of ['StepStorefront', 'StepIdent']) {
    const ui = source(`components/studio-finance/components/launch/${step}.tsx`);
    assert.ok(ui.includes('onOpenTechnology?.(previewTech?.techId)') && !/Research locked|Research \{/.test(ui), `${step}: Unlock opens the exact Tech step; no research copy`);
}
console.log('PASS choices: the kit or layout in use stays usable; the wizard\'s Unlock opens the exact step');

/* ── the dead locks ── */
const launch = source('components/StreamingDefineLaunchExperience.tsx');
assert.ok(!/lock\('(stream|feature):/.test(launch), 'No stream: or feature: locks (nobody read them)');
assert.ok(!source('components/streaming-transplant/StreamingBrandVisuals.tsx').includes('export const LAYOUTS'), 'The brand\'s old LAYOUTS list is gone');
assert.ok(!source('components/StreamingPlatformHQ.tsx').includes('Research Product Experience level 1'), 'Build › Money asks for no research');
for (const path of ['services/streamingFacilityMarketplace.ts', 'components/streaming-transplant/StreamingBuildoutExperience.tsx', 'components/streaming-transplant/StreamingBuildWizardExperience.tsx']) {
    assert.ok(!source(path).includes("'RESEARCH_REQUIRED'"), `${path}: no RESEARCH_REQUIRED`);
}
console.log('PASS dead locks: stream:/feature:, the brand LAYOUTS list, Build › Money\'s research and RESEARCH_REQUIRED are gone');
console.log('done');
