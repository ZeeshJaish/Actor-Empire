import React, { useEffect, useRef, useState } from 'react';
import { EventImpactSignal, Player, ScheduledEvent, LifeEvent, LifeEventImpactResult, LifeEventOption, LifeEventResolutionKind, LocalizedTextVars } from '../types';
import { AlertTriangle, ShieldAlert, Scale, User, Zap, ChevronRight, PlayCircle, Loader2, CheckCircle, Activity, Newspaper } from 'lucide-react';
import { motion } from 'motion/react';
import { requestRewardedAd } from '../services/rewardedAdCoordinator';
import { classifyRewardedAdFailure } from '../services/rewardedAdExperience';
import { addBreadcrumb, recordNonFatal, setCrashContext, trackGameEvent } from '../services/firebaseService';
import { getPlayerLanguage, t } from '../services/i18n';
import { generateLegalHearing } from '../services/lifeEventLogic';
import { buildLifeEventDiagnosticContext } from '../services/lifeEventDiagnostics';
import { getLifeEventOptionIdentity } from '../services/lifeEventResolver';
import { resolveLifeEventChoiceWithSafeFallback } from '../services/lifeEventSafeFallback';
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

export interface LifeEventChoiceCommit {
    updatedPlayer: Player;
    log: string;
    optionId: string;
    impactId?: string;
    resolutionSeed?: string;
    resolutionKind: LifeEventResolutionKind;
    rewardReceiptId?: string;
}

interface LifeEventModalProps {
    player: Player;
    event: ScheduledEvent;
    saveSlot: number;
    onChoice: (resolution: LifeEventChoiceCommit) => Promise<void>;
}

