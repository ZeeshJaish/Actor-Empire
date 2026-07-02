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
        && source.includes('Medical Team')
        && source.includes('publicity');
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
        && source.includes('Active Medical Issue')
        && source.includes('Health cap')
        && source.includes('Treatment match');
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
