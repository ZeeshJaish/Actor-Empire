import fs from 'node:fs';

const source = fs.readFileSync('views/StorePage.tsx', 'utf8');
const checks = [];

const expectIncludes = (label, needle) => {
  if (!source.includes(needle)) checks.push(`${label}: expected StorePage.tsx to include ${needle}`);
};

expectIncludes('Capacitor platform import', "import { Capacitor } from '@capacitor/core';");
expectIncludes('Native platform detection', 'Capacitor.isNativePlatform()');
expectIncludes('Android platform detection', "Capacitor.getPlatform() === 'android'");
expectIncludes('Premium store Android gate', 'isAndroidDevice');
expectIncludes('Premium store native gate', 'isIOSDevice || isAndroidDevice || import.meta.env.DEV');
expectIncludes('Store catalog fetch remains gated', 'if (!showPremiumStore) return;');

if (checks.length > 0) {
  console.error(checks.join('\n'));
  process.exit(1);
}

console.log('Android premium store audit passed.');
