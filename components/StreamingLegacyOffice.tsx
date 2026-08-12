import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Crown,
  Film,
  Gem,
  History,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  UserRoundCog,
  UsersRound,
  X,
} from 'lucide-react';
import type { Player, StreamingEraMandate } from '../types';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import {
  STREAMING_ERA_MANDATES,
  STREAMING_LEGACY_IDENTITIES,
  beginNextStreamingEra,
  createStreamingLegacyMontage,
  enactStreamingSuccession,
  getStreamingLegacyOffice,
  planStreamingSuccession,
} from '../services/streamingLegacy';
import '../styles/streaming-legacy-office.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
}

type LegacyTab = 'HISTORY' | 'SUCCESSION' | 'FILM' | 'ENDLESS';

const tabs: Array<{ id: LegacyTab; label: string; icon: typeof History }> = [
  { id: 'HISTORY', label: 'History', icon: History },
  { id: 'SUCCESSION', label: 'Succession', icon: UsersRound },
  { id: 'FILM', label: 'Legacy Film', icon: Film },
  { id: 'ENDLESS', label: 'New Eras', icon: InfinityIcon },
];

const formatCount = (value: number): string => (
  value >= 1_000_000_000 ? `${(value / 1_000_000_000).toFixed(1)}B`
    : value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
      : value.toLocaleString()
);

