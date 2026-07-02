import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');

const mustInclude = token => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'channel-grid-row',
  'channel-control-cluster',
  'channel-control-dock',
  'channel-mini-meter',
  'channel-amount-input',
  'grid-cols-[44px_minmax(0,1fr)]',
  'md:grid-cols-[44px_minmax(0,1fr)_236px]',
  'tabular-nums'
].forEach(mustInclude);

if (source.includes('channel-spend-slider') || source.includes('type="range"')) {
  throw new Error('Channel rows still render the old large slider control.');
}

if (/h-1\.5 rounded-full bg-black\/50[\s\S]*style=\{\{ width: `\$\{share\}%` \}\}/.test(source)) {
  throw new Error('Channel rows still render a duplicate progress bar beneath the slider.');
}

if (/grid grid-cols-1 md:grid-cols-\[1fr_auto\]/.test(source)) {
  throw new Error('Channel rows still use the asymmetric old outer grid.');
}

if (/grid-cols-\[44px_104px_44px\]/.test(source)) {
  throw new Error('Channel controls still use the oversized mobile cluster.');
}

console.log('Release channel row symmetry audit passed.');
