/**
 * EMPIRE+ v2 — THE LIVE QUOTE
 *
 * The last screen of the listing says: "the price is now on your desk, and
 * every decision you make from here moves it." Until this file existed that
 * was a promise the game did not keep — the listing closed, printed a final
 * number, and nothing ever moved it again.
 *
 * So the quote is DERIVED, never stored. It is the closing price on listing
 * day, re-rated by what the company has actually done since:
 *
 *   subscribers   growth against the book you sold them
 *   churn         the single thing the market punishes hardest
 *   treasury      runway; a company burning its float gets marked down
 *   platform      carried technical debt is a discount, always
 *   marks         everything you forced through in Act I, still on the record
 *
 * That means it cannot ever disagree with the rest of the game, because it is
 * computed from the same numbers the rest of the game is showing.
 */
import css from './presentation/screens/LiveQuote/LiveQuote.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useRef, useState } from 'react';

export interface QuoteInputs {
  /** where it closed on the first day — the baseline everything is measured from */
  closePrice: number;
  /** subscribers at listing, and now */
  subsAtListing: number;
  subs: number;
  churnPct: number;
  techDebt: number;
  treasury: number;
  /** weekly burn, so runway can be priced */
  weeklyNet: number;
  /** objections forced through before filing — the market has a long memory */
  marks: number;
}

export interface Quote {
  price: number;
  /** move against listing-day close */
  pct: number;
  /** what is actually driving it, worst first — shown when you tap the bug */
  drivers: { label: string; pct: number }[];
}

export const quoteOf = (q: QuoteInputs): Quote => {
  const drivers: { label: string; pct: number }[] = [];
  const add = (label: string, pct: number) => { if (Math.abs(pct) >= .15) drivers.push({ label, pct }); };

  /* growth against the story you sold */
  const growth = q.subsAtListing > 0 ? (q.subs / q.subsAtListing - 1) : 0;
  const growthPct = growth * 145;
  add(growth >= 0 ? 'Subscriber growth' : 'Subscriber losses', growthPct);

  /* churn is priced against the 3% the market treats as normal */
  const churnPct = -(q.churnPct - 3) * 7.5;
  add(q.churnPct > 3 ? 'Churn above peers' : 'Churn below peers', churnPct);

  /* runway: under ten weeks and it starts to hurt */
  const weeks = q.weeklyNet < 0 ? q.treasury / Math.abs(q.weeklyNet) : 99;
  const runwayPct = weeks >= 26 ? 1.5 : weeks >= 10 ? 0 : -(10 - weeks) * 2.6;
  add(weeks < 10 ? 'Runway concern' : 'Balance sheet', runwayPct);

  /* the platform discount never fully goes away */
  const debtPct = -(q.techDebt / 100) * 9;
  add('Platform risk', debtPct);

  /* and what you forced through is still in the filing */
  const markPct = -q.marks * 3.4;
  add('Governance on the record', markPct);

  const total = growthPct + churnPct + runwayPct + debtPct + markPct;
  const price = Math.max(.5, q.closePrice * (1 + total / 100));
  drivers.sort((a, b) => a.pct - b.pct);
  return { price, pct: total, drivers };
};

/* ============================================================
   THE BUG — small, permanent, and it flashes when the number moves
   ============================================================ */
export const StockBug: React.FC<{
  ticker: string; quote: Quote; onOpen?: () => void;
}> = ({ ticker, quote, onOpen }) => {
  const [flash, setFlash] = useState<'' | 'u' | 'd'>('');
  const prev = useRef(quote.price);

  useEffect(() => {
    if (Math.abs(quote.price - prev.current) < .005) return;
    setFlash(quote.price > prev.current ? 'u' : 'd');
    prev.current = quote.price;
    const id = window.setTimeout(() => setFlash(''), 900);
    return () => clearTimeout(id);
  }, [quote.price]);

  const up = quote.pct >= 0;
  return (
    <button className={cx(css.stbug, up ? css.u : css.d, flash ? css['f' + flash] : '')} data-epx-root onClick={onOpen}>
      <span>{ticker}</span>
      <b>${quote.price.toFixed(2)}</b>
      <em>{up ? '▲' : '▼'}{Math.abs(quote.pct).toFixed(1)}%</em>
    </button>
  );
};

/* ============================================================
   THE PANEL — why it is where it is
   ============================================================ */
export const StockPanel: React.FC<{
  ticker: string; quote: Quote; closePrice: number; onClose: () => void;
}> = ({ ticker, quote, closePrice, onClose }) => (
  <div className={css.stwrap} data-epx-root onClick={onClose}>
    <div className={css.stcard} onClick={e => e.stopPropagation()}>
      <div className={css.sthead}>
        <div><b>{ticker}</b><span>ORDINARY SHARES</span></div>
        <div className={cx(css.stnow, quote.pct >= 0 ? css.u : css.d)}>
          <b>${quote.price.toFixed(2)}</b>
          <em>{quote.pct >= 0 ? '+' : '−'}{Math.abs(quote.pct).toFixed(1)}%</em>
        </div>
      </div>
      <p className={css.stsince}>
        Against ${closePrice.toFixed(2)}, where it closed on its first day of trading.
      </p>
      <span className={css.stlabel}>WHAT IS MOVING IT</span>
      <div className={css.stdrivers}>
        {quote.drivers.map(d => (
          <div className={cx(css.stdriver, d.pct >= 0 ? css.u : css.d)} key={d.label}>
            <b>{d.label}</b>
            <i><u style={{ width: `${Math.min(100, Math.abs(d.pct) * 4)}%` }} /></i>
            <em>{d.pct >= 0 ? '+' : '−'}{Math.abs(d.pct).toFixed(1)}%</em>
          </div>
        ))}
        {quote.drivers.length === 0 && (
          <p className={css.stflat}>Nothing has moved since it listed.</p>
        )}
      </div>
      <button className={css.stclose} onClick={onClose}>CLOSE</button>
    </div>
  </div>
);

/* Styles now live in presentation/screens/LiveQuote/LiveQuote.module.css */
