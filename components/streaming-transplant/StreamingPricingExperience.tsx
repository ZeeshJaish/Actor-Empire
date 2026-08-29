/**
 * EMPIRE+ v2 — HOW YOU GET PAID
 *
 * The pricing page is the most-seen screen in streaming: three or four columns,
 * ticks down the side, one highlighted. Everybody has stood in front of one and
 * chosen. Here the player is on the other side of it — building the thing they
 * have always only picked from.
 *
 * Two gates, and they do different jobs:
 *   MODEL         decides which columns are allowed to exist at all.
 *                 Ad-supported means the free column and nothing else; subscription
 *                 means the paid ones; both means the whole table.
 *   CAPABILITIES  decide which of those columns you can actually deliver. A Family
 *                 plan is a promise of simultaneous streams — without profiles and
 *                 devices built, selling it would be a lie. So the column is drawn,
 *                 greyed, with what it needs written where the price should be.
 *
 * And the cruel link back to the servers: free viewers are still viewers. The
 * ad tier multiplies the crowd on premiere night without multiplying the halls.
 */
import css from './presentation/screens/Pricing/Pricing.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useMemo, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */

export type ModelId = 'ADS' | 'SUBS' | 'BOTH';
export type TierId = 'FREE' | 'BASIC' | 'STANDARD' | 'PREMIUM';
export type CapId = 'adserver' | 'profiles' | 'uhd';

export type Capabilities = Record<CapId, boolean>;

export const CAP_LABEL: Record<CapId, string> = {
  adserver: 'Ad server',
  profiles: 'Profiles & devices',
  uhd: 'Playback quality III',
};

interface Tier {
  id: TierId; name: string; blurb: string;
  /** what the column promises, which is also what it has to be able to deliver */
  features: string[];
  needs: CapId[];
  paid: boolean;
  min: number; max: number; step: number;
}

export const TIERS: Tier[] = [
  {
    id: 'FREE', name: 'Free', blurb: 'Ad-supported', paid: false,
    features: ['1 stream', 'HD 1080p', 'Ads before and during'],
    needs: ['adserver'], min: 0, max: 0, step: 0,
  },
  {
    id: 'BASIC', name: 'Basic', blurb: 'One person, no ads', paid: true,
    features: ['1 stream', 'HD 1080p', 'No ads'],
    needs: [], min: 3, max: 14, step: 1,
  },
  {
    id: 'STANDARD', name: 'Standard', blurb: 'Two screens at once', paid: true,
    features: ['2 streams', 'Full HD', 'Downloads', 'No ads'],
    needs: ['profiles'], min: 6, max: 22, step: 1,
  },
  {
    id: 'PREMIUM', name: 'Premium', blurb: 'The whole household', paid: true,
    features: ['4 streams', '4K HDR', 'Spatial audio', 'Downloads'],
    needs: ['profiles', 'uhd'], min: 10, max: 32, step: 1,
  },
];

export interface PricingSel {
  model: ModelId;
  on: Record<TierId, boolean>;
  price: Record<TierId, number>;
}

export const defaultPricing = (): PricingSel => ({
  model: 'SUBS',
  on: { FREE: false, BASIC: true, STANDARD: true, PREMIUM: false },
  price: { FREE: 0, BASIC: 6, STANDARD: 11, PREMIUM: 17 },
});

/** what a free viewer is worth in a month, against $6–$17 for a paying one */
const AD_ARPU = 3.2;
/** the cheapest a rival opens at — the number your Basic column is judged against */
export const RIVAL_ENTRY = 6.99;

const tierOf = (id: TierId) => TIERS.find(t => t.id === id)!;

/** "a", "a and b", "a, b and c" — three "and"s in a row reads like a fault */
const listOf = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '')
    : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** a column the chosen model does not allow simply is not on the table */
export const allowedByModel = (t: Tier, model: ModelId) =>
  model === 'ADS' ? !t.paid : model === 'SUBS' ? t.paid : true;

export const isLocked = (t: Tier, caps: Capabilities) => t.needs.some(n => !caps[n]);

/* ============================================================
   DERIVED
   ============================================================ */
export interface TierView {
  tier: Tier; on: boolean; price: number;
  allowed: boolean; locked: boolean; missing: CapId[];
  /** share of subscribers who land on this plan */
  share: number;
}
export interface PricingDerived {
  views: TierView[];
  sellable: TierView[];
  /** blended monthly revenue per subscriber, ads included */
  arpu: number;
  /** how much bigger the crowd is than a plain paid-only launch */
  reachMul: number;
  adShare: number;
  entryPrice: number | null;
  problems: string[];
}

