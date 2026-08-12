import React from 'react';
import {
    Activity,
    ArrowLeft,
    ArrowDownRight,
    ArrowUpRight,
    BadgeDollarSign,
    BriefcaseBusiness,
    ChevronRight,
    Clock3,
    Crown,
    Landmark,
    PieChart,
    ShieldCheck,
    TrendingUp,
    X,
} from 'lucide-react';
import type { CompanyPosition } from '../../../services/companyPosition';
import { formatMoney } from '../../../services/formatUtils';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import type {
    PrivateEquityActionResult,
} from '../../../services/privateEquityLogic';
import type {
    PrivateControlAcquisitionStartResult,
} from '../../../services/studioAcquisition';

interface ForbesCompanyPositionProps {
    position?: CompanyPosition;
    onOpenStocks: () => void;
    playerAge: number;
    currentWeek: number;
    onRequestPrivateExit?: (percentForSale: number) => PrivateEquityActionResult;
    onAcceptPrivateExit?: () => PrivateEquityActionResult;
    onDeclinePrivateExit?: () => PrivateEquityActionResult;
    privateControlAvailable?: boolean;
    onStartPrivateControl?: () => PrivateControlAcquisitionStartResult;
}

const EMPTY_POSITION: CompanyPosition = {
    shares: 0,
    stockValue: 0,
    stockCostBasis: 0,
    stockPercent: 0,
    negotiatedPercent: 0,
    investedValue: 0,
    privatePositionValue: 0,
    privateUnrealizedGain: 0,
    privateLifetimeDistributions: 0,
    privateLastQuarterChangePercent: 0,
    ownershipPercent: 0,
    strategicThreshold: 25,
    influenceStatus: 'NO_STAKE',
    estimatedAnnualDividend: 0,
};

const POSITION_LABELS: Record<CompanyPosition['influenceStatus'], string> = {
    NO_STAKE: 'No Current Stake',
    FINANCIAL_STAKE: 'Financial Stake',
    STRATEGIC_STAKE: 'Strategic Stake',
    CONTROLLING_OWNER: 'Controlling Owner',
};

const formatOwnershipPercent = (value: number) => {
    if (value === 0 || value === 100) return `${value}%`;
    if (value < 0.01) return '<0.01%';
    if (value < 1) return `${value.toFixed(2)}%`;
    return `${value.toFixed(1)}%`;
};

