// Actual built application, continuous browser process, isolated disposable QA storage.
// No forced GC, patched gameplay state, fake payments, or personal save access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = process.env.CINEMA_BROWSER_FIXTURE;
assert.ok(fixture, 'A retained, signed career fixture is required');
const facts = JSON.parse(fs.readFileSync(fixture + '.facts.json', 'utf8'));
const out = path.resolve(process.env.CINEMA_BROWSER_OUTPUT || 'output/playwright/week-latency-soak');
fs.mkdirSync(out, { recursive: true });
const dist = path.resolve(process.env.SOAK_DIST || 'dist');
const minutes = Number(process.env.SOAK_MINUTES ?? 60);
const minimumWeeks = Number(process.env.SOAK_MIN_WEEKS ?? 50);
const cycleMs = Number(process.env.SOAK_CYCLE_MS ?? 60000);
const warmupWeeks = Number(process.env.SOAK_WARMUP_WEEKS ?? 6);
const reloadEvery = Number(process.env.SOAK_RELOAD_EVERY ?? 0);
const browserHeapMiB = Number(process.env.SOAK_BROWSER_HEAP_MIB ?? 768);
const browserChannel = process.env.SOAK_BROWSER_CHANNEL || 'chromium';
assert.ok(minutes >= 0 && minimumWeeks > 0 && cycleMs >= 1000);
assert.ok(browserHeapMiB >= 512 && browserHeapMiB <= 768, 'Keep the browser heap bounded');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
    let file = req.url === '/__qa_fixture.json' ? fixture : path.join(dist, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== fixture && !file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) file = path.join(dist, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
});
const observation = { minutesRequested: minutes, minimumWeeks, cycleMs, isolatedStorage: true, forcedGc: false,
    weeks: [], navigation: [], reloads: [], records: [], events: [], pageErrors: [], faults: [] };
