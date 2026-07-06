import fs from 'node:fs';

const read = path => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const checks = [];

const assertIncludes = (label, path, needle) => {
  const content = read(path);
  if (!content.includes(needle)) {
    checks.push(`${label}: expected ${path} to include ${needle}`);
  }
};

assertIncludes('Billing version', 'android/variables.gradle', "playBillingVersion = '9.1.0'");
assertIncludes('Billing dependency', 'android/app/build.gradle', 'implementation "com.android.billingclient:billing:$playBillingVersion"');
assertIncludes('Billing permission', 'android/app/src/main/AndroidManifest.xml', '<uses-permission android:name="com.android.vending.BILLING" />');
assertIncludes('Plugin source', 'android/app/src/main/java/com/zeeshapps/actorempire/AndroidPurchasesPlugin.java', '@CapacitorPlugin(name = "AndroidPurchases")');
assertIncludes('Plugin registration', 'android/app/src/main/java/com/zeeshapps/actorempire/MainActivity.java', 'registerPlugin(AndroidPurchasesPlugin.class);');
assertIncludes('Android product ids', 'services/iapService.ts', 'ANDROID_PRODUCT_IDS');
assertIncludes('Verification service', 'services/iapService.ts', "from './androidPurchaseVerifier'");
assertIncludes('Verification call', 'services/iapService.ts', 'verifyAndroidPurchase({');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('Android billing configuration audit passed.');
