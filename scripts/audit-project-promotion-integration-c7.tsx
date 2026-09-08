// @ts-nocheck - source-level C7 social integration audit.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(`${process.cwd()}/${path}`, 'utf8');
const hook = read('hooks/useGameActions.ts');
const app = read('App.tsx');
const x = read('views/mobile/XApp.tsx');
const instagram = read('views/mobile/InstagramApp.tsx');
const youtube = read('views/mobile/YoutubeApp.tsx');

assert.match(hook, /applyProjectPromotionAttribution/, 'Career promotion must use the shared exact-once service');
assert.match(app, /applyProjectPromotionAttribution/, 'Press promotion must use the same service');
assert.match(x, /promotedProjectId/);
assert.match(instagram, /promotedProjectId/);
assert.match(youtube, /promotedProjectId/);
[x, instagram, youtube].forEach(source => assert.match(source, /getEligiblePromotionProjects/));

console.log('C7 project promotion integration audit passed.');
