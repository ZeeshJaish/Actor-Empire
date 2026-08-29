/* ============================================================================
   PERFORMANCE — what is earning, what is losing, and why.

   Titles are the company's product, so they are drawn as product: ranked cards
   with artwork and a split bar showing how much of the gross the title kept.
   Sources and Markets are one bar each, never a wall of pie charts.

   The header reports whichever lens is open, in whichever window the player
   selected upstairs. It used to state slate figures above a company-wide list
   and explain the mismatch in a caption — a caption apologising for a header is
   a sign the header is wrong, so now it follows the lens instead.
   ========================================================================== */

import { useMemo, useState, type ReactElement } from 'react';
import type { PeriodKey } from '../finance/types';
import type { ResolvedCut } from '../finance/derive';
import { TITLE_STATUS_COPY, marketTotals, periodLabel, rankTitles, sourceShare } from '../finance/derive';
import { compactCount, money, pct, signedPct } from '../finance/format';
import { FlagField, flagAccent } from './FlagField';
import { Poster } from './Poster';
import { Segmented, Tag, TrendChip } from './ui';

type Lens = 'titles' | 'sources' | 'markets';

/* The first tint is the platform's own colour; the rest are a fixed
   categorical set, deliberately unrelated to profit green and loss red. */
const SOURCE_TINTS = ['var(--sf-brand-on)', '#c9a227', '#4b8f8c', '#7a6bb5', '#b06a4a', '#5c6b7a'];

interface Props {
  cut: ResolvedCut;
  period: PeriodKey;
  onOpenTitle: (titleId: string) => void;
  onOpenMarket?: (marketId: string) => void;
}