export function derivePricing(sel: PricingSel, caps: Capabilities): PricingDerived {
  const views: TierView[] = TIERS.map(tier => {
    const allowed = allowedByModel(tier, sel.model);
    const missing = tier.needs.filter(n => !caps[n]);
    const locked = missing.length > 0;
    return {
      tier, allowed, locked, missing,
      on: sel.on[tier.id] && allowed && !locked,
      price: sel.price[tier.id],
      share: 0,
    };
  });

  const sellable = views.filter(v => v.on);
  const free = sellable.find(v => !v.tier.paid);
  const paid = sellable.filter(v => v.tier.paid);

  /* Free takes most of the room when it exists, because free always does. The
     paid plans then split what is left, cheaper ones taking more. */
  let freeShare = 0;
  if (free) freeShare = paid.length ? .55 : 1;
  const weights = paid.map(v => 1 / Math.pow(Math.max(1, v.price), .9));
  const wSum = weights.reduce((s, w) => s + w, 0) || 1;
  paid.forEach((v, i) => { v.share = (1 - freeShare) * (weights[i] / wSum); });
  if (free) free.share = freeShare;

  const arpu = sellable.reduce((s, v) => s + v.share * (v.tier.paid ? v.price : AD_ARPU), 0);

  /* free viewers are still viewers, and dear plans keep people away */
  const modelMul = free ? (paid.length ? 1.9 : 2.6) : 1;
  const avgPaid = paid.length ? paid.reduce((s, v) => s + v.price, 0) / paid.length : 0;
  const priceMul = paid.length
    ? Math.max(.7, Math.min(1.2, 1.25 - avgPaid / 40))
    : 1;
  const reachMul = modelMul * priceMul;

  const entry = paid.length ? Math.min(...paid.map(v => v.price)) : null;

  const problems: string[] = [];
  if (!sellable.length) {
    problems.push('Nothing is on sale. Nobody can subscribe to a platform with no plans.');
  }
  if (free && !paid.length) {
    problems.push(`Every viewer costs you bandwidth and pays you $${AD_ARPU.toFixed(2)} a month. There is no plan anyone can upgrade to.`);
  }
  if (paid.length === 1 && !free) {
    problems.push('One plan only. Nobody can share an account, so households will buy one seat or none.');
  }
  if (entry !== null && entry > RIVAL_ENTRY + 2) {
    problems.push(`Your cheapest plan is $${entry.toFixed(2)}. Rivals open at $${RIVAL_ENTRY.toFixed(2)} — you are the expensive one before anybody has watched anything.`);
  }
  const lockedButAllowed = views.filter(v => v.allowed && v.locked);
  if (lockedButAllowed.length) {
    problems.push(`${listOf(lockedButAllowed.map(v => v.tier.name))} cannot be sold until engineering builds ${listOf([...new Set(lockedButAllowed.flatMap(v => v.missing))].map(c => CAP_LABEL[c]))}.`);
  }

  return { views, sellable, arpu, reachMul, adShare: freeShare, entryPrice: entry, problems };
}

/* ============================================================
   FORMATTING
   ============================================================ */
const dollars = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

const MODELS: { id: ModelId; name: string; line: string; note: string }[] = [
  { id: 'ADS', name: 'Ad-supported', line: 'Free to watch. You sell the attention.', note: 'Most people, least money each' },
  { id: 'SUBS', name: 'Subscription', line: 'Pay every month. Nothing interrupts.', note: 'Fewest people, most money each' },
  { id: 'BOTH', name: 'Both', line: 'A free door and a paid room.', note: 'Most money, most machinery' },
];

/* ============================================================
   THE PAGE
   ============================================================ */
