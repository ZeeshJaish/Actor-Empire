/**
 * EMPIRE+ v2 — THE APP
 *
 * Not a preview in a device frame: the actual app a subscriber gets, full
 * screen. No operator data lives here at all — this screen is for feeling what
 * you built, not studying it. The studying happens in the Title Dossier.
 *
 * It is where three earlier decisions finally come due:
 *   · the ident you paid for in the wizard plays before every Original
 *   · the servers you built decide whether it plays in 4K or buffers
 *   · the storefront you chose decides how the home screen is laid out
 */
import css from './presentation/screens/ViewerApp/ViewerApp.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep, typeFace } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export interface AppTitle {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED';
  format: string;
  genre: string;
  hue: number;
  logline: string;
  progress?: number;
  leavingInWeeks?: number;
  rank?: number;
  newThisWeek?: boolean;
  episodes?: { n: number; title: string; mins: number }[];
}

export interface AppState {
  live: boolean;
  layoutId: string;
  titles: AppTitle[];
  watchingNow: number;
  /** what the Network page says the service can actually do */
  network: { peakLoad: number; tier: 'SD' | 'HD' | '4K'; latencyMs: number };
}

type Screen = 'BROWSE' | 'TITLE';
type Phase = 'IDENT' | 'PLAYING' | 'BUFFERING';

const count = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;

const REACTIONS = [
  'this is unreal', 'ok episode 4 destroyed me', 'binged the whole thing',
  'the score though', 'who else is rewatching', 'best thing on here',
  'no spoilers please', 'still thinking about that ending',
];

/* ============================================================
   THE APP
   ============================================================ */
