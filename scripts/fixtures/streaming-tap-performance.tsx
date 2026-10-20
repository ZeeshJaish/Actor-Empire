// Disposable browser lab. Does not read or write career/save storage.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import StreamingBuyerAuctionRoom from '../../components/StreamingBuyerAuctionRoom';
import { streamingCatalogueScaleFixture } from '../helpers/streamingCatalogueScaleFixture';
import type {Player} from '../../types';

const parameters = new URLSearchParams(location.search);
const requestedTitles = Number(parameters.get('titles'));
const titleCount = [52, 104, 1040, 5000].includes(requestedTitles) ? requestedTitles : 52;
const outcome = parameters.get('outcome');
const outcomeStatus = ['NO_SALE', 'WON', 'LOST', 'INVALIDATED', 'WITHDRAWN'].includes(outcome || '') ? outcome : null;
const startInRoom = parameters.get('room') === '1';
const makePlayer = () => streamingCatalogueScaleFixture(titleCount, Date.now()).player;

const measurements: { action: string; nextPaintMs: number }[] = [];
const longTasks: number[] = [];
const presentations: { event: string; atMs: number; detail?: unknown }[] = [];
const showMetrics = () => {
    const panel = document.getElementById('tap-metrics');
    if (panel) panel.textContent = JSON.stringify({ mode: import.meta.env.MODE,
        samples: measurements.slice(-20), longTasks: longTasks.slice(-30), presentations: presentations.slice(-20) }, null, 2);
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

// Observe visible DOM transitions only. This lab never reads career storage or
// component internals; timing starts when the result is actually rendered.
let observedResult: Element | null = null;
let observedPresented = false;
let observedChecking: Element | null = null;
new MutationObserver(() => {
    let changed = false;
    const record = (event: string, detail?: unknown) => {
        presentations.push({ event, atMs: +performance.now().toFixed(1), detail }); changed = true;
    };
    const checking = document.querySelector('[role="dialog"][aria-label="Checking rights and funds…"]');
    if (checking !== observedChecking) {
        if (checking) {
            const box = checking.querySelector('[role="status"]')!.getBoundingClientRect();
            record('checking-visible', { center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
                viewport: { width: innerWidth, height: innerHeight }, backdrop: getComputedStyle(checking).backgroundColor });
        }
        observedChecking = checking;
    }
    const result = document.querySelector('[role="dialog"][aria-label$=" acquired"]');
    if (result !== observedResult) {
        if (observedResult) record('result-dismissed');
        observedResult = result;
        observedPresented = false;
        if (result) record('result-mounted', result.getAttribute('aria-label'));
    }
    if (result && !observedPresented && result.querySelector('button:not([disabled])')) {
        observedPresented = true; record('result-presented');
    }
    if (changed) showMetrics();
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-label'] });
document.addEventListener('input', event => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const action = `Input: ${event.target.getAttribute('aria-label') || event.target.placeholder || event.target.type}`;
    const started = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
        measurements.push({ action, nextPaintMs: +(performance.now() - started).toFixed(1) });
        showMetrics();
    }));
}, true);

function Fixture({initialPlayer}: {initialPlayer?:Player}) {
    const [player, setPlayer] = useState(() => initialPlayer || makePlayer());
    const [resultExited, setResultExited] = useState(false);
    return <>
        {outcomeStatus && !resultExited ? <StreamingBuyerAuctionRoom player={player} session={player.ownedStreamingPlatform.buyerAuctionSessions[0]} onUpdatePlayer={setPlayer} onExit={() => setResultExited(true)} /> : <StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={() => {}}
            initialContentMarketOfferId={startInRoom && !outcomeStatus ? player.ownedStreamingPlatform.buyerAuctionSessions[0]?.id : undefined} />}
        <details style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 99999, maxHeight: '40vh', overflow: 'auto', maxWidth: 300,
            background: '#10141e', color: '#fff', padding: 10, font: '12px system-ui' }}>
            <summary>Disposable performance QA · 197 filed · {titleCount} requested · {player.ownedStreamingPlatform.catalogProjectIds.length} references · {player.ownedStreamingPlatform.catalogLicenses.length} licensed</summary>
            <p>Memory only. No actual save is read or written. Double-frame timings are lab observations, not field INP.</p>
            <button onClick={() => { measurements.length = 0; longTasks.length = 0; presentations.length = 0; showMetrics(); }}>Reset metrics</button>
            <pre id="tap-metrics" />
        </details>
    </>;
}
const start=async()=>{
    let initialPlayer:Player|undefined;
    if(titleCount>=1040) {
        const response=await fetch(`/streaming-stress-${titleCount}-player.json`);
        if(!response.ok)throw new Error('Generate scripts/benchmark-streaming-stress.tsx fixture before starting the 1040-title lab.');
        initialPlayer=await response.json() as Player;
        // Rebase the disposable recording's clock at playback start. No career
        // storage, ownership, bid, price or auction-duration state is changed.
        initialPlayer.ownedStreamingPlatform.buyerAuctionSessions.forEach(session=>{session.lastRealtimeAtMs=Date.now();});
    }
    if (outcomeStatus && initialPlayer) {
        // Controlled presentation states only; this is not a settlement proof.
        const session = initialPlayer.ownedStreamingPlatform.buyerAuctionSessions[0];
        if (parameters.get('collection') === '1') session.lot = { ...session.lot, listingKind: 'CATALOGUE_PACKAGE',
            title: 'MGM Collection', genre: 'CATALOGUE', catalogueComponentIds: ['qa-title-one','qa-title-two','qa-title-three'] };
        const won = outcomeStatus === 'WON';
        const sold = won || outcomeStatus === 'LOST';
        const bidder = session.bids[0];
        const winner = { ...bidder, id: 'qa-result-winner', bidderId: won ? session.playerBidderId : 'qa-rival',
            bidderName: won ? 'Empire+' : 'Prime Video', isPlayer: won, minimumGuarantee: session.lot.referenceValue,
            sellerValue: session.lot.referenceValue, status: 'ACTIVE' as const };
        session.status = outcomeStatus as typeof session.status;
        session.bids = sold ? [winner] : [];
        session.winnerBidId = sold ? winner.id : null;
        session.leaderBidId = session.winnerBidId;
        session.playerBidId = won ? winner.id : null;
        session.closedAtActiveSecond = session.activeSecondsElapsed;
        session.settledAtAbsoluteWeek = session.openedAtAbsoluteWeek;
        session.resultReason = outcomeStatus === 'NO_SALE' ? 'The strongest contract did not meet the seller’s reserve. No rights or money moved.'
            : won ? 'The contract is registered in your catalogue.' : sold ? 'Prime Video won the complete rights contract.'
            : outcomeStatus === 'INVALIDATED' ? 'The available rights changed before settlement. Your commitment was released.' : 'Your offer was withdrawn.';
    }
    createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture initialPlayer={initialPlayer}/></React.StrictMode>);
};
start().catch(error=>{document.getElementById('root')!.textContent=String(error);});
