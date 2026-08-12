import React from 'react';
import { Building2, Check } from 'lucide-react';
import type {
    ProjectInvestorFundingMode,
    ProjectInvestorPlan,
} from '../../../../types';

export interface GreenlightInvestorOfferCardData {
    investorId: string;
    investorName: string;
    kindLabel: string;
    ownerName?: string;
    headquarters?: string;
    investorTags: string[];
    reputation: number;
    relationshipLabel?: string;
    note: string;
    selected: boolean;
    displayAmount: number;
    unusedCapacity: number;
    dealEquity: number;
    cleanEquity: number;
    equitySpread: number;
    cardRole: string;
    amountLabel: string;
}

export interface GreenlightInvestorFinancingSectionProps {
    maxInvestorRaise: number;
    normalizedInvestorRaise: number;
    investorRaisedAmount: number;
    investorFundingOverage: number;
    investorFundingShortfall: number;
    selectedInvestorPlan: ProjectInvestorPlan | null;
    effectiveStudioFundingPool: number;
    netGreenlightCashRequirement: number;
    investorRaisePercent: number;
    investorFundingMode: ProjectInvestorFundingMode;
    offerCards: GreenlightInvestorOfferCardData[];
    formatMoney: (amount: number) => string;
    translate: (key: any, vars?: Record<string, unknown>) => string;
    onClearInvestors: () => void;
    onRaiseAmountChange: (amount: number) => void;
    onRaisePercentChange: (percent: number) => void;
    onFundingModeChange: (mode: ProjectInvestorFundingMode) => void;
    onToggleInvestor: (investorId: string) => void;
}

interface InvestorOfferCardProps {
    card: GreenlightInvestorOfferCardData;
    formatMoney: (amount: number) => string;
    onToggle: () => void;
}

