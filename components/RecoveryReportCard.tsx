import React, { useEffect, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import type { RecoveryReportHandle } from '../services/recoveryReports';

type Delivery = ReturnType<RecoveryReportHandle['delivery']>;

/* 2026-11-17 (Zeesh): every recovery popup (a week that was not applied, a save that failed its safety check, Recovery
   Mode) says sorry and sends a report in one tap. The report is the one Settings › Report a problem sends: the week
   trace, the device and the save's facts (services/recoveryReports.ts). Offline, it waits on the phone and goes at
   the next start-up. It never changes or saves the career. */
export const RecoveryReportCard: React.FC<{
    /** Sends the report, or returns null if it could not be made. */
    onSend: () => RecoveryReportHandle | null;
}> = ({ onSend }) => {
    const [report, setReport] = useState<RecoveryReportHandle | null>(null);
    const [failed, setFailed] = useState(false);
    const [delivery, setDelivery] = useState<Delivery>(null);
    const [waitedLong, setWaitedLong] = useState(false);
    useEffect(() => {
        if (!report) return;
        setDelivery(report.delivery());
        const timer = window.setTimeout(() => setWaitedLong(true), 4000);
        const stop = report.onChange(setDelivery);
        return () => { window.clearTimeout(timer); stop(); };
    }, [report]);
    const send = () => {
        if (report) return;
        try {
            const sent = onSend();
            setFailed(!sent);
            setReport(sent);
        } catch {
            setFailed(true);
        }
    };
    const sent = delivery === 'sent';
    const label = !report
        ? (failed ? 'Try Sending Again' : 'Send Report')
        : sent ? 'Report Sent · Thank You' : waitedLong ? 'Saved · Sends When Online' : 'Sending…';
    return (
        <div data-recovery-report className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4">
            <p className="text-sm font-black leading-snug text-white">Really sorry for the bad experience you're having.</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">Please send us a report so we can fix it as soon as possible.</p>
            <button
                type="button"
                onClick={send}
                disabled={!!report}
                aria-live="polite"
                className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${sent
                    ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                    : report
                        ? 'border-white/10 bg-white/[0.04] text-zinc-300'
                        : 'border-rose-200/30 bg-rose-300/15 text-rose-100 hover:bg-rose-300/25'}`}
            >
                {sent ? <CheckCircle2 size={15} /> : <Send size={15} />}
                {label}
            </button>
        </div>
    );
};
