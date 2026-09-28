import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AcquisitionCase } from '../services/studioAcquisition';
import { DEFAULT_ACQ_CONFIG, StudioAcquisitionDealRoom } from '../views/mobile/components/StudioAcquisitionDealRoom';
import '../index.css';

const acceptedCase: AcquisitionCase = {
  studioId: 'qa-studio', studioName: DEFAULT_ACQ_CONFIG.studioName,
  acquisitionState: 'OPEN_TO_OFFERS', publicValuation: DEFAULT_ACQ_CONFIG.valuation,
  approachedWeek: 1, approachedYear: 18, status: 'ACCEPTED',
  offer: { type: 'FAIR', amount: DEFAULT_ACQ_CONFIG.valuation, funding: { source: 'PERSONAL' },
    complianceRisk: 0, complianceBand: 'ROUTINE', submittedWeek: 1, submittedYear: 18 },
  sellerResponse: { decision: 'ACCEPTED', agreedAmount: DEFAULT_ACQ_CONFIG.valuation,
    round: 1, respondedWeek: 1, respondedYear: 18, summary: 'Synthetic QA acceptance' },
  presentation: { closingStage: 'SIGNING' },
};
const mode = new URLSearchParams(window.location.search).get('mode');

createRoot(document.getElementById('root')!).render(
  <StudioAcquisitionDealRoom
    config={DEFAULT_ACQ_CONFIG}
    acquisitionCase={mode === 'signing' ? acceptedCase : undefined}
    onClose={() => {}}
    onRunDiligence={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onSubmitOffer={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onAcceptCounter={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onReviseOffer={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onBeatRival={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onWalkAway={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onCompleteAcquisition={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
    onSetOperatingModel={() => ({ success: false, reason: 'QA_NO_TRANSACTION' } as any)}
  />,
);
