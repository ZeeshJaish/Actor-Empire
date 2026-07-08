import fs from 'node:fs';

const read = path => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const checks = [];

const assertIncludes = (label, path, needle) => {
  const content = read(path);
  if (!content.includes(needle)) {
    checks.push(`${label}: expected ${path} to include ${needle}`);
  }
};

assertIncludes(
  'Android AdMob app id',
  'android/app/src/main/AndroidManifest.xml',
  'ca-app-pub-1351550313263506~2378828856'
);
assertIncludes(
  'Android rewarded ad unit',
  'services/adLogic.ts',
  "rewarded: 'ca-app-pub-1351550313263506/5572922698'"
);
assertIncludes(
  'Android interstitial ad unit',
  'services/adLogic.ts',
  "interstitial: 'ca-app-pub-1351550313263506/9957935970'"
);
assertIncludes(
  'Direct AdMob plugin import',
  'services/adLogic.ts',
  "import { AdMob } from '@capacitor-community/admob';"
);

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('AdMob configuration audit passed.');
