import assert from 'node:assert/strict';
import {
    applyTransform,
    clampMapTransform,
    fitMapBoundsTransform,
    shouldCaptureMapPointer,
} from '../views/lifestyle/business/components/useMapViewport';

assert.deepEqual(applyTransform({ k: 2, x: -10, y: 5 }, [20, 30]), [30, 65]);

const frame = {
    width: 1000,
    height: 520,
    originY: 0,
    minScale: 1,
    maxScale: 16,
};

assert.deepEqual(
    clampMapTransform({ k: 0.2, x: 50, y: -900 }, frame),
    { k: 1, x: 0, y: 0 },
);

const fitted = fitMapBoundsTransform(
    [[200, 100], [400, 300]],
    { ...frame, boundsMaxScale: 6 },
);
assert.ok(fitted.k > 1 && fitted.k <= 6);
assert.deepEqual(clampMapTransform(fitted, frame), fitted);

const tighterRegionFit = fitMapBoundsTransform(
    [[200, 100], [400, 300]],
    { ...frame, boundsMaxScale: 6, fillRatio: 0.88 },
);
assert.ok(tighterRegionFit.k > fitted.k, 'A higher fill ratio should produce the tighter regional framing.');
assert.equal(Number(tighterRegionFit.k.toFixed(3)), 2.288);

assert.equal(shouldCaptureMapPointer(1, 1), false, 'World-level taps must reach region paths.');
assert.equal(shouldCaptureMapPointer(1, 2), true, 'A zoomed map should capture one-pointer panning.');
assert.equal(shouldCaptureMapPointer(2, 1), true, 'Two-pointer pinching should capture the gesture.');

console.log('Region map v2 viewport audit passed.');
