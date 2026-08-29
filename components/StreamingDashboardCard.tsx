/**
 * EMPIRE+ ON THE MAIN DASHBOARD
 *
 * The streaming company used to have no presence at all on the Home screen —
 * it lived behind Lifestyle → Streaming Platform, four taps from where the
 * player actually spends the game. That is how somebody ends up broke inside a
 * company they never see: the money problem was real, but it was only ever
 * visible on the screen you had to already be worried to open.
 *
 * This is the front door. It answers three things and stops: what the company
 * is, how it is doing, and whether something needs dealing with.
 *
 * It is written in the HOME screen's own visual language (Tailwind, glass-card,
 * zinc/amber), not the EMPIRE+ design system, because it belongs to this
 * surface — a token-styled card would read as a foreign object here.
 */
import React from 'react';
import { ChevronRight, CircleDollarSign, Radio, TrendingDown, TrendingUp } from 'lucide-react';
import type { StreamingDashboardCard as CardModel } from '../services/streamingHq';

const money = (n: number) => {
    const v = Math.abs(n);
    const s = v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B`
        : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M`
            : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`;
    return n < 0 ? `−${s}` : s;
};

const people = (n: number) => (
    n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`
);

const TONE = {
    calm: {
        ring: 'border-white/10',
        accent: 'text-sky-300',
        chipBg: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
    },
    watch: {
        ring: 'border-amber-300/25',
        accent: 'text-amber-300',
        chipBg: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
    },
    urgent: {
        ring: 'border-rose-400/30',
        accent: 'text-rose-300',
        chipBg: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    },
} as const;

export const StreamingDashboardCard: React.FC<{
    card: CardModel;
    onOpen: () => void;
    onOpenFinance?: () => void;
}> = ({ card, onOpen, onOpenFinance }) => {
    if (!card.owned) return null;
    const tone = TONE[card.tone];
    const growing = card.subscriberDelta >= 0;

    return (
        <article className={`glass-card w-full rounded-3xl border p-5 text-left ${tone.ring}`}>
          <button
              type="button"
              onClick={onOpen}
              aria-label={`${card.platformName}. ${card.headline ?? 'No action needed.'} ${card.actionLabel}.`}
              className="block w-full text-left transition-transform active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <Radio size={12} className={tone.accent} /> Streaming Platform
                </h3>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${tone.chipBg}`}>
                    {card.statusLabel}
                </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-lg font-black uppercase tracking-tight text-white">
                        {card.platformName}
                    </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-600" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Treasury</div>
                    <div className={`mt-1 font-mono text-lg font-black ${card.treasuryCash > 0 ? 'text-white' : 'text-rose-300'}`}>
                        {money(card.treasuryCash)}
                    </div>
                    {card.runwayWeeks !== null && (
                        <div className="mt-0.5 text-[10px] font-semibold text-zinc-500">
                            {card.runwayWeeks}w runway
                        </div>
                    )}
                </div>

                <div>
                    {/* Before launch a subscriber count would be a zero pretending to be
                        a measurement, so the pre-launch face shows real progress instead. */}
                    {card.live ? (
                        <>
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Subscribers</div>
                            <div className="mt-1 font-mono text-lg font-black text-white">{people(card.subscribers)}</div>
                            <div className={`mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${growing ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {growing ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {growing ? '+' : '−'}{people(Math.abs(card.subscriberDelta))} this week
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Opening night</div>
                            <div className="mt-1 font-mono text-lg font-black text-white">
                                {card.readiness ? `${card.readiness.done}/${card.readiness.total}` : '—'}
                            </div>
                            <div className="mt-0.5 text-[10px] font-semibold text-zinc-500">gates cleared</div>
                        </>
                    )}
                </div>
            </div>

            {card.headline && (
                <div className={`mt-4 rounded-2xl border px-3 py-2.5 text-[11px] font-bold leading-relaxed ${tone.chipBg}`}>
                    {card.headline}
                </div>
            )}
          </button>
          {onOpenFinance && (
              <button
                  type="button"
                  onClick={onOpenFinance}
                  className="mt-4 flex min-h-11 w-full items-center gap-2 border-t border-white/10 pt-3 text-[10px] font-black uppercase tracking-widest text-zinc-300"
              >
                  <CircleDollarSign size={15} className={tone.accent} />
                  Studio Finance
                  <span className="ml-auto font-mono text-[11px] text-white">{money(card.treasuryCash)}</span>
                  <ChevronRight size={15} className="text-zinc-600" />
              </button>
          )}
        </article>
    );
};
