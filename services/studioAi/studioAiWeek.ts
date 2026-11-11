import type { NewsItem, Player, StudioAiCompanyStatus, WorldState, XPost } from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { ensureStudioEcosystem } from '../studioEcosystem';
import { reconcileStudioAiController } from './studioAiControl';
import { processStudioAiFinanceWeek } from './studioAiFinance';
import { adaptStudioIntelligenceContext } from '../industryIntelligence/studioIntelligenceAdapter';
import { processIndustryIntelligenceShadowCompany } from '../industryIntelligence/industryIntelligenceCoordinator';
import { collectIndustryContentGlobalRecent } from '../industryIntelligence/industryContentShadow';
import {
    compareIndustryShadowDecision,
    observeStudioAuthoritativeDecision,
} from '../industryIntelligence/industryIntelligenceShadow';
import { executeStudioAiSlateWeek } from './studioAiSlateExecution';
import { isStudioIntelligenceDue } from './studioAiDueGate';
import { handoffStudioAiGreenlights } from './studioAiProductionHandoff';
import { executeStudioAiProductionWeek } from './studioAiProductionExecution';

export interface StudioAiWeekResult {
    world: WorldState;
    news: NewsItem[];
    socialPosts: XPost[];
    logs: string[];
    /** 2026-11-11: rival companies whose week stopped on bad data and sat the week out (see below). */
    skipped?: Array<{ companyId: string; step: string; error: string }>;
}

const errorText = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 200);

const publicSignal = (name: string, status: StudioAiCompanyStatus) => {
    if (status === 'DISTRESSED') return {
        headline: `${name}'s valuation slides as financing pressure mounts`,
        detail: `A thinning cash cushion and weak operating results are raising questions around ${name}'s next slate.`,
        social: `${name}'s latest numbers are doing the talking: less room to spend, more pressure on the next release.`,
    };
    if (status === 'RESTRUCTURING') return {
        headline: `${name} begins a major financial overhaul`,
        detail: `Leadership is cutting commitments and reviewing the slate after a prolonged run of losses.`,
        social: `${name} is reviewing costs and its release slate. The next few quarters now matter a lot.`,
    };
    if (status === 'CLOSED') return {
        headline: `${name} winds down after a prolonged cash crisis`,
        detail: `Projects and rights may now move through the wider industry market.`,
        social: `${name} is winding down. Its catalogue and unfinished slate could soon attract buyers.`,
    };
    if (status === 'ACTIVE') return {
        headline: `${name} steadies after a difficult stretch`,
        detail: `Improved cash coverage has given the company room to plan its next slate.`,
        social: `${name}'s financial trend has stabilised, giving the studio more room for its next move.`,
    };
    return null;
};

