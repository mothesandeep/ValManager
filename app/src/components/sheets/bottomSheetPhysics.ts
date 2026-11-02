export const BOTTOM_SHEET_SPRING_TRANSITION = {
  type: 'spring',
  damping: 32,
  stiffness: 340,
  mass: 0.85,
} as const;

/**
 * High-performance cubic-bezier tween for smooth 60/120fps entry & exit on mobile devices.
 * Avoids CPU-heavy spring physics solvers during mobile sheet slides.
 */
export const MOBILE_BOTTOM_SHEET_TRANSITION = {
  type: 'tween',
  ease: [0.16, 1, 0.3, 1],
  duration: 0.28,
} as const;

export const BACKDROP_TRANSITION = {
  duration: 0.22,
  ease: 'easeOut',
} as const;

/**
 * Drag constraints for bottom sheets: locked at top: 0 (cannot drag past top resting position)
 * and bottom: 0 (snaps back to origin on release).
 */
export const BOTTOM_SHEET_DRAG_CONSTRAINTS = {
  top: 0,
  bottom: 0,
} as const;

/**
 * Elastic resistance factors: top: 0 prevents negative Y travel;
 * bottom: 0.5 allows tangible rubber-band drag that snaps back on release.
 */
export const BOTTOM_SHEET_DRAG_ELASTIC = {
  top: 0,
  bottom: 0.5,
} as const;

/**
 * Natural Apple/iOS cubic bezier easing for smooth momentum & snapping
 */
export const SMOOTH_BEZIER_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Spring configuration for rubber-band drag release snap-back return:
 * Damped harmonic oscillator with fluid natural spring physics (damping: 25, stiffness: 250, mass: 1)
 */
export const SNAP_BACK_SPRING_CONFIG = {
  stiffness: 250,
  damping: 25,
  mass: 1,
} as const;

/**
 * Calculates elastic rubber-band pull-down displacement with progressive resistance
 * and maximum drag distance cap (150px - 200px, default 160px).
 * Strictly locks upward travel (deltaY <= 0 returns 0).
 */
export function calculateElasticDragDown(rawDeltaY: number, maxDrag = 160): number {
  if (rawDeltaY <= 0) return 0;
  return (maxDrag * rawDeltaY) / (maxDrag + rawDeltaY * 1.2);
}

/**
 * Computes minimum dismiss threshold based on sheet height (35% with minimum 140px)
 */
export function computeDismissThreshold(sheetHeight: number): number {
  return Math.max(140, sheetHeight * 0.35);
}

/**
 * Determines whether the sheet should dismiss based on drag offset and velocity
 */
export function shouldDismissSheet(
  offsetY: number,
  velocityY: number,
  sheetHeight: number
): boolean {
  if (offsetY <= 0) return false;
  const threshold = computeDismissThreshold(sheetHeight);
  return offsetY >= threshold || (velocityY > 600 && offsetY > 35);
}

/**
 * Checks whether an element is an interactive child that should not initiate drag
 */
export function isInteractiveElement(target: HTMLElement | null): boolean {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(
    target.closest(
      'button, input, select, textarea, a, [role="button"], [data-no-drag], [data-interactive]'
    )
  );
}

/**
 * Calculates the nearest snap point offset given current displacement, velocity, and sheet height
 */
export function computeSnapPosition(
  offsetY: number,
  velocityY: number,
  sheetHeight: number,
  snapPoints?: number[]
): number {
  if (!snapPoints || snapPoints.length === 0) {
    return shouldDismissSheet(offsetY, velocityY, sheetHeight) ? sheetHeight : 0;
  }

  // Convert snap fractions (e.g. 1.0 = full height, 0.5 = half height)
  // Offset 0 = fully expanded (top of screen), Offset sheetHeight = dismissed
  const pixelSnaps = snapPoints
    .map((point) => (point <= 1 ? sheetHeight * (1 - point) : sheetHeight - point))
    .concat([sheetHeight])
    .sort((a, b) => a - b);

  // Fast flick downward -> move to next lower snap point or dismiss
  if (velocityY > 500) {
    const nextPoint = pixelSnaps.find((p) => p > offsetY + 20);
    return nextPoint !== undefined ? nextPoint : sheetHeight;
  }

  // Fast flick upward -> move to next higher snap point
  if (velocityY < -500) {
    const prevPoints = pixelSnaps.filter((p) => p < offsetY - 20);
    return prevPoints.length > 0 ? prevPoints[prevPoints.length - 1] : 0;
  }

  // Nearest snap point
  let closest = pixelSnaps[0];
  let minDiff = Math.abs(offsetY - closest);
  for (let i = 1; i < pixelSnaps.length; i++) {
    const diff = Math.abs(offsetY - pixelSnaps[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = pixelSnaps[i];
    }
  }
  return closest;
}

/**
 * Clears '#modal' hash from the URL without page reload while preserving search query parameters.
 * Dispatches a 'hashchange' event so all reactive hooks and listeners synchronize immediately.
 */
export function clearModalHash(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (hash === '#modal' || hash.startsWith('#modal') || hash.includes('modal')) {
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, '', cleanUrl);
    try {
      if (typeof HashChangeEvent !== 'undefined') {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.dispatchEvent(new Event('hashchange'));
      }
    } catch {
      window.dispatchEvent(new Event('hashchange'));
    }
  }
}

/**
 * Resets modal-related classes on document.body and restores scroll locks
 */
export function resetModalDocumentState(): void {
  if (typeof document === 'undefined') return;
  document.body.classList.remove(
    'modal-open',
    'scanner-modal-open',
    'more-sheet-open',
    'period-sheet-open'
  );
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';
  }
  if (document.documentElement.style.overflow === 'hidden') {
    document.documentElement.style.overflow = '';
  }
}

