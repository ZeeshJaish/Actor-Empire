/**
 * EMPIRE+ v2 — TITLE DOSSIER
 *
 * The operator's view of a single title, opened from the HQ service rail, the
 * Content Desk library or the Audience chart. It deliberately mirrors the
 * production house's project dossier so both halves of the company read the
 * same way — the substance is what changes.
 *
 * The two numbers a film can never have are SUBS ACQUIRED and CHURN PREVENTED.
 * That is the streaming business in two figures: a title earns by making
 * someone join, and by stopping someone leaving.
 */
import css from './presentation/screens/TitleDossier/TitleDossier.module.css';
import { cx } from './presentation/cx';
import React, { useMemo } from 'react';
import { Brand, Mark, brandColor, brandDeep, typeFace } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export interface DnaAxis { label: string; value: number }   // 0-100

export interface DossierTitle {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED';
  format: string;                 // Film | Series | Collection
  genre: string;
  hue: number;
  logline: string;
  status: string;                 // ON THE SERVICE / IN PRODUCTION / …
  chartRank?: number;
  rating?: number;
  rightsWeeksLeft?: number;

  viewers: number;
  completion: number;             // %
  subsAcquired: number;
  churnPrevented: number;
  revenue: number;
  cost: number;
  /** where the views came from, as percentages */
  sources: { label: string; pct: number }[];

  /** how far through the lifecycle, and the step names */
  journey: { steps: string[]; at: number };
  dna: DnaAxis[];
  artwork: { id: string; hue: number; ctr: number; live: boolean }[];
  press: { id: string; tag: string; source: string; head: string; body: string }[];
  /** series only — completion by episode, so you see where people quit */
  dropOff?: { ep: number; pct: number }[];
  /** weeks of data so far, and how many before the number settles */
  maturity: { have: number; need: number };
}

const money = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M`
    : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${a}`;
  return n < 0 ? `−${s}` : s;
};
const count = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;

/* ============================================================
   THE DOSSIER
   ============================================================ */