export const ForbesCompanyPosition: React.FC<ForbesCompanyPositionProps> = ({
    position = EMPTY_POSITION,
    onOpenStocks,
    playerAge,
    currentWeek,
    onRequestPrivateExit,
    onAcceptPrivateExit,
    onDeclinePrivateExit,
    privateControlAvailable = false,
    onStartPrivateControl,
}) => {
    const [managerOpen, setManagerOpen] = React.useState(false);
    const [feedback, setFeedback] = React.useState<string | null>(null);
    const [salePercent, setSalePercent] = React.useState(0);
    const hasStake = position.ownershipPercent > 0;
    const hasPrivateStake = position.negotiatedPercent > 0;
    const isControlling = position.influenceStatus === 'CONTROLLING_OWNER';
    const progress = isControlling
        ? 100
        : Math.min(100, (position.ownershipPercent / position.strategicThreshold) * 100);
    const financialValue = position.stockValue + position.privatePositionValue;
    const currentAbsoluteWeek = getAbsoluteWeek(playerAge, currentWeek);
    const acquiredAbsoluteWeek = position.privateAcquiredYear && position.privateAcquiredWeek
        ? getAbsoluteWeek(position.privateAcquiredYear, position.privateAcquiredWeek)
        : currentAbsoluteWeek;
    const weeksHeld = Math.max(0, currentAbsoluteWeek - acquiredAbsoluteWeek);
    const exitWaitWeeks = Math.max(0, (position.privateNextExitEligibleAbsoluteWeek || acquiredAbsoluteWeek + 26) - currentAbsoluteWeek);
    const totalPrivateReturn = position.privateUnrealizedGain + position.privateLifetimeDistributions;
    const privateReturnPercent = position.investedValue > 0
        ? (totalPrivateReturn / position.investedValue) * 100
        : 0;
    const exit = position.privateExit;
    const privateExitActive = exit?.status === 'MARKETING' || exit?.status === 'OFFER_READY';
    const remainingToOwn = Math.max(0, 100 - position.negotiatedPercent);
    const offerWaitWeeks = exit?.status === 'MARKETING'
        ? Math.max(0, exit.offerReadyAbsoluteWeek - currentAbsoluteWeek)
        : 0;
    const offerExpiresIn = exit?.status === 'OFFER_READY'
        ? Math.max(0, (exit.offerExpiresAbsoluteWeek || currentAbsoluteWeek) - currentAbsoluteWeek)
        : 0;
    const normalizeSalePercent = (value: number) => {
        const max = Math.max(0.1, position.negotiatedPercent || 0.1);
        return Math.min(max, Math.max(0.1, Math.round((Number(value) || 0) * 10) / 10));
    };
    const saleEstimate = position.negotiatedPercent > 0
        ? Math.round(position.privatePositionValue * (salePercent / position.negotiatedPercent))
        : 0;
    const remainingPercent = Math.max(0, position.negotiatedPercent - salePercent);

    React.useEffect(() => {
        if (!managerOpen || position.negotiatedPercent <= 0) return;
        setSalePercent(normalizeSalePercent(position.negotiatedPercent / 2));
    }, [managerOpen, position.negotiatedPercent]);

    const runExitAction = (
        action: (() => PrivateEquityActionResult) | undefined,
        successMessage: string,
    ) => {
        if (!action) return;
        const result = action();
        if (!result) {
            setFeedback('This position is still loading. Close the sheet and try again.');
            return;
        }
        if (result.success) {
            setFeedback(successMessage);
            return;
        }
        const message = result.reason === 'EXIT_LOCKED'
            ? `This stake is still inside its first 26-week private-market lock. ${exitWaitWeeks} weeks remain.`
            : result.reason === 'EXIT_COOLDOWN'
                ? `Advisers need ${exitWaitWeeks} more weeks before testing buyers again.`
                : result.reason === 'EXIT_ALREADY_ACTIVE'
                    ? 'A buyer search is already running for this stake.'
                    : result.reason === 'OFFER_EXPIRED'
                        ? 'That buyer offer has expired. You can start a new search after the cooldown.'
                        : 'The private sale could not be completed. Refresh the position and try again.';
        setFeedback(message);
    };

    const startPrivateControl = () => {
        if (!onStartPrivateControl) return;
        setFeedback(null);
        const result = onStartPrivateControl();
        if (result.success) return;
        const message = result.reason === 'EXIT_ACTIVE'
            ? 'Finish or cancel the current buyer search before making a takeover proposal.'
            : result.reason === 'COOLDOWN_ACTIVE'
                ? 'The board is cooling off after the last talks. Reopen the company file when negotiations become available.'
            : result.reason === 'NOT_FOR_SALE'
                ? 'This board is not taking control proposals right now. You can still hold or manage your stake.'
            : result.reason === 'PUBLIC_COMPANY'
                ? 'This company uses the public stock-control route.'
                : result.reason === 'ALREADY_OWNED'
                    ? 'This studio is already part of your group.'
                    : 'This position could not be prepared for a control proposal. Refresh the company file and try again.';
        setFeedback(message);
    };

    return (
        <section className="mb-5 overflow-hidden border-y border-sky-400/20 bg-[linear-gradient(110deg,rgba(14,165,233,0.07),transparent_42%),#08090b]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-sky-300">
                    <PieChart size={13} /> Your Position
                </div>
                <span className={`text-[6px] font-black uppercase tracking-[0.16em] ${
                    isControlling ? 'text-amber-300' : hasStake ? 'text-sky-300' : 'text-zinc-600'
                }`}>
                    {POSITION_LABELS[position.influenceStatus]}
                </span>
            </div>

            <div className="px-4 pt-4">
                <div className="grid grid-cols-3 divide-x divide-white/[0.09]">
                    <div className="min-w-0 pr-3">
                        <div className="text-[5px] font-black uppercase tracking-[0.18em] text-zinc-600">Ownership</div>
                        <div className={`mt-1 whitespace-nowrap font-mono text-[20px] font-black leading-none ${isControlling ? 'text-amber-300' : hasStake ? 'text-sky-300' : 'text-zinc-500'}`}>
                            {formatOwnershipPercent(position.ownershipPercent)}
                        </div>
                    </div>
                    <div className="min-w-0 px-3 text-center">
                        <div className="text-[5px] font-black uppercase tracking-[0.18em] text-zinc-600">Position Value</div>
                        <div className="mt-2 whitespace-nowrap font-mono text-[11px] font-black text-white">{formatMoney(financialValue)}</div>
                    </div>
                    <div className="min-w-0 pl-3 text-right">
                        <div className="text-[5px] font-black uppercase tracking-[0.18em] text-zinc-600">Total Return</div>
                        <div className={`mt-2 flex items-center justify-end gap-1 whitespace-nowrap font-mono text-[11px] font-black ${totalPrivateReturn >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {totalPrivateReturn >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {privateReturnPercent >= 0 ? '+' : ''}{privateReturnPercent.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {!isControlling ? (
                    <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-[5px] font-black uppercase tracking-[0.16em] text-zinc-600">
                            <span>Influence</span>
                            <span>{position.strategicThreshold}% strategic target</span>
                        </div>
                        <div className="h-0.5 overflow-hidden bg-white/[0.07]" aria-label={`${formatOwnershipPercent(position.ownershipPercent)} of ${position.strategicThreshold}% strategic target`}>
                            <div
                                className={`h-full ${position.influenceStatus === 'STRATEGIC_STAKE' ? 'bg-emerald-400' : 'bg-sky-400'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-3 text-[7px] font-bold text-zinc-400">
                        <Crown size={12} className="text-amber-300" /> You control company strategy
                    </div>
                )}

                {hasStake ? (
                    <div className="mt-3 grid grid-cols-3 divide-x divide-white/[0.08] border-t border-white/[0.07] py-3">
                        <div className="min-w-0 pr-3">
                            <div className="text-[5px] font-black uppercase tracking-widest text-zinc-700">{hasPrivateStake ? 'Cost Basis' : 'Shares'}</div>
                            <div className="mt-1 whitespace-nowrap font-mono text-[8px] font-black text-zinc-300">
                                {hasPrivateStake ? formatMoney(position.investedValue) : position.shares.toLocaleString()}
                            </div>
                        </div>
                        <div className="min-w-0 px-3 text-center">
                            <div className="text-[5px] font-black uppercase tracking-widest text-zinc-700">{hasPrivateStake ? 'Paid Out' : 'Dividend'}</div>
                            <div className="mt-1 whitespace-nowrap font-mono text-[8px] font-black text-emerald-300">
                                {formatMoney(hasPrivateStake ? position.privateLifetimeDistributions : position.estimatedAnnualDividend)}
                            </div>
                        </div>
                        <div className="min-w-0 pl-3 text-right">
                            <div className="text-[5px] font-black uppercase tracking-widest text-zinc-700">Last Quarter</div>
                            <div className={`mt-1 whitespace-nowrap font-mono text-[8px] font-black ${position.privateLastQuarterChangePercent >= 0 ? 'text-sky-300' : 'text-rose-300'}`}>
                                {position.privateLastQuarterChangePercent >= 0 ? '+' : ''}{position.privateLastQuarterChangePercent.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] py-3 text-[7px] font-semibold text-zinc-500">
                        <Landmark size={12} /> No shares or negotiated equity held
                    </div>
                )}

                {position.linkedStockId && !hasPrivateStake ? (
                    <button
                        type="button"
                        aria-label="Open Stocks"
                        onClick={onOpenStocks}
                        className="flex min-h-11 w-full cursor-pointer items-center justify-between border-t border-white/[0.08] py-3 text-[7px] font-black uppercase tracking-[0.16em] text-sky-300 transition-colors duration-200 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
                    >
                        <span className="flex items-center gap-2"><Activity size={13} /> Open Stock Position</span>
                        <ChevronRight size={14} />
                    </button>
                ) : hasPrivateStake ? (
                    <div className="border-t border-white/[0.08]">
                        <div className={`grid ${privateControlAvailable ? 'grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]' : 'grid-cols-1'}`}>
                            {privateControlAvailable ? (
                                <button
                                    type="button"
                                    disabled={privateExitActive}
                                    onClick={startPrivateControl}
                                    aria-label={privateExitActive
                                        ? 'Buyer search in progress. Finish this sale decision before opening a takeover file.'
                                        : `Build to Full Control. ${formatOwnershipPercent(position.negotiatedPercent)} already credited; negotiate for the remaining ${formatOwnershipPercent(remainingToOwn)}.`}
                                    className="group flex min-h-16 min-w-0 cursor-pointer items-center gap-2 py-3 pr-2 text-left transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/[0.08] text-amber-300">
                                        <Crown size={14} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block whitespace-normal text-[7px] font-black uppercase leading-[1.25] tracking-[0.12em] text-amber-300">
                                            {privateExitActive ? 'Buyer Search' : <>Full<br />Control</>}
                                        </span>
                                        {!privateExitActive ? (
                                            <span className="mt-0.5 inline-flex rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-1.5 py-0.5 font-mono text-[6px] font-black text-amber-200">
                                                {formatOwnershipPercent(position.negotiatedPercent)} held
                                            </span>
                                        ) : null}
                                    </span>
                                    <ChevronRight size={14} className="shrink-0 text-amber-300 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            ) : null}
                        <button
                            type="button"
                            aria-label={exit?.status === 'OFFER_READY' ? 'Review Buyer Offer' : exit?.status === 'MARKETING' ? 'View Buyer Search' : 'Open Position Dossier'}
                            onClick={() => {
                                setFeedback(null);
                                setManagerOpen(true);
                            }}
                            className={`group flex min-h-16 min-w-0 cursor-pointer items-center gap-2 py-3 text-left text-[7px] font-black uppercase leading-[1.25] tracking-[0.12em] text-violet-200 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300 ${privateControlAvailable ? 'border-l border-violet-300/15 pl-3' : ''}`}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/20 bg-violet-300/[0.06] text-violet-200">
                                <BriefcaseBusiness size={14} />
                            </span>
                            <span className="min-w-0 flex-1 whitespace-normal">
                                {exit?.status === 'OFFER_READY' ? <>Review<br />Offer</> : exit?.status === 'MARKETING' ? <>Buyer<br />Search</> : <>Position<br />Dossier</>}
                            </span>
                            <ChevronRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                        </div>
                        {feedback ? (
                            <p role="status" className="border-t border-white/[0.06] py-2 text-[7px] font-semibold leading-relaxed text-rose-200">
                                {feedback}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {managerOpen && hasPrivateStake && (
                <div
                    className="absolute inset-0 z-[100] flex flex-col overflow-hidden bg-[#050506]"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Manage private studio stake"
                >
                    <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_85%_8%,rgba(139,92,246,0.12),transparent_30%),linear-gradient(180deg,#08080a_0%,#030303_75%)]">
                        <header className="shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,#0c0c0d_0%,#070708_100%)] px-4 pb-4 pt-10">
                            <div className="grid grid-cols-[44px_minmax(0,1fr)_58px] items-center gap-3">
                                <button
                                    type="button"
                                    aria-label="Close private stake manager"
                                    onClick={() => setManagerOpen(false)}
                                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="min-w-0 text-center">
                                    <div className="font-serif text-[17px] font-black italic tracking-[0.2em] text-[#f4f0e7]">FORBES</div>
                                    <div className="mt-0.5 text-[6px] font-black uppercase tracking-[0.3em] text-zinc-600">Private Position</div>
                                </div>
                                <div className="rounded-xl border border-violet-400/25 bg-violet-400/[0.06] px-2 py-1.5 text-center">
                                    <div className="text-[5px] font-black uppercase tracking-[0.18em] text-violet-300/65">Held</div>
                                    <div className="font-mono text-[10px] font-black leading-tight text-violet-200">{formatOwnershipPercent(position.negotiatedPercent)}</div>
                                </div>
                            </div>
                        </header>

                        <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 custom-scrollbar">
                            <div className="border-l-2 border-amber-300 pl-3">
                                <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-violet-300">
                                    <BriefcaseBusiness size={13} /> Private Position
                                </div>
                                <h3 className="mt-2 font-serif text-[32px] font-black italic leading-[0.95] tracking-tight text-[#f5f0e7]">
                                    YOU OWN {formatOwnershipPercent(position.negotiatedPercent)}
                                </h3>
                                <p className="mt-3 max-w-sm text-[10px] font-semibold leading-relaxed text-zinc-500">
                                    Value can rise without a regular payout. Cash is realized only when the board distributes profit or a buyer purchases your stake.
                                </p>
                            </div>

                            <div className="mt-7 grid grid-cols-3 gap-3">
                                <div className="min-w-0">
                                    <div className="text-[5px] font-black uppercase tracking-[0.18em] text-zinc-600">Invested</div>
                                    <div className="mt-1.5 whitespace-nowrap font-mono text-[10px] font-black text-zinc-200">{formatMoney(position.investedValue)}</div>
                                </div>
                                <div className="min-w-0 text-center">
                                    <div className="text-[5px] font-black uppercase tracking-[0.18em] text-sky-500/80">Estimate</div>
                                    <div className="mt-1.5 whitespace-nowrap font-mono text-[10px] font-black text-sky-200">{formatMoney(position.privatePositionValue)}</div>
                                </div>
                                <div className="min-w-0 text-right">
                                    <div className="text-[5px] font-black uppercase tracking-[0.18em] text-emerald-500/80">Paid Out</div>
                                    <div className="mt-1.5 whitespace-nowrap font-mono text-[10px] font-black text-emerald-200">{formatMoney(position.privateLifetimeDistributions)}</div>
                                </div>
                            </div>

                            <section className="mt-7 border-l border-sky-300/60 pl-4">
                                <div className="flex items-center gap-2 text-[6px] font-black uppercase tracking-[0.22em] text-zinc-500">
                                    <TrendingUp size={13} className={position.privateLastQuarterChangePercent >= 0 ? 'text-sky-300' : 'text-rose-300'} />
                                    Latest Board Review
                                </div>
                                <p className="mt-2 text-[11px] font-bold leading-relaxed text-zinc-300">
                                    {position.privateLastQuarterSummary || 'The next private market review will update this position.'}
                                </p>
                            </section>

                            {feedback && (
                                <div role="status" aria-live="polite" className="mt-6 border-y border-violet-300/20 bg-violet-300/[0.06] px-1 py-3 text-[9px] font-bold leading-relaxed text-violet-100">
                                    {feedback}
                                </div>
                            )}

                            {exit?.status === 'MARKETING' ? (
                                <section className="mt-8 border-t border-amber-300/30 pt-5">
                                    <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-amber-300">
                                        <Clock3 size={14} /> Quiet Buyer Search
                                    </div>
                                    <div className="mt-3 font-serif text-2xl font-black italic text-white">
                                        {offerWaitWeeks > 0 ? `${offerWaitWeeks} WEEKS TO MARKET` : 'BUYER RESPONSES DUE'}
                                    </div>
                                    <p className="mt-2 text-[10px] font-semibold leading-relaxed text-zinc-500">
                                        Advisers are quietly marketing {exit.percentForSale.toFixed(1)}%. The estimate is not guaranteed until a buyer signs.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => runExitAction(onDeclinePrivateExit, 'The buyer search was paused.')}
                                        className="mt-6 flex min-h-14 w-full cursor-pointer items-center justify-between border-y border-white/10 py-3 text-[8px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors duration-200 hover:border-amber-300/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                    >
                                        Pause Sale Process <X size={15} />
                                    </button>
                                </section>
                            ) : exit?.status === 'OFFER_READY' ? (
                                <section className="mt-8 pt-5">
                                    <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-emerald-300">
                                        <BadgeDollarSign size={15} /> Buyer Offer Ready
                                    </div>
                                    <div className="mt-4 font-serif text-[34px] font-black italic leading-none text-white">{formatMoney(exit.netProceeds || 0)}</div>
                                    <div className="mt-2 text-[6px] font-black uppercase tracking-[0.18em] text-emerald-400/70">Net cash to you · expires in {offerExpiresIn}W</div>
                                    <div className="mt-6 grid grid-cols-3 gap-3">
                                        <div>
                                            <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">Stake Sold</div>
                                            <div className="mt-1 font-mono text-[9px] font-black text-white">{exit.percentForSale.toFixed(1)}%</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">Illiquidity Cut</div>
                                            <div className="mt-1 font-mono text-[9px] font-black text-amber-300">-{Math.round((exit.liquidityDiscountRate || 0) * 100)}%</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[5px] font-black uppercase tracking-widest text-zinc-600">Advisory Fee</div>
                                            <div className="mt-1 whitespace-nowrap font-mono text-[9px] font-black text-zinc-300">{formatMoney(exit.advisoryFee || 0)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-7 space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => runExitAction(onAcceptPrivateExit, 'Sale completed and cash added to your account.')}
                                            className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-2xl border border-emerald-200/35 bg-emerald-300 px-4 text-[8px] font-black uppercase tracking-[0.15em] text-black shadow-[0_5px_0_rgba(13,92,68,0.85)] transition-all duration-200 hover:bg-emerald-200 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(13,92,68,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                        >
                                            Accept {formatMoney(exit.netProceeds || 0)} <ChevronRight size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => runExitAction(onDeclinePrivateExit, 'Offer declined. You kept the stake.')}
                                            className="min-h-9 w-full cursor-pointer rounded-full px-3 text-[7px] font-black uppercase tracking-[0.15em] text-zinc-500 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                                        >
                                            Keep my stake
                                        </button>
                                    </div>
                                </section>
                            ) : (
                                <section className="mt-8">
                                    <div className="flex items-center justify-between gap-3 border-b border-white/[0.1] pb-3">
                                        <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-amber-300">
                                            <ShieldCheck size={14} /> Plan Your Sale
                                        </div>
                                        <div className="text-[6px] font-black uppercase tracking-[0.15em] text-zinc-600">{weeksHeld} weeks held</div>
                                    </div>
                                    {exitWaitWeeks > 0 && (
                                        <div className="flex items-center gap-2 border-b border-amber-300/15 py-3 text-[8px] font-bold text-amber-200">
                                            <Clock3 size={13} /> Buyer outreach available in {exitWaitWeeks} weeks
                                        </div>
                                    )}
                                    <div className={`border-b border-white/[0.1] py-5 ${exitWaitWeeks > 0 ? 'opacity-45' : ''}`}>
                                        <div className="flex items-end justify-between gap-4">
                                            <label htmlFor="private-equity-sale-percent" className="min-w-0 text-[8px] font-black uppercase tracking-[0.16em] text-zinc-400">
                                                Choose how much to sell
                                            </label>
                                            <div className="shrink-0 flex items-end gap-0.5 border-b border-violet-300/45 pb-1 text-violet-100">
                                                <input
                                                    id="private-equity-sale-percent"
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0.1"
                                                    max={position.negotiatedPercent}
                                                    step="0.1"
                                                    disabled={exitWaitWeeks > 0}
                                                    value={salePercent.toFixed(1)}
                                                    onChange={(event) => setSalePercent(normalizeSalePercent(Number(event.target.value)))}
                                                    className="w-[5.75rem] min-w-[5.75rem] max-w-none bg-transparent p-0 text-right font-mono text-[1.75rem] font-black leading-none tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed"
                                                    aria-label="Percentage of your private stake to sell"
                                                />
                                                <span className="mb-0.5 -ml-1 font-mono text-base font-black">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max={position.negotiatedPercent}
                                            step="0.1"
                                            disabled={exitWaitWeeks > 0}
                                            value={salePercent}
                                            onChange={(event) => setSalePercent(normalizeSalePercent(Number(event.target.value)))}
                                            className="mt-4 h-1.5 w-full cursor-pointer accent-violet-300 disabled:cursor-not-allowed"
                                            aria-label="Adjust private stake sale percentage"
                                        />
                                        <div className="mt-3 flex gap-1.5">
                                            {[25, 50, 75, 100].map((share) => {
                                                const quickPercent = normalizeSalePercent(position.negotiatedPercent * (share / 100));
                                                const selected = Math.abs(salePercent - quickPercent) < 0.05;
                                                return (
                                                    <button
                                                        key={share}
                                                        type="button"
                                                        disabled={exitWaitWeeks > 0}
                                                        onClick={() => setSalePercent(quickPercent)}
                                                        className={`min-h-8 flex-1 cursor-pointer rounded-full border px-1 text-[6px] font-black uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed ${selected ? 'border-violet-300/55 bg-violet-300/10 text-violet-100' : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-200'}`}
                                                    >
                                                        {share === 100 ? 'Max' : `${share}%`}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                                            <span className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-400">Estimated buyer value</span>
                                            <span className="font-mono text-[10px] font-black text-sky-200">{formatMoney(saleEstimate)}</span>
                                        </div>
                                        <div className="mt-1.5 flex flex-col gap-1 text-[8px] font-semibold leading-relaxed text-zinc-400">
                                            <span>Final cash is set after buyer review.</span>
                                            <span className="text-zinc-600">{remainingPercent > 0.05 ? `${remainingPercent.toFixed(1)}% remains after a sale` : 'This would sell your full holding'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={exitWaitWeeks > 0 || salePercent <= 0}
                                            onClick={() => runExitAction(
                                                () => onRequestPrivateExit?.(salePercent) as PrivateEquityActionResult,
                                                `Advisers started looking for a buyer for ${salePercent.toFixed(1)}% of your stake.`,
                                            )}
                                            className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-between rounded-2xl border border-amber-200/40 bg-amber-300 px-4 text-[8px] font-black uppercase tracking-[0.18em] text-black shadow-[0_5px_0_rgba(111,69,7,0.9)] transition-all duration-200 hover:bg-amber-200 active:translate-y-0.5 active:shadow-[0_2px_0_rgba(111,69,7,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Start Buyer Search <ChevronRight size={17} />
                                        </button>
                                    </div>
                                    <div className="mt-4 flex items-start gap-2 text-[9px] font-semibold leading-relaxed text-zinc-400">
                                        <Landmark size={14} className="mt-0.5 shrink-0 text-zinc-500" />
                                        Buyer search takes 2–5 weeks. Offers may land 8–22% below the estimate, and you always choose whether to accept.
                                    </div>
                                </section>
                            )}
                        </main>
                    </div>
                </div>
            )}
        </section>
    );
};
