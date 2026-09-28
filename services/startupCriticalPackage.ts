const CRITICAL_STARTUP_IMAGE = '/assets/actor-empire-intro.png';
const CRITICAL_STARTUP_FONTS = ['Anton', 'Archivo'] as const;
const DEFAULT_CRITICAL_ASSET_TIMEOUT_MS = 8_000;

type CriticalAssetDependencies = {
  loadImage?: (path: string) => Promise<void>;
  loadFonts?: (families: readonly string[]) => Promise<void>;
  timeoutMs?: number;
};

const loadImageInBrowser = (path: string): Promise<void> => new Promise((resolve, reject) => {
  if (typeof Image === 'undefined') {
    resolve();
    return;
  }

  const image = new Image();
  const cleanup = () => {
    image.onload = null;
    image.onerror = null;
  };
  image.onload = () => {
    cleanup();
    resolve();
  };
  image.onerror = () => {
    cleanup();
    reject(new Error(`Critical startup image failed to load: ${path}`));
  };
  image.src = path;

  if (image.complete && image.naturalWidth > 0) {
    cleanup();
    resolve();
  }
});

const loadFontsInBrowser = async (families: readonly string[]): Promise<void> => {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  await Promise.all(families.map(family => document.fonts.load(`600 16px "${family}"`)));
};

const withDeadline = async <T,>(operation: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Critical startup asset check timed out after ${timeoutMs}ms.`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

export const prepareCriticalStartupAssets = async (
  dependencies: CriticalAssetDependencies = {},
): Promise<void> => {
  const loadImage = dependencies.loadImage || loadImageInBrowser;
  const loadFonts = dependencies.loadFonts || loadFontsInBrowser;
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_CRITICAL_ASSET_TIMEOUT_MS;

  await withDeadline(
    Promise.all([
      loadImage(CRITICAL_STARTUP_IMAGE),
      loadFonts(CRITICAL_STARTUP_FONTS),
    ]).then(() => undefined),
    timeoutMs,
  );
};
