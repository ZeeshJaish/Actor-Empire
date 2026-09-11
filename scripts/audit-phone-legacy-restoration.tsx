import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import { MobilePage } from '../views/mobile/MobilePage';

const html = renderToStaticMarkup(<MobilePage player={INITIAL_PLAYER} />);

assert.doesNotMatch(html, /data-phone-shell="standard"/, 'The removed standard handset must not render.');
assert.doesNotMatch(html, /data-ui="actor-empire-phone-overhaul"/, 'The removed phone overhaul must not render.');
assert.match(html, /max-w-xs/, 'The previous compact phone width must be restored.');
assert.match(html, /max-h-\[650px\]/, 'The previous compact phone height must be restored.');
assert.match(html, /data-tutorial-id="mobile-phone-home"/, 'The previous phone home layout must render.');
assert.match(html, /data-tutorial-id="mobile-messages-app"/, 'The previous Messages launcher must remain connected.');

console.log('Legacy phone restoration audit passed.');
