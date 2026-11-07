import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

/* The Upcoming Packs flow is a set of teasers: four pack pages, no save, no price, nothing that loads on a tap. */
const read = file => readFileSync(file, 'utf8');
const PACKS = ['cinema', 'sue', 'nine', 'folly', 'blackout'];
const screens = readdirSync('components/packs').filter(file => file.endsWith('.tsx'));
const sheets = readdirSync('styles/packs').filter(file => file.endsWith('.css'));

assert.deepEqual(screens.sort(), [
  'BlackoutJobPackScreen.tsx', 'CinemaChainPackScreen.tsx', 'FollyPackScreen.tsx', 'GildedNinePackScreen.tsx', 'PackSoundToggle.tsx', 'SueEveryonePackScreen.tsx',
  'UpcomingPacksBanner.tsx', 'UpcomingPacksFlow.tsx', 'UpcomingPacksScreen.tsx',
], 'only the five approved packs have pages');

const flow = read('components/packs/UpcomingPacksFlow.tsx');
for (const pack of PACKS) assert.ok(flow.includes(`pack === '${pack}'`), `flow opens ${pack}`);
assert.match(read('components/packs/UpcomingPacksScreen.tsx'), /export type PackId = 'cinema' \| 'sue' \| 'nine' \| 'folly' \| 'blackout'/);

const page = read('views/LifestylePage.tsx');
assert.ok(page.includes("import UpcomingPacksFlow from '../components/packs/UpcomingPacksFlow'"), 'the flow is imported eagerly');
assert.ok(page.includes("view === 'UPCOMING_PACKS'"), 'Lifestyle has the view');
assert.ok(page.includes("onOpenPacks={() => setView('UPCOMING_PACKS')}"), 'the hub banner opens the list');
assert.ok(!page.includes('CinemaLockedScreen'), 'the old Cinema teaser is gone from the game');
const hub = read('components/ui-overhaul/LifestyleHubScreen.tsx');
assert.ok(hub.includes('<UpcomingPacksBanner onOpen={props.onOpenPacks} />'), 'the hub shows the banner');
const adapter = read('services/lifestyleUiAdapter.ts');
assert.ok(!/id: 'cinema'/.test(adapter), 'Cinema Chain left the Ventures list; it is a pack now');

const DROPPED = /Friday Count|Gift Night|Own Everything|Stay 35|Dirt File|Republic of You|Moon Shoot|Mass Hero|Stage Parent|Kingmaker|Guest to Host|Fan Con|Startup Star|Your Award Show/i;
const CRIME = /\b(mafia|murder|kill|hitman|assassin|gangster)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
for (const file of screens) {
  const source = read(`components/packs/${file}`);
  assert.ok(!/VANTA/i.test(source), `${file}: the mockup's stand-in name is gone`);
  assert.ok(!/\.dc\.html|DCLogic|PORT THIS MOCKUP|const v: any\b/.test(source), `${file}: nothing left of the mockup format`);
  assert.ok(!DROPPED.test(source), `${file}: no dropped pack`);
  assert.ok(!CRIME.test(source), `${file}: no crime wording`);
  assert.ok(!EMOJI.test(source), `${file}: no emoji`);
  assert.ok(!/\b(localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|trackGameEvent|onUpdatePlayer|import\(|lazy\()/.test(source), `${file}: no saving, no network, no code loading on a tap`);
  const imports = [...source.matchAll(/from '([^']+)'/g)].map(match => match[1]);
  for (const name of imports) assert.ok(['react'].includes(name) || name.startsWith('./') || name.startsWith('../../styles/packs/'), `${file}: imports only its own helpers, not ${name}`);
  const text = source.replace(/<[^>]*>/g, ' ');
  assert.ok(!/\$\s?\d{1,3}\.\d\d\b|\bbuy\b|\bprice\b|\bpurchase\b/i.test(text), `${file}: a teaser has no price and no buy button`);
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(source), `${file}: no outside address`);
}

/* the sound: fetching and the on/off choice live in packAudio.ts alone, nothing touches the save, and the pages hold no audio engine of their own */
const audio = read('components/packs/packAudio.ts');
assert.ok(!/\b(sessionStorage|indexedDB|XMLHttpRequest|trackGameEvent|onUpdatePlayer|import\(|lazy\()/.test(audio), 'packAudio.ts: no save, no code loading');
for (const file of screens) assert.ok(!/\b(AudioContext|new Audio\b|decodeAudioData)/.test(read(`components/packs/${file}`)), `${file}: sound goes through packAudio.ts`);
/* every pack page has its theme and its four effects, and the game grows by little: the owner asked that it should not */
for (const pack of PACKS) {
  let bytes = 0;
  for (const name of ['music', 'tap', 'final', 'notify', 'click']) {
    const file = `assets/audio/packs/${pack}/${name}.m4a`;
    assert.ok(existsSync(file), `${pack} has ${name}.m4a`);
    bytes += statSync(file).size;
  }
  assert.ok(bytes <= 450 * 1024, `${pack} ships ${Math.round(bytes / 1024)} KB of sound, over its 450 KB`);
}
/* the recordings the themes are made from are never shipped, only the finished mixes */
assert.ok(!readdirSync('assets/audio/packs', { recursive: true }).some(file => /\.(wav|aiff?|flac)$/i.test(String(file))), 'no recording is shipped');
for (const file of screens.filter(f => /PackScreen\.tsx$/.test(f))) assert.ok(read(`components/packs/${file}`).includes('usePackSounds('), `${file} plays its theme`);
for (const pack of PACKS) assert.ok(flow.includes(`assets/audio/packs/${pack}/music.m4a`), `the list fetches ${pack}'s theme ahead`);
assert.ok(flow.includes('unlockPackAudio()'), 'the tap that opens a pack opens the sound');

for (const file of sheets) {
  const css = read(`styles/packs/${file}`);
  let depth = 0;
  for (const ch of css) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `${file}: stray closing brace`); }
  assert.equal(depth, 0, `${file}: braces balance, because a broken stylesheet takes the whole game down`);
  assert.ok(!/fonts\.googleapis|@import/.test(css), `${file}: no outside font`);
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, 'url()');
  const selectors = [...body.matchAll(/(?:^|[{}])\s*([^{}@]+?)\s*\{/g)].map(match => match[1].trim());
  for (const group of selectors) {
    if (/^(from|to|[\d.]+%)(\s*,\s*(from|to|[\d.]+%))*$/.test(group)) continue;
    for (const selector of group.split(',')) assert.match(selector.trim(), /^(\.smooth-mode )?\.pk-/, `${file}: "${selector.trim()}" could reach the rest of the game`);
  }
  for (const match of body.matchAll(/@keyframes\s+([\w-]+)/g)) assert.match(match[1], /^pk-/, `${file}: keyframes ${match[1]} needs the prefix`);
}

console.log(`Upcoming Packs audit passed: ${screens.length} components, ${sheets.length} stylesheets.`);
