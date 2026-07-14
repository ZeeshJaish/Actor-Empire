import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  {
    name: 'health condition service exists',
    pass: () => exists('services/healthConditions.ts'),
  },
  {
    name: 'condition registry defines incidents, caps, drain, treatment, and death risk',
    pass: () => {
      if (!exists('services/healthConditions.ts')) return false;
      const source = read('services/healthConditions.ts');
      return source.includes('HEALTH_CONDITION_REGISTRY')
        && source.includes('healthCap')
        && source.includes('weeklyHealthDrain')
        && source.includes('treatmentTags')
        && source.includes('deathRisk');
    },
  },
  {
    name: 'registry covers workload, production, nightlife, serious illness, and old age',
    pass: () => {
      if (!exists('services/healthConditions.ts')) return false;
      const source = read('services/healthConditions.ts');
      return source.includes('workload_headache')
        && source.includes('back_pain')
        && source.includes('stunt_fracture')
        && source.includes('party_accident')
        && source.includes('cancer_scare')
        && source.includes('old_age_complication');
    },
  },
  {
    name: 'player type stores active health conditions',
    pass: () => {
      const source = read('types.ts');
      return source.includes('HealthConditionState')
        && source.includes('activeHealthConditions?: HealthConditionState[]');
    },
  },
  {
    name: 'weekly loop applies condition caps and incidents',
    pass: () => {
      const source = read('services/gameLoop.ts');
      return source.includes('processHealthConditionsWeek')
        && source.includes('healthConditionsResult')
        && source.includes('activeHealthConditions');
    },
  },
  {
    name: 'event incidents share one medical incident helper',
    pass: () => {
      const source = read('services/healthConditions.ts');
      return source.includes('applyHealthConditionIncident')
        && source.includes('services.health.inbox.sender')
        && source.includes('publicity');
    },
  },
  {
    name: 'care team can quietly handle minor issues without replacing clinic treatment',
    pass: () => {
      const source = read('services/healthConditions.ts');
      const locale = read('services/localization/locales/en.ts');
      return source.includes('canCareTeamAutoHandleCondition')
        && source.includes('getCareTeamConditionSupportPower')
        && source.includes('careTeamMinorConditionIds')
        && source.includes('lastCareTeamAutoHandleAbsoluteWeek')
        && source.includes('services.health.careTeam.handled')
        && locale.includes('Care Team handled {condition} before it became a Health Clinic issue.');
    },
  },
  {
    name: 'medical prompts throttle minor and moderate repeat alerts',
    pass: () => {
      const source = read('App.tsx');
      return source.includes('getMedicalPromptCooldownWeeks')
        && source.includes('getMedicalPromptSeverityRank')
        && source.includes('lastMedicalPromptAbsoluteWeek')
        && source.includes('promptCooldownWeeks === 0')
        && source.includes('.sort((a, b) => getMedicalPromptSeverityRank(b.severity) - getMedicalPromptSeverityRank(a.severity))');
    },
  },
  {
    name: 'guide explains why care team and health clinic both exist',
    pass: () => {
      const guide = read('components/GuideView.tsx');
      const locale = read('services/localization/locales/en.ts');
      return guide.includes('HEALTH_CARE')
        && guide.includes('FAQ_HEALTH')
        && guide.includes('problem.health.title')
        && locale.includes('Why both exist')
        && locale.includes('Care Team is weekly prevention and light handling')
        && locale.includes('Health Clinic is direct treatment');
    },
  },
  {
    name: 'wellness treatment resolves active conditions',
    pass: () => {
      const source = read('services/lifestyleActivities.ts');
      return source.includes('resolveHealthConditionTreatment')
        && source.includes('treatedConditions')
        && source.includes('conditionTreatmentTags');
    },
  },
  {
    name: 'wellness treatment handles private care and old age stabilization',
    pass: () => {
      const source = read('services/healthConditions.ts');
      return source.includes('treatmentPrivacy')
        && source.includes('oldAgeCareDelayWeeks')
        && source.includes('Old age complication stabilized');
    },
  },
  {
    name: 'nightlife can create medical incidents without generic wellness flooding',
    pass: () => {
      const source = read('services/lifestyleActivities.ts');
      return source.includes('nightlifeHealthCondition')
        && source.includes('party_accident')
        && source.includes('applyHealthConditionIncident');
    },
  },
  {
    name: 'production can create stunt injury incidents',
    pass: () => {
      const source = read('services/gameLoop.ts');
      return source.includes('productionHealthIncident')
        && source.includes('stunt_fracture')
        && source.includes('applyHealthConditionIncident');
    },
  },
  {
    name: 'wellness UI surfaces active medical issues',
    pass: () => {
      const source = read('views/lifestyle/LifestyleActivities.tsx');
      return source.includes('activeHealthConditions')
        && source.includes('activities.wellnessPreview.activeIssue')
        && source.includes('activities.wellnessPreview.healthCap')
        && source.includes('activities.wellnessPreview.treatmentMatch');
    },
  },
  {
    name: 'audit script is registered',
    pass: () => {
      const pkg = JSON.parse(read('package.json'));
      return pkg.scripts?.['audit:health-conditions'] === 'node scripts/audit-health-conditions.mjs';
    },
  },
];

const failures = checks.filter((check) => !check.pass());

if (failures.length) {
  console.error('Health conditions audit failed:');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(`Health conditions audit passed (${checks.length} checks).`);
