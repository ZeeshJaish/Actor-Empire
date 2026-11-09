import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Loader2, PlayCircle } from 'lucide-react';
import type { Player, ScheduledEvent } from '../types';
import type { StreamingIncidentRepairOption, StreamingIncidentRepairPath } from '../services/streamingIncidentRepair';
import {
    answerStreamingIncidentEvent,
    getStreamingIncidentEventView,
    streamingIncidentEventData,
    type StreamingIncidentEventChoice,
} from '../services/streamingIncidentEvent';
import { showAd } from '../services/adLogic';

/* #75: a new incident on STATUS as the week's popup (Zeesh: "us popup ka use karke"), with STATUS's three
   answers and the popup's golden one: an ad, repaired now with no energy and no cash. */

interface Props {
    player: Player;
    event: ScheduledEvent;
    /** the answer taken (or the incident already settled): close the popup with this player */
    onResolve: (player: Player, log: string) => void;
    /** "Open STATUS": close the popup and open the page */
    onOpenStatus: () => void;
}

const money = (value: number) => (value >= 1e6 ? `$${String(+(value / 1e6).toFixed(1))}M` : `$${Math.round(value / 1e3)}K`);
const weeksWords = (weeks: number) => (weeks <= 0 ? 'this week' : `${weeks} week${weeks === 1 ? '' : 's'}`);
const REPAIR_TITLE: Record<StreamingIncidentRepairPath, string> = { ENERGY: 'Repair now', FIX: 'Fix', WAIT: 'Wait it out' };
const TAKEDOWN_TITLE: Record<StreamingIncidentRepairPath, string> = { ENERGY: 'Take it down now', FIX: 'File takedowns', WAIT: 'Let it run' };
const costLine = (option: StreamingIncidentRepairOption, takedown: boolean) => (
    option.path === 'ENERGY' ? `${option.energy}⚡ + ${money(option.cash)} · ${takedown ? 'down this week' : 'fixed this week'}`
        : option.path === 'FIX' ? `${money(option.cash)} · ${takedown ? 'down in' : 'repaired in'} ${weeksWords(option.weeks)}`
            : `Free · ${weeksWords(option.weeks)} ${takedown ? 'on pirate sites' : 'of damage'}`
);

export const StreamingIncidentEventModal: React.FC<Props> = ({ player, event, onResolve, onOpenStatus }) => {
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const data = streamingIncidentEventData(event);
    const view = data ? getStreamingIncidentEventView(player, data) : null;
    const incident = view?.incident;
    const takedown = Boolean(incident?.takedown);
    const major = Boolean(incident?.major);
    const accent = major ? 'rose' : 'amber';

    const answer = (choice: StreamingIncidentEventChoice) => {
        if (!data) return;
        const result = answerStreamingIncidentEvent(player, data, choice);
        if (result.changed) onResolve(result.player, result.message);
        else setNotice(result.message);
    };
    const watchAd = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const result = await showAd('REWARDED_BAILOUT');
            if (result.success) answer('AD');
            else setNotice('The ad did not finish. Pick another way to answer it.');
        } finally {
            setBusy(false);
        }
    };

    /* gone, or settled elsewhere: say so and close */
    if (!data || !view || !incident || !view.open) {
        return (
            <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+10px))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4">
                <div className="w-full max-w-md bg-[#0a0a0a] rounded-3xl border border-white/10 p-5 text-left">
                    <div className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500 mb-2">Incident</div>
                    <h2 className="text-lg font-black text-white leading-tight mb-2">{incident?.title || event.title}</h2>
                    <p className="text-sm text-zinc-400 mb-4">{incident ? incident.note : 'This incident is over.'}</p>
                    <button type="button" onClick={() => onResolve(player, `${event.title}: already answered.`)}
                        className="w-full py-3 rounded-2xl bg-zinc-800 text-white text-sm font-bold">OK</button>
                </div>
            </div>
        );
    }

    const options = incident.repairs || [];
    const energyOption = options.find(option => option.path === 'ENERGY');
    return (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 pt-[max(0.75rem,calc(env(safe-area-inset-top)+10px))] pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`w-full max-w-md max-h-full bg-[#0a0a0a] rounded-3xl overflow-hidden border border-${accent}-900/50 shadow-[0_0_50px_rgba(255,255,255,0.05)] relative flex flex-col`}
            >
                {busy && (
                    <div className="absolute inset-0 z-[210] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">Getting your ad ready</h3>
                        <p className="text-zinc-400 text-sm">Watch it to the end and the incident is fixed this week.</p>
                    </div>
                )}
                <div className={`h-2 w-full bg-gradient-to-r ${major ? 'from-rose-600 to-red-500' : 'from-amber-500 to-orange-500'}`} />

                <div className="p-5 pb-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full bg-${accent}-500/20 flex items-center justify-center border border-${accent}-500/30 flex-shrink-0`}>
                            <AlertTriangle size={18} className={`text-${accent}-400`} />
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[10px] font-mono text-${accent}-400 uppercase tracking-widest font-bold`}>{view.service} · Incident</div>
                            <div className="text-xs text-zinc-500 font-medium">
                                {incident.major ? 'Major' : 'Minor'} {incident.kind.toLowerCase()}{incident.where ? ` · ${incident.where}` : ''}
                            </div>
                        </div>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight leading-tight">{incident.title}</h2>
                </div>

                <div className="p-5 pt-4 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-zinc-300 leading-relaxed mb-3">{incident.note}</p>
                    {incident.damage.length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mr-1 self-center">Each week</span>
                            {incident.damage.map(line => (
                                <span key={line} className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black text-rose-200">{line}</span>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 px-2">How do you answer it?</div>
                        {energyOption && (
                            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => void watchAd()} disabled={busy}
                                className="w-full p-4 bg-amber-950/30 border border-amber-500/50 hover:bg-zinc-800 text-white rounded-2xl transition-all flex items-center justify-between gap-3 text-left">
                                <span className="flex items-center gap-3 min-w-0">
                                    <PlayCircle size={18} className="text-amber-500 flex-shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-bold tracking-wide text-amber-400">Watch an ad · {takedown ? 'take it down' : 'repair'} free</span>
                                        <span className="block mt-1 text-xs text-zinc-400">{takedown ? 'Down this week' : 'Fixed this week'} · no energy, no cash</span>
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-zinc-500 flex-shrink-0" />
                            </motion.button>
                        )}
                        {options.map(option => (
                            <motion.button key={option.path} type="button" whileTap={option.available ? { scale: 0.98 } : undefined}
                                onClick={() => option.available && answer(option.path)} disabled={busy || !option.available}
                                className={`w-full p-4 bg-zinc-900/80 border border-white/5 text-white rounded-2xl transition-all flex items-center justify-between gap-3 text-left ${option.available ? 'hover:bg-zinc-800' : 'opacity-50'}`}>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold tracking-wide">{(takedown ? TAKEDOWN_TITLE : REPAIR_TITLE)[option.path]}</span>
                                    <span className="block mt-1 text-xs text-zinc-400">{option.available ? costLine(option, takedown) : option.refusal}</span>
                                </span>
                                <ChevronRight size={16} className="text-zinc-500 flex-shrink-0" />
                            </motion.button>
                        ))}
                    </div>
                    {notice && <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">{notice}</p>}
                    <button type="button" onClick={onOpenStatus} className="mt-4 w-full py-2 text-xs font-bold tracking-wide text-zinc-400 hover:text-white">
                        Open STATUS ›
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default StreamingIncidentEventModal;
