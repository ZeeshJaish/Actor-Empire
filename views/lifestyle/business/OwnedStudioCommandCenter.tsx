import React from 'react';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Banknote,
    Building2,
    CheckCircle2,
    ChevronRight,
    Clapperboard,
    Clock3,
    Crown,
    DollarSign,
    FileKey2,
    Film,
    Handshake,
    Landmark,
    Layers3,
    PenTool,
    Pencil,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
    XCircle,
} from 'lucide-react';
import type { Business, Player, StudioOperatingMandate, SubsidiaryDecision, SubsidiaryProjectProposal } from '../../../types';
import { getAcquisitionDebtSummary, payDownAcquisitionDebt } from '../../../services/acquisitionDebt';
import { ACQUISITION_COMMITMENTS, getAcquisitionCase } from '../../../services/studioAcquisition';
import {
    getMandateOptionLabel,
    getOperatingModelDefinition,
    getStudioGroup,
    getStudioMandateGroups,
    getStudioOperatingMandate,
    getStudioTreasuryWithdrawalQuote,
    getSubsidiaryControlProfile,
    performStudioTreasuryTransfer,
    setStudioOperatingMandate,
    type StudioTreasuryAction,
    type StudioTreasuryCounterparty,
} from '../../../services/studioGroup';
import {
    approveSubsidiaryProjectProposal,
    getSubsidiaryProjectRevenueBreakdown,
    rejectSubsidiaryProjectProposal,
} from '../../../services/subsidiaryOperations';
import { resolveSubsidiaryDecision } from '../../../services/subsidiaryDecisions';
import type { DevelopmentLabInitialTab } from './DevelopmentLab';
import { getTalentInstabilityState } from '../../../services/talentInstability';
import { getPlayerLanguage, t } from '../../../services/i18n';
import { StudioSaleEntryCard, StudioSaleRoom } from './components/StudioSaleDeckPanel';
import { resolveProjectType } from '../../../services/businessLogic';
import { getReleaseDisplayPhase } from '../../../services/releasePresentation';
import { StudioRenameSheet } from './components/StudioRenameSheet';
import { getStudioRenameAvailability } from '../../../services/studioRebrand';
import { StudioDivisionCard } from './components/StudioDivisionCard';

interface OwnedStudioCommandCenterProps {
    player: Player;
    studio: Business;
    onBack: () => void;
    onChangeOperatingModel: () => void;
    onUpdatePlayer: (player: Player) => void;
    onGreenlightProject: () => void;
    onOpenWorkbench: (tab: DevelopmentLabInitialTab) => void;
    onOpenFacilities: () => void;
    onOpenTalent: () => void;
    onOpenStreamingBids: (projectId: string) => void;
}

