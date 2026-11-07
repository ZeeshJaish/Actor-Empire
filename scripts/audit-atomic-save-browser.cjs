const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { build, stop } = require('esbuild');
const out = path.resolve(process.env.SAVE_ATOMIC_OUTPUT || 'output/playwright/atomic-save');
fs.mkdirSync(out, { recursive: true });
(async () => {
    await build({ entryPoints: ['scripts/fixtures/saveAtomicBrowserFixture.ts'], bundle: true, platform: 'browser', format: 'esm', loader: { '.csv': 'text', '.css': 'empty' }, define: { 'import.meta.env': '{}' }, footer: { js: 'window.saveBlocksQA={runChecks:()=>window.atomicSaveQA.run()};' }, outfile: out + '/fixture.bundle', logLevel: 'error' });
    stop();
    const server = http.createServer((req, res) => { if (req.url === '/legacy.json') { res.setHeader('Content-Type', 'application/json'); res.end(fs.readFileSync('scripts/fixtures/saveArchiveSchema4Frozen.json')); return; } res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/fixture.js' ? fs.readFileSync(out + '/fixture.bundle') : '<!doctype html><script type="module" src="/fixture.js"></script>'); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    if (process.env.SAVE_ATOMIC_ENGINE === 'system-webkit') {
        try {
            const { spawn } = require('node:child_process');
            const child = spawn('xcrun', ['swift', '-module-cache-path', '/private/tmp/actor-save-path-20261030/swift-cache', 'scripts/audit-save-blocks-webkit.swift', 'http://127.0.0.1:' + server.address().port], { stdio: ['ignore', 'pipe', 'inherit'] });
            let stdout = ''; child.stdout.on('data', part => stdout += part);
            const code = await new Promise(resolve => child.once('close', resolve));
            if (code !== 0) throw Error('System WebKit atomic audit exited ' + code);
            const result = JSON.parse(stdout.trim());
            fs.writeFileSync(out + '/results.json', JSON.stringify({ passed: true, ...result }, null, 2)); console.log(stdout);
        } finally { server.close(); }
        return;
    }
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const browser = await chromium.launch({ channel: 'chromium', headless: true });
    try {
        const page = await browser.newPage(); await page.goto('http://127.0.0.1:' + server.address().port); await page.waitForFunction(() => !!window.atomicSaveQA);
        const rows = await page.evaluate(() => window.atomicSaveQA.run());
        fs.writeFileSync(out + '/results.json', JSON.stringify({ passed: true, browser: browser.version(), rows }, null, 2));
        console.log(JSON.stringify({ passed: true, checks: rows.length, rows }));
    } finally { await browser.close(); server.close(); }
})().catch(error => { fs.writeFileSync(out + '/failure.txt', String(error.stack)); console.error(error); process.exitCode = 1; });
