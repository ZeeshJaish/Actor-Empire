import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Player, StreamingBiddingSession, StreamingOfferVersion } from '../../types';
import * as bidding from '../../services/streamingBidding';
import * as rights from '../../services/streamingRightsCore';
import { quoteSeriesStreamingRights } from '../../services/seriesStreamingValue';
import { quoteCinemaRightsForBuyer } from '../../services/boxOffice/boxOfficeRightsAdapter';
import { resolveStreamingPlatformBrandById } from '../../services/streamingPlatformBrandRegistry';
import { PHASE_ONE_ENERGY_COSTS } from '../../services/energyCosts';
import { applyInvestorPayoutMemory, calculateInvestorPayout } from '../../services/projectInvestors';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { PLAYER_STREAMING_FUNDING_DEADLINE_WEEKS } from '../../services/streamingFundingLogic';
const ts: typeof import('typescript') = createRequire(process.cwd() + '/package.json')('typescript');
const source = readFileSync('views/lifestyle/business/ReleaseWizard.tsx', 'utf8');
const ast = ts.createSourceFile('ReleaseWizard.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const names = ['PLATFORM_ECONOMICS', 'PLATFORMS', 'appendInvestorPayoutSummary', 'writeReleasePlanningDraft', 'handleAcceptBid', 'handleAcceptStreamingOffer'];
const declarations = new Map<string, string>();
function visit(node: import('typescript').Node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) declarations.set(node.name.getText(ast), `const ${node.getText(ast)};`);
    ts.forEachChild(node, visit);
}
visit(ast);
const body = ts.transpileModule(names.map(n => declarations.get(n)).join('\n') + '\nhandleAcceptStreamingOffer(offer, session); return captured();',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
/** Execute the exact UI signing handlers; only React setters/draft-input collection and storage callbacks are captured. */
export function signThroughReleaseHandler(player: Player, project: any, session: StreamingBiddingSession, offer: StreamingOfferVersion) {
    let result: Player | undefined, message: string | undefined;
    const noop = () => {};
    const deps: Record<string, any> = { ...bidding, ...rights, quoteSeriesStreamingRights, quoteCinemaRightsForBuyer, resolveStreamingPlatformBrandById,
        applyInvestorPayoutMemory, calculateInvestorPayout, spendPlayerEnergy, getAbsoluteWeek, PLAYER_STREAMING_FUNDING_DEADLINE_WEEKS,
        player, project, studio: player.businesses.find(b => b.id === project.projectDetails?.studioId), session, offer,
        isSeries: project.projectDetails?.type === 'SERIES', hasStreamingDealEnergy: true, streamingDealEnergyCost: PHASE_ONE_ENERGY_COSTS.STREAMING_DEAL_ACCEPT,
        biddingRightsStartWeek: session.rightsLot.startsAtAbsoluteWeek, isPostTheatricalBidding: false,
        selectedPlatform: null, selectedStreamingPlatformIds: [], selectedStreamingContractIds: [],
        setBiddingRightsMessage: (m: string) => { message = m; }, setSelectedPlatform: noop,
        setSelectedStreamingPlatformIds: noop, setSelectedStreamingContractIds: noop, setCommitmentState: noop,
        setLockedPremiereAbsoluteWeek: noop, setReleaseWeek: noop, setBiddingSession: noop, setStep: noop,
        tr: (key: string) => key, buildReleasePlanningDraft: () => ({ projectId: project.id, version: 1 }),
        lastPersistedDraftRef: { current: '' }, releaseDraftClearedRef: { current: false }, onComplete: noop,
        onUpdatePlayer: (p: Player) => { result = p; }, captured: () => ({ player: result, message }) };
    return new Function(...Object.keys(deps), body)(...Object.values(deps)) as { player?: Player; message?: string };
}
