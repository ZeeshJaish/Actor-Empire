import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleDot } from 'lucide-react';
import { resolveStreamingHqTourStep, type StreamingHqTourMode } from '../services/streamingHq';

/* The Streaming Hall tour (Zeesh, 2026-11-08): a spotlight on the real headquarters card the step is about, and a coach
   card that sits on the other half of the screen. The page underneath cannot be tapped while the tour runs, so the
   player always leaves it through Next, Finish or Skip and the saved state never strands. */

type Spot = { top: number; left: number; width: number; height: number };

const PAD = 8;

const reducedMotion = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* the box that actually scrolls the headquarters (the deck scrolls inside itself, not the window) */
const findScroller = (element: HTMLElement): HTMLElement | null => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
  }
  return null;
};

const CARD_FALLBACK_HEIGHT = 260;
const EDGE = 16;

const sameSpot = (a: Spot | null, b: Spot | null) => Boolean(a && b
  && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
  && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

export const StreamingHqTour: React.FC<{
  stepIndex: number;
  mode: StreamingHqTourMode;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}> = ({ stepIndex, mode, onNext, onBack, onSkip }) => {
  const step = resolveStreamingHqTourStep(stepIndex, mode);
  const [spot, setSpot] = useState<Spot | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isLast = step.index === step.total - 1;

  /* find the card, scroll it into the free band above the coach card, and follow it while the scroll settles or the
     window changes */
  useEffect(() => {
    const target = step.anchor ? document.querySelector<HTMLElement>(`[data-hq-tour="${step.anchor}"]`) : null;
    if (!target) {
      setSpot(null);
      return undefined;
    }
    const behavior: ScrollBehavior = reducedMotion() ? 'auto' : 'smooth';
    const scroller = findScroller(target);
    const cardHeight = cardRef.current?.offsetHeight || CARD_FALLBACK_HEIGHT;
    const band = window.innerHeight - cardHeight - EDGE * 3;
    const box = target.getBoundingClientRect();
    /* it fits: centre it in the band above the card; too tall: start it just under a card moved to the top */
    const wantedTop = box.height <= band ? EDGE + (band - box.height) / 2 : cardHeight + EDGE * 2;
    if (scroller) scroller.scrollBy({ top: box.top - wantedTop, behavior });
    else target.scrollIntoView({ block: 'center', behavior });
    const measure = () => {
      const r = target.getBoundingClientRect();
      const next = { top: r.top, left: r.left, width: r.width, height: r.height };
      setSpot(previous => (sameSpot(previous, next) ? previous : next));
    };
    let frame = 0;
    const follow = () => { measure(); frame = window.requestAnimationFrame(follow); };
    follow();
    const settle = window.setTimeout(() => { window.cancelAnimationFrame(frame); measure(); }, 900);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step.anchor, step.index]);

  /* the next move is always one key away */
  useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, [step.index]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onSkip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  /* the card sits at the bottom unless the spotlight would run under it and there is room above */
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
  const cardHeight = cardRef.current?.offsetHeight || CARD_FALLBACK_HEIGHT;
  const tooTall = Boolean(spot && spot.height + PAD * 2 > viewportHeight - cardHeight - EDGE * 3);
  const runsUnderCard = Boolean(spot && spot.top + spot.height + PAD > viewportHeight - cardHeight - EDGE * 1.5);
  const cardOnTop = Boolean(spot && (tooTall || (runsUnderCard && spot.top - PAD > cardHeight + EDGE * 1.5)));

  return (
    <div className="hq-tour-layer" data-ui="streaming-hall-tour">
      {spot ? (
        <div
          className="hq-tour-spot"
          aria-hidden="true"
          style={{
            top: spot.top - PAD,
            left: spot.left - PAD,
            width: spot.width + PAD * 2,
            height: spot.height + PAD * 2,
          }}
        />
      ) : <div className="hq-tour-dim" aria-hidden="true" />}

      <div
        ref={cardRef}
        className={`hq-tour-card ${cardOnTop ? 'is-top' : 'is-bottom'}${spot ? '' : ' is-centre'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hq-tour-title"
        aria-describedby="hq-tour-copy"
      >
        <div className="hq-tour-track" aria-hidden="true">
          {Array.from({ length: step.total }, (_, index) => (
            <span key={index} className={index <= step.index ? 'is-filled' : ''} />
          ))}
        </div>
        <div className="hq-tour-body" key={`${step.index}:${mode}`}>
          <span className="hq-eyebrow">{step.kicker}</span>
          <h2 id="hq-tour-title">{step.title}</h2>
          <p id="hq-tour-copy">{step.description}</p>
          <div className="hq-tour-focus"><CircleDot size={15} /> {step.focus}</div>
        </div>
        <div className="hq-tour-actions">
          <button type="button" className="hq-text-button" onClick={onSkip}>Skip tour</button>
          <span className="hq-tour-moves">
            {step.index > 0 ? (
              <button type="button" className="hq-tour-back" onClick={onBack} aria-label="Previous step">
                <ChevronLeft size={18} />
              </button>
            ) : null}
            <button ref={nextRef} type="button" className="hq-primary-button is-compact" onClick={onNext}>
              {isLast ? 'Finish tour' : 'Next'} <ChevronRight size={17} />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StreamingHqTour;
