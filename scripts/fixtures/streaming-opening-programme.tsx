import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import StreamingOpeningProgramme from '../../components/streaming-transplant/StreamingOpeningProgramme';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';
import type { StreamingOpeningProgrammeView } from '../../services/streamingOpeningProgramme';
import '../../styles/streaming-hq.css';

const executing: StreamingOpeningProgrammeView = {
  state: 'EXECUTING', commissioned: true, commission: null, absoluteWeek: 2101,
  earliestOpeningAbsoluteWeek: 2115, dateCertainty: 'ESTIMATE', controllingWorkstreamId: 'INFRASTRUCTURE',
  remainingWeeks: 14, cityCount: 6, rackCount: 118, releasedCapital: 465_000_000,
  workstreams: [
    { id: 'INFRASTRUCTURE', label: 'Infrastructure', status: 'IN_PROGRESS', detail: 'Crews are building 118 racks across 6 cities.', readyAtAbsoluteWeek: 2115, elapsedWeeks: 1, remainingWeeks: 14, controlsDate: true, actionLabel: null, operationIds: [] },
    { id: 'CLEARANCES', label: 'Government clearance', status: 'ACTION_REQUIRED', detail: '1 market needs your response.', readyAtAbsoluteWeek: 2105, elapsedWeeks: 1, remainingWeeks: 4, controlsDate: false, actionLabel: 'Resolve government request', operationIds: ['market-us'] },
    { id: 'MARKETING', label: 'Launch marketing', status: 'IN_PROGRESS', detail: 'Campaign preparation runs through week 2108.', readyAtAbsoluteWeek: 2108, elapsedWeeks: 1, remainingWeeks: 7, controlsDate: false, actionLabel: null, operationIds: [] },
    { id: 'CATALOGUE', label: 'Opening catalogue', status: 'LOCKED', detail: 'The commissioned catalogue is locked.', readyAtAbsoluteWeek: 2100, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
    { id: 'SERVICE', label: 'Service identity and storefront', status: 'LOCKED', detail: 'The approved viewer experience is locked.', readyAtAbsoluteWeek: 2100, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
    { id: 'PRICING', label: 'Service and pricing', status: 'LOCKED', detail: 'The opening commercial offer is locked.', readyAtAbsoluteWeek: 2100, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
    { id: 'REHEARSAL', label: 'Load rehearsal', status: 'PASSED', detail: 'The commissioned configuration passed its final rehearsal.', readyAtAbsoluteWeek: 2100, elapsedWeeks: null, remainingWeeks: 0, controlsDate: false, actionLabel: null, operationIds: [] },
  ],
};

const auditBrand: Brand = {
  name: 'EMPIRE+', markId: 'FRAME_PLAY', customMark: null, hue: 250, sat: 90,
  identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
  layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 168, identMode: 'badge',
  identLen: 2, ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
};

function Fixture() {
  const [view, setView] = useState(executing);
  return <StreamingOpeningProgramme
    brand={auditBrand}
    view={view}
    focus="CLEARANCES"
    onBack={() => undefined}
    onOpenCommissionedPlan={() => undefined}
    onResolveClearance={() => setView(current => ({
      ...current,
      state: 'EXECUTING',
      workstreams: current.workstreams.map(item => item.id === 'CLEARANCES'
        ? { ...item, status: 'IN_PROGRESS', detail: 'The revised application is under review.', actionLabel: null, operationIds: [] }
        : item),
    }))}
    onOpeningNight={() => undefined}
  />;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
