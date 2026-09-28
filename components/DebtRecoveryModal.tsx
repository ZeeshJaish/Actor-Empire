import React from 'react';
import { AlertTriangle, Briefcase, PlayCircle, Skull } from 'lucide-react';
import type { LocalizedTextVars, Player } from '../types';

interface DebtRecoveryModalProps {
  player: Player;
  tr: (key: string, vars?: LocalizedTextVars) => string;
  onRestartCareer: () => void;
  onBailout: () => void;
  onManageFinances: () => void;
}

export const DebtRecoveryModal: React.FC<DebtRecoveryModalProps> = ({ player, tr, onRestartCareer, onBailout, onManageFinances }) => {
  const weeksInDebt = player.flags.weeksInDebt || 0;
  const bailoutAdsUsed = player.flags.bailoutAdsUsedThisWeek || 0;
  const bailoutAmount = bailoutAdsUsed === 0
    ? Math.floor(Math.abs(player.money) * 0.20) + 5000
    : Math.floor(Math.abs(player.money) * 0.10) + 2500;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-red-950/80 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-md animate-in zoom-in-95 duration-300">
      <div role="dialog" aria-modal="true" aria-labelledby="debt-recovery-title" className="relative max-h-full w-full max-w-sm overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl border-2 border-red-500/50 bg-zinc-900 p-6 text-center shadow-2xl">
        <div className="absolute left-0 top-0 h-1 w-full animate-pulse bg-red-500" />
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
          {weeksInDebt >= 8 ? <Skull size={40} className="text-red-500" /> : <AlertTriangle size={40} className="text-red-500" />}
        </div>

        {weeksInDebt >= 8 ? (
          <>
            <h2 id="debt-recovery-title" className="mb-2 text-3xl font-black uppercase tracking-tight text-white">{tr('app.debt.ruinTitle')}</h2>
            <p className="mb-6 text-sm font-bold leading-relaxed text-red-400">{tr('app.debt.ruinSubtext')}</p>
            <div className="mb-6 rounded-xl border border-red-900 bg-black/60 p-4">
              <div className="mb-1 text-xs font-bold uppercase text-zinc-500">{tr('app.debt.finalDebt')}</div>
              <div className="font-mono text-2xl font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</div>
            </div>
            <button onClick={onRestartCareer} className="w-full rounded-xl bg-white py-4 font-bold text-black shadow-lg transition-colors hover:bg-zinc-200">
              {tr('app.debt.restartCareer')}
            </button>
          </>
        ) : (
          <>
            <h2 id="debt-recovery-title" className="mb-2 text-2xl font-black uppercase tracking-tight text-white">{tr('app.debt.warningTitle')}</h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              {tr('app.debt.warningPrefix')} <span className="font-bold text-white">{tr('app.debt.weeksToRecover', { weeks: 8 - weeksInDebt })}</span> {tr('app.debt.warningSuffix')}
            </p>

            <div className="mb-6 rounded-xl border border-zinc-800 bg-black/40 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-zinc-500">
                <span>{tr('app.debt.currentDebt')}</span>
                <span>{tr('app.debt.runway')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</span>
                <span className="font-bold text-white">{tr('app.debt.weeks', { weeks: 8 - weeksInDebt })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onBailout}
                disabled={bailoutAdsUsed >= 2}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-white/70"
              >
                <PlayCircle size={18} /> {tr('app.debt.getBailout', { amount: bailoutAmount.toLocaleString() })}
              </button>
              <div className="text-[11px] text-zinc-500">{tr('app.debt.bailoutAdsUsed', { count: bailoutAdsUsed })}</div>
              <button onClick={onManageFinances} className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 font-bold text-zinc-300 transition-colors hover:bg-zinc-700">
                <Briefcase size={16} /> {tr('app.debt.manageFinances')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
