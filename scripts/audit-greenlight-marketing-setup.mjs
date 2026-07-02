import { readFileSync } from 'node:fs';

const greenlight = readFileSync('views/lifestyle/business/GreenlightWizard.tsx', 'utf8');
const types = readFileSync('types.ts', 'utf8');

const requireIncludes = (source, needle, description) => {
  if (!source.includes(needle)) {
    throw new Error(`Greenlight marketing setup missing ${description}: ${needle}`);
  }
};

for (const [needle, description] of [
  ['Movie Setup', 'renamed Setup page title'],
  ["'Setup'", 'progress tracker Setup label'],
  ['Next: Movie Setup', 'location step CTA renamed to Movie Setup'],
  ['marketingBudgetPreset', 'marketing budget preset state'],
  ['reservedMarketingBudget', 'reserved marketing budget state/project field'],
  ['MARKETING_BUDGET_PRESETS', 'marketing budget presets'],
  ['setReservedMarketingBudget', 'interactive budget allotment control'],
  ['availableGreenlightFunds', 'wallet-aware campaign reserve cap'],
  ['maxMarketingBudget', 'campaign reserve max based on available studio funding'],
  ['packageBudget', 'combined production plus marketing package cost'],
  ['Reserved Campaign Budget', 'setup page reserved campaign budget section'],
  ['Production Budget', 'confirm page production budget display'],
  ['Total Package', 'setup/confirm total package display'],
  ['Campaign Pool', 'confirm page campaign pool display'],
]) {
  requireIncludes(greenlight, needle, description);
}

for (const [needle, description] of [
  ['reservedMarketingBudget?: number', 'ProjectDetails reserved marketing budget field'],
  ['marketingBudgetSpent?: number', 'ProjectDetails marketing spent field'],
  ['marketingBudgetRemaining?: number', 'ProjectDetails marketing remaining field'],
]) {
  requireIncludes(types, needle, description);
}

if (greenlight.includes("['Script', 'Director', 'Cast', 'Crew', 'Gear', 'Loc', 'Tone', 'Go']")) {
  throw new Error('Progress tracker should not still label step 7 as Tone.');
}

if (greenlight.includes('budgetBreakdown.total * 0.75')) {
  throw new Error('Marketing reserve should not use the old production-percent slider cap.');
}

const setupSection = greenlight.split("{step === 'SETUP' && (")[1]?.split('{/* Universe & Franchise Connection */')[0] || '';
for (const forbidden of ['Production Budget', 'Campaign Pool', 'Total Package']) {
  if (setupSection.includes(forbidden)) {
    throw new Error(`Setup page should not duplicate final billing row: ${forbidden}`);
  }
}

console.log('Greenlight marketing setup audit passed.');
