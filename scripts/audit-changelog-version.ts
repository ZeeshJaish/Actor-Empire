import fs from 'node:fs';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import { CHANGELOG_ENTRIES, getLatestChangelogEntry } from '../services/changelog';
import { INITIAL_PLAYER } from '../types';
import { migratePlayerSave } from '../services/saveMigration';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const latest = getLatestChangelogEntry();
assert(latest.version === APP_DISPLAY_VERSION, `latest changelog ${latest.version} does not match app version ${APP_DISPLAY_VERSION}`);
assert(APP_DISPLAY_VERSION === '1.0.25', `app version should be 1.0.25, got ${APP_DISPLAY_VERSION}`);
const expectedVersions = Array.from({ length: 26 }, (_, index) => `1.0.${25 - index}`);
assert(
  CHANGELOG_ENTRIES.map(entry => entry.version).join('|') === expectedVersions.join('|'),
  `changelog should include every version from 1.0.25 through 1.0.0 in order`,
);

const seenVersions = new Set<string>();
const entryText = (version: string) => {
  const entry = CHANGELOG_ENTRIES.find(item => item.version === version);
  assert(entry, `missing changelog entry ${version}`);
  return [
    entry.title,
    entry.summary,
    ...entry.sections.flatMap(section => [section.heading, ...section.items]),
  ].join('\n');
};

for (const entry of CHANGELOG_ENTRIES) {
  assert(!seenVersions.has(entry.version), `duplicate changelog version ${entry.version}`);
  seenVersions.add(entry.version);
  assert(['MAJOR', 'MINOR', 'PATCH'].includes(entry.type), `invalid changelog type for ${entry.version}`);
  assert(entry.title.trim().length > 0, `missing title for ${entry.version}`);
  assert(entry.summary.trim().length > 0, `missing summary for ${entry.version}`);
  assert(entry.sections.length > 0, `missing sections for ${entry.version}`);
  entry.sections.forEach(section => {
    assert(section.heading.trim().length > 0, `missing section heading for ${entry.version}`);
    assert(section.items.length > 0, `empty changelog section ${section.heading} for ${entry.version}`);
  });
}

assert(entryText('1.0.3').includes('Fixed the storage issue'), '1.0.3 should include the storage fix from release notes');
assert(entryText('1.0.4').includes('BAFTA Film Awards'), '1.0.4 should include the BAFTA award overhaul');
assert(entryText('1.0.5').includes('Guide App'), '1.0.5 should include the Guide App addition');
assert(entryText('1.0.7').includes('multi-save system'), '1.0.7 should include multi-save system notes');
assert(entryText('1.0.8').includes('black screen issue'), '1.0.8 should include black screen fix notes');
assert(entryText('1.0.10').includes('Processing Week'), '1.0.10 should include processing week hang safety');
assert(entryText('1.0.11').includes('recovery mode'), '1.0.11 should include save recovery notes');
assert(entryText('1.0.13').includes('personal loans'), '1.0.13 should include personal loans');
assert(entryText('1.0.15').includes('Luxe'), '1.0.15 should include Luxe upgrades');
assert(entryText('1.0.16').includes('iOS in-app purchases'), '1.0.16 should include iOS IAP fix');
assert(entryText('1.0.17').includes('Biopic'), '1.0.17 should include new genres and project types');
assert(entryText('1.0.18').includes('runaway streaming numbers'), '1.0.18 should include runaway streaming fix');
assert(entryText('1.0.23').includes('total time played'), '1.0.23 should include save-slot play time');
assert(!/loophole|box office/i.test(entryText('1.0.23')), '1.0.23 should describe player-facing changes without internal balancing details');
assert(entryText('1.0.24').includes('next-season package'), '1.0.24 should include linked series continuations');
assert(!/loophole|calculation|formula/i.test(entryText('1.0.24')), '1.0.24 should avoid exposing internal balancing details');
assert(entryText('1.0.25').includes('background casts'), '1.0.25 should include background cast planning');
assert(entryText('1.0.25').includes('refresh every three weeks'), '1.0.25 should include rotating crew markets');
assert(entryText('1.0.25').includes('stronger competition'), '1.0.25 should include tougher world competition');

