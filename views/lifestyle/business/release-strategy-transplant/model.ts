export type ReleaseWizardPhase =
  | 'DISTRIBUTION'
  | 'WAR'
  | 'DESK'
  | 'CAMPAIGN'
  | 'FESTIVALS'
  | 'CALENDAR'
  | 'FINALIZE';

export type ReleaseWizardRoute = 'THEATRICAL' | 'STREAMING';

export type ReleaseType = 'THEATRICAL' | 'STREAMING_ONLY';

export type ReleaseFilmArtKind =
  | 'thriller'
  | 'drama'
  | 'horror'
  | 'romance'
  | 'scifi'
  | 'action';

export interface ReleaseFilmArt {
  title: string;
  art: ReleaseFilmArtKind;
  hue: number;
  tagline: string;
}

export interface ReleaseStepMeta {
  id: ReleaseWizardPhase;
  label: string;
  index: number;
  state: 'complete' | 'current' | 'upcoming';
}

export interface ReleaseProjectArtSource {
  name?: string | null;
  title?: string | null;
  projectDetails?: {
    genre?: string | null;
  } | null;
  genre?: string | null;
}
