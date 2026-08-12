import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Briefcase, CheckCircle, X, XCircle } from 'lucide-react';
import { type GreenlightNegotiationState } from '../greenlightTypes';

interface GreenlightNegotiationModalProps {
    negotiation: GreenlightNegotiationState;
    counterOfferInput: string;
    onCounterOfferInputChange: (value: string) => void;
    onAcceptDemand: () => void;
    onSubmitCounterOffer: () => void;
    onWalkAway: () => void;
    onClose: () => void;
    formatMoney: (value: number) => string;
}

export const GreenlightNegotiationModal: React.FC<GreenlightNegotiationModalProps> = ({
    negotiation,
    counterOfferInput,
    onCounterOfferInputChange,
    onAcceptDemand,
    onSubmitCounterOffer,
    onWalkAway,
    onClose,
    formatMoney,
}) => (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-zinc-950 w-full max-w-md max-h-[90vh] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <h3 className="font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg"><Briefcase size={18} className="text-purple-400" /></div>
                    <span className="uppercase tracking-widest text-xs font-black">Contract Negotiation</span>
                </h3>
                <button type="button" onClick={onClose} aria-label="Close contract negotiation" className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 relative">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <img src={negotiation.talentImage} alt={negotiation.talentName} className="w-20 h-20 rounded-2xl border-2 border-purple-500/30 object-cover shadow-xl" referrerPolicy="no-referrer" />
                        <div className="absolute -bottom-2 -right-2 bg-purple-500 text-black text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">Returning</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white tracking-tight">{negotiation.talentName}</div>
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">{negotiation.talentTier.replace('_', ' ')}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5">
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Previous Salary</div>
                        <div className="text-xl font-mono text-zinc-300 font-bold">{formatMoney(negotiation.originalSalary)}</div>
                    </div>
                    <div className="bg-purple-500/5 p-5 rounded-3xl border border-purple-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500/20 text-purple-300 text-[9px] font-black rounded-bl-xl">
                            +{Math.round(((negotiation.currentDemand - negotiation.originalSalary) / negotiation.originalSalary) * 100)}%
                        </div>
                        <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2">New Demand</div>
                        <div className="text-xl font-mono text-purple-300 font-bold">{formatMoney(negotiation.currentDemand)}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><div className="w-4 h-[1px] bg-zinc-800"></div>Propose Counter-Offer</div>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-mono font-bold text-lg">$</div>
                        <input
                            type="number"
                            value={counterOfferInput}
                            onChange={event => onCounterOfferInputChange(event.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all"
                            placeholder="Enter amount..."
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600 uppercase tracking-widest pointer-events-none">USD</div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold px-2">
                        <button type="button" onClick={() => onCounterOfferInputChange(negotiation.originalSalary.toString())} className="text-zinc-500 hover:text-white transition-colors">Match Previous</button>
                        <button type="button" onClick={() => onCounterOfferInputChange(Math.round(negotiation.originalSalary + (negotiation.currentDemand - negotiation.originalSalary) * 0.5).toString())} className="text-zinc-500 hover:text-white transition-colors">Split Difference</button>
                    </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                    <div className="text-xs text-amber-200/70 leading-relaxed">
                        You have <strong className="text-amber-400">{negotiation.attemptsLeft}</strong> negotiation attempts remaining. If they reject your final offer, they will <span className="text-rose-400 font-bold">walk away</span> from the project.
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <button type="button" onClick={onAcceptDemand} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all border border-white/10 active:scale-95">
                        Accept Demand ({formatMoney(negotiation.currentDemand)})
                    </button>
                    <button type="button" onClick={onSubmitCounterOffer} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                        Send Counter-Offer
                    </button>
                    <button type="button" disabled={Boolean(negotiation.feedback)} onClick={onWalkAway} className="w-full py-4 text-zinc-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest transition-colors">
                        End Negotiations (Recast)
                    </button>
                </div>

                {negotiation.feedback && (
                    <div className="absolute inset-0 z-10 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl ${negotiation.feedback.type === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 shadow-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border-2 border-rose-500/50 shadow-rose-500/20'}`}
                        >
                            {negotiation.feedback.type === 'SUCCESS' ? <CheckCircle size={40} /> : <XCircle size={40} />}
                        </motion.div>
                        <motion.h4
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className={`text-2xl font-black uppercase tracking-tight mb-2 ${negotiation.feedback.type === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                            {negotiation.feedback.type === 'SUCCESS' ? 'Offer Accepted!' : negotiation.feedback.type === 'FINAL_FAILURE' ? 'Negotiation Failed' : 'Offer Rejected'}
                        </motion.h4>
                        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-zinc-400 text-sm leading-relaxed max-w-[280px]">
                            {negotiation.feedback.message}
                        </motion.p>
                        {negotiation.feedback.type === 'FAILURE' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                Attempts remaining: {negotiation.attemptsLeft}
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
);
