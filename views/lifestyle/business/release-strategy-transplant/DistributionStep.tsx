import React from 'react';
import type { ReleaseFilmArt, ReleaseWizardRoute } from './model';
import { FilmSheet } from './FilmSheet';
import css from './ReleaseStrategy.module.css';

const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

export const DistributionStep: React.FC<{
  film: ReleaseFilmArt;
  selected: ReleaseWizardRoute | null;
  theatricalDisabled: boolean;
  streamingDisabled: boolean;
  theatricalNote?: string;
  streamingNote?: string;
  onSelect: (route: ReleaseWizardRoute) => void;
  onContinue: () => void;
  locked?: boolean;
}> = ({ film, selected, theatricalDisabled, streamingDisabled, theatricalNote, streamingNote, onSelect, onContinue, locked = false }) => (
  <>
    {locked && <p className={css.yearhint}>SIGNED CONTRACT · Distribution is locked. Campaign and festival choices remain editable.</p>}
    <div className={css.futures}>
      <button
        type="button"
        className={join(css.future, selected === 'THEATRICAL' && css.on)}
        style={{ '--dh': '30' } as React.CSSProperties}
        onClick={() => onSelect('THEATRICAL')}
        disabled={theatricalDisabled || locked}
        aria-pressed={selected === 'THEATRICAL'}
        aria-label="Theatrical distribution"
      >
        <div className={css.marquee}>
          <div className={css.bulbs}>{Array.from({ length: 16 }).map((_, index) => <i key={index} style={{ '--i': String(index) } as React.CSSProperties} />)}</div>
          <div className={css.letterboard}>
            <b>{film.title.toUpperCase()}</b>
            <em>SCREEN 1 · 14:20 · 17:45 · 20:30</em>
          </div>
          <div className={css.bulbs}>{Array.from({ length: 16 }).map((_, index) => <i key={index} style={{ '--i': String(15 - index) } as React.CSSProperties} />)}</div>
          <div className={css.frontage}>
            <div className={css.spill} />
            <div className={css.marqueecase}><FilmSheet film={film} size="sm" /><div className={css.marqueeglass} /></div>
            <div className={css.pavement}>{[0, 1, 2, 3, 4, 5, 6].map(index => <i key={index} className={css.person} style={{ '--i': String(index) } as React.CSSProperties} />)}</div>
          </div>
        </div>
        <div className={css.futuretext}>
          <b>Theatrical</b>
          <p>{theatricalNote || 'Book a real cinema footprint, build an opening weekend, and keep the upside.'}</p>
          <em>YOU KEEP THE UPSIDE — AND THE RISK</em>
        </div>
      </button>

      <button
        type="button"
        className={join(css.future, selected === 'STREAMING' && css.on)}
        style={{ '--dh': '210' } as React.CSSProperties}
        onClick={() => onSelect('STREAMING')}
        disabled={streamingDisabled || locked}
        aria-pressed={selected === 'STREAMING'}
        aria-label="Streaming distribution"
      >
        <div className={css.telly}>
          <div className={css.tellyrow}>
            <span className={css.tellylabel}>TRENDING NOW</span>
            <div className={css.tiles}><i /><i /><span className={css.mine}><FilmSheet film={film} size="sm" /></span><i /><i /><i /></div>
          </div>
          <div className={css.tellyrow}>
            <span className={css.tellylabel}>BECAUSE YOU WATCHED</span>
            <div className={css.tiles}><i /><i /><i /><i /><i /><i /></div>
          </div>
        </div>
        <div className={css.futuretext}>
          <b>Streaming</b>
          <p>{streamingNote || 'Take the film into a live buyer room and negotiate the contract terms.'}</p>
          <em>PAID ON SIGNATURE — AND ONE ROW AMONG MANY</em>
        </div>
      </button>
    </div>
    <div className={css.foot}>
      <button type="button" className={join(css.next, !selected && css.dead)} disabled={!selected} onClick={onContinue}>CONTINUE</button>
    </div>
  </>
);
