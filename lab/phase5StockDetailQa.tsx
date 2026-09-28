import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER, type Stock } from '../types';
import { StocksApp } from '../views/mobile/StocksApp';
import '../index.css';

const stock: Stock = {
  id: 'responsive-stock', symbol: 'LONG', name: 'A Very Long International Entertainment Company', sector: 'MEDIA',
  price: 125, volatility: 0.03, dividendYield: 0.01,
  priceHistory: [115, 118, 121, 119, 125], lastDividendPayoutWeek: 0,
};
const player = { ...INITIAL_PLAYER, name: 'Stock Layout Tester', money: 1_000_000, stocks: [stock] };
const fail = () => { throw new Error('Trading must not run in layout QA'); };

createRoot(document.getElementById('root')!).render(
  <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-[3rem] border-[6px] border-zinc-800 bg-black" style={{ height: '100dvh' }}>
    <StocksApp player={player} initialStockId={stock.id} onBack={() => {}} onTrade={fail} onUpdatePlayer={fail} />
  </div>,
);
