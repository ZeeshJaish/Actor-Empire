import { contentMarketFixture } from './contentMarketFixture';
import { prepareExternalPlayerUpdateForUi } from '../../services/playerUiState';
import { saveStreamingMarketPlan, beginStreamingMarketClearance } from '../../services/streamingMarkets';
import { WORLD_COUNTRY_DEFINITIONS } from '../../services/worldEconomy/worldCountryRegistry';

export const filedMarketFixture = (countryIds = WORLD_COUNTRY_DEFINITIONS.map(country => country.id)) => {
    let player = prepareExternalPlayerUpdateForUi(contentMarketFixture());
    // Disposable fixture only: fund the real filing service without advancing a user save.
    player.ownedStreamingPlatform.treasuryCash = 1_000_000_000_000;
    player.energy.current = 1_000;
    player = saveStreamingMarketPlan(player, countryIds).player;
    const filed = beginStreamingMarketClearance(player, countryIds);
    if (filed.reason !== 'STARTED'
        || filed.player.ownedStreamingPlatform.marketOperations.filter(row => row.clearance).length !== countryIds.length) {
        throw new Error('Expected every fixture market to enter real clearance.');
    }
    return filed.player;
};
