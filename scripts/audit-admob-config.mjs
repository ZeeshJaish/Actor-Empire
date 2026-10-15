import fs from 'node:fs';

const read = path => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const checks = [];
const appSource = read('App.tsx');

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
assertIncludes(
  'Rewarded ad retry',
  'services/adLogic.ts',
  'for (let attempt = 0; attempt < 2; attempt += 1)'
);
assertIncludes(
  'Rewarded ad telemetry request',
  'App.tsx',
  "trackGameEvent('reward_ad_requested'"
);
assertIncludes(
  'Rewarded ad telemetry result',
  'App.tsx',
  "trackGameEvent('reward_ad_result'"
);

const rewardHandlerStart = appSource.indexOf('const handleTriggerRewardAd');
const rewardHandlerEnd = appSource.indexOf('const handleAdComplete', rewardHandlerStart);
const rewardHandler = appSource.slice(rewardHandlerStart, rewardHandlerEnd);
if (rewardHandlerStart < 0 || rewardHandlerEnd < 0 || /if\s*\([^)]*hasNoAds/.test(rewardHandler)) {
  checks.push('Reward claims must remain available after the No Ads purchase.');
}

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('AdMob configuration audit passed.');
