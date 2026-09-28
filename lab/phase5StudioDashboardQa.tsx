import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';
import { ProductionHouseGame } from '../views/lifestyle/business/ProductionHouseGame';
import '../index.css';
import '../ui-layout/railInteractions.css';
import { installHorizontalRailDrag } from '../ui-layout/railInteractions';

installHorizontalRailDrag(document);

const studio = createBusiness('A Very Long International Production House', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {
  quality: 'LUXURY', pricing: 'HIGH', marketing: 'HIGH', headOfProductionId: 'MARCUS',
}, '🎬', 1);
const syntheticPlayer = {
  ...INITIAL_PLAYER,
  name: 'Alexandria Catherine Montgomery-Winslow',
  money: 75_000_000,
  businesses: [studio],
};

createRoot(document.getElementById('root')!).render(
  <ProductionHouseGame player={syntheticPlayer} onBack={() => {}} onUpdatePlayer={() => {}} />,
);
