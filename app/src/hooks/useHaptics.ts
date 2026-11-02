import { useCallback } from 'react'
import { ImpactStyle, NotificationType } from '@capacitor/haptics'
import { triggerHaptic, triggerNotificationHaptic } from '@/utils/haptics'

export function useHaptics() {
  const impact = useCallback((style: ImpactStyle = ImpactStyle.Medium) => {
    return triggerHaptic(style)
  }, [])

  const notification = useCallback((type: NotificationType = NotificationType.Success) => {
    return triggerNotificationHaptic(type)
  }, [])

  return {
    impact,
    notification,
    triggerHaptic,
    triggerNotificationHaptic,
  }
}
