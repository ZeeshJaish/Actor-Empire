// Test-only instrumentation. No gameplay earnings claim or personal save access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { build, stop } = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = process.env.CINEMA_BROWSER_FIXTURE;
assert.ok(fixture, 'Retained signed fixture required');
const out = path.resolve(process.env.SAVE_PATH_OUTPUT || 'output/playwright/verified-save-path-profile');
fs.mkdirSync(out, { recursive: true });
const root = process.cwd();
const sourceRoot = process.env.SAVE_PATH_SOURCE_ROOT;
if (sourceRoot) assert.ok(fs.existsSync(path.join(sourceRoot, 'services/stableSaveHash.ts')), 'Frozen hash source must exist; never silently benchmark the current implementation');
const targets = {
    'services/saveIntegrity.ts': ['verifySaveIntegrity', 'createCheckedSaveIntegrityManifest', 'createProtectedState', 'studioCompanyState', 'industryIntelligenceState', 'worldEconomyState', 'userCareerRecordsState'],
    'services/stableSaveHash.ts': ['stableSaveHash'],
};
const timedSource = (text, names) => {
    for (const name of names) {
        const exported = text.includes('export const ' + name + ' =');
        const declaration = (exported ? 'export ' : '') + 'const ' + name + ' =';
        assert.ok(text.includes(declaration), 'Expected timing target ' + name);
        text = text.replace(declaration, 'const __original_' + name + ' =');
        text += `\n${exported ? 'export ' : ''}const ${name}: typeof __original_${name} = (...args) => {
            const at = performance.now();
            try { return __original_${name}(...args); }
            finally { (globalThis as any).__savePathRecord?.(${JSON.stringify(name)}, performance.now() - at); }
        };\n`;
    }
    return text;
};
(async () => {
    await build({ entryPoints: ['scripts/fixtures/saveBlocksBrowserFixture.ts'], bundle: true, platform: 'browser', format: 'esm',
        loader: { '.csv': 'text', '.css': 'empty' }, define: { 'import.meta.env': '{}' }, outfile: path.join(out, 'fixture.bundle'), logLevel: 'error',
        plugins: [{ name: 'test-only-save-cost-probes', setup(api) {
            api.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
                const relative = path.relative(root, args.path);
                const frozen = sourceRoot && path.join(sourceRoot, relative);
                let text = fs.readFileSync(frozen && fs.existsSync(frozen) ? frozen : args.path, 'utf8');
                if (targets[relative]) text = timedSource(text, targets[relative]);
                if (relative === 'scripts/fixtures/saveBlocksBrowserFixture.ts') text += '\nimport {prepareVerifiedPlayerForPersistence} from "../../services/savePreparation"; (window as any).saveBlocksQA.prepare = prepareVerifiedPlayerForPersistence;\n';
                return { contents: text, loader: relative.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
            });
        } }],
    });
    stop();
    const server = http.createServer((req, res) => {
        if (req.url === '/career.json') { res.setHeader('Content-Type', 'application/json'); fs.createReadStream(fixture).pipe(res); return; }
        res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html');
        res.end(req.url === '/fixture.js' ? fs.readFileSync(path.join(out, 'fixture.bundle')) : '<!doctype html><script type="module" src="/fixture.js"></script>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--js-flags=--max-old-space-size=768'] });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => !!window.saveBlocksQA);
        const result = await page.evaluate(async () => {
            let phase = 'setup', metrics = {};
            const record = (name, ms) => {
                if (phase === 'setup') return;
                const row = metrics[name] ||= { count: 0, totalMs: 0, maxMs: 0, firstCallsMs: [] };
                row.count++; row.totalMs += ms; row.maxMs = Math.max(row.maxMs, ms);
                if (name === 'verifySaveIntegrity' && row.firstCallsMs.length < 10) row.firstCallsMs.push(ms);
            };
            window.__savePathRecord = record;
            const txNative = IDBDatabase.prototype.transaction;
            IDBDatabase.prototype.transaction = function (...args) {
                const tx = txNative.apply(this, args), at = performance.now(), prefix = phase;
                tx.addEventListener('complete', () => { if (phase === prefix) record('tx_' + args[1], performance.now() - at); }, { once: true });
                return tx;
            };
            const putNative = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (value, key) {
                const at = performance.now();
                try { return putNative.call(this, value, key); }
                finally { record('put_sync_' + String(key).replace(/^actorEmpireSave_\d+/, 'slot'), performance.now() - at); }
            };
            const descriptor = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result');
            Object.defineProperty(IDBRequest.prototype, 'result', { ...descriptor, get() {
                const at = performance.now();
                const value = descriptor.get.call(this);
                if (this.source instanceof IDBObjectStore) record('result_deserialize', performance.now() - at);
                return value;
            } });
            const q = window.saveBlocksQA, pack = await (await fetch('/career.json')).json();
            let player = pack.player;
            await q.rawWrite(q.key, player); await q.rawWrite(q.key + '__integrity', pack.manifest);
            const rows = [];
            for (let i = 0; i < 3; i++) {
                player = { ...player, money: player.money + 10 };
                phase = 'prepare'; metrics = {}; let at = performance.now();
                const prepared = q.prepare(player, 'AUTOSAVE');
                const prepare = { elapsedMs: performance.now() - at, metrics };
                player = prepared.player;
                phase = 'save'; metrics = {}; at = performance.now();
                await q.saveVerifiedGameData(q.key, player, prepared.manifest);
                const save = { elapsedMs: performance.now() - at, metrics };
                phase = 'load'; metrics = {}; at = performance.now();
                const loaded = await q.loadVerifiedGameData(q.key);
                const load = { elapsedMs: performance.now() - at, metrics };
                phase = 'setup';
                if (loaded.status !== 'CURRENT' || loaded.player.money !== player.money || !q.verify(loaded.player, prepared.manifest).ok) throw Error('Profile roundtrip failed verification');
                rows.push({ iteration: i, prepare, save, load });
                phase = 'setup';
            }
            return { scope: 'Instrumented storage/preparation of retained large signed save; controlled +10 dollars per iteration, not gameplay or balance evidence', rows };
        });
        result.browser = browser.version();
        fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
        console.log(JSON.stringify(result.rows.map(row => ({ iteration: row.iteration, prepareMs: row.prepare.elapsedMs, saveMs: row.save.elapsedMs, loadMs: row.load.elapsedMs, saveMetrics: row.save.metrics }))));
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