const formatMoney = (value: number): string => (
  value >= 1_000_000_000 ? `$${(value / 1_000_000_000).toFixed(1)}B`
    : value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M`
      : `$${value.toLocaleString()}`
);

export default function StreamingLegacyOffice({ player, onUpdatePlayer, onClose }: Props) {
  const platform = player.ownedStreamingPlatform;
  const office = useMemo(() => getStreamingLegacyOffice(player), [player]);
  const [activeTab, setActiveTab] = useState<LegacyTab>('HISTORY');
  const [candidateId, setCandidateId] = useState(platform.legacy.successionPlan?.candidateId || '');
  const [mandate, setMandate] = useState<StreamingEraMandate>(platform.legacy.successionPlan?.mandate || platform.legacy.currentMandate);
  const [feedback, setFeedback] = useState('');
  const [showMontage, setShowMontage] = useState(false);
  const [montageIndex, setMontageIndex] = useState(0);
  const selectedCandidate = office.candidates.find(item => item.id === candidateId) || null;
  const montage = platform.legacy.montages.at(-1) || office.latestMontage;
  const identity = STREAMING_LEGACY_IDENTITIES[office.identity];
  const currentMandate = STREAMING_ERA_MANDATES.find(item => item.id === platform.legacy.currentMandate)!;

  const commitPlan = () => {
    if (!selectedCandidate) {
      setFeedback('Choose the person who should carry the next chapter.');
      return;
    }
    const result = planStreamingSuccession(player, selectedCandidate.type, selectedCandidate.id, mandate);
    if (!result.changed) {
      setFeedback('That succession plan could not be recorded.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(
      selectedCandidate.type === 'FAMILY_HEIR'
        ? `${selectedCandidate.name} is designated. The existing family legacy handoff will activate this plan.`
        : `${selectedCandidate.name} is now the named successor. You still decide when the CEO transition happens.`,
    );
  };

  const enact = (role: 'EXECUTIVE_CHAIR' | 'FOUNDER_EMERITUS') => {
    const result = enactStreamingSuccession(player, role);
    if (!result.changed) {
      setFeedback(result.reason === 'FAMILY_HANDOFF_REQUIRED'
        ? 'A family heir takes control through the existing Continue as Child legacy flow. The platform will transfer with the dynasty.'
        : 'Designate an active executive before opening the transition ceremony.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(role === 'EXECUTIVE_CHAIR'
      ? 'The successor is CEO. You remain controlling owner and Executive Chair.'
      : 'The successor is CEO. You remain controlling owner as Founder Emeritus.');
  };

  const createFilm = () => {
    const result = createStreamingLegacyMontage(player);
    if (result.changed) onUpdatePlayer(result.player);
    if (!result.montage) {
      setFeedback('The archive needs at least one verified company event before it can cut a film.');
      return;
    }
    setMontageIndex(0);
    setShowMontage(true);
  };

  const closeMontage = () => {
    const queued = player.ownedStreamingPlatform.cinematicQueue.find(item => item.type === 'LEGACY_MONTAGE' && item.status === 'QUEUED');
    if (queued) {
      onUpdatePlayer({
        ...player,
        ownedStreamingPlatform: markOwnedStreamingCinematicStatus(player.ownedStreamingPlatform, queued.id, 'VIEWED'),
      });
    }
    setShowMontage(false);
  };

  const openNewEra = () => {
    const result = beginNextStreamingEra(player, mandate);
    if (!result.changed) {
      setFeedback(`This era is only ${office.currentEraWeeks} weeks old. Let it build at least 12 weeks of real history first.`);
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(`Era ${platform.legacy.currentEraNumber + 1} has begun under the ${STREAMING_ERA_MANDATES.find(item => item.id === mandate)?.label} mandate.`);
  };

  return (
    <div className="legacy-office-shell" role="dialog" aria-modal="true" aria-labelledby="legacy-office-title">
      <header className="legacy-topbar">
        <button type="button" onClick={onClose} aria-label="Close Legacy Office"><ArrowLeft size={20} /> Back to Company</button>
        <div>
          <span>EMPIRE+ ARCHIVES</span>
          <strong>{platform.identity?.name}</strong>
        </div>
        <span className="legacy-era-chip">ERA {platform.legacy.currentEraNumber}</span>
      </header>

      <main className="legacy-office-main">
        <section className="legacy-hero" style={{ '--legacy-brand': platform.identity?.primaryColor } as React.CSSProperties}>
          <div className="legacy-hero-light" aria-hidden="true" />
          <div className="legacy-gallery-wall" aria-hidden="true">
            <i /><i /><i /><i /><i />
            <span className="legacy-gallery-seal"><Crown size={32} /></span>
          </div>
          <div className="legacy-hero-copy">
            <span className="legacy-kicker"><Gem size={14} /> YOUR PLATFORM LEGACY</span>
            <h1 id="legacy-office-title">{identity.label}</h1>
            <p>{identity.title}</p>
            <small>{identity.description}</small>
          </div>
          <div className="legacy-hero-score">
            <span>THE RECORD SO FAR</span>
            <strong>{office.milestones.length}</strong>
            <small>verified defining moments</small>
          </div>
        </section>

        <nav className="legacy-tabs" aria-label="Legacy Office sections">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button type="button" key={tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>
                <Icon size={17} /><span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {activeTab === 'HISTORY' ? (
          <section className="legacy-panel">
            <div className="legacy-section-heading">
              <div><span>THE COMPANY RECORD</span><h2>Every defining signal, in order.</h2></div>
              <p>The archive reads the same canonical facts used by finance, rights, technology, awards and crises. It does not invent achievements.</p>
            </div>
            {office.milestones.length ? (
              <div className="legacy-timeline" aria-label="Platform history">
                {office.milestones.map((item, index) => (
                  <article key={item.id} className="legacy-milestone">
                    <div className="legacy-milestone-number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="legacy-milestone-art" aria-hidden="true"><span /><i /><Star size={18} /></div>
                    <span>COMPANY WEEK {Math.max(1, item.absoluteWeek - (platform.identity?.foundedAtAbsoluteWeek || item.absoluteWeek) + 1)}</span>
                    <h3>{item.title}</h3>
                    <p>{item.caption}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="legacy-empty"><History size={26} /><h3>The first frame is still being shot.</h3><p>Founding, launch, Originals and other verified company facts will appear here.</p></div>
            )}
            <div className="legacy-era-ledger">
              <article><span>Current leader</span><strong>{office.activeLeaderName}</strong><small>{platform.legacy.founderOfficeRole.replace(/_/g, ' ')}</small></article>
              <article><span>Current mandate</span><strong>{currentMandate.label}</strong><small>{office.currentEraWeeks} weeks in this era</small></article>
              <article><span>Audience now</span><strong>{formatCount(platform.metrics.subscribers)}</strong><small>{(platform.metrics.engagementRate * 100).toFixed(0)}% engagement</small></article>
              <article><span>Company value signal</span><strong>{formatMoney(platform.treasuryCash)}</strong><small>{platform.founderOwnershipPercent}% founder ownership</small></article>
            </div>
          </section>
        ) : null}

        {activeTab === 'SUCCESSION' ? (
          <section className="legacy-panel">
            <div className="legacy-section-heading">
              <div><span>SUCCESSION STUDIO</span><h2>Choose who carries the signal.</h2></div>
              <p>Designation never ends your career. An executive can run operations while you remain owner; a family heir activates through the existing dynasty handoff.</p>
            </div>
            {office.candidates.length ? (
              <div className="legacy-candidates">
                {office.candidates.map(candidate => (
                  <button type="button" key={`${candidate.type}-${candidate.id}`} className={candidateId === candidate.id ? 'is-selected' : ''} onClick={() => setCandidateId(candidate.id)}>
                    <span className="legacy-candidate-avatar">{candidate.type === 'EXECUTIVE' ? <UserRoundCog size={24} /> : <CircleUserRound size={24} />}</span>
                    <div><span>{candidate.type === 'EXECUTIVE' ? 'EXECUTIVE BENCH' : 'FAMILY DYNASTY'}</span><strong>{candidate.name}</strong><small>{candidate.role}</small></div>
                    <b>{candidate.readinessScore}<small>READY</small></b>
                    <p>{candidate.readinessNote}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="legacy-empty"><UsersRound size={26} /><h3>No successor bench yet.</h3><p>Hire an executive in Leadership Suite or build a family legacy before designating the next chapter.</p></div>
            )}
            <MandatePicker value={mandate} onChange={setMandate} />
            <div className="legacy-succession-actions">
              <button type="button" className="is-primary" onClick={commitPlan} disabled={!selectedCandidate}><BadgeCheck size={18} /> Record succession plan</button>
              {platform.legacy.successionPlan?.candidateType === 'EXECUTIVE' && platform.legacy.successionPlan.status === 'DESIGNATED' ? (
                <>
                  <button type="button" onClick={() => enact('EXECUTIVE_CHAIR')}><Crown size={18} /> Transition • become Chair</button>
                  <button type="button" onClick={() => enact('FOUNDER_EMERITUS')}><Sparkles size={18} /> Transition • become Emeritus</button>
                </>
              ) : null}
            </div>
            <aside className="legacy-truth-note"><BadgeCheck size={17} /><p><strong>Ownership does not disappear.</strong> CEO authority and equity control are separate. Your actual founder ownership remains {platform.founderOwnershipPercent}% unless a real financing or market action changes it.</p></aside>
          </section>
        ) : null}

        {activeTab === 'FILM' ? (
          <section className="legacy-panel legacy-film-panel">
            <div className="legacy-film-stage" style={{ '--legacy-brand': platform.identity?.primaryColor } as React.CSSProperties}>
              <div className="legacy-film-frames" aria-hidden="true"><i /><i /><i /></div>
              <span>AN EMPIRE+ ARCHIVE FILM</span>
              <h2>{montage?.title || 'The Signal We Built'}</h2>
              <p>{montage ? `${montage.chapters.length} verified chapters • ${STREAMING_LEGACY_IDENTITIES[montage.identity].label}` : 'Your founding, launch, breakthroughs, recoveries and defining choices — cut from real saved history.'}</p>
              <button type="button" onClick={createFilm}><Play size={18} /> {montage ? 'Replay legacy film' : 'Create my legacy film'}</button>
            </div>
            <div className="legacy-film-rules">
              <article><Film size={19} /><div><strong>Personalized</strong><p>Your name, brand, facts and outcomes.</p></div></article>
              <article><BadgeCheck size={19} /><div><strong>Evidence-backed</strong><p>No fabricated awards or fake milestones.</p></div></article>
              <article><RotateCcw size={19} /><div><strong>Replayable</strong><p>The archive remains available in every era.</p></div></article>
            </div>
          </section>
        ) : null}

        {activeTab === 'ENDLESS' ? (
          <section className="legacy-panel">
            <div className="legacy-section-heading">
              <div><span>ENDLESS COMPANY</span><h2>The founding chapter ends. The company does not.</h2></div>
              <p>Every era archives its leader, mandate, subscribers, treasury, prestige, trust and verified highlights before the next one begins.</p>
            </div>
            <div className="legacy-era-track">
              {platform.legacy.closedEras.map(era => (
                <article key={era.id}>
                  <span>ERA {era.eraNumber} • ARCHIVED</span>
                  <h3>{era.title}</h3>
                  <p>{era.leaderName} • {STREAMING_ERA_MANDATES.find(item => item.id === era.mandate)?.label}</p>
                  <dl><div><dt>Audience</dt><dd>{formatCount(era.subscriberEnd)}</dd></div><div><dt>Trust</dt><dd>{era.publicTrustEnd.toFixed(0)}</dd></div><div><dt>Identity</dt><dd>{STREAMING_LEGACY_IDENTITIES[era.legacyIdentity].label}</dd></div></dl>
                </article>
              ))}
              <article className="is-current">
                <span>ERA {platform.legacy.currentEraNumber} • LIVE</span>
                <h3>{currentMandate.label}</h3>
                <p>{office.activeLeaderName} • {office.currentEraWeeks} operating weeks</p>
                <dl><div><dt>Audience</dt><dd>{formatCount(platform.metrics.subscribers)}</dd></div><div><dt>Trust</dt><dd>{platform.crisisSecurity.publicTrust.toFixed(0)}</dd></div><div><dt>Future</dt><dd>Open</dd></div></dl>
              </article>
            </div>
            <MandatePicker value={mandate} onChange={setMandate} />
            <div className="legacy-new-era-action">
              <div><InfinityIcon size={24} /><span><strong>Open the next strategic era</strong><small>{office.canOpenNewEra ? 'The current chapter has enough operating history to archive.' : `${12 - office.currentEraWeeks} more game weeks before this era can close.`}</small></span></div>
              <button type="button" onClick={openNewEra} disabled={!office.canOpenNewEra}>Begin Era {platform.legacy.currentEraNumber + 1} <ChevronRight size={17} /></button>
            </div>
          </section>
        ) : null}

        {feedback ? <p className="legacy-feedback" role="status">{feedback}</p> : null}
      </main>

      {showMontage && montage ? (
        <div className="legacy-montage" role="dialog" aria-modal="true" aria-label={montage.title}>
          <button type="button" className="legacy-montage-close" onClick={closeMontage} aria-label="Close legacy film"><X size={22} /></button>
          <div className="legacy-montage-grain" aria-hidden="true" />
          <div className="legacy-montage-brand">
            <span>EMPIRE+ ORIGINAL ARCHIVE</span>
            <strong>{platform.identity?.name}</strong>
          </div>
          <section key={montage.chapters[montageIndex].id} className="legacy-montage-chapter">
            <span>CHAPTER {montageIndex + 1} OF {montage.chapters.length}</span>
            <div className="legacy-montage-image" aria-hidden="true"><i /><i /><i /><Sparkles size={38} /></div>
            <h2>{montage.chapters[montageIndex].title}</h2>
            <p>{montage.chapters[montageIndex].caption}</p>
          </section>
          <footer>
            <button type="button" onClick={() => setMontageIndex(index => Math.max(0, index - 1))} disabled={montageIndex === 0}><ChevronLeft size={20} /> Previous</button>
            <div>{montage.chapters.map((chapter, index) => <button type="button" key={chapter.id} onClick={() => setMontageIndex(index)} className={index === montageIndex ? 'is-active' : ''} aria-label={`Go to chapter ${index + 1}`} />)}</div>
            {montageIndex < montage.chapters.length - 1 ? (
              <button type="button" onClick={() => setMontageIndex(index => index + 1)}>Next <ChevronRight size={20} /></button>
            ) : (
              <button type="button" onClick={closeMontage}>Enter the next era <InfinityIcon size={20} /></button>
            )}
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function MandatePicker({ value, onChange }: { value: StreamingEraMandate; onChange: (value: StreamingEraMandate) => void }) {
  return (
    <section className="legacy-mandates">
      <div><span>NEXT ERA MANDATE</span><h3>What should this leadership chapter stand for?</h3></div>
      <div className="legacy-mandate-grid">
        {STREAMING_ERA_MANDATES.map(item => (
          <button type="button" key={item.id} className={value === item.id ? 'is-selected' : ''} onClick={() => onChange(item.id)}>
            <span>{item.label}</span><strong>{item.promise}</strong><small>{item.weeklyEffect}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
