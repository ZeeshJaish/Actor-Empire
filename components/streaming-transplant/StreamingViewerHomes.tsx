/**
 * The viewer app's home, one for each of the 13 front pages (#114; plan §18.5: "Each of the 13 front pages becomes its own
 * home in the viewer app, built from the wizard's own previews"; Zeesh, 2026-11-01: "हमारा स्टोर फ्रंट जिस टाइप का डिज़ाइन
 * होगा … वैसे ही हमारा रियल ऐप भी दिखेगा").
 *
 * The app drew them as four modes before (HERO, GRID, ROWS, RESUME), so Marquee, Split Hero and Spotlight looked like
 * Cinema, and Wall, Mosaic and Freeform Canvas like one grid. Now each front page has the lead the wizard previews —
 * Cinema's hero, Spotlight's one choice, Quiet Shelf's three, Marquee's banner and bill, Split Hero's two halves,
 * Editorial Index's numbered list, Chapters, Shelves' lanes, Timeline's dates, Wall's field, Mosaic's mixed sizes,
 * Vertical Feed's full-width cards and Freeform Canvas's spatial field — with the app's own titles, and the rows after
 * it: all of them where the lead is a headline, only the viewer's own (Continue Watching, Because you watched, AI
 * channels, Leaving soon) where the lead already lays out the catalogue.
 */
import React from 'react';
import css from './presentation/screens/ViewerApp/ViewerHomes.module.css';
import { cx } from './presentation/cx';
import { Mark, brandColor, typeFace, type Brand } from './StreamingBrandVisuals';
import { ViewerArt } from './ViewerArt';
import { normalizeStreamingStorefrontLayoutId } from '../../services/streamingStorefront';
import type { AppTitle, ViewerRow } from './StreamingViewerExperience';

export type ViewerHomeLead =
  | 'HERO' | 'SPOTLIGHT' | 'QUIET' | 'MARQUEE' | 'SPLIT' | 'INDEX' | 'CHAPTERS'
  | 'LANES' | 'TIMELINE' | 'WALL' | 'MOSAIC' | 'FEED' | 'CANVAS'
  /* #122: twelve more */
  | 'COVER' | 'CHART' | 'FLOW' | 'DECK' | 'GALLERY' | 'BENTO' | 'STRIP' | 'PAPER' | 'ORBIT' | 'LIBRARY' | 'TICKETS' | 'SCRAPBOOK';

export interface ViewerHome {
  lead: ViewerHomeLead;
  /** ALL the rows after a headline lead; only the viewer's own after a lead that lays out the catalogue */
  rows: 'ALL' | 'PERSONAL';
}

export const STREAMING_VIEWER_HOMES: Readonly<Record<string, ViewerHome>> = {
  cinema: { lead: 'HERO', rows: 'ALL' },
  spotlight: { lead: 'SPOTLIGHT', rows: 'ALL' },
  'quiet-shelf': { lead: 'QUIET', rows: 'PERSONAL' },
  marquee: { lead: 'MARQUEE', rows: 'ALL' },
  'split-hero': { lead: 'SPLIT', rows: 'ALL' },
  'editorial-index': { lead: 'INDEX', rows: 'PERSONAL' },
  chapters: { lead: 'CHAPTERS', rows: 'PERSONAL' },
  shelves: { lead: 'LANES', rows: 'ALL' },
  timeline: { lead: 'TIMELINE', rows: 'PERSONAL' },
  wall: { lead: 'WALL', rows: 'PERSONAL' },
  mosaic: { lead: 'MOSAIC', rows: 'PERSONAL' },
  'vertical-feed': { lead: 'FEED', rows: 'PERSONAL' },
  'freeform-canvas': { lead: 'CANVAS', rows: 'PERSONAL' },
  /* #122: headline leads keep every row; leads that lay out the catalogue keep the viewer's own */
  'cover-story': { lead: 'COVER', rows: 'ALL' },
  'the-chart': { lead: 'CHART', rows: 'PERSONAL' },
  coverflow: { lead: 'FLOW', rows: 'ALL' },
  'the-deck': { lead: 'DECK', rows: 'PERSONAL' },
  gallery: { lead: 'GALLERY', rows: 'PERSONAL' },
  bento: { lead: 'BENTO', rows: 'PERSONAL' },
  'film-strip': { lead: 'STRIP', rows: 'PERSONAL' },
  broadsheet: { lead: 'PAPER', rows: 'PERSONAL' },
  orbit: { lead: 'ORBIT', rows: 'PERSONAL' },
  library: { lead: 'LIBRARY', rows: 'PERSONAL' },
  'box-office': { lead: 'TICKETS', rows: 'ALL' },
  scrapbook: { lead: 'SCRAPBOOK', rows: 'PERSONAL' },
};

