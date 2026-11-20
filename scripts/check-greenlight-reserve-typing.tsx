/* 20 Nov 2026 (player report, PB): Greenlight's campaign reserve can be typed. Bundled for a browser by
   qa/2026-11-20-hotfix4/greenlight-reserve-test.cjs; results on window.__seen. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GreenlightMarketingBudgetSection } from '../views/lifestyle/business/components/GreenlightMarketingBudgetSection';
import type { MarketingBudgetPreset } from '../views/lifestyle/business/greenlightUtils';

const seen: Array<{ preset: string; amount: number }> = [];
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : `$${value}`);
const Harness = () => {
    const [preset, setPreset] = useState<MarketingBudgetPreset>('STANDARD' as MarketingBudgetPreset);
    const [amount, setAmount] = useState(4_800_000);
    return (
        <GreenlightMarketingBudgetSection
            marketingBudgetPreset={preset}
            reservedMarketingBudget={amount}
            productionBudget={45_400_000}
            maxMarketingBudget={179_100_000_000}
            onPresetChange={next => setPreset(next)}
            onReservedBudgetChange={next => { setAmount(next); seen.push({ preset, amount: next }); }}
            formatMoney={money}
            translate={key => String(key)}
        />
    );
};
createRoot(document.getElementById('root')!).render(<Harness />);
(window as unknown as { __ready: boolean }).__ready = true;
(window as unknown as { __seen: unknown }).__seen = seen;
