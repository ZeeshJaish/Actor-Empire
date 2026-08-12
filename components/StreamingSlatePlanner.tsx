import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Film,
  Megaphone,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { OwnedStreamingLaunchSlate, Player, StreamingOriginalReleasePattern, StreamingSlateMarketingPlan } from '../types';
import {
  STREAMING_MARKETING_PLAN_BEATS,
  createRecommendedStreamingSlate,
  getStreamingSlateCandidates,
  getStreamingSlateWarnings,
  programStreamingLaunchSlate,
} from '../services/streamingOriginals';
import StreamingVisualScene, {
  type StreamingVisualSceneTone,
} from './StreamingVisualScene';
import AccessibleDialog from './AccessibleDialog';
import '../styles/streaming-content-workspaces.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
}

const PATTERNS: Array<{ id: StreamingOriginalReleasePattern; label: string }> = [
  { id: 'SINGLE_PREMIERE', label: 'Single premiere' },
  { id: 'FULL_SEASON', label: 'Full-season drop' },
  { id: 'WEEKLY', label: 'Weekly episodes' },
  { id: 'SPLIT_VOLUME', label: 'Split volume' },
];

const MARKETING: Array<{ id: StreamingSlateMarketingPlan; label: string }> = [
  { id: 'LEAN', label: 'Lean' },
  { id: 'STANDARD', label: 'Standard' },
  { id: 'EVENT', label: 'Event' },
];

