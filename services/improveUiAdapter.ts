import type {
  ActorSkills,
  Commitment,
  DirectorStats,
  Genre,
  ImprovementActivity,
  ImprovementOption,
  Player,
  WriterStats,
} from '../types';
import {
  GENRE_TRAINING_CATALOG,
  IMPROVEMENT_CATALOG,
  WORKSHOP_CATALOG,
  type ImproveCategory,
} from './lifestyleLogic';
import { formatGenreLabel } from './genreCatalog';
import { getPlayerLanguage, t } from './i18n';
import { calculateGlobalTalent } from './roleLogic';
import type { IconName } from '../components/ui-overhaul/ui';

export interface ImproveUiFocus {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: IconName;
}

export interface ImproveUiEffect {
  label: string;
  kind?: 'gain' | 'risk';
}

export interface ImproveUiActionRequest {
  category: ImproveCategory;
  activityName: string;
  option: ImprovementOption;
}

export interface ImproveUiAction {
  id: string;
  name: string;
  description: string;
  energy: number;
  cost: number;
  effects: ImproveUiEffect[];
  scene: ImproveUiScene;
  request: ImproveUiActionRequest;
}

export interface ImproveUiVenue {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  color: string;
  actions: ImproveUiAction[];
}

export type ImproveUiDisciplineKey = 'acting' | 'writing' | 'directing';

export interface ImproveUiDiscipline extends ImproveUiFocus {
  key: ImproveUiDisciplineKey;
}

export interface ImproveUiCourse {
  catalogId: string;
  name: string;
  discipline: ImproveUiDisciplineKey;
  energy: number;
  cost: number;
  weeks: number;
  weeksCompleted: number;
  activeCommitmentId?: string;
  effects: ImproveUiEffect[];
  scene: 'stage' | 'desk';
  commitment: Commitment;
}

export interface ImproveUiGenre {
  genre: Genre;
  name: string;
  description: string;
  points: number;
  pointsMax: number;
  energy: number;
  cost: number;
  gain: number;
}

export interface ImproveUiSkill {
  name: string;
  value: number;
}

export interface ImproveUiSkillGroup {
  key: ImproveUiDisciplineKey;
  label: string;
  color: string;
  skills: ImproveUiSkill[];
}

export type ImproveUiScene = 'gym' | 'cardio' | 'outdoor' | 'box' | 'stage' | 'desk';

export interface ImproveUiModel {
  title: string;
  talent: number;
  money: number;
  availableEnergy: number;
  committedEnergy: number;
  capacityFree: number;
  condition: ImproveUiFocus[];
  disciplines: ImproveUiDiscipline[];
  venues: ImproveUiVenue[];
  courses: ImproveUiCourse[];
  genres: ImproveUiGenre[];
  skillGroups: ImproveUiSkillGroup[];
}

const average = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
  : 0;

const titleCase = (value: string) => value
  .replace(/_/g, ' ')
  .toLowerCase()
  .replace(/(^|\s)\S/g, match => match.toUpperCase());

const formatGain = (key: string, value: number) => `+${Number(value).toFixed(1).replace(/\.0$/, '')} ${key.toUpperCase()}`;

const effectsFor = (
  gains: Partial<Record<string, number>> = {},
  writerGains: Partial<Record<string, number>> = {},
  directorGains: Partial<Record<string, number>> = {},
  risk = 0,
): ImproveUiEffect[] => [
  ...Object.entries(gains).filter(([, value]) => typeof value === 'number').map(([key, value]) => ({ label: formatGain(key, Number(value)) })),
  ...Object.entries(writerGains).filter(([, value]) => typeof value === 'number').map(([key, value]) => ({ label: formatGain(key, Number(value)) })),
  ...Object.entries(directorGains).filter(([, value]) => typeof value === 'number').map(([key, value]) => ({ label: formatGain(key, Number(value)) })),
  ...(risk > 0 ? [{ label: `${risk}% RISK`, kind: 'risk' as const }] : []),
];

const activityScene = (activity: ImprovementActivity, option: ImprovementOption): ImproveUiScene => {
  const key = `${activity.id} ${option.id}`.toLowerCase();
  if (/cross|wod|box/.test(key)) return 'box';
  if (/outdoor|jog|hike|run|trail/.test(key)) return 'outdoor';
  if (/cardio/.test(key)) return 'cardio';
  if (/gym|weight|fitness|body/.test(key)) return 'gym';
  if (/write|journal|read|therapy|meditat/.test(key)) return 'desk';
  return 'stage';
};

const venueIcon = (activity: ImprovementActivity): IconName => {
  const key = `${activity.id} ${activity.name}`.toLowerCase();
  if (/outdoor|park|run|hike/.test(key)) return 'map';
  if (/cross|box/.test(key)) return 'flame';
  if (/health|doctor|clinic|therapy/.test(key)) return 'pulse';
  if (/look|salon|spa|style/.test(key)) return 'sparkles';
  if (/mood|social|friend/.test(key)) return 'smile';
  return 'dumbbell';
};

const disciplineOf = (course: Commitment): ImproveUiDisciplineKey => {
  if (course.writerGains && Object.keys(course.writerGains).length) return 'writing';
  if (course.directorGains && Object.keys(course.directorGains).length) return 'directing';
  return 'acting';
};

const skillEntries = <T extends Record<string, number>>(stats: T, labels?: Partial<Record<keyof T, string>>): ImproveUiSkill[] =>
  Object.entries(stats).map(([key, value]) => ({
    name: String(labels?.[key as keyof T] || titleCase(key)).toUpperCase(),
    value: Number(value || 0),
  }));

