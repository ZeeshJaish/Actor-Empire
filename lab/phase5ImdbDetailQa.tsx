import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { ImdbApp } from '../views/mobile/ImdbApp';
import '../index.css';

const project = {
  id: 'responsive-imdb-credit', name: 'The Remarkably Long International Motion Picture Project',
  title: 'The Remarkably Long International Motion Picture Project', type: 'ACTING_GIG',
  projectType: 'MOVIE', roleType: 'LEAD', year: 2026, earnings: 1_500_000,
  rating: 8.2, imdbRating: 8.2, reception: 'Strong audience response', projectQuality: 75,
  boxOfficeResult: 'SUCCESS', outcomeTier: 'HIT', subtype: 'FILM', futurePotential: {},
  studioId: 'WARNER_BROS', budget: 25_000_000, gross: 75_000_000, genre: 'DRAMA',
  description: 'An extended project description for responsive layout testing. '.repeat(3),
} as any;
const player = { ...INITIAL_PLAYER, name: 'IMDb Layout Tester', age: 27, currentWeek: 12,
  pastProjects: [project], activeReleases: [], awards: [],
} as any;

createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
    <ImdbApp player={player} onBack={() => {}} />
  </div>,
);
