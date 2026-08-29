import React from 'react';
import type { PlatformAiPlayerCommissionOffer } from '../types';
import {
    getStreamingPlatformBrandCssVars,
    resolveStreamingPlatformBrandById,
} from '../services/streamingPlatformBrandRegistry';
import StreamingPlatformBrand from './StreamingPlatformBrand';

type BriefOffer = Pick<
    PlatformAiPlayerCommissionOffer,
    | 'title'
    | 'platformId'
    | 'platformName'
    | 'genre'
    | 'projectType'
    | 'productionBudget'
    | 'producerFee'
    | 'minimumImdbRating'
    | 'deliveryAllowanceWeeks'
>;

interface PlatformCommissionBriefCardProps {
    offer: BriefOffer;
    expired: boolean;
    processing: boolean;
    onAccept: () => void;
    onPass: () => void;
    formatMoney: (amount: number) => string;
}

const sentenceCase = (value: string): string => (
    value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, letter => letter.toUpperCase())
);

export default function PlatformCommissionBriefCard({
    offer,
    expired,
    processing,
    onAccept,
    onPass,
    formatMoney,
}: PlatformCommissionBriefCardProps) {
    const disabled = expired || processing;
    const brand = resolveStreamingPlatformBrandById(offer.platformId, offer.platformName);
    const cardStyle = {
        ...getStreamingPlatformBrandCssVars(brand),
        '--commission-accent': brand.primaryColor,
        '--commission-secondary': brand.secondaryColor,
        '--commission-accent-foreground': brand.onPrimaryColor,
        '--commission-card-surface': brand.surfaceColor,
        backgroundColor: 'var(--commission-card-surface)',
        backgroundImage: [
            'radial-gradient(circle at 16% 9%, rgba(255,255,255,0.035), transparent 28%)',
            'repeating-linear-gradient(0deg, transparent 0, transparent 4px, rgba(255,255,255,0.008) 5px)',
        ].join(', '),
    } as React.CSSProperties;

    return (
        <article
            aria-label={`Commission order from ${offer.platformName} for ${offer.title}`}
            style={cardStyle}
            className="mb-4 overflow-hidden rounded-[1.1rem] border border-black/25 bg-[#18181a] text-[#f1eee7] shadow-xl"
        >
            <div
                aria-hidden="true"
                className="relative h-2.5 border-b border-black/70"
                style={{
                    backgroundImage: 'repeating-linear-gradient(135deg, #e6e1d8 0, #e6e1d8 18px, #232326 18px, #232326 36px)',
                }}
            >
                <span className="absolute inset-y-0 right-0 w-[22%] bg-[var(--commission-accent)] opacity-90" />
            </div>

            <header className="flex min-h-[2.75rem] items-center justify-between gap-4 border-b border-[#aaa397]/25 px-4 py-2">
                <StreamingPlatformBrand brand={brand} variant="LOCKUP" size="SM" />
                <p className="shrink-0 text-[10px] font-semibold text-[#aaa397]">Commission order</p>
            </header>

            <div className="px-4 pb-3.5 pt-4">
                <h3
                    className="max-w-[19rem] text-[clamp(1.55rem,6.9vw,1.95rem)] font-bold leading-none tracking-[-0.015em] text-[#f5f1e9]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    {offer.title}
                </h3>
                <p className="mt-1.5 text-[10px] font-semibold leading-snug text-[#a9a39a]">
                    {sentenceCase(offer.genre)} {offer.projectType.toLowerCase()}{' '}
                    <span aria-hidden="true" className="mx-2 text-[var(--commission-accent)]">·</span>
                    {' '}Commissioned production
                </p>

                <section aria-label="Producer fee" className="mt-4 border-b border-t border-[#aaa397]/25 py-3">
                    <p className="text-[10px] font-bold text-[#bbb4a9]">Producer fee</p>
                    <p className="mt-0.5 font-mono text-[2.25rem] font-black leading-none tracking-[-0.07em] text-[var(--commission-accent)]">
                        {formatMoney(offer.producerFee)}
                    </p>
                </section>

                <dl className="divide-y divide-[#aaa397]/20 border-b border-[#aaa397]/25">
                    <div className="flex items-center justify-between gap-5 py-3">
                        <dt className="text-[10px] font-semibold text-[#9f9990]">Production cap</dt>
                        <dd className="font-mono text-[13px] font-black text-[#eeeae2]">{formatMoney(offer.productionBudget)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-5 py-3">
                        <dt className="text-[10px] font-semibold text-[#9f9990]">Minimum rating</dt>
                        <dd className="font-mono text-[13px] font-black text-[#eeeae2]">{offer.minimumImdbRating.toFixed(1)} IMDb</dd>
                    </div>
                    <div className="flex items-center justify-between gap-5 py-3">
                        <dt className="text-[10px] font-semibold text-[#9f9990]">Delivery</dt>
                        <dd className="font-mono text-[13px] font-black text-[#eeeae2]">{offer.deliveryAllowanceWeeks}+ weeks</dd>
                    </div>
                </dl>

                <section aria-label="Payment schedule" className="pt-3">
                    <div className="relative mx-1 h-2.5" aria-hidden="true">
                        <span className="absolute left-1 right-1 top-1/2 h-px -translate-y-1/2 bg-[#aaa397]/35" />
                        <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#18181a] bg-[var(--commission-accent)]" />
                        <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#18181a] bg-[var(--commission-accent)]" />
                    </div>
                    <div className="mt-1 flex items-start justify-between gap-4 text-[10px] font-bold text-[#f2eee6]">
                        <span>25% at greenlight</span>
                        <span className="text-right">75% on delivery</span>
                    </div>
                </section>

                <p className="mt-3 border-l-2 border-[var(--commission-accent)] pl-2.5 text-[10px] font-medium italic leading-snug text-[#9f9990]">
                    The production cap funds the film. It is not studio income.
                </p>
            </div>

            <footer className="flex items-center gap-4 border-t border-[#aaa397]/25 bg-black/15 px-4 py-3.5">
                <button
                    type="button"
                    onClick={onAccept}
                    disabled={disabled}
                    className="min-h-10 flex-1 rounded-[0.5rem] bg-[var(--commission-accent)] px-3 py-2.5 text-[11px] font-black text-[var(--commission-accent-foreground)] shadow-[0_3px_0_rgba(0,0,0,0.28)] transition-[transform,filter,box-shadow] hover:brightness-110 active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--commission-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181a] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {expired ? 'Expired' : 'Accept commission'}
                </button>
                <button
                    type="button"
                    onClick={onPass}
                    disabled={disabled}
                    className="min-h-10 shrink-0 px-1 text-[11px] font-bold text-[#b8b1a8] underline decoration-[#777169] decoration-1 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--commission-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    Pass
                </button>
            </footer>
        </article>
    );
}
