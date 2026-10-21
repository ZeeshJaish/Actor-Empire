import { INITIAL_PLAYER, type Player, type ProjectDetails, type AuditionOpportunity } from '../../types';

/** Isolated authored fixtures. Never load a player save or write audit results over old evidence. */
export const makeCinemaFixture = (seed = 1): { player: Player; project: ProjectDetails; opportunity: AuditionOpportunity } => {
  const player = structuredClone(INITIAL_PLAYER);
  player.id = `cinema-fixture-${seed}`;
  player.name = 'Cinema Fixture';
  player.age = 30; player.currentWeek = 20; player.stats.fame = 50;
  const project: ProjectDetails = {
    title: `Cinema fixture ${seed}`, type: 'MOVIE', description: 'An authored theatrical audit package.',
    studioId: 'UNIVERSAL', subtype: 'STANDALONE', genre: 'ACTION', format: 'LIVE_ACTION',
    budgetTier: 'HIGH', estimatedBudget: 210_000_000, releaseStrategy: 'THEATRICAL', visibleHype: 'MID',
    directorName: 'Fixture Director', visibleDirectorTier: 'PROFESSIONAL', visibleScriptBuzz: 'MID', visibleCastStrength: 'Solid',
    hiddenStats: { scriptQuality: 75, directorQuality: 75, castingStrength: 75, distributionPower: 80,
      rawHype: 80, qualityScore: 75, prestigeBonus: 0, fameMultiplier: 1, boxOfficeCapRoll: 0.5 },
  };
  const opportunity: AuditionOpportunity = {
    id: `cinema-offer-${seed}`, roleType: 'LEAD', projectName: project.title, genre: project.genre,
    config: { label: 'Lead', difficulty: 70, energyCost: 40, baseIncome: 10_000, expGain: 10 },
    project, estimatedIncome: 1_000_000, source: 'AGENT',
  };
  return { player, project, opportunity };
};
