'use client';

import { useEffect, useRef, type RefObject } from 'react';

/*
 * Shared behaviour for modals and drawers:
 * - useBodyScrollLock: ref-counted, so stacked overlays don't restore the wrong overflow value.
 * - useDialogFocus: moves focus into the dialog, traps Tab inside it, restores focus on close,
 *   and lets only the top-most open dialog react to Escape.
 * - useCloseAboveBreakpoint: closes mobile-only drawers when the viewport grows past the
 *   breakpoint where they are hidden with CSS (otherwise their scroll lock freezes the page).
 */

let lockCount = 0;
let savedOverflow = '';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
      }
    };
  }, [active]);
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0
  );
}

// Open dialogs, most recent last. Only the last one handles Escape and Tab.
const dialogStack: symbol[] = [];

export function useDialogFocus(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose?: () => void,
  options: { initialFocusDelay?: number; autoFocus?: boolean } = {}
): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const { initialFocusDelay = 0, autoFocus = true } = options;

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const id = Symbol('dialog');
    dialogStack.push(id);
    const isTop = () => dialogStack[dialogStack.length - 1] === id;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!autoFocus || !container || container.contains(document.activeElement)) return;
      const [first] = getFocusable(container);
      if (first) {
        first.focus({ preventScroll: true });
      } else {
        if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
        container.focus({ preventScroll: true });
      }
    }, initialFocusDelay);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        if (onCloseRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (current === first || !container.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !container.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      const idx = dialogStack.indexOf(id);
      if (idx !== -1) dialogStack.splice(idx, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocusDelay, autoFocus]);
}

export function useCloseAboveBreakpoint(active: boolean, onClose: () => void, minWidth = 1024): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const handler = () => {
      if (mql.matches) onCloseRef.current();
    };
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [active, minWidth]);
}
