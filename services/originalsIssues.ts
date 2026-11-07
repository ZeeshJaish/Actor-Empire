import type { OwnedStreamingLedgerEntry, OwnedStreamingOriginalCommission, OwnedStreamingOriginalIssue, Player, ProductionCalendar, ScheduledEvent } from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { getStudioIssueCount, type OriginalsStudioCard } from './originalsStudios';

/**
 * #289: a studio making an Original comes back for money, 0 to 3 times. Zeesh, 2026-11-05: "jisko hmne kaha bana ke do wo mang sakte ki quality issue
 * ya location change ya budget khatm ho gya". Decided at the start from its budget control, its crew and how thin the money is. Each one is a popup with
 * the production side's three answers: pay, watch an ad, or compromise. A title from the player's own studio has the production side's crises instead.
 */

const SPECTACLE = new Set(['ACTION', 'SCI_FI', 'SUPERHERO', 'ADVENTURE', 'FANTASY', 'ANIMATION']);

/** What this kind of title usually costs to make, for 8 episodes or a film */
const typicalMaking = (genre: string): number => (
    SPECTACLE.has(genre) ? 90_000_000 : genre === 'DOCUMENTARY' ? 12_000_000 : 32_000_000
);

/** Above 1 there is room in the money, below 1 it is thin */
export const getOriginalBudgetFit = (genre: string, making: number, episodes: number, isSeries: boolean): number => (
    Math.max(0.4, Math.min(1.6, making / (typicalMaking(genre) * (isSeries ? Math.max(1, episodes) / 8 : 1))))
);

const KIND_RISK: Record<OwnedStreamingOriginalIssue['kind'], [number, number]> = { QUALITY: [3, 6], LOCATION: [2, 4], BUDGET: [3, 5] };

export const planOriginalIssues = (input: {
    card: Pick<OriginalsStudioCard, 'id' | 'budgetControl' | 'onSet'>;
    commissionId: string;
    genre: string;
    making: number;
    episodes: number;
    isSeries: boolean;
    calendar?: ProductionCalendar;
}): OwnedStreamingOriginalIssue[] => {
    const { card, commissionId, genre, making, episodes, isSeries, calendar } = input;
    const fit = getOriginalBudgetFit(genre, making, episodes, isSeries);
    const count = getStudioIssueCount(card, commissionId, fit);
    if (!count) return [];
    const rng = createDeterministicRng(`original-issues:${commissionId}`);
    const pre = calendar?.preProductionWeeks ?? 6;
    const shoot = calendar?.productionWeeks ?? 10;
    const post = calendar?.postProductionWeeks ?? 12;
    const first = pre + 1;
    const span = Math.max(1, shoot + Math.min(4, Math.max(0, post - 2)) - 1);
    let last: OwnedStreamingOriginalIssue['kind'] | null = null;
    return Array.from({ length: count }, (_, index) => {
        const weights: Array<[OwnedStreamingOriginalIssue['kind'], number]> = [
            ['QUALITY', card.onSet < 60 ? 3 : 1.5],
            ['LOCATION', 1.5],
            ['BUDGET', fit < 0.9 || card.budgetControl < 50 ? 3 : 1.5],
        ];
        const open = weights.filter(([kind]) => kind !== last);
        let roll = rng() * open.reduce((sum, [, weight]) => sum + weight, 0);
        const kind = open.find(([, weight]) => (roll -= weight) <= 0)?.[0] || open[0][0];
        last = kind;
        const percent = 0.03 + 0.09 * (0.6 * rng() + 0.4 * (100 - card.budgetControl) / 100);
        const [low, high] = KIND_RISK[kind];
        return {
            id: createDeterministicId('original-issue', commissionId, index),
            kind,
            atElapsedWeek: first + Math.floor(span * (index + rng() * 0.8) / count),
            amount: Math.max(10_000, Math.round(making * percent / 10_000) * 10_000),
            qualityRisk: low + Math.floor(rng() * (high - low + 1)),
            status: 'UPCOMING' as const,
        };
    });
};

interface IssueStory { title: string; line: string; pay: string; compromise: string; needsLead?: boolean; needsPlace?: boolean }

