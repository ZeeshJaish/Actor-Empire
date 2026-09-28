import React from 'react';
import { createRoot } from 'react-dom/client';
import { SaveRecoveryModal } from '../components/SaveRecoveryModal';
import { WeekProcessingRecoveryModal } from '../components/WeekProcessingRecoveryModal';
import '../index.css';

const mode = new URLSearchParams(window.location.search).get('mode');
createRoot(document.getElementById('root')!).render(mode === 'week'
  ? <WeekProcessingRecoveryModal
      age={37} week={52} failedStage="Settlement and production finance reconciliation"
      detail="A long-running career has several studio settlements that could not be reconciled safely. Your previous verified save remains intact."
      failureCode="WEEK_PROCESSING_UNVERIFIED_SETTLEMENT_BOUNDARY"
      failures={[
        'The studio agreement and its deferred payments could not be verified.',
        'The weekly world simulation stopped before committing any new player progress.',
        'The complete detail remains available for support and local backup export.',
      ]}
      isExporting={false} onRetry={() => {}} onReturnToMenu={() => {}} onExportBackup={() => {}}
    />
  : <SaveRecoveryModal
      playerName="Alexandria Catherine Montgomery-Winslow" age={37} week={52}
      violations={['Synthetic QA fixture']} isRecovering={false} onRecover={() => {}} onCancel={() => {}}
    />);
