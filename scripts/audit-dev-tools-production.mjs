#!/usr/bin/env node
// Perf plan (2026-11-08): Developer Tools, the Promo Control Room, the cheat buttons and the QA helpers
// exist only on the dev server. This audit checks the gates in views/HomePage.tsx and, when a production
// build newer than HomePage.tsx exists in dist/, that the build carries none of it: no passcode value,
// no tool labels, none of the QA helpers' own strings. It prints names and counts, never a passcode.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.readFileSync(path.join(root, 'views/HomePage.tsx'), 'utf8');
const failures = [];
const check = (ok, message) => { if (ok) console.log(`PASS ${message}`); else { failures.push(message); console.log(`FAIL ${message}`); } };

for (const name of ['DEV_TOOLS_PASSCODE', 'EDITOR_TOOLS_PASSCODE', 'LEGACY_DEV_TOOLS_PASSCODES']) {
  check(new RegExp(`^const ${name} = !import\\.meta\\.env\\.DEV \\?`, 'm').test(home), `${name} is empty outside the dev server`);
}
check(home.includes('{import.meta.env.DEV && showPasswordPrompt && ('), 'the passcode prompt renders only on the dev server');
check(home.includes("{import.meta.env.DEV && activeCheatMenu !== 'NONE' && ("), 'the tools menu renders only on the dev server');
check(home.includes('if (import.meta.env.DEV && clickCountRef.current === 3) {'), 'the triple tap opens nothing outside the dev server');
const QA = ['createHomeProductionQaActions', 'createHomeSocialQaActions', 'createHomeBoxOfficeQaActions', 'createHomeStudioOwnershipQaActions', 'createHomeStudioProductionQaActions'];
for (const factory of QA) {
  const calls = home.split(`${factory}(`).length - 1;
  check(home.includes(`import.meta.env.DEV ? ${factory}({`) && home.includes(`: (qaActionsOff() as ReturnType<typeof ${factory}>);`) && calls === 1,
    `${factory} runs only on the dev server`);
}
check(home.includes('import.meta.env.DEV ? buildCanonStoryQaFixture(basePlayer, studio, qaActors) : basePlayer'), 'the canon story fixture is built only on the dev server');

const dist = path.join(root, 'dist', 'assets');
const homeTime = fs.statSync(path.join(root, 'views/HomePage.tsx')).mtimeMs;
const jsFiles = fs.existsSync(dist) ? fs.readdirSync(dist).filter(f => f.endsWith('.js')) : [];
const fresh = jsFiles.length > 0 && jsFiles.every(f => fs.statSync(path.join(dist, f)).mtimeMs > homeTime);
if (!fresh) {
  console.log('note: no production build newer than HomePage.tsx in dist/, so the bundle itself was not checked (run npm run build first)');
} else {
  const bundle = jsFiles.map(f => fs.readFileSync(path.join(dist, f), 'utf8')).join('\n');
  // Text that the rest of the game also uses proves nothing, so only the tools' own text is looked for.
  const QA_FILES = ['services/canonStoryQa.ts', 'views/home/homeSocialQaActions.ts', 'views/home/homeProductionQaActions.ts', 'views/home/homeBoxOfficeQaActions.ts', 'views/home/homeStudioOwnershipQaActions.ts', 'views/home/homeStudioProductionQaActions.ts'];
  const sourceFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(entry.name) && rel !== path.join('views', 'HomePage.tsx') && !QA_FILES.includes(rel)) sourceFiles.push(rel);
    }
  };
  ['components', 'views', 'services', 'hooks', 'utils'].filter(d => fs.existsSync(path.join(root, d))).forEach(walk);
  const elsewhere = ['App.tsx', ...sourceFiles].map(rel => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  const secrets = [];
  for (const name of ['DEV_TOOLS_PASSCODE', 'EDITOR_TOOLS_PASSCODE', 'LEGACY_DEV_TOOLS_PASSCODES']) {
    const line = home.match(new RegExp(`^const ${name} = (.*)$`, 'm'));
    if (line) secrets.push(...[...line[1].matchAll(/'([^']{3,})'/g)].map(m => m[1]).filter(value => !elsewhere.includes(value)));
  }
  check(secrets.length > 0 && secrets.every(s => !bundle.includes(s)), `no passcode value in the production build (${secrets.length} checked)`);
  for (const label of ['Promo Control Room', 'Developer Tools']) check(!bundle.includes(label), `the production build has no '${label}'`);
  for (const rel of QA_FILES) {
    const code = fs.readFileSync(path.join(root, rel), 'utf8');
    const own = [...new Set([...code.matchAll(/'([^'\\\n]{24,})'/g)].map(m => m[1]))].filter(s => !home.includes(s) && !elsewhere.includes(s)).slice(0, 8);
    const hits = own.filter(s => bundle.includes(s)).length;
    check(own.length > 0 && hits === 0, `${rel}: none of its own strings in the production build (${own.length} checked)`);
  }
}
if (failures.length) { console.error(`FAIL dev tools in production: ${failures.length}`); process.exit(1); }
console.log('PASS dev tools in production');
