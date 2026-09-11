import type {
  ReleaseFilmArt,
  ReleaseFilmArtKind,
  ReleaseProjectArtSource,
  ReleaseStepMeta,
  ReleaseType,
  ReleaseWizardPhase,
  ReleaseWizardRoute,
} from './model';

const PHASE_LABELS: Record<ReleaseWizardPhase, string> = {
  DISTRIBUTION: 'Distribution',
  WAR: 'War Room',
  DESK: 'Theatrical Desk',
  CAMPAIGN: 'Campaign',
  FESTIVALS: 'Festivals',
  CALENDAR: 'Calendar',
  FINALIZE: 'Finalize',
};

const GENRE_ART: Record<string, { art: ReleaseFilmArtKind; hue: number }> = {
  THRILLER: { art: 'thriller', hue: 208 },
  MYSTERY: { art: 'thriller', hue: 208 },
  CRIME: { art: 'thriller', hue: 208 },
  DRAMA: { art: 'drama', hue: 28 },
  BIOPIC: { art: 'drama', hue: 28 },
  HORROR: { art: 'horror', hue: 352 },
  ROMANCE: { art: 'romance', hue: 326 },
  MUSICAL: { art: 'romance', hue: 326 },
  SCI_FI: { art: 'scifi', hue: 266 },
  FANTASY: { art: 'scifi', hue: 266 },
  ACTION: { art: 'action', hue: 14 },
  ADVENTURE: { art: 'action', hue: 14 },
  SUPERHERO: { art: 'action', hue: 14 },
};

export const toReleaseWizardRoute = (releaseType: ReleaseType | null): ReleaseWizardRoute =>
  releaseType === 'THEATRICAL' ? 'THEATRICAL' : 'STREAMING';

export const getReleaseWizardPhase = (
  step: number,
  releaseType: ReleaseType | null,
  isPostTheatricalBidding = false,
): ReleaseWizardPhase => {
  if (isPostTheatricalBidding) return 'WAR';
  if (step <= 1) return 'DISTRIBUTION';
  if (step === 2) return releaseType === 'THEATRICAL' ? 'DESK' : 'WAR';
  if (step === 3) return 'CAMPAIGN';
  if (step === 4) return 'FESTIVALS';
  if (step === 5) return 'CALENDAR';
  return 'FINALIZE';
};

export const getReleaseWizardProgress = (
  step: number,
  releaseType: ReleaseType | null,
): ReleaseStepMeta[] => {
  const routePhase: ReleaseWizardPhase = releaseType === 'THEATRICAL' ? 'DESK' : 'WAR';
  const phases: ReleaseWizardPhase[] = [
    'DISTRIBUTION',
    routePhase,
    'CAMPAIGN',
    'FESTIVALS',
    'CALENDAR',
    'FINALIZE',
  ];
  const currentIndex = Math.max(0, Math.min(phases.length - 1, step - 1));

  return phases.map((id, index) => ({
    id,
    label: PHASE_LABELS[id],
    index,
    state: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
  }));
};

export const buildReleaseFilmArt = (project: ReleaseProjectArtSource): ReleaseFilmArt => {
  const genre = (project.projectDetails?.genre || project.genre || 'DRAMA').toUpperCase();
  const visual = GENRE_ART[genre] || GENRE_ART.DRAMA;

  const title = (project.name || project.title || 'Untitled Project').replace(/\s*\(release ready\)\s*$/i, '');
  return {
    title,
    art: visual.art,
    hue: visual.hue,
    tagline: 'RELEASE READY',
  };
};