/** the viewer's own rows: what they were watching, what follows from it, their channels, what is leaving */
const PERSONAL_ROWS = new Set(['r', 'b', 'c', 'l']);

export const streamingViewerHome = (layoutId?: string | null): ViewerHome =>
  STREAMING_VIEWER_HOMES[normalizeStreamingStorefrontLayoutId(layoutId) || 'cinema'] ?? STREAMING_VIEWER_HOMES.cinema;

/** the rows a home shows after its lead */
export const streamingViewerHomeRows = (home: ViewerHome, rows: ViewerRow[]): ViewerRow[] =>
  home.rows === 'ALL' ? rows : rows.filter(row => PERSONAL_ROWS.has(row.id));

/** the titles a lead lays out: the chart first, then the rest */
export const streamingViewerLeadTitles = (titles: AppTitle[]): AppTitle[] => [
  ...titles.filter(t => t.rank).sort((a, b) => a.rank! - b.rank!),
  ...titles.filter(t => !t.rank),
];

type Face = { stack: string };
const hue = (t: AppTitle) => ({ ['--epx-va-h' as string]: `${t.hue}` }) as React.CSSProperties;
const pad = (n: number) => String(n).padStart(2, '0');
/* "Thriller · Series", or the format alone when the genre is not known */
const meta = (t: AppTitle) => [t.genre, t.format].filter(Boolean).join(' · ');
const SCRAP_NOTES = ['Watch this one!', 'Sunday night pick', 'With snacks', 'Trust me on this', 'Save for later', 'So, so good'];
const SCRAP_TILT = [-4, 3, -2, 5, -5, 2];

/* a poster is the title's picture (ViewerArt: its gradient, its ghost, the caption; #121's key art went back in #123) */
const Poster: React.FC<{ t: AppTitle; brand: Brand; tf: Face; onOpen: (t: AppTitle) => void; className?: string; caption?: boolean }> = ({
  t, brand, onOpen, className, caption = true,
}) => (
  <button type="button" className={cx(css.poster, className)} style={hue(t)} onClick={() => onOpen(t)} aria-label={t.title}>
    <ViewerArt t={t} brand={brand} title={caption} />
  </button>
);

const Play: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <span role="button" tabIndex={0} className={css.play} onClick={event => { event.stopPropagation(); onClick(); }}
    onKeyDown={event => { if (event.key === 'Enter') { event.stopPropagation(); onClick(); } }}>
    <i className={css.tri} />{label}
  </span>
);

/** The lead of a front page. In the app Cinema's hero and Shelves' lanes are the app's own (`bighero`, the rows), so
    HERO and LANES draw nothing here; `full` (#120: the brand studio's previews) draws them too.
    #121 (Zeesh: "अगर इसका रीडिज़ाइन ऐप में चाहिए तो उसको अच्छे से डिज़ाइन कर दो सारे का"): every lead redrawn on the
    titles' key art, each with its own idea — Spotlight's framed choice, Quiet Shelf's numbered three, Marquee's bulbs,
    Split Hero's two sides of one night, the Index's masthead, Chapters' numerals, Timeline's dated nodes, the Wall's
    field, Mosaic's bento, the Feed's tall cards, the Canvas's lit path. */
