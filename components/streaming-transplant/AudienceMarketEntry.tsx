/* ============================================================================
   ENTER NEW MARKETS — the Audience room's own page for growing the footprint
   after launch.

   It replaces the old expansion wizard (StreamingMarketExpansionWizard, the
   pre-redesign "Mission 02" screens) with the same pieces the rest of the room
   uses: the living map, the region strip, flag cards and the country card.

     CHOOSE     fly the map, pick countries (they light up white), see every
                pick's true entry cost, review time and energy in one tray,
                then file them in a single action
     CLEARANCE  every expansion file and where it stands in government review,
                with the one button each needs when a government asks for more

   Presentation only. Every mutation is a callback the HQ owns (`actions`), so
   the page never touches the save itself, and no tap here loads code or saves
   anything except the explicit File / Submit / Refile buttons.
   ========================================================================== */

import React, { useCallback, useMemo, useState } from 'react';
import css from './presentation/screens/AudienceDesk/AudienceMarketEntry.module.css';
import { cx } from './presentation/cx';
import { AudienceAtlas } from './AudienceAtlas';
import { RegionRail } from './AudiencePanels';
import { CountryFlagSvg } from '../studio-finance/components/FlagField';
import {
  REGION_SHORT_LABELS,
  compact,
  summariseRegions,
  type AtlasCountry,
  type AtlasRegionId,
} from './audienceAtlasModel';
import { getStreamingCountryMarketProfile, getStreamingDayOneMarket } from '../../services/streamingDayOneMarkets';
import {
  STREAMING_MARKET_REAPPLICATION_ENERGY,
  STREAMING_MARKET_REQUIREMENT_ENERGY,
  getStreamingMarketClearanceView,
} from '../../services/streamingMarkets';
import type { OwnedStreamingMarketOperation } from '../../types';

export interface MarketEntryOutcome {
  ok: boolean;
  message: string;
}

/** What the HQ lends the page: the player's purse and the canonical actions. */
export interface MarketEntryActions {
  energy: number;
  treasury: number;
  absoluteWeek: number;
  quoteEnergy: (countryIds: string[]) => number;
  /** How well your built network reaches each country: served, a thin signal, or dark. */
  coverageOf: (countryIds: string[]) => Record<string, 'SERVED' | 'THIN' | 'DARK'>;
  /** Add these countries to the expansion plan and file them for clearance. */
  file: (countryIds: string[]) => MarketEntryOutcome;
  /** Pay a government's additional requirement on a file. */
  resolve: (operationId: string) => MarketEntryOutcome;
  /** Refile after a temporary rejection, once the cooling period is over. */
  reapply: (operationId: string) => MarketEntryOutcome;
}

const money = (value: number) => `$${compact(Math.max(0, Math.round(value)))}`;
/* Every live country costs at least this a week to operate (streamingMarketEconomics). */
const MIN_WEEKLY_OPERATING_COST = 55_000;
const MIN_WEEKLY_LABEL = `$${MIN_WEEKLY_OPERATING_COST / 1000}K`;
const COVERAGE_WORDS: Record<'SERVED' | 'THIN' | 'DARK', string> = { SERVED: 'network ready', THIN: 'thin signal', DARK: 'no network yet' };
const STAGES = ['APPLICATION_FILED', 'RIGHTS_VERIFICATION', 'REGULATORY_REVIEW', 'CONSUMER_DATA_COMPLIANCE', 'FINAL_APPROVAL'];
const DIFFICULTY_TONE: Record<string, string> = { EASY: '#4ade80', MODERATE: '#f5b544', HARD: '#ff6b6b' };
const DIFFICULTY_WORDS: Record<string, string> = { EASY: 'Easy launch', MODERATE: 'Moderate launch', HARD: 'Hard launch' };

