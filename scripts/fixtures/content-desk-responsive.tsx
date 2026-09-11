import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContentDesk } from '../../components/streaming-transplant/StreamingContentExperience';

const brand = {
  name: 'Empire+', markId: 'BOLT', customMark: null, hue: 252, sat: 88,
  identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: 'Stories travel.',
  layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 35,
  identMode: 'badge' as const, identLen: 2 as const,
  ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
};

createRoot(document.getElementById('root')!).render(
  <ContentDesk
    brand={brand}
    state={{ live: false, titles: [], slate: [] }}
    initialTab="LOCALIZATION"
    onBack={() => undefined}
    localization={{
      subtitleLevel: 0,
      dubbingLevel: 0,
      simultaneousLocalization: false,
      coveredTitleCount: 1,
      activeLanguageCount: 0,
      packages: [],
    }}
  />,
);
