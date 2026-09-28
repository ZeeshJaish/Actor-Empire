/** Opt-in development diagnostics. Never imported by the production barrel. */
export type LayoutIssue = {
  kind: 'horizontal-overflow' | 'clipped-primary-label' | 'undersized-touch-target' | 'content-behind-fixed-chrome';
  id: string;
};

function idOf(element: HTMLElement, fallback: string): string {
  return element.dataset.layoutId || element.id || fallback;
}

export function auditLayout(root: HTMLElement): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const targets = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const overflowRegion = targets.find(element =>
    element.hasAttribute('data-layout-overflow-region') && element.scrollWidth > element.clientWidth + 1,
  );
  if (overflowRegion) {
    issues.push({ kind: 'horizontal-overflow', id: idOf(overflowRegion, 'region') });
  } else if (root.scrollWidth > root.clientWidth + 1) {
    issues.push({ kind: 'horizontal-overflow', id: idOf(root, 'root') });
  }

  for (const element of targets) {
    if (element.hasAttribute('data-layout-primary-label') && element.scrollWidth > element.clientWidth + 1) {
      issues.push({ kind: 'clipped-primary-label', id: idOf(element, 'label') });
    }
    if (element.matches('button, [role="button"], [data-layout-touch-target]')) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        issues.push({ kind: 'undersized-touch-target', id: idOf(element, 'action') });
      }
    }
  }
  const chromeRects = targets.filter(element => element.hasAttribute('data-layout-fixed-chrome'))
    .map(element => element.getBoundingClientRect());
  for (const action of targets.filter(element => element.hasAttribute('data-layout-primary-action'))) {
    const rect = action.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (chromeRects.some(chrome =>
      chrome.width > 0 && chrome.height > 0 && rect.left < chrome.right && rect.right > chrome.left
      && rect.top < chrome.bottom && rect.bottom > chrome.top,
    )) {
      issues.push({ kind: 'content-behind-fixed-chrome', id: idOf(action, 'primary-action') });
    }
  }
  return issues;
}
