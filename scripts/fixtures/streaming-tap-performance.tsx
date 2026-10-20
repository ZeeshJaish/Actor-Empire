// Disposable browser lab. Does not read or write career/save storage.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import { streamingCatalogueScaleFixture } from '../helpers/streamingCatalogueScaleFixture';
import type {Player} from '../../types';

const parameters = new URLSearchParams(location.search);
const titleCount = parameters.get('titles') === '1040' ? 1040 : parameters.get('titles') === '104' ? 104 : 52;
const startInRoom = parameters.get('room') === '1';
const makePlayer = () => streamingCatalogueScaleFixture(titleCount, Date.now()).player;

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

function Fixture({initialPlayer}: {initialPlayer?:Player}) {
    const [player, setPlayer] = useState(() => initialPlayer || makePlayer());
    return <>
        <StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={() => {}}
            initialContentMarketOfferId={startInRoom ? player.ownedStreamingPlatform.buyerAuctionSessions[0]?.id : undefined} />
        <details style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 99999, maxHeight: '40vh', overflow: 'auto', maxWidth: 300,
            background: '#10141e', color: '#fff', padding: 10, font: '12px system-ui' }}>
            <summary>Disposable performance QA · 197 filed · {titleCount} requested · {player.ownedStreamingPlatform.catalogProjectIds.length} references · {player.ownedStreamingPlatform.catalogLicenses.length} licensed</summary>
            <p>Memory only. No actual save is read or written. Double-frame timings are lab observations, not field INP.</p>
            <button onClick={() => { measurements.length = 0; longTasks.length = 0; showMetrics(); }}>Reset metrics</button>
            <pre id="tap-metrics" />
        </details>
    </>;
}
const start=async()=>{
    let initialPlayer:Player|undefined;
    if(titleCount===1040) {
        const response=await fetch('/streaming-stress-1040-player.json');
        if(!response.ok)throw new Error('Generate scripts/benchmark-streaming-stress.tsx fixture before starting the 1040-title lab.');
        initialPlayer=await response.json() as Player;
        // Rebase the disposable recording's clock at playback start. No career
        // storage, ownership, bid, price or auction-duration state is changed.
        initialPlayer.ownedStreamingPlatform.buyerAuctionSessions.forEach(session=>{session.lastRealtimeAtMs=Date.now();});
    }
    createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture initialPlayer={initialPlayer}/></React.StrictMode>);
};
start().catch(error=>{document.getElementById('root')!.textContent=String(error);});
