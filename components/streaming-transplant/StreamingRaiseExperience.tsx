/**
 * EMPIRE+ v2 — RAISING MONEY
 *
 * The budget is one pot and it is never big enough, so the honest answer is to
 * let the player get more — and then make them live with how they got it.
 *
 * The format is the one that actually exists: a TERM SHEET. Letterhead, parties,
 * a table of terms, a conditions paragraph, a signature block. Everyone has seen
 * one in a film even if they have never signed one, and it carries the weight
 * that a slider labelled "loan amount" never could.
 *
 * Three doors, and the point of each is where the cost turns up LATER:
 *   FOUNDER  costs nothing here and everything if the platform dies — it is the
 *            actor's own money, out of the main game.
 *   DEBT     costs a weekly line in the Boardroom ledger, every week, until it
 *            is repaid. Cheap while you are winning.
 *   EQUITY   costs a slice of the cap table and a chair at your own table, filled
 *            by somebody with an agenda who will vote later.
 */
import css from './presentation/screens/CapitalRaise/CapitalRaise.module.css';
import { cx } from './presentation/cx';
import React, { useMemo, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export type RaiseKind = 'FOUNDER' | 'DEBT' | 'EQUITY';

export interface Raise {
  id: string;
  kind: RaiseKind;
  amount: number;
  /** debt only */
  weeks?: number;
  weekly?: number;
  ratePct?: number;
  /** equity only */
  pct?: number;
  investor?: string;
  agenda?: string;
}

interface Offer {
  id: string; amount: number;
  /** debt */
  weeks?: number; ratePct?: number;
  /** equity */
  preMoney?: number; investor?: string; agenda?: string;
}

export const DEBT_OFFERS: Offer[] = [
  { id: 'd1', amount: 5_000_000, weeks: 26, ratePct: 8 },
  { id: 'd2', amount: 12_000_000, weeks: 39, ratePct: 10 },
  { id: 'd3', amount: 25_000_000, weeks: 52, ratePct: 13 },
];

export const EQUITY_OFFERS: Offer[] = [
  {
    id: 'e1', amount: 10_000_000, preMoney: 120_000_000, investor: 'Northgate Capital',
    agenda: 'Wants a 4K tier inside a year and will vote against anything that delays it.',
  },
  {
    id: 'e2', amount: 25_000_000, preMoney: 140_000_000, investor: 'Bellcourt Partners',
    agenda: 'Believes in cheap growth. Will push for a free tier whether you have an ad server or not.',
  },
  {
    id: 'e3', amount: 50_000_000, preMoney: 165_000_000, investor: 'Ardent Holdings',
    agenda: 'Buys platforms to sell them. Expects an exit conversation by year three.',
  },
];

export const weeklyRepayment = (o: Offer) =>
  Math.round((o.amount * (1 + (o.ratePct ?? 0) / 100)) / (o.weeks ?? 1));

export const weeklyInterestCharge = (o: Offer) =>
  Math.round(o.amount * ((o.ratePct ?? 0) / 100 / 52));

export const equityPct = (o: Offer) =>
  Math.round((o.amount / (o.amount + (o.preMoney ?? 1))) * 1000) / 10;

/* ── what a set of raises adds up to ─────────────────────── */
export interface RaiseTotals {
  cash: number;
  debtWeekly: number;
  debtOutstanding: number;
  equityGiven: number;
  investors: { name: string; pct: number; agenda: string }[];
  founderCash: number;
}
export const totalsOf = (raises: Raise[]): RaiseTotals => ({
  cash: raises.reduce((s, r) => s + r.amount, 0),
  debtWeekly: raises.reduce((s, r) => s + (r.weekly ?? 0), 0),
  debtOutstanding: raises.filter(r => r.kind === 'DEBT').reduce((s, r) => s + r.amount, 0),
  equityGiven: Math.round(raises.reduce((s, r) => s + (r.pct ?? 0), 0) * 10) / 10,
  investors: raises.filter(r => r.kind === 'EQUITY').map(r => ({
    name: r.investor ?? 'Investor', pct: r.pct ?? 0, agenda: r.agenda ?? '',
  })),
  founderCash: raises.filter(r => r.kind === 'FOUNDER').reduce((s, r) => s + r.amount, 0),
});

/* ============================================================
   FORMATTING
   ============================================================ */
const money = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(2)}B`
    : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M`
      : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
  return n < 0 ? `−${s}` : s;
};
const exact = (n: number) => `$${n.toLocaleString('en-US')}`;

