import React from 'react';
import { Award, Gauge, Sparkles, TrendingUp, Users } from 'lucide-react';
import { PastProject, Player } from '../types';
import { getRolePerformanceBreakdown } from '../services/rolePerformanceBreakdown';

interface RolePerformanceReportProps {
    player: Player;
    project: PastProject;
    compact?: boolean;
}

const TONE_STYLES = {
    BREAKOUT: 'text-fuchsia-200 border-fuchsia-300/25 bg-fuchsia-300/[0.07]',
    STRONG: 'text-emerald-200 border-emerald-300/25 bg-emerald-300/[0.07]',
    SOLID: 'text-sky-200 border-sky-300/25 bg-sky-300/[0.07]',
    MIXED: 'text-amber-200 border-amber-300/25 bg-amber-300/[0.07]',
    MISCAST: 'text-rose-200 border-rose-300/25 bg-rose-300/[0.07]',
} as const;

const Metric = ({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
}) => (
    <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.13em] text-zinc-500">
            <span className="flex min-w-0 items-center gap-1.5"><Icon size={11} /> <span className="truncate">{label}</span></span>
            <span className="font-mono text-zinc-200">{value}</span>
        </div>
        <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-white/5"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
        >
            <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-300"
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

export const RolePerformanceReport: React.FC<RolePerformanceReportProps> = ({
    player,
    project,
    compact = false,
}) => {
    const report = getRolePerformanceBreakdown(player, project);
    if (!report) return null;

    if (compact) {
        return (
            <section className="border-t border-white/10 pt-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                            <Award size={12} /> Latest role read
                        </div>
                        <div className="mt-1 truncate text-sm font-black text-white">
                            {report.roleLabel} · {project.name}
                        </div>
                        <div className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">{report.verdict}</div>
                    </div>
                    <div className="shrink-0 text-right">
                        <div className="font-mono text-xl font-black text-white">{report.performance}</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">performance</div>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3 text-[9px] font-black uppercase tracking-[0.12em]">
                    <span className="text-violet-200">{report.mastery} mastery</span>
                    <span className={report.typecastingPressure >= 78 ? 'text-amber-300' : 'text-zinc-500'}>
                        {report.typecastingLabel}
                    </span>
                </div>
            </section>
        );
    }

    return (
        <section className={`overflow-hidden rounded-[1.5rem] border ${TONE_STYLES[report.tone]}`}>
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.14),transparent_42%)] p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">
                            <Sparkles size={12} /> Your performance
                        </div>
                        <h3 className="mt-1 text-xl font-black leading-tight text-white">
                            {report.roleLabel} <span className="text-zinc-600">·</span> {report.characterLabel}
                        </h3>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{report.verdict}</p>
                    </div>
                    <div className="shrink-0 text-right">
                        <div className="font-mono text-3xl font-black leading-none text-white">{report.performance}</div>
                        <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-zinc-500">{report.tone}</div>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
                    <Metric label="Role fit" value={report.roleFit} icon={Gauge} />
                    <Metric label="Presence" value={report.screenPresence} icon={TrendingUp} />
                    <Metric label="Chemistry" value={report.chemistry} icon={Users} />
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Role mastery</div>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="font-mono text-2xl font-black text-violet-200">{report.mastery}</span>
                            <span className="text-[10px] font-black text-emerald-300">+{report.masteryGain} this credit</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Industry pattern</div>
                        <div className={`mt-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                            report.typecastingPressure >= 78 ? 'text-amber-300' : 'text-zinc-300'
                        }`}>
                            {report.typecastingLabel}
                        </div>
                    </div>
                </div>

                <div className="mt-4 border-l-2 border-violet-300/60 pl-3 text-xs font-semibold leading-relaxed text-zinc-400">
                    {report.careerEffect}
                </div>
            </div>
        </section>
    );
};
