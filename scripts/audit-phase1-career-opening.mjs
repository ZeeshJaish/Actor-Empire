import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('App.tsx', 'utf8');
const intro = readFileSync('components/ActorEmpireIntro.tsx', 'utf8');
const selection = app.split('const handleSelectSlot = async')[1]?.split('\n  useEffect(() => {')[0];
assert.ok(selection, 'Save selection handler must exist.');
assert.match(selection, /setCareerOpening\(/, 'Selecting a career must activate its own loading state.');
assert.match(selection, /await yieldToMainThread\(/, 'The loading state must get a paint opportunity before save verification.');
assert.ok(selection.indexOf('setCareerOpening(') < selection.indexOf('await loadVerifiedGameData('), 'Career loading must begin before verified storage work.');
assert.doesNotMatch(selection, /setIsInitializing\(/, 'Career opening must not reuse startup progress.');
assert.match(app, /if \(careerOpening\)/, 'Career opening must render a separate scene.');
assert.match(intro, /ActorEmpireCareerOpeningScreen/, 'Actor-themed loading scene must exist.');
console.log('Phase 1 career-opening wiring audit passed.');
