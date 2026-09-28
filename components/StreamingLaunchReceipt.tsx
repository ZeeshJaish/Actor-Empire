import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { OwnedStreamingLaunchCommit } from '../types';

/** A factual recovery path for a launch that has already settled. The first
 * premiere cinematic is playable; reopening a save must never reroll it. */
export default function StreamingLaunchReceipt({ platformName, commit, onOpen, onBack }: {
  platformName: string;
  commit: OwnedStreamingLaunchCommit;
  onOpen: () => void;
  onBack: () => void;
}) {
  const outcome = commit.outcomeTier === 'SMOOTH_OPENING' ? 'Smooth opening'
    : commit.outcomeTier === 'PRESSURED_OPENING' ? 'Pressured opening' : 'Degraded opening';
  return (
    <main className="hq-launch-receipt" aria-label="Saved opening night record">
      <div className="hq-launch-receipt-inner">
        <button type="button" className="hq-launch-receipt-back" onClick={onBack} aria-label="Back to headquarters">← Back</button>
        <span className="hq-launch-receipt-eyebrow">Opening night · recorded</span>
        <h1>{platformName} is live.</h1>
        <p>The service has already launched. This is the saved opening record; viewing it will not launch again or charge the company again.</p>
        <dl className="hq-launch-receipt-facts">
          <div><dt>Outcome</dt><dd>{outcome}</dd></div>
          <div><dt>Opening subscribers</dt><dd>{commit.initialSubscribers.toLocaleString()}</dd></div>
          <div><dt>Playback success</dt><dd>{commit.playbackSuccessRate.toFixed(2)}%</dd></div>
          <div><dt>Protected peak capacity</dt><dd>{commit.protectedPeakConcurrentStreams.toLocaleString()}</dd></div>
        </dl>
        <button type="button" className="hq-launch-receipt-open" onClick={onOpen}>Open your HQ <ChevronRight size={20} aria-hidden="true" /></button>
      </div>
    </main>
  );
}
