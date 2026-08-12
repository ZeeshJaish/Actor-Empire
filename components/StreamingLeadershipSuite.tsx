import React, { useEffect, useMemo, useReducer, useState, type CSSProperties } from 'react';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Gavel,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Megaphone,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCog,
  UserPlus,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import type {
  OwnedStreamingExecutiveAppointment,
  Player,
  StreamingBoardMotionId,
  StreamingExecutiveDevelopmentTrack,
  StreamingExecutiveRole,
} from '../types';
import StreamingVisualScene from './StreamingVisualScene';
import {
  STREAMING_BOARD_MOTIONS,
  STREAMING_CELEBRITY_INVESTOR_OFFERS,
  STREAMING_EXECUTIVE_DEVELOPMENT_PROGRAMS,
  STREAMING_EXECUTIVE_ROLE_LABELS,
  STREAMING_EXECUTIVE_ROLE_ORDER,
  STREAMING_INDEPENDENT_DIRECTORS,
  STREAMING_INTERNAL_PROMOTION_CANDIDATES,
  acceptStreamingCelebrityInvestment,
  appointStreamingExternalExecutive,
  appointStreamingIndependentDirector,
  callStreamingBoardVote,
  dismissStreamingExecutive,
  getExternalStreamingExecutiveCandidates,
  getStreamingLeadershipSuite,
  promoteStreamingInternalExecutive,
  startStreamingExecutiveDevelopment,
  updateStreamingDelegationMandate,
} from '../services/streamingLeadershipGovernance';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import '../styles/streaming-leadership-suite.css';

type LeadershipView = 'ORG' | 'TALENT' | 'DELEGATION' | 'BOARD' | 'INVESTORS';
type TalentSource = 'EXTERNAL' | 'INTERNAL';

interface LeadershipUiState {
  view: LeadershipView;
  talentSource: TalentSource;
  selectedExecutiveId: string | null;
}

type LeadershipUiAction =
  | { type: 'VIEW'; view: LeadershipView }
  | { type: 'SOURCE'; source: TalentSource }
  | { type: 'EXECUTIVE'; executiveId: string | null };

const uiReducer = (state: LeadershipUiState, action: LeadershipUiAction): LeadershipUiState => {
  if (action.type === 'VIEW') return { ...state, view: action.view };
  if (action.type === 'SOURCE') return { ...state, talentSource: action.source };
  return { ...state, selectedExecutiveId: action.executiveId };
};

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenTechnology?: () => void;
  onOpenContent?: () => void;
}

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
};

const ROLE_ICONS: Record<StreamingExecutiveRole, LucideIcon> = {
  COO: Network,
  CFO: CircleDollarSign,
  CTO: UserCog,
  CHIEF_CONTENT_OFFICER: Sparkles,
  PRODUCT_HEAD: Target,
  MARKETING_HEAD: Megaphone,
  ADVERTISING_HEAD: TrendingUp,
  INTERNATIONAL_HEAD: Globe2,
  SECURITY_TRUST_HEAD: ShieldCheck,
};

const ROLE_ACCENTS: Record<StreamingExecutiveRole, string> = {
  COO: '#7dd3fc',
  CFO: '#facc15',
  CTO: '#67e8f9',
  CHIEF_CONTENT_OFFICER: '#f0abfc',
  PRODUCT_HEAD: '#a78bfa',
  MARKETING_HEAD: '#fb7185',
  ADVERTISING_HEAD: '#4ade80',
  INTERNATIONAL_HEAD: '#60a5fa',
  SECURITY_TRUST_HEAD: '#2dd4bf',
};

const TRAITS: Array<{ key: keyof Pick<OwnedStreamingExecutiveAppointment, 'skill' | 'loyalty' | 'ambition' | 'ethics' | 'founderRelationship' | 'performance'>; label: string }> = [
  { key: 'skill', label: 'Skill' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'ambition', label: 'Ambition' },
  { key: 'ethics', label: 'Ethics' },
  { key: 'founderRelationship', label: 'Founder' },
  { key: 'performance', label: 'Performance' },
];

