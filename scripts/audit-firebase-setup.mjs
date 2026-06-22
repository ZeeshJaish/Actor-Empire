import { readFileSync } from 'node:fs';

const files = [
  'package.json',
  'services/firebaseService.ts',
  'android/capacitor.settings.gradle',
  'android/app/capacitor.build.gradle',
  'ios/App/CapApp-SPM/Package.swift',
];

const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (/remote-config|RemoteConfig/i.test(content)) {
    failures.push(`${file} still references Remote Config`);
  }
}

const firebaseService = readFileSync('services/firebaseService.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const indexSource = readFileSync('index.tsx', 'utf8');
const capacitorConfig = readFileSync('capacitor.config.ts', 'utf8');
const androidServices = JSON.parse(readFileSync('android/app/google-services.json', 'utf8'));
const iosServices = readFileSync('ios/App/App/GoogleService-Info.plist', 'utf8');
const iosProject = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
const expectedBundleId = 'com.zeeshapps.actorempire';
const expectedProjectId = 'actor-empire-1ff1d';

for (const dependency of [
  '@capacitor-firebase/analytics',
  '@capacitor-firebase/crashlytics',
  '@capacitor-firebase/messaging',
  '@capacitor-firebase/performance',
]) {
  if (!packageJson.dependencies?.[dependency]) failures.push(`package.json is missing ${dependency}`);
}

if (!indexSource.includes('void bootstrapFirebase();') || !indexSource.includes('installGlobalTelemetryHandlers();')) {
  failures.push('index.tsx does not bootstrap Firebase and global telemetry handlers');
}

if (!capacitorConfig.includes(`appId: '${expectedBundleId}'`)) {
  failures.push(`Capacitor appId does not match ${expectedBundleId}`);
}

const androidClient = androidServices.client?.find(client =>
  client.client_info?.android_client_info?.package_name === expectedBundleId
);
if (androidServices.project_info?.project_id !== expectedProjectId || !androidClient) {
  failures.push('Android google-services.json does not match the Actor Empire Firebase app');
}

if (!iosServices.includes(`<string>${expectedBundleId}</string>`) || !iosServices.includes(`<string>${expectedProjectId}</string>`)) {
  failures.push('iOS GoogleService-Info.plist does not match the Actor Empire Firebase app');
}

if (!iosProject.includes('GoogleService-Info.plist in Resources')) {
  failures.push('GoogleService-Info.plist is not included in the iOS Resources build phase');
}

for (const required of [
  'accounts:signUp',
  'FIREBASE_AUTH_STORAGE_KEY',
  'createAnonymousAuthViaRest',
  'bootstrapFirebaseAuth',
  'firebaseAuthUserId',
  'FirebaseAnalytics.setEnabled',
  'FirebaseCrashlytics.setEnabled',
  'FirebasePerformance.setEnabled',
  'bootstrapPushMessaging',
  'submitIssueReportToFirestore',
]) {
  if (!firebaseService.includes(required)) {
    failures.push(`services/firebaseService.ts is missing ${required}`);
  }
}

if (!firebaseService.includes('FirebaseAnalytics.setUserId({ userId: firebaseAuthUserId })')) {
  failures.push('anonymous auth UID is not attached to Analytics');
}

if (!firebaseService.includes('FirebaseCrashlytics.setUserId({ userId: firebaseAuthUserId })')) {
  failures.push('anonymous auth UID is not attached to Crashlytics');
}

if (failures.length) {
  console.error('Firebase setup audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Firebase setup audit passed');
