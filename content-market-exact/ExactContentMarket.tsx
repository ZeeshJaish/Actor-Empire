/**
 * EMPIRE+ v2 — THE CONTENT MARKET
 *
 * ── WHY IT LOOKS LIKE THIS ────────────────────────────────────────────────
 * The brief runs to fifteen sections. Rendering fifteen sections produces a
 * settings panel, not a place, so this builds the journey the brief itself
 * calls core — browse, read the rights, then accept / negotiate / bid — and
 * lets everything else live inside those four moments.
 *
 * The drawing rule decides the rest: never draw the thing, draw what the
 * thing produces. A rights market produces DOCUMENTS, and they are real ones.
 *
 *   THE FLOOR    a market hall at night. Stands, a trade daily, a rail of
 *                lots. This is AFM and the Marché, not a shop.
 *   THE AVAILS   the availability sheet a sales agent hands across the table:
 *                a grid of territories, each one free, held or blocked. This
 *                is the single most honest object in the whole system — it
 *                says what you may actually buy before it says the price.
 *   THE REDLINE  their terms on the left, struck where you changed them;
 *                yours on the right in red. Nobody negotiates in a chat
 *                window; they mark up a term sheet.
 *   THE ROOM     an auction is a BOARD and PADDLE NUMBERS. You never see the
 *                other buyers' faces, only what they are willing to sign.
 *
 * The realism that matters most: a bid is a CONTRACT, not a number, and each
 * seller reads a contract differently. A cash-poor producer wants the
 * guarantee. A prestige label wants the marketing spend. So the biggest
 * cheque does not automatically lead — which is exactly how these rooms work.
 */
import css from './ContentMarket.module.css';
import { cx } from './cx';
import { Poster } from './Poster';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Lot, Offer, Terms, Basis, Availability, Territory,
  verdictOf, offerFrom, reachOf,
  repFor, sayOf, yearsOf, termLabel,
} from './model';

export type { Lot, Offer } from './model';

const CatalogueContext = createContext<Lot[]>([]);
const useCatalogue = () => useContext(CatalogueContext);
const brandColor = (brand: Brand) => `hsl(${brand.hue} ${brand.sat}% 58%)`;

export interface MarketState {
  treasury: number;
  committed: number;
  week: number;
  subs: number;
}

export interface MarketSupplySummary {
  totalCanonicalTitles: number;
  liveAuctions: number;
  foundingBoost: boolean;
  nextRotationAbsoluteWeek: number;
}

/* ── money ── */
const money = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};
const exact = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const count = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);

/* ============================================================
   THE GATE — where does content actually come from?
   Three doors, because a streamer's content org really is split three ways:
   you make it, you commission it, or you buy someone else's.
   ============================================================ */
const Gate: React.FC<{
  st: MarketState; supplySummary?: MarketSupplySummary; onRoute: (r: 'STUDIO' | 'MARKET') => void; onCommission?: () => void; onBack: () => void;
}> = ({ st, supplySummary, onRoute, onCommission, onBack }) => {
  const CATALOGUE = useCatalogue();
  const mine = CATALOGUE.filter(l => l.mode === 'STUDIO');
  const buyable = CATALOGUE.filter(l => l.mode !== 'STUDIO');
  const rooms = CATALOGUE.filter(l => l.mode === 'AUCTION');

  return (
    <div className={css.mk} data-content-market-design="zip-exact" data-content-market-scene="gate">
      <div className={css.mkglow} />
      <header className={css.mktop}>
        <button className={css.mkback} onClick={onBack}>←</button>
        <div className={css.mkmast}><b>ADD CONTENT</b><span>WHERE IS IT COMING FROM?</span></div>
      </header>

      <Power st={st} />

      <button className={cx(css.mkdoor, css['mkd-studio'])} onClick={() => onRoute('STUDIO')}>
        <div className={css.mkdoorart}>
          {mine.slice(0, 3).map((l, i) => (
            <span key={l.id} className={css.mkfan} style={{ ['--epx-mkwrap-i' as string]: String(i) }}>
              <Poster id={l.id} title={l.title} genre={l.genre} hue={l.hue} size="sm" />
            </span>
          ))}
        </div>
        <div className={css.mkdoortext}>
          <b>FROM YOUR STUDIO</b>
          <span>Titles your companies control. Only eligible streaming markets are linked.</span>
          <em>{mine.length} READY · NO INTERNAL FEE</em>
        </div>
      </button>

      <button className={cx(css.mkdoor, css['mkd-orig'])} onClick={onCommission}>
        <div className={css.mkdoorart}>
          <span className={css.mkframe}><i /></span>
        </div>
        <div className={css.mkdoortext}>
          <b>COMMISSION AN ORIGINAL</b>
          <span>Start with a brief, fund production, and secure the rights written into the commission.</span>
          <em>BUILD FROM A BRIEF</em>
        </div>
      </button>

      <button className={cx(css.mkdoor, css['mkd-market'])} onClick={() => onRoute('MARKET')}>
        <div className={cx(css.mkdoorart, css.mkwall)}>
          {buyable.slice(0, 6).map(l => (
            <Poster key={l.id} id={l.id} title={l.title} genre={l.genre} hue={l.hue} size="xs" />
          ))}
        </div>
        <div className={css.mkdoortext}>
          <b>THE MARKET</b>
          <span>License released titles and collections, or compete for announced rights in a room.</span>
          <em>{supplySummary?.totalCanonicalTitles ?? buyable.length} TITLES · {supplySummary?.liveAuctions ?? rooms.length} LIVE</em>
        </div>
      </button>
    </div>
  );
};

/* ── buying power, as a meter. A number alone never showed the squeeze ── */
/* ── BUYING POWER ──────────────────────────────────────────────────────────
   It was a label, a number, a bar, two mono figures and two sentences: five
   text treatments in one box, with the useful part — what the money actually
   buys — demoted to a footnote. It is a credit line, so it is drawn as one:
   a single track split into what is spent and what is left, a legend that
   names both, and a shortfall that only appears when there is one. ── */
const Power: React.FC<{ st: MarketState }> = ({ st }) => {
  const CATALOGUE = useCatalogue();
  const free = Math.max(0, st.treasury - st.committed);
  const freePct = Math.max(2, Math.min(100, (free / st.treasury) * 100));
  const listed = CATALOGUE.filter(l => l.listed);
  const within = listed.filter(l => l.listed!.mg <= free).length;
  const dearest = [...listed].sort((a, b) => b.listed!.mg - a.listed!.mg)[0];
  const short = dearest && dearest.listed!.mg > free ? dearest : null;

  return (
    <div className={css.mkpower}>
      <div className={css.mkpwhead}>
        <span>BUYING POWER</span>
        <em><b>{within}</b> of {listed.length} within reach</em>
      </div>

      <b className={css.mkpwbig}>{exact(free)}</b>

      {/* one track, split. The old bar just repeated the number. */}
      <div className={css.mkpwtrack}>
        <u style={{ width: `${freePct}%` }} />
      </div>

      <div className={css.mkpwlegend}>
        <em className={css.mkpwfree}>{money(free)} to spend</em>
        <em className={css.mkpwheld}>{money(st.committed)} committed</em>
        <em className={css.mkpwsum}>{money(st.treasury)} treasury</em>
      </div>

      {short && (
        <div className={css.mkpwshort}>
          <i />
          <span>Out of reach: <b>{short.title}</b> by {money(short.listed!.mg - free)}</span>
        </div>
      )}
    </div>
  );
};



