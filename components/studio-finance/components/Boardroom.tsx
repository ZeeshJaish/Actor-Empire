/* ============================================================================
   BOARDROOM — the hub.

   The dashboard already lists these sections as chips, so a page of the same
   words as bigger buttons would cost a tap and teach nothing. This page earns
   its place by being the briefing: the vitals across the top, the two or three
   things that actually need the player this week, and then every section
   carrying its own live state so you know what is behind a door before you
   open it.

   Rows, not a card grid — the dashboard uses cards, and repeating that idiom
   one level down leaves the player unsure which level they are on.

   Everything is data: sections, their groups and order, vitals, alerts. Adding
   LEADERSHIP or M&A or a legal desk later is a new entry in `sections`.
   ========================================================================== */

import { useMemo, type CSSProperties } from 'react';
import type { BoardroomData, BoardroomSection } from '../finance/boardroom';
import { groupSections, sortAlerts } from '../finance/boardroom';
import { brandVars } from '../finance/brand';
import { BoardroomIcon } from './BoardroomIcon';
import '../styles/tokens.css';
import '../styles/studio-finance.css';
import '../styles/boardroom.css';

export interface BoardroomProps {
  data: BoardroomData;
  onBack?: () => void;
  /** The whole point of the screen. */
  onOpenSection: (sectionId: string) => void;
}

export function Boardroom({ data, onBack, onOpenSection }: BoardroomProps) {
  const brand = useMemo(() => brandVars(data.company.brandHex), [data.company.brandHex]);
  const groups = useMemo(() => groupSections(data.sections), [data.sections]);
  const alerts = useMemo(() => sortAlerts(data.alerts), [data.alerts]);

  return (
    <div className="sf bd" style={brand as CSSProperties}>
      <header className="sf-head">
        <button type="button" className="sf-icon-btn" onClick={() => onBack?.()} aria-label="Back">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sf-head-titles">
          <h1>Boardroom</h1>
          <p>{data.subtitle ?? 'Money · People · Ownership'}</p>
        </div>
        {data.status && (
          <span className={`sf-status sf-tone-${data.status.tone}`}>
            <i aria-hidden="true" />{data.status.label}
          </span>
        )}
      </header>

      {/* The plaque: the room states which week it is sitting in. */}
      <div className="bd-stamp">
        <span>{data.stamp ?? `Week ${data.company.week} · Books open`}</span>
        <span>{data.stampRight ?? `Year ${data.company.year}`}</span>
      </div>

      {/* --- vitals: the four numbers a chairman asks for first ------------- */}
      <div className="bd-vitals" style={{ ['--bd-vital-count' as string]: data.vitals.length }}>
        {data.vitals.map((vital, i) => {
          const target = vital.sectionId;
          return (
            <button
              key={vital.id}
              type="button"
              className={`bd-vital bd-anim${target ? ' is-link' : ''}`}
              style={{ ['--i' as string]: i }}
              disabled={!target}
              onClick={() => target && onOpenSection(target)}
            >
              <span className="sf-eyebrow">{vital.label}</span>
              <span className="bd-vital-row">
                <span className={`bd-vital-value sf-tone-${vital.tone ?? 'flat'}`}>{vital.value}</span>
                {/* Always rendered, empty or not: one cell carrying a delta
                    while its neighbours do not would drop its value a line and
                    the strip would read as broken. */}
                <span className={`bd-vital-delta sf-tone-${vital.deltaTone ?? 'flat'}`}>{vital.delta ?? ''}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="sf-scroll">
        <div className="bd-body">
          {/* --- what needs the player ------------------------------------- */}
          <section className="bd-alerts">
            <header className="sf-sec-head">
              <h2>Needs you</h2>
              {alerts.length > 0 && <span className="bd-count">{alerts.length}</span>}
            </header>

            {alerts.length === 0 ? (
              <p className="bd-quiet">Nothing needs you this week. The company is running itself.</p>
            ) : (
              <ul className="bd-alert-list">
                {alerts.map((alert, i) => (
                  <li key={alert.id}>
                    <button
                      type="button"
                      className="bd-alert bd-anim"
                      style={{ ['--i' as string]: 4 + i }}
                      onClick={() => onOpenSection(alert.sectionId)}
                    >
                      <span className={`bd-dot is-${alert.severity}`} aria-hidden="true" />
                      <span className="bd-alert-text">{alert.text}</span>
                      <span className="bd-go" aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --- the rooms --------------------------------------------------- */}
          {groups.map(({ group, sections }, groupIndex) => (
            <section key={group} className="bd-group">
              <p className="sf-eyebrow">{group}</p>
              <ul className="bd-rows">
                {sections.map((section, i) => (
                  <li key={section.id}>
                    <Row
                      section={section}
                      /* Rows deal in after the vitals and the briefing, so the
                         room assembles top-down instead of appearing at once. */
                      order={6 + groupIndex * 2 + i + alerts.length}
                      onOpen={() => onOpenSection(section.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="sf-tail" />
        </div>
      </div>
    </div>
  );
}

function Row({ section, order, onOpen }: { section: BoardroomSection; order: number; onOpen: () => void }) {
  const state = section.state ?? 'open';
  const locked = state !== 'open';

  return (
    <button
      type="button"
      className={`bd-row bd-anim is-${state}`}
      style={{ ['--i' as string]: order }}
      onClick={onOpen}
      aria-label={`${section.name}. ${section.line}`}
    >
      <span className="bd-tile" aria-hidden="true">
        <BoardroomIcon glyph={section.glyph} />
      </span>

      <span className="bd-row-body">
        <span className="bd-row-top">
          <span className="bd-row-name">{section.name}</span>
          {section.attention && section.attention !== 'none' && (
            <span className={`bd-dot is-${section.attention}`} aria-hidden="true" />
          )}
        </span>
        <span className="bd-row-line">{locked && section.lockedReason ? section.lockedReason : section.line}</span>
        {typeof section.progress === 'number' && (
          <span className={`bd-progress is-${section.progressTone ?? 'brand'}`} aria-hidden="true">
            {section.progressSteps
              ? Array.from({ length: section.progressSteps }, (_, i) => (
                <i key={i} className={i < Math.round(section.progress! * section.progressSteps!) ? 'is-on' : undefined} />
              ))
              : <i className="is-smooth" style={{ width: `${Math.max(0, Math.min(1, section.progress)) * 100}%` }} />}
          </span>
        )}
      </span>

      <span className="bd-row-end">
        {section.badge && <span className="bd-badge">{section.badge}</span>}
        {locked
          ? <span className="bd-lock" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.75 7V5.25a2.25 2.25 0 014.5 0V7" /></svg>
            </span>
          : <span className="bd-go" aria-hidden="true">›</span>}
      </span>
    </button>
  );
}