const progress = () => fs.writeFileSync(out + '/progress.json', JSON.stringify(observation, null, 2));
let context, page, profile, cpu, probeTimer;
const configureLegacyCapabilities = async browserContext => {
    if (process.env.SOAK_LEGACY_CAPABILITIES !== '1') return;
    await browserContext.addInitScript(() => {
        delete globalThis.structuredClone;
        delete globalThis.PerformanceMark;
        delete Array.prototype.at;
        delete Object.hasOwn;
        delete String.prototype.replaceAll;
    });
};
const phase = name => { observation.phase = name; if (process.env.SOAK_MEMORY_PROBE === '1') progress(); };
const home = () => page.locator('[data-ui="actor-empire-home-overhaul"]');
const next = () => home().locator('[data-tutorial-id="home-next-week"]');
const exposedButton = async locator => {
    for (let n = 0; n < await locator.count(); n++) {
        const button = locator.nth(n);
        if (await button.isVisible() && await button.evaluate(el => {
            const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit === el || el.contains(hit);
        })) return button;
    }
    return null;
};
const clearPrompts = async () => {
    for (let i = 0; i < 16; i++) {
        // Visible medical/awards prompts can sit beneath a newer story. Use the
        // actual exposed button, without force clicks or changing modal state.
        const feedback = await exposedButton(page.getByRole('button', { name: 'Continue', exact: true }));
        if (feedback) { await feedback.click(); await page.waitForTimeout(150); continue; }
        const event = page.locator('div.fixed.inset-0').filter({ has: page.getByText(/^select action$/i) }).first();
        const buttons = event.getByRole('button').filter({ hasNotText: /Watch Ad|PR Spin/i });
        const safe = buttons.filter({ hasText: /Politely Decline|Stay Neutral|Decline|Reject|Refuse|Ignore|Keep Quiet|No Thanks|Walk Away|Observe from Afar/i });
        const choice = await exposedButton(safe) || await exposedButton(buttons);
        if (choice) { observation.events.push((await choice.innerText()).trim()); await choice.click(); await page.waitForTimeout(200); continue; }
        const skip = await exposedButton(page.getByTitle('Skip event', { exact: true }));
        if (skip) {
            await skip.click(); await page.getByRole('button', { name: /Leave Party.*Save/ }).click();
            observation.events.push('Skip optional awards event through its normal save button'); continue;
        }
        const clinic = await exposedButton(page.getByRole('button', { name: /Open Health Clinic/i }));
        if (clinic) {
            await clinic.click(); await treatClinic(); continue;
        }
        return;
    }
    throw Error('Normal event sequence did not settle');
};
const readManifest = () => page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('ActorEmpireDB', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
        const db = open.result, tx = db.transaction('saves', 'readonly'), r = tx.objectStore('saves').get('actorEmpireSave_3__integrity');
        tx.oncomplete = () => { const m = r.result; db.close(); resolve({ age: m.age, week: m.week, digest: m.digest, reason: m.reason }); };
        tx.onerror = () => reject(tx.error);
    };
}));
const readFacts = () => page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('ActorEmpireDB', 1); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
        const db = open.result, tx = db.transaction('saves', 'readonly'), r = tx.objectStore('saves').get('actorEmpireSave_3');
        tx.oncomplete = () => {
            const p = r.result;
            const data = { cash: p.money, age: p.age, week: p.currentWeek, processed: p.world.cinemaMarket.lastProcessedAbsoluteWeek,
                gross: Object.fromEntries(Object.entries(p.world.cinemaMarket.titles).map(([id, t]) => [id, t.grossCents])),
                records: (p.pastProjects || []).map(p => p.id), archives: JSON.stringify(p.flags?.dynastyCareerArchives || {}),
                posts: (p.instagram?.posts || []).map(p => p.id), health: p.stats.health,
                activeConditions: (p.activeHealthConditions || []).map(c => ({ id: c.conditionId, severity: c.severity })),
                clinicReadyAt: p.lifestyleActivities?.cooldowns?.wellness_reset || 0 };
            db.close(); resolve(data);
        }; tx.onerror = () => reject(tx.error);
    };
}));
const installObserver = async () => page.evaluate(() => {
    window.__soakPending = 0; window.__soakLastWrite = 0; window.__soakWeek = null;
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
        const tx = transaction.apply(this, args);
        if (this.name === 'ActorEmpireDB' && args[1] === 'readwrite') {
            window.__soakPending++;
            const done = () => { window.__soakPending--; window.__soakLastWrite = performance.now(); };
            tx.addEventListener('complete', done, { once: true }); tx.addEventListener('abort', done, { once: true });
        }
        return tx;
    };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
        const request = put.call(this, value, key);
        if (this.name === 'saves' && key === 'actorEmpireSave_3' && value?.world) {
            const snapshot = { age: value.age, week: value.currentWeek, cash: value.money, health: value.stats.health,
                activeConditions: (value.activeHealthConditions || []).map(c => ({ id: c.conditionId, severity: c.severity })),
                clinicReadyAt: value.lifestyleActivities?.cooldowns?.wellness_reset || 0 };
            // Retain only this tiny metadata copy, never the payload-bearing value.
            this.transaction.addEventListener('complete', () => {
                window.__soakCare = snapshot;
                if (window.__soakInteraction) window.__soakInteraction.committedAt = performance.now();
            }, { once: true });
        }
        return request;
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
        if (typeof key === 'string' && key.startsWith('actorEmpire.weekProcessingDebug')) {
            try { const r = JSON.parse(value); if (r.stage === 'success') window.__soakWeek = { elapsedMs: r.elapsed_ms, timeline: r.stage_timeline }; } catch {}
        }
        return set.call(this, key, value);
    };
});
const settle = async () => { await page.waitForTimeout(1100); await page.waitForFunction(() => window.__soakPending === 0 && performance.now() - window.__soakLastWrite > 300, undefined, { timeout: 60000 }); };
const returnFromClinic = async builderOpen => {
    const arrows = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    if (builderOpen) { const back = await exposedButton(arrows); assert.ok(back); await back.click(); }
    const back = await exposedButton(arrows); assert.ok(back); await back.click();
    await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Home"]').click();
    await home().waitFor();
};
const treatClinic = async () => {
    phase('clinic_open');
    await page.getByText('Health Clinic', { exact: true }).click();
    if (await page.getByRole('button', { name: /Try Later/i }).isVisible()) {
        observation.deferredClinic = (observation.deferredClinic || 0) + 1;
        await returnFromClinic(true); return;
    }
    for (const name of ['Medical Concierge', 'Advanced Treatment', 'Recovery Retreat'])
        await page.getByRole('button', { name: new RegExp(name, 'i') }).click();
    const confirm = page.getByRole('button', { name: /^Book Experience\s+Confirm Recovery/i });
    const beforeCareManifest = await readManifest();
    const paidPlan = await confirm.innerText();
    await confirm.click(); await confirm.waitFor({ state: 'hidden' });
    phase('clinic_result');
    const feedback = await exposedButton(page.getByRole('button', { name: 'Continue', exact: true }));
    if (feedback) await feedback.click();
    const close = await exposedButton(page.getByRole('button', { name: 'Close', exact: true }));
    if (close) await close.click();
    // Preparation and old-generation verification precede the first write tx.
    // A momentarily empty transaction counter does not prove the autosave finished.
    const deadline = performance.now() + 60000;
    let committedCare = false;
    let treated;
    while (performance.now() < deadline) {
        const manifest = await readManifest();
        if (manifest.digest !== beforeCareManifest.digest) {
            const savedCare = await page.evaluate(() => window.__soakCare);
            if (savedCare?.activeConditions.length === 0 && savedCare.age === manifest.age && savedCare.week === manifest.week) { committedCare = true; treated = savedCare; break; }
        }
        await page.waitForTimeout(250);
    }
    assert.ok(committedCare, 'Paid clinic changes must reach the verified durable save');
    phase('clinic_durable');
    await settle();
    assert.deepEqual(treated.activeConditions, [], 'Paid clinical care must clear the active condition through normal gameplay');
    observation.clinicCare = observation.clinicCare || [];
    observation.clinicCare.push({ paidPlan, cashAfter: treated.cash, healthAfter: treated.health, activeConditionsAfter: treated.activeConditions });
    await returnFromClinic(false);
};
const maintainCare = async () => {
    const care = await page.evaluate(() => window.__soakCare);
    if (!care?.activeConditions.length || care.clinicReadyAt > (care.age - 1) * 52 + care.week - 1) return;
    await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Lifestyle"]').click();
    await page.getByRole('button', { name: 'Activities', exact: true }).click();
    await treatClinic();
};
const checkRecords = (v, original) => {
    assert.equal(v.archives, original.archives, 'Existing dynasty archive content must survive');
    for (const id of original.records) assert.ok(v.records.includes(id), 'Missing existing career record ' + id);
    for (const id of original.posts) assert.ok(v.posts.includes(id), 'Missing authored post ' + id);
    for (const [id, gross] of Object.entries(original.gross)) assert.ok(v.gross[id] >= gross, 'Historical ticket gross decreased: ' + id);
};
const navigate = async name => {
    const button = page.locator('nav[aria-label="Primary game navigation"]').getByRole('button', { name, exact: true });
    await button.evaluate(el => el.addEventListener('click', () => {
        const start = performance.now(), target = 'actor-empire-' + el.getAttribute('aria-label').toLowerCase() + '-overhaul';
        window.__soakTap = null;
        const observe = () => document.querySelector('[data-ui="' + target + '"]')
            ? requestAnimationFrame(() => requestAnimationFrame(() => window.__soakTap = performance.now() - start)) : requestAnimationFrame(observe);
        requestAnimationFrame(observe);
    }, { once: true }));
    await button.click(); await page.waitForFunction(() => window.__soakTap !== null);
    observation.navigation.push({ name, ms: await page.evaluate(() => window.__soakTap) });
};
(async () => {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const url = 'http://127.0.0.1:' + server.address().port;
    profile = fs.mkdtempSync('/private/tmp/actor-week-soak-profile-');
    fs.writeFileSync(out + '/test-profile.txt', profile);
    context = await chromium.launchPersistentContext(profile, { channel: browserChannel, headless: true, args: ['--js-flags=--max-old-space-size=' + browserHeapMiB], viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await configureLegacyCapabilities(context);
    observation.browser = context.browser()?.version(); observation.node = process.version;
    observation.viewport = { width: 390, height: 844 }; observation.cpuThrottle = 'none';
    observation.reloadEvery = reloadEvery; observation.warmupWeeks = warmupWeeks;
    observation.browserHeapMiB = browserHeapMiB;
    observation.browserChannel = browserChannel;
    observation.legacyCapabilities = process.env.SOAK_LEGACY_CAPABILITIES === '1';
    observation.artifactIndex = fs.readFileSync(path.join(dist, 'index.html'), 'utf8').match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
    page = context.pages()[0] || await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', e => { observation.pageErrors.push(e.message); progress(); });
    await context.route('**/*', r => { const u = r.request().url(); return u.startsWith(url) || u.startsWith('data:') || u.startsWith('blob:') ? r.continue() : r.abort(); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(async () => {
        const pack = await (await fetch('/__qa_fixture.json')).json();
        await new Promise((resolve, reject) => {
            const open = indexedDB.open('ActorEmpireDB', 1); open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('saves')) open.result.createObjectStore('saves'); };
            open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('saves', 'readwrite'), s = tx.objectStore('saves'), key = 'actorEmpireSave_' + pack.slot; s.put(pack.player, key); s.put(pack.manifest, key + '__integrity'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
        });
        localStorage.setItem('actorEmpireSeenWhatsNewVersion', pack.version);
        localStorage.setItem('actorEmpire.saveSummary.v1.actorEmpireSave_' + pack.slot, JSON.stringify({ name: pack.player.name, age: pack.player.age, week: pack.player.currentWeek, fame: pack.player.stats.fame, totalPlayTimeMs: pack.player.totalPlayTimeMs || 0, savedAt: Date.now() }));
    });
    // Fixture installation is QA setup, not normal gameplay. Release its large
    // fetch/parse/IDB buffers by closing that process, then open the existing save
    // in a fresh process as a returning player would. Never restart during the
    // measured continuous session or force garbage collection.
    await context.close();
    context = await chromium.launchPersistentContext(profile, { channel: browserChannel, headless: true, args: ['--js-flags=--max-old-space-size=' + browserHeapMiB], viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await configureLegacyCapabilities(context);
    page = context.pages()[0] || await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', e => { observation.pageErrors.push(e.message); progress(); });
    await context.route('**/*', r => { const u = r.request().url(); return u.startsWith(url) || u.startsWith('data:') || u.startsWith('blob:') ? r.continue() : r.abort(); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    observation.seedBrowserClosedBeforeCareer = true;
    const slowdown = Number(process.env.SOAK_CPU_SLOWDOWN || 1);
    if (slowdown > 1) {
        cpu = await context.newCDPSession(page);
        await cpu.send('Emulation.setCPUThrottlingRate', { rate: slowdown });
        observation.cpuThrottle = slowdown + 'x emulation for gameplay (not physical device)';
    }
    if (process.env.SOAK_MEMORY_PROBE === '1') {
        cpu = await context.newCDPSession(page);
        const samples = [];
        probeTimer = setInterval(async () => {
            try { samples.push({ phase: observation.phase, at: Date.now(), ...(await cpu.send('Runtime.getHeapUsage')) }); fs.writeFileSync(out + '/memory-probe.json', JSON.stringify(samples, null, 2)); } catch {}
        }, 1000);
    }
    phase('career_enter');
    const enter = async () => { await page.locator('#startBtn').click(); await page.locator('.slot-card').filter({ hasText: facts.name }).click(); await home().waitFor({ timeout: 60000 }); await installObserver(); };
    await enter();
    if (await page.getByTitle('Skip event', { exact: true }).isVisible()) { await page.getByTitle('Skip event', { exact: true }).click(); await page.getByRole('button', { name: /Leave Party.*Save/ }).click(); }
    const loaded = await readFacts(); assert.equal(loaded.cash, facts.cash); observation.loaded = loaded;
    phase('career_loaded');
    await page.evaluate(data => { window.__soakCare = data; }, { age: loaded.age, week: loaded.week, cash: loaded.cash, health: loaded.health, activeConditions: loaded.activeConditions, clinicReadyAt: loaded.clinicReadyAt });
    await clearPrompts(); await maintainCare(); await settle();
    const original = await readFacts(); observation.initial = original; checkRecords(original, loaded);
    phase('career_ready');
    if (process.env.SOAK_DISCOVER_CLINIC === '1') {
        await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Lifestyle"]').click();
        await page.getByRole('button', { name: 'Activities', exact: true }).click();
        await treatClinic();
        fs.writeFileSync(out + '/clinic-care.json', JSON.stringify(observation.clinicCare, null, 2));
        return;
    }
    cpu ||= await context.newCDPSession(page); await cpu.send('Performance.enable');
    const start = Date.now(), startedMono = performance.now(); observation.startedAt = new Date(start).toISOString(); let count = 0;
    while (performance.now() - startedMono < minutes * 60000 || count < minimumWeeks) {
        const cycleStart = Date.now(); await clearPrompts(); await maintainCare(); await settle();
        const before = await readManifest(); await next().waitFor();
        await page.waitForTimeout(600);
        phase('weekly_turn');
        const expectedWeek = before.week % 52 + 1;
        await next().evaluate((button, week) => {
            button.addEventListener('click', () => {
                const timing = window.__soakInteraction = { clickedAt: performance.now(), clickedEpoch: Date.now() };
                let scheduled = false;
                const observer = new MutationObserver(() => {
                    const home = document.querySelector('[data-ui="actor-empire-home-overhaul"]');
                    const next = home?.querySelector('[data-tutorial-id="home-next-week"]');
                    if (scheduled || !next || next.disabled || home.querySelector('.ae-next')?.textContent.trim() !== 'W ' + (week % 52 + 1)) return;
                    scheduled = true; observer.disconnect();
                    requestAnimationFrame(() => requestAnimationFrame(() => { timing.paintedAt = performance.now(); }));
                });
                observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
            }, { once: true, capture: true });
        }, expectedWeek);
        if (process.env.SOAK_CPU_PROFILE === '1' && count === 0) {
            await cpu.send('Profiler.enable'); await cpu.send('Profiler.start');
        }
        const at = Date.now(); if (count === 0) await next().dblclick({ delay: 25 }); else await next().click();
        await page.waitForFunction(w => document.querySelector('[data-ui="actor-empire-home-overhaul"] .ae-next')?.textContent.trim() === 'W ' + (w % 52 + 1), expectedWeek, { timeout: 60000 });
        await page.locator('[data-ui="actor-empire-home-overhaul"] [data-tutorial-id="home-next-week"]:not([disabled])').waitFor({ timeout: 60000 });
        const ms = Date.now() - at, manifest = await readManifest();
        await page.waitForFunction(() => !!window.__soakInteraction?.paintedAt, undefined, { timeout: 60000 });
        const interaction = await page.evaluate(() => {
            const t = window.__soakInteraction;
            return { clickedEpoch: t.clickedEpoch, tapToPaintMs: t.paintedAt - t.clickedAt,
                tapToDurableMs: t.committedAt - t.clickedAt, durableToPaintMs: t.paintedAt - t.committedAt };
        });
        interaction.commandToClickMs = interaction.clickedEpoch - at;
        assert.ok(Number.isFinite(interaction.tapToDurableMs) && interaction.tapToDurableMs >= 0);
        assert.ok(interaction.durableToPaintMs >= 0, 'The ready screen must paint after the actual current-save transaction commits');
        if (process.env.SOAK_CPU_PROFILE === '1' && count === 0) {
            fs.writeFileSync(out + '/actual-week.cpuprofile', JSON.stringify((await cpu.send('Profiler.stop')).profile));
        }
        assert.equal(manifest.week, expectedWeek); assert.equal(manifest.age, before.age + (before.week === 52 ? 1 : 0)); assert.ok(manifest.digest);
        count++;
        const metrics = Object.fromEntries((await cpu.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
        observation.weeks.push({ count, elapsedMs: performance.now() - startedMono, ms, interaction, age: manifest.age, week: manifest.week, jsHeapUsed: metrics.JSHeapUsedSize, jsHeapTotal: metrics.JSHeapTotalSize, nodes: metrics.Nodes, stage: await page.evaluate(() => window.__soakWeek) });
        await clearPrompts(); await maintainCare(); await settle();
        for (const name of ['Career', 'Lifestyle', 'Home']) await navigate(name);
        if (count % 10 === 0 || count === minimumWeeks) {
            const v = await readFacts(); checkRecords(v, original); assert.equal(v.processed, original.processed + count);
            observation.records.push({ count, records: v.records.length, cash: v.cash, processed: v.processed });
            await page.screenshot({ path: out + '/week-' + count + '.png' });
            await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Mobile"]').click();
            await page.getByText('BoxOffice', { exact: true }).click();
            await page.getByRole('button', { name: 'Back to phone', exact: true }).click();
            await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Home"]').click();
            await home().waitFor();
        }
        if (reloadEvery > 0 && count % reloadEvery === 0) {
            await settle(); const beforeReload = await readFacts(); await page.reload({ waitUntil: 'networkidle', timeout: 60000 }); await enter();
            const after = await readFacts(); assert.deepEqual(after, beforeReload, 'Normal reload must not lose records or repeat payments');
            observation.reloads.push({ count, cash: after.cash, processed: after.processed });
            await cpu.detach(); cpu = await context.newCDPSession(page); await cpu.send('Performance.enable');
        }
        observation.elapsedMs = performance.now() - startedMono; progress();
        console.log(JSON.stringify({ week: count, minutes: +(observation.elapsedMs / 60000).toFixed(2), ms, heapMiB: +(metrics.JSHeapUsedSize / 1048576).toFixed(1) }));
        const remaining = count < warmupWeeks ? 0 : Math.min(cycleMs - (Date.now() - cycleStart), minutes * 60000 - (performance.now() - startedMono));
        if (remaining > 0) await page.waitForTimeout(remaining);
    }
    await clearPrompts(); await settle(); const final = await readFacts(); checkRecords(final, original); assert.equal(final.processed, original.processed + count);
    observation.elapsedMs = performance.now() - startedMono; observation.final = final;
    assert.ok(observation.elapsedMs >= minutes * 60000); assert.ok(count >= minimumWeeks); assert.deepEqual(observation.pageErrors, []);
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 }); await enter();
    const afterFinalReload = await readFacts(); assert.deepEqual(afterFinalReload, final, 'Final normal reload must preserve the entire tracked career and pay nothing twice');
    observation.reloads.push({ count, cash: afterFinalReload.cash, processed: afterFinalReload.processed, final: true });
    await page.screenshot({ path: out + '/final-home.png' });
    fs.writeFileSync(out + '/results.json', JSON.stringify(observation, null, 2)); console.log(JSON.stringify({ passed: true, minutes: observation.elapsedMs / 60000, weeks: count }));
})().catch(async e => {
    observation.failure = String(e.stack); progress(); fs.writeFileSync(out + '/failure.txt', String(e.stack) + '\n' + await page?.locator('body').innerText().catch(() => ''));
    await page?.screenshot({ path: out + '/failure.png' }).catch(() => {}); process.exitCode = 1;
}).finally(async () => {
    clearInterval(probeTimer);
    await context?.close().catch(() => {}); server.close();
    // Retain isolated evidence/profile after both success and failure for explicit later inspection.
});
