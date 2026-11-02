/**
 * Device and Input Pointer Detection Utility
 *
 * Helps identify touch/mobile devices vs desktop pointer environments.
 * On touch/mobile devices, virtual soft keyboards pop up on input focus,
 * which obscures dropdown menus, shifts layouts, and creates a disruptive UX.
 */

/**
 * Returns true if the device is a touch screen or mobile viewport.
 */
export function isTouchOrMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  // 1. Primary pointer is coarse (finger touch on phones, tablets, Capacitor WebView)
  const isCoarse = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)

  // 2. Mobile screen width (< 768px - Tailwind 'md' boundary)
  const isMobileScreen = window.innerWidth < 768

  // 3. Touch points availability
  const hasTouchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0

  return isCoarse || isMobileScreen || hasTouchPoints
}

/**
 * Returns true only on desktop environments where focusing an input
 * does NOT summon an on-screen soft keyboard that blocks dropdown options.
 */
export function shouldAutoFocusSearch(): boolean {
  if (typeof window === 'undefined') return false

  const isDesktopWidth = window.innerWidth >= 768
  const hasFinePointer = Boolean(window.matchMedia && window.matchMedia('(pointer: fine)').matches)
  const hasCoarsePointer = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)

  // Only allow automatic input focus if on a desktop screen with a fine pointer (mouse/trackpad)
  // and not a coarse touch-only screen
  return isDesktopWidth && hasFinePointer && !hasCoarsePointer
}
