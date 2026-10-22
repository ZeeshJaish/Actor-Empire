/* ============================================================================
   COUNTRY CARD — one country, as the Audience room sees it.

   Opened from the map, a region, the top-countries rail or the market list. It
   answers, in this order and mostly in pictures:

     · where do I stand here?          the state pill and the hero figure
     · who holds the homes?            one share bar, the same idea the Define
                                       wizard used, but live
     · what is this market like?       three facts, then the wizard's own
                                       Market dossier, folded away

   The dossier is the Define-the-Launch country report itself (CountryReport),
   not a copy of it — the exact page the player read when choosing markets, so
   the card is recognisably "that country page from the wizard", now with live
   numbers on top. It is rendered only when opened.
   ========================================================================== */

import React, { useMemo, useState } from 'react';
import css from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import { cx } from './presentation/cx';
import { CountryFlagSvg } from '../studio-finance/components/FlagField';
import { CountryReport } from '../studio-finance/components/launch/CountryReport';
import { brandVars as financeBrandVars } from '../studio-finance/finance/brand';
import { buildStreamingLaunchCountry } from '../StreamingDefineLaunchExperience';
import { getStreamingDayOneMarket } from '../../services/streamingDayOneMarkets';
import { WORLD_COUNTRY_DEFINITIONS_BY_ID } from '../../services/worldEconomy/worldCountryRegistry';
import { getCountryShapeId } from '../../services/worldEconomy/worldCountryGeography';
import { boundsForCountry, getCountryPath } from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import '../studio-finance/styles/tokens.css';
import '../studio-finance/styles/studio-finance.css';
import '../studio-finance/styles/launch.css';
import {
  AUDIENCE_WORDS,
  MARKET_STATE_LABELS,
  compact,
  formatShare,
  sharesOf,
  signedCompact,
  type AtlasCountry,
  type AudienceKind,
} from './audienceAtlasModel';

const STATE_TONE: Record<AtlasCountry['state'], string> = {
  LIVE: '#4ade80',
  OPENING: '#f5b544',
  PAUSED: '#ff6b6b',
  AVAILABLE: '#9aa3b3',
};

const STATUS_WORDS: Partial<Record<NonNullable<AtlasCountry['status']>, string>> = {
  PLANNED: 'Planned',
  AWAITING_FUNDING: 'Awaiting funding',
  CLEARANCE: 'In review',
  INFRASTRUCTURE_PREPARATION: 'Network preparing',
  READY: 'Ready for opening night',
};

/** The country's own shape, fitted to its box. Tiny island states with no
    drawable shape get a marker instead. */