export const TitleDossier: React.FC<{
  brand: Brand;
  t: DossierTitle;
  onClose: () => void;
  onAction?: (id: string) => void;
}> = ({ brand, t, onClose, onAction }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const tf = typeFace(brand);
  const margin = t.revenue - t.cost;
  const marginPct = t.cost > 0 ? Math.round((margin / t.cost) * 100) : 0;
  const settled = t.maturity.have >= t.maturity.need;

  return (
    <div className={css.dos} style={{ ['--epx-dos-c' as string]: c, ['--epx-dos-h' as string]: `${t.hue}` }}>
      <button className={css.dosx} onClick={onClose} aria-label="Close">✕</button>

      <div className={css.dosscroll}>
        {/* ── header ── */}
        <div className={css.doshead}>
          <div className={css.dospills}>
            <span className={cx(css.dp, css.on)}>{t.status}</span>
            {t.chartRank && <span className={cx(css.dp, css.chart)}>TOP 10 · #{t.chartRank}</span>}
            {t.rating !== undefined && <span className={cx(css.dp, css.rate)}>★ {t.rating.toFixed(1)}</span>}
            {t.rightsWeeksLeft !== undefined && (
              <span className={cx(css.dp, css.rights, (t.rightsWeeksLeft <= 4 ? css.soon : ''))}>
                RIGHTS EXPIRE IN {t.rightsWeeksLeft}W
              </span>
            )}
          </div>
          <div className={css.dosghost} style={{ fontFamily: tf.stack }}>{t.title}</div>
          <h1 className={css.dostitle}>{t.title}</h1>
          <div className={css.dossub}>
            {t.kind === 'ORIGINAL' ? 'ORIGINAL' : 'LICENSED'} {t.format.toUpperCase()} · {t.genre.toUpperCase()}
          </div>
        </div>

        <div className={css.dosbody}>
          {/* ── summary ── */}
          <div className={css.seclab}><i />EXECUTIVE SUMMARY</div>
          <p className={css.doslog}>{t.logline}</p>

          {/* ── the numbers ── */}
          <div className={css.dgrid}>
            <Cell label="VIEWERS" value={count(t.viewers)} note="accounts that started it" />
            <Cell label="COMPLETION" value={`${t.completion}%`} tone="good" note="finished it" />
            <Cell label="SUBS ACQUIRED" value={count(t.subsAcquired)} tone="brand" note="joined for this title" />
            <Cell label="CHURN PREVENTED" value={count(t.churnPrevented)} tone="brand" note="stayed because of it" />
            <Cell label="REVENUE CONTRIBUTION" value={money(t.revenue)} tone="good" />
            <Cell label="COST" value={money(t.cost)} tone="bad" />
            <Cell label="CONTRIBUTION MARGIN" value={`${marginPct > 0 ? '+' : ''}${marginPct}%`}
              tone={marginPct >= 0 ? 'good' : 'bad'} note={money(margin)} />
            <div className={cx(css.dcell, css.wide)}>
              <span>WHERE THEY CAME FROM</span>
              <div className={css.srclist}>
                {t.sources.map(s => (
                  <div className={css.srcrow} key={s.label}>
                    <em>{s.label}</em><b>{s.pct}%</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── maturity ── */}
          <div className={cx(css.maturity, (settled ? css.done : ''))}>
            <i />
            {settled
              ? `Performance settled · ${t.maturity.have} weeks of data`
              : `Performance still settling · ${t.maturity.have} of ${t.maturity.need} weeks of data`}
          </div>

          {/* ── journey ── */}
          <div className={css.jcard}>
            <div className={css.jhead}>
              <b>PERFORMANCE JOURNEY</b>
              <span>{t.journey.at} / {t.journey.steps.length}</span>
            </div>
            <div className={css.jsteps}>
              {t.journey.steps.map((s, n) => (
                <div className={cx(css.jstep, (n < t.journey.at ? css.done : ''), (n === t.journey.at ? css.now : ''))} key={s}>
                  <i />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── DNA ── */}
          <div className={css.dnacard}>
            <div className={cx(css.seclab, css.brandline)}><i />TITLE DNA</div>
            <Radar axes={t.dna} color={c} />
            <p className={css.dnanote}>{dnaRead(t.dna)}</p>
          </div>

          {/* ── episode drop-off, series only ── */}
          {t.dropOff && (
            <div className={css.dropcard}>
              <div className={css.seclab}><i />WHERE THEY QUIT</div>
              <div className={css.dropbars}>
                {t.dropOff.map(d => (
                  <div className={css.dropbar} key={d.ep}>
                    <div className={css.dbar}><i style={{ height: `${d.pct}%` }} /></div>
                    <span>{d.ep}</span>
                    <em>{d.pct}%</em>
                  </div>
                ))}
              </div>
              <p className={css.dnanote}>{dropRead(t.dropOff)}</p>
            </div>
          )}

          {/* ── artwork ── */}
          <div className={css.artcard}>
            <div className={css.seclab}><i />ARTWORK</div>
            <div className={css.artrow}>
              {t.artwork.map(a => (
                <div className={cx(css.artopt, (a.live ? css.live : ''))} key={a.id} style={{ ['--epx-dos-ah' as string]: `${a.hue}` }}>
                  <div className={css.artthumb}><span style={{ fontFamily: tf.stack }}>{t.title}</span></div>
                  <b>{a.ctr.toFixed(1)}%</b>
                  <span>{a.live ? 'LIVE' : 'VARIANT'} · click-through</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── actions ── */}
          <div className={css.dosacts}>
            {t.kind === 'ORIGINAL' ? (
              <>
                <button className={cx(css.dact, css.primary)} onClick={() => onAction?.('renew')}>
                  {t.format === 'Series' ? 'RENEW FOR SEASON 2' : 'DEVELOP A SEQUEL'}
                </button>
                <div className={css.actnote}>Audience response window: 4 weeks remaining.</div>
                <button className={css.dact} onClick={() => onAction?.('spinoff')}>COMMISSION A SPIN-OFF</button>
                <button className={css.dact} onClick={() => onAction?.('licence')}>LICENCE IT OUT</button>
              </>
            ) : (
              <>
                <button className={cx(css.dact, css.primary)} onClick={() => onAction?.('renew-rights')}>RENEW THE RIGHTS</button>
                <button className={cx(css.dact, css.danger)} onClick={() => onAction?.('lapse')}>LET IT LAPSE</button>
              </>
            )}
            <button className={css.dact} onClick={() => onAction?.('artwork')}>CHANGE ARTWORK</button>
            <button className={css.dact} onClick={() => onAction?.('hero')}>PUT ON HOMEPAGE HERO</button>
          </div>

          {/* ── press ── */}
          <div className={css.seclab}><i />PRESS &amp; CHATTER</div>
          {t.press.map(p => (
            <div className={css.presscard} key={p.id}>
              <div className={css.ptop}><span className={css.ptag}>{p.tag}</span><em>{p.source}</em></div>
              <b>{p.head}</b>
              <p>{p.body}</p>
            </div>
          ))}

          <div className={css.dosfoot} />
        </div>
      </div>
    </div>
  );
};

const Cell: React.FC<{ label: string; value: string; tone?: string; note?: string }> = ({ label, value, tone, note }) => (
  <div className={css.dcell}>
    <span>{label}</span>
    <b className={tone ? css[tone] ?? '' : ''}>{value}</b>
    {note && <em>{note}</em>}
  </div>
);

/** A five-axis radar. The shape says what kind of hit it is. */
const Radar: React.FC<{ axes: DnaAxis[]; color: string }> = ({ axes, color }) => {
  const n = axes.length, R = 58, cx = 120, cy = 90;
  const pt = (i: number, r: number) => {
    const a = (-90 + (i / n) * 360) * (Math.PI / 180);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const ring = (f: number) => axes.map((_, i) => pt(i, R * f).map(v => v.toFixed(1)).join(',')).join(' ');
  const shape = axes.map((ax, i) => pt(i, R * (ax.value / 100)).map(v => v.toFixed(1)).join(',')).join(' ');
  return (
    <svg className={css.radar} viewBox="0 0 240 180">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#fff" strokeOpacity=".08" strokeWidth="1" />;
      })}
      <polygon points={shape} fill={color} fillOpacity=".34" stroke={color} strokeWidth="2"
        strokeLinejoin="round" />
      {axes.map((ax, i) => {
        const [x, y] = pt(i, R + 16);
        return (
          <text key={ax.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="#8b93a5" fontSize="8.5" fontWeight="700">{ax.label}</text>
        );
      })}
    </svg>
  );
};

/** Reads the radar's shape back in words, so the chart is never just decoration. */
const dnaRead = (dna: DnaAxis[]) => {
  const get = (k: string) => dna.find(d => d.label.toLowerCase().startsWith(k))?.value ?? 0;
  const reach = get('reach'), comp = get('comp'), acq = get('acq'), ret = get('ret');
  if (reach >= 70 && comp < 45) return 'Wide and shallow — everyone opened it and most of them left. Big number, weak title.';
  if (reach < 50 && comp >= 70) return 'Narrow and deep — a small audience finished it, and rewatched. This is what a season two is for.';
  if (acq >= 65) return 'People joined for this. It pays for itself in signups before it earns a penny in watch time.';
  if (ret >= 65) return 'It does not win new subscribers, it keeps the ones you have. Quiet, and worth more than it looks.';
  return 'A steady performer with no sharp edges — it neither wins nor loses subscribers on its own.';
};

const dropRead = (d: { ep: number; pct: number }[]) => {
  let worst = 0, at = 0;
  for (let i = 1; i < d.length; i++) {
    const fall = d[i - 1].pct - d[i].pct;
    if (fall > worst) { worst = fall; at = d[i].ep; }
  }
  return worst >= 12
    ? `The audience walks at episode ${at} — ${worst} points lost in one step. That is where the season breaks.`
    : 'No single episode loses the audience. The season holds together.';
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/TitleDossier/TitleDossier.module.css */
