import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const projectPath = 'ios/App/App.xcodeproj/project.pbxproj';
const project = readFileSync(projectPath, 'utf8');
const failures = [];

const requiredInputPaths = [
  '${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}',
  '${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${PRODUCT_NAME}',
  '${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Info.plist',
  '$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/GoogleService-Info.plist',
  '$(TARGET_BUILD_DIR)/$(EXECUTABLE_PATH)',
  '${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${PRODUCT_NAME}.debug.dylib',
];

const nativeTargetMatch = project.match(/\/\* App \*\/ = \{\s*isa = PBXNativeTarget;([\s\S]*?)\n\s*\};/);
const targetBuildPhases = nativeTargetMatch?.[1].match(/buildPhases = \(([\s\S]*?)\);/)?.[1] ?? '';

if (!nativeTargetMatch) failures.push('App native target could not be located');
if (!project.includes('isa = PBXShellScriptBuildPhase;')) {
  failures.push('Crashlytics shell-script build phase is missing');
}
if (!project.includes('/* Upload Crashlytics Symbols */')) {
  failures.push('Upload Crashlytics Symbols build phase is missing');
}
if (!project.includes('SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run')) {
  failures.push('Crashlytics Swift Package Manager run script is missing');
}
if (!project.includes('alwaysOutOfDate = 1;')) {
  failures.push('Crashlytics upload phase must explicitly run on every build');
}

for (const inputPath of requiredInputPaths) {
  if (!project.includes(`"${inputPath}"`)) {
    failures.push(`Crashlytics build phase is missing input path: ${inputPath}`);
  }
}

const orderedPhases = targetBuildPhases
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean);
if (!orderedPhases.at(-1)?.includes('Upload Crashlytics Symbols')) {
  failures.push('Crashlytics symbol upload must be the App target\'s final build phase');
}

if (!project.includes('DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";')) {
  failures.push('Release builds are not configured to generate a dSYM');
}
if (!project.includes('ENABLE_USER_SCRIPT_SANDBOXING = YES;')) {
  failures.push('The audit expects Xcode user-script sandboxing to remain enabled');
}

const archiveArgumentIndex = process.argv.indexOf('--archive');
if (archiveArgumentIndex !== -1) {
  const archivePath = process.argv[archiveArgumentIndex + 1];
  if (!archivePath) {
    failures.push('--archive requires a path to an .xcarchive');
  } else {
    const archiveInfo = path.join(archivePath, 'Info.plist');
    const appDsym = path.join(archivePath, 'dSYMs', 'App.app.dSYM');
    const appDwarf = path.join(appDsym, 'Contents', 'Resources', 'DWARF', 'App');

    if (!existsSync(archivePath) || !statSync(archivePath).isDirectory()) {
      failures.push(`Archive does not exist: ${archivePath}`);
    }
    if (!existsSync(archiveInfo)) failures.push(`Archive Info.plist is missing: ${archiveInfo}`);
    if (!existsSync(appDsym)) failures.push(`App dSYM is missing: ${appDsym}`);
    if (!existsSync(appDwarf)) failures.push(`App dSYM binary is missing: ${appDwarf}`);

    if (existsSync(appDsym)) {
      try {
        const uuidOutput = execFileSync('dwarfdump', ['--uuid', appDsym], { encoding: 'utf8' }).trim();
        if (!/^UUID: [0-9A-F-]+ \([^)]+\) /m.test(uuidOutput)) {
          failures.push(`Archive dSYM has no readable UUID: ${appDsym}`);
        } else {
          console.log(uuidOutput);
        }
      } catch (error) {
        failures.push(`Unable to read archive dSYM UUID: ${error.message}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('iOS crash-symbol audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('iOS crash-symbol audit passed.');
