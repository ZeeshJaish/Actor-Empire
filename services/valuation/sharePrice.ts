/**
 * #185 (plan §22.4): share prices for every company. Each week a price moves 15% of the way towards what the valuation
 * engine says a share is worth, plus a little of last week's move (momentum), the sector's slow mood, the week's events
 * (results against expectations, votes, incidents) and noise seeded by the company and the week, so the same week
 * always moves the same way. A price no longer wanders off on its own: without news it drifts back to its value.
 */
import { createDeterministicRng } from '../deterministicRandom';

export const SHARE_PRICE_PULL = 0.15;
const MAX_WEEKLY_MOVE = 0.18;

/** a sector's slow mood: a long cycle (about a year and a half) and a short one (a quarter), together up to ±0.6% a week */
export const sectorMood = (sector: string, absoluteWeek: number): number => {
    const phase = createDeterministicRng(`sector-mood:${sector}`)() * Math.PI * 2;
    return 0.004 * Math.sin((absoluteWeek / 78) * Math.PI * 2 + phase)
        + 0.002 * Math.sin((absoluteWeek / 13) * Math.PI * 2 + phase * 1.7);
};

export interface SharePriceStep {
    previous: number;
    /** what a share is worth by the valuation engine */
    fair: number;
    /** last week's move, as a fraction */
    lastMove: number;
    sector: string;
    absoluteWeek: number;
    /** the week's one-off events, as a fraction */
    events?: number;
    /** how much the company's price wobbles */
    volatility: number;
    /** the company's seed (the career's, and the company's) */
    seed: string;
}

export interface SharePriceMove {
    price: number;
    move: number;
    /** the parts of the move */
    pull: number;
    momentum: number;
    mood: number;
    events: number;
    noise: number;
}

export const nextSharePrice = (step: SharePriceStep): SharePriceMove => {
    const previous = Math.max(0.01, step.previous);
    const pull = step.fair > 0 ? SHARE_PRICE_PULL * (step.fair / previous - 1) : 0;
    const momentum = Math.max(-0.03, Math.min(0.03, (Number.isFinite(step.lastMove) ? step.lastMove : 0) * 0.25));
    const mood = sectorMood(step.sector, step.absoluteWeek);
    const events = step.events || 0;
    const noise = (createDeterministicRng(`${step.seed}:share-price:${step.absoluteWeek}`)() - 0.5) * 2 * Math.max(0.005, step.volatility) * 0.6;
    const move = Math.max(-MAX_WEEKLY_MOVE, Math.min(MAX_WEEKLY_MOVE, pull + momentum + mood + events + noise));
    return { price: previous * (1 + move), move, pull, momentum, mood, events, noise };
};
