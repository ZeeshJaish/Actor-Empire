import assert from 'node:assert/strict';
import { getShellClearance, isKeyboardOccludingViewport } from '../components/layout-adapters/shellGeometry';

assert.equal(getShellClearance(true, 0), 92, 'visible nav reserves its 60px body, 12px bottom edge, and 20px content gap');
assert.equal(getShellClearance(true, 34), 126, 'visible nav also reserves the safe-area inset');
assert.equal(getShellClearance(false, 34), 34, 'hidden nav retains only the safe-area inset');
assert.equal(getShellClearance(true, -8), 92, 'invalid negative inset cannot remove nav clearance');
assert.equal(getShellClearance(false, Number.NaN), 0, 'unknown inset is safe to ignore');
assert.equal(isKeyboardOccludingViewport(800, 790), false, 'browser bar movement is not a keyboard');
assert.equal(isKeyboardOccludingViewport(800, 500), true, 'large visual viewport loss is keyboard occlusion');
assert.equal(isKeyboardOccludingViewport(800, 0), false, 'unmeasured visual viewport does not hide navigation');

console.log('Shell geometry audit passed.');