export const buildImproveUiModel = (player: Player): ImproveUiModel => {
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const fallback = (key: string, value: string) => {
    const translated = tr(key);
    return translated === key ? value : translated;
  };
  const actorSkills = player.stats.skills;
  const writerStats: WriterStats = player.writerStats || { creativity: 0, dialogue: 0, structure: 0, pacing: 0 };
  const directorStats: DirectorStats = player.directorStats || { vision: 0, technical: 0, leadership: 0, style: 0 };
  const committedEnergy = player.commitments.reduce((sum, commitment) => (
    commitment.type === 'ACTING_GIG' ? sum : sum + Math.max(0, Number(commitment.energyCost || 0))
  ), 0);

  const condition: ImproveUiFocus[] = [
    { key: 'health', label: tr('home.health'), value: player.stats.health, color: 'var(--health)', icon: 'heart' },
    { key: 'physique', label: tr('home.physique'), value: player.stats.body, color: 'var(--physique)', icon: 'dumbbell' },
    { key: 'mood', label: tr('home.mood'), value: player.stats.happiness, color: 'var(--mood)', icon: 'smile' },
    { key: 'looks', label: tr('home.looks'), value: player.stats.looks, color: 'var(--looks)', icon: 'sparkles' },
  ];
  const skillGroups: ImproveUiSkillGroup[] = [
    { key: 'acting', label: tr('improve.actingSkills'), color: 'var(--acting)', skills: skillEntries(actorSkills as ActorSkills & Record<string, number>) },
    { key: 'writing', label: tr('improve.writerStats'), color: 'var(--writing)', skills: skillEntries(writerStats as WriterStats & Record<string, number>) },
    { key: 'directing', label: tr('improve.directorStats'), color: 'var(--directing)', skills: skillEntries(directorStats as DirectorStats & Record<string, number>) },
  ];
  const disciplines: ImproveUiDiscipline[] = skillGroups.map(group => ({
    key: group.key,
    label: group.key.toUpperCase(),
    value: average(group.skills.map(skill => skill.value)),
    color: group.color,
    icon: group.key === 'acting' ? 'masks' : group.key === 'writing' ? 'penTool' : 'monitor',
  }));

  const venues: ImproveUiVenue[] = (Object.entries(IMPROVEMENT_CATALOG) as [ImproveCategory, ImprovementActivity[]][])
    .flatMap(([category, activities]) => activities.map(activity => ({
      id: activity.id,
      name: fallback(activity.nameKey || `improve.activity.${activity.id}.name`, activity.name),
      description: fallback(activity.descriptionKey || `improve.activity.${activity.id}.desc`, activity.description),
      icon: venueIcon(activity),
      color: category === 'HEALTH' ? 'var(--health)' : category === 'LOOKS' ? 'var(--looks)' : category === 'MOOD' ? 'var(--mood)' : 'var(--physique)',
      actions: activity.options.map(option => {
        const optionName = fallback(option.nameKey || `improve.option.${option.id}.name`, option.label);
        return {
          id: `${category}-${activity.id}-${option.id}`,
          name: optionName,
          description: fallback(option.descriptionKey || `improve.option.${option.id}.desc`, option.description),
          energy: option.energyCost,
          cost: option.moneyCost,
          effects: effectsFor(option.gains as Partial<Record<string, number>>, option.writerGains as Partial<Record<string, number>>, option.directorGains as Partial<Record<string, number>>, option.risk),
          scene: activityScene(activity, option),
          request: { category, activityName: fallback(activity.nameKey || `improve.activity.${activity.id}.name`, activity.name), option: { ...option, label: optionName } },
        };
      }),
    })));

  const courses: ImproveUiCourse[] = WORKSHOP_CATALOG.map(course => {
    const active = player.commitments.find(commitment => commitment.type === 'COURSE' && (
      (course.nameKey && commitment.nameKey === course.nameKey) || commitment.name === course.name
    ));
    return {
      catalogId: course.id,
      name: fallback(course.nameKey || `improve.workshop.${course.id}`, course.name),
      discipline: disciplineOf(course),
      energy: course.energyCost,
      cost: Number(course.upfrontCost || 0),
      weeks: Number(course.totalDuration || 0),
      weeksCompleted: Number(active?.weeksCompleted || 0),
      activeCommitmentId: active?.id,
      effects: effectsFor(
        course.skillGains as Partial<Record<string, number>>,
        course.writerGains as Partial<Record<string, number>>,
        course.directorGains as Partial<Record<string, number>>,
      ),
      scene: disciplineOf(course) === 'acting' ? 'stage' : 'desk',
      commitment: course,
    };
  });

  const genres: ImproveUiGenre[] = GENRE_TRAINING_CATALOG.map(training => ({
    genre: training.genre,
    name: fallback(training.labelKey, training.label),
    description: fallback(training.descriptionKey, training.desc),
    points: Math.max(0, Number(player.stats.genreXP[training.genre] || 0)),
    pointsMax: 100,
    energy: training.energy,
    cost: training.cost,
    gain: training.gain,
  }));

  return {
    title: tr('improve.title'),
    talent: calculateGlobalTalent(actorSkills, player.writerStats, player.directorStats),
    money: player.money,
    availableEnergy: Math.max(0, Number(player.energy.current || 0)),
    committedEnergy,
    capacityFree: Math.max(0, 100 - committedEnergy),
    condition,
    disciplines,
    venues,
    courses,
    genres,
    skillGroups,
  };
};
