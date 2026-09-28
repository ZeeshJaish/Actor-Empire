import React from 'react';
import { createRoot } from 'react-dom/client';
import StoreScreen, { type StoreScreenCopy, type WellnessAdUiState } from '../../components/ui-overhaul/StoreScreen';
import { buildStoreUiModel } from '../../services/storeUiAdapter';
import { INITIAL_PLAYER } from '../../types';

const step = Number(new URLSearchParams(location.search).get('step')) === 1 ? 1 : 0;
const model = buildStoreUiModel(INITIAL_PLAYER);
const copy: StoreScreenCopy = {
  premiumTab: 'Premium', restore: 'Restore purchases', owned: 'Owned', add: 'Add', unlock: 'Unlock',
  confirmTitle: 'Confirm purchase', confirmBuyPrefix: 'Buy', chargePrefix: 'Your store will charge',
  chargeSuffix: 'after confirmation.', rewardAfterConfirm: 'Your item appears after verification.',
  cancel: 'Cancel', continue: 'Continue', wellnessAdOne: 'Ad 1', wellnessAdTwo: 'Ad 2',
};
const wellnessAd: WellnessAdUiState = step === 1
  ? { completedSteps: 1, actionLabel: 'Watch Ad 2 of 2', statusLabel: '1 of 2 ads completed. Continue within 5 minutes.', disabled: false }
  : { completedSteps: 0, actionLabel: 'Watch Ad 1 of 2', statusLabel: 'Watch 2 ads to unlock the Wellness Package.', disabled: false };

createRoot(document.getElementById('root')!).render(
  <StoreScreen
    money="$500,000" bonusBank={0} readyEnergy={100} groups={model.groups}
    showPremium premiumNote="Premium items are delivered after the store confirms payment."
    skills={['delivery']} genres={['ACTION']} formatGenre={genre => genre}
    copy={copy} wellnessAd={wellnessAd}
    onBack={() => {}} onWatchAd={() => { throw new Error('Rewarded ad must not run in visual QA'); }}
    onBuy={() => { throw new Error('Purchase must not run in visual QA'); }} onRestore={() => {}}
  />,
);
