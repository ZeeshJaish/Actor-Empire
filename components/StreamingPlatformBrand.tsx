import React from 'react';
import type { StreamingPlatformBrandPresentation, StreamingTypefaceId } from '../types';
import { getStreamingPlatformBrandCssVars } from '../services/streamingPlatformBrandRegistry';
import { StreamingBrandMarkGlyph } from './streaming-brand/StreamingBrandMarkPrimitives';
import '../styles/streaming-platform-brand.css';

type StreamingPlatformBrandVariant = 'MARK' | 'WORDMARK' | 'LOCKUP';
type StreamingPlatformBrandSize = 'XS' | 'SM' | 'MD';

interface StreamingPlatformBrandProps {
    brand: StreamingPlatformBrandPresentation;
    variant?: StreamingPlatformBrandVariant;
    size?: StreamingPlatformBrandSize;
    className?: string;
    decorative?: boolean;
}

const TYPEFACE_STYLE: Record<StreamingTypefaceId, React.CSSProperties> = {
    GROTESK: { fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 900, letterSpacing: '-0.025em' },
    GEOMETRIC: { fontFamily: "Futura, 'Century Gothic', 'Avenir Next', system-ui, sans-serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
    SERIF: { fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, letterSpacing: '-0.015em' },
    CONDENSED: { fontFamily: "'Arial Narrow', Haettenschweiler, Impact, sans-serif", fontWeight: 900, letterSpacing: '0.015em' },
    MONO: { fontFamily: "ui-monospace, Menlo, 'Courier New', monospace", fontWeight: 700, letterSpacing: '0.055em', textTransform: 'uppercase' },
    SLAB: { fontFamily: "Rockwell, 'Bookman Old Style', Georgia, serif", fontWeight: 800, letterSpacing: '-0.005em' },
};

const STREAMING_PLATFORM_LOCAL_ASSETS: Readonly<Record<string, string>> = Object.freeze({});

export default function StreamingPlatformBrand({
    brand,
    variant = 'LOCKUP',
    size = 'SM',
    className = '',
    decorative = false,
}: StreamingPlatformBrandProps) {
    const assetPath = brand.markKind === 'LOCAL_ASSET' ? STREAMING_PLATFORM_LOCAL_ASSETS[brand.markKey] : undefined;
    const missingLocalAsset = brand.markKind === 'LOCAL_ASSET' && !assetPath;
    const lockupWantsMark = brand.lockupId !== 'WORDMARK';
    const lockupWantsWordmark = brand.lockupId !== 'ICON';
    const showMark = !missingLocalAsset && (variant === 'MARK' || (variant === 'LOCKUP' && lockupWantsMark));
    const showWordmark = missingLocalAsset || variant === 'WORDMARK' || (variant === 'LOCKUP' && lockupWantsWordmark);
    const markKey = brand.markKind === 'WORDMARK' ? 'LETTER_OUTLINE' : brand.markKey;
    const classNames = [
        'streaming-platform-brand',
        `streaming-platform-brand--${size.toLowerCase()}`,
        `streaming-platform-brand--${variant.toLowerCase()}`,
        brand.lockupId === 'STACK' && variant === 'LOCKUP' ? 'streaming-platform-brand--stacked' : '',
        className,
    ].filter(Boolean).join(' ');
    const style = getStreamingPlatformBrandCssVars(brand) as React.CSSProperties;
    const accessibility = decorative
        ? { 'aria-hidden': true as const }
        : { role: 'img', 'aria-label': brand.displayName };

    return (
        <span
            {...accessibility}
            className={classNames}
            style={style}
            data-platform-brand={brand.platformId}
            data-brand-accents={brand.accentColors.length}
            data-brand-fallback={missingLocalAsset ? 'wordmark' : undefined}
        >
            {showMark ? (
                <span className="streaming-platform-brand__mark" aria-hidden="true">
                    {assetPath ? <img src={assetPath} alt="" /> : (
                        <StreamingBrandMarkGlyph name={brand.displayName} markId={markKey} />
                    )}
                </span>
            ) : null}
            {showWordmark ? (
                <span className="streaming-platform-brand__wordmark-wrap">
                    <span className="streaming-platform-brand__wordmark" style={TYPEFACE_STYLE[brand.typefaceId]}>
                        {brand.displayName}
                    </span>
                    {brand.accentColors.length > 1 ? (
                        <span className="streaming-platform-brand__signal" aria-hidden="true">
                            {brand.accentColors.map((color, index) => (
                                <i key={`${color}-${index}`} style={{ backgroundColor: color }} />
                            ))}
                        </span>
                    ) : null}
                </span>
            ) : null}
        </span>
    );
}
