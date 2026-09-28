import React from 'react';
import { Database, X } from 'lucide-react';
import type { SaveTransferProgress } from '../services/saveTransferExperience';

interface SaveTransferProgressOverlayProps {
  progress: SaveTransferProgress;
  onCancel: () => void;
}

const getProgressPercent = (progress: SaveTransferProgress): number | null => {
  if (progress.totalBytes && progress.totalBytes > 0 && progress.processedBytes !== undefined) {
    return Math.max(0, Math.min(100, Math.round(progress.processedBytes / progress.totalBytes * 100)));
  }
  if (progress.totalRecords && progress.totalRecords > 0 && progress.processedRecords !== undefined) {
    return Math.max(0, Math.min(100, Math.round(progress.processedRecords / progress.totalRecords * 100)));
  }
  return null;
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const SaveTransferProgressOverlay: React.FC<SaveTransferProgressOverlayProps> = ({ progress, onCancel }) => {
  const percent = getProgressPercent(progress);
  const processedLabel = formatBytes(progress.processedBytes);
  const totalLabel = formatBytes(progress.totalBytes);
  const isCancelling = progress.stage === 'CANCELLING';

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/55 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-transfer-progress-title"
        aria-describedby="save-transfer-progress-message"
        className="max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-[28px] border border-white/10 bg-zinc-950/95 p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Database size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/80">
              {progress.direction === 'EXPORT' ? 'Exporting safely' : 'Importing safely'}
            </div>
            <h2 id="save-transfer-progress-title" className="mt-1 text-lg font-black text-white">
              {isCancelling ? 'Cancelling transfer' : 'Keeping your careers protected'}
            </h2>
            <p id="save-transfer-progress-message" className="mt-1 text-sm leading-relaxed text-zinc-400">
              {progress.message}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div
            role="progressbar"
            aria-label="Save transfer progress"
            aria-valuemin={0}
            aria-valuemax={100}
            {...(percent === null ? {} : { 'aria-valuenow': percent })}
            className="h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className={`h-full rounded-full bg-emerald-400 transition-[width] duration-200 ${percent === null ? 'w-1/3 animate-pulse' : ''}`}
              style={percent === null ? undefined : { width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-[11px] font-bold text-zinc-500">
            <span>
              {progress.totalRecords && progress.processedRecords !== undefined
                ? `${progress.processedRecords} of ${progress.totalRecords} records`
                : 'Working in small protected chunks'}
            </span>
            <span>{processedLabel && totalLabel ? `${processedLabel} / ${totalLabel}` : percent === null ? '' : `${percent}%`}</span>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          This does not change graphics or gameplay quality. Existing careers stay untouched until verification finishes.
        </p>

        <button
          type="button"
          onClick={onCancel}
          disabled={!progress.cancelable || isCancelling}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-zinc-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <X size={18} aria-hidden="true" />
          {isCancelling ? 'Finishing safe cleanup…' : progress.cancelable ? 'Cancel transfer' : 'Finalizing — please wait'}
        </button>
      </section>
    </div>
  );
};
