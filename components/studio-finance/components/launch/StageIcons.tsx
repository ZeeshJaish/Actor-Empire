/* --- one glyph per stage ------------------------------------------------------
   The launch sequence, the HUD's Next button and the mission briefing all draw
   a stage with the same glyph, so a stage looks the same wherever it is named. */

import type React from 'react';
import type { LaunchStepId } from '../../finance/launch';

export function StepIcon({ step }: { step: LaunchStepId }) {
  const paths: Record<LaunchStepId, React.ReactElement> = {
    markets: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c4 4.5 4 11 0 16-4-5-4-11.5 0-16z" /></>,
    clearance: <><path d="M6 3.5h8l4 4V20a.5.5 0 01-.5.5h-11A.5.5 0 016 20V4a.5.5 0 010-.5z" /><path d="M13.5 3.5V8H18M9 13.5l2 2 4-4" /></>,
    ident: <><path d="M5 12a7 7 0 0114 0" /><path d="M9 12v5M15 12v5M12 9v11" /></>,
    storefront: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 10h17M9 10v9.5" /></>,
    pricing: <><path d="M4 11.5V5a1 1 0 011-1h6.5L20 12.5 12.5 20 4 11.5z" /><circle cx="8" cy="8" r="1.2" /></>,
    catalogue: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M8 5.5v13M16 5.5v13M3.5 12h17" /></>,
    blueprint: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[step]}
    </svg>
  );
}

export function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
