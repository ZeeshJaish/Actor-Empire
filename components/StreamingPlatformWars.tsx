import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Banknote,
  BrainCircuit,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Crown,
  Globe2,
  Handshake,
  MapPin,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import type {
  OwnedStreamingMarketShareEntry,
  OwnedStreamingRivalMove,
  Player,
  StreamingRegionalLaunchApproach,
  StreamingRegionId,
  StreamingRivalResponseId,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import {
  STREAMING_REGION_DEFINITIONS,
  getStreamingCompetitiveWorld,
  getStreamingRegionBlockers,
  previewStreamingRegionalLaunch,
  respondToStreamingRivalMove,
  startStreamingRegionalLaunch,
} from '../services/streamingCompetitiveWorld';
import StreamingVisualScene from './StreamingVisualScene';
import '../styles/streaming-platform-wars.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenRights?: () => void;
  onOpenAnalytics?: () => void;
  onOpenLeadership?: () => void;
}

type WarsTab = 'COMMAND' | 'RIVALS' | 'WORLD' | 'AWARDS';

const TAB_CONFIG: Array<{
  id: WarsTab;
  label: string;
  detail: string;
  icon: typeof Swords;
}> = [
  { id: 'COMMAND', label: 'War Room', detail: 'Live moves', icon: Swords },
  { id: 'RIVALS', label: 'CEO Files', detail: 'Memory & resources', icon: BrainCircuit },
  { id: 'WORLD', label: 'Global Map', detail: 'Regional launches', icon: Globe2 },
  { id: 'AWARDS', label: 'Awards', detail: 'Evidence season', icon: Trophy },
];

const APPROACHES: Array<{
  id: StreamingRegionalLaunchApproach;
  label: string;
  detail: string;
}> = [
  { id: 'LOCAL_PARTNERSHIP', label: 'Local partnership', detail: 'Slower, culturally precise and lighter on capital.' },
  { id: 'PREMIUM_ENTRY', label: 'Premium entry', detail: 'A controlled prestige launch with balanced load.' },
  { id: 'MASS_MARKET', label: 'Mass-market surge', detail: 'Fast audience upside with the heaviest cash and server exposure.' },
];

const WAR_RESPONSES: Array<{
  id: StreamingRivalResponseId;
  label: string;
  cost: string;
  detail: string;
}> = [
  { id: 'STAY_COURSE', label: 'Hold course', cost: 'No spend', detail: 'Keep cash, accept the modeled pressure until the move expires.' },
  { id: 'DEFEND_POSITION', label: 'Defend audience', cost: '$8M', detail: 'Neutralize the move with targeted audience defence.' },
  { id: 'COUNTER_PROGRAM', label: 'Counter-program', cost: '$15M', detail: 'Protect the release lane and raise industry respect—but heat the rivalry.' },
  { id: 'BACKCHANNEL', label: 'Open backchannel', cost: '$5M', detail: 'Cool the market through a private commercial conversation.' },
];

const POACH_RESPONSES: Array<{
  id: StreamingRivalResponseId;
  label: string;
  cost: string;
  detail: string;
}> = [
  { id: 'MATCH_PACKAGE', label: 'Match package', cost: '10× weekly pay', detail: 'A costly retention package raises loyalty and founder trust.' },
  { id: 'EXPAND_MANDATE', label: 'Expand mandate', cost: '$2M', detail: 'Keep the executive with more authority, ambition and responsibility.' },
  { id: 'LET_DEPART', label: 'Let them leave', cost: 'No spend', detail: 'Protect cash and accept a real vacancy in the leadership table.' },
];

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  return `$${Math.round(value).toLocaleString()}`;
};

const formatStrategy = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function MarketShareRail({
  entries,
}: {
  entries: OwnedStreamingMarketShareEntry[];
}) {
  if (!entries?.length) return <p className="platform-wars-empty-copy">The first weekly market model is still being prepared.</p>;
  const max = Math.max(...entries.map(entry => entry.sharePercent), 0.01);
  return (
    <div className="platform-wars-share-list">
      {entries.map((entry, index) => (
        <div key={entry.id} className={entry.id === 'PLAYER' ? 'is-player' : ''}>
          <span><i style={{ ['--share-color' as string]: `var(--war-rival-${Math.min(index, 5)})` }} />{entry.name}</span>
          <b>{entry.sharePercent.toFixed(entry.sharePercent < 1 ? 2 : 1)}%</b>
          <em><i style={{ width: `${Math.max(1.5, entry.sharePercent / max * 100)}%` }} /></em>
        </div>
      ))}
    </div>
  );
}

