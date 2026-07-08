import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'views/AwardNightFlow.tsx',
  'views/RedCarpetEvent.tsx',
  'views/PressConferenceEvent.tsx'
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}

const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : '';

const awardFlow = read('views/AwardNightFlow.tsx');
const redCarpet = read('views/RedCarpetEvent.tsx');
const pressConference = read('views/PressConferenceEvent.tsx');

const expectIncludes = (label, source, needle) => {
  if (!source.includes(needle)) failures.push(`${label} should include ${needle}`);
};

expectIncludes('AwardNightFlow', awardFlow, 'export const AwardNightFlow');
expectIncludes('AwardNightFlow', awardFlow, 'export const AwardPressConferenceScene');
expectIncludes('AwardNightFlow', awardFlow, "export type AwardNightMode = 'AWARDS' | 'RED_CARPET'");
expectIncludes('AwardNightFlow', awardFlow, 'mode?: AwardNightMode');
expectIncludes('AwardNightFlow', awardFlow, "cfg.mode === 'RED_CARPET' ? 'SUMMARY' : 'CEREMONY'");
expectIncludes('AwardNightFlow', awardFlow, "const isRedCarpetOnly = cfg.mode === 'RED_CARPET'");
expectIncludes('AwardNightFlow', awardFlow, 'summaryTitle?: string');
expectIncludes('AwardNightFlow', awardFlow, 'playerCategories?: PlayerAwardCategory[]');
expectIncludes('AwardNightFlow', awardFlow, 'onPressComplete?: (result: AwardPressResult) => void');
expectIncludes('AwardNightFlow', awardFlow, 'Press Conference Over');
expectIncludes('AwardNightFlow', awardFlow, "export type VehicleType = 'LIMO' | 'CAR' | 'SUPERCAR' | 'SUV' | 'BIKE' | 'HELI' | 'YACHT'");
expectIncludes('AwardNightFlow', awardFlow, 'vt?: VehicleType');
expectIncludes('AwardNightFlow', awardFlow, 'ARRIVE_FLAVOR');
expectIncludes('AwardNightFlow', awardFlow, 'doorlight');
if (awardFlow.includes('const LimoSvg')) failures.push('AwardNightFlow should use the updated Door Moment arrival, not LimoSvg vehicle art');

expectIncludes('RedCarpetEvent', redCarpet, 'AwardNightFlow');
expectIncludes('RedCarpetEvent', redCarpet, 'buildAwardNightConfig');
expectIncludes('RedCarpetEvent', redCarpet, 'getAwardNightVehicleType');
expectIncludes('RedCarpetEvent', redCarpet, "mode: 'RED_CARPET'");
expectIncludes('RedCarpetEvent', redCarpet, "summaryTitle: 'Premiere Highlights'");
expectIncludes('RedCarpetEvent', redCarpet, "completeLabel: 'Leave Premiere & Save'");
expectIncludes('RedCarpetEvent', redCarpet, 'determineWinners');
expectIncludes('RedCarpetEvent', redCarpet, 'generateSeasonWinners');
expectIncludes('RedCarpetEvent', redCarpet, 'updatedPlayer.pendingEvent = null');

expectIncludes('PressConferenceEvent', pressConference, 'AwardPressConferenceScene');
expectIncludes('PressConferenceEvent', pressConference, 'mapPressInteractionsToAwardQuestions');
expectIncludes('PressConferenceEvent', pressConference, 'onComplete(finalStats, finalBuzz, message)');

if (failures.length) {
  console.error('Award night flow audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Award night flow audit passed.');
