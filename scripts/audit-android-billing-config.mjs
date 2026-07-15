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

assertIncludes('Billing version', 'android/variables.gradle', "playBillingVersion = '9.1.0'");
assertIncludes('Billing dependency', 'android/app/build.gradle', 'implementation "com.android.billingclient:billing:$playBillingVersion"');
assertIncludes('Billing permission', 'android/app/src/main/AndroidManifest.xml', '<uses-permission android:name="com.android.vending.BILLING" />');
assertIncludes('Plugin source', 'android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java', '@CapacitorPlugin(name = "AndroidPurchases")');
assertIncludes('Plugin registration', 'android/app/src/main/java/com/zeeshapps/actorempire/MainActivity.java', 'registerPlugin(AndroidPurchasesPlugin.class);');
assertIncludes('Android product ids', 'services/iapService.ts', 'ANDROID_PRODUCT_IDS');
assertIncludes('Custom Android billing plugin is trusted on native builds', 'services/iapService.ts', "return isCapacitorAndroid() || Capacitor.isPluginAvailable('AndroidPurchases') ? AndroidPurchases : null;");
assertIncludes('Android Billing unavailable is player friendly', 'services/iapService.ts', 'Google Play Billing is unavailable on this device');
assertIncludes('Android store catalog copy exists', 'services/localization/locales/en.ts', "'store.premium.androidCatalog': 'Google Play purchase catalog.'");
assertIncludes('Store page uses Android catalog copy', 'views/StorePage.tsx', "isAndroidDevice ? tr('store.premium.androidCatalog')");
assertNotIncludes('No Blaze verifier import', 'services/iapService.ts', "from './androidPurchaseVerifier'");
assertNotIncludes('No Blaze verifier call', 'services/iapService.ts', 'verifyAndroidPurchase({');
assertIncludes('Android local purchase success', 'services/iapService.ts', 'Android purchase confirmed.');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('Android billing configuration audit passed.');
