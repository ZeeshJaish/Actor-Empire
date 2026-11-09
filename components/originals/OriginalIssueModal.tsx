import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Film, Loader2, MapPin, PlayCircle, Sparkles, Wallet } from 'lucide-react';
import type { Player, ScheduledEvent } from '../../types';
import { showAd } from '../../services/adLogic';
import { noteAdClosed } from '../../services/forcedAds';
import { getOriginalsStudio } from '../../services/originalsStudios';
import { answerOriginalIssue, getOriginalIssueView, originalIssueEventData, type OriginalIssueChoice } from '../../services/originalsIssues';

/* #289: the production side's popup, for a studio making an Original. Three answers: pay, watch an ad, compromise. */

interface Props {
    player: Player;
    event: ScheduledEvent;
    onResolve: (player: Player, log: string) => void;
}

const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);
const KIND_ICON = { QUALITY: Sparkles, LOCATION: MapPin, BUDGET: Wallet };
const KIND_WORDS = { QUALITY: 'A quality problem', LOCATION: 'A location problem', BUDGET: 'A money problem' };

export const OriginalIssueModal: React.FC<Props> = ({ player, event, onResolve }) => {
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const data = originalIssueEventData(event);
    const view = data ? getOriginalIssueView(player, data) : null;
    /* the studio's card scans the catalogue once, as the popup opens */
    const studio = useMemo(() => (view ? getOriginalsStudio(player, view.studioId) : null), [view?.studioId]);

    if (!data || !view || !view.open) {
        return (
            <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div data-original-issue className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                    <h3 className="text-lg font-black text-white leading-tight mb-2">{event.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4">This has been dealt with.</p>
                    <button type="button" onClick={() => onResolve(player, `${event.title}: already answered.`)} className="w-full py-3 rounded-2xl bg-zinc-800 text-white text-sm font-bold">OK</button>
                </div>
            </div>
        );
    }

    const answer = (choice: OriginalIssueChoice) => {
        const result = answerOriginalIssue(player, data, choice);
        if (result.changed) onResolve(result.player, result.log);
        else setNotice(result.log);
    };
    const watchAd = async () => {
        if (busy) return;
        setBusy(true);
        setNotice(null);
        try {
            const result = await showAd('REWARDED_BAILOUT');
            if (result.success) answer('AD');
            else setNotice('The ad did not finish. Pick another answer.');
        } catch (error) {
            console.error('Ad failed:', error);
            setNotice('The ad did not finish. Pick another answer.');
        } finally {
            setBusy(false);
            // as the Store's rewarded ads do: the forced ads' minutes start again, so none lands right after this one
            noteAdClosed();
        }
    };

    const { issue } = view;
    const Icon = KIND_ICON[issue.kind];
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pt-[max(1rem,calc(env(safe-area-inset-top)+10px))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+10px))]">
            <motion.div
                data-original-issue={issue.kind}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md max-h-full min-h-0 flex flex-col bg-[#0a0a0a] rounded-3xl overflow-hidden border border-rose-900/50 shadow-[0_0_50px_rgba(225,29,72,0.25)]"
            >
                {busy && (
                    <div className="absolute inset-0 z-10 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <h3 className="text-white font-bold text-lg">Getting the ad ready</h3>
                    </div>
                )}
                <div className="h-2 w-full shrink-0 bg-gradient-to-r from-red-600 via-rose-500 to-orange-500" />
                <div className="relative overflow-hidden shrink-0 border-b border-white/5 p-5 pb-4">
                    <Icon aria-hidden="true" size={110} className="absolute -right-4 -top-4 text-rose-500/10" />
                    <div className="relative z-[1] mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white" style={{ background: studio?.color || '#7c3aed' }}>{studio?.mark || view.studioName.slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-400">{view.studioName} is asking</div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500"><Film size={12} className="shrink-0" /> <span className="truncate">{view.project}</span></div>
                        </div>
                    </div>
                    <h2 className="relative z-[1] text-2xl font-black leading-tight tracking-tight text-white">{view.title}</h2>
                </div>
                <div className="min-h-0 overflow-y-auto p-5 pt-4">
                    <div className="mb-4 rounded-2xl border border-rose-900/30 bg-rose-950/20 p-4">
                        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-rose-300/70">{KIND_WORDS[issue.kind]}</div>
                        <p className="text-sm leading-relaxed text-zinc-300">{view.line}</p>
                    </div>
                    {notice && <div className="mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">{notice}</div>}
                    <div className="space-y-2.5">
                        <motion.button type="button" data-issue-pay whileTap={{ scale: 0.98 }} disabled={!view.canPay} onClick={() => answer('PAY')} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-left disabled:opacity-50">
                            <span className="min-w-0">
                                <span className="block text-sm font-black text-white">{view.payLabel}</span>
                                <span className="block text-[11px] font-semibold text-zinc-500">{view.canPay ? 'From the platform, and nothing is lost' : `Only ${money(view.treasury)} in the treasury`}</span>
                            </span>
                            <span className="shrink-0 font-mono text-base font-black text-rose-300">{money(issue.amount)}</span>
                        </motion.button>
                        <motion.button type="button" data-issue-ad whileTap={{ scale: 0.98 }} onClick={watchAd} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-500/50 bg-amber-950/30 p-4 text-left">
                            <span className="flex min-w-0 items-center gap-3">
                                <PlayCircle size={20} className="shrink-0 text-amber-500" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-black text-amber-400">Watch an ad</span>
                                    <span className="block text-[11px] font-semibold text-amber-200/60">{view.payLabel}, and nothing to pay</span>
                                </span>
                            </span>
                            <ChevronRight size={16} className="shrink-0 text-amber-500" />
                        </motion.button>
                        <motion.button type="button" data-issue-compromise whileTap={{ scale: 0.98 }} onClick={() => answer('COMPROMISE')} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-left">
                            <span className="min-w-0">
                                <span className="block text-sm font-black text-white">{view.compromiseLabel}</span>
                                <span className="block text-[11px] font-semibold text-zinc-500">Saves the money, and the title is worse for it</span>
                            </span>
                            <span className="shrink-0 font-mono text-sm font-black text-rose-400">Quality −{issue.qualityRisk}</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
