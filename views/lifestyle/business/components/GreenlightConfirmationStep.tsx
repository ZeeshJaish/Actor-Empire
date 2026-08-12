import React from 'react';
import {
    AlertTriangle,
    Clapperboard,
    Globe,
    Layers,
    Users,
    Zap,
} from 'lucide-react';
import type { MusicCreditRole, ProjectMusicPlan } from '../../../../types';
import {
    GreenlightInvestorFinancingSection,
    type GreenlightInvestorFinancingSectionProps,
} from './GreenlightInvestorFinancingSection';
import type { ConnectedProjectIntent } from '../greenlightUtils';

interface GreenlightConfirmationBudget {
    director: number;
    cast: number;
    backgroundEnsemble: number;
    crew: number;
    locationCost: number;
    equipmentCost: number;
    scriptCost: number;
    baseCost: number;
    total: number;
}

interface GreenlightConfirmationCastRole {
    id: string;
    characterName?: string;
    roleName?: string;
    actorName?: string;
    roleType: string;
    salary?: number;
    negotiationStatus: string;
}

interface GreenlightReturningTalentReviewItem {
    key: string;
    image: string;
    name: string;
    roleLabel: string;
    demand: number;
    attemptsLeft: number;
    onNegotiate: () => void;
}

interface GreenlightConfirmationStepProps {
    projectTitle: string;
    scriptStatus?: string;
    effectiveConnectedIntent: ConnectedProjectIntent;
    hasUniverseConnection: boolean;
    universeName?: string;
    hasFranchiseConnection: boolean;
    franchiseName?: string;
    franchiseInstallment?: number;
    linkedCastSummary: GreenlightConfirmationCastRole[];
    returningTalentReviewItems: GreenlightReturningTalentReviewItem[];
    directorName: string;
    backgroundPerformerCount: number;
    selectedLocationCount: number;
    budgetBreakdown: GreenlightConfirmationBudget;
    selectedMusicPlan: ProjectMusicPlan | null;
    musicBudget: number;
    reservedMarketingBudget: number;
    packageBudget: number;
    netGreenlightCashRequirement: number;
    effectiveStudioFundingPool: number;
    investorRaisedAmount: number;
    previousInstallmentCost: number | null;
    productionFund: number;
    lockedStreamingFundingAmount: number;
    lockedStreamingFundingSource?: string;
    lockedStreamingPlatformName?: string;
    investorFinancingProps: GreenlightInvestorFinancingSectionProps;
    authorizedBy: string;
    canGreenlight: boolean;
    greenlightErrors: string[];
    playerEnergy: number;
    greenlightEnergyCost: number;
    formatMoney: (amount: number) => string;
    getMusicStrategyLabel: (strategy: ProjectMusicPlan['strategy']) => string;
    getMusicCreditRoleLabel: (role: MusicCreditRole) => string;
    onGreenlight: () => void;
}