export const ViewerApp: React.FC<{
  brand: Brand;
  state: AppState;
  onBack: () => void;
}> = ({ brand, state, onBack }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const tf = typeFace(brand);
  const [screen, setScreen] = useState<Screen>('BROWSE');
  const [open, setOpen] = useState<AppTitle | null>(null);
  const [playing, setPlaying] = useState<AppTitle | null>(null);

  const rows = useMemo(() => {
    const out: { id: string; label: string; items: AppTitle[] }[] = [];
    const chart = state.titles.filter(t => t.rank).sort((a, b) => a.rank! - b.rank!);
    const resume = state.titles.filter(t => t.progress !== undefined);
    const originals = state.titles.filter(t => t.kind === 'ORIGINAL');
    const fresh = state.titles.filter(t => t.newThisWeek);
    const leaving = state.titles.filter(t => t.leavingInWeeks !== undefined)
      .sort((a, b) => a.leavingInWeeks! - b.leavingInWeeks!);
    if (state.layoutId === 'RESUME' && resume.length) out.push({ id: 'r', label: 'Continue Watching', items: resume });
    if (chart.length) out.push({ id: 't', label: 'Top 10 Today', items: chart });
    if (state.layoutId !== 'RESUME' && resume.length) out.push({ id: 'r', label: 'Continue Watching', items: resume });
    if (originals.length) out.push({ id: 'o', label: `${brand.name || 'EMPIRE+'} Originals`, items: originals });
    if (fresh.length) out.push({ id: 'n', label: 'New This Week', items: fresh });
    if (leaving.length) out.push({ id: 'l', label: 'Leaving Soon', items: leaving });
    return out;
  }, [state.titles, state.layoutId, brand.name]);

  const hero = state.titles.find(t => t.rank === 1) ?? state.titles[0];
  const showHero = state.layoutId !== 'ROWS' && state.layoutId !== 'GRID' && !!hero;
  const grid = state.layoutId === 'GRID';

  const openTitle = (t: AppTitle) => { setOpen(t); setScreen('TITLE'); };

  return (
    <div className={css.va} style={{
      ['--epx-va-line' as string]: 'var(--line, rgba(255,255,255,.09))',
      ['--epx-va-c' as string]: c,
    }}>
      {/* the only operator control on the whole screen */}
      {!playing && (
        <button className={css.exitpill} onClick={() => screen === 'TITLE' ? setScreen('BROWSE') : onBack()}>
          {screen === 'TITLE' ? '‹ Back' : '✕ Exit app'}
        </button>
      )}

      {!state.live ? (
        <div className={css.prelaunch}>
          <span className={css.plmark}><Mark brand={brand} /></span>
          <b>{brand.name || 'UNNAMED'}</b>
          <p>Nobody can reach this yet. The app goes live the day you launch.</p>
        </div>
      ) : screen === 'BROWSE' ? (
        <div className={css.ascroll}>
          <div className={css.topbar2}>
            <span className={css.tmark}><Mark brand={brand} /></span>
            <b style={{ fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing }}>
              {brand.name || 'UNNAMED'}
            </b>
            <div className={css.tnav}><span>Series</span><span>Films</span><span>My List</span></div>
            <i className={css.tav} />
          </div>

          {showHero && hero && (
            <button className={css.bighero} style={{ ['--epx-va-h' as string]: `${hero.hue}` }} onClick={() => openTitle(hero)}>
              <span className={css.hghost} style={{ fontFamily: tf.stack }}>{hero.title}</span>
              <div className={css.hbody}>
                {hero.kind === 'ORIGINAL' && (
                  <span className={css.otag}><i><Mark brand={brand} /></i>ORIGINAL</span>
                )}
                <b style={{ fontFamily: tf.stack }}>{hero.title}</b>
                <span className={css.hmeta}>{hero.genre} · {hero.format}</span>
                <div className={css.hacts}>
                  <span className={css.pbtn} onClick={e => { e.stopPropagation(); setPlaying(hero); }}>
                    <i className={css.tri} />Play
                  </span>
                  <span className={css.lbtn}>+ My List</span>
                </div>
              </div>
            </button>
          )}

          {rows.map(r => (
            <div className={css.arow} key={r.id}>
              <div className={css.arowhead}>{r.label}</div>
              <div className={grid ? css.agrid : css.arail}>
                {r.items.map(t => (
                  <button className={css.acard} key={`${r.id}-${t.id}`}
                    style={{ ['--epx-va-h' as string]: `${t.hue}` }} onClick={() => openTitle(t)}>
                    <span className={css.cghost} style={{ fontFamily: tf.stack }}>{t.title}</span>
                    {r.id === 't' && t.rank && <span className={css.crank}>{t.rank}</span>}
                    {t.kind === 'ORIGINAL' && <i className={css.com}><Mark brand={brand} /></i>}
                    {t.leavingInWeeks !== undefined && (
                      <span className={css.cleave}>{t.leavingInWeeks <= 1 ? 'Last week' : `${t.leavingInWeeks} weeks left`}</span>
                    )}
                    {t.progress !== undefined && <div className={css.cprog}><i style={{ width: `${t.progress * 100}%` }} /></div>}
                    <span className={css.ccap}>{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className={css.livebar}><i className={css.dot} />{count(state.watchingNow)} watching right now</div>
          <div className={css.append}>{brand.name || 'EMPIRE+'} · {state.titles.length} titles in your region</div>
        </div>
      ) : open ? (
        <TitlePage brand={brand} t={open} watching={state.watchingNow}
          onPlay={() => setPlaying(open)} onOpen={openTitle}
          related={state.titles.filter(x => x.id !== open.id).slice(0, 6)} />
      ) : null}

      {playing && (
        <Player brand={brand} t={playing} network={state.network} onExit={() => setPlaying(null)} />
      )}
    </div>
  );
};

/* ============================================================
   TITLE PAGE
   ============================================================ */
const TitlePage: React.FC<{
  brand: Brand; t: AppTitle; watching: number;
  onPlay: () => void; onOpen: (t: AppTitle) => void; related: AppTitle[];
}> = ({ brand, t, watching, onPlay, onOpen, related }) => {
  const tf = typeFace(brand);
  const [react, setReact] = useState(0);
  useEffect(() => {
    const iv = window.setInterval(() => setReact(r => (r + 1) % REACTIONS.length), 2600);
    return () => window.clearInterval(iv);
  }, []);

  return (
    <div className={css.tpage}>
      <div className={css.tart} style={{ ['--epx-va-h' as string]: `${t.hue}` }}>
        <span className={css.tghost} style={{ fontFamily: tf.stack }}>{t.title}</span>
      </div>
      <div className={css.tbody}>
        {t.kind === 'ORIGINAL' && <span className={css.otag}><i><Mark brand={brand} /></i>ORIGINAL</span>}
        <h1 style={{ fontFamily: tf.stack }}>{t.title}</h1>
        <div className={css.tmeta2}>{t.genre} · {t.format}{t.episodes ? ` · ${t.episodes.length} episodes` : ''}</div>
        <p className={css.tlog}>{t.logline}</p>

        <button className={css.playbig} onClick={onPlay}><i className={css.tri} />Play</button>
        <div className={css.trow2}>
          <span className={css.tchip}>+ My List</span>
          <span className={css.tchip}>Rate</span>
          <span className={css.tchip}>Share</span>
        </div>

        {t.leavingInWeeks !== undefined && (
          <div className={css.tleave}>
            Leaving in {t.leavingInWeeks} week{t.leavingInWeeks === 1 ? '' : 's'} — watch it before it goes.
          </div>
        )}

        <div className={css.tlive}><i className={css.dot} />{count(watching)} watching · “{REACTIONS[react]}”</div>

        {t.episodes && (
          <div className={css.eps}>
            <div className={css.epshead}>Episodes</div>
            {t.episodes.map(e => (
              <button className={css.ep} key={e.n} onClick={onPlay}>
                <span className={css.epn}>{e.n}</span>
                <div className={css.epid}><b>{e.title}</b><span>{e.mins}m</span></div>
                <i className={css.eptri} />
              </button>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <div className={css.more}>
            <div className={css.epshead}>More Like This</div>
            <div className={css.mgrid}>
              {related.map(r => (
                <button className={css.mcard} key={r.id} style={{ ['--epx-va-h' as string]: `${r.hue}` }}
                  onClick={() => onOpen(r)}>
                  <span className={css.cghost} style={{ fontFamily: tf.stack }}>{r.title}</span>
                  <span className={css.ccap}>{r.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={css.tfootspace} />
      </div>
    </div>
  );
};

/* ============================================================
   THE PLAYER — where the ident and the servers come due
   ============================================================ */
const Player: React.FC<{
  brand: Brand; t: AppTitle;
  network: AppState['network'];
  onExit: () => void;
}> = ({ brand, t, network, onExit }) => {
  const c = brandColor(brand);
  const tf = typeFace(brand);
  const runsIdent = brand.identMode === 'full' && t.kind === 'ORIGINAL';
  const [phase, setPhase] = useState<Phase>(runsIdent ? 'IDENT' : 'PLAYING');
  const [canSkip, setCanSkip] = useState(false);
  const [pos, setPos] = useState(0);
  const [quality, setQuality] = useState<'SD' | 'HD' | '4K'>(network.tier);
  const [stalled, setStalled] = useState(false);
  const timers = useRef<number[]>([]);

  /* the servers decide whether this plays cleanly */
  const willStall = network.peakLoad >= 85 || network.latencyMs > 120;

  useEffect(() => {
    if (phase !== 'IDENT') return;
    timers.current.push(window.setTimeout(() => setCanSkip(true), 1200));
    timers.current.push(window.setTimeout(() => setPhase('PLAYING'), brand.identLen * 1000));
  }, [phase, brand.identLen]);

  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const iv = window.setInterval(() => setPos(p => Math.min(100, p + 0.7)), 90);
    return () => window.clearInterval(iv);
  }, [phase]);

  /* one stall partway in, if the infrastructure cannot carry it */
  useEffect(() => {
    if (phase !== 'PLAYING' || !willStall || stalled || pos < 28) return;
    setStalled(true);
    setPhase('BUFFERING');
    setQuality('SD');
    timers.current.push(window.setTimeout(() => setPhase('PLAYING'), 2400));
  }, [pos, phase, willStall, stalled]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  return (
    <div className={css.player}>
      {phase === 'IDENT' ? (
        <div className={css.ident}>
          <span className={css.imark}><Mark brand={brand} /></span>
          <div className={css.iname} style={{ fontFamily: tf.stack }}>{brand.name || 'EMPIRE+'}</div>
          <div className={css.iwave}>
            {Array.from({ length: 15 }).map((_, n) => {
              const env = 0.34 + 0.66 * Math.sin((Math.PI * (n + 0.5)) / 15);
              return <i key={n} style={{
                ['--epx-va-m' as string]: env.toFixed(3),
                animationDelay: `${((n * 7) % 5) * 0.09}s`, background: c,
              }} />;
            })}
          </div>
          {/* people skip idents. that is the friction you were warned about */}
          {canSkip && <button className={css.skip} onClick={() => setPhase('PLAYING')}>SKIP ›</button>}
        </div>
      ) : (
        <>
          <div className={css.pic} style={{ ['--epx-va-h' as string]: `${t.hue}` }}>
            <span className={css.picghost} style={{ fontFamily: tf.stack }}>{t.title}</span>
            {brand.identMode === 'badge' && <span className={css.wmk}><Mark brand={brand} /></span>}
          </div>

          {phase === 'BUFFERING' && (
            <div className={css.buffer}>
              <i className={css.spin} />
              <b>Buffering…</b>
              <span>
                {network.latencyMs > 120
                  ? `This region is ${network.latencyMs}ms from your nearest data centre`
                  : `Peak load is at ${network.peakLoad}%`}
              </span>
            </div>
          )}

          <div className={css.pctl2}>
            <div className={css.pscrub2}><i style={{ width: `${pos}%` }} /></div>
            <div className={css.prow2}>
              <b style={{ fontFamily: tf.stack }}>{t.title}</b>
              <span className={cx(css.qual, css['q' + (quality.toLowerCase())])}>{quality}</span>
            </div>
          </div>
        </>
      )}
      <button className={css.pexit} onClick={onExit}>✕</button>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/ViewerApp/ViewerApp.module.css */
