import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Android-Specific UX Checks (One-Handed Usability & Dark Mode)', () => {
  const srcDir = path.resolve(__dirname, '..')

  describe('1. One-Handed Usability (Thumb Zone & Bottom-Anchored Actions)', () => {
    it('ensures SpeedDial FAB is positioned in the natural bottom-right thumb zone', () => {
      const fabCode = fs.readFileSync(path.join(srcDir, 'components/layout/SpeedDialFab.tsx'), 'utf8')
      expect(fabCode).toContain('fixed bottom-20 right-4')
      expect(fabCode).toContain('calc(68px + env(safe-area-inset-bottom')
      expect(fabCode).toContain('md:hidden')
    })

    it('ensures SpeedDial FAB provides 1-tap direct action on primary mobile routes', () => {
      const fabCode = fs.readFileSync(path.join(srcDir, 'components/layout/SpeedDialFab.tsx'), 'utf8')
      expect(fabCode).toContain("pathname === '/receiving'")
      expect(fabCode).toContain("kasab:open-receiving-modal")
      expect(fabCode).toContain("pathname === '/dispatch'")
      expect(fabCode).toContain("kasab:open-dispatch-modal")
      expect(fabCode).toContain("pathname === '/payments'")
      expect(fabCode).toContain("kasab:open-payment-modal")
      expect(fabCode).toContain("pathname === '/expenses'")
      expect(fabCode).toContain("kasab:open-expense-modal")
      expect(fabCode).toContain("pathname === '/parties'")
      expect(fabCode).toContain("kasab:open-party-modal")
    })

    it('ensures BottomNavigation is pinned to screen bottom within thumb reach', () => {
      const navCode = fs.readFileSync(path.join(srcDir, 'components/layout/BottomNavigation.tsx'), 'utf8')
      expect(navCode).toContain('fixed bottom-0')
      expect(navCode).toContain('md:hidden')
      expect(navCode).toContain('safe-area-inset-bottom')
    })

    it('ensures BottomSheetModal anchors modals to screen bottom on mobile', () => {
      const modalCode = fs.readFileSync(path.join(srcDir, 'components/sheets/BottomSheetModal.tsx'), 'utf8')
      expect(modalCode).toContain('items-end justify-center md:items-center')
      expect(modalCode).toContain('rounded-t-3xl md:rounded-3xl')
    })

    it('ensures primary save and submit buttons across all workflows reside in bottom-pinned footers', () => {
      const inwardCode = fs.readFileSync(path.join(srcDir, 'features/inward/pages/InwardPage.tsx'), 'utf8')
      const outwardCode = fs.readFileSync(path.join(srcDir, 'features/outward/pages/OutwardPage.tsx'), 'utf8')
      const expenseCode = fs.readFileSync(path.join(srcDir, 'features/expenses/pages/OperatingExpensesPage.tsx'), 'utf8')
      const billingCode = fs.readFileSync(path.join(srcDir, 'features/billing/pages/BillingPage.tsx'), 'utf8')
      const partyCode = fs.readFileSync(path.join(srcDir, 'features/parties/pages/PartyDirectoryPage.tsx'), 'utf8')
      const saveBarCode = fs.readFileSync(path.join(srcDir, 'features/settings/components/SettingsSaveBar.tsx'), 'utf8')

      // Modal footers are sticky/border-t with action buttons
      expect(inwardCode).toContain('border-t border-slate-100')
      expect(outwardCode).toContain('border-t border-slate-100')
      expect(expenseCode).toContain('border-t border-slate-200/80')
      expect(billingCode).toContain('border-t border-slate-200/80')
      expect(partyCode).toContain('h-12 min-h-[48px]')
      expect(saveBarCode).toContain('fixed bottom-20')
    })
  })

  describe('2. Dark Mode Implementation & Nighttime Eye-Strain Protection', () => {
    it('declares color-scheme light dark meta in HTML head to prevent initial white flash', () => {
      const htmlCode = fs.readFileSync(path.join(srcDir, '../index.html'), 'utf8')
      expect(htmlCode).toContain('<meta name="color-scheme" content="light dark" />')
      expect(htmlCode).toContain('media="(prefers-color-scheme: dark)"')
      expect(htmlCode).toContain('media="(prefers-color-scheme: light)"')
    })

    it('executes pre-render inline theme script before DOM body mounts', () => {
      const htmlCode = fs.readFileSync(path.join(srcDir, '../index.html'), 'utf8')
      expect(htmlCode).toContain("localStorage.getItem('valmanager_theme')")
      expect(htmlCode).toContain("document.documentElement.classList.add('dark')")
      expect(htmlCode).toContain("document.documentElement.style.colorScheme = 'dark'")
    })

    it('configures ThemeContext with light, dark, and system modes plus persistence', () => {
      const themeCode = fs.readFileSync(path.join(srcDir, 'context/ThemeContext.tsx'), 'utf8')
      expect(themeCode).toContain("'light' | 'dark' | 'system'")
      expect(themeCode).toContain("valmanager_theme")
      expect(themeCode).toContain("window.matchMedia('(prefers-color-scheme: dark)')")
      expect(themeCode).toContain("applySystemBarsTheme(isDark)")
    })

    it('synchronizes native Android status bar and navigation bar in dark mode', () => {
      const nativeCode = fs.readFileSync(path.join(srcDir, 'utils/nativeApp.ts'), 'utf8')
      expect(nativeCode).toContain("const hexColor = isDark ? '#000000' : '#ffffff'")
      expect(nativeCode).toContain("StatusBar.setBackgroundColor({ color: hexColor })")
      expect(nativeCode).toContain("StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })")
    })

    it('defines deep OLED slate dark mode tokens in index.css', () => {
      const cssCode = fs.readFileSync(path.join(srcDir, 'index.css'), 'utf8')
      expect(cssCode).toContain('html.dark {')
      expect(cssCode).toContain('--color-paper:        #020617;')
      expect(cssCode).toContain('--color-card:         #0F172A;')
      expect(cssCode).toContain('--color-border:       #1E293B;')
      expect(cssCode).toContain('--color-ink:          #F8FAFC;')
    })

    it('provides 1-tap quick theme toggle on Dashboard header and 3-card selector in Settings', () => {
      const dashCode = fs.readFileSync(path.join(srcDir, 'features/dashboard/pages/DashboardPage.tsx'), 'utf8')
      const settingsCode = fs.readFileSync(path.join(srcDir, 'features/settings/pages/SettingsPage.tsx'), 'utf8')
      const themeSettingsCode = fs.readFileSync(path.join(srcDir, 'features/settings/components/ThemeSettings.tsx'), 'utf8')

      expect(dashCode).toContain('toggleTheme')
      expect(dashCode).toContain("Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode")
      expect(settingsCode).toContain("Appearance & Theme")
      expect(themeSettingsCode).toContain("Light Mode")
      expect(themeSettingsCode).toContain("Dark Mode")
      expect(themeSettingsCode).toContain("System Default")
    })
  })
})
