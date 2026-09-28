import React, { useEffect, useRef, useState } from 'react';
import { Player, ScheduledEvent } from '../types';
import { AlertTriangle, Film, ChevronRight, Activity, Clapperboard, PlayCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { requestRewardedAd } from '../services/rewardedAdCoordinator';
import { classifyRewardedAdFailure } from '../services/rewardedAdExperience';
import { getPlayerLanguage, t } from '../services/i18n';
import { LocalizedTextVars } from '../types';
import {
    beginPendingRewardAd,
    clearPendingRewardAd,
    getRecoverableRewardedAdReceipt,
    markPendingRewardAdGranted,
    markPendingRewardAdReady,
    markPendingRewardAdVerifiedSave,
    readPendingRewardAd,
    recordPendingRewardAdStep,
    RewardedAdPersistenceError,
    type PendingRewardAdReceipt,
} from '../services/rewardedAdRecovery';

interface ProductionCrisisModalProps {
    player: Player;
    event: ScheduledEvent;
    saveSlot: number;
    onChoice: (choiceIndex: number, rewardReceiptId?: string) => Promise<void>;
}

export const ProductionCrisisModal: React.FC<ProductionCrisisModalProps> = ({ player, event, saveSlot, onChoice }) => {
    const [isProcessingAd, setIsProcessingAd] = useState(false);
    const [resolveError, setResolveError] = useState('');
    const restoredReceiptRef = useRef<string | null>(null);
    const { options = [], projectId } = event.data || {};
    const project = player.commitments.find(c => c.id === projectId);
    const language = getPlayerLanguage(player);
    const tr = (key: string, vars?: LocalizedTextVars) => t(language, key, vars);
    const localizeText = (fallback: string, key?: string, vars?: LocalizedTextVars) => key ? tr(key, vars) : fallback;
    const eventVars = event.data?.textVars as LocalizedTextVars | undefined;
    const title = localizeText(event.title, event.data?.titleKey, eventVars);
    const description = localizeText(event.description || '', event.data?.descriptionKey, eventVars);
    const getRewardedAdError = (reason?: Parameters<typeof classifyRewardedAdFailure>[0]) => {
        const kind = classifyRewardedAdFailure(reason);
        if (kind === 'DISMISSED') return tr('app.ads.failure.dismissedSubtext');
        if (kind === 'BUSY') return tr('app.ads.failure.busySubtext');
        if (kind === 'OFFLINE') return tr('app.ads.failure.offlineSubtext');
        if (kind === 'NO_FILL') return tr('app.ads.failure.noFillSubtext');
        return tr('app.ads.failure.unavailableSubtext');
    };

    const finishChoice = async (choiceIndex: number, receipt?: PendingRewardAdReceipt) => {
        await onChoice(choiceIndex, receipt?.id);
        if (!receipt) return;
        const durableReceipt = readPendingRewardAd();
        if (durableReceipt?.id === receipt.id) {
            try {
                const verified = markPendingRewardAdVerifiedSave(durableReceipt);
                markPendingRewardAdGranted(verified);
            } catch {
                // The verified player grant marker remains the durable source of truth.
            }
            clearPendingRewardAd(receipt.id);
        }
    };

    useEffect(() => {
        if (restoredReceiptRef.current || !Array.isArray(options)) return;
        for (const opt of options) {
            if (!opt?.isGolden) continue;
            const contextId = `${event.id}:${opt.index}`;
            const receipt = getRecoverableRewardedAdReceipt({
                playerId: String(player.id || player.name),
                saveSlot,
                placement: 'PRODUCTION_CRISIS_OPTION',
                contextId,
            });
            if (!receipt) continue;
            restoredReceiptRef.current = receipt.id;
            setIsProcessingAd(true);
            void finishChoice(opt.index, receipt)
                .catch(error => {
                    console.error('Production event recovery failed:', error);
                    restoredReceiptRef.current = null;
                    setResolveError(tr('production.modal.errorClose'));
                })
                .finally(() => setIsProcessingAd(false));
            break;
        }
    }, [event.id, options, player.id, player.name, saveSlot]);

    if (!project) {
        const handleDismissMissingProject = () => {
            setResolveError('');
            try {
                void onChoice(0).catch(error => {
                    console.error('Production event recovery failed:', error);
                    setResolveError(tr('production.modal.errorSkip'));
                });
            } catch (error) {
                console.error('Production event recovery failed:', error);
                setResolveError(tr('production.modal.errorSkip'));
            }
        };

        return (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400 mb-2">{tr('production.modal.recovery.eyebrow')}</div>
                    <h3 className="text-2xl font-black text-white leading-tight mb-3">{tr('production.modal.recovery.title')}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                        {tr('production.modal.recovery.description')}
                    </p>
                    {resolveError && <div className="mb-3 text-xs font-bold text-amber-300">{resolveError}</div>}
                    <button
                        type="button"
                        onClick={handleDismissMissingProject}
                        className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl"
                    >
                        {tr('production.modal.continue')}
                    </button>
                </div>
            </div>
        );
    }

    const handleChoice = async (opt: any) => {
        setResolveError('');
        if (opt.isGolden) {
            setIsProcessingAd(true);
            let rewardReceipt: PendingRewardAdReceipt | undefined;
            try {
                const contextId = `${event.id}:${opt.index}`;
                rewardReceipt = getRecoverableRewardedAdReceipt({
                    playerId: String(player.id || player.name),
                    saveSlot,
                    placement: 'PRODUCTION_CRISIS_OPTION',
                    contextId,
                }) || undefined;
                if (!rewardReceipt) {
                    const interrupted = readPendingRewardAd();
                    if (
                        interrupted
                        && interrupted.playerId === String(player.id || player.name)
                        && interrupted.saveSlot === saveSlot
                        && interrupted.placement === 'PRODUCTION_CRISIS_OPTION'
                        && interrupted.contextId === contextId
                        && interrupted.status === 'IN_PROGRESS'
                    ) {
                        clearPendingRewardAd(interrupted.id);
                    }
                    rewardReceipt = beginPendingRewardAd({
                        playerId: String(player.id || player.name),
                        saveSlot,
                        type: 'REWARDED_BAILOUT',
                        placement: 'PRODUCTION_CRISIS_OPTION',
                        contextId,
                        stepsRequired: 1,
                    });
                    const result = await requestRewardedAd({
                        type: 'REWARDED_BAILOUT',
                        placement: 'PRODUCTION_CRISIS_OPTION',
                        contextId,
                    });
                    if (!result.success) {
                        clearPendingRewardAd(rewardReceipt.id);
                        setResolveError(getRewardedAdError(result.reason));
                        return;
                    }
                    try {
                        rewardReceipt = recordPendingRewardAdStep(rewardReceipt, {
                            stepId: result.requestId,
                            stepNumber: 1,
                        });
                        rewardReceipt = markPendingRewardAdReady(rewardReceipt);
                    } catch (error) {
                        const advancedReceipt = error instanceof RewardedAdPersistenceError ? error.receipt : undefined;
                        if (!advancedReceipt) throw error;
                        rewardReceipt = advancedReceipt.completedSteps === advancedReceipt.stepsRequired
                            ? { ...advancedReceipt, status: 'READY_TO_GRANT', remainingStep: null }
                            : advancedReceipt;
                    }
                }
                await finishChoice(opt.index, rewardReceipt);
            } catch (error) {
                console.error("Ad failed:", error);
                setResolveError(rewardReceipt?.status === 'READY_TO_GRANT'
                    ? tr('production.modal.errorClose')
                    : getRewardedAdError('ERROR'));
            } finally {
                setIsProcessingAd(false);
            }
        } else {
            try {
                await finishChoice(opt.index);
            } catch (error) {
                console.error('Production event choice failed:', error);
                setResolveError(tr('production.modal.errorClose'));
            }
        }
    };

    const isDirectorDecision = event.type === 'DIRECTOR_DECISION';
    const themeColor = isDirectorDecision ? 'cyan' : 'red';
    const accentGradient = isDirectorDecision 
        ? 'from-cyan-600 via-blue-500 to-indigo-500' 
        : 'from-red-600 via-rose-500 to-orange-500';

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full max-w-md max-h-[calc(100dvh-2rem)] min-h-0 flex flex-col bg-[#0a0a0a] rounded-3xl overflow-hidden border border-${themeColor}-900/50 shadow-[0_0_50px_rgba(${isDirectorDecision ? '6,182,212' : '220,38,38'},0.15)] relative`}
            >
                {isProcessingAd && (
                    <div className="absolute inset-0 z-[210] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">{tr('production.modal.preparing.title')}</h3>
                        <p className="text-zinc-400 text-sm">{tr('production.modal.preparing.description')}</p>
                    </div>
                )}

                {/* Top warning bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${accentGradient}`} />
                
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 relative overflow-hidden shrink-0">
                    <div className={`absolute -right-4 -top-4 text-${themeColor}-500/10`}>
                        {isDirectorDecision ? <Clapperboard size={120} /> : <AlertTriangle size={120} />}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className={`w-10 h-10 rounded-full bg-${themeColor}-500/20 flex items-center justify-center border border-${themeColor}-500/30`}>
                            {isDirectorDecision ? <Clapperboard size={20} className={`text-${themeColor}-500`} /> : <Activity size={20} className="text-red-500" />}
                        </div>
                        <div>
                            <div className={`text-[10px] font-mono text-${themeColor}-400 uppercase tracking-widest font-bold`}>
                                {isDirectorDecision ? tr('production.modal.directorDecision') : tr('production.modal.productionAlert')}
                            </div>
                            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                                <Film size={12} /> {project.name}
                            </div>
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight relative z-10">
                        {title}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 pt-4 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className={`bg-${themeColor}-950/20 border border-${themeColor}-900/30 rounded-2xl p-4 mb-6 relative`}>
                        {/* Decorative quotes */}
                        <div className={`absolute -top-3 -left-2 text-4xl text-${themeColor}-500/20 font-serif`}>"</div>
                        <p className="text-sm text-zinc-300 leading-relaxed relative z-10">
                            {description}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 px-2">
                            {isDirectorDecision ? tr('production.modal.creativeChoice') : tr('production.modal.selectAction')}
                        </div>
                        {resolveError && (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
                                {resolveError}
                            </div>
                        )}
                        {options.length === 0 && (
                            <button
                                type="button"
                                onClick={() => handleChoice({ index: 0 })}
                                className="w-full p-4 bg-zinc-900/80 border border-white/5 hover:bg-zinc-800 text-white rounded-2xl transition-all flex items-center justify-between group relative overflow-hidden"
                            >
                                <span className="text-sm font-bold tracking-wide">{tr('production.modal.continueSafely')}</span>
                                <ChevronRight size={16} className="text-zinc-500" />
                            </button>
                        )}
                        {options.map((opt: any) => (
                            <motion.button 
                                key={opt.index}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleChoice(opt)}
                                className={`w-full p-4 ${opt.isGolden ? 'bg-amber-950/30 border-amber-500/50' : 'bg-zinc-900/80 border-white/5'} hover:bg-zinc-800 text-white rounded-2xl transition-all border hover:border-${themeColor}-500/50 flex items-center justify-between group relative overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r from-${themeColor}-500/0 via-${themeColor}-500/0 to-${themeColor}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                
                                <div className="flex items-center gap-3 relative z-10">
                                    {opt.isGolden && <PlayCircle size={18} className="text-amber-500" />}
                                    <span className={`text-sm font-bold tracking-wide ${opt.isGolden ? 'text-amber-400' : ''}`}>
                                        {localizeText(opt.label, opt.labelKey, opt.textVars)}
                                    </span>
                                </div>
                                
                                <div className={`w-8 h-8 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-${themeColor}-500/20 transition-colors relative z-10`}>
                                    <ChevronRight size={16} className={`text-zinc-500 group-hover:text-${themeColor}-400`} />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
