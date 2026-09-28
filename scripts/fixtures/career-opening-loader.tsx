import React from 'react';
import { createRoot } from 'react-dom/client';
import { ActorEmpireCareerOpeningScreen, ActorEmpireIntroStyle } from '../../components/ActorEmpireIntro';
import '../../index.css';

createRoot(document.getElementById('root')!).render(
  <>
    <ActorEmpireIntroStyle />
    <ActorEmpireCareerOpeningScreen
      status="Preparing your story"
      supportingMessage="Bringing your cast, projects and career history into the game."
    />
  </>,
);