export const processStudioAiWeek = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): StudioAiWeekResult => {
    const nextWorld = ensureStudioEcosystem(world);
    const news: NewsItem[] = [];
    const socialPosts: XPost[] = [];
    const logs: string[] = [];
    const skipped: NonNullable<StudioAiWeekResult['skipped']> = [];

    /* 2026-11-11 (1.0.27 hotfix, "Week N was not applied"): one rival studio with bad data used to stop the
       player's whole week. Each studio now runs on its own: if its week throws, that studio and the industry
       productions go back to how they were before it, it sits this week out, and the rest of the week goes on.
       The steps below never change the shared world in place, so the two restores are the whole undo. A studio
       that works is untouched by this. */
    Object.keys(nextWorld.studios || {}).sort().forEach(studioId => {
        const prior = nextWorld.studios![studioId];
        const productionsBefore = nextWorld.industryProductions;
        try {
            runStudioWeek(studioId, prior);
        } catch (error) {
            nextWorld.studios![studioId] = prior;
            nextWorld.industryProductions = productionsBefore;
            skipped.push({ companyId: studioId, step: 'studio_week', error: errorText(error) });
        }
    });

    function runStudioWeek(studioId: string, prior: NonNullable<WorldState['studios']>[string]) {
        const priorStatus = prior.ai?.status || 'ACTIVE';
        let controlled = reconcileStudioAiController(prior, player, absoluteWeek);
        const proposalIdsBefore = new Set(controlled.ai?.intelligence?.proposals.map(item => item.id) || []);
        if (isStudioIntelligenceDue(controlled.ai?.intelligence, absoluteWeek)) {
            try {
                const context = adaptStudioIntelligenceContext({ ...player, world: nextWorld }, controlled, absoluteWeek);
                const shadow = processIndustryIntelligenceShadowCompany({
                    context,
                    state: controlled.ai!.intelligence!,
                    globalRecentFingerprints: collectIndustryContentGlobalRecent(nextWorld, controlled.id),
                });
                if (shadow.changed) controlled = {
                    ...controlled,
                    ai: { ...controlled.ai!, intelligence: shadow.state },
                };
            } catch {
                // Intelligence must never interrupt the authoritative studio week.
            }
        }
        const slateExecution = executeStudioAiSlateWeek({ player, world: nextWorld, studio: controlled, absoluteWeek });
        const handoff = handoffStudioAiGreenlights({
            player,
            world: nextWorld,
            studio: slateExecution.studio,
            absoluteWeek,
        });
        nextWorld.industryProductions = handoff.world.industryProductions;
        controlled = handoff.studio;
        let processed = processStudioAiFinanceWeek(controlled, absoluteWeek);
        const newProposals = (processed.ai?.intelligence?.proposals || [])
            .filter(proposal => !proposalIdsBefore.has(proposal.id) && proposal.absoluteWeek === absoluteWeek);
        if (newProposals.length && processed.ai?.intelligence) {
            const comparedState = newProposals.reduce((state, proposal) => compareIndustryShadowDecision({
                state,
                proposal,
                observation: observeStudioAuthoritativeDecision(controlled, processed, proposal),
            }).state, processed.ai.intelligence);
            processed = { ...processed, ai: { ...processed.ai, intelligence: comparedState } };
        }
        nextWorld.studios![studioId] = processed;
        if (slateExecution.admittedCount > 0) logs.push(`${processed.name} committed ${slateExecution.admittedCount} project${slateExecution.admittedCount === 1 ? '' : 's'} to development.`);
        if (slateExecution.reviewedCount > 0) logs.push(`${processed.name} reviewed ${slateExecution.reviewedCount} active slate project${slateExecution.reviewedCount === 1 ? '' : 's'}.`);
        if (handoff.createdCount > 0) logs.push(`${processed.name} moved ${handoff.createdCount} greenlit project${handoff.createdCount === 1 ? '' : 's'} into physical production.`);
        const nextStatus = processed.ai?.status || priorStatus;
        if (nextStatus === priorStatus) return;

        const signal = publicSignal(processed.name, nextStatus);
        if (!signal) return;
        const signalId = createDeterministicId('studio_ai_public_signal', processed.id, absoluteWeek, nextStatus);
        news.push({
            id: `news_${signalId}`,
            headline: signal.headline,
            subtext: signal.detail,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: nextStatus === 'CLOSED' ? 'HIGH' : 'MEDIUM',
        });
        socialPosts.push({
            id: `x_${signalId}`,
            authorId: 'industry_desk',
            authorName: 'Industry Desk',
            authorHandle: '@industrydesk',
            authorAvatar: '',
            content: signal.social,
            timestamp: absoluteWeek,
            likes: Math.max(120, Math.round(processed.valuation * 75)),
            retweets: Math.max(18, Math.round(processed.valuation * 9)),
            replies: Math.max(9, Math.round(processed.valuation * 4)),
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: true,
            postType: 'FILM_OPINION',
            sentiment: 'INDUSTRY',
        });
        logs.push(`${processed.name}'s finances changed materially this week.`);
    }

    /* the same rule for the rivals' productions: if this step throws, they stay where they were for a week */
    try {
        const productionExecution = executeStudioAiProductionWeek({ player: { ...player, world: nextWorld }, world: nextWorld, absoluteWeek });
        logs.push(...productionExecution.logs);
        return { world: productionExecution.world, news, socialPosts, logs, ...(skipped.length ? { skipped } : {}) };
    } catch (error) {
        skipped.push({ companyId: 'industry_productions', step: 'production_week', error: errorText(error) });
        return { world: nextWorld, news, socialPosts, logs, skipped };
    }
};