export const GreenlightConfirmationStep: React.FC<GreenlightConfirmationStepProps> = ({
    projectTitle,
    scriptStatus,
    effectiveConnectedIntent,
    hasUniverseConnection,
    universeName,
    hasFranchiseConnection,
    franchiseName,
    franchiseInstallment,
    linkedCastSummary,
    returningTalentReviewItems,
    directorName,
    backgroundPerformerCount,
    selectedLocationCount,
    budgetBreakdown,
    selectedMusicPlan,
    musicBudget,
    reservedMarketingBudget,
    packageBudget,
    netGreenlightCashRequirement,
    effectiveStudioFundingPool,
    investorRaisedAmount,
    previousInstallmentCost,
    productionFund,
    lockedStreamingFundingAmount,
    lockedStreamingFundingSource,
    lockedStreamingPlatformName,
    investorFinancingProps,
    authorizedBy,
    canGreenlight,
    greenlightErrors,
    playerEnergy,
    greenlightEnergyCost,
    formatMoney,
    getMusicStrategyLabel,
    getMusicCreditRoleLabel,
    onGreenlight,
}) => {
    const hasStoryConnection = hasUniverseConnection
        || hasFranchiseConnection
        || effectiveConnectedIntent !== 'SOLO';

    return (
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-nav-safe-lg animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
                    <div>
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Production Approval</div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">{projectTitle}</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-mono text-zinc-500">REF: {Date.now().toString().slice(-8)}</div>
                        <div className="text-emerald-500 font-bold text-xs uppercase">Ready for Greenlight</div>
                    </div>
                </div>

                {hasStoryConnection ? (
                    <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Clapperboard size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Type: <span className="text-white">{effectiveConnectedIntent}</span>
                            </span>
                        </div>
                        {hasUniverseConnection ? (
                            <div className="flex items-center gap-2">
                                <Globe size={12} className="text-blue-400" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Universe: <span className="text-white">{universeName}</span>
                                </span>
                            </div>
                        ) : null}
                        {hasFranchiseConnection ? (
                            <div className="flex items-center gap-2">
                                <Layers size={12} className="text-amber-400" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Franchise: <span className="text-white">
                                        {franchiseName}{franchiseInstallment ? ` (Part ${franchiseInstallment})` : ''}
                                    </span>
                                </span>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="p-6 space-y-6">
                    {linkedCastSummary.length > 0 ? (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Connected Cast</h3>
                                    <p className="text-[10px] text-zinc-500 mt-1">
                                        {linkedCastSummary.length} universe character{linkedCastSummary.length === 1 ? '' : 's'} attached • {effectiveConnectedIntent}
                                    </p>
                                </div>
                                {returningTalentReviewItems.length > 0 ? (
                                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest">
                                        {returningTalentReviewItems.length} Pending
                                    </span>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                {linkedCastSummary.slice(0, 4).map(role => (
                                    <div key={role.id} className="flex items-center justify-between gap-3 bg-black/25 border border-white/5 rounded-lg px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-white truncate">{role.characterName || role.roleName}</p>
                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">
                                                {role.actorName || 'Casting needed'} • {role.roleType}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-mono font-bold text-zinc-200">{formatMoney(role.salary || 0)}</p>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${role.negotiationStatus === 'Negotiating' ? 'text-amber-300' : role.negotiationStatus === 'Declined' ? 'text-rose-300' : role.negotiationStatus === 'Uncast' ? 'text-zinc-500' : 'text-emerald-300'}`}>
                                                {role.negotiationStatus}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {linkedCastSummary.length > 4 ? (
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                        +{linkedCastSummary.length - 4} more connected role{linkedCastSummary.length - 4 === 1 ? '' : 's'}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Above The Line</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Script Rights</span>
                                <span className="font-mono text-white">Included</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Director ({directorName})</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.director)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Principal Cast</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.cast)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Background Ensemble ({backgroundPerformerCount})</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.backgroundEnsemble)}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 border-b border-zinc-800 pb-1">Below The Line</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Production Crew</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.crew)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Locations ({selectedLocationCount})</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.locationCost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Equipment & Gear</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.equipmentCost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Script & IP Rights</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.scriptCost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Base Production Costs</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.baseCost)}</span>
                            </div>
                            <p className="pt-1 text-[10px] leading-relaxed text-zinc-500">
                                In-house teams and owned gear use discounted studio operating rates. Payroll, insurance, transport and wear are included—they are never treated as free.
                            </p>
                        </div>
                    </div>

                    {selectedMusicPlan ? (
                        <div>
                            <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 border-b border-cyan-500/20 pb-1">Soundtrack Desk</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-zinc-300">
                                        {getMusicStrategyLabel(selectedMusicPlan.strategy)}
                                        {selectedMusicPlan.artistTargetCount ? ` • ${selectedMusicPlan.artistTargetCount} artists` : ''}
                                    </span>
                                    <span className="font-mono text-cyan-300">{formatMoney(musicBudget)}</span>
                                </div>
                                {selectedMusicPlan.credits.map(credit => (
                                    <div key={`${credit.artistId}_${credit.role}`} className="flex justify-between items-center gap-4 text-xs">
                                        <span className="min-w-0 truncate text-zinc-500">{credit.artistName} • {getMusicCreditRoleLabel(credit.role)}</span>
                                        <span className="font-mono text-zinc-400">{formatMoney(credit.estimatedCost)}</span>
                                    </div>
                                ))}
                                <p className="text-[10px] text-zinc-500 leading-relaxed">
                                    Music can add social reach and soundtrack buzz, with some image risk if the artist or campaign feels mismatched.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 border-b border-amber-500/20 pb-1">Release Reserve</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Production Budget</span>
                                <span className="font-mono text-white">{formatMoney(budgetBreakdown.total + musicBudget)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-300">Campaign Pool</span>
                                <span className="font-mono text-amber-300">{formatMoney(reservedMarketingBudget)}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                This pool is reserved for Release Strategy. Any unspent campaign budget returns to the studio wallet after the campaign is locked.
                            </p>
                        </div>
                    </div>

                    <div className="bg-zinc-950 rounded-lg p-4 flex justify-between items-center border border-zinc-800 mt-4">
                        <div>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Package</div>
                            <div className="text-xs text-zinc-600">Production, music, and reserved marketing</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black font-mono ${netGreenlightCashRequirement > effectiveStudioFundingPool ? 'text-rose-500' : 'text-emerald-400'}`}>
                                {formatMoney(packageBudget)}
                            </div>
                            {investorRaisedAmount > 0 ? (
                                <div className="text-[10px] font-mono text-emerald-300 mt-1 uppercase">
                                    Studio Cash Need: {formatMoney(netGreenlightCashRequirement)}
                                </div>
                            ) : null}
                            {previousInstallmentCost ? (
                                <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">
                                    Last Part: {formatMoney(previousInstallmentCost)}
                                    <span className={`ml-2 ${packageBudget > previousInstallmentCost ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        ({packageBudget > previousInstallmentCost ? '+' : ''}{(((packageBudget - previousInstallmentCost) / previousInstallmentCost) * 100).toFixed(1)}%)
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {productionFund > 0 ? (
                        <div className="bg-emerald-950/30 rounded-lg p-4 flex justify-between items-center border border-emerald-500/30 mt-2">
                            <div>
                                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Available Production Fund</div>
                                <div className="text-xs text-emerald-600/70">From previous streaming deals</div>
                            </div>
                            <div className="text-xl font-black font-mono text-emerald-400">- {formatMoney(productionFund)}</div>
                        </div>
                    ) : null}

                    {lockedStreamingFundingAmount > 0 ? (
                        <div className="bg-sky-950/30 rounded-lg p-4 flex justify-between items-center border border-sky-500/30 mt-2">
                            <div>
                                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                                    {lockedStreamingFundingSource === 'OWNED_STREAMING_PLATFORM' ? 'EMPIRE+ Original Commission' : 'Locked Next Season Cap'}
                                </div>
                                <div className="text-xs text-sky-300/70">
                                    {lockedStreamingPlatformName || 'Streaming platform'} funds this {lockedStreamingFundingSource === 'OWNED_STREAMING_PLATFORM' ? 'production' : 'season'} first. Any unused cap returns to the platform.
                                </div>
                            </div>
                            <div className="text-xl font-black font-mono text-sky-300">- {formatMoney(lockedStreamingFundingAmount)}</div>
                        </div>
                    ) : null}

                    <GreenlightInvestorFinancingSection {...investorFinancingProps} />
                </div>

                <div className="bg-zinc-950 p-4 border-t border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <Users size={14} />
                        </div>
                        <div className="text-xs">
                            <div className="text-zinc-500 uppercase text-[9px] font-bold">Authorized By</div>
                            <div className="text-white font-bold">{authorizedBy}</div>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div className="space-y-4">
                {!canGreenlight && greenlightErrors.length > 0 ? (
                    <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">
                            <AlertTriangle size={14} /> Missing Requirements
                        </div>
                        <ul className="space-y-1">
                            {greenlightErrors.map((error, index) => (
                                <li key={`${error}_${index}`} className="text-[11px] text-rose-200/70 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                                    {error}
                                </li>
                            ))}
                        </ul>
                        {returningTalentReviewItems.length > 0 ? (
                            <div className="mt-4 pt-4 border-t border-rose-500/20 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80">Pending Return Deals</div>
                                    <div className="text-[10px] font-black text-white/70">{returningTalentReviewItems.length} left</div>
                                </div>
                                {returningTalentReviewItems.slice(0, 6).map(item => (
                                    <div key={item.key} className="rounded-xl border border-rose-500/20 bg-black/25 p-3 flex items-center gap-3">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-10 h-10 rounded-xl object-cover border border-white/10 bg-zinc-900"
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-black text-white truncate">{item.name}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                {item.roleLabel} • Demand {formatMoney(item.demand)} • {item.attemptsLeft} tries
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={item.onNegotiate}
                                            className="shrink-0 px-3 py-2 rounded-lg bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-400 transition-colors"
                                        >
                                            Negotiate
                                        </button>
                                    </div>
                                ))}
                                {returningTalentReviewItems.length > 6 ? (
                                    <div className="rounded-xl border border-rose-500/10 bg-black/20 p-3 text-[10px] font-black uppercase tracking-widest text-rose-200/70 text-center">
                                        {returningTalentReviewItems.length - 6} more return deals are hidden here. Use Repair Return Deals if this came from QA stress data.
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className={`mb-3 flex items-center justify-between rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] ${playerEnergy >= greenlightEnergyCost ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-rose-400/25 bg-rose-400/10 text-rose-200'}`}>
                    <span>Producer Focus</span>
                    <span className="flex items-center gap-1"><Zap size={13} fill="currentColor" /> {greenlightEnergyCost}E</span>
                </div>

                <button
                    type="button"
                    onClick={onGreenlight}
                    disabled={!canGreenlight}
                    className={`w-full font-black text-xl py-6 rounded-xl transition-all flex items-center justify-center gap-3 ${canGreenlight ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] hover:scale-105' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                >
                    <Zap size={24} fill={canGreenlight ? 'black' : 'none'} />
                    {scriptStatus === 'IN_DEVELOPMENT'
                        ? 'SCRIPTING IN PROGRESS...'
                        : canGreenlight
                            ? `GREENLIGHT PROJECT · ${greenlightEnergyCost}E`
                            : 'MISSING REQUIREMENTS'}
                </button>
            </div>
        </div>
    );
};
