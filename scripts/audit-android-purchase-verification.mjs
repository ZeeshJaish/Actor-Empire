import fs from 'node:fs';

const read = path => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const checks = [];

const assertIncludes = (label, path, needle) => {
  const content = read(path);
  if (!content.includes(needle)) {
    checks.push(`${label}: expected ${path} to include ${needle}`);
  }
};

const assertNotIncludes = (label, path, needle) => {
  const content = read(path);
  if (content.includes(needle)) {
    checks.push(`${label}: expected ${path} not to include ${needle}`);
  }
};

assertIncludes('Verifier service import', 'services/iapService.ts', "from './androidPurchaseVerifier'");
assertIncludes('Android purchase verifier call', 'services/iapService.ts', 'verifyAndroidPurchase({');
assertIncludes('Android purchase token sent', 'services/iapService.ts', 'purchaseToken,');
assertIncludes('Android product id sent', 'services/iapService.ts', 'storeProductId,');
assertIncludes('Android premium product id sent', 'services/iapService.ts', 'premiumProductId: productId');
assertNotIncludes(
  'Token-only Android grant blocker removed',
  'services/iapService.ts',
  'Android purchase captured. Server verification is required before granting rewards.'
);

assertIncludes('Verifier module', 'services/androidPurchaseVerifier.ts', 'export const verifyAndroidPurchase');
assertIncludes('Verifier auth', 'services/androidPurchaseVerifier.ts', 'getFirebaseAuthForServerCall');
assertIncludes('Verifier sends purchase token', 'services/androidPurchaseVerifier.ts', 'purchaseToken');
assertIncludes('Verifier sends store product id', 'services/androidPurchaseVerifier.ts', 'storeProductId');
assertIncludes('Verifier sends premium product id', 'services/androidPurchaseVerifier.ts', 'premiumProductId');
assertIncludes('Verifier fail closed', 'services/androidPurchaseVerifier.ts', 'verified: false');
assertIncludes('Firebase auth helper', 'services/firebaseService.ts', 'getFirebaseAuthForServerCall');

assertIncludes('Firebase config', 'firebase.json', '"functions"');
assertIncludes('Functions package', 'functions/package.json', '"firebase-functions"');
assertIncludes('Functions Google API dependency', 'functions/package.json', '"googleapis"');
assertIncludes('Verifier function export', 'functions/src/index.ts', 'verifyAndroidPurchase');
assertIncludes('Package validation', 'functions/src/index.ts', 'com.zeeshapps.actorempire');
assertIncludes('Product map validation', 'functions/src/index.ts', 'ANDROID_PRODUCT_IDS');
assertIncludes('Google Play purchase lookup', 'functions/src/index.ts', 'purchases.products.get');
assertIncludes('Purchased state validation', 'functions/src/index.ts', 'purchaseState !== 0');
assertIncludes('Replay protection collection', 'functions/src/index.ts', 'androidPurchaseTokens');
assertIncludes('Replay protection transaction', 'functions/src/index.ts', 'runTransaction');
assertIncludes('Token hashing', 'functions/src/index.ts', 'createHash');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('Android purchase verification audit passed.');