export const LifeEventModal: React.FC<LifeEventModalProps> = ({ player, event, saveSlot, onChoice }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: string, vars?: LocalizedTextVars) => t(language, key, vars);
    const localizeText = (fallback: string | undefined, key?: string, vars?: LocalizedTextVars) =>
        key ? tr(key, vars) : (fallback || '');
    const [isProcessingAd, setIsProcessingAd] = useState(false);
    const [feedback, setFeedback] = useState<{
        updatedPlayer: Player;
        log: string;
        rawLog: string;
        optionLabel: string;
        wasGolden: boolean;
        effects?: EventImpactSignal[];
        optionId: string;
        impactId?: string;
        resolutionSeed?: string;
        resolutionKind: LifeEventResolutionKind;
        rewardReceiptId?: string;
    } | null>(null);
    const [isResolvingFeedback, setIsResolvingFeedback] = useState(false);
    const [resolveError, setResolveError] = useState('');
    const restoredReceiptRef = useRef<string | null>(null);
    // Legal hearings persist only a case id. Rebuild their live impacts at display time so
    // callbacks never enter IndexedDB while the hearing remains fully playable.
    const legalCaseId = typeof event.data?.caseId === 'string' ? event.data.caseId : undefined;
    const rebuiltLegalHearing = event.type === 'LEGAL_HEARING' && legalCaseId
        ? generateLegalHearing(player, legalCaseId)
        : null;
    const lifeEvent: LifeEvent = rebuiltLegalHearing || event.data?.lifeEvent;
    const getLifeEventTitle = (targetEvent: LifeEvent | undefined = lifeEvent) =>
        localizeText(targetEvent?.title, targetEvent?.titleKey, targetEvent?.textVars);
    const getLifeEventDescription = () =>
        localizeText(lifeEvent?.description, lifeEvent?.descriptionKey, lifeEvent?.textVars);
    const getOptionLabel = (option: LifeEventOption) =>
        localizeText(option.label, option.labelKey, option.textVars);
    const getOptionDescription = (option: LifeEventOption) =>
        localizeText(option.description, option.descriptionKey, option.textVars);
    const getSignalLabel = (effect: EventImpactSignal) =>
        localizeText(effect.label, effect.labelKey, effect.textVars);
    const getSignalValue = (effect: EventImpactSignal) =>
        localizeText(effect.value, effect.valueKey, effect.textVars);
    const getImpactLog = (impactResult: LifeEventImpactResult) =>
        localizeText(impactResult.log, impactResult.logKey, impactResult.logVars);
    const getRewardedAdError = (reason?: Parameters<typeof classifyRewardedAdFailure>[0]) => {
        const kind = classifyRewardedAdFailure(reason);
        if (kind === 'DISMISSED') return tr('app.ads.failure.dismissedSubtext');
        if (kind === 'BUSY') return tr('app.ads.failure.busySubtext');
        if (kind === 'OFFLINE') return tr('app.ads.failure.offlineSubtext');
        if (kind === 'NO_FILL') return tr('app.ads.failure.noFillSubtext');
        return tr('app.ads.failure.unavailableSubtext');
    };

    const executeOptionImpact = (
        option: LifeEventOption,
        idx: number,
        sourcePlayer: Player,
        isGolden: boolean
    ): LifeEventImpactResult => {
        const diagnosticContext = buildLifeEventDiagnosticContext(event, lifeEvent, option, idx);

        const resolution = resolveLifeEventChoiceWithSafeFallback(
            sourcePlayer,
            event,
            lifeEvent,
            option,
            idx,
        );
        const resolved = resolution.result;
        if (resolution.primaryError !== undefined) {
            console.error('LifeEvent primary impact failed; safe fallback applied.', resolution.primaryError);
            recordNonFatal(resolution.primaryError, 'life_event_impact_failed', {
                ...diagnosticContext,
                golden: isGolden,
            });
            trackGameEvent('life_event_safe_fallback_applied', {
                ...diagnosticContext,
                golden: isGolden,
                fallback_reason: resolved.fallbackReason || 'PRIMARY_RESOLVER_ERROR',
                fallback_source: resolved.fallbackSource || 'NO_CHANGE',
                fallback_effect_count: resolved.effects?.length || 0,
            });
        }
        if (resolved.resolutionKind === 'LEGACY_UNRESOLVABLE') {
            trackGameEvent('legacy_event_unresolvable', {
                ...diagnosticContext,
                legacy_reason: resolved.legacyReason || 'UNKNOWN',
            });
        }
        return resolved;
    };

    const presentImpactResult = (
        option: LifeEventOption,
        idx: number,
        impactResult: LifeEventImpactResult,
        rewardReceiptId?: string,
    ) => {
        const { updatedPlayer, log, feedbackDelay, feedbackType, effects } = impactResult;
        const localizedLog = getImpactLog(impactResult);

        if (feedbackDelay && feedbackType) {
            if (!updatedPlayer.flags) updatedPlayer.flags = {};
            if (!updatedPlayer.flags.pendingFeedback) updatedPlayer.flags.pendingFeedback = [];
            updatedPlayer.flags.pendingFeedback.push({
                type: feedbackType,
                weeksLeft: feedbackDelay,
            });
        }

        setFeedback({
            updatedPlayer,
            log: localizedLog || log,
            rawLog: log,
            optionLabel: getOptionLabel(option),
            wasGolden: !!option.isGolden,
            effects,
            optionId: getLifeEventOptionIdentity(event, option, idx),
            impactId: option.impactId,
            resolutionSeed: option.resolutionSeed,
            resolutionKind: impactResult.resolutionKind || 'RUNTIME_CALLBACK',
            rewardReceiptId,
        });
    };

    const getRewardReceiptFromPersistenceError = (error: unknown): PendingRewardAdReceipt | null => (
        error instanceof RewardedAdPersistenceError && error.receipt ? error.receipt : null
    );

    useEffect(() => {
        if (!lifeEvent || feedback || isProcessingAd || restoredReceiptRef.current) return;
        const options = Array.isArray(lifeEvent.options) ? lifeEvent.options : [];
        for (let idx = 0; idx < options.length; idx += 1) {
            const option = options[idx];
            if (!option?.isGolden) continue;
            const contextId = `${event.id}:${getLifeEventOptionIdentity(event, option, idx)}`;
            const receipt = getRecoverableRewardedAdReceipt({
                playerId: String(player.id || player.name),
                saveSlot,
                placement: 'LIFE_EVENT_OPTION',
                contextId,
            });
            if (!receipt) continue;
            restoredReceiptRef.current = receipt.id;
            try {
                presentImpactResult(option, idx, executeOptionImpact(option, idx, player, true), receipt.id);
                trackGameEvent('reward_ad_storyline_resumed', {
                    placement: 'LIFE_EVENT_OPTION',
                    reward_session_id: receipt.id,
                });
            } catch (error) {
                restoredReceiptRef.current = null;
                recordNonFatal(error, 'reward_ad_storyline_resume_failed', {
                    placement: 'LIFE_EVENT_OPTION',
                    reward_session_id: receipt.id,
                });
                setResolveError(tr('life.modal.error.choiceFailed'));
            }
            break;
        }
    }, [event.id, feedback, isProcessingAd, lifeEvent, player.id, player.name, saveSlot]);

    const handleOptionClick = async (option: LifeEventOption, idx: number) => {
        setResolveError('');
        setCrashContext(player, {
            flow: 'life_event_choice',
            event_id: event.id,
            event_type: event.type,
            event_title: getLifeEventTitle() || 'missing_life_event',
            option_index: idx,
            option_label: getOptionLabel(option),
        });
        addBreadcrumb('life_event:choice_selected', {
            eventId: event.id,
            eventType: event.type,
            optionIndex: idx,
            golden: !!option.isGolden,
        });
        trackGameEvent('life_event_choice_selected', {
            ...buildLifeEventDiagnosticContext(event, lifeEvent, option, idx),
        });
        let impactResult: LifeEventImpactResult | undefined;
        let rewardReceipt: PendingRewardAdReceipt | undefined;
        
        if (option.isGolden) {
            setIsProcessingAd(true);
            try {
                const contextId = `${event.id}:${getLifeEventOptionIdentity(event, option, idx)}`;
                rewardReceipt = getRecoverableRewardedAdReceipt({
                    playerId: String(player.id || player.name),
                    saveSlot,
                    placement: 'LIFE_EVENT_OPTION',
                    contextId,
                }) || undefined;
                if (!rewardReceipt) {
                    const interrupted = readPendingRewardAd();
                    if (
                        interrupted
                        && interrupted.playerId === String(player.id || player.name)
                        && interrupted.saveSlot === saveSlot
                        && interrupted.placement === 'LIFE_EVENT_OPTION'
                        && interrupted.contextId === contextId
                        && interrupted.status === 'IN_PROGRESS'
                    ) {
                        clearPendingRewardAd(interrupted.id);
                    }
                    rewardReceipt = beginPendingRewardAd({
                        playerId: String(player.id || player.name),
                        saveSlot,
                        type: 'REWARDED_BAILOUT',
                        placement: 'LIFE_EVENT_OPTION',
                        contextId,
                        stepsRequired: 1,
                    });
                    const result = await requestRewardedAd({
                        type: 'REWARDED_BAILOUT',
                        placement: 'LIFE_EVENT_OPTION',
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
                        const advancedReceipt = getRewardReceiptFromPersistenceError(error);
                        if (!advancedReceipt) throw error;
                        rewardReceipt = advancedReceipt.completedSteps === advancedReceipt.stepsRequired
                            ? { ...advancedReceipt, status: 'READY_TO_GRANT', remainingStep: null }
                            : advancedReceipt;
                    }
                }
                impactResult = executeOptionImpact(option, idx, player, true);
            } catch (e) {
                console.error("Rewarded life-event choice failed", e);
                setResolveError(getRewardedAdError('ERROR'));
                return;
            } finally {
                setIsProcessingAd(false);
            }
        } else {
            try {
                impactResult = executeOptionImpact(option, idx, player, false);
            } catch {
                setResolveError(tr('life.modal.error.choiceFailed'));
                return;
            }
        }

        if (impactResult) presentImpactResult(option, idx, impactResult, rewardReceipt?.id);
    };

    const getTypeTheme = () => {
        switch (lifeEvent?.type) {
            case 'CRIME': return { color: 'red', icon: <ShieldAlert size={20} className="text-red-500" />, bgIcon: <ShieldAlert size={120} /> };
            case 'POLITICS': return { color: 'blue', icon: <Zap size={20} className="text-blue-500" />, bgIcon: <Zap size={120} /> };
            case 'LEGAL': return { color: 'amber', icon: <Scale size={20} className="text-amber-500" />, bgIcon: <Scale size={120} /> };
            case 'SCANDAL': return { color: 'rose', icon: <AlertTriangle size={20} className="text-rose-500" />, bgIcon: <AlertTriangle size={120} /> };
            default: return { color: 'emerald', icon: <User size={20} className="text-emerald-500" />, bgIcon: <User size={120} /> };
        }
    };

    const theme = getTypeTheme();
    const themeColor = theme.color;
    const accentGradient = themeColor === 'red' ? 'from-red-600 via-rose-500 to-orange-500' :
                         themeColor === 'blue' ? 'from-blue-600 via-indigo-500 to-cyan-500' :
                         themeColor === 'amber' ? 'from-amber-600 via-yellow-500 to-orange-500' :
                         themeColor === 'rose' ? 'from-rose-600 via-pink-500 to-purple-500' :
                         'from-emerald-600 via-teal-500 to-cyan-500';

    const getOutcomeCopy = (log: string) => {
        const lower = log.toLowerCase();
        if (feedback?.resolutionKind === 'SAFE_FALLBACK') {
            return {
                eyebrow: tr('life.modal.safeFallback.eyebrow'),
                title: tr('life.modal.safeFallback.title'),
                tone: tr('life.modal.safeFallback.tone'),
            };
        }
        if (feedback?.resolutionKind === 'LEGACY_UNRESOLVABLE') {
            return {
                eyebrow: tr('life.modal.legacy.unresolvable.eyebrow'),
                title: tr('life.modal.legacy.unresolvable.title'),
                tone: tr('life.modal.legacy.unresolvable.tone'),
            };
        }
        if (feedback?.wasGolden) {
            return {
                eyebrow: tr('life.modal.outcome.golden.eyebrow'),
                title: tr('life.modal.outcome.golden.title'),
                tone: tr('life.modal.outcome.golden.tone')
            };
        }
        if (lower.includes('legal') || lower.includes('case') || lower.includes('complaint') || lower.includes('backlash') || lower.includes('heat rose') || lower.includes('hit')) {
            return {
                eyebrow: tr('life.modal.outcome.fallout.eyebrow'),
                title: tr('life.modal.outcome.fallout.title'),
                tone: tr('life.modal.outcome.fallout.tone')
            };
        }
        if (lower.includes('won') || lower.includes('boost') || lower.includes('gained') || lower.includes('hit collab') || lower.includes('praised') || lower.includes('win')) {
            return {
                eyebrow: tr('life.modal.outcome.momentum.eyebrow'),
                title: tr('life.modal.outcome.momentum.title'),
                tone: tr('life.modal.outcome.momentum.tone')
            };
        }
        return {
            eyebrow: tr('life.modal.outcome.aftermath.eyebrow'),
            title: tr('life.modal.outcome.aftermath.title'),
            tone: tr('life.modal.outcome.aftermath.tone')
        };
    };

    const extractOutcomeSignals = (log: string) => {
        const matches = log.match(/(?:[+-]\s*)?\$?\d[\d,.]*(?:\.\d+)?\s*(?:K|M|B|T|views|subs|followers|cash|money|reputation|trust|heat)?/gi) || [];
        return matches
            .map(item => item.replace(/\s+/g, ' ').trim())
            .filter((item, index, arr) => item.length > 1 && arr.indexOf(item) === index)
            .slice(0, 4);
    };

    const getSignalClasses = (tone: EventImpactSignal['tone']) => {
        if (tone === 'positive') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
        if (tone === 'negative') return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
        return 'border-white/10 bg-white/5 text-zinc-200';
    };

    const handleFeedbackContinue = async () => {
        if (!feedback || isResolvingFeedback) return;
        setResolveError('');
        setIsResolvingFeedback(true);
        setCrashContext(feedback.updatedPlayer, {
            flow: 'life_event_continue',
            event_id: event.id,
            event_type: event.type,
            event_title: getLifeEventTitle() || 'missing_life_event',
        });
        addBreadcrumb('life_event:continue_pressed', {
            eventId: event.id,
            eventType: event.type,
            option: feedback.optionLabel,
        });
        trackGameEvent('life_event_continue_pressed', {
            event_type: event.type,
            golden: feedback.wasGolden,
        });
        try {
            await onChoice({
                updatedPlayer: feedback.updatedPlayer,
                log: feedback.log,
                optionId: feedback.optionId,
                impactId: feedback.impactId,
                resolutionSeed: feedback.resolutionSeed,
                resolutionKind: feedback.resolutionKind,
                rewardReceiptId: feedback.rewardReceiptId,
            });
            if (feedback.rewardReceiptId) {
                const receipt = readPendingRewardAd();
                if (receipt?.id === feedback.rewardReceiptId) {
                    try {
                        const verified = markPendingRewardAdVerifiedSave(receipt);
                        markPendingRewardAdGranted(verified);
                    } catch {
                        // The verified player grant marker remains the durable source of truth.
                    }
                    clearPendingRewardAd(feedback.rewardReceiptId);
                }
            }
        } catch (error) {
            console.error('LifeEvent continue failed:', error);
            recordNonFatal(error, 'life_event_continue_failed', {
                event_id: event.id,
                event_type: event.type,
                event_title: lifeEvent?.title || 'missing_life_event',
            });
            setIsResolvingFeedback(false);
            setResolveError(tr('life.modal.error.closeFailed'));
        }
    };

    if (!lifeEvent) {
        const handleDismissInvalidEvent = async () => {
            if (isResolvingFeedback) return;
            setResolveError('');
            setIsResolvingFeedback(true);
            setCrashContext(player, {
                flow: 'invalid_life_event_dismiss',
                event_id: event.id,
                event_type: event.type,
            });
            addBreadcrumb('life_event:invalid_dismiss', { eventId: event.id, eventType: event.type });
            trackGameEvent('legacy_event_unresolvable', {
                event_id: event.id,
                event_type: event.type,
                legacy_reason: 'MISSING_LIFE_EVENT_PAYLOAD',
                resolution_path: 'LEGACY_UNRESOLVABLE',
            });
            try {
                await onChoice({
                    updatedPlayer: player,
                    log: tr('life.modal.invalid.log'),
                    optionId: 'invalid_legacy_event',
                    resolutionKind: 'LEGACY_UNRESOLVABLE',
                });
            } catch (error) {
                console.error('Invalid life event dismiss failed:', error);
                recordNonFatal(error, 'invalid_life_event_dismiss_failed', {
                    event_id: event.id,
                    event_type: event.type,
                });
                setIsResolvingFeedback(false);
                setResolveError(tr('life.modal.error.skipFailed'));
            }
        };

        return (
            <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400 mb-2">{tr('life.modal.invalid.eyebrow')}</div>
                    <h3 className="text-2xl font-black text-white leading-tight mb-3">{tr('life.modal.invalid.title')}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                        {tr('life.modal.invalid.description')}
                    </p>
                    {resolveError && <div className="mb-3 text-xs font-bold text-amber-300">{resolveError}</div>}
                    <button
                        type="button"
                        onClick={handleDismissInvalidEvent}
                        disabled={isResolvingFeedback}
                        className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl disabled:opacity-60"
                    >
                        {isResolvingFeedback ? tr('life.modal.button.continuing') : tr('life.modal.button.continue')}
                    </button>
                </div>
            </div>
        );
    }

    if (feedback) {
        const outcomeCopy = getOutcomeCopy(feedback.rawLog);
        const structuredEffects = feedback.effects || [];
        const fallbackSignals = structuredEffects.length > 0 ? [] : extractOutcomeSignals(feedback.log);

        return (
            <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm max-h-[calc(100dvh-1.5rem)] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col"
                >
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accentGradient}`} />
                    <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/5 blur-3xl"></div>

                    <div className="overflow-y-auto custom-scrollbar p-5 pb-4 text-left">
                        <div className="flex items-start gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 shrink-0 shadow-lg`}>
                                <CheckCircle size={28} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className={`text-[10px] font-black uppercase tracking-[0.24em] text-${themeColor}-400 mb-1`}>
                                    {outcomeCopy.eyebrow}
                                </div>
                                <h3 className="text-2xl font-black text-white leading-tight">{outcomeCopy.title}</h3>
                                <div className="text-xs text-zinc-500 mt-1">{tr('life.modal.feedback.decision', { option: feedback.optionLabel.replace(` (${tr('common.watchAd')})`, '').replace(' (Watch Ad)', '') })}</div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 mb-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
                                <Newspaper size={13} /> {tr('life.modal.feedback.whatHappened')}
                            </div>
                            <p className="text-base font-bold text-white leading-relaxed">{feedback.log}</p>
                            <p className="text-sm text-zinc-400 leading-relaxed mt-3">{outcomeCopy.tone}</p>
                        </div>

                        {(structuredEffects.length > 0 || fallbackSignals.length > 0) && (
                            <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
                                    <Activity size={13} /> {tr('life.modal.feedback.visibleImpact')}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {structuredEffects.map(effect => (
                                        <span
                                            key={`${getSignalLabel(effect)}-${effect.value}`}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-black ${getSignalClasses(effect.tone)}`}
                                        >
                                            {getSignalLabel(effect)} {getSignalValue(effect)}
                                        </span>
                                    ))}
                                    {fallbackSignals.map(signal => (
                                        <span key={signal} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-200">
                                            {signal}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-white/10 bg-zinc-950/95 p-4 pb-safe">
                        {resolveError && (
                            <div className="mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
                                {resolveError}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleFeedbackContinue}
                            disabled={isResolvingFeedback}
                            className={`w-full py-4 bg-gradient-to-r ${accentGradient} text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60`}
                        >
                            {isResolvingFeedback ? tr('life.modal.button.continuing') : resolveError ? tr('life.modal.button.retryContinue') : tr('life.modal.button.continue')}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full max-w-md max-h-[calc(100dvh-1.5rem)] bg-[#0a0a0a] rounded-3xl overflow-hidden border border-${themeColor}-900/50 shadow-[0_0_50px_rgba(255,255,255,0.05)] relative flex flex-col`}
            >
                {isProcessingAd && (
                    <div className="absolute inset-0 z-[210] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">{tr('life.modal.goldenPreparing.title')}</h3>
                        <p className="text-zinc-400 text-sm">{tr('life.modal.goldenPreparing.description')}</p>
                    </div>
                )}

                {/* Top warning bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${accentGradient}`} />
                
                {/* Header */}
                <div className="p-5 pb-4 border-b border-white/5 relative overflow-hidden shrink-0">
                    <div className={`absolute -right-4 -top-4 text-${themeColor}-500/10`}>
                        {theme.bgIcon}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className={`w-10 h-10 rounded-full bg-${themeColor}-500/20 flex items-center justify-center border border-${themeColor}-500/30`}>
                            {theme.icon}
                        </div>
                        <div>
                            <div className={`text-[10px] font-mono text-${themeColor}-400 uppercase tracking-widest font-bold`}>
                                {tr('life.modal.eventType', { type: tr(`life.type.${lifeEvent.type}`) })}
                            </div>
                            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                                <User size={12} /> {tr('life.modal.lifeStory')}
                            </div>
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight relative z-10">
                        {getLifeEventTitle()}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-5 pt-4 overflow-y-auto custom-scrollbar">
                    <div className={`bg-${themeColor}-950/20 border border-${themeColor}-900/30 rounded-2xl p-4 mb-6 relative`}>
                        {/* Decorative quotes */}
                        <div className={`absolute -top-3 -left-2 text-4xl text-${themeColor}-500/20 font-serif`}>"</div>
                        <p className="text-sm text-zinc-300 leading-relaxed relative z-10">
                            {getLifeEventDescription()}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 px-2">
                            {tr('life.modal.selectAction')}
                        </div>
                        {lifeEvent.options.map((opt, idx) => (
                            <motion.button 
                                key={idx}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => !isProcessingAd && handleOptionClick(opt, idx)}
                                disabled={isProcessingAd}
                                className={`w-full p-4 ${opt.isGolden ? 'bg-amber-950/30 border-amber-500/50' : 'bg-zinc-900/80 border-white/5'} hover:bg-zinc-800 text-white rounded-2xl transition-all border hover:border-${themeColor}-500/50 flex flex-col items-start justify-center group relative overflow-hidden text-left`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r from-${themeColor}-500/0 via-${themeColor}-500/0 to-${themeColor}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                
                                <div className="flex items-center justify-between w-full relative z-10">
                                    <div className="flex items-center gap-3">
                                        {opt.isGolden && <PlayCircle size={18} className="text-amber-500 flex-shrink-0" />}
                                        <span className={`text-sm font-bold tracking-wide ${opt.isGolden ? 'text-amber-400' : ''}`}>{getOptionLabel(opt)}</span>
                                    </div>
                                    
                                    <div className={`w-8 h-8 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-${themeColor}-500/20 transition-colors flex-shrink-0 ml-2`}>
                                        <ChevronRight size={16} className={`text-zinc-500 group-hover:text-${themeColor}-400`} />
                                    </div>
                                </div>
                                {getOptionDescription(opt) && (
                                    <div className="mt-2 text-xs text-zinc-500 font-medium italic relative z-10 pr-10">
                                        {getOptionDescription(opt)}
                                    </div>
                                )}
                                {!!opt.previewEffects?.length && (
                                    <div className="mt-3 flex flex-wrap gap-1.5 relative z-10 pr-8">
                                        {opt.previewEffects.slice(0, 3).map(effect => (
                                            <span
                                                key={`${getSignalLabel(effect)}-${effect.value}`}
                                                className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getSignalClasses(effect.tone)}`}
                                            >
                                                {getSignalLabel(effect)} {getSignalValue(effect)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