const Silhouette: React.FC<{ countryId: string }> = ({ countryId }) => {
  const shape = useMemo(() => {
    const shapeId = getCountryShapeId(countryId);
    if (!shapeId) return null;
    const path = getCountryPath(shapeId);
    if (!path) return null;
    const [[x0, y0], [x1, y1]] = boundsForCountry(shapeId);
    const w = Math.max(4, x1 - x0); const h = Math.max(4, y1 - y0);
    const pad = Math.max(w, h) * 0.12;
    return { path, viewBox: `${x0 - pad} ${y0 - pad} ${w + pad * 2} ${h + pad * 2}`, stroke: Math.max(w, h) / 90 };
  }, [countryId]);
  if (!shape) {
    return (
      <svg className={css.silhouette} viewBox="0 0 100 74" aria-hidden="true">
        <circle cx="50" cy="37" r="12" />
      </svg>
    );
  }
  return (
    <svg className={css.silhouette} viewBox={shape.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={shape.path} strokeWidth={shape.stroke} />
    </svg>
  );
};

export interface AudienceCountrySheetProps {
  country: AtlasCountry;
  /** The platform has launched. */
  live: boolean;
  regionLabel: string;
  accent: string;
  /** The same brand colour as hex, for the wizard dossier's own brand variables. */
  accentHex?: string;
  onClose: () => void;
  /** Open ground: start entering this market. */
  onEnterMarket?: () => void;
  /** The enter button's words when the default ones don't fit (e.g. on the entry page). */
  enterLabel?: string;
  /** What "your audience" means for this service: accounts, ad homes or buyers. */
  audienceKind?: AudienceKind;
  onShowRegion?: () => void;
}

export const AudienceCountrySheet: React.FC<AudienceCountrySheetProps> = ({
  country, live, regionLabel, accent, accentHex, onClose, onEnterMarket, enterLabel, audienceKind = 'ACCOUNTS', onShowRegion,
}) => {
  const [dossierOpen, setDossierOpen] = useState(false);
  const view = country.view;
  const definition = WORLD_COUNTRY_DEFINITIONS_BY_ID[country.id];
  const languages = (definition?.languages || []).slice(0, 3).join(' · ');
  const { shares, unclaimedShare } = useMemo(() => sharesOf([view]), [view]);
  const playerShare = shares.find(item => item.id === 'PLAYER');
  const rivals = shares.filter(item => item.id !== 'PLAYER').slice(0, 4);
  const otherShare = Math.max(0, shares.filter(item => item.id !== 'PLAYER').slice(4).reduce((sum, item) => sum + item.share, 0));
  const yours = country.state === 'LIVE' || view.playerAudience > 0;
  const subscription = audienceKind === 'ACCOUNTS';
  const heroTone = country.state === 'AVAILABLE' ? '#7d8da3' : country.state === 'LIVE' ? accent : STATE_TONE[country.state];
  const watchingPercent = view.population > 0 ? Math.round(view.activeViewers / view.population * 100) : 0;
  const dossier = useMemo(() => {
    if (!dossierOpen) return null;
    const market = getStreamingDayOneMarket(country.id);
    return market ? buildStreamingLaunchCountry(market) : null;
  }, [country.id, dossierOpen]);

  const statePill = country.state === 'OPENING'
    ? `${STATUS_WORDS[country.status as keyof typeof STATUS_WORDS] || MARKET_STATE_LABELS.OPENING}${country.progress !== null ? ` · ${country.progress}%` : ''}`
    : MARKET_STATE_LABELS[country.state];

  return (
    <div className={css.sheetBackdrop} onClick={onClose}>
      <section
        className={css.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`${country.name} market card`}
        onClick={event => event.stopPropagation()}
      >
        <i className={css.sheetHandle} aria-hidden="true" />
        <header className={css.sheetHead}>
          <span className={css.sheetFlag}><CountryFlagSvg code={country.id} fit="stretch" /></span>
          <div>
            <small>{regionLabel}{languages ? ` · ${languages}` : ''}</small>
            <h3>{country.name}</h3>
          </div>
          <button type="button" className={css.sheetClose} onClick={onClose} aria-label="Close">✕</button>
        </header>
        <span className={css.statePill} style={{ color: STATE_TONE[country.state] }}><i />{statePill}</span>

        <div className={css.sheetHero} style={{ ['--hero-tone' as string]: heroTone }}>
          <Silhouette countryId={country.id} />
          <div className={css.heroFigure}>
            {yours && live ? (
              <>
                <span>YOUR {AUDIENCE_WORDS[audienceKind].plural.toUpperCase()}</span>
                <b>{view.playerAudience >= 100_000 ? compact(view.playerAudience) : view.playerAudience.toLocaleString()}</b>
                {subscription ? (
                  <em className={view.playerNetChange > 0 ? css.good : view.playerNetChange < 0 ? css.bad : ''}>
                    {view.playerNetChange !== 0 ? `${signedCompact(view.playerNetChange)} this week` : 'Steady this week'}
                  </em>
                ) : (
                  <em>{audienceKind === 'AD_HOMES' ? 'free with ads, this week' : 'rentals and purchases'}</em>
                )}
              </>
            ) : (
              <>
                <span>PEOPLE WATCHING</span>
                <b>{compact(view.activeViewers)}</b>
                <em>{compact(view.population)} people · {watchingPercent}% stream</em>
              </>
            )}
          </div>
        </div>

        {country.state === 'OPENING' && (
          <div className={css.sheetSection}>
            <h4>On its way <span>{STATUS_WORDS[country.status as keyof typeof STATUS_WORDS] || ''}</span></h4>
            <div className={css.progressTrack}><i style={{ width: `${country.progress ?? (country.status === 'READY' ? 100 : 12)}%` }} /></div>
          </div>
        )}

        <div className={css.sheetSection}>
          <h4>Who holds the homes <span>{compact(view.reachableHouseholds)} homes can stream</span></h4>
          <div className={css.homesBar} role="img" aria-label={`${Math.round(unclaimedShare)} percent of homes hold no service`}>
            {playerShare && <i className={css.you} style={{ width: `${playerShare.share}%`, background: accent }} />}
            {rivals.map(rival => <i key={rival.id} style={{ width: `${rival.share}%`, background: rival.color }} />)}
            {otherShare > 0 && <i style={{ width: `${otherShare}%`, background: '#5b6475' }} />}
            <i className={css.open} style={{ width: `${unclaimedShare}%` }} />
          </div>
          <div className={css.homesKeys}>
            {playerShare && <div className={css.youKey}><i style={{ background: accent }} /><span>You</span><b>{formatShare(playerShare.share)}</b></div>}
            {rivals.map(rival => <div key={rival.id}><i style={{ background: rival.color }} /><span>{rival.name}</span><b>{rival.share.toFixed(0)}%</b></div>)}
            <div className={css.openKey}><i /><span>Nobody yet</span><b>{unclaimedShare.toFixed(0)}%</b></div>
          </div>
        </div>

        <div className={css.sheetSection}>
          <h4>This week</h4>
          <div className={css.factGrid}>
            {yours && live ? (
              <>
                {subscription
                  ? <div><span>SHARE OF HOMES</span><b>{playerShare ? formatShare(playerShare.share) : '—'}</b></div>
                  : <div><span>PEOPLE WATCHING</span><b>{compact(view.activeViewers)}</b></div>}
                <div><span>REVENUE / MO</span><b>${compact(view.playerMonthlyRevenueTotal)}</b></div>
                <div><span>UNCLAIMED</span><b>{compact(view.unclaimedHouseholds)}</b><small>homes</small></div>
              </>
            ) : (
              <>
                <div><span>PAYING HOMES</span><b>{compact(view.payingHouseholds)}</b></div>
                <div><span>UNCLAIMED</span><b>{compact(view.unclaimedHouseholds)}</b><small>homes</small></div>
                <div><span>LEADER</span><b style={{ color: rivals[0]?.color }}>{rivals[0] ? `${rivals[0].share.toFixed(0)}%` : '—'}</b><small>{rivals[0]?.name || 'nobody'}</small></div>
              </>
            )}
          </div>
        </div>

        <details className={css.dossierFold} onToggle={event => setDossierOpen((event.currentTarget as HTMLDetailsElement).open)}>
          <summary>
            <div><b>Market dossier</b><small>The Define the Launch report · launch-time estimates</small></div>
            <em aria-hidden="true">＋</em>
          </summary>
          <div className={css.dossierBody}>
            {dossier
              ? <div className={cx('sf', css.dossierScope)} style={financeBrandVars(accentHex) as React.CSSProperties}><CountryReport country={dossier} /></div>
              : dossierOpen ? <small>No dossier is filed for this country yet.</small> : null}
          </div>
        </details>

        <div className={css.sheetActions}>
          {country.state === 'AVAILABLE' && onEnterMarket ? (
            <button type="button" className={css.sheetPrimary} onClick={onEnterMarket}>{enterLabel ?? (live ? 'Enter this market' : 'Add to opening markets')}</button>
          ) : onShowRegion ? (
            <button type="button" className={css.sheetPrimary} onClick={onShowRegion}>See {regionLabel}</button>
          ) : null}
          <button type="button" className={css.sheetSecondary} onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
};
