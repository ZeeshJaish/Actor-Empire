import { logoDataUri } from '../assets/logo';
import type { ActState } from './types';
import '../styles/intro.css';

const STUDIO_NAME = 'ZEDBURY STUDIOS';

interface Props {
  /** '' hidden · 'on' playing · 'on exit' lifting away */
  state?: ActState;
  /** Tap anywhere to skip */
  onSkip?: () => void;
}

/** ACT I — "ZEDBURY STUDIOS PRESENTS" studio ident. */
export default function EmpireStudiozIntro({ state = 'on', onSkip }: Props) {
  return (
    <section className={`phase ${state}`.trim()} id="act1" onPointerDown={onSkip}>
      <div className="ident-mark">
        <img src={logoDataUri} alt="Zedbury Studios" />
      </div>
      <div className="ident-studio kicker">
        {[...STUDIO_NAME].map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.35 + i * 0.045}s` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </div>
      <div className="ident-presents">
        <div className="rule" />
        <div className="presents-word">PRESENTS</div>
        <div className="rule r" />
      </div>
      <div className="skip-hint">Tap to skip</div>
    </section>
  );
}
