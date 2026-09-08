import React from 'react';
import type { IndustryMediaClaim, IndustryMediaSourceRecord, Player } from '../../types';

export interface IndustryClaimPresentation {
  claim: IndustryMediaClaim;
  sourceName?: string;
  byline?: string;
  sourceRecord?: IndustryMediaSourceRecord;
}

export const getIndustryClaimPresentation = (
  player: Player,
  mediaClaimId?: string,
): IndustryClaimPresentation | undefined => {
  if (!mediaClaimId) return undefined;
  const media = player.world?.industryMedia;
  const claim = media?.claims.find(item => item.id === mediaClaimId);
  if (!claim) return undefined;
  const institution = media?.institutions.find(item => item.id === claim.institutionId);
  const personality = claim.personalityId
    ? media?.personalities.find(item => item.id === claim.personalityId)
    : undefined;
  const sourceId = personality?.id || institution?.id;
  const sourceRecord = sourceId
    ? media?.sourceRecords.find(item => item.sourceId === sourceId && item.category === claim.category)
    : undefined;
  return {
    claim,
    ...(institution ? { sourceName: institution.name } : {}),
    ...(personality ? { byline: personality.name } : {}),
    ...(sourceRecord ? { sourceRecord } : {}),
  };
};

const kindLabel: Record<IndustryMediaClaim['kind'], string> = {
  RUMOUR: 'Rumour',
  LEAK: 'Leak',
  PREDICTION: 'Prediction',
};

const statusLabel: Record<IndustryMediaClaim['status'], string> = {
  OPEN: 'Unconfirmed',
  CONFIRMED: 'Confirmed',
  PARTLY_CONFIRMED: 'Partly confirmed',
  REFUTED: 'Refuted',
  EXPIRED_UNVERIFIED: 'Expired unverified',
  SUPERSEDED: 'Overtaken by events',
};

const statusTone: Record<IndustryMediaClaim['status'], string> = {
  OPEN: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  CONFIRMED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  PARTLY_CONFIRMED: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  REFUTED: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  EXPIRED_UNVERIFIED: 'border-zinc-600 bg-zinc-800/60 text-zinc-300',
  SUPERSEDED: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
};

const kindTone: Record<IndustryMediaClaim['kind'], string> = {
  RUMOUR: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200',
  LEAK: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  PREDICTION: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
};

export const IndustryClaimBadge: React.FC<{ claim: IndustryMediaClaim; compact?: boolean }> = ({ claim, compact }) => (
  <span
    data-industry-claim={claim.id}
    className={`inline-flex items-center rounded-full border font-black uppercase tracking-[0.16em] ${compact ? 'px-2 py-0.5 text-[8px]' : 'px-2.5 py-1 text-[9px]'} ${claim.status === 'OPEN' ? kindTone[claim.kind] : statusTone[claim.status]}`}
  >
    {claim.status === 'OPEN' ? `${kindLabel[claim.kind]} · Unconfirmed` : statusLabel[claim.status]}
  </span>
);

export const IndustryClaimResolutionStrip: React.FC<{ claim: IndustryMediaClaim }> = ({ claim }) => {
  if (claim.status === 'OPEN' || !claim.resolution) return null;
  return (
    <div className={`border-l-2 px-3 py-2.5 ${statusTone[claim.status]}`} data-claim-resolution={claim.status}>
      <div className="text-[9px] font-black uppercase tracking-[0.18em]">What happened next · {statusLabel[claim.status]}</div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-200">{claim.resolution.explanation}</p>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Resolved in week {claim.resolution.absoluteWeek}</div>
    </div>
  );
};

export const IndustrySourceTrackRecord: React.FC<{ record?: IndustryMediaSourceRecord }> = ({ record }) => {
  if (!record || record.calls <= 0) return null;
  return (
    <div className="border-t border-white/10 pt-3" data-source-track-record={record.id}>
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Source track record</div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-zinc-300">
        <span>{record.calls} resolved calls</span>
        <span className="text-emerald-300">{record.confirmed} confirmed</span>
        {record.partlyConfirmed > 0 && <span className="text-sky-300">{record.partlyConfirmed} close</span>}
        <span className="text-rose-300">{record.refuted} missed</span>
        {record.expired > 0 && <span className="text-zinc-400">{record.expired} unverified</span>}
      </div>
    </div>
  );
};

export interface IndustryClaimContextPanelProps {
  claim: IndustryMediaClaim;
  sourceName?: string;
  byline?: string;
  sourceRecord?: IndustryMediaSourceRecord;
  compact?: boolean;
}

export const IndustryClaimContextPanel: React.FC<IndustryClaimContextPanelProps> = ({
  claim,
  sourceName,
  byline,
  sourceRecord,
  compact = false,
}) => (
  <section className="border-y border-white/10 bg-zinc-950/55 px-4 py-3.5" data-c6-claim-context={claim.id}>
    <div className="flex items-center justify-between gap-3">
      <IndustryClaimBadge claim={claim} />
      <div className="truncate text-right text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-500">
        {byline || sourceName || 'Industry source'}
      </div>
    </div>
    {!compact && (
      <>
        <div className="mt-3 border-l-2 border-white/15 pl-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">What we know</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">{claim.knownEvidence}</p>
        </div>
        <div className="mt-3 border-l-2 border-amber-400/50 pl-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">What is being claimed</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-200">{claim.interpretation || claim.summary}</p>
        </div>
        {sourceName && (
          <div className="mt-3 text-[10px] text-zinc-500">
            Reported by <span className="font-bold text-zinc-300">{byline || sourceName}</span>
            {byline ? <span> · {sourceName}</span> : null}
          </div>
        )}
        <div className="mt-3"><IndustryClaimResolutionStrip claim={claim} /></div>
        <div className="mt-3"><IndustrySourceTrackRecord record={sourceRecord} /></div>
      </>
    )}
  </section>
);
