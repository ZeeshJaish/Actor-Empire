/** #144 (plan §20.10 point 4): the campaign scenes prototype, its geometry and its backdrops.
 *  - a creative mapped onto a billboard lands exactly on the board's four corners (the matrix3d's homography);
 *  - a backdrop always covers its box, with its focus as near the middle as the edges allow;
 *  - the Burj Khalifa's facade outline is ordered top to bottom, left of right, and read between its rows;
 *  - every scene's backdrop is in the game, the size it says, and small enough to load in the background.
 * #156 (plan §20.13): every format's scene. Each scene has a half-size thumb for the How cards; every face of a quad
 * scene (six posters, five flyers, two airport screens) lands on its corners inside the backdrop; outlines run top to
 * bottom (the water, when there is any, below them); the London Eye's rim sits inside the frame above the river; the
 * drone show's sky is above its water; every format but the online ones (drawn) has a scene, a light show the one of
 * its landmark's country. */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { coverFrame, quadMatrix3d } from '../components/campaigns/scenes/sceneGeometry';
import { facadeEdges } from '../components/campaigns/scenes/ledFacade';
import { CAMPAIGN_SCENES, LANDMARK_SCENES, sceneForFormat } from '../components/campaigns/scenes/sceneCatalogue';
import { faceShape, faceContains } from '../components/campaigns/scenes/sceneArt';
import { CAMPAIGN_FORMATS, CAMPAIGN_FORMAT_ORDER, LANDMARK_SITES } from '../services/campaigns/campaignFormats';

/* the homography the CSS matrix3d applies to a point of the element */
const project = (matrix: string, x: number, y: number): [number, number] => {
  const m = matrix.slice('matrix3d('.length, -1).split(',').map(Number);
  const w = m[3] * x + m[7] * y + m[15];
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w];
};
const near = (a: [number, number], b: [number, number], label: string) => {
  assert.ok(Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01, `${label}: ${a.join(',')} vs ${b.join(',')}`);
};

/* a JPEG's size from its frame header */
const jpegSize = (path: string): [number, number] => {
  const bytes = readFileSync(path);
  for (let i = 2; i < bytes.length - 9;) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    const length = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)];
    i += 2 + length;
  }
  throw new Error(`no frame header in ${path}`);
};

