/**
 * The three ways to earn as characters (#104; Zeesh, 2026-11-01: "तीनों का एक पर्सनैलिटी दे दे कि रेंट और बाय को … एक
 * कलर ही एसोसिएट करा दे … प्रॉपर गुड बटन बना दे", plan §18.4/§18.10). Each has a colour of its own, an emblem and a
 * voice, the same wherever the offer shows: the money engine, the plan table's columns, and what the world says.
 * The colours are the wizard's own three (its offer boxes' sky, violet and amber).
 */
import React from 'react';

export type StreamingOfferKind = 'SUBSCRIPTION' | 'ADS' | 'STORE';

export interface StreamingOfferPersonality {
  name: string;
  /** its character in a word, over its name */
  tag: string;
  /** its voice, a few words */
  pitch: string;
  /** what it is, a line */
  line: string;
  /** its colour, everywhere */
  colour: string;
}

export const STREAMING_OFFER_ORDER: StreamingOfferKind[] = ['SUBSCRIPTION', 'ADS', 'STORE'];

export const STREAMING_OFFER_PERSONALITY: Record<StreamingOfferKind, StreamingOfferPersonality> = {
  SUBSCRIPTION: {
    name: 'Subscription', tag: 'Members', pitch: 'Membership, your way',
    line: 'Homes pay every month for your plans', colour: '#45b5de',
  },
  ADS: {
    name: 'Free with ads', tag: 'Open doors', pitch: 'Everyone in, ads pay',
    line: 'Viewers watch free; the ads they see pay', colour: '#ab94ff',
  },
  STORE: {
    name: 'Rent or buy', tag: 'Box office', pitch: 'Every title, a ticket',
    line: 'Free to browse; pay to rent or own a title', colour: '#eeac43',
  },
};

/** Its emblem: a member's card, a screen with an ad tag, a ticket. */
export const StreamingOfferEmblem: React.FC<{ offer: StreamingOfferKind; className?: string }> = ({ offer, className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    {offer === 'SUBSCRIPTION' && <>
      <rect x="4" y="7.5" width="24" height="17" rx="3.5" />
      <rect x="8" y="12" width="6" height="4.6" rx="1.2" fill="currentColor" stroke="none" />
      <path d="M8 20.2h9" />
      <path d="M22.6 11.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor" strokeWidth={1} />
    </>}
    {offer === 'ADS' && <>
      <rect x="3.5" y="6" width="25" height="17" rx="3" />
      <path d="M13.6 11v7l6-3.5z" fill="currentColor" stroke="none" />
      <path d="M11 27h10" />
      <rect x="20.2" y="2.6" width="9.4" height="6" rx="1.6" fill="currentColor" stroke="none" />
      <path d="M22.4 7.2l1.2-3 1.2 3M22.8 6.2h1.6M26.6 4.2v3h.8a1.5 1.5 0 000-3z" stroke="#0b0c12" strokeWidth={0.95} />
    </>}
    {offer === 'STORE' && <>
      <path d="M4.5 10a2.5 2.5 0 002.5-2.5h18a2.5 2.5 0 002.5 2.5v3a3 3 0 000 6v3a2.5 2.5 0 00-2.5 2.5H7a2.5 2.5 0 00-2.5-2.5v-3a3 3 0 000-6z" />
      <path d="M20.5 8.5v15" strokeDasharray="1.6 2.2" />
      <path d="M12.6 12.4l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" strokeWidth={1} />
    </>}
  </svg>
);
