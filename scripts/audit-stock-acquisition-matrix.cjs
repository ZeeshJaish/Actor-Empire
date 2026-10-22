const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const output = process.env.STOCK_FLOW_MATRIX_OUTPUT || '/private/tmp/stock-acquisition-matrix-final';
fs.mkdirSync(output, { recursive: true });
const cases = [
  ['fresh-paramount-50', { STOCK_FLOW_STUDIO: 'PARAMOUNT', STOCK_FLOW_PERCENT: '50' }],
  ['fresh-paramount-51', { STOCK_FLOW_STUDIO: 'PARAMOUNT', STOCK_FLOW_PERCENT: '51' }],
  ['fresh-paramount-100', { STOCK_FLOW_STUDIO: 'PARAMOUNT', STOCK_FLOW_PERCENT: '100' }],
  ['fresh-warner-51', { STOCK_FLOW_STUDIO: 'WARNER_BROS', STOCK_FLOW_PERCENT: '51' }],
  ['fresh-universal-51', { STOCK_FLOW_STUDIO: 'UNIVERSAL', STOCK_FLOW_PERCENT: '51' }],
  ['fresh-paramount-real-debt', { STOCK_FLOW_STUDIO: 'PARAMOUNT', STOCK_FLOW_DEBT_MILLIONS: '500' }],
  ['legacy-counter', { STOCK_FLOW_SCENARIO: 'countered' }],
  ['legacy-rejection', { STOCK_FLOW_STUDIO: 'UNIVERSAL', STOCK_FLOW_SCENARIO: 'rejected' }],
  ['legacy-accepted', { STOCK_FLOW_SCENARIO: 'accepted' }],
  ['legacy-draft-100', { STOCK_FLOW_SCENARIO: 'draft', STOCK_FLOW_PERCENT: '100' }],
  ['low-energy', { STOCK_FLOW_SCENARIO: 'draft', STOCK_FLOW_ENERGY: '0' }],
  ['stale-signing-debt-reload', { STOCK_FLOW_SCENARIO: 'draft', STOCK_FLOW_STALE_SIGNING: '1' }],
  ['repaired-quote-disclosure', { STOCK_FLOW_SCENARIO: 'repairedQuote' }],
  ['sx-wallet', { STOCK_FLOW_SCENARIO: 'sxWallet' }],
];
const sources = ['types.ts', 'App.tsx', 'views/mobile/MobilePage.tsx', 'views/mobile/components/ForbesStudioProfile.tsx', 'views/mobile/ForbesApp.tsx', 'views/mobile/StocksApp.tsx', 'views/mobile/components/StudioAcquisitionDesk.tsx', 'views/mobile/components/StudioAcquisitionDealRoom.tsx', 'components/StockControlEventModal.tsx', 'services/studioAcquisition.ts', 'services/publicStockControl.ts', 'services/acquisitionSigningQuote.ts', 'services/stockTakeover.ts', 'services/stockControlNotices.ts', 'services/stockLogic.ts', 'services/stockCashOwnership.ts', 'services/stockSettlement.ts', 'services/stockValuation.ts', 'services/stockMarketClock.ts', 'services/saveMigration.ts', 'services/stockSaveCompatibility.ts', 'services/saveIntegrity.ts', 'services/saveGenerations.ts', 'services/storage.ts', 'services/forbesStudioProfile.ts', 'services/studioEcosystem.ts', 'services/gameLoop.ts', 'services/shareholderVoting.ts', 'services/industryWorld/studioOwnershipMaterializer.ts', 'services/studioAi/studioAiFinance.ts', 'services/savePreparation.ts', 'lab/stockAcquisitionSafety.tsx'];
const hashes = () => Object.fromEntries(sources.filter(file => fs.existsSync(file)).map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const report = { kind: 'FOURTEEN_SYNTHETIC_BROWSER_CONTEXTS_REAL_COMPONENTS_AND_STORAGE', sourceBefore: hashes(), cases: [] };
const write = () => fs.writeFileSync(path.join(output, 'matrix.json'), JSON.stringify(report, null, 2));
(async () => {
  for (const [name, config] of cases) {
    const folder = path.join(output, name); fs.mkdirSync(folder, { recursive: true });
    const log = fs.createWriteStream(path.join(folder, 'run.log'));
    console.log('BROWSER_CASE', name);
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'audit-stock-acquisition-flow-browser.cjs')], { env: { ...process.env, ...config, STOCK_FLOW_OUTPUT: folder }, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
      child.on('error', reject); child.on('exit', code => { log.end(); resolve(code); });
    });
    const result = JSON.parse(fs.readFileSync(path.join(folder, 'results.json'), 'utf8'));
    report.cases.push({ name, exitCode: code, status: result.status, steps: result.steps.length, errors: result.errors, failure: result.failure }); write();
    if (code !== 0) throw new Error('Browser case failed: ' + name + ' — ' + result.failure);
  }
  report.sourceAfter = hashes(); report.sourcesUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  if (!report.sourcesUnchanged) throw new Error('Source changed during browser verification; restart Vite and rerun on stable sources.');
  report.status = 'PASSED'; write(); console.log('All 14 stock-acquisition browser scenarios passed with unchanged sources.');
})().catch(error => { report.status = 'FAILED'; report.failure = String(error); report.sourceAfter = hashes(); write(); console.error(error); process.exitCode = 1; });
