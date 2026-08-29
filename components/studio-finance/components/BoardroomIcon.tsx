/* Line glyphs for the Boardroom rows. Drawn, not imported — an icon font or an
   SVG file would be one more thing that does not survive the handoff. Unknown
   names fall back to a neutral mark so a new section never blocks on artwork. */

import type { ReactElement } from 'react';
import type { BoardroomGlyph } from '../finance/boardroom';

const PATHS: Record<BoardroomGlyph, ReactElement> = {
  finance: (
    <>
      <path d="M3 17V9M8.5 17V5M14 17v-6M19.5 17V7" />
      <path d="M2 20.5h20" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
      <path d="M16 5.6a3.2 3.2 0 010 5.6M17.5 14.6c2.1.5 3.5 2.1 3.5 4.4" />
    </>
  ),
  ownership: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v8l6.5 3.8" />
    </>
  ),
  markets: (
    <>
      <path d="M3 16.5l5.5-6 4 3.6L21 5" />
      <path d="M15.5 5H21v5.4" />
    </>
  ),
  brief: (
    <>
      <rect x="3.5" y="6.5" width="17" height="12.5" rx="2" />
      <path d="M9 6.5V5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5v1.5M3.5 12h17" />
    </>
  ),
  legacy: (
    <>
      <path d="M8 3.5h8v5a4 4 0 01-8 0v-5z" />
      <path d="M8 5H5v1.5A3.5 3.5 0 008.2 10M16 5h3v1.5A3.5 3.5 0 0115.8 10" />
      <path d="M12 13.5V17M8.5 20.5h7" />
    </>
  ),
  rights: (
    <>
      <path d="M5 4.5h9l5 5v10a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 013 19.5v-13A1.5 1.5 0 014.5 5z" />
      <path d="M13.5 4.5v5.5H19" />
    </>
  ),
  network: (
    <>
      <rect x="3.5" y="4.5" width="17" height="5" rx="1.5" />
      <rect x="3.5" y="14.5" width="17" height="5" rx="1.5" />
      <path d="M7 7h.01M7 17h.01" />
    </>
  ),
  audience: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c4.5 5 4.5 12 0 17-4.5-5-4.5-12 0-17z" />
    </>
  ),
  generic: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
    </>
  ),
};

export function BoardroomIcon({ glyph = 'generic' }: { glyph?: BoardroomGlyph }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[glyph] ?? PATHS.generic}
    </svg>
  );
}