export function PerformanceView({ cut, period, onOpenTitle, onOpenMarket }: Props) {
  const [lens, setLens] = useState<Lens>('titles');
  const titles = useMemo(() => rankTitles(cut.titles), [cut.titles]);
  const sources = useMemo(() => sourceShare(cut.sources), [cut.sources]);
  const markets = useMemo(() => marketTotals(cut.markets), [cut.markets]);

  const window = periodLabel(period);
  const head = buildHead(lens, { titles, sources, markets, cut, window });

  return (
    <div className="sf-view">
      <section className="sf-perf-head">
        <p className="sf-eyebrow sf-perf-caption">{head.caption}</p>
        <p className="sf-perf-figure">{head.figure}</p>
        {head.bar}
        {/* Labels and values are separate grid rows, not two stacked cells.
            A two-line label next to a one-line label used to push its value
            down a line, and the pair read as broken. Now every label shares
            one row height and every value sits on one baseline, whatever the
            lens puts in them. */}
        <div className="sf-perf-stats">
          {head.stats.map((stat) => (
            <p key={`l-${stat.label}`} className="sf-eyebrow">{stat.label}</p>
          ))}
          {head.stats.map((stat) => (
            <p key={`v-${stat.label}`} className={`sf-perf-stat ${stat.tone ?? ''}`}>{stat.value}</p>
          ))}
        </div>
      </section>

      <Segmented
        ariaLabel="Performance lens"
        variant="line"
        options={[
          { key: 'titles', label: 'Titles' },
          { key: 'sources', label: 'Sources' },
          { key: 'markets', label: 'Markets' },
        ]}
        value={lens}
        onChange={setLens}
      />

      {lens === 'titles' && (
        titles.length ? <ol className="sf-titles">
          {titles.map((title, i) => {
            const status = TITLE_STATUS_COPY[title.totals.status];
            const kept = title.totals.gross > 0
              ? Math.max(0, Math.min(1, title.totals.net / title.totals.gross))
              : 0;
            return (
              <li key={title.id}>
                <button type="button" className="sf-title-card" onClick={() => onOpenTitle(title.id)}>
                  <span className="sf-title-rank">{i + 1}</span>
                  <Poster seed={title.posterSeed ?? title.id} size={46} />
                  <span className="sf-title-body">
                    <span className="sf-title-line">
                      <span className="sf-title-name">{title.name}</span>
                      <span className={`sf-title-net ${title.totals.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}`}>
                        {money(title.totals.net, { sign: true })}
                      </span>
                    </span>
                    <span className="sf-title-meta">
                      {title.format}{title.releasedLabel ? ` · ${title.releasedLabel}` : ''} · {money(title.totals.gross)} gross
                    </span>
                    <span className="sf-split" aria-hidden="true">
                      <i className="sf-split-cost" style={{ width: `${(1 - kept) * 100}%` }} />
                      <i className="sf-split-kept" style={{ width: `${kept * 100}%` }} />
                    </span>
                    <span className="sf-title-foot">
                      <Tag tone={status.tone}>{status.label}</Tag>
                      <TrendChip value={title.trend} label={signedPct(title.trend)} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol> : <p className="sf-empty">No title economics yet. Launch the platform to begin the archive.</p>
      )}

      {lens === 'sources' && (
        sources.length ? <ul className="sf-source-list">
          {sources.map((source, i) => (
            <li key={source.id}>
              <span className="sf-dot" style={{ background: SOURCE_TINTS[i % SOURCE_TINTS.length] }} aria-hidden="true" />
              <span className="sf-source-name">{source.name}</span>
              <span className="sf-source-share">{pct(source.share, 0)}</span>
              <span className="sf-source-amount">{money(source.amount)}</span>
              <span className="sf-source-change">
                {source.change === null ? '—' : <TrendChip value={source.change} label={signedPct(source.change, 0)} />}
              </span>
            </li>
          ))}
        </ul> : <p className="sf-empty">Revenue sources appear after the first settlement.</p>
      )}

      {lens === 'markets' && (
        markets.length ? <ul className="sf-terrs">
          {markets.map((market, i) => {
            const status = marketStatus(market, i === 0);
            const body = (
              <>
                {/* The flag is the card's header, the way a passport stamp or a
                    market dossier would carry it — not a badge, and not a
                    backdrop for numbers. Everything numeric lives below it on
                    flat surface. */}
                <span className="sf-terr-band" aria-hidden="true">
                  <FlagField code={market.code} src={market.flagSrc} variant="band" />
                  <span className="sf-terr-grain" />
                  <span className="sf-terr-glow" />
                  <span className="sf-terr-shade" />
                  <span className="sf-terr-sheen" />
                  {/* The rank as a chart position: outlined, oversized, cropped
                      by the card edge. */}
                  <span className="sf-terr-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`sf-terr-badge sf-tone-${status.tone}`}>{status.label}</span>
                  {/* Lower-third: the name sits on a plate that overlaps the
                      band instead of floating on the artwork. */}
                  <span className="sf-terr-plate">
                    <span className="sf-terr-tag">{market.code}</span>
                    <span className="sf-terr-name">{market.name}</span>
                  </span>
                </span>

                <span className="sf-terr-data">
                  <span className="sf-terr-money">
                    <span className="sf-terr-rev">{money(market.revenue)}</span>
                    <span className="sf-terr-subs">
                      {typeof market.subscribers === 'number' ? `${compactCount(market.subscribers)} subscribers` : 'Revenue this window'}
                    </span>
                  </span>
                  <span className="sf-terr-stats">
                    <span>
                      <em>Net</em>
                      <b className={market.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}>{money(market.net, { sign: true })}</b>
                    </span>
                    <span>
                      <em>Margin</em>
                      <b className={market.margin >= 0 ? '' : 'sf-tone-bad'}>{pct(market.margin, 0)}</b>
                    </span>
                    <span>
                      <em>Trend</em>
                      <b><TrendChip value={market.trend} label={signedPct(market.trend, 0)} /></b>
                    </span>
                  </span>
                </span>

                <span className="sf-terr-share">
                  <span className="sf-terr-sharebar" aria-hidden="true"><i style={{ width: `${market.share}%` }} /></span>
                  <span className="sf-terr-sharelabel">{pct(market.share, 0)} of revenue</span>
                </span>
              </>
            );

            return (
              <li
                key={market.id}
                className={`sf-terr is-${status.tone}${i === 0 ? ' is-lead' : ''}`}
                style={{
                  ['--terr-accent' as string]: flagAccent(market.code) ?? 'var(--sf-brand-on)',
                  ['--i' as string]: i,
                }}
              >
                {onOpenMarket
                  ? <button type="button" className="sf-terr-face" onClick={() => onOpenMarket(market.id)}>{body}</button>
                  : <span className="sf-terr-face">{body}</span>}
              </li>
            );
          })}
        </ul> : <p className="sf-empty">Regional books will appear when the simulation records territory-level settlements.</p>
      )}

    </div>
  );
}

/* --- one word for how a territory is doing ---------------------------------- */

function marketStatus(
  market: { net: number; trend: number; margin: number },
  isLargest: boolean,
): { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' } {
  if (market.net < 0) return { label: 'Losing money', tone: 'bad' };
  if (market.trend >= 20) return { label: 'Surging', tone: 'good' };
  if (isLargest) return { label: 'Strongest', tone: 'good' };
  if (market.trend < 0) return { label: 'Slipping', tone: 'warn' };
  if (market.margin < 8) return { label: 'Thin margin', tone: 'warn' };
  return { label: 'Growing', tone: 'flat' };
}

/* --- the header, per lens ---------------------------------------------------- */

interface Head {
  caption: string;
  figure: string;
  bar: ReactElement | null;
  stats: Array<{ label: string; value: string; tone?: string }>;
}

function buildHead(
  lens: Lens,
  input: {
    titles: ReturnType<typeof rankTitles>;
    sources: ReturnType<typeof sourceShare>;
    markets: ReturnType<typeof marketTotals>;
    cut: ResolvedCut;
    window: string;
  },
): Head {
  const { titles, sources, markets, cut, window } = input;

  if (lens === 'titles') {
    const gross = titles.reduce((sum, t) => sum + t.totals.gross, 0);
    const cost = titles.reduce((sum, t) => sum + t.totals.cost, 0);
    const kept = gross - cost;
    const keptShare = gross > 0 ? kept / gross : 0;
    return {
      caption: `The slate · ${cut.windowed.titles ? window : 'lifetime'}`,
      figure: money(gross),
      /* The same grammar the title cards use below: hatched is what it cost,
         solid is what the company kept. */
      bar: (
        <span className="sf-split sf-split--head" aria-hidden="true">
          <i className="sf-split-cost" style={{ width: `${(1 - keptShare) * 100}%` }} />
          <i className="sf-split-kept" style={{ width: `${keptShare * 100}%` }} />
        </span>
      ),
      stats: [
        { label: 'Cost', value: money(cost), tone: 'sf-tone-bad' },
        { label: 'Kept', value: `${money(kept)} · ${pct(keptShare * 100, 0)}`, tone: kept >= 0 ? 'sf-tone-good' : 'sf-tone-bad' },
      ],
    };
  }

  if (lens === 'sources') {
    const total = sources.reduce((sum, s) => sum + s.amount, 0);
    const compared = sources.filter((s) => typeof s.prior === 'number');
    const prior = compared.reduce((sum, s) => sum + (s.prior as number), 0);
    /* No prior figures, or a prior so small it can only be missing history:
       say nothing rather than print a percentage that is an artefact. */
    const change = compared.length === sources.length && prior > total * 0.2
      ? ((total - prior) / prior) * 100
      : null;
    const top = sources[0];
    return {
      caption: `Company revenue · ${cut.windowed.sources ? window : 'lifetime'}`,
      figure: money(total),
      bar: (
        <span className="sf-stack" role="img" aria-label="Revenue by source">
          {sources.map((source, i) => (
            <i key={source.id} style={{ width: `${source.share}%`, background: SOURCE_TINTS[i % SOURCE_TINTS.length] }} />
          ))}
        </span>
      ),
      /* The name rides in the label and the number in the value, so neither
         wraps at 375px — a stat that wraps is a stat nobody reads. */
      stats: [
        { label: top ? `Largest · ${top.name}` : 'Largest stream', value: top ? pct(top.share, 0) : '—' },
        change === null
          ? { label: 'Versus prior window', value: 'No history' }
          : { label: 'Versus prior window', value: signedPct(change), tone: change >= 0 ? 'sf-tone-good' : 'sf-tone-bad' },
      ],
    };
  }

  const revenue = markets.reduce((sum, m) => sum + m.revenue, 0);
  const net = markets.reduce((sum, m) => sum + m.net, 0);
  const best = [...markets].sort((a, b) => b.net - a.net)[0];
  const worst = [...markets].sort((a, b) => a.net - b.net)[0];
  return {
    caption: `Territories · ${cut.windowed.markets ? window : 'lifetime'}`,
    figure: money(revenue),
    bar: (
      <span className="sf-stack" role="img" aria-label="Revenue by territory">
        {markets.map((market, i) => (
          <i key={market.id} style={{ width: `${market.share}%`, background: SOURCE_TINTS[i % SOURCE_TINTS.length] }} />
        ))}
      </span>
    ),
    stats: [
      { label: 'Net result', value: money(net, { sign: true }), tone: net >= 0 ? 'sf-tone-good' : 'sf-tone-bad' },
      worst && worst.net < 0
        ? { label: `Losing · ${worst.code}`, value: money(worst.net, { sign: true }), tone: 'sf-tone-bad' }
        : { label: best ? `Strongest · ${best.code}` : 'Strongest', value: best ? money(best.net, { sign: true }) : '—', tone: 'sf-tone-good' },
    ],
  };
}