const STORIES: Record<OwnedStreamingOriginalIssue['kind'], IssueStory[]> = {
    QUALITY: [
        { title: "The first cut isn't there yet", line: '{studio} has watched the first cut of {project}. The middle drags, and they want to shoot new scenes.', pay: 'Shoot the new scenes', compromise: 'Keep the cut as it is' },
        { title: 'The back half needs a rewrite', line: "{project}'s last chapters don't land. {studio} wants a script doctor before they shoot any more.", pay: 'Hire the script doctor', compromise: 'Shoot it as written' },
        { title: 'The big sequence came back wrong', line: 'A test audience laughed at the big sequence in {project}. {studio} wants it redone.', pay: 'Redo the sequence', compromise: 'Leave it in' },
    ],
    LOCATION: [
        { title: 'The permit fell through', line: "The {place} permit for {project} has been pulled. {studio} can move the shoot, but it costs.", pay: 'Move the shoot', compromise: 'Build it on a soundstage', needsPlace: true },
        { title: 'Storms have shut the set', line: 'Bad weather has closed the {place} set of {project}, with the crew on the clock.', pay: 'Wait it out', compromise: 'Shoot what they can', needsPlace: true },
        { title: 'The neighbours went to court', line: "Residents near {project}'s set have stopped the night shoots. {studio} has found another street, at a price.", pay: 'Move the night shoots', compromise: 'Cut the night scenes' },
    ],
    BUDGET: [
        { title: 'The money ran out early', line: '{project} has spent its budget with weeks still to shoot. {studio} is asking for more.', pay: 'Cover it', compromise: 'Cut the last big set piece' },
        { title: 'The overtime bill came in', line: "{project}'s crew has run long for weeks, and {studio} wants the overtime covered.", pay: 'Pay the overtime', compromise: 'Send half the crew home' },
        { title: 'A star wants more', line: "{lead}'s agent wants a bigger fee for the last weeks of {project}. {studio} says it can't carry that alone.", pay: 'Pay the agent', compromise: 'Write the character out early', needsLead: true },
    ],
};

const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] || key);

export interface OriginalIssueEventData { commissionId: string; issueId: string }
export interface OriginalIssueView {
    issue: OwnedStreamingOriginalIssue;
    open: boolean;
    title: string;
    line: string;
    payLabel: string;
    compromiseLabel: string;
    project: string;
    studioId: string;
    studioName: string;
    treasury: number;
    canPay: boolean;
}

export const originalIssueEventData = (event: Pick<ScheduledEvent, 'type' | 'data'> | undefined): OriginalIssueEventData | null => {
    const data = event?.type === 'ORIGINAL_ISSUE' ? event.data : null;
    return data?.commissionId && data?.issueId ? { commissionId: String(data.commissionId), issueId: String(data.issueId) } : null;
};

const jobOf = (player: Player, commission: OwnedStreamingOriginalCommission) => (
    commission.canonicalProjectId ? (player.commitments || []).find(item => item.id === commission.canonicalProjectId) : undefined
);

export const getOriginalIssueView = (player: Player, data: OriginalIssueEventData): OriginalIssueView | null => {
    const platform = player.ownedStreamingPlatform;
    const commission = platform?.originalCommissions?.find(item => item.id === data.commissionId);
    const issue = commission?.issues?.find(item => item.id === data.issueId);
    if (!commission || !issue) return null;
    const details = jobOf(player, commission)?.projectDetails;
    const lead = (details?.castList || []).find(member => member.roleType === 'LEAD')?.name || '';
    const place = String((details as any)?.location?.name || '').replace(/,.*$/, '');
    const rng = createDeterministicRng(`original-issue-story:${issue.id}`);
    const usable = STORIES[issue.kind].filter(story => (!story.needsLead || lead) && (!story.needsPlace || place));
    const story = usable[Math.floor(rng() * usable.length)] || STORIES[issue.kind][0];
    const vars = { studio: commission.producerStudioName, project: commission.title, lead, place };
    const treasury = Number(platform.treasuryCash || 0);
    return {
        issue,
        open: issue.status === 'WAITING',
        title: story.title,
        line: fill(story.line, vars),
        payLabel: story.pay,
        compromiseLabel: story.compromise,
        project: commission.title,
        studioId: commission.producerStudioId,
        studioName: commission.producerStudioName,
        treasury,
        canPay: treasury >= issue.amount,
    };
};

const ACTIVE_PHASES = new Set(['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION']);

