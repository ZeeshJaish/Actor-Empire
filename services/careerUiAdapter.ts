import type { Commitment, OwnedProductionActionId, OwnedProductionTrackType, Player } from '../types';
import { getAbsoluteWeek, getElapsedWeeks } from './legacyLogic';
import { deriveOwnedProductionCareerItems, getPlayerActingCommitments } from './ownedProductionCareer';
import { getBuzzLabel } from './roleLogic';

export type CareerUiStage = 'audition' | 'development' | 'prep' | 'shooting' | 'promo' | 'upcoming';

export interface CareerUiAction {
  label: string;
  energy: number;
  handlerId: string;
  disabled?: boolean;
  done?: boolean;
}

export interface CareerUiPromoMove extends CareerUiAction {
  id: 'post' | 'hype' | 'press';
  icon: 'camera' | 'megaphone' | 'mic';
  color: string;
  cooldownWeeks?: number;
}

export interface CareerUiProject {
  id: string;
  title: string;
  stage: CareerUiStage;
  weeks: number;
  status?: string;
  readiness?: number;
  milestone: string;
  primaryAction?: CareerUiAction;
  hype?: string;
  promo?: CareerUiPromoMove[];
  tags?: string[];
}

export interface CareerUiApplication {
  id: string;
  title: string;
  weeks: number;
}

export interface CareerUiProductionTask extends CareerUiAction {
  id: OwnedProductionActionId;
}

export interface CareerUiProductionTrack {
  type: OwnedProductionTrackType;
  label: string;
  progress: number;
  color: string;
  icon: 'camera' | 'video' | 'clapper';
  tasks: CareerUiProductionTask[];
}

export interface CareerUiProduction {
  id: string;
  title: string;
  studio: string;
  phase: string;
  week: number;
  weeks: number;
  phaseWeek: number;
  phaseWeeks: number;
  focusLoad: number;
  focusLeft: number;
  polish: number;
  polishMax: number;
  quality: number;
  tracks: CareerUiProductionTrack[];
}

export interface CareerUiModel {
  title: string;
  playerName: string;
  reputation: number;
  credits: number;
  energy: number;
  projects: CareerUiProject[];
  applications: CareerUiApplication[];
  productions: CareerUiProduction[];
}

const TRACK_STYLE: Record<OwnedProductionTrackType, { color: string; icon: CareerUiProductionTrack['icon'] }> = {
  ACTING: { color: 'var(--health)', icon: 'camera' },
  DIRECTING: { color: 'var(--acting)', icon: 'video' },
  PRODUCING: { color: 'var(--physique)', icon: 'clapper' },
};

const phaseLabel = (phase: Commitment['projectPhase']) => {
  if (phase === 'PRE_PRODUCTION') return 'PREP';
  if (phase === 'PRODUCTION') return 'ON SET';
  if (phase === 'POST_PRODUCTION') return 'POST';
  return 'PRODUCTION';
};

const weeksSincePress = (player: Player, commitment: Commitment) => (
  typeof commitment.lastPressAbsolute === 'number'
    ? Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - commitment.lastPressAbsolute)
    : getElapsedWeeks(
        player.age,
        commitment.lastPressWeek || Math.max(1, player.currentWeek - 10),
        player.age,
        player.currentWeek,
      )
);

