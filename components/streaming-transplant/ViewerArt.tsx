/**
 * A title's picture in the viewer app: the poster the app has always drawn (#114), shared by every home, row and lead.
 *
 * #121 gave each title genre "key art" (motifs, grain, titles set by genre). Zeesh, 2026-11-01, #123: "जो premade images
 * of the project … पहले जैसे थे premium … अब काफ़ी ज़्यादा gradient और flashy है, to we should change to previous ones".
 * So the picture is the previous one again:
 *  - the title's colour as a quiet two-tone gradient;
 *  - its name as a large ghost in the service's typeface;
 *  - the service's mark on an Original;
 *  - on a poster, the name in a caption bar at the foot (a banner leaves it to the copy the lead prints).
 * Sized in container units, so the ghost and the caption keep their proportions on a 92px card or a full-width banner.
 * Pure presentation.
 */
import React from 'react';
import css from './presentation/screens/ViewerApp/ViewerArt.module.css';
import { cx } from './presentation/cx';
import { Mark, typeFace, type Brand } from './StreamingBrandVisuals';

export interface ViewerArtTitle {
  id: string;
  title: string;
  genre: string;
  hue: number;
  kind: string;
}

export const ViewerArt: React.FC<{
  t: ViewerArtTitle;
  brand: Brand;
  /** a poster: the name in the caption bar at its foot; a lead that prints the name itself leaves it off */
  title?: boolean;
  /** the service's mark on an Original, top left */
  badge?: boolean;
  /** a banner (16:9 and wider): its own light and a larger ghost */
  wide?: boolean;
  className?: string;
}> = ({ t, brand, title = true, badge = true, wide = false, className }) => (
  <span className={cx(css.art, wide && css.wide, className)} style={{ ['--h' as string]: `${t.hue}` } as React.CSSProperties} aria-hidden="true">
    <span className={css.ghost} style={{ fontFamily: typeFace(brand).stack }}>{t.title}</span>
    {badge && t.kind === 'ORIGINAL' && <i className={css.orig}><Mark brand={brand} /></i>}
    {title && <span className={css.cap}>{t.title}</span>}
  </span>
);

export default ViewerArt;
