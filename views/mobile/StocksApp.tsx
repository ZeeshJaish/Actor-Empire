import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    ArrowLeft,
    Crown,
    Lock,
    ShieldAlert,
    Vote,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { Player, Stock } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import {
    calculatePortfolioValue,
    calculateStockTradeQuote,
    getEstimatedAnnualDividend,
    getSharesForCashOrder,
    getStockOutstandingShares,
    getTradableStocks,
} from '../../services/stockLogic';
import { getPlayerLanguage, t } from '../../services/i18n';
import {
    getEntertainmentStockSnapshot,
    type EntertainmentStockSnapshot,
} from '../../services/entertainmentStockMarket';
import { getShareholderInfluence } from '../../services/shareholderVoting';
import {
    getStockTakeoverSnapshot,
} from '../../services/stockTakeover';

interface StocksAppProps {
    player: Player;
    onBack: () => void;
    onTrade: (stockId: string, amount: number) => void;
    onUpdatePlayer: (player: Player) => void;
    onOpenStudioAcquisition?: (studioId: string) => void;
    initialStockId?: string;
    onInitialStockConsumed?: () => void;
}

type StockOrderMode = 'SHARES' | 'CASH' | 'OWNERSHIP';

const formatCompactMoney = (value: number) => {
    const absolute = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absolute >= 1_000_000_000_000) return `${sign}$${(absolute / 1_000_000_000_000).toFixed(1)}T`;
    if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(1)}K`;
    return `${sign}$${absolute.toFixed(0)}`;
};

const formatCompactNumber = (value: number) => {
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return Math.round(value).toLocaleString();
};

const formatOwnership = (value: number) => {
    if (value === 0) return '0%';
    if (value < 0.01) return '<0.01%';
    return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
};

const StockRow: React.FC<{
    stock: Stock;
    snapshot: EntertainmentStockSnapshot;
    ownedShares: number;
    ownedLabel: string;
    onOpen: () => void;
}> = ({ stock, snapshot, ownedShares, ownedLabel, onOpen }) => {
    const positive = snapshot.changeAmount >= 0;
    const studioStock = snapshot.isEntertainment;
    const ownsPosition = ownedShares > 0 || snapshot.holdingShares > 0;
    const rowOwnershipProgress = Math.min(100, snapshot.ownershipPercent);

    return (
        <button
            type="button"
            onClick={onOpen}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors active:bg-zinc-800"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        positive
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                    }`}>
                        {stock.symbol}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{stock.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <span>{studioStock ? 'ENTERTAINMENT' : stock.sector}</span>
                        </div>
                    </div>
                </div>
                <div className="w-24 shrink-0 text-right">
                    <div className="font-mono text-sm font-bold text-white">{formatMoney(stock.price)}</div>
                    <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${
                        positive ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                        {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(snapshot.changePercent).toFixed(1)}%
                    </div>
                    {ownsPosition ? (
                        <div className="mt-1 ml-auto w-20">
                            <div
                                aria-label="Row Ownership Progress"
                                className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
                            >
                                <div
                                    className="h-full rounded-full bg-sky-400 transition-[width]"
                                    style={{ width: `${rowOwnershipProgress}%` }}
                                />
                            </div>
                            <div className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-wide text-sky-300">
                                {formatOwnership(snapshot.ownershipPercent)} {ownedLabel}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </button>
    );
};

export const StocksApp: React.FC<StocksAppProps> = ({
    player,
    onBack,
    onTrade,
    onUpdatePlayer,
    onOpenStudioAcquisition,
    initialStockId,
    onInitialStockConsumed,
}) => {
    const [tab, setTab] = useState<'MARKET' | 'PORTFOLIO'>('MARKET');
    const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
    const [sharesInput, setSharesInput] = useState('');
    const [orderMode, setOrderMode] = useState<StockOrderMode>('SHARES');
    const [controlFeedback, setControlFeedback] = useState('');
    const stockScrollRef = useRef<HTMLDivElement>(null);
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    useEffect(() => {
        if (!initialStockId) return;
        setSelectedStockId(initialStockId);
        setTab('MARKET');
        onInitialStockConsumed?.();
    }, [initialStockId, onInitialStockConsumed]);

    const tradableStocks = useMemo(
        () => getTradableStocks(player.stocks, player),
        [player],
    );
    const portfolioValue = useMemo(
        () => calculatePortfolioValue(player.portfolio, tradableStocks),
        [player.portfolio, tradableStocks],
    );
    const snapshots = useMemo(
        () => new Map(tradableStocks.map(stock => [stock.id, getEntertainmentStockSnapshot(player, stock)])),
        [player, tradableStocks],
    );
    const selectedStock = selectedStockId
        ? tradableStocks.find(stock => stock.id === selectedStockId) || null
        : null;
    const getHolding = (stockId: string) => player.portfolio.find(position => position.stockId === stockId);
    const estimatedAnnualYield = player.portfolio.reduce((total, position) => {
        const stock = tradableStocks.find(candidate => candidate.id === position.stockId);
        return total + (stock ? getEstimatedAnnualDividend(player, stock, position.shares) : 0);
    }, 0);

    useEffect(() => {
        if (stockScrollRef.current) stockScrollRef.current.scrollTop = 0;
    }, [selectedStockId, tab]);

    if (selectedStock) {
        const snapshot = snapshots.get(selectedStock.id) || getEntertainmentStockSnapshot(player, selectedStock);
        const holding = getHolding(selectedStock.id);
        const rawOrderValue = Math.max(0, Number(sharesInput) || 0);
        const outstandingShares = getStockOutstandingShares(selectedStock);
        const inputAmount = orderMode === 'CASH'
            ? getSharesForCashOrder(player, selectedStock, rawOrderValue)
            : orderMode === 'OWNERSHIP'
                ? Math.max(0, Math.ceil(((rawOrderValue / 100) * outstandingShares) - snapshot.holdingShares))
                : Math.floor(rawOrderValue);
        const quote = calculateStockTradeQuote(player, selectedStock, inputAmount);
        const cost = quote.estimatedValue;
        const canAfford = inputAmount > 0 && cost <= player.money;
        const canSell = orderMode === 'SHARES' && Boolean(holding && inputAmount > 0 && inputAmount <= holding.shares);
        const hasSynergy = player.activeSponsorships.some(sponsorship => sponsorship.brandName === selectedStock.relatedBrandName);
        const chartMin = Math.min(...selectedStock.priceHistory) * 0.9;
        const chartMax = Math.max(...selectedStock.priceHistory) * 1.1;
        const positionInvested = holding?.totalInvested ?? ((holding?.shares || 0) * (holding?.averageCost || selectedStock.price));
        const averageCost = holding?.averageCost || (holding?.shares ? selectedStock.price : 0);
        const gainLoss = snapshot.positionValue - positionInvested;
        const influence = getShareholderInfluence(snapshot.ownershipPercent, language);
        const influenceProgress = influence.nextThreshold
            ? Math.min(100, (snapshot.ownershipPercent / influence.nextThreshold) * 100)
            : 100;
        const takeoverSnapshot = getStockTakeoverSnapshot(player, selectedStock, language);
        const takeoverCase = takeoverSnapshot.activeCase;
        const openAcquisitionDesk = () => {
            if (!selectedStock.relatedStudioId || !onOpenStudioAcquisition) {
                setControlFeedback('Acquisition desk route is not available for this stock yet.');
                return;
            }
            setControlFeedback(`${selectedStock.name} acquisition desk is opening.`);
            onOpenStudioAcquisition(selectedStock.relatedStudioId);
        };

        return (
            <div className="absolute inset-0 z-50 flex flex-col bg-black text-white animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 p-4 pt-12">
                    <button type="button" onClick={() => setSelectedStockId(null)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-bold">{selectedStock.symbol}</div>
                            {snapshot.isEntertainment ? (
                                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-sky-400">
                                    Studio
                                </span>
                            ) : null}
                        </div>
                        <div className="truncate text-xs text-zinc-400">{selectedStock.name}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold">{formatMoney(selectedStock.price)}</div>
                        <div className={`text-[10px] font-bold ${snapshot.changeAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {snapshot.changeAmount >= 0 ? '+' : ''}{snapshot.changePercent.toFixed(2)}%
                        </div>
                    </div>
                </div>

                <div ref={stockScrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="text-xs font-bold uppercase text-zinc-500">{tr('stocks.trade')}</div>
                            <div className="font-mono text-[10px] font-bold text-zinc-400">
                                {tr('stocks.cash')}: <span className="text-white">{formatMoney(player.money)}</span>
                            </div>
                        </div>
                        <div className="mb-3 grid grid-cols-3 rounded-lg border border-zinc-800 bg-black p-1">
                            {([
                                ['SHARES', 'Shares'],
                                ['CASH', 'Cash'],
                                ['OWNERSHIP', 'Target %'],
                            ] as const).map(([mode, label]) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        setOrderMode(mode);
                                        setSharesInput('');
                                    }}
                                    className={`min-h-8 rounded-md text-[9px] font-bold uppercase transition ${
                                        orderMode === mode ? 'bg-zinc-800 text-white' : 'text-zinc-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-zinc-600">
                            <span>
                                {orderMode === 'SHARES' ? 'Share Quantity' : orderMode === 'CASH' ? 'Cash Amount' : 'Target Ownership'}
                            </span>
                            {orderMode === 'OWNERSHIP' ? <span>Current {formatOwnership(snapshot.ownershipPercent)}</span> : null}
                        </div>
                        <input
                            type="number"
                            min="0"
                            max={orderMode === 'OWNERSHIP' ? 100 : undefined}
                            step={orderMode === 'OWNERSHIP' ? '0.01' : '1'}
                            placeholder={orderMode === 'SHARES' ? tr('stocks.shares') : orderMode === 'CASH' ? '$0' : '0%'}
                            value={sharesInput}
                            onChange={event => setSharesInput(event.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black p-3 font-mono text-white outline-none focus:border-blue-500"
                        />
                        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-zinc-800 bg-black/35">
                            <div className="border-r border-zinc-800 p-2.5">
                                <div className="text-[8px] font-bold uppercase tracking-wide text-zinc-600">Resulting Ownership</div>
                                <div className="mt-1 font-mono text-xs font-bold text-sky-400">{formatOwnership(quote.resultingOwnershipPercent)}</div>
                            </div>
                            <div className="p-2.5">
                                <div className="text-[8px] font-bold uppercase tracking-wide text-zinc-600">Price Impact</div>
                                <div className={`mt-1 font-mono text-xs font-bold ${quote.priceImpactPercent > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                                    +{quote.priceImpactPercent.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                        <div className="mb-4 mt-3 text-[10px] text-zinc-500">
                            {inputAmount.toLocaleString()} shares · <span className="font-mono text-white">{formatCompactMoney(cost)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={!canSell}
                                onClick={() => {
                                    if (!canSell) return;
                                    onTrade(selectedStock.id, -inputAmount);
                                    setSharesInput('');
                                }}
                                className={`rounded-xl py-3 text-sm font-bold ${
                                    canSell ? 'bg-zinc-800 text-white' : 'bg-zinc-800 text-zinc-600'
                                }`}
                            >
                                {orderMode === 'SHARES' ? tr('stocks.sell') : 'Sell via Shares'}
                            </button>
                            <button
                                type="button"
                                disabled={!canAfford}
                                onClick={() => {
                                    if (!canAfford) return;
                                    onTrade(selectedStock.id, inputAmount);
                                    setSharesInput('');
                                }}
                                className={`rounded-xl py-3 text-sm font-bold ${
                                    canAfford ? 'bg-blue-600 text-white' : 'bg-blue-900/50 text-blue-300/50'
                                }`}
                            >
                                {tr('stocks.buy')}
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-4 flex h-40 items-end overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 px-2 pb-2">
                        <div className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tr('stocks.weekTrend')}</div>
                        <div className="flex h-full w-full items-end gap-1 pt-8">
                            {selectedStock.priceHistory.map((price, index) => {
                                const height = ((price - chartMin) / Math.max(0.01, chartMax - chartMin)) * 100;
                                return (
                                    <div
                                        key={`${selectedStock.id}_${index}`}
                                        className={`flex-1 rounded-t-sm ${
                                            index === selectedStock.priceHistory.length - 1 ? 'bg-blue-500' : 'bg-zinc-700'
                                        }`}
                                        style={{ height: `${Math.max(4, height)}%` }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                            <div className="text-[9px] uppercase text-zinc-500">{tr('stocks.divYield')}</div>
                            <div className="mt-1 font-mono text-sm font-bold text-emerald-400">{(selectedStock.dividendYield * 100).toFixed(1)}%</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                            <div className="text-[9px] uppercase text-zinc-500">{tr('stocks.volatility')}</div>
                            <div className="mt-1 text-sm font-bold text-yellow-400">{selectedStock.volatility > 0.04 ? tr('stocks.high') : tr('stocks.low')}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                            <div className="text-[9px] uppercase text-zinc-500">Market Cap</div>
                            <div className="mt-1 font-mono text-sm font-bold text-zinc-200">{formatCompactMoney(snapshot.marketCap)}</div>
                        </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                            <div className="text-[9px] uppercase text-zinc-500">Shares Issued</div>
                            <div className="mt-1 font-mono text-sm font-bold text-zinc-200">{formatCompactNumber(getStockOutstandingShares(selectedStock))}</div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                            <div className="text-[9px] uppercase text-zinc-500">Public Float</div>
                            <div className="mt-1 font-mono text-sm font-bold text-sky-300">{selectedStock.publicFloatPercent ? `${selectedStock.publicFloatPercent}%` : 'Listed'}</div>
                        </div>
                    </div>

                    {hasSynergy ? (
                        <div className="mb-4 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-900/30 p-3">
                            <div className="rounded-full bg-indigo-500 p-2"><Lock size={12} /></div>
                            <div>
                                <div className="text-xs font-bold text-indigo-300">{tr('stocks.partnerStock')}</div>
                                <div className="text-[10px] text-indigo-400">{tr('stocks.partnerStockSub')}</div>
                            </div>
                        </div>
                    ) : null}

                    <div className="mb-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                        <div className="flex items-start justify-between gap-4 p-4 pb-3">
                            <div>
                                <div className="text-xs font-bold uppercase text-zinc-500">{tr('stocks.yourPosition')}</div>
                                <div className="mt-2 flex items-end gap-2">
                                    <div className="font-mono text-3xl font-bold leading-none text-sky-400">{formatOwnership(snapshot.ownershipPercent)}</div>
                                    <div className="pb-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600">Ownership</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-lg font-bold text-emerald-400">{formatCompactMoney(snapshot.positionValue)}</div>
                                <div className="text-[9px] text-zinc-500">{tr('stocks.value')}</div>
                            </div>
                        </div>
                        <div className="px-4">
                            <div
                                aria-label="Ownership Progress"
                                className="h-2 overflow-hidden rounded-full bg-zinc-800"
                            >
                                <div
                                    className="h-full rounded-full bg-sky-400 transition-[width]"
                                    style={{ width: `${influenceProgress}%` }}
                                />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold uppercase tracking-wide text-zinc-600">
                                <span>{tr('stocks.influence.progress')}</span>
                                <span>
                                    {influence.nextThreshold === 10
                                        ? tr('stocks.influence.firstUnlock')
                                        : influence.nextThreshold
                                            ? tr('stocks.influence.next', { threshold: influence.nextThreshold })
                                            : tr('stocks.influence.control')}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 border-t border-zinc-800 bg-zinc-950/45">
                            <div className="px-3 py-3">
                                <div className="text-[8px] font-bold uppercase tracking-wide text-zinc-600">{tr('stocks.shares')}</div>
                                <div className="mt-1 truncate font-mono text-xs font-bold text-white">{snapshot.holdingShares.toLocaleString()}</div>
                            </div>
                            <div className="px-3 py-3">
                                <div className="text-[8px] font-bold uppercase tracking-wide text-zinc-600">{tr('stocks.averageCost')}</div>
                                <div className="mt-1 font-mono text-xs font-bold text-zinc-300">{formatMoney(averageCost)}</div>
                            </div>
                            <div className="px-3 py-3">
                                <div className="text-[8px] font-bold uppercase tracking-wide text-zinc-600">{tr('stocks.gainLoss')}</div>
                                <div className={`mt-1 font-mono text-xs font-bold ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {gainLoss >= 0 ? '+' : ''}{formatCompactMoney(gainLoss)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-4">
                            <div>
                                <div className="text-xs font-bold uppercase text-zinc-500">{tr('stocks.influence.ladder')}</div>
                                <div className="mt-1 text-sm font-bold text-white">{influence.label}</div>
                            </div>
                            <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 font-mono text-xs font-bold text-sky-300">
                                {formatOwnership(snapshot.ownershipPercent)}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 divide-x divide-zinc-800 text-center">
                            {[
                                ['10%', tr('stocks.influence.vote')],
                                ['20%', tr('stocks.influence.influence')],
                                ['30%', tr('stocks.influence.board')],
                                ['51%', tr('stocks.influence.control')],
                            ].map(([threshold, label]) => {
                                const unlocked = snapshot.ownershipPercent >= Number(threshold.replace('%', ''));
                                return (
                                    <div key={threshold} className="px-2 py-3">
                                        <div className={`font-mono text-xs font-bold ${unlocked ? 'text-emerald-400' : 'text-zinc-600'}`}>{threshold}</div>
                                        <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-zinc-500">{label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {snapshot.isEntertainment ? (
                        <div className="mb-4 overflow-hidden rounded-xl border border-sky-500/30 bg-sky-950/20">
                            <div className="flex items-start gap-3 border-b border-sky-500/20 p-4">
                                <div className="rounded-full bg-sky-300 p-2 text-slate-950"><Crown size={15} /></div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold uppercase tracking-wide text-sky-300">Majority Control</div>
                                    <div className="mt-1 text-base font-black text-white">{takeoverSnapshot.nextUnlockLabel}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-sky-100/65">
                                        When control is ready, the game brings the decision to you as a popup. If you defer it, you can still start the process here.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-sky-500/20 border-b border-sky-500/20">
                                <div className="p-3">
                                    <div className="text-[8px] font-bold uppercase tracking-wide text-sky-200/45">Owned</div>
                                    <div className="mt-1 font-mono text-sm font-bold text-white">{formatOwnership(takeoverSnapshot.ownershipPercent)}</div>
                                </div>
                                <div className="p-3">
                                    <div className="text-[8px] font-bold uppercase tracking-wide text-sky-200/45">Allied</div>
                                    <div className="mt-1 font-mono text-sm font-bold text-white">{formatOwnership(takeoverSnapshot.alliedSupportPercent)}</div>
                                </div>
                                <div className="p-3">
                                    <div className="text-[8px] font-bold uppercase tracking-wide text-sky-200/45">Effective</div>
                                    <div className="mt-1 font-mono text-sm font-bold text-emerald-300">{formatOwnership(takeoverSnapshot.effectiveControlPercent)}</div>
                                </div>
                            </div>
                            {takeoverCase ? (
                                <div className={`border-b border-sky-500/20 p-4 ${takeoverCase.status === 'RIVAL_DEFENCE' ? 'bg-rose-950/25' : 'bg-black/20'}`}>
                                    <div className="flex items-start gap-2">
                                        {takeoverCase.status === 'RIVAL_DEFENCE' ? <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-300" /> : <Vote size={16} className="mt-0.5 shrink-0 text-sky-300" />}
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-wide text-white">
                                                {takeoverCase.status === 'RIVAL_DEFENCE' ? 'Rival Defence' : takeoverCase.status.replaceAll('_', ' ')}
                                            </div>
                                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{takeoverCase.summary}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            <div className="p-4">
                                {controlFeedback ? (
                                    <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">
                                        {controlFeedback}
                                    </div>
                                ) : null}
                                <button
                                    type="button"
                                    disabled={!takeoverSnapshot.canTransferControl}
                                    onClick={openAcquisitionDesk}
                                    className={`min-h-12 w-full rounded-xl px-4 text-xs font-black uppercase tracking-wide ${
                                        takeoverSnapshot.canTransferControl
                                            ? 'bg-emerald-400 text-slate-950 active:bg-emerald-300'
                                            : 'bg-zinc-900 text-zinc-600'
                                    }`}
                                >
                                    {takeoverSnapshot.canTransferControl ? 'Start Acquisition Process' : takeoverSnapshot.nextUnlockLabel}
                                </button>
                            </div>
                        </div>
                    ) : null}

                </div>
            </div>
        );
    }

    const marketStocks = tradableStocks;
    const portfolioStocks = player.portfolio
        .map(position => tradableStocks.find(stock => stock.id === position.stockId))
        .filter((stock): stock is Stock => Boolean(stock));
    const visibleStocks = tab === 'MARKET' ? marketStocks : portfolioStocks;

    return (
        <div className="absolute inset-0 z-40 flex flex-col bg-black font-sans text-white animate-in slide-in-from-right duration-300">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 pb-3 pt-12 shadow-lg">
                <button type="button" onClick={onBack} className="rounded-full p-1 hover:bg-white/10">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-emerald-500">
                    <Activity size={20} /> {tr('stocks.title')}
                </div>
                <div className="w-8" />
            </div>

            <div className="border-b border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{tr('stocks.totalPortfolio')}</div>
                <div className="mb-4 font-mono text-4xl font-bold text-white">{formatMoney(portfolioValue)}</div>
                <div className="flex gap-4">
                    <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <div className="text-[10px] uppercase text-zinc-500">{tr('stocks.cashAvailable')}</div>
                        <div className="font-mono text-sm font-bold text-zinc-300">{formatMoney(player.money)}</div>
                    </div>
                    <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <div className="text-[10px] uppercase text-zinc-500">{tr('stocks.yieldEst')}</div>
                        <div className="font-mono text-sm font-bold text-emerald-400">{formatCompactMoney(estimatedAnnualYield)}/yr</div>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-zinc-800 bg-zinc-950">
                <button
                    type="button"
                    onClick={() => setTab('MARKET')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${
                        tab === 'MARKET' ? 'border-b-2 border-white text-white' : 'text-zinc-600'
                    }`}
                >
                    {tr('stocks.market')}
                </button>
                <button
                    type="button"
                    onClick={() => setTab('PORTFOLIO')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${
                        tab === 'PORTFOLIO' ? 'border-b-2 border-white text-white' : 'text-zinc-600'
                    }`}
                >
                    {tr('stocks.portfolio')}
                </button>
            </div>

            <div ref={stockScrollRef} className="flex-1 space-y-2 overflow-y-auto p-4 custom-scrollbar">
                {visibleStocks.length === 0 ? (
                    <div className="mt-10 text-center text-sm text-zinc-600">{tr('stocks.noInvestments')}</div>
                ) : visibleStocks.map(stock => {
                    const holding = getHolding(stock.id);
                    return (
                        <StockRow
                            key={stock.id}
                            stock={stock}
                            snapshot={snapshots.get(stock.id) || getEntertainmentStockSnapshot(player, stock)}
                            ownedShares={holding?.shares || 0}
                            ownedLabel={tr('stocks.owned')}
                            onOpen={() => {
                                setSelectedStockId(stock.id);
                                setSharesInput('');
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};
