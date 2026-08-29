/**
 * EMPIRE+ — PRESENTATION LAYER ENTRY
 *
 * Importing this module installs the design system. It must be imported exactly
 * once, as early as possible in the streaming route, so tokens are defined
 * before any screen module's rules are evaluated.
 *
 * Order matters: tokens define the variables, primitives consume them.
 */
import './tokens.css';
import './primitives.css';

export {
  brandVars,
  brandHsl,
  contrastInkForBrand,
  toneForLoad,
  toneForHealth,
} from './brand';
export type { BrandTone, Tone } from './brand';
export { cx } from './cx';
