/**
 * #215 (plan §24): your name on the stock market, chosen by you. Zeesh (2026-11-04): "मुझे चाहिए कि जब हम लोग लिस्टिंग करें
 * तो हमसे पूछे कि हमें क्या स्टॉक मार्केट में नेम रखना है और वही नेम हमारा जाए।"
 *
 * Two to five letters, and not one another company trades under. Chosen on MARKETS › Your listing, before the listing
 * or while it runs; the listing starts from it and can change it on its first page too. Once listed, it is settled.
 */
import type { Player } from '../types';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { initializeStocks } from './stockLogic';

export const STREAMING_TICKER_MIN = 2;
export const STREAMING_TICKER_MAX = 5;

export const cleanStreamingTicker = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, STREAMING_TICKER_MAX);

/** the company already trading under this symbol, or null */
export const streamingTickerOwner = (player: Pick<Player, 'stocks'>, ticker: string): string | null => {
    const stocks = player.stocks?.length ? player.stocks : initializeStocks();
    return stocks.find(stock => stock.symbol === ticker)?.name || null;
};

/** why this symbol cannot be used, or null */
export const streamingTickerProblem = (player: Pick<Player, 'stocks'>, text: string): string | null => {
    const ticker = cleanStreamingTicker(text);
    if (ticker.length < STREAMING_TICKER_MIN) return `Use ${STREAMING_TICKER_MIN} to ${STREAMING_TICKER_MAX} letters.`;
    const owner = streamingTickerOwner(player, ticker);
    return owner ? `${ticker} is ${owner} on the exchange.` : null;
};

export interface StreamingTickerResult { player: Player; changed: boolean; message: string }

export const setStreamingProposedTicker = (player: Player, text: string): StreamingTickerResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.publicCompany.listing) return { player, changed: false, message: 'The company is listed: its symbol is settled.' };
    const problem = streamingTickerProblem(player, text);
    if (problem) return { player, changed: false, message: problem };
    const ticker = cleanStreamingTicker(text);
    return {
        changed: true,
        message: `You will list as ${ticker}.`,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                publicCompany: {
                    ...platform.publicCompany,
                    proposedTicker: ticker,
                    ...(platform.publicCompany.ipoJourney?.status === 'ACTIVE' ? { ipoJourney: { ...platform.publicCompany.ipoJourney, ticker } } : {}),
                },
            }, player.id),
        },
    };
};
