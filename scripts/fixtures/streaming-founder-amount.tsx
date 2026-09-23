import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../../types';
import { CapitalView } from '../../components/studio-finance/components/CapitalView';
import { getStreamingStudioFinanceData } from '../../services/streamingStudioFinance';
import '../../components/studio-finance/styles/tokens.css';
import '../../components/studio-finance/styles/studio-finance.css';

const testBalance = new URLSearchParams(window.location.search).get('huge') === '1'
  ? 20_000_000_000_000_000
  : 1_000_000;
const data = getStreamingStudioFinanceData({ ...INITIAL_PLAYER, money: testBalance });

function Fixture() {
  const [transferred, setTransferred] = useState<number | null>(null);
  return (
    <div className="sf" style={{ minHeight: '100dvh' }}>
      <output data-testid="transferred">{transferred ?? 'none'}</output>
      <CapitalView
        data={data}
        handlers={{ onFounderInjection: (amount) => { setTransferred(amount); return { ok: true, message: 'Fixture transfer recorded' }; } }}
        initialRoute="founder"
        onCashMoved={() => {}}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
