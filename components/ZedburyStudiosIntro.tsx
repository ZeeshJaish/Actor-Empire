import { ZEDBURY_PATH, ZEDBURY_VIEWBOX } from '../assets/zedbury';
import type { ActState } from './types';
import '../styles/intro.css';
import '../styles/zedbury-intro.css';

interface Props {
  /** '' hidden · 'on' playing · 'on exit' fading out */
  state?: ActState;
  /** Tap anywhere to skip */
  onSkip?: () => void;
  /** Small caption under the mark. Pass null for the mark on its own. */
  caption?: string | null;
}

/**
 * ZEDBURY STUDIOS — the studio ident.
 *
 * Deliberately plain: the mark fades in, holds, and fades out — about a second
 * and a half, start to finish. No draw-on, no build, no camera move, no colour
 * field. A studio card, not a set piece.
 *
 *   0.12s  the mark fades up on black
 *   0.24s  the caption follows
 *   1.15s  Act I is dismissed and both fade out
 *
 * The fade-out is also the hand-over: the frame it leaves is black, which is
 * already Act II's frame, so the intro needs no transition device at all.
 *
 * Flat by design, because it fronts every game we ship — solid brand red on
 * black, no glow, gradient, grain or bevel. Self-contained too: it sits above
 * any host grain/vignette (see the z-index in zedbury-intro.css) and reads
 * nothing from the surrounding app, so it can be dropped into another game
 * as-is.
 */
export default function ZedburyStudiosIntro({
  state = 'on',
  onSkip,
  caption = 'Presents',
}: Props) {
  return (
    <section className={`phase zb-act ${state}`.trim()} id="act1" onPointerDown={onSkip}>
      <div className="zb-box">
        <svg
          className="zb-art"
          viewBox={ZEDBURY_VIEWBOX}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Zedbury Studios"
        >
          <path d={ZEDBURY_PATH} fillRule="evenodd" clipRule="evenodd" fill="#f23117" />
        </svg>
      </div>

      {caption ? <div className="zb-caption">{caption}</div> : null}
      {/* Only offered when there is a handler to honour it — a visible hint that
          does nothing is worse than no hint at all. */}
      {onSkip ? <div className="skip-hint">Tap to skip</div> : null}
    </section>
  );
}
