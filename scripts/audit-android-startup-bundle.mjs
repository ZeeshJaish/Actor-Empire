import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const distRoot = resolve(process.cwd(), 'dist');
const htmlPath = resolve(distRoot, 'index.html');
assert.equal(existsSync(htmlPath), true, 'run the production build before auditing the startup bundle');

const html = readFileSync(htmlPath, 'utf8');
assert.match(html, /class="ae-boot-shell"/, 'the production HTML must paint a local shell before React');
assert.match(html, /__actorEmpireBootWatchdog/, 'the local shell must recover when the JavaScript bundle cannot mount');
assert.match(html, /__actorEmpireStartupDiagnostics/, 'the HTML shell must buffer diagnostics before React starts');
assert.match(html, /unhandledrejection/, 'the HTML shell must capture early promise failures');
assert.match(html, /window\.addEventListener\('error'/, 'the HTML shell must capture early JavaScript failures');
assert.match(html, />Retry</, 'the pre-React recovery shell must offer Retry');
assert.match(html, />Restart Game</, 'the pre-React recovery shell must offer Restart Game');
assert.doesNotMatch(html, /Continue Offline/i, 'startup must never bypass required initialization');
assert.doesNotMatch(html, /https?:\/\//i, 'the production HTML must not depend on a remote startup resource');
assert.doesNotMatch(html, /cdn\.tailwindcss|fonts\.googleapis|pagead2|type="importmap"/i);

assert.match(
  html,
  /<script type="module"[^>]+src="\/assets\/index-[^"]+\.js"><\/script>/,
  'the application entry must remain a deferred ES module so HTML can paint the local shell first',
);

const stylesheetMatch = html.match(/href="(\/assets\/index-[^"]+\.css)"/);
assert.ok(stylesheetMatch, 'Vite must emit the compiled local Tailwind stylesheet');
const stylesheetPath = resolve(distRoot, stylesheetMatch[1].replace(/^\//, ''));
assert.equal(existsSync(stylesheetPath), true, 'the compiled stylesheet referenced by HTML must exist');

const stylesheet = readFileSync(stylesheetPath, 'utf8');
assert.match(stylesheet, /\.bg-black/, 'compiled Tailwind utilities must be present');
assert.match(stylesheet, /actor-empire-anton-400\.woff2/, 'startup display font must resolve to a packaged asset');

const emittedAssets = readdirSync(resolve(distRoot, 'assets'));
for (const deferredChunk of ['HomePage-', 'gameLoop-', 'CreationMenu-', 'DeathScreen-', 'RedCarpetEvent-', 'PressConferenceEvent-']) {
  assert.equal(
    emittedAssets.some(fileName => fileName.startsWith(deferredChunk) && fileName.endsWith('.js')),
    true,
    `${deferredChunk.slice(0, -1)} must remain outside the initial JavaScript chunk`,
  );
}

const entryScriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
assert.ok(entryScriptMatch, 'the production entry script must be discoverable');
const entryScriptPath = resolve(distRoot, entryScriptMatch[1].replace(/^\//, ''));
const entryScriptBytes = statSync(entryScriptPath).size;
assert.ok(entryScriptBytes < 8_000_000, 'the initial JavaScript chunk must stay below the phase 3 regression ceiling');
const entryScript = readFileSync(entryScriptPath, 'utf8');
assert.doesNotMatch(entryScript, /Open Safe Menu/i, 'root recovery must follow the Retry and Restart Game decision');

const androidHtmlPath = resolve(process.cwd(), 'android/app/src/main/assets/public/index.html');
assert.equal(existsSync(androidHtmlPath), true, 'Capacitor must contain the production startup entry point');
const androidHtml = readFileSync(androidHtmlPath, 'utf8');
assert.match(androidHtml, /class="ae-boot-shell"/, 'the Android WebView must receive the local first-frame shell');
assert.doesNotMatch(androidHtml, /https?:\/\//i, 'the Android WebView entry point must not depend on remote startup resources');

console.log('Android startup production bundle audit passed.');
