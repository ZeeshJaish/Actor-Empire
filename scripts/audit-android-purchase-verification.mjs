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

assertNotIncludes('Verifier service import removed', 'services/iapService.ts', "from './androidPurchaseVerifier'");
assertNotIncludes('Android verifier call removed', 'services/iapService.ts', 'verifyAndroidPurchase({');
assertNotIncludes('Server verification failure message removed', 'services/iapService.ts', 'Android purchase verification');
assertIncludes('Android purchase token still required', 'services/iapService.ts', 'if (!purchaseToken)');
assertIncludes('Android purchase finalized before reward', 'services/iapService.ts', 'await finishAndroidPurchase(purchases, productId, purchase);');
assertIncludes('Android purchase returns success from Play result', 'services/iapService.ts', 'Android purchase confirmed.');
assertIncludes('Android restore no longer calls server', 'services/iapService.ts', 'Android purchases restored.');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('Android no-Blaze purchase audit passed.');
