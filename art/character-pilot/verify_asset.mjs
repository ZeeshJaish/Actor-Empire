import fs from 'node:fs';
import assert from 'node:assert/strict';
import { OPTIONS, enumerateRecipes } from './appearance.mjs';

const bytes = fs.readFileSync(new URL('./exports/actor-empire-character.glb', import.meta.url));
assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
assert.equal(bytes.readUInt32LE(4), 2, 'glTF version');
assert.equal(bytes.readUInt32LE(8), bytes.length, 'complete file');
const jsonLength = bytes.readUInt32LE(12);
const asset = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const parts = asset.nodes.filter(node => node.extras?.category);
assert.equal(parts.length, 9, 'all nine interchangeable groups are exported');
for (const recipe of enumerateRecipes()) {
  for (const category of Object.keys(OPTIONS)) {
    const matches = parts.filter(node => node.extras.category === category && node.extras.option === recipe[category]);
    assert.equal(matches.length, 1, `${category}/${recipe[category]} resolves to one group`);
    if (!(category === 'hair' && recipe[category] === 'bald')) assert.ok(matches[0].children?.length, 'selected part has geometry');
  }
}
for (const accessor of asset.accessors) {
  assert.ok(accessor.count > 0, 'nonempty exported accessor');
  for (const value of [...accessor.min ?? [], ...accessor.max ?? []]) assert.ok(Number.isFinite(value), 'finite geometry bounds');
}
const headIndex = asset.nodes.findIndex(node => node.name === 'HeadPivot');
assert.ok(headIndex >= 0);
assert.ok(asset.animations?.some(animation => animation.channels.some(channel => channel.target.node === headIndex && channel.target.path === 'rotation')), 'head turn is exported as an animation');
const triangles = asset.meshes.flatMap(mesh => mesh.primitives).reduce((sum, primitive) => sum + asset.accessors[primitive.indices].count / 3, 0);
const report = { checkedAt: new Date().toISOString(), valid: true, recipes: 27, partGroups: parts.length, totalTrianglesAllVariants: triangles, glbBytes: bytes.length, animations: asset.animations.map(a => a.name) };
fs.writeFileSync(new URL('./exports/verification.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
