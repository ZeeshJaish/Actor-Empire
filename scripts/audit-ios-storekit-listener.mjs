import fs from 'node:fs';

const read = path => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const checks = [];

const assertIncludes = (label, path, needle) => {
  const content = read(path);
  if (!content.includes(needle)) {
    checks.push(`${label}: expected ${path} to include ${needle}`);
  }
};

const swiftPlugin = 'ios/App/CapApp-SPM/Sources/CapApp-SPM/PurchasesPlugin.swift';
const iapService = 'services/iapService.ts';
const app = 'App.tsx';

assertIncludes('StoreKit update task is retained', swiftPlugin, 'private var transactionUpdatesTask');
assertIncludes('StoreKit listener starts on plugin load', swiftPlugin, 'public override func load()');
assertIncludes('StoreKit transaction updates are observed', swiftPlugin, 'Transaction.updates');
assertIncludes('Verified updates are handled centrally', swiftPlugin, 'handleTransactionUpdate');
assertIncludes('Completed StoreKit updates notify JS', swiftPlugin, 'notifyListeners("purchaseCompleted"');
assertIncludes('Completed StoreKit events survive startup timing', swiftPlugin, 'retainUntilConsumed: true');
assertIncludes('Verified StoreKit transactions are finished', swiftPlugin, 'await transaction.finish()');

assertIncludes('iOS purchase update event type is exposed', iapService, 'export interface IOSPurchaseUpdate');
assertIncludes('Store product IDs map back to premium IDs', iapService, 'getPremiumProductIdForIOSStoreProduct');
assertIncludes('Purchases plugin exposes purchaseCompleted listener', iapService, "addListener(eventName: 'purchaseCompleted'");
assertIncludes('JS starts iOS purchase update listener', iapService, 'startIOSPurchaseUpdatesListener');
assertIncludes('Direct iOS purchase returns transaction id', iapService, 'transactionId: result?.transactionId');

assertIncludes('App imports iOS purchase listener', app, 'startIOSPurchaseUpdatesListener');
assertIncludes('App records processed iOS transactions', app, 'processedIOSStoreTransactionIds');
assertIncludes('App skips duplicate transaction grants', app, 'hasProcessedStoreTransaction');
assertIncludes('App listens for late iOS purchases', app, 'startIOSPurchaseUpdatesListener(update =>');
assertIncludes('App applies late iOS purchases', app, 'applyPremiumPurchase(p, update.premiumProductId');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('iOS StoreKit transaction listener audit passed.');
