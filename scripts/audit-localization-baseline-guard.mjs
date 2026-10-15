import assert from 'node:assert/strict';
import { compareEnglishBaseline } from './helpers/localizationBaselineGuard.mjs';

const baseline = {
  schemaVersion: 1,
  englishTranslations: { 'common.back': 'Back', 'example.line': 'Hello, {name}.' },
  reactionCases: { opening: 'frozen-hash', critic: 'other-hash' },
  bankShape: { TRADE_FRAMES: ['{title} {commercial}', 'Second frame'] },
  combinationEstimate: 8_000_000_000,
  producers: { x: [{ id: 'stable_id', content: 'English post' }] },
};
assert.deepEqual(compareEnglishBaseline(baseline, structuredClone(baseline)), []);
const additive = structuredClone(baseline);
additive.englishTranslations['new.feature'] = 'New English feature';
assert.deepEqual(compareEnglishBaseline(baseline, additive), [], 'New English keys may be added');
const changedText = structuredClone(baseline);
changedText.englishTranslations['common.back'] = 'Go back';
assert(compareEnglishBaseline(baseline, changedText).some(message => message.includes('common.back')), 'Guard must reject altered existing English wording');
const removedText = structuredClone(baseline);
delete removedText.englishTranslations['example.line'];
assert(compareEnglishBaseline(baseline, removedText).some(message => message.includes('example.line')), 'Guard must reject removed English keys');
const changedReaction = structuredClone(baseline);
changedReaction.reactionCases.opening = 'new-hash';
assert(compareEnglishBaseline(baseline, changedReaction).some(message => message.includes('opening')), 'Guard must reject changed generated output');
const removedReaction = structuredClone(baseline);
delete removedReaction.reactionCases.critic;
assert(compareEnglishBaseline(baseline, removedReaction).some(message => message.includes('critic')), 'Guard must reject missing generated scenarios');
for (const field of ['bankShape', 'combinationEstimate', 'producers', 'schemaVersion']) {
  const changed = structuredClone(baseline);
  if (field === 'bankShape') changed.bankShape.TRADE_FRAMES.reverse();
  if (field === 'combinationEstimate') changed.combinationEstimate = 1;
  if (field === 'producers') changed.producers.x[0].id = 'different_id';
  if (field === 'schemaVersion') changed.schemaVersion = 2;
  assert(compareEnglishBaseline(baseline, changed).some(message => message.includes(field)), `Guard must reject drift in ${field}`);
}
console.log('English baseline guard audit passed: unchanged/additive English accepted; eight regression types rejected.');
