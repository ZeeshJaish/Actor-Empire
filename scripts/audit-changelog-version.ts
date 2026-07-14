import fs from 'node:fs';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import { CHANGELOG_ENTRIES, getLatestChangelogEntry } from '../services/changelog';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const latest = getLatestChangelogEntry();
assert(latest.version === APP_DISPLAY_VERSION, `latest changelog ${latest.version} does not match app version ${APP_DISPLAY_VERSION}`);
assert(APP_DISPLAY_VERSION === '1.0.22', `app version should be 1.0.22, got ${APP_DISPLAY_VERSION}`);
assert(CHANGELOG_ENTRIES.length >= 5, 'changelog should include current and legacy versions');

const seenVersions = new Set<string>();
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

const settingsPage = read('views/SettingsPage.tsx');
assert(settingsPage.includes("'CHANGELOG'"), 'SettingsPage must include CHANGELOG mode');
assert(settingsPage.includes('CHANGELOG_ENTRIES'), 'SettingsPage must render changelog entries');
assert(settingsPage.includes('getChangelogTypeLabel'), 'SettingsPage must show update type labels');

const app = read('App.tsx');
assert(app.includes('getLatestChangelogEntry'), 'App must render latest changelog in startup What\'s New');
assert(app.includes('previousChangelogEntries'), 'App must render previous updates in startup What\'s New');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.version === '1.0.22', 'package.json version must be 1.0.22');
assert(packageJson.scripts?.['audit:changelog-version'], 'package.json must expose audit:changelog-version');

const packageLock = JSON.parse(read('package-lock.json'));
assert(packageLock.version === '1.0.22', 'package-lock root version must be 1.0.22');
assert(packageLock.packages?.['']?.version === '1.0.22', 'package-lock package version must be 1.0.22');

const androidGradle = read('android/app/build.gradle');
assert(androidGradle.includes('versionCode 13'), 'Android versionCode must be 13');
assert(androidGradle.includes('versionName "1.0.22"'), 'Android versionName must be 1.0.22');

const androidMetadata = read('android/app/release/output-metadata.json');
assert(androidMetadata.includes('"versionCode": 13'), 'Android output metadata versionCode must be 13');
assert(androidMetadata.includes('"versionName": "1.0.22"'), 'Android output metadata versionName must be 1.0.22');

const iosProject = read('ios/App/App.xcodeproj/project.pbxproj');
assert((iosProject.match(/CURRENT_PROJECT_VERSION = 13;/g) || []).length >= 2, 'iOS build number must be 13');
assert((iosProject.match(/MARKETING_VERSION = 1.0.22;/g) || []).length >= 2, 'iOS marketing version must be 1.0.22');

console.log('Changelog and version audit passed.');