const formatMoney = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    const absolute = Math.abs(safe);
    const sign = safe < 0 ? '-' : '';
    if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(0)}K`;
    return `${sign}$${absolute.toFixed(0)}`;
};

const formatDebtInputAmount = (value: number) => (
    value > 0 ? `$${Math.round(value).toLocaleString()}` : ''
);

const CommandSection: React.FC<{
    eyebrow: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ eyebrow, title, icon, children }) => (
    <section className="relative overflow-hidden rounded-[22px] border-2 border-[#29251f] bg-[#0d0c0b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_7px_0_#020202]">
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-amber-300/20 bg-[#2a1b06] text-amber-200 shadow-[0_4px_0_#120a01]">
                {icon}
            </div>
            <div>
                <div className="text-[10px] font-black uppercase text-amber-300">{eyebrow}</div>
                <h2 className="mt-1 text-[15px] font-black uppercase leading-none text-white">{title}</h2>
            </div>
        </div>
        <div className="mt-4">{children}</div>
    </section>
);

const Meter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div>
        <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase text-zinc-600">{label}</span>
            <span className="font-mono text-[9px] font-black text-white">{Math.round(value)}/100</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    </div>
);

const posterGradients = [
    'from-sky-950 via-slate-900 to-black',
    'from-rose-950 via-stone-950 to-black',
    'from-amber-950 via-zinc-950 to-black',
    'from-emerald-950 via-neutral-950 to-black',
    'from-indigo-950 via-zinc-950 to-black',
];

const getPosterGradient = (title: string) => posterGradients[
    Math.abs([...title].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % posterGradients.length
];

const formatSlateMoney = (value: number) => {
    const safe = Math.max(0, Number(value) || 0);
    if (safe >= 1_000_000_000) return `$${(safe / 1_000_000_000).toFixed(1)}B`;
    if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `$${(safe / 1_000).toFixed(0)}K`;
    return `$${safe.toFixed(0)}`;
};

const phaseTone = (phase: string) => {
    if (phase === 'DEVELOPMENT') return 'bg-yellow-400 text-black';
    if (phase === 'PRE-PRODUCTION') return 'bg-orange-400 text-black';
    if (phase === 'PRODUCTION') return 'bg-rose-500 text-white';
    if (phase === 'POST-PRODUCTION') return 'bg-sky-500 text-white';
    if (phase === 'AWAITING RELEASE') return 'bg-amber-300 text-black';
    if (phase === 'PLANNED RELEASE') return 'bg-emerald-500 text-black';
    if (phase === 'STREAMING' || phase === 'IN THEATERS') return 'bg-emerald-400 text-black';
    return 'bg-zinc-700 text-zinc-200';
};

const SubsidiarySlateTile: React.FC<{
    project: {
        id: string;
        name: string;
        phase: string;
        type?: string;
        budget?: number;
        phaseWeeksLeft?: number;
    };
    onOpenStreamingBids?: () => void;
}> = ({ project, onOpenStreamingBids }) => (
    <article className="relative h-[190px] w-[132px] shrink-0 overflow-hidden rounded-[12px] border-2 border-white/[0.08] bg-zinc-950 shadow-[0_7px_0_#020202]">
        <div className={`absolute inset-0 bg-gradient-to-br ${getPosterGradient(project.name)}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="rotate-[-6deg] text-center font-serif text-2xl font-black uppercase leading-none text-white/20">
                {project.name}
            </div>
        </div>
        <div className="relative flex h-full flex-col justify-between p-3">
            <div className="flex justify-end">
                <span className={`rounded px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] ${phaseTone(project.phase)}`}>
                    {project.phase}
                </span>
            </div>
            <div>
                <h3 className="line-clamp-2 text-[13px] font-black leading-tight text-white drop-shadow">{project.name}</h3>
                {onOpenStreamingBids ? (
                    <button
                        type="button"
                        onClick={onOpenStreamingBids}
                        className="mt-2 flex w-full items-center justify-between rounded-[9px] border border-sky-300/40 bg-sky-300 px-2 py-1.5 text-left text-[6px] font-black uppercase tracking-[0.1em] text-sky-950 shadow-[0_3px_0_#082f49] active:translate-y-0.5 active:shadow-[0_1px_0_#082f49]"
                    >
                        Review offers <ChevronRight size={10} />
                    </button>
                ) : null}
                <div className="mt-2 flex items-end justify-between gap-2">
                    <div>
                        <div className="text-[6px] font-black uppercase tracking-wider text-zinc-500">Budget</div>
                        <div className="font-mono text-[9px] font-black text-zinc-200">{formatSlateMoney(project.budget || 0)}</div>
                    </div>
                    {typeof project.phaseWeeksLeft === 'number' ? (
                        <div className="text-right">
                            <div className="text-[6px] font-black uppercase tracking-wider text-zinc-500">Left</div>
                            <div className="flex items-center justify-end gap-1 font-mono text-[9px] font-black text-white">
                                <Clock3 size={9} className="text-zinc-500" /> {Math.max(0, project.phaseWeeksLeft)}w
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    </article>
);

const SubsidiaryArchiveTile: React.FC<{
    project: {
        id: string;
        name: string;
        rating?: number;
        revenue?: number;
        budget?: number;
        type?: string;
        revenueSource?: 'THEATRICAL' | 'STREAMING' | 'HYBRID' | 'OTHER' | 'NONE';
    };
}> = ({ project }) => {
    const rating = Number(project.rating || 0);
    const revenue = Number(project.revenue || 0);
    const budget = Number(project.budget || 0);
    const isStreamingFirst = project.revenueSource === 'STREAMING';
    const hitMultiplier = isStreamingFirst ? 1.35 : 2;
    const flopMultiplier = isStreamingFirst ? 0.35 : 1;
    const outcome = budget > 0 && revenue >= budget * hitMultiplier
        ? 'HIT'
        : budget > 0 && revenue < budget * flopMultiplier
            ? 'FLOP'
            : 'RELEASED';
    const revenueLabel = project.revenueSource === 'THEATRICAL'
        ? 'Gross'
        : project.revenueSource === 'STREAMING'
            ? 'Streaming'
            : 'Revenue';
    return (
        <article className="relative h-[190px] w-[132px] shrink-0 overflow-hidden rounded-[12px] border-2 border-white/[0.08] bg-zinc-950 shadow-[0_7px_0_#020202]">
            <div className={`absolute inset-0 bg-gradient-to-br ${getPosterGradient(project.name)}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center p-3">
                <div className="rotate-[-6deg] text-center font-serif text-2xl font-black uppercase leading-none text-white/20">
                    {project.name}
                </div>
            </div>
            <div className="relative flex h-full flex-col justify-between p-3">
                <div className="flex justify-end">
                    <span className={`rounded px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] ${outcome === 'HIT' ? 'bg-emerald-400 text-black' : outcome === 'FLOP' ? 'bg-rose-500 text-white' : 'bg-zinc-600 text-white'}`}>
                        {outcome}
                    </span>
                </div>
                <div>
                    <h3 className="line-clamp-2 text-[13px] font-black leading-tight text-white drop-shadow">{project.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                            <div className="text-[6px] font-black uppercase tracking-wider text-zinc-500">IMDb</div>
                            <div className="font-mono text-[9px] font-black text-amber-200">{rating ? rating.toFixed(1) : '--'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[6px] font-black uppercase tracking-wider text-zinc-500">{revenueLabel}</div>
                            <div className="font-mono text-[9px] font-black text-emerald-300">{formatSlateMoney(revenue)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
};

const proposalStatusTone: Record<SubsidiaryProjectProposal['status'], string> = {
    PENDING: 'border-amber-300/35 bg-amber-300/[0.08] text-amber-200',
    APPROVED: 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200',
    AUTO_STARTED: 'border-sky-300/35 bg-sky-300/[0.08] text-sky-200',
    REJECTED: 'border-zinc-600 bg-zinc-900 text-zinc-500',
};

const decisionStatusTone: Record<SubsidiaryDecision['status'], string> = {
    PENDING: 'border-amber-300/40 bg-amber-300/[0.08] text-amber-200',
    RESOLVED: 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200',
    DISMISSED: 'border-zinc-600 bg-zinc-900 text-zinc-500',
};

export const OwnedStudioCommandCenter: React.FC<OwnedStudioCommandCenterProps> = ({
    player,
    studio,
    onBack,
    onChangeOperatingModel,
    onUpdatePlayer,
    onGreenlightProject,
    onOpenWorkbench,
    onOpenFacilities,
    onOpenTalent,
    onOpenStreamingBids,
}) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const acquisitionCase = getAcquisitionCase(player, studio.id);
    const model = getOperatingModelDefinition(studio.studioState?.operatingModel, language);
    const controlProfile = getSubsidiaryControlProfile(studio, language);
    const studioMandateGroups = getStudioMandateGroups(language);
    const mandate = getStudioOperatingMandate(studio);
    const [draftMandate, setDraftMandate] = React.useState<StudioOperatingMandate>(mandate);
    const [mandateSaved, setMandateSaved] = React.useState(false);
    const [activeDeck, setActiveDeck] = React.useState<'COMMAND' | 'MANDATE' | 'SLATE' | 'IP' | 'FINANCE'>('COMMAND');
    const [treasuryAmount, setTreasuryAmount] = React.useState('');
    const [treasuryAction, setTreasuryAction] = React.useState<StudioTreasuryAction>('INJECT');
    const [treasuryCounterparty, setTreasuryCounterparty] = React.useState<StudioTreasuryCounterparty>('HQ');
    const [treasuryFeedback, setTreasuryFeedback] = React.useState('');
    const [debtPaydownAmount, setDebtPaydownAmount] = React.useState('');
    const [debtFeedback, setDebtFeedback] = React.useState('');
    const [showSaleRoom, setShowSaleRoom] = React.useState(false);
    const [showRenameStudio, setShowRenameStudio] = React.useState(false);
    const [renameFeedback, setRenameFeedback] = React.useState('');
    const renameAvailability = getStudioRenameAvailability(player, studio);
    const commitments = player.commitments.filter(commitment => commitment.projectDetails?.studioId === studio.id);
    const releases = player.activeReleases.filter(release => release.projectDetails?.studioId === studio.id);
    const pastProjects = player.pastProjects.filter(project => project.studioId === studio.id);
    const activeSlate = [
        ...(studio.studioState?.concepts || []).map(concept => {
            const script = studio.studioState?.scripts?.find(candidate => candidate.id === concept.scriptId);
            return {
                id: concept.id,
                name: script?.title || 'Untitled Development',
                title: script?.title || 'Untitled Development',
                phase: script?.status === 'IN_DEVELOPMENT' ? 'DEVELOPMENT' : 'CONCEPT',
                type: resolveProjectType(script?.projectType, (script as any)?.type, (concept as any)?.projectType, (concept as any)?.type),
                budget: script?.developmentCost || 0,
            };
        }),
        ...commitments.map(commitment => ({
            id: commitment.id,
            name: commitment.name,
            title: commitment.name,
            phase: commitment.projectPhase === 'AWAITING_RELEASE' && commitment.projectDetails?.releaseStrategy
                ? 'PLANNED RELEASE'
                : (commitment.projectPhase || 'PLANNING').replaceAll('_', ' '),
            type: commitment.projectDetails?.type,
            budget: commitment.projectDetails?.estimatedBudget || commitment.upfrontCost || 0,
            phaseWeeksLeft: commitment.phaseWeeksLeft,
        })),
        ...releases.map(release => ({
            id: release.id,
            name: release.name,
            title: release.name,
            phase: getReleaseDisplayPhase(release),
            type: resolveProjectType(release.type, release.projectDetails?.type),
            budget: release.budget,
            phaseWeeksLeft: release.distributionPhase === 'STREAMING' ? release.streaming?.weekOnPlatform : release.weekNum,
        })),
    ];
    const subsidiaryTalentCount = (studio.studioState?.talentRoster || [])
        .filter(contract => contract.studioId === studio.id && contract.status === 'ACTIVE')
        .length;
    const studioTier = studio.subtype === 'MAJOR_STUDIO' ? 'Major' : 'Indie';
    const archiveSlate = [
        ...releases.map(release => {
            const revenue = getSubsidiaryProjectRevenueBreakdown(release);
            return {
                id: release.id,
                name: release.name,
                rating: release.imdbRating,
                revenue: revenue.total,
                revenueSource: revenue.source,
                budget: release.budget,
                type: release.type,
            };
        }),
        ...pastProjects.map(project => {
            const revenue = getSubsidiaryProjectRevenueBreakdown(project);
            return {
                id: project.id,
                name: project.name,
                rating: project.imdbRating || project.rating,
                revenue: revenue.total,
                revenueSource: revenue.source,
                budget: Number((project as any).budget || (project as any).projectDetails?.estimatedBudget || 0),
                type: resolveProjectType(project.projectType, (project as any).projectDetails?.type, project.type),
            };
        }),
    ].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    const rightsTitles = [
        ...(studio.studioState?.ownedRights || []).map(right => right.title),
        ...(studio.studioState?.purchasedIPTitles || []),
        ...pastProjects.map(project => project.name),
    ].filter((title, index, titles) => title && titles.indexOf(title) === index);
    const talentInstability = getTalentInstabilityState(player);
    const recentStudioDeparture = talentInstability.departures.find(departure => departure.studioId === studio.id);
    const talentStabilityScore = Math.max(0, 100 - talentInstability.departureRisk);
    const talentTone = talentInstability.departureRisk >= 65
        ? 'border-rose-300/30 bg-rose-300/[0.06] text-rose-200'
        : talentInstability.departureRisk >= 42
            ? 'border-amber-300/30 bg-amber-300/[0.06] text-amber-200'
            : 'border-emerald-300/30 bg-emerald-300/[0.06] text-emerald-200';
    const debtSummary = getAcquisitionDebtSummary(player);
    const studioDebtEntry = debtSummary.entries.find(entry => entry.studioId === studio.id);
    const legacyDebt = (acquisitionCase?.closing?.verifiedDebt || 0) + (acquisitionCase?.closing?.hiddenLiabilities || 0);
    // Closing liabilities are historical deal context. Only a live ledger entry
    // is an amount the player still owes and should affect this finance view.
    const debt = studioDebtEntry?.remainingPrincipal || 0;
    const studioWeeklyInterest = studioDebtEntry
        ? Math.round(studioDebtEntry.remainingPrincipal * studioDebtEntry.annualInterestRate / 52 / 1_000) * 1_000
        : 0;
    const weeklyResult = studio.stats.weeklyProfit || 0;
    const signedCommitments = ACQUISITION_COMMITMENTS.filter(commitment => acquisitionCase?.offer?.commitments?.includes(commitment.id));
    const parentStudio = getStudioGroup(player).parentStudio;
    const treasuryParsedAmount = Number.parseInt(treasuryAmount.replace(/[^\d]/g, ''), 10) || 0;
    const withdrawalQuote = getStudioTreasuryWithdrawalQuote(player, studio, treasuryParsedAmount);
    const debtParsedAmount = Number.parseInt(debtPaydownAmount.replace(/[^\d]/g, ''), 10) || 0;
    const proposals = [...(studio.studioState?.subsidiaryProjectProposals || [])].sort((a, b) => {
        const aTime = (a.createdYear * 52) + a.createdWeek;
        const bTime = (b.createdYear * 52) + b.createdWeek;
        return bTime - aTime;
    });
    const boardDecisions = [...(studio.studioState?.subsidiaryDecisions || [])].sort((a, b) => {
        const aTime = (a.createdYear * 52) + a.createdWeek;
        const bTime = (b.createdYear * 52) + b.createdWeek;
        return bTime - aTime;
    });
    const pendingBoardDecisions = boardDecisions.filter(decision => decision.status === 'PENDING');
    const resolvedBoardDecisions = boardDecisions.filter(decision => decision.status !== 'PENDING').slice(0, 3);
    const activeDecisionArcs = [...(studio.studioState?.activeDecisionArcs || [])]
        .filter(arc => arc.status === 'ACTIVE')
        .sort((a, b) => {
            const aTime = ((a.nextPulseYear || a.createdYear) * 52) + (a.nextPulseWeek || a.createdWeek);
            const bTime = ((b.nextPulseYear || b.createdYear) * 52) + (b.nextPulseWeek || b.createdWeek);
            return aTime - bTime;
        });
    const pendingProposals = proposals.filter(proposal => proposal.status === 'PENDING');
    const recentDecisions = proposals.filter(proposal => proposal.status !== 'PENDING').slice(0, 3);

    React.useEffect(() => {
        setDraftMandate(getStudioOperatingMandate(studio));
        setMandateSaved(false);
    }, [studio.id, studio.studioState?.operatingMandate]);

    const mandateDirty = JSON.stringify({
        focus: draftMandate.focus,
        budgetAppetite: draftMandate.budgetAppetite,
        releasePace: draftMandate.releasePace,
        ipStrategy: draftMandate.ipStrategy,
        talentPolicy: draftMandate.talentPolicy,
        objective: draftMandate.objective,
        creativeAppetite: draftMandate.creativeAppetite,
        autoProduction: draftMandate.autoProduction,
    }) !== JSON.stringify({
        focus: mandate.focus,
        budgetAppetite: mandate.budgetAppetite,
        releasePace: mandate.releasePace,
        ipStrategy: mandate.ipStrategy,
        talentPolicy: mandate.talentPolicy,
        objective: mandate.objective,
        creativeAppetite: mandate.creativeAppetite,
        autoProduction: mandate.autoProduction,
    });

    const saveMandate = () => {
        if (!controlProfile.canSetMandate) return;
        const result = setStudioOperatingMandate({
            player,
            studioId: studio.id,
            mandate: draftMandate,
        });
        if (!result.success) return;
        onUpdatePlayer(result.player);
        setMandateSaved(true);
    };

    const approveProposal = (proposalId: string) => {
        const result = approveSubsidiaryProjectProposal(player, studio.id, proposalId);
        if (result.success) onUpdatePlayer(result.player);
    };

    const rejectProposal = (proposalId: string) => {
        const result = rejectSubsidiaryProjectProposal(player, studio.id, proposalId);
        if (result.success) onUpdatePlayer(result.player);
    };

    const resolveBoardDecision = (decisionId: string, optionId: 'APPROVE' | 'DECLINE') => {
        const result = resolveSubsidiaryDecision({
            player,
            studioId: studio.id,
            decisionId,
            optionId,
        });
        if (result.success) onUpdatePlayer(result.player);
    };

    const handleTreasuryTransfer = () => {
        const result = performStudioTreasuryTransfer({
            player,
            studioId: studio.id,
            action: treasuryAction,
            counterparty: treasuryCounterparty,
            amount: treasuryParsedAmount,
        });
        if (!result.success) {
            const reasonCopy: Record<string, string> = {
                INVALID_AMOUNT: 'Enter a valid transfer amount.',
                INSUFFICIENT_PERSONAL_CASH: 'Personal balance is lower than that injection.',
                INSUFFICIENT_HQ_CAPITAL: 'Headquarters capital is lower than that injection.',
                INSUFFICIENT_STUDIO_CAPITAL: 'This studio cannot cover that withdrawal.',
                EXCEEDS_DISTRIBUTABLE_CASH: `Board limit: you can receive up to ${formatMoney(result.withdrawalQuote?.maxOwnerProceeds || 0)} right now.`,
                MERGED_STUDIO: 'Merged studios no longer have separate treasury controls.',
                HQ_NOT_FOUND: 'No headquarters studio found for this transfer.',
            };
            setTreasuryFeedback(reasonCopy[result.reason || ''] || 'Transfer could not be completed.');
            return;
        }
        onUpdatePlayer(result.player);
        setTreasuryAmount('');
        setTreasuryFeedback(
            treasuryAction === 'INJECT'
                ? 'Capital injection complete.'
                : result.withdrawalQuote && result.withdrawalQuote.minorityDistribution > 0
                    ? `${formatMoney(result.withdrawalQuote.requestedOwnerProceeds)} moved to ${treasuryCounterparty === 'HQ' ? 'HQ' : 'personal cash'}; ${formatMoney(result.withdrawalQuote.minorityDistribution)} went to outside shareholders.`
                    : 'Earnings withdrawal complete.',
        );
    };

    const handleDebtPaydown = (amount = debtParsedAmount) => {
        const result = payDownAcquisitionDebt(player, amount, studio.id);
        if (!result.success) {
            const reasonCopy: Record<string, string> = {
                NO_ACTIVE_DEBT: 'This studio has no active acquisition debt.',
                INVALID_AMOUNT: 'Enter a valid pay-down amount.',
                INSUFFICIENT_CASH: 'Personal cash is lower than that pay-down.',
            };
            setDebtFeedback(reasonCopy[result.reason || ''] || 'Debt pay-down could not be completed.');
            return;
        }
        onUpdatePlayer(result.player);
        setDebtPaydownAmount('');
        setDebtFeedback(`Debt principal reduced by ${formatMoney(result.paidAmount)}.`);
    };

    const fillDebtPaydownPreset = (amount: number) => {
        if (amount <= 0) return;
        setDebtPaydownAmount(formatDebtInputAmount(amount));
        setDebtFeedback('Amount staged. Tap Pay Down to confirm.');
    };

    const openRenameStudio = () => {
        setRenameFeedback('');
        setShowRenameStudio(true);
    };

    const authority = model?.id === 'INDEPENDENT_LABEL'
        ? ['Review performance', 'Set broad mandate', 'Receive profits or absorb losses']
        : model?.id === 'CONTROLLED_SUBSIDIARY'
            ? ['Set strategy and budgets', 'Control leadership', 'Authorize major productions']
            : model?.id === 'FULL_MERGER'
                ? ['Integration authority', 'Transfer catalog and facilities', 'Absorb debt and liabilities']
                : ['Choose an operating model to unlock control authority'];

    return (
        <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="fixed inset-0 z-[70] flex flex-col bg-[#050505] text-white"
        >
            <header className="relative shrink-0 overflow-hidden border-b border-[#29251f] bg-[#0c0a08] px-4 pb-5 pt-12">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="relative flex items-start gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border-2 border-[#342c20] bg-[#15110c] text-zinc-400 shadow-[0_4px_0_#020202] active:translate-y-0.5 active:shadow-[0_2px_0_#020202]"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="text-[7px] font-black uppercase tracking-[0.27em] text-amber-300">{tr('ownedStudio.header.title')}</div>
                        <div className="mt-1 min-w-0 pr-1">
                            <h1
                                className={`min-w-0 break-words font-serif font-black uppercase italic tracking-tight text-white ${
                                    studio.name.length > 40
                                        ? 'text-[18px] leading-[1.02]'
                                        : studio.name.length > 28
                                            ? 'text-xl leading-[1.02]'
                                            : 'text-2xl leading-none'
                                }`}
                            >
                                {studio.name}
                            </h1>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] text-zinc-400">
                                {tr('ownedStudio.header.ownedStudio')}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] ${model ? 'border-amber-300/25 bg-amber-300/[0.08] text-amber-200' : 'border-rose-300/25 bg-rose-300/[0.08] text-rose-200'}`}>
                                {model?.label || tr('ownedStudio.header.decisionRequired')}
                            </span>
                            <button
                                type="button"
                                onClick={openRenameStudio}
                                disabled={!renameAvailability.allowed}
                                aria-label={`Rename ${studio.name}`}
                                title={renameAvailability.message || `Rebrand ${studio.name}`}
                                className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/[0.09] px-3 text-[6px] font-black uppercase tracking-[0.14em] text-amber-100 shadow-[0_3px_0_#060401] transition-colors duration-200 hover:bg-amber-300/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 active:translate-y-0.5 active:shadow-[0_1px_0_#060401] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-500 disabled:shadow-none"
                            >
                                {renameAvailability.allowed ? <Pencil size={11} /> : <Clock3 size={11} />}
                                {renameAvailability.allowed
                                    ? 'Rebrand'
                                    : renameAvailability.cooldownWeeks > 0
                                        ? `Rebrand · ${renameAvailability.cooldownWeeks}W`
                                        : 'Court Case Active'}
                            </button>
                        </div>
                        {!renameAvailability.allowed ? (
                            <div role="status" className="mt-2 flex items-start gap-1.5 text-[7px] font-bold leading-snug text-zinc-500">
                                <Clock3 size={10} className="mt-0.5 shrink-0 text-amber-300/70" />
                                <span>{renameAvailability.message}</span>
                            </div>
                        ) : null}
                        {renameFeedback ? (
                            <div role="status" className="mt-2 text-[7px] font-bold leading-snug text-emerald-300">
                                {renameFeedback}
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="relative mt-5 grid grid-cols-3 overflow-hidden rounded-[18px] border-2 border-[#29251f] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="border-r border-[#29251f] p-3">
                        <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">{tr('ownedStudio.metric.valuation')}</div>
                        <div className="mt-1 font-mono text-[12px] font-black text-white">{formatMoney(studio.stats.valuation)}</div>
                    </div>
                    <div className="border-r border-[#29251f] p-3">
                        <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">{tr('ownedStudio.metric.capital')}</div>
                        <div className="mt-1 font-mono text-[12px] font-black text-emerald-300">{formatMoney(studio.balance)}</div>
                    </div>
                    <div className="p-3">
                        <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">{tr('ownedStudio.metric.weekly')}</div>
                        <div className={`mt-1 flex items-center gap-1 font-mono text-[12px] font-black ${weeklyResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {weeklyResult >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {formatMoney(weeklyResult)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 custom-scrollbar">
                <div className="mx-auto max-w-3xl space-y-4">
                    <nav className="grid grid-cols-5 gap-1 rounded-[18px] border-2 border-[#29251f] bg-[#0b0a09] p-1 shadow-[0_5px_0_#020202]">
                        {[
                            'COMMAND',
                            'MANDATE',
                            'SLATE',
                            'IP',
                            'FINANCE',
                        ].map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveDeck(id as typeof activeDeck)}
                                className={`min-h-10 rounded-[13px] px-1 text-[10px] font-black uppercase transition ${
                                    activeDeck === id
                                        ? 'bg-amber-300 text-black shadow-[0_3px_0_#6b4304]'
                                        : 'text-zinc-600'
                                }`}
                            >
                                {tr(`ownedStudio.deck.${id}`)}
                            </button>
                        ))}
                    </nav>

                    {activeDeck === 'COMMAND' ? (
                        <>
                            {activeDecisionArcs.length ? (
                                <CommandSection eyebrow={tr('ownedStudio.section.liveConsequences')} title={tr('ownedStudio.section.activeStorylines')} icon={<Sparkles size={19} />}>
                                    <div className="space-y-2.5">
                                        {activeDecisionArcs.slice(0, 3).map(arc => {
                                            const nextBeat = arc.beats[arc.beatsResolved] || arc.beats[arc.beats.length - 1];
                                            const progress = Math.max(0, Math.min(100, (arc.beatsResolved / Math.max(1, arc.beats.length)) * 100));
                                            const toneClass = arc.tone === 'negative'
                                                ? 'border-rose-300/30 bg-rose-300/[0.05] text-rose-200'
                                                : arc.tone === 'positive'
                                                    ? 'border-emerald-300/30 bg-emerald-300/[0.05] text-emerald-200'
                                                    : 'border-sky-300/25 bg-sky-300/[0.05] text-sky-200';
                                            return (
                                                <article key={arc.id} className={`rounded-[17px] border-2 p-3 shadow-[0_4px_0_#020202] ${toneClass}`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-[6px] font-black uppercase tracking-[0.18em] opacity-80">
                                                                {arc.sourceDecisionType.replaceAll('_', ' ')} · aftermath
                                                            </div>
                                                            <h3 className="mt-1 text-[15px] font-black uppercase leading-none text-white">{arc.title}</h3>
                                                        </div>
                                                        <div className="shrink-0 rounded-full border border-current/30 bg-black/30 px-2 py-1 text-[5px] font-black uppercase tracking-[0.12em]">
                                                            W{arc.nextPulseWeek || '--'}
                                                        </div>
                                                    </div>
                                                    <p className="mt-2 line-clamp-2 text-[8px] font-bold leading-relaxed text-zinc-400">{arc.summary}</p>
                                                    <div className="mt-3 rounded-[13px] border border-white/[0.07] bg-black/35 p-2.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">Next Beat</span>
                                                            <span className="font-mono text-[8px] font-black text-white">{arc.beatsResolved}/{arc.beats.length}</span>
                                                        </div>
                                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black">
                                                            <div className="h-full rounded-full bg-current" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        {nextBeat ? (
                                                            <div className="mt-2 text-[8px] font-black uppercase tracking-[0.08em] text-white">{nextBeat.label}</div>
                                                        ) : null}
                                                        {nextBeat ? (
                                                            <div className="mt-1 text-[7px] font-bold leading-snug text-zinc-500">{nextBeat.effect}</div>
                                                        ) : null}
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </CommandSection>
                            ) : null}
                            <CommandSection eyebrow={tr('ownedStudio.section.peopleRisk')} title={tr('ownedStudio.section.talentStability')} icon={<Users size={19} />}>
                                <div className={`rounded-[18px] border-2 p-3 shadow-[0_5px_0_#020202] ${talentTone}`}>
                                    <div className="grid grid-cols-3 overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/35">
                                        <div className="border-r border-white/[0.08] p-3">
                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-500">Stability</div>
                                            <div className="mt-1 font-mono text-[16px] font-black text-white">{Math.round(talentStabilityScore)}%</div>
                                        </div>
                                        <div className="border-r border-white/[0.08] p-3">
                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-500">Risk</div>
                                            <div className="mt-1 font-mono text-[16px] font-black text-current">{Math.round(talentInstability.departureRisk)}%</div>
                                        </div>
                                        <div className="p-3">
                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-500">Shield</div>
                                            <div className="mt-1 font-mono text-[16px] font-black text-white">{talentInstability.retentionShieldWeeksRemaining}W</div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <Meter label="Retention confidence" value={talentStabilityScore} color={talentInstability.departureRisk >= 65 ? 'bg-rose-300' : talentInstability.departureRisk >= 42 ? 'bg-amber-300' : 'bg-emerald-300'} />
                                    </div>
                                    <div className="mt-3 rounded-[13px] border border-white/[0.07] bg-black/30 p-3">
                                        <div className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                            {recentStudioDeparture ? 'Recent Departure' : 'Current Read'}
                                        </div>
                                        <p className="mt-1 text-[8px] font-bold leading-relaxed text-zinc-400">
                                            {recentStudioDeparture
                                                ? `${recentStudioDeparture.staffName}, ${recentStudioDeparture.role}, left ${studio.name}.`
                                                : talentInstability.departureRisk >= 42
                                                    ? 'Retention pressure is active. The next major decision arrives as a popup when staff demand reassurance.'
                                                    : 'Studio staff are stable. Acquisition pressure is not creating immediate churn.'}
                                        </p>
                                    </div>
                                </div>
                            </CommandSection>
                            <CommandSection eyebrow="Ownership Docket" title="Board Decisions" icon={<ShieldAlert size={19} />}>
                                {pendingBoardDecisions.length ? (
                                    <div className="space-y-3">
                                        {pendingBoardDecisions.slice(0, 2).map(decision => (
                                            <article key={decision.id} className="overflow-hidden rounded-[20px] border-2 border-sky-300/30 bg-[#071117] shadow-[0_6px_0_#020609]">
                                                <div className="border-b border-sky-300/10 bg-sky-300/[0.04] p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-[6px] font-black uppercase tracking-[0.18em] text-sky-300">
                                                                {decision.personality} · {decision.type.replaceAll('_', ' ')}
                                                            </div>
                                                            <h3 className="mt-1 text-[18px] font-black uppercase leading-none text-white">{decision.title}</h3>
                                                        </div>
                                                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[5px] font-black uppercase tracking-[0.12em] ${decisionStatusTone[decision.status]}`}>
                                                            {tr(`ownedStudio.status.decision.${decision.status}`)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-3 text-[9px] font-bold leading-relaxed text-zinc-400">{decision.summary}</p>
                                                </div>
                                                <div className="p-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="rounded-[14px] border border-white/[0.07] bg-black/35 p-3">
                                                            <div className="text-[5px] font-black uppercase tracking-[0.16em] text-zinc-600">Decision Value</div>
                                                            <div className="mt-1 font-mono text-[15px] font-black text-sky-200">
                                                                {decision.recommendedAmount ? formatMoney(decision.recommendedAmount) : 'Board Vote'}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-[14px] border border-white/[0.07] bg-black/35 p-3">
                                                            <div className="text-[5px] font-black uppercase tracking-[0.16em] text-zinc-600">Due</div>
                                                            <div className="mt-1 font-mono text-[15px] font-black text-white">
                                                                W{decision.dueWeek || decision.createdWeek + 8}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 grid gap-1.5">
                                                        {decision.logic.slice(0, 3).map(reason => (
                                                            <div key={reason} className="flex items-start gap-2 rounded-[12px] border border-white/[0.06] bg-black/30 px-2.5 py-2">
                                                                <Sparkles size={10} className="mt-0.5 shrink-0 text-sky-300" />
                                                                <span className="text-[7px] font-bold leading-snug text-zinc-500">{reason}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 rounded-[14px] border border-amber-300/15 bg-amber-300/[0.04] p-3">
                                                        <div className="text-[6px] font-black uppercase tracking-[0.18em] text-amber-300">Stakes</div>
                                                        <div className="mt-2 grid gap-1.5">
                                                            {decision.stakes.slice(0, 3).map(stake => (
                                                                <div key={stake} className="flex items-start gap-2 text-[7px] font-bold leading-snug text-zinc-500">
                                                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                                                                    {stake}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {decision.followUp ? (
                                                        <div className="mt-3 rounded-[14px] border-2 border-emerald-300/20 bg-emerald-300/[0.06] p-3">
                                                            <div className="text-[6px] font-black uppercase tracking-[0.18em] text-emerald-300">{decision.followUp.label}</div>
                                                            <div className="mt-1 text-[8px] font-bold leading-relaxed text-emerald-100/80">{decision.followUp.effect}</div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="grid grid-cols-2 border-t border-sky-300/15">
                                                    {decision.options.map(option => (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => resolveBoardDecision(decision.id, option.id)}
                                                            className={`min-h-14 px-3 text-left transition active:translate-y-0.5 ${
                                                                option.id === 'APPROVE'
                                                                    ? 'bg-sky-300 text-black'
                                                                    : 'bg-black text-zinc-500'
                                                            }`}
                                                        >
                                                            <div className="text-[8px] font-black uppercase tracking-[0.14em]">{option.label}</div>
                                                            <div className={`mt-1 line-clamp-1 text-[6px] font-bold ${option.id === 'APPROVE' ? 'text-black/60' : 'text-zinc-700'}`}>
                                                                {option.preview}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-[15px] border border-dashed border-sky-300/15 bg-black/25 p-4 text-center">
                                        <div className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">No ownership decisions waiting</div>
                                        <p className="mt-2 text-[8px] font-bold leading-relaxed text-zinc-600">
                                            Major subsidiary calls appear every 8–16 weeks based on personality, performance and mandate.
                                        </p>
                                    </div>
                                )}
                                {resolvedBoardDecisions.length ? (
                                    <div className="mt-3 space-y-2">
                                        {resolvedBoardDecisions.map(decision => (
                                            <div key={decision.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.06] bg-black/25 px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-[8px] font-black uppercase text-zinc-300">{decision.title}</div>
                                                    <div className="mt-0.5 text-[5px] font-black uppercase tracking-[0.14em] text-zinc-600">
                                                        {decision.selectedOptionId === 'APPROVE' ? 'Approved' : 'Declined'} · {decision.outcomeSummary || decision.personality}
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[5px] font-black uppercase tracking-[0.11em] ${decisionStatusTone[decision.status]}`}>
                                                    {tr(`ownedStudio.status.decision.${decision.status}`)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </CommandSection>
                            <CommandSection eyebrow="Mandate Engine" title="Board Proposals" icon={<Clock3 size={19} />}>
                                {pendingProposals.length ? (
                                    <div className="space-y-3">
                                        {pendingProposals.slice(0, 2).map(proposal => (
                                            <article key={proposal.id} className="overflow-hidden rounded-[18px] border-2 border-amber-300/25 bg-[#150f05] shadow-[0_5px_0_#050301]">
                                                <div className="p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-[6px] font-black uppercase tracking-[0.18em] text-amber-300">
                                                                {proposal.projectType} · {proposal.genre.replaceAll('_', ' ')}
                                                            </div>
                                                            <h3 className="mt-1 line-clamp-2 text-[16px] font-black uppercase leading-none text-white">{proposal.title}</h3>
                                                        </div>
                                                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[5px] font-black uppercase tracking-[0.12em] ${proposalStatusTone[proposal.status]}`}>
                                                            {tr(`ownedStudio.status.proposal.${proposal.status}`)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[13px] border border-white/[0.07] bg-black/35">
                                                        <div className="border-r border-white/[0.07] p-2">
                                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Budget</div>
                                                            <div className="mt-1 font-mono text-[10px] font-black text-amber-200">{formatMoney(proposal.estimatedBudget)}</div>
                                                        </div>
                                                        <div className="border-r border-white/[0.07] p-2">
                                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Tier</div>
                                                            <div className="mt-1 text-[9px] font-black uppercase text-white">{proposal.budgetTier}</div>
                                                        </div>
                                                        <div className="p-2">
                                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">Source</div>
                                                            <div className="mt-1 truncate text-[9px] font-black uppercase text-sky-200">{proposal.sourceLabel || proposal.source}</div>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 text-[9px] font-bold leading-relaxed text-zinc-400">{proposal.logline}</p>
                                                    <div className="mt-3 space-y-1.5">
                                                        {proposal.logic.slice(0, 3).map(reason => (
                                                            <div key={reason} className="flex items-start gap-2 rounded-[11px] border border-white/[0.06] bg-black/25 px-2.5 py-2">
                                                                <Sparkles size={10} className="mt-0.5 shrink-0 text-amber-300" />
                                                                <span className="text-[7px] font-bold leading-snug text-zinc-500">{reason}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 border-t border-amber-300/15">
                                                    <button
                                                        type="button"
                                                        onClick={() => approveProposal(proposal.id)}
                                                        className="flex min-h-11 items-center justify-center gap-2 bg-emerald-300 text-[8px] font-black uppercase tracking-[0.15em] text-black"
                                                    >
                                                        <CheckCircle2 size={14} /> Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => rejectProposal(proposal.id)}
                                                        className="flex min-h-11 items-center justify-center gap-2 bg-black text-[8px] font-black uppercase tracking-[0.15em] text-zinc-500"
                                                    >
                                                        <XCircle size={14} /> Reject
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-[15px] border border-dashed border-amber-300/15 bg-black/25 p-4 text-center">
                                        <div className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">No board proposals waiting</div>
                                        <p className="mt-2 text-[8px] font-bold leading-relaxed text-zinc-600">
                                            The next proposal is generated by this studio’s mandate, release pace and operating model.
                                        </p>
                                    </div>
                                )}
                                {recentDecisions.length ? (
                                    <div className="mt-3 grid gap-2">
                                        {recentDecisions.map(proposal => (
                                            <div key={proposal.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.06] bg-black/25 px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-[8px] font-black uppercase text-zinc-300">{proposal.title}</div>
                                                    <div className="mt-0.5 text-[5px] font-black uppercase tracking-[0.14em] text-zinc-600">
                                                        {proposal.genre.replaceAll('_', ' ')} · {formatMoney(proposal.estimatedBudget)}
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[5px] font-black uppercase tracking-[0.11em] ${proposalStatusTone[proposal.status]}`}>
                                                    {tr(`ownedStudio.status.proposal.${proposal.status}`)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </CommandSection>
                            <CommandSection eyebrow="Board Directive" title="Control Authority" icon={<Crown size={19} />}>
                                <div className="grid gap-2">
                                    {authority.map(item => (
                                        <div key={item} className="flex items-center gap-2 rounded-[12px] border border-white/[0.06] bg-black/35 px-3 py-2">
                                            <CheckCircle2 size={13} className="shrink-0 text-amber-300" />
                                            <span className="text-[8px] font-bold text-zinc-300">{item}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={onChangeOperatingModel}
                                    className="mt-3 flex min-h-11 w-full items-center justify-between rounded-[14px] border-2 border-amber-300/30 bg-[#2a1b06] px-3 text-[8px] font-black uppercase tracking-[0.15em] text-amber-100 shadow-[0_4px_0_#120a01] active:translate-y-0.5 active:shadow-[0_2px_0_#120a01]"
                                >
                                    {tr('ownedStudio.command.changeOperatingModel')} <ChevronRight size={14} />
                                </button>
                            </CommandSection>
                            <CommandSection eyebrow={tr('ownedStudio.command.modelAware')} title={controlProfile.canDirectProduce ? tr('ownedStudio.command.directProductionConsole') : controlProfile.canAutoProduce ? tr('ownedStudio.command.autonomousLabelBoard') : tr('ownedStudio.command.integratedAssets')} icon={<Clapperboard size={19} />}>
                                <div className="rounded-[17px] border border-white/[0.08] bg-black/35 p-4">
                                    <div className="text-[7px] font-black uppercase tracking-[0.2em] text-amber-300">{controlProfile.controlCopy}</div>
                                    <p className="mt-2 text-[10px] font-bold leading-relaxed text-zinc-400">{controlProfile.productionCopy}</p>
                                    {controlProfile.canDirectProduce ? (
                                        <div className="mt-4">
                                            <div className="mb-3 border-l-2 border-sky-300/45 pl-3">
                                                <div className="text-[6px] font-black uppercase tracking-[0.18em] text-sky-200">Subsidiary divisions</div>
                                                <p className="mt-1 text-[8px] font-bold leading-relaxed text-zinc-500">
                                                    Staff, upgrades, equipment and project cash below belong to {studio.name}.
                                                </p>
                                            </div>
                                            <div className="relative overflow-hidden rounded-[20px] border-2 border-[#29251f] bg-[#0a0908] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_0_#020202]">
                                                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/25 to-transparent" />
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <StudioDivisionCard
                                                        title={tr('studio.devLab')}
                                                        subtitle={tr('services.business.productionDashboard.division.devSubtitle')}
                                                        icon={<PenTool size={20} />}
                                                        accent="BLUE"
                                                        stats={[{ label: tr('services.business.productionDashboard.division.scripts'), value: String(studio.studioState?.scripts?.length || 0) }]}
                                                        onClick={() => onOpenWorkbench('VAULT')}
                                                        ariaLabel={`Open ${studio.name} development lab`}
                                                    />
                                                    <StudioDivisionCard
                                                        title={tr('studio.facilities')}
                                                        subtitle={tr('services.business.productionDashboard.division.facilitiesSubtitle')}
                                                        icon={<Building2 size={20} />}
                                                        accent="EMERALD"
                                                        stats={[{ label: tr('services.business.productionDashboard.division.tier'), value: studioTier }]}
                                                        onClick={onOpenFacilities}
                                                        ariaLabel={`Open ${studio.name} facilities`}
                                                    />
                                                    <StudioDivisionCard
                                                        title={tr('studio.talent')}
                                                        subtitle={tr('services.business.productionDashboard.division.talentSubtitle')}
                                                        icon={<Users size={20} />}
                                                        accent="PURPLE"
                                                        stats={[{ label: tr('services.business.productionDashboard.division.stars'), value: String(subsidiaryTalentCount) }]}
                                                        onClick={onOpenTalent}
                                                        ariaLabel={`Open ${studio.name} talent roster`}
                                                    />
                                                    <StudioDivisionCard
                                                        title={tr('studio.finance')}
                                                        subtitle={tr('services.business.productionDashboard.division.financeSubtitle')}
                                                        icon={<DollarSign size={20} />}
                                                        accent="ORANGE"
                                                        stats={[{ label: tr('services.business.productionDashboard.division.capital'), value: formatMoney(studio.balance) }]}
                                                        onClick={() => setActiveDeck('FINANCE')}
                                                        ariaLabel={`Open ${studio.name} finance`}
                                                    />
                                                    <StudioDivisionCard
                                                        wide
                                                        eyebrow="Production command"
                                                        title={tr('ownedStudio.command.greenlightProject')}
                                                        subtitle={tr('ownedStudio.command.existingWizard', { studio: studio.name })}
                                                        icon={<Clapperboard size={22} />}
                                                        accent="GOLD"
                                                        stats={[
                                                            { label: 'Active slate', value: String(activeSlate.length) },
                                                            { label: 'Available cash', value: formatMoney(studio.balance) },
                                                        ]}
                                                        onClick={onGreenlightProject}
                                                        ariaLabel={`Greenlight a project for ${studio.name}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="hidden">
                                                {/* Audit anchors: script and IP still route through existing studio-scoped systems. */}
                                                ownedStudio.workbench.VAULT ownedStudio.workbench.IP_MARKET ownedStudio.workbench.FRANCHISES ownedStudio.workbench.UNIVERSE
                                            </div>
                                            <div className="sr-only">Controlled subsidiary greenlight uses existing Greenlight Wizard.</div>
                                        </div>
                                    ) : controlProfile.canAutoProduce ? (
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {[
                                                ['Focus', getMandateOptionLabel('focus', draftMandate.focus, language)],
                                                ['Pace', getMandateOptionLabel('releasePace', draftMandate.releasePace, language)],
                                                ['Auto', getMandateOptionLabel('autoProduction', draftMandate.autoProduction, language)],
                                            ].map(([label, value]) => (
                                                <div key={label} className="rounded-[13px] border border-emerald-300/15 bg-emerald-300/[0.05] p-2">
                                                    <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">{label}</div>
                                                    <div className="mt-1 truncate text-[8px] font-black uppercase text-emerald-200">{value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </CommandSection>
                        </>
                    ) : null}

                    {activeDeck === 'MANDATE' ? (
                        <CommandSection eyebrow="Studio Strategy" title="Operating Mandate" icon={<Target size={19} />}>
                            <div className="rounded-[16px] border-2 border-[#2d2414] bg-[#120d07] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[6px] font-black uppercase tracking-[0.18em] text-amber-300">Command Permission</div>
                                        <div className="mt-1 text-[10px] font-black uppercase text-white">{controlProfile.controlCopy}</div>
                                        <p className="mt-1 max-w-md text-[8px] font-bold leading-relaxed text-zinc-500">{controlProfile.productionCopy}</p>
                                    </div>
                                    <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.14em] ${controlProfile.canDirectProduce ? 'border-sky-300/35 bg-sky-300/[0.08] text-sky-200' : controlProfile.canAutoProduce ? 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-500'}`}>
                                        {controlProfile.canDirectProduce ? 'Direct Production' : controlProfile.canAutoProduce ? 'Auto Label' : 'Locked'}
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {(['focus', 'budgetAppetite', 'ipStrategy', 'autoProduction'] as const).map(key => (
                                        <div key={key} className="rounded-[12px] border border-white/[0.06] bg-black/35 p-2">
                                            <div className="text-[5px] font-black uppercase tracking-wider text-zinc-600">{studioMandateGroups.find(group => group.key === key)?.label}</div>
                                            <div className="mt-1 truncate text-[9px] font-black uppercase text-amber-100">{getMandateOptionLabel(key, draftMandate[key], language)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {controlProfile.canSetMandate ? (
                                <div className="mt-3 space-y-3">
                                    {studioMandateGroups.map(group => (
                                        <div key={group.key} className="rounded-[15px] border border-white/[0.06] bg-black/30 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">{group.label}</div>
                                                    <div className="mt-0.5 text-[8px] font-bold text-zinc-400">{group.commandLabel}</div>
                                                </div>
                                                <div className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-2 py-1 text-[6px] font-black uppercase tracking-wider text-amber-200">
                                                    {getMandateOptionLabel(group.key, draftMandate[group.key], language)}
                                                </div>
                                            </div>
                                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                                {group.options.map(option => {
                                                    const active = draftMandate[group.key] === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setDraftMandate(current => ({
                                                                    ...current,
                                                                    [group.key]: option.id,
                                                                }));
                                                                setMandateSaved(false);
                                                            }}
                                                            className={`min-w-[116px] rounded-[12px] border-2 px-3 py-2 text-left transition active:translate-y-0.5 ${
                                                                active
                                                                    ? 'border-amber-300 bg-amber-300 text-black shadow-[0_4px_0_#6b4304]'
                                                                    : 'border-[#2b2824] bg-[#100f0e] text-zinc-400 shadow-[0_4px_0_#020202]'
                                                            }`}
                                                        >
                                                            <div className="text-[8px] font-black uppercase tracking-[0.12em]">{option.shortLabel}</div>
                                                            <div className={`mt-1 line-clamp-2 text-[6px] font-bold leading-snug ${active ? 'text-black/65' : 'text-zinc-600'}`}>{option.description}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={saveMandate}
                                        disabled={!mandateDirty && !mandateSaved}
                                        className={`flex min-h-12 w-full items-center justify-center rounded-[16px] border-2 px-4 text-[9px] font-black uppercase tracking-[0.17em] transition active:translate-y-0.5 ${
                                            mandateDirty
                                                ? 'border-amber-200 bg-amber-300 text-black shadow-[0_5px_0_#6b4304]'
                                                : mandateSaved
                                                    ? 'border-emerald-300/40 bg-emerald-300/[0.12] text-emerald-200 shadow-[0_5px_0_#042014]'
                                                    : 'border-[#2b2824] bg-[#111] text-zinc-600 shadow-[0_5px_0_#020202]'
                                        }`}
                                    >
                                        {mandateDirty ? 'Issue Studio Mandate' : mandateSaved ? 'Mandate Locked In' : 'Mandate Up To Date'}
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-[15px] border border-dashed border-zinc-700 bg-black/25 px-4 py-5 text-center">
                                    <div className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">Separate mandate unavailable</div>
                                    <p className="mt-2 text-[8px] font-bold leading-relaxed text-zinc-600">
                                        This studio is merged into the parent company, so strategy moves through the main production house.
                                    </p>
                                </div>
                            )}
                        </CommandSection>
                    ) : null}

                    {activeDeck === 'SLATE' ? (
                        <>
                            <CommandSection eyebrow="Autonomous Decisions" title="Mandate History" icon={<Clock3 size={19} />}>
                                {proposals.length ? (
                                    <div className="space-y-2">
                                        {proposals.slice(0, 5).map(proposal => (
                                            <div key={proposal.id} className="rounded-[14px] border border-white/[0.06] bg-black/30 p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-[9px] font-black uppercase text-white">{proposal.title}</div>
                                                        <div className="mt-1 text-[5px] font-black uppercase tracking-[0.14em] text-zinc-600">
                                                            Y{proposal.createdYear} · W{proposal.createdWeek} · {proposal.projectType} · {proposal.sourceLabel || proposal.source}
                                                        </div>
                                                    </div>
                                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[5px] font-black uppercase tracking-[0.11em] ${proposalStatusTone[proposal.status]}`}>
                                                        {tr(`ownedStudio.status.proposal.${proposal.status}`)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-[7px] font-bold leading-relaxed text-zinc-500">{proposal.logic[0]}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-[13px] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-center text-[8px] font-bold text-zinc-600">
                                        No autonomous mandate decisions yet.
                                    </div>
                                )}
                            </CommandSection>
                            <CommandSection eyebrow="Production Board" title="Active Slate" icon={<Clapperboard size={19} />}>
                                {activeSlate.length ? (
                                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
                                        {activeSlate.slice(0, 10).map(project => (
                                            <SubsidiarySlateTile
                                                key={project.id}
                                                project={project}
                                                onOpenStreamingBids={
                                                    studio.studioState?.operatingModel === 'CONTROLLED_SUBSIDIARY'
                                                    && project.phase === 'BIDDING'
                                                        ? () => onOpenStreamingBids(project.id)
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-[13px] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-center text-[8px] font-bold text-zinc-600">
                                        No active productions under this studio.
                                    </div>
                                )}
                            </CommandSection>
                            <CommandSection eyebrow="Studio Slate" title="Past Slate" icon={<Film size={19} />}>
                                {archiveSlate.length ? (
                                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
                                        {archiveSlate.slice(0, 10).map(project => (
                                            <SubsidiaryArchiveTile key={project.id} project={project} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-[13px] border border-dashed border-white/10 bg-black/25 px-4 py-5 text-center text-[8px] font-bold text-zinc-600">
                                        No released titles from this acquired studio yet.
                                    </div>
                                )}
                            </CommandSection>
                            <CommandSection eyebrow="Company Condition" title="Momentum & Brand" icon={<Sparkles size={19} />}>
                                <div className="space-y-3">
                                    <Meter label="Studio Momentum" value={studio.stats.studioMomentum || studio.stats.hype || 0} color="bg-amber-300" />
                                    <Meter label="Brand Health" value={studio.stats.brandHealth || 0} color="bg-sky-300" />
                                    <Meter label="Investor Confidence" value={studio.stats.investorConfidence || 0} color="bg-emerald-300" />
                                </div>
                            </CommandSection>
                        </>
                    ) : null}

                    {activeDeck === 'IP' ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <CommandSection eyebrow={tr('ownedStudio.ip.rightsVault')} title={tr('ownedStudio.ip.catalogIp')} icon={<Layers3 size={19} />}>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="font-mono text-3xl font-black text-amber-200">{rightsTitles.length}</div>
                                        <div className="text-[6px] font-black uppercase tracking-[0.16em] text-zinc-600">{tr('ownedStudio.ip.controlledTitles')}</div>
                                    </div>
                                    <FileKey2 size={24} className="text-zinc-700" />
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    {rightsTitles.slice(0, 3).map(title => (
                                        <div key={title} className="truncate border-l-2 border-amber-300/35 pl-2 text-[8px] font-bold text-zinc-400">{title}</div>
                                    ))}
                                    {!rightsTitles.length ? <div className="text-[8px] font-bold text-zinc-600">{tr('ownedStudio.ip.noCatalog')}</div> : null}
                                </div>
                            </CommandSection>
                        </div>
                    ) : null}

                    {activeDeck === 'FINANCE' ? (
                        <>
                            <CommandSection eyebrow="Treasury Desk" title="Move Studio Capital" icon={<Banknote size={19} />}>
                                <div className="rounded-[18px] border-2 border-[#2d2414] bg-[#120d07] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['INJECT', 'WITHDRAW'] as StudioTreasuryAction[]).map(action => (
                                            <button
                                                key={action}
                                                type="button"
                                                onClick={() => {
                                                    setTreasuryAction(action);
                                                    setTreasuryFeedback('');
                                                }}
                                                className={`min-h-11 rounded-[14px] border-2 px-3 text-[10px] font-black uppercase ${
                                                    treasuryAction === action
                                                        ? 'border-amber-300 bg-amber-300 text-black shadow-[0_4px_0_#6b4304]'
                                                        : 'border-white/[0.08] bg-black/35 text-zinc-500 shadow-[0_4px_0_#020202]'
                                                }`}
                                            >
                                                {action === 'INJECT' ? 'Inject Capital' : 'Withdraw Earnings'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {(['HQ', 'PERSONAL'] as StudioTreasuryCounterparty[]).map(counterparty => (
                                            <button
                                                key={counterparty}
                                                type="button"
                                                onClick={() => {
                                                    setTreasuryCounterparty(counterparty);
                                                    setTreasuryFeedback('');
                                                }}
                                                className={`rounded-[13px] border px-3 py-2 text-left ${
                                                    treasuryCounterparty === counterparty
                                                        ? 'border-sky-300/40 bg-sky-300/[0.09] text-sky-100'
                                                        : 'border-white/[0.07] bg-black/30 text-zinc-500'
                                                }`}
                                            >
                                                <div className="text-[10px] font-black uppercase">
                                                    {treasuryAction === 'INJECT' ? 'From' : 'To'}
                                                </div>
                                                <div className="mt-1 text-[11px] font-black uppercase">
                                                    {counterparty === 'HQ' ? 'HQ Studio' : 'Personal'}
                                                </div>
                                                <div className="mt-1 truncate font-mono text-[10px] font-black opacity-70">
                                                    {counterparty === 'HQ' ? formatMoney(parentStudio?.balance || 0) : formatMoney(player.money)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3 rounded-[14px] border border-white/[0.07] bg-black/35 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <label htmlFor={`studio-treasury-${studio.id}`} className="text-[10px] font-black uppercase text-zinc-500">
                                                {treasuryAction === 'WITHDRAW' ? 'Amount you receive' : 'Transfer amount'}
                                            </label>
                                            {treasuryAction === 'WITHDRAW' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTreasuryAmount(formatDebtInputAmount(withdrawalQuote.maxOwnerProceeds));
                                                        setTreasuryFeedback('');
                                                    }}
                                                    disabled={withdrawalQuote.maxOwnerProceeds <= 0}
                                                    className="cursor-pointer rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-amber-200 transition-colors duration-200 hover:bg-amber-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Use max
                                                </button>
                                            ) : null}
                                        </div>
                                        <input
                                            id={`studio-treasury-${studio.id}`}
                                            value={treasuryAmount}
                                            onChange={event => {
                                                setTreasuryAmount(event.target.value);
                                                setTreasuryFeedback('');
                                            }}
                                            inputMode="numeric"
                                            placeholder="$50,000,000"
                                            className="mt-2 w-full bg-transparent font-mono text-2xl font-black text-white outline-none placeholder:text-zinc-800"
                                        />
                                    </div>
                                    {treasuryAction === 'WITHDRAW' ? (
                                        <div className="mt-3 border-y border-white/[0.08] py-3">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <div className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">Your ownership</div>
                                                    <div className="mt-1 font-mono text-[12px] font-black text-sky-200">{withdrawalQuote.ownershipPercent.toFixed(1)}%</div>
                                                </div>
                                                <div className="border-x border-white/[0.08] px-3">
                                                    <div className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">Studio reserve</div>
                                                    <div className="mt-1 font-mono text-[12px] font-black text-zinc-200">{formatMoney(withdrawalQuote.operatingReserve)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500">Available to you</div>
                                                    <div className="mt-1 font-mono text-[12px] font-black text-emerald-300">{formatMoney(withdrawalQuote.maxOwnerProceeds)}</div>
                                                </div>
                                            </div>
                                            {treasuryParsedAmount > 0 && withdrawalQuote.minorityDistribution > 0 ? (
                                                <p className="mt-3 text-[9px] font-bold leading-relaxed text-zinc-400">
                                                    To pay you {formatMoney(withdrawalQuote.requestedOwnerProceeds)}, the studio distributes {formatMoney(withdrawalQuote.grossDistribution)}. Outside shareholders receive {formatMoney(withdrawalQuote.minorityDistribution)}.
                                                </p>
                                            ) : (
                                                <p className="mt-3 text-[9px] font-bold leading-relaxed text-zinc-500">
                                                    {withdrawalQuote.ownershipPercent < 100
                                                        ? 'The board protects operating cash. Your maximum also reflects the percentage of this studio you own.'
                                                        : 'The board protects enough cash to keep the studio operating. Everything above that reserve is available to you.'}
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={handleTreasuryTransfer}
                                        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[16px] border-2 border-emerald-300/35 bg-emerald-300 px-4 text-[11px] font-black uppercase text-black shadow-[0_5px_0_#064e3b] active:translate-y-0.5 active:shadow-[0_2px_0_#064e3b]"
                                    >
                                        {treasuryAction === 'INJECT' ? 'Authorize Injection' : 'Authorize Withdrawal'}
                                    </button>
                                    <p className="mt-3 text-[8px] font-bold leading-relaxed text-zinc-500">
                                        {treasuryAction === 'INJECT'
                                            ? `Moves money into ${studio.name} so it can fund productions under its own banner.`
                                            : `Pulls available cash out of ${studio.name} without changing its operating model.`}
                                    </p>
                                    {treasuryFeedback ? (
                                        <div aria-live="polite" className="mt-3 rounded-[12px] border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-[10px] font-black uppercase text-amber-200">
                                            {treasuryFeedback}
                                        </div>
                                    ) : null}
                                </div>
                            </CommandSection>
                            <CommandSection eyebrow="Balance Sheet" title="Acquisition Debt" icon={<Landmark size={19} />}>
                                <div className="rounded-[18px] border-2 border-[#203044] bg-[#07111c] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <div className="grid grid-cols-3 overflow-hidden rounded-[15px] border border-sky-300/15 bg-black/35">
                                        <div className="border-r border-sky-300/10 p-3">
                                            <div className="text-[10px] font-black uppercase text-zinc-600">Remaining</div>
                                            <div className={`mt-1 font-mono text-[12px] font-black ${debt > 0 ? 'text-sky-200' : 'text-zinc-500'}`}>{formatMoney(debt)}</div>
                                        </div>
                                        <div className="border-r border-sky-300/10 p-3">
                                            <div className="text-[10px] font-black uppercase text-zinc-600">Weekly Interest</div>
                                            <div className={`mt-1 font-mono text-[12px] font-black ${studioWeeklyInterest > 0 ? 'text-amber-200' : 'text-zinc-500'}`}>{formatMoney(studioWeeklyInterest)}</div>
                                        </div>
                                        <div className="p-3">
                                            <div className="text-[10px] font-black uppercase text-zinc-600">Pressure</div>
                                            <div className={`mt-1 font-mono text-[12px] font-black ${debtSummary.pressureScore >= 65 ? 'text-rose-300' : debtSummary.pressureScore >= 35 ? 'text-amber-200' : 'text-emerald-300'}`}>
                                                {debtSummary.pressureScore}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-[14px] border border-sky-300/10 bg-black/30 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-sky-300">Debt Terms</div>
                                                <div className="mt-1 text-[11px] font-bold text-zinc-500">
                                                    {studioDebtEntry
                                                        ? `${(studioDebtEntry.annualInterestRate * 100).toFixed(1)}% annual rate · ${studioDebtEntry.source === 'STOCK_CONTROL_TRANSFER' ? 'Inherited through stock control' : 'Deal financing'}`
                                                        : 'Acquisition debt cleared for this studio.'}
                                                </div>
                                            </div>
                                            <div className="shrink-0 rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-2.5 py-1 text-[10px] font-black uppercase text-sky-200">
                                                {debtSummary.nextServiceLabel}
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black">
                                            <div
                                                className={`h-full rounded-full ${debtSummary.pressureScore >= 65 ? 'bg-rose-300' : debtSummary.pressureScore >= 35 ? 'bg-amber-300' : 'bg-emerald-300'}`}
                                                style={{ width: `${Math.max(4, Math.min(100, debtSummary.pressureScore))}%` }}
                                            />
                                        </div>
                                    </div>
                                    {studioDebtEntry ? (
                                        <>
                                            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                                                <div className="rounded-[14px] border border-white/[0.07] bg-black/35 p-3">
                                                    <label className="text-[10px] font-black uppercase text-zinc-600">Pay Down Principal</label>
                                                    <input
                                                        value={debtPaydownAmount}
                                                        onChange={event => {
                                                            setDebtPaydownAmount(event.target.value);
                                                            setDebtFeedback('');
                                                        }}
                                                        inputMode="numeric"
                                                        placeholder="$100,000,000"
                                                        className="mt-2 w-full bg-transparent font-mono text-xl font-black text-white outline-none placeholder:text-zinc-800"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={debtParsedAmount <= 0}
                                                    onClick={() => handleDebtPaydown()}
                                                    className="min-h-16 rounded-[16px] border-2 border-emerald-300/35 bg-emerald-300 px-4 text-[10px] font-black uppercase text-black shadow-[0_5px_0_#064e3b] active:translate-y-0.5 active:shadow-[0_2px_0_#064e3b] disabled:opacity-40"
                                                >
                                                    Pay Down
                                                </button>
                                            </div>
                                            <div className="mt-2 grid grid-cols-3 gap-2">
                                                {[
                                                    ['10M', 10_000_000],
                                                    ['50M', 50_000_000],
                                                    ['Interest', studioWeeklyInterest],
                                                ].map(([label, value]) => (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        disabled={Number(value) <= 0 || player.money < Number(value)}
                                                        onClick={() => fillDebtPaydownPreset(Number(value))}
                                                        className="min-h-10 rounded-[13px] border border-white/[0.08] bg-black/35 px-2 text-[10px] font-black uppercase text-zinc-300 disabled:text-zinc-700"
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            {debtFeedback ? (
                                                <div className="mt-3 rounded-[12px] border border-sky-300/20 bg-sky-300/[0.07] px-3 py-2 text-[10px] font-black uppercase text-sky-200">
                                                    {debtFeedback}
                                                </div>
                                            ) : null}
                                        </>
                                    ) : (
                                        <div className="mt-3 rounded-[14px] border border-dashed border-sky-300/15 bg-black/25 px-4 py-5 text-center">
                                            <div className="text-[11px] font-black uppercase text-sky-200">Acquisition debt cleared</div>
                                            <p className="mt-2 text-[11px] font-bold leading-relaxed text-zinc-600">
                                                {legacyDebt > 0
                                                    ? `The original ${formatMoney(legacyDebt)} deal liabilities are settled and no longer affect this studio's weekly result.`
                                                    : 'This studio has no inherited acquisition debt. Future deals may still bring liabilities through diligence or financing.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CommandSection>
                            <CommandSection eyebrow="Ownership Exit" title="Studio Sale" icon={<Handshake size={19} />}>
                                <StudioSaleEntryCard
                                    player={player}
                                    studio={studio}
                                    onOpen={() => setShowSaleRoom(true)}
                                />
                            </CommandSection>
                            <CommandSection eyebrow="Company Ledger" title="Financial Position" icon={<Banknote size={19} />}>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ['Annual Revenue', formatMoney((studio.stats.weeklyRevenue || 0) * 52), 'text-emerald-300'],
                                        ['Annual Expenses', formatMoney((studio.stats.weeklyExpenses || 0) * 52), 'text-zinc-300'],
                                        ['Debt & Liabilities', formatMoney(debt), debt > 0 ? 'text-rose-300' : 'text-zinc-300'],
                                        ['Lifetime Revenue', formatMoney(studio.stats.lifetimeRevenue || 0), 'text-amber-200'],
                                    ].map(([label, value, color]) => (
                                        <div key={label} className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                            <div className="text-[10px] font-black uppercase text-zinc-600">{label}</div>
                                            <div className={`mt-1 font-mono text-[12px] font-black ${color}`}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </CommandSection>
                            <CommandSection eyebrow="Closing Archive" title="Acquisition Record" icon={<Landmark size={19} />}>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                        <div className="text-[10px] font-black uppercase text-zinc-600">Purchase Price</div>
                                        <div className="mt-1 font-mono text-[12px] font-black text-amber-200">{formatMoney(acquisitionCase?.closing?.finalPrice || 0)}</div>
                                    </div>
                                    <div className="rounded-[13px] border border-white/[0.06] bg-black/35 p-3">
                                        <div className="text-[10px] font-black uppercase text-zinc-600">Control Since</div>
                                        <div className="mt-1 text-[10px] font-black text-white">
                                            Y{acquisitionCase?.closing?.signedYear ?? studio.studioState?.acquiredYear ?? player.age} · W{acquisitionCase?.closing?.signedWeek ?? studio.studioState?.acquiredWeek ?? player.currentWeek}
                                        </div>
                                    </div>
                                </div>
                                {signedCommitments.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {signedCommitments.map(commitment => (
                                            <span key={commitment.id} className="flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-2.5 py-1 text-[10px] font-black uppercase text-emerald-200">
                                                <ShieldCheck size={9} /> {commitment.shortLabel}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </CommandSection>
                        </>
                    ) : null}
                </div>
            </main>
            {showSaleRoom ? (
                <StudioSaleRoom
                    player={player}
                    studio={studio}
                    onBack={() => setShowSaleRoom(false)}
                    onUpdatePlayer={onUpdatePlayer}
                    onSold={onBack}
                />
            ) : null}
            {showRenameStudio ? (
                <StudioRenameSheet
                    player={player}
                    studio={studio}
                    onClose={() => setShowRenameStudio(false)}
                    onRenamed={(updatedPlayer, newName) => {
                        onUpdatePlayer(updatedPlayer);
                        setShowRenameStudio(false);
                        const lawsuitFiled = updatedPlayer.flags?.activeCases?.some((legalCase: any) => (
                            legalCase.caseType === 'STUDIO_NAME_RIGHTS'
                            && legalCase.studioId === studio.id
                            && legalCase.status === 'ACTIVE'
                        ));
                        setRenameFeedback(lawsuitFiled
                            ? `${newName} is live. The former owners filed a claim; first hearing is next week.`
                            : `${newName} is live. The rebrand is now in industry news.`);
                    }}
                />
            ) : null}
        </motion.div>
    );
};
