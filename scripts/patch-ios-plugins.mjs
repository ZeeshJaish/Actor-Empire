import fs from 'node:fs';

const configPath = new URL('../ios/App/App/capacitor.config.json', import.meta.url);
const desiredPlugins = ['AdMobPlugin', 'PurchasesPlugin', 'TrackingPermissionPlugin'];

try {
  const raw = fs.readFileSync(configPath, 'utf8');
  const data = JSON.parse(raw);
  const current = Array.isArray(data.packageClassList) ? data.packageClassList : [];
  data.packageClassList = [...new Set([...current, ...desiredPlugins])];
  fs.writeFileSync(configPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log('Patched iOS Capacitor plugin list:', data.packageClassList.join(', '));
} catch (error) {
  console.error('Failed to patch iOS Capacitor plugin list:', error);
  process.exit(1);
}
