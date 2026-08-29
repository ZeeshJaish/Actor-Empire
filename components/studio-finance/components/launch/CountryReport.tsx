/* ============================================================================
   COUNTRY REPORT — what opening here actually means.

   Rewritten twice. First it was twenty labelled rows; then it was pictures, but
   still a long read. Now it is five blocks, and a player who skims comes away
   with the same four answers as one who reads:

     · how much of this market is nobody's yet?
     · how hard will the state make it?
     · what does it cost, and how long does it take?
     · what will the network have to carry?

   Anything that is detail rather than answer is folded away behind a summary
   line the player can open.
   ========================================================================== */

import type { Country, Share } from '../../finance/launch';
import { unclaimed } from '../../finance/launch';
import { compactCount, money, pct, signedPct } from '../../finance/format';
import { rivalColor, UNCLAIMED } from '../../finance/rivals';

const TAX_WORDS = ['Light', 'Moderate', 'Heavy', 'Punishing'];
const REVIEW_WORDS = ['Waved through', 'Standard', 'Detailed', 'Slow and picky'];
const PRIVACY_WORDS = ['Relaxed', 'Moderate', 'Strict', 'Enforced hard'];
const CONTENT_WORDS = ['None', 'Encouraged', 'Quota', 'Must invest'];

/* --- the share bar, used on the card, in the report and on the footprint --- */

export function ShareBar({ rivals, open, compact }: { rivals: Share[]; open: number; compact?: boolean }) {
  const leader = rivals[0];
  return (
    <div className={compact ? 'sb is-compact' : 'sb'}>
      <div className="sb-bar" role="img" aria-label={`${pct(open, 0)} of this market is unclaimed`}>
        {rivals.map((rival) => (
          <i key={rival.name} style={{ width: `${rival.share}%`, background: rivalColor(rival.name) }} title={`${rival.name} ${pct(rival.share, 0)}`} />
        ))}
        <i className="sb-open" style={{ width: `${open}%`, background: UNCLAIMED }} />
      </div>
      {compact ? (
        <p className="sb-line">
          <b>{pct(open, 0)} unclaimed</b>
          {leader && (
            <span>
              <i style={{ background: rivalColor(leader.name) }} aria-hidden="true" />
              {leader.name} {pct(leader.share, 0)}
            </span>
          )}
        </p>
      ) : (
        <ul className="sb-keys">
          {rivals.map((rival) => (
            <li key={rival.name}>
              <i style={{ background: rivalColor(rival.name) }} aria-hidden="true" />
              <span>{rival.name}</span>
              <b>{pct(rival.share, 0)}</b>
            </li>
          ))}
          <li className="is-open">
            <i style={{ background: UNCLAIMED }} aria-hidden="true" />
            <span>Nobody yet</span>
            <b>{pct(open, 0)}</b>
          </li>
        </ul>
      )}
    </div>
  );
}

/* --- the report ------------------------------------------------------------- */

