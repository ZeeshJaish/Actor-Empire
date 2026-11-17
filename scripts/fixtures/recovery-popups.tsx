/* The three recovery popups with the one-tap report (2026-11-17), for browser checks:
   ?mode=week  "Week N was not applied" (WeekProcessingRecoveryModal)
   ?mode=save  "Safe backup found" (SaveRecoveryModal)
   ?mode=crash a screen that fails to draw, caught by App's GameErrorBoundary ("Recovery Mode")
   Reports go through the game's own services/recoveryReports.ts. In a browser they stay on the device
   (localStorage actorEmpireIssueReports); only the native app sends them to Firestore. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { INITIAL_PLAYER } from '../../types';
import { migratePlayerSave } from '../../services/saveMigration';
import { WeekProcessingRecoveryModal } from '../../components/WeekProcessingRecoveryModal';
import { SaveRecoveryModal } from '../../components/SaveRecoveryModal';
import { GameErrorBoundary } from '../../App';
import { recoveryModeReport, saveRecoveryReport, sendRecoveryReport, weekFailureReport } from '../../services/recoveryReports';

const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), name: 'Fixture Star', age: 20, currentWeek: 5 });
const fallback = () => migratePlayerSave(INITIAL_PLAYER);
const failure = {
  age: 20, week: 5, failedStage: 'Updating the game world', failureCode: 'WEEK_PROCESSING_FAILED',
  detail: 'The game stopped before the new week was committed. Your previous verified save was not replaced.',
  failures: ['The game world update stopped unexpectedly.'],
};
const recovery = { slot: 1, violations: ['Protected money changed after the last verified save.'] };

const Broken: React.FC = () => { throw new Error("Cannot read properties of undefined (reading 'color')"); };

function Fixture() {
  const mode = new URLSearchParams(location.search).get('mode') || 'week';
  if (mode === 'save') {
    return <SaveRecoveryModal playerName={player.name} age={player.age} week={player.currentWeek} violations={recovery.violations}
      isRecovering={false} onRecover={() => undefined} onCancel={() => undefined}
      onSendReport={() => sendRecoveryReport(player, saveRecoveryReport(recovery), fallback)} />;
  }
  if (mode === 'crash') {
    return <GameErrorBoundary onRecover={() => undefined}
      onReport={error => sendRecoveryReport(player, recoveryModeReport(error, 'HOME'), fallback)}><Broken /></GameErrorBoundary>;
  }
  return <WeekProcessingRecoveryModal {...failure} isExporting={false} onRetry={() => undefined} onReturnToMenu={() => undefined}
    onExportBackup={() => undefined} onSendReport={() => sendRecoveryReport(player, weekFailureReport(failure, 'HOME'), fallback)} />;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
