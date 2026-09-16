import { spawnSync } from 'node:child_process';

const mandatory = [
  'audit:world-economy-we8-integrity',
  'audit:world-economy-we8-week-transaction',
  'audit:world-economy-we8-determinism',
  'audit:world-economy-we8-save',
  'audit:world-economy-we8-shocks',
  'audit:world-economy-we8-explanations',
  'audit:world-population-we1',
  'audit:world-audience-we2',
  'audit:world-audience-we3',
  'audit:world-streaming-we4',
  'audit:world-streaming-we5',
  'audit:world-streaming-we6',
  'audit:world-streaming-we7',
  'audit:save-migration',
  'audit:save-integrity',
  'audit:save-generations',
  'audit:large-save-integrity',
  'audit:late-game-week-performance',
  'audit:world-economy-we8-soak',
];

const startedAt = Date.now();
for (const script of mandatory) {
  console.log(`\n[WE8 release] ${script}`);
  const result = spawnSync('npm', ['run', script], { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[WE8 release] FAILED: ${script}`);
    process.exit(result.status || 1);
  }
}

console.log(JSON.stringify({
  status: 'PASS',
  evidenceClass: 'focused-node-release-gate',
  mandatoryChecks: mandatory.length,
  skippedMandatoryChecks: 0,
  durationSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
  note: 'Physical-device performance is intentionally reported separately and was not inferred from Node.',
}, null, 2));