/** Weekly: the issue that has come due goes up as a popup, one at a time. The next waits until this one is answered and another week has passed. */
export const queueOriginalIssueEvents = (player: Player): Player => {
    const platform = player.ownedStreamingPlatform;
    const commissions = platform?.originalCommissions;
    if (!commissions?.length) return player;
    const pending = player.pendingEvents || [];
    if (pending.some(event => event.type === 'ORIGINAL_ISSUE')) return player;
    for (const commission of commissions) {
        const issue = (commission.issues || []).find(item => item.status === 'UPCOMING' || item.status === 'WAITING');
        if (!issue) continue;
        const job = jobOf(player, commission);
        const calendar = job?.productionCalendar;
        if (!job || !calendar || !ACTIVE_PHASES.has(String(job.projectPhase))) continue;
        if (issue.status === 'UPCOMING' && Number(calendar.elapsedWeeks || 0) < issue.atElapsedWeek) continue;
        const raised: Player = {
            ...player,
            ownedStreamingPlatform: {
                ...platform,
                originalCommissions: commissions.map(item => (item.id !== commission.id ? item : {
                    ...item,
                    issues: (item.issues || []).map(row => (row.id === issue.id ? { ...row, status: 'WAITING' as const } : row)),
                })),
            },
        };
        const data: OriginalIssueEventData = { commissionId: commission.id, issueId: issue.id };
        const view = getOriginalIssueView(raised, data);
        return {
            ...raised,
            pendingEvents: [...pending, {
                id: `original-issue-${issue.id}`,
                week: player.currentWeek,
                type: 'ORIGINAL_ISSUE' as const,
                title: view?.title || 'The studio is asking for money',
                data,
            }],
        };
    }
    return player;
};

export type OriginalIssueChoice = 'PAY' | 'AD' | 'COMPROMISE';

const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);

/** The answer. Paying comes from the platform's money; compromise takes quality off the title for good. */
export const answerOriginalIssue = (player: Player, data: OriginalIssueEventData, choice: OriginalIssueChoice): { player: Player; log: string; changed: boolean } => {
    const view = getOriginalIssueView(player, data);
    if (!view || !view.open) return { player, log: `${view?.project || 'The title'}: already answered.`, changed: false };
    if (choice === 'PAY' && !view.canPay) return { player, log: 'Not enough in the treasury.', changed: false };
    const { issue } = view;
    const platform = player.ownedStreamingPlatform;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `original-issue-paid:${issue.id}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'ORIGINAL_ISSUE_PAID',
        summary: `${view.studioName} was paid ${money(issue.amount)} for ${view.project}: ${view.title.toLowerCase()}.`,
        source: 'PLAYER_ACTION',
        metadata: { commissionId: data.commissionId, issueId: issue.id, amount: issue.amount },
    };
    const status = choice === 'PAY' ? 'PAID' as const : choice === 'AD' ? 'AD' as const : 'COMPROMISED' as const;
    const commission = platform.originalCommissions.find(item => item.id === data.commissionId)!;
    const next: Player = {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            ...(choice === 'PAY' ? { treasuryCash: platform.treasuryCash - issue.amount, eventLedger: [...platform.eventLedger, ledger] } : {}),
            originalCommissions: platform.originalCommissions.map(item => (item.id !== data.commissionId ? item : {
                ...item,
                issues: (item.issues || []).map(row => (row.id === issue.id ? { ...row, status } : row)),
            })),
        },
        commitments: choice !== 'COMPROMISE' ? player.commitments : (player.commitments || []).map(job => (job.id !== commission.canonicalProjectId || !job.projectDetails ? job : {
            ...job,
            projectDetails: {
                ...job.projectDetails,
                hiddenStats: {
                    ...job.projectDetails.hiddenStats,
                    qualityScore: Math.max(1, Number(job.projectDetails.hiddenStats.qualityScore || 50) - issue.qualityRisk),
                },
            },
        })),
    };
    const log = choice === 'PAY'
        ? `${view.project}: paid ${view.studioName} ${money(issue.amount)}. ${view.payLabel}.`
        : choice === 'AD'
            ? `${view.project}: ${view.title.toLowerCase()}. Fixed, nothing to pay.`
            : `${view.project}: ${view.compromiseLabel.toLowerCase()}. Quality down ${issue.qualityRisk}.`;
    return { player: next, log, changed: true };
};
