import React from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER } from '../types';
import { CastLinkApp } from '../views/mobile/CastLinkApp';
import { ProjectDetailView } from '../components/ProjectDetailView';
import '../index.css';

const opportunity = {
  id: 'responsive-audition', projectName: 'The Remarkably Long International Motion Picture Project',
  roleType: 'LEAD', genre: 'DRAMA', source: 'CASTING_APP', estimatedIncome: 1_500_000,
  config: { label: 'Lead', difficulty: 1, energyCost: 25, baseIncome: 1_500_000, expGain: 1 },
  project: {
    title: 'The Remarkably Long International Motion Picture Project', type: 'MOVIE',
    description: 'A story made for responsive layout testing.', studioId: 'WARNER_BROS',
    subtype: 'FILM', genre: 'DRAMA', budgetTier: 'HIGH', estimatedBudget: 30_000_000,
    visibleHype: 'MID', hiddenStats: {}, directorName: 'A Director With A Long Name',
    visibleDirectorTier: 'STAR', visibleScriptBuzz: 'HIGH', visibleCastStrength: 'HIGH',
  },
} as any;
const job = { id: 'responsive-job', type: 'JOB', name: 'Very Long Part-Time Studio Reception Position',
  income: 1_200, energyCost: 12 };
const mode = new URLSearchParams(location.search).get('mode');
const player = { ...INITIAL_PLAYER, energy: { ...INITIAL_PLAYER.energy, current: 100 },
  weeklyOpportunities: { ...INITIAL_PLAYER.weeklyOpportunities, auditions: [opportunity], jobs: [job] },
  commitments: mode === 'active-job' ? [job] : [],
} as any;
const fail = () => { throw new Error('Audition or negotiation action must not run in layout QA'); };

createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
    {mode === 'negotiation'
      ? <ProjectDetailView opportunity={opportunity} onBack={() => {}} onAction={fail}
          actionLabel="Review the complete offer" isNegotiating currentOffer={1_500_000}
          currentRoyalty={1} onCounter={fail} />
      : <CastLinkApp player={player} onBack={() => {}} onAudition={fail}
          onTakeJob={fail} onQuitJob={fail} />}
  </div>,
);