export function CountryReport({ country }: { country: Country }) {
  const d = country.dossier;
  const open = unclaimed(country.rivals);
  const due = country.rightsEstimate + country.complianceCost;
  const weeks = Number.parseInt(d.approvalWeeks, 10) || 5;
  const paperwork = Array.from(new Set([...d.clearances, ...d.consumerRequirements]));

  return (
    <div className="cr">
      {/* 1 · the headline: audience, growth, and how much is still winnable */}
      <section className="cr-top">
        <div className="cr-top-figures">
          <span><em>Audience</em><b>{compactCount(country.audience)}</b></span>
          <span><em>Growth</em><b className="sf-tone-good">{signedPct(country.growth, 0)}/yr</b></span>
          <span><em>Unclaimed</em><b className={open > 40 ? 'sf-tone-good' : open > 25 ? 'sf-tone-warn' : 'sf-tone-bad'}>{pct(open, 0)}</b></span>
        </div>
        <ShareBar rivals={country.rivals} open={open} />
        <p className="cr-lede">{country.opportunity}</p>
      </section>

      {/* 2 · the state, as four gauges and nothing else */}
      <section className="cr-block">
        <span className="sf-eyebrow">How hard the state makes it</span>
        <div className="cr-gauges">
          <Gauge label="Tax" level={d.levels.tax} words={TAX_WORDS} detail={d.taxBaseline} />
          <Gauge label="Entry review" level={d.levels.review} words={REVIEW_WORDS} detail={d.approvalWeeks} />
          <Gauge label="Privacy" level={d.levels.privacy} words={PRIVACY_WORDS} detail={d.privacyLevel} />
          <Gauge label="Local content" level={d.levels.localContent} words={CONTENT_WORDS} detail={d.localContentObligation} />
        </div>
      </section>

      {/* 3 · cost and clock, on one line each */}
      <section className="cr-block">
        <header className="cr-head">
          <span className="sf-eyebrow">To get in</span>
          <b>{money(due)}</b>
        </header>
        <div className="cr-split" role="img" aria-label={`${money(country.rightsEstimate)} market access, ${money(country.complianceCost)} compliance`}>
          <i className="is-rights" style={{ width: `${(country.rightsEstimate / due) * 100}%` }} />
          <i className="is-comply" style={{ width: `${(country.complianceCost / due) * 100}%` }} />
        </div>
        <p className="cr-splitkey">
          <span><i className="is-rights" aria-hidden="true" />Market access {money(country.rightsEstimate)}</span>
          <span><i className="is-comply" aria-hidden="true" />Compliance {money(country.complianceCost)}</span>
        </p>
        <div className="cr-weeks" role="img" aria-label={`Approval takes about ${weeks} weeks`}>
          {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < weeks ? 'is-on' : undefined} />)}
          <em>{d.approvalWeeks} · then {money(d.regulatoryOverhead)}/yr to stay</em>
        </div>
      </section>

      {/* 4 · the two things that bite, and the paperwork folded away */}
      <section className="cr-block">
        <ul className="cr-risks">
          {d.risks.slice(0, 2).map((risk) => <li key={risk}><i aria-hidden="true">!</i>{risk}</li>)}
        </ul>
        <details className="cr-fold">
          <summary>{paperwork.length} filings and rules to satisfy</summary>
          <ul className="cr-checks">
            {paperwork.map((item) => <li key={item}><i aria-hidden="true" />{item}</li>)}
          </ul>
          <p className="cr-note">{d.regulatoryExpectation}</p>
        </details>
      </section>

      {/* 5 · language and network, as one compact strip each */}
      <section className="cr-block">
        <span className="sf-eyebrow">Language</span>
        <div className="cr-langchips">
          {country.languages.map((lang) => (
            <span key={lang.name}><b>{lang.name}</b><em>{pct(lang.share, 0)}</em></span>
          ))}
        </div>
        <p className="cr-note">{country.localizationNote}</p>
      </section>

      <section className="cr-block">
        <span className="sf-eyebrow">The network will carry</span>
        <div className="cr-strip">
          <span><b>{d.edgeSites}</b><em>edge sites</em></span>
          <span><b>{compactCount(d.peakConcurrent)}</b><em>peak streams</em></span>
          <span><b>{d.bandwidthGbps}</b><em>Gbps</em></span>
          <span><b className="cr-city">{d.infraCity}</b><em>best city</em></span>
        </div>
      </section>
    </div>
  );
}

function Gauge({ label, level, words, detail }: { label: string; level: number; words: string[]; detail: string }) {
  const tone = level <= 0 ? 'good' : level === 1 ? 'flat' : level === 2 ? 'warn' : 'bad';
  return (
    <div className="cr-gauge">
      <em>{label}</em>
      <span className={`cr-gauge-bars is-${tone}`} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => <i key={i} className={i <= level ? 'is-on' : undefined} />)}
      </span>
      <b className={`sf-tone-${tone}`}>{words[Math.max(0, Math.min(3, level))]}</b>
      <s>{detail}</s>
    </div>
  );
}
