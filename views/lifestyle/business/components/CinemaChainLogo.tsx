import React from 'react';
import type { CinemaChain } from '../../../../types';

interface CinemaChainLogoProps {
    chain: Pick<CinemaChain, 'id' | 'name' | 'brandColor'>;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
};

export const CinemaChainLogo: React.FC<CinemaChainLogoProps> = ({ chain, size = 'md' }) => {
    const color = chain.brandColor;
    const glowId = `cinemaLogoGlow-${chain.id}`;
    const plateId = `cinemaLogoPlate-${chain.id}`;
    const common = {
        fill: 'none',
        stroke: color,
        strokeWidth: 2.45,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const
    };

    const mark = (() => {
        switch (chain.id) {
            case 'EMPIRE_CINEMAS':
                return (
                    <>
                        <path d="M10 29h20v2.5H10z" fill={color} opacity="0.92" />
                        <path {...common} d="M12.5 28.5V17.8L20 11l7.5 6.8v10.7" />
                        <path d="M15.5 19.8h9v2.6h-9z" fill={color} opacity="0.78" />
                        <path d="M17.5 28.7v-5.2h5v5.2" fill="#050505" stroke={color} strokeWidth="1.8" />
                        <path d="M15.8 14.3 20 8.2l4.2 6.1-4.2-1.4z" fill={color} opacity="0.92" />
                    </>
                );
            case 'Z_CINEMAS':
                return (
                    <>
                        <path d="M12 9.5h18L19.5 20H29L12.5 32.5l6.4-10.4H10z" fill={color} opacity="0.16" />
                        <path {...common} d="M12 10h18L18 21h11L12 32l7-11H10z" />
                        <path {...common} d="M25.5 8.2 22 15.2" opacity="0.65" />
                        <path {...common} d="M17.5 25.2 14 32.2" opacity="0.65" />
                    </>
                );
            case 'NOVA_CIRCUIT':
                return (
                    <>
                        <circle {...common} cx="20" cy="20" r="9.7" />
                        <ellipse {...common} cx="20" cy="20" rx="13.4" ry="5.2" transform="rotate(-18 20 20)" opacity="0.72" />
                        <ellipse {...common} cx="20" cy="20" rx="13.4" ry="5.2" transform="rotate(18 20 20)" opacity="0.42" />
                        <circle cx="20" cy="20" r="3.2" fill={color} opacity="0.95" />
                        <circle cx="28.8" cy="14.3" r="1.6" fill={color} opacity="0.88" />
                    </>
                );
            case 'PRISM_HALLS':
                return (
                    <>
                        <path d="M20 7.3 32.5 17 20 32.7 7.5 17z" fill={color} opacity="0.14" />
                        <path {...common} d="M20 7.3 32.5 17 20 32.7 7.5 17z" />
                        <path {...common} d="M20 7.3v25.4M7.5 17h25" opacity="0.78" />
                        <path d="M20 7.3 25.3 17 20 32.7 14.7 17z" fill={color} opacity="0.18" />
                        <path {...common} d="M13.5 12.1 26.5 27.9" opacity="0.42" />
                    </>
                );
            case 'ARCLIGHT_GRID':
                return (
                    <>
                        <path d="M8.5 28a11.5 11.5 0 0 1 23 0h-4.2a7.3 7.3 0 0 0-14.6 0z" fill={color} opacity="0.2" />
                        <path {...common} d="M8.5 28a11.5 11.5 0 0 1 23 0" />
                        <path {...common} d="M13 28a7 7 0 0 1 14 0" />
                        <path {...common} d="M20 16.2v11.8" />
                        <path {...common} d="M10.5 31h19" />
                        <path {...common} d="M11 24h18" opacity="0.5" />
                    </>
                );
            case 'CROWNSCREEN':
                return (
                    <>
                        <path d="M9.5 27.7h21l-2.1-12.9-5.4 5.1-3-8.8-3 8.8-5.4-5.1z" fill={color} opacity="0.16" />
                        <path {...common} d="M9.5 27.7h21l-2.1-12.9-5.4 5.1-3-8.8-3 8.8-5.4-5.1z" />
                        <path {...common} d="M13 31h14" />
                        <path {...common} d="M14 14.5l-3-4M26 14.5l3-4" opacity="0.68" />
                        <path d="M15 23.3h10v2.3H15z" fill={color} opacity="0.72" />
                    </>
                );
            default:
                return <circle {...common} cx="20" cy="20" r="11" />;
        }
    })();

    return (
        <div
            className={`cinema-chain-logo ${sizeClass[size]} shrink-0 rounded-2xl border border-white/10 bg-black/70 shadow-inner shadow-white/5 flex items-center justify-center overflow-hidden`}
            style={{ boxShadow: `0 0 22px ${color}26, inset 0 0 18px ${color}10` }}
            aria-label={`${chain.name} logo`}
            title={chain.name}
        >
            <svg viewBox="0 0 40 40" className="h-full w-full" role="img" aria-hidden="true">
                <defs>
                    <radialGradient id={plateId} cx="50%" cy="38%" r="64%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="55%" stopColor={color} stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#050505" stopOpacity="0.82" />
                    </radialGradient>
                    <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill={`url(#${plateId})`} />
                <g filter={`url(#${glowId})`}>
                {mark}
                </g>
            </svg>
        </div>
    );
};
