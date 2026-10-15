import React from 'react';
import { createRoot } from 'react-dom/client';
import StoreScreen, { type StoreScreenCopy } from '../../components/ui-overhaul/StoreScreen';
import { buildStoreUiModel } from '../../services/storeUiAdapter';
import { INITIAL_PLAYER } from '../../types';

const model = buildStoreUiModel(INITIAL_PLAYER);
const copy: StoreScreenCopy = {
  premiumTab: 'Premium', restore: 'Restore purchases', owned: 'Owned', add: 'Add', unlock: 'Unlock',
  confirmTitle: 'Confirm purchase', confirmBuyPrefix: 'Buy', chargePrefix: 'Your store will charge',
  chargeSuffix: 'after confirmation.', rewardAfterConfirm: 'Your item appears after verification.',
  cancel: 'Cancel', continue: 'Continue',
};
createRoot(document.getElementById('root')!).render(
  <StoreScreen
    money="$500,000" bonusBank={0} readyEnergy={100} groups={model.groups}
    showPremium premiumNote="Premium items are delivered after the store confirms payment."
    skills={['delivery']} genres={['ACTION']} formatGenre={genre => genre}
    copy={copy}
    onBack={() => {}} onWatchAd={() => { throw new Error('Rewarded ad must not run in visual QA'); }}
    onBuy={() => { throw new Error('Purchase must not run in visual QA'); }} onRestore={() => {}}
  />,
);
