import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { SaveTransferProgressOverlay } from '../../components/SaveTransferProgressOverlay';
import type { SaveTransferProgress } from '../../services/saveTransferExperience';

const cancelling = new URLSearchParams(location.search).get('state') === 'cancelling';
const progress: SaveTransferProgress = {
  direction: cancelling ? 'IMPORT' : 'EXPORT',
  stage: cancelling ? 'CANCELLING' : 'VERIFYING',
  message: cancelling
    ? 'Please wait while the current file is released safely. This can take a little longer when a large archive is being checked.'
    : 'Verifying every career and its media archive before the signed transfer file becomes available. No saved career will be replaced during this operation.',
  processedRecords: 248,
  totalRecords: 491,
  processedBytes: 24_000_000,
  totalBytes: 48_000_000,
  cancelable: !cancelling,
};

createRoot(document.getElementById('root')!).render(
  <SaveTransferProgressOverlay progress={progress} onCancel={() => { throw new Error('Cancel callback must not run in layout QA'); }} />,
);
