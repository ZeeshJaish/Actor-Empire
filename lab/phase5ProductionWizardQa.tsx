import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { ProductionWizard } from '../views/lifestyle/business/ProductionWizard';
import '../index.css';

const syntheticPlayer = {
  ...INITIAL_PLAYER,
  name: 'Alexandria Catherine Montgomery-Winslow',
  money: 75_000_000,
  energy: { ...INITIAL_PLAYER.energy, current: 100 },
};

createRoot(document.getElementById('root')!).render(
  <ProductionWizard
    player={syntheticPlayer}
    onCancel={() => {}}
    onUpdatePlayer={() => {}}
    onComplete={() => {}}
  />,
);
