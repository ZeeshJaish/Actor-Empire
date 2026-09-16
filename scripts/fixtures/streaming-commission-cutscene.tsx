import React from 'react';
import { createRoot } from 'react-dom/client';
import { Cutscene } from '../../components/studio-finance/components/cine/Cutscene';
import { commissionBeats } from '../../components/studio-finance/components/cine/CommissionCut';
import type { BuildTotals, MoneyPlan } from '../../components/studio-finance/finance/build';
import '../../components/studio-finance/styles/tokens.css';
import '../../components/studio-finance/styles/studio-finance.css';
import '../../components/studio-finance/styles/cine.css';

const [signingBeat] = commissionBeats(
  { cities: 6, racks: 118, weeks: 15 } as BuildTotals,
  { total: 465_000_000, commissionNow: 465_000_000, lines: [] } as unknown as MoneyPlan,
  [],
  'Empire+',
  'Zeeshan Jaish',
);
const beats = [{ ...signingBeat, ms: 60_000 }];

createRoot(document.getElementById('root')!).render(
  <Cutscene
    beats={beats}
    finale={<p>Commissioned</p>}
    navigation="timed"
    onClose={() => undefined}
  />,
);
