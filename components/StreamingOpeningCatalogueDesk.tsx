import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Captions,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Clock3,
  Globe2,
  Headphones,
  Languages,
  LibraryBig,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import type { Player } from '../types';
import {
  getStreamingLocalizationQuote,
  getStreamingOpeningCatalogueView,
  scheduleStreamingTitleLocalization,
  type StreamingLocalizationDelivery,
} from '../services/streamingOpeningCatalogue';
import AccessibleDialog from './AccessibleDialog';
import '../styles/streaming-opening-catalogue.css';
import { CONTENT_AVAILABILITY_LABELS } from '../services/streamingContentAvailability';

type DeskTab = 'PROGRAM' | 'COVERAGE' | 'LANGUAGES';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  initialTab?: DeskTab;
  onOpenRightsMarket?: () => void;
  onOpenSlate?: () => void;
  onOpenFinance?: () => void;
  onOpenTechnology?: () => void;
}

const money = (value: number): string => value >= 1_000_000
  ? `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  : `$${Math.round(value / 1_000)}K`;

const hueFor = (id: string): number => Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 300 + 20;

const statusCopy = (status: string): string => status.replaceAll('_', ' ');

export default function StreamingOpeningCatalogueDesk({
  player,
  onUpdatePlayer,
  onClose,
  initialTab = 'PROGRAM',
  onOpenRightsMarket,
  onOpenSlate,
  onOpenFinance,
  onOpenTechnology,
}: Props) {
  const platform = player.ownedStreamingPlatform;
  const view = useMemo(() => getStreamingOpeningCatalogueView(player), [player]);
  const [tab, setTab] = useState<DeskTab>(initialTab);
  const [selectedTitleId, setSelectedTitleId] = useState(view.titles[0]?.projectId || '');
  const [delivery, setDelivery] = useState<StreamingLocalizationDelivery>('OUTSOURCE');
  const [feedback, setFeedback] = useState('');
  const selectedTitle = view.titles.find(title => title.projectId === selectedTitleId) || view.titles[0] || null;
  const languages = useMemo(() => Array.from(new Set<string>(view.countries.flatMap(country => (
    country.languageDistribution.map(language => language.language)
  )))).filter(language => language.toLowerCase() !== 'english'), [view.countries]);

  const orderLanguage = (language: string, mode: 'SUBTITLE' | 'DUB') => {
    if (!selectedTitle) return;
    const result = scheduleStreamingTitleLocalization(player, {
      titleId: selectedTitle.projectId,
      languageId: language,
      mode,
      delivery,
    });
    if (!result.changed) {
      if (result.reason === 'INSUFFICIENT_TREASURY') {
        setFeedback(`Studio Finance is short by ${money(result.shortfall)}.`);
      } else if (result.reason === 'IN_HOUSE_LOCKED') {
        setFeedback('In-house localization needs the Localization Exchange technology. Outsourcing is available now.');
      } else if (result.reason === 'ALREADY_EXISTS') {
        setFeedback('That language master is already ready or in production.');
      } else {
        setFeedback('This language order is not available for the selected title.');
      }
      return;
    }
    onUpdatePlayer(result.player);
    setFeedback(`${language} ${mode === 'DUB' ? 'dub' : 'subtitles'} entered production. Delivery in ${result.job?.readyAtAbsoluteWeek ? 'the scheduled game week' : 'a future game week'}.`);
    if (navigator.vibrate) navigator.vibrate(16);
  };

  const renderProgram = () => (
    <>
      <section className="ocd-strategy">
        <div>
          <span>OPENING PROGRAMMING THESIS</span>
          <h2>{view.strategyLabel}</h2>
          <p>{view.strategyId === 'BROAD_APPEAL'
            ? 'Range is the promise: varied genres and formats reduce early catalogue fatigue.'
            : view.strategyId === 'PRESTIGE_VAULT'
              ? 'Quality is the promise: acclaimed work leads the platform before volume arrives.'
              : 'Taste is the promise: a deliberate opening shelf gives the platform a recognizable point of view.'}</p>
        </div>
        <Sparkles size={24} />
      </section>

      <section className="ocd-section">
        <header><div><span>OPENING SHELF</span><h2>{view.titles.filter(title => title.available).length} available · {view.titles.length} acquired</h2></div><button type="button" onClick={onOpenRightsMarket}>+ ADD CONTENT</button></header>
        <div className="ocd-poster-rail">
          {view.titles.map((title, index) => (
            <button type="button" key={title.projectId} className="ocd-poster-card" onClick={() => { setSelectedTitleId(title.projectId); setTab('LANGUAGES'); }} style={{ ['--ocd-hue' as string]: hueFor(title.projectId) }}>
              <span className="ocd-poster-art"><i>{title.title.slice(0, 2)}</i><em>{index + 1 < 10 ? `0${index + 1}` : index + 1}</em></span>
              <span className="ocd-poster-copy"><small>{title.source} · {title.projectType}</small><strong>{title.title}</strong><em>{title.genre}</em></span>
              <span className={title.available ? 'is-ready' : 'is-risk'}>{title.available ? <ShieldCheck size={13} /> : <CircleAlert size={13} />}{CONTENT_AVAILABILITY_LABELS[title.availability]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ocd-command-pair">
        <button type="button" onClick={onOpenRightsMarket}><LockKeyhole size={21} /><span><small>CONTENT MARKET</small><b>Add Content</b><em>Browse titles, collections, and studio imports</em></span><ChevronRight size={18} /></button>
        <button type="button" onClick={onOpenSlate}><Clapperboard size={21} /><span><small>PROGRAMMING</small><b>Arrange the launch slate</b><em>Place titles across the first twelve weeks</em></span><ChevronRight size={18} /></button>
      </section>
    </>
  );

  const renderCoverage = () => (
    <section className="ocd-section ocd-coverage-section">
      <header><div><span>COUNTRY COVERAGE</span><h2>One catalogue. Different permissions.</h2></div></header>
      {!view.countries.length ? <div className="ocd-empty"><Globe2 size={27} /><b>No Opening Markets yet</b><p>Choose countries in Audience. The same records will appear here automatically.</p></div> : (
        <div className="ocd-country-list">
          {view.countries.map(country => (
            <article key={country.countryId} className={country.launchGateReady ? 'is-ready' : 'is-blocked'}>
              <header>
                <div className="ocd-country-mark">{country.countryId}</div>
                <div><small>{country.regionId.replaceAll('_', ' ')}</small><h3>{country.country}</h3><span>{statusCopy(country.status)}</span></div>
                <strong>{country.launchGateReady ? <><BadgeCheck size={15} /> RIGHTS OK</> : <><CircleAlert size={15} /> RIGHTS GAP</>}</strong>
              </header>
              <div className="ocd-matrix">
                <div><span>RIGHTS</span><b>{country.rightsCoveredTitles}/{country.totalTitles}</b><em>titles covered</em></div>
                <div><span>RATINGS</span><b>{country.metadataStatus}</b><em>local metadata</em></div>
                <div><span>SUBTITLES</span><b>{country.subtitleCoveragePercent}%</b><em>language/title pairs</em></div>
                <div><span>DUBS</span><b>{country.dubCoveragePercent}%</b><em>language/title pairs</em></div>
              </div>
              <div className="ocd-reach"><span><i style={{ width: `${country.projectedAudienceReachPercent}%` }} /></span><b>{country.projectedAudienceReachPercent}% projected reach</b></div>
              <footer><Languages size={15} /><span>{country.languageDistribution.map(language => `${language.language} ${language.audiencePercent}%`).join(' · ')}</span></footer>
              {country.missingRightsTitles.length ? <p>Unavailable here: {country.missingRightsTitles.join(', ')}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderLanguages = () => (
    <section className="ocd-section ocd-language-section">
      <header><div><span>LANGUAGE MASTERS</span><h2>Localize title by title.</h2></div><button type="button" onClick={onOpenTechnology}>BUILD IN-HOUSE</button></header>
      <div className="ocd-title-selector" role="listbox" aria-label="Select opening title">
        {view.titles.map(title => <button type="button" role="option" aria-selected={selectedTitle?.projectId === title.projectId} key={title.projectId} className={selectedTitle?.projectId === title.projectId ? 'is-selected' : ''} onClick={() => setSelectedTitleId(title.projectId)}>{title.title}</button>)}
      </div>
      <div className="ocd-delivery-switch" aria-label="Localization delivery model">
        <button type="button" className={delivery === 'OUTSOURCE' ? 'is-selected' : ''} onClick={() => setDelivery('OUTSOURCE')}><RadioTower size={16} /><span><b>Outsource</b><small>Available now · faster delivery</small></span></button>
        <button type="button" className={delivery === 'IN_HOUSE' ? 'is-selected' : ''} onClick={() => setDelivery('IN_HOUSE')}><Headphones size={16} /><span><b>In-house</b><small>Cheaper · technology required</small></span></button>
      </div>
      {!languages.length ? <div className="ocd-empty"><BadgeCheck size={27} /><b>Original audio covers the opening footprint</b><p>Add another market to create new language work.</p></div> : (
        <div className="ocd-language-list">
          {languages.map(language => {
            const asset = platform.localizationOperations.titleLanguageAssets.find(item => item.titleId === selectedTitle?.projectId && item.languageId.toLowerCase() === language.toLowerCase());
            const subtitleJob = platform.localizationOperations.jobs.find(job => job.titleId === selectedTitle?.projectId && job.languageId.toLowerCase() === language.toLowerCase() && job.mode === 'SUBTITLE');
            const dubJob = platform.localizationOperations.jobs.find(job => job.titleId === selectedTitle?.projectId && job.languageId.toLowerCase() === language.toLowerCase() && job.mode === 'DUB');
            const subtitleQuote = selectedTitle ? getStreamingLocalizationQuote(player, selectedTitle.projectId, 'SUBTITLE', delivery) : null;
            const dubQuote = selectedTitle ? getStreamingLocalizationQuote(player, selectedTitle.projectId, 'DUB', delivery) : null;
            return <article key={language}>
              <header><div><Languages size={17} /><span><b>{language}</b><small>{view.countries.filter(country => country.languageDistribution.some(item => item.language === language)).map(country => country.country).join(' · ')}</small></span></div></header>
              <div>
                <button type="button" disabled={Boolean(asset?.subtitleReady || subtitleJob)} onClick={() => orderLanguage(language, 'SUBTITLE')}><Captions size={16} /><span><b>{asset?.subtitleReady ? 'Subtitles ready' : subtitleJob ? `Subtitles · ${statusCopy(subtitleJob.status)}` : 'Order subtitles'}</b><small>{subtitleQuote ? `${money(subtitleQuote.cashCost)} · ${subtitleQuote.deliveryWeeks}w` : '—'}</small></span></button>
                <button type="button" disabled={Boolean(asset?.dubReady || dubJob)} onClick={() => orderLanguage(language, 'DUB')}><Headphones size={16} /><span><b>{asset?.dubReady ? 'Dub ready' : dubJob ? `Dub · ${statusCopy(dubJob.status)}` : 'Order dub'}</b><small>{dubQuote ? `${money(dubQuote.cashCost)} · ${dubQuote.deliveryWeeks}w` : '—'}</small></span></button>
              </div>
            </article>;
          })}
        </div>
      )}
    </section>
  );

  return (
    <AccessibleDialog className="ocd-shell" aria-labelledby="ocd-title" onEscape={onClose}>
      <header className="ocd-topbar">
        <button type="button" onClick={onClose} aria-label="Close opening catalogue"><ArrowLeft size={20} /></button>
        <div><small>{platform.identity?.name || 'Your platform'} · CONTENT DESK</small><strong id="ocd-title">Opening Catalogue</strong></div>
        <span>{money(platform.treasuryCash)}<small>TREASURY</small></span>
      </header>
      <main className="ocd-scroll">
        <section className="ocd-hero">
          <div><span>PROGRAMMING CONTROL</span><h1>Make the shelf travel.</h1><p>Every title, territory and language master reads from the same launch record.</p></div>
          <div className="ocd-signal"><i className={view.rightsReady ? 'is-ready' : ''} /><span>{view.rightsReady ? 'RIGHTS READY' : `${view.launchBlockers.length} RIGHTS GAP${view.launchBlockers.length === 1 ? '' : 'S'}`}</span></div>
          <div className="ocd-hero-stats"><div><LibraryBig size={17} /><span><b>{view.titles.length}</b><small>TITLES</small></span></div><div><ShieldCheck size={17} /><span><b>{view.rightsReadyCountryCount}/{view.openingCountryCount}</b><small>MARKETS</small></span></div><div><Languages size={17} /><span><b>{view.readyLanguageAssets}</b><small>MASTERS</small></span></div><div><Clock3 size={17} /><span><b>{view.activeLocalizationJobs}</b><small>IN PROGRESS</small></span></div></div>
        </section>
        <nav className="ocd-tabs" aria-label="Opening catalogue sections">{(['PROGRAM', 'COVERAGE', 'LANGUAGES'] as DeskTab[]).map(item => <button type="button" key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
        {tab === 'PROGRAM' ? renderProgram() : tab === 'COVERAGE' ? renderCoverage() : renderLanguages()}
        {view.launchBlockers.length ? <section className="ocd-blockers"><CircleAlert size={18} /><div><b>Some titles have limited territory coverage</b>{view.launchBlockers.map(blocker => <p key={blocker}>{blocker}</p>)}</div></section> : null}
        {!view.qualityReady && view.rightsReady ? <section className="ocd-quality"><Languages size={18} /><div><b>Launchable, with reach left on the table</b><p>Dubbing and subtitles are optional quality investments. Missing them lowers reach; it does not invent a legal blocker.</p></div></section> : null}
        {feedback ? <div className="ocd-feedback" role="status">{feedback}{feedback.includes('short by') && onOpenFinance ? <button type="button" onClick={onOpenFinance}><WalletCards size={15} /> OPEN STUDIO FINANCE</button> : null}</div> : null}
        <div className="ocd-bottom-space" />
      </main>
    </AccessibleDialog>
  );
}