export default function StreamingSlatePlanner({ player, onUpdatePlayer, onClose }: Props) {
  const platform = player.ownedStreamingPlatform;
  const candidates = useMemo(() => getStreamingSlateCandidates(player), [player]);
  const [slate, setSlate] = useState<OwnedStreamingLaunchSlate>(
    platform.launchSlateDraft || platform.launchSlate || createRecommendedStreamingSlate(player),
  );
  const [message, setMessage] = useState('');
  const warnings = useMemo(() => getStreamingSlateWarnings(player, slate), [player, slate]);
  const usedIds = new Set(slate.entries.map(entry => entry.projectId));
  const available = candidates.filter(candidate => !usedIds.has(candidate.projectId));
  const programmedWeeks = new Set(slate.entries.map(entry => entry.launchWeek)).size;
  const blockerCount = warnings.filter(warning => warning.severity === 'BLOCKER').length;
  const warningCount = warnings.filter(warning => warning.severity === 'WARNING').length;
  const wallTone: StreamingVisualSceneTone = blockerCount
    ? 'critical'
    : warningCount
      ? 'warning'
      : 'active';

  const changeEntry = (id: string, patch: Partial<OwnedStreamingLaunchSlate['entries'][number]>) => {
    setSlate(current => ({
      ...current,
      entries: current.entries.map(entry => entry.id === id ? { ...entry, ...patch } : entry),
    }));
    setMessage('');
  };

  const addCandidate = (projectId: string) => {
    const candidate = candidates.find(item => item.projectId === projectId);
    if (!candidate) return;
    setSlate(current => ({
      ...current,
      entries: [...current.entries, {
        id: `slate_${candidate.projectId}`,
        ...candidate,
        launchWeek: Math.min(12, 1 + current.entries.length * 2),
        releasePattern: candidate.projectType === 'MOVIE' ? 'SINGLE_PREMIERE' : 'WEEKLY',
        marketingPlan: candidate.source === 'ORIGINAL' ? 'EVENT' : 'STANDARD',
      }],
    }));
  };

  const lockSlate = () => {
    const result = programStreamingLaunchSlate(player, slate);
    if (!result.changed) {
      setMessage(result.reason === 'BLOCKERS' ? 'Resolve the red programming blockers before locking the slate.' : 'The slate is not ready to lock.');
      return;
    }
    onUpdatePlayer(result.player);
    onClose();
  };

  return (
    <AccessibleDialog
      className="streaming-workspace-overlay"
      aria-label="Twelve-week launch slate"
      onEscape={onClose}
    >
      <div className="streaming-workspace-shell streaming-content-workspace is-slate">
        <header className="streaming-workspace-header">
          <button type="button" onClick={onClose} aria-label="Back"><ArrowLeft size={19} /></button>
          <div><span>CONTENT ROOM • PROGRAMMING</span><strong>Twelve-week launch slate</strong></div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>

        <main className="streaming-workspace-body">
          <StreamingVisualScene
            sceneId="contentStudio"
            eyebrow="PROGRAMMING FLOOR · 12-WEEK WALL"
            title="Every week needs a reason to return."
            description="Arrange real catalog titles, release rhythms and campaign beats before the launch record is locked."
            status={{
              label: blockerCount ? `${blockerCount} programming blocker${blockerCount === 1 ? '' : 's'}` : warningCount ? `${warningCount} warning${warningCount === 1 ? '' : 's'}` : 'Opening rhythm balanced',
              detail: `${programmedWeeks} of 12 weeks hold a premiere.`,
              tone: wallTone,
            }}
            className="content-workspace-scene is-programming-scene"
            imageLoading="eager"
          >
            <div className="content-scene-readouts">
              <div><span>TITLES</span><strong>{slate.entries.length}</strong></div>
              <div><span>ACTIVE WEEKS</span><strong>{programmedWeeks}/12</strong></div>
              <div><span>BLOCKERS</span><strong>{blockerCount}</strong></div>
              <div><span>REVISION</span><strong>{slate.revision}</strong></div>
            </div>
          </StreamingVisualScene>
          <div className="streaming-workspace-title">
            <CalendarDays size={21} />
            <span>CANONICAL LAUNCH WINDOW</span>
            <h1>Give every title a job—and every week a reason to return.</h1>
            <p>Program premiere timing, release rhythm and real campaign beats. Performance numbers begin only after launch.</p>
          </div>

          <section className="streaming-programming-wall" aria-label="Twelve week programming wall">
            <header>
              <div><span>12-WEEK PROGRAMMING WALL</span><strong>Premieres, drops and return beats</strong></div>
              <small>{programmedWeeks}/12 weeks programmed</small>
            </header>
            <div className="streaming-programming-week-grid">
              {Array.from({ length: 12 }, (_, index) => index + 1).map(week => {
                const weekEntries = slate.entries.filter(entry => entry.launchWeek === week);
                return (
                  <article key={week} className={weekEntries.length ? 'has-title' : 'is-open'}>
                    <header><span>WEEK</span><strong>{String(week).padStart(2, '0')}</strong></header>
                    <div>
                      {weekEntries.length ? weekEntries.map(entry => (
                        <span key={entry.id} className={`is-${entry.source.toLowerCase()}`}>
                          {entry.source === 'ORIGINAL' ? <Sparkles size={12} /> : <Film size={12} />}
                          <strong>{entry.title}</strong>
                        </span>
                      )) : <small>OPEN SLOT</small>}
                    </div>
                    <footer>{weekEntries.length ? `${weekEntries.length} premiere${weekEntries.length === 1 ? '' : 's'}` : 'Available'}</footer>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="streaming-slate-layout">
            <section className="streaming-slate-board">
              <header><div><Clapperboard size={18} /><span>PROGRAMMING CARDS</span></div><strong>{slate.entries.length}</strong></header>
              {slate.entries.map(entry => (
                <article key={entry.id}>
                  <div className={`streaming-title-source is-${entry.source.toLowerCase()}`}>
                    {entry.source === 'ORIGINAL' ? <Sparkles size={17} /> : <Film size={17} />}
                  </div>
                  <div className="streaming-title-identity">
                    <span>{entry.source.replace('_', ' ')}</span>
                    <strong>{entry.title}</strong>
                    <small>{entry.projectType === 'SERIES' ? 'Series' : 'Movie'} • {entry.genre.replace('_', ' ')}</small>
                  </div>
                  <label><span>Week</span><select value={entry.launchWeek} onChange={event => changeEntry(entry.id, { launchWeek: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Week {i + 1}</option>)}</select></label>
                  <label><span>Pattern</span><select value={entry.releasePattern} disabled={entry.projectType === 'MOVIE'} onChange={event => changeEntry(entry.id, { releasePattern: event.target.value as StreamingOriginalReleasePattern })}>{PATTERNS.filter(pattern => entry.projectType === 'SERIES' || pattern.id === 'SINGLE_PREMIERE').map(pattern => <option key={pattern.id} value={pattern.id}>{pattern.label}</option>)}</select></label>
                  <label><span>Campaign</span><select value={entry.marketingPlan} onChange={event => changeEntry(entry.id, { marketingPlan: event.target.value as StreamingSlateMarketingPlan })}>{MARKETING.map(plan => <option key={plan.id} value={plan.id}>{plan.label}</option>)}</select></label>
                  <button type="button" onClick={() => setSlate(current => ({ ...current, entries: current.entries.filter(item => item.id !== entry.id) }))} aria-label={`Remove ${entry.title}`}><Trash2 size={16} /></button>
                  <div className="streaming-campaign-beats">
                    <Megaphone size={14} />
                    {STREAMING_MARKETING_PLAN_BEATS[entry.marketingPlan].map(beat => {
                      const beatWeek = entry.launchWeek + beat.offset;
                      const timing = beatWeek < 1 ? `Pre-launch ${Math.abs(beat.offset)}w` : `W${beatWeek}`;
                      return <span key={`${entry.id}-${beat.offset}-${beat.label}`}>{timing} {beat.label}</span>;
                    })}
                  </div>
                </article>
              ))}
              {available.length > 0 && (
                <label className="streaming-add-title">
                  <Plus size={17} />
                  <span>Add catalog title</span>
                  <select value="" onChange={event => addCandidate(event.target.value)}>
                    <option value="" disabled>Select title</option>
                    {available.map(candidate => <option key={candidate.projectId} value={candidate.projectId}>{candidate.title}</option>)}
                  </select>
                </label>
              )}
            </section>

            <aside className="streaming-gap-monitor">
              <header><AlertTriangle size={18} /><div><span>CONTENT-GAP MONITOR</span><strong>{warnings.length ? `${warnings.length} signal${warnings.length === 1 ? '' : 's'}` : 'Balanced'}</strong></div></header>
              {warnings.length ? warnings.map(warning => (
                <article key={warning.id} className={`is-${warning.severity.toLowerCase()}`}>
                  {warning.severity === 'NOTE' ? <BadgeCheck size={16} /> : <AlertTriangle size={16} />}
                  <div><strong>{warning.title}</strong><p>{warning.detail}</p></div>
                </article>
              )) : <div className="streaming-all-clear"><BadgeCheck size={23} /><strong>Opening rhythm is balanced.</strong><p>The slate covers identity, variety and repeat viewing without a major programming drought.</p></div>}
            </aside>
          </div>
          {message && <p className="streaming-form-error" role="alert">{message}</p>}
        </main>

        <footer className="streaming-workspace-footer">
          <div><span>SLATE REVISION {slate.revision}</span><strong>{blockerCount} blockers • {warningCount} warnings</strong></div>
          <button type="button" onClick={lockSlate}>Lock launch slate <ChevronRight size={18} /></button>
        </footer>
      </div>
    </AccessibleDialog>
  );
}
