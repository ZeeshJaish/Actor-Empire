import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Captions,
  ChevronRight,
  CircleDot,
  Clapperboard,
  Film,
  Globe2,
  Languages,
  LineChart,
  Megaphone,
  Network,
  Play,
  Plus,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import type {
  Player,
  StreamingOriginalLifecycleDecisionType,
  StreamingOriginalLocalizationPackage,
  StreamingOriginalReleasePattern,
  StreamingOriginalReleaseScope,
  StreamingSlateMarketingPlan,
} from '../types';
import AccessibleDialog from './AccessibleDialog';
import StreamingVisualScene from './StreamingVisualScene';
import {
  STREAMING_ORIGINAL_LOCALIZATION_PACKAGES,
  authorizeStreamingOriginalRelease,
  commitStreamingOriginalLocalization,
  decideStreamingOriginalFuture,
  getStreamingOriginalsStudio,
} from '../services/streamingOriginalsBusiness';
import '../styles/streaming-originals-studio.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenPitchRoom: () => void;
  onOpenProduction: (target: { studioId: string; scriptId: string; commissionId: string }) => void;
  onOpenTitleDossier: (projectId: string) => void;
  onOpenPromotion: (projectId: string) => void;
}

const money = (value: number) => value >= 1_000_000_000
  ? `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  : `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;

const PIPELINE = [
  { id: 'PITCH', label: 'Pitch', icon: Sparkles },
  { id: 'GREENLIGHT', label: 'Greenlight', icon: Clapperboard },
  { id: 'PRODUCTION', label: 'Production', icon: Film },
  { id: 'LOCALIZATION', label: 'Localize', icon: Languages },
  { id: 'RELEASE', label: 'Release', icon: RadioTower },
  { id: 'ANALYSIS', label: 'Analysis', icon: LineChart },
  { id: 'FUTURE', label: 'Future', icon: Network },
] as const;

const FUTURE_DECISIONS: Array<{
  id: StreamingOriginalLifecycleDecisionType;
  label: string;
  description: string;
}> = [
  { id: 'RENEW', label: 'Renew', description: 'Open a new season brief inside the same canonical commission flow.' },
  { id: 'CANCEL', label: 'End the run', description: 'Close this lineage without inventing a penalty or deleting its catalog value.' },
  { id: 'LICENSE_WINDOW', label: 'License later', description: 'Protect the exclusive window, then queue the title for Phase 16 market execution.' },
  { id: 'FRANCHISE', label: 'Build a franchise', description: 'Open a related-world pitch while preserving sequel-rights and lineage.' },
];

const releaseScopeLabel: Record<StreamingOriginalReleaseScope, string> = {
  DOMESTIC: 'Home market',
  MULTI_REGION: 'Multi-region',
  GLOBAL: 'Global',
};

