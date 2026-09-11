import React from 'react';
import { FilmSheet, type FilmSheetStyle } from './FilmSheet';
import { Glyph } from './Glyph';
import type { ReleaseFilmArt, ReleaseWizardRoute } from './model';
import css from './ReleaseStrategy.module.css';

export interface FinalizeStepModel {
  film: ReleaseFilmArt;
  route: ReleaseWizardRoute;
  campaignStyle: FilmSheetStyle;
  campaignLabel: string;
  campaignPromise: string;
  timelineLabel: string;
  channelCount: number;
  campaignSpend: number;
  campaignReturn: number;
  festivalLabel: string | null;
  releaseWeek: number;
  screenCount?: number;
  regionCount?: number;
  partnerNames?: string[];
  bookingCost?: number;
  studioShare?: number;
  valueRange?: [number, number];
  buyerName?: string | null;
  buyerNames?: string[];
}

const money = (value: number) => value >= 1_000_000_000 ? `$${(value / 1_000_000_000).toFixed(1)}B` : value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1_000)}k`;
const Chip: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => <div className={css.mchip}><span>{label}</span><b>{value}</b>{sub && <em>{sub}</em>}</div>;

export const FinalizeStep: React.FC<FinalizeStepModel & { energyCost: number; disabled: boolean; disabledReason?: string; onLock: () => void; onBack: () => void }> = ({ film, route, campaignStyle, campaignLabel, campaignPromise, timelineLabel, channelCount, campaignSpend, campaignReturn, festivalLabel, releaseWeek, screenCount = 0, regionCount = 0, partnerNames = [], bookingCost = 0, studioShare = 0, valueRange, buyerName, buyerNames = [], energyCost, disabled, disabledReason, onLock, onBack }) => <>
  <div className={css.standee} style={{ '--fh': route === 'STREAMING' ? '210' : String(film.hue) } as React.CSSProperties}>
    <div className={css.casebox}><div className={css.caseart}><FilmSheet film={film} size="lg" dress={campaignStyle} />{festivalLabel && <span className={css.wonlaurel}><em>OFFICIAL{`\n`}SELECTION</em></span>}</div><div className={css.plate2}><b>{route === 'STREAMING' ? (buyerNames.length > 1 ? 'A SHARED STREAMING RELEASE' : buyerName ? `A ${buyerName.toUpperCase()} RELEASE` : 'A STREAMING RELEASE') : `IN CINEMAS${screenCount ? ` ON ${screenCount.toLocaleString()} SCREENS` : ''}`}</b><em>WEEK {releaseWeek}</em></div></div><span className={css.caseglow} />
  </div>
  <span className={css.manifesthead}>THE STRATEGY</span>
  <div className={css.manifest}>
    <Chip label="DISTRIBUTION" value={route === 'STREAMING' ? 'Streaming' : 'Theatrical'} />
    {route === 'THEATRICAL' && <Chip label="FOOTPRINT" value={`${screenCount.toLocaleString()} screens`} sub={`${regionCount} regions`} />}
    {route === 'THEATRICAL' && <Chip label="WHO CARRIES IT" value={partnerNames.length ? `${partnerNames.length} chains` : 'None'} sub={partnerNames.join(' · ')} />}
    {route === 'STREAMING' && buyerNames.length > 1 && <Chip label="BUYERS" value={`${buyerNames.length} platforms`} sub={buyerNames.join(' · ')} />}
    {route === 'STREAMING' && buyerNames.length <= 1 && buyerName && <Chip label="BUYER" value={buyerName} />}
    <Chip label="CAMPAIGN POSITION" value={campaignLabel} sub={campaignPromise} />
    <Chip label="TIMELINE" value={timelineLabel} />
    <Chip label="MARKETING" value={`${channelCount} channels`} sub={`${money(campaignReturn)} returns`} />
    <Chip label="FESTIVAL" value={festivalLabel || 'Skipped'} />
    <Chip label="RELEASE DATE" value={`Week ${releaseWeek}`} />
  </div>
  <div className={css.tolls}>
    <div className={css.toll}><span>CAMPAIGN SPEND<em>leaves the wallet on lock</em></span><b>{money(campaignSpend)}</b></div>
    {route === 'THEATRICAL' && valueRange && <div className={`${css.toll} ${css.tollworth}`}><span>WHAT THE RUN IS WORTH</span><b>{money(valueRange[0])} – {money(valueRange[1])}</b><div className={css.dealsplit}><em><i>{Math.round(studioShare * 100)}%</i>studio receipts</em><em><i>{money(bookingCost)}</i>booking cost</em></div></div>}
  </div>
  {disabled && disabledReason && <p className={css.lockReason}>{disabledReason}</p>}
  <div className={css.foot}><button type="button" className={css.backText} onClick={onBack}>BACK</button><button type="button" className={`${css.lock} ${disabled ? css.dead : ''}`} disabled={disabled} onClick={onLock}><Glyph id="bolt" size={15} /> LOCK STRATEGY <i>{energyCost}E</i></button></div>
</>;
