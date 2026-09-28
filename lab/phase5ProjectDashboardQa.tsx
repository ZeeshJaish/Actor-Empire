import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';
import { ProjectDashboardModal } from '../views/lifestyle/business/components/ProjectDashboardModal';
import '../index.css';

const studio = createBusiness('A Very Long International Production House', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {
  quality: 'LUXURY', pricing: 'HIGH', marketing: 'HIGH', headOfProductionId: 'MARCUS',
}, '🎬', 1);
const phase = new URLSearchParams(location.search).get('phase') || 'PRODUCTION';
const project = {
  id: 'responsive-project',
  name: 'A Remarkably Long Project Title for Studio Production Review',
  phase,
  type: 'MOVIE',
  budget: 32_000_000,
  gross: phase === 'RELEASED' ? 75_000_000 : 0,
  rating: phase === 'RELEASED' ? 8.1 : 0,
  genre: 'DRAMA',
  weekNum: 12,
  releaseWeek: 18,
  releaseYear: 2026,
  projectDetails: { id: 'responsive-project', studioId: studio.id, type: 'MOVIE', genre: 'DRAMA', budget: 32_000_000 },
};
const player = { ...INITIAL_PLAYER, name: 'Project Detail Tester', age: 27, currentWeek: 12, businesses: [studio] };
const fail = () => { throw new Error('Project action must not run in layout QA'); };

createRoot(document.getElementById('root')!).render(
  <ProjectDashboardModal
    project={project} player={player} studio={studio as any}
    onClose={() => {}} onUpdatePlayer={fail} onMakeSequel={fail} onMakeSpinoff={fail}
    onStartStreamingBidding={fail} onRenameProject={fail} onConfigureRelease={fail}
  />,
);