const InvestorOfferCard: React.FC<InvestorOfferCardProps> = ({
    card,
    formatMoney,
    onToggle,
}) => (
    <button
        type="button"
        onClick={onToggle}
        className={`rounded-xl border p-3 text-left transition-all cursor-pointer min-h-[196px] flex flex-col ${card.selected ? 'bg-emerald-500/10 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.16)]' : 'bg-black/25 border-zinc-800 hover:border-zinc-600'}`}
        aria-pressed={card.selected}
    >
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="text-sm font-black text-white truncate">{card.investorName}</div>
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
                    {card.kindLabel} • Rep {card.reputation} • {card.relationshipLabel}
                </div>
                {card.ownerName ? (
                    <div className="mt-1 text-[9px] font-bold text-zinc-500 truncate">
                        Owner: {card.ownerName}{card.headquarters ? ` • ${card.headquarters}` : ''}
                    </div>
                ) : null}
            </div>
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${card.selected ? 'bg-emerald-400 border-emerald-300 text-black' : 'border-zinc-700 text-zinc-600'}`}>
                {card.selected ? <Check size={14} /> : null}
            </div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
            <div>
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">
                    {card.amountLabel}
                </div>
                <span className="text-lg font-black font-mono text-emerald-300">
                    {formatMoney(card.displayAmount)}
                </span>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-cyan-200 whitespace-nowrap">
                {card.dealEquity}% equity
            </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${card.selected ? 'bg-emerald-400/15 text-emerald-200 border border-emerald-400/25' : 'bg-white/5 text-zinc-500 border border-white/10'}`}>
                {card.cardRole}
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-widest ${card.equitySpread > 0.2 ? 'text-amber-300' : card.equitySpread < -0.2 ? 'text-emerald-300' : 'text-zinc-500'}`}>
                {card.equitySpread > 0.2
                    ? `+${card.equitySpread}% premium`
                    : card.equitySpread < -0.2
                        ? `${card.equitySpread}% discount`
                        : 'clean terms'}
            </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                Clean {card.cleanEquity}%
            </span>
            {card.unusedCapacity > 0 ? (
                <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                    {formatMoney(card.unusedCapacity)} unused cap
                </span>
            ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
            {card.investorTags.slice(0, 3).map(tag => (
                <span
                    key={tag}
                    className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-zinc-500"
                >
                    {tag}
                </span>
            ))}
        </div>
        <p className="mt-auto pt-2 text-[10px] text-zinc-500 leading-relaxed line-clamp-2">{card.note}</p>
    </button>
);

export const GreenlightInvestorFinancingSection: React.FC<GreenlightInvestorFinancingSectionProps> = ({
    maxInvestorRaise,
    normalizedInvestorRaise,
    investorRaisedAmount,
    investorFundingOverage,
    investorFundingShortfall,
    selectedInvestorPlan,
    effectiveStudioFundingPool,
    netGreenlightCashRequirement,
    investorRaisePercent,
    investorFundingMode,
    offerCards,
    formatMoney,
    translate,
    onClearInvestors,
    onRaiseAmountChange,
    onRaisePercentChange,
    onFundingModeChange,
    onToggleInvestor,
}) => (
    <section className="bg-zinc-950/70 rounded-xl border border-zinc-800 p-4 space-y-4" aria-labelledby="greenlight-investor-financing-heading">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h3 id="greenlight-investor-financing-heading" className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={13} /> Investor Financing
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Set a target, then pick one lead investor or a syndicate. You can raise more than target, but the extra dilution is shown before confirm.
                </p>
            </div>
            <button
                type="button"
                onClick={onClearInvestors}
                className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-500"
            >
                No Investor
            </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-black/35 border border-white/5 p-3">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Target Raise</div>
                <div className="mt-2 flex items-center gap-1">
                    <span className="text-zinc-500 font-mono text-sm">$</span>
                    <input
                        type="number"
                        min={0}
                        max={Math.round(maxInvestorRaise / 1_000_000)}
                        step={0.1}
                        value={Math.round(normalizedInvestorRaise / 100_000) / 10}
                        onChange={event => onRaiseAmountChange(Math.round((Number(event.target.value) || 0) * 1_000_000))}
                        className="w-full bg-transparent text-xl font-black font-mono text-white focus:outline-none"
                        aria-label="Investor raise amount in millions"
                    />
                    <span className="text-zinc-500 font-black text-xs">M</span>
                </div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mt-1">Max {formatMoney(maxInvestorRaise)}</div>
            </div>
            <div className="rounded-lg bg-black/35 border border-white/5 p-3">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Selected</div>
                <div className="text-xl font-black font-mono text-emerald-300 mt-2">{formatMoney(investorRaisedAmount)}</div>
                <div className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${investorFundingOverage > 0 ? 'text-cyan-300' : investorFundingShortfall > 0 ? 'text-amber-300' : 'text-zinc-600'}`}>
                    {investorFundingOverage > 0
                        ? `${formatMoney(investorFundingOverage)} over`
                        : investorFundingShortfall > 0
                            ? `${formatMoney(investorFundingShortfall)} short`
                            : 'Target met'}
                </div>
            </div>
            <div className="rounded-lg bg-black/35 border border-white/5 p-3">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Investors Own</div>
                <div className="text-xl font-black font-mono text-cyan-300 mt-2">{selectedInvestorPlan?.investorEquityPercent || 0}%</div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mt-1">Deal terms</div>
            </div>
            <div className="rounded-lg bg-black/35 border border-white/5 p-3">
                <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Studio Need</div>
                <div className={`text-xl font-black font-mono mt-2 ${effectiveStudioFundingPool >= netGreenlightCashRequirement ? 'text-white' : 'text-rose-400'}`}>
                    {formatMoney(netGreenlightCashRequirement)}
                </div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mt-1">After investors</div>
            </div>
        </div>

        {normalizedInvestorRaise > 0 && investorRaisedAmount > 0 ? (
            <div className={`rounded-xl border p-3 ${investorFundingOverage > 0 ? 'border-cyan-400/25 bg-cyan-400/10' : investorFundingShortfall > 0 ? 'border-amber-400/25 bg-amber-400/10' : 'border-emerald-400/25 bg-emerald-400/10'}`}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Funding Read</div>
                        <div className="mt-1 text-sm font-black text-white">
                            {investorFundingOverage > 0
                                ? `You are raising ${formatMoney(investorFundingOverage)} more than target.`
                                : investorFundingShortfall > 0
                                    ? `${formatMoney(investorFundingShortfall)} still needs studio cash or another investor.`
                                    : 'Target is fully covered.'}
                        </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-right">
                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Studio Keeps</div>
                        <div className="text-sm font-black text-emerald-200">{selectedInvestorPlan?.studioEquityPercent || 100}%</div>
                    </div>
                </div>
            </div>
        ) : null}

        <div className="rounded-xl border border-zinc-800 bg-black/25 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Raise Target</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Exact percent of available project gap.</div>
                </div>
                <div className="flex items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => onRaisePercentChange(investorRaisePercent - 1)}
                        className="h-10 w-10 text-lg font-black text-cyan-100 hover:bg-white/10"
                        aria-label="Decrease investor raise percent"
                    >
                        -
                    </button>
                    <div className="h-10 min-w-[88px] border-x border-cyan-400/20 flex items-center justify-center gap-1 px-3">
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={investorRaisePercent}
                            onChange={event => onRaisePercentChange(Number(event.target.value))}
                            className="w-11 bg-transparent text-center text-lg font-black font-mono text-cyan-100 focus:outline-none"
                            aria-label="Investor raise percent"
                        />
                        <span className="text-xs font-black text-cyan-200">%</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onRaisePercentChange(investorRaisePercent + 1)}
                        className="h-10 w-10 text-lg font-black text-cyan-100 hover:bg-white/10"
                        aria-label="Increase investor raise percent"
                    >
                        +
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {[0, 25, 50, 100].map(percent => {
                    const active = investorRaisePercent === percent || (percent === 100 && normalizedInvestorRaise === maxInvestorRaise);
                    return (
                        <button
                            key={percent}
                            type="button"
                            onClick={() => onRaisePercentChange(percent)}
                            className={`rounded-lg border px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-colors ${active ? 'bg-emerald-400 text-black border-emerald-300' : 'bg-black/25 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
                            aria-pressed={active}
                        >
                            {percent === 0
                                ? translate('greenlight.investors.raise.none')
                                : percent === 100
                                    ? translate('greenlight.investors.raise.max')
                                    : `${percent}%`}
                        </button>
                    );
                })}
            </div>
        </div>

        {normalizedInvestorRaise > 0 ? (
            <>
                <div className="grid grid-cols-2 gap-2">
                    {([
                        {
                            id: 'LEAD' as ProjectInvestorFundingMode,
                            label: translate('greenlight.investors.mode.lead.label'),
                            stat: translate('greenlight.investors.mode.lead.stat'),
                            note: translate('greenlight.investors.mode.lead.note'),
                        },
                        {
                            id: 'SYNDICATE' as ProjectInvestorFundingMode,
                            label: translate('greenlight.investors.mode.syndicate.label'),
                            stat: translate('greenlight.investors.mode.syndicate.stat'),
                            note: translate('greenlight.investors.mode.syndicate.note'),
                        },
                    ]).map(option => {
                        const active = investorFundingMode === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => onFundingModeChange(option.id)}
                                className={`min-h-[116px] rounded-xl border p-3 text-left transition-all cursor-pointer flex flex-col justify-between ${active ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_18px_rgba(16,185,129,0.14)]' : 'border-zinc-800 bg-black/25 hover:border-zinc-600'}`}
                                aria-pressed={active}
                            >
                                <div>
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                                        <span className="min-w-0 text-sm font-black text-white leading-tight">{option.label}</span>
                                        <span className={`shrink-0 rounded-md px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.14em] whitespace-nowrap ${active ? 'bg-emerald-300 text-black' : 'bg-white/5 text-zinc-500'}`}>
                                            {option.stat}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-[9px] leading-relaxed text-zinc-500">{option.note}</p>
                                </div>
                                <div className={`mt-3 h-1 rounded-full ${active ? 'bg-emerald-300' : 'bg-zinc-800'}`} />
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                            {investorFundingMode === 'LEAD'
                                ? translate('greenlight.investors.offers.lead')
                                : translate('greenlight.investors.offers.syndicate')}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                            {translate('greenlight.investors.offers.selected', { count: selectedInvestorPlan?.commitments.length || 0 })}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {offerCards.map(card => (
                            <InvestorOfferCard
                                key={card.investorId}
                                card={card}
                                formatMoney={formatMoney}
                                onToggle={() => onToggleInvestor(card.investorId)}
                            />
                        ))}
                    </div>
                    {offerCards.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] text-amber-100/70 leading-relaxed">
                            No serious investor wants this raise yet. Lower the amount, improve the package, or rebuild studio confidence with stronger releases.
                        </div>
                    ) : null}
                </div>
            </>
        ) : null}
    </section>
);