const mapCommitment = (player: Player, commitment: Commitment): CareerUiProject | null => {
  const weeks = Math.max(0, Number(commitment.phaseWeeksLeft || 0));
  const readiness = Math.max(0, Math.min(100, Number(commitment.auditionPerformance || 0)));
  const performance = Math.max(0, Math.min(100, Number(commitment.productionPerformance || 0)));

  if (commitment.projectPhase === 'AUDITION') {
    const done = readiness >= 100;
    return {
      id: commitment.id,
      title: commitment.name,
      stage: 'audition',
      weeks,
      status: commitment.roleType ? `Role · ${commitment.roleType.replaceAll('_', ' ')}` : 'Casting',
      readiness,
      milestone: 'Selection in',
      primaryAction: { label: done ? 'Ready for audition' : 'Rehearse', energy: 20, handlerId: commitment.id, disabled: done, done },
    };
  }

  if (commitment.projectPhase === 'PLANNING') {
    return {
      id: commitment.id,
      title: commitment.name,
      stage: 'development',
      weeks,
      status: 'Scripting',
      milestone: 'Pre-production in',
    };
  }

  if (commitment.projectPhase === 'PRE_PRODUCTION') {
    const done = readiness >= 100;
    return {
      id: commitment.id,
      title: commitment.name,
      stage: 'prep',
      weeks,
      status: 'Prep phase',
      readiness,
      milestone: 'Shooting in',
      primaryAction: { label: done ? 'Ready to film' : 'Table read', energy: 10, handlerId: commitment.id, disabled: done, done },
    };
  }

  if (commitment.projectPhase === 'PRODUCTION') {
    const done = performance >= 100;
    return {
      id: commitment.id,
      title: commitment.name,
      stage: 'shooting',
      weeks,
      status: 'Shooting phase',
      readiness: performance,
      milestone: 'Wrap in',
      primaryAction: { label: done ? 'Scene perfected' : 'Rehearse scene', energy: 20, handlerId: commitment.id, disabled: done, done },
    };
  }

  if (commitment.projectPhase === 'POST_PRODUCTION') {
    const sincePress = weeksSincePress(player, commitment);
    const pressCooldown = Math.max(0, 4 - sincePress);
    return {
      id: commitment.id,
      title: commitment.name,
      stage: 'promo',
      weeks,
      status: 'Post-production',
      milestone: 'Releases in',
      hype: getBuzzLabel(commitment.promotionalBuzz || 0, 'en').label,
      promo: [
        { id: 'post', label: 'Post', energy: 10, handlerId: `PROMO_IG_${commitment.id}`, icon: 'camera', color: 'var(--looks)' },
        { id: 'hype', label: 'Hype', energy: 15, handlerId: `PROMO_X_${commitment.id}`, icon: 'megaphone', color: 'var(--acting)' },
        {
          id: 'press',
          label: 'Press',
          energy: 25,
          handlerId: `PROMO_PRESS_${commitment.id}`,
          icon: 'mic',
          color: 'var(--writing)',
          disabled: pressCooldown > 0,
          cooldownWeeks: pressCooldown,
        },
      ],
    };
  }

  if (commitment.projectPhase === 'SCHEDULED') {
    return {
      id: commitment.id,
      title: commitment.name,
      stage: 'upcoming',
      weeks,
      milestone: 'Starts in',
      tags: [commitment.projectDetails?.subtype, commitment.roleType]
        .filter(Boolean)
        .map(value => String(value).replaceAll('_', ' ')),
    };
  }

  return null;
};

export const buildCareerUiModel = (player: Player): CareerUiModel => ({
  title: 'Career Profile',
  playerName: player.name,
  reputation: Number(player.stats.reputation || 0),
  credits: (player.pastProjects || []).filter(project => project.type === 'ACTING_GIG').length,
  energy: Math.max(0, Number(player.energy.current || 0)),
  projects: getPlayerActingCommitments(player.commitments)
    .map(commitment => mapCommitment(player, commitment))
    .filter((project): project is CareerUiProject => Boolean(project)),
  applications: (player.applications || []).map(application => ({
    id: application.id,
    title: application.name,
    weeks: Math.max(0, Number(application.weeksRemaining || 0)),
  })),
  productions: deriveOwnedProductionCareerItems(player).map(item => ({
    id: item.commitment.id,
    title: item.commitment.name,
    studio: item.studioName,
    phase: phaseLabel(item.phase),
    week: item.projectWeek,
    weeks: item.totalProjectWeeks,
    phaseWeek: Math.max(1, item.phaseDurationWeeks - item.weeksLeft + 1),
    phaseWeeks: item.phaseDurationWeeks,
    focusLoad: item.focusLoadWeeks,
    focusLeft: item.focusWeeksRemaining,
    polish: item.qualityLift,
    polishMax: 15,
    quality: item.qualityScore,
    tracks: item.tracks.map(track => ({
      type: track.type,
      label: track.label,
      progress: track.progress,
      color: TRACK_STYLE[track.type].color,
      icon: TRACK_STYLE[track.type].icon,
      tasks: track.actions.map(action => ({
        id: action.id,
        label: action.shortLabel,
        energy: action.energyCost,
        handlerId: action.id,
        disabled: action.isMaxed,
        done: action.isMaxed,
      })),
    })),
  })),
});
