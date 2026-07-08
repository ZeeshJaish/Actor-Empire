import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const home = read('views/HomePage.tsx');
const packageJson = read('package.json');

const checks = [
    [home, 'triggerEnergyFeatureCareerQa', 'energy QA cheat handler'],
    [home, 'Energy Feature QA', 'visible energy QA section heading'],
    [home, 'Career Production Energy QA', 'full-energy Career QA button'],
    [home, 'Low Energy Button QA', 'low-energy disabled-state QA button'],
    [home, 'cheat_energy_prep_', 'pre-production owned project fixture'],
    [home, 'cheat_energy_production_', 'production owned project fixture'],
    [home, 'cheat_energy_post_', 'post-production owned project fixture'],
    [home, "setPage?.(Page.CAREER)", 'direct navigation to Career page'],
    [home, 'Available Energy should show 100E', 'full-energy user test cue'],
    [home, 'Available Energy should show 6E', 'low-energy user test cue'],
    [home, 'Producer Investment Gate', 'outside investment energy-gate shortcut'],
    [home, 'Creator Collab Gate', 'collaboration energy-gate shortcut'],
    [home, 'Studio Acquisition Gate', 'studio acquisition energy-gate shortcut'],
    [home, 'Greenlight / Studio Gate', 'greenlight and studio signing shortcut'],
    [packageJson, 'audit:energy-feature-qa-cheat', 'package script for energy QA cheat audit'],
];

const missing = checks.filter(([source, needle]) => !source.includes(needle));

if (missing.length > 0) {
    console.error('Energy feature QA cheat audit failed:');
    for (const [, needle, label] of missing) {
        console.error(`- Missing ${label}: ${needle}`);
    }
    process.exit(1);
}

console.log('Energy feature QA cheat audit passed.');
