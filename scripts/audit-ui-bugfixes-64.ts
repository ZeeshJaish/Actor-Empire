/** Three UI bugs found while checking #62 and #63, fixed in #64. Checks:
 *  - the Offer tab's footer while editing: the change count and the two buttons are two groups that
 *    wrap (`.tray` flex-wraps; Cancel and Apply share `.trayActs`), so on a narrow phone the buttons
 *    move under the count instead of over it;
 *  - the storefront rail: a long name ("Freeform Canvas") wraps instead of ending in an ellipsis, and
 *    the lock line under it is never clamped (the rail moved to the brand studio's Front page tab in #116);
 *  - the save-slot card: Fame rounded as the home screen rounds it (74.5999999999998 → 75).
 *  The layouts themselves were checked in the browser at 320, 360, 375, 390 and 430. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SaveSlotScreen from '../components/SaveSlotScreen';

const read = (path: string) => readFileSync(path, 'utf8');
/* one rule's declarations, by its exact selector */
const rule = (css: string, selector: string) => {
    const at = css.indexOf(`\n${selector}{`);
    assert.ok(at >= 0, `${selector} exists`);
    return css.slice(at + 1, css.indexOf('}', at) + 1);
};

function main() {
    const started = performance.now();
    const offerCss = read('components/streaming-transplant/presentation/screens/NetworkDesk/PlatformOffer.module.css');
    const offerTsx = read('components/streaming-transplant/PlatformOffer.tsx');

    /* ── the Offer tab's footer ── */
    assert.match(rule(offerCss, '.tray'), /display:flex;flex-wrap:wrap/, 'The footer wraps instead of squeezing three columns');
    assert.match(rule(offerCss, '.tray>span'), /flex:1 0 auto/, 'The count keeps its width');
    assert.match(rule(offerCss, '.trayActs'), /display:flex/, 'The two buttons are one group');
    assert.match(offerTsx, /<div className=\{css\.trayActs\}>\s*<button[^>]*>Cancel<\/button>\s*<button[^>]*>Apply from next week<\/button>\s*<\/div>/,
        'Cancel and Apply share the group, so they move together');
    console.log('PASS footer: "No changes" and the Cancel / Apply group wrap as two groups; on a narrow phone the buttons go under the count');

    /* ── the storefront rail (in the brand studio since #116) ── */
    const studioCss = read('components/streaming-transplant/presentation/screens/BrandStudio/BrandStudio.module.css').replace(/[ \t]*([{}:;])[ \t]*/g, '$1');
    const name = rule(studioCss, '.front b');
    const lock = rule(studioCss, '.front small');
    assert.doesNotMatch(name, /nowrap|ellipsis|overflow:hidden/, 'A long name wraps');
    assert.match(name, /overflow-wrap:anywhere/);
    assert.doesNotMatch(lock, /line-clamp|overflow:hidden/, 'The lock line is never clamped');
    console.log('PASS storefront: a long name such as "Freeform Canvas" wraps onto a second line, and "Needs …" is never clamped');

    /* ── the save-slot card ── */
    const markup = renderToStaticMarkup(createElement(SaveSlotScreen, {
        slots: [
            null,
            { name: 'Tech Test', age: 15, fame: 74.5999999999998, totalPlayTimeMs: 0 },
            { name: 'Map Test', age: 22, fame: 74.41999999999979, totalPlayTimeMs: 3_600_000 },
        ],
    }));
    assert.match(markup, /★ <b>75<\/b> Fame/, '74.5999999999998 reads 75, as the home screen\'s bar shows it');
    assert.match(markup, /★ <b>74<\/b> Fame/, '74.41999999999979 reads 74');
    assert.doesNotMatch(markup, /74\.\d/, 'No raw decimals');
    console.log('PASS slot: Fame 74.5999999999998 → "★ 75 Fame", 74.41999999999979 → "★ 74 Fame"');
    console.log(`done in ${Math.round(performance.now() - started)} ms`);
}

main();
