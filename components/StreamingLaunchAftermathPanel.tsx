import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  CircleDot,
  Clock3,
  Eye,
  MessageCircleMore,
  RadioTower,
  UsersRound,
  Wifi,
} from 'lucide-react';
import type { Player, StreamingHqSection } from '../types';
import { getStreamingLaunchAftermath } from '../services/streamingAftermath';

interface Props {
  player: Player;
  onOpenViewer: () => void;
  onNavigate: (section: StreamingHqSection) => void;
}

const SIGNAL_ICONS = {
  SUBSCRIBERS: UsersRound,
  PLAYBACK: Wifi,
  HEADROOM: RadioTower,
  DEMAND: Activity,
} as const;

export default function StreamingLaunchAftermathPanel({ player, onOpenViewer, onNavigate }: Props) {
  const aftermath = useMemo(() => getStreamingLaunchAftermath(player), [player]);
  if (!aftermath.available || !aftermath.launchCommit) return null;

  return (
    <section className="hq-aftermath" aria-labelledby="hq-aftermath-title">
      <header className="hq-aftermath-hero">
        <div>
          <span className="hq-eyebrow">PHASE 9 • LAUNCH AFTERMATH</span>
          <h2 id="hq-aftermath-title">{aftermath.headline}</h2>
          <p>{aftermath.story}</p>
        </div>
        <span className={`hq-aftermath-outcome is-${aftermath.launchCommit.outcomeTier.toLowerCase()}`}>
          <i />
          {aftermath.outcomeLabel}
        </span>
      </header>

      <div className="hq-aftermath-signals">
        {aftermath.signals.map(signal => {
          const Icon = SIGNAL_ICONS[signal.id];
          return (
            <article key={signal.id} className={`is-${signal.tone.toLowerCase()}`}>
              <span className="hq-aftermath-signal-icon"><Icon size={17} /></span>
              <div><small>{signal.label}</small><strong>{signal.value}</strong><p>{signal.detail}</p></div>
            </article>
          );
        })}
      </div>

      <div className="hq-aftermath-columns">
        <section className="hq-reaction-room">
          <header>
            <div><span className="hq-eyebrow">REACTION ROOM</span><h3>What launch night changed</h3></div>
            <MessageCircleMore size={20} />
          </header>
          <div>
            {aftermath.reactions.map(reaction => (
              <article key={reaction.id} className={`is-${reaction.tone.toLowerCase()}`}>
                <span>{reaction.source}</span>
                <strong>{reaction.headline}</strong>
                <p>{reaction.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="hq-report-queue">
          <header>
            <span className="hq-eyebrow">REPORT QUEUE</span>
            <h3>{aftermath.pendingReportCount} reports still maturing</h3>
            <p>{aftermath.nextReportLabel}</p>
          </header>
          <div>
            {aftermath.reports.map(report => (
              <article key={report.id} className={report.status === 'AVAILABLE' ? 'is-available' : 'is-pending'}>
                <span>{report.status === 'AVAILABLE' ? <BadgeCheck size={15} /> : <Clock3 size={15} />}</span>
                <div><strong>{report.label}</strong><small>{report.detail}</small></div>
                <em>{report.value || 'PENDING'}</em>
              </article>
            ))}
          </div>
          <div className="hq-report-truth">
            <CircleDot size={13} />
            Opening facts are final. Unprocessed weekly reports never appear as zero.
          </div>
        </aside>
      </div>

      <footer className="hq-aftermath-actions">
        <button type="button" onClick={onOpenViewer}>
          <Eye size={17} />
          <span><strong>Open live Viewer Home</strong><small>See what customers see now</small></span>
          <ChevronRight size={17} />
        </button>
        <button type="button" onClick={() => onNavigate('TECH')}>
          <RadioTower size={17} />
          <span><strong>Inspect network</strong><small>Capacity and reliability</small></span>
          <ArrowUpRight size={16} />
        </button>
        <button type="button" onClick={() => onNavigate('MARKET')}>
          <BarChart3 size={17} />
          <span><strong>Open Market Room</strong><small>Pending competitive reports</small></span>
          <ArrowUpRight size={16} />
        </button>
      </footer>

      {aftermath.launchCommit.outcomeTier === 'DEGRADED_OPENING' ? (
        <aside className="hq-aftermath-warning">
          <AlertTriangle size={17} />
          <p><strong>Launch pressure is now the company’s first live risk.</strong> Phase 10 will turn it into the first weekly CEO decision; Phase 9 does not silently repair it.</p>
        </aside>
      ) : null}
    </section>
  );
}
