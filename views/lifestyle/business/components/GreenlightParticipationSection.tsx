import React from 'react';

export interface GreenlightParticipationRow {
    key: string;
    talentId: string;
    role: string;
    name: string;
    upfrontFee: number;
    points: number;
    minimumPoints?: number;
}

interface Props {
    participants: GreenlightParticipationRow[];
    totalPoints: number;
    onPointsChange: (key: string, points: number) => void;
    formatMoney: (amount: number) => string;
}

export const GreenlightParticipationSection: React.FC<Props> = ({ participants, totalPoints, onPointsChange, formatMoney }) => {
    if (!participants.length) return null;
    return <section aria-label="Talent Participation" className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Talent Participation</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Optional backend is separate from the upfront fee. Points apply only to future positive studio-collected, title-attributed receipts.</p>
            </div>
            <span aria-live="polite" className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-300">{totalPoints} of 10</span>
        </div>
        <div className="mt-4 space-y-2">
            {participants.map(participant => <div key={participant.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-zinc-950/70 px-3 py-3">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-white">{participant.name}</div>
                    <div className="text-[10px] text-zinc-500">{participant.role} · Upfront {formatMoney(participant.upfrontFee)}</div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Decrease backend points for ${participant.name}`} disabled={participant.points <= (participant.minimumPoints || 0)} onClick={() => onPointsChange(participant.key, participant.points - 1)} className="h-9 w-9 rounded-lg border border-white/10 bg-zinc-900 text-white disabled:opacity-35">−</button>
                    <span className="min-w-9 text-center font-mono text-sm font-black text-emerald-300">{participant.points}%</span>
                    <button type="button" aria-label={`Increase backend points for ${participant.name}`} disabled={participant.points >= 3 || totalPoints >= 10 || participants.filter(row => row.talentId === participant.talentId).reduce((sum, row) => sum + row.points, 0) >= 3} onClick={() => onPointsChange(participant.key, participant.points + 1)} className="h-9 w-9 rounded-lg border border-white/10 bg-zinc-900 text-white disabled:opacity-35">+</button>
                </div>
            </div>)}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">0% is the default. These terms do not increase today’s production cash requirement.</p>
    </section>;
};
