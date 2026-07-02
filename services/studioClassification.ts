export const STREAMING_PLATFORM_STUDIO_IDS = new Set([
    'NETFLIX',
    'APPLE_TV',
    'DISNEY_PLUS',
    'HULU',
    'YOUTUBE',
]);

export const isStreamingPlatformStudio = (studio: { id?: string; archetype?: string } | null | undefined): boolean => (
    Boolean(studio?.id && STREAMING_PLATFORM_STUDIO_IDS.has(studio.id))
    || /PLATFORM|STREAMING/i.test(studio?.archetype || '')
);

export const isProductionStudioAcquisitionTarget = (studio: { id?: string; archetype?: string } | null | undefined): boolean => (
    !isStreamingPlatformStudio(studio)
);
