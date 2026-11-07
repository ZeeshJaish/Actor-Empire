/* #104 The money engine in its states, for checking it at phone widths: the first choice (an empty front door), a
   service in the wizard with Free with ads as its main offer, and the Offer tab's engine read-only and while editing.
   Taps change the fixture's own state; nothing is saved. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MoneyEngine, type MoneyEngineSlot } from '../../components/streaming-transplant/MoneyEngine';
import type { StreamingOfferKind } from '../../components/streaming-transplant/offerPersonality';

const wizardSlots = (on: Record<StreamingOfferKind, boolean>): Record<StreamingOfferKind, MoneyEngineSlot> => ({
  SUBSCRIPTION: { on: on.SUBSCRIPTION, value: '$4.2M', note: 'a month, forecast', detail: '2 plans · from $7.99 · 1 with ads' },
  ADS: { on: on.ADS, value: '$8.1M', note: 'a month, forecast', detail: 'A break every 15 min' },
  STORE: { on: on.STORE, value: '$1.3M', note: 'a month, forecast', detail: 'Rent $5.99 · Buy $19.99' },
});
const liveSlots: Record<StreamingOfferKind, MoneyEngineSlot> = {
  SUBSCRIPTION: { on: true, value: '$188M', note: 'a month, last week', detail: '3 plans · 23.5M accounts' },
  ADS: { on: true, value: '$90.9M', note: 'a month, last week', detail: 'A break every 15 min' },
  STORE: { on: true, value: '$79.4M', note: 'a month, last week', detail: 'Rent $3.99 · Buy $14.99' },
};

const Live: React.FC<{ editable: boolean }> = ({ editable }) => {
  const [main, setMain] = useState<StreamingOfferKind | null>(null);
  const [on, setOn] = useState<Record<StreamingOfferKind, boolean>>({ SUBSCRIPTION: false, ADS: true, STORE: false });
  return <MoneyEngine main={main} editable={editable} slots={wizardSlots(on)} aside={main ? 'forecast $13.6M a month' : undefined}
    onMain={offer => { setMain(offer); setOn(current => ({ ...current, [offer]: true })); }}
    onToggle={(offer, value) => setOn(current => ({ ...current, [offer]: value }))} />;
};
const Chosen: React.FC = () => {
  const [main, setMain] = useState<StreamingOfferKind>('ADS');
  const [on, setOn] = useState<Record<StreamingOfferKind, boolean>>({ SUBSCRIPTION: true, ADS: true, STORE: false });
  return <MoneyEngine main={main} editable slots={wizardSlots(on)} aside="forecast $13.6M a month"
    onMain={offer => { setMain(offer); setOn(current => ({ ...current, [offer]: true })); }}
    onToggle={(offer, value) => setOn(current => ({ ...current, [offer]: value }))} />;
};

createRoot(document.getElementById('root')!).render(<>
  <h1>First choice</h1><Live editable />
  <h1>Define the Launch · Free with ads main</h1><Chosen />
  <h1>Offer tab · read-only</h1><MoneyEngine main="SUBSCRIPTION" editable={false} slots={liveSlots} aside="last settled week" />
</>);
