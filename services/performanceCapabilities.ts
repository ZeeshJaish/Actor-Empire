export const PERFORMANCE_CAPABILITY_SCHEMA_VERSION = 1;

export type PerformanceCapabilityProfile = 'FULL' | 'BALANCED' | 'OPTIMIZED';
export type PerformanceBlurLevel = 'FULL' | 'REDUCED' | 'OFF';
export type PerformanceShadowLevel = 'FULL' | 'REDUCED' | 'OFF';
export type PerformanceAnimationDensity = 'FULL' | 'REDUCED' | 'MINIMAL';
export type PerformanceBackgroundMotion = 'FULL' | 'REDUCED' | 'PAUSED';
export type PerformanceParticleDensity = 'FULL' | 'REDUCED' | 'OFF';
export type PerformanceImageQualityBudget = 'FULL' | 'BALANCED' | 'CONSTRAINED';
export type PerformanceOffscreenMounting = 'KEEP_MOUNTED' | 'UNMOUNT_INACTIVE';

export type PerformanceCapabilities = Readonly<{
  schemaVersion: number;
  profile: PerformanceCapabilityProfile;
  blur: PerformanceBlurLevel;
  shadows: PerformanceShadowLevel;
  animationDensity: PerformanceAnimationDensity;
  backgroundMotion: PerformanceBackgroundMotion;
  particleDensity: PerformanceParticleDensity;
  imageQualityBudget: PerformanceImageQualityBudget;
  offscreenMounting: PerformanceOffscreenMounting;
}>;

export type PerformanceCapabilityResolutionInput = {
  legacySmoothMode?: boolean;
  profile?: PerformanceCapabilityProfile;
  /** Keep native pixels and content intact during temporary pressure adaptation. */
  preserveImageQuality?: boolean;
};

const FULL_CAPABILITIES: PerformanceCapabilities = Object.freeze({
  schemaVersion: PERFORMANCE_CAPABILITY_SCHEMA_VERSION,
  profile: 'FULL',
  blur: 'FULL',
  shadows: 'FULL',
  animationDensity: 'FULL',
  backgroundMotion: 'FULL',
  particleDensity: 'FULL',
  imageQualityBudget: 'FULL',
  offscreenMounting: 'KEEP_MOUNTED',
});

const OPTIMIZED_CAPABILITIES: PerformanceCapabilities = Object.freeze({
  schemaVersion: PERFORMANCE_CAPABILITY_SCHEMA_VERSION,
  profile: 'OPTIMIZED',
  blur: 'OFF',
  shadows: 'REDUCED',
  animationDensity: 'REDUCED',
  backgroundMotion: 'PAUSED',
  particleDensity: 'REDUCED',
  imageQualityBudget: 'BALANCED',
  offscreenMounting: 'UNMOUNT_INACTIVE',
});

const BALANCED_CAPABILITIES: PerformanceCapabilities = Object.freeze({
  schemaVersion: PERFORMANCE_CAPABILITY_SCHEMA_VERSION,
  profile: 'BALANCED',
  blur: 'REDUCED',
  shadows: 'REDUCED',
  animationDensity: 'REDUCED',
  backgroundMotion: 'REDUCED',
  particleDensity: 'REDUCED',
  imageQualityBudget: 'BALANCED',
  offscreenMounting: 'UNMOUNT_INACTIVE',
});

const lower = (value: string) => value.toLowerCase().replaceAll('_', '-');

export const resolvePerformanceCapabilities = (
  input: PerformanceCapabilityResolutionInput
): PerformanceCapabilities => {
  const profile = input.profile ?? (input.legacySmoothMode === true ? 'OPTIMIZED' : 'FULL');
  const base = profile === 'OPTIMIZED' ? OPTIMIZED_CAPABILITIES
    : profile === 'BALANCED' ? BALANCED_CAPABILITIES : FULL_CAPABILITIES;
  return input.preserveImageQuality && base.imageQualityBudget !== 'FULL'
    ? { ...base, imageQualityBudget: 'FULL' }
    : base;
};

export const toPerformanceCapabilityAttributes = (
  capabilities: PerformanceCapabilities
): Record<string, string> => ({
  'data-ae-performance-schema': String(capabilities.schemaVersion),
  'data-ae-performance-profile': lower(capabilities.profile),
  'data-ae-perf-blur': lower(capabilities.blur),
  'data-ae-perf-shadows': lower(capabilities.shadows),
  'data-ae-perf-animation-density': lower(capabilities.animationDensity),
  'data-ae-perf-background-motion': lower(capabilities.backgroundMotion),
  'data-ae-perf-particle-density': lower(capabilities.particleDensity),
  'data-ae-perf-image-quality': lower(capabilities.imageQualityBudget),
  'data-ae-perf-offscreen-mounting': lower(capabilities.offscreenMounting),
});

export const toPerformanceCapabilityCssVariables = (
  capabilities: PerformanceCapabilities
): Record<string, string | number> => ({
  '--ae-perf-glass-blur': capabilities.blur === 'FULL' ? '8px' : capabilities.blur === 'REDUCED' ? '4px' : '0px',
  '--ae-perf-heavy-blur': capabilities.blur === 'FULL' ? '24px' : capabilities.blur === 'REDUCED' ? '10px' : '0px',
  '--ae-perf-shadow-opacity': capabilities.shadows === 'FULL' ? 1 : capabilities.shadows === 'REDUCED' ? 0.55 : 0,
  '--ae-perf-animation-density': capabilities.animationDensity === 'FULL' ? 1 : capabilities.animationDensity === 'REDUCED' ? 0.6 : 0.2,
  '--ae-perf-animation-iterations': capabilities.animationDensity === 'FULL' ? 'infinite' : '1',
  '--ae-perf-background-motion': capabilities.backgroundMotion === 'FULL' ? 1 : capabilities.backgroundMotion === 'REDUCED' ? 0.5 : 0,
  '--ae-perf-particle-density': capabilities.particleDensity === 'FULL' ? 1 : capabilities.particleDensity === 'REDUCED' ? 0.5 : 0,
  '--ae-perf-image-dpr': capabilities.imageQualityBudget === 'FULL' ? 3 : capabilities.imageQualityBudget === 'BALANCED' ? 1.5 : 1,
});

export const getImagePixelRatioBudget = (
  devicePixelRatio: number,
  capabilities: PerformanceCapabilities
): number => {
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;
  const maximum = capabilities.imageQualityBudget === 'FULL'
    ? 3
    : capabilities.imageQualityBudget === 'BALANCED'
      ? 1.5
      : 1;
  return Math.max(1, Math.min(safeDevicePixelRatio, maximum));
};

export const shouldMountOffscreenContent = (
  capabilities: PerformanceCapabilities,
  isActive: boolean
): boolean => isActive || capabilities.offscreenMounting === 'KEEP_MOUNTED';
