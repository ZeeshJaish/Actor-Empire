import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { BoxOfficeApp } from '../views/mobile/BoxOfficeApp';
import '../index.css';

const release = {
  id: 'responsive-release', name: 'The Remarkably Long International Motion Picture Project',
  type: 'MOVIE', roleType: 'LEAD', distributionPhase: 'THEATRICAL', weekNum: 12,
  weeklyGross: [7_000_000, 5_000_000, 3_000_000], totalGross: 15_000_000,
  budget: 10_000_000, status: 'RUNNING', imdbRating: 8.1, productionPerformance: 80,
  weeksInTheaters: 3, releaseWeek: 10, releaseYear: 2026,
  projectDetails: { title: 'The Remarkably Long International Motion Picture Project',
    type: 'MOVIE', description: 'A film used to test responsive release detail presentation.',
    studioId: 'WARNER_BROS', subtype: 'FILM', genre: 'DRAMA', budgetTier: 'MID',
    estimatedBudget: 10_000_000, visibleHype: 'MID', hiddenStats: {},
    directorName: 'A Director', visibleDirectorTier: 'STAR', visibleScriptBuzz: 'HIGH',
    visibleCastStrength: 'HIGH' },
} as any;
const mode = new URLSearchParams(location.search).get('mode');
const language = new URLSearchParams(location.search).get('lang') || 'en';
const streamingRelease = { ...release, id: 'responsive-streaming-release', distributionPhase: 'STREAMING',
  totalGross: 0, weeklyGross: [], streamingRevenue: 2_000_000,
  streaming: { platformId: 'NETFLIX', weekOnPlatform: 3, totalViews: 8_000_000,
    weeklyViews: [2_000_000, 3_000_000, 3_000_000], isLeaving: false } };
const archivedProject = { id: 'responsive-archive-release', name: release.name,
  type: 'ACTING_GIG', projectType: 'MOVIE', roleType: 'LEAD', year: 2025,
  earnings: 1_000_000, budget: 10_000_000, gross: 45_000_000,
  weeklyGross: [20_000_000, 15_000_000, 10_000_000], imdbRating: 8.2,
  projectQuality: 80, genre: 'DRAMA', subtype: 'FILM', studioId: 'WARNER_BROS',
  description: 'Preserved final box-office record used for responsive layout QA.' };
const player = { ...INITIAL_PLAYER, name: 'Release Layout Tester', age: 27, currentWeek: 12,
  settings: { ...INITIAL_PLAYER.settings, language },
  activeReleases: mode === 'archive' ? [] : [mode === 'streaming' ? streamingRelease : release],
  pastProjects: mode === 'archive' ? [archivedProject] : [] } as any;

createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
    <BoxOfficeApp player={player} onBack={() => {}} />
  </div>,
);
