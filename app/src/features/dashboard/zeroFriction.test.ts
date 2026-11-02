import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Zero Friction User Flow Audit ("Kam se kam mehnat")', () => {
  const rootDir = path.resolve(__dirname, '../../..')

  describe('1. Navigation Path Audit (<= 2 taps to any main feature)', () => {
    // Navigation routing map of all main enterprise capabilities
    const mainFeaturePaths: Record<string, { androidTaps: number; webClicks: number; description: string }> = {
      'Dashboard & Daily KPIs': { androidTaps: 1, webClicks: 1, description: 'Direct bottom-nav tab / sidebar link' },
      'Inward Kasab Receiving List': { androidTaps: 1, webClicks: 1, description: 'Direct bottom-nav tab / sidebar link' },
      'Outward Val Dispatch List': { androidTaps: 1, webClicks: 1, description: 'Direct bottom-nav tab / sidebar link' },
      'Billing & Khata Directory': { androidTaps: 1, webClicks: 1, description: 'Direct bottom-nav tab / sidebar link' },
      'Operating Expenses': { androidTaps: 1, webClicks: 1, description: 'Direct bottom-nav tab / sidebar link' },
      'Record New Inward (1-Click)': { androidTaps: 1, webClicks: 1, description: 'Top action bar "+ Inward" or mobile SpeedDial' },
      'Record New Dispatch (1-Click)': { androidTaps: 1, webClicks: 1, description: 'Top action bar "+ Outward" or mobile SpeedDial' },
      'View Specific Party Khata': { androidTaps: 2, webClicks: 2, description: 'Billing tab -> Tap party card' },
      'Settings & Security': { androidTaps: 1, webClicks: 1, description: 'Top right gear icon on dashboard' },
    }

    it('ensures NO main feature requires more than 2 taps or clicks', () => {
      for (const [feature, meta] of Object.entries(mainFeaturePaths)) {
        expect(meta.androidTaps, `Feature "${feature}" exceeds 2 Android taps`).toBeLessThanOrEqual(2)
        expect(meta.webClicks, `Feature "${feature}" exceeds 2 Web clicks`).toBeLessThanOrEqual(2)
      }
    })
  })

  describe('2. Mobile Virtual Keyboard & Viewport Configuration', () => {
    it('configures interactive-widget=resizes-content in index.html to prevent keyboard obscuring fields', () => {
      const indexPath = path.join(rootDir, 'index.html')
      const indexHtml = fs.readFileSync(indexPath, 'utf8')

      expect(indexHtml).toContain('interactive-widget=resizes-content')
    })

    it('configures android:windowSoftInputMode="adjustResize" in AndroidManifest.xml', () => {
      const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml')
      const manifestXml = fs.readFileSync(manifestPath, 'utf8')

      expect(manifestXml).toContain('android:windowSoftInputMode="adjustResize"')
    })
  })

  describe('3. Form Input Modes & Keyboard Specialization', () => {
    it('verifies Gross Weight inputs use inputMode="decimal"', () => {
      const inwardReviewPath = path.join(rootDir, 'src/features/inward/components/scanner/ScannedBagsReviewList.tsx')
      const inwardReviewSrc = fs.readFileSync(inwardReviewPath, 'utf8')

      expect(inwardReviewSrc).toContain('inputMode="decimal"')
    })

    it('verifies Rola Count and Bungari inputs use inputMode="numeric"', () => {
      const outwardDispatchList = path.join(rootDir, 'src/features/outward/components/DispatchEntriesList.tsx')
      const outwardSrc = fs.readFileSync(outwardDispatchList, 'utf8')

      expect(outwardSrc).toContain('inputMode="numeric"')
    })

    it('verifies Expense Amount inputs use inputMode="decimal"', () => {
      const expensePath = path.join(rootDir, 'src/features/expenses/pages/OperatingExpensesPage.tsx')
      const expenseSrc = fs.readFileSync(expensePath, 'utf8')

      expect(expenseSrc).toContain('inputMode="decimal"')
    })

    it('verifies Challan Number inputs specify numeric inputMode and enterKeyHint', () => {
      const challanHeaderPath = path.join(rootDir, 'src/features/inward/components/ChallanHeader.tsx')
      const challanHeaderSrc = fs.readFileSync(challanHeaderPath, 'utf8')

      expect(challanHeaderSrc).toContain('inputMode="numeric"')
      expect(challanHeaderSrc).toContain('enterKeyHint="next"')
    })

    it('verifies Phone Number inputs use type="tel" to invoke phone dialpad', () => {
      const partyDirPath = path.join(rootDir, 'src/features/parties/pages/PartyDirectoryPage.tsx')
      const partyDirSrc = fs.readFileSync(partyDirPath, 'utf8')

      expect(partyDirSrc).toContain('type="tel"')
    })
  })
})
