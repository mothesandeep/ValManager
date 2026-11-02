import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Updates the native mobile system status bar, Android gesture/navigation bar,
 * and PWA/browser theme-color meta tags to seamlessly match the active theme.
 *
 * Light Theme: Pure White (#ffffff) status bar & navigation bar with dark icons.
 * Dark Theme:  Pure Black (#000000) status bar & navigation bar with light icons.
 */
export async function applySystemBarsTheme(isDark: boolean): Promise<void> {
  const hexColor = isDark ? '#000000' : '#ffffff'

  // 1. Update HTML meta theme-color for PWA & mobile browser chrome
  if (typeof document !== 'undefined') {
    const metaThemeColors = document.querySelectorAll('meta[name="theme-color"]')
    metaThemeColors.forEach((meta) => {
      meta.setAttribute('content', hexColor)
    })
  }

  // 2. Update Capacitor Native Status Bar & Navigation Bar
  if (!Capacitor.isNativePlatform()) return

  try {
    // Status Bar Background Color
    await StatusBar.setBackgroundColor({ color: hexColor })

    // Status Bar Text & Icon Style:
    // In @capacitor/status-bar:
    // - Style.Dark: light/white icons (for dark backgrounds like #000000)
    // - Style.Light: dark/black icons (for light backgrounds like #ffffff)
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch (err) {
    console.warn('[nativeApp] StatusBar configuration ignored or unsupported:', err)
  }

  // 3. Android Navigation / Gesture Bar (via NavigationBar plugin if available)
  try {
    const navBarPlugin = (Capacitor as unknown as { Plugins?: { NavigationBar?: { setColor: (opts: { color: string; darkButtons: boolean }) => Promise<void> } } }).Plugins?.NavigationBar
    if (navBarPlugin?.setColor) {
      await navBarPlugin.setColor({
        color: hexColor,
        darkButtons: !isDark,
      })
    }
  } catch (err) {
    console.warn('[nativeApp] NavigationBar configuration ignored or unsupported:', err)
  }
}

/**
 * Initializes native mobile configuration for Capacitor.
 */
export async function initNativeApp(): Promise<void> {
  if (typeof document === 'undefined') return
  const isDark = document.documentElement.classList.contains('dark')
  await applySystemBarsTheme(isDark)
}
