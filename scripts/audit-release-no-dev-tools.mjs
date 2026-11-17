/* Zeesh (18 Nov 2026): "abse koi tarah ka cheat menu nahi jane ka hai" — no cheat or dev menu, of any kind, in a public
   release from now on. The dev menu and its hooks exist only on the dev server (`import.meta.env.DEV`); this guard
   proves it on what really ships. It reads every JS file of a production build (dist/assets) or of a store file (.aab,
   .apk or .ipa) and fails if any dev-tools piece is in it: the dev-only chunks, the menu's titles, the passcodes (read
   from views/HomePage.tsx, so they are never written here) or the cheat hooks' own text.
   scripts/build-low-memory.mjs runs it after every production build.
   usage: node scripts/audit-release-no-dev-tools.mjs [dist | path/to/app-release.aab | app.apk | app.ipa] */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const target = path.resolve(process.argv[2] || 'dist');

/* dev-only lazy chunks: the test company, the launch shortcuts and the opening-night replay */
const FORBIDDEN_CHUNKS = /(^|\/)(streamingFullPlatformQa|streamingLaunchQa|NightReplay|replayNightData)-[\w-]+\.js$/;

/* the dev menu's passcodes, read from the source so this file never holds them */
const homePage = fs.readFileSync(path.resolve('views/HomePage.tsx'), 'utf8');
const passcodes = [...homePage.matchAll(/^const (?:DEV_TOOLS_PASSCODE|EDITOR_TOOLS_PASSCODE|LEGACY_DEV_TOOLS_PASSCODES)\b.*$/gm)]
  .flatMap(m => [...m[0].matchAll(/'([^']{4,})'/g)].map(x => x[1]));
if (passcodes.length < 3) throw new Error(`could not read the dev passcodes from views/HomePage.tsx (found ${passcodes.length})`);

const FORBIDDEN_TEXT = [
  ...passcodes.map(code => ({ text: code, what: 'a dev-menu passcode' })),
  { text: 'Developer Tools', what: 'the dev menu title' },
  { text: 'Promo Control Room', what: 'the editor menu title' },
  { text: 'Streaming launch test shortcuts', what: 'the streaming QA shortcuts' },
  { text: 'CHEAT:', what: 'a cheat log line' },
  { text: 'cheat_partner', what: 'the baby-naming cheat' },
  { text: 'FULL_PLATFORM', what: 'the full streaming company cheat' },
  { text: 'Streaming QA failed', what: 'the streaming QA hook' },
];

const files = [];
if (fs.statSync(target).isDirectory()) {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(m?js)$/.test(entry.name)) files.push({ name: path.relative(target, full), read: () => fs.readFileSync(full, 'utf8') });
  });
  walk(target);
} else {
  const names = execFileSync('unzip', ['-Z1', target], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(n => /\.(m?js)$/.test(n));
  for (const name of names) files.push({ name, read: () => execFileSync('unzip', ['-p', target, name], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }) });
}
if (!files.length) throw new Error(`no JS files in ${target}`);

const problems = [];
for (const file of files) {
  if (FORBIDDEN_CHUNKS.test(file.name)) problems.push(`${file.name}: a dev-only chunk`);
  const text = file.read();
  for (const rule of FORBIDDEN_TEXT) if (text.includes(rule.text)) problems.push(`${file.name}: ${rule.what}`);
}

if (problems.length) {
  console.error(`RELEASE GUARD FAILED: dev tools in ${path.relative(process.cwd(), target) || target} (${files.length} JS files checked)`);
  [...new Set(problems)].forEach(problem => console.error(`  - ${problem}`));
  console.error('A public release must carry no cheat or dev menu. Keep every dev-menu hook behind import.meta.env.DEV.');
  process.exit(1);
}
console.log(`Release guard passed: no dev tools in ${files.length} JS files of ${path.relative(process.cwd(), target) || target}.`);
