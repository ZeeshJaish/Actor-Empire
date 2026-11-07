/* The Audience room (#130–#136) for each business model, in a browser, to check every model at 320–430 px.
   ?slot=1 reads that career's save the way the app loads it (read only; nothing is ever written back).
   ?model=ADVERTISING or STORE switches its pricing, in memory, to that model alone and settles one week, so the room
   reads a real ad-supported or rent-or-buy week; without it the save is shown as it is (a pre-launch slot shows the
   room before launch). ?tab= opens ANALYTICS, MARKETS, WORLD, CAMPAIGNS or TOP 10. */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import { AudienceDesk, type AudienceState, type AudienceTab } from '../../components/streaming-transplant/StreamingAudienceExperience';
import { createCanonicalAudienceState } from '../../components/streaming-transplant/createCanonicalStreamingPresentation';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';
import { migratePlayerSave } from '../../services/saveMigration';
import { processGameWeek } from '../../services/gameLoop';
import { configureStreamingPricingOffer } from '../../services/streamingCommercialOffers';
import type { OwnedStreamingMarketOperation, Player } from '../../types';

const query = new URLSearchParams(window.location.search);
const slot = query.get('slot') || '1';
const model = query.get('model') as 'ADVERTISING' | 'STORE' | null;
const tab = (query.get('tab') || 'ANALYTICS') as AudienceTab;

const readSave = (key: string) => new Promise<unknown>((resolve, reject) => {
  const request = indexedDB.open('ActorEmpireDB', 1);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => {
    const db = request.result;
    const get = db.transaction('saves', 'readonly').objectStore('saves').get(key);
    get.onsuccess = () => { db.close(); resolve(get.result); };
    get.onerror = () => { db.close(); reject(get.error); };
  };
});

const brandOf = (player: Player): Brand => ({
  name: player.ownedStreamingPlatform?.identity?.name || 'NORTHSTAR+', markId: 'BOLT', customMark: null, hue: 214, sat: 80,
  identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK',
  accentHue: 30, identMode: 'badge', identLen: 2, ratingId: 'ALL', lockupId: 'SIDE', serverCity: null,
});

const App = () => {
  const [view, setView] = useState<{ player: Player; state: AudienceState; operations: OwnedStreamingMarketOperation[] } | null>(null);
  const [note, setNote] = useState('Reading the save…');
  useEffect(() => {
    (async () => {
      const raw = await readSave(`actorEmpireSave_${slot}`);
      if (!raw) { setNote(`No save in slot ${slot}`); return; }
      let player = migratePlayerSave(raw as Player);
      if (model) {
        setNote(`Settling a week as ${model === 'ADVERTISING' ? 'an ad-supported service' : 'a rent-or-buy store'}…`);
        const platform = player.ownedStreamingPlatform;
        const pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: model, alone: true });
        player = { ...player, ownedStreamingPlatform: { ...platform, serviceConfiguration: {
          ...platform.serviceConfiguration, pricing, revision: platform.serviceConfiguration.revision + 1 } } };
        player = (await processGameWeek(player)).player;
      }
      setView({ player, state: createCanonicalAudienceState(player), operations: player.ownedStreamingPlatform.marketOperations });
    })().catch(error => setNote(`Failed: ${error instanceof Error ? error.message : String(error)}`));
  }, []);
  if (!view) return <p data-note={note} style={{ color: '#9aa3b2', font: '14px Inter, sans-serif', padding: 20 }}>{note}</p>;
  return (
    <AudienceDesk brand={brandOf(view.player)} state={view.state} initialTab={tab} onBack={() => undefined}
      onNewCampaign={() => undefined} onObjective={() => undefined} onOpenPlatformOffer={() => undefined}
      onOpenTitle={() => undefined} marketOperations={view.operations} />
  );
};

createRoot(document.getElementById('root')!).render(<App />);
