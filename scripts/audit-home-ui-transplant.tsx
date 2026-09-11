import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomePage } from '../views/HomePage';
import { INITIAL_PLAYER } from '../types';

const reactErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => reactErrors.push(args.map(String).join(' '));

let html = '';
try {
  html = renderToStaticMarkup(
    <HomePage
    player={{
      ...INITIAL_PLAYER,
      name: 'Zeesh Star',
      age: 27,
      currentWeek: 12,
      money: 2_450_000,
      energy: { current: 71, max: 100 },
      stats: {
        ...INITIAL_PLAYER.stats,
        health: 82,
        body: 64,
        happiness: 76,
        looks: 68,
        talent: 43,
        experience: 37,
        reputation: 55,
        fame: 49,
      },
      logs: [
        { week: 12, year: 27, message: 'Signed a new lead role.', type: 'positive' },
        { week: 11, year: 27, message: 'Wrapped a supporting role.', type: 'neutral' },
        { week: 12, year: 27, message: 'The campaign gained momentum.', type: 'positive' },
      ],
    }}
    onNextWeek={() => undefined}
    isProcessing={false}
    onUpdatePlayer={() => undefined}
    setPage={() => undefined}
    />,
  );
} finally {
  console.error = originalConsoleError;
}

assert.match(html, /aria-label="Open energy ledger"/);
assert.match(html, />Zeesh Star</);
assert.match(html, />\$2\.5M</);
assert.match(html, />AVAILABLE<\/div><div class="ae-sstat-v">71E<\/div>/);
assert.match(html, /Signed a new lead role\./);
assert.match(html, /data-tutorial-id="home-profile"/);
assert.match(html, /data-tutorial-id="home-next-week"/);
assert.equal(
  html.match(/YEAR 27 · WEEK 12/g)?.length,
  1,
  'Activity entries from the same game week must share one visible timestamp group.',
);
assert.equal(
  reactErrors.some(message => message.includes('same key')),
  false,
  `Activity feed rendered duplicate React keys: ${reactErrors.join('\n')}`,
);

console.log('Home UI transplant audit passed.');
