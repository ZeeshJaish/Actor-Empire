/* ============================================================================
   ONE COUNTRY CARD — the Define the Launch market card, shared.

   #139 (Zeesh, after trying Enter new markets: "विजार्ड का एलिमेंट यहाँ मिमिक …
   कंट्री कार्ड … री यूज़ करो चीज़ें"): the wizard's opening markets and the
   Audience room's Enter new markets show a country the same way. The flag band
   with the competition badge and the country plate, three figures, who holds
   the homes in their own colours, the languages, and Full report beside one
   switch that adds the market and, tapped again, takes it off.

   The callers say what the figures are and what the switch means: the wizard
   counts the market's audience and its access fee for opening day; the room
   counts this week's viewers and the whole entry cost of an expansion.

   Needs an `.sf` ancestor (the finance tokens) and launch.css.

   2026-11-09: a Streaming+ country the player cannot take yet keeps the whole
   card (it is worth reading) and trades the switch for the same control in the
   pack's gold, which opens the pack's sheet.
   ========================================================================== */

import type { Key, ReactNode } from 'react';
import type { Competition, Country, Share } from '../../finance/launch';
import { unclaimed } from '../../finance/launch';
import { pct } from '../../finance/format';
import { FlagField, flagAccent } from '../FlagField';
import { ShareBar } from './CountryReport';
import { StreamingPlusChip } from '../../../streamingPlus/StreamingPlusParts';
import plusCss from '../../../streamingPlus/StreamingPlus.module.css';

/* Plain words. "Fierce" was doing no work that "fought over" doesn't do. */
export const COMPETITION_LABEL: Record<Competition, string> = {
  OPEN: 'Open',
  BUSY: 'Crowded',
  FIERCE: 'Fought over',
};
export const COMPETITION_TONE = { OPEN: 'good', BUSY: 'warn', FIERCE: 'bad' } as const;
export const DIFFICULTY_LABEL = {
  LOW: 'Easy entry',
  MODERATE: 'Some paperwork',
  HIGH: 'Hard entry',
  SEVERE: 'Very hard entry',
} as const;
export const DIFFICULTY_TONE = { LOW: 'good', MODERATE: 'flat', HIGH: 'warn', SEVERE: 'bad' } as const;

export interface LaunchCountryFigure {
  label: string;
  value: string;
  good?: boolean;
}

interface Props {
  /** No @types/react here: a value-based component declares key itself. */
  key?: Key;
  country: Country;
  on: boolean;
  /** Its place in the list. */
  index?: number;
  figures: LaunchCountryFigure[];
  /** Who holds the homes. The market's own roster unless the caller has this week's. */
  holders?: { rivals: Share[]; open: number };
  /** Chips after the languages and the entry difficulty. */
  chips?: ReactNode;
  /** The pill on the band once it is picked. */
  pinned: string;
  switchLabel: string;
  /** A Streaming+ country this player cannot take yet: the switch becomes the gold one, and onToggle opens the pack. */
  plus?: boolean;
  onReport: () => void;
  onToggle: () => void;
}

export function LaunchCountryCard({ country, on, index = 0, figures, holders, chips, pinned, switchLabel, plus = false, onReport, onToggle }: Props) {
  return (
    <li
      className={on ? 'lw-country is-on' : 'lw-country'}
      style={{ ['--terr-accent' as string]: flagAccent(country.code) ?? 'var(--sf-brand-on)', ['--i' as string]: index }}
    >
      <div className="lw-country-band" aria-hidden="true">
        <FlagField code={country.code} src={country.flagSrc} variant="band" />
        <span className="sf-terr-grain" />
        <span className="sf-terr-glow" />
        <span className="sf-terr-shade" />
        <span className={`sf-terr-badge sf-tone-${COMPETITION_TONE[country.competition]}`}>
          {COMPETITION_LABEL[country.competition]}
        </span>
        {on && <span className="lw-onday">{pinned}</span>}
        <span className={country.subRegion ? 'sf-terr-plate has-bloc' : 'sf-terr-plate'}>
          <span className="sf-terr-tag">{country.code}</span>
          <span className="sf-terr-name">{country.name}</span>
          {/* Where in the region this is — on its own line under the
              name. The plate is a flex row, so beside it this took half
              the width and truncated the United States to "United S…".
              The country is the headline; the bloc is a footnote. */}
          {country.subRegion && <span className="lw-terr-bloc">{country.subRegion}</span>}
        </span>
      </div>

      <div className="lw-country-body">
        <div className="lw-country-stats">
          {figures.map((figure) => (
            <span key={figure.label}><em>{figure.label}</em><b className={figure.good ? 'sf-tone-good' : undefined}>{figure.value}</b></span>
          ))}
        </div>

        {/* Who owns the country, in their own colours. */}
        <ShareBar rivals={holders?.rivals ?? country.rivals} open={holders?.open ?? unclaimed(country.rivals)} compact />

        <div className="lw-chips">
          {country.languages.map((lang) => (
            <span key={lang.name} className="lw-chip">{lang.name} <i>{pct(lang.share, 0)}</i></span>
          ))}
          <span className={`lw-chip is-plain sf-tone-${DIFFICULTY_TONE[country.difficulty]}`}>
            {DIFFICULTY_LABEL[country.difficulty]}
          </span>
          {chips}
        </div>

        <div className="lw-country-actions">
          <button type="button" className="lw-report" onClick={onReport}>
            <ReportGlyph />Full report
          </button>
          {plus && !on
            ? <PlusSwitch label={switchLabel} name={country.name} onClick={onToggle} />
            : <OpeningSwitch on={on} label={switchLabel} onClick={onToggle} />}
        </div>
      </div>
    </li>
  );
}

/* One control both ways: the switch adds a market to opening day and, tapped
   again, takes it off. Half-lit for a bloc partly taken. */
export function OpeningSwitch({ on, part = false, label, onClick }: { on: boolean; part?: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`lw-switch${on ? ' is-on' : ''}${part ? ' is-part' : ''}`} aria-pressed={on} onClick={onClick}>
      <span>{label}</span>
      <i aria-hidden="true"><b /></i>
    </button>
  );
}

/* The switch of a Streaming+ country: the same place, size and words, with the pack's chip where the knob was. */
export function PlusSwitch({ label, name, onClick }: { label: string; name: string; onClick: () => void }) {
  return (
    <button type="button" className={plusCss.countrySwitch} onClick={onClick} aria-label={`${name} is a Streaming+ country. See the Streaming+ Pack`} data-streaming-plus-country>
      <span>{label}</span>
      <StreamingPlusChip compact />
    </button>
  );
}

export function ReportGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2.75" y="1.75" width="10.5" height="12.5" rx="2" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
    </svg>
  );
}
