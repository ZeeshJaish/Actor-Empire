/* 6 · Opening catalogue — enough to watch on opening night.
   The heavy lifting (licensing, linking) belongs to the Content Desk; this step
   is the readiness picture and the decision to commit it. */

import type { StepProps } from './LaunchWizard';
import { compactCount, pct } from '../../finance/format';
import { Poster } from '../Poster';


export function StepCatalogue({ data, handlers }: StepProps) {
  const c = data.catalogue;
  const depth = c.hours / Math.max(1, c.hoursNeeded);
  const tone = depth >= 1.2 ? 'good' : depth >= 0.8 ? 'warn' : 'bad';
  const verdict = !c.titles ? 'No available opening titles yet. Add content or finish your productions.'
    : c.readyForLaunch === false ? 'Some opening markets still need available titles. Review country coverage before launch.'
      : depth >= 1 ? 'A broader shelf gives households more reasons to stay. Keep planning new releases.'
        : 'You have available titles, but a thin shelf. More variety can help retain subscribers.';

  return (
    <>
      {/* Readiness measured against what an opening night actually needs, not
          against a fixed number of slots — a player who waited and bought two
          hundred titles should see two hundred titles, not a full shelf. */}
      <section className={`cat-shelf is-${tone}`}>
        <header>
          <div>
            <p className="sf-eyebrow">Available opening titles</p>
            <p className="cat-shelf-figure">{compactCount(c.titles)}<i>titles</i></p>
          </div>
          <div className="is-end">
            <p className="sf-eyebrow">{c.hoursEstimated ? 'Estimated watching time' : 'Watching time'}</p>
            <p className="cat-shelf-hours">{compactCount(c.hours)}<i>hours</i></p>
          </div>
        </header>

        {/* Depth against the bar an opening needs. Past the mark it keeps
            counting, because more is genuinely better here. */}
        <div className="cat-depth" role="img" aria-label={`${c.hours} hours against a ${c.hoursNeeded}-hour depth guide`}>
          <i style={{ width: `${Math.min(100, (c.hours / Math.max(1, c.hoursNeeded)) * 100)}%` }} />
          <span className="cat-depth-mark" style={{ left: `${Math.min(100, (c.hoursNeeded / Math.max(c.hours, c.hoursNeeded)) * 100)}%` }} aria-hidden="true" />
        </div>
        <p className="cat-depth-line">
          <b className={`sf-tone-${tone}`}>{(c.hours / Math.max(1, c.hoursNeeded)).toFixed(1)}×</b>
          catalogue depth guide · {compactCount(c.hoursNeeded)} hours, not a launch requirement
        </p>

        {/* The rail scrolls, so a hundred titles is a hundred titles. */}
        <div className="cat-rail">
          {c.anchors.map((title) => (
            <span key={title.id} className={title.linked ? 'cat-railitem' : 'cat-railitem is-off'}>
              <Poster seed={title.posterSeed ?? title.id} size={54} />
              <em>{title.name}</em>
            </span>
          ))}
          {c.titles > c.anchors.length && (
            <span className="cat-railmore">+{compactCount(c.titles - c.anchors.length)}<em>more</em></span>
          )}
        </div>

        <p className="lw-hero-note">{verdict}</p>
      </section>

      <div className="cat-strip">
        <span><b>{compactCount(c.ownedLinked)}</b><em>linked</em></span>
        <span><b>{compactCount(c.ownedAvailable)}</b><em>owned</em></span>
        <span><b>{compactCount(c.externalLicences)}</b><em>licensed</em></span>
        <span><b>{compactCount(c.activeAgreements)}</b><em>deals</em></span>
      </div>

      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">Coverage</p>
        <ul className="lw-coverage">
          {c.genreCoverage.map((genre) => (
            <li key={genre.name}>
              <span>{genre.name}</span>
              <i><b style={{ width: `${genre.share}%` }} /></i>
              <em>{pct(genre.share, 0)}</em>
            </li>
          ))}
        </ul>
        {c.gaps.length > 0 && (
          <div className="lw-chips">
            {c.gaps.map((gap) => <span key={gap} className="lw-chip is-gap">No {gap}</span>)}
          </div>
        )}
      </section>

      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">Anchor titles</p>
        <ul className="lw-anchors">
          {c.anchors.map((title) => (
            <li key={title.id}>
              <Poster seed={title.posterSeed ?? title.id} size={40} />
              <span className="lw-anchor-body">
                <b>{title.name}</b>
                <em>{title.format}{title.note ? ` · ${title.note}` : ''}</em>
              </span>
              <span className={title.linked ? 'lw-linked is-on' : 'lw-linked'}>
                {title.linked ? 'Linked' : 'Not linked'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="lw-rule">{c.shelfStrategy}</p>
      <p className="lw-rule">Buying content does not schedule it. Premiere night still needs a locked slate of at least three titles, including a delivered Original.</p>

      <div className="lw-actions">
        <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpenContentDesk?.()}>
          Open Content Desk
        </button>
      </div>
    </>
  );
}
