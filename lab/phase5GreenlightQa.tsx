import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';
import { GreenlightWizard } from '../views/lifestyle/business/GreenlightWizard';
import '../index.css';

const studio = createBusiness('A Very Long International Production House', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {
  quality: 'LUXURY', pricing: 'HIGH', marketing: 'HIGH', headOfProductionId: 'MARCUS',
}, '🎬', 1);
const player = { ...INITIAL_PLAYER, money: 75_000_000, businesses: [studio] };
createRoot(document.getElementById('root')!).render(
  <GreenlightWizard player={player} studio={studio} onBack={() => {}} onUpdatePlayer={() => {}} onComplete={() => {}} />,
);
