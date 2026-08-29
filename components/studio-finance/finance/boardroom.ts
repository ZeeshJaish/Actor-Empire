/* ============================================================================
   BOARDROOM — data contract

   The hub the player lands on when they open the Boardroom from the dashboard.
   It is deliberately generic: sections, groups, vitals and alerts are all plain
   lists, so adding LEADERSHIP or M&A or a Legal desk later means adding an
   entry to the data — never touching the layout.

   The rule the screen is built around: every row carries live state. A row that
   is only a label and a chevron is a menu item, and the dashboard already has
   those. If a section cannot say anything true about itself yet, say that
   ("Not started"), but say something.
   ========================================================================== */

export type Attention = 'none' | 'info' | 'warn' | 'urgent';

export type SectionState = 'open' | 'locked' | 'soon';

/** Named glyph. Unknown names fall back to a neutral mark, so a new section
    never has to wait for artwork. */
export type BoardroomGlyph =
  | 'finance' | 'people' | 'ownership' | 'markets' | 'brief' | 'legacy'
  | 'rights' | 'network' | 'audience' | 'generic';

export interface BoardroomVital {
  id: string;
  label: string;
  /** What this number did since the player last looked: "+$1.3M". Shown ghosted
      beside the value, so the strip reads as news rather than as a readout.
      Omit it and nothing is drawn. */
  delta?: string;
  deltaTone?: 'good' | 'bad' | 'warn' | 'flat';
  /** Pre-formatted by the host, so the Boardroom never re-states a number in a
      different shape from the screen it links to. */
  value: string;
  tone?: 'good' | 'bad' | 'warn' | 'flat' | 'gold';
  /** Section this cell jumps to, if any. */
  sectionId?: string;
}

export interface BoardroomSection {
  id: string;
  name: string;
  /** One line of live state: "$10.0M treasury · −$180K/wk". */
  line: string;
  /** Free-text group heading. Sections are rendered in the order the groups
      first appear, so ordering is data, not code. */
  group: string;
  glyph?: BoardroomGlyph;
  state?: SectionState;
  /** Why it is locked: "Requires a CFO". Shown instead of a chevron. */
  lockedReason?: string;
  attention?: Attention;
  /** Short right-hand marker: "2 / 5", "1 offer". */
  badge?: string;
  /** 0–1. Draws a tick bar under the line — readiness, staffing, progress. */
  progress?: number;
  /** Ticks in the progress bar. Defaults to a smooth bar when omitted. */
  progressSteps?: number;
  /** Gold is reserved for ownership, investors and the public markets, so a
      staffing bar stays on the platform colour and an IPO bar goes gold. */
  progressTone?: 'brand' | 'gold';
}

export interface BoardroomAlert {
  id: string;
  /** One sentence, written as something that happened or is about to. */
  text: string;
  sectionId: string;
  severity: Attention;
}

export interface BoardroomData {
  company: {
    name: string;
    year: number;
    week: number;
    brandHex?: string;
  };
  /** Sits in the header pill: "Stable", "Expansion", "Under pressure"… */
  status?: { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' };
  /** Header second line. Defaults to money · people · ownership. */
  subtitle?: string;
  /** The plaque above the vitals: "Week 116 · Books open". */
  stamp?: string;
  /** Right-hand side of the plaque: "Year 3". */
  stampRight?: string;
  vitals: BoardroomVital[];
  alerts: BoardroomAlert[];
  sections: BoardroomSection[];
}

/** Sections in group order, groups in the order they first appear. */
export function groupSections(sections: BoardroomSection[]): Array<{ group: string; sections: BoardroomSection[] }> {
  const order: string[] = [];
  const map = new Map<string, BoardroomSection[]>();

  sections.forEach((section) => {
    const bucket = map.get(section.group);
    if (bucket) {
      bucket.push(section);
    } else {
      order.push(section.group);
      map.set(section.group, [section]);
    }
  });

  return order.map((group) => ({ group, sections: map.get(group) as BoardroomSection[] }));
}

/** Urgent first, then warn, then info — but only for the alert list, never for
    the section rows, which keep a stable order for muscle memory. */
export function sortAlerts(alerts: BoardroomAlert[]): BoardroomAlert[] {
  const rank: Record<Attention, number> = { urgent: 0, warn: 1, info: 2, none: 3 };
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}
