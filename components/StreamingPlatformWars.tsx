import { useMemo, useState } from 'react';
import {
  ArrowLeft, Award, BadgeCheck, ChevronRight, Clock3, Crown, Globe2, Handshake,
  MapPin, RadioTower, ShieldCheck, Sparkles, Swords, Target, Trophy, UsersRound, X, Zap,
} from 'lucide-react';
import type {
  OwnedStreamingRivalMove, Player, StreamingRegionalLaunchApproach,
  StreamingRegionId, StreamingRivalResponseId,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import { getVisibleGlobalStreamingCompanies } from '../services/streamingPlatformEcosystem';
import { resolveStreamingPlatformBrandById } from '../services/streamingPlatformBrandRegistry';
import {
  STREAMING_REGION_DEFINITIONS, getStreamingCompetitiveWorld, getStreamingRegionBlockers,
  previewStreamingRegionalLaunch, respondToStreamingRivalMove, startStreamingRegionalLaunch,
} from '../services/streamingCompetitiveWorld';
import StreamingPlatformBrand from './StreamingPlatformBrand';
import '../styles/streaming-platform-wars-v2.css';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenRights?: () => void;
  onOpenAnalytics?: () => void;
  onOpenLeadership?: () => void;
  onOpenTechnology?: () => void;
}

type WarsTab = 'LIVE' | 'RIVALS' | 'WORLD' | 'HONOURS';

const TABS: Array<{ id: WarsTab; label: string }> = [
  { id: 'LIVE', label: 'LIVE' }, { id: 'RIVALS', label: 'RIVALS' },
  { id: 'WORLD', label: 'WORLD' }, { id: 'HONOURS', label: 'HONOURS' },
];

const APPROACHES: Array<{ id: StreamingRegionalLaunchApproach; label: string; detail: string }> = [
  { id: 'LOCAL_PARTNERSHIP', label: 'Local partner', detail: 'Lower capital, deeper local trust.' },
  { id: 'PREMIUM_ENTRY', label: 'Premium entry', detail: 'Controlled reach and prestige.' },
  { id: 'MASS_MARKET', label: 'Mass launch', detail: 'Fast growth, heavy server pressure.' },
];

const RESPONSES: Array<{ id: StreamingRivalResponseId; label: string; cost: string; detail: string }> = [
  { id: 'STAY_COURSE', label: 'Hold course', cost: 'FREE', detail: 'Keep cash and carry the pressure.' },
  { id: 'DEFEND_POSITION', label: 'Defend audience', cost: '$8M', detail: 'Target the viewers most likely to switch.' },
  { id: 'COUNTER_PROGRAM', label: 'Hit back', cost: '$15M', detail: 'Protect the window and raise rivalry heat.' },
  { id: 'BACKCHANNEL', label: 'Call the CEO', cost: '$5M', detail: 'Cool the conflict through a private deal.' },
];

const POACH_RESPONSES: Array<{ id: StreamingRivalResponseId; label: string; cost: string; detail: string }> = [
  { id: 'MATCH_PACKAGE', label: 'Match offer', cost: '10× PAY', detail: 'Spend to rebuild loyalty.' },
  { id: 'EXPAND_MANDATE', label: 'Give more power', cost: '$2M', detail: 'Retain them with a larger mandate.' },
  { id: 'LET_DEPART', label: 'Let them go', cost: 'FREE', detail: 'Protect cash and accept the vacancy.' },
];

const formatMoney = (value: number): string => value >= 1_000_000_000
  ? `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  : value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
    : `$${Math.round(value).toLocaleString()}`;
const words = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const signed = (value: number, suffix = '') => `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
const rivalBrand = (platformId: string, platformName: string) => (
  resolveStreamingPlatformBrandById(platformId, platformName)
);

