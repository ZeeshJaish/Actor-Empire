import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';
import { ProductionHouseGame } from '../views/lifestyle/business/ProductionHouseGame';
import '../index.css';

const studio = createBusiness('A Very Long International Production House', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {
  quality: 'LUXURY', pricing: 'HIGH', marketing: 'HIGH', headOfProductionId: 'MARCUS',
}, '🎬', 1);
const syntheticPlayer = {
  ...INITIAL_PLAYER,
  name: 'Alexandria Catherine Montgomery-Winslow',
  money: 75_000_000,
  businesses: [studio],
  pastProjects: [{
    id: 'responsive-studio-film',
    studioId: studio.id,
    name: 'A Remarkably Long Film Title from the Studio Archive',
    type: 'ACTING_GIG', roleType: 'LEAD', subtype: 'MOVIE',
    year: 2025, releaseYear: 2025, releaseWeek: 12, earnings: 3_000_000,
    rating: 8.8, reception: 'Strong', projectQuality: 82, imdbRating: 8.8,
    boxOfficeResult: 'HIT', outcomeTier: 'HIT', futurePotential: 'HIGH',
    budget: 20_000_000, gross: 72_000_000, awards: [], genre: 'DRAMA',
  }] as any,
};

createRoot(document.getElementById('root')!).render(
  <ProductionHouseGame player={syntheticPlayer} onBack={() => {}} onUpdatePlayer={() => { throw new Error('Filmography layout QA must not change a player'); }} />,
);
