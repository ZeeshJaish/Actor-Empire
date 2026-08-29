/* ============================================================================
   The close moment.

   A period ends, the books shut, and the game says one thing about it before
   handing control back. This is what stops Finance being a dashboard: the
   numbers arrive as an event, not as a page the player has to go and read.

   The host mounts it by passing `report`; passing null dismisses it.
   ========================================================================== */

import { money, pct } from '../finance/format';

export interface CloseReportData {
  /** "Quarter 3 · Year 3", "Week 32" — whatever period just shut. */
  period: string;
  headline: string;
  revenue: number;
  expense: number;
  net: number;
  cashAfter: number;
  /** Two or three short consequences. Not paragraphs. */
  notes: string[];
}

export function CloseReport({ report, onDismiss }: { report: CloseReportData | null; onDismiss: () => void }) {
  if (!report) return null;
  const margin = report.revenue > 0 ? ((report.revenue - report.expense) / report.revenue) * 100 : 0;

  return (
    <div className="sf-close">
      <section className="sf-close-card">
        <p className="sf-eyebrow">Books closed · {report.period}</p>
        <h2 className="sf-close-headline">{report.headline}</h2>

        <div className="sf-close-grid">
          <div><p className="sf-eyebrow">Revenue</p><p className="sf-tone-good">{money(report.revenue)}</p></div>
          <div><p className="sf-eyebrow">Expenses</p><p className="sf-tone-bad">{money(report.expense)}</p></div>
          <div><p className="sf-eyebrow">Result</p><p className={report.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}>{money(report.net, { sign: true })}</p></div>
          <div><p className="sf-eyebrow">Margin</p><p>{pct(margin)}</p></div>
        </div>

        <ul className="sf-close-notes">
          {report.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>

        <div className="sf-close-cash">
          <span className="sf-eyebrow">Company cash</span>
          <strong>{money(report.cashAfter)}</strong>
        </div>

        <button type="button" className="sf-btn sf-btn--primary" onClick={onDismiss}>Continue</button>
      </section>
    </div>
  );
}
