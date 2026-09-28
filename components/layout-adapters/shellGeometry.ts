export const NAV_HEIGHT_PX = 60;
export const NAV_BOTTOM_EDGE_PX = 12;
export const NAV_CONTENT_GAP_PX = 20;

export function getShellClearance(navVisible: boolean, safeBottomPx: number): number {
  const safe = Number.isFinite(safeBottomPx) ? Math.max(0, safeBottomPx) : 0;
  return safe + (navVisible ? NAV_HEIGHT_PX + NAV_BOTTOM_EDGE_PX + NAV_CONTENT_GAP_PX : 0);
}

/** Ignore small browser-toolbar changes; a large visible-height loss indicates keyboard occlusion. */
export function isKeyboardOccludingViewport(layoutHeightPx: number, visualHeightPx: number): boolean {
  if (!Number.isFinite(layoutHeightPx) || !Number.isFinite(visualHeightPx)) return false;
  if (layoutHeightPx <= 0 || visualHeightPx <= 0) return false;
  return layoutHeightPx - visualHeightPx >= 120;
}
