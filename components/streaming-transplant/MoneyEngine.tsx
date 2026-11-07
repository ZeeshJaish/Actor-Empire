/**
 * The money engine (#104; Zeesh, 2026-11-01: "चेंज द मॉडल में जो … बॉक्सेस आ रहे हैं वो बॉक्स मुझे एकदम पसंद नहीं" …
 * "गेम वाला भी फील आना चाहिए" … "तीनों का एक पर्सनैलिटी दे दे", plan §18.4): the three ways to earn as a loadout.
 *  - One big MAIN slot, the front door (#103): its emblem with a crown, its character, its money.
 *  - Two side slots, each with its emblem, colour, money and a switch; "Make main" moves the crown, with a moment.
 *  - Before a first choice the MAIN slot is empty and asks for one.
 * The wizard's Pricing step and the Offer tab show the same engine; the caller says what each slot's money is.
 */
import React from 'react';
import css from './presentation/screens/Pricing/MoneyEngine.module.css';
import { cx } from './presentation/cx';
import {
  STREAMING_OFFER_ORDER, STREAMING_OFFER_PERSONALITY, StreamingOfferEmblem, type StreamingOfferKind,
} from './offerPersonality';

export interface MoneyEngineSlot {
  on: boolean;
  /** its money ("$8.1M"), or null before there is any */
  value: string | null;
  /** under the money: "a month, forecast", "a month, last week", "from launch" */
  note: string;
  /** what it holds now: "2 plans · from $7.99", "A break every 15 min" */
  detail?: string;
}

const Crown: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true"><path d="M1.8 12.6h12.4L13.1 4.6l-3.2 3.1L8 3.4 6.1 7.7 2.9 4.6z" fill="currentColor" /></svg>
);
const tint = (offer: StreamingOfferKind) => ({ ['--c' as string]: STREAMING_OFFER_PERSONALITY[offer].colour }) as React.CSSProperties;

export const MoneyEngine: React.FC<{
  /** the main offer; null before the first choice */
  main: StreamingOfferKind | null;
  slots: Record<StreamingOfferKind, MoneyEngineSlot>;
  /** switches and "Make main" (the Offer tab shows them while editing) */
  editable: boolean;
  onMain?: (offer: StreamingOfferKind) => void;
  onToggle?: (offer: StreamingOfferKind, on: boolean) => void;
  /** beside the title: "forecast $13.6M a month", "last settled week" */
  aside?: string;
  /** the caller's spacing */
  className?: string;
}> = ({ main, slots, editable, onMain, onToggle, aside, className }) => {
  const head = <header className={css.head}><span>Your money engine</span>{aside && <em>{aside}</em>}</header>;

  /* the first choice: an empty front door, and the three to choose from */
  if (!main) return (
    <section className={cx(css.engine, className)} aria-label="Your money engine: choose your front door">
      {head}
      <div className={css.empty}>
        <i aria-hidden="true"><Crown /></i>
        <b>Choose your front door</b>
        <span>What a new viewer meets first. The other two can run beside it.</span>
      </div>
      <div className={css.picks} role="group" aria-label="Your main way to earn">
        {STREAMING_OFFER_ORDER.map(offer => {
          const persona = STREAMING_OFFER_PERSONALITY[offer];
          return (
            <button type="button" key={offer} className={css.pick} style={tint(offer)} disabled={!editable}
              onClick={() => onMain?.(offer)} aria-label={`${persona.name}: ${persona.line}. Make it your front door`}>
              <span className={css.badge}><StreamingOfferEmblem offer={offer} /></span>
              <span className={css.pickText}><small>{persona.tag}</small><b>{persona.name}</b><span>{persona.line}</span></span>
              <i className={css.go} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );

  const lead = STREAMING_OFFER_PERSONALITY[main];
  return (
    <section className={cx(css.engine, className)} aria-label="Your money engine">
      {head}
      {/* keyed by the main offer, so a new crown plays its moment */}
      <div key={main} className={css.main} style={tint(main)} role="group" aria-label={`${lead.name}, your front door: ${slots[main].value ?? 'no money yet'} ${slots[main].note}`}>
        <span className={css.emblem}>
          <StreamingOfferEmblem offer={main} />
          <i className={css.crown}><Crown />MAIN</i>
        </span>
        <span className={css.lead}>
          <small>{lead.tag} · front door</small>
          <b>{lead.name}</b>
          <span>{lead.pitch}</span>
        </span>
        <span className={css.money}><b>{slots[main].value ?? '—'}</b><small>{slots[main].note}</small></span>
        {slots[main].detail && <span className={css.detail}>{slots[main].detail}</span>}
      </div>
      <div className={css.sides}>
        {STREAMING_OFFER_ORDER.filter(offer => offer !== main).map(offer => {
          const persona = STREAMING_OFFER_PERSONALITY[offer];
          const slot = slots[offer];
          return (
            <div key={offer} className={cx(css.side, !slot.on && css.off)} style={tint(offer)}>
              <span className={css.sideTop}>
                <span className={css.badge}><StreamingOfferEmblem offer={offer} /></span>
                <span className={css.sideName}><small>{persona.tag}</small><b>{persona.name}</b></span>
              </span>
              <span className={css.sideMoney}>
                <b>{slot.on ? slot.value ?? '—' : 'Off'}</b>
                <small>{slot.on ? slot.note : persona.pitch}</small>
              </span>
              {slot.on && slot.detail && <span className={css.sideDetail}>{slot.detail}</span>}
              {editable && (
                <span className={css.actions}>
                  <button type="button" role="switch" aria-checked={slot.on} className={cx(css.toggle, slot.on && css.isOn)}
                    onClick={() => onToggle?.(offer, !slot.on)} aria-label={`${persona.name}: ${slot.on ? 'on' : 'off'}`}>
                    <span>{slot.on ? 'On' : 'Turn on'}</span><i aria-hidden="true" />
                  </button>
                  <button type="button" className={css.crownMe} onClick={() => onMain?.(offer)} aria-label={`Make ${persona.name} your front door`}>
                    <Crown />Make main
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