const KINDS: { id: RaiseKind; name: string; line: string; cost: string }[] = [
  { id: 'FOUNDER', name: 'Your own money', line: 'Out of the actor’s pocket', cost: 'No dilution, no interest' },
  { id: 'DEBT', name: 'Bank facility', line: 'Borrow it, service interest weekly', cost: 'Principal stays on the balance sheet' },
  { id: 'EQUITY', name: 'Investors', line: 'Sell a piece of the company', cost: 'Ownership and a board seat' },
];

/* ============================================================
   THE SHEET
   ============================================================ */
export const RaiseDesk: React.FC<{
  brand: Brand;
  founderName: string;
  /** what the actor still has liquid in the main game */
  founderAvailable: number;
  raises: Raise[];
  onSign: (r: Raise) => void;
  onClose: () => void;
}> = ({ brand, founderName, founderAvailable, raises, onSign, onClose }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const [kind, setKind] = useState<RaiseKind>('DEBT');
  const [pick, setPick] = useState<string>('d2');

  const t = useMemo(() => totalsOf(raises), [raises]);

  const founderOffers: Offer[] = useMemo(() => {
    const left = Math.max(0, founderAvailable - t.founderCash);
    return [.25, .5, 1].map((f, i) => ({ id: `f${i + 1}`, amount: Math.round(left * f / 100_000) * 100_000 }))
      .filter(o => o.amount > 0);
  }, [founderAvailable, t.founderCash]);

  const offers = kind === 'FOUNDER' ? founderOffers : kind === 'DEBT' ? DEBT_OFFERS : EQUITY_OFFERS;
  const offer = offers.find(o => o.id === pick) ?? offers[0];

  const choose = (k: RaiseKind) => {
    setKind(k);
    const first = k === 'FOUNDER' ? founderOffers[0] : k === 'DEBT' ? DEBT_OFFERS[1] : EQUITY_OFFERS[0];
    if (first) setPick(first.id);
  };

  const sign = () => {
    if (!offer) return;
    const id = `${kind}-${offer.id}-${raises.length + 1}`;
    if (kind === 'DEBT') {
      onSign({
        id, kind, amount: offer.amount, weeks: offer.weeks, ratePct: offer.ratePct,
        weekly: weeklyRepayment(offer),
      });
    } else if (kind === 'EQUITY') {
      onSign({
        id, kind, amount: offer.amount, pct: equityPct(offer),
        investor: offer.investor, agenda: offer.agenda,
      });
    } else {
      onSign({ id, kind, amount: offer.amount });
    }
    onClose();
  };

  const yourStake = Math.max(0, 100 - t.equityGiven);

  return (
    <div className={css.rs} style={{ ['--epx-rs-c' as string]: c}}>
      <div className={css.rstop}>
        <button className={css.rsx} onClick={onClose} aria-label="Close">✕</button>
        <div className={css.rstitle}>
          <b>RAISE CAPITAL</b>
          <span>TERM SHEETS · NOT YET SIGNED</span>
        </div>
        <span className={css.rsmark}><Mark brand={brand} /></span>
      </div>

      {/* what you have already taken, so a second raise is never a surprise */}
      {raises.length > 0 && (
        <div className={css.rsalready}>
          <div><span>RAISED</span><b>{money(t.cash)}</b></div>
          <div><span>WEEKLY SERVICE</span><b className={t.debtWeekly ? css.warn : ''}>{t.debtWeekly ? money(t.debtWeekly) : '—'}</b></div>
          <div><span>YOU OWN</span><b className={yourStake < 75 ? css.warn : ''}>{yourStake.toFixed(1)}%</b></div>
        </div>
      )}

      <div className={css.rsscroll}>
        <div className={css.rskinds}>
          {KINDS.map(k => (
            <button key={k.id} className={cx(css.rsk, (kind === k.id ? css.on : ''))} onClick={() => choose(k.id)}>
              <b>{k.name}</b>
              <span>{k.line}</span>
              <em>{k.cost}</em>
            </button>
          ))}
        </div>

        {offers.length === 0 ? (
          <div className={css.rsempty}>
            You have already put everything you had into this. There is nothing left
            in the actor’s account to move.
          </div>
        ) : (
          <>
            <div className={css.rspicks}>
              {offers.map(o => (
                <button key={o.id} className={cx(css.rspick, (offer?.id === o.id ? css.on : ''))}
                  onClick={() => setPick(o.id)}>
                  <b>{money(o.amount)}</b>
                  <span>
                    {kind === 'DEBT' ? `${o.ratePct}% · ${o.weeks}w`
                      : kind === 'EQUITY' ? `${equityPct(o)}%`
                        : 'your cash'}
                  </span>
                </button>
              ))}
            </div>

            {/* ── the document ── */}
            {offer && (
              <div className={css.sheet}>
                <div className={css.shhead}>
                  <div className={css.shfrom}>
                    <b>
                      {kind === 'DEBT' ? 'MERIDIAN COMMERCIAL BANK'
                        : kind === 'EQUITY' ? (offer.investor ?? '').toUpperCase()
                          : founderName.toUpperCase()}
                    </b>
                    <span>
                      {kind === 'DEBT' ? 'Structured Finance Desk'
                        : kind === 'EQUITY' ? 'Growth Equity'
                          : 'Personal account'}
                    </span>
                  </div>
                  <i className={css.shseal} />
                </div>

                <div className={css.shtitle}>
                  <b>{kind === 'EQUITY' ? 'TERM SHEET' : kind === 'DEBT' ? 'FACILITY LETTER' : 'CAPITAL CONTRIBUTION'}</b>
                  <span>NON-BINDING SUMMARY OF PROPOSED TERMS</span>
                </div>

                <dl className={css.shterms}>
                  <div><dt>Borrower</dt><dd>{brand.name || 'EMPIRE+'}</dd></div>
                  {kind === 'DEBT' && (
                    <>
                      <div><dt>Principal</dt><dd>{exact(offer.amount)}</dd></div>
                      <div><dt>Interest</dt><dd>{offer.ratePct}% per annum, fixed</dd></div>
                      <div><dt>Review window</dt><dd>{offer.weeks} weeks</dd></div>
                      <div className={css.hi}><dt>Weekly interest</dt><dd>{exact(weeklyInterestCharge(offer))}</dd></div>
                      <div><dt>Security</dt><dd>First charge over infrastructure assets</dd></div>
                    </>
                  )}
                  {kind === 'EQUITY' && (
                    <>
                      <div><dt>Investment</dt><dd>{exact(offer.amount)}</dd></div>
                      <div><dt>Pre-money</dt><dd>{money(offer.preMoney ?? 0)}</dd></div>
                      <div><dt>Post-money</dt><dd>{money((offer.preMoney ?? 0) + offer.amount)}</dd></div>
                      <div className={css.hi}><dt>Equity</dt><dd>{equityPct(offer)}% of the company</dd></div>
                      <div className={css.hi}><dt>Governance</dt><dd>One seat on the board</dd></div>
                    </>
                  )}
                  {kind === 'FOUNDER' && (
                    <>
                      <div><dt>Contribution</dt><dd>{exact(offer.amount)}</dd></div>
                      <div><dt>Source</dt><dd>{founderName}, personal funds</dd></div>
                      <div><dt>Equity issued</dt><dd>None</dd></div>
                      <div className={css.hi}><dt>Recourse</dt><dd>None. This money is not coming back.</dd></div>
                    </>
                  )}
                </dl>

                <p className={css.shnote}>
                  {kind === 'DEBT' && (
                    <>Interest service begins the week the facility is drawn whether or not the
                      platform has launched. The principal remains on the balance sheet, and the
                      infrastructure charge makes the lender a continuing company risk.</>
                  )}
                  {kind === 'EQUITY' && (
                    <>{offer.agenda} The seat carries a vote on commissioning, pricing and any
                      sale of the company.</>
                  )}
                  {kind === 'FOUNDER' && (
                    <>No dilution, no interest, no covenant. If the platform dies it dies with
                      your money inside it, and the main game will know.</>
                  )}
                </p>

                <div className={css.shsign}>
                  <div className={css.sigline}>
                    <i />
                    <span>For and on behalf of {brand.name || 'EMPIRE+'}</span>
                    <em>{founderName} · Founder & CEO</em>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className={css.rsspace} />
      </div>

      <div className={css.rsfoot}>
        <button className={css.rscancel} onClick={onClose}>NOT NOW</button>
        <button className={css.rssign} disabled={!offer} onClick={sign}>
          {offer ? `SIGN · ${money(offer.amount)}` : 'NOTHING TO SIGN'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/CapitalRaise/CapitalRaise.module.css */
