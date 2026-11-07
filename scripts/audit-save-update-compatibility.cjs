// Real app update on a COPY of a closed QA profile. Never opens a personal profile.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = path.resolve(process.env.SAVE_UPDATE_SOURCE_PROFILE || '');
assert.ok(source.startsWith('/private/tmp/actor-week-soak-profile-'), 'A completed isolated QA career is required');
const out = path.resolve(process.env.SAVE_UPDATE_OUTPUT || 'output/playwright/save-update-compatibility');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync('/private/tmp/actor-save-update-profile-');
fs.cpSync(source, profile, { recursive: true });
fs.writeFileSync(out + '/test-profile.txt', profile);
const builds = { old: path.resolve(process.env.SAVE_UPDATE_OLD_DIST || ''), updated: path.resolve(process.env.SAVE_UPDATE_NEW_DIST || '') };
for (const dir of Object.values(builds)) assert.ok(fs.existsSync(dir + '/index.html'), 'Both frozen production builds are required');
let serving = 'old', context, page;
const rows = [], errors = [];
const expectedDurable = process.env.SAVE_UPDATE_EXPECTED_FACTS ? JSON.parse(fs.readFileSync(process.env.SAVE_UPDATE_EXPECTED_FACTS, 'utf8')) : null;
let checkedInterruptedSave = false;
const server = http.createServer((req, res) => {
    const root = builds[serving];
    let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) file = path.join(root, 'index.html');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
});
const read = () => page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('ActorEmpireDB', 1); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
        const db = open.result, tx = db.transaction('saves', 'readonly'), store = tx.objectStore('saves');
        const player = store.get('actorEmpireSave_3'), header = store.get('actorEmpireSave_3__integrity');
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => {
            db.close(); const p = player.result, m = header.result;
            const authored = JSON.stringify({ projects: p.pastProjects, archives: p.flags?.dynastyCareerArchives, legacy: p.flags?.legacyCareerArchive,
                posts: p.instagram?.posts, x: p.x?.posts, videos: p.youtube?.videos });
            crypto.subtle.digest('SHA-256', new TextEncoder().encode(authored)).then(hash => resolve({
                createdAt: m.createdAt, digest: m.digest, schema: m.digestSchemaVersion,
                facts: { name: p.name, money: p.money, age: p.age, week: p.currentWeek, protected: m.protected,
                    lastCinemaWeek: p.world.cinemaMarket?.lastProcessedAbsoluteWeek,
                    cinema: p.world.cinemaMarket?.titles, external: p.world.cinemaMarket?.externalProducerBalancesCents,
                    businesses: Object.fromEntries((p.businesses || []).map(b => [b.id, b.balance])),
                    npcCash: Object.fromEntries(Object.entries(p.world.studios || {}).map(([id, s]) => [id, s.cashReserve])),
                    talentIncome: Object.fromEntries(Object.entries(p.world.talentCareer?.profiles || {}).map(([id, t]) => [id, { income: t.income, backendIncome: t.backendIncome }])),
                    authoredSha256: Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join(''),
                    records: (p.pastProjects || []).map(x => x.id), posts: (p.instagram?.posts || []).map(x => x.id) },
            })).catch(reject);
        };
    };
}));
const exposed = async locator => {
    for (let i = 0; i < await locator.count(); i++) {
        const b = locator.nth(i);
        if (await b.isVisible() && await b.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === el || el.contains(hit); })) return b;
    }
};
const clearPrompts = async () => {
    for (let i = 0; i < 16; i++) {
        const feedback = await exposed(page.getByRole('button', { name: 'Continue', exact: true }));
        if (feedback) { await feedback.click(); continue; }
        const event = page.locator('div.fixed.inset-0').filter({ has: page.getByText(/^select action$/i) }).first();
        const choices = event.getByRole('button').filter({ hasNotText: /Watch Ad|PR Spin/i });
        const choice = await exposed(choices.filter({ hasText: /Politely Decline|Stay Neutral|Decline|Reject|Refuse|Ignore|Keep Quiet|No Thanks|Walk Away|Observe from Afar/i })) || await exposed(choices);
        if (choice) { rows.push({ eventChoice: await choice.innerText() }); await choice.click(); continue; }
        const later = await exposed(page.getByRole('button', { name: 'Later', exact: true }));
        if (later && await page.getByText('Treatment Needed', { exact: true }).isVisible()) { await later.click(); continue; }
        return;
    }
    throw Error('Normal prompts did not settle');
};
const open = async variant => {
    serving = variant;
    context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: ['--js-flags=--max-old-space-size=768'], viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page = context.pages()[0] || await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    const url = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', route => { const u = route.request().url(); return u.startsWith(url) || u.startsWith('data:') || u.startsWith('blob:') ? route.continue() : route.abort(); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const expected = fs.readFileSync(builds[variant] + '/index.html', 'utf8').match(/src="([^"]*\/index-[^"]+\.js)"/)[1];
    assert.ok(await page.locator(`script[src="${expected}"]`).count(), 'Actual browser must load the selected frozen build');
    const before = await read();
    if (expectedDurable && !checkedInterruptedSave) {
        assert.equal(before.facts.money, expectedDurable.cash, 'A resource-interrupted process preserves its last committed cash');
        assert.equal(before.facts.age, expectedDurable.age); assert.equal(before.facts.week, expectedDurable.week);
        assert.equal(before.facts.lastCinemaWeek, expectedDurable.processed);
        assert.deepEqual(Object.fromEntries(Object.entries(before.facts.cinema).map(([id, t]) => [id, t.grossCents])), expectedDurable.gross);
        assert.deepEqual(before.facts.records, expectedDurable.records); assert.deepEqual(before.facts.posts, expectedDurable.posts);
        checkedInterruptedSave = true; rows.push({ interruptedProcessLastCommittedFactsPreserved: true });
    }
    await page.locator('#startBtn').click();
    await page.locator('.slot-card').filter({ hasText: before.facts.name }).click();
    await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({ timeout: 60000 });
    assert.equal(await page.getByRole('dialog', { name: /Safe backup found|save.*error/i }).count(), 0);
    const loaded = await read(); assert.deepEqual(loaded.facts, before.facts, 'A fresh process/load cannot replay money or remove records');
    rows.push({ variant, entry: expected, loadedWeek: before.facts.lastCinemaWeek, reloadPreservesAllFacts: true });
    return before;
};
const saveThroughMenu = async () => {
    await clearPrompts(); const before = await read();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: /^Main Menu/i }).click();
    const until = Date.now() + 60000;
    while (Date.now() < until) {
        // A changed stored manifest is the barrier; navigation/empty write queues alone are insufficient.
        const after = await read();
        if (after.createdAt !== before.createdAt) { assert.deepEqual(after.facts, before.facts, 'Actual menu-triggered save preserves complete protected state and authored content'); return after; }
        await page.waitForTimeout(300);
    }
    throw Error('Menu departure did not produce an independently observed durable save');
};
(async () => {
    const origin = fs.readdirSync(path.join(profile, 'Default/IndexedDB')).map(x => x.match(/^http_127\.0\.0\.1_(\d+)\.indexeddb\.leveldb$/)).find(Boolean);
    assert.ok(origin); await new Promise(resolve => server.listen(Number(origin[1]), '127.0.0.1', resolve));
    try {
        await open('old'); const oldSaved = await saveThroughMenu(); await context.close();
        const newLoaded = await open('updated'); assert.deepEqual(newLoaded.facts, oldSaved.facts);
        const upgraded = await saveThroughMenu(); await context.close();
        assert.deepEqual(upgraded.facts, oldSaved.facts, 'New writer preserves old complete protected state and original authored content');
        const final = await open('old'); assert.deepEqual(final.facts, upgraded.facts, 'The previous installed reader can read the unchanged physical save layout');
        assert.deepEqual(errors, []);
        const result = { passed: true, scope: 'Old installed build -> updated build with actual durable UI save -> original reader; isolated retained career, not a phone/99-hour certification', oldSaveWritten: oldSaved.createdAt, upgradedSaveWritten: upgraded.createdAt, allProtectedFactsUnchanged: true, authoredContentUnchanged: true, originalReaderCompatible: true, records: final.facts.records.length, posts: final.facts.posts.length, rows, errors };
        fs.writeFileSync(out + '/results.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
    } catch (error) { fs.writeFileSync(out + '/failure.txt', String(error.stack) + '\n' + await page?.locator('body').innerText().catch(() => '')); throw error; }
    finally { await context?.close().catch(() => {}); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