export const ViewerHomeLeadView: React.FC<{
  lead: ViewerHomeLead;
  titles: AppTitle[];
  brand: Brand;
  tf: Face;
  onOpen: (t: AppTitle) => void;
  onPlay: (t: AppTitle) => void;
  full?: boolean;
}> = ({ lead, titles, brand, tf, onOpen, onPlay, full = false }) => {
  const list = streamingViewerLeadTitles(titles);
  const [first, second] = list;
  if (!first || ((lead === 'HERO' || lead === 'LANES') && !full)) return null;
  const poster = (t: AppTitle, className?: string, caption?: boolean) => (
    <Poster key={t.id} t={t} brand={brand} tf={tf} onOpen={onOpen} className={className} caption={caption} />
  );
  const font = { fontFamily: tf.stack };
  const name = brand.name || 'EMPIRE+';

  switch (lead) {
    case 'HERO':
      return (
        <section className={cx(css.home, css.hero)} data-home-lead={lead}>
          <button type="button" className={css.heroart} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
            <ViewerArt t={first} brand={brand} title={false} badge={false} />
          </button>
          <div className={css.herocopy}>
            {first.kind === 'ORIGINAL' && <small className={css.origtag}><i><Mark brand={brand} /></i>{name} original</small>}
            <b style={font}>{first.title}</b>
            <em>{meta(first)}</em>
            <span className={css.heroacts}><Play label="Play" onClick={() => onPlay(first)} /><i>+ My List</i></span>
          </div>
        </section>
      );
    case 'LANES':
      return (
        <section className={cx(css.home, css.lanes)} data-home-lead={lead}>
          {['Featured now', 'New releases'].map((label, row) => (
            <div key={label}>
              <p>{label}</p>
              <div>{[0, 1, 2, 3].map(n => list[(row * 4 + n) % list.length]).map((t, n) => <Poster key={`${label}-${n}`} t={t} brand={brand} tf={tf} onOpen={onOpen} />)}</div>
            </div>
          ))}
        </section>
      );
    case 'SPOTLIGHT':
      return (
        <section className={cx(css.home, css.spot)} data-home-lead={lead}>
          <button type="button" className={css.spotart} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
            <ViewerArt t={first} brand={brand} title={false} wide />
            <small className={css.spoteyebrow}>Tonight's one choice</small>
          </button>
          <div className={css.spotcopy}>
            <b style={font}>{first.title}</b>
            <em>{first.logline}</em>
            <span className={css.spotmeta}>{meta(first)}</span>
            <Play label="Start watching" onClick={() => onPlay(first)} />
          </div>
          <p className={css.spotnote}><i><Mark brand={brand} /></i>Hand-picked by {name}</p>
        </section>
      );
    case 'QUIET':
      return (
        <section className={cx(css.home, css.quiet)} data-home-lead={lead}>
          <header><small>Three for tonight</small><b style={font}>A quieter way in.</b><em>Chosen with intent, not volume.</em></header>
          <div className={css.quietrow}>
            {list.slice(0, 3).map((t, i) => (
              <span key={t.id} className={cx(css.quietitem, i === 0 && css.quietlead)}>
                {poster(t)}
                <i>{pad(i + 1)}</i>
              </span>
            ))}
          </div>
          <footer><span>01</span><i /><span>{pad(Math.min(3, list.length))}</span></footer>
        </section>
      );
    case 'MARQUEE':
      return (
        <section className={cx(css.home, css.marquee)} data-home-lead={lead}>
          <div className={css.mqframe}>
            <button type="button" className={css.mqmain} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
              <ViewerArt t={first} brand={brand} title={false} wide />
              <span className={css.mqcopy}><small>Now presenting</small><b style={font}>{first.title}</b><em>Watch the official trailer →</em></span>
            </button>
          </div>
          {list.length > 1 && (
            <div className={css.mqbill}><p>Also on the marquee</p><div>{list.slice(1, 4).map(t => poster(t))}</div></div>
          )}
        </section>
      );
    case 'SPLIT':
      return (
        <section className={cx(css.home, css.split)} data-home-lead={lead}>
          <p className={css.splithead}><small>Tonight</small><b style={font}>Two ways in</b></p>
          <div className={css.splitpair}>
            {[first, second].filter(Boolean).map((t, i) => (
              <button type="button" key={t!.id} className={css.splithalf} style={hue(t!)} onClick={() => onOpen(t!)} aria-label={t!.title}>
                <ViewerArt t={t!} brand={brand} title={false} />
                <span className={css.splitcopy}><b style={font}>{t!.title}</b><em>{i === 0 ? 'Play feature' : 'Watch trailer'}</em></span>
              </button>
            ))}
            {second && <i className={css.splitmark} aria-hidden="true"><Mark brand={brand} /></i>}
          </div>
        </section>
      );
    case 'INDEX':
      return (
        <section className={cx(css.home, css.index)} data-home-lead={lead}>
          <header className={css.masthead}><b style={font}>{name} index</b><small>Volume I</small></header>
          <button type="button" className={css.indexlead} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
            <ViewerArt t={first} brand={brand} title={false} wide />
            <span className={css.indexcopy}><small>The lead story</small><b style={font}>{first.title}</b><em>{meta(first)}</em></span>
          </button>
          <ol className={css.indexlist}>
            {list.map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => onOpen(t)}>
                  <span>{pad(i + 1)}</span><b>{t.title}</b><em>{t.format}</em>
                </button>
              </li>
            ))}
          </ol>
        </section>
      );
    case 'CHAPTERS': {
      const chapters = ['The opening act', 'After dark', 'A different ending'];
      return (
        <section className={cx(css.home, css.chapters)} data-home-lead={lead}>
          {chapters.map((chapter, i) => {
            const pair = list.slice(i * 2, i * 2 + 2);
            return pair.length ? (
              <div className={css.chapter} key={chapter}>
                <span className={css.chapterhead}><i>{pad(i + 1)}</i><span><small>Chapter {pad(i + 1)}</small><b>{chapter}</b></span></span>
                <div>{pair.map(t => poster(t, css.wide))}</div>
              </div>
            ) : null;
          })}
        </section>
      );
    }
    case 'TIMELINE': {
      const fresh = list.filter(t => t.newThisWeek);
      const rest = list.filter(t => !t.newThisWeek);
      const half = Math.ceil(rest.length / 2);
      const dates = [
        { label: 'This week', items: fresh },
        { label: 'Last week', items: rest.slice(0, half) },
        { label: 'Earlier', items: rest.slice(half) },
      ].filter(date => date.items.length);
      return (
        <ol className={cx(css.home, css.timeline)} data-home-lead={lead}>
          {dates.map(date => (
            <li key={date.label}>
              <time>{date.label}</time>
              <div>
                {date.items.map(t => (
                  <button type="button" key={t.id} className={css.tlitem} onClick={() => onOpen(t)}>
                    <span className={css.tlthumb} style={hue(t)}><ViewerArt t={t} brand={brand} title={false} wide /></span>
                    <span className={css.tlcopy}><b>{t.title}</b><em>{meta(t)}</em>{t.newThisWeek && <i>New</i>}</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      );
    }
    case 'WALL':
      return (
        <section className={cx(css.home, css.wall)} data-home-lead={lead}>
          {list.map((t, i) => poster(t, i % 5 === 0 ? css.wide : undefined))}
        </section>
      );
    case 'MOSAIC':
      return (
        <section className={cx(css.home, css.mosaic)} data-home-lead={lead}>
          {list.map((t, i) => poster(t, i % 7 === 0 ? css.big : i % 7 === 3 ? css.wide : i % 7 === 5 ? css.tall : undefined))}
        </section>
      );
    case 'FEED':
      return (
        <section className={cx(css.home, css.feed)} data-home-lead={lead}>
          {list.slice(0, 8).map((t, i, shown) => (
            <article key={t.id} className={css.feeditem} style={hue(t)}>
              <button type="button" className={css.feedart} onClick={() => onOpen(t)} aria-label={t.title}>
                <ViewerArt t={t} brand={brand} title={false} />
              </button>
              <span className={css.feedside} aria-hidden="true"><i>♥</i><i>＋</i><i>↗</i></span>
              <div className={css.feedcopy}>
                <small>{pad(i + 1)} / {pad(shown.length)}</small>
                <b style={font}>{t.title}</b>
                <em>{meta(t)}</em>
                <Play label="Play" onClick={() => onPlay(t)} />
              </div>
            </article>
          ))}
        </section>
      );
    case 'CANVAS': {
      /* a spatial field, wider than the screen, the tiles at set places along one path */
      const SPOTS = [[18, 54, 120], [150, 18, 96], [262, 92, 108], [390, 30, 92], [496, 104, 112], [626, 40, 100], [742, 118, 92], [850, 24, 104], [968, 86, 96]];
      return (
        <section className={cx(css.home, css.canvas)} data-home-lead={lead}>
          <div className={css.canvasfield}>
            <svg viewBox="0 0 1080 300" preserveAspectRatio="none" aria-hidden="true">
              <path d="M70 140 C 150 40, 200 60, 200 90 S 300 220, 320 170 S 420 40, 440 90 S 540 250, 560 190 S 660 60, 680 110 S 780 260, 790 200 S 880 40, 905 100 S 1000 230, 1020 180" />
            </svg>
            {list.slice(0, SPOTS.length).map((t, i) => {
              const [left, top, width] = SPOTS[i];
              return (
                <span key={t.id} className={css.nodeat} style={{ left, top, width }}>
                  <Poster t={t} brand={brand} tf={tf} onOpen={onOpen} className={css.node} />
                </span>
              );
            })}
          </div>
          <p className={css.canvasnote}><i />Drag across the canvas</p>
        </section>
      );
    }
    /* ── #122: twelve more ── */
    case 'COVER': {
      const lines = list.slice(1, 5);
      return (
        <section className={cx(css.home, css.cover)} data-home-lead={lead}>
          <button type="button" className={css.coverart} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
            <ViewerArt t={first} brand={brand} title={false} badge={false} />
            <span className={css.covermast} style={font}>{name}</span>
            <small className={css.coverissue}>Issue 01 · This week</small>
            <span className={css.coverlines}>{lines.map(t => <span key={t.id}><b>{t.title}</b><em>{t.genre || t.format}</em></span>)}</span>
            <span className={css.coverhead}><small>Cover story</small><b style={font}>{first.title}</b><em>{first.logline}</em></span>
          </button>
          <Play label="Watch the cover story" onClick={() => onPlay(first)} />
        </section>
      );
    }
    case 'CHART':
      return (
        <section className={cx(css.home, css.chart)} data-home-lead={lead}>
          <header><small>The chart</small><b style={font}>Top {Math.min(10, list.length)} this week</b></header>
          <ol>
            {list.slice(0, 10).map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => onOpen(t)} aria-label={`${i + 1}. ${t.title}`}>
                  <i className={css.chartnum}>{i + 1}</i>
                  <span className={css.chartposter} style={hue(t)}><ViewerArt t={t} brand={brand} title={false} /></span>
                  <span className={css.chartcopy}><b>{t.title}</b><em>{meta(t)}</em></span>
                  {t.newThisWeek ? <span className={css.chartnew}>New</span> : <span className={css.chartstay}>—</span>}
                </button>
              </li>
            ))}
          </ol>
        </section>
      );
    case 'FLOW': {
      const side = list.slice(1, 5);
      const card = (t: AppTitle | undefined, place: string) => t && (
        <button type="button" key={t.id} className={cx(css.flowcard, css[place])} style={hue(t)} onClick={() => onOpen(t)} aria-label={t.title}>
          <ViewerArt t={t} brand={brand} />
        </button>
      );
      return (
        <section className={cx(css.home, css.flow)} data-home-lead={lead}>
          <div className={css.flowstage}>
            {card(side[3], 'flowL2')}{card(side[1], 'flowL1')}{card(side[2], 'flowR2')}{card(side[0], 'flowR1')}
            {card(first, 'flowmain')}
          </div>
          <div className={css.flowcopy}><b style={font}>{first.title}</b><em>{meta(first)}</em><Play label="Play" onClick={() => onPlay(first)} /></div>
          <div className={css.flowdots}>{list.slice(0, 5).map((t, i) => <i key={t.id} className={i === 0 ? css.flowdotOn : undefined} />)}</div>
        </section>
      );
    }
    case 'DECK':
      return (
        <section className={cx(css.home, css.deck)} data-home-lead={lead}>
          <div className={css.deckstack}>
            {list.slice(1, 4).reverse().map((t, i, behind) => (
              <span key={t.id} className={css.deckback} style={{ ...hue(t), ['--d' as string]: behind.length - i } as React.CSSProperties}>
                <ViewerArt t={t} brand={brand} title={false} badge={false} />
              </span>
            ))}
            <button type="button" className={css.decktop} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
              <ViewerArt t={first} brand={brand} title={false} />
              <span className={css.deckcopy}><b style={font}>{first.title}</b><em>{meta(first)}</em></span>
            </button>
          </div>
          <div className={css.deckacts}><i>✕ Skip</i><Play label="Watch" onClick={() => onPlay(first)} /><i>♥ Keep</i></div>
          <p className={css.decknote}>{list.length} in the deck</p>
        </section>
      );
    case 'GALLERY':
      return (
        <section className={cx(css.home, css.gallery)} data-home-lead={lead}>
          <header><small>Now showing</small><b style={font}>The {name} collection</b></header>
          <div className={css.galwall}>
            {list.slice(0, 6).map((t, i) => (
              <button type="button" key={t.id} className={cx(css.galframe, i % 3 === 0 && css.galbig)} onClick={() => onOpen(t)} aria-label={t.title}>
                <span className={css.galmat}><span className={css.galart} style={hue(t)}><ViewerArt t={t} brand={brand} title={false} /></span></span>
                <span className={css.galplaque}><b>{t.title}</b><em>{meta(t)}</em></span>
              </button>
            ))}
          </div>
        </section>
      );
    case 'BENTO': {
      const fresh = list.filter(t => t.newThisWeek).length;
      const going = list.find(t => t.progress !== undefined && t.id !== first.id);
      const rest = list.filter(t => t.id !== first.id && t.id !== going?.id);
      return (
        <section className={cx(css.home, css.bento)} data-home-lead={lead}>
          <button type="button" className={cx(css.bt, css.btBig)} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
            <ViewerArt t={first} brand={brand} title={false} />
            <span className={css.btcopy}><small>Featured</small><b style={font}>{first.title}</b></span>
          </button>
          {rest[0] && <button type="button" className={cx(css.bt, css.btTall)} style={hue(rest[0])} onClick={() => onOpen(rest[0])} aria-label={rest[0].title}><ViewerArt t={rest[0]} brand={brand} /></button>}
          <span className={cx(css.bt, css.btStat)}><b>{fresh || list.length}</b><em>{fresh ? 'new this week' : 'titles'}</em></span>
          {going && (
            <button type="button" className={cx(css.bt, css.btWide)} style={hue(going)} onClick={() => onOpen(going)} aria-label={going.title}>
              <ViewerArt t={going} brand={brand} title={false} wide />
              <span className={css.btcopy}><small>Continue</small><b>{going.title}</b><i className={css.btbar}><i style={{ width: `${Math.round((going.progress ?? 0) * 100)}%` }} /></i></span>
            </button>
          )}
          {rest.slice(1, 5).map(t => <button type="button" key={t.id} className={css.bt} style={hue(t)} onClick={() => onOpen(t)} aria-label={t.title}><ViewerArt t={t} brand={brand} /></button>)}
        </section>
      );
    }
    case 'STRIP':
      return (
        <section className={cx(css.home, css.strip)} data-home-lead={lead}>
          <header><small>Now running</small><b style={font}>Reel one</b></header>
          <div className={css.stripreel}>
            <div className={css.stripfilm}>
              {list.slice(0, 8).map((t, i) => (
                <button type="button" key={t.id} className={css.stripframe} onClick={() => onOpen(t)} aria-label={t.title}>
                  <span className={css.stripart} style={hue(t)}><ViewerArt t={t} brand={brand} wide /></span>
                  <i>{pad(i + 1)}</i>
                </button>
              ))}
            </div>
          </div>
          <p className={css.stripnote}><i />Frame 01 of {pad(Math.min(8, list.length))} · swipe the reel</p>
        </section>
      );
    case 'PAPER':
      return (
        <section className={cx(css.home, css.paper)} data-home-lead={lead}>
          <div className={css.papersheet}>
            <header className={css.papermast}><b>The {name} Times</b><small>Weekly edition · Your streaming paper</small></header>
            <button type="button" className={css.paperlead} onClick={() => onOpen(first)} aria-label={first.title}>
              <span className={css.paperart} style={hue(first)}><ViewerArt t={first} brand={brand} title={false} badge={false} wide /></span>
              <b>{first.title}</b>
              <em>{first.logline}</em>
            </button>
            <div className={css.papercols}>
              {list.slice(1, 7).map(t => (
                <button type="button" key={t.id} className={css.paperbrief} onClick={() => onOpen(t)} aria-label={t.title}>
                  <span className={css.paperthumb} style={hue(t)}><ViewerArt t={t} brand={brand} title={false} badge={false} /></span>
                  <b>{t.title}</b><em>{meta(t)}</em>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    case 'ORBIT': {
      const satellites = list.slice(1, 7);
      return (
        <section className={cx(css.home, css.orbit)} data-home-lead={lead}>
          <div className={css.orbitstage}>
            <i className={css.orbitring} /><i className={cx(css.orbitring, css.orbitringOut)} />
            {satellites.map((t, i) => (
              <button type="button" key={t.id} className={css.orbitsat} onClick={() => onOpen(t)} aria-label={t.title}
                style={{ ...hue(t), ['--a' as string]: `${i * (360 / satellites.length) - 90}deg`, ['--r' as string]: i % 2 ? '124px' : '86px' } as React.CSSProperties}>
                <span><ViewerArt t={t} brand={brand} title={false} badge={false} /></span>
              </button>
            ))}
            <button type="button" className={css.orbitsun} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}>
              <ViewerArt t={first} brand={brand} title={false} badge={false} />
            </button>
          </div>
          <div className={css.orbitcopy}><small>At the centre</small><b style={font}>{first.title}</b><em>{satellites.length} titles in its orbit</em><Play label="Play" onClick={() => onPlay(first)} /></div>
        </section>
      );
    }
    case 'LIBRARY': {
      const shelves = [list.slice(0, 7), list.slice(7, 14)].filter(shelf => shelf.length);
      return (
        <section className={cx(css.home, css.library)} data-home-lead={lead}>
          <div className={css.libpick}>
            <button type="button" className={css.libcover} style={hue(first)} onClick={() => onOpen(first)} aria-label={first.title}><ViewerArt t={first} brand={brand} /></button>
            <span className={css.libcopy}><small>Pulled from the shelf</small><b style={font}>{first.title}</b><em>{meta(first)}</em><Play label="Play" onClick={() => onPlay(first)} /></span>
          </div>
          {shelves.map((shelf, row) => (
            <div key={row} className={css.libshelf}>
              {shelf.map((t, i) => (
                <button type="button" key={t.id} className={cx(css.spine, t.id === first.id && css.spineOut)} onClick={() => onOpen(t)} aria-label={t.title}
                  style={{ ...hue(t), ['--w' as string]: `${26 + ((i * 7 + row * 3) % 4) * 6}px`, ['--sh' as string]: `${112 + ((i * 11 + row) % 3) * 14}px` } as React.CSSProperties}>
                  <b>{t.title}</b>
                </button>
              ))}
            </div>
          ))}
        </section>
      );
    }
    case 'TICKETS':
      return (
        <section className={cx(css.home, css.tickets)} data-home-lead={lead}>
          <header><small>Box office</small><b style={font}>Tonight's tickets</b></header>
          {list.slice(0, 4).map((t, i) => (
            <button type="button" key={t.id} className={css.ticket} style={hue(t)} onClick={() => onOpen(t)} aria-label={t.title}>
              <span className={css.tkart}><ViewerArt t={t} brand={brand} title={false} /></span>
              <span className={css.tkbody}>
                <small>Admit one · Screen {i + 1}</small>
                <b style={font}>{t.title}</b>
                <em>{meta(t)}</em>
                <span className={css.tkfoot}><i>Showing now</i><span className={css.tkbar} /></span>
              </span>
            </button>
          ))}
        </section>
      );
    case 'SCRAPBOOK':
      return (
        <section className={cx(css.home, css.scrap)} data-home-lead={lead}>
          <header><small>Our scrapbook</small><b style={font}>Pinned for you</b></header>
          <div className={css.scrapboard}>
            {list.slice(0, 6).map((t, i) => (
              <button type="button" key={t.id} className={css.polaroid} onClick={() => onOpen(t)} aria-label={t.title}
                style={{ ...hue(t), ['--tilt' as string]: `${SCRAP_TILT[i % SCRAP_TILT.length]}deg` } as React.CSSProperties}>
                <i className={css.tape} />
                <span className={css.polart}><ViewerArt t={t} brand={brand} title={false} /></span>
                <b>{t.title}</b>
                <em>{SCRAP_NOTES[i % SCRAP_NOTES.length]}</em>
              </button>
            ))}
          </div>
        </section>
      );
    default:
      return null;
  }
};

/* ============================================================
   THE PREVIEW (#120) — a front page as the app draws it, for the brand studio's tiles and preview: the app's top bar,
   the front page's lead and the row after it, at the app's own width (375); the caller scales it
   ============================================================ */
/** titles for a preview when the service's own are not at hand */
export const STREAMING_VIEWER_SAMPLE_TITLES: AppTitle[] = [
  { id: 's1', title: 'Midnight Harbor', kind: 'ORIGINAL', format: 'Series', genre: 'Thriller', hue: 214, logline: 'A harbour town keeps one secret too many.', rank: 1 },
  { id: 's2', title: 'Glass Coast', kind: 'LICENSED', format: 'Film', genre: 'Drama', hue: 28, logline: 'Two sisters, one summer house.', rank: 2, progress: .4 },
  { id: 's3', title: 'Paper Window', kind: 'ORIGINAL', format: 'Series', genre: 'Comedy', hue: 312, logline: 'An office that never closes.', rank: 3, newThisWeek: true },
  { id: 's4', title: 'Lantern Lane', kind: 'ORIGINAL', format: 'Series', genre: 'Animation', hue: 46, logline: 'Three friends light up the oldest street in town.', rank: 4 },
  { id: 's5', title: 'Comet Run', kind: 'LICENSED', format: 'Film', genre: 'Adventure', hue: 168, logline: 'A race to the edge of the sky.', progress: .7, newThisWeek: true },
  { id: 's6', title: 'Cold Signal', kind: 'LICENSED', format: 'Film', genre: 'Drama', hue: 256, logline: 'A radio operator hears her own voice.' },
  { id: 's7', title: 'Velvet Hour', kind: 'ORIGINAL', format: 'Film', genre: 'Romance', hue: 340, logline: 'One night, one train, two strangers.' },
  { id: 's8', title: 'Iron Bloom', kind: 'LICENSED', format: 'Series', genre: 'Sci-fi', hue: 138, logline: 'A garden grows on a dead planet.' },
];

export const StreamingViewerHomePreview: React.FC<{ layoutId: string; brand: Brand; titles?: AppTitle[] }> = ({
  layoutId, brand, titles = STREAMING_VIEWER_SAMPLE_TITLES,
}) => {
  const home = streamingViewerHome(layoutId);
  const tf = typeFace(brand);
  const none = () => undefined;
  const list = streamingViewerLeadTitles(titles);
  const personal = home.rows === 'PERSONAL';
  const row = personal ? list.filter(t => t.progress !== undefined).concat(list).slice(0, 4) : list.slice(0, 4);
  return (
    <div className={css.preview} data-home-lead={home.lead} style={{ ['--epx-va-c' as string]: brandColor(brand) } as React.CSSProperties} aria-hidden="true">
      <div className={css.pvbar}>
        {brand.lockupId !== 'WORDMARK' && <i><Mark brand={brand} /></i>}
        <b style={{ fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing }}>{brand.name || 'EMPIRE+'}</b>
        <span>Series</span><span>Films</span><span>My List</span><em />
      </div>
      <ViewerHomeLeadView full lead={home.lead} titles={titles} brand={brand} tf={tf} onOpen={none} onPlay={none} />
      <section className={cx(css.home, css.pvrow)}>
        <p>{personal ? 'Continue Watching' : `Top 10 on ${brand.name || 'EMPIRE+'}`}</p>
        <div>{row.map((t, n) => <Poster key={`${t.id}-${n}`} t={t} brand={brand} tf={tf} onOpen={none} />)}</div>
      </section>
    </div>
  );
};
