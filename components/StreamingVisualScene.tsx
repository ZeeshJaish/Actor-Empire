import {
    useEffect,
    useId,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import {
    getStreamingVisualAsset,
    type StreamingVisualSceneId,
} from '../services/streamingVisualAssets';
import '../styles/streaming-scenes.css';

export type StreamingVisualSceneTone =
    | 'neutral'
    | 'active'
    | 'success'
    | 'warning'
    | 'critical'
    | 'locked';

export interface StreamingVisualSceneStatus {
    label: string;
    detail?: string;
    tone?: StreamingVisualSceneTone;
}

export interface StreamingVisualHotspot {
    id: string;
    label: string;
    description?: string;
    status?: string;
    tone?: StreamingVisualSceneTone;
    x: number;
    y: number;
    desktopX?: number;
    desktopY?: number;
    icon?: ReactNode;
    disabled?: boolean;
}

export interface StreamingVisualSceneProps {
    sceneId: StreamingVisualSceneId;
    eyebrow?: string;
    title?: string;
    description?: string;
    status?: StreamingVisualSceneStatus;
    hotspots?: StreamingVisualHotspot[];
    onHotspotSelect?: (hotspot: StreamingVisualHotspot) => void;
    children?: ReactNode;
    className?: string;
    ariaLabel?: string;
    imageLoading?: 'eager' | 'lazy';
    onImageAvailabilityChange?: (available: boolean) => void;
}

type SceneCssProperties = CSSProperties & {
    '--streaming-scene-base': string;
    '--streaming-scene-deep': string;
    '--streaming-scene-accent': string;
    '--streaming-scene-secondary': string;
    '--streaming-scene-focal-point': string;
};

type HotspotCssProperties = CSSProperties & {
    '--streaming-hotspot-x': string;
    '--streaming-hotspot-y': string;
    '--streaming-hotspot-desktop-x'?: string;
    '--streaming-hotspot-desktop-y'?: string;
};

const clampPosition = (value: number): number => (
    Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50
);

export default function StreamingVisualScene({
    sceneId,
    eyebrow,
    title,
    description,
    status,
    hotspots = [],
    onHotspotSelect,
    children,
    className = '',
    ariaLabel,
    imageLoading = 'lazy',
    onImageAvailabilityChange,
}: StreamingVisualSceneProps) {
    const asset = getStreamingVisualAsset(sceneId);
    const headingId = useId();
    const descriptionId = useId();
    const [imageAvailable, setImageAvailable] = useState(true);

    useEffect(() => {
        setImageAvailable(true);
    }, [asset.src]);

    const notifyImageAvailability = (available: boolean) => {
        setImageAvailable(available);
        onImageAvailabilityChange?.(available);
    };

    const sceneStyle: SceneCssProperties = {
        '--streaming-scene-base': asset.palette.base,
        '--streaming-scene-deep': asset.palette.deep,
        '--streaming-scene-accent': asset.palette.accent,
        '--streaming-scene-secondary': asset.palette.secondary,
        '--streaming-scene-focal-point': asset.focalPoint,
    };
    const accessibleName = ariaLabel || title || asset.label;
    const tone = status?.tone || 'neutral';
    const hasBottomContent = Boolean(eyebrow || title || description || children);

    return (
        <section
            className={[
                'streaming-visual-scene',
                `streaming-visual-scene--${asset.fallbackPattern}`,
                `is-${tone}`,
                imageAvailable ? 'has-scene-art' : 'uses-scene-fallback',
                hasBottomContent ? 'has-bottom-content' : '',
                className,
            ].filter(Boolean).join(' ')}
            style={sceneStyle}
            data-streaming-scene={sceneId}
            aria-label={title ? undefined : accessibleName}
            aria-labelledby={title ? headingId : undefined}
            aria-describedby={description ? descriptionId : undefined}
        >
            <div className="streaming-visual-scene__stage" aria-hidden="true">
                <div className="streaming-visual-scene__fallback" />
                {imageAvailable && (
                    <img
                        className="streaming-visual-scene__art"
                        src={asset.src}
                        alt=""
                        loading={imageLoading}
                        decoding="async"
                        draggable={false}
                        onLoad={() => notifyImageAvailability(true)}
                        onError={() => notifyImageAvailability(false)}
                    />
                )}
                <div className="streaming-visual-scene__ambient-light" />
                <div className="streaming-visual-scene__state-light" />
                <div className="streaming-visual-scene__vignette" />
            </div>

            {status && (
                <div
                    className={`streaming-visual-scene__status is-${tone}`}
                    role={tone === 'critical' || tone === 'warning' ? 'status' : undefined}
                    aria-label={status.detail ? `${status.label}. ${status.detail}` : status.label}
                >
                    <span className="streaming-visual-scene__status-dot" aria-hidden="true" />
                    <span>
                        <strong>{status.label}</strong>
                        {status.detail && <small>{status.detail}</small>}
                    </span>
                </div>
            )}

            {hotspots.length > 0 && (
                <div
                    className="streaming-visual-scene__hotspots"
                    role="group"
                    aria-label={`${asset.label} locations`}
                >
                    {hotspots.map(hotspot => {
                        const hotspotStyle: HotspotCssProperties = {
                            '--streaming-hotspot-x': `${clampPosition(hotspot.x)}%`,
                            '--streaming-hotspot-y': `${clampPosition(hotspot.y)}%`,
                            ...(hotspot.desktopX === undefined ? {} : {
                                '--streaming-hotspot-desktop-x': `${clampPosition(hotspot.desktopX)}%`,
                            }),
                            ...(hotspot.desktopY === undefined ? {} : {
                                '--streaming-hotspot-desktop-y': `${clampPosition(hotspot.desktopY)}%`,
                            }),
                        };
                        const hotspotTone = hotspot.tone || 'neutral';
                        const unavailable = hotspot.disabled || !onHotspotSelect;
                        return (
                            <button
                                key={hotspot.id}
                                type="button"
                                className={`streaming-visual-scene__hotspot is-${hotspotTone}`}
                                style={hotspotStyle}
                                onClick={() => {
                                    if (!unavailable) onHotspotSelect(hotspot);
                                }}
                                aria-label={[
                                    hotspot.label,
                                    hotspot.status,
                                    hotspot.description,
                                    unavailable ? 'Unavailable' : '',
                                ].filter(Boolean).join('. ')}
                                aria-disabled={unavailable}
                            >
                                <span className="streaming-visual-scene__hotspot-target" aria-hidden="true">
                                    <span className="streaming-visual-scene__hotspot-icon">
                                        {hotspot.icon || <span className="streaming-visual-scene__hotspot-core" />}
                                    </span>
                                </span>
                                <span className="streaming-visual-scene__hotspot-copy">
                                    <strong>{hotspot.label}</strong>
                                    {hotspot.status && <small>{hotspot.status}</small>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {hasBottomContent && (
                <div className="streaming-visual-scene__content">
                    <div className="streaming-visual-scene__content-inner">
                        {eyebrow && <span className="streaming-visual-scene__eyebrow">{eyebrow}</span>}
                        {title && <h2 id={headingId}>{title}</h2>}
                        {description && <p id={descriptionId}>{description}</p>}
                        {children && <div className="streaming-visual-scene__slot">{children}</div>}
                    </div>
                </div>
            )}
        </section>
    );
}
