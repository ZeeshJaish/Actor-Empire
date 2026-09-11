import fs from 'node:fs';

const source = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/CampaignStep.tsx', 'utf8');
const styles = fs.readFileSync('views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css', 'utf8');

const mustInclude = token => {
  if (!source.includes(token)) throw new Error(`Missing ${token}`);
};

[
  'className={join(css.chan, channel.amount > 0 && css.on)}',
  'className={css.chanicon}',
  'className={css.chantext}',
  'className={css.chanset}',
  'className={css.chanfoot}',
  'className={css.chanfill}',
  'data-testid={`channel-${channel.id}-value`'
].forEach(mustInclude);

['.chan{', 'grid-template-areas:', "'icon text set'", "'foot foot foot'", '.chanset{'].forEach(token => {
  if (!styles.includes(token)) throw new Error(`Missing ${token}`);
});

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

console.log('Release transplanted channel row symmetry audit passed.');