export default function StreamingOriginalsStudio({
  player,
  onUpdatePlayer,
  onClose,
  onOpenPitchRoom,
  onOpenProduction,
  onOpenTitleDossier,
  onOpenPromotion,
}: Props) {
  const records = useMemo(() => getStreamingOriginalsStudio(player), [player]);
  const [selectedId, setSelectedId] = useState(records[0]?.commission.id || '');
  const [localizationPackage, setLocalizationPackage] = useState<StreamingOriginalLocalizationPackage>('DOMESTIC');
  const [releaseScope, setReleaseScope] = useState<StreamingOriginalReleaseScope>('DOMESTIC');
  const [releasePattern, setReleasePattern] = useState<StreamingOriginalReleasePattern>('WEEKLY');
  const [marketingPlan, setMarketingPlan] = useState<StreamingSlateMarketingPlan>('EVENT');
  const [feedback, setFeedback] = useState('');
  const selected = records.find(record => record.commission.id === selectedId) || records[0] || null;
  const commission = selected?.commission || null;
  const selectedLocalization = STREAMING_ORIGINAL_LOCALIZATION_PACKAGES.find(item => item.id === localizationPackage)
    || STREAMING_ORIGINAL_LOCALIZATION_PACKAGES[0];
  const currentContentOps = player.ownedStreamingPlatform.technologyLevels.CONTENT_OPERATIONS;
  const canOpenAnotherPitch = !player.ownedStreamingPlatform.originalCommissions.some(item => !item.canonicalProjectId);

  const commitLocalization = () => {
    if (!commission) return;
    const result = commitStreamingOriginalLocalization(player, commission.id, localizationPackage);
    if (!result.changed) {
      const messages = {
        UNKNOWN_ORIGINAL: 'That Original is no longer available.',
        NOT_GREENLIT: 'Greenlight the canonical production before opening localization.',
        ALREADY_PLANNED: 'This localization package is already committed.',
        TECH_REQUIRED: `Content Operations ${selectedLocalization.contentOperationsRequired} is required for this package.`,
        INSUFFICIENT_TREASURY: 'Platform treasury cannot fund this localization package.',
      };
      setFeedback(messages[result.reason || 'UNKNOWN_ORIGINAL']);
      return;
    }
    setFeedback(`${selectedLocalization.label} committed. Delivery completes after ${selectedLocalization.deliveryWeeks} real game week${selectedLocalization.deliveryWeeks === 1 ? '' : 's'}.`);
    onUpdatePlayer(result.player);
  };

  const authorizeRelease = () => {
    if (!commission) return;
    const result = authorizeStreamingOriginalRelease(player, commission.id, {
      scope: releaseScope,
      releasePattern,
      marketingPlan,
    });
    if (!result.changed) {
      const messages = {
        UNKNOWN_ORIGINAL: 'That Original is no longer available.',
        NOT_DELIVERED: 'The canonical production must finish post-production first.',
        LOCALIZATION_REQUIRED: 'Commit a localization master before release authorization.',
        LOCALIZATION_IN_PROGRESS: 'Localization is still completing in game weeks.',
        SCOPE_EXCEEDS_LOCALIZATION: 'The release territory exceeds the localization package.',
        ALREADY_AUTHORIZED: 'This premiere is already authorized.',
      };
      setFeedback(messages[result.reason || 'UNKNOWN_ORIGINAL']);
      return;
    }
    setFeedback(`${commission.title} is cleared for its next-week ${releaseScopeLabel[releaseScope]} premiere.`);
    onUpdatePlayer(result.player);
  };

  const decideFuture = (type: StreamingOriginalLifecycleDecisionType) => {
    if (!commission) return;
    const result = decideStreamingOriginalFuture(player, commission.id, type);
    if (!result.changed) {
      const messages = {
        UNKNOWN_ORIGINAL: 'That Original is no longer available.',
        REPORTS_MATURING: 'Four measured live weeks are required before a lifecycle decision.',
        ALREADY_DECIDED: 'This title already has a committed lifecycle decision.',
        SEQUEL_RIGHTS_REQUIRED: 'The original contract did not include sequel and franchise rights.',
      };
      setFeedback(messages[result.reason || 'UNKNOWN_ORIGINAL']);
      return;
    }
    onUpdatePlayer(result.player);
    if (result.opensPitchRoom) {
      onOpenPitchRoom();
      return;
    }
    setFeedback(`${type.toLowerCase().replace('_', ' ')} recorded from the mature title report.`);
  };

  if (!selected || !commission) {
    return (
      <AccessibleDialog className="originals-studio-overlay" aria-label="Originals Studio" onEscape={onClose}>
        <div className="originals-studio-shell is-empty">
          <button type="button" className="originals-studio-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
          <StreamingVisualScene
            sceneId="contentStudio"
            eyebrow="ORIGINALS STUDIO • PITCH FLOOR"
            title="The next signature title starts here."
            description="Audience gap, contract, physical producer and real Greenlight stay connected from the first brief."
            status={{ label: 'Pitch room open', detail: 'No active commissions', tone: 'active' }}
            imageLoading="eager"
          >
            <button type="button" className="originals-empty-cta" onClick={onOpenPitchRoom}><Plus size={18} /> Enter Pitch Room</button>
          </StreamingVisualScene>
        </div>
      </AccessibleDialog>
    );
  }

  const stageIndex = commission.lifecycleDecision
    ? 6
    : selected.decisionReady || selected.liveStatus === 'RELEASED'
      ? 5
      : commission.releasePlan
        ? 4
        : selected.localizationStatus !== 'NOT_PLANNED'
          ? 3
          : selected.liveStatus === 'DELIVERED'
            ? 3
            : selected.liveStatus === 'IN_PRODUCTION'
              ? 2
              : commission.canonicalProjectId
                ? 1
                : 0;
  const localizationReady = selected.localizationStatus === 'READY';
  const canAuthorizeRelease = selected.liveStatus === 'DELIVERED' && localizationReady && !commission.releasePlan;

  return (
    <AccessibleDialog className="originals-studio-overlay" aria-label="Originals Studio pipeline" onEscape={onClose}>
      <div className="originals-studio-shell">
        <header className="originals-studio-header">
          <button type="button" onClick={onClose} aria-label="Back"><ArrowLeft size={19} /></button>
          <div><span>CONTENT ROOM</span><strong>Originals Studio</strong></div>
          <button type="button" disabled={!canOpenAnotherPitch} onClick={onOpenPitchRoom}><Plus size={17} /> New pitch</button>
        </header>

        <main className="originals-studio-main">
          <StreamingVisualScene
            sceneId="contentStudio"
            eyebrow={`ORIGINALS FLOOR • ${records.length} COMMISSION${records.length === 1 ? '' : 'S'}`}
            title={commission.title}
            description={`${commission.producerStudioName} physically produces. ${commission.commissionedByPlatformName} commissions, controls the window and programs the audience journey.`}
            status={{
              label: selected.liveStatus.replaceAll('_', ' '),
              detail: `${commission.strategy?.replaceAll('_', ' ') || 'Original strategy'} · Season ${commission.seasonNumber || 1}`,
              tone: selected.liveStatus === 'RELEASED' ? 'success' : selected.liveStatus === 'DELIVERED' ? 'warning' : 'active',
            }}
            imageLoading="eager"
            className="originals-studio-scene"
          >
            <div className="originals-scene-slate">
              <span>{commission.projectType}</span>
              <strong>{commission.genre.replaceAll('_', ' ')}</strong>
              <small>{commission.projectType === 'SERIES' ? `${commission.episodes} episodes` : 'Feature film'}</small>
            </div>
          </StreamingVisualScene>

          <nav className="originals-title-rail" aria-label="Original commissions">
            {records.map(record => (
              <button
                type="button"
                key={record.commission.id}
                className={record.commission.id === commission.id ? 'is-selected' : ''}
                onClick={() => {
                  setSelectedId(record.commission.id);
                  setFeedback('');
                }}
              >
                <span>{record.commission.lineageId === record.commission.id ? 'ORIGINAL' : `SEASON ${record.commission.seasonNumber || 1}`}</span>
                <strong>{record.commission.title}</strong>
                <small>{record.liveStatus.replaceAll('_', ' ')}</small>
              </button>
            ))}
          </nav>

          <section className="originals-pipeline" aria-label="Original pipeline">
            {PIPELINE.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div key={stage.id} className={index < stageIndex ? 'is-done' : index === stageIndex ? 'is-active' : ''}>
                  <i>{index < stageIndex ? <BadgeCheck size={15} /> : <Icon size={15} />}</i>
                  <span>{stage.label}</span>
                </div>
              );
            })}
          </section>

          <section className="originals-command-grid">
            <article className="originals-command-card is-contract">
              <header><ShieldCheck size={18} /><div><span>COMMISSION CONTRACT</span><h2>Rights and production truth</h2></div></header>
              <dl>
                <div><dt>Platform rights</dt><dd>{commission.contract?.platformRightsPercent || 85}%</dd></div>
                <div><dt>Producer backend</dt><dd>{commission.contract?.producerBackendPercent ?? 15}%</dd></div>
                <div><dt>Exclusive window</dt><dd>{commission.contract?.exclusiveWindowWeeks || 24} weeks</dd></div>
                <div><dt>Production cap</dt><dd>{money(commission.productionBudgetCap)}</dd></div>
              </dl>
              {!commission.canonicalProjectId ? (
                <button type="button" onClick={() => onOpenProduction({
                  studioId: commission.producerStudioId,
                  scriptId: commission.scriptId,
                  commissionId: commission.id,
                })}>Open real Greenlight <ChevronRight size={17} /></button>
              ) : (
                <p><BadgeCheck size={15} /> Canonical project {commission.canonicalProjectId.slice(0, 12)}… is the only production record.</p>
              )}
            </article>

            <article className="originals-command-card is-localization">
              <header><Languages size={18} /><div><span>LOCALIZATION BAY</span><h2>{commission.localization ? 'Master package committed' : 'Prepare the audience master'}</h2></div></header>
              {commission.localization ? (
                <div className={`originals-localization-status is-${selected.localizationStatus.toLowerCase()}`}>
                  <div><Captions size={20} /><span>{commission.localization.subtitleLanguageCount} subtitle tracks</span></div>
                  <div><UsersRound size={20} /><span>{commission.localization.dubbedLanguageCount} dubbed masters</span></div>
                  <strong>{selected.localizationStatus === 'READY' ? 'Release master ready' : `Ready at absolute week ${commission.localization.readyAtAbsoluteWeek}`}</strong>
                  <small>{money(commission.localization.cashCost)} paid once from platform treasury</small>
                </div>
              ) : (
                <>
                  <div className="originals-package-grid">
                    {STREAMING_ORIGINAL_LOCALIZATION_PACKAGES.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        className={localizationPackage === item.id ? 'is-selected' : ''}
                        onClick={() => {
                          setLocalizationPackage(item.id);
                          setReleaseScope(item.id);
                        }}
                      >
                        <span>{item.id.replace('_', ' ')}</span>
                        <strong>{item.label}</strong>
                        <small>{item.subtitleLanguageCount} subs · {item.dubbedLanguageCount} dubs · {money(item.cashCost)}</small>
                        <em>Content Ops {item.contentOperationsRequired}</em>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!commission.canonicalProjectId || currentContentOps < selectedLocalization.contentOperationsRequired}
                    onClick={commitLocalization}
                  >Commit localization <Languages size={17} /></button>
                </>
              )}
            </article>

            <article className="originals-command-card is-release">
              <header><RadioTower size={18} /><div><span>RELEASE CONTROL</span><h2>{commission.releasePlan ? 'Premiere authorized' : 'Program the platform window'}</h2></div></header>
              {commission.releasePlan ? (
                <div className="originals-release-ticket">
                  <Play size={26} fill="currentColor" />
                  <div><span>{releaseScopeLabel[commission.releasePlan.scope]}</span><strong>{commission.releasePlan.releasePattern.replaceAll('_', ' ')}</strong><small>Premiere at absolute week {commission.releasePlan.premiereAtAbsoluteWeek}</small></div>
                  <BadgeCheck size={19} />
                </div>
              ) : (
                <>
                  <label><span>Audience footprint</span><select value={releaseScope} onChange={event => setReleaseScope(event.target.value as StreamingOriginalReleaseScope)}>
                    {(['DOMESTIC', 'MULTI_REGION', 'GLOBAL'] as StreamingOriginalReleaseScope[]).map(scope => <option key={scope} value={scope}>{releaseScopeLabel[scope]}</option>)}
                  </select></label>
                  {commission.projectType === 'SERIES' ? (
                    <label><span>Release rhythm</span><select value={releasePattern} onChange={event => setReleasePattern(event.target.value as StreamingOriginalReleasePattern)}>
                      <option value="FULL_SEASON">Full-season binge</option>
                      <option value="WEEKLY">Weekly episodes</option>
                      <option value="SPLIT_VOLUME">Split volume</option>
                    </select></label>
                  ) : null}
                  <label><span>Launch weight</span><select value={marketingPlan} onChange={event => setMarketingPlan(event.target.value as StreamingSlateMarketingPlan)}>
                    <option value="LEAN">Lean support</option>
                    <option value="STANDARD">Standard campaign</option>
                    <option value="EVENT">Event launch</option>
                  </select></label>
                  <button type="button" disabled={!canAuthorizeRelease} onClick={authorizeRelease}>Authorize next-week premiere <RadioTower size={17} /></button>
                  <small>{!localizationReady ? 'A ready localization master is required.' : selected.liveStatus !== 'DELIVERED' ? 'Production must reach delivered status.' : 'Release authorization moves the existing project into its canonical release week.'}</small>
                </>
              )}
            </article>

            <article className="originals-command-card is-analysis">
              <header><LineChart size={18} /><div><span>PERFORMANCE LAB</span><h2>{selected.measuredWeeks ? `${selected.measuredWeeks} measured weeks` : 'Awaiting live telemetry'}</h2></div></header>
              <div className="originals-evidence-meter">
                <span style={{ width: `${Math.min(100, selected.measuredWeeks / 4 * 100)}%` }} />
              </div>
              <p>{selected.evidenceSummary}</p>
              {commission.canonicalProjectId && selected.liveStatus === 'RELEASED' ? (
                <div className="originals-inline-actions">
                  <button type="button" onClick={() => onOpenTitleDossier(commission.canonicalProjectId!)}>Open dossier <LineChart size={16} /></button>
                  <button type="button" onClick={() => onOpenPromotion(commission.canonicalProjectId!)}>Growth room <Megaphone size={16} /></button>
                </div>
              ) : (
                <small>Unknown performance stays unknown; no zero-filled report is shown.</small>
              )}
            </article>
          </section>

          <section className={`originals-future-room ${selected.decisionReady ? 'is-ready' : ''}`}>
            <header>
              <div><CircleDot size={18} /><span>FUTURE DECISION ROOM</span><h2>{commission.lifecycleDecision ? 'The next move is committed.' : selected.decisionReady ? 'The audience has answered.' : 'Evidence is still arriving.'}</h2></div>
              <small>{selected.measuredWeeks}/4 decision weeks</small>
            </header>
            {commission.lifecycleDecision ? (
              <div className="originals-decision-stamp">
                <BadgeCheck size={22} />
                <div><strong>{commission.lifecycleDecision.type.replaceAll('_', ' ')}</strong><span>{commission.lifecycleDecision.evidenceSummary}</span></div>
              </div>
            ) : (
              <div className="originals-decision-grid">
                {FUTURE_DECISIONS.map(decision => (
                  <button type="button" key={decision.id} disabled={!selected.decisionReady} onClick={() => decideFuture(decision.id)}>
                    <span>{decision.id.replace('_', ' ')}</span>
                    <strong>{decision.label}</strong>
                    <p>{decision.description}</p>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            )}
          </section>
          {feedback ? <p className="originals-feedback" role="status"><RefreshCw size={15} /> {feedback}</p> : null}
        </main>
      </div>
    </AccessibleDialog>
  );
}
