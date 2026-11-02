/**
 * Apple-grade spring physics and transitions for framer-motion
 */

export const SPRING_GENTLE = {
  type: 'spring',
  damping: 32,
  stiffness: 340,
  mass: 0.85,
} as const

export const SPRING_SNAPPY = {
  type: 'spring',
  damping: 26,
  stiffness: 400,
  mass: 0.6,
} as const

export const SPRING_BOUNCY = {
  type: 'spring',
  damping: 20,
  stiffness: 300,
  mass: 0.8,
} as const

export const BOTTOM_SHEET_SPRING_TRANSITION = SPRING_GENTLE

export const MOBILE_BOTTOM_SHEET_TRANSITION = {
  type: 'tween',
  ease: [0.16, 1, 0.3, 1],
  duration: 0.28,
} as const

export const BACKDROP_TRANSITION = {
  duration: 0.22,
  ease: 'easeOut',
} as const

export const FADE_IN_SCALE = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
}

export const SLIDE_UP_SHEET = {
  initial: { y: '100%', opacity: 0.9 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0.9 },
  transition: SPRING_GENTLE,
}