export default function StreamingLeadershipSuite({
  player,
  onUpdatePlayer,
  onClose,
  onOpenTechnology,
  onOpenContent,
}: Props) {
  const suite = useMemo(() => getStreamingLeadershipSuite(player), [player]);
  const platform = player.ownedStreamingPlatform;
  const [ui, dispatch] = useReducer(uiReducer, {
    view: 'ORG',
    talentSource: 'EXTERNAL',
    selectedExecutiveId: suite.activeExecutives[0]?.executiveId || null,
  });
  const [feedback, setFeedback] = useState('');
  const [reviewOfferId, setReviewOfferId] = useState<string | null>(null);
  const mandate = platform.leadership.delegation;
  const [rightsBid, setRightsBid] = useState(mandate.maximumRightsBid);
  const [headroom, setHeadroom] = useState(mandate.minimumCapacityHeadroomPercent);
  const [campaignLimit, setCampaignLimit] = useState(mandate.weeklyCampaignLimit);
  const [renewalFloor, setRenewalFloor] = useState(mandate.renewalMinimumMarginPercent);
  const [incidentPolicy, setIncidentPolicy] = useState(mandate.incidentPolicy);
  const pendingInvestorReveal = platform.cinematicQueue.find(event => (
    event.type === 'CELEBRITY_INVESTOR_REVEAL' && event.status === 'QUEUED'
  ));
  const acceptedInvestorForReveal = platform.governance.celebrityInvestors.at(-1);
  const selectedExecutive = suite.activeExecutives.find(item => item.executiveId === ui.selectedExecutiveId) || null;
  const reviewedOffer = STREAMING_CELEBRITY_INVESTOR_OFFERS.find(item => item.id === reviewOfferId) || null;

  useEffect(() => {
    setRightsBid(mandate.maximumRightsBid);
    setHeadroom(mandate.minimumCapacityHeadroomPercent);
    setCampaignLimit(mandate.weeklyCampaignLimit);
    setRenewalFloor(mandate.renewalMinimumMarginPercent);
    setIncidentPolicy(mandate.incidentPolicy);
  }, [
    mandate.incidentPolicy,
    mandate.maximumRightsBid,
    mandate.minimumCapacityHeadroomPercent,
    mandate.renewalMinimumMarginPercent,
    mandate.weeklyCampaignLimit,
  ]);

  const applyResult = (result: { player: Player; changed: boolean; reason?: string }, success: string) => {
    if (!result.changed) {
      const messages: Record<string, string> = {
        ROLE_FILLED: 'That executive seat is already occupied.',
        PROGRAM_ACTIVE: 'This executive already has a development program in progress.',
        INSUFFICIENT_TREASURY: 'Company treasury cannot cover this decision.',
        BOARD_FULL: 'The independent board seats are already filled.',
        ALREADY_APPOINTED: 'That director already sits on the board.',
        CONTROL_LIMIT: 'This round would reduce founder control below 51%.',
        ALREADY_DECIDED: 'That investment offer already has a permanent decision.',
        COOLDOWN: 'This motion cannot return to the table for four game weeks.',
        NO_EXECUTIVES: 'Appoint at least one executive before creating delegated authority.',
      };
      setFeedback(messages[result.reason || ''] || 'That leadership action could not be completed.');
      return;
    }
    setFeedback(success);
    onUpdatePlayer(result.player);
  };

  const hireExternal = (candidateId: string) => {
    applyResult(appointStreamingExternalExecutive(player, candidateId), 'The external appointment is now part of the permanent organization.');
  };

  const promoteInternal = (candidateId: string) => {
    applyResult(promoteStreamingInternalExecutive(player, candidateId), 'The internal promotion is official. Loyalty starts higher; mastery must now be developed.');
  };

  const startDevelopment = (track: StreamingExecutiveDevelopmentTrack) => {
    if (!selectedExecutive) return;
    applyResult(
      startStreamingExecutiveDevelopment(player, selectedExecutive.executiveId, track),
      `${selectedExecutive.nameAtAppointment} entered a game-week development program.`,
    );
  };

  const saveMandate = () => {
    applyResult(updateStreamingDelegationMandate(player, {
      maximumRightsBid: rightsBid,
      minimumCapacityHeadroomPercent: headroom,
      weeklyCampaignLimit: campaignLimit,
      renewalMinimumMarginPercent: renewalFloor,
      incidentPolicy,
    }), 'Delegation boundaries are live and recorded in the company ledger.');
  };

  const acceptInvestment = () => {
    if (!reviewedOffer) return;
    const result = acceptStreamingCelebrityInvestment(player, reviewedOffer.id);
    setReviewOfferId(null);
    applyResult(result, `${reviewedOffer.name} joined the cap table. The treasury, ownership and governance records changed together.`);
  };

  const closeInvestorReveal = (status: 'VIEWED' | 'DISMISSED', enterBoard = false) => {
    if (!pendingInvestorReveal) return;
    onUpdatePlayer({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        platform,
        pendingInvestorReveal.id,
        status,
      ),
    });
    if (enterBoard) dispatch({ type: 'VIEW', view: 'BOARD' });
  };

  const renderOrg = () => (
    <>
      <header className="leadership-page-heading">
        <span>ORGANIZATION CHART</span>
        <h2>The company now has faces, loyalties and ambition.</h2>
        <p>Every seat adds capability and weekly cost. Empty roles remain under direct founder control.</p>
      </header>
      <section className="leadership-org-chart" aria-label="EMPIRE+ organization chart">
        <article className="leadership-founder-node">
          <span><Crown size={22} /></span>
          <div><small>FOUNDER • OWNER • CEO</small><strong>{player.name}</strong><p>{platform.founderOwnershipPercent}% voting control</p></div>
          <i>{suite.boardModeLabel}</i>
        </article>
        <div className="leadership-org-spine" aria-hidden="true" />
        <div className="leadership-role-grid">
          {STREAMING_EXECUTIVE_ROLE_ORDER.map(role => {
            const executive = suite.activeExecutives.find(item => item.role === role);
            const Icon = ROLE_ICONS[role];
            return (
              <button
                type="button"
                key={role}
                className={executive ? 'is-filled' : 'is-vacant'}
                style={{ '--leadership-role-accent': ROLE_ACCENTS[role] } as CSSProperties}
                onClick={() => {
                  if (executive) {
                    dispatch({ type: 'EXECUTIVE', executiveId: executive.executiveId });
                  } else {
                    dispatch({ type: 'VIEW', view: 'TALENT' });
                  }
                }}
              >
                <span><Icon size={19} /></span>
                <div><small>{STREAMING_EXECUTIVE_ROLE_LABELS[role]}</small><strong>{executive?.nameAtAppointment || 'Founder authority'}</strong><p>{executive ? `Level ${executive.level} • ${formatMoney(executive.weeklyCompensation)}/wk` : 'Open specialist seat'}</p></div>
                {executive ? <BadgeCheck size={17} /> : <UserPlus size={17} />}
              </button>
            );
          })}
        </div>
      </section>
      <section className="leadership-operating-strip">
        <article><UsersRound size={18} /><span>Executive seats</span><strong>{suite.activeExecutives.length}/9</strong></article>
        <article><Banknote size={18} /><span>Leadership run rate</span><strong>{formatMoney(suite.weeklyExecutiveCost + suite.weeklyBoardCost)}/wk</strong></article>
        <article><Scale size={18} /><span>Board power</span><strong>{suite.boardBinding ? 'Binding' : 'Advisory'}</strong></article>
        <article><Activity size={18} /><span>Board confidence</span><strong>{suite.boardConfidence}/100</strong></article>
      </section>
      {selectedExecutive ? (
        <section className="leadership-executive-dossier">
          <header>
            <div className="leadership-avatar">{selectedExecutive.nameAtAppointment.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</div>
            <div><span>{STREAMING_EXECUTIVE_ROLE_LABELS[selectedExecutive.role]}</span><h3>{selectedExecutive.nameAtAppointment}</h3><p>{selectedExecutive.origin === 'INTERNAL_PROMOTION' ? 'Promoted from inside EMPIRE+' : 'External appointment'} • Level {selectedExecutive.level}</p></div>
            <button type="button" onClick={() => {
              applyResult(
                dismissStreamingExecutive(player, selectedExecutive.executiveId),
                `${selectedExecutive.nameAtAppointment} has left the active organization.`,
              );
              dispatch({ type: 'EXECUTIVE', executiveId: null });
            }}>Dismiss</button>
          </header>
          <div className="leadership-trait-grid">
            {TRAITS.map(trait => (
              <div key={trait.key}>
                <span>{trait.label}<strong>{selectedExecutive[trait.key]}</strong></span>
                <i><b style={{ width: `${selectedExecutive[trait.key]}%` }} /></i>
              </div>
            ))}
          </div>
          <div className="leadership-strategy-line">
            <span>Preferred strategy</span><strong>{selectedExecutive.preferredStrategy.replaceAll('_', ' ')}</strong>
            <span>Experience</span><strong>{selectedExecutive.experience} XP</strong>
          </div>
          <div className="leadership-development-grid">
            {STREAMING_EXECUTIVE_DEVELOPMENT_PROGRAMS.map(program => {
              const activeProgram = platform.leadership.developmentPrograms.find(item => (
                item.executiveId === selectedExecutive.executiveId
                && item.status === 'IN_PROGRESS'
              ));
              return (
                <button type="button" key={program.id} disabled={Boolean(activeProgram)} onClick={() => startDevelopment(program.id)}>
                  <GraduationCap size={18} />
                  <span><strong>{program.title}</strong><small>{program.effectLabel}</small></span>
                  <i>{activeProgram?.track === program.id ? `Week ${activeProgram.readyAtAbsoluteWeek}` : `${formatMoney(program.capitalCost)} • ${program.developmentWeeks}w`}</i>
                </button>
              );
            })}
          </div>
          <p className="leadership-timer-truth">Development advances only through Actor Empire game weeks. There are no real-time timers or paid skips.</p>
        </section>
      ) : null}
    </>
  );

  const renderTalent = () => {
    const candidates = ui.talentSource === 'EXTERNAL'
      ? getExternalStreamingExecutiveCandidates()
      : STREAMING_INTERNAL_PROMOTION_CANDIDATES;
    return (
      <>
        <header className="leadership-page-heading">
          <span>EXECUTIVE SEARCH</span>
          <h2>Buy experience or promote belief.</h2>
          <p>External leaders begin with higher skill. Internal promotions cost less and begin with stronger loyalty and team relationships.</p>
        </header>
        <div className="leadership-source-switch" role="group" aria-label="Talent source">
          <button type="button" className={ui.talentSource === 'EXTERNAL' ? 'is-active' : ''} onClick={() => dispatch({ type: 'SOURCE', source: 'EXTERNAL' })}>External market</button>
          <button type="button" className={ui.talentSource === 'INTERNAL' ? 'is-active' : ''} onClick={() => dispatch({ type: 'SOURCE', source: 'INTERNAL' })}>Internal promotions</button>
        </div>
        <section className="leadership-talent-grid">
          {candidates.map(candidate => {
            const roleFilled = !suite.openRoles.includes(candidate.role);
            const isExternal = ui.talentSource === 'EXTERNAL';
            const external = candidate as ReturnType<typeof getExternalStreamingExecutiveCandidates>[number];
            const internal = candidate as typeof STREAMING_INTERNAL_PROMOTION_CANDIDATES[number];
            return (
              <article key={candidate.id} className={roleFilled ? 'is-filled' : ''}>
                <header>
                  <span>{candidate.initials}</span>
                  <div><small>{isExternal ? 'EXECUTIVE MARKET' : internal.currentTitle}</small><h3>{candidate.name}</h3><p>{candidate.roleLabel} • {candidate.specialty}</p></div>
                  {roleFilled ? <BadgeCheck size={18} /> : null}
                </header>
                <div className="leadership-candidate-traits">
                  <span>Skill <strong>{candidate.skill}</strong></span>
                  <span>Loyalty <strong>{candidate.loyalty}</strong></span>
                  <span>Ambition <strong>{candidate.ambition}</strong></span>
                  <span>Ethics <strong>{candidate.ethics}</strong></span>
                </div>
                <p>{isExternal ? external.strength : `Proven inside the company with ${internal.specialty.toLowerCase()} experience.`}</p>
                <aside>{isExternal ? external.caution : 'Lower starting mastery; development can raise the ceiling.'}</aside>
                <footer>
                  <span>{formatMoney(candidate.weeklyCompensation)}/week</span>
                  <button type="button" disabled={roleFilled} onClick={() => isExternal ? hireExternal(candidate.id) : promoteInternal(candidate.id)}>
                    {roleFilled ? 'Seat filled' : isExternal ? 'Appoint' : 'Promote'} <ChevronRight size={15} />
                  </button>
                </footer>
              </article>
            );
          })}
        </section>
      </>
    );
  };

  const renderDelegation = () => (
    <>
      <header className="leadership-page-heading">
        <span>DELEGATION MANDATE</span>
        <h2>Authority needs a ceiling.</h2>
        <p>Executives can operate inside these boundaries. Anything above them returns to the founder instead of happening invisibly.</p>
      </header>
      <section className="leadership-mandate-grid">
        <label className={!suite.delegationCoverage.RIGHTS ? 'is-locked' : ''}>
          <span><Sparkles size={17} /><strong>Maximum rights bid</strong><i>{suite.delegationCoverage.RIGHTS ? 'CFO / Content' : 'Needs CFO or Content Chief'}</i></span>
          <input type="range" min={5_000_000} max={250_000_000} step={5_000_000} value={rightsBid} disabled={!suite.delegationCoverage.RIGHTS} onChange={event => setRightsBid(Number(event.target.value))} />
          <output>{formatMoney(rightsBid)}</output>
          <p>Deals above this threshold require your direct review.</p>
        </label>
        <label className={!suite.delegationCoverage.CAPACITY ? 'is-locked' : ''}>
          <span><Network size={17} /><strong>Minimum capacity headroom</strong><i>{suite.delegationCoverage.CAPACITY ? 'CTO / COO' : 'Needs CTO or COO'}</i></span>
          <input type="range" min={5} max={60} step={5} value={headroom} disabled={!suite.delegationCoverage.CAPACITY} onChange={event => setHeadroom(Number(event.target.value))} />
          <output>{headroom}%</output>
          <p>Expansion returns to you when forecast headroom falls below this floor.</p>
        </label>
        <label className={!suite.delegationCoverage.CAMPAIGNS ? 'is-locked' : ''}>
          <span><Megaphone size={17} /><strong>Weekly campaign authority</strong><i>{suite.delegationCoverage.CAMPAIGNS ? 'Marketing / COO' : 'Needs Marketing Head or COO'}</i></span>
          <input type="range" min={1_000_000} max={50_000_000} step={1_000_000} value={campaignLimit} disabled={!suite.delegationCoverage.CAMPAIGNS} onChange={event => setCampaignLimit(Number(event.target.value))} />
          <output>{formatMoney(campaignLimit)}</output>
          <p>The team can approve campaigns only inside this weekly envelope.</p>
        </label>
        <label className={!suite.delegationCoverage.RENEWALS ? 'is-locked' : ''}>
          <span><CircleDollarSign size={17} /><strong>Renewal margin floor</strong><i>{suite.delegationCoverage.RENEWALS ? 'CFO / Content' : 'Needs CFO or Content Chief'}</i></span>
          <input type="range" min={0} max={50} step={5} value={renewalFloor} disabled={!suite.delegationCoverage.RENEWALS} onChange={event => setRenewalFloor(Number(event.target.value))} />
          <output>{renewalFloor}%</output>
          <p>Rights renewals below the contribution floor require founder review.</p>
        </label>
        <fieldset className={!suite.delegationCoverage.INCIDENTS ? 'is-locked' : ''}>
          <legend><ShieldCheck size={17} /> Incident policy <i>{suite.delegationCoverage.INCIDENTS ? 'Security / COO' : 'Needs Security Head or COO'}</i></legend>
          {([
            ['CONTAIN_FIRST', 'Contain first', 'Limit exposure before speaking.'],
            ['SERVICE_FIRST', 'Service first', 'Restore viewers before the narrative.'],
            ['TRANSPARENT_FIRST', 'Transparent first', 'Lead with disclosure and trust.'],
          ] as const).map(option => (
            <button type="button" key={option[0]} disabled={!suite.delegationCoverage.INCIDENTS} className={incidentPolicy === option[0] ? 'is-active' : ''} onClick={() => setIncidentPolicy(option[0])}>
              <strong>{option[1]}</strong><span>{option[2]}</span>
            </button>
          ))}
        </fieldset>
      </section>
      {suite.alerts.length ? (
        <aside className="leadership-alert-stack">
          {suite.alerts.map(alert => <p key={alert}><Activity size={15} />{alert}</p>)}
        </aside>
      ) : null}
      <button type="button" className="leadership-primary-action" disabled={!suite.activeExecutives.length} onClick={saveMandate}>
        Commit delegation mandate <ChevronRight size={17} />
      </button>
    </>
  );

  const renderBoard = () => (
    <>
      <header className="leadership-page-heading">
        <span>BOARD CHAMBER</span>
        <h2>{suite.boardBinding ? 'Control is now shared.' : 'The board advises. The founder decides.'}</h2>
        <p>{suite.boardBinding
          ? 'Voluntary dilution activated genuine governance. A failed binding vote can now veto a major motion.'
          : 'At 100% founder ownership, directors challenge decisions but cannot overrule the owner.'}</p>
      </header>
      <section className={`leadership-board-table ${suite.boardBinding ? 'is-binding' : ''}`}>
        <div className="leadership-board-ring" aria-hidden="true"><i /><i /><i /></div>
        <article className="is-chair"><Crown size={20} /><span>BOARD CHAIR</span><strong>{player.name}</strong><small>Founder vote</small></article>
        {suite.activeDirectors.map(director => (
          <article key={director.id}><Scale size={19} /><span>{director.seatType.replaceAll('_', ' ')}</span><strong>{director.name}</strong><small>{director.preferredStrategy.replaceAll('_', ' ')}</small></article>
        ))}
        {!suite.activeDirectors.length ? <p>No outside directors. The founder receives only operating-team advice.</p> : null}
      </section>
      <section className="leadership-board-status">
        <article><Gavel size={18} /><span>Governance mode</span><strong>{suite.boardModeLabel}</strong></article>
        <article><Activity size={18} /><span>Board confidence</span><strong>{suite.boardConfidence}/100</strong></article>
        <article><Banknote size={18} /><span>Board run rate</span><strong>{formatMoney(suite.weeklyBoardCost)}/wk</strong></article>
      </section>
      <div className="leadership-section-title"><span>INDEPENDENT DIRECTORS</span><h3>Choose scrutiny before you need it.</h3></div>
      <section className="leadership-director-market">
        {STREAMING_INDEPENDENT_DIRECTORS.map(candidate => {
          const appointed = suite.activeDirectors.some(item => item.candidateId === candidate.id);
          return (
            <article key={candidate.id} className={appointed ? 'is-appointed' : ''}>
              <header><span>{candidate.initials}</span><div><strong>{candidate.name}</strong><small>{candidate.specialty}</small></div></header>
              <p>{candidate.promise}</p><aside>{candidate.friction}</aside>
              <footer><span>{formatMoney(candidate.weeklyCompensation)}/wk</span><button type="button" disabled={appointed} onClick={() => applyResult(appointStreamingIndependentDirector(player, candidate.id), `${candidate.name} joined the board.`)}>{appointed ? 'Appointed' : 'Appoint'}</button></footer>
            </article>
          );
        })}
      </section>
      <div className="leadership-section-title"><span>MAJOR MOTIONS</span><h3>Put authority on the record.</h3></div>
      <section className="leadership-motion-grid">
        {STREAMING_BOARD_MOTIONS.map(motion => {
          const last = platform.governance.motions.filter(item => item.motionId === motion.id).at(-1);
          return (
            <article key={motion.id}>
              <span>{motion.eyebrow}</span><h3>{motion.title}</h3><p>{motion.description}</p>
              <aside>{motion.consequence}</aside>
              {last ? <small className={`is-${last.status.toLowerCase()}`}>{last.status} • {last.binding ? 'Binding vote' : 'Founder authority'}</small> : null}
              <button type="button" onClick={() => applyResult(callStreamingBoardVote(player, motion.id), 'The board vote is resolved and permanently recorded.')}>Call vote <Gavel size={15} /></button>
            </article>
          );
        })}
      </section>
      {platform.governance.motions.length ? (
        <section className="leadership-vote-history">
          <header><Gavel size={17} /><strong>Recent board record</strong></header>
          {platform.governance.motions.slice(-5).reverse().map(motion => (
            <article key={motion.id}><span className={`is-${motion.status.toLowerCase()}`}>{motion.status}</span><div><strong>{motion.title}</strong><p>{motion.consequence}</p></div><small>{motion.votes.filter(vote => vote.vote === 'FOR').length + 1}/{motion.votes.length + 1} for</small></article>
          ))}
        </section>
      ) : null}
    </>
  );

  const renderInvestors = () => (
    <>
      <header className="leadership-page-heading">
        <span>CELEBRITY CAPITAL</span>
        <h2>Attention arrives with a term sheet.</h2>
        <p>Capital and public heat are immediate. Ownership, participation, influence, and board power remain permanent consequences.</p>
      </header>
      <aside className="leadership-control-warning">
        <Crown size={20} />
        <div><strong>{platform.founderOwnershipPercent}% founder ownership</strong><p>Every offer is voluntary. Remaining 100% founder-owned forever is fully valid.</p></div>
      </aside>
      <section className="leadership-investor-grid">
        {STREAMING_CELEBRITY_INVESTOR_OFFERS.map(offer => {
          const decision = platform.governance.celebrityInvestors.find(item => item.candidateId === offer.id);
          return (
            <article key={offer.id} className={decision ? 'is-accepted' : ''}>
              <div className="leadership-investor-stage" aria-hidden="true"><span>{offer.initials}</span><i /><i /></div>
              <header><span>{offer.publicIdentity}</span><h3>{offer.name}</h3><p>{offer.attentionEffect}</p></header>
              <dl>
                <div><dt>Capital</dt><dd>{formatMoney(offer.investedCapital)}</dd></div>
                <div><dt>Equity</dt><dd>{offer.ownershipPercent}%</dd></div>
                <div><dt>Profit participation</dt><dd>{offer.profitParticipationPercent}%</dd></div>
                <div><dt>Board seat</dt><dd>{offer.boardSeat ? 'Required' : 'No'}</dd></div>
              </dl>
              <aside><strong>Influence demand</strong><p>{offer.influenceDemand}</p></aside>
              <footer><span>{offer.caution}</span><button type="button" disabled={Boolean(decision)} onClick={() => setReviewOfferId(offer.id)}>{decision ? 'On cap table' : 'Review term sheet'}<ChevronRight size={15} /></button></footer>
            </article>
          );
        })}
      </section>
    </>
  );

  const views: Record<LeadershipView, () => React.ReactNode> = {
    ORG: renderOrg,
    TALENT: renderTalent,
    DELEGATION: renderDelegation,
    BOARD: renderBoard,
    INVESTORS: renderInvestors,
  };
  const renderView = views[ui.view];

  return (
    <div className="streaming-leadership-suite" role="dialog" aria-modal="true" aria-label="EMPIRE+ Leadership Suite">
      <header className="leadership-topbar">
        <button type="button" aria-label="Close Leadership Suite" onClick={onClose}><ArrowLeft size={19} /><span>HQ</span></button>
        <div><span>EMPIRE+ LEADERSHIP SUITE</span><strong>Executive Session • Week {suite.absoluteWeek}</strong></div>
        <aside><span>FOUNDER CONTROL</span><strong>{platform.founderOwnershipPercent}%</strong></aside>
        <button type="button" aria-label="Close" onClick={onClose}><X size={19} /></button>
      </header>
      <main className="leadership-main">
        <StreamingVisualScene
          sceneId="companyFinance"
          className="leadership-scene"
          eyebrow="EXECUTIVE FLOOR • BOARD CHAMBER"
          title={suite.boardBinding ? 'Power now has other voices.' : 'Build the table. Keep the final word.'}
          description="People create capability, conflict, judgment and consequence. No executive is a passive stat bonus."
          status={{
            label: `${suite.activeExecutives.length} executive${suite.activeExecutives.length === 1 ? '' : 's'} • ${suite.activeDirectors.length + 1} board ${suite.activeDirectors.length === 0 ? 'seat' : 'seats'}`,
            detail: `${suite.boardConfidence}/100 confidence • ${suite.boardModeLabel}`,
            tone: suite.boardConfidence >= 60 ? 'success' : 'warning',
          }}
          hotspots={[
            { id: 'org', label: 'Organization', status: `${suite.activeExecutives.length}/9 seats`, x: 21, y: 48, tone: 'active', icon: <Network size={16} /> },
            { id: 'board', label: 'Board Chamber', status: suite.boardBinding ? 'Binding votes' : 'Advisory', x: 53, y: 37, tone: suite.boardBinding ? 'warning' : 'neutral', icon: <Gavel size={16} /> },
            { id: 'investors', label: 'Investor Salon', status: `${platform.governance.celebrityInvestors.length} accepted`, x: 81, y: 51, tone: 'neutral', icon: <Star size={16} /> },
          ]}
          onHotspotSelect={hotspot => dispatch({ type: 'VIEW', view: hotspot.id === 'board' ? 'BOARD' : hotspot.id === 'investors' ? 'INVESTORS' : 'ORG' })}
        />
        <nav className="leadership-nav" aria-label="Leadership Suite sections">
          {([
            ['ORG', Network, 'Organization'],
            ['TALENT', UserPlus, 'Talent'],
            ['DELEGATION', Target, 'Delegation'],
            ['BOARD', Gavel, 'Board'],
            ['INVESTORS', Star, 'Investors'],
          ] as Array<[LeadershipView, LucideIcon, string]>).map(([view, Icon, label]) => (
            <button type="button" key={view} className={ui.view === view ? 'is-active' : ''} onClick={() => dispatch({ type: 'VIEW', view })}><Icon size={17} /><span>{label}</span></button>
          ))}
        </nav>
        <section className="leadership-view">{renderView()}</section>
        {feedback ? <p className="leadership-feedback" role="status">{feedback}</p> : null}
        <aside className="leadership-crosslinks">
          <BriefcaseBusiness size={20} /><div><strong>Leadership is connected, not cosmetic.</strong><p>Appointments unlock specialist authority; development completes in weekly processing; board and investor costs enter the same operating reconciliation.</p></div>
          {onOpenTechnology ? <button type="button" onClick={onOpenTechnology}>Technology <ChevronRight size={15} /></button> : null}
          {onOpenContent ? <button type="button" onClick={onOpenContent}>Content <ChevronRight size={15} /></button> : null}
        </aside>
      </main>

      {reviewedOffer ? (
        <div className="leadership-term-backdrop" role="dialog" aria-modal="true" aria-label={`${reviewedOffer.name} investment review`}>
          <section className="leadership-term-sheet">
            <button type="button" aria-label="Close term sheet" onClick={() => setReviewOfferId(null)}><X size={18} /></button>
            <Landmark size={30} />
            <span>VOLUNTARY EQUITY ROUND</span>
            <h2>{reviewedOffer.name} wants into the signal.</h2>
            <p>{reviewedOffer.influenceDemand}</p>
            <dl>
              <div><dt>Treasury receives</dt><dd>{formatMoney(reviewedOffer.investedCapital)}</dd></div>
              <div><dt>Founder ownership</dt><dd>{platform.founderOwnershipPercent}% → {platform.founderOwnershipPercent - reviewedOffer.ownershipPercent}%</dd></div>
              <div><dt>Board power</dt><dd>{reviewedOffer.boardSeat ? 'Binding nominee vote' : 'Binding governance begins'}</dd></div>
              <div><dt>Weekly participation</dt><dd>{reviewedOffer.profitParticipationPercent}% of operating revenue</dd></div>
            </dl>
            <aside><ShieldCheck size={17} /><p>This does not guarantee subscribers, awards, rights wins, or successful productions.</p></aside>
            <div><button type="button" onClick={() => setReviewOfferId(null)}>Remain independent</button><button type="button" onClick={acceptInvestment}>Accept capital and dilution</button></div>
          </section>
        </div>
      ) : null}

      {pendingInvestorReveal && acceptedInvestorForReveal ? (
        <div className="leadership-investor-reveal" role="dialog" aria-modal="true" aria-label="Celebrity investor reveal">
          <button type="button" onClick={() => closeInvestorReveal('DISMISSED')}>Skip</button>
          <div className="leadership-reveal-stage" aria-hidden="true"><Star size={45} /><span /><i /></div>
          <span>NEW PARTNER • NEW POWER</span>
          <h1>{acceptedInvestorForReveal.name}<br />joins {platform.identity?.name}.</h1>
          <p>{formatMoney(acceptedInvestorForReveal.investedCapital)} entered treasury. Founder control is now {platform.founderOwnershipPercent}%.</p>
          <button type="button" onClick={() => closeInvestorReveal('VIEWED', true)}>Enter the new board era <ChevronRight size={18} /></button>
        </div>
      ) : null}
    </div>
  );
}