/* ============================================================
   THE MARKET — a wall of one-sheets, and the rooms that are live now
   ============================================================ */
/** what a lot's availability means, in the order urgency actually runs */
const AVAIL: Record<Availability, { label: string; tone: string; note: string }> = {
  LIVE:    { label: 'IN THE ROOM', tone: 'live', note: 'bidding now' },
  CLOSING: { label: 'CLOSING', tone: 'closing', note: 'the listing is about to lapse' },
  OPEN:    { label: 'OPEN', tone: 'open', note: 'buy whenever you like' },
  OPENS:   { label: 'OPENS SOON', tone: 'soon', note: 'a room is scheduled' },
  PRESALE: { label: 'PRE-SALE', tone: 'soon', note: 'sold before delivery' },
  WATCH:   { label: 'ANNOUNCED', tone: 'watch', note: 'nothing to do yet' },
};

const Chip: React.FC<{ lot: Lot }> = ({ lot }) => {
  const a = AVAIL[lot.avail];
  return (
    <span className={cx(css.mkav, css['mkav-' + a.tone])}>
      {lot.avail === 'LIVE' && <i />}
      {a.label}
      {lot.avail === 'CLOSING' && lot.closesInDays ? ` · ${lot.closesInDays}D` : ''}
      {lot.avail === 'OPENS' && lot.opensWeek ? ` · WK ${lot.opensWeek}` : ''}
    </span>
  );
};

/* one card, used by every rail and by the grid */
const Card: React.FC<{ lot: Lot; onOpen: (l: Lot) => void; wide?: boolean }> = ({ lot, onOpen, wide }) => (
  <button className={cx(css.mkcard, (wide ? css.wide : ''))} aria-label={`${lot.title} · ${lot.seller}`} onClick={() => onOpen(lot)}>
    {/* a collection gets a shelf on the card too, not a sheet with a badge */}
    {lot.rows ? <span className={css.mkcardbox}><Boxset lot={lot} /></span> : (
      <Poster id={lot.id} title={lot.title} genre={lot.genre} hue={lot.hue} year={lot.year} size="md" />
    )}
    <div className={css.mkcardfoot}>
      <b className={lot.mode === 'STUDIO' ? css.mkfree : ''}>
        {lot.listed ? money(lot.listed.mg) : lot.mode === 'STUDIO' ? 'NO FEE' : 'ROOM'}</b>
      <span>{reachOf(lot.terr)}%</span>
    </div>
    <div className={css.mkcardav}><Chip lot={lot} /></div>
    {lot.prior && <span className={css.mkrate}>{lot.prior.rating.toFixed(1)}</span>}
  </button>
);

/* ============================================================
   THE MARKET — rails first, because a flat grid of forty is a spreadsheet
   ============================================================ */
type Lens = 'ALL' | Availability | 'PACKS';

type Sort = 'PICKED' | 'CHEAP' | 'DEAR' | 'REACH' | 'HEAT' | 'RATED' | 'SOON';
const SORTS: [Sort, string][] = [
  ['PICKED', 'Our order'], ['CHEAP', 'Cheapest'], ['DEAR', 'Most expensive'],
  ['REACH', 'Widest rights'], ['HEAT', 'Most talked about'], ['RATED', 'Best rated'],
  ['SOON', 'Closing soonest'],
];

const sortLots = (lots: Lot[], by: Sort): Lot[] => {
  const c = [...lots];
  switch (by) {
    case 'CHEAP': return c.sort((a, b) => (a.listed?.mg ?? Infinity) - (b.listed?.mg ?? Infinity));
    case 'DEAR': return c.sort((a, b) => (b.listed?.mg ?? -1) - (a.listed?.mg ?? -1));
    case 'REACH': return c.sort((a, b) => reachOf(b.terr) - reachOf(a.terr));
    case 'HEAT': return c.sort((a, b) => b.heat - a.heat);
    case 'RATED': return c.sort((a, b) => (b.prior?.rating ?? 0) - (a.prior?.rating ?? 0));
    case 'SOON': return c.sort((a, b) => (a.closesInDays ?? a.opensWeek ?? 99) - (b.closesInDays ?? b.opensWeek ?? 99));
    default: return c;
  }
};

/* ── one compact row. At sixty titles a poster grid is a scroll marathon;
      a dense list is how anyone actually works through a long catalogue. ── */
const Row: React.FC<{ lot: Lot; onOpen: (l: Lot) => void }> = ({ lot, onOpen }) => (
  <button className={css.mkrow2} onClick={() => onOpen(lot)}>
    <span className={css.mkthumb}>
      <Poster id={lot.id} title={lot.title} genre={lot.genre} hue={lot.hue} size="xs" />
    </span>
    <span className={css.mkrowmain}>
      <b>{lot.title}</b>
      <em>{lot.seller} · {lot.year} · {lot.genre}</em>
    </span>
    <span className={css.mkrowend}>
      <b>{lot.listed ? money(lot.listed.mg) : 'ROOM'}</b>
      <em>{reachOf(lot.terr)}%{lot.prior ? ` · ${lot.prior.rating.toFixed(1)}` : ''}</em>
    </span>
  </button>
);

/* ============================================================
   THE MARKET
   Rails are the resting state; the moment you narrow anything it becomes a
   sorted, filtered, progressively-revealed list. Seventy-five lots today, and
   nothing here cares how many there are.
   ============================================================ */
const RAIL_CAP = 8;
const PAGE = 16;