const settingsPage = read('views/SettingsPage.tsx');
assert(settingsPage.includes("'CHANGELOG'"), 'SettingsPage must include CHANGELOG mode');
assert(settingsPage.includes('CHANGELOG_ENTRIES'), 'SettingsPage must render changelog entries');
assert(settingsPage.includes('getChangelogTypeLabel'), 'SettingsPage must show update type labels');
assert(settingsPage.includes('React.Fragment'), 'SettingsPage changelog details should render inline under the selected version');
assert(settingsPage.includes('renderChangelogDetails(entry)'), 'SettingsPage must expand selected changelog details directly below the version card');
assert(!settingsPage.includes('Sparkles'), 'SettingsPage changelog should not use the sparkle icon');
assert(!settingsPage.includes('Selected Version'), 'SettingsPage should not push changelog details to a separate bottom panel');
assert(settingsPage.includes("tr('settings.createMods')"), 'Mods Pack must include the locked Create Mods card');
assert(settingsPage.includes("tr('settings.comingFutureUpdates')"), 'Create Mods must show its future-update status');
assert(!settingsPage.includes("tr('settings.creatorPacks')"), 'Mods Pack must not show the old Creator Packs placeholder');
assert(!settingsPage.includes("tr('settings.gameplayRules')"), 'Mods Pack must not show the old Gameplay Rules placeholder');

const app = read('App.tsx');
assert(app.includes('getLatestChangelogEntry'), 'App must render latest changelog in startup What\'s New');
assert(app.includes('previousChangelogEntries'), 'App must render previous updates in startup What\'s New');

const startMenu = read('views/StartMenu.tsx');
assert(startMenu.includes('totalPlayTimeMs'), 'StartMenu must pass total play time to save slots');
const saveSlotScreen = read('components/SaveSlotScreen.tsx');
assert(saveSlotScreen.includes('formatTotalPlayTime'), 'SaveSlotScreen must format total play time');
assert(saveSlotScreen.includes('Clock3'), 'SaveSlotScreen must show a compact play-time icon');
assert(app.includes('visibilitychange'), 'App must pause play-time tracking when the game is backgrounded');
assert(app.includes('PLAYTIME_FLUSH_INTERVAL_MS'), 'App must periodically record active play time');

const missingPlayTime = migratePlayerSave({ ...INITIAL_PLAYER, totalPlayTimeMs: undefined } as any);
assert(missingPlayTime.totalPlayTimeMs === 0, 'old saves without play time must migrate to zero');
const invalidPlayTime = migratePlayerSave({ ...INITIAL_PLAYER, totalPlayTimeMs: -500 } as any);
assert(invalidPlayTime.totalPlayTimeMs === 0, 'invalid negative play time must be normalized');
const savedPlayTime = migratePlayerSave({ ...INITIAL_PLAYER, totalPlayTimeMs: 3_726_500 } as any);
assert(savedPlayTime.totalPlayTimeMs === 3_726_500, 'valid accumulated play time must survive migration');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.version === '1.0.25', 'package.json version must be 1.0.25');
assert(packageJson.scripts?.['audit:changelog-version'], 'package.json must expose audit:changelog-version');

const packageLock = JSON.parse(read('package-lock.json'));
assert(packageLock.version === '1.0.25', 'package-lock root version must be 1.0.25');
assert(packageLock.packages?.['']?.version === '1.0.25', 'package-lock package version must be 1.0.25');

const androidGradle = read('android/app/build.gradle');
assert(androidGradle.includes('versionCode 21'), 'Android versionCode must be 21');
assert(androidGradle.includes('versionName "1.0.25"'), 'Android versionName must be 1.0.25');

const androidMetadata = read('android/app/release/output-metadata.json');
assert(androidMetadata.includes('"versionCode": 21'), 'Android output metadata versionCode must be 21');
assert(androidMetadata.includes('"versionName": "1.0.25"'), 'Android output metadata versionName must be 1.0.25');

const iosProject = read('ios/App/App.xcodeproj/project.pbxproj');
assert((iosProject.match(/CURRENT_PROJECT_VERSION = 21;/g) || []).length >= 2, 'iOS build number must be 21');
assert((iosProject.match(/MARKETING_VERSION = 1.0.25;/g) || []).length >= 2, 'iOS marketing version must be 1.0.25');

console.log('Changelog and version audit passed.');
