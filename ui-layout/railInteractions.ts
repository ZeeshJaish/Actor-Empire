/** Adds mouse/pen drag to opt-in horizontal rails; touch keeps native momentum scrolling. */
const installedDocuments = new WeakMap<Document, () => void>();

export function installHorizontalRailDrag(doc: Document): () => void {
  const existing = installedDocuments.get(doc);
  if (existing) return existing;

  type Drag = { rail: HTMLElement; pointerId: number; x: number; y: number; scrollLeft: number; active: boolean };
  let drag: Drag | null = null;
  let blockClickRail: HTMLElement | null = null;
  let blockClickUntil = 0;

  const onPointerDown = (event: PointerEvent) => {
    // A new gesture is always eligible for a normal tap, even if the previous
    // drag ended without the browser dispatching its synthetic click.
    blockClickRail = null;
    if (!event.isPrimary || event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const rail = target.closest<HTMLElement>('.no-scrollbar, .hide-scrollbar, .custom-scrollbar');
    if (!rail || rail.scrollWidth <= rail.clientWidth + 1 || !/^(auto|scroll)$/.test(getComputedStyle(rail).overflowX)) return;
    drag = { rail, pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: rail.scrollLeft, active: false };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { drag = null; return; }
      if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(dy)) return;
      drag.active = true;
      drag.rail.dataset.railDragging = 'true';
      drag.rail.setPointerCapture?.(event.pointerId);
    }
    drag.rail.scrollLeft = drag.scrollLeft - dx;
    event.preventDefault();
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.active) {
      blockClickRail = drag.rail;
      blockClickUntil = performance.now() + 350;
      delete drag.rail.dataset.railDragging;
      if (drag.rail.hasPointerCapture?.(event.pointerId)) drag.rail.releasePointerCapture(event.pointerId);
    }
    drag = null;
  };

  const onClick = (event: MouseEvent) => {
    if (!blockClickRail || performance.now() > blockClickUntil) return;
    if (event.target instanceof Node && blockClickRail.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      blockClickRail = null;
    }
  };

  doc.addEventListener('pointerdown', onPointerDown);
  doc.addEventListener('pointermove', onPointerMove, { passive: false });
  doc.addEventListener('pointerup', onPointerEnd);
  doc.addEventListener('pointercancel', onPointerEnd);
  doc.addEventListener('click', onClick, true);

  const cleanup = () => {
    doc.removeEventListener('pointerdown', onPointerDown);
    doc.removeEventListener('pointermove', onPointerMove);
    doc.removeEventListener('pointerup', onPointerEnd);
    doc.removeEventListener('pointercancel', onPointerEnd);
    doc.removeEventListener('click', onClick, true);
    if (drag?.active) delete drag.rail.dataset.railDragging;
    drag = null;
    installedDocuments.delete(doc);
  };
  installedDocuments.set(doc, cleanup);
  return cleanup;
}
