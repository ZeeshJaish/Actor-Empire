// Disposable browser lab. Does not read or write career/save storage.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import { filedMarketFixture } from '../helpers/streamingFiledMarketFixture';
import { getContentMarketListings, purchaseContentMarketListing } from '../../services/streamingContentMarket';

const makePlayer = () => {
    const player = filedMarketFixture();
    const listing = getContentMarketListings(player)[0];
    const purchased = purchaseContentMarketListing(player, listing.id, listing.signature);
    if (!purchased.changed) throw new Error(purchased.detail);
    return purchased.player;
};

const measurements: { action: string; nextPaintMs: number }[] = [];
const longTasks: number[] = [];
const showMetrics = () => {
    const panel = document.getElementById('tap-metrics');
    if (panel) panel.textContent = JSON.stringify({ mode: import.meta.env.MODE,
        samples: measurements.slice(-20), longTasks: longTasks.slice(-30) }, null, 2);
};
try {
    new PerformanceObserver(list => {
        for (const entry of list.getEntries()) longTasks.push(+entry.duration.toFixed(1));
        showMetrics();
    }).observe({ type: 'longtask', buffered: false });
} catch { /* Not supported by every browser. */ }
document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    const action = button.getAttribute('aria-label') || button.textContent?.trim().slice(0, 80) || 'button';
    const started = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
        measurements.push({ action, nextPaintMs: +(performance.now() - started).toFixed(1) });
        showMetrics();
    }));
}, true);

function Fixture() {
    const [player, setPlayer] = useState(makePlayer);
    return <>
        <StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={() => {}} />
        <details style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 99999, maxHeight: '40vh', overflow: 'auto', maxWidth: 300,
            background: '#10141e', color: '#fff', padding: 10, font: '12px system-ui' }}>
            <summary>Disposable performance QA · 197 filed · 1 licensed</summary>
            <p>Memory only. No actual save is read or written. Double-frame timings are lab observations, not field INP.</p>
            <button onClick={() => { measurements.length = 0; longTasks.length = 0; showMetrics(); }}>Reset metrics</button>
            <pre id="tap-metrics" />
        </details>
    </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture /></React.StrictMode>);