const Market: React.FC<{
  st: MarketState; onOpen: (l: Lot) => void; onBack: () => void; initialQuery?: string; onQueryChange?: (query: string) => void;
}> = ({ st, onOpen, onBack, initialQuery = '', onQueryChange }) => {
  const CATALOGUE = useCatalogue();
  const [view, setView] = useState<string>('ALL');
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>('PICKED');
  const [dense, setDense] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const [fFormat, setFFormat] = useState<string[]>([]);
  const [fGenre, setFGenre] = useState<string[]>([]);
  const [fPath, setFPath] = useState<string[]>([]);

  const pool = useMemo(() => CATALOGUE.filter(l => l.mode !== 'STUDIO'), [CATALOGUE]);
  const genres = useMemo(() => [...new Set(pool.map(l => l.genre))].sort(), [pool]);
  const paths = useMemo(() => [...new Set(pool.map(l => l.path))].sort(), [pool]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    pool.forEach(l => { c[l.avail] = (c[l.avail] ?? 0) + 1; });
    c.PACKS = pool.filter(l => l.format === 'COLLECTION').length;
    c.PROVEN = pool.filter(l => !!l.prior?.boxOffice).length;
    c.CHEAP = pool.filter(l => l.listed && l.listed.mg <= 1_500_000).length;
    return c;
  }, [pool]);

  /* every rail is a named predicate, so "see all" can reuse it exactly */
  const RAILS: { key: string; title: string; note: string; test: (l: Lot) => boolean }[] = [
    { key: 'LIVE', title: 'In the room now', note: 'bidding is open', test: l => l.avail === 'LIVE' },
    { key: 'CLOSING', title: 'Closing this week', note: 'these lapse if nobody moves', test: l => l.avail === 'CLOSING' },
    { key: 'HEAT', title: 'Everyone is talking about these', note: 'highest public interest', test: l => l.heat >= 60 },
    { key: 'PROVEN', title: 'Already proven', note: 'they had a run, and the numbers are public', test: l => !!l.prior?.boxOffice },
    { key: 'PACKS', title: 'Whole libraries', note: 'one signature, many titles', test: l => l.format === 'COLLECTION' },
    { key: 'CHEAP', title: 'Under $1.5M', note: 'volume for a thin week', test: l => !!l.listed && l.listed.mg <= 1_500_000 },
    { key: 'OPENS', title: 'Not yet, but soon', note: 'follow one and you will be told', test: l => l.avail === 'OPENS' || l.avail === 'WATCH' },
  ];

  const testOf = (key: string) => RAILS.find(r => r.key === key)?.test
    ?? ((l: Lot) => l.avail === key);

  const filtersOn = fFormat.length + fGenre.length + fPath.length;
  const search = q.trim().toLowerCase();
  const narrowed = !!search || view !== 'ALL' || filtersOn > 0;

  const results = useMemo(() => {
    if (!narrowed && !dense) return [];
    let out = pool;
    if (view !== 'ALL') out = out.filter(testOf(view));
    if (search) out = out.filter(l => l.title.toLowerCase().includes(search)
      || l.seller.toLowerCase().includes(search) || l.genre.toLowerCase().includes(search)
      || l.logline.toLowerCase().includes(search));
    if (fFormat.length) out = out.filter(l => fFormat.includes(l.format));
    if (fGenre.length) out = out.filter(l => fGenre.includes(l.genre));
    if (fPath.length) out = out.filter(l => fPath.includes(l.path));
    return sortLots(out, sort);
  }, [narrowed, dense, pool, view, search, fFormat, fGenre, fPath, sort]);

  useEffect(() => { setShown(PAGE); }, [view, q, sort, fFormat, fGenre, fPath]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const clearAll = () => { setQ(''); setView('ALL'); setFFormat([]); setFGenre([]); setFPath([]); };

  return (
    <div className={css.mk} data-content-market-design="zip-exact" data-content-market-scene="market">
      <div className={css.mkglow} />
      <header className={css.mktop}>
        <button className={css.mkback} onClick={onBack}>←</button>
        <div className={css.mkmast}><b>THE MARKET</b><span>WEEK {st.week} · {pool.length} LOTS</span></div>
      </header>

      <Power st={st} />

      <div className={css.mksearch}>
        <input value={q} onChange={e => { setQ(e.target.value); onQueryChange?.(e.target.value); }}
          placeholder="Title, seller, genre, or what it is about" aria-label="Search the market" />
      </div>

      <div className={css.mklenses}>
        {([['ALL', 'Everything'], ['LIVE', 'In the room'], ['CLOSING', 'Closing'],
        ['OPEN', 'Open'], ['OPENS', 'Opening soon'], ['PACKS', 'Collections'],
        ['PROVEN', 'Proven'], ['WATCH', 'Announced']] as [string, string][]).map(([k, label]) => {
          const n = k === 'ALL' ? pool.length : counts[k] ?? 0;
          if (n === 0) return null;
          return (
            <button key={k} className={cx((view === k ? css.on : ''),
              (k === 'LIVE' ? css.mklenslive : ''), (k === 'CLOSING' ? css.mklensclose : ''))}
              onClick={() => setView(k)}>{label}<i>{n}</i></button>
          );
        })}
      </div>

      {/* the tools that make a long catalogue workable */}
      <div className={css.mktools}>
        <button className={css.mktool} onClick={() => setSheet(true)}>
          Filter{filtersOn ? <i>{filtersOn}</i> : null}
        </button>
        <select className={css.mksort} value={sort} onChange={e => setSort(e.target.value as Sort)}
          aria-label="Sort">
          {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button className={cx(css.mktool, css.mkdense, (dense ? css.on : ''))}
          onClick={() => setDense(!dense)} aria-label="Toggle density">
          {dense ? '▤' : '▦'}
        </button>
      </div>

      {/* Density is a view mode, not a filter modifier. It used to apply only
          inside a narrowed result, so pressing it on the rails screen did
          nothing at all — the control looked broken because it was. */}
      {narrowed || dense ? (
        <>
          <div className={css.mkresulthead}>
            <b>{results.length} title{results.length === 1 ? '' : 's'}</b>
            <button onClick={clearAll}>Clear</button>
          </div>
          {dense ? (
            <div className={css.mklist}>
              {results.slice(0, shown).map(l => <Row key={l.id} lot={l} onOpen={onOpen} />)}
            </div>
          ) : (
            <div className={css.mkwallgrid}>
              {results.slice(0, shown).map(l => <Card key={l.id} lot={l} onOpen={onOpen} />)}
            </div>
          )}
          {results.length > shown && (
            <button className={css.mkmore} onClick={() => setShown(shown + PAGE)}>
              Show {Math.min(PAGE, results.length - shown)} more
              <i>{results.length - shown} left</i>
            </button>
          )}
          {results.length === 0 && <p className={css.mkempty}>Nothing under that.</p>}
        </>
      ) : (
        RAILS.map(r => {
          const lots = pool.filter(r.test);
          if (!lots.length) return null;
          const over = lots.length - RAIL_CAP;
          return (
            <section className={css.mkrail} key={r.key}>
              <div className={css.mkrailhead}>
                <b>{r.title}<em>{lots.length}</em></b>
                <span>{r.note}</span>
              </div>
              <div className={css.mkrailrun}>
                {lots.slice(0, RAIL_CAP).map(l => <Card key={l.id} lot={l} onOpen={onOpen} wide />)}
                {over > 0 && (
                  <button className={css.mkseeall} onClick={() => setView(r.key)}>
                    <b>See all</b><i>{lots.length}</i><em>→</em>
                  </button>
                )}
              </div>
            </section>
          );
        })
      )}

      {/* filters live in a sheet, because seven kinds of narrowing do not fit a chip row */}
      {sheet && (
        <div className={css.mksheetwrap} onClick={() => setSheet(false)}>
          <div className={css.mkfilters} onClick={e => e.stopPropagation()}>
            <div className={css.mkfhead}><b>NARROW IT DOWN</b>
              <button onClick={() => setSheet(false)}>Done</button></div>
            <span className={css.mkflabel}>FORMAT</span>
            <div className={css.mkfrow}>
              {['FILM', 'SERIES', 'COLLECTION'].map(f => (
                <button key={f} className={fFormat.includes(f) ? css.on : ''}
                  onClick={() => toggle(fFormat, setFFormat, f)}>{f[0] + f.slice(1).toLowerCase()}</button>
              ))}
            </div>
            <span className={css.mkflabel}>GENRE</span>
            <div className={css.mkfrow}>
              {genres.map(g => (
                <button key={g} className={fGenre.includes(g) ? css.on : ''}
                  onClick={() => toggle(fGenre, setFGenre, g)}>{g}</button>
              ))}
            </div>
            <span className={css.mkflabel}>RELEASE HISTORY</span>
            <div className={css.mkfrow}>
              {paths.map(pth => (
                <button key={pth} className={fPath.includes(pth) ? css.on : ''}
                  onClick={() => toggle(fPath, setFPath, pth)}>{PATH_LABEL[pth]}</button>
              ))}
            </div>
            <button className={css.mkfclear} onClick={() => { setFFormat([]); setFGenre([]); setFPath([]); }}>
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   FROM YOUR STUDIO
   ============================================================ */
const Studio: React.FC<{ onBack: () => void; onTake: (l: Lot) => void }> = ({ onBack, onTake }) => {
  const CATALOGUE = useCatalogue();
  const mine = CATALOGUE.filter(l => l.mode === 'STUDIO');
  return (
    <div className={css.mk} data-content-market-design="zip-exact" data-content-market-scene="studio">
      <div className={css.mkglow} />
      <header className={css.mktop}>
        <button className={css.mkback} onClick={onBack}>←</button>
        <div className={css.mkmast}><b>YOUR STUDIO</b><span>DELIVERED AND ELIGIBLE</span></div>
      </header>
      <p className={css.mklead}>Production ownership and streaming rights are separate things. Bringing a
        title across links only the markets your company can legally stream — it does not cost you a fee.</p>
      <div className={css.mkwallgrid}>
        {mine.map(l => (
          <button className={css.mkcard} key={l.id} aria-label={`${l.title} · ${l.seller}`} disabled={l.linked || Boolean(l.unavailableReason)} onClick={() => onTake(l)}>
            <Poster id={l.id} title={l.title} genre={l.genre} hue={l.hue} year={l.year} size="md" />
            <div className={css.mkcardfoot}><b className={css.mkfree}>NO FEE</b><span>ALL MKTS</span></div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── THE FLAGS ─────────────────────────────────────────────────────────────
   Drawn in CSS so a flag can FILL its cell. An emoji is a glyph: it sits in a
   box at a fixed aspect and turns to mush above about 30px, which is why the
   old cells were a tiny picture in a large empty rectangle. These are colour
   fields, not a vexillology exam — the country code sits on top of every one. */
const FLAGS: Record<string, string> = {
  US: 'linear-gradient(#3c3b6e 0 0) 0 0/42% 54% no-repeat,'
    + 'repeating-linear-gradient(#b22234 0 7.7%,#fff 7.7% 15.4%)',
  /* first-listed paints ON TOP, so the red cross has to lead. Listing it last
     put it under the white one and the whole flag rendered near-white. */
  UK: 'linear-gradient(#cf142b 0 0) 50%/100% 15% no-repeat,'
    + 'linear-gradient(#cf142b 0 0) 50%/8% 100% no-repeat,'
    + 'linear-gradient(#fff 0 0) 50%/100% 29% no-repeat,'
    + 'linear-gradient(#fff 0 0) 50%/19% 100% no-repeat,'
    + 'linear-gradient(45deg,transparent 47%,#fff 47% 53%,transparent 53%),'
    + 'linear-gradient(-45deg,transparent 47%,#fff 47% 53%,transparent 53%),#00247d',
  JP: 'radial-gradient(circle at 50% 50%,#bc002d 0 27%,#fff 27%)',
  DE: 'linear-gradient(#000 0 33.3%,#dd0000 33.3% 66.6%,#ffce00 66.6%)',
  FR: 'linear-gradient(90deg,#002395 0 33.3%,#fff 33.3% 66.6%,#ed2939 66.6%)',
  IN: 'radial-gradient(circle at 50% 50%,#0a3d91 0 9%,transparent 9%),'
    + 'linear-gradient(#ff9933 0 33.3%,#fff 33.3% 66.6%,#138808 66.6%)',
  KR: 'radial-gradient(circle at 50% 50%,#cd2e3a 0 15%,#0047a0 15% 27%,#fff 27%)',
  BR: 'radial-gradient(circle at 50% 50%,#002776 0 18%,#ffdf00 18% 44%,#009c3b 44%)',
  IT: 'linear-gradient(90deg,#008c45 0 33.3%,#f4f5f0 33.3% 66.6%,#cd212a 66.6%)',
  CA: 'linear-gradient(90deg,#d52b1e 0 25%,#fff 25% 75%,#d52b1e 75%)',
  MX: 'linear-gradient(90deg,#006847 0 33.3%,#fff 33.3% 66.6%,#ce1126 66.6%)',
  ES: 'linear-gradient(#aa151b 0 25%,#f1bf00 25% 75%,#aa151b 75%)',
  AU: 'linear-gradient(#cf142b 0 0) 24% 30%/22% 5% no-repeat,'
    + 'linear-gradient(#cf142b 0 0) 24% 30%/5% 46% no-repeat,'
    + 'linear-gradient(#fff 0 0) 24% 30%/26% 9% no-repeat,'
    + 'linear-gradient(#fff 0 0) 24% 30%/9% 52% no-repeat,'
    + 'radial-gradient(circle at 76% 70%,#fff 0 5%,transparent 5%),#012169',
  SC: 'linear-gradient(90deg,transparent 28%,#fecc00 28% 44%,transparent 44%),'
    + 'linear-gradient(transparent 40%,#fecc00 40% 60%,transparent 60%),#005293',
  NL: 'linear-gradient(#ae1c28 0 33.3%,#fff 33.3% 66.6%,#21468b 66.6%)',
  IE: 'linear-gradient(90deg,#169b62 0 33.3%,#fff 33.3% 66.6%,#ff883e 66.6%)',
};

/* ── THE BOX SET ───────────────────────────────────────────────────────────
   A collection given one poster and a number badge looked like a film with a
   sticker on it. You are buying a shelf, so the cover is a shelf: the three
   most valuable titles fanned, the rest implied behind them. ── */
const Boxset: React.FC<{ lot: Lot; size?: 'sm' | 'lg' }> = ({ lot, size = 'sm' }) => {
  /* A fan of three spilled outside the card and got clipped, so it read as
     scattered cards rather than a set. A mosaic is what a collection cover
     actually is — every title legible, the count doing the rest. */
  const four = [...(lot.rows ?? [])].slice(0, 4);
  return (
    <div className={cx(css.mkbox, (size === 'lg' ? css.lg : ''))}>
      {four.map(r => (
        <span className={css.mkboxcell} key={r.name}>
          <Poster id={lot.id + r.name} title={r.name} genre={r.genre} hue={r.hue}
            size={size === 'lg' ? 'sm' : 'xs'} />
        </span>
      ))}
      {lot.rows && lot.rows.length > 4 && (
        <span className={css.mkboxmore}>+{lot.rows.length - 4}</span>
      )}
    </div>
  );
};


/* what each release path actually means for a buyer */
const PATH_LABEL: Record<Lot['path'], string> = {
  'POST-THEATRICAL': 'Cinema first', 'DAY AND DATE': 'Cinema and stream together',
  'STREAMING ONLY': 'Made for streaming', 'FESTIVAL ONLY': 'Festivals only',
  'UNRELEASED': 'Not yet released', 'LIBRARY': 'Library title',
};
const PATH_NOTE: Record<Lot['path'], string> = {
  'POST-THEATRICAL': 'It sold tickets first, so the audience is measured rather than guessed.',
  'DAY AND DATE': 'Released to cinemas and a service on the same day. The theatrical number understates it.',
  'STREAMING ONLY': 'It has never sold a ticket. Ratings exist; box office does not.',
  'FESTIVAL ONLY': 'Played to juries and almost nobody else. Reviews are strong, reach is unproven.',
  'UNRELEASED': 'Nothing has come out. You are buying on the package alone.',
  'LIBRARY': 'Old enough that its run is history. Cheap, and it will not surprise you either way.',
};

const Cell: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className={css.mkctcell}><span>{k}</span><b>{v}</b></div>
);

/** three sizes, because a treemap of sixteen equal boxes is just a table */
const tierOf = (w: number) => (w >= 20 ? 'xl' : w >= 8 ? 'lg' : 'md');

/* ============================================================
   THE TITLE — poster first, numbers as objects, prose last
   ============================================================ */
type Face = 'RIGHTS' | 'TERMS' | 'HEAT' | 'TITLES';

const Detail: React.FC<{
  lot: Lot; st: MarketState; onBack: () => void;
  onTake: (l: Lot) => void; onOffer: (l: Lot) => void; onRoom: (l: Lot) => void;
  offerCount?: number; onOffers?: () => void;
}> = ({ lot, st, onBack, onTake, onOffer, onRoom, offerCount = 0, onOffers }) => {
  const [face, setFace] = useState<Face>(lot.rows ? 'TITLES' : 'RIGHTS');
  const [visibleCollectionRows, setVisibleCollectionRows] = useState(12);
  const free = lot.terr.filter(t => t.status === 'FREE');
  const held = lot.terr.filter(t => t.status !== 'FREE');
  const power = st.treasury - st.committed;
  const afford = !lot.listed || lot.listed.mg <= power;
  const reach = reachOf(lot.terr);
  const span = lot.rows
    ? `${Math.min(...lot.rows.map(r => r.year))}–${Math.max(...lot.rows.map(r => r.year))}`
    : '';

  return (
    <div className={cx(css.mk, css.mkdetail)} data-content-market-design="zip-exact" data-content-market-scene="detail" style={{ ['--epx-mkwrap-dh' as string]: String(lot.hue) }}>
      {/* The poster is the best thing on this page and it was being cropped to a
          header strip. It is presented now — framed, lit, and the page takes
          its ambient colour from the title itself, so no two feel alike. */}
      <div className={css.mkbloom} />
      <div className={css.mkhero}>
        <button className={cx(css.mkback, css.mkfloat)} onClick={onBack}>←</button>
        {lot.rows ? (
          <Boxset lot={lot} size="lg" />
        ) : (
          <div className={css.mkoneframe}>
            <Poster id={lot.id} title={lot.title} genre={lot.genre} hue={lot.hue} year={lot.year}
              size="lg" />
          </div>
        )}
      </div>

      <div className={css.mkbody}>
        <h1>{lot.title}</h1>
        <div className={css.mkavrow}><Chip lot={lot} /><em>{AVAIL[lot.avail].note}</em></div>
        <p className={css.mkline}>{lot.seller} · {lot.year} · {lot.runtime} · {lot.genre}</p>

        {/* you cannot value a title you cannot picture */}
        <p className={css.mklogline}>{lot.logline}</p>
        <p className={css.mksynopsis}>{lot.synopsis}</p>

        {/* where it has been decides what you are actually buying */}
        <div className={css.mkpath}>
          <div className={css.mkpathrow}>
            <span>RELEASE HISTORY</span>
            <b>{PATH_LABEL[lot.path]}</b>
          </div>
          <p>{PATH_NOTE[lot.path]}</p>
          {lot.prior ? (
            <div className={css.mkprior}>
              <div className={css.mkscore}>
                <b>{lot.prior.rating.toFixed(1)}</b>
                <span>{count(lot.prior.votes)} RATINGS</span>
              </div>
              {lot.prior.boxOffice ? (
                <div className={css.mkbox}><b>{money(lot.prior.boxOffice)}</b>
                  <span>worldwide box office</span></div>
              ) : null}
              {lot.prior.openingWeekend ? (
                <div className={css.mkbox}><b>{money(lot.prior.openingWeekend)}</b>
                  <span>opening weekend{lot.prior.screens ? ` · ${count(lot.prior.screens)} screens` : ''}</span></div>
              ) : null}
              {lot.prior.awards ? (
                <div className={css.mkbox}><b>{lot.prior.awards}</b><span>awards</span></div>
              ) : null}
            </div>
          ) : (
            <p className={css.mkunproven}>
              <b>No public record.</b> Nothing has been released, so there is nothing to check.
              You are buying the package, not the performance.
            </p>
          )}
        </div>

        {/* one statement, not four identical boxes */}
        <div className={css.mkask}>
          <span>{lot.listed ? 'THE ASK' : 'DECIDED IN THE ROOM'}</span>
          <b>{lot.listed ? money(lot.listed.mg) : 'NO PRICE'}</b>
          <div className={css.mkfacts}>
            {lot.rows ? (
              <>
                <em><i>{lot.rows.length}</i>titles in the package</em>
                <em><i>{span}</i>years of catalogue</em>
                <em><i>{reach}%</i>of worldwide value</em>
              </>
            ) : (
              <>
                <em><i>{reach}%</i>of its worldwide value</em>
                <em><i>{lot.listed ? `${yearsOf(lot.listed.termWeeks)}y` : '—'}</i>licence term</em>
                <em><i>{lot.heat}</i>public interest</em>
              </>
            )}
          </div>
        </div>

        <div className={css.mkfaces}>
          {((lot.rows ? ['TITLES', 'RIGHTS', 'TERMS'] : ['RIGHTS', 'TERMS', 'HEAT']) as Face[]).map(f => (
            <button key={f} className={face === f ? css.on : ''} onClick={() => setFace(f)}>
              {f === 'TITLES' ? `${lot.rows!.length} titles` : f === 'RIGHTS' ? 'Rights'
                : f === 'TERMS' ? 'Deal' : 'Interest'}
            </button>
          ))}
        </div>

        {face === 'TITLES' && lot.rows && (
          <>
            <p className={css.mknote}>
              Bought whole and accounted per title. Each one carries its own price, its own
              contract and its own backend — so a single title can be the reason the package
              paid for itself.
            </p>
            <div className={css.mkshelf}>
              {lot.rows.slice(0, visibleCollectionRows).map(r => (
                <div className={css.mkmember} key={r.name}>
                  <span className={css.mkmemart}>
                    <Poster id={lot.id + r.name} title={r.name} genre={r.genre} hue={r.hue} size="xs" />
                  </span>
                  <span className={css.mkmemmain}>
                    <b>{r.name}</b>
                    <em>{r.year} · {r.genre} · {r.runtime}</em>
                  </span>
                  <span className={css.mkmemend}>
                    <b>{money(r.alloc)}</b>
                    <em>{r.share}% yours</em>
                  </span>
                  <i className={css.mkmemshare}
                    style={{ width: `${(r.alloc / lot.rows![0].alloc) * 100}%` }} />
                </div>
              ))}
              {visibleCollectionRows < lot.rows.length && (
                <button type="button" className={css.mkmark}
                  onClick={() => setVisibleCollectionRows(value => Math.min(lot.rows!.length, value + 12))}>
                  SHOW {Math.min(12, lot.rows.length - visibleCollectionRows)} MORE
                </button>
              )}
            </div>
            <div className={css.mkshelftotal}>
              <span>TOTAL GUARANTEE</span>
              <b>{exact(lot.rows.reduce((a, r) => a + r.alloc, 0))}</b>
            </div>
          </>
        )}

        {face === 'RIGHTS' && (
          <>
            <div className={css.mkreach}>
              <span>YOU CAN LICENSE</span>
              <b>{reach}<i>%</i></b>
              <em>of what this title is worth worldwide</em>
            </div>
            <div className={css.mkgrid}>
              {lot.terr.map(t => (
                <div key={t.code}
                  className={cx(css.mkcell, css['mkw-' + (tierOf(t.weight))], css['mkt-' + (t.status.toLowerCase())])}>
                  <span className={css.mkfield} style={{ background: FLAGS[t.code] ?? '#2a2f3a' }} />
                  <span className={css.mkscrim} />
                  <b>{t.code}</b>
                  <i>{t.weight}%</i>
                  {t.status !== 'FREE' && <u className={css.mkxout} />}
                </div>
              ))}
            </div>
            <p className={css.mkavailline}><b>{free.length} of {lot.terr.length} markets available.</b>{' '}
              {held.length ? held.map(t => `${t.name} — ${t.note}`).join('. ') + '.'
                : 'The seller controls every market offered.'}</p>
            {lot.chain && (
              <ol className={css.mkchain}>
                {lot.chain.map((h, i) => (
                  <li key={h}><em>{i === 0 ? 'ORIGINATED' : i === lot.chain!.length - 1 ? 'HOLDS IT NOW' : 'SOLD ON'}</em>{h}</li>
                ))}
              </ol>
            )}
            {lot.note && <p className={css.mknote}>{lot.note}</p>}
          </>
        )}

        {face === 'TERMS' && lot.listed && (
          <>
            <div className={css.mkcontract}>
              <div className={css.mkcthead}>
                <b>{lot.listed.shape}</b>
                <span>AS WRITTEN</span>
              </div>
              <div className={css.mkctmg}>
                <span>GUARANTEE</span>
                <b>{exact(lot.listed.mg)}</b>
                <em>{lot.listed.recoupable ? 'Recoupable — an advance against backend'
                  : 'Non-recoupable — a fee they keep'}</em>
              </div>
              <div className={css.mkctgrid}>
                <Cell k="BACKEND" v={lot.listed.backendPct ? `${lot.listed.backendPct}%` : 'None'} />
                <Cell k="BASIS" v={lot.listed.backendPct ? lot.listed.basis : '—'} />
                <Cell k="BACKEND CAP" v={lot.listed.backendCap ? exact(lot.listed.backendCap) : 'Uncapped'} />
                <Cell k="TERM" v={termLabel(lot.listed.termWeeks)} />
                <Cell k="RIGHTS" v={`${lot.listed.scope} · ${lot.listed.excl === 'EXCLUSIVE' ? 'exclusive' : 'shared'}`} />
                <Cell k="WINDOW" v={lot.listed.window === 'FIRST' ? 'First window'
                  : lot.listed.window === 'SECOND' ? 'Second window' : 'Perpetual'} />
                <Cell k="LOCALIZATION" v={lot.listed.localization} />
                <Cell k="RENEWAL" v={lot.listed.renewal} />
                {lot.listed.marketing ? <Cell k="MARKETING" v={exact(lot.listed.marketing)} /> : null}
                {lot.listed.sequel ? <Cell k="SEQUEL RIGHTS" v="Included" /> : null}
              </div>
            </div>
            {lot.listed.basis === 'Net receipts' && lot.listed.backendPct > 0 && (
              <p className={css.mkwarn}>
                Backend is on <b>net receipts</b>. After their costs come off, net has a habit
                of never arriving — which is why they accepted a smaller guarantee for it.
              </p>
            )}
          </>
        )}
        {face === 'TERMS' && !lot.listed && (
          <p className={css.mknote}>No published terms. This one is decided in the room.</p>
        )}

        {face === 'HEAT' && (
          <>
            <div className={css.mkheat}><i><u style={{ width: `${lot.heat}%` }} /></i><b>{lot.heat}</b></div>
            <ul className={css.mkwhy}>{lot.heatWhy.map(w => <li key={w}>{w}</li>)}</ul>
            <p className={css.mknote}>Interest is what the market expects, not what it will pay you back.</p>
          </>
        )}
      </div>

      <div className={css.mkbar2}>
        {lot.mode === 'LISTED' && (
          <>
            <button className={cx(css.mksign, (afford ? '' : css.dead))} disabled={!afford}
              onClick={() => afford && onTake(lot)}>
              {afford ? `BUY · ${money(lot.listed!.mg)}` : `SHORT BY ${money(lot.listed!.mg - power)}`}
            </button>
            <button className={css.mkmark} aria-label="Make private offer" onClick={() => onOffer(lot)}>OFFER</button>
            {offerCount > 0 && <button className={css.mkmark} onClick={onOffers}>YOUR OFFERS · {offerCount}</button>}
          </>
        )}
        {lot.mode === 'AUCTION' && <button className={cx(css.mksign, css.mklivebtn)} onClick={() => onRoom(lot)}>ENTER THE ROOM</button>}
        {lot.mode === 'STUDIO' && <button className={css.mksign} onClick={() => onTake(lot)}>BRING IT ACROSS</button>}
        {lot.mode === 'UPCOMING' && <button className={css.mkmark} onClick={() => onTake(lot)}>FOLLOW THIS SALE</button>}
      </div>
    </div>
  );
};


/* ============================================================
   WHO IS ACROSS THE TABLE
   You were negotiating with a string — "Meridian Pictures" — and dials.
   Deals are done with a PERSON, and the useful thing about a person is that
   you can read them before they answer.
   ============================================================ */
const Rep: React.FC<{ seller: string; posture: 'in' | 'level' | 'back' }> = ({ seller, posture }) => {
  const r = repFor(seller);
  return (
    <div className={cx(css.mkrep, css['mkp-' + posture])}>
      <span className={css.mkface} style={{ ['--epx-mkwrap-fh' as string]: String(r.hue) }}>
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="15" r="7.4" />
          <path d="M5 40c1.6-9 7.6-13 15-13s13.4 4 15 13z" />
        </svg>
      </span>
      <div className={css.mkrepwho}>
        <b>{r.name}</b>
        <span>{r.role}</span>
        <em>{seller}</em>
      </div>
    </div>
  );
};

/* ============================================================
   THE OFFER — a term sheet you tune, with the seller reading over your shoulder
   ============================================================ */
const Redline: React.FC<{
  lot: Lot; st: MarketState; onBack: () => void; onSend: (l: Lot, o: Offer) => void;
}> = ({ lot, st, onBack, onSend }) => {
  const base = lot.listed!;
  const [o, setO] = useState<Offer>({
    ...offerFrom(base),
    markets: lot.terr.filter(t => t.status === 'FREE').map(t => t.id),
  });
  const set = <K extends keyof Offer>(k: K, v: Offer[K]) => setO(p => ({ ...p, [k]: v }));
  const v = verdictOf(lot, o);
  const power = st.treasury - st.committed;
  const afford = o.mg <= power;
  const delta = o.mg - base.mg;

  return (
    <div className={cx(css.mk, css.mkoffer)} data-content-market-design="zip-exact" data-content-market-scene="offer" style={{ ['--epx-mkwrap-dh' as string]: String(lot.hue) }}>
      <div className={css.mkglow} />
      <header className={css.mktop}>
        <button className={css.mkback} onClick={onBack}>←</button>
        <div className={css.mkmast}><b>YOUR OFFER</b><span>{lot.title.toUpperCase()}</span></div>
      </header>

      {/* what they hear, before what you pay */}
      {/* they are sitting opposite you, and you can read them */}
      <Rep seller={lot.seller} posture={v.tone === 'good' ? 'in' : v.tone === 'warn' ? 'level' : 'back'} />
      <div className={cx(css.mksays, css['mk-' + (v.tone)])}>
        <p>{sayOf(lot, v.tone)}</p>
        <em>{v.line}</em>
      </div>

      {/* the term sheet on the table between you */}
      <div className={css.mksheet}>
        <div className={css.mksheethead}><b>HEADS OF TERMS</b><span>DRAFT 1</span></div>
        <div className={css.mkrow}><span>Guarantee</span>
          <b className={afford ? '' : css.mkover}>{exact(o.mg)}</b></div>
        <div className={css.mkrow}><span>Backend</span><b>{o.backendPct}% · {o.basis.toLowerCase()}</b></div>
        <div className={css.mkrow}><span>Guarantee is</span>
          <b>{o.recoupable ? 'Recoupable' : 'Non-recoupable'}</b></div>
        <div className={css.mkrow}><span>Term</span><b>{termLabel(o.termWeeks)}</b></div>
        <div className={css.mkrow}><span>Marketing</span><b>{o.marketing ? exact(o.marketing) : '—'}</b></div>
        <div className={css.mkrow}><span>Exclusivity</span>
          <b>{o.excl === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}</b></div>
        <div className={cx(css.mkrow, css.mkdelta)}><span>Against the ask</span>
          <b className={delta > 0 ? css.up : delta < 0 ? css.down : ''}>
            {delta === 0 ? 'as listed' : `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))}`}</b></div>
      </div>

      <div className={css.mkbigrow}>
        <button onClick={() => set('mg', Math.max(200_000, o.mg - 250_000))}>− 250K</button>
        <button onClick={() => set('mg', o.mg + 250_000)}>+ 250K</button>
      </div>

      <div className={css.mkdials}>
        <Dial label="THEY KEEP" value={`${o.backendPct}%`}
          dec={() => set('backendPct', Math.max(0, o.backendPct - 2))}
          inc={() => set('backendPct', Math.min(55, o.backendPct + 2))} />
        <Dial label="TERM" value={`${yearsOf(o.termWeeks)}y`}
          dec={() => set('termWeeks', Math.max(52, o.termWeeks - 52))}
          inc={() => set('termWeeks', Math.min(260, o.termWeeks + 52))} />
        <Dial label="MARKETING" value={o.marketing ? money(o.marketing) : '—'}
          dec={() => set('marketing', Math.max(0, o.marketing - 200_000))}
          inc={() => set('marketing', o.marketing + 200_000)} />
      </div>

      <div className={css.mkclauses}>
        <Clause on={o.excl === 'EXCLUSIVE'} label="Exclusive"
          go={() => set('excl', o.excl === 'EXCLUSIVE' ? 'SHARED' : 'EXCLUSIVE')} />
        <Clause on={o.sequel} label="Sequel rights" go={() => set('sequel', !o.sequel)} />
        <Clause on={o.sublicense} label="Sublicensing" go={() => set('sublicense', !o.sublicense)} />
        <Clause on={o.renewal !== 'None'} label="Renewal option"
          go={() => set('renewal', o.renewal === 'None' ? 'First option' : 'None')} />
        <Clause on={!o.recoupable} label="Non-recoupable"
          go={() => set('recoupable', !o.recoupable)} />
        {/* the basis is the single biggest lever on what a backend is worth */}
        <Clause on={o.basis === 'Adjusted gross'} label={o.basis}
          go={() => set('basis', o.basis === 'Net receipts' ? 'Adjusted gross'
            : o.basis === 'Adjusted gross' ? 'Gross receipts' : 'Net receipts')} />
      </div>

      <div className={css.mkbar2}>
        <button className={cx(css.mksign, (afford ? '' : css.dead))} disabled={!afford}
          onClick={() => afford && onSend(lot, o)}>
          {afford ? 'SEND IT' : `SHORT BY ${money(o.mg - power)}`}
        </button>
      </div>
      <p className={css.mkfoot}>Nothing is charged while an offer sits with them. They answer in two to three weeks.</p>
    </div>
  );
};

const Dial: React.FC<{ label: string; value: string; inc: () => void; dec: () => void }> =
  ({ label, value, inc, dec }) => (
    <div className={css.mkdial}>
      <span>{label}</span>
      <b>{value}</b>
      <div><button onClick={dec}>−</button><button onClick={inc}>+</button></div>
    </div>
  );

const Clause: React.FC<{ on: boolean; label: string; go: () => void }> = ({ on, label, go }) => (
  <button className={on ? css.on : ''} onClick={go}>{on ? '✓ ' : ''}{label}</button>
);
/* ============================================================
   THE MARKET
   ============================================================ */
export type MarketScene = 'GATE' | 'MARKET' | 'STUDIO' | 'DETAIL' | 'OFFER';

export const ContentMarket: React.FC<{
  brand: Brand;
  state: MarketState;
  supplySummary?: MarketSupplySummary;
  catalogue: Lot[];
  onBack: () => void;
  onCommission?: () => void;
  onAcquired?: (l: Lot) => { changed: boolean; detail: string };
  onOfferSent?: (l: Lot, o: Offer) => { changed: boolean; detail: string };
  onEnterRoom?: (l: Lot) => void;
  onFollow?: (l: Lot) => { changed: boolean; detail: string };
  offerCount?: number;
  onOpenOffers?: () => void;
  onNavigation?: (scene: MarketScene, lotId: string | null) => void;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  initialScene?: MarketScene;
  initialLotId?: string | null;
}> = ({ brand, state, supplySummary, catalogue, onBack, onCommission, onAcquired, onOfferSent, onEnterRoom, onFollow, offerCount = 0, onOpenOffers, onNavigation, initialQuery = '', onQueryChange, initialScene = 'GATE', initialLotId = null }) => {
  const c = brandColor(brand);
  const [scene, setScene] = useState<MarketScene>(initialScene);
  const [back, setBack] = useState<MarketScene>(initialScene === 'STUDIO' ? 'STUDIO' : 'MARKET');
  const [lot, setLot] = useState<Lot | null>(() => catalogue.find(item => item.id === initialLotId) || null);
  const [flash, setFlash] = useState<{ head: string; body: string; lot?: Lot; kind: 'SIGNED' | 'SENT' | 'FOLLOWED' } | null>(null);

  const settle = (head: string, body: string, kind: 'SIGNED' | 'SENT' | 'FOLLOWED' = 'SIGNED', l?: Lot) => {
    setFlash({ head, body, kind, lot: l });
    window.setTimeout(() => { setFlash(null); setScene('GATE'); onNavigation?.('GATE', null); }, 3600);
  };
  const take = (l: Lot) => {
    const result = l.mode === 'UPCOMING' ? onFollow?.(l) : onAcquired?.(l);
    if (result?.changed) settle(l.title, result.detail, l.mode === 'UPCOMING' ? 'FOLLOWED' : 'SIGNED', l);
  };
  const navigate = (next: MarketScene, nextLot: Lot | null = lot) => {
    setScene(next);
    onNavigation?.(next, nextLot?.id || null);
  };
  const open = (l: Lot, from: MarketScene) => { setLot(l); setBack(from); navigate('DETAIL', l); };

  return (
    <CatalogueContext.Provider value={catalogue}>
    <div className={css.mkwrap} data-content-market-design="zip-exact" style={{ ['--epx-mkwrap-c' as string]: c }}>
      {flash && (
        <div className={cx(css.mksigned, css['mks-' + (flash.kind.toLowerCase())])}
          style={{ ['--epx-mkwrap-dh' as string]: String(flash.lot?.hue ?? 150) }}>
          <div className={css.mksignglow} />
          {flash.lot && (
            <div className={css.mksignart}>
              {flash.lot.rows ? <Boxset lot={flash.lot} /> : (
                <Poster id={flash.lot.id} title={flash.lot.title} genre={flash.lot.genre}
                  hue={flash.lot.hue} size="md" />
              )}
            </div>
          )}
          <b className={css.mksignword}>{flash.kind === 'SIGNED' ? 'ACQUIRED' : flash.kind === 'FOLLOWED' ? 'FOLLOWING' : 'OFFER SENT'}</b>
          <span className={css.mksigntitle}>{flash.head}</span>
          {flash.kind === 'SIGNED' && flash.lot ? (
            <div className={css.mksignfacts}>
              <em><i>{flash.lot.listed ? money(flash.lot.listed.mg) : 'NO FEE'}</i>paid</em>
              <em><i>{reachOf(flash.lot.terr)}%</i>of its value</em>
              <em><i>{flash.lot.rows ? flash.lot.rows.length : 1}</i>{flash.lot.rows ? 'titles' : 'title'}</em>
            </div>
          ) : <em className={css.mksignnote}>{flash.body}</em>}
          {flash.kind === 'SIGNED' && (
            <p className={css.mksignnote}>The contract is registered and it is in your catalogue.</p>
          )}
        </div>
      )}
      {scene === 'GATE' && (
        <Gate st={state} supplySummary={supplySummary} onBack={onBack} onCommission={onCommission}
          onRoute={r => navigate(r === 'STUDIO' ? 'STUDIO' : 'MARKET', null)} />
      )}
      {scene === 'MARKET' && <Market st={state} initialQuery={initialQuery} onQueryChange={onQueryChange} onBack={() => navigate('GATE', null)} onOpen={l => open(l, 'MARKET')} />}
      {scene === 'STUDIO' && <Studio onBack={() => navigate('GATE', null)} onTake={take} />}
      {scene === 'DETAIL' && lot && (
        <Detail lot={lot} st={state} onBack={() => navigate(back, null)} onTake={take}
          onOffer={() => navigate('OFFER', lot)} offerCount={offerCount} onOffers={onOpenOffers}
          onRoom={roomLot => onEnterRoom?.(roomLot)} />
      )}
      {scene === 'OFFER' && lot && (
        <Redline lot={lot} st={state} onBack={() => navigate('DETAIL', lot)}
          onSend={(l, offer) => {
            const result = onOfferSent?.(l, offer);
            if (result?.changed) settle(l.title, result.detail, 'SENT', l);
          }} />
      )}
    </div>
    </CatalogueContext.Provider>
  );
};

/* Styles now live in presentation/screens/ContentMarket/ContentMarket.module.css */
