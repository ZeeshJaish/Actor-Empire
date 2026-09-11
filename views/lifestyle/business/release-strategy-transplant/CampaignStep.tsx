import React from 'react';
import { FilmSheet, type FilmSheetStyle } from './FilmSheet';
import { Glyph } from './Glyph';
import type { ReleaseFilmArt } from './model';
import css from './ReleaseStrategy.module.css';

export interface CampaignPositionModel { id: string; label: string; shortLabel: string; description: string; promise: string; hue: number; style: FilmSheetStyle }
export interface CampaignTimelineModel { id: string; label: string; description: string; weights: number[] }
export interface CampaignChannelModel { id: string; label: string; description: string; icon: string; amount: number }
export interface CampaignForecastModel { score: number; label: string; openingRange: string; breakEvenChance: number; weekTwoDropRisk: number; streamingBidBoost: number; awardsVisibility: number; note: string }
export interface CampaignSoundtrackModel { label: string; score: number; openingLift: number; trailerLift: number; mismatchRisk: number }

const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');
const millions = (value: number) => `$${(Math.max(0, value) / 1_000_000).toFixed(1)}M`;

export const CampaignStep: React.FC<{
  film: ReleaseFilmArt;
  positions: CampaignPositionModel[];
  selectedPositionId: string;
  timelines: CampaignTimelineModel[];
  selectedTimelineId: string;
  forecast: CampaignForecastModel;
  soundtrack: CampaignSoundtrackModel;
  channels: CampaignChannelModel[];
  budget: number;
  spent: number;
  allocationStep: number;
  onSelectPosition: (id: string) => void;
  onSelectTimeline: (id: string) => void;
  onChangeChannel: (id: string, delta: number) => void;
  onContinue: () => void;
  onBack: () => void;
}> = ({ film, positions, selectedPositionId, timelines, selectedTimelineId, forecast, soundtrack, channels, budget, spent, allocationStep, onSelectPosition, onSelectTimeline, onChangeChannel, onContinue, onBack }) => {
  const position = positions.find(item => item.id === selectedPositionId) || positions[0];
  const timeline = timelines.find(item => item.id === selectedTimelineId) || timelines[0];
  const remaining = Math.max(0, budget - spent);
  return <div className={css.cmp} style={{ '--ch': String(position?.hue || 28) } as React.CSSProperties}>
    <div className={css.cmpwash} />
    <section className={css.oneup}>
      <div className={css.oneupsheet}><FilmSheet film={film} size="md" dress={position?.style || 'mass'} /></div>
      <div className={css.oneupside}>
        <span className={css.seclabel}>THE PROMISE</span>
        <b className={css.oneupname}>{position?.shortLabel}</b>
        <em className={css.oneupkind}>{position?.label.toUpperCase()}</em>
        <p>{position?.promise}</p>
        <span className={css.oneupnote}>{position?.description}</span>
      </div>
    </section>

    <section className={css.sec}>
      <div className={css.sechead}><span className={css.seclabel}>CAMPAIGN POSITION</span><em className={css.step}>01 / 05</em></div>
      <div className={css.posrail}>{positions.map(item => <button type="button" key={item.id} aria-label={item.label} aria-pressed={item.id === selectedPositionId} onClick={() => onSelectPosition(item.id)}
        className={join(css.poscard, item.id === selectedPositionId && css.on)} style={{ '--dh': String(item.hue) } as React.CSSProperties}>
        <span className={css.posicon}><Glyph id={item.id === 'PRESTIGE_PUSH' ? 'star' : item.id === 'VIRAL_HEAT' ? 'share' : 'megaphone'} /></span><em>{item.shortLabel.toUpperCase()}</em><b>{item.label}</b>
      </button>)}</div>
    </section>

    <section className={css.sec}>
      <div className={css.sechead}><span className={css.seclabel}>CAMPAIGN TIMELINE</span><em className={css.step}>02 / 05</em></div>
      <div className={css.strip}>
        <div className={css.perfs}>{Array.from({ length: 11 }).map((_, i) => <i key={i} />)}</div>
        <div className={css.frames}>{(timeline?.weights || []).map((weight, i) => <span key={i} className={join(css.frame, i === 5 && css.framerel)} style={{ '--w': String(weight), '--ch': String(position?.hue || 28) } as React.CSSProperties}><i /></span>)}<span className={css.gate} /></div>
        <div className={css.saxis}><em>TEASE</em><em className={css.sopen}>OPENING</em><em>HOLD</em></div>
      </div>
      <div className={css.tpicks}>{timelines.map(item => <button type="button" key={item.id} className={join(css.tpick, item.id === selectedTimelineId && css.on)} onClick={() => onSelectTimeline(item.id)} aria-pressed={item.id === selectedTimelineId}><em>{item.description}</em><b>{item.label}</b></button>)}</div>
    </section>

    <section className={css.sec}>
      <div className={css.sechead}><span className={css.seclabel}>STUDIO FORECAST</span><em className={css.step}>03 / 05</em></div>
      <div className={css.fcast}>
        <div className={css.readrow}><div className={css.dial}><svg viewBox="0 0 80 48"><path d="M8 42A32 32 0 0 1 72 42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" /><path d="M8 42A32 32 0 0 1 72 42" fill="none" stroke="currentColor" strokeWidth="7" pathLength="100" strokeDasharray={`${forecast.score} 100`} /></svg><b>{forecast.score}</b><em>{forecast.label.toUpperCase()}</em></div><div className={css.readside}><em>OPENING RANGE</em><b>{forecast.openingRange}</b><span>MODELLED FROM CURRENT GAME STATE</span></div></div>
        <div className={css.bigtwo}><div><em>BREAK-EVEN</em><b>{forecast.breakEvenChance}%</b></div><div><em>WEEK-TWO DROP</em><b>{forecast.weekTwoDropRisk}%</b></div></div>
        <div className={css.bigtwo}><div><em>STREAMING BID</em><b>+{forecast.streamingBidBoost}%</b></div><div><em>AWARDS VISIBILITY</em><b>+{forecast.awardsVisibility}%</b></div></div>
        <p className={css.fnote}>{forecast.note}</p>
      </div>
    </section>

    <section className={join(css.sec, css.sound)}>
      <div className={css.sechead}><span className={css.seclabel}>SOUNDTRACK IMPACT</span><em className={css.step}>04 / 05</em></div>
      <div className={css.soundtop}><div className={css.sleeve}><i className={css.disc} /><span className={css.sleevemark}><Glyph id="signal" /></span></div><div className={css.soundmeta}><b className={css.soundlabel}>{soundtrack.label}</b><em className={css.score}>FIT {soundtrack.score}</em></div></div>
      <div className={css.srow}><span className={css.good}><b>+{soundtrack.openingLift}%</b><em>OPENING</em></span><span className={css.cool}><b>+{soundtrack.trailerLift}</b><em>TRAILER</em></span><span className={css.quiet}><b>{soundtrack.mismatchRisk}%</b><em>MISMATCH</em></span></div>
    </section>

    <section className={css.sec}>
      <div className={css.sechead}><span className={css.seclabel}>CHANNEL MIX</span><em className={css.step}>05 / 05</em></div>
      <div className={css.pool}><div><em>SPENT</em><b>{millions(spent)}</b></div><div className={css.poolfree}><em>AVAILABLE</em><b data-testid="campaign-remaining">{millions(remaining)}</b></div><span className={css.pooltrack}><u style={{ width: `${budget > 0 ? Math.min(100, spent / budget * 100) : 0}%` }} /></span></div>
      <div className={css.available}>{millions(budget)} AVAILABLE</div>
      <div className={css.chans}>{channels.map(channel => {
        const share = budget > 0 ? channel.amount / budget * 100 : 0;
        return <article key={channel.id} className={join(css.chan, channel.amount > 0 && css.on)}>
          <span className={css.chanicon}><Glyph id={channel.icon} /></span><div className={css.chantext}><b>{channel.label}</b><em>{channel.description}</em></div>
          <div className={css.chanset}><button type="button" className={css.stepbtn} disabled={channel.amount <= 0} onClick={() => onChangeChannel(channel.id, -allocationStep)} aria-label={`Decrease ${channel.label}`}>−</button><span className={css.readout}><b data-testid={`channel-${channel.id}-value`}>{millions(channel.amount)}</b></span><button type="button" className={css.stepbtn} disabled={remaining < allocationStep} onClick={() => onChangeChannel(channel.id, allocationStep)} aria-label={`Increase ${channel.label}`}>+</button></div>
          <div className={css.chanfoot}><em>{share.toFixed(0)}% OF POOL</em><span className={css.pips}>{[1,2,3,4,5].map(pip => <i key={pip} className={pib(pip, share) ? css.lit : ''} />)}</span></div><i className={css.chanfill} style={{ width: `${share}%` }} />
        </article>;
      })}</div>
    </section>
    <div className={css.foot}><button type="button" className={css.backText} onClick={onBack}>BACK</button><button type="button" className={css.next} onClick={onContinue}>CONTINUE</button></div>
  </div>;
};

const pib = (pip: number, share: number) => share >= pip * 8;