export default function StreamingPlatformWars({
  player,
  onUpdatePlayer,
  onClose,
  onOpenRights,
  onOpenAnalytics,
  onOpenLeadership,
}: Props) {
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const view = useMemo(() => getStreamingCompetitiveWorld(player), [player]);
  const [tab, setTab] = useState<WarsTab>('COMMAND');
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<StreamingRegionId | null>(null);
  const [approach, setApproach] = useState<StreamingRegionalLaunchApproach>('LOCAL_PARTNERSHIP');
  const [feedback, setFeedback] = useState('');
  const pendingWarCinematic = player.ownedStreamingPlatform.cinematicQueue.find(event => (
    event.type === 'PLATFORM_WAR_DECLARATION' && event.status === 'QUEUED'
  ));
  const pendingAwardsCinematic = player.ownedStreamingPlatform.cinematicQueue.find(event => (
    event.type === 'STREAMING_AWARDS_CEREMONY' && event.status === 'QUEUED'
  ));
  const [cinematicId, setCinematicId] = useState<string | null>(
    pendingAwardsCinematic?.id || pendingWarCinematic?.id || null,
  );
  const selectedMove = view.world.moves.find(move => move.id === selectedMoveId) || null;
  const selectedRegion = STREAMING_REGION_DEFINITIONS.find(region => region.id === selectedRegionId) || null;
  const selectedPreview = selectedRegion ? previewStreamingRegionalLaunch(selectedRegion, approach) : null;
  const regionBlockers = selectedRegion ? getStreamingRegionBlockers(player, selectedRegion) : [];
  const cinematic = player.ownedStreamingPlatform.cinematicQueue.find(event => event.id === cinematicId) || null;

  const finishCinematic = (status: 'VIEWED' | 'DISMISSED') => {
    if (!cinematic) return setCinematicId(null);
    onUpdatePlayer({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        player.ownedStreamingPlatform,
        cinematic.id,
        status,
      ),
    });
    setCinematicId(null);
  };

  const answerMove = (move: OwnedStreamingRivalMove, responseId: StreamingRivalResponseId) => {
    const result = respondToStreamingRivalMove(player, move.id, responseId);
    if (!result.changed) {
      setFeedback(result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The platform treasury cannot fund that response.'
        : result.reason === 'EXECUTIVE_UNAVAILABLE'
          ? 'That executive seat is no longer active.'
          : 'This response window has already closed.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(result.player.ownedStreamingPlatform.competitiveWorld.moves.find(item => item.id === move.id)?.outcomeNote || 'Response committed.');
    setSelectedMoveId(null);
  };

  const launchRegion = () => {
    if (!selectedRegion) return;
    const result = startStreamingRegionalLaunch(player, selectedRegion.id, approach);
    if (!result.changed) {
      setFeedback(result.reason === 'INSUFFICIENT_TREASURY'
        ? 'The treasury cannot fund this regional launch.'
        : result.reason === 'LAUNCH_ACTIVE'
          ? 'Only one regional opening can be localized at a time.'
          : result.reason || 'The launch could not be committed.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(`${selectedRegion.name} entered a real ${selectedPreview?.developmentWeeks || 0}-week build. Capital was charged once.`);
    setSelectedRegionId(null);
  };

  const renderCommand = () => {
    const latestMove = view.latestMoves[0] || null;
    return (
      <>
        <section className="platform-wars-command-grid">
          <article className="platform-wars-heat-card">
            <header><span>PLATFORM WAR INDEX</span><strong>{Math.round(view.world.rivalryHeat)}</strong></header>
            <div className="platform-wars-heat-gauge" style={{ ['--heat' as string]: `${view.world.rivalryHeat}%` }}>
              <i />
            </div>
            <p>{view.openMoves.length
              ? `${view.openMoves.length} move${view.openMoves.length === 1 ? '' : 's'} need founder attention.`
              : 'No unanswered attack. Rivals still spend, recover and remember each encounter.'}</p>
          </article>
          <article className="platform-wars-rank-card">
            <Globe2 />
            <span>WORLD POSITION</span>
            <strong>#{view.worldRank || '—'}</strong>
            <p>{view.playerMarketSharePercent === null ? 'First share model pending' : `${view.playerMarketSharePercent.toFixed(2)}% modeled subscriber share`}</p>
          </article>
          <article className="platform-wars-prestige-card">
            <Award />
            <span>GLOBAL PRESTIGE</span>
            <strong>{Math.round(view.world.globalPrestige)}</strong>
            <p>{view.nextAwardsInWeeks === null ? 'Awards begin after launch' : `${view.nextAwardsInWeeks} weeks to the annual jury`}</p>
          </article>
        </section>

        <section className="platform-wars-section">
          <header className="platform-wars-section-heading">
            <div><span>LIVE INTELLIGENCE</span><h2>Moves have owners, costs and consequences.</h2></div>
            <small>Rivals cannot create actions without enough cash or escape their cooldown.</small>
          </header>
          {view.latestMoves.length ? (
            <div className="platform-wars-move-list">
              {view.latestMoves.slice(0, 6).map(move => (
                <button
                  type="button"
                  key={move.id}
                  className={`platform-wars-move ${move.status === 'OPEN' ? 'is-open' : ''} ${move.status === 'MISFIRED' ? 'is-misfire' : ''}`}
                  onClick={() => move.status === 'OPEN' && setSelectedMoveId(move.id)}
                >
                  <span className="platform-wars-move-sigil"><Swords size={19} /></span>
                  <span><small>{move.ceoName} • {formatStrategy(move.type)}</small><strong>{move.title}</strong><em>{move.outcomeNote}</em></span>
                  <span><small>RIVAL SPEND</small><strong>${move.cashCostMillions.toFixed(0)}M</strong><em>{move.status.replaceAll('_', ' ')}</em></span>
                  {move.status === 'OPEN' ? <ChevronRight /> : <BadgeCheck />}
                </button>
              ))}
            </div>
          ) : (
            <div className="platform-wars-empty">
              <RadioTower />
              <h3>The market is listening.</h3>
              <p>Every fourth live week can produce one resource-backed rival move. No random attack is fabricated between processed weeks.</p>
            </div>
          )}
        </section>

        <section className="platform-wars-command-lower">
          <article>
            <header><div><span>INDUSTRY SHARE</span><h3>One canonical market model</h3></div><button type="button" onClick={onOpenAnalytics}>Open analytics <ChevronRight size={15} /></button></header>
            <MarketShareRail entries={view.latestMarketShare?.entries || []} />
          </article>
          <aside>
            <span>NEXT DECISION</span>
            <h3>{view.openMoves[0]?.title || view.inProgressRegion?.regionName || 'Choose the next territory'}</h3>
            <p>{view.openMoves[0]?.detail
              || (view.inProgressRegion
                ? `Localization completes in ${Math.max(0, view.inProgressRegion.readyAtAbsoluteWeek - absoluteWeek)} game weeks.`
                : 'Growth is available, but each launch adds permanent weekly cost and server load.')}</p>
            <button type="button" onClick={() => view.openMoves[0] ? setSelectedMoveId(view.openMoves[0].id) : setTab('WORLD')}>
              {view.openMoves[0] ? 'Answer the move' : 'Open global map'} <ChevronRight size={16} />
            </button>
            {latestMove?.status === 'MISFIRED' ? <small><Sparkles size={14} /> Rivals make mistakes—and still pay for them.</small> : null}
          </aside>
        </section>
      </>
    );
  };

  const renderRivals = () => (
    <section className="platform-wars-rival-grid">
      {view.rivals.map((rival, index) => (
        <article key={rival.platformId} className="platform-wars-rival-card" style={{ ['--rival-index' as string]: index }}>
          <header>
            <span className="platform-wars-ceo-portrait">{rival.ceoName.split(' ').map(part => part[0]).join('')}</span>
            <div><small>{rival.platformName}</small><h2>{rival.ceoName}</h2><p>{formatStrategy(rival.strategy)}</p></div>
            <span className={rival.cooldownUntilAbsoluteWeek > absoluteWeek ? 'is-cooling' : 'is-ready'}>
              {rival.cooldownUntilAbsoluteWeek > absoluteWeek ? `${rival.cooldownUntilAbsoluteWeek - absoluteWeek}W` : 'READY'}
            </span>
          </header>
          <blockquote>“{rival.ceoPersonality}”</blockquote>
          <div className="platform-wars-rival-stats">
            <span><Banknote /><small>Cash</small><strong>${rival.cashReserveMillions.toFixed(0)}M</strong></span>
            <span><UsersRound /><small>Audience</small><strong>{rival.subscribersMillions.toFixed(1)}M</strong></span>
            <span><RadioTower /><small>Tech</small><strong>{rival.technology}</strong></span>
            <span><Crown /><small>Prestige</small><strong>{rival.prestige}</strong></span>
          </div>
          <div className="platform-wars-memory">
            <header><BrainCircuit size={16} /><strong>CEO memory</strong><small>{rival.memory.encounters} encounters</small></header>
            <div><span>Respect <b>{rival.memory.respect}</b></span><i><i style={{ width: `${rival.memory.respect}%` }} /></i></div>
            <div><span>Resentment <b>{rival.memory.resentment}</b></span><i><i style={{ width: `${rival.memory.resentment}%` }} /></i></div>
            <footer><span>{rival.memory.playerDefences} defended</span><span>{rival.memory.rivalWins} rival wins</span><span>{rival.mistakes} mistakes</span></footer>
          </div>
          <footer>
            <span><small>GENRES</small>{rival.preferredGenres.slice(0, 3).map(genre => <i key={genre}>{formatStrategy(genre)}</i>)}</span>
            <span><small>REGIONAL EYES</small>{rival.preferredRegions.slice(0, 2).map(region => <i key={region}>{STREAMING_REGION_DEFINITIONS.find(item => item.id === region)?.code}</i>)}</span>
          </footer>
        </article>
      ))}
      <p className="platform-wars-fiction-note">Named CEOs are fictional characters inside the game simulation. Their cash, audience, cooldowns, memory and mistakes persist in your save.</p>
    </section>
  );

  const renderWorld = () => (
    <>
      <section className="platform-wars-world-layout">
        <div className="platform-wars-map">
          <header><span>GLOBAL DELIVERY MAP</span><strong>{view.activeRegions.length}/7 regions live</strong></header>
          <div className="platform-wars-map-canvas">
            <div className="platform-wars-map-land" aria-hidden="true" />
            {STREAMING_REGION_DEFINITIONS.map(region => {
              const state = view.world.regionalLaunches.find(item => item.regionId === region.id);
              return (
                <button
                  type="button"
                  key={region.id}
                  className={state?.status === 'ACTIVE' ? 'is-active' : state?.status === 'IN_PROGRESS' ? 'is-building' : ''}
                  style={{ left: `${region.mapX}%`, top: `${region.mapY}%` }}
                  onClick={() => !state && region.id !== 'HOME_MARKET' && setSelectedRegionId(region.id)}
                  aria-label={`${region.name}: ${state?.status || 'available to review'}`}
                >
                  <i><MapPin size={15} /></i><span>{region.code}</span>
                </button>
              );
            })}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {view.activeRegions.filter(region => region.regionId !== 'HOME_MARKET').map(region => {
                const definition = STREAMING_REGION_DEFINITIONS.find(item => item.id === region.regionId)!;
                return <line key={region.id} x1="53" y1="59" x2={definition.mapX} y2={definition.mapY} />;
              })}
            </svg>
          </div>
          <footer><span><i className="is-live" /> Live</span><span><i className="is-build" /> Localizing</span><span><i /> Available</span></footer>
        </div>
        <aside className="platform-wars-expansion-brief">
          <span>EXPANSION CONTROL</span>
          <h2>{view.inProgressRegion ? view.inProgressRegion.regionName : 'No artificial borders.'}</h2>
          <p>{view.inProgressRegion
            ? `${formatStrategy(view.inProgressRegion.approach)} is preparing localization, delivery and launch operations.`
            : 'You can attempt any qualified territory. The consequence is real capital, permanent weekly cost and added peak demand.'}</p>
          {view.inProgressRegion ? (
            <div className="platform-wars-build-progress">
              <strong>{Math.max(0, view.inProgressRegion.readyAtAbsoluteWeek - absoluteWeek)} weeks remain</strong>
              <span>{formatMoney(view.inProgressRegion.weeklyOperatingCost)}/week after launch</span>
            </div>
          ) : (
            <div className="platform-wars-world-rules">
              <span><ShieldCheck /> Reach and technology qualify the route.</span>
              <span><CircleDollarSign /> Capital is charged at commitment.</span>
              <span><RadioTower /> Load becomes part of weekly operations.</span>
            </div>
          )}
        </aside>
      </section>
      <section className="platform-wars-region-grid">
        {STREAMING_REGION_DEFINITIONS.map(region => {
          const state = view.world.regionalLaunches.find(item => item.regionId === region.id);
          const blockers = getStreamingRegionBlockers(player, region);
          return (
            <button type="button" key={region.id} disabled={Boolean(state) || region.id === 'HOME_MARKET'} onClick={() => setSelectedRegionId(region.id)}>
              <header><span>{region.code}</span><strong>{state?.status === 'ACTIVE' ? 'LIVE' : state?.status === 'IN_PROGRESS' ? 'BUILDING' : blockers.length ? 'REQUIREMENTS' : 'AVAILABLE'}</strong></header>
              <h3>{region.name}</h3>
              <p>{region.culturalNote}</p>
              <footer><span>{region.addressableAudienceMillions}M addressable</span><span>{state ? formatMoney(state.weeklyOperatingCost) : `from ${formatMoney(region.capitalCost)}`}</span></footer>
            </button>
          );
        })}
      </section>
    </>
  );

  const renderAwards = () => {
    const season = view.latestAwardSeason;
    return (
      <>
        <section className="platform-wars-awards-hero">
          <div><Trophy /><span>ANNUAL STREAMING AWARDS</span><h1>Prestige follows evidence.</h1><p>Subscriber movement, title performance, playback, engagement, global reach and market share decide every nominee. There is no spend button and no purchasable jury.</p></div>
          <aside><span>NEXT CEREMONY</span><strong>{view.nextAwardsInWeeks ?? '—'}</strong><small>game weeks</small></aside>
        </section>
        {season ? (
          <>
            <header className="platform-wars-section-heading">
              <div><span>SEASON {season.seasonNumber}</span><h2>{season.playerWins} wins from {season.playerNominations} nominations</h2></div>
              <button type="button" onClick={() => pendingAwardsCinematic && setCinematicId(pendingAwardsCinematic.id)}>Replay ceremony <Sparkles size={15} /></button>
            </header>
            <section className="platform-wars-award-grid">
              {season.results.map(result => (
                <article key={result.categoryId} className={result.playerWon ? 'is-player-win' : ''}>
                  <Award />
                  <span>{result.categoryName}</span>
                  <h3>{result.winnerName}</h3>
                  <p>{result.nominees[0]?.evidence}</p>
                  <footer>{result.playerWon ? <><Crown size={14} /> YOUR WIN</> : result.playerNominated ? 'NOMINATED' : 'NOT NOMINATED'}</footer>
                  <ol>{result.nominees.map(nominee => <li key={nominee.id}><span>{nominee.name}</span><strong>{nominee.score.toFixed(1)}</strong></li>)}</ol>
                </article>
              ))}
            </section>
          </>
        ) : (
          <div className="platform-wars-awards-empty">
            <Award />
            <h2>The jury has no annual evidence yet.</h2>
            <p>Operate for a complete 52-week season. Strong Originals, reliable streams, loyal audiences and real expansion will build the case automatically.</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="platform-wars-shell">
      <header className="platform-wars-topbar">
        <button type="button" onClick={onClose} aria-label="Close Platform Wars"><ArrowLeft /></button>
        <div><span>MARKET ROOM</span><strong>Platform Wars</strong></div>
        <div><small>TREASURY</small><strong>{formatMoney(player.ownedStreamingPlatform.treasuryCash)}</strong></div>
        <button type="button" onClick={onClose} aria-label="Close"><X /></button>
      </header>

      <main className="platform-wars-main">
        <StreamingVisualScene
          sceneId="marketRoom"
          className="platform-wars-scene"
          eyebrow="GLOBAL COMPETITIVE NETWORK"
          title={view.openMoves.length ? `${view.openMoves.length} live conflict${view.openMoves.length === 1 ? '' : 's'}.` : 'The industry keeps moving.'}
          description="Five CEOs operate from persistent resources, strategy and memory. Expansion changes the service you must actually run."
          status={{
            label: `${Math.round(view.world.rivalryHeat)} rivalry heat`,
            detail: `${view.activeRegions.length} region${view.activeRegions.length === 1 ? '' : 's'} • ${view.worldRank ? `world rank #${view.worldRank}` : 'share pending'}`,
            tone: view.openMoves.length ? 'warning' : 'active',
          }}
          hotspots={[
            { id: 'moves', label: 'Conflict Table', status: `${view.openMoves.length} open`, x: 50, y: 53, tone: view.openMoves.length ? 'critical' : 'active', icon: <Swords size={16} /> },
            { id: 'rivals', label: 'CEO Intelligence', status: `${view.rivals.length} rivals`, x: 23, y: 32, tone: 'neutral', icon: <BrainCircuit size={16} /> },
            { id: 'world', label: 'Global Delivery', status: `${view.activeRegions.length}/7 live`, x: 79, y: 31, tone: 'success', icon: <Globe2 size={16} /> },
          ]}
          onHotspotSelect={hotspot => setTab(hotspot.id === 'rivals' ? 'RIVALS' : hotspot.id === 'world' ? 'WORLD' : 'COMMAND')}
        />

        <nav className="platform-wars-tabs" aria-label="Platform Wars sections">
          {TAB_CONFIG.map(item => {
            const Icon = item.icon;
            return (
              <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>
                <Icon /><span>{item.label}<small>{item.detail}</small></span>
                {item.id === 'COMMAND' && view.openMoves.length ? <b>{view.openMoves.length}</b> : null}
              </button>
            );
          })}
        </nav>

        {feedback ? <div className="platform-wars-feedback"><BadgeCheck /> <span>{feedback}</span><button type="button" onClick={() => setFeedback('')}><X size={15} /></button></div> : null}
        {tab === 'COMMAND' ? renderCommand() : null}
        {tab === 'RIVALS' ? renderRivals() : null}
        {tab === 'WORLD' ? renderWorld() : null}
        {tab === 'AWARDS' ? renderAwards() : null}

        <section className="platform-wars-links">
          <button type="button" onClick={onOpenRights}><Handshake /> Rights Exchange <ChevronRight /></button>
          <button type="button" onClick={onOpenLeadership}><UsersRound /> Leadership Suite <ChevronRight /></button>
          <button type="button" onClick={onOpenAnalytics}><Target /> Analytics Center <ChevronRight /></button>
        </section>
      </main>

      {selectedMove ? (
        <div className="platform-wars-dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSelectedMoveId(null)}>
          <section className="platform-wars-response-dialog" role="dialog" aria-modal="true" aria-labelledby="war-response-title">
            <header>
              <span><Swords /></span>
              <div><small>FOUNDER RESPONSE • WEEK {selectedMove.expiresAtAbsoluteWeek - absoluteWeek <= 1 ? 'CLOSING' : absoluteWeek}</small><h2 id="war-response-title">{selectedMove.title}</h2></div>
              <button type="button" onClick={() => setSelectedMoveId(null)} aria-label="Close response"><X /></button>
            </header>
            <div className="platform-wars-response-facts">
              <p>{selectedMove.detail}</p>
              <span><strong>{selectedMove.ceoName}</strong> authorized it</span>
              <span><strong>${selectedMove.cashCostMillions}M</strong> rival cash spent</span>
              <span><strong>{Math.max(0, selectedMove.expiresAtAbsoluteWeek - absoluteWeek)}</strong> weeks left</span>
            </div>
            {selectedMove.targetExecutiveName ? <div className="platform-wars-poach-target"><UsersRound /><span><small>TARGETED EXECUTIVE</small><strong>{selectedMove.targetExecutiveName}</strong></span></div> : null}
            <div className="platform-wars-response-options">
              {(selectedMove.type === 'EXECUTIVE_POACH' ? POACH_RESPONSES : WAR_RESPONSES).map(option => (
                <button type="button" key={option.id} onClick={() => answerMove(selectedMove, option.id)}>
                  <span>{option.id === 'STAY_COURSE' || option.id === 'LET_DEPART' ? <Clock3 /> : option.id === 'BACKCHANNEL' ? <Handshake /> : <ShieldCheck />}</span>
                  <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                  <b>{option.cost}</b>
                </button>
              ))}
            </div>
            <footer>Every response writes its cost and outcome to the permanent company ledger.</footer>
          </section>
        </div>
      ) : null}

      {selectedRegion && selectedPreview ? (
        <div className="platform-wars-dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSelectedRegionId(null)}>
          <section className="platform-wars-region-dialog" role="dialog" aria-modal="true" aria-labelledby="region-review-title">
            <header>
              <div><small>REGIONAL LAUNCH REVIEW</small><h2 id="region-review-title">{selectedRegion.name}</h2><p>{selectedRegion.culturalNote}</p></div>
              <button type="button" onClick={() => setSelectedRegionId(null)} aria-label="Close region review"><X /></button>
            </header>
            <div className="platform-wars-approaches">
              {APPROACHES.map(item => (
                <button type="button" key={item.id} className={approach === item.id ? 'is-active' : ''} onClick={() => setApproach(item.id)}>
                  <span>{item.id === 'LOCAL_PARTNERSHIP' ? <Handshake /> : item.id === 'PREMIUM_ENTRY' ? <Crown /> : <Zap />}</span>
                  <strong>{item.label}</strong><small>{item.detail}</small>
                </button>
              ))}
            </div>
            <div className="platform-wars-region-terms">
              <span><small>CAPITAL</small><strong>{formatMoney(selectedPreview.capitalCost)}</strong></span>
              <span><small>BUILD</small><strong>{selectedPreview.developmentWeeks} weeks</strong></span>
              <span><small>WEEKLY COST</small><strong>{formatMoney(selectedPreview.weeklyOperatingCost)}</strong></span>
              <span><small>PEAK LOAD</small><strong>+{selectedPreview.peakLoadPercent.toFixed(1)}%</strong></span>
              <span><small>LOCALIZATION</small><strong>{selectedPreview.localizationDepth}/100</strong></span>
              <span><small>AUDIENCE</small><strong>{selectedRegion.addressableAudienceMillions}M</strong></span>
            </div>
            {regionBlockers.length ? <div className="platform-wars-blockers"><ShieldCheck /> <span>{regionBlockers.map(blocker => <small key={blocker}>{blocker}</small>)}</span></div> : null}
            <footer>
              <div><strong>{formatMoney(player.ownedStreamingPlatform.treasuryCash - selectedPreview.capitalCost)}</strong><small>treasury after commitment</small></div>
              <button type="button" disabled={Boolean(regionBlockers.length) || player.ownedStreamingPlatform.treasuryCash < selectedPreview.capitalCost} onClick={launchRegion}>Commit regional launch <ChevronRight /></button>
            </footer>
          </section>
        </div>
      ) : null}

      {cinematic ? (
        <div className={`platform-wars-cinematic ${cinematic.type === 'STREAMING_AWARDS_CEREMONY' ? 'is-awards' : ''}`} role="dialog" aria-modal="true">
          <div className="platform-wars-cinematic-scan" aria-hidden="true" />
          <button type="button" className="platform-wars-cinematic-skip" onClick={() => finishCinematic('DISMISSED')}>Skip <X size={15} /></button>
          <div className="platform-wars-cinematic-content">
            <span className="platform-wars-cinematic-icon">{cinematic.type === 'STREAMING_AWARDS_CEREMONY' ? <Trophy /> : <Swords />}</span>
            <small>{cinematic.type === 'STREAMING_AWARDS_CEREMONY' ? 'THE ANNUAL JURY HAS SPOKEN' : 'INDUSTRY TRANSMISSION INTERCEPTED'}</small>
            <h1>{cinematic.title}</h1>
            {cinematic.type === 'STREAMING_AWARDS_CEREMONY' && view.latestAwardSeason ? (
              <div className="platform-wars-cinematic-awards">
                {view.latestAwardSeason.results.map(result => <span key={result.categoryId}><small>{result.categoryName}</small><strong>{result.winnerName}</strong></span>)}
              </div>
            ) : (
              <p>{view.latestMoves[0]?.detail || 'A rival CEO has committed real resources against your position. The Platform War is now part of the company record.'}</p>
            )}
            <button type="button" onClick={() => finishCinematic('VIEWED')}>
              {cinematic.type === 'STREAMING_AWARDS_CEREMONY' ? 'Enter the winners’ hall' : 'Enter the war room'} <ChevronRight />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