interface EntryFacts {
  growth: number;
  difficulty: string;
  cost: number;
  weeks: string;
  languages: string[];
}
const factsCache = new Map<string, EntryFacts | null>();
const factsOf = (countryId: string): EntryFacts | null => {
  if (factsCache.has(countryId)) return factsCache.get(countryId)!;
  const market = getStreamingDayOneMarket(countryId);
  const profile = getStreamingCountryMarketProfile(countryId);
  const facts = market && profile ? {
    growth: market.annualGrowthPercent,
    difficulty: market.launchDifficulty,
    cost: profile.entryCosts.total,
    weeks: `${profile.approvalPeriodWeeks.minimum}–${profile.approvalPeriodWeeks.maximum} wk`,
    languages: market.languages,
  } : null;
  factsCache.set(countryId, facts);
  return facts;
};

export const AudienceMarketEntry: React.FC<{
  accent: string;
  countries: AtlasCountry[];
  operations: OwnedStreamingMarketOperation[];
  actions: MarketEntryActions;
  /** The pick is owned by the room, so the country card can add to it too. */
  picked: string[];
  onPickedChange: (update: (current: string[]) => string[]) => void;
  initialRegion?: AtlasRegionId | null;
  initialTab?: 'CHOOSE' | 'CLEARANCE';
  onOpenCountry: (countryId: string) => void;
  onClose: () => void;
}> = ({ accent, countries, operations, actions, picked: pickedIds, onPickedChange, initialRegion = null, initialTab, onOpenCountry, onClose }) => {
  const expansion = useMemo(() => operations.filter(operation => operation.scope === 'COUNTRY' && operation.entryKind === 'EXPANSION' && operation.status !== 'EXITED'), [operations]);
  const [tab, setTab] = useState<'CHOOSE' | 'CLEARANCE'>(initialTab ?? (pickedIds.length || !expansion.length ? 'CHOOSE' : 'CLEARANCE'));
  const [focusRegion, setFocusRegion] = useState<AtlasRegionId | null>(initialRegion);
  const picked = useMemo(() => new Set(pickedIds), [pickedIds]);
  const setPicked = (next: Set<string>) => onPickedChange(() => Array.from(next));
  const [showAll, setShowAll] = useState(false);
  const [feedback, setFeedback] = useState<MarketEntryOutcome | null>(null);

  const regions = useMemo(() => summariseRegions(countries), [countries]);
  const open = useMemo(() => countries.filter(country => country.state === 'AVAILABLE'), [countries]);
  const openByRegion = useMemo(() => {
    const counts = new Map<string, number>();
    open.forEach(country => counts.set(country.regionId, (counts.get(country.regionId) || 0) + 1));
    return counts;
  }, [open]);
  /* Biggest audiences first, measured the way the rest of the room measures
     them: people watching this week in the world simulation. */
  const scopedOpen = useMemo(() => (focusRegion ? open.filter(country => country.regionId === focusRegion) : open)
    .slice().sort((left, right) => right.view.activeViewers - left.view.activeViewers), [focusRegion, open]);
  const shownOpen = showAll ? scopedOpen : scopedOpen.slice(0, 10);
  /* Coverage only for what is on screen and in the pick: it walks every
     facility against every audience cluster, so it is not run for all 197. */
  const coverageIds = useMemo(() => Array.from(new Set([...shownOpen.map(country => country.id), ...pickedIds])).sort(), [pickedIds, shownOpen]);
  const coverage = useMemo(() => actions.coverageOf(coverageIds), [actions, coverageIds]);

  const toggle = useCallback((countryId: string) => {
    setFeedback(null);
    onPickedChange(current => (current.includes(countryId) ? current.filter(id => id !== countryId) : [...current, countryId]));
  }, [onPickedChange]);
  const addAll = () => {
    setFeedback(null);
    onPickedChange(current => Array.from(new Set([...current, ...scopedOpen.map(country => country.id)])));
  };
  /* A tap on the map picks open ground; a country you already serve opens its card instead. */
  const onMapCountry = useCallback((countryId: string) => {
    const country = countries.find(item => item.id === countryId);
    if (country?.state === 'AVAILABLE') toggle(countryId);
    else onOpenCountry(countryId);
  }, [countries, onOpenCountry, toggle]);

  /* The tray: exact figures for the pick, the same numbers the filing charges. */
  const pickList = useMemo(() => countries.filter(country => picked.has(country.id)), [countries, picked]);
  const totals = useMemo(() => pickList.reduce((sum, country) => {
    const facts = factsOf(country.id);
    return { viewers: sum.viewers + country.view.activeViewers, cost: sum.cost + (facts?.cost ?? 0) };
  }, { viewers: 0, cost: 0 }), [pickList]);
  const energy = useMemo(() => actions.quoteEnergy(pickList.map(country => country.id)), [actions, pickList]);
  const shortCash = totals.cost > actions.treasury;
  const darkPicks = pickList.filter(country => coverage[country.id] === 'DARK');
  const shortEnergy = energy > actions.energy;

  const file = () => {
    const outcome = actions.file(pickList.map(country => country.id));
    setFeedback(outcome);
    if (outcome.ok) {
      setPicked(new Set());
      setTab('CLEARANCE');
    }
  };

  const pickedSet: ReadonlySet<string> = picked;
  const focusLabel = focusRegion ? REGION_SHORT_LABELS[focusRegion] : 'the world';

  return (
    <div className={css.entry} role="dialog" aria-modal="true" aria-label="Enter new markets" style={{ ['--entry-accent' as string]: accent }}>
      <header className={css.top}>
        <button type="button" className={css.back} onClick={onClose} aria-label="Back to Markets">←</button>
        <div>
          <small>AUDIENCE · EXPANSION</small>
          <b>Enter new markets</b>
        </div>
        <span className={css.purse}><b>{money(actions.treasury)}</b><small>{actions.energy}E</small></span>
      </header>

      <div className={css.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'CHOOSE'} className={tab === 'CHOOSE' ? css.on : ''} onClick={() => setTab('CHOOSE')}>
          Choose{picked.size > 0 && <i>{picked.size}</i>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'CLEARANCE'} className={tab === 'CLEARANCE' ? css.on : ''} onClick={() => setTab('CLEARANCE')}>
          Clearance{expansion.length > 0 && <i>{expansion.length}</i>}
        </button>
      </div>

      <div className={cx(css.scroll, tab === 'CHOOSE' && pickList.length > 0 && css.scrollTray)}>
        {feedback && <p className={cx(css.feedback, feedback.ok ? css.good : css.bad)} role="status">{feedback.message}</p>}

        {tab === 'CHOOSE' && (
          <>
            <AudienceAtlas
              mode="OPERATIONS"
              countries={countries}
              regions={regions}
              accent={accent}
              focusRegion={focusRegion}
              picked={pickedSet}
              onFocusRegion={setFocusRegion}
              onSelectCountry={onMapCountry}
              reading={{ value: String(picked.size), caption: picked.size ? `picked · ${compact(totals.viewers)} watching` : 'picked · tap open ground' }}
              aside={{ value: String(focusRegion ? openByRegion.get(focusRegion) || 0 : open.length), caption: 'open ground' }}
            />
            <RegionRail regions={regions} focus={focusRegion} onFocus={setFocusRegion}
              valueOf={region => openByRegion.get(region.id) || 0} worldValue={open.length} format={value => String(value)} />

            {pickList.length > 0 && (
              <div className={css.picks} aria-label="Picked countries">
                {pickList.map(country => (
                  <button key={country.id} type="button" onClick={() => toggle(country.id)} aria-label={`Remove ${country.name}`}>
                    <span className={css.pickFlag}><CountryFlagSvg code={country.id} fit="stretch" /></span>{country.name}<em>×</em>
                  </button>
                ))}
              </div>
            )}

            <div className={css.secHead}>
              <h2>Open ground</h2>
              {focusRegion && scopedOpen.length > 0
                ? <button type="button" onClick={addAll}>Add all {scopedOpen.length}</button>
                : <span>biggest audiences in {focusLabel}</span>}
            </div>
            {scopedOpen.length === 0 ? (
              <div className={css.empty}><b>Nothing left to enter here</b><span>Every country in {focusLabel} is already live or on its way.</span></div>
            ) : (
              <div className={css.cards}>
                {shownOpen.map(country => {
                  const facts = factsOf(country.id);
                  const on = picked.has(country.id);
                  return (
                    <article key={country.id} className={cx(css.card, on && css.cardOn)}>
                      <button type="button" className={css.cardBody} onClick={() => onOpenCountry(country.id)} aria-label={`${country.name} country card`}>
                        <span className={css.cardFlag}><CountryFlagSvg code={country.id} fit="stretch" /></span>
                        <span className={css.cardName}><b>{country.name}</b><small>{country.view.platformHouseholds[0] ? `led by ${country.view.platformHouseholds[0].name}` : 'no leader yet'}</small></span>
                        <span className={css.cardViewers}><b>{country.view.activeViewers > 0 ? compact(country.view.activeViewers) : '—'}</b><small>watching</small></span>
                      </button>
                      <div className={css.cardFacts}>
                        {facts && <span style={{ ['--tone' as string]: DIFFICULTY_TONE[facts.difficulty] || '#9aa3b3' }}><i />{DIFFICULTY_WORDS[facts.difficulty] || facts.difficulty}</span>}
                        {facts && <span>+{facts.growth}% a year</span>}
                        {facts && <span>{money(facts.cost)}</span>}
                        {facts && <span>{facts.weeks}</span>}
                        {coverage[country.id] && <span className={css[`cover_${coverage[country.id]}`]}><i />{COVERAGE_WORDS[coverage[country.id]]}</span>}
                      </div>
                      <button type="button" className={cx(css.pick, on && css.pickOn)} onClick={() => toggle(country.id)} aria-pressed={on}>
                        {on ? '✓ Picked' : '+ Pick'}
                      </button>
                    </article>
                  );
                })}
                {scopedOpen.length > shownOpen.length && (
                  <button type="button" className={css.more} onClick={() => setShowAll(true)}>Show all {scopedOpen.length}</button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'CLEARANCE' && (
          expansion.length === 0 ? (
            <div className={css.empty}><b>No expansion files yet</b><span>Pick countries on Choose and file them. Government review runs here, 4–6 weeks per country, all in parallel.</span></div>
          ) : (
            <div className={css.files}>
              {expansion.map(operation => {
                const view = getStreamingMarketClearanceView(operation, actions.absoluteWeek);
                const stageIndex = view.stage ? STAGES.indexOf(view.stage) : -1;
                const name = operation.countryProfile?.country || getStreamingDayOneMarket(operation.countryId || '')?.country || operation.countryId || operation.scopeId;
                const unfiled = ['PLANNED', 'AWAITING_FUNDING'].includes(operation.status) && operation.clearance?.outcome !== 'ADDITIONAL_REQUIREMENT';
                const live = operation.status === 'ACTIVE';
                const tone = live ? 'live' : view.actionRequired !== 'NONE' ? 'alert' : unfiled ? 'idle' : 'review';
                return (
                  <article key={operation.id} className={cx(css.file, css[`file_${tone}`])}>
                    <header>
                      <span className={css.cardFlag}><CountryFlagSvg code={operation.countryId || ''} fit="stretch" /></span>
                      <span className={css.cardName}><b>{name}</b><small>{live ? 'Live · serving viewers' : unfiled ? 'Planned · not filed yet' : view.stageLabel}</small></span>
                      <em>{live ? 'LIVE' : view.actionRequired === 'PAY_REQUIREMENT' ? 'ACTION' : view.actionRequired === 'REAPPLY' ? 'REJECTED' : unfiled ? 'PLANNED' : `${Math.round(view.progressPercent)}%`}</em>
                    </header>
                    {!unfiled && !live && (
                      <>
                        <div className={css.progress}><i style={{ width: `${view.progressPercent}%` }} /></div>
                        <div className={css.stages}>{STAGES.map((stage, index) => <i key={stage} className={index <= stageIndex ? css.done : ''} title={stage.replaceAll('_', ' ').toLowerCase()} />)}</div>
                        <p className={css.fileNote}>{view.condition || (view.remainingWeeks === 0 ? 'Decision due this week.' : view.remainingWeeks !== null ? `${view.remainingWeeks} week${view.remainingWeeks === 1 ? '' : 's'} to a decision.` : 'In review.')}</p>
                      </>
                    )}
                    {unfiled && (
                      <button type="button" className={css.fileAction} onClick={() => setFeedback(actions.file([operation.countryId || '']))}
                        disabled={operation.plannedCosts.total > actions.treasury || actions.quoteEnergy([operation.countryId || '']) > actions.energy}>
                        File {name} · {money(operation.plannedCosts.total)} · {actions.quoteEnergy([operation.countryId || ''])}E
                      </button>
                    )}
                    {view.actionRequired === 'PAY_REQUIREMENT' && (
                      <button type="button" className={css.fileAction} onClick={() => setFeedback(actions.resolve(operation.id))}
                        disabled={view.additionalPayment > actions.treasury || STREAMING_MARKET_REQUIREMENT_ENERGY > actions.energy}>
                        Submit requirement · {money(view.additionalPayment)} · {STREAMING_MARKET_REQUIREMENT_ENERGY}E
                      </button>
                    )}
                    {view.actionRequired === 'REAPPLY' && (
                      <button type="button" className={css.fileAction} onClick={() => setFeedback(actions.reapply(operation.id))}
                        disabled={STREAMING_MARKET_REAPPLICATION_ENERGY > actions.energy || (operation.clearance?.resumeAllowedAtAbsoluteWeek || 0) > actions.absoluteWeek}>
                        {(operation.clearance?.resumeAllowedAtAbsoluteWeek || 0) > actions.absoluteWeek
                          ? `Refile in ${(operation.clearance?.resumeAllowedAtAbsoluteWeek || 0) - actions.absoluteWeek} weeks`
                          : `File revised application · ${STREAMING_MARKET_REAPPLICATION_ENERGY}E`}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )
        )}
      </div>

      {tab === 'CHOOSE' && pickList.length > 0 && (
        <footer className={css.tray}>
          <div className={css.trayFacts}>
            <span><b>{pickList.length}</b><small>{pickList.length === 1 ? 'country' : 'countries'}</small></span>
            <span><b>{compact(totals.viewers)}</b><small>watching</small></span>
            <span className={shortCash ? css.short : ''}><b>{money(totals.cost)}</b><small>entry</small></span>
            <span className={shortEnergy ? css.short : ''}><b>{energy}E</b><small>energy</small></span>
          </div>
          <button type="button" className={css.fileAll} onClick={file} disabled={shortCash || shortEnergy}>
            {shortCash ? `Treasury short by ${money(totals.cost - actions.treasury)}`
              : shortEnergy ? `${energy - actions.energy}E short`
                : `File ${pickList.length} for clearance · ${money(totals.cost)}`}
          </button>
          {darkPicks.length > 0 && (
            <p className={css.trayWarn}>
              {darkPicks.length === 1 ? `${darkPicks[0].name} has` : `${darkPicks.length} picks have`} no network reach yet: once live {darkPicks.length === 1 ? 'it costs' : 'they cost'} from {MIN_WEEKLY_LABEL} a week each but can't serve viewers until you build a server room in the region.
            </p>
          )}
          <small className={css.trayNote}>Entry pays rights and compliance now. Review runs 4–6 weeks per country, in parallel. Once live, each country costs from {MIN_WEEKLY_LABEL} a week to run.</small>
        </footer>
      )}
    </div>
  );
};