export default function StreamingPlatformWars({
  player, onUpdatePlayer, onClose, onOpenRights, onOpenAnalytics, onOpenLeadership, onOpenTechnology,
}: Props) {
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const view = useMemo(() => getStreamingCompetitiveWorld(player), [player]);
  const [tab, setTab] = useState<WarsTab>('LIVE');
  const [moveId, setMoveId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<StreamingRegionId | null>(null);
  const [approach, setApproach] = useState<StreamingRegionalLaunchApproach>('LOCAL_PARTNERSHIP');
  const [feedback, setFeedback] = useState('');
  const queuedCinematic = player.ownedStreamingPlatform.cinematicQueue.find(event => (
    ['PLATFORM_WAR_DECLARATION', 'STREAMING_AWARDS_CEREMONY', 'MARKET_SHARE_BREAKTHROUGH', 'GLOBAL_DOMINANCE'].includes(event.type)
    && event.status === 'QUEUED'
  ));
  const [cinematicId, setCinematicId] = useState<string | null>(queuedCinematic?.id || null);
  const cinematic = player.ownedStreamingPlatform.cinematicQueue.find(event => event.id === cinematicId) || null;
  const selectedMove = view.world.moves.find(move => move.id === moveId) || null;
  const selectedRegion = STREAMING_REGION_DEFINITIONS.find(region => region.id === regionId) || null;
  const regionPreview = selectedRegion ? previewStreamingRegionalLaunch(selectedRegion, approach) : null;
  const regionBlockers = selectedRegion ? getStreamingRegionBlockers(player, selectedRegion) : [];
  const latestPlayerWeek = player.ownedStreamingPlatform.weeklyHistory.at(-1);
  const playerMovement = latestPlayerWeek?.netSubscriberMovement || 0;
  const latestRivalWeek = view.world.weeklyRivalHistory.filter(item => item.absoluteWeek === view.world.lastSimulatedAbsoluteWeek);
  const latestShare = view.latestMarketShare?.entries || [];
  const emergingCompanies = useMemo(() => getVisibleGlobalStreamingCompanies(player)
    .filter(company => company.kind !== 'CORE'), [player]);

  const respond = (move: OwnedStreamingRivalMove, responseId: StreamingRivalResponseId) => {
    const result = respondToStreamingRivalMove(player, move.id, responseId);
    if (!result.changed) {
      setFeedback(result.reason === 'INSUFFICIENT_TREASURY' ? 'The treasury cannot fund that response.' : result.reason || 'That response window is closed.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(result.player.ownedStreamingPlatform.competitiveWorld.moves.find(item => item.id === move.id)?.outcomeNote || 'Response committed.');
    setMoveId(null);
  };

  const launchRegion = () => {
    if (!selectedRegion) return;
    const result = startStreamingRegionalLaunch(player, selectedRegion.id, approach);
    if (!result.changed) {
      setFeedback(result.reason === 'INSUFFICIENT_TREASURY' ? 'The treasury cannot fund this opening.' : result.reason || 'This opening cannot start yet.');
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(`${selectedRegion.name} entered localization and delivery preparation.`);
    setRegionId(null);
  };

  const finishCinematic = (status: 'VIEWED' | 'DISMISSED') => {
    if (!cinematic) return setCinematicId(null);
    onUpdatePlayer({ ...player, ownedStreamingPlatform: markOwnedStreamingCinematicStatus(player.ownedStreamingPlatform, cinematic.id, status) });
    setCinematicId(null);
  };

  return (
    <div className="sw" style={{ ['--sw-accent' as string]: player.ownedStreamingPlatform.identity?.primaryColor || '#ff355c' }}>
      <header className="swTop">
        <button className="swBack" type="button" onClick={onClose} aria-label="Back"><ArrowLeft /></button>
        <div className="swTitle"><b>PLATFORM WAR</b><span>LIVE GLOBAL MARKET</span></div>
        <div className="swLive"><i /> WEEK {absoluteWeek}</div>
      </header>

      <section className="swStats">
        <div><span>NET SUBS</span><b className={playerMovement >= 0 ? 'up' : 'down'}>{playerMovement ? signed(playerMovement / 1_000_000, 'M') : '—'}</b></div>
        <div><span>WORLD RANK</span><b>#{view.worldRank || '—'}</b></div>
        <div><span>SHARE</span><b>{view.playerMarketSharePercent === null ? '—' : `${view.playerMarketSharePercent.toFixed(2)}%`}</b></div>
        <div><span>WAR HEAT</span><b>{Math.round(view.world.rivalryHeat)}</b></div>
      </section>

      <nav className="swTabs" aria-label="Platform war sections">
        {TABS.map(item => <button type="button" key={item.id} className={tab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>{item.label}{item.id === 'LIVE' && view.openMoves.length ? <i>{view.openMoves.length}</i> : null}</button>)}
      </nav>

      <main className="swScroll">
        {feedback ? <div className="swFeedback"><BadgeCheck /><span>{feedback}</span><button type="button" onClick={() => setFeedback('')}><X /></button></div> : null}

        {tab === 'LIVE' ? <>
          <section className="swHero">
            <div className="swRadar"><i /><i /><i /><Swords /></div>
            <div><span>INDUSTRY WIRE · LIVE</span><h1>{view.openMoves.length ? `${view.openMoves.length} conflict${view.openMoves.length === 1 ? ' needs' : 's need'} you.` : 'The market never sleeps.'}</h1><p>Every move spends rival cash, follows a strategy and leaves a reason you can understand.</p></div>
          </section>

          <section className="swSection">
            <header className="swHead"><div><span>THIS WEEK</span><h2>Audience movement</h2></div><small>canonical subscribers</small></header>
            <div className="swMovement">
              <article className="mine"><i>YOU</i><span>{player.ownedStreamingPlatform.identity?.name || 'EMPIRE+'}</span><b className={playerMovement >= 0 ? 'up' : 'down'}>{playerMovement ? signed(playerMovement / 1_000_000, 'M') : '—'}</b><small>{latestPlayerWeek?.operations?.playbackSuccessRate ? `${latestPlayerWeek.operations.playbackSuccessRate.toFixed(1)}% playback` : 'First live result pending'}</small></article>
              {latestRivalWeek.map(item => {
                const brand = rivalBrand(item.platformId, item.platformName);
                return <article key={item.id} style={{ ['--rival' as string]: brand.primaryColor }}>
                  <i><StreamingPlatformBrand brand={brand} variant="MARK" size="XS" decorative /></i>
                  <span>{item.platformName}</span>
                  <b className={item.netMovementMillions >= 0 ? 'up' : 'down'}>{signed(item.netMovementMillions, 'M')}</b>
                  <small>{item.driver}</small>
                </article>;
              })}
            </div>
          </section>

          <section className="swSection">
            <header className="swHead"><div><span>OPEN CONFLICTS</span><h2>What rivals are doing</h2></div><small>{view.openMoves.length} need response</small></header>
            <div className="swMoves">
              {view.latestMoves.slice(0, 8).map(move => {
                const brand = rivalBrand(move.platformId, move.platformName);
                return <article key={move.id} className={move.status === 'OPEN' ? 'open' : ''} style={{ ['--rival' as string]: brand.primaryColor }}>
                <header><i>{move.battlefront}</i><StreamingPlatformBrand brand={brand} variant="WORDMARK" size="XS" /><b>{move.status === 'OPEN' ? `${Math.max(0, move.expiresAtAbsoluteWeek - absoluteWeek)}W LEFT` : move.status}</b></header>
                <h3>{move.title}</h3>
                <p>{move.strategyReason}</p>
                <div className="swImpact"><strong>WHAT IT MEANS</strong><span>{move.playerImpact}</span></div>
                <footer><span>{move.cashCostMillions.toFixed(0)}M rival cash</span>{move.rivalPriceAfter !== null ? <span>${move.rivalPriceBefore?.toFixed(2)} → ${move.rivalPriceAfter.toFixed(2)}</span> : null}{move.status === 'OPEN' ? <button type="button" onClick={() => setMoveId(move.id)}>RESPOND <ChevronRight /></button> : null}</footer>
              </article>;
              })}
              {!view.latestMoves.length ? <div className="swEmpty"><RadioTower /><b>No hostile signal yet.</b><span>Advance the live platform. Rival moves are processed by the weekly loop.</span></div> : null}
            </div>
          </section>

          <section className="swSection">
            <header className="swHead"><div><span>GLOBAL SHARE</span><h2>The board</h2></div><button type="button" onClick={onOpenAnalytics}>ANALYTICS <ChevronRight /></button></header>
            <div className="swShareTrack">{latestShare.map(entry => <i key={entry.id} style={{ width: `${entry.sharePercent}%`, background: entry.id === 'PLAYER' ? 'var(--sw-accent)' : rivalBrand(entry.id, entry.name).primaryColor }} />)}</div>
            <div className="swShareKeys">{latestShare.map((entry, index) => <div key={entry.id} className={entry.id === 'PLAYER' ? 'mine' : ''}><i style={{ background: entry.id === 'PLAYER' ? 'var(--sw-accent)' : rivalBrand(entry.id, entry.name).primaryColor }} /><b>#{index + 1} {entry.name}</b><span>{entry.sharePercent.toFixed(entry.sharePercent < 1 ? 2 : 1)}%</span></div>)}</div>
          </section>
        </> : null}

        {tab === 'RIVALS' ? <section className="swSection">
          <header className="swHead"><div><span>CEO INTELLIGENCE</span><h2>Five different doctrines</h2></div><small>persistent memory</small></header>
          <div className="swRivals">{view.rivals.map(rival => {
            const movement = [...view.world.weeklyRivalHistory].reverse().find(item => item.platformId === rival.platformId);
            const brand = rivalBrand(rival.platformId, rival.platformName);
            return <article key={rival.platformId} style={{ ['--rival' as string]: brand.primaryColor }}>
              <header><i><StreamingPlatformBrand brand={brand} variant="MARK" size="SM" decorative /></i><div><StreamingPlatformBrand brand={brand} variant="WORDMARK" size="XS" /><h3>{rival.ceoName}</h3><small>{words(rival.strategy)}</small></div><b>${rival.baseMonthlyPrice.toFixed(2)}</b></header>
              <p>{rival.ceoPersonality}</p>
              <div className="swRivalKpis"><span><small>AUDIENCE</small><b>{rival.subscribersMillions.toFixed(1)}M</b></span><span><small>THIS WEEK</small><b className={(movement?.netMovementMillions || 0) >= 0 ? 'up' : 'down'}>{movement ? signed(movement.netMovementMillions, 'M') : '—'}</b></span><span><small>VALUE</small><b>{rival.perceivedValue}</b></span><span><small>CASH</small><b>${rival.cashReserveMillions.toFixed(0)}M</b></span></div>
              <div className="swMemory"><span>RESPECT <b>{rival.memory.respect}</b></span><i><b style={{ width: `${rival.memory.respect}%` }} /></i><span>RESENTMENT <b>{rival.memory.resentment}</b></span><i><b style={{ width: `${rival.memory.resentment}%` }} /></i></div>
              <footer><span>{rival.activeRegionIds.length} regions</span><span>{rival.copiedTechnologyBranches.length ? `${rival.copiedTechnologyBranches.length} tech copied` : 'no copied tech'}</span><span>{rival.mistakes} mistakes</span></footer>
            </article>;
          })}
            {emergingCompanies.map(company => <article key={company.id} style={{ ['--rival' as string]: company.brand.primaryColor }}>
              <header><i><StreamingPlatformBrand brand={company.brand} variant="MARK" size="SM" decorative /></i><div><span>{company.kind === 'DYNAMIC' ? 'RISING PLATFORM' : company.kind === 'GLOBAL' ? 'GLOBAL CHALLENGER' : 'REGIONAL POWER'}</span><StreamingPlatformBrand brand={company.brand} variant="WORDMARK" size="XS" /><small>{company.homeCountryId || 'MULTI-MARKET'}</small></div><b>{company.lifecycle || 'ACTIVE'}</b></header>
              <p>{company.kind === 'DYNAMIC' ? 'A new company whose growth has made it impossible for the global market to ignore.' : 'An established streaming service with meaningful strength beyond the five core rivals.'}</p>
              <div className="swRivalKpis"><span><small>AUDIENCE</small><b>{(company.subscribersMillions || 0).toFixed(1)}M</b></span><span><small>VALUE</small><b>${(company.valuationBillions || 0).toFixed(1)}B</b></span><span><small>MOMENTUM</small><b>{(company.momentum || 0) >= 0 ? '+' : ''}{(company.momentum || 0).toFixed(1)}</b></span><span><small>CASH</small><b>${(company.cashMillions || 0).toFixed(0)}M</b></span></div>
              <footer><span>{company.activeCountryIds?.length || 0} markets</span><span>tech {Math.round(company.technology || 0)} · catalogue {Math.round(company.cataloguePower || 0)}</span><span>updated W{Math.max(0, company.lastProcessedAbsoluteWeek || 0)}</span></footer>
            </article>)}
          </div>
          <p className="swNote">CEO names are fictional characters. Cash, pricing, audiences, memory, mistakes and decisions persist in the save. Rivals cannot create actions without enough cash.</p>
        </section> : null}

        {tab === 'WORLD' ? <>
          <section className="swWorldHero"><Globe2 /><div><span>GLOBAL FOOTPRINT</span><h2>{view.activeRegions.length} of 7 regions live</h2><p>Player and rival footprints compete for the same regional audience. Your launch still uses the existing localization and infrastructure requirements.</p></div></section>
          <section className="swRegions">{STREAMING_REGION_DEFINITIONS.map(region => {
            const own = view.world.regionalLaunches.find(item => item.regionId === region.id);
            const rivals = view.rivals.filter(rival => rival.activeRegionIds.includes(region.id));
            const blocked = getStreamingRegionBlockers(player, region);
            return <article key={region.id}>
              <header><i><MapPin /></i><div><span>{region.code}</span><h3>{region.name}</h3></div><b className={own?.status === 'ACTIVE' ? 'live' : ''}>{own?.status || (blocked.length ? 'REQUIREMENTS' : 'OPEN')}</b></header>
              <p>{region.culturalNote}</p>
              <div className="swRegionFacts"><span><b>{region.addressableAudienceMillions}M</b> audience</span><span><b>{rivals.length}</b> major rivals</span><span><b>{own ? formatMoney(own.weeklyOperatingCost) : formatMoney(region.capitalCost)}</b> {own ? '/ week' : 'entry'}</span></div>
              <footer>{rivals.map(rival => {
                const brand = rivalBrand(rival.platformId, rival.platformName);
                return <i key={rival.platformId} style={{ ['--rival' as string]: brand.primaryColor }} title={rival.platformName}><StreamingPlatformBrand brand={brand} variant="MARK" size="XS" decorative /></i>;
              })}{!own && region.id !== 'HOME_MARKET' ? <button type="button" onClick={() => setRegionId(region.id)}>REVIEW <ChevronRight /></button> : null}</footer>
            </article>;
          })}</section>
        </> : null}

        {tab === 'HONOURS' ? <section className="swSection">
          <div className="swAwardsHero"><Trophy /><span>ANNUAL STREAMING AWARDS</span><h1>Prestige follows evidence.</h1><p>Audience movement, Originals, engagement, reliability, reach and market share decide the ceremony. There is no spend button and no purchasable jury.</p><b>{view.nextAwardsInWeeks ?? '—'} <small>WEEKS TO JUDGING</small></b></div>
          {view.latestAwardSeason ? <div className="swAwards">{view.latestAwardSeason.results.map(result => <article key={result.categoryId} className={result.playerWon ? 'won' : ''}><Award /><span>{result.categoryName}</span><h3>{result.winnerName}</h3><p>{result.nominees[0]?.evidence}</p><b>{result.playerWon ? 'YOUR WIN' : result.playerNominated ? 'NOMINATED' : 'RIVAL WIN'}</b></article>)}</div> : <div className="swEmpty"><Award /><b>No complete season yet.</b><span>Operate for 52 weeks. The game builds the evidence automatically.</span></div>}
          <div className="swMilestones"><span>EMPIRE MILESTONES</span>{player.ownedStreamingPlatform.milestoneKeys.filter(key => key.includes('streaming')).map(key => <i key={key}><Sparkles /> {words(key.replace('streaming-', ''))}</i>)}</div>
        </section> : null}

        <section className="swLinks">
          <button type="button" onClick={onOpenRights}><Handshake /> RIGHTS EXCHANGE <ChevronRight /></button>
          <button type="button" onClick={onOpenLeadership}><UsersRound /> LEADERSHIP <ChevronRight /></button>
          <button type="button" onClick={onOpenTechnology}><Zap /> TECHNOLOGY <ChevronRight /></button>
          <button type="button" onClick={onOpenAnalytics}><Target /> ANALYTICS <ChevronRight /></button>
        </section>
        <div className="swFoot" />
      </main>

      {selectedMove ? <div className="swShade" onMouseDown={event => event.target === event.currentTarget && setMoveId(null)}>
        <section className="swSheet" role="dialog" aria-modal="true" aria-labelledby="sw-response-title">
          <header><i><Swords /></i><div><span>{selectedMove.battlefront} · {Math.max(0, selectedMove.expiresAtAbsoluteWeek - absoluteWeek)} WEEKS LEFT</span><h2 id="sw-response-title">{selectedMove.title}</h2></div><button type="button" onClick={() => setMoveId(null)} aria-label="Close"><X /></button></header>
          <p>{selectedMove.strategyReason}</p><div className="swSheetImpact"><b>IF YOU IGNORE IT</b><span>{selectedMove.playerImpact}</span></div>
          <div className="swOptions">{(selectedMove.type === 'EXECUTIVE_POACH' ? POACH_RESPONSES : RESPONSES).map(option => <button type="button" key={option.id} onClick={() => respond(selectedMove, option.id)}><i>{option.id === 'BACKCHANNEL' ? <Handshake /> : option.id === 'STAY_COURSE' || option.id === 'LET_DEPART' ? <Clock3 /> : <ShieldCheck />}</i><span><b>{option.label}</b><small>{option.detail}</small></span><em>{option.cost}</em></button>)}</div>
          <footer>Every response writes its cost and outcome to the permanent company ledger.</footer>
        </section>
      </div> : null}

      {selectedRegion && regionPreview ? <div className="swShade" onMouseDown={event => event.target === event.currentTarget && setRegionId(null)}>
        <section className="swSheet" role="dialog" aria-modal="true" aria-labelledby="sw-region-title">
          <header><i><Globe2 /></i><div><span>REGIONAL EXPANSION</span><h2 id="sw-region-title">{selectedRegion.name}</h2></div><button type="button" onClick={() => setRegionId(null)} aria-label="Close"><X /></button></header>
          <p>{selectedRegion.culturalNote}</p>
          <div className="swApproaches">{APPROACHES.map(item => <button type="button" key={item.id} className={approach === item.id ? 'on' : ''} onClick={() => setApproach(item.id)}><i>{item.id === 'LOCAL_PARTNERSHIP' ? <Handshake /> : item.id === 'PREMIUM_ENTRY' ? <Crown /> : <Zap />}</i><b>{item.label}</b><small>{item.detail}</small></button>)}</div>
          <div className="swTerms"><span><small>CAPITAL</small><b>{formatMoney(regionPreview.capitalCost)}</b></span><span><small>BUILD</small><b>{regionPreview.developmentWeeks}W</b></span><span><small>WEEKLY</small><b>{formatMoney(regionPreview.weeklyOperatingCost)}</b></span><span><small>PEAK LOAD</small><b>+{regionPreview.peakLoadPercent.toFixed(1)}%</b></span></div>
          {regionBlockers.length ? <div className="swBlockers"><ShieldCheck /> <span>{regionBlockers.map(blocker => <small key={blocker}>{blocker}</small>)}</span></div> : null}
          <button className="swCommit" type="button" disabled={Boolean(regionBlockers.length) || player.ownedStreamingPlatform.treasuryCash < regionPreview.capitalCost} onClick={launchRegion}>COMMIT EXPANSION <ChevronRight /></button>
        </section>
      </div> : null}

      {cinematic ? <div className={`swCinema ${cinematic.type === 'STREAMING_AWARDS_CEREMONY' ? 'awards' : ''}`} role="dialog" aria-modal="true">
        <button type="button" onClick={() => finishCinematic('DISMISSED')}>SKIP <X /></button><div><i>{cinematic.type === 'STREAMING_AWARDS_CEREMONY' ? <Trophy /> : cinematic.type === 'GLOBAL_DOMINANCE' ? <Crown /> : <Swords />}</i><span>MARKET DESK · BREAKING</span><h1>{cinematic.title}</h1><p>This moment was derived from the live company record and will remain in your history.</p><button type="button" onClick={() => finishCinematic('VIEWED')}>ENTER THE WAR ROOM <ChevronRight /></button></div>
      </div> : null}
    </div>
  );
}