for (const scene of Object.values(CAMPAIGN_SCENES)) {
  const file = resolve(process.cwd(), 'public', scene.backdrop.replace(/^\//, ''));
  const [width, height] = jpegSize(file);
  assert.deepEqual([width, height], [scene.width, scene.height], `${scene.id}: the backdrop is ${scene.width} × ${scene.height}`);
  assert.ok(statSync(file).size < 600_000, `${scene.id}: the backdrop stays under 600 KB`);
  const thumb = resolve(process.cwd(), 'public', scene.thumb.replace(/^\//, ''));
  assert.deepEqual(jpegSize(thumb), [scene.width / 2, scene.height / 2], `${scene.id}: its thumb is half size`);
  assert.ok(statSync(thumb).size < 130_000, `${scene.id}: the thumb stays under 130 KB`);
  for (const box of [{ width: 375, height: 520 }, { width: 320, height: 373 }, { width: 430, height: 700 }, { width: 64, height: 84 }]) {
    const { scale, x, y } = coverFrame(box, scene, scene.focus);
    assert.ok(scene.width * scale >= box.width - 1e-6 && scene.height * scale >= box.height - 1e-6, `${scene.id}: covers ${box.width} × ${box.height}`);
    assert.ok(x <= 0 && y <= 0 && x + scene.width * scale >= box.width - 1e-6 && y + scene.height * scale >= box.height - 1e-6, `${scene.id}: no gap at the edges`);
  }
  if (scene.kind === 'QUAD') {
    const w = 600;
    const h = w / faceShape(scene);
    const faces = [scene.quad, ...(scene.quads || [])];
    faces.forEach((quad, index) => {
      const matrix = quadMatrix3d(w, h, quad);
      near(project(matrix, 0, 0), quad[0], `${scene.id} face ${index + 1} top-left`);
      near(project(matrix, w, 0), quad[1], `${scene.id} face ${index + 1} top-right`);
      near(project(matrix, w, h), quad[2], `${scene.id} face ${index + 1} bottom-right`);
      near(project(matrix, 0, h), quad[3], `${scene.id} face ${index + 1} bottom-left`);
      assert.ok(quad.every(([x, y]) => x >= 0 && x <= scene.width && y >= 0 && y <= scene.height), `${scene.id} face ${index + 1} is inside the backdrop`);
      /* a face runs clockwise: top-left, top-right, bottom-right, bottom-left */
      assert.ok(quad[1][0] > quad[0][0] && quad[2][1] > quad[1][1] && quad[3][1] > quad[0][1], `${scene.id} face ${index + 1} runs clockwise`);
    });
    console.log(`PASS ${scene.id}: ${faces.length} ${faces.length === 1 ? 'face' : 'faces'}, a ${w} × ${Math.round(h)} creative lands on each one's corners; ${scene.surface === 'SCREEN' ? 'a screen' : `printed, lit ${(scene.light ?? 'BELOW').toLowerCase()}`}${faceContains(scene) ? ', the creative whole, carried on in its edges\' colours' : ''}`);
  } else if (scene.kind === 'RING') {
    const [cx, cy] = scene.center;
    assert.ok(scene.inner < scene.outer && cx - scene.outer > 0 && cx + scene.outer < scene.width && cy - scene.outer > 0, `${scene.id}: the rim is inside the frame`);
    assert.ok(scene.waterline === null || scene.waterline > cy + scene.outer, `${scene.id}: the river is below the wheel`);
    console.log(`PASS ${scene.id}: a rim ${scene.inner}–${scene.outer} px round ${cx},${cy}, the river from ${scene.waterline}`);
  } else if (scene.kind === 'DRONES') {
    const [left, top, right, bottom] = scene.sky;
    assert.ok(left >= 0 && right <= scene.width && top >= 0 && bottom < (scene.waterline ?? scene.height) && right - left > 300 && bottom - top > 200, `${scene.id}: the sky box is above the water`);
    console.log(`PASS ${scene.id}: the drones' sky ${right - left} × ${bottom - top} px, the water from ${scene.waterline}`);
  } else {
    const rows = scene.profile;
    assert.ok(rows.every((row, index) => row[1] < row[2] && (!index || row[0] > rows[index - 1][0])), 'The outline runs top to bottom, left of right');
    assert.equal(facadeEdges(scene, rows[0][0] - 1), null, 'Nothing above the facade');
    assert.equal(facadeEdges(scene, rows[rows.length - 1][0] + 1), null, 'Nothing below it');
    rows.forEach(([y, left, right]) => assert.deepEqual(facadeEdges(scene, y), [left, right], `row ${y}`));
    const between = facadeEdges(scene, rows[5][0] + 13)!;
    assert.deepEqual(between, [rows[6][1], rows[6][2]], 'Past half a step, the row below');
    assert.ok(scene.waterline === null || (scene.waterline > rows[rows.length - 1][0] && scene.waterline < scene.height), 'The water is below the tower');
    console.log(`PASS ${scene.id}: ${rows.length} facade rows from y ${rows[0][0]} to ${rows[rows.length - 1][0]}, ${Math.round((rows[rows.length - 1][0] - rows[0][0]) / scene.pitch)} rows of dots`);
  }
}
/* a skewed quad (not a parallelogram) still lands on its corners */
const skew: [[number, number], [number, number], [number, number], [number, number]] = [[10, 20], [300, 5], [320, 210], [0, 160]];
const skewed = quadMatrix3d(400, 100, skew);
near(project(skewed, 0, 0), skew[0], 'skew top-left');
near(project(skewed, 400, 100), skew[2], 'skew bottom-right');
console.log('PASS geometry: a perspective quad maps exactly; every backdrop covers its box');
/* #156: every format but the online ones has a scene; a light show the one of its country's landmark */
const online = ['SOCIAL_FEED', 'SHORT_VIDEO', 'SEARCH', 'CREATORS', 'CTV'];
for (const id of CAMPAIGN_FORMAT_ORDER) {
  if (online.includes(id)) { assert.equal(sceneForFormat(id), null, `${id} is drawn, not photographed`); continue; }
  if (id === 'LANDMARK_LIGHT_SHOW') {
    Object.entries(LANDMARK_SCENES).forEach(([countryId, sceneId]) => {
      assert.ok(countryId in LANDMARK_SITES && sceneForFormat(id, countryId) === sceneId && CAMPAIGN_SCENES[sceneId].countries?.includes(countryId), `${LANDMARK_SITES[countryId]} has its scene`);
    });
    continue;
  }
  const sceneId = sceneForFormat(id);
  assert.ok(sceneId && CAMPAIGN_SCENES[sceneId], `${CAMPAIGN_FORMATS[id].name} has a scene`);
  assert.ok(Math.abs(CAMPAIGN_SCENES[sceneId].aspect - (CAMPAIGN_FORMATS[id].frame || 3)) < 0.01, `${CAMPAIGN_FORMATS[id].name}: its scene shows its frame`);
}
console.log(`PASS formats: ${CAMPAIGN_FORMAT_ORDER.length - online.length - 1} formats with their scene, the light show at ${Object.keys(LANDMARK_SCENES).length} landmarks, ${online.length} online formats drawn`);

/* #159: the train takes the photo's light over its wrap, and See it live runs along it, tail to cab, on a phone */
const train = CAMPAIGN_SCENES.METRO_VIADUCT;
assert.ok(train.kind === 'QUAD' && train.shading && train.pan, 'The train is shaded and panned');
if (train.kind === 'QUAD' && train.pan) {
  const phone = { width: 390, height: 844 };
  const [from, to] = train.pan.map(point => coverFrame(phone, train, point));
  const left = (frame: { x: number; scale: number }) => -frame.x / frame.scale;
  const right = (frame: { x: number; scale: number }) => (phone.width - frame.x) / frame.scale;
  assert.ok(right(from) >= train.width - 1 && left(to) <= train.quad[0][0] - 120, 'On a phone it starts at the tail and ends with the cab in view');
  assert.ok(from.x !== to.x, 'and moves');
  const wide = { width: 1600, height: 1000 };
  assert.equal(coverFrame(wide, train, train.pan[0]).x, coverFrame(wide, train, train.pan[1]).x, 'On a wide screen the whole train shows, and it holds still');
  console.log(`PASS train: shaded; on a phone the camera runs ${Math.round(left(from))}–${Math.round(right(from))} → ${Math.round(left(to))}–${Math.round(right(to))} px along it; on a wide screen it holds`);
}
console.log('campaign scenes audit passed');
