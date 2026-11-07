import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Crown } from 'lucide-react';
import type { Player, ScheduledEvent } from '../types';
import {
    answerStreamingDecisionEvent,
    getStreamingDecisionView,
    streamingDecisionEventData,
    type StreamingDecisionRoom,
} from '../services/streamingDecisionEvent';

/* #210: a decision that needs you, as the week's popup, built like #75's incident popup: answer it here, or open the page.
   A popup whose decision has gone closes itself. */

interface Props {
    player: Player;
    event: ScheduledEvent;
    /** the answer taken (or the decision gone): close the popup with this player */
    onResolve: (player: Player, log: string) => void;
    /** close the popup and open the page */
    onOpenRoom: (room: StreamingDecisionRoom) => void;
}

const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(2))}M` : `$${Math.round(value / 1e3)}K`);

export const StreamingDecisionEventModal: React.FC<Props> = ({ player, event, onResolve, onOpenRoom }) => {
    const data = streamingDecisionEventData(event);
    const view = data ? getStreamingDecisionView(player, data) : null;
    const [notice, setNotice] = useState<string | null>(null);
    const [figuring, setFiguring] = useState(false);
    const [weekly, setWeekly] = useState(view?.figure?.asked ?? 0);

    useEffect(() => {
        if (!view) onResolve(player, `${event.title}: already settled.`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Boolean(view)]);
    if (!data || !view) return null;

    const answer = (answerId: string, figure?: number) => {
        const result = answerStreamingDecisionEvent(player, data, answerId, figure);
        if (result.changed) onResolve(result.player, `${view.title}: ${result.message}`);
        else setNotice(result.message);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full max-w-md max-h-[calc(100dvh-1.5rem)] bg-[#0a0a0a] rounded-3xl overflow-hidden border ${view.urgent ? 'border-rose-900/50' : 'border-amber-900/50'} flex flex-col relative`}
            >
                <div className={`h-2 w-full shrink-0 bg-gradient-to-r ${view.urgent ? 'from-rose-600 to-red-500' : 'from-amber-500 to-orange-500'}`} />
                <div className="p-5 pb-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${view.urgent ? 'bg-rose-500/20 border-rose-500/30' : 'bg-amber-500/20 border-amber-500/30'}`}>
                            <Crown size={18} className={view.urgent ? 'text-rose-400' : 'text-amber-400'} />
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[10px] font-mono uppercase tracking-widest font-bold ${view.urgent ? 'text-rose-400' : 'text-amber-400'}`}>{view.service}</div>
                            <div className="text-xs text-zinc-500 font-medium">{view.kicker}</div>
                        </div>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight leading-tight">{view.title}</h2>
                </div>

                <div className="p-5 pt-4 overflow-y-auto custom-scrollbar">
                    {view.detail && <p className="text-sm text-zinc-300 leading-relaxed mb-2">{view.detail}</p>}
                    {view.reason && <p className="text-xs text-zinc-500 leading-relaxed mb-4">{view.reason}</p>}

                    {figuring && view.figure ? (
                        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
                                <button type="button" aria-label="Five thousand less" disabled={weekly <= view.figure.current} onClick={() => setWeekly(Math.max(view.figure!.current, weekly - 5_000))} className="h-11 rounded-xl border border-white/10 bg-white/10 text-xl font-black text-white disabled:opacity-40">−</button>
                                <div className="min-w-0 text-center">
                                    <div className="text-2xl font-black leading-none text-amber-300">{money(weekly)}</div>
                                    <div className="mt-1 text-[11px] leading-tight text-zinc-500">a week · they asked {money(view.figure.asked)}</div>
                                </div>
                                <button type="button" aria-label="Five thousand more" onClick={() => setWeekly(weekly + 5_000)} className="h-11 rounded-xl border border-white/10 bg-white/10 text-xl font-black text-white">+</button>
                            </div>
                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                                <button type="button" onClick={() => answer(view.figure!.answerId, weekly)} className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black">{view.figure.verb} {money(weekly)}</button>
                                <button type="button" onClick={() => setFiguring(false)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300">Back</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {view.answers.map(item => (
                                <motion.button
                                    key={item.id}
                                    type="button"
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => (item.id === 'OPEN_DOOR' ? onOpenRoom(view.door.room) : view.figure?.answerId === item.id ? setFiguring(true) : answer(item.id))}
                                    className={`w-full p-4 border rounded-2xl flex items-center justify-between gap-3 text-left text-white ${item.primary ? 'bg-amber-950/30 border-amber-500/50' : 'bg-zinc-900/80 border-white/5'}`}
                                >
                                    <span className="min-w-0">
                                        <span className={`block text-sm font-bold tracking-wide ${item.primary ? 'text-amber-300' : ''}`}>{item.label}</span>
                                        {item.line && <span className="block mt-1 text-xs text-zinc-400">{item.line}</span>}
                                    </span>
                                    <ChevronRight size={16} className="text-zinc-500 flex-shrink-0" />
                                </motion.button>
                            ))}
                        </div>
                    )}
                    {notice && <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">{notice}</p>}
                    {view.door.label && <button type="button" onClick={() => onOpenRoom(view.door.room)} className="mt-4 w-full py-2 text-xs font-bold tracking-wide text-zinc-400 hover:text-white">
                        {view.door.label}
                    </button>}
                </div>
            </motion.div>
        </div>
    );
};

export default StreamingDecisionEventModal;
