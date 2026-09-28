import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { RewardSaveRetryDialog } from '../../components/RewardSaveRetryDialog';

createRoot(document.getElementById('root')!).render(
  <RewardSaveRetryDialog
    title="Your earned reward needs a safe retry"
    explanation="Both required ads were completed, but the verified career save has not finished. Please retry saving this reward. You will not need to watch the ads again, and your previous career data stays protected."
    retryLabel="Retry Saving Reward"
    noMoreAdsLabel="No more ads are required for this reward."
    onRetry={() => { throw new Error('Reward persistence must not run in layout QA'); }}
  />,
);
