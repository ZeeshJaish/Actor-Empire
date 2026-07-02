import {
  MARKETING_CHANNEL_OPTIONS,
  normalizeMarketingChannelAllocations
} from '../services/marketingStrategy';
import type { MarketingChannelAllocations } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const channelIds = MARKETING_CHANNEL_OPTIONS.map(channel => channel.id);
[
  'TRAILER_LAUNCH',
  'SOCIAL_DIGITAL',
  'TV_OUTDOOR',
  'RED_CARPET',
  'CRITIC_SCREENINGS',
  'INFLUENCER_PUSH',
  'INTERNATIONAL',
  'FAN_EVENTS'
].forEach(id => assert(channelIds.includes(id as any), `Missing marketing channel ${id}`));

const pool = 12_000_000;
const excessive: MarketingChannelAllocations = {
  TRAILER_LAUNCH: 4_000_000,
  SOCIAL_DIGITAL: 6_000_000,
  TV_OUTDOOR: 6_000_000,
  RED_CARPET: 2_000_000
};

const capped = normalizeMarketingChannelAllocations(excessive, pool);
assert(capped.totalSpent === pool, `Allocation should cap at pool: expected ${pool}, got ${capped.totalSpent}`);
assert(capped.remaining === 0, `Capped allocation should have no remaining budget, got ${capped.remaining}`);
assert(capped.allocations.TV_OUTDOOR! < excessive.TV_OUTDOOR!, 'Later channels should be trimmed to prevent overspend.');

const partial = normalizeMarketingChannelAllocations({
  TRAILER_LAUNCH: 1_000_000,
  SOCIAL_DIGITAL: 2_500_000,
  CRITIC_SCREENINGS: 500_000
}, pool);

assert(partial.totalSpent === 4_000_000, `Partial spend mismatch: ${partial.totalSpent}`);
assert(partial.remaining === 8_000_000, `Remaining reserve should return later, got ${partial.remaining}`);

const negative = normalizeMarketingChannelAllocations({
  TRAILER_LAUNCH: -10_000_000,
  FAN_EVENTS: 800_000
}, pool);

assert(negative.allocations.TRAILER_LAUNCH === 0, 'Negative allocations must normalize to zero.');
assert(negative.totalSpent === 800_000, `Negative allocation should not reduce total spend, got ${negative.totalSpent}`);

console.log('Marketing channel allocation audit passed.');
