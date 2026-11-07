/**
 * #164: the team's job registry. A runner looks at the week and proposes actions for its job; an executor carries
 * an action out through the same service the player's own button uses (same price, same energy, same refusals).
 * Each seat's jobs are added by their own entry (#167–#171).
 */
import type {
    OwnedStreamingExecutiveAppointment,
    OwnedStreamingPlatformState,
    OwnedStreamingTeamSeat,
    Player,
    StreamingTeamAction,
    StreamingTeamJobId,
} from '../../types';
import {
    executeCampaignExtend,
    executeCampaignStart,
    executeCampaignStop,
    runBrandCampaign,
    runCampaignResults,
    runPremierePush,
} from './teamMarketing';
import {
    executeCatalogueSign,
    executeOriginalPitch,
    executeRenewal,
    executeTitleLicense,
    runMarketBuys,
    runOriginalPitch,
    runRenewals,
} from './teamContent';
import { executeIncidentRepair, executeNetworkOrder, runCapacity, runIncidents } from './teamTechnology';
import { executeLocalizationLevel, executeMarketFollowUp, runFilings, runLanguages } from './teamInternational';
import { executeGuidance, executePriceChange, runGuidance, runInvestorOffers, runLeaks, runPriceIdeas, runTrustIncidents } from './teamMoney';
import { executeStreamingTeamRaise } from './teamOutcomes';

export interface StreamingTeamJobContext {
    player: Player;
    platform: OwnedStreamingPlatformState;
    absoluteWeek: number;
    seat: OwnedStreamingTeamSeat;
    executive: OwnedStreamingExecutiveAppointment;
    /** money the seat may still spend by itself this week */
    moneyLeft: number;
    /** energy the seat may still spend by itself this week (its allowance, never more than the player has) */
    energyLeft: number;
}

export interface StreamingTeamProposal {
    jobId: StreamingTeamJobId;
    /** one card or action per target (a campaign, a licence, a region…) */
    dedupeKey: string;
    title: string;
    detail: string;
    /** the executive's reason, shown on the card and in the report */
    reason: string;
    cost: number;
    energy: number;
    action: StreamingTeamAction;
    /** always a card, never done by itself (big moments, major incidents, pitches) */
    askOnly?: boolean;
    /** higher first */
    priority?: number;
}

export type StreamingTeamJobRunner = (context: StreamingTeamJobContext) => StreamingTeamProposal[];

export interface StreamingTeamExecution {
    player: Player;
    changed: boolean;
    reason?: string;
}

export type StreamingTeamExecutor = (
    player: Player,
    action: StreamingTeamAction,
    context: { absoluteWeek: number; executiveName: string },
) => StreamingTeamExecution;

export const STREAMING_TEAM_RUNNERS: Partial<Record<StreamingTeamJobId, StreamingTeamJobRunner>> = {
    /* #167: Marketing */
    PREMIERE_PUSH: runPremierePush,
    BRAND_CAMPAIGN: runBrandCampaign,
    CAMPAIGN_RESULTS: runCampaignResults,
    /* #168: Content */
    RENEWALS: runRenewals,
    MARKET_BUYS: runMarketBuys,
    ORIGINAL_PITCH: runOriginalPitch,
    /* #169: Technology */
    CAPACITY: runCapacity,
    INCIDENTS: runIncidents,
    /* #170: International */
    FILINGS: runFilings,
    LANGUAGES: runLanguages,
    /* #171: Money and Trust */
    OFFERS: runInvestorOffers,
    PRICE_IDEAS: runPriceIdeas,
    GUIDANCE: runGuidance,
    LEAKS: runLeaks,
    TRUST_INCIDENTS: runTrustIncidents,
};

export const STREAMING_TEAM_EXECUTORS: Partial<Record<StreamingTeamAction['kind'], StreamingTeamExecutor>> = {
    /* a pitch or an idea: approving it opens the room; nothing changes in the save */
    OPEN_ROOM: (player) => ({ player, changed: true }),
    /* #167: Marketing */
    CAMPAIGN_START: executeCampaignStart,
    CAMPAIGN_STOP: executeCampaignStop,
    CAMPAIGN_EXTEND: executeCampaignExtend,
    /* #168: Content */
    RENEWAL: executeRenewal,
    CATALOGUE_SIGN: executeCatalogueSign,
    TITLE_LICENSE: executeTitleLicense,
    ORIGINAL_PITCH: executeOriginalPitch,
    /* #169: Technology */
    NETWORK_ORDER: executeNetworkOrder,
    INCIDENT_REPAIR: executeIncidentRepair,
    /* #170: International */
    MARKET_FOLLOW_UP: executeMarketFollowUp,
    LOCALIZATION_LEVEL: executeLocalizationLevel,
    /* #171: Money */
    PRICE_CHANGE: executePriceChange,
    GUIDANCE: executeGuidance,
    /* #181: an ambitious executive's raise */
    RAISE: (player, action) => executeStreamingTeamRaise(player, action),
};
