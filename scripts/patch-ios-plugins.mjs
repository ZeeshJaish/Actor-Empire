import fs from 'node:fs';

const configPath = new URL('../ios/App/App/capacitor.config.json', import.meta.url);
const viewControllerPath = new URL('../ios/App/App/ViewController.swift', import.meta.url);
const desiredPlugins = ['AdMobPlugin', 'PurchasesPlugin', 'TrackingPermissionPlugin'];
const desiredBridgeRegistrations = [
  'bridge?.registerPluginType(PurchasesPlugin.self)',
  'bridge?.registerPluginType(TrackingPermissionPlugin.self)'
];

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

try {
  let source = fs.readFileSync(viewControllerPath, 'utf8');
  let changed = false;

  if (!source.includes('import CapApp_SPM')) {
    source = source.replace('import Capacitor\n', 'import Capacitor\nimport CapApp_SPM\n');
    changed = true;
  }

  const missingRegistrations = desiredBridgeRegistrations.filter(registration => !source.includes(registration));
  if (missingRegistrations.length > 0) {
    const loadMethod = /override open func capacitorDidLoad\(\) \{\n\s*super\.capacitorDidLoad\(\)/;
    if (!loadMethod.test(source)) {
      source = source.replace(
        'class ViewController: CAPBridgeViewController {\n',
        `class ViewController: CAPBridgeViewController {\n    override open func capacitorDidLoad() {\n        super.capacitorDidLoad()\n        ${missingRegistrations.join('\n        ')}\n    }\n`
      );
    } else {
      source = source.replace(
        loadMethod,
        match => `${match}\n        ${missingRegistrations.join('\n        ')}`
      );
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(viewControllerPath, source);
    console.log('Patched iOS bridge plugin registration:', desiredBridgeRegistrations.join(', '));
  } else {
    console.log('iOS bridge plugin registration already includes:', desiredBridgeRegistrations.join(', '));
  }
} catch (error) {
  console.error('Failed to patch iOS bridge plugin registration:', error);
  process.exit(1);
}
