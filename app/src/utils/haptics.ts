import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export { ImpactStyle, NotificationType }

/**
 * Trigger subtle device haptic feedback.
 * Works natively via Capacitor on iOS/Android native platforms, and gracefully
 * falls back to the Web Vibration API in supported mobile browsers, avoiding any errors on desktop web.
 */
export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style })
      return
    } catch {
      // Fall through to web vibration if native execution fails
    }
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      const duration = style === ImpactStyle.Heavy ? 25 : style === ImpactStyle.Light ? 10 : 15
      navigator.vibrate(duration)
    } catch {
      // Ignore vibration restrictions if page is not focused
    }
  }
}

/**
 * Trigger notification haptics (Success / Warning / Error).
 */
export async function triggerNotificationHaptic(
  type: NotificationType = NotificationType.Success
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type })
      return
    } catch {
      // Fall through to web vibration
    }
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(type === NotificationType.Error ? [20, 40, 20] : 18)
    } catch {
      // Ignore
    }
  }
}
