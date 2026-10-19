// Disposable React-only career. It never reads/writes local, cloud or save slots.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Player } from '../../types';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import StreamingOriginalsStudio from '../../components/StreamingOriginalsStudio';
import { createC6QaCareer } from '../../lab/c6QaCareer';
import { processGameWeek } from '../../services/gameLoop';
import { getStreamingContentAvailability } from '../../services/streamingContentAvailability';
import { getStreamingOriginalLiveStatus } from '../../services/streamingOriginals';
import { getAbsoluteWeek } from '../../services/legacyLogic';

function Fixture() {
  const [player, setPlayer] = useState<Player>(createC6QaCareer);
  const [studioOpen, setStudioOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Prepared fallback. Import exported founder career to test the actual old save.');
  const [panelOpen, setPanelOpen] = useState(true);
  const commission = player.ownedStreamingPlatform.originalCommissions[0];
  const availability = commission?.canonicalProjectId
    ? getStreamingContentAvailability(player, commission.canonicalProjectId, ['US']) : null;
  const advance = async () => {
    setBusy(true);
    try {
      const result = await processGameWeek(player);
      setPlayer(result.player);
      setMessage('Actual game week processed in the isolated career.');
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  };
  return <>
    <details open={panelOpen} onToggle={event => setPanelOpen(event.currentTarget.open)}
      style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 99999, background: '#131821', color: '#fff', maxWidth: '100vw', width: 330, boxSizing: 'border-box', font: '12px system-ui', padding: 8 }}>
      <summary>Isolated Originals QA · {getAbsoluteWeek(player.age, player.currentWeek)}</summary>
      <p>{message}</p>
      <label>Import exported founder career <input type="file" accept="application/json,.json" onChange={async event => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          if (!parsed?.ownedStreamingPlatform || !parsed?.world || !Array.isArray(parsed.commitments)) throw new Error('Expected a complete exported Player career.');
          setPlayer(parsed); setStudioOpen(false);
          setMessage(`Imported ${file.name} into React memory only.`);
        } catch (error) { setMessage(String(error)); }
      }} style={{ maxWidth: '100%' }} /></label>
      <p>Saved status: {commission?.status} · Resolved: {commission ? getStreamingOriginalLiveStatus(player, commission) : 'none'} · Catalogue: {availability?.status}</p>
      <p>Treasury ${player.ownedStreamingPlatform.treasuryCash.toLocaleString()} · Original views {player.ownedStreamingPlatform.weeklyHistory.flatMap(week => week.operations?.titlePerformance || []).filter(row => row.projectId === commission?.canonicalProjectId).reduce((sum, row) => sum + row.viewingAccounts, 0).toLocaleString()}</p>
      <button onClick={() => { setPanelOpen(false); setStudioOpen(true); }}>Open real Originals Studio</button>
      <button disabled={busy} onClick={advance}>{busy ? 'Processing' : 'Advance actual isolated week'}</button>
      <button onClick={() => {
        const blob = new Blob([JSON.stringify(player)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'originals-repair-isolated-career.json'; anchor.click(); URL.revokeObjectURL(url);
      }}>Export isolated career</button>
    </details>
    <StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={() => {}} />
    {studioOpen && <StreamingOriginalsStudio player={player} onUpdatePlayer={setPlayer}
      onClose={() => setStudioOpen(false)} onOpenPitchRoom={() => setMessage('Use HQ commissioning for a new pitch.')}
      onOpenProduction={() => setMessage('This fixture targets an already-completed production.')}
      onOpenTitleDossier={() => setMessage('Use HQ Content Desk for the full title dossier.')}
      onOpenPromotion={() => setMessage('Use HQ promotion for campaigns.')} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
