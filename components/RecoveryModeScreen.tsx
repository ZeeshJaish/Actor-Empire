import React from 'react';
import { RecoveryReportCard } from './RecoveryReportCard';
import type { RecoveryReportHandle } from '../services/recoveryReports';

/* The screen the game shows instead of a black screen when a screen fails to draw (App's GameErrorBoundary).
   2026-11-17: it says sorry and can send a report with the error in one tap (RecoveryReportCard). */
export const RecoveryModeScreen: React.FC<{
    onRecover: () => void;
    onSendReport?: () => RecoveryReportHandle | null;
}> = ({ onRecover, onSendReport }) => (
    <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-6 pt-[max(1.5rem,calc(env(safe-area-inset-top)+10px))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+10px))] text-center">
        <div className="text-xl font-black uppercase tracking-widest mb-3">Recovery Mode</div>
        <p className="text-sm text-zinc-400 max-w-xs mb-6">
            A save or screen error was detected. You can return to the menu instead of getting stuck on a black screen.
        </p>
        {onSendReport && <div className="w-full max-w-xs mb-6 text-left"><RecoveryReportCard onSend={onSendReport} /></div>}
        <button
            onClick={onRecover}
            className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200"
        >
            Return To Menu
        </button>
    </div>
);
