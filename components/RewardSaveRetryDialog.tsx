import React from 'react';
import { CheckCircle } from 'lucide-react';

interface RewardSaveRetryDialogProps {
  title: string;
  explanation: string;
  retryLabel: string;
  noMoreAdsLabel: string;
  onRetry: () => void;
}

export const RewardSaveRetryDialog: React.FC<RewardSaveRetryDialogProps> = ({ title, explanation, retryLabel, noMoreAdsLabel, onRetry }) => (
  <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/85 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] backdrop-blur-md">
    <div role="alertdialog" aria-modal="true" aria-labelledby="reward-save-title" className="max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
        <CheckCircle className="text-amber-400" size={32} />
      </div>
      <h2 id="reward-save-title" className="text-xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-300">{explanation}</p>
      <button type="button" onClick={onRetry} className="mt-5 min-h-12 w-full rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-black transition-transform active:scale-[0.98]">
        {retryLabel}
      </button>
      <p className="mt-3 text-xs font-semibold text-zinc-500">{noMoreAdsLabel}</p>
    </div>
  </div>
);
