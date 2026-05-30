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

for (const required of [
  'accounts:signUp',
  'FIREBASE_AUTH_STORAGE_KEY',
  'createAnonymousAuthViaRest',
  'bootstrapFirebaseAuth',
  'firebaseAuthUserId',
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
