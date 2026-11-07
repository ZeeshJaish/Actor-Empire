/**
 * #189 (plan §22.4): the dev tools' and the audits' listing, now that the old roadshow is gone. It lists through the
 * listing's own commit (`commitStreamingCinematicIpo`), as the closing bell does: the float at `floatPercent` (20% by
 * default), a share at 90% of our value per share, Corvin Partners' firm book. Never called by normal play.
 */
import type { Player } from '../types';
import { commitStreamingCinematicIpo, getStreamingPublicMarkets, type StreamingPublicMarketActionResult } from './streamingPublicMarkets';

export const listStreamingCompanyForQa = (player: Player, options: { ticker?: string; floatPercent?: number } = {}): StreamingPublicMarketActionResult => {
    const view = getStreamingPublicMarkets(player);
    const preIpoShares = Math.max(5_000_000, Math.min(500_000_000, Math.round(view.valuation / 10 / 250_000) * 250_000));
    const floatPercent = options.floatPercent ?? 20;
    const newShares = Math.max(250_000, Math.round(preIpoShares * floatPercent / (100 - floatPercent) / 250_000) * 250_000);
    return commitStreamingCinematicIpo(player, {
        ticker: options.ticker || view.suggestedTicker,
        narrative: 'AUDIENCE_SCALE',
        price: view.valuation / (preIpoShares + newShares) * 0.9,
        preIpoShares,
        newShares,
        employeeQuotaPercent: 2,
        underwriterId: 'cp',
        underwriterName: 'Corvin Partners',
        firmBook: true,
        bookCoverage: 2,
        anchorDiscountAccepted: false,
        governanceMarks: [],
        diligenceWeeks: 2,
        regulatorAttempts: 1,
    });
};