export const PricingDesk: React.FC<{
  brand: Brand;
  sel: PricingSel;
  caps: Capabilities;
  /** what the halls can carry, so the free-tier trap can be stated in real numbers */
  ceiling?: number;
  expectedLikely?: number;
  onChange: (s: PricingSel) => void;
  onClose: () => void;
}> = ({ brand, sel, caps, ceiling, expectedLikely, onChange, onClose }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const d = useMemo(() => derivePricing(sel, caps), [sel, caps]);
  const [detail, setDetail] = useState(false);

  const setModel = (model: ModelId) => onChange({ ...sel, model });
  const toggle = (id: TierId) => onChange({ ...sel, on: { ...sel.on, [id]: !sel.on[id] } });
  const nudge = (id: TierId, by: number) => {
    const t = tierOf(id);
    const v = Math.max(t.min, Math.min(t.max, sel.price[id] + by));
    onChange({ ...sel, price: { ...sel.price, [id]: v } });
  };

  return (
    <div className={css.pr} data-epx-root style={brandVars(brand)}>
      <div className={css.prtop}>
        <button className={css.prx} onClick={onClose} aria-label="Close">✕</button>
        <div className={css.prtitle}>
          <b>HOW YOU GET PAID</b>
          <span>BUSINESS MODEL · PLANS · PRICE</span>
        </div>
        <span className={css.prmark}><Mark brand={brand} /></span>
      </div>

      <div className={css.prscroll}>

        {/* ── the model decides which columns may exist ── */}
        <section className={css.prsec}>
          <div className={css.prhead}><h2>The model</h2></div>
          <div className={css.models}>
            {MODELS.map(m => (
              <button key={m.id} className={cx(css.mod, (sel.model === m.id ? css.on : ''))}
                onClick={() => setModel(m.id)}>
                <b>{m.name}</b>
                <span>{m.line}</span>
                <em>{m.note}</em>
              </button>
            ))}
          </div>
        </section>

        {/* ── the table everybody has stood in front of ── */}
        <section className={css.prsec}>
          <div className={css.prhead}>
            <h2>Your plans</h2>
            <span>{d.sellable.length} on sale</span>
          </div>

          <div className={css.plans}>
            {d.views.filter(v => v.allowed).map(v => (
              <div key={v.tier.id}
                className={cx(css.plan, (v.on ? css.on : ''), (v.locked ? css.locked : ''), (!v.tier.paid ? css.free : ''))}>
                <div className={css.plantop}>
                  <b>{v.tier.name}</b>
                  <span>{v.tier.blurb}</span>
                </div>

                {v.locked ? (
                  /* the whole point of the lock: you can see the plan you cannot sell */
                  <div className={css.planlock}>
                    <i className={css.lockglyph}>🔒</i>
                    <span>NEEDS</span>
                    {v.missing.map(m => <em key={m}>{CAP_LABEL[m]}</em>)}
                  </div>
                ) : (
                  <div className={css.planprice}>
                    {v.tier.paid ? (
                      <>
                        <div className={css.pricerow}>
                          <button onClick={() => nudge(v.tier.id, -v.tier.step)}
                            disabled={v.price <= v.tier.min} aria-label="Cheaper">−</button>
                          <b>{dollars(v.price)}</b>
                          <button onClick={() => nudge(v.tier.id, v.tier.step)}
                            disabled={v.price >= v.tier.max} aria-label="Dearer">+</button>
                        </div>
                        <span className={css.permo}>per month</span>
                      </>
                    ) : (
                      <>
                        <b className={css.freeprice}>FREE</b>
                        <span className={css.permo}>you sell the ads</span>
                      </>
                    )}
                  </div>
                )}

                <ul className={css.planfeat}>
                  {v.tier.features.map(f => <li key={f}>{f}</li>)}
                </ul>

                <button className={cx(css.planbtn, (v.on ? css.on : ''))}
                  disabled={v.locked}
                  onClick={() => toggle(v.tier.id)}>
                  {v.locked ? 'LOCKED' : v.on ? 'ON SALE' : 'NOT SOLD'}
                </button>

                {v.on && <span className={css.planshare}>{pct(v.share)} of subscribers</span>}
              </div>
            ))}
          </div>
        </section>

        {/* ── what the table adds up to ── */}
        <section className={css.prsec}>
          <div className={css.prhead}><h2>What that earns</h2></div>
          <div className={css.prnums}>
            <div>
              <span>BLENDED ARPU</span>
              <b>{d.sellable.length ? dollars(d.arpu) : '—'}</b>
              <em>per subscriber, per month</em>
            </div>
            <div>
              <span>REACH</span>
              <b className={d.reachMul > 1.4 ? css.warn : ''}>×{d.reachMul.toFixed(2)}</b>
              <em>against a paid-only launch</em>
            </div>
          </div>

          {/* the same trap as the campaign: a bigger crowd is a bigger bill */}
          {d.reachMul > 1.2 && ceiling !== undefined && expectedLikely !== undefined && (
            <div className={css.prtension}>
              A free door is capacity spent in reverse. This mix brings about
              {' '}<b>{Math.round(expectedLikely / 1000)}K</b> on premiere night against
              {' '}<b>{Math.round(ceiling / 1000)}K</b> of hall.
            </div>
          )}

          {d.problems.map((p, i) => (
            <div className={css.prproblem} key={i}>{p}</div>
          ))}

          <button className={css.prdetail} onClick={() => setDetail(x => !x)}>
            {detail ? 'HIDE THE MATHS' : 'SHOW THE MATHS'}
          </button>
          {detail && (
            <div className={css.prmaths}>
              {d.sellable.map(v => (
                <div className={css.mrow} key={v.tier.id}>
                  <span>{v.tier.name}</span>
                  <em>{pct(v.share)}</em>
                  <b>{v.tier.paid ? dollars(v.price) : `${dollars(AD_ARPU)} in ads`}</b>
                </div>
              ))}
              <div className={cx(css.mrow, css.total)}>
                <span>Blended</span>
                <em>100%</em>
                <b>{dollars(d.arpu)}</b>
              </div>
              <p>
                Estimates, not forecasts — nobody has subscribed yet. The mix is what
                players like yours have historically landed on at these prices.
              </p>
            </div>
          )}
        </section>

        <div className={css.prspace} />
      </div>

      <div className={css.prfoot}>
        <button className={css.prdone} onClick={onClose}>
          {d.sellable.length ? 'BACK TO THE BUILD' : 'NOTHING ON SALE — GO BACK'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/Pricing/Pricing.module.css */
