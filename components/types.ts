import type { ProfileBuilderSelection } from '../services/profileBuilder';

export interface SaveSlot {
  name: string;
  age: number;
  fame: number;
}

/** null = empty slot ("create a new star") */
export type SlotEntry = SaveSlot | null;

export interface NewCareerData {
  presetIndex: number;
  gender: 'Male' | 'Female' | 'Non-Binary';
  stageName: string;
  handle: string;
  age: number;
  avatarDataUrl?: string;
  profileSelection?: ProfileBuilderSelection;
}

/** Phase class strings used by the intro acts (mirrors the original HTML class machine). */
export type ActState = '' | 'on' | 'on exit' | 'on lit';
