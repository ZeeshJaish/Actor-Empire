import React, { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const activeDialogStack: HTMLElement[] = [];

const isAvailableForFocus = (element: HTMLElement): boolean => {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
};

const getFocusableElements = (dialog: HTMLElement): HTMLElement[] => (
  Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(isAvailableForFocus)
);

export interface AccessibleDialogProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'role' | 'tabIndex'
> {
  role?: 'dialog' | 'alertdialog';
  onEscape?: () => void;
  initialFocusSelector?: string;
  restoreFocus?: boolean;
}

/**
 * Shared modal scope for streaming workspaces and cutscenes.
 *
 * It keeps keyboard focus inside the top-most dialog, supports dynamic wizard
 * controls, maps Escape through the screen's real close path, and restores the
 * opener after the dialog leaves the DOM.
 */
export default function AccessibleDialog({
  children,
  onEscape,
  initialFocusSelector,
  restoreFocus = true,
  role = 'dialog',
  ...props
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const opener = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    activeDialogStack.push(dialog);

    const isTopMostDialog = () => activeDialogStack.at(-1) === dialog;
    const focusInitialControl = () => {
      if (!isTopMostDialog()) return;
      const preferred = initialFocusSelector
        ? dialog.querySelector<HTMLElement>(initialFocusSelector)
        : dialog.querySelector<HTMLElement>('[data-dialog-initial-focus="true"], [autofocus]');
      const first = getFocusableElements(dialog)[0];
      (preferred && isAvailableForFocus(preferred) ? preferred : first || dialog)
        .focus({ preventScroll: true });
    };

    const animationFrame = window.requestAnimationFrame(focusInitialControl);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopMostDialog()) return;
      if (event.key === 'Escape' && onEscapeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopMostDialog() || dialog.contains(event.target as Node)) return;
      focusInitialControl();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      const stackIndex = activeDialogStack.lastIndexOf(dialog);
      if (stackIndex >= 0) activeDialogStack.splice(stackIndex, 1);

      if (!restoreFocus || !opener) return;
      window.requestAnimationFrame(() => {
        if (dialog.isConnected || !opener.isConnected) return;
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body && !dialog.contains(activeElement)) return;
        opener.focus({ preventScroll: true });
      });
    };
  }, [initialFocusSelector, restoreFocus]);

  return (
    <div
      {...props}
      ref={dialogRef}
      role={role}
      aria-modal="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
